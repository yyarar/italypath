"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Paylasilan sinematik giris: hafif yukari kayma + blur cozulmesi, ozel easing.
// Editorial kimligi bozmaz; sadece hareket dilini "ajans isi" seviyesine tasir.
// prefers-reduced-motion'da tamamen statik render eder.
export const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Saniye cinsinden gecikme; ayni gorunumdeki bloklari sirali acmak icin. */
  delay?: number;
  /** Baslangic dikey ofseti (px). */
  y?: number;
  /** Blur miktari (px). */
  blur?: number;
}

export default function Reveal({ children, className, delay = 0, y = 24, blur = 6 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: `blur(${blur}px)` }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.85, ease: REVEAL_EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
