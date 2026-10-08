// IMAT kor cozucu + gorsel sadakat kapisi (plan 2026-10-08 Gorev 11; kalip scripts/sat/rw/gate-rw.mjs).
// Cozucu ve gorsel ajan sonuclarini guncel bankayla karsilastirir, elle tutulan kapatma listesini uygular ve
// <IMAT_OUT>/gate-report.json yazar. Salt yerel: ag yok, veritabani yok.
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/gate-imat.mjs [--bank <yol>]
//   PATH=/usr/local/bin:$PATH node scripts/imat/gate-imat.mjs --self-test     (dosyasiz, bellekte sentetik veriyle)
//
// Girdi (hepsi <IMAT_OUT> altinda, Git disi):
//   bank.json               validate-bank.mjs ciktisi { bank: [...] } (--bank ile baska yol)
//   solver/result-NN.json   [{ id, hash, answer: "A".."E" | null, confidence: 0..1, note }]
//   solver/result-rerun-<zaman>.json  ayni bicim (build-solver-packages.mjs --ids paketinin sonucu)
//   visual/package-NN.json  build-visual-packages.mjs ciktisi (hangi id'lere bakilacak); --ids ile
//                           package-rerun-<zaman>.json da okunur (ad sirasinda sonra gelir, ayni id'de o kazanir)
//   visual/result-NN.json   [{ id, hash, findings: [{ kind, detail }] }] (ya da result-rerun-<zaman>.json)
//   gate-resolutions.json   [{ id, gate: "solver" | "visual", hash, resolution, note }] (yoksa [] olarak yaratilir)
// hash = lib/text.mjs textHash(prompt, choices): bankadaki son metin (karistirilmis siklar), text_hash ile ayni.
// Kural: sonuc yok -> acik; hash guncel metinle ayni degil -> eski -> acik; cevap anahtarla ayni degil -> acik;
// dolu not -> acik; her gorsel bulgu -> acik; gorsel hedef (sekil ya da `$`) hicbir pakette yok -> acik. Acik kayit
// yalniz ayni id + gate + GUNCEL hash tasiyan kapatmayla kapanir (metin degisirse kapatma gecersiz kalir).
// Yil uyusmasi: guncel sonucu olan sorularda cevap == anahtar orani (kapatmalar saymaz). "Hep A" yillarinda
// (2021-2025, karistirilmis siklar) oran %95'in altindaysa yil yearBlocked'a girer: kaynak kurali kaniti tutmuyor.
// Cikis: acik > 0, yearBlocked dolu ya da engel varsa 1; hata 2. Konsol ve rapor soru metni tasimaz (ajan notu ve
// bulgu ayrintisi yalniz raporda).
//
// Bu dosya paket kuruculari icin ortak saf yardimcilari da disa aktarir; ice aktarildiginda CLI calismaz.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SECTIONS } from "../../lib/imat/taxonomy.mjs";
import { CHOICE_LETTERS, textHash } from "./lib/text.mjs";
import { BANK_PATH, FIGURES_DIR, IMAT_OUT, SOLVER_DIR, VISUAL_DIR, questionId, writeJson } from "./paths.mjs";
import { SHUFFLE_YEARS } from "./shuffle-choices.mjs";

export const CHOICE_KEYS = CHOICE_LETTERS;
export const AGREEMENT_MIN_PCT = 95;
// Dogru cevabi kaynakta hep A olan (karistirilan) yillar: uyusma esigi burada kanittir.
export const ALL_A_YEARS = SHUFFLE_YEARS;
const REPORT_PATH = path.join(IMAT_OUT, "gate-report.json");
const RESOLUTIONS_PATH = path.join(IMAT_OUT, "gate-resolutions.json");

export const FINDING_KINDS = Object.freeze(["word", "punctuation", "formula", "mark", "table", "figure", "layout"]);
const FINDING_KIND_SET = new Set(FINDING_KINDS);
const GATES = new Set(["solver", "visual"]);
export const RESOLUTIONS = Object.freeze(["solver-wrong", "not-an-issue", "extraction-fixed", "corrected"]);
const RESOLUTION_SET = new Set(RESOLUTIONS);

// ---------- ortak saf yardimcilar ----------

/** Kaydin guncel metin ozeti (validate-bank text_hash ile ayni kural). */
export function recordHash(record) {
  return textHash(record.prompt, record.choices);
}

/** Sabit tohumlu siralama anahtari: girdi sirasindan bagimsiz, id basina sabit. */
export function seededKey(seed, id) {
  return createHash("sha256").update(`${seed}:${id}`).digest("hex");
}

/** Gorsel sadakat hedefi (rastgele ornek haric): neden listesi, bos = hedef degil. */
export function visualReasons(record) {
  const texts = [record.prompt ?? "", ...CHOICE_KEYS.map((key) => record.choices?.[key] ?? "")];
  const reasons = [];
  if (record.figure_path) reasons.push("figure");
  if (texts.some((text) => text.includes("$"))) reasons.push("formula");
  return reasons;
}

