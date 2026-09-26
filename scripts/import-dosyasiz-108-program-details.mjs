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

// Importer for the 2026-09-19 "dosyasız 108 program" round: existing department
// rows that had no admission dossier were researched one by one. Only the 41 rows
// Kerem approved for import are handled here (see
// dosyasiz-108-program-research/KARARLAR.md); the 67 deletion candidates are a
// separate, backed-up step.
// Usage: node scripts/import-dosyasiz-108-program-details.mjs [--dry-run | --apply --project-ref kskbnxxyviowmrlskwke]
const SCRIPT_KEY = "dosyasiz-108";
const SOURCE_GENERATED_AT = "2026-09-19";
const RESULTS_DIR = resolve(process.cwd(), "dosyasiz-108-program-research/results");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "dosyasiz-108-program-details-import-report.json");
const BACKUP_DIR = resolve(process.cwd(), "tmp/uni-research");

// dept_id -> expected live row (guards against id drift) + source file.
// `languages` is the target value; en+it rows get their language flag changed.
const EN = ["en"];
const EN_IT = ["en", "it"];
const DEPARTMENTS = new Map([
  // Fully English (SONUC_OZETI bölüm 1)
  [402, { universityId: 24, dbName: "Nursing", level: "bachelor", languages: EN, file: "402_Vanvitelli_Nursing.json" }],
  [415, { universityId: 29, dbName: "Medicine and Surgery", level: "bachelor", languages: EN, file: "415_Milano_Bicocca_Medicine_and_Surgery.json" }],
  [416, { universityId: 30, dbName: "Biosciences and Biotechnology", level: "bachelor", languages: EN, file: "416_Camerino_Biosciences_and_Biotechnology.json" }],
  [418, { universityId: 31, dbName: "Economics and Business", level: "bachelor", languages: EN, file: "418_Cassino_Economics_and_Business.json" }],
  [419, { universityId: 31, dbName: "Economics with Data Science", level: "bachelor", languages: EN, file: "419_Cassino_Economics_with_Data_Science.json" }],
  [420, { universityId: 31, dbName: "Industrial Engineering Technology", level: "bachelor", languages: EN, file: "420_Cassino_Industrial_Engineering_Technology.json" }],
  [435, { universityId: 38, dbName: "International, European and Comparative Legal Studies (IECOLS)", level: "bachelor", languages: EN, file: "435_Macerata_International_European_and_Comparative_Legal_Studies_IECOLS.json" }],
  [452, { universityId: 46, dbName: "Management Engineering for Innovation", level: "bachelor", languages: EN, file: "452_Politecnico_di_Bari_Management_Engineering_for_Innovation.json" }],
  [453, { universityId: 47, dbName: "Biomedical Engineering", level: "bachelor", languages: EN, file: "453_Campus_Bio_Medico_Biomedical_Engineering.json" }],
  [454, { universityId: 47, dbName: "Medicine and Surgery", level: "bachelor", languages: EN, file: "454_Campus_Bio_Medico_Medicine_and_Surgery.json" }],
  [455, { universityId: 47, dbName: "Medicine and Surgery-MedTech", level: "bachelor", languages: EN, file: "455_Campus_Bio_Medico_Medicine_and_Surgery_MedTech.json" }],
  [456, { universityId: 48, dbName: "Biotechnology", level: "bachelor", languages: EN, file: "456_Teramo_Biotechnology.json" }],
  [466, { universityId: 53, dbName: "Medicine and Surgery", level: "bachelor", languages: EN, file: "466_Cagliari_Medicine_and_Surgery.json" }],
  [468, { universityId: 54, dbName: "Industrial Engineering", level: "bachelor", languages: EN, file: "468_LIUC_Industrial_Engineering.json" }],
  [469, { universityId: 55, dbName: "Business Economics and Organization", level: "bachelor", languages: EN, file: "469_LUM_Business_Economics_and_Organization.json" }],
  [883, { universityId: 8, dbName: "Innovations in Biotechnology Applied to Regenerative Medicine", level: "master", languages: EN, file: "883_Cattolica_Innovations_in_Biotechnology_Applied_to_Regenerative_Medicine.json" }],
  [977, { universityId: 24, dbName: "Architecture - Interior Design and for Autonomy", level: "master", languages: EN, file: "977_Vanvitelli_Architecture_Interior_Design_and_for_Autonomy.json" }],
  [1006, { universityId: 15, dbName: "Economics, Development and Innovation", level: "master", languages: EN, file: "1006_Pavia_Economics_Development_and_Innovation.json" }],
  [1056, { universityId: 18, dbName: "Computer Science", level: "master", languages: EN, file: "1056_Trento_Computer_Science.json" }],
  [1060, { universityId: 18, dbName: "European and International Studies", level: "master", languages: EN, file: "1060_Trento_European_and_International_Studies.json" }],
  // Group A: joint degrees kept under every partner (641/969 precedent) + SeaBluE
  [1003, { universityId: 15, dbName: "Artificial Intelligence for Science and Technology", level: "master", languages: EN, file: "1003_Pavia_Artificial_Intelligence_for_Science_and_Technology.json" }],
  [1010, { universityId: 15, dbName: "Human-Centered Artificial Intelligence", level: "master", languages: EN, file: "1010_Pavia_Human_Centered_Artificial_Intelligence.json" }],
  [1018, { universityId: 15, dbName: "Philosophical Knowledge: Foundations, Methods, Applications", level: "master", languages: EN, file: "1018_Pavia_Philosophical_Knowledge_Foundations_Methods_Applications.json" }],
  [794, { universityId: 5, dbName: "Industrial Chemistry for Circular and Bio Economy", level: "master", languages: EN, file: "794_Polito_Industrial_Chemistry_for_Circular_and_Bio_Economy.json" }],
  [432, { universityId: 35, dbName: "Sustainable Blue Economy", level: "bachelor", languages: EN, file: "432_Parthenope_Sustainable_Blue_Economy.json" }],
  // Partially English with a real fully-English track -> en+it
  [429, { universityId: 35, dbName: "Business Administration", level: "bachelor", languages: EN_IT, file: "429_Parthenope_Business_Administration.json" }],
  [447, { universityId: 43, dbName: "Economics and Business Management", level: "bachelor", languages: EN_IT, file: "447_European_Univ_of_Rome_Economics_and_Business_Management.json" }],
  [459, { universityId: 50, dbName: "Economics and Business Administration", level: "bachelor", languages: EN_IT, file: "459_UNINETTUNO_Economics_and_Business_Administration.json" }],
  [462, { universityId: 52, dbName: "Business Economics and Management", level: "bachelor", languages: EN_IT, file: "462_Marconi_Telematica_Business_Economics_and_Management.json" }],
  [463, { universityId: 52, dbName: "Computer Engineering", level: "bachelor", languages: EN_IT, file: "463_Marconi_Telematica_Computer_Engineering.json" }],
  [464, { universityId: 52, dbName: "Psychological Science and Techniques", level: "bachelor", languages: EN_IT, file: "464_Marconi_Telematica_Psychological_Science_and_Techniques.json" }],
  [467, { universityId: 54, dbName: "Economics and Management", level: "bachelor", languages: EN_IT, file: "467_LIUC_Economics_and_Management.json" }],
  [470, { universityId: 56, dbName: "Economics and Finance", level: "bachelor", languages: EN_IT, file: "470_Chieti_Pescara_Economics_and_Finance.json" }],
  [475, { universityId: 59, dbName: "Civil and Environmental Engineering for Sustainable Development", level: "bachelor", languages: EN_IT, file: "475_Reggio_Calabria_Civil_and_Environmental_Engineering_for_Sustainable_Development.json" }],
  [801, { universityId: 5, dbName: "Mechanical Engineering", level: "master", languages: EN_IT, file: "801_Polito_Mechanical_Engineering.json" }],
  [805, { universityId: 5, dbName: "Urban and Regional Planning", level: "master", languages: EN_IT, file: "805_Polito_Urban_and_Regional_Planning.json" }],
  [966, { universityId: 29, dbName: "Marketing and Global Markets", level: "master", languages: EN_IT, file: "966_Milano_Bicocca_Marketing_and_Global_Markets.json" }],
  [976, { universityId: 29, dbName: "Physics", level: "master", languages: EN_IT, file: "976_Milano_Bicocca_Physics.json" }],
  [1077, { universityId: 21, dbName: "Chemistry-English&Italian", level: "master", languages: EN_IT, file: "1077_Trieste_Chemistry_English_Italian.json" }],
  [1083, { universityId: 21, dbName: "Economy, Environment and Development-English&Italian", level: "master", languages: EN_IT, file: "1083_Trieste_Economy_Environment_and_Development_English_Italian.json" }],
  [1089, { universityId: 21, dbName: "Materials and Chemical Engineering for Nano, Bio, and Sustainable Technologies-English&Italian", level: "master", languages: EN_IT, file: "1089_Trieste_Materials_and_Chemical_Engineering_for_Nano_Bio_and_Sustainable_Technologies_English_Italian.json" }],
]);

