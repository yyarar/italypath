// MUR sira kontrolunun cevrimdisi testi (plan 2026-10-08, Gorev 15b): compare-mur-order.mjs saf islevleri (metin
// normallestirme, soru eslesmesi, A sikki karsilastirmasi, %95 esigi, cikarimi basarisiz yil). Ag, PDF ve veritabani yok;
// fikstur sorulari uydurmadir (hicbir kagittan parca yok: ada, fener, kavanoz adlari).
//
//   PATH=/usr/local/bin:$PATH node scripts/imat/test-mur-order.mjs   (npm run test:imat-mur-order)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { THRESHOLD, compareYear, isPlaceholder, normalizeText, pairQuestions, stemKey, verdictOf } from "./compare-mur-order.mjs";

const HERE = import.meta.dirname;
const LETTERS = ["A", "B", "C", "D", "E"];
const q = (number, prompt, choices) => ({ number, prompt, choices: Object.fromEntries(LETTERS.map((l, i) => [l, choices[i]])) });
// MUR "hep A" kopyasi: dogru sik (anahtar harfi) A'ya, kalanlar kendi sirasiyla B-E'ye.
const allA = (question, letter, number = question.number) => {
  const right = question.choices[letter];
  const rest = LETTERS.filter((l) => l !== letter).map((l) => question.choices[l]);
  return q(number, question.prompt, [right, ...rest]);
};
// Uydurma kagit: n soru, her soru kendine ozgu kok ve sik metni tasir; anahtar n -> LETTERS[(n * 3) % 5].
const invented = (count) => Array.from({ length: count }, (_, i) => {
  const n = i + 1;
  return q(n, `Lantern keeper number ${n} counts the jars on island ${n * 7} before the tide turns.`, LETTERS.map((l) => `jar ${n}${l.toLowerCase()} on shelf ${l}`));
});
const keyOf = (count) => Object.fromEntries(Array.from({ length: count }, (_, i) => [String(i + 1), LETTERS[((i + 1) * 3) % 5]]));
const okExtraction = (questions) => ({ ok: true, problems: [], questions });

// --- normallestirme: kucuk harf, isaret etiketleri, noktalama, bosluk; kok anahtari ilk 80 karakter ------------------
{
  assert.equal(normalizeText("  The <i>Copper</i>  Lantern,\n\nlit  at dusk!  "), "the copper lantern lit at dusk");
  assert.equal(normalizeText("Costs \\$5 – or (maybe) “ten”?"), "costs $5 or maybe ten", "\\$ gercek dolar; tire, parantez, tirnak noktalama");
  assert.equal(normalizeText("x × y ≤ z"), "x × y ≤ z", "matematik isaretleri noktalama degil, kalir");
  assert.equal(normalizeText(null), "");
  const long = "Word ".repeat(40);
  assert.equal(stemKey(long).length, 80);
  assert.equal(stemKey(long), normalizeText(long).slice(0, 80));
  assert.equal(stemKey("Which jar, of these, is red?"), stemKey("which jar of these   is red"));
  assert.equal(isPlaceholder("�"), true, "yalin etiket (goruntu sikki)");
  assert.equal(isPlaceholder("12 � 4"), true, "eslenmeyen glif tasiyan sik da karsilastirilamaz");
  assert.equal(isPlaceholder("  ...  "), true, "noktalamadan ibaret sik bos sayilir");
  assert.equal(isPlaceholder(""), true);
  assert.equal(isPlaceholder("jar 3"), false);
}

