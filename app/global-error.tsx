"use client";

import { useEffect, useSyncExternalStore } from "react";
import { translations } from "@/lib/translations";
import "./globals.css";

// Kok layout'un kendisi hata verdiginde gosterilir (sayfa hatalari app/error.tsx'e duser).
// LanguageProvider bu noktada yoktur; dil tercihi dogrudan tarayici kaydindan okunur.
const LANGUAGE_STORAGE_KEY = "italyPathLang";

function readStoredLanguage(): "tr" | "en" {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "tr";
  } catch {
    // Site verisi engelliyse Turkce kalir.
    return "tr";
  }
}

function subscribeToNothing() {
  return () => {};
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const language = useSyncExternalStore(subscribeToNothing, readStoredLanguage, () => "tr" as const);

  useEffect(() => {
    console.error("[ItalyPath global error]", error);
  }, [error]);

  const copy = translations[language].globalError;

  return (
    <html lang={language}>
      <body className="bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)] antialiased">
        <title>{`${copy.title} | ItalyPath`}</title>
        <main className="flex min-h-screen items-center justify-center px-4 py-24 sm:px-6">
          <div className="w-full max-w-2xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta-ink)]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-4 text-sm leading-6 text-[var(--editorial-muted)] sm:text-base">
              {copy.desc}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                {copy.retry}
              </button>
              {/* Kok layout calismadigi icin istemci yonlendirmesi yerine tam sayfa gecis. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex items-center justify-center border border-[var(--editorial-border)] px-5 py-3 text-sm font-bold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)]"
              >
                {copy.home}
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
