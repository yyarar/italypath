// IMAT banka dogrulayicisi (plan Gorev 10; kalip scripts/sat/rw/validate-rw.mjs). Salt yerel: ag yok, veritabani yok.
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/validate-bank.mjs [--years 2023,2024,2025] [--require-figures] [--no-pdftotext]
//
// --years verilmezse extract/<yil>.json dosyasi olan her yil. Girdi: inventory.json, extract/<yil>.json, 2021-2025 icin
// extract/<yil>.shuffled.json (once shuffle-choices.mjs; merge-vision sonrasi yeniden), keys/<yil>.json (2025'te
// zorunlu "hep A" kaniti), (varsa) classify/topics.json { "<id>": { section, topicSlug } } ve corrections.json,
// figures/<yil>/<id>.webp, kapi 4 icin kaynak PDF (pdftotext -layout).
// Cikti: bank.json { bank, failures, warnings, excluded } ve validate-report.json (yil bazinda sayim, kapilar).
// Herhangi bir kapida hata varsa cikis 1; bank.json yine yazilir (import-bank failures doluysa reddeder).
// Hata/uyari metinleri soru metni tasimaz: konum = alan + kelime sirasi.
//
// Kapilar: 1 sayim (expectedQuestions; deneme yilinda MOCK_SECTION_COUNTS ve bolum sirasi), 2 kunye (5 dolu sik, tek
// harf, bolum/konu taksonomide, exam_set mock <=> deneme yili), 3 isaret/formul (markIssues, katexIssues, dengesiz $,
// okunamayan [?]), 4 kaynak metin (asagida), 5 anahtar (2021-2025 shuffle kaydi zorunlu, deterministik sira,
// correct_answer === shuffle.shuffled, karistirilmis dosya extract ile guncel; keys dosyasi hep A ve tam; istisna:
// shuffle-exempt.json listesindeki soru kagit sirasinda, correct_answer "A", shuffle { exempt: true, reason }; listede
// olmayan istisna ya da listede olup karistirilmis kayit hata; istisnalar validate-report.json shuffleExempt), 6 sekil
// (figureBox -> figure_path <yil>/<id>.webp, WebP, <= 512 KB; dosya ya da figure-crop-report.json kaydi yoksa
// --require-figures ile hata; dosya boyutu raporla ayni; dolgulu kenar edge-signoff.json onaysizsa hata), 7 kimlik,
// 8 duzeltmeler. Bloke soru (merge-vision blocked) excluded'a gider, kapilardan gecmez.
//
// Kapi 4 kaynak metin: metin yilinda (inventory textLayer "ok" ya da "decoded") goruntuden yazilmamis her soru kaynak
// PDF'in pdftotext -layout ciktisiyla karsilastirilir; hasImage soru goruntuden yazilmis olmali. Once kaynak PDF'in
// varligi ve envanterdeki sha256'si (her metin yilinda, cozulmus yil dahil). Bicim yilin kagit dizilimine gore
// (inventory.mjs paperLayoutOf; yil listesi yalniz orada):
//   mur (2023-2025): sik "A) metin", tum sayfa metninde bosluksuz ve ardisik (lib/text.mjs locateInSource).
//   cambridge (2011-2022): sik harfi yalin ("A metin"); pdftotext sirasi cikaricinin satir sirasindan farkli olabildiginden
//     sira bagimsiz: soru metni + 5 sik parcalara ayrilir ve sorunun kaynak bolgesindeki (bbox + 2 pt, pdftotext -x -y -W
//     -H) parcalarla iki yonde coklu kume olarak karsilastirilir (lib/text.mjs compareTokens): metindeki her parca bolgede
//     en az o kadar kez gecmeli (yoksa "parca yok": yanlis/fazla metin) ve bolgedeki her parca (soru numarasi haric)
//     metinde olmali (yoksa "metinde olmayan parca": dusmus metin); yalniz bosluk farki (bitisik harfler) gecer, sayilir.
//     Kaynak metin cikariciyla ayni eslemelerden gecer (extract_text.py --char-maps: CHAR_MAP, U+00AD -> "-" gibi).
//     Bolgede metin yoksa "metin yok". Bilgi icin sirali karsilastirma da sayilir (inOrder). Soru sayfa asarsa bbox
//     yalniz ilk sayfadadir: devami "parca yok" verir (2011-2022 verisinde yok, 2026-10-09).
//   cozulmus metin katmani (2021): decode-check kabulu (vision/<yil>/decode-check.json accepted true) zorunlu; pdftotext
//     ciktisi envanterdeki kaydirmayla cozulur (extract_text.py ile ayni kural ve DECODE_EXTRA); glif numarasi bosluk kod
//     noktasina denk gelen karakterler (kaydirma 29: & ' ( ) * =) pdftotext'te geri alinamaz, karsilastirma disi kalir.
// validate-report.json kapi 4 counts.years[<yil>]: layout, textOnly, passed, inOrder, failed/missing/dropped/noText/
// spacingOnly (soru numaralari), excludedTokens (cozulmus yil).
//
// corrections.json: [{ id, field, before, after, sourcePage, reason }]; field "prompt" ya da "choices.<harf>" (harf
// kagittaki, karistirma oncesi harf); before alanin tam degeri olmali, degilse hata. Duzeltme kagit metnine
// karistirmadan once uygulanir; kapi 4 duzeltilmemis metne bakar; text_hash bankadaki son metinden.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MOCK_SECTION_COUNTS, MOCK_YEARS, SECTIONS, findTopic, generalSlug } from "../../lib/imat/taxonomy.mjs";
import { hasUnbalancedDollar, katexIssues, markIssues } from "../sat/lib/content-audit.mjs";
import {
  CHOICE_LETTERS,
  applyCharMap,
  compareTokens,
  decodeShifted,
  locateInSource,
  normalizeForCompare,
  textHash,
  unrecoverableChars,
} from "./lib/text.mjs";
import {
  ALL_YEARS,
  BANK_PATH,
  CLASSIFY_DIR,
  CORRECTIONS_PATH,
  EXTRACT_DIR,
  FIGURES_DIR,
  IMAT_OUT,
  IMAT_SOURCE_DIR,
  INVENTORY_PATH,
  KEYS_DIR,
  SHUFFLE_EXEMPT_PATH,
  VISION_DIR,
  argValue,
  parseYears,
  questionId,
  readJson,
  writeJson,
} from "./paths.mjs";
import { CROP_REPORT_PATH, EDGE_SIGNOFF_PATH, readEdgeSignoff, unsignedSides } from "./crop-figures.mjs";
import { hasTextLayer, paperLayoutOf } from "./inventory.mjs";
import { KEY_PROOF_YEARS, SHUFFLE_YEARS, readShuffleExempt, shuffleOrder } from "./shuffle-choices.mjs";