// --- eslesme: once numara, numara tutmazsa kok metni (yil icinde); belirsiz kok eslesmez -----------------------------
{
  const ours = invented(6);
  const same = pairQuestions(ours.map((x) => ({ ...x })), ours);
  assert.equal(same.byNumber, 6);
  assert.equal(same.byText, 0);
  assert.deepEqual(same.pairs.map((p) => [p.ours, p.mur, p.by]), [1, 2, 3, 4, 5, 6].map((n) => [n, n, "number"]));

  // MUR sirasi farkli: 1 ve 2 yer degistirmis, 6 numarasi 4'te; 3 kok farkli (bicim farki), 5 ayni yerde.
  const mur = [
    { ...ours[1], number: 1 },
    { ...ours[0], number: 2 },
    { ...ours[2], prompt: "An entirely different question about a lighthouse keeper and her map." },
    { ...ours[5], number: 4 },
    { ...ours[4] },
    { ...ours[3], number: 6 },
  ];
  const shuffled = pairQuestions(mur, ours);
  assert.equal(shuffled.byNumber, 1, "yalniz 5 numarayla");
  assert.equal(shuffled.byText, 4, "1, 2, 4, 6 kok metniyle");
  assert.deepEqual(shuffled.pairs.map((p) => [p.ours, p.mur, p.by]), [[1, 2, "text"], [2, 1, "text"], [4, 6, "text"], [5, 5, "number"], [6, 4, "text"]]);
  assert.deepEqual(shuffled.unpairedNumbers, [3], "bizim kagitta eslesmeyen soru");
  assert.deepEqual(shuffled.unpairedMurNumbers, [3], "MUR kagidinda eslesmeyen soru");
  assert.deepEqual(shuffled.ambiguousMurNumbers, []);

  // Ilk 80 karakteri ayni iki soru: bu kok ikisini de tanimlamaz. Ne numarayla ne metinle eslesir (tahmin yok); ayni
  // numaradaki ayni kok bile (MUR 2 / bizim 2) eslesme sayilmaz, cunku numara sirasi kagitlar arasinda degisebilir.
  const twin = "Which one of the following statements about the invented harbour of Quellmore is correct overall?";
  const ours2 = [q(1, twin + " (first)", LETTERS), q(2, twin + " (second)", LETTERS), q(3, "Pick the lantern.", LETTERS)];
  const mur2 = [q(1, "Pick the lantern.", LETTERS), q(2, twin + " (second)", LETTERS), q(3, twin + " (first)", LETTERS)];
  const amb = pairQuestions(mur2, ours2);
  assert.deepEqual(amb.pairs.map((p) => [p.ours, p.mur, p.by]), [[3, 1, "text"]]);
  assert.deepEqual(amb.unpairedNumbers, [1, 2]);
  assert.deepEqual(amb.unpairedMurNumbers, [2, 3]);
  assert.deepEqual(amb.ambiguousMurNumbers, [2, 3], "kok kagitlardan birinde birden cok soruda");
  const ours3 = [q(1, twin + " (first)", LETTERS), q(2, twin + " (second)", LETTERS)];
  const mur3 = [q(1, twin + " (second)", LETTERS), q(2, twin + " (first)", LETTERS)];
  const amb3 = pairQuestions(mur3, ours3);
  assert.deepEqual(amb3.pairs, [], "numara ve kok tutsa da kok tek degil: eslesme yok");
  assert.deepEqual(amb3.ambiguousMurNumbers, [1, 2]);
  assert.deepEqual(amb3.unpairedNumbers, [1, 2]);
}

// --- karsilastirma: match, mismatch, unverifiable (yer tutucu iki tarafta, bos), belirsiz normallestirme ------------
{
  const ours = invented(8);
  const key = keyOf(8);
  const mur = ours.map((x) => allA(x, key[x.number]));
  // 2: MUR'un A'si bizim anahtarin gosterdigi degil, baska bir sik (gercek uyusmazlik).
  const wrong = LETTERS.find((l) => l !== key[2]);
  mur[1] = allA(ours[1], wrong);
  // 3: MUR A sikki goruntu (U+FFFD); 4: bizim anahtarli sik goruntu; 5: MUR A bos.
  mur[2] = { ...mur[2], choices: { ...mur[2].choices, A: "�" } };
  const ours4 = { ...ours[3], choices: { ...ours[3].choices, [key[4]]: "�" } };
  mur[4] = { ...mur[4], choices: { ...mur[4].choices, A: "" } };
  // 6: MUR A metni bizim hicbir sikkimiza esit degil (bicim farki).
  mur[5] = { ...mur[5], choices: { ...mur[5].choices, A: "a different jar altogether" } };
  // 7: bizim iki sikkimiz birebir ayni metin (bizim cikarimda bicim farki kaybolmus): A metni anahtarliyla esit ama tek degil.
  const twinLetter = LETTERS.find((l) => l !== key[7]);
  const ours7 = { ...ours[6], choices: { ...ours[6].choices, [key[7]]: "jar 7", [twinLetter]: "jar 7" } };
  mur[6] = allA(ours7, key[7]);
  const oursAll = [...ours.slice(0, 3), ours4, ...ours.slice(4, 6), ours7, ours[7]];
  const entry = compareYear({ year: 2099, expected: 8, extraction: okExtraction(mur), ours: oursAll, key });
  assert.equal(entry.matched, 2, "1 ve 8");
  assert.equal(entry.mismatched, 2, "2 ve 6");
  assert.equal(entry.unverifiable, 4, "3, 4, 5, 7");
  assert.deepEqual(entry.mismatchNumbers, [2, 6]);
  assert.deepEqual(entry.unverifiableNumbers, [3, 4, 5, 7]);
  assert.deepEqual(entry.mismatchDetail, [
    { number: 2, murNumber: 2, key: key[2], murAIs: wrong },
    { number: 6, murNumber: 6, key: key[6], murAIs: null },
  ], "MUR A'nin bizim kagitta hangi sikka denk geldigi (yalniz harf)");
  assert.deepEqual(entry.unverifiableDetail.map((d) => [d.number, d.why]), [[3, "mur-placeholder"], [4, "ours-placeholder"], [5, "mur-placeholder"], [7, "ambiguous"]]);
  assert.equal(entry.ratio, 0.5);
  assert.equal(entry.verdict, "inconclusive");
  assert.equal(entry.pairing.byNumber, 8);
  // Rapor yalniz sayi ve harf tasir: fikstur metninden hicbir kelime gecmez.
  const json = JSON.stringify(entry);
  for (const word of ["Lantern", "jar", "island", "tide", "altogether"]) assert.ok(!json.includes(word), `raporda metin var: ${word}`);
}

