"use client";

import { useMemo, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRight, History } from "lucide-react";

import { fillTemplate, formatDateTime, formatScore } from "@/components/imat/mock/MockExamResult";
import { readLocalExams } from "@/components/imat/mock/MockExamRunner";
import { useLanguage } from "@/context/LanguageContext";
import { MAX_SCORE } from "@/lib/imat/scoring.mjs";
import type { ImatExamSession, ImatMockSummary } from "@/lib/imat/types";

interface MockExamListProps {
  mocks: ImatMockSummary[];
  loading: boolean;
  // Katalog yuklenemedi: SAT kalibi gibi "hazirlaniyor" metni.
  catalogError: boolean;
  // Teslim edilmis oturumlar (en yeni once); kartta o yilin son sonucu.
  sessions: ImatExamSession[];
  startingYear: number | null;
  error: string | null;
  onStart: (year: number) => void;
  onResume: (year: number) => void;
  onOpenHistory: () => void;
}

export default function MockExamList({
  mocks,
  loading,
  catalogError,
  sessions,
  startingYear,
  error,
  onStart,
  onResume,
  onOpenHistory,
}: MockExamListProps) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  // Teslim edilmemis denemeler yalniz bu cihazin hafizasinda bilinir. Kartlar katalog yuklendikten
  // sonra (istemcide) cizildigi icin sunucu HTML'i bu degere bagli degildir.
  const [openYears] = useState(() => new Set(readLocalExams().map((record) => record.year)));
  const sortedMocks = useMemo(() => [...mocks].sort((a, b) => b.year - a.year), [mocks]);

  const lastResultByYear = useMemo(() => {
    const byYear = new Map<number, ImatExamSession>();
    for (const session of sessions) {
      if (session.submittedAt && session.score !== null && !byYear.has(session.year)) byYear.set(session.year, session);
    }
    return byYear;
  }, [sessions]);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-2xl font-normal tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-3xl">
          {t.imat.mock.listTitle}
        </h2>
        <button
          type="button"
          onClick={onOpenHistory}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[var(--editorial-sage)] outline-none transition-colors hover:bg-[var(--editorial-sage-soft)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)]"
        >
          <History className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {t.imat.mock.historyTitle}
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-4 border-l-2 border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-3 py-2 text-[13px] leading-6 text-[var(--editorial-terracotta-ink)]"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-3.5 sm:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-44 rounded-[1.4rem] bg-[var(--editorial-surface)] shimmer" />
          ))}
        </div>
      ) : null}

      {!loading && (catalogError || sortedMocks.length === 0) ? (
        <p className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 text-sm text-[var(--editorial-muted)]">
          {t.imat.emptyBank}
        </p>
      ) : null}

      {!loading && sortedMocks.length > 0 ? (
        <ul className="grid gap-3.5 sm:grid-cols-3">
          {sortedMocks.map((mock, index) => {
            const last = lastResultByYear.get(mock.year);
            const resumable = openYears.has(mock.year);
            const starting = startingYear === mock.year;
            return (
              <m.li
                key={mock.year}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col justify-between gap-5 rounded-[1.4rem] border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.88)] p-5 shadow-[0_18px_50px_rgba(21,32,28,0.05)]"
              >
                <div>
                  <p className="font-serif text-4xl font-normal tracking-[-0.04em] text-[var(--editorial-ink)] tabular-nums">
                    {mock.year}
                  </p>
                  <p className="mt-1 text-[12px] font-semibold text-[var(--editorial-muted)]">
                    {mock.questionCount} {t.imat.practice.questionsLabel}
                  </p>
                  {last ? (
                    <p className="mt-3 text-[13px] leading-5 text-[var(--editorial-ink)]">
                      <span className="font-semibold">{t.imat.mock.lastResult}:</span>{" "}
                      <span className="tabular-nums text-[var(--editorial-sage)]">
                        {fillTemplate(t.imat.mock.scoreOf, { score: formatScore(last.score ?? 0, language), max: MAX_SCORE })}
                      </span>
                      <span className="block text-[12px] tabular-nums text-[var(--editorial-muted)]">
                        {last.submittedAt ? formatDateTime(last.submittedAt) : ""}
                      </span>
                    </p>
                  ) : null}
                </div>
                <m.button
                  type="button"
                  onClick={() => (resumable ? onResume(mock.year) : onStart(mock.year))}
                  disabled={startingYear !== null}
                  aria-busy={starting}
                  whileTap={startingYear !== null || reduceMotion ? undefined : { scale: 0.97 }}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-60 ${
                    resumable
                      ? "bg-[var(--editorial-sage)] text-white shadow-[0_7px_18px_rgba(31,79,70,0.14)] hover:bg-[#173d36]"
                      : "border border-[var(--editorial-border)] text-[var(--editorial-sage)] hover:bg-white"
                  }`}
                >
                  {starting ? t.imat.loading : resumable ? t.imat.mock.resume : t.imat.mock.start}
                  {starting ? null : <ArrowRight className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
                </m.button>
              </m.li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
