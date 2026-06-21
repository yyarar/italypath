import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const LINK_CAMPUS_UNIVERSITY_ID = 42;
const EXPECTED_IMPORT_COUNT = 6;
const SOURCE_GENERATED_AT = "2026-06-19";
const RESULTS_DIR = resolve(
  process.cwd(),
  "link-campus-english-program-admission-requirements/results"
);
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "link-campus-program-details-import-report.json");
const PAGE_SIZE = 1000;
const VALID_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
const VALID_LANGUAGES = new Set(["en", "it"]);
const ADMISSION_DETAIL_COLUMNS =
  "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file,imported_at,updated_at";

const SOURCE_OVERRIDES = new Map([
  [
    "Corporate_Management_and_Public_Administration.json",
    { departmentName: "Finance and Artificial Intelligence" },
  ],
  [
    "Media_and_Cultural_Industries.json",
    { departmentName: "Digital Communication Strategies for Media Industries" },
  ],
  [
    "Strategic_Studies_and_Security_Policies.json",
    { departmentName: "Global Affairs and International Relations" },
  ],
]);

const SOURCE_TO_EXISTING_SLUG_ALIASES = new Map([
  [
    identityKey("Political Science, Diplomacy and Government of Administration", "bachelor"),
    "political-science-diplomacy-and-government-of-administrations",
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
      ? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
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
    .replace(/–|—/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripUncertainMarker(value) {
  return value
    .replace(/^\[uncertain\]\s*/i, "")
    .replace(/\s*\[uncertain\]\s*$/i, "")
    .trim();
}

function collapseWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

function canonicalDepartmentName(value) {
  return collapseWhitespace(stripUncertainMarker(value));
}

function createSlug(value) {
  return normalizeName(value).replace(/\s+/g, "-");
}

function normalizeLevel(value) {
  const normalized = stripUncertainMarker(value.trim());
  if (VALID_LEVELS.has(normalized)) return normalized;
  throw new Error(`Invalid level: ${value}`);
}

function normalizeLanguages(rawTeachingLanguage) {
  const text = rawTeachingLanguage.toLowerCase();
  const languages = [];

  if (/\beng\b/.test(text) || text.includes("english")) languages.push("en");
  if (/\bita\b/.test(text) || text.includes("italian")) languages.push("it");

  return [...new Set(languages.filter((language) => VALID_LANGUAGES.has(language)))];
}

function defaultDurationForLevel(level) {
  if (level === "single-cycle") return 6;
  if (level === "master") return 2;
  return 3;
}

function identityKey(name, level) {
  return `${normalizeName(canonicalDepartmentName(name))}::${level}`;
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
    const entries = Object.entries(value)
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
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const normalized = optionalText(item);
      return normalized ? [normalized] : [];
    });
  }
  const normalized = optionalText(value);
  return normalized ? [normalized] : [];
}

function normalizeRequiredDocuments(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const normalized = optionalText(item);
      return normalized ? [normalized] : [];
    });
  }
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  const lines = trimmed
    .split(/\r?\n|•|·|^\s*[-*]\s+/m)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) return lines;

  const semis = trimmed
    .split(/;\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return semis.length > 0 ? semis : [trimmed];
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
          : typeof item.field === "string"
            ? [item.field]
            : [];

    const retrievedAt =
      typeof item.retrieved_at === "string" && item.retrieved_at.trim()
        ? item.retrieved_at.trim()
        : typeof item.accessed_on === "string" && item.accessed_on.trim()
          ? item.accessed_on.trim()
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
    for (const field of ["source_quotes", "uncertain"]) {
      assertArray(record, field, file);
    }
    assertNonEmptyArray(record, "source_quotes", file);

    if (typeof record.required_documents !== "string" && !Array.isArray(record.required_documents)) {
      throw new Error(`${file} has non-string/non-array required_documents`);
    }
    if (typeof record.uncertainty_notes !== "string" && !Array.isArray(record.uncertainty_notes)) {
      throw new Error(`${file} has non-string/non-array uncertainty_notes`);
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

    const languages = normalizeLanguages(record.teaching_language);
    if (languages.length === 0) {
      throw new Error(`${file} did not normalize to any supported department language`);
    }

    return {
      file,
      rawProgramName,
      sourceProgramName,
      departmentName,
      overrideSlug: override?.slug ?? null,
      normalizedSourceName: normalizeName(sourceProgramName),
      normalizedName: normalizeName(departmentName),
      level,
      rawLevel: record.level.trim(),
      teachingLanguage: record.teaching_language.trim(),
      languages,
      durationYears: override?.durationYears ?? defaultDurationForLevel(level),
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

async function fetchLinkCampusUniversity(supabase) {
  const { data, error } = await supabase
    .from("universities")
    .select("id,name,city,sort_order")
    .eq("id", LINK_CAMPUS_UNIVERSITY_ID)
    .single();

  if (error) throw new Error(`Failed to fetch Link Campus university row: ${error.message}`);
  if (!data || data.name !== "Link Campus University") {
    throw new Error(
      `Refusing to import: expected university ${LINK_CAMPUS_UNIVERSITY_ID} to be 'Link Campus University', got '${data?.name ?? "missing"}'.`
    );
  }

  return data;
}

async function fetchLinkCampusDepartments(supabase) {
  return fetchAllRows(
    supabase,
    "university_departments",
    "id,university_id,name,slug,languages,duration_years,level,sort_order",
    (query) =>
      query
        .eq("university_id", LINK_CAMPUS_UNIVERSITY_ID)
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

function desiredSlugForExisting(source, department, dbDepartments, usedSlugs) {
  const desiredSlug = source.overrideSlug ?? createSlug(source.departmentName);
  const conflictingDepartment = dbDepartments.find(
    (candidate) => candidate.id !== department.id && candidate.slug === desiredSlug
  );

  if (conflictingDepartment || usedSlugs.has(desiredSlug)) {
    return department.slug;
  }

  usedSlugs.add(desiredSlug);
  return desiredSlug;
}

function listChangedFields(from, to) {
  return Object.keys(to).filter((field) => {
    const fromValue = from[field];
    const toValue = to[field];
    return JSON.stringify(fromValue) !== JSON.stringify(toValue);
  });
}

function createDepartmentCorrection(source, department, dbDepartments, usedSlugs) {
  const to = {
    name: source.departmentName,
    slug: desiredSlugForExisting(source, department, dbDepartments, usedSlugs),
    languages: source.languages,
    duration_years: source.durationYears,
    level: source.level,
  };
  const from = {
    name: department.name,
    slug: department.slug,
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

function createPlan(university, sourcePrograms, dbDepartments) {
  const byName = new Map();
  const bySlug = new Map(dbDepartments.map((department) => [department.slug, department]));
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
  const departmentCorrections = [];
  const newDepartments = [];
  const detailRows = [];
  const programPlans = [];
  const sourceWithoutExisting = [];
  const aliasLevelMismatches = [];
  const warnings = [];

  if (sourcePrograms.length !== EXPECTED_IMPORT_COUNT) {
    warnings.push(
      `Expected ${EXPECTED_IMPORT_COUNT} source JSON files but found ${sourcePrograms.length}.`
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
    const exactLevel = candidates.find((candidate) => candidate.level === source.level);
    const aliasSlug = SOURCE_TO_EXISTING_SLUG_ALIASES.get(identityKey(source.departmentName, source.level));
    const aliasCandidate = aliasSlug ? bySlug.get(aliasSlug) : undefined;
    const validAliasCandidate =
      aliasCandidate && aliasCandidate.level === source.level ? aliasCandidate : undefined;

    if (aliasCandidate && aliasCandidate.level !== source.level) {
      aliasLevelMismatches.push({
        sourceFile: source.file,
        sourceProgramName: source.sourceProgramName,
        sourceLevel: source.level,
        aliasSlug,
        aliasLevel: aliasCandidate.level,
      });
      warnings.push(
        `Alias ${aliasSlug} for ${source.sourceProgramName} points to level ${aliasCandidate.level}, not ${source.level}.`
      );
    }

    let department = exactLevel ?? validAliasCandidate;
    let action = exactLevel
      ? "matched-existing"
      : validAliasCandidate
        ? "alias-correction"
        : "new-department";

    if (department) {
      const correction = createDepartmentCorrection(source, department, dbDepartments, usedSlugs);
      if (correction) departmentCorrections.push(correction);

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
        university_id: LINK_CAMPUS_UNIVERSITY_ID,
        name: source.departmentName,
        slug,
        languages: source.languages,
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
      sourceWithoutExisting.push({
        sourceFile: source.file,
        sourceProgramName: source.sourceProgramName,
        canonicalDepartmentName: source.departmentName,
        level: source.level,
        plannedSlug: slug,
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
      teachingLanguage: source.teachingLanguage,
      action,
      departmentId: department.id,
      departmentName: department.name,
      departmentSlug: department.slug,
      levelBefore: department.level,
      levelAfter: source.level,
      languagesAfter: source.languages,
    });

    detailRows.push({ source, department });
  }

  const sourceIdentityKeys = new Set(
    sourcePrograms.map((source) => identityKey(source.departmentName, source.level))
  );
  const correctionsByDepartmentId = new Map(
    departmentCorrections.map((correction) => [correction.id, correction.to])
  );
  const projectedExistingDepartments = dbDepartments.map((department) => ({
    ...department,
    ...correctionsByDepartmentId.get(department.id),
  }));
  const existingWithoutSource = projectedExistingDepartments
    .filter((department) => !sourceIdentityKeys.has(identityKey(department.name, department.level)))
    .map((department) => ({
      id: department.id,
      name: department.name,
      slug: department.slug,
      level: department.level,
    }));

  return {
    university,
    universityId: LINK_CAMPUS_UNIVERSITY_ID,
    sourceFiles: sourcePrograms.length,
    sourceFilesExpected: EXPECTED_IMPORT_COUNT,
    existingDepartments: dbDepartments.length,
    matchedExisting,
    departmentCorrections,
    newDepartments,
    aliasLevelMismatches,
    sourceWithoutExisting,
    existingWithoutSource,
    detailRows,
    programPlans,
    warnings,
  };
}

function toDetailPayload(source, departmentId) {
  const raw = source.raw;

  return {
    department_id: departmentId,
    university_id: LINK_CAMPUS_UNIVERSITY_ID,
    raw_program_name: raw.program_name.trim(),
    raw_level: raw.level.trim(),
    raw_teaching_language: raw.teaching_language.trim(),
    campus: optionalText(raw.campus),
    degree_class: optionalText(raw.degree_class),
    admission_type: optionalText(raw.admission_type),
    academic_requirements: optionalText(raw.academic_requirements),
    language_requirements: optionalText(raw.language_requirements),
    application_deadline_eu: optionalText(raw.application_deadline_eu),
    application_deadline_non_eu: optionalText(raw.application_deadline_non_eu),
    required_documents: normalizeRequiredDocuments(raw.required_documents),
    entry_exam_or_test: optionalText(raw.entry_exam_or_test),
    tuition_or_fees_link: optionalText(raw.tuition_or_fees_link),
    official_program_url: raw.official_program_url.trim(),
    official_call_url: optionalText(raw.official_call_url),
    source_quotes: normalizeSourceQuotes(raw.source_quotes),
    uncertain: normalizeStringArray(raw.uncertain),
    uncertainty_notes: normalizeStringArray(raw.uncertainty_notes),
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

async function snapshotAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return { existingRows: [], departmentIds: [] };

  const { data, error } = await supabase
    .from("program_admission_details")
    .select(ADMISSION_DETAIL_COLUMNS)
    .eq("university_id", LINK_CAMPUS_UNIVERSITY_ID)
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
      .eq("university_id", LINK_CAMPUS_UNIVERSITY_ID)
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
    throw new Error(`Rollback admission details failed: ${failures.join("; ")}`);
  }
}

async function rollbackPlan(supabase, plan) {
  const failures = [];

  if (plan.newDepartments.length > 0) {
    const slugs = plan.newDepartments.map((department) => department.slug);
    const { error } = await supabase
      .from("university_departments")
      .delete()
      .eq("university_id", LINK_CAMPUS_UNIVERSITY_ID)
      .in("slug", slugs);
    if (error) failures.push(`delete inserted departments: ${error.message}`);
  }

  for (const correction of plan.departmentCorrections) {
    const { error } = await supabase
      .from("university_departments")
      .update(correction.from)
      .eq("id", correction.id)
      .eq("university_id", LINK_CAMPUS_UNIVERSITY_ID);
    if (error) failures.push(`restore department ${correction.id}: ${error.message}`);
  }

  if (failures.length > 0) {
    throw new Error(`Rollback department changes failed: ${failures.join("; ")}`);
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
        .eq("id", correction.id)
        .eq("university_id", LINK_CAMPUS_UNIVERSITY_ID);
      if (error) {
        throw new Error(`Failed to update department ${correction.id}: ${error.message}`);
      }
      mutatedDepartments = true;
    }

    const refreshedDepartments = await fetchLinkCampusDepartments(supabase);
    const refreshedByIdentity = new Map();
    for (const department of refreshedDepartments) {
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
    if (mutatedDepartments) await rollbackPlan(supabase, plan);
    throw error;
  }

  return {
    detailUpserts: detailPayloads.length,
    newDepartmentsInserted: plan.newDepartments.length,
    departmentCorrectionsUpdated: plan.departmentCorrections.length,
  };
}

async function verifyApplyResult(supabase, expectedDetails) {
  if (expectedDetails.length === 0) return;

  const expectedIds = expectedDetails.map((detail) => detail.department_id);
  const { data, error } = await supabase
    .from("program_admission_details")
    .select("department_id,university_id,raw_program_name,source_file")
    .eq("university_id", LINK_CAMPUS_UNIVERSITY_ID)
    .in("department_id", expectedIds);
  if (error) throw new Error(`Failed to verify admission details: ${error.message}`);

  const rows = data ?? [];
  const importedIds = new Set(rows.map((row) => row.department_id));
  const missingIds = expectedIds.filter((departmentId) => !importedIds.has(departmentId));
  if (missingIds.length > 0) {
    throw new Error(`Missing imported admission details for department ids: ${missingIds.join(", ")}`);
  }

  const byId = new Map(rows.map((row) => [row.department_id, row]));
  for (const expected of expectedDetails) {
    const actual = byId.get(expected.department_id);
    if (actual?.source_file !== expected.source_file) {
      throw new Error(
        `Imported detail source_file mismatch for department ${expected.department_id}: expected ${expected.source_file}, got ${actual?.source_file ?? "missing"}`
      );
    }
  }
}

function createReport(plan, applyResult) {
  return {
    universityId: LINK_CAMPUS_UNIVERSITY_ID,
    university: plan.university,
    mode,
    sourceFiles: plan.sourceFiles,
    sourceFilesExpected: plan.sourceFilesExpected,
    existingDepartments: plan.existingDepartments,
    matchedExisting: plan.matchedExisting.length,
    matchedExistingDetails: plan.matchedExisting,
    departmentCorrections: plan.departmentCorrections,
    newDepartments: plan.newDepartments,
    aliasLevelMismatches: plan.aliasLevelMismatches,
    sourceWithoutExisting: plan.sourceWithoutExisting,
    existingWithoutSource: plan.existingWithoutSource,
    programPlans: plan.programPlans,
    warnings: plan.warnings,
    applyResult,
  };
}

async function main() {
  if (!existsSync(RESULTS_DIR)) {
    throw new Error(`Results directory not found: ${RESULTS_DIR}`);
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const supabase = createSupabaseClient();
  const sourcePrograms = loadSourcePrograms();
  const university = await fetchLinkCampusUniversity(supabase);
  const dbDepartments = await fetchLinkCampusDepartments(supabase);
  const plan = createPlan(university, sourcePrograms, dbDepartments);

  if (plan.sourceFiles !== EXPECTED_IMPORT_COUNT) {
    throw new Error(`Expected ${EXPECTED_IMPORT_COUNT} source JSON files, found ${plan.sourceFiles}.`);
  }
  if (plan.aliasLevelMismatches.length > 0) {
    throw new Error("Alias level mismatch detected; refusing to import.");
  }

  let applyResult = null;
  if (mode === "apply") {
    applyResult = await applyPlan(supabase, plan);
  }

  const report = createReport(plan, applyResult);
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log(
    [
      `Mode: ${mode}`,
      `University: ${university.name} (${LINK_CAMPUS_UNIVERSITY_ID})`,
      `Source files: ${plan.sourceFiles}/${EXPECTED_IMPORT_COUNT}`,
      `Existing departments: ${plan.existingDepartments}`,
      `Matched existing: ${plan.matchedExisting.length}`,
      `Department corrections: ${plan.departmentCorrections.length}`,
      `New departments: ${plan.newDepartments.length}`,
      `Warnings: ${plan.warnings.length}`,
      applyResult ? `Detail upserts: ${applyResult.detailUpserts}` : "Detail upserts: dry-run only",
      `Report: ${REPORT_PATH}`,
    ].join("\n")
  );
  if (plan.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of plan.warnings) console.log(`- ${warning}`);
  }
}

main().catch((error) => {
  console.error(`[${basename(process.argv[1])}] ${error.message}`);
  process.exit(1);
});
