# Design: Clerk Elements Auth Rebuild

Date: 2026-07-01
Status: Approved design; ready for written spec review

## Problem

ItalyPath already has a custom `/giris` auth page, but the current sign-up flow
has become fragile. Sign-in and password reset use Clerk Elements, while sign-up
mixes Clerk Elements with manual `useSignUp` state, manual email verification,
manual resend timers, manual `setActive`, and several follow-up patches for edge
cases.

The immediate goal is not a polished auth redesign. The goal is a small,
reliable Clerk Elements flow where users can register with email, username, and
password, verify their email code, sign in, and reset a forgotten password.

## Goals

- Keep `/giris` as the single full-page auth entry.
- Support email/password sign-up with the current Clerk instance's required
  `username` field.
- Require and complete email code verification during sign-up.
- Support email/password sign-in.
- Support the current Clerk instance's sign-in email-code second factor when
  Clerk returns `needs_second_factor`.
- Support forgot-password by email code and new password.
- Preserve `redirect_url` behavior: return to the requested protected page when
  present, otherwise go to `/hub`.
- Remove OAuth from this phase. Google/Apple will be added later as a separate
  feature.
- Remove first name and last name from this phase. Account creation only needs
  email, username, and password because the current Clerk development instance
  requires `username`.
- Prefer Clerk Elements state machines over custom auth state.
- Keep the implementation small enough to test and reason about.

## Non-Goals

- Do not replace Clerk.
- Do not add Google, Apple, magic links, SMS, passkeys, MFA, organizations, or
  onboarding.
- Do not redesign the visual theme beyond the minimum needed to render a clear
  form.
- Do not change Supabase RLS, Clerk JWT templates, favorites, documents, or hub
  data access.
- Do not create `middleware.ts`; route protection remains in `proxy.ts`.
- Do not change public SEO routes or university data behavior.

## Current Context

The project uses:

- `@clerk/nextjs` `6.37.3`
- `@clerk/elements` `0.24.18`
- Next.js App Router `16.1.6`

Because this is Clerk Core 2, the design follows the current installed package
behavior and local `@clerk/elements` APIs, not future v7-only patterns.

Existing route decisions remain valid:

- `/giris` is public.
- `/sign-in` redirects to `/giris`.
- `/sign-up` redirects to `/giris?mode=kayit`.
- Protected page routes redirect signed-out users to
  `/giris?redirect_url=<path+query>`.
- Protected API routes stay API-like and do not redirect to the HTML auth page.

## Recommended Approach

Use Clerk Elements as the source of truth for auth state.

`/giris` should only orchestrate the page shell, tabs, and redirect cleanup. It should
not manually create sign-up attempts, prepare email verification, attempt email
verification, set the active session, or maintain resend cooldown state.

The sign-up flow should use:

- `SignUp.Root`
- `SignUp.Step name="start"`
- `SignUp.Step name="verifications"`
- `SignUp.Strategy name="email_code"`
- `SignUp.Action submit`
- `SignUp.Action resend`
- `SignUp.Captcha`

The sign-in and password reset flows should use:

- `SignIn.Root`
- `SignIn.Step name="start"`
- `SignIn.Step name="forgot-password"`
- `SignIn.Step name="reset-password"`
- `SignIn.Strategy name="reset_password_email_code"`
- `SignIn.Action submit`

## User Flows

### Sign-Up

1. User opens `/giris?mode=kayit`.
2. The page shows the sign-up tab.
3. User enters email and password.
4. Clerk creates the sign-up attempt.
5. If email verification is required, the same card renders the verification
   step.
6. User enters the 6-digit email code.
7. Clerk completes sign-up, activates the session, and redirects to the safe
   `redirect_url` or `/hub`.

The sign-up form does not ask for first name or last name in this phase.

### Sign-In

1. User opens `/giris`.
2. The page shows the sign-in tab.
3. User enters email and password.
4. Clerk completes sign-in, activates the session, and redirects to the safe
   `redirect_url` or `/hub`.

### Forgot Password

1. User clicks "Şifremi unuttum" from the sign-in form.
2. Clerk Elements navigates the same sign-in state machine to
   `forgot-password`.
3. User requests a reset password email code.
4. User enters the reset code.
5. User enters a new password.
6. Clerk completes the reset, activates the session, and redirects to the safe
   `redirect_url` or `/hub`.

If verification shows that Clerk Elements cannot activate a session after reset
with the installed Core 2 packages, the implementation must stop and revise this
spec rather than silently shipping a different reset outcome.

## Redirect Rules

The app continues to accept a `redirect_url` query parameter. The target is safe
only when it starts with `/` and does not start with `//`. If it is missing or
unsafe, the fallback is `/hub`.

The implementation may rely on ClerkProvider fallback redirect URLs and Clerk
Elements' `buildAfterSignInUrl` / `buildAfterSignUpUrl` behavior, but the app
must not introduce open redirects.

Expected examples:

