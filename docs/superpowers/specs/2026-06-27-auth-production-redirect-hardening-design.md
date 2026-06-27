# Design: Auth Production Redirect Hardening

Date: 2026-06-27
Status: Ready for Kerem review

## Problem

ItalyPath already has a custom full-page auth experience at `/giris`. Public
navigation points signed-out users there, but direct visits to protected routes
such as `/hub`, `/favorites`, `/documents`, and `/ai-mentor` still rely on
Clerk middleware's default `auth.protect()` redirect behavior.

The live audit showed two related signals:

- protected document routes can leave the ItalyPath UI and land on Clerk's
  hosted development sign-in screen or return `404` for non-browser requests;
- Clerk is loaded with development keys on the live site.

These are separate concerns. The application should explicitly send signed-out
users to ItalyPath's own `/giris` page. The deployment must also use Clerk
production keys before launch.

## Goals

- Signed-out users who open protected page routes are redirected to
  `/giris?redirect_url=<original route>`.
- After sign-in or sign-up, Clerk Elements keeps using the existing
  `redirect_url` behavior and returns the user to the originally requested page.
- `/api/chat` remains protected as an API route and does not redirect browsers
  to an HTML login page.
- Legacy `/sign-in` and `/sign-up` redirects continue to work.
- The auth env guidance is aligned with the `/giris` architecture.
- The change is small, testable, and does not redesign the auth UI.

## Non-Goals

- Do not replace Clerk.
- Do not rebuild `/giris` or the Clerk Elements forms.
- Do not change Supabase RLS or document/favorites data access.
- Do not add onboarding, new auth providers, or new protected routes.
- Do not solve production key provisioning in code. Vercel and Clerk dashboard
  values must still be corrected outside the repository.

## Route Behavior

Protected page routes should have app-owned signed-out redirects:

| Request | Signed-out behavior |
| --- | --- |
| `/hub` | `/giris?redirect_url=%2Fhub` |
| `/favorites` | `/giris?redirect_url=%2Ffavorites` |
| `/documents` | `/giris?redirect_url=%2Fdocuments` |
| `/ai-mentor` | `/giris?redirect_url=%2Fai-mentor` |
| `/profile` | `/giris?redirect_url=%2Fprofile` |

If the original request has a query string, preserve it inside `redirect_url`.
For example:

```text
/hub?tab=documents -> /giris?redirect_url=%2Fhub%3Ftab%3Ddocuments
```

Protected API routes should stay API-like. `/api/chat` should remain guarded by
Clerk and may return Clerk's unauthenticated API response for signed-out
requests. It should not redirect to `/giris`, because API callers expect a
status response rather than HTML.

## Middleware Design

`proxy.ts` remains the only route-protection file. No `middleware.ts` is added.

The public route matcher remains the source of truth for public pages. For
non-public requests, the middleware should classify the route before calling
`auth.protect()`:

1. If the request is for a protected page route and the user is signed out,
   redirect to `/giris?redirect_url=<path+query>`.
2. If the request is for an API route, keep using `auth.protect()` so Clerk can
   return its normal protected API response.
3. If the user is signed in, allow the request through.

Implementation detail should prefer Clerk-supported middleware APIs rather than
manual cookie inspection. The intent is to use the request auth state exposed by
`clerkMiddleware` and pass an explicit `unauthenticatedUrl` to `auth.protect()`
for protected page routes.

## Clerk Environment Alignment

The app should document and validate the current auth URL model:

```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/giris
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/giris?mode=kayit
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/hub
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/hub
```

The live deployment must not use `pk_test_` or `sk_test_` Clerk keys in Vercel
production. Production should use Clerk production keys and the production Clerk
domain should be configured for `italypath.app`.

This repository cannot safely encode real keys. The verification should check
observable behavior instead:

- no `Clerk has been loaded with development keys` console warning on
  `https://italypath.app`;
- no redirect to `*.accounts.dev` for protected page routes;
- signed-out `/hub` lands on `https://italypath.app/giris?redirect_url=%2Fhub`.

## Error Handling

- If `redirect_url` points to a protected route, the existing Clerk Elements
  flow should complete sign-in and return there.
- If `redirect_url` is missing, the existing fallback remains `/hub`.
- The middleware should only build same-origin relative redirect targets from
  the current request path and query, preventing open redirects.
- API routes should not receive HTML login redirects.

## Testing

Local/static checks:

- `npm run check:routes`
- `npm run check:auth-ui`
- `npm run lint`

Route checks:

- `curl -I /sign-in?redirect_url=%2Fhub` returns `308` to
  `/giris?redirect_url=%2Fhub`.
- signed-out browser visit to `/hub` lands on `/giris?redirect_url=%2Fhub`.
- signed-out browser visit to `/ai-mentor` lands on
  `/giris?redirect_url=%2Fai-mentor`.
- signed-out browser visit to `/giris?redirect_url=%2Fhub` renders the custom
  ItalyPath auth page, not Clerk hosted UI.
- signed-out request to `/api/chat` remains protected without redirecting to
  `/giris`.

Production verification:

- Vercel production env uses Clerk production keys, not `pk_test_`/`sk_test_`.
- The browser console no longer shows Clerk development-key warnings.
- The URL never leaves `italypath.app` for the first protected-route redirect.

## Rollback

If the middleware change causes unexpected auth behavior, revert only the
`proxy.ts` redirect hardening. The existing `/giris` page, Clerk Elements forms,
and legacy `/sign-in`/`/sign-up` redirects are independent and should not need
to be reverted.
