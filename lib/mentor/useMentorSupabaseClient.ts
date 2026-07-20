"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";

import { createClerkSupabaseClient } from "@/lib/supabaseClient";

export function useMentorSupabaseClient() {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClerkSupabaseClient(async () => {
        try {
          return await getToken();
        } catch {
          return null;
        }
      }),
    [getToken],
  );
}
