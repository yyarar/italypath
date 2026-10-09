// build-classify-packages.mjs + validate-topics.mjs fikstur testi (plan Gorev 17 hazirligi): gecici IMAT_OUT'ta uydurma
// bank.json kurar, iki betigi alt surec olarak calistirir. Ag, veritabani yok. Soru metinleri uydurmadir.
// Konu: 2011-2022 cikarimindaki gecici birlesik bolum "gk-lr" (General Knowledge and Logical Reasoning) siniflamada
// sectionChoice kaydi olur (grup reading-general+logic, iki bolumun adaylari bolumleriyle); deneme yillarinda (2023-2025)
// bolum sabit kalir.
//
//   PATH=/usr/local/bin:$PATH node scripts/imat/test-classify.mjs   (npm run test:imat-classify)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { topicsForSection } from "../../lib/imat/taxonomy.mjs";
import { textHash } from "./lib/text.mjs";
import { questionId } from "./paths.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "build-classify-packages.mjs");
const VALIDATE = join(HERE, "validate-topics.mjs");
const LETTERS = ["A", "B", "C", "D", "E"];

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function read(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function record(year, number, section) {
  const prompt = `Fixture question ${number} of ${year}: which option is listed first?`;
  const choices = Object.fromEntries(LETTERS.map((letter) => [letter, `option ${letter.toLowerCase()}${number}`]));
  return {
    id: questionId(year, number),
    year,
    number,
    exam_set: year >= 2023 ? "mock" : "bank",
    section,
    topic: null,
    topic_slug: null,
    prompt,
    choices,
    correct_answer: "A",
    figure_path: null,
    text_hash: textHash(prompt, choices),
  };
}

// 2015: 1-3 birlesik gk-lr, 4-5 biology, 6 chemistry. 2016: 1 gercek logic (banka yili). 2024 (deneme): 1 reading-general,
// 5 logic, 10 biology.
const BANK = [
  record(2015, 1, "gk-lr"),
  record(2015, 2, "gk-lr"),
  record(2015, 3, "gk-lr"),
  record(2015, 4, "biology"),
  record(2015, 5, "biology"),
  record(2015, 6, "chemistry"),
  record(2016, 1, "logic"),
  record(2024, 1, "reading-general"),
  record(2024, 5, "logic"),
  record(2024, 10, "biology"),
];
const YEARS = "2015,2016,2024";
const id = (year, number) => questionId(year, number);
// Teslim 1'den kalan kayit: hicbir pakette yok, validate-topics korur.
const PREVIOUS = { [id(2025, 7)]: { section: "biology", topicSlug: "evolution" } };

const roots = [];
function fixture(bank = BANK) {
  const root = mkdtempSync(join(tmpdir(), "imat-classify-"));
  roots.push(root);
  write(join(root, "bank.json"), { bank, failures: [], warnings: [], excluded: [] });
  write(join(root, "classify", "topics.json"), PREVIOUS);
  return root;
}

function run(root, script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { env: { ...process.env, IMAT_OUT: root }, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function build(root, extra = []) {
  return run(root, BUILD, ["--years", YEARS, "--bank", join(root, "bank.json"), ...extra]);
}

function packages(root) {
  const dir = join(root, "classify");
  return readdirSync(dir)
    .filter((name) => /^package-\d+\.json$/.test(name))
    .sort()
    .map((name) => read(join(dir, name)));
}

const summary = (root) => packages(root).map((pack) => [pack.group, pack.questions.map((q) => `${q.id}${q.sectionChoice ? "*" : ""}`)]);
const bothSections = ["reading-general", "logic"].flatMap((section) => topicsForSection(section).map((topic) => ({ slug: topic.slug, label: topic.label, section })));

function check(name, fn, result) {
  try {
    fn();
  } catch (error) {
    if (result) console.error(`--- ${name}\n${result.stdout}\n${result.stderr}`);
    throw error;
  }
  console.log(`ok - ${name}`);
}

try {
  // ------------------------------------------------------------------ build-classify-packages
  {
    const root = fixture();
    const result = build(root);
    check(
      "gk-lr sorusu bayraksiz da sectionChoice kaydi (grup reading-general+logic, iki bolumun adaylari)",
      () => {
        assert.equal(result.status, 0, "cikis 0 bekleniyor");
        assert.deepEqual(summary(root), [
          ["reading-general+logic", [`${id(2015, 1)}*`, `${id(2015, 2)}*`, `${id(2015, 3)}*`]],
          ["reading-general", [id(2024, 1)]],
          ["logic", [id(2016, 1), id(2024, 5)]],
          ["biology", [id(2015, 4), id(2015, 5), id(2024, 10)]],
          ["chemistry", [id(2015, 6)]],
        ]);
        const [combined, reading] = packages(root);
        const entry = combined.questions[0];
        assert.equal(entry.section, "gk-lr", "paket kaydi cikarimdaki bolumu tasir; ajan adayin bolumunu yazar");
        assert.equal(entry.sectionChoice, true);
        assert.deepEqual(entry.candidates, bothSections, "iki bolumun adaylari, her biri bolumuyle");
        assert.equal(entry.prompt, BANK[0].prompt);
        assert.equal("correct_answer" in entry, false, "cevap pakete girmez");
        assert.deepEqual(reading.questions[0].candidates, topicsForSection("reading-general").map((topic) => ({ slug: topic.slug, label: topic.label })));
        assert.equal(reading.questions[0].sectionChoice, undefined, "deneme yilinda bolum sabit");
        const manifest = read(join(root, "classify", "manifest.json"));
        assert.deepEqual(manifest.files.map((file) => [file.group, file.count, file.section_choice]), [
          ["reading-general+logic", 3, 3],
          ["reading-general", 1, 0],
          ["logic", 2, 0],
          ["biology", 3, 0],
          ["chemistry", 1, 0],
        ]);
        assert.match(result.stdout, /Bolum secimi istenen \(birlesik GK\/LR\): 3 soru/);
      },
      result
    );
  }
  {
    const root = fixture();
    const result = build(root, ["--split-gk-lr"]);
    check(
      "--split-gk-lr: banka yilindaki gercek logic de bolum secimine girer; deneme yili sabit kalir",
      () => {
        assert.equal(result.status, 0, "cikis 0 bekleniyor");
        assert.deepEqual(summary(root), [
          ["reading-general+logic", [`${id(2015, 1)}*`, `${id(2015, 2)}*`, `${id(2015, 3)}*`, `${id(2016, 1)}*`]],
          ["reading-general", [id(2024, 1)]],
          ["logic", [id(2024, 5)]],
          ["biology", [id(2015, 4), id(2015, 5), id(2024, 10)]],
          ["chemistry", [id(2015, 6)]],
        ]);
        assert.equal(packages(root)[0].questions[3].section, "logic");
        assert.equal(read(join(root, "classify", "manifest.json")).split_gk_lr, true);
      },
      result
    );
  }
  {
    const root = fixture([...BANK.slice(0, 7), { ...record(2024, 1, "gk-lr") }, ...BANK.slice(8)]);
    const result = build(root, ["--split-gk-lr"]);
    check(
      "deneme yilinda gk-lr bolumu hata (paket yazilmaz)",
      () => {
        assert.equal(result.status, 1, "cikis 1 bekleniyor");
        assert.match(result.stderr, new RegExp(`${id(2024, 1)}: gecersiz bolum gk-lr`));
        assert.deepEqual(packages(root), []);
      },
      result
    );
  }

  // ------------------------------------------------------------------ validate-topics
  const resultFile = (root, n, entries) => write(join(root, "classify", `result-${String(n).padStart(2, "0")}.json`), entries);
  const answer = (year, number, section, topicSlug, confidence = 0.9) => ({ id: id(year, number), section, topicSlug, confidence, reason: "fixture: tested concept" });
  // Bayraksiz paketler (yukaridaki ilk durum): 01 birlesik, 02 reading-general, 03 logic, 04 biology, 05 chemistry.
  function classified(overrides = {}) {
    const root = fixture();
    const built = build(root);
    assert.equal(built.status, 0, `${built.stdout}\n${built.stderr}`);
    const files = {
      1: [answer(2015, 1, "reading-general", "text-comprehension"), answer(2015, 2, "logic", "critical-thinking", 0.8), answer(2015, 3, "logic", "numeric-problem-solving", 0.5)],
      2: [answer(2024, 1, "reading-general", "vocabulary-in-context")],
      3: [answer(2016, 1, "logic", "critical-thinking"), answer(2024, 5, "logic", "data-spatial-problem-solving")],
      4: [answer(2015, 4, "biology", "evolution"), answer(2015, 5, "biology", "cell-and-viruses"), answer(2024, 10, "biology", "evolution")],
      5: [answer(2015, 6, "chemistry", "stoichiometry")],
      ...overrides,
    };
    for (const [n, entries] of Object.entries(files)) resultFile(root, Number(n), entries);
    const result = run(root, VALIDATE);
    const report = read(join(root, "classify", "validate-report.json"));
    const topics = read(join(root, "classify", "topics.json"));
    return { root, result, report, topics };
  }
  const expectError = (name, overrides, pattern) => {
    const { result, report, topics } = classified(overrides);
    check(
      name,
      () => {
        assert.equal(result.status, 1, "cikis 1 bekleniyor");
        assert.ok(report.errors.some((message) => pattern.test(message)), `beklenen hata yok: ${pattern}\n  ${report.errors.join("\n  ")}`);
        assert.equal(report.topicsWritten, false);
        assert.deepEqual(topics, PREVIOUS, "hata varsa topics.json degismez");
      },
      result
    );
  };

  {
    const { result, report, topics } = classified();
    check(
      "validate-topics: sectionChoice sonucu secilen bolumle topics.json'a; eski (Teslim 1) kayit korunur",
      () => {
        assert.equal(result.status, 0, "cikis 0 bekleniyor");
        assert.deepEqual(report.errors, []);
        assert.deepEqual(topics[id(2015, 1)], { section: "reading-general", topicSlug: "text-comprehension" });
        assert.deepEqual(topics[id(2015, 2)], { section: "logic", topicSlug: "critical-thinking" });
        assert.deepEqual(topics[id(2015, 3)], { section: "logic", topicSlug: "logic-general" }, "dusuk eminlik secilen bolumun general kutusuna");
        assert.deepEqual(topics[id(2024, 1)], { section: "reading-general", topicSlug: "vocabulary-in-context" });
        assert.deepEqual(topics[id(2025, 7)], PREVIOUS[id(2025, 7)], "paketlerde olmayan kayit korunur");
        assert.equal(Object.keys(topics).length, BANK.length + 1);
        assert.deepEqual(Object.keys(topics), [...Object.keys(topics)].sort(), "id sirasi");
        assert.equal(report.counts.sectionChoice, 3, "bolumu siniflandiricinin sectigi kayit");
        assert.equal(report.counts.sectionChanged, 0, "gk-lr secimi bolum degisikligi sayilmaz");
        assert.equal(report.counts.keptFromPrevious, 1);
        assert.deepEqual([report.bySection["reading-general"].total, report.bySection.logic.total], [2, 4]);
      },
      result
    );
  }
  expectError(
    "validate-topics: sectionChoice sonucunda iki aday bolum disinda bolum hata",
    { 1: [answer(2015, 1, "reading-general", "text-comprehension"), answer(2015, 2, "biology", "evolution"), answer(2015, 3, "logic", "numeric-problem-solving")] },
    new RegExp(`^result-01\\.json\\[1\\] ${id(2015, 2)}: bolum biology \\(reading-general ya da logic olmali\\)`)
  );
  expectError(
    "validate-topics: sectionChoice sonucunda diger bolumun konusu hata",
    { 1: [answer(2015, 1, "reading-general", "text-comprehension"), answer(2015, 2, "logic", "text-comprehension"), answer(2015, 3, "logic", "numeric-problem-solving")] },
    new RegExp(`^result-01\\.json\\[1\\] ${id(2015, 2)}: topicSlug text-comprehension reading-general bolumunde, secilen bolum logic`)
  );
  expectError(
    "validate-topics: sabit bolumlu kayitta bolum degistirilemez",
    { 2: [answer(2024, 1, "logic", "critical-thinking")] },
    new RegExp(`^result-02\\.json\\[0\\] ${id(2024, 1)}: bolum logic, paket reading-general \\(bolum degistirilemez\\)`)
  );

  console.log("test:imat-classify gecti");
} finally {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}
