"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";

import {
  MENTOR_REQUEST_TIMEOUT_MS,
  withMentorTimeout,
} from "@/lib/mentor/volunteerDeskState";
import type { createClerkSupabaseClient } from "@/lib/supabaseClient";

export type UserSupabaseClient = ReturnType<typeof createClerkSupabaseClient>;
export type UserSupabaseLoader = () => Promise<UserSupabaseClient>;

// Favori, belge, profil ve SAT kancalarinin istek siniri; mentor masasiyla ayni.
export const USER_DATA_REQUEST_TIMEOUT_MS = MENTOR_REQUEST_TIMEOUT_MS;

/** Supabase istemcisinin kendi sinirinin kapsamadigi isler (Storage) icin. */
export function withUserDataTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  return withMentorTimeout(promise, USER_DATA_REQUEST_TIMEOUT_MS);
}

/**
 * Giris yapmis kullanicinin kendi verisi icin Supabase istemcisi (mentor
 * kodundaki desen): Clerk'in yerel oturum anahtari, anahtar beklemesi ve her
 * PostgREST istegi USER_DATA_REQUEST_TIMEOUT_MS ile sinirli; takilan istek
 * hataya doner. supabase-js ilk cagrida yuklenir, giris yapmamis ziyaretci
 * paketi hic indirmez.
 */
export function useUserSupabaseClient(): UserSupabaseLoader {
  const { getToken } = useAuth();

  return useMemo(() => {
    let client: Promise<UserSupabaseClient> | null = null;
    return () => {
      if (!client) {
        const pending = withUserDataTimeout(import("@/lib/supabaseClient")).then(
          ({ createClerkSupabaseClient }) =>
            createClerkSupabaseClient(
              async () => {
                // A stalled Clerk token is bounded here; a null token fails
                // closed under RLS.
                try {
                  return await withMentorTimeout(getToken());
                } catch {
                  return null;
                }
              },
              { requestTimeoutMs: USER_DATA_REQUEST_TIMEOUT_MS },
            ),
        );
        // Yukleme basarisizsa sonraki "tekrar dene" yeniden denesin.
        pending.catch(() => {
          if (client === pending) client = null;
        });
        client = pending;
      }
      return client;
    };
  }, [getToken]);
}
