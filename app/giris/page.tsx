"use client";

import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";

export default function GirisPage() {
  const [tab, setTab] = useState<AuthTab>("signIn");

  return (
    <AuthShell>
      <AuthCard>
        <AuthTabs
          active={tab}
          onChange={setTab}
          signInContent={<p className="text-sm text-[var(--editorial-muted)]">Giriş formu burada</p>}
          signUpContent={<p className="text-sm text-[var(--editorial-muted)]">Kayıt formu burada</p>}
        />
      </AuthCard>
    </AuthShell>
  );
}
