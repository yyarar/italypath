"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import ImatQuestionCard from "@/components/imat/ImatQuestionCard";
import { fillTemplate, formatScore } from "@/components/imat/mock/format";
import { useLanguage } from "@/context/LanguageContext";
import { MAX_SCORE } from "@/lib/imat/scoring.mjs";
import type { ImatExamSession, ImatQuestion } from "@/lib/imat/types";
import { fetchImatReview } from "@/lib/imat/useImatBank";

interface MockExamReviewProps {
  sessionId: string;
  onBack: () => void;
}

type ReviewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; session: ImatExamSession; questions: ImatQuestion[] };

function ignoreSelect() {
  // Inceleme salt okunur; sik dugmeleri zaten kapali.
}

// Teslim edilmis denemenin incelemesi: her soruda dogru sik ve ogrencinin harfi (cevap anahtari yalniz burada).
export default function MockExamReview({ sessionId, onBack }: MockExamReviewProps) {
  const { t, language } = useLanguage();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; state: ReviewState }>({
    key: `${sessionId}:0`,
    state: { status: "loading" },
  });
  const requestKey = `${sessionId}:${attempt}`;
  const state: ReviewState = result.key === requestKey ? result.state : { status: "loading" };

  useEffect(() => {
    let active = true;
    fetchImatReview(sessionId)
      .then((data) => {
        if (!active) return;
        // Kagit sirasi (soru numarasi).
        const questions = [...data.questions].sort((a, b) => a.number - b.number);
        setResult({ key: requestKey, state: { status: "ready", session: data.session, questions } });
      })
      .catch(() => {
        if (active) setResult({ key: requestKey, state: { status: "error" } });
      });
    return () => {
      active = false;
    };
  }, [requestKey, sessionId]);

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

      {state.status === "loading" ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-24 rounded-[1.4rem] bg-[var(--editorial-surface)] shimmer" />
          <div className="h-64 rounded-[1.4rem] bg-[var(--editorial-surface)] shimmer" />
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.imat.loading}
          </p>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-3 py-2">
          <p role="alert" className="text-[13px] text-[var(--editorial-terracotta-ink)]">
            {t.imat.mock.reviewError}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="min-h-11 rounded-xl px-3 text-xs font-semibold text-[var(--editorial-sage)] outline-none transition-colors hover:bg-[var(--editorial-sage-soft)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)]"
          >
            {t.imat.retry}
          </button>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <header className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
              {t.imat.tabMock} · {state.session.year}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-normal tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-4xl">
              {t.imat.mock.review}
            </h2>
            {state.session.score !== null ? (
              <p className="mt-3 font-serif text-2xl tabular-nums text-[var(--editorial-sage)]">
                {fillTemplate(t.imat.mock.scoreOf, { score: formatScore(state.session.score, language), max: MAX_SCORE })}
              </p>
            ) : null}
          </header>

          <ol className="space-y-8">
            {state.questions.map((question, index) => {
              const letter = state.session.answers?.[question.id] ?? null;
              const outcome = letter === null ? "blank" : letter === question.correctAnswer ? "correct" : "wrong";
              const outcomeTone =
                outcome === "correct"
                  ? "text-[var(--editorial-sage)]"
                  : outcome === "wrong"
                    ? "text-[var(--editorial-terracotta-ink)]"
                    : "text-[var(--editorial-muted)]";
              return (
                <li key={question.id}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)] tabular-nums">
                      {index + 1} / {state.questions.length}
                    </span>
                    <span className={`text-[13px] font-semibold ${outcomeTone}`}>
                      {t.imat.mock.yourAnswer}: {letter ?? t.imat.mock.blank}
                    </span>
                  </div>
                  <ImatQuestionCard
                    question={question}
                    mode="practice"
                    selected={letter}
                    revealed
                    onSelect={ignoreSelect}
                  />
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
    </section>
  );
}
