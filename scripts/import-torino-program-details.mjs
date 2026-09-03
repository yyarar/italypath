import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const TORINO_UNIVERSITY_ID = 11;
const EXPECTED_SOURCE_FILE_COUNT = 29;
const SOURCE_GENERATED_AT = "2026-09-01";
const RESULTS_DIR = resolve(process.cwd(), "torino-english-programs/results");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "torino-program-details-import-report.json");

// The research agents wrote long disambiguation essays into program_name / level /
// teaching_language instead of the short values fields.yaml asked for. program_name and
// level are not rendered anywhere (see components/university-details/programAdmissionPresentation.ts
// ADMISSION_FIELD_KEYS), so they are stored as-is for archival purposes. teaching_language IS
// rendered directly as "Teaching language" on the program detail page, so it is overridden here
// with a short, accurate value derived by hand from each file's own findings. Kerem approved
// this cleanup before import (2026-09-01).
const CLEAN_TEACHING_LANGUAGE = new Map([
  ["Business_and_Management.json", "English"],
  ["Economics_and_Finance_with_Data_Science.json", "English"],
  ["Global_Law_and_Transnational_Legal_Studies.json", "English"],
  ["Medicine_and_Surgery_MedInTO.json", "English"],
  ["Business_Administration.json", "English"],
  ["Economics.json", "English"],
  ["Quantitative_Finance_and_Insurance.json", "English"],
  ["Area_and_Global_Studies_for_International_Cooperation_AGIC.json", "English"],
  ["European_Legal_Studies.json", "English"],
  ["Cultural_Heritage_and_Creativity_for_Tourism_and_Territorial_Development.json", "English"],
  ["Language_Technologies_and_Digital_Humanities.json", "English"],
  ["Molecular_Biotechnology.json", "English"],
  ["Biotechnology_for_Neuroscience.json", "English"],
  ["Biotechnological_and_Chemical_Sciences_in_Diagnostics.json", "English"],
  ["Artificial_Intelligence_for_Biomedicine_and_Healthcare.json", "English"],
  ["Stochastics_and_Data_Science.json", "English"],
  ["Cellular_and_Molecular_Biology.json", "English"],
  ["Materials_Science.json", "English"],
  ["Artificial_Intelligence_and_High_Performance_Computing_Technologies.json", "English"],
  ["English_and_American_Studies.json", "English"],
  [
    "Animal_Nutrition_and_Feed_Safety.json",
    "English (the wholly English-taught curriculum of the otherwise Italian-taught 'Animal Science' degree)",
  ],
  [
    "Philosophy_Philosophy_International_Curriculum.json",
    "English (Philosophy International Curriculum, the wholly English-taught pathway of the Italian-named 'Filosofia' degree)",
  ],
  [
    "Smart_Agriculture.json",
    "English (partial — 2 of 4 semesters / 60 of 120 ECTS; the parent Italian-taught 'Agricultural Science' degree's first semester is in Italian)",
  ],
  [
    "Viticultural_and_Enological_Sciences.json",
    "English (International curriculum of the joint Italian/international 'Viticultural and Enological Sciences' degree)",
  ],
  [
    "Urban_and_Political_Geography.json",
    "English (one of three second-year pathways within the interuniversity UNITO + Politecnico di Torino 'Geography and Territorial Sciences' degree; the other two pathways are Italian-only)",
  ],
  [
    "Digital_Skills_for_Sustainable_Societal_Transitions.json",
    "English (joint degree with Politecnico di Torino)",
  ],
  [
    "Economic_Analysis_and_Policy.json",
    "English (Erasmus Mundus Joint Master EPOG-JM, joint with Sorbonne Universite, Universite de technologie de Compiegne, CNAM and University of the Witwatersrand)",
  ],
  [
    "Economics_of_Innovation_for_Sustainable_Development.json",
    "English (joint degree with Universite Cote d'Azur, France — year 1 in Turin, year 2 in Nice)",
  ],
  [
    "Food_Science_and_Technology.json",
    "English (EIT Food consortium 'Master in Food Systems' curriculum, multi-university)",
  ],
]);

