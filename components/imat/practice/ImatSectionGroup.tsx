"use client";

import { useId, type ReactNode } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Atom, BookOpenText, ChevronDown, Dna, FlaskConical, Puzzle, type LucideIcon } from "lucide-react";

import { fillTemplate } from "@/components/imat/mock/format";
import { useLanguage } from "@/context/LanguageContext";
import type { ImatSection } from "@/lib/imat/types";

interface ImatSectionGroupProps {
  section: ImatSection;
  label: string;
  topicCount: number;
  // En az bir sorusu cozulmus alt konu sayisi.
  solvedCount: number;
  expanded: boolean;
  onToggle: () => void;
  // ImatTopicRow satirlari (<li>).
  children: ReactNode;
}

const SECTION_ICONS: Record<ImatSection, LucideIcon> = {
  "reading-general": BookOpenText,
  logic: Puzzle,
  biology: Dna,
  chemistry: FlaskConical,
  "physics-math": Atom,
};

// Katlanir bolum grubu. `layout="position"` kullanir: ust bilesen LayoutMotion icinde olmalidir.
export default function ImatSectionGroup({
  section,
  label,
  topicCount,
  solvedCount,
  expanded,
  onToggle,
  children,
}: ImatSectionGroupProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const Icon = SECTION_ICONS[section];
  const summary = fillTemplate(t.imat.practice.sectionSummary, { topicCount, solvedCount });
  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, bounce: 0, duration: 0.36 };

  return (
    <m.section
      layout="position"
      transition={spring}
      className="overflow-hidden rounded-2xl border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.82)] shadow-[0_10px_35px_rgba(21,32,28,0.035)]"
    >
      <h2>
        <m.button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
          whileTap={reduceMotion ? undefined : { scale: 0.992 }}
          transition={spring}
          className="group grid min-h-[4.6rem] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-[rgba(219,232,225,0.32)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--editorial-sage)] sm:gap-4 sm:px-5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)]">
            <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="font-serif text-xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)] sm:text-2xl">
              {label}
            </span>
            <span className="text-[11px] font-normal leading-4 text-[var(--editorial-muted)] sm:text-xs">{summary}</span>
          </span>
          <m.span
            aria-hidden="true"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={spring}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--editorial-sage)] group-hover:bg-white/70"
          >
            <ChevronDown className="h-5 w-5" strokeWidth={1.9} />
          </m.span>
        </m.button>
      </h2>

      <AnimatePresence initial={false}>
        {expanded ? (
          <m.div
            key="content"
            id={panelId}
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <ul className="border-t border-[var(--editorial-border)]">{children}</ul>
          </m.div>
        ) : null}
      </AnimatePresence>
    </m.section>
  );
}
