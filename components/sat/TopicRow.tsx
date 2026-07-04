"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { SatTopic } from "@/lib/sat/types";

interface TopicRowProps {
  topic: SatTopic;
  solvedCount: number;
  correctCount: number;
  wrongCount: number;
  onSelect: () => void;
}

export default function TopicRow({ topic, solvedCount, correctCount, wrongCount, onSelect }: TopicRowProps) {
  const { t } = useLanguage();
  const started = solvedCount > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-4 border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-4 text-left transition-colors hover:bg-[rgba(216,222,217,0.25)]"
    >
      <div>
        <p className="font-serif text-lg text-[var(--editorial-ink)]">{topic.skill}</p>
        <p className="mt-1 text-[12px] text-[var(--editorial-muted)]">
          {topic.questionCount} {t.sat.questionsLabel}
          {started ? ` · ${solvedCount} ${t.sat.solvedLabel} · ${correctCount} ${t.sat.correctLabel}` : ""}
          {wrongCount > 0 ? ` · ${wrongCount} ${t.sat.wrongLabel}` : ""}
        </p>
      </div>
      <span className="shrink-0 border-b border-[var(--editorial-sage)] pb-px text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-sage)]">
        {started ? t.sat.continueTopic : t.sat.startTopic}
      </span>
    </button>
  );
}
