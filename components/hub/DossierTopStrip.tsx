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
  const { t, language } = useLanguage();
  const { user } = useUser();

  const displayName =
    user?.fullName?.trim() ||
    user?.firstName?.trim() ||
    user?.username?.trim() ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    t.hub.genericName;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = getInitials(displayName);

  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--editorial-border)] pb-4">
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
          {displayName}
        </span>
        {email && (
          <span className="hidden text-[11px] text-[var(--editorial-muted)] sm:inline">
            · {email}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--editorial-muted)]">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--editorial-sage)]"
          aria-hidden
        />
        <span className="hidden sm:inline">{t.hub.topStripEyebrow}</span>
        <span>· {dateLabel}</span>
      </div>
    </div>
  );
}
