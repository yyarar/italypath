import type { University } from "@/types/universities";
import { getCityGuideName } from "@/lib/cities/normalization";
import { CITY_TO_REGION } from "@/lib/hub/recommendations";
import { SCHOLARSHIP_REGION_MAP } from "@/lib/scholarships/regions";

export interface RelatedUniversityLink {
  id: number;
  name: string;
  programCount: number;
}

export interface RelatedLinksData {
  city: string;
  cityGuide: { name: string; href: string } | null;
  regionScholarships: { name: string; href: string } | null;
  sameCityUniversities: RelatedUniversityLink[];
}

const SAME_CITY_LIMIT = 6;

function normalizeCity(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Ic baglanti agi, 1. faz (SEO_AUDIT.md §22): ayni sehirdeki universiteler, sehir rehberi ve bolge
// burslari. Sunucu tarafinda hafif dizinle hesaplanir, client leaf'e prop olarak gecer; yeni URL yok.
export function buildRelatedLinks(university: University, directory: University[]): RelatedLinksData {
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
  };
}
