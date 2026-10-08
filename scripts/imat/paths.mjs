// IMAT boru hattinin ortak yollari (plan 2026-10-08). Kaynak klasore yazilmaz.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const IMAT_SOURCE_DIR = process.env.IMAT_SOURCE_DIR
  ? resolve(process.env.IMAT_SOURCE_DIR)
  : join(homedir(), "Desktop", "imat");
export const IMAT_OUT = process.env.IMAT_OUT
  ? resolve(process.env.IMAT_OUT)
  : resolve(process.cwd(), "tmp", "imat-bank");
export const PAGES_DIR = join(IMAT_OUT, "pages");
export const EXTRACT_DIR = join(IMAT_OUT, "extract");
export const VISION_DIR = join(IMAT_OUT, "vision");
export const KEYS_DIR = join(IMAT_OUT, "keys");
export const CLASSIFY_DIR = join(IMAT_OUT, "classify");
export const FIGURES_DIR = join(IMAT_OUT, "figures");
export const SOLVER_DIR = join(IMAT_OUT, "solver");
export const VISUAL_DIR = join(IMAT_OUT, "visual");
export const PREVIEW_DIR = join(IMAT_OUT, "preview");
export const RELEASE_DIR = join(IMAT_OUT, "release");
export const BACKUPS_DIR = join(IMAT_OUT, "backups");
export const INVENTORY_PATH = join(IMAT_OUT, "inventory.json");
export const BANK_PATH = join(IMAT_OUT, "bank.json");
export const CORRECTIONS_PATH = join(IMAT_OUT, "corrections.json");
// Karistirma istisnasi: [{ id, reason }] (siklari sekil icinde cizili soru; shuffle-choices.mjs, validate-bank.mjs).
export const SHUFFLE_EXEMPT_PATH = join(IMAT_OUT, "shuffle-exempt.json");

// Yil -> kaynak dosya (2026-10-08 envanteri; dosya adlari degismez).
export const SOURCE_FILES = Object.freeze({
  2011: "IMAT-past-paper-2011.pdf",
  2012: "IMAT-past-paper-2012.pdf",
  2013: "IMAT-past-paper-2013.pdf",
  2014: "IMAT-2014.pdf",
  2015: "311133-imat-2015-paper-.pdf",
  2016: "370030-imat-2016-paper.pdf",
  2017: "462135-imat-past-paper-2017.pdf",
  2018: "539381-imat-past-paper-2018.pdf",
  2019: "580262-imat-past-paper-2019.pdf",
  2020: "imat-past-paper-2020.pdf",
  2021: "IMAT-2021-Past-Paper-PDF-A-Form.pdf",
  2022: "IMAT-2022-Past-Paper-PDF-A-Form.pdf",
  2023: "imat.deneme.23.pdf",
  2024: "imat.deneme.24.pdf",
  2025: "imat.deneme.25.pdf",
});
export const ALL_YEARS = Object.freeze(Object.keys(SOURCE_FILES).map(Number));
export function sourcePdf(year) {
  const name = SOURCE_FILES[year];
  if (!name) throw new Error(`Bilinmeyen yil: ${year}`);
  return join(IMAT_SOURCE_DIR, name);
}
export function ensureOutDirs() {
  for (const dir of [IMAT_OUT, PAGES_DIR, EXTRACT_DIR, VISION_DIR, KEYS_DIR, join(KEYS_DIR, "sources"), CLASSIFY_DIR, FIGURES_DIR, SOLVER_DIR, VISUAL_DIR, PREVIEW_DIR, RELEASE_DIR, BACKUPS_DIR]) {
    mkdirSync(dir, { recursive: true });
  }
}
export function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
export function writeJson(path, data) { writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8"); }

// Soru kimligi: sha256("imat:<yil>:<numara>") ilk 8 hex (extract_text.py ayni kurali uygular; site id'yi veriden okur).
export function questionId(year, number) {
  return createHash("sha256").update(`imat:${year}:${number}`).digest("hex").slice(0, 8);
}

// Komut satiri: `--ad deger` degeri (yoksa null).
export function argValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} bir deger ister`);
  return value;
}

// `--years 2023,2024` -> [2023, 2024]; izin verilmeyen yil hata.
export function parseYears(value, allowed = ALL_YEARS) {
  if (!value) throw new Error("--years zorunlu (ornek: --years 2024,2025)");
  const years = value.split(",").map((part) => Number(part.trim()));
  for (const year of years) {
    if (!allowed.includes(year)) throw new Error(`Gecersiz yil: ${year} (izinli: ${allowed.join(", ")})`);
  }
  return [...new Set(years)].sort((a, b) => a - b);
}

// Iki haneli sayfa/soru/paket numarasi (p-01, q-07, package-03).
export function pad2(n) {
  return String(n).padStart(2, "0");
}

// Sayfa goruntuleri: 200 dpi, pages/<yil>/p-NN.png (1 tabanli). PDF noktasi -> piksel: x * PAGE_DPI / 72.
export const PAGE_DPI = 200;
export function pagePath(year, page) {
  return join(PAGES_DIR, String(year), `p-${pad2(page)}.png`);
}
