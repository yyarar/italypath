import { SECTIONS, TOPICS } from "@/lib/imat/taxonomy.mjs";
import type { ImatTopic } from "@/lib/imat/types";
import type { ImatAttemptState } from "@/lib/imat/useImatAttempts";

export interface TopicProgress {
  topic: ImatTopic;
  solvedCount: number;
  correctCount: number;
  wrongCount: number;
  wrongQuestionIds: string[];
}

export function topicKey(topic: Pick<ImatTopic, "section" | "topicSlug">): string {
  return `${topic.section}/${topic.topicSlug}`;
}

const TAXONOMY_ORDER = new Map<string, number>(TOPICS.map((entry, index) => [entry.slug, index]));

// Bolumler kagit sirasiyla, bolum icinde alt konular taksonomi sirasiyla (bilinmeyen slug sona).
export function sortTopics(topics: readonly ImatTopic[]): ImatTopic[] {
  const sectionRank = (topic: ImatTopic) => {
    const rank = SECTIONS.indexOf(topic.section);
    return rank === -1 ? SECTIONS.length : rank;
  };
  const topicRank = (topic: ImatTopic) => TAXONOMY_ORDER.get(topic.topicSlug) ?? TOPICS.length;
  return [...topics].sort((a, b) => sectionRank(a) - sectionRank(b) || topicRank(a) - topicRank(b));
}

// Konu basina ilerleme: soru basina en son deneme (attempts) konunun soru kimliklerine uygulanir.
export function buildTopicProgress(
  topics: readonly ImatTopic[],
  attempts: ReadonlyMap<string, ImatAttemptState>,
): TopicProgress[] {
  return sortTopics(topics).map((topic) => {
    let solvedCount = 0;
    let correctCount = 0;
    const wrongQuestionIds: string[] = [];
    for (const questionId of topic.questionIds) {
      const attempt = attempts.get(questionId);
      if (!attempt) continue;
      solvedCount += 1;
      if (attempt.isCorrect) correctCount += 1;
      else wrongQuestionIds.push(questionId);
    }
    return { topic, solvedCount, correctCount, wrongCount: wrongQuestionIds.length, wrongQuestionIds };
  });
}

export function mistakeTopicsOf(progress: readonly TopicProgress[]): { topic: ImatTopic; wrongQuestionIds: string[] }[] {
  return progress
    .filter((item) => item.wrongCount > 0)
    .map((item) => ({ topic: item.topic, wrongQuestionIds: item.wrongQuestionIds }));
}
