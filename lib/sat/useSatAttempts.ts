"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { useUserSupabaseClient, type UserSupabaseClient } from "@/lib/useUserSupabaseClient";
import type { SatAttemptRow } from "@/types";

export interface SatAttemptState {
  selectedAnswer: string;
  isCorrect: boolean;
}

interface SatAttemptSummary {
  todayCount: number;
  streak: number;
  longestStreak: number;
}

type LatestAttemptRow = Pick<SatAttemptRow, "question_id" | "selected_answer" | "is_correct">;

interface SatAttemptSummaryRow {
  today_count: number;
  current_streak: number;
  longest_streak: number;
}

const EMPTY_SUMMARY: SatAttemptSummary = { todayCount: 0, streak: 0, longestStreak: 0 };

// Supabase Data API bir istekte en cok 1.000 satir doner; soru basina en son
// deneme bu boyutta sayfalanir (banka 1.019 soru, 2026-09-26).
const LATEST_ATTEMPTS_PAGE_SIZE = 1000;
const LATEST_ATTEMPTS_MAX_PAGES = 10;

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// Soru basina en son deneme (supabase/sat_progress.sql, sat_latest_attempts).
async function readLatestAttempts(
  supabase: UserSupabaseClient,
  userId: string,
): Promise<Map<string, SatAttemptState>> {
  const attempts = new Map<string, SatAttemptState>();
  for (let page = 0; page < LATEST_ATTEMPTS_MAX_PAGES; page += 1) {
    const from = page * LATEST_ATTEMPTS_PAGE_SIZE;
    const { data, error } = await supabase
      .from("sat_latest_attempts")
      .select("question_id,selected_answer,is_correct")
      .eq("user_id", userId)
      .order("question_id", { ascending: true })
      .range(from, from + LATEST_ATTEMPTS_PAGE_SIZE - 1)
      .returns<LatestAttemptRow[]>();
    if (error) throw error;
    for (const row of data ?? []) {
      attempts.set(row.question_id, { selectedAnswer: row.selected_answer, isCorrect: row.is_correct });
    }
    if (!data || data.length < LATEST_ATTEMPTS_PAGE_SIZE) break;
  }
  return attempts;
}

// Bugunku deneme sayisi ve seriler, kullanicinin saat diliminde (sat_attempt_summary).
async function readSummary(supabase: UserSupabaseClient): Promise<SatAttemptSummary> {
  const { data, error } = await supabase.rpc("sat_attempt_summary", {
    p_time_zone: browserTimeZone(),
  });
  if (error) throw error;
  const row = (data as SatAttemptSummaryRow[] | null)?.[0];
  if (!row) return EMPTY_SUMMARY;
  return {
    todayCount: row.today_count,
    streak: row.current_streak,
    longestStreak: row.longest_streak,
  };
}

// question_id -> son deneme, ayrica seri ve bugunku sayi
export function useSatAttempts() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const getClient = useUserSupabaseClient();
  const [attempts, setAttempts] = useState<Map<string, SatAttemptState>>(() => new Map());
  const [summary, setSummary] = useState<SatAttemptSummary>(EMPTY_SUMMARY);
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
          if (active) {
            setAttempts(new Map());
            setSummary(EMPTY_SUMMARY);
          }
          return;
        }
        const supabase = await getClient();
        const [latest, nextSummary] = await Promise.all([
          readLatestAttempts(supabase, userId),
          readSummary(supabase),
        ]);
        if (active) {
          setAttempts(latest);
          setSummary(nextSummary);
        }
      } catch (err) {
        console.error("SAT attempts yukleme hatasi:", err);
        if (active) {
          setAttempts(new Map());
          setSummary(EMPTY_SUMMARY);
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
    async (questionId: string, selectedAnswer: string, isCorrect: boolean) => {
      if (!userId) return;

      const previousAttempt = attempts.get(questionId);
      const previousSummary = summary;

      setAttempts((current) => new Map(current).set(questionId, { selectedAnswer, isCorrect }));
      // Bugunun ilk cevabi seriyi bir gun uzatir (seri dunku gunde bitiyordu veya 0'di).
      setSummary((current) => {
        const streak = current.todayCount > 0 ? current.streak : current.streak + 1;
        return {
          todayCount: current.todayCount + 1,
          streak,
          longestStreak: Math.max(current.longestStreak, streak),
        };
      });

      try {
        const supabase = await getClient();
        // answered_at sunucu saatiyle yazilir (supabase/sat_bank.sql tetikleyicisi).
        const { error: insertError } = await supabase.from("sat_attempts").insert([
          {
            user_id: userId,
            question_id: questionId,
            selected_answer: selectedAnswer,
            is_correct: isCorrect,
          },
        ]);
        if (insertError) throw insertError;
      } catch (err) {
        console.error("SAT attempt kayit hatasi:", err);
        setAttempts((current) => {
          const next = new Map(current);
          if (previousAttempt) next.set(questionId, previousAttempt);
          else next.delete(questionId);
          return next;
        });
        setSummary(previousSummary);
      }
    },
    [attempts, summary, userId, getClient]
  );

  return {
    attempts,
    recordAttempt,
    loading,
    error,
    reload,
    streak: summary.streak,
    todayCount: summary.todayCount,
    longestStreak: summary.longestStreak,
  };
}
