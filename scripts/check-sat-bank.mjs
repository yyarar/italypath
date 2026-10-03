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

// 3) API route
const route = read("app/api/sat/questions/route.ts");
if (!route.includes("no-store")) fail("api/sat/questions: no-store header olmali");
if (!route.includes("force-dynamic")) fail("api/sat/questions: force-dynamic olmali");
if (
  !route.includes('import { auth } from "@clerk/nextjs/server"') ||
  !/const \{ userId \} = await auth\(\);\s*if \(!userId\) \{[\s\S]{0,200}status: 401/.test(route)
) {
  fail("api/sat/questions: handler kendi auth() kontrolunu yapmali (userId yoksa 401)");
}
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
// Okuma ve Yazma'da gorsel soru metninin ustunde, matematikte altinda (plan 2026-10-03).
{
  const above = questionCard.indexOf("{figureAbovePrompt ? figure : null}");
  const prompt = questionCard.indexOf("<MathText text={question.prompt} />");
  const below = questionCard.indexOf("{figureAbovePrompt ? null : figure}");
  if (
    !questionCard.includes('const figureAbovePrompt = question.section === "reading-writing";') ||
    above === -1 || prompt === -1 || below === -1 || !(above < prompt && prompt < below)
  ) {
    fail("QuestionCard.tsx: gorsel reading-writing'de soru metninin ustunde, matematikte altinda cizilmeli");
  }
}
// Okuma ve Yazma pasaji satir satir (PassageText, splitPassageBlocks); matematik soru metni eskisi gibi
// whitespace-pre-line kutusunda tek MathText. Onizleme ayni kurali kullanir (sitenin aynasi kalsin).
{
  const promptBox = questionCard.match(
    /<div className="mb-7 whitespace-pre-line text-base leading-8 text-\[var\(--editorial-ink\)\]">([\s\S]*?)<\/div>/
  );
  const branches = promptBox?.[1].match(
    /\{question\.section === "reading-writing" \? \(\s*<PassageText text=\{question\.prompt\} \/>\s*\) : \(\s*<MathText text=\{question\.prompt\} \/>\s*\)\}/
  );
  if (!branches) {
    fail("QuestionCard.tsx: soru metni kutusunda RW PassageText, matematik tek <MathText text={question.prompt} /> olmali");
  }
  const passage = read("components/sat/PassageText.tsx");
  if (
    !passage.includes('from "@/lib/sat/mathSegments.mjs"') ||
    !passage.includes("splitPassageBlocks(text)") ||
    !passage.includes("<MathText text={line.text} />") ||
    /\.split\(/.test(passage) ||
    passage.includes("dangerouslySetInnerHTML")
  ) {
    fail("PassageText.tsx: satirlari splitPassageBlocks ile ayirip MathText ile cizmeli (kendi ayirma kurali ve ham HTML yok)");
  }
  if (!read("scripts/sat/rw/render-rw-preview.mjs").includes("splitPassageBlocks(text)")) {
    fail("render-rw-preview.mjs: soru metnini sitedeki gibi splitPassageBlocks ile cizmeli");
  }
}
// Okuma ve Yazma alan grubu: dort alan bolum sirasinda ve TR/EN etiketli.
{
  const domains = read("lib/sat/domains.ts");
  const rwDomains = {
    "Information and Ideas": "domainInformationIdeas",
    "Craft and Structure": "domainCraftStructure",
    "Expression of Ideas": "domainExpressionIdeas",
    "Standard English Conventions": "domainStandardEnglish",
  };
  const rwStart = domains.indexOf('"reading-writing": [');
  const rwOrder = rwStart === -1 ? "" : domains.slice(rwStart, domains.indexOf("]", rwStart));
  let previous = -1;
  for (const [domain, labelKey] of Object.entries(rwDomains)) {
    const index = rwOrder.indexOf(`"${domain}"`);
    if (index === -1 || index < previous) fail(`domains.ts: "${domain}" reading-writing sirasinda eksik ya da yerinde degil`);
    previous = index;
    if (!domains.includes(`case "${domain}": return "${labelKey}";`)) fail(`domains.ts: "${domain}" etiket anahtari ${labelKey} olmali`);
    for (const file of ["lib/translations/tr.ts", "lib/translations/en.ts"]) {
      if (!new RegExp(`\\b${labelKey}: "`).test(read(file))) fail(`${file}: sat.${labelKey} eksik`);
    }
  }
}

// 4b) Formul ayirma kurali tek modulde (STATUS #100, 2026-10-02): site ve icerik taramasi ayni dosyayi
// kullanir; `$$...$$` ayri satir formuludur. Kural iki yerde ayri ayri yazilirsa yeniden ayrisir.
// Okuma ve Yazma (plan 2026-10-03): ayni modulun splitRichText'i alti cizili/italik isaretlerini de ayirir.
const mathText = read("components/sat/MathText.tsx");
if (!mathText.includes('from "@/lib/sat/mathSegments.mjs"') || !mathText.includes("splitRichText(")) {
  fail("MathText.tsx: metni lib/sat/mathSegments.mjs splitRichText ile ayirmali (formul + alti cizili/italik)");
}
if (/\.split\(/.test(mathText)) fail("MathText.tsx: kendi ayirma kuralini yazmamali (ortak modul)");
if (!mathText.includes("displayMode")) fail("MathText.tsx: ayri satir formulu displayMode ile cizilmeli");
if ((mathText.match(/dangerouslySetInnerHTML=\{/g) ?? []).length !== 1 ||!mathText.includes("<u ") || !mathText.includes("<em>")) {
  fail("MathText.tsx: isaretler React <u>/<em> dugumuyle cizilmeli; dangerouslySetInnerHTML yalniz KaTeX ciktisinda");
}
const contentAuditLib = read("scripts/sat/lib/content-audit.mjs");
if (!contentAuditLib.includes("lib/sat/mathSegments.mjs") || /\.split\(/.test(contentAuditLib)) {
  fail("content-audit.mjs: formulleri ortak modulle (lib/sat/mathSegments.mjs) ayirmali");
}
if (!read("lib/sat/mathSegments.mjs").includes("\\$\\$[^$]+\\$\\$")) {
  fail("mathSegments.mjs: cift dolarli (ayri satir) formul kurali eksik");
}

// 5) Ceviri butunlugu
const translations = read("lib/translations/tr.ts") + "\n" + read("lib/translations/en.ts");
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
// Kullanici yazma sinirlari (guvenlik denetimi kart 4, 2026-09-26)
for (const needle of [
  "check (char_length(selected_answer) <= 32)",
  "create trigger sat_attempts_daily_cap",
  "if v_recent >= 2000 then",
  "new.answered_at := pg_catalog.now();",
  "values ('sat-figures', 'sat-figures', true, 524288, array['image/webp'])",
]) {
  if (!sql.includes(needle)) fail(`sat_bank.sql: "${needle}" eksik`);
}
if (!read("components/sat/QuestionCard.tsx").includes("maxLength={32}")) {
  fail("QuestionCard.tsx: SPR cevap kutusu 32 karakterle sinirli olmali (sat_attempts kurali)");
}
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

// 8) Insert-only import sozlesmesi
const importBank = read("scripts/sat/import-bank.mjs");
if (importBank.includes(".upsert(")) fail("import-bank.mjs: sat_questions upsert YASAK (insert-only sozlesme)");
if (importBank.includes("upsert: true")) fail("import-bank.mjs: storage upsert YASAK");
if (!importBank.includes("fileSizeLimit: 524288") || !importBank.includes('allowedMimeTypes: ["image/webp"]')) {
  fail("import-bank.mjs: sat-figures deposu sat_bank.sql ile ayni sinirla (512 KB, WebP) olusturulmali");
}
if (!importBank.includes("INSERT-ONLY FAIL")) fail("import-bank.mjs: var olan id fark kontrolu eksik");
for (const toolPath of ["scripts/sat/patch-sat-questions.mjs", "scripts/sat/audit-sat-content.mjs"]) {
  if (!existsSync(resolve(process.cwd(), toolPath))) fail(`${toolPath} eksik`);
}

// 9) Ilerleme okumasi (guvenlik denetimi O4#3, 2026-09-26): soru basina en son
// deneme + tek satirlik gun ozeti; tum denemeler istemciye cekilmez.
const progressSql = read("supabase/sat_progress.sql");
for (const needle of [
  "with (security_invoker = true)",
  "select distinct on (a.user_id, a.question_id)",
  "revoke all on public.sat_latest_attempts from public, anon, authenticated;",
  "grant select on public.sat_latest_attempts to authenticated;",
  "security invoker",
  "set search_path = ''",
  "where a.user_id = (select public.requesting_user_id())",
  "revoke all on function public.sat_attempt_summary(text) from public, anon, authenticated;",
  "grant execute on function public.sat_attempt_summary(text) to authenticated;",
]) {
  if (!progressSql.includes(needle)) fail(`sat_progress.sql: "${needle}" eksik`);
}
if (/security\s+definer/i.test(progressSql)) fail("sat_progress.sql: security definer kullanilmamali");
const attemptsHook = read("lib/sat/useSatAttempts.ts");
if (!attemptsHook.includes('.from("sat_latest_attempts")') || !attemptsHook.includes('rpc("sat_attempt_summary"')) {
  fail("useSatAttempts.ts: ilerleme sat_latest_attempts + sat_attempt_summary ile okunmali");
}
if (/from\("sat_attempts"\)\s*\.select/.test(attemptsHook)) {
  fail("useSatAttempts.ts: sat_attempts tablosunun tamami istemciye cekilmemeli");
}
if (!read("scripts/test-mentor-db.mjs").includes('"supabase/sat_progress.sql"')) {
  fail("test-mentor-db.mjs: sat_progress.sql yerel DB testinde yuklenmeli");
}

if (failures.length > 0) {
  console.error("check:sat-bank FAIL");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("check:sat-bank PASS");
