"use client";

interface WizardProgressProps {
  current: number;
  total: number;
  label: string;
}

export default function WizardProgress({
  current,
  total,
  label,
}: WizardProgressProps) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--editorial-terracotta)]">
        {label}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 ${
              i < current
                ? "bg-[var(--editorial-sage)]"
                : "bg-[var(--editorial-border)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
