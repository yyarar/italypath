import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  DEFAULT_DEPARTMENT_DURATION_YEARS,
  DEFAULT_DEPARTMENT_LANGUAGES,
  DEFAULT_DEPARTMENT_LEVEL,
  DEFAULT_IMAGE,
  universitiesData as LOCAL_UNIVERSITIES,
  type Department,
  type ProgramDurationYears,
  type ProgramLanguage,
  type ProgramLevel,
  type University,
} from "@/app/data";
import {
  COMMUNITY_LINKS,
  type CommunityCategory,
  type CommunityLink,
  type CommunityPlatform,
  type CommunitySizeHint,
} from "@/lib/community-links";
import {
  SCHOLARSHIP_DEFAULT_REGION,
  SCHOLARSHIP_REGIONS,
} from "@/lib/scholarships/regions";
import type {
  ManagingBody,
  RegionDataCompleteness,
  RegionSlug,
  ScholarshipRegionRecord,
} from "@/types/scholarships";

const CONTENT_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

interface UniversityRow {
  id: number;
  sort_order: number | null;
  name: string;
  city: string;
  type: string;
  fee: string;
  image: string | null;
  description: string;
  description_en: string | null;
  website: string;
  features: string[] | null;
  features_en: string[] | null;
}

interface DepartmentRow {
  university_id: number;
  sort_order: number | null;
  name: string;
  slug: string;
  languages: string[] | null;
  duration_years: number | null;
  level: string | null;
}

interface CommunityRow {
  id: string;
  sort_order: number | null;
  name: string;
  city: string | null;
  region: string | null;
  platform: string;
  category: string;
  audience: string;
  description: string;
  url: string;
  editorial_note: string | null;
  size_hint: string | null;
  status: string;
  verification_source: string;
  last_checked_at: string;
}

interface ScholarshipRow {
  region_slug: string;
  sort_order: number | null;
  region_name: string;
  is_default: boolean | null;
  managing_bodies: unknown;
  current_academic_year: string | null;
  application_window: string | null;
  isee_limit: string | null;
  ispe_limit: string | null;
  benefits: string[] | null;
  housing_support: string | null;
  canteen_support: string | null;
  international_student_notes: string | null;
  official_source_urls: string[] | null;
  last_verified_at: string | null;
  status_note: string;
  completeness: string;
}

export interface ScholarshipsDataset {
  defaultRegionSlug: RegionSlug;
  regions: ScholarshipRegionRecord[];
}

const scholarshipSlugSet = new Set<RegionSlug>(
  SCHOLARSHIP_REGIONS.map((region) => region.regionSlug)
);

let universitiesCache: CacheEntry<University[]> | null = null;
let communityLinksCache: CacheEntry<CommunityLink[]> | null = null;
let scholarshipsCache: CacheEntry<ScholarshipsDataset> | null = null;

function getSupabaseContentClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getCachedValue<T>(cache: CacheEntry<T> | null): T | null {
  if (!cache) return null;
  if (cache.expiresAt <= Date.now()) return null;
  return cache.value;
}

