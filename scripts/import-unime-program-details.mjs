import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const UNIME_UNIVERSITY_ID = 17;
const EXPECTED_SOURCE_FILE_COUNT = 18;
const SOURCE_GENERATED_AT = "2026-09-04";
const RESULTS_DIR = resolve(process.cwd(), "unime-english-programs/results");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "unime-program-details-import-report.json");

// Source JSON file -> existing university_departments row, matched on slug.
// Slug (not name+level) is the join key because this import also corrects the level of
// the Medicine and Surgery row, which would break a name::level match mid-run.
const FILE_TO_DEPARTMENT_SLUG = new Map([
  ["Business_Management.json", "business-management"],
  ["Civil_Engineering_Bachelor.json", "civil-engineering"],
  // The bachelor is officially "Computer Science" (Informatica); the English-taught track
  // is its Data Analysis curriculum, which is what the research file documents. Same course.
  ["Data_Analysis.json", "computer-science"],
  ["Marine_Biology_and_Blue_Biotechnologies.json", "marine-biology-and-blue-biotechnologies"],
  ["Political_Sciences_and_International_Relations.json", "political-sciences-and-international-relations"],
  ["Transnational_and_European_Legal_Studies.json", "transnational-and-european-legal-studies"],
  ["Medicine_and_Surgery.json", "medicine-and-surgery"],
  ["Business_Consulting_and_Management.json", "business-consulting-and-management"],
  ["Civil_Engineering_Master.json", "civil-engineering-master"],
  ["Cognitive_Science_and_Theory_of_Communication.json", "cognitive-science-and-theory-of-communication"],
  ["Data_Science.json", "data-science"],
  ["Engineering_in_Computer_Science.json", "engineering-in-computer-science"],
  ["Geophysical_Sciences_for_Seismic_Risk.json", "geophysical-sciences-for-seismic-risk"],
  ["Physics_Material_Physics_and_Devices.json", "physics-materials-physics-and-devices"],
  ["Quantitative_Methods_for_Economics_and_Finance.json", "quantitative-methods-for-economics-and-finance"],
]);

// Programmes on UNIME's official English-taught list that have no department row yet.
// Heritage Innovation Engineering and Global Security Studies are newly accredited for
// A.Y. 2026/27 and currently documented only by an info-sheet PDF, so their admission
// rows carry many nulls; the programmes themselves are real.
const DEPARTMENT_INSERTS = new Map([
  [
    "Heritage_Innovation_Engineering.json",
    {
      university_id: UNIME_UNIVERSITY_ID,
      name: "Heritage Innovation Engineering",
      slug: "heritage-innovation-engineering",
      languages: ["en"],
      duration_years: 3,
      level: "bachelor",
      sort_order: 9,
    },
  ],
  [
    "Global_Security_Studies.json",
    {
      university_id: UNIME_UNIVERSITY_ID,
      name: "Global Security Studies",
      slug: "global-security-studies",
      languages: ["en"],
      duration_years: 2,
      level: "master",
      sort_order: 9,
    },
  ],
  [
    "Mechanical_Engineering.json",
    {
      university_id: UNIME_UNIVERSITY_ID,
      name: "Mechanical Engineering",
      slug: "mechanical-engineering",
      languages: ["en"],
      duration_years: 2,
      level: "master",
      sort_order: 10,
    },
  ],
]);

// The DB row says level "bachelor" with duration_years 6. Medicine and Surgery is a
// 6-year single-cycle degree (laurea magistrale a ciclo unico) and the research file
// records it as such; the level column allows 'single-cycle'.
const DEPARTMENT_LEVEL_FIX = { slug: "medicine-and-surgery", from: "bachelor", to: "single-cycle" };

// Departments seeded earlier that do NOT appear on UNIME's official English-taught
// programme list. Deletion was considered on 2026-09-04 and NOT carried out: both courses
// still exist at UNIME (biotecnologie.cdl.unime.it, economia-banca-e-finanza.cdl.unime.it).
// Biotecnologie is described as Italian/English; Economia, Banca e Finanza is taught in
// Italian and only asks for B1 English. So they are out of scope for this English-taught
// research, not defunct — they are left untouched and carry no admission_details row.
// The deletion machinery below is kept but intentionally driven by an empty list.
const DEPARTMENT_DELETION_SLUGS = [];

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

// required_documents / uncertainty_notes arrive either as a descriptive paragraph or as a
// list, depending on the agent run. The DB column is jsonb and the frontend only renders a
// JSON array of strings, so normalize both shapes into an array with no invented splits.
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
  if (lower.startsWith("single-cycle") || lower.startsWith("single cycle")) return "single-cycle";
  if (lower.startsWith("master")) return "master";
  if (lower.startsWith("bachelor")) return "bachelor";
  throw new Error(`${file} has unrecognized level: ${text.slice(0, 80)}`);
}

function normalizeUncertainArray(value, file) {
  if (!Array.isArray(value)) throw new Error(`${file} has non-array uncertain`);
  return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}