/** figure_path figures/ altina goredir (<yil>/<id>.webp); mutlak yol ya da null. Sayfa goruntusu asla. */
export function figureAbsPath(record) {
  if (!record.figure_path) return null;
  const abs = path.resolve(FIGURES_DIR, record.figure_path);
  if (!abs.startsWith(FIGURES_DIR + path.sep) || !abs.endsWith(".webp")) throw new Error(`${record.id}: figure_path figures/ altinda WebP degil`);
  return abs;
}

/** Bankadaki (karistirilmis) siklari kagit harf sirasina dondurur: shuffle.order[k] = yeni k. harfteki asil harf. */
export function paperChoices(record) {
  const order = record.shuffle?.order;
  if (!Array.isArray(order) || record.shuffle?.exempt) return Object.fromEntries(CHOICE_KEYS.map((key) => [key, record.choices[key]]));
  const out = {};
  CHOICE_KEYS.forEach((key, k) => {
    out[order[k]] = record.choices[key];
  });
  return Object.fromEntries(CHOICE_KEYS.map((key) => [key, out[key]]));
}

/** Paket dosya adi: package-NN.json ya da --ids ile yazilan package-rerun-<zaman>.json (gate ikisini de okur). */
export const PACKAGE_FILE_PATTERN = /^package-(\d+|rerun-\d{8}T\d{6}Z)\.json$/;

/** Yeniden paket zaman damgasi (UTC, dosya adina uygun): 20261008T231542Z. */
export function rerunStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

/** --ids degeri ("id,id,...") -> bankadaki kayitlar (girdi sirasi, tekrarsiz); bilinmeyen ya da bos id hata. */
export function selectIds(bank, value) {
  const ids = [...new Set(String(value ?? "").split(",").map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) throw new Error("--ids en az bir id ister (virgulle ayrilmis).");
  const byId = new Map(bank.map((record) => [record.id, record]));
  const unknown = ids.filter((id) => !byId.has(id));
  if (unknown.length > 0) throw new Error(`--ids bankada olmayan id: ${unknown.join(", ")}`);
  return ids.map((id) => byId.get(id));
}

/** Basit arguman ayristirici: `--ad deger`, `--ad=deger`, bayraklar. Bilinmeyen arguman hata. */
export function parseCliArgs(argv, { values = [], booleans = [] } = {}) {
  const parsed = { values: {}, flags: new Set() };
  for (let index = 0; index < argv.length; index += 1) {
    const [name, inline] = argv[index].split(/=(.*)/s, 2);
    if (booleans.includes(name) && inline === undefined) {
      parsed.flags.add(name);
    } else if (values.includes(name)) {
      const value = inline ?? argv[++index];
      if (value === undefined || value === "" || (inline === undefined && value.startsWith("--"))) {
        throw new Error(`${name} bir deger ister.`);
      }
      parsed.values[name] = value;
    } else {
      throw new Error(`Bilinmeyen arguman: ${argv[index]}`);
    }
  }
  return parsed;
}

export function positiveInt(value, name, { allowZero = false } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < (allowZero ? 0 : 1)) {
    throw new Error(`${name} ${allowZero ? "0 ya da pozitif" : "pozitif"} tam sayi olmali: ${value}`);
  }
  return number;
}

/** bank.json okur ({ bank: [...] }); temel sekli ve text_hash'i dogrular. */
export function readBank(bankPath) {
  if (!existsSync(bankPath)) throw new Error(`Banka dosyasi yok: ${bankPath} (once validate-bank.mjs ya da --bank).`);
  const data = JSON.parse(readFileSync(bankPath, "utf8"));
  const bank = Array.isArray(data) ? data : data?.bank;
  if (!Array.isArray(bank)) throw new Error(`${bankPath}: bank dizisi yok.`);
  const seen = new Set();
  for (const record of bank) {
    if (typeof record?.id !== "string" || !/^[0-9a-f]{8}$/.test(record.id)) throw new Error(`${bankPath}: gecersiz id ${record?.id}`);
    if (seen.has(record.id)) throw new Error(`${bankPath}: tekrarlanan id ${record.id}`);
    seen.add(record.id);
    if (!Number.isInteger(record.year) || !Number.isInteger(record.number)) throw new Error(`${record.id}: year/number tamsayi degil.`);
    if (!SECTIONS.includes(record.section)) throw new Error(`${record.id}: gecersiz bolum ${record.section}.`);
    if (typeof record.prompt !== "string") throw new Error(`${record.id}: prompt yok.`);
    for (const key of CHOICE_KEYS) {
      if (typeof record.choices?.[key] !== "string") throw new Error(`${record.id}: ${key} sikki yok.`);
    }
    if (!CHOICE_KEYS.includes(record.correct_answer)) throw new Error(`${record.id}: correct_answer tek harf A-E degil.`);
    if (record.text_hash !== undefined && record.text_hash !== recordHash(record)) {
      throw new Error(`${record.id}: text_hash metinle uyusmuyor (bank.json eski ya da elle degismis; validate-bank.mjs yeniden).`);
    }
  }
  return bank;
}

