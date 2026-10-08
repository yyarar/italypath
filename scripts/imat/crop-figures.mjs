// IMAT sekil kirpma (plan Gorev 10; kalip scripts/sat/rw/crop-rw-figures.mjs).
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/crop-figures.mjs --years 2023,2024,2025 [--force]
//
// Girdi extract/<yil>.json'daki figureBox (merge-vision.mjs). space "page": kutu 200 dpi sayfa pikseli; space "crop":
// kutu soru kirpintisi pikseli, figureBox.cropBox (crop-questions.mjs paketinden, sayfa pikseli) ile sayfaya tasinir.
// Kaynak pages/<yil>/p-NN.png (render-pages.mjs, 200 dpi); kaynak klasore yazilmaz.
// Pay: kutunun her yaninda en cok 8 pt (sayfaya kistirilir). Bir yanin dis bandi (SEARCH_BAND_PX) beyaz degilse (komsu
// yazi) o yanin payi piksel piksel daraltilir; bant beyaz olunca durur. Payi 0'a inip yine beyaz bant bulunmayan yan
// "kenar beyaz degil" demektir: ya komsu yazi sekle bitisik (tablo cizgisinin hemen ustunde harf kuyrugu) ya da kutu
// sekli kesiyor; betik ikisini ayirt edemez. Boyle bir yan yalniz figures/edge-signoff.json'da
// [{ id, side, pageBox, note }] ayni id + yan + pageBox ile onayliysa (gorsel kontrolden sonra yazilir) kutudan kesilir
// ve PAD_PX beyaz dolguyla genisletilir (raporda paddedSides). Onaysizsa sekil YAZILMAZ (eski dosya silinir), raporda
// written: false, cikis 1. 2025'te dogru cevap vurgusu maskelenir (lib/highlight.mjs).
// sharp: en cok 1400 px genislik, WebP kalite 90/82/74/66 ile <= 512 KB; secilen tampon dosyaya oldugu gibi yazilir
// (yeniden kodlanmaz; raporun quality alani dosyanin kalitesidir). Kenar kontrolu: yazilan gorselin dort kenarindaki
// 2 piksellik serit tamamen beyaz (her kanal >= 245) olmali; degilse hata (cikis 1).
// Cikti figures/<yil>/<id>.webp ve figures/figure-crop-report.json [{ id, year, number, kind, bytes, width, height,
// page, cropPx, marginPx, paddedSides, quality, pageBox, written }] (istenmeyen yillarin kayitlari korunur). Var olan
// dosya, sayfa kutusu raporla ayni ve written: true ise atlanir (yine olculur, onay yine aranir); --force hepsini
// yeniden kirpar. Bloke soru atlanir. Ayni girdi ayni dosyayi verir. validate-bank kapi 6 ayni onay kuralini uygular.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { HIGHLIGHT_YEARS, maskHighlight, tintedPixels } from "./lib/highlight.mjs";
import { EXTRACT_DIR, FIGURES_DIR, PAGE_DPI, argValue, pagePath, parseYears, readJson, writeJson } from "./paths.mjs";

const MARGIN_PT = 8;
const SEARCH_BAND_PX = 4; // secimde 4 px beyaz bant (WebP kenar gurultusune pay); son kontrol 2 px
export const PAD_PX = 8;
export const SIDES = Object.freeze(["left", "top", "right", "bottom"]);
export const MAX_WIDTH = 1400;
const MAX_BYTES = 512 * 1024;
export const QUALITIES = Object.freeze([90, 82, 74, 66]);
const EDGE_PX = 2;
const WHITE_MIN = 245;
export const CROP_REPORT_PATH = join(FIGURES_DIR, "figure-crop-report.json");
export const EDGE_SIGNOFF_PATH = join(FIGURES_DIR, "edge-signoff.json");