// --- belirsiz normallestirme siki karsilastirmayla cozulur: isaret (tire) ve buyuk/kucuk harf farki --------------------
{
  // Noktalama silinince "-3" ve "3", kucuk harfe cevirince "Aa" ve "aa" ayni olur. Birden cok aday kalirsa siki bicim
  // (isaret etiketi ve bosluk disinda dokunulmaz) karar verir; siki bicimde de tek aday yoksa unverifiable.
  const ours = [
    q(1, "Which reading did the cold lantern give?", ["-3 marks", "3 marks", "7 marks", "9 marks", "11 marks"]),
    q(2, "Which reading did the warm lantern give?", ["-3 marks", "3 marks", "7 marks", "9 marks", "11 marks"]),
    q(3, "Which pair of seeds was planted?", ["Gg", "gg", "GG", "Hh", "hh"]),
    q(4, "Which reading did the third lantern give?", ["–4 marks", "4 marks", "8 marks", "6 marks", "12 marks"]),
  ];
  const key = { 1: "A", 2: "A", 3: "B", 4: "B" };
  const mur = [
    q(1, ours[0].prompt, ["-3 marks", "3 marks", "7 marks", "9 marks", "11 marks"]),
    q(2, ours[1].prompt, ["3 marks", "-3 marks", "7 marks", "9 marks", "11 marks"]),
    q(3, ours[2].prompt, ["gg", "Gg", "GG", "Hh", "hh"]),
    q(4, ours[3].prompt, ["4 marks.", "–4 marks", "8 marks", "6 marks", "12 marks"]),
  ];
  const entry = compareYear({ year: 2099, expected: 4, extraction: okExtraction(mur), ours, key });
  assert.deepEqual([entry.matched, entry.mismatched, entry.unverifiable], [2, 1, 1]);
  assert.deepEqual(entry.mismatchDetail, [{ number: 2, murNumber: 2, key: "A", murAIs: "B" }], "isaretsiz 3, anahtar -3 diyor: uyusmazlik (eslesme sanilmaz)");
  assert.deepEqual(entry.unverifiableDetail.map((d) => [d.number, d.why]), [[4, "ambiguous"]], "siki bicimde aday yok: karar verilmez");
}

// --- numara + metin eslesmesi karsilastirmaya tasinir: MUR sirasi farkli kagitta anahtar dogrulanir ----------------
{
  const ours = invented(5);
  const key = keyOf(5);
  const mur = [allA(ours[2], key[3], 1), allA(ours[0], key[1], 2), allA(ours[1], key[2], 3), allA(ours[4], key[5], 4), allA(ours[3], key[4], 5)];
  const entry = compareYear({ year: 2099, expected: 5, extraction: okExtraction(mur), ours, key });
  assert.equal(entry.pairing.byNumber, 0);
  assert.equal(entry.pairing.byText, 5);
  assert.equal(entry.matched, 5);
  assert.equal(entry.verdict, "confirmed");
  assert.deepEqual(entry.mismatchNumbers, []);
  // Eslesmeyen soru karsilastirmaya girmez ve oranda yoktur; numarasi listelenir.
  const broken = [...mur.slice(0, 4), { ...mur[4], prompt: "A wholly unrelated prompt about orchards." }];
  const partial = compareYear({ year: 2099, expected: 5, extraction: okExtraction(broken), ours, key });
  assert.equal(partial.matched, 4);
  assert.equal(partial.unverifiable, 0);
  assert.deepEqual(partial.pairing.unpairedNumbers, [4]);
  assert.deepEqual(partial.pairing.unpairedMurNumbers, [5]);
  assert.equal(partial.ratio, 1);
  assert.equal(partial.verdict, "confirmed");
}

