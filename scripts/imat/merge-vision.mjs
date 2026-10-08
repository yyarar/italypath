// IMAT goruntuden yazim birlestirme (plan Gorev 10; runbook docs/superpowers/specs/assets/imat-vision-extraction-prompt.md).
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/merge-vision.mjs --years 2023,2024,2025
//
// Her paket icin iki bagimsiz gecis okunur: package-NN.json -> result-NN-a.json + result-NN-b.json, package-NN-img.json
// -> result-NN-img-a.json + result-NN-img-b.json. Eksik sonuc dosyasi olan yil birlestirilmez (liste basilir, cikis 1);
// tam yillar yine yazilir. Sema bozuklugu (eksik/tekrarli numara, pakette olmayan goruntu, gecersiz kutu) da yili durdurur.
//
// Karsilastirma: prompt ve her sik normalizeForCompare (isaretler silinir, bosluk tek, bas/son kirpilir) ile; ayniysa
// a gecisinin metni alinir, farkliysa alan vision/<yil>/conflicts.json'a [{ id, number, field, a, b, resolved }] yazilir
// ve soru blocked: true, blockReason "vision-conflict" olur. Sekil: tur farkli ya da kutular az ortusuyor (IoU < 0.5)
// -> catisma (field "figure"); ortusuyorsa iki kutunun birlesimi. Hakem gecisi vision/<yil>/resolutions.json
// [{ id, field, value, note }] yazar (field: prompt | choices.<harf> | figure | section); varsa uygulanir ve o alanin
// catismasini ve ipucu farkini kapatir.
//
// Sayfa kipi (2023: metin katmani bozuk): id = questionId(yil, numara); bolum kagit sirasindan (MOCK_SECTION_COUNTS),
// gecisin yazdigi bolum farkliysa catisma (field "section"). "continues on page" / "continued from page" notlu parcalar
// numaraya gore sayfa sirasiyla birlesir (ilk parca cumle sonu isaretiyle bitiyorsa "\n\n", degilse bosluk; siklar
// harf harf hangi parcadaysa oradan). Cikti extract/<yil>.json { year, source: "vision", questions } (metin yili ile ayni
// soru bicimi + figureBox { kind, box, space: "page", image, page }).
// Soru kipi (2024, 2025: hasImage sorulari): yazim extract/<yil>.json'a yerinde islenir (source "text" kalir); soru
// visionRewritten: true, textHint { prompt, choices } (ilk metin katmani, sonraki calismalar bunu kullanir), figureBox
// { kind, box, space: "crop", image, page, cropBox }. Ipucu karsilastirmasi (lib/text.mjs alignToHint): formul disindaki
// her karakter ipucuyla ayni sirada olmali; fark -> blocked "hint-mismatch", vision/<yil>/hint-mismatch.json yalniz
// kelime konumlarini yazar. Ayni girdiyle iki calisma ayni dosyalari uretir.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { MOCK_SECTION_COUNTS, MOCK_YEARS, SECTIONS } from "../../lib/imat/taxonomy.mjs";
import { CHOICE_LETTERS, alignToHint, normalizeForCompare } from "./lib/text.mjs";
import { EXTRACT_DIR, INVENTORY_PATH, VISION_DIR, argValue, parseYears, questionId, readJson, writeJson } from "./paths.mjs";

