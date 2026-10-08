"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { CHOICE_KEYS } from "@/lib/imat/scoring.mjs";
import type { ImatChoiceKey } from "@/lib/imat/types";
import { useUserSupabaseClient, type UserSupabaseClient } from "@/lib/useUserSupabaseClient";
import type { ImatAttemptRow } from "@/types";

export interface ImatAttemptState {
  selectedAnswer: ImatChoiceKey;
  isCorrect: boolean;
}

type LatestAttemptRow = Pick<ImatAttemptRow, "question_id" | "selected_answer" | "is_correct">;

// Supabase Data API bir istekte en cok 1.000 satir doner; soru basina en son
// deneme bu boyutta sayfalanir (SAT kancasiyla ayni sinirlar).
const LATEST_ATTEMPTS_PAGE_SIZE = 1000;
const LATEST_ATTEMPTS_MAX_PAGES = 10;

function isChoiceKey(value: string): value is ImatChoiceKey {
  return (CHOICE_KEYS as readonly string[]).includes(value);
}

// Soru basina en son deneme (supabase/imat_bank.sql, imat_latest_attempts).
async function readLatestAttempts(
  supabase: UserSupabaseClient,
  userId: string,
): Promise<Map<string, ImatAttemptState>> {
  const attempts = new Map<string, ImatAttemptState>();
  for (let page = 0; page < LATEST_ATTEMPTS_MAX_PAGES; page += 1) {
    const from = page * LATEST_ATTEMPTS_PAGE_SIZE;
    const { data, error } = await supabase
      .from("imat_latest_attempts")
      .select("question_id,selected_answer,is_correct")
      .eq("user_id", userId)
      .order("question_id", { ascending: true })
      .range(from, from + LATEST_ATTEMPTS_PAGE_SIZE - 1)
      .returns<LatestAttemptRow[]>();
    if (error) throw error;
    for (const row of data ?? []) {
      if (!isChoiceKey(row.selected_answer)) continue;
      attempts.set(row.question_id, { selectedAnswer: row.selected_answer, isCorrect: row.is_correct });
    }
    if (!data || data.length < LATEST_ATTEMPTS_PAGE_SIZE) break;
  }
  return attempts;
}

// question_id -> son deneme
export function useImatAttempts() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const getClient = useUserSupabaseClient();
  const [attempts, setAttempts] = useState<Map<string, ImatAttemptState>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        if (!userId) {
          if (active) setAttempts(new Map());
          return;
        }
        const supabase = await getClient();
        const latest = await readLatestAttempts(supabase, userId);
        if (active) setAttempts(latest);
      } catch (err) {
        console.error("IMAT attempts yukleme hatasi:", err);
        if (active) {
          setAttempts(new Map());
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [userId, isLoaded, getClient, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const recordAttempt = useCallback(
    async (questionId: string, selectedAnswer: ImatChoiceKey, isCorrect: boolean) => {
      if (!userId) return;

      const previousAttempt = attempts.get(questionId);
      setAttempts((current) => new Map(current).set(questionId, { selectedAnswer, isCorrect }));

      try {
        const supabase = await getClient();
        // answered_at sunucu saatiyle yazilir (supabase/imat_bank.sql tetikleyicisi).
        const { error: insertError } = await supabase.from("imat_attempts").insert([
          {
            user_id: userId,
            question_id: questionId,
            selected_answer: selectedAnswer,
            is_correct: isCorrect,
          },
        ]);
        if (insertError) throw insertError;
      } catch (err) {
        console.error("IMAT attempt kayit hatasi:", err);
        setAttempts((current) => {
          const next = new Map(current);
          if (previousAttempt) next.set(questionId, previousAttempt);
          else next.delete(questionId);
          return next;
        });
      }
    },
    [attempts, userId, getClient],
  );

  return { attempts, recordAttempt, loading, error, reload };
}
