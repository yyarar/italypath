"use client";

import { useState } from "react";
import { Check, MessageCircle } from "lucide-react";

import ExpertLeadForm from "@/components/mentor/expert/ExpertLeadForm";
import Reveal from "@/components/ui/Reveal";
import { useLanguage } from "@/context/LanguageContext";
import { CONSULT_ANCHOR } from "@/lib/consultation";

interface ConsultationSectionProps {
  // "page": /on-gorusme'de başlık h1 ve navbar için üst boşluk; "home": ana sayfa bölümü.
  variant: "home" | "page";
}

export default function ConsultationSection({ variant }: ConsultationSectionProps) {
  const { t } = useLanguage();
  const c = t.consultation;
  const [submitted, setSubmitted] = useState(false);
  const Heading = variant === "page" ? "h1" : "h2";

  return (
    <section
      id={CONSULT_ANCHOR}
      className={`scroll-mt-24 bg-[var(--editorial-paper)] ${
        variant === "page" ? "pb-16 pt-24 sm:pt-28" : "pb-20 lg:pb-28"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="overflow-hidden rounded-[2rem] bg-[var(--editorial-ink)] text-[#faf7f0] shadow-[0_28px_80px_rgba(21,32,28,0.18)] sm:rounded-[2.5rem]">
          <div className="grid lg:grid-cols-[1fr_1.05fr]">
            <div className="relative p-6 sm:p-10 lg:p-12">
              <p className="relative flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e7c9b8]">
                <span className="h-px w-7 bg-[#e7c9b8]" aria-hidden="true" />
                {c.eyebrow}
              </p>
              <Heading className="relative mt-4 max-w-lg font-serif text-4xl font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-5xl">
                {c.title}
              </Heading>
              <p className="relative mt-5 max-w-lg text-base leading-7 text-[#c9d8d1]">{c.body}</p>

              <ul className="relative mt-6 flex flex-wrap gap-2">
                {c.reassurance.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-[#eef2ef] ring-1 ring-inset ring-white/10"
                  >
                    <Check className="h-3.5 w-3.5 text-[#f3d2bf]" strokeWidth={2.5} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="relative mt-10">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#aebdb7]">{c.areasTitle}</h3>
                <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">
                  {c.areas.map((area, index) => (
                    <li key={area.title} className="grid grid-cols-[2rem_1fr] gap-3 py-3.5">
                      <span className="font-serif text-sm text-[#d8a88e]">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{area.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-[#aebdb7]">{area.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative mt-10">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#aebdb7]">{c.stepsTitle}</h3>
                <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                  {c.steps.map((step, index) => (
                    <li key={step.title} className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-inset ring-white/10">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--editorial-terracotta)] text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-white">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#aebdb7]">{step.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="bg-[var(--editorial-paper)] p-3 sm:p-4 lg:p-5">
              <div className="h-full rounded-[1.5rem] bg-[var(--editorial-surface)] p-5 text-[var(--editorial-ink)] sm:rounded-[2rem] sm:p-8">
                <div className="flex items-center gap-3 border-b border-[var(--editorial-border)] pb-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--editorial-terracotta)] text-white">
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl leading-tight">{c.formTitle}</h3>
                    <p className="mt-0.5 text-xs text-[var(--editorial-muted)]">{c.reassurance.join(" · ")}</p>
                  </div>
                </div>

                {submitted ? (
                  <div aria-live="polite" className="py-10">
                    <p className="max-w-xl font-serif text-xl leading-8 text-[var(--editorial-ink)]">
                      {t.aiMentor.expertDesk.success}
                    </p>
                  </div>
                ) : (
                  <div className="pt-6">
                    <ExpertLeadForm onSubmitted={() => setSubmitted(true)} />
                  </div>
                )}
                <p className="mt-5 text-xs leading-5 text-[var(--editorial-muted)]">{c.formNote}</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
