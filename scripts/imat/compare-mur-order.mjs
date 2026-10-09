// IMAT MUR sira kontrolu (plan 2026-10-08, Gorev 15b). Cambridge cevap anahtarlarini (2011-2020) Bakanligin kendi kagit
// kopyalariyla (keys/sources/<yil>-mur.pdf, CompitoInglese<yil>) bagimsiz olarak dogrular. MUR kopyasinda dogru cevabin her
// soruda A sikkinda oldugu varsayilir ("hep A"): MUR'un A sikki, bizim kagitta (extract/<yil>.json, Cambridge dizilimi)
// Cambridge anahtarinin gosterdigi sikla ayni metni tasimalidir.
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/compare-mur-order.mjs --years 2011,2012
//   ... --years 2011,2012,2013,2014,2015,2016,2017,2018,2019,2020
//
// Yil basina:
//   1. MUR kagidi manifestle dogrulanir (download-keys.mjs verifiedSourcePath) ve extract_text.py --layout mur-legacy ile
//      /usr/bin/python3 -I altinda okunur (guvenilmeyen veri: calistirilmaz, import edilmez) -> extract-mur/<yil>.json.
//      Cikarim beklenen sayiya (expectedQuestions: 80/60) ulasmazsa yil inconclusive + neden; dolgu yok.
//   2. Eslesme: once ayni numara (kok anahtari ayni), tutmazsa kok anahtariyla yil icinde. Kok anahtari: kucuk harf, <i>/<u>
//      isaretleri silinir, noktalama (Unicode P) silinir, bosluklar tek bosluk, ilk 80 karakter. Iki kagittan birinde birden
//      cok soruda gecen anahtar soru tanimlamaz (ne numarayla ne metinle eslesir; ambiguousMurNumbers); MIN_TEXT_KEY (8)
//      karakterden kisa anahtar metinle eslesmez (shortStemMurNumbers; ayni numarada numarayla eslesebilir).
//   3. Eslesen her soruda MUR A (normalize) == bizim anahtarli sik (normalize): match; degil: mismatch (murAIs: MUR A metninin
//      bizim kagittaki harfi, yoksa null). Iki taraftan biri yer tutucu (U+FFFD) ya da bossa: unverifiable. MUR A bizim birden
//      cok sikkimiza esitse (normallestirme "-3"/"3", "Gg"/"gg" farkini siler) siki bicim (harf ve noktalama korunur) karar
//      verir; orada da tek aday yoksa unverifiable (ambiguous). Tek aday yalniz normallestirmeyle esitse (siki bicim farkli)
//      ve bizim bir sikkimiz goruntuyse gercek es o olabilir: unverifiable (placeholder-sibling). Eslesmeyen soru
//      karsilastirmaya girmez (pairing listeleri).
//   4. Oran = match / (match + mismatch); verified = match + mismatch, coverage = verified / expected (bilgi; esik yok).
//      >= %95 confirmed (mismatchNumbers Gorev 18 cozucu kapisinda oncelikli), < %95 ya da
//      dogrulanabilir soru yok: inconclusive (hata degil: MUR surumu "hep A" degil ya da duzen farkli).
//
// Cikti keys/mur-order-report.json (yil bazinda birlestirilir; baska yillarin kaydi korunur): yil basina extraction (ok,
// soru sayisi, sorunlar), pairing (byNumber, byText, unpairedNumbers, unpairedMurNumbers, ambiguousMurNumbers,
// shortStemMurNumbers, sameChoiceSet: bes sik metni kume olarak ayni olan eslesme sayisi), matched, mismatched,
// unverifiable, ratio, verified, coverage, verdict, reason,
// mismatchNumbers + mismatchDetail ({ number, murNumber, key, murAIs }), unverifiableNumbers + unverifiableDetail ({ why }).
// Numaralar bizim (Cambridge) kagidin numaralaridir; murNumber MUR kopyasindaki yeri. Rapor ve konsol yalniz sayi, numara,
// harf ve neden kodu tasir; soru metni yazilmaz. Cikis 0: tum yillar islendi (inconclusive dahil); 2: girdi hatasi.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { verifiedSourcePath } from "./download-keys.mjs";
import { expectedQuestions } from "./inventory.mjs";
import { EXTRACT_DIR, IMAT_OUT, KEYS_DIR, argValue, parseYears, readJson, writeJson } from "./paths.mjs";

