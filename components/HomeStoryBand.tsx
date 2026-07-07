"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

// Bologna'nin kizil catili panoramasi. Kaynak: Pexels (ucretsiz lisans), foto id 1541363.
export default function HomeStoryBand() {
  const { t } = useLanguage();

  return (
    <section className="bg-[var(--editorial-paper)] pb-16 lg:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 110, damping: 22 }}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/cities"
          aria-label={`${t.homeStory.title} ${t.homeStory.cta}`}
          className="group relative block overflow-hidden border border-[var(--editorial-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          <div className="relative aspect-[3/2] w-full sm:aspect-[16/9] lg:aspect-[24/9]">
            <Image
              src="/images/home/bologna-rooftops.jpg"
              alt={t.homeStory.imageAlt}
              fill
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="object-cover object-center transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            />
            {/* Metin okunurlugu icin alt karartma perdesi (dekoratif degil, legibility). */}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,20,17,0.78)] via-[rgba(13,20,17,0.18)] to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e7c9b8]">
                  {t.homeStory.eyebrow}
                </p>
                <h2 className="mt-3 font-serif text-3xl font-normal leading-[1.05] tracking-[-0.02em] text-[#faf7f0] sm:text-4xl lg:text-5xl">
                  {t.homeStory.title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#e8e6de] sm:text-base">
                  {t.homeStory.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#faf7f0]">
                  {t.homeStory.cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </section>
  );
}
