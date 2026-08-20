"use client";

import { Route } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

interface RecommendationHeroProps {
  count: number;
  lede: string;
  relaxed: boolean;
}

export default function RecommendationHero({
  count,
  lede,
  relaxed,
}: RecommendationHeroProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, transform: "translateY(18px) scale(0.985)" }}
      animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      transition={{ type: "spring", bounce: 0, duration: 0.42 }}
      aria-labelledby="hub-hero-title"
      className="relative mt-5 overflow-hidden rounded-[2rem] bg-[var(--editorial-ink)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(21,32,28,0.16)] sm:rounded-[2.5rem] sm:px-9 sm:py-10 lg:px-12"
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[rgba(219,232,225,0.12)] blur-3xl" />
      <p className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d8a88e]">
        <Route className="h-4 w-4" aria-hidden="true" />
        {t.hub.recoSections.programs}
      </p>
      <h1
        id="hub-hero-title"
        className="relative mt-4 max-w-4xl font-serif text-[clamp(2.5rem,6vw,4.8rem)] font-normal leading-[0.98] tracking-[-0.04em] text-white"
      >
        {t.hub.recoHero.titleStart}{" "}
        <span className="italic text-[#b9d2c8]">
          {t.hub.recoHero.titleHighlight.replace("{count}", String(count))}
        </span>{" "}
        {t.hub.recoHero.titleEnd}
      </h1>
      <p className="relative mt-5 max-w-2xl text-sm leading-7 text-[#c8d2ce] sm:text-base">
        {lede}
        {relaxed && (
          <span className="mt-2 block text-[12px] font-medium text-[#e0ae93]">
            {t.hub.recoHero.relaxedNote}
          </span>
        )}
      </p>
    </motion.section>
  );
}
