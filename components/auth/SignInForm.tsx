"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useSignIn } from "@clerk/nextjs";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import {
  PasswordResetFlow,
  PasswordResetVerification,
} from "@/components/auth/PasswordResetFlow";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthLoadingFallback } from "@/components/auth/AuthAvailability";

function EmailCodeSecondFactorPreparation() {
  const { isLoaded, signIn } = useSignIn();
  const hasPrepared = useRef(false);

  useEffect(() => {
    if (!isLoaded || !signIn || hasPrepared.current) {
      return;
    }

    const hasEmailCodeSecondFactor = signIn.supportedSecondFactors?.some(
      (factor) => factor.strategy === "email_code",
    );

    if (signIn.status !== "needs_second_factor" || !hasEmailCodeSecondFactor) {
      return;
    }

    hasPrepared.current = true;

    void signIn.prepareSecondFactor({ strategy: "email_code" }).catch(() => {
      hasPrepared.current = false;
    });
  }, [isLoaded, signIn]);

  return null;
}

export function SignInForm() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SignIn.Root
      path="/giris"
      routing="virtual"
      fallback={<AuthLoadingFallback />}
    >
      <SignIn.Step name="start">
        <OAuthButtons />

        <div className="grid gap-4">
          <Clerk.Field name="identifier" className="grid gap-1.5">
            <Clerk.Label className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
              {t.auth.fields.email}
            </Clerk.Label>
            <Clerk.Input
              type="email"
              required
              autoComplete="email"
              className="h-11 border border-[var(--editorial-border)] bg-white px-3 text-sm text-[var(--editorial-ink)] focus:border-[var(--editorial-sage)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[var(--editorial-sage)]"
            />
            <Clerk.FieldError className="text-xs text-[var(--editorial-terracotta)]" />
          </Clerk.Field>

          <SignIn.Action
            submit
            className="mt-2 inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Clerk.Loading>
              {(isLoading) =>
                isLoading ? t.auth.actions.signInLoading : t.auth.actions.signIn
              }
            </Clerk.Loading>
          </SignIn.Action>

          <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
        </div>
      </SignIn.Step>

      <SignIn.Step name="verifications">
        <SignIn.Strategy name="password">
          <div className="grid gap-4">
            <Clerk.Field name="password" className="grid gap-1.5">
              <Clerk.Label className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
                {t.auth.fields.password}
              </Clerk.Label>
              <div className="relative">
                <Clerk.Input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
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
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Clerk.FieldError className="text-xs text-[var(--editorial-terracotta)]" />
            </Clerk.Field>

            <SignIn.Action
              navigate="forgot-password"
              className="justify-self-start text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)]"
            >
              {t.auth.actions.forgotPassword}
            </SignIn.Action>

            <SignIn.Action
              submit
              className="mt-2 inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Clerk.Loading>
                {(isLoading) =>
                  isLoading
                    ? t.auth.actions.signInLoading
                    : t.auth.actions.signIn
                }
              </Clerk.Loading>
            </SignIn.Action>

            <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
          </div>
        </SignIn.Strategy>

        <SignIn.Strategy name="email_code">
          <EmailCodeSecondFactorPreparation />

          <div className="grid gap-4">
            <div className="grid gap-2 text-center">
              <h2 className="font-serif text-xl text-[var(--editorial-ink)]">
                {t.auth.verification.title}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--editorial-muted)]">
                {t.auth.verification.body}
              </p>
            </div>

            <Clerk.Field name="code" className="grid gap-1.5">
              <Clerk.Label className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
                {t.auth.fields.verificationCode}
              </Clerk.Label>
              <Clerk.Input
                type="otp"
                autoSubmit
                autoComplete="one-time-code"
                className="flex justify-center gap-2"
                render={({ value, status }) => (
                  <div
                    data-status={status}
                    className={`flex h-12 w-10 items-center justify-center border text-lg font-medium ${
                      status === "cursor" || status === "selected"
                        ? "border-[var(--editorial-sage)] bg-white text-[var(--editorial-ink)]"
                        : "border-[var(--editorial-border)] bg-white text-[var(--editorial-ink)]"
                    }`}
                  >
                    {value}
                  </div>
                )}
              />
              <Clerk.FieldError className="text-xs text-[var(--editorial-terracotta)]" />
            </Clerk.Field>

            <SignIn.Action
              submit
              className="inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Clerk.Loading>
                {(isLoading) =>
                  isLoading
                    ? t.auth.actions.verifyAccountLoading
                    : t.auth.actions.verifyAccount
                }
              </Clerk.Loading>
            </SignIn.Action>

            <SignIn.Action
              resend
              fallback={({ resendableAfter }) => (
                <span className="justify-self-start text-xs text-[var(--editorial-muted)]">
                  {t.auth.verification.resendIn.replace(
                    "{seconds}",
                    String(resendableAfter),
                  )}
                </span>
              )}
              className="justify-self-start text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)] disabled:no-underline disabled:opacity-50"
            >
              <Clerk.Loading>
                {(isLoading) =>
                  isLoading
                    ? t.auth.actions.resendCodeLoading
                    : t.auth.verification.resend
                }
              </Clerk.Loading>
            </SignIn.Action>

            <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
          </div>
        </SignIn.Strategy>

        <PasswordResetVerification />
      </SignIn.Step>

      <PasswordResetFlow />
    </SignIn.Root>
  );
}
