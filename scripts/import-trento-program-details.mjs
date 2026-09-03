import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const TRENTO_UNIVERSITY_ID = 18;
const EXPECTED_SOURCE_FILE_COUNT = 31;
const SOURCE_GENERATED_AT = "2026-08-31";
const RESULTS_DIR = resolve(process.cwd(), "trento-english-programs/results");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "trento-program-details-import-report.json");

// Explicit, hand-verified mapping: source JSON file -> existing university_departments row
// (matched by name + level). Trento's departments were seeded separately from this research
// (26 of 31 researched programs already had a matching row).
const FILE_TO_EXISTING_DEPARTMENT = new Map([
  ["Comparative_European_and_International_Legal_Studies_CEILS.json", { name: "Comparative, European and International Legal Studies", level: "bachelor" }],
  ["Computer_Communications_and_Electronic_Engineering_ICE.json", { name: "Computer, Communications and Electronic Engineering", level: "bachelor" }],
  ["Agrifood_Innovation_Management.json", { name: "Agrifood Innovation Management", level: "master" }],
  ["Artificial_Intelligence_Systems.json", { name: "Artificial Intelligence Systems", level: "master" }],
  ["Behavioural_and_Applied_Economics.json", { name: "Behavioural and Applied Economics - BEA", level: "master" }],
  ["Bioengineering_for_Personalized_Medicine.json", { name: "Bioengineering for Personalized Medicine", level: "master" }],
  ["Cellular_and_Molecular_Biotechnology.json", { name: "Cellular and Molecular Biotechnology", level: "master" }],
  ["Cognitive_Science.json", { name: "Cognitive Science", level: "master" }],
  ["Data_Science.json", { name: "Data Science", level: "master" }],
  ["Energy_Engineering.json", { name: "Energy Engineering", level: "master" }],
  ["Environmental_Meteorology_and_Climate_Physics.json", { name: "Environmental Meteorology and Climate Physics", level: "master" }],
  ["Global_Law_Making.json", { name: "Global Law Making", level: "master" }],
  ["Human_Computer_Interaction.json", { name: "Human-Computer Interaction", level: "master" }],
  ["Information_Engineering.json", { name: "Information Engineering", level: "master" }],
  ["Innovation_Management.json", { name: "Innovation Management - MAIN", level: "master" }],
  ["International_Management.json", { name: "International Management - MIM", level: "master" }],
  ["International_Security_Studies_MISS.json", { name: "International Security Studies", level: "master" }],
  ["European_Master_in_Business_Studies_EMBS.json", { name: "Management - EMBS", level: "master" }],
  ["Management_and_Industrial_Systems_Engineering.json", { name: "Management and Industrial Systems Engineering", level: "master" }],
  ["Materials_Engineering.json", { name: "Materials Engineering", level: "master" }],
  ["Mathematics.json", { name: "Mathematics", level: "master" }],
  // Renamed from "Mechatronics Engineering" -> the 2026/27 official name, applied before matching.
  ["Intelligent_Mechatronics_Engineering.json", { name: "Intelligent Mechatronics Engineering", level: "master" }],
  ["Physics.json", { name: "Physics", level: "master" }],
  ["Quantitative_and_Computational_Biology.json", { name: "Quantitative and Computational Biology", level: "master" }],
  ["Security_Intelligence_and_Strategic_Studies_IMSISS.json", { name: "Security, Intelligence and Strategic Studies", level: "master" }],
  ["Sociology_and_Social_Research.json", { name: "Sociology and Social Research", level: "master" }],
]);

// Renamed before matching: DB still had the pre-2026/27 name.
const DEPARTMENT_RENAME = {
  from: { name: "Mechatronics Engineering", level: "master" },
  to: { name: "Intelligent Mechatronics Engineering", slug: "intelligent-mechatronics-engineering" },
};

