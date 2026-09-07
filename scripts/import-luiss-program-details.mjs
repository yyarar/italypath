import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const LUISS_UNIVERSITY_ID = 12;
const EXPECTED_SOURCE_FILE_COUNT = 17;
const SOURCE_GENERATED_AT = "2026-09-05";
const RESULTS_DIR = resolve(process.cwd(), "luiss-english-programs/results");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "luiss-program-details-import-report.json");

// Not a degree programme (foundation year, level "other"); kept in results/ as
// archive only — the DB level constraint accepts bachelor/master/single-cycle.
const EXCLUDED_SOURCE_FILES = new Map([
  ["Foundation_Programme_in_Social_Sciences.json", "foundation year, not a degree programme"],
  // Research itself flags this as HIGH UNCERTAINTY: no dedicated programme page
  // exists anywhere on luiss.it (full sitemap searched); only admissions-call
  // mentions. Not added to the DB until Luiss publishes an official page.
  ["Law_for_Global_Challenges.json", "no official programme page found; unverifiable — held back"],
]);

// Explicit mapping: source file -> existing university_departments row.
const FILE_TO_DEPARTMENT = new Map([
  ["Business_Administration.json", { id: 344, level: "bachelor" }],
  ["Economics_and_Business.json", { id: 345, level: "bachelor" }],
  ["Global_Law.json", { id: 346, level: "bachelor" }],
  ["Management_and_Artificial_Intelligence.json", { id: 347, level: "bachelor" }],
  ["Politics_Philosophy_and_Economics.json", { id: 348, level: "bachelor" }],
  ["Global_Management_and_Politics.json", { id: 936, level: "master" }],
  ["Marketing.json", { id: 937, level: "master" }],
  ["Government_and_Public_Affairs.json", { id: 938, level: "master" }],
  ["International_Relations.json", { id: 939, level: "master" }],
  ["Management.json", { id: 940, level: "master" }],
  ["Data_Science_and_Management.json", { id: 941, level: "master" }],
  ["Economics_Institutions_and_Financial_Markets.json", { id: 942, level: "master" }],
  ["Administration_Finance_and_Control.json", { id: 943, level: "master" }],
  ["Strategic_Management.json", { id: 944, level: "master" }],
  ["Finance.json", { id: 945, level: "master" }],
]);

// No new department rows in this import (Law for Global Challenges held back —
// see EXCLUDED_SOURCE_FILES).
const NEW_DEPARTMENTS = new Map([]);

const mode = parseMode(process.argv.slice(2));

function parseMode(args) {
  const allowedArgs = new Set(["--dry-run", "--apply"]);
  const unknownArgs = args.filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length > 0) throw new Error(`Unknown argument(s): ${unknownArgs.join(", ")}`);
  const wantsDryRun = args.includes("--dry-run");
  const wantsApply = args.includes("--apply");
  if (wantsDryRun && wantsApply) throw new Error("Use either --dry-run or --apply, not both.");
  return wantsApply ? "apply" : "dry-run";
}

function loadDotenvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Luiss results carry rich nested objects/arrays for the prose columns; the DB
// columns are text, so flatten the FULL structure into "Key: value" lines
// (source_url keys dropped — URLs live in the URL columns and source_quotes).
function flattenText(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (Array.isArray(value)) {
    const normalized = value.map(flattenText).filter(Boolean);
    return normalized.length > 0 ? normalized.join("\n") : null;
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

// The three href columns must hold exactly ONE URL. Prefer official Luiss
// domains (luiss.it / luiss.edu); fall back to the first URL found.
function extractPrimaryUrl(value, { required = false, field = "", file = "" } = {}) {
  const text = flattenText(value);
  if (!text) {
    if (required) throw new Error(`${file} is missing required URL field: ${field}`);
    return null;
  }
  const urls = (text.match(/https?:\/\/[^\s)"'|,;]+/g) ?? []).map((u) => u.replace(/[.,;:)\]}]+$/, ""));
  const official = urls.find((u) => {
    try {
      const host = new URL(u).hostname;
      return host.endsWith("luiss.it") || host.endsWith("luiss.edu");
    } catch {
      return false;
    }
  });
  const chosen = official ?? urls[0] ?? null;
  if (!chosen && required) throw new Error(`${file} has no extractable URL in ${field}`);
  return chosen;
}

// teaching_language: { primary: "English + Italian", granularity: ...,
// majors_language: [...] }. Keep the primary value up front and append the
// per-major language breakdown; drop the internal "granularity" tag.
function buildTeachingLanguage(value, file) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const primary = flattenText(value.primary);
    if (!primary) throw new Error(`${file} teaching_language has no primary value`);
    const majors = flattenText(value.majors_language);
    return majors ? `${primary}\nMajors: ${majors}` : primary;
  }
  throw new Error(`${file} has invalid teaching_language`);
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

function normalizeDocumentArray(value, file) {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${file} has empty/invalid required_documents`);
  const items = value.map(flattenText).filter(Boolean);
  if (items.length === 0) throw new Error(`${file} required_documents normalized to empty`);
  return items;
}

function normalizeStringArray(value, field, file) {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) throw new Error(`${file} has non-array ${field}`);
  return value.map(flattenText).filter(Boolean);
}

function normalizeSourceQuotes(value, officialProgramUrl, file) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${file} has empty/invalid source_quotes`);
  const quotes = value.flatMap((item) => {
    if (typeof item === "string") {
      const text = item.trim();
      if (!text) return [];
      const urlMatch = text.match(/https?:\/\/[^\s)"'|]+/);
      const url = urlMatch ? urlMatch[0].replace(/[.,;:)\]}]+$/, "") : officialProgramUrl;
      return [{ url, quote: text, field_refs: [], retrieved_at: SOURCE_GENERATED_AT }];
    }
    if (!item || typeof item !== "object") return [];
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
    return [{ url, quote, field_refs: fieldRefs.filter((r) => typeof r === "string" && r.length > 0), retrieved_at: SOURCE_GENERATED_AT }];
  });
  if (quotes.length === 0) throw new Error(`${file} source_quotes normalized to empty`);
  return quotes;
}

