import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const VERONA_UNIVERSITY_ID = 28;
const EXPECTED_SOURCE_FILE_COUNT = 13;
const SOURCE_GENERATED_AT = "2026-09-05";
const RESULTS_DIR = resolve(process.cwd(), "verona_english_degree_admissions/results");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "verona-program-details-import-report.json");

// This research round used a richer schema with different key names
// (programme_name, admission_routes, ranking_and_quota, application_windows...).
// The 17-column contract is filled by mapping/folding those fields — see
// toDetailPayload. All 13 results are fully_english_taught=true.
const FILE_TO_DEPARTMENT = new Map([
  ["Masters_degree_in_Artificial_Intelligence.json", { id: 1131, level: "master" }],
  ["Masters_degree_in_Biology_for_Translational_Research_and_Precision_Medicine.json", { id: 1133, level: "master" }],
  ["Masters_Degree_in_Computer_Engineering_for_Intelligent_Systems.json", { id: 1134, level: "master" }],
  ["Masters_degree_in_Data_Science.json", { id: 1135, level: "master" }],
  ["Masters_degree_in_Economics_and_Data_Analysis.json", { id: 1136, level: "master" }],
  ["Masters_degree_in_International_Economics_and_Business.json", { id: 1137, level: "master" }],
  ["Masters_degree_in_Linguistics.json", { id: 1138, level: "master" }],
  ["Masters_degree_in_Mathematics.json", { id: 1139, level: "master" }],
  ["Masters_degree_in_Medical_Bioinformatics.json", { id: 1140, level: "master" }],
  ["Masters_degree_in_Molecular_and_Medical_Biotechnology.json", { id: 1141, level: "master" }],
  ["Masters_degree_in_Viticulture_Enology_and_Wine_Marketing_interuniversity.json", { id: 1142, level: "master" }],
]);

// Researched programmes with no existing department row.
const NEW_DEPARTMENTS = new Map([
  [
    "Masters_degree_in_Languages_Literatures_and_Digital_Culture.json",
    { name: "Languages, Literatures and Digital Culture", slug: "languages-literatures-and-digital-culture", languages: ["en"], duration_years: 2, level: "master" },
  ],
  [
    "Masters_degree_in_Languages_for_Global_Business_Trade_and_Tourism.json",
    { name: "Languages for Global Business, Trade and Tourism", slug: "languages-for-global-business-trade-and-tourism", languages: ["en"], duration_years: 2, level: "master" },
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

// Join a primary field with fold-in extras, labelled, skipping empties.
function joinSections(primary, extras) {
  const parts = [];
  const main = flattenText(primary);
  if (main) parts.push(main);
  for (const [label, value] of extras) {
    const text = flattenText(value);
    if (text) parts.push(`${label}: ${text}`);
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
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
      return new URL(u).hostname.endsWith("univr.it");
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

// required_documents items: { document, applicant_categories, required, condition, source_url }
function formatDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return flattenText(value);
  const name = flattenText(value.document ?? value.document_name);
  const categories = flattenText(value.applicant_categories ?? value.required_for);
  const condition = flattenText(value.condition ?? value.notes);
  const requiredFlag = typeof value.required === "boolean" ? (value.required ? null : "optional") : null;
  const context = [categories, requiredFlag].filter(Boolean).join(" · ");
  if (name && context && condition) return `${name} (${context}): ${condition}`;
  if (name && context) return `${name} (${context})`;
  if (name && condition) return `${name}: ${condition}`;
  if (name) return name;
  return flattenText(value);
}

function normalizeDocumentArray(value, extraRules, file) {
  const items = [];
  if (typeof value === "string" && value.trim()) items.push(value.trim());
  else if (Array.isArray(value)) items.push(...value.map(formatDocument).filter(Boolean));
  if (items.length === 0) throw new Error(`${file} has empty/invalid required_documents`);
  const rules = flattenText(extraRules);
  if (rules) items.push(`Legalisation/translation rules: ${rules}`);
  return items;
}

// uncertainty_notes items: { field, issue, conflict_type, ... } -> readable lines
function normalizeNotesArray(value, field, file) {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) throw new Error(`${file} has non-array ${field}`);
  return value
    .map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const f = flattenText(item.field);
        const issue = flattenText(item.issue) ?? flattenText(item);
        const type = flattenText(item.conflict_type);
        const rest = Object.entries(item)
          .filter(([k]) => !["field", "issue", "conflict_type"].includes(k))
          .map(([k, v]) => {
            const t = flattenText(v);
            return t ? `${humanizeKey(k)}: ${t}` : null;
          })
          .filter(Boolean)
          .join("; ");
        const head = f ? `[${f}] ` : "";
        const tail = [type ? `(${type})` : null, rest || null].filter(Boolean).join(" ");
        return `${head}${issue}${tail ? " " + tail : ""}`.trim();
      }
      return flattenText(item);
    })
    .filter(Boolean);
}

