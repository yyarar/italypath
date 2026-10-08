// IMAT kaynak envanteri (plan Gorev 9): 15 PDF'in adi, boyutu, sha256'si, sayfa sayisi, metin katmani durumu
// ve beklenen soru sayisi. PDF okuyan her betik baslarken checkInventory() cagirir; kaynak degismisse durur.
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/inventory.mjs
//   ... node scripts/imat/inventory.mjs --check   (kayitli envanterle karsilastirir; fark varsa cikis 1)
//
// Kaynak klasore yazilmaz. Sayfa sayisi poppler `pdfinfo` ile okunur.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_YEARS, INVENTORY_PATH, SOURCE_FILES, ensureOutDirs, readJson, sourcePdf, writeJson } from "./paths.mjs";

// Metin katmani bozuk yillar (fontlarda ToUnicode yok; pdftotext cop verir): goruntuden yazilir.
export const BROKEN_TEXT_YEARS = Object.freeze([2021, 2023]);

export function expectedQuestions(year) {
  return year <= 2012 ? 80 : 60;
}

function pageCount(path) {
  const info = execFileSync("pdfinfo", [path], { encoding: "utf8" });
  const match = info.match(/^Pages:\s+(\d+)$/m);
  if (!match) throw new Error(`pdfinfo sayfa sayisi vermedi: ${path}`);
  return Number(match[1]);
}

function describe(year) {
  const path = sourcePdf(year);
  if (!existsSync(path)) throw new Error(`Kaynak yok: ${path}`);
  return {
    year,
    file: SOURCE_FILES[year],
    bytes: statSync(path).size,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    pages: pageCount(path),
    textLayer: BROKEN_TEXT_YEARS.includes(year) ? "broken" : "ok",
    expectedQuestions: expectedQuestions(year),
  };
}

export function buildInventory() {
  return ALL_YEARS.map(describe);
}

// Kayitli envanterle bugunku kaynaklari karsilastirir; sorun listesini doner (bos = tutuyor).
export function inventoryProblems() {
  if (!existsSync(INVENTORY_PATH)) return [`envanter yok: ${INVENTORY_PATH} (once: node scripts/imat/inventory.mjs)`];
  const saved = new Map(readJson(INVENTORY_PATH).map((entry) => [entry.year, entry]));
  const problems = [];
  for (const entry of buildInventory()) {
    const old = saved.get(entry.year);
    if (!old) {
      problems.push(`${entry.year}: envanterde yok`);
      continue;
    }
    for (const key of ["file", "bytes", "sha256", "pages", "textLayer", "expectedQuestions"]) {
      if (old[key] !== entry[key]) problems.push(`${entry.year}: ${key} ${old[key]} -> ${entry[key]}`);
    }
    saved.delete(entry.year);
  }
  for (const year of saved.keys()) problems.push(`${year}: envanterde fazla kayit`);
  return problems;
}

// Diger betiklerin baslangic kapisi: fark varsa yazip cikis 1.
export function checkInventory() {
  const problems = inventoryProblems();
  if (problems.length > 0) {
    console.error(`Envanter uyusmuyor (${problems.length}):\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  return readJson(INVENTORY_PATH);
}

function main() {
  if (process.argv.includes("--check")) {
    const inventory = checkInventory();
    console.log(`Envanter tutuyor: ${inventory.length} dosya (${INVENTORY_PATH})`);
    return;
  }
  ensureOutDirs();
  const inventory = buildInventory();
  writeJson(INVENTORY_PATH, inventory);
  const pages = inventory.reduce((sum, entry) => sum + entry.pages, 0);
  const broken = inventory.filter((entry) => entry.textLayer === "broken").map((entry) => entry.year);
  console.log(`Yazildi: ${INVENTORY_PATH} (${inventory.length} dosya, ${pages} sayfa; metni bozuk: ${broken.join(", ")})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
