import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const NAPOLI_UNIVERSITY_ID = 14;
const EXPECTED_SOURCE_FILE_COUNT = 33;
const SOURCE_GENERATED_AT = "2026-08-30";
const RESULTS_DIR = resolve(process.cwd(), "napoli-federico-ii-english-programs/results");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "napoli-federico-ii-program-details-import-report.json");

// Departments that already existed in the DB before this research (pre-seeded catalog).
// Verified 2026-09-01 by querying university_departments where university_id = 14.
const FILE_TO_EXISTING_DEPARTMENT = new Map([
  ["bsc-civil-environmental-engineering.json", { id: 355, name: "Civil and Environmental Engineering", level: "bachelor" }],
  ["bsc-biology-one-health.json", { id: 354, name: "Biology for One-Health", level: "bachelor" }],
  ["bsc-hospitality-management.json", { id: 357, name: "Hospitality Management", level: "bachelor" }],
  // Medicine and Surgery is mis-seeded as level=bachelor; research confirmed it is a 6-year
  // single-cycle degree (LM-41). See MEDICINE_LEVEL_FIX below — this is the only pre-existing
  // department row this import corrects rather than just attaches admission details to.
  ["sc-medicine-surgery-eng.json", { id: 358, name: "Medicine and Surgery", level: "bachelor", expectedFixedLevel: "single-cycle" }],
  ["msc-sustainable-food-systems.json", { id: 665, name: "Sustainable Food Systems", level: "master" }],
  ["msc-architecture-heritage.json", { id: 666, name: "Architecture & Heritage", level: "master" }],
  ["msc-design-built-environment.json", { id: 667, name: "Design for the Built Environment", level: "master" }],
  ["msc-medical-biotechnology-curriculum.json", { id: 668, name: "Biotecnologie mediche / Medical Biotechnology", level: "master" }],
  ["msc-economics-finance-lmef.json", { id: 669, name: "Economics and Finance – LMEF", level: "master" }],
  ["msc-autonomous-vehicle-engineering.json", { id: 670, name: "Autonomous Vehicle Engineering", level: "master" }],
  ["msc-data-science.json", { id: 671, name: "Data Science", level: "master" }],
  ["msc-industrial-bioengineering.json", { id: 672, name: "Industrial Bioengineering", level: "master" }],
  ["msc-chemical-engineering-curriculum.json", { id: 673, name: "Chemical Engineering", level: "master" }],
  ["msc-structural-geotechnical-engineering-strega.json", { id: 674, name: "Structural and Geotechnical Engineering – STReGA", level: "master" }],
  ["msc-transportation-engineering-mobility.json", { id: 675, name: "Transportation Engineering and Mobility", level: "master" }],
  ["msc-mechanical-engineering-design-manufacturing-curriculum.json", { id: 676, name: "Mechanical Engineering for Design and Manufacturing", level: "master" }],
  ["msc-mechanical-engineering-energy-environment-curriculum.json", { id: 677, name: "Mechanical Engineering for Energy and the Environment", level: "master" }],
  ["msc-precision-livestock-farming.json", { id: 678, name: "Precision Livestock Farming", level: "master" }],
  ["msc-biology-extreme-environments.json", { id: 679, name: "Biology of Extreme Environments", level: "master" }],
  ["msc-molecular-industrial-biotechnology-curriculum.json", { id: 680, name: "Molecular and Industrial Biotechnology", level: "master" }],
  ["msc-industrial-chemistry-circular-bioeconomy.json", { id: 681, name: "Industrial Chemistry for Circular and Bio Economy – Napoli/Torino", level: "master" }],
  ["msc-marine-biology-aquaculture.json", { id: 682, name: "Marine Biology and Aquaculture", level: "master" }],
  ["msc-mathematical-engineering.json", { id: 683, name: "Mathematical Engineering", level: "master" }],
  ["msc-quantum-science-engineering.json", { id: 684, name: "Quantum Science and Engineering", level: "master" }],
  ["msc-chemical-sciences-curriculum.json", { id: 685, name: "Chemical Sciences", level: "master" }],
  ["msc-volcanology.json", { id: 686, name: "Volcanology", level: "master" }],
  ["msc-international-relations.json", { id: 687, name: "International Relations", level: "master" }],
  ["msc-digisoc.json", { id: 688, name: "DIGISOC – Digital Society, Social Innovation and Global Citizenship", level: "master" }],
  ["msc-languages-literatures-european-plurilingualism.json", { id: 689, name: "Languages and Literatures for European Plurilingualism", level: "master" }],
]);

