"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

import { createClerkSupabaseClient } from "@/lib/supabaseClient";
import type { SatAttemptRow } from "@/types";

export interface SatAttemptState {
  selectedAnswer: string;
  isCorrect: boolean;
}

const DAY = 86400000;

type SatAttemptRawRow = Pick<SatAttemptRow, "question_id" | "selected_answer" | "is_correct"> & {
  answered_at: string;
};

function keyFromDate(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function dayKey(iso: string): string {
  return keyFromDate(new Date(iso));
}

// question_id -> son deneme
export function useSatAttempts() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [attemptRows, setAttemptRows] = useState<SatAttemptRawRow[]>([]);
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
          if (active) setAttemptRows([]);
          return;
        }
        const { data, error } = await supabase
          .from("sat_attempts")
          .select("question_id,selected_answer,is_correct,answered_at")
          .eq("user_id", user.id)
          .order("answered_at", { ascending: true })
          .returns<SatAttemptRawRow[]>();
        if (error) throw error;

        if (active) {
          setAttemptRows(data ?? []);
        }
      } catch (err) {
        console.error("SAT attempts yukleme hatasi:", err);
        if (active) setAttemptRows([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, isLoaded, supabase]);

  const attempts = useMemo(() => {
    const map = new Map<string, SatAttemptState>();
    const sortedRows = [...attemptRows].sort(
      (a, b) => new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime()
    );

    for (const row of sortedRows) {
      map.set(row.question_id, { selectedAnswer: row.selected_answer, isCorrect: row.is_correct });
    }

    return map;
  }, [attemptRows]);

  const todayCount = useMemo(() => {
    const today = keyFromDate(new Date());
    return attemptRows.filter((row) => dayKey(row.answered_at) === today).length;
  }, [attemptRows]);

  const streak = useMemo(() => {
    const days = new Set(attemptRows.map((row) => dayKey(row.answered_at)));
    const cursor = new Date();

    if (!days.has(keyFromDate(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let count = 0;
    while (days.has(keyFromDate(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return count;
  }, [attemptRows]);

  const longestStreak = useMemo(() => {
    const dayStarts = [
      ...new Set(
        attemptRows.map((row) => {
          const date = new Date(row.answered_at);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
      ),
    ].sort((a, b) => a - b);

    let longest = 0;
    let run = 0;
    let prev: number | null = null;

    for (const time of dayStarts) {
      run = prev !== null && time - prev === DAY ? run + 1 : 1;
      if (run > longest) longest = run;
      prev = time;
    }

    return longest;
  }, [attemptRows]);

  const recordAttempt = useCallback(
    async (questionId: string, selectedAnswer: string, isCorrect: boolean) => {
      if (!user) return;

      const optimisticRow: SatAttemptRawRow = {
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      };

      setAttemptRows((current) => [...current, optimisticRow]);

      const { error } = await supabase.from("sat_attempts").insert([
        {
          user_id: user.id,
          question_id: questionId,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          answered_at: optimisticRow.answered_at,
        },
      ]);
      if (error) {
        console.error("SAT attempt kayit hatasi:", error);
        setAttemptRows((current) => current.filter((row) => row !== optimisticRow));
      }
    },
    [user, supabase]
  );

  return { attempts, recordAttempt, loading, streak, todayCount, longestStreak };
}
