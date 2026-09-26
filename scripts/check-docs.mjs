import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

// Belge referans guard'i (docs/STATUS.md #31, 2026-09-26). Cevrimdisi; canliya istek atmaz.
//
// Iki seyi denetler:
// 1. Belgelerdeki `npm run <ad>` referanslari package.json "scripts" icinde var mi (satir icinde ve
//    kod bloklarinda), `node scripts/<dosya>` komutlarindaki dosya diskte var mi.
// 2. Backtick icindeki veya goreli Markdown linkindeki repo yollari diskte var mi: app/, components/,
//    lib/, scripts/, docs/, supabase/, public/ altindaki yollar ve kok dizindeki .md/.ts/.mjs dosyalari.
//    Yalin dosya adi (ornegin `en.ts`) kokte yoksa kapsanan klasorlerde ayni adla bir dosya varsa gecer.
//
// Atlananlar (yanlis pozitif dusuk kalsin): glob/desen iceren yollar (* ? { } ...), `<...>` yer tutucular,
// `~/`, `tmp/`, `output/` ile baslayanlar, bosluk icerenler, URL'ler. Gercekten silinmis bir dosyaya
// bilerek atif yapan satirin sonuna `<!-- check-docs: ignore -->` yazilirsa o satir atlanir.
//
// Kesin kapsam (hata = kirmizi) ve yalniz uyari veren kapsam (tarihsel bolumler silinmis dosyalara
// atif yapabilir; cikis kodunu etkilemez):

const STRICT_DOCS = ["AGENTS.md", "DATA_ENTRY_GUIDE.md", "SUPABASE_SECURITY_RUNBOOK.md", "docs/USAGE_LIMITS.md", "README.md"];
const WARN_DOCS = ["docs/STATUS.md", "AGENT_CONTEXT.md"];

const COVERED_DIRS = ["app", "components", "lib", "scripts", "docs", "supabase", "public"];
const ROOT_FILE_PATTERN = /^[A-Za-z0-9_.-]+\.(md|ts|mjs)$/;
const IGNORE_MARKER = "check-docs: ignore";
const SKIP_PREFIXES = ["~/", "tmp/", "output/", "http://", "https://", "/"];

const root = process.cwd();
const scripts = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).scripts ?? {};

// Kapsanan klasorlerdeki tum dosya adlari (yalin ad kontrolu icin). node_modules ve .next taranmaz.
const knownBasenames = new Set();
function collectBasenames(directory) {
  const absolute = resolve(root, directory);
  if (!existsSync(absolute)) return;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) collectBasenames(path);
    else knownBasenames.add(entry.name);
  }
}
for (const directory of COVERED_DIRS) collectBasenames(directory);

function isPattern(candidate) {
  return /[*?{}<>…]/.test(candidate) || candidate.includes("...") || /\s/.test(candidate);
}

/** Backtick icindeki metin bir repo yolu adayi mi? Degilse null, evetse temizlenmis yol. */
function pathCandidate(rawText) {
  let candidate = rawText.trim();
  if (!candidate || isPattern(candidate)) return null;
  if (SKIP_PREFIXES.some((prefix) => candidate.startsWith(prefix))) return null;
  candidate = candidate.replace(/^\.\//, "");
  candidate = candidate.replace(/#.*$/, "").replace(/:\d+(-\d+)?$/, "");
  if (!candidate) return null;
  const firstSegment = candidate.split("/")[0];
  if (candidate.includes("/")) {
    return COVERED_DIRS.includes(firstSegment) ? candidate : null;
  }
  return ROOT_FILE_PATTERN.test(candidate) ? candidate : null;
}

function pathExists(candidate) {
  const absolute = resolve(root, candidate);
  if (!existsSync(absolute)) {
    // Yalin dosya adi: kapsanan klasorlerden birinde ayni adla dosya varsa kabul et.
    return !candidate.includes("/") && knownBasenames.has(candidate);
  }
  if (candidate.endsWith("/")) return statSync(absolute).isDirectory();
  return true;
}

function checkDocument(path) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) return [`${path}: dosya yok`];
  const problems = [];
  const seen = new Set();
  const report = (line, message) => {
    const key = `${line}:${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    problems.push(`${path}:${line}: ${message}`);
  };

  let inFence = false;
  const lines = readFileSync(absolute, "utf8").split(/\r?\n/);
  lines.forEach((text, index) => {
    const lineNumber = index + 1;
    if (/^\s*(```|~~~)/.test(text)) {
      inFence = !inFence;
      return;
    }
    if (text.includes(IGNORE_MARKER)) return;

    for (const match of text.matchAll(/npm run (?:-s )?([a-z][a-z0-9:_-]*)/g)) {
      if (!scripts[match[1]]) report(lineNumber, `npm run ${match[1]}: package.json scripts icinde yok`);
    }
    for (const match of text.matchAll(/\bnode (?:--[\w-]+ )*(scripts\/[^\s`'"()]+)/g)) {
      const candidate = pathCandidate(match[1]);
      if (candidate && !pathExists(candidate)) report(lineNumber, `${candidate}: dosya yok`);
    }
    if (inFence) return;

    const candidates = [];
    for (const match of text.matchAll(/`([^`\n]+)`/g)) candidates.push(match[1]);
    for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (!/^https?:|^mailto:|^#/.test(match[1])) candidates.push(match[1]);
    }
    for (const raw of candidates) {
      const candidate = pathCandidate(raw);
      if (candidate && !pathExists(candidate)) report(lineNumber, `${candidate}: yol diskte yok`);
    }
  });
  return problems;
}

const errors = STRICT_DOCS.flatMap(checkDocument);
const warnings = WARN_DOCS.flatMap(checkDocument);

for (const warning of warnings) console.warn(`[UYARI] ${warning}`);
for (const error of errors) console.error(`[HATA] ${error}`);

if (errors.length > 0) {
  console.error(`[FAIL] check:docs: ${errors.length} bayat referans (kesin kapsam: ${STRICT_DOCS.join(", ")}); ${warnings.length} uyari (${WARN_DOCS.join(", ")}).`);
  process.exit(1);
}
console.log(`[OK] check:docs: kesin kapsamda bayat referans yok (${STRICT_DOCS.length} belge); ${warnings.length} uyari (${WARN_DOCS.join(", ")}).`);
