"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createClerkSupabaseClient } from "@/lib/supabaseClient";

export function useDocumentsCount(): {
  count: number;
  loading: boolean;
  unavailable: boolean;
} {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const supabase = useMemo(
    () =>
      createClerkSupabaseClient(async () => {
        try {
          return await getToken({ template: "supabase" });
        } catch {
          return null;
        }
      }),
    [getToken],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user?.id) {
        if (!active) return;
        setCount(0);
        setLoading(false);
        setUnavailable(false);
        return;
      }

      setLoading(true);
      setUnavailable(false);

      const { count: c, error } = await supabase
        .from("user_documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!active) return;

      if (error) {
        console.error("[hub] document count fetch failed:", error);
        setCount(0);
        setUnavailable(true);
      } else {
        setCount(c ?? 0);
      }

      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [supabase, user?.id]);

  return { count, loading, unavailable };
}
