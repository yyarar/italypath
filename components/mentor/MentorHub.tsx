"use client";

import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import {
  MENTOR_CHANNELS,
  type MentorChannelId,
} from "@/lib/mentor/channels";

import MentorTopBar from "./MentorTopBar";

export default function MentorHub({
  onSelectChannel,
}: {
  onSelectChannel: (id: MentorChannelId) => void;
}) {
  const { t } = useLanguage();

  return (
    <main className="min-h-[100dvh] bg-[var(--editorial-paper)]">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6">
        <MentorTopBar mode="hub" />

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 110, damping: 22, delay: 0.05 }}
          className="mt-12"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
            {t.aiMentor.hubEyebrow}
          </p>
          <h1 className="mt-5 font-serif text-4xl font-normal leading-[0.98] tracking-[-0.025em] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl">
            {t.aiMentor.hubTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--editorial-muted)] sm:text-lg">
            {t.aiMentor.hubIntro}
          </p>
        </motion.section>

        <motion.ol
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.08, delayChildren: 0.15 },
            },
          }}
          className="mt-10 list-none border-t border-[var(--editorial-border)]"
        >
          {MENTOR_CHANNELS.map((channel) => {
            const copy = t.aiMentor.channels[channel.id];
            const isActive = channel.availability === "active";
            const badgeText =
              channel.id === "volunteer"
                ? t.aiMentor.hubVolunteerActiveBadge
                : null;

            return (
              <motion.li
                key={channel.id}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { type: "spring", stiffness: 110, damping: 22 },
                  },
                }}
                className="border-b border-[var(--editorial-border)]"
              >
                <button
                  type="button"
                  onClick={() => onSelectChannel(channel.id)}
                  aria-label={
                    badgeText ? `${copy.name}, ${badgeText}` : copy.name
                  }
                  className="grid w-full grid-cols-[40px_minmax(0,1fr)_auto] gap-x-5 gap-y-2 py-6 text-left transition-colors duration-200 ease-out hover:bg-[#f6f0e7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:scale-[0.995] sm:gap-x-6"
                >
                  <span className="pt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
                    {channel.numberLabel}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h2 className="font-serif text-2xl font-normal tracking-[-0.018em] text-[var(--editorial-ink)] sm:text-3xl">
                        {copy.name}
                      </h2>
                      {badgeText && (
                        <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-sage)]">
                          {badgeText}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 max-w-2xl font-serif text-sm italic leading-relaxed text-[var(--editorial-muted)] sm:text-base">
                      {copy.tagline}
                    </p>
                    <p className="mt-2 text-[10px] tracking-wide text-[var(--editorial-muted)]">
                      {copy.meta}
                    </p>
                  </div>

                  <span
                    className={`self-start whitespace-nowrap pt-2 text-[11px] font-bold uppercase tracking-[0.12em] ${
                      isActive
                        ? "text-[var(--editorial-terracotta)]"
                        : "border border-[var(--editorial-border)] px-3 py-1.5 text-[var(--editorial-muted)]"
                    }`}
                  >
                    {isActive
                      ? `${t.aiMentor.hubOpenCta} ↗`
                      : t.aiMentor.hubLockedCta}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </main>
  );
}
