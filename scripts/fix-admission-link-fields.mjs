// Tek seferlik duzeltme (2026-09-26, guvenlik denetimi G3#2 ve G3#4): canli kabul dosyalarinda
// link alanlarina yazilmis cumleleri ayiklar.
//
// Her satirda official_program_url, official_call_url, tuition_or_fees_link ve
// source_quotes[].url icin scripts/lib/program-details-import.mjs kurallari uygulanir:
// - alan gecerli, bosluksuz http(s) ise dokunulmaz;
// - icinde cumle varsa ilk kullanilabilir URL alana yazilir, metnin tamami uncertainty_notes'a
//   tasinir (kayip yok); URL yoksa alan null olur ve alan adi uncertain listesine eklenir;
// - kisaltici (forms.gle) veya arsiv (web.archive.org) linki hicbir link alaninda kalmaz; o
//   linke bagli alinti resmi bir sayfaya baglanmaz, asil kaynagi (arsiv kopyasi / Google formu)
//   yazilarak uncertainty_notes'a tasinir (Kerem karari: resmi sayfada dogrulanamayan alinti
//   resmi sayfaya baglanmaz; 2026-09-26 kontrolunde 4 alintinin hicbiri bugunku resmi sayfada
//   birebir bulunamadi).
// Duzeltme sonrasi tum linkler lib/officialLinkHosts.mjs izin listesinden gecmelidir.
//
// Kullanim:
//   node scripts/fix-admission-link-fields.mjs                       (kuru calistirma, varsayilan)
//   node scripts/fix-admission-link-fields.mjs --apply --project-ref kskbnxxyviowmrlskwke
// --apply oncesi: npm run backup:supabase -- --run ve -- --verify (DATA_ENTRY_GUIDE.md), Kerem onayi.
import { mkdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import {
  URL_FIELDS,
  checkFieldLengths,
  collectLinkChecks,
  createImportClient,
  formatDetailDiff,
  parseImportArgs,
  recordImportManifest,
  sanitizeDetailLinks,
} from "./lib/program-details-import.mjs";
import { isAllowedOfficialLinkStatus, parseHttpUrl } from "../lib/officialLinkHosts.mjs";

const SCRIPT_NAME = "admission-link-fields-fix";
const COLUMNS = ["department_id", "university_id", ...URL_FIELDS, "source_quotes", "uncertain", "uncertainty_notes"];
const WRITE_COLUMNS = [...URL_FIELDS, "source_quotes", "uncertain", "uncertainty_notes"];
const OUTPUT_DIR = resolve(process.cwd(), "output");

const { mode, projectRef, values } = parseImportArgs(process.argv.slice(2), { valueFlags: ["--backup-dir"] });
const BACKUP_DIR = resolve(process.cwd(), values["--backup-dir"] ?? "tmp/link-fields-fix");

async function fetchAllRows(supabase) {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("program_admission_details")
      .select(COLUMNS.join(","))
      .order("department_id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to read program_admission_details: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function pick(row, columns) {
  return Object.fromEntries(columns.map((column) => [column, row[column] ?? null]));
}

function sameColumns(a, b, columns) {
  return columns.every((column) => JSON.stringify(a[column] ?? null) === JSON.stringify(b[column] ?? null));
}

function buildPlan(rows) {
  const plan = [];
  const blocking = [];
  for (const row of rows) {
    const { payload, changes } = sanitizeDetailLinks(row);
    if (changes.length === 0) continue;
    const label = `dept ${row.department_id} (university ${row.university_id})`;
    if (!parseHttpUrl(payload.official_program_url)) blocking.push(`${label}: official_program_url would have no usable link`);
    for (const check of collectLinkChecks(payload)) {
      if (!isAllowedOfficialLinkStatus(check.status)) blocking.push(`${label}: ${check.field} host "${check.host ?? check.value}" is ${check.status}`);
    }
    for (const problem of checkFieldLengths(payload)) blocking.push(`${label}: ${problem}`);
    plan.push({ before: row, after: payload, changes });
  }
  return { plan, blocking };
}

function summarize(rows, plan, blocking) {
  const fieldCounts = {};
  let quoteUrlFixes = 0;
  let quotesMovedToNotes = 0;
  let nulledFields = 0;
  for (const { changes } of plan) {
    for (const change of changes) {
      if (URL_FIELDS.includes(change.field)) {
        fieldCounts[change.field] = (fieldCounts[change.field] ?? 0) + 1;
        if (change.after == null) nulledFields += 1;
      } else if (change.after == null) quotesMovedToNotes += 1;
      else quoteUrlFixes += 1;
    }
  }
  const byUniversity = {};
  for (const { before } of plan) byUniversity[before.university_id] = (byUniversity[before.university_id] ?? 0) + 1;
  return {
    mode,
    generatedAt: new Date().toISOString(),
    rowsRead: rows.length,
    rowsToUpdate: plan.length,
    rowsWithUrlFieldFixes: plan.filter(({ changes }) => changes.some((change) => URL_FIELDS.includes(change.field))).length,
    urlFieldFixes: fieldCounts,
    urlFieldsSetToNull: nulledFields,
    sourceQuoteUrlFixes: quoteUrlFixes,
    sourceQuotesMovedToNotes: quotesMovedToNotes,
    rowsByUniversity: byUniversity,
    // Tek alintisi kisaltici linke bagli oldugu icin alintisiz kalan dosyalar (alinti notta durur).
    rowsLeftWithoutQuotes: plan.filter(({ after }) => after.source_quotes.length === 0).map(({ before }) => before.department_id),
    blocking,
    rows: plan.map(({ before, after, changes }) => ({
      department_id: before.department_id,
      university_id: before.university_id,
      official_program_url: after.official_program_url,
      official_call_url: after.official_call_url,
      tuition_or_fees_link: after.tuition_or_fees_link,
      notesAdded: after.uncertainty_notes.length - (before.uncertainty_notes ?? []).length,
      uncertainAdded: after.uncertain.filter((field) => !(before.uncertain ?? []).includes(field)),
      changes: changes.map(({ field, after: value }) => ({ field, after: value })),
    })),
  };
}

async function applyPlan(supabase, plan) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = resolve(BACKUP_DIR, `admission-link-fields-before-${stamp}.json`);
  writeFileSync(backupPath, `${JSON.stringify(plan.map(({ before }) => before), null, 2)}\n`);
  console.log(`[backup] ${relative(process.cwd(), backupPath)} (${plan.length} rows, columns: ${COLUMNS.join(", ")})`);

  const updated = [];
  const skipped = [];
  try {
    for (const { before, after } of plan) {
      // Karsilastir-ve-yaz: satir kuru calistirmadan beri degistiyse dokunma.
      const { data: current, error: readError } = await supabase
        .from("program_admission_details")
        .select(COLUMNS.join(","))
        .eq("department_id", before.department_id)
        .maybeSingle();
      if (readError) throw new Error(`Re-read failed for dept ${before.department_id}: ${readError.message}`);
      if (!current || !sameColumns(current, before, COLUMNS)) {
        skipped.push(before.department_id);
        continue;
      }
      const { error } = await supabase
        .from("program_admission_details")
        .update({ ...pick(after, WRITE_COLUMNS), updated_at: new Date().toISOString() })
        .eq("department_id", before.department_id)
        .eq("university_id", before.university_id);
      if (error) throw new Error(`Update failed for dept ${before.department_id}: ${error.message}`);
      updated.push(before);
    }
  } catch (error) {
    const failures = [];
    for (const row of updated.reverse()) {
      const { error: restoreError } = await supabase
        .from("program_admission_details")
        .update(pick(row, WRITE_COLUMNS))
        .eq("department_id", row.department_id);
      if (restoreError) failures.push(`${row.department_id}: ${restoreError.message}`);
    }
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}; restored ${updated.length - failures.length}/${updated.length} rows${failures.length ? ` (restore failures: ${failures.join(" | ")})` : ""}. Backup: ${relative(process.cwd(), backupPath)}`
    );
  }
  return { updated: updated.length, skipped, backup: relative(process.cwd(), backupPath) };
}

async function verify(supabase) {
  const rows = await fetchAllRows(supabase);
  const problems = [];
  for (const row of rows) {
    for (const check of collectLinkChecks(row)) {
      if (!isAllowedOfficialLinkStatus(check.status)) problems.push(`dept ${row.department_id}: ${check.field} is ${check.status}`);
    }
  }
  return { rows: rows.length, problems };
}

async function main() {
  const supabase = createImportClient({ mode, projectRef });
  const rows = await fetchAllRows(supabase);
  const { plan, blocking } = buildPlan(rows);
  const report = summarize(rows, plan, blocking);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const reportPath = resolve(OUTPUT_DIR, `${SCRIPT_NAME}-dry-run-report.json`);
  const diffPath = resolve(OUTPUT_DIR, `${SCRIPT_NAME}-dry-run-diff.txt`);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    diffPath,
    `${[`# ${SCRIPT_NAME} · ${mode} · ${report.generatedAt}`, `rows to update: ${plan.length}`, "", ...plan.map(({ before, after }) => formatDetailDiff(before, after))].join("\n\n")}\n`
  );
  console.log(JSON.stringify({ ...report, rows: `${report.rows.length} rows (see the report file)` }, null, 2));
  console.log(`Report: ${relative(process.cwd(), reportPath)}\nFull diff: ${relative(process.cwd(), diffPath)}`);

  if (mode !== "apply") {
    console.log("[OK] Dry run complete. Nothing was written.");
    return;
  }
  if (blocking.length > 0) throw new Error(`Refusing --apply: ${blocking.length} blocking problem(s) in the plan.`);
  const applied = await applyPlan(supabase, plan);
  applied.manifest = recordImportManifest(SCRIPT_NAME, plan.filter(({ before }) => !applied.skipped.includes(before.department_id)).map(({ after }) => after), { projectRef });
  const verification = await verify(supabase);
  writeFileSync(reportPath, `${JSON.stringify({ ...report, applied, verification }, null, 2)}\n`);
  console.log(JSON.stringify({ applied, verification: { rows: verification.rows, problems: verification.problems.length } }, null, 2));
  if (applied.skipped.length > 0) console.log(`[WARN] ${applied.skipped.length} row(s) changed since the dry run and were skipped: ${applied.skipped.join(", ")}`);
  if (verification.problems.length > 0) throw new Error(`Verification found ${verification.problems.length} link problem(s): ${verification.problems.slice(0, 10).join(" | ")}`);
  console.log(`[OK] Updated ${applied.updated} admission rows; every live link is a valid, allowlisted http(s) URL.`);
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
