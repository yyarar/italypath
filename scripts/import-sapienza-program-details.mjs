import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Sapienza VERIFICATION-round importer (September 2026). Replaces the June 2026
// importer (see git history): the June research was judged unreliable, all 23
// detailed programs were re-researched from scratch against a FIXED dept_id list
// (no new departments, no renames, no level fixes). This script overwrites the
// existing program_admission_details rows for exactly these 23 departments.
// Old rows were exported to tmp/uni-research/sapienza-old-details/ beforehand
// for the old-vs-new diff report.
const SAPIENZA_UNIVERSITY_ID = 2;
const EXPECTED_SOURCE_FILE_COUNT = 23;
const SOURCE_GENERATED_AT = "2026-09-02";
const RESULTS_DIR = resolve(process.cwd(), "sapienza-english-program-admission-requirements/results");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "sapienza-verification-import-report.json");

// Fixed mapping: source JSON file -> existing university_departments row.
const FILE_TO_DEPARTMENT = new Map([
  ["Applied_Computer_Science_and_Artificial_Intelligence.json", { id: 249, level: "bachelor" }],
  ["Bioinformatics.json", { id: 250, level: "bachelor" }],
  ["Molecular_Biology_Medicinal_Chemistry_and_Computer_Science_for_Pharmaceutical_Applications.json", { id: 256, level: "bachelor" }],
  ["Nursing.json", { id: 257, level: "bachelor" }],
  ["Sustainable_Building_Engineering.json", { id: 259, level: "bachelor" }],
  ["Astrophysics_and_Cosmology.json", { id: 538, level: "master" }],
  ["Artificial_Intelligence_and_Robotics.json", { id: 541, level: "master" }],
  ["Business_Management.json", { id: 543, level: "master" }],
  ["Cognitive_Neuroscience.json", { id: 546, level: "master" }],
  ["Computer_Science.json", { id: 547, level: "master" }],
  ["Control_Engineering.json", { id: 548, level: "master" }],
  ["Cybersecurity.json", { id: 550, level: "master" }],
  ["Data_Science.json", { id: 551, level: "master" }],
  ["Economics.json", { id: 554, level: "master" }],
  ["European_Studies.json", { id: 563, level: "master" }],
  ["Health_Economics.json", { id: 568, level: "master" }],
  ["Physics.json", { id: 574, level: "master" }],
  ["Product_and_Service_Design.json", { id: 575, level: "master" }],
  ["Space_and_Astronautical_Engineering.json", { id: 578, level: "master" }],
  ["Transport_Systems_Engineering.json", { id: 580, level: "master" }],
  ["Statistical_Methods_and_Applications.json", { id: 581, level: "master" }],
  ["Engineering_in_Computer_Science_and_Artificial_Intelligence.json", { id: 1182, level: "master" }],
  ["Medicine_and_Surgery.json", { id: 1183, level: "single-cycle" }],
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
    if (key && !process.env[key]) process.env[key] = value;
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
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function humanizeKey(value) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

// This research round produced rich nested objects for the prose columns
// (admission_type, academic_requirements, language_requirements, deadlines,
// entry_exam_or_test). The DB columns are text and the dossier UI renders text,
// so flatten the FULL object into "Key: value" lines — unlike the Genoa
// importer's summary-only shortcut, nothing is dropped except source_url keys
// (URLs live in the dedicated URL columns and in source_quotes).
function flattenText(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (Array.isArray(value)) {
    const normalized = value.map(flattenText).filter(Boolean);
    return normalized.length > 0 ? normalized.join("; ") : null;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([key]) => !["source_url", "sources"].includes(key))
      .map(([key, itemValue]) => {
        const normalized = flattenText(itemValue);
        return normalized ? `${humanizeKey(key)}: ${normalized}` : null;
      })
      .filter(Boolean);
    return entries.length > 0 ? entries.join("\n") : null;
  }
  return String(value);
}

function requiredFlatText(value, field, file) {
  const text = flattenText(value);
  if (!text) throw new Error(`${file} is missing required field: ${field}`);
  return text;
}

function formatDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return flattenText(value);
  }
  const documentName = flattenText(value.document_name);
  const stage = flattenText(value.stage);
  const requiredFor = flattenText(value.required_for);
  const notes = flattenText(value.notes);
  const context = [stage, requiredFor].filter(Boolean).join(" · ");
  if (documentName && context && notes) return `${documentName} (${context}): ${notes}`;
  if (documentName && context) return `${documentName} (${context})`;
  if (documentName && notes) return `${documentName}: ${notes}`;
  if (documentName) return documentName;
  return flattenText(value);
}

