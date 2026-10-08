// IMAT sorularini karantinadan cikarma paketi (plan 2026-10-08, Gorev 12 / Gorev 13 Step 7;
// scripts/sat/rw/build-rw-release-package.mjs kalibi). Canli bankayi YALNIZ OKUR: needs_review = true
// satirlarindan patch-imat-questions.mjs icin needs_review true -> false paketini kurar; veritabanina yazmaz.
// prompt, choices ve correct_answer okunan haliyle `expected`'a girer; `after`'da prompt/choices aynen kalir.
// Paket Git disi <IMAT_OUT>/release/ altina yazilir (soru icerigi depoya girmez). Hedef kilidi diger IMAT
// betikleriyle ayni (scripts/lib/program-details-import.mjs): adres canli projeye ait olmali. Yazma bayragi yoktur;
// taninmayan her bayrak (yazma bayragi dahil) hata verir.
//
// Kullanim:
//   IMAT_OUT=<klasor> node scripts/imat/build-release-package.mjs --years 2025 [--section biology]
//   IMAT_OUT=<klasor> node scripts/imat/build-release-package.mjs --all [--section <slug>]
// Sonra (Kerem kapisi 4):
//   node scripts/imat/patch-imat-questions.mjs --package <paket>                                 # kuru calistirma
//   node scripts/imat/patch-imat-questions.mjs --package <paket> --apply --project-ref kskbnxxyviowmrlskwke
//
// Cikti yalniz kimlik ve sayilardir; soru metni yazdirilmaz.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SECTIONS } from "../../lib/imat/taxonomy.mjs";
import { LIVE_PROJECT_REF, createImportClient } from "../lib/program-details-import.mjs";
import { TABLE, fileStamp, liveReadError, validatePackage } from "./lib/question-patch.mjs";
import { RELEASE_DIR, parseYears } from "./paths.mjs";

const COLUMNS = "id,year,section,prompt,choices,correct_answer,needs_review";
const PAGE_SIZE = 500;
const VALUE_FLAGS = ["--years", "--section", "--project-ref"];
const BOOLEAN_FLAGS = ["--all"];

function parseArgs(argv) {
  const values = {};
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const eq = arg.indexOf("=");
    const name = eq > 0 ? arg.slice(0, eq) : arg;
    if (BOOLEAN_FLAGS.includes(name) && eq < 0) {
      flags.add(name);
      continue;
    }
    if (VALUE_FLAGS.includes(name)) {
      const value = eq > 0 ? arg.slice(eq + 1) : argv[(index += 1)];
      if (!value || value.startsWith("--")) throw new Error(`${name} bir deger ister`);
      values[name] = value;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  const all = flags.has("--all");
  if (all === Boolean(values["--years"])) throw new Error("--years <yil,yil> veya --all (yalniz biri) zorunlu.");
  const years = all ? null : parseYears(values["--years"]);
  const section = values["--section"] ?? null;
  if (section && !SECTIONS.includes(section)) throw new Error(`Gecersiz bolum: ${section} (izinli: ${SECTIONS.join(", ")})`);
  return { projectRef: values["--project-ref"] ?? null, all, years, section };
}

async function fetchQuarantined(client) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(TABLE)
      .select(COLUMNS)
      .eq("needs_review", true)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw liveReadError(error);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

// Okunan canli satirdan yalniz needs_review'i false yapan kayit.
export function buildReleaseItems(rows) {
  return rows.map((row) => {
    if (row.needs_review !== true) throw new Error(`${row.id}: karantinadaki bir satir degil.`);
    return {
      id: row.id,
      expected: { prompt: row.prompt, choices: row.choices, needs_review: true, correct_answer: row.correct_answer },
      after: { prompt: row.prompt, choices: row.choices, needs_review: false },
    };
  });
}

// clientFactory, outDir ve now yalniz cevrimdisi testler icindir (sahte istemci, gecici klasor).
export async function main(argv = process.argv.slice(2), { clientFactory, outDir = RELEASE_DIR, now = new Date() } = {}) {
  const options = parseArgs(argv);
  const client = createImportClient({ mode: "dry-run", projectRef: options.projectRef ?? LIVE_PROJECT_REF, clientFactory });
  const quarantined = await fetchQuarantined(client);

  // Istenen her yil karantinada en az bir satir tasimali (yanlis yil ya da zaten acilmis yil sessizce gecmez).
  if (options.years) {
    const missing = options.years.filter((year) => !quarantined.some((row) => row.year === year));
    if (missing.length > 0) {
      throw new Error(`Karantinada satiri olmayan yil: ${missing.join(", ")} (yanlis yil ya da zaten acik). Paket yazilmadi.`);
    }
  }
  const selected = quarantined.filter(
    (row) => (!options.years || options.years.includes(row.year)) && (!options.section || row.section === options.section)
  );
  if (selected.length === 0) throw new Error("Secime uyan karantinada satir yok; bos paket yazilmaz.");

  const spec = [options.all ? "all" : options.years.join("_"), options.section].filter(Boolean).join("-");
  const pkg = { project_ref: LIVE_PROJECT_REF, table: TABLE, created_at: now.toISOString(), items: buildReleaseItems(selected) };
  validatePackage(pkg, LIVE_PROJECT_REF);

  const packagePath = path.join(outDir, `imat-release-${spec}-${fileStamp(now)}.json`);
  if (existsSync(packagePath)) throw new Error(`Paket zaten var, ezilmez: ${packagePath}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n", { encoding: "utf8", flag: "wx", mode: 0o600 });

  const perYear = {};
  const perSection = {};
  for (const row of selected) {
    perYear[row.year] = (perYear[row.year] ?? 0) + 1;
    perSection[row.section] = (perSection[row.section] ?? 0) + 1;
  }
  return { package_path: packagePath, quarantined: quarantined.length, packed: selected.length, per_year: perYear, per_section: perSection };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(`IMAT acma paketi kurulamadi: ${error.message ?? error}`);
      process.exitCode = 1;
    });
}
