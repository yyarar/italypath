"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

import { createClerkSupabaseClient } from "@/lib/supabaseClient";
import type { SatAttemptRow } from "@/types";

export interface SatAttemptState {
  selectedAnswer: string;
  isCorrect: boolean;
}

// question_id -> son deneme
export function useSatAttempts() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [attempts, setAttempts] = useState<Map<string, SatAttemptState>>(new Map());
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(
    () =>
      createClerkSupabaseClient(async () => {
        try {
          return await getToken({ template: "supabase" });
        } catch {
          return null;
        }
      }),
    [getToken]
  );

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        if (!user) {
          if (active) setAttempts(new Map());
          return;
        }
        const { data, error } = await supabase
          .from("sat_attempts")
          .select("question_id,selected_answer,is_correct,answered_at")
          .eq("user_id", user.id)
          .order("answered_at", { ascending: true })
          .returns<SatAttemptRow[]>();
        if (error) throw error;

        if (active) {
          const map = new Map<string, SatAttemptState>();
          for (const row of data ?? []) {
            map.set(row.question_id, { selectedAnswer: row.selected_answer, isCorrect: row.is_correct });
          }
          setAttempts(map);
        }
      } catch (err) {
        console.error("SAT attempts yukleme hatasi:", err);
        if (active) setAttempts(new Map());
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, isLoaded, supabase]);

  const recordAttempt = useCallback(
    async (questionId: string, selectedAnswer: string, isCorrect: boolean) => {
      if (!user) return;
      const previous = attempts;

      const next = new Map(previous);
      next.set(questionId, { selectedAnswer, isCorrect });
      setAttempts(next);

      const { error } = await supabase.from("sat_attempts").insert([
        { user_id: user.id, question_id: questionId, selected_answer: selectedAnswer, is_correct: isCorrect },
      ]);
      if (error) {
        console.error("SAT attempt kayit hatasi:", error);
        setAttempts(previous);
      }
    },
    [attempts, user, supabase]
  );

  return { attempts, recordAttempt, loading };
}
