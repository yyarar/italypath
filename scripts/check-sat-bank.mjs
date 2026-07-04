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

// 3) API route
const route = read("app/api/sat/questions/route.ts");
if (!route.includes("no-store")) fail("api/sat/questions: no-store header olmali");
if (!route.includes("force-dynamic")) fail("api/sat/questions: force-dynamic olmali");

// 4) Ceviri butunlugu
const translations = read("lib/translations.ts");
const satKeyCount = (translations.match(/\bsat:\s*{/g) ?? []).length;
if (satKeyCount < 2) fail("translations.ts: sat namespace hem tr hem en icinde olmali");

// 5) SQL sozlesmesi
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

// 6) UI dosyalari mevcut
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
