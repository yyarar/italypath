import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const failures = [];
function fail(message) { failures.push(message); }
function read(path) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

// 1) Route guvenligi
const proxy = read("proxy.ts");
if (/isPublicRoute[\s\S]*?\/sat/.test(proxy.split("PROTECTED_PAGE_ROUTES")[0])) {
  fail("proxy.ts: /sat public route listesinde olmamali");
}
if (!proxy.includes('"/sat"')) {
  fail("proxy.ts: /sat PROTECTED_PAGE_ROUTES icinde olmali");
}
const robots = read("app/robots.ts");
if (!robots.includes("'/sat'")) fail("app/robots.ts: /sat disallow listesinde olmali");

// 2) Server veri katmani politikalari
const server = read("lib/sat/questions.server.ts");
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

// 3) API route
const route = read("app/api/sat/questions/route.ts");
if (!route.includes("no-store")) fail("api/sat/questions: no-store header olmali");
if (!route.includes("force-dynamic")) fail("api/sat/questions: force-dynamic olmali");
if (route.includes("explanationEn") || route.includes("explanation_en")) {
  fail("api/sat/questions: topics cevabi aciklama metni tasimamalı");
}

// 4) Explanation server mapping ve cevap sonrasi UI sozlesmesi
if (!server.includes("explanation_en")) fail("questions.server.ts: explanation_en secilmeli");
if (!server.includes("explanationEn: row.explanation_en")) {
  fail("questions.server.ts: explanation_en SatQuestion modeline aynen aktarilmali");
}
const questionCard = read("components/sat/QuestionCard.tsx");
if (!questionCard.includes("answered ? (") || !questionCard.includes("question.explanationEn ?")) {
  fail("QuestionCard.tsx: aciklama yalnizca cevap sonrasi ve nullable render edilmeli");
}
if (!questionCard.includes("<MathText text={question.explanationEn} />")) {
  fail("QuestionCard.tsx: aciklama MathText ile render edilmeli");
}

// 5) Ceviri butunlugu
const translations = read("lib/translations.ts");
const satKeyCount = (translations.match(/\bsat:\s*{/g) ?? []).length;
if (satKeyCount < 2) fail("translations.ts: sat namespace hem tr hem en icinde olmali");
if (!translations.includes('explanationTitle: "Açıklama"')) fail("translations.ts: TR explanation title eksik");
if (!translations.includes('explanationTitle: "Explanation"')) fail("translations.ts: EN explanation title eksik");

// 6) SQL sozlesmesi
const sql = read("supabase/sat_bank.sql");
for (const needle of [
  "revoke all on public.sat_questions from anon",
  "revoke all on public.sat_questions from authenticated",
  "sat_attempts_select_own",
  "sat_attempts_insert_own",
  "requesting_user_id()",
]) {
  if (!sql.includes(needle)) fail(`sat_bank.sql: "${needle}" eksik`);
}
if (!sql.includes("explanation_en text")) fail("sat_bank.sql: explanation_en nullable text olmali");
const explanationSql = read("supabase/sat_explanations.sql");
if (!explanationSql.includes("add column if not exists explanation_en text")) {
  fail("sat_explanations.sql: idempotent nullable explanation_en eklemeli");
}
if (/grant\s+.*\s+(anon|authenticated)/i.test(explanationSql) || /policy/i.test(explanationSql)) {
  fail("sat_explanations.sql: anon/authenticated grant veya policy eklememeli");
}
if (!existsSync(resolve(process.cwd(), "scripts/sat/import-explanations.mjs"))) {
  fail("scripts/sat/import-explanations.mjs eksik");
}

// 7) UI dosyalari mevcut
for (const path of [
  "app/sat/page.tsx",
  "components/sat/SatBankExplorer.tsx",
  "components/sat/QuestionCard.tsx",
  "components/sat/MathText.tsx",
  "lib/sat/answers.ts",
]) {
  if (!existsSync(resolve(process.cwd(), path))) fail(`${path} eksik`);
}

if (failures.length > 0) {
  console.error("check:sat-bank FAIL");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("check:sat-bank PASS");
