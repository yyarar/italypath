interface UniversityHighlightsProps {
  title: string;
  features: string[];
}

export function UniversityHighlights({
  title,
  features,
}: UniversityHighlightsProps) {
  if (features.length === 0) return null;

  return (
    <section>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
        {title}
      </p>
      <div className="mt-4 grid border border-[var(--editorial-border)] bg-[var(--editorial-surface)] sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <p
            key={feature}
            className={`min-h-20 px-4 py-5 font-serif text-xl leading-tight text-[var(--editorial-ink)] ${
              index > 0 ? "border-t border-[var(--editorial-border)] sm:border-t-0" : ""
            } ${index % 2 === 1 ? "sm:border-l sm:border-[var(--editorial-border)]" : ""} ${
              index > 1 ? "lg:border-l lg:border-[var(--editorial-border)]" : ""
            }`}
          >
            {feature}
          </p>
        ))}
      </div>
    </section>
  );
}
