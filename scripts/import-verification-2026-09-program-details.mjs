import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  createImportClient,
  finalizeAdmissionPayloads,
  parseImportArgs,
  prepareAdmissionWrite,
  recordImportManifest,
  sourceFileRef,
} from "./lib/program-details-import.mjs";

// Writer for the 2026-09-27 "yildizli 8 okul" verification round: existing admission
// dossiers of the 8 starred universities were re-checked against official pages.
// Input is the merged, second-eye-checked final/<dept_id>.json of the research folder
// (checked by its check_final.py); Kerem's decisions are in its KARARLAR.md.
// It UPDATES existing rows (no inserts), applies approved department/school fixes and
// deletes departments only when a final file says action "delete".
// Usage: node scripts/import-verification-2026-09-program-details.mjs --university <id>
//        [--research-dir <path>] [--dry-run | --apply --project-ref kskbnxxyviowmrlskwke]
const SCRIPT_KEY = "verification-2026-09";
const DOSSIER_FIELDS = [
  "raw_teaching_language", "campus", "degree_class", "admission_type", "academic_requirements",
  "language_requirements", "application_deadline_eu", "application_deadline_non_eu", "required_documents",
  "entry_exam_or_test", "tuition_or_fees_link", "official_program_url", "official_call_url",
  "source_quotes", "uncertain", "uncertainty_notes",
];
const DEPARTMENT_FIELDS = ["name", "level", "languages", "duration_years"];
const ACTIONS = new Set(["update", "no_change", "delete", "hold"]);
// School-level fixes Kerem approved; `expect` guards against a value changed since the research.
const SCHOOL_UPDATES = new Map([
  [7, { expect: { fee: "14.000€ - 16.500€" }, update: { fee: "17.000€ - 18.550€" } }],
]);

const { mode, projectRef, values } = parseImportArgs(process.argv.slice(2), { valueFlags: ["--university", "--research-dir"] });
const universityId = Number(values["--university"]);
if (!Number.isInteger(universityId) || universityId <= 0) throw new Error("--university <id> is required");
const RESEARCH_DIR = resolve(process.cwd(), values["--research-dir"] ?? "yildizli-8-okul-dogrulama-research");
const FINAL_DIR = join(RESEARCH_DIR, "final");
const SNAPSHOT_DIR = join(RESEARCH_DIR, "db-snapshot", String(universityId));
const OUTPUT_DIR = resolve(process.cwd(), "output");
const BACKUP_DIR = resolve(process.cwd(), "tmp/uni-research");
const RUN_KEY = `${SCRIPT_KEY}-u${universityId}`;
const REPORT_PATH = join(OUTPUT_DIR, `${RUN_KEY}-import-report.json`);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const pick = (row, keys) => Object.fromEntries(keys.map((key) => [key, row?.[key] ?? null]));

function loadFinals() {
  if (!existsSync(FINAL_DIR)) throw new Error(`Missing ${FINAL_DIR}`);
  const finals = [];
  for (const name of readdirSync(FINAL_DIR).filter((file) => /^\d+\.json$/.test(file)).sort()) {
    const path = join(FINAL_DIR, name);
    const final = readJson(path);
    if (final.university_id !== universityId) continue;
    if (!ACTIONS.has(final.action)) throw new Error(`${name}: unknown action ${final.action}`);
    const snapshot = readJson(join(SNAPSHOT_DIR, `${final.dept_id}.json`));
    finals.push({ path, final, snapshot });
  }
  if (finals.length === 0) throw new Error(`No final files for university ${universityId} in ${FINAL_DIR}`);
  return finals;
}

