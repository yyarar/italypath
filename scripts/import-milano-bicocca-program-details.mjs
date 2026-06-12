import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const UNIMIB_UNIVERSITY_ID = 29;
const EXPECTED_IMPORT_COUNT = 12;
const SOURCE_GENERATED_AT = "2026-06-10";
const RESULTS_DIR = resolve(
  process.cwd(),
  "milano-bicocca-english-program-admission-requirements/results"
);
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "milano-bicocca-program-details-import-report.json");
const PAGE_SIZE = 1000;
const VALID_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
const VALID_LANGUAGES = new Set(["en", "it"]);
const ADMISSION_DETAIL_COLUMNS =
  "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file";

const EXCLUDED_SOURCE_FILES = new Set();

const DUPLICATE_DEPARTMENT_IDS = new Set();

const SOURCE_OVERRIDES = new Map([
  [
    "bsc-economics-science-environmental-sustainability.json",
    {
      departmentName: "Economics and Science for Environmental Sustainability",
      slug: "economics-and-science-for-environmental-sustainability",
    },
  ],
  [
    "msc-applied-experimental-psychological-sciences.json",
    {
      departmentName: "Applied Experimental Psychological Sciences",
      slug: "applied-experimental-psychological-sciences",
    },
  ],
]);

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
      ? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      mode === "apply"
        ? "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY are required for --apply."
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
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function collapseWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

function canonicalDepartmentName(value) {
  return collapseWhitespace(value)
    .replace(/^\[uncertain\]\s*/i, "")
    .replace(/\s*\[[^\]]+\]\s*$/, "")
    .trim();
}

function slugSourceName(value) {
  return value.replace(/\s*\([^)]*\)\s*/g, " ");
}

function createSlug(value) {
  return normalizeName(slugSourceName(value)).replace(/\s+/g, "-");
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

  if (/\beng\b/.test(text) || text.includes("english")) languages.push("en");
  if (/\bita\b/.test(text) || text.includes("italian")) languages.push("it");

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

function assertNonEmptyArray(record, field, file) {
  assertArray(record, field, file);
  if (record[field].length === 0) {
    throw new Error(`${file} has empty ${field}`);
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
      .filter(([key]) => !["sources", "source_url"].includes(key))
      .map(([key, itemValue]) => {
        const normalized = optionalText(itemValue);
        return normalized ? `${humanizeKey(key)}: ${normalized}` : null;
      })
      .filter(Boolean);

    return entries.length > 0 ? entries.join("; ") : null;
  }

  return String(value);
}

function humanizeKey(value) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const normalized = optionalText(item);
    return normalized ? [normalized] : [];
  });
}

function formatDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return optionalText(value);
  }

  const documentName = optionalText(value.document_name);
  const stage = optionalText(value.stage);
  const requiredFor = optionalText(value.required_for);
  const notes = optionalText(value.notes);
  const context = [stage, requiredFor].filter(Boolean).join(" · ");

  if (documentName && context && notes) return `${documentName} (${context}): ${notes}`;
  if (documentName && context) return `${documentName} (${context})`;
  if (documentName && notes) return `${documentName}: ${notes}`;
  if (documentName) return documentName;

  return optionalText(value);
}

