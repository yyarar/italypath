"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/context/LanguageContext";

interface PasswordResetFlowProps {
  onBack: () => void;
}

export function PasswordResetFlow({ onBack }: PasswordResetFlowProps) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SignIn.Root>
      {/* Step 1: email entry */}
      <SignIn.Step name="forgot-password">
        <div className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="font-serif text-xl text-[var(--editorial-ink)]">
              {t.auth.passwordReset.step1Title}
            </h2>
            <p className="text-xs text-[var(--editorial-muted)]">
              {t.auth.passwordReset.step1Body}
            </p>
          </div>

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
                isLoading
                  ? t.auth.actions.sendCodeLoading
                  : t.auth.actions.sendCode
              }
            </Clerk.Loading>
          </SignIn.Action>

          <button
            type="button"
            onClick={onBack}
            className="justify-self-start text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)]"
          >
            {t.auth.actions.backToSignIn}
          </button>

          <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
        </div>
      </SignIn.Step>

      {/* Step 2: code + new password */}
      <SignIn.Step name="reset-password">
        <SignIn.Strategy name="reset_password_email_code">
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
                    ? t.auth.actions.signInLoading
                    : t.auth.actions.resetPassword
                }
              </Clerk.Loading>
            </SignIn.Action>

            <button
              type="button"
              onClick={onBack}
              className="justify-self-start text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)]"
            >
              {t.auth.actions.backToSignIn}
            </button>

            <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
          </div>
        </SignIn.Strategy>
      </SignIn.Step>
    </SignIn.Root>
  );
}
