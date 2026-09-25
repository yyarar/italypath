"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";

import {
  MENTOR_REQUEST_TIMEOUT_MS,
  withMentorTimeout,
} from "@/lib/mentor/volunteerDeskState";
import { createClerkSupabaseClient } from "@/lib/supabaseClient";

export function useMentorSupabaseClient() {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClerkSupabaseClient(
        async () => {
          // The PostgREST timeout does not cover the token wait, so a stalled
          // Clerk token is bounded here; a null token fails closed under RLS.
          try {
            return await withMentorTimeout(getToken());
          } catch {
            return null;
          }
        },
        { requestTimeoutMs: MENTOR_REQUEST_TIMEOUT_MS },
      ),
    [getToken],
  );
}
