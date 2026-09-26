// Resmi SAT aciklamalarinin (806 kayit) tek seferlik importu. Kabul dosyasi yazicilariyla ayni hedef
// kilidini kullanir (scripts/lib/program-details-import.mjs; guvenlik denetimi G2#6 / STATUS #92,
// 2026-09-26).
//
// Kullanim:
//   node scripts/sat/import-explanations.mjs                                                    # kuru calistirma (varsayilan): yazmaz
//   node scripts/sat/import-explanations.mjs --apply --project-ref kskbnxxyviowmrlskwke            # canliya yazar
//   node scripts/sat/import-explanations.mjs --rollback backup.json [--apply --project-ref kskbnxxyviowmrlskwke]
//   node scripts/sat/import-explanations.mjs [--input path] [--backup-dir path]
//
// --apply yalniz --project-ref canli proje kimligiyle ve .env.local'daki NEXT_PUBLIC_SUPABASE_URL o
// projeye aitse calisir (assertTarget); kuru calistirma da canli satirlari okudugu icin adres ayni
// sekilde denetlenir. Okuma ve yazma server-only SUPABASE_SECRET_KEY ile (yazmada yoksa
// SUPABASE_SERVICE_ROLE_KEY). Girdi paketi SHA256SUMS ile dogrulanir; hedef tam olarak 806 kayit ve
// 1019 satirlik sat_questions ile eslesmelidir.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LIVE_PROJECT_REF, createImportClient, parseImportArgs } from "../lib/program-details-import.mjs";
import { hashRows, sha256, stableJson } from "./lib/authored-explanations-import.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const DEFAULT_INPUT = resolve(ROOT, "tmp/sat-bank/explanations-en/package/explanations-en.json");
const PAGE_SIZE = 500;
const WRITE_CHUNK_SIZE = 100;
const BASE_COLUMNS =
  "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,explanation_tr,source_file,needs_review,created_at";
const TARGET_COLUMNS = "id,explanation_en,needs_review";
const ATTEMPT_COLUMNS = "id,user_id,question_id,selected_answer,is_correct,answered_at";

function parseArgs(argv) {
  const parsed = parseImportArgs(argv, {
    valueFlags: ["--input", "--backup-dir", "--rollback"],
    booleanFlags: ["--help"],
  });
  if (parsed.flags.has("--help")) {
    console.log(
      "Usage: node scripts/sat/import-explanations.mjs [--input path] [--backup-dir path] [--apply --project-ref kskbnxxyviowmrlskwke] | --rollback backup.json [--apply --project-ref kskbnxxyviowmrlskwke]"
    );
    process.exit(0);
  }
  const resolvePath = (flag, fallback) => (parsed.values[flag] ? resolve(process.cwd(), parsed.values[flag]) : fallback);
  return {
    mode: parsed.mode,
    // Adres her zaman pinlenir: --apply zaten --project-ref ister (assertTarget), kuru calistirma
    // canli satirlari okudugu icin --project-ref verilmemisse LIVE_PROJECT_REF varsayilir (onceki
    // davranis: EXPECTED_PROJECT_URL her zaman denetlenirdi).
    projectRef: parsed.mode === "apply" ? parsed.projectRef : (parsed.projectRef ?? LIVE_PROJECT_REF),
    apply: parsed.mode === "apply",
    input: resolvePath("--input", DEFAULT_INPUT),
    backupDir: resolvePath("--backup-dir", resolve(ROOT, "tmp/sat-bank/explanations-backups")),
    rollback: resolvePath("--rollback", null),
  };
}

