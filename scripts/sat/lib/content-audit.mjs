import katex from "katex";

import { mapTextOutsideMath, splitMathText } from "../../../lib/sat/mathSegments.mjs";

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
