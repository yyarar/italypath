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

if (failures.length) {
  for (const failure of failures) console.error(`HATA: ${failure}`);
  process.exit(1);
}

console.log("check-mentor-desks: PASS");