// Researched programs with NO existing department row. New rows are inserted for these
// (Kerem approved 2026-09-01): Economics and Management, Computer Science (bachelor, distinct
// from the pre-existing "Computer Science" MASTER department, which this import does not
// touch), Environmental and Land Engineering, Global Affairs (both genuinely bilingual
// English+Italian, not pure English), and Civil Engineering (kept per Kerem's explicit
// decision despite research showing it cannot be completed in English -- see its
// uncertainty_notes for the full finding).
const NEW_DEPARTMENTS = [
  { file: "Economics_and_Management.json", name: "Economics and Management", level: "bachelor", slug: "economics-and-management", languages: ["en"], duration_years: 3 },
  // "computer-science" slug is already taken by the existing (uncovered) MASTER department.
  { file: "Computer_Science.json", name: "Computer Science", level: "bachelor", slug: "computer-science-bachelor", languages: ["en"], duration_years: 3 },
  { file: "Environmental_and_Land_Engineering.json", name: "Environmental and Land Engineering", level: "master", slug: "environmental-and-land-engineering", languages: ["en", "it"], duration_years: 2 },
  { file: "Civil_Engineering.json", name: "Civil Engineering", level: "master", slug: "civil-engineering", languages: ["en", "it"], duration_years: 2 },
  { file: "Global_Affairs_Geopolitics_and_Sustainability.json", name: "Global Affairs: Geopolitics and Sustainability", level: "master", slug: "global-affairs-geopolitics-and-sustainability", languages: ["en", "it"], duration_years: 2 },
];

// Pre-existing Trento departments this research did NOT cover (Kerem approved leaving these
// without admission_details for now, 2026-09-01): "Computer Science" is the MASTER row (a
// different program from the researched bachelor); "Biomolecular Sciences and Technology" and
// "European and International Studies" (MEIS) were never researched at all.
const KNOWN_UNCOVERED_DEPARTMENTS = [
  { name: "Computer Science", level: "master" },
  { name: "Biomolecular Sciences and Technology", level: "bachelor" },
  { name: "European and International Studies", level: "master" },
];

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
        ? "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY are required for --apply."
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

// The 17-field JSON schema mostly stores required_documents / uncertainty_notes as a single
// descriptive paragraph, but a few agent runs produced an array instead. The DB column is
// jsonb and the frontend only renders it if it is a JSON array of strings, so normalize
// either shape into an array -- preserves the full text with zero loss, no invented splits.
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

