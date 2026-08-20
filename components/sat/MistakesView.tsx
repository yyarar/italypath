"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { SatTopic } from "@/lib/sat/types";

interface MistakeTopic {
  topic: SatTopic;
  wrongCount: number;
  wrongQuestionIds: string[];
}

interface MistakesViewProps {
  mistakeTopics: MistakeTopic[];
  onSelect: (topic: SatTopic, wrongQuestionIds: string[]) => void;
  onBack: () => void;
}

function topicKey(topic: SatTopic) {
  return `${topic.section}-${topic.skillSlug}`;
}

export default function MistakesView({ mistakeTopics, onSelect, onBack }: MistakesViewProps) {
  const { t } = useLanguage();
  const totalWrongCount = mistakeTopics.reduce((total, progress) => total + progress.wrongCount, 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-10 border-b border-[var(--editorial-border)] pb-7">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.list.backHome}
          </Link>
          <button
            type="button"
            onClick={onBack}
            className="border-b border-[var(--editorial-sage)] pb-px text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-colors hover:text-[var(--editorial-ink)]"
          >
            {t.sat.backToTopics}
          </button>
        </div>
        <h1 className="mt-7 font-serif text-4xl font-normal leading-tight tracking-[-0.035em] text-[var(--editorial-ink)] sm:text-6xl">
          {t.sat.mistakesTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">
          {t.sat.mistakesTotalPrefix} {totalWrongCount} {t.sat.wrongLabel}
        </p>
      </header>

      <section className="mb-8">
        <div className="overflow-hidden rounded-2xl border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.82)] shadow-[0_14px_42px_rgba(21,32,28,0.05)]">
          {mistakeTopics.map((progress) => (
            <button
              key={topicKey(progress.topic)}
              type="button"
              onClick={() => onSelect(progress.topic, progress.wrongQuestionIds)}
              className="flex min-h-20 w-full items-center justify-between gap-4 border-b border-[var(--editorial-border)] px-5 py-4 text-left outline-none transition-colors last:border-b-0 hover:bg-[rgba(216,222,217,0.25)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--editorial-sage)]"
            >
              <div>
                <p className="font-serif text-lg text-[var(--editorial-ink)]">{progress.topic.skill}</p>
                <p className="mt-1 text-[12px] text-[var(--editorial-muted)]">
                  {progress.wrongCount} {t.sat.wrongLabel}
                </p>
              </div>
              <span className="shrink-0 border-b border-[var(--editorial-sage)] pb-px text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-sage)]">
                {t.sat.retryMistakes}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
