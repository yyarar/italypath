// IMAT cevap anahtari kaynaklarini indirir (plan 2026-10-08, Gorev 14). Liste tek kaynaktan gelir:
// docs/superpowers/specs/assets/2026-10-08-imat-answer-key-sources.md (yil tablosu). Locomotive ve ehabona
// listede yok (zayif kaynak, ana oturum karari 2026-10-09).
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/download-keys.mjs --list
//       Indirilecek dosyalari tablo halinde basar ve keys/sources/download-list.json'a yazar (Kerem'e gosterilir).
//   ... node scripts/imat/download-keys.mjs --download
//       YALNIZ Kerem'in acik "indir" sozunden sonra. Kod listesi download-list.json ile ayni olmali (gosterilen
//       liste = indirilen liste). curl -L --fail --max-time 120; 5xx ve gecici ag hatasinda 3 kez daha dener
//       (bekleme artar). Dosyalar yalniz keys/sources/ altina yazilir; sha256, bayt, URL ve indirme zamani
//       keys/sources/manifest.json'a. sha256'si manifestle tutan dosya atlanir (tekrar calistirmak guvenli).
//
// Indirilen dosyalar guvenilmeyen veridir: calistirilmaz, import edilmez; yalniz extract-keys.mjs pdfplumber ile
// (/usr/bin/python3 -I) okur. Cikis 0: tamam; 1: en az bir dosya inmedi ya da liste onaylanan listeyle farkli.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { INVENTORY_PATH, KEYS_DIR, readJson, writeJson } from "./paths.mjs";

export const SOURCES_DIR = join(KEYS_DIR, "sources");
export const MANIFEST_PATH = join(SOURCES_DIR, "manifest.json");
export const LIST_PATH = join(SOURCES_DIR, "download-list.json");
export const SOURCE_RECORD = "docs/superpowers/specs/assets/2026-10-08-imat-answer-key-sources.md";

// Cevap anahtari okunan kaynaklar (extract-keys.mjs). "mur" ve "cambridge-form-paper" kagittir. "cambridge-form"
// yalniz 2021: Cambridge'in kendi 2021 dizilimi; yerel 2021 kagidi MUR surumudur (hep A), bu anahtar ona uygulanmaz.
export const KEY_SOURCES = Object.freeze(["cambridge", "cambridge-old", "medschool", "cambridge-form"]);
// Anahtar cikarilan yillar (extract-keys.mjs); 2011-2020 capraz kontrol compare-keys.mjs'te.
export const KEY_YEARS = Object.freeze([2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021]);

