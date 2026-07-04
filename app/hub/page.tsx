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
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="h-10 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-24 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-32 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-32 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-32 bg-[var(--editorial-surface)] shimmer" />
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
        <div className="mx-auto max-w-md border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 text-center">
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
            className="mt-6 inline-flex items-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
          >
            {t.hub.signInCta}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <DossierTopStrip />

        {hasProfile ? (
          <>
            <ProfileStrip profile={profile} />
            {universitiesError || !recommendation ? (
              <div className="mt-8 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6">
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
                <ProgramMatchList matches={recommendation.matches} />
                <ScholarshipBlock
                  region={scholarshipRegion}
                  budget={profile.budget}
                />
                <CityPicksBlock cities={cityPicks} />
              </>
            )}
          </>
        ) : (
          <ProfileInviteCard />
        )}

        <div className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
