"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  FileCheck2,
  GraduationCap,
  Landmark,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import { formatStatValue, type UniversityStats } from "@/lib/universityStats";

type FocusId = "programs" | "scholarships" | "application";

interface HeroSectionProps {
  stats: UniversityStats;
}

export default function HeroSection({ stats }: HeroSectionProps) {
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const reduceMotion = useReducedMotion();
  const [focus, setFocus] = useState<FocusId>("programs");
  const copy = t.homeApple;

  const focuses = {
    programs: {
      label: copy.programsTab,
      icon: GraduationCap,
      ...copy.programs,
      statValue: formatStatValue(stats.programsCount),
      href: "/universities",
    },
    scholarships: {
      label: copy.scholarshipsTab,
      icon: Landmark,
      ...copy.scholarships,
      statValue: "20",
      href: "/scholarships",
    },
    application: {
      label: copy.applicationTab,
      icon: FileCheck2,
      ...copy.application,
      href: isSignedIn ? "/hub" : "/giris?mode=kayit",
    },
  };

  const selected = focuses[focus];
  const SelectedIcon = selected.icon;
  const heroStats = [
    { value: formatStatValue(stats.universitiesCount), label: copy.statUniversities },
    { value: formatStatValue(stats.programsCount), label: copy.statPrograms },
    { value: "20", label: copy.statRegions },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-[var(--editorial-paper)] pb-20 pt-32 sm:pt-36 lg:min-h-[92svh] lg:pb-24 lg:pt-40">
      <div className="pointer-events-none absolute -right-36 top-20 -z-10 h-[34rem] w-[34rem] rounded-full bg-[rgba(219,232,225,0.7)] blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-[rgba(231,201,184,0.24)] blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.45 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(31,79,70,0.13)] bg-white/60 px-3.5 py-2 text-xs font-semibold tracking-[0.02em] text-[var(--editorial-sage)] shadow-[0_5px_18px_rgba(21,32,28,0.04)] backdrop-blur-xl">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.eyebrow}
          </div>

          <h1 className="mt-7 max-w-[12ch] font-serif text-[clamp(3.35rem,7.3vw,6.8rem)] font-normal leading-[0.91] tracking-[-0.052em] text-[var(--editorial-ink)]">
            {copy.title}
          </h1>
          <p className="mt-7 max-w-xl text-[1.05rem] leading-8 text-[var(--editorial-muted)] sm:text-xl sm:leading-9">
            {copy.subtitle}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/universities"
              className="home-pressable group inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--editorial-sage)] px-6 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(31,79,70,0.22)] hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--editorial-sage)]"
            >
              {copy.primaryCta}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href={isSignedIn ? "/hub" : "/giris?mode=kayit"}
              className="home-pressable inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(21,32,28,0.14)] bg-white/55 px-6 text-sm font-semibold text-[var(--editorial-ink)] shadow-[0_8px_24px_rgba(21,32,28,0.05)] backdrop-blur-xl hover:bg-white/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--editorial-sage)]"
            >
              {copy.secondaryCta}
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
            {heroStats.map((item) => (
              <div key={item.label} className="flex items-baseline gap-2">
                <span className="text-xl font-semibold tracking-[-0.035em] text-[var(--editorial-ink)]">{item.value}</span>
                <span className="text-sm text-[var(--editorial-muted)]">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.aside
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.55, delay: 0.08 }}
          aria-label={copy.plannerLabel}
          className="home-material relative overflow-hidden rounded-[2rem] p-2 shadow-[0_28px_80px_rgba(21,32,28,0.14)] sm:rounded-[2.5rem] sm:p-3"
        >
          <div className="rounded-[1.55rem] bg-[rgba(255,254,250,0.82)] p-4 sm:rounded-[2rem] sm:p-6">
            <div className="flex items-start justify-between gap-4 px-1 pb-5">
              <div>
                <p className="text-sm font-semibold text-[var(--editorial-ink)]">{copy.plannerLabel}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--editorial-muted)]">{copy.plannerHint}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)]">
                <Compass className="h-[1.1rem] w-[1.1rem]" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-full bg-[rgba(21,32,28,0.055)] p-1" role="tablist" aria-label={copy.plannerLabel}>
              {(Object.keys(focuses) as FocusId[]).map((id) => {
                const item = focuses[id];
                const Icon = item.icon;
                const active = focus === id;

                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFocus(id)}
                    className={`home-pressable relative flex min-h-10 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] sm:text-sm ${
                      active ? "text-[var(--editorial-ink)]" : "text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="home-focus-pill"
                        className="absolute inset-0 rounded-full bg-[var(--editorial-surface)] shadow-[0_3px_12px_rgba(21,32,28,0.09)]"
                        transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                      />
                    )}
                    <Icon className="relative h-3.5 w-3.5" aria-hidden="true" />
                    <span className="relative">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative mt-4 min-h-[25rem] overflow-hidden rounded-[1.4rem] bg-[var(--editorial-ink)] p-5 text-[#faf7f0] sm:min-h-[26rem] sm:rounded-[1.75rem] sm:p-7">
              <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[rgba(219,232,225,0.12)] blur-2xl" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={focus}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -18 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.32 }}
                  className="relative flex min-h-[21.5rem] flex-col"
                >
                  <div className="flex items-center justify-between gap-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#dbe8e1] ring-1 ring-inset ring-white/10">
                      <SelectedIcon className="h-5 w-5" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{selected.statValue}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-[#aebdb7]">{selected.statLabel}</p>
                    </div>
                  </div>

                  <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d8a88e]">{selected.eyebrow}</p>
                  <h2 className="mt-2 max-w-md font-serif text-3xl font-normal leading-[1.04] tracking-[-0.025em] text-white sm:text-[2.15rem]">
                    {selected.title}
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#c8d2ce]">{selected.description}</p>

                  <ol className="mt-6 space-y-2.5">
                    {selected.steps.map((step) => (
                      <li key={step} className="flex items-center gap-3 text-sm text-[#eef2ef]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#dbe8e1] text-[var(--editorial-sage)]">
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>

                  <Link
                    href={selected.href}
                    className="home-pressable group mt-auto flex min-h-12 items-center justify-between rounded-full bg-[#faf7f0] px-5 text-sm font-semibold text-[var(--editorial-ink)] shadow-[0_8px_22px_rgba(0,0,0,0.16)] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#dbe8e1]"
                  >
                    {selected.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
