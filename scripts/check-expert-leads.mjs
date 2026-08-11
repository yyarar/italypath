import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const failures = [];

function read(filePath) {
  if (!existsSync(filePath)) {
    failures.push(`Eksik dosya: ${filePath}`);
    return "";
  }
  return readFileSync(filePath, "utf8");
}

function mustInclude(source, needle, label) {
  if (!source.includes(needle)) failures.push(`${label}: ${needle}`);
}

function mustNotInclude(source, needle, label) {
  if (source.includes(needle)) failures.push(`${label}: ${needle}`);
}

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filePath);
    return /\.(?:ts|tsx)$/.test(entry.name) && statSync(filePath).isFile()
      ? [filePath]
      : [];
  });
}

const routePath = "app/api/expert-leads/route.ts";
const route = read(routePath);
const server = read("lib/mentor/expertLeads.server.ts");
const sql = read("supabase/expert_leads.sql");
const expertDesk = read("components/mentor/expert/ExpertLeadDesk.tsx");
const expertForm = read("components/mentor/expert/ExpertLeadForm.tsx");
const expertSuccess = read("components/mentor/expert/ExpertLeadSuccess.tsx");
const translations = read("lib/translations.ts");
const mentorPage = read("app/ai-mentor/page.tsx");
const channels = read("lib/mentor/channels.ts");
const mentorHub = read("components/mentor/MentorHub.tsx");
const proxySource = read("proxy.ts");
const robotsSource = read("app/robots.ts");
const expertInboxState = read("lib/mentor/expertLeadInboxState.ts");
const expertInboxHook = read("lib/mentor/useExpertLeadInbox.ts");
const expertLeadTests = read("scripts/test-expert-leads.mjs");
const expertOperatorPage = read("app/ekip/uzman/page.tsx");
const expertOperatorGate = read("components/mentor/expert/operator/ExpertLeadGate.tsx");
const expertOperatorInbox = read("components/mentor/expert/operator/ExpertLeadInbox.tsx");
const expertOperatorList = read("components/mentor/expert/operator/ExpertLeadList.tsx");
const expertOperatorDetail = read("components/mentor/expert/operator/ExpertLeadDetail.tsx");
const volunteerOperatorInbox = read("components/mentor/operator/MentorOperatorInbox.tsx");
const legalSource = read("lib/legal/documents.ts");
const securityRunbook = read("SUPABASE_SECURITY_RUNBOOK.md");
const agentContext = read("AGENT_CONTEXT.md");
const sitemapSource = read("app/sitemap.ts");
const packageJson = read("package.json");

mustInclude(route, "export async function POST", "Public expert POST eksik");
mustNotInclude(route, "export async function GET", "Lead GET public olamaz");
mustInclude(route, 'export const dynamic = "force-dynamic"', "POST force-dynamic degil");
mustInclude(route, '"Cache-Control": "no-store, max-age=0"', "POST no-store degil");
mustInclude(route, "validateExpertLeadPayload", "Server payload dogrulamiyor");
mustInclude(server, 'import "server-only"', "Service role modulu server-only degil");
mustInclude(server, "SUPABASE_SERVICE_ROLE_KEY", "Service role insert eksik");
mustInclude(server, "expert_leads_submission_id_key", "Idempotent conflict guard eksik");
mustInclude(sql, "enable row level security", "Expert lead RLS eksik");

[
  [expertDesk, "ExpertLeadForm", "Expert desk form orkestrasyonu eksik"],
  [expertDesk, "ExpertLeadSuccess", "Expert desk success orkestrasyonu eksik"],
  [expertForm, 'fetch("/api/expert-leads"', "Expert form POST etmiyor"],
  [expertForm, "crypto.randomUUID", "Submission id uretilmiyor"],
  [expertForm, "website", "Honeypot alan eksik"],
].forEach(([source, needle, label]) => mustInclude(source, needle, label));

