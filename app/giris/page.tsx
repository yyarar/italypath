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

function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

// redirect_url yalnız bu sitenin kendi adresine çözülebilir; tarayıcının URL
// ayrıştırmasıyla başka kökene giden veya kontrol karakteri taşıyan değer temizlenir.
function isSameOriginRedirect(value: string) {
  if (hasControlCharacter(value)) return false;

  try {
    const origin = window.location.origin;
    return new URL(value, origin).origin === origin;
  } catch {
    return false;
  }
}

function GirisInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialTab: AuthTab =
    params.get("mode") === "kayit" ? "signUp" : "signIn";
  const [tab, setTab] = useState<AuthTab>(initialTab);

  useEffect(() => {
    const redirectUrl = params.get("redirect_url");

    if (!redirectUrl || isSameOriginRedirect(redirectUrl)) {
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
