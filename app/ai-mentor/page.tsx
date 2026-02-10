"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ArrowLeft, Sparkles, Zap, Lock } from 'lucide-react'; // Lock ikonu eklendi
import Link from 'next/link';
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs"; // Clerk kütüphanesi eklendi

export default function AIMentorPage() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Ciao! 🇮🇹 Ben ItalyPath Asistanı. \nSana veri tabanımdaki 45 üniversite ve yüzlerce bölüm hakkında yardımcı olabilirim.\n\nÖrnek: "Hangi okullarda Tıp var?" veya "En ucuz okul hangisi?"' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 👇 Hızlı Soru Baloncukları Listesi
  const suggestionChips = [
    "💰 En ucuz okullar hangileri?",
    "🏥 Tıp fakültesi olan yerler",
    "🎨 Mimarlık bölümleri",
    "🇮🇹 İtalya'da yaşam maliyeti",
    "🎓 Burs imkanları neler?",
    "🏛️ Bologna Üniversitesi hakkında bilgi",
    "🍝 Öğrenci hayatı nasıl?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const messageToSend = textOverride || input;

    if (!messageToSend.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setInput(''); 
    setIsTyping(true);

    const currentHistory = messages.slice(1);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: messageToSend, 
            history: currentHistory 
        }),
      });

      const data = await response.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: "Bağlantıda küçük bir sorun oldu." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "Bir hata oluştu. (API Bağlantısını kontrol et)" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* 🛑 DUR YOLCU: Giriş Yapmamışsa Burası Görünür */}
      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-red-500" />
           </div>
           <h1 className="text-2xl font-bold text-slate-900 mb-2">Bu Alan Sadece Üyelere Özel</h1>
           <p className="text-slate-600 mb-6 max-w-md">
             Yapay zeka mentorumuz ile konuşmak ve üniversite tavsiyeleri almak için lütfen ücretsiz giriş yapın.
           </p>
           {/* Clerk otomatik yönlendirir ama buton da koyduk */}
           <RedirectToSignIn /> 
        </div>
      </SignedOut>

      {/* ✅ GİRİŞ YAPMIŞSA: Senin Tasarımın Görünür */}
      <SignedIn>
        <div className="flex flex-col h-screen bg-slate-50">
          
          {/* HEADER */}
          <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center shadow-sm sticky top-0 z-10">
            <Link href="/" className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-full transition">
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0">
                <Sparkles className="w-5 h-5" />
            </div>
            <div className="ml-3">
                <h1 className="font-bold text-slate-800 text-lg leading-tight">ItalyPath Mentor</h1>
                <p className="text-xs text-slate-500 font-medium flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                    Online
                </p>
            </div>
          </header>

          {/* CHAT ALANI */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
            {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[90%] sm:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        
                        {/* AVATAR */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${
                            msg.role === 'user' ? 'bg-slate-800 ml-3' : 'bg-white border border-slate-200 mr-3'
                        }`}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-blue-600" />}
                        </div>

                        {/* BALONCUK */}
                        <div className={`p-4 rounded-2xl shadow-sm text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user' 
                            ? 'bg-slate-800 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                </div>
            ))}
            
            {/* YAZIYOR ANİMASYONU */}
            {isTyping && (
                <div className="flex justify-start items-center ml-14 mt-2">
                    <div className="flex space-x-1.5">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-slate-400 ml-2">Yazıyor...</span>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT ALANI VE CHIPS */}
          <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0">
            <div className="max-w-3xl mx-auto relative">
                
                {/* 👇 Hızlı Soru Butonları */}
                <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar mask-gradient">
                    <div className="flex items-center text-xs font-bold text-slate-400 mr-2 flex-shrink-0">
                        <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                        Hızlı Sor:
                    </div>
                    {suggestionChips.map((chip, index) => (
                        <button
                            key={index}
                            onClick={() => handleSend(chip)}
                            disabled={isTyping}
                            className="whitespace-nowrap bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-full text-xs font-semibold transition border border-slate-200 flex-shrink-0 active:scale-95"
                        >
                            {chip}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div className="relative flex items-center">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Aklına geleni sor..." 
                        className="w-full pl-6 pr-14 py-4 rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition shadow-sm text-slate-800"
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}