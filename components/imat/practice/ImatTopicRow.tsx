"use client";

import { m, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { formatTopicLabel } from "@/components/imat/practice/labels";
import { useLanguage } from "@/context/LanguageContext";
import { accuracyPct } from "@/lib/sat/mastery";
import type { ImatTopic } from "@/lib/imat/types";

interface ImatTopicRowProps {
  topic: ImatTopic;
  solvedCount: number;
  correctCount: number;
  wrongCount: number;
  onSelect: () => void;
}

// Bir alt konu satiri: ad, soru/yanlis sayisi, ilerleme cubugu, "Cozmeye Basla" veya "Devam Et".
export default function ImatTopicRow({ topic, solvedCount, correctCount, wrongCount, onSelect }: ImatTopicRowProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const started = solvedCount > 0;
  const total = Math.max(topic.questionCount, 0);
  const progressPct = total > 0 ? Math.min(100, Math.round((solvedCount / total) * 100)) : 0;
  const accuracy = accuracyPct(correctCount, solvedCount);
  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, bounce: 0, duration: 0.34 };

  return (
    <li className="border-b border-[var(--editorial-border)] last:border-b-0">
      <m.button
        type="button"
        onClick={onSelect}
        whileTap={reduceMotion ? undefined : { scale: 0.994 }}
        transition={spring}
        className="group grid min-h-[5.25rem] w-full gap-3.5 px-4 py-4 text-left outline-none transition-colors hover:bg-[rgba(219,232,225,0.24)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--editorial-sage)] sm:grid-cols-[minmax(0,1.3fr)_minmax(9rem,0.7fr)_auto] sm:items-center sm:gap-5 sm:px-6"
      >
        <span className="block min-w-0">
          <span className="block font-serif text-lg leading-snug tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-xl">
            {formatTopicLabel(topic, t.imat)}
          </span>
          <span className="mt-1.5 block text-[11px] font-semibold text-[var(--editorial-muted)]">
            {topic.questionCount} {t.imat.practice.questionsLabel}
            {wrongCount > 0 ? (
              <span className="font-normal text-[var(--editorial-terracotta-ink)]">
                {" "}
                · {wrongCount} {t.imat.practice.wrongLabel}
              </span>
            ) : null}
          </span>
        </span>

        <span className="block min-w-0">
          <span className="mb-2 flex items-center justify-between gap-3 text-[11px] text-[var(--editorial-muted)]">
            <span>
              {solvedCount}/{topic.questionCount} {t.imat.practice.solvedLabel}
            </span>
            {started ? (
              <span>
                {accuracy}% {t.imat.practice.correctLabel}
              </span>
            ) : null}
          </span>
          <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--editorial-border)]">
            <m.span
              className="block h-full rounded-full bg-[var(--editorial-sage)]"
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={spring}
            />
          </span>
        </span>

        <span className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border border-[rgba(31,79,70,0.42)] bg-[rgba(255,254,250,0.72)] px-4 text-xs font-bold text-[var(--editorial-sage)] shadow-[0_3px_10px_rgba(21,32,28,0.03)] transition-colors group-hover:border-[var(--editorial-sage)] group-hover:bg-white sm:justify-self-end">
          {started ? t.imat.practice.continueTopic : t.imat.practice.startTopic}
          <ArrowRight className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
        </span>
      </m.button>
    </li>
  );
}
