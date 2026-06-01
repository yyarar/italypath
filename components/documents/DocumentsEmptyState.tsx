"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function DocumentsEmptyState() {
  const { t } = useLanguage();
  return (
    <div className="mt-10 border border-[var(--editorial-border)] bg-[var(--editorial-band)] px-7 py-12 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
        {t.documents.emptyState.eyebrow}
      </p>
      <h2 className="mx-auto mt-3 max-w-xs font-serif text-2xl font-normal text-[var(--editorial-ink)]">
        {t.documents.emptyState.title}
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-[var(--editorial-muted)]">
        {t.documents.emptyState.text}
      </p>
      <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
        {t.documents.emptyState.categoriesHint}
      </p>
    </div>
  );
}
