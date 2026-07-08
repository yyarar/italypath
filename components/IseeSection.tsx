"use client";

import Link from "next/link";
import { ArrowRight, Calculator, CheckCircle2 } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import Reveal from "@/components/ui/Reveal";

export default function IseeSection() {
  const { t, language } = useLanguage();
  const items =
    language === "tr"
      ? ["Gelir ve mal varlığı", "Aile kişi sayısı", "Tahmini eşdeğer ölçek"]
      : ["Income and assets", "Family members", "Estimated equivalence scale"];

  return (
    <section className="bg-[var(--editorial-paper)] pb-20 lg:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-t border-[var(--editorial-border)] pt-10 lg:grid-cols-[0.75fr_1.25fr]">
          <Reveal>
            <div className="mb-5 flex h-12 w-12 items-center justify-center border border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-sage)]">
              <Calculator className="h-5 w-5" />
            </div>
            <h2 className="max-w-lg font-serif text-3xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-4xl">
              {t.isee.homeCardTitle}
            </h2>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="max-w-2xl text-base leading-8 text-[var(--editorial-muted)]">{t.isee.homeCardDesc}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {items.map((item, index) => (
                <div
                  key={item}
                  className="group border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[var(--editorial-sage)]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <CheckCircle2 className="h-4 w-4 text-[var(--editorial-sage)]" />
                    <span className="font-serif text-sm text-[var(--editorial-border)] transition-colors duration-500 group-hover:text-[var(--editorial-terracotta)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--editorial-ink)]">{item}</p>
                </div>
              ))}
            </div>
            <Link
              href="/isee"
              className="group mt-7 inline-flex items-center border border-[var(--editorial-sage)] px-5 py-3 text-sm font-semibold text-[var(--editorial-sage)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--editorial-sage)] hover:text-white active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              {t.isee.homeCardBtn}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
