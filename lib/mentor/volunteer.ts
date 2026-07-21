import type { MentorMessageRow } from "@/types";

export const VOLUNTEER_TOPIC_IDS = [
  "university-program",
  "application-documents",
  "scholarship-isee",
  "visa-residence",
  "student-life",
  "other",
] as const;

export type VolunteerTopicId = (typeof VOLUNTEER_TOPIC_IDS)[number];

export const MENTOR_CONVERSATION_STATUSES = [
  "waiting_for_team",
  "waiting_for_student",
  "closed",
] as const;

export type MentorConversationStatus =
  (typeof MENTOR_CONVERSATION_STATUSES)[number];
export type MentorSenderKind = "student" | "staff";
export type MentorRealtimeState = "connecting" | "connected" | "disconnected";

export function isVolunteerTopicId(value: string): value is VolunteerTopicId {
  return VOLUNTEER_TOPIC_IDS.includes(value as VolunteerTopicId);
}

export function mergeMentorMessages(
  current: MentorMessageRow[],
  incoming: MentorMessageRow[],
): MentorMessageRow[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((left, right) => {
    const timeDelta = Date.parse(left.created_at) - Date.parse(right.created_at);
    return timeDelta || left.id.localeCompare(right.id);
  });
}
