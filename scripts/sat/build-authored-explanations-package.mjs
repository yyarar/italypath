import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_COUNT = 213;
const EXPECTED_PROVENANCE = "italypath-authored-from-formatted-answer-key";
const JSON_NAMES = ["explanations-en.json", "qa-report.json", "run-manifest.json", "target-ids.json"];

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function validatePackage({ final, qa, manifest }) {
  if (final?.schema_version !== 1 || final?.status !== "reviewed") {
    throw new Error("Final authored explanation wrapper is not reviewed.");
  }
  if (final.provenance !== EXPECTED_PROVENANCE || manifest?.provenance !== EXPECTED_PROVENANCE) {
    throw new Error("Authored explanation provenance mismatch.");
  }
  if (!Array.isArray(final.records) || final.records.length !== EXPECTED_COUNT) {
    throw new Error(`Expected exactly ${EXPECTED_COUNT} authored explanation records.`);
  }
  const ids = final.records.map((row) => row.id);
  if (new Set(ids).size !== EXPECTED_COUNT || ids.some((id) => typeof id !== "string" || id.length === 0)) {
    throw new Error(`Expected ${EXPECTED_COUNT} unique, nonempty target IDs.`);
  }
  if (
    final.records.some(
      (row) =>
        typeof row.explanation_en !== "string" ||
        row.explanation_en.trim().length < 25 ||
        row.needs_review !== false ||
        row.review_note !== null
    )
  ) {
    throw new Error("Authored explanation text or review-state invariant failed.");
  }
  if (
    qa?.status !== "passed" ||
    qa.record_count !== EXPECTED_COUNT ||
    qa.unique_id_count !== EXPECTED_COUNT ||
    qa.open_review_count !== 0 ||
    qa.computed_answer_mismatch_count !== 0 ||
    !qa.checks ||
    Object.values(qa.checks).some((value) => value !== true)
  ) {
    throw new Error("QA report is not a clean 213-record acceptance.");
  }
  if (
    manifest?.status !== "complete" ||
    manifest.target_count !== EXPECTED_COUNT ||
    !Array.isArray(manifest.network_or_database_writes) ||
    manifest.network_or_database_writes.length !== 0 ||
    Number.isNaN(Date.parse(manifest.completed_at))
  ) {
    throw new Error("Staging run manifest is incomplete or unsafe.");
  }
}

export function buildPackage({ finalPath, qaPath, manifestPath, outDir }) {
  for (const file of [finalPath, qaPath, manifestPath]) {
    if (!existsSync(file)) throw new Error(`Required staging artifact is missing: ${file}`);
  }
  const finalBytes = readFileSync(finalPath);
  const qaBytes = readFileSync(qaPath);
  const manifestBytes = readFileSync(manifestPath);
  const final = JSON.parse(finalBytes);
  const qa = JSON.parse(qaBytes);
  const manifest = JSON.parse(manifestBytes);
  validatePackage({ final, qa, manifest });

  const payload = final.records
    .map(({ id, explanation_en, needs_review, review_note }) => ({ id, explanation_en, needs_review, review_note }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const targetIds = payload.map((row) => row.id);
  const packageManifest = {
    schema_version: 1,
    run: "sat-authored-explanations-en-213-import",
    status: "ready_for_import",
    provenance: EXPECTED_PROVENANCE,
    completed_at: manifest.completed_at,
    target_count: EXPECTED_COUNT,
    source_artifacts: {
      explanations_en_213_sha256: sha256(finalBytes),
      qa_report_213_sha256: sha256(qaBytes),
      run_manifest_213_sha256: sha256(manifestBytes),
    },
  };

  mkdirSync(outDir, { recursive: true });
  writeJson(path.join(outDir, "explanations-en.json"), payload);
  writeJson(path.join(outDir, "target-ids.json"), targetIds);
  writeJson(path.join(outDir, "qa-report.json"), qa);
  writeJson(path.join(outDir, "run-manifest.json"), packageManifest);

  const checksumText = JSON_NAMES.map((name) => {
    const digest = sha256(readFileSync(path.join(outDir, name)));
    return `${digest}  ${name}`;
  }).join("\n");
  writeFileSync(path.join(outDir, "SHA256SUMS"), `${checksumText}\n`, "utf8");

  return {
    status: "passed",
    records: payload.length,
    checksumFiles: JSON_NAMES.length,
    payloadSha256: sha256(readFileSync(path.join(outDir, "explanations-en.json"))),
    outDir,
  };
}

function parseArgs(argv) {
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const stagingRoot = path.join(repoRoot, "tmp/sat-bank/authored-explanations-en");
  const options = {
    finalPath: path.join(stagingRoot, "explanations-en-213.json"),
    qaPath: path.join(stagingRoot, "qa-report-213.json"),
    manifestPath: path.join(stagingRoot, "run-manifest-213.json"),
    outDir: path.join(stagingRoot, "package"),
  };
  const flags = new Map([
    ["--final", "finalPath"],
    ["--qa", "qaPath"],
    ["--manifest", "manifestPath"],
    ["--out-dir", "outDir"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const key = flags.get(argv[index]);
    if (!key || !argv[index + 1]) throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
    options[key] = path.resolve(process.cwd(), argv[index + 1]);
    index += 1;
  }
  return options;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    console.log(JSON.stringify(buildPackage(parseArgs(process.argv.slice(2))), null, 2));
  } catch (error) {
    console.error(`Authored explanation package build failed: ${error.message ?? error}`);
    process.exitCode = 1;
  }
}
