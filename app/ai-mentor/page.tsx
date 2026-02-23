"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, ArrowLeft, RefreshCcw, Sparkles, Square } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Ciao! ItalyPath Mentor hazır. İtalya hayalini gerçekleştirmek için neyi çözmemi istersin?",
};

export default function AIMentorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Yeni mesaj / stream chunk geldiğinde aşağı kaydır
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isStreaming) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: input.trim(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setIsStreaming(true);

      // Boş asistan mesajı oluştur (streaming ile doldurulacak)
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("API hatası");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("Stream okunamadı");

        // Chunk chunk oku ve asistan mesajını güncelle
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + text } : m
            )
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // Kullanıcı durdurdu — son mesajı olduğu gibi bırak
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || "Scusa! Bir hata oluştu. Tekrar dener misin?" }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [input, isStreaming, messages]
  );

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([WELCOME_MESSAGE]);
    setIsStreaming(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#FDFCFB] text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="p-4 border-b bg-white flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Ana sayfaya dön">
            <ArrowLeft className="w-6 h-6 text-slate-400 hover:text-slate-600 transition" />
          </Link>
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 via-white to-red-600 rounded-full flex items-center justify-center border">
            <Bot className="text-slate-700 w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-800">ItalyPath Mentor</h1>
            {isStreaming && (
              <p className="text-[10px] text-indigo-500 font-semibold animate-pulse">
                Yazıyor...
              </p>
            )}
          </div>
        </div>
        <button onClick={handleReset} title="Sohbeti sıfırla" aria-label="Sohbeti sıfırla">
          <RefreshCcw className="w-5 h-5 text-slate-300 hover:text-slate-500 transition" />
        </button>
      </header>

      {/* Chat Alanı */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
        <AnimatePresence mode="popLayout">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${m.role === "user" ? "bg-slate-900" : "bg-white"
                    }`}
                >
                  {m.role === "user" ? (
                    <User size={14} className="text-white" />
                  ) : (
                    <Sparkles size={14} className="text-indigo-500" />
                  )}
                </div>

                {/* Mesaj Balonu */}
                <div
                  className={`p-4 rounded-[20px] shadow-sm ${m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-white border text-slate-800"
                    }`}
                >
                  {m.content ? (
                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    /* Stream henüz başlamadıysa yazıyor animasyonu */
                    <div className="flex gap-1.5 items-center h-5">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={scrollRef} className="h-4" />
      </div>

      {/* Input Alanı */}
      <div className="p-4 pb-8 bg-white border-t">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-center">
          <input
            type="text"
            className="w-full p-4 pr-14 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder={
              isStreaming ? "Mentor yanıt yazıyor..." : "İtalya hakkında bir şeyler sor..."
            }
            autoComplete="off"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              aria-label="Yanıtı durdur"
              className="absolute right-2 p-2.5 bg-red-500 text-white rounded-xl active:scale-95 transition-all"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Mesaj gönder"
              className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl active:scale-95 transition-all disabled:opacity-30"
            >
              <Send size={18} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}