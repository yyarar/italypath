"use client";

import { ArrowLeft } from "lucide-react";

import { formatTopicLabel } from "@/components/imat/practice/labels";
import { topicKey } from "@/components/imat/practice/progress";
import { useLanguage } from "@/context/LanguageContext";
import type { ImatTopic } from "@/lib/imat/types";

interface ImatMistakesViewProps {
  mistakeTopics: { topic: ImatTopic; wrongQuestionIds: string[] }[];
  onSelect: (topic: ImatTopic, wrongQuestionIds: string[]) => void;
  onBack: () => void;
}

// Yanlislarim: son denemesi yanlis olan sorular alt konuya gore gruplanir; konu secilince yalniz o sorular cozulur.
export default function ImatMistakesView({ mistakeTopics, onSelect, onBack }: ImatMistakesViewProps) {
  const { t } = useLanguage();
  const totalWrongCount = mistakeTopics.reduce((total, item) => total + item.wrongQuestionIds.length, 0);

  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--editorial-muted)] outline-none transition-colors hover:bg-white/70 hover:text-[var(--editorial-sage)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
        {t.imat.practice.backToTopics}
      </button>

      <header className="mb-7 border-b border-[var(--editorial-border)] pb-6">
        <h2 className="font-serif text-3xl font-normal leading-tight tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-5xl">
          {t.imat.practice.mistakesTitle}
        </h2>
        {mistakeTopics.length > 0 ? (
          <p className="mt-3 text-sm leading-6 text-[var(--editorial-muted)]">
            {totalWrongCount} {t.imat.practice.wrongLabel}
          </p>
        ) : null}
      </header>

      {mistakeTopics.length === 0 ? (
        <p className="rounded-[1.4rem] border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 text-[15px] leading-7 text-[var(--editorial-muted)]">
          {t.imat.practice.mistakesCleared}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.82)] shadow-[0_14px_42px_rgba(21,32,28,0.05)]">
          {mistakeTopics.map((item) => (
            <li key={topicKey(item.topic)} className="border-b border-[var(--editorial-border)] last:border-b-0">
              <button
                type="button"
                onClick={() => onSelect(item.topic, item.wrongQuestionIds)}
                className="flex min-h-20 w-full flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 text-left outline-none transition-colors hover:bg-[rgba(216,222,217,0.25)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--editorial-sage)] sm:px-5"
              >
                <span className="block min-w-0">
                  <span className="block text-[11px] font-semibold text-[var(--editorial-muted)]">
                    {t.imat.sections[item.topic.section]}
                  </span>
                  <span className="mt-1 block font-serif text-lg leading-snug text-[var(--editorial-ink)]">
                    {formatTopicLabel(item.topic, t.imat)}
                  </span>
                  <span className="mt-1 block text-[12px] text-[var(--editorial-terracotta-ink)]">
                    {item.wrongQuestionIds.length} {t.imat.practice.wrongLabel}
                  </span>
                </span>
                <span className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-[rgba(31,79,70,0.42)] bg-[rgba(255,254,250,0.72)] px-4 text-xs font-bold text-[var(--editorial-sage)]">
                  {t.imat.practice.retryMistakes}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
