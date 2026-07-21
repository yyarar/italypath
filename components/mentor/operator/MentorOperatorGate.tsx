"use client";

import type { ReactNode } from "react";

import { useLanguage } from "@/context/LanguageContext";

export interface MentorOperatorGateProps {
  authorized: boolean | null;
  loading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
  children: ReactNode;
}

export default function MentorOperatorGate({
  authorized,
  error,
  onRetry,
  children,
}: MentorOperatorGateProps) {
  const { t } = useLanguage();
  const copy = t.mentorOperator;
  const accessCheckFailed = error === "access_check_failed";
  const initialLoadFailed = error === "load_failed" && authorized !== true;

  if (accessCheckFailed || initialLoadFailed) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--editorial-paper)] px-4 py-12">
        <section
          role="alert"
          className="w-full max-w-xl border-y border-[var(--editorial-border)] py-10"
        >
          <p className="font-serif text-2xl text-[var(--editorial-ink)]">
            {copy.loadError}
          </p>
          <button
            type="button"
            onClick={() => void onRetry().catch(() => undefined)}
            className="mt-6 border border-[var(--editorial-ink)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] transition-colors duration-200 ease-out hover:bg-[var(--editorial-ink)] hover:text-[var(--editorial-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
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

  if (authorized !== true) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--editorial-paper)] px-4 py-12">
        <p
          role="status"
          aria-live="polite"
          className="border-y border-[var(--editorial-border)] py-10 font-serif text-lg italic text-[var(--editorial-muted)]"
        >
          {copy.loading}
        </p>
      </main>
    );
  }

  return children;
}
