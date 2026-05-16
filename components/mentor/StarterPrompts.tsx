"use client";

import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

const PROMPT_KEYS = ["prompt1", "prompt2", "prompt3", "prompt4"] as const;

export default function StarterPrompts({
  onPick,
}: {
  onPick: (text: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
        {t.aiMentor.startHereLabel}
      </p>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.06, delayChildren: 0.1 },
          },
        }}
        className="mt-3 grid gap-2 sm:grid-cols-2"
      >
        {PROMPT_KEYS.map((key) => (
          <motion.button
            key={key}
            type="button"
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: {
                opacity: 1,
                y: 0,
                transition: { type: "spring", stiffness: 120, damping: 22 },
              },
            }}
            onClick={() => onPick(t.aiMentor.prompts[key])}
            className="border border-[var(--editorial-border)] bg-transparent px-3 py-2.5 text-left text-sm text-[var(--editorial-ink)] transition-colors duration-200 ease-out hover:bg-[#f6f0e7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:scale-[0.99]"
          >
            {t.aiMentor.prompts[key]}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
