"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Bot, User, ArrowLeft, RefreshCcw, Sparkles, Square } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const PROMPT_KEYS = ["prompt1", "prompt2", "prompt3", "prompt4"] as const;

function createWelcomeMessage(content: string): ChatMessage {
  return { id: "welcome", role: "assistant", content };
}

export default function AIMentorPage() {
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const welcomeMessage = useMemo(() => createWelcomeMessage(t.aiMentor.welcome), [t.aiMentor.welcome]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage(t.aiMentor.welcome)]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const isNewBubble = lastMessageIdRef.current !== lastMessage.id;
    lastMessageIdRef.current = lastMessage.id;

    scrollRef.current?.scrollIntoView({
      behavior: isStreaming || !isNewBubble ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isStreaming]);

  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0]?.id === "welcome" ? [welcomeMessage] : prev
    );
  }, [welcomeMessage]);

  const sendPrompt = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorMessage = t.aiMentor.error;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) errorMessage = data.error;
        } catch { /* */ }
        throw new Error(errorMessage);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Stream okunamadı");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + text } : m)
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // User stopped — keep partial message
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || (err instanceof Error ? err.message : t.aiMentor.error) }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, messages, t.aiMentor.error]);

  const handleSend = useCallback((e: React.FormEvent) => { e.preventDefault(); sendPrompt(input); }, [input, sendPrompt]);
  const handleStop = () => { abortRef.current?.abort(); };
  const handleReset = () => { abortRef.current?.abort(); setMessages([welcomeMessage]); setIsStreaming(false); };

  const showPromptChips = messages.length === 1 && !isStreaming;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#fafbff] text-slate-900 overflow-hidden">

      {/* Header */}
      <header className="shrink-0 px-4 py-3 bg-white/85 backdrop-blur-md border-b border-slate-100 flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-10">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label={t.aiMentor.backHome} className="p-1.5 rounded-xl hover:bg-slate-100 transition">
            <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-slate-600 transition" />
          </Link>
          <div className="relative">
            {/* Italian flag gradient avatar */}
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm bg-gradient-to-br from-green-500 via-white to-red-500">
              <Bot className="text-slate-700 w-5 h-5" />
            </div>
            {isStreaming && (
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white ${shouldReduceMotion ? "" : "animate-pulse"}`} />
            )}
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-800 tracking-tight">{t.aiMentor.title}</h1>
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.p
                  key="thinking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-indigo-500 font-semibold"
                >
                  {t.aiMentor.thinking}
                </motion.p>
              ) : (
                <motion.p
                  key="online"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-emerald-500 font-semibold"
                >
                  Online
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
        <button
          onClick={handleReset}
          title={t.aiMentor.reset}
          aria-label={t.aiMentor.reset}
          className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-300 hover:text-slate-500"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-gradient-to-b from-slate-50/50 to-[#fafbff]">
        <AnimatePresence mode="popLayout">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-2.5 max-w-[82%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 border ${m.role === "user"
                    ? "bg-indigo-600 border-indigo-700"
                    : "bg-white border-slate-200 shadow-sm"
                  }`}>
                  {m.role === "user"
                    ? <User size={13} className="text-white" />
                    : <Sparkles size={13} className="text-indigo-500" />
                  }
                </div>

                {/* Bubble */}
                <div
                  className={`px-4 py-3 text-sm leading-relaxed shadow-sm ${m.role === "user"
                      ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-[20px_20px_4px_20px]"
                      : "bg-white border border-slate-100 text-slate-800 rounded-[20px_20px_20px_4px]"
                    }`}
                >
                  {m.content ? (
                    <div className={m.role === "assistant" ? "prose-chat" : ""}>
                      {m.role === "assistant"
                        ? <ReactMarkdown>{m.content}</ReactMarkdown>
                        : <span>{m.content}</span>
                      }
                    </div>
                  ) : (
                    /* Organic typing indicator */
                    <div className="flex gap-1.5 items-center h-5 px-1">
                      {shouldReduceMotion
                        ? [0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-2 h-2 bg-indigo-300 rounded-full block opacity-80"
                          />
                        ))
                        : [0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-2 h-2 bg-indigo-300 rounded-full block"
                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              delay: i * 0.22,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Prompt chips */}
        <AnimatePresence>
          {showPromptChips && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 20 }}
              className="space-y-3 pt-1"
            >
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                {t.aiMentor.promptsTitle}
              </p>
              <div className="flex flex-wrap gap-2">
                {PROMPT_KEYS.map((key, i) => (
                  <motion.button
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 100, damping: 20 }}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => sendPrompt(t.aiMentor[key])}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 glass border border-indigo-100 rounded-2xl text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all shadow-sm"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="text-left">{t.aiMentor[key]}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={scrollRef} className="h-2" />
      </div>

      {/* Input area */}
      <div className="shrink-0 p-4 pb-8 bg-white/90 backdrop-blur-md border-t border-slate-100 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-center gap-2">
          <input
            type="text"
            className="flex-1 p-3.5 pr-4 rounded-2xl border border-slate-200 bg-slate-50/80 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder={isStreaming ? t.aiMentor.inputPlaceholderStreaming : t.aiMentor.inputPlaceholder}
            autoComplete="off"
          />
          <AnimatePresence mode="wait">
            {isStreaming ? (
              <motion.button
                key="stop"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                type="button"
                onClick={handleStop}
                aria-label={t.aiMentor.stop}
                className="p-3 bg-rose-500 text-white rounded-2xl transition-all shadow-lg shadow-rose-500/25"
              >
                <Square size={16} />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                type="submit"
                disabled={!input.trim()}
                aria-label={t.aiMentor.send}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 bg-indigo-600 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-30 disabled:shadow-none disabled:scale-100"
              >
                <Send size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
