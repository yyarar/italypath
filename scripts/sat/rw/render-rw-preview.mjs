// Okuma ve Yazma yan yana onizleme sayfasi (plan 2026-10-03, Gorev 5 ikinci madde; Gorev 10 pilotu).
// Her soru icin solda resmi goruntu (formatted-images/<id>.png; yoksa formatsiz soru PDF'inin sayfasi
// pdftoppm ile <RW_OUT>/unformatted-pages/<id>-p<N>.png olarak cizilir), sagda bizim kayit sitedeki
// QuestionCard kuralinca telefon genisliginde: cipler, RW'de gorsel metnin USTUNDE, prompt satir satir
// (components/sat/PassageText.tsx ile ayni kural: splitPassageBlocks; siir/diyalog dizesi ve not maddesi
// asili girintili, Text 1/2 etiketi kalin), siklar (dogru olan isaretli), aciklama. Metin
// lib/sat/mathSegments.mjs splitRichText ile parcalanir (site ile ayni modul): alti cizili <u>, italik <em>,
// her sey HTML-kacisli.
// Sayfa kendi kendine yeter: satir ici CSS, JS yok, ag yok; goruntuler goreli yolla (../formatted-images/...).
// Cikti Git disi <RW_OUT>/preview/<ad>.html (soru icerigi telifli; yayinlanmaz, yuklenmez).
//
// Kullanim:
//   SAT_BANK_OUT=<abs>/tmp/sat-bank/rw node scripts/sat/rw/render-rw-preview.mjs --ids c966ad55,af76771f --out pilot [--title "Pilot"] [--bank <yol>]
//   ... --ids-file <dosya> --out tum   # dosyada id'ler satir/virgul/bosluk ayrimli; # sonrasi yorum
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { splitPassageBlocks, splitRichText } from "../../../lib/sat/mathSegments.mjs";
import { listPdfsRecursive } from "../lib.mjs";
import {
  CHOICE_KEYS,
  DEFAULT_BANK,
  UNFORMATTED_DIR,
  figureAbsPath,
  hasHardLineBreak,
  hasNoteList,
  hasTwoTexts,
  listOfficialImages,
  parseCliArgs,
  readBank,
} from "./gate-rw.mjs";
import { RW_OUT, RW_QUESTIONS_ROOT } from "./paths.mjs";

const PREVIEW_DIR = path.join(RW_OUT, "preview");
const RENDER_WIDTH = 1400; // formatli goruntulerle ayni genislik
const MAX_SOURCE_PAGES = 3; // tek soru icin en cok bu kadar formatsiz sayfa
const PAGE_PAD = 24; // kirpilan formatsiz sayfanin beyaz kenari (px)
const DIFFICULTY = { 1: "Kolay", 2: "Orta", 3: "Zor" };

// ---------- resmi goruntu (formatsiz sayfa yedegi) ----------

let questionIndex;
function loadQuestionIndex() {
  if (questionIndex !== undefined) return questionIndex;
  const file = path.join(RW_OUT, "extract-questions.json");
  if (!existsSync(file) || !existsSync(RW_QUESTIONS_ROOT)) return (questionIndex = null);
  const records = JSON.parse(readFileSync(file, "utf8")).records ?? [];
  const pdfs = new Map(listPdfsRecursive(RW_QUESTIONS_ROOT).map((pdf) => [path.basename(pdf), pdf]));
  const starts = new Map();
  for (const record of records) {
    if (!starts.has(record.source_file)) starts.set(record.source_file, []);
    starts.get(record.source_file).push(record.page);
  }
  for (const pages of starts.values()) pages.sort((a, b) => a - b);
  questionIndex = { byId: new Map(records.map((record) => [record.id, record])), pdfs, starts };
  return questionIndex;
}

function pdfPageCount(pdf) {
  const match = execFileSync("pdfinfo", [pdf], { encoding: "utf8" }).match(/^Pages:\s+(\d+)/m);
  return match ? Number(match[1]) : 1;
}

/**
 * Resmi goruntu yollari. Formatli PNG yoksa sorunun formatsiz soru PDF'indeki sayfa(lar)i bir kez cizilir
 * (her soru yeni sayfada baslar: bitis = ayni dosyadaki sonraki sorunun sayfasi - 1).
 * Sayfanin bos kenarlari kirpilir (soru sayfanin ust kismindadir). Ham cizim gecici adla yazilir; kirpma
 * bitmeden <id>-p<N>.png olusmaz (yarim dosya sonraki calismada "hazir" sayilmasin).
 * Donus: { kind: "formatted" | "unformatted-page" | "none", paths: [mutlak yol] }.
 */
