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
const translations = read("lib/translations/tr.ts") + "\n" + read("lib/translations/en.ts");
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

// Toplama aninda aydinlatma (denetim S7#4): gonder dugmesinin altinda gizlilik politikasi linki, TR+EN.
mustInclude(expertForm, 'href="/yasal/gizlilik"', "Formda gizlilik politikasi linki eksik");
mustInclude(expertForm, "copy.privacyNotice.lead", "Formda gizlilik satiri metni eksik");
if (translations.split("privacyNotice: {").length - 1 < 2) {
  failures.push("privacyNotice TR+EN cevirileri eksik");
}
// Yil secenekleri statik HTML'e derleme yiliyla yazilmamali (denetim O4#9): sunucu anlik goruntusu null.
mustInclude(expertForm, "useSyncExternalStore(subscribeToNothing, readCurrentUtcYear, readServerYear)", "Yil secenekleri sayfa acildiktan sonra uretilmiyor");
mustNotInclude(expertForm, "useMemo(() => buildTargetIntakeOptions(), [])", "Yil secenekleri sunucu cizimine geri donmus");

mustInclude(
  translations,
  "Talebini aldık. Ekibimiz WhatsApp üzerinden en kısa sürede sana ulaşacak.",
  "Turkce basari metni eksik",
);
mustInclude(expertSuccess, "aria-live", "Expert success live region eksik");
mustInclude(proxySource, "'/ai-mentor', '/ai-mentor/(.*)'", "Public mentor hub matcher eksik");
// Tam yol: alt yollar ve kardes onekler (/api/expert-leads/...) public olmamali.
mustInclude(proxySource, "'/api/expert-leads',", "Public expert POST matcher eksik");
mustNotInclude(proxySource, "'/api/expert-leads(.*)'", "Expert POST matcher tam yol olmali");
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
// Filters are listed once in expertLeadInboxState.ts and rendered by the list.
mustInclude(expertInboxState, '"all"', "Tum expert filter eksik");
mustInclude(expertInboxState, '"new"', "Yeni expert filter eksik");
mustInclude(expertInboxState, '"contacted"', "Contacted expert filter eksik");
mustInclude(expertInboxState, '"completed"', "Completed expert filter eksik");
mustInclude(expertInboxState, '"suspected"', "Supheli expert filter eksik");
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
  "suspectedCount",
  "suspectedHint",
  "loadMore",
  "loadMoreError",
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

const validationSource = read("lib/mentor/expertLeadValidation.ts");
const mentorDbTest = read("scripts/test-mentor-db.mjs");
mustInclude(route, "isSameSiteJsonRequest(request)", "Expert lead route kaynak/icerik turu kontrolu yapmiyor");
mustInclude(route, '"application/json"', "Expert lead route JSON icerik turu istemiyor");
mustInclude(route, 'error: "rate_limited" }, 429', "Expert lead route yogunluk cevabi (429) vermiyor");
mustInclude(server, "expert_lead_rate_limited", "Expert lead server saatlik sinir hatasini tanimiyor");
mustInclude(sql, "create trigger expert_leads_hourly_cap", "Expert lead saatlik sinir tetikleyicisi eksik");
mustInclude(sql, "v_recent_leads >= 50", "Expert lead saatlik supheli esigi 50 degil");
mustInclude(sql, "v_recent_leads >= 150", "Expert lead saatlik sert tavani 150 degil");
mustInclude(sql, "new.status := 'suspected'", "Esigi asan lead supheli olarak kabul edilmiyor");
mustInclude(sql, "'new', 'contacted', 'completed', 'suspected'", "Expert lead durumlarinda suspected eksik");
mustInclude(mentorDbTest, "kept as suspected", "Supheli esik DB testi eksik");
mustInclude(server, '"23514"', "Postgres kural ihlali 400'e eslenmiyor");
mustInclude(server, '"22P05"', "Postgres karakter hatasi 400'e eslenmiyor");
mustInclude(route, 'result.kind === "rejected"', "Expert lead route reddedilen girdiyi 400 donmuyor");
mustInclude(validationSource, '"too_few_letters"', "Adda en az iki harf kurali eksik");
mustInclude(validationSource, "\\u202a-\\u202e", "Yazi yonu karakterleri reddedilmiyor");
mustInclude(expertLeadTests, "Yardım 🙏🙏", "Emojili kisa mesaj testi eksik");
mustInclude(expertInboxState, 'DEFAULT_EXPERT_LEAD_FILTER: ExpertLeadFilter = "new"', "Gelen kutusu varsayilan filtresi yeni degil");
mustInclude(expertInboxState, "EXPERT_LEAD_PAGE_SIZE", "Gelen kutusu sayfa boyutu eksik");
mustInclude(expertInboxHook, ".limit(EXPERT_LEAD_PAGE_SIZE + 1)", "Gelen kutusu sayfalanmiyor");
mustInclude(expertInboxHook, 'query.neq("status", "suspected")', "Tumu filtresi supheli talepleri ayirmiyor");
mustInclude(expertOperatorList, "EXPERT_LEAD_FILTERS", "Gelen kutusu filtre listesi eksik");
mustInclude(expertOperatorList, "onLoadMore", "Gelen kutusu daha fazla dugmesi eksik");
mustInclude(mentorDbTest, "expert_lead_rate_limited", "Expert lead saatlik sinir DB testi eksik");
mustInclude(validationSource, "Array.from(value).length", "Expert lead uzunlugu kod noktasi olarak sayilmiyor");
mustInclude(validationSource, '"invalid_characters"', "Expert lead gorunmez karakter kontrolu eksik");
mustInclude(expertForm, "copy.busyError", "Expert lead formu yogunluk mesajini gostermiyor");
mustInclude(translations, "busyError", "Expert lead yogunluk metni eksik");
mustInclude(translations, "invalidCharacters", "Expert lead gorunmez karakter metni eksik");

if (failures.length > 0) {
  console.error("Expert lead guard failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Expert lead guard passed.");
}
