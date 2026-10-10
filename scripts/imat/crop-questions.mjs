// IMAT goruntuden yazim paketleri (plan Gorev 9; runbook docs/superpowers/specs/assets/imat-vision-extraction-prompt.md).
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/crop-questions.mjs --years 2023,2024,2025 [--all] [--numbers 5,48]
//
// Metin katmani bozuk yil (inventory textLayer "broken": 2023): sayfa kipi. Kirpma yok; her girdi bir sayfa goruntusu, paket basina 3 sayfa:
//   vision/<yil>/package-NN.json = [{ year, page, image, textHint: null, choicesHint: null, expectedNumbers: [] }]
// Metin yili (textLayer "ok" ya da "decoded": 2011-2022, 2024, 2025; 2021 kod kaydirmasiyla cozulmus):
// extract/<yil>.json'daki bbox + 6 pt pay (sayfaya kistirilir) 200 dpi sayfa PNG'sinden
// sharp ile kirpilir -> vision/<yil>/q-NN.png. Varsayilan yalniz hasImage sorulari (goruntuden yazima gidenler):
//   vision/<yil>/package-NN-img.json = [{ id, year, number, section, image, cropBox, textHint: prompt, choicesHint: choices }]
// cropBox = kirpintinin sayfadaki yeri [x0, y0, x1, y1], 200 dpi sayfa pikseli; kirpinti icinde olculen sekil kutusu
// (result figure.box) bununla sayfaya tasinir (merge-vision.mjs, crop-figures.mjs).
// --all: tum sorular, paketler package-NN.json. Paket basina 10 soru. --numbers: yalniz bu sorularin kirpintisi
// yenilenir; paketler bastan yazilmaz, var olan package-NN(-img).json dosyalarinda yalniz bu sorularin girdisinde cropBox
// ve image guncellenir (cropBox eskimesin: merge-vision sekil kutusunu bununla sayfaya tasir). Ayni kipteki eski paket
// dosyalari yeniden yazilmadan once silinir; sonuc dosyalarina (result-*) dokunulmaz. image her zaman mutlak yol.
// Kirpintidaki dogru cevap vurgusu yalniz 2025'te maskelenir (lib/highlight.mjs; maske sonrasi yesil izli piksel kalirsa
// hata).
// Kirpma duzeltmesi (Git disi IMAT_OUT/crop-overrides.json): { "<soru id>": { "bbox": [x0, top, x1, bottom], "note": "..." } }
// PDF noktasi, extract bbox'i ile ayni uzay; o sorunun kirpintisinda extract bbox'i yerine kullanilir (ayni 6 pt pay,
// sayfaya kistirilir). Cikaricinin bbox'i sekli tam icermediginde (kesik kirpinti) yazilir; sonra --numbers ile yeniden
// kirpilir. Kutu sayfa disinda kalirsa ya da kayit gecersizse cikis 1.
// Eski kirpinti kurali: kirpinti gecis sonucundan (result-*) yeniyse ve gecislerden biri sekil kutusu tasiyorsa ya da soru
// crop-overrides.json'da ise merge-vision.mjs o yili durdurur (diger sekilsiz soruda yalniz uyari); soru iki gecisle
// yeniden okunur ya da resolutions.json'a yeni kirpintida olculmus figure cozumu yazilir. Bayt bayt ayni kirpinti yeniden
// yazilmaz (tarihi degismez; tam yeniden calistirma korumayi bosuna tetiklemez).
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { checkInventory } from "./inventory.mjs";
import { HIGHLIGHT_YEARS, maskHighlight, tintedPixels } from "./lib/highlight.mjs";
import { CROP_OVERRIDES_PATH, EXTRACT_DIR, PAGE_DPI, VISION_DIR, argValue, pad2, pagePath, parseYears, readJson, writeJson } from "./paths.mjs";

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

// crop-overrides.json -> Map(id -> { bbox, note }); dosya yoksa bos. Gecersiz kayit hata (soru metni tasimaz).
export function readCropOverrides(path) {
  if (!existsSync(path)) return new Map();
  const raw = readJson(path);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`${path}: { "<id>": { bbox, note } } nesnesi olmali`);
  const out = new Map();
  for (const [id, entry] of Object.entries(raw)) {
    const bbox = entry?.bbox;
    const problems = [];
    if (!/^[0-9a-f]{8}$/.test(id)) problems.push("id 8 hex olmali");
    if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite)) problems.push("bbox [x0, top, x1, bottom] sayi olmali");
    else if (bbox[2] <= bbox[0] || bbox[3] <= bbox[1]) problems.push("bbox x1 > x0 ve bottom > top olmali");
    if (typeof entry?.note !== "string" || !entry.note.trim()) problems.push("note bos");
    if (problems.length > 0) throw new Error(`${path}: ${id}: ${problems.join(", ")}`);
    out.set(id, { bbox: [...bbox], note: entry.note });
  }
  return out;
}

