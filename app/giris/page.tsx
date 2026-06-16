"use client";

import { AuthShell } from "@/components/auth/AuthShell";

export default function GirisPage() {
  return (
    <AuthShell>
      <div className="rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 text-center text-sm text-[var(--editorial-muted)]">
        Kart slotu (henüz boş)
      </div>
    </AuthShell>
  );
}