// Medicine and Surgery's level correction (bachelor -> single-cycle). Confirmed by Kerem
// 2026-09-01: this is a genuine data-quality fix to a pre-existing row, not new research scope.
// sort_order is reset to 0 since it becomes the first single-cycle row for this university.
const MEDICINE_LEVEL_FIX = {
  departmentId: 358,
  from: { level: "bachelor", sort_order: 4 },
  to: { level: "single-cycle", sort_order: 0 },
};

// Programs with NO pre-existing department row. Confirmed with Kerem 2026-09-01: insert new
// university_departments rows for these four, sort_order continuing each level's existing max
// (bachelor max was 3, master max was 25; single-cycle restarts at 0 via MEDICINE_LEVEL_FIX above).
const NEW_DEPARTMENTS = new Map([
  [
    "bsc-electrical-engineering-it.json",
    {
      name: "Electrical Engineering and Information Technology",
      slug: "electrical-engineering-and-information-technology",
      languages: ["en"],
      duration_years: 3,
      level: "bachelor",
      sort_order: 4,
    },
  ],
  [
    "sc-veterinary-medicine.json",
    {
      name: "Veterinary Medicine",
      slug: "veterinary-medicine",
      languages: ["en"],
      duration_years: 5,
      level: "single-cycle",
      sort_order: 1,
    },
  ],
  [
    "msc-aerospace-engineering.json",
    {
      name: "Aerospace Engineering",
      slug: "aerospace-engineering",
      languages: ["en"],
      duration_years: 2,
      level: "master",
      sort_order: 26,
    },
  ],
  [
    "msc-environmental-sustainability-curriculum.json",
    {
      name: "Ingegneria per l'Ambiente e il Territorio / Environmental Sustainability",
      slug: "ingegneria-per-lambiente-e-il-territorio-environmental-sustainability",
      languages: ["en"],
      duration_years: 2,
      level: "master",
      sort_order: 27,
    },
  ],
]);

// Pre-existing Federico II department that this research did NOT cover (not one of the 33
// items). Left untouched — no admission_details row will be created for it.
const KNOWN_UNCOVERED_DEPARTMENTS = ["Community Design"];

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

function optionalText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function requiredText(value, field, file) {
  const text = optionalText(value);
  if (!text) throw new Error(`${file} is missing required field: ${field}`);
  return text;
}

// Every free-text field in this research is a dense, multi-sentence paragraph (the raw_*
// columns are deliberately "raw" — see AGENT_CONTEXT.md on ProgramAdmissionDetailsPanel
// rendering these as a sourced dossier, not a table of short values). That verbosity is fine
// for display-only fields. It is NOT fine for the three fields the frontend uses directly as
// an <a href>: officialProgramUrl, officialCallUrl, tuitionOrFeesLink. Our agents wrote those
// as "url (description) | url2 (description2) | ..." compound strings, which would produce a
// broken href if stored as-is. This extracts the first well-formed URL only.
// Some fields mention an off-domain URL before the actual unina.it source (e.g. DIGISOC's
// tuition_or_fees_link leads with an Olomouc partner-university waste-tax aside before citing
// unina.it's own fee page), so "first URL in the text" is not always the right one. Prefer the
// first *.unina.it URL; only fall back to the first URL of any domain if no unina.it URL
// exists at all (this preserves genuinely-external application channels, e.g. Google Forms
// linked from an official unina.it admission page, when unina.it itself has nothing better).
function extractPrimaryUrl(value, field, file, { required = false } = {}) {
  const text = optionalText(value);
  if (!text) {
    if (required) throw new Error(`${file} is missing required field: ${field}`);
    return null;
  }
  const urls = text.match(/https?:\/\/[^\s)"'|,]+/g) ?? [];
  const cleaned = urls.map((url) => url.replace(/[.,;:)\]}]+$/, ""));
  const uninaUrl = cleaned.find((url) => {
    try {
      return new URL(url).hostname.endsWith("unina.it");
    } catch {
      return false;
    }
  });
  const chosen = uninaUrl ?? cleaned[0];
  if (!chosen) {
    if (required) throw new Error(`${file} has no extractable URL in ${field}: ${text.slice(0, 120)}`);
    return null;
  }
  return chosen;
}

// required_documents / uncertainty_notes are schema'd as jsonb arrays in the DB, but every
// agent run in this research wrote them as a single descriptive paragraph (not a pre-split
// list). Wrap as a one-element array so no text is lost or invented-split.
function wrapAsSingleElementArray(value, file, field) {
  if (Array.isArray(value)) {
    const items = value.map((item) => optionalText(item)).filter(Boolean);
    if (items.length === 0) throw new Error(`${file} has empty ${field}`);
    return items;
  }
  const text = optionalText(value);
  if (!text) throw new Error(`${file} has empty ${field}`);
  return [text];
}

