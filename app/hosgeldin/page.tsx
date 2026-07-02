"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import WizardFinale from "@/components/onboarding/WizardFinale";
import WizardOptionCard from "@/components/onboarding/WizardOptionCard";
import WizardProgress from "@/components/onboarding/WizardProgress";
import { useLanguage } from "@/context/LanguageContext";
import {
  MAX_PROFILE_FIELDS,
  PROFILE_BUDGETS,
  PROFILE_CITY_PREFS,
  PROFILE_FIELDS,
  PROFILE_LEVELS,
  isProfileEmpty,
  type UserProfile,
} from "@/lib/hub/profile";
import { useUserProfile } from "@/lib/hub/useUserProfile";

type StepId = "level" | "fields" | "budget" | "city";

const STEPS: StepId[] = ["level", "fields", "budget", "city"];

export default function HosgeldinPage() {
  const { profile, loading, saveProfile } = useUserProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="h-8 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-40 bg-[var(--editorial-surface)] shimmer" />
        </div>
      </div>
    );
  }

  return <OnboardingWizard initialProfile={profile} saveProfile={saveProfile} />;
}

interface OnboardingWizardProps {
  initialProfile: UserProfile;
  saveProfile: (next: UserProfile) => Promise<boolean>;
}

function OnboardingWizard({
  initialProfile,
  saveProfile,
}: OnboardingWizardProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<UserProfile>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [finished, setFinished] = useState(false);

  const step = STEPS[stepIndex];
  const stepCopy = t.onboarding.steps[step];
  const stepLabel = t.onboarding.stepLabel
    .replace("{current}", String(stepIndex + 1))
    .replace("{total}", String(STEPS.length));

  const persist = async (next: UserProfile): Promise<boolean> => {
    if (isProfileEmpty(next)) return true;
    setSaving(true);
    setSaveFailed(false);
    const ok = await saveProfile(next);
    setSaving(false);
    if (!ok) setSaveFailed(true);
    return ok;
  };

  const handleSkip = async () => {
    await persist(draft);
    router.push("/hub");
  };

  const handleFinish = async () => {
    const ok = await persist(draft);
    if (!ok) return;
    setFinished(true);
    window.setTimeout(() => router.push("/hub"), 1400);
  };

  const toggleField = (field: (typeof PROFILE_FIELDS)[number]) => {
    setDraft((current) => {
      if (current.fields.includes(field)) {
        return {
          ...current,
          fields: current.fields.filter((selected) => selected !== field),
        };
      }
      if (current.fields.length >= MAX_PROFILE_FIELDS) return current;
      return { ...current, fields: [...current.fields, field] };
    });
  };

  const options = (() => {
    if (step === "level") {
      return PROFILE_LEVELS.map((value) => ({
        value,
        label: t.onboarding.steps.level.options[value],
        selected: draft.level === value,
        onToggle: () =>
          setDraft((current) => ({
            ...current,
            level: current.level === value ? null : value,
          })),
        multi: false,
      }));
    }

    if (step === "fields") {
      return PROFILE_FIELDS.map((value) => ({
        value,
        label: t.onboarding.steps.fields.options[value],
        selected: draft.fields.includes(value),
        onToggle: () => toggleField(value),
        multi: true,
      }));
    }

    if (step === "budget") {
      return PROFILE_BUDGETS.map((value) => ({
        value,
        label: t.onboarding.steps.budget.options[value],
        selected: draft.budget === value,
        onToggle: () =>
          setDraft((current) => ({
            ...current,
            budget: current.budget === value ? null : value,
          })),
        multi: false,
      }));
    }

    return PROFILE_CITY_PREFS.map((value) => ({
      value,
      label: t.onboarding.steps.city.options[value],
      selected: draft.cityPref === value,
      onToggle: () =>
        setDraft((current) => ({
          ...current,
          cityPref: current.cityPref === value ? null : value,
        })),
      multi: false,
    }));
  })();

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-8 sm:px-6 sm:py-12">
      <main className="mx-auto max-w-xl">
        {finished ? (
          <WizardFinale
            eyebrow={t.onboarding.finale.eyebrow}
            title={t.onboarding.finale.title}
            subtitle={t.onboarding.finale.subtitle}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-ink)]"
              >
                ITALYPATH
              </Link>
              <button
                type="button"
                onClick={handleSkip}
                className="inline-flex items-center gap-1 border-b border-[var(--editorial-border)] pb-px text-xs text-[var(--editorial-muted)] transition-colors hover:text-[var(--editorial-ink)]"
              >
                {t.onboarding.skip}
                <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>

            <div className="mt-8">
              <WizardProgress
                current={stepIndex + 1}
                total={STEPS.length}
                label={stepLabel}
              />
            </div>

            <h1 className="mt-6 font-serif text-3xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)] sm:text-4xl">
              {stepCopy.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--editorial-muted)]">
              {stepCopy.subtitle}
            </p>

            <div
              role={step === "fields" ? "group" : "radiogroup"}
              aria-label={stepCopy.title}
              className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {options.map((option) => (
                <WizardOptionCard
                  key={option.value}
                  label={option.label}
                  selected={option.selected}
                  onToggle={option.onToggle}
                  multi={option.multi}
                />
              ))}
            </div>

            {saveFailed && (
              <div className="mt-4 border border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-4 py-3">
                <p className="text-sm text-[var(--editorial-ink)]">
                  {t.onboarding.saveError}
                </p>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                disabled={stepIndex === 0}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--editorial-muted)] transition-colors hover:text-[var(--editorial-ink)] disabled:invisible"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                {t.onboarding.back}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  stepIndex === STEPS.length - 1
                    ? void handleFinish()
                    : setStepIndex((current) => current + 1)
                }
                className="inline-flex items-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px] disabled:opacity-60"
              >
                {saveFailed
                  ? t.onboarding.retry
                  : stepIndex === STEPS.length - 1
                    ? t.onboarding.finish
                    : t.onboarding.next}
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
