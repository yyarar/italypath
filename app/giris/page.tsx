"use client";

import { Suspense, useState } from "react";
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
