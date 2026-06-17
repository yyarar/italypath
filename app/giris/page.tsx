"use client";

import { Suspense, useState } from "react";

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
          signInContent={
            <Suspense fallback={null}>
              <SignInForm onForgotPassword={() => setMode("reset")} />
            </Suspense>
          }
          signUpContent={
            <Suspense fallback={null}>
              <SignUpForm onSwitchToSignIn={() => setTab("signIn")} />
            </Suspense>
          }
        />
      </AuthCard>
    </AuthShell>
  );
}