// Kerem's decision 2026-09-01: seats_total / non_eu_reserved_seats have no dedicated DB
// column, so fold them verbatim (not a regex-extracted number, to avoid misreading nuanced
// cases like DIGISOC's "5 of 90 are Naples' non-EU share") into the front of
// academic_requirements, only when the field actually has a figure (not a "Not published"
// stub).
function hasRealSeatsValue(text) {
  const value = optionalText(text);
  return Boolean(value) && !/^not published/i.test(value);
}

function buildAcademicRequirements(record, file) {
  const base = requiredText(record.academic_requirements, "academic_requirements", file);
  const seatsTotal = optionalText(record.seats_total);
  const nonEuSeats = optionalText(record.non_eu_reserved_seats);
  const prefixParts = [];
  if (hasRealSeatsValue(seatsTotal)) prefixParts.push(`Seats (total): ${seatsTotal}`);
  if (hasRealSeatsValue(nonEuSeats)) prefixParts.push(`Seats (non-EU reserved): ${nonEuSeats}`);
  if (prefixParts.length === 0) return base;
  return `${prefixParts.join(" | ")}\n\n${base}`;
}

// level in this research is free text ("single-cycle (laurea magistrale a ciclo unico, 6
// years ...)", "bachelor", etc.) — extract just the leading category to sanity-check against
// the department it's being attached to. Only used for the 29 pre-existing-department rows;
// the 4 new inserts use a hardcoded, already-confirmed level instead.
function deriveLevelCategory(value, file) {
  const text = optionalText(value);
  if (!text) throw new Error(`${file} is missing required field: level`);
  const lower = text.toLowerCase();
  if (lower.startsWith("single-cycle") || lower.startsWith("single cycle")) return "single-cycle";
  if (lower.startsWith("master")) return "master";
  if (lower.startsWith("bachelor")) return "bachelor";
  throw new Error(`${file} has unrecognized level: ${text.slice(0, 80)}`);
}

function normalizeUncertainArray(value, file) {
  if (!Array.isArray(value)) throw new Error(`${file} has non-array uncertain`);
  return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}

// source_quotes came out in two different shapes across the 33 agent runs:
//   (a) array of plain strings (often with a URL already embedded inline)
//   (b) array of {claim, quote, source} objects
// The frontend's normalizeSourceQuotes()/buildAdmissionEvidence() requires
// {url, quote, retrieved_at, field_refs} per item. field_refs is always [] here — none of our
// agents tagged quotes to specific fields — so quotes render as general dossier evidence
// grouped by source URL rather than inline per-field citations.
function buildSourceQuotes(record, officialProgramUrl, file) {
  const raw = record.source_quotes;
  const retrievedAt = optionalText(record.research_date) ?? SOURCE_GENERATED_AT;
  // A few agent runs wrote source_quotes as a plain object keyed by topic label (e.g.
  // {access_type_decisive: "...", degree_class: "..."}) instead of an array. Each value is a
  // quote string in the same shape as the plain-string-array case, so flatten to a list.
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? Object.values(raw)
      : optionalText(raw)
        ? [raw]
        : [];
  if (list.length === 0) throw new Error(`${file} has empty source_quotes`);

  return list.map((item, index) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const quote = optionalText(item.quote);
      if (!quote) throw new Error(`${file} has empty source_quotes[${index}].quote`);
      const url = extractPrimaryUrl(item.source, `source_quotes[${index}].source`, file) ?? officialProgramUrl;
      return { url, quote, field_refs: [], retrieved_at: retrievedAt };
    }
    const quote = optionalText(item);
    if (!quote) throw new Error(`${file} has empty source_quotes[${index}]`);
    const url = extractPrimaryUrl(quote, `source_quotes[${index}]`, file) ?? officialProgramUrl;
    return { url, quote, field_refs: [], retrieved_at: retrievedAt };
  });
}

function loadSourceFiles() {
  const files = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  if (files.length !== EXPECTED_SOURCE_FILE_COUNT) {
    throw new Error(`Expected ${EXPECTED_SOURCE_FILE_COUNT} Napoli source files, found ${files.length}`);
  }

  return files.map((file) => {
    const record = JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8"));
    const requiredStringFields = ["program_name", "level", "teaching_language", "admission_type", "academic_requirements"];
    for (const field of requiredStringFields) {
      requiredText(record[field], field, file);
    }
    if (!Array.isArray(record.uncertain)) throw new Error(`${file} has non-array uncertain`);
    return { file, record };
  });
}

