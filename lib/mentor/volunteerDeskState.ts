import type { MentorConversationRow } from "@/types";

export type MentorChannelState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected";

export function mergeConversationSnapshot<T extends MentorConversationRow>(
  current: T[],
  snapshot: T[],
): T[] {
  const byId = new Map(current.map((conversation) => [conversation.id, conversation]));

  for (const conversation of snapshot) {
    const existing = byId.get(conversation.id);
    if (
      !existing ||
      Date.parse(conversation.updated_at) > Date.parse(existing.updated_at)
    ) {
      byId.set(conversation.id, conversation);
    }
  }

  return [...byId.values()].sort((left, right) => {
    const lastMessageDelta = Date.parse(right.last_message_at) - Date.parse(left.last_message_at);
    return lastMessageDelta || right.id.localeCompare(left.id);
  });
}

export function mergeConversationRealtime<T extends MentorConversationRow>(
  current: T[],
  incoming: T,
): T[] {
  return mergeConversationSnapshot(
    current.filter((conversation) => conversation.id !== incoming.id),
    [incoming],
  );
}

export function mergeMessageSnapshot<T>(
  realtimeRows: T[],
  snapshotRows: T[],
  merge: (current: T[], incoming: T[]) => T[],
): T[] {
  return merge(snapshotRows, realtimeRows);
}

export function deriveMentorRealtimeState(
  hasAuthenticatedUser: boolean,
  hasSelectedConversation: boolean,
  conversations: MentorChannelState,
  messages: MentorChannelState,
): "connecting" | "connected" | "disconnected" {
  if (!hasAuthenticatedUser) return "disconnected";

  const requiredChannels = hasSelectedConversation
    ? [conversations, messages]
    : [conversations];

  if (requiredChannels.includes("disconnected")) return "disconnected";
  if (requiredChannels.every((state) => state === "connected")) return "connected";
  return "connecting";
}
