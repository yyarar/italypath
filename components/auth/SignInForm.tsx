"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import {
  PasswordResetFlow,
  PasswordResetVerification,
} from "@/components/auth/PasswordResetFlow";

export function SignInForm() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SignIn.Root path="/giris" routing="virtual">
      <SignIn.Step name="start">
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

        <PasswordResetVerification />
      </SignIn.Step>

      <PasswordResetFlow />
    </SignIn.Root>
  );
}
