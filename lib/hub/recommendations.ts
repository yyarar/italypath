import type { Department, University } from "@/types/universities";
import { CURATED_CITIES } from "@/lib/cities/data";
import type { ProfileCityPref, ProfileField, UserProfile } from "@/lib/hub/profile";
import { SCHOLARSHIP_REGION_MAP } from "@/lib/scholarships/regions";
import type { CityDetail } from "@/types/cities";
import type { RegionSlug, ScholarshipRegionRecord } from "@/types/scholarships";

export interface ProgramMatch {
  university: University;
  department: Department;
  score: number;
  reasons: string[];
}

export type RelaxationLevel = "none" | "field-partial" | "level-only";

export interface RecommendationResult {
  matches: ProgramMatch[];
  relaxed: RelaxationLevel;
}

export const FIELD_KEYWORDS: Record<ProfileField, string[]> = {
  "engineering-tech": [
    "engineering",
    "computer",
    "software",
    "informatics",
    "information technology",
    "information systems",
    "mechanical",
    "electronic",
    "electrical",
    "aerospace",
    "automation",
    "robotics",
    "mechatronic",
    "telecommunication",
    "cybersecurity",
    "artificial intelligence",
    "data science",
    "data analytics",
    "energy",
    "civil",
    "materials",
    "industrial",
    "digital",
    "ict",
    "ingegneria",
    "informatica",
  ],
  "medicine-health": [
    "medicine",
    "medical",
    "surgery",
    "dentistry",
    "dental",
    "pharmacy",
    "nursing",
    "physiotherapy",
    "biomedical",
    "biotechnolog",
    "health",
    "veterinary",
    "nutrition",
    "rehabilitation",
    "medicina",
    "odontoiatria",
    "infermieristica",
    "farmacia",
  ],
  "business-economics": [
    "business",
    "economics",
    "management",
    "finance",
    "accounting",
    "marketing",
    "administration",
    "banking",
    "tourism",
    "entrepreneurship",
    "innovation",
    "economia",
    "gestione",
    "amministrazione",
  ],
  "design-architecture": [
    "design",
    "architecture",
    "architectural",
    "urban planning",
    "planning",
    "interior",
    "product design",
    "landscape",
    "architettura",
    "disegno",
  ],
  "natural-sciences": [
    "physics",
    "chemistry",
    "biology",
    "mathematics",
    "statistics",
    "geology",
    "astronomy",
    "environmental",
    "earth",
    "natural science",
    "agriculture",
    "food",
    "animal",
    "plant",
    "molecular",
    "marine",
    "fisica",
    "chimica",
    "biologia",
    "matematica",
    "scienze",
  ],
  "social-humanities": [
    "psychology",
    "sociology",
    "philosophy",
    "history",
    "literature",
    "language",
    "linguistics",
    "education",
    "communication",
    "anthropology",
    "international relations",
    "global",
    "development",
    "media",
    "cultural",
    "heritage",
    "humanities",
    "social",
    "studies",
    "filosofia",
    "storia",
    "lettere",
    "lingue",
    "psicologia",
    "scienze politiche",
  ],
  "arts-fashion": [
    "art",
    "arts",
    "fashion",
    "music",
    "cinema",
    "film",
    "theatre",
    "visual",
    "fine arts",
    "conservation",
    "heritage",
    "performing",
    "moda",
    "arte",
    "musica",
    "spettacolo",
  ],
  "law-politics": [
    "law",
    "legal",
    "political science",
    "politics",
    "policy",
    "governance",
    "international law",
    "security",
    "giurisprudenza",
    "diritto",
    "politiche",
  ],
};

export const FIELD_CATEGORIES = FIELD_KEYWORDS;

export const CITY_GROUPS: Record<Exclude<ProfileCityPref, "any">, string[]> = {
  "big-city": ["Milano", "Roma", "Torino", "Napoli", "Bologna"],
  "student-city": [
    "Bologna",
    "Padova",
    "Pavia",
    "Pisa",
    "Siena",
    "Trento",
    "Parma",
    "Ferrara",
    "Ancona",
  ],
};

export const CITY_TO_REGION: Record<string, RegionSlug> = {
  milano: "lombardia",
  bergamo: "lombardia",
  brescia: "lombardia",
  como: "lombardia",
  cremona: "lombardia",
  pavia: "lombardia",
  varese: "lombardia",
  roma: "lazio",
  torino: "piemonte",
  napoli: "campania",
  bologna: "emilia-romagna",
  cesena: "emilia-romagna",
  ferrara: "emilia-romagna",
  forli: "emilia-romagna",
  modena: "emilia-romagna",
  parma: "emilia-romagna",
  piacenza: "emilia-romagna",
  ravenna: "emilia-romagna",
  "reggio emilia": "emilia-romagna",
  rimini: "emilia-romagna",
  padova: "veneto",
  venezia: "veneto",
  venedik: "veneto",
  verona: "veneto",
  pisa: "toscana",
  siena: "toscana",
  firenze: "toscana",
  floransa: "toscana",
  trento: "trentino-alto-adige-suedtirol",
  bolzano: "trentino-alto-adige-suedtirol",
  trieste: "friuli-venezia-giulia",
  udine: "friuli-venezia-giulia",
  bari: "puglia",
  lecce: "puglia",
  ancona: "marche",
  camerino: "marche",
  macerata: "marche",
  urbino: "marche",
  genova: "liguria",
  cenova: "liguria",
  perugia: "umbria",
  "l'aquila": "abruzzo",
  aquila: "abruzzo",
  chieti: "abruzzo",
  teramo: "abruzzo",
  pescara: "abruzzo",
  cagliari: "sardegna",
  sassari: "sardegna",
  palermo: "sicilia",
  catania: "sicilia",
  messina: "sicilia",
  calabria: "calabria",
  catanzaro: "calabria",
  cosenza: "calabria",
  salerno: "campania",
};

