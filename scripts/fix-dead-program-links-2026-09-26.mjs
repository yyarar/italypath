// Tek seferlik dogrulama/duzeltme (STATUS.md #61; guvenlik denetimi 2026-09-25 G3#2): 897, 898,
// 901 (UNIBZ, Bolzano), 1074 (Trento) ve 1291 (Torino) programlarinin kayitli resmi program
// sayfasi adresi denetimde acilmiyordu ("26 Eylul link duzeltmesi yalniz bicimi duzeltti,
// adresleri degistirmedi").
//
// Bu betik iki isi ayri ayri yapar:
// 1) DOGRULAMA (her zaman calisir, yazmaz): 5 satirin uc link alanini (official_program_url,
//    official_call_url, tuition_or_fees_link) canli HTTP durumuyla yeniden kontrol eder ve
//    tmp/uni-research/fix-dead-program-links-2026-09-26-live-check.json + konsola yazar.
// 2) DUZELTME (yalniz --replacements <dosya.json> verilirse): department_id -> { alan: yeni
//    deger, note? } eslemesini okur, scripts/lib/program-details-import.mjs uzerinden
//    (prepareAdmissionWrite/finalizeAdmissionPayloads/recordImportManifest) kuru calistirir;
//    izin listesi (lib/officialLinkHosts.mjs) ve uzunluk kontrolleri oradan gelir.
//
// Kullanim:
//   node scripts/fix-dead-program-links-2026-09-26.mjs                       (yalniz dogrulama)
//   node scripts/fix-dead-program-links-2026-09-26.mjs --replacements tmp/x.json               (kuru calistirma, varsayilan)
//   node scripts/fix-dead-program-links-2026-09-26.mjs --replacements tmp/x.json --apply --project-ref kskbnxxyviowmrlskwke
// --apply oncesi: npm run backup:supabase -- --run ve -- --verify (DATA_ENTRY_GUIDE.md), Kerem onayi.
//
// 2026-09-26 yeniden kontrolu (bu betigin ilk calistirmasi): 5 programin da UC link alani da
// (program/cagri/ucret) canli HTTP 200 donuyor ve sayfa icerigi kayittaki program adi/seviye/dil
// ile eslesiyor (bkz. tmp/uni-research/fix-dead-program-links-2026-09-26-live-check.json). Bu yuzden bu
// calistirmada --replacements verilmedi: hicbir satir degismedi.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import {
  URL_FIELDS,
  createImportClient,
  finalizeAdmissionPayloads,
  parseImportArgs,
  prepareAdmissionWrite,
  recordImportManifest,
} from "./lib/program-details-import.mjs";

const SCRIPT_NAME = "dead-program-links-2026-09-26";
const TARGET_DEPARTMENT_IDS = [897, 898, 901, 1074, 1291];
const READ_COLUMNS = [
  "department_id",
  "university_id",
  "raw_program_name",
  "raw_level",
  "raw_teaching_language",
  ...URL_FIELDS,
  "source_quotes",
  "uncertain",
  "uncertainty_notes",
  "source_file",
  "updated_at",
];
const OUTPUT_DIR = resolve(process.cwd(), "tmp/uni-research");
const FETCH_TIMEOUT_MS = 15000;
// Gercek tarayici UA + basliklar: bazi WAF'lar (ornek: securityintelligence-erasmusmundus.eu,
// 2026-09-26 kontrolunde gorulmus) betik/bot UA'sini engelliyor ama gercek tarayiciyi (ve
// curl'u) engellemiyor. Yanlis "olu link" sonucunu onlemek icin tarayici gibi istek atilir.
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const { mode, projectRef, values } = parseImportArgs(process.argv.slice(2), { valueFlags: ["--replacements"] });
const replacementsPath = values["--replacements"] ? resolve(process.cwd(), values["--replacements"]) : null;
const replacements = replacementsPath ? JSON.parse(readFileSync(replacementsPath, "utf8")) : {};

async function fetchTargetRows(supabase) {
  const { data, error } = await supabase
    .from("program_admission_details")
    .select(READ_COLUMNS.join(","))
    .in("department_id", TARGET_DEPARTMENT_IDS);
  if (error) throw new Error(`Failed to read program_admission_details: ${error.message}`);
  return data ?? [];
}

