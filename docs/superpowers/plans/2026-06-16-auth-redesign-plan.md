# Auth UX Yenileme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Clerk's default `<SignIn />` / `<SignUp />` pages and the Navbar modal with a single editorial Turkish-localized `/giris` page built on Clerk Elements (Level 2 — Clerk handles auth, we own the UI).

**Architecture:** Single page at `/giris` with tab toggle (Giriş Yap / Kayıt Ol). Old URLs (`/sign-in`, `/sign-up`) redirect via `next.config.ts` `redirects()`. UI broken into small focused components under `components/auth/`. All copy lives under `t.auth` in `lib/translations.ts`. OAuth (Google + Apple) and email/password coexist. After auth → `redirect_url` (if any) else `/hub`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, `@clerk/elements` (new dependency), `@clerk/nextjs` 6.37.3 (already installed), `framer-motion` for the tab transition.

**Reference spec:** `docs/superpowers/specs/2026-06-16-auth-redesign-design.md`

---

## File map (locked-in structure)

**Created:**
- `app/giris/page.tsx` — single-page container, tab state, Clerk Elements root.
- `components/auth/AuthShell.tsx` — wordmark + centered layout + legal footer line.
- `components/auth/AuthCard.tsx` — paper-styled bordered box.
- `components/auth/AuthTabs.tsx` — "Giriş Yap" / "Kayıt Ol" tab toggle with keyboard support.
- `components/auth/OAuthButtons.tsx` — Google + Apple buttons + "veya" divider.
- `components/auth/SignInForm.tsx` — email + password + show/hide + "Şifremi unuttum" link.
- `components/auth/SignUpForm.tsx` — first name + last name + email + password + show/hide.
- `components/auth/VerificationStep.tsx` — 6-digit code input + resend cooldown.
- `components/auth/PasswordResetFlow.tsx` — 2-step forgot password flow.
- `scripts/check-auth-ui.mjs` — smoke check for the new page.

**Modified:**
- `next.config.ts` — add `redirects()` for `/sign-in` and `/sign-up`.
- `proxy.ts` — add `/giris(.*)` to public route list. Keep `/sign-in(.*)` and `/sign-up(.*)` public (308 targets must be reachable).
- `app/robots.ts` — add `/giris` to disallow list.
- `lib/translations.ts` — add `auth` namespace under both `tr` and `en`.
- `components/Navbar.tsx` — replace `SignInButton mode="modal"` blocks with `<Link href="/giris">`.
- `components/BottomNav.tsx` — change `/sign-in?redirect_url=...` to `/giris?redirect_url=...`.
- `components/FeaturesSection.tsx` — same redirect URL change.
- `app/universities/[id]/page.tsx` — same redirect URL change.
- `app/universities/[id]/departments/[deptSlug]/page.tsx` — same redirect URL change.
- `app/hub/page.tsx` — change anonymous-visitor redirect link from `/sign-in?...` to `/giris?...`.
- `scripts/check-route-access.mjs` — add `/giris` to public checks; add redirect assertions.
- `package.json` — add `check:auth-ui` script.

**Deleted:**
- `app/sign-in/[[...sign-in]]/page.tsx` (the whole `app/sign-in/` directory).
- `app/sign-up/[[...sign-up]]/page.tsx` (the whole `app/sign-up/` directory).

---

## Conventions for every task

