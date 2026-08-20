"use client";

import Link from "next/link";
import { ArrowUpRight, MapPinned } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { CityDetail } from "@/types/cities";

export default function CityPicksBlock({ cities }: { cities: CityDetail[] }) {
  const { t, language } = useLanguage();

  if (cities.length === 0) return null;

  return (
    <section aria-labelledby="hub-cities-label" className="hub-material rounded-[2rem] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)]">
          <MapPinned className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <p id="hub-cities-label" className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
          {t.hub.recoSections.cities}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/cities?city=${encodeURIComponent(city.slug)}`}
            className="hub-pressable hub-card-lift group rounded-[1.15rem] border border-[var(--editorial-border)] bg-[rgba(245,241,232,0.72)] p-3 hover:bg-[var(--editorial-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <p className="font-serif text-[15px] text-[var(--editorial-ink)]">
              {language === "tr" ? city.name : city.nameEn}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--editorial-muted)]">
              {language === "tr" ? city.nameEn : city.name}
            </p>
            <ArrowUpRight className="hub-arrow mt-2 h-3.5 w-3.5 text-[var(--editorial-terracotta)]" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
