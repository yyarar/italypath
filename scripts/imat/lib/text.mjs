// IMAT metin yardimcilari (plan Gorev 10). merge-vision.mjs (iki gecis karsilastirmasi, textHint hizalamasi) ve
// validate-bank.mjs (text_hash, kapi 4 kaynak karsilastirmasi) ayni kurallari kullanir.
//
// Karakter akisi (charStream): bosluklar atilir; her karakter kelime sirasini tasir (rapor yalniz konum verir, metin
// vermez). Belgelenmis normallestirmeler: bitisik harf glifleri harflere acilir (ff, fi, ...), yumusak tire silinir,
// Unicode ust/alt simge rakam ve isaretleri ASCII'ye doner (cikarici kucuk puntoyu simgeye cevirir, pdftotext duz
// verir), eksi isareti (U+2212) kisa tireye esitlenir. Sozlesme metninde `<u>`/`<i>` silinir, `\$` gercek dolardir.
import { createHash } from "node:crypto";

import { splitMathText, stripMarks } from "../../../lib/sat/mathSegments.mjs";

export const CHOICE_LETTERS = Object.freeze(["A", "B", "C", "D", "E"]);

// sha256(prompt + "\n" + A..E "\n" ile) ilk 12 hex; bankadaki son metin uzerinden (Gorev 11 kapisi ayni kurali kullanir).
export function textHash(prompt, choices) {
  const body = [String(prompt ?? ""), ...CHOICE_LETTERS.map((letter) => String(choices?.[letter] ?? ""))].join("\n");
  return createHash("sha256").update(body).digest("hex").slice(0, 12);
}

// Iki goruntuden yazim gecisinin karsilastirma bicimi: isaretler silinir, her bosluk dizisi tek bosluk, bas/son kirpilir.
export function normalizeForCompare(text) {
  return stripMarks(String(text ?? "")).replace(/\s+/gu, " ").trim();
}

const LIGATURES = { "\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi", "\ufb04": "ffl" };
const SUPSUB_FROM = "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207a\u207b\u207d\u207e\u207c\u207f\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089\u208a\u208b\u208d\u208e\u208c";
const SUPSUB_TO = "0123456789+-()=n0123456789+-()=";
const MARK_TAG = /<\/?[ui]>/g;
const REPLACEMENT = "\ufffd";
// Formul ogesi (charStream math: "token"); hicbir metin karakterine esit degildir.
export const MATH_TOKEN = Object.freeze({ math: true });

function normalizedChars(value) {
  const expanded = String(value).replace(/[\ufb00-\ufb04]/g, (c) => LIGATURES[c]).replace(/\u00ad/g, "");
  return [...expanded].map((c) => {
    const index = SUPSUB_FROM.indexOf(c);
    if (index >= 0) return SUPSUB_TO[index];
    return c === "\u2212" ? "-" : c;
  });
}

// math: "drop" formul atlanir (kelime sirasi yine ilerler) | "token" formul tek MATH_TOKEN | "plain" metin oldugu gibi
// (ham metin katmani ya da pdftotext; `$` formul sayilmaz). Donus { chars, words }: words[i] = chars[i]'nin kelime sirasi.
export function charStream(text, { math = "drop" } = {}) {
  const chars = [];
  const words = [];
  let word = -1;
  let inWord = false;
  const pushText = (value) => {
    for (const c of normalizedChars(value)) {
      if (/\s/u.test(c)) {
        inWord = false;
        continue;
      }
      if (!inWord) {
        word += 1;
        inWord = true;
      }
      chars.push(c);
      words.push(word);
    }
  };
  if (math === "plain") {
    pushText(text);
    return { chars, words };
  }
  for (const segment of splitMathText(String(text ?? ""))) {
    if (segment.kind === "text") {
      pushText(segment.value.replace(MARK_TAG, ""));
      continue;
    }
    word += 1;
    inWord = false;
    if (math === "token") {
      chars.push(MATH_TOKEN);
      words.push(word);
    }
  }
  return { chars, words };
}