async function fetchLive(supabase, ids) {
  const { data: departments, error } = await supabase
    .from("university_departments")
    .select("id,university_id,name,slug,level,languages,duration_years,sort_order")
    .in("id", ids);
  if (error) throw new Error(`Failed to fetch departments: ${error.message}`);
  const { data: details, error: detailsError } = await supabase.from("program_admission_details").select("*").in("department_id", ids);
  if (detailsError) throw new Error(`Failed to fetch admission details: ${detailsError.message}`);
  let university = null;
  if (SCHOOL_UPDATES.has(universityId)) {
    const { data, error: uniError } = await supabase.from("universities").select("id,fee").eq("id", universityId).maybeSingle();
    if (uniError) throw new Error(`Failed to fetch university: ${uniError.message}`);
    university = data;
  }
  return {
    departments: new Map((departments ?? []).map((row) => [row.id, row])),
    details: new Map((details ?? []).map((row) => [row.department_id, row])),
    university,
  };
}

function buildPlan(finals, live) {
  const warnings = [];
  const rows = [];
  for (const { path, final, snapshot } of finals) {
    const id = final.dept_id;
    const dept = live.departments.get(id);
    const detail = live.details.get(id);
    if (!dept || !detail) {
      warnings.push(`${id}: department or admission row missing in live DB`);
      continue;
    }
    // Drift guard: the live row must still be what the agents verified.
    if (!isDeepStrictEqual(pick(dept, DEPARTMENT_FIELDS), pick(snapshot.department, DEPARTMENT_FIELDS))) {
      warnings.push(`${id}: live department differs from the research snapshot`);
    }
    if (!isDeepStrictEqual(pick(detail, DOSSIER_FIELDS), pick(snapshot.admission_details, DOSSIER_FIELDS))) {
      warnings.push(`${id}: live admission row differs from the research snapshot`);
    }
    const row = { id, action: final.action, liveDepartment: dept, liveDetail: detail, payload: null, departmentUpdate: {} };
    if (final.action === "update") {
      const next = pick(final.admission_details, DOSSIER_FIELDS);
      if (!isDeepStrictEqual(next, pick(detail, DOSSIER_FIELDS))) {
        row.payload = {
          department_id: id,
          university_id: universityId,
          raw_program_name: detail.raw_program_name,
          raw_level: detail.raw_level,
          ...next,
          source_file: sourceFileRef(path),
          updated_at: new Date().toISOString(),
        };
      }
      for (const [key, value] of Object.entries(final.department_update ?? {})) {
        if (!DEPARTMENT_FIELDS.includes(key)) warnings.push(`${id}: department_update key ${key} not allowed`);
        else if (!isDeepStrictEqual(value, dept[key])) row.departmentUpdate[key] = value;
      }
      if (!row.payload && Object.keys(row.departmentUpdate).length === 0) warnings.push(`${id}: action update but nothing changes`);
    }
    rows.push(row);
  }
  let schoolUpdate = null;
  const spec = SCHOOL_UPDATES.get(universityId);
  if (spec) {
    if (!live.university) warnings.push(`university ${universityId} not found`);
    else if (!isDeepStrictEqual(pick(live.university, Object.keys(spec.expect)), spec.expect)) {
      warnings.push(`university ${universityId}: live ${JSON.stringify(pick(live.university, Object.keys(spec.expect)))} != expected ${JSON.stringify(spec.expect)}`);
    } else schoolUpdate = spec.update;
  }
  return { rows, warnings, schoolUpdate, liveUniversity: live.university };
}

function summarize(plan) {
  return {
    mode,
    university_id: universityId,
    dossier_updates: plan.rows.filter((row) => row.payload).length,
    department_updates: plan.rows.filter((row) => Object.keys(row.departmentUpdate).length > 0).map((row) => ({ id: row.id, ...row.departmentUpdate })),
    deletions: plan.rows.filter((row) => row.action === "delete").map((row) => ({ id: row.id, name: row.liveDepartment.name, slug: row.liveDepartment.slug })),
    held: plan.rows.filter((row) => row.action === "hold").map((row) => row.id),
    unchanged: plan.rows.filter((row) => row.action === "no_change").map((row) => row.id),
    school_update: plan.schoolUpdate,
    warnings: plan.warnings,
  };
}

