"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

function getInitials(name: string): string {
  const parts = name.split(" ").map((p) => p.trim()).filter(Boolean).slice(0, 2);
  return parts.length
    ? parts.map((p) => p[0]?.toUpperCase() ?? "").join("")
    : "IP";
}

export default function DossierTopStrip() {
  const { t } = useLanguage();
  const { user } = useUser();

  const displayName =
    user?.fullName?.trim() ||
    user?.firstName?.trim() ||
    user?.username?.trim() ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    t.hub.genericName;
  const initials = getInitials(displayName);

  return (
    <div className="flex flex-col gap-4 border-b border-[var(--editorial-border)] pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div>
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.list.backHome}
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
          {t.hub.topStripEyebrow}
        </p>
      </div>
      <div className="inline-flex max-w-full items-center gap-2.5 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] py-1.5 pl-1.5 pr-3.5">
        {user?.imageUrl ? (
          <div
            role="img"
            aria-label={`${displayName} avatar`}
            className="h-7 w-7 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${user.imageUrl})` }}
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--editorial-sage)] text-[11px] font-bold text-white">
            {initials}
          </div>
        )}
        <span className="truncate text-[13px] font-semibold text-[var(--editorial-ink)]">
          {t.hub.greeting.replace("{name}", displayName)}
        </span>
      </div>
    </div>
  );
}
