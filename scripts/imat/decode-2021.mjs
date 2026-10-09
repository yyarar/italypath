// IMAT 2021 metin katmani cozumu (plan Gorev 15). Yerel 2021 kagidinin (inventory.json: textLayer "broken") metin katmani
// glif numarasi tasir: pdfplumber "(cid:N)" verir, N + 29 ASCII kod noktasidir (pdftotext ciktisinda ":" -> "W" kaydirmasi;
// bosluk ve satir sonu dokunulmaz). Cozum extract_text.py icinde karakter duzeyinde yapilir (--decode-shift 29): satirlar
// kurulmadan once her glif kaydirilir, boylece yazi tipi bilgisi (italik isareti, kalin sik harfi) korunur. ASCII disi glifler
// extract_text.py DECODE_EXTRA tablosundan (her giris sayfa goruntusuyle dogrulandi); tabloda olmayan glif eslenmez ve soru
// goruntuden yazima gider.
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/decode-2021.mjs --check
//     -> vision/2021/decode-check.json: sabit tohumla secilmis 20 cozulmus satir + ASCII disi her karakter icin en cok iki
//        ornek satir; her satirda sayfa, pages/2021/p-NN.png yolu, PDF noktasi kutusu ve 200 dpi piksel kutusu. accepted: null.
//        Kabul karari ana oturumundur: satirlar sayfa goruntusuyle karsilastirilir, dosyaya accepted true/false ve note yazilir.
//        Ayni orneklem yeniden uretilirse var olan accepted/note korunur; orneklem degisirse null'a doner.
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/decode-2021.mjs --extract
//     -> extract_text.py --layout cambridge --decode-shift 29 --years 2021 (extract/2021.json). Yalniz accepted true ise calisir;
//        false: 2021 tamamen goruntuden yazilir (Gorev 16); null: once ana oturum kabulu (cikarma yapilmaz).
//
// Satir metni sinav icerigidir: yalniz IMAT_OUT altina (Git disi) yazilir, ekrana basilmaz.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PAGE_DPI, VISION_DIR, pagePath, readJson, writeJson } from "./paths.mjs";

const YEAR = 2021;
const SHIFT = 29;
const SAMPLE_SIZE = 20;
const PER_CHAR_EXAMPLES = 2;
const SEED = "imat-2021-decode-check";
const PYTHON = "/usr/bin/python3";
const EXTRACT_PY = join(dirname(fileURLToPath(import.meta.url)), "extract_text.py");
const CHECK_PATH = join(VISION_DIR, String(YEAR), "decode-check.json");

// Sabit tohumlu sozde rastgele sayi (mulberry32); ayni girdi ayni orneklemi verir.
function seededRandom(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runExtract(args, { capture }) {
  const run = spawnSync(PYTHON, [EXTRACT_PY, "--layout", "cambridge", "--decode-shift", String(SHIFT), ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (run.error) throw run.error;
  if (run.status !== 0) {
    const tail = capture ? `: ${String(run.stderr).trim().split("\n").pop()}` : "";
    throw new Error(`extract_text.py cikis ${run.status}${tail}`);
  }
  return run.stdout;
}

function locate(row) {
  const k = PAGE_DPI / 72;
  const image = pagePath(YEAR, row.page);
  if (!existsSync(image)) throw new Error(`sayfa goruntusu yok: ${image} (once render-pages.mjs --years ${YEAR})`);
  return {
    page: row.page,
    image,
    box: [row.x0, row.top, row.x1, row.bottom],
    pixelBox: [Math.floor(row.x0 * k) - 4, Math.floor(row.top * k) - 4, Math.ceil(row.x1 * k) + 4, Math.ceil(row.bottom * k) + 4],
    text: row.text,
  };
}

function check() {
  const rows = JSON.parse(runExtract(["--rows", String(YEAR)], { capture: true }));
  const candidates = rows.filter((row) => row.text.replace(/\s/gu, "").length >= 3);
  if (candidates.length < SAMPLE_SIZE) throw new Error(`yalniz ${candidates.length} satir var`);
  const random = seededRandom(SEED);
  const picked = new Set();
  while (picked.size < SAMPLE_SIZE) picked.add(Math.floor(random() * candidates.length));
  const sample = [...picked].sort((a, b) => a - b).map((i) => locate(candidates[i]));
  const nonAscii = new Map();
  for (const row of candidates) {
    for (const char of new Set(row.text)) {
      if (char.codePointAt(0) < 128) continue;
      const list = nonAscii.get(char) ?? [];
      if (list.length < PER_CHAR_EXAMPLES) list.push(locate(row));
      nonAscii.set(char, list);
    }
  }
  const nonAsciiExamples = [...nonAscii.entries()]
    .sort(([a], [b]) => a.codePointAt(0) - b.codePointAt(0))
    .map(([char, examples]) => ({ char, codePoint: `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`, examples }));
  let accepted = null;
  let note = "";
  if (existsSync(CHECK_PATH)) {
    const previous = readJson(CHECK_PATH);
    if (JSON.stringify(previous.sample) === JSON.stringify(sample)) {
      accepted = previous.accepted ?? null;
      note = previous.note ?? "";
    }
  }
  mkdirSync(dirname(CHECK_PATH), { recursive: true });
  writeJson(CHECK_PATH, {
    year: YEAR,
    shift: SHIFT,
    seed: SEED,
    instructions:
      "Her satirin text alanini image dosyasinda pixelBox bolgesiyle karsilastir (200 dpi). Ust/alt simgeler Unicode yazilir " +
      "(10\u207b\u2077), sekil ve formul goruntuleri metinde yoktur. Hepsi birebir ise accepted: true, degilse accepted: false ve " +
      "note'a farkli satirlar. nonAsciiExamples: kaydirma disi tablodan gelen her karakterin ornekleri.",
    accepted,
    note,
    rowCount: rows.length,
    sample,
    nonAsciiExamples,
  });
  console.log(`${CHECK_PATH}: ${sample.length} orneklem satiri, ${nonAsciiExamples.length} ASCII disi karakter, accepted ${accepted}`);
}

function extract() {
  if (!existsSync(CHECK_PATH)) throw new Error(`once --check (${CHECK_PATH} yok)`);
  const { accepted } = readJson(CHECK_PATH);
  if (accepted === false) throw new Error("decode-check reddedildi: 2021 tamamen goruntuden yazilir (Gorev 16); cikarma yapilmadi");
  if (accepted !== true) {
    throw new Error(`decode-check kabul bekliyor (accepted ${JSON.stringify(accepted ?? null)}): ana oturum orneklemi sayfa goruntusuyle karsilastirip accepted: true yazmadan cikarma yapilmaz`);
  }
  runExtract(["--years", String(YEAR)], { capture: false });
  console.log("decode-check kabul edildi.");
}

function main(argv) {
  if (argv.includes("--check")) return check();
  if (argv.includes("--extract")) return extract();
  throw new Error("--check ya da --extract");
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
