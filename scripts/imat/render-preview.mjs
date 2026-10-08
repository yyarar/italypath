// IMAT yan yana pilot onizleme (plan 2026-10-08 Gorev 13 Step 1; kalip scripts/sat/rw/render-rw-preview.mjs).
// Her soru icin solda kagit (resmi PDF'in 200 dpi sayfa goruntusunden kirpinti), sagda bizim kayit sitedeki
// components/imat/ImatQuestionCard.tsx kuralinca telefon genisliginde (390 px): cipler (yil, numara, bolum, konu, id),
// soru metni (reading-general splitPassageBlocks ile satir satir, diger bolumler tek MathText), sekil metnin ALTINDA,
// bes sik A-E, dogru sik isaretli. Karistirilan yillarda (shuffle.order) her sikkin kagittaki harfi kucuk notla
// yazilir; karistirma istisnasinda gerekce gosterilir. Metin lib/sat/mathSegments.mjs splitRichText ile parcalanir
// (site ile ayni modul): <u> alti cizili, <i> italik, `$..$` / `$$..$$` katex.renderToString; duz metin HTML-kacisli.
//
// Sol goruntu (<IMAT_OUT>/preview/crops/<yil>/): bbox'i olan soruda (metin yili) sayfa extract/<yil>.json bbox'i
// + 12 pt payla kirpilir (q-NN.png). bbox yoksa (goruntuden yazim yili, 2023) sayfanin tamami kucultulur: figureBox
// varsa sekil turuncu cerceveyle isaretlenir (q-NN.png), yoksa sayfa bir kez yazilir (p-NN.png; ayni sayfadaki sorular
// paylasir). pages-quartz/<yil>/p-NN.png varsa (2024'te italigi dogru cizen ikinci cizim) o tercih edilir.
// 2025 kagidindaki dogru sik vurgusu maskelenmez (onizlemede cevap zaten acik).
// Sayfa kendi kendine yeter: satir ici CSS (KaTeX CSS dahil), JS yok, ag yok; goruntuler ve KaTeX yazi tipleri goreli
// yolla (crops/, ../pages/, ../figures/, katex-fonts/). Cikti Git disi <IMAT_OUT>/preview/<ad>.html (soru icerigi
// telifli; yayinlanmaz, yuklenmez). Tarih damgasi yok: ayni girdi ayni ciktiyi verir, degismeyen dosya yeniden yazilmaz.
// Yazdiktan sonra sayfadaki her goruntu/baglanti/yazi tipi yolunun diskte oldugu denetlenir (eksik -> cikis 1).
// Konsol soru metni tasimaz.
//
// Kullanim:
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/render-preview.mjs --years 2025 --out 2025
//   ... --ids 1b5551ed,d68bb14b --out ornek [--title "Baslik"] [--bank <yol>]
//   ... --ids-file <dosya> --out ornek   # id'ler satir/virgul/bosluk ayrimli; # sonrasi yorum
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import katex from "katex";
import sharp from "sharp";

import { splitPassageBlocks, splitRichText } from "../../lib/sat/mathSegments.mjs";
import { CHOICE_KEYS, figureAbsPath, parseCliArgs, readBank, selectIds } from "./gate-imat.mjs";
import { BANK_PATH, EXTRACT_DIR, IMAT_OUT, PAGE_DPI, PREVIEW_DIR, pad2, pagePath, parseYears, readJson } from "./paths.mjs";

const CROPS_DIR = path.join(PREVIEW_DIR, "crops");
const FONTS_DIR = path.join(PREVIEW_DIR, "katex-fonts");
const QUARTZ_DIR = path.join(IMAT_OUT, "pages-quartz");
const MARGIN_PT = 12; // kirpinti payi (PDF noktasi)
const WHOLE_PAGE_WIDTH = 1240; // bbox'siz yilda tum sayfa bu genislige kucultulur (150 dpi)
const OUTLINE_COLOR = "#b75b38"; // sekil cercevesi (editorial terracotta)
const OUTLINE_PAD = 10;
const OUTLINE_STROKE = 6;
// lib/translations/tr.ts imat.sections ile ayni (sitede bolum cipi bu metni gosterir).
const SECTION_LABELS = Object.freeze({
  "reading-general": "Okuma ve genel kültür",
  logic: "Mantık ve problem çözme",
  biology: "Biyoloji",
  chemistry: "Kimya",
  "physics-math": "Fizik ve matematik",
});

