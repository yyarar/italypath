"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PasswordResetFlow } from "@/components/auth/PasswordResetFlow";

function GirisInner() {
  const params = useSearchParams();
  const initialTab: AuthTab = params.get("mode") === "kayit" ? "signUp" : "signIn";
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [mode, setMode] = useState<"auth" | "reset">("auth");
  const [isSignUpVerification, setIsSignUpVerification] = useState(false);

  const handleSignUpVerificationChange = useCallback((isVerifying: boolean) => {
    setIsSignUpVerification(isVerifying);

    if (isVerifying) {
      setMode("auth");
      setTab("signUp");
    }
  }, []);

  if (mode === "reset") {
    return (
      <AuthShell>
        <AuthCard>
          <Suspense fallback={null}>
            <PasswordResetFlow onBack={() => setMode("auth")} />
          </Suspense>
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
          lockedTab={isSignUpVerification ? "signUp" : null}
          signInContent={
            <Suspense fallback={null}>
              <SignInForm onForgotPassword={() => setMode("reset")} />
            </Suspense>
          }
          signUpContent={
            <Suspense fallback={null}>
              <SignUpForm
                onSwitchToSignIn={() => {
                  setIsSignUpVerification(false);
                  setTab("signIn");
                }}
                onVerificationStateChange={handleSignUpVerificationChange}
              />
            </Suspense>
          }
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
