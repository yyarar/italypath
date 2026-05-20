"use client";

import Link from "next/link";
import { ArrowRight, Landmark, MapPinned } from "lucide-react";
import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

export default function ScholarshipsSection() {
  const { t, language } = useLanguage();
  const regions: Array<{ slug: "lazio" | "lombardia" | "emilia-romagna"; name: string }> =
    language === "tr"
      ? [
          { slug: "lazio", name: "Lazio" },
          { slug: "lombardia", name: "Lombardia" },
          { slug: "emilia-romagna", name: "Emilia-Romagna" },
        ]
      : [
          { slug: "lazio", name: "Lazio" },
          { slug: "lombardia", name: "Lombardy" },
          { slug: "emilia-romagna", name: "Emilia-Romagna" },
        ];

  return (
    <section className="bg-[var(--editorial-paper)] pb-16 lg:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 110, damping: 22 }}
          className="grid gap-8 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 sm:p-8 lg:grid-cols-[1fr_0.9fr] lg:p-10"
        >
          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center border border-[var(--editorial-border)] bg-[#f5f1e8] text-[var(--editorial-terracotta)]">
              <MapPinned className="h-5 w-5" />
            </div>
            <h2 className="max-w-xl font-serif text-3xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-4xl">
              {t.homeScholarshipsCta.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--editorial-muted)] sm:text-base">
              {t.homeScholarshipsCta.description}
            </p>

            <Link
              href="/scholarships"
              className="mt-7 inline-flex items-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              {t.homeScholarshipsCta.button}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="border-y border-[var(--editorial-border)] lg:border-y-0 lg:border-l lg:pl-8">
            <div className="flex items-center gap-2 py-4 text-sm font-semibold text-[var(--editorial-ink)] lg:pt-0">
              <Landmark className="h-4 w-4 text-[var(--editorial-sage)]" />
              {language === "tr" ? "Öncelikli kontrol" : "Priority checks"}
            </div>
            <div className="divide-y divide-[var(--editorial-border)]">
              {regions.map(({ slug, name }, index) => (
                <Link
                  key={slug}
                  href={`/scholarships?region=${slug}`}
                  className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)]"
                >
                  <span className="text-sm font-semibold text-[var(--editorial-terracotta)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--editorial-ink)]">{name}</p>
                    <p className="mt-1 text-xs text-[var(--editorial-muted)]">
                      {language === "tr" ? "ISEE, yurt ve yemek desteği" : "ISEE, housing, and meal support"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--editorial-muted)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
            <p className="py-4 text-xs leading-5 text-[var(--editorial-muted)]">{t.homeScholarshipsCta.note}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