/** Tek bir link alanini canli olarak kontrol eder: GET + yonlendirme takibi, 15 sn zaman asimi. */
async function checkUrl(url) {
  if (!url) return { url: null, ok: false, status: null, error: "field is empty" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: FETCH_HEADERS,
    });
    return { url, ok: response.ok, status: response.status, finalUrl: response.url };
  } catch (error) {
    return { url, ok: false, status: null, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function verifyRows(rows) {
  const results = [];
  for (const row of rows) {
    const checks = {};
    for (const field of URL_FIELDS) {
      checks[field] = await checkUrl(row[field]);
    }
    results.push({
      department_id: row.department_id,
      university_id: row.university_id,
      raw_program_name: typeof row.raw_program_name === "string" ? row.raw_program_name.slice(0, 200) : row.raw_program_name,
      checks,
    });
  }
  return results;
}

/** replacements[department_id] = { official_program_url?, official_call_url?, tuition_or_fees_link?, note? } */
function applyReplacements(row) {
  const rep = replacements[row.department_id];
  if (!rep) return { payload: row, changed: false };
  const payload = { ...row };
  let changed = false;
  for (const field of URL_FIELDS) {
    if (rep[field] !== undefined && rep[field] !== row[field]) {
      payload[field] = rep[field];
      changed = true;
    }
  }
  if (rep.note) {
    const notes = Array.isArray(payload.uncertainty_notes) ? [...payload.uncertainty_notes] : [];
    if (!notes.includes(rep.note)) notes.push(rep.note);
    payload.uncertainty_notes = notes;
  }
  return { payload, changed };
}

async function applyPlan(supabase, plan) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = resolve(process.cwd(), "tmp/dead-program-links-fix");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = resolve(backupDir, `before-${stamp}.json`);
  writeFileSync(backupPath, `${JSON.stringify(plan.map(({ before }) => before), null, 2)}\n`);
  console.log(`[backup] ${relative(process.cwd(), backupPath)} (${plan.length} row(s))`);

  const updated = [];
  try {
    for (const { before, after } of plan) {
      const { data: current, error: readError } = await supabase
        .from("program_admission_details")
        .select(READ_COLUMNS.join(","))
        .eq("department_id", before.department_id)
        .maybeSingle();
      if (readError) throw new Error(`Re-read failed for dept ${before.department_id}: ${readError.message}`);
      if (!current || JSON.stringify(current) !== JSON.stringify(before)) {
        throw new Error(`dept ${before.department_id} changed since dry-run; re-run to refresh the plan (no write performed for this row).`);
      }
      const writeColumns = [...URL_FIELDS, "source_quotes", "uncertain", "uncertainty_notes"];
      const payload = Object.fromEntries(writeColumns.map((column) => [column, after[column] ?? null]));
      const { error } = await supabase
        .from("program_admission_details")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("department_id", before.department_id)
        .eq("university_id", before.university_id);
      if (error) throw new Error(`Update failed for dept ${before.department_id}: ${error.message}`);
      updated.push(before);
    }
  } catch (error) {
    const failures = [];
    for (const row of updated.reverse()) {
      const writeColumns = [...URL_FIELDS, "source_quotes", "uncertain", "uncertainty_notes"];
      const restore = Object.fromEntries(writeColumns.map((column) => [column, row[column] ?? null]));
      const { error: restoreError } = await supabase
        .from("program_admission_details")
        .update(restore)
        .eq("department_id", row.department_id);
      if (restoreError) failures.push(`${row.department_id}: ${restoreError.message}`);
    }
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}; restored ${updated.length - failures.length}/${updated.length} row(s)${failures.length ? ` (restore failures: ${failures.join(" | ")})` : ""}. Backup: ${relative(process.cwd(), backupPath)}`
    );
  }
  return { updated: updated.length, backup: relative(process.cwd(), backupPath) };
}

async function main() {
  const supabase = createImportClient({ mode, projectRef });
  const rows = await fetchTargetRows(supabase);
  const foundIds = rows.map((row) => row.department_id);
  const missingIds = TARGET_DEPARTMENT_IDS.filter((id) => !foundIds.includes(id));
  if (missingIds.length > 0) console.log(`[warn] no program_admission_details row for department_id: ${missingIds.join(", ")}`);

  // 1) Canli dogrulama (her zaman, yazmaz).
  const verification = await verifyRows(rows);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const liveCheckPath = resolve(OUTPUT_DIR, `${SCRIPT_NAME}-live-check.json`);
  writeFileSync(liveCheckPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), verification }, null, 2)}\n`);
  console.log(`[verify] ${rows.length} row(s) checked; report: ${relative(process.cwd(), liveCheckPath)}`);
  for (const v of verification) {
    for (const [field, result] of Object.entries(v.checks)) {
      const label = result.ok ? "OK" : "DEAD";
      console.log(`  dept ${v.department_id} ${field}: [${label}] status=${result.status ?? "n/a"} ${result.error ?? ""} ${result.url ?? "(empty)"}`);
    }
  }

  // 2) Duzeltme (yalniz --replacements ile).
  const plan = rows.map((row) => ({ before: row, ...applyReplacements(row) })).filter((entry) => entry.changed);
  if (plan.length === 0) {
    console.log(
      Object.keys(replacements).length > 0
        ? "[fix] --replacements verildi ama hedef 5 satirdan hicbiri eslemedi veya deger ayniydi; hicbir sey degismiyor."
        : "[fix] --replacements verilmedi; sadece dogrulama yapildi, hicbir satir degismiyor."
    );
    return;
  }

  const payloads = plan.map(({ payload }) => ({ ...payload, updated_at: new Date().toISOString() }));
  const cleaned = await prepareAdmissionWrite(supabase, payloads, { mode, scriptName: SCRIPT_NAME });

  if (mode !== "apply") {
    console.log(`[dry-run] ${plan.length} row(s) would change (see the diff file above for the full before/after).`);
    return;
  }

  const finalized = finalizeAdmissionPayloads(cleaned);
  const finalPlan = plan.map((entry, index) => ({ before: entry.before, after: finalized[index] }));
  const { updated, backup } = await applyPlan(supabase, finalPlan);
  const manifestPath = recordImportManifest(SCRIPT_NAME, finalized, { projectRef });
  console.log(`[apply] ${updated} row(s) updated. Backup: ${backup}. Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
