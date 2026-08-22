import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyRecords,
  buildBackup,
  readCanonicalPackage,
  rollbackRecords,
  sha256,
  stableJson,
  validateLiveState,
} from "./lib/authored-explanations-import.mjs";
import {
  restoreExplanation,
  runApply,
  runDryRun,
  runRollback,
  writeExplanation,
} from "./import-authored-explanations.mjs";

const packageDir = path.resolve("tmp/sat-bank/authored-explanations-en/package");
const inputPath = path.join(packageDir, "explanations-en.json");

function makeLiveRows(records) {
  const targets = records.map((row) => ({ id: row.id, explanation_en: null, needs_review: false }));
  const nonTargets = Array.from({ length: 806 }, (_, index) => ({
    id: `official-${String(index).padStart(3, "0")}`,
    explanation_en: `Existing official explanation ${index}.`,
    needs_review: false,
  }));
  return [...targets, ...nonTargets];
}

function createMemoryClient({ questions, attempts = [] }) {
  const tables = { sat_questions: questions, sat_attempts: attempts };
  return {
    from(table) {
      const state = { table, mode: "select", columns: "*", filters: [], from: 0, to: Number.MAX_SAFE_INTEGER, payload: null };
      const query = {
        select(columns) {
          state.columns = columns;
          return query;
        },
        update(payload) {
          state.mode = "update";
          state.payload = payload;
          return query;
        },
        eq(column, value) {
          state.filters.push((row) => row[column] === value);
          return query;
        },
        is(column, value) {
          state.filters.push((row) => row[column] === value);
          return query;
        },
        order() {
          return query;
        },
        range(from, to) {
          state.from = from;
          state.to = to;
          return query;
        },
        then(resolve) {
          let rows = tables[state.table].filter((row) => state.filters.every((filter) => filter(row)));
          if (state.mode === "update") {
            for (const row of rows) Object.assign(row, state.payload);
          }
          rows = rows
            .sort((left, right) => String(left.id).localeCompare(String(right.id)))
            .slice(state.from, state.to + 1)
            .map((row) => {
              const columns = state.columns.split(",").map((column) => column.trim());
              return Object.fromEntries(columns.map((column) => [column, row[column] ?? null]));
            });
          resolve({ data: rows, error: null });
        },
      };
      return query;
    },
  };
}