// The research schema stores source_quotes as {quote, url, field_supported} objects, but a
// few agent runs wrote plain strings. The frontend's normalizeSourceQuotes() needs
// url + quote + retrieved_at per item or it silently drops the entry, so fill the per-quote
// url from the quote itself when present and fall back to the programme URL otherwise.
function buildSourceQuotes(rawQuotes, officialProgramUrl, file) {
  const quoteList = Array.isArray(rawQuotes) ? rawQuotes : optionalText(rawQuotes) ? [rawQuotes] : [];
  if (quoteList.length === 0) throw new Error(`${file} has empty source_quotes`);

  return quoteList.map((item, index) => {
    if (item && typeof item === "object") {
      const quote = optionalText(item.quote);
      if (!quote) throw new Error(`${file} has empty source_quotes[${index}].quote`);
      const fieldRef = optionalText(item.field_supported);
      return {
        url: optionalText(item.url) ?? officialProgramUrl,
        quote,
        field_refs: fieldRef ? [fieldRef] : [],
        retrieved_at: SOURCE_GENERATED_AT,
      };
    }
    const quote = optionalText(item);
    if (!quote) throw new Error(`${file} has empty source_quotes[${index}]`);
    return { url: officialProgramUrl, quote, field_refs: [], retrieved_at: SOURCE_GENERATED_AT };
  });
}

function loadSourceFiles() {
  const files = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  if (files.length !== EXPECTED_SOURCE_FILE_COUNT) {
    throw new Error(`Expected ${EXPECTED_SOURCE_FILE_COUNT} UNIME source files, found ${files.length}`);
  }

  return files.map((file) => {
    const record = JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8"));
    for (const field of ["program_name", "level", "teaching_language", "official_program_url"]) {
      requiredText(record[field], field, file);
    }
    if (!Array.isArray(record.source_quotes) && !optionalText(record.source_quotes)) {
      throw new Error(`${file} has empty/invalid source_quotes`);
    }
    if (!Array.isArray(record.uncertain)) throw new Error(`${file} has non-array uncertain`);
    return { file, record, level: deriveLevelCategory(record.level, file) };
  });
}

