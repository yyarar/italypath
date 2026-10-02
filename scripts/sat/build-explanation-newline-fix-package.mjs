// STATUS #99 (2026-10-02): 10 SAT aciklamasinda satir sonu yerine harf olarak yazilmis `\n`.
// Bu betik canli bankayi YALNIZ OKUR ve patch-sat-questions.mjs icin duzeltme paketini kurar;
// veritabanina yazmaz. Paket Git disi tmp/ altina yazilir (soru icerigi depoya girmez).
//
// Kullanim:
//   node scripts/sat/build-explanation-newline-fix-package.mjs
// Sonra:
//   node scripts/sat/patch-sat-questions.mjs --package <paket>                                  # kuru calistirma
//   node scripts/sat/patch-sat-questions.mjs --package <paket> --apply --project-ref kskbnxxyviowmrlskwke
//
// Cikti yalniz kimlik ve sayilardir; soru ya da aciklama metni yazdirilmaz.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { splitMathText } from "../../lib/sat/mathSegments.mjs";
import { LIVE_PROJECT_REF, createImportClient, parseImportArgs } from "../lib/program-details-import.mjs";
import {
  fixLiteralNewlineEscapes,
  hasUnbalancedDollar,
  katexIssues,
  literalNewlineEscapeCount,
  mathSegments,
} from "./lib/content-audit.mjs";
import { GUARD_FIELDS, validatePackage } from "./lib/question-patch.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const RUN_LABEL = "explanation-literal-newlines-2026-10-02";
const OUT_DIR = path.join(REPO_ROOT, "tmp/sat-bank/remediation", RUN_LABEL);
const ALL_COLUMNS =
  "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,explanation_tr,explanation_en,source_file,needs_review,created_at";
const PAGE_SIZE = 500;

// 2026-10-02 salt okuma sayimi: bu on soru, toplam 44 ham satir sonu, hepsi Circles konusunda.
const EXPECTED_IDS = [
  "2266984b", "2855cb58", "35d37640", "3e577e4a", "69b0d79d",
  "981275d2", "9e44284b", "c8345903", "ca2235f6", "fa2771d5",
];
const EXPECTED_TOTAL_ESCAPES = 44;