// ---------- karsilastirma (saf) ----------

/** Sonuc dosyalarini id -> [{ ...kayit, file }] haritasina cevirir; id'siz kayit hata listesine. */
export function groupResults(files) {
  const byId = new Map();
  const errors = [];
  for (const { file, entries } of files) {
    if (!Array.isArray(entries)) {
      errors.push({ file, error: "dosya dizi degil" });
      continue;
    }
    entries.forEach((entry, index) => {
      if (typeof entry?.id !== "string") {
        errors.push({ file, index, error: "id yok" });
        return;
      }
      if (!byId.has(entry.id)) byId.set(entry.id, []);
      byId.get(entry.id).push({ ...entry, file });
    });
  }
  return { byId, errors };
}

/** Ayni id + gate + hash tasiyan gecerli kapatma (son eslesen kazanir) ya da null. */
export function findResolution(resolutions, gate, id, hash) {
  let found = null;
  for (const entry of resolutions ?? []) {
    if (entry?.id === id && entry.gate === gate && entry.hash === hash && RESOLUTION_SET.has(entry.resolution)) found = entry;
  }
  return found;
}

function noteText(note) {
  if (note === undefined || note === null) return "";
  return String(note).trim();
}

function finalize(item, resolutions) {
  if (item.reasons.length === 0) return { ...item, status: "ok" };
  const resolution = findResolution(resolutions, item.gate, item.id, item.hash);
  return resolution ? { ...item, status: "closed", resolution } : { ...item, status: "open" };
}

function tally(items, keys) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const item of items) for (const key of keys) if (item.flags[key]) counts[key] += 1;
  counts.open = items.filter((item) => item.status === "open").length;
  counts.closed = items.filter((item) => item.status === "closed").length;
  return counts;
}

const where = (record) => ({ year: record.year, number: record.number, section: record.section });

/** Kor cozucu: bankadaki her id icin sonuc beklenir. Durum: ok | open | closed. */
export function evaluateSolver({ bank, results, resolutions = [] }) {
  const items = bank.map((record) => {
    const hash = recordHash(record);
    const key = record.correct_answer;
    const all = results.get(record.id) ?? [];
    const current = all.filter((entry) => entry.hash === hash);
    const reasons = [];
    const problems = [];
    if (all.length === 0) reasons.push("missing");
    else if (current.length === 0) reasons.push("stale");
    else {
      for (const entry of current) {
        if (entry.answer !== null && !CHOICE_KEYS.includes(entry.answer)) problems.push(`${entry.file}: gecersiz answer ${JSON.stringify(entry.answer)}`);
        if (typeof entry.confidence !== "number" || !(entry.confidence >= 0 && entry.confidence <= 1)) {
          problems.push(`${entry.file}: gecersiz confidence ${JSON.stringify(entry.confidence)} (0-1 sayi)`);
        }
      }
      if (current.some((entry) => entry.answer !== key)) reasons.push("disagree");
      if (current.some((entry) => noteText(entry.note) !== "")) reasons.push("note");
      if (problems.length > 0) reasons.push("invalid");
    }
    const agree = current.length > 0 && current.every((entry) => entry.answer === key);
    return finalize(
      {
        gate: "solver",
        id: record.id,
        ...where(record),
        hash,
        reasons,
        problems,
        correct_answer: key,
        results: all.map((entry) => ({
          file: entry.file,
          current: entry.hash === hash,
          hash: entry.hash ?? null,
          answer: entry.answer ?? null,
          confidence: entry.confidence ?? null,
          note: noteText(entry.note),
        })),
        flags: {
          solved: current.length > 0,
          agree,
          disagree: reasons.includes("disagree"),
          notes: reasons.includes("note"),
          stale: reasons.includes("stale"),
          missing: reasons.includes("missing"),
          invalid: reasons.includes("invalid"),
        },
      },
      resolutions,
    );
  });
  const bankIds = new Set(bank.map((record) => record.id));
  return {
    items,
    counts: { total: bank.length, ...tally(items, ["solved", "agree", "disagree", "notes", "stale", "missing", "invalid"]) },
    unknown: [...results.keys()].filter((id) => !bankIds.has(id)).sort(),
  };
}

/**
 * Yil bazinda cozucu uyusmasi (kapatmalar saymaz): { byYear: { <yil>: { total, solved, agree, agreementPct } },
 * yearBlocked: [yil] }: "hep A" yilinda en az bir cozulmus soru varken oran esigin altindaysa.
 */
