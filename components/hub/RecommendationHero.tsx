"use client";

import { motion } from "framer-motion";

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

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 110, damping: 22 }}
      aria-labelledby="hub-hero-title"
      className="mt-8"
    >
      <h1
        id="hub-hero-title"
        className="max-w-3xl font-serif text-4xl font-normal leading-[1.02] tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-5xl"
      >
        {t.hub.recoHero.titleStart}{" "}
        <span className="italic text-[var(--editorial-sage)]">
          {t.hub.recoHero.titleHighlight.replace("{count}", String(count))}
        </span>{" "}
        {t.hub.recoHero.titleEnd}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)] sm:text-base">
        {lede}
        {relaxed && (
          <span className="mt-1 block text-[12px] text-[var(--editorial-terracotta)]">
            {t.hub.recoHero.relaxedNote}
          </span>
        )}
      </p>
    </motion.section>
  );
}
