"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/context/LanguageContext";

export function SignUpForm() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SignUp.Root path="/giris" routing="virtual">
      <SignUp.Step name="start">
        <div className="grid gap-4">
          <Clerk.Field name="emailAddress" className="grid gap-1.5">
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

          <Clerk.Field name="username" className="grid gap-1.5">
            <Clerk.Label className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
              {t.auth.fields.username}
            </Clerk.Label>
            <Clerk.Input
              type="text"
              required
              autoComplete="username"
              className="h-11 border border-[var(--editorial-border)] bg-white px-3 text-sm text-[var(--editorial-ink)] focus:border-[var(--editorial-sage)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[var(--editorial-sage)]"
            />
            <Clerk.FieldError className="text-xs text-[var(--editorial-terracotta)]" />
          </Clerk.Field>

          <Clerk.Field name="password" className="grid gap-1.5">
            <Clerk.Label className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
              {t.auth.fields.password}
            </Clerk.Label>
            <div className="relative">
              <Clerk.Input
                type={showPassword ? "text" : "password"}
                required
                validatePassword
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

          <Clerk.Field name="legalAccepted" className="hidden">
            <Clerk.Input
              type="checkbox"
              defaultChecked
              tabIndex={-1}
              aria-hidden="true"
            />
          </Clerk.Field>

          <SignUp.Captcha className="mt-1" />

          <SignUp.Action
            submit
            className="mt-2 inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Clerk.Loading>
              {(isLoading) =>
                isLoading ? t.auth.actions.signUpLoading : t.auth.actions.signUp
              }
            </Clerk.Loading>
          </SignUp.Action>

          <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
        </div>
      </SignUp.Step>

      <SignUp.Step name="verifications">
        <SignUp.Strategy name="email_code">
          <div className="grid gap-4">
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

            <SignUp.Action
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
            </SignUp.Action>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <SignUp.Action
                resend
                fallback={({ resendableAfter }) => (
                  <button
                    type="button"
                    disabled
                    className="text-left text-xs text-[var(--editorial-muted)] underline underline-offset-2 opacity-50 sm:text-left"
                  >
                    {t.auth.verification.resendIn.replace(
                      "{seconds}",
                      String(resendableAfter),
                    )}
                  </button>
                )}
                className="text-left text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)] disabled:no-underline disabled:opacity-50"
              >
                <Clerk.Loading>
                  {(isLoading) =>
                    isLoading
                      ? t.auth.actions.resendCodeLoading
                      : t.auth.verification.resend
                  }
                </Clerk.Loading>
              </SignUp.Action>

              <SignUp.Action
                navigate="start"
                className="text-left text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)] sm:text-right"
              >
                {t.auth.actions.changeEmail}
              </SignUp.Action>
            </div>

            <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
          </div>
        </SignUp.Strategy>
      </SignUp.Step>
    </SignUp.Root>
  );
}