const require = createRequire(import.meta.url);

// ---------- dosya yardimcilari ----------

/** Icerik ayniysa dokunmaz (idempotent); donus: yazildi mi. */
function writeIfChanged(file, data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
  if (existsSync(file) && readFileSync(file).equals(buffer)) return false;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, buffer);
  return true;
}

function relUrl(absPath) {
  return path.relative(PREVIEW_DIR, absPath).split(path.sep).map(encodeURIComponent).join("/");
}

// ---------- KaTeX CSS + yazi tipleri ----------

// Her @font-face src listesinden yalniz woff2 kalir; yazi tipi katex-fonts/ altina kopyalanir.
const FONT_SRC = /src:url\(fonts\/(KaTeX_[A-Za-z0-9_-]+\.woff2)\) format\("woff2"\)(?:,url\(fonts\/[^)]+\) format\("[a-z]+"\))*/g;

function katexCss() {
  const cssFile = require.resolve("katex/dist/katex.min.css");
  const fontsSource = path.join(path.dirname(cssFile), "fonts");
  const fonts = new Set();
  const css = readFileSync(cssFile, "utf8").replace(FONT_SRC, (_, name) => {
    fonts.add(name);
    return `src:url(katex-fonts/${name}) format("woff2")`;
  });
  if (css.includes("url(fonts/")) throw new Error("katex.min.css beklenmeyen yazi tipi tanimi (KaTeX surumu degismis olabilir).");
  for (const name of [...fonts].sort()) writeIfChanged(path.join(FONTS_DIR, name), readFileSync(path.join(fontsSource, name)));
  return css;
}

// ---------- kagit goruntusu ----------

const extractCache = new Map();
function extractEntry(year, number) {
  if (!extractCache.has(year)) {
    const file = path.join(EXTRACT_DIR, `${year}.json`);
    const questions = existsSync(file) ? readJson(file).questions ?? [] : [];
    extractCache.set(year, new Map(questions.map((question) => [question.number, question])));
  }
  return extractCache.get(year).get(number) ?? null;
}

function pageSource(year, page) {
  const quartz = path.join(QUARTZ_DIR, String(year), `p-${pad2(page)}.png`);
  if (existsSync(quartz)) return { file: quartz, quartz: true };
  return { file: pagePath(year, page), quartz: false };
}

