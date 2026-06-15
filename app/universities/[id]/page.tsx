"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import ScrollProgress from "@/components/ScrollProgress";
import { DetailMentorPrompt } from "@/components/university-details/DetailMentorPrompt";
import { ProgramDirectory } from "@/components/university-details/ProgramDirectory";
import { UniversityHighlights } from "@/components/university-details/UniversityHighlights";
import { UniversityPortraitMasthead } from "@/components/university-details/UniversityPortraitMasthead";
import { useLanguage } from "@/context/LanguageContext";
import { useFavorites } from "@/lib/useFavorites";
import { useUniversitiesData } from "@/lib/useUniversitiesData";

export default function UniversityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { isFavorite, toggleFavorite, loading, isLoggedIn } = useFavorites();
  const { universities, loading: universitiesLoading, error: universitiesError } =
    useUniversitiesData();
  const [expandingDeptSlug, setExpandingDeptSlug] = useState<string | null>(null);

  const aiMentorHref = isLoggedIn
    ? "/ai-mentor"
    : "/sign-in?redirect_url=%2Fai-mentor";
  const idFromUrl = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const university = useMemo(
    () => universities.find((entry) => String(entry.id) === String(idFromUrl)),
    [idFromUrl, universities],
  );

  useEffect(() => {
    if (!expandingDeptSlug || !idFromUrl) return;
    const timer = window.setTimeout(() => {
      router.push(`/universities/${idFromUrl}/departments/${expandingDeptSlug}`);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [expandingDeptSlug, idFromUrl, router]);

  const handleBack = () => {
    const cameFromList = searchParams.get("from") === "list";
    if (cameFromList && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/universities");
  };

  if (universitiesLoading) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center text-sm font-semibold text-[var(--editorial-muted)]">
        {language === "tr" ? "Okul dosyası yükleniyor..." : "Loading school portrait..."}
      </div>
    );
  }

  if (universitiesError) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center text-sm font-semibold text-[var(--editorial-muted)]">
        {language === "tr"
          ? "Üniversite verisi yüklenemedi."
          : "University data could not be loaded."}
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold text-[var(--editorial-ink)]">
          {t.detail.notFound}
        </h1>
        <Link
          href="/universities"
          className="mt-5 inline-flex border border-[var(--editorial-sage)] px-4 py-3 text-sm font-bold text-[var(--editorial-sage)]"
        >
          {t.detail.backToList}
        </Link>
      </div>
    );
  }

  const favorite = isFavorite(university.id);
  const description =
    language === "en" && university.description_en
      ? university.description_en
      : university.description;
  const features =
    language === "en" && university.features_en
      ? university.features_en
      : university.features;
  const favoriteLabel =
    language === "tr"
      ? `${university.name} ${favorite ? "favorilerden çıkar" : "favorilere ekle"}`
      : `${favorite ? "Remove" : "Add"} ${university.name} ${
          favorite ? "from" : "to"
        } favorites`;

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-28 text-[var(--editorial-ink)]">
      <ScrollProgress />
      <UniversityPortraitMasthead
        university={university}
        eyebrow={t.detail.portraitEyebrow}
        backLabel={t.detail.back}
        websiteLabel={t.detail.visitSite}
        officialSourceLabel={t.detail.officialSource}
        programCountLabel={t.detail.programCount}
        favoriteLabel={favoriteLabel}
        favorite={favorite}
        favoriteLoading={loading}
        onBack={handleBack}
        onToggleFavorite={() => toggleFavorite(university.id)}
      />

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {t.detail.about}
          </p>
          <p className="max-w-4xl font-serif text-xl leading-8 text-[var(--editorial-ink)] sm:text-2xl sm:leading-9">
            {description}
          </p>
        </section>

        <UniversityHighlights title={t.detail.highlights} features={features} />

        <ProgramDirectory
          university={university}
          departments={university.departments}
          title={t.detail.programDirectory}
          programCountLabel={t.detail.programCount}
          bachelorPrograms={t.detail.bachelorPrograms}
          masterPrograms={t.detail.masterPrograms}
          singleCyclePrograms={t.detail.singleCyclePrograms}
          openingLabel={t.detail.openingProgram}
          comingSoonLabel={t.detail.detailComingSoon}
          expandingSlug={expandingDeptSlug}
          onSelect={(slug) => {
            if (!expandingDeptSlug) setExpandingDeptSlug(slug);
          }}
        />

        <DetailMentorPrompt
          href={aiMentorHref}
          eyebrow={t.detail.mentorEyebrow}
          title={t.detail.mentorTitle}
          body={t.detail.mentorBody}
          cta={t.detail.askAi}
        />
      </main>
    </div>
  );
}
