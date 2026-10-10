// crop-figures.mjs fikstur testi (Gorev 10 duzeltme turu 1): gecici IMAT_OUT'ta beyaz sayfa + siyah dikdortgen; kutu
// dikdortgeni ustten kesiyor. Onaysiz: cikis 1, sekil yazilmaz (eski dosya silinir). Yanlis pageBox ile onay: yine 1.
// Dogru onay: cikis 0 ve diskteki dosya, rapordaki parametrelerle yeniden kurulan tamponla bayt bayt ayni (yeniden
// kodlama olsaydi farkli olurdu). Ag yok.
// Ikinci bolum crop-questions.mjs kirpma duzeltmesi (crop-overrides.json, Gorev 16 araclari): uydurma 15 kaynak PDF
// (lib/fixture-pdf.mjs; envanter pdfinfo ister) + 2011 sayfa goruntusu; duzeltme kutusu sayfaya kistirilir, --numbers
// paketteki girdinin cropBox'ini yeniler, diger girdiler ve result-* dosyalari degismez. merge-vision.mjs eski kirpinti
// korumasi: kirpinti gecis sonucundan yeni ve gecis sekil kutusu tasiyorsa ya da soru crop-overrides.json'da ise yil durur
// (soru numarasi yazilir), diger sekilsiz soruda yalniz uyari; figure cozumu korumayi kaldirir; bayt bayt ayni kirpinti
// yeniden yazilmaz (tarihi degismez).
//
//   PATH=/usr/local/bin:$PATH node scripts/imat/test-crop-figures.mjs   (npm run test:imat-crop)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { MAX_WIDTH, PAD_PX, QUALITIES } from "./crop-figures.mjs";
import { makePdf } from "./lib/fixture-pdf.mjs";
import { PAGE_DPI, SOURCE_FILES, questionId } from "./paths.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "crop-figures.mjs");
const CROP_QUESTIONS = join(HERE, "crop-questions.mjs");
const INVENTORY = join(HERE, "inventory.mjs");
const MERGE = join(HERE, "merge-vision.mjs");
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

  // crop-questions.mjs: crop-overrides.json ve --numbers paket yenilemesi (uydurma 2011 kagidi, sayfa 600x800 px).
  {
    const root = mkdtempSync(join(tmpdir(), "imat-crop-questions-"));
    roots.push(root);
    const env = { ...process.env, IMAT_OUT: root, IMAT_SOURCE_DIR: join(root, "sources") };
    const node = (script, args) => {
      const result = spawnSync(process.execPath, [script, ...args], { env, encoding: "utf8" });
      return { status: result.status, out: `${result.stdout}${result.stderr}` };
    };
    mkdirSync(join(root, "sources"), { recursive: true });
    for (const [year, name] of Object.entries(SOURCE_FILES)) writeFileSync(join(root, "sources", name), makePdf([[{ x: 50, top: 60, text: `fixture paper ${year}` }]]));
    const inventory = node(INVENTORY, []);
    assert.equal(inventory.status, 0, inventory.out);
    const page = join(root, "pages", "2011", "p-01.png");
    mkdirSync(dirname(page), { recursive: true });
    await sharp({ create: { width: 600, height: 800, channels: 3, background: "#ffffff" } }).png().toFile(page);
    const question = (number, bbox, hasImage) => ({
      id: questionId(2011, number),
      number,
      section: "biology",
      page: 1,
      bbox,
      prompt: `Fixture question ${number}?`,
      choices: { A: "one", B: "two", C: "three", D: "four", E: "five" },
      hasImage,
      imageBoxes: [],
    });
    const extractPath = join(root, "extract", "2011.json");
    write(extractPath, { year: 2011, source: "text", questions: [question(1, [20, 20, 120, 60], true), question(2, [20, 100, 120, 140], true), question(3, [20, 160, 120, 180], false)] });
    const px = (pt) => (pt * PAGE_DPI) / 72;
    const boxFor = ([x0, y0, x1, y1]) => [Math.floor(px(x0 - 6)), Math.floor(px(y0 - 6)), Math.ceil(px(x1 + 6)), Math.ceil(px(y1 + 6))];
    const dir = join(root, "vision", "2011");
    const packagePath = join(dir, "package-01-img.json");

    const first = node(CROP_QUESTIONS, ["--years", "2011"]);
    assert.equal(first.status, 0, first.out);
    const before = read(packagePath);
    assert.deepEqual(before.map((entry) => [entry.number, entry.cropBox]), [[1, boxFor([20, 20, 120, 60])], [2, boxFor([20, 100, 120, 140])]]);
    console.log("ok - crop-questions: hasImage paketi, cropBox = bbox + 6 pt");

    // Uydurma gecis sonuclari (iki gecis ayni): soru 1 sekilli, soru 2 sekilsiz, metin ipucuyla ayni. Tarihler: kirpintilar
    // sonuclardan eski (gecisler bu kirpintilari okudu); birlestirme gecer.
    const OLD = new Date("2000-01-01T00:00:00Z");
    const LATER = new Date("2000-01-02T00:00:00Z");
    const passResult = before.map((entry) => ({
      id: entry.id,
      number: entry.number,
      prompt: entry.textHint,
      choices: entry.choicesHint,
      figure: entry.number === 1 ? { kind: "diagram", box: [10, 10, 200, 100] } : null,
      notes: "",
    }));
    const resultPaths = ["a", "b"].map((pass) => join(dir, `result-01-img-${pass}.json`));
    for (const path of resultPaths) write(path, passResult);
    const resultText = readFileSync(resultPaths[0], "utf8");
    for (const number of [1, 2]) utimesSync(join(dir, `q-0${number}.png`), OLD, OLD);
    for (const path of resultPaths) utimesSync(path, LATER, LATER);
    const merged = node(MERGE, ["--years", "2011"]);
    assert.equal(merged.status, 0, merged.out);
    assert.deepEqual(read(extractPath).questions[0].figureBox.cropBox, before[0].cropBox);
    console.log("ok - merge-vision: kirpinti sonuclardan eski, birlestirme gecer");

    // Duzeltme: soru 1'in kutusu sayfanin altina ve sagina tasiyor (sekil kesik) -> sayfaya kistirilir.
    const overridesPath = join(root, "crop-overrides.json");
    write(overridesPath, { [questionId(2011, 1)]: { bbox: [10, 15, 400, 900], note: "fixture: drawn choices continue below the bbox" } });
    const refreshed = node(CROP_QUESTIONS, ["--years", "2011", "--numbers", "1"]);
    assert.equal(refreshed.status, 0, refreshed.out);
    assert.match(refreshed.out, /kirpma duzeltmesi: 1/);
    assert.match(refreshed.out, /package-01-img\.json: 1 girdi yenilendi \(1\)/);
    const clamped = [Math.floor(px(4)), Math.floor(px(9)), 600, 800];
    const after = read(packagePath);
    assert.deepEqual(after[0], { ...before[0], cropBox: clamped }, "soru 1: cropBox duzeltme kutusundan, sayfaya kistirilmis");
    assert.deepEqual(after[1], before[1], "soru 2 degismez");
    const meta = await sharp(join(dir, "q-01.png")).metadata();
    assert.deepEqual([meta.width, meta.height], [clamped[2] - clamped[0], clamped[3] - clamped[1]], "kirpinti cropBox boyutunda");
    assert.equal(readFileSync(resultPaths[0], "utf8"), resultText, "result-* dosyasina dokunulmaz");
    console.log("ok - crop-overrides.json: kutu sayfaya kistirilir, --numbers paket girdisini yeniler, digerleri ayni");

    // Eski kirpinti korumasi: soru 1'in kirpintisi artik sonuclardan yeni -> yil durur, soru numarasi yazilir.
    const extractBefore = readFileSync(extractPath, "utf8");
    const stale = node(MERGE, ["--years", "2011"]);
    assert.equal(stale.status, 1, stale.out);
    assert.match(stale.out, /2011: kirpinti gecis sonucundan yeni, sekil kutusu eski kirpintiyi anlatiyor \(soru 1\)/);
    assert.equal(readFileSync(extractPath, "utf8"), extractBefore, "yil yazilmaz");
    // Yeni kirpintida olculmus figure cozumu korumayi kaldirir.
    write(join(dir, "resolutions.json"), [{ id: questionId(2011, 1), field: "figure", value: { kind: "diagram", box: [20, 30, 500, 700] }, note: "fixture: re-measured on the new crop" }]);
    const resolved = node(MERGE, ["--years", "2011"]);
    assert.equal(resolved.status, 0, resolved.out);
    const q1 = read(extractPath).questions[0];
    assert.deepEqual([q1.figureBox.cropBox, q1.figureBox.box], [clamped, [20, 30, 500, 700]]);
    // Tam yeniden calistirma: degismeyen kirpinti yeniden yazilmaz (tarihi ayni), koruma bosuna tetiklenmez.
    assert.equal(node(CROP_QUESTIONS, ["--years", "2011"]).status, 0);
    assert.equal(statSync(join(dir, "q-02.png")).mtimeMs, OLD.getTime(), "ayni kirpinti yeniden yazilmadi");
    const unchanged = node(MERGE, ["--years", "2011"]);
    assert.equal(unchanged.status, 0, unchanged.out);
    assert.doesNotMatch(unchanged.out, /uyari/);
    // Sekilsiz soru (2): kirpinti sonuclardan yeni -> durmaz, yalniz uyari satiri.
    const now = new Date();
    utimesSync(join(dir, "q-02.png"), now, now);
    const warned = node(MERGE, ["--years", "2011"]);
    assert.equal(warned.status, 0, warned.out);
    assert.match(warned.out, /2011: uyari: kirpinti gecis sonucundan yeni, iki geciste de sekil yok \(soru 2\); metin kullanildi/);
    // Ayni sekilsiz soru crop-overrides.json'da: eski kirpinti sekli kesiyordu, iki gecis de sekli gormemis olabilir -> yil
    // durur (uyari degil); soru numarasi yazilir. Soru 1'in duzeltmesi figure cozumuyle kapali kalir.
    const q1Override = read(overridesPath);
    write(overridesPath, { ...q1Override, [questionId(2011, 2)]: { bbox: [20, 100, 120, 140], note: "fixture: old crop cut the figure" } });
    const overridden = node(MERGE, ["--years", "2011"]);
    assert.equal(overridden.status, 1, overridden.out);
    assert.match(overridden.out, /2011: kirpinti gecis sonucundan yeni, crop-overrides\.json kaydi var, eski kirpinti sekli kesiyordu \(soru 2\)/);
    assert.doesNotMatch(overridden.out, /soru 1[,)]/, "figure cozumu olan soru 1 durdurmaz");
    write(overridesPath, q1Override);
    console.log("ok - merge-vision eski kirpinti korumasi: sekilli ya da duzeltmeli soruda yil durur, sekilsizde uyari, figure cozumu kaldirir, ayni kirpinti tarih degistirmez");

    // --numbers duzeltmesiz soruda da cropBox'i yeniler (bbox degistiyse paket eskimez).
    const extract = read(extractPath);
    extract.questions[1].bbox = [20, 100, 160, 150];
    write(extractPath, extract);
    const second = node(CROP_QUESTIONS, ["--years", "2011", "--numbers", "2"]);
    assert.equal(second.status, 0, second.out);
    assert.deepEqual(read(packagePath).map((entry) => entry.cropBox), [clamped, boxFor([20, 100, 160, 150])]);
    // Pakette olmayan soru: yalniz kirpinti, paket ayni.
    const third = node(CROP_QUESTIONS, ["--years", "2011", "--numbers", "3"]);
    assert.equal(third.status, 0, third.out);
    assert.match(third.out, /pakette yok: 3/);
    assert.deepEqual(read(packagePath).map((entry) => entry.cropBox), [clamped, boxFor([20, 100, 160, 150])]);
    console.log("ok - --numbers duzeltmesiz soruda cropBox yenilenir; pakette olmayan soru paketi degistirmez");

    // Tam paket yazimi da duzeltmeyi uygular.
    const full = node(CROP_QUESTIONS, ["--years", "2011"]);
    assert.equal(full.status, 0, full.out);
    assert.deepEqual(read(packagePath)[0].cropBox, clamped);

    // Gecersiz duzeltme kaydi: cikis 1, kirpinti yazilmaz.
    for (const bad of [{ bbox: [10, 15, 400], note: "x" }, { bbox: [400, 15, 10, 900], note: "x" }, { bbox: [10, 15, 400, 900], note: "" }]) {
      write(overridesPath, { [questionId(2011, 1)]: bad });
      const rejected = node(CROP_QUESTIONS, ["--years", "2011", "--numbers", "1"]);
      assert.equal(rejected.status, 1, rejected.out);
      assert.match(rejected.out, /crop-overrides\.json/);
    }
    // Sayfanin tamamen disinda kalan kutu: cikis 1.
    write(overridesPath, { [questionId(2011, 1)]: { bbox: [300, 400, 500, 600], note: "fixture: off page" } });
    const offPage = node(CROP_QUESTIONS, ["--years", "2011", "--numbers", "1"]);
    assert.equal(offPage.status, 1, offPage.out);
    console.log("ok - gecersiz ya da sayfa disi duzeltme reddedilir");
  }
  console.log("test:imat-crop gecti");
} finally {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}
