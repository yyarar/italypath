import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import {
  createImportClient,
  finalizeAdmissionPayloads,
  parseImportArgs,
  prepareAdmissionWrite,
  recordImportManifest,
  sourceFileRef,
} from "./lib/program-details-import.mjs";

// University of Trieste (university_id 21) English-taught programme import. Moved here on
// 2026-09-26 from the unguarded one-off writer tmp/uni-research/tools/import-trieste.mjs
// (security audit G2#6): same data and behaviour (upsert details for existing departments,
// create the 5 new departments idempotently by slug), now with dry-run by default, the shared
// target check, link/allowlist/free-text/length guard, snapshot + rollback and a manifest.
// Usage: node scripts/import-trieste-program-details.mjs [--dry-run | --apply --project-ref kskbnxxyviowmrlskwke] [--data <import-data.json>]
const SCRIPT_KEY = "trieste";
const UNIVERSITY_ID = 21;
const RESEARCH_DIR = resolve(process.cwd(), "university-of-trieste-english-program-admission-requirements");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "trieste-program-details-import-report.json");
const DETAIL_COLUMNS =
  "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file";

const { mode, projectRef, values } = parseImportArgs(process.argv.slice(2), { valueFlags: ["--data"] });
const DATA_PATH = resolve(process.cwd(), values["--data"] ?? join(RESEARCH_DIR, "results-import/import-data.json"));

function loadItems() {
  if (!existsSync(DATA_PATH)) throw new Error(`Missing import data: ${DATA_PATH}`);
  const items = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  if (!Array.isArray(items) || items.length === 0) throw new Error("Import data must be a non-empty array");
  for (const [index, item] of items.entries()) {
    if (item.dept_id == null && !item.new_department?.slug) throw new Error(`Item ${index} has neither dept_id nor new_department.slug`);
    if (typeof item.official_program_url !== "string") throw new Error(`Item ${index} has no official_program_url`);
  }
  return items;
}

// Arastirma dosyasi varsa onun ozeti; yoksa derlenmis import-data.json'un ozeti.
function researchFileRef(item) {
  const researchFile = item.source_file ? join(RESEARCH_DIR, "results", basename(item.source_file)) : null;
  return sourceFileRef(researchFile && existsSync(researchFile) ? researchFile : DATA_PATH);
}

function toDetailPayload(item, departmentId) {
  return {
    department_id: departmentId,
    university_id: UNIVERSITY_ID,
    raw_program_name: item.raw_program_name,
    raw_level: item.raw_level,
    raw_teaching_language: item.raw_teaching_language,
    campus: item.campus,
    degree_class: item.degree_class,
    admission_type: item.admission_type,
    academic_requirements: item.academic_requirements,
    language_requirements: item.language_requirements,
    application_deadline_eu: item.application_deadline_eu,
    application_deadline_non_eu: item.application_deadline_non_eu,
    required_documents: item.required_documents,
    entry_exam_or_test: item.entry_exam_or_test,
    tuition_or_fees_link: item.tuition_or_fees_link,
    official_program_url: item.official_program_url,
    official_call_url: item.official_call_url,
    source_quotes: item.source_quotes,
    uncertain: item.uncertain,
    uncertainty_notes: item.uncertainty_notes,
    source_file: researchFileRef(item),
  };
}

async function fetchDepartments(supabase) {
  const { data, error } = await supabase
    .from("university_departments")
    .select("id,university_id,name,slug,level,sort_order")
    .eq("university_id", UNIVERSITY_ID);
  if (error) throw new Error(`Failed to fetch Trieste departments: ${error.message}`);
  return data ?? [];
}

function buildPlan(items, departments) {
  const warnings = [];
  const byId = new Map(departments.map((department) => [department.id, department]));
  const bySlug = new Map(departments.map((department) => [department.slug, department]));
  const rows = items.map((item) => {
    if (item.dept_id != null) {
      if (!byId.has(item.dept_id)) warnings.push(`Department ${item.dept_id} (${item.raw_program_name}) not found for university ${UNIVERSITY_ID}`);
      return { item, departmentId: item.dept_id, newDepartment: null };
    }
    const existing = bySlug.get(item.new_department.slug);
    return { item, departmentId: existing?.id ?? null, newDepartment: existing ? null : item.new_department };
  });
  const maxSortOrder = departments.reduce((max, department) => Math.max(max, department.sort_order ?? 0), 0);
  return { rows, warnings, maxSortOrder };
}

