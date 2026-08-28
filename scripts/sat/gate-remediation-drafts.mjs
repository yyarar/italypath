import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findMarkers, hasUnbalancedDollar, katexIssues, questionTexts } from "./lib/content-audit.mjs";
import { normalizeChoices } from "./lib/question-patch.mjs";

// CLI: node scripts/sat/gate-remediation-drafts.mjs --run <runAdi>
// Girdi: <runDir>/drafts.json + <runDir>/live-backup.json + tmp/sat-bank/answers.json
const runIndex = process.argv.indexOf("--run");
if (runIndex === -1 || !process.argv[runIndex + 1]) throw new Error("--run <etiket> zorunlu");
const run = process.argv[runIndex + 1];
const OUT_ROOT = path.resolve(import.meta.dirname, "../../tmp/sat-bank");
const runDir = path.join(OUT_ROOT, "remediation", run);

// lib/sat/answers.ts parseNumeric aynasi (SPR karsilastirmasi icin)
function parseNumeric(value) {
  const trimmed = String(value).trim().replace(",", ".");
  if (!trimmed) return null;
  const fraction = trimmed.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  return /^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed) ? Number(trimmed) : null;
}
const TOLERANCE = 1e-4;

const { drafts } = JSON.parse(readFileSync(path.join(runDir, "drafts.json"), "utf8"));
const { rows } = JSON.parse(readFileSync(path.join(runDir, "live-backup.json"), "utf8"));
const { answers } = JSON.parse(readFileSync(path.join(OUT_ROOT, "answers.json"), "utf8"));
const liveById = new Map(rows.map((row) => [row.id, row]));

const results = [];
for (const draft of drafts) {
  const failures = [];
  const live = liveById.get(draft.id);
  const official = answers[draft.id]?.answer;
  if (!live) failures.push("canli yedekte yok");
  if (!official) failures.push("resmi cevap anahtari yok");
  if (live && live.needs_review !== true) failures.push("karantinada degil (once karantina, sonra duzeltme)");

  if (live && official) {
    // 1) Yapisal sozlesme
    if (live.question_type === "mcq") {
      const choices = normalizeChoices(draft.choices);
      if (!choices || Object.values(choices).some((c) => !c.trim())) failures.push("mcq: 4 dolu sik yok");
    } else if (draft.choices !== null) {
      failures.push("spr: choices null olmali");
    }
    // 2) Marker + KaTeX + $ dengesi
    for (const text of questionTexts(draft)) {
      for (const hit of findMarkers(text)) failures.push(`marker: ${hit.family} (${hit.match})`);
      for (const issue of katexIssues(text)) failures.push(`katex: ${issue.message.slice(0, 80)}`);
      if (hasUnbalancedDollar(text)) failures.push("dengesiz $");
    }
    // 3) Kor cozucu resmi anahtari tutturmali
    if (live.question_type === "mcq") {
      if (String(draft.solver_answer).trim().toUpperCase() !== String(official[0]).toUpperCase()) {
        failures.push(`cozucu ${draft.solver_answer} dedi, resmi anahtar ${official[0]}`);
      }
    } else {
      const solved = parseNumeric(draft.solver_answer);
      const matches = official.some((a) => {
        const numeric = parseNumeric(a);
        return solved !== null && numeric !== null && Math.abs(numeric - solved) <= TOLERANCE;
      });
      if (!matches) failures.push(`cozucu ${draft.solver_answer} dedi, resmi anahtar ${official.join("|")}`);
    }
    // 4) Bozuk kayitla tamamen ayni kalmamali (yalniz sik bozuksa prompt ayni kalabilir)
    const sameChoices = JSON.stringify(normalizeChoices(draft.choices)) === JSON.stringify(normalizeChoices(live.choices));
    if (draft.prompt === live.prompt && sameChoices) failures.push("taslak canli bozuk kayitla birebir ayni; duzeltme yok");
  }
  results.push({ id: draft.id, status: failures.length ? "fail" : "pass", failures });
}

const passed = results.filter((r) => r.status === "pass").length;
writeFileSync(path.join(runDir, "gate-report.json"), JSON.stringify({ run, passed, failed: results.length - passed, results }, null, 2) + "\n");
console.log(`Gate: ${passed}/${results.length} PASS`);
if (passed !== results.length) {
  for (const r of results.filter((x) => x.status === "fail")) console.error(` FAIL ${r.id}: ${r.failures.join("; ")}`);
  process.exit(1);
}
