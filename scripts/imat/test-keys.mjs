// Cevap anahtari betiklerinin cevrimdisi testi (plan 2026-10-08, Gorev 14): indirme listesi kurallari
// (download-keys.mjs), anahtar metni ayristirma (extract-keys.mjs parseKeyText) ve kaynaklar arasi karsilastirma
// (compare-keys.mjs). Ag, PDF ve veritabani yok; fikstur anahtarlari uydurmadir (soru metni yok).
//
//   PATH=/usr/local/bin:$PATH node scripts/imat/test-keys.mjs   (npm run test:imat-keys)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { compareKeys, compareYear } from "./compare-keys.mjs";
import {
  KEY_SOURCES,
  KEY_YEARS,
  buildDownloadList,
  listMatchesApproved,
  looksLikePdf,
  needsDownload,
  retryable,
} from "./download-keys.mjs";
import { parseKeyText } from "./extract-keys.mjs";

const HERE = import.meta.dirname;
const LETTERS = ["A", "B", "C", "D", "E"];
// Uydurma anahtar: soru n -> LETTERS[(n * 3) % 5] (her harf esit sayida).
const letterOf = (n) => LETTERS[(n * 3) % 5];
const fakeKey = (count) => Object.fromEntries(Array.from({ length: count }, (_, i) => [String(i + 1), letterOf(i + 1)]));