export const MUR_ORDER_YEARS = Object.freeze([2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020]);
export const EXTRACT_MUR_DIR = join(IMAT_OUT, "extract-mur");
export const MUR_ORDER_REPORT_PATH = join(KEYS_DIR, "mur-order-report.json");
export const THRESHOLD = 0.95;
const THRESHOLD_PERCENT = 95; // tamsayi karsilastirma (kayan nokta yok): match * 100 >= 95 * (match + mismatch)
const STEM_CHARS = 80;
// Metinle eslesme icin kok anahtarinin en kisa boyu: daha kisa kok ("why so", "tide") soru tanimlamaz (yalniz ayni numarada
// numarayla eslesebilir).
export const MIN_TEXT_KEY = 8;
const LETTERS = Object.freeze(["A", "B", "C", "D", "E"]);
const PLACEHOLDER = "�";
const PYTHON = "/usr/bin/python3";
const EXTRACT_PY = join(dirname(fileURLToPath(import.meta.url)), "extract_text.py");

// Karsilastirma bicimi: isaret etiketleri silinir, \$ gercek dolar, kucuk harf, noktalama (Unicode P) silinir, bosluk tek.
export function normalizeText(text) {
  return String(text ?? "")
    .replace(/<\/?[iu]>/g, "")
    .replace(/\\\$/g, "$")
    .toLowerCase()
    .replace(/\p{P}/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function stemKey(prompt) {
  return normalizeText(prompt).slice(0, STEM_CHARS);
}

// Goruntu sikki (U+FFFD yer tutucu ya da eslenmeyen glif) ya da normallestirmeden sonra bos: karsilastirilamaz.
export function isPlaceholder(text) {
  return String(text ?? "").includes(PLACEHOLDER) || normalizeText(text) === "";
}

const byNumber = (a, b) => a - b;
// Bes sikkin normalize metni kume olarak (sirasiz): MUR kopyasi bizim kagidin sik permutasyonu mu (cikarim gostergesi).
const choiceMultiset = (q) => LETTERS.map((letter) => normalizeText(q.choices?.[letter])).sort().join("\u0000");
const countKeys = (questions) => {
  const counts = new Map();
  for (const q of questions) counts.set(stemKey(q.prompt), (counts.get(stemKey(q.prompt)) ?? 0) + 1);
  return counts;
};

/**
 * MUR sorularini bizim sorularla esler (saf islev). Once numara (kok anahtari ayni), sonra kok anahtari (yil icinde).
 * Kok anahtari iki kagittan birinde tek degilse soru tanimlamaz: eslesmez (ambiguousMurNumbers).
 * @returns {{ pairs: { ours: number, mur: number, by: "number"|"text" }[], byNumber: number, byText: number,
 *   unpairedNumbers: number[], unpairedMurNumbers: number[], ambiguousMurNumbers: number[], shortStemMurNumbers: number[] }}
 */
export function pairQuestions(murQuestions, ourQuestions) {
  const murCounts = countKeys(murQuestions);
  const ourCounts = countKeys(ourQuestions);
  const unique = (key) => murCounts.get(key) === 1 && ourCounts.get(key) === 1;
  const oursByNumber = new Map(ourQuestions.map((q) => [q.number, q]));
  const oursByKey = new Map(ourQuestions.map((q) => [stemKey(q.prompt), q]));
  const pairs = [];
  const pairedOurs = new Set();
  const ambiguous = [];
  const rest = [];
  for (const m of murQuestions) {
    const key = stemKey(m.prompt);
    const o = oursByNumber.get(m.number);
    if (o && unique(key) && stemKey(o.prompt) === key) {
      pairs.push({ ours: o.number, mur: m.number, by: "number" });
      pairedOurs.add(o.number);
    } else {
      rest.push(m);
    }
  }
  const shortStem = [];
  for (const m of rest) {
    const key = stemKey(m.prompt);
    if (key.length < MIN_TEXT_KEY) {
      shortStem.push(m.number);
      continue;
    }
    if (!unique(key)) {
      if ((ourCounts.get(key) ?? 0) > 0) ambiguous.push(m.number);
      continue;
    }
    const o = oursByKey.get(key);
    if (o && !pairedOurs.has(o.number)) {
      pairs.push({ ours: o.number, mur: m.number, by: "text" });
      pairedOurs.add(o.number);
    }
  }
  pairs.sort((a, b) => a.ours - b.ours);
  const pairedMur = new Set(pairs.map((p) => p.mur));
  return {
    pairs,
    byNumber: pairs.filter((p) => p.by === "number").length,
    byText: pairs.filter((p) => p.by === "text").length,
    unpairedNumbers: ourQuestions.map((q) => q.number).filter((n) => !pairedOurs.has(n)).sort(byNumber),
    unpairedMurNumbers: murQuestions.map((q) => q.number).filter((n) => !pairedMur.has(n)).sort(byNumber),
    ambiguousMurNumbers: ambiguous.sort(byNumber),
    shortStemMurNumbers: shortStem.sort(byNumber),
  };
}

export function verdictOf(matched, mismatched) {
  const verified = matched + mismatched;
  return verified > 0 && matched * 100 >= THRESHOLD_PERCENT * verified ? "confirmed" : "inconclusive";
}

// Tek eslesmenin sonucu: { result: "match"|"mismatch"|"unverifiable", why?, murAIs? } (yalniz harf ve neden kodu).
function judge(murQuestion, ourQuestion, keyLetter) {
  const murA = murQuestion.choices?.A;
  const ours = ourQuestion.choices ?? {};
  if (!LETTERS.includes(keyLetter)) return { result: "unverifiable", why: "no-key" };
  if (isPlaceholder(murA)) return { result: "unverifiable", why: "mur-placeholder" };
  if (isPlaceholder(ours[keyLetter])) return { result: "unverifiable", why: "ours-placeholder" };
  const target = normalizeText(murA);
  let equal = LETTERS.filter((letter) => !isPlaceholder(ours[letter]) && normalizeText(ours[letter]) === target);
  if (equal.length > 1) {
    // Normallestirme birden cok sikkimizi ayni yapti ("-3"/"3", "Gg"/"gg"): siki bicimde tek aday kalirsa o karar verir.
    const strict = strictText(murA);
    equal = equal.filter((letter) => strictText(ours[letter]) === strict);
    if (equal.length !== 1) return { result: "unverifiable", why: "ambiguous" };
  } else if (equal.length === 1 && strictText(ours[equal[0]]) !== strictText(murA) && LETTERS.some((letter) => isPlaceholder(ours[letter]))) {
    // Tek aday yalniz normallestirmeyle esit ("-3 marks" / "3 marks") ve bizim bir sikkimiz goruntu: gercek es o olabilir.
    return { result: "unverifiable", why: "placeholder-sibling" };
  }
  if (equal.length === 1 && equal[0] === keyLetter) return { result: "match" };
  return { result: "mismatch", murAIs: equal.length === 1 ? equal[0] : null };
}

// Siki bicim (yalniz belirsizlikte): isaret etiketleri silinir, \$ gercek dolar, bosluk tek; harf ve noktalama korunur.
function strictText(text) {
  return String(text ?? "").replace(/<\/?[iu]>/g, "").replace(/\\\$/g, "$").replace(/\s+/gu, " ").trim();
}

/**
 * Bir yilin MUR sira kontrolu (saf islev).
 * @param {{ year: number, expected: number, extraction: { ok: boolean, problems: unknown[], questions?: object[] },
 *   ours: object[], key: Record<string, string> }} input
 */
export function compareYear({ year, expected, extraction, ours, key }) {
  const base = {
    year,
    expected,
    extraction: { ok: Boolean(extraction?.ok), questions: extraction?.questions?.length ?? 0, problems: extraction?.problems ?? [] },
    pairing: null,
    matched: null,
    mismatched: null,
    unverifiable: null,
    ratio: null,
    verified: null,
    coverage: null,
    verdict: "inconclusive",
    reason: null,
    mismatchNumbers: [],
    mismatchDetail: [],
    unverifiableNumbers: [],
    unverifiableDetail: [],
  };
  if (!extraction?.ok) return { ...base, reason: "MUR cikarimi basarisiz (extract_text.py --layout mur-legacy sorun verdi); karsilastirma yapilmadi" };
  const numbers = extraction.questions.map((q) => q.number);
  const want = Array.from({ length: expected }, (_, i) => i + 1);
  if (numbers.length !== expected || numbers.some((n, i) => n !== want[i])) {
    const missingNumbers = want.filter((n) => !numbers.includes(n));
    return {
      ...base,
      extraction: { ...base.extraction, ok: false, missingNumbers },
      reason: `MUR cikarimi ${numbers.length}/${expected} soru (eksik: ${missingNumbers.join(", ") || "-"}); karsilastirma yapilmadi`,
    };
  }
  const pairing = pairQuestions(extraction.questions, ours);
  const murByNumber = new Map(extraction.questions.map((q) => [q.number, q]));
  const oursByNumber = new Map(ours.map((q) => [q.number, q]));
  const counts = { match: 0, mismatch: 0, unverifiable: 0 };
  const mismatchDetail = [];
  const unverifiableDetail = [];
  let sameChoiceSet = 0;
  for (const pair of pairing.pairs) {
    const m = murByNumber.get(pair.mur);
    const o = oursByNumber.get(pair.ours);
    const letter = key[String(pair.ours)];
    const verdict = judge(m, o, letter);
    counts[verdict.result] += 1;
    if (choiceMultiset(m) === choiceMultiset(o)) sameChoiceSet += 1;
    if (verdict.result === "mismatch") mismatchDetail.push({ number: pair.ours, murNumber: pair.mur, key: letter, murAIs: verdict.murAIs });
    if (verdict.result === "unverifiable") unverifiableDetail.push({ number: pair.ours, murNumber: pair.mur, why: verdict.why });
  }
  const verified = counts.match + counts.mismatch;
  const ratio = verified > 0 ? Math.round((counts.match / verified) * 10000) / 10000 : null;
  const verdict = verdictOf(counts.match, counts.mismatch);
  let reason = null;
  if (verified === 0) reason = "dogrulanabilir soru yok";
  else if (verdict === "inconclusive") reason = `oran %${(ratio * 100).toFixed(1)} < %${THRESHOLD_PERCENT}: MUR surumu "hep A" degil ya da duzen farkli`;
  return {
    ...base,
    pairing: {
      byNumber: pairing.byNumber,
      byText: pairing.byText,
      unpairedNumbers: pairing.unpairedNumbers,
      unpairedMurNumbers: pairing.unpairedMurNumbers,
      ambiguousMurNumbers: pairing.ambiguousMurNumbers,
      shortStemMurNumbers: pairing.shortStemMurNumbers,
      sameChoiceSet,
    },
    matched: counts.match,
    mismatched: counts.mismatch,
    unverifiable: counts.unverifiable,
    ratio,
    verified,
    coverage: Math.round((verified / expected) * 10000) / 10000,
    verdict,
    reason,
    mismatchNumbers: mismatchDetail.map((d) => d.number),
    mismatchDetail,
    unverifiableNumbers: unverifiableDetail.map((d) => d.number),
    unverifiableDetail,
  };
}

// Tek MUR kagidini mur-legacy duzeniyle cikarir. Eski cikti once silinir (basarisiz cikarimdan sonra okunmasin). Sorun
// satirlari (extract_text.py "SORUN {...}") yalniz numara ve hata kodu tasir.
function extractMur(year, expected) {
  const pdf = verifiedSourcePath(year, "mur");
  const out = join(EXTRACT_MUR_DIR, `${year}.json`);
  mkdirSync(EXTRACT_MUR_DIR, { recursive: true });
  rmSync(out, { force: true });
  const args = ["-I", EXTRACT_PY, "--layout", "mur-legacy", "--source", pdf, "--years", String(year), "--expected", String(expected), "--out", out];
  const run = spawnSync(PYTHON, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (run.error) throw run.error;
  const problems = String(run.stdout)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("SORUN "))
    .map((line) => {
      try {
        const { number = null, error } = JSON.parse(line.slice(6));
        return { number, error };
      } catch {
        return { number: null, error: line.slice(6) };
      }
    });
  if (run.status !== 0 || !existsSync(out)) {
    if (problems.length === 0) problems.push({ number: null, error: `extract_text.py cikis ${run.status}: ${String(run.stderr).trim().split("\n").pop()}` });
    return { ok: false, problems };
  }
  return { ok: true, problems: [], questions: readJson(out).questions };
}

function main(argv) {
  const years = parseYears(argValue(argv, "--years"), MUR_ORDER_YEARS);
  const inputs = years.map((year) => {
    const oursPath = join(EXTRACT_DIR, `${year}.json`);
    const keyPath = join(KEYS_DIR, `${year}.cambridge.json`);
    if (!existsSync(oursPath)) throw new Error(`${year}: ${oursPath} yok (once extract_text.py --layout cambridge)`);
    if (!existsSync(keyPath)) throw new Error(`${year}: ${keyPath} yok (once extract-keys.mjs --source cambridge)`);
    return { year, ours: readJson(oursPath).questions, key: readJson(keyPath) };
  });
  const report = existsSync(MUR_ORDER_REPORT_PATH) ? readJson(MUR_ORDER_REPORT_PATH) : { years: {} };
  for (const { year, ours, key } of inputs) {
    const expected = expectedQuestions(year);
    const extraction = extractMur(year, expected);
    const entry = compareYear({ year, expected, extraction, ours, key });
    report.years[year] = { ...entry, comparedAt: new Date().toISOString() };
    if (!entry.pairing) {
      const where = entry.extraction.problems.map((p) => (p.number === null ? p.error : `soru ${p.number}: ${p.error}`));
      console.log(`${year}: inconclusive (${entry.reason})${where.length ? `\n  ${where.join("\n  ")}` : ""}`);
      continue;
    }
    const p = entry.pairing;
    const pct = entry.ratio === null ? "-" : `%${(entry.ratio * 100).toFixed(1)}`;
    console.log(
      `${year}: ${entry.verdict} ${pct} (eslesme numara ${p.byNumber} + metin ${p.byText}, eslesmeyen ${p.unpairedNumbers.length}; ` +
        `match ${entry.matched}, mismatch ${entry.mismatched}, unverifiable ${entry.unverifiable})` +
        (entry.mismatchNumbers.length ? ` mismatch: ${entry.mismatchDetail.map((d) => `${d.number} (anahtar ${d.key}, MUR A = ${d.murAIs ?? "?"})`).join(", ")}` : "") +
        (p.unpairedNumbers.length ? ` eslesmeyen: ${p.unpairedNumbers.join(", ")}` : ""),
    );
  }
  report.updatedAt = new Date().toISOString();
  report.threshold = THRESHOLD;
  report.rule =
    "MUR A sikki (normalize) == bizim kagitta Cambridge anahtarinin gosterdigi sik (normalize); oran = match/(match+mismatch); " +
    ">= %95 confirmed, aksi inconclusive; yer tutucu/bos/belirsiz = unverifiable; eslesme numara, sonra kok metni (ilk 80 karakter)";
  report.years = Object.fromEntries(Object.entries(report.years).sort(([a], [b]) => Number(a) - Number(b)));
  writeJson(MUR_ORDER_REPORT_PATH, report);
  console.log(`Yazildi: ${MUR_ORDER_REPORT_PATH}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
