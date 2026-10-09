// validate-bank.mjs fikstur testi (plan Gorev 10): gecici IMAT_OUT'ta sentetik 2025 (deneme) kagidi kurar, betigi
// alt surec olarak calistirir; saglam fikstur gecer, her bozulma kendi kapisinda hata verir. Ag, veritabani yok.
// Cogu senaryoda fikstur source "vision" (kapi 4 calismaz); kapi 4 senaryolari (Gorev 16 araclari) lib/fixture-pdf.mjs
// ile uydurma metinli PDF yazar ve pdftotext (poppler) + /usr/bin/python3 (extract_text.py --char-maps) ister.
// Soru metinleri uydurmadir.
//
//   PATH=/usr/local/bin:$PATH node scripts/imat/test-validate-bank.mjs   (npm run test:imat-validate)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { MOCK_SECTION_COUNTS, SECTIONS } from "../../lib/imat/taxonomy.mjs";
import { makePdf } from "./lib/fixture-pdf.mjs";
import { applyCharMap, compareTokens, decodeShifted, locateInSource, normalizeForCompare, textHash, unrecoverableChars } from "./lib/text.mjs";
import { questionId } from "./paths.mjs";
import { exemptQuestion, shuffleQuestion } from "./shuffle-choices.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const VALIDATOR = join(HERE, "validate-bank.mjs");
const LETTERS = ["A", "B", "C", "D", "E"];

