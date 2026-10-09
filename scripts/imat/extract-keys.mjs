// IMAT cevap anahtari PDF'inden harf listesi cikarir (plan 2026-10-08, Gorev 14). Kaynak keys/sources/<yil>-<kaynak>.pdf
// (download-keys.mjs indirir; sha256 manifestle tutmazsa durur). Metin pdfplumber ile /usr/bin/python3 -I altinda okunur
// (indirilen dosya guvenilmeyen veridir: calistirilmaz, import edilmez).
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/extract-keys.mjs --year 2017 --source cambridge
//   ... --year 2011,2012,2013 --source medschool   (virgulle birden cok yil)
//
// Cikti: keys/<yil>.<kaynak>.json = { "1": "C", ..., "60": "B" } (+ bolum etiketi varsa "sections": [{ label, from, to }]);
// ham metin keys/<yil>.<kaynak>.txt (yalniz IMAT_OUT altinda kalir; soru metni icerebilir, Git'e girmez).
// Kayit sayisi expectedQuestions(yil) degilse, celisen tekrar ya da aralik disi numara varsa JSON yazilmaz (eskisi
// silinir), cikis 1.
// Konsol yalniz numara/harf/sayi basar (soru metni yok).
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { KEY_SOURCES, verifiedSourcePath } from "./download-keys.mjs";
import { expectedQuestions } from "./inventory.mjs";
import { KEYS_DIR, argValue, parseYears, writeJson } from "./paths.mjs";

export const KEY_YEARS = Object.freeze([2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021]);

// "1 A", "1. A", "2) B", "Q3 C", "Question 4: D", "5A"; bir satirda birden cok (iki/uc sutun: "1 A 31 C").
const PAIR = /(?<![\w.])(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[.):]?\s*([A-E])(?!\w)/g;
const STRAY = /(?:^|\s)([A-E]|\d{1,3})(?=$|\s|[.):,;])/g;

// Bilinen bolum basliklari (kucuk harf). Etiket oldugu gibi saklanir; esleme Gorev 17'de.
const SECTION_LABELS = new Set([
  "general knowledge and logical reasoning",
  "general knowledge",
  "logical reasoning",
  "thinking skills",
  "problem solving",
  "critical thinking",
  "reading skills and knowledge acquired in studies",
  "biology",
  "chemistry",
  "physics and mathematics",
  "mathematics and physics",
  "physics",
  "mathematics",
]);

// "Section 1: Biology (Questions 23-40)" -> "Biology"; bilinen baslik degilse null.
function sectionLabel(rest) {
  const label = rest
    .replace(/^(section|part)\s*\d*\s*[:.\-–]?\s*/i, "")
    .replace(/\(.*\)\s*$/, "")
    .replace(/\b(questions?|q)\s*\d+\s*[-–]\s*\d+\s*$/i, "")
    .replace(/[\s:.\-–]+$/, "")
    .trim();
  return SECTION_LABELS.has(label.toLowerCase().replace(/\s+/g, " ")) ? label.replace(/\s+/g, " ") : null;
}

/**
 * Anahtar metnini ayristirir (saf islev; dosya ve ag yok).
 * @param {string} text  PDF'ten cikan metin
 * @param {{ expected: number }} options  beklenen soru sayisi (expectedQuestions)
 * @returns {{ key: Record<string,string>, sections: {label:string,from:number,to:number}[] | null, problems: string[], warnings: string[] }}
 *   problems bos degilse anahtar kullanilmaz; warnings bilgi icindir.
 */
export function parseKeyText(text, { expected } = {}) {
  if (!Number.isInteger(expected) || expected < 1) throw new Error("parseKeyText: expected (beklenen soru sayisi) zorunlu");
  const key = {};
  const problems = [];
  const warnings = [];
  const groups = []; // [{ label, numbers: [] }]; etiketten once gelenler label null
  let current = { label: null, numbers: [] };
  groups.push(current);

  const lines = text.replace(/ /g, " ").replace(/\t/g, " ").split(/\r?\n|\f/);
  if (lines.every((line) => line.trim() === "")) {
    return { key, sections: null, problems: ["metin yok (PDF metin katmani bos; goruntuden okunmali)"], warnings };
  }
  lines.forEach((line, index) => {
    const pairs = [...line.matchAll(PAIR)].map((m) => [Number(m[1]), m[2]]);
    const rest = line.replace(PAIR, " ").replace(/\s+/g, " ").trim();
    const label = rest ? sectionLabel(rest) : null;
    if (label) {
      current = { label, numbers: [] };
      groups.push(current);
    } else {
      // Ciftlenmemis tek harf ya da soru araligindaki sayi (ornek: iki harfli cevap, bozuk satir): bilgi icin.
      const stray = [...rest.matchAll(STRAY)].map((m) => m[1]).filter((t) => /^[A-E]$/.test(t) || Number(t) <= expected);
      if (stray.length > 0) warnings.push(`satir ${index + 1}: eslesmeyen parca "${rest.slice(0, 40)}"`);
    }
    for (const [number, letter] of pairs) {
      if (number < 1 || number > expected) {
        problems.push(`soru ${number} aralik disi (1-${expected})`);
        continue;
      }
      const prior = key[number];
      if (prior && prior !== letter) problems.push(`soru ${number}: iki farkli harf (${prior}, ${letter})`);
      else if (prior) warnings.push(`soru ${number}: ayni harfle tekrar (${letter})`);
      else key[number] = letter;
      current.numbers.push(number);
    }
  });

  const count = Object.keys(key).length;
  if (count !== expected) {
    problems.push(`kayit sayisi ${count}, beklenen ${expected}`);
    const missing = Array.from({ length: expected }, (_, i) => i + 1).filter((n) => !key[n]);
    if (missing.length > 0) problems.push(`eksik sorular: ${missing.join(", ")}`);
  }

  const sections = sectionRanges(groups, expected, warnings);
  const ordered = Object.fromEntries(Object.keys(key).map(Number).sort((a, b) => a - b).map((n) => [String(n), key[n]]));
  return { key: ordered, sections, problems, warnings };
}

