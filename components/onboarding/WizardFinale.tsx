"use client";

import { motion } from "framer-motion";

interface WizardFinaleProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export default function WizardFinale({
  eyebrow,
  title,
  subtitle,
}: WizardFinaleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 110, damping: 22 }}
      className="py-16 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--editorial-terracotta)]">
        {eyebrow}
      </p>
      <h1 className="mt-5 font-serif text-4xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)]">
        {title}
      </h1>
      <p className="mt-4 text-sm leading-6 text-[var(--editorial-muted)]">
        {subtitle}
      </p>
      <div className="mx-auto mt-8 h-[2px] w-24 overflow-hidden bg-[var(--editorial-border)]">
        <motion.div
          className="h-full w-1/3 bg-[var(--editorial-sage)]"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}
