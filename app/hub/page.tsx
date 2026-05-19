"use client";

import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useFavorites } from "@/lib/useFavorites";
import { useUniversitiesData } from "@/lib/useUniversitiesData";
import { useHubStage } from "@/lib/hub/useHubStage";
import { useDocumentsCount } from "@/lib/hub/useDocumentsCount";

import DossierTopStrip from "@/components/hub/DossierTopStrip";
import DossierHero from "@/components/hub/DossierHero";
import StageStrip from "@/components/hub/StageStrip";
import BentoGrid from "@/components/hub/BentoGrid";
import KisaListeCell from "@/components/hub/KisaListeCell";
import BelgeCell from "@/components/hub/BelgeCell";
import BursNotuCell from "@/components/hub/BursNotuCell";
import ToplulukNotuCell from "@/components/hub/ToplulukNotuCell";
import PreferencesStrip from "@/components/hub/PreferencesStrip";
import AccountFooter from "@/components/hub/AccountFooter";

export default function HubPage() {
  const { t } = useLanguage();
  const { isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const { count: documentsCount, loading: documentsCountLoading, unavailable: documentsUnavailable } = useDocumentsCount();
  const { stage } = useHubStage();
  const { universities, loading: universitiesLoading } = useUniversitiesData();

  // useFavorites returns number[]; KisaListeCell expects readonly string[]
  const favoritesAsStrings: readonly string[] = favorites.map(String);

  const loading = !userLoaded || favoritesLoading || documentsCountLoading || universitiesLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="h-10 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-24 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-32 bg-[var(--editorial-surface)] shimmer" />
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            <div className="h-60 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shimmer" />
            <div className="h-60 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shimmer" />
            <div className="h-60 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shimmer" />
            <div className="h-60 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shimmer" />
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
            href="/sign-in?redirect_url=%2Fhub"
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
        <DossierHero
          stage={stage}
          favoritesCount={favorites.length}
          documentsCount={documentsCount}
          documentsUnavailable={documentsUnavailable}
        />
        <StageStrip />
        <BentoGrid>
          <KisaListeCell favorites={favoritesAsStrings} universities={universities} />
          <BelgeCell
            documentsCount={documentsCount}
            documentsUnavailable={documentsUnavailable}
          />
          <BursNotuCell />
          <ToplulukNotuCell />
        </BentoGrid>
        <PreferencesStrip />
        <AccountFooter />
      </main>
    </div>
  );
}
