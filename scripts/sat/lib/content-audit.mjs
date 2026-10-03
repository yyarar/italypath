import katex from "katex";

import { MARK_TAGS, mapTextOutsideMath, splitMathText } from "../../../lib/sat/mathSegments.mjs";

// Segmentasyon sozlesmesi components/sat/MathText.tsx ile ayni modulden gelir
// (lib/sat/mathSegments.mjs): `$...$` satir ici, `$$...$$` ayri satirda, `\$` gercek dolar.
export function mathSegments(text) {
  return splitMathText(text)
    .filter((segment) => segment.kind !== "text")
    .map((segment) => segment.value);
}

// Satir sonu yerine harf olarak yazilmis ters egik cizgi + n (STATUS #99, 2026-10-02).
// Formul disindaki metinde LaTeX komutu olmaz; oradaki her `\n` bozuk satir sonudur.
// Formul icindeki `\ne`, `\neq`, `\nu` gibi komutlar ve `\\n` (satir kirmasi + n) kusur degildir.
const LITERAL_NEWLINE_ESCAPE = /(?<!\\)\\n/g;

export function literalNewlineEscapeCount(text) {
  let count = 0;
  mapTextOutsideMath(String(text ?? ""), (part) => {
    count += (part.match(LITERAL_NEWLINE_ESCAPE) ?? []).length;
    return part;
  });
  return count;
}

export function fixLiteralNewlineEscapes(text) {
  return mapTextOutsideMath(String(text ?? ""), (part) => part.replace(LITERAL_NEWLINE_ESCAPE, "\n"));
}

// Govde genelinde guvenli (dogal Ingilizceyle karismayan) marker aileleri.
export const MARKER_FAMILIES = [
  { family: "comma", re: /[0-9a-z)\]] ?comma ?[0-9a-z(\[-]/i },
  { family: "close-glued", re: /close ?[()]|\) ?close|[0-9] ?close\b|close ?(squared|cubed|comma)/i },
  { family: "fraction-speech", re: /fraction ?with ?numerator|anddenominator|endfraction|thefraction/i },
  { family: "function-speech", re: /\bfofx\b|\bgofx\b|\bhofx\b|\bpofc\b/i },
  { family: "power-speech", re: /raised ?to ?the|the ?power ?of|endpower|power ?close|(?<!per\s+second\s*)\bsquared\b|\bcubed\b/i },
  { family: "root-speech", re: /square ?root ?of|cube ?root ?of|endroot|startroot/i },
  { family: "subscript-speech", re: /endsubscript|startsubscript/i },
  { family: "xml-residue", re: /<\/?m[a-z]+[^>]*>|xmlns/i },
  { family: "bad-latex", re: /\\times[a-z]|\\pir\b|\\neqb\b|\\leftbracket|\\rightbracket/i },
];

// $...$ icinde LaTeX komutlari ve \text{...} govdesi ayiklandiktan sonra kalan
// 4+ harfli kelime, konusma-metni artigidir (degiskenler 1-2 harf, "and" 3 harf).
// Tamami buyuk harf olan diziler (ABCD, PQRS) gecerli geometri etiketidir; haric tutulur.
export function mathWordResidue(text) {
  const hits = [];
  for (const tex of mathSegments(text)) {
    const stripped = tex
      .replace(/\\(text|textbf|textit|mathrm|operatorname)\s*\{[^}]*\}/g, " ")
      .replace(/\\[a-zA-Z]+/g, " ");
    for (const word of stripped.match(/[a-zA-Z]{4,}/g) ?? []) {
      if (/^[A-Z]+$/.test(word)) continue;
      hits.push({ family: "math-word", match: word });
    }
  }
  return hits;
}

export function findMarkers(text) {
  const value = String(text ?? "");
  const hits = [];
  for (const { family, re } of MARKER_FAMILIES) {
    const match = value.match(re);
    if (match) hits.push({ family, match: match[0] });
  }
  hits.push(...mathWordResidue(value));
  return hits;
}

