"use client";

import {
  ScrollVelocityContainer,
  ScrollVelocityRow,
} from "@/components/ui/scroll-based-velocity";

function ItalyPathLine({ accent = false }: { accent?: boolean }) {
  return (
    <span className="mx-5 inline-flex items-center gap-4 md:mx-8 md:gap-6">
      <span className={accent ? "text-indigo-500/85" : "text-slate-400/80"}>
        ItalyPath
      </span>
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-300/70" />
      <span className={accent ? "text-slate-400/80" : "text-indigo-500/85"}>
        ItalyPath
      </span>
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300/80" />
      <span className={accent ? "text-indigo-500/70" : "text-slate-400/70"}>
        ItalyPath
      </span>
    </span>
  );
}

export default function VelocityBridge() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/55 to-slate-50/80 py-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 py-8 shadow-[0_14px_34px_rgba(15,23,42,0.07)] md:py-10">
          <ScrollVelocityContainer className="text-[2rem] font-black tracking-[-0.04em] leading-none md:text-[4.75rem]">
            <ScrollVelocityRow baseVelocity={16} direction={1} className="py-1">
              <ItalyPathLine accent />
            </ScrollVelocityRow>
            <ScrollVelocityRow baseVelocity={16} direction={-1} className="py-1">
              <ItalyPathLine />
            </ScrollVelocityRow>
          </ScrollVelocityContainer>

          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white via-white/95 to-transparent md:w-40" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white via-white/95 to-transparent md:w-40" />
        </div>
      </div>
    </section>
  );
}
