"use client";

import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import type { CityDetail } from "@/types/cities";

export default function CityPicksBlock({ cities }: { cities: CityDetail[] }) {
  const { t, language } = useLanguage();

  if (cities.length === 0) return null;

  return (
    <section aria-labelledby="hub-cities-label" className="mt-10">
      <p
        id="hub-cities-label"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.recoSections.cities}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/cities?city=${encodeURIComponent(city.slug)}`}
            className="border border-[var(--editorial-border)] bg-[var(--editorial-band)] p-3 transition-colors hover:bg-[rgba(216,222,217,0.4)]"
          >
            <p className="font-serif text-[15px] text-[var(--editorial-ink)]">
              {language === "tr" ? city.name : city.nameEn}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--editorial-muted)]">
              {language === "tr" ? city.nameEn : city.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
