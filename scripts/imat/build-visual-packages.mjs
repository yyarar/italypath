// IMAT gorsel sadakat paketleri (plan 2026-10-08 Gorev 11; kalip scripts/sat/rw/build-rw-visual-packages.mjs).
// Ajan sayfa/soru goruntusune bakip bizim prompt/choices metnimizi kelime kelime karsilastirir, yalniz bulgu yazar
// (runbook docs/superpowers/specs/assets/imat-visual-prompt.md; visual/result-NN.json); gate-imat.mjs bulgulari acik
// kayit sayar.
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/build-visual-packages.mjs --years 2023,2024,2025 [--size 15] [--random-pct 10] [--bank <yol>]
//   ... node scripts/imat/build-visual-packages.mjs --ids <id,id,...> [--bank <yol>]   (yeniden bakis paketi)
//
// Hedef (gate-imat.mjs visualReasons): sekilli (figure_path) ya da metninde/siklarinda `$` gecen her soru; arti
// kalanlardan ceil(%--random-pct) kadar rastgele (sha256(tohum:id) sirasi; buyuk oran kucugun ust kumesidir).
// Paketler (en cok --size, ust sinir 15; boyut farki en cok 1): once hedefler (yil, numara sirasi), ardindan
// rastgeleler secim sirasiyla ayri paketlere. Kayit: { id, hash, year, number, pageImage (mutlak, pages/<yil>/p-NN.png),
// [pageImageMore] (soru ya da sekli baska sayfaya tasiyorsa), questionImage (vision/<yil>/q-NN.png varsa, yoksa null),
// prompt, choices, figure (figures/ WebP mutlak yolu ya da null), reasons }.
// choices KAGIT harf sirasindadir (shuffle.order ile geri cevrilir): sayfadaki harflerle ve corrections.json'daki
// "choices.<harf>" (kagit harfi) ile ayni. hash bankadaki (karistirilmis) metnin ozetidir; gate onunla karsilastirir.
// Cevap anahtari pakete girmez; ancak 2025 sayfa goruntusu dogru sikki vurgulu, 2023 son sayfasi "hep A" notunu
// gosterir: gorsel ajan soru cozmez, yalniz metin karsilastirir (kabul edilen risk). Bu paketler kor cozucuye verilmez.
// Yeniden calistirma ayni dosyalari yazar; result-*.json'a dokunmaz. Sayfa goruntusu eksikse cikis 1.
// --ids: metni degisen sorular icin tek paket visual/package-rerun-<zaman>.json (en cok 15 soru; kind "rerun", ayni
// kayit bicimi, kagit harf sirasi; reasons = hedef nedenleri + "rerun"). package-NN.json'lara ve manifest.json'a
// dokunmaz; ajan sonucu result-rerun-<zaman>.json'a yazar. gate-imat.mjs bu paketi de okur (PACKAGE_FILE_PATTERN).
// --years/--size/--random-pct ile birlikte kullanilmaz.
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import {
  CHOICE_KEYS,
  figureAbsPath,
  paperChoices,
  parseCliArgs,
  positiveInt,
  readBank,
  recordHash,
  rerunStamp,
  seededKey,
  selectIds,
  visualReasons,
} from "./gate-imat.mjs";
import { BANK_PATH, EXTRACT_DIR, VISION_DIR, VISUAL_DIR, pad2, pagePath, parseYears, readJson, writeJson } from "./paths.mjs";

const SEED = "imat-visual-random-v1";
const MAX_SIZE = 15;
const REASON_ORDER = ["figure", "formula", "random"];

const packageName = (index) => `package-${pad2(index + 1)}.json`;

// extract/<yil>.json'dan soru basina ek sayfalar (stitchedPages, sekil sayfasi); dosya yoksa bos.
function extraPages(years) {
  const extra = new Map();
  for (const year of years) {
    const file = path.join(EXTRACT_DIR, `${year}.json`);
    if (!existsSync(file)) continue;
    for (const q of readJson(file).questions ?? []) {
      const pages = new Set([...(q.stitchedPages ?? []), ...(Number.isInteger(q.figureBox?.page) ? [q.figureBox.page] : [])]);
      pages.delete(q.page);
      if (pages.size > 0) extra.set(q.id, [...pages].sort((a, b) => a - b));
    }
  }
  return extra;
}

