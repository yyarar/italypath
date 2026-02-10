"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import React from 'react'; // useState sildik çünkü hamburger menü gitti
import Link from 'next/link';
import { GraduationCap, BookOpen, MessageCircle, ArrowRight, Globe } from 'lucide-react'; // Menu ve X ikonlarını sildik
import { useLanguage } from '@/context/LanguageContext';

export default function Home() {
  // isMobileMenuOpen STATE'ini SİLDİK. Artık gerek yok.
  
  const { t, toggleLanguage, language } = useLanguage();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ItalyPath
              </span>
            </div>

            {/* MASAÜSTÜ MENÜSÜ (Hidden md:flex - Sadece PC'de görünür) */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/universities" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
                {t.navbar.universities}
              </Link>
              <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
                {t.navbar.exams}
              </a>
              <Link href="/ai-mentor" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
                {t.navbar.mentor}
              </Link>
              
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1 text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition"
              >
                <Globe className="w-4 h-4" />
                {language === 'tr' ? 'EN' : 'TR'}
              </button>

              <div className="flex items-center gap-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <span className="cursor-pointer bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">
                      {t.navbar.login}
                    </span>
                  </SignInButton>
                </SignedOut>

                <SignedIn>
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-medium text-slate-600">{t.navbar.profile}</span>
                     <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
              </div>
            </div>

            {/* MOBİL GÖRÜNÜM (Sadece Dil Butonu ve Profil - Hamburger YOK) */}
            <div className="md:hidden flex items-center gap-3">
              <button 
                onClick={toggleLanguage}
                className="font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition text-xs flex items-center gap-1"
              >
                <Globe className="w-3 h-3" />
                {language === 'tr' ? 'EN' : 'TR'}
              </button>
              
              {/* Mobilde sağ üstte sadece giriş yapmışsa profil resmi görünsün */}
              <SignedIn>
                 <UserButton afterSignOutUrl="/" />
              </SignedIn>
               {/* Giriş yapmamışsa zaten aşağıda login var veya yönlendiriyoruz */}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* ... (Geri kalan kodlar aynı, dokunmana gerek yok) ... */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 to-orange-50/90 z-10" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8 animate-fade-in-up">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
            {t.hero.badge}
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-8">
            {t.hero.titleStart} <span className="text-blue-600">{t.hero.titleHighlight}</span> <br />
            <span className="text-orange-500">{t.hero.titleEnd}</span>
          </h1>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.hero.subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/universities" className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-600/20 flex items-center justify-center">
              {t.hero.btnPrimary}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link href="/quiz" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border-2 border-slate-100 rounded-xl font-bold text-lg hover:border-blue-200 hover:text-blue-600 transition flex items-center justify-center shadow-lg hover:shadow-xl">
              {t.hero.btnSecondary}
              <BookOpen className="ml-2 w-5 h-5 text-blue-600" />
            </Link>
          </div>
        </div>
      </section>

      {/* Özellikler Grid (Aynı) */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{t.features.title}</h2>
            <p className="text-slate-600">{t.features.subtitle}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition duration-300 group">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <GraduationCap className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t.features.card1Title}</h3>
              <p className="text-slate-600 leading-relaxed">
                {t.features.card1Desc}
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-orange-900/5 transition duration-300 group">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <MessageCircle className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t.features.card2Title}</h3>
              <p className="text-slate-600 leading-relaxed">
                {t.features.card2Desc}
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-indigo-900/5 transition duration-300 group">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <BookOpen className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t.features.card3Title}</h3>
              <p className="text-slate-600 leading-relaxed">
                {t.features.card3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (Aynı) */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="text-xl font-bold text-slate-900">ItalyPath</span>
            <p className="text-sm text-slate-500 mt-1">© 2024 All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-slate-400 hover:text-blue-600 transition">Twitter</a>
            <a href="#" className="text-slate-400 hover:text-blue-600 transition">Instagram</a>
            <a href="#" className="text-slate-400 hover:text-blue-600 transition">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}