// Medicine rows seeded as bachelor are 6-year single-cycle degrees (LM-41).
const LEVEL_FIXES = new Map([
  [415, "single-cycle"],
  [454, "single-cycle"],
  [455, "single-cycle"],
  [466, "single-cycle"],
]);

// Name only — slugs stay so already-indexed program URLs keep working.
const RENAMES = new Map([
  [468, "Management Engineering"],
  [977, "Architecture - Regeneration of the Built Environment"],
  [1077, "Chemistry"],
  [1083, "Economy, Environment and Development"],
  [1089, "Materials and Chemical Engineering for Nano, Bio, and Sustainable Technologies"],
]);

// Group A decision: say plainly who runs the application.
const ADMISSION_NOTES = new Map([
  [1003, "Joint degree of the University of Milano-Bicocca (administrative seat), the University of Milan and the University of Pavia: applications and enrolment are handled by the University of Milano-Bicocca."],
  [1010, "Joint degree of the University of Milan (administrative seat), the University of Milano-Bicocca and the University of Pavia: applications and enrolment are handled by the University of Milan."],
  [1018, "Joint degree of the University of Bergamo (administrative seat), the University of Pavia and IUSS Pavia: applications and enrolment are handled by the University of Bergamo."],
  [794, "Joint degree of the University of Naples Federico II (administrative seat) and Politecnico di Torino: selection, application and Universitaly pre-enrolment are handled by Federico II."],
  [432, "SEA-EU joint bachelor coordinated by the University of Cadiz (Spain): years 1-2 in Naples, year 3 is a mandatory 12-month mobility at a partner university abroad; applications only via sea-eu.org and tuition fees are paid to the University of Cadiz."],
]);