// Paket kaydi (normal ve --ids kipi ayni bicim); eksik sayfa/sekil listelere yazilir.
function packageEntry(record, reasons, extra, missing) {
  const pageImage = pagePath(record.year, record.source_page);
  const more = (extra.get(record.id) ?? []).map((page) => pagePath(record.year, page));
  for (const file of [pageImage, ...more]) if (!existsSync(file)) missing.pages.push(`${record.id} ${path.basename(file)}`);
  const crop = path.join(VISION_DIR, String(record.year), `q-${pad2(record.number)}.png`);
  const figure = figureAbsPath(record);
  if (figure && !existsSync(figure)) missing.figures.push(record.id);
  const entry = {
    id: record.id,
    hash: recordHash(record),
    year: record.year,
    number: record.number,
    pageImage,
    ...(more.length > 0 ? { pageImageMore: more } : {}),
    questionImage: existsSync(crop) ? crop : null,
    prompt: record.prompt,
    choices: paperChoices(record),
    figure,
    reasons,
  };
  if (CHOICE_KEYS.some((key) => typeof entry.choices[key] !== "string")) throw new Error(`${entry.id}: kagit sirasi kurulamadi (shuffle.order bozuk)`);
  return entry;
}

// --ids: tek yeniden bakis paketi (package-rerun-<zaman>.json); var olan paketlere ve manifest'e dokunmaz.
function buildRerun(all, idsArg, bankPath) {
  const records = selectIds(all, idsArg).sort((a, b) => a.year - b.year || a.number - b.number);
  if (records.length > MAX_SIZE) throw new Error(`--ids en cok ${MAX_SIZE} soru (verilen ${records.length}); birkac calismaya bol.`);
  const missing = { pages: [], figures: [] };
  const extra = extraPages([...new Set(records.map((record) => record.year))]);
  const questions = records.map((record) => packageEntry(record, [...visualReasons(record), "rerun"], extra, missing));
  const stamp = rerunStamp();
  const name = `package-rerun-${stamp}.json`;
  mkdirSync(VISUAL_DIR, { recursive: true });
  writeJson(path.join(VISUAL_DIR, name), { package: `rerun-${stamp}`, kind: "rerun", choiceOrder: "paper", count: questions.length, questions });
  console.log(`Yeniden bakis paketi: ${questions.length} soru (${bankPath}) -> ${path.join(VISUAL_DIR, name)}`);
  console.log(`Sonuc dosyasi: ${path.join(VISUAL_DIR, `result-rerun-${stamp}.json`)} | sekilli ${questions.filter((question) => question.figure).length} | soru goruntulu ${questions.filter((question) => question.questionImage).length}`);
  if (missing.figures.length > 0) console.log(`UYARI: sekil dosyasi yok: ${missing.figures.join(", ")} (crop-figures.mjs).`);
  if (missing.pages.length > 0) {
    console.log(`HATA: sayfa goruntusu yok: ${missing.pages.join(", ")} (render-pages.mjs).`);
    return 1;
  }
  return 0;
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), { values: ["--years", "--size", "--random-pct", "--bank", "--ids"] });
  if (args.values["--ids"] !== undefined) {
    if (["--years", "--size", "--random-pct"].some((name) => args.values[name] !== undefined)) {
      throw new Error("--ids, --years/--size/--random-pct ile birlikte kullanilmaz.");
    }
    const bankPath = path.resolve(args.values["--bank"] ?? BANK_PATH);
    return buildRerun(readBank(bankPath), args.values["--ids"], bankPath);
  }
  const years = parseYears(args.values["--years"]);
  const size = positiveInt(args.values["--size"] ?? MAX_SIZE, "--size");
  if (size > MAX_SIZE) throw new Error(`--size en cok ${MAX_SIZE}.`);
  const randomPct = positiveInt(args.values["--random-pct"] ?? 10, "--random-pct", { allowZero: true });
  if (randomPct > 100) throw new Error("--random-pct en cok 100.");
  const bankPath = path.resolve(args.values["--bank"] ?? BANK_PATH);
  const bank = readBank(bankPath).filter((record) => years.includes(record.year));
  if (bank.length === 0) throw new Error(`Secilen yillarda soru yok: ${years.join(", ")}`);

  const targets = bank
    .map((record) => ({ record, reasons: visualReasons(record) }))
    .filter((entry) => entry.reasons.length > 0)
    .sort((a, b) => a.record.year - b.record.year || a.record.number - b.record.number);
  const targetIds = new Set(targets.map((entry) => entry.record.id));
  const rest = bank.filter((record) => !targetIds.has(record.id)).sort((a, b) => seededKey(SEED, a.id).localeCompare(seededKey(SEED, b.id)));
  const randomCount = Math.ceil((rest.length * randomPct) / 100);
  const random = rest.slice(0, randomCount).map((record) => ({ record, reasons: ["random"] }));

  const extra = extraPages(years);
  const missing = { pages: [], figures: [] };
  const questions = [...targets, ...random].map(({ record, reasons }) => packageEntry(record, reasons, extra, missing));
  const missingPages = missing.pages;
  const missingFigures = missing.figures;

  // hedef ve rastgele ayri, her biri en cok --size'lik esit boyutlu paketlere (boyut farki en cok 1)
  const packages = [];
  const split = (kind, items) => {
    const count = Math.ceil(items.length / size);
    for (let index = 0, start = 0; index < count; index += 1) {
      const end = start + Math.floor(items.length / count) + (index < items.length % count ? 1 : 0);
      packages.push({ kind, items: items.slice(start, end) });
      start = end;
    }
  };
  split("target", questions.slice(0, targets.length));
  split("random", questions.slice(targets.length));

  mkdirSync(VISUAL_DIR, { recursive: true });
  const keep = new Set(packages.map((_, index) => packageName(index)));
  for (const name of readdirSync(VISUAL_DIR)) {
    if (/^package-\d+\.json$/.test(name) && !keep.has(name)) rmSync(path.join(VISUAL_DIR, name));
  }
  packages.forEach(({ kind, items }, index) => {
    writeJson(path.join(VISUAL_DIR, packageName(index)), { package: index + 1, kind, choiceOrder: "paper", count: items.length, questions: items });
  });

  const counts = Object.fromEntries(REASON_ORDER.map((reason) => [reason, 0]));
  for (const question of questions) for (const reason of question.reasons) counts[reason] += 1;
  const manifest = {
    bank: bankPath,
    years,
    bank_count: bank.length,
    size,
    random_pct: randomPct,
    random_selected: random.length,
    seed: SEED,
    total: questions.length,
    targets_without_random: targets.length,
    counts_per_reason: counts,
    note: "Bir soru iki nedenle hedefte olabilir; nedenlerin toplami toplamdan buyuk olabilir. choices kagit harf sirasinda.",
    hash_rule: "sha256(prompt + \"\\n\" + A..E \"\\n\" ile) ilk 12 hex, bankadaki karistirilmis sira (lib/text.mjs textHash)",
    result_file_rule: "package-NN.json -> result-NN.json: [{ id, hash, findings: [{ kind: word|punctuation|formula|mark|table|figure|layout, detail }] }]",
    files: packages.map(({ kind, items }, index) => ({
      file: packageName(index),
      kind,
      count: items.length,
      with_figure: items.filter((item) => item.figure).length,
      with_question_image: items.filter((item) => item.questionImage).length,
      ids: items.map((item) => item.id),
    })),
    missing_pages: missingPages,
    missing_figures: missingFigures.sort(),
  };
  writeJson(path.join(VISUAL_DIR, "manifest.json"), manifest);

  const sizes = (kind) => packages.filter((entry) => entry.kind === kind).map((entry) => entry.items.length).join("/") || "-";
  console.log(`Gorsel sadakat paketleri: ${packages.length} paket, ${questions.length} soru (${years.join(", ")}) -> ${VISUAL_DIR}`);
  console.log(`Paket boyutlari: hedef ${sizes("target")} | rastgele ${sizes("random")}`);
  console.log(`Neden basina: ${REASON_ORDER.map((reason) => `${reason} ${counts[reason]}`).join(" | ")} (hedef ${targets.length} + rastgele ${random.length}/${rest.length})`);
  if (missingFigures.length > 0) console.log(`UYARI: sekil dosyasi yok: ${missingFigures.join(", ")} (crop-figures.mjs).`);
  if (missingPages.length > 0) {
    console.log(`HATA: sayfa goruntusu yok: ${missingPages.join(", ")} (render-pages.mjs).`);
    return 1;
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
