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

/* Kaynakli kabul metinlerinin sunum bicimi (2026-09-17 program detay turu).
   Kural: bilgi eklenmez, cikarilmaz, yeniden yazilmaz. Yalnizca satir/madde
   bolme, etiket ayirma ve ISO tarih bicimlendirmesi yapilir. */

export interface AdmissionSegment {
  label?: string;
  text: string;
}

const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

const ADMISSION_TYPE_TR: Record<string, string> = {
  "open access": "Serbest giriş",
  "open access with entry requirements examination":
    "Giriş şartları incelemesiyle serbest giriş",
  "open with entry requirements examination":
    "Giriş şartları incelemesiyle serbest giriş",
  "selection call": "Seçme çağrısı",
  "selection call / academic evaluation":
    "Seçme çağrısı / akademik değerlendirme",
  "restricted access": "Kontenjanlı giriş",
  tolc: "TOLC sınavı",
  "document evaluation": "Belge değerlendirmesi",
};

const SEGMENT_LABEL_PATTERN = /^([A-Z][A-Za-z0-9 /&'()-]{2,70}):\s+(.+)$/;
// Madde basi gibi duran parca: buyuk harf, rakam, madde isareti ya da koseli
// parantez ile baslar. Kucuk harfle baslayan parca cumle ortasidir; boyle bir
// parca varsa satir bolunmez (yarim cumle maddesi olusmasin).
const SEGMENT_START_PATTERN = /^[A-Z0-9•\-[(]/;
const MIN_SEGMENT_LENGTH = 25;
const MIN_SEGMENT_COUNT = 3;
const DEGREE_CLASS_CODE_PATTERN =
  /\b(LMG\s*\/\s*\d{1,2}|LM\s*-?\s*\d{1,2}|L\s*-?\s*\d{1,2})\b/gi;

// cleanAdmissionDisplayValue tum bosluklari teke indirir; bu surum satir
// sonlarini korur, cunku madde bolmesi onlara dayanir.
export function cleanAdmissionTextPreservingBreaks(value: string) {
  return value
    .replace(/\s*\[uncertain\]\s*/gi, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

// Yalnizca ISO tarihleri (2026-01-14) okunur hale getirir. Ingilizce ay adlari
// bilincli olarak cevrilmez: cumlenin kalani Ingilizce oldugu icin karisik
// metin olusmasin (Kerem karari, 17 Eylul 2026).
export function localizeAdmissionDates(value: string, language: "tr" | "en") {
  if (language !== "tr") return value;

  return value.replace(
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    (match, year: string, month: string, day: string) => {
      const monthIndex = Number(month) - 1;
      const dayNumber = Number(day);
      if (monthIndex < 0 || monthIndex > 11) return match;
      if (dayNumber < 1 || dayNumber > 31) return match;
      return `${dayNumber} ${TR_MONTHS[monthIndex]} ${year}`;
    },
  );
}

export function splitAdmissionSegments(value: string): AdmissionSegment[] {
  const cleaned = cleanAdmissionTextPreservingBreaks(value);
  if (cleaned.length === 0) return [{ text: "" }];

  const pieces = cleaned.split("\n").flatMap((line) => {
    const parts = line
      .split(/;\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    // Kisa parca yalnizca "Etiket: deger" biciminde kabul edilir; boylece
    // "Opening Date: 2026-01-15" bolunurken cumle parcalari bolunmez.
    const splittable =
      parts.length >= MIN_SEGMENT_COUNT &&
      parts.every(
        (part) =>
          SEGMENT_START_PATTERN.test(part) &&
          (part.length >= MIN_SEGMENT_LENGTH ||
            SEGMENT_LABEL_PATTERN.test(part)),
      );

    return splittable ? parts : [line];
  });

  if (pieces.length < 2) return [{ text: pieces[0] ?? "" }];

  return pieces.map((piece) => {
    const match = SEGMENT_LABEL_PATTERN.exec(piece);
    if (!match) return { text: piece };
    return { label: match[1], text: match[2] };
  });
}

export function localizeAdmissionType(value: string, language: "tr" | "en") {
  if (language !== "tr") return value;
  return ADMISSION_TYPE_TR[value.trim().toLowerCase()] ?? value;
}

export function extractDegreeClassCodes(value: string | undefined) {
  if (!value) return [];

  const codes = [...value.matchAll(DEGREE_CLASS_CODE_PATTERN)].map((match) => {
    const raw = match[1].replace(/\s+/g, "").toUpperCase();
    if (raw.startsWith("LMG/")) return raw;
    if (raw.startsWith("LM")) return `LM-${raw.replace(/^LM-?/, "")}`;
    return `L-${raw.replace(/^L-?/, "")}`;
  });

  return [...new Set(codes)];
}
