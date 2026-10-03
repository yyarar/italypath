// Reading and Writing dogrulayicisi ve banka dosyasi (plan Gorev 3). Salt yerel: ag yok, veritabani yok.
//
//   PATH=/usr/local/bin:$PATH SAT_BANK_OUT=/Users/keremyarar/italypath-main/tmp/sat-bank/rw node scripts/sat/rw/validate-rw.mjs [--require-figures]
//
// Girdi: <RW_OUT>/extract-keys.json, extract-questions.json, source-inventory.json, (varsa) corrections.json,
// figures/<id>.webp; kaynak PDF'ler (pdftotext ile ikinci motor ve formatli ikinci anahtar).
// Cikti: <RW_OUT>/bank.json ({ bank, failures, warnings, excluded }; import-bank.mjs okur) ve validate-report.json.
// Herhangi bir kapida hata varsa cikis kodu 1 (bank.json yine yazilir; failures dolu oldugu icin import reddeder).
//
// Kapi sirasi: 1 sayim, 2 kunye, 3 sekil, 4 cift kaynak, 4b ikinci motor (pdftotext), 5 ikinci anahtar;
// sonra duzeltmeler (10, corrections.json) uygulanir; sonra 6 sozlesme, 7 alti cizili, 8 bosluk, 9 gorsel
// duzeltilmis metin uzerinde calisir. 4 ve 4b duzeltilmemis cikarmayi kaynakla karsilastirir.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { stripMarks } from "../../../lib/sat/mathSegments.mjs";
import { markIssues } from "../lib/content-audit.mjs";
import { SOURCE_ROOT, readJson, slugify, writeJson } from "../lib.mjs";
import { RW_FORMATTED_KEYS_ROOT, RW_OUT } from "./paths.mjs";

const requireFigures = process.argv.includes("--require-figures");

// Plan tablosu (2026-10-03 kaynak incelemesi): alan -> beceri -> [zorluk 1, 2, 3].
const EXPECTED = {
  "Information and Ideas": { "Central Ideas and Details": [16, 15, 17], "Command of Evidence": [36, 32, 36], Inferences: [13, 13, 26] },
  "Craft and Structure": { "Words in Context": [24, 23, 21], "Text Structure and Purpose": [17, 17, 14], "Cross-Text Connections": [15, 9, 10] },
  "Expression of Ideas": { "Rhetorical Synthesis": [18, 27, 21], Transitions: [20, 14, 15] },
  "Standard English Conventions": { Boundaries: [16, 21, 24], "Form, Structure, and Sense": [17, 19, 23] },
};
const EXPECTED_TOTAL = 589;
const EXPECTED_DIFFICULTY = { 1: 192, 2: 190, 3: 207 };
const EXPECTED_ANSWERS = { A: 150, B: 143, C: 130, D: 166 };
const EXPECTED_FIGURES = { graph: 23, table: 25 };
const EXPECTED_SECOND_KEY = { comparable: 562, notComparable: 27 };
const DIFFICULTY_LABEL = { 1: "Easy", 2: "Medium", 3: "Hard" };
const LETTERS = ["A", "B", "C", "D"];

// Kapi 9: kokunde "table"/"graph" gecip gorseli OLMAYAN sorular, gerekceyle (sessiz gecis yok).
const FIGURE_WORD_ALLOWLIST = {
  "5c7e0d62": "Inferences: 'the famous Round Table at which Arthur's knights assembled' (King Arthur), not a data table",
};

// Kapi 4b istisnalari: pdftotext'in yanildigi, kanitiyla belgelenmis id'ler. Bugun bos: belgelenmis
// normallestirmelerden sonra 589 sorunun tamami tutuyor. Eklenecek her kayit { reason, evidence } tasir.
const PDFTOTEXT_EXCEPTIONS = {};

// Kapi 4c istisnalari: pdftotext'in sozcuk sinirini yanlis verdigi, kanitiyla belgelenmis id'ler. Bugun bos.
const WORD_BOUNDARY_EXCEPTIONS = {};

const keysDoc = readJson(join(RW_OUT, "extract-keys.json"));
const questionsDoc = readJson(join(RW_OUT, "extract-questions.json"));
const inventory = readJson(join(RW_OUT, "source-inventory.json")).files;
const inventoryByName = new Map(inventory.map((f) => [f.path.split("/").at(-1), f]));

const gates = [];
const failures = [];
const warnings = [];

function gate(id, name) {
  const g = { gate: id, name, ok: true, counts: {}, failures: [], warnings: [], notes: [] };
  gates.push(g);
  return {
    g,
    fail(message) {
      g.ok = false;
      g.failures.push(message);
      failures.push(`kapi ${id}: ${message}`);
    },
    warn(message) {
      g.warnings.push(message);
      warnings.push(`kapi ${id}: ${message}`);
    },
  };
}

