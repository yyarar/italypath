import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { OUT_ROOT, readJson, writeJson } from "./lib.mjs";

const LETTER = /^[A-D]$/;
const NUMERIC = /^-?\d+(?:\.\d+)?(?:\/\d+)?$/;
const failures = [];
const warnings = [];

const { answers, missingKeys } = readJson(join(OUT_ROOT, "answers.json"));
// RW cikarma ertelendi (Kerem 2026-07-03); dosya yoksa bos kabul et
const rwPath = join(OUT_ROOT, "rw-questions.json");
const rw = existsSync(rwPath) ? readJson(rwPath).questions : [];
const mathManifest = readJson(join(OUT_ROOT, "math-manifest.json")).manifest;

const mathDir = join(OUT_ROOT, "math-questions");
const math = existsSync(mathDir)
  ? readdirSync(mathDir).filter((f) => f.endsWith(".json")).flatMap((f) => readJson(join(mathDir, f)))
  : [];

const all = [...rw, ...math];
const seen = new Set();
const excluded = [];
const bank = [];

// Eksik anahtar dosyasının soruları hangi source_file'a denk geliyor?
const missingKeySources = new Set(missingKeys.map((k) => `${k}.pdf`));

for (const q of all) {
  if (seen.has(q.id)) { failures.push(`Tekrarli id: ${q.id}`); continue; }
  seen.add(q.id);

  for (const field of ["id", "section", "domain", "skill", "skill_slug", "difficulty", "question_type", "prompt", "source_file"]) {
    if (q[field] === undefined || q[field] === null || q[field] === "") failures.push(`${q.id}: ${field} eksik`);
  }

  if (q.question_type === "mcq") {
    const keys = Object.keys(q.choices ?? {});
    if (keys.sort().join("") !== "ABCD") failures.push(`${q.id}: mcq ama 4 sik yok`);
    else if (Object.values(q.choices).some((c) => !String(c).trim())) failures.push(`${q.id}: bos sik metni`);
  } else if (q.question_type === "spr") {
    if (q.choices) failures.push(`${q.id}: spr ama choices dolu`);
  } else {
    failures.push(`${q.id}: gecersiz question_type ${q.question_type}`);
  }

  const key = answers[q.id];
  if (!key) {
    if (missingKeySources.has(q.source_file)) { excluded.push(q.id); continue; }
    failures.push(`${q.id}: cevap anahtari yok (${q.source_file})`);
    continue;
  }
  if (q.question_type === "mcq" && !(key.answer.length === 1 && LETTER.test(key.answer[0]))) {
    failures.push(`${q.id}: mcq ama anahtar harf degil (${key.answer.join(",")})`);
    continue;
  }
  if (q.question_type === "spr" && !key.answer.every((a) => NUMERIC.test(a))) {
    failures.push(`${q.id}: spr ama anahtar sayisal degil (${key.answer.join(",")})`);
    continue;
  }
  // Para isaretleri \$ ile kacisli olmali; kacissiz $ sayisi cift degilse LaTeX bozuk demektir
  const texts = [q.prompt, ...(q.choices ? Object.values(q.choices) : [])];
  for (const t of texts) {
    if (((String(t).replaceAll("\\$", "").match(/\$/g) ?? []).length % 2) !== 0) {
      failures.push(`${q.id}: dengesiz $ (para icin \\$ kullanilmali)`);
    }
  }

  if (q.figure && !q.figure_path) warnings.push(`${q.id}: figure var ama kirpilmamis (once crop-figures calistir)`);
  if (q.figure_path && !existsSync(join(OUT_ROOT, q.figure_path))) failures.push(`${q.id}: figure_path dosyasi yok`);

  bank.push({ ...q, correct_answer: key.answer, figure: undefined });
}

// Sayı mutabakatı
const expectedMath = mathManifest.length;
const gotMathIds = new Set(math.map((q) => q.id));
const missingMath = mathManifest.filter((m) => !gotMathIds.has(m.id)).length;
console.log(`RW: ${rw.length} | Math extract: ${math.length}/${expectedMath} (eksik ${missingMath})`);
console.log(`Bank: ${bank.length} soru | Import disi (eksik anahtar): ${excluded.length}`);
console.log(`needs_review: ${bank.filter((q) => q.needs_review).length}`);
console.log(`HATA: ${failures.length} | UYARI: ${warnings.length}`);
for (const f of failures.slice(0, 30)) console.log(`  FAIL ${f}`);
for (const w of warnings.slice(0, 10)) console.log(`  WARN ${w}`);

writeJson(join(OUT_ROOT, "bank.json"), { bank, excluded, failures, warnings });
process.exitCode = failures.length > 0 ? 1 : 0;
