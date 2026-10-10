// IMAT cevap anahtarlarini kaynaklar arasi karsilastirir (plan 2026-10-08, Gorev 14). Yalniz 2011-2020; girdi
// extract-keys.mjs ciktisi keys/<yil>.<kaynak>.json (cambridge zorunlu; medschool ve 2012 icin cambridge-old varsa).
// 2021 burada yok: tek kaynak (cambridge-form, Cambridge dizilimi); metin eslemesiyle capraz kontrol birakildi (arsivdeki
// Cambridge 2021 kagidi kesik).
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/compare-keys.mjs --year 2012
//   ... --year 2011,2012,2013,2014,2015,2016,2017,2018,2019,2020
//
// Cikti keys/compare-report.json (yil bazinda birlestirilir; baska yillarin kaydi korunur):
//   blocked: kaynaklarin farkli harf verdigi (ya da bir kaynakta olmayan) sorular; validate-bank kapi 5 zorlar
//     (exclusions.json'da olmayan blocked soru hata).
//   versionDiff (yalniz 2012): Cambridge eski (2018) ve yeni surum farki; yeni surum esastir, liste Kerem'e gosterilir.
//   identicalSources: manifestte sha256'si ayni olan kaynak dosyalari (ayni dosya: uyusma bagimsiz kanit degildir).
// Konsol ve rapor yalniz numara ve harf tasir (soru metni yok). Cikis 0: blocked yok; 1: blocked var; 2: girdi hatasi.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { KEY_YEARS, readManifest } from "./download-keys.mjs";
import { KEYS_DIR, argValue, parseYears, readJson, writeJson } from "./paths.mjs";

export const COMPARE_REPORT_PATH = join(KEYS_DIR, "compare-report.json");
const COMPARE_YEARS = Object.freeze(KEY_YEARS.filter((year) => year <= 2020));
// Esas karsilastirma (blocked) bu kaynaklarla; cambridge-old yalniz versionDiff.
const PRIMARY_SOURCES = Object.freeze(["cambridge", "medschool"]);
const LOADED_SOURCES = Object.freeze(["cambridge", "cambridge-old", "medschool"]);

const questionNumbers = (key) => Object.keys(key).filter((k) => /^\d+$/.test(k)).map(Number);

/**
 * Kaynaklar arasi soru soru karsilastirma (saf islev). "sections" gibi sayi olmayan alanlar yok sayilir.
 * @param {Record<string, Record<string, unknown>>} sources  { kaynakAdi: { "1": "A", ... } }
 * @returns {{ sources: string[], questions: number, agreed: number,
 *   disagreements: { number: number, answers: Record<string, string|null> }[], blocked: number[] }}
 */
export function compareKeys(sources) {
  const names = Object.keys(sources);
  if (names.length === 0) throw new Error("compareKeys: en az bir kaynak gerekli");
  const numbers = [...new Set(names.flatMap((name) => questionNumbers(sources[name])))].sort((a, b) => a - b);
  const disagreements = [];
  for (const number of numbers) {
    const answers = Object.fromEntries(names.map((name) => [name, sources[name][String(number)] ?? null]));
    const letters = new Set(Object.values(answers));
    if (letters.size !== 1 || letters.has(null)) disagreements.push({ number, answers });
  }
  return {
    sources: names,
    questions: numbers.length,
    agreed: numbers.length - disagreements.length,
    disagreements,
    blocked: disagreements.map((d) => d.number),
  };
}

/**
 * Bir yilin karsilastirmasi (saf islev). Esas karsilastirma cambridge (+ medschool); cambridge-old blocked hesabina
 * girmez, yeni surumle farki versionDiff olarak ayrica doner.
 */
export function compareYear(keysBySource) {
  if (!keysBySource.cambridge) throw new Error("compareYear: cambridge anahtari zorunlu");
  const primary = Object.fromEntries(PRIMARY_SOURCES.filter((s) => keysBySource[s]).map((s) => [s, keysBySource[s]]));
  const result = compareKeys(primary);
  if (!keysBySource["cambridge-old"]) return result;
  const diff = compareKeys({ "cambridge-old": keysBySource["cambridge-old"], cambridge: keysBySource.cambridge });
  return { ...result, versionDiff: { sources: diff.sources, disagreements: diff.disagreements } };
}

// Manifestte ayni sha256'ya sahip kaynak dosyalari: [["cambridge", "medschool"]] gibi.
function identicalSources(year, sources, manifest) {
  const bySha = new Map();
  for (const source of sources) {
    const sha = manifest[`${year}-${source}.pdf`]?.sha256;
    if (!sha) continue;
    bySha.set(sha, [...(bySha.get(sha) ?? []), source]);
  }
  return [...bySha.values()].filter((group) => group.length > 1);
}

const formatAnswers = (answers) => Object.entries(answers).map(([s, l]) => `${s} ${l ?? "-"}`).join(" / ");

function main(argv) {
  const yearArg = argValue(argv, "--year");
  if (!yearArg) throw new Error("--year zorunlu (ornek: --year 2012 ya da --year 2011,2012)");
  const years = parseYears(yearArg, COMPARE_YEARS);
  const manifest = readManifest();
  const report = existsSync(COMPARE_REPORT_PATH) ? readJson(COMPARE_REPORT_PATH) : { years: {} };
  let blockedTotal = 0;
  for (const year of years) {
    const keys = {};
    for (const source of LOADED_SOURCES) {
      const path = join(KEYS_DIR, `${year}.${source}.json`);
      if (existsSync(path)) keys[source] = readJson(path);
    }
    if (!keys.cambridge) throw new Error(`${year}: keys/${year}.cambridge.json yok (once extract-keys.mjs)`);
    const result = compareYear(keys);
    const identical = identicalSources(year, Object.keys(keys), manifest);
    report.years[year] = { ...result, identicalSources: identical, comparedAt: new Date().toISOString() };
    blockedTotal += result.blocked.length;

    const notes = [];
    if (result.sources.length === 1) notes.push("tek kaynak, capraz kontrol yok");
    for (const group of identical) notes.push(`ayni dosya: ${group.join(" = ")}`);
    console.log(`${year}: ${result.sources.join(" + ")} ${result.agreed}/${result.questions} uyusuyor${notes.length ? ` (${notes.join("; ")})` : ""}`);
    for (const d of result.disagreements) console.log(`  BLOCKED soru ${d.number}: ${formatAnswers(d.answers)}`);
    if (result.versionDiff) {
      const list = result.versionDiff.disagreements;
      console.log(`  KEREM'E (2012 eski/yeni surum farki, yeni esas): ${list.length === 0 ? "fark yok" : `${list.length} soru`}`);
      for (const d of list) console.log(`    soru ${d.number}: ${formatAnswers(d.answers)}`);
    }
  }
  report.updatedAt = new Date().toISOString();
  report.rule = "blocked = kaynaklar (cambridge, medschool) farkli harf veriyor ya da bir kaynakta soru yok; cambridge-old yalniz versionDiff";
  report.years = Object.fromEntries(Object.entries(report.years).sort(([a], [b]) => Number(a) - Number(b)));
  writeJson(COMPARE_REPORT_PATH, report);
  console.log(`Yazildi: ${COMPARE_REPORT_PATH}`);
  if (blockedTotal > 0) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