- **Test approach:** This project has no Jest/Vitest. Verification is done via (a) Node smoke checks under `scripts/check-*.mjs`, (b) `npm run dev` + browser observation, (c) `npm run lint` + `npm run build` for compile-time correctness. Each task ends by running the right verification for what changed.
- **Server vs client:** Auth forms use Clerk Elements hooks → all new components under `components/auth/` start with `"use client"`. The page `app/giris/page.tsx` is also client (uses tab state).
- **Styling tokens:** Reuse existing CSS variables from `app/globals.css`: `--editorial-paper`, `--editorial-surface`, `--editorial-ink`, `--editorial-muted`, `--editorial-border`, `--editorial-sage`, `--editorial-sage-soft`, `--editorial-terracotta`, `--editorial-band`. No new tokens.
- **Commit cadence:** One commit per task at the end. Commit messages in English, Conventional Commits style (`feat:`, `chore:`, `refactor:`), no Claude footer (project convention — check `git log` to confirm; ItalyPath commits don't use Co-Authored-By).
- **Worktree:** Project's existing dirty worktree contains unrelated Bocconi/Parma/Tor Vergata/Univpm import scripts and a modified `scripts/check-program-details.mjs`. **Do not touch any of those.** Only stage files this plan explicitly modifies.

---

### Task 1: Install Clerk Elements and scaffold `/giris`

**Files:**
- Create: `app/giris/page.tsx`
- Modify: `package.json`, `package-lock.json` (via npm install)

- [ ] **Step 1: Install `@clerk/elements`**

Run from `/Users/keremyarar/italypath-main`:
```bash
npm install @clerk/elements
```

Expected: package added to `dependencies`, lockfile updated. Confirm with `cat package.json | grep '@clerk/elements'`.

- [ ] **Step 2: Create the minimal `/giris` page (placeholder, gets replaced later)**

Create `app/giris/page.tsx`:
```tsx
"use client";

export default function GirisPage() {
  return (
    <main className="min-h-dvh bg-[var(--editorial-paper)]">
      <div className="mx-auto max-w-md px-4 py-16">
        <p className="font-serif text-2xl text-[var(--editorial-ink)]">
          ItalyPath / Giriş (iskelet)
        </p>
      </div>
    </main>
  );
}
```

This is intentional placeholder content. It gives later tasks something to incrementally fill in and lets us verify the route renders.

- [ ] **Step 3: Add `/giris(.*)` to `proxy.ts` public list**

Open `proxy.ts`. After the line `'/yasal(.*)',  // Yasal sayfalar...` insert:
```ts
    '/giris(.*)',        // Yeni Türkçe giriş/kayıt sayfası
```

Keep `/sign-in(.*)` and `/sign-up(.*)` in the list — they're 308 redirect targets and must be reachable publicly.

- [ ] **Step 4: Run dev server and verify `/giris` is reachable**

```bash
npm run dev
```

Open `http://localhost:3000/giris` in a browser. Expected: placeholder text renders, no auth challenge, no 404.

Stop the dev server (Ctrl+C).

- [ ] **Step 5: Run lint and typecheck**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both succeed (no errors).

- [ ] **Step 6: Commit**

```bash
git add app/giris/page.tsx proxy.ts package.json package-lock.json
git commit -m "feat(auth): scaffold /giris route and install Clerk Elements"
```

---

### Task 2: Add `auth` translation namespace

**Files:**
- Modify: `lib/translations.ts`

- [ ] **Step 1: Add `auth` keys under `tr`**

In `lib/translations.ts`, locate the closing `}` of the `tr` object. Just before that closing brace (and after the last existing namespace), insert:

```ts
    auth: {
      pageTitle: "ItalyPath'a Giriş",
      tabs: {
        signIn: "Giriş Yap",
        signUp: "Kayıt Ol",
      },
      oauth: {
        google: "Google ile devam et",
        apple: "Apple ile devam et",
        divider: "veya e-posta ile",
      },
      fields: {
        firstName: "Ad",
        lastName: "Soyad",
        email: "E-posta",
        password: "Şifre",
        newPassword: "Yeni şifre",
        showPassword: "Şifreyi göster",
        hidePassword: "Şifreyi gizle",
        verificationCode: "6 haneli kod",
      },
      actions: {
        signIn: "Giriş Yap",
        signInLoading: "Giriş yapılıyor...",
        signUp: "Kayıt Ol",
        signUpLoading: "Kayıt oluşturuluyor...",
        forgotPassword: "Şifremi unuttum",
        sendCode: "Kod gönder",
        sendCodeLoading: "Kod gönderiliyor...",
        resetPassword: "Şifreyi sıfırla",
        backToSignIn: "Giriş sayfasına dön",
        switchToSignIn: "Giriş sekmesine geç",
      },
      verification: {
        title: "E-postana 6 haneli kod gönderdik",
        subtitle: "Kodu",
        resend: "Tekrar gönder",
        resendIn: "Tekrar gönder ({seconds}s)",
      },
      passwordReset: {
        step1Title: "Şifreni sıfırla",
        step1Body: "E-posta adresini yaz, sana 6 haneli sıfırlama kodu yollayalım.",
        step2Title: "Yeni şifreni belirle",
        step2Body: "E-postana gelen kodu yaz ve yeni şifreni gir.",
      },
      errors: {
        invalidCredentials: "E-posta veya şifre hatalı.",
        emailExists: "Bu e-posta zaten kayıtlı.",
        network: "Bağlantı sorunu, tekrar dene.",
        oauthFailed: "Giriş başarısız oldu. Tekrar dene veya başka bir yöntemle giriş yap.",
        invalidCode: "Kod hatalı veya süresi doldu.",
        codeExpired: "Kodun süresi doldu, yeni kod isteyebilirsin.",
        weakPassword: "Şifre çok zayıf. En az 8 karakter olmalı.",
        generic: "Bir şeyler ters gitti, tekrar dener misin?",
      },
      legal: {
        consent: "Devam ederek {terms} ve {privacy}'nı kabul edersin.",
        termsLink: "Kullanım Koşulları",
        privacyLink: "Gizlilik Politikası",
      },
    },
```

- [ ] **Step 2: Add the same `auth` namespace under `en`**

Locate the `en` object closing brace and insert the parallel English version:

```ts
    auth: {
      pageTitle: "Sign in to ItalyPath",
      tabs: {
        signIn: "Sign In",
        signUp: "Sign Up",
      },
      oauth: {
        google: "Continue with Google",
        apple: "Continue with Apple",
        divider: "or with email",
      },
      fields: {
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        password: "Password",
        newPassword: "New password",
        showPassword: "Show password",
        hidePassword: "Hide password",
        verificationCode: "6-digit code",
      },
      actions: {
        signIn: "Sign In",
        signInLoading: "Signing in...",
        signUp: "Sign Up",
        signUpLoading: "Creating account...",
        forgotPassword: "Forgot password",
        sendCode: "Send code",
        sendCodeLoading: "Sending code...",
        resetPassword: "Reset password",
        backToSignIn: "Back to sign in",
        switchToSignIn: "Switch to sign in",
      },
      verification: {
        title: "We sent a 6-digit code to your email",
        subtitle: "Enter the code",
        resend: "Resend",
        resendIn: "Resend ({seconds}s)",
      },
      passwordReset: {
        step1Title: "Reset your password",
        step1Body: "Enter your email and we'll send you a 6-digit reset code.",
        step2Title: "Set a new password",
        step2Body: "Enter the code from your email and choose a new password.",
      },
      errors: {
        invalidCredentials: "Wrong email or password.",
        emailExists: "This email is already registered.",
        network: "Connection issue, please try again.",
        oauthFailed: "Sign-in failed. Try again or use another method.",
        invalidCode: "Code is wrong or expired.",
        codeExpired: "The code has expired. Request a new one.",
        weakPassword: "Password too weak. Must be at least 8 characters.",
        generic: "Something went wrong, please try again.",
      },
      legal: {
        consent: "By continuing, you agree to our {terms} and {privacy}.",
        termsLink: "Terms of Use",
        privacyLink: "Privacy Policy",
      },
    },
```

- [ ] **Step 3: Verify TypeScript shape consistency**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors. `translations.ts` has no explicit type but `useLanguage` returns whatever shape is there; both `tr` and `en` must mirror each other.

- [ ] **Step 4: Commit**

```bash
git add lib/translations.ts
git commit -m "feat(auth): add auth namespace to translations (tr + en)"
```

---

### Task 3: Build `AuthShell` component

**Files:**
- Create: `components/auth/AuthShell.tsx`

`AuthShell` is the outer wrapper: full-screen paper background, centered card slot, ItalyPath wordmark above the card, legal footer line below.

- [ ] **Step 1: Create the file**

Create `components/auth/AuthShell.tsx`:
```tsx
"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useLanguage } from "@/context/LanguageContext";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  const { t } = useLanguage();
  const consent = t.auth.legal.consent;

  // Tek satırlık cümlede {terms} ve {privacy} link olarak yer alır.
  const parts = consent.split(/(\{terms\}|\{privacy\})/g);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--editorial-paper)] px-4 py-10">
      <Link
        href="/"
        className="mb-8 font-serif text-2xl font-medium tracking-[-0.02em] text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
      >
        ItalyPath
      </Link>

      <div className="w-full max-w-[420px]">{children}</div>

      <p className="mt-6 max-w-[420px] text-center text-xs leading-relaxed text-[var(--editorial-muted)]">
        {parts.map((part, idx) => {
          if (part === "{terms}") {
            return (
              <Link
                key={idx}
                href="/yasal/kullanim-kosullari"
                className="underline underline-offset-2 hover:text-[var(--editorial-ink)]"
              >
                {t.auth.legal.termsLink}
              </Link>
            );
          }
          if (part === "{privacy}") {
            return (
              <Link
                key={idx}
                href="/yasal/gizlilik"
                className="underline underline-offset-2 hover:text-[var(--editorial-ink)]"
              >
                {t.auth.legal.privacyLink}
              </Link>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Mount it temporarily on `/giris` to verify visually**

Update `app/giris/page.tsx` to use it:
```tsx
"use client";

import { AuthShell } from "@/components/auth/AuthShell";

export default function GirisPage() {
  return (
    <AuthShell>
      <div className="rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 text-center text-sm text-[var(--editorial-muted)]">
        Kart slotu (henüz boş)
      </div>
    </AuthShell>
  );
}
```

- [ ] **Step 3: Visual verification**

```bash
npm run dev
```

Open `http://localhost:3000/giris`. Expected:
- Paper background fills the viewport.
- ItalyPath wordmark centered near the top, clickable, navigates to `/`.
- Empty cream-colored slot in the middle (the placeholder).
- Legal consent line below the slot with two underlined links pointing to `/yasal/kullanim-kosullari` and `/yasal/gizlilik`.

Stop the dev server.

- [ ] **Step 4: Lint + typecheck**

```bash
npm run lint
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/auth/AuthShell.tsx app/giris/page.tsx
git commit -m "feat(auth): add AuthShell with wordmark and legal consent footer"
```

---

### Task 4: Build `AuthCard` component

**Files:**
- Create: `components/auth/AuthCard.tsx`

A focused container for the form. Separated from `AuthShell` so verification steps and reset flow can swap their own card contents in.

- [ ] **Step 1: Create the file**

Create `components/auth/AuthCard.tsx`:
```tsx
"use client";

import { type ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 shadow-sm sm:p-8">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Use it in `/giris` to keep the visual progression going**

Update `app/giris/page.tsx`:
```tsx
"use client";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";

export default function GirisPage() {
  return (
    <AuthShell>
      <AuthCard>
        <p className="text-center text-sm text-[var(--editorial-muted)]">
          Sekme + form burada olacak
        </p>
      </AuthCard>
    </AuthShell>
  );
}
```

- [ ] **Step 3: Visual verification**

```bash
npm run dev
```

`/giris` shows the paper background, wordmark, a cream card with the placeholder text, and the legal line. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add components/auth/AuthCard.tsx app/giris/page.tsx
git commit -m "feat(auth): add AuthCard container"
```

---

### Task 5: Build `AuthTabs` component (tab toggle)

**Files:**
- Create: `components/auth/AuthTabs.tsx`

Two-tab toggle with proper ARIA (`tablist`/`tab`/`tabpanel`) and arrow-key navigation.

- [ ] **Step 1: Create the file**

Create `components/auth/AuthTabs.tsx`:
```tsx
"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { useLanguage } from "@/context/LanguageContext";

export type AuthTab = "signIn" | "signUp";

interface AuthTabsProps {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
  signInContent: ReactNode;
  signUpContent: ReactNode;
}

export function AuthTabs({ active, onChange, signInContent, signUpContent }: AuthTabsProps) {
  const { t } = useLanguage();
  const signInRef = useRef<HTMLButtonElement>(null);
  const signUpRef = useRef<HTMLButtonElement>(null);

  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next: AuthTab = active === "signIn" ? "signUp" : "signIn";
      onChange(next);
      // Move focus to the newly active tab next tick.
      requestAnimationFrame(() => {
        (next === "signIn" ? signInRef.current : signUpRef.current)?.focus();
      });
    }
  }

  return (
    <div>
      <div role="tablist" aria-label={t.auth.pageTitle} className="mb-6 grid grid-cols-2 gap-0 border-b border-[var(--editorial-border)]">
        <button
          ref={signInRef}
          role="tab"
          type="button"
          aria-selected={active === "signIn"}
          aria-controls="auth-panel-signIn"
          tabIndex={active === "signIn" ? 0 : -1}
          onClick={() => onChange("signIn")}
          onKeyDown={handleKey}
          className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
            active === "signIn"
              ? "border-[var(--editorial-ink)] text-[var(--editorial-ink)]"
              : "border-transparent text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
          }`}
        >
          {t.auth.tabs.signIn}
        </button>
        <button
          ref={signUpRef}
          role="tab"
          type="button"
          aria-selected={active === "signUp"}
          aria-controls="auth-panel-signUp"
          tabIndex={active === "signUp" ? 0 : -1}
          onClick={() => onChange("signUp")}
          onKeyDown={handleKey}
          className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
            active === "signUp"
              ? "border-[var(--editorial-ink)] text-[var(--editorial-ink)]"
              : "border-transparent text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
          }`}
        >
          {t.auth.tabs.signUp}
        </button>
      </div>

      <div
        id="auth-panel-signIn"
        role="tabpanel"
        aria-labelledby="auth-tab-signIn"
        hidden={active !== "signIn"}
      >
        {active === "signIn" && signInContent}
      </div>
      <div
        id="auth-panel-signUp"
        role="tabpanel"
        aria-labelledby="auth-tab-signUp"
        hidden={active !== "signUp"}
      >
        {active === "signUp" && signUpContent}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire tab state into `/giris` page**

Update `app/giris/page.tsx`:
```tsx
"use client";

