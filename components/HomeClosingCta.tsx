"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { useLanguage } from "@/context/LanguageContext";
import Reveal from "@/components/ui/Reveal";

// Sayfa sonu kapanis cagrisi. Koyu ink bant; hero'daki sage/paper ile kontrast.
export default function HomeClosingCta() {
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const c = t.homeClose;
  const primaryHref = isSignedIn ? "/hub" : "/giris?mode=kayit";
  const primaryLabel = isSignedIn ? c.primaryCtaSignedIn : c.primaryCta;

  return (
    <section className="bg-[var(--editorial-paper)] pb-16 lg:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="border border-[#0f1712] bg-[#15201c] px-6 py-14 text-center sm:px-10 lg:px-16 lg:py-20">
          <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e7c9b8]">
            <span className="h-px w-7 bg-[#e7c9b8]" aria-hidden="true" />
            {c.eyebrow}
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-serif text-3xl font-normal leading-[1.05] tracking-[-0.02em] text-[#faf7f0] sm:text-4xl lg:text-5xl">
            {c.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#c9d8d1] sm:text-base">{c.body}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className="group inline-flex items-center justify-center bg-[#faf7f0] px-6 py-3 text-sm font-semibold text-[#15201c] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c9b8]"
            >
              {primaryLabel}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1" />
            </Link>
            <Link
              href="/universities"
              className="group inline-flex items-center justify-center border border-white/30 px-6 py-3 text-sm font-semibold text-[#faf7f0] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#e7c9b8] hover:text-[#e7c9b8] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c9b8]"
            >
              {c.secondaryCta}
              <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-1 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 group-hover:translate-x-0" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