// source_quotes items: { fields_supported, quote, source_url, page_or_section, academic_year }
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
    const section = flattenText(item.page_or_section);
    const quote = baseQuote && section ? `${baseQuote} [${section}]` : baseQuote;
    const url =
      typeof item.source_url === "string" && item.source_url.trim()
        ? item.source_url.trim()
        : typeof item.url === "string" && item.url.trim()
          ? item.url.trim()
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

function normalizeStringArray(value, field, file) {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) throw new Error(`${file} has non-array ${field}`);
  return value.map(flattenText).filter(Boolean);
}

function loadSourceFiles() {
  const files = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  if (files.length !== EXPECTED_SOURCE_FILE_COUNT) {
    throw new Error(`Expected ${EXPECTED_SOURCE_FILE_COUNT} Verona source files, found ${files.length}`);
  }
  return files.map((file) => {
    const record = JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8"));
    const name = record.programme_name ?? record.program_name;
    if (typeof name !== "string" || !name.trim()) throw new Error(`${file} is missing programme_name`);
    record.__name = name.trim();
    if (typeof record.teaching_language !== "string" || !record.teaching_language.trim()) {
      throw new Error(`${file} is missing teaching_language`);
    }
    if (!Array.isArray(record.uncertain)) throw new Error(`${file} has non-array uncertain`);
    return { file, record, level: deriveLevelCategory(record.level, file) };
  });
}

async function fetchDepartments(supabase) {
  const { data, error } = await supabase
    .from("university_departments")
    .select("id,name,level,sort_order")
    .eq("university_id", VERONA_UNIVERSITY_ID);
  if (error) throw new Error(`Failed to fetch Verona departments: ${error.message}`);
  return data ?? [];
}

async function fetchExistingAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("program_admission_details")
    .select("department_id")
    .eq("university_id", VERONA_UNIVERSITY_ID)
    .in("department_id", departmentIds);
  if (error) throw new Error(`Failed to fetch existing admission details: ${error.message}`);
  return data ?? [];
}

function buildPlan(sources, departments) {
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
        insert: { university_id: VERONA_UNIVERSITY_ID, ...newSpec, sort_order: maxSortOrderByLevel[newSpec.level] },
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
    universityId: VERONA_UNIVERSITY_ID,
    sourceFileCount: sources.length,
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
    university_id: VERONA_UNIVERSITY_ID,
    raw_program_name: record.__name,
    raw_level: flattenText(record.level),
    raw_teaching_language: joinSections(record.teaching_language, [["Fully English-taught", record.fully_english_taught]]),
    campus: flattenText(record.campus),
    degree_class: flattenText(record.degree_class),
    admission_type: joinSections(record.admission_type, [
      ["Official wording", record.admission_type_official_wording],
      ["Admission routes", record.admission_routes],
    ]),
    academic_requirements: joinSections(record.academic_requirements, [
      ["Curricula/tracks", record.curricula_tracks],
      ["Double degree options", record.double_degree_options],
    ]),
    language_requirements: flattenText(record.language_requirements),
    application_deadline_eu: joinSections(record.application_deadline_eu, [["Application windows", record.application_windows]]),
    application_deadline_non_eu: joinSections(record.application_deadline_non_eu, [
      ["Universitaly deadline", record.universitaly_deadline],
      ["Visa pre-enrolment required", record.visa_pre_enrolment_required],
    ]),
    required_documents: normalizeDocumentArray(record.required_documents, record.document_legalisation_translation_rules, file),
    entry_exam_or_test: joinSections(record.entry_exam_or_test, [
      ["Selection components", record.selection_components],
      ["Ranking and quota", record.ranking_and_quota],
      ["Application fee", record.application_fee],
    ]),
    tuition_or_fees_link: extractPrimaryUrl(record.tuition_or_fees_link),
    official_program_url: officialProgramUrl,
    official_call_url: extractPrimaryUrl(record.official_call_url),
    source_quotes: normalizeSourceQuotes(record.source_quotes, officialProgramUrl, file),
    uncertain: normalizeStringArray(record.uncertain, "uncertain", file),
    uncertainty_notes: normalizeNotesArray(record.uncertainty_notes, "uncertainty_notes", file),
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
      throw new Error(`Refusing: ${existing.length} admission rows already exist for Verona (expected none).`);
    }

    const { error: insertDetailsError } = await supabase.from("program_admission_details").insert(detailPayloads);
    if (insertDetailsError) throw new Error(`Failed to insert admission details: ${insertDetailsError.message}`);

    return { detailInserts: detailPayloads.length, insertedDepartmentIds: Object.fromEntries(insertedDepartmentIdByFile) };
  } catch (error) {
    if (departmentIdsTouched.length > 0) {
      await supabase
        .from("program_admission_details")
        .delete()
        .eq("university_id", VERONA_UNIVERSITY_ID)
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
  const sources = loadSourceFiles();
  const departments = await fetchDepartments(supabase);
  const plan = buildPlan(sources, departments);
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
    console.log(`[OK] Applied ${applyResult.detailInserts} Verona program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
