"use client";

import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import CountUpStat from "@/components/CountUpStat";
import type { UniversityStats } from "@/lib/universityStats";

interface VelocityBridgeProps {
  stats: UniversityStats;
}

export default function VelocityBridge({ stats }: VelocityBridgeProps) {
  const { language } = useLanguage();
  const items: Array<{ value: number | null; animate: boolean; label: string; href: string; ariaLabel: string }> =
    language === "tr"
      ? [
          { value: stats.universitiesCount, animate: true, label: "üniversite", href: "/universities", ariaLabel: "Üniversite listesine git" },
          { value: stats.programsCount, animate: true, label: "program", href: "/universities", ariaLabel: "Program listesine git" },
          { value: 20, animate: false, label: "bölgesel burs kaydı", href: "/scholarships", ariaLabel: "Bölgesel burs haritasına git" },
          { value: 1, animate: false, label: "kişisel çalışma merkezi", href: "/hub", ariaLabel: "Çalışma dosyana git" },
        ]
      : [
          { value: stats.universitiesCount, animate: true, label: "universities", href: "/universities", ariaLabel: "Open university list" },
          { value: stats.programsCount, animate: true, label: "programs", href: "/universities", ariaLabel: "Open program list" },
          { value: 20, animate: false, label: "regional scholarship records", href: "/scholarships", ariaLabel: "Open regional scholarship map" },
          { value: 1, animate: false, label: "personal study hub", href: "/hub", ariaLabel: "Open your study dossier" },
        ];

  return (
    <section className="bg-[var(--editorial-sage)] py-14 text-[#faf7f0] lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9fc3b6]">
          {language === "tr" ? "Rakamlarla ItalyPath" : "ItalyPath in numbers"}
        </p>

        <div className="mt-6 grid grid-cols-2 border-t border-white/15 lg:grid-cols-4">
          {items.map(({ value, animate, label, href, ariaLabel }, index) => {
            const numberClass =
              "block font-serif text-5xl font-normal tracking-[-0.02em] text-[#faf7f0] transition-colors group-hover:text-[#e7c9b8] lg:text-6xl";

            return (
              <Link
                key={label}
                href={href}
                aria-label={ariaLabel}
                className={`group block border-b border-white/15 py-8 transition-colors hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#e7c9b8] sm:pr-6 lg:border-b-0 ${
                  index % 2 === 0 ? "border-r border-white/15" : ""
                } lg:border-r lg:last:border-r-0`}
              >
                {animate ? (
                  <CountUpStat value={value} className={numberClass} />
                ) : (
                  <span className={numberClass}>{value === null ? "…" : value}</span>
                )}
                <p className="mt-2 text-sm text-[#c9d8d1]">{label}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
