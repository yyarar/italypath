"use client";

import Link from "next/link";
import { ArrowLeft, Globe2 } from "lucide-react";

interface UniversitiesHeroProps {
  backHomeLabel: string;
  guideLabel: string;
  title: string;
  subtitle: string;
  universitiesCount: number;
  departmentsCount: number;
  citiesCount: number;
  universitiesLabel: string;
  departmentsLabel: string;
  citiesLabel: string;
  languageToggleLabel: string;
  languageButtonText: string;
  onToggleLanguage: () => void;
}

export function UniversitiesHero({
  backHomeLabel,
  guideLabel,
  title,
  subtitle,
  universitiesCount,
  departmentsCount,
  citiesCount,
  universitiesLabel,
  departmentsLabel,
  citiesLabel,
  languageToggleLabel,
  languageButtonText,
  onToggleLanguage,
}: UniversitiesHeroProps) {
  const stats = [
    { value: universitiesCount, label: universitiesLabel },
    { value: departmentsCount, label: departmentsLabel },
    { value: citiesCount, label: citiesLabel },
  ];

  return (
    <header className="overflow-x-hidden border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto min-w-0 max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backHomeLabel}
          </Link>

          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={languageToggleLabel}
            className="inline-flex items-center gap-2 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-2 text-xs font-bold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <Globe2 className="h-3.5 w-3.5" />
            {languageButtonText}
          </button>
        </div>

        <div className="grid min-w-0 gap-8 py-10 md:grid-cols-[minmax(0,1fr)_360px] md:items-end lg:py-14">
          <div className="min-w-0">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)] sm:tracking-[0.18em]">
              {guideLabel}
            </p>
            <h1 className="max-w-full break-words font-serif text-3xl font-semibold leading-[1.02] tracking-[-0.03em] text-[var(--editorial-ink)] sm:max-w-3xl sm:text-5xl sm:leading-[0.98] sm:tracking-[-0.04em] lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 hidden max-w-2xl break-words text-base leading-7 text-[var(--editorial-muted)] min-[430px]:block">
              {subtitle}
            </p>
          </div>

          <dl className="grid min-w-0 grid-cols-3 border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
            {stats.map((stat, index) => {
              const isCity = index === 2;
              const cellClasses = `min-w-0 p-3 sm:p-5 h-full ${
                index > 0 ? "border-l border-[var(--editorial-border)]" : ""
              }`;

              if (isCity) {
                return (
                  <Link
                    key={stat.label}
                    href="/cities"
                    className="min-w-0 hover:bg-[#f6f0e7] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                  >
                    <div className={cellClasses}>
                      <dt className="truncate text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--editorial-terracotta)] sm:text-[10px]">
                        {stat.label} ↗
                      </dt>
                      <dd className="mt-2 font-serif text-3xl font-semibold text-[var(--editorial-ink)]">
                        {stat.value}
                      </dd>
                    </div>
                  </Link>
                );
              }

              return (
                <div
                  key={stat.label}
                  className={cellClasses}
                >
                  <dt className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)] sm:text-[10px]">
                    {stat.label}
                  </dt>
                  <dd className="mt-2 font-serif text-3xl font-semibold text-[var(--editorial-ink)]">
                    {stat.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </header>
  );
}
