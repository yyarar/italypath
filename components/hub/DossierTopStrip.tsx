"use client";

import { useUser } from "@clerk/nextjs";

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
    <div className="flex items-center justify-between gap-3 border-b border-[var(--editorial-border)] pb-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
        {t.hub.topStripEyebrow}
      </p>
      <div className="inline-flex items-center gap-2.5 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] py-1.5 pl-1.5 pr-3.5">
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
        <span className="text-[13px] font-semibold text-[var(--editorial-ink)]">
          {t.hub.greeting.replace("{name}", displayName)}
        </span>
      </div>
    </div>
  );
}
