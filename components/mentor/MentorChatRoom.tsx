"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Square } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorChannel } from "@/lib/mentor/channels";

import EntryPair from "./EntryPair";
import LockedDeskNotice from "./LockedDeskNotice";
import MentorTopBar from "./MentorTopBar";
import StarterPrompts from "./StarterPrompts";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface EntryPairData {
  questionNumber: number;
  question: string;
  response: string;
  isStreamingResponse: boolean;
}

function buildEntryPairs(messages: ChatMessage[], isStreaming: boolean): EntryPairData[] {
  const pairs: EntryPairData[] = [];
  let questionCounter = 0;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role !== "user") continue;
    questionCounter += 1;
    const next = messages[i + 1];
    const hasAssistant = Boolean(next && next.role === "assistant");
    const response = hasAssistant ? next.content : "";
    const isLastAssistant = hasAssistant && i + 1 === messages.length - 1;
    pairs.push({
      questionNumber: questionCounter,
      question: message.content,
      response,
      isStreamingResponse: isLastAssistant && isStreaming,
    });
  }
  return pairs;
}

export default function MentorChatRoom({
  channel,
  messages,
  initialInput,
  isStreaming,
  hasError,
  onSend,
  onStop,
  onReset,
  onBackToHub,
}: {
  channel: MentorChannel;
  messages: ChatMessage[];
  initialInput?: string;
  isStreaming: boolean;
  hasError: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  onBackToHub: () => void;
}) {
  const { t } = useLanguage();
  const [input, setInput] = useState(initialInput ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const isLocked = channel.availability !== "active";

  useEffect(() => {
    if (isLocked) return;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    const isNewBubble = lastMessageIdRef.current !== lastMessage.id;
    lastMessageIdRef.current = lastMessage.id;
    scrollRef.current?.scrollIntoView({
      behavior: isStreaming || !isNewBubble ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isStreaming, isLocked]);

  const statusKey: "idle" | "streaming" | "error" | "locked" = isLocked
    ? "locked"
    : isStreaming
      ? "streaming"
      : hasError
        ? "error"
        : "idle";
  const statusLabel =
    statusKey === "locked"
      ? t.aiMentor.statusLocked
      : statusKey === "streaming"
        ? t.aiMentor.statusWriting
        : statusKey === "error"
          ? t.aiMentor.statusError
          : t.aiMentor.statusReady;

  const pairs = useMemo(
    () => (isLocked ? [] : buildEntryPairs(messages, isStreaming)),
    [messages, isStreaming, isLocked],
  );

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const showStarterPrompts =
    !isLocked && messages.length === 0 && !isStreaming;
  const showReset = !isLocked && userMessageCount > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming || isLocked) return;
    onSend(trimmed);
    setInput("");
  };

  const handlePickPrompt = (text: string) => {
    if (isStreaming || isLocked) return;
    onSend(text);
  };

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[var(--editorial-paper)]">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
        <MentorTopBar
          mode="chat"
          channel={channel}
          statusKey={statusKey}
          statusLabel={statusLabel}
          onBackToHub={onBackToHub}
        />
      </div>

      <section
        aria-live="polite"
        aria-atomic="false"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-6"
      >
        {isLocked ? (
          <LockedDeskNotice channel={channel} />
        ) : (
          <>
            {showReset ? (
              <div className="mb-6 flex justify-end">
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)] transition-colors duration-200 ease-out hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                >
                  {t.aiMentor.resetLabel}
                </button>
              </div>
            ) : null}

            {pairs.map((pair) => (
              <EntryPair
                key={`pair-${pair.questionNumber}`}
                questionNumber={pair.questionNumber}
                question={pair.question}
                responseText={pair.response}
                isStreamingResponse={pair.isStreamingResponse}
              />
            ))}

            <AnimatePresence>
              {showStarterPrompts ? (
                <motion.div
                  key="starter"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.25, type: "spring", stiffness: 100, damping: 20 }}
                >
                  <StarterPrompts onPick={handlePickPrompt} />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div ref={scrollRef} className="h-2 shrink-0" />
          </>
        )}
      </section>

      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming || isLocked}
            placeholder={
              isLocked
                ? t.aiMentor.inputPlaceholderLocked
                : isStreaming
                  ? t.aiMentor.inputPlaceholderStreaming
                  : t.aiMentor.inputPlaceholder
            }
            aria-label={t.aiMentor.inputPlaceholder}
            autoComplete="off"
            className="flex-1 bg-transparent font-serif text-base italic text-[var(--editorial-ink)] placeholder:font-serif placeholder:italic placeholder:text-[var(--editorial-muted)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />

          <AnimatePresence mode="wait" initial={false}>
            {isStreaming ? (
              <motion.button
                key="stop"
                type="button"
                onClick={onStop}
                aria-label={t.aiMentor.stopAria}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="grid h-9 w-9 place-items-center bg-[var(--editorial-terracotta)] text-white transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                <Square className="h-3 w-3" />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                type="submit"
                disabled={!input.trim() || isLocked}
                aria-label={t.aiMentor.sendAria}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="grid h-9 w-9 place-items-center bg-[var(--editorial-ink)] text-[var(--editorial-paper)] transition-transform duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </form>
    </main>
  );
}
