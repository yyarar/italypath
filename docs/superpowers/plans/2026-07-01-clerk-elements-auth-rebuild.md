# Clerk Elements Auth Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/giris` as a reliable Clerk Elements email/password auth flow with sign-up, the current Clerk instance's required username field, email code verification, sign-in second-factor email code when Clerk requires it, and forgot-password reset.

**Architecture:** Keep `/giris`, `proxy.ts`, `next.config.ts`, and `ClerkProvider` route settings intact. Move sign-up back to Clerk Elements primitives so Clerk owns sign-up state, verification, resend cooldown, session activation, and redirects; the page only owns tab UI state and redirect parameter sanitization. Password reset stays inside the sign-in Clerk state machine rather than a separate local page mode.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Clerk Core 2 via `@clerk/nextjs` 6.37.3, `@clerk/elements` 0.24.18, Tailwind v4 classes, existing `LanguageContext` translations.

---

## Scope Check

This plan covers one subsystem: the `/giris` auth flow. It does not change Supabase, protected route policy, Google/Apple OAuth, profile onboarding, or visual redesign beyond keeping the existing form styling usable.

## File Structure

- Modify `scripts/check-auth-ui.mjs`: make the smoke check enforce the new Clerk Elements contract and reject the old manual sign-up flow.
- Modify `app/giris/page.tsx`: keep the shell/tabs orchestration, remove sign-up verification lock/reset local state, and sanitize unsafe `redirect_url` values before Clerk consumes them.
- Modify `components/auth/SignInForm.tsx`: remove OAuth rendering, make the root use virtual routing on `/giris`, render password/email-code verification strategies, and bridge Clerk Elements Core 2 second-factor email-code preparation when needed.
- Replace `components/auth/SignUpForm.tsx`: rebuild sign-up using `SignUp.Root`, `SignUp.Step`, `SignUp.Strategy`, `SignUp.Action`, and `SignUp.Captcha`; include the Clerk-required `username` field; remove `useSignUp` and manual verification.
- Modify `components/auth/PasswordResetFlow.tsx`: render forgot-password, reset-code, and new-password pieces under the single `SignIn.Root` owned by `SignInForm`.
- Delete `components/auth/VerificationStep.tsx`: email verification moves into `SignUpForm`.
- Leave `components/auth/OAuthButtons.tsx` unused in this implementation; Google/Apple are out of scope for this plan.

## Task 1: Lock The New Auth Contract In The Smoke Check

**Files:**
- Modify: `scripts/check-auth-ui.mjs`

- [ ] **Step 1: Replace `scripts/check-auth-ui.mjs` with a failing contract check**

```js
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const failures = [];

function read(path) {
  const abs = resolve(process.cwd(), path);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${path}`);
    return "";
  }
  return readFileSync(abs, "utf8");
}

function mustContain(content, needle, label) {
  if (!content.includes(needle)) {
    failures.push(`${label}: missing "${needle}"`);
  }
}

function mustNotContain(content, needle, label) {
  if (content.includes(needle)) {
    failures.push(`${label}: must not contain "${needle}"`);
  }
}

const pageSource = read("app/giris/page.tsx");
mustContain(pageSource, "AuthShell", "app/giris/page.tsx");
mustContain(pageSource, "AuthCard", "app/giris/page.tsx");
mustContain(pageSource, "AuthTabs", "app/giris/page.tsx");
mustContain(pageSource, "SignInForm", "app/giris/page.tsx");
mustContain(pageSource, "SignUpForm", "app/giris/page.tsx");
mustContain(pageSource, "PasswordResetFlow", "app/giris/page.tsx");
mustContain(pageSource, "useSearchParams", "app/giris/page.tsx");
mustContain(pageSource, "useRouter", "app/giris/page.tsx");
mustContain(pageSource, "redirect_url", "app/giris/page.tsx");
mustContain(pageSource, "startsWith(\"//\")", "app/giris/page.tsx");
mustContain(pageSource, "router.replace", "app/giris/page.tsx");
mustNotContain(pageSource, "OAuthButtons", "app/giris/page.tsx");
mustNotContain(pageSource, "VerificationStep", "app/giris/page.tsx");
mustNotContain(pageSource, "onVerificationStateChange", "app/giris/page.tsx");