// edge-signoff.json: [{ id, side, pageBox: [x0, y0, x1, y1] (sayfa pikseli, rapordaki pageBox), note }]. Dosya yoksa bos.
// Bicim bozuksa hata. Donus: Map("<id>|<yan>" -> kayit).
export function readEdgeSignoff(path = EDGE_SIGNOFF_PATH) {
  if (!existsSync(path)) return new Map();
  const list = readJson(path);
  if (!Array.isArray(list)) throw new Error(`${path}: dizi olmali`);
  const out = new Map();
  list.forEach((entry, index) => {
    const at = `edge-signoff.json ${index + 1}`;
    if (!/^[0-9a-f]{8}$/.test(String(entry?.id))) throw new Error(`${at}: gecersiz id`);
    if (!SIDES.includes(entry.side)) throw new Error(`${at}: side ${entry.side} (left|top|right|bottom)`);
    if (!Array.isArray(entry.pageBox) || entry.pageBox.length !== 4 || entry.pageBox.some((v) => !Number.isInteger(v))) {
      throw new Error(`${at}: pageBox 4 tamsayi olmali`);
    }
    if (typeof entry.note !== "string" || !entry.note.trim()) throw new Error(`${at}: note bos`);
    const key = `${entry.id}|${entry.side}`;
    if (out.has(key)) throw new Error(`${at}: ${entry.id} ${entry.side} iki kez`);
    out.set(key, entry);
  });
  return out;
}

// Dolgulu yanlardan onayi olmayanlar (onay = ayni id + yan + pageBox birebir).
export function unsignedSides(id, sides, pageBox, signoff) {
  return (sides ?? []).filter((side) => {
    const entry = signoff.get(`${id}|${side}`);
    return !entry || JSON.stringify(entry.pageBox) !== JSON.stringify(pageBox);
  });
}

// Her kenarda beyaz olmayan piksel sayisi (dis `band` piksellik serit); rect verilirse tampon icindeki o dikdortgen.
function darkEdges(data, { width, height, channels }, band = EDGE_PX, rect = [0, 0, width, height]) {
  const [x0, y0, x1, y1] = rect;
  const dark = { top: 0, bottom: 0, left: 0, right: 0 };
  const isWhite = (x, y) => {
    const i = (y * width + x) * channels;
    for (let c = 0; c < Math.min(channels, 3); c += 1) if (data[i + c] < WHITE_MIN) return false;
    return true;
  };
  for (let x = x0; x < x1; x += 1) {
    for (let k = 0; k < Math.min(band, y1 - y0); k += 1) {
      if (!isWhite(x, y0 + k)) dark.top += 1;
      if (!isWhite(x, y1 - 1 - k)) dark.bottom += 1;
    }
  }
  for (let y = y0; y < y1; y += 1) {
    for (let k = 0; k < Math.min(band, x1 - x0); k += 1) {
      if (!isWhite(x0 + k, y)) dark.left += 1;
      if (!isWhite(x1 - 1 - k, y)) dark.right += 1;
    }
  }
  return dark;
}

const darkSides = (dark) => Object.entries(dark).filter(([, n]) => n > 0).map(([side, n]) => `${side} ${n}`);

// figureBox -> 200 dpi sayfa pikseli [x0, y0, x1, y1].
function pageBoxOf(at, figure) {
  if (!Array.isArray(figure.box) || figure.box.length !== 4) throw new Error(`${at}: figureBox.box yok`);
  if (figure.space === "page") return figure.box;
  if (figure.space !== "crop") throw new Error(`${at}: bilinmeyen figureBox.space ${figure.space}`);
  if (!Array.isArray(figure.cropBox) || figure.cropBox.length !== 4) throw new Error(`${at}: crop kutusunda cropBox yok (merge-vision.mjs yeniden)`);
  const [cx0, cy0, cx1, cy1] = figure.cropBox;
  const [x0, y0, x1, y1] = figure.box;
  return [Math.max(cx0, cx0 + x0), Math.max(cy0, cy0 + y0), Math.min(cx1, cx0 + x1), Math.min(cy1, cy0 + y1)];
}

// Tampon (WebP) olcumu: boyut, bicim, kenar.
async function readStats(buffer) {
  const meta = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: meta.width, height: meta.height, format: meta.format, bytes: buffer.length, dark: darkEdges(data, info) };
}

