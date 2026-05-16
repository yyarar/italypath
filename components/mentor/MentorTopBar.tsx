"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Globe } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorChannel } from "@/lib/mentor/channels";

type MentorTopBarProps =
  | { mode: "hub" }
  | {
      mode: "chat";
      channel: MentorChannel;
      statusLabel: string;
      statusKey: "idle" | "streaming" | "error" | "locked";
      onBackToHub: () => void;
    };

export default function MentorTopBar(props: MentorTopBarProps) {
  const { t, language, toggleLanguage } = useLanguage();

  const languageButton = (
    <button
      onClick={toggleLanguage}
      aria-label={language === "tr" ? "Switch to English" : "Türkçeye geç"}
      className="inline-flex items-center gap-2 rounded-md border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-2 text-xs font-bold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
    >
      <Globe className="h-3.5 w-3.5" />
      {language === "tr" ? "EN" : "TR"}
    </button>
  );

  if (props.mode === "hub") {
    return (
      <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-border)] pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.aiMentor.backHome}
        </Link>

        <div className="hidden text-sm font-semibold text-[var(--editorial-ink)] sm:block">
          {t.aiMentor.pageIdentity}
        </div>

        {languageButton}
      </header>
    );
  }

  const { channel, statusLabel, statusKey, onBackToHub } = props;
  const channelName = t.aiMentor.channels[channel.id].name;
  const statusColor =
    statusKey === "streaming"
      ? "text-[var(--editorial-sage)]"
      : statusKey === "error"
        ? "text-[var(--editorial-terracotta)]"
        : "text-[var(--editorial-muted)]";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-border)] pb-4">
      <button
        onClick={onBackToHub}
        aria-label={t.aiMentor.backToHub}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.aiMentor.backToHub}
      </button>

      <div className="hidden items-baseline gap-2 sm:flex">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
          {channel.numberLabel}
        </span>
        <span className="text-sm font-semibold text-[var(--editorial-ink)]">
          {channelName}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={statusKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`text-[10px] font-bold uppercase tracking-[0.14em] ${statusColor}`}
          >
            {statusLabel}
          </motion.span>
        </AnimatePresence>

        {languageButton}
      </div>
    </header>
  );
}