function outlineSvg(width, height, [x0, y0, x1, y1]) {
  const x = Math.max(0, Math.round(x0 - OUTLINE_PAD));
  const y = Math.max(0, Math.round(y0 - OUTLINE_PAD));
  const w = Math.min(width, Math.round(x1 + OUTLINE_PAD)) - x;
  const h = Math.min(height, Math.round(y1 + OUTLINE_PAD)) - y;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="${OUTLINE_COLOR}" stroke-width="${OUTLINE_STROKE}"/></svg>`;
}

/**
 * Sorunun kagit goruntusu. Donus: { kind: "crop" | "page" | "page-marked" | "none", file, page, source, widthPct }.
 * widthPct: goruntunun sayfa genisligine orani (%); sol sutunda tum sorular ayni olcekte gorunsun.
 */
async function paperImage(record, stats) {
  const entry = extractEntry(record.year, record.number);
  const page = entry?.page ?? record.source_page;
  if (entry && record.source_page !== undefined && entry.page !== record.source_page) stats.pageMismatch.push(record.id);
  if (!Number.isInteger(page)) return { kind: "none", page: null };
  const source = pageSource(record.year, page);
  if (!existsSync(source.file)) return { kind: "none", page, source };
  const meta = await sharp(source.file).metadata();
  const yearDir = path.join(CROPS_DIR, String(record.year));
  const count = (written) => (written ? (stats.written += 1) : (stats.unchanged += 1));

  if (Array.isArray(entry?.bbox)) {
    const scale = PAGE_DPI / 72;
    const [x0, top, x1, bottom] = entry.bbox;
    const left = Math.max(0, Math.floor((x0 - MARGIN_PT) * scale));
    const upper = Math.max(0, Math.floor((top - MARGIN_PT) * scale));
    const right = Math.min(meta.width, Math.ceil((x1 + MARGIN_PT) * scale));
    const lower = Math.min(meta.height, Math.ceil((bottom + MARGIN_PT) * scale));
    const buffer = await sharp(source.file)
      .extract({ left, top: upper, width: right - left, height: lower - upper })
      .flatten({ background: "#ffffff" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const file = path.join(yearDir, `q-${pad2(record.number)}.png`);
    count(writeIfChanged(file, buffer));
    return { kind: "crop", file, page, source, widthPct: ((right - left) / meta.width) * 100 };
  }

  // bbox yok: sayfanin tamami; sekil kutusu (sayfa pikseli) varsa cerceveyle.
  const figureBox = entry?.figureBox;
  const box = figureBox?.space === "page" && Array.isArray(figureBox.box) && (figureBox.page ?? page) === page ? figureBox.box : null;
  const file = path.join(yearDir, box ? `q-${pad2(record.number)}.png` : `p-${pad2(page)}.png`);
  if (!stats.done.has(file)) {
    let full = await sharp(source.file).flatten({ background: "#ffffff" }).png().toBuffer();
    if (box) {
      full = await sharp(full).composite([{ input: Buffer.from(outlineSvg(meta.width, meta.height, box)), top: 0, left: 0 }]).png().toBuffer();
    }
    const buffer = await sharp(full).resize({ width: WHOLE_PAGE_WIDTH }).png({ compressionLevel: 9 }).toBuffer();
    count(writeIfChanged(file, buffer));
    stats.done.add(file);
  }
  return { kind: box ? "page-marked" : "page", file, page, source, widthPct: 100 };
}

// ---------- HTML ----------

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** components/sat/MathText.tsx ile ayni: isaretli metin <em>/<u>, formul KaTeX; KaTeX hatasinda ham TeX (isaretli). */
function richHtml(text, ctx) {
  return splitRichText(text)
    .map((segment) => {
      if (segment.kind === "text") {
        let html = esc(segment.value);
        if (segment.italic) html = `<em>${html}</em>`;
        if (segment.underline) html = `<u>${html}</u>`;
        return `<span>${html}</span>`;
      }
      const display = segment.kind === "display";
      if (display) ctx.display += 1;
      else ctx.inline += 1;
      let html;
      try {
        html = katex.renderToString(segment.value, { throwOnError: true, displayMode: display });
      } catch {
        // Site ham TeX'i duz metin basar; onizleme ayni metni gorunur isaretle gosterir.
        ctx.katexErrors += 1;
        return `<span class="katex-fail" title="KaTeX bu formülü çizemedi; sitede bu metin düz yazı olarak görünür">${esc(segment.value)}</span>`;
      }
      return display ? `<span class="math-display">${html}</span>` : `<span>${html}</span>`;
    })
    .join("");
}

/** components/sat/PassageText.tsx ile ayni cizim: paragraf bloklari, satir basina blok; madde imi sabit genislikte. */
function passageHtml(text, ctx) {
  const blocks = splitPassageBlocks(text)
    .map((block) => {
      const lines = block.lines
        .map((line) =>
          line.kind === "bullet"
            ? `<div class="line line-bullet"><span class="bullet">•</span><span>${richHtml(line.text.slice(2), ctx)}</span></div>`
            : `<div class="line line-${line.kind}">${richHtml(line.text, ctx)}</div>`
        )
        .join("");
      return `<div class="para">${lines}</div>`;
    })
    .join("");
  return `<div class="passage">${blocks}</div>`;
}

/** Karistirma kaydi dogru cevapla tutarli mi; sorun metni ya da null. */
function shuffleProblem(record) {
  const shuffle = record.shuffle;
  if (!shuffle) return null;
  if (shuffle.exempt) return record.correct_answer === "A" ? null : "istisna soruda doğru cevap A değil";
  const order = shuffle.order;
  if (!Array.isArray(order) || [...order].sort().join("") !== CHOICE_KEYS.join("")) return "karıştırma sırası geçersiz";
  if (shuffle.shuffled !== record.correct_answer) return "karıştırma kaydı doğru cevapla uyuşmuyor";
  if (order[CHOICE_KEYS.indexOf(record.correct_answer)] !== shuffle.original) return "doğru şıkkın kâğıttaki harfi kayıtla uyuşmuyor";
  return null;
}

const CHECK_SVG =
  '<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

function figureHtml(record) {
  const abs = figureAbsPath(record);
  if (!abs) return "";
  if (!existsSync(abs)) return `<div class="figure-missing">Görsel henüz üretilmedi<small>${esc(record.figure_path)}</small></div>`;
  return `<img class="figure" src="${esc(relUrl(abs))}" alt="Soru görseli" loading="lazy">`;
}

function cardHtml(record, ctx) {
  const order = Array.isArray(record.shuffle?.order) && !record.shuffle.exempt ? record.shuffle.order : null;
  const prompt =
    record.section === "reading-general" ? passageHtml(record.prompt, ctx) : `<span>${richHtml(record.prompt, ctx)}</span>`;
  const choices = CHOICE_KEYS.map((key, index) => {
    const correct = key === record.correct_answer;
    const notes = [];
    if (order) notes.push(`<span class="paper-letter">kâğıtta ${esc(order[index])}</span>`);
    if (correct) notes.push(`<span class="correct-tag">Doğru cevap</span>`);
    return [
      `<div class="choice${correct ? " is-correct" : ""}">`,
      `<span class="key">${key}</span>`,
      `<span class="choice-body"><span>${richHtml(record.choices[key], ctx)}</span>`,
      notes.length > 0 ? `<span class="choice-notes">${notes.join("")}</span>` : "",
      `</span>`,
      correct ? CHECK_SVG : "",
      `</div>`,
    ].join("");
  }).join("");
  return [
    `<article class="card">`,
    `<header class="chips">`,
    `<span class="chip">${record.year} · Soru ${record.number}</span>`,
    `<span class="chip">${esc(SECTION_LABELS[record.section] ?? record.section)}</span>`,
    `<span class="chip chip-topic">${esc(record.topic_slug ?? "?")}</span>`,
    `<span class="chip chip-id">${esc(record.id)}</span>`,
    `</header>`,
    `<div class="prompt">${prompt}</div>`,
    figureHtml(record),
    `<div class="choices">${choices}</div>`,
    `</article>`,
  ].join("");
}

function paperColumn(record, image) {
  const label = `<p class="col-label">Kâğıttaki hâli</p>`;
  if (image.kind === "none") {
    return `<div class="official">${label}<div class="missing">Sayfa görüntüsü bulunamadı (sayfa ${esc(image.page ?? "?")}).</div></div>`;
  }
  const source = `${esc(record.source_file ?? "?")}, sayfa ${image.page}`;
  const notes = [];
  if (image.kind === "crop") {
    notes.push(`${source} · <a href="${esc(relUrl(image.source.file))}">Sayfanın tamamı</a>`);
  } else {
    notes.push(`${source} · Bu kâğıtta soru konumu kayıtlı değil; sayfanın tamamı gösteriliyor. Soru ${record.number} bu sayfada.`);
    if (image.kind === "page-marked") notes.push(`Sorunun şekli turuncu çerçeveyle işaretli.`);
  }
  if (image.source.quartz) notes.push(`Bu sayfa, italik yazıları doğru gösteren ikinci çizimden alındı.`);
  const url = esc(relUrl(image.file));
  const width = `${Math.min(100, image.widthPct).toFixed(2)}%`;
  return [
    `<div class="official">${label}`,
    `<p class="col-note">${notes.join("<br>")}</p>`,
    `<a class="paper-link" href="${url}" title="Tam boyutta açmak için tıklayın"><img src="${url}" alt="${esc(`Kâğıttaki hâli, ${record.year} soru ${record.number}`)}" style="width:${width}" loading="lazy"></a>`,
    `</div>`,
  ].join("");
}

function specialCases(record, ctx) {
  const texts = [record.prompt, ...CHOICE_KEYS.map((key) => record.choices[key])];
  const segments = texts.flatMap((text) => splitRichText(text));
  const cases = [];
  if (segments.some((segment) => segment.underline)) cases.push("altı çizili");
  if (segments.some((segment) => segment.italic)) cases.push("italik");
  if (ctx.inline > 0) cases.push(`formül (${ctx.inline})`);
  if (ctx.display > 0) cases.push(`ayrı satırda formül (${ctx.display})`);
  if (record.figure_path) cases.push("görsel");
  if (record.shuffle?.exempt) cases.push("şıklar karıştırılmadı");
  if (ctx.katexErrors > 0) cases.push(`KaTeX hatası (${ctx.katexErrors})`);
  return cases;
}

function metaHtml(record, ctx) {
  const shuffle = record.shuffle;
  let shuffleText = "yok (kâğıt sırası)";
  if (shuffle?.exempt) shuffleText = "istisna, kâğıt sırası korunuyor";
  else if (Array.isArray(shuffle?.order)) shuffleText = `kâğıtta doğru ${esc(shuffle.original)} → sitede ${esc(shuffle.shuffled)}`;
  const problem = shuffleProblem(record);
  const cases = specialCases(record, ctx);
  return [
    `<p class="meta">Kimlik <code>${esc(record.id)}</code> · Konu: ${esc(record.topic ?? "?")} · Karıştırma: ${shuffleText}`,
    ` · Özel durumlar: <strong>${cases.length > 0 ? esc(cases.join(", ")) : "yok"}</strong></p>`,
    problem ? `<p class="warn">Uyarı: ${esc(problem)}.</p>` : "",
  ].join("");
}

function exemptHtml(record) {
  if (!record.shuffle?.exempt) return "";
  return `<p class="exempt-note"><strong>Şıklar karıştırılmadı.</strong> Bu soruda kâğıt sırası korunuyor (doğru cevap A). Gerekçe: ${esc(record.shuffle.reason ?? "?")}</p>`;
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
  --mono: ui-monospace, "SF Mono", Menlo, monospace;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--editorial-paper); color: var(--editorial-ink); font-family: var(--sans); -webkit-font-smoothing: antialiased; }
img { display: block; max-width: 100%; height: auto; }
.page { max-width: 1320px; margin: 0 auto; padding: 40px 24px 96px; }
.page-head { max-width: 860px; margin-bottom: 36px; }
.eyebrow { margin: 0 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--editorial-muted); }
h1 { margin: 0 0 12px; font-family: var(--serif); font-weight: 600; font-size: 34px; line-height: 1.15; }
.count { margin: 0 0 16px; font-size: 15px; font-weight: 600; color: var(--editorial-sage); }
.lede { margin: 0 0 10px; font-size: 15px; line-height: 1.7; }
.callout { margin: 14px 0; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--editorial-terracotta); background: rgba(183,91,56,0.07); font-size: 15px; line-height: 1.65; }
.callout strong { color: var(--editorial-terracotta-ink); }
.gen { margin: 0; font-size: 13px; line-height: 1.6; color: var(--editorial-muted); }
.gen code, .meta code { font-family: var(--mono); font-size: 12px; color: var(--editorial-ink); }
.toc { display: flex; flex-wrap: wrap; gap: 6px; margin: 20px 0 0; padding: 0; list-style: none; }
.toc a { display: inline-block; padding: 4px 8px; border-radius: 8px; border: 1px solid var(--editorial-border); background: var(--editorial-surface); color: var(--editorial-muted); font-size: 12px; text-decoration: none; font-variant-numeric: tabular-nums; }
.toc a:hover { border-color: var(--editorial-sage); color: var(--editorial-sage); }
.pair { padding: 28px 0 32px; border-top: 1px solid var(--editorial-border); }
.pair-head { margin: 0 0 14px; font-size: 13px; font-weight: 700; color: var(--editorial-sage); font-variant-numeric: tabular-nums; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) 390px; gap: 28px; align-items: start; }
.col-label { margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--editorial-muted); }
.col-note { margin: -2px 0 10px; font-size: 13px; line-height: 1.5; color: var(--editorial-muted); }
.col-note a { color: var(--editorial-sage); }
.official { position: sticky; top: 16px; }
.paper-link { display: block; }
.paper-link img { border: 1px solid var(--editorial-border); border-radius: 12px; background: #fff; }
.missing { padding: 28px 20px; border: 1px dashed var(--editorial-terracotta); border-radius: 12px; color: var(--editorial-terracotta-ink); font-size: 14px; background: var(--editorial-surface); }
.phone { width: 390px; padding: 16px; background: var(--editorial-paper); box-shadow: 0 0 0 1px var(--editorial-border); border-radius: 22px; }
.meta { margin: 16px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--editorial-muted); }
.meta strong { color: var(--editorial-ink); font-weight: 600; }
.warn { margin: 8px 0 0; font-size: 13px; font-weight: 700; color: var(--editorial-terracotta-ink); }
.exempt-note { width: 390px; margin: 12px 0 0; padding: 12px 14px; border-radius: 12px; border: 1px dashed var(--editorial-terracotta); background: rgba(183,91,56,0.06); font-size: 13px; line-height: 1.55; color: var(--editorial-ink); }
.exempt-note strong { color: var(--editorial-terracotta-ink); }
.foot { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--editorial-border); font-size: 13px; line-height: 1.6; color: var(--editorial-muted); }

/* ImatQuestionCard (components/imat/ImatQuestionCard.tsx), telefon: p-5, max-w-4xl px-4 kapsayicida */
.card { overflow: hidden; border-radius: 1.4rem; border: 1px solid rgba(31,79,70,0.16); background: rgba(255,254,250,0.88); padding: 20px; box-shadow: 0 18px 50px rgba(21,32,28,0.06); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; font-size: 11px; font-weight: 600; color: var(--editorial-muted); }
.chip { border-radius: 8px; background: var(--editorial-band); padding: 6px 10px; }
.chip-topic { background: var(--editorial-sage-soft); color: var(--editorial-sage); }
.chip-id { font-family: var(--mono); font-weight: 500; }
.prompt { margin-bottom: 28px; white-space: pre-line; overflow-wrap: break-word; font-size: 16px; line-height: 32px; }
/* PassageText (components/sat/PassageText.tsx): space-y-8, font-semibold, pl-[1.5em] -indent-[1.5em], w-[1.25em] */
.passage > .para + .para { margin-top: 32px; }
.line-label { font-weight: 600; }
.line-verse { padding-left: 1.5em; text-indent: -1.5em; }
.line-bullet { display: flex; }
.line-bullet .bullet { width: 1.25em; flex-shrink: 0; }
.line-bullet > span:last-child { min-width: 0; }
.card u { text-decoration-line: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
/* MathText: ayri satirdaki formul kendi icinde kayar */
.math-display { display: block; overflow-x: auto; }
.katex-fail { padding: 0 3px; border-radius: 4px; outline: 1px dashed var(--editorial-terracotta); color: var(--editorial-terracotta-ink); }
.figure { margin-bottom: 28px; border-radius: 12px; border: 1px solid var(--editorial-border); background: #fff; }
.figure-missing { display: flex; flex-direction: column; gap: 4px; margin-bottom: 28px; padding: 22px 16px; border-radius: 12px; border: 1px dashed var(--editorial-terracotta); background: rgba(183,91,56,0.06); color: var(--editorial-terracotta-ink); font-size: 13px; font-weight: 600; text-align: center; }
.figure-missing small { font-weight: 400; font-family: var(--mono); font-size: 11px; color: var(--editorial-muted); }
.choices { display: grid; gap: 10px; }
.choice { display: flex; align-items: flex-start; gap: 12px; min-height: 56px; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--editorial-border); background: rgba(255,254,250,0.82); font-size: 14px; line-height: 24px; }
.choice.is-correct { border-color: var(--editorial-sage); background: var(--editorial-sage-soft); box-shadow: 0 4px 14px rgba(31,79,70,0.08); }
.key { display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--editorial-border); font-weight: 600; color: var(--editorial-sage); }
.choice-body { display: flex; flex: 1; flex-direction: column; min-width: 0; overflow-wrap: break-word; }
.choice-notes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.paper-letter { padding: 0 6px; border-radius: 6px; border: 1px dashed var(--editorial-muted); font-size: 11px; font-weight: 600; line-height: 18px; color: var(--editorial-muted); }
.correct-tag { font-size: 11px; font-weight: 700; line-height: 20px; letter-spacing: 0.04em; color: var(--editorial-sage); }
.check { width: 20px; height: 20px; margin-top: 2px; flex-shrink: 0; color: var(--editorial-sage); }

@media (max-width: 1000px) {
  .cols { grid-template-columns: minmax(0, 1fr); }
  .official { position: static; }
  .phone, .exempt-note { width: min(390px, 100%); }
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

function pageHtml({ title, records, images, contexts, bankLabel, bankHash, css }) {
  const years = [...new Set(records.map((record) => record.year))].sort((a, b) => a - b);
  const shuffledYears = [...new Set(records.filter((record) => record.shuffle).map((record) => record.year))].sort((a, b) => a - b);
  const wholePageYears = [...new Set(records.filter((record) => images.get(record.id).kind.startsWith("page")).map((record) => record.year))].sort((a, b) => a - b);
  const callouts = [];
  if (shuffledYears.length > 0) {
    callouts.push(
      `<p class="callout"><strong>Şık sırası farklı, bu doğru.</strong> ${shuffledYears.join(", ")} kâğıtlarında doğru cevap her soruda A şıkkıdır; sitede şıklar karıştırılır. Soldaki görüntü kâğıttaki sırayı, sağdaki kart sitedeki (karıştırılmış) sırayı gösterir. Sağda her şıkkın altındaki “kâğıtta A/B/…” notu, o şıkkın kâğıttaki harfidir: doğru işaretli şık “kâğıtta A” olmalı ve metni soldaki A şıkkıyla aynı olmalı.</p>`
    );
  }
  if (years.includes(2025)) {
    callouts.push(`<p class="callout"><strong>2025 kâğıdında</strong> doğru şık yeşil zeminle basılmış; soldaki görüntüde bu vurgu görünür (öğrenci sitede görmez).</p>`);
  }
  if (wholePageYears.length > 0) {
    callouts.push(
      `<p class="callout"><strong>${wholePageYears.join(", ")} kâğıdında</strong> soruların sayfadaki yeri kayıtlı değil; solda sayfanın tamamı var, soru numarasını sayfada bulun. Şekilli sorularda şekil turuncu çerçeveyle işaretli.</p>`
    );
  }
  const pairs = records
    .map((record, index) => {
      const ctx = contexts.get(record.id);
      return [
        `<section class="pair" id="q-${record.id}">`,
        `<p class="pair-head">${index + 1} / ${records.length} · ${record.year} · Soru ${record.number} · ${esc(SECTION_LABELS[record.section] ?? record.section)}</p>`,
        `<div class="cols">`,
        paperColumn(record, images.get(record.id)),
        `<div><p class="col-label">Sitede görünecek hâli · telefon</p><div class="phone">${ctx.card}</div>${exemptHtml(record)}</div>`,
        `</div>`,
        metaHtml(record, ctx),
        `</section>`,
      ].join("\n");
    })
    .join("\n");
  const toc =
    records.length > 1
      ? `<ol class="toc">${records.map((record) => `<li><a href="#q-${record.id}">${record.year} · ${record.number}</a></li>`).join("")}</ol>`
      : "";
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>${css}
${CSS}</style>
</head>
<body>
<div class="page">
<header class="page-head">
<p class="eyebrow">IMAT soru bankası · önizleme</p>
<h1>${esc(title)}</h1>
<p class="count">${records.length} soru · ${years.join(", ")}</p>
<p class="lede">Her soruda solda kâğıttaki hâli (resmî PDF'in sayfa görüntüsü), sağda aynı sorunun sitede telefonda görüneceği hâli var. İki sütunu yan yana okuyun: kelimeler, formüller, italik ve altı çizili yerler, satır sonları, şekil ve tablo aynı olmalı. Şekil sitede soru metninin altında durur. Doğru cevap bu sayfada hep işaretli; sitede denemede değil, sınav bitince görünür.</p>
${callouts.join("\n")}
<p class="gen">Bu sayfa <code>${esc(bankLabel)}</code> (özet <code>${esc(bankHash)}</code>) dosyasından otomatik üretildi. Kâğıt görüntüsünü büyütmek için üstüne tıklayın. Soru metinleri telifli sınav içeriğidir; sayfayı paylaşmayın.</p>
${toc}
</header>
<main>
${pairs}
</main>
<footer class="foot">Formüller sitedeki gibi KaTeX ile çizildi; KaTeX yazı tipleri bu sayfanın yanındaki <code>katex-fonts</code> klasöründen yüklenir (internet gerekmez). Sayfa o klasör olmadan açılırsa formüller sistem yazı tipiyle görünür; sitede doğru yazı tipi vardır. Sayfadaki yazı tipi (gövde metni) sitedekine yakın bir sistem yazı tipidir.</footer>
</div>
</body>
</html>
`;
}

