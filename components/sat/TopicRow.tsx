"use client";

import { Award, Trophy, type LucideIcon } from "lucide-react";

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

const tierMeta: Record<
  MasteryTier,
  {
    badgeClassName: string;
    barClassName: string;
    Icon: LucideIcon | null;
  }
> = {
  gold: {
    badgeClassName: "border-[var(--editorial-terracotta)] bg-[rgba(183,91,56,0.1)] text-[var(--editorial-terracotta)]",
    barClassName: "bg-[var(--editorial-terracotta)]",
    Icon: Trophy,
  },
  silver: {
    badgeClassName: "border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)]",
    barClassName: "bg-[var(--editorial-sage)]",
    Icon: Award,
  },
  bronze: {
    badgeClassName: "border-[rgba(183,91,56,0.55)] bg-[rgba(183,91,56,0.08)] text-[var(--editorial-terracotta)]",
    barClassName: "bg-[var(--editorial-terracotta)]",
    Icon: Award,
  },
  weak: {
    badgeClassName: "border-[var(--editorial-terracotta)] bg-[rgba(183,91,56,0.08)] text-[var(--editorial-terracotta)]",
    barClassName: "bg-[var(--editorial-terracotta)]",
    Icon: null,
  },
  none: {
    badgeClassName: "border-dashed border-[var(--editorial-border)] bg-transparent text-[var(--editorial-muted)]",
    barClassName: "bg-[var(--editorial-border)]",
    Icon: null,
  },
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
  const actionLabel =
    solvedCount === 0
      ? t.sat.startTopic
      : remaining > 0
        ? `${t.sat.continueTopic} · ${remaining} ${t.sat.remainingLabel}`
        : t.sat.topicCompletedLabel;
  const difficultyOptions: { value: SatDifficultyFilter; label: string; primary?: boolean }[] = [
    { value: "mixed", label: t.sat.difficultyMixed, primary: true },
    { value: 1, label: t.sat.difficultyEasy },
    { value: 2, label: t.sat.difficultyMedium },
    { value: 3, label: t.sat.difficultyHard },
  ];

  return (
    <div
      className={`bg-[var(--editorial-surface)] transition-colors ${
        armed
          ? "border border-[var(--editorial-sage)]"
          : started
            ? "border border-[var(--editorial-border)]"
            : "border border-dashed border-[var(--editorial-border)]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="group grid w-full gap-4 p-4 text-left transition-colors hover:bg-[rgba(216,222,217,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px] sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif text-lg leading-snug text-[var(--editorial-ink)]">{topic.skill}</p>
            <span
              className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${tierMeta[tier].badgeClassName}`}
            >
              {TierIcon ? <TierIcon className="h-3.5 w-3.5" strokeWidth={2.2} /> : null}
              {tierLabel[tier]}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-[var(--editorial-muted)]">
            {topic.questionCount} {t.sat.questionsLabel}
            {started ? ` · ${solvedCount} ${t.sat.solvedLabel} · ${correctCount} ${t.sat.correctLabel}` : ""}
            {wrongCount > 0 ? ` · ${wrongCount} ${t.sat.wrongLabel}` : ""}
          </p>
          <div className="mt-4 h-1.5 overflow-hidden bg-[var(--editorial-border)]">
            <div
              className={`h-full transition-[width] duration-500 ${tierMeta[tier].barClassName}`}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>
        {started ? (
          <div className="flex shrink-0 items-end justify-between gap-4 sm:block sm:text-right">
            <div>
              <p className="font-serif text-3xl leading-none text-[var(--editorial-ink)]">{accuracy}%</p>
              <p className="mt-1 text-[12px] text-[var(--editorial-muted)]">
                {correctCount}/{solvedCount} {t.sat.correctLabel}
              </p>
            </div>
            <span className="mt-3 inline-block border-b border-[var(--editorial-sage)] pb-px text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-sage)]">
              {actionLabel}
            </span>
          </div>
        ) : (
          <span className="shrink-0 self-center border-b border-[var(--editorial-sage)] pb-px text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-sage)]">
            {t.sat.startTopic} →
          </span>
        )}
      </button>
      {armed ? (
        <div className="border-t border-[var(--editorial-border)] px-4 pb-4 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
            {t.sat.difficultySelectLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {difficultyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelectDifficulty(option.value)}
                className={
                  option.primary
                    ? "border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
                    : "border border-[var(--editorial-border)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-sage)] transition-colors hover:border-[var(--editorial-sage)] hover:bg-[rgba(216,222,217,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
