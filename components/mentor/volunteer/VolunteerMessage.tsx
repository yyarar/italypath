"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorMessageRow } from "@/types";

export interface VolunteerMessageProps {
  message: MentorMessageRow;
  viewer: "student" | "staff";
  studentDisplayName?: string;
}

export default function VolunteerMessage({
  message,
  viewer,
  studentDisplayName,
}: VolunteerMessageProps) {
  const { t, language } = useLanguage();
  const copy = t.aiMentor.volunteerDesk;
  const operatorCopy = (
    t as typeof t & { mentorOperator?: { studentFallback: string } }
  ).mentorOperator;
  const isStaffMessage = message.sender_kind === "staff";
  const senderName = isStaffMessage
    ? copy.teamName
    : viewer === "student"
      ? copy.studentName
      : studentDisplayName || operatorCopy?.studentFallback || copy.studentName;
  const timestamp = new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(message.created_at));

  return (
    <article className="border-t border-[var(--editorial-border)] py-5 first:border-t-0 first:pt-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
            isStaffMessage
              ? "text-[var(--editorial-sage)]"
              : "text-[var(--editorial-terracotta)]"
          }`}
        >
          {senderName}
        </p>
        <time
          dateTime={message.created_at}
          className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--editorial-muted)]"
        >
          {timestamp}
        </time>
      </div>

      <p className="whitespace-pre-wrap break-words font-serif text-base leading-7 text-[var(--editorial-ink)]">
        {message.body}
      </p>
    </article>
  );
}
