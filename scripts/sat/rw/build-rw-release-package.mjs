// Okuma ve Yazma sorularini karantinadan cikarma paketi (plan 2026-10-03, Gorev 7 / Gorev 13).
// Canli bankayi YALNIZ OKUR: section = reading-writing ve needs_review = true satirlarindan
// patch-sat-questions.mjs icin needs_review true -> false paketini kurar; veritabanina yazmaz.
// prompt ve choices beklenen eski deger olarak girer, `after`'da aynen kalir (yalniz needs_review degisir).
// Paket Git disi <RW_OUT>/release/ altina yazilir (soru icerigi depoya girmez). Hedef kilidi diger SAT
// betikleriyle ayni (scripts/lib/program-details-import.mjs): adres canli projeye ait olmali.
//
// Kullanim:
//   node scripts/sat/rw/build-rw-release-package.mjs --skills text-structure-and-purpose,command-of-evidence
//   node scripts/sat/rw/build-rw-release-package.mjs --all
// Sonra:
//   node scripts/sat/patch-sat-questions.mjs --package <paket>                                  # kuru calistirma
//   node scripts/sat/patch-sat-questions.mjs --package <paket> --apply --project-ref kskbnxxyviowmrlskwke
//
// Cikti yalniz kimlik ve sayilardir; soru metni yazdirilmaz.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LIVE_PROJECT_REF, createImportClient, parseImportArgs } from "../../lib/program-details-import.mjs";
import { normalizeChoices, validatePackage } from "../lib/question-patch.mjs";
import { RW_OUT } from "./paths.mjs";

const COLUMNS = "id,section,skill_slug,prompt,choices,correct_answer,needs_review";
const PAGE_SIZE = 500;

function parseArgs(argv) {
  const parsed = parseImportArgs(argv, { valueFlags: ["--skills"], booleanFlags: ["--all"] });
  if (parsed.mode === "apply") throw new Error("Bu betik yazmaz; --apply yalniz patch-sat-questions.mjs icindir.");
  const all = parsed.flags.has("--all");
  const skills = parsed.values["--skills"]
    ? [...new Set(parsed.values["--skills"].split(",").map((slug) => slug.trim()).filter(Boolean))]
    : [];
  if (all === (skills.length > 0)) throw new Error("--skills <slug,slug> veya --all (yalniz biri) zorunlu.");
  return { projectRef: parsed.projectRef, all, skills };
}

async function fetchQuarantinedRw(client) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("sat_questions")
      .select(COLUMNS)
      .eq("section", "reading-writing")
      .eq("needs_review", true)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`sat_questions fetch hatasi: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

export function buildReleaseRecords(rows) {
  return rows.map((row) => {
    if (row.section !== "reading-writing" || row.needs_review !== true) {
      throw new Error(`${row.id}: karantinadaki bir Okuma ve Yazma satiri degil.`);
    }
    return {
      id: row.id,
      expected_before: {
        prompt: row.prompt, choices: normalizeChoices(row.choices),
        needs_review: true, correct_answer: row.correct_answer,
      },
      after: { prompt: row.prompt, choices: normalizeChoices(row.choices), needs_review: false },
    };
  });
}

// clientFactory, outDir ve now yalniz cevrimdisi testler icindir (sahte istemci, gecici klasor).
export async function main(
  argv = process.argv.slice(2),
  { clientFactory, outDir = path.join(RW_OUT, "release"), now = new Date() } = {}
) {
  const options = parseArgs(argv);
  const client = createImportClient({ mode: "dry-run", projectRef: options.projectRef ?? LIVE_PROJECT_REF, clientFactory });
  const quarantined = await fetchQuarantinedRw(client);

  // Istenen her beceri karantinada en az bir satir tasimali (yanlis slug ya da zaten acilmis beceri sessizce gecmez).
  const selected = options.all ? quarantined : quarantined.filter((row) => options.skills.includes(row.skill_slug));
  const perSkill = {};
  for (const row of selected) perSkill[row.skill_slug] = (perSkill[row.skill_slug] ?? 0) + 1;
  const missing = options.skills.filter((slug) => !perSkill[slug]);
  if (missing.length > 0) {
    throw new Error(`Karantinada satiri olmayan beceri: ${missing.join(", ")} (yanlis slug ya da zaten acik). Paket yazilmadi.`);
  }
  if (selected.length === 0) throw new Error("Karantinada Okuma ve Yazma satiri yok; bos paket yazilmaz.");

  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const runLabel = `rw-release-${options.all ? "all" : options.skills.join("_")}-${stamp}`;
  const pkg = {
    kind: "sat-question-patch",
    schema_version: 1,
    project_ref: LIVE_PROJECT_REF,
    run_label: runLabel,
    records: buildReleaseRecords(selected),
  };
  validatePackage(pkg, LIVE_PROJECT_REF);

  mkdirSync(outDir, { recursive: true });
  const packagePath = path.join(outDir, `${runLabel}.json`);
  if (existsSync(packagePath)) throw new Error(`Paket zaten var, ezilmez: ${packagePath}`);
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n", { encoding: "utf8", flag: "wx", mode: 0o600 });

  return {
    run_label: runLabel,
    package_path: packagePath,
    quarantined_rw: quarantined.length,
    packed: selected.length,
    per_skill: Object.fromEntries(Object.entries(perSkill).sort(([a], [b]) => a.localeCompare(b))),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(`RW acma paketi kurulamadi: ${error.message ?? error}`);
      process.exitCode = 1;
    });
}
