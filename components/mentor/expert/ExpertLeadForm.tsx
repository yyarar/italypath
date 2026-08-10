"use client";

import { type FormEvent, useMemo, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import {
  EXPERT_FIELDS,
  EXPERT_STUDY_LEVELS,
  buildTargetIntakeOptions,
  type ExpertLeadDraft,
} from "@/lib/mentor/expertLeads";
import {
  type ExpertLeadField,
  validateExpertLeadPayload,
} from "@/lib/mentor/expertLeadValidation";

export interface ExpertLeadFormProps {
  onSubmitted: () => void;
}

type VisibleExpertLeadField = Exclude<ExpertLeadField, "submissionId">;

function createInitialDraft(): ExpertLeadDraft {
  return {
    submissionId: crypto.randomUUID(),
    fullName: "",
    whatsappPhone: "",
    studyLevel: "",
    fieldOfInterest: "",
    targetIntake: "",
    helpRequest: "",
    website: "",
  };
}

export default function ExpertLeadForm({ onSubmitted }: ExpertLeadFormProps) {
  const { t } = useLanguage();
  const copy = t.aiMentor.expertDesk;
  const [draft, setDraft] = useState<ExpertLeadDraft>(createInitialDraft);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ExpertLeadField, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const intakeOptions = useMemo(() => buildTargetIntakeOptions(), []);

  const setField = (field: keyof ExpertLeadDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (field in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const errorMessage = (field: VisibleExpertLeadField) => {
    const code = fieldErrors[field];
    if (!code) return null;
    if (code === "required") return copy.validation.required;
    return copy.validation[field];
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validateExpertLeadPayload(draft);
    if (validation.kind !== "valid") {
      setFieldErrors(validation.kind === "invalid" ? validation.errors : {});
      return;
    }

    setSubmitting(true);
    setSubmitError(false);
    try {
      const response = await fetch("/api/expert-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        errors?: Partial<Record<ExpertLeadField, string>>;
      };
      if (!response.ok || !result.ok) {
        if (result.errors) setFieldErrors(result.errors);
        throw new Error("expert_lead_submit_failed");
      }
      onSubmitted();
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const renderError = (field: VisibleExpertLeadField) => {
    const message = errorMessage(field);
    return message ? (
      <p
        id={`${field}-error`}
        role="alert"
        className="mt-2 text-sm text-[var(--editorial-terracotta)]"
      >
        {message}
      </p>
    ) : null;
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="fullName"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]"
          >
            {copy.fields.fullName}
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={draft.fullName}
            onChange={(event) => setField("fullName", event.target.value)}
            placeholder={copy.placeholders.fullName}
            autoComplete="name"
            aria-describedby={errorMessage("fullName") ? "fullName-error" : undefined}
            className="mt-2 w-full border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-3 text-base text-[var(--editorial-ink)] outline-none transition focus:border-[var(--editorial-sage)]"
          />
          {renderError("fullName")}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="whatsappPhone"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]"
          >
            {copy.fields.whatsappPhone}
          </label>
          <input
            id="whatsappPhone"
            name="whatsappPhone"
            type="tel"
            inputMode="tel"
            value={draft.whatsappPhone}
            onChange={(event) => setField("whatsappPhone", event.target.value)}
            placeholder={copy.placeholders.whatsappPhone}
            autoComplete="tel"
            aria-describedby={
              errorMessage("whatsappPhone") ? "whatsappPhone-error" : undefined
            }
            className="mt-2 w-full border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-3 text-base text-[var(--editorial-ink)] outline-none transition focus:border-[var(--editorial-sage)]"
          />
          {renderError("whatsappPhone")}
        </div>

        <div>
          <label
            htmlFor="studyLevel"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]"
          >
            {copy.fields.studyLevel}
          </label>
          <select
            id="studyLevel"
            name="studyLevel"
            value={draft.studyLevel}
            onChange={(event) => setField("studyLevel", event.target.value)}
            aria-describedby={errorMessage("studyLevel") ? "studyLevel-error" : undefined}
            className="mt-2 w-full border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-3 text-base text-[var(--editorial-ink)] outline-none transition focus:border-[var(--editorial-sage)]"
          >
            <option value="" disabled>
              {copy.fields.studyLevel}
            </option>
            {EXPERT_STUDY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {copy.studyLevels[level]}
              </option>
            ))}
          </select>
          {renderError("studyLevel")}
        </div>

        <div>
          <label
            htmlFor="fieldOfInterest"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]"
          >
            {copy.fields.fieldOfInterest}
          </label>
          <select
            id="fieldOfInterest"
            name="fieldOfInterest"
            value={draft.fieldOfInterest}
            onChange={(event) => setField("fieldOfInterest", event.target.value)}
            aria-describedby={
              errorMessage("fieldOfInterest") ? "fieldOfInterest-error" : undefined
            }
            className="mt-2 w-full border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-3 text-base text-[var(--editorial-ink)] outline-none transition focus:border-[var(--editorial-sage)]"
          >
            <option value="" disabled>
              {copy.fields.fieldOfInterest}
            </option>
            {EXPERT_FIELDS.map((field) => (
              <option key={field} value={field}>
                {copy.fieldsOfInterest[field]}
              </option>
            ))}
          </select>
          {renderError("fieldOfInterest")}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="targetIntake"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]"
          >
            {copy.fields.targetIntake}
          </label>
          <select
            id="targetIntake"
            name="targetIntake"
            value={draft.targetIntake}
            onChange={(event) => setField("targetIntake", event.target.value)}
            aria-describedby={
              errorMessage("targetIntake") ? "targetIntake-error" : undefined
            }
            className="mt-2 w-full border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-3 text-base text-[var(--editorial-ink)] outline-none transition focus:border-[var(--editorial-sage)]"
          >
            <option value="" disabled>
              {copy.fields.targetIntake}
            </option>
            {intakeOptions.map((intake) => (
              <option key={intake} value={intake}>
                {intake === "undecided" ? copy.intakeUndecided : intake}
              </option>
            ))}
          </select>
          {renderError("targetIntake")}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="helpRequest"
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]"
          >
            {copy.fields.helpRequest}
          </label>
          <textarea
            id="helpRequest"
            name="helpRequest"
            value={draft.helpRequest}
            onChange={(event) => setField("helpRequest", event.target.value)}
            placeholder={copy.placeholders.helpRequest}
            rows={6}
            aria-describedby={
              errorMessage("helpRequest") ? "helpRequest-error" : undefined
            }
            className="mt-2 w-full resize-y border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-3 text-base text-[var(--editorial-ink)] outline-none transition focus:border-[var(--editorial-sage)]"
          />
          {renderError("helpRequest")}
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
        <input
          tabIndex={-1}
          name="website"
          autoComplete="off"
          value={draft.website}
          onChange={(event) => setField("website", event.target.value)}
        />
      </div>

      {submitError ? (
        <p role="alert" className="text-sm text-[var(--editorial-terracotta)]">
          {copy.submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[var(--editorial-ink)] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-paper)] transition hover:bg-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
