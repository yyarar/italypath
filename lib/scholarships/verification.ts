import type { Language } from '@/types';
import type { ScholarshipRegionRecord } from '@/types/scholarships';

// Burs dogrulama notu (docs/STATUS.md #33, 2026-09-26): ana sayfa burs CTA notu ve /scholarships giris
// notu sabit tarih tasimaz; bolge sayilari, en yeni dogrulama tarihleri ve akademik yil SCHOLARSHIP_REGIONS
// kayitlarindan turetilir. Ceviri metinleri {fullCount} {fullDate} {academicYear} {registryCount}
// {registryDate} yer tutucularini tasir; fillScholarshipVerificationNote bunlari doldurur.
//
// Bu dosya bolge verisini import ETMEZ: istemci bileseni (components/ScholarshipsSection.tsx) yalniz
// bicimlendirmeyi alir, ozet sunucuda hesaplanip prop olarak gecer (app/page.tsx). Veriyi zaten tasiyan
// ScholarshipsExplorer ozeti kendi icinde uretir. Guard: scripts/check-scholarships-editorial-atlas.mjs.

export type ScholarshipVerificationSummary = {
  /** Resmi bando ile dogrulanmis (verified-full) bolge sayisi. */
  fullCount: number;
  /** verified-full bolgelerin en yeni lastVerifiedAt degeri (YYYY-MM-DD) veya null. */
  fullLatestDate: string | null;
  /** verified-full bolgelerin en yeni currentAcademicYear degeri (orn. "2026/2027") veya null. */
  fullAcademicYear: string | null;
  /** Yalniz kurum dizini (registry-only) bolge sayisi. */
  registryCount: number;
  /** registry-only bolgelerin en yeni lastVerifiedAt degeri (YYYY-MM-DD) veya null. */
  registryLatestDate: string | null;
};

type VerificationFields = Pick<
  ScholarshipRegionRecord,
  'completeness' | 'lastVerifiedAt' | 'currentAcademicYear'
>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MISSING_VALUE = '—';

function newest(current: string | null, candidate: string | null) {
  if (!candidate) return current;
  if (!current) return candidate;
  return candidate > current ? candidate : current;
}

export function summarizeScholarshipVerification(
  regions: readonly VerificationFields[]
): ScholarshipVerificationSummary {
  const summary: ScholarshipVerificationSummary = {
    fullCount: 0,
    fullLatestDate: null,
    fullAcademicYear: null,
    registryCount: 0,
    registryLatestDate: null,
  };

  for (const region of regions) {
    const date =
      region.lastVerifiedAt && ISO_DATE.test(region.lastVerifiedAt) ? region.lastVerifiedAt : null;

    if (region.completeness === 'verified-full') {
      summary.fullCount += 1;
      summary.fullLatestDate = newest(summary.fullLatestDate, date);
      summary.fullAcademicYear = newest(summary.fullAcademicYear, region.currentAcademicYear);
    } else {
      summary.registryCount += 1;
      summary.registryLatestDate = newest(summary.registryLatestDate, date);
    }
  }

  return summary;
}

// YYYY-MM-DD -> uzun tarih ("24 Eylül 2026" / "September 24, 2026"). Bolge dosyasi panelindeki
// "Son doğrulama tarihi" ile ayni bicim; UTC sabitlenir ki sunucu ve tarayici ayni gunu yazsin.
export function formatScholarshipDate(value: string | null, language: Language): string | null {
  if (!value) return null;
  if (!ISO_DATE.test(value)) return value;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

// "2026/2027" -> "2026/27" (not metninde kisa yazim); baska bicim oldugu gibi kalir.
export function formatAcademicYearShort(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})\/(\d{4})$/.exec(value);
  if (!match) return value;
  return `${match[1]}/${match[2].slice(2)}`;
}

export function fillScholarshipVerificationNote(
  template: string,
  summary: ScholarshipVerificationSummary,
  language: Language
): string {
  return template
    .replace('{fullCount}', String(summary.fullCount))
    .replace('{fullDate}', formatScholarshipDate(summary.fullLatestDate, language) ?? MISSING_VALUE)
    .replace('{academicYear}', formatAcademicYearShort(summary.fullAcademicYear) ?? MISSING_VALUE)
    .replace('{registryCount}', String(summary.registryCount))
    .replace(
      '{registryDate}',
      formatScholarshipDate(summary.registryLatestDate, language) ?? MISSING_VALUE
    );
}
