export const MENTOR_CHANNEL_IDS = ["ai", "volunteer", "expert"] as const;
export type MentorChannelId = (typeof MENTOR_CHANNEL_IDS)[number];
export type MentorChannelStatus = "active" | "coming-soon";

export interface MentorChannel {
  id: MentorChannelId;
  order: number;        // 1..3, display order
  numberLabel: string;  // "01" / "02" / "03"
  monogram: string;     // "AI" / "GE" / "UZ"
  status: MentorChannelStatus;
}

export const MENTOR_CHANNELS: MentorChannel[] = [
  { id: "ai",        order: 1, numberLabel: "01", monogram: "AI", status: "active" },
  { id: "volunteer", order: 2, numberLabel: "02", monogram: "GE", status: "coming-soon" },
  { id: "expert",    order: 3, numberLabel: "03", monogram: "UZ", status: "coming-soon" },
];

export function getMentorChannel(id: MentorChannelId): MentorChannel {
  const channel = MENTOR_CHANNELS.find((c) => c.id === id);
  if (!channel) {
    throw new Error(`Unknown mentor channel: ${id}`);
  }
  return channel;
}