// PDF noktasi kutusu -> 200 dpi sayfa pikseli kirpma kutusu [left, upper, right, lower]: 6 pt pay, sayfaya kistirilir.
export function pixelCropBox(bbox, { width, height }) {
  const scale = PAGE_DPI / 72;
  const [x0, top, x1, bottom] = bbox;
  const left = Math.max(0, Math.floor((x0 - MARGIN_PT) * scale));
  const upper = Math.max(0, Math.floor((top - MARGIN_PT) * scale));
  const right = Math.min(width, Math.ceil((x1 + MARGIN_PT) * scale));
  const lower = Math.min(height, Math.ceil((bottom + MARGIN_PT) * scale));
  if (right <= left || lower <= upper) throw new Error(`kirpma kutusu sayfa disinda (${bbox.join(", ")} pt; sayfa ${width}x${height} px)`);
  return [left, upper, right, lower];
}

async function cropQuestion(year, question, override) {
  const source = pagePath(year, question.page);
  if (!existsSync(source)) throw new Error(`${year}: sayfa goruntusu yok (${source}); once render-pages.mjs`);
  const meta = await sharp(source).metadata();
  let box;
  try {
    box = pixelCropBox(override?.bbox ?? question.bbox, meta);
  } catch (error) {
    throw new Error(`${year}:${question.number}: ${error.message}${override ? " (crop-overrides.json)" : ""}`);
  }
  const [left, upper, right, lower] = box;
  const out = join(VISION_DIR, String(year), `q-${pad2(question.number)}.png`);
  const crop = await sharp(source).extract({ left, top: upper, width: right - left, height: lower - upper }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let masked = false;
  if (HIGHLIGHT_YEARS.includes(year)) {
    masked = maskHighlight(crop.data, crop.info) !== null;
    const tinted = tintedPixels(crop.data, crop.info);
    if (tinted > 0) throw new Error(`${year}:${question.number}: maske sonrasi ${tinted} yesil izli piksel`);
  }
  const png = await sharp(crop.data, { raw: crop.info }).png().toBuffer();
  if (!existsSync(out) || !readFileSync(out).equals(png)) writeFileSync(out, png);
  return { image: out, masked, cropBox: [left, upper, right, lower] };
}

// --numbers: var olan paket dosyalarinda (package-NN.json, package-NN-img.json) yenilenen sorularin girdisi cropBox ve
// image ile guncellenir; diger girdiler ve dosyalar aynen kalir. Donus: { "<paket>": [numara] } ve paketsiz numaralar.
export function refreshPackageEntries(dir, entries) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const rewritten = {};
  const found = new Set();
  const names = existsSync(dir) ? readdirSync(dir).filter((name) => /^package-\d{2}(-img)?\.json$/.test(name)).sort() : [];
  for (const name of names) {
    const path = join(dir, name);
    const items = readJson(path);
    let changed = false;
    for (const item of items) {
      const entry = byId.get(item.id);
      if (!entry) continue;
      found.add(item.id);
      if (item.image === entry.image && JSON.stringify(item.cropBox) === JSON.stringify(entry.cropBox)) continue;
      item.image = entry.image;
      item.cropBox = entry.cropBox;
      changed = true;
      (rewritten[name] ??= []).push(item.number);
    }
    if (changed) writeJson(path, items);
  }
  return { rewritten, unpackaged: entries.filter((entry) => !found.has(entry.id)).map((entry) => entry.number) };
}

async function questionPackages(year, { all, numbers, overrides, used }) {
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
  const overridden = [];
  for (const q of selected) {
    const override = overrides.get(q.id);
    if (override) {
      overridden.push(q.number);
      used.add(q.id);
    }
    const crop = await cropQuestion(year, q, override);
    if (crop.masked) masked.push(q.number);
    // merge-vision sonrasi extract'ta yazim vardir; ipucu her zaman ilk metin katmani (textHint) olur.
    const hint = q.textHint ?? { prompt: q.prompt, choices: q.choices };
    entries.push({ id: q.id, year, number: q.number, section: q.section, image: crop.image, cropBox: crop.cropBox, textHint: hint.prompt, choicesHint: hint.choices });
  }
  if (masked.length > 0) console.log(`${year}: dogru cevap vurgusu maskelendi: ${masked.join(", ")}`);
  if (overridden.length > 0) console.log(`${year}: kirpma duzeltmesi: ${overridden.join(", ")} (crop-overrides.json)`);
  if (numbers) {
    console.log(`${year}: ${entries.length} kirpinti yenilendi: ${selected.map((q) => q.number).join(", ")}`);
    const { rewritten, unpackaged } = refreshPackageEntries(dir, entries);
    for (const [name, list] of Object.entries(rewritten)) console.log(`${year}: ${name}: ${list.length} girdi yenilendi (${list.join(", ")})`);
    if (unpackaged.length > 0) console.log(`${year}: pakette yok: ${unpackaged.join(", ")} (yalniz kirpinti)`);
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
  const overrides = readCropOverrides(CROP_OVERRIDES_PATH);
  const used = new Set();
  for (const year of years) {
    const entry = inventory.get(year);
    if (entry.textLayer === "broken") {
      if (numbers || all) throw new Error(`${year}: sayfa kipinde --numbers/--all kullanilmaz`);
      pagePackages(year, entry.pages);
    } else {
      await questionPackages(year, { all, numbers, overrides, used });
    }
  }
  const unused = overrides.size - used.size;
  if (unused > 0) console.log(`crop-overrides.json: ${unused} kayit bu calismada kullanilmadi (baska yil/soru ya da secilmemis)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
