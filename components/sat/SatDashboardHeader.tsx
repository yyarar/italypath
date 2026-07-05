"use client";

import { Check, Flame, Zap } from "lucide-react";

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
  const readiness = clampPercent(readinessPct);
  const dailyProgress = clampPercent((todayCount / DAILY_GOAL) * 100);
  const xpProgress = clampPercent(levelProgress.progressPct);
  const dailyDone = todayCount >= DAILY_GOAL;
  const radius = 44;
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

  return (
    <section className="mb-8 border-y border-[var(--editorial-border)] py-6 sm:py-7">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
          ITALYPATH
        </p>
        <h1 className="mt-3 font-serif text-3xl font-normal leading-tight text-[var(--editorial-ink)] sm:text-4xl">
          {t.sat.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">{t.sat.subtitle}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <article className="flex min-h-[210px] flex-col items-center justify-center border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 text-center">
          <div className="relative mb-4 h-32 w-32">
            <svg aria-hidden="true" viewBox="0 0 112 112" className="h-32 w-32 -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke="var(--editorial-border)"
                strokeWidth="9"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke="var(--editorial-sage)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-3xl text-[var(--editorial-ink)]">{readiness}%</span>
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
            {t.sat.dashboardReadinessLabel}
          </p>
        </article>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-4xl leading-none text-[var(--editorial-ink)]">{streak}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
                    {streak === 0 ? t.sat.dashboardStreakEmpty : t.sat.dashboardStreakLabel}
                  </p>
                </div>
                <Flame className="h-6 w-6 text-[var(--editorial-terracotta)]" strokeWidth={2} />
              </div>
            </article>

            <article className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-4xl leading-none text-[var(--editorial-ink)]">
                    {todayCount}/{DAILY_GOAL}
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
                    {t.sat.dashboardDailyLabel}
                  </p>
                </div>
                {dailyDone ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-sage)]">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    {t.sat.dashboardDailyDone}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 h-1.5 overflow-hidden bg-[var(--editorial-border)]">
                <div
                  className="h-full bg-[var(--editorial-sage)] transition-[width] duration-500"
                  style={{ width: `${dailyProgress}%` }}
                />
              </div>
            </article>

            <article className="border border-[#b8872f] bg-[var(--editorial-surface)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-4xl leading-none text-[var(--editorial-ink)]">
                    {levelProgress.level}
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
                    {t.sat.levelLabel} {levelProgress.level}
                  </p>
                </div>
                <span className="flex h-7 w-7 items-center justify-center border border-[#b8872f] text-[12px] font-bold text-[#b8872f]">
                  XP
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden bg-[var(--editorial-border)]">
                <div className="h-full bg-[#b8872f] transition-[width] duration-500" style={{ width: `${xpProgress}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-[var(--editorial-muted)]">
                {levelProgress.xpIntoLevel}/{levelProgress.xpForNext} XP ·{" "}
                {t.sat.levelXpToNext.replace("{n}", String(levelProgress.xpToNext))}
              </p>
            </article>
          </div>

          <aside className="border border-[var(--editorial-border)] bg-[var(--editorial-band)] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
                <Zap className="h-4 w-4" fill="currentColor" strokeWidth={2} />
                {t.sat.focusEyebrow}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--editorial-ink)]">{focusBody}</p>
            </div>
            <button
              type="button"
              onClick={onFocus}
              className="mt-4 inline-flex min-h-10 items-center justify-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px] sm:mt-0 sm:shrink-0"
            >
              {focusCta}
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
