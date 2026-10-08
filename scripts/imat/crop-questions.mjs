// IMAT goruntuden yazim paketleri (plan Gorev 9; runbook docs/superpowers/specs/assets/imat-vision-extraction-prompt.md).
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/crop-questions.mjs --years 2023,2024,2025 [--all] [--numbers 5,48]
//
// Metin katmani bozuk yil (2023, 2021): sayfa kipi. Kirpma yok; her girdi bir sayfa goruntusu, paket basina 3 sayfa:
//   vision/<yil>/package-NN.json = [{ year, page, image, textHint: null, choicesHint: null, expectedNumbers: [] }]
// Metin yili (2024, 2025): extract/<yil>.json'daki bbox + 6 pt pay (sayfaya kistirilir) 200 dpi sayfa PNG'sinden
// sharp ile kirpilir -> vision/<yil>/q-NN.png. Varsayilan yalniz hasImage sorulari (goruntuden yazima gidenler):
//   vision/<yil>/package-NN-img.json = [{ id, year, number, section, image, textHint: prompt, choicesHint: choices }]
// --all: tum sorular, paketler package-NN.json. Paket basina 10 soru. --numbers: yalniz bu sorularin kirpintisi
// yenilenir, paket yazilmaz. Ayni kipteki eski paket dosyalari yeniden yazilmadan once silinir; sonuc dosyalarina
// (result-*) dokunulmaz. image her zaman mutlak yol. Kirpintidaki dogru cevap vurgusu (2025) maskelenir.
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { checkInventory } from "./inventory.mjs";
import { EXTRACT_DIR, PAGE_DPI, VISION_DIR, argValue, pad2, pagePath, parseYears, readJson, writeJson } from "./paths.mjs";

const MARGIN_PT = 6;
const QUESTIONS_PER_PACKAGE = 10;
const PAGES_PER_PACKAGE = 3;

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function clearPackages(dir, suffix) {
  if (!existsSync(dir)) return;
  const pattern = new RegExp(`^package-\\d{2}${suffix}\\.json$`);
  for (const name of readdirSync(dir)) if (pattern.test(name)) rmSync(join(dir, name));
}

function writePackages(dir, entries, size, suffix) {
  clearPackages(dir, suffix);
  const groups = chunks(entries, size);
  groups.forEach((group, index) => writeJson(join(dir, `package-${pad2(index + 1)}${suffix}.json`), group));
  return groups.length;
}

function pagePackages(year, pages) {
  const dir = join(VISION_DIR, String(year));
  mkdirSync(dir, { recursive: true });
  const entries = [];
  for (let page = 1; page <= pages; page += 1) {
    const image = pagePath(year, page);
    if (!existsSync(image)) throw new Error(`${year}: sayfa goruntusu yok (${image}); once render-pages.mjs`);
    entries.push({ year, page, image, textHint: null, choicesHint: null, expectedNumbers: [] });
  }
  const count = writePackages(dir, entries, PAGES_PER_PACKAGE, "");
  console.log(`${year}: sayfa kipi, ${entries.length} sayfa -> ${count} paket (${dir})`);
}

