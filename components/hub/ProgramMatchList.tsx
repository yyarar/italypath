"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, GraduationCap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import type { ProgramMatch } from "@/lib/hub/recommendations";

const PREVIEW_COUNT = 5;

export default function ProgramMatchList({ matches }: { matches: ProgramMatch[] }) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const reduceMotion = useReducedMotion();

  const visible = showAll ? matches : matches.slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="hub-programs-label" className="hub-material rounded-[2rem] p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--editorial-sage)] text-white shadow-[0_7px_18px_rgba(31,79,70,0.18)]">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p id="hub-programs-label" className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
              {t.hub.recoSections.programs}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[var(--editorial-sage-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--editorial-sage)]">
          {matches.length}
        </span>
      </div>
      <div className="mt-5 space-y-2">
        {visible.map(({ university, department }, index) => {
          const levelShort = t.hub.levelShort[department.level];
          const langs = department.languages.map((language) => language.toUpperCase()).join("/");
          return (
            <Link
              key={`${university.id}-${department.slug}`}
              href={`/universities/${university.id}/departments/${department.slug}`}
              className="hub-pressable group flex min-h-[4.5rem] items-center gap-3 rounded-[1.25rem] border border-[rgba(216,222,217,0.72)] bg-[rgba(248,247,241,0.62)] p-3 hover:border-[rgba(31,79,70,0.22)] hover:bg-[var(--editorial-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] sm:p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/75 font-serif text-xs text-[var(--editorial-sage)] shadow-sm">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-serif text-base leading-tight text-[var(--editorial-ink)]">
                  {department.name}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-[var(--editorial-muted)]">
                  {university.name} · {university.city}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
                <span className="hidden rounded-full border border-[rgba(31,79,70,0.2)] bg-white/60 px-2 py-1 text-[10px] font-semibold tracking-[0.06em] text-[var(--editorial-sage)] sm:inline-flex">
                  {levelShort} · {langs}
                </span>
                <ArrowRight
                  className="hub-arrow h-4 w-4 text-[var(--editorial-terracotta)]"
                  strokeWidth={2}
                />
              </div>
            </Link>
          );
        })}
      </div>
      {matches.length > PREVIEW_COUNT && (
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => setShowAll((value) => !value)}
          className="hub-pressable mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(31,79,70,0.2)] bg-white/55 px-4 text-[12px] font-semibold text-[var(--editorial-sage)] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          <span>
            {showAll
              ? t.hub.recoSections.collapse
              : t.hub.recoSections.seeAll.replace("{count}", String(matches.length))}
          </span>
          <motion.span
            animate={{ rotate: showAll ? 180 : 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.3 }}
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </motion.span>
        </button>
      )}
    </section>
  );
}