function normalizeDocumentArray(value, file) {
  // Some agent runs wrote one long descriptive paragraph instead of a list;
  // wrap it as a single-element array (full text preserved, no invented splits).
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${file} has empty/invalid required_documents`);
  }
  const items = value.map(formatDocument).filter(Boolean);
  if (items.length === 0) throw new Error(`${file} required_documents normalized to empty`);
  return items;
}

function normalizeSourceQuotes(value, officialProgramUrl, file) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${file} has empty/invalid source_quotes`);
  }
  const quotes = value.flatMap((item) => {
    // Variant A: plain string with the source URL embedded inline
    // ("'quote text' - https://..."). Keep the full text as the quote and
    // attribute it to the first URL found in it (fallback: official page).
    if (typeof item === "string") {
      const text = item.trim();
      if (!text) return [];
      const urlMatch = text.match(/https?:\/\/[^\s)"'|]+/);
      const url = urlMatch ? urlMatch[0].replace(/[.,;:)\]}]+$/, "") : officialProgramUrl;
      return [{ url, quote: text, field_refs: [], retrieved_at: SOURCE_GENERATED_AT }];
    }
    if (!item || typeof item !== "object") return [];
    // Variant B: object with quote / source_url (+ optional context, field_supported).
    const baseQuote = typeof item.quote === "string" ? item.quote.trim() : "";
    const context = typeof item.context === "string" ? item.context.trim() : "";
    const quote = baseQuote && context ? `${baseQuote} [${context}]` : baseQuote;
    const url =
      typeof item.url === "string" && item.url.trim()
        ? item.url.trim()
        : typeof item.source_url === "string" && item.source_url.trim()
          ? item.source_url.trim()
          : officialProgramUrl;
    const fieldRefs = Array.isArray(item.field_refs)
      ? item.field_refs
      : typeof item.field_supported === "string"
        ? item.field_supported.split(",").map((s) => s.trim())
        : [];
    if (!quote) return [];
    return [
      {
        url,
        quote,
        field_refs: fieldRefs.filter((ref) => typeof ref === "string" && ref.length > 0),
        retrieved_at: SOURCE_GENERATED_AT,
      },
    ];
  });
  if (quotes.length === 0) throw new Error(`${file} source_quotes normalized to empty`);
  return quotes;
}

function normalizeStringArray(value, field, file) {
  // uncertainty_notes came back as one long string in some agent runs.
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) throw new Error(`${file} has non-array ${field}`);
  return value.map(flattenText).filter(Boolean);
}

function deriveLevelCategory(value, file) {
  const text = flattenText(value);
  if (!text) throw new Error(`${file} is missing required field: level`);
  const lower = text.toLowerCase();
  if (lower.startsWith("single-cycle") || lower.startsWith("single cycle")) return "single-cycle";
  if (lower.startsWith("master")) return "master";
  if (lower.startsWith("bachelor")) return "bachelor";
  throw new Error(`${file} has unrecognized level: ${text.slice(0, 80)}`);
}

function loadSourceFiles() {
  const files = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  if (files.length !== EXPECTED_SOURCE_FILE_COUNT) {
    throw new Error(`Expected ${EXPECTED_SOURCE_FILE_COUNT} Sapienza source files, found ${files.length}`);
  }
  return files.map((file) => {
    const record = JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8"));
    for (const field of ["program_name", "teaching_language", "official_program_url"]) {
      if (typeof record[field] !== "string" || !record[field].trim()) {
        throw new Error(`${file} is missing required field: ${field}`);
      }
    }
    if (!Array.isArray(record.uncertain)) throw new Error(`${file} has non-array uncertain`);
    return { file, record, level: deriveLevelCategory(record.level, file) };
  });
}

async function fetchDepartments(supabase) {
  const { data, error } = await supabase
    .from("university_departments")
    .select("id,name,level")
    .eq("university_id", SAPIENZA_UNIVERSITY_ID);
  if (error) throw new Error(`Failed to fetch Sapienza departments: ${error.message}`);
  return data ?? [];
}

async function fetchExistingAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("program_admission_details")
    .select(
      "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file"
    )
    .eq("university_id", SAPIENZA_UNIVERSITY_ID)
    .in("department_id", departmentIds);
  if (error) throw new Error(`Failed to fetch existing admission details: ${error.message}`);
  return data ?? [];
}

function buildPlan(sourceFiles, departments) {
  const warnings = [];
  const departmentById = new Map(departments.map((d) => [d.id, d]));
  const resolvedRows = [];

  for (const { file, record, level } of sourceFiles) {
    const mapping = FILE_TO_DEPARTMENT.get(file);
    if (!mapping) {
      warnings.push(`No department mapping defined for source file: ${file}`);
      continue;
    }
    const department = departmentById.get(mapping.id);
    if (!department) {
      warnings.push(`${file}: expected department id=${mapping.id} not found in DB`);
      continue;
    }
    if (department.level !== mapping.level) {
      warnings.push(`${file}: DB department level "${department.level}" != expected "${mapping.level}"`);
    }
    if (level !== mapping.level) {
      warnings.push(`${file}: source level "${level}" does not match department level "${mapping.level}"`);
    }
    resolvedRows.push({ file, record, departmentId: mapping.id, departmentName: department.name });
  }

  const mappedFiles = new Set(FILE_TO_DEPARTMENT.keys());
  for (const { file } of sourceFiles) {
    if (!mappedFiles.has(file)) warnings.push(`Unexpected source file (not in fixed mapping): ${file}`);
  }

  return {
    universityId: SAPIENZA_UNIVERSITY_ID,
    sourceFileCount: sourceFiles.length,
    resolvedRows,
    warnings,
  };
}

