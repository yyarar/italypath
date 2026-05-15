import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const UNIVERSITY_COLUMNS =
  "id,name,city,type,fee,image,description,description_en,website,features,features_en,sort_order";
const UNIVERSITY_DEPARTMENT_COLUMNS =
  "university_id,name,slug,languages,duration_years,level,sort_order";
const PAGE_SIZE = 1000;
const ALLOWED_LANGUAGES = new Set(["en", "it"]);
const ALLOWED_DURATIONS = new Set([1, 2, 3, 4, 5, 6]);
const ALLOWED_LEVELS = new Set(["bachelor", "master"]);

const failures = [];

function fail(message) {
  failures.push(message);
}

function loadDotenvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function createSupabaseClient() {
  loadDotenvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    fail("NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function fetchAllRows(supabase, tableName, columns, orderColumns) {
  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from(tableName).select(columns);

    for (const column of orderColumns) {
      query = query.order(column, { ascending: true });
    }

    const { data, error } = await query.range(from, to);
    if (error) {
      fail(`Failed to fetch ${tableName}: ${error.message}`);
      return rows;
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}

function validateUniversities(universities) {
  const universityIds = new Set();

  for (const university of universities) {
    if (!Number.isFinite(university.id)) {
      fail(`university has invalid id: ${JSON.stringify(university.id)}`);
      continue;
    }

    if (universityIds.has(university.id)) {
      fail(`duplicate university id: ${university.id}`);
    }
    universityIds.add(university.id);

    for (const field of ["name", "city", "type", "fee", "description", "website"]) {
      if (typeof university[field] !== "string" || !university[field].trim()) {
        fail(`university ${university.id} has missing ${field}`);
      }
    }

    for (const field of ["features", "features_en"]) {
      if (university[field] !== null && !Array.isArray(university[field])) {
        fail(`university ${university.id} has non-array ${field}`);
      }
    }
  }

  return universityIds;
}

function validateDepartments(departments, universityIds) {
  const slugsByUniversity = new Map();
  const statsByLanguage = new Map();
  const statsByDuration = new Map();
  const statsByLevel = new Map();

  for (const department of departments) {
    if (!universityIds.has(department.university_id)) {
      fail(`department references unknown university id: ${department.university_id}`);
      continue;
    }

    if (typeof department.name !== "string" || !department.name.trim()) {
      fail(`department ${department.university_id} has missing name`);
    }

    if (typeof department.slug !== "string" || !department.slug.trim()) {
      fail(`department ${department.university_id} has missing slug`);
      continue;
    }

    const slugKey = department.university_id;
    const slugs = slugsByUniversity.get(slugKey) ?? new Set();
    if (slugs.has(department.slug)) {
      fail(`duplicate department slug in university ${department.university_id}: ${department.slug}`);
    }
    slugs.add(department.slug);
    slugsByUniversity.set(slugKey, slugs);

    if (!Array.isArray(department.languages) || department.languages.length === 0) {
      fail(`department ${department.university_id}:${department.slug} has missing languages`);
    } else {
      const uniqueLanguages = new Set(department.languages);
      if (uniqueLanguages.size !== department.languages.length) {
        fail(`department ${department.university_id}:${department.slug} has duplicate languages`);
      }

      for (const language of department.languages) {
        if (!ALLOWED_LANGUAGES.has(language)) {
          fail(`department ${department.university_id}:${department.slug} has invalid language "${language}"`);
        } else {
          statsByLanguage.set(language, (statsByLanguage.get(language) ?? 0) + 1);
        }
      }
    }

    if (!ALLOWED_DURATIONS.has(department.duration_years)) {
      fail(`department ${department.university_id}:${department.slug} has invalid duration "${department.duration_years}"`);
    } else {
      statsByDuration.set(String(department.duration_years), (statsByDuration.get(String(department.duration_years)) ?? 0) + 1);
    }

    if (!ALLOWED_LEVELS.has(department.level)) {
      fail(`department ${department.university_id}:${department.slug} has invalid level "${department.level}"`);
    } else {
      statsByLevel.set(department.level, (statsByLevel.get(department.level) ?? 0) + 1);
    }
  }

  return { statsByLanguage, statsByDuration, statsByLevel };
}

const supabase = createSupabaseClient();

if (supabase) {
  const [universities, departments] = await Promise.all([
    fetchAllRows(supabase, "universities", UNIVERSITY_COLUMNS, ["sort_order", "id"]),
    fetchAllRows(supabase, "university_departments", UNIVERSITY_DEPARTMENT_COLUMNS, [
      "university_id",
      "sort_order",
      "name",
    ]),
  ]);

  if (failures.length === 0) {
    if (universities.length === 0) {
      fail("Supabase universities table returned 0 rows");
    }

    if (departments.length === 0) {
      fail("Supabase university_departments table returned 0 rows");
    }
  }

  if (failures.length === 0) {
    const universityIds = validateUniversities(universities);
    const { statsByLanguage, statsByDuration, statsByLevel } = validateDepartments(
      departments,
      universityIds
    );

    if (failures.length === 0) {
      console.log(`[OK] Supabase universities: ${universities.length}`);
      console.log(`[OK] Supabase departments: ${departments.length}`);
      console.log(`[OK] Language distribution: ${JSON.stringify(Object.fromEntries(statsByLanguage))}`);
      console.log(`[OK] Duration distribution: ${JSON.stringify(Object.fromEntries(statsByDuration))}`);
      console.log(`[OK] Level distribution: ${JSON.stringify(Object.fromEntries(statsByLevel))}`);
    }
  }
}

if (failures.length > 0) {
  console.error("[FAIL] Supabase university data integrity check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Supabase university data integrity check passed.");