export function yearAgreement(solverItems, { minPct = AGREEMENT_MIN_PCT, allAYears = ALL_A_YEARS } = {}) {
  const byYear = {};
  for (const item of solverItems) {
    const entry = (byYear[item.year] ??= { total: 0, solved: 0, agree: 0, agreementPct: null });
    entry.total += 1;
    if (item.flags.solved) entry.solved += 1;
    if (item.flags.agree) entry.agree += 1;
  }
  const yearBlocked = [];
  for (const [year, entry] of Object.entries(byYear)) {
    entry.agreementPct = entry.solved > 0 ? Math.round((entry.agree / entry.solved) * 1000) / 10 : null;
    if (allAYears.includes(Number(year)) && entry.solved > 0 && entry.agreementPct < minPct) yearBlocked.push(Number(year));
  }
  return { byYear, yearBlocked: yearBlocked.sort((a, b) => a - b) };
}

/**
 * Gorsel sadakat: paketlenmis her id icin sonuc beklenir. Guncel hedef kuralina giren ama hicbir pakette olmayan
 * id de aciktir (not-packaged). packaged: Map id -> { reasons, file }.
 */
export function evaluateVisual({ bank, packaged, results, resolutions = [] }) {
  const items = [];
  for (const record of bank) {
    const target = visualReasons(record);
    const pack = packaged.get(record.id);
    if (!pack && target.length === 0) continue;
    const hash = recordHash(record);
    const all = results.get(record.id) ?? [];
    const current = all.filter((entry) => entry.hash === hash);
    const reasons = [];
    const problems = [];
    const findings = [];
    if (!pack) reasons.push("not-packaged");
    else if (all.length === 0) reasons.push("missing");
    else if (current.length === 0) reasons.push("stale");
    else {
      for (const entry of current) {
        if (!Array.isArray(entry.findings)) {
          problems.push(`${entry.file}: findings dizi degil`);
          continue;
        }
        for (const finding of entry.findings) {
          if (!FINDING_KIND_SET.has(finding?.kind)) problems.push(`${entry.file}: gecersiz kind ${JSON.stringify(finding?.kind)}`);
          findings.push({ file: entry.file, kind: finding?.kind ?? null, detail: noteText(finding?.detail) });
        }
      }
      if (findings.length > 0) reasons.push("findings");
      if (problems.length > 0) reasons.push("invalid");
    }
    items.push(
      finalize(
        {
          gate: "visual",
          id: record.id,
          ...where(record),
          hash,
          reasons,
          problems,
          visual_reasons: pack?.reasons ?? target,
          package_file: pack?.file ?? null,
          findings,
          results: all.map((entry) => ({ file: entry.file, current: entry.hash === hash, hash: entry.hash ?? null })),
          flags: {
            packaged: Boolean(pack),
            checked: current.length > 0,
            clean: current.length > 0 && reasons.length === 0,
            with_findings: findings.length > 0,
            stale: reasons.includes("stale"),
            missing: reasons.includes("missing"),
            not_packaged: reasons.includes("not-packaged"),
            invalid: reasons.includes("invalid"),
          },
        },
        resolutions,
      ),
    );
  }
  const bankIds = new Set(bank.map((record) => record.id));
  const counts = tally(items, ["packaged", "checked", "clean", "with_findings", "stale", "missing", "not_packaged", "invalid"]);
  counts.findings_total = items.reduce((sum, item) => sum + item.findings.length, 0);
  return {
    items,
    counts,
    unknown: [...new Set([...results.keys(), ...packaged.keys()])].filter((id) => !bankIds.has(id)).sort(),
  };
}

/** Hicbir acik kaydi kapatmayan kapatmalar ve nedeni (eski hash, kayit temiz, gecersiz alan). */
export function unusedResolutions(resolutions, items) {
  const byKey = new Map(items.map((item) => [`${item.gate}:${item.id}`, item]));
  const unused = [];
  for (const entry of resolutions ?? []) {
    let why = null;
    if (!GATES.has(entry?.gate) || !RESOLUTION_SET.has(entry?.resolution) || typeof entry?.id !== "string") why = "gecersiz alan";
    else {
      const item = byKey.get(`${entry.gate}:${entry.id}`);
      if (!item) why = "bu kapida boyle bir kayit yok";
      else if (item.hash !== entry.hash) why = "hash eski (metin degisti; yeniden bakilmali)";
      else if (item.status === "ok") why = "kayit zaten temiz";
      else if (item.resolution !== entry) why = "ayni kayit icin sonraki kapatma gecerli";
    }
    if (why) unused.push({ ...entry, why });
  }
  return unused;
}

