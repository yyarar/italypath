"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";

import { fillTemplate, formatDateTime, formatScore } from "@/components/imat/mock/format";
import { useLanguage } from "@/context/LanguageContext";
import { MAX_SCORE } from "@/lib/imat/scoring.mjs";
import type { ImatExamSession } from "@/lib/imat/types";

interface ExamHistoryProps {
  // useImatExam().listSessions() sonucu: teslim edilmis oturumlar, en yeni once.
  sessions: ImatExamSession[];
  status: "loading" | "ready" | "error";
  onRetry: () => void;
  onOpen: (sessionId: string) => void;
  onBack: () => void;
}

export default function ExamHistory({ sessions, status, onRetry, onOpen, onBack }: ExamHistoryProps) {
  const { t, language } = useLanguage();

  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--editorial-muted)] outline-none transition-colors hover:bg-white/70 hover:text-[var(--editorial-sage)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
        {t.imat.mock.backToList}
      </button>
      <h2 className="mb-6 font-serif text-3xl font-normal tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-4xl">
        {t.imat.mock.historyTitle}
      </h2>

      {status === "loading" && sessions.length === 0 ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-16 rounded-2xl bg-[var(--editorial-surface)] shimmer" />
          <div className="h-16 rounded-2xl bg-[var(--editorial-surface)] shimmer" />
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-l-2 border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-3 py-2">
          <p role="alert" className="text-[13px] text-[var(--editorial-terracotta-ink)]">
            {t.imat.mock.historyError}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-xl px-3 text-xs font-semibold text-[var(--editorial-sage)] outline-none transition-colors hover:bg-[var(--editorial-sage-soft)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)]"
          >
            {t.imat.retry}
          </button>
        </div>
      ) : null}

      {status === "ready" && sessions.length === 0 ? (
        <p className="rounded-2xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 text-sm text-[var(--editorial-muted)]">
          {t.imat.mock.historyEmpty}
        </p>
      ) : null}

      {sessions.length > 0 ? (
        <ul className="overflow-hidden rounded-[1.4rem] border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.88)] shadow-[0_18px_50px_rgba(21,32,28,0.05)]">
          {sessions.map((session) => (
            <li key={session.id} className="border-b border-[var(--editorial-border)] last:border-b-0">
              <button
                type="button"
                onClick={() => onOpen(session.id)}
                className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-white focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--editorial-sage)] sm:px-5"
              >
                <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
                  <span className="font-serif text-2xl tabular-nums text-[var(--editorial-ink)]">{session.year}</span>
                  <span className="truncate text-[12px] tabular-nums text-[var(--editorial-muted)]">
                    {session.submittedAt ? formatDateTime(session.submittedAt) : ""}
                  </span>
                </span>
                <span className="text-[14px] font-semibold tabular-nums text-[var(--editorial-sage)]">
                  {fillTemplate(t.imat.mock.scoreOf, { score: formatScore(session.score ?? 0, language), max: MAX_SCORE })}
                </span>
                <ChevronRight className="h-4 w-4 text-[var(--editorial-muted)]" strokeWidth={1.9} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
