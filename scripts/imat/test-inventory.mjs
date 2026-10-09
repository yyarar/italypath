// IMAT envanter metin katmani durumu ve extract_text.py yil kapilarinin cevrimdisi testi (plan 2026-10-08, Gorev 16
// hazirligi). 2021 "decoded" (glif numarasi + kod kaydirmasi 29, decode-check kabulu) metin yili gibi islenir; 2023 "broken"
// goruntuden yazilir. Fikstur kaynaklari uydurma baytlardir (PDF degil): kapilar PDF okunmadan once karar verir.
//
//   PATH=/usr/local/bin:$PATH node scripts/imat/test-inventory.mjs   (npm run test:imat-inventory)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BROKEN_TEXT_YEARS, DECODED_TEXT_YEARS, hasTextLayer, textLayerOf } from "./inventory.mjs";

const HERE = import.meta.dirname;
const EXTRACT_PY = join(HERE, "extract_text.py");

// --- envanter kurali ------------------------------------------------------------------------------------------------
{
  assert.deepEqual(textLayerOf(2021), { textLayer: "decoded", decodeShift: 29 }, "2021: cozulmus metin katmani");
  assert.deepEqual(textLayerOf(2023), { textLayer: "broken" }, "2023: goruntuden yazilir");
  assert.deepEqual(textLayerOf(2022), { textLayer: "ok" });
  assert.deepEqual(textLayerOf(2011), { textLayer: "ok" });
  assert.deepEqual(BROKEN_TEXT_YEARS, [2023]);
  assert.deepEqual(DECODED_TEXT_YEARS, { 2021: 29 });
  assert.equal(hasTextLayer({ textLayer: "ok" }), true);
  assert.equal(hasTextLayer({ textLayer: "decoded", decodeShift: 29 }), true, "cozulmus yil metin yilidir");
  assert.equal(hasTextLayer({ textLayer: "broken" }), false);
  assert.equal(hasTextLayer(undefined), false);
}

// --- extract_text.py: kaydirma envanterden; celisen ya da eksik kaydirma, kabulsuz decode-check, bozuk yil reddedilir --
{
  const root = mkdtempSync(join(tmpdir(), "imat-inventory-test-"));
  try {
    const out = join(root, "out");
    const sources = join(root, "sources");
    mkdirSync(sources, { recursive: true });
    mkdirSync(out, { recursive: true });
    const entry = (year, extra) => {
      const file = `fixture-${year}.pdf`;
      const bytes = Buffer.from(`invented fixture bytes for ${year}\n`);
      writeFileSync(join(sources, file), bytes);
      return { year, file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), pages: 2, expectedQuestions: 60, ...extra };
    };
    const writeInventory = (entries) => writeFileSync(join(out, "inventory.json"), JSON.stringify(entries, null, 2));
    const run = (args) => {
      const r = spawnSync("python3", [EXTRACT_PY, ...args], { encoding: "utf8", env: { ...process.env, IMAT_OUT: out, IMAT_SOURCE_DIR: sources } });
      return { status: r.status, text: `${r.stdout}\n${r.stderr}` };
    };
    const base = [entry(2021, { textLayer: "decoded", decodeShift: 29 }), entry(2022, { textLayer: "ok" }), entry(2023, { textLayer: "broken" })];
    writeInventory(base);

    let r = run(["--layout", "cambridge", "--years", "2021", "--decode-shift", "30"]);
    assert.notEqual(r.status, 0);
    assert.match(r.text, /2021: --decode-shift 30 envanterdeki kaydirmayla \(29\) celisiyor/, "celisen kaydirma reddedilir");

    r = run(["--layout", "cambridge", "--years", "2021"]);
    assert.notEqual(r.status, 0);
    assert.match(r.text, /2021: .*decode-check kabul edilmedi/, "kabulsuz decode-check ile cozulmus yil cikarilmaz");
    mkdirSync(join(out, "vision", "2021"), { recursive: true });
    writeFileSync(join(out, "vision", "2021", "decode-check.json"), JSON.stringify({ accepted: null }));
    r = run(["--layout", "cambridge", "--years", "2021"]);
    assert.match(r.text, /2021: .*decode-check kabul edilmedi \(accepted None\)/, "accepted null yetmez");

    r = run(["--layout", "cambridge", "--years", "2022", "--decode-shift", "29"]);
    assert.notEqual(r.status, 0);
    assert.match(r.text, /--decode-shift yalniz cozulmus metin katmanli yilda/, "saglam yila kaydirma uygulanmaz (toplu calistirmada 2021 disina tasmaz)");

    r = run(["--layout", "mur", "--years", "2023"]);
    assert.notEqual(r.status, 0);
    assert.match(r.text, /2023: metin katmani bozuk/, "bozuk yil goruntuden yazilir");

    writeInventory([entry(2021, { textLayer: "decoded" }), ...base.slice(1)]);
    r = run(["--layout", "cambridge", "--years", "2021"]);
    assert.notEqual(r.status, 0);
    assert.match(r.text, /2021: envanterde decodeShift yok/, "kaydirmasi kayitli olmayan cozulmus yil reddedilir");

    writeInventory([entry(2021, { textLayer: "garbled" }), ...base.slice(1)]);
    r = run(["--layout", "cambridge", "--years", "2021"]);
    assert.notEqual(r.status, 0);
    assert.match(r.text, /2021: bilinmeyen textLayer: garbled/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

console.log("test:imat-inventory OK");
