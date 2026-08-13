import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(import.meta.dirname, "../..");
const DEFAULT_INPUT = resolve(ROOT, "tmp/sat-bank/explanations-en/package/explanations-en.json");
const PAGE_SIZE = 500;
const WRITE_CHUNK_SIZE = 100;
const BASE_COLUMNS =
  "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,explanation_tr,source_file,needs_review,created_at";
const TARGET_COLUMNS = "id,explanation_en,needs_review";
const ATTEMPT_COLUMNS = "id,user_id,question_id,selected_answer,is_correct,answered_at";

function parseArgs(args) {
  const options = { apply: false, input: DEFAULT_INPUT, backupDir: resolve(ROOT, "tmp/sat-bank/explanations-backups"), rollback: null };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--input" && args[index + 1]) options.input = resolve(process.cwd(), args[++index]);
    else if (arg === "--backup-dir" && args[index + 1]) options.backupDir = resolve(process.cwd(), args[++index]);
    else if (arg === "--rollback" && args[index + 1]) options.rollback = resolve(process.cwd(), args[++index]);
    else if (arg === "--help") {
      console.log("Usage: node scripts/sat/import-explanations.mjs [--input path] [--backup-dir path] [--apply] | --rollback backup.json [--apply]");
      process.exit(0);
    } else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return options;
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
    report({ mode: "rollback-dry-run", status: "ready", backup_sha256: sha256(readFileSync(options.rollback)), would_restore: 806, writes: 0 });
    return;
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
  report({ mode: "rollback", status: "verified", restored: exact, base_columns_hash_unchanged: true, sat_attempts_hash_unchanged: true });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function loadEnvLocal() {
  const env = {};
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return env;
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

function createServiceClient() {
  const env = { ...loadEnvLocal(), ...process.env };
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required server-side.");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

function hashRows(rows) {
  return sha256(stableJson([...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)))));
}

function report(summary) {
  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const client = createServiceClient();
  if (options.rollback) return rollback(client, options);
  const canonical = readCanonical(options.input);
  let targetRows;
  try {
    targetRows = await fetchAll(client, TARGET_COLUMNS);
  } catch (error) {
    if (!options.apply && /explanation_en/i.test(error.message ?? "")) {
      report({ mode: "dry-run", status: "schema-prerequisite-missing", checksum_files: canonical.checksumFiles, canonical_records: 806, writes: 0 });
      return;
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
    report({
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
    });
    return;
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
  report({
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
  });
}

main().catch((error) => {
  console.error(`SAT explanation import failed: ${error.message ?? error}`);
  process.exit(1);
});
