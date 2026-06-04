import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
const UNIVERSITY_CHECKS = [
  {
    universityId: 3,
    label: "Bologna",
    expectedDetailCount: 97,
    criticalPrograms: [
      {
        name: "Medicine and Surgery",
        level: "single-cycle",
        missingProgramMessage: "Missing expected Bologna program: Medicine and Surgery (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 6,
      },
      {
        name: "Pharmacy",
        level: "single-cycle",
        missingProgramMessage: "Missing expected Bologna program: Pharmacy (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 5,
      },
      {
        name: "Veterinary Medicine",
        level: "single-cycle",
        missingProgramMessage: "Missing expected Bologna program: Veterinary Medicine (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 5,
      },
      {
        name: "Archaeology",
        level: "master",
        missingProgramMessage: "Missing expected Bologna program: Archaeology (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Archaeology and Cultures of the Ancient World",
        level: "master",
        missingProgramMessage:
          "Missing expected Bologna program: Archaeology and Cultures of the Ancient World (master)",
        requiresDetails: false,
        expectedDurationYears: 2,
      },
      {
        name: "Statistical Sciences",
        level: "bachelor",
        missingProgramMessage: "Missing Statistical Sciences bachelor row",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Statistical Sciences",
        level: "master",
        missingProgramMessage: "Missing Statistical Sciences master row",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
  {
    universityId: 1,
    label: "Polimi",
    expectedDetailCount: 52,
    criticalPrograms: [
      {
        name: "Engineering Science",
        level: "bachelor",
        missingProgramMessage: "Missing expected Polimi program: Engineering Science (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Industrial Engineering",
        level: "bachelor",
        missingProgramMessage: "Missing expected Polimi program: Industrial Engineering (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Process Engineering",
        level: "bachelor",
        missingProgramMessage: "Missing expected Polimi program: Process Engineering (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "MEDTEC School",
        level: "single-cycle",
        missingProgramMessage: "Missing expected Polimi program: MEDTEC School (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 6,
        expectedRawLevel: "single-cycle [uncertain]",
        expectedUncertainField: "level",
      },
      {
        name: "Computer Science and Engineering",
        level: "master",
        missingProgramMessage:
          "Missing expected Polimi program: Computer Science and Engineering (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
  {
    universityId: 2,
    label: "Sapienza",
    expectedDetailCount: 23,
    criticalPrograms: [
      {
        name: "Applied Computer Science and Artificial Intelligence",
        level: "bachelor",
        missingProgramMessage:
          "Missing expected Sapienza program: Applied Computer Science and Artificial Intelligence (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Nursing",
        level: "bachelor",
        missingProgramMessage: "Missing expected Sapienza program: Nursing (bachelor)",
        requiresDetails: true,
        expectedDurationYears: 3,
      },
      {
        name: "Medicine and Surgery",
        level: "single-cycle",
        missingProgramMessage:
          "Missing expected Sapienza program: Medicine and Surgery (single-cycle)",
        requiresDetails: true,
        expectedDurationYears: 6,
      },
      {
        name: "Computer Science",
        level: "master",
        missingProgramMessage: "Missing expected Sapienza program: Computer Science (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
      {
        name: "Cybersecurity",
        level: "master",
        missingProgramMessage: "Missing expected Sapienza program: Cybersecurity (master)",
        requiresDetails: true,
        expectedDurationYears: 2,
      },
    ],
  },
];
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

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

const supabase = createSupabaseClient();

if (supabase) {
  for (const universityCheck of UNIVERSITY_CHECKS) {
    const { data: details, error: detailsError } = await supabase
      .from("program_admission_details")
      .select(
        "department_id,university_id,raw_level,official_program_url,required_documents,source_quotes,uncertain,uncertainty_notes,source_file"
      )
      .eq("university_id", universityCheck.universityId);

    if (detailsError) {
      fail(`Failed to fetch ${universityCheck.label} program_admission_details: ${detailsError.message}`);
      continue;
    }

    const detailDepartmentIds = new Set((details ?? []).map((detail) => detail.department_id));
    const detailByDepartmentId = new Map((details ?? []).map((detail) => [detail.department_id, detail]));

    if ((details ?? []).length !== universityCheck.expectedDetailCount) {
      fail(
        `Expected ${universityCheck.expectedDetailCount} ${universityCheck.label} details, got ${(details ?? []).length}`
      );
    }

    for (const detail of details ?? []) {
      if (!isHttpUrl(detail.official_program_url)) {
        fail(`${universityCheck.label} detail ${detail.department_id} has invalid official_program_url`);
      }

      for (const field of ["required_documents", "source_quotes", "uncertain", "uncertainty_notes"]) {
        if (!isArray(detail[field])) {
          fail(`${universityCheck.label} detail ${detail.department_id} has non-array ${field}`);
        }
      }

      for (const [index, quote] of (detail.source_quotes ?? []).entries()) {
        if (!quote || typeof quote !== "object") {
          fail(`${universityCheck.label} detail ${detail.department_id} source quote ${index} is not an object`);
          continue;
        }

        if (!isHttpUrl(quote.url)) {
          fail(`${universityCheck.label} detail ${detail.department_id} source quote ${index} has invalid url`);
        }

        if (typeof quote.quote !== "string" || quote.quote.trim().length === 0) {
          fail(`${universityCheck.label} detail ${detail.department_id} source quote ${index} has invalid quote`);
        }

        if (!isArray(quote.field_refs)) {
          fail(`${universityCheck.label} detail ${detail.department_id} source quote ${index} has non-array field_refs`);
        }

        if (typeof quote.retrieved_at !== "string" || quote.retrieved_at.trim().length === 0) {
          fail(`${universityCheck.label} detail ${detail.department_id} source quote ${index} has invalid retrieved_at`);
        }
      }
    }

    const { data: departments, error: departmentsError } = await supabase
      .from("university_departments")
      .select("id,name,slug,level,duration_years")
      .eq("university_id", universityCheck.universityId);

    if (departmentsError) {
      fail(`Failed to fetch ${universityCheck.label} university_departments: ${departmentsError.message}`);
      continue;
    }

    const slugs = new Set();
    for (const department of departments ?? []) {
      if (slugs.has(department.slug)) {
        fail(`duplicate ${universityCheck.label} slug: ${department.slug}`);
      }
      slugs.add(department.slug);

      if (!ALLOWED_LEVELS.has(department.level)) {
        fail(`${universityCheck.label} ${department.slug} has invalid level ${department.level}`);
      }
    }

    for (const {
      name,
      level,
      missingProgramMessage,
      requiresDetails,
      expectedDurationYears,
      expectedRawLevel,
      expectedUncertainField,
    } of universityCheck.criticalPrograms) {
      const department = (departments ?? []).find(
        (candidate) => candidate.name === name && candidate.level === level
      );

      if (!department) {
        fail(missingProgramMessage);
        continue;
      }

      const detail = detailByDepartmentId.get(department.id);
      if (requiresDetails && !detailDepartmentIds.has(department.id)) {
        fail(`Missing admission details for expected ${universityCheck.label} program: ${name} (${level})`);
      }

      if (department.duration_years !== expectedDurationYears) {
        fail(
          `Expected ${universityCheck.label} ${name} (${level}) duration ${expectedDurationYears}, got ${department.duration_years}`
        );
      }

      if (expectedRawLevel && detail?.raw_level !== expectedRawLevel) {
        fail(
          `Expected ${universityCheck.label} ${name} raw_level ${expectedRawLevel}, got ${detail?.raw_level}`
        );
      }

      if (expectedUncertainField && !detail?.uncertain?.includes(expectedUncertainField)) {
        fail(
          `Expected ${universityCheck.label} ${name} uncertain to include ${expectedUncertainField}`
        );
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
