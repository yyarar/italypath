import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const POLIMI_UNIVERSITY_ID = 1;
const EXPECTED_SOURCE_FILE_COUNT = 52;
const SOURCE_GENERATED_AT = "2026-06-02";
const RESULTS_DIR = resolve(
  process.cwd(),
  "polimi-english-program-admission-requirements/results"
);
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "polimi-program-details-import-report.json");
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

function collapseWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

function canonicalDepartmentName(value) {
  return collapseWhitespace(value.replace(/\s*\[[^\]]+\]\s*$/, ""));
}

function createSlug(value) {
  return normalizeName(value).replace(/\s+/g, "-");
}

function normalizeLevel(value) {
  const trimmed = value.trim();
  const withoutMarker = trimmed.replace(/\s*\[[^\]]+\]\s*$/g, "").trim();
  if (VALID_LEVELS.has(withoutMarker)) return withoutMarker;
  throw new Error(`Invalid level: ${value}`);
}

function normalizeLanguages(rawTeachingLanguage) {
  const text = rawTeachingLanguage.toLowerCase();
  const languages = [];

  if (/\bita\b/.test(text) || text.includes("italian")) languages.push("it");
  if (/\beng\b/.test(text) || text.includes("english")) languages.push("en");

  return [...new Set(languages.filter((language) => VALID_LANGUAGES.has(language)))];
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

function optionalText(value) {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (Array.isArray(value)) {
    const normalized = value.map(optionalText).filter(Boolean);
    return normalized.length > 0 ? normalized.join("; ") : null;
  }

  if (typeof value === "object") {
    if (typeof value.summary === "string") {
      return optionalText(value.summary);
    }

    const entries = Object.entries(value)
      .filter(([key]) => key !== "sources")
      .map(([key, itemValue]) => {
        const normalized = optionalText(itemValue);
        return normalized ? `${key}: ${normalized}` : null;
      })
      .filter(Boolean);

    return entries.length > 0 ? entries.join("; ") : null;
  }

  return String(value);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const normalized = optionalText(item);
    return normalized ? [normalized] : [];
  });
}

