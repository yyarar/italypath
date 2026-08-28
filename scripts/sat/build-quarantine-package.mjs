import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EXPECTED_PROJECT_REF } from "./lib/authored-explanations-import.mjs";
import { normalizeChoices } from "./lib/question-patch.mjs";

// CLI: node scripts/sat/build-quarantine-package.mjs --run <runAdi>
const runIndex = process.argv.indexOf("--run");
if (runIndex === -1 || !process.argv[runIndex + 1]) throw new Error("--run <etiket> zorunlu");
const run = process.argv[runIndex + 1];
const runDir = path.resolve(import.meta.dirname, "../../tmp/sat-bank/remediation", run);

const { rows } = JSON.parse(readFileSync(path.join(runDir, "live-backup.json"), "utf8"));
const { candidates } = JSON.parse(readFileSync(path.join(runDir, "candidate-ids.json"), "utf8"));
const byId = new Map(rows.map((row) => [row.id, row]));

const records = [];
for (const candidate of candidates) {
  const row = byId.get(candidate.id);
  if (!row) throw new Error(`Aday yedekte yok: ${candidate.id}`);
  if (row.needs_review === true) continue; // zaten karantinada
  records.push({
    id: row.id,
    expected_before: {
      prompt: row.prompt, choices: normalizeChoices(row.choices),
      needs_review: false, correct_answer: row.correct_answer,
    },
    after: { prompt: row.prompt, choices: normalizeChoices(row.choices), needs_review: true },
  });
}

const pkg = { kind: "sat-question-patch", schema_version: 1, project_ref: EXPECTED_PROJECT_REF, run_label: `quarantine-${run}`, records };
writeFileSync(path.join(runDir, "quarantine-package.json"), JSON.stringify(pkg, null, 2) + "\n");
console.log(`quarantine-package.json yazildi: ${records.length} kayit`);
