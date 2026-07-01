"use client";

import * as SignUp from "@clerk/elements/sign-up";
import { useSignUp } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import { OAuthButtons } from "./OAuthButtons";
import { VerificationStep } from "./VerificationStep";

interface SignUpFormProps {
  onSwitchToSignIn: () => void;
  onVerificationStateChange?: (isVerifying: boolean) => void;
}

type SignUpStep = "register" | "verify";
type ClerkErrorLike = {
  code?: string;
  message?: string;
  longMessage?: string;
  meta?: {
    paramName?: unknown;
  };
};
type EmailVerificationState = {
  status?: string | null;
  missingFields?: string[];
  createdSessionId?: string | null;
  verifications?: {
    emailAddress?: {
      nextAction?: string | null;
      status?: string | null;
      strategy?: string | null;
    } | null;
  } | null;
};

const RESEND_COOLDOWN_SECONDS = 30;

function getSafeRedirectUrl(searchParams: { get: (name: string) => string | null }) {
  const redirectUrl = searchParams.get("redirect_url");

  if (redirectUrl && redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
    return redirectUrl;
  }

  return "/hub";
}

function getPrimaryClerkError(error: unknown): ClerkErrorLike | null {
  if (!isClerkAPIResponseError(error)) {
    return null;
  }

  return error.errors[0] ?? null;
}

function getErrorParamName(error: ClerkErrorLike | null) {
  const paramName = error?.meta?.paramName;

  return typeof paramName === "string" ? paramName : "";
}

function shouldPrepareEmailVerification(signUpAttempt: EmailVerificationState) {
  const emailVerification = signUpAttempt.verifications?.emailAddress;

  if (!emailVerification) {
    return true;
  }

  return emailVerification.nextAction === "needs_prepare";
}

function isLegalAcceptanceMissing(signUpAttempt: EmailVerificationState) {
  return (
    signUpAttempt.missingFields?.some(
      (field) => field === "legal_accepted" || field === "legalAccepted",
    ) ?? false
  );
}

