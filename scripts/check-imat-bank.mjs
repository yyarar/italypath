import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// IMAT deneme sinavi ve konu pratigi sozlesme guard'i (spec 2026-10-08). Cevrimdisi; ag kullanmaz.
// Gorev 4 baslangic kapsamini kurar; sonraki gorevler (7, 8, 12) kontrol ekler.

const failures = [];
function fail(message) { failures.push(message); }
function read(path) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

// Kaynak metinde acilis suslusunden eslesen kapanisa kadar olan govdeyi doner; string literallerini atlar.
function balancedBlock(source, openIndex) {
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }
  return null;
}

function namedBlock(source, name, fromIndex = 0) {
  const match = new RegExp(`(?:^|[\\s,{])${name}\\s*:\\s*\\{`).exec(source.slice(fromIndex));
  if (!match) return null;
  const openIndex = fromIndex + match.index + match[0].length - 1;
  return balancedBlock(source, openIndex);
}

function hasKey(block, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[\\s,{])(?:"${escaped}"|${escaped})\\s*:`).test(block);
}

// 1) Route guvenligi
const proxy = read("proxy.ts");
const publicList = proxy.match(/const isPublicRoute = createRouteMatcher\(\s*\[([\s\S]*?)\]\s*\);/m);
if (!publicList) fail("proxy.ts: isPublicRoute listesi okunamadi");
else if (/["']\/imat/.test(publicList[1])) fail("proxy.ts: /imat public route listesinde olmamali");
const protectedList = proxy.match(/const PROTECTED_PAGE_ROUTES = \[([\s\S]*?)\];/m);
if (!protectedList || !protectedList[1].includes('"/imat"')) {
  fail("proxy.ts: /imat PROTECTED_PAGE_ROUTES icinde olmali");
}
if (!proxy.includes("'/imat/:path*'")) fail("proxy.ts: config.matcher '/imat/:path*' icermeli");
const robots = read("app/robots.ts");
if (!robots.includes("'/imat'")) fail("app/robots.ts: /imat disallow listesinde olmali");
if (!existsSync(resolve(process.cwd(), "app/imat/layout.tsx"))) {
  fail("app/imat/layout.tsx: dosya yok (noindex metadata layout'u)");
} else if (!/index:\s*false/.test(read("app/imat/layout.tsx"))) {
  fail("app/imat/layout.tsx: robots index: false olmali");
}

// 2) Server veri katmani politikalari
const server = read("lib/imat/questions.server.ts");
if (!server.startsWith('import "server-only";')) {
  fail('questions.server.ts: ilk satir import "server-only"; olmali (service role client istemci paketine giremez)');
}
if (!server.includes("SUPABASE_SERVICE_ROLE_KEY")) fail("questions.server.ts: service role key kullanmali");
if (server.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) fail("questions.server.ts: anon key KULLANMAMALI (korumali icerik)");
const ttlMatch = server.match(/SERVER_CACHE_TTL_MS = (\d+) \* 60 \* 60 \* 1000/);
if (!ttlMatch || Number(ttlMatch[1]) < 1 || Number(ttlMatch[1]) > 6) {
  fail("questions.server.ts: memo TTL 1-6 saat araliginda olmali");
}
if (!server.includes("bayat memo") && !server.includes("cachedBank.data")) {
  fail("questions.server.ts: stale-on-error davranisi olmali");
}
if (!server.includes("if (row.needs_review) return null")) {
  fail("questions.server.ts: needs_review karantina filtresi eksik (karantinali soru asla sunulmamali)");
}
if (!server.includes("correctAnswer: null")) {
  fail("questions.server.ts: deneme (mock) yolu correctAnswer: null donmeli (cevap anahtari istemciye gitmemeli)");
}

// 3) API route
const route = read("app/api/imat/questions/route.ts");
if (!route.includes("no-store")) fail("api/imat/questions: no-store header olmali");
if (!route.includes("force-dynamic")) fail("api/imat/questions: force-dynamic olmali");
if (
  !route.includes('import { auth } from "@clerk/nextjs/server"') ||
  !/const \{ userId \} = await auth\(\);\s*if \(!userId\) \{[\s\S]{0,200}status: 401/.test(route)
) {
  fail("api/imat/questions: handler kendi auth() kontrolunu yapmali (userId yoksa 401)");
}
if (!route.includes("getImatReview(")) fail("api/imat/questions: review dali getImatReview( cagirmali");

// 4) Puanlama sabitleri ve SQL esdegeri
const scoring = read("lib/imat/scoring.mjs");
for (const literal of [
  "POINTS_CORRECT = 1.5",
  "POINTS_WRONG = -0.4",
  "EXAM_DURATION_MINUTES = 100",
  "EXAM_QUESTION_COUNT = 60",
]) {
  if (!scoring.includes(literal)) fail(`scoring.mjs: "${literal}" eksik`);
}
const bankSql = read("supabase/imat_bank.sql");
for (const literal of ["interval '100 minutes'", "1.5 *", "0.4 *"]) {
  if (!bankSql.includes(literal)) fail(`imat_bank.sql: "${literal}" eksik (puanlama/sure SQL tarafinda da ayni olmali)`);
}
if ((bankSql.match(/security definer/gi) ?? []).length < 3) {
  fail("imat_bank.sql: security definer en az 3 fonksiyonda olmali (start, save draft, submit)");
}
if ((bankSql.match(/set search_path = ''/gi) ?? []).length < 3) {
  fail("imat_bank.sql: set search_path = '' en az 3 fonksiyonda olmali");
}

// 5) Taksonomi ve ceviri anahtarlari
{
  const taxonomy = await import(pathToFileURL(resolve(process.cwd(), "lib/imat/taxonomy.mjs")).href);
  const { SECTIONS, TOPICS } = taxonomy;
  const slugs = TOPICS.map((entry) => entry.slug);
  if (new Set(slugs).size !== slugs.length) fail("taxonomy.mjs: konu slug'lari benzersiz olmali");
  for (const section of SECTIONS) {
    const general = TOPICS.find((entry) => entry.section === section && entry.slug === `${section}-general`);
    if (!general) fail(`taxonomy.mjs: ${section} bolumunde ${section}-general kutusu yok`);
  }
  for (const file of ["lib/translations/tr.ts", "lib/translations/en.ts"]) {
    const source = read(file);
    const imat = namedBlock(source, "imat", source.indexOf("\n  sat: {"));
    if (!imat) {
      fail(`${file}: imat ad alani yok`);
      continue;
    }
    const sections = namedBlock(imat, "sections");
    const topics = namedBlock(imat, "topics");
    if (!sections) fail(`${file}: imat.sections yok`);
    else {
      for (const section of SECTIONS) if (!hasKey(sections, section)) fail(`${file}: imat.sections.${section} eksik`);
    }
    if (!topics) fail(`${file}: imat.topics yok`);
    else {
      for (const slug of slugs) if (!hasKey(topics, slug)) fail(`${file}: imat.topics.${slug} eksik`);
    }
  }
}

// 6) Depolama ve yetki sozlesmesi
for (const role of ["anon", "authenticated"]) {
  if (!bankSql.includes(`revoke all on public.imat_questions from ${role};`)) {
    fail(`imat_bank.sql: "revoke all on public.imat_questions from ${role};" eksik (soru tablosu istemciye kapali)`);
  }
}
if (!bankSql.includes("'imat-figures'")) fail("imat_bank.sql: imat-figures bucket'i tanimlanmali");
if (!bankSql.includes("524288")) fail("imat_bank.sql: imat-figures bucket boyut siniri 524288 olmali");
if (!bankSql.includes("image/webp")) fail("imat_bank.sql: imat-figures bucket yalniz image/webp kabul etmeli");

// 7) Kaynaktan yukleme betigi (Gorev 12'ye kadar dosya yoksa atlanir)
if (existsSync(resolve(process.cwd(), "scripts/imat/import-bank.mjs"))) {
  const importer = read("scripts/imat/import-bank.mjs");
  if (/upsert/i.test(importer)) fail("scripts/imat/import-bank.mjs: upsert kullanilmamali (INSERT-ONLY)");
  if (!importer.includes("INSERT-ONLY")) fail("scripts/imat/import-bank.mjs: INSERT-ONLY sozlesme notu eksik");
}

if (failures.length > 0) {
  console.error("check:imat-bank FAIL");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("check:imat-bank PASS");
