"use client";

import { useLanguage } from "@/context/LanguageContext";

interface SessionSummaryProps {
  total: number;
  correct: number;
  overallCorrect?: number;
  overallSolved?: number;
  onBack: () => void;
  onRetry: () => void;
}

export default function SessionSummary({
  total,
  correct,
  overallCorrect,
  overallSolved,
  onBack,
  onRetry,
}: SessionSummaryProps) {
  const { t } = useLanguage();
  const showOverallMastery = typeof overallSolved === "number" && overallSolved > 0;

  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 text-center">
      <h2 className="mb-2 font-serif text-2xl font-normal text-[var(--editorial-ink)]">
        {t.sat.summaryTitle}
      </h2>
      <div className="mb-6 space-y-2 text-sm text-[var(--editorial-muted)]">
        <p>
          {total} {t.sat.summaryBody} {correct} {t.sat.summaryCorrect}
        </p>
        {showOverallMastery ? (
          <p>
            {t.sat.overallMasteryLabel} {overallCorrect ?? 0}/{overallSolved} {t.sat.summaryCorrect}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] active:translate-y-[1px]"
        >
          {t.sat.retryTopic}
        </button>
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
