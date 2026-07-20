"use client";

import * as Clerk from "@clerk/elements/common";

import { useLanguage } from "@/context/LanguageContext";

export function OAuthButtons() {
  const { t } = useLanguage();

  return (
    <div>
      <Clerk.Connection
        name="google"
        className="inline-flex h-11 w-full items-center justify-center gap-3 border border-[var(--editorial-border)] bg-white px-4 text-sm font-medium text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
      >
        <GoogleIcon />
        {t.auth.oauth.google}
      </Clerk.Connection>

      <div className="my-6 flex items-center gap-3 text-xs text-[var(--editorial-muted)]">
        <span className="h-px flex-1 bg-[var(--editorial-border)]" />
        <span className="uppercase tracking-wide">{t.auth.oauth.divider}</span>
        <span className="h-px flex-1 bg-[var(--editorial-border)]" />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
