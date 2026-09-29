// Tek seferlik ogrenci metni temizligi (yildizli 8 okul dogrulama turu sonu, Kerem onayi 2026-09-28/29;
// yildizli-8-okul-dogrulama-research/KARARLAR.md "Sade dil karari" ve "Sapienza").
//
// 1) "consortium" kelimesi ogrenciye gorunen metinden kalkar: ozel ifadeler once (ornek "consortium
//    universities" -> "partner universities"), kalan her "consortium" -> "joint programme". Bilgi
//    degismez; source_quotes (resmi sayfadan birebir alinti) olduklari gibi kalir.
// 2) 256 kampus alanindaki ic not ("CORRECTION vs. the June 2026 dataset ...") ogrenci diline cevrilir.
//
// Her hedef satir canli okunur; beklenen metin yoksa (ornek 256 kampus degeri degismisse) betik hicbir
// sey yazmadan durur. Yazma scripts/lib/program-details-import.mjs uzerinden (prepareAdmissionWrite /
// finalizeAdmissionPayloads / recordImportManifest); yalniz TEXT_FIELDS ve updated_at yazilir.
//
// Kullanim:
//   node scripts/fix-student-wording-2026-09-29.mjs                     (kuru calistirma, varsayilan)
//   node scripts/fix-student-wording-2026-09-29.mjs --apply --project-ref kskbnxxyviowmrlskwke
// --apply oncesi: npm run backup:supabase -- --run ve -- --verify, Kerem onayi.
import { mkdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import {
  createImportClient,
  finalizeAdmissionPayloads,
  parseImportArgs,
  prepareAdmissionWrite,
  recordImportManifest,
} from "./lib/program-details-import.mjs";

const SCRIPT_NAME = "student-wording-2026-09-29";
const TARGET_DEPARTMENT_IDS = [256, 590, 635, 804, 1145, 1149, 1177, 1281, 1289, 1290];
const TEXT_FIELDS = [
  "raw_teaching_language",
  "campus",
  "admission_type",
  "academic_requirements",
  "language_requirements",
  "application_deadline_eu",
  "application_deadline_non_eu",
  "required_documents",
  "entry_exam_or_test",
  "uncertainty_notes",
];
// Ozel ifadeler once; siralama onemli (genel kurallar en sonda).
const PHRASE_RULES = [
  [
    "Paris consortium of Sorbonne Universite, Universite Paris-Saclay and Universite Paris Cite",
    "Paris (Sorbonne Universite, Universite Paris-Saclay and Universite Paris Cite)",
  ],
  ["of a consortium of five universities led by", "run jointly by five universities led by"],
  ["proficiency in consortium languages", "proficiency in the partner universities' languages"],
  ["the European universities of the consortium", "the European partner universities"],
  ["EIT Food consortium 'Master in Food Systems'", "EIT Food 'Master in Food Systems'"],
  ["mobility-based consortium degree", "mobility-based joint degree"],
  ["consortium universities", "partner universities"],
  ["consortium sites", "partner sites"],
  ["consortium-wide", "programme-wide"],
  ["Same consortium application", "Same joint-programme application"],
  ["a competitive consortium selection", "a competitive joint-programme selection"],
  ["All consortium grants", "All joint-programme grants"],
  ["external consortium application deadlines", "external joint-programme application deadlines"],
  ["a consortium mobility scheme", "a joint-programme mobility scheme"],
];
const GENERIC_RULES = [
  [/CONSORTIUM/g, "JOINT PROGRAMME"],
  [/Consortium/g, "joint programme"],
  [/consortium/g, "joint programme"],
];
// Tam deger degisimi: canlidaki deger birebir "from" degilse betik durur.
const EXACT_VALUES = {
  256: {
    campus: {
      from:
        "Latina (Latina campus of Sapienza University of Rome). CORRECTION vs. the June 2026 dataset and vs. the English-language catalogue page: the English course page does not display a campus field, but the Italian catalogue page for programme code 33457 states 'Sede: Latina', and the official call for applications repeatedly titles the programme '(Latina campus)'. It is NOT delivered in Rome.",
      to:
        "Latina (Latina campus of Sapienza University of Rome). The programme is taught in Latina, not in Rome: the Italian catalogue page for programme code 33457 states 'Sede: Latina' and the official call for applications titles the programme '(Latina campus)'; the English course page does not show a campus.",
    },
  },
};
const LEFTOVER = /consorti|CORRECTION vs\./i;

const { mode, projectRef } = parseImportArgs(process.argv.slice(2));

function rewriteText(text, departmentId, field, log) {
  let out = text;
  for (const [from, to] of PHRASE_RULES) {
    if (out.includes(from)) {
      log.push({ department_id: departmentId, field, from, to });
      out = out.split(from).join(to);
    }
  }
  for (const [pattern, to] of GENERIC_RULES) {
    out = out.replace(pattern, (match, offset, whole) => {
      log.push({ department_id: departmentId, field, from: whole.slice(Math.max(0, offset - 50), offset + match.length + 30), to });
      return to;
    });
  }
  return out;
}

function rewriteValue(value, departmentId, field, log) {
  if (typeof value === "string") return rewriteText(value, departmentId, field, log);
  if (Array.isArray(value)) return value.map((item) => (typeof item === "string" ? rewriteText(item, departmentId, field, log) : item));
  return value;
}

function planRow(row) {
  const log = [];
  const after = { ...row };
  const exact = EXACT_VALUES[row.department_id] ?? {};
  for (const field of TEXT_FIELDS) {
    if (exact[field]) {
      if (row[field] !== exact[field].from) {
        throw new Error(`dept ${row.department_id} ${field}: live value differs from the expected text; nothing written.`);
      }
      after[field] = exact[field].to;
      log.push({ department_id: row.department_id, field, from: exact[field].from, to: exact[field].to });
      continue;
    }
    after[field] = rewriteValue(row[field], row.department_id, field, log);
  }
  for (const field of TEXT_FIELDS) {
    if (LEFTOVER.test(JSON.stringify(after[field] ?? ""))) {
      throw new Error(`dept ${row.department_id} ${field}: wording still present after the rules; nothing written.`);
    }
  }
  const changedFields = TEXT_FIELDS.filter((field) => JSON.stringify(after[field]) !== JSON.stringify(row[field]));
  return { before: row, after, changedFields, log };
}

async function applyPlan(supabase, plan) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = resolve(process.cwd(), "tmp/uni-research");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = resolve(backupDir, `${SCRIPT_NAME}-before-${stamp}.json`);
  writeFileSync(backupPath, `${JSON.stringify(plan.map(({ before }) => before), null, 2)}\n`);
  console.log(`[backup] ${relative(process.cwd(), backupPath)} (${plan.length} row(s))`);

  const updated = [];
  try {
    for (const { before, after, changedFields } of plan) {
      const { data: current, error: readError } = await supabase
        .from("program_admission_details")
        .select("*")
        .eq("department_id", before.department_id)
        .maybeSingle();
      if (readError) throw new Error(`Re-read failed for dept ${before.department_id}: ${readError.message}`);
      if (!current || JSON.stringify(current) !== JSON.stringify(before)) {
        throw new Error(`dept ${before.department_id} changed since it was read; re-run the dry run (no write for this row).`);
      }
      const payload = Object.fromEntries(changedFields.map((field) => [field, after[field] ?? null]));
      const { error } = await supabase
        .from("program_admission_details")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("department_id", before.department_id)
        .eq("university_id", before.university_id);
      if (error) throw new Error(`Update failed for dept ${before.department_id}: ${error.message}`);
      updated.push({ before, changedFields });
    }
  } catch (error) {
    const failures = [];
    for (const { before, changedFields } of updated.reverse()) {
      const restore = Object.fromEntries([...changedFields, "updated_at"].map((field) => [field, before[field] ?? null]));
      const { error: restoreError } = await supabase.from("program_admission_details").update(restore).eq("department_id", before.department_id);
      if (restoreError) failures.push(`${before.department_id}: ${restoreError.message}`);
    }
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}; restored ${updated.length - failures.length}/${updated.length} row(s)${failures.length ? ` (restore failures: ${failures.join(" | ")})` : ""}. Backup: ${relative(process.cwd(), backupPath)}`
    );
  }
  return { updated: updated.length, backup: relative(process.cwd(), backupPath) };
}

async function main() {
  const supabase = createImportClient({ mode, projectRef });
  const { data: rows, error } = await supabase.from("program_admission_details").select("*").in("department_id", TARGET_DEPARTMENT_IDS);
  if (error) throw new Error(`Failed to read program_admission_details: ${error.message}`);
  const missing = TARGET_DEPARTMENT_IDS.filter((id) => !(rows ?? []).some((row) => row.department_id === id));
  if (missing.length > 0) throw new Error(`No program_admission_details row for department_id ${missing.join(", ")}; nothing written.`);

  const plan = rows.map(planRow).filter((entry) => entry.changedFields.length > 0);
  const log = plan.flatMap((entry) => entry.log);
  const reportPath = resolve(process.cwd(), "output", `${SCRIPT_NAME}-changes.json`);
  mkdirSync(resolve(process.cwd(), "output"), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify({ mode, rows: plan.length, replacements: log }, null, 2)}\n`);
  for (const entry of plan) console.log(`[plan] dept ${entry.before.department_id}: ${entry.changedFields.join(", ")}`);
  console.log(`[plan] ${plan.length} row(s), ${log.length} replacement(s); list: ${relative(process.cwd(), reportPath)}`);

  const cleaned = await prepareAdmissionWrite(supabase, plan.map(({ after }) => after), { mode, scriptName: SCRIPT_NAME });
  if (mode !== "apply") {
    console.log("[dry-run] nothing written.");
    return;
  }
  const finalized = finalizeAdmissionPayloads(cleaned);
  const finalPlan = plan.map((entry, index) => ({ ...entry, after: finalized[index] }));
  const { updated, backup } = await applyPlan(supabase, finalPlan);
  const manifestPath = recordImportManifest(SCRIPT_NAME, finalized, { projectRef });
  console.log(`[apply] ${updated} row(s) updated. Backup: ${backup}. Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