| Request | Successful auth target |
| --- | --- |
| `/giris` | `/hub` |
| `/giris?mode=kayit` | `/hub` |
| `/giris?redirect_url=%2Fhub` | `/hub` |
| `/giris?redirect_url=%2Fai-mentor` | `/ai-mentor` |
| `/giris?redirect_url=https://example.com` | `/hub` |
| `/giris?redirect_url=//example.com` | `/hub` |

## Component Design

### `app/giris/page.tsx`

Responsibilities:

- Read `mode=kayit` from the query string for the initial tab.
- Read no secrets and call no Clerk mutation APIs directly.
- Own only UI state: active tab.
- Render `AuthShell`, `AuthCard`, `AuthTabs`, `SignInForm`, and `SignUpForm`.

### `components/auth/SignInForm.tsx`

Responsibilities:

- Render a Clerk Elements sign-in root and start step.
- Render `identifier` and `password` fields.
- Render `email_code` verification for sign-in second factor when Clerk requires it.
- Render forgot-password and reset-password steps inside the same
  `SignIn.Root`.
- Render a forgot-password button with `SignIn.Action navigate="forgot-password"`.
- Render `Clerk.FieldError` and `Clerk.GlobalError`.
- Use `SignIn.Action submit` for submission.

### `components/auth/SignUpForm.tsx`

Responsibilities:

- Render a Clerk Elements sign-up root.
- Render `emailAddress`, `username`, and `password` fields in the `start` step.
- Render `SignUp.Captcha` in the `start` step.
- Render the email code field inside `verifications` with
  `SignUp.Strategy name="email_code"`.
- Render `SignUp.Action resend` with Clerk's `fallback({ resendableAfter })`
  countdown.
- Render `Clerk.FieldError` and `Clerk.GlobalError`.

This component must not use `useSignUp`, `signUp.create`,
`prepareVerification`, `attemptVerification`, or manual `setActive`.

### `components/auth/PasswordResetFlow.tsx`

Responsibilities:

- Keep the existing Clerk Elements forgot-password and reset-password model.
- Keep the flow inside the same card.
- Render visible email, code, and new password labels.
- Use `SignIn.Action submit`.
- Avoid unrelated state beyond password visibility.

### Removed or Unused Components

`OAuthButtons` is not used in this phase. It can remain in the repository if
that is less disruptive, but `/giris` must not render Google or Apple buttons.

`VerificationStep` should be removed if no longer imported. The email
verification UI belongs in `SignUpForm` through Clerk Elements.

## Error Handling

This phase intentionally minimizes custom error mapping.

- Field-specific errors use `Clerk.FieldError`.
- Flow-level errors use `Clerk.GlobalError`.
- Wrong password, weak password, duplicate email, invalid code, and expired code
  are surfaced through Clerk Elements.
- No custom toast layer is required.
- No manual resend timer is required.

The priority is correct auth state, not perfect Turkish copy for every Clerk
error code. Translation polish can follow once the flow is proven stable.

## Accessibility

- Keep visible labels for email, password, code, and new password.
- Keep keyboard-accessible tabs.
- Keep focus-visible styling.
- Use `autoComplete="email"`, `autoComplete="current-password"`,
  `autoComplete="new-password"`, and `autoComplete="one-time-code"` where
  appropriate.
- Password visibility toggles may remain, with `aria-pressed` and an accessible
  label.

## Validation and Tests

Update `scripts/check-auth-ui.mjs` so it validates the new contract:

- `/giris` wires `AuthShell`, `AuthCard`, `AuthTabs`, `SignInForm`,
  `SignUpForm`, and `PasswordResetFlow`.
- `SignUpForm` uses Clerk Elements sign-up primitives.
- `SignUpForm` includes `SignUp.Step name="start"`,
  `SignUp.Step name="verifications"`, `SignUp.Strategy name="email_code"`,
  `SignUp.Action resend`, and `SignUp.Captcha`.
- `SignUpForm` does not contain `useSignUp`, `signUp.create`,
  `prepareVerification`, `attemptVerification`, or manual `setActive`.
- `/giris` does not render `OAuthButtons`.
- `VerificationStep` is not imported by active auth code if removed.

Run:

```bash
npm run check:auth-ui
npm run check:auth-production
npm run check:routes
npm run lint
npm run build
```

Manual browser verification should cover:

- New email/password registration.
- Email code verification.
- Sign-in with the verified account.
- Forgot-password reset with email code.
- `/hub` signed-out redirect to `/giris?redirect_url=%2Fhub`, followed by
  successful return to `/hub`.
- Legacy `/sign-in` and `/sign-up` redirects.

## Rollout

This is a contained rebuild of the `/giris` auth forms. If it fails, rollback is
limited to the auth component changes and `check-auth-ui` updates. Existing
`proxy.ts`, `next.config.ts`, and `ClerkProvider` redirect settings should not
need to change unless verification shows a direct mismatch.
