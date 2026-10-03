// Reading and Writing grafik ve tablo gorselleri (plan Gorev 4): extract-keys.json'daki figure kutusu
// anahtar PDF sayfasindan pdftoppm ile kirpilir, sharp ile beyaz zeminli WebP'ye cevrilir.
//
//   PATH=/usr/local/bin:$PATH SAT_BANK_OUT=/Users/keremyarar/italypath-main/tmp/sat-bank/rw node scripts/sat/rw/crop-rw-figures.mjs [--only <id,id>]
//
// Pay: kutunun her yaninda 8 pt, ama extract_rw.py'nin verdigi clip alaninin (ust: "ID" seridinin alti,
// alt: seklin altindaki ilk metin satiri) 1 pt icinde kalir; serit ya da pasaj kirintisi girmez.
// Cikti: <RW_OUT>/figures/<id>.webp (en cok 1400 px genislik, en cok 512 KB) ve figure-crop-report.json.
// Kenar kontrolu: kirpintinin dort kenarindaki 2 piksellik serit tamamen beyaz olmali (degilse hata).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";

import { SOURCE_ROOT, readJson, writeJson } from "../lib.mjs";
import { RW_OUT } from "./paths.mjs";

const DPI = 200;
const MARGIN_PT = 8;
const CLIP_INSET_PT = 1;
const MAX_WIDTH = 1400;
const MAX_BYTES = 512 * 1024;
const QUALITIES = [90, 82, 74, 66];
const EDGE_PX = 2;
const WHITE_MIN = 245;

const onlyArg = process.argv.indexOf("--only");
const only = onlyArg >= 0 ? new Set(process.argv[onlyArg + 1].split(",")) : null;

const inventory = new Map(readJson(join(RW_OUT, "source-inventory.json")).files.map((f) => [f.path.split("/").at(-1), f]));
const records = readJson(join(RW_OUT, "extract-keys.json"))
  .records.filter((r) => r.figure && (!only || only.has(r.id)))
  .sort((a, b) => (a.id < b.id ? -1 : 1));

const outDir = join(RW_OUT, "figures");
mkdirSync(outDir, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "rw-figures-"));

function cropBox(figure) {
  const [bx0, btop, bx1, bbottom] = figure.bbox;
  const [cx0, ctop, cx1, cbottom] = figure.clip;
  return [
    Math.max(bx0 - MARGIN_PT, cx0),
    Math.max(btop - MARGIN_PT, ctop + CLIP_INSET_PT),
    Math.min(bx1 + MARGIN_PT, cx1),
    Math.min(bbottom + MARGIN_PT, cbottom - CLIP_INSET_PT),
  ];
}

async function edgeReport(buffer) {
  // Her kenar icin beyaz olmayan piksel sayisi (dis 2 piksel, tum kanallar >= 245 beyaz sayilir).
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const dark = { top: 0, bottom: 0, left: 0, right: 0 };
  const isWhite = (x, y) => {
    const i = (y * width + x) * channels;
    for (let c = 0; c < channels; c += 1) if (data[i + c] < WHITE_MIN) return false;
    return true;
  };
  for (let x = 0; x < width; x += 1) {
    for (let k = 0; k < EDGE_PX; k += 1) {
      if (!isWhite(x, k)) dark.top += 1;
      if (!isWhite(x, height - 1 - k)) dark.bottom += 1;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let k = 0; k < EDGE_PX; k += 1) {
      if (!isWhite(k, y)) dark.left += 1;
      if (!isWhite(width - 1 - k, y)) dark.right += 1;
    }
  }
  return dark;
}

const results = [];
const problems = [];
try {
  for (const r of records) {
    const entry = inventory.get(r.source_file);
    const [x0, top, x1, bottom] = cropBox(r.figure);
    const scale = DPI / 72;
    const px = [Math.floor(x0 * scale), Math.floor(top * scale), Math.ceil(x1 * scale), Math.ceil(bottom * scale)];
    const prefix = join(work, r.id);
    execFileSync("pdftoppm", [
      "-r", String(DPI), "-f", String(r.figure.page), "-l", String(r.figure.page),
      "-x", String(px[0]), "-y", String(px[1]), "-W", String(px[2] - px[0]), "-H", String(px[3] - px[1]),
      "-png", "-singlefile", join(SOURCE_ROOT, entry.path), prefix,
    ]);
    const png = readFileSync(`${prefix}.png`);
    const base = sharp(png).flatten({ background: "#ffffff" }).resize({ width: MAX_WIDTH, withoutEnlargement: true });
    let webp = null;
    let quality = null;
    for (const q of QUALITIES) {
      webp = await base.clone().webp({ quality: q, effort: 6 }).toBuffer();
      quality = q;
      if (webp.length <= MAX_BYTES) break;
    }
    const outPath = join(outDir, `${r.id}.webp`);
    await sharp(webp).toFile(outPath);
    const meta = await sharp(outPath).metadata();
    const edges = await edgeReport(webp);
    const result = {
      id: r.id,
      kind: r.figure.kind,
      source_file: r.source_file,
      page: r.figure.page,
      bbox: r.figure.bbox,
      crop_pt: [x0, top, x1, bottom].map((v) => Math.round(v * 100) / 100),
      dpi: DPI,
      width: meta.width,
      height: meta.height,
      format: meta.format,
      bytes: statSync(outPath).size,
      quality,
      nonWhiteEdgePixels: edges,
    };
    results.push(result);
    if (meta.format !== "webp") problems.push(`${r.id}: bicim ${meta.format}`);
    if (result.bytes > MAX_BYTES) problems.push(`${r.id}: ${result.bytes} bayt > 512 KB`);
    if (meta.width > MAX_WIDTH) problems.push(`${r.id}: genislik ${meta.width}`);
    const darkSides = Object.entries(edges).filter(([, n]) => n > 0).map(([side, n]) => `${side} ${n}`);
    if (darkSides.length > 0) problems.push(`${r.id}: beyaz olmayan kenar (${darkSides.join(", ")})`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

const byKind = results.reduce((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] ?? 0) + 1 }), {});
writeJson(join(RW_OUT, "figure-crop-report.json"), {
  ok: problems.length === 0,
  settings: { dpi: DPI, marginPt: MARGIN_PT, clipInsetPt: CLIP_INSET_PT, maxWidth: MAX_WIDTH, maxBytes: MAX_BYTES, edgePx: EDGE_PX, whiteMin: WHITE_MIN },
  counts: { figures: results.length, ...byKind, maxBytes: Math.max(0, ...results.map((r) => r.bytes)) },
  problems,
  figures: results,
});
console.log(`${results.length} gorsel (${JSON.stringify(byKind)}), en buyuk ${Math.max(0, ...results.map((r) => r.bytes))} bayt -> ${outDir}`);
for (const message of problems) console.log(`  SORUN ${message}`);
if (problems.length > 0) process.exitCode = 1;
