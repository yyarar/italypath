"use client";

import { formatTopicLabel } from "@/components/imat/practice/labels";
import { useLanguage } from "@/context/LanguageContext";
import type { ImatTopic } from "@/lib/imat/types";

interface PracticeSummaryProps {
  topic: ImatTopic;
  total: number;
  correct: number;
  onBack: () => void;
  // Verilirse konuyu bastan cozme dugmesi gosterilir.
  onRetry?: () => void;
}

// Konu oturumu sonu: "X / Y dogru" ve konulara donus.
export default function PracticeSummary({ topic, total, correct, onBack, onRetry }: PracticeSummaryProps) {
  const { t } = useLanguage();

  return (
    <section className="rounded-[1.4rem] border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.88)] p-6 text-center shadow-[0_18px_50px_rgba(21,32,28,0.06)] backdrop-blur-xl sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
        {formatTopicLabel(topic, t.imat)}
      </p>
      <h2 className="mt-2 font-serif text-3xl font-normal tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-4xl">
        {t.imat.practice.summaryTitle}
      </h2>
      <p className="mt-5 text-lg text-[var(--editorial-ink)]">
        <span className="font-serif text-4xl tracking-[-0.03em] text-[var(--editorial-sage)] tabular-nums">
          {correct} / {total}
        </span>{" "}
        {t.imat.practice.correctLabel}
      </p>
      <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 rounded-xl bg-[var(--editorial-sage)] px-6 py-3 text-sm font-bold text-white shadow-[0_7px_18px_rgba(31,79,70,0.16)] outline-none transition-colors hover:bg-[#173d36] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2"
        >
          {t.imat.practice.backToTopics}
        </button>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-12 rounded-xl border border-[var(--editorial-border)] px-6 py-3 text-sm font-bold text-[var(--editorial-sage)] outline-none transition-colors hover:bg-[rgba(216,222,217,0.25)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)]"
          >
            {t.imat.practice.startTopic}
          </button>
        ) : null}
      </div>
    </section>
  );
}
