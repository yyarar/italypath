"use client";

import { m, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";

import MathText from "@/components/sat/MathText";
import PassageText from "@/components/sat/PassageText";
import { useLanguage } from "@/context/LanguageContext";
import { CHOICE_KEYS } from "@/lib/imat/scoring.mjs";
import type { ImatChoiceKey, ImatQuestion } from "@/lib/imat/types";

interface ImatQuestionCardProps {
  question: ImatQuestion;
  // exam: secim yalniz vurgulanir, dogru/yanlis gosterilmez (deneme yaniti cevap anahtari tasimaz).
  // practice + revealed: dogru sik yesil, yanlis secim kirmizi (SAT QuestionCard gorunumu).
  mode: "practice" | "exam";
  selected: ImatChoiceKey | null;
  revealed: boolean;
  onSelect: (letter: ImatChoiceKey) => void;
}

// Deneme ve konu pratiginin ortak soru karti: bes sik (A-E), gorsel soru metninin altinda.
export default function ImatQuestionCard({
  question,
  mode,
  selected,
  revealed,
  onSelect,
}: ImatQuestionCardProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const showKey = mode === "practice" && revealed;
  const topicLabel =
    mode === "practice"
      ? (t.imat.topics as Record<string, string>)[question.topicSlug] ?? question.topic
      : null;

  return (
    <article className="overflow-hidden rounded-[1.4rem] border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.88)] p-5 shadow-[0_18px_50px_rgba(21,32,28,0.06)] backdrop-blur-xl sm:p-7">
      <header className="mb-6 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--editorial-muted)]">
        <span className="rounded-lg bg-[var(--editorial-band)] px-2.5 py-1.5">{t.imat.sections[question.section]}</span>
        {topicLabel ? (
          <span className="rounded-lg bg-[var(--editorial-sage-soft)] px-2.5 py-1.5 text-[var(--editorial-sage)]">{topicLabel}</span>
        ) : null}
      </header>

      <div className="mb-7 whitespace-pre-line break-words text-base leading-8 text-[var(--editorial-ink)]">
        {question.section === "reading-general" ? (
          <PassageText text={question.prompt} />
        ) : (
          <MathText text={question.prompt} />
        )}
      </div>

      {question.figureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.figureUrl}
          alt={t.imat.figureAlt}
          className="mb-7 max-w-full rounded-xl border border-[var(--editorial-border)] bg-white"
          loading="lazy"
        />
      ) : null}

      <div className="grid gap-2.5">
        {CHOICE_KEYS.map((key) => {
          const isSelected = selected === key;
          const isCorrectChoice = showKey && question.correctAnswer === key;
          const isWrongSelection = showKey && isSelected && !isCorrectChoice;
          let tone = "border-[var(--editorial-border)] bg-[rgba(255,254,250,0.82)] hover:border-[rgba(31,79,70,0.38)] hover:bg-white";
          if (isCorrectChoice) {
            tone = "border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)] shadow-[0_4px_14px_rgba(31,79,70,0.08)]";
          } else if (isWrongSelection) {
            tone = "border-[var(--editorial-terracotta)] bg-[rgba(191,95,74,0.08)]";
          } else if (isSelected && !showKey) {
            tone = "border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)] shadow-[0_4px_14px_rgba(31,79,70,0.08)]";
          }
          const badgeTone =
            isSelected && !showKey
              ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white"
              : "border-[var(--editorial-border)] text-[var(--editorial-sage)]";

          return (
            <m.button
              key={key}
              type="button"
              disabled={showKey}
              aria-pressed={showKey ? undefined : isSelected}
              onClick={() => onSelect(key)}
              whileTap={showKey || reduceMotion ? undefined : { scale: 0.985 }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.28 }}
              className={`flex min-h-14 items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-[14px] leading-6 text-[var(--editorial-ink)] outline-none transition-colors disabled:cursor-default focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2 ${tone}`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-semibold ${badgeTone}`}>
                {key}
              </span>
              <MathText text={question.choices[key] ?? ""} className="min-w-0 flex-1 break-words" />
              {isCorrectChoice ? (
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--editorial-sage)]" strokeWidth={2.4} aria-hidden="true" />
              ) : null}
              {isWrongSelection ? (
                <X className="mt-0.5 h-5 w-5 shrink-0 text-[var(--editorial-terracotta-ink)]" strokeWidth={2.4} aria-hidden="true" />
              ) : null}
            </m.button>
          );
        })}
      </div>
    </article>
  );
}