mustInclude(
  translations,
  "Talebini aldık. Ekibimiz WhatsApp üzerinden en kısa sürede sana ulaşacak.",
  "Turkce basari metni eksik",
);
mustInclude(expertSuccess, "aria-live", "Expert success live region eksik");
mustInclude(proxySource, "'/ai-mentor(.*)'", "Public mentor hub matcher eksik");
mustInclude(proxySource, "'/api/expert-leads(.*)'", "Public expert POST matcher eksik");
mustInclude(mentorPage, "useAuth", "Volunteer auth gate eksik");
mustInclude(
  mentorPage,
  'encodeURIComponent("/ai-mentor?desk=volunteer")',
  "Volunteer login redirect eksik",
);
mustInclude(mentorPage, "desk=volunteer", "Volunteer deep link eksik");
mustInclude(mentorPage, 'desk === "expert"', "Expert deep link eksik");
mustInclude(channels, 'availability: "active"', "Expert active status eksik");
mustInclude(mentorHub, "hubExpertCta", "Expert CTA route edilmemis");
mustInclude(translations, "hubExpertCta", "Expert CTA copy eksik");
mustInclude(robotsSource, "'/ai-mentor'", "Mentor robots disallow kaldirilmamalı");
mustInclude(expertInboxState, "transitionExpertLeadIdentity", "Expert identity state eksik");
mustInclude(expertLeadTests, "expertLeadInboxState.ts", "State saf test importu eksik");
mustInclude(expertInboxHook, "is_active_mentor_staff", "Staff access RPC eksik");
mustInclude(expertInboxHook, "purgeExpertLeadState", "Identity degisiminde state temizligi eksik");
mustInclude(expertInboxHook, "useLayoutEffect", "Identity commit boundary eksik");
mustNotInclude(expertInboxHook, ".channel(", "Expert hook Realtime channel aciyor");
mustNotInclude(expertInboxHook, "postgres_changes", "Expert hook Realtime degisikligi dinliyor");
mustNotInclude(expertInboxHook.toLowerCase(), "service_role", "Expert hook service role iceriyor");
if (
  expertInboxHook.indexOf('rpc(\n      "is_active_mentor_staff"') >
  expertInboxHook.indexOf('.from("expert_leads")')
) {
  failures.push("Expert lead query positive staff RPC kontrolunden once geliyor");
}
mustInclude(expertOperatorPage, "<ExpertLeadInbox />", "Expert operator route inbox render etmiyor");
mustInclude(expertOperatorInbox, "useExpertLeadInbox", "Expert operator hook kullanmiyor");
mustInclude(expertOperatorList, "all", "Tum expert filter eksik");
mustInclude(expertOperatorList, "new", "Yeni expert filter eksik");
mustInclude(expertOperatorList, "contacted", "Contacted expert filter eksik");
mustInclude(expertOperatorList, "completed", "Completed expert filter eksik");
mustInclude(expertOperatorDetail, "buildWhatsAppHref", "WhatsApp link helper eksik");
mustInclude(expertOperatorDetail, 'target="_blank"', "WhatsApp yeni sekmede acilmiyor");
mustInclude(expertOperatorDetail, 'rel="noreferrer"', "WhatsApp noreferrer eksik");
mustInclude(expertOperatorDetail, "window.confirm", "Lead silme ikinci onay eksik");
mustInclude(translations, 'refresh: "YENİLE"', "Yenile eylemi copy eksik");
mustInclude(volunteerOperatorInbox, 'href="/ekip/uzman"', "Volunteer -> expert nav eksik");
mustInclude(expertOperatorInbox, 'href="/ekip/mentor"', "Expert -> volunteer nav eksik");
mustInclude(expertOperatorGate, "authorized === true", "Expert gate fail-closed degil");
if (translations.split("expertOperator:").length - 1 < 2) {
  failures.push("expertOperator TR+EN cevirileri eksik");
}
[
  "eyebrow",
  "title",
  "backHome",
  "volunteerInbox",
  "refresh",
  "newCount",
  "filters",
  "empty",
  "selectLead",
  "whatsapp",
  "statusLabel",
  "noteLabel",
  "saveNote",
  "deleteLead",
  "deleteConfirm",
  "loading",
  "unauthorizedTitle",
  "unauthorizedBody",
  "loadError",
  "retry",
  "statusError",
  "noteError",
  "deleteError",
].forEach((key) => {
  if (translations.split(key).length - 1 < 2) {
    failures.push(`expertOperator ceviri anahtari eksik: ${key}`);
  }
});