import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";

export default function GirisPage() {
  const [tab, setTab] = useState<AuthTab>("signIn");

  return (
    <AuthShell>
      <AuthCard>
        <AuthTabs
          active={tab}
          onChange={setTab}
          signInContent={<p className="text-sm text-[var(--editorial-muted)]">Giriş formu burada</p>}
          signUpContent={<p className="text-sm text-[var(--editorial-muted)]">Kayıt formu burada</p>}
        />
      </AuthCard>
    </AuthShell>
  );
}
```

- [ ] **Step 3: Visual + keyboard verification**

```bash
npm run dev
```

On `/giris`:
- Two tabs visible. "Giriş Yap" active by default with underline.
- Click "Kayıt Ol" — switches, underline moves, placeholder text changes.
- Use Tab to focus the active tab, press → and ← arrow keys — tab switches and focus follows.

Stop dev server.

- [ ] **Step 4: Lint + typecheck + commit**

```bash
npm run lint
npx tsc --noEmit
git add components/auth/AuthTabs.tsx app/giris/page.tsx
git commit -m "feat(auth): add AuthTabs with keyboard navigation"
```

---

### Task 6: Build `OAuthButtons` component

**Files:**
- Create: `components/auth/OAuthButtons.tsx`

Two buttons (Google, Apple) + a "veya" divider below. Uses Clerk Elements `SignIn.SocialProvider` (works in both sign-in and sign-up contexts because Clerk auto-creates accounts on first OAuth use).

- [ ] **Step 1: Create the file**

Create `components/auth/OAuthButtons.tsx`:
```tsx
"use client";

import * as SignIn from "@clerk/elements/sign-in";

import { useLanguage } from "@/context/LanguageContext";

export function OAuthButtons() {
  const { t } = useLanguage();

  return (
    <div>
      <div className="grid gap-3">
        <SignIn.SocialProvider
          name="google"
          className="inline-flex h-11 items-center justify-center gap-3 border border-[var(--editorial-border)] bg-white px-4 text-sm font-medium text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          <GoogleIcon />
          {t.auth.oauth.google}
        </SignIn.SocialProvider>

        <SignIn.SocialProvider
          name="apple"
          className="inline-flex h-11 items-center justify-center gap-3 border border-[var(--editorial-border)] bg-black px-4 text-sm font-medium text-white transition hover:bg-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          <AppleIcon />
          {t.auth.oauth.apple}
        </SignIn.SocialProvider>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-[var(--editorial-muted)]">
        <span className="h-px flex-1 bg-[var(--editorial-border)]" />
        <span className="uppercase tracking-wide">{t.auth.oauth.divider}</span>
        <span className="h-px flex-1 bg-[var(--editorial-border)]" />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
      <path d="M14.6 9.6c0-2.5 2.05-3.7 2.14-3.76-1.17-1.7-2.99-1.94-3.64-1.97-1.55-.16-3.02.91-3.81.91-.79 0-2-.89-3.28-.86-1.69.02-3.25.98-4.12 2.49-1.76 3.05-.45 7.55 1.26 10.02.84 1.21 1.83 2.56 3.13 2.51 1.26-.05 1.74-.81 3.26-.81 1.52 0 1.95.81 3.28.78 1.36-.02 2.21-1.22 3.04-2.44.96-1.4 1.36-2.76 1.38-2.83-.03-.01-2.64-1.01-2.64-4.04zM12.1 2.36c.7-.85 1.17-2.03 1.04-3.21-1.01.04-2.22.67-2.95 1.52-.65.76-1.22 1.96-1.07 3.12 1.12.09 2.27-.57 2.98-1.43z"/>
    </svg>
  );
}
```

**Why `SignIn.SocialProvider` works for sign-up too:** Clerk treats OAuth as a unified flow — first time a Google/Apple account hits Clerk, it auto-creates a Clerk user; subsequent times it signs them in. We don't need a separate `SignUp.SocialProvider` button.

- [ ] **Step 2: Verify in `/giris` placeholder**

The form composition happens in later tasks. For now, leave the page as-is. The component will be imported in Task 7.

- [ ] **Step 3: Lint + typecheck**

```bash
npm run lint
npx tsc --noEmit
```

Expected: no errors. (Component is not yet used; TypeScript won't complain about unused exports.)

- [ ] **Step 4: Commit**

```bash
git add components/auth/OAuthButtons.tsx
git commit -m "feat(auth): add Google + Apple OAuth buttons component"
```

---

### Task 7: Build `SignInForm` component

**Files:**
- Create: `components/auth/SignInForm.tsx`

Email + password fields, show/hide password toggle, "Şifremi unuttum" link, terracotta CTA. Uses Clerk Elements `SignIn` primitives.

- [ ] **Step 1: Create the file**

Create `components/auth/SignInForm.tsx`:
```tsx
"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import { OAuthButtons } from "./OAuthButtons";

