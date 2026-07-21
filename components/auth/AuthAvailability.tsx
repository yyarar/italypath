"use client";

import { useEffect, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";

const SLOW_LOADING_DELAY_MS = 6_000;

function ReloadButton() {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex h-10 items-center justify-center border border-[var(--editorial-border)] bg-white px-4 text-sm font-semibold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
    >
      {t.auth.availability.retry}
    </button>
  );
}

export function AuthLoadingFallback() {
  const { t } = useLanguage();
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setIsSlow(true),
      SLOW_LOADING_DELAY_MS,
    );

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-52 flex-col items-center justify-center gap-3 text-center"
    >
      <span
        aria-hidden="true"
        className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--editorial-border)] border-t-[var(--editorial-terracotta)]"
      />
      <p className="text-sm font-semibold text-[var(--editorial-ink)]">
        {t.auth.availability.loadingTitle}
      </p>
      <p className="max-w-72 text-xs leading-relaxed text-[var(--editorial-muted)]">
        {isSlow
          ? t.auth.availability.loadingSlowBody
          : t.auth.availability.loadingBody}
      </p>
      {isSlow ? <ReloadButton /> : null}
    </div>
  );
}

export function AuthFailedFallback() {
  const { t } = useLanguage();

  return (
    <div
      role="alert"
      className="flex min-h-52 flex-col items-center justify-center gap-3 text-center"
    >
      <p className="text-base font-semibold text-[var(--editorial-ink)]">
        {t.auth.availability.failedTitle}
      </p>
      <p className="max-w-80 text-sm leading-relaxed text-[var(--editorial-muted)]">
        {t.auth.availability.failedBody}
      </p>
      <ReloadButton />
    </div>
  );
}

export function AuthDegradedNotice() {
  const { t } = useLanguage();

  return (
    <p
      role="status"
      className="mb-4 border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-3 py-2 text-xs leading-relaxed text-[var(--editorial-muted)]"
    >
      {t.auth.availability.degradedBody}
    </p>
  );
}
