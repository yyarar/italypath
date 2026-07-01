"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PasswordResetFlow } from "@/components/auth/PasswordResetFlow";

function isSafeRelativeRedirect(value: string) {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  );
}

function GirisInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialTab: AuthTab = params.get("mode") === "kayit" ? "signUp" : "signIn";
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [mode, setMode] = useState<"auth" | "reset">("auth");

  useEffect(() => {
    const redirectUrl = params.get("redirect_url");

    if (!redirectUrl || isSafeRelativeRedirect(redirectUrl)) {
      return;
    }

    const cleanParams = new URLSearchParams(params.toString());
    cleanParams.delete("redirect_url");
    const query = cleanParams.toString();

    router.replace(query ? `/giris?${query}` : "/giris", { scroll: false });
  }, [params, router]);

  if (mode === "reset") {
    return (
      <AuthShell>
        <AuthCard>
          <PasswordResetFlow onBack={() => setMode("auth")} />
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
          signInContent={<SignInForm onForgotPassword={() => setMode("reset")} />}
          signUpContent={<SignUpForm onSwitchToSignIn={() => setTab("signIn")} />}
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
