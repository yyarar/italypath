import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildPackage } from "./build-authored-explanations-package.mjs";

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixture(recordCount = 213) {
  const root = mkdtempSync(path.join(tmpdir(), "sat-authored-package-test-"));
  const records = Array.from({ length: recordCount }, (_, index) => ({
    id: `question-${String(recordCount - index).padStart(3, "0")}`,
    source_file: "Question Bank (Formatted)/Answers/Math/Test~Key.pdf",
    source_page: 1,
    source_question: `1.${index + 1}`,
    expected_answer: ["A"],
    computed_answer: ["A"],
    answer_match: true,
    visual_checked: false,
    explanation_en: `Choice A is correct. This is hand-checked fixture explanation number ${index + 1}.`,
    needs_review: false,
    review_note: null,
  }));
  const finalPath = path.join(root, "explanations-en-213.json");
  const qaPath = path.join(root, "qa-report-213.json");
  const manifestPath = path.join(root, "run-manifest-213.json");
  writeJson(finalPath, {
    schema_version: 1,
    status: "reviewed",
    provenance: "italypath-authored-from-formatted-answer-key",
    records,
  });
  writeJson(qaPath, {
    schema_version: 1,
    status: "passed",
    record_count: recordCount,
    unique_id_count: recordCount,
    open_review_count: 0,
    computed_answer_mismatch_count: 0,
    checks: { no_open_reviews: true },
  });
  writeJson(manifestPath, {
    schema_version: 1,
    run: "sat-authored-explanations-en-213",
    status: "complete",
    provenance: "italypath-authored-from-formatted-answer-key",
    completed_at: "2026-08-21T12:00:00.000Z",
    target_count: recordCount,
    network_or_database_writes: [],
  });
  return { root, finalPath, qaPath, manifestPath };
}

test("buildPackage emits a sorted, checksummed 213-record package", () => {
  const fixture = createFixture();
  const outDir = path.join(fixture.root, "package-a");

  const result = buildPackage({ ...fixture, outDir });

  assert.equal(result.records, 213);
  assert.equal(result.checksumFiles, 4);
  const payload = JSON.parse(readFileSync(path.join(outDir, "explanations-en.json"), "utf8"));
  assert.equal(payload.length, 213);
  assert.deepEqual(Object.keys(payload[0]), ["id", "explanation_en", "needs_review", "review_note"]);
  assert.equal(payload[0].id, "question-001");
  assert.equal(payload[212].id, "question-213");
  const checksums = readFileSync(path.join(outDir, "SHA256SUMS"), "utf8").trim().split("\n");
  assert.equal(checksums.length, 4);
  assert.ok(checksums.every((line) => /^[a-f0-9]{64}  (explanations-en|target-ids|qa-report|run-manifest)\.json$/.test(line)));
});

test("buildPackage is byte-deterministic across two output directories", () => {
  const fixture = createFixture();
  const outA = path.join(fixture.root, "package-a");
  const outB = path.join(fixture.root, "package-b");
  const names = ["explanations-en.json", "target-ids.json", "qa-report.json", "run-manifest.json", "SHA256SUMS"];

  buildPackage({ ...fixture, outDir: outA });
  buildPackage({ ...fixture, outDir: outB });

  for (const name of names) {
    assert.deepEqual(readFileSync(path.join(outA, name)), readFileSync(path.join(outB, name)), name);
  }
});

test("buildPackage rejects an incomplete 212-record package", () => {
  const fixture = createFixture(212);
  assert.throws(() => buildPackage({ ...fixture, outDir: path.join(fixture.root, "package") }), /213/);
});