/** Tum kapi: cozucu + gorsel + yil uyusmasi; cikis karari dahil (saf). */
export function evaluateGate({ bank, solverResults, packaged, visualResults, resolutions = [], blockers = [] }) {
  const solver = evaluateSolver({ bank, results: solverResults, resolutions });
  const visual = evaluateVisual({ bank, packaged, results: visualResults, resolutions });
  const { byYear, yearBlocked } = yearAgreement(solver.items);
  const items = [...solver.items, ...visual.items];
  const open = items.filter((item) => item.status === "open");
  const closed = items.filter((item) => item.status === "closed");
  const stale = items.filter((item) => item.reasons.includes("stale"));
  return {
    solver,
    visual,
    byYear,
    yearBlocked,
    items,
    open,
    closed,
    stale,
    unused: unusedResolutions(resolutions, items),
    exitCode: open.length > 0 || yearBlocked.length > 0 || blockers.length > 0 ? 1 : 0,
  };
}

// ---------- oz sinama ----------

export function runSelfTest() {
  const make = (year, number, key, extra = {}) => ({
    id: questionId(year, number),
    year,
    number,
    section: "biology",
    prompt: `Synthetic question ${year}/${number}.`,
    choices: { A: "alpha", B: "beta", C: "gamma", D: "delta", E: "epsilon" },
    correct_answer: key,
    figure_path: null,
    shuffle: null,
    ...extra,
  });
  const letter = (n) => CHOICE_KEYS[n % 5];
  // 2023 (hep A yili): 22 soru. 1-18 uyusur, 19 uyusmaz + guncel kapatma, 20 notlu (cevap dogru), 21 eski, 22 eksik.
  // Cozulen 20, uyusan 19 -> %95: bloke degil. 1 sekilli, 3 formullu, 4-6 rastgele gorsel ornek.
  const y2023 = Array.from({ length: 22 }, (_, i) => make(2023, i + 1, letter(i)));
  y2023[0] = { ...y2023[0], figure_path: `2023/${y2023[0].id}.webp` };
  y2023[2] = { ...y2023[2], prompt: "If $x^{2} = 4$, which value can x take?" };
  // 2024 (hep A yili): 10 soru. 1-8 uyusur, 9 uyusmaz + eski hash'li kapatma (kapatmaz), 10 cevapsiz (null).
  // %80 -> bloke. 1 sekilli ama paketsiz.
  const y2024 = Array.from({ length: 10 }, (_, i) => make(2024, i + 1, letter(i)));
  y2024[0] = { ...y2024[0], figure_path: `2024/${y2024[0].id}.webp` };
  // 2015 (Cambridge anahtari, hep A degil): 2 soru, ikisi de uyusmaz (biri gecersiz alanli) -> %0 ama bloke degil.
  const y2015 = [make(2015, 1, "B"), make(2015, 2, "C")];
  const bank = [...y2023, ...y2024, ...y2015];
  const h = Object.fromEntries(bank.map((record) => [record.id, recordHash(record)]));
  const other = (record) => CHOICE_KEYS[(CHOICE_KEYS.indexOf(record.correct_answer) + 1) % 5];
  let checks = 0;
  const check = (fn) => {
    fn();
    checks += 1;
  };

  // hash: lib/text.mjs kurali, sabit uzunluk, sik degisince degisir
  check(() => assert.match(h[bank[0].id], /^[0-9a-f]{12}$/));
  check(() => assert.equal(h[bank[0].id], textHash(bank[0].prompt, bank[0].choices)));
  check(() => assert.notEqual(recordHash(bank[0]), recordHash({ ...bank[0], choices: { ...bank[0].choices, E: "epsilon!" } })));

  const answer = (record, value, extra = {}) => ({ id: record.id, hash: h[record.id], answer: value, confidence: 0.9, note: "", ...extra });
  const entries = [
    ...y2023.slice(0, 18).map((record) => answer(record, record.correct_answer)),
    answer(y2023[18], other(y2023[18])),
    answer(y2023[19], y2023[19].correct_answer, { note: "Choice D looks truncated." }),
    answer(y2023[20], y2023[20].correct_answer, { hash: "000000000000" }),
    ...y2024.slice(0, 8).map((record) => answer(record, record.correct_answer, { note: null })),
    answer(y2024[8], other(y2024[8]), { confidence: 0.4 }),
    answer(y2024[9], null, { confidence: 0, note: "   " }),
    answer(y2015[0], "F", { confidence: 2 }),
    answer(y2015[1], other(y2015[1])),
  ];
  const solverResults = groupResults([{ file: "result-01.json", entries }]).byId;
  const resolutions = [
    { id: y2023[18].id, gate: "solver", hash: h[y2023[18].id], resolution: "solver-wrong", note: "metin dogru, cozucu yanildi" },
    { id: y2024[8].id, gate: "solver", hash: "111111111111", resolution: "solver-wrong", note: "eski metne bakildi" },
    { id: y2023[3].id, gate: "visual", hash: h[y2023[3].id], resolution: "not-an-issue", note: "sozlesmeye uygun yazim" },
  ];

  const packaged = new Map([
    [y2023[0].id, { reasons: ["figure"], file: "package-01.json" }],
    [y2023[2].id, { reasons: ["formula"], file: "package-01.json" }],
    [y2023[3].id, { reasons: ["random"], file: "package-02.json" }],
    [y2023[4].id, { reasons: ["random"], file: "package-02.json" }],
    [y2023[5].id, { reasons: ["random"], file: "package-02.json" }],
    // y2024[0] hedef (sekil) ama paketsiz
  ]);
  const visualResults = groupResults([
    {
      file: "result-01.json",
      entries: [
        { id: y2023[0].id, hash: h[y2023[0].id], findings: [] },
        { id: y2023[2].id, hash: h[y2023[2].id], findings: [{ kind: "formula", detail: "exponent printed as 3" }] },
      ],
    },
    {
      file: "result-02.json",
      entries: [
        { id: y2023[3].id, hash: h[y2023[3].id], findings: [{ kind: "mark", detail: "word printed in italics" }] },
        { id: y2023[4].id, hash: "000000000000", findings: [] },
        { id: y2023[5].id, hash: h[y2023[5].id], findings: [{ kind: "spelling", detail: "typo" }] },
      ],
    },
  ]).byId;

  const gate = evaluateGate({ bank, solverResults, packaged, visualResults, resolutions });
  const solverItem = (record) => gate.solver.items.find((item) => item.id === record.id);
  const visualItem = (record) => gate.visual.items.find((item) => item.id === record.id);

  // cozucu: uyusan, uyusmayan, notlu, eski, eksik, gecersiz
  check(() => assert.equal(solverItem(y2023[0]).status, "ok"));
  check(() => assert.deepEqual(solverItem(y2024[8]).reasons, ["disagree"]));
  check(() => assert.equal(solverItem(y2024[8]).status, "open")); // eski hash'li kapatma kapatmaz
  check(() => assert.deepEqual(solverItem(y2024[9]).reasons, ["disagree"])); // null cevap uyusmaz; bosluk not degil
  check(() => assert.deepEqual(solverItem(y2023[19]).reasons, ["note"]));
  check(() => assert.equal(solverItem(y2023[19]).status, "open"));
  check(() => assert.deepEqual(solverItem(y2023[20]).reasons, ["stale"]));
  check(() => assert.equal(solverItem(y2023[20]).status, "open"));
  check(() => assert.deepEqual(solverItem(y2023[21]).reasons, ["missing"]));
  check(() => assert.deepEqual(solverItem(y2015[0]).reasons, ["disagree", "invalid"]));
  check(() => assert.equal(solverItem(y2024[1]).status, "ok")); // null not bos sayilir
  // guncel hash'li kapatma kapatir
  check(() => assert.equal(solverItem(y2023[18]).status, "closed"));
  check(() => assert.equal(solverItem(y2023[18]).resolution.resolution, "solver-wrong"));
  check(() => assert.equal(gate.solver.counts.agree, 18 + 1 + 8));
  check(() => assert.equal(gate.solver.counts.disagree, 5));
  check(() => assert.equal(gate.solver.counts.open, 7));
  check(() => assert.equal(gate.solver.counts.closed, 1));

  // yil uyusmasi: 2023 %95 gecer, 2024 %80 bloke, 2015 hep A yili degil
  check(() => assert.deepEqual(gate.byYear[2023], { total: 22, solved: 20, agree: 19, agreementPct: 95 }));
  check(() => assert.deepEqual(gate.byYear[2024], { total: 10, solved: 10, agree: 8, agreementPct: 80 }));
  check(() => assert.deepEqual(gate.byYear[2015], { total: 2, solved: 2, agree: 0, agreementPct: 0 }));
  check(() => assert.deepEqual(gate.yearBlocked, [2024]));
  check(() => assert.deepEqual(yearAgreement([]).yearBlocked, []));

  // gorsel: temiz, bulgu, kapatilmis bulgu, eski, gecersiz tur, paketsiz hedef; hedef olmayan paketsiz soru yok
  check(() => assert.deepEqual(visualReasons(y2023[0]), ["figure"]));
  check(() => assert.deepEqual(visualReasons(y2023[2]), ["formula"]));
  check(() => assert.deepEqual(visualReasons(y2023[1]), []));
  check(() => assert.equal(visualItem(y2023[0]).status, "ok"));
  check(() => assert.deepEqual(visualItem(y2023[2]).reasons, ["findings"]));
  check(() => assert.equal(visualItem(y2023[2]).status, "open"));
  check(() => assert.equal(visualItem(y2023[3]).status, "closed"));
  check(() => assert.deepEqual(visualItem(y2023[4]).reasons, ["stale"]));
  check(() => assert.deepEqual(visualItem(y2023[5]).reasons, ["findings", "invalid"]));
  check(() => assert.deepEqual(visualItem(y2024[0]).reasons, ["not-packaged"]));
  check(() => assert.equal(visualItem(y2023[1]), undefined));
  check(() => assert.equal(gate.visual.counts.with_findings, 3));

  // toplam: acik, kapali, eski; cikis 1 (acik ve bloke yil)
  check(() => assert.equal(gate.open.length, 7 + 4));
  check(() => assert.equal(gate.closed.length, 2));
  check(() => assert.deepEqual(gate.stale.map((item) => `${item.gate}:${item.number}`).sort(), ["solver:21", "visual:5"]));
  check(() => assert.deepEqual(gate.unused.map((entry) => entry.id), [y2024[8].id]));
  check(() => assert.equal(gate.exitCode, 1));

  // metin degisince sonuc da kapatma da eskir
  const edited = bank.map((record) => (record.id === y2023[18].id ? { ...record, prompt: `${record.prompt} (fixed)` } : record));
  const afterEdit = evaluateGate({ bank: edited, solverResults, packaged, visualResults, resolutions });
  check(() => assert.deepEqual(afterEdit.solver.items.find((item) => item.id === y2023[18].id).reasons, ["stale"]));
  check(() => assert.equal(afterEdit.solver.items.find((item) => item.id === y2023[18].id).status, "open"));

  // her sey temiz ve uyusuyorsa cikis 0
  const clean = evaluateGate({
    bank: y2023.slice(0, 2),
    solverResults: groupResults([{ file: "r.json", entries: y2023.slice(0, 2).map((record) => answer(record, record.correct_answer)) }]).byId,
    packaged: new Map([[y2023[0].id, { reasons: ["figure"], file: "package-01.json" }]]),
    visualResults: groupResults([{ file: "v.json", entries: [{ id: y2023[0].id, hash: h[y2023[0].id], findings: [] }] }]).byId,
  });
  check(() => assert.equal(clean.exitCode, 0));
  check(() => assert.equal(evaluateGate({ bank: [], solverResults: new Map(), packaged: new Map(), visualResults: new Map(), blockers: ["x"] }).exitCode, 1));

  // kagit sirasi: shuffle.order[k] = yeni k. harfteki asil harf
  const shuffledRecord = make(2023, 30, "C", {
    choices: { A: "p3", B: "p2", C: "p1", D: "p4", E: "p5" },
    shuffle: { original: "A", shuffled: "C", order: ["C", "B", "A", "D", "E"] },
  });
  check(() => assert.deepEqual(paperChoices(shuffledRecord), { A: "p1", B: "p2", C: "p3", D: "p4", E: "p5" }));
  check(() => assert.deepEqual(paperChoices({ ...shuffledRecord, shuffle: { exempt: true, reason: "r" } }), shuffledRecord.choices));

  // --ids yeniden paketleri: zaman damgasi, dosya adi kalibi (eski adlar da), id secimi
  const stamp = rerunStamp(new Date("2026-10-08T23:15:42.123Z"));
  check(() => assert.equal(stamp, "20261008T231542Z"));
  check(() => assert.ok(PACKAGE_FILE_PATTERN.test("package-01.json") && PACKAGE_FILE_PATTERN.test(`package-rerun-${stamp}.json`)));
  check(() => assert.ok(!PACKAGE_FILE_PATTERN.test("package-01-img.json") && !PACKAGE_FILE_PATTERN.test("package-rerun-x.json") && !PACKAGE_FILE_PATTERN.test("manifest.json")));
  check(() => assert.deepEqual(selectIds(bank, ` ${y2024[1].id},${y2023[0].id},${y2024[1].id} `).map((record) => record.id), [y2024[1].id, y2023[0].id]));
  check(() => assert.throws(() => selectIds(bank, "ffffffff"), /bankada olmayan/));
  check(() => assert.throws(() => selectIds(bank, " , "), /en az bir id/));

  return checks;
}

