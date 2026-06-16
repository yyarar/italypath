"use client";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";

export default function GirisPage() {
  return (
    <AuthShell>
      <AuthCard>
        <p className="text-center text-sm text-[var(--editorial-muted)]">
          Sekme + form burada olacak
        </p>
      </AuthCard>
    </AuthShell>
  );
}