async function cropQuestion(year, question) {
  const source = pagePath(year, question.page);
  if (!existsSync(source)) throw new Error(`${year}: sayfa goruntusu yok (${source}); once render-pages.mjs`);
  const meta = await sharp(source).metadata();
  const scale = PAGE_DPI / 72;
  const [x0, top, x1, bottom] = question.bbox;
  const left = Math.max(0, Math.floor((x0 - MARGIN_PT) * scale));
  const upper = Math.max(0, Math.floor((top - MARGIN_PT) * scale));
  const right = Math.min(meta.width, Math.ceil((x1 + MARGIN_PT) * scale));
  const lower = Math.min(meta.height, Math.ceil((bottom + MARGIN_PT) * scale));
  const out = join(VISION_DIR, String(year), `q-${pad2(question.number)}.png`);
  const crop = await sharp(source).extract({ left, top: upper, width: right - left, height: lower - upper }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const masked = maskHighlight(crop.data, crop.info);
  await sharp(crop.data, { raw: crop.info }).png().toFile(out);
  return { image: out, masked };
}

// 2025 kagidinda dogru sik acik yesil zemin + kesik cerceveyle vurgulu; goruntuden yazim modeli anahtari gormemeli.
// Yesil zemin beyaza (yazi kenari griye) cevrilir, yesil alanin dort kenarindaki cerceve seridi (HIGHLIGHT_EDGE_PX) beyazlatilir.
// Sik metni kenardan en az ~6 px iceride (olculdu: sol 15 px, ust/alt 6-15 px). Yerinde degistirir.
const HIGHLIGHT = [204, 255, 204];
const HIGHLIGHT_TOL = 14;
const HIGHLIGHT_MIN_PX = 2000;
const HIGHLIGHT_EDGE_PX = 4;
function maskHighlight(data, { width, height, channels }) {
  const isGreen = (i) => HIGHLIGHT.every((value, c) => Math.abs(data[i + c] - value) <= HIGHLIGHT_TOL);
  let count = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      if (!isGreen(i)) continue;
      count += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (count < HIGHLIGHT_MIN_PX) return false;
  const white = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * channels;
    for (let c = 0; c < channels; c += 1) data[i + c] = 255;
  };
  // Yesil zemin uzerindeki yazi kenari (siyah + yesil karisimi) da geri cozulur: yesilimsi piksel -> G degerinde gri.
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const i = (y * width + x) * channels;
      if (data[i + 1] - Math.max(data[i], data[i + 2]) > 6) {
        data[i] = data[i + 1];
        data[i + 2] = data[i + 1];
      }
    }
  }
  const e = HIGHLIGHT_EDGE_PX;
  for (let x = minX - e; x <= maxX + e; x += 1) {
    for (let d = -e; d <= 2; d += 1) {
      white(x, minY + d);
      white(x, maxY - d);
    }
  }
  for (let y = minY - e; y <= maxY + e; y += 1) {
    for (let d = -e; d <= 2; d += 1) {
      white(minX + d, y);
      white(maxX - d, y);
    }
  }
  return true;
}

async function questionPackages(year, { all, numbers }) {
  const extractPath = join(EXTRACT_DIR, `${year}.json`);
  if (!existsSync(extractPath)) throw new Error(`${year}: ${extractPath} yok; once extract_text.py`);
  const data = readJson(extractPath);
  const dir = join(VISION_DIR, String(year));
  mkdirSync(dir, { recursive: true });
  let selected = data.questions.filter((q) => all || q.hasImage);
  if (numbers) {
    const known = new Set(data.questions.map((q) => q.number));
    for (const n of numbers) if (!known.has(n)) throw new Error(`${year}: soru ${n} yok`);
    selected = data.questions.filter((q) => numbers.includes(q.number));
  }
  const entries = [];
  const masked = [];
  for (const q of selected) {
    const crop = await cropQuestion(year, q);
    if (crop.masked) masked.push(q.number);
    entries.push({ id: q.id, year, number: q.number, section: q.section, image: crop.image, textHint: q.prompt, choicesHint: q.choices });
  }
  if (masked.length > 0) console.log(`${year}: dogru cevap vurgusu maskelendi: ${masked.join(", ")}`);
  if (numbers) {
    console.log(`${year}: ${entries.length} kirpinti yenilendi (paket yazilmadi): ${selected.map((q) => q.number).join(", ")}`);
    return;
  }
  const suffix = all ? "" : "-img";
  const count = writePackages(dir, entries, QUESTIONS_PER_PACKAGE, suffix);
  const label = all ? "tum sorular" : "hasImage";
  console.log(`${year}: ${label} ${entries.length} soru (${selected.map((q) => q.number).join(", ")}) -> ${count} paket${suffix ? ` (*${suffix})` : ""}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const years = parseYears(argValue(argv, "--years"));
  const all = argv.includes("--all");
  const numbersArg = argValue(argv, "--numbers");
  const numbers = numbersArg ? numbersArg.split(",").map((part) => Number(part.trim())) : null;
  if (numbers && numbers.some((n) => !Number.isInteger(n) || n < 1)) throw new Error(`Gecersiz --numbers: ${numbersArg}`);
  const inventory = new Map(checkInventory().map((entry) => [entry.year, entry]));
  for (const year of years) {
    const entry = inventory.get(year);
    if (entry.textLayer === "broken") {
      if (numbers || all) throw new Error(`${year}: sayfa kipinde --numbers/--all kullanilmaz`);
      pagePackages(year, entry.pages);
    } else {
      await questionPackages(year, { all, numbers });
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
