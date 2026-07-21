"use client";

import { useMemo } from "react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorConversationRow } from "@/types";

export interface VolunteerConversationHistoryProps {
  conversations: MentorConversationRow[];
  selectedConversationId: string | null;
  onSelect: (conversationId: string) => void;
}

export default function VolunteerConversationHistory({
  conversations,
  selectedConversationId,
  onSelect,
}: VolunteerConversationHistoryProps) {
  const { t, language } = useLanguage();
  const copy = t.aiMentor.volunteerDesk;
  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (left, right) => Date.parse(right.last_message_at) - Date.parse(left.last_message_at),
      ),
    [conversations],
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
        dateStyle: "medium",
      }),
    [language],
  );

  return (
    <section aria-labelledby="volunteer-history-title" className="mt-12">
      <h2
        id="volunteer-history-title"
        className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]"
      >
        {copy.historyTitle}
      </h2>
      <div className="border-y border-[var(--editorial-border)]">
        {sortedConversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            aria-pressed={selectedConversationId === conversation.id}
            onClick={() => onSelect(conversation.id)}
            className="grid w-full gap-2 border-b border-[var(--editorial-border)] px-1 py-4 text-left last:border-b-0 hover:bg-[var(--editorial-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6"
          >
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-ink)]">
                {copy.topics[conversation.topic]}
              </span>
              <span className="mt-1 block break-words font-serif text-sm leading-6 text-[var(--editorial-muted)]">
                {conversation.last_message_preview}
              </span>
            </span>
            <time
              dateTime={conversation.last_message_at}
              className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--editorial-muted)]"
            >
              {dateFormatter.format(new Date(conversation.last_message_at))}
            </time>
          </button>
        ))}
      </div>
    </section>
  );
}
