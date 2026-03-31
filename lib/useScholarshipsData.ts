"use client";

import { useEffect, useState } from "react";

import type { RegionSlug, ScholarshipRegionRecord } from "@/types/scholarships";

export interface ScholarshipsApiResponse {
  defaultRegionSlug: RegionSlug;
  regions: ScholarshipRegionRecord[];
}

let scholarshipsCache: ScholarshipsApiResponse | null = null;
let scholarshipsRequest: Promise<ScholarshipsApiResponse> | null = null;

async function fetchScholarships(): Promise<ScholarshipsApiResponse> {
  if (scholarshipsCache) return scholarshipsCache;

  if (!scholarshipsRequest) {
    scholarshipsRequest = fetch("/api/scholarships", { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Scholarships fetch failed");
        }

        return (await response.json()) as ScholarshipsApiResponse;
      })
      .then((data) => {
        scholarshipsCache = data;
        return data;
      })
      .finally(() => {
        scholarshipsRequest = null;
      });
  }

  return scholarshipsRequest;
}

export function useScholarshipsData() {
  const [data, setData] = useState<ScholarshipsApiResponse | null>(
    () => scholarshipsCache
  );
  const [loading, setLoading] = useState(!scholarshipsCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (scholarshipsCache) {
      return () => {
        active = false;
      };
    }

    fetchScholarships()
      .then((responseData) => {
        if (!active) return;
        setData(responseData);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unexpected error";
        setError(message);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