const EXTRACT_PY = join(dirname(fileURLToPath(import.meta.url)), "extract_text.py");
const PYTHON = "/usr/bin/python3";
const REGION_MARGIN_PT = 2;
const MAX_FIGURE_BYTES = 512 * 1024;
const GK_LR = ["reading-general", "logic"];
const UNREADABLE = "[?]";
const FIGURE_CHOICE = "[see figure]";

const argv = process.argv.slice(2);
const requireFigures = argv.includes("--require-figures");
const noPdftotext = argv.includes("--no-pdftotext");

const gates = new Map();
const failures = [];
const warnings = [];
const yearFailures = new Map();

function gate(id, name) {
  if (!gates.has(id)) gates.set(id, { gate: id, name, ok: true, counts: {}, failures: [], warnings: [], notes: [] });
  const g = gates.get(id);
  return {
    g,
    fail(message, year) {
      g.ok = false;
      g.failures.push(message);
      failures.push(`kapi ${id}: ${message}`);
      if (year) yearFailures.set(year, (yearFailures.get(year) ?? 0) + 1);
    },
    warn(message) {
      g.warnings.push(message);
      warnings.push(`kapi ${id}: ${message}`);
    },
  };
}
// Rapor sirasi: kapilar numara sirasiyla (calisma sirasi farkli: 8 duzeltmeler 2-6'dan once).
const GATE_NAMES = [
  ["1", "sayim"],
  ["2", "kunye"],
  ["3", "isaret ve formul"],
  ["4", "kaynak metin (pdftotext)"],
  ["5", "anahtar ve karistirma"],
  ["6", "sekil"],
  ["7", "kimlik"],
  ["8", "duzeltmeler"],
];
const G = Object.fromEntries(GATE_NAMES.map(([id, name]) => [id, gate(id, name)]));

const label = (year, q) => `${year}:${q.number} ${q.id}`;