async function rollback(client, options) {
  if (!existsSync(options.rollback)) throw new Error("Rollback backup does not exist.");
  const backup = JSON.parse(readFileSync(options.rollback, "utf8"));
  if (!Array.isArray(backup.rows) || backup.rows.length !== 806 || new Set(backup.rows.map((row) => row.id)).size !== 806) {
    throw new Error("Rollback backup is not a valid 806-row explanation snapshot.");
  }
  if (backup.rows.some((row) => typeof row.id !== "string" || (row.explanation_en !== null && typeof row.explanation_en !== "string"))) {
    throw new Error("Rollback backup has an invalid explanation value.");
  }
  const targetRows = await fetchAll(client, TARGET_COLUMNS);
  if (targetRows.length !== 1019) throw new Error(`Expected 1019 sat_questions rows; found ${targetRows.length}.`);
  const targetIds = new Set(targetRows.map((row) => row.id));
  if (backup.rows.some((row) => !targetIds.has(row.id))) throw new Error("Rollback backup contains a missing target ID.");
  const baseBefore = await fetchAll(client, BASE_COLUMNS);
  const attemptsBefore = await fetchAttempts(client);
  const baseHashBefore = hashRows(baseBefore);
  const attemptsHashBefore = hashRows(attemptsBefore);
  if (!options.apply) {
    const summary = { mode: "rollback-dry-run", status: "ready", backup_sha256: sha256(readFileSync(options.rollback)), would_restore: 806, writes: 0 };
    report(summary);
    return summary;
  }
  await updateExplanationRows(client, backup.rows);
  const targetAfter = await fetchAll(client, TARGET_COLUMNS);
  const afterById = new Map(targetAfter.map((row) => [row.id, row]));
  const exact = backup.rows.filter((row) => afterById.get(row.id)?.explanation_en === row.explanation_en).length;
  const baseHashAfter = hashRows(await fetchAll(client, BASE_COLUMNS));
  const attemptsHashAfter = hashRows(await fetchAttempts(client));
  if (exact !== 806 || baseHashAfter !== baseHashBefore || attemptsHashAfter !== attemptsHashBefore) {
    throw new Error("Rollback post-state validation failed; stop and inspect the backup before any further action.");
  }
  const summary = { mode: "rollback", status: "verified", restored: exact, base_columns_hash_unchanged: true, sat_attempts_hash_unchanged: true };
  report(summary);
  return summary;
}

function verifyChecksums(packageDir) {
  const checksumPath = resolve(packageDir, "SHA256SUMS");
  if (!existsSync(checksumPath)) throw new Error("SHA256SUMS missing beside the explanation input.");
  const entries = readFileSync(checksumPath, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
      if (!match) throw new Error("Invalid SHA256SUMS format.");
      return { expected: match[1].toLowerCase(), filename: match[2] };
    });
  for (const { expected, filename } of entries) {
    const filePath = resolve(packageDir, filename);
    if (dirname(filePath) !== packageDir || !existsSync(filePath)) throw new Error(`Checksum file missing: ${filename}`);
    if (sha256(readFileSync(filePath)) !== expected) throw new Error(`Checksum mismatch: ${filename}`);
  }
  return entries.length;
}

