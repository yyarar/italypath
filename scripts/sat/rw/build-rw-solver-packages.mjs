// Kor cozucu paketleri (plan 2026-10-03, Gorev 8). bank.json'dan N paket (varsayilan 8) kurar; her ajan bir
// paketi yalniz paketteki metin ve gorselle cozer, sonucu solver/result-NN.json'a yazar; gate-rw.mjs karsilastirir.
// Pakete GIRMEZ: cevap, aciklama, zorluk, beceri, alan, kaynak dosya. Girer: id, hash, prompt (isaretli),
// choices, figure (WebP mutlak yolu ya da null). hash = gate-rw.mjs textHash (prompt + dort sik, sha256 ilk 12 hex);
// metin sonradan degisirse eski sonuc gate'te "eski" sayilir.
// Dagitim sabit tohumlu ve girdi sirasindan bagimsiz: beceriye gore siralanip (beceri icinde sha256(tohum:id))
// paketlere sirayla dagitilir -> her pakette her beceriden pay, boyutlar en cok 1 farkli; paket ici sira yine
// tohumla karistirilir. Yeniden calistirma ayni dosyalari yazar; result-*.json'a dokunmaz.
//
// Kullanim:
//   SAT_BANK_OUT=<abs>/tmp/sat-bank/rw node scripts/sat/rw/build-rw-solver-packages.mjs [--packages 8] [--bank <yol>]
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import {
  CHOICE_KEYS,
  DEFAULT_BANK,
  SOLVER_DIR,
  figureAbsPath,
  parseCliArgs,
  positiveInt,
  readBank,
  seededKey,
  textHash,
  writeJsonFile,
} from "./gate-rw.mjs";

const SEED = "rw-solver-v1";

function packageName(index) {
  return `package-${String(index + 1).padStart(2, "0")}.json`;
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), { values: ["--packages", "--bank"] });
  const count = positiveInt(args.values["--packages"] ?? 8, "--packages");
  const bankPath = path.resolve(args.values["--bank"] ?? DEFAULT_BANK);
  const bank = readBank(bankPath);
  if (count > bank.length) throw new Error(`--packages (${count}) soru sayisindan (${bank.length}) buyuk olamaz.`);

  // beceri -> tohumlu sira; sonra sirayla dagit (paket i % N)
  const ordered = [...bank].sort(
    (a, b) => (a.skill ?? "").localeCompare(b.skill ?? "") || seededKey(SEED, a.id).localeCompare(seededKey(SEED, b.id)),
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
    bank_count: bank.length,
    packages: count,
    seed: SEED,
    hash_rule: "sha256(JSON.stringify([prompt, A, B, C, D])) ilk 12 hex (gate-rw.mjs textHash)",
    result_file_rule: "package-NN.json -> result-NN.json: [{ id, hash, answer: A|B|C|D|null, confidence: high|medium|low, note }]",
    files: [],
  };
  packages.forEach((records, index) => {
    const questions = records.map((record) => {
      const figure = figureAbsPath(record);
      if (figure && !existsSync(figure)) missingFigures.push(record.id);
      return {
        id: record.id,
        hash: textHash(record),
        prompt: record.prompt,
        choices: Object.fromEntries(CHOICE_KEYS.map((key) => [key, record.choices[key]])),
        figure,
      };
    });
    const name = packageName(index);
    writeJsonFile(path.join(SOLVER_DIR, name), { package: index + 1, count: questions.length, questions });
    const skills = {};
    for (const record of records) skills[record.skill ?? "?"] = (skills[record.skill ?? "?"] ?? 0) + 1;
    manifest.files.push({
      file: name,
      count: questions.length,
      with_figure: questions.filter((question) => question.figure).length,
      skills: Object.fromEntries(Object.entries(skills).sort(([a], [b]) => a.localeCompare(b))),
      ids: questions.map((question) => question.id),
    });
  });
  manifest.missing_figures = missingFigures.sort();
  writeJsonFile(path.join(SOLVER_DIR, "manifest.json"), manifest);

  const sizes = manifest.files.map((file) => file.count);
  const skillCount = new Set(bank.map((record) => record.skill)).size;
  const fullMix = manifest.files.filter((file) => Object.keys(file.skills).length === skillCount).length;
  console.log(`Kor cozucu paketleri: ${count} paket, ${bank.length} soru (boyut ${Math.min(...sizes)}-${Math.max(...sizes)}) -> ${SOLVER_DIR}`);
  console.log(`Tum ${skillCount} beceriyi tasiyan paket: ${fullMix}/${count}`);
  if (missingFigures.length > 0) {
    console.log(`UYARI: gorsel dosyasi henuz yok: ${missingFigures.length} soru (figures/ uretilmeden cozucu dalgasi baslamamali).`);
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