function setCache<T>(value: T): CacheEntry<T> {
  return {
    value,
    expiresAt: Date.now() + CONTENT_CACHE_TTL_MS,
  };
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseProgramLanguages(value: unknown): ProgramLanguage[] {
  if (!Array.isArray(value)) return [...DEFAULT_DEPARTMENT_LANGUAGES];

  const unique = new Set<ProgramLanguage>();
  for (const item of value) {
    if (item === "en" || item === "it") {
      unique.add(item);
    }
  }

  return unique.size > 0 ? [...unique] : [...DEFAULT_DEPARTMENT_LANGUAGES];
}

function parseProgramDuration(value: unknown): ProgramDurationYears {
  if (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6
  ) {
    return value;
  }

  return DEFAULT_DEPARTMENT_DURATION_YEARS;
}

function parseProgramLevel(value: unknown): ProgramLevel {
  return value === "master" ? "master" : DEFAULT_DEPARTMENT_LEVEL;
}

function isCommunityPlatform(value: unknown): value is CommunityPlatform {
  return value === "whatsapp" || value === "telegram" || value === "facebook";
}

function isCommunityCategory(value: unknown): value is CommunityCategory {
  return (
    value === "university" ||
    value === "housing" ||
    value === "scholarship" ||
    value === "admissions" ||
    value === "social" ||
    value === "general"
  );
}

function isCommunitySizeHint(value: unknown): value is CommunitySizeHint {
  return value === "small" || value === "medium" || value === "large";
}

function isCommunityStatus(
  value: unknown
): value is CommunityLink["status"] {
  return value === "active" || value === "limited" || value === "unverified";
}

function isVerificationSource(
  value: unknown
): value is CommunityLink["verificationSource"] {
  return value === "user-confirmed" || value === "editor-reviewed";
}

function isRegionSlugValue(value: unknown): value is RegionSlug {
  return typeof value === "string" && scholarshipSlugSet.has(value as RegionSlug);
}

function parseCompleteness(value: unknown): RegionDataCompleteness {
  return value === "verified-full" ? "verified-full" : "registry-only";
}

function parseManagingBodies(value: unknown): ManagingBody[] {
  if (!Array.isArray(value)) return [];

  const bodies: ManagingBody[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const name = normalizeString((item as { name?: unknown }).name);
    const officialUrl = normalizeString((item as { officialUrl?: unknown }).officialUrl);

    if (!name || !officialUrl) continue;
    bodies.push({ name, officialUrl });
  }

  return bodies;
}

function normalizeDateString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

function fallbackUniversities(): University[] {
  return LOCAL_UNIVERSITIES;
}

function fallbackCommunityLinks(): CommunityLink[] {
  return COMMUNITY_LINKS;
}

function fallbackScholarships(): ScholarshipsDataset {
  return {
    defaultRegionSlug: SCHOLARSHIP_DEFAULT_REGION,
    regions: SCHOLARSHIP_REGIONS,
  };
}

async function fetchUniversitiesFromSupabase(): Promise<University[]> {
  const client = getSupabaseContentClient();
  if (!client) return [];

  const [universitiesResult, departmentsResult] = await Promise.all([
    client
      .from("universities")
      .select(
        "id, sort_order, name, city, type, fee, image, description, description_en, website, features, features_en"
      )
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    client
      .from("university_departments")
      .select("university_id, sort_order, name, slug, languages, duration_years, level")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (universitiesResult.error) throw universitiesResult.error;
  if (departmentsResult.error) throw departmentsResult.error;

  const universityRows = (universitiesResult.data ?? []) as UniversityRow[];
  const departmentRows = (departmentsResult.data ?? []) as DepartmentRow[];

  if (universityRows.length === 0) return [];

  const departmentsByUniversity = new Map<number, Department[]>();
  for (const departmentRow of departmentRows) {
    const name = normalizeString(departmentRow.name);
    const slug = normalizeString(departmentRow.slug);
    if (!name || !slug) continue;

    const department: Department = {
      name,
      slug,
      languages: parseProgramLanguages(departmentRow.languages),
      durationYears: parseProgramDuration(departmentRow.duration_years),
      level: parseProgramLevel(departmentRow.level),
    };

    const existingDepartments = departmentsByUniversity.get(departmentRow.university_id) ?? [];
    existingDepartments.push(department);
    departmentsByUniversity.set(departmentRow.university_id, existingDepartments);
  }

  const universities: University[] = [];

  for (const row of universityRows) {
    const id = row.id;
    const name = normalizeString(row.name);
    const city = normalizeString(row.city);
    const type = normalizeString(row.type);
    const fee = normalizeString(row.fee);
    const description = normalizeString(row.description);
    const website = normalizeString(row.website);

    if (!name || !city || !type || !fee || !description || !website) {
      continue;
    }

    const features = normalizeStringArray(row.features);
    if (features.length === 0) {
      continue;
    }

    const featuresEn = normalizeStringArray(row.features_en);

    universities.push({
      id,
      name,
      city,
      type,
      fee,
      image: normalizeString(row.image) ?? DEFAULT_IMAGE,
      description,
      description_en: normalizeString(row.description_en) ?? undefined,
      website,
      features,
      features_en: featuresEn.length > 0 ? featuresEn : undefined,
      departments: departmentsByUniversity.get(id) ?? [],
    });
  }

  return universities;
}

async function fetchCommunityLinksFromSupabase(): Promise<CommunityLink[]> {
  const client = getSupabaseContentClient();
  if (!client) return [];

  const { data, error } = await client
    .from("community_links")
    .select(
      "id, sort_order, name, city, region, platform, category, audience, description, url, editorial_note, size_hint, status, verification_source, last_checked_at"
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as CommunityRow[];
  if (rows.length === 0) return [];

  const result: CommunityLink[] = [];

  for (const row of rows) {
    const id = normalizeString(row.id);
    const name = normalizeString(row.name);
    const audience = normalizeString(row.audience);
    const description = normalizeString(row.description);
    const url = normalizeString(row.url);
    const lastCheckedAt = normalizeDateString(row.last_checked_at);

    if (!id || !name || !audience || !description || !url || !lastCheckedAt) {
      continue;
    }

    if (!isCommunityPlatform(row.platform) || !isCommunityCategory(row.category)) {
      continue;
    }

    if (!isCommunityStatus(row.status) || !isVerificationSource(row.verification_source)) {
      continue;
    }

    result.push({
      id,
      name,
      city: normalizeString(row.city),
      region: normalizeString(row.region),
      platform: row.platform,
      category: row.category,
      audience,
      description,
      url,
      editorialNote: normalizeString(row.editorial_note) ?? undefined,
      sizeHint: isCommunitySizeHint(row.size_hint) ? row.size_hint : undefined,
      status: row.status,
      verificationSource: row.verification_source,
      lastCheckedAt,
    });
  }

  return result;
}

async function fetchScholarshipsFromSupabase(): Promise<ScholarshipsDataset | null> {
  const client = getSupabaseContentClient();
  if (!client) return null;

  const { data, error } = await client
    .from("scholarship_regions")
    .select(
      "region_slug, sort_order, region_name, is_default, managing_bodies, current_academic_year, application_window, isee_limit, ispe_limit, benefits, housing_support, canteen_support, international_student_notes, official_source_urls, last_verified_at, status_note, completeness"
    )
    .order("sort_order", { ascending: true })
    .order("region_slug", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as ScholarshipRow[];
  if (rows.length === 0) return null;

  const regions: ScholarshipRegionRecord[] = [];
  let explicitDefaultSlug: RegionSlug | null = null;

  for (const row of rows) {
    if (!isRegionSlugValue(row.region_slug)) {
      continue;
    }

    const regionName = normalizeString(row.region_name);
    const statusNote = normalizeString(row.status_note);
    const managingBodies = parseManagingBodies(row.managing_bodies);

    if (!regionName || !statusNote || managingBodies.length === 0) {
      continue;
    }

    const region: ScholarshipRegionRecord = {
      regionSlug: row.region_slug,
      regionName,
      managingBodies,
      currentAcademicYear: normalizeString(row.current_academic_year),
      applicationWindow: normalizeString(row.application_window),
      iseeLimit: normalizeString(row.isee_limit),
      ispeLimit: normalizeString(row.ispe_limit),
      benefits: normalizeStringArray(row.benefits),
      housingSupport: normalizeString(row.housing_support),
      canteenSupport: normalizeString(row.canteen_support),
      internationalStudentNotes: normalizeString(row.international_student_notes),
      officialSourceUrls: normalizeStringArray(row.official_source_urls),
      lastVerifiedAt: normalizeDateString(row.last_verified_at),
      statusNote,
      completeness: parseCompleteness(row.completeness),
    };

    if (row.is_default === true) {
      explicitDefaultSlug = row.region_slug;
    }

    regions.push(region);
  }

  if (regions.length === 0) {
    return null;
  }

  const fallbackDefault = regions.some((region) => region.regionSlug === SCHOLARSHIP_DEFAULT_REGION)
    ? SCHOLARSHIP_DEFAULT_REGION
    : regions[0].regionSlug;

  return {
    defaultRegionSlug: explicitDefaultSlug ?? fallbackDefault,
    regions,
  };
}

export async function getUniversities(): Promise<University[]> {
  const cached = getCachedValue(universitiesCache);
  if (cached) return cached;

  try {
    const universities = await fetchUniversitiesFromSupabase();
    if (universities.length > 0) {
      universitiesCache = setCache(universities);
      return universities;
    }
  } catch (error) {
    console.error("[contentRepository] Supabase universities fetch failed:", error);
  }

  const fallback = fallbackUniversities();
  universitiesCache = setCache(fallback);
  return fallback;
}

export async function getUniversityById(id: string | number): Promise<University | null> {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId)) return null;

  const universities = await getUniversities();
  return universities.find((university) => university.id === normalizedId) ?? null;
}

export async function getCommunityLinks(): Promise<CommunityLink[]> {
  const cached = getCachedValue(communityLinksCache);
  if (cached) return cached;

  try {
    const communities = await fetchCommunityLinksFromSupabase();
    if (communities.length > 0) {
      communityLinksCache = setCache(communities);
      return communities;
    }
  } catch (error) {
    console.error("[contentRepository] Supabase community links fetch failed:", error);
  }

  const fallback = fallbackCommunityLinks();
  communityLinksCache = setCache(fallback);
  return fallback;
}

export async function getScholarshipsDataset(): Promise<ScholarshipsDataset> {
  const cached = getCachedValue(scholarshipsCache);
  if (cached) return cached;

  try {
    const scholarships = await fetchScholarshipsFromSupabase();
    if (scholarships && scholarships.regions.length > 0) {
      scholarshipsCache = setCache(scholarships);
      return scholarships;
    }
  } catch (error) {
    console.error("[contentRepository] Supabase scholarships fetch failed:", error);
  }

  const fallback = fallbackScholarships();
  scholarshipsCache = setCache(fallback);
  return fallback;
}
