"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";

import { useLanguage } from "@/context/LanguageContext";
import { useMentorOperatorInbox } from "@/lib/mentor/useMentorOperatorInbox";

import MentorOperatorGate from "./MentorOperatorGate";
import OperatorConversationList from "./OperatorConversationList";
import OperatorConversationThread from "./OperatorConversationThread";

export default function MentorOperatorInbox() {
  const { t } = useLanguage();
  const copy = t.mentorOperator;
  const threadContainerRef = useRef<HTMLDivElement>(null);
  const {
    authorized,
    conversations,
    selectedConversation,
    messages,
    filter,
    loading,
    messagesLoading,
    sending,
    closing,
    actionLocked,
    error,
    realtimeState,
    setFilter,
    selectConversation,
    sendReply,
    closeConversation,
    reload,
  } = useMentorOperatorInbox();

  const handleSelect = useCallback(
    (conversationId: string) => {
      selectConversation(conversationId);
      if (!window.matchMedia("(max-width: 1023px)").matches) return;
      window.requestAnimationFrame(() => {
        threadContainerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
    [selectConversation],
  );

  const handleRetry = useCallback(() => reload(), [reload]);

  return (
    <MentorOperatorGate
      authorized={authorized}
      loading={loading}
      error={error}
      onRetry={handleRetry}
    >
      <main className="min-h-[100dvh] bg-[var(--editorial-paper)]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <header className="border-b border-[var(--editorial-border)] pb-5">
            <Link
              href="/"
              className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)] transition-colors duration-200 ease-out hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
            >
              ← {copy.backHome}
            </Link>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 font-serif text-4xl text-[var(--editorial-ink)]">
              {copy.title}
            </h1>
          </header>

          {realtimeState === "disconnected" ? (
            <button
              type="button"
              onClick={() => void reload().catch(() => undefined)}
              className="mt-5 w-full border border-[var(--editorial-terracotta)] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)] transition-colors duration-200 ease-out hover:bg-[var(--editorial-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              {copy.connectionLost}
            </button>
          ) : null}

          {error === "load_failed" || error === "messages_load_failed" ? (
            <div
              role="alert"
              className="mt-5 border-l-2 border-[var(--editorial-terracotta)] pl-4"
            >
              <p className="font-serif text-sm text-[var(--editorial-ink)]">
                {copy.loadError}
              </p>
              <button
                type="button"
                onClick={() => void reload().catch(() => undefined)}
                className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
              >
                {copy.retry}
              </button>
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.7fr)]">
            <OperatorConversationList
              conversations={conversations}
              selectedConversationId={selectedConversation?.id ?? null}
              filter={filter}
              disabled={actionLocked}
              onFilterChange={setFilter}
              onSelect={handleSelect}
            />
            <div ref={threadContainerRef} className="scroll-mt-4">
              <OperatorConversationThread
                key={selectedConversation?.id ?? "no-conversation"}
                conversation={selectedConversation}
                messages={messages}
                messagesLoading={messagesLoading}
                sending={sending}
                closing={closing}
                onSend={sendReply}
                onClose={closeConversation}
              />
            </div>
          </div>
        </div>
      </main>
    </MentorOperatorGate>
  );
}
