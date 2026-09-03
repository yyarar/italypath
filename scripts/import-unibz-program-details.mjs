import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const UNIBZ_UNIVERSITY_ID = 6;
const EXPECTED_SOURCE_FILE_COUNT = 32;
const SOURCE_GENERATED_AT = "2026-08-29";
const RESULTS_DIR = resolve(process.cwd(), "unibz-english-programs/results_17fields");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "unibz-program-details-import-report.json");

// Explicit, hand-verified mapping: source JSON file -> existing university_departments row.
// Every UNIBZ department already exists in the DB (seeded separately from this research).
// "Design and Art" is a special case: the DB has ONE row for it, but Major in Design and
// Major in Art are separate admission processes (separate quotas/deadlines/ranking lists),
// so that one row is split into two (rename existing + insert new) — see SPECIAL_CASE below.
const FILE_TO_DEPARTMENT_NAME = new Map([
  ["Bachelor_in_Computer_Science.json", { name: "Computer Science", level: "bachelor" }],
  [
    "Bachelor_in_Informatics_and_Management_of_Digital_Business.json",
    { name: "Informatics and Management of Digital Business", level: "bachelor" },
  ],
  [
    "Bachelor_in_Electronic_and_Information_Engineering.json",
    { name: "Electronic and Information Engineering", level: "bachelor" },
  ],
  [
    "Bachelor_in_Industrial_and_Mechanical_Engineering.json",
    { name: "Industrial and Mechanical Engineering", level: "bachelor" },
  ],
  ["Bachelor_in_Economics_and_Management.json", { name: "Economics and Management", level: "bachelor" }],
  [
    "Bachelor_in_Economics_Politics_and_Ethics.json",
    { name: "Economics, Politics and Ethics", level: "bachelor" },
  ],
  [
    "Bachelor_in_Tourism_Sport_and_Event_Management.json",
    { name: "Tourism, Sport and Event Management", level: "bachelor" },
  ],
  [
    "Bachelor_in_Food_and_Enogastronomy_Sciences.json",
    { name: "Food and Enogastronomy Sciences", level: "bachelor" },
  ],
  [
    "Bachelor_in_Sustainable_Agriculture_and_Forestry_in_Mountain_Environments.json",
    { name: "Sustainable Agriculture and Forestry in Mountain Environments", level: "bachelor" },
  ],
  [
    "Bachelor_in_Communication_Sciences_and_Culture.json",
    { name: "Communication Sciences and Culture", level: "bachelor" },
  ],
  ["Bachelor_in_Social_Education.json", { name: "Social Education", level: "bachelor" }],
  ["Bachelor_in_Social_Work.json", { name: "Social Work", level: "bachelor" }],
  ["Professional_Bachelor_in_Wood_Technology.json", { name: "Wood Technology", level: "bachelor" }],
  ["Master_in_Software_Engineering.json", { name: "Software Engineering", level: "master" }],
  ["Master_in_Computing_for_Data_Science.json", { name: "Computing for Data Science", level: "master" }],
  [
    "Master_in_Smart_Technologies_for_Sports_and_Health.json",
    { name: "Smart Technologies for Sports and Health", level: "master" },
  ],
  ["Master_in_Energy_Engineering.json", { name: "Energy Engineering", level: "master" }],
  [
    "Master_in_Industrial_Mechanical_Engineering.json",
    { name: "Industrial Mechanical Engineering", level: "master" },
  ],
  ["Master_in_Accounting_and_Finance.json", { name: "Accounting and Finance", level: "master" }],
  [
    "Master_in_Entrepreneurship_and_Innovation.json",
    { name: "Entrepreneurship and Innovation", level: "master" },
  ],
  [
    "Master_in_Data_Analytics_for_Economics_and_Management.json",
    { name: "Data Analytics for Economics and Management", level: "master" },
  ],
  [
    "Master_in_Public_Policy_and_Innovative_Governance.json",
    { name: "Public Policy and Innovative Governance", level: "master" },
  ],
  [
    "Master_in_Environmental_Management_of_Mountain_Areas_EMMA.json",
    { name: "Environmental Management of Mountain Areas", level: "master" },
  ],
  [
    "Master_in_Food_Sciences_for_Innovation_and_Authenticity.json",
    { name: "Food Sciences for Innovation and Authenticity", level: "master" },
  ],
  [
    "Master_in_Smart_Sustainable_Agriculture_Systems_in_Mountain_Areas.json",
    { name: "Smart Sustainable Agriculture Systems in Mountain Areas", level: "master" },
  ],
  ["Master_in_Critical_Creative_Practices.json", { name: "Critical Creative Practices", level: "master" }],
  ["Master_in_Eco-Social_Design.json", { name: "Eco-Social Design", level: "master" }],
  [
    "Master_in_Social_Work_and_Social_Policy.json",
    { name: "Social Work and Social Policy", level: "master" },
  ],
  ["Master_in_Tourism_Management.json", { name: "Tourism Management", level: "master" }],
  ["International_Master_in_Horticultural_Science_IMaHS.json", { name: "Horticultural Science", level: "master" }],
]);

