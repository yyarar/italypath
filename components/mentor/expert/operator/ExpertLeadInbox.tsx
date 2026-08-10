"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";

import { useLanguage } from "@/context/LanguageContext";
import { filterExpertLeads } from "@/lib/mentor/expertLeadInboxState";
import { useExpertLeadInbox } from "@/lib/mentor/useExpertLeadInbox";

import ExpertLeadDetail from "./ExpertLeadDetail";
import ExpertLeadGate from "./ExpertLeadGate";
import ExpertLeadList from "./ExpertLeadList";

export default function ExpertLeadInbox() {
  const { t } = useLanguage();
  const copy = t.expertOperator;
  const detailRef = useRef<HTMLDivElement>(null);
  const {
    authorized,
    leads,
    selectedLead,
    filter,
    newCount,
    loading,
    savingStatus,
    savingNote,
    deleting,
    error,
    setFilter,
    selectLead,
    reload,
    updateStatus,
    saveNote,
    deleteLead,
  } = useExpertLeadInbox();
  const filteredRows = filterExpertLeads(leads, filter);

  const handleSelect = useCallback(
    (id: string) => {
      selectLead(id);
      if (!window.matchMedia("(max-width: 1023px)").matches) return;
      window.requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [selectLead],
  );

  return (
    <ExpertLeadGate
      authorized={authorized}
      loading={loading}
      error={error}
      onRetry={reload}
    >
      <main className="min-h-[100dvh] bg-[var(--editorial-paper)]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <header className="border-b border-[var(--editorial-border)] pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/"
                className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
              >
                ← {copy.backHome}
              </Link>
              <Link
                href="/ekip/mentor"
                className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
              >
                {copy.volunteerInbox} →
              </Link>
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 font-serif text-4xl text-[var(--editorial-ink)]">
              {copy.title}
            </h1>
          </header>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.6fr)]">
            <ExpertLeadList
              rows={filteredRows}
              selectedLeadId={selectedLead?.id ?? null}
              filter={filter}
              newCount={newCount}
              loading={loading}
              disabled={savingStatus || savingNote || deleting}
              onRefresh={reload}
              onFilterChange={setFilter}
              onSelect={handleSelect}
            />
            <div ref={detailRef} className="scroll-mt-4">
              <ExpertLeadDetail
                key={selectedLead?.id ?? "no-lead"}
                lead={selectedLead}
                savingStatus={savingStatus}
                savingNote={savingNote}
                deleting={deleting}
                error={error}
                onStatusChange={updateStatus}
                onSaveNote={saveNote}
                onDelete={deleteLead}
              />
            </div>
          </div>
        </div>
      </main>
    </ExpertLeadGate>
  );
}
