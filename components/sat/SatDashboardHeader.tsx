"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Flame, Target, TrendingUp } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { LevelProgress } from "@/lib/sat/levels";
import { DAILY_GOAL } from "@/lib/sat/mastery";
import type { SatTopic } from "@/lib/sat/types";

export type SatFocusRecommendation = {
  topic: SatTopic;
  kind: "weak" | "start" | "continue";
  accuracyPct: number;
};

interface SatDashboardHeaderProps {
  readinessPct: number;
  streak: number;
  todayCount: number;
  levelProgress: LevelProgress;
  focusRecommendation: SatFocusRecommendation;
  onFocus: () => void;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export default function SatDashboardHeader({
  readinessPct,
  streak,
  todayCount,
  levelProgress,
  focusRecommendation,
  onFocus,
}: SatDashboardHeaderProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const readiness = clampPercent(readinessPct);
  const dailyProgress = clampPercent((todayCount / DAILY_GOAL) * 100);
  const xpProgress = clampPercent(levelProgress.progressPct);
  const dailyDone = todayCount >= DAILY_GOAL;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (readiness / 100) * circumference;

  const focusBody =
    focusRecommendation.kind === "weak"
      ? t.sat.focusWeakBody
          .replace("{topic}", focusRecommendation.topic.skill)
          .replace("{n}", String(focusRecommendation.accuracyPct))
      : focusRecommendation.kind === "start"
        ? t.sat.focusStartBody.replace("{topic}", focusRecommendation.topic.skill)
        : t.sat.focusContinueBody.replace("{topic}", focusRecommendation.topic.skill);

  const focusCta =
    focusRecommendation.kind === "weak"
      ? t.sat.focusWeakCta
      : focusRecommendation.kind === "start"
        ? t.sat.focusStartCta
        : t.sat.focusContinueCta;

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, bounce: 0, duration: 0.38 };

  return (
    <header className="mb-10">
      <div className="mb-8 max-w-3xl">
        <h1 className="font-serif text-[clamp(2.75rem,7vw,5.25rem)] font-normal leading-[0.96] tracking-[-0.045em] text-[var(--editorial-ink)]">
          {t.sat.title}
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--editorial-muted)] sm:text-base">
          {t.sat.subtitle}
        </p>
      </div>

      <section className="overflow-hidden rounded-[1.4rem] border border-[rgba(31,79,70,0.18)] bg-[rgba(255,254,250,0.72)] shadow-[0_18px_50px_rgba(21,32,28,0.06)] backdrop-blur-xl backdrop-saturate-150">
        <div className="grid lg:grid-cols-[15rem_minmax(22rem,1fr)_minmax(19rem,0.9fr)]">
          <div className="flex items-center gap-5 border-b border-[var(--editorial-border)] p-5 sm:p-6 lg:flex-col lg:justify-center lg:border-b-0 lg:border-r">
            <div className="relative h-28 w-28 shrink-0">
              <svg aria-hidden="true" viewBox="0 0 112 112" className="h-28 w-28 -rotate-90">
                <circle cx="56" cy="56" r={radius} fill="none" stroke="var(--editorial-border)" strokeWidth="8" />
                <motion.circle
                  cx="56"
                  cy="56"
                  r={radius}
                  fill="none"
                  stroke="var(--editorial-sage)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={reduceMotion ? false : { strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: strokeOffset }}
                  transition={spring}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-serif text-[2.15rem] tracking-[-0.04em] text-[var(--editorial-ink)]">
                  {readiness}<small className="ml-0.5 text-base">%</small>
                </span>
              </div>
            </div>
            <p className="text-xs font-semibold tracking-[0.02em] text-[var(--editorial-muted)]">
              {t.sat.dashboardReadinessLabel}
            </p>
          </div>

          <div className="grid grid-cols-3 border-b border-[var(--editorial-border)] lg:border-b-0 lg:border-r">
            <div className="flex min-w-0 flex-col items-center justify-center border-r border-[var(--editorial-border)] px-3 py-6 text-center">
              <Flame className="mb-3 h-5 w-5 text-[var(--editorial-terracotta)]" strokeWidth={1.8} />
              <p className="font-serif text-4xl leading-none tracking-[-0.04em] text-[var(--editorial-ink)]">{streak}</p>
              <p className="mt-2 text-[11px] leading-4 text-[var(--editorial-muted)]">
                {streak === 0 ? t.sat.dashboardStreakEmpty : t.sat.dashboardStreakLabel}
              </p>
            </div>

            <div className="flex min-w-0 flex-col items-center justify-center border-r border-[var(--editorial-border)] px-3 py-6 text-center">
              <Target className="mb-3 h-5 w-5 text-[var(--editorial-terracotta)]" strokeWidth={1.8} />
              <p className="font-serif text-4xl leading-none tracking-[-0.04em] text-[var(--editorial-ink)]">
                {todayCount}<small className="text-xl">/{DAILY_GOAL}</small>
              </p>
              <p className="mt-2 flex items-center justify-center gap-1 text-[11px] leading-4 text-[var(--editorial-muted)]">
                {dailyDone ? <Check className="h-3.5 w-3.5 text-[var(--editorial-sage)]" strokeWidth={2.5} /> : null}
                {dailyDone ? t.sat.dashboardDailyDone : t.sat.dashboardDailyLabel}
              </p>
              <div className="mt-3 h-1 w-full max-w-20 overflow-hidden rounded-full bg-[var(--editorial-border)]">
                <motion.div className="h-full rounded-full bg-[var(--editorial-sage)]" initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${dailyProgress}%` }} transition={spring} />
              </div>
            </div>

            <div className="flex min-w-0 flex-col items-center justify-center px-3 py-6 text-center">
              <TrendingUp className="mb-3 h-5 w-5 text-[#9a6c22]" strokeWidth={1.8} />
              <p className="font-serif text-4xl leading-none tracking-[-0.04em] text-[var(--editorial-ink)]">{levelProgress.level}</p>
              <p className="mt-2 text-[11px] leading-4 text-[var(--editorial-muted)]">{t.sat.levelLabel} {levelProgress.level}</p>
              <div className="mt-3 h-1 w-full max-w-20 overflow-hidden rounded-full bg-[var(--editorial-border)]">
                <motion.div className="h-full rounded-full bg-[#b8872f]" initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${xpProgress}%` }} transition={spring} />
              </div>
            </div>
          </div>

          <aside className="flex items-center gap-4 p-5 sm:p-6">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)] sm:flex">
              <Target className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold tracking-[-0.01em] text-[var(--editorial-sage)]">{t.sat.focusEyebrow}</p>
              <p className="mt-1.5 text-sm leading-5 text-[var(--editorial-ink)]">{focusBody}</p>
              <motion.button
                type="button"
                onClick={onFocus}
                whileTap={reduceMotion ? undefined : { scale: 0.975 }}
                transition={spring}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--editorial-terracotta)] px-5 py-2.5 text-[13px] font-bold tracking-[-0.01em] text-white shadow-[0_7px_18px_rgba(183,91,56,0.18)] outline-none transition-colors hover:bg-[#a94e2f] focus-visible:ring-2 focus-visible:ring-[var(--editorial-terracotta)] focus-visible:ring-offset-2"
              >
                {focusCta}
              </motion.button>
            </div>
          </aside>
        </div>
      </section>
    </header>
  );
}
