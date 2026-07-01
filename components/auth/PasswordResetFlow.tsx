"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/context/LanguageContext";

export function PasswordResetVerification() {
  const { t } = useLanguage();

  return (
    <SignIn.Strategy name="reset_password_email_code">
      <div className="grid gap-4">
        <div className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="font-serif text-xl text-[var(--editorial-ink)]">
              {t.auth.passwordReset.step2Title}
            </h2>
            <p className="text-xs text-[var(--editorial-muted)]">
              {t.auth.passwordReset.step2Body}
            </p>
          </div>

          <Clerk.Field name="code" className="grid gap-1.5">
            <Clerk.Label className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
              {t.auth.fields.verificationCode}
            </Clerk.Label>
            <Clerk.Input
              type="otp"
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
            className="mt-2 inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
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
      </div>
    </SignIn.Strategy>
  );
}

export function PasswordResetFlow() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <SignIn.Step name="forgot-password">
        <div className="grid gap-4">
          <div className="grid gap-4">
            <div className="grid gap-1">
              <h2 className="font-serif text-xl text-[var(--editorial-ink)]">
                {t.auth.passwordReset.step1Title}
              </h2>
              <p className="text-xs text-[var(--editorial-muted)]">
                {t.auth.passwordReset.step1Body}
              </p>
            </div>

            <SignIn.SupportedStrategy
              name="reset_password_email_code"
              asChild
            >
              <button
                type="button"
                className="mt-2 inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {t.auth.actions.sendCode}
              </button>
            </SignIn.SupportedStrategy>

            <SignIn.Action
              navigate="previous"
              className="justify-self-start text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)]"
            >
              {t.auth.actions.backToSignIn}
            </SignIn.Action>

            <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
          </div>
        </div>
      </SignIn.Step>

      <SignIn.Step name="reset-password">
        <div className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="font-serif text-xl text-[var(--editorial-ink)]">
              {t.auth.passwordReset.step2Title}
            </h2>
            <p className="text-xs text-[var(--editorial-muted)]">
              {t.auth.passwordReset.step2Body}
            </p>
          </div>

          <div className="grid gap-4">
            <Clerk.Field name="password" className="grid gap-1.5">
              <Clerk.Label className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
                {t.auth.fields.newPassword}
              </Clerk.Label>
              <div className="relative">
                <Clerk.Input
                  type={showPassword ? "text" : "password"}
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
              <Clerk.FieldError className="text-xs text-[var(--editorial-terracotta)]" />
            </Clerk.Field>

            <SignIn.Action
              submit
              className="mt-2 inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Clerk.Loading>
                {(isLoading) =>
                  isLoading
                    ? t.auth.actions.resetPasswordLoading
                    : t.auth.actions.resetPassword
                }
              </Clerk.Loading>
            </SignIn.Action>

            <SignIn.Action
              navigate="start"
              className="justify-self-start text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)]"
            >
              {t.auth.actions.backToSignIn}
            </SignIn.Action>

            <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
          </div>
        </div>
      </SignIn.Step>
    </>
  );
}