const SPECIAL_CASE_DESIGN_FILE = "Bachelor_in_Design_and_Art_Major_in_Design.json";
const SPECIAL_CASE_ART_FILE = "Bachelor_in_Design_and_Art_Major_in_Art.json";
const EXISTING_DESIGN_AND_ART_NAME = "Design and Art";
const NEW_DESIGN_NAME = "Design and Art — Major in Design";
const NEW_ART_NAME = "Design and Art — Major in Art";
const NEW_DESIGN_SLUG = "design-and-art-major-in-design";
const NEW_ART_SLUG = "design-and-art-major-in-art";

// Pre-existing UNIBZ departments in the DB that this research did NOT cover.
// Left untouched — no admission_details row will be created for these.
const KNOWN_UNCOVERED_DEPARTMENTS = ["Viticulture, Enology and Wine Marketing", "Primary Education"];

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

// My 17-field JSON mostly stores required_documents / uncertainty_notes as a single
// descriptive paragraph (not a pre-split list like other universities' imports), but a
// few agent runs produced an array instead. The DB column is jsonb and the frontend only
// renders it if it is a JSON array of strings, so normalize either shape into an array —
// this preserves the full text with zero loss, no invented splits.
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

// Some agent runs wrote a full descriptive sentence into `level` (e.g. "bachelor
// (first-cycle degree, 3 years, 180 ECTS)...") instead of the plain enum value the
// schema asked for. The full text is preserved as raw_level; this only extracts the
// leading bachelor/master token for matching against the existing department's level.
function deriveLevelCategory(value, file) {
  const text = optionalText(value);
  if (!text) throw new Error(`${file} is missing required field: level`);
  const lower = text.toLowerCase();
  if (lower.startsWith("master")) return "master";
  if (lower.startsWith("bachelor")) return "bachelor";
  throw new Error(`${file} has unrecognized level: ${text.slice(0, 80)}`);
}

function normalizeUncertainArray(value, file) {
  if (!Array.isArray(value)) throw new Error(`${file} has non-array uncertain`);
  return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}

// source_quotes in my data is an array of quote strings (often with a bracketed source
// annotation like "[admission-information PDF]" already inside the text), not an array of
// {quote,url} objects. The frontend's normalizeSourceQuotes() requires url + quote +
// retrieved_at per item or it silently drops that item. My trimmed 17-field schema has only
// one URL per program (official_program_url), so every quote for a program is attributed to
// that same URL — a real, honest source, just less granular than the original per-PDF link
// (which was one of the fields removed to match Kerem's exact 17-field spec).
function buildSourceQuotes(rawQuotes, officialProgramUrl, file) {
  // A few agent runs wrote one long string instead of a list of quotes — treat it as a
  // single quote rather than discarding the sourcing text.
  const quoteList = Array.isArray(rawQuotes) ? rawQuotes : optionalText(rawQuotes) ? [rawQuotes] : [];
  if (quoteList.length === 0) {
    throw new Error(`${file} has empty source_quotes`);
  }
  return quoteList.map((item, index) => {
    const quote = optionalText(item);
    if (!quote) throw new Error(`${file} has empty source_quotes[${index}]`);
    return {
      url: officialProgramUrl,
      quote,
      field_refs: [],
      retrieved_at: SOURCE_GENERATED_AT,
    };
  });
}

