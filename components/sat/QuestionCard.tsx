"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";

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
  const reduceMotion = useReducedMotion();
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
    <article className="overflow-hidden rounded-[1.4rem] border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.88)] p-5 shadow-[0_18px_50px_rgba(21,32,28,0.06)] backdrop-blur-xl sm:p-7">
      <header className="mb-6 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--editorial-muted)]">
        <span className="rounded-lg bg-[var(--editorial-band)] px-2.5 py-1.5">
          {question.domain} · {question.skill}
        </span>
        <span className="rounded-lg bg-[var(--editorial-sage-soft)] px-2.5 py-1.5 text-[var(--editorial-sage)]">
          {t.sat[DIFFICULTY_LABEL_KEYS[question.difficulty]]}
        </span>
      </header>

      <div className="mb-7 whitespace-pre-line text-base leading-8 text-[var(--editorial-ink)]">
        <MathText text={question.prompt} />
      </div>

      {question.figureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.figureUrl}
          alt={t.sat.figureAlt}
          className="mb-7 max-w-full rounded-xl border border-[var(--editorial-border)] bg-white"
          loading="lazy"
        />
      ) : null}

      {question.questionType === "mcq" && question.choices ? (
        <div className="grid gap-2.5">
          {CHOICE_KEYS.map((key) => {
            const isSelected = selected === key;
            const isCorrectChoice = answered && question.correctAnswer.includes(key);
            return (
              <motion.button
                key={key}
                type="button"
                disabled={answered}
                onClick={() => submit(key)}
                whileTap={answered || reduceMotion ? undefined : { scale: 0.985 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.28 }}
                className={`flex min-h-14 items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-[14px] leading-6 outline-none transition-colors disabled:cursor-default focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2 ${
                  isCorrectChoice
                    ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)] shadow-[0_4px_14px_rgba(31,79,70,0.08)]"
                    : isSelected && result === "wrong"
                      ? "border-[var(--editorial-terracotta)] bg-[rgba(191,95,74,0.08)]"
                      : "border-[var(--editorial-border)] bg-[rgba(255,254,250,0.82)] hover:border-[rgba(31,79,70,0.38)] hover:bg-white"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--editorial-border)] font-semibold text-[var(--editorial-sage)]">{key}</span>
                <MathText text={question.choices?.[key] ?? ""} />
              </motion.button>
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
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 py-3 text-[14px] text-[var(--editorial-ink)] outline-none transition-colors placeholder:text-[var(--editorial-muted)] focus:border-[var(--editorial-sage)] focus:ring-2 focus:ring-[rgba(31,79,70,0.12)] disabled:opacity-70"
            aria-label={t.sat.sprPlaceholder}
          />
          {!answered ? (
            <motion.button
              type="submit"
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              className="min-h-12 rounded-xl bg-[var(--editorial-sage)] px-5 py-3 text-xs font-bold text-white shadow-[0_7px_18px_rgba(31,79,70,0.16)] transition-colors hover:bg-[#173d36]"
            >
              {t.sat.checkAnswer}
            </motion.button>
          ) : null}
          <p className="w-full text-[12px] text-[var(--editorial-muted)]">{t.sat.sprHint}</p>
        </form>
      )}

      {answered ? (
        <footer className="mt-6 border-t border-[var(--editorial-border)] pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={`flex items-center gap-2 ${
                result === "correct"
                  ? "text-[13px] font-semibold text-[var(--editorial-sage)]"
                  : "text-[13px] font-semibold text-[var(--editorial-terracotta)]"
              }`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${result === "correct" ? "bg-[var(--editorial-sage-soft)]" : "bg-[rgba(183,91,56,0.1)]"}`}>
                {result === "correct" ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <X className="h-4 w-4" strokeWidth={2.4} />}
              </span>
              {result === "correct" ? (
                t.sat.correctFeedback
              ) : (
                <>
                  {t.sat.wrongFeedback} <MathText text={question.correctAnswer.join(", ")} />
                </>
              )}
            </p>
            <motion.button
              type="button"
              onClick={onNext}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--editorial-sage)] px-5 py-2.5 text-xs font-bold text-white shadow-[0_7px_18px_rgba(31,79,70,0.14)] transition-colors hover:bg-[#173d36]"
            >
              {isLast ? t.sat.finishTopic : t.sat.nextQuestion}
              <ArrowRight className="h-4 w-4" strokeWidth={1.9} />
            </motion.button>
          </div>
          {question.explanationEn ? (
            <section className="mt-5 rounded-xl border border-[var(--editorial-border)] bg-[var(--editorial-paper)] p-4 text-[14px] leading-7 text-[var(--editorial-ink)] sm:p-5">
              <h3 className="mb-2 text-xs font-bold text-[var(--editorial-sage)]">
                {t.sat.explanationTitle}
              </h3>
              <div className="whitespace-pre-line">
                <MathText text={question.explanationEn} />
              </div>
            </section>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
