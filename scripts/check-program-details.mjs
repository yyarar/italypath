import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BOLOGNA_UNIVERSITY_ID = 3;
const EXPECTED_BOLOGNA_DETAIL_COUNT = 97;
const ALLOWED_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
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

function isArray(value) {
  return Array.isArray(value);
}

const supabase = createSupabaseClient();

if (supabase) {
  let detailDepartmentIds = null;
  const { data: details, error: detailsError } = await supabase
    .from("program_admission_details")
    .select(
      "department_id,university_id,official_program_url,required_documents,source_quotes,uncertain,uncertainty_notes"
    )
    .eq("university_id", BOLOGNA_UNIVERSITY_ID);

  if (detailsError) {
    fail(`Failed to fetch program_admission_details: ${detailsError.message}`);
  } else {
    detailDepartmentIds = new Set((details ?? []).map((detail) => detail.department_id));

    if ((details ?? []).length !== EXPECTED_BOLOGNA_DETAIL_COUNT) {
      fail(`Expected ${EXPECTED_BOLOGNA_DETAIL_COUNT} Bologna details, got ${(details ?? []).length}`);
    }

    for (const detail of details ?? []) {
      if (
        typeof detail.official_program_url !== "string" ||
        !detail.official_program_url.startsWith("https://")
      ) {
        fail(`detail ${detail.department_id} has invalid official_program_url`);
      }

      for (const field of ["required_documents", "source_quotes", "uncertain", "uncertainty_notes"]) {
        if (!isArray(detail[field])) {
          fail(`detail ${detail.department_id} has non-array ${field}`);
        }
      }
    }
  }

  const { data: departments, error: departmentsError } = await supabase
    .from("university_departments")
    .select("id,name,slug,level,duration_years")
    .eq("university_id", BOLOGNA_UNIVERSITY_ID);

  if (departmentsError) {
    fail(`Failed to fetch university_departments: ${departmentsError.message}`);
  } else {
    const slugs = new Set();
    for (const department of departments ?? []) {
      if (slugs.has(department.slug)) {
        fail(`duplicate Bologna slug: ${department.slug}`);
      }
      slugs.add(department.slug);

      if (!ALLOWED_LEVELS.has(department.level)) {
        fail(`${department.slug} has invalid level ${department.level}`);
      }
    }

    const criticalPrograms = [
      ["Medicine and Surgery", "single-cycle", "Missing expected Bologna program: Medicine and Surgery (single-cycle)"],
      ["Pharmacy", "single-cycle", "Missing expected Bologna program: Pharmacy (single-cycle)"],
      [
        "Veterinary Medicine",
        "single-cycle",
        "Missing expected Bologna program: Veterinary Medicine (single-cycle)",
      ],
      ["Archaeology", "master", "Missing expected Bologna program: Archaeology (master)"],
      [
        "Archaeology and Cultures of the Ancient World",
        "master",
        "Missing expected Bologna program: Archaeology and Cultures of the Ancient World (master)",
      ],
      ["Statistical Sciences", "bachelor", "Missing Statistical Sciences bachelor row"],
      ["Statistical Sciences", "master", "Missing Statistical Sciences master row"],
    ];

    for (const [name, level, missingProgramMessage] of criticalPrograms) {
      const department = (departments ?? []).find(
        (candidate) => candidate.name === name && candidate.level === level
      );

      if (!department) {
        fail(missingProgramMessage);
        continue;
      }

      if (detailDepartmentIds && !detailDepartmentIds.has(department.id)) {
        fail(`Missing admission details for expected Bologna program: ${name} (${level})`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("[FAIL] Program details check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Program details check passed.");
