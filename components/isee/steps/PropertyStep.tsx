"use client";

import { Info } from "lucide-react";

import { FieldError, MoneyField, QuestionLabel, YesNo } from "@/components/isee/fields";
import { fill, formatAmount, formatEuro } from "@/components/isee/format";
import type { StepProps } from "@/components/isee/steps/types";
import WizardOptionCard from "@/components/onboarding/WizardOptionCard";
import { useLanguage } from "@/context/LanguageContext";
import { SQM_VALUE_EUR } from "@/lib/isee/parificato";
import type { Tenure } from "@/lib/isee/wizardState";

const TENURES: Tenure[] = ["owned", "rented", "free"];

function InfoBox({ children }: { children: string }) {
  return (
    <p className="flex gap-2 border border-[var(--isee-blue-border)] bg-[var(--isee-blue-bg)] p-3 text-sm leading-6 text-[var(--isee-blue-ink)]">
      <Info className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export default function PropertyStep({ form, update, errors, language }: StepProps) {
  const { t } = useLanguage();
  const copy = t.iseeTool.property;
  const nav = t.iseeTool.nav;
  const units = t.iseeTool.units;
  const messages = t.iseeTool.errors;
  const errorFor = (field: string) => (errors[field] ? messages[errors[field]] : undefined);

  const sqmInfo = (sqm: number | null) =>
    sqm && sqm > 0
      ? fill(copy.sqmInfo, {
          sqm: formatAmount(sqm, language),
          value: formatEuro(sqm * SQM_VALUE_EUR, language),
        })
      : copy.sqmInfoEmpty;

  return (
    <div className="space-y-8">
      <div>
        <QuestionLabel id="isee-tenure-label">{copy.heading}</QuestionLabel>
        <div
          role="radiogroup"
          aria-labelledby="isee-tenure-label"
          aria-describedby={errorFor("tenure") ? "isee-tenure-error" : undefined}
          className="mt-3 grid gap-2"
        >
          {TENURES.map((tenure) => (
            <WizardOptionCard
              key={tenure}
              label={copy.tenure[tenure]}
              selected={form.tenure === tenure}
              onToggle={() => update({ tenure })}
            />
          ))}
        </div>
        <FieldError id="isee-tenure-error" message={errorFor("tenure")} />
      </div>

      {form.tenure === "owned" ? (
        <div className="space-y-5">
          <MoneyField
            id="isee-home-sqm"
            label={copy.sqmLabel}
            value={form.homeSqm}
            onChange={(homeSqm) => update({ homeSqm })}
            suffix={units.sqm}
            language={language}
            maxDigits={4}
            error={errorFor("homeSqm")}
          />
          <InfoBox>{`${sqmInfo(form.homeSqm)} ${copy.homeExemptNote}`}</InfoBox>
          <MoneyField
            id="isee-home-mortgage"
            label={copy.mortgageLabel}
            hint={fill(copy.mortgageHint, { year: form.referenceYear })}
            value={form.homeMortgageTry}
            onChange={(homeMortgageTry) => update({ homeMortgageTry })}
            suffix={units.lira}
            language={language}
            optionalLabel={nav.optional}
          />
        </div>
      ) : null}

      {form.tenure === "rented" ? (
        <MoneyField
          id="isee-rent"
          label={copy.rentLabel}
          hint={fill(copy.rentHint, { year: form.referenceYear })}
          value={form.annualRentTry}
          onChange={(annualRentTry) => update({ annualRentTry })}
          suffix={units.lira}
          language={language}
          error={errorFor("annualRentTry")}
        />
      ) : null}

      <YesNo
        id="isee-other-buildings"
        label={copy.otherHeading}
        hint={copy.otherHint}
        value={form.hasOtherBuildings}
        onChange={(hasOtherBuildings) => update({ hasOtherBuildings })}
        yes={nav.yes}
        no={nav.no}
        error={errorFor("hasOtherBuildings")}
      />

      {form.hasOtherBuildings ? (
        <div className="space-y-5">
          <MoneyField
            id="isee-other-sqm"
            label={copy.otherSqmLabel}
            value={form.otherSqm}
            onChange={(otherSqm) => update({ otherSqm })}
            suffix={units.sqm}
            language={language}
            maxDigits={4}
            error={errorFor("otherSqm")}
          />
          <InfoBox>{sqmInfo(form.otherSqm)}</InfoBox>
          <MoneyField
            id="isee-other-mortgage"
            label={copy.otherMortgageLabel}
            hint={copy.otherMortgageHint}
            value={form.otherMortgageTry}
            onChange={(otherMortgageTry) => update({ otherMortgageTry })}
            suffix={units.lira}
            language={language}
            optionalLabel={nav.optional}
          />
        </div>
      ) : null}
    </div>
  );
}
