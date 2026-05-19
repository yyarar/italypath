"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import {
  getMentorChannel,
  type MentorChannelId,
} from "@/lib/mentor/channels";

import MentorChatRoom, {
  type ChatMessage,
} from "@/components/mentor/MentorChatRoom";
import MentorHub from "@/components/mentor/MentorHub";

type MessagesByChannel = Record<MentorChannelId, ChatMessage[]>;
type ErrorByChannel = Record<MentorChannelId, boolean>;

const EMPTY_MESSAGES: MessagesByChannel = {
  ai: [],
  volunteer: [],
  expert: [],
};

const EMPTY_ERRORS: ErrorByChannel = {
  ai: false,
  volunteer: false,
  expert: false,
};

const VIEW_TRANSITION = {
  duration: 0.22,
  ease: [0.32, 0.72, 0, 1] as const,
};

export default function AIMentorPage() {
  const { t } = useLanguage();
  const [activeChannelId, setActiveChannelId] = useState<MentorChannelId | null>(
    null,
  );
  const [messagesByChannel, setMessagesByChannel] =
    useState<MessagesByChannel>(EMPTY_MESSAGES);
  const [errorByChannel, setErrorByChannel] =
    useState<ErrorByChannel>(EMPTY_ERRORS);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abortInflightStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const handleSelectChannel = useCallback(
    (id: MentorChannelId) => {
      abortInflightStream();
      setIsStreaming(false);
      setActiveChannelId(id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("italyPathLastMentorDesk", id);
      }
    },
    [abortInflightStream],
  );

  const handleBackToHub = useCallback(() => {
    abortInflightStream();
    setIsStreaming(false);
    setActiveChannelId(null);
  }, [abortInflightStream]);

  const handleStop = useCallback(() => {
    abortInflightStream();
  }, [abortInflightStream]);

  const handleReset = useCallback(() => {
    if (!activeChannelId) return;
    abortInflightStream();
    setIsStreaming(false);
    setMessagesByChannel((prev) => ({ ...prev, [activeChannelId]: [] }));
    setErrorByChannel((prev) => ({ ...prev, [activeChannelId]: false }));
  }, [abortInflightStream, activeChannelId]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!activeChannelId || activeChannelId !== "ai") return;
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const channelId: MentorChannelId = activeChannelId;
      const userMessage: ChatMessage = {
        id: `${Date.now()}-u`,
        role: "user",
        content: trimmed,
      };
      const assistantId = `${Date.now()}-a`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      const priorMessages = messagesByChannel[channelId];

      setMessagesByChannel((prev) => ({
        ...prev,
        [channelId]: [...prev[channelId], userMessage, assistantPlaceholder],
      }));
      setErrorByChannel((prev) => ({ ...prev, [channelId]: false }));
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const requestMessages = [
        ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: userMessage.role, content: userMessage.content },
      ];

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: requestMessages }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errorMessage = t.aiMentor.error;
          try {
            const data = (await res.json()) as { error?: string };
            if (data.error) errorMessage = data.error;
          } catch {
            /* ignore */
          }
          throw new Error(errorMessage);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error(t.aiMentor.error);
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessagesByChannel((prev) => ({
            ...prev,
            [channelId]: prev[channelId].map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          }));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // user-initiated abort — keep partial content
        } else {
          const message = err instanceof Error ? err.message : t.aiMentor.error;
          setMessagesByChannel((prev) => ({
            ...prev,
            [channelId]: prev[channelId].map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || message }
                : m,
            ),
          }));
          setErrorByChannel((prev) => ({ ...prev, [channelId]: true }));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activeChannelId, isStreaming, messagesByChannel, t.aiMentor.error],
  );

  const activeChannel = activeChannelId
    ? getMentorChannel(activeChannelId)
    : null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {activeChannel ? (
        <motion.div
          key={`chat-${activeChannel.id}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={VIEW_TRANSITION}
        >
          <MentorChatRoom
            channel={activeChannel}
            messages={messagesByChannel[activeChannel.id]}
            isStreaming={isStreaming}
            hasError={errorByChannel[activeChannel.id]}
            onSend={handleSend}
            onStop={handleStop}
            onReset={handleReset}
            onBackToHub={handleBackToHub}
          />
        </motion.div>
      ) : (
        <motion.div
          key="hub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={VIEW_TRANSITION}
        >
          <MentorHub onSelectChannel={handleSelectChannel} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
