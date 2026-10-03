// Okuma ve Yazma kapi raporu (plan 2026-10-03, Gorev 8 kor cozucu + Gorev 9 gorsel sadakat).
// Cozucu ve gorsel ajan sonuclarini guncel bankayla karsilastirir, elle tutulan kapatma listesini
// uygular ve <RW_OUT>/gate-report.json yazar. Acik kayit (ya da engel) varsa cikis kodu 1.
//
// Girdi (hepsi <RW_OUT> altinda, Git disi):
//   solver/result-NN.json   [{ id, hash, answer: "A".."D" | null, confidence, note }]
//   visual/package-NN.json  build-rw-visual-packages.mjs ciktisi (hangi id'lere bakilacak)
//   visual/result-NN.json   [{ id, hash, findings: [{ kind, detail }] }]
//   gate-resolutions.json   [{ id, gate: "solver" | "visual", hash, resolution, note }] (yoksa [] olarak yaratilir)
// Kural: sonuc yok -> acik; hash guncel metinle ayni degil -> eski -> acik; cevap anahtarla ayni degil -> acik;
// dolu not -> acik; her gorsel bulgu -> acik. Acik kayit yalniz ayni id + gate + GUNCEL hash tasiyan
// kapatmayla kapanir (metin sonradan degisirse kapatma gecersiz kalir).
//
// Kullanim:
//   SAT_BANK_OUT=<abs>/tmp/sat-bank/rw node scripts/sat/rw/gate-rw.mjs [--bank <yol>]
//   node scripts/sat/rw/gate-rw.mjs --self-test     # dosyasiz, bellekte sentetik veriyle
//
// Bu dosya ayni zamanda diger RW kapi betiklerinin ortak saf yardimcilarini disa aktarir
// (textHash, visualReasons, readBank ...); ice aktarildiginda CLI calismaz.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RW_OUT } from "./paths.mjs";

export const CHOICE_KEYS = Object.freeze(["A", "B", "C", "D"]);
export const SOLVER_DIR = path.join(RW_OUT, "solver");
export const VISUAL_DIR = path.join(RW_OUT, "visual");
export const DEFAULT_BANK = path.join(RW_OUT, "bank.json");
export const FORMATTED_DIR = path.join(RW_OUT, "formatted-images");
export const UNFORMATTED_DIR = path.join(RW_OUT, "unformatted-pages");
const REPORT_PATH = path.join(RW_OUT, "gate-report.json");
const RESOLUTIONS_PATH = path.join(RW_OUT, "gate-resolutions.json");

const CONFIDENCE = new Set(["high", "medium", "low"]);
const FINDING_KINDS = new Set(["wording", "missing-text", "extra-text", "underline", "italic", "line-break", "blank", "figure", "other"]);
const GATES = new Set(["solver", "visual"]);
const RESOLUTIONS = new Set(["solver-wrong", "not-an-issue", "extraction-fixed", "corrected"]);

// ---------- ortak saf yardimcilar ----------

/** Sozlesme: sha256(JSON.stringify([prompt, A, B, C, D])) ilk 12 hex. Metin degisince eski sonuc yakalanir. */
export function textHash(record) {
  const parts = [record.prompt ?? "", ...CHOICE_KEYS.map((key) => record.choices?.[key] ?? "")];
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 12);
}

/** Sabit tohumlu siralama anahtari: girdi sirasindan bagimsiz, id basina sabit. */
export function seededKey(seed, id) {
  return createHash("sha256").update(`${seed}:${id}`).digest("hex");
}

const TEXT_LABEL = /^Text \d+$/;

/** `Text 1` / `Text 2` etiket satirlari var mi. */
export function hasTwoTexts(prompt) {
  return /^Text 1$/m.test(prompt) && /^Text 2$/m.test(prompt);
}

/** Not listesi (`• ` ile baslayan madde satiri) var mi. */
export function hasNoteList(prompt) {
  return /^• /m.test(prompt);
}