// Secilen WebP tamponunu ve kirpma ayrintisini doner; dosyaya yazmaz (onay main'de).
async function cropFigure(year, q, pageBox) {
  const page = q.figureBox.page ?? q.page;
  const source = pagePath(year, page);
  if (!existsSync(source)) throw new Error(`${year}:${q.number} ${q.id}: sayfa goruntusu yok (${source}); once render-pages.mjs`);
  if (q.figureBox.space === "page" && q.figureBox.image && basename(q.figureBox.image) !== basename(source)) {
    throw new Error(`${year}:${q.number} ${q.id}: figureBox.image ${basename(q.figureBox.image)} sayfa ${page} degil`);
  }
  const meta = await sharp(source).metadata();
  const M = Math.round((MARGIN_PT * PAGE_DPI) / 72);
  const [bx0, by0, bx1, by1] = pageBox;
  const region = [Math.max(0, bx0 - M), Math.max(0, by0 - M), Math.min(meta.width, bx1 + M), Math.min(meta.height, by1 + M)];
  const raw = await sharp(source)
    .extract({ left: region[0], top: region[1], width: region[2] - region[0], height: region[3] - region[1] })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (HIGHLIGHT_YEARS.includes(year)) {
    maskHighlight(raw.data, raw.info);
    const tinted = tintedPixels(raw.data, raw.info);
    if (tinted > 0) throw new Error(`${year}:${q.number} ${q.id}: maske sonrasi ${tinted} yesil izli piksel`);
  }
  // Paylar bolge icinde; beyaz olmayan bandin payi 1 px daraltilir, degisiklik kalmayana kadar.
  const margin = { left: bx0 - region[0], top: by0 - region[1], right: region[2] - bx1, bottom: region[3] - by1 };
  const rectOf = () => [bx0 - region[0] - margin.left, by0 - region[1] - margin.top, bx1 - region[0] + margin.right, by1 - region[1] + margin.bottom];
  for (let changed = true; changed; ) {
    changed = false;
    const dark = darkEdges(raw.data, raw.info, SEARCH_BAND_PX, rectOf());
    for (const side of SIDES) {
      if (dark[side] > 0 && margin[side] > 0) {
        margin[side] -= 1;
        changed = true;
      }
    }
  }
  const [rx0, ry0, rx1, ry1] = rectOf();
  const stillDark = darkEdges(raw.data, raw.info, SEARCH_BAND_PX, rectOf());
  const paddedSides = SIDES.filter((side) => stillDark[side] > 0);
  const pad = (side) => (paddedSides.includes(side) ? PAD_PX : 0);
  const chosen = {
    raw: await sharp(raw.data, { raw: raw.info })
      .extract({ left: rx0, top: ry0, width: rx1 - rx0, height: ry1 - ry0 })
      .extend({ top: pad("top"), bottom: pad("bottom"), left: pad("left"), right: pad("right"), background: { r: 255, g: 255, b: 255 } })
      .raw()
      .toBuffer({ resolveWithObject: true }),
    marginPx: { ...margin },
    paddedSides,
    cropPx: [region[0] + rx0, region[1] + ry0, region[0] + rx1, region[1] + ry1],
  };
  const base = sharp(chosen.raw.data, { raw: chosen.raw.info }).resize({ width: MAX_WIDTH, withoutEnlargement: true });
  let webp = null;
  let quality = null;
  for (const level of QUALITIES) {
    webp = await base.clone().webp({ quality: level, effort: 6 }).toBuffer();
    quality = level;
    if (webp.length <= MAX_BYTES) break;
  }
  return { buffer: webp, detail: { page, cropPx: chosen.cropPx, marginPx: chosen.marginPx, paddedSides: chosen.paddedSides, quality } };
}