async function applyPlan(supabase, plan, payloads) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `${RUN_KEY}-before-${stamp}.json`);
  const backup = {
    university: plan.liveUniversity,
    departments: plan.rows.map((row) => row.liveDepartment),
    admission_details: plan.rows.map((row) => row.liveDetail),
  };
  writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`);
  console.log(`[backup] ${basename(backupPath)}`);

  const done = { details: [], departments: [], deleted: [], school: false };
  try {
    for (const payload of payloads) {
      const { error } = await supabase
        .from("program_admission_details")
        .update(payload)
        .eq("department_id", payload.department_id)
        .eq("university_id", universityId);
      if (error) throw new Error(`Failed admission update ${payload.department_id}: ${error.message}`);
      done.details.push(plan.rows.find((row) => row.id === payload.department_id).liveDetail);
    }
    for (const row of plan.rows) {
      if (Object.keys(row.departmentUpdate).length === 0) continue;
      const { error } = await supabase.from("university_departments").update(row.departmentUpdate).eq("id", row.id).eq("university_id", universityId);
      if (error) throw new Error(`Failed department update ${row.id}: ${error.message}`);
      done.departments.push(row.liveDepartment);
    }
    if (plan.schoolUpdate) {
      const { error } = await supabase.from("universities").update(plan.schoolUpdate).eq("id", universityId);
      if (error) throw new Error(`Failed university update: ${error.message}`);
      done.school = true;
    }
    for (const row of plan.rows.filter((candidate) => candidate.action === "delete")) {
      // program_admission_details goes with it (ON DELETE CASCADE); both rows are in the backup.
      const { error } = await supabase.from("university_departments").delete().eq("id", row.id).eq("university_id", universityId);
      if (error) throw new Error(`Failed delete ${row.id}: ${error.message}`);
      done.deleted.push(row);
    }
    const manifest = payloads.length > 0 ? recordImportManifest(RUN_KEY, payloads, { projectRef }) : null;
    return { backup: basename(backupPath), manifest, detailUpdates: done.details.length, departmentUpdates: done.departments.length, deletions: done.deleted.length, school: done.school };
  } catch (error) {
    console.error(`[rollback] ${error instanceof Error ? error.message : String(error)}`);
    for (const row of done.deleted) {
      await supabase.from("university_departments").insert(row.liveDepartment);
      await supabase.from("program_admission_details").insert(row.liveDetail);
    }
    if (done.school) await supabase.from("universities").update(pick(plan.liveUniversity, Object.keys(plan.schoolUpdate))).eq("id", universityId);
    for (const dept of done.departments) {
      await supabase.from("university_departments").update(pick(dept, DEPARTMENT_FIELDS)).eq("id", dept.id);
    }
    for (const detail of done.details) {
      await supabase.from("program_admission_details").update(detail).eq("department_id", detail.department_id).eq("university_id", universityId);
    }
    throw new Error(`${error instanceof Error ? error.message : String(error)} (rolled back; backup ${basename(backupPath)})`);
  }
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const finals = loadFinals();
  const supabase = createImportClient({ mode, projectRef });
  const plan = buildPlan(finals, await fetchLive(supabase, finals.map((item) => item.final.dept_id)));
  // Link temizligi, izin listesi, serbest metin ve uzunluk denetimi + tam metin farki (output/).
  const guarded = await prepareAdmissionWrite(supabase, plan.rows.map((row) => row.payload).filter(Boolean), { mode, scriptName: RUN_KEY });
  let report = summarize(plan);
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (mode !== "apply") {
    console.log(`[OK] Dry run complete. Review output/${RUN_KEY}-program-details-dry-run-diff.txt and ${basename(REPORT_PATH)} before --apply.`);
    return;
  }
  if (plan.warnings.length > 0) throw new Error(`Refusing --apply because the plan has warnings: ${plan.warnings.join(" | ")}`);
  if (plan.rows.length !== finals.length) throw new Error(`Refusing --apply: ${plan.rows.length}/${finals.length} rows resolved.`);
  const payloads = finalizeAdmissionPayloads(guarded);
  const applied = await applyPlan(supabase, plan, payloads);
  report = { ...report, applied };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[OK] Applied ${applied.detailUpdates} admission updates, ${applied.departmentUpdates} department updates, ${applied.deletions} deletions${applied.school ? ", 1 school update" : ""}.`);
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