interface SignInFormProps {
  onForgotPassword: () => void;
}

export function SignInForm({ onForgotPassword }: SignInFormProps) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SignIn.Root>
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
                aria-label={showPassword ? t.auth.fields.hidePassword : t.auth.fields.showPassword}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              {(isLoading) => (isLoading ? t.auth.actions.signInLoading : t.auth.actions.signIn)}
            </Clerk.Loading>
          </SignIn.Action>

          <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
        </div>
      </SignIn.Step>
    </SignIn.Root>
  );
}
```

- [ ] **Step 2: Wire into `/giris` to verify rendering**

Update `app/giris/page.tsx`:
```tsx
"use client";

import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import { SignInForm } from "@/components/auth/SignInForm";

export default function GirisPage() {
  const [tab, setTab] = useState<AuthTab>("signIn");

  return (
    <AuthShell>
      <AuthCard>
        <AuthTabs
          active={tab}
          onChange={setTab}
          signInContent={<SignInForm onForgotPassword={() => alert("forgot password flow comes in later task")} />}
          signUpContent={<p className="text-sm text-[var(--editorial-muted)]">Kayıt formu sonraki task'ta</p>}
        />
      </AuthCard>
    </AuthShell>
  );
}
```

- [ ] **Step 3: Visual verification — full sign-in attempt**

```bash
npm run dev
```

On `/giris`:
- Sign-in tab shows: Google button, Apple button, "veya e-posta ile" divider, email field, password field with eye toggle, "Şifremi unuttum" link, terracotta "Giriş Yap" button.
- Toggle eye icon — password becomes visible/hidden.
- Submit empty form — Clerk shows inline field errors.
- Submit with random invalid credentials — Clerk returns error, shows "E-posta veya şifre hatalı" via the `errors.invalidCredentials` mapping (Clerk's English message may show — that's OK for this task; full Turkish error mapping is a manual followup if needed, since Clerk Elements doesn't auto-translate provider errors).
- Click "Google ile devam et" — redirects to Google OAuth screen (don't complete unless you have a test account; canceling brings you back to `/giris`).

Stop dev server.

- [ ] **Step 4: Lint + typecheck + commit**

```bash
npm run lint
npx tsc --noEmit
git add components/auth/SignInForm.tsx app/giris/page.tsx
git commit -m "feat(auth): add SignInForm with OAuth, password toggle, and forgot link"
```

---

### Task 8: Build `SignUpForm` component

**Files:**
- Create: `components/auth/SignUpForm.tsx`

Ad + Soyad + E-posta + Şifre fields, show/hide toggle, "Hesabın var" hint that swaps tab. Uses Clerk Elements `SignUp` primitives.

- [ ] **Step 1: Create the file**

Create `components/auth/SignUpForm.tsx`:
```tsx
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
            <Clerk.FieldError
              className="text-xs text-[var(--editorial-terracotta)]"
              render={({ message, code }) => {
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
            />
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
                aria-label={showPassword ? t.auth.fields.hidePassword : t.auth.fields.showPassword}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Clerk.FieldError className="text-xs text-[var(--editorial-terracotta)]" />
          </Clerk.Field>

          <SignUp.Action
            submit
            className="mt-2 inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Clerk.Loading>
              {(isLoading) => (isLoading ? t.auth.actions.signUpLoading : t.auth.actions.signUp)}
            </Clerk.Loading>
          </SignUp.Action>

          <Clerk.GlobalError className="text-xs text-[var(--editorial-terracotta)]" />
        </div>
      </SignUp.Step>
    </SignUp.Root>
  );
}
```

- [ ] **Step 2: Wire into `/giris`**

Update `app/giris/page.tsx`:
```tsx
"use client";

import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function GirisPage() {
  const [tab, setTab] = useState<AuthTab>("signIn");

  return (
    <AuthShell>
      <AuthCard>
        <AuthTabs
          active={tab}
          onChange={setTab}
          signInContent={<SignInForm onForgotPassword={() => alert("forgot password flow comes in Task 10")} />}
          signUpContent={<SignUpForm onSwitchToSignIn={() => setTab("signIn")} />}
        />
      </AuthCard>
    </AuthShell>
  );
}
```

- [ ] **Step 3: Visual verification**

```bash
npm run dev
```

On `/giris`:
- Click "Kayıt Ol" tab.
- See: Google, Apple, divider, Ad / Soyad (two columns), E-posta, Şifre with toggle, terracotta "Kayıt Ol" button.
- Try registering with a real test email. After submission Clerk transitions internally to the verification step (no UI yet — Task 9 handles it). For now, just verify the form submits without crashing the page.
- Submit with an already-registered email → see "Bu e-posta zaten kayıtlı" + "Giriş sekmesine geç" button. Click it → tab switches to "Giriş Yap".

Stop dev server.

- [ ] **Step 4: Lint + typecheck + commit**

```bash
npm run lint
npx tsc --noEmit
git add components/auth/SignUpForm.tsx app/giris/page.tsx
git commit -m "feat(auth): add SignUpForm with name, email, password fields"
```

---

### Task 9: Build `VerificationStep` component

**Files:**
- Create: `components/auth/VerificationStep.tsx`

6-digit code input, auto-focus advance, paste support, resend button with 60-second cooldown. Clerk Elements provides `SignUp.Strategy name="email_code"` which gives us the verification context; we render our own input UI inside it.

- [ ] **Step 1: Create the file**

Create `components/auth/VerificationStep.tsx`:
```tsx
"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { useEffect, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";

const RESEND_COOLDOWN_SECONDS = 60;

export function VerificationStep() {
  const { t } = useLanguage();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  return (
    <SignUp.Step name="verifications">
      <SignUp.Strategy name="email_code">
        <div className="grid gap-4 text-center">
          <h2 className="font-serif text-xl text-[var(--editorial-ink)]">
            {t.auth.verification.title}
          </h2>

          <Clerk.Field name="code" className="grid gap-2">
            <Clerk.Label className="sr-only">{t.auth.fields.verificationCode}</Clerk.Label>
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
            asChild
            fallback={() => (
              <button
                type="button"
                disabled
                className="text-xs text-[var(--editorial-muted)] disabled:opacity-50"
              >
                {t.auth.verification.resendIn.replace("{seconds}", String(cooldown))}
              </button>
            )}
          >
            <button
              type="button"
              onClick={() => setCooldown(RESEND_COOLDOWN_SECONDS)}
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
```

**Note:** `SignUp.Action resend` accepts a `fallback` that renders during cooldown. We track our own 60-second timer and pass the seconds to the message; when the timer expires, Clerk's resend action is enabled and clicking it restarts our timer.

- [ ] **Step 2: Add `VerificationStep` inside `SignUpForm`'s root**

Open `components/auth/SignUpForm.tsx`. Inside the `<SignUp.Root>` block, after the existing `<SignUp.Step name="start">...</SignUp.Step>`, add:

```tsx
        {/* Verification step renders when Clerk transitions internally after sign-up submit */}
        <VerificationStep />
```

And add the import at the top:
```tsx
import { VerificationStep } from "./VerificationStep";
```

- [ ] **Step 3: Visual verification (real signup flow)**

```bash
npm run dev
```

- On `/giris`, click "Kayıt Ol".
- Fill form with a real email you control and a strong password.
- Submit. The card should transition to: ItalyPath wordmark above, card shows "E-postana 6 haneli kod gönderdik" + 6 input boxes + "Tekrar gönder (60s)" countdown.
- Check your inbox, get the code.
- Type the code — auto-submits on the 6th character. Success → redirected to `/hub` (or whatever default; the redirect comes from Clerk's app-level setting, which we'll configure in Task 11).

If you don't have a Clerk dev environment to test against, mock it by typing 6 random digits and observe the error path: "Kod hatalı veya süresi doldu."

Stop dev server.

- [ ] **Step 4: Lint + typecheck + commit**

```bash
npm run lint
npx tsc --noEmit
git add components/auth/VerificationStep.tsx components/auth/SignUpForm.tsx
git commit -m "feat(auth): add 6-digit email verification step with resend cooldown"
```

---

### Task 10: Build `PasswordResetFlow` component

**Files:**
- Create: `components/auth/PasswordResetFlow.tsx`
- Modify: `app/giris/page.tsx` (wire the flow toggle)

2-step flow: email → code + new password. Triggered by "Şifremi unuttum" link in `SignInForm`.

- [ ] **Step 1: Create the file**

Create `components/auth/PasswordResetFlow.tsx`:
```tsx
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

          <SignIn.SupportedStrategy name="reset_password_email_code" asChild>
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
          </SignIn.SupportedStrategy>

          <SignIn.Action
            submit
            className="mt-2 inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Clerk.Loading>
              {(isLoading) => (isLoading ? t.auth.actions.sendCodeLoading : t.auth.actions.sendCode)}
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
                  aria-label={showPassword ? t.auth.fields.hidePassword : t.auth.fields.showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Clerk.FieldError className="text-xs text-[var(--editorial-terracotta)]" />
            </Clerk.Field>

            <SignIn.Action
              submit
              className="mt-2 inline-flex h-11 items-center justify-center bg-[var(--editorial-terracotta)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Clerk.Loading>
                {(isLoading) => (isLoading ? t.auth.actions.signInLoading : t.auth.actions.resetPassword)}
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
```

- [ ] **Step 2: Wire reset flow into `/giris` page**

Update `app/giris/page.tsx`:
```tsx
"use client";

import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PasswordResetFlow } from "@/components/auth/PasswordResetFlow";

export default function GirisPage() {
  const [tab, setTab] = useState<AuthTab>("signIn");
  const [mode, setMode] = useState<"auth" | "reset">("auth");

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
          signUpContent={<SignUpForm onSwitchToSignIn={() => setTab("signIn")} />}
        />
      </AuthCard>
    </AuthShell>
  );
}
```

- [ ] **Step 3: Visual verification**

```bash
npm run dev
```

- `/giris` → click "Şifremi unuttum" → card switches to reset step 1 (email entry).
- Click "Giriş sayfasına dön" → back to tabs.
- Click "Şifremi unuttum" again → enter your test email → submit → card switches to step 2 (code + new password).
- Check inbox for reset code, enter it + new password → success redirects to `/hub`.

Stop dev server.

- [ ] **Step 4: Lint + typecheck + commit**

```bash
npm run lint
npx tsc --noEmit
git add components/auth/PasswordResetFlow.tsx app/giris/page.tsx
git commit -m "feat(auth): add 2-step password reset flow"
```

---

### Task 11: Handle URL query params (`?mode=kayit`, `?redirect_url=...`) and Clerk redirect config

**Files:**
- Modify: `app/giris/page.tsx`
- Modify: `app/layout.tsx` (ClerkProvider redirect props)

- [ ] **Step 1: Read existing ClerkProvider setup**

Open `app/layout.tsx`. Locate the `<ClerkProvider>` opening tag. Add (or update existing) these props:

```tsx
<ClerkProvider
  signInUrl="/giris"
  signUpUrl="/giris?mode=kayit"
  signInFallbackRedirectUrl="/hub"
  signUpFallbackRedirectUrl="/hub"
>
```

If `ClerkProvider` is currently rendered without props, add all four. If it already has unrelated props (e.g., `localization`), keep them and merge.

- [ ] **Step 2: Read `?mode` and `?redirect_url` in `/giris`**

Update `app/giris/page.tsx` to a server-aware version:
```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PasswordResetFlow } from "@/components/auth/PasswordResetFlow";

export default function GirisPage() {
  const params = useSearchParams();
  const initialTab: AuthTab = params.get("mode") === "kayit" ? "signUp" : "signIn";
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [mode, setMode] = useState<"auth" | "reset">("auth");

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
          signUpContent={<SignUpForm onSwitchToSignIn={() => setTab("signIn")} />}
        />
      </AuthCard>
    </AuthShell>
  );
}
```

**Note on `redirect_url`:** Clerk Elements respects the `redirect_url` query parameter natively via `ClerkProvider`'s redirect props. We don't need to read it manually; Clerk will route to it on successful sign-in/sign-up if present, and fall back to `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` otherwise.

- [ ] **Step 3: Wrap in Suspense for `useSearchParams`**

`useSearchParams` requires a Suspense boundary in Next.js 16. Wrap the export:

```tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// ... imports as above