// --- Indirme listesi (kontrolcu karari 1: Locomotive/ehabona yok; 2012 iki Cambridge surumu) -----------------
{
  const list = buildDownloadList();
  assert.equal(list.length, 33, "11 Cambridge anahtari + 10 medschool + 10 MUR + 2021 Cambridge dizilimli kagit/anahtar");
  assert.equal(new Set(list.map((e) => e.file)).size, list.length, "dosya adlari benzersiz");
  for (const entry of list) {
    assert.match(entry.file, /^\d{4}-[a-z]+(-[a-z]+)*\.pdf$/, `${entry.file}: duz ad, klasor yok`);
    assert.equal(entry.file, `${entry.year}-${entry.source}.pdf`);
    const url = new URL(entry.url);
    assert.equal(url.protocol, "https:", `${entry.file}: https`);
    assert.ok(["web.archive.org", "accessoprogrammato.mur.gov.it"].includes(url.hostname), `${entry.file}: izinli host`);
    if (url.hostname === "web.archive.org") assert.match(entry.url, /^https:\/\/web\.archive\.org\/web\/\d{14}id_\//, `${entry.file}: Wayback ham dosya (id_)`);
    assert.ok(entry.expectedKB === null || entry.expectedKB > 0);
  }
  assert.ok(!list.some((e) => /locomotive|ehabona/i.test(e.url)), "zayif kaynaklar listede yok");
  for (let year = 2011; year <= 2020; year += 1) {
    const sources = list.filter((e) => e.year === year).map((e) => e.source).sort();
    const expected = year === 2012 ? ["cambridge", "cambridge-old", "medschool", "mur"] : ["cambridge", "medschool", "mur"];
    assert.deepEqual(sources, expected, `${year} kaynaklari`);
    assert.equal(list.find((e) => e.year === year && e.source === "mur").url, `https://accessoprogrammato.mur.gov.it/compiti/CompitoInglese${year}.pdf`);
  }
  // 2021: Cambridge'in kendi dizilimi; yerel 2021 kagidi (MUR, hep A) ile karismasin diye "cambridge-form".
  assert.deepEqual(list.filter((e) => e.year === 2021).map((e) => e.source).sort(), ["cambridge-form", "cambridge-form-paper"]);
  assert.ok(list.find((e) => e.file === "2021-cambridge-form-paper.pdf").url.includes("654635-imat-past-paper-2021.pdf"));
  assert.ok(list.find((e) => e.file === "2021-cambridge-form.pdf").url.includes("654636-imat-past-paper-2021-answer-key.pdf"));
  assert.ok(!list.some((e) => e.file === "2021-cambridge.pdf"), "2021 icin duz cambridge adi yok");
  const old2012 = list.find((e) => e.file === "2012-cambridge-old.pdf");
  assert.ok(old2012.url.startsWith("https://web.archive.org/web/20180516201335id_/"), "2012 eski surum 2018 anlik goruntusu");
  assert.equal(old2012.expectedKB, 38);
  assert.equal(list.find((e) => e.file === "2012-cambridge.pdf").expectedKB, 58);
  assert.equal(list.find((e) => e.file === "2012-medschool.pdf").expectedKB, 58, "medschool 2012 = yeni surum");
  assert.ok(list.filter((e) => e.source === "mur").every((e) => e.expectedKB === null), "MUR boyutu kayitta yok");
  assert.deepEqual(KEY_SOURCES, ["cambridge", "cambridge-old", "medschool", "cambridge-form"], "anahtar okunan kaynaklar (MUR ve kagit degil)");
  assert.deepEqual(KEY_YEARS, [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021]);

  // --download yalniz Kerem'e gosterilen listeyle (download-list.json) ayni kod listesini indirir.
  const approved = { files: list.map((e) => ({ ...e })) };
  assert.equal(listMatchesApproved(list, approved), true);
  assert.equal(listMatchesApproved(list, { files: approved.files.slice(1) }), false, "eksik dosya");
  const changed = { files: approved.files.map((e, i) => (i === 0 ? { ...e, url: e.url.replace("id_", "") } : e)) };
  assert.equal(listMatchesApproved(list, changed), false, "degisen URL");
  assert.equal(listMatchesApproved(list, null), false, "liste yok");
}

// --- Indirme kararlari --------------------------------------------------------------------------------------------
{
  assert.equal(retryable({ exitCode: 22, httpCode: 503 }), true, "Wayback 503 tekrar denenir");
  assert.equal(retryable({ exitCode: 22, httpCode: 502 }), true);
  assert.equal(retryable({ exitCode: 22, httpCode: 404 }), false, "4xx tekrar denenmez");
  assert.equal(retryable({ exitCode: 28, httpCode: 0 }), true, "zaman asimi tekrar denenir");
  assert.equal(retryable({ exitCode: 6, httpCode: 0 }), false, "host cozulemedi: tekrar yok");
  assert.equal(retryable({ exitCode: 0, httpCode: 200 }), false);

  assert.equal(looksLikePdf(Buffer.from("%PDF-1.4\n...")), true);
  assert.equal(looksLikePdf(Buffer.from("<!DOCTYPE html><html>")), false, "Wayback HTML sayfasi PDF degil");
  assert.equal(looksLikePdf(Buffer.alloc(0)), false);

  const entry = { file: "2017-cambridge.pdf", url: "https://web.archive.org/web/20211023190724id_/https://x/y.pdf" };
  const record = { url: entry.url, sha256: "ab".repeat(32), bytes: 10 };
  assert.equal(needsDownload(entry, record, "ab".repeat(32)), false, "ayni sha: atla");
  assert.equal(needsDownload(entry, record, "cd".repeat(32)), true, "dosya degismis");
  assert.equal(needsDownload(entry, record, null), true, "dosya yok");
  assert.equal(needsDownload(entry, undefined, "ab".repeat(32)), true, "manifest kaydi yok");
  assert.equal(needsDownload(entry, { ...record, url: "https://baska" }, "ab".repeat(32)), true, "URL degismis");
}

// --- parseKeyText: satir basina bir kayit, bolum etiketi yok --------------------------------------------------------
{
  const text = ["IMAT 2099 Answer Key", "Question Answer", ...Array.from({ length: 60 }, (_, i) => `${i + 1} ${letterOf(i + 1)}`), "IMAT 2099 © Example Board 2099"].join("\n");
  const parsed = parseKeyText(text, { expected: 60 });
  assert.deepEqual(parsed.problems, []);
  assert.deepEqual(parsed.key, fakeKey(60));
  assert.equal(parsed.sections, null);
}

// --- Iki sutun ("1 A 31 C") ve uc sutun, sayfa sonu karakteri ------------------------------------------------------
{
  const twoCol = Array.from({ length: 30 }, (_, i) => `${i + 1}   ${letterOf(i + 1)}        ${i + 31}   ${letterOf(i + 31)}`);
  const parsed = parseKeyText(["Question Key Question Key", ...twoCol.slice(0, 15), "\f", ...twoCol.slice(15)].join("\n"), { expected: 60 });
  assert.deepEqual(parsed.problems, []);
  assert.deepEqual(parsed.key, fakeKey(60));

  const threeCol = Array.from({ length: 20 }, (_, i) => [i + 1, i + 21, i + 41].map((n) => `${n}. ${letterOf(n)}`).join("   "));
  const parsed3 = parseKeyText(threeCol.join("\n"), { expected: 60 });
  assert.deepEqual(parsed3.problems, []);
  assert.deepEqual(parsed3.key, fakeKey(60));
}

// --- Yazim cesitleri: "1. A", "2) B", "Q3 C", "Question 4: D", "5A" ---------------------------------------------
{
  const lines = ["1. A", "2) B", "Q3 C", "Question 4: D", "5A", "Page 1 of 2"];
  const parsed = parseKeyText(lines.join("\n"), { expected: 5 });
  assert.deepEqual(parsed.problems, []);
  assert.deepEqual(parsed.key, { 1: "A", 2: "B", 3: "C", 4: "D", 5: "A" });
  assert.ok(parsed.warnings.some((w) => w.includes("satir 6")), "eslesmeyen sayi iceren satir uyari olur");
  assert.ok(!parsed.warnings.some((w) => w.includes("Page")), "uyari kaynak metni basmaz (yalniz satir no + sayi)");
}

// --- Bolum etiketli anahtar (22/18/12/8) -------------------------------------------------------------------------
{
  const block = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${from + i} ${letterOf(from + i)}`);
  const text = [
    "Section 1: General Knowledge and Logical Reasoning (Questions 1-22)",
    ...block(1, 22),
    "Biology",
    ...block(23, 40),
    "CHEMISTRY",
    ...block(41, 52),
    "Physics and Mathematics",
    ...block(53, 60),
  ].join("\n");
  const parsed = parseKeyText(text, { expected: 60 });
  assert.deepEqual(parsed.problems, []);
  assert.deepEqual(parsed.key, fakeKey(60));
  assert.deepEqual(parsed.sections, [
    { label: "General Knowledge and Logical Reasoning", from: 1, to: 22 },
    { label: "Biology", from: 23, to: 40 },
    { label: "CHEMISTRY", from: 41, to: 52 },
    { label: "Physics and Mathematics", from: 53, to: 60 },
  ]);
}

// --- Bolum etiketleri sorularin hepsini kapsamiyor: sections yazilmaz, uyari ---------------------------------------
{
  const text = ["1 A", "2 B", "Biology", "3 C", "4 D"].join("\n");
  const parsed = parseKeyText(text, { expected: 4 });
  assert.deepEqual(parsed.problems, []);
  assert.equal(parsed.sections, null);
  assert.ok(parsed.warnings.some((w) => w.includes("bolum")));
}

// --- 80 soruluk yil (2011-2012) --------------------------------------------------------------------------------------
{
  const text = Array.from({ length: 40 }, (_, i) => `${i + 1} ${letterOf(i + 1)} ${i + 41} ${letterOf(i + 41)}`).join("\n");
  const parsed = parseKeyText(text, { expected: 80 });
  assert.deepEqual(parsed.problems, []);
  assert.equal(Object.keys(parsed.key).length, 80);
  assert.equal(parseKeyText(text, { expected: 60 }).problems.length > 0, true, "80 kayit 60 beklenen yilda hata");
}

// --- Eksik kayit, celisen tekrar, aralik disi, bos metin ------------------------------------------------------------
{
  const short = parseKeyText(Array.from({ length: 59 }, (_, i) => `${i + 1} ${letterOf(i + 1)}`).join("\n"), { expected: 60 });
  assert.ok(short.problems.some((p) => p.includes("59") && p.includes("60")), "kayit sayisi 59, beklenen 60");
  assert.ok(short.problems.some((p) => p.includes("eksik") && p.includes("60")));

  const dup = parseKeyText(["1 A", "2 B", "2 C", "3 D"].join("\n"), { expected: 3 });
  assert.ok(dup.problems.some((p) => p.includes("soru 2") && p.includes("B") && p.includes("C")), "celisen tekrar hata");

  const sameDup = parseKeyText(["1 A", "2 B", "2 B", "3 D"].join("\n"), { expected: 3 });
  assert.deepEqual(sameDup.problems, [], "ayni harfle tekrar hata degil");
  assert.ok(sameDup.warnings.some((w) => w.includes("soru 2")));

  const range = parseKeyText(["1 A", "2 B", "61 C"].join("\n"), { expected: 2 });
  assert.ok(range.problems.some((p) => p.includes("61")), "aralik disi numara hata");
  assert.equal(range.key[61], undefined);

  const empty = parseKeyText("   \n\f\n", { expected: 60 });
  assert.ok(empty.problems.some((p) => p.includes("metin")), "metin katmani yok");

  assert.throws(() => parseKeyText("1 A", {}), /expected/);
}

// --- Iki harfli / isaretli / gecersiz cevap: tek harfe indirilmez, hata olur (JSON yazilmaz) ---------------------
{
  // Son ikisi: harften sonra bosluk + harfsiz isaret; yalniz "cift olan satirda artik isaret" kurali yakalar.
  const forms = ["1 A/B", "1 A*", "1 A-B", "1 A (B)", "1 A or B", "1 A, C", "1 a", "1 A *", "1 A (accepted)"];
  for (const form of forms) {
    const parsed = parseKeyText([form, "2 B", "3 C"].join("\n"), { expected: 3 });
    assert.ok(parsed.problems.some((p) => p.startsWith("soru 1")), `"${form}": soru 1 icin hata`);
    assert.equal(parsed.key[1], undefined, `"${form}": soru 1'e harf yazilmaz`);
    assert.equal(parsed.key[2], "B");
    for (const message of [...parsed.problems, ...parsed.warnings]) assert.ok(!message.includes(form), `"${form}": mesaj kaynak satiri basmaz`);
  }
  const notALetter = parseKeyText([...Array.from({ length: 6 }, (_, i) => `${i + 1} ${letterOf(i + 1)}`), "7 F"].join("\n"), { expected: 7 });
  assert.ok(notALetter.problems.some((p) => p.startsWith("soru 7")), "A-E disi harf hata");
  assert.equal(notALetter.key[7], undefined);
  const loose = parseKeyText(["1 A", "2 B", "Version C"].join("\n"), { expected: 2 });
  assert.ok(loose.problems.some((p) => p.includes("satir 3")), "numarasiz serbest cevap harfi de hata");
}