function countBy(items, key) {
  const out = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

function fileDifficulty(sourceFile) {
  const match = sourceFile.match(/ ([123])(?: Answer Key)?\.pdf$/);
  if (!match) throw new Error(`Dosya adinda zorluk yok: ${sourceFile}`);
  return Number(match[1]);
}

function sourcePath(sourceFile) {
  const entry = inventoryByName.get(sourceFile);
  if (!entry) throw new Error(`Envanterde yok: ${sourceFile}`);
  return entry;
}

// Iki metnin farkli bolgesi (ortak bas/son kirpilir), her iki surumle birlikte.
function snippetDiff(a, b, [labelA, labelB] = ["source", "ours"], context = 40) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  let j = 0;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j += 1;
  return { at: i, [labelA]: a.slice(Math.max(0, i - context), a.length - j + context), [labelB]: b.slice(Math.max(0, i - context), b.length - j + context) };
}

const keyRecords = keysDoc.records;
const questionRecords = questionsDoc.records;

// ------------------------------------------------------------------ 1 sayim
{
  const { g, fail } = gate("1", "sayim");
  for (const [label, records] of [["anahtar", keyRecords], ["soru", questionRecords]]) {
    if (records.length !== EXPECTED_TOTAL) fail(`${label}: ${records.length} kayit (beklenen ${EXPECTED_TOTAL})`);
    const ids = new Set();
    for (const r of records) {
      if (!/^[0-9a-f]{8}$/.test(r.id)) fail(`${label} ${r.id}: gecersiz id`);
      if (ids.has(r.id)) fail(`${label} ${r.id}: tekrarli id`);
      ids.add(r.id);
    }
    const perFile = countBy(records, (r) => r.source_file);
    const perSkill = countBy(records, (r) => `${r.skill}|${fileDifficulty(r.source_file)}`);
    for (const [domain, skills] of Object.entries(EXPECTED)) {
      for (const [skill, counts] of Object.entries(skills)) {
        counts.forEach((expected, index) => {
          const got = perSkill[`${skill}|${index + 1}`] ?? 0;
          if (got !== expected) fail(`${label}: ${domain} / ${skill} ${index + 1}: ${got} (beklenen ${expected})`);
        });
      }
    }
    if (Object.keys(perFile).length !== 30) fail(`${label}: ${Object.keys(perFile).length} dosya (beklenen 30)`);
    g.counts[label] = { records: records.length, files: Object.keys(perFile).length, perFile };
  }
  const difficulty = countBy(keyRecords, (r) => fileDifficulty(r.source_file));
  const answers = countBy(keyRecords, (r) => r.answer);
  for (const [level, expected] of Object.entries(EXPECTED_DIFFICULTY)) {
    if ((difficulty[level] ?? 0) !== expected) fail(`zorluk ${level}: ${difficulty[level] ?? 0} (beklenen ${expected})`);
  }
  for (const [letter, expected] of Object.entries(EXPECTED_ANSWERS)) {
    if ((answers[letter] ?? 0) !== expected) fail(`cevap ${letter}: ${answers[letter] ?? 0} (beklenen ${expected})`);
  }
  Object.assign(g.counts, { difficulty, answers });
}

// ------------------------------------------------------------------ 2 kunye
{
  const { g, fail, warn } = gate("2", "kunye");
  let checked = 0;
  for (const [label, records] of [["anahtar", keyRecords], ["soru", questionRecords]]) {
    for (const r of records) {
      const parts = sourcePath(r.source_file).path.split("/");
      const isKey = parts[1] === "Answer Keys";
      const folderDomain = isKey ? parts[3] : parts[2];
      const folderSkill = isKey ? r.source_file.replace(/ [123] Answer Key\.pdf$/, "") : parts[3];
      const fileSkill = r.source_file.replace(/ [123]( Answer Key)?\.pdf$/, "");
      if (r.domain !== folderDomain) fail(`${label} ${r.id}: domain ${r.domain} != klasor ${folderDomain}`);
      if (r.skill !== folderSkill) fail(`${label} ${r.id}: skill ${r.skill} != ${isKey ? "dosya" : "klasor"} ${folderSkill}`);
      if (!EXPECTED[r.domain]?.[r.skill]) fail(`${label} ${r.id}: bilinmeyen alan/beceri ${r.domain} / ${r.skill}`);
      if (!isKey && fileSkill !== folderSkill && !g.notes.includes(r.source_file)) {
        g.notes.push(r.source_file);
        warn(`dosya adi beceriyle uyusmuyor (kunye esas alindi): ${r.source_file} -> ${folderSkill}`);
      }
      if (isKey && r.difficulty_label !== DIFFICULTY_LABEL[fileDifficulty(r.source_file)]) {
        fail(`${r.id}: difficulty_label ${r.difficulty_label} != dosya ${fileDifficulty(r.source_file)}`);
      }
      checked += 1;
    }
  }
  g.counts.checked = checked;
}