function sectionOf(number) {
  let end = 0;
  for (const section of SECTIONS) {
    end += MOCK_SECTION_COUNTS[section];
    if (number <= end) return section;
  }
  throw new Error(`numara ${number} > 60`);
}

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function read(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// 60 soruluk sentetik kagit; 1. soruda sekil, 2. soruda duzeltme.
function paper(year, { examSet } = {}) {
  const questions = [];
  for (let number = 1; number <= 60; number += 1) {
    const q = {
      id: questionId(year, number),
      number,
      section: sectionOf(number),
      page: Math.ceil(number / 6),
      bbox: null,
      prompt: `Fixture question ${number}: which option is listed first?`,
      choices: Object.fromEntries(LETTERS.map((letter) => [letter, `option ${letter.toLowerCase()}${number}`])),
      hasImage: number === 1,
      imageBoxes: [],
    };
    if (number === 1) q.figureBox = { kind: "diagram", box: [10, 10, 120, 90], space: "page", image: "/fixture/p-01.png", page: 1 };
    if (number === 2) q.prompt = "Fixture question 2 with a typo: whcih option is listed first?";
    questions.push(q);
  }
  return { year, source: "vision", ...(examSet ? { exam_set: examSet } : {}), questions };
}

function shuffled(extract) {
  const questions = [];
  const shuffleMap = {};
  for (const q of extract.questions) {
    const { question, entry } = shuffleQuestion(q);
    questions.push(question);
    shuffleMap[q.id] = entry;
  }
  return { ...extract, questions, shuffleMap };
}

async function buildFixture(root, { year = 2025, examSet } = {}) {
  const extract = paper(year, { examSet });
  write(join(root, "inventory.json"), [
    { year, file: `fixture-${year}.pdf`, bytes: 1, sha256: "0".repeat(64), pages: 10, textLayer: "ok", expectedQuestions: 60 },
  ]);
  write(join(root, "extract", `${year}.json`), extract);
  write(join(root, "extract", `${year}.shuffled.json`), shuffled(extract));
  if (year === 2025) write(join(root, "keys", "2025.json"), Object.fromEntries(extract.questions.map((q) => [String(q.number), "A"])));
  const figure = join(root, "figures", String(year), `${questionId(year, 1)}.webp`);
  mkdirSync(dirname(figure), { recursive: true });
  await sharp({ create: { width: 24, height: 16, channels: 3, background: "#ffffff" } }).webp().toFile(figure);
  write(join(root, "figures", "figure-crop-report.json"), [
    {
      id: questionId(year, 1),
      year,
      number: 1,
      kind: "diagram",
      bytes: statSync(figure).size,
      width: 24,
      height: 16,
      page: 1,
      cropPx: [10, 10, 120, 90],
      marginPx: { left: 0, top: 0, right: 0, bottom: 0 },
      paddedSides: [],
      quality: 90,
      pageBox: [10, 10, 120, 90],
      written: true,
    },
  ]);
  write(join(root, "corrections.json"), [
    {
      id: questionId(year, 2),
      field: "prompt",
      before: "Fixture question 2 with a typo: whcih option is listed first?",
      after: "Fixture question 2 with a typo: which option is listed first?",
      sourcePage: 1,
      reason: "fixture: transcription typo",
    },
  ]);
  return extract;
}

// Karistirma istisnasi: siklar sekil icinde cizili soru (shuffle-exempt.json); karistirilmis dosyada kagit sirasi, dogru A.
const EXEMPT_REASON = "choices are drawn inside the figure; cannot be reordered";
function exemptFixture(root, year, number, { correct } = {}) {
  const id = questionId(year, number);
  write(join(root, "shuffle-exempt.json"), [{ id, reason: EXEMPT_REASON }]);
  const extractPath = join(root, "extract", `${year}.json`);
  const extract = read(extractPath);
  const source = extract.questions.find((q) => q.number === number);
  source.choices = Object.fromEntries(LETTERS.map((letter) => [letter, "[see figure]"]));
  write(extractPath, extract);
  const shuffledPath = join(root, "extract", `${year}.shuffled.json`);
  const data = read(shuffledPath);
  const { question, entry } = exemptQuestion(source, EXEMPT_REASON);
  if (correct) question.correct_answer = correct;
  data.questions = data.questions.map((q) => (q.number === number ? question : q));
  data.shuffleMap[id] = entry;
  write(shuffledPath, data);
}

// Hem extract hem karistirilmis dosyada ayni soruyu degistirir (eski karistirma uyarisi karismasin).
function mutateQuestion(root, year, number, fn) {
  for (const name of [`${year}.json`, `${year}.shuffled.json`]) {
    const path = join(root, "extract", name);
    const data = read(path);
    fn(data.questions.find((q) => q.number === number), name.includes("shuffled"), data);
    write(path, data);
  }
}

function run(root, args) {
  const env = { ...process.env, IMAT_OUT: root, IMAT_SOURCE_DIR: join(root, "sources") };
  const result = spawnSync(process.execPath, [VALIDATOR, ...args], { env, encoding: "utf8" });
  const bankPath = join(root, "bank.json");
  let output = null;
  try {
    output = read(bankPath);
  } catch {
    output = null;
  }
  return { root, status: result.status, stdout: result.stdout, stderr: result.stderr, output };
}

// ------------------------------------------------------------------ kapi 4 fikstur yardimcilari
// Kaynak PDF'i sources/ altina yazar; envanterdeki bytes ve sha256 PDF'e esitlenir (sha: false ise envanter eski kalir).
function writeSourcePdf(root, year, pages, { sha = true, ...options } = {}) {
  const pdf = makePdf(pages, options);
  const file = join(root, "sources", `fixture-${year}.pdf`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, pdf);
  if (sha) {
    const inventoryPath = join(root, "inventory.json");
    const digest = createHash("sha256").update(pdf).digest("hex");
    write(inventoryPath, read(inventoryPath).map((entry) => (entry.year === year ? { ...entry, bytes: pdf.length, sha256: digest } : entry)));
  }
}

// Metin yili: source "text"; compared disindaki her soru goruntuden yazilmis sayilir (kapi 4 atlar). edit(q) compared
// sorulari degistirebilir; karistirilmis dosya extract'tan yeniden kurulur (eski karistirma hatasi karismasin).
function textYear(root, year, compared, edit = () => {}) {
  const extractPath = join(root, "extract", `${year}.json`);
  const extract = read(extractPath);
  extract.source = "text";
  for (const q of extract.questions) {
    if (compared.includes(q.number)) edit(q);
    else q.visionRewritten = true;
  }
  write(extractPath, extract);
  write(join(root, "extract", `${year}.shuffled.json`), shuffled(extract));
}

// Soru satirlari (uydurma): numara x 50, metin x 80; sik harfi x 80, sik metni x 110. numberLine: numaranin satiri (2011
// ortali sik harfi gibi ikinci satira konabilir). Kagit bicimi: Cambridge numara "3", yalin harf "A"; MUR "3." ve "A)".
// Donus { lines, bbox } (bbox PDF noktasi, extract bbox'i gibi).
function questionLines(number, top, prompt, choices, { numberLine = 0, numberText = String(number), letterText = (letter) => letter } = {}) {
  const lines = [{ x: 50, top: top + 12 * numberLine, text: numberText }];
  prompt.forEach((text, k) => lines.push({ x: 80, top: top + 12 * k, text }));
  const start = top + 12 * prompt.length + 8;
  LETTERS.forEach((letter, k) => {
    lines.push({ x: 80, top: start + 12 * k, text: letterText(letter) });
    lines.push({ x: 110, top: start + 12 * k, text: choices[letter] });
  });
  return { lines, bbox: [48, top - 1, 560, start + 12 * 4 + 11] };
}

const choicesOf = (number) => Object.fromEntries(LETTERS.map((letter) => [letter, `option ${letter.toLowerCase()}${number}`]));
const CAMBRIDGE_Q3_PROMPT = "Fixture question 3: which well-known option is listed first; or last?";
// Cambridge kagidi (2022), sayfa 1'de soru 3 ve 4 (digerleri goruntuden yazilmis). Soru 3: tire ve noktali virgul Word
// ciktisi gibi U+00AD ve U+037E (CHAR_MAP olmadan tutmaz). Soru 4: numara ikinci satirda, pdftotext sirasi cikaricinin
// sirasindan farkli (sirali karsilastirma tutmaz, parca karsilastirmasi tutar).
function cambridgeFixture(root, { pdfPrompt3 = CAMBRIDGE_Q3_PROMPT, extractPrompt3 = CAMBRIDGE_Q3_PROMPT, q3Box = null } = {}) {
  const q3 = questionLines(3, 100, [pdfPrompt3.replace("-", "\u00ad")], choicesOf(3));
  const q4 = questionLines(4, 220, ["Fixture question 4:", "which option is listed first?"], choicesOf(4), { numberLine: 1 });
  textYear(root, 2022, [3, 4], (q) => {
    if (q.number === 3) q.prompt = extractPrompt3;
    q.bbox = q.number === 3 ? (q3Box ?? q3.bbox) : q4.bbox;
  });
  writeSourcePdf(root, 2022, [[...q3.lines, ...q4.lines]], { toUnicode: { 0xad: 0xad, 0x3b: 0x37e } });
}

// MUR kagidi (2025), sayfa 1'de soru 3: "3." numara, "A) " sik harfi. bare: true sik harfleri yalin (MUR kurali tutmamali).
function murFixture(root, { bare = false } = {}) {
  const q3 = questionLines(3, 100, ["Fixture question 3: which option is listed first?"], choicesOf(3), {
    numberText: "3.",
    letterText: bare ? (letter) => letter : (letter) => `${letter})`,
  });
  textYear(root, 2025, [3], (q) => (q.bbox = q3.bbox));
  writeSourcePdf(root, 2025, [q3.lines]);
}

// Cozulmus metin katmanli yil (2021): PDF metni 29 kaydirmali (lib/fixture-pdf.mjs shift). Kaydirmada pdftotext'in
// verebildigi karakterlerle uydurma soru (harf; parantez geri alinamaz, karsilastirma disi kalir).
const DECODED_PROMPT = "Which option (alpha) is listed first";
const DECODED_CHOICES = { A: "option alpha", B: "option beta", C: "option gamma", D: "option delta", E: "option epsilon" };
function decodedPdf(root, { sha = true } = {}) {
  const q3 = questionLines(3, 100, [DECODED_PROMPT], DECODED_CHOICES);
  writeSourcePdf(root, 2021, [q3.lines], { shift: 29, sha });
  return q3.bbox;
}

const roots = [];
async function scenario(name, setup, check, { year = 2025, examSet, args } = {}) {
  const root = mkdtempSync(join(tmpdir(), "imat-validate-"));
  roots.push(root);
  await buildFixture(root, { year, examSet });
  if (setup) setup(root);
  const result = run(root, args ?? ["--years", String(year), "--require-figures"]);
  try {
    check(result);
  } catch (error) {
    console.error(`--- ${name}\n${result.stdout}\n${result.stderr}`);
    throw error;
  }
  console.log(`ok - ${name}`);
}

function expectFailure(pattern) {
  return (result) => {
    assert.equal(result.status, 1, "cikis 1 bekleniyor");
    assert.ok(result.output, "bank.json yine yazilmali");
    assert.ok(
      result.output.failures.some((message) => pattern.test(message)),
      `beklenen hata yok: ${pattern}\n  ${result.output.failures.join("\n  ")}`
    );
  };
}

try {
  // textHash ve normalizeForCompare
  {
    const choices = { A: "a", B: "b", C: "c", D: "d", E: "e" };
    const expected = createHash("sha256").update("p\na\nb\nc\nd\ne").digest("hex").slice(0, 12);
    assert.equal(textHash("p", choices), expected);
    assert.equal(textHash("p", { E: "e", D: "d", C: "c", B: "b", A: "a" }), expected, "anahtar sirasi etkilemez");
    assert.notEqual(textHash("p", { ...choices, A: "b", B: "a" }), expected);
    assert.equal(normalizeForCompare("  one <u>two</u>\n\n three\tfour "), "one two three four");
    assert.equal(normalizeForCompare("x $<u>$ y"), "x $<u>$ y", "formul icindeki < korunur");
    // Kapi 4: italik/alti cizili isaret kaynak metinle karsilastirmadan once silinir (extract_text.py <i> yazar).
    const marked = [{ field: "prompt", text: "Who wrote <i>The Long Book</i>?" }, { field: "choices.A", text: "A) <u>an</u> author" }];
    assert.ok(locateInSource(marked, "1. Who wrote The Long Book?\n   A) an author").ok, "isaretli metin kaynakla eslesmeli");
    assert.equal(locateInSource(marked, "1. Who wrote The Short Book?\n   A) an author").ok, false);
    console.log("ok - textHash / normalizeForCompare / isaretli kaynak karsilastirmasi");
  }

  // Kapi 4, Cambridge parca karsilastirmasi (lib/text.mjs compareTokens; uydurma metin).
  {
    const parts = [
      { field: "prompt", text: "Which lamp in the invented hall burns longest?" },
      ...["one lamp", "two lamps", "three lamps", "four lamps", "five lamps"].map((text, k) => ({ field: `choices.${LETTERS[k]}`, text: `${LETTERS[k]} ${text}` })),
    ];
    const choiceLines = "    A   one lamp\n    B   two lamps\n    C   three lamps\n    D   four lamps\n    E   five lamps\n";
    const page = `7   Which lamp in the invented\n    hall burns longest?\n${choiceLines}`;
    assert.deepEqual(compareTokens(parts, page, { extra: ["7"] }), { ok: true, spacingOnly: false, tokens: 24, excluded: 0, missing: [], dropped: 0 });
    const reordered = `    hall burns longest?\n7   Which lamp in the invented\n${choiceLines}`;
    assert.equal(locateInSource(parts, reordered).ok, false, "sirali karsilastirma tutmaz");
    assert.equal(compareTokens(parts, reordered, { extra: ["7"] }).ok, true, "sirasi farkli satir gecer");
    const sourceDropped = compareTokens(parts, page.replace("invented", ""), { extra: ["7"] });
    assert.deepEqual([sourceDropped.ok, sourceDropped.missing, sourceDropped.dropped], [false, [{ field: "prompt", word: 4 }], 0], "kaynakta olmayan kelime");
    const oursDropped = compareTokens([{ field: "prompt", text: "Which lamp in the hall burns longest?" }, ...parts.slice(1)], page, { extra: ["7"] });
    assert.deepEqual([oursDropped.ok, oursDropped.missing, oursDropped.dropped], [false, [], 1], "metinden dusmus kelime");
    assert.equal(compareTokens(parts, page.replace("five", "nine"), { extra: ["7"] }).ok, false, "degismis kelime");
    assert.equal(compareTokens(parts, `${page}    A   one lamp\n`).dropped, 4, "fazla satir (soru numarasi extra degil)");
    // Yalniz bosluk farki: pdftotext harfleri bitisik verir ya da kelimeyi boler.
    const spaced = [{ field: "prompt", text: "Order the cards." }, { field: "choices.A", text: "A P Q R S" }];
    const merged = compareTokens(spaced, "Order the cards.\nA PQRS");
    assert.deepEqual([merged.ok, merged.spacingOnly, merged.missing.length, merged.dropped], [true, true, 4, 1], "bitisik harfler");
    const split = compareTokens(spaced, "Ord er the cards.\nA P Q R S");
    assert.deepEqual([split.ok, split.spacingOnly], [true, true], "bolunmus kelime");
    assert.equal(compareTokens(spaced, "Order the cards.\nA PQRT").ok, false, "bitisik ama farkli harf");
    // Kisa tire = "-" (cikarici simgedeki kisa tireyi eksiye cevirir); ust simge ayri satirda.
    assert.equal(compareTokens([{ field: "prompt", text: "Charge 10\u207b\u2077 C" }], "        \u20137\nCharge 10    C").ok, true, "ust simge ve kisa tire");
    // Esleme ve cozme (extract_text.py ile ayni kural).
    assert.equal(applyCharMap("well\u00adknown\u037e", { "\u00ad": "-", "\u037e": ";" }), "well-known;");
    const shifted = [..."Hi (A)"].map((c) => (c === " " ? " " : String.fromCharCode(c.charCodeAt(0) - 29))).join("");
    // "(" ve ")" glif numarasi 11 ve 12 (dikey sekme, sayfa sonu): bosluk olarak kalir, cozulmez.
    assert.equal(decodeShifted(`${shifted}\n\u00b1`, 29, { 177: "\u2013" }), "Hi \u000bA\u000c\n\u2013");
    assert.deepEqual(unrecoverableChars(29), ["&", "'", "(", ")", "*", "="]);
    const excluded = compareTokens([{ field: "prompt", text: "Hi (A)" }], "Hi   A", { exclude: unrecoverableChars(29) });
    assert.deepEqual([excluded.ok, excluded.tokens, excluded.excluded], [true, 2, 2], "geri alinamayan karakterler karsilastirma disi");
    console.log("ok - kapi 4 Cambridge parca karsilastirmasi / esleme / 2021 cozme");
  }

  const id = (number, year = 2025) => questionId(year, number);

  await scenario("saglam fikstur gecer", null, (result) => {
    assert.equal(result.status, 0, "cikis 0 bekleniyor");
    const { bank, failures, excluded } = result.output;
    assert.deepEqual(failures, []);
    assert.deepEqual(excluded, []);
    assert.equal(bank.length, 60);
    const first = bank.find((q) => q.number === 1);
    const second = bank.find((q) => q.number === 2);
    assert.equal(first.figure_path, `2025/${id(1)}.webp`);
    assert.equal(second.figure_path, null);
    assert.equal(second.prompt, "Fixture question 2 with a typo: which option is listed first?");
    for (const q of bank) {
      assert.equal(q.year, 2025);
      assert.equal(q.exam_set, "mock");
      assert.equal(q.needs_review, true);
      assert.equal(q.topic_slug, `${q.section}-general`);
      assert.equal(q.topic, "General");
      assert.equal(q.source_file, "fixture-2025.pdf");
      assert.equal(q.correct_answer, q.shuffle.shuffled);
      assert.equal(q.choices[q.correct_answer], `option a${q.number}`);
      assert.equal(q.text_hash, textHash(q.prompt, q.choices));
    }
    const report = read(join(result.root, "validate-report.json"));
    assert.equal(report.ok, true);
    assert.deepEqual(report.years["2025"], {
      questions: 60,
      bank: 60,
      bySection: { "reading-general": 4, logic: 5, biology: 23, chemistry: 15, "physics-math": 13 },
      figures: 1,
      blocked: 0,
      failures: 0,
    });
  });

  await scenario(
    "eksik sik kapi 2",
    (root) =>
      mutateQuestion(root, 2025, 3, (q, isShuffled, data) => {
        const letter = isShuffled ? LETTERS[data.shuffleMap[q.id].order.indexOf("E")] : "E";
        delete q.choices[letter];
      }),
    expectFailure(new RegExp(`kapi 2: .*${id(3)}.*sik`))
  );

  await scenario(
    "yanlis correct_answer kapi 5",
    (root) =>
      mutateQuestion(root, 2025, 4, (q, isShuffled) => {
        if (isShuffled) q.correct_answer = LETTERS[(LETTERS.indexOf(q.correct_answer) + 1) % 5];
      }),
    expectFailure(new RegExp(`kapi 5: .*${id(4)}.*correct_answer`))
  );

  await scenario(
    "dengesiz dolar kapi 3",
    (root) =>
      mutateQuestion(root, 2025, 5, (q) => {
        q.prompt += " It costs $5.";
      }),
    expectFailure(new RegExp(`kapi 3: .*${id(5)}.*\\$`))
  );

  await scenario(
    "deneme olmayan yilda mock kapi 2",
    null,
    expectFailure(new RegExp(`kapi 2: .*${id(1, 2022)}.*exam_set`)),
    { year: 2022, examSet: "mock", args: ["--years", "2022", "--require-figures"] }
  );

  const gate4Of = (result) => read(join(result.root, "validate-report.json")).gates.find((g) => String(g.gate) === "4");

  // Kapi 4, Cambridge dizilimi (2022; inventory.mjs paperLayoutOf): yalin sik harfi, sira bagimsiz parca karsilastirmasi.
  await scenario(
    "kapi 4 Cambridge: yalin harf, Word tiresi/noktali virgulu ve sirasi farkli satir gecer",
    (root) => cambridgeFixture(root),
    (result) => {
      assert.equal(result.status, 0, "cikis 0 bekleniyor");
      assert.deepEqual(result.output.failures, []);
      const gate4 = gate4Of(result);
      assert.equal(gate4.counts.compared, 2);
      assert.equal(gate4.counts.equal, 2);
      const year = gate4.counts.years["2022"];
      assert.equal(year.layout, "cambridge");
      assert.equal(year.textOnly, 2);
      assert.equal(year.passed, 2);
      assert.equal(year.inOrder, 1, "soru 4 sirali karsilastirmada tutmaz (numara ikinci satirda)");
      assert.deepEqual([year.missing, year.dropped, year.noText, year.spacingOnly], [[], [], [], []]);
    },
    { year: 2022 }
  );
  const without = (text, word) => text.replace(`${word} `, "");
  await scenario(
    "kapi 4 Cambridge: kaynakta olmayan kelime (kaynaktan dusmus) hata",
    (root) => cambridgeFixture(root, { pdfPrompt3: without(CAMBRIDGE_Q3_PROMPT, "listed") }),
    expectFailure(new RegExp(`kapi 4: 2022:3 ${id(3, 2022)}: kaynak sayfa 1 soru bolgesinde 1 parca yok \\(ilk: prompt 8\\. kelime\\)`)),
    { year: 2022 }
  );
  await scenario(
    "kapi 4 Cambridge: metinden dusmus kelime hata",
    (root) => cambridgeFixture(root, { extractPrompt3: without(CAMBRIDGE_Q3_PROMPT, "listed") }),
    expectFailure(new RegExp(`kapi 4: 2022:3 ${id(3, 2022)}: kaynak sayfa 1 soru bolgesinde metinde olmayan 1 parca var`)),
    { year: 2022 }
  );
  await scenario(
    "kapi 4 Cambridge: soru bolgesinde metin yok hata",
    (root) => cambridgeFixture(root, { q3Box: [48, 500, 560, 560] }),
    expectFailure(new RegExp(`kapi 4: 2022:3 ${id(3, 2022)}: kaynak sayfa 1 soru bolgesinde metin yok`)),
    { year: 2022 }
  );
  // MUR dizilimi (2023-2025) degismedi: sirali, bosluksuz, sik "A) ".
  await scenario(
    "kapi 4 MUR: \"A) \" bicimi gecer",
    (root) => murFixture(root),
    (result) => {
      assert.equal(result.status, 0, "cikis 0 bekleniyor");
      assert.deepEqual(result.output.failures, []);
      const gate4 = gate4Of(result);
      assert.equal(gate4.counts.compared, 1);
      assert.equal(gate4.counts.equal, 1);
      assert.equal(gate4.counts.years["2025"].layout, "mur");
    }
  );
  await scenario(
    "kapi 4 MUR: yalin sik harfi tutmaz",
    (root) => murFixture(root, { bare: true }),
    expectFailure(new RegExp(`kapi 4: 2025:3 ${id(3)}: kaynak sayfa 1 ile eslesmiyor \\(choices\\.A`))
  );

  // Cozulmus metin katmanli yil (2021, inventory textLayer "decoded"): metin yili gibi islenir. Kapi 4 once kaynak PDF'in
  // varligini ve sha256'sini denetler, decode-check kabulunu ister, sonra pdftotext ciktisini envanterdeki kaydirmayla
  // cozup Cambridge parca karsilastirmasini yapar; hasImage soru yine goruntuden yazilmis olmali; karistirma kaydi
  // (2021-2025) zorunlu kalir.
  const decodedYear = (root, { accepted = true, rewritten = true, pdf = "ok", prompt = DECODED_PROMPT } = {}) => {
    const inventoryPath = join(root, "inventory.json");
    write(inventoryPath, read(inventoryPath).map((entry) => ({ ...entry, textLayer: "decoded", decodeShift: 29 })));
    const bbox = pdf === "missing" ? [48, 99, 560, 180] : decodedPdf(root, { sha: pdf !== "sha" });
    textYear(root, 2021, [1, 3], (q) => {
      if (q.number === 1) {
        if (rewritten) q.visionRewritten = true;
        return;
      }
      q.prompt = prompt;
      q.choices = { ...DECODED_CHOICES };
      q.bbox = bbox;
    });
    write(join(root, "vision", "2021", "decode-check.json"), { year: 2021, shift: 29, accepted });
  };
  await scenario(
    "cozulmus metin katmanli yil (2021) metin yili gibi gecer, pdftotext kaydirmayla cozulur",
    (root) => decodedYear(root),
    (result) => {
      assert.equal(result.status, 0, "cikis 0 bekleniyor");
      assert.deepEqual(result.output.failures, []);
      assert.equal(result.output.bank.length, 60);
      assert.ok(result.output.bank.every((q) => q.year === 2021 && q.shuffle && q.correct_answer === q.shuffle.shuffled), "2021 karistirma kaydi");
      const gate4 = gate4Of(result);
      assert.deepEqual(gate4.counts.decodedYears, [2021]);
      assert.deepEqual(gate4.counts.textYears, [2021], "cozulmus yil metin yili sayilir");
      assert.equal(gate4.counts.compared, 1, "cozulmus pdftotext ile karsilastirilir");
      assert.equal(gate4.counts.equal, 1);
      const year = gate4.counts.years["2021"];
      assert.equal(year.layout, "cambridge");
      assert.equal(year.excludedTokens, 2, "parantezler pdftotext'te geri alinamaz, karsilastirma disi");
      assert.ok(gate4.notes.some((m) => /^2021: cozulmus metin katmani \(kaydirma 29\)/.test(m)), "kapi 4 notu");
    },
    { year: 2021 }
  );
  await scenario(
    "cozulmus yilda kaynakta olmayan kelime kapi 4",
    (root) => decodedYear(root, { prompt: DECODED_PROMPT.replace("first", "last") }),
    expectFailure(new RegExp(`kapi 4: 2021:3 ${id(3, 2021)}: kaynak sayfa 1 soru bolgesinde 1 parca yok`)),
    { year: 2021 }
  );
  await scenario(
    "cozulmus yilda kaynak PDF yok kapi 4",
    (root) => decodedYear(root, { pdf: "missing" }),
    expectFailure(/kapi 4: 2021: kaynak PDF yok/),
    { year: 2021 }
  );
  await scenario(
    "cozulmus yilda kaynak PDF sha256 farkli kapi 4",
    (root) => decodedYear(root, { pdf: "sha" }),
    expectFailure(/kapi 4: 2021: kaynak PDF envanterdeki sha256 ile ayni degil/),
    { year: 2021 }
  );
  await scenario(
    "cozulmus yilda decode-check kabul edilmemis kapi 4",
    (root) => decodedYear(root, { accepted: null }),
    expectFailure(/kapi 4: 2021: .*decode-check kabul edilmedi/),
    { year: 2021 }
  );
  await scenario(
    "cozulmus yilda goruntuden yazilmamis hasImage kapi 4",
    (root) => decodedYear(root, { rewritten: false }),
    expectFailure(new RegExp(`kapi 4: .*${id(1, 2021)}.*goruntuden yazilmadi`)),
    { year: 2021 }
  );

  // Kapi 2, birlesik GK/LR bolumu (2011-2022 cikarimi gecici "gk-lr" yazar; Gorev 17): banka yilinda bolum
  // classify/topics.json'dan gelir (reading-general ya da logic); kayit yoksa soru kapi 2 hatasi (tek hata) olarak kalir.
  // Fikstur kagidinda 1-9 (reading-general 1-4 + logic 5-9) "gk-lr" yapilir.
  const GK_LR_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const combinedSection = (root, year = 2022) => {
    for (const number of GK_LR_NUMBERS) mutateQuestion(root, year, number, (q) => (q.section = "gk-lr"));
  };
  const writeTopics = (root, entries) => write(join(root, "classify", "topics.json"), entries);
  const resolvedTopics = (year = 2022) =>
    Object.fromEntries(
      GK_LR_NUMBERS.map((number) => [
        id(number, year),
        number <= 5 ? { section: "reading-general", topicSlug: "text-comprehension" } : { section: "logic", topicSlug: "critical-thinking" },
      ])
    );
  const gate2Failures = (result) => result.output.failures.filter((message) => message.startsWith("kapi 2: "));
  await scenario(
    "birlesik gk-lr bolumu topics.json kaydi olmadan kapi 2 (soru basina tek hata)",
    (root) => combinedSection(root),
    (result) => {
      expectFailure(new RegExp(`kapi 2: 2022:3 ${id(3, 2022)}: bolum gk-lr siniflanmadi`))(result);
      assert.equal(gate2Failures(result).length, GK_LR_NUMBERS.length, `soru basina tek kapi 2 hatasi\n  ${gate2Failures(result).join("\n  ")}`);
      const q3 = result.output.bank.find((q) => q.number === 3);
      assert.deepEqual([q3.section, q3.topic_slug, q3.topic], ["gk-lr", null, null], "siniflanmamis soru bolum/konu almaz");
      const report = read(join(result.root, "validate-report.json"));
      assert.deepEqual(report.years["2022"].bySection, { "reading-general": 0, logic: 0, biology: 23, chemistry: 15, "physics-math": 13, "gk-lr": 9 });
    },
    { year: 2022 }
  );
  await scenario(
    "birlesik gk-lr bolumu topics.json ile reading-general/logic olur",
    (root) => {
      combinedSection(root);
      // Baska yilin (Teslim 1) kaydi da dosyada: bu calismada kullanilmaz, sorun degil.
      writeTopics(root, { ...resolvedTopics(), [id(10, 2025)]: { section: "biology", topicSlug: "evolution" } });
    },
    (result) => {
      assert.equal(result.status, 0, "cikis 0 bekleniyor");
      assert.deepEqual(result.output.failures, []);
      const byNumber = new Map(result.output.bank.map((q) => [q.number, q]));
      assert.deepEqual([byNumber.get(1).section, byNumber.get(1).topic_slug, byNumber.get(1).topic], ["reading-general", "text-comprehension", "Text comprehension"]);
      assert.deepEqual([byNumber.get(7).section, byNumber.get(7).topic_slug, byNumber.get(7).topic], ["logic", "critical-thinking", "Critical thinking"]);
      assert.deepEqual([byNumber.get(10).section, byNumber.get(10).topic_slug], ["biology", "biology-general"], "kaydi olmayan gercek bolum degismez");
      const report = read(join(result.root, "validate-report.json"));
      assert.deepEqual(report.years["2022"].bySection, { "reading-general": 5, logic: 4, biology: 23, chemistry: 15, "physics-math": 13 }, "bolum sayimi cozulmus bolumle");
    },
    { year: 2022 }
  );
  await scenario(
    "birlesik gk-lr: topics.json bolumu reading-general/logic degil kapi 2",
    (root) => {
      combinedSection(root);
      writeTopics(root, { ...resolvedTopics(), [id(2, 2022)]: { section: "biology", topicSlug: "cell-and-viruses" } });
    },
    expectFailure(new RegExp(`kapi 2: 2022:2 ${id(2, 2022)}: topics.json bolumu biology \\(gk-lr sorusu reading-general ya da logic olmali\\)`)),
    { year: 2022 }
  );
  await scenario(
    "birlesik gk-lr: diger bolumun konusu kapi 2",
    (root) => {
      combinedSection(root);
      writeTopics(root, { ...resolvedTopics(), [id(3, 2022)]: { section: "logic", topicSlug: "text-comprehension" } });
    },
    expectFailure(new RegExp(`kapi 2: 2022:3 ${id(3, 2022)}: topic_slug text-comprehension reading-general bolumunde, soru logic`)),
    { year: 2022 }
  );
  await scenario(
    "deneme yilinda gk-lr bolumu topics.json ile de gecersiz kapi 2",
    (root) => {
      mutateQuestion(root, 2025, 1, (q) => (q.section = "gk-lr"));
      writeTopics(root, { [id(1)]: { section: "reading-general", topicSlug: "text-comprehension" } });
    },
    expectFailure(new RegExp(`kapi 2: 2025:1 ${id(1)}: gecersiz bolum gk-lr`))
  );
  await scenario(
    "gercek bolum topics.json ile degismez kapi 2",
    (root) => writeTopics(root, { [id(10)]: { section: "chemistry", topicSlug: "stoichiometry" } }),
    expectFailure(new RegExp(`kapi 2: 2025:10 ${id(10)}: topics.json bolumu chemistry, kayit biology`))
  );

  await scenario(
    "duzeltmede before eslesmiyor kapi 8",
    (root) => {
      const path = join(root, "corrections.json");
      const list = read(path);
      list[0].before = "Fixture question 2 says something else.";
      write(path, list);
    },
    expectFailure(new RegExp(`kapi 8: .*${id(2)}.*before`))
  );

  await scenario(
    "sekil dosyasi yok kapi 6",
    (root) => rmSync(join(root, "figures", "2025", `${id(1)}.webp`)),
    expectFailure(new RegExp(`kapi 6: .*${id(1)}`))
  );

  await scenario(
    "bloke soru bankaya girmez",
    (root) =>
      mutateQuestion(root, 2025, 7, (q) => {
        q.blocked = true;
        q.blockReason = "vision-conflict";
      }),
    (result) => {
      assert.equal(result.status, 0, "bloke soru tek basina hata degil");
      const { bank, excluded } = result.output;
      assert.equal(bank.length, 59);
      assert.ok(!bank.some((q) => q.number === 7));
      assert.deepEqual(excluded, [{ id: id(7), year: 2025, number: 7, reason: "vision-conflict" }]);
    }
  );

  await scenario(
    "eski karistirma dosyasi kapi 5",
    (root) =>
      mutateQuestion(root, 2025, 8, (q, isShuffled) => {
        if (!isShuffled) q.prompt = "Fixture question 8, edited after the shuffle.";
      }),
    expectFailure(new RegExp(`kapi 5: .*${id(8)}.*shuffle-choices`))
  );

  await scenario(
    "sekilli siklar karistirma istisnasi gecer",
    (root) => exemptFixture(root, 2025, 10),
    (result) => {
      assert.equal(result.status, 0, "istisna kaydi gecmeli");
      const q = result.output.bank.find((item) => item.number === 10);
      assert.equal(q.correct_answer, "A");
      assert.deepEqual(q.shuffle, { exempt: true, reason: EXEMPT_REASON });
      assert.deepEqual(Object.values(q.choices), LETTERS.map(() => "[see figure]"));
      assert.equal(q.text_hash, textHash(q.prompt, q.choices));
      const report = read(join(result.root, "validate-report.json"));
      assert.deepEqual(report.shuffleExempt, [{ id: id(10), year: 2025, number: 10, reason: EXEMPT_REASON }]);
    }
  );

  await scenario(
    "sahte istisna (dogru cevap A degil) kapi 5",
    (root) => exemptFixture(root, 2025, 10, { correct: "C" }),
    expectFailure(new RegExp(`kapi 5: .*${id(10)}.*istisna.*correct_answer`))
  );

  // Kapi 6: dolgulu kenar yalniz edge-signoff.json onayiyla (id + yan + pageBox birebir).
  const padTop = (root) => {
    const path = join(root, "figures", "figure-crop-report.json");
    const list = read(path);
    list[0].paddedSides = ["top"];
    write(path, list);
  };
  await scenario("dolgulu kenar onaysiz kapi 6", padTop, expectFailure(new RegExp(`kapi 6: .*${id(1)}.*top kenari.*edge-signoff`)));
  await scenario(
    "dolgulu kenar baska pageBox ile onayli kapi 6",
    (root) => {
      padTop(root);
      write(join(root, "figures", "edge-signoff.json"), [{ id: id(1), side: "top", pageBox: [10, 11, 120, 90], note: "fixture" }]);
    },
    expectFailure(new RegExp(`kapi 6: .*${id(1)}.*top kenari`))
  );
  await scenario(
    "dolgulu kenar onayli gecer",
    (root) => {
      padTop(root);
      write(join(root, "figures", "edge-signoff.json"), [{ id: id(1), side: "top", pageBox: [10, 10, 120, 90], note: "fixture: checked" }]);
    },
    (result) => {
      assert.equal(result.status, 0, "onayli dolgu gecmeli");
      assert.deepEqual(result.output.failures, []);
    }
  );
  await scenario(
    "dosya rapordan farkli kapi 6",
    (root) => {
      const path = join(root, "figures", "figure-crop-report.json");
      const list = read(path);
      list[0].bytes += 1;
      write(path, list);
    },
    expectFailure(new RegExp(`kapi 6: .*${id(1)}.*figure-crop-report`))
  );

  console.log("test:imat-validate gecti");
} finally {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}