function countBy(items, key) {
  const out = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function mockSectionOf(number) {
  let end = 0;
  for (const section of SECTIONS) {
    end += MOCK_SECTION_COUNTS[section];
    if (number <= end) return section;
  }
  return null;
}

function selectedYears() {
  const value = argValue(argv, "--years");
  if (value) return parseYears(value);
  const years = ALL_YEARS.filter((year) => existsSync(join(EXTRACT_DIR, `${year}.json`)));
  if (years.length === 0) throw new Error(`extract dosyasi yok (${EXTRACT_DIR}); --years ver ya da once cikar`);
  return years;
}

// ------------------------------------------------------------------ girdi
const years = selectedYears();
if (!existsSync(INVENTORY_PATH)) throw new Error(`envanter yok: ${INVENTORY_PATH} (once: node scripts/imat/inventory.mjs)`);
const inventory = new Map(readJson(INVENTORY_PATH).map((entry) => [entry.year, entry]));
const topicsPath = join(CLASSIFY_DIR, "topics.json");
const topics = existsSync(topicsPath) ? readJson(topicsPath) : null;

const papers = [];
for (const year of years) {
  const entry = inventory.get(year);
  if (!entry) {
    G[1].fail(`${year}: envanterde yok`, year);
    continue;
  }
  const extractPath = join(EXTRACT_DIR, `${year}.json`);
  if (!existsSync(extractPath)) {
    G[1].fail(`${year}: ${extractPath} yok`, year);
    continue;
  }
  const extract = readJson(extractPath);
  if (extract.year !== year) G[1].fail(`${year}: extract year alani ${extract.year}`, year);
  let shuffled = null;
  if (SHUFFLE_YEARS.includes(year)) {
    const shuffledPath = join(EXTRACT_DIR, `${year}.shuffled.json`);
    if (existsSync(shuffledPath)) shuffled = readJson(shuffledPath);
    else G[5].fail(`${year}: ${shuffledPath} yok (once shuffle-choices.mjs --years ${year})`, year);
  }
  const keyPath = join(KEYS_DIR, `${year}.json`);
  const key = existsSync(keyPath) ? readJson(keyPath) : null;
  papers.push({ year, entry, extract, questions: [...(extract.questions ?? [])].sort((a, b) => a.number - b.number), shuffled, key });
}

// ------------------------------------------------------------------ 1 sayim + 7 kimlik
const seenIds = new Map();
for (const paper of papers) {
  const { year, entry, questions } = paper;
  const expected = entry.expectedQuestions;
  if (questions.length !== expected) G[1].fail(`${year}: ${questions.length} soru (beklenen ${expected})`, year);
  const numbers = new Set();
  for (const q of questions) {
    if (!Number.isInteger(q.number) || q.number < 1 || q.number > expected) G[1].fail(`${label(year, q)}: gecersiz numara`, year);
    if (numbers.has(q.number)) G[1].fail(`${label(year, q)}: tekrarli numara`, year);
    numbers.add(q.number);
    if (!/^[0-9a-f]{8}$/.test(String(q.id))) G[7].fail(`${label(year, q)}: gecersiz id`, year);
    else if (q.id !== questionId(year, q.number)) G[7].fail(`${label(year, q)}: id kurala uymuyor (sha256 imat:yil:numara)`, year);
    if (seenIds.has(q.id)) G[7].fail(`${label(year, q)}: id ${seenIds.get(q.id)} ile cakisiyor`, year);
    seenIds.set(q.id, label(year, q));
  }
  for (let n = 1; n <= expected; n += 1) if (!numbers.has(n)) G[1].fail(`${year}: ${n}. soru yok`, year);
  if (MOCK_YEARS.includes(year)) {
    if (expected !== 60) G[1].fail(`${year}: deneme kagidi 60 soru olmali (envanter ${expected})`, year);
    const bySection = countBy(questions, (q) => q.section);
    for (const section of SECTIONS) {
      if ((bySection[section] ?? 0) !== MOCK_SECTION_COUNTS[section]) {
        G[1].fail(`${year}: ${section} ${bySection[section] ?? 0} soru (beklenen ${MOCK_SECTION_COUNTS[section]})`, year);
      }
    }
    for (const q of questions) {
      if (q.section !== mockSectionOf(q.number)) G[1].fail(`${label(year, q)}: bolum ${q.section}, kagit sirasina gore ${mockSectionOf(q.number)}`, year);
    }
  }
  G[1].g.counts[year] = { questions: questions.length, expected, blocked: questions.filter((q) => q.blocked).length };
}
G[7].g.counts.ids = seenIds.size;

// ------------------------------------------------------------------ 8 duzeltmeler (kagit metnine, karistirmadan once)
const paperText = new Map();
const questionYear = new Map();
for (const paper of papers) {
  for (const q of paper.questions) {
    paperText.set(q.id, { prompt: q.prompt, choices: { ...(q.choices ?? {}) } });
    questionYear.set(q.id, paper.year);
  }
}
const knownIds = new Map();
for (const year of ALL_YEARS) for (let n = 1; n <= 80; n += 1) knownIds.set(questionId(year, n), year);

const appliedCorrections = [];
{
  const { g, fail, warn } = G[8];
  const raw = existsSync(CORRECTIONS_PATH) ? readJson(CORRECTIONS_PATH) : [];
  if (!Array.isArray(raw)) fail("corrections.json dizi olmali");
  const list = Array.isArray(raw) ? raw : [];
  const FIELDS = new Set(["prompt", ...CHOICE_LETTERS.map((letter) => `choices.${letter}`)]);
  let skipped = 0;
  list.forEach((c, index) => {
    const at = `duzeltme ${index + 1} (${c?.id} ${c?.field})`;
    const year = questionYear.get(c?.id);
    if (!year) {
      if (knownIds.has(c?.id)) skipped += 1;
      else fail(`${at}: id hicbir yil/numaraya ait degil`);
      return;
    }
    const problems = [];
    if (!FIELDS.has(c.field)) problems.push("gecersiz alan");
    if (typeof c.before !== "string") problems.push("before metin degil");
    if (typeof c.after !== "string" || !c.after.trim()) problems.push("after bos");
    if (c.before === c.after) problems.push("before ile after ayni");
    if (!Number.isInteger(c.sourcePage) || c.sourcePage < 1) problems.push("sourcePage tamsayi degil");
    if (typeof c.reason !== "string" || !c.reason.trim()) problems.push("reason bos");
    if (problems.length > 0) {
      fail(`${at}: ${problems.join(", ")}`, year);
      return;
    }
    const q = papers.find((p) => p.year === year).questions.find((item) => item.id === c.id);
    if (q.blocked) {
      warn(`${at}: soru bloke, duzeltme uygulanmadi`);
      return;
    }
    const text = paperText.get(c.id);
    const [, letter] = c.field.split(".");
    const current = letter ? text.choices[letter] : text.prompt;
    if (current !== c.before) {
      fail(`${label(year, q)}: ${at}: before alanin bugunku degeriyle eslesmiyor`, year);
      return;
    }
    if (letter) text.choices[letter] = c.after;
    else text.prompt = c.after;
    if (c.sourcePage !== q.page) g.notes.push(`${at}: sourcePage ${c.sourcePage}, soru sayfasi ${q.page}`);
    appliedCorrections.push({ id: c.id, year, number: q.number, field: c.field, sourcePage: c.sourcePage, reason: c.reason });
  });
  g.counts = { listed: list.length, applied: appliedCorrections.length, otherYears: skipped };
}

// ------------------------------------------------------------------ banka kayitlari: 2, 3, 5, 6
const bank = [];
const excluded = [];
const exemptRecords = [];
let exemptList = new Map();
try {
  exemptList = readShuffleExempt(SHUFFLE_EXEMPT_PATH);
} catch (error) {
  G[5].fail(`shuffle-exempt.json okunamadi: ${error.message}`);
}

function topicFor(year, q, examSet) {
  const { fail } = G[2];
  const assigned = topics?.[q.id];
  let section = q.section;
  let slug = generalSlug(SECTIONS.includes(section) ? section : SECTIONS[0]);
  if (assigned) {
    section = assigned.section;
    slug = assigned.topicSlug;
    if (section !== q.section && !(examSet === "bank" && GK_LR.includes(section) && GK_LR.includes(q.section))) {
      fail(`${label(year, q)}: topics.json bolumu ${section}, kayit ${q.section} (yalniz banka yilinda GK/LR arasi izinli)`, year);
    }
  }
  const topic = findTopic(slug);
  if (!topic) fail(`${label(year, q)}: topic_slug ${slug} taksonomide yok`, year);
  else if (topic.section !== section) fail(`${label(year, q)}: topic_slug ${slug} ${topic.section} bolumunde, soru ${section}`, year);
  return { section, slug, label: topic?.label ?? null };
}

function keyProblems(paper) {
  // keys/<yil>.json: "hep A" kaniti; numaralar extract ile ayni, her deger A.
  const { year, key, questions } = paper;
  if (!key) return KEY_PROOF_YEARS.includes(year) ? [`keys/${year}.json yok (kaynak kurali kaniti zorunlu)`] : [];
  const problems = [];
  const numbers = new Set(questions.map((q) => String(q.number)));
  const keyNumbers = Object.keys(key);
  if (keyNumbers.length !== numbers.size || keyNumbers.some((n) => !numbers.has(n))) problems.push(`keys/${year}.json numaralari extract ile ayni degil`);
  const notA = keyNumbers.filter((n) => key[n] !== "A");
  if (notA.length > 0) problems.push(`keys/${year}.json ${notA.length} soruda A degil (kaynak kurali tutmuyor): ${notA.join(", ")}`);
  return problems;
}

for (const paper of papers) {
  const { year, entry, extract, questions, shuffled } = paper;
  const examSet = extract.exam_set ?? (MOCK_YEARS.includes(year) ? "mock" : "bank");
  const shuffleYear = SHUFFLE_YEARS.includes(year);
  for (const problem of shuffleYear ? keyProblems(paper) : []) G[5].fail(`${year}: ${problem}`, year);
  if (!shuffleYear && !paper.key) G[5].fail(`${year}: keys/${year}.json yok (karistirilmayan yilda anahtar zorunlu)`, year);
  const shuffledById = new Map((shuffled?.questions ?? []).map((q) => [q.id, q]));

  for (const q of questions) {
    if (q.blocked) {
      const reason = q.blockReason ?? "blocked";
      excluded.push({ id: q.id, year, number: q.number, reason });
      warnings.push(`bloke: ${label(year, q)} (${reason}) bankaya girmedi`);
      continue;
    }
    const at = label(year, q);
    const text = paperText.get(q.id);

    // 5 anahtar ve karistirma
    let choices = text.choices;
    let correct = null;
    let shuffle = null;
    if (shuffleYear) {
      const sq = shuffledById.get(q.id);
      const recorded = shuffled?.shuffleMap?.[q.id] ?? sq?.shuffle ?? null;
      if (!shuffled) {
        // dosya yok: yukarida bir kez hata verildi
      } else if (!sq || !recorded) {
        G[5].fail(`${at}: karistirilmis dosyada kayit ya da shuffle yok (shuffle-choices.mjs yeniden)`, year);
      } else if (recorded.exempt === true) {
        // Istisna: kagit sirasi, dogru A (siklar sekil icinde cizili).
        if (!exemptList.has(q.id)) G[5].fail(`${at}: shuffle istisnasi shuffle-exempt.json listesinde yok`, year);
        if (typeof recorded.reason !== "string" || !recorded.reason.trim()) G[5].fail(`${at}: istisna gerekcesi bos`, year);
        if (sq.correct_answer !== "A") G[5].fail(`${at}: istisna kaydinda correct_answer ${sq.correct_answer} (A olmali)`, year);
        const stale = sq.prompt !== q.prompt || CHOICE_LETTERS.some((letter) => sq.choices?.[letter] !== q.choices?.[letter]);
        if (stale) G[5].fail(`${at}: karistirilmis dosya extract ile ayni degil (eski); shuffle-choices.mjs --years ${year} yeniden calistir`, year);
        choices = {};
        for (const letter of CHOICE_LETTERS) if (text.choices[letter] !== undefined) choices[letter] = text.choices[letter];
        correct = "A";
        shuffle = { exempt: true, reason: recorded.reason };
        exemptRecords.push({ id: q.id, year, number: q.number, reason: recorded.reason });
      } else {
        if (exemptList.has(q.id)) G[5].fail(`${at}: shuffle-exempt.json listesinde ama karistirilmis (shuffle-choices.mjs --years ${year} yeniden)`, year);
        const expectedOrder = shuffleOrder(q.id);
        const order = Array.isArray(recorded.order) ? recorded.order : [];
        if (recorded.original !== "A") G[5].fail(`${at}: shuffle.original ${recorded.original} (A olmali)`, year);
        if (order.join("") !== expectedOrder.join("")) G[5].fail(`${at}: shuffle.order deterministik siradan farkli`, year);
        if (recorded.shuffled !== CHOICE_LETTERS[order.indexOf("A")]) G[5].fail(`${at}: shuffle.shuffled asil A'nin yeni harfi degil`, year);
        if (sq.correct_answer !== recorded.shuffled) G[5].fail(`${at}: correct_answer ${sq.correct_answer} != shuffle.shuffled ${recorded.shuffled}`, year);
        const stale = sq.prompt !== q.prompt || CHOICE_LETTERS.some((letter, k) => sq.choices?.[letter] !== q.choices?.[order[k]]);
        if (stale) G[5].fail(`${at}: karistirilmis dosya extract ile ayni degil (eski); shuffle-choices.mjs --years ${year} yeniden calistir`, year);
        // Yeni k. harf = kagittaki order[k] sikki (duzeltilmis metin); eksik sik eksik kalir, kapi 2 yakalar.
        choices = {};
        CHOICE_LETTERS.forEach((letter, k) => {
          if (text.choices[order[k]] !== undefined) choices[letter] = text.choices[order[k]];
        });
        correct = recorded.shuffled;
        shuffle = { original: recorded.original, shuffled: recorded.shuffled, order: [...order] };
        if (CHOICE_LETTERS.some((letter) => normalizeForCompare(text.choices[letter]) === FIGURE_CHOICE)) {
          G[5].fail(`${at}: sekil icinde cizili siklar karistirilamaz ([see figure])`, year);
        }
      }
    } else if (paper.key) {
      correct = paper.key[String(q.number)] ?? null;
      if (!correct) G[5].fail(`${at}: anahtarda yok`, year);
    }

    // 2 kunye
    const { fail: fail2 } = G[2];
    const expectedSet = MOCK_YEARS.includes(year) ? "mock" : "bank";
    if (examSet !== expectedSet) fail2(`${at}: exam_set ${examSet}, yil ${year} ${expectedSet === "mock" ? "deneme yili" : "deneme yili degil"}`, year);
    if (!SECTIONS.includes(q.section)) fail2(`${at}: gecersiz bolum ${q.section}`, year);
    const keys = Object.keys(choices ?? {});
    if (keys.length !== 5 || CHOICE_LETTERS.some((letter) => !keys.includes(letter))) fail2(`${at}: siklar ${keys.sort().join("") || "-"} (A-E bekleniyor)`, year);
    for (const letter of CHOICE_LETTERS) {
      if (choices?.[letter] !== undefined && (typeof choices[letter] !== "string" || !choices[letter].trim())) fail2(`${at}: sik ${letter} bos`, year);
    }
    if (typeof text.prompt !== "string" || !text.prompt.trim()) fail2(`${at}: soru metni bos`, year);
    if (!CHOICE_LETTERS.includes(correct)) fail2(`${at}: dogru cevap tek harf A-E degil (${correct})`, year);
    if (!Number.isInteger(q.page) || q.page < 1) fail2(`${at}: kaynak sayfa yok`, year);
    const topic = topicFor(year, q, examSet);
    const normalized = CHOICE_LETTERS.map((letter) => normalizeForCompare(choices?.[letter]));
    if (new Set(normalized).size < normalized.length) G[2].warn(`${at}: ayni metinli siklar var`);

    // 3 isaret ve formul
    for (const [field, value] of [["prompt", text.prompt], ...CHOICE_LETTERS.map((letter) => [`choices.${letter}`, choices?.[letter]])]) {
      const value_ = String(value ?? "");
      for (const issue of markIssues(value_)) G[3].fail(`${at} ${field}: ${issue}`, year);
      const katex = katexIssues(value_);
      if (katex.length > 0) G[3].fail(`${at} ${field}: ${katex.length} formul KaTeX ile derlenmiyor`, year);
      if (hasUnbalancedDollar(value_)) G[3].fail(`${at} ${field}: dengesiz $`, year);
      if (value_.includes(UNREADABLE)) G[3].fail(`${at} ${field}: okunamayan parca [?]`, year);
    }

    // 6 sekil
    const figurePath = q.figureBox ? `${year}/${q.id}.webp` : null;

    bank.push({
      id: q.id,
      year,
      number: q.number,
      exam_set: examSet,
      section: topic.section,
      topic: topic.label,
      topic_slug: topic.slug,
      prompt: text.prompt,
      choices,
      correct_answer: correct,
      figure_path: figurePath,
      source_file: entry.file,
      source_page: q.page ?? null,
      needs_review: true,
      shuffle,
      text_hash: textHash(text.prompt, choices),
    });
  }
}

G[5].g.counts.exempt = exemptRecords.length;

// ------------------------------------------------------------------ 4 kaynak metin (metin yili)
{
  const { g, fail, warn } = G[4];
  const counts = { compared: 0, equal: 0, visionRewritten: 0, textYears: [], decodedYears: [], years: {} };
  const textPapers = papers.filter((paper) => hasTextLayer(paper.entry) && paper.extract.source === "text");
  if (noPdftotext && textPapers.length > 0) warn(`--no-pdftotext: kaynak karsilastirmasi atlandi (${textPapers.map((paper) => paper.year).join(", ")})`);
  let charMaps = null;
  const loadCharMaps = () => {
    // Cikariciyla ayni eslemeler (extract_text.py --char-maps; sinav metni yok). Okunamazsa hata.
    if (charMaps) return charMaps;
    const run = spawnSync(PYTHON, ["-I", EXTRACT_PY, "--char-maps"], { encoding: "utf8" });
    if (run.status !== 0) throw new Error(`extract_text.py --char-maps cikis ${run.status} (${String(run.stderr || run.error || "").trim().split("\n").pop()})`);
    charMaps = JSON.parse(run.stdout);
    return charMaps;
  };
  const pdftotext = (pdf, page, region) => {
    const args = ["-layout", "-f", String(page), "-l", String(page)];
    if (region) {
      const [x0, top, x1, bottom] = region;
      const x = Math.max(0, Math.floor(x0 - REGION_MARGIN_PT));
      const y = Math.max(0, Math.floor(top - REGION_MARGIN_PT));
      args.push("-x", String(x), "-y", String(y), "-W", String(Math.ceil(x1 + REGION_MARGIN_PT) - x), "-H", String(Math.ceil(bottom + REGION_MARGIN_PT) - y));
    }
    return execFileSync("pdftotext", [...args, pdf, "-"], { encoding: "utf8" });
  };
  for (const paper of textPapers) {
    const { year, entry, questions } = paper;
    const layout = paperLayoutOf(year);
    const decoded = entry.textLayer === "decoded";
    counts.textYears.push(year);
    const yearCounts = { layout, textOnly: 0, passed: 0, failed: [] };
    if (layout === "cambridge") Object.assign(yearCounts, { inOrder: 0, missing: [], dropped: [], noText: [], spacingOnly: [] });
    counts.years[year] = yearCounts;
    const pdf = join(IMAT_SOURCE_DIR, entry.file);
    let pdfOk = !noPdftotext;
    // Kaynak PDF varligi ve sha256: her metin yilinda once (cozulmus yil dahil).
    if (pdfOk && !existsSync(pdf)) {
      fail(`${year}: kaynak PDF yok (${pdf})`, year);
      pdfOk = false;
    } else if (pdfOk && createHash("sha256").update(readFileSync(pdf)).digest("hex") !== entry.sha256) {
      fail(`${year}: kaynak PDF envanterdeki sha256 ile ayni degil (inventory.mjs --check)`, year);
      pdfOk = false;
    }
    let exclude = [];
    if (decoded) {
      // Cozulmus metin katmani (2021): cikarma decode-check kabuluyle yapildi; kabul yine zorunlu. pdftotext ciktisi ayni
      // kaydirmayla cozulup karsilastirilir.
      counts.decodedYears.push(year);
      const checkPath = join(VISION_DIR, String(year), "decode-check.json");
      const accepted = existsSync(checkPath) ? readJson(checkPath).accepted ?? null : null;
      if (accepted !== true) fail(`${year}: cozulmus metin katmani ama decode-check kabul edilmedi (accepted ${accepted}; ${checkPath})`, year);
      exclude = unrecoverableChars(entry.decodeShift);
      yearCounts.excludedTokens = 0;
      g.notes.push(
        `${year}: cozulmus metin katmani (kaydirma ${entry.decodeShift}); pdftotext ciktisi ayni kaydirmayla cozulup karsilastirildi; ` +
          `pdftotext'te geri alinamayan ${exclude.join(" ")} karsilastirma disi`
      );
    }
    let maps = null;
    if (pdfOk && (layout === "cambridge" || decoded)) {
      try {
        maps = loadCharMaps();
      } catch (error) {
        fail(`${year}: ${error.message}`, year);
        pdfOk = false;
      }
    }
    const normalize = (text) => {
      const decodedText = decoded ? decodeShifted(text, entry.decodeShift, maps.decodeExtra) : text;
      return applyCharMap(decodedText, maps.layouts[layout]);
    };
    const pages = new Map();
    const pageText = (at, page) => {
      if (!pages.has(page)) {
        try {
          const raw = pdftotext(pdf, page, null);
          pages.set(page, layout === "mur" && !decoded ? raw : normalize(raw));
        } catch (error) {
          fail(`${at}: pdftotext sayfa ${page} okunamadi (${String(error.message).split("\n")[0]})`, year);
          pages.set(page, null);
        }
      }
      return pages.get(page);
    };
    for (const q of questions) {
      if (q.blocked) continue;
      const at = label(year, q);
      if (q.visionRewritten) {
        counts.visionRewritten += 1;
        continue;
      }
      if (q.hasImage) {
        fail(`${at}: hasImage soru goruntuden yazilmadi (once merge-vision.mjs)`, year);
        continue;
      }
      yearCounts.textOnly += 1;
      if (!pdfOk) continue;
      const source = pageText(at, q.page);
      if (source === null) continue;
      counts.compared += 1;
      if (layout === "mur") {
        const parts = [{ field: "prompt", text: q.prompt }, ...CHOICE_LETTERS.map((letter) => ({ field: `choices.${letter}`, text: `${letter}) ${q.choices?.[letter] ?? ""}` }))];
        const result = locateInSource(parts, source);
        if (result.ok) {
          counts.equal += 1;
          yearCounts.passed += 1;
        } else {
          yearCounts.failed.push(q.number);
          fail(`${at}: kaynak sayfa ${q.page} ile eslesmiyor (${result.field}, ${result.word + 1}. kelime; ${result.matched}/${result.chars} karakter tutuyor)`, year);
        }
        continue;
      }
      // cambridge: yalin sik harfi, sorunun kaynak bolgesiyle sira bagimsiz parca karsilastirmasi
      const parts = [{ field: "prompt", text: q.prompt }, ...CHOICE_LETTERS.map((letter) => ({ field: `choices.${letter}`, text: `${letter} ${q.choices?.[letter] ?? ""}` }))];
      if (locateInSource(parts, source).ok) yearCounts.inOrder += 1;
      const box = q.bbox;
      if (!Array.isArray(box) || box.length !== 4 || !box.every(Number.isFinite) || box[2] <= box[0] || box[3] <= box[1]) {
        yearCounts.failed.push(q.number);
        fail(`${at}: bbox yok ya da gecersiz; soru bolgesi okunamadi`, year);
        continue;
      }
      let region;
      try {
        region = normalize(pdftotext(pdf, q.page, box));
      } catch (error) {
        yearCounts.failed.push(q.number);
        fail(`${at}: pdftotext sayfa ${q.page} soru bolgesi okunamadi (${String(error.message).split("\n")[0]})`, year);
        continue;
      }
      if (!region.replace(/\s/gu, "")) {
        yearCounts.failed.push(q.number);
        yearCounts.noText.push(q.number);
        fail(`${at}: kaynak sayfa ${q.page} soru bolgesinde metin yok (pdftotext; bbox ${box.join(", ")})`, year);
        continue;
      }
      const result = compareTokens(parts, region, { extra: [String(q.number)], exclude });
      if (decoded) yearCounts.excludedTokens += result.excluded;
      if (result.ok) {
        counts.equal += 1;
        yearCounts.passed += 1;
        if (result.spacingOnly) {
          yearCounts.spacingOnly.push(q.number);
          g.notes.push(`${at}: kaynakla yalniz bosluk farki (pdftotext harfleri bitisik ya da kelimeyi bolunmus veriyor)`);
        }
        continue;
      }
      yearCounts.failed.push(q.number);
      if (result.missing.length > 0) {
        yearCounts.missing.push(q.number);
        const first = result.missing[0];
        fail(`${at}: kaynak sayfa ${q.page} soru bolgesinde ${result.missing.length} parca yok (ilk: ${first.field} ${first.word + 1}. kelime)`, year);
      }
      if (result.dropped > 0) {
        yearCounts.dropped.push(q.number);
        fail(`${at}: kaynak sayfa ${q.page} soru bolgesinde metinde olmayan ${result.dropped} parca var (dusmus metin olabilir)`, year);
      }
    }
  }
  g.counts = counts;
  g.notes.push(
    "Karsilastirma duzeltilmemis kagit metniyle, formulsuz; mur sirali ve bosluksuz, cambridge sorunun kaynak bolgesinde sira bagimsiz parca; normallestirmeler scripts/imat/lib/text.mjs basinda."
  );
}

// ------------------------------------------------------------------ 6 sekil dosyalari
{
  // Kenar onayi (crop-figures.mjs ile ayni kural): figure-crop-report.json'daki her dolgulu yan, edge-signoff.json'da
  // ayni id + yan + pageBox ile onayli olmali; degilse hata (kutu sekli kesiyor olabilir).
  const { g, fail, warn } = G[6];
  const referenced = new Set();
  let present = 0;
  const cropReport = new Map((existsSync(CROP_REPORT_PATH) ? readJson(CROP_REPORT_PATH) : []).map((entry) => [entry.id, entry]));
  let signoff = new Map();
  try {
    signoff = readEdgeSignoff(EDGE_SIGNOFF_PATH);
  } catch (error) {
    fail(`edge-signoff.json okunamadi: ${error.message}`);
  }
  let signedPadded = 0;
  for (const record of bank) {
    if (!record.figure_path) continue;
    referenced.add(record.figure_path);
    const at = `${record.year}:${record.number} ${record.id}`;
    const crop = cropReport.get(record.id);
    if (!crop) {
      if (requireFigures) fail(`${at}: figure-crop-report.json kaydi yok (crop-figures.mjs)`, record.year);
      else warn(`${at}: figure-crop-report.json kaydi yok`);
    } else {
      const padded = crop.paddedSides ?? [];
      for (const side of unsignedSides(record.id, padded, crop.pageBox, signoff)) {
        fail(`${at}: ${side} kenari beyaz degil ve edge-signoff.json onayi yok (sekil kesilmis olabilir)`, record.year);
      }
      if (padded.length > 0 && unsignedSides(record.id, padded, crop.pageBox, signoff).length === 0) {
        signedPadded += 1;
        g.notes.push(`${at}: beyaz dolgu onayli (${padded.join(", ")})`);
      }
    }
    const file = join(FIGURES_DIR, record.figure_path);
    if (!existsSync(file)) {
      if (requireFigures) fail(`${at}: ${record.figure_path} yok (crop-figures.mjs)`, record.year);
      else warn(`${at}: ${record.figure_path} henuz yok`);
      continue;
    }
    present += 1;
    const head = readFileSync(file).subarray(0, 12);
    if (head.toString("ascii", 0, 4) !== "RIFF" || head.toString("ascii", 8, 12) !== "WEBP") fail(`${at}: ${record.figure_path} WebP degil`, record.year);
    const bytes = statSync(file).size;
    if (bytes > MAX_FIGURE_BYTES) fail(`${at}: ${record.figure_path} ${bytes} bayt > 512 KB`, record.year);
    if (crop && crop.bytes !== bytes) fail(`${at}: dosya ${bytes} bayt, figure-crop-report.json ${crop.bytes} (crop-figures.mjs yeniden)`, record.year);
  }
  for (const year of years) {
    const dir = join(FIGURES_DIR, String(year));
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      if (name.endsWith(".webp") && !referenced.has(`${year}/${name}`)) warn(`${year}/${name}: bankada karsiligi yok (eski ya da bloke soru)`);
    }
  }
  g.counts = { figures: referenced.size, present, signedPadded, requireFigures };
}

