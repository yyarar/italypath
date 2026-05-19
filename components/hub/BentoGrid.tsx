"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { useLanguage } from "@/context/LanguageContext";

interface BentoGridProps {
  children: ReactNode;
}

export default function BentoGrid({ children }: BentoGridProps) {
  const { t } = useLanguage();
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 110,
        damping: 22,
        delay: 0.12,
      }}
      aria-labelledby="hub-bento-label"
      className="mt-12 grid grid-cols-[36px_minmax(0,1fr)] gap-7 sm:mt-16"
    >
      <p
        id="hub-bento-label"
        className="pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.bentoStripLabel}
      </p>
      <div className="grid grid-cols-1 border border-[var(--editorial-border)] sm:grid-cols-2">
        {children}
      </div>
    </motion.section>
  );
}