async function main() {
  const argv = process.argv.slice(2);
  const years = parseYears(argValue(argv, "--years"));
  const force = argv.includes("--force");
  const signoff = readEdgeSignoff();
  const previous = existsSync(CROP_REPORT_PATH) ? readJson(CROP_REPORT_PATH) : [];
  const previousById = new Map(previous.map((entry) => [entry.id, entry]));
  const report = previous.filter((entry) => !years.includes(entry.year));
  const problems = [];
  const signed = [];
  const counts = { cropped: 0, kept: 0, refused: 0, blockedSkipped: 0 };
  for (const year of years) {
    const extractPath = join(EXTRACT_DIR, `${year}.json`);
    if (!existsSync(extractPath)) throw new Error(`${year}: ${extractPath} yok`);
    const questions = readJson(extractPath).questions.filter((q) => q.figureBox);
    const dir = join(FIGURES_DIR, String(year));
    mkdirSync(dir, { recursive: true });
    const wanted = new Set();
    for (const q of questions) {
      const at = `${year}:${q.number} ${q.id}`;
      if (q.blocked) {
        counts.blockedSkipped += 1;
        continue;
      }
      wanted.add(`${q.id}.webp`);
      const out = join(dir, `${q.id}.webp`);
      const pageBox = pageBoxOf(at, q.figureBox).map((v) => Math.round(v));
      const old = previousById.get(q.id);
      let buffer;
      let detail;
      let kept = false;
      if (!force && existsSync(out) && old?.written === true && JSON.stringify(old.pageBox) === JSON.stringify(pageBox)) {
        buffer = readFileSync(out);
        detail = { page: old.page, cropPx: old.cropPx, marginPx: old.marginPx, paddedSides: old.paddedSides ?? [], quality: old.quality };
        kept = true;
      } else {
        ({ buffer, detail } = await cropFigure(year, q, pageBox));
      }
      const unsigned = unsignedSides(q.id, detail.paddedSides, pageBox, signoff);
      const written = unsigned.length === 0;
      if (written) {
        if (!kept) writeFileSync(out, buffer);
        if (!readFileSync(out).equals(buffer)) problems.push(`${at}: diskteki dosya secilen tampondan farkli`);
        if (detail.paddedSides.length > 0) signed.push(`${at}: ${detail.paddedSides.join(", ")}`);
        counts[kept ? "kept" : "cropped"] += 1;
      } else {
        rmSync(out, { force: true });
        counts.refused += 1;
        for (const side of unsigned) {
          problems.push(
            `${at}: kenar beyaz degil (sekil kesilmis olabilir); gorsel kontrol sonrasi edge-signoff.json'a yaz: ${JSON.stringify({ id: q.id, side, pageBox })} (sekil yazilmadi)`
          );
        }
      }
      const stats = await readStats(buffer);
      report.push({ id: q.id, year, number: q.number, kind: q.figureBox.kind, bytes: stats.bytes, width: stats.width, height: stats.height, ...detail, pageBox, written });
      if (stats.format !== "webp") problems.push(`${at}: bicim ${stats.format}`);
      if (stats.bytes > MAX_BYTES) problems.push(`${at}: ${stats.bytes} bayt > 512 KB`);
      if (stats.width > MAX_WIDTH) problems.push(`${at}: genislik ${stats.width}`);
      const sides = darkSides(stats.dark);
      if (sides.length > 0) problems.push(`${at}: beyaz olmayan kenar (${sides.join(", ")}); figureBox yazi ya da sekil kesiyor`);
    }
    for (const name of readdirSync(dir).sort()) {
      if (name.endsWith(".webp") && !wanted.has(name)) console.log(`  uyari ${year}/${name}: figureBox'i olmayan ya da bloke soru (dosya birakildi)`);
    }
  }
  report.sort((a, b) => a.year - b.year || a.number - b.number);
  writeJson(CROP_REPORT_PATH, report);
  const current = report.filter((entry) => years.includes(entry.year) && entry.written);
  const largest = current.reduce((max, entry) => Math.max(max, entry.bytes), 0);
  console.log(`${current.length} sekil yazili (${JSON.stringify(counts)}), en buyuk ${(largest / 1024).toFixed(1)} KB -> ${FIGURES_DIR}`);
  for (const message of signed) console.log(`  bilgi beyaz dolgu, edge-signoff.json onayli: ${message}`);
  for (const message of problems) console.log(`  SORUN ${message}`);
  if (problems.length > 0) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