// ------------------------------------------------------------------ 3 sekil
{
  const { g, fail, warn } = gate("3", "sekil");
  for (const [label, records] of [["anahtar", keyRecords], ["soru", questionRecords]]) {
    for (const r of records) {
      const keys = Object.keys(r.choices ?? {}).sort().join("");
      if (keys !== "ABCD") fail(`${label} ${r.id}: siklar ${keys}`);
      else if (LETTERS.some((k) => !String(r.choices[k]).trim())) fail(`${label} ${r.id}: bos sik`);
      if (!String(r.stem ?? "").trim()) fail(`${label} ${r.id}: bos soru metni`);
    }
  }
  let firstSentenceOk = 0;
  for (const r of keyRecords) {
    if (!/^[A-D]$/.test(r.answer)) fail(`${r.id}: cevap ${r.answer}`);
    if (!String(r.rationale ?? "").trim()) fail(`${r.id}: bos aciklama`);
    const firstSentence = String(r.rationale).split(/(?<=\.)\s/)[0];
    if (firstSentence.includes(`Choice ${r.answer}`)) firstSentenceOk += 1;
    else warn(`${r.id}: aciklamanin ilk cumlesi Choice ${r.answer} demiyor: ${firstSentence.slice(0, 80)}`);
  }
  g.counts.rationaleFirstSentenceNamesAnswer = firstSentenceOk;
}

// ------------------------------------------------------------------ 4 cift kaynak
{
  const { g, fail } = gate("4", "cift kaynak (anahtar PDF ile soru PDF)");
  const byId = new Map(questionRecords.map((r) => [r.id, r]));
  let equal = 0;
  for (const k of keyRecords) {
    const q = byId.get(k.id);
    if (!q) {
      fail(`${k.id}: soru dosyalarinda yok`);
      continue;
    }
    const diffs = [];
    if (k.stem !== q.stem) diffs.push({ field: "stem", ...snippetDiff(k.stem, q.stem, ["keys", "questions"]) });
    for (const letter of LETTERS) {
      if (k.choices[letter] !== q.choices[letter]) diffs.push({ field: `choice ${letter}`, ...snippetDiff(k.choices[letter], q.choices[letter], ["keys", "questions"]) });
    }
    if (k.domain !== q.domain || k.skill !== q.skill) diffs.push({ field: "kunye" });
    if ((k.figure?.kind ?? null) !== (q.figure?.kind ?? null)) diffs.push({ field: "figure" });
    if (diffs.length === 0) equal += 1;
    else fail(`${k.id}: ${JSON.stringify(diffs)}`);
  }
  for (const q of questionRecords) if (!keyRecords.some((k) => k.id === q.id)) fail(`${q.id}: anahtar dosyalarinda yok`);
  g.counts = { compared: keyRecords.length, equal };
}

// ------------------------------------------------------------------ 4b ikinci motor + 4c sozcuk sinirlari
// Kaynak: pdftotext -layout (varsayilan kip satir sonundaki tireyi siler: "well-" + "known" -> "wellknown").
// Iki taraf da karakter dizisine cevrilir; her karakter oncesinde bosluk olup olmadigini (ws) ve o boslukta
// satir sonu bulunup bulunmadigini (nl) tasir. Belgelenmis normallestirmeler (iki tarafa da): bosluk sayilan
// karakterler (her tur bosluk, nbsp, en/em bosluk, U+200B) karakter degil sinirdir; U+00AD yumusak tire
// silinir; bitisik harf glifleri harflere acilir; Unicode ust/alt simge rakamlari ASCII rakama doner
// (cikarici 9 pt rakamlari simgeye cevirir, pdftotext duz rakam verir). Bosluk: kaynakta 3+ alt cizgi, bizde
// tam "______" tek bir bosluk simgesine doner; tekli alt cizgi iki tarafta da tekli kalir (baska dizi eslesmez).
// Yalniz bizim tarafa: stripMarks, "\$" -> "$", satir basindaki "\u2022 " silinir (madde imi vektor dairedir);
// siklara "A. "-"D. " etiketi, cevap bolumune basliklar ("ID: <id> Answer", "Correct Answer:", "Rationale",
// "Question Difficulty:") satir satir eklenir.
// 4b: karakter dizileri (bosluksuz) ayni olmali. 4c: ayni dizide sinir (ws) yerleri ayni olmali; tek belgelenmis
// fark, cikaricinin bosluksuz birlestirdigi kaynak satir sonlari (satir tire ya da uzun cizgiyle bitiyor ve
// cizginin onunde bosluk yok, ya da sonraki satir uzun cizgiyle basliyor); orada bizde duz bosluk olamaz.
const LIGATURES = { "\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi", "\ufb04": "ffl" };
const SUPSUB = "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089";
const BLANK = "\u2423";
const SPACE_CHAR = /[\s\u00a0\u2002\u2003\u200b]/u;
const LINE_END_DASHES = new Set(["-", "\u2010", "\u2013", "\u2014"]);

