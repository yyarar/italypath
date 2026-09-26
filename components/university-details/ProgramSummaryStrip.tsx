/* Program kunyesi: sayfanin ust kismindaki "bir bakista" bloku. Bilgi yalnizca
   kabul dosyasindaki dogrulanmis alanlardan gelir; yeni metin uretilmez. */

import { Info } from "lucide-react";

import type { ProgramAdmissionDetails } from "@/types/universities";
import {
  buildAdmissionEvidence,
  cleanAdmissionDisplayValue,
  extractDegreeClassCodes,
  getAdmissionFieldEvidence,
  latestAdmissionSourceDate,
  localizeAdmissionType,
  type AdmissionFieldKey,
} from "./programAdmissionPresentation";
import {
  ProfileFact,
  SourceNavLink,
  buildDossierSources,
  fillTemplate,
  formatSourceDate,
  latestQuote,
  type OfficialLinkContext,
  type ProgramDossierLabels,
} from "./programDossierShared";

interface ProgramSummaryStripProps {
  details: ProgramAdmissionDetails;
  labels: ProgramDossierLabels;
  language: "tr" | "en";
  linkContext: OfficialLinkContext;
}

export function ProgramSummaryStrip({
  details,
  labels,
  language,
  linkContext,
}: ProgramSummaryStripProps) {
  const evidence = buildAdmissionEvidence(details.sourceQuotes);
  const sources = buildDossierSources(details, evidence, labels, linkContext);
  const latestRetrievedAt = latestAdmissionSourceDate(
    evidence.map((item) => item.retrievedAt),
  );
  const formattedLastChecked = formatSourceDate(latestRetrievedAt, language);
  const evidenceFor = (field: AdmissionFieldKey) =>
    latestQuote(getAdmissionFieldEvidence(evidence, field));

  const degreeClassCodes = extractDegreeClassCodes(details.degreeClass);
  const degreeClassValue =
    degreeClassCodes.length > 0
      ? degreeClassCodes.join(" / ")
      : details.degreeClass
        ? cleanAdmissionDisplayValue(details.degreeClass)
        : undefined;

  const profileFacts = [
    {
      field: "campus" as const,
      label: labels.campus,
      value: details.campus,
    },
    {
      field: "degreeClass" as const,
      label: labels.degreeClass,
      value: degreeClassValue,
    },
    {
      field: "admissionType" as const,
      label: labels.admissionType,
      value: details.admissionType
        ? localizeAdmissionType(details.admissionType, language)
        : undefined,
    },
    {
      field: "rawTeachingLanguage" as const,
      label: labels.teachingLanguage,
      value: details.rawTeachingLanguage,
    },
  ].filter(
    (fact): fact is {
      field: "campus" | "degreeClass" | "admissionType" | "rawTeachingLanguage";
      label: string;
      value: string;
    } => Boolean(fact.value),
  );

  if (profileFacts.length === 0 && sources.length === 0) return null;

  return (
    <section
      data-testid="program-summary-strip"
      className="select-text border border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
    >
      <header className="border-b border-[var(--editorial-border)] px-5 py-5 sm:px-7 lg:flex lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta-ink)]">
            {labels.summaryTitle}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--editorial-muted)] sm:text-sm">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-[var(--editorial-sage)]"
            />
            <span>
              {sources.length === 1
                ? labels.sourceCountSingle
                : fillTemplate(labels.sourceCount, { count: sources.length })}
            </span>
            {formattedLastChecked && latestRetrievedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {fillTemplate(labels.lastChecked, {
                    date: formattedLastChecked,
                  })}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <nav
          aria-label={labels.sourceTrail}
          className="-mx-1 mt-3 flex flex-wrap gap-x-5 gap-y-1 px-1 pb-1 lg:mt-0 lg:justify-end"
        >
          <SourceNavLink
            href={details.officialProgramUrl}
            label={labels.officialProgramPage}
            linkContext={linkContext}
            labels={labels}
          />
          <SourceNavLink
            href={details.officialCallUrl}
            label={labels.officialCall}
            linkContext={linkContext}
            labels={labels}
          />
          <SourceNavLink
            href={details.tuitionOrFeesLink}
            label={labels.tuitionFees}
            linkContext={linkContext}
            labels={labels}
          />
        </nav>
      </header>

      <dl className="grid grid-cols-2 gap-x-5 px-5 pb-2 sm:px-7 lg:grid-cols-4">
        {profileFacts.map((fact) => (
          <ProfileFact
            key={fact.field}
            label={fact.label}
            value={fact.value}
            evidence={evidenceFor(fact.field)}
            viewSourceLabel={labels.viewSource}
            readFullLabel={labels.readFull}
            collapseLabel={labels.collapseText}
          />
        ))}
      </dl>

      {/* Kaynak dogrulama notu: kabul bilgileri her yil degisebildigi icin her dosyali programda
          gorunur (Kerem karari, 19 Eylul). Ayrintili belirsizlikler kaynak izinde kalir. */}
      <p className="flex items-start gap-2 border-t border-[var(--editorial-terracotta)]/35 bg-[#fbf2eb] px-5 py-3 text-xs leading-5 text-[var(--editorial-ink)] sm:px-7 sm:text-sm">
        <Info
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--editorial-terracotta-ink)]"
        />
        <span>{labels.sourceChangeNotice}</span>
      </p>
    </section>
  );
}