// Cambridge orijinali (Wayback, ham dosya). Boyutlar kayittaki yaklasik KB degeridir.
const CAMBRIDGE_KEYS = Object.freeze({
  2011: ["https://web.archive.org/web/20210904020044id_/https://www.admissionstesting.org/Images/234519-imat-specimen-answers.pdf", 38],
  2012: ["https://web.archive.org/web/20210904020941id_/https://www.admissionstesting.org/Images/234520-imat-specimen-answers.pdf", 58],
  2013: ["https://web.archive.org/web/20220328221434id_/https://www.admissionstesting.org/Images/234521-imat-specimen-answers.pdf", 38],
  2014: ["https://web.archive.org/web/20210904020245id_/https://www.admissionstesting.org/Images/234522-imat-specimen-answers.pdf", 38],
  2015: ["https://web.archive.org/web/20210904030212id_/https://www.admissionstesting.org/Images/311138-imat-specimen-paper-asnwer-key.pdf", 34],
  2016: ["https://web.archive.org/web/20210904022123id_/https://www.admissionstesting.org/Images/370031-imat-specimen-paper-asnwer-key.pdf", 33],
  2017: ["https://web.archive.org/web/20211023190724id_/https://www.admissionstesting.org/Images/462134-imat-past-paper-answer-key-2017.pdf", 10],
  2018: ["https://web.archive.org/web/20210904023809id_/https://www.admissionstesting.org/Images/539382-imat-past-paper-answer-key-2018.pdf", 166],
  2019: ["https://web.archive.org/web/20210904020327id_/https://www.admissionstesting.org/Images/580263-imat-past-paper-2019-answer-key.pdf", 95],
  2020: ["https://web.archive.org/web/20220524054312id_/https://www.admissionstesting.org/Images/619472-imat-past-paper-2020-answer-key.pdf", 70],
});
// 2012 ayni adresin eski surumu (2018-05 anlik goruntusu); yeni surumle karsilastirilir, fark Kerem'e.
const CAMBRIDGE_2012_OLD = Object.freeze([
  "https://web.archive.org/web/20180516201335id_/http://www.admissionstesting.org:80/images/234520-imat-specimen-answers.pdf",
  38,
]);
// medschool.it Wayback kopyasi (kayit: Cambridge dosyasiyla bayt bayt ayni; 2012 = yeni surum).
const MEDSCHOOL_TIMESTAMPS = Object.freeze({
  2011: "20250504033718",
  2012: "20250504064805",
  2013: "20250504031744",
  2014: "20250504073723",
  2015: "20250504031920",
  2016: "20250504033924",
  2017: "20250504044208",
  2018: "20250504052237",
  2019: "20250504140030",
  2020: "20250505160808",
});
// Cambridge 2021 kendi kagidi + anahtari ("cambridge-form"; yerel 2021 dosyasi MUR surumu; yalniz metin eslemesiyle
// capraz kontrol).
const CAMBRIDGE_2021 = Object.freeze({
  paper: ["https://web.archive.org/web/20220929205913id_/https://www.admissionstesting.org/Images/654635-imat-past-paper-2021.pdf", null],
  key: ["https://web.archive.org/web/20220929215620id_/https://www.admissionstesting.org/Images/654636-imat-past-paper-2021-answer-key.pdf", 92],
});

function entry(year, source, url, expectedKB, note) {
  return { year, source, file: `${year}-${source}.pdf`, url, expectedKB, note };
}

// Indirme listesi (33 dosya): 2011-2020 yil sirasiyla cambridge, cambridge-old (2012), medschool, mur; sonra 2021
// cambridge-form (anahtar) ve cambridge-form-paper (kagit).
export function buildDownloadList() {
  const list = [];
  for (let year = 2011; year <= 2020; year += 1) {
    const [url, kb] = CAMBRIDGE_KEYS[year];
    list.push(entry(year, "cambridge", url, kb, year === 2012 ? "Cambridge anahtari, yeni surum (esas)" : "Cambridge anahtari"));
    if (year === 2012) list.push(entry(year, "cambridge-old", CAMBRIDGE_2012_OLD[0], CAMBRIDGE_2012_OLD[1], "Cambridge anahtari, eski surum (2018)"));
    const medschool = `https://web.archive.org/web/${MEDSCHOOL_TIMESTAMPS[year]}id_/https://medschool.it/wp-content/uploads/2022/02/IMAT-${year}-past-paper-solutions.pdf`;
    list.push(entry(year, "medschool", medschool, kb, "medschool.it kopyasi (kayit: Cambridge ile ayni)"));
    list.push(entry(year, "mur", `https://accessoprogrammato.mur.gov.it/compiti/CompitoInglese${year}.pdf`, null, "MUR kagidi (sira kontrolu Gorev 15)"));
  }
  list.push(entry(2021, "cambridge-form", CAMBRIDGE_2021.key[0], CAMBRIDGE_2021.key[1], "Cambridge 2021 anahtari (Cambridge dizilimi; yerel MUR 2021 kagidina uygulanmaz)"));
  list.push(entry(2021, "cambridge-form-paper", CAMBRIDGE_2021.paper[0], CAMBRIDGE_2021.paper[1], "Cambridge 2021 kagidi (Cambridge dizilimi)"));
  return list;
}

// Kod listesi Kerem'e gosterilen listeyle (download-list.json) ayni mi: ayni dosyalar, ayni sirada, ayni URL.
export function listMatchesApproved(list, approved) {
  const files = approved?.files;
  if (!Array.isArray(files) || files.length !== list.length) return false;
  return list.every((item, i) => files[i]?.file === item.file && files[i]?.url === item.url);
}

