"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

export default function BursNotuCell() {
  const { t } = useLanguage();
  return (
    <article className="flex min-h-[240px] flex-col border-b border-[var(--editorial-border)] bg-[#f5f1e8] px-6 py-7 last:border-b-0 sm:[&:nth-child(n+3)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-[var(--editorial-border)]">
      <h3 className="mb-4 font-serif text-xl font-normal tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-2xl">
        {t.hub.bento.burs.title}
      </h3>
      <div className="flex-1">
        <p className="font-serif text-[17px] italic leading-snug tracking-[-0.005em] text-[var(--editorial-ink)]">
          <span className="text-[var(--editorial-terracotta)]">「</span>
          {t.hub.bento.burs.quote}
          <span className="text-[var(--editorial-terracotta)]">」</span>
        </p>
      </div>
      <Link
        href="/scholarships"
        className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-all hover:gap-3"
      >
        {t.hub.bento.burs.cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </article>
  );
}
