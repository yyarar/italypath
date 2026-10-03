// Formatli RW PDF'lerinden soru basina resmi goruntu keser (plan: Gorev 5, ilk madde).
// Her sayfada metin katmaninda "sira  id" satirlari, ayni sirada gomulu JPEG'ler var; sayfa basina
// satir sayisi = resim sayisi dogrulanir, tutmayan sayfa icin sayfa goruntusu kirpilir (slice-math yolu).
// Hedef: formatsiz cevap anahtari PDF'lerindeki 589 id. Cikti: <RW_OUT>/formatted-images/<id>.png + rapor.
// Calistirma: SAT_BANK_OUT=<abs>/tmp/sat-bank/rw node scripts/sat/rw/slice-rw-formatted.mjs
// Test kancasi: RW_FORCE_CROP=1 tum sayfalari kirpma yoluyla keser (yedek yol denemesi icin).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import sharp from "sharp";

import { HEX_ID, listPdfsRecursive, pdftotext, writeJson } from "../lib.mjs";
import { RW_FORMATTED_QUESTIONS_ROOT, RW_KEYS_ROOT, RW_OUT } from "./paths.mjs";

const MAX_WIDTH = 1400;   // bundan genisse kucult (disk)
const CROP_DPI = 150;     // yedek yol: sayfa cozunurlugu
const CROP_PAD_TOP = 14;  // yedek yol: satir numarasinin ustunden basla (point)
const HEADER_NAVY_MIN = 3000; // bu kadar lacivert piksel = resimde baslik seridi var
const ROW_RE = /^\s*(\d+\.\d+)\s+([0-9a-f]{8})\b/gm;
const FORCE_CROP = process.env.RW_FORCE_CROP === "1";

const outDir = join(RW_OUT, "formatted-images");
const reportPath = join(RW_OUT, "formatted-slice-report.json");

// 1) hedef id'ler: anahtar PDF'lerindeki "Question ID xxxxxxxx"
const targets = new Set();
for (const pdf of listPdfsRecursive(RW_KEYS_ROOT)) {
  for (const m of pdftotext(pdf).matchAll(/Question ID ([0-9a-f]{8})/g)) targets.add(m[1]);
}
if (targets.size !== 589) throw new Error(`Hedef sayisi 589 degil: ${targets.size}`);

// temiz cikti klasoru (yeniden calistirma ayni sonucu verir)
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const anomalies = [];
const sources = {};   // id -> { file, page, row } (yalniz yazilanlar)
const perFile = [];
const seen = new Map(); // tum formatli id'ler -> ilk dosya (tekrar tespiti)
let rowsTotal = 0;
let imagesTotal = 0;

// bazi resimlerde orijinal "Question ID" basligi da var (lacivert "ID: xxxxxxxx" seridi); say ve bildir
function navyPixels(raw) {
  let n = 0;
  for (let i = 0; i < raw.length; i += 3) {
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];
    if (r < 50 && g < 60 && b > 70 && b < 130 && b - r > 50) n++;
  }
  return n;
}

async function writePng(input, id) {
  let img = sharp(input);
  const { width } = await img.metadata();
  if (width > MAX_WIDTH) img = img.resize({ width: MAX_WIDTH, kernel: "lanczos3" });
  const png = img.png({ compressionLevel: 9 });
  await png.clone().toFile(join(outDir, `${id}.png`));
  return navyPixels(await img.clone().removeAlpha().raw().toBuffer());
}

// pdfimages -list: sayfa -> [{ num, width, height }] (dosyada sirayla)
function listImages(pdfPath) {
  const lines = execFileSync("pdfimages", ["-list", pdfPath], { encoding: "utf8" }).split("\n").slice(2);
  const byPage = new Map();
  for (const line of lines) {
    const c = line.trim().split(/\s+/);
    if (c.length < 5 || !/^\d+$/.test(c[0])) continue;
    const page = Number(c[0]);
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page).push({ num: Number(c[1]), width: Number(c[3]), height: Number(c[4]) });
  }
  return byPage;
}

