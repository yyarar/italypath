"use client";

import { useMemo } from "react";

import { useLanguage } from "@/context/LanguageContext";
import {
  MENTOR_CONVERSATION_STATUSES,
  type MentorConversationStatus,
} from "@/lib/mentor/volunteer";
import type { MentorConversationRow } from "@/types";

export interface OperatorConversationListProps {
  conversations: MentorConversationRow[];
  selectedConversationId: string | null;
  filter: MentorConversationStatus;
  onFilterChange: (filter: MentorConversationStatus) => void;
  onSelect: (conversationId: string) => void;
}

export default function OperatorConversationList({
  conversations,
  selectedConversationId,
  filter,
  onFilterChange,
  onSelect,
}: OperatorConversationListProps) {
  const { t, language } = useLanguage();
  const copy = t.mentorOperator;
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [language],
  );

  return (
    <section aria-label={copy.title} className="min-w-0">
      <div className="grid grid-cols-3" aria-label={copy.title}>
        {MENTOR_CONVERSATION_STATUSES.map((status) => {
          const selected = filter === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              onClick={() => onFilterChange(status)}
              className={`min-h-12 border border-r-0 border-[var(--editorial-border)] px-2 py-3 text-[9px] font-bold uppercase tracking-[0.1em] transition-colors duration-200 ease-out last:border-r sm:text-[10px] ${
                selected
                  ? "bg-[var(--editorial-ink)] text-[var(--editorial-paper)]"
                  : "bg-[var(--editorial-paper)] text-[var(--editorial-muted)] hover:bg-[var(--editorial-surface)] hover:text-[var(--editorial-ink)]"
              } focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]`}
            >
              {copy.filters[status]}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-y border-[var(--editorial-border)]">
        {conversations.length === 0 ? (
          <p className="px-3 py-10 font-serif text-sm italic text-[var(--editorial-muted)]">
            {copy.empty}
          </p>
        ) : (
          conversations.map((conversation) => {
            const selected = conversation.id === selectedConversationId;
            return (
              <button
                key={conversation.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(conversation.id)}
                className={`w-full border-b border-[var(--editorial-border)] px-3 py-4 text-left transition-colors duration-200 ease-out last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)] ${
                  selected
                    ? "bg-[var(--editorial-sage-soft)]"
                    : "bg-[var(--editorial-paper)] hover:bg-[var(--editorial-surface)]"
                }`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.1em] text-[var(--editorial-ink)]">
                    {conversation.student_display_name || copy.studentFallback}
                  </span>
                  <time
                    dateTime={conversation.last_message_at}
                    className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--editorial-muted)]"
                  >
                    {dateFormatter.format(new Date(conversation.last_message_at))}
                  </time>
                </span>
                <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)]">
                  {t.aiMentor.volunteerDesk.topics[conversation.topic]}
                </span>
                <span className="mt-2 block break-words font-serif text-sm leading-6 text-[var(--editorial-muted)]">
                  {conversation.last_message_preview}
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
