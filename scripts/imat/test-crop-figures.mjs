// crop-figures.mjs fikstur testi (Gorev 10 duzeltme turu 1): gecici IMAT_OUT'ta beyaz sayfa + siyah dikdortgen; kutu
// dikdortgeni ustten kesiyor. Onaysiz: cikis 1, sekil yazilmaz (eski dosya silinir). Yanlis pageBox ile onay: yine 1.
// Dogru onay: cikis 0 ve diskteki dosya, rapordaki parametrelerle yeniden kurulan tamponla bayt bayt ayni (yeniden
// kodlama olsaydi farkli olurdu). PDF ve ag yok.
//
//   PATH=/usr/local/bin:$PATH node scripts/imat/test-crop-figures.mjs   (npm run test:imat-crop)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { MAX_WIDTH, PAD_PX, QUALITIES } from "./crop-figures.mjs";
import { questionId } from "./paths.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "crop-figures.mjs");
const YEAR = 2023;
const ID = questionId(YEAR, 1);
// Dikdortgen 100..300 x 100..250; kutunun ustu (150) dikdortgenin icinde, 8 pt (22 px) paydan cok yukarida devam ediyor.
const RECT = { left: 100, top: 100, width: 200, height: 150 };
const PAGE_BOX = [80, 150, 320, 280];

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}
const read = (path) => JSON.parse(readFileSync(path, "utf8"));

async function fixture() {
  const root = mkdtempSync(join(tmpdir(), "imat-crop-"));
  const page = join(root, "pages", String(YEAR), "p-01.png");
  mkdirSync(dirname(page), { recursive: true });
  const black = await sharp({ create: { width: RECT.width, height: RECT.height, channels: 3, background: "#000000" } }).png().toBuffer();
  await sharp({ create: { width: 600, height: 400, channels: 3, background: "#ffffff" } })
    .composite([{ input: black, left: RECT.left, top: RECT.top }])
    .png()
    .toFile(page);
  write(join(root, "extract", `${YEAR}.json`), {
    year: YEAR,
    source: "vision",
    questions: [{ id: ID, number: 1, section: "reading-general", page: 1, figureBox: { kind: "diagram", box: PAGE_BOX, space: "page", image: page, page: 1 } }],
  });
  return root;
}

function run(root, extra = []) {
  const result = spawnSync(process.execPath, [SCRIPT, "--years", String(YEAR), ...extra], { env: { ...process.env, IMAT_OUT: root }, encoding: "utf8" });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

// Rapordaki parametrelerle beklenen WebP tamponu (betikle ayni adimlar: kirp, dolgu, en cok 1400 px, WebP kalite).
async function expectedBuffer(root, entry) {
  const [x0, y0, x1, y1] = entry.cropPx;
  const raw = await sharp(join(root, "pages", String(YEAR), "p-01.png"))
    .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pad = (side) => (entry.paddedSides.includes(side) ? PAD_PX : 0);
  const padded = await sharp(raw.data, { raw: raw.info })
    .extend({ top: pad("top"), bottom: pad("bottom"), left: pad("left"), right: pad("right"), background: { r: 255, g: 255, b: 255 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return sharp(padded.data, { raw: padded.info }).resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: entry.quality, effort: 6 }).toBuffer();
}

const roots = [];
try {
  // (a) onaysiz: cikis 1, eski dosya silinir, sekil yazilmaz, rapor written: false
  {
    const root = await fixture();
    roots.push(root);
    const out = join(root, "figures", String(YEAR), `${ID}.webp`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, "eski");
    const result = run(root);
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, /kenar beyaz degil \(sekil kesilmis olabilir\); gorsel kontrol sonrasi edge-signoff\.json'a yaz/);
    assert.ok(result.out.includes(JSON.stringify({ id: ID, side: "top", pageBox: PAGE_BOX })), "onay kaydi ornegi yazilmali");
    assert.ok(!existsSync(out), "onaysiz sekil yazilmamali (eski dosya silinmeli)");
    const [entry] = read(join(root, "figures", "figure-crop-report.json"));
    assert.deepEqual(entry.paddedSides, ["top"]);
    assert.equal(entry.written, false);
    console.log("ok - onaysiz dolgulu kenar: cikis 1, dosya yok");

    // yanlis pageBox ile onay: yine reddedilir
    write(join(root, "figures", "edge-signoff.json"), [{ id: ID, side: "top", pageBox: [80, 151, 320, 280], note: "test" }]);
    const wrongBox = run(root);
    assert.equal(wrongBox.status, 1, wrongBox.out);
    assert.ok(!existsSync(out));
    console.log("ok - baska pageBox ile onay: cikis 1");

    // (b) dogru onay: cikis 0, dosya secilen tamponun kendisi
    write(join(root, "figures", "edge-signoff.json"), [{ id: ID, side: "top", pageBox: PAGE_BOX, note: "test: figure checked" }]);
    const signed = run(root);
    assert.equal(signed.status, 0, signed.out);
    assert.match(signed.out, /edge-signoff\.json onayli/);
    const [okEntry] = read(join(root, "figures", "figure-crop-report.json"));
    assert.equal(okEntry.written, true);
    assert.deepEqual(okEntry.paddedSides, ["top"]);
    assert.ok(QUALITIES.includes(okEntry.quality));
    const file = readFileSync(out);
    assert.equal(file.length, okEntry.bytes, "rapor boyutu dosya boyutu");
    const expected = await expectedBuffer(root, okEntry);
    assert.ok(file.equals(expected), `dosya secilen tampon degil (${file.length} / ${expected.length} bayt)`);
    const reencoded = await sharp(expected).toBuffer();
    assert.ok(!reencoded.equals(expected), "kontrol: yeniden kodlama tamponu degistirir (test ayirt edebiliyor)");
    console.log("ok - onayli dolgulu kenar: cikis 0, dosya = secilen tampon");

    // tekrar (atlama yolu) ve --force ayni dosyayi verir
    assert.equal(run(root).status, 0);
    assert.ok(readFileSync(out).equals(expected));
    assert.equal(run(root, ["--force"]).status, 0);
    assert.ok(readFileSync(out).equals(expected));
    console.log("ok - atlama ve --force ayni dosya");

    // onay kaldirilinca var olan dosya da reddedilir ve silinir
    rmSync(join(root, "figures", "edge-signoff.json"));
    assert.equal(run(root).status, 1);
    assert.ok(!existsSync(out));
    console.log("ok - onay kaldirilinca dosya silinir");
  }
  console.log("test:imat-crop gecti");
} finally {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}
