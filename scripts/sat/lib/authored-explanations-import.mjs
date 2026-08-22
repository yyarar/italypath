import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const EXPECTED_PROJECT_REF = "kskbnxxyviowmrlskwke";
export const EXPECTED_PROJECT_URL = `https://${EXPECTED_PROJECT_REF}.supabase.co`;
export const EXPECTED_QUESTION_COUNT = 1019;
export const EXPECTED_AUTHORED_COUNT = 213;
export const EXPECTED_OFFICIAL_COUNT = 806;
const EXPECTED_PROVENANCE = "italypath-authored-from-formatted-answer-key";
const CHECKSUM_FILES = ["explanations-en.json", "qa-report.json", "run-manifest.json", "target-ids.json"];

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashRows(rows) {
  return sha256(stableJson([...rows].sort((left, right) => String(left.id).localeCompare(String(right.id)))));
}

export function verifyChecksums(packageDir) {
  const checksumPath = path.join(packageDir, "SHA256SUMS");
  if (!existsSync(checksumPath)) throw new Error("SHA256SUMS is missing beside the import package.");
  const lines = readFileSync(checksumPath, "utf8").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== CHECKSUM_FILES.length) {
    throw new Error(`Expected ${CHECKSUM_FILES.length} checksum entries; found ${lines.length}.`);
  }
  const seen = new Set();
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64}) {2}([^/]+)$/);
    if (!match) throw new Error("Invalid SHA256SUMS format.");
    const [, expected, filename] = match;
    if (!CHECKSUM_FILES.includes(filename) || seen.has(filename)) {
      throw new Error(`Unexpected or duplicate checksum entry: ${filename}`);
    }
    const file = path.resolve(packageDir, filename);
    if (path.dirname(file) !== path.resolve(packageDir) || !existsSync(file)) {
      throw new Error(`Checksummed package file is missing: ${filename}`);
    }
    if (sha256(readFileSync(file)) !== expected) throw new Error(`Checksum mismatch: ${filename}`);
    seen.add(filename);
  }
  if (CHECKSUM_FILES.some((name) => !seen.has(name))) throw new Error("Checksum manifest is incomplete.");
  return lines.length;
}

export function validatePackage({ records, targetIds, qa, manifest }) {
  if (!Array.isArray(records) || records.length !== EXPECTED_AUTHORED_COUNT) {
    throw new Error(`Expected exactly ${EXPECTED_AUTHORED_COUNT} authored explanation records.`);
  }
  if (!Array.isArray(targetIds) || targetIds.length !== EXPECTED_AUTHORED_COUNT) {
    throw new Error(`Expected exactly ${EXPECTED_AUTHORED_COUNT} target IDs.`);
  }
  const recordIds = new Set(records.map((row) => row.id));
  const targetSet = new Set(targetIds);
  if (
    recordIds.size !== EXPECTED_AUTHORED_COUNT ||
    targetSet.size !== EXPECTED_AUTHORED_COUNT ||
    [...recordIds].some((id) => !targetSet.has(id)) ||
    [...targetSet].some((id) => !recordIds.has(id))
  ) {
    throw new Error("Canonical records and target IDs are not the same unique 213-ID set.");
  }
  const expectedKeys = ["explanation_en", "id", "needs_review", "review_note"];
  for (const row of records) {
    if (JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(expectedKeys)) {
      throw new Error(`Unexpected import payload keys for ${row.id ?? "unknown ID"}.`);
    }
    if (
      typeof row.id !== "string" ||
      typeof row.explanation_en !== "string" ||
      row.explanation_en.trim().length < 25 ||
      row.needs_review !== false ||
      row.review_note !== null
    ) {
      throw new Error(`Import payload invariant failed for ${row.id ?? "unknown ID"}.`);
    }
  }
  if (
    qa?.status !== "passed" ||
    qa.record_count !== EXPECTED_AUTHORED_COUNT ||
    qa.unique_id_count !== EXPECTED_AUTHORED_COUNT ||
    qa.open_review_count !== 0 ||
    qa.computed_answer_mismatch_count !== 0 ||
    !qa.checks ||
    Object.values(qa.checks).some((value) => value !== true)
  ) {
    throw new Error("QA report is not a clean 213-record acceptance.");
  }
  if (
    manifest?.status !== "ready_for_import" ||
    manifest.provenance !== EXPECTED_PROVENANCE ||
    manifest.target_count !== EXPECTED_AUTHORED_COUNT
  ) {
    throw new Error("Import package manifest is not ready for the authored scope.");
  }
}

