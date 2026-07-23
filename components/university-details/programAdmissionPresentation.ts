import type {
  ProgramAdmissionDetails,
  ProgramSourceQuote,
} from "@/types/universities";

export const ADMISSION_FIELD_KEYS = [
  "officialProgramUrl",
  "officialCallUrl",
  "tuitionOrFeesLink",
  "campus",
  "degreeClass",
  "admissionType",
  "rawTeachingLanguage",
  "applicationDeadlineEu",
  "applicationDeadlineNonEu",
  "academicRequirements",
  "languageRequirements",
  "requiredDocuments",
  "entryExamOrTest",
] as const;

export type AdmissionFieldKey = (typeof ADMISSION_FIELD_KEYS)[number];

export interface AdmissionQuoteEvidence {
  id: string;
  url: string;
  quote: string;
  retrievedAt: string;
  fields: AdmissionFieldKey[];
}

export interface AdmissionSourceGroup {
  url: string;
  latestRetrievedAt?: string;
  evidence: AdmissionQuoteEvidence[];
}

const FIELD_REF_ALIASES: Record<string, AdmissionFieldKey> = {
  official_program_url: "officialProgramUrl",
  official_call_url: "officialCallUrl",
  tuition_or_fees_link: "tuitionOrFeesLink",
  campus: "campus",
  degree_class: "degreeClass",
  admission_type: "admissionType",
  teaching_language: "rawTeachingLanguage",
  raw_teaching_language: "rawTeachingLanguage",
  application_deadline_eu: "applicationDeadlineEu",
  application_deadline_non_eu: "applicationDeadlineNonEu",
  academic_requirements: "academicRequirements",
  language_requirements: "languageRequirements",
  required_documents: "requiredDocuments",
  entry_exam_or_test: "entryExamOrTest",
};

function normalizeFieldRef(ref: string) {
  return ref
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/[\s-]+/g, "_");
}

function fieldFromNormalizedRef(ref: string): AdmissionFieldKey | undefined {
  const directMatch = FIELD_REF_ALIASES[ref];
  if (directMatch) return directMatch;

  const segments = ref.split(".").filter(Boolean);
  for (const segment of segments) {
    const segmentMatch = FIELD_REF_ALIASES[segment];
    if (segmentMatch) return segmentMatch;
  }

  return undefined;
}

export function canonicalizeAdmissionFieldRefs(
  refs: string[],
): AdmissionFieldKey[] {
  const fields = refs.flatMap((ref) =>
    ref.split(",").flatMap((fragment) => {
      const field = fieldFromNormalizedRef(normalizeFieldRef(fragment));
      return field ? [field] : [];
    }),
  );

  return [...new Set(fields)];
}

export function cleanAdmissionDisplayValue(value: string) {
  return value.replace(/\s*\[uncertain\]\s*/gi, " ").replace(/\s+/g, " ").trim();
}

export function buildAdmissionEvidence(
  quotes: ProgramSourceQuote[],
): AdmissionQuoteEvidence[] {
  return quotes.map((quote, index) => ({
    id: `admission-evidence-${index + 1}`,
    url: quote.url,
    quote: quote.quote,
    retrievedAt: quote.retrieved_at,
    fields: canonicalizeAdmissionFieldRefs(quote.field_refs),
  }));
}

export function normalizeAdmissionSourceUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    const pathname =
      parsed.pathname.length > 1
        ? parsed.pathname.replace(/\/+$/, "")
        : parsed.pathname;
    return `${parsed.origin}${pathname}${parsed.search}`;
  } catch {
    return url.trim().replace(/\/+$/, "");
  }
}

export function parseAdmissionSourceDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function latestAdmissionSourceDate(values: string[]) {
  return values.reduce<string | undefined>((latest, candidate) => {
    const candidateDate = parseAdmissionSourceDate(candidate);
    if (!candidateDate) return latest;
    if (!latest) return candidate;

    const latestDate = parseAdmissionSourceDate(latest);
    return !latestDate || candidateDate > latestDate ? candidate : latest;
  }, undefined);
}

export function groupAdmissionEvidenceByUrl(
  evidence: AdmissionQuoteEvidence[],
): AdmissionSourceGroup[] {
  const groups = new Map<string, AdmissionSourceGroup>();

  for (const item of evidence) {
    const urlKey = normalizeAdmissionSourceUrl(item.url);
    const current = groups.get(urlKey);

    if (current) {
      current.evidence.push(item);
      current.latestRetrievedAt = latestAdmissionSourceDate([
        ...(current.latestRetrievedAt ? [current.latestRetrievedAt] : []),
        item.retrievedAt,
      ]);
      continue;
    }

    groups.set(urlKey, {
      url: item.url,
      latestRetrievedAt: latestAdmissionSourceDate([item.retrievedAt]),
      evidence: [item],
    });
  }

  return [...groups.values()];
}

export function getAdmissionFieldEvidence(
  evidence: AdmissionQuoteEvidence[],
  field: AdmissionFieldKey,
) {
  return evidence.filter((item) => item.fields.includes(field));
}

export function admissionFieldIsUncertain(
  details: ProgramAdmissionDetails,
  field: AdmissionFieldKey,
) {
  return canonicalizeAdmissionFieldRefs(details.uncertain).includes(field);
}
