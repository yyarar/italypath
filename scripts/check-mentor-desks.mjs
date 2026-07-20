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
  "mentor_conversations_one_open_per_user",
  "enable row level security",
  "is_active_mentor_staff",
  "start_volunteer_conversation",
  "send_student_mentor_message",
  "send_staff_mentor_message",
  "close_volunteer_conversation",
  "supabase_realtime",
  "client_nonce",
].forEach((needle) => mustInclude(sql, needle, "Mentor SQL eksik"));

mustNotInclude(sql, "SUPABASE_SERVICE_ROLE_KEY", "SQL dosyasında client secret referansı");

if (failures.length) {
  for (const failure of failures) console.error(`HATA: ${failure}`);
  process.exit(1);
}

console.log("check-mentor-desks: PASS");