// curl sonucu tekrar denenir mi: HTTP 5xx (Wayback 503) ya da gecici ag hatasi (baglanti, zaman asimi, bos yanit).
const TRANSIENT_CURL_EXITS = new Set([7, 18, 28, 35, 52, 56]);
export function retryable({ exitCode, httpCode }) {
  if (exitCode === 0) return false;
  if (httpCode >= 500) return true;
  return httpCode === 0 && TRANSIENT_CURL_EXITS.has(exitCode);
}

export function looksLikePdf(buffer) {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

// Diskteki dosya (sha256; yoksa null) manifest kaydiyla ve listedeki URL ile tutuyorsa indirme gerekmez.
export function needsDownload(item, record, currentSha) {
  return !(record && currentSha && record.sha256 === currentSha && record.url === item.url);
}

export function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function readManifest() {
  return existsSync(MANIFEST_PATH) ? readJson(MANIFEST_PATH) : {};
}

// extract-keys.mjs icin: listede olan, inmis ve sha256'si manifestle tutan kaynak dosyanin yolu.
export function verifiedSourcePath(year, source) {
  const item = buildDownloadList().find((e) => e.year === year && e.source === source);
  if (!item) throw new Error(`${year}-${source}: indirme listesinde yok`);
  const path = join(SOURCES_DIR, item.file);
  if (!existsSync(path)) throw new Error(`${item.file}: inmemis (once --download, Kerem onayiyla)`);
  const record = readManifest()[item.file];
  if (!record || record.sha256 !== sha256File(path) || record.url !== item.url) {
    throw new Error(`${item.file}: manifest kaydi yok ya da sha256/URL tutmuyor`);
  }
  return path;
}

function sizeText(item, localPaperBytes) {
  if (item.expectedKB !== null) return `~${item.expectedKB} KB`;
  if (item.source === "mur" && localPaperBytes[item.year]) return `kayitta yok (yerel kagit ${(localPaperBytes[item.year] / 1e6).toFixed(1)} MB)`;
  return "kayitta yok";
}

function localPaperSizes() {
  if (!existsSync(INVENTORY_PATH)) return {};
  return Object.fromEntries(readJson(INVENTORY_PATH).map((e) => [e.year, e.bytes]));
}

function printList(list) {
  const local = localPaperSizes();
  const rows = list.map((item) => [String(item.year), item.source, `keys/sources/${item.file}`, sizeText(item, local), item.url]);
  const head = ["Yil", "Kaynak", "Dosya", "Beklenen boyut", "URL"];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells) => cells.map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i]))).join("  ");
  console.log(line(head));
  console.log(line(widths.map((w) => "-".repeat(w))));
  for (const row of rows) console.log(line(row));
  const known = list.filter((e) => e.expectedKB !== null);
  const unknown = list.filter((e) => e.expectedKB === null);
  const murHint = unknown.filter((e) => e.source === "mur").reduce((sum, e) => sum + (local[e.year] ?? 0), 0);
  console.log(
    `\n${list.length} dosya. Boyutu kayitta olan ${known.length} dosya ~${known.reduce((s, e) => s + e.expectedKB, 0)} KB; ` +
      `kayitta olmayan ${unknown.length} dosya (${unknown.map((e) => e.file).join(", ")}).` +
      (murHint > 0 ? ` MUR icin ipucu: yerel kagitlarin toplami ${(murHint / 1e6).toFixed(1)} MB.` : ""),
  );
}

function runList() {
  const list = buildDownloadList();
  mkdirSync(SOURCES_DIR, { recursive: true });
  printList(list);
  writeJson(LIST_PATH, { listedAt: new Date().toISOString(), sourceRecord: SOURCE_RECORD, files: list });
  console.log(`Yazildi: ${LIST_PATH}`);
}

const MAX_ATTEMPTS = 4; // ilk deneme + 3 tekrar
const RETRY_PAUSE_MS = 15_000; // 15, 30, 45 sn
const BETWEEN_FILES_MS = 3_000; // Wayback'e nazik tempo