async function fetchDepartments(supabase) {
  const { data, error } = await supabase
    .from("university_departments")
    .select("id,university_id,name,slug,languages,duration_years,level,sort_order")
    .eq("university_id", UNIME_UNIVERSITY_ID)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch UNIME departments: ${error.message}`);
  return data ?? [];
}

async function fetchExistingAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("program_admission_details")
    .select(
      "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file"
    )
    .eq("university_id", UNIME_UNIVERSITY_ID)
    .in("department_id", departmentIds);
  if (error) throw new Error(`Failed to fetch existing admission details: ${error.message}`);
  return data ?? [];
}

function buildPlan(sourceFiles, departments) {
  const warnings = [];
  const bySlug = new Map(departments.map((d) => [d.slug, d]));

  const levelFixDept = bySlug.get(DEPARTMENT_LEVEL_FIX.slug);
  let departmentLevelFix = null;
  if (!levelFixDept) {
    warnings.push(`Could not find department "${DEPARTMENT_LEVEL_FIX.slug}" to correct its level.`);
  } else if (levelFixDept.level === DEPARTMENT_LEVEL_FIX.to) {
    // Already corrected by an earlier run — nothing to do, and not an error.
  } else if (levelFixDept.level !== DEPARTMENT_LEVEL_FIX.from) {
    warnings.push(
      `Department "${DEPARTMENT_LEVEL_FIX.slug}" has unexpected level "${levelFixDept.level}"; expected "${DEPARTMENT_LEVEL_FIX.from}".`
    );
  } else {
    departmentLevelFix = { id: levelFixDept.id, ...DEPARTMENT_LEVEL_FIX };
  }

  const departmentInserts = [];
  for (const [file, payload] of DEPARTMENT_INSERTS) {
    const existing = bySlug.get(payload.slug);
    if (existing) {
      warnings.push(`Department "${payload.slug}" already exists (id ${existing.id}); expected to insert it.`);
      continue;
    }
    departmentInserts.push({ file, payload });
  }

  const departmentDeletions = [];
  for (const slug of DEPARTMENT_DELETION_SLUGS) {
    const dept = bySlug.get(slug);
    if (!dept) {
      warnings.push(`Department "${slug}" marked for deletion was not found.`);
      continue;
    }
    departmentDeletions.push(dept);
  }

  const resolvedRows = [];
  for (const { file, record, level } of sourceFiles) {
    if (DEPARTMENT_INSERTS.has(file)) {
      resolvedRows.push({ file, record, departmentRef: `insert:${file}` });
      continue;
    }
    const slug = FILE_TO_DEPARTMENT_SLUG.get(file);
    if (!slug) {
      warnings.push(`No department mapping defined for source file: ${file}`);
      continue;
    }
    const department = bySlug.get(slug);
    if (!department) {
      warnings.push(`No existing department with slug "${slug}" found for ${file}`);
      continue;
    }
    const expectedLevel = slug === DEPARTMENT_LEVEL_FIX.slug ? DEPARTMENT_LEVEL_FIX.to : department.level;
    if (expectedLevel !== level) {
      warnings.push(`${file}: source level "${level}" does not match department level "${expectedLevel}"`);
    }
    resolvedRows.push({ file, record, departmentRef: department.id });
  }

  return {
    universityId: UNIME_UNIVERSITY_ID,
    sourceFileCount: sourceFiles.length,
    existingDepartmentCount: departments.length,
    departmentLevelFix,
    departmentInserts,
    departmentDeletions: departmentDeletions.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      level: d.level,
    })),
    departmentDeletionRows: departmentDeletions,
    resolvedRows,
    warnings,
  };
}

function toDetailPayload(record, departmentId, file) {
  const officialProgramUrl = requiredText(record.official_program_url, "official_program_url", file);
  return {
    department_id: departmentId,
    university_id: UNIME_UNIVERSITY_ID,
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
  const insertedDepartmentIds = [];
  const insertedIdByFile = new Map();
  let levelFixApplied = false;
  let admissionSnapshot = [];
  const departmentIdsTouched = [];
  let deletedDepartments = [];

  try {
    if (plan.departmentLevelFix) {
      const { error } = await supabase
        .from("university_departments")
        .update({ level: plan.departmentLevelFix.to })
        .eq("id", plan.departmentLevelFix.id)
        .eq("university_id", UNIME_UNIVERSITY_ID);
      if (error) throw new Error(`Failed to correct Medicine and Surgery level: ${error.message}`);
      levelFixApplied = true;
    }

    for (const { file, payload } of plan.departmentInserts) {
      const { data, error } = await supabase.from("university_departments").insert([payload]).select("id");
      if (error) throw new Error(`Failed to insert department "${payload.slug}": ${error.message}`);
      const newId = data[0].id;
      insertedDepartmentIds.push(newId);
      insertedIdByFile.set(file, newId);
    }

    const detailPayloads = plan.resolvedRows.map(({ file, record, departmentRef }) => {
      const departmentId =
        typeof departmentRef === "string" && departmentRef.startsWith("insert:")
          ? insertedIdByFile.get(file)
          : departmentRef;
      if (!departmentId) throw new Error(`Could not resolve department id for ${file}`);
      return toDetailPayload(record, departmentId, file);
    });

    departmentIdsTouched.push(...detailPayloads.map((d) => d.department_id));
    admissionSnapshot = await fetchExistingAdmissionDetails(supabase, departmentIdsTouched);

    const { error: upsertError } = await supabase
      .from("program_admission_details")
      .upsert(detailPayloads, { onConflict: "department_id" });
    if (upsertError) throw new Error(`Failed to upsert admission details: ${upsertError.message}`);

    // Deletions run last so any earlier failure aborts before data is removed.
    for (const dept of plan.departmentDeletionRows) {
      const { error: detailDeleteError } = await supabase
        .from("program_admission_details")
        .delete()
        .eq("department_id", dept.id)
        .eq("university_id", UNIME_UNIVERSITY_ID);
      if (detailDeleteError) {
        throw new Error(`Failed to clear admission details for "${dept.slug}": ${detailDeleteError.message}`);
      }
      const { error: deleteError } = await supabase
        .from("university_departments")
        .delete()
        .eq("id", dept.id)
        .eq("university_id", UNIME_UNIVERSITY_ID);
      if (deleteError) throw new Error(`Failed to delete department "${dept.slug}": ${deleteError.message}`);
      deletedDepartments.push(dept);
    }

    return {
      detailUpserts: detailPayloads.length,
      insertedDepartmentIds,
      levelFixApplied,
      deletedDepartments: deletedDepartments.map((d) => ({ id: d.id, name: d.name, slug: d.slug })),
    };
  } catch (error) {
    if (deletedDepartments.length > 0) {
      await supabase.from("university_departments").insert(
        deletedDepartments.map((d) => ({
          id: d.id,
          university_id: d.university_id,
          name: d.name,
          slug: d.slug,
          languages: d.languages,
          duration_years: d.duration_years,
          level: d.level,
          sort_order: d.sort_order,
        }))
      );
    }
    if (admissionSnapshot.length > 0) {
      await supabase.from("program_admission_details").upsert(admissionSnapshot, { onConflict: "department_id" });
    } else if (departmentIdsTouched.length > 0) {
      await supabase
        .from("program_admission_details")
        .delete()
        .eq("university_id", UNIME_UNIVERSITY_ID)
        .in("department_id", departmentIdsTouched);
    }
    if (insertedDepartmentIds.length > 0) {
      await supabase.from("university_departments").delete().in("id", insertedDepartmentIds);
    }
    if (levelFixApplied && plan.departmentLevelFix) {
      await supabase
        .from("university_departments")
        .update({ level: plan.departmentLevelFix.from })
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
    departmentInserts: plan.departmentInserts.map((d) => d.payload),
    departmentDeletions: plan.departmentDeletions,
    resolvedRowCount: plan.resolvedRows.length,
    resolvedRows: plan.resolvedRows.map((r) => ({ file: r.file, departmentRef: r.departmentRef })),
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
    console.log(`[OK] Applied ${applyResult.detailUpserts} UNIME program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
