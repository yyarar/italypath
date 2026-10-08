"use client";

import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";

import ImatQuestionCard from "@/components/imat/ImatQuestionCard";
import { formatTopicLabel } from "@/components/imat/practice/labels";
import { useLanguage } from "@/context/LanguageContext";
import type { ImatChoiceKey, ImatQuestion, ImatTopic } from "@/lib/imat/types";
import { isMcqAnswerCorrect } from "@/lib/sat/answers";

interface PracticeSessionProps {
  topic: ImatTopic;
  questions: ImatQuestion[];
  onAnswered: (questionId: string, letter: ImatChoiceKey, isCorrect: boolean) => void;
  onFinish: (total: number, correct: number) => void;
}

// Bir konunun sorulari sirayla: sik sec, "Cevabi Kontrol Et", dogru/yanlis geri bildirimi, sonraki soru.
// Soru sirasi ust bilesende kurulur ve oturum boyunca sabit kalir.
export default function PracticeSession({ topic, questions, onAnswered, onFinish }: PracticeSessionProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<ImatChoiceKey | null>(null);
  // null: henuz kontrol edilmedi; true/false: kontrol edildi, cevap dogru/yanlis.
  const [result, setResult] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const missingKeyLogged = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [index, reduceMotion]);

  const question = questions[index];
  if (!question) return null;
  const revealed = result !== null;
  const isLast = index === questions.length - 1;

  function checkAnswer() {
    if (!selected || revealed) return;
    const correctAnswer = question.correctAnswer;
    if (correctAnswer === null && !missingKeyLogged.current) {
      missingKeyLogged.current = true;
      console.error("IMAT pratik sorusunda cevap anahtari yok:", question.id);
    }
    const isCorrect = correctAnswer !== null && isMcqAnswerCorrect(selected, [correctAnswer]);
    setResult(isCorrect);
    if (isCorrect) setCorrectCount((count) => count + 1);
    onAnswered(question.id, selected, isCorrect);
  }

  function goNext() {
    if (isLast) {
      onFinish(questions.length, correctCount);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setResult(null);
  }

  const actionClassName =
    "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--editorial-sage)] px-6 py-3 text-sm font-bold text-white shadow-[0_7px_18px_rgba(31,79,70,0.16)] outline-none transition-colors hover:bg-[#173d36] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

  return (
    <section>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
        {formatTopicLabel(topic, t.imat)} · {index + 1} / {questions.length}
      </p>

      <ImatQuestionCard
        key={question.id}
        question={question}
        mode="practice"
        selected={selected}
        revealed={revealed}
        onSelect={(letter) => {
          if (!revealed) setSelected(letter);
        }}
      />

      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {/* Canli bolge her zaman DOM'da kalir; icerik cevap kontrol edilince dolar. */}
        <p
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 text-[13px] font-semibold ${
            revealed ? "mb-3 sm:mb-0" : ""
          } ${result ? "text-[var(--editorial-sage)]" : "text-[var(--editorial-terracotta-ink)]"}`}
        >
          {revealed ? (
            <>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  result ? "bg-[var(--editorial-sage-soft)]" : "bg-[rgba(183,91,56,0.1)]"
                }`}
              >
                {result ? (
                  <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                ) : (
                  <X className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                )}
              </span>
              <span>
                {result ? t.imat.practice.correctFeedback : t.imat.practice.wrongFeedback}
                {!result && question.correctAnswer ? <> {question.correctAnswer}</> : null}
              </span>
            </>
          ) : null}
        </p>

        {revealed ? (
          <m.button
            type="button"
            onClick={goNext}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            className={actionClassName}
          >
            {isLast ? t.imat.practice.finishTopic : t.imat.practice.nextQuestion}
            <ArrowRight className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          </m.button>
        ) : (
          <m.button
            type="button"
            onClick={checkAnswer}
            disabled={!selected}
            whileTap={reduceMotion || !selected ? undefined : { scale: 0.97 }}
            className={actionClassName}
          >
            {t.imat.practice.checkAnswer}
          </m.button>
        )}
      </div>
    </section>
  );
}
