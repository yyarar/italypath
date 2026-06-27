# Auth Production Redirect Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send signed-out users who open protected ItalyPath pages to the custom `/giris` auth page, while keeping API routes protected without HTML redirects and documenting the correct Clerk production env model.

**Architecture:** Keep route protection centralized in `proxy.ts`. Add a small protected-page classifier and pass an explicit `unauthenticatedUrl` to Clerk's `auth.protect()` only for page routes; leave protected API routes on the existing default guard. Add one static guard script so future auth changes cannot silently fall back to legacy `/sign-in` or Clerk-hosted development redirects.

**Tech Stack:** Next.js 16 App Router, Clerk `@clerk/nextjs` middleware, TypeScript, Node validation scripts, Vercel env variables.

---

## File Structure

- Modify `proxy.ts`: own the signed-out redirect target for protected page routes.
- Create `scripts/check-auth-production-redirects.mjs`: static regression guard for `/giris` redirect hardening and Clerk env examples.
- Modify `package.json`: add `check:auth-production`.
- Modify `.gitignore`: allow committing `.env.example` while keeping real `.env*` files ignored.
- Create `.env.example`: document safe sample env keys and the `/giris` auth URL model.
- Modify `README.md`: update the Environment and Auth Matrix sections with the production Clerk key warning and `/giris` redirect behavior.

## Task 1: Add the Failing Auth Production Guard

**Files:**
- Create: `scripts/check-auth-production-redirects.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the npm script**

Open `package.json` and add this entry inside `"scripts"` after `check:auth-ui`:

```json
"check:auth-production": "node scripts/check-auth-production-redirects.mjs"
```

The surrounding scripts block should include both auth checks:

```json
"check:documents-ui": "node scripts/check-documents-ui.mjs",
"check:auth-ui": "node scripts/check-auth-ui.mjs",
"check:auth-production": "node scripts/check-auth-production-redirects.mjs",
"clean:med": "node --no-warnings scripts/clean-med-data.mjs"
```

- [ ] **Step 2: Create the static guard script**

Create `scripts/check-auth-production-redirects.mjs` with exactly this content:

```js
import { existsSync, readFileSync } from "node:fs";
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

const proxy = read("proxy.ts");

mustContain(proxy, "PROTECTED_PAGE_ROUTES", "proxy.ts");
mustContain(proxy, '"/ai-mentor"', "proxy.ts");
mustContain(proxy, '"/documents"', "proxy.ts");
mustContain(proxy, '"/favorites"', "proxy.ts");
mustContain(proxy, '"/hub"', "proxy.ts");
mustContain(proxy, '"/profile"', "proxy.ts");
mustContain(proxy, "function isProtectedPageRoute", "proxy.ts");
mustContain(proxy, "function buildSignInRedirectUrl", "proxy.ts");
mustContain(proxy, 'new URL("/giris", request.url)', "proxy.ts");
mustContain(proxy, 'signInUrl.searchParams.set("redirect_url", requestedPath)', "proxy.ts");
mustContain(proxy, "unauthenticatedUrl: buildSignInRedirectUrl(request)", "proxy.ts");
mustContain(proxy, "await auth.protect();", "proxy.ts");

const envExample = read(".env.example");
mustContain(envExample, "NEXT_PUBLIC_CLERK_SIGN_IN_URL=/giris", ".env.example");
mustContain(envExample, "NEXT_PUBLIC_CLERK_SIGN_UP_URL=/giris?mode=kayit", ".env.example");
mustContain(envExample, "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/hub", ".env.example");
mustContain(envExample, "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/hub", ".env.example");
mustNotContain(envExample, "pk_test_", ".env.example");
mustNotContain(envExample, "sk_test_", ".env.example");
mustNotContain(envExample, "NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in", ".env.example");
mustNotContain(envExample, "NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up", ".env.example");

const gitignore = read(".gitignore");
mustContain(gitignore, "!.env.example", ".gitignore");