function toDetailPayload(record, departmentId, file) {
  const officialProgramUrl = record.official_program_url.trim();
  return {
    department_id: departmentId,
    university_id: SAPIENZA_UNIVERSITY_ID,
    raw_program_name: record.program_name.trim(),
    raw_level: requiredFlatText(record.level, "level", file),
    raw_teaching_language: record.teaching_language.trim(),
    campus: flattenText(record.campus),
    degree_class: flattenText(record.degree_class),
    admission_type: flattenText(record.admission_type),
    academic_requirements: flattenText(record.academic_requirements),
    language_requirements: flattenText(record.language_requirements),
    application_deadline_eu: flattenText(record.application_deadline_eu),
    application_deadline_non_eu: flattenText(record.application_deadline_non_eu),
    required_documents: normalizeDocumentArray(record.required_documents, file),
    entry_exam_or_test: flattenText(record.entry_exam_or_test),
    tuition_or_fees_link: flattenText(record.tuition_or_fees_link),
    official_program_url: officialProgramUrl,
    official_call_url: flattenText(record.official_call_url),
    source_quotes: normalizeSourceQuotes(record.source_quotes, officialProgramUrl, file),
    uncertain: normalizeStringArray(record.uncertain, "uncertain", file),
    uncertainty_notes: normalizeStringArray(record.uncertainty_notes, "uncertainty_notes", file),
    source_file: file,
    // Overwrite-imports must stamp these explicitly: the table has no trigger,
    // so an upsert would otherwise leave the previous import's timestamps.
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function buildPreview(plan) {
  return plan.resolvedRows.map(({ file, record, departmentId, departmentName }) => {
    try {
      const payload = toDetailPayload(record, departmentId, file);
      return {
        file,
        departmentId,
        departmentName,
        raw_program_name: payload.raw_program_name.slice(0, 80),
        official_program_url: payload.official_program_url,
        official_call_url: payload.official_call_url?.slice(0, 120) ?? null,
        source_quotes_count: payload.source_quotes.length,
        required_documents_count: payload.required_documents.length,
        uncertain_count: payload.uncertain.length,
      };
    } catch (error) {
      return { file, departmentId, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

function validatePayloadsBuildCleanly(plan) {
  const errors = [];
  for (const { file, record, departmentId } of plan.resolvedRows) {
    try {
      toDetailPayload(record, departmentId, file);
    } catch (error) {
      errors.push(`${file}: payload build failed — ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return errors;
}

async function applyPlan(supabase, plan) {
  const departmentIds = plan.resolvedRows.map((r) => r.departmentId);
  const admissionSnapshot = await fetchExistingAdmissionDetails(supabase, departmentIds);
  if (admissionSnapshot.length !== departmentIds.length) {
    throw new Error(
      `Expected ${departmentIds.length} existing admission rows to overwrite, found ${admissionSnapshot.length}. Aborting (this import only replaces existing rows).`
    );
  }

  const detailPayloads = plan.resolvedRows.map(({ file, record, departmentId }) =>
    toDetailPayload(record, departmentId, file)
  );

  try {
    const { error: upsertError } = await supabase
      .from("program_admission_details")
      .upsert(detailPayloads, { onConflict: "department_id" });
    if (upsertError) throw new Error(`Failed to upsert admission details: ${upsertError.message}`);
    return { detailUpserts: detailPayloads.length, overwrittenRows: admissionSnapshot.length };
  } catch (error) {
    await supabase.from("program_admission_details").upsert(admissionSnapshot, { onConflict: "department_id" });
    throw error;
  }
}

function reportForOutput(plan, applyResult = null) {
  return {
    mode,
    universityId: plan.universityId,
    sourceFileCount: plan.sourceFileCount,
    resolvedRowCount: plan.resolvedRows.length,
    resolvedRows: plan.resolvedRows.map((r) => ({ file: r.file, departmentId: r.departmentId, departmentName: r.departmentName })),
    warnings: plan.warnings,
    preview: plan.preview,
    applied: applyResult,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const supabase = createSupabaseClient();
  const sourceFiles = loadSourceFiles();
  const departments = await fetchDepartments(supabase);
  const plan = buildPlan(sourceFiles, departments);
  plan.warnings.push(...validatePayloadsBuildCleanly(plan));
  plan.preview = buildPreview(plan);
  let report = reportForOutput(plan);

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (mode === "apply") {
    if (plan.warnings.length > 0) {
      throw new Error(`Refusing --apply because the import plan has warnings: ${plan.warnings.join(" | ")}`);
    }
    if (plan.resolvedRows.length !== EXPECTED_SOURCE_FILE_COUNT) {
      throw new Error(`Refusing --apply: resolved ${plan.resolvedRows.length}/${EXPECTED_SOURCE_FILE_COUNT} rows.`);
    }
    const applyResult = await applyPlan(supabase, plan);
    report = reportForOutput(plan, applyResult);
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`[OK] Overwrote ${applyResult.detailUpserts} Sapienza program details with verification data.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
