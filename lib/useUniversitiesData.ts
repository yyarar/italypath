"use client";

import { useEffect, useState } from "react";
import type { University } from "@/types/universities";

let universitiesCache: University[] | null = null;
let universitiesRequest: Promise<University[]> | null = null;

async function fetchUniversities(): Promise<University[]> {
  if (universitiesCache) return universitiesCache;

  if (!universitiesRequest) {
    universitiesRequest = fetch("/api/universities", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Universities fetch failed");
        return (await response.json()) as University[];
      })
      .then((data) => {
        universitiesCache = data;
        return data;
      })
      .finally(() => {
        universitiesRequest = null;
      });
  }

  return universitiesRequest;
}

type UseUniversitiesDataOptions = {
  /**
   * false: sunucudan gelen tam veri varken /api/universities (hafif dizin) cekilmez ve
   * modul onbellegindeki hafif kopya sunucu verisini ezmez. Detay sayfalari icin.
   */
  fetchWhenInitial?: boolean;
};

export function useUniversitiesData(
  initialUniversities?: University[],
  { fetchWhenInitial = true }: UseUniversitiesDataOptions = {}
) {
  const hasInitialUniversities = Boolean(initialUniversities?.length);
  const keepInitial = hasInitialUniversities && !fetchWhenInitial;
  const [universities, setUniversities] = useState<University[]>(() =>
    keepInitial ? (initialUniversities as University[]) : universitiesCache ?? initialUniversities ?? []
  );
  const [loading, setLoading] = useState(!keepInitial && !universitiesCache && !hasInitialUniversities);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (keepInitial || universitiesCache) {
      return () => {
        active = false;
      };
    }

    fetchUniversities()
      .then((data) => {
        if (!active) return;
        setUniversities(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unexpected error";
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [keepInitial]);

  return { universities, loading, error };
}
