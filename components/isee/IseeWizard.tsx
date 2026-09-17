"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import IseeResult from "@/components/isee/IseeResult";
import HouseholdStep from "@/components/isee/steps/HouseholdStep";
import IncomeStep from "@/components/isee/steps/IncomeStep";
import PropertyStep from "@/components/isee/steps/PropertyStep";
import SavingsStep from "@/components/isee/steps/SavingsStep";
import WizardProgress from "@/components/onboarding/WizardProgress";
import { useLanguage } from "@/context/LanguageContext";
import { calculateParificato } from "@/lib/isee/parificato";
import { CITY_THRESHOLDS, DEFAULT_REFERENCE_YEAR, TRY_PER_EUR, averageLimits } from "@/lib/isee/reference";
import { buildVerdict } from "@/lib/isee/verdict";
import {
  STEP_ORDER,
  createEmptyForm,
  toParificatoInput,
  validateStep,
  type IseeFormState,
  type StepErrors,
} from "@/lib/isee/wizardState";

export default function IseeWizard() {
  const { t, language } = useLanguage();
  const copy = t.iseeTool;
  const [form, setForm] = useState<IseeFormState>(() => createEmptyForm(DEFAULT_REFERENCE_YEAR));
  const [stepIndex, setStepIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [errors, setErrors] = useState<StepErrors>({});
  const [errorTick, setErrorTick] = useState(0);
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  // Adım ya da görünüm değişince odağı başlığa taşı; ilk yüklemede sayfayı kaydırma.
  useEffect(() => {
    if (!hasNavigated.current) return;
    headingRef.current?.focus({ preventScroll: true });
    cardRef.current?.scrollIntoView({ block: "start" });
  }, [stepIndex, showResult]);

  // Doğrulama başarısızsa ilk hata mesajını görünür alana getir.
  useEffect(() => {
    if (errorTick === 0) return;
    cardRef.current?.querySelector('[role="alert"]')?.scrollIntoView({ block: "center" });
  }, [errorTick]);

  const outcome = useMemo(() => {
    if (!showResult) return null;
    const result = calculateParificato(toParificatoInput(form), TRY_PER_EUR[form.referenceYear]);
    return { result, verdict: buildVerdict(result.isee, result.ispe, CITY_THRESHOLDS, averageLimits()) };
  }, [form, showResult]);

  const step = STEP_ORDER[stepIndex];
  const isLastStep = stepIndex === STEP_ORDER.length - 1;
  const stepTitles = {
    household: copy.household.title,
    income: copy.income.title,
    property: copy.property.title,
    savings: copy.savings.title,
  };

  const update = (patch: Partial<IseeFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      if (Object.keys(current).length === 0) return current;
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      if ("earners" in patch) {
        for (const key of Object.keys(next)) {
          if (key.startsWith("earner")) delete next[key];
        }
      }
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateStep(step, form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setErrorTick((tick) => tick + 1);
      return;
    }
    setErrors({});
    hasNavigated.current = true;
    if (isLastStep) setShowResult(true);
    else setStepIndex((index) => index + 1);
  };

  const handleBack = () => {
    setErrors({});
    hasNavigated.current = true;
    setStepIndex((index) => Math.max(0, index - 1));
  };

  const handleEdit = () => {
    hasNavigated.current = true;
    setShowResult(false);
    setStepIndex(0);
  };

  const handleRestart = () => {
    hasNavigated.current = true;
    setForm(createEmptyForm(DEFAULT_REFERENCE_YEAR));
    setErrors({});
    setShowResult(false);
    setStepIndex(0);
  };

  const stepProps = { form, update, errors, language };

  return (
    <section
      ref={cardRef}
      aria-labelledby="isee-wizard-heading"
      className="mx-auto max-w-2xl scroll-mt-6 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shadow-[0_18px_50px_rgba(21,32,28,0.08)]"
    >
      {outcome ? (
        <IseeResult
          result={outcome.result}
          verdict={outcome.verdict}
          referenceYear={form.referenceYear}
          language={language}
          headingRef={headingRef}
          onEdit={handleEdit}
          onRestart={handleRestart}
        />
      ) : (
        <form noValidate onSubmit={handleSubmit} className="p-5 sm:p-8">
          <WizardProgress
            current={stepIndex + 1}
            total={STEP_ORDER.length}
            label={`${copy.nav.stepWord} ${stepIndex + 1} / ${STEP_ORDER.length}`}
          />
          <h2
            id="isee-wizard-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-5 font-serif text-3xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] outline-none"
          >
            {stepTitles[step]}
          </h2>

          <div className="mt-7">
            {step === "household" ? <HouseholdStep {...stepProps} /> : null}
            {step === "income" ? <IncomeStep {...stepProps} /> : null}
            {step === "property" ? <PropertyStep {...stepProps} /> : null}
            {step === "savings" ? <SavingsStep {...stepProps} /> : null}
          </div>

          {Object.keys(errors).length > 0 ? (
            <p role="alert" className="mt-6 text-sm font-semibold text-[#8b321a]">
              {copy.errors.summary}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--editorial-border)] pt-5">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex min-h-11 items-center gap-2 border border-[var(--editorial-border)] px-5 text-sm font-semibold text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {copy.nav.back}
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-6 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              {isLastStep ? copy.nav.calculate : copy.nav.next}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
