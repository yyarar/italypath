"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { ProgramMatch } from "@/lib/hub/recommendations";

const PREVIEW_COUNT = 5;

export default function ProgramMatchList({ matches }: { matches: ProgramMatch[] }) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? matches : matches.slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="hub-programs-label" className="mt-10">
      <p
        id="hub-programs-label"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.recoSections.programs}
      </p>
      <div className="mt-2 border-t border-[var(--editorial-border)]">
        {visible.map(({ university, department }) => {
          const levelShort = t.hub.levelShort[department.level];
          const langs = department.languages.map((language) => language.toUpperCase()).join("/");
          return (
            <Link
              key={`${university.id}-${department.slug}`}
              href={`/universities/${university.id}/departments/${department.slug}`}
              className="group flex items-center justify-between gap-3 border-b border-[var(--editorial-border)] px-1 py-3 transition-colors hover:bg-[rgba(216,222,217,0.25)]"
            >
              <div className="min-w-0">
                <p className="truncate font-serif text-[15px] text-[var(--editorial-ink)]">
                  {department.name}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-[var(--editorial-muted)]">
                  {university.name} · {university.city}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="border border-[var(--editorial-sage)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--editorial-sage)]">
                  {levelShort} · {langs}
                </span>
                <ArrowRight
                  className="h-4 w-4 text-[var(--editorial-terracotta)] transition-transform group-hover:translate-x-0.5"
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
          onClick={() => setShowAll((value) => !value)}
          className="mt-3 border-b border-[var(--editorial-sage)] pb-px text-[12px] font-semibold text-[var(--editorial-sage)]"
        >
          {showAll
            ? t.hub.recoSections.collapse
            : t.hub.recoSections.seeAll.replace("{count}", String(matches.length))}
        </button>
      )}
    </section>
  );
}
