"use client";

import { useEffect, useState } from "react";

import type {
  ImatExamSession,
  ImatMockSummary,
  ImatQuestion,
  ImatSection,
  ImatTopic,
} from "@/lib/imat/types";

interface ImatCatalog {
  mocks: ImatMockSummary[];
  topics: ImatTopic[];
}

// Katalog ve konu pratigi modul icinde onbellekte; deneme ve inceleme her seferinde taze.
let catalogCache: ImatCatalog | null = null;
let catalogRequest: Promise<ImatCatalog> | null = null;
const practiceCache = new Map<string, ImatQuestion[]>();

// Sunucu { error } govdesi dondurdu ise mesaji al, yoksa yedek metin kullan.
async function readJson<T>(response: Response, fallback: string): Promise<T> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : fallback;
    throw new Error(message);
  }
  if (!payload) throw new Error(fallback);
  return payload as T;
}

async function fetchCatalog(): Promise<ImatCatalog> {
  if (catalogCache) return catalogCache;
  if (!catalogRequest) {
    catalogRequest = fetch("/api/imat/questions", { cache: "no-store" })
      .then(async (response) => {
        const payload = await readJson<ImatCatalog>(response, "IMAT catalog fetch failed");
        catalogCache = { mocks: payload.mocks, topics: payload.topics };
        return catalogCache;
      })
      .finally(() => {
        catalogRequest = null;
      });
  }
  return catalogRequest;
}

export function useImatCatalog() {
  const [mocks, setMocks] = useState<ImatMockSummary[]>(() => catalogCache?.mocks ?? []);
  const [topics, setTopics] = useState<ImatTopic[]>(() => catalogCache?.topics ?? []);
  const [loading, setLoading] = useState(!catalogCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchCatalog()
      .then((data) => {
        if (!active) return;
        setMocks(data.mocks);
        setTopics(data.topics);
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

  return { mocks, topics, loading, error };
}

// Konu pratigi: dogru cevap dolu gelir.
export async function fetchImatPracticeQuestions(
  section: ImatSection,
  topicSlug: string,
): Promise<ImatQuestion[]> {
  const key = `${section}/${topicSlug}`;
  const cached = practiceCache.get(key);
  if (cached) return cached;

  const response = await fetch(
    `/api/imat/questions?section=${encodeURIComponent(section)}&topic=${encodeURIComponent(topicSlug)}`,
    { cache: "no-store" },
  );
  const payload = await readJson<{ questions: ImatQuestion[] }>(response, "IMAT questions fetch failed");
  practiceCache.set(key, payload.questions);
  return payload.questions;
}

// Deneme sorulari: cevap anahtari yok (correctAnswer null); onbellek yok, her baslangicta taze.
export async function fetchImatMockQuestions(year: number): Promise<ImatQuestion[]> {
  const response = await fetch(`/api/imat/questions?mock=${encodeURIComponent(String(year))}`, {
    cache: "no-store",
  });
  const payload = await readJson<{ questions: ImatQuestion[] }>(response, "IMAT mock fetch failed");
  return payload.questions;
}

// Teslim edilmis oturumun incelemesi: cevap anahtari dolu; onbellek yok.
export async function fetchImatReview(
  sessionId: string,
): Promise<{ session: ImatExamSession; questions: ImatQuestion[] }> {
  const response = await fetch(`/api/imat/questions?review=${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
  });
  return readJson<{ session: ImatExamSession; questions: ImatQuestion[] }>(
    response,
    "IMAT review fetch failed",
  );
}
