"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

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
  const progress = clampPercent(masteryPct);
  const summary = t.sat.domainSummary
    .replace("{topicCount}", String(topicCount))
    .replace("{startedCount}", String(startedCount))
    .replace("{masteryPct}", String(progress));

  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-[rgba(216,222,217,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-serif text-xl font-normal leading-tight text-[var(--editorial-ink)]">{label}</h3>
            <p className="text-[12px] text-[var(--editorial-muted)]">{summary}</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden bg-[var(--editorial-border)]">
            <div
              className="h-full bg-[var(--editorial-sage)] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--editorial-sage)] transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          strokeWidth={2.2}
        />
      </button>
      {expanded ? <div className="grid gap-3 border-t border-[var(--editorial-border)] bg-[var(--editorial-paper)] p-3">{children}</div> : null}
    </section>
  );
}
