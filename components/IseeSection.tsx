"use client";

import Link from "next/link";
import { ArrowRight, Calculator, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

export default function IseeSection() {
  const { t, language } = useLanguage();
  const items =
    language === "tr"
      ? ["Gelir ve mal varlığı", "Aile kişi sayısı", "Tahmini eşdeğer ölçek"]
      : ["Income and assets", "Family members", "Estimated equivalence scale"];

  return (
    <section className="bg-[var(--editorial-paper)] pb-20 lg:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 110, damping: 22 }}
          className="grid gap-8 border-t border-[var(--editorial-border)] pt-10 lg:grid-cols-[0.75fr_1.25fr]"
        >
          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center border border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-sage)]">
              <Calculator className="h-5 w-5" />
            </div>
            <h2 className="max-w-lg font-serif text-3xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-4xl">
              {t.isee.homeCardTitle}
            </h2>
          </div>

          <div>
            <p className="max-w-2xl text-base leading-8 text-[var(--editorial-muted)]">{t.isee.homeCardDesc}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {items.map((item) => (
                <div key={item} className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4">
                  <CheckCircle2 className="mb-3 h-4 w-4 text-[var(--editorial-sage)]" />
                  <p className="text-sm font-medium text-[var(--editorial-ink)]">{item}</p>
                </div>
              ))}
            </div>
            <Link
              href="/isee"
              className="mt-7 inline-flex items-center border border-[var(--editorial-sage)] px-5 py-3 text-sm font-semibold text-[var(--editorial-sage)] transition hover:bg-[var(--editorial-sage)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              {t.isee.homeCardBtn}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
