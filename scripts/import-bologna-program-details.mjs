import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BOLOGNA_UNIVERSITY_ID = 3;
const EXPECTED_SOURCE_FILE_COUNT = 97;
const RESULTS_DIR = "/Users/keremyarar/Desktop/results";
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "bologna-program-details-import-report.json");
const PAGE_SIZE = 1000;
const VALID_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
const VALID_LANGUAGES = new Set(["en", "it"]);

const mode = parseMode(process.argv.slice(2));

function parseMode(args) {
  const allowedArgs = new Set(["--dry-run", "--apply"]);
  const unknownArgs = args.filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(", ")}`);
  }

  const wantsDryRun = args.includes("--dry-run");
  const wantsApply = args.includes("--apply");
  if (wantsDryRun && wantsApply) {
    throw new Error("Use either --dry-run or --apply, not both.");
  }

  return wantsApply ? "apply" : "dry-run";
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
  const supabaseKey =
    mode === "apply"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      mode === "apply"
        ? "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply."
        : "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function createSlug(value) {
  return normalizeName(value).replace(/\s+/g, "-");
}

function normalizeLevel(value) {
  const trimmed = value.trim();
  if (VALID_LEVELS.has(trimmed)) return trimmed;
  throw new Error(`Invalid level: ${value}`);
}

function normalizeLanguages(rawTeachingLanguage) {
  const text = rawTeachingLanguage.toLowerCase();
  const languages = [];
  if (text.includes("english")) languages.push("en");
  if (text.includes("italian")) languages.push("it");
  return languages.filter((language) => VALID_LANGUAGES.has(language));
}

function durationForLevel(level) {
  if (level === "single-cycle") return 6;
  if (level === "master") return 2;
  return 3;
}

function assertStringRecord(record, field, file) {
  if (typeof record[field] !== "string" || record[field].trim().length === 0) {
    throw new Error(`${file} has missing ${field}`);
  }
}

function assertArray(record, field, file) {
  if (!Array.isArray(record[field])) {
    throw new Error(`${file} has non-array ${field}`);
  }
}

function loadSourcePrograms() {
  const files = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  return files.map((file) => {
    const absolutePath = join(RESULTS_DIR, file);
    const record = JSON.parse(readFileSync(absolutePath, "utf8"));

    for (const field of ["program_name", "level", "teaching_language", "official_program_url"]) {
      assertStringRecord(record, field, file);
    }

    for (const field of ["required_documents", "source_quotes", "uncertain", "uncertainty_notes"]) {
      assertArray(record, field, file);
    }

    const level = normalizeLevel(record.level);

    return {
      file,
      programName: record.program_name.trim(),
      normalizedName: normalizeName(record.program_name),
      level,
      teachingLanguage: record.teaching_language.trim(),
      languages: normalizeLanguages(record.teaching_language),
      durationYears: durationForLevel(level),
      raw: record,
    };
  });
}

async function fetchAllRows(supabase, tableName, columns, buildQuery) {
  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from(tableName).select(columns);
    query = buildQuery ? buildQuery(query) : query;

    const { data, error } = await query.range(from, to);
    if (error) throw new Error(`Failed to fetch ${tableName}: ${error.message}`);

    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function fetchBolognaDepartments(supabase) {
  return fetchAllRows(
    supabase,
    "university_departments",
    "id,university_id,name,slug,languages,duration_years,level,sort_order",
    (query) =>
      query
        .eq("university_id", BOLOGNA_UNIVERSITY_ID)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
  );
}

function nextSlug(baseSlug, usedSlugs, level) {
  if (!usedSlugs.has(baseSlug)) return baseSlug;

  const levelSlug = `${baseSlug}-${level}`;
  if (!usedSlugs.has(levelSlug)) return levelSlug;

  for (let index = 2; ; index += 1) {
    const candidate = `${levelSlug}-${index}`;
    if (!usedSlugs.has(candidate)) return candidate;
  }
}

function createPlan(sourcePrograms, dbDepartments) {
  const byName = new Map();
  const usedSlugs = new Set(dbDepartments.map((department) => department.slug));

  for (const department of dbDepartments) {
    const key = normalizeName(department.name);
    const list = byName.get(key) ?? [];
    list.push(department);
    byName.set(key, list);
  }

  const matchedExisting = [];
  const levelCorrections = [];
  const newDepartments = [];
  const detailRows = [];
  const programPlans = [];
  const duplicateNameDifferentLevel = [];
  const warnings = [];

  if (sourcePrograms.length !== EXPECTED_SOURCE_FILE_COUNT) {
    warnings.push(
      `Expected ${EXPECTED_SOURCE_FILE_COUNT} source JSON files but found ${sourcePrograms.length}.`
    );
  }

  for (const source of sourcePrograms) {
    const candidates = byName.get(source.normalizedName) ?? [];
    const exactLevel = candidates.find((candidate) => candidate.level === source.level);
    const singleCycleCorrection =
      !exactLevel &&
      source.level === "single-cycle" &&
      candidates.length === 1 &&
      candidates[0].level === "bachelor";

    let department = exactLevel;
    let action = "matched-existing";
    let levelBefore = exactLevel?.level ?? null;
    let levelAfter = source.level;

    if (singleCycleCorrection) {
      department = candidates[0];
      action = "level-correction";
      levelBefore = department.level;
      levelCorrections.push({
        id: department.id,
        name: department.name,
        slug: department.slug,
        from: department.level,
        to: source.level,
        sourceFile: source.file,
      });
    }

    if (department) {
      matchedExisting.push({
        id: department.id,
        name: department.name,
        slug: department.slug,
        level: source.level,
        sourceFile: source.file,
      });
    } else {
      const baseSlug = createSlug(source.programName);
      const slug = nextSlug(baseSlug, usedSlugs, source.level);
      usedSlugs.add(slug);

      const sortOrder = dbDepartments.length + newDepartments.length + 1;
      department = {
        id: null,
        university_id: BOLOGNA_UNIVERSITY_ID,
        name: source.programName,
        slug,
        languages: source.languages.length > 0 ? source.languages : ["en"],
        duration_years: source.durationYears,
        level: source.level,
        sort_order: sortOrder,
      };
      newDepartments.push({ ...department, sourceFile: source.file });
      action = "new-department";
      levelBefore = null;
      levelAfter = source.level;
    }

    if (candidates.length > 0 && !candidates.some((candidate) => candidate.level === source.level)) {
      duplicateNameDifferentLevel.push({
        name: source.programName,
        sourceLevel: source.level,
        existingLevels: candidates.map((candidate) => candidate.level),
        sourceFile: source.file,
      });
    }

    programPlans.push({
      sourceFile: source.file,
      programName: source.programName,
      normalizedName: source.normalizedName,
      level: source.level,
      action,
      departmentId: department.id,
      departmentName: department.name,
      departmentSlug: department.slug,
      levelBefore,
      levelAfter,
    });

    detailRows.push({
      source,
      department,
    });
  }

  return {
    universityId: BOLOGNA_UNIVERSITY_ID,
    sourceFiles: sourcePrograms.length,
    existingDepartments: dbDepartments.length,
    matchedExisting,
    levelCorrections,
    newDepartments,
    duplicateNameDifferentLevel,
    detailRows,
    programPlans,
    warnings,
  };
}

function toDetailPayload(source, departmentId) {
  return {
    department_id: departmentId,
    university_id: BOLOGNA_UNIVERSITY_ID,
    raw_program_name: source.raw.program_name,
    raw_level: source.raw.level,
    raw_teaching_language: source.raw.teaching_language,
    campus: source.raw.campus ?? null,
    degree_class: source.raw.degree_class ?? null,
    admission_type: source.raw.admission_type ?? null,
    academic_requirements: source.raw.academic_requirements ?? null,
    language_requirements: source.raw.language_requirements ?? null,
    application_deadline_eu: source.raw.application_deadline_eu ?? null,
    application_deadline_non_eu: source.raw.application_deadline_non_eu ?? null,
    required_documents: source.raw.required_documents,
    entry_exam_or_test: source.raw.entry_exam_or_test ?? null,
    tuition_or_fees_link: source.raw.tuition_or_fees_link ?? null,
    official_program_url: source.raw.official_program_url,
    official_call_url: source.raw.official_call_url ?? null,
    source_quotes: source.raw.source_quotes,
    uncertain: source.raw.uncertain,
    uncertainty_notes: source.raw.uncertainty_notes,
    source_file: source.file,
  };
}

function toDepartmentPayload(department) {
  return {
    university_id: department.university_id,
    name: department.name,
    slug: department.slug,
    languages: department.languages,
    duration_years: department.duration_years,
    level: department.level,
    sort_order: department.sort_order,
  };
}

async function applyPlan(supabase, plan) {
  if (plan.newDepartments.length > 0) {
    const { error } = await supabase
      .from("university_departments")
      .insert(plan.newDepartments.map(toDepartmentPayload));
    if (error) throw new Error(`Failed to insert departments: ${error.message}`);
  }

  for (const correction of plan.levelCorrections) {
    const { error } = await supabase
      .from("university_departments")
      .update({ level: correction.to })
      .eq("id", correction.id);
    if (error) throw new Error(`Failed to update ${correction.slug}: ${error.message}`);
  }

  const refreshedDepartments = await fetchBolognaDepartments(supabase);
  const departmentByKey = new Map(
    refreshedDepartments.map((department) => [
      `${normalizeName(department.name)}::${department.level}`,
      department,
    ])
  );

  const detailPayloads = plan.detailRows.map(({ source }) => {
    const department = departmentByKey.get(`${source.normalizedName}::${source.level}`);
    if (!department?.id) {
      throw new Error(`Cannot resolve department id for ${source.programName} (${source.level})`);
    }
    return toDetailPayload(source, department.id);
  });

  const { error } = await supabase
    .from("program_admission_details")
    .upsert(detailPayloads, { onConflict: "department_id" });
  if (error) throw new Error(`Failed to upsert admission details: ${error.message}`);
}

function reportForOutput(plan) {
  return {
    universityId: plan.universityId,
    mode,
    sourceFiles: plan.sourceFiles,
    existingDepartments: plan.existingDepartments,
    matchedExisting: plan.matchedExisting.length,
    matchedExistingDetails: plan.matchedExisting,
    levelCorrections: plan.levelCorrections,
    newDepartments: plan.newDepartments.map(({ sourceFile, ...department }) => ({
      ...department,
      sourceFile,
    })),
    duplicateNameDifferentLevel: plan.duplicateNameDifferentLevel,
    programPlans: plan.programPlans,
    specialChecks: {
      statisticalSciences: plan.programPlans.filter(
        (programPlan) => programPlan.normalizedName === "statistical sciences"
      ),
      archaeology: plan.programPlans.filter((programPlan) =>
        programPlan.normalizedName.includes("archaeology")
      ),
    },
    warnings: plan.warnings,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const supabase = createSupabaseClient();
  const sourcePrograms = loadSourcePrograms();
  const dbDepartments = await fetchBolognaDepartments(supabase);
  const plan = createPlan(sourcePrograms, dbDepartments);
  const report = reportForOutput(plan);

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (mode === "apply") {
    await applyPlan(supabase, plan);
    console.log(`[OK] Applied ${sourcePrograms.length} Bologna program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
