"use client";

import { useEffect, useState } from "react";

import type { CommunityLink } from "@/lib/community-links";

let communitiesCache: CommunityLink[] | null = null;
let communitiesRequest: Promise<CommunityLink[]> | null = null;

async function fetchCommunities(): Promise<CommunityLink[]> {
  if (communitiesCache) return communitiesCache;

  if (!communitiesRequest) {
    communitiesRequest = fetch("/api/communities", { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Community links fetch failed");
        }
        return (await response.json()) as CommunityLink[];
      })
      .then((data) => {
        communitiesCache = data;
        return data;
      })
      .finally(() => {
        communitiesRequest = null;
      });
  }

  return communitiesRequest;
}

export function useCommunitiesData() {
  const [communities, setCommunities] = useState<CommunityLink[]>(() => communitiesCache ?? []);
  const [loading, setLoading] = useState(!communitiesCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (communitiesCache) {
      return () => {
        active = false;
      };
    }

    fetchCommunities()
      .then((data) => {
        if (!active) return;
        setCommunities(data);
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

  return { communities, loading, error };
}
