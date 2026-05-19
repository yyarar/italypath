"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

export default function ToplulukNotuCell() {
  const { t } = useLanguage();
  return (
    <article className="flex min-h-[240px] flex-col border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-6 py-7 last:border-b-0 sm:[&:nth-child(n+3)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-[var(--editorial-border)]">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-serif text-xl font-normal tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-2xl">
          {t.hub.bento.topluluk.title}
        </h3>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
          {t.hub.bento.topluluk.thisWeek}
        </span>
      </div>
      <p className="flex-1 text-[13px] leading-relaxed text-[var(--editorial-muted)]">
        {t.hub.bento.topluluk.body}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {t.hub.bento.topluluk.tags.map((tag) => (
          <span
            key={tag}
            className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-2.5 py-1 text-[11px] tracking-[0.02em] text-[var(--editorial-ink)]"
          >
            {tag}
          </span>
        ))}
      </div>
      <Link
        href="/communities"
        className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-all hover:gap-3"
      >
        {t.hub.bento.topluluk.cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </article>
  );
}
