"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, ArrowLeft, RefreshCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

export default function AIMentorPage() {
  // Saf React State - En garantisi budur
  const [messages, setMessages] = useState<any[]>([
    { 
      id: "1", 
      role: "assistant", 
      content: "Ciao! ItalyPath Mentor hazır. İtalya hayalini gerçekleştirmek için neyi çözmemi istersin?" 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Yeni mesaj geldiğinde otomatik aşağı kaydır
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    
    const currentInput = input;
    setInput(""); // Yazı kutusunu anında temizler, böylece 'read-only' kilidi kırılır
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      
      const data = await res.json();
      
      setMessages((prev) => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: data.content 
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: "err", role: "assistant", content: "Scusa! Bir hata oluştu patron." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#FDFCFB] text-slate-900 overflow-hidden">
      {/* Header Kısmı */}
      <header className="p-4 border-b bg-white flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/"><ArrowLeft className="w-6 h-6 text-slate-400" /></Link>
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 via-white to-red-600 rounded-full flex items-center justify-center border">
            <Bot className="text-slate-700 w-5 h-5" />
          </div>
          <h1 className="font-bold text-sm text-slate-800">ItalyPath Mentor</h1>
        </div>
        <button onClick={() => setMessages([messages[0]])}><RefreshCcw className="w-5 h-5 text-slate-300" /></button>
      </header>
      
      {/* Chat Alanı */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
        <AnimatePresence mode="popLayout">
          {messages.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${m.role === "user" ? "bg-slate-900" : "bg-white"}`}>
                  {m.role === "user" ? <User size={14} className="text-white" /> : <Sparkles size={14} className="text-indigo-500" />}
                </div>
                {/* Mesaj Balonu */}
                <div className={`p-4 rounded-[20px] shadow-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-white border text-slate-800"}`}>
                  {/* ÇÖZÜM: ReactMarkdown içinden className'i aldık, saran div'e verdik */}
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && <div className="text-[10px] text-slate-400 animate-pulse ml-12 uppercase font-bold tracking-widest">Mentor düşünüyor...</div>}
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
            disabled={loading}
            placeholder={loading ? "Lütfen bekle..." : "İtalya hakkında bir şeyler sor..."}
            autoComplete="off"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || loading} 
            className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl active:scale-95 transition-all disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}