export function readCanonicalPackage(inputPath) {
  const resolvedInput = path.resolve(inputPath);
  const packageDir = path.dirname(resolvedInput);
  const checksumFiles = verifyChecksums(packageDir);
  const records = JSON.parse(readFileSync(resolvedInput, "utf8"));
  const targetIds = JSON.parse(readFileSync(path.join(packageDir, "target-ids.json"), "utf8"));
  const qa = JSON.parse(readFileSync(path.join(packageDir, "qa-report.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(path.join(packageDir, "run-manifest.json"), "utf8"));
  validatePackage({ records, targetIds, qa, manifest });
  const sortedRecords = [...records].sort((left, right) => left.id.localeCompare(right.id));
  return {
    records: sortedRecords,
    targetIds: [...targetIds].sort(),
    qa,
    manifest,
    checksumFiles,
    canonicalHash: sha256(stableJson(sortedRecords.map(({ id, explanation_en }) => ({ id, explanation_en })))),
    packageHash: sha256(readFileSync(resolvedInput)),
  };
}

export function validateLiveState({ allRows, canonicalRecords }) {
  if (!Array.isArray(allRows) || allRows.length !== EXPECTED_QUESTION_COUNT) {
    throw new Error(`Expected ${EXPECTED_QUESTION_COUNT} sat_questions rows; found ${allRows?.length ?? 0}.`);
  }
  if (new Set(allRows.map((row) => row.id)).size !== EXPECTED_QUESTION_COUNT) {
    throw new Error("Live sat_questions IDs are not unique.");
  }
  const byId = new Map(allRows.map((row) => [row.id, row]));
  const absent = canonicalRecords.filter((row) => !byId.has(row.id));
  if (absent.length) throw new Error(`${absent.length} authored target IDs are absent from the live table.`);
  const targetRows = canonicalRecords.map((row) => byId.get(row.id));
  const nonNull = targetRows.filter((row) => row.explanation_en !== null);
  if (nonNull.length) throw new Error(`Refusing import because ${nonNull.length} target explanations are non-null.`);
  const targetSet = new Set(canonicalRecords.map((row) => row.id));
  const nonTargetRows = allRows.filter((row) => !targetSet.has(row.id));
  if (nonTargetRows.length !== EXPECTED_OFFICIAL_COUNT) {
    throw new Error(`Expected ${EXPECTED_OFFICIAL_COUNT} non-target rows; found ${nonTargetRows.length}.`);
  }
  return { targetRows, nonTargetRows, toChange: canonicalRecords };
}

export function buildBackup({
  currentRows,
  canonicalRecords,
  canonicalHash,
  packageHash,
  projectRef,
  protectedHashes,
  createdAt = new Date().toISOString(),
}) {
  if (projectRef !== EXPECTED_PROJECT_REF) throw new Error("Backup project ref mismatch.");
  if (!Array.isArray(currentRows) || currentRows.length !== EXPECTED_AUTHORED_COUNT) {
    throw new Error(`Backup requires ${EXPECTED_AUTHORED_COUNT} current target rows.`);
  }
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const rows = canonicalRecords.map((record) => {
    const current = currentById.get(record.id);
    if (!current) throw new Error(`Backup target is absent: ${record.id}`);
    return {
      id: record.id,
      explanation_en: current.explanation_en,
      imported_explanation_en: record.explanation_en,
    };
  });
  if (rows.some((row) => row.explanation_en !== null)) {
    throw new Error("First-run authored explanation backup must contain only null values.");
  }
  if (
    !protectedHashes ||
    [protectedHashes.non_targets, protectedHashes.base_columns, protectedHashes.sat_attempts].some(
      (value) => !/^[a-f0-9]{64}$/.test(value ?? "")
    )
  ) {
    throw new Error("Backup protected hashes are incomplete.");
  }
  return {
    schema_version: 1,
    kind: "sat-authored-explanations-before-apply",
    created_at: createdAt,
    project_ref: projectRef,
    canonical_sha256: canonicalHash,
    package_sha256: packageHash,
    target_count: EXPECTED_AUTHORED_COUNT,
    protected_hashes: protectedHashes,
    rows,
  };
}

export async function applyRecords({ records, writeExplanation, restoreExplanation, chunkSize = 25 }) {
  const changed = [];
  try {
    for (let offset = 0; offset < records.length; offset += chunkSize) {
      const chunk = records.slice(offset, offset + chunkSize);
      for (const row of chunk) {
        const wrote = await writeExplanation(row);
        if (wrote !== true) throw new Error(`Write precondition failed for ${row.id}.`);
        changed.push(row);
      }
    }
    return { changed: changed.length };
  } catch (error) {
    let restored = 0;
    for (const row of [...changed].reverse()) {
      const didRestore = await restoreExplanation({
        id: row.id,
        explanation_en: null,
        imported_explanation_en: row.explanation_en,
      }).catch(() => false);
      if (didRestore) restored += 1;
    }
    if (restored !== changed.length) {
      throw new Error(
        `${error.message ?? error}; automatic rollback incomplete: restored ${restored}/${changed.length}.`
      );
    }
    throw new Error(`${error.message ?? error}; automatic rollback completed: rolled back ${restored}/${changed.length}.`);
  }
}

export async function rollbackRecords({ rows, restoreExplanation }) {
  let restored = 0;
  const refused = [];
  for (const row of rows) {
    const didRestore = await restoreExplanation(row).catch(() => false);
    if (didRestore) restored += 1;
    else refused.push(row.id);
  }
  if (refused.length) {
    throw new Error(`Rollback refused for ${refused.length} row(s) whose live text changed; restored ${restored}/${rows.length}.`);
  }
  return { restored };
}
