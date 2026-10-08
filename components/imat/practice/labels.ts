import { findTopic } from "@/lib/imat/taxonomy.mjs";
import type { ImatTopic } from "@/lib/imat/types";

export interface TopicLabelSource {
  topics: Record<string, string>;
  physicsLabel: string;
  mathLabel: string;
}

// Gorunen alt konu adi: ceviri yoksa katalogdaki ad; fizik-matematik konularinda alan on eki ("Fizik · Kinematik").
export function formatTopicLabel(topic: Pick<ImatTopic, "topic" | "topicSlug">, imat: TopicLabelSource): string {
  const base = imat.topics[topic.topicSlug] ?? topic.topic;
  const field = findTopic(topic.topicSlug)?.field;
  if (field === "physics") return `${imat.physicsLabel} · ${base}`;
  if (field === "math") return `${imat.mathLabel} · ${base}`;
  return base;
}
