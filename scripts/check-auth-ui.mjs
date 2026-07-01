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

function mustMatch(content, pattern, label, description) {
  if (!pattern.test(content)) {
    failures.push(`${label}: missing ${description}`);
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
mustMatch(signUpForm, /<SignUp\.Action\b[^>]*\bresend\b[^>]*>/, "components/auth/SignUpForm.tsx", "<SignUp.Action ... resend>");
mustContain(signUpForm, "fallback={({ resendableAfter })", "components/auth/SignUpForm.tsx");
mustContain(signUpForm, 'name="emailAddress"', "components/auth/SignUpForm.tsx");
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
  if (content.includes("/sign-in?redirect_url")) {
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