export async function officialImages(id) {
  const ready = listOfficialImages(id);
  if (ready.kind !== "none") return ready;
  const index = loadQuestionIndex();
  const record = index?.byId.get(id);
  const pdf = record ? index.pdfs.get(record.source_file) : null;
  if (!record || !pdf) return ready;
  const next = index.starts.get(record.source_file).find((page) => page > record.page);
  const last = Math.max(record.page, next ? next - 1 : pdfPageCount(pdf));
  mkdirSync(UNFORMATTED_DIR, { recursive: true });
  for (let page = record.page; page <= Math.min(last, record.page + MAX_SOURCE_PAGES - 1); page += 1) {
    const rawPrefix = path.join(UNFORMATTED_DIR, `${id}-p${page}.raw`);
    execFileSync("pdftoppm", [
      "-png", "-singlefile", "-f", String(page), "-l", String(page),
      "-scale-to-x", String(RENDER_WIDTH), "-scale-to-y", "-1",
      pdf, rawPrefix,
    ]);
    const trimmed = await sharp(`${rawPrefix}.png`)
      .trim({ background: "#ffffff", threshold: 12 })
      .extend({ top: PAGE_PAD, bottom: PAGE_PAD, left: PAGE_PAD, right: PAGE_PAD, background: "#ffffff" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    writeFileSync(path.join(UNFORMATTED_DIR, `${id}-p${page}.png`), trimmed);
    rmSync(`${rawPrefix}.png`, { force: true });
  }
  return listOfficialImages(id);
}

// ---------- ozel durumlar ----------

function figureKinds() {
  const file = path.join(RW_OUT, "extract-keys.json");
  if (!existsSync(file)) return new Map();
  const records = JSON.parse(readFileSync(file, "utf8")).records ?? [];
  return new Map(records.filter((record) => record.figure).map((record) => [record.id, record.figure.kind]));
}

/** Onizleme alt satirindaki ozel durum etiketleri (Turkce). */
export function specialCases(record, figureKind) {
  const texts = [record.prompt, ...CHOICE_KEYS.map((key) => record.choices[key])];
  const cases = [];
  if (texts.some((text) => text.includes("<u>"))) cases.push("altı çizili");
  if (texts.some((text) => text.includes("<i>"))) cases.push("italik");
  if (record.figure_path) cases.push(figureKind === "graph" ? "grafik" : figureKind === "table" ? "tablo" : "görsel");
  if (hasNoteList(record.prompt)) cases.push("not listesi");
  if (hasHardLineBreak(record.prompt)) cases.push("şiir/satır sonu");
  if (hasTwoTexts(record.prompt)) cases.push("iki metin");
  if (texts.some((text) => text.includes("______"))) cases.push("boşluk");
  if (texts.some((text) => splitRichText(text).some((segment) => segment.kind !== "text"))) cases.push("formül işareti (beklenmez)");
  return cases;
}

// ---------- HTML ----------

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** MathText ile ayni parcalama; RW'de formul beklenmez, cikarsa uyari kutusunda ham gosterilir. */
function richHtml(text) {
  return splitRichText(text)
    .map((segment) => {
      if (segment.kind !== "text") {
        const raw = segment.kind === "display" ? `$$${segment.value}$$` : `$${segment.value}$`;
        return `<span class="formula-warn" title="Formül işareti: Okuma ve Yazma metninde beklenmez">${esc(raw)}</span>`;
      }
      let html = esc(segment.value);
      if (segment.italic) html = `<em>${html}</em>`;
      if (segment.underline) html = `<u>${html}</u>`;
      return `<span>${html}</span>`;
    })
    .join("");
}

/** PassageText ile ayni cizim: paragraf bloklari, satir basina blok; madde imi sabit genislikte. */
function passageHtml(text) {
  return splitPassageBlocks(text)
    .map((block) => {
      const lines = block.lines
        .map((line) =>
          line.kind === "bullet"
            ? `<div class="line line-bullet"><span class="bullet">•</span><span>${richHtml(line.text.slice(2))}</span></div>`
            : `<div class="line line-${line.kind}">${richHtml(line.text)}</div>`
        )
        .join("");
      return `<div class="para">${lines}</div>`;
    })
    .join("");
}

function relUrl(absPath) {
  return path.relative(PREVIEW_DIR, absPath).split(path.sep).map(encodeURIComponent).join("/");
}

function officialColumn(id, official) {
  if (official.kind === "none") {
    return `<div class="official"><p class="col-label">Resmî görüntü</p><div class="missing">Resmî görüntü bulunamadı.</div></div>`;
  }
  const formatted = official.kind === "formatted";
  const label = formatted ? "Resmî görüntü" : "Formatsız kaynak sayfası";
  const note = formatted
    ? ""
    : `<p class="col-note">Bu sorunun resmî görüntüsü yok; kaynak PDF'in sayfası gösteriliyor. Üstteki künye tablosu soruya dahil değil.</p>`;
  const images = official.paths
    .map((abs) => {
      const url = relUrl(abs);
      return `<a href="${esc(url)}" title="Tam boyutta açmak için tıklayın"><img src="${esc(url)}" alt="${esc(`${label}, soru ${id}`)}" loading="lazy"></a>`;
    })
    .join("");
  return `<div class="official"><p class="col-label">${label}</p>${note}<div class="official-images">${images}</div></div>`;
}

function figureHtml(record) {
  const abs = figureAbsPath(record);
  if (!abs) return "";
  if (!existsSync(abs)) {
    return `<div class="figure-missing">Görsel henüz üretilmedi<small>${esc(record.figure_path)}</small></div>`;
  }
  return `<img class="figure" src="${esc(relUrl(abs))}" alt="Soru görseli" loading="lazy">`;
}

function cardHtml(record) {
  const key = record.correct_answer[0];
  const choices = CHOICE_KEYS.map((choice) => {
    const correct = choice === key;
    return `<div class="choice${correct ? " is-correct" : ""}"><span class="key">${choice}</span><span class="choice-body"><span>${richHtml(record.choices[choice])}</span>${correct ? `<span class="correct-tag">Doğru cevap</span>` : ""}</span></div>`;
  }).join("");
  const explanation = record.explanation_en
    ? `<footer class="card-foot"><section class="explanation"><h3>Açıklama</h3><div class="pre">${richHtml(record.explanation_en)}</div></section></footer>`
    : `<footer class="card-foot"><p class="missing-inline">Açıklama yok.</p></footer>`;
  return [
    `<article class="card">`,
    `<header class="chips"><span class="chip">${esc(record.domain ?? "")} · ${esc(record.skill ?? "")}</span><span class="chip chip-level">${DIFFICULTY[record.difficulty] ?? "?"}</span></header>`,
    figureHtml(record),
    `<div class="prompt">${passageHtml(record.prompt)}</div>`,
    `<div class="choices">${choices}</div>`,
    explanation,
    `</article>`,
  ].join("");
}

const CSS = `
:root {
  --editorial-paper: #f8f7f1;
  --editorial-surface: #fffefa;
  --editorial-ink: #15201c;
  --editorial-muted: #59645f;
  --editorial-sage: #1f4f46;
  --editorial-sage-soft: #dbe8e1;
  --editorial-terracotta: #b75b38;
  --editorial-terracotta-ink: #9f4629;
  --editorial-border: #d8ded9;
  --editorial-band: #f5f1e8;
  --sans: "Hanken Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --serif: "Spectral", ui-serif, Georgia, Cambria, "Times New Roman", serif;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--editorial-paper); color: var(--editorial-ink); font-family: var(--sans); -webkit-font-smoothing: antialiased; }
.page { max-width: 1320px; margin: 0 auto; padding: 40px 24px 96px; }
.page-head { max-width: 860px; margin-bottom: 36px; }
.eyebrow { margin: 0 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--editorial-muted); }
h1 { margin: 0 0 12px; font-family: var(--serif); font-weight: 600; font-size: 34px; line-height: 1.15; color: var(--editorial-ink); }
.count { margin: 0 0 16px; font-size: 15px; font-weight: 600; color: var(--editorial-sage); }
.lede { margin: 0 0 10px; font-size: 15px; line-height: 1.7; }
.gen { margin: 0; font-size: 13px; line-height: 1.6; color: var(--editorial-muted); }
.toc { display: flex; flex-wrap: wrap; gap: 6px; margin: 20px 0 0; padding: 0; list-style: none; }
.toc a { display: inline-block; padding: 4px 8px; border-radius: 8px; border: 1px solid var(--editorial-border); background: var(--editorial-surface); color: var(--editorial-muted); font-size: 12px; text-decoration: none; font-variant-numeric: tabular-nums; }
.toc a:hover { border-color: var(--editorial-sage); color: var(--editorial-sage); }
.pair { padding: 28px 0 32px; border-top: 1px solid var(--editorial-border); }
.pair-head { margin: 0 0 14px; font-size: 13px; font-weight: 700; color: var(--editorial-sage); font-variant-numeric: tabular-nums; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) 390px; gap: 28px; align-items: start; }
.col-label { margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--editorial-muted); }
.col-note { margin: -2px 0 10px; font-size: 13px; line-height: 1.5; color: var(--editorial-terracotta-ink); }
.official { position: sticky; top: 16px; }
.official-images { display: grid; gap: 10px; }
.official-images a { display: block; }
.official-images img { display: block; width: 100%; height: auto; border: 1px solid var(--editorial-border); border-radius: 12px; background: #fff; }
.missing { padding: 28px 20px; border: 1px dashed var(--editorial-terracotta); border-radius: 12px; color: var(--editorial-terracotta-ink); font-size: 14px; background: var(--editorial-surface); }
.phone { width: 390px; padding: 16px; background: var(--editorial-paper); box-shadow: 0 0 0 1px var(--editorial-border); border-radius: 22px; }
.meta { margin: 16px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--editorial-muted); }
.meta code { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; color: var(--editorial-ink); }
.meta strong { color: var(--editorial-ink); font-weight: 600; }

/* QuestionCard (components/sat/QuestionCard.tsx), telefon: p-5, max-w-2xl px-4 kapsayicida */
.card { overflow: hidden; border-radius: 1.4rem; border: 1px solid rgba(31,79,70,0.16); background: rgba(255,254,250,0.88); padding: 20px; box-shadow: 0 18px 50px rgba(21,32,28,0.06); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; font-size: 11px; font-weight: 600; color: var(--editorial-muted); }
.chip { border-radius: 8px; background: var(--editorial-band); padding: 6px 10px; }
.chip-level { background: var(--editorial-sage-soft); color: var(--editorial-sage); }
.figure { display: block; max-width: 100%; height: auto; margin-bottom: 28px; border-radius: 12px; border: 1px solid var(--editorial-border); background: #fff; }
.figure-missing { display: flex; flex-direction: column; gap: 4px; margin-bottom: 28px; padding: 22px 16px; border-radius: 12px; border: 1px dashed var(--editorial-terracotta); background: rgba(183,91,56,0.06); color: var(--editorial-terracotta-ink); font-size: 13px; font-weight: 600; text-align: center; }
.figure-missing small { font-weight: 400; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 11px; color: var(--editorial-muted); }
.prompt { margin-bottom: 28px; white-space: pre-line; font-size: 16px; line-height: 32px; color: var(--editorial-ink); }
.pre { white-space: pre-line; }
/* PassageText (components/sat/PassageText.tsx): space-y-8, font-semibold, pl-[1.5em] -indent-[1.5em], w-[1.25em] */
.para + .para { margin-top: 32px; }
.line-label { font-weight: 600; }
.line-verse { padding-left: 1.5em; text-indent: -1.5em; }
.line-bullet { display: flex; }
.line-bullet .bullet { width: 1.25em; flex-shrink: 0; }
.line-bullet > span:last-child { min-width: 0; }
.card u { text-decoration-line: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
.choices { display: grid; gap: 10px; }
.choice { display: flex; align-items: flex-start; gap: 12px; min-height: 56px; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--editorial-border); background: rgba(255,254,250,0.82); font-size: 14px; line-height: 24px; }
.choice.is-correct { border-color: var(--editorial-sage); background: var(--editorial-sage-soft); box-shadow: 0 4px 14px rgba(31,79,70,0.08); }
.key { display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--editorial-border); font-weight: 600; color: var(--editorial-sage); }
.choice-body { display: flex; flex-direction: column; min-width: 0; }
.correct-tag { margin-top: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: var(--editorial-sage); }
.correct-tag::before { content: "✓ "; }
.card-foot { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--editorial-border); }
.explanation { border-radius: 12px; border: 1px solid var(--editorial-border); background: var(--editorial-paper); padding: 16px; font-size: 14px; line-height: 28px; color: var(--editorial-ink); }
.explanation h3 { margin: 0 0 8px; font-size: 12px; font-weight: 700; color: var(--editorial-sage); }
.missing-inline { margin: 0; font-size: 13px; color: var(--editorial-terracotta-ink); }
.formula-warn { padding: 0 3px; border-radius: 4px; outline: 1px dashed var(--editorial-terracotta); color: var(--editorial-terracotta-ink); }

@media (max-width: 1000px) {
  .cols { grid-template-columns: minmax(0, 1fr); }
  .official { position: static; }
  .phone { width: min(390px, 100%); }
}
@media (max-width: 480px) {
  .page { padding: 24px 16px 64px; }
  h1 { font-size: 27px; }
}
@media print {
  .official { position: static; }
  .pair { break-inside: avoid; }
}
`;

function pageHtml({ title, records, kinds, officials, bankLabel }) {
  const stamp = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const pairs = records
    .map((record, index) => {
      const cases = specialCases(record, kinds.get(record.id));
      return [
        `<section class="pair" id="q-${record.id}">`,
        `<p class="pair-head">${index + 1} / ${records.length}</p>`,
        `<div class="cols">`,
        officialColumn(record.id, officials.get(record.id)),
        `<div><p class="col-label">Sitede görünecek hâli · telefon</p><div class="phone">${cardHtml(record)}</div></div>`,
        `</div>`,
        `<p class="meta">Kimlik <code>${record.id}</code> · Kaynak: ${esc(record.source_file ?? "?")} · Özel durumlar: <strong>${cases.length > 0 ? esc(cases.join(", ")) : "yok"}</strong></p>`,
        `</section>`,
      ].join("\n");
    })
    .join("\n");
  const toc =
    records.length > 1
      ? `<ol class="toc">${records.map((record, index) => `<li><a href="#q-${record.id}">${index + 1} · ${record.id}</a></li>`).join("")}</ol>`
      : "";
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="page">
<header class="page-head">
<p class="eyebrow">SAT Okuma ve Yazma · önizleme</p>
<h1>${esc(title)}</h1>
<p class="count">${records.length} soru</p>
<p class="lede">Her soruda solda resmî görüntü, sağda aynı sorunun sitede telefonda görüneceği hâli var. İki sütunu yan yana okuyun: kelimeler, altı çizili ve italik bölümler, satır sonları, boşluklar (______) ve grafik ya da tablo aynı olmalı. Doğru cevap ve açıklama bu sayfada hep açık; sitede öğrenci cevap verdikten sonra görünür.</p>
<p class="gen">Bu sayfa ${esc(stamp)} tarihinde ${esc(bankLabel)} dosyasından otomatik üretildi. Resmî görüntüyü büyütmek için üstüne tıklayın. Soru metinleri telifli sınav içeriğidir; sayfayı paylaşmayın.</p>
${toc}
</header>
<main>
${pairs}
</main>
</div>
</body>
</html>
`;
}

// ---------- CLI ----------

function parseIds(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/#.*/, ""))
    .join(" ")
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2), { values: ["--ids", "--ids-file", "--out", "--title", "--bank"] });
  const { values } = args;
  if (Boolean(values["--ids"]) === Boolean(values["--ids-file"])) throw new Error("--ids <id,id> veya --ids-file <dosya> (yalniz biri) zorunlu.");
  const out = (values["--out"] ?? "").replace(/\.html$/, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(out)) throw new Error("--out <ad> zorunlu (harf, rakam, . _ -).");

  const ids = [...new Set(parseIds(values["--ids"] ?? readFileSync(path.resolve(values["--ids-file"]), "utf8")))];
  if (ids.length === 0) throw new Error("Id listesi bos.");
  const bankPath = path.resolve(values["--bank"] ?? DEFAULT_BANK);
  const bank = new Map(readBank(bankPath).map((record) => [record.id, record]));
  const unknown = ids.filter((id) => !bank.has(id));
  if (unknown.length > 0) throw new Error(`Bankada olmayan id: ${unknown.join(", ")}`);

  const records = ids.map((id) => bank.get(id));
  const officials = new Map();
  for (const record of records) officials.set(record.id, await officialImages(record.id));
  const kinds = figureKinds();
  const title = values["--title"] ?? "Okuma ve Yazma önizlemesi";

  mkdirSync(PREVIEW_DIR, { recursive: true });
  const target = path.join(PREVIEW_DIR, `${out}.html`);
  writeFileSync(target, pageHtml({ title, records, kinds, officials, bankLabel: path.basename(bankPath) }), "utf8");

  const unformatted = records.filter((record) => officials.get(record.id).kind === "unformatted-page").map((record) => record.id);
  const noImage = records.filter((record) => officials.get(record.id).kind === "none").map((record) => record.id);
  const missingFigures = records.filter((record) => record.figure_path && !existsSync(figureAbsPath(record))).map((record) => record.id);
  console.log(`Onizleme: ${target} (${records.length} soru)`);
  if (unformatted.length > 0) console.log(`Formatsiz sayfa gosterilen: ${unformatted.join(", ")}`);
  if (noImage.length > 0) console.log(`Resmi goruntu bulunamayan: ${noImage.join(", ")}`);
  if (missingFigures.length > 0) console.log(`Gorseli henuz olmayan: ${missingFigures.length} (${missingFigures.slice(0, 10).join(", ")}${missingFigures.length > 10 ? ", ..." : ""})`);
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
