import type { Department, University } from "@/types/universities";
import { getCityGuideName } from "@/lib/cities/normalization";
import { CITY_TO_REGION } from "@/lib/hub/recommendations";
import { SCHOLARSHIP_REGION_MAP } from "@/lib/scholarships/regions";
import { hasAdmissionDossier } from "@/lib/admissionPresence";

export interface RelatedUniversityLink {
  id: number;
  name: string;
  programCount: number;
}

export interface SameFieldProgramLink {
  universityId: number;
  universityName: string;
  programName: string;
  href: string;
  code: string;
}

export interface RelatedLinksData {
  city: string;
  cityGuide: { name: string; href: string } | null;
  regionScholarships: { name: string; href: string } | null;
  sameCityUniversities: RelatedUniversityLink[];
  /** Ayni resmi bolum sinifi koduna sahip, BASKA okullardaki programlar (okul basina en fazla 1). */
  sameFieldPrograms: SameFieldProgramLink[];
}

const SAME_CITY_LIMIT = 6;
const SAME_FIELD_LIMIT = 6;

// "Ayni alanda diger universiteler": eslesme resmi Italyan bolum sinifi koduyla yapilir
// (ör. LM-32). Kodu olmayan programlarda bolum gosterilmez; anahtar kelime tahmini yapilmaz.
function buildSameFieldPrograms(
  university: University,
  directory: University[],
  department?: Department,
): SameFieldProgramLink[] {
  const codes = new Set(department?.degreeClassCodes ?? []);
  if (codes.size === 0) return [];

  const matches = directory
    .filter((entry) => entry.id !== university.id)
    .flatMap((entry) =>
      entry.departments.flatMap((dept) => {
        const code = (dept.degreeClassCodes ?? []).find((value) => codes.has(value));
        if (!code) return [];
        return [
          {
            universityId: entry.id,
            universityName: entry.name,
            programName: dept.name,
            href: `/universities/${entry.id}/departments/${dept.slug}`,
            code,
            hasDossier: hasAdmissionDossier(dept),
            programCount: entry.departments.length,
          },
        ];
      }),
    )
    .sort(
      (a, b) =>
        Number(b.hasDossier) - Number(a.hasDossier) ||
        b.programCount - a.programCount ||
        a.universityName.localeCompare(b.universityName, "tr"),
    );

  const seenUniversities = new Set<number>();
  const picked: SameFieldProgramLink[] = [];

  for (const match of matches) {
    if (seenUniversities.has(match.universityId)) continue;
    seenUniversities.add(match.universityId);
    picked.push({
      universityId: match.universityId,
      universityName: match.universityName,
      programName: match.programName,
      href: match.href,
      code: match.code,
    });
    if (picked.length >= SAME_FIELD_LIMIT) break;
  }

  return picked;
}

function normalizeCity(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Ic baglanti agi, 1. faz (SEO_AUDIT.md §22): ayni sehirdeki universiteler, sehir rehberi ve bolge
// burslari. Sunucu tarafinda hafif dizinle hesaplanir, client leaf'e prop olarak gecer; yeni URL yok.
export function buildRelatedLinks(
  university: University,
  directory: University[],
  department?: Department,
): RelatedLinksData {
  const guideName = getCityGuideName(university.city);
  const cityLabel = guideName ?? university.city;
  const cityKey = normalizeCity(cityLabel);
  const regionSlug = CITY_TO_REGION[cityKey];
  const region = regionSlug ? SCHOLARSHIP_REGION_MAP[regionSlug] : undefined;

  const sameCityUniversities = directory
    .filter(
      (entry) =>
        entry.id !== university.id &&
        normalizeCity(getCityGuideName(entry.city) ?? entry.city) === cityKey
    )
    .map((entry) => ({ id: entry.id, name: entry.name, programCount: entry.departments.length }))
    .sort((a, b) => b.programCount - a.programCount || a.name.localeCompare(b.name))
    .slice(0, SAME_CITY_LIMIT);

  return {
    city: cityLabel,
    cityGuide: guideName
      ? { name: guideName, href: `/cities?city=${encodeURIComponent(guideName)}` }
      : null,
    regionScholarships: region
      ? { name: region.regionName, href: `/scholarships?region=${region.regionSlug}` }
      : null,
    sameCityUniversities,
    sameFieldPrograms: buildSameFieldPrograms(university, directory, department),
  };
}