function GirisInner() {
  const params = useSearchParams();
  const initialTab: AuthTab = params.get("mode") === "kayit" ? "signUp" : "signIn";
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [mode, setMode] = useState<"auth" | "reset">("auth");

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
          signUpContent={<SignUpForm onSwitchToSignIn={() => setTab("signIn")} />}
        />
      </AuthCard>
    </AuthShell>
  );
}

export default function GirisPage() {
  return (
    <Suspense fallback={<AuthShell><AuthCard><div className="h-64" /></AuthCard></AuthShell>}>
      <GirisInner />
    </Suspense>
  );
}
```

- [ ] **Step 4: Visual + behavioral verification**

```bash
npm run dev
```

- `/giris` → opens on "Giriş Yap" tab.
- `/giris?mode=kayit` → opens directly on "Kayıt Ol" tab.
- `/giris?redirect_url=/ai-mentor` → log in successfully → ends up at `/ai-mentor` instead of `/hub`.
- `/giris` (no params) → log in successfully → ends up at `/hub`.

Stop dev server.

- [ ] **Step 5: Lint + typecheck + commit**

```bash
npm run lint
npx tsc --noEmit
git add app/giris/page.tsx app/layout.tsx
git commit -m "feat(auth): handle mode query param and configure Clerk redirects"
```

---

### Task 12: Add `next.config.ts` redirects for old URLs

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add the `redirects()` function**

Open `next.config.ts`. Replace the file contents with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/sign-in',
        destination: '/giris',
        permanent: true,
      },
      {
        source: '/sign-up',
        destination: '/giris?mode=kayit',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

**Note:** Next.js `redirects()` automatically preserves query parameters from `source` to `destination` unless `destination` itself defines a fixed query string. For `/sign-up` → `/giris?mode=kayit`, an incoming `?redirect_url=/ai-mentor` will be merged: the user lands on `/giris?mode=kayit&redirect_url=/ai-mentor`.

- [ ] **Step 2: Verify redirects work**

```bash
npm run dev
```

In browser (or with `curl -I`):
- `http://localhost:3000/sign-in` → 308 → `/giris`
- `http://localhost:3000/sign-up` → 308 → `/giris?mode=kayit`
- `http://localhost:3000/sign-in?redirect_url=/ai-mentor` → 308 → `/giris?redirect_url=/ai-mentor`
- `http://localhost:3000/sign-up?redirect_url=/hub` → 308 → `/giris?mode=kayit&redirect_url=/hub`

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(auth): redirect /sign-in and /sign-up to /giris (308)"
```

---

### Task 13: Delete legacy `app/sign-in` and `app/sign-up` directories

**Files:**
- Delete: `app/sign-in/[[...sign-in]]/page.tsx`
- Delete: `app/sign-in/` (whole directory)
- Delete: `app/sign-up/[[...sign-up]]/page.tsx`
- Delete: `app/sign-up/` (whole directory)

- [ ] **Step 1: Delete the legacy directories**

Run from project root:
```bash
rm -rf app/sign-in app/sign-up
```

- [ ] **Step 2: Verify dev server still serves redirects via `next.config.ts`**

```bash
npm run dev
```

- `http://localhost:3000/sign-in` → 308 → `/giris` (worked before because the page also existed; now confirms the redirect is the only thing handling it).
- `http://localhost:3000/giris` → loads the new page.