for (const file of [
  "components/auth/AuthShell.tsx",
  "components/auth/AuthCard.tsx",
  "components/auth/AuthTabs.tsx",
  "components/auth/SignInForm.tsx",
  "components/auth/SignUpForm.tsx",
  "components/auth/PasswordResetFlow.tsx",
]) {
  read(file);
}

const signInForm = read("components/auth/SignInForm.tsx");
mustContain(signInForm, 'routing="virtual"', "components/auth/SignInForm.tsx");
mustContain(signInForm, 'path="/giris"', "components/auth/SignInForm.tsx");
mustContain(signInForm, '<SignIn.Step name="start">', "components/auth/SignInForm.tsx");
mustContain(signInForm, 'name="identifier"', "components/auth/SignInForm.tsx");
mustContain(signInForm, 'name="password"', "components/auth/SignInForm.tsx");
mustNotContain(signInForm, "OAuthButtons", "components/auth/SignInForm.tsx");

const signUpForm = read("components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'import * as Clerk from "@clerk/elements/common"', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'import * as SignUp from "@clerk/elements/sign-up"', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "<SignUp.Root", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'routing="virtual"', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'path="/giris"', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, '<SignUp.Step name="start">', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, '<SignUp.Step name="verifications">', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, '<SignUp.Strategy name="email_code">', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "SignUp.Captcha", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "SignUp.Action", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "resend", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "fallback={({ resendableAfter })", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'name="emailAddress"', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'name="username"', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'name="password"', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'name="code"', "components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'name="legalAccepted"', "components/auth/SignUpForm.tsx");
mustNotContain(signUpForm, "useSignUp", "components/auth/SignUpForm.tsx");
mustNotContain(signUpForm, "signUp.create", "components/auth/SignUpForm.tsx");
mustNotContain(signUpForm, "prepareVerification", "components/auth/SignUpForm.tsx");
mustNotContain(signUpForm, "attemptVerification", "components/auth/SignUpForm.tsx");
mustNotContain(signUpForm, "setActive", "components/auth/SignUpForm.tsx");
mustNotContain(signUpForm, "RESEND_COOLDOWN_SECONDS", "components/auth/SignUpForm.tsx");
mustNotContain(signUpForm, "VerificationStep", "components/auth/SignUpForm.tsx");
mustNotContain(signUpForm, "OAuthButtons", "components/auth/SignUpForm.tsx");
mustNotContain(signUpForm, "firstName", "components/auth/SignUpForm.tsx");
mustNotContain(signUpForm, "lastName", "components/auth/SignUpForm.tsx");

const passwordReset = read("components/auth/PasswordResetFlow.tsx");
mustContain(passwordReset, 'routing="virtual"', "components/auth/PasswordResetFlow.tsx");
mustContain(passwordReset, 'path="/giris"', "components/auth/PasswordResetFlow.tsx");
mustContain(passwordReset, '<SignIn.Step name="forgot-password">', "components/auth/PasswordResetFlow.tsx");
mustContain(passwordReset, '<SignIn.Step name="reset-password">', "components/auth/PasswordResetFlow.tsx");
mustContain(passwordReset, '<SignIn.Strategy name="reset_password_email_code">', "components/auth/PasswordResetFlow.tsx");

if (existsSync(resolve(process.cwd(), "components/auth/VerificationStep.tsx"))) {
  failures.push("components/auth/VerificationStep.tsx should be removed; sign-up verification belongs in SignUpForm.tsx");
}

const nextConfig = read("next.config.ts");
mustContain(nextConfig, "redirects()", "next.config.ts");
mustContain(nextConfig, "/sign-in", "next.config.ts");
mustContain(nextConfig, "/sign-up", "next.config.ts");
mustContain(nextConfig, "/giris", "next.config.ts");

const proxy = read("proxy.ts");
mustContain(proxy, "/giris(.*)", "proxy.ts");

const robots = read("app/robots.ts");
mustContain(robots, "/giris", "app/robots.ts");

const navbar = read("components/Navbar.tsx");
if (navbar.includes("SignInButton")) {
  failures.push("components/Navbar.tsx: still imports/uses SignInButton");
}
mustContain(navbar, "/giris", "components/Navbar.tsx");

for (const path of [
  "components/BottomNav.tsx",
  "components/FeaturesSection.tsx",
  "app/hub/page.tsx",
]) {
  const content = read(path);
  if (content.includes('"/sign-in?redirect_url')) {
    failures.push(`${path}: still contains legacy "/sign-in?redirect_url" reference`);
  }
}

if (failures.length > 0) {
  console.error("[FAIL] Auth UI smoke check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Auth UI smoke check passed.");
```

- [ ] **Step 2: Run the check and confirm it fails on the current implementation**

Run:

```bash
npm run check:auth-ui
```

Expected: FAIL. The failure list should include the old manual sign-up markers such as `useSignUp`, `prepareVerification`, `attemptVerification`, `OAuthButtons`, or the still-present `components/auth/VerificationStep.tsx`.

- [ ] **Step 3: Commit the failing contract check**

```bash
git add scripts/check-auth-ui.mjs
git commit -m "test(auth): enforce clerk elements auth contract"
```

## Task 2: Simplify `/giris` Page State And Sanitize Redirects

**Files:**
- Modify: `app/giris/page.tsx`

- [ ] **Step 1: Replace `app/giris/page.tsx` with the simplified orchestrator**

```tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PasswordResetFlow } from "@/components/auth/PasswordResetFlow";

function isSafeRelativeRedirect(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function GirisInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialTab: AuthTab = params.get("mode") === "kayit" ? "signUp" : "signIn";
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [mode, setMode] = useState<"auth" | "reset">("auth");

  useEffect(() => {
    const redirectUrl = params.get("redirect_url");

    if (!redirectUrl || isSafeRelativeRedirect(redirectUrl)) {
      return;
    }

    const cleanParams = new URLSearchParams(params.toString());
    cleanParams.delete("redirect_url");
    const query = cleanParams.toString();

    router.replace(query ? `/giris?${query}` : "/giris", { scroll: false });
  }, [params, router]);

  if (mode === "reset") {
    return (
      <AuthShell>
        <AuthCard>
          <PasswordResetFlow onBack={() => setMode("auth")} />
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard>
        <AuthTabs
          active={tab}
          onChange={setTab}
          signInContent={<SignInForm onForgotPassword={() => setMode("reset")} />}
          signUpContent={<SignUpForm />}
        />
      </AuthCard>
    </AuthShell>
  );
}

export default function GirisPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <AuthCard>
            <div className="h-64" />
          </AuthCard>
        </AuthShell>
      }
    >
      <GirisInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Run the auth smoke check**

Run:

```bash
npm run check:auth-ui
```

Expected: still FAIL, because `SignInForm`, `SignUpForm`, `PasswordResetFlow`, and `VerificationStep` are not yet aligned.

- [ ] **Step 3: Commit the page simplification**

```bash
git add app/giris/page.tsx
git commit -m "refactor(auth): simplify giris page orchestration"
```

## Task 3: Remove OAuth From The Sign-In Form

**Files:**
- Modify: `components/auth/SignInForm.tsx`

- [ ] **Step 1: Replace `components/auth/SignInForm.tsx`**

```tsx
"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/context/LanguageContext";

interface SignInFormProps {
  onForgotPassword: () => void;
}

export function SignInForm({ onForgotPassword }: SignInFormProps) {
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

          <button
            type="button"
            onClick={onForgotPassword}
            className="justify-self-start text-xs text-[var(--editorial-muted)] underline underline-offset-2 hover:text-[var(--editorial-ink)]"
          >
            {t.auth.actions.forgotPassword}
          </button>

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
    </SignIn.Root>
  );
}
```

- [ ] **Step 2: Run the auth smoke check**

Run:

```bash
npm run check:auth-ui
```

Expected: still FAIL, because sign-up and reset flow are not yet aligned and `VerificationStep.tsx` still exists.

- [ ] **Step 3: Commit the sign-in simplification**

```bash
git add components/auth/SignInForm.tsx
git commit -m "refactor(auth): simplify clerk elements sign in"
```

## Task 4: Replace Manual Sign-Up With Clerk Elements

**Files:**
- Modify: `components/auth/SignUpForm.tsx`

- [ ] **Step 1: Replace `components/auth/SignUpForm.tsx`**

```tsx
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
```

- [ ] **Step 2: Run the auth smoke check**

Run:

```bash
npm run check:auth-ui
```

Expected: still FAIL only because `PasswordResetFlow.tsx` is missing the virtual routing markers and `VerificationStep.tsx` still exists. If TypeScript syntax errors appear instead, fix the replacement before continuing.

- [ ] **Step 3: Commit the sign-up rebuild**

```bash
git add components/auth/SignUpForm.tsx
git commit -m "refactor(auth): rebuild signup with clerk elements"
```

## Task 5: Pin Password Reset To Virtual Routing

**Files:**
- Modify: `components/auth/PasswordResetFlow.tsx`

- [ ] **Step 1: Replace the root element in `PasswordResetFlow.tsx`**

Find:

```tsx
<SignIn.Root>
```

Replace with:

```tsx
<SignIn.Root path="/giris" routing="virtual">
```

- [ ] **Step 2: Run the auth smoke check**

Run:

```bash
npm run check:auth-ui
```

Expected: still FAIL because `components/auth/VerificationStep.tsx` has not been removed.

- [ ] **Step 3: Commit the password reset routing change**

```bash
git add components/auth/PasswordResetFlow.tsx
git commit -m "refactor(auth): use virtual routing for password reset"
```

## Task 6: Remove The Obsolete Verification Component

**Files:**
- Delete: `components/auth/VerificationStep.tsx`

- [ ] **Step 1: Delete the obsolete file**

```bash
rm components/auth/VerificationStep.tsx
```

- [ ] **Step 2: Confirm no active code imports it**

Run:

```bash
rg -n "VerificationStep" app components lib scripts
```

Expected: no matches.

- [ ] **Step 3: Run the auth smoke check**

Run:

```bash
npm run check:auth-ui
```

Expected: PASS with `[OK] Auth UI smoke check passed.`

- [ ] **Step 4: Commit the deletion**

```bash
git add components/auth/VerificationStep.tsx
git commit -m "chore(auth): remove manual verification step"
```

## Task 7: Run Static Verification

**Files:**
- No source edits unless a command exposes a direct auth regression.

- [ ] **Step 1: Run auth production redirect check**

Run:

```bash
npm run check:auth-production
```

Expected: PASS with `[OK] Auth production redirect check passed.`

- [ ] **Step 2: Run route matrix check**

Run:

```bash
npm run check:routes
```

Expected: PASS. `/giris` must remain public; protected page routes must still redirect to `/giris?redirect_url=...`.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no new lint errors from `app/giris/page.tsx` or `components/auth/*`.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS. If the build fails because Clerk Elements rejects a prop in the new code, adjust only the affected auth component and rerun `npm run check:auth-ui && npm run build`.

- [ ] **Step 5: Commit verification fixes if any were required**

If no source files changed during this task, do not create an empty commit.

If a source fix was required:

```bash
git add app/giris/page.tsx components/auth scripts/check-auth-ui.mjs
git commit -m "fix(auth): resolve clerk elements verification issues"
```

## Task 8: Manual Browser Verification

**Files:**
- No source edits unless a manual flow exposes a direct auth bug.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Next.js dev server starts on `http://localhost:3000` or the next available port.

- [ ] **Step 2: Verify unsafe redirect cleanup**

Open:

```text
http://localhost:3000/giris?redirect_url=https://example.com
```

Expected: URL changes to `http://localhost:3000/giris` and the sign-in form remains visible.

Open:

```text
http://localhost:3000/giris?mode=kayit&redirect_url=//example.com
```

Expected: URL changes to `http://localhost:3000/giris?mode=kayit` and the sign-up tab remains active.

- [ ] **Step 3: Verify sign-up and email verification**

Use a fresh email address available in the Clerk development or test instance.

Steps:

1. Open `http://localhost:3000/giris?mode=kayit`.
2. Enter the fresh email and a password that satisfies Clerk password rules.
3. Submit.
4. Confirm the same card renders the email verification code UI.
5. Enter the 6-digit code from the email.

Expected: user lands on `/hub` with an active Clerk session.

- [ ] **Step 4: Verify sign-in**

Steps:

1. Sign out from the app.
2. Open `http://localhost:3000/giris`.
3. Enter the verified email and password from Step 3.
4. Submit.

Expected: user lands on `/hub` with an active Clerk session.

- [ ] **Step 5: Verify protected route return**

Steps:

1. Sign out from the app.
2. Open `http://localhost:3000/hub`.
3. Confirm redirect to `/giris?redirect_url=%2Fhub`.
4. Sign in.

Expected: user returns to `/hub`, not the generic fallback by accident.

- [ ] **Step 6: Verify forgot-password reset**

Steps:

1. Sign out from the app.
2. Open `http://localhost:3000/giris`.
3. Click `Şifremi unuttum`.
4. Enter the verified email.
5. Submit.
6. Enter the reset code from email and a new valid password.
7. Submit.

Expected: Clerk completes the reset, activates the session, and redirects to `/hub` or the safe `redirect_url`.

If Clerk Elements Core 2 does not activate a session after password reset, stop implementation and update `docs/superpowers/specs/2026-07-01-clerk-elements-auth-rebuild-design.md` before changing behavior.

- [ ] **Step 7: Verify legacy redirects**

Open:

```text
http://localhost:3000/sign-in?redirect_url=%2Fhub
```

Expected: browser lands on `/giris?redirect_url=%2Fhub`.

Open:

```text
http://localhost:3000/sign-up
```

Expected: browser lands on `/giris?mode=kayit`.

- [ ] **Step 8: Stop the dev server**

Stop the running dev server with `Ctrl-C` in the terminal where `npm run dev` is running.

- [ ] **Step 9: Commit manual verification fixes if any were required**

If no source files changed during manual verification, do not create an empty commit.

If a source fix was required:

```bash
git add app/giris/page.tsx components/auth scripts/check-auth-ui.mjs docs/superpowers/specs/2026-07-01-clerk-elements-auth-rebuild-design.md
git commit -m "fix(auth): address manual clerk flow verification"
```

## Final Verification Commands

Run the full command set before handoff:

```bash
npm run check:auth-ui
npm run check:auth-production
npm run check:routes
npm run lint
npm run build
```

Expected: all commands pass.

## Self-Review Notes

- Spec coverage: sign-up, email verification, sign-in, forgot-password, OAuth removal, first/last name removal, redirect sanitization, and smoke/manual verification are covered by Tasks 1-8.
- Placeholder scan: this plan contains no unresolved placeholders.
- Type consistency: Clerk Elements primitive names match the installed type definitions: `SignIn.Strategy name="password"`, `SignIn.Strategy name="email_code"`, `SignUp.Step name="verifications"`, `SignUp.Strategy name="email_code"`, `SignUp.Action resend`, `SignUp.Captcha`, and `Clerk.Field` names `emailAddress`, `username`, `password`, `code`, and `legalAccepted`.
