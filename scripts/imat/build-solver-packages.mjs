// IMAT kor cozucu paketleri (plan 2026-10-08 Gorev 11; kalip scripts/sat/rw/build-rw-solver-packages.mjs).
// bank.json'dan N paket (varsayilan 8) kurar; her ajan bir paketi yalniz paketteki metin ve sekille cozer
// (runbook docs/superpowers/specs/assets/imat-solver-prompt.md), sonucu solver/result-NN.json'a yazar; gate-imat.mjs
// karsilastirir.
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/build-solver-packages.mjs [--packages 8] [--years 2023,2024,2025] [--bank <yol>]
//
// Pakete GIRMEZ: correct_answer, shuffle, topic/topic_slug, source_file/source_page, numara. Girer: id, hash, year,
// section, prompt, choices (bankadaki karistirilmis sira), figure (figures/<yil>/<id>.webp mutlak yolu ya da null).
// Sekil yalniz figures/ altindaki WebP'dir (2025 vurgusu maskeli); sayfa goruntusu asla verilmez (2025 sayfasi vurguyu,
// 2023 son sayfasi kurali gosterir). hash = gate-imat.mjs recordHash (lib/text.mjs textHash); metin sonradan
// degisirse eski sonuc kapida "eski" sayilir.
// Dagitim sabit tohumlu ve girdi sirasindan bagimsiz: bolum sirasina gore (bolum icinde sha256(tohum:id)) siralanip
// paketlere sirayla dagitilir -> her pakette her bolumden pay, boyutlar en cok 1 farkli; paket ici sira yine tohumla
// karistirilir. Yeniden calistirma ayni dosyalari yazar; result-*.json'a dokunmaz. Sekil dosyasi eksikse cikis 1.
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import { SECTIONS } from "../../lib/imat/taxonomy.mjs";
import { CHOICE_KEYS, figureAbsPath, parseCliArgs, positiveInt, readBank, recordHash, seededKey } from "./gate-imat.mjs";
import { BANK_PATH, SOLVER_DIR, pad2, parseYears, writeJson } from "./paths.mjs";

const SEED = "imat-solver-v1";
const ENTRY_KEYS = ["id", "hash", "year", "section", "prompt", "choices", "figure"];
// Pakete hicbir kosulda girmeyen bank alanlari (cevap ve karistirma izi, kunye, kaynak).
const FORBIDDEN_KEYS = ["correct_answer", "shuffle", "topic", "topic_slug", "source_file", "source_page", "number", "text_hash"];

const packageName = (index) => `package-${pad2(index + 1)}.json`;

function main() {
  const args = parseCliArgs(process.argv.slice(2), { values: ["--packages", "--years", "--bank"] });
  const count = positiveInt(args.values["--packages"] ?? 8, "--packages");
  const bankPath = path.resolve(args.values["--bank"] ?? BANK_PATH);
  const all = readBank(bankPath);
  const years = args.values["--years"] ? parseYears(args.values["--years"]) : [...new Set(all.map((record) => record.year))].sort((a, b) => a - b);
  const bank = all.filter((record) => years.includes(record.year));
  if (bank.length === 0) throw new Error(`Secilen yillarda soru yok: ${years.join(", ")}`);
  if (count > bank.length) throw new Error(`--packages (${count}) soru sayisindan (${bank.length}) buyuk olamaz.`);

  // bolum -> tohumlu sira; sonra sirayla dagit (paket i % N)
  const ordered = [...bank].sort(
    (a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) || seededKey(SEED, a.id).localeCompare(seededKey(SEED, b.id)),
  );
  const packages = Array.from({ length: count }, () => []);
  ordered.forEach((record, index) => packages[index % count].push(record));
  for (const records of packages) {
    records.sort((a, b) => seededKey(`${SEED}:order`, a.id).localeCompare(seededKey(`${SEED}:order`, b.id)));
  }

  mkdirSync(SOLVER_DIR, { recursive: true });
  // onceki calismadan kalan fazla paketleri sil (yalniz package-NN.json; result-*.json'a dokunma)
  const keep = new Set(packages.map((_, index) => packageName(index)));
  for (const name of readdirSync(SOLVER_DIR)) {
    if (/^package-\d+\.json$/.test(name) && !keep.has(name)) rmSync(path.join(SOLVER_DIR, name));
  }

  const missingFigures = [];
  const manifest = {
    bank: bankPath,
    years,
    bank_count: bank.length,
    packages: count,
    seed: SEED,
    hash_rule: "sha256(prompt + \"\\n\" + A..E \"\\n\" ile) ilk 12 hex (lib/text.mjs textHash; bank text_hash)",
    result_file_rule: "package-NN.json -> result-NN.json: [{ id, hash, answer: A|B|C|D|E|null, confidence: 0..1, note }]",
    files: [],
  };
  packages.forEach((records, index) => {
    const questions = records.map((record) => {
      const figure = figureAbsPath(record);
      if (figure && !existsSync(figure)) missingFigures.push(record.id);
      const entry = {
        id: record.id,
        hash: recordHash(record),
        year: record.year,
        section: record.section,
        prompt: record.prompt,
        choices: Object.fromEntries(CHOICE_KEYS.map((key) => [key, record.choices[key]])),
        figure,
      };
      const keys = Object.keys(entry);
      if (keys.join() !== ENTRY_KEYS.join() || keys.some((key) => FORBIDDEN_KEYS.includes(key))) throw new Error(`${record.id}: paket alanlari sozlesme disi`);
      return entry;
    });
    const name = packageName(index);
    writeJson(path.join(SOLVER_DIR, name), { package: index + 1, count: questions.length, questions });
    const sections = Object.fromEntries(SECTIONS.map((section) => [section, records.filter((record) => record.section === section).length]));
    manifest.files.push({
      file: name,
      count: questions.length,
      with_figure: questions.filter((question) => question.figure).length,
      sections,
      ids: questions.map((question) => question.id),
    });
  });
  manifest.missing_figures = missingFigures.sort();
  writeJson(path.join(SOLVER_DIR, "manifest.json"), manifest);

  const sizes = manifest.files.map((file) => file.count);
  const sectionCount = new Set(bank.map((record) => record.section)).size;
  const fullMix = manifest.files.filter((file) => Object.values(file.sections).filter((n) => n > 0).length === sectionCount).length;
  console.log(`Kor cozucu paketleri: ${count} paket, ${bank.length} soru (${years.join(", ")}; boyut ${Math.min(...sizes)}-${Math.max(...sizes)}) -> ${SOLVER_DIR}`);
  console.log(`Tum ${sectionCount} bolumu tasiyan paket: ${fullMix}/${count} | sekilli soru: ${manifest.files.reduce((sum, file) => sum + file.with_figure, 0)}`);
  if (missingFigures.length > 0) {
    console.log(`HATA: sekil dosyasi yok: ${missingFigures.length} soru (${missingFigures.join(", ")}); crop-figures.mjs calismadan cozucu dalgasi baslamaz.`);
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