/**
 * Paragraf icinde anlamli satir sonu (siir, diyalog) var mi. Sayilmayanlar: `Text N` etiketinden sonraki
 * satir sonu ve not listesi maddesine giden satir sonu (giris cumlesi -> ilk madde, madde -> madde).
 */
export function hasHardLineBreak(prompt) {
  for (const paragraph of String(prompt).split("\n\n")) {
    const lines = paragraph.split("\n");
    for (let index = 1; index < lines.length; index += 1) {
      if (TEXT_LABEL.test(lines[index - 1])) continue;
      if (lines[index].startsWith("• ")) continue;
      return true;
    }
  }
  return false;
}

/** Gorsel sadakat hedef kurali (rastgele ornek haric): neden listesi, bos = hedef degil. */
export function visualReasons(record) {
  const texts = [record.prompt ?? "", ...CHOICE_KEYS.map((key) => record.choices?.[key] ?? "")];
  const reasons = [];
  if (texts.some((text) => text.includes("<u>"))) reasons.push("underline");
  if (record.figure_path) reasons.push("figure");
  if (hasHardLineBreak(record.prompt ?? "")) reasons.push("line-break");
  if (hasTwoTexts(record.prompt ?? "")) reasons.push("two-texts");
  return reasons;
}

/** figure_path RW_OUT'a goredir (figures/<id>.webp); mutlak yol ya da null. */
export function figureAbsPath(record) {
  return record.figure_path ? path.resolve(RW_OUT, record.figure_path) : null;
}

