// Kerem'in el yazisi 213 SAT aciklamasinin tek seferlik importu. Kabul dosyasi yazicilariyla ayni
// hedef kilidini kullanir (scripts/lib/program-details-import.mjs; guvenlik denetimi G2#6 / STATUS #92,
// 2026-09-26).
//
// Kullanim:
//   node scripts/sat/import-authored-explanations.mjs                                                 # kuru calistirma (varsayilan): yazmaz
//   node scripts/sat/import-authored-explanations.mjs --apply --project-ref kskbnxxyviowmrlskwke        # canliya yazar
//   node scripts/sat/import-authored-explanations.mjs --rollback backup.json [--apply --project-ref kskbnxxyviowmrlskwke]
//   node scripts/sat/import-authored-explanations.mjs [--input path] [--backup path]
//
// --apply yalniz --project-ref canli proje kimligiyle ve .env.local'daki NEXT_PUBLIC_SUPABASE_URL o
// projeye aitse calisir (assertTarget); kuru calistirma da canli satirlari okudugu icin adres ayni
// sekilde denetlenir. Okuma ve yazma server-only SUPABASE_SECRET_KEY ile (yazmada yoksa
// SUPABASE_SERVICE_ROLE_KEY). Girdi paketi SHA256SUMS ile dogrulanir; hedef tam olarak 213 kayit ve
// 1019 satirlik sat_questions ile eslesmelidir.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LIVE_PROJECT_REF, createImportClient, parseImportArgs } from "../lib/program-details-import.mjs";
import {
  EXPECTED_AUTHORED_COUNT,
  EXPECTED_OFFICIAL_COUNT,
  EXPECTED_PROJECT_REF,
  EXPECTED_QUESTION_COUNT,
  applyRecords,
  buildBackup,
  hashRows,
  readCanonicalPackage,
  rollbackRecords,
  sha256,
  validateLiveState,
} from "./lib/authored-explanations-import.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const DEFAULT_INPUT = path.join(REPO_ROOT, "tmp/sat-bank/authored-explanations-en/package/explanations-en.json");
const DEFAULT_BACKUP = path.join(
  REPO_ROOT,
  "tmp/sat-bank/authored-explanations-backups/sat-authored-explanations-before-apply.json"
);
const PAGE_SIZE = 500;
const TARGET_COLUMNS = "id,explanation_en,needs_review";
const BASE_COLUMNS =
  "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,explanation_tr,source_file,needs_review,created_at";
const ATTEMPT_COLUMNS = "id,user_id,question_id,selected_answer,is_correct,answered_at";

function parseArgs(argv) {
  const parsed = parseImportArgs(argv, { valueFlags: ["--input", "--rollback", "--backup"] });
  const resolvePath = (flag, fallback) => (parsed.values[flag] ? path.resolve(process.cwd(), parsed.values[flag]) : fallback);
  const options = {
    mode: parsed.mode,
    // Adres her zaman pinlenir: --apply zaten --project-ref ister (assertTarget), kuru calistirma
    // canli satirlari okudugu icin --project-ref verilmemisse LIVE_PROJECT_REF varsayilir (onceki
    // davranis: EXPECTED_PROJECT_URL her zaman denetlenirdi).
    projectRef: parsed.mode === "apply" ? parsed.projectRef : (parsed.projectRef ?? LIVE_PROJECT_REF),
    apply: parsed.mode === "apply",
    input: resolvePath("--input", DEFAULT_INPUT),
    rollback: resolvePath("--rollback", null),
    backup: resolvePath("--backup", DEFAULT_BACKUP),
  };
  if (options.rollback && options.input !== DEFAULT_INPUT) throw new Error("--input cannot be combined with --rollback.");
  return options;
}

export async function fetchAll(client, table, columns) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

export async function writeExplanation(client, { id, explanation_en }) {
  const { data, error } = await client
    .from("sat_questions")
    .update({ explanation_en })
    .eq("id", id)
    .is("explanation_en", null)
    .select("id,explanation_en");
  if (error) throw error;
  return data?.length === 1 && data[0].id === id && data[0].explanation_en === explanation_en;
}

export async function restoreExplanation(client, { id, explanation_en, imported_explanation_en }) {
  const { data, error } = await client
    .from("sat_questions")
    .update({ explanation_en })
    .eq("id", id)
    .eq("explanation_en", imported_explanation_en)
    .select("id,explanation_en");
  if (error) throw error;
  return data?.length === 1 && data[0].id === id && data[0].explanation_en === explanation_en;
}