// Kuru calistirma ve --apply on kontrolu icin: henuz olusmamis bolumler id'siz.
function previewDetailPayloads(plan) {
  return plan.rows.map(({ item, departmentId }) => toDetailPayload(item, departmentId));
}

async function applyPlan(supabase, plan) {
  const existingIds = plan.rows.map((row) => row.departmentId).filter((id) => Number.isInteger(id));
  const { data: snapshot, error: snapshotError } = await supabase
    .from("program_admission_details")
    .select(DETAIL_COLUMNS)
    .eq("university_id", UNIVERSITY_ID)
    .in("department_id", existingIds);
  if (snapshotError) throw new Error(`Failed to snapshot admission details: ${snapshotError.message}`);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const backupPath = resolve(OUTPUT_DIR, `trieste-admission-details-before-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(backupPath, `${JSON.stringify(snapshot ?? [], null, 2)}\n`);

  const createdDepartmentIds = [];
  const upsertedIds = [];
  try {
    let nextSortOrder = plan.maxSortOrder + 1;
    const rows = [];
    for (const row of plan.rows) {
      if (!row.newDepartment) {
        rows.push(row);
        continue;
      }
      const department = row.newDepartment;
      const { data: inserted, error } = await supabase
        .from("university_departments")
        .insert({
          university_id: UNIVERSITY_ID,
          name: department.name,
          slug: department.slug,
          languages: department.languages,
          duration_years: department.duration_years,
          level: department.level,
          sort_order: nextSortOrder++,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Failed to insert department ${department.name}: ${error.message}`);
      createdDepartmentIds.push(inserted.id);
      rows.push({ ...row, departmentId: inserted.id });
    }

    const detailPayloads = finalizeAdmissionPayloads(rows.map(({ item, departmentId }) => toDetailPayload(item, departmentId)));
    const { error } = await supabase.from("program_admission_details").upsert(detailPayloads, { onConflict: "department_id" });
    if (error) throw new Error(`Failed to upsert admission details: ${error.message}`);
    upsertedIds.push(...detailPayloads.map((payload) => payload.department_id));
    const manifest = recordImportManifest(SCRIPT_KEY, detailPayloads, { projectRef });
    return { detailUpserts: detailPayloads.length, createdDepartments: createdDepartmentIds.length, backup: basename(backupPath), manifest };
  } catch (error) {
    const snapshotIds = new Set((snapshot ?? []).map((row) => row.department_id));
    const freshIds = upsertedIds.filter((id) => !snapshotIds.has(id));
    if (freshIds.length > 0) await supabase.from("program_admission_details").delete().in("department_id", freshIds);
    if ((snapshot ?? []).length > 0) await supabase.from("program_admission_details").upsert(snapshot, { onConflict: "department_id" });
    if (createdDepartmentIds.length > 0) await supabase.from("university_departments").delete().in("id", createdDepartmentIds);
    throw error;
  }
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const supabase = createImportClient({ mode, projectRef });
  const items = loadItems();
  const plan = buildPlan(items, await fetchDepartments(supabase));
  // Link temizligi, izin listesi, serbest metin ve uzunluk denetimi + tam metin farki
  // (output/). --apply'da engelleyici sorun varsa hicbir yazma yapilmadan durur.
  await prepareAdmissionWrite(supabase, previewDetailPayloads(plan), { mode, scriptName: SCRIPT_KEY });
  let report = {
    mode,
    universityId: UNIVERSITY_ID,
    items: items.length,
    existingDepartments: plan.rows.filter((row) => !row.newDepartment).length,
    newDepartments: plan.rows.filter((row) => row.newDepartment).map((row) => row.newDepartment.slug),
    warnings: plan.warnings,
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (mode !== "apply") {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
    return;
  }
  if (plan.warnings.length > 0) throw new Error(`Refusing --apply because the plan has warnings: ${plan.warnings.join(" | ")}`);
  const applied = await applyPlan(supabase, plan);
  report = { ...report, applied };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[OK] Upserted ${applied.detailUpserts} Trieste program details (${applied.createdDepartments} new departments).`);
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