// Explicit, hand-verified mapping: source JSON file -> existing university_departments row
// (matched by name + level). 16 of Torino's 29 researched programs already had a matching row
// (seeded separately from this research); the other 13 are genuinely new to the DB.
const FILE_TO_EXISTING_DEPARTMENT = new Map([
  ["Business_and_Management.json", { name: "Business & Management", level: "bachelor" }],
  ["Economics_and_Finance_with_Data_Science.json", { name: "Economics and Finance with Data Science", level: "bachelor" }],
  ["Global_Law_and_Transnational_Legal_Studies.json", { name: "Global Law and Transnational Legal Studies", level: "bachelor" }],
  // Level fixed from "bachelor" to "single-cycle" before matching -- see DEPARTMENT_LEVEL_FIX.
  ["Medicine_and_Surgery_MedInTO.json", { name: "Medicine and Surgery", level: "single-cycle" }],
  ["Business_Administration.json", { name: "Business Administration", level: "master" }],
  ["Economics.json", { name: "Economics", level: "master" }],
  ["Quantitative_Finance_and_Insurance.json", { name: "Quantitative Finance and Insurance", level: "master" }],
  ["Area_and_Global_Studies_for_International_Cooperation_AGIC.json", { name: "Area and Global Studies for International Cooperation", level: "master" }],
  ["European_Legal_Studies.json", { name: "European Legal Studies", level: "master" }],
  [
    "English_and_American_Studies.json",
    { name: "English and American Studies – curriculum in English language of the degree in Modern Languages and Literatures", level: "master" },
  ],
  [
    "Philosophy_Philosophy_International_Curriculum.json",
    { name: "Philosophy – curriculum in English language of the degree in Philosophy", level: "master" },
  ],
  ["Molecular_Biotechnology.json", { name: "Molecular Biotechnology", level: "master" }],
  ["Stochastics_and_Data_Science.json", { name: "Stochastics and Data Science", level: "master" }],
  ["Cellular_and_Molecular_Biology.json", { name: "Cellular and Molecular Biology", level: "master" }],
  ["Materials_Science.json", { name: "Materials Science", level: "master" }],
  [
    "Animal_Nutrition_and_Feed_Safety.json",
    { name: "Animal Science – curriculum in English language of the degree in Animal Science", level: "master" },
  ],
]);

// Renamed (level corrected) before matching: DB had the pre-existing row as level="bachelor",
// duration_years=6; research confirmed it is a single-cycle degree, which the DB level check
// constraint already supports. Kerem approved this correction 2026-09-01.
const DEPARTMENT_LEVEL_FIX = {
  from: { name: "Medicine and Surgery", level: "bachelor" },
  to: { level: "single-cycle" },
};

