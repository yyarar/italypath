"use client";

import { useLanguage } from "@/context/LanguageContext";

export interface ExpertLeadSuccessProps {
  onBackToHub: () => void;
}

export default function ExpertLeadSuccess({ onBackToHub }: ExpertLeadSuccessProps) {
  const { t } = useLanguage();
  const copy = t.aiMentor.expertDesk;

  return (
    <section aria-live="polite" className="border-y border-[var(--editorial-border)] py-10">
      <p className="max-w-xl font-serif text-xl leading-8 text-[var(--editorial-ink)]">
        {copy.success}
      </p>
      <button
        type="button"
        onClick={onBackToHub}
        className="mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
      >
        {copy.backToDesks}
      </button>
    </section>
  );
}
