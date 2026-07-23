import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  ReceiptText,
  Square,
  type LucideIcon,
} from "lucide-react";

import type { ProgramAdmissionDetails } from "@/types/universities";
import {
  admissionFieldIsUncertain,
  buildAdmissionEvidence,
  canonicalizeAdmissionFieldRefs,
  cleanAdmissionDisplayValue,
  getAdmissionFieldEvidence,
  groupAdmissionEvidenceByUrl,
  latestAdmissionSourceDate,
  normalizeAdmissionSourceUrl,
  parseAdmissionSourceDate,
  type AdmissionFieldKey,
  type AdmissionQuoteEvidence,
} from "./programAdmissionPresentation";

interface ProgramAdmissionDetailsLabels {
  title: string;
  sourceCount: string;
  sourceCountSingle: string;
  lastChecked: string;
  officialProgramPage: string;
  officialCall: string;
  tuitionFees: string;
  campus: string;
  degreeClass: string;
  admissionType: string;
  teachingLanguage: string;
  applicationTimeline: string;
  euDeadline: string;
  nonEuDeadline: string;
  notSpecifiedInSources: string;
  verifyInOfficialCall: string;
  admissionRequirements: string;
  academicRequirements: string;
  languageRequirements: string;
  requiredDocuments: string;
  entryExamOrTest: string;
  viewSource: string;
  readFull: string;
  collapseText: string;
  moreDocuments: string;
  sourceLabel: string;
  uncertaintyTitle: string;
  uncertaintyNote: string;
  additionalDocumentsMayApply: string;
  sourceTrail: string;
  programSourcePurpose: string;
  callSourcePurpose: string;
  feesSourcePurpose: string;
  additionalSourcePurpose: string;
  officialSource: string;
  sourceExcerptCount: string;
  sourceExcerptSingle: string;
  moreDocumentsSingle: string;
  nextStep: string;
  openOfficialSource: string;
  askAi: string;
  aiContextNote: string;
  otherAdmissionInformation: string;
}

interface ProgramAdmissionDetailsPanelProps {
  details?: ProgramAdmissionDetails;
  labels: ProgramAdmissionDetailsLabels;
  language: "tr" | "en";
  programName: string;
  universityName: string;
  isSignedIn?: boolean;
}

interface DossierSource {
  url: string;
  title: string;
  purpose: string;
  icon: LucideIcon;
  latestRetrievedAt?: string;
  evidence: AdmissionQuoteEvidence[];
}

const FIELD_LABEL_KEYS: Record<
  AdmissionFieldKey,
  keyof ProgramAdmissionDetailsLabels
> = {
  officialProgramUrl: "officialProgramPage",
  officialCallUrl: "officialCall",
  tuitionOrFeesLink: "tuitionFees",
  campus: "campus",
  degreeClass: "degreeClass",
  admissionType: "admissionType",
  rawTeachingLanguage: "teachingLanguage",
  applicationDeadlineEu: "euDeadline",
  applicationDeadlineNonEu: "nonEuDeadline",
  academicRequirements: "academicRequirements",
  languageRequirements: "languageRequirements",
  requiredDocuments: "requiredDocuments",
  entryExamOrTest: "entryExamOrTest",
};

function fillTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function formatSourceDate(value: string | undefined, language: "tr" | "en") {
  if (!value) return null;
  const date = parseAdmissionSourceDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function latestQuote(
  quotes: AdmissionQuoteEvidence[],
): AdmissionQuoteEvidence | undefined {
  return quotes.reduce<AdmissionQuoteEvidence | undefined>((latest, quote) => {
    if (!latest) return quote;
    const latestDate = parseAdmissionSourceDate(latest.retrievedAt);
    const quoteDate = parseAdmissionSourceDate(quote.retrievedAt);
    if (!quoteDate) return latest;
    return !latestDate || quoteDate > latestDate ? quote : latest;
  }, undefined);
}

function buildDossierSources(
  details: ProgramAdmissionDetails,
  evidence: AdmissionQuoteEvidence[],
  labels: ProgramAdmissionDetailsLabels,
) {
  const evidenceGroups = groupAdmissionEvidenceByUrl(evidence);
  const sources = new Map<string, DossierSource>();

  const addSource = (
    url: string | undefined,
    title: string,
    purpose: string,
    icon: LucideIcon,
  ) => {
    if (!url) return;
    const key = normalizeAdmissionSourceUrl(url);
    const matchingGroup = evidenceGroups.find(
      (group) => normalizeAdmissionSourceUrl(group.url) === key,
    );
    const existing = sources.get(key);

    if (existing) {
      if (matchingGroup) {
        existing.evidence = matchingGroup.evidence;
        existing.latestRetrievedAt = matchingGroup.latestRetrievedAt;
      }
      return;
    }

    sources.set(key, {
      url,
      title,
      purpose,
      icon,
      latestRetrievedAt: matchingGroup?.latestRetrievedAt,
      evidence: matchingGroup?.evidence ?? [],
    });
  };

  addSource(
    details.officialProgramUrl,
    labels.officialProgramPage,
    labels.programSourcePurpose,
    FileText,
  );
  addSource(
    details.officialCallUrl,
    labels.officialCall,
    labels.callSourcePurpose,
    CalendarDays,
  );
  addSource(
    details.tuitionOrFeesLink,
    labels.tuitionFees,
    labels.feesSourcePurpose,
    ReceiptText,
  );

  let additionalSourceIndex = 0;
  for (const group of evidenceGroups) {
    const key = normalizeAdmissionSourceUrl(group.url);
    if (sources.has(key)) continue;
    additionalSourceIndex += 1;
    sources.set(key, {
      url: group.url,
      title: fillTemplate(labels.officialSource, {
        index: additionalSourceIndex,
      }),
      purpose: labels.additionalSourcePurpose,
      icon: FileText,
      latestRetrievedAt: group.latestRetrievedAt,
      evidence: group.evidence,
    });
  }

  return [...sources.values()];
}

function SourceNavLink({
  href,
  label,
}: {
  href?: string;
  label: string;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-10 shrink-0 items-center gap-2 px-1 text-sm font-bold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function DossierSectionTitle({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <h3 className="font-serif text-2xl font-semibold leading-tight text-[var(--editorial-ink)]">
      <span aria-hidden="true" className="mr-1 text-[var(--editorial-sage)]">
        {index}.
      </span>{" "}
      {children}
    </h3>
  );
}

function ExpandableText({
  value,
  readFullLabel,
  collapseLabel,
  threshold = 360,
  clampClassName = "line-clamp-4",
  className = "",
}: {
  value: string;
  readFullLabel: string;
  collapseLabel: string;
  threshold?: number;
  clampClassName?: string;
  className?: string;
}) {
  const displayValue = cleanAdmissionDisplayValue(value);

  if (displayValue.length <= threshold) {
    return <p className={className}>{displayValue}</p>;
  }

  return (
    <details className="group">
      <summary className="w-full cursor-pointer list-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]">
        <span
          className={`group-open:hidden ${clampClassName} ${className}`}
        >
          {displayValue}
        </span>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--editorial-terracotta)] group-open:hidden">
          {readFullLabel}
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
        <span className="hidden items-center gap-1 text-xs font-bold text-[var(--editorial-terracotta)] group-open:inline-flex">
          {collapseLabel}
          <ChevronUp className="h-3.5 w-3.5" />
        </span>
      </summary>
      <p className={`mt-3 ${className}`}>{displayValue}</p>
    </details>
  );
}

function EvidenceLink({
  evidence,
  label,
}: {
  evidence?: AdmissionQuoteEvidence;
  label: string;
}) {
  if (!evidence) return null;

  return (
    <a
      href={evidence.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-8 shrink-0 items-center gap-1 text-xs font-bold text-[var(--editorial-terracotta)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function SourceMeta({
  evidence,
  sourceLabel,
  sourceName,
  language,
}: {
  evidence?: AdmissionQuoteEvidence;
  sourceLabel: string;
  sourceName: string;
  language: "tr" | "en";
}) {
  if (!evidence) return null;
  const formattedDate = formatSourceDate(evidence.retrievedAt, language);

  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-[var(--editorial-muted)]">
      <a
        href={evidence.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold transition hover:text-[var(--editorial-ink)]"
      >
        {sourceLabel}: {sourceName}
      </a>
      {formattedDate ? (
        <>
          <span aria-hidden="true">·</span>
          <time dateTime={evidence.retrievedAt}>{formattedDate}</time>
        </>
      ) : null}
    </p>
  );
}

function buildMentorHref({
  isSignedIn,
  programName,
  universityName,
  focus,
}: {
  isSignedIn?: boolean;
  programName: string;
  universityName: string;
  focus: string[];
}) {
  const params = new URLSearchParams({
    desk: "ai",
    program: programName,
    university: universityName,
  });
  if (focus.length > 0) params.set("focus", focus.join(", "));

  const target = `/ai-mentor?${params.toString()}`;
  return isSignedIn
    ? target
    : `/giris?redirect_url=${encodeURIComponent(target)}`;
}

function getFieldLabel(
  field: AdmissionFieldKey,
  labels: ProgramAdmissionDetailsLabels,
) {
  return labels[FIELD_LABEL_KEYS[field]];
}

function getUncertaintyLabels(
  uncertain: string[],
  labels: ProgramAdmissionDetailsLabels,
) {
  const fieldLabels = uncertain.flatMap((rawField) => {
    const fields = canonicalizeAdmissionFieldRefs([rawField]);
    if (fields.length === 0) return [labels.otherAdmissionInformation];
    return fields.map((field) => getFieldLabel(field, labels));
  });

  return [...new Set(fieldLabels)];
}

function sourceNameForEvidence(
  evidence: AdmissionQuoteEvidence | undefined,
  sources: DossierSource[],
  fallback: string,
) {
  if (!evidence) return fallback;
  const source = sources.find(
    (entry) =>
      normalizeAdmissionSourceUrl(entry.url) ===
      normalizeAdmissionSourceUrl(evidence.url),
  );
  return source?.title ?? fallback;
}

function ProfileFact({
  label,
  value,
  evidence,
  viewSourceLabel,
}: {
  label: string;
  value: string;
  evidence?: AdmissionQuoteEvidence;
  viewSourceLabel: string;
}) {
  return (
    <div className="min-w-0 border-t border-[var(--editorial-border)] py-4">
      <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-[13px] font-semibold leading-5 text-[var(--editorial-ink)] sm:text-sm sm:leading-6">
        {cleanAdmissionDisplayValue(value)}
      </dd>
      <EvidenceLink evidence={evidence} label={viewSourceLabel} />
    </div>
  );
}

export function ProgramAdmissionDetailsPanel({
  details,
  labels,
  language,
  programName,
  universityName,
  isSignedIn,
}: ProgramAdmissionDetailsPanelProps) {
  if (!details) return null;

  const evidence = buildAdmissionEvidence(details.sourceQuotes);
  const sources = buildDossierSources(details, evidence, labels);
  const latestRetrievedAt = latestAdmissionSourceDate(
    evidence.map((item) => item.retrievedAt),
  );
  const formattedLastChecked = formatSourceDate(latestRetrievedAt, language);

  const evidenceFor = (field: AdmissionFieldKey) =>
    latestQuote(getAdmissionFieldEvidence(evidence, field));

  const profileFacts = [
    {
      field: "campus" as const,
      label: labels.campus,
      value: details.campus,
    },
    {
      field: "degreeClass" as const,
      label: labels.degreeClass,
      value: details.degreeClass,
    },
    {
      field: "admissionType" as const,
      label: labels.admissionType,
      value: details.admissionType,
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

  const hasTimeline =
    Boolean(
      details.applicationDeadlineEu || details.applicationDeadlineNonEu,
    ) ||
    admissionFieldIsUncertain(details, "applicationDeadlineEu") ||
    admissionFieldIsUncertain(details, "applicationDeadlineNonEu");

  const requirementRows = [
    {
      field: "academicRequirements" as const,
      label: labels.academicRequirements,
      value: details.academicRequirements,
    },
    {
      field: "languageRequirements" as const,
      label: labels.languageRequirements,
      value: details.languageRequirements,
    },
    {
      field: "entryExamOrTest" as const,
      label: labels.entryExamOrTest,
      value: details.entryExamOrTest,
    },
  ].filter(
    (row) =>
      Boolean(row.value) || admissionFieldIsUncertain(details, row.field),
  );

  const uncertaintyLabels = getUncertaintyLabels(details.uncertain, labels);
  const hasUncertainty =
    uncertaintyLabels.length > 0 || details.uncertaintyNotes.length > 0;
  const visibleDocuments = details.requiredDocuments.slice(0, 6);
  const additionalDocuments = details.requiredDocuments.slice(6);
  const mentorHref = buildMentorHref({
    isSignedIn,
    programName,
    universityName,
    focus: uncertaintyLabels,
  });

  return (
    <section
      data-testid="program-admission-dossier"
      className="select-text border border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
    >
      <header className="border-b border-[var(--editorial-border)] px-5 py-6 sm:px-7 lg:flex lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <h2 className="font-serif text-3xl font-semibold tracking-[-0.025em] text-[var(--editorial-ink)] sm:text-4xl">
            {labels.title}
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
          className="-mx-1 mt-4 flex flex-wrap gap-x-5 gap-y-1 px-1 pb-1 lg:mt-0 lg:justify-end"
        >
          <SourceNavLink
            href={details.officialProgramUrl}
            label={labels.officialProgramPage}
          />
          <SourceNavLink
            href={details.officialCallUrl}
            label={labels.officialCall}
          />
          <SourceNavLink
            href={details.tuitionOrFeesLink}
            label={labels.tuitionFees}
          />
        </nav>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 px-5 py-2 sm:px-7">
          <dl className="grid grid-cols-2 gap-x-5">
            {profileFacts.map((fact) => (
              <ProfileFact
                key={fact.field}
                label={fact.label}
                value={fact.value}
                evidence={evidenceFor(fact.field)}
                viewSourceLabel={labels.viewSource}
              />
            ))}
          </dl>

          {hasTimeline ? (
            <section className="border-t border-[var(--editorial-border)] py-6">
              <DossierSectionTitle index={1}>
                {labels.applicationTimeline}
              </DossierSectionTitle>
              <div className="mt-4 divide-y divide-[var(--editorial-border)] sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                {[
                  {
                    field: "applicationDeadlineEu" as const,
                    label: labels.euDeadline,
                    value: details.applicationDeadlineEu,
                  },
                  {
                    field: "applicationDeadlineNonEu" as const,
                    label: labels.nonEuDeadline,
                    value: details.applicationDeadlineNonEu,
                  },
                ].map((deadline, index) => {
                  const fieldEvidence = evidenceFor(deadline.field);
                  const sourceName = sourceNameForEvidence(
                    fieldEvidence,
                    sources,
                    labels.officialSource,
                  );

                  return (
                    <article
                      key={deadline.field}
                      className={`py-4 sm:py-1 ${
                        index === 0 ? "sm:pr-5" : "sm:pl-5"
                      }`}
                    >
                      <h4 className="text-sm font-bold text-[var(--editorial-ink)]">
                        {deadline.label}
                      </h4>
                      <div className="mt-2">
                        {deadline.value ? (
                          <ExpandableText
                            value={deadline.value}
                            readFullLabel={labels.readFull}
                            collapseLabel={labels.collapseText}
                            threshold={200}
                            clampClassName="line-clamp-5"
                            className="break-words text-base font-semibold leading-7 text-[var(--editorial-ink)]"
                          />
                        ) : (
                          <p className="break-words text-base leading-7 text-[var(--editorial-muted)]">
                            {labels.notSpecifiedInSources}
                          </p>
                        )}
                      </div>
                      <SourceMeta
                        evidence={fieldEvidence}
                        sourceLabel={labels.sourceLabel}
                        sourceName={sourceName}
                        language={language}
                      />
                      {!deadline.value && details.officialCallUrl ? (
                        <a
                          href={details.officialCallUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex min-h-8 items-center gap-1 text-sm font-bold text-[var(--editorial-terracotta)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                        >
                          {labels.verifyInOfficialCall}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {requirementRows.length > 0 ? (
            <section className="border-t border-[var(--editorial-border)] py-6">
              <DossierSectionTitle index={hasTimeline ? 2 : 1}>
                {labels.admissionRequirements}
              </DossierSectionTitle>
              <dl className="mt-4 border-b border-[var(--editorial-border)]">
                {requirementRows.map((row) => (
                  <div
                    key={row.field}
                    className="grid gap-2 border-t border-[var(--editorial-border)] py-4 sm:grid-cols-[165px_minmax(0,1fr)_auto] sm:items-start sm:gap-5"
                  >
                    <dt className="text-sm font-bold text-[var(--editorial-ink)]">
                      {row.label}
                    </dt>
                    <dd>
                      {row.value ? (
                        <ExpandableText
                          value={row.value}
                          readFullLabel={labels.readFull}
                          collapseLabel={labels.collapseText}
                          className="break-words text-sm leading-6 text-[var(--editorial-ink)] sm:text-base sm:leading-7"
                        />
                      ) : (
                        <p className="break-words text-sm leading-6 text-[var(--editorial-muted)] sm:text-base sm:leading-7">
                          {labels.notSpecifiedInSources}
                        </p>
                      )}
                    </dd>
                    <EvidenceLink
                      evidence={evidenceFor(row.field)}
                      label={labels.viewSource}
                    />
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {details.requiredDocuments.length > 0 ? (
            <section className="border-t border-[var(--editorial-border)] py-6">
              <DossierSectionTitle
                index={
                  Number(hasTimeline) + Number(requirementRows.length > 0) + 1
                }
              >
                {labels.requiredDocuments}
              </DossierSectionTitle>
              <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {visibleDocuments.map((document, index) => (
                  <li
                    key={`${document}-${index}`}
                    className="flex min-w-0 items-start gap-3 text-sm leading-6 text-[var(--editorial-ink)] sm:text-base"
                  >
                    <Square
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0 stroke-[1.5]"
                    />
                    <div className="min-w-0 flex-1">
                      <ExpandableText
                        value={document}
                        readFullLabel={labels.readFull}
                        collapseLabel={labels.collapseText}
                        threshold={180}
                        clampClassName="line-clamp-3"
                        className="break-words text-sm leading-6 text-[var(--editorial-ink)] sm:text-base"
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {additionalDocuments.length > 0 ? (
                <details className="group mt-4 border-t border-[var(--editorial-border)] pt-3">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-bold text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]">
                    {additionalDocuments.length === 1
                      ? labels.moreDocumentsSingle
                      : fillTemplate(labels.moreDocuments, {
                          count: additionalDocuments.length,
                        })}
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {additionalDocuments.map((document, index) => (
                      <li
                        key={`${document}-${index + visibleDocuments.length}`}
                        className="flex min-w-0 items-start gap-3 text-sm leading-6 text-[var(--editorial-ink)] sm:text-base"
                      >
                        <Square
                          aria-hidden="true"
                          className="mt-1 h-4 w-4 shrink-0 stroke-[1.5]"
                        />
                        <div className="min-w-0 flex-1">
                          <ExpandableText
                            value={document}
                            readFullLabel={labels.readFull}
                            collapseLabel={labels.collapseText}
                            threshold={180}
                            clampClassName="line-clamp-3"
                            className="break-words text-sm leading-6 text-[var(--editorial-ink)] sm:text-base"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              {admissionFieldIsUncertain(details, "requiredDocuments") ? (
                <p className="mt-4 text-sm text-[var(--editorial-muted)]">
                  {labels.additionalDocumentsMayApply}
                </p>
              ) : null}
              <div className="mt-2">
                <EvidenceLink
                  evidence={evidenceFor("requiredDocuments")}
                  label={labels.viewSource}
                />
              </div>
            </section>
          ) : null}

          {hasUncertainty ? (
            <section className="-mx-5 border-t border-[var(--editorial-terracotta)]/35 bg-[#fbf2eb] px-5 py-5 sm:-mx-7 sm:px-7">
              <h3 className="font-serif text-xl font-semibold text-[var(--editorial-terracotta)] sm:text-2xl">
                {labels.uncertaintyTitle}
              </h3>
              {uncertaintyLabels.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--editorial-ink)]">
                  {uncertaintyLabels.map((fieldLabel) => (
                    <li key={fieldLabel}>{fieldLabel}</li>
                  ))}
                </ul>
              ) : null}
              {details.uncertaintyNotes.length > 0 ? (
                <ul className="mt-3 space-y-2 border-t border-[var(--editorial-terracotta)]/20 pt-3 text-sm leading-6 text-[var(--editorial-muted)]">
                  {details.uncertaintyNotes.map((note, index) => (
                    <li key={`${note}-${index}`} className="break-words">
                      <ExpandableText
                        value={note}
                        readFullLabel={labels.readFull}
                        collapseLabel={labels.collapseText}
                        threshold={180}
                        clampClassName="line-clamp-3"
                        className="break-words text-sm leading-6 text-[var(--editorial-muted)]"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--editorial-ink)]">
                {labels.uncertaintyNote}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="border-t border-[var(--editorial-border)] px-5 py-6 sm:px-7 lg:border-l lg:border-t-0">
          <DossierSectionTitle
            index={
              Number(hasTimeline) +
              Number(requirementRows.length > 0) +
              Number(details.requiredDocuments.length > 0) +
              1
            }
          >
            {labels.sourceTrail}
          </DossierSectionTitle>

          <ol className="mt-4 border-b border-[var(--editorial-border)]">
            {sources.map((source) => {
              const SourceIcon = source.icon;
              const formattedDate = formatSourceDate(
                source.latestRetrievedAt,
                language,
              );

              return (
                <li
                  key={normalizeAdmissionSourceUrl(source.url)}
                  className="border-t border-[var(--editorial-border)] py-4"
                >
                  <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 place-items-center bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)]"
                    >
                      <SourceIcon className="h-4 w-4 stroke-[1.7]" />
                    </span>
                    <div className="min-w-0">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-1 break-words text-sm font-bold leading-5 text-[var(--editorial-ink)] transition hover:text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                      >
                        {source.title}
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      </a>
                      <p className="mt-1 text-xs leading-5 text-[var(--editorial-muted)]">
                        {source.purpose}
                      </p>
                      {formattedDate && source.latestRetrievedAt ? (
                        <time
                          dateTime={source.latestRetrievedAt}
                          className="mt-1 block text-xs text-[var(--editorial-muted)]"
                        >
                          {formattedDate}
                        </time>
                      ) : null}
                    </div>
                  </div>

                  {source.evidence.length > 0 ? (
                    <details className="group mt-3 pl-12">
                      <summary className="w-fit cursor-pointer text-xs font-bold text-[var(--editorial-sage)] transition marker:text-[var(--editorial-terracotta)] hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]">
                        {source.evidence.length === 1
                          ? labels.sourceExcerptSingle
                          : fillTemplate(labels.sourceExcerptCount, {
                              count: source.evidence.length,
                            })}
                      </summary>
                      <div className="mt-3 space-y-3">
                        {source.evidence.map((item) => (
                          <blockquote
                            id={item.id}
                            key={item.id}
                            className="break-words border-l-2 border-[var(--editorial-sage-soft)] pl-3 text-xs leading-5 text-[var(--editorial-muted)]"
                          >
                            “{item.quote}”
                          </blockquote>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <div className="pt-6">
            <h3 className="font-serif text-2xl font-semibold text-[var(--editorial-ink)]">
              {labels.nextStep}
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
              <a
                href={details.officialProgramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
              >
                {labels.openOfficialSource}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Link
                href={mentorHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--editorial-ink)] bg-[var(--editorial-ink)] px-3 py-2 text-center text-sm font-bold text-[var(--editorial-paper)] transition hover:bg-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)] lg:justify-start lg:border-0 lg:bg-transparent lg:px-0 lg:text-left lg:text-[var(--editorial-terracotta)] lg:hover:bg-transparent lg:hover:text-[var(--editorial-ink)]"
              >
                {labels.askAi}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--editorial-muted)]">
              {labels.aiContextNote}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
