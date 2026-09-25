"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { University } from "@/types/universities";
import ScrollProgress from "@/components/ScrollProgress";
import ConsultPrompt from "@/components/consultation/ConsultPrompt";
import { useLanguage } from "@/context/LanguageContext";
import { useFavorites } from "@/lib/useFavorites";
import { ProgramDirectory } from "./ProgramDirectory";
import { DetailBreadcrumb } from "./DetailBreadcrumb";
import { RelatedLinks } from "./RelatedLinks";
import type { RelatedLinksData } from "@/lib/relatedLinks";
import { UniversityHighlights } from "./UniversityHighlights";
import { UniversityPortraitMasthead } from "./UniversityPortraitMasthead";

interface UniversityDetailClientProps {
  /** Sunucu sarmalayicisindan gelen dizin kaydi (kabul dosyasi yalnizca varlik bayragi). */
  initialUniversity: University;
  related: RelatedLinksData | null;
}

export function UniversityDetailClient({
  initialUniversity: university,
  related,
}: UniversityDetailClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { isFavorite, toggleFavorite, loading } = useFavorites();
  const [expandingDeptSlug, setExpandingDeptSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!expandingDeptSlug) return;
    const timer = window.setTimeout(() => {
      router.push(`/universities/${university.id}/departments/${expandingDeptSlug}`);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [expandingDeptSlug, router, university.id]);

  const handleBack = () => {
    // ISR: sayfa sunucuda searchParams okumaz; "listeden geldi" bilgisi tiklama aninda URL'den alinir.
    const cameFromList = new URLSearchParams(window.location.search).get("from") === "list";
    if (cameFromList && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/universities");
  };

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
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <DetailBreadcrumb
          ariaLabel={t.breadcrumb.label}
          items={[
            { label: t.breadcrumb.home, href: "/" },
            { label: t.breadcrumb.universities, href: "/universities" },
          ]}
          current={university.name}
        />
      </div>
      <UniversityPortraitMasthead
        university={university}
        eyebrow={t.detail.portraitEyebrow}
        backLabel={t.detail.back}
        websiteLabel={t.detail.visitSite}
        officialSourceLabel={t.detail.officialSource}
        programCountLabel={t.detail.programCount}
        feeLabel={t.detail.fee}
        favoriteLabel={favoriteLabel}
        favorite={favorite}
        favoriteLoading={loading}
        onBack={handleBack}
        onToggleFavorite={() => toggleFavorite(university.id)}
      />

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta-ink)]">
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

        <ConsultPrompt {...t.consultPrompt.university} cta={t.consultPrompt.cta} />
        {related ? <RelatedLinks data={related} labels={t.related} /> : null}
      </main>
    </div>
  );
}
