"use client";

/* Kabul dosyasinin uc bileseni (kunye, govde, kaynak izi) arasinda paylasilan
   etiket sozlesmesi ve kucuk sunum parcalari. 2026-09-17 program detay turunda
   ProgramAdmissionDetailsPanel.tsx icinden ayrildi. */

import { useId, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";

import type { ProgramAdmissionDetails } from "@/types/universities";
import {
  classifyOfficialLink,
  isShowableOfficialLinkStatus,
  type OfficialLinkStatus,
} from "@/lib/officialLinkHosts.mjs";
import {
  canonicalizeAdmissionFieldRefs,
  cleanAdmissionDisplayValue,
  groupAdmissionEvidenceByUrl,
  normalizeAdmissionSourceUrl,
  parseAdmissionSourceDate,
  type AdmissionFieldKey,
  type AdmissionQuoteEvidence,
} from "./programAdmissionPresentation";

export interface ProgramDossierLabels {
  title: string;
  summaryTitle: string;
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
  moreDocumentsSingle: string;
  sourceLabel: string;
  uncertaintyTitle: string;
  uncertaintyNote: string;
  sourceChangeNotice: string;
  additionalDocumentsMayApply: string;
  sourceTrail: string;
  programSourcePurpose: string;
  callSourcePurpose: string;
  feesSourcePurpose: string;
  additionalSourcePurpose: string;
  officialSource: string;
  sourceExcerptCount: string;
  sourceExcerptSingle: string;
  nextStep: string;
  openOfficialSource: string;
  askExpert: string;
  expertDeskNote: string;
  otherAdmissionInformation: string;
  partnerSite: string;
  publicPortal: string;
  externalSite: string;
}

/** Linkin hangi okula/programa ait oldugu: izin listesi (lib/officialLinkHosts.mjs) bununla okunur. */
export interface OfficialLinkContext {
  universityId: number;
  departmentId?: number;
}

/** Ogrenciye tiklanabilir gosterilen link: yalnizca gecerli http(s), kisaltici/arsiv degil. */
export interface ShowableLink {
  href: string;
  displayHost: string;
  status: OfficialLinkStatus;
}

export interface DossierSource {
  url: string;
  link: ShowableLink;
  title: string;
  purpose: string;
  icon: LucideIcon;
  latestRetrievedAt?: string;
  evidence: AdmissionQuoteEvidence[];
}

export function resolveShowableLink(
  value: string | undefined,
  context?: OfficialLinkContext,
): ShowableLink | null {
  if (!value) return null;
  const result = classifyOfficialLink(value, context);
  if (!isShowableOfficialLinkStatus(result.status) || !result.displayHost) {
    return null;
  }
  return { href: value, displayHost: result.displayHost, status: result.status };
}

/** Okulun kendi sitesi disindaki hedefler icin kisa etiket (ortak site, kamu portali, dis site). */
export function linkHostTag(
  status: OfficialLinkStatus,
  labels: Pick<ProgramDossierLabels, "partnerSite" | "publicPortal" | "externalSite">,
) {
  if (status === "partner") return labels.partnerSite;
  if (status === "public") return labels.publicPortal;
  if (status === "unlisted") return labels.externalSite;
  return null;
}

/** Linkin yaninda hedef alan adi; okul disi hedefte etiketle birlikte. */
export function LinkHost({
  link,
  labels,
  className = "",
}: {
  link: ShowableLink;
  labels: Pick<ProgramDossierLabels, "partnerSite" | "publicPortal" | "externalSite">;
  className?: string;
}) {
  const tag = linkHostTag(link.status, labels);
  return (
    <span
      className={`block break-all text-xs font-semibold leading-5 text-[var(--editorial-muted)] ${className}`}
    >
      {link.displayHost}
      {tag ? (
        <span className="ml-1 font-bold text-[var(--editorial-terracotta-ink)]">
          · {tag}
        </span>
      ) : null}
    </span>
  );
}

const FIELD_LABEL_KEYS: Record<AdmissionFieldKey, keyof ProgramDossierLabels> = {
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

export function fillTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function formatSourceDate(
  value: string | undefined,
  language: "tr" | "en",
) {
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

export function latestQuote(
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

export function buildDossierSources(
  details: ProgramAdmissionDetails,
  evidence: AdmissionQuoteEvidence[],
  labels: ProgramDossierLabels,
  linkContext?: OfficialLinkContext,
) {
  const evidenceGroups = groupAdmissionEvidenceByUrl(evidence);
  const sources = new Map<string, DossierSource>();

  const addSource = (
    url: string | undefined,
    title: string,
    purpose: string,
    icon: LucideIcon,
  ) => {
    const link = resolveShowableLink(url, linkContext);
    if (!url || !link) return;
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
      link,
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
    const link = resolveShowableLink(group.url, linkContext);
    if (!link) continue;
    additionalSourceIndex += 1;
    sources.set(key, {
      url: group.url,
      link,
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

export function getFieldLabel(
  field: AdmissionFieldKey,
  labels: ProgramDossierLabels,
) {
  return labels[FIELD_LABEL_KEYS[field]];
}

export function getUncertaintyLabels(
  uncertain: string[],
  labels: ProgramDossierLabels,
) {
  const fieldLabels = uncertain.flatMap((rawField) => {
    const fields = canonicalizeAdmissionFieldRefs([rawField]);
    if (fields.length === 0) return [labels.otherAdmissionInformation];
    return fields.map((field) => getFieldLabel(field, labels));
  });

  return [...new Set(fieldLabels)];
}

export function sourceNameForEvidence(
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

export function ToggleButton({
  expanded,
  onToggle,
  contentId,
  readFullLabel,
  collapseLabel,
}: {
  expanded: boolean;
  onToggle: () => void;
  contentId: string;
  readFullLabel: string;
  collapseLabel: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={contentId}
      onClick={onToggle}
      className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[var(--editorial-terracotta-ink)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
    >
      {expanded ? collapseLabel : readFullLabel}
      {expanded ? (
        <ChevronUp className="h-3.5 w-3.5" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// Kunyedeki gibi dar alanlarda uzun kaynak metni: 3 satirla sinirlanir, metin HTML'e BIR kez
// yazilir, "Tumunu oku" dugmesi aria-expanded ile acar. 900 dosyanin 404'unde kampus/kabul
// tipi/egitim dili degerlerinden en az biri 90 karakteri asiyor (en uzun 5.643).
const CLAMP_THRESHOLD = 90;

export function ClampedValue({
  value,
  readFullLabel,
  collapseLabel,
  className = "",
}: {
  value: string;
  readFullLabel: string;
  collapseLabel: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const needsClamp = value.length > CLAMP_THRESHOLD;

  return (
    <>
      {/* "block" sinifi eklenmez: line-clamp display:-webkit-box ister, block onu ezer. */}
      <p
        id={contentId}
        className={`break-words ${needsClamp && !expanded ? "line-clamp-3" : ""} ${className}`}
      >
        {value}
      </p>
      {needsClamp ? (
        <ToggleButton
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
          contentId={contentId}
          readFullLabel={readFullLabel}
          collapseLabel={collapseLabel}
        />
      ) : null}
    </>
  );
}

export function SourceNavLink({
  href,
  label,
  linkContext,
  labels,
}: {
  href?: string;
  label: string;
  linkContext: OfficialLinkContext;
  labels: Pick<ProgramDossierLabels, "partnerSite" | "publicPortal" | "externalSite">;
}) {
  const link = resolveShowableLink(href, linkContext);
  if (!link) return null;

  return (
    <span className="inline-flex shrink-0 flex-col px-1">
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-terracotta-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
      >
        {label}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <LinkHost link={link} labels={labels} className="-mt-2 pb-1" />
    </span>
  );
}

export function DossierSectionTitle({
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

export function EvidenceLink({
  evidence,
  label,
}: {
  evidence?: AdmissionQuoteEvidence;
  label: string;
}) {
  const link = resolveShowableLink(evidence?.url);
  if (!evidence || !link) return null;

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-8 shrink-0 items-center gap-1 text-xs font-bold text-[var(--editorial-terracotta-ink)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function SourceMeta({
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
  const link = resolveShowableLink(evidence.url);

  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-[var(--editorial-muted)]">
      {link ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold transition hover:text-[var(--editorial-ink)]"
        >
          {sourceLabel}: {sourceName}
        </a>
      ) : (
        <span className="font-semibold">
          {sourceLabel}: {sourceName}
        </span>
      )}
      {formattedDate ? (
        <>
          <span aria-hidden="true">·</span>
          <time dateTime={evidence.retrievedAt}>{formattedDate}</time>
        </>
      ) : null}
    </p>
  );
}

export function ProfileFact({
  label,
  value,
  evidence,
  viewSourceLabel,
  readFullLabel,
  collapseLabel,
}: {
  label: string;
  value: string;
  evidence?: AdmissionQuoteEvidence;
  viewSourceLabel: string;
  readFullLabel: string;
  collapseLabel: string;
}) {
  return (
    <div className="min-w-0 border-t border-[var(--editorial-border)] py-4">
      <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
        {label}
      </dt>
      {/* Kaynak linki <dd> icinde durur: <dl> altindaki sarmalayici yalnizca dt+dd icermeli
          (axe definition-list). Gorunum degismez, link yine deger blogunun altinda. */}
      <dd className="mt-2 text-[13px] font-semibold leading-5 text-[var(--editorial-ink)] sm:text-sm sm:leading-6">
        <ClampedValue
          value={cleanAdmissionDisplayValue(value)}
          readFullLabel={readFullLabel}
          collapseLabel={collapseLabel}
        />
        <EvidenceLink evidence={evidence} label={viewSourceLabel} />
      </dd>
    </div>
  );
}
