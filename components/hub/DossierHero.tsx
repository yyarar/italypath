"use client";

import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import type { HubStageId } from "@/lib/hub/stages";

interface DossierHeroProps {
  stage: HubStageId;
  favoritesCount: number;
  documentsCount: number;
  documentsUnavailable: boolean;
}

export default function DossierHero({
  stage,
  favoritesCount,
  documentsCount,
  documentsUnavailable,
}: DossierHeroProps) {
  const { t } = useLanguage();

  const headlineCopy = t.hub.dossierHeadline[stage];
  const stageLabel = t.hub.stages[stage].label.toLowerCase();

  const lede = (() => {
    if (favoritesCount === 0 && documentsCount === 0) return t.hub.dossierLede.newUser;
    if (favoritesCount > 0 && documentsCount === 0) {
      return t.hub.dossierLede.earlyUser.replace(
        "{favorites}",
        String(favoritesCount),
      );
    }
    if (stage === "result") {
      return t.hub.dossierLede.closingUser.replace(
        "{favorites}",
        String(favoritesCount),
      );
    }
    return t.hub.dossierLede.midUser
      .replace("{favorites}", String(favoritesCount))
      .replace("{documents}", String(documentsCount))
      .replace("{stage}", stageLabel);
  })();

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 110, damping: 22 }}
      aria-labelledby="hub-hero-title"
      className="mt-10"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--editorial-terracotta)]">
        {t.hub.dossierEyebrow}
      </p>
      <h1
        id="hub-hero-title"
        className="mt-5 max-w-3xl font-serif text-5xl font-normal leading-[0.96] tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-6xl"
      >
        {headlineCopy.lead}{" "}
        <span className="italic text-[var(--editorial-sage)]">
          {headlineCopy.italic}
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--editorial-muted)] sm:text-lg">
        {lede}
      </p>

      <div className="mt-10 grid grid-cols-2 border-y border-[var(--editorial-border)]">
        <div className="border-r border-[var(--editorial-border)] px-5 py-4 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.heroStats.favorites.label}
          </p>
          <p className="mt-2 font-serif text-3xl font-normal tracking-[-0.02em] text-[var(--editorial-ink)]">
            {favoritesCount} / 12
          </p>
          <p className="mt-1 text-[11px] text-[var(--editorial-muted)]">
            {t.hub.heroStats.favorites.sub}
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.heroStats.documents.label}
          </p>
          <p className="mt-2 font-serif text-3xl font-normal tracking-[-0.02em] text-[var(--editorial-ink)]">
            {documentsUnavailable ? "—" : `${documentsCount} / 8`}
          </p>
          <p className="mt-1 text-[11px] text-[var(--editorial-muted)]">
            {t.hub.heroStats.documents.sub}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
