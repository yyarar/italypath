"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { SatTopic } from "@/lib/sat/types";

interface TopicCompletedProps {
  topic: SatTopic;
  wrongQuestionIds: string[];
  onRestart: () => void;
  onOpenMistakes: () => void;
  onBack: () => void;
}

export default function TopicCompleted({
  topic,
  wrongQuestionIds,
  onRestart,
  onOpenMistakes,
  onBack,
}: TopicCompletedProps) {
  const { t } = useLanguage();

  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 text-center">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
        {topic.skill}
      </p>
      <h2 className="mb-2 font-serif text-2xl font-normal text-[var(--editorial-ink)]">
        {t.sat.completedTitle}
      </h2>
      <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-[var(--editorial-muted)]">
        {t.sat.completedBody}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] active:translate-y-[1px]"
        >
          {t.sat.restartTopic}
        </button>
        {wrongQuestionIds.length > 0 ? (
          <button
            type="button"
            onClick={onOpenMistakes}
            className="border border-[var(--editorial-sage)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-colors hover:bg-[rgba(216,222,217,0.25)] active:translate-y-[1px]"
          >
            {t.sat.retryMistakes} ({wrongQuestionIds.length} {t.sat.wrongLabel})
          </button>
        ) : null}
        <button
          type="button"
          onClick={onBack}
          className="border border-[var(--editorial-border)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-colors hover:bg-[rgba(216,222,217,0.25)] active:translate-y-[1px]"
        >
          {t.sat.backToTopics}
        </button>
      </div>
    </section>
  );
}
