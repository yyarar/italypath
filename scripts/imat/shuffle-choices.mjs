// IMAT sik karistirma (plan Gorev 9-10): kaynakta dogru cevabi hep A olan kagitlarda (2021-2025) siklari soru
// kimligine bagli deterministik sirayla karistirir. 2025'te kanit vurgu anahtaridir: keys/2025.json zorunlu ve
// 60/60 A olmali (extract-key-2025.py). 2011-2020 (Cambridge anahtari) icin cagrilmaz.
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/shuffle-choices.mjs --years 2024,2025
//   ... node scripts/imat/shuffle-choices.mjs --self-test   (determinizm + dagilim; dosya okumaz/yazmaz)
//
// Girdi extract/<yil>.json (metin ya da goruntuden yazim sonucu); cikti extract/<yil>.shuffled.json: ayni kayitlar,
// `choices` yeni sirada, `correct_answer` = asil A'nin yeni harfi; ust duzeyde
// shuffleMap: { "<id>": { original: "A", shuffled: "<harf>", order: [...] } }. order[k] = yeni k. harfte duran
// asil harf (yeni A'nin metni asil order[0] sikkidir). Bloke soru (merge-vision.mjs blocked: true) karistirilmadan
// gecer (shuffleMap'te yok, correct_answer yok); validate-bank onu bankaya almaz.
// Tohum: sha256("imat-shuffle-v1:" + id) baytlari; gerekirse sonraki blok sha256(onceki blok). Fisher-Yates,
// sapmasiz secim (bayt reddi). Ayni girdi her calismada ayni ciktiyi verir.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkInventory } from "./inventory.mjs";
import { EXTRACT_DIR, KEYS_DIR, argValue, parseYears, questionId, readJson, writeJson } from "./paths.mjs";

export const SHUFFLE_VERSION = "imat-shuffle-v1";
const LETTERS = ["A", "B", "C", "D", "E"];

// Kaynak kurali: bu yillarda dogru cevap her soruda A (kanit yaninda).
const ALL_A_YEARS = Object.freeze({
  2021: "MUR surumu (CompitoInglese2021 ile ayni boyut): dogru cevap her soruda A (specs/assets/2026-10-08-imat-answer-key-sources.md)",
  2022: "MUR surumu (MUR 2022 sayfasi): dogru cevap her soruda A (specs/assets/2026-10-08-imat-answer-key-sources.md)",
  2023: "son sayfa notu: tum sorularda dogru cevap A",
  2024: "son sayfa notu: tum sorularda dogru cevap A",
  2025: "vurgu anahtari keys/2025.json: 60/60 vurgu A sikkinda (extract-key-2025.py)",
});
export const SHUFFLE_YEARS = Object.freeze(Object.keys(ALL_A_YEARS).map(Number));
// Bu yillarda kanit dosyasi keys/<yil>.json zorunlu (yoksa karistirma durur).
export const KEY_PROOF_YEARS = Object.freeze([2025]);

// sha256 zinciri: bayt bayt okunur; blok bitince sonraki blok onceki blogun sha256'si.
function byteStream(seed) {
  let block = createHash("sha256").update(seed).digest();
  let index = 0;
  return () => {
    if (index === block.length) {
      block = createHash("sha256").update(block).digest();
      index = 0;
    }
    const value = block[index];
    index += 1;
    return value;
  };
}

// 0..n-1 arasi sapmasiz tamsayi (256'nin n'e bolunmeyen kuyrugu reddedilir).
function uniform(next, n) {
  const limit = 256 - (256 % n);
  for (;;) {
    const value = next();
    if (value < limit) return value % n;
  }
}

