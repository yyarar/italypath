"use client";

import { Check } from "lucide-react";

interface WizardOptionCardProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  multi?: boolean;
}

export default function WizardOptionCard({
  label,
  selected,
  onToggle,
  multi = false,
}: WizardOptionCardProps) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-3 border px-4 py-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px] ${
        selected
          ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)]"
          : "border-[var(--editorial-border)] bg-[var(--editorial-surface)] hover:bg-[rgba(216,222,217,0.25)]"
      }`}
    >
      <span
        className={`text-sm leading-5 ${
          selected
            ? "font-semibold text-[var(--editorial-ink)]"
            : "text-[var(--editorial-ink)]"
        }`}
      >
        {label}
      </span>
      {selected && (
        <Check
          className="h-4 w-4 shrink-0 text-[var(--editorial-sage)]"
          strokeWidth={2.5}
        />
      )}
    </button>
  );
}