export function SignUpForm({
  onSwitchToSignIn,
  onVerificationStateChange,
}: SignUpFormProps) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const { signUp, isLoaded, setActive } = useSignUp();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<SignUpStep>("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    onVerificationStateChange?.(step === "verify");

    return () => {
      onVerificationStateChange?.(false);
    };
  }, [onVerificationStateChange, step]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function resetErrors() {
    setEmailError("");
    setPasswordError("");
    setCodeError("");
    setFormError("");
    setNotice("");
  }

  function getTranslatedError(error: ClerkErrorLike | null, fallback: string) {
    if (!error) {
      return fallback;
    }

    if (error.code === "form_identifier_exists") {
      return t.auth.errors.emailExists;
    }

    if (error.code?.includes("password")) {
      return t.auth.errors.weakPassword;
    }

    if (error.code?.includes("code") || error.code?.includes("verification")) {
      return t.auth.errors.invalidCode;
    }

    return fallback;
  }

  function applyRegisterError(error: unknown) {
    const clerkError = getPrimaryClerkError(error);
    const paramName = getErrorParamName(clerkError);
    const translatedError = getTranslatedError(clerkError, t.auth.errors.generic);

    if (clerkError?.code === "form_identifier_exists") {
      setEmailError(t.auth.errors.emailExists);
      return;
    }

    if (paramName.includes("email")) {
      setEmailError(translatedError);
      return;
    }

    if (paramName.includes("password") || clerkError?.code?.includes("password")) {
      setPasswordError(translatedError);
      return;
    }

    setFormError(translatedError);
  }

  function applyVerificationError(error: unknown) {
    const clerkError = getPrimaryClerkError(error);
    const translatedError = getTranslatedError(clerkError, t.auth.errors.invalidCode);

    setCodeError(translatedError);
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoaded || !signUp) {
      return;
    }

    resetErrors();
    setIsSubmitting(true);

    const trimmedEmail = email.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    try {
      const signUpAttempt = await signUp.create({
        emailAddress: trimmedEmail,
        password,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        legalAccepted: true,
      });

      if (shouldPrepareEmailVerification(signUpAttempt)) {
        await signUp.prepareVerification({ strategy: "email_code" });
      }

      setSubmittedEmail(trimmedEmail);
      setCode("");
      setStep("verify");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      applyRegisterError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoaded || !signUp) {
      return;
    }

    const cleanCode = code.replace(/\D/g, "").slice(0, 6);

    if (cleanCode.length < 6) {
      setCodeError(t.auth.errors.invalidCode);
      return;
    }

    resetErrors();
    setIsSubmitting(true);

    try {
      let result = await signUp.attemptVerification({
        strategy: "email_code",
        code: cleanCode,
      });

      if (result.status !== "complete" && isLegalAcceptanceMissing(result)) {
        result = await signUp.update({ legalAccepted: true });
      }

      if (result.status !== "complete") {
        setFormError(t.auth.errors.generic);
        return;
      }

      const sessionId = result.createdSessionId || signUp.createdSessionId;

      if (!sessionId) {
        setFormError(t.auth.errors.generic);
        return;
      }

      await setActive({
        session: sessionId,
        redirectUrl: getSafeRedirectUrl(searchParams),
      });
    } catch (error) {
      applyVerificationError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!isLoaded || !signUp || resendCooldown > 0 || isResending) {
      return;
    }

    setCodeError("");
    setFormError("");
    setNotice("");
    setCode("");
    setIsResending(true);

    try {
      await signUp.prepareVerification({ strategy: "email_code" });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice(t.auth.verification.resent);
    } catch (error) {
      applyVerificationError(error);
    } finally {
      setIsResending(false);
    }
  }

  function handleBackToRegister() {
    resetErrors();
    setCode("");
    setStep("register");
  }

  if (step === "verify") {
    return (
      <VerificationStep
        email={submittedEmail || email}
        code={code}
        error={codeError || formError}
        notice={notice}
        isSubmitting={isSubmitting}
        isResending={isResending}
        resendCooldown={resendCooldown}
        onCodeChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
        onSubmit={handleVerify}
        onResend={handleResend}
        onBack={handleBackToRegister}
      />
    );
  }

  return (
    <div>
      <SignUp.Root>
        <OAuthButtons />
      </SignUp.Root>

      <form onSubmit={handleRegister} className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
              {t.auth.fields.firstName}
            </span>
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              autoComplete="given-name"
              className="h-11 border border-[var(--editorial-border)] bg-white px-3 text-sm text-[var(--editorial-ink)] focus:border-[var(--editorial-sage)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[var(--editorial-sage)]"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
              {t.auth.fields.lastName}
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              autoComplete="family-name"
              className="h-11 border border-[var(--editorial-border)] bg-white px-3 text-sm text-[var(--editorial-ink)] focus:border-[var(--editorial-sage)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[var(--editorial-sage)]"
            />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
            {t.auth.fields.email}
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="h-11 border border-[var(--editorial-border)] bg-white px-3 text-sm text-[var(--editorial-ink)] focus:border-[var(--editorial-sage)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[var(--editorial-sage)]"
          />
          {emailError && (
            <div className="flex flex-col gap-2 text-xs text-[var(--editorial-terracotta)]">
              <span>{emailError}</span>
              {emailError === t.auth.errors.emailExists && (
                <button
                  type="button"
                  onClick={onSwitchToSignIn}
                  className="self-start underline underline-offset-2 hover:text-[var(--editorial-ink)]"
                >
                  {t.auth.actions.switchToSignIn}
                </button>
              )}
            </div>
          )}
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
            {t.auth.fields.password}
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
              className="h-11 w-full border border-[var(--editorial-border)] bg-white px-3 pr-11 text-sm text-[var(--editorial-ink)] focus:border-[var(--editorial-sage)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[var(--editorial-sage)]"
            />
            <button
              type="button"
              aria-pressed={showPassword}
              aria-label={
                showPassword
                  ? t.auth.fields.hidePassword
                  : t.auth.fields.showPassword
              }
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {passwordError && (
            <p className="text-xs text-[var(--editorial-terracotta)]">
              {passwordError}
            </p>
          )}
        </label>

        {formError && (
          <p className="text-xs text-[var(--editorial-terracotta)]">
            {formError}
          </p>
        )}

        <div id="clerk-captcha" />

        <button
          type="submit"
          disabled={!isLoaded || isSubmitting}
          className="mt-2 inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? t.auth.actions.signUpLoading : t.auth.actions.signUp}
        </button>
      </form>
    </div>
  );
}
