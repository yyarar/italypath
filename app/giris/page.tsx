"use client";

import { Suspense, useEffect, useState } from "react";
import {
  ClerkDegraded,
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
} from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AuthDegradedNotice,
  AuthFailedFallback,
  AuthLoadingFallback,
} from "@/components/auth/AuthAvailability";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";

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
  const initialTab: AuthTab =
    params.get("mode") === "kayit" ? "signUp" : "signIn";
  const [tab, setTab] = useState<AuthTab>(initialTab);

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

  return (
    <AuthShell>
      <AuthCard>
        <ClerkLoading>
          <AuthLoadingFallback />
        </ClerkLoading>
        <ClerkFailed>
          <AuthFailedFallback />
        </ClerkFailed>
        <ClerkDegraded>
          <AuthDegradedNotice />
        </ClerkDegraded>
        <ClerkLoaded>
          <AuthTabs
            active={tab}
            onChange={setTab}
            signInContent={<SignInForm />}
            signUpContent={<SignUpForm />}
          />
        </ClerkLoaded>
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
            <AuthLoadingFallback />
          </AuthCard>
        </AuthShell>
      }
    >
      <GirisInner />
    </Suspense>
  );
}
