"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function VelocityBridge() {
  const { language } = useLanguage();
  const items =
    language === "tr"
      ? [
          ["64", "üniversite"],
          ["240", "program"],
          ["20", "bölgesel burs kaydı"],
          ["1", "kişisel merkez"],
        ]
      : [
          ["64", "universities"],
          ["240", "programs"],
          ["20", "regional scholarship records"],
          ["1", "personal hub"],
        ];

  return (
    <section className="bg-[var(--editorial-paper)] py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid border-y border-[var(--editorial-border)] sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([value, label]) => (
            <div key={label} className="border-b border-[var(--editorial-border)] py-5 sm:border-r sm:pr-6 lg:border-b-0">
              <p className="text-3xl font-semibold tracking-[-0.025em] text-[var(--editorial-ink)]">{value}</p>
              <p className="mt-1 text-sm text-[var(--editorial-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
