"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import type { University } from "@/app/data";
import ScrollProgress from "@/components/ScrollProgress";
import { useLanguage } from "@/context/LanguageContext";
import { useUniversitiesData } from "@/lib/useUniversitiesData";
import { ComingSoonNotice } from "./ComingSoonNotice";
import { DetailMentorPrompt } from "./DetailMentorPrompt";
import { ProgramAdmissionDetailsPanel } from "./ProgramAdmissionDetailsPanel";
import { ProgramDirectory } from "./ProgramDirectory";
import { ProgramMetaStrip } from "./ProgramMetaStrip";
import { ProgramPortraitHeader } from "./ProgramPortraitHeader";

interface DepartmentDetailClientProps {
  initialUniversity: University | null;
  initialDepartmentSlug: string;
  idFromUrl: string;
}

export function DepartmentDetailClient({
  initialUniversity,
  initialDepartmentSlug,
  idFromUrl,
}: DepartmentDetailClientProps) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { t, language } = useLanguage();
  const { universities, loading: universitiesLoading, error: universitiesError } =
    useUniversitiesData(initialUniversity ? [initialUniversity] : undefined);
  const [expandingDeptSlug, setExpandingDeptSlug] = useState<string | null>(null);

  const aiMentorHref = isSignedIn
    ? "/ai-mentor"
    : "/giris?redirect_url=%2Fai-mentor";

  const university = useMemo(
    () =>
      universities.find((entry) => String(entry.id) === String(idFromUrl)) ??
      initialUniversity,
    [idFromUrl, initialUniversity, universities],
  );
  const department = useMemo(
    () => university?.departments.find((entry) => entry.slug === initialDepartmentSlug),
    [initialDepartmentSlug, university],
  );
  const otherDepts = useMemo(
    () => university?.departments.filter((entry) => entry.slug !== initialDepartmentSlug) ?? [],
    [initialDepartmentSlug, university],
  );

  useEffect(() => {
    if (!expandingDeptSlug || !university?.id) return;
    const timer = window.setTimeout(() => {
      router.push(`/universities/${university.id}/departments/${expandingDeptSlug}`);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [expandingDeptSlug, router, university?.id]);

  if (universitiesLoading && !university) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center text-sm font-semibold text-[var(--editorial-muted)]">
        {language === "tr" ? "Program dosyası yükleniyor..." : "Loading program portrait..."}
      </div>
    );
  }

  if (universitiesError && !university) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center text-sm font-semibold text-[var(--editorial-muted)]">
        {language === "tr"
          ? "Üniversite verisi yüklenemedi."
          : "University data could not be loaded."}
      </div>
    );
  }

  if (!university || !department) {
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

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-28 text-[var(--editorial-ink)]">
      <ScrollProgress />
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

        <section className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {t.department.schoolContext}
          </p>
          <div className="max-w-4xl space-y-4">
            <Link
              href={`/universities/${university.id}`}
              className="inline-flex w-fit items-center font-serif text-xl font-semibold text-[var(--editorial-ink)] underline decoration-[var(--editorial-sage)] decoration-2 underline-offset-4 transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)] sm:text-2xl"
            >
              {university.name}
            </Link>
            <p className="font-serif text-xl leading-8 text-[var(--editorial-ink)] sm:text-2xl sm:leading-9">
              {description}
            </p>
          </div>
        </section>

        {department.admissionDetails ? (
          <ProgramAdmissionDetailsPanel
            details={department.admissionDetails}
            labels={{
              title: t.department.admissionDetails,
              officialProgramPage: t.department.officialProgramPage,
              officialCall: t.department.officialCall,
              tuitionFees: t.department.tuitionFees,
              campus: t.department.campus,
              degreeClass: t.department.degreeClass,
              admissionType: t.department.admissionType,
              teachingLanguage: t.department.teachingLanguage,
              euDeadline: t.department.euDeadline,
              nonEuDeadline: t.department.nonEuDeadline,
              academicRequirements: t.department.academicRequirements,
              languageRequirements: t.department.languageRequirements,
              requiredDocuments: t.department.requiredDocuments,
              entryExamOrTest: t.department.entryExamOrTest,
              uncertaintyNote: t.department.uncertaintyNote,
              uncertainFields: t.department.uncertainFields,
              uncertaintyNotes: t.department.uncertaintyNotes,
              officialSources: t.department.officialSources,
              officialSource: t.department.officialSource,
            }}
          />
        ) : (
          <ComingSoonNotice
            title={t.department.detailsComingSoonTitle}
            body={t.department.detailsComingSoonBody}
          />
        )}

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

        <DetailMentorPrompt
          href={aiMentorHref}
          eyebrow={t.department.mentorEyebrow}
          title={t.department.mentorTitle}
          body={t.department.mentorBody}
          cta={t.department.askAi}
        />
      </main>
    </div>
  );
}