const FIGURE_KINDS = ["diagram", "table"];
const MIN_FIGURE_IOU = 0.5;
const CONTINUATION = /continue[sd]?\s+(on|from)\s+page/i;
const SENTENCE_END = /[.?!:;"\u201d)]$/;
const TEXT_FIELDS = ["prompt", ...CHOICE_LETTERS.map((letter) => `choices.${letter}`)];

class MergeProblem extends Error {}

function mockSectionOf(number) {
  let end = 0;
  for (const section of SECTIONS) {
    end += MOCK_SECTION_COUNTS[section];
    if (number <= end) return section;
  }
  return null;
}

function fieldValue(question, field) {
  if (field === "prompt") return question.prompt;
  if (field.startsWith("choices.")) return question.choices[field.slice(8)];
  return question[field];
}

function setField(question, field, value) {
  if (field.startsWith("choices.")) question.choices[field.slice(8)] = value;
  else question[field] = value;
}

function cleanChoices(choices) {
  return Object.fromEntries(CHOICE_LETTERS.map((letter) => [letter, typeof choices?.[letter] === "string" ? choices[letter] : ""]));
}

// Kutu: 4 sayi, ici dolu; goruntu sinirina kistirilir ve tamsayiya yuvarlanir.
function cleanBox(box, size, where) {
  if (!Array.isArray(box) || box.length !== 4 || box.some((v) => !Number.isFinite(v))) throw new MergeProblem(`${where}: figure.box 4 sayi degil`);
  const [x0, y0, x1, y1] = [
    Math.max(0, Math.round(box[0])),
    Math.max(0, Math.round(box[1])),
    Math.min(size.width, Math.round(box[2])),
    Math.min(size.height, Math.round(box[3])),
  ];
  if (x1 <= x0 || y1 <= y0) throw new MergeProblem(`${where}: figure.box bos ya da ters`);
  return [x0, y0, x1, y1];
}

function cleanFigure(figure, size, where) {
  if (!figure || figure.kind === null || figure.kind === undefined) {
    if (figure?.box) throw new MergeProblem(`${where}: figure.kind yok ama box var`);
    return null;
  }
  if (!FIGURE_KINDS.includes(figure.kind)) throw new MergeProblem(`${where}: figure.kind ${figure.kind}`);
  return { kind: figure.kind, box: cleanBox(figure.box, size, where) };
}

function iou(a, b) {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const inter = ix * iy;
  const area = (box) => (box[2] - box[0]) * (box[3] - box[1]);
  return inter / (area(a) + area(b) - inter);
}

// Iki gecisin sekli: { figure, conflict } (figure a ile ayni goruntude; birlesim kutusu).
function mergeFigures(fa, fb, imageA, imageB) {
  if (!fa && !fb) return { figure: null, conflict: false };
  if (!fa || !fb || fa.kind !== fb.kind || imageA !== imageB) return { figure: fa, conflict: true };
  if (iou(fa.box, fb.box) < MIN_FIGURE_IOU) return { figure: fa, conflict: true };
  const box = [Math.min(fa.box[0], fb.box[0]), Math.min(fa.box[1], fb.box[1]), Math.max(fa.box[2], fb.box[2]), Math.max(fa.box[3], fb.box[3])];
  return { figure: { kind: fa.kind, box }, conflict: false };
}

function resultName(packageName, pass) {
  return packageName.replace(/^package-/, "result-").replace(/\.json$/, `-${pass}.json`);
}

function readResult(dir, name) {
  let data;
  try {
    data = readJson(join(dir, name));
  } catch (error) {
    throw new MergeProblem(`${name}: JSON okunamadi (${error.message})`);
  }
  if (!Array.isArray(data)) throw new MergeProblem(`${name}: dizi degil`);
  return data;
}

function loadResolutions(dir, ids) {
  const path = join(dir, "resolutions.json");
  if (!existsSync(path)) return new Map();
  const list = readJson(path);
  if (!Array.isArray(list)) throw new MergeProblem("resolutions.json dizi degil");
  const out = new Map();
  list.forEach((r, index) => {
    const at = `resolutions.json ${index + 1}`;
    if (!ids.has(r?.id)) throw new MergeProblem(`${at}: id ${r?.id} bu yilda yok`);
    if (![...TEXT_FIELDS, "figure", "section"].includes(r.field)) throw new MergeProblem(`${at}: gecersiz alan ${r.field}`);
    if (typeof r.note !== "string" || !r.note.trim()) throw new MergeProblem(`${at}: note bos`);
    if (TEXT_FIELDS.includes(r.field) && (typeof r.value !== "string" || !r.value.trim())) throw new MergeProblem(`${at}: value bos metin`);
    if (r.field === "section" && !SECTIONS.includes(r.value)) throw new MergeProblem(`${at}: gecersiz bolum`);
    if (r.field === "figure" && r.value !== null && !FIGURE_KINDS.includes(r.value?.kind)) throw new MergeProblem(`${at}: figure degeri null ya da { kind, box }`);
    const key = `${r.id}|${r.field}`;
    if (out.has(key)) throw new MergeProblem(`${at}: ${r.id} ${r.field} icin ikinci cozum`);
    out.set(key, r);
  });
  return out;
}

// Iki gecisi karsilastirir, cozumleri uygular. a/b: { prompt, choices, figure, image, section? }. Sekil cozumu
// { kind, box[, image] }: kutu a gecisinin sekil goruntusunde (sayfa kipinde image ile baska sayfa secilebilir).
function decide({ id, number, a, b, resolutions, sizeOf, images, expectedSection }) {
  const conflicts = [];
  const accepted = { prompt: a.prompt, choices: { ...a.choices }, section: a.section ?? null };
  for (const field of TEXT_FIELDS) {
    const va = fieldValue(a, field);
    const vb = fieldValue(b, field);
    if (normalizeForCompare(va) !== normalizeForCompare(vb)) conflicts.push({ id, number, field, a: va, b: vb });
  }
  const figures = mergeFigures(a.figure, b.figure, a.image, b.image);
  let figure = figures.figure;
  let figureImage = a.image;
  if (figures.conflict) conflicts.push({ id, number, field: "figure", a: a.figure, b: b.figure });
  if (expectedSection) {
    const wrong = [a.section, b.section].some((section) => section !== null && section !== undefined && section !== expectedSection);
    if (wrong) conflicts.push({ id, number, field: "section", a: a.section ?? null, b: b.section ?? null, expected: expectedSection });
    accepted.section = expectedSection;
  } else if ((a.section ?? null) !== (b.section ?? null)) {
    conflicts.push({ id, number, field: "section", a: a.section ?? null, b: b.section ?? null });
  }
  const resolved = new Set();
  for (const field of [...TEXT_FIELDS, "figure", "section"]) {
    const r = resolutions.get(`${id}|${field}`);
    if (!r) continue;
    resolved.add(field);
    if (field === "figure") {
      figureImage = r.value?.image ?? a.image;
      if (!images.includes(figureImage)) throw new MergeProblem(`resolutions ${id}: figure.image bu sorunun goruntusu degil`);
      figure = r.value === null ? null : cleanFigure(r.value, sizeOf(figureImage), `resolutions ${id}`);
    } else if (field === "section") {
      accepted.section = r.value;
    } else {
      setField(accepted, field, r.value);
    }
  }
  for (const conflict of conflicts) conflict.resolved = resolved.has(conflict.field);
  return { accepted, figure, figureImage, conflicts, resolved };
}

function withBlock(record, reasons) {
  return reasons.length === 0 ? record : { ...record, blocked: true, blockReason: reasons[0] };
}

function notesOf(a, b) {
  const na = String(a ?? "").trim();
  const nb = String(b ?? "").trim();
  return na || nb ? { visionNotes: { a: na, b: nb } } : {};
}

// ------------------------------------------------------------------ sayfa kipi
function stitch(fragments, pass, where) {
  const byNumber = new Map();
  for (const fragment of fragments) {
    if (!byNumber.has(fragment.number)) byNumber.set(fragment.number, []);
    byNumber.get(fragment.number).push(fragment);
  }
  const out = new Map();
  for (const [number, parts] of byNumber) {
    parts.sort((x, y) => x.page - y.page);
    if (parts.length > 1 && parts.some((part) => !CONTINUATION.test(part.notes ?? ""))) {
      throw new MergeProblem(`${where} gecis ${pass}: ${number}. soru ${parts.length} kez (devam notu olmadan)`);
    }
    let prompt = "";
    const choices = Object.fromEntries(CHOICE_LETTERS.map((letter) => [letter, ""]));
    let figure = null;
    let image = parts[0].image;
    for (const part of parts) {
      const text = String(part.prompt ?? "").trim();
      if (text) prompt = prompt ? `${prompt}${SENTENCE_END.test(prompt) ? "\n\n" : " "}${text}` : text;
      for (const letter of CHOICE_LETTERS) {
        const value = part.choices?.[letter];
        if (typeof value !== "string" || !value.trim()) continue;
        if (choices[letter]) throw new MergeProblem(`${where} gecis ${pass}: ${number}. soru ${letter} sikki iki parcada`);
        choices[letter] = value;
      }
      if (part.figure && !figure) {
        figure = part.figure;
        image = part.image;
      } else if (part.figure) {
        throw new MergeProblem(`${where} gecis ${pass}: ${number}. soru iki parcada sekil`);
      }
    }
    out.set(number, {
      number,
      prompt,
      choices,
      figure,
      image,
      images: parts.map((part) => part.image),
      page: parts[0].page,
      pages: parts.map((part) => part.page),
      section: parts.map((part) => part.section).find((section) => section !== null && section !== undefined) ?? null,
      notes: parts.map((part) => String(part.notes ?? "").trim()).filter(Boolean).join(" | "),
    });
  }
  return out;
}

async function mergePageYear(year, entry, dir, packages) {
  const expected = entry.expectedQuestions;
  const sizes = new Map();
  const pageOfImage = new Map();
  const passes = { a: [], b: [] };
  for (const name of packages) {
    const pkg = readJson(join(dir, name));
    const pages = new Map();
    for (const item of pkg) {
      if (item.id !== undefined || !Number.isInteger(item.page)) throw new MergeProblem(`${name}: sayfa paketi degil`);
      pages.set(item.image, item.page);
      pageOfImage.set(item.image, item.page);
      if (!sizes.has(item.image)) sizes.set(item.image, await sharp(item.image).metadata());
    }
    for (const pass of ["a", "b"]) {
      const file = resultName(name, pass);
      for (const [index, raw] of readResult(dir, file).entries()) {
        const where = `${file} #${index + 1}`;
        if (!pages.has(raw?.image)) throw new MergeProblem(`${where}: image paketteki sayfalardan biri degil`);
        if (!Number.isInteger(raw.number) || raw.number < 1 || raw.number > expected) throw new MergeProblem(`${where}: gecersiz numara`);
        if (raw.id !== null && raw.id !== undefined) throw new MergeProblem(`${where}: sayfa paketinde id null olmali`);
        passes[pass].push({
          number: raw.number,
          page: pages.get(raw.image),
          image: raw.image,
          prompt: typeof raw.prompt === "string" ? raw.prompt : "",
          choices: raw.choices ?? {},
          figure: cleanFigure(raw.figure, sizes.get(raw.image), where),
          section: raw.section ?? null,
          notes: raw.notes ?? "",
        });
      }
    }
  }
  const stitched = { a: stitch(passes.a, "a", year), b: stitch(passes.b, "b", year) };
  for (const pass of ["a", "b"]) {
    const missing = [];
    for (let n = 1; n <= expected; n += 1) if (!stitched[pass].has(n)) missing.push(n);
    if (missing.length > 0) throw new MergeProblem(`${year} gecis ${pass}: eksik soru ${missing.join(", ")}`);
  }
  const ids = new Set();
  for (let n = 1; n <= expected; n += 1) ids.add(questionId(year, n));
  const resolutions = loadResolutions(dir, ids);
  const questions = [];
  const conflicts = [];
  const stats = { questions: 0, stitched: 0, conflictQuestions: 0, figures: 0, blocked: 0, resolved: 0 };
  for (let number = 1; number <= expected; number += 1) {
    const id = questionId(year, number);
    const a = stitched.a.get(number);
    const b = stitched.b.get(number);
    const expectedSection = MOCK_YEARS.includes(year) ? mockSectionOf(number) : null;
    const images = [...new Set([...stitched.a.get(number).images, ...stitched.b.get(number).images])];
    const result = decide({ id, number, a, b, resolutions, sizeOf: (image) => sizes.get(image), images, expectedSection });
    if (!SECTIONS.includes(result.accepted.section) && !result.conflicts.some((c) => c.field === "section" && !c.resolved)) {
      throw new MergeProblem(`${year}:${number}: bolum yok (gecisler bolum yazmadi; resolutions ile ver)`);
    }
    conflicts.push(...result.conflicts);
    const open = result.conflicts.filter((c) => !c.resolved);
    const figureBox = result.figure
      ? { kind: result.figure.kind, box: result.figure.box, space: "page", image: result.figureImage, page: pageOfImage.get(result.figureImage) }
      : null;
    const record = withBlock(
      {
        id,
        number,
        section: result.accepted.section,
        page: a.page,
        bbox: null,
        prompt: result.accepted.prompt,
        choices: cleanChoices(result.accepted.choices),
        hasImage: figureBox !== null,
        imageBoxes: [],
        figureBox,
        ...(a.pages.length > 1 ? { stitchedPages: a.pages } : {}),
        ...notesOf(a.notes, b.notes),
      },
      open.length === 0 ? [] : [open.every((c) => c.field === "section") ? "section-mismatch" : "vision-conflict"]
    );
    questions.push(record);
    stats.questions += 1;
    if (a.pages.length > 1) stats.stitched += 1;
    if (result.conflicts.length > 0) stats.conflictQuestions += 1;
    if (figureBox) stats.figures += 1;
    if (record.blocked) stats.blocked += 1;
    stats.resolved += result.resolved.size;
  }
  return {
    files: [
      [join(EXTRACT_DIR, `${year}.json`), { year, source: "vision", questions }],
      [join(dir, "conflicts.json"), conflicts],
    ],
    stats,
  };
}

// ------------------------------------------------------------------ soru kipi
const MERGE_KEYS = ["blocked", "blockReason", "figureBox", "visionRewritten", "visionNotes", "textHint"];

function withoutMergeKeys(question) {
  return Object.fromEntries(Object.entries(question).filter(([key]) => !MERGE_KEYS.includes(key)));
}

function originalText(question) {
  return question.textHint ?? { prompt: question.prompt, choices: question.choices };
}

async function mergeQuestionYear(year, dir, packages) {
  const extractPath = join(EXTRACT_DIR, `${year}.json`);
  if (!existsSync(extractPath)) throw new MergeProblem(`${year}: ${extractPath} yok`);
  const data = readJson(extractPath);
  if (data.source !== "text") throw new MergeProblem(`${year}: extract source ${data.source} (soru kipi metin yili ister)`);
  const byId = new Map(data.questions.map((q) => [q.id, q]));
  const entries = new Map();
  const results = { a: new Map(), b: new Map() };
  for (const name of packages) {
    const pkg = readJson(join(dir, name));
    for (const item of pkg) {
      if (!item.id || !byId.has(item.id)) throw new MergeProblem(`${name}: ${item.id} extract'ta yok`);
      if (entries.has(item.id)) throw new MergeProblem(`${name}: ${item.id} iki pakette`);
      entries.set(item.id, item);
    }
    for (const pass of ["a", "b"]) {
      const file = resultName(name, pass);
      const ids = new Set(pkg.map((item) => item.id));
      for (const [index, raw] of readResult(dir, file).entries()) {
        const where = `${file} #${index + 1}`;
        if (!ids.has(raw?.id)) throw new MergeProblem(`${where}: id ${raw?.id} bu pakette yok`);
        if (results[pass].has(raw.id)) throw new MergeProblem(`${where}: ${raw.id} iki kez`);
        if (raw.number !== entries.get(raw.id).number) throw new MergeProblem(`${where}: numara ${raw.number}, paket ${entries.get(raw.id).number}`);
        results[pass].set(raw.id, raw);
      }
      for (const id of ids) if (!results[pass].has(id)) throw new MergeProblem(`${file}: ${id} sonucu yok`);
    }
  }
  const resolutions = loadResolutions(dir, new Set(entries.keys()));
  const conflicts = [];
  const mismatches = [];
  const stats = { questions: 0, conflictQuestions: 0, hintMismatchQuestions: 0, figures: 0, blocked: 0, resolved: 0 };
  const questions = [];
  for (const question of data.questions) {
    const base = withoutMergeKeys(question);
    const original = originalText(question);
    const item = entries.get(question.id);
    if (!item) {
      // Pakette olmayan soru: onceki birlestirmeden kalan yazim geri alinir (cikti yalniz girdilere bagli).
      questions.push({ ...base, prompt: original.prompt, choices: original.choices });
      continue;
    }
    const at = `${year}:${question.number} ${question.id}`;
    if (!question.textHint && (item.textHint !== question.prompt || JSON.stringify(item.choicesHint) !== JSON.stringify(question.choices))) {
      throw new MergeProblem(`${at}: paketteki ipucu extract metninden farkli (crop-questions.mjs yeniden)`);
    }
    if (!Array.isArray(item.cropBox) || item.cropBox.length !== 4) throw new MergeProblem(`${at}: pakette cropBox yok (crop-questions.mjs yeniden)`);
    const size = { width: item.cropBox[2] - item.cropBox[0], height: item.cropBox[3] - item.cropBox[1] };
    const pass = (raw, label) => ({
      prompt: typeof raw.prompt === "string" ? raw.prompt : "",
      choices: raw.choices ?? {},
      figure: cleanFigure(raw.figure, size, `${at} gecis ${label}`),
      image: item.image,
    });
    const a = pass(results.a.get(question.id), "a");
    const b = pass(results.b.get(question.id), "b");
    const result = decide({ id: question.id, number: question.number, a, b, resolutions, sizeOf: () => size, images: [item.image], expectedSection: null });
    conflicts.push(...result.conflicts.filter((c) => c.field !== "section"));
    const accepted = { prompt: result.accepted.prompt, choices: cleanChoices(result.accepted.choices) };
    const reasons = [];
    if (result.conflicts.some((c) => c.field !== "section" && !c.resolved)) reasons.push("vision-conflict");
    let mismatch = false;
    for (const field of TEXT_FIELDS) {
      const hint = fieldValue({ prompt: original.prompt, choices: original.choices ?? {} }, field) ?? "";
      const aligned = alignToHint(fieldValue(accepted, field), hint);
      if (aligned.ok) continue;
      const resolved = result.resolved.has(field);
      mismatches.push({ id: question.id, number: question.number, field, visionWords: aligned.visionWords, hintWords: aligned.hintWords, resolved });
      if (!resolved) mismatch = true;
    }
    if (mismatch) reasons.push("hint-mismatch");
    const figureBox = result.figure
      ? { kind: result.figure.kind, box: result.figure.box, space: "crop", image: item.image, page: question.page, cropBox: [...item.cropBox] }
      : null;
    const record = withBlock(
      {
        ...base,
        prompt: accepted.prompt,
        choices: accepted.choices,
        figureBox,
        visionRewritten: true,
        textHint: { prompt: original.prompt, choices: original.choices },
        ...notesOf(results.a.get(question.id).notes, results.b.get(question.id).notes),
      },
      reasons
    );
    questions.push(record);
    stats.questions += 1;
    if (result.conflicts.length > 0) stats.conflictQuestions += 1;
    if (mismatches.some((m) => m.id === question.id)) stats.hintMismatchQuestions += 1;
    if (figureBox) stats.figures += 1;
    if (record.blocked) stats.blocked += 1;
    stats.resolved += result.resolved.size;
  }
  return {
    files: [
      [extractPath, { ...data, questions }],
      [join(dir, "conflicts.json"), conflicts],
      [join(dir, "hint-mismatch.json"), mismatches],
    ],
    stats,
  };
}

// ------------------------------------------------------------------ ana akis
async function main() {
  const argv = process.argv.slice(2);
  const years = parseYears(argValue(argv, "--years"));
  if (!existsSync(INVENTORY_PATH)) throw new Error(`envanter yok: ${INVENTORY_PATH} (once: node scripts/imat/inventory.mjs)`);
  const inventory = new Map(readJson(INVENTORY_PATH).map((entry) => [entry.year, entry]));
  const missing = [];
  const problems = [];
  for (const year of years) {
    const entry = inventory.get(year);
    const dir = join(VISION_DIR, String(year));
    const packages = existsSync(dir) ? readdirSync(dir).filter((name) => /^package-\d{2}(-img)?\.json$/.test(name)).sort() : [];
    if (!entry || packages.length === 0) {
      problems.push(`${year}: ${entry ? `paket yok (${dir}); once crop-questions.mjs` : "envanterde yok"}`);
      continue;
    }
    const absent = packages.flatMap((name) => ["a", "b"].map((pass) => resultName(name, pass))).filter((name) => !existsSync(join(dir, name)));
    if (absent.length > 0) {
      missing.push(...absent.map((name) => join(dir, name)));
      console.log(`${year}: birlestirilmedi, ${absent.length} sonuc dosyasi eksik`);
      continue;
    }
    const pageKind = packages.filter((name) => !name.includes("-img"));
    const imgKind = packages.filter((name) => name.includes("-img"));
    try {
      let merged;
      if (entry.textLayer === "broken") {
        if (imgKind.length > 0) throw new MergeProblem(`${year}: metni bozuk yilda -img paketi beklenmez`);
        merged = await mergePageYear(year, entry, dir, pageKind);
      } else {
        if (pageKind.length > 0) throw new MergeProblem(`${year}: metin yilinda package-NN.json (--all) birlestirmesi bu betikte yok`);
        merged = await mergeQuestionYear(year, dir, imgKind);
      }
      for (const [path, content] of merged.files) writeJson(path, content);
      console.log(`${year}: ${JSON.stringify(merged.stats)} -> ${merged.files.map(([path]) => path.split("/").slice(-2).join("/")).join(", ")}`);
    } catch (error) {
      if (!(error instanceof MergeProblem)) throw error;
      problems.push(`${year}: ${error.message} (yil yazilmadi)`);
    }
  }
  if (missing.length > 0) console.error(`Eksik sonuc dosyalari (${missing.length}):\n  ${missing.join("\n  ")}`);
  if (problems.length > 0) console.error(`Sorunlar (${problems.length}):\n  ${problems.join("\n  ")}`);
  if (missing.length > 0 || problems.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
