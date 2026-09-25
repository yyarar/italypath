export const MENTOR_CHANNEL_IDS = ["volunteer", "expert"] as const;
export type MentorChannelId = (typeof MENTOR_CHANNEL_IDS)[number];

export type MentorExperience = "volunteer-inbox" | "expert-lead";
export type MentorAvailability = "active" | "paused";

export interface MentorChannel {
  id: MentorChannelId;
  order: number;
  numberLabel: string;
  experience: MentorExperience;
  availability: MentorAvailability;
}

export const MENTOR_CHANNELS: MentorChannel[] = [
  {
    id: "volunteer",
    order: 1,
    numberLabel: "01",
    experience: "volunteer-inbox",
    availability: "active",
  },
  {
    id: "expert",
    order: 2,
    numberLabel: "02",
    experience: "expert-lead",
    availability: "active",
  },
];

export function getMentorChannel(id: MentorChannelId): MentorChannel {
  const channel = MENTOR_CHANNELS.find((candidate) => candidate.id === id);
  if (!channel) throw new Error(`Unknown mentor channel: ${id}`);
  return channel;
}
