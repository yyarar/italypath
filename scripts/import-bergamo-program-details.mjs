import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BERGAMO_UNIVERSITY_ID = 26;
const EXPECTED_SOURCE_FILE_COUNT = 13;
const SOURCE_GENERATED_AT = "2026-09-05";
const RESULTS_DIR = resolve(process.cwd(), "bergamo-english-programs/results");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "bergamo-program-details-import-report.json");

// Research finding: EMH accepted its last new cohort in a.y. 2024/25 and is absent
// from the 2026/27 DreamApply catalogue — NOT imported as an active programme.
const EXCLUDED_SOURCE_FILES = new Map([
  ["Engineering_and_Management_for_Health_EMH.json", "discontinued — last intake 2024/25, absent from 2026/27 catalogue"],
]);

const FILE_TO_DEPARTMENT = new Map([
  // Medicine & Surgery is mis-seeded as bachelor; joint LM-41 single-cycle with
  // Milano-Bicocca (which administers admission) — level fixed at import.
  ["Medicine_and_Surgery.json", { id: 410, level: "bachelor", expectedFixedLevel: "single-cycle" }],
  ["Planning_and_Management_of_Tourism_Systems_PMTS.json", { id: 823, level: "master" }],
  ["Clinical_Psychology_for_Individuals_Families_and_Organizations.json", { id: 825, level: "master" }],
  ["Accounting_Governance_and_Sustainability_AGS.json", { id: 826, level: "master" }],
  ["Economics_and_Data_Analysis_EDA.json", { id: 827, level: "master" }],
  ["Economics_and_Finance.json", { id: 828, level: "master" }],
  ["International_Management_and_Marketing_IMM.json", { id: 829, level: "master" }],
  ["Management_Engineering.json", { id: 830, level: "master" }],
  ["Mechatronics_and_Smart_Technology_Engineering.json", { id: 832, level: "master" }],
  ["Medical_Engineering.json", { id: 833, level: "master" }],
]);

const DEPARTMENT_LEVEL_FIX = { departmentId: 410, from: { level: "bachelor" }, to: { level: "single-cycle", sort_order: 0 } };

const NEW_DEPARTMENTS = new Map([
  // Official-source conflict on language (DreamApply: English; central catalogue:
  // Italian; self-description: multilingual with an English path) — inserted as
  // en+it per the partial-English convention; dossier carries the caveat.
  [
    "Intercultural_Studies_in_Languages_and_Literatures_ISLL.json",
    { name: "Intercultural Studies in Languages and Literatures", slug: "intercultural-studies-in-languages-and-literatures", languages: ["en", "it"], duration_years: 2, level: "master" },
  ],
  [
    "Philosophical_Knowledge_Foundations_Methods_Applications.json",
    { name: "Philosophical Knowledge: Foundations, Methods, Applications", slug: "philosophical-knowledge-foundations-methods-applications", languages: ["en"], duration_years: 2, level: "master" },
  ],
]);

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

