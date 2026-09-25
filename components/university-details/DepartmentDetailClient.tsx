"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { University } from "@/types/universities";
import ScrollProgress from "@/components/ScrollProgress";
import { useLanguage } from "@/context/LanguageContext";
import { ComingSoonNotice } from "./ComingSoonNotice";
import { ProgramAdmissionDetailsPanel } from "./ProgramAdmissionDetailsPanel";
import { ProgramSourceTrail } from "./ProgramSourceTrail";
import { ProgramSummaryStrip } from "./ProgramSummaryStrip";
import type { ProgramDossierLabels } from "./programDossierShared";
import { ProgramDirectory } from "./ProgramDirectory";
import { ProgramNextSteps } from "./ProgramNextSteps";
import { DetailBreadcrumb } from "./DetailBreadcrumb";
import { RelatedLinks } from "./RelatedLinks";
import type { RelatedLinksData } from "@/lib/relatedLinks";
import { ProgramMetaStrip } from "./ProgramMetaStrip";
import { ProgramPortraitHeader } from "./ProgramPortraitHeader";

interface DepartmentDetailClientProps {
  /**
   * Sunucu sarmalayicisindan gelen okul: acilan programin kabul dosyasi dahil, diger programlar
   * dizindeki hafif kayitlar (pruneUniversityForProgram).
   */
  initialUniversity: University;
  initialDepartmentSlug: string;
  related: RelatedLinksData | null;
}