/** Diskte hazir resmi goruntuler (cizim yapmaz): formatli PNG, yoksa daha once cizilmis formatsiz sayfalar. */
export function listOfficialImages(id) {
  const formatted = path.join(FORMATTED_DIR, `${id}.png`);
  if (existsSync(formatted)) return { kind: "formatted", paths: [formatted] };
  if (!existsSync(UNFORMATTED_DIR)) return { kind: "none", paths: [] };
  const pages = readdirSync(UNFORMATTED_DIR)
    .map((name) => ({ name, match: name.match(new RegExp(`^${id}-p(\\d+)\\.png$`)) }))
    .filter((entry) => entry.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map((entry) => path.join(UNFORMATTED_DIR, entry.name));
  return pages.length > 0 ? { kind: "unformatted-page", paths: pages } : { kind: "none", paths: [] };
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

/** bank.json okur ({ bank: [...] }); temel sekli dogrular. */
export function readBank(bankPath) {
  if (!existsSync(bankPath)) {
    throw new Error(`Banka dosyasi yok: ${bankPath} (henuz uretilmediyse --bank ile gecici banka verin).`);
  }
  const data = JSON.parse(readFileSync(bankPath, "utf8"));
  const bank = Array.isArray(data) ? data : data?.bank;
  if (!Array.isArray(bank)) throw new Error(`${bankPath}: bank dizisi yok.`);
  const seen = new Set();
  for (const record of bank) {
    if (typeof record?.id !== "string" || !/^[0-9a-f]{8}$/.test(record.id)) throw new Error(`${bankPath}: gecersiz id ${record?.id}`);
    if (seen.has(record.id)) throw new Error(`${bankPath}: tekrarlanan id ${record.id}`);
    seen.add(record.id);
    if (typeof record.prompt !== "string") throw new Error(`${record.id}: prompt yok.`);
    for (const key of CHOICE_KEYS) {
      if (typeof record.choices?.[key] !== "string") throw new Error(`${record.id}: ${key} sikki yok.`);
    }
    if (!Array.isArray(record.correct_answer) || record.correct_answer.length !== 1) {
      throw new Error(`${record.id}: correct_answer tek elemanli dizi olmali.`);
    }
  }
  return bank;
}

export function writeJsonFile(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
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
    if (entry?.id === id && entry.gate === gate && entry.hash === hash && RESOLUTIONS.has(entry.resolution)) found = entry;
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

/**
 * Kor cozucu: bankadaki her id icin sonuc beklenir. Durum: ok | open | closed.
 * results: Map id -> [{ id, hash, answer, confidence, note, file }].
 */
export function evaluateSolver({ bank, results, resolutions = [] }) {
  const items = bank.map((record) => {
    const hash = textHash(record);
    const key = record.correct_answer[0];
    const all = results.get(record.id) ?? [];
    const current = all.filter((entry) => entry.hash === hash);
    const reasons = [];
    const problems = [];
    if (all.length === 0) reasons.push("missing");
    else if (current.length === 0) reasons.push("stale");
    else {
      for (const entry of current) {
        if (entry.answer !== null && !CHOICE_KEYS.includes(entry.answer)) problems.push(`${entry.file}: gecersiz answer ${JSON.stringify(entry.answer)}`);
        if (!CONFIDENCE.has(entry.confidence)) problems.push(`${entry.file}: gecersiz confidence ${JSON.stringify(entry.confidence)}`);
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
  const unknown = [...results.keys()].filter((id) => !bankIds.has(id)).sort();
  return {
    items,
    counts: { total: bank.length, ...tally(items, ["solved", "agree", "disagree", "notes", "stale", "missing", "invalid"]) },
    unknown,
  };
}

/**
 * Gorsel sadakat: paketlenmis her id icin sonuc beklenir. Guncel hedef kuralina giren ama hicbir
 * pakette olmayan id de aciktir (not-packaged: metin degisti, paketler yeniden kurulmali).
 * packaged: Map id -> { reasons, file }.
 */
export function evaluateVisual({ bank, packaged, results, resolutions = [] }) {
  const items = [];
  for (const record of bank) {
    const target = visualReasons(record);
    const pack = packaged.get(record.id);
    if (!pack && target.length === 0) continue;
    const hash = textHash(record);
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
          if (!FINDING_KINDS.has(finding?.kind)) problems.push(`${entry.file}: gecersiz kind ${JSON.stringify(finding?.kind)}`);
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
    if (!GATES.has(entry?.gate) || !RESOLUTIONS.has(entry?.resolution) || typeof entry?.id !== "string") why = "gecersiz alan";
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

// ---------- oz sinama ----------

export function runSelfTest() {
  const make = (id, prompt, key, extra = {}) => ({
    id,
    prompt,
    choices: { A: "alpha", B: "beta", C: "gamma", D: "delta" },
    correct_answer: [key],
    skill: "Inferences",
    ...extra,
  });
  const bank = [
    make("00000001", "Plain text one.", "A"),
    make("00000002", "Plain text two.", "B"),
    make("00000003", "Plain text three.", "C"),
    make("00000004", "Plain text four.", "D"),
    make("00000005", "Plain text five.", "A"),
    make("00000006", "Plain text six.", "B"),
    make("00000007", "Plain text seven.", "C"),
    make("00000008", "One <u>underlined</u> part.", "D"),
    make("00000009", "Line one,\nline two.\n\nWhich choice?", "A"),
    make("0000000a", "Text 1\nFirst.\n\nText 2\nSecond.\n\nWhich?", "B", { figure_path: "figures/0000000a.webp" }),
  ];
  const h = Object.fromEntries(bank.map((record) => [record.id, textHash(record)]));
  let checks = 0;
  const check = (fn) => {
    fn();
    checks += 1;
  };

  // hash: metne bagli, sabit uzunluk, sik degisince degisir
  check(() => assert.match(h["00000001"], /^[0-9a-f]{12}$/));
  check(() => assert.notEqual(textHash(bank[0]), textHash({ ...bank[0], choices: { ...bank[0].choices, D: "delta!" } })));

  const solverFiles = [
    {
      file: "result-01.json",
      entries: [
        { id: "00000001", hash: h["00000001"], answer: "A", confidence: "high", note: "" }, // uyusan
        { id: "00000002", hash: h["00000002"], answer: "C", confidence: "medium", note: "" }, // uyusmayan
        { id: "00000003", hash: h["00000003"], answer: "C", confidence: "high", note: "Choice D looks truncated." }, // notlu
        { id: "00000004", hash: "000000000000", answer: "D", confidence: "high", note: "" }, // eski hash
        // 00000005 yok -> eksik
        { id: "00000006", hash: h["00000006"], answer: "A", confidence: "low", note: "" }, // uyusmayan + guncel kapatma
        { id: "00000007", hash: h["00000007"], answer: "A", confidence: "low", note: "" }, // uyusmayan + eski kapatma
        { id: "00000008", hash: h["00000008"], answer: "D", confidence: "high", note: null },
        { id: "00000009", hash: h["00000009"], answer: "A", confidence: "high" },
        { id: "0000000a", hash: h["0000000a"], answer: "B", confidence: "high", note: "  " },
      ],
    },
  ];
  const resolutions = [
    { id: "00000006", gate: "solver", hash: h["00000006"], resolution: "solver-wrong", note: "metin dogru" },
    { id: "00000007", gate: "solver", hash: "111111111111", resolution: "solver-wrong", note: "eski metne bakildi" },
    { id: "00000008", gate: "visual", hash: h["00000008"], resolution: "not-an-issue", note: "kenar bosluk farki" },
  ];
  const solver = evaluateSolver({ bank, results: groupResults(solverFiles).byId, resolutions });
  const status = (evaluation, id) => evaluation.items.find((item) => item.id === id);

  check(() => assert.equal(status(solver, "00000001").status, "ok")); // uyusan -> kapali (acik degil)
  check(() => assert.deepEqual(status(solver, "00000002").reasons, ["disagree"]));
  check(() => assert.equal(status(solver, "00000002").status, "open"));
  check(() => assert.deepEqual(status(solver, "00000003").reasons, ["note"]));
  check(() => assert.equal(status(solver, "00000003").status, "open"));
  check(() => assert.deepEqual(status(solver, "00000004").reasons, ["stale"]));
  check(() => assert.equal(status(solver, "00000004").status, "open"));
  check(() => assert.deepEqual(status(solver, "00000005").reasons, ["missing"]));
  check(() => assert.equal(status(solver, "00000005").status, "open"));
  check(() => assert.equal(status(solver, "00000006").status, "closed")); // guncel hash'li kapatma kapatir
  check(() => assert.equal(status(solver, "00000006").resolution.resolution, "solver-wrong"));
  check(() => assert.equal(status(solver, "00000007").status, "open")); // eski hash'li kapatma kapatmaz
  check(() => assert.equal(status(solver, "0000000a").status, "ok")); // bosluktan ibaret not bos sayilir
  check(() => assert.equal(solver.counts.agree, 5));
  check(() => assert.equal(solver.counts.disagree, 3));
  check(() => assert.equal(solver.counts.notes, 1));
  check(() => assert.equal(solver.counts.stale, 1));
  check(() => assert.equal(solver.counts.missing, 1));
  check(() => assert.equal(solver.counts.open, 5));
  check(() => assert.equal(solver.counts.closed, 1));

  // metin degisince eski kapatma da sonuc da gecersiz olur
  const edited = bank.map((record) => (record.id === "00000006" ? { ...record, prompt: "Plain text six (fixed)." } : record));
  const solverAfterEdit = evaluateSolver({ bank: edited, results: groupResults(solverFiles).byId, resolutions });
  check(() => assert.deepEqual(status(solverAfterEdit, "00000006").reasons, ["stale"]));
  check(() => assert.equal(status(solverAfterEdit, "00000006").status, "open"));

  // gecersiz cevap acik kalir
  const invalid = evaluateSolver({
    bank: [bank[0]],
    results: groupResults([{ file: "r.json", entries: [{ id: "00000001", hash: h["00000001"], answer: "E", confidence: "sure", note: "" }] }]).byId,
  });
  check(() => assert.deepEqual(status(invalid, "00000001").reasons, ["disagree", "invalid"]));

  // gorsel: bulgu -> acik; temiz -> ok; eksik/eski -> acik; kapatma; pakette olmayan hedef -> acik
  check(() => assert.deepEqual(visualReasons(bank[7]), ["underline"]));
  check(() => assert.deepEqual(visualReasons(bank[8]), ["line-break"]));
  check(() => assert.deepEqual(visualReasons(bank[9]), ["figure", "two-texts"]));
  check(() => assert.equal(hasHardLineBreak("Notes:\n• one\n• two\n\nWhich?"), false));
  check(() => assert.equal(hasHardLineBreak("Text 1\nA.\n\nText 2\nB."), false));
  check(() => assert.equal(hasHardLineBreak("CECILY: Yes.\nALGERNON: No."), true));

  const packaged = new Map([
    ["00000001", { reasons: ["random"], file: "package-01.json" }],
    ["00000002", { reasons: ["random"], file: "package-01.json" }],
    ["00000003", { reasons: ["random"], file: "package-01.json" }],
    ["00000008", { reasons: ["underline"], file: "package-01.json" }],
    ["00000009", { reasons: ["line-break"], file: "package-01.json" }],
    // 0000000a hedef ama paketsiz
  ]);
  const visualFiles = [
    {
      file: "result-01.json",
      entries: [
        { id: "00000001", hash: h["00000001"], findings: [] },
        { id: "00000002", hash: h["00000002"], findings: [{ kind: "wording", detail: "affect vs effect" }] },
        { id: "00000003", hash: "000000000000", findings: [] },
        { id: "00000008", hash: h["00000008"], findings: [{ kind: "underline", detail: "starts one word late" }] },
      ],
    },
  ];
  const visual = evaluateVisual({ bank, packaged, results: groupResults(visualFiles).byId, resolutions });
  check(() => assert.equal(status(visual, "00000001").status, "ok"));
  check(() => assert.deepEqual(status(visual, "00000002").reasons, ["findings"]));
  check(() => assert.equal(status(visual, "00000002").status, "open"));
  check(() => assert.deepEqual(status(visual, "00000003").reasons, ["stale"]));
  check(() => assert.deepEqual(status(visual, "00000009").reasons, ["missing"]));
  check(() => assert.equal(status(visual, "00000008").status, "closed"));
  check(() => assert.deepEqual(status(visual, "0000000a").reasons, ["not-packaged"]));
  check(() => assert.equal(visual.items.some((item) => item.id === "00000004"), false)); // hedef degil, paketsiz
  check(() => assert.equal(visual.counts.with_findings, 2));

  const unused = unusedResolutions(resolutions, [...solver.items, ...visual.items]);
  check(() => assert.deepEqual(unused.map((entry) => entry.id), ["00000007"]));

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
  const files = readJsonFiles(VISUAL_DIR, /^package-\d+\.json$/);
  for (const { file, entries } of files) {
    for (const question of entries?.questions ?? []) packaged.set(question.id, { reasons: question.reasons ?? [], file });
  }
  return { packaged, files: files.map((entry) => entry.file) };
}

function readResolutions() {
  if (!existsSync(RESOLUTIONS_PATH)) {
    writeJsonFile(RESOLUTIONS_PATH, []);
    return [];
  }
  const data = JSON.parse(readFileSync(RESOLUTIONS_PATH, "utf8"));
  if (!Array.isArray(data)) throw new Error(`${RESOLUTIONS_PATH} dizi olmali.`);
  return data;
}

function reportItem(item, record) {
  const official = listOfficialImages(item.id);
  const figure = figureAbsPath(record);
  const rest = { ...item };
  delete rest.flags;
  return {
    ...rest,
    skill: record.skill ?? null,
    domain: record.domain ?? null,
    source_file: record.source_file ?? null,
    correct_answer: record.correct_answer[0],
    official_image_kind: official.kind,
    official_image: official.paths,
    figure,
    figure_exists: figure ? existsSync(figure) : null,
  };
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), { values: ["--bank"], booleans: ["--self-test"] });
  if (args.flags.has("--self-test")) {
    const checks = runSelfTest();
    console.log(`gate-rw oz sinama: ${checks} kontrol gecti (uyusan, uyusmayan, not, eski, eksik, kapatma).`);
    return 0;
  }

  const bankPath = path.resolve(args.values["--bank"] ?? DEFAULT_BANK);
  const bank = readBank(bankPath);
  const byId = new Map(bank.map((record) => [record.id, record]));
  const resolutions = readResolutions();

  const solverFiles = readJsonFiles(SOLVER_DIR, /^result-.*\.json$/);
  const solverResults = groupResults(solverFiles);
  const solver = evaluateSolver({ bank, results: solverResults.byId, resolutions });

  const { packaged, files: packageFiles } = readPackaged();
  const visualFiles = readJsonFiles(VISUAL_DIR, /^result-.*\.json$/);
  const visualResults = groupResults(visualFiles);
  const visual = evaluateVisual({ bank, packaged, results: visualResults.byId, resolutions });

  const blockers = [];
  if (packageFiles.length === 0) blockers.push("Gorsel sadakat paketleri yok (build-rw-visual-packages.mjs calistirilmadi).");

  const items = [...solver.items, ...visual.items];
  const open = items.filter((item) => item.status === "open").map((item) => reportItem(item, byId.get(item.id)));
  const closed = items.filter((item) => item.status === "closed").map((item) => reportItem(item, byId.get(item.id)));

  const report = {
    generated_at: new Date().toISOString(),
    bank: { path: bankPath, count: bank.length },
    rule: "acik = sonuc yok | hash eski | cevap anahtarla farkli | dolu not | gorsel bulgu | hedef pakette yok; kapanis yalniz ayni id + gate + guncel hash ile",
    solver: { result_files: solverFiles.map((entry) => entry.file), counts: solver.counts, unknown_ids: solver.unknown },
    visual: {
      package_files: packageFiles,
      result_files: visualFiles.map((entry) => entry.file),
      counts: visual.counts,
      unknown_ids: visual.unknown,
    },
    result_errors: [
      ...solverResults.errors.map((entry) => ({ gate: "solver", ...entry })),
      ...visualResults.errors.map((entry) => ({ gate: "visual", ...entry })),
    ],
    blockers,
    open_count: open.length,
    closed_count: closed.length,
    open,
    closed,
    unused_resolutions: unusedResolutions(resolutions, items),
  };
  writeJsonFile(REPORT_PATH, report);

  const s = solver.counts;
  const v = visual.counts;
  console.log(`Kor cozucu: ${s.total} soru | cozulen ${s.solved} | uyusan ${s.agree} | uyusmayan ${s.disagree} | notlu ${s.notes} | eski ${s.stale} | eksik ${s.missing}${s.invalid ? ` | gecersiz ${s.invalid}` : ""}`);
  console.log(`Gorsel: ${v.packaged} paketli | bakilan ${v.checked} | bulgulu ${v.with_findings} (${v.findings_total} bulgu) | eski ${v.stale} | eksik ${v.missing} | pakette yok ${v.not_packaged}${v.invalid ? ` | gecersiz ${v.invalid}` : ""}`);
  console.log(`Acik: ${open.length} (cozucu ${s.open}, gorsel ${v.open}) | kapatilmis: ${closed.length} | kullanilmayan kapatma: ${report.unused_resolutions.length}`);
  if (report.result_errors.length > 0) console.log(`Sonuc dosyasi hatasi: ${report.result_errors.length}`);
  for (const blocker of blockers) console.log(`ENGEL: ${blocker}`);
  console.log(`Rapor: ${REPORT_PATH}`);
  return open.length > 0 || blockers.length > 0 ? 1 : 0;
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
