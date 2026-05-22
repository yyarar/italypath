import type { Department } from "@/app/data";

interface ProgramMetaStripProps {
  department: Department;
  factsLabel: string;
  levelLabel: string;
  durationLabel: string;
  languageLabel: string;
  levelValue: string;
  durationValue: string;
  languageValue: string;
}

export function ProgramMetaStrip({
  department,
  factsLabel,
  levelLabel,
  durationLabel,
  languageLabel,
  levelValue,
  durationValue,
  languageValue,
}: ProgramMetaStripProps) {
  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
      <p className="border-b border-[var(--editorial-border)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)] sm:px-5">
        {factsLabel}
      </p>
      <dl className="grid sm:grid-cols-3">
        {[
          { label: levelLabel, value: levelValue },
          { label: durationLabel, value: durationValue },
          { label: languageLabel, value: languageValue },
        ].map((fact, index) => (
          <div
            key={`${department.slug}-${fact.label}`}
            className={`px-4 py-5 sm:px-5 ${
              index > 0
                ? "border-t border-[var(--editorial-border)] sm:border-l sm:border-t-0"
                : ""
            }`}
          >
            <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
              {fact.label}
            </dt>
            <dd className="mt-2 font-serif text-2xl font-semibold text-[var(--editorial-ink)]">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
