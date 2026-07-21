"use client";

import { useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorChannel } from "@/lib/mentor/channels";
import { useVolunteerDesk } from "@/lib/mentor/useVolunteerDesk";

import MentorTopBar from "../MentorTopBar";
import VolunteerComposer from "./VolunteerComposer";
import VolunteerConversationHistory from "./VolunteerConversationHistory";
import VolunteerConversationStart from "./VolunteerConversationStart";
import VolunteerConversationStatus from "./VolunteerConversationStatus";
import VolunteerThread from "./VolunteerThread";

export interface VolunteerDeskProps {
  channel: MentorChannel;
  onBackToHub: () => void;
}

export default function VolunteerDesk({ channel, onBackToHub }: VolunteerDeskProps) {
  const { t } = useLanguage();
  const copy = t.aiMentor.volunteerDesk;
  const {
    openConversation,
    closedConversations,
    selectedConversation,
    messages,
    loading,
    messagesLoading,
    sending,
    closing,
    error,
    realtimeState,
    selectConversation,
    startConversation,
    sendMessage,
    closeConversation,
    reload,
  } = useVolunteerDesk();
  const [closeFailedConversationId, setCloseFailedConversationId] = useState<string | null>(null);

  const topBarStatusLabel =
    realtimeState === "disconnected"
      ? copy.statusDisconnected
      : realtimeState === "connecting"
        ? copy.statusConnecting
        : selectedConversation?.status === "waiting_for_team"
          ? copy.statusWaitingTeam
          : selectedConversation?.status === "waiting_for_student"
            ? copy.statusWaitingStudent
            : selectedConversation?.status === "closed"
              ? copy.statusClosed
              : t.aiMentor.statusReady;
  const topBarStatusKey =
    realtimeState === "disconnected"
      ? "error"
      : realtimeState === "connecting"
        ? "streaming"
        : "idle";
  const initialLoadFailed =
    error === "load_failed" && !selectedConversation && closedConversations.length === 0;
  const messageLoadFailed = error === "messages_load_failed";

  const handleClose = async () => {
    if (!selectedConversation || closing) return;
    if (!window.confirm(copy.closeConfirm)) return;
    const conversationId = selectedConversation.id;
    setCloseFailedConversationId(null);
    try {
      await closeConversation(conversationId);
    } catch {
      setCloseFailedConversationId(conversationId);
    }
  };

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[var(--editorial-paper)]">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
        <MentorTopBar
          mode="chat"
          channel={channel}
          statusKey={topBarStatusKey}
          statusLabel={topBarStatusLabel}
          onBackToHub={onBackToHub}
        />
      </div>

      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-[var(--editorial-ink)] sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-base leading-7 text-[var(--editorial-muted)]">
            {copy.intro}
          </p>
        </header>

        {loading ? (
          <p
            aria-live="polite"
            className="border-y border-[var(--editorial-border)] py-10 font-serif text-base italic text-[var(--editorial-muted)]"
          >
            {copy.loading}
          </p>
        ) : initialLoadFailed ? (
          <div
            role="alert"
            className="border-y border-[var(--editorial-border)] py-8"
          >
            <p className="font-serif text-base text-[var(--editorial-ink)]">
              {copy.loadError}
            </p>
            <button
              type="button"
              onClick={() => void reload().catch(() => undefined)}
              className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
            >
              {copy.retry}
            </button>
          </div>
        ) : !selectedConversation ? (
          <VolunteerConversationStart sending={sending} onStart={startConversation} />
        ) : (
          <div className="border-y border-[var(--editorial-border)] py-6">
            <VolunteerConversationStatus
              status={selectedConversation.status}
              realtimeState={realtimeState}
              onReload={reload}
            />

            {messageLoadFailed ? (
              <div role="alert" className="mt-6 border-l-2 border-[var(--editorial-terracotta)] pl-4">
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

            <VolunteerThread
              messages={messages}
              loading={messagesLoading}
              conversationId={selectedConversation.id}
              viewer="student"
            />

            {closeFailedConversationId === selectedConversation.id ? (
              <p role="alert" className="mt-5 text-sm text-[var(--editorial-terracotta)]">
                {copy.closeError}
              </p>
            ) : null}

            {selectedConversation.status !== "closed" ? (
              <>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleClose()}
                    disabled={closing}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)] transition-colors duration-200 ease-out hover:text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copy.closeCta}
                  </button>
                </div>
                <VolunteerComposer sending={sending} onSend={sendMessage} />
              </>
            ) : (
              <div className="mt-8 border-t border-[var(--editorial-border)] pt-5">
                <button
                  type="button"
                  onClick={() => selectConversation(openConversation?.id ?? null)}
                  className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] transition-colors duration-200 ease-out hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
                >
                  {openConversation ? copy.backToOpen : copy.newConversation}
                </button>
              </div>
            )}
          </div>
        )}

        {closedConversations.length > 0 ? (
          <VolunteerConversationHistory
            conversations={closedConversations}
            selectedConversationId={selectedConversation?.id ?? null}
            onSelect={selectConversation}
          />
        ) : null}
      </section>
    </main>
  );
}
