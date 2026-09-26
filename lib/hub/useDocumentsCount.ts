"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useUserSupabaseClient } from "@/lib/useUserSupabaseClient";

export function useDocumentsCount(): {
  count: number;
  loading: boolean;
  unavailable: boolean;
} {
  const { user } = useUser();
  const userId = user?.id;
  const getClient = useUserSupabaseClient();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function load() {
      if (!userId) {
        if (!isActive) return;
        setCount(0);
        setLoading(false);
        setUnavailable(false);
        return;
      }

      setLoading(true);
      setUnavailable(false);

      try {
        const supabase = await getClient();
        const { count: c, error } = await supabase
          .from("user_documents")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        if (error) throw error;
        if (isActive) setCount(c ?? 0);
      } catch (err) {
        console.error("[hub] document count fetch failed:", err);
        if (isActive) {
          setCount(0);
          setUnavailable(true);
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    void load();
    return () => {
      isActive = false;
    };
  }, [getClient, userId]);

  return { count, loading, unavailable };
}