// ---------- CLI ----------

function readJsonFiles(dir, pattern) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => pattern.test(name))
    .sort()
    .map((name) => {
      try {
        return { file: name, entries: JSON.parse(readFileSync(path.join(dir, name), "utf8")) };
      } catch (error) {
        throw new Error(`${path.join(dir, name)} okunamadi: ${error.message}`);
      }
    });
}

function readPackaged() {
  const packaged = new Map();
  const files = readJsonFiles(VISUAL_DIR, PACKAGE_FILE_PATTERN);
  for (const { file, entries } of files) {
    for (const question of entries?.questions ?? []) packaged.set(question.id, { reasons: question.reasons ?? [], file });
  }
  return { packaged, files: files.map((entry) => entry.file) };
}

function readResolutions() {
  if (!existsSync(RESOLUTIONS_PATH)) {
    writeJson(RESOLUTIONS_PATH, []);
    return [];
  }
  const data = JSON.parse(readFileSync(RESOLUTIONS_PATH, "utf8"));
  if (!Array.isArray(data)) throw new Error(`${RESOLUTIONS_PATH} dizi olmali.`);
  return data;
}

function reportItem(item) {
  const rest = { ...item };
  delete rest.flags;
  return rest;
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), { values: ["--bank"], booleans: ["--self-test"] });
  if (args.flags.has("--self-test")) {
    const checks = runSelfTest();
    console.log(`gate-imat oz sinama: ${checks} kontrol gecti (uyusan, uyusmayan, eski, not, gorsel bulgu, kapatma, eski hash'li kapatma, %95 alti yil).`);
    return 0;
  }

  const bankPath = path.resolve(args.values["--bank"] ?? BANK_PATH);
  const bank = readBank(bankPath);
  const resolutions = readResolutions();
  const solverFiles = readJsonFiles(SOLVER_DIR, /^result-.*\.json$/);
  const solverResults = groupResults(solverFiles);
  const { packaged, files: packageFiles } = readPackaged();
  const visualFiles = readJsonFiles(VISUAL_DIR, /^result-.*\.json$/);
  const visualResults = groupResults(visualFiles);

  const blockers = [];
  if (packageFiles.length === 0) blockers.push("Gorsel sadakat paketleri yok (build-visual-packages.mjs calistirilmadi).");

  const gate = evaluateGate({ bank, solverResults: solverResults.byId, packaged, visualResults: visualResults.byId, resolutions, blockers });
  const report = {
    generated_at: new Date().toISOString(),
    bank: { path: bankPath, count: bank.length },
    rule: "acik = sonuc yok | hash eski | cevap anahtarla farkli | dolu not | gorsel bulgu | hedef pakette yok; kapanis yalniz ayni id + gate + guncel hash ile; hep A yilinda uyusma < %95 -> yearBlocked",
    counts: { open: gate.open.length, closed: gate.closed.length, stale: gate.stale.length },
    byYear: gate.byYear,
    agreementMinPct: AGREEMENT_MIN_PCT,
    allAYears: [...ALL_A_YEARS],
    yearBlocked: gate.yearBlocked,
    solver: { result_files: solverFiles.map((entry) => entry.file), counts: gate.solver.counts, unknown_ids: gate.solver.unknown },
    visual: {
      package_files: packageFiles,
      result_files: visualFiles.map((entry) => entry.file),
      counts: gate.visual.counts,
      unknown_ids: gate.visual.unknown,
    },
    result_errors: [
      ...solverResults.errors.map((entry) => ({ gate: "solver", ...entry })),
      ...visualResults.errors.map((entry) => ({ gate: "visual", ...entry })),
    ],
    blockers,
    open: gate.open.map(reportItem),
    closed: gate.closed.map(reportItem),
    stale: gate.stale.map((item) => ({ gate: item.gate, id: item.id, year: item.year, number: item.number })),
    unused_resolutions: gate.unused,
  };
  writeJson(REPORT_PATH, report);

  const s = gate.solver.counts;
  const v = gate.visual.counts;
  console.log(`Kor cozucu: ${s.total} soru | cozulen ${s.solved} | uyusan ${s.agree} | uyusmayan ${s.disagree} | notlu ${s.notes} | eski ${s.stale} | eksik ${s.missing}${s.invalid ? ` | gecersiz ${s.invalid}` : ""}`);
  for (const [year, entry] of Object.entries(gate.byYear)) {
    const mark = gate.yearBlocked.includes(Number(year)) ? "  BLOKE" : "";
    console.log(`  ${year}: ${entry.solved}/${entry.total} cozuldu, uyusma ${entry.agreementPct ?? "-"}%${ALL_A_YEARS.includes(Number(year)) ? ` (hep A yili, esik %${AGREEMENT_MIN_PCT})` : ""}${mark}`);
  }
  console.log(`Gorsel: ${v.packaged} paketli | bakilan ${v.checked} | bulgulu ${v.with_findings} (${v.findings_total} bulgu) | eski ${v.stale} | eksik ${v.missing} | pakette yok ${v.not_packaged}${v.invalid ? ` | gecersiz ${v.invalid}` : ""}`);
  console.log(`Acik: ${gate.open.length} (cozucu ${s.open}, gorsel ${v.open}) | kapatilmis: ${gate.closed.length} | eski: ${gate.stale.length} | kullanilmayan kapatma: ${gate.unused.length}`);
  if (gate.yearBlocked.length > 0) console.log(`BLOKE YIL: ${gate.yearBlocked.join(", ")} (uyusma < %${AGREEMENT_MIN_PCT}; kaynak kurali kaniti tutmuyor)`);
  if (report.result_errors.length > 0) console.log(`Sonuc dosyasi hatasi: ${report.result_errors.length}`);
  for (const blocker of blockers) console.log(`ENGEL: ${blocker}`);
  console.log(`Rapor: ${REPORT_PATH}`);
  return gate.exitCode;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error instanceof assert.AssertionError ? `Oz sinama BASARISIZ: ${error.message}` : error.message);
    process.exitCode = 2;
  }
}
