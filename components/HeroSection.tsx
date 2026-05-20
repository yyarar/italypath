"use client";

import Link from "next/link";
import { ArrowRight, Check, FileText, GraduationCap, Landmark } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
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

function StudyDossier() {
  const { language } = useLanguage();

  const schools: Array<{ id: number; name: string; meta: string }> =
    language === "tr"
      ? [
          { id: 1, name: "Politecnico di Milano", meta: "Mühendislik" },
          { id: 3, name: "University of Bologna", meta: "Kamu üniversitesi" },
          { id: 2, name: "Sapienza Roma", meta: "Tıp ve sosyal bilimler" },
        ]
      : [
          { id: 1, name: "Politecnico di Milano", meta: "Engineering" },
          { id: 3, name: "University of Bologna", meta: "Public university" },
          { id: 2, name: "Sapienza Rome", meta: "Medicine and social sciences" },
        ];

  const documents =
    language === "tr"
      ? ["Pasaport", "Transkript", "Dil belgesi", "Motivasyon mektubu"]
      : ["Passport", "Transcript", "Language certificate", "Motivation letter"];

  return (
    <motion.aside
      variants={itemVariants}
      className="relative border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 shadow-[0_18px_50px_rgba(21,32,28,0.08)] sm:p-5 lg:p-6"
      aria-label={language === "tr" ? "Başvuru dosyası özeti" : "Application dossier summary"}
    >
      <Link
        href="/hub"
        aria-label={language === "tr" ? "Çalışma dosyasına git" : "Open your study dossier"}
        className="mb-6 -mx-2 -mt-2 flex items-center justify-between border-b border-[var(--editorial-border)] px-2 pb-4 pt-2 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
      >
        <div>
          <p className="text-xs font-semibold text-[var(--editorial-muted)]">
            {language === "tr" ? "Çalışma Dosyası" : "Study dossier"}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em] text-[var(--editorial-ink)]">
            2026 ItalyPath
          </h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center border border-[var(--editorial-border)] bg-[#f5f1e8] text-[var(--editorial-sage)]">
          <GraduationCap className="h-5 w-5" />
        </div>
      </Link>

      <div className="space-y-6">
        <section>
          <Link
            href="/favorites"
            aria-label={language === "tr" ? "Favori listene git" : "Open your favorites"}
            className="-mx-2 mb-3 flex items-center justify-between rounded-none px-2 py-1 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <p className="text-xs font-semibold text-[var(--editorial-muted)]">
              {language === "tr" ? "Kısa Liste" : "Shortlist"}
            </p>
            <span className="text-xs text-[var(--editorial-terracotta)]">3/12</span>
          </Link>
          <div className="divide-y divide-[var(--editorial-border)] border-y border-[var(--editorial-border)]">
            {schools.map(({ id, name, meta }) => (
              <Link
                key={id}
                href={`/universities/${id}`}
                className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--editorial-ink)]">{name}</p>
                  <p className="mt-1 text-xs text-[var(--editorial-muted)]">{meta}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-[var(--editorial-muted)] transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <Link
            href="/documents"
            aria-label={language === "tr" ? "Belge cüzdanına git" : "Open document wallet"}
            className="block border border-[var(--editorial-border)] bg-white p-4 transition-colors hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--editorial-ink)]">
              <FileText className="h-4 w-4 text-[var(--editorial-sage)]" />
              {language === "tr" ? "Belge kontrolü" : "Document check"}
            </div>
            <div className="space-y-2">
              {documents.map((documentName, index) => (
                <div key={documentName} className="flex items-center gap-2 text-xs text-[var(--editorial-muted)]">
                  <span
                    className={`flex h-4 w-4 items-center justify-center border ${
                      index < 2
                        ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white"
                        : "border-[var(--editorial-border)] text-transparent"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  {documentName}
                </div>
              ))}
            </div>
          </Link>

          <Link
            href="/scholarships"
            aria-label={language === "tr" ? "Burs haritasına git" : "Open scholarship map"}
            className="block border border-[var(--editorial-border)] bg-[#f5f1e8] p-4 transition-colors hover:bg-[#efe9da] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)]"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--editorial-ink)]">
              <Landmark className="h-4 w-4 text-[var(--editorial-terracotta)]" />
              {language === "tr" ? "Burs notu" : "Scholarship note"}
            </div>
            <p className="text-xs leading-5 text-[var(--editorial-muted)]">
              {language === "tr"
                ? "Bölgesel kurum, ISEE eşiği ve başvuru takvimi birlikte kontrol edilmeli."
                : "Check the regional body, ISEE threshold, and application window together."}
            </p>
          </Link>
        </section>
      </div>
    </motion.aside>
  );
}

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
          <motion.p variants={itemVariants} className="mb-6 text-sm font-medium text-[var(--editorial-muted)]">
            ItalyPath
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
          <StudyDossier />
        </motion.div>
      </motion.div>
    </section>
  );
}
