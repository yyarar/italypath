"use client";

import { type FormEvent } from "react";

import { useLanguage } from "@/context/LanguageContext";

interface VerificationStepProps {
  email: string;
  code: string;
  error?: string;
  notice?: string;
  isSubmitting: boolean;
  isResending: boolean;
  resendCooldown: number;
  onCodeChange: (code: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
  onBack: () => void;
}

export function VerificationStep({
  email,
  code,
  error,
  notice,
  isSubmitting,
  isResending,
  resendCooldown,
  onCodeChange,
  onSubmit,
  onResend,
  onBack,
}: VerificationStepProps) {
  const { t } = useLanguage();
  const cleanCode = code.replace(/\D/g, "").slice(0, 6);
  const resendDisabled = isResending || resendCooldown > 0;

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--editorial-muted)]">
          {t.auth.tabs.signUp}
        </p>
        <h2 className="font-serif text-xl text-[var(--editorial-ink)]">
          {t.auth.verification.title}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--editorial-muted)]">
          {t.auth.verification.body}
        </p>
        <p className="break-all border border-[var(--editorial-border)] bg-white px-3 py-2 text-xs font-medium text-[var(--editorial-ink)]">
          {t.auth.verification.sentTo.replace("{email}", email)}
        </p>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
          {t.auth.fields.verificationCode}
        </span>
        <input
          type="text"
          value={cleanCode}
          onChange={(event) => onCodeChange(event.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          autoFocus
          className="h-12 w-full border border-[var(--editorial-border)] bg-white px-3 text-center text-lg font-semibold tracking-[0.28em] text-[var(--editorial-ink)] focus:border-[var(--editorial-sage)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[var(--editorial-sage)]"
        />
      </label>

      {error && (
        <p className="text-xs text-[var(--editorial-terracotta)]">{error}</p>
      )}

      {notice && !error && (
        <p className="text-xs text-[var(--editorial-muted)]">{notice}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || cleanCode.length < 6}
        className="inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting
          ? t.auth.actions.verifyAccountLoading
          : t.auth.actions.verifyAccount}
      </button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onResend}
          disabled={resendDisabled}
          className="text-left text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)] disabled:no-underline disabled:opacity-50"
        >
          {resendCooldown > 0
            ? t.auth.verification.resendIn.replace(
                "{seconds}",
                String(resendCooldown),
              )
            : isResending
              ? t.auth.actions.resendCodeLoading
              : t.auth.verification.resend}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="text-left text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)] sm:text-right"
        >
          {t.auth.actions.changeEmail}
        </button>
      </div>
    </form>
  );
}
