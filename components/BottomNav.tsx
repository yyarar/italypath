"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, School, Bot, User, BookOpen } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Hangi sayfanın aktif olduğunu kontrol eden fonksiyon
  const isActive = (path: string) => pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 pb-safe">
      <div className="flex justify-around items-center h-16 pb-2">
        
        {/* Ana Sayfa */}
        <Link href="/" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/') ? 'text-blue-600' : 'text-slate-400'}`}>
          <Home className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Üniversiteler */}
        <Link href="/universities" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/universities') ? 'text-blue-600' : 'text-slate-400'}`}>
          <School className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Unis</span>
        </Link>

        {/* AI Mentor (Ortadaki Büyük Buton) */}
        <Link href="/ai-mentor" className="relative group -top-5">
           <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-50 transition-transform active:scale-95 ${isActive('/ai-mentor') ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
             <Bot className="w-7 h-7" />
           </div>
        </Link>

        {/* Sınavlar (Quiz) */}
        <Link href="/quiz" className={`flex flex-col items-center justify-center w-full h-full ${isActive('/quiz') ? 'text-blue-600' : 'text-slate-400'}`}>
          <BookOpen className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Quiz</span>
        </Link>

        {/* Profil (Clerk Sayfası yoksa direkt profile yönlendiririz ama şimdilik buton koyalım) */}
        {/* Not: Clerk UserButton mobilde zor olabilir, buraya temsili profil ikonu koyuyoruz */}
        <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 opacity-50 cursor-not-allowed">
          <User className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Profile</span>
        </div>

      </div>
    </div>
  );
}