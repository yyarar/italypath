"use client";

import type { ReactNode } from "react";

import { useLanguage } from "@/context/LanguageContext";
import type { UseExpertLeadInboxResult } from "@/lib/mentor/useExpertLeadInbox";

interface ExpertLeadGateProps {
  authorized: boolean | null;
  loading: boolean;
  error: UseExpertLeadInboxResult["error"];
  onRetry: () => Promise<void>;
  children: ReactNode;
}

export default function ExpertLeadGate({
  authorized,
  loading,
  error,
  onRetry,
  children,
}: ExpertLeadGateProps) {
  const { t } = useLanguage();
  const copy = t.expertOperator;
  const accessFailed = error === "access_check_failed" || error === "load_failed";

  if (accessFailed) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--editorial-paper)] px-4 py-12">
        <section role="alert" className="w-full max-w-xl border-y border-[var(--editorial-border)] py-10">
          <p className="font-serif text-2xl text-[var(--editorial-ink)]">
            {copy.loadError}
          </p>
          <button
            type="button"
            onClick={() => void onRetry().catch(() => undefined)}
            className="mt-6 border border-[var(--editorial-ink)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] transition hover:bg-[var(--editorial-ink)] hover:text-[var(--editorial-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
          >
            {copy.retry}
          </button>
        </section>
      </main>
    );
  }

  if (authorized === false) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--editorial-paper)] px-4 py-12">
        <section className="w-full max-w-xl border-y border-[var(--editorial-border)] py-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 font-serif text-3xl text-[var(--editorial-ink)]">
            {copy.unauthorizedTitle}
          </h1>
          <p className="mt-4 font-serif text-base leading-7 text-[var(--editorial-muted)]">
            {copy.unauthorizedBody}
          </p>
        </section>
      </main>
    );
  }

  if (authorized === true) return children;

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--editorial-paper)] px-4 py-12">
      <p
        role="status"
        aria-live="polite"
        className="border-y border-[var(--editorial-border)] py-10 font-serif text-lg italic text-[var(--editorial-muted)]"
      >
        {loading ? copy.loading : copy.loading}
      </p>
    </main>
  );
}