Stop dev server.

- [ ] **Step 3: Lint + typecheck**

```bash
npm run lint
npx tsc --noEmit
```

Expected: no errors. (Removing route files doesn't break TypeScript unless something imports from them — nothing should.)

- [ ] **Step 4: Commit**

```bash
git add -A app/sign-in app/sign-up
git commit -m "chore(auth): remove legacy /sign-in and /sign-up route files"
```

(`git add -A` for deletions; this only stages the removal of the two directories, not the dirty worktree files which are elsewhere in the repo.)

---

### Task 14: Update `Navbar.tsx` — replace modal with `/giris` link

**Files:**
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: Remove `SignInButton` import**

In `components/Navbar.tsx`, change:
```tsx
import { SignInButton, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
```
to:
```tsx
import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
```

- [ ] **Step 2: Replace desktop `SignInButton` block (around line 71-82)**

Find:
```tsx
            <SignedOut>
              <SignInButton mode="modal">
                <motion.span
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="ml-2 inline-flex cursor-pointer items-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173d36]"
                >
                  {t.navbar.login}
                </motion.span>
              </SignInButton>
            </SignedOut>
```

Replace with:
```tsx
            <SignedOut>
              <Link href="/giris">
                <motion.span
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="ml-2 inline-flex cursor-pointer items-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173d36]"
                >
                  {t.navbar.login}
                </motion.span>
              </Link>
            </SignedOut>
```

- [ ] **Step 3: Replace mobile `SignInButton` block (around line 102-108)**

Find:
```tsx
            <SignedOut>
              <SignInButton mode="modal">
                <span className="inline-flex border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-3 py-1.5 text-[11px] font-semibold text-white">
                  {t.navbar.login}
                </span>
              </SignInButton>
            </SignedOut>
```

Replace with:
```tsx
            <SignedOut>
              <Link
                href="/giris"
                className="inline-flex border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                {t.navbar.login}
              </Link>
            </SignedOut>
```

- [ ] **Step 4: Update AI mentor href to use `/giris`**

Find line 16:
```tsx
  const aiMentorHref = isSignedIn ? "/ai-mentor" : "/sign-in?redirect_url=%2Fai-mentor";
```

Replace with:
```tsx
  const aiMentorHref = isSignedIn ? "/ai-mentor" : "/giris?redirect_url=%2Fai-mentor";
```

- [ ] **Step 5: Visual verification**

```bash
npm run dev
```

- Open `/` while signed out. Click Navbar "Giriş Yap" → navigates to `/giris` (no modal).
- Click "AI Mentor" link → navigates to `/giris?redirect_url=%2Fai-mentor`. Log in → ends up on `/ai-mentor`.

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add components/Navbar.tsx
git commit -m "refactor(navbar): replace SignInButton modal with /giris link"
```

---

### Task 15: Update other `/sign-in` references across the codebase

**Files:**
- Modify: `components/BottomNav.tsx`
- Modify: `components/FeaturesSection.tsx`
- Modify: `app/universities/[id]/page.tsx`
- Modify: `app/universities/[id]/departments/[deptSlug]/page.tsx`
- Modify: `app/hub/page.tsx`

The redirects in `next.config.ts` would catch these too, but updating them avoids a redundant 308 hop and keeps the codebase consistent.

- [ ] **Step 1: Update `components/BottomNav.tsx`**

Open file. Find:
```tsx
  const aiMentorHref = isSignedIn ? "/ai-mentor" : "/sign-in?redirect_url=%2Fai-mentor";
  const hubHref = isSignedIn ? "/hub" : "/sign-in?redirect_url=%2Fhub";
```

Replace `/sign-in?redirect_url=` with `/giris?redirect_url=` in both lines.

- [ ] **Step 2: Update `components/FeaturesSection.tsx`**

Open file. Find:
```tsx
  const aiMentorHref = isSignedIn ? "/ai-mentor" : "/sign-in?redirect_url=%2Fai-mentor";
  const documentsHref = isSignedIn ? "/documents" : "/sign-in?redirect_url=%2Fdocuments";
```

Replace both `/sign-in?redirect_url=` with `/giris?redirect_url=`.

- [ ] **Step 3: Update `app/universities/[id]/page.tsx`**

Find the line containing `"/sign-in?redirect_url=%2Fai-mentor"` and replace `/sign-in` with `/giris`.

- [ ] **Step 4: Update `app/universities/[id]/departments/[deptSlug]/page.tsx`**

Find the line containing `"/sign-in?redirect_url=%2Fai-mentor"` and replace `/sign-in` with `/giris` so the result is `"/giris?redirect_url=%2Fai-mentor"`.

- [ ] **Step 5: Update `app/hub/page.tsx`**

Find:
```tsx
            href="/sign-in?redirect_url=%2Fhub"
```

Replace with:
```tsx
            href="/giris?redirect_url=%2Fhub"
```

- [ ] **Step 6: Grep for any remaining `/sign-in` or `/sign-up` references**

```bash
grep -rn '"/sign-in\|"/sign-up' app components lib --include='*.tsx' --include='*.ts'
```

Expected output: empty (no matches). If any remain, update them similarly.

- [ ] **Step 7: Lint + typecheck**

```bash
npm run lint
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/BottomNav.tsx components/FeaturesSection.tsx app/universities/[id]/page.tsx app/universities/[id]/departments/[deptSlug]/page.tsx app/hub/page.tsx
git commit -m "refactor(auth): point all sign-in/up links to /giris"
```

---

### Task 16: Update `app/robots.ts` disallow list

**Files:**
- Modify: `app/robots.ts`

- [ ] **Step 1: Add `/giris` to the disallow list**

Open `app/robots.ts`. Find:
```ts
disallow: ['/api/', '/ai-mentor', '/documents', '/favorites', '/hub', '/sign-in', '/sign-up'],
```

Add `/giris`:
```ts
disallow: ['/api/', '/ai-mentor', '/documents', '/favorites', '/giris', '/hub', '/sign-in', '/sign-up'],
```

Keep `/sign-in` and `/sign-up` in the list — old URLs may still be indexed and we don't want search engines crawling them.

- [ ] **Step 2: Verify robots output**

```bash
npm run dev
```

`curl http://localhost:3000/robots.txt` → output should include both `Disallow: /giris` and `Disallow: /sign-in`.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add app/robots.ts
git commit -m "chore(seo): disallow /giris in robots.txt"
```

---

### Task 17: Extend `check-route-access.mjs` smoke check

**Files:**
- Modify: `scripts/check-route-access.mjs`

- [ ] **Step 1: Add `/giris` to public checks**

Open `scripts/check-route-access.mjs`. Find the `publicChecks` array (around line 36) and add `"/giris"` after `"/sign-in"`:

```js
const publicChecks = [
  "/",
  "/universities",
  "/universities/1",
  "/cities",
  "/cities/milano",
  "/isee",
  "/scholarships",
  "/communities",
  "/topluluklar",
  "/api/universities",
  "/data/italy-regions.geojson",
  "/sign-in",
  "/sign-up",
  "/giris",
  "/sitemap.xml",
  "/robots.txt",
];
```

- [ ] **Step 2: Add an explicit assertion for `/giris` being in the public list**

Below the existing assertions for other public patterns, add:

```js
if (!publicPatterns.includes("/giris(.*)")) {
  failures.push("Public list is missing /giris(.*)");
}
```

- [ ] **Step 3: Verify**

```bash
npm run check:routes
```

Expected output:
```
[OK] Route access matrix check passed.
[OK] Public route patterns: ...
```

If it fails, the patch wasn't applied correctly. Re-read `proxy.ts` to confirm `/giris(.*)` is in the public list.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-route-access.mjs
git commit -m "test(routes): assert /giris is in public route matrix"
```

---

### Task 18: Create `check-auth-ui.mjs` smoke check

**Files:**
- Create: `scripts/check-auth-ui.mjs`
- Modify: `package.json`

A static-source smoke check (doesn't start a server). Reads the files and asserts the expected strings are present.

- [ ] **Step 1: Create the script**

Create `scripts/check-auth-ui.mjs`:
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

// /giris page must exist and wire all components
const pageSource = read("app/giris/page.tsx");
mustContain(pageSource, "AuthShell", "app/giris/page.tsx");
mustContain(pageSource, "AuthTabs", "app/giris/page.tsx");
mustContain(pageSource, "SignInForm", "app/giris/page.tsx");
mustContain(pageSource, "SignUpForm", "app/giris/page.tsx");
mustContain(pageSource, "PasswordResetFlow", "app/giris/page.tsx");
mustContain(pageSource, "useSearchParams", "app/giris/page.tsx");
mustContain(pageSource, "Suspense", "app/giris/page.tsx");

// Components exist
for (const file of [
  "components/auth/AuthShell.tsx",
  "components/auth/AuthCard.tsx",
  "components/auth/AuthTabs.tsx",
  "components/auth/OAuthButtons.tsx",
  "components/auth/SignInForm.tsx",
  "components/auth/SignUpForm.tsx",
  "components/auth/VerificationStep.tsx",
  "components/auth/PasswordResetFlow.tsx",
]) {
  read(file); // existence checked inside read()
}

// Translations
const translations = read("lib/translations.ts");
mustContain(translations, "auth:", "lib/translations.ts");
mustContain(translations, "tabs:", "lib/translations.ts");
mustContain(translations, '"Giriş Yap"', "lib/translations.ts");
mustContain(translations, '"Kayıt Ol"', "lib/translations.ts");
mustContain(translations, '"Google ile devam et"', "lib/translations.ts");
mustContain(translations, '"Apple ile devam et"', "lib/translations.ts");

// next.config.ts redirects
const nextConfig = read("next.config.ts");
mustContain(nextConfig, "redirects()", "next.config.ts");
mustContain(nextConfig, "/sign-in", "next.config.ts");
mustContain(nextConfig, "/sign-up", "next.config.ts");
mustContain(nextConfig, "/giris", "next.config.ts");
mustContain(nextConfig, "permanent: true", "next.config.ts");

// proxy.ts must include /giris(.*)
const proxy = read("proxy.ts");
mustContain(proxy, "/giris(.*)", "proxy.ts");

// Navbar no longer uses SignInButton
const navbar = read("components/Navbar.tsx");
if (navbar.includes("SignInButton")) {
  failures.push("components/Navbar.tsx: still imports/uses SignInButton (should use <Link href='/giris'>)");
}
mustContain(navbar, '/giris', "components/Navbar.tsx");

// robots.ts disallows /giris
const robots = read("app/robots.ts");
mustContain(robots, "/giris", "app/robots.ts");

// Legacy directories removed
if (existsSync(resolve(process.cwd(), "app/sign-in"))) {
  failures.push("app/sign-in/ directory still exists (should be deleted)");
}
if (existsSync(resolve(process.cwd(), "app/sign-up"))) {
  failures.push("app/sign-up/ directory still exists (should be deleted)");
}

// All /sign-in?redirect_url references migrated
const grepPaths = [
  "components/BottomNav.tsx",
  "components/FeaturesSection.tsx",
  "app/universities/[id]/page.tsx",
  "app/universities/[id]/departments/[deptSlug]/page.tsx",
  "app/hub/page.tsx",
];
for (const path of grepPaths) {
  const content = read(path);
  if (content.includes('"/sign-in?redirect_url')) {
    failures.push(`${path}: still contains legacy "/sign-in?redirect_url" reference (should be "/giris?redirect_url")`);
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

- [ ] **Step 2: Add `check:auth-ui` to `package.json`**

Open `package.json`. In the `scripts` section, add after `check:documents-ui`:

```json
    "check:auth-ui": "node scripts/check-auth-ui.mjs",
```

- [ ] **Step 3: Run the check**

```bash
npm run check:auth-ui
```

Expected output:
```
[OK] Auth UI smoke check passed.
```

If any failures, fix them and re-run.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-auth-ui.mjs package.json
git commit -m "test(auth): add smoke check for /giris page and migration completeness"
```

---

### Task 19: Run full verification suite and manual test pass

**Files:** none (verification only).

- [ ] **Step 1: Run all check scripts**

```bash
npm run lint
npx tsc --noEmit
npm run check:routes
npm run check:auth-ui
npm run build
```

All five must pass. `npm run build` is the strongest signal — it does a production build of the whole app.

- [ ] **Step 2: Manual end-to-end test on `npm run dev`**

```bash
npm run dev
```

Walk through these flows in the browser; each must complete successfully:

**Flow 1: Google sign-up + first-time sign-in**
- `/giris` → click "Google ile devam et" → complete Google OAuth with a test account → end up on `/hub`.
- Sign out (via UserButton in Navbar).
- `/giris` → "Google ile devam et" with same account → sign in → `/hub`.

**Flow 2: Apple sign-in** (skip if you don't have an Apple test account)
- `/giris` → "Apple ile devam et" → complete → `/hub`.

**Flow 3: Email registration + verification**
- `/giris?mode=kayit` → opens on "Kayıt Ol" tab.
- Fill Ad, Soyad, real email you control, strong password → submit.
- Card transitions to verification → check email for 6-digit code → type code → auto-submits → redirects to `/hub`.

**Flow 4: Email sign-in**
- Sign out.
- `/giris` → "Giriş Yap" tab → enter email + password from Flow 3 → submit → `/hub`.

**Flow 5: Forgot password**
- Sign out.
- `/giris` → "Şifremi unuttum" → enter same email → submit → check inbox → enter code + new password → submit → `/hub`.

**Flow 6: Email already exists**
- `/giris?mode=kayit` → fill form with the email from Flow 3 → submit → see "Bu e-posta zaten kayıtlı" + "Giriş sekmesine geç" button → click → switches to sign-in tab.

**Flow 7: Wrong password**
- `/giris` → enter the email but wrong password → submit → see "E-posta veya şifre hatalı" (or Clerk's English equivalent if mapping wasn't applied) under the password field.

**Flow 8: Redirect URL preservation**
- Sign out.
- Click an "AI Mentor" link from anywhere → redirected to `/giris?redirect_url=%2Fai-mentor` → log in → ends up on `/ai-mentor`, not `/hub`.

**Flow 9: Old URLs redirect**
- Visit `http://localhost:3000/sign-in` → browser shows `/giris`.
- Visit `http://localhost:3000/sign-up` → browser shows `/giris?mode=kayit` with "Kayıt Ol" tab active.
- Visit `http://localhost:3000/sign-in?redirect_url=%2Fhub` → `/giris?redirect_url=%2Fhub` → log in → `/hub`.

**Flow 10: Mobile viewport (iOS Safari devtools or real device)**
- Resize browser to 375x812 or use a real phone.
- `/giris` renders without horizontal scroll.
- Tap "E-posta" field → keyboard appears, form remains visible (not pushed off screen).
- Tabs, buttons, links all comfortably tappable.

Stop dev server.

- [ ] **Step 2: Document any deviations**

If any flow above failed in a way that wasn't a Clerk dashboard config issue (e.g., Apple OAuth not enabled), open the spec or this plan and add a "Known issue" note. If it's a code bug, fix it and add a follow-up commit before the next task.

- [ ] **Step 3: No commit needed for this task** (verification only).

---

### Task 20: Final commit cleanup, no-op task

This task exists to confirm everything is in order before we hand off. No code changes.

- [ ] **Step 1: Run `git status`**

```bash
git status
```

Expected: clean working tree EXCEPT for the pre-existing dirty files from before this plan started:
```
M scripts/check-program-details.mjs
?? bocconi-english-program-admission-requirements/
?? output/bocconi-program-details-import-report.json
?? output/parma-program-details-import-report.json
?? output/tor-vergata-program-details-import-report.json
?? output/univpm-program-details-import-report.json
?? parma-university-english-program-admission-requirements/
?? polytechnic-university-of-marche-english-program-admission-requirements/
?? scripts/import-bocconi-program-details.mjs
?? scripts/import-parma-program-details.mjs
?? scripts/import-tor-vergata-program-details.mjs
?? scripts/import-univpm-program-details.mjs
?? tor-vergata-english-program-admission-requirements/
```

Those are not ours; leave them.

- [ ] **Step 2: Run `git log --oneline -25` and count auth-related commits**

```bash
git log --oneline -25
```

Expect roughly these commits in order (subjects may vary slightly):
1. `feat(auth): scaffold /giris route and install Clerk Elements`
2. `feat(auth): add auth namespace to translations (tr + en)`
3. `feat(auth): add AuthShell with wordmark and legal consent footer`
4. `feat(auth): add AuthCard container`
5. `feat(auth): add AuthTabs with keyboard navigation`
6. `feat(auth): add Google + Apple OAuth buttons component`
7. `feat(auth): add SignInForm with OAuth, password toggle, and forgot link`
8. `feat(auth): add SignUpForm with name, email, password fields`
9. `feat(auth): add 6-digit email verification step with resend cooldown`
10. `feat(auth): add 2-step password reset flow`
11. `feat(auth): handle mode query param and configure Clerk redirects`
12. `feat(auth): redirect /sign-in and /sign-up to /giris (308)`
13. `chore(auth): remove legacy /sign-in and /sign-up route files`
14. `refactor(navbar): replace SignInButton modal with /giris link`
15. `refactor(auth): point all sign-in/up links to /giris`
16. `chore(seo): disallow /giris in robots.txt`
17. `test(routes): assert /giris is in public route matrix`
18. `test(auth): add smoke check for /giris page and migration completeness`

Plus the earlier spec commit `docs: add auth UX redesign spec...`.

- [ ] **Step 3: Done**

Auth UX yenilemesi tamam. Spec ve plan dosyaları, 18 küçük commit, dirty worktree korundu.

---

## Notes for the engineer executing this

- **Clerk Elements is the new piece.** It's a headless React library that ships with `<SignIn.Root>`, `<SignIn.Step>`, `<Clerk.Field>`, `<Clerk.Input>`, etc. Auth flow is in Clerk; UI is in our hands. Docs: https://clerk.com/docs/customization/elements/overview
- **Clerk dashboard config must be correct before any flow works end-to-end.** Google and Apple OAuth providers must be enabled in https://dashboard.clerk.com → Authentication. Kerem confirmed these are already on, but verify if Flow 1/2 fails in Task 19.
- **Email errors:** Clerk Elements doesn't auto-translate provider error messages (e.g., "Password is too weak"). The `errors.*` keys in `lib/translations.ts` are reference text; we display Clerk's native error via `<Clerk.FieldError />`. Mapping every Clerk error code to a custom Turkish message is *out of scope* for this plan but `SignUpForm.tsx`'s `form_identifier_exists` mapping shows the pattern if needed later.
- **No tests beyond smoke checks.** This project doesn't use Jest/Vitest. The smoke check + manual flows + `npm run build` are the verification layer.
- **The dirty worktree must stay untouched.** Use `git add <specific files>` per task; never `git add .` or `git add -A` (except in Task 13 where it's scoped to the deleted directories).
- **No Co-Authored-By footer.** Project commits don't use the Claude attribution footer; check `git log` to confirm and match the existing style.