const LEVEL_MAP: Record<NonNullable<UserProfile["level"]>, Department["level"][]> = {
  bachelor: ["bachelor", "single-cycle"],
  master: ["master"],
};

const MIN_MATCHES = 3;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesLevel(department: Department, profile: UserProfile): boolean {
  if (!profile.level) return true;
  return LEVEL_MAP[profile.level].includes(department.level);
}

function fieldScore(
  name: string,
  fields: ProfileField[],
  allowPartial: boolean,
): { score: number; reasons: string[] } {
  const lower = normalizeText(name);
  let best = 0;
  const reasons = new Set<string>();

  for (const field of fields) {
    for (const keyword of FIELD_KEYWORDS[field]) {
      const kw = normalizeText(keyword);
      const wordRegex = new RegExp(`(^|[^a-z])${escapeRegExp(kw)}([^a-z]|$)`);
      if (wordRegex.test(lower)) {
        best = Math.max(best, 3);
        reasons.add(field);
      } else if (allowPartial && lower.includes(kw)) {
        best = Math.max(best, 1);
        reasons.add(field);
      }
    }
  }

  return { score: best, reasons: Array.from(reasons) };
}

function cityBonus(
  university: University,
  cityPref: UserProfile["cityPref"],
): { score: number; reason: string | null } {
  if (!cityPref || cityPref === "any") return { score: 0, reason: null };
  const city = normalizeText(university.city);
  const inGroup = CITY_GROUPS[cityPref].some((groupCity) => normalizeText(groupCity) === city);
  return inGroup ? { score: 1, reason: "city" } : { score: 0, reason: null };
}

function collectMatches(
  universities: University[],
  profile: UserProfile,
  mode: RelaxationLevel,
): ProgramMatch[] {
  const matches: ProgramMatch[] = [];

  for (const university of universities) {
    for (const department of university.departments) {
      if (!matchesLevel(department, profile)) continue;

      let score = 0;
      const reasons: string[] = [];

      if (profile.fields.length > 0 && mode !== "level-only") {
        const field = fieldScore(
          department.name,
          profile.fields,
          mode === "field-partial",
        );
        if (field.score === 0) continue;
        score += field.score;
        reasons.push(...field.reasons);
      }

      const city = cityBonus(university, profile.cityPref);
      score += city.score;
      if (city.reason) reasons.push(city.reason);

      if (department.admissionDetails) {
        score += 0.5;
        reasons.push("details");
      }

      matches.push({ university, department, score, reasons });
    }
  }

  return matches.sort(
    (a, b) =>
      b.score - a.score ||
      a.university.name.localeCompare(b.university.name) ||
      a.department.name.localeCompare(b.department.name),
  );
}

export function matchPrograms(
  profile: UserProfile,
  universities: University[],
): RecommendationResult {
  let matches = collectMatches(universities, profile, "none");
  if (matches.length >= MIN_MATCHES) return { matches, relaxed: "none" };

  matches = collectMatches(universities, profile, "field-partial");
  if (matches.length >= MIN_MATCHES) return { matches, relaxed: "field-partial" };

  matches = collectMatches(universities, profile, "level-only");
  return { matches, relaxed: "level-only" };
}

export function pickScholarshipRegion(
  matches: ProgramMatch[],
): ScholarshipRegionRecord | null {
  for (const match of matches) {
    const slug = CITY_TO_REGION[normalizeText(match.university.city).trim()];
    if (slug && SCHOLARSHIP_REGION_MAP[slug]) {
      return SCHOLARSHIP_REGION_MAP[slug];
    }
  }
  return null;
}

export function pickCities(
  matches: ProgramMatch[],
  cityPref: UserProfile["cityPref"],
  limit = 3,
): CityDetail[] {
  const picked: CityDetail[] = [];
  const seen = new Set<string>();

  const tryAdd = (cityName: string) => {
    const normalizedCity = normalizeText(cityName);
    const detail = CURATED_CITIES.find(
      (city) =>
        normalizeText(city.name) === normalizedCity ||
        normalizeText(city.nameEn) === normalizedCity,
    );
    if (detail && !seen.has(detail.slug)) {
      seen.add(detail.slug);
      picked.push(detail);
    }
  };

  for (const match of matches) {
    if (picked.length >= limit) return picked;
    tryAdd(match.university.city);
  }

  if (cityPref && cityPref !== "any") {
    for (const cityName of CITY_GROUPS[cityPref]) {
      if (picked.length >= limit) return picked;
      tryAdd(cityName);
    }
  }

  for (const city of CURATED_CITIES) {
    if (picked.length >= limit) return picked;
    tryAdd(city.name);
  }

  return picked;
}