function normalizeDocumentArray(value) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const normalized = formatDocument(item);
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
        : typeof item.field_supported === "string"
          ? [item.field_supported]
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
  const allFiles = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const skipped = [];
  const programs = [];

  for (const file of allFiles) {
    const absolutePath = join(RESULTS_DIR, file);
    const record = JSON.parse(readFileSync(absolutePath, "utf8"));

    if (EXCLUDED_SOURCE_FILES.has(file)) {
      skipped.push({
        file,
        program_name: typeof record.program_name === "string" ? record.program_name : null,
        level: typeof record.level === "string" ? record.level : null,
        teaching_language:
          typeof record.teaching_language === "string" ? record.teaching_language : null,
        reason: "skipped (Italian / out of scope)",
      });
      continue;
    }

    for (const field of [
      "program_name",
      "level",
      "teaching_language",
      "official_program_url",
    ]) {
      assertStringRecord(record, field, file);
    }

    // UNIMIB JSONs sometimes have string instead of array for these fields — coerce.
    for (const field of ["required_documents", "uncertain", "uncertainty_notes"]) {
      if (typeof record[field] === "string") {
        const trimmed = record[field].trim();
        record[field] = trimmed ? [trimmed] : [];
      } else if (record[field] == null) {
        record[field] = [];
      }
    }

    for (const field of ["required_documents", "source_quotes", "uncertain", "uncertainty_notes"]) {
      assertArray(record, field, file);
    }
    assertNonEmptyArray(record, "required_documents", file);
    assertNonEmptyArray(record, "source_quotes", file);

    const teachingLanguageTrimmed = record.teaching_language.trim();
    const teachingLanguageLower = teachingLanguageTrimmed.toLowerCase();
    if (teachingLanguageLower.startsWith("italian")) {
      throw new Error(
        `${file} is Italian-only but not in EXCLUDED_SOURCE_FILES — refusing to import.`
      );
    }

    const level = normalizeLevel(record.level);
    const rawProgramName = record.program_name;
    const sourceProgramName = collapseWhitespace(rawProgramName);

    const override = SOURCE_OVERRIDES.get(file);
    const departmentName = override?.departmentName
      ? override.departmentName
      : canonicalDepartmentName(sourceProgramName);
    if (!departmentName) {
      throw new Error(`${file} has empty canonical department name`);
    }

    const languages = normalizeLanguages(teachingLanguageTrimmed);
    if (teachingLanguageTrimmed === "English" && JSON.stringify(languages) !== "[\"en\"]") {
      throw new Error(`${file} has English teaching language but did not normalize to [\"en\"]`);
    }
    if (languages.length === 0) {
      throw new Error(`${file} produced an empty languages array from "${teachingLanguageTrimmed}"`);
    }

    programs.push({
      file,
      rawProgramName,
      sourceProgramName,
      departmentName,
      overrideSlug: override?.slug ?? null,
      normalizedSourceName: normalizeName(sourceProgramName),
      normalizedName: normalizeName(departmentName),
      level,
      rawLevel: record.level.trim(),
      teachingLanguage: teachingLanguageTrimmed,
      languages,
      durationYears: durationForLevel(level),
      raw: record,
    });
  }

  return { programs, skipped };
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

async function fetchUnimibDepartments(supabase) {
  return fetchAllRows(
    supabase,
    "university_departments",
    "id,university_id,name,slug,languages,duration_years,level,sort_order",
    (query) =>
      query
        .eq("university_id", UNIMIB_UNIVERSITY_ID)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
  );
}

