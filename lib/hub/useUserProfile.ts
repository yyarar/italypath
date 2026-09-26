"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useUserSupabaseClient } from "@/lib/useUserSupabaseClient";
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
  /** Profil yuklenemedi (bos profil degil); reload ile tekrar denenir. */
  unavailable: boolean;
  reload: () => void;
  saveProfile: (next: UserProfile) => Promise<boolean>;
} {
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const getClient = useUserSupabaseClient();
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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

      try {
        const supabase = await getClient();
        const { data, error } = await supabase
          .from("user_profiles")
          .select("user_id, level, fields, budget, city_pref")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        if (isActive) setProfile(rowToProfile((data as UserProfileRow | null) ?? null));
      } catch (err) {
        console.error("[hub] profil yukleme hatasi:", err);
        if (isActive) {
          setProfile(EMPTY_PROFILE);
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
  }, [getClient, userId, isLoaded, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const saveProfile = useCallback(
    async (next: UserProfile): Promise<boolean> => {
      if (!userId) return false;

      const previous = profile;
      setProfile(next);

      try {
        const supabase = await getClient();
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
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("[hub] profil kaydetme hatasi:", err);
        setProfile(previous);
        return false;
      }
    },
    [profile, getClient, userId],
  );

  return { profile, loading, unavailable, reload, saveProfile };
}
