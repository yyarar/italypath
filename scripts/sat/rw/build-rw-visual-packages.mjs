// Gorsel sadakat paketleri (plan 2026-10-03, Gorev 9). Ajan resmi goruntuye bakip bizim prompt/choices ile
// karsilastirir, yalniz bulgu yazar (visual/result-NN.json); gate-rw.mjs bulgulari acik kayit sayar.
// Hedef (gate-rw.mjs visualReasons): <u> tasiyan her soru, gorselli her soru, not listesi disinda anlamli satir
// sonu olan her soru (siir, diyalog), her Text 1 / Text 2 sorusu; arti kalanlardan --random kadar rastgele
// (sha256(tohum:id) sirasi: --random 120, --random 60'in ust kumesidir).
// Paketler: once hedefler (id sirasi) ceil(hedef/--size) pakete ardisik ve esit (boyut farki en cok 1) bolunur;
// ardindan rastgeleler secim sirasiyla ayri, tam --size'lik paketlere. Rastgele ornek buyutulunce (60 -> 120)
// hedef paketleri ve onceki tam rastgele paketler degismez, yeni paketler sona eklenir; rastgele ornegin
// bulgulari ayri paketlerde kalir (Gorev 9: rastgele 60'ta bulgu cikarsa ornek 120'ye genisler).
// Kayit: { id, hash, official_image (mutlak; formatli PNG ya da iki eksik id icin formatsiz sayfa cizimi),
// official_image_kind, [official_image_more], prompt, choices, figure, reasons }. result-*.json'a dokunmaz.
//
// Kullanim:
//   SAT_BANK_OUT=<abs>/tmp/sat-bank/rw node scripts/sat/rw/build-rw-visual-packages.mjs [--size 30] [--random 60] [--bank <yol>]
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import {
  CHOICE_KEYS,
  DEFAULT_BANK,
  VISUAL_DIR,
  figureAbsPath,
  parseCliArgs,
  positiveInt,
  readBank,
  seededKey,
  textHash,
  visualReasons,
  writeJsonFile,
} from "./gate-rw.mjs";
import { officialImages } from "./render-rw-preview.mjs";

const SEED = "rw-visual-random-v1";
const REASON_ORDER = ["underline", "figure", "line-break", "two-texts", "random"];

