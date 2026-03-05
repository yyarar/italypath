"use client";

import { useEffect, useState } from "react";
import type { University } from "@/app/data";

let universitiesCache: University[] | null = null;
let universitiesRequest: Promise<University[]> | null = null;

async function fetchUniversities(): Promise<University[]> {
  if (universitiesCache) return universitiesCache;

  if (!universitiesRequest) {
    universitiesRequest = fetch("/api/universities", { cache: "force-cache" })
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

export function useUniversitiesData() {
  const [universities, setUniversities] = useState<University[]>(() => universitiesCache ?? []);
  const [loading, setLoading] = useState(!universitiesCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (universitiesCache) {
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
  }, []);

  return { universities, loading, error };
}
