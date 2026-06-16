"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useLanguage } from "@/context/LanguageContext";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  const { t } = useLanguage();
  const consent = t.auth.legal.consent;

  // Tek satırlık cümlede {terms} ve {privacy} link olarak yer alır.
  const parts = consent.split(/(\{terms\}|\{privacy\})/g);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--editorial-paper)] px-4 py-10">
      <Link
        href="/"
        className="mb-8 font-serif text-2xl font-medium tracking-[-0.02em] text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
      >
        ItalyPath
      </Link>

      <div className="w-full max-w-[420px]">{children}</div>

      <p className="mt-6 max-w-[420px] text-center text-xs leading-relaxed text-[var(--editorial-muted)]">
        {parts.map((part, idx) => {
          if (part === "{terms}") {
            return (
              <Link
                key={idx}
                href="/yasal/kullanim-kosullari"
                className="underline underline-offset-2 hover:text-[var(--editorial-ink)]"
              >
                {t.auth.legal.termsLink}
              </Link>
            );
          }
          if (part === "{privacy}") {
            return (
              <Link
                key={idx}
                href="/yasal/gizlilik"
                className="underline underline-offset-2 hover:text-[var(--editorial-ink)]"
              >
                {t.auth.legal.privacyLink}
              </Link>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </p>
    </main>
  );
}