export async function runDryRun({ client, canonical }) {
  const [targetState, baseState, attempts] = await Promise.all([
    fetchAll(client, "sat_questions", TARGET_COLUMNS),
    fetchAll(client, "sat_questions", BASE_COLUMNS),
    fetchAll(client, "sat_attempts", ATTEMPT_COLUMNS),
  ]);
  if (targetState.some((row) => row.needs_review !== false)) {
    throw new Error("Live sat_questions contains open needs_review records.");
  }
  const { targetRows, nonTargetRows } = validateLiveState({ allRows: targetState, canonicalRecords: canonical.records });
  const protectedHashes = {
    non_targets: hashRows(nonTargetRows),
    base_columns: hashRows(baseState),
    sat_attempts: hashRows(attempts),
  };
  return {
    summary: {
      mode: "dry-run",
      status: "ready",
      project_ref: EXPECTED_PROJECT_REF,
      package_sha256: canonical.packageHash,
      canonical_sha256: canonical.canonicalHash,
      sat_questions: targetState.length,
      package_records: canonical.records.length,
      target_ids_present: targetRows.length,
      target_rows_null: targetRows.filter((row) => row.explanation_en === null).length,
      target_rows_non_null: targetRows.filter((row) => row.explanation_en !== null).length,
      official_non_targets_unchanged: nonTargetRows.length,
      sat_attempts: attempts.length,
      protected_hashes: protectedHashes,
      writes: 0,
    },
    targetRows,
    protectedHashes,
  };
}

function validateBackup(backup) {
  if (
    backup?.schema_version !== 1 ||
    backup.kind !== "sat-authored-explanations-before-apply" ||
    backup.project_ref !== EXPECTED_PROJECT_REF ||
    backup.target_count !== EXPECTED_AUTHORED_COUNT ||
    !Array.isArray(backup.rows) ||
    backup.rows.length !== EXPECTED_AUTHORED_COUNT ||
    new Set(backup.rows.map((row) => row.id)).size !== EXPECTED_AUTHORED_COUNT
  ) {
    throw new Error("Rollback backup is not a valid 213-row authored explanation snapshot.");
  }
  for (const row of backup.rows) {
    if (
      typeof row.id !== "string" ||
      row.explanation_en !== null ||
      typeof row.imported_explanation_en !== "string" ||
      row.imported_explanation_en.length < 25
    ) {
      throw new Error(`Rollback backup row invariant failed for ${row.id ?? "unknown ID"}.`);
    }
  }
  if (
    !backup.protected_hashes ||
    [
      backup.protected_hashes.non_targets,
      backup.protected_hashes.base_columns,
      backup.protected_hashes.sat_attempts,
    ].some((value) => !/^[a-f0-9]{64}$/.test(value ?? ""))
  ) {
    throw new Error("Rollback backup protected hashes are invalid.");
  }
  return backup;
}

export async function runApply({ client, canonical, backupPath }) {
  const preflight = await runDryRun({ client, canonical });
  if (existsSync(backupPath)) throw new Error(`Refusing to overwrite existing backup: ${backupPath}`);
  const backup = buildBackup({
    currentRows: preflight.targetRows,
    canonicalRecords: canonical.records,
    canonicalHash: canonical.canonicalHash,
    packageHash: canonical.packageHash,
    projectRef: EXPECTED_PROJECT_REF,
    protectedHashes: preflight.protectedHashes,
  });
  mkdirSync(path.dirname(backupPath), { recursive: true });
  writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  const backupHash = sha256(readFileSync(backupPath));

  const applied = await applyRecords({
    records: canonical.records,
    writeExplanation: (row) => writeExplanation(client, row),
    restoreExplanation: (row) => restoreExplanation(client, row),
  });
  const [targetState, baseState, attempts] = await Promise.all([
    fetchAll(client, "sat_questions", TARGET_COLUMNS),
    fetchAll(client, "sat_questions", BASE_COLUMNS),
    fetchAll(client, "sat_attempts", ATTEMPT_COLUMNS),
  ]);
  if (targetState.length !== EXPECTED_QUESTION_COUNT) throw new Error("Post-import sat_questions count changed.");
  const liveById = new Map(targetState.map((row) => [row.id, row]));
  const exactMatches = canonical.records.filter(
    (row) => liveById.get(row.id)?.explanation_en === row.explanation_en
  ).length;
  const targetIds = new Set(canonical.targetIds);
  const nonTargets = targetState.filter((row) => !targetIds.has(row.id));
  const protectedChecks = {
    non_targets: hashRows(nonTargets) === backup.protected_hashes.non_targets,
    base_columns: hashRows(baseState) === backup.protected_hashes.base_columns,
    sat_attempts: hashRows(attempts) === backup.protected_hashes.sat_attempts,
  };
  if (
    exactMatches !== EXPECTED_AUTHORED_COUNT ||
    nonTargets.length !== EXPECTED_OFFICIAL_COUNT ||
    Object.values(protectedChecks).some((value) => value !== true)
  ) {
    throw new Error(`Post-import validation failed. Inspect backup ${backupPath} before any retry.`);
  }
  return {
    mode: "apply",
    status: "verified",
    project_ref: EXPECTED_PROJECT_REF,
    package_sha256: canonical.packageHash,
    changed: applied.changed,
    exact_matches: exactMatches,
    explanations_present: targetState.filter((row) => row.explanation_en !== null).length,
    explanations_missing: targetState.filter((row) => row.explanation_en === null).length,
    official_non_targets_unchanged: nonTargets.length,
    protected_checks: protectedChecks,
    backup_path: backupPath,
    backup_sha256: backupHash,
  };
}

