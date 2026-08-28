import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { normalizeChoices, validatePackage } from "./lib/question-patch.mjs";
import { EXPECTED_PROJECT_REF } from "./lib/authored-explanations-import.mjs";

// CLI: node scripts/sat/apply-patch-to-local.mjs --package <path>
const pkgIndex = process.argv.indexOf("--package");
if (pkgIndex === -1 || !process.argv[pkgIndex + 1]) throw new Error("--package <path> zorunlu");
const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const OUT_ROOT = path.join(REPO_ROOT, "tmp", "sat-bank");
const shardDir = path.join(OUT_ROOT, "math-questions");

const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), process.argv[pkgIndex + 1]), "utf8"));
validatePackage(pkg, EXPECTED_PROJECT_REF);
const byId = new Map(pkg.records.map((r) => [r.id, r]));
const applied = new Set();

for (const file of readdirSync(shardDir).filter((f) => f.endsWith(".json"))) {
  const shardPath = path.join(shardDir, file);
  const shard = JSON.parse(readFileSync(shardPath, "utf8"));
  let changed = false;
  for (const question of shard) {
    const record = byId.get(question.id);
    if (!record) continue;
    question.prompt = record.after.prompt;
    question.choices = record.after.choices === null ? null : normalizeChoices(record.after.choices);
    question.needs_review = record.after.needs_review;
    applied.add(question.id);
    changed = true;
  }
  if (changed) writeFileSync(shardPath, JSON.stringify(shard, null, 2) + "\n");
}

const missing = pkg.records.filter((r) => !applied.has(r.id));
if (missing.length > 0) throw new Error(`Shard'da bulunamayan id'ler: ${missing.map((r) => r.id).join(", ")}`);

// bank.json'u yeniden uret ve hedeflerin after ile esitligini dogrula
execFileSync("node", [path.join(REPO_ROOT, "scripts/sat/validate-bank.mjs")], { stdio: "inherit", cwd: REPO_ROOT });
const { bank } = JSON.parse(readFileSync(path.join(OUT_ROOT, "bank.json"), "utf8"));
const bankById = new Map(bank.map((q) => [q.id, q]));
for (const record of pkg.records) {
  const q = bankById.get(record.id);
  if (!q) throw new Error(`bank.json'da yok: ${record.id}`);
  const ok = q.prompt === record.after.prompt &&
    JSON.stringify(normalizeChoices(q.choices)) === JSON.stringify(record.after.choices === null ? null : normalizeChoices(record.after.choices)) &&
    Boolean(q.needs_review) === record.after.needs_review;
  if (!ok) throw new Error(`bank.json after ile eslesmiyor: ${record.id}`);
}
console.log(`Yerel senkron tamam: ${applied.size} kayit shard + bank.json guncellendi.`);
