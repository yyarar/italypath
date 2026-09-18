"use client";

import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

import ConsultPrompt from "@/components/consultation/ConsultPrompt";
import IseeExplainer from "@/components/isee/IseeExplainer";
import IseeWizard from "@/components/isee/IseeWizard";
import { useLanguage } from "@/context/LanguageContext";

export default function IseeParificatoClient() {
  const { t } = useLanguage();
  const copy = t.iseeTool.header;

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 pb-20 pt-7 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-terracotta-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {copy.back}
        </Link>

        <header className="mt-3 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 shadow-[0_18px_50px_rgba(21,32,28,0.08)] sm:mt-5 sm:p-8 lg:p-10">
          <p className="text-sm font-medium text-[var(--editorial-muted)]">{copy.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl font-normal leading-[1.02] tracking-[-0.025em] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--editorial-muted)] sm:mt-5 sm:text-lg sm:leading-8">
            {copy.subtitle}
          </p>
          <ul className="mt-5 grid gap-2 border-t border-[var(--editorial-border)] pt-4 text-sm sm:mt-7 sm:grid-cols-3 sm:gap-3 sm:pt-5">
            {copy.trust.map((item) => (
              <li key={item} className="flex items-start gap-2 font-medium text-[var(--editorial-ink)]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--editorial-sage)]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </header>

        <div className="mt-8">
          <IseeWizard />
        </div>

        <div className="mt-14">
          <IseeExplainer />
        </div>

        <div className="mt-12">
          <ConsultPrompt {...t.consultPrompt.isee} cta={t.consultPrompt.cta} />
        </div>
      </div>
    </div>
  );
}
