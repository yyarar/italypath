"use client";

import { Plus } from "lucide-react";

import Reveal from "@/components/ui/Reveal";
import { useLanguage } from "@/context/LanguageContext";

export default function ConsultationFaq() {
  const { t } = useLanguage();
  const c = t.homeFaq;

  return (
    <section className="bg-[var(--editorial-paper)] pb-20 lg:pb-28">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--editorial-terracotta-ink)]">{c.eyebrow}</p>
          <h2 className="mt-4 font-serif text-4xl font-normal leading-[1.02] tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-5xl">
            {c.title}
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="border-t border-[var(--editorial-border)]">
          {c.items.map((item) => (
            <details key={item.q} className="group border-b border-[var(--editorial-border)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus
                  className="h-4 w-4 shrink-0 text-[var(--editorial-terracotta-ink)] transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-2xl pb-5 text-sm leading-7 text-[var(--editorial-muted)]">{item.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
