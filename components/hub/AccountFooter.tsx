"use client";

import { SignOutButton, useClerk, useUser } from "@clerk/nextjs";

import { useLanguage } from "@/context/LanguageContext";

export default function AccountFooter() {
  const { t } = useLanguage();
  const { openUserProfile } = useClerk();
  const { user } = useUser();

  const displayName =
    user?.fullName?.trim() ||
    user?.firstName?.trim() ||
    user?.username?.trim() ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    t.hub.genericName;

  return (
    <div className="mt-14 flex flex-col items-stretch gap-4 border-t border-[var(--editorial-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
        {t.hub.accountFooter.label} · {displayName}
      </span>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2.5">
        <button
          type="button"
          onClick={() => openUserProfile()}
          className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] transition-colors hover:bg-[var(--editorial-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
        >
          {t.hub.accountFooter.manage}
        </button>
        <SignOutButton redirectUrl="/">
          <button
            type="button"
            className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] transition-colors hover:border-[var(--editorial-terracotta)] hover:bg-[#fbeee7] hover:text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)] active:translate-y-[1px]"
          >
            {t.hub.accountFooter.signOut}
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
