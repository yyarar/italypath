"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

interface BelgeCellProps {
  documentsCount: number;
  documentsUnavailable: boolean;
}

export default function BelgeCell({
  documentsCount,
  documentsUnavailable,
}: BelgeCellProps) {
  const { t } = useLanguage();
  const items = t.hub.bento.belge.items;
  const isEmpty = documentsCount === 0 && !documentsUnavailable;
  const cappedCount = Math.min(documentsCount, items.length);

  return (
    <article className="flex min-h-[240px] flex-col border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-6 py-7 last:border-b-0 sm:[&:nth-child(n+3)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-[var(--editorial-border)]">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-serif text-xl font-normal tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-2xl">
          {t.hub.bento.belge.title}
        </h3>
        {!documentsUnavailable && (
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
            {documentsCount} {t.hub.bento.belge.slashTotal}
          </span>
        )}
      </div>

      <div className="flex-1 text-[12px] leading-relaxed text-[var(--editorial-muted)]">
        {documentsUnavailable ? (
          <p>{t.hub.bento.belge.unavailable}</p>
        ) : isEmpty ? (
          <>
            <p className="mb-3">{t.hub.bento.belge.empty}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {items.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px]">
                  <span className="h-3 w-3 shrink-0 border border-[var(--editorial-border)]" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {items.map((item, index) => {
              const done = index < cappedCount;
              return (
                <div
                  key={item}
                  className={`flex items-center gap-2 text-[12px] ${
                    done ? "font-medium text-[var(--editorial-ink)]" : "text-[var(--editorial-muted)]"
                  }`}
                >
                  <span
                    className={`flex h-3 w-3 shrink-0 items-center justify-center border text-[8px] ${
                      done
                        ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white"
                        : "border-[var(--editorial-border)] text-transparent"
                    }`}
                    aria-hidden
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {item}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link
        href="/documents"
        className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-all hover:gap-3"
      >
        {t.hub.bento.belge.cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </article>
  );
}
