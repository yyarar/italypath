"use client";

import { Suspense, useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import { SignInForm } from "@/components/auth/SignInForm";

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
              <SignInForm onForgotPassword={() => alert("forgot password flow comes in later task")} />
            </Suspense>
          }
          signUpContent={<p className="text-sm text-[var(--editorial-muted)]">Kayıt formu sonraki task&apos;ta</p>}
        />
      </AuthCard>
    </AuthShell>
  );
}