// --- %95 esigi: 19/20 confirmed (sinirda), 18/19 inconclusive; hic dogrulanabilir soru yoksa inconclusive ------------
{
  assert.equal(THRESHOLD, 0.95);
  assert.equal(verdictOf(19, 1), "confirmed", "tam %95 esikte");
  assert.equal(verdictOf(18, 1), "inconclusive", "%94.7");
  assert.equal(verdictOf(57, 3), "confirmed", "57/60 = %95");
  assert.equal(verdictOf(56, 3), "inconclusive", "56/59 = %94.9");
  assert.equal(verdictOf(0, 0), "inconclusive", "dogrulanabilir soru yok");
  const ours = invented(20);
  const key = keyOf(20);
  const mur = ours.map((x) => allA(x, key[x.number]));
  mur[9] = allA(ours[9], LETTERS.find((l) => l !== key[10]));
  const edge = compareYear({ year: 2099, expected: 20, extraction: okExtraction(mur), ours, key });
  assert.equal(edge.matched, 19);
  assert.equal(edge.mismatched, 1);
  assert.equal(edge.ratio, 0.95);
  assert.equal(edge.verdict, "confirmed");
  assert.deepEqual(edge.mismatchNumbers, [10], "confirmed yilda uyusmayan numara cozucu kapisina listelenir");
  mur[10] = allA(ours[10], LETTERS.find((l) => l !== key[11]));
  const below = compareYear({ year: 2099, expected: 20, extraction: okExtraction(mur), ours, key });
  assert.equal(below.ratio, 0.9);
  assert.equal(below.verdict, "inconclusive");
  assert.match(below.reason, /%95/);
  const none = compareYear({ year: 2099, expected: 2, extraction: okExtraction([q(1, "Only an image here.", ["�", "�", "�", "�", "�"]), q(2, "Another image.", ["�", "�", "�", "�", "�"])]), ours: [q(1, "Only an image here.", LETTERS), q(2, "Another image.", LETTERS)], key: { 1: "A", 2: "B" } });
  assert.equal(none.ratio, null);
  assert.equal(none.verdict, "inconclusive");
}

// --- cikarimi basarisiz yil: inconclusive + neden; sayim eksikse de karsilastirma yapilmaz ---------------------------
{
  const ours = invented(4);
  const key = keyOf(4);
  const failed = compareYear({ year: 2099, expected: 4, extraction: { ok: false, problems: [{ number: 3, error: "4 sik bulundu" }] }, ours, key });
  assert.equal(failed.verdict, "inconclusive");
  assert.match(failed.reason, /cikarim/);
  assert.equal(failed.extraction.ok, false);
  assert.deepEqual(failed.extraction.problems, [{ number: 3, error: "4 sik bulundu" }]);
  assert.equal(failed.matched, null);
  assert.equal(failed.ratio, null);
  assert.deepEqual(failed.mismatchNumbers, []);
  // Cikarim "basarili" dese bile soru sayisi beklenen degilse (eksik numara) yil inconclusive; dolgu yapilmaz.
  const short = compareYear({ year: 2099, expected: 4, extraction: okExtraction([1, 2, 4].map((n) => allA(ours[n - 1], key[n]))), ours, key });
  assert.equal(short.verdict, "inconclusive");
  assert.match(short.reason, /3\/4/);
  assert.deepEqual(short.extraction.missingNumbers, [3]);
  assert.equal(short.matched, null);
}

// --- CLI: --years zorunlu, izinli yillar 2011-2020 (ag ve dosya yok) ------------------------------------------------
{
  const out = mkdtempSync(join(tmpdir(), "imat-mur-order-test-"));
  try {
    const script = join(HERE, "compare-mur-order.mjs");
    const none = spawnSync(process.execPath, [script], { encoding: "utf8", env: { ...process.env, IMAT_OUT: out } });
    assert.equal(none.status, 2, "--years yoksa cikis 2");
    assert.match(none.stderr, /--years zorunlu/);
    const bad = spawnSync(process.execPath, [script, "--years", "2021"], { encoding: "utf8", env: { ...process.env, IMAT_OUT: out } });
    assert.equal(bad.status, 2, "2021 MUR sira kontrolunde yok");
    assert.match(bad.stderr, /Gecersiz yil: 2021/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

console.log("test:imat-mur-order OK");
