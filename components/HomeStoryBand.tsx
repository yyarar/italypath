"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import Reveal from "@/components/ui/Reveal";

// Bologna'nin kizil catili panoramasi. Kaynak: Pexels (ucretsiz lisans), foto id 1541363.
export default function HomeStoryBand() {
  const { t } = useLanguage();

  return (
    <section className="bg-[var(--editorial-paper)] pb-20 lg:pb-28">
      <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/cities"
          aria-label={`${t.homeStory.title} ${t.homeStory.cta}`}
          className="home-pressable group relative block overflow-hidden rounded-[2rem] border border-white/60 shadow-[0_22px_65px_rgba(21,32,28,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)] sm:rounded-[2.5rem]"
        >
          <div className="relative aspect-[4/5] w-full sm:aspect-[16/10] lg:aspect-[21/9]">
            <Image
              src="/images/home/bologna-rooftops.jpg"
              alt={t.homeStory.imageAlt}
              fill
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="object-cover object-center transition-transform duration-[1200ms] ease-out group-hover:scale-[1.035]"
            />
            {/* Metin okunurlugu icin alt karartma perdesi (dekoratif degil, legibility). */}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,20,17,0.7)] via-[rgba(13,20,17,0.12)] to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 lg:p-6">
              <div className="max-w-2xl rounded-[1.5rem] border border-white/15 bg-[rgba(17,25,21,0.48)] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.16)] backdrop-blur-2xl sm:p-7">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e7c9b8]">
                  <span className="h-px w-7 bg-[#e7c9b8]" aria-hidden="true" />
                  {t.homeStory.eyebrow}
                </p>
                <h2 className="mt-3 font-serif text-3xl font-normal leading-[1.02] tracking-[-0.035em] text-[#faf7f0] sm:text-4xl lg:text-5xl">
                  {t.homeStory.title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#e8e6de] sm:text-base">
                  {t.homeStory.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-[#faf7f0]">
                  {t.homeStory.cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </Reveal>
    </section>
  );
}
