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
  read(file);
}

const signUpForm = read("components/auth/SignUpForm.tsx");
mustContain(signUpForm, "useSignUp", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "signUp.create", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "prepareVerification", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "shouldPrepareEmailVerification", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "isLegalAcceptanceMissing", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "legalAccepted: true", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "form_password_length_too_short", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "form_password_not_strong_enough", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "form_password_pwned", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "attemptVerification", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, "onVerificationStateChange", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'id="clerk-captcha"', "components/auth/SignUpForm.tsx");

const verificationStep = read("components/auth/VerificationStep.tsx");
mustContain(verificationStep, "verifyAccount", "components/auth/VerificationStep.tsx");
mustContain(verificationStep, "changeEmail", "components/auth/VerificationStep.tsx");
mustContain(verificationStep, "sentTo", "components/auth/VerificationStep.tsx");

const authTabs = read("components/auth/AuthTabs.tsx");
mustContain(authTabs, "lockedTab", "components/auth/AuthTabs.tsx");

// Translations
const translations = read("lib/translations.ts");
mustContain(translations, "auth:", "lib/translations.ts");
mustContain(translations, "tabs:", "lib/translations.ts");
mustContain(translations, '"Giriş Yap"', "lib/translations.ts");
mustContain(translations, '"Kayıt Ol"', "lib/translations.ts");
mustContain(translations, '"Google ile devam et"', "lib/translations.ts");
mustContain(translations, '"Apple ile devam et"', "lib/translations.ts");
mustContain(translations, '"Hesabımı doğrula"', "lib/translations.ts");
mustContain(translations, '"Kayıt bilgilerine dön"', "lib/translations.ts");
mustContain(translations, '"Kod gönderilen adres: {email}"', "lib/translations.ts");
mustContain(translations, "passwordTooShort", "lib/translations.ts");
mustContain(translations, "passwordCompromised", "lib/translations.ts");
mustContain(translations, "passwordNotStrongEnough", "lib/translations.ts");

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
mustContain(navbar, "/giris", "components/Navbar.tsx");

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
