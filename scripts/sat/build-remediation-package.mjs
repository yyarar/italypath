import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EXPECTED_PROJECT_REF } from "./lib/authored-explanations-import.mjs";
import { normalizeChoices } from "./lib/question-patch.mjs";

// CLI: node scripts/sat/build-remediation-package.mjs --run <runAdi>
// Yalniz gate-report'ta "pass" olan taslaklar paketlenir; expected_before guncel yedekten gelir.
const runIndex = process.argv.indexOf("--run");
if (runIndex === -1 || !process.argv[runIndex + 1]) throw new Error("--run <etiket> zorunlu");
const run = process.argv[runIndex + 1];
const runDir = path.resolve(import.meta.dirname, "../../tmp/sat-bank/remediation", run);

const { drafts } = JSON.parse(readFileSync(path.join(runDir, "drafts.json"), "utf8"));
const { results } = JSON.parse(readFileSync(path.join(runDir, "gate-report.json"), "utf8"));
const { rows } = JSON.parse(readFileSync(path.join(runDir, "live-backup.json"), "utf8"));
const passIds = new Set(results.filter((r) => r.status === "pass").map((r) => r.id));
const liveById = new Map(rows.map((row) => [row.id, row]));

const records = drafts.filter((d) => passIds.has(d.id)).map((draft) => {
  const live = liveById.get(draft.id);
  return {
    id: draft.id,
    expected_before: {
      prompt: live.prompt, choices: normalizeChoices(live.choices),
      needs_review: live.needs_review, correct_answer: live.correct_answer,
    },
    after: { prompt: draft.prompt, choices: normalizeChoices(draft.choices), needs_review: false },
  };
});
if (records.length === 0) throw new Error("Paketlenecek pass kaydi yok.");
const pkg = { kind: "sat-question-patch", schema_version: 1, project_ref: EXPECTED_PROJECT_REF, run_label: `remediation-${run}`, records };
writeFileSync(path.join(runDir, "remediation-package.json"), JSON.stringify(pkg, null, 2) + "\n");
console.log(`remediation-package.json yazildi: ${records.length} kayit`);
