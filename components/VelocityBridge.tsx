"use client";

import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import CountUpStat from "@/components/CountUpStat";
import Reveal from "@/components/ui/Reveal";
import type { UniversityStats } from "@/lib/universityStats";

interface VelocityBridgeProps {
  stats: UniversityStats;
  scholarshipRegionsCount: number;
}

interface NumberItem {
  value: number | null;
  animate: boolean;
  display?: string;
  label: string;
  href: string;
  ariaLabel: string;
}

// Ana sayfa "Rakamlarla ItalyPath" blogu. Metinler lib/translations (homeNumbers); SAT soru sayisi
// iddiasi t.sat.questionCount ile arac vitrini ve /sat sayfasiyla ortaktir. Bolge sayisi sunucudan
// (app/page.tsx) gelir; burs veri dosyasi istemci paketine girmez (sayfa agirligi, kart 10).
export default function VelocityBridge({ stats, scholarshipRegionsCount }: VelocityBridgeProps) {
  const { t } = useLanguage();
  const copy = t.homeNumbers;
  const items: NumberItem[] = [
    { value: stats.universitiesCount, animate: true, label: copy.universities.label, href: "/universities", ariaLabel: copy.universities.ariaLabel },
    { value: stats.programsCount, animate: true, label: copy.programs.label, href: "/universities", ariaLabel: copy.programs.ariaLabel },
    { value: scholarshipRegionsCount, animate: false, label: copy.scholarshipRegions.label, href: "/scholarships", ariaLabel: copy.scholarshipRegions.ariaLabel },
    { value: null, animate: false, display: t.sat.questionCount, label: copy.satQuestions.label, href: "/sat", ariaLabel: copy.satQuestions.ariaLabel },
  ];

  return (
    <section className="bg-[var(--editorial-paper)] pb-20 text-[#faf7f0] lg:pb-28">
      <Reveal className="mx-4 max-w-7xl rounded-[2rem] bg-[var(--editorial-sage)] px-5 py-10 shadow-[0_22px_60px_rgba(31,79,70,0.16)] sm:mx-6 sm:rounded-[2.5rem] sm:px-8 lg:mx-8 lg:px-12 lg:py-14 xl:mx-auto">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9fc3b6]">
          <span className="h-px w-7 bg-[#9fc3b6]" aria-hidden="true" />
          {copy.eyebrow}
        </p>

        <div className="mt-6 grid grid-cols-2 border-t border-white/15 lg:grid-cols-4">
          {items.map(({ value, animate, display, label, href, ariaLabel }, index) => {
            const numberClass =
              "block font-serif text-5xl font-normal tracking-[-0.035em] text-[#faf7f0] transition-colors duration-200 ease-out group-hover:text-[#e7c9b8] lg:text-6xl";

            return (
              <Link
                key={label}
                href={href}
                aria-label={ariaLabel}
                className={`home-pressable group block border-b border-white/15 py-8 pl-3 transition-colors duration-200 ease-out hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#e7c9b8] sm:pr-6 lg:border-b-0 ${
                  index % 2 === 0 ? "border-r border-white/15" : ""
                } lg:border-r lg:last:border-r-0`}
              >
                {animate ? (
                  <CountUpStat value={value} className={numberClass} />
                ) : (
                  <span className={numberClass}>{display ?? (value === null ? "…" : value)}</span>
                )}
                <p className="mt-2 text-sm text-[#c9d8d1]">{label}</p>
              </Link>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