// source_quotes in this research is sometimes an array of quote strings and sometimes one
// long descriptive string with inline "Source: quote" pairs. The frontend's
// normalizeSourceQuotes() requires url + quote + retrieved_at per item or it silently drops
// that item. There is only one URL per program (official_program_url) in this 17-field
// schema, so every quote is attributed to that same URL.
function buildSourceQuotes(rawQuotes, officialProgramUrl, file) {
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
    throw new Error(`Expected ${EXPECTED_SOURCE_FILE_COUNT} Trento source files, found ${files.length}`);
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
    .eq("university_id", TRENTO_UNIVERSITY_ID)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch Trento departments: ${error.message}`);
  return data ?? [];
}

async function fetchExistingAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("program_admission_details")
    .select(
      "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file"
    )
    .eq("university_id", TRENTO_UNIVERSITY_ID)
    .in("department_id", departmentIds);
  if (error) throw new Error(`Failed to fetch existing admission details: ${error.message}`);
  return data ?? [];
}

function buildPlan(sourceFiles, departments) {
  const warnings = [];
  const byNameLevel = new Map(departments.map((d) => [`${d.name}::${d.level}`, d]));

  const renameTarget = byNameLevel.get(`${DEPARTMENT_RENAME.from.name}::${DEPARTMENT_RENAME.from.level}`);
  if (!renameTarget) {
    warnings.push(`Could not find existing "${DEPARTMENT_RENAME.from.name}" department to rename.`);
  }
  const departmentRename = renameTarget
    ? { id: renameTarget.id, from: { name: renameTarget.name, slug: renameTarget.slug }, to: DEPARTMENT_RENAME.to }
    : null;

  // Reflect the rename in the lookup map immediately so resolvedRows below match correctly.
  if (renameTarget) {
    byNameLevel.delete(`${DEPARTMENT_RENAME.from.name}::${DEPARTMENT_RENAME.from.level}`);
    byNameLevel.set(`${DEPARTMENT_RENAME.to.name}::${DEPARTMENT_RENAME.from.level}`, {
      ...renameTarget,
      name: DEPARTMENT_RENAME.to.name,
      slug: DEPARTMENT_RENAME.to.slug,
    });
  }

  const maxSortOrderByLevel = { bachelor: 0, master: 0 };
  for (const d of departments) {
    maxSortOrderByLevel[d.level] = Math.max(maxSortOrderByLevel[d.level] ?? 0, d.sort_order ?? 0);
  }

  const departmentInserts = NEW_DEPARTMENTS.map((spec) => {
    maxSortOrderByLevel[spec.level] = (maxSortOrderByLevel[spec.level] ?? 0) + 1;
    return {
      file: spec.file,
      insert: {
        university_id: TRENTO_UNIVERSITY_ID,
        name: spec.name,
        slug: spec.slug,
        languages: spec.languages,
        duration_years: spec.duration_years,
        level: spec.level,
        sort_order: maxSortOrderByLevel[spec.level],
      },
    };
  });
  const newDepartmentFiles = new Map(departmentInserts.map((d) => [d.file, d]));

  const resolvedRows = [];
  for (const { file, record, level } of sourceFiles) {
    if (newDepartmentFiles.has(file)) {
      resolvedRows.push({ file, record, departmentRef: `new:${file}` });
      continue;
    }
    const mapping = FILE_TO_EXISTING_DEPARTMENT.get(file);
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
    ...[...FILE_TO_EXISTING_DEPARTMENT.values()].map((m) => `${m.name}::${m.level}`),
    `${DEPARTMENT_RENAME.to.name}::${DEPARTMENT_RENAME.from.level}`,
  ]);
  const uncoveredExisting = departments
    .filter((d) => {
      const key = d.id === renameTarget?.id ? `${DEPARTMENT_RENAME.to.name}::${d.level}` : `${d.name}::${d.level}`;
      return !coveredNames.has(key);
    })
    .map((d) => ({ id: d.id, name: d.name, level: d.level }));

  return {
    universityId: TRENTO_UNIVERSITY_ID,
    sourceFileCount: sourceFiles.length,
    existingDepartmentCount: departments.length,
    departmentRename,
    departmentInserts,
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
    university_id: TRENTO_UNIVERSITY_ID,
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
  const insertedDepartmentIdByFile = new Map();
  let admissionSnapshot = [];
  const departmentIdsTouched = [];

  try {
    if (plan.departmentRename) {
      const { error } = await supabase
        .from("university_departments")
        .update(plan.departmentRename.to)
        .eq("id", plan.departmentRename.id)
        .eq("university_id", TRENTO_UNIVERSITY_ID);
      if (error) throw new Error(`Failed to rename department: ${error.message}`);
      renamedDepartment = true;
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
    admissionSnapshot = await fetchExistingAdmissionDetails(supabase, departmentIdsTouched);

    const { error: upsertError } = await supabase
      .from("program_admission_details")
      .upsert(detailPayloads, { onConflict: "department_id" });
    if (upsertError) throw new Error(`Failed to upsert admission details: ${upsertError.message}`);

    return {
      detailUpserts: detailPayloads.length,
      insertedDepartmentIds: Object.fromEntries(insertedDepartmentIdByFile),
      renamedDepartment,
    };
  } catch (error) {
    if (admissionSnapshot.length > 0) {
      await supabase.from("program_admission_details").upsert(admissionSnapshot, { onConflict: "department_id" });
    } else if (departmentIdsTouched.length > 0) {
      await supabase
        .from("program_admission_details")
        .delete()
        .eq("university_id", TRENTO_UNIVERSITY_ID)
        .in("department_id", departmentIdsTouched);
    }
    if (insertedDepartmentIdByFile.size > 0) {
      await supabase
        .from("university_departments")
        .delete()
        .in("id", [...insertedDepartmentIdByFile.values()]);
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
    departmentInserts: plan.departmentInserts.map((d) => ({ file: d.file, insert: d.insert })),
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
    console.log(`[OK] Applied ${applyResult.detailUpserts} Trento program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
