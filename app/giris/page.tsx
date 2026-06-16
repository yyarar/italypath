"use client";

import { Suspense, useState } from "react";

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
          signInContent={
            <Suspense fallback={null}>
              <SignInForm onForgotPassword={() => alert("forgot password flow comes in Task 10")} />
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
