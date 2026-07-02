"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

export default function ProfileInviteCard() {
  const { t } = useLanguage();

  const exploreLinks = [
    { href: "/universities", label: t.hub.invite.exploreUniversities },
    { href: "/cities", label: t.hub.invite.exploreCities },
    { href: "/scholarships", label: t.hub.invite.exploreScholarships },
  ];

  return (
    <section className="mt-8 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 sm:p-8">
      <h1 className="font-serif text-3xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)] sm:text-4xl">
        {t.hub.invite.title}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--editorial-muted)]">
        {t.hub.invite.desc}
      </p>
      <Link
        href="/hosgeldin"
        className="mt-5 inline-flex items-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
      >
        {t.hub.invite.cta}
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--editorial-border)] pt-4">
        <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
          {t.hub.invite.explore}
        </span>
        {exploreLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="border-b border-[var(--editorial-sage)] pb-px text-[12px] font-semibold text-[var(--editorial-sage)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