function loadSourceFiles() {
  const files = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  if (files.length !== EXPECTED_SOURCE_FILE_COUNT) {
    throw new Error(`Expected ${EXPECTED_SOURCE_FILE_COUNT} UNIBZ source files, found ${files.length}`);
  }

  return files.map((file) => {
    const record = JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8"));
    const requiredStringFields = [
      "program_name",
      "level",
      "teaching_language",
      "admission_type",
      "official_program_url",
    ];
    for (const field of requiredStringFields) {
      requiredText(record[field], field, file);
    }
    if (!Array.isArray(record.source_quotes) && !optionalText(record.source_quotes)) {
      throw new Error(`${file} has empty/invalid source_quotes`);
    }
    if (!Array.isArray(record.uncertain)) throw new Error(`${file} has non-array uncertain`);

    const level = deriveLevelCategory(record.level, file);

    return { file, record, level };
  });
}

async function fetchDepartments(supabase) {
  const { data, error } = await supabase
    .from("university_departments")
    .select("id,university_id,name,slug,languages,duration_years,level,sort_order")
    .eq("university_id", UNIBZ_UNIVERSITY_ID)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch UNIBZ departments: ${error.message}`);
  return data ?? [];
}

async function fetchExistingAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("program_admission_details")
    .select(
      "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file"
    )
    .eq("university_id", UNIBZ_UNIVERSITY_ID)
    .in("department_id", departmentIds);
  if (error) throw new Error(`Failed to fetch existing admission details: ${error.message}`);
  return data ?? [];
}

function buildPlan(sourceFiles, departments) {
  const warnings = [];
  const byNameLevel = new Map(departments.map((d) => [`${d.name}::${d.level}`, d]));

  const designAndArtDept = departments.find(
    (d) => d.name === EXISTING_DESIGN_AND_ART_NAME && d.level === "bachelor"
  );
  if (!designAndArtDept) {
    warnings.push(`Could not find existing "${EXISTING_DESIGN_AND_ART_NAME}" department to split.`);
  }
  const maxBachelorSortOrder = departments
    .filter((d) => d.level === "bachelor")
    .reduce((max, d) => Math.max(max, d.sort_order ?? 0), 0);

  const departmentRename = designAndArtDept
    ? {
        id: designAndArtDept.id,
        from: { name: designAndArtDept.name, slug: designAndArtDept.slug },
        to: { name: NEW_DESIGN_NAME, slug: NEW_DESIGN_SLUG },
      }
    : null;

  const departmentInsert = {
    university_id: UNIBZ_UNIVERSITY_ID,
    name: NEW_ART_NAME,
    slug: NEW_ART_SLUG,
    languages: designAndArtDept?.languages ?? ["en"],
    duration_years: designAndArtDept?.duration_years ?? 3,
    level: "bachelor",
    sort_order: maxBachelorSortOrder + 1,
  };

  const resolvedRows = [];
  for (const { file, record, level } of sourceFiles) {
    if (file === SPECIAL_CASE_DESIGN_FILE) {
      resolvedRows.push({ file, record, departmentRef: "special:design" });
      continue;
    }
    if (file === SPECIAL_CASE_ART_FILE) {
      resolvedRows.push({ file, record, departmentRef: "special:art" });
      continue;
    }
    const mapping = FILE_TO_DEPARTMENT_NAME.get(file);
    if (!mapping) {
      warnings.push(`No department mapping defined for source file: ${file}`);
      continue;
    }
    const department = byNameLevel.get(`${mapping.name}::${mapping.level}`);
    if (!department) {
      warnings.push(`No existing department "${mapping.name}" (${mapping.level}) found for ${file}`);
      continue;
    }
    if (mapping.level !== level) {
      warnings.push(`${file}: source level "${level}" does not match mapped department level "${mapping.level}"`);
    }
    resolvedRows.push({ file, record, departmentRef: department.id });
  }

  const coveredNames = new Set([
    ...[...FILE_TO_DEPARTMENT_NAME.values()].map((m) => m.name),
    EXISTING_DESIGN_AND_ART_NAME,
  ]);
  const uncoveredExisting = departments
    .filter((d) => !coveredNames.has(d.name))
    .map((d) => ({ id: d.id, name: d.name, level: d.level }));

  return {
    universityId: UNIBZ_UNIVERSITY_ID,
    sourceFileCount: sourceFiles.length,
    existingDepartmentCount: departments.length,
    departmentRename,
    departmentInsert,
    resolvedRows,
    uncoveredExisting,
    knownUncoveredDepartments: KNOWN_UNCOVERED_DEPARTMENTS,
    warnings,
  };
}

function toDetailPayload(record, departmentId, file) {
  const officialProgramUrl = requiredText(record.official_program_url, "official_program_url", file);
  return {
    department_id: departmentId,
    university_id: UNIBZ_UNIVERSITY_ID,
    raw_program_name: requiredText(record.program_name, "program_name", file),
    raw_level: requiredText(record.level, "level", file),
    raw_teaching_language: requiredText(record.teaching_language, "teaching_language", file),
    campus: optionalText(record.campus),
    degree_class: optionalText(record.degree_class),
    admission_type: optionalText(record.admission_type),
    academic_requirements: optionalText(record.academic_requirements),
    language_requirements: optionalText(record.language_requirements),
    application_deadline_eu: optionalText(record.application_deadline_eu),
    application_deadline_non_eu: optionalText(record.application_deadline_non_eu),
    required_documents: wrapAsSingleElementArray(record.required_documents, file, "required_documents"),
    entry_exam_or_test: optionalText(record.entry_exam_or_test),
    tuition_or_fees_link: optionalText(record.tuition_or_fees_link),
    official_program_url: officialProgramUrl,
    official_call_url: optionalText(record.official_call_url),
    source_quotes: buildSourceQuotes(record.source_quotes, officialProgramUrl, file),
    uncertain: normalizeUncertainArray(record.uncertain, file),
    uncertainty_notes: wrapAsSingleElementArray(record.uncertainty_notes, file, "uncertainty_notes"),
    source_file: file,
  };
}

async function applyPlan(supabase, plan) {
  let renamedDepartment = false;
  let insertedDepartmentId = null;
  let admissionSnapshot = [];
  const departmentIdsTouched = [];

  try {
    if (plan.departmentRename) {
      const { error } = await supabase
        .from("university_departments")
        .update(plan.departmentRename.to)
        .eq("id", plan.departmentRename.id)
        .eq("university_id", UNIBZ_UNIVERSITY_ID);
      if (error) throw new Error(`Failed to rename department: ${error.message}`);
      renamedDepartment = true;
    }

    const { data: insertedRows, error: insertError } = await supabase
      .from("university_departments")
      .insert([plan.departmentInsert])
      .select("id");
    if (insertError) throw new Error(`Failed to insert Major in Art department: ${insertError.message}`);
    insertedDepartmentId = insertedRows[0].id;

    const detailPayloads = plan.resolvedRows.map(({ file, record, departmentRef }) => {
      const departmentId =
        departmentRef === "special:design"
          ? plan.departmentRename.id
          : departmentRef === "special:art"
            ? insertedDepartmentId
            : departmentRef;
      return toDetailPayload(record, departmentId, file);
    });

    departmentIdsTouched.push(...detailPayloads.map((d) => d.department_id));
    admissionSnapshot = await fetchExistingAdmissionDetails(supabase, departmentIdsTouched);

    const { error: upsertError } = await supabase
      .from("program_admission_details")
      .upsert(detailPayloads, { onConflict: "department_id" });
    if (upsertError) throw new Error(`Failed to upsert admission details: ${upsertError.message}`);

    return { detailUpserts: detailPayloads.length, insertedDepartmentId, renamedDepartment };
  } catch (error) {
    if (admissionSnapshot.length > 0) {
      await supabase.from("program_admission_details").upsert(admissionSnapshot, { onConflict: "department_id" });
    } else if (departmentIdsTouched.length > 0) {
      await supabase
        .from("program_admission_details")
        .delete()
        .eq("university_id", UNIBZ_UNIVERSITY_ID)
        .in("department_id", departmentIdsTouched);
    }
    if (insertedDepartmentId) {
      await supabase.from("university_departments").delete().eq("id", insertedDepartmentId);
    }
    if (renamedDepartment && plan.departmentRename) {
      await supabase
        .from("university_departments")
        .update(plan.departmentRename.from)
        .eq("id", plan.departmentRename.id);
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
    departmentRename: plan.departmentRename,
    departmentInsert: plan.departmentInsert,
    resolvedRowCount: plan.resolvedRows.length,
    resolvedRows: plan.resolvedRows.map((r) => ({ file: r.file, departmentRef: r.departmentRef })),
    uncoveredExistingDepartments: plan.uncoveredExisting,
    knownUncoveredDepartments: plan.knownUncoveredDepartments,
    warnings: plan.warnings,
    applied: applyResult,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const supabase = createSupabaseClient();
  const sourceFiles = loadSourceFiles();
  const departments = await fetchDepartments(supabase);
  const plan = buildPlan(sourceFiles, departments);
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
    console.log(`[OK] Applied ${applyResult.detailUpserts} UNIBZ program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
