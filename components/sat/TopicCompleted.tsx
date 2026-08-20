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
    <section className="rounded-[1.4rem] border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.86)] p-7 text-center shadow-[0_18px_50px_rgba(21,32,28,0.06)] backdrop-blur-xl">
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
          className="min-h-11 rounded-xl bg-[var(--editorial-sage)] px-5 py-2.5 text-xs font-bold text-white shadow-[0_7px_18px_rgba(31,79,70,0.14)] transition-colors hover:bg-[#173d36] active:scale-[0.98]"
        >
          {t.sat.restartTopic}
        </button>
        {wrongQuestionIds.length > 0 ? (
          <button
            type="button"
            onClick={onOpenMistakes}
            className="min-h-11 rounded-xl border border-[var(--editorial-sage)] px-5 py-2.5 text-xs font-bold text-[var(--editorial-sage)] transition-colors hover:bg-[rgba(216,222,217,0.25)] active:scale-[0.98]"
          >
            {t.sat.retryMistakes} ({wrongQuestionIds.length} {t.sat.wrongLabel})
          </button>
        ) : null}
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-xl border border-[var(--editorial-border)] px-5 py-2.5 text-xs font-bold text-[var(--editorial-sage)] transition-colors hover:bg-[rgba(216,222,217,0.25)] active:scale-[0.98]"
        >
          {t.sat.backToTopics}
        </button>
      </div>
    </section>
  );
}
