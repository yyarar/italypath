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

const channels = read("lib/mentor/channels.ts");
const volunteer = read("lib/mentor/volunteer.ts");
const types = read("types/index.ts");
const sql = read("supabase/volunteer_mentor.sql");
const mentorDbTest = read("scripts/test-mentor-db.mjs");
const packageJson = read("package.json");
const securityRunbook = read("SUPABASE_SECURITY_RUNBOOK.md");
const mentorClient = read("lib/mentor/useMentorSupabaseClient.ts");
const studentHook = read("lib/mentor/useVolunteerDesk.ts");

mustInclude(channels, '"ai-chat"', "AI experience eksik");
mustInclude(channels, '"volunteer-inbox"', "Volunteer experience eksik");
mustInclude(channels, '"expert-lead"', "Expert experience eksik");
mustInclude(channels, "availability", "Availability modeli eksik");
mustNotInclude(channels, "MentorChannelStatus", "Eski status tipi kaldı");
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
  "enable row level security",
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
mustInclude(studentHook, 'table: "mentor_messages"', "Message subscription eksik");
mustInclude(studentHook, "mergeMentorMessages", "Realtime dedupe eksik");
mustNotInclude(studentHook, "SUPABASE_SERVICE_ROLE_KEY", "Student hook service role içeriyor");

if (failures.length) {
  for (const failure of failures) console.error(`HATA: ${failure}`);
  process.exit(1);
}

console.log("check-mentor-desks: PASS");