[
  "Uzman ön görüşme talepleri",
  "WhatsApp numaranız",
  "hedef eğitim seviyeniz",
  "ilgilendiğiniz alan",
  "hedef başlangıç dönemi",
  "ilk ön görüşme ücretsizdir",
  "ücretli",
  "yetkilendirilmiş ItalyPath operatörü",
  "manuel olarak silinir",
].forEach((needle) => mustInclude(legalSource, needle, "Yasal uzman lead aciklamasi eksik"));

[
  "supabase/expert_leads.sql",
  "/ekip/uzman",
  "is_active_mentor_staff",
  "guest lead",
  "test lead",
].forEach((needle) => mustInclude(securityRunbook, needle, "Expert lead runbook eksik"));

[
  "expert_leads",
  "`/ai-mentor` public",
  "`/ekip/uzman` protected",
  "check:expert-leads",
  "test:expert-leads",
].forEach((needle) => mustInclude(agentContext, needle, "Agent context expert lead bilgisi eksik"));

mustNotInclude(expertInboxHook, ".channel(", "Expert hook Realtime kullanamaz");
mustNotInclude(expertInboxHook, "postgres_changes", "Expert hook Realtime dinleyemez");
mustNotInclude(expertForm, "useUser", "Expert form profil prefill kullanamaz");
mustNotInclude(expertForm.toLowerCase(), "email", "Expert form email alani tasiyamaz");
mustNotInclude(expertForm.toLowerCase(), "consent", "Expert form onay kutusu tasiyamaz");
mustNotInclude(packageJson.toLowerCase(), "captcha", "CAPTCHA dependency eklenemez");
mustNotInclude(packageJson.toLowerCase(), "turnstile", "Turnstile dependency eklenemez");
mustNotInclude(packageJson.toLowerCase(), "notification", "Bildirim dependency eklenemez");
mustNotInclude(sql, "pg_cron", "Expert lead otomatik silme eklenemez");
mustInclude(robotsSource, "'/ai-mentor'", "Mentor robots disallow kaldirilmamalı");
mustNotInclude(sitemapSource, "/ai-mentor", "Mentor sitemap'e eklenemez");

[
  "fullName",
  "whatsappPhone",
  "studyLevel",
  "fieldOfInterest",
  "targetIntake",
  "helpRequest",
].forEach((field) => mustInclude(expertForm, field, `Expert form alani eksik (${field})`));

if (translations.split("expertDesk:").length - 1 < 2) {
  failures.push("expertDesk TR+EN cevirileri eksik");
}
[
  "firstConsultationFree",
  "paidContinuation",
  "submit",
  "submitting",
  "submitError",
  "success",
  "backToDesks",
  "fields",
  "studyLevels",
  "fieldsOfInterest",
  "undecided",
].forEach((key) => {
  if (translations.split(key).length - 1 < 2) {
    failures.push(`expertDesk ceviri anahtari eksik: ${key}`);
  }
});

for (const filePath of [
  ...sourceFiles("components"),
  ...sourceFiles("app").filter((file) => file !== routePath),
  ...sourceFiles("lib").filter((file) => /^\s*["']use client["'];/m.test(read(file))),
]) {
  mustNotInclude(
    read(filePath),
    "SUPABASE_SERVICE_ROLE_KEY",
    `Client surface service-role anahtari iceriyor (${filePath})`,
  );
}

if (failures.length > 0) {
  console.error("Expert lead guard failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Expert lead guard passed.");
}
