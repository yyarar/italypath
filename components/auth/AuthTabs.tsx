"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { useLanguage } from "@/context/LanguageContext";

export type AuthTab = "signIn" | "signUp";

interface AuthTabsProps {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
  signInContent: ReactNode;
  signUpContent: ReactNode;
  lockedTab?: AuthTab | null;
}

export function AuthTabs({
  active,
  onChange,
  signInContent,
  signUpContent,
  lockedTab = null,
}: AuthTabsProps) {
  const { t } = useLanguage();
  const signInRef = useRef<HTMLButtonElement>(null);
  const signUpRef = useRef<HTMLButtonElement>(null);
  const signInDisabled = lockedTab !== null && lockedTab !== "signIn";
  const signUpDisabled = lockedTab !== null && lockedTab !== "signUp";

  function requestTabChange(next: AuthTab) {
    if (lockedTab !== null && next !== lockedTab) {
      return;
    }

    onChange(next);
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (lockedTab !== null) {
      return;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next: AuthTab = active === "signIn" ? "signUp" : "signIn";
      onChange(next);
      // Move focus to the newly active tab next tick.
      requestAnimationFrame(() => {
        (next === "signIn" ? signInRef.current : signUpRef.current)?.focus();
      });
    }
  }

  return (
    <div>
      <div role="tablist" aria-label={t.auth.pageTitle} className="mb-6 grid grid-cols-2 gap-0 border-b border-[var(--editorial-border)]">
        <button
          ref={signInRef}
          id="auth-tab-signIn"
          role="tab"
          type="button"
          aria-selected={active === "signIn"}
          aria-controls="auth-panel-signIn"
          tabIndex={active === "signIn" ? 0 : -1}
          aria-disabled={signInDisabled}
          disabled={signInDisabled}
          onClick={() => requestTabChange("signIn")}
          onKeyDown={handleKey}
          className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
            active === "signIn"
              ? "border-[var(--editorial-ink)] text-[var(--editorial-ink)]"
              : "border-transparent text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
          }`}
        >
          {t.auth.tabs.signIn}
        </button>
        <button
          ref={signUpRef}
          id="auth-tab-signUp"
          role="tab"
          type="button"
          aria-selected={active === "signUp"}
          aria-controls="auth-panel-signUp"
          tabIndex={active === "signUp" ? 0 : -1}
          aria-disabled={signUpDisabled}
          disabled={signUpDisabled}
          onClick={() => requestTabChange("signUp")}
          onKeyDown={handleKey}
          className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
            active === "signUp"
              ? "border-[var(--editorial-ink)] text-[var(--editorial-ink)]"
              : "border-transparent text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
          }`}
        >
          {t.auth.tabs.signUp}
        </button>
      </div>

      <div
        id="auth-panel-signIn"
        role="tabpanel"
        aria-labelledby="auth-tab-signIn"
        hidden={active !== "signIn"}
      >
        {active === "signIn" && signInContent}
      </div>
      <div
        id="auth-panel-signUp"
        role="tabpanel"
        aria-labelledby="auth-tab-signUp"
        hidden={active !== "signUp"}
      >
        {active === "signUp" && signUpContent}
      </div>
    </div>
  );
}
