"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

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
    <div className="hub-material sticky top-3 z-30 flex items-center justify-between gap-3 rounded-[1.4rem] p-2.5 sm:rounded-[1.6rem] sm:p-3">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link
          href="/"
          className="hub-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--editorial-paper)] text-[var(--editorial-muted)] hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          aria-label={t.list.backHome}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[var(--editorial-terracotta)]">
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em]">{t.hub.topStripEyebrow}</p>
          </div>
          <p className="mt-0.5 hidden text-xs text-[var(--editorial-muted)] sm:block">{t.list.backHome}</p>
        </div>
      </div>
      <div className="inline-flex min-w-0 max-w-[58%] items-center gap-2.5 rounded-full bg-[var(--editorial-paper)] py-1.5 pl-1.5 pr-3.5 ring-1 ring-inset ring-[var(--editorial-border)]">
        {user?.imageUrl ? (
          <div
            role="img"
            aria-label={`${displayName} avatar`}
            className="h-8 w-8 shrink-0 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${user.imageUrl})` }}
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--editorial-sage)] text-[11px] font-bold text-white">
            {initials}
          </div>
        )}
        <span className="truncate text-xs font-semibold text-[var(--editorial-ink)] sm:text-[13px]">
          {t.hub.greeting.replace("{name}", displayName)}
        </span>
      </div>
    </div>
  );
}
