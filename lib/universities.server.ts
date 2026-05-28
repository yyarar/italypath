import { createClient } from "@supabase/supabase-js";

import {
  DEPARTMENT_DEADLINE_OVERRIDES,
  createDepartmentKey,
} from "@/app/data";
import type {
  Department,
  ProgramDurationYears,
  ProgramLanguage,
  ProgramLevel,
  University,
} from "@/app/data";
import type { SupabaseUniversityDepartmentRow, SupabaseUniversityRow } from "@/types";

const UNIVERSITY_COLUMNS =
  "id,name,city,type,fee,image,description,description_en,website,features,features_en,sort_order";
const UNIVERSITY_DEPARTMENT_COLUMNS =
  "university_id,name,slug,languages,duration_years,level,sort_order";
const UNIVERSITY_PAGE_SIZE = 1000;
const UNIVERSITY_DEPARTMENT_PAGE_SIZE = 1000;
const SERVER_CACHE_TTL_MS = 60 * 60 * 1000;

const PROGRAM_LANGUAGES = new Set<ProgramLanguage>(["en", "it"]);
const PROGRAM_LEVELS = new Set<ProgramLevel>(["bachelor", "master"]);
const PROGRAM_DURATIONS = new Set<ProgramDurationYears>([1, 2, 3, 4, 5, 6]);

let cachedUniversities: { data: University[]; expiresAt: number } | null = null;

function createReadOnlySupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or anon key is missing.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeText(value: string | null, fallback = "") {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function normalizeStringList(value: string[] | null) {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function normalizeLanguages(languages: string[] | null): ProgramLanguage[] {
  const normalized = (languages ?? []).filter((language): language is ProgramLanguage =>
    PROGRAM_LANGUAGES.has(language as ProgramLanguage)
  );

  return normalized.length > 0 ? [...new Set(normalized)] : ["en"];
}

function normalizeDurationYears(durationYears: number | null): ProgramDurationYears {
  return PROGRAM_DURATIONS.has(durationYears as ProgramDurationYears)
    ? (durationYears as ProgramDurationYears)
    : 3;
}

function normalizeLevel(level: string | null): ProgramLevel {
  return PROGRAM_LEVELS.has(level as ProgramLevel) ? (level as ProgramLevel) : "bachelor";
}

function createDepartment(row: SupabaseUniversityDepartmentRow): Department | null {
  const name = normalizeText(row.name);
  const slug = normalizeText(row.slug);

  if (!name || !slug) {
    return null;
  }

  return {
    name,
    slug,
    languages: normalizeLanguages(row.languages),
    durationYears: normalizeDurationYears(row.duration_years),
    level: normalizeLevel(row.level),
    deadline: DEPARTMENT_DEADLINE_OVERRIDES[createDepartmentKey(row.university_id, slug)],
  };
}

function createUniversity(row: SupabaseUniversityRow, departments: Department[]): University | null {
  const name = normalizeText(row.name);
  const city = normalizeText(row.city);
  const featuresEn = normalizeStringList(row.features_en);

  if (!Number.isFinite(row.id) || !name || !city) {
    return null;
  }

  return {
    id: row.id,
    name,
    city,
    type: normalizeText(row.type),
    fee: normalizeText(row.fee),
    image: normalizeText(row.image),
    description: normalizeText(row.description),
    description_en: normalizeText(row.description_en) || undefined,
    website: normalizeText(row.website),
    features: normalizeStringList(row.features),
    features_en: featuresEn.length > 0 ? featuresEn : undefined,
    departments,
  };
}

async function fetchUniversityRows(): Promise<SupabaseUniversityRow[]> {
  const supabase = createReadOnlySupabaseClient();
  const rows: SupabaseUniversityRow[] = [];

  for (let from = 0; ; from += UNIVERSITY_PAGE_SIZE) {
    const to = from + UNIVERSITY_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("universities")
      .select(UNIVERSITY_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
      .returns<SupabaseUniversityRow[]>();

    if (error) {
      throw new Error(`Failed to fetch universities from Supabase: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < UNIVERSITY_PAGE_SIZE) {
      return rows;
    }
  }
}

async function fetchUniversityDepartmentRows(): Promise<SupabaseUniversityDepartmentRow[]> {
  const supabase = createReadOnlySupabaseClient();
  const rows: SupabaseUniversityDepartmentRow[] = [];

  for (let from = 0; ; from += UNIVERSITY_DEPARTMENT_PAGE_SIZE) {
    const to = from + UNIVERSITY_DEPARTMENT_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("university_departments")
      .select(UNIVERSITY_DEPARTMENT_COLUMNS)
      .order("university_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to)
      .returns<SupabaseUniversityDepartmentRow[]>();

    if (error) {
      throw new Error(`Failed to fetch university departments from Supabase: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < UNIVERSITY_DEPARTMENT_PAGE_SIZE) {
      return rows;
    }
  }
}

export function composeUniversitiesFromSupabaseRows(
  universityRows: SupabaseUniversityRow[],
  departmentRows: SupabaseUniversityDepartmentRow[]
): University[] {
  const departmentsByUniversityId = new Map<number, Department[]>();

  for (const row of departmentRows) {
    const department = createDepartment(row);
    if (!department) continue;

    const departments = departmentsByUniversityId.get(row.university_id) ?? [];
    departments.push(department);
    departmentsByUniversityId.set(row.university_id, departments);
  }

  const universities: University[] = [];
  for (const row of universityRows) {
    const university = createUniversity(row, departmentsByUniversityId.get(row.id) ?? []);
    if (university) {
      universities.push(university);
    }
  }

  return universities;
}

export async function getUniversitiesData(): Promise<University[]> {
  const now = Date.now();
  if (cachedUniversities && cachedUniversities.expiresAt > now) {
    return cachedUniversities.data;
  }

  const [universityRows, departmentRows] = await Promise.all([
    fetchUniversityRows(),
    fetchUniversityDepartmentRows(),
  ]);
  const universities = composeUniversitiesFromSupabaseRows(universityRows, departmentRows);

  cachedUniversities = {
    data: universities,
    expiresAt: now + SERVER_CACHE_TTL_MS,
  };

  return universities;
}

export async function getUniversityById(id: string | number): Promise<University | undefined> {
  const universities = await getUniversitiesData();
  return universities.find((university) => String(university.id) === String(id));
}
