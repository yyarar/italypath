import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const CATTOLICA_UNIVERSITY_ID = 8;
const EXPECTED_SOURCE_FILE_COUNT = 53;
const SKIPPED_LEVEL = "specialising_master";
const SOURCE_GENERATED_AT = "2026-06-20";
const RESULTS_DIR = resolve(process.cwd(), "cattolica-english-programmes/results");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "cattolica-program-details-import-report.json");
const PAGE_SIZE = 1000;
const VALID_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
const VALID_LANGUAGES = new Set(["en", "it"]);
const OPTIONAL_TEXT_METADATA_KEYS = new Set(["sources", "source_url", "source_urls"]);
const ADMISSION_DETAIL_COLUMNS =
  "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file";

const SOURCE_TO_EXISTING_SLUG_ALIASES = new Map([
  ["healthcare management hema", "healthcare-management"],
  ["methods and topics in arts management matam", "methods-and-topics-in-arts-management"],
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
      .filter(([key]) => !OPTIONAL_TEXT_METADATA_KEYS.has(key))
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

function normalizeSourceQuotes(value, file = "source_quotes") {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${file} has malformed source_quotes[${index}]`);
    }

    const quote = typeof item.quote === "string" ? item.quote.trim() : "";
    const url =
      typeof item.url === "string"
        ? item.url.trim()
        : typeof item.source_url === "string"
          ? item.source_url.trim()
          : "";
    let fieldRefs = [];
    if (Array.isArray(item.field_refs)) fieldRefs = item.field_refs;
    else if (Array.isArray(item.supports_fields)) fieldRefs = item.supports_fields;
    else if (typeof item.field_supported === "string") fieldRefs = [item.field_supported];
    else if (typeof item.field === "string") fieldRefs = [item.field];

    const retrievedAt =
      typeof item.retrieved_at === "string" && item.retrieved_at.trim()
        ? item.retrieved_at.trim()
        : SOURCE_GENERATED_AT;

    if (!quote) {
      throw new Error(`${file} has source_quotes[${index}] missing quote`);
    }
    if (!url) {
      throw new Error(`${file} has source_quotes[${index}] missing url or source_url`);
    }

    return {
      url,
      quote,
      field_refs: normalizeStringArray(fieldRefs),
      retrieved_at: retrievedAt,
    };
  });
}

function flattenCattolicaRecord(record, file) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error(`${file} has malformed root JSON`);
  }
  for (const section of [
    "identification",
    "admission_logistics",
    "requirements",
    "sources_and_uncertainty",
  ]) {
    if (!record[section] || typeof record[section] !== "object" || Array.isArray(record[section])) {
      throw new Error(`${file} is missing section "${section}"`);
    }
  }

  const id = record.identification;
  const al = record.admission_logistics;
  const req = record.requirements;
  const sau = record.sources_and_uncertainty;

  return {
    cattolica_id: typeof record.id === "string" ? record.id : null,
    program_name: id.program_name,
    level: id.level,
    teaching_language: id.teaching_language,
    campus: id.campus,
    degree_class: id.degree_class,
    admission_type: al.admission_type,
    application_rounds: Array.isArray(al.application_rounds) ? al.application_rounds : [],
    application_deadline_eu: al.application_deadline_eu,
    application_deadline_non_eu: al.application_deadline_non_eu,
    entry_exam_or_test: al.entry_exam_or_test,
    tuition_or_fees_link: al.tuition_or_fees_link,
    official_program_url: al.official_program_url,
    official_call_url: al.official_call_url,
    academic_requirements: req.academic_requirements,
    language_requirements: req.language_requirements,
    required_documents: req.required_documents,
    source_quotes: sau.source_quotes,
    uncertainty_notes_raw: sau.uncertainty_notes,
    uncertain: Array.isArray(record.uncertain) ? record.uncertain : [],
  };
}

function summarizeApplicationRounds(rounds) {
  if (!Array.isArray(rounds) || rounds.length === 0) return null;

  const parts = rounds.map((round, index) => {
    const number =
      round && (round.round_number ?? round.round) != null
        ? String(round.round_number ?? round.round)
        : String(index + 1);
    const eu = `${round?.eu_pool_open ?? "?"}→${round?.eu_pool_close ?? "?"}`;
    const nonEu = `${round?.non_eu_pool_open ?? "?"}→${round?.non_eu_pool_close ?? "?"}`;
    const flags = [];
    if (round?.scholarship_eligible === true) flags.push("scholarship-eligible");
    else if (round?.scholarship_eligible === false) flags.push("not scholarship-eligible");
    else if (typeof round?.scholarship_eligible === "string" && round.scholarship_eligible.trim()) {
      flags.push(`scholarship_eligible=${round.scholarship_eligible.trim()}`);
    }
    if (round?.visa_recommended === true) flags.push("visa-recommended");
    else if (round?.visa_recommended === false) flags.push("visa-not-required");
    const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
    const notes =
      typeof round?.notes === "string" && round.notes.trim() ? ` — ${round.notes.trim()}` : "";
    return `R${number}: EU ${eu}; Non-EU ${nonEu}${flagStr}${notes}`;
  });

  return `Application rounds (${rounds.length}): ${parts.join(" | ")}`;
}

function buildUncertaintyNotes(flat) {
  const out = [];
  const rawNotes = flat.uncertainty_notes_raw;
  if (typeof rawNotes === "string" && rawNotes.trim()) {
    out.push(rawNotes.trim());
  } else if (Array.isArray(rawNotes)) {
    out.push(...normalizeStringArray(rawNotes));
  }
  const roundsSummary = summarizeApplicationRounds(flat.application_rounds);
  if (roundsSummary) out.push(roundsSummary);
  return out;
}

function buildRequiredDocuments(flat) {
  const raw = flat.required_documents;
  if (Array.isArray(raw)) {
    return normalizeStringArray(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    return [collapseWhitespace(raw)];
  }
  return [];
}

function loadSourcePrograms() {
  const files = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  if (files.length !== EXPECTED_SOURCE_FILE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_SOURCE_FILE_COUNT} Cattolica source files, found ${files.length}`
    );
  }

  const programs = [];
  const skipped = [];

  for (const file of files) {
    const absolutePath = join(RESULTS_DIR, file);
    const raw = JSON.parse(readFileSync(absolutePath, "utf8"));
    const flat = flattenCattolicaRecord(raw, file);

    const rawLevel = typeof flat.level === "string" ? flat.level.trim() : "";
    if (rawLevel === SKIPPED_LEVEL) {
      skipped.push({
        file,
        programName:
          typeof flat.program_name === "string" ? collapseWhitespace(flat.program_name) : null,
        rawLevel,
        campus: typeof flat.campus === "string" ? collapseWhitespace(flat.campus) : null,
        reason:
          "specialising_master is research-only per cattolica fields.yaml mapping_to_italypath_db; not surfaced as a department row",
      });
      continue;
    }

    for (const field of ["program_name", "level", "teaching_language", "official_program_url"]) {
      assertStringRecord(flat, field, file);
    }
    assertArray(flat, "source_quotes", file);
    if (flat.source_quotes.length === 0) {
      throw new Error(`${file} has empty source_quotes`);
    }
    if (normalizeSourceQuotes(flat.source_quotes, file).length === 0) {
      throw new Error(`${file} has empty normalized source_quotes`);
    }

    const level = normalizeLevel(flat.level);
    const rawProgramName = flat.program_name;
    const sourceProgramName = collapseWhitespace(rawProgramName);
    const departmentName = canonicalDepartmentName(sourceProgramName);
    if (!departmentName) {
      throw new Error(`${file} has empty canonical department name`);
    }

    const languages = normalizeLanguages(flat.teaching_language);
    if (!languages.includes("en")) {
      throw new Error(`${file} must include English in teaching_language: ${flat.teaching_language}`);
    }

    const requiredDocs = buildRequiredDocuments(flat);
    if (requiredDocs.length === 0) {
      throw new Error(`${file} has empty required_documents after normalization`);
    }

    programs.push({
      file,
      cattolicaId: flat.cattolica_id,
      rawProgramName,
      sourceProgramName,
      departmentName,
      normalizedSourceName: normalizeName(sourceProgramName),
      normalizedName: normalizeName(departmentName),
      level,
      rawLevel: flat.level.trim(),
      teachingLanguage: flat.teaching_language.trim(),
      languages,
      durationYears: durationForLevel(level),
      flat,
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

async function fetchCattolicaDepartments(supabase) {
  return fetchAllRows(
    supabase,
    "university_departments",
    "id,university_id,name,slug,languages,duration_years,level,sort_order",
    (query) =>
      query
        .eq("university_id", CATTOLICA_UNIVERSITY_ID)
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

function desiredSlugForExisting(source, department, dbDepartments, usedSlugs) {
  const desiredSlug = createSlug(source.departmentName);
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
    languages: source.languages.length > 0 ? source.languages : ["en"],
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

function createPlan(sourcePrograms, dbDepartments, skippedSpecialisingMasters) {
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
  const duplicateNameDifferentLevel = [];
  const sourceWithoutExisting = [];
  const warnings = [];

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
      (department) =>
        `${department.id}:${department.name} (${department.slug}, ${department.level})`,
      (department) => identityKey(department.name, department.level),
      "existing department canonical name + level"
    )
  );

  for (const source of sourcePrograms) {
    const candidates = byName.get(source.normalizedName) ?? [];
    const exactLevel = candidates.find((candidate) => candidate.level === source.level);
    const aliasSlug = SOURCE_TO_EXISTING_SLUG_ALIASES.get(source.normalizedName);
    const aliasCandidate = aliasSlug ? bySlug.get(aliasSlug) : undefined;

    let department = exactLevel ?? aliasCandidate;
    let action = exactLevel ? "matched-existing" : aliasCandidate ? "alias-correction" : "new-department";

    if (department) {
      const correction = createDepartmentCorrection(source, department, dbDepartments, usedSlugs);
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
      const baseSlug = createSlug(source.departmentName);
      const slug = nextSlug(baseSlug, usedSlugs, source.level);
      usedSlugs.add(slug);

      department = {
        id: null,
        university_id: CATTOLICA_UNIVERSITY_ID,
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
      sourceWithoutExisting.push({
        sourceFile: source.file,
        sourceProgramName: source.sourceProgramName,
        canonicalDepartmentName: source.departmentName,
        level: source.level,
        plannedSlug: slug,
      });
    }

    if (
      candidates.length > 0 &&
      !candidates.some((candidate) => candidate.level === source.level) &&
      !aliasCandidate
    ) {
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
      teachingLanguage: source.teachingLanguage,
      action,
      departmentId: department.id,
      departmentName: department.name,
      departmentSlug: department.slug,
      levelBefore: department.level,
      levelAfter: source.level,
    });

    detailRows.push({
      source,
      department,
    });
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
    universityId: CATTOLICA_UNIVERSITY_ID,
    sourceFiles: sourcePrograms.length + skippedSpecialisingMasters.length,
    importableSourceFiles: sourcePrograms.length,
    skippedSpecialisingMasters,
    existingDepartments: dbDepartments.length,
    matchedExisting,
    departmentCorrections,
    newDepartments,
    duplicateNameDifferentLevel,
    sourceWithoutExisting,
    existingWithoutSource,
    detailRows,
    programPlans,
    warnings,
  };
}

function toDetailPayload(source, departmentId) {
  const f = source.flat;
  return {
    department_id: departmentId,
    university_id: CATTOLICA_UNIVERSITY_ID,
    raw_program_name: f.program_name.trim(),
    raw_level: f.level.trim(),
    raw_teaching_language: f.teaching_language.trim(),
    campus: optionalText(f.campus),
    degree_class: optionalText(f.degree_class),
    admission_type: optionalText(f.admission_type),
    academic_requirements: optionalText(f.academic_requirements),
    language_requirements: optionalText(f.language_requirements),
    application_deadline_eu: optionalText(f.application_deadline_eu),
    application_deadline_non_eu: optionalText(f.application_deadline_non_eu),
    required_documents: buildRequiredDocuments(f),
    entry_exam_or_test: optionalText(f.entry_exam_or_test),
    tuition_or_fees_link: optionalText(f.tuition_or_fees_link),
    official_program_url: f.official_program_url.trim(),
    official_call_url: optionalText(f.official_call_url),
    source_quotes: normalizeSourceQuotes(f.source_quotes, source.file),
    uncertain: normalizeStringArray(f.uncertain),
    uncertainty_notes: buildUncertaintyNotes(f),
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

  if (detail.source_quotes.length === 0) {
    throw new Error(`Detail payload for department ${detail.department_id} has empty source_quotes`);
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
        .eq("university_id", CATTOLICA_UNIVERSITY_ID);
      if (error) {
        throw new Error(`Failed to update department ${correction.id}: ${error.message}`);
      }
      mutatedDepartments = true;
    }

    const refreshedDepartments = await fetchCattolicaDepartments(supabase);
    const departmentByKey = new Map(
      refreshedDepartments.map((department) => [
        identityKey(department.name, department.level),
        department,
      ])
    );

    detailPayloads = plan.detailRows.map(({ source }) => {
      const department = departmentByKey.get(identityKey(source.departmentName, source.level));
      if (!department?.id) {
        throw new Error(`Cannot resolve department id for ${source.departmentName} (${source.level})`);
      }
      const payload = toDetailPayload(source, department.id);
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
    .eq("university_id", CATTOLICA_UNIVERSITY_ID)
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
      .eq("university_id", CATTOLICA_UNIVERSITY_ID)
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
      .eq("id", correction.id)
      .eq("university_id", CATTOLICA_UNIVERSITY_ID);
    if (error) failures.push(`${correction.id}: ${error.message}`);
  }

  if (plan.newDepartments.length > 0) {
    const slugs = plan.newDepartments.map((department) => department.slug);
    const { error } = await supabase
      .from("university_departments")
      .delete()
      .eq("university_id", CATTOLICA_UNIVERSITY_ID)
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
    .eq("university_id", CATTOLICA_UNIVERSITY_ID)
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
    importableSourceFiles: plan.importableSourceFiles,
    skippedSpecialisingMasters: plan.skippedSpecialisingMasters,
    existingDepartments: plan.existingDepartments,
    matchedExisting: plan.matchedExisting.length,
    matchedExistingDetails: plan.matchedExisting,
    departmentCorrections: plan.departmentCorrections,
    newDepartments: plan.newDepartments.map(({ sourceFile, ...department }) => ({
      ...department,
      sourceFile,
    })),
    sourceWithoutExisting: plan.sourceWithoutExisting,
    duplicateNameDifferentLevel: plan.duplicateNameDifferentLevel,
    existingWithoutSource: plan.existingWithoutSource,
    programPlans: plan.programPlans,
    specialChecks: {
      bachelorPrograms: plan.programPlans.filter((programPlan) => programPlan.level === "bachelor"),
      masterPrograms: plan.programPlans.filter((programPlan) => programPlan.level === "master"),
      singleCyclePrograms: plan.programPlans.filter(
        (programPlan) => programPlan.level === "single-cycle"
      ),
      newDepartments: plan.programPlans.filter(
        (programPlan) => programPlan.action === "new-department"
      ),
      aliasCorrections: plan.programPlans.filter(
        (programPlan) => programPlan.action === "alias-correction"
      ),
      rawLevelNormalized: plan.programPlans.filter((programPlan) => programPlan.rawLevelNormalized),
    },
    warnings: plan.warnings,
    applied: applyResult,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const supabase = createSupabaseClient();
  const { programs: sourcePrograms, skipped: skippedSpecialisingMasters } = loadSourcePrograms();
  const dbDepartments = await fetchCattolicaDepartments(supabase);
  const plan = createPlan(sourcePrograms, dbDepartments, skippedSpecialisingMasters);
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
    console.log(`[OK] Applied ${applyResult.detailUpserts} Cattolica program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