// Researched programs with NO existing department row. New rows are inserted for these.
const NEW_DEPARTMENTS = [
  { file: "Economic_Analysis_and_Policy.json", name: "Economic Analysis and Policy", slug: "economic-analysis-and-policy", languages: ["en"], duration_years: 2 },
  { file: "Economics_of_Innovation_for_Sustainable_Development.json", name: "Economics of Innovation for Sustainable Development", slug: "economics-of-innovation-for-sustainable-development", languages: ["en"], duration_years: 2 },
  { file: "Cultural_Heritage_and_Creativity_for_Tourism_and_Territorial_Development.json", name: "Cultural Heritage and Creativity for Tourism and Territorial Development", slug: "cultural-heritage-and-creativity-for-tourism-and-territorial-development", languages: ["en"], duration_years: 2 },
  { file: "Language_Technologies_and_Digital_Humanities.json", name: "Language Technologies and Digital Humanities", slug: "language-technologies-and-digital-humanities", languages: ["en"], duration_years: 2 },
  { file: "Biotechnology_for_Neuroscience.json", name: "Biotechnology for Neuroscience", slug: "biotechnology-for-neuroscience", languages: ["en"], duration_years: 2 },
  { file: "Biotechnological_and_Chemical_Sciences_in_Diagnostics.json", name: "Biotechnological and Chemical Sciences in Diagnostics", slug: "biotechnological-and-chemical-sciences-in-diagnostics", languages: ["en"], duration_years: 2 },
  { file: "Artificial_Intelligence_for_Biomedicine_and_Healthcare.json", name: "Artificial Intelligence for Biomedicine and Healthcare", slug: "artificial-intelligence-for-biomedicine-and-healthcare", languages: ["en"], duration_years: 2 },
  { file: "Smart_Agriculture.json", name: "Smart Agriculture – curriculum in English language of the degree in Agricultural Science", slug: "smart-agriculture-curriculum-in-english-language-of-the-degree-in-agricultural-science", languages: ["en", "it"], duration_years: 2 },
  { file: "Food_Science_and_Technology.json", name: "Food Science and Technology, curriculum in Food Systems", slug: "food-science-and-technology-curriculum-in-food-systems", languages: ["en"], duration_years: 2 },
  { file: "Viticultural_and_Enological_Sciences.json", name: "Viticultural and Enological Sciences – International curriculum", slug: "viticultural-and-enological-sciences-international-curriculum", languages: ["en"], duration_years: 2 },
  { file: "Urban_and_Political_Geography.json", name: "Urban and Political Geography – curriculum in English language of the degree in Geography and Territorial Sciences", slug: "urban-and-political-geography-curriculum-in-english-language-of-the-degree-in-geography-and-territorial-sciences", languages: ["en"], duration_years: 2 },
  { file: "Artificial_Intelligence_and_High_Performance_Computing_Technologies.json", name: "Artificial Intelligence and High Performance Computing Technologies", slug: "artificial-intelligence-and-high-performance-computing-technologies", languages: ["en"], duration_years: 2 },
  { file: "Digital_Skills_for_Sustainable_Societal_Transitions.json", name: "Digital Skills for Sustainable Societal Transitions", slug: "digital-skills-for-sustainable-societal-transitions", languages: ["en"], duration_years: 2 },
];

// Pre-existing Torino departments this research did NOT cover (Kerem approved leaving these
// without admission_details for now, 2026-09-01) -- they were never in the researched item
// list at all, unlike Trento's uncovered departments which were explicit scope decisions.
const KNOWN_UNCOVERED_DEPARTMENTS = [
  { name: "Biotechnology", level: "bachelor" },
  { name: "Economics", level: "bachelor" },
  { name: "Mathematics for Economics, Finance and Insurance", level: "bachelor" },
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
  if (lower.startsWith("single-cycle") || lower.startsWith("single cycle")) return "single-cycle";
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
    throw new Error(`Expected ${EXPECTED_SOURCE_FILE_COUNT} Torino source files, found ${files.length}`);
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
    if (!CLEAN_TEACHING_LANGUAGE.has(file)) {
      throw new Error(`${file} has no CLEAN_TEACHING_LANGUAGE override defined`);
    }

    const level = deriveLevelCategory(record.level, file);

    return { file, record, level };
  });
}

