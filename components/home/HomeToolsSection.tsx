"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Calculator,
  FolderOpen,
  GraduationCap,
  MapPinned,
  Users,
  type LucideIcon,
} from "lucide-react";

import Reveal from "@/components/ui/Reveal";
import { useLanguage } from "@/context/LanguageContext";
import { formatStatValue, type UniversityStats } from "@/lib/universityStats";

interface HomeToolsSectionProps {
  stats: UniversityStats;
  citiesCount: number;
}

interface ToolCard {
  icon: LucideIcon;
  title: string;
  body: string;
  meta: string;
  href: string;
  surface: string;
  iconSurface: string;
  wide?: boolean;
  dark?: boolean;
}

// Ana sayfadaki ücretsiz araç vitrini: sitenin tüm araçları tek bakışta.
export default function HomeToolsSection({ stats, citiesCount }: HomeToolsSectionProps) {
  const { t } = useLanguage();
  const c = t.homeTools;
  const universitiesMeta =
    stats.universitiesCount === null || stats.programsCount === null
      ? c.liveData
      : c.universitiesMeta
          .replace("{universities}", formatStatValue(stats.universitiesCount))
          .replace("{programs}", formatStatValue(stats.programsCount));

  const tools: ToolCard[] = [
    {
      icon: GraduationCap,
      ...c.universities,
      meta: universitiesMeta,
      href: "/universities",
      surface: "bg-[#e7efe9]",
      iconSurface: "bg-[var(--editorial-sage)] text-white",
      wide: true,
    },
    {
      icon: MapPinned,
      ...c.scholarships,
      href: "/scholarships",
      surface: "bg-[#eef3ef]",
      iconSurface: "bg-[var(--editorial-surface)] text-[var(--editorial-terracotta)]",
    },
    {
      icon: Calculator,
      ...c.isee,
      href: "/isee",
      surface: "bg-[#f3ece6]",
      iconSurface: "bg-[var(--editorial-surface)] text-[var(--editorial-sage)]",
    },
    {
      icon: BookOpen,
      ...c.sat,
      meta: `${c.sat.meta} · ${c.signInNote}`,
      href: "/sat",
      surface: "bg-[#f2e8e0]",
      iconSurface: "bg-[var(--editorial-terracotta)] text-white",
    },
    {
      icon: Building2,
      ...c.cities,
      meta: c.cities.meta.replace("{count}", String(citiesCount)),
      href: "/cities",
      surface: "bg-[#eceee5]",
      iconSurface: "bg-[var(--editorial-surface)] text-[var(--editorial-sage)]",
    },
    {
      icon: Users,
      ...c.communities,
      href: "/communities",
      surface: "bg-[#eef3ef]",
      iconSurface: "bg-[var(--editorial-surface)] text-[var(--editorial-terracotta)]",
    },
    {
      icon: FolderOpen,
      ...c.hub,
      meta: c.signInNote,
      href: "/hub",
      surface: "bg-[#15201c]",
      iconSurface: "bg-white/10 text-[#f3d2bf]",
      dark: true,
    },
  ];

  return (
    <section id="araclar" className="scroll-mt-24 bg-[var(--editorial-paper)] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
              {c.eyebrow}
            </p>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl font-normal leading-[1.02] tracking-[-0.035em] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl">
              {c.title}
            </h2>
          </div>
          <p className="max-w-sm text-base leading-7 text-[var(--editorial-muted)]">{c.subtitle}</p>
        </Reveal>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <Reveal key={tool.href} delay={index * 0.04} className={tool.wide ? "sm:col-span-2" : ""}>
                <Link
                  href={tool.href}
                  className="home-feature-card home-pressable group block h-full rounded-[1.75rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
                >
                  <article
                    className={`flex h-full min-h-[13.5rem] flex-col rounded-[1.75rem] border p-5 shadow-[0_14px_45px_rgba(21,32,28,0.06)] sm:p-6 ${tool.surface} ${
                      tool.dark ? "border-[#0f1712] text-[#faf7f0]" : "border-white/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-[0_6px_18px_rgba(21,32,28,0.1)] ${tool.iconSurface}`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span
                        className={`home-hover-rotate flex h-9 w-9 items-center justify-center rounded-full ${
                          tool.dark ? "bg-white/10" : "bg-white/55"
                        }`}
                      >
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="mt-auto pt-8">
                      <p
                        className={`text-xs font-semibold ${
                          tool.dark ? "text-[#f3d2bf]" : "text-[var(--editorial-terracotta)]"
                        }`}
                      >
                        {tool.meta}
                      </p>
                      <h3
                        className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${
                          tool.dark ? "text-white" : "text-[var(--editorial-ink)]"
                        }`}
                      >
                        {tool.title}
                      </h3>
                      <p
                        className={`mt-2 text-sm leading-6 ${
                          tool.dark ? "text-[#c8d2ce]" : "text-[var(--editorial-muted)]"
                        }`}
                      >
                        {tool.body}
                      </p>
                    </div>
                  </article>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
