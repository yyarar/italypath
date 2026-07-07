"use client";

import Link from "next/link";
import { ArrowRight, PencilRuler } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { useLanguage } from "@/context/LanguageContext";

// Hero'nun sag panelinde SAT soru bankasini onizler. Korumali route oldugu icin
// cikis yapmis kullaniciyi /giris?redirect_url=/sat adresine yollar.
export default function SatHeroPanel() {
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const s = t.homeSat;
  const href = isSignedIn ? "/sat" : "/giris?redirect_url=%2Fsat";

  const sections: Array<{ index: string; title: string; domains: string }> = [
    { index: "01", title: s.mathSection, domains: s.mathDomains },
    { index: "02", title: s.rwSection, domains: s.rwDomains },
  ];

  return (
    <aside
      className="relative border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 shadow-[0_18px_50px_rgba(21,32,28,0.08)] sm:p-5 lg:p-6"
      aria-label={s.eyebrow}
    >
      <div className="mb-5 -mx-2 -mt-2 flex items-start justify-between gap-4 border-b border-[var(--editorial-border)] px-2 pb-4 pt-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
            {s.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-normal leading-tight tracking-[-0.01em] text-[var(--editorial-ink)]">
            {s.panelTitle}
          </h2>
          <p className="mt-1 text-xs text-[var(--editorial-muted)]">{s.panelSubtitle}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--editorial-border)] bg-[#f5f1e8] text-[var(--editorial-sage)]">
          <PencilRuler className="h-5 w-5" />
        </div>
      </div>

      <div className="divide-y divide-[var(--editorial-border)] border-y border-[var(--editorial-border)]">
        {sections.map(({ index, title, domains }) => (
          <div key={index} className="grid grid-cols-[auto_1fr] items-baseline gap-3 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--editorial-sage)]">
              {index}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--editorial-ink)]">{title}</p>
              <p className="mt-1 text-xs text-[var(--editorial-muted)]">{domains}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--editorial-muted)]">{s.difficultyLabel}:</span>
        {[s.difficultyEasy, s.difficultyMedium, s.difficultyHard].map((level) => (
          <span
            key={level}
            className="border border-[var(--editorial-border)] bg-[var(--editorial-band)] px-2.5 py-1 text-[11px] font-semibold text-[var(--editorial-ink)]"
          >
            {level}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-[var(--editorial-muted)]">{s.progressLabel}</p>

      <Link
        href={href}
        aria-label={s.ariaOpen}
        className="mt-6 inline-flex w-full items-center justify-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
      >
        {s.cta}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </aside>
  );
}
