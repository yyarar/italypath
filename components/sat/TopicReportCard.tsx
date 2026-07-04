"use client";

import { useMemo } from "react";

import { useLanguage } from "@/context/LanguageContext";
import type { SatTopic } from "@/lib/sat/types";

interface TopicProgress {
  topic: SatTopic;
  solvedCount: number;
  correctCount: number;
  wrongQuestionIds: string[];
  wrongCount: number;
}

interface TopicReportCardProps {
  progress: TopicProgress[];
  onBack: () => void;
  onSelectTopic: (topic: SatTopic) => void;
}

function accuracy(progress: TopicProgress) {
  if (progress.solvedCount === 0) return 0;
  return (progress.correctCount / progress.solvedCount) * 100;
}

function accuracyColor(value: number) {
  if (value < 50) return "var(--editorial-terracotta)";
  if (value <= 75) return "var(--editorial-muted)";
  return "var(--editorial-sage)";
}

export default function TopicReportCard({ progress, onBack, onSelectTopic }: TopicReportCardProps) {
  const { t } = useLanguage();

  const sectionLabels = {
    math: t.sat.mathSection,
    "reading-writing": t.sat.rwSection,
  } satisfies Record<SatTopic["section"], string>;

  const report = useMemo(() => {
    const sorted = [...progress].sort((a, b) => accuracy(a) - accuracy(b));
    const solvedTotal = progress.reduce((total, item) => total + item.solvedCount, 0);
    const correctTotal = progress.reduce((total, item) => total + item.correctCount, 0);
    const overallAccuracy = solvedTotal > 0 ? Math.round((correctTotal / solvedTotal) * 100) : 0;

    return {
      sorted,
      solvedTotal,
      overallAccuracy,
      weakest: sorted[0],
      strongest: sorted[sorted.length - 1],
    };
  }, [progress]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b border-[var(--editorial-border)] pb-6">
        <button
          type="button"
          onClick={onBack}
          className="border-b border-[var(--editorial-sage)] pb-px text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-colors hover:text-[var(--editorial-ink)]"
        >
          {t.sat.backToTopics}
        </button>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
          ITALYPATH
        </p>
        <h1 className="mt-3 font-serif text-3xl font-normal leading-tight text-[var(--editorial-ink)] sm:text-4xl">
          {t.sat.reportCardTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">
          {t.sat.reportCardSubtitle}
        </p>
      </header>

      {progress.length === 0 ? (
        <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 text-center">
          <h2 className="font-serif text-2xl font-normal text-[var(--editorial-ink)]">
            {t.sat.reportCardTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--editorial-muted)]">
            {t.sat.reportCardEmpty}
          </p>
        </section>
      ) : (
        <>
          <section className="mb-8 grid border border-[var(--editorial-border)] bg-[var(--editorial-surface)] sm:grid-cols-4">
            <div className="border-b border-[var(--editorial-border)] p-4 sm:border-b-0 sm:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
                {t.sat.solvedLabel}
              </p>
              <p className="mt-2 font-serif text-3xl text-[var(--editorial-ink)]">{report.solvedTotal}</p>
            </div>
            <div className="border-b border-[var(--editorial-border)] p-4 sm:border-b-0 sm:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
                {t.sat.overallAccuracyLabel}
              </p>
              <p className="mt-2 font-serif text-3xl" style={{ color: accuracyColor(report.overallAccuracy) }}>
                {report.overallAccuracy}%
              </p>
            </div>
            <div className="border-b border-[var(--editorial-border)] p-4 sm:border-b-0 sm:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
                {t.sat.weakestLabel}
              </p>
              {report.weakest ? (
                <>
                  <p className="mt-2 font-serif text-lg leading-snug text-[var(--editorial-ink)]">
                    {report.weakest.topic.skill}
                  </p>
                  <p
                    className="mt-1 text-[12px]"
                    style={{ color: accuracyColor(accuracy(report.weakest)) }}
                  >
                    {Math.round(accuracy(report.weakest))}%
                  </p>
                </>
              ) : null}
            </div>
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
                {t.sat.strongestLabel}
              </p>
              {report.strongest ? (
                <>
                  <p className="mt-2 font-serif text-lg leading-snug text-[var(--editorial-ink)]">
                    {report.strongest.topic.skill}
                  </p>
                  <p
                    className="mt-1 text-[12px]"
                    style={{ color: accuracyColor(accuracy(report.strongest)) }}
                  >
                    {Math.round(accuracy(report.strongest))}%
                  </p>
                </>
              ) : null}
            </div>
          </section>

          <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
            {report.sorted.map((item) => {
              const itemAccuracy = accuracy(item);
              const roundedAccuracy = Math.round(itemAccuracy);
              const bandColor = accuracyColor(itemAccuracy);

              return (
                <button
                  key={`${item.topic.section}-${item.topic.skillSlug}`}
                  type="button"
                  onClick={() => onSelectTopic(item.topic)}
                  className="grid w-full gap-3 border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-[rgba(216,222,217,0.25)] sm:grid-cols-[minmax(0,1fr)_120px_120px]"
                >
                  <div className="min-w-0">
                    <p className="font-serif text-lg leading-snug text-[var(--editorial-ink)]">{item.topic.skill}</p>
                    <p className="mt-1 text-[12px] text-[var(--editorial-muted)]">
                      {sectionLabels[item.topic.section]}
                    </p>
                  </div>
                  <p className="self-center text-[12px] text-[var(--editorial-muted)]">
                    {item.correctCount}/{item.solvedCount} {t.sat.correctLabel}
                  </p>
                  <div className="self-center">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
                        {t.sat.accuracyLabel}
                      </span>
                      <span className="text-[12px] font-bold" style={{ color: bandColor }}>
                        {roundedAccuracy}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--editorial-border)]">
                      <div className="h-full" style={{ width: `${roundedAccuracy}%`, backgroundColor: bandColor }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
