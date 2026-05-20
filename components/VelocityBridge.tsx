"use client";

import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import { formatStatValue, type UniversityStats } from "@/lib/universityStats";

interface VelocityBridgeProps {
  stats: UniversityStats;
}

export default function VelocityBridge({ stats }: VelocityBridgeProps) {
  const { language } = useLanguage();
  const items: Array<{ value: string; label: string; href: string; ariaLabel: string }> =
    language === "tr"
      ? [
          { value: formatStatValue(stats.universitiesCount), label: "üniversite", href: "/universities", ariaLabel: "Üniversite listesine git" },
          { value: formatStatValue(stats.programsCount), label: "program", href: "/universities", ariaLabel: "Program listesine git" },
          { value: "20", label: "bölgesel burs kaydı", href: "/scholarships", ariaLabel: "Bölgesel burs haritasına git" },
          { value: "1", label: "kişisel merkez", href: "/hub", ariaLabel: "Çalışma dosyana git" },
        ]
      : [
          { value: formatStatValue(stats.universitiesCount), label: "universities", href: "/universities", ariaLabel: "Open university list" },
          { value: formatStatValue(stats.programsCount), label: "programs", href: "/universities", ariaLabel: "Open program list" },
          { value: "20", label: "regional scholarship records", href: "/scholarships", ariaLabel: "Open regional scholarship map" },
          { value: "1", label: "personal hub", href: "/hub", ariaLabel: "Open your study dossier" },
        ];

  return (
    <section className="bg-[var(--editorial-paper)] py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid border-y border-[var(--editorial-border)] sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ value, label, href, ariaLabel }) => (
            <Link
              key={label}
              href={href}
              aria-label={ariaLabel}
              className="group block border-b border-[var(--editorial-border)] py-5 transition-colors hover:bg-[var(--editorial-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)] sm:border-r sm:pr-6 lg:border-b-0"
            >
              <p className="px-4 text-3xl font-semibold tracking-[-0.025em] text-[var(--editorial-ink)] transition-colors group-hover:text-[var(--editorial-sage)] sm:px-0">{value}</p>
              <p className="mt-1 px-4 text-sm text-[var(--editorial-muted)] sm:px-0">{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