function normalizeSourceQuotes(value) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const quote = typeof item.quote === "string" ? item.quote.trim() : "";
    const url =
      typeof item.url === "string"
        ? item.url.trim()
        : typeof item.source_url === "string"
          ? item.source_url.trim()
          : "";
    const fieldRefs = Array.isArray(item.field_refs)
      ? item.field_refs
      : Array.isArray(item.supports_fields)
        ? item.supports_fields
        : [];
    const retrievedAt =
      typeof item.retrieved_at === "string" && item.retrieved_at.trim()
        ? item.retrieved_at.trim()
        : SOURCE_GENERATED_AT;

    if (!quote || !url) return [];

    return [
      {
        url,
        quote,
        field_refs: normalizeStringArray(fieldRefs),
        retrieved_at: retrievedAt,
      },
    ];
  });
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
    const rawProgramName = record.program_name;
    const sourceProgramName = collapseWhitespace(rawProgramName);
    const departmentName = canonicalDepartmentName(sourceProgramName);
    if (!departmentName) {
      throw new Error(`${file} has empty canonical department name`);
    }

    return {
      file,
      rawProgramName,
      sourceProgramName,
      departmentName,
      normalizedSourceName: normalizeName(sourceProgramName),
      normalizedName: normalizeName(departmentName),
      level,
      rawLevel: record.level.trim(),
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

async function fetchPolimiDepartments(supabase) {
  return fetchAllRows(
    supabase,
    "university_departments",
    "id,university_id,name,slug,languages,duration_years,level,sort_order",
    (query) =>
      query
        .eq("university_id", POLIMI_UNIVERSITY_ID)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
  );
}

function identityKey(name, level) {
  return `${normalizeName(canonicalDepartmentName(name))}::${level}`;
}

function duplicateWarnings(records, describeRecord, groupByRecord, subject) {
  const byKey = new Map();
  const warnings = [];

  for (const record of records) {
    const key = groupByRecord(record);
    const list = byKey.get(key) ?? [];
    list.push(record);
    byKey.set(key, list);
  }

  for (const [key, recordsForKey] of byKey) {
    if (recordsForKey.length < 2) continue;

    warnings.push(
      `Duplicate ${subject} for ${key}: ${recordsForKey.map(describeRecord).join("; ")}`
    );
  }

  return warnings;
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
  const maxSortOrder = dbDepartments.reduce(
    (max, department) =>
      Number.isFinite(department.sort_order) ? Math.max(max, department.sort_order) : max,
    0
  );

  for (const department of dbDepartments) {
    const key = normalizeName(canonicalDepartmentName(department.name));
    const list = byName.get(key) ?? [];
    list.push(department);
    byName.set(key, list);
  }

  const matchedExisting = [];
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
  warnings.push(
    ...duplicateWarnings(
      sourcePrograms,
      (source) => `${source.file} (${source.sourceProgramName}, ${source.level})`,
      (source) => identityKey(source.departmentName, source.level),
      "source program canonical name + level"
    )
  );
  warnings.push(
    ...duplicateWarnings(
      dbDepartments,
      (department) => `${department.id}:${department.name} (${department.slug}, ${department.level})`,
      (department) => identityKey(department.name, department.level),
      "existing department canonical name + level"
    )
  );

  for (const source of sourcePrograms) {
    const candidates = byName.get(source.normalizedName) ?? [];
    let department = candidates.find((candidate) => candidate.level === source.level);
    let action = "matched-existing";

    if (department) {
      matchedExisting.push({
        id: department.id,
        name: department.name,
        slug: department.slug,
        level: source.level,
        sourceFile: source.file,
        rawProgramName: source.rawProgramName,
        sourceProgramName: source.sourceProgramName,
        canonicalDepartmentName: source.departmentName,
      });
    } else {
      const baseSlug = createSlug(source.departmentName);
      const slug = nextSlug(baseSlug, usedSlugs, source.level);
      usedSlugs.add(slug);

      const sortOrder = maxSortOrder + newDepartments.length + 1;
      department = {
        id: null,
        university_id: POLIMI_UNIVERSITY_ID,
        name: source.departmentName,
        slug,
        languages: source.languages.length > 0 ? source.languages : ["en"],
        duration_years: source.durationYears,
        level: source.level,
        sort_order: sortOrder,
      };
      newDepartments.push({
        ...department,
        sourceFile: source.file,
        rawProgramName: source.rawProgramName,
        sourceProgramName: source.sourceProgramName,
        canonicalDepartmentName: source.departmentName,
      });
      action = "new-department";
    }

    if (candidates.length > 0 && !candidates.some((candidate) => candidate.level === source.level)) {
      duplicateNameDifferentLevel.push({
        name: source.departmentName,
        rawProgramName: source.rawProgramName,
        sourceProgramName: source.sourceProgramName,
        sourceLevel: source.level,
        existingLevels: candidates.map((candidate) => candidate.level),
        sourceFile: source.file,
      });
    }

    programPlans.push({
      sourceFile: source.file,
      rawProgramName: source.rawProgramName,
      sourceProgramName: source.sourceProgramName,
      canonicalDepartmentName: source.departmentName,
      canonicalNameChanged: source.sourceProgramName !== source.departmentName,
      normalizedName: source.normalizedName,
      normalizedSourceName: source.normalizedSourceName,
      level: source.level,
      rawLevel: source.rawLevel,
      rawLevelNormalized: source.rawLevel !== source.level,
      action,
      departmentId: department.id,
      departmentName: department.name,
      departmentSlug: department.slug,
    });

    detailRows.push({
      source,
      department,
    });
  }

  const sourceIdentityKeys = new Set(
    sourcePrograms.map((source) => identityKey(source.departmentName, source.level))
  );
  const existingWithoutSource = dbDepartments
    .filter((department) => !sourceIdentityKeys.has(identityKey(department.name, department.level)))
    .map((department) => ({
      id: department.id,
      name: department.name,
      slug: department.slug,
      level: department.level,
    }));

  return {
    universityId: POLIMI_UNIVERSITY_ID,
    sourceFiles: sourcePrograms.length,
    existingDepartments: dbDepartments.length,
    matchedExisting,
    newDepartments,
    duplicateNameDifferentLevel,
    existingWithoutSource,
    detailRows,
    programPlans,
    warnings,
  };
}

function toDetailPayload(source, departmentId) {
  return {
    department_id: departmentId,
    university_id: POLIMI_UNIVERSITY_ID,
    raw_program_name: source.raw.program_name,
    raw_level: source.raw.level,
    raw_teaching_language: source.raw.teaching_language,
    campus: optionalText(source.raw.campus),
    degree_class: optionalText(source.raw.degree_class),
    admission_type: optionalText(source.raw.admission_type),
    academic_requirements: optionalText(source.raw.academic_requirements),
    language_requirements: optionalText(source.raw.language_requirements),
    application_deadline_eu: optionalText(source.raw.application_deadline_eu),
    application_deadline_non_eu: optionalText(source.raw.application_deadline_non_eu),
    required_documents: normalizeStringArray(source.raw.required_documents),
    entry_exam_or_test: optionalText(source.raw.entry_exam_or_test),
    tuition_or_fees_link: optionalText(source.raw.tuition_or_fees_link),
    official_program_url: source.raw.official_program_url,
    official_call_url: optionalText(source.raw.official_call_url),
    source_quotes: normalizeSourceQuotes(source.raw.source_quotes),
    uncertain: normalizeStringArray(source.raw.uncertain),
    uncertainty_notes: normalizeStringArray(source.raw.uncertainty_notes),
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
  let mutated = false;

  try {
    if (plan.newDepartments.length > 0) {
      const { error } = await supabase
        .from("university_departments")
        .insert(plan.newDepartments.map(toDepartmentPayload));
      if (error) throw new Error(`Failed to insert departments: ${error.message}`);
      mutated = true;
    }

    const refreshedDepartments = await fetchPolimiDepartments(supabase);
    const departmentByKey = new Map(
      refreshedDepartments.map((department) => [
        identityKey(department.name, department.level),
        department,
      ])
    );

    const detailPayloads = plan.detailRows.map(({ source }) => {
      const department = departmentByKey.get(identityKey(source.departmentName, source.level));
      if (!department?.id) {
        throw new Error(`Cannot resolve department id for ${source.departmentName} (${source.level})`);
      }
      return toDetailPayload(source, department.id);
    });

    const { error } = await supabase
      .from("program_admission_details")
      .upsert(detailPayloads, { onConflict: "department_id" });
    if (error) throw new Error(`Failed to upsert admission details: ${error.message}`);

    await verifyApplyResult(supabase, detailPayloads);
  } catch (error) {
    if (mutated) {
      await rollbackPlan(supabase, plan);
    }
    throw error;
  }
}

async function rollbackPlan(supabase, plan) {
  if (plan.newDepartments.length === 0) return;

  const slugs = plan.newDepartments.map((department) => department.slug);
  const { error } = await supabase
    .from("university_departments")
    .delete()
    .eq("university_id", POLIMI_UNIVERSITY_ID)
    .in("slug", slugs);
  if (error) {
    throw new Error(`Apply failed, and rollback also failed for new departments: ${error.message}`);
  }
}

async function verifyApplyResult(supabase, detailPayloads) {
  const departmentIds = detailPayloads.map((detail) => detail.department_id);
  const { data, error } = await supabase
    .from("program_admission_details")
    .select("department_id")
    .eq("university_id", POLIMI_UNIVERSITY_ID)
    .in("department_id", departmentIds);

  if (error) {
    throw new Error(`Failed to verify admission detail upsert: ${error.message}`);
  }

  const foundDepartmentIds = new Set((data ?? []).map((detail) => detail.department_id));
  for (const departmentId of departmentIds) {
    if (!foundDepartmentIds.has(departmentId)) {
      throw new Error(`Missing admission details after apply for department ${departmentId}`);
    }
  }
}

function reportForOutput(plan) {
  return {
    universityId: plan.universityId,
    mode,
    sourceFiles: plan.sourceFiles,
    existingDepartments: plan.existingDepartments,
    matchedExisting: plan.matchedExisting.length,
    matchedExistingDetails: plan.matchedExisting,
    newDepartments: plan.newDepartments.map(({ sourceFile, ...department }) => ({
      ...department,
      sourceFile,
    })),
    duplicateNameDifferentLevel: plan.duplicateNameDifferentLevel,
    existingWithoutSource: plan.existingWithoutSource,
    programPlans: plan.programPlans,
    specialChecks: {
      medtec: plan.programPlans.filter((programPlan) => programPlan.normalizedName === "medtec school"),
      newBachelorProgrammes: plan.programPlans.filter(
        (programPlan) => programPlan.level === "bachelor" && programPlan.action === "new-department"
      ),
      rawLevelNormalized: plan.programPlans.filter((programPlan) => programPlan.rawLevelNormalized),
    },
    warnings: plan.warnings,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const supabase = createSupabaseClient();
  const sourcePrograms = loadSourcePrograms();
  const dbDepartments = await fetchPolimiDepartments(supabase);
  const plan = createPlan(sourcePrograms, dbDepartments);
  const report = reportForOutput(plan);

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (mode === "apply") {
    if (plan.warnings.length > 0) {
      throw new Error(
        `Refusing --apply because the import plan has warnings: ${plan.warnings.join(" | ")}`
      );
    }
    await applyPlan(supabase, plan);
    console.log(`[OK] Applied ${sourcePrograms.length} Polimi program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
