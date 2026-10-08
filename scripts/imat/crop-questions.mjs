// IMAT goruntuden yazim paketleri (plan Gorev 9; runbook docs/superpowers/specs/assets/imat-vision-extraction-prompt.md).
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/crop-questions.mjs --years 2023,2024,2025 [--all] [--numbers 5,48]
//
// Metin katmani bozuk yil (2023, 2021): sayfa kipi. Kirpma yok; her girdi bir sayfa goruntusu, paket basina 3 sayfa:
//   vision/<yil>/package-NN.json = [{ year, page, image, textHint: null, choicesHint: null, expectedNumbers: [] }]
// Metin yili (2024, 2025): extract/<yil>.json'daki bbox + 6 pt pay (sayfaya kistirilir) 200 dpi sayfa PNG'sinden
// sharp ile kirpilir -> vision/<yil>/q-NN.png. Varsayilan yalniz hasImage sorulari (goruntuden yazima gidenler):
//   vision/<yil>/package-NN-img.json = [{ id, year, number, section, image, cropBox, textHint: prompt, choicesHint: choices }]
// cropBox = kirpintinin sayfadaki yeri [x0, y0, x1, y1], 200 dpi sayfa pikseli; kirpinti icinde olculen sekil kutusu
// (result figure.box) bununla sayfaya tasinir (merge-vision.mjs, crop-figures.mjs).
// --all: tum sorular, paketler package-NN.json. Paket basina 10 soru. --numbers: yalniz bu sorularin kirpintisi
// yenilenir, paket yazilmaz. Ayni kipteki eski paket dosyalari yeniden yazilmadan once silinir; sonuc dosyalarina
// (result-*) dokunulmaz. image her zaman mutlak yol. Kirpintidaki dogru cevap vurgusu yalniz 2025'te maskelenir
// (lib/highlight.mjs; maske sonrasi yesil izli piksel kalirsa hata).
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { checkInventory } from "./inventory.mjs";
import { HIGHLIGHT_YEARS, maskHighlight, tintedPixels } from "./lib/highlight.mjs";
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
  let masked = false;
  if (HIGHLIGHT_YEARS.includes(year)) {
    masked = maskHighlight(crop.data, crop.info) !== null;
    const tinted = tintedPixels(crop.data, crop.info);
    if (tinted > 0) throw new Error(`${year}:${question.number}: maske sonrasi ${tinted} yesil izli piksel`);
  }
  await sharp(crop.data, { raw: crop.info }).png().toFile(out);
  return { image: out, masked, cropBox: [left, upper, right, lower] };
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
    // merge-vision sonrasi extract'ta yazim vardir; ipucu her zaman ilk metin katmani (textHint) olur.
    const hint = q.textHint ?? { prompt: q.prompt, choices: q.choices };
    entries.push({ id: q.id, year, number: q.number, section: q.section, image: crop.image, cropBox: crop.cropBox, textHint: hint.prompt, choicesHint: hint.choices });
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