export function katexIssues(text) {
  const issues = [];
  for (const segment of splitMathText(text)) {
    if (segment.kind === "text") continue;
    try {
      katex.renderToString(segment.value, { throwOnError: true, displayMode: segment.kind === "display" });
    } catch (error) {
      issues.push({ tex: segment.value, message: String(error?.message ?? error) });
    }
  }
  return issues;
}

// Satir ici isaretler (RW metin sozlesmesi, plan 2026-10-03; okuma kurali splitRichText).
// Formul icindeki `<` LaTeX'tir, taranmaz. Bos dizi = temiz; her sorun "tur: ayrinti":
// mark-unbalanced (karsiliksiz kapanis / kapanmamis), mark-nested (ayni tur ic ice),
// mark-overlap (kesisen iki tur: <u>a<i>b</u>c</i>; en icteki isaretten once kapanis),
// mark-empty (bos ya da yalniz bosluk), mark-newline (satir sonunu asiyor),
// mark-tag-like (dort etiket disinda etikete benzeyen yazi: <b>, </em>, <u class=..>, <br>).
// Duzgun ic ice iki ayri tur (`<u><i>..</i></u>`, `<i><u>..</u></i>`) serbesttir.
const TAG_LIKE = /<\/?[A-Za-z][^<>\n]*>?/g;

export function markIssues(text) {
  const issues = [];
  const open = [];
  const take = (chunk) => {
    for (const mark of open) {
      mark.content += chunk;
      if (chunk.includes("\n")) mark.newline = true;
    }
  };
  let partCount = 0;
  mapTextOutsideMath(String(text ?? ""), (part) => {
    // Iki metin parcasi arasinda bir formul vardir; acik isaretin icerigi sayilir.
    if (partCount++ > 0) take("$");
    let cursor = 0;
    for (const match of part.matchAll(TAG_LIKE)) {
      const token = match[0];
      take(part.slice(cursor, match.index));
      cursor = match.index + token.length;
      if (!MARK_TAGS.includes(token)) {
        issues.push(`mark-tag-like: ${token.slice(0, 24)}`);
        take(token);
        continue;
      }
      const name = token.at(-2);
      if (!token.startsWith("</")) {
        if (open.some((mark) => mark.name === name)) issues.push(`mark-nested: <${name}> inside <${name}>`);
        open.push({ name, content: "", newline: false });
        continue;
      }
      const at = open.findLastIndex((mark) => mark.name === name);
      if (at === -1) {
        issues.push(`mark-unbalanced: </${name}> without <${name}>`);
        continue;
      }
      if (at !== open.length - 1) issues.push(`mark-overlap: </${name}> closes before <${open.at(-1).name}>`);
      const [mark] = open.splice(at, 1);
      if (mark.content.trim() === "") issues.push(`mark-empty: <${name}></${name}>`);
      if (mark.newline) issues.push(`mark-newline: <${name}> spans a line break`);
    }
    take(part.slice(cursor));
    return part;
  });
  for (const mark of open) issues.push(`mark-unbalanced: <${mark.name}> not closed`);
  return issues;
}

export function hasUnbalancedDollar(text) {
  return (((String(text ?? "").replaceAll("\\$", "").match(/\$/g)) ?? []).length % 2) !== 0;
}

export function questionTexts(row) {
  return [row.prompt, ...(row.choices ? Object.values(row.choices) : [])].map((t) => String(t ?? ""));
}

export function auditRow(row) {
  const reasons = new Set();
  for (const text of questionTexts(row)) {
    for (const hit of findMarkers(text)) reasons.add(hit.family);
    if (katexIssues(text).length > 0) reasons.add("katex-parse");
    if (hasUnbalancedDollar(text)) reasons.add("unbalanced-dollar");
  }
  return [...reasons];
}
