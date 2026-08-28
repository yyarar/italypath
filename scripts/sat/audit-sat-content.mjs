import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { EXPECTED_PROJECT_REF, EXPECTED_PROJECT_URL } from "./lib/authored-explanations-import.mjs";
import { auditRow } from "./lib/content-audit.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const OUT_ROOT = path.join(REPO_ROOT, "tmp", "sat-bank");
const ALL_COLUMNS =
  "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,explanation_tr,explanation_en,source_file,needs_review,created_at";
const PAGE_SIZE = 500;

function parseArgs(argv) {
  const options = { run: null, local: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run" && argv[i + 1]) options.run = argv[++i];
    else if (argv[i] === "--local") options.local = true;
    else throw new Error(`Bilinmeyen arguman: ${argv[i]}`);
  }
  if (!options.run) throw new Error("--run <etiket> zorunlu (or. --run quarantine-baseline)");
  return options;
}

function loadEnvLocal() {
  const values = {};
  const envFile = path.join(REPO_ROOT, ".env.local");
  if (!existsSync(envFile)) return values;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return values;
}

async function fetchAllLive() {
  const env = { ...loadEnvLocal(), ...process.env };
  if (env.NEXT_PUBLIC_SUPABASE_URL !== EXPECTED_PROJECT_URL) {
    throw new Error("Beklenmeyen Supabase projesi; islem reddedildi.");
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY gerekli.");
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("sat_questions").select(ALL_COLUMNS).order("id").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`sat_questions fetch hatasi: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

function loadLocalBank() {
  const { bank } = JSON.parse(readFileSync(path.join(OUT_ROOT, "bank.json"), "utf8"));
  return bank;
}

const options = parseArgs(process.argv.slice(2));
const rows = options.local ? loadLocalBank() : await fetchAllLive();
const runDir = path.join(OUT_ROOT, "remediation", options.run);
mkdirSync(runDir, { recursive: true });

const candidates = [];
const familyCounts = {};
const skillCounts = {};
for (const row of rows) {
  const reasons = auditRow(row);
  if (reasons.length === 0) continue;
  candidates.push({
    id: row.id, section: row.section, skill_slug: row.skill_slug,
    difficulty: row.difficulty, question_type: row.question_type, reasons,
  });
  for (const reason of reasons) familyCounts[reason] = (familyCounts[reason] ?? 0) + 1;
  const key = `${row.section}/${row.skill_slug}`;
  skillCounts[key] = (skillCounts[key] ?? 0) + 1;
}

// Canli modda: tam yedek + yerel bank.json ile fark sayimi
let localDiff = null;
if (!options.local) {
  writeFileSync(
    path.join(runDir, "live-backup.json"),
    JSON.stringify({ fetched_at: new Date().toISOString(), project_ref: EXPECTED_PROJECT_REF, rows }, null, 2) + "\n",
    { flag: "wx", mode: 0o600 }
  );
  if (existsSync(path.join(OUT_ROOT, "bank.json"))) {
    const localById = new Map(loadLocalBank().map((q) => [q.id, q]));
    const compared = ["prompt", "question_type"];
    localDiff = { missing_local: 0, field_diff: 0 };
    for (const row of rows) {
      const local = localById.get(row.id);
      if (!local) { localDiff.missing_local += 1; continue; }
      const choicesEqual = JSON.stringify(local.choices ?? null) === JSON.stringify(row.choices ?? null);
      // Eski yerel export'ta needs_review bazi satirlarda null kalmis; null ve
      // false ayni anlami tasir ("karantinada degil"), boolean olarak kiyaslanir.
      const flagEqual = Boolean(local.needs_review) === Boolean(row.needs_review);
      if (!choicesEqual || !flagEqual || compared.some((f) => (local[f] ?? null) !== (row[f] ?? null))) localDiff.field_diff += 1;
    }
  }
}

const report = {
  run: options.run, mode: options.local ? "local" : "live", generated_at: new Date().toISOString(),
  total_rows: rows.length, candidate_count: candidates.length,
  flagged_needs_review: rows.filter((r) => r.needs_review).length,
  family_counts: familyCounts, skill_counts: skillCounts, local_vs_live: localDiff,
};
writeFileSync(path.join(runDir, "audit-report.json"), JSON.stringify(report, null, 2) + "\n");
writeFileSync(path.join(runDir, "candidate-ids.json"), JSON.stringify({ candidates }, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
