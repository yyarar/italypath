"use client";

import { Plus, Trash2 } from "lucide-react";

import { ChoiceChips, FieldError, FieldHint, MoneyField, QuestionLabel } from "@/components/isee/fields";
import { fill, formatAmount } from "@/components/isee/format";
import type { StepProps } from "@/components/isee/steps/types";
import { useLanguage } from "@/context/LanguageContext";
import type { EarnerKind } from "@/lib/isee/parificato";
import { REFERENCE_YEARS, TRY_PER_EUR, type ReferenceYear } from "@/lib/isee/reference";
import { MAX_EARNERS, nextEarnerId, type EarnerForm } from "@/lib/isee/wizardState";

const EARNER_KINDS: EarnerKind[] = ["employee", "pension", "other"];

export default function IncomeStep({ form, update, errors, language }: StepProps) {
  const { t } = useLanguage();
  const copy = t.iseeTool.income;
  const units = t.iseeTool.units;
  const messages = t.iseeTool.errors;
  const errorFor = (field: string) => (errors[field] ? messages[errors[field]] : undefined);

  const setEarner = (id: number, patch: Partial<EarnerForm>) =>
    update({ earners: form.earners.map((earner) => (earner.id === id ? { ...earner, ...patch } : earner)) });
  const addEarner = () =>
    update({ earners: [...form.earners, { id: nextEarnerId(form.earners), kind: null, grossTry: null }] });
  const removeEarner = (id: number) => update({ earners: form.earners.filter((earner) => earner.id !== id) });

  return (
    <div className="space-y-8">
      <div>
        <ChoiceChips<ReferenceYear>
          id="isee-year"
          label={copy.yearHeading}
          hint={copy.yearHint}
          options={REFERENCE_YEARS.map((year) => ({ value: year, label: String(year) }))}
          value={form.referenceYear}
          onChange={(referenceYear) => update({ referenceYear })}
        />
        <p className="mt-3 border-l-2 border-[var(--editorial-sage)] pl-3 text-sm leading-6 text-[var(--editorial-muted)]">
          {fill(copy.rateNote, {
            year: form.referenceYear,
            rate: formatAmount(TRY_PER_EUR[form.referenceYear], language, 4),
          })}
        </p>
      </div>

      <div>
        <QuestionLabel id="isee-earners-label">{copy.earnersHeading}</QuestionLabel>
        <FieldHint>{copy.earnersHint}</FieldHint>
        <FieldHint>{copy.otherHint}</FieldHint>

        <div className="mt-4 space-y-4">
          {form.earners.map((earner, index) => (
            <fieldset
              key={earner.id}
              className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)] p-4"
            >
              <legend className="px-1 text-sm font-semibold text-[var(--editorial-muted)]">
                {fill(copy.earnerTitle, { n: index + 1 })}
              </legend>
              <ChoiceChips<EarnerKind>
                id={`isee-earner-${earner.id}-kind`}
                label={copy.kindLabel}
                options={EARNER_KINDS.map((kind) => ({ value: kind, label: copy.kinds[kind] }))}
                value={earner.kind}
                onChange={(kind) => setEarner(earner.id, { kind })}
                error={errorFor(`earner-${earner.id}-kind`)}
              />
              <div className="mt-5">
                <MoneyField
                  id={`isee-earner-${earner.id}-amount`}
                  label={copy.amountLabel}
                  value={earner.grossTry}
                  onChange={(grossTry) => setEarner(earner.id, { grossTry })}
                  suffix={units.lira}
                  language={language}
                  error={errorFor(`earner-${earner.id}-amount`)}
                />
              </div>
              {form.earners.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeEarner(earner.id)}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#8b321a] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {copy.removeEarner}
                </button>
              ) : null}
            </fieldset>
          ))}
        </div>

        <FieldError id="isee-earners-error" message={errorFor("earners")} />

        {form.earners.length < MAX_EARNERS ? (
          <button
            type="button"
            onClick={addEarner}
            className="mt-4 inline-flex min-h-11 items-center gap-2 border border-[var(--editorial-sage)] px-4 text-sm font-semibold text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {copy.addEarner}
          </button>
        ) : null}
      </div>
    </div>
  );
}