// ---------- baglanti denetimi ----------

/** Sayfadaki goreli src/href ve CSS url() yollari diskte mi. Donus: { images, links, fonts, missing }. */
export function checkLinks(html, baseDir = PREVIEW_DIR) {
  const resolveLocal = (url) => path.resolve(baseDir, ...decodeURIComponent(url).split("/"));
  const collect = (pattern) => [...html.matchAll(pattern)].map((match) => match[1].replaceAll("&amp;", "&"));
  const images = collect(/<img [^>]*?src="([^"]+)"/g);
  const links = collect(/<a [^>]*?href="([^"#][^"]*)"/g);
  const fonts = collect(/url\(([^)"']+)\)/g);
  const all = [...images, ...links, ...fonts];
  const remote = all.filter((url) => /^[a-z][a-z0-9+.-]*:/i.test(url));
  const missing = all.filter((url) => !remote.includes(url) && !existsSync(resolveLocal(url)));
  return { images: images.length, links: links.length, fonts: fonts.length, remote, missing: [...new Set(missing)] };
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

function selectRecords(bank, values) {
  if (values["--years"]) {
    const years = parseYears(values["--years"]);
    const records = bank.filter((record) => years.includes(record.year)).sort((a, b) => a.year - b.year || a.number - b.number);
    const empty = years.filter((year) => !records.some((record) => record.year === year));
    if (empty.length > 0) throw new Error(`Bankada bu yilin sorusu yok: ${empty.join(", ")}`);
    return records;
  }
  const raw = values["--ids"] ?? parseIds(readFileSync(path.resolve(values["--ids-file"]), "utf8")).join(",");
  return selectIds(bank, raw);
}

async function main() {
  const { values } = parseCliArgs(process.argv.slice(2), { values: ["--years", "--ids", "--ids-file", "--out", "--title", "--bank"] });
  const modes = ["--years", "--ids", "--ids-file"].filter((name) => values[name]);
  if (modes.length !== 1) throw new Error("--years <yil,...>, --ids <id,...> ya da --ids-file <dosya> (yalniz biri) zorunlu.");
  const out = (values["--out"] ?? "").replace(/\.html$/, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(out)) throw new Error("--out <ad> zorunlu (harf, rakam, . _ -).");

  const bankPath = path.resolve(values["--bank"] ?? BANK_PATH);
  const bank = readBank(bankPath);
  const bankHash = createHash("sha256").update(readFileSync(bankPath)).digest("hex").slice(0, 12);
  const records = selectRecords(bank, values);

  mkdirSync(PREVIEW_DIR, { recursive: true });
  const css = katexCss();
  const stats = { written: 0, unchanged: 0, pageMismatch: [], done: new Set() };
  const images = new Map();
  const contexts = new Map();
  for (const record of records) {
    images.set(record.id, await paperImage(record, stats));
    const ctx = { inline: 0, display: 0, katexErrors: 0 };
    ctx.card = cardHtml(record, ctx);
    contexts.set(record.id, ctx);
  }
  const years = [...new Set(records.map((record) => record.year))].sort((a, b) => a - b);
  const title = values["--title"] ?? `IMAT ${years.join(", ")} önizlemesi`;
  const html = pageHtml({ title, records, images, contexts, bankLabel: path.basename(bankPath), bankHash, css });
  const target = path.join(PREVIEW_DIR, `${out}.html`);
  const changed = writeIfChanged(target, html);

  const noImage = records.filter((record) => images.get(record.id).kind === "none").map((record) => `${record.year}:${record.number}`);
  const missingFigures = records.filter((record) => record.figure_path && !existsSync(figureAbsPath(record))).map((record) => record.id);
  const katexErrors = records.filter((record) => contexts.get(record.id).katexErrors > 0).map((record) => record.id);
  const shuffleProblems = records.filter((record) => shuffleProblem(record)).map((record) => record.id);
  const links = checkLinks(html);
  console.log(`Onizleme: ${target} (${records.length} soru, ${changed ? "yazildi" : "degismedi"}, ${Buffer.byteLength(html)} bayt)`);
  console.log(`Kagit goruntusu: ${stats.written} yazildi, ${stats.unchanged} degismedi (${CROPS_DIR})`);
  console.log(`Baglanti denetimi: ${links.images} goruntu, ${links.links} baglanti, ${links.fonts} yazi tipi; uzak ${links.remote.length}, eksik ${links.missing.length}`);
  if (links.missing.length > 0) console.log(`  eksik: ${links.missing.slice(0, 10).join(", ")}${links.missing.length > 10 ? ", ..." : ""}`);
  if (noImage.length > 0) console.log(`Sayfa goruntusu bulunamayan: ${noImage.join(", ")}`);
  if (missingFigures.length > 0) console.log(`Gorseli olmayan: ${missingFigures.join(", ")}`);
  if (katexErrors.length > 0) console.log(`KaTeX hatasi olan: ${katexErrors.join(", ")}`);
  if (shuffleProblems.length > 0) console.log(`Karistirma kaydi tutarsiz: ${shuffleProblems.join(", ")}`);
  if (stats.pageMismatch.length > 0) console.log(`Sayfa numarasi extract ile bankada farkli: ${stats.pageMismatch.join(", ")}`);
  const failed = links.missing.length > 0 || links.remote.length > 0 || noImage.length > 0 || missingFigures.length > 0 || shuffleProblems.length > 0;
  return failed ? 1 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