export function DepartmentDetailClient({
  initialUniversity: university,
  initialDepartmentSlug,
  related,
}: DepartmentDetailClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [expandingDeptSlug, setExpandingDeptSlug] = useState<string | null>(null);

  const department = useMemo(
    () => university.departments.find((entry) => entry.slug === initialDepartmentSlug),
    [initialDepartmentSlug, university],
  );
  const otherDepts = useMemo(
    () => university.departments.filter((entry) => entry.slug !== initialDepartmentSlug),
    [initialDepartmentSlug, university],
  );

  useEffect(() => {
    if (!expandingDeptSlug) return;
    const timer = window.setTimeout(() => {
      router.push(`/universities/${university.id}/departments/${expandingDeptSlug}`);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [expandingDeptSlug, router, university.id]);

  if (!department) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold text-[var(--editorial-ink)]">
          {language === "tr" ? "Bölüm Bulunamadı" : "Program Not Found"}
        </h1>
        <Link
          href="/universities"
          className="mt-5 inline-flex border border-[var(--editorial-sage)] px-4 py-3 text-sm font-bold text-[var(--editorial-sage)]"
        >
          {language === "tr" ? "Üniversitelere Dön" : "Back to Universities"}
        </Link>
      </div>
    );
  }

  const description =
    language === "en" && university.description_en
      ? university.description_en
      : university.description;
  const safeLanguages =
    Array.isArray(department.languages) && department.languages.length > 0
      ? department.languages
      : ["en"];
  const safeDurationYears =
    typeof department.durationYears === "number" ? department.durationYears : 3;
  const safeLevel =
    department.level === "master" || department.level === "single-cycle"
      ? department.level
      : "bachelor";
  const levelValue =
    safeLevel === "single-cycle"
      ? t.department.singleCycle
      : safeLevel === "master"
        ? t.department.master
        : t.department.bachelor;
  const durationValue =
    language === "tr"
      ? `${safeDurationYears} yıl`
      : `${safeDurationYears} year${safeDurationYears === 1 ? "" : "s"}`;
  const languageValue = safeLanguages
    .map((entry) => {
      if (entry === "it") return language === "tr" ? "İtalyanca" : "Italian";
      return language === "tr" ? "İngilizce" : "English";
    })
    .join(" / ");

  // Kunye, dosya govdesi ve kaynak izi ayni etiket sozlesmesini paylasir.
  const dossierLabels: ProgramDossierLabels = {
    title: t.department.admissionDetails,
    summaryTitle: t.department.summaryTitle,
    sourceCount: t.department.sourceCount,
    sourceCountSingle: t.department.sourceCountSingle,
    lastChecked: t.department.lastChecked,
    officialProgramPage: t.department.officialProgramPage,
    officialCall: t.department.officialCall,
    tuitionFees: t.department.tuitionFees,
    campus: t.department.campus,
    degreeClass: t.department.degreeClass,
    admissionType: t.department.admissionType,
    teachingLanguage: t.department.teachingLanguage,
    applicationTimeline: t.department.applicationTimeline,
    euDeadline: t.department.euDeadline,
    nonEuDeadline: t.department.nonEuDeadline,
    notSpecifiedInSources: t.department.notSpecifiedInSources,
    verifyInOfficialCall: t.department.verifyInOfficialCall,
    admissionRequirements: t.department.admissionRequirements,
    academicRequirements: t.department.academicRequirements,
    languageRequirements: t.department.languageRequirements,
    requiredDocuments: t.department.requiredDocuments,
    entryExamOrTest: t.department.entryExamOrTest,
    viewSource: t.department.viewSource,
    readFull: t.department.readFull,
    collapseText: t.department.collapseText,
    moreDocuments: t.department.moreDocuments,
    moreDocumentsSingle: t.department.moreDocumentsSingle,
    sourceLabel: t.department.sourceLabel,
    uncertaintyTitle: t.department.uncertaintyTitle,
    uncertaintyNote: t.department.uncertaintyNote,
    sourceChangeNotice: t.department.sourceChangeNotice,
    additionalDocumentsMayApply: t.department.additionalDocumentsMayApply,
    sourceTrail: t.department.sourceTrail,
    programSourcePurpose: t.department.programSourcePurpose,
    callSourcePurpose: t.department.callSourcePurpose,
    feesSourcePurpose: t.department.feesSourcePurpose,
    additionalSourcePurpose: t.department.additionalSourcePurpose,
    officialSource: t.department.officialSource,
    sourceExcerptCount: t.department.sourceExcerptCount,
    sourceExcerptSingle: t.department.sourceExcerptSingle,
    nextStep: t.department.nextStep,
    openOfficialSource: t.department.openOfficialSource,
    askExpert: t.department.askExpert,
    expertDeskNote: t.department.expertDeskNote,
    otherAdmissionInformation: t.department.otherAdmissionInformation,
  };

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-28 text-[var(--editorial-ink)]">
      <ScrollProgress />
      <DetailBreadcrumb
        ariaLabel={t.breadcrumb.label}
        items={[
          { label: t.breadcrumb.home, href: "/" },
          { label: t.breadcrumb.universities, href: "/universities" },
          { label: university.name, href: `/universities/${university.id}` },
        ]}
        current={department.name}
      />
      <ProgramPortraitHeader
        university={university}
        department={department}
        eyebrow={t.department.portraitEyebrow}
        backLabel={t.department.backToUni}
        websiteLabel={t.detail.visitSite}
      />

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <ProgramMetaStrip
          department={department}
          factsLabel={t.department.programFacts}
          levelLabel={t.department.level}
          durationLabel={t.department.duration}
          languageLabel={t.department.language}
          levelValue={levelValue}
          durationValue={durationValue}
          languageValue={languageValue}
        />

        {department.admissionDetails ? (
          <ProgramSummaryStrip
            details={department.admissionDetails}
            labels={dossierLabels}
            language={language}
          />
        ) : null}

        {/* Okul tanitimi: baslik etiketi yok (Kerem karari, 19 Eylul); ince sage cizgiyle ayrilan
            sade bir alinti blogu. */}
        <div className="max-w-4xl border-l-2 border-[var(--editorial-sage)] pl-5 sm:pl-7">
          <Link
            href={`/universities/${university.id}`}
            className="inline-flex w-fit items-center font-serif text-lg font-semibold text-[var(--editorial-ink)] underline decoration-[var(--editorial-sage)] decoration-2 underline-offset-4 transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)] sm:text-xl"
          >
            {university.name}
          </Link>
          <p className="mt-3 font-serif text-xl leading-8 text-[var(--editorial-ink)] sm:text-2xl sm:leading-9">
            {description}
          </p>
        </div>

        {department.admissionDetails ? (
          <ProgramAdmissionDetailsPanel
            details={department.admissionDetails}
            language={language}
            labels={dossierLabels}
          />
        ) : (
          <ComingSoonNotice
            title={t.department.detailsComingSoonTitle}
            body={t.department.detailsComingSoonBody}
          />
        )}

        <ProgramNextSteps
          related={related}
          labels={t.department.nextSteps}
          consult={{ ...t.consultPrompt.program, cta: t.consultPrompt.cta }}
        />

        {department.admissionDetails ? (
          <ProgramSourceTrail
            details={department.admissionDetails}
            labels={dossierLabels}
            language={language}
          />
        ) : null}

        <ProgramDirectory
          university={university}
          departments={otherDepts}
          title={t.department.otherDepts}
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

        {related ? <RelatedLinks data={related} labels={t.related} showHubLinks={false} /> : null}
      </main>
    </div>
  );
}
