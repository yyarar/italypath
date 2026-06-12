"use client";

import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import { LEGAL_LINKS } from "@/lib/legal/documents";

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

        <nav
          aria-label={language === "tr" ? "Yasal" : "Legal"}
          className="mt-6 flex flex-wrap gap-x-6 gap-y-2"
        >
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.slug}
              href={link.href}
              className="text-sm text-[var(--editorial-muted)] underline-offset-4 transition hover:text-[var(--editorial-ink)] hover:underline"
            >
              {link.title}
            </Link>
          ))}
        </nav>

        <p className="mt-6 text-xs text-[var(--editorial-muted)]">© 2026 ItalyPath</p>
      </div>
    </footer>
  );
}