function flattenText(value) {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
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

function extractPrimaryUrl(value, { required = false, field = "", file = "" } = {}) {
  const text = flattenText(value);
  if (!text) {
    if (required) throw new Error(`${file} is missing required URL field: ${field}`);
    return null;
  }
  const urls = (text.match(/https?:\/\/[^\s)"'|,;]+/g) ?? []).map((u) => u.replace(/[.,;:)\]}]+$/, ""));
  const official = urls.find((u) => {
    try {
      return new URL(u).hostname.endsWith("unibg.it");
    } catch {
      return false;
    }
  });
  const chosen = official ?? urls[0] ?? null;
  if (!chosen && required) throw new Error(`${file} has no extractable URL in ${field}`);
  return chosen;
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
    const context = flattenText(item.context ?? item.page_or_section);
    const quote = baseQuote && context ? `${baseQuote} [${context}]` : baseQuote;
    const url =
      typeof item.url === "string" && item.url.trim()
        ? item.url.trim()
        : typeof item.source_url === "string" && item.source_url.trim()
          ? item.source_url.trim()
          : officialProgramUrl;
    const refsRaw = item.fields_supported ?? item.field_refs ?? item.field_supported ?? [];
    const fieldRefs = Array.isArray(refsRaw)
      ? refsRaw
      : typeof refsRaw === "string"
        ? refsRaw.split(",").map((s) => s.trim())
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
    throw new Error(`Expected ${EXPECTED_SOURCE_FILE_COUNT} Bergamo source files, found ${files.length}`);
  }
  const skipped = [];
  const sources = [];
  for (const file of files) {
    const record = JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8"));
    if (EXCLUDED_SOURCE_FILES.has(file)) {
      skipped.push({ file, reason: EXCLUDED_SOURCE_FILES.get(file) });
      continue;
    }
    const name = record.program_name ?? record.programme_name;
    if (typeof name !== "string" || !name.trim()) throw new Error(`${file} is missing program name`);
    record.__name = name.trim();
    if (!record.teaching_language) throw new Error(`${file} is missing teaching_language`);
    if (!Array.isArray(record.uncertain)) throw new Error(`${file} has non-array uncertain`);
    sources.push({ file, record, level: deriveLevelCategory(record.level, file) });
  }
  return { sources, skipped };
}

async function fetchDepartments(supabase) {
  const { data, error } = await supabase
    .from("university_departments")
    .select("id,name,level,sort_order")
    .eq("university_id", BERGAMO_UNIVERSITY_ID);
  if (error) throw new Error(`Failed to fetch Bergamo departments: ${error.message}`);
  return data ?? [];
}

async function fetchExistingAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("program_admission_details")
    .select("department_id")
    .eq("university_id", BERGAMO_UNIVERSITY_ID)
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

  const fixTarget = departmentById.get(DEPARTMENT_LEVEL_FIX.departmentId);
  const levelFixNeeded = Boolean(fixTarget && fixTarget.level === DEPARTMENT_LEVEL_FIX.from.level);

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
        insert: { university_id: BERGAMO_UNIVERSITY_ID, ...newSpec, sort_order: maxSortOrderByLevel[newSpec.level] },
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
    const expectedLevel = mapping.expectedFixedLevel ?? mapping.level;
    if (level !== expectedLevel) {
      warnings.push(`${file}: source level "${level}" does not match expected level "${expectedLevel}"`);
    }
    resolvedRows.push({ file, record, departmentRef: mapping.id, departmentName: department.name });
  }

  const coveredIds = new Set([...FILE_TO_DEPARTMENT.values()].map((m) => m.id));
  const uncoveredExisting = departments
    .filter((d) => !coveredIds.has(d.id))
    .map((d) => ({ id: d.id, name: d.name, level: d.level }));

  return {
    universityId: BERGAMO_UNIVERSITY_ID,
    sourceFileCount: sources.length,
    skippedSourceFiles: skipped,
    existingDepartmentCount: departments.length,
    levelFixNeeded,
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
    university_id: BERGAMO_UNIVERSITY_ID,
    raw_program_name: record.__name,
    raw_level: flattenText(record.level),
    raw_teaching_language: flattenText(record.teaching_language),
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
  let levelFixed = false;
  const insertedDepartmentIdByFile = new Map();
  const departmentIdsTouched = [];
  try {
    if (plan.levelFixNeeded) {
      const { error } = await supabase
        .from("university_departments")
        .update(DEPARTMENT_LEVEL_FIX.to)
        .eq("id", DEPARTMENT_LEVEL_FIX.departmentId)
        .eq("university_id", BERGAMO_UNIVERSITY_ID);
      if (error) throw new Error(`Failed to fix Medicine level: ${error.message}`);
      levelFixed = true;
    }

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
    if (existing.length > 0) throw new Error(`Refusing: ${existing.length} admission rows already exist for Bergamo.`);

    const { error: insertDetailsError } = await supabase.from("program_admission_details").insert(detailPayloads);
    if (insertDetailsError) throw new Error(`Failed to insert admission details: ${insertDetailsError.message}`);

    return { detailInserts: detailPayloads.length, insertedDepartmentIds: Object.fromEntries(insertedDepartmentIdByFile), levelFixed };
  } catch (error) {
    if (departmentIdsTouched.length > 0) {
      await supabase
        .from("program_admission_details")
        .delete()
        .eq("university_id", BERGAMO_UNIVERSITY_ID)
        .in("department_id", departmentIdsTouched);
    }
    if (insertedDepartmentIdByFile.size > 0) {
      await supabase.from("university_departments").delete().in("id", [...insertedDepartmentIdByFile.values()]);
    }
    if (levelFixed) {
      await supabase
        .from("university_departments")
        .update({ level: DEPARTMENT_LEVEL_FIX.from.level })
        .eq("id", DEPARTMENT_LEVEL_FIX.departmentId);
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
    levelFixNeeded: plan.levelFixNeeded,
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
    console.log(`[OK] Applied ${applyResult.detailInserts} Bergamo program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
