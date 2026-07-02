"use client";

import Link from "next/link";
import { Calculator, MapPin } from "lucide-react";

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
      <section aria-labelledby="hub-scholarship-label" className="mt-10">
        <p
          id="hub-scholarship-label"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
        >
          {t.hub.recoSections.scholarship}
        </p>
        <Link
          href="/isee"
          className="mt-2 flex items-center justify-between border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-3 transition-colors hover:bg-[rgba(216,222,217,0.25)]"
        >
          <span className="text-[13px] text-[var(--editorial-ink)]">
            {t.hub.scholarshipCards.iseeTitle}
          </span>
          <Calculator className="h-4 w-4 text-[var(--editorial-sage)]" strokeWidth={2} />
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="hub-scholarship-label" className="mt-10">
      <p
        id="hub-scholarship-label"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.recoSections.scholarship}
      </p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {region && (
          <Link
            href="/scholarships"
            className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 transition-colors hover:bg-[rgba(216,222,217,0.25)]"
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
          </Link>
        )}
        <Link
          href="/isee"
          className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 transition-colors hover:bg-[rgba(216,222,217,0.25)]"
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
        </Link>
      </div>
    </section>
  );
}