export function shuffleOrder(id) {
  const next = byteStream(`${SHUFFLE_VERSION}:${id}`);
  const order = [...LETTERS];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = uniform(next, i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function shuffleQuestion(question) {
  if (question.correct_answer !== undefined && question.correct_answer !== "A") {
    throw new Error(`${question.id}: kaynakta dogru cevap A olmali, kayit ${question.correct_answer}`);
  }
  const keys = Object.keys(question.choices ?? {});
  if (keys.join("") !== LETTERS.join("") || keys.some((key) => !String(question.choices[key]).trim())) {
    throw new Error(`${question.id}: 5 dolu sik (A-E) bekleniyor`);
  }
  const order = shuffleOrder(question.id);
  const choices = Object.fromEntries(LETTERS.map((letter, k) => [letter, question.choices[order[k]]]));
  const shuffled = LETTERS[order.indexOf("A")];
  return {
    question: { ...question, choices, correct_answer: shuffled },
    entry: { original: "A", shuffled, order },
  };
}

function distribution(letters) {
  const counts = Object.fromEntries(LETTERS.map((letter) => [letter, 0]));
  for (const letter of letters) counts[letter] += 1;
  return counts;
}

function shuffleYear(year) {
  const input = join(EXTRACT_DIR, `${year}.json`);
  if (!existsSync(input)) throw new Error(`${year}: girdi yok (${input})`);
  const data = readJson(input);
  if (data.year !== year) throw new Error(`${input}: year ${data.year}`);
  const keyFile = join(KEYS_DIR, `${year}.json`);
  if (KEY_PROOF_YEARS.includes(year) && !existsSync(keyFile)) throw new Error(`${year}: kanit dosyasi yok (${keyFile}); once extract-key-2025.py`);
  if (existsSync(keyFile)) {
    const key = readJson(keyFile);
    const notA = Object.entries(key).filter(([, letter]) => letter !== "A");
    if (notA.length > 0) throw new Error(`${year}: keys/${year}.json kaynak kuralina (hep A) uymuyor: ${notA.length} soru`);
    const numbers = new Set(data.questions.map((q) => String(q.number)));
    const keyNumbers = Object.keys(key);
    if (keyNumbers.length !== numbers.size || keyNumbers.some((n) => !numbers.has(n))) {
      throw new Error(`${year}: keys/${year}.json soru numaralari extract ile ayni degil (${keyNumbers.length} / ${numbers.size})`);
    }
  }
  const ids = new Set();
  const questions = [];
  const shuffleMap = {};
  const blocked = [];
  for (const question of data.questions) {
    if (!question.id || ids.has(question.id)) throw new Error(`${year}: eksik ya da tekrar eden id ${question.id}`);
    if (question.id !== questionId(year, question.number)) throw new Error(`${year}:${question.number}: id kurala uymuyor`);
    ids.add(question.id);
    if (question.blocked) {
      blocked.push(question.number);
      questions.push(question);
      continue;
    }
    const { question: shuffled, entry } = shuffleQuestion(question);
    questions.push(shuffled);
    shuffleMap[question.id] = entry;
  }
  const output = { ...data, questions, shuffleMap };
  const out = join(EXTRACT_DIR, `${year}.shuffled.json`);
  writeJson(out, output);
  const counts = distribution(questions.filter((q) => !q.blocked).map((q) => q.correct_answer));
  console.log(`${year}: ${questions.length} soru -> ${out}`);
  if (blocked.length > 0) console.log(`  bloke, karistirilmadi: ${blocked.join(", ")}`);
  console.log(`  dogru cevap dagilimi ${LETTERS.map((letter) => `${letter} ${counts[letter]}`).join(", ")} (kural: ${ALL_A_YEARS[year]})`);
}

function selfTest() {
  const problems = [];
  for (const year of Object.keys(ALL_A_YEARS).map(Number)) {
    const letters = [];
    for (let number = 1; number <= 60; number += 1) {
      const id = questionId(year, number);
      const first = shuffleOrder(id);
      const second = shuffleOrder(id);
      if (first.join("") !== second.join("")) problems.push(`${id}: ayni id farkli sira`);
      if ([...first].sort().join("") !== LETTERS.join("")) problems.push(`${id}: gecersiz permutasyon ${first.join("")}`);
      const question = { id, number, choices: Object.fromEntries(LETTERS.map((letter) => [letter, `sik ${letter}`])) };
      const { question: shuffled, entry } = shuffleQuestion(question);
      if (shuffled.choices[entry.shuffled] !== "sik A") problems.push(`${id}: dogru sik yeni harfte degil`);
      if (JSON.stringify(shuffleQuestion(question)) !== JSON.stringify({ question: shuffled, entry })) problems.push(`${id}: deterministik degil`);
      letters.push(entry.shuffled);
    }
    const counts = distribution(letters);
    const max = Math.max(...Object.values(counts));
    const used = Object.values(counts).filter((count) => count > 0).length;
    if (max > 30) problems.push(`${year}: bir harf 60'in yarisindan fazla (${JSON.stringify(counts)})`);
    if (used < 4) problems.push(`${year}: yalniz ${used} harf kullaniliyor (${JSON.stringify(counts)})`);
    console.log(`${year} (sentetik 60 id): ${LETTERS.map((letter) => `${letter} ${counts[letter]}`).join(", ")}`);
  }
  try {
    shuffleQuestion({ id: "deadbeef", correct_answer: "C", choices: { A: "1", B: "2", C: "3", D: "4", E: "5" } });
    problems.push("A olmayan kaynak cevabi reddedilmedi");
  } catch {
    // beklenen
  }
  if (problems.length > 0) {
    console.error(`Oz-test basarisiz (${problems.length}):\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log("Oz-test gecti: determinizm, permutasyon, dogru sik eslemesi, dagilim.");
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) {
    selfTest();
    return;
  }
  const years = parseYears(argValue(argv, "--years"), Object.keys(ALL_A_YEARS).map(Number));
  checkInventory();
  for (const year of years) shuffleYear(year);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
