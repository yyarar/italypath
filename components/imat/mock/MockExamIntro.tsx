"use client";

import { m, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

interface MockExamIntroProps {
  year: number;
  starting: boolean;
  // Baslatma hatasi (tavan, kullanilamiyor, ag); sinav acilmaz, mesaj burada kalir.
  error: string | null;
  onBegin: () => void;
  onBack: () => void;
}

export default function MockExamIntro({ year, starting, error, onBegin, onBack }: MockExamIntroProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();

  return (
    <m.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[1.4rem] border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.88)] p-5 shadow-[0_18px_50px_rgba(21,32,28,0.06)] backdrop-blur-xl sm:p-8"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
        {t.imat.tabMock} · {year}
      </p>
      <h2 className="mt-2 font-serif text-3xl font-normal tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-4xl">
        {t.imat.mock.rulesTitle}
      </h2>
      <ul className="mt-6 space-y-3">
        {t.imat.mock.rules.map((rule) => (
          <li key={rule} className="flex gap-3 text-[15px] leading-7 text-[var(--editorial-ink)]">
            <span aria-hidden="true" className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--editorial-sage)]" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      {error ? (
        <p
          role="alert"
          className="mt-6 border-l-2 border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-3 py-2 text-[13px] leading-6 text-[var(--editorial-terracotta-ink)]"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        <m.button
          type="button"
          onClick={onBegin}
          disabled={starting}
          aria-busy={starting}
          whileTap={starting || reduceMotion ? undefined : { scale: 0.97 }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--editorial-sage)] px-6 py-3 text-sm font-bold text-white shadow-[0_7px_18px_rgba(31,79,70,0.16)] outline-none transition-colors hover:bg-[#173d36] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        >
          {starting ? t.imat.loading : t.imat.mock.begin}
          {starting ? null : <ArrowRight className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
        </m.button>
        <button
          type="button"
          onClick={onBack}
          disabled={starting}
          className="min-h-12 rounded-xl px-5 py-3 text-xs font-bold text-[var(--editorial-muted)] outline-none transition-colors hover:bg-white/70 hover:text-[var(--editorial-sage)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] disabled:opacity-60"
        >
          {t.imat.mock.backToList}
        </button>
      </div>
    </m.section>
  );
}