function tokenize(text, side) {
  let t = text
    .replace(/[\ufb00-\ufb04]/g, (c) => LIGATURES[c])
    .replace(/[\u2070\u00b9\u00b2\u00b3\u2074-\u2079\u2080-\u2089]/g, (c) => String(SUPSUB.indexOf(c) % 10))
    .replace(/\u00ad/g, "");
  t = side === "source" ? t.replace(/_{3,}/g, BLANK) : t.replace(/(?<!_)_{6}(?!_)/g, BLANK);
  const out = [];
  let ws = false;
  let nl = false;
  for (const c of t) {
    if (SPACE_CHAR.test(c)) {
      ws = true;
      if (c === "\n") nl = true;
      continue;
    }
    out.push({ c, ws, nl });
    ws = false;
    nl = false;
  }
  return out;
}

const chars = (tokens) => tokens.map((t) => t.c).join("");
const spaced = (tokens) => tokens.map((t, i) => (i > 0 && t.ws ? " " : "") + t.c).join("");

function oursPlain(text) {
  return stripMarks(text).replace(/^\u2022 /gm, "").replaceAll("\\$", "$");
}

function oursRegion(r) {
  // Kaynakta "ID: <id>" seridinden sonra gelen her sey, bizim alanlardan ayni sirayla.
  return [
    r.stem,
    ...LETTERS.map((k) => `${k}. ${r.choices[k]}`),
    `ID: ${r.id} Answer`,
    "Correct Answer:",
    r.answer,
    "Rationale",
    r.rationale,
    "Question Difficulty:",
    r.difficulty_label,
  ]
    .map(oursPlain)
    .join("\n");
}

function oursChars(text) {
  return chars(tokenize(oursPlain(text), "ours"));
}

