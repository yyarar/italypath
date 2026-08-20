"use client";

import Link from "next/link";
import { ArrowRight, Map } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

export default function ProfileInviteCard() {
  const { t } = useLanguage();

  const exploreLinks = [
    { href: "/universities", label: t.hub.invite.exploreUniversities },
    { href: "/cities", label: t.hub.invite.exploreCities },
    { href: "/scholarships", label: t.hub.invite.exploreScholarships },
  ];

  return (
    <section className="relative mt-5 overflow-hidden rounded-[2rem] bg-[var(--editorial-ink)] p-6 text-white shadow-[0_24px_70px_rgba(21,32,28,0.16)] sm:rounded-[2.5rem] sm:p-10">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[rgba(219,232,225,0.12)] blur-3xl" />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#dbe8e1] ring-1 ring-inset ring-white/10">
        <Map className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="relative mt-7 max-w-2xl font-serif text-4xl font-normal leading-[1.02] tracking-[-0.035em] text-white sm:text-5xl">
        {t.hub.invite.title}
      </h1>
      <p className="relative mt-4 max-w-xl text-sm leading-7 text-[#c8d2ce] sm:text-base">
        {t.hub.invite.desc}
      </p>
      <Link
        href="/hosgeldin"
        className="hub-pressable group relative mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#faf7f0] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] shadow-[0_10px_26px_rgba(0,0,0,0.18)] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbe8e1]"
      >
        {t.hub.invite.cta}
        <ArrowRight className="hub-arrow h-4 w-4" strokeWidth={2} />
      </Link>
      <div className="relative mt-8 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
        <span className="mr-2 text-[11px] uppercase tracking-[0.16em] text-[#aebdb7]">
          {t.hub.invite.explore}
        </span>
        {exploreLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hub-pressable rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#eef2ef] ring-1 ring-inset ring-white/10 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbe8e1]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
