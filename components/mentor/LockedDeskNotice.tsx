"use client";

import { ExternalLink } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorChannel } from "@/lib/mentor/channels";

const NOTIFY_MAIL = "contact@italypath.com";

export default function LockedDeskNotice({
  channel,
}: {
  channel: MentorChannel;
}) {
  const { t } = useLanguage();
  const copy = t.aiMentor.channels[channel.id];
  const subject = encodeURIComponent(
    `${t.aiMentor.notifyMailSubject}: ${copy.name}`,
  );
  const mailHref = `mailto:${NOTIFY_MAIL}?subject=${subject}`;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
        <span className="font-serif text-3xl italic text-[var(--editorial-terracotta)]">
          {channel.monogram}
        </span>
      </div>

      <h2 className="mt-6 font-serif text-2xl font-normal leading-tight tracking-[-0.022em] text-[var(--editorial-ink)] sm:text-3xl">
        {t.aiMentor.lockedHeadline}
      </h2>

      <p className="mt-4 max-w-sm font-serif text-sm italic leading-relaxed text-[var(--editorial-muted)]">
        {copy.lockedBody}
      </p>

      <a
        href={mailHref}
        className="mt-8 inline-flex items-center gap-2 border border-[var(--editorial-terracotta)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)] transition-colors duration-200 ease-out hover:bg-[var(--editorial-terracotta)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)]"
      >
        {t.aiMentor.notifyCta}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
