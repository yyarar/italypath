"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import {
  UNIVERSITIES_VIEW_MODE_EVENT,
  UNIVERSITIES_VIEW_MODE_STORAGE_KEY,
} from "@/lib/universitiesFilters";

type UniversityViewMode = "grid" | "compact";

const MENTOR_DESK_KEY = "italyPathLastMentorDesk";

function readViewMode(): UniversityViewMode {
  if (typeof window === "undefined") return "grid";
  const stored = window.localStorage.getItem(UNIVERSITIES_VIEW_MODE_STORAGE_KEY);
  return stored === "compact" ? "compact" : "grid";
}

function readMentorDesk(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MENTOR_DESK_KEY);
}

export default function PreferencesStrip() {
  const { t, language, toggleLanguage } = useLanguage();
  const [viewMode, setViewMode] = useState<UniversityViewMode>("grid");
  const [mentorDesk, setMentorDesk] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setViewMode(readViewMode());
      setMentorDesk(readMentorDesk());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(UNIVERSITIES_VIEW_MODE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(UNIVERSITIES_VIEW_MODE_EVENT, sync);
    };
  }, []);

  const viewModeLabel =
    viewMode === "compact" ? t.hub.viewModeCompact : t.hub.viewModeGrid;
  const mentorLabel = mentorDesk ?? t.hub.preferences.mentor.defaultValue;
  const languageLabel = language === "tr" ? "Türkçe" : "English";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 110,
        damping: 22,
        delay: 0.18,
      }}
      aria-labelledby="hub-prefs-label"
      className="mt-12 grid grid-cols-[36px_minmax(0,1fr)] gap-7 sm:mt-16"
    >
      <p
        id="hub-prefs-label"
        className="pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.preferencesStripLabel}
      </p>
      <div className="grid grid-cols-1 border-y border-[var(--editorial-border)] sm:grid-cols-3">
        <div className="border-b border-[var(--editorial-border)] px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.preferences.language.label}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-base font-medium text-[var(--editorial-ink)]">
              {languageLabel}
            </span>
            <button
              type="button"
              onClick={toggleLanguage}
              className="border border-[var(--editorial-sage)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
            >
              {t.hub.preferences.language.toggleLabel}
            </button>
          </div>
        </div>
        <div className="border-b border-[var(--editorial-border)] px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.preferences.viewMode.label}
          </p>
          <p className="mt-2 text-base font-medium text-[var(--editorial-ink)]">
            {viewModeLabel}
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.preferences.mentor.label}
          </p>
          <p className="mt-2 text-base font-medium text-[var(--editorial-ink)]">
            {mentorLabel}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
