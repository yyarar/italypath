"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import { OAuthButtons } from "./OAuthButtons";

interface SignUpFormProps {
  onSwitchToSignIn: () => void;
}

export function SignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SignUp.Root>
      <SignUp.Step name="start">
        <OAuthButtons />

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Clerk.Field name="firstName" className="grid gap-1.5">
              <Clerk.Label className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
                {t.auth.fields.firstName}
              </Clerk.Label>
              <Clerk.Input
                type="text"
                required
                autoComplete="given-name"
                className="h-11 border border-[var(--editorial-border)] bg-white px-3 text-sm text-[var(--editorial-ink)] focus:border-[var(--editorial-sage)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[var(--editorial-sage)]"
              />
              <Clerk.FieldError className="text-xs text-[var(--editorial-terracotta)]" />
            </Clerk.Field>

            <Clerk.Field name="lastName" className="grid gap-1.5">
              <Clerk.Label className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
                {t.auth.fields.lastName}
              </Clerk.Label>
              <Clerk.Input
                type="text"
                required
                autoComplete="family-name"
                className="h-11 border border-[var(--editorial-border)] bg-white px-3 text-sm text-[var(--editorial-ink)] focus:border-[var(--editorial-sage)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[var(--editorial-sage)]"
              />
              <Clerk.FieldError className="text-xs text-[var(--editorial-terracotta)]" />
            </Clerk.Field>
          </div>

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
            <Clerk.FieldError className="text-xs text-[var(--editorial-terracotta)]">
              {({ message, code }) => {
                if (code === "form_identifier_exists") {
                  return (
                    <div className="flex flex-col gap-2">
                      <span>{t.auth.errors.emailExists}</span>
                      <button
                        type="button"
                        onClick={onSwitchToSignIn}
                        className="self-start text-xs underline underline-offset-2 hover:text-[var(--editorial-ink)]"
                      >
                        {t.auth.actions.switchToSignIn}
                      </button>
                    </div>
                  );
                }
                return <span>{message}</span>;
              }}
            </Clerk.FieldError>
          </Clerk.Field>

          <Clerk.Field name="password" className="grid gap-1.5">
            <Clerk.Label className="text-xs font-medium uppercase tracking-wide text-[var(--editorial-muted)]">
              {t.auth.fields.password}
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
    </SignUp.Root>
  );
}