async function fetchAllRows(client) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("sat_questions")
      .select(ALL_COLUMNS)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`sat_questions fetch hatasi: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

// Eski site kurali (yalniz tek dolar). Cift dolar icermeyen her metinde yeni kural ayni sonucu vermeli.
function legacySplit(text) {
  return String(text)
    .replaceAll("\\$", "\u0000")
    .split(/(\$[^$]+\$)/g)
    .filter((part) => part !== "")
    .map((part) =>
      part.startsWith("$") && part.endsWith("$") && part.length > 2
        ? { kind: "inline", value: part.slice(1, -1).replaceAll("\u0000", "\\$") }
        : { kind: "text", value: part.replaceAll("\u0000", "$") }
    );
}

function rowTexts(row) {
  return [
    ["prompt", row.prompt],
    ...Object.entries(row.choices ?? {}).map(([key, value]) => [`choices.${key}`, value]),
    ["explanation_en", row.explanation_en],
    ["correct_answer", (row.correct_answer ?? []).join(", ")],
  ].filter(([, value]) => typeof value === "string" && value !== "");
}

// Formul kurali degisikliginin (STATUS #100) canli bankadaki etkisi: yalniz sayilar.
function formulaRuleReport(rows) {
  const report = {
    texts: 0,
    texts_with_display_formula: 0,
    display_formulas: 0,
    display_formula_rows: [],
    legacy_mismatch_without_display: [],
    katex_issues: [],
    unbalanced_dollar: [],
  };
  for (const row of rows) {
    for (const [field, text] of rowTexts(row)) {
      report.texts += 1;
      const segments = splitMathText(text);
      const displayCount = segments.filter((segment) => segment.kind === "display").length;
      if (displayCount > 0) {
        report.texts_with_display_formula += 1;
        report.display_formulas += displayCount;
        report.display_formula_rows.push(`${row.id}:${field}`);
      } else if (JSON.stringify(segments) !== JSON.stringify(legacySplit(text))) {
        report.legacy_mismatch_without_display.push(`${row.id}:${field}`);
      }
      if (katexIssues(text).length > 0) report.katex_issues.push(`${row.id}:${field}`);
      if (hasUnbalancedDollar(text)) report.unbalanced_dollar.push(`${row.id}:${field}`);
    }
  }
  return report;
}

function buildRecords(rows) {
  const affected = rows.filter((row) => literalNewlineEscapeCount(row.explanation_en) > 0);
  const affectedIds = affected.map((row) => row.id).sort();
  if (JSON.stringify(affectedIds) !== JSON.stringify([...EXPECTED_IDS].sort())) {
    throw new Error(`Etkilenen soru listesi beklenenle ayni degil: ${JSON.stringify(affectedIds)}`);
  }
  let total = 0;
  const perRow = [];
  const records = affected.map((row) => {
    const before = row.explanation_en;
    const after = fixLiteralNewlineEscapes(before);
    const count = literalNewlineEscapeCount(before);
    total += count;
    if (literalNewlineEscapeCount(after) !== 0) throw new Error(`${row.id}: duzeltme sonrasi ham satir sonu kaldi.`);
    if (JSON.stringify(mathSegments(after)) !== JSON.stringify(mathSegments(before))) {
      throw new Error(`${row.id}: duzeltme formullere dokundu; durduruldu.`);
    }
    if (after.length !== before.length - count) throw new Error(`${row.id}: beklenmeyen uzunluk farki.`);
    if (katexIssues(after).length > 0) throw new Error(`${row.id}: duzeltme sonrasi cizilemeyen formul var.`);
    if (/\\n(?![a-z])/.test(after.replace(/\\\\n/g, ""))) {
      throw new Error(`${row.id}: formul icinde de ham satir sonu olabilir; elle incele.`);
    }
    perRow.push({ id: row.id, skill: row.skill, literal_newlines: count });
    const expectedBefore = Object.fromEntries(GUARD_FIELDS.map((field) => [field, row[field]]));
    return {
      id: row.id,
      expected_before: { ...expectedBefore, explanation_en: before },
      after: { prompt: row.prompt, choices: row.choices, needs_review: row.needs_review, explanation_en: after },
    };
  });
  if (total !== EXPECTED_TOTAL_ESCAPES) throw new Error(`Toplam ${total} ham satir sonu bulundu; beklenen ${EXPECTED_TOTAL_ESCAPES}.`);
  return { records, perRow, total };
}

const options = parseImportArgs(process.argv.slice(2));
if (options.mode === "apply") throw new Error("Bu betik yazmaz; --apply yalniz patch-sat-questions.mjs icindir.");
const client = createImportClient({ mode: "dry-run", projectRef: options.projectRef ?? LIVE_PROJECT_REF });
const rows = await fetchAllRows(client);

const formulaRule = formulaRuleReport(rows);
const { records, perRow, total } = buildRecords(rows);
const pkg = {
  kind: "sat-question-patch",
  schema_version: 1,
  project_ref: LIVE_PROJECT_REF,
  run_label: RUN_LABEL,
  records,
};
validatePackage(pkg, LIVE_PROJECT_REF);

mkdirSync(OUT_DIR, { recursive: true });
const packagePath = path.join(OUT_DIR, "package.json");
if (existsSync(packagePath)) throw new Error(`Paket zaten var, ezilmez: ${packagePath}`);
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n", { encoding: "utf8", flag: "wx", mode: 0o600 });

console.log(
  JSON.stringify(
    {
      bank_rows: rows.length,
      formula_rule: formulaRule,
      newline_fix: { targets: records.length, literal_newlines: total, per_row: perRow },
      package_path: path.relative(REPO_ROOT, packagePath),
    },
    null,
    2
  )
);
