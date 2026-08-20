"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Calculator, ChevronDown } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

interface SatDomainGroupProps {
  label: string;
  topicCount: number;
  startedCount: number;
  masteryPct: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function SatDomainGroup({
  label,
  topicCount,
  startedCount,
  masteryPct,
  expanded,
  onToggle,
  children,
}: SatDomainGroupProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const progress = clampPercent(masteryPct);
  const summary = t.sat.domainSummary
    .replace("{topicCount}", String(topicCount))
    .replace("{startedCount}", String(startedCount))
    .replace("{masteryPct}", String(progress));
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, bounce: 0, duration: 0.36 };

  return (
    <motion.section
      layout="position"
      transition={spring}
      className="overflow-hidden rounded-2xl border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.82)] shadow-[0_10px_35px_rgba(21,32,28,0.035)]"
    >
      <motion.button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        whileTap={reduceMotion ? undefined : { scale: 0.992 }}
        transition={spring}
        className="group grid min-h-[4.6rem] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-[rgba(219,232,225,0.32)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--editorial-sage)] sm:gap-4 sm:px-5"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)]">
          <Calculator className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-serif text-xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)] sm:text-2xl">{label}</h3>
            <p className="text-[11px] leading-4 text-[var(--editorial-muted)] sm:text-xs">{summary}</p>
          </div>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[var(--editorial-border)]">
            <motion.div
              className="h-full rounded-full bg-[var(--editorial-sage)]"
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={spring}
            />
          </div>
        </div>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={spring} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--editorial-sage)] group-hover:bg-white/70">
          <ChevronDown className="h-5 w-5" strokeWidth={1.9} />
        </motion.span>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="content"
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--editorial-border)]">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