test("stableJson and sha256 provide a canonical content hash", () => {
  assert.equal(stableJson({ b: 2, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":2}');
  assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("readCanonicalPackage accepts the reviewed 213-record package", () => {
  const canonical = readCanonicalPackage(inputPath);
  assert.equal(canonical.records.length, 213);
  assert.equal(canonical.targetIds.length, 213);
  assert.equal(canonical.qa.status, "passed");
  assert.match(canonical.canonicalHash, /^[a-f0-9]{64}$/);
  assert.match(canonical.packageHash, /^[a-f0-9]{64}$/);
});

test("readCanonicalPackage rejects a tampered checksummed file", () => {
  const tamperedDir = mkdtempSync(path.join(tmpdir(), "sat-authored-tampered-"));
  cpSync(packageDir, tamperedDir, { recursive: true });
  const tamperedInput = path.join(tamperedDir, "explanations-en.json");
  writeFileSync(tamperedInput, `${readFileSync(tamperedInput, "utf8")} `);
  assert.throws(() => readCanonicalPackage(tamperedInput), /Checksum mismatch/);
});

test("validateLiveState requires 1,019 rows and the exact null target set", () => {
  const canonical = readCanonicalPackage(inputPath);
  const allRows = makeLiveRows(canonical.records);
  assert.equal(validateLiveState({ allRows, canonicalRecords: canonical.records }).toChange.length, 213);
  assert.throws(() => validateLiveState({ allRows: allRows.slice(1), canonicalRecords: canonical.records }), /1019/);
  const oneTargetAbsent = allRows.map((row) =>
    row.id === canonical.records[0].id
      ? { id: "unexpected-extra-row", explanation_en: "unrelated", needs_review: false }
      : row
  );
  assert.throws(
    () => validateLiveState({ allRows: oneTargetAbsent, canonicalRecords: canonical.records }),
    /absent/
  );
  const nonNull = allRows.map((row) =>
    row.id === canonical.records[0].id ? { ...row, explanation_en: "unexpected existing text" } : row
  );
  assert.throws(() => validateLiveState({ allRows: nonNull, canonicalRecords: canonical.records }), /non-null/);
});

test("buildBackup records the exact rollback and protected-state contract", () => {
  const canonical = readCanonicalPackage(inputPath);
  const currentRows = canonical.records.map((row) => ({ id: row.id, explanation_en: null }));
  const backup = buildBackup({
    currentRows,
    canonicalRecords: canonical.records,
    canonicalHash: canonical.canonicalHash,
    packageHash: canonical.packageHash,
    projectRef: "kskbnxxyviowmrlskwke",
    protectedHashes: { non_targets: "a".repeat(64), base_columns: "b".repeat(64), sat_attempts: "c".repeat(64) },
    createdAt: "2026-08-22T10:00:00.000Z",
  });
  assert.equal(backup.rows.length, 213);
  assert.equal(backup.rows[0].explanation_en, null);
  assert.equal(typeof backup.rows[0].imported_explanation_en, "string");
  assert.equal(backup.project_ref, "kskbnxxyviowmrlskwke");
  assert.equal(backup.protected_hashes.base_columns, "b".repeat(64));
});

test("applyRecords rolls back every changed row after a partial failure", async () => {
  const canonical = readCanonicalPackage(inputPath);
  const records = canonical.records.slice(0, 4);
  const store = new Map(records.map((row) => [row.id, null]));
  let writes = 0;
  await assert.rejects(
    applyRecords({
      records,
      writeExplanation: async ({ id, explanation_en }) => {
        writes += 1;
        if (writes === 3) throw new Error("injected write failure");
        if (store.get(id) !== null) return false;
        store.set(id, explanation_en);
        return true;
      },
      restoreExplanation: async ({ id, imported_explanation_en, explanation_en }) => {
        if (store.get(id) !== imported_explanation_en) return false;
        store.set(id, explanation_en);
        return true;
      },
    }),
    /rolled back 2\/2/
  );
  assert.deepEqual([...store.values()], [null, null, null, null]);
});

test("rollbackRecords restores only rows that still equal the imported text", async () => {
  const canonical = readCanonicalPackage(inputPath);
  const rows = canonical.records.slice(0, 3).map((row) => ({
    id: row.id,
    explanation_en: null,
    imported_explanation_en: row.explanation_en,
  }));
  const store = new Map(rows.map((row) => [row.id, row.imported_explanation_en]));
  store.set(rows[2].id, "concurrent external edit");

  await assert.rejects(
    rollbackRecords({
      rows,
      restoreExplanation: async ({ id, imported_explanation_en, explanation_en }) => {
        if (store.get(id) !== imported_explanation_en) return false;
        store.set(id, explanation_en);
        return true;
      },
    }),
    /1 row/
  );
  assert.equal(store.get(rows[0].id), null);
  assert.equal(store.get(rows[1].id), null);
  assert.equal(store.get(rows[2].id), "concurrent external edit");
});

test("runDryRun reports readiness without changing any explanation", async () => {
  const canonical = readCanonicalPackage(inputPath);
  const questions = makeLiveRows(canonical.records);
  const before = stableJson(questions);
  const attempts = Array.from({ length: 63 }, (_, index) => ({
    id: `attempt-${index}`,
    user_id: "user-1",
    question_id: canonical.records[0].id,
    selected_answer: ["A"],
    is_correct: true,
    answered_at: "2026-08-21T12:00:00.000Z",
  }));
  const client = createMemoryClient({ questions, attempts });

  const result = await runDryRun({ client, canonical });

  assert.equal(result.summary.status, "ready");
  assert.equal(result.summary.sat_questions, 1019);
  assert.equal(result.summary.package_records, 213);
  assert.equal(result.summary.target_rows_null, 213);
  assert.equal(result.summary.official_non_targets_unchanged, 806);
  assert.equal(result.summary.sat_attempts, 63);
  assert.equal(result.summary.writes, 0);
  assert.equal(stableJson(questions), before);
});

test("writeExplanation and restoreExplanation enforce expected live text", async () => {
  const row = { id: "target-001", explanation_en: null, needs_review: false };
  const client = createMemoryClient({ questions: [row] });

  assert.equal(await writeExplanation(client, { id: row.id, explanation_en: "Imported explanation." }), true);
  assert.equal(row.explanation_en, "Imported explanation.");
  assert.equal(await writeExplanation(client, { id: row.id, explanation_en: "Second explanation." }), false);
  assert.equal(row.explanation_en, "Imported explanation.");
  assert.equal(
    await restoreExplanation(client, {
      id: row.id,
      explanation_en: null,
      imported_explanation_en: "Imported explanation.",
    }),
    true
  );
  assert.equal(row.explanation_en, null);
  row.explanation_en = "concurrent external edit";
  assert.equal(
    await restoreExplanation(client, {
      id: row.id,
      explanation_en: null,
      imported_explanation_en: "Imported explanation.",
    }),
    false
  );
  assert.equal(row.explanation_en, "concurrent external edit");
});

test("runApply writes 213 rows with a mode-0600 backup and runRollback restores them", async () => {
  const canonical = readCanonicalPackage(inputPath);
  const questions = makeLiveRows(canonical.records);
  const attempts = Array.from({ length: 3 }, (_, index) => ({
    id: `attempt-${index}`,
    user_id: "user-1",
    question_id: canonical.records[index].id,
    selected_answer: ["A"],
    is_correct: true,
    answered_at: "2026-08-21T12:00:00.000Z",
  }));
  const client = createMemoryClient({ questions, attempts });
  const backupPath = path.join(mkdtempSync(path.join(tmpdir(), "sat-authored-apply-test-")), "backup.json");

  const applied = await runApply({ client, canonical, backupPath });

  assert.equal(applied.status, "verified");
  assert.equal(applied.changed, 213);
  assert.equal(applied.exact_matches, 213);
  assert.equal(applied.explanations_missing, 0);
  assert.equal(statSync(backupPath).mode & 0o777, 0o600);
  const rollbackDryRun = await runRollback({ client, backupPath, apply: false });
  assert.equal(rollbackDryRun.would_restore, 213);
  assert.equal(rollbackDryRun.writes, 0);
  const rolledBack = await runRollback({ client, backupPath, apply: true });
  assert.equal(rolledBack.restored, 213);
  assert.equal(rolledBack.explanations_missing, 213);
  assert.equal(questions.filter((row) => row.id.startsWith("official-") && row.explanation_en !== null).length, 806);
});

test("runRollback refuses when a protected non-target explanation changed after backup", async () => {
  const canonical = readCanonicalPackage(inputPath);
  const questions = makeLiveRows(canonical.records);
  const client = createMemoryClient({ questions, attempts: [] });
  const backupPath = path.join(mkdtempSync(path.join(tmpdir(), "sat-authored-rollback-guard-test-")), "backup.json");
  await runApply({ client, canonical, backupPath });
  questions.find((row) => row.id === "official-000").explanation_en = "concurrent protected edit";

  await assert.rejects(runRollback({ client, backupPath, apply: false }), /protected/i);
});
