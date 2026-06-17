"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";

import { useLanguage } from "@/context/LanguageContext";

export function VerificationStep() {
  const { t } = useLanguage();

  return (
    <SignUp.Step name="verifications">
      <SignUp.Strategy name="email_code">
        <div className="grid gap-4 text-center">
          <h2 className="font-serif text-xl text-[var(--editorial-ink)]">
            {t.auth.verification.title}
          </h2>

          <Clerk.Field name="code" className="grid gap-2">
            <Clerk.Label className="sr-only">
              {t.auth.fields.verificationCode}
            </Clerk.Label>
            <Clerk.Input
              type="otp"
              autoSubmit
              className="mx-auto flex justify-center gap-2"
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
            resend
            fallback={({ resendableAfter }) => (
              <button
                type="button"
                disabled
                className="text-xs text-[var(--editorial-muted)] disabled:opacity-50"
              >
                {t.auth.verification.resendIn.replace(
                  "{seconds}",
                  String(resendableAfter),
                )}
              </button>
            )}
          >
            <button
              type="button"
              className="text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)]"
            >
              {t.auth.verification.resend}
            </button>
          </SignUp.Action>

          <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
        </div>
      </SignUp.Strategy>
    </SignUp.Step>
  );
}
