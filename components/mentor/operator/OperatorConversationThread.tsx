"use client";

import { useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorConversationRow, MentorMessageRow } from "@/types";

import VolunteerThread from "../volunteer/VolunteerThread";
import OperatorReplyComposer from "./OperatorReplyComposer";

export interface OperatorConversationThreadProps {
  conversation: MentorConversationRow | null;
  messages: MentorMessageRow[];
  messagesLoading: boolean;
  sending: boolean;
  closing: boolean;
  onSend: (body: string) => Promise<void>;
  onClose: () => Promise<void>;
}

export default function OperatorConversationThread({
  conversation,
  messages,
  messagesLoading,
  sending,
  closing,
  onSend,
  onClose,
}: OperatorConversationThreadProps) {
  const { t } = useLanguage();
  const copy = t.mentorOperator;
  const [closeFailed, setCloseFailed] = useState(false);

  if (!conversation) {
    return (
      <section className="border-y border-[var(--editorial-border)] py-12 lg:px-6">
        <p className="font-serif text-base italic text-[var(--editorial-muted)]">
          {copy.selectConversation}
        </p>
      </section>
    );
  }

  const handleClose = async () => {
    if (closing || sending || !window.confirm(copy.closeConfirm)) return;
    setCloseFailed(false);
    try {
      await onClose();
    } catch {
      setCloseFailed(true);
    }
  };

  const isOpen = conversation.status !== "closed";

  return (
    <section
      aria-labelledby={`operator-conversation-${conversation.id}`}
      className="min-w-0 border-y border-[var(--editorial-border)] py-5 lg:px-6"
    >
      <header className="border-b border-[var(--editorial-border)] pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)]">
          {t.aiMentor.volunteerDesk.topics[conversation.topic]}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2
            id={`operator-conversation-${conversation.id}`}
            className="font-serif text-2xl text-[var(--editorial-ink)]"
          >
            {conversation.student_display_name || copy.studentFallback}
          </h2>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
            {copy.filters[conversation.status]}
          </p>
        </div>
      </header>

      <VolunteerThread
        key={conversation.id}
        messages={messages}
        loading={messagesLoading}
        conversationId={conversation.id}
        viewer="staff"
        studentDisplayName={conversation.student_display_name}
      />

      {closeFailed ? (
        <p role="alert" className="mt-5 text-sm text-[var(--editorial-terracotta)]">
          {copy.closeError}
        </p>
      ) : null}

      {isOpen ? (
        <>
          <OperatorReplyComposer
            key={conversation.id}
            sending={sending}
            disabled={closing}
            onSend={onSend}
          />
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => void handleClose()}
              disabled={closing || sending}
              className="border border-[var(--editorial-border)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)] transition-colors duration-200 ease-out hover:border-[var(--editorial-terracotta)] hover:text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copy.close}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
