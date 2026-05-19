"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { University } from "@/app/data";

interface KisaListeCellProps {
  favorites: readonly string[];
  universities: readonly University[];
}

export default function KisaListeCell({ favorites, universities }: KisaListeCellProps) {
  const { t } = useLanguage();

  const topThree = favorites
    .slice(0, 3)
    .map((id) => universities.find((u) => String(u.id) === id))
    .filter((u): u is University => Boolean(u));

  const isEmpty = favorites.length === 0;

  return (
    <article className="flex min-h-[240px] flex-col border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-6 py-7 last:border-b-0 sm:[&:nth-child(n+3)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-[var(--editorial-border)]">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-serif text-xl font-normal tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-2xl">
          {t.hub.bento.kisaListe.title}
        </h3>
        {!isEmpty && (
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
            {favorites.length} {t.hub.bento.kisaListe.slashTotal}
          </span>
        )}
      </div>

      <div className="flex-1 text-[13px] leading-relaxed text-[var(--editorial-muted)]">
        {isEmpty ? (
          <p>{t.hub.bento.kisaListe.empty}</p>
        ) : (
          <div className="border-t border-[var(--editorial-border)]">
            {topThree.map((uni) => (
              <div
                key={uni.id}
                className="flex items-baseline justify-between gap-3 border-b border-[var(--editorial-border)] py-3 last:border-b-0"
              >
                <span className="truncate text-[13px] font-semibold text-[var(--editorial-ink)]">
                  {uni.name}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--editorial-muted)]">
                  {uni.city}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href={isEmpty ? "/universities" : "/favorites"}
        className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-all hover:gap-3"
      >
        {isEmpty ? t.hub.bento.kisaListe.emptyCta : t.hub.bento.kisaListe.cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </article>
  );
}