function loadSourceFiles() {
  const files = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  if (files.length !== EXPECTED_SOURCE_FILE_COUNT) {
    throw new Error(`Expected ${EXPECTED_SOURCE_FILE_COUNT} Luiss source files, found ${files.length}`);
  }
  const skipped = [];
  const sources = [];
  for (const file of files) {
    const record = JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8"));
    if (EXCLUDED_SOURCE_FILES.has(file)) {
      skipped.push({ file, reason: EXCLUDED_SOURCE_FILES.get(file) });
      continue;
    }
    if (typeof record.program_name !== "string" || !record.program_name.trim()) {
      throw new Error(`${file} is missing required field: program_name`);
    }
    // teaching_language is a rich object in this research:
    // { primary, granularity, majors_language } — validated in buildTeachingLanguage.
    if (!record.teaching_language) throw new Error(`${file} is missing required field: teaching_language`);
    if (!Array.isArray(record.uncertain)) throw new Error(`${file} has non-array uncertain`);
    sources.push({ file, record, level: deriveLevelCategory(record.level, file) });
  }
  return { sources, skipped };
}

async function fetchDepartments(supabase) {
  const { data, error } = await supabase
    .from("university_departments")
    .select("id,name,level,sort_order")
    .eq("university_id", LUISS_UNIVERSITY_ID);
  if (error) throw new Error(`Failed to fetch Luiss departments: ${error.message}`);
  return data ?? [];
}

async function fetchExistingAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("program_admission_details")
    .select("department_id")
    .eq("university_id", LUISS_UNIVERSITY_ID)
    .in("department_id", departmentIds);
  if (error) throw new Error(`Failed to fetch existing admission details: ${error.message}`);
  return data ?? [];
}

function buildPlan(sources, skipped, departments) {
  const warnings = [];
  const departmentById = new Map(departments.map((d) => [d.id, d]));
  const maxSortOrderByLevel = {};
  for (const d of departments) {
    maxSortOrderByLevel[d.level] = Math.max(maxSortOrderByLevel[d.level] ?? 0, d.sort_order ?? 0);
  }

  const departmentInserts = [];
  const resolvedRows = [];
  for (const { file, record, level } of sources) {
    const newSpec = NEW_DEPARTMENTS.get(file);
    if (newSpec) {
      if (level !== newSpec.level) {
        warnings.push(`${file}: source level "${level}" does not match planned new-department level "${newSpec.level}"`);
      }
      maxSortOrderByLevel[newSpec.level] = (maxSortOrderByLevel[newSpec.level] ?? 0) + 1;
      departmentInserts.push({
        file,
        insert: { university_id: LUISS_UNIVERSITY_ID, ...newSpec, sort_order: maxSortOrderByLevel[newSpec.level] },
      });
      resolvedRows.push({ file, record, departmentRef: `new:${file}` });
      continue;
    }
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
    resolvedRows.push({ file, record, departmentRef: mapping.id, departmentName: department.name });
  }

  const coveredIds = new Set([...FILE_TO_DEPARTMENT.values()].map((m) => m.id));
  const uncoveredExisting = departments
    .filter((d) => !coveredIds.has(d.id))
    .map((d) => ({ id: d.id, name: d.name, level: d.level }));

  return {
    universityId: LUISS_UNIVERSITY_ID,
    sourceFileCount: sources.length,
    skippedSourceFiles: skipped,
    existingDepartmentCount: departments.length,
    departmentInserts,
    resolvedRows,
    uncoveredExisting,
    warnings,
  };
}