function packageName(index) {
  return `package-${String(index + 1).padStart(2, "0")}.json`;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2), { values: ["--size", "--random", "--bank"] });
  const size = positiveInt(args.values["--size"] ?? 30, "--size");
  const randomCount = positiveInt(args.values["--random"] ?? 60, "--random", { allowZero: true });
  const bankPath = path.resolve(args.values["--bank"] ?? DEFAULT_BANK);
  const bank = readBank(bankPath);

  const targets = bank
    .map((record) => ({ record, reasons: visualReasons(record) }))
    .filter((entry) => entry.reasons.length > 0)
    .sort((a, b) => a.record.id.localeCompare(b.record.id));
  const targetIds = new Set(targets.map((entry) => entry.record.id));
  const rest = bank
    .filter((record) => !targetIds.has(record.id))
    .sort((a, b) => seededKey(SEED, a.id).localeCompare(seededKey(SEED, b.id)));
  const random = rest.slice(0, randomCount).map((record) => ({ record, reasons: ["random"] }));
  const selected = [...targets, ...random];

  const questions = [];
  const missingFigures = [];
  const unformatted = [];
  const noImage = [];
  for (const { record, reasons } of selected) {
    const official = await officialImages(record.id);
    if (official.kind === "none") noImage.push(record.id);
    if (official.kind === "unformatted-page") unformatted.push(record.id);
    const figure = figureAbsPath(record);
    if (figure && !existsSync(figure)) missingFigures.push(record.id);
    questions.push({
      id: record.id,
      hash: textHash(record),
      official_image: official.paths[0] ?? null,
      official_image_kind: official.kind,
      ...(official.paths.length > 1 ? { official_image_more: official.paths.slice(1) } : {}),
      prompt: record.prompt,
      choices: Object.fromEntries(CHOICE_KEYS.map((key) => [key, record.choices[key]])),
      figure,
      reasons,
    });
  }

  // hedef paketleri esit, rastgele paketleri tam --size'lik dilimler
  const targetQuestions = questions.slice(0, targets.length);
  const randomQuestions = questions.slice(targets.length);
  const packages = [];
  const targetPackages = Math.ceil(targetQuestions.length / size);
  for (let index = 0, start = 0; index < targetPackages; index += 1) {
    const end = start + Math.floor(targetQuestions.length / targetPackages) + (index < targetQuestions.length % targetPackages ? 1 : 0);
    packages.push({ kind: "target", items: targetQuestions.slice(start, end) });
    start = end;
  }
  for (let start = 0; start < randomQuestions.length; start += size) {
    packages.push({ kind: "random", items: randomQuestions.slice(start, start + size) });
  }

  mkdirSync(VISUAL_DIR, { recursive: true });
  const keep = new Set(packages.map((_, index) => packageName(index)));
  for (const name of readdirSync(VISUAL_DIR)) {
    if (/^package-\d+\.json$/.test(name) && !keep.has(name)) rmSync(path.join(VISUAL_DIR, name));
  }
  packages.forEach(({ kind, items }, index) => {
    writeJsonFile(path.join(VISUAL_DIR, packageName(index)), { package: index + 1, kind, count: items.length, questions: items });
  });

  const counts = Object.fromEntries(REASON_ORDER.map((reason) => [reason, 0]));
  for (const question of questions) for (const reason of question.reasons) counts[reason] += 1;
  const manifest = {
    bank: bankPath,
    bank_count: bank.length,
    size,
    random_requested: randomCount,
    random_selected: random.length,
    seed: SEED,
    total: questions.length,
    targets_without_random: targets.length,
    counts_per_reason: counts,
    note: "Bir soru birden cok nedenle hedefte olabilir; nedenlerin toplami toplamdan buyuk olabilir.",
    hash_rule: "sha256(JSON.stringify([prompt, A, B, C, D])) ilk 12 hex (gate-rw.mjs textHash)",
    result_file_rule:
      "package-NN.json -> result-NN.json: [{ id, hash, findings: [{ kind: wording|missing-text|extra-text|underline|italic|line-break|blank|figure|other, detail }] }]",
    files: packages.map(({ kind, items }, index) => ({
      file: packageName(index),
      kind,
      count: items.length,
      with_figure: items.filter((item) => item.figure).length,
      ids: items.map((item) => item.id),
    })),
    unformatted_official: unformatted,
    no_official_image: noImage,
    missing_figures: missingFigures.sort(),
  };
  writeJsonFile(path.join(VISUAL_DIR, "manifest.json"), manifest);

  const sizes = (kind) => packages.filter((entry) => entry.kind === kind).map((entry) => entry.items.length).join("/") || "-";
  console.log(`Gorsel sadakat paketleri: ${packages.length} paket, ${questions.length} soru -> ${VISUAL_DIR}`);
  console.log(`Paket boyutlari: hedef ${sizes("target")} | rastgele ${sizes("random")}`);
  console.log(`Neden basina: ${REASON_ORDER.map((reason) => `${reason} ${counts[reason]}`).join(" | ")} (hedef ${targets.length} + rastgele ${random.length})`);
  if (unformatted.length > 0) console.log(`Formatsiz sayfa ile: ${unformatted.join(", ")}`);
  if (noImage.length > 0) console.log(`UYARI: resmi goruntusu olmayan: ${noImage.join(", ")}`);
  if (missingFigures.length > 0) console.log(`UYARI: gorsel dosyasi henuz yok: ${missingFigures.length} soru (figures/ uretilmeden dalga baslamamali).`);
  return noImage.length > 0 ? 1 : 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