if (failures.length > 0) {
  console.error("[FAIL] Auth production redirect check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Auth production redirect check passed.");
```

- [ ] **Step 3: Run the guard and confirm it fails**

Run:

```bash
npm run check:auth-production
```

Expected result: `FAIL`. The failure should mention missing `PROTECTED_PAGE_ROUTES`, missing `buildSignInRedirectUrl`, missing `.env.example`, and missing `!.env.example`.

Do not commit yet; this is the failing guard for the next tasks.

## Task 2: Harden Protected Page Redirects in `proxy.ts`

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Replace `proxy.ts` with the hardened middleware**

Replace the full contents of `proxy.ts` with:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

/**
 * Auth gerektirmeyen (public) yollar.
 * Bu listenin dışındaki tüm route'lar Clerk ile korunur.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/universities(.*)',
  '/data(.*)',        // Public static datasets: scholarship map GeoJSON
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/universities(.*)', // Ziyaretçiler okulları ve detayları görebilsin
  '/cities(.*)',       // Ziyaretçiler şehir rehberlerini görebilsin
  '/isee(.*)',         // Ziyaretçiler burs hesaplayıcıyı kullanabilsin
  '/scholarships(.*)', // Ziyaretçiler burs haritasını görebilsin
  '/communities(.*)',  // Ziyaretçiler topluluk rehberini görebilsin
  '/topluluklar(.*)',  // Türkçe kısa yol -> /communities
  '/yasal(.*)',        // Yasal sayfalar (gizlilik, kullanım koşulları, çerez)
  '/giris(.*)',        // Yeni Türkçe giriş/kayıt sayfası
  '/sitemap.xml',      // Google botları için
  '/robots.txt',       // Google botları için
]);

const PROTECTED_PAGE_ROUTES = [
  "/ai-mentor",
  "/documents",
  "/favorites",
  "/hub",
  "/profile",
];

function isProtectedPageRoute(pathname: string) {
  return PROTECTED_PAGE_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function buildSignInRedirectUrl(request: NextRequest) {
  const signInUrl = new URL("/giris", request.url);
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  signInUrl.searchParams.set("redirect_url", requestedPath);

  return signInUrl.href;
}

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  if (isProtectedPageRoute(request.nextUrl.pathname)) {
    await auth.protect({
      unauthenticatedUrl: buildSignInRedirectUrl(request),
    });
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    // Next.js'in statik dosyaları hariç her şeyi yakala
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API rotalarını her zaman yakala
    '/(api|trpc)(.*)',
  ],
};
```

- [ ] **Step 2: Run the existing route matrix**

Run:

```bash
npm run check:routes
```

Expected result:

```text
[OK] Route access matrix check passed.
```

- [ ] **Step 3: Run the new guard and confirm the remaining failures**

Run:

```bash
npm run check:auth-production
```

Expected result: still `FAIL`, but only for `.env.example` and `!.env.example`. Proxy-related failures should be gone.

Do not commit yet.

## Task 3: Add Safe Env Example and README Guidance

**Files:**
- Modify: `.gitignore`
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Allow `.env.example` to be committed**

In `.gitignore`, replace:

```gitignore
# env files (can opt-in for committing if needed)
.env*
```

with:

```gitignore
# env files
.env*
!.env.example
```

- [ ] **Step 2: Create `.env.example`**

Create `.env.example` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key-for-local-admin-scripts-only

# Clerk
# Local development may use Clerk test keys. Vercel Production must use Clerk production keys.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_replace-with-clerk-production-publishable-key
CLERK_SECRET_KEY=sk_live_replace-with-clerk-production-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/giris
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/giris?mode=kayit
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/hub
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/hub

# AI mentor
GEMINI_API_KEY=replace-with-gemini-api-key
```

- [ ] **Step 3: Update README Environment section**

In `README.md`, replace the existing Environment code block with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/giris
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/giris?mode=kayit
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/hub
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/hub
```

Immediately below the code block, add:

```md
Canlı Vercel Production ortamında Clerk anahtarları `pk_live_` ve `sk_live_`
olmalıdır. `pk_test_` / `sk_test_` anahtarları canlı sitede development-mode
uyarısı üretir ve protected route akışlarını Clerk hosted development ekranına
taşıyabilir.
```

- [ ] **Step 4: Update README Auth Matrix section**

Replace the `Protected:` paragraph in `README.md` with:

```md
Protected: `/ai-mentor`, `/documents`, `/favorites`, `/hub`, `/profile`,
`/api/chat`.

Signed-out kullanıcı protected page route açarsa `proxy.ts` onu
`/giris?redirect_url=<istenen-route>` adresine yönlendirir. Protected API route
olan `/api/chat` HTML login sayfasına yönlendirilmez; API gibi korumalı kalır.
```

- [ ] **Step 5: Run the new guard**

Run:

```bash
npm run check:auth-production
```

Expected result:

```text
[OK] Auth production redirect check passed.
```

- [ ] **Step 6: Commit the route hardening and env guidance**

Run:

```bash
git add proxy.ts scripts/check-auth-production-redirects.mjs package.json .gitignore .env.example README.md
git commit -m "fix(auth): route protected pages through /giris"
```

## Task 4: Validate Existing Auth and Route Checks

**Files:**
- No file changes expected.

- [ ] **Step 1: Run route and auth static checks**

Run:

```bash
npm run check:routes
npm run check:auth-ui
npm run check:auth-production
```

Expected result:

```text
[OK] Route access matrix check passed.
[OK] Auth UI smoke check passed.
[OK] Auth production redirect check passed.
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected result: no ESLint errors. The existing warnings in `scripts/import-parma-program-details.mjs` may remain:

```text
warning  'labelledText' is defined but never used
warning  'joinTextParts' is defined but never used
```

- [ ] **Step 3: Confirm validation did not change files**

Run:

```bash
git status --short
```

Expected result: no output. Do not create a commit in this task.

## Task 5: Local Browser Smoke Test

**Files:**
- No file changes expected.

- [ ] **Step 1: Start the local dev server**

Run:

```bash
npm run dev
```

Expected result: Next.js starts on `http://localhost:3000`.

- [ ] **Step 2: Verify signed-out `/hub` redirect**

In a clean signed-out browser session, open:

```text
http://localhost:3000/hub
```

Expected URL:

```text
http://localhost:3000/giris?redirect_url=%2Fhub
```

Expected page: custom ItalyPath auth UI with `Giriş Yap`, `Kayıt Ol`, Google,
Apple, e-mail, and password controls.

- [ ] **Step 3: Verify signed-out `/ai-mentor` redirect**

Open:

```text
http://localhost:3000/ai-mentor
```

Expected URL:

```text
http://localhost:3000/giris?redirect_url=%2Fai-mentor
```

Expected page: custom ItalyPath auth UI, not Clerk hosted UI.

- [ ] **Step 4: Verify `/api/chat` does not redirect to `/giris`**

Run:

```bash
curl -i http://localhost:3000/api/chat
```

Expected result: a protected API response such as `404`, `401`, or `405`.
The response must not be a `307`/`308` redirect to `/giris`.

- [ ] **Step 5: Stop the dev server**

Stop the dev server with `Ctrl+C`.

## Task 6: Production Deployment Verification

**Files:**
- No repository file changes.

- [ ] **Step 1: Update Vercel Production env values**

In Vercel Project Settings -> Environment Variables -> Production, ensure:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY starts with pk_live_
CLERK_SECRET_KEY starts with sk_live_
NEXT_PUBLIC_CLERK_SIGN_IN_URL is /giris
NEXT_PUBLIC_CLERK_SIGN_UP_URL is /giris?mode=kayit
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL is /hub
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL is /hub
```

If Vercel still has `/sign-in` or `/sign-up` for Clerk URL variables, replace
them with the values above.

- [ ] **Step 2: Redeploy production**

Trigger a production deployment from `main` after the env change.

- [ ] **Step 3: Verify live protected redirects**

Run:

```bash
curl -sSI https://italypath.app/hub | sed -n '1,25p'
curl -sSI https://italypath.app/ai-mentor | sed -n '1,25p'
```

Expected result: each protected page route returns a redirect to an ItalyPath
`/giris` URL, not to `*.accounts.dev`.

- [ ] **Step 4: Verify live auth page in browser**

Open:

```text
https://italypath.app/hub
```

Expected browser URL:

```text
https://italypath.app/giris?redirect_url=%2Fhub
```

Expected page: custom ItalyPath auth UI.

- [ ] **Step 5: Verify no Clerk development warning**

Open browser console on:

```text
https://italypath.app/giris?redirect_url=%2Fhub
```

Expected result: no warning containing:

```text
Clerk has been loaded with development keys
```

If the warning remains, the deployed Vercel Production Clerk keys are still test
keys or the production deploy has not picked up the new env values.