// Goruntuden yazim metni (formul `$...$`) ile metin katmani ipucunu hizalar. Formul ogesi ipucunun herhangi bir
// ardisik parcasini (bozuk kesir, eksik isaret) bedelsiz yutar; ipucundaki U+FFFD bedelsiz duser ya da tek karaktere
// esitlenir. Geri kalan her fark bir bedeldir: yazimda olup ipucunda olmayan karakter (degismis/eklenmis kelime) ya da
// ipucunda olup yazimda olmayan karakter (dusmus kelime). Donus { ok, visionWords, hintWords } (0 tabanli kelime sirasi).
export function alignToHint(visionText, hintText) {
  const v = charStream(visionText, { math: "token" });
  const h = charStream(hintText, { math: "plain" });
  const n = v.chars.length;
  const m = h.chars.length;
  const width = m + 1;
  const cost = new Uint32Array((n + 1) * width);
  const move = new Uint8Array((n + 1) * width); // 1 capraz, 2 yazim karakteri atlanir, 3 ipucu karakteri atlanir
  for (let j = 1; j <= m; j += 1) {
    cost[j] = cost[j - 1] + (h.chars[j - 1] === REPLACEMENT ? 0 : 1);
    move[j] = 3;
  }
  for (let i = 1; i <= n; i += 1) {
    const vc = v.chars[i - 1];
    const isMath = vc === MATH_TOKEN;
    const row = i * width;
    const prev = (i - 1) * width;
    cost[row] = cost[prev] + (isMath ? 0 : 1);
    move[row] = 2;
    for (let j = 1; j <= m; j += 1) {
      const hc = h.chars[j - 1];
      let best = Infinity;
      let step = 0;
      if (!isMath && (vc === hc || hc === REPLACEMENT)) {
        best = cost[prev + j - 1];
        step = 1;
      }
      const left = cost[row + j - 1] + (isMath || hc === REPLACEMENT ? 0 : 1);
      if (left < best) {
        best = left;
        step = 3;
      }
      const up = cost[prev + j] + (isMath ? 0 : 1);
      if (up < best) {
        best = up;
        step = 2;
      }
      cost[row + j] = best;
      move[row + j] = step;
    }
  }
  const visionWords = new Set();
  const hintWords = new Set();
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const step = move[i * width + j];
    if (step === 1) {
      i -= 1;
      j -= 1;
    } else if (step === 2) {
      if (v.chars[i - 1] !== MATH_TOKEN) visionWords.add(v.words[i - 1]);
      i -= 1;
    } else {
      const hc = h.chars[j - 1];
      const absorbed = i > 0 && v.chars[i - 1] === MATH_TOKEN;
      if (!absorbed && hc !== REPLACEMENT) hintWords.add(h.words[j - 1]);
      j -= 1;
    }
  }
  const sorted = (set) => [...set].sort((a, b) => a - b);
  return { ok: cost[n * width + m] === 0, visionWords: sorted(visionWords), hintWords: sorted(hintWords) };
}

// Kapi 4: parcalar ([{ field, text }], sozlesme metni; formul atlanir) bosluksuz olarak kaynak sayfa metninde
// (pdftotext -layout) ardisik geciyor mu. Gecmiyorsa ilk eslesmeyen karakterin alani ve alan icindeki kelime sirasi.
export function locateInSource(parts, sourceText) {
  const chars = [];
  const where = [];
  for (const { field, text } of parts) {
    const stream = charStream(text, { math: "drop" });
    stream.chars.forEach((c, index) => {
      chars.push(c);
      where.push({ field, word: stream.words[index] });
    });
  }
  const needle = chars.join("");
  const source = charStream(sourceText, { math: "plain" }).chars.join("");
  if (source.includes(needle)) return { ok: true, chars: needle.length };
  let lo = 0;
  let hi = needle.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (source.includes(needle.slice(0, mid))) lo = mid;
    else hi = mid - 1;
  }
  const at = where[lo] ?? { field: parts.at(-1)?.field ?? "prompt", word: -1 };
  return { ok: false, chars: needle.length, matched: lo, field: at.field, word: at.word };
}

// ------------------------------------------------------------------ kapi 4, Cambridge dizilimi (2011-2022)
// Cambridge kagitlarinda sik harfi yalindir ve pdftotext -layout satir sirasi cikaricinin satir sirasindan farkli olabilir
// (2011 ortali sik harfi, sutunlar). Karsilastirma sira bagimsizdir: soru metni + 5 sik (harf yalin) parcalara ayrilir ve
// sorunun kaynak bolgesindeki (pdftotext, bbox) parcalarla coklu kume olarak iki yonde karsilastirilir.
// Parca: harf dizisi, rakam dizisi ya da tek isaret; bosluk ve harf/rakam siniri ayirir (ust simge pdftotext'te ayri
// satira duser: cm³ -> "cm" "3"). Formul (`$...$`) atlanir. charStream normallestirmelerine ek olarak kisa tire (U+2013)
// "-" sayilir: cikarici simge icindeki kisa tireyi eksi simgesine cevirir (ASCII'de "-"), pdftotext kisa tire verir.

// Parcalar: [{ token, word }] (word: metindeki kelime sirasi, 0 tabanli; rapor yalniz konum verir).
export function textTokens(text, { math = "drop" } = {}) {
  const { chars, words } = charStream(String(text ?? "").replace(/–/g, "-"), { math });
  const out = [];
  let current = "";
  let kind = null;
  let word = -1;
  let start = -1;
  const flush = () => {
    if (current) out.push({ token: current, word: start });
    current = "";
    kind = null;
  };
  chars.forEach((c, index) => {
    if (c === MATH_TOKEN) {
      flush();
      return;
    }
    if (words[index] !== word) {
      flush();
      word = words[index];
    }
    const k = /\p{L}/u.test(c) ? "letter" : /\p{N}/u.test(c) ? "digit" : "mark";
    if (k !== kind || k === "mark") flush();
    if (!current) start = word;
    current += c;
    kind = k;
  });
  flush();
  return out;
}