function identityKey(name, level) {
  return `${normalizeName(canonicalDepartmentName(name))}::${level}`;
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

function listChangedFields(from, to) {
  return Object.keys(to).filter((field) => {
    const fromValue = from[field];
    const toValue = to[field];
    return JSON.stringify(fromValue) !== JSON.stringify(toValue);
  });
}

function createDepartmentCorrection(source, department) {
  const to = {
    languages: source.languages.length > 0 ? source.languages : ["en"],
    duration_years: source.durationYears,
    level: source.level,
  };
  const from = {
    languages: department.languages,
    duration_years: department.duration_years,
    level: department.level,
  };
  const changedFields = listChangedFields(from, to);

  if (changedFields.length === 0) return null;

  return {
    id: department.id,
    sourceFile: source.file,
    rawProgramName: source.rawProgramName,
    sourceProgramName: source.sourceProgramName,
    canonicalDepartmentName: source.departmentName,
    from,
    to,
    changedFields,
  };
}

function createPlan(sourcePrograms, skipped, dbDepartments) {
  const byName = new Map();
  const usedSlugs = new Set(dbDepartments.map((department) => department.slug));
  const maxSortOrder = dbDepartments.reduce(
    (max, department) =>
      Number.isFinite(department.sort_order) ? Math.max(max, department.sort_order) : max,
    0
  );

  for (const department of dbDepartments) {
    if (DUPLICATE_DEPARTMENT_IDS.has(department.id)) continue;
    const key = normalizeName(canonicalDepartmentName(department.name));
    const list = byName.get(key) ?? [];
    list.push(department);
    byName.set(key, list);
  }

  const matchedExisting = [];
  const departmentCorrections = [];
  const newDepartments = [];
  const detailRows = [];
  const programPlans = [];
  const warnings = [];

  if (sourcePrograms.length !== EXPECTED_IMPORT_COUNT) {
    warnings.push(
      `Expected ${EXPECTED_IMPORT_COUNT} in-scope source JSON files but found ${sourcePrograms.length}.`
    );
  }
  if (skipped.length !== EXCLUDED_SOURCE_FILES.size) {
    warnings.push(
      `Expected ${EXCLUDED_SOURCE_FILES.size} skipped (Italian/out-of-scope) files but found ${skipped.length}.`
    );
  }

  for (const source of sourcePrograms) {
    const candidates = byName.get(source.normalizedName) ?? [];
    const exactLevel = candidates.find((candidate) => candidate.level === source.level);

    let department = exactLevel;
    let action = exactLevel ? "matched-existing" : "new-department";

    if (department) {
      const correction = createDepartmentCorrection(source, department);
      if (correction) {
        departmentCorrections.push(correction);
      }

      matchedExisting.push({
        id: department.id,
        name: department.name,
        slug: department.slug,
        level: department.level,
        sourceFile: source.file,
        rawProgramName: source.rawProgramName,
        sourceProgramName: source.sourceProgramName,
        canonicalDepartmentName: source.departmentName,
      });
    } else {
      const baseSlug = source.overrideSlug ?? createSlug(source.departmentName);
      const slug = nextSlug(baseSlug, usedSlugs, source.level);
      usedSlugs.add(slug);

      department = {
        id: null,
        university_id: UNIMIB_UNIVERSITY_ID,
        name: source.departmentName,
        slug,
        languages: source.languages.length > 0 ? source.languages : ["en"],
        duration_years: source.durationYears,
        level: source.level,
        sort_order: maxSortOrder + newDepartments.length + 1,
      };
      newDepartments.push({
        ...department,
        sourceFile: source.file,
        rawProgramName: source.rawProgramName,
        sourceProgramName: source.sourceProgramName,
        canonicalDepartmentName: source.departmentName,
      });
    }

    programPlans.push({
      sourceFile: source.file,
      rawProgramName: source.rawProgramName,
      sourceProgramName: source.sourceProgramName,
      canonicalDepartmentName: source.departmentName,
      normalizedName: source.normalizedName,
      level: source.level,
      teachingLanguage: source.teachingLanguage,
      languages: source.languages,
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

  const duplicateDepartmentsToCleanUp = dbDepartments
    .filter((department) => DUPLICATE_DEPARTMENT_IDS.has(department.id))
    .map((department) => ({
      id: department.id,
      name: department.name,
      slug: department.slug,
      level: department.level,
      note:
        "duplicate to clean up — bachelor source Computer_Engineering_Bachelor.json (campus Imperia, code 12133) was mapped to id 383 (slug 'computer-engineering'). This script intentionally leaves id 384 in place; deletion is a manual decision.",
    }));

  return {
    universityId: UNIMIB_UNIVERSITY_ID,
    sourceFiles: sourcePrograms.length,
    skippedFiles: skipped,
    existingDepartments: dbDepartments.length,
    matchedExisting,
    departmentCorrections,
    newDepartments,
    duplicateDepartmentsToCleanUp,
    detailRows,
    programPlans,
    warnings,
  };
}

function toDetailPayload(source, departmentId) {
  return {
    department_id: departmentId,
    university_id: UNIMIB_UNIVERSITY_ID,
    raw_program_name: source.raw.program_name.trim(),
    raw_level: source.raw.level.trim(),
    raw_teaching_language: source.raw.teaching_language.trim(),
    campus: optionalText(source.raw.campus),
    degree_class: optionalText(source.raw.degree_class),
    admission_type: optionalText(source.raw.admission_type),
    academic_requirements: optionalText(source.raw.academic_requirements),
    language_requirements: optionalText(source.raw.language_requirements),
    application_deadline_eu: optionalText(source.raw.application_deadline_eu),
    application_deadline_non_eu: optionalText(source.raw.application_deadline_non_eu),
    required_documents: normalizeDocumentArray(source.raw.required_documents),
    entry_exam_or_test: optionalText(source.raw.entry_exam_or_test),
    tuition_or_fees_link: optionalText(source.raw.tuition_or_fees_link),
    official_program_url: source.raw.official_program_url.trim(),
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

function validateDetailPayload(detail) {
  for (const field of [
    "raw_program_name",
    "raw_level",
    "raw_teaching_language",
    "official_program_url",
    "source_file",
  ]) {
    if (typeof detail[field] !== "string" || detail[field].trim().length === 0) {
      throw new Error(`Detail payload for department ${detail.department_id} has missing ${field}`);
    }
  }

  for (const field of ["required_documents", "source_quotes", "uncertain", "uncertainty_notes"]) {
    if (!Array.isArray(detail[field])) {
      throw new Error(`Detail payload for department ${detail.department_id} has non-array ${field}`);
    }
  }
}

async function applyPlan(supabase, plan) {
  let mutatedDepartments = false;
  let detailPayloads = [];
  let admissionDetailSnapshot = { existingRows: [], departmentIds: [] };

  try {
    if (plan.newDepartments.length > 0) {
      const { error } = await supabase
        .from("university_departments")
        .insert(plan.newDepartments.map(toDepartmentPayload));
      if (error) throw new Error(`Failed to insert departments: ${error.message}`);
      mutatedDepartments = true;
    }

    for (const correction of plan.departmentCorrections) {
      const { error } = await supabase
        .from("university_departments")
        .update(correction.to)
        .eq("id", correction.id);
      if (error) {
        throw new Error(`Failed to update department ${correction.id}: ${error.message}`);
      }
      mutatedDepartments = true;
    }

    const refreshedDepartments = await fetchUnimibDepartments(supabase);
    const refreshedByIdentity = new Map();
    for (const department of refreshedDepartments) {
      if (DUPLICATE_DEPARTMENT_IDS.has(department.id)) continue;
      refreshedByIdentity.set(identityKey(department.name, department.level), department);
    }

    detailPayloads = plan.detailRows.map(({ source, department }) => {
      let resolved = refreshedByIdentity.get(identityKey(source.departmentName, source.level));
      if (!resolved && department?.id) {
        resolved = refreshedDepartments.find((candidate) => candidate.id === department.id);
      }
      if (!resolved?.id) {
        throw new Error(`Cannot resolve department id for ${source.departmentName} (${source.level})`);
      }
      const payload = toDetailPayload(source, resolved.id);
      validateDetailPayload(payload);
      return payload;
    });

    admissionDetailSnapshot = await snapshotAdmissionDetails(
      supabase,
      detailPayloads.map((detail) => detail.department_id)
    );

    const { error } = await supabase
      .from("program_admission_details")
      .upsert(detailPayloads, { onConflict: "department_id" });
    if (error) throw new Error(`Failed to upsert admission details: ${error.message}`);

    await verifyApplyResult(supabase, detailPayloads);
  } catch (error) {
    await rollbackAdmissionDetails(supabase, admissionDetailSnapshot);
    if (mutatedDepartments) {
      await rollbackPlan(supabase, plan);
    }
    throw error;
  }

  return {
    detailUpserts: detailPayloads.length,
    newDepartmentsInserted: plan.newDepartments.length,
    departmentCorrectionsUpdated: plan.departmentCorrections.length,
  };
}

async function snapshotAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return { existingRows: [], departmentIds: [] };

  const { data, error } = await supabase
    .from("program_admission_details")
    .select(ADMISSION_DETAIL_COLUMNS)
    .eq("university_id", UNIMIB_UNIVERSITY_ID)
    .in("department_id", departmentIds);

  if (error) {
    throw new Error(`Failed to snapshot existing admission details: ${error.message}`);
  }

  return {
    existingRows: data ?? [],
    departmentIds,
  };
}

async function rollbackAdmissionDetails(supabase, snapshot) {
  if (!snapshot.departmentIds || snapshot.departmentIds.length === 0) return;

  const existingIds = new Set(snapshot.existingRows.map((row) => row.department_id));
  const newDetailIds = snapshot.departmentIds.filter((departmentId) => !existingIds.has(departmentId));

  const failures = [];
  if (newDetailIds.length > 0) {
    const { error } = await supabase
      .from("program_admission_details")
      .delete()
      .eq("university_id", UNIMIB_UNIVERSITY_ID)
      .in("department_id", newDetailIds);
    if (error) failures.push(`delete new details: ${error.message}`);
  }

  if (snapshot.existingRows.length > 0) {
    const { error } = await supabase
      .from("program_admission_details")
      .upsert(snapshot.existingRows, { onConflict: "department_id" });
    if (error) failures.push(`restore existing details: ${error.message}`);
  }

  if (failures.length > 0) {
    throw new Error(`Admission detail rollback failed: ${failures.join(" | ")}`);
  }
}

async function rollbackPlan(supabase, plan) {
  const failures = [];

  for (const correction of [...plan.departmentCorrections].reverse()) {
    const { error } = await supabase
      .from("university_departments")
      .update(correction.from)
      .eq("id", correction.id);
    if (error) failures.push(`${correction.id}: ${error.message}`);
  }

  if (plan.newDepartments.length > 0) {
    const slugs = plan.newDepartments.map((department) => department.slug);
    const { error } = await supabase
      .from("university_departments")
      .delete()
      .eq("university_id", UNIMIB_UNIVERSITY_ID)
      .in("slug", slugs);
    if (error) failures.push(`new departments: ${error.message}`);
  }

  if (failures.length > 0) {
    throw new Error(`Apply failed, and department rollback also failed: ${failures.join(" | ")}`);
  }
}

async function verifyApplyResult(supabase, detailPayloads) {
  const departmentIds = detailPayloads.map((detail) => detail.department_id);
  const { data, error } = await supabase
    .from("program_admission_details")
    .select("department_id")
    .eq("university_id", UNIMIB_UNIVERSITY_ID)
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

function reportForOutput(plan, applyResult = null) {
  return {
    universityId: plan.universityId,
    mode,
    sourceFiles: plan.sourceFiles,
    expectedImportCount: EXPECTED_IMPORT_COUNT,
    skippedFiles: plan.skippedFiles,
    existingDepartments: plan.existingDepartments,
    matchedExisting: plan.matchedExisting.length,
    matchedExistingDetails: plan.matchedExisting,
    departmentCorrections: plan.departmentCorrections,
    newDepartments: plan.newDepartments.map(({ sourceFile, ...department }) => ({
      ...department,
      sourceFile,
    })),
    duplicateDepartmentsToCleanUp: plan.duplicateDepartmentsToCleanUp,
    programPlans: plan.programPlans,
    warnings: plan.warnings,
    applied: applyResult,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const supabase = createSupabaseClient();
  const { programs, skipped } = loadSourcePrograms();
  const dbDepartments = await fetchUnimibDepartments(supabase);
  const plan = createPlan(programs, skipped, dbDepartments);
  let report = reportForOutput(plan);

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (mode === "apply") {
    if (plan.warnings.length > 0) {
      throw new Error(
        `Refusing --apply because the import plan has warnings: ${plan.warnings.join(" | ")}`
      );
    }
    const applyResult = await applyPlan(supabase, plan);
    report = reportForOutput(plan, applyResult);
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`[OK] Applied ${applyResult.detailUpserts} University of Milano-Bicocca program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