function toDetailPayload(record, departmentId, file) {
  const officialProgramUrl = extractPrimaryUrl(record.official_program_url, { required: true, field: "official_program_url", file });
  return {
    department_id: departmentId,
    university_id: LUISS_UNIVERSITY_ID,
    raw_program_name: record.program_name.trim(),
    raw_level: flattenText(record.level),
    raw_teaching_language: buildTeachingLanguage(record.teaching_language, file),
    campus: flattenText(record.campus),
    degree_class: flattenText(record.degree_class),
    admission_type: flattenText(record.admission_type),
    academic_requirements: flattenText(record.academic_requirements),
    language_requirements: flattenText(record.language_requirements),
    application_deadline_eu: flattenText(record.application_deadline_eu),
    application_deadline_non_eu: flattenText(record.application_deadline_non_eu),
    required_documents: normalizeDocumentArray(record.required_documents, file),
    entry_exam_or_test: flattenText(record.entry_exam_or_test),
    tuition_or_fees_link: extractPrimaryUrl(record.tuition_or_fees_link),
    official_program_url: officialProgramUrl,
    official_call_url: extractPrimaryUrl(record.official_call_url),
    source_quotes: normalizeSourceQuotes(record.source_quotes, officialProgramUrl, file),
    uncertain: normalizeStringArray(record.uncertain, "uncertain", file),
    uncertainty_notes: normalizeStringArray(record.uncertainty_notes, "uncertainty_notes", file),
    source_file: file,
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function buildPreview(plan) {
  return plan.resolvedRows.map(({ file, record, departmentRef, departmentName }) => {
    try {
      const payload = toDetailPayload(record, typeof departmentRef === "number" ? departmentRef : -1, file);
      return {
        file,
        departmentRef,
        departmentName: departmentName ?? "(yeni)",
        raw_program_name: payload.raw_program_name.slice(0, 80),
        official_program_url: payload.official_program_url,
        official_call_url: payload.official_call_url,
        tuition_or_fees_link: payload.tuition_or_fees_link,
        source_quotes_count: payload.source_quotes.length,
        required_documents_count: payload.required_documents.length,
        uncertain_count: payload.uncertain.length,
      };
    } catch (error) {
      return { file, departmentRef, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

async function applyPlan(supabase, plan) {
  const insertedDepartmentIdByFile = new Map();
  const departmentIdsTouched = [];
  try {
    for (const { file, insert } of plan.departmentInserts) {
      const { data: insertedRows, error: insertError } = await supabase
        .from("university_departments")
        .insert([insert])
        .select("id");
      if (insertError) throw new Error(`Failed to insert department for ${file}: ${insertError.message}`);
      insertedDepartmentIdByFile.set(file, insertedRows[0].id);
    }

    const detailPayloads = plan.resolvedRows.map(({ file, record, departmentRef }) => {
      const departmentId =
        typeof departmentRef === "string" && departmentRef.startsWith("new:")
          ? insertedDepartmentIdByFile.get(file)
          : departmentRef;
      return toDetailPayload(record, departmentId, file);
    });
    departmentIdsTouched.push(...detailPayloads.map((d) => d.department_id));

    const existing = await fetchExistingAdmissionDetails(supabase, departmentIdsTouched);
    if (existing.length > 0) {
      throw new Error(`Refusing: ${existing.length} admission rows already exist for Luiss (expected none).`);
    }

    const { error: insertDetailsError } = await supabase.from("program_admission_details").insert(detailPayloads);
    if (insertDetailsError) throw new Error(`Failed to insert admission details: ${insertDetailsError.message}`);

    return { detailInserts: detailPayloads.length, insertedDepartmentIds: Object.fromEntries(insertedDepartmentIdByFile) };
  } catch (error) {
    if (departmentIdsTouched.length > 0) {
      await supabase
        .from("program_admission_details")
        .delete()
        .eq("university_id", LUISS_UNIVERSITY_ID)
        .in("department_id", departmentIdsTouched);
    }
    if (insertedDepartmentIdByFile.size > 0) {
      await supabase.from("university_departments").delete().in("id", [...insertedDepartmentIdByFile.values()]);
    }
    throw error;
  }
}

function reportForOutput(plan, applyResult = null) {
  return {
    mode,
    universityId: plan.universityId,
    sourceFileCount: plan.sourceFileCount,
    skippedSourceFiles: plan.skippedSourceFiles,
    existingDepartmentCount: plan.existingDepartmentCount,
    departmentInserts: plan.departmentInserts,
    resolvedRowCount: plan.resolvedRows.length,
    uncoveredExistingDepartments: plan.uncoveredExisting,
    warnings: plan.warnings,
    preview: plan.preview,
    applied: applyResult,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const supabase = createSupabaseClient();
  const { sources, skipped } = loadSourceFiles();
  const departments = await fetchDepartments(supabase);
  const plan = buildPlan(sources, skipped, departments);
  plan.preview = buildPreview(plan);
  plan.warnings.push(...plan.preview.filter((p) => p.error).map((p) => `${p.file}: payload build failed — ${p.error}`));
  let report = reportForOutput(plan);

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (mode === "apply") {
    if (plan.warnings.length > 0) {
      throw new Error(`Refusing --apply because the import plan has warnings: ${plan.warnings.join(" | ")}`);
    }
    const applyResult = await applyPlan(supabase, plan);
    report = reportForOutput(plan, applyResult);
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`[OK] Applied ${applyResult.detailInserts} Luiss program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
