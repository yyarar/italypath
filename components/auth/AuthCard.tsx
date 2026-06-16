"use client";

import { type ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 shadow-sm sm:p-8">
      {children}
    </div>
  );
}