// --- CLI: --year zorunlu, mesaj --year der (ag ve dosya yok) ---------------------------------------------------------
{
  const out = mkdtempSync(join(tmpdir(), "imat-keys-test-"));
  try {
    for (const [script, args] of [["extract-keys.mjs", ["--source", "cambridge"]], ["compare-keys.mjs", []]]) {
      const run = spawnSync(process.execPath, [join(HERE, script), ...args], { encoding: "utf8", env: { ...process.env, IMAT_OUT: out } });
      assert.equal(run.status, 2, `${script}: --year yoksa cikis 2`);
      assert.match(run.stderr, /--year zorunlu/, `${script}: mesaj --year der`);
      assert.doesNotMatch(run.stderr, /--years/, `${script}: --years demez`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

// --- compareKeys --------------------------------------------------------------------------------------------------
{
  const a = fakeKey(60);
  const same = compareKeys({ cambridge: a, medschool: { ...a } });
  assert.deepEqual(same.sources, ["cambridge", "medschool"]);
  assert.equal(same.questions, 60);
  assert.equal(same.agreed, 60);
  assert.deepEqual(same.blocked, []);
  assert.deepEqual(same.disagreements, []);

  const b = { ...a, 7: a[7] === "A" ? "B" : "A", sections: [{ label: "Biology", from: 1, to: 60 }] };
  const diff = compareKeys({ cambridge: a, medschool: b });
  assert.deepEqual(diff.blocked, [7], "farkli harf -> blocked");
  assert.deepEqual(diff.disagreements, [{ number: 7, answers: { cambridge: a[7], medschool: b[7] } }]);
  assert.equal(diff.agreed, 59);

  const missing = { ...a };
  delete missing[60];
  const gap = compareKeys({ cambridge: a, medschool: missing });
  assert.deepEqual(gap.blocked, [60], "bir kaynakta eksik soru -> blocked");
  assert.deepEqual(gap.disagreements[0].answers, { cambridge: a[60], medschool: null });

  const single = compareKeys({ cambridge: a });
  assert.equal(single.sources.length, 1);
  assert.deepEqual(single.blocked, []);
  assert.throws(() => compareKeys({}), /kaynak/);
}

// --- compareYear: 2012 eski surum fark listesi ayri; esas karsilastirma yeni surum + medschool ----------------------
{
  const neu = fakeKey(80);
  const old = { ...neu, 12: neu[12] === "E" ? "D" : "E", 70: neu[70] === "E" ? "D" : "E" };
  const result = compareYear({ "cambridge-old": old, cambridge: neu, medschool: { ...neu } });
  assert.deepEqual(result.sources, ["cambridge", "medschool"], "eski surum blocked hesabina girmez");
  assert.deepEqual(result.blocked, []);
  assert.deepEqual(result.versionDiff.sources, ["cambridge-old", "cambridge"]);
  assert.deepEqual(result.versionDiff.disagreements.map((d) => d.number), [12, 70]);

  const plain = compareYear({ cambridge: fakeKey(60), medschool: fakeKey(60) });
  assert.equal(plain.versionDiff, undefined, "eski surum yoksa versionDiff yok");
  assert.throws(() => compareYear({ medschool: fakeKey(60) }), /cambridge/);
}

console.log("test:imat-keys OK");