async function fetchDepartments(supabase) {
  const { data, error } = await supabase
    .from("university_departments")
    .select("id,university_id,name,slug,languages,duration_years,level,sort_order")
    .eq("university_id", TORINO_UNIVERSITY_ID)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch Torino departments: ${error.message}`);
  return data ?? [];
}

async function fetchExistingAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("program_admission_details")
    .select(
      "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file"
    )
    .eq("university_id", TORINO_UNIVERSITY_ID)
    .in("department_id", departmentIds);
  if (error) throw new Error(`Failed to fetch existing admission details: ${error.message}`);
  return data ?? [];
}

function buildPlan(sourceFiles, departments) {
  const warnings = [];
  const byNameLevel = new Map(departments.map((d) => [`${d.name}::${d.level}`, d]));

  const fixTarget = byNameLevel.get(`${DEPARTMENT_LEVEL_FIX.from.name}::${DEPARTMENT_LEVEL_FIX.from.level}`);
  if (!fixTarget) {
    warnings.push(`Could not find existing "${DEPARTMENT_LEVEL_FIX.from.name}" (${DEPARTMENT_LEVEL_FIX.from.level}) department to level-fix.`);
  }
  const departmentLevelFix = fixTarget
    ? { id: fixTarget.id, from: { level: fixTarget.level }, to: DEPARTMENT_LEVEL_FIX.to }
    : null;

  // Reflect the level fix in the lookup map immediately so resolvedRows below match correctly.
  if (fixTarget) {
    byNameLevel.delete(`${DEPARTMENT_LEVEL_FIX.from.name}::${DEPARTMENT_LEVEL_FIX.from.level}`);
    byNameLevel.set(`${fixTarget.name}::${DEPARTMENT_LEVEL_FIX.to.level}`, {
      ...fixTarget,
      level: DEPARTMENT_LEVEL_FIX.to.level,
    });
  }

  const maxSortOrderByLevel = { bachelor: 0, master: 0, "single-cycle": 0 };
  for (const d of departments) {
    maxSortOrderByLevel[d.level] = Math.max(maxSortOrderByLevel[d.level] ?? 0, d.sort_order ?? 0);
  }

  const departmentInserts = NEW_DEPARTMENTS.map((spec) => {
    const level = "master";
    maxSortOrderByLevel[level] = (maxSortOrderByLevel[level] ?? 0) + 1;
    return {
      file: spec.file,
      insert: {
        university_id: TORINO_UNIVERSITY_ID,
        name: spec.name,
        slug: spec.slug,
        languages: spec.languages,
        duration_years: spec.duration_years,
        level,
        sort_order: maxSortOrderByLevel[level],
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
  ]);
  const uncoveredExisting = departments
    .filter((d) => {
      const key = d.id === fixTarget?.id ? `${d.name}::${DEPARTMENT_LEVEL_FIX.to.level}` : `${d.name}::${d.level}`;
      return !coveredNames.has(key);
    })
    .map((d) => ({ id: d.id, name: d.name, level: d.level }));

  return {
    universityId: TORINO_UNIVERSITY_ID,
    sourceFileCount: sourceFiles.length,
    existingDepartmentCount: departments.length,
    departmentLevelFix,
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
    university_id: TORINO_UNIVERSITY_ID,
    raw_program_name: requiredText(record.program_name, "program_name", file),
    raw_level: requiredText(record.level, "level", file),
    raw_teaching_language: requiredText(CLEAN_TEACHING_LANGUAGE.get(file), "teaching_language", file),
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
  let fixedLevel = false;
  const insertedDepartmentIdByFile = new Map();
  let admissionSnapshot = [];
  const departmentIdsTouched = [];

  try {
    if (plan.departmentLevelFix) {
      const { error } = await supabase
        .from("university_departments")
        .update(plan.departmentLevelFix.to)
        .eq("id", plan.departmentLevelFix.id)
        .eq("university_id", TORINO_UNIVERSITY_ID);
      if (error) throw new Error(`Failed to fix department level: ${error.message}`);
      fixedLevel = true;
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
      fixedLevel,
    };
  } catch (error) {
    if (admissionSnapshot.length > 0) {
      await supabase.from("program_admission_details").upsert(admissionSnapshot, { onConflict: "department_id" });
    } else if (departmentIdsTouched.length > 0) {
      await supabase
        .from("program_admission_details")
        .delete()
        .eq("university_id", TORINO_UNIVERSITY_ID)
        .in("department_id", departmentIdsTouched);
    }
    if (insertedDepartmentIdByFile.size > 0) {
      await supabase
        .from("university_departments")
        .delete()
        .in("id", [...insertedDepartmentIdByFile.values()]);
    }
    if (fixedLevel && plan.departmentLevelFix) {
      await supabase
        .from("university_departments")
        .update(plan.departmentLevelFix.from)
        .eq("id", plan.departmentLevelFix.id);
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
    departmentLevelFix: plan.departmentLevelFix,
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
    console.log(`[OK] Applied ${applyResult.detailUpserts} Torino program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
