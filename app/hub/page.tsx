"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { ArrowRight, BookOpen, FolderOpen, Heart } from "lucide-react";

import AccountFooter from "@/components/hub/AccountFooter";
import CityPicksBlock from "@/components/hub/CityPicksBlock";
import CompactStatCard from "@/components/hub/CompactStatCard";
import DossierTopStrip from "@/components/hub/DossierTopStrip";
import PreferencesStrip from "@/components/hub/PreferencesStrip";
import ProfileInviteCard from "@/components/hub/ProfileInviteCard";
import ProfileStrip from "@/components/hub/ProfileStrip";
import ProgramMatchList from "@/components/hub/ProgramMatchList";
import RecommendationHero from "@/components/hub/RecommendationHero";
import ScholarshipBlock from "@/components/hub/ScholarshipBlock";
import { useLanguage } from "@/context/LanguageContext";
import { isProfileEmpty } from "@/lib/hub/profile";
import {
  matchPrograms,
  pickCities,
  pickScholarshipRegion,
} from "@/lib/hub/recommendations";
import { useDocumentsCount } from "@/lib/hub/useDocumentsCount";
import { useUserProfile } from "@/lib/hub/useUserProfile";
import { useFavorites } from "@/lib/useFavorites";
import { useUniversitiesData } from "@/lib/useUniversitiesData";

export default function HubPage() {
  const { t } = useLanguage();
  const { isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const {
    count: documentsCount,
    loading: documentsCountLoading,
    unavailable: documentsUnavailable,
  } = useDocumentsCount();
  const {
    profile,
    loading: profileLoading,
    unavailable: profileUnavailable,
  } = useUserProfile();
  const {
    universities,
    loading: universitiesLoading,
    error: universitiesErrorMessage,
  } = useUniversitiesData();

  useEffect(() => {
    try {
      window.localStorage.removeItem("italyPathStage");
    } catch {
      /* ignore */
    }
  }, []);

  const universitiesError =
    Boolean(universitiesErrorMessage) ||
    (!universitiesLoading && universities.length === 0);
  const hasProfile = !profileUnavailable && !isProfileEmpty(profile);

  const recommendation = useMemo(
    () =>
      hasProfile && !universitiesError
        ? matchPrograms(profile, universities)
        : null,
    [hasProfile, profile, universities, universitiesError],
  );
  const scholarshipRegion = useMemo(
    () => (recommendation ? pickScholarshipRegion(recommendation.matches) : null),
    [recommendation],
  );
  const cityPicks = useMemo(
    () =>
      recommendation ? pickCities(recommendation.matches, profile.cityPref) : [],
    [recommendation, profile.cityPref],
  );

  const lede = useMemo(() => {
    if (!hasProfile) return "";
    const parts: string[] = [];
    for (const field of profile.fields) {
      parts.push(t.onboarding.steps.fields.options[field]);
    }
    if (profile.level) parts.push(t.onboarding.steps.level.options[profile.level]);
    if (profile.cityPref && profile.cityPref !== "any") {
      parts.push(t.onboarding.steps.city.options[profile.cityPref]);
    }
    if (profile.budget && parts.length === 0) {
      parts.push(t.onboarding.steps.budget.options[profile.budget]);
    }
    return parts.join(" · ");
  }, [hasProfile, profile, t]);

  const loading =
    !userLoaded ||
    favoritesLoading ||
    documentsCountLoading ||
    profileLoading ||
    universitiesLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          <div className="h-16 rounded-[1.5rem] bg-[var(--editorial-surface)] shimmer" />
          <div className="h-12 rounded-full bg-[var(--editorial-surface)] shimmer" />
          <div className="h-64 rounded-[2rem] bg-[var(--editorial-surface)] shimmer" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)]">
            <div className="h-96 rounded-[2rem] bg-[var(--editorial-surface)] shimmer" />
            <div className="h-72 rounded-[2rem] bg-[var(--editorial-surface)] shimmer" />
          </div>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.loading}
          </p>
        </div>
      </div>
    );
  }

  if (userLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-12 sm:px-6">
        <div className="hub-material mx-auto max-w-md rounded-[2rem] p-8 text-center shadow-[0_24px_70px_rgba(21,32,28,0.12)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
            ITALYPATH
          </p>
          <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)]">
            {t.hub.signedOutTitle}
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--editorial-muted)]">
            {t.hub.signedOutDesc}
          </p>
          <Link
            href="/giris?redirect_url=%2Fhub"
            className="hub-pressable mt-6 inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_25px_rgba(31,79,70,0.2)] hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            {t.hub.signInCta}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[var(--editorial-paper)] pb-24">
      <div className="pointer-events-none absolute -right-40 top-20 -z-10 h-[32rem] w-[32rem] rounded-full bg-[rgba(219,232,225,0.62)] blur-3xl" />
      <div className="pointer-events-none absolute -left-48 top-[36rem] -z-10 h-[30rem] w-[30rem] rounded-full bg-[rgba(231,201,184,0.2)] blur-3xl" />
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <DossierTopStrip />

        {hasProfile ? (
          <>
            <ProfileStrip profile={profile} />
            {universitiesError || !recommendation ? (
              <div className="hub-material mt-6 rounded-[1.5rem] p-6">
                <p className="text-sm text-[var(--editorial-muted)]">
                  {t.hub.loadError}
                </p>
              </div>
            ) : (
              <>
                <RecommendationHero
                  count={recommendation.matches.length}
                  lede={lede}
                  relaxed={recommendation.relaxed !== "none"}
                />
                <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)]">
                  <ProgramMatchList matches={recommendation.matches} />
                  <aside className="grid gap-5 lg:sticky lg:top-24">
                    <ScholarshipBlock
                      region={scholarshipRegion}
                      budget={profile.budget}
                    />
                    <CityPicksBlock cities={cityPicks} />
                  </aside>
                </div>
              </>
            )}
          </>
        ) : (
          <ProfileInviteCard />
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CompactStatCard
            href="/favorites"
            label={t.hub.compact.shortlist}
            value={t.hub.compact.shortlistUnit.replace(
              "{count}",
              String(favorites.length),
            )}
            icon={Heart}
            iconClassName="text-[var(--editorial-terracotta)]"
          />
          <CompactStatCard
            href="/documents"
            label={t.hub.compact.documents}
            value={
              documentsUnavailable
                ? "—"
                : t.hub.compact.documentsUnit.replace(
                    "{count}",
                    String(documentsCount),
                  )
            }
            icon={FolderOpen}
            iconClassName="text-[var(--editorial-sage)]"
          />
          <CompactStatCard
            href="/sat"
            label={t.sat.title}
            value={t.sat.subtitle}
            icon={BookOpen}
            iconClassName="text-[var(--editorial-terracotta)]"
          />
        </div>

        <PreferencesStrip />
        <AccountFooter />
      </main>
    </div>
  );
}
