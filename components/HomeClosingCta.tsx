"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import Reveal from "@/components/ui/Reveal";
import { CONSULT_ANCHOR } from "@/lib/consultation";
import { HOME_PHOTOS } from "@/lib/homePhotos";

// Sayfa sonu kapanis cagrisi. Koyu ink bant; hero'daki sage/paper ile kontrast.
export default function HomeClosingCta() {
  const { t } = useLanguage();
  const c = t.homeClose;

  return (
    <section className="bg-[var(--editorial-paper)] pb-16 lg:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="relative isolate overflow-hidden rounded-[2rem] border border-[#0f1712] bg-[#15201c] px-6 py-14 text-center shadow-[0_24px_70px_rgba(21,32,28,0.16)] sm:rounded-[2.5rem] sm:px-10 lg:px-16 lg:py-20">
          <Image
            src={HOME_PHOTOS.closingPortico.src}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="-z-10 object-cover opacity-45"
          />
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(21,32,28,0.55),rgba(21,32,28,0.92))]"
            aria-hidden="true"
          />
          <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e7c9b8]">
            <span className="h-px w-7 bg-[#e7c9b8]" aria-hidden="true" />
            {c.eyebrow}
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-serif text-3xl font-normal leading-[1.05] tracking-[-0.02em] text-[#faf7f0] sm:text-4xl lg:text-5xl">
            {c.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#c9d8d1] sm:text-base">{c.body}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={`#${CONSULT_ANCHOR}`}
              className="home-pressable group inline-flex items-center justify-center rounded-full bg-[var(--editorial-terracotta)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c9b8]"
            >
              {c.primaryCta}
              <ArrowRight className="home-hover-arrow ml-2 h-4 w-4" />
            </a>
            <Link
              href="/universities"
              className="home-pressable group inline-flex items-center justify-center rounded-full border border-white/30 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-[#faf7f0] hover:border-[#e7c9b8] hover:text-[#e7c9b8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c9b8]"
            >
              {c.secondaryCta}
              <ArrowRight className="home-hover-arrow ml-2 h-4 w-4 opacity-70" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
