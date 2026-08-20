"use client";

import Link from "next/link";
import { ArrowUpRight, Calculator, Landmark, MapPin } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { ProfileBudget } from "@/lib/hub/profile";
import type { ScholarshipRegionRecord } from "@/types/scholarships";

interface ScholarshipBlockProps {
  region: ScholarshipRegionRecord | null;
  budget: ProfileBudget | null;
}

export default function ScholarshipBlock({ region, budget }: ScholarshipBlockProps) {
  const { t } = useLanguage();

  if (budget === "flexible") {
    return (
      <section aria-labelledby="hub-scholarship-label" className="hub-material rounded-[2rem] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f2e8e0] text-[var(--editorial-terracotta)]">
            <Landmark className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <p id="hub-scholarship-label" className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {t.hub.recoSections.scholarship}
          </p>
        </div>
        <Link
          href="/isee"
          className="hub-pressable group mt-4 flex min-h-14 items-center justify-between rounded-[1.2rem] border border-[var(--editorial-border)] bg-white/60 px-4 py-3 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          <span className="text-[13px] font-semibold text-[var(--editorial-ink)]">
            {t.hub.scholarshipCards.iseeTitle}
          </span>
          <ArrowUpRight className="hub-arrow h-4 w-4 text-[var(--editorial-sage)]" strokeWidth={2} />
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="hub-scholarship-label" className="hub-material rounded-[2rem] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f2e8e0] text-[var(--editorial-terracotta)]">
          <Landmark className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <p id="hub-scholarship-label" className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
          {t.hub.recoSections.scholarship}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2">
        {region && (
          <Link
            href="/scholarships"
            className="hub-pressable hub-card-lift group rounded-[1.2rem] border border-[var(--editorial-border)] bg-white/60 p-4 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <MapPin
              className="h-[17px] w-[17px] text-[var(--editorial-sage)]"
              strokeWidth={2}
            />
            <p className="mt-2 text-[13px] font-semibold text-[var(--editorial-ink)]">
              {t.hub.scholarshipCards.regionTitle.replace(
                "{region}",
                region.regionName,
              )}
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-[var(--editorial-muted)]">
              {t.hub.scholarshipCards.regionDesc}
            </p>
            <ArrowUpRight className="hub-arrow mt-3 h-4 w-4 text-[var(--editorial-terracotta)]" aria-hidden="true" />
          </Link>
        )}
        <Link
          href="/isee"
          className="hub-pressable hub-card-lift group rounded-[1.2rem] border border-[var(--editorial-border)] bg-white/60 p-4 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          <Calculator
            className="h-[17px] w-[17px] text-[var(--editorial-sage)]"
            strokeWidth={2}
          />
          <p className="mt-2 text-[13px] font-semibold text-[var(--editorial-ink)]">
            {t.hub.scholarshipCards.iseeTitle}
          </p>
          <p className="mt-0.5 text-[11px] leading-5 text-[var(--editorial-muted)]">
            {t.hub.scholarshipCards.iseeDesc}
          </p>
          <ArrowUpRight className="hub-arrow mt-3 h-4 w-4 text-[var(--editorial-terracotta)]" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