function curl(url, out) {
  const run = spawnSync(
    "curl",
    ["-L", "--fail", "--max-time", "120", "--silent", "--show-error", "--proto", "=https", "--proto-redir", "=https", "-o", out, "-w", "%{http_code}", url],
    { encoding: "utf8" },
  );
  if (run.error) throw run.error;
  return { exitCode: run.status ?? -1, httpCode: Number(run.stdout.trim()) || 0, stderr: run.stderr.trim() };
}

async function fetchOne(item) {
  const target = join(SOURCES_DIR, item.file);
  const part = `${target}.part`;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    rmSync(part, { force: true });
    const result = curl(item.url, part);
    if (result.exitCode === 0) {
      const body = readFileSync(part);
      if (!looksLikePdf(body)) {
        rmSync(part, { force: true });
        throw new Error(`PDF degil (ilk baytlar %PDF- degil; HTTP ${result.httpCode})`);
      }
      renameSync(part, target);
      return { bytes: statSync(target).size, sha256: sha256File(target), attempts: attempt };
    }
    rmSync(part, { force: true });
    const reason = `curl cikis ${result.exitCode}, HTTP ${result.httpCode}${result.stderr ? `: ${result.stderr}` : ""}`;
    if (!retryable(result) || attempt === MAX_ATTEMPTS) throw new Error(`${reason} (${attempt}. deneme)`);
    console.log(`  ${item.file}: ${reason}; ${(RETRY_PAUSE_MS * attempt) / 1000} sn sonra tekrar`);
    await sleep(RETRY_PAUSE_MS * attempt);
  }
  throw new Error("ulasilmaz");
}

async function runDownload() {
  const list = buildDownloadList();
  const approved = existsSync(LIST_PATH) ? readJson(LIST_PATH) : null;
  if (!listMatchesApproved(list, approved)) {
    console.error(`Kod listesi ${LIST_PATH} ile ayni degil (ya da yok): once --list, Kerem'e goster, onay al.`);
    process.exit(1);
  }
  mkdirSync(SOURCES_DIR, { recursive: true });
  const manifest = readManifest();
  const counts = { downloaded: 0, skipped: 0, failed: 0 };
  let first = true;
  for (const item of list) {
    const target = join(SOURCES_DIR, item.file);
    const currentSha = existsSync(target) ? sha256File(target) : null;
    if (!needsDownload(item, manifest[item.file], currentSha)) {
      counts.skipped += 1;
      console.log(`atlandi  ${item.file} (sha256 manifestle ayni)`);
      continue;
    }
    if (!first) await sleep(BETWEEN_FILES_MS);
    first = false;
    try {
      const got = await fetchOne(item);
      manifest[item.file] = { year: item.year, source: item.source, url: item.url, bytes: got.bytes, sha256: got.sha256, fetchedAt: new Date().toISOString() };
      writeJson(MANIFEST_PATH, manifest);
      counts.downloaded += 1;
      const ratio = item.expectedKB ? got.bytes / 1024 / item.expectedKB : null;
      const sizeNote = ratio !== null && (ratio < 0.5 || ratio > 2) ? `  UYARI: beklenen ~${item.expectedKB} KB` : "";
      console.log(`indi     ${item.file} ${got.bytes} bayt sha256 ${got.sha256.slice(0, 12)}… (${got.attempts}. deneme)${sizeNote}`);
    } catch (error) {
      counts.failed += 1;
      console.error(`HATA     ${item.file}: ${error.message}`);
    }
  }
  console.log(`\nIndi ${counts.downloaded}, atlandi ${counts.skipped}, inmedi ${counts.failed} (toplam ${list.length}). Manifest: ${MANIFEST_PATH}`);
  if (counts.failed > 0) process.exit(1);
}

async function main(argv) {
  if (argv.includes("--list")) return runList();
  if (argv.includes("--download")) return runDownload();
  console.error("Kullanim: node scripts/imat/download-keys.mjs --list | --download");
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(2);
  });
}
