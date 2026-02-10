"use client";

import React, { useRef, useEffect } from "react";
import { Send, Bot, User, ArrowLeft, Sparkles, Zap, Lock, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

const WELCOME_MESSAGE = `Ciao! 🇮🇹 Ben ItalyPath Asistanı.  
İtalya'da eğitim hayalini gerçeğe dönüştürmek için buradayım.  

Sana şunlarda yardımcı olabilirim:  
* 🎓 **Üniversite Seçimi**
* 💰 **Burslar**
* 🏛️ **Vize Süreçleri**`;

const suggestionChips = [
  "💰 Burs imkanları neler?",
  "🏥 Tıp fakülteleri",
  "🎨 Mimarlık",
  "🇮🇹 Yaşam maliyeti",
];

export default function AIMentorPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Hataları engellemek için destructing işlemini en güvenli hale getirdik
  const chat = useChat({
    messages: [
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
      } as any,
    ],
  });

  // Chat objesinden güvenli çekim (Hataları burada engelliyoruz)
  const { messages, input, handleInputChange, handleSubmit, setInput, isLoading, reload } = chat as any;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSuggestionClick = (text: string) => {
    setInput(text);
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
      handleSubmit(fakeEvent);
    }, 50);
  };

  return (
    <>
      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCFB] p-4 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100">
            <Lock className="w-10 h-10 text-red-500" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3 italic">Benvenuto!</h1>
          <p className="text-slate-500 mb-8 max-w-sm leading-relaxed">Giriş yapmanız gerekiyor.</p>
          <RedirectToSignIn />
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex flex-col h-[100dvh] bg-[#FDFCFB] text-slate-900 overflow-hidden">
          <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 via-white to-red-600 rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                  <Bot className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h1 className="font-bold text-base text-slate-800 leading-none">ItalyPath Mentor</h1>
                  <span className="text-[10px] uppercase font-bold text-slate-400 italic">Premium AI</span>
                </div>
              </div>
            </div>
            {messages?.length > 1 && (
              <button onClick={() => reload()} className="p-2 text-slate-400 hover:text-indigo-600">
                <RefreshCcw className="w-5 h-5" />
              </button>
            )}
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 no-scrollbar">
            <AnimatePresence mode="popLayout">
              {messages?.map((msg: any) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} gap-3`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 border shadow-sm ${
                      msg.role === "user" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    }`}>
                      {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-indigo-500" />}
                    </div>
                    <div className={`p-4 rounded-[20px] text-sm md:text-base ${
                      msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm"
                    }`}>
                      <div className="prose prose-slate max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100">
            <div className="max-w-3xl mx-auto space-y-4">
              {!isLoading && (messages?.length || 0) < 3 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {suggestionChips.map((chip, i) => (
                    <button key={i} onClick={() => onSuggestionClick(chip)}
                      className="whitespace-nowrap bg-white border border-slate-200 px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:border-indigo-400 transition-all">
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit} className="relative flex items-center">
                <input type="text" value={input} onChange={handleInputChange} placeholder="Sorunu yaz..."
                  className="w-full pl-6 pr-14 py-4 rounded-[24px] border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 transition-all shadow-sm" />
                <button type="submit" disabled={!input?.trim() || isLoading}
                  className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-full disabled:opacity-30 shadow-md">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}