// ------------------------------------------------------------------ cikti
bank.sort((a, b) => a.year - b.year || a.number - b.number);
writeJson(BANK_PATH, { bank, failures, warnings, excluded });

const perYear = {};
for (const paper of papers) {
  const records = bank.filter((record) => record.year === paper.year);
  const bySection = Object.fromEntries(SECTIONS.map((section) => [section, paper.questions.filter((q) => q.section === section).length]));
  const other = paper.questions.filter((q) => !SECTIONS.includes(q.section)).length;
  if (other > 0) bySection.other = other;
  perYear[paper.year] = {
    questions: paper.questions.length,
    bank: records.length,
    bySection,
    figures: records.filter((record) => record.figure_path).length,
    blocked: excluded.filter((item) => item.year === paper.year).length,
    failures: yearFailures.get(paper.year) ?? 0,
  };
}
const report = {
  ok: failures.length === 0,
  options: { years, requireFigures, pdftotext: !noPdftotext, topics: Boolean(topics), out: IMAT_OUT },
  totals: { bank: bank.length, excluded: excluded.length, failures: failures.length, warnings: warnings.length, corrections: appliedCorrections.length },
  years: perYear,
  gates: GATE_NAMES.map(([id]) => {
    const g = gates.get(id);
    return {
      gate: g.gate,
      name: g.name,
      ok: g.ok,
      counts: g.counts,
      failureCount: g.failures.length,
      failures: g.failures.slice(0, 50),
      warningCount: g.warnings.length,
      warnings: g.warnings.slice(0, 50),
      notes: g.notes,
    };
  }),
  corrections: appliedCorrections,
  shuffleExempt: exemptRecords,
};
writeJson(join(IMAT_OUT, "validate-report.json"), report);

for (const [id] of GATE_NAMES) {
  const g = gates.get(id);
  const extra = `${g.failures.length ? ` (${g.failures.length} hata)` : ""}${g.warnings.length ? ` (${g.warnings.length} uyari)` : ""}`;
  console.log(`${g.ok ? "OK  " : "HATA"} kapi ${g.gate} ${g.name}: ${JSON.stringify(g.counts)}${extra}`);
  for (const message of g.failures.slice(0, 5)) console.log(`       ${message}`);
}
for (const [year, counts] of Object.entries(perYear)) console.log(`${year}: ${JSON.stringify(counts)}`);
console.log(`bank.json: ${bank.length} soru, ${excluded.length} bloke, ${failures.length} hata, ${warnings.length} uyari, ${appliedCorrections.length} duzeltme -> ${BANK_PATH}`);
if (failures.length > 0) process.exitCode = 1;