// Pre-import date refresh (Kerem, 2026-09-19): only 883 relied on an older call.
const EXTRA_UNCERTAINTY_NOTES = new Map([
  [883, "Re-checked 2026-09-19 before import: the programme's admissions page and the Cattolica International page still show the A.Y. 2025/26 call (intake October 2025); no A.Y. 2026/27 call has been published yet, so all dates above are from the previous year."],
]);

const { mode, projectRef } = parseImportArgs(process.argv.slice(2));

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
  return String(value);
}

function firstUrl(value, { required = false, field = "", file = "" } = {}) {
  const text = flattenText(value);
  const url = text?.match(/https?:\/\/[^\s)"'|,;]+/)?.[0]?.replace(/[.,;:)\]}]+$/, "") ?? null;
  if (!url && required) throw new Error(`${file} has no extractable URL in ${field}`);
  return url;
}

function deriveLevel(value, file) {
  const lower = (flattenText(value) ?? "").toLowerCase();
  if (lower.startsWith("single-cycle") || lower.startsWith("single cycle")) return "single-cycle";
  if (lower.startsWith("master")) return "master";
  if (lower.startsWith("bachelor")) return "bachelor";
  throw new Error(`${file} has unrecognized correct_level: ${lower.slice(0, 60)}`);
}

function normalizeSourceQuotes(list, officialProgramUrl, file) {
  if (!Array.isArray(list) || list.length === 0) throw new Error(`${file} has empty/invalid source_quotes`);
  const quotes = list.flatMap((item) => {
    const base = typeof item?.quote === "string" ? item.quote.trim() : "";
    if (!base) return [];
    const year = typeof item.academic_year === "string" && item.academic_year.trim() ? item.academic_year.trim() : null;
    const refs = typeof item.field_supported === "string" ? item.field_supported.split(",").map((s) => s.trim()).filter(Boolean) : [];
    return [{
      url: typeof item.source_url === "string" && item.source_url.trim() ? item.source_url.trim() : officialProgramUrl,
      quote: year ? `${base} [A.Y. ${year}]` : base,
      field_refs: refs,
      retrieved_at: SOURCE_GENERATED_AT,
    }];
  });
  if (quotes.length === 0) throw new Error(`${file} source_quotes normalized to empty`);
  return quotes;
}

function toDetailPayload(departmentId, spec, record) {
  const file = spec.file;
  const officialProgramUrl = firstUrl(record.official_program_url, { required: true, field: "official_program_url", file });
  const note = ADMISSION_NOTES.get(departmentId);
  const admissionType = flattenText(record.admission_type);
  const documents = flattenText(record.required_documents);
  const now = new Date().toISOString();
  return {
    department_id: departmentId,
    university_id: spec.universityId,
    raw_program_name: flattenText(record.program_name),
    raw_level: flattenText(record.level),
    raw_teaching_language: flattenText(record.teaching_language),
    campus: flattenText(record.campus),
    degree_class: flattenText(record.degree_class),
    admission_type: note ? `${note}\n${admissionType ?? ""}`.trim() : admissionType,
    academic_requirements: flattenText(record.academic_requirements),
    language_requirements: flattenText(record.language_requirements),
    application_deadline_eu: flattenText(record.application_deadline_eu),
    application_deadline_non_eu: flattenText(record.application_deadline_non_eu),
    required_documents: documents ? [documents] : ["[uncertain] Required documents not published in official sources at research time."],
    entry_exam_or_test: flattenText(record.entry_exam_or_test),
    tuition_or_fees_link: firstUrl(record.tuition_or_fees_link),
    official_program_url: officialProgramUrl,
    official_call_url: firstUrl(record.official_call_url),
    source_quotes: normalizeSourceQuotes(record.source_quotes, officialProgramUrl, file),
    uncertain: Array.isArray(record.uncertain) ? record.uncertain.map(flattenText).filter(Boolean) : [],
    uncertainty_notes: [flattenText(record.uncertainty_notes), EXTRA_UNCERTAINTY_NOTES.get(departmentId)].filter(Boolean),
    source_file: sourceFileRef(join(RESULTS_DIR, file)),
    imported_at: now,
    updated_at: now,
  };
}

function loadRecord(spec) {
  const path = join(RESULTS_DIR, spec.file);
  if (!existsSync(path)) throw new Error(`Missing source file ${spec.file}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

async function fetchLiveRows(supabase) {
  const ids = [...DEPARTMENTS.keys()];
  const { data: departments, error } = await supabase
    .from("university_departments")
    .select("id,university_id,name,slug,level,languages,duration_years,sort_order")
    .in("id", ids);
  if (error) throw new Error(`Failed to fetch departments: ${error.message}`);
  const { data: details, error: detailsError } = await supabase
    .from("program_admission_details")
    .select("department_id")
    .in("department_id", ids);
  if (detailsError) throw new Error(`Failed to fetch admission details: ${detailsError.message}`);
  return { departments: departments ?? [], existingDetailIds: new Set((details ?? []).map((d) => d.department_id)) };
}

function buildPlan({ departments, existingDetailIds }) {
  const warnings = [];
  const liveById = new Map(departments.map((d) => [d.id, d]));
  const rows = [];
  for (const [id, spec] of DEPARTMENTS) {
    const live = liveById.get(id);
    if (!live) {
      warnings.push(`${id}: department not found in live DB`);
      continue;
    }
    if (live.university_id !== spec.universityId) warnings.push(`${id}: university_id ${live.university_id} != expected ${spec.universityId}`);
    if (live.name !== spec.dbName) warnings.push(`${id}: live name "${live.name}" != expected "${spec.dbName}"`);
    if (live.level !== spec.level) warnings.push(`${id}: live level "${live.level}" != expected "${spec.level}"`);
    if (existingDetailIds.has(id)) warnings.push(`${id}: admission details already exist`);

    const record = loadRecord(spec);
    const targetLevel = LEVEL_FIXES.get(id) ?? spec.level;
    const researchedLevel = deriveLevel(record.correct_level, spec.file);
    if (researchedLevel !== targetLevel) warnings.push(`${id}: research level "${researchedLevel}" != target level "${targetLevel}"`);

    let payload = null;
    try {
      payload = toDetailPayload(id, spec, record);
    } catch (error) {
      warnings.push(`${id}: payload build failed — ${error instanceof Error ? error.message : String(error)}`);
    }

    const departmentUpdate = {};
    if (targetLevel !== live.level) Object.assign(departmentUpdate, { level: targetLevel, sort_order: 0 });
    if (RENAMES.has(id) && RENAMES.get(id) !== live.name) departmentUpdate.name = RENAMES.get(id);
    const liveLanguages = [...(live.languages ?? [])].sort().join(",");
    if (liveLanguages !== [...spec.languages].sort().join(",")) departmentUpdate.languages = spec.languages;

    rows.push({ id, live, payload, departmentUpdate });
  }
  return { rows, warnings };
}

function summarize(plan) {
  const count = (key) => plan.rows.filter((r) => key in r.departmentUpdate).length;
  return {
    mode,
    detailInserts: plan.rows.filter((r) => r.payload).length,
    levelFixes: count("level"),
    renames: count("name"),
    languageChanges: count("languages"),
    warnings: plan.warnings,
    rows: plan.rows.map(({ id, live, payload, departmentUpdate }) => ({
      id,
      university_id: live.university_id,
      name: live.name,
      slug: live.slug,
      departmentUpdate,
      official_program_url: payload?.official_program_url ?? null,
      source_quotes: payload?.source_quotes.length ?? 0,
      uncertain: payload?.uncertain.length ?? 0,
      admission_note: ADMISSION_NOTES.has(id),
    })),
  };
}

async function applyPlan(supabase, plan) {
  const stamp = new Date().toISOString().slice(0, 10);
  const backupPath = join(BACKUP_DIR, `dosyasiz-108-departments-before-import-${stamp}.json`);
  writeFileSync(backupPath, `${JSON.stringify(plan.rows.map((r) => r.live), null, 2)}\n`);
  console.log(`[backup] ${basename(backupPath)}`);

  const updated = [];
  const insertedIds = [];
  try {
    for (const { id, live, departmentUpdate } of plan.rows) {
      if (Object.keys(departmentUpdate).length === 0) continue;
      const { error } = await supabase
        .from("university_departments")
        .update(departmentUpdate)
        .eq("id", id)
        .eq("university_id", live.university_id);
      if (error) throw new Error(`Failed department update ${id}: ${error.message}`);
      updated.push(live);
    }
    const payloads = finalizeAdmissionPayloads(plan.rows.map((r) => r.payload));
    const { error } = await supabase.from("program_admission_details").insert(payloads);
    if (error) throw new Error(`Failed to insert admission details: ${error.message}`);
    insertedIds.push(...payloads.map((p) => p.department_id));
    const manifest = recordImportManifest(SCRIPT_KEY, payloads, { projectRef });
    return { detailInserts: insertedIds.length, departmentUpdates: updated.length, backup: basename(backupPath), manifest };
  } catch (error) {
    if (insertedIds.length > 0) {
      await supabase.from("program_admission_details").delete().in("department_id", insertedIds);
    }
    for (const live of updated) {
      const { name, level, languages, sort_order } = live;
      await supabase.from("university_departments").update({ name, level, languages, sort_order }).eq("id", live.id);
    }
    throw error;
  }
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const supabase = createImportClient({ mode, projectRef });
  const plan = buildPlan(await fetchLiveRows(supabase));
  // Link temizligi, izin listesi, serbest metin ve uzunluk denetimi + tam metin farki
  // (output/). --apply'da engelleyici sorun varsa hicbir yazma yapilmadan durur.
  const guardedPayloads = await prepareAdmissionWrite(supabase, plan.rows.map((r) => r.payload).filter(Boolean), { mode, scriptName: SCRIPT_KEY });
  plan.rows.forEach((row) => {
    if (row.payload) row.payload = guardedPayloads.find((payload) => payload.department_id === row.id) ?? row.payload;
  });
  let report = summarize(plan);
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, rows: `${report.rows.length} rows (see ${basename(REPORT_PATH)})` }, null, 2));

  if (mode !== "apply") {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
    return;
  }
  if (plan.warnings.length > 0) throw new Error(`Refusing --apply because the plan has warnings: ${plan.warnings.join(" | ")}`);
  if (plan.rows.length !== DEPARTMENTS.size) throw new Error(`Refusing --apply: ${plan.rows.length}/${DEPARTMENTS.size} rows resolved.`);
  const applied = await applyPlan(supabase, plan);
  report = { ...report, applied };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[OK] Applied ${applied.detailInserts} program details, ${applied.departmentUpdates} department updates.`);
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
