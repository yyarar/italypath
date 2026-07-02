"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createClerkSupabaseClient } from "@/lib/supabaseClient";
import type { UserProfileRow } from "@/types";
import {
  EMPTY_PROFILE,
  isProfileBudget,
  isProfileCityPref,
  isProfileLevel,
  sanitizeProfileFields,
  type UserProfile,
} from "@/lib/hub/profile";

function rowToProfile(row: UserProfileRow | null): UserProfile {
  if (!row) return EMPTY_PROFILE;
  return {
    level: isProfileLevel(row.level) ? row.level : null,
    fields: sanitizeProfileFields(row.fields),
    budget: isProfileBudget(row.budget) ? row.budget : null,
    cityPref: isProfileCityPref(row.city_pref) ? row.city_pref : null,
  };
}

export function useUserProfile(): {
  profile: UserProfile;
  loading: boolean;
  unavailable: boolean;
  saveProfile: (next: UserProfile) => Promise<boolean>;
} {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
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
    if (!isLoaded) return;
    let isActive = true;

    async function load() {
      if (!userId) {
        if (!isActive) return;
        setProfile(EMPTY_PROFILE);
        setLoading(false);
        setUnavailable(false);
        return;
      }

      setLoading(true);
      setUnavailable(false);

      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, level, fields, budget, city_pref")
        .eq("user_id", userId)
        .maybeSingle();

      if (!isActive) return;

      if (error) {
        console.error("[hub] profil yukleme hatasi:", error);
        setProfile(EMPTY_PROFILE);
        setUnavailable(true);
      } else {
        setProfile(rowToProfile((data as UserProfileRow | null) ?? null));
      }
      setLoading(false);
    }

    void load();
    return () => {
      isActive = false;
    };
  }, [supabase, userId, isLoaded]);

  const saveProfile = useCallback(
    async (next: UserProfile): Promise<boolean> => {
      if (!userId) return false;

      const previous = profile;
      setProfile(next);

      const { error } = await supabase.from("user_profiles").upsert(
        {
          user_id: userId,
          level: next.level,
          fields: next.fields,
          budget: next.budget,
          city_pref: next.cityPref,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        console.error("[hub] profil kaydetme hatasi:", error);
        setProfile(previous);
        return false;
      }
      return true;
    },
    [profile, supabase, userId],
  );

  return { profile, loading, unavailable, saveProfile };
}