// Kaynak metne duzenin karakter eslemesi (extract_text.py CHAR_MAP; cikariciyla ayni).
export function applyCharMap(text, map) {
  if (!map || Object.keys(map).length === 0) return String(text);
  return [...String(text)].map((c) => map[c] ?? c).join("");
}

// Cozulmus metin katmanli yil (2021): pdftotext glif numarasini karakter olarak verir; extract_text.py make_decoder ile ayni
// kural: numara + kaydirma 32..126 ise ASCII, degilse DECODE_EXTRA (extra: { "<numara>": metin }), tabloda yoksa oldugu gibi.
// Bosluk karakterleri (pdftotext'in duzen boslugu, satir ve sayfa sonu) cozulmez.
export function decodeShifted(text, shift, extra = {}) {
  return [...String(text)]
    .map((c) => {
      if (/\s/u.test(c)) return c;
      const n = c.codePointAt(0);
      if (n + shift >= 32 && n + shift <= 126) return String.fromCharCode(n + shift);
      return extra[String(n)] ?? c;
    })
    .join("");
}

// Cozulmus yilda pdftotext'in geri veremedigi karakterler: glif numarasi bir bosluk kod noktasina (sekme, satir sonu,
// dikey sekme, sayfa sonu, satir basi, bosluk) denk gelen glifler pdftotext ciktisinda duzen boslugundan ayirt edilemez
// (kaydirma 29: & ' ( ) * =). Bu parcalar iki taraftan da karsilastirma disi birakilir.
export function unrecoverableChars(shift) {
  const out = [];
  for (let n = 0; n < 127; n += 1) {
    if (/\s/u.test(String.fromCharCode(n)) && n + shift >= 32 && n + shift <= 126) out.push(String.fromCharCode(n + shift));
  }
  return out;
}

// parts: [{ field, text }] (sozlesme metni); source: sorunun kaynak bolgesi (pdftotext, esleme sonrasi). extra: kaynakta
// olup metinde olmasi gerekmeyen parcalar (soru numarasi). exclude: karsilastirma disi parcalar.
// Donus { ok, spacingOnly, tokens, excluded, missing: [{ field, word }], dropped }: missing = metinde olup kaynakta (o kadar kez)
// olmayan parca (yanlis/fazla metin), dropped = kaynakta olup metinde olmayan parca sayisi (dusmus metin).
// Yalniz bosluk farki (pdftotext harfleri bitisik verir: "P Q R S" -> "PQRS", ya da kelimeyi boler): iki taraftaki artik
// parcalar ayni karakterlerden olusur ve her artik parca karsi tarafin bosluksuz metninde ardisik gecer -> ok, spacingOnly.
export function compareTokens(parts, source, { extra = [], exclude = [] } = {}) {
  const skip = new Set(exclude);
  const ours = [];
  let excluded = 0;
  for (const { field, text } of parts) {
    for (const { token, word } of textTokens(text, { math: "drop" })) {
      if (skip.has(token)) excluded += 1;
      else ours.push({ token, field, word });
    }
  }
  const theirs = textTokens(source, { math: "plain" }).map(({ token }) => token).filter((token) => !skip.has(token));
  const available = new Map();
  for (const token of theirs) available.set(token, (available.get(token) ?? 0) + 1);
  const missing = [];
  for (const item of ours) {
    const left = available.get(item.token) ?? 0;
    if (left > 0) available.set(item.token, left - 1);
    else missing.push(item);
  }
  const wanted = new Map();
  for (const token of [...ours.map((item) => item.token), ...extra.map(String)]) wanted.set(token, (wanted.get(token) ?? 0) + 1);
  const dropped = [];
  for (const token of theirs) {
    const left = wanted.get(token) ?? 0;
    if (left > 0) wanted.set(token, left - 1);
    else dropped.push(token);
  }
  const base = { tokens: ours.length, excluded, missing: missing.map(({ field, word }) => ({ field, word })), dropped: dropped.length };
  if (missing.length === 0 && dropped.length === 0) return { ok: true, spacingOnly: false, ...base };
  const sorted = (tokens) => [...tokens.join("")].sort().join("");
  const oursStream = ours.map((item) => item.token).join("");
  const theirStream = theirs.join("");
  const spacingOnly =
    missing.length > 0 &&
    dropped.length > 0 &&
    sorted(missing.map((item) => item.token)) === sorted(dropped) &&
    missing.every((item) => theirStream.includes(item.token)) &&
    dropped.every((token) => oursStream.includes(token));
  return { ok: spacingOnly, spacingOnly, ...base };
}
