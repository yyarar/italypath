"use client";

import { FieldHint, MoneyField, QuestionLabel } from "@/components/isee/fields";
import { fill } from "@/components/isee/format";
import type { StepProps } from "@/components/isee/steps/types";
import { useLanguage } from "@/context/LanguageContext";

export default function SavingsStep({ form, update, errors, language }: StepProps) {
  const { t } = useLanguage();
  const copy = t.iseeTool.savings;
  const nav = t.iseeTool.nav;
  const units = t.iseeTool.units;
  const messages = t.iseeTool.errors;
  const errorFor = (field: string) => (errors[field] ? messages[errors[field]] : undefined);

  return (
    <div className="space-y-8">
      <div>
        <QuestionLabel id="isee-savings-label">{fill(copy.heading, { year: form.referenceYear })}</QuestionLabel>
        <FieldHint>{copy.hint}</FieldHint>
      </div>
      <MoneyField
        id="isee-savings-try"
        label={copy.tryLabel}
        hint={copy.tryHint}
        value={form.savingsTry}
        onChange={(savingsTry) => update({ savingsTry })}
        suffix={units.lira}
        language={language}
        error={errorFor("savingsTry")}
      />
      <MoneyField
        id="isee-savings-eur"
        label={copy.eurLabel}
        hint={copy.eurHint}
        value={form.savingsEur}
        onChange={(savingsEur) => update({ savingsEur })}
        suffix={units.euro}
        language={language}
        optionalLabel={nav.optional}
        maxDigits={9}
      />
    </div>
  );
}