function readCanonical(inputPath) {
  const packageDir = dirname(inputPath);
  const checksumFiles = verifyChecksums(packageDir);
  const records = JSON.parse(readFileSync(inputPath, "utf8"));
  const targetPayload = JSON.parse(readFileSync(resolve(packageDir, "target-ids.json"), "utf8"));
  const targetIds = Array.isArray(targetPayload) ? targetPayload : targetPayload.ids;
  const qa = JSON.parse(readFileSync(resolve(packageDir, "qa-report.json"), "utf8"));
  const gap = JSON.parse(readFileSync(resolve(packageDir, "gap-report.json"), "utf8"));
  if (!Array.isArray(records) || records.length !== 806) throw new Error("Expected exactly 806 explanation records.");
  if (!Array.isArray(targetIds) || targetIds.length !== 806) throw new Error("Expected exactly 806 target IDs.");
  const ids = new Set(records.map((row) => row.id));
  const targetSet = new Set(targetIds);
  if (ids.size !== 806 || targetSet.size !== 806 || ids.size !== targetSet.size || [...ids].some((id) => !targetSet.has(id))) {
    throw new Error("Canonical explanation IDs do not exactly match target-ids.json.");
  }
  if (
    records.some(
      (row) =>
        typeof row.id !== "string" ||
        typeof row.explanation_en !== "string" ||
        row.explanation_en.length === 0 ||
        row.needs_review !== false ||
        row.review_note !== null
    )
  ) {
    throw new Error("Explanation invariants failed (id/text/review state).");
  }
  if (qa.status !== "passed" || qa.failures?.length !== 0 || qa.open_needs_review_count !== 0 || qa.effective_approved_count !== 806) {
    throw new Error("QA report is not a clean 806-record acceptance.");
  }
  if (gap.bank_without_official_rationale?.count !== 213 || gap.excluded_area_and_volume_1?.count !== 20) {
    throw new Error("Gap report does not match the approved scope.");
  }
  return {
    checksumFiles,
    records: records.sort((a, b) => a.id.localeCompare(b.id)),
    canonicalHash: sha256(stableJson(records.map(({ id, explanation_en }) => ({ id, explanation_en })).sort((a, b) => a.id.localeCompare(b.id)))),
  };
}

async function fetchAll(client, columns) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client.from("sat_questions").select(columns).order("id").range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

async function fetchAttempts(client) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client.from("sat_attempts").select(ATTEMPT_COLUMNS).order("id").range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

async function updateExplanationRows(client, rows) {
  for (let index = 0; index < rows.length; index += WRITE_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + WRITE_CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(async ({ id, explanation_en }) => {
        const { data, error } = await client
          .from("sat_questions")
          .update({ explanation_en })
          .eq("id", id)
          .select("id");
        return { count: data?.length ?? 0, error };
      })
    );
    const failed = results.filter((result) => result.error || result.count !== 1);
    if (failed.length) throw new Error(`Explanation update chunk failed for ${failed.length}/${chunk.length} rows.`);
  }
}

function report(summary) {
  console.log(JSON.stringify(summary, null, 2));
}

