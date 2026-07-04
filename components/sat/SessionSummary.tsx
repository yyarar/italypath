"use client";

import { useLanguage } from "@/context/LanguageContext";

interface SessionSummaryProps {
  total: number;
  correct: number;
  onBack: () => void;
  onRetry: () => void;
}

export default function SessionSummary({ total, correct, onBack, onRetry }: SessionSummaryProps) {
  const { t } = useLanguage();

  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 text-center">
      <h2 className="mb-2 font-serif text-2xl font-normal text-[var(--editorial-ink)]">
        {t.sat.summaryTitle}
      </h2>
      <p className="mb-6 text-sm text-[var(--editorial-muted)]">
        {total} {t.sat.summaryBody} {correct} {t.sat.summaryCorrect}
      </p>
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
