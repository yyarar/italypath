"use client";

import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

import { formatAmount, parseDigits, type Language } from "@/components/isee/format";

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]";

export function FieldHint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-sm leading-6 text-[var(--editorial-muted)]">
      {children}
    </p>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm font-semibold text-[#8b321a]">
      {message}
    </p>
  );
}

export function QuestionLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-base font-semibold leading-6 text-[var(--editorial-ink)]">
      {children}
    </p>
  );
}

function Chip({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`min-h-11 min-w-11 border px-4 text-sm font-semibold transition-colors active:translate-y-[1px] ${FOCUS_RING} ${
        selected
          ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white"
          : "border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-ink)] hover:bg-[var(--editorial-sage-soft)]"
      }`}
    >
      {label}
    </button>
  );
}

interface ChoiceChipsProps<T extends string | number> {
  id: string;
  label: string;
  hint?: string;
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
}

export function ChoiceChips<T extends string | number>({
  id,
  label,
  hint,
  options,
  value,
  onChange,
  error,
}: ChoiceChipsProps<T>) {
  return (
    <div>
      <QuestionLabel id={`${id}-label`}>{label}</QuestionLabel>
      {hint ? <FieldHint id={`${id}-hint`}>{hint}</FieldHint> : null}
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-3 flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <Chip
            key={String(option.value)}
            label={option.label}
            selected={value === option.value}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

interface NumberChipsProps {
  id: string;
  label: string;
  hint?: string;
  min: number;
  // Çip olarak gösterilen son sayı; bir üstü "N+" çipidir ve artır/azalt düğmeleriyle devam eder.
  max: number;
  hardMax?: number;
  value: number | null;
  onChange: (value: number) => void;
  increaseLabel: string;
  decreaseLabel: string;
  error?: string;
}

export function NumberChips({
  id,
  label,
  hint,
  min,
  max,
  hardMax = 20,
  value,
  onChange,
  increaseLabel,
  decreaseLabel,
  error,
}: NumberChipsProps) {
  const moreFrom = max + 1;
  const isMore = value !== null && value >= moreFrom;
  const numbers = Array.from({ length: max - min + 1 }, (_, index) => min + index);

  return (
    <div>
      <QuestionLabel id={`${id}-label`}>{label}</QuestionLabel>
      {hint ? <FieldHint id={`${id}-hint`}>{hint}</FieldHint> : null}
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-3 flex flex-wrap gap-2"
      >
        {numbers.map((number) => (
          <Chip key={number} label={String(number)} selected={value === number} onSelect={() => onChange(number)} />
        ))}
        <Chip label={`${moreFrom}+`} selected={isMore} onSelect={() => onChange(isMore && value ? value : moreFrom)} />
      </div>
      {isMore && value !== null ? (
        <div className="mt-3 inline-flex items-center border border-[var(--editorial-border)] bg-white">
          <button
            type="button"
            aria-label={decreaseLabel}
            onClick={() => onChange(Math.max(moreFrom, value - 1))}
            className={`flex h-11 w-11 items-center justify-center text-[var(--editorial-sage)] hover:bg-[var(--editorial-sage-soft)] ${FOCUS_RING}`}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <output
            aria-live="polite"
            className="min-w-12 border-x border-[var(--editorial-border)] px-3 text-center text-base font-semibold tabular-nums text-[var(--editorial-ink)]"
          >
            {value}
          </output>
          <button
            type="button"
            aria-label={increaseLabel}
            onClick={() => onChange(Math.min(hardMax, value + 1))}
            className={`flex h-11 w-11 items-center justify-center text-[var(--editorial-sage)] hover:bg-[var(--editorial-sage-soft)] ${FOCUS_RING}`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

interface YesNoProps {
  id: string;
  label: string;
  hint?: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  yes: string;
  no: string;
  error?: string;
}

export function YesNo({ id, label, hint, value, onChange, yes, no, error }: YesNoProps) {
  return (
    <ChoiceChips<"yes" | "no">
      id={id}
      label={label}
      hint={hint}
      options={[
        { value: "yes", label: yes },
        { value: "no", label: no },
      ]}
      value={value === null ? null : value ? "yes" : "no"}
      onChange={(next) => onChange(next === "yes")}
      error={error}
    />
  );
}

interface MoneyFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix: string;
  language: Language;
  optionalLabel?: string;
  maxDigits?: number;
  error?: string;
}

export function MoneyField({
  id,
  label,
  hint,
  value,
  onChange,
  suffix,
  language,
  optionalLabel,
  maxDigits = 12,
  error,
}: MoneyFieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-base font-semibold leading-6 text-[var(--editorial-ink)]">
        {label}
        {optionalLabel ? (
          <span className="ml-2 text-sm font-normal text-[var(--editorial-muted)]">({optionalLabel})</span>
        ) : null}
      </label>
      {hint ? <FieldHint id={`${id}-hint`}>{hint}</FieldHint> : null}
      <div
        className={`mt-2 flex items-center border bg-white focus-within:ring-2 focus-within:ring-[var(--editorial-sage-soft)] ${
          error
            ? "border-[#b3401f]"
            : "border-[var(--editorial-border)] focus-within:border-[var(--editorial-sage)]"
        }`}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value === null ? "" : formatAmount(value, language)}
          onChange={(event) => onChange(parseDigits(event.target.value, maxDigits))}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-right text-base font-semibold tabular-nums text-[var(--editorial-ink)] outline-none"
        />
        <span className="flex h-12 min-w-12 items-center justify-center border-l border-[var(--editorial-border)] px-3 text-sm font-semibold text-[var(--editorial-muted)]">
          {suffix}
        </span>
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
