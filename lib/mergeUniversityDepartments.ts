import {
  DEPARTMENT_DEADLINE_OVERRIDES,
  createDepartmentKey,
} from "../app/data";
import type {
  Department,
  ProgramDurationYears,
  ProgramLanguage,
  ProgramLevel,
  University,
} from "../app/data";
import type { SupabaseUniversityDepartmentRow } from "../types";

const PROGRAM_LANGUAGES = new Set<ProgramLanguage>(["en", "it"]);
const PROGRAM_LEVELS = new Set<ProgramLevel>(["bachelor", "master", "single-cycle"]);
const PROGRAM_DURATIONS = new Set<ProgramDurationYears>([1, 2, 3, 4, 5, 6]);

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
  const name = row.name?.trim();
  const slug = row.slug?.trim();

  if (!name || !slug) {
    return null;
  }

  return {
    id: row.id,
    name,
    slug,
    languages: normalizeLanguages(row.languages),
    durationYears: normalizeDurationYears(row.duration_years),
    level: normalizeLevel(row.level),
    deadline: DEPARTMENT_DEADLINE_OVERRIDES[createDepartmentKey(row.university_id, slug)],
  };
}

export function mergeUniversityDepartmentRows(
  universities: University[],
  rows: SupabaseUniversityDepartmentRow[]
): University[] {
  if (rows.length === 0) {
    return universities;
  }

  const rowsByUniversityId = new Map<number, SupabaseUniversityDepartmentRow[]>();

  for (const row of rows) {
    const universityRows = rowsByUniversityId.get(row.university_id) ?? [];
    universityRows.push(row);
    rowsByUniversityId.set(row.university_id, universityRows);
  }

  return universities.map((university) => {
    const universityRows = rowsByUniversityId.get(university.id);

    if (!universityRows || universityRows.length === 0) {
      return university;
    }

    const departmentsBySlug = new Map<string, Department>();

    for (const department of university.departments) {
      departmentsBySlug.set(department.slug, department);
    }

    const sortedRows = [...universityRows].sort((a, b) => {
      const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    for (const row of sortedRows) {
      const department = createDepartment(row);

      if (department) {
        departmentsBySlug.set(department.slug, department);
      }
    }

    return {
      ...university,
      departments: [...departmentsBySlug.values()],
    };
  });
}
