"use client";

import * as Clerk from "@clerk/elements/common";

import { useLanguage } from "@/context/LanguageContext";

export function OAuthButtons() {
  const { t } = useLanguage();

  return (
    <div>
      <div className="grid gap-3">
        <Clerk.Connection
          name="google"
          className="inline-flex h-11 items-center justify-center gap-3 border border-[var(--editorial-border)] bg-white px-4 text-sm font-medium text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          <GoogleIcon />
          {t.auth.oauth.google}
        </Clerk.Connection>

        <Clerk.Connection
          name="apple"
          className="inline-flex h-11 items-center justify-center gap-3 border border-[var(--editorial-border)] bg-black px-4 text-sm font-medium text-white transition hover:bg-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          <AppleIcon />
          {t.auth.oauth.apple}
        </Clerk.Connection>
      </div>

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

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
      <path d="M14.6 9.6c0-2.5 2.05-3.7 2.14-3.76-1.17-1.7-2.99-1.94-3.64-1.97-1.55-.16-3.02.91-3.81.91-.79 0-2-.89-3.28-.86-1.69.02-3.25.98-4.12 2.49-1.76 3.05-.45 7.55 1.26 10.02.84 1.21 1.83 2.56 3.13 2.51 1.26-.05 1.74-.81 3.26-.81 1.52 0 1.95.81 3.28.78 1.36-.02 2.21-1.22 3.04-2.44.96-1.4 1.36-2.76 1.38-2.83-.03-.01-2.64-1.01-2.64-4.04zM12.1 2.36c.7-.85 1.17-2.03 1.04-3.21-1.01.04-2.22.67-2.95 1.52-.65.76-1.22 1.96-1.07 3.12 1.12.09 2.27-.57 2.98-1.43z"/>
    </svg>
  );
}