// Bolumler yalniz her soru bir etikete dusuyorsa ve her bolum ardisik, cakismayan bir araliksa yazilir.
function sectionRanges(groups, expected, warnings) {
  const labelled = groups.filter((g) => g.label && g.numbers.length > 0);
  if (labelled.length === 0) return null;
  const unlabelled = groups.filter((g) => !g.label).reduce((sum, g) => sum + g.numbers.length, 0);
  const ranges = labelled.map((g) => {
    const numbers = [...new Set(g.numbers)].sort((a, b) => a - b);
    const from = numbers[0];
    const to = numbers[numbers.length - 1];
    return { label: g.label, from, to, contiguous: numbers.length === to - from + 1 };
  });
  const covered = ranges.reduce((sum, r) => sum + (r.to - r.from + 1), 0);
  const ordered = ranges.every((r, i) => r.contiguous && (i === 0 || r.from === ranges[i - 1].to + 1));
  if (unlabelled > 0 || !ordered || covered !== expected || ranges[0].from !== 1) {
    warnings.push("bolum etiketleri sorularin hepsini ardisik araliklarla kapsamiyor; sections yazilmadi");
    return null;
  }
  return ranges.map(({ label, from, to }) => ({ label, from, to }));
}

const PDF_TEXT_PY = [
  "import site, sys",
  "site.addsitedir(site.getusersitepackages())", // -I kullanici paketlerini kapatir; pdfplumber orada (bilinen yer)
  "import pdfplumber",
  "with pdfplumber.open(sys.argv[1]) as pdf:",
  "    for page in pdf.pages:",
  "        sys.stdout.write((page.extract_text() or '') + '\\n\\f\\n')",
].join("\n");

function pdfText(path) {
  const run = spawnSync("/usr/bin/python3", ["-I", "-c", PDF_TEXT_PY, path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(`pdfplumber hata verdi (cikis ${run.status}): ${run.stderr.trim().split("\n").pop()}`);
  return run.stdout;
}

function letterCounts(key) {
  const counts = {};
  for (const letter of Object.values(key)) counts[letter] = (counts[letter] ?? 0) + 1;
  return ["A", "B", "C", "D", "E"].map((l) => `${l}${counts[l] ?? 0}`).join(" ");
}

function main(argv) {
  const years = parseYears(argValue(argv, "--year"), KEY_YEARS);
  const source = argValue(argv, "--source");
  if (!KEY_SOURCES.includes(source)) throw new Error(`--source ${KEY_SOURCES.join(" | ")} olmali`);
  mkdirSync(KEYS_DIR, { recursive: true });
  let failed = 0;
  for (const year of years) {
    const expected = expectedQuestions(year);
    const text = pdfText(verifiedSourcePath(year, source));
    writeFileSync(join(KEYS_DIR, `${year}.${source}.txt`), text, "utf8");
    const { key, sections, problems, warnings } = parseKeyText(text, { expected });
    for (const warning of warnings) console.log(`  uyari ${year}.${source}: ${warning}`);
    if (problems.length > 0) {
      failed += 1;
      rmSync(join(KEYS_DIR, `${year}.${source}.json`), { force: true }); // eski cikti karsilastirmaya girmesin
      console.error(`HATA ${year}.${source}: ${problems.join("; ")} (JSON yazilmadi, eskisi silindi; ham metin keys/${year}.${source}.txt)`);
      continue;
    }
    writeJson(join(KEYS_DIR, `${year}.${source}.json`), sections ? { ...key, sections } : key);
    const sectionText = sections ? sections.map((s) => `${s.label} ${s.from}-${s.to}`).join(", ") : "etiket yok";
    console.log(`${year}.${source}: ${Object.keys(key).length}/${expected} (${letterCounts(key)}); bolumler: ${sectionText}`);
  }
  if (failed > 0) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
