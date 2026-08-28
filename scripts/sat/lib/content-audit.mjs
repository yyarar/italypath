import katex from "katex";

const ESCAPED_DOLLAR = "\u0000";

// components/sat/MathText.tsx ile birebir ayni segmentasyon sozlesmesi.
export function mathSegments(text) {
  return String(text)
    .replaceAll("\\$", ESCAPED_DOLLAR)
    .split(/(\$[^$]+\$)/g)
    .filter((seg) => seg.startsWith("$") && seg.endsWith("$") && seg.length > 2)
    .map((seg) => seg.slice(1, -1).replaceAll(ESCAPED_DOLLAR, "\\$"));
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
  for (const tex of mathSegments(text)) {
    try {
      katex.renderToString(tex, { throwOnError: true });
    } catch (error) {
      issues.push({ tex, message: String(error?.message ?? error) });
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
