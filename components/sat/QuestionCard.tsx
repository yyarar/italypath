"use client";

import { useState } from "react";

import MathText from "@/components/sat/MathText";
import { useLanguage } from "@/context/LanguageContext";
import { isMcqAnswerCorrect, isSprAnswerCorrect } from "@/lib/sat/answers";
import type { SatChoiceKey, SatQuestion } from "@/lib/sat/types";

const CHOICE_KEYS: SatChoiceKey[] = ["A", "B", "C", "D"];
const DIFFICULTY_LABEL_KEYS = { 1: "difficultyEasy", 2: "difficultyMedium", 3: "difficultyHard" } as const;

interface QuestionCardProps {
  question: SatQuestion;
  onAnswered: (selectedAnswer: string, isCorrect: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}

export default function QuestionCard({ question, onAnswered, onNext, isLast }: QuestionCardProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const [sprInput, setSprInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  const answered = result !== null;

  function submit(answer: string) {
    if (answered || !answer.trim()) return;
    const correct =
      question.questionType === "mcq"
        ? isMcqAnswerCorrect(answer, question.correctAnswer)
        : isSprAnswerCorrect(answer, question.correctAnswer);
    setSelected(answer);
    setResult(correct ? "correct" : "wrong");
    onAnswered(answer, correct);
  }

  return (
    <article className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 sm:p-6">
      <header className="mb-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
        <span className="border border-[var(--editorial-border)] px-2 py-1">
          {question.domain} · {question.skill}
        </span>
        <span className="border border-[var(--editorial-sage)] px-2 py-1 text-[var(--editorial-sage)]">
          {t.sat[DIFFICULTY_LABEL_KEYS[question.difficulty]]}
        </span>
      </header>

      <div className="mb-5 whitespace-pre-line text-[15px] leading-7 text-[var(--editorial-ink)]">
        <MathText text={question.prompt} />
      </div>

      {question.figureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.figureUrl}
          alt={t.sat.figureAlt}
          className="mb-5 max-w-full border border-[var(--editorial-border)] bg-white"
          loading="lazy"
        />
      ) : null}

      {question.questionType === "mcq" && question.choices ? (
        <div className="grid gap-2">
          {CHOICE_KEYS.map((key) => {
            const isSelected = selected === key;
            const isCorrectChoice = answered && question.correctAnswer.includes(key);
            return (
              <button
                key={key}
                type="button"
                disabled={answered}
                onClick={() => submit(key)}
                className={`flex min-h-12 items-start gap-3 border px-4 py-3 text-left text-[14px] leading-6 transition-colors disabled:cursor-default ${
                  isCorrectChoice
                    ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)]"
                    : isSelected && result === "wrong"
                      ? "border-[var(--editorial-terracotta)] bg-[rgba(191,95,74,0.08)]"
                      : "border-[var(--editorial-border)] bg-[var(--editorial-surface)] hover:bg-[rgba(216,222,217,0.25)]"
                }`}
              >
                <span className="font-semibold text-[var(--editorial-sage)]">{key}</span>
                <MathText text={question.choices?.[key] ?? ""} />
              </button>
            );
          })}
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(sprInput);
          }}
          className="flex flex-wrap items-center gap-3"
        >
          <input
            type="text"
            inputMode="decimal"
            value={sprInput}
            disabled={answered}
            onChange={(event) => setSprInput(event.target.value)}
            placeholder={t.sat.sprPlaceholder}
            className="min-h-12 min-w-0 flex-1 border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 py-3 text-[14px] text-[var(--editorial-ink)] outline-none transition-colors placeholder:text-[var(--editorial-muted)] focus:border-[var(--editorial-sage)] disabled:opacity-70"
            aria-label={t.sat.sprPlaceholder}
          />
          {!answered ? (
            <button
              type="submit"
              className="min-h-12 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] active:translate-y-[1px]"
            >
              {t.sat.checkAnswer}
            </button>
          ) : null}
          <p className="w-full text-[12px] text-[var(--editorial-muted)]">{t.sat.sprHint}</p>
        </form>
      )}

      {answered ? (
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--editorial-border)] pt-4">
          <p
            className={
              result === "correct"
                ? "text-[13px] font-semibold text-[var(--editorial-sage)]"
                : "text-[13px] font-semibold text-[var(--editorial-terracotta)]"
            }
          >
            {result === "correct" ? (
              t.sat.correctFeedback
            ) : (
              <>
                {t.sat.wrongFeedback} <MathText text={question.correctAnswer.join(", ")} />
              </>
            )}
          </p>
          <button
            type="button"
            onClick={onNext}
            className="border border-[var(--editorial-sage)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-colors hover:bg-[rgba(216,222,217,0.25)] active:translate-y-[1px]"
          >
            {isLast ? t.sat.finishTopic : t.sat.nextQuestion}
          </button>
        </footer>
      ) : null}
    </article>
  );
}