// yedek yol: sayfayi PNG'ye cevir, satir numaralarinin y konumuna gore kes
async function cropPage(pdfPath, page, rows, tmp) {
  const xml = execFileSync("pdftotext", ["-bbox", "-f", String(page), "-l", String(page), pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const pageH = Number(xml.match(/<page width="[\d.]+" height="([\d.]+)"/)[1]);
  const words = [...xml.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]+)<\/word>/g)]
    .map((m) => ({ y: Number(m[2]), text: m[5] }));
  const numbers = words.filter((w) => /^\d+\.\d+$/.test(w.text)).sort((a, b) => a.y - b.y);
  const ids = numbers.map((n) => words.find((w) => HEX_ID.test(w.text) && Math.abs(w.y - n.y) < 6)?.text);
  if (numbers.length !== rows.length || ids.some((id, i) => id !== rows[i].id)) return null;

  const prefix = join(tmp, `page-${page}`);
  execFileSync("pdftoppm", ["-png", "-r", String(CROP_DPI), "-f", String(page), "-l", String(page), "-singlefile", pdfPath, prefix]);
  const pagePng = `${prefix}.png`;
  const meta = await sharp(pagePng).metadata();
  const scale = CROP_DPI / 72;
  const out = [];
  for (let i = 0; i < numbers.length; i++) {
    const top = Math.max(0, Math.round((numbers[i].y - CROP_PAD_TOP) * scale));
    const nextY = i + 1 < numbers.length ? numbers[i + 1].y - CROP_PAD_TOP : pageH;
    const bottom = Math.min(meta.height, Math.round(nextY * scale));
    out.push(await sharp(pagePng).extract({ left: 0, top, width: meta.width, height: bottom - top }).png().toBuffer());
  }
  return out;
}

for (const pdfPath of listPdfsRecursive(RW_FORMATTED_QUESTIONS_ROOT)) {
  const file = relative(RW_FORMATTED_QUESTIONS_ROOT, pdfPath);
  const tmp = mkdtempSync(join(tmpdir(), "rw-slice-"));
  try {
    // metin katmani: sayfa (\f ile ayrilir) -> satirlar
    const pages = pdftotext(pdfPath, ["-layout"]).split("\f");
    const rowsByPage = pages.map((text) => [...text.matchAll(ROW_RE)].map((m) => ({ label: m[1], id: m[2] })));
    const imagesByPage = listImages(pdfPath);

    // gomulu JPEG'leri tek seferde cikar (dosya adi: <onek>-<num 3 hane>.<uzanti>)
    execFileSync("pdfimages", ["-all", pdfPath, join(tmp, "img")]);
    const files = new Map(readdirSync(tmp).map((f) => [Number(f.match(/^img-(\d+)\./)?.[1]), f]));

    let rows = 0;
    let images = 0;
    let targetsFound = 0;

    for (let p = 1; p <= pages.length; p++) {
      const pageRows = rowsByPage[p - 1];
      const pageImages = imagesByPage.get(p) ?? [];
      rows += pageRows.length;
      images += pageImages.length;
      if (pageRows.length === 0 && pageImages.length === 0) continue;

      // her satir icin goruntu kaynagi: gomulu JPEG (sira = satir sirasi) ya da sayfa kirpintisi
      let inputs = null;
      if (!FORCE_CROP && pageRows.length === pageImages.length) {
        inputs = pageImages.map((im) => join(tmp, files.get(im.num)));
      } else {
        anomalies.push({
          kind: FORCE_CROP ? "forced-crop" : "rows-images-mismatch",
          file, page: p, rows: pageRows.length, images: pageImages.length,
        });
        inputs = await cropPage(pdfPath, p, pageRows, tmp);
        if (!inputs) {
          anomalies.push({ kind: "crop-failed", file, page: p });
          continue;
        }
      }

      for (let i = 0; i < pageRows.length; i++) {
        const { label, id } = pageRows[i];
        if (seen.has(id)) anomalies.push({ kind: "duplicate-id", id, file, firstSeenIn: seen.get(id) });
        else seen.set(id, file);
        if (!targets.has(id)) continue;
        const navy = await writePng(inputs[i], id);
        if (navy > HEADER_NAVY_MIN) anomalies.push({ kind: "header-in-image", id, file, row: label, navyPixels: navy });
        sources[id] = { file, page: p, row: label };
        targetsFound++;
      }
    }

    rowsTotal += rows;
    imagesTotal += images;
    perFile.push({ file, rows, images, targetsFound });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const missing = [...targets].filter((id) => !sources[id]).sort();
const found = targets.size - missing.length;
writeJson(reportPath, {
  targets: targets.size,
  found,
  missing,
  rowsTotal,
  imagesTotal,
  perFile,
  anomalies,
  sources: Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b))),
});

console.log(`Hedef: ${targets.size}, bulunan: ${found}, eksik: ${missing.length} (${missing.join(", ")})`);
console.log(`Satir: ${rowsTotal}, resim: ${imagesTotal}, dosya: ${perFile.length}, anomali: ${anomalies.length}`);
for (const a of anomalies.slice(0, 15)) console.log("  ANOMALI", JSON.stringify(a));
console.log(`Rapor: ${reportPath}`);
