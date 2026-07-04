"use client";

import { useEffect, useState } from "react";

import type { SatQuestion, SatSection, SatTopic } from "@/lib/sat/types";

let topicsCache: SatTopic[] | null = null;
let topicsRequest: Promise<SatTopic[]> | null = null;
const questionsCache = new Map<string, SatQuestion[]>();

async function fetchTopics(): Promise<SatTopic[]> {
  if (topicsCache) return topicsCache;
  if (!topicsRequest) {
    topicsRequest = fetch("/api/sat/questions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("SAT topics fetch failed");
        const payload = (await response.json()) as { topics: SatTopic[] };
        topicsCache = payload.topics;
        return payload.topics;
      })
      .finally(() => {
        topicsRequest = null;
      });
  }
  return topicsRequest;
}

export function useSatTopics() {
  const [topics, setTopics] = useState<SatTopic[]>(() => topicsCache ?? []);
  const [loading, setLoading] = useState(!topicsCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTopics()
      .then((data) => {
        if (!active) return;
        setTopics(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Beklenmeyen hata");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { topics, loading, error };
}

export async function fetchSatQuestions(section: SatSection, skillSlug: string): Promise<SatQuestion[]> {
  const key = `${section}/${skillSlug}`;
  const cached = questionsCache.get(key);
  if (cached) return cached;

  const response = await fetch(
    `/api/sat/questions?section=${encodeURIComponent(section)}&skill=${encodeURIComponent(skillSlug)}`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error("SAT questions fetch failed");
  const payload = (await response.json()) as { questions: SatQuestion[] };
  questionsCache.set(key, payload.questions);
  return payload.questions;
}
