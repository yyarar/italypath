"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import VolunteerDesk from "@/components/mentor/volunteer/VolunteerDesk";

const VIEW_TRANSITION = {
  duration: 0.22,
  ease: [0.32, 0.72, 0, 1] as const,
};

function cleanContextParam(value: string | null, maxLength: number) {
  return value?.replace(/\s+/g, " ").trim().slice(0, maxLength) ?? "";
}

function fillContextTemplate(
  template: string,
  replacements: Record<string, string>,
) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

export default function AIMentorPage() {
  const { t } = useLanguage();
  const [activeChannelId, setActiveChannelId] = useState<MentorChannelId | null>(
    null,
  );
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiHasError, setAiHasError] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [programContextDraft, setProgramContextDraft] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const hasAppliedProgramContextRef = useRef(false);
  const activeChannel = activeChannelId
    ? getMentorChannel(activeChannelId)
    : null;

  useEffect(() => {
    if (
      hasAppliedProgramContextRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    hasAppliedProgramContextRef.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("desk") !== "ai") return;

    const program = cleanContextParam(params.get("program"), 180);
    const university = cleanContextParam(params.get("university"), 140);
    const focus = cleanContextParam(params.get("focus"), 360);
    if (!program || !university) return;

    const focusCopy = focus
      ? fillContextTemplate(t.aiMentor.programContextFocus, { focus })
      : "";
    setProgramContextDraft(
      fillContextTemplate(t.aiMentor.programContextDraft, {
        program,
        university,
        focus: focusCopy,
      }),
    );
    setActiveChannelId("ai");
    window.localStorage.setItem("italyPathLastMentorDesk", "ai");
  }, [
    t.aiMentor.programContextDraft,
    t.aiMentor.programContextFocus,
  ]);

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
    if (activeChannel?.experience !== "ai-chat") return;
    abortInflightStream();
    setIsStreaming(false);
    setAiMessages([]);
    setAiHasError(false);
  }, [abortInflightStream, activeChannel]);

  const handleSend = useCallback(
    async (text: string) => {
      if (activeChannel?.experience !== "ai-chat") return;
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

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

      const priorMessages = aiMessages;

      setAiMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
      setAiHasError(false);
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
          setAiMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // user-initiated abort — keep partial content
        } else {
          const message = err instanceof Error ? err.message : t.aiMentor.error;
          setAiMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || message }
                : m,
            ),
          );
          setAiHasError(true);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activeChannel, aiMessages, isStreaming, t.aiMentor.error],
  );

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
          {activeChannel.experience === "volunteer-inbox" ? (
            <VolunteerDesk channel={activeChannel} onBackToHub={handleBackToHub} />
          ) : (
            <MentorChatRoom
              channel={activeChannel}
              messages={activeChannel.experience === "ai-chat" ? aiMessages : []}
              initialInput={
                activeChannel.experience === "ai-chat" &&
                aiMessages.length === 0
                  ? programContextDraft
                  : ""
              }
              isStreaming={activeChannel.experience === "ai-chat" && isStreaming}
              hasError={activeChannel.experience === "ai-chat" && aiHasError}
              onSend={handleSend}
              onStop={handleStop}
              onReset={handleReset}
              onBackToHub={handleBackToHub}
            />
          )}
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
