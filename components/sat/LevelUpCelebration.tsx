"use client";

import { motion, useReducedMotion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

const GOLD = "#b8872f";

const confetti = [
  { x: "-34vw", y: "-28vh", rotate: -18, delay: 0.08 },
  { x: "-24vw", y: "22vh", rotate: 22, delay: 0.14 },
  { x: "-9vw", y: "-34vh", rotate: 45, delay: 0.2 },
  { x: "12vw", y: "28vh", rotate: -35, delay: 0.12 },
  { x: "27vw", y: "-24vh", rotate: 18, delay: 0.18 },
  { x: "36vw", y: "13vh", rotate: -12, delay: 0.24 },
];

interface LevelUpCelebrationProps {
  level: number;
  onDismiss: () => void;
}

export default function LevelUpCelebration({ level, onDismiss }: LevelUpCelebrationProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(21,32,28,0.62)] px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label={t.sat.levelUpEyebrow}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.22 }}
    >
      <motion.div
        className="relative w-full max-w-sm overflow-hidden border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-6 py-8 text-center shadow-2xl"
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.38, ease: "easeOut" }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {[...Array(14)].map((_, index) => (
            <motion.span
              key={index}
              className="absolute left-1/2 top-1/2 h-px w-24 origin-left bg-[var(--editorial-sage)] opacity-20"
              style={{ rotate: `${index * 25.714}deg` }}
              initial={reduceMotion ? false : { scaleX: 0 }}
              animate={reduceMotion ? { scaleX: 1 } : { scaleX: [0, 1, 0.72] }}
              transition={{ duration: reduceMotion ? 0 : 0.7, delay: 0.1 }}
            />
          ))}
          {confetti.map((piece, index) => (
            <motion.span
              key={`${piece.x}-${piece.y}`}
              className={`absolute left-1/2 top-1/2 h-2.5 w-1.5 ${
                index % 2 === 0 ? "bg-[var(--editorial-sage)]" : "bg-[#b8872f]"
              }`}
              initial={reduceMotion ? false : { x: 0, y: 0, rotate: 0, opacity: 0 }}
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : { x: piece.x, y: piece.y, rotate: piece.rotate, opacity: [0, 1, 1] }
              }
              transition={{ duration: reduceMotion ? 0 : 0.56, delay: piece.delay, ease: "easeOut" }}
            />
          ))}
        </div>

        <div className="relative mx-auto flex h-28 w-28 items-center justify-center border border-[#b8872f] bg-[var(--editorial-band)]">
          <motion.span
            className="font-serif text-6xl leading-none text-[var(--editorial-sage)]"
            initial={reduceMotion ? false : { scale: 0.72 }}
            animate={reduceMotion ? { scale: 1 } : { scale: [0.72, 1.08, 1] }}
            transition={{ duration: reduceMotion ? 0 : 0.42, delay: 0.1 }}
          >
            {level}
          </motion.span>
          <span className="absolute -right-2 -top-2 h-5 w-5 border border-[#b8872f] bg-[#b8872f]" aria-hidden="true" />
          <span className="absolute -bottom-2 -left-2 h-5 w-5 border border-[#b8872f] bg-[#b8872f]" aria-hidden="true" />
        </div>

        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD }}>
          {t.sat.levelUpEyebrow}
        </p>
        <h2 className="mt-3 font-serif text-4xl font-normal leading-tight text-[var(--editorial-ink)]">
          {t.sat.levelUpBody.replace("{L}", String(level))}
        </h2>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-7 inline-flex min-h-11 w-full items-center justify-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
        >
          {t.sat.levelUpDismiss}
        </button>
      </motion.div>
    </motion.div>
  );
}
