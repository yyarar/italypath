"use client";

import { useMemo } from "react";

import { useLanguage } from "@/context/LanguageContext";
import type { ExpertLeadFilter } from "@/lib/mentor/expertLeadInboxState";
import type { ExpertLeadRow } from "@/types";

const FILTERS: ExpertLeadFilter[] = ["all", "new", "contacted", "completed"];

export interface ExpertLeadListProps {
  rows: ExpertLeadRow[];
  selectedLeadId: string | null;
  filter: ExpertLeadFilter;
  newCount: number;
  loading: boolean;
  disabled?: boolean;
  onRefresh: () => Promise<void>;
  onFilterChange: (filter: ExpertLeadFilter) => void;
  onSelect: (id: string) => void;
}

export default function ExpertLeadList({
  rows,
  selectedLeadId,
  filter,
  newCount,
  loading,
  disabled = false,
  onRefresh,
  onFilterChange,
  onSelect,
}: ExpertLeadListProps) {
  const { t, language } = useLanguage();
  const copy = t.expertOperator;
  const formCopy = t.aiMentor.expertDesk;
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [language],
  );

  return (
    <section aria-label={copy.title} className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--editorial-border)] pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)]">
          {copy.newCount.replace("{count}", String(newCount))}
        </p>
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => void onRefresh().catch(() => undefined)}
          className="border border-[var(--editorial-border)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copy.refresh}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4" aria-label={copy.title}>
        {FILTERS.map((status) => {
          const selected = filter === status;
          return (
            <button
              key={status}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onFilterChange(status)}
              className={`min-h-11 border border-r-0 border-[var(--editorial-border)] px-2 py-3 text-[9px] font-bold uppercase tracking-[0.1em] last:border-r sm:text-[10px] ${
                selected
                  ? "bg-[var(--editorial-ink)] text-[var(--editorial-paper)]"
                  : "bg-[var(--editorial-paper)] text-[var(--editorial-muted)] hover:bg-[var(--editorial-surface)] hover:text-[var(--editorial-ink)]"
              } focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {copy.filters[status]}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-y border-[var(--editorial-border)]">
        {loading ? (
          <p className="px-3 py-10 font-serif text-sm italic text-[var(--editorial-muted)]">
            {copy.loading}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-10 font-serif text-sm italic text-[var(--editorial-muted)]">
            {copy.empty}
          </p>
        ) : (
          rows.map((lead) => {
            const selected = lead.id === selectedLeadId;
            return (
              <button
                key={lead.id}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => onSelect(lead.id)}
                className={`w-full border-b border-[var(--editorial-border)] px-3 py-4 text-left last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "bg-[var(--editorial-sage-soft)]"
                    : "bg-[var(--editorial-paper)] hover:bg-[var(--editorial-surface)]"
                }`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-serif text-lg text-[var(--editorial-ink)]">
                    {lead.full_name}
                  </span>
                  <time
                    dateTime={lead.created_at}
                    className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--editorial-muted)]"
                  >
                    {dateFormatter.format(new Date(lead.created_at))}
                  </time>
                </span>
                <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)]">
                  {formCopy.studyLevels[lead.study_level]} · {formCopy.fieldsOfInterest[lead.field_of_interest]}
                </span>
                <span className="mt-2 block text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                  {copy.filters[lead.status]}
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
