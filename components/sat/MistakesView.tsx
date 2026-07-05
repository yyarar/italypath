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
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b border-[var(--editorial-border)] pb-6">
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
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
          ITALYPATH
        </p>
        <h1 className="mt-3 font-serif text-3xl font-normal leading-tight text-[var(--editorial-ink)] sm:text-4xl">
          {t.sat.mistakesTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">
          {t.sat.mistakesTotalPrefix} {totalWrongCount} {t.sat.wrongLabel}
        </p>
      </header>

      <section className="mb-8">
        <div className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
          {mistakeTopics.map((progress) => (
            <button
              key={topicKey(progress.topic)}
              type="button"
              onClick={() => onSelect(progress.topic, progress.wrongQuestionIds)}
              className="flex w-full items-center justify-between gap-4 border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[rgba(216,222,217,0.25)]"
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