function pdftotext(args) {
  return execFileSync("pdftotext", ["-layout", ...args, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function headLeftover(head, r) {
  // Baslik + kunye tablosu: yalniz bu sozcukler olmali. -layout kipinde sarilan hucreler satir satir
  // karisir ("Standard English" / "Conventions"), bu yuzden sozcuk sozcuk ve uzundan kisaya silinir.
  const words = (text) => text.split(" ").map((w) => chars(tokenize(w, "source")));
  const tokens = [`QuestionID${r.id}`, "Assessment", "Test", "Domain", "Skill", "Difficulty", "SAT", ...words("Reading and Writing"), ...words(r.domain), ...words(r.skill)];
  let rest = head;
  for (const token of tokens.sort((a, b) => b.length - a.length || (a < b ? -1 : 1))) {
    const at = rest.indexOf(token);
    if (at >= 0) rest = rest.slice(0, at) + rest.slice(at + token.length);
  }
  return rest;
}

const engine = { compared: 0, equal: 0, figureQuestions: 0, figureLeftoverExactOrder: 0, exceptions: Object.keys(PDFTOTEXT_EXCEPTIONS).length };
const boundary = { compared: 0, equal: 0, notCompared: 0, boundaries: 0, joinedAfterDash: 0, joinedBeforeEmDash: 0, exceptions: Object.keys(WORD_BOUNDARY_EXCEPTIONS).length };
const figureLeftovers = [];
const gate4b = gate("4b", "ikinci motor (pdftotext -layout, anahtar PDF)");
const gate4c = gate("4c", "sozcuk sinirlari (pdftotext -layout ile bosluk yerleri)");
{
  const { g, fail } = gate4b;
  const byFile = new Map();
  for (const r of keyRecords) {
    if (!byFile.has(r.source_file)) byFile.set(r.source_file, []);
    byFile.get(r.source_file).push(r);
  }
  for (const [sourceFile, records] of [...byFile].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const entry = sourcePath(sourceFile);
    const pdf = join(SOURCE_ROOT, entry.path);
    const pages = pdftotext([pdf]).split("\f");
    const sorted = [...records].sort((a, b) => a.page - b.page);
    sorted.forEach((r, index) => {
      engine.compared += 1;
      const lastPage = index + 1 < sorted.length ? sorted[index + 1].page - 1 : entry.pages;
      const sourceTokens = tokenize(pages.slice(r.page - 1, lastPage).join("\n"), "source");
      const source = chars(sourceTokens);
      const banner = `ID:${r.id}`;
      const answerBanner = `ID:${r.id}Answer`;
      const bannerAt = source.indexOf(banner);
      const answerAt = source.indexOf(answerBanner);
      if (bannerAt < 0 || answerAt < bannerAt) {
        fail(`${r.id}: pdftotext ciktisinda serit bulunamadi`);
        boundary.notCompared += 1;
        return;
      }
      const problems = [];
      const head = headLeftover(source.slice(0, bannerAt), r);
      if (head) problems.push({ part: "kunye", source: head, ours: "" });
      const oursTokens = tokenize(oursRegion(r), "ours");
      let region = sourceTokens.slice(bannerAt + banner.length);
      if (r.figure) {
        // Sekilli soru: bizim metin parcalari sirayla bulunmali; artan tek parca seridin hemen arkasinda
        // durmali ve karakterleri sekil kutusunun pdftotext kirpmasiyla (ayni coklu kume) ayni olmali.
        engine.figureQuestions += 1;
        const text = chars(region);
        const chunks = [
          ...r.stem.split("\n").map(oursChars),
          ...LETTERS.map((k) => oursChars(`${k}. ${r.choices[k]}`)),
          answerBanner,
          `CorrectAnswer:${r.answer}`,
          "Rationale",
          ...r.rationale.split("\n\n").map(oursChars),
          `QuestionDifficulty:${r.difficulty_label}`,
        ].filter(Boolean);
        let cursor = 0;
        const leftovers = [];
        let missing = null;
        for (const chunk of chunks) {
          const at = text.indexOf(chunk, cursor);
          if (at < 0) {
            missing = chunk;
            break;
          }
          if (at > cursor) leftovers.push({ at: cursor, text: text.slice(cursor, at) });
          cursor = at + chunk.length;
        }
        if (cursor < text.length && !missing) leftovers.push({ at: cursor, text: text.slice(cursor) });
        const [x0, top, x1, bottom] = r.figure.bbox;
        const crop = chars(
          tokenize(
            pdftotext(["-f", String(r.figure.page), "-l", String(r.figure.page), "-r", "72", "-x", String(Math.floor(x0 - 1)), "-y", String(Math.floor(top - 1)), "-W", String(Math.ceil(x1 - x0 + 2)), "-H", String(Math.ceil(bottom - top + 2)), pdf]),
            "source"
          )
        );
        const leftover = leftovers.map((l) => l.text).join("");
        const sortChars = (s) => [...s].sort().join("");
        if (missing) problems.push({ part: "sekilli govde", missing: missing.slice(0, 120) });
        else if (leftovers.length !== 1 || leftovers[0].at !== 0) {
          problems.push({ part: "sekil yazisi", leftovers: leftovers.map((l) => l.text.slice(0, 80)) });
        } else if (sortChars(leftover) !== sortChars(crop)) {
          problems.push({ part: "sekil yazisi", source: leftover, crop });
        } else {
          if (leftover === crop) engine.figureLeftoverExactOrder += 1;
          figureLeftovers.push({ id: r.id, kind: r.figure.kind, chars: leftover.length, exactOrder: leftover === crop });
          region = region.slice(leftover.length);
        }
      }
      if (problems.length === 0 && chars(region) !== chars(oursTokens)) {
        problems.push({ part: r.figure ? "sekil sonrasi metin" : "govde + cevap", ...snippetDiff(chars(region), chars(oursTokens)) });
      }
      if (problems.length === 0) engine.equal += 1;
      else if (PDFTOTEXT_EXCEPTIONS[r.id]) g.notes.push(`${r.id}: istisna (${PDFTOTEXT_EXCEPTIONS[r.id].reason})`);
      else fail(`${r.id}: ${JSON.stringify(problems)}`);
      if (problems.length > 0) {
        boundary.notCompared += 1;
        return;
      }
      checkBoundaries(r, region, oursTokens);
    });
  }
  g.counts = { ...engine };
  g.notes.push(
    "Sekilli sorularda sekil yazisi (baslik, eksen, gosterge, tablo hucresi) kayitta yoktur; yalniz pdftotext'in tam sayfa ciktisindaki artan parcanin, sekil kutusunun pdftotext kirpmasiyla ayni karakter coklu kumesi oldugu dogrulanir (sira degil). Gorselin dogrulugu Gorev 4/9 goz kontroluyle."
  );
  gate4c.g.counts = { ...boundary };
  gate4c.g.notes.push(
    "Sinir = karakterler arasinda herhangi bir bosluk (tur ve uzunluk onemsiz). Bolgenin ilk karakteri (serit ya da sekil yazisindan sonra) karsilastirilmaz. Sekil yazisinin kendi bosluklari karsilastirilmaz."
  );
}

function checkBoundaries(r, source, oursTokens) {
  // 4c: 4b'nin esledigi ayni karakter dizisinde bosluk yerleri.
  const { fail, g } = gate4c;
  boundary.compared += 1;
  const issues = [];
  for (let i = 1; i < source.length; i += 1) {
    const s = source[i];
    const o = oursTokens[i];
    if (s.ws) boundary.boundaries += 1;
    // Cikaricinin bosluksuz birlestirdigi kaynak satir sonu: bizde ya bosluk yok (birlesik) ya da gercek
    // satir sonu var (siir dizesi "roll" + uzun cizgi gibi); duz bosluk kural disidir.
    const afterDash = s.nl && LINE_END_DASHES.has(source[i - 1].c) && !source[i - 1].ws;
    const beforeEmDash = s.nl && s.c === "\u2014";
    if (afterDash || beforeEmDash) {
      if (!o.ws) {
        boundary[afterDash ? "joinedAfterDash" : "joinedBeforeEmDash"] += 1;
        continue;
      }
      if (o.nl) continue;
    } else if (s.ws === o.ws) continue;
    const from = Math.max(0, i - 30);
    issues.push({
      at: i,
      kind: afterDash || beforeEmDash ? "cizgide satir sonu: bizde duz bosluk" : s.ws ? "kaynakta bosluk var, bizde yok" : "bizde bosluk var, kaynakta yok",
      source: spaced(source.slice(from, i + 30)),
      ours: spaced(oursTokens.slice(from, i + 30)),
    });
  }
  if (issues.length === 0) boundary.equal += 1;
  else if (WORD_BOUNDARY_EXCEPTIONS[r.id]) g.notes.push(`${r.id}: istisna (${WORD_BOUNDARY_EXCEPTIONS[r.id].reason})`);
  else fail(`${r.id}: ${JSON.stringify(issues)}`);
}

// ------------------------------------------------------------------ 5 ikinci anahtar (formatli)
{
  const { g, fail } = gate("5", "ikinci anahtar (formatli Answers/*~Key.pdf)");
  const formatted = new Map();
  const files = readdirSync(RW_FORMATTED_KEYS_ROOT).filter((f) => f.endsWith("~Key.pdf")).sort();
  for (const file of files) {
    for (const line of pdftotext([join(RW_FORMATTED_KEYS_ROOT, file)]).split("\n")) {
      const match = line.match(/^\s*(\d+\.\d+)\s+([0-9a-f]{8})\s+(\S+)\s*$/);
      if (!match) continue;
      if (!formatted.has(match[2])) formatted.set(match[2], []);
      formatted.get(match[2]).push({ file, value: match[3] });
    }
  }
  let comparable = 0;
  let equal = 0;
  const notComparable = [];
  for (const r of keyRecords) {
    const rows = formatted.get(r.id) ?? [];
    const letters = [...new Set(rows.map((row) => row.value).filter((v) => /^[A-D]$/.test(v)))];
    if (letters.length === 0) {
      notComparable.push({ id: r.id, reason: rows.length === 0 ? "formatli surumde yok" : `harf yok (${rows.map((row) => `${row.file}: ${row.value}`).join(", ")})` });
      continue;
    }
    comparable += 1;
    if (letters.length === 1 && letters[0] === r.answer) equal += 1;
    else fail(`${r.id}: formatsiz ${r.answer}, formatli ${letters.join("/")} (${rows.map((row) => row.file).join(", ")})`);
  }
  if (comparable !== EXPECTED_SECOND_KEY.comparable) fail(`karsilastirilabilen ${comparable} (beklenen ${EXPECTED_SECOND_KEY.comparable})`);
  if (notComparable.length !== EXPECTED_SECOND_KEY.notComparable) fail(`karsilastirilamayan ${notComparable.length} (beklenen ${EXPECTED_SECOND_KEY.notComparable})`);
  g.counts = { formattedFiles: files.length, formattedIds: formatted.size, comparable, equal, notComparable: notComparable.length };
  g.notComparable = notComparable;
}

// ------------------------------------------------------------------ banka + 10 duzeltmeler
const bank = keyRecords.map((r) => {
  const entry = {
    id: r.id,
    section: "reading-writing",
    domain: r.domain,
    skill: r.skill,
    skill_slug: slugify(r.skill),
    difficulty: fileDifficulty(r.source_file),
    question_type: "mcq",
    prompt: r.stem,
    choices: Object.fromEntries(LETTERS.map((k) => [k, r.choices[k]])),
    correct_answer: [r.answer],
  };
  if (r.figure) entry.figure_path = `figures/${r.id}.webp`;
  entry.explanation_en = r.rationale;
  entry.source_file = r.source_file;
  entry.needs_review = true;
  return entry;
});
const bankById = new Map(bank.map((q) => [q.id, q]));

const appliedCorrections = [];
{
  const { g, fail } = gate("10", "duzeltmeler (corrections.json)");
  const path = join(RW_OUT, "corrections.json");
  const raw = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
  const list = Array.isArray(raw) ? raw : raw.corrections ?? [];
  const FIELDS = new Set(["prompt", "explanation_en", ...LETTERS.map((k) => `choices.${k}`)]);
  for (const c of list) {
    const label = `${c.id} ${c.field}`;
    const q = bankById.get(c.id);
    if (!q) {
      fail(`${label}: id bankada yok`);
      continue;
    }
    if (!FIELDS.has(c.field)) fail(`${label}: gecersiz alan`);
    if (!["source-typo", "source-format"].includes(c.kind)) fail(`${label}: gecersiz kind ${c.kind}`);
    for (const key of ["find", "reason", "evidence"]) if (typeof c[key] !== "string" || !c[key].trim()) fail(`${label}: ${key} bos`);
    if (typeof c.replace !== "string") fail(`${label}: replace metin degil`);
    if (!FIELDS.has(c.field) || typeof c.find !== "string" || !c.find) continue;
    const [field, letter] = c.field.split(".");
    const current = letter ? q.choices[letter] : q[field];
    const occurrences = current.split(c.find).length - 1;
    if (occurrences !== 1) {
      fail(`${label}: find metni ${occurrences} kez geciyor (tam 1 olmali): ${c.find}`);
      continue;
    }
    const next = current.replace(c.find, () => c.replace);
    if (letter) q.choices[letter] = next;
    else q[field] = next;
    appliedCorrections.push({ id: c.id, field: c.field, kind: c.kind, find: c.find, replace: c.replace, reason: c.reason, evidence: c.evidence });
  }
  g.counts = { listed: list.length, applied: appliedCorrections.length };
}

// ------------------------------------------------------------------ 6 sozlesme
function fieldsOf(q) {
  return [["prompt", q.prompt], ...LETTERS.map((k) => [`choices.${k}`, q.choices[k]]), ["explanation_en", q.explanation_en]];
}

{
  const { g, fail } = gate("6", "metin sozlesmesi");
  const RESIDUE = /Question ID|Correct Answer|Question Difficulty|\bAssessment\b|\bID: [0-9a-f]{8}|^Rationale$/m;
  let texts = 0;
  for (const q of bank) {
    for (const [field, text] of fieldsOf(q)) {
      texts += 1;
      const at = `${q.id} ${field}`;
      for (const issue of markIssues(text)) fail(`${at}: ${issue}`);
      const plain = stripMarks(text);
      if (/<\/?[A-Za-z][^<>\n]*>?/.test(plain)) fail(`${at}: stripMarks sonrasi etiket benzeri yazi`);
      if (/(?<!\\)\$/.test(text)) fail(`${at}: kacissiz $`);
      if (/\\(?!\$)/.test(text)) fail(`${at}: \\ karakteri`);
      if (RESIDUE.test(plain)) fail(`${at}: sayfa/kunye kalintisi`);
      if (text.includes("\n\n\n")) fail(`${at}: art arda uc satir sonu`);
      if (text !== text.trim()) fail(`${at}: bas/son bosluk`);
      if (/ {2}|\t| \n|\n /.test(text)) fail(`${at}: fazla bosluk`);
      if (/[\ufb00-\ufb04\u00a0\u00ad\u200b\u2002\u2003]/.test(text)) fail(`${at}: bitisik harf / ozel bosluk kalintisi`);
      // Alt cizgi: ya tam 6 (bosluk) ya da iki yani harf/rakam olan tek alt cizgi (K5_106 gibi kimlik).
      for (const run of plain.matchAll(/_+/g)) {
        const before = plain[run.index - 1] ?? "";
        const after = plain[run.index + run[0].length] ?? "";
        const identifier = run[0].length === 1 && /[\p{L}\p{N}]/u.test(before) && /[\p{L}\p{N}]/u.test(after);
        if (run[0].length !== 6 && !identifier) fail(`${at}: ${run[0].length} alt cizgi (bosluk tam 6, kimlik ici tek)`);
      }
      if ((text.match(/\u2022/g) ?? []).length !== (text.match(/(?:^|\n)\u2022 /g) ?? []).length) fail(`${at}: satir basinda olmayan madde imi`);
      if (field !== "prompt" && /(?<!\n)\n(?!\n)/.test(text)) fail(`${at}: sik/aciklamada tek satir sonu`);
    }
  }
  g.counts = { texts };
}

// ------------------------------------------------------------------ 7 alti cizili
{
  const { g, fail } = gate("7", "alti cizili");
  const withoutWord = [];
  let withWord = 0;
  for (const q of bank) {
    const says = /underlined/.test(stripMarks(q.prompt));
    const has = q.prompt.includes("<u>");
    if (says) {
      withWord += 1;
      if (!has) fail(`${q.id}: kokte "underlined" var, <u> yok`);
    } else if (has) withoutWord.push(`${q.id} (${q.skill})`);
    for (const [field, text] of fieldsOf(q)) if (field !== "prompt" && text.includes("<u>")) withoutWord.push(`${q.id} ${field}`);
  }
  g.counts = { promptsSayingUnderlined: withWord, withUnderline: bank.filter((q) => q.prompt.includes("<u>")).length, underlineWithoutWord: withoutWord.length };
  g.notes.push(`<u> tasiyip kokunde "underlined" gecmeyenler (Words in Context beklenir): ${withoutWord.join(", ")}`);
}

// ------------------------------------------------------------------ 8 bosluk
{
  const { g, fail } = gate("8", "bosluk");
  let checked = 0;
  for (const q of bank) {
    if (!/completes the text/.test(q.prompt)) continue;
    checked += 1;
    if (!q.prompt.includes("______")) fail(`${q.id}: "completes the text" var, bosluk yok`);
  }
  g.counts = { completesTheText: checked, withBlank: bank.filter((q) => q.prompt.includes("______")).length };
}

// ------------------------------------------------------------------ 9 gorsel
{
  const { g, fail, warn } = gate("9", "gorsel");
  const byKind = countBy(keyRecords.filter((r) => r.figure), (r) => r.figure.kind);
  for (const [kind, expected] of Object.entries(EXPECTED_FIGURES)) {
    if ((byKind[kind] ?? 0) !== expected) fail(`${kind}: ${byKind[kind] ?? 0} (beklenen ${expected})`);
  }
  const recordById = new Map(keyRecords.map((r) => [r.id, r]));
  let present = 0;
  for (const q of bank) {
    const says = /\b(graph|table)\b/i.test(stripMarks(q.prompt));
    const figure = recordById.get(q.id).figure;
    if (says && !figure) {
      if (FIGURE_WORD_ALLOWLIST[q.id]) g.notes.push(`${q.id}: gorselsiz izinli (${FIGURE_WORD_ALLOWLIST[q.id]})`);
      else fail(`${q.id}: kokte graph/table var, gorsel yok`);
    }
    if (figure && !says) warn(`${q.id}: gorsel var, kokte graph/table yok`);
    if (!q.figure_path) continue;
    const file = join(RW_OUT, q.figure_path);
    if (!existsSync(file)) {
      if (requireFigures) fail(`${q.id}: ${q.figure_path} yok`);
      else warn(`${q.id}: ${q.figure_path} henuz yok`);
      continue;
    }
    present += 1;
    const head = readFileSync(file).subarray(0, 12);
    if (head.toString("ascii", 0, 4) !== "RIFF" || head.toString("ascii", 8, 12) !== "WEBP") fail(`${q.id}: ${q.figure_path} WebP degil`);
    if (statSync(file).size > 512 * 1024) fail(`${q.id}: ${q.figure_path} 512 KB'tan buyuk`);
  }
  for (const id of Object.keys(FIGURE_WORD_ALLOWLIST)) if (!bankById.has(id)) fail(`izin listesindeki ${id} bankada yok`);
  g.counts = { ...byKind, total: Object.values(byKind).reduce((a, b) => a + b, 0), figureFilesPresent: present, requireFigures };
}

// ------------------------------------------------------------------ cikti
const output = { bank, failures, warnings, excluded: [] };
writeJson(join(RW_OUT, "bank.json"), output);
const report = {
  ok: failures.length === 0,
  totals: { bank: bank.length, failures: failures.length, warnings: warnings.length, corrections: appliedCorrections.length },
  gates: gates.map((g) => ({
    gate: g.gate,
    name: g.name,
    ok: g.ok,
    counts: g.counts,
    failureCount: g.failures.length,
    failures: g.failures.slice(0, 25),
    warningCount: g.warnings.length,
    warnings: g.warnings.slice(0, 25),
    notes: g.notes,
    ...(g.notComparable ? { notComparable: g.notComparable } : {}),
  })),
  corrections: appliedCorrections,
  figureLeftovers,
};
writeJson(join(RW_OUT, "validate-report.json"), report);

for (const g of gates) {
  const counts = JSON.stringify(g.counts, (key, value) => (key === "perFile" ? undefined : value));
  console.log(`${g.ok ? "OK  " : "HATA"} kapi ${g.gate} ${g.name}: ${counts}${g.failures.length ? ` (${g.failures.length} hata)` : ""}${g.warnings.length ? ` (${g.warnings.length} uyari)` : ""}`);
  for (const message of g.failures.slice(0, 5)) console.log(`       ${message.slice(0, 300)}`);
}
console.log(`bank.json: ${bank.length} soru, ${failures.length} hata, ${warnings.length} uyari, ${appliedCorrections.length} duzeltme -> ${RW_OUT}`);
if (failures.length > 0) process.exitCode = 1;
