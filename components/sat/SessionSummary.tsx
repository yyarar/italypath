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
    <section className="rounded-[1.4rem] border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.86)] p-7 text-center shadow-[0_18px_50px_rgba(21,32,28,0.06)] backdrop-blur-xl">
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
          className="min-h-11 rounded-xl bg-[var(--editorial-sage)] px-5 py-2.5 text-xs font-bold text-white shadow-[0_7px_18px_rgba(31,79,70,0.14)] transition-colors hover:bg-[#173d36] active:scale-[0.98]"
        >
          {t.sat.retryTopic}
        </button>
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