// clientFactory yalniz cevrimdisi testler icindir (sahte istemci; hedef kilidi yine calisir).
export async function main(argv = process.argv.slice(2), { clientFactory } = {}) {
  const options = parseArgs(argv);
  const client = createImportClient({ mode: options.mode, projectRef: options.projectRef, clientFactory });
  if (options.rollback) return rollback(client, options);
  const canonical = readCanonical(options.input);
  let targetRows;
  try {
    targetRows = await fetchAll(client, TARGET_COLUMNS);
  } catch (error) {
    if (!options.apply && /explanation_en/i.test(error.message ?? "")) {
      const summary = { mode: "dry-run", status: "schema-prerequisite-missing", checksum_files: canonical.checksumFiles, canonical_records: 806, writes: 0 };
      report(summary);
      return summary;
    }
    throw error;
  }

  if (targetRows.length !== 1019) throw new Error(`Expected 1019 sat_questions rows; found ${targetRows.length}.`);
  const targetById = new Map(targetRows.map((row) => [row.id, row]));
  const missingIds = canonical.records.filter((row) => !targetById.has(row.id));
  if (missingIds.length) throw new Error(`Target ID preflight failed: ${missingIds.length} IDs are absent.`);
  if (targetRows.some((row) => row.needs_review !== false)) throw new Error("sat_questions contains open needs_review records.");

  const differentNonNull = canonical.records.filter((row) => {
    const current = targetById.get(row.id).explanation_en;
    return current !== null && current !== row.explanation_en;
  });
  if (differentNonNull.length) throw new Error(`Refusing to overwrite ${differentNonNull.length} differing non-null explanations.`);
  const equal = canonical.records.filter((row) => targetById.get(row.id).explanation_en === row.explanation_en).length;
  const toChange = canonical.records.filter((row) => targetById.get(row.id).explanation_en === null);
  if (equal + toChange.length !== 806) throw new Error("Unexpected explanation state in target rows.");

  const baseBefore = await fetchAll(client, BASE_COLUMNS);
  const attemptsBefore = await fetchAttempts(client);
  const baseHashBefore = hashRows(baseBefore);
  const attemptsHashBefore = hashRows(attemptsBefore);
  const nonTargetIds = new Set(canonical.records.map((row) => row.id));
  const nonTargetBefore = targetRows.filter((row) => !nonTargetIds.has(row.id));
  const nonTargetHashBefore = hashRows(nonTargetBefore);

  if (!options.apply) {
    const summary = {
      mode: "dry-run",
      status: "ready",
      checksum_files: canonical.checksumFiles,
      canonical_records: canonical.records.length,
      canonical_sha256: canonical.canonicalHash,
      sat_questions: targetRows.length,
      target_ids_present: canonical.records.length,
      already_equal: equal,
      would_change: toChange.length,
      differing_non_null: differentNonNull.length,
      untouched_non_targets: nonTargetBefore.length,
      non_target_non_null: nonTargetBefore.filter((row) => row.explanation_en !== null).length,
      sat_attempts: attemptsBefore.length,
      writes: 0,
    };
    report(summary);
    return summary;
  }

  mkdirSync(options.backupDir, { recursive: true });
  const backup = {
    created_at: new Date().toISOString(),
    source_file: basename(options.input),
    canonical_sha256: canonical.canonicalHash,
    rows: canonical.records.map((row) => ({ id: row.id, explanation_en: targetById.get(row.id).explanation_en })),
  };
  const backupPath = resolve(options.backupDir, `sat-explanations-before-${Date.now()}.json`);
  writeFileSync(backupPath, `${JSON.stringify(backup)}\n`, { mode: 0o600 });
  const backupHash = sha256(readFileSync(backupPath));

  try {
    await updateExplanationRows(client, toChange);
  } catch (error) {
    const postState = await fetchAll(client, TARGET_COLUMNS).catch(() => []);
    const exact = postState.filter((row) => targetById.has(row.id) && row.explanation_en === canonical.records.find((item) => item.id === row.id)?.explanation_en).length;
    throw new Error(`Write stopped; no retry performed. Post-state: ${exact}/806 exact. Backup: ${backupPath} (${backupHash}). Original error: ${error.message ?? error}`);
  }

  const targetAfter = await fetchAll(client, TARGET_COLUMNS);
  const baseAfter = await fetchAll(client, BASE_COLUMNS);
  const attemptsAfter = await fetchAttempts(client);
  const targetAfterById = new Map(targetAfter.map((row) => [row.id, row]));
  const exactMatches = canonical.records.filter((row) => targetAfterById.get(row.id)?.explanation_en === row.explanation_en).length;
  const nonTargetAfter = targetAfter.filter((row) => !nonTargetIds.has(row.id));
  const baseHashAfter = hashRows(baseAfter);
  const attemptsHashAfter = hashRows(attemptsAfter);
  if (
    exactMatches !== 806 ||
    targetAfter.length !== 1019 ||
    hashRows(nonTargetAfter) !== nonTargetHashBefore ||
    baseHashAfter !== baseHashBefore ||
    attemptsHashAfter !== attemptsHashBefore ||
    targetAfter.some((row) => row.needs_review !== false)
  ) {
    throw new Error(`Post-write validation failed. Backup: ${backupPath} (${backupHash}).`);
  }
  const summary = {
    mode: "apply",
    status: "verified",
    changed: toChange.length,
    already_equal: equal,
    exact_matches: exactMatches,
    untouched_non_targets: nonTargetAfter.length,
    base_columns_hash_unchanged: baseHashAfter === baseHashBefore,
    sat_attempts_hash_unchanged: attemptsHashAfter === attemptsHashBefore,
    backup_path: backupPath,
    backup_sha256: backupHash,
  };
  report(summary);
  return summary;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`SAT explanation import failed: ${error.message ?? error}`);
    process.exitCode = 1;
  });
}
