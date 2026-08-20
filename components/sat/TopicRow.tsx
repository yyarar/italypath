"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Award, Check, Trophy, type LucideIcon } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { SatDifficultyFilter } from "@/lib/sat/domains";
import { accuracyPct, masteryTier, type MasteryTier } from "@/lib/sat/mastery";
import type { SatTopic } from "@/lib/sat/types";

interface TopicRowProps {
  topic: SatTopic;
  solvedCount: number;
  correctCount: number;
  wrongCount: number;
  armed: boolean;
  onSelect: () => void;
  onSelectDifficulty: (difficulty: SatDifficultyFilter) => void;
}

const tierMeta: Record<MasteryTier, { textClassName: string; barClassName: string; Icon: LucideIcon | null }> = {
  gold: { textClassName: "text-[var(--editorial-terracotta)]", barClassName: "bg-[var(--editorial-terracotta)]", Icon: Trophy },
  silver: { textClassName: "text-[var(--editorial-sage)]", barClassName: "bg-[var(--editorial-sage)]", Icon: Award },
  bronze: { textClassName: "text-[var(--editorial-terracotta)]", barClassName: "bg-[var(--editorial-terracotta)]", Icon: Award },
  weak: { textClassName: "text-[var(--editorial-terracotta)]", barClassName: "bg-[var(--editorial-terracotta)]", Icon: null },
  none: { textClassName: "text-[var(--editorial-muted)]", barClassName: "bg-[var(--editorial-border)]", Icon: null },
};

export default function TopicRow({
  topic,
  solvedCount,
  correctCount,
  wrongCount,
  armed,
  onSelect,
  onSelectDifficulty,
}: TopicRowProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const started = solvedCount > 0;
  const remaining = Math.max(topic.questionCount - solvedCount, 0);
  const tier = masteryTier(solvedCount, correctCount, topic.questionCount);
  const accuracy = accuracyPct(correctCount, solvedCount);
  const tierLabel = {
    gold: t.sat.masteryGold,
    silver: t.sat.masterySilver,
    bronze: t.sat.masteryBronze,
    weak: t.sat.masteryWeak,
    none: t.sat.masteryNone,
  } satisfies Record<MasteryTier, string>;
  const TierIcon = tierMeta[tier].Icon;
  const actionLabel = solvedCount === 0 ? t.sat.startTopic : remaining > 0 ? t.sat.continueTopic : t.sat.topicCompletedLabel;
  const difficultyOptions: { value: SatDifficultyFilter; label: string; primary?: boolean }[] = [
    { value: "mixed", label: t.sat.difficultyMixed, primary: true },
    { value: 1, label: t.sat.difficultyEasy },
    { value: 2, label: t.sat.difficultyMedium },
    { value: 3, label: t.sat.difficultyHard },
  ];
  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, bounce: 0, duration: 0.34 };

  return (
    <motion.div layout="position" transition={spring} className="border-b border-[var(--editorial-border)] last:border-b-0">
      <motion.button
        type="button"
        aria-expanded={armed}
        onClick={onSelect}
        whileTap={reduceMotion ? undefined : { scale: 0.994 }}
        transition={spring}
        className={`group grid min-h-[5.25rem] w-full gap-4 px-4 py-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--editorial-sage)] sm:grid-cols-[minmax(15rem,1.2fr)_minmax(10rem,0.7fr)_7rem_auto] sm:items-center sm:px-6 ${
          armed ? "bg-[rgba(219,232,225,0.42)]" : "hover:bg-[rgba(219,232,225,0.24)]"
        }`}
      >
        <div className="min-w-0">
          <p className="font-serif text-lg leading-snug tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-xl">{topic.skill}</p>
          <p className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold ${tierMeta[tier].textClassName}`}>
            {TierIcon ? <TierIcon className="h-3.5 w-3.5" strokeWidth={1.9} /> : null}
            {tierLabel[tier]}
            {wrongCount > 0 ? <span className="font-normal text-[var(--editorial-terracotta)]">· {wrongCount} {t.sat.wrongLabel}</span> : null}
          </p>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-[var(--editorial-muted)]">
            <span>{started ? `${accuracy}%` : `0%`}</span>
            <span>{solvedCount}/{topic.questionCount}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--editorial-border)]">
            <motion.div
              className={`h-full rounded-full ${tierMeta[tier].barClassName}`}
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${accuracy}%` }}
              transition={spring}
            />
          </div>
        </div>

        <p className="text-xs leading-5 text-[var(--editorial-muted)] sm:text-right">
          {started ? `${correctCount}/${solvedCount} ${t.sat.correctLabel}` : `${topic.questionCount} ${t.sat.questionsLabel}`}
        </p>

        <span className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-xl border border-[rgba(31,79,70,0.42)] bg-[rgba(255,254,250,0.72)] px-4 text-xs font-bold text-[var(--editorial-sage)] shadow-[0_3px_10px_rgba(21,32,28,0.03)] transition-colors group-hover:border-[var(--editorial-sage)] group-hover:bg-white sm:justify-self-end">
          {remaining === 0 && started ? <Check className="h-4 w-4" strokeWidth={2} /> : null}
          {actionLabel}
          {remaining > 0 || !started ? <ArrowRight className="h-4 w-4" strokeWidth={1.9} /> : null}
        </span>
      </motion.button>

      <AnimatePresence initial={false}>
        {armed ? (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-[rgba(31,79,70,0.12)] bg-[rgba(245,241,232,0.66)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs font-semibold text-[var(--editorial-muted)]">{t.sat.difficultySelectLabel}</p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {difficultyOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => onSelectDifficulty(option.value)}
                    whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                    transition={spring}
                    className={
                      option.primary
                        ? "min-h-10 rounded-xl bg-[var(--editorial-sage)] px-4 text-xs font-bold text-white outline-none transition-colors hover:bg-[#173d36] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2"
                        : "min-h-10 rounded-xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 text-xs font-bold text-[var(--editorial-sage)] outline-none transition-colors hover:border-[var(--editorial-sage)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2"
                    }
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