async function fetchDepartments(supabase) {
  const { data, error } = await supabase
    .from("university_departments")
    .select("id,university_id,name,slug,languages,duration_years,level,sort_order")
    .eq("university_id", NAPOLI_UNIVERSITY_ID)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch Napoli departments: ${error.message}`);
  return data ?? [];
}

async function fetchExistingAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("program_admission_details")
    .select(
      "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file"
    )
    .eq("university_id", NAPOLI_UNIVERSITY_ID)
    .in("department_id", departmentIds);
  if (error) throw new Error(`Failed to fetch existing admission details: ${error.message}`);
  return data ?? [];
}

function buildPlan(sourceFiles, departments) {
  const warnings = [];
  const byId = new Map(departments.map((d) => [d.id, d]));

  const resolvedRows = [];
  for (const { file, record } of sourceFiles) {
    const existing = FILE_TO_EXISTING_DEPARTMENT.get(file);
    const toInsert = NEW_DEPARTMENTS.get(file);

    if (existing) {
      const dept = byId.get(existing.id);
      if (!dept) {
        warnings.push(`${file}: expected existing department id=${existing.id} not found in DB`);
        continue;
      }
      if (dept.name !== existing.name) {
        warnings.push(`${file}: department id=${existing.id} name mismatch — DB has "${dept.name}", expected "${existing.name}"`);
      }
      const sourceLevel = deriveLevelCategory(record.level, file);
      const expectedLevel = existing.expectedFixedLevel ?? existing.level;
      if (sourceLevel !== expectedLevel) {
        warnings.push(`${file}: source level "${sourceLevel}" does not match expected department level "${expectedLevel}"`);
      }
      resolvedRows.push({ file, record, departmentRef: existing.id, needsLevelFix: Boolean(existing.expectedFixedLevel) });
      continue;
    }

    if (toInsert) {
      const sourceLevel = deriveLevelCategory(record.level, file);
      if (sourceLevel !== toInsert.level) {
        warnings.push(`${file}: source level "${sourceLevel}" does not match planned new-department level "${toInsert.level}"`);
      }
      resolvedRows.push({ file, record, departmentRef: `new:${file}` });
      continue;
    }

    warnings.push(`No department mapping (existing or new) defined for source file: ${file}`);
  }

  const coveredIds = new Set([...FILE_TO_EXISTING_DEPARTMENT.values()].map((m) => m.id));
  const uncoveredExisting = departments
    .filter((d) => !coveredIds.has(d.id))
    .map((d) => ({ id: d.id, name: d.name, level: d.level }));

  return {
    universityId: NAPOLI_UNIVERSITY_ID,
    sourceFileCount: sourceFiles.length,
    existingDepartmentCount: departments.length,
    medicineLevelFix: MEDICINE_LEVEL_FIX,
    newDepartments: [...NEW_DEPARTMENTS.entries()].map(([file, dept]) => ({ file, ...dept })),
    resolvedRows,
    uncoveredExisting,
    knownUncoveredDepartments: KNOWN_UNCOVERED_DEPARTMENTS,
    warnings,
  };
}

function toDetailPayload(record, departmentId, file) {
  const officialProgramUrl = extractPrimaryUrl(record.official_program_url, "official_program_url", file, { required: true });
  return {
    department_id: departmentId,
    university_id: NAPOLI_UNIVERSITY_ID,
    raw_program_name: requiredText(record.program_name, "program_name", file),
    raw_level: requiredText(record.level, "level", file),
    raw_teaching_language: requiredText(record.teaching_language, "teaching_language", file),
    campus: optionalText(record.campus),
    degree_class: optionalText(record.degree_class),
    admission_type: optionalText(record.admission_type),
    academic_requirements: buildAcademicRequirements(record, file),
    language_requirements: optionalText(record.language_requirements),
    application_deadline_eu: optionalText(record.application_deadline_eu),
    application_deadline_non_eu: optionalText(record.application_deadline_non_eu),
    required_documents: wrapAsSingleElementArray(record.required_documents, file, "required_documents"),
    entry_exam_or_test: optionalText(record.entry_exam_or_test),
    tuition_or_fees_link: extractPrimaryUrl(record.tuition_or_fees_link, "tuition_or_fees_link", file),
    official_program_url: officialProgramUrl,
    official_call_url: extractPrimaryUrl(record.official_call_url, "official_call_url", file),
    source_quotes: buildSourceQuotes(record, officialProgramUrl, file),
    uncertain: normalizeUncertainArray(record.uncertain, file),
    uncertainty_notes: wrapAsSingleElementArray(record.uncertainty_notes, file, "uncertainty_notes"),
    source_file: file,
  };
}

async function applyPlan(supabase, plan) {
  let medicineLevelFixed = false;
  const insertedDepartmentIds = new Map(); // file -> new department id
  let admissionSnapshot = [];
  const departmentIdsTouched = [];

  try {
    const { error: medFixError } = await supabase
      .from("university_departments")
      .update(plan.medicineLevelFix.to)
      .eq("id", plan.medicineLevelFix.departmentId)
      .eq("university_id", NAPOLI_UNIVERSITY_ID);
    if (medFixError) throw new Error(`Failed to fix Medicine and Surgery level: ${medFixError.message}`);
    medicineLevelFixed = true;

    for (const dept of plan.newDepartments) {
      const { file, ...insertPayload } = dept;
      const { data: insertedRows, error: insertError } = await supabase
        .from("university_departments")
        .insert([{ university_id: NAPOLI_UNIVERSITY_ID, ...insertPayload }])
        .select("id");
      if (insertError) throw new Error(`Failed to insert department for ${file}: ${insertError.message}`);
      insertedDepartmentIds.set(file, insertedRows[0].id);
    }

    const detailPayloads = plan.resolvedRows.map(({ file, record, departmentRef }) => {
      const departmentId = departmentRef.startsWith?.("new:") ? insertedDepartmentIds.get(file) : departmentRef;
      return toDetailPayload(record, departmentId, file);
    });

    departmentIdsTouched.push(...detailPayloads.map((d) => d.department_id));
    admissionSnapshot = await fetchExistingAdmissionDetails(supabase, departmentIdsTouched);

    const { error: upsertError } = await supabase
      .from("program_admission_details")
      .upsert(detailPayloads, { onConflict: "department_id" });
    if (upsertError) throw new Error(`Failed to upsert admission details: ${upsertError.message}`);

    return {
      detailUpserts: detailPayloads.length,
      insertedDepartmentIds: Object.fromEntries(insertedDepartmentIds),
      medicineLevelFixed,
    };
  } catch (error) {
    if (admissionSnapshot.length > 0) {
      await supabase.from("program_admission_details").upsert(admissionSnapshot, { onConflict: "department_id" });
    } else if (departmentIdsTouched.length > 0) {
      await supabase
        .from("program_admission_details")
        .delete()
        .eq("university_id", NAPOLI_UNIVERSITY_ID)
        .in("department_id", departmentIdsTouched);
    }
    for (const id of insertedDepartmentIds.values()) {
      await supabase.from("university_departments").delete().eq("id", id);
    }
    if (medicineLevelFixed) {
      await supabase
        .from("university_departments")
        .update(plan.medicineLevelFix.from)
        .eq("id", plan.medicineLevelFix.departmentId);
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
    medicineLevelFix: plan.medicineLevelFix,
    newDepartments: plan.newDepartments,
    resolvedRowCount: plan.resolvedRows.length,
    resolvedRows: plan.resolvedRows.map((r) => ({ file: r.file, departmentRef: r.departmentRef })),
    uncoveredExistingDepartments: plan.uncoveredExisting,
    knownUncoveredDepartments: plan.knownUncoveredDepartments,
    warnings: plan.warnings,
    preview: plan.preview,
    applied: applyResult,
  };
}

// Build every row's DB payload up front (against a dummy id for not-yet-created departments)
// so malformed source data surfaces as a dry-run warning instead of failing mid-transaction
// during --apply.
function validatePayloadsBuildCleanly(plan) {
  const errors = [];
  for (const { file, record, departmentRef } of plan.resolvedRows) {
    const dummyId = typeof departmentRef === "number" ? departmentRef : -1;
    try {
      toDetailPayload(record, dummyId, file);
    } catch (error) {
      errors.push(`${file}: payload build failed — ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return errors;
}

// Compact per-row summary for human review before --apply — not the full payload (too long
// given how verbose these fields are), just enough to sanity-check the three href fields,
// the department mapping and the quote/document/uncertainty counts.
function buildPreview(plan) {
  return plan.resolvedRows.map(({ file, record, departmentRef }) => {
    const dummyId = typeof departmentRef === "number" ? departmentRef : -1;
    try {
      const payload = toDetailPayload(record, dummyId, file);
      return {
        file,
        departmentRef,
        raw_program_name: payload.raw_program_name.slice(0, 80),
        raw_level: payload.raw_level.slice(0, 40),
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
    const applyResult = await applyPlan(supabase, plan);
    report = reportForOutput(plan, applyResult);
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`[OK] Applied ${applyResult.detailUpserts} Napoli Federico II program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
