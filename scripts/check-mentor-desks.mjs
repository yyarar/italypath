import { existsSync, readFileSync } from "node:fs";

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`Eksik dosya: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function mustInclude(source, needle, label) {
  if (!source.includes(needle)) failures.push(`${label}: ${needle}`);
}

function mustNotInclude(source, needle, label) {
  if (source.includes(needle)) failures.push(`${label}: ${needle}`);
}

function mustNotMatch(source, pattern, label) {
  if (pattern.test(source)) failures.push(label);
}

const channels = read("lib/mentor/channels.ts");
const mentorPage = read("app/ai-mentor/page.tsx");
const volunteer = read("lib/mentor/volunteer.ts");
const types = read("types/index.ts");
const sql = read("supabase/volunteer_mentor.sql");
const mentorDbTest = read("scripts/test-mentor-db.mjs");
const packageJson = read("package.json");
const securityRunbook = read("SUPABASE_SECURITY_RUNBOOK.md");
const mentorClient = read("lib/mentor/useMentorSupabaseClient.ts");
const studentHook = read("lib/mentor/useVolunteerDesk.ts");
const studentState = read("lib/mentor/volunteerDeskState.ts");
const volunteerDesk = read("components/mentor/volunteer/VolunteerDesk.tsx");
const volunteerMessage = read("components/mentor/volunteer/VolunteerMessage.tsx");
const volunteerStatus = read("components/mentor/volunteer/VolunteerConversationStatus.tsx");
const volunteerThread = read("components/mentor/volunteer/VolunteerThread.tsx");
const translations = read("lib/translations.ts");
const mentorHub = read("components/mentor/MentorHub.tsx");
const operatorPage = read("app/ekip/mentor/page.tsx");
const operatorHook = read("lib/mentor/useMentorOperatorInbox.ts");
const operatorInbox = read("components/mentor/operator/MentorOperatorInbox.tsx");
const proxySource = read("proxy.ts");
const robotsSource = read("app/robots.ts");
const legalSource = read("lib/legal/documents.ts");
const mentorRoom = read("components/mentor/MentorChatRoom.tsx");
const operatorController = read("lib/mentor/operatorInboxController.ts");
const operatorBehaviorTest = read("scripts/test-mentor-operator-inbox.mjs");
const agentContext = read("AGENT_CONTEXT.md");

function sectionBetween(source, heading, nextHeading) {
  const start = source.indexOf(`heading: "${heading}"`);
  if (start < 0) return "";
  if (!nextHeading) return source.slice(start);
  const end = source.indexOf(`heading: "${nextHeading}"`, start + 1);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}

const robotsDisallowSource =
  robotsSource.match(/disallow:\s*\[([\s\S]*?)\]/m)?.[1] ?? "";
const privacySource =
  legalSource.match(/const privacy:[\s\S]*?(?=const terms:)/m)?.[0] ?? "";
const termsSource = legalSource.match(/const terms:[\s\S]*/m)?.[0] ?? "";
const privacyDataSection = sectionBetween(
  privacySource,
  "2. Hangi Kişisel Verileri Topluyoruz?",
  "3. Kişisel Verileri Hangi Amaçlarla İşliyoruz?",
);
const privacyPurposeSection = sectionBetween(
  privacySource,
  "3. Kişisel Verileri Hangi Amaçlarla İşliyoruz?",
  "4. Verilerin Üçüncü Taraflarla Paylaşımı ve Yurt Dışına Aktarım",
);
const privacySharingSection = sectionBetween(
  privacySource,
  "4. Verilerin Üçüncü Taraflarla Paylaşımı ve Yurt Dışına Aktarım",
  "5. Verilerin Saklanma Süresi",
);
const privacyRetentionSection = sectionBetween(
  privacySource,
  "5. Verilerin Saklanma Süresi",
  "6. Veri Güvenliği",
);
const termsServiceSection = sectionBetween(
  termsSource,
  "1. Hizmetin Tanımı",
  "2. Bilgilerin Doğruluğu ve Sorumluluk Reddi",
);
const termsMentorSection = sectionBetween(
  termsSource,
  "3. Mentor Masaları Hakkında",
  "4. Kullanıcı Yükümlülükleri",
);

mustInclude(channels, '"ai-chat"', "AI experience eksik");
mustInclude(channels, '"volunteer-inbox"', "Volunteer experience eksik");
mustInclude(channels, '"expert-lead"', "Expert experience eksik");
mustInclude(channels, "availability", "Availability modeli eksik");
mustNotInclude(channels, "MentorChannelStatus", "Eski status tipi kaldı");
mustInclude(
  channels,
  'id: "volunteer"',
  "Volunteer channel eksik",
);
mustInclude(mentorPage, "<VolunteerDesk", "Volunteer desk route edilmemiş");
mustInclude(
  mentorPage,
  'activeChannel.experience === "volunteer-inbox"',
  "Experience branch eksik",
);
mustInclude(mentorPage, "aiMessages", "AI state ayrıştırılmamış");
mustNotInclude(mentorPage, "MessagesByChannel", "Eski kanal-bazlı AI state kaldı");
mustInclude(volunteer, "VOLUNTEER_TOPIC_IDS", "Konu ID'leri eksik");
mustInclude(volunteer, "MENTOR_CONVERSATION_STATUSES", "Durum ID'leri eksik");
mustInclude(volunteer, "mergeMentorMessages", "Mesaj dedupe helper eksik");
mustInclude(types, "MentorConversationRow", "Conversation row tipi eksik");
mustInclude(types, "MentorMessageRow", "Message row tipi eksik");

[
  "create table if not exists public.mentor_staff",
  "create table if not exists public.mentor_conversations",
  "create table if not exists public.mentor_messages",
  "create table if not exists public.mentor_rpc_idempotency",
  "mentor_staff_one_active_operator",
  "mentor_conversations_one_open_per_user",
  "mentor_conversations_user_last_message_idx",
  "enable row level security",
  "set search_path = ''",
  "pg_advisory_xact_lock",
  "idempotency_conflict",
  "legacy_mentor_idempotency_migration_required",
  "p_topic is null",
  "v_body is null",
  "is_active_mentor_staff",
  "start_volunteer_conversation",
  "send_student_mentor_message",
  "send_staff_mentor_message",
  "close_volunteer_conversation",
  "supabase_realtime",
  "client_nonce",
].forEach((needle) => mustInclude(sql, needle, "Mentor SQL eksik"));

mustNotInclude(sql, "SUPABASE_SERVICE_ROLE_KEY", "SQL dosyasında client secret referansı");
mustNotInclude(sql, "client_nonce uuid not null unique", "Global nonce unique kaldı");
mustInclude(
  sql,
  "grant execute on function public.requesting_user_id() to authenticated",
  "Shared Clerk claim helper explicit grant eksik",
);
mustInclude(packageJson, '"test:mentor-db"', "PostgreSQL mentor test komutu eksik");
mustInclude(mentorDbTest, "runConcurrentBehindGate", "Concurrency DB testi eksik");
mustInclude(mentorDbTest, "owner and active staff RLS reads", "RLS DB testi eksik");
mustInclude(mentorDbTest, "data-bearing legacy upgrade", "Legacy migration DB testi eksik");
mustInclude(mentorDbTest, "POSTGRES_BIN", "Portable PostgreSQL keşfi eksik");
mustInclude(mentorDbTest, "pg_config", "pg_config keşfi eksik");
mustInclude(securityRunbook, "legacy_mentor_idempotency_migration_required", "Legacy safe-stop runbook eksik");
mustInclude(securityRunbook, "private_idempotency_realtime_rows", "Private Realtime kontrolü eksik");
mustInclude(mentorClient, "getToken()", "Native Clerk token kullanılmıyor");
mustNotInclude(mentorClient, 'template: "supabase"', "Deprecated JWT template kullanılıyor");
mustInclude(studentHook, 'rpc("start_volunteer_conversation"', "Start RPC eksik");
mustInclude(studentHook, 'rpc("send_student_mentor_message"', "Student send RPC eksik");
mustInclude(studentHook, 'rpc("close_volunteer_conversation"', "Close RPC eksik");
mustInclude(studentHook, "realtime.setAuth()", "Realtime auth eksik");
mustInclude(studentHook, "useLayoutEffect", "Identity commit boundary eksik");
mustNotInclude(studentHook, "if (identityRef.current !== userId)", "Render sırasında identity mutation kaldı");
mustInclude(studentHook, "resolvedUserId === undefined", "Unresolved Clerk auth boundary eksik");
mustInclude(studentHook, "authReadyRef.current", "Committed auth readiness gate eksik");
mustInclude(studentHook, "authReadyRef.current && isCommittedOwner", "isCurrent auth gate eksik");
mustInclude(studentHook, "if (!identityReady || !ownerId)", "Realtime unresolved auth gate eksik");
mustInclude(studentHook, "resolvedUserId === undefined ? true", "Unresolved auth loading contract eksik");
mustInclude(studentHook, "createOwnerScopedNonceRegistry", "Owner scoped nonce registry eksik");
mustInclude(studentHook, "startSelectionSuspendedRef", "Start selection suspension eksik");
mustInclude(studentState, "resolveConversationSelection", "Pending start selection helper eksik");
mustInclude(studentState, "clearMentorMessageLoadError", "Message load error cleanup helper eksik");
mustNotInclude(studentHook, "pendingStartRef.current.clear()", "Start nonce registry identity resetinde siliniyor");
mustNotInclude(studentHook, "pendingSendRef.current.clear()", "Send nonce registry identity resetinde siliniyor");
mustInclude(studentHook, 'filter: `user_id=eq.${ownerId}`', "Conversation subscription filtresi eksik");
mustInclude(studentHook, 'event: "INSERT"', "Conversation INSERT subscription eksik");
mustInclude(studentHook, 'event: "UPDATE"', "Conversation UPDATE subscription eksik");
mustNotInclude(studentHook, 'event: "*"', "RLS uygulanmayan DELETE subscription kaldı");
mustInclude(studentHook, 'table: "mentor_messages"', "Message subscription eksik");
mustInclude(studentHook, 'filter: `conversation_id=eq.${conversationId}`', "Message subscription filtresi eksik");
mustInclude(studentHook, "mergeMentorMessages", "Realtime dedupe eksik");
mustNotInclude(studentHook, "SUPABASE_SERVICE_ROLE_KEY", "Student hook service role içeriyor");
mustNotMatch(
  studentHook,
  /\.from\([^)]*\)[\s\S]{0,160}\.(?:insert|update|upsert|delete)\(/,
  "Student hook doğrudan tablo mutation içeriyor",
);

[
  "VolunteerConversationStart.tsx",
  "VolunteerThread.tsx",
  "VolunteerMessage.tsx",
  "VolunteerComposer.tsx",
  "VolunteerConversationStatus.tsx",
  "VolunteerConversationHistory.tsx",
].forEach((file) => read(`components/mentor/volunteer/${file}`));

mustInclude(volunteerDesk, "useVolunteerDesk", "VolunteerDesk hook kullanmıyor");
mustInclude(volunteerDesk, "MentorTopBar", "VolunteerDesk topbar eksik");
mustInclude(volunteerMessage, "whitespace-pre-wrap", "Düz metin newline sunumu eksik");
mustNotInclude(volunteerMessage, "ReactMarkdown", "İnsan mesajında Markdown yasak");
mustInclude(volunteerStatus, 'role="status"', "Conversation status live region eksik");
mustInclude(volunteerThread, 'role="status"', "Message loading live region eksik");
mustNotInclude(translations, "240 bölümün", "Eski canlı program sayısı kaldı");
mustNotInclude(translations, "240 programs", "Stale live program count remains");
mustInclude(
  translations,
  'hubActiveBadge: "AKTİF · ANINDA"',
  "AI anında rozeti eksik",
);
mustInclude(
  translations,
  'hubActiveBadge: "ACTIVE · INSTANT"',
  "AI instant badge missing",
);
mustInclude(
  translations,
  'hubVolunteerActiveBadge: "AKTİF · ASENKRON"',
  "Volunteer asenkron rozeti eksik",
);
mustInclude(
  translations,
  'hubVolunteerActiveBadge: "ACTIVE · ASYNC"',
  "Volunteer async badge missing",
);
mustInclude(
  mentorHub,
  "t.aiMentor.hubVolunteerActiveBadge",
  "Volunteer active badge route edilmemiş",
);
mustInclude(
  mentorHub,
  "t.aiMentor.hubActiveBadge",
  "AI active badge route edilmemiş",
);
[
  "Pratik soruna pratik yanıt — birkaç saatte bir cevap.",
  "Birkaç saat içinde · Hafta içi · Ücretsiz / sınırlı",
  "usually within a few hours.",
  "Within a few hours · Weekdays · Free / limited",
].forEach((needle) =>
  mustNotInclude(translations, needle, "Volunteer SLA kopyası kaldı"),
);
if (translations.split("volunteerDesk:").length - 1 < 2) {
  failures.push("volunteerDesk TR+EN çevirileri eksik");
}

[
  "MentorOperatorGate.tsx",
  "MentorOperatorInbox.tsx",
  "OperatorConversationList.tsx",
  "OperatorConversationThread.tsx",
  "OperatorReplyComposer.tsx",
].forEach((file) => read(`components/mentor/operator/${file}`));

mustInclude(operatorPage, "MentorOperatorInbox", "Operator route inbox render etmiyor");
mustInclude(operatorHook, 'rpc("is_active_mentor_staff"', "Staff gate RPC eksik");
mustInclude(operatorHook, 'rpc("send_staff_mentor_message"', "Staff reply RPC eksik");
mustInclude(operatorHook, 'rpc("close_volunteer_conversation"', "Staff close RPC eksik");
mustInclude(operatorHook, "realtime.setAuth()", "Operator Realtime auth eksik");
mustInclude(operatorHook, "operatorCanAccess", "Operator yetki-sırası guard eksik");
mustInclude(operatorHook, "createOwnerScopedNonceRegistry", "Owner scoped reply nonce eksik");
mustInclude(operatorHook, 'event: "INSERT"', "Operator conversation INSERT subscription eksik");
mustInclude(operatorHook, 'event: "UPDATE"', "Operator conversation UPDATE subscription eksik");
mustNotInclude(operatorHook, 'event: "*"', "Operator RLS uygulanmayan DELETE subscription kaldı");
mustInclude(operatorHook, 'filter: `conversation_id=eq.${conversationId}`', "Operator message scope filtresi eksik");
mustInclude(operatorInbox, "OperatorConversationList", "Operator liste eksik");
mustInclude(operatorInbox, "OperatorConversationThread", "Operator thread eksik");
mustNotInclude(operatorHook, "SUPABASE_SERVICE_ROLE_KEY", "Operator hook service role içeriyor");
mustNotMatch(
  operatorHook,
  /\.from\([^)]*\)[\s\S]{0,160}\.(?:insert|update|upsert|delete)\(/,
  "Operator hook doğrudan tablo mutation içeriyor",
);
if (translations.split("mentorOperator:").length - 1 < 2) {
  failures.push("mentorOperator TR+EN çevirileri eksik");
}

mustInclude(proxySource, '"/ekip"', "/ekip protected redirect listesinde değil");
mustInclude(robotsDisallowSource, "'/ekip'", "/ekip robots disallow eksik");
mustInclude(
  privacyDataSection,
  "Gönüllü mentor görüşmeleri",
  "Gizlilik veri listesi gönüllü mesajlarını açıklamıyor",
);
mustInclude(
  privacyDataSection,
  "mesajlarla belge veya dosya eki alınmaz",
  "Gizlilik V1 ek alınmadığını açıklamıyor",
);
mustInclude(
  privacyPurposeSection,
  "Site içindeki insan gönüllü görüşmesini yürütmek",
  "Gizlilik gönüllü işleme amacını açıklamıyor",
);
mustInclude(
  privacyPurposeSection,
  "yetkilendirilmiş ItalyPath operatörünün okuyup yanıtlayabildiği",
  "Gizlilik yetkili insan erişimini açıklamıyor",
);
mustInclude(
  privacySharingSection,
  "Bulut veri saklama hizmeti: favorileriniz, yüklediğiniz belgeler ve gönüllü mentor görüşmeleriniz için",
  "Gizlilik bulut saklamayı açıklamıyor",
);
mustNotInclude(
  privacySharingSection,
  "ItalyPath operatör",
  "İç operatör üçüncü taraf sağlayıcı olarak listelenmiş",
);
mustInclude(
  privacyRetentionSection,
  "Gönüllü mentor görüşmeleri, görüşme kapandıktan sonra da hesabınız aktif olduğu sürece",
  "Mentor saklama süresi eksik",
);
mustInclude(
  termsServiceSection,
  "site içi insan gönüllü yazışması sunar",
  "Kullanım koşulları insan gönüllü hizmetini tanımlamıyor",
);
mustInclude(
  termsMentorSection,
  "öğrenci deneyimine dayalı genel rehberlik",
  "Kullanım koşullarında insan mentor sınırı eksik",
);
mustInclude(
  termsMentorSection,
  "kişiye özel mali değerlendirme",
  "Mentor kişiselleştirilmiş mali danışmanlık sınırı eksik",
);
mustInclude(
  legalSource,
  'export const LEGAL_LAST_UPDATED = "20 Temmuz 2026"',
  "Yasal metin güncelleme tarihi eksik",
);
const mentorTermsParagraphCount =
  termsMentorSection.match(/^\s{8}"/gm)?.length ?? 0;
if (mentorTermsParagraphCount !== 3) {
  failures.push(
    `Mentor kullanım koşulları onaylı üç paragrafı korumuyor: ${mentorTermsParagraphCount}`,
  );
}

mustInclude(packageJson, '"check:mentor-desks"', "Package mentor check script eksik");
mustInclude(channels, 'experience: "volunteer-inbox"', "Volunteer experience kaydı eksik");
mustInclude(channels, 'experience: "expert-lead"', "Expert experience kaydı eksik");
mustInclude(mentorRoom, "LockedDeskNotice", "Expert locked branch kaldırılmış");
mustNotInclude(sql, "sender_user_id", "Student-readable message row staff ID taşıyor");
mustNotInclude(
  volunteerMessage,
  "dangerouslySetInnerHTML",
  "İnsan mesajında raw HTML yasak",
);
mustNotInclude(
  operatorHook,
  'template: "supabase"',
  "Operator deprecated JWT template kullanıyor",
);
mustInclude(
  operatorHook,
  "runOperatorInboxReload",
  "Operator Realtime reconnect orkestrasyonu eksik",
);
mustInclude(
  operatorController,
  "handleOperatorMutationFailure",
  "Operator kesin/belirsiz hata ayrımı eksik",
);
mustInclude(
  operatorBehaviorTest,
  'onStatus("CLOSED")',
  "Operator CLOSED reconnect davranış testi eksik",
);
mustInclude(
  agentContext,
  "mentor_conversations",
  "Agent context mentor tablolarını açıklamıyor",
);
mustInclude(
  agentContext,
  "check:mentor-desks",
  "Agent context mentor doğrulamasını açıklamıyor",
);

const volunteerRecord =
  channels.match(/\{\s*id: "volunteer"[\s\S]*?\n\s*\}/)?.[0] ?? "";
const expertRecord =
  channels.match(/\{\s*id: "expert"[\s\S]*?\n\s*\}/)?.[0] ?? "";
mustInclude(volunteerRecord, 'availability: "active"', "Volunteer masa aktif değil");
mustInclude(
  expertRecord,
  'availability: "coming-soon"',
  "Expert masa erken açılmış",
);

if (failures.length) {
  for (const failure of failures) console.error(`HATA: ${failure}`);
  process.exit(1);
}

console.log("check-mentor-desks: PASS");
