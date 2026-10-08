// validate-bank.mjs fikstur testi (plan Gorev 10): gecici IMAT_OUT'ta sentetik 2025 (deneme) kagidi kurar, betigi
// alt surec olarak calistirir; saglam fikstur gecer, her bozulma kendi kapisinda hata verir. PDF, ag, veritabani yok
// (fikstur source "vision": kapi 4 calismaz). Soru metinleri uydurmadir.
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
import { normalizeForCompare, textHash } from "./lib/text.mjs";
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
  const result = spawnSync(process.execPath, [VALIDATOR, ...args], { env: { ...process.env, IMAT_OUT: root }, encoding: "utf8" });
  const bankPath = join(root, "bank.json");
  let output = null;
  try {
    output = read(bankPath);
  } catch {
    output = null;
  }
  return { root, status: result.status, stdout: result.stdout, stderr: result.stderr, output };
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
    console.log("ok - textHash / normalizeForCompare");
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
