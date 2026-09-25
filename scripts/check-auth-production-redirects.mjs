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
// /ai-mentor 2026-07-23'ten beri public consultation hub'idir (AI masasi 2026-09-26'da kaldirildi; gonullu
// masa sayfa icinde /giris'e yonlendirir). Public matcher'da olmali, PROTECTED_PAGE_ROUTES'ta olmamali.
mustContain(proxy, "'/ai-mentor', '/ai-mentor/(.*)'", "proxy.ts");
mustNotContain(proxy, '"/ai-mentor"', "proxy.ts");
mustContain(proxy, '"/ekip"', "proxy.ts");
mustContain(proxy, '"/hosgeldin"', "proxy.ts");
mustContain(proxy, '"/sat"', "proxy.ts");
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
mustContain(envExample, "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/hosgeldin", ".env.example");
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
