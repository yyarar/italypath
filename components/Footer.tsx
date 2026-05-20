"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { language } = useLanguage();

  return (
    <footer className="border-t border-[var(--editorial-border)] bg-[var(--editorial-paper)] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <span className="font-serif text-2xl font-medium tracking-[-0.02em] text-[var(--editorial-ink)]">ItalyPath</span>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--editorial-muted)]">
          {language === "tr"
            ? "İtalya'da eğitim planını daha sakin, düzenli ve güvenilir şekilde kurman için."
            : "A calmer, clearer way to plan your study path in Italy."}
        </p>
        <p className="mt-3 text-xs text-[var(--editorial-muted)]">© 2026 ItalyPath</p>
      </div>
    </footer>
  );
}
