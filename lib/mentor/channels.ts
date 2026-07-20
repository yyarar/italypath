export const MENTOR_CHANNEL_IDS = ["ai", "volunteer", "expert"] as const;
export type MentorChannelId = (typeof MENTOR_CHANNEL_IDS)[number];

export type MentorExperience = "ai-chat" | "volunteer-inbox" | "expert-lead";
export type MentorAvailability = "active" | "paused" | "coming-soon";

export interface MentorChannel {
  id: MentorChannelId;
  order: number;
  numberLabel: string;
  monogram: string;
  experience: MentorExperience;
  availability: MentorAvailability;
}

export const MENTOR_CHANNELS: MentorChannel[] = [
  {
    id: "ai",
    order: 1,
    numberLabel: "01",
    monogram: "AI",
    experience: "ai-chat",
    availability: "active",
  },
  {
    id: "volunteer",
    order: 2,
    numberLabel: "02",
    monogram: "GE",
    experience: "volunteer-inbox",
    availability: "coming-soon",
  },
  {
    id: "expert",
    order: 3,
    numberLabel: "03",
    monogram: "UZ",
    experience: "expert-lead",
    availability: "coming-soon",
  },
];

export function getMentorChannel(id: MentorChannelId): MentorChannel {
  const channel = MENTOR_CHANNELS.find((candidate) => candidate.id === id);
  if (!channel) throw new Error(`Unknown mentor channel: ${id}`);
  return channel;
}
