"use client";

import { Settings2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();
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
  const deskLabels = t.hub.preferences.mentor.deskLabels;
  const mentorLabel =
    mentorDesk && mentorDesk in deskLabels
      ? deskLabels[mentorDesk as keyof typeof deskLabels]
      : t.hub.preferences.mentor.defaultValue;
  const languageLabel = language === "tr" ? "Türkçe" : "English";

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, transform: "translateY(14px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ type: "spring", bounce: 0, duration: 0.4, delay: 0.08 }}
      aria-labelledby="hub-prefs-label"
      className="hub-material mt-5 rounded-[2rem] p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)]">
          <Settings2 className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <p id="hub-prefs-label" className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
          {t.hub.preferencesTitle}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 overflow-hidden rounded-[1.3rem] border border-[var(--editorial-border)] bg-[rgba(248,247,241,0.62)] sm:grid-cols-3">
        <div className="border-b border-[var(--editorial-border)] px-5 py-4 sm:border-b-0 sm:border-r">
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
              className="hub-pressable inline-flex min-h-8 items-center rounded-full border border-[var(--editorial-sage)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-sage)] hover:bg-[var(--editorial-sage)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              {t.hub.preferences.language.toggleLabel}
            </button>
          </div>
        </div>
        <div className="border-b border-[var(--editorial-border)] px-5 py-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.preferences.viewMode.label}
          </p>
          <p className="mt-2 text-base font-medium text-[var(--editorial-ink)]">
            {viewModeLabel}
          </p>
        </div>
        <div className="px-5 py-4">
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