export async function runRollback({ client, backupPath, apply }) {
  if (!existsSync(backupPath)) throw new Error("Rollback backup does not exist.");
  const backupBytes = readFileSync(backupPath);
  const backup = validateBackup(JSON.parse(backupBytes));
  const [targetState, baseState, attempts] = await Promise.all([
    fetchAll(client, "sat_questions", TARGET_COLUMNS),
    fetchAll(client, "sat_questions", BASE_COLUMNS),
    fetchAll(client, "sat_attempts", ATTEMPT_COLUMNS),
  ]);
  if (targetState.length !== EXPECTED_QUESTION_COUNT) throw new Error("Rollback preflight row count mismatch.");
  const byId = new Map(targetState.map((row) => [row.id, row]));
  const absent = backup.rows.filter((row) => !byId.has(row.id));
  if (absent.length) throw new Error(`${absent.length} rollback IDs are absent.`);
  const backupIds = new Set(backup.rows.map((row) => row.id));
  const nonTargets = targetState.filter((row) => !backupIds.has(row.id));
  const protectedHashes = {
    non_targets: hashRows(nonTargets),
    base_columns: hashRows(baseState),
    sat_attempts: hashRows(attempts),
  };
  if (
    nonTargets.length !== EXPECTED_OFFICIAL_COUNT ||
    Object.keys(protectedHashes).some((key) => protectedHashes[key] !== backup.protected_hashes[key])
  ) {
    throw new Error("Rollback refused because protected database state changed after the backup.");
  }
  const conflicts = backup.rows.filter((row) => byId.get(row.id).explanation_en !== row.imported_explanation_en);
  if (conflicts.length) throw new Error(`${conflicts.length} rollback targets no longer equal the imported text.`);
  if (!apply) {
    return {
      mode: "rollback-dry-run",
      status: "ready",
      project_ref: EXPECTED_PROJECT_REF,
      backup_sha256: sha256(backupBytes),
      would_restore: backup.rows.length,
      writes: 0,
    };
  }
  const result = await rollbackRecords({
    rows: backup.rows,
    restoreExplanation: (row) => restoreExplanation(client, row),
  });
  const [after, baseAfter, attemptsAfter] = await Promise.all([
    fetchAll(client, "sat_questions", TARGET_COLUMNS),
    fetchAll(client, "sat_questions", BASE_COLUMNS),
    fetchAll(client, "sat_attempts", ATTEMPT_COLUMNS),
  ]);
  const afterById = new Map(after.map((row) => [row.id, row]));
  const exact = backup.rows.filter((row) => afterById.get(row.id)?.explanation_en === row.explanation_en).length;
  const nonTargetsAfter = after.filter((row) => !backupIds.has(row.id));
  if (
    exact !== EXPECTED_AUTHORED_COUNT ||
    hashRows(nonTargetsAfter) !== backup.protected_hashes.non_targets ||
    hashRows(baseAfter) !== backup.protected_hashes.base_columns ||
    hashRows(attemptsAfter) !== backup.protected_hashes.sat_attempts
  ) {
    throw new Error("Rollback post-state verification failed.");
  }
  return {
    mode: "rollback",
    status: "verified",
    project_ref: EXPECTED_PROJECT_REF,
    restored: result.restored,
    explanations_present: after.filter((row) => row.explanation_en !== null).length,
    explanations_missing: after.filter((row) => row.explanation_en === null).length,
    backup_sha256: sha256(backupBytes),
  };
}

// clientFactory yalniz cevrimdisi testler icindir (sahte istemci; hedef kilidi yine calisir).
export async function main(argv = process.argv.slice(2), { clientFactory } = {}) {
  const options = parseArgs(argv);
  const client = createImportClient({ mode: options.mode, projectRef: options.projectRef, clientFactory });
  if (options.rollback) return runRollback({ client, backupPath: options.rollback, apply: options.apply });
  const canonical = readCanonicalPackage(options.input);
  if (!options.apply) return (await runDryRun({ client, canonical })).summary;
  return runApply({ client, canonical, backupPath: options.backup });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(`SAT authored explanation import failed: ${error.message ?? error}`);
      process.exitCode = 1;
    });
}
