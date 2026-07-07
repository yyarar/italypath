"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import SatHeroPanel from "@/components/SatHeroPanel";
import { formatStatValue, type UniversityStats } from "@/lib/universityStats";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 110, damping: 22 },
  },
};

interface HeroSectionProps {
  stats: UniversityStats;
}

export default function HeroSection({ stats }: HeroSectionProps) {
  const { t, language } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[var(--editorial-paper)] pt-28 pb-16 lg:pt-36 lg:pb-24">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8"
      >
        <div className="max-w-3xl">
          <motion.p
            variants={itemVariants}
            className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
          >
            {language === "tr" ? "İtalya eğitim rehberi" : "Your guide to studying in Italy"}
          </motion.p>

          <motion.h1
            variants={itemVariants}
            className="max-w-4xl font-serif text-5xl font-normal leading-[0.98] tracking-[-0.025em] text-[var(--editorial-ink)] sm:text-6xl lg:text-[5.35rem]"
          >
            {t.hero.title}
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-7 max-w-2xl text-lg leading-8 text-[var(--editorial-muted)] sm:text-xl"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div variants={itemVariants} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/universities"
              className="inline-flex items-center justify-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
              aria-label={t.hero.btnPrimary}
            >
              {t.hero.btnPrimary}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/scholarships"
              className="inline-flex items-center justify-center border border-[var(--editorial-border)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
              aria-label={t.hero.btnSecondary}
            >
              {t.hero.btnSecondary}
            </Link>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-10 grid max-w-xl grid-cols-3 border-y border-[var(--editorial-border)] text-sm"
          >
            {(language === "tr"
              ? [
                  { value: formatStatValue(stats.universitiesCount), label: "üniversite", href: "/universities", ariaLabel: "Üniversite listesine git" },
                  { value: formatStatValue(stats.programsCount), label: "program", href: "/universities", ariaLabel: "Program listesine git" },
                  { value: "20", label: "bölge", href: "/scholarships", ariaLabel: "Bölgesel burs haritasına git" },
                ]
              : [
                  { value: formatStatValue(stats.universitiesCount), label: "universities", href: "/universities", ariaLabel: "Open university list" },
                  { value: formatStatValue(stats.programsCount), label: "programs", href: "/universities", ariaLabel: "Open program list" },
                  { value: "20", label: "regions", href: "/scholarships", ariaLabel: "Open regional scholarship map" },
                ]
            ).map(({ value, label, href, ariaLabel }) => (
              <Link
                key={label}
                href={href}
                aria-label={ariaLabel}
                className="group block py-4 pr-4 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)]"
              >
                <p className="text-2xl font-semibold tracking-[-0.02em] text-[var(--editorial-ink)] transition-colors group-hover:text-[var(--editorial-sage)]">{value}</p>
                <p className="mt-1 text-xs text-[var(--editorial-muted)]">{label}</p>
              </Link>
            ))}
          </motion.div>
        </div>

        <motion.div
          variants={itemVariants}
          animate={shouldReduceMotion ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <SatHeroPanel />
        </motion.div>
      </motion.div>
    </section>
  );
}
