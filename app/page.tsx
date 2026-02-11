"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import React from 'react'; 
import Link from 'next/link';
// Calculator ikonu eklendi 🚀
import { GraduationCap, MessageCircle, ArrowRight, Globe, Calculator } from 'lucide-react'; 
import { useLanguage } from '@/context/LanguageContext';

export default function Home() {
  const { t, toggleLanguage, language } = useLanguage();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* Navbar - Mevcut kodunla aynı */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ItalyPath
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/universities" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
                {t.navbar.universities}
              </Link>
              <Link href="/ai-mentor" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
                {t.navbar.mentor}
              </Link>
              <button onClick={toggleLanguage} className="flex items-center gap-1 text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition">
                <Globe className="w-4 h-4" />
                {language === 'tr' ? 'EN' : 'TR'}
              </button>
              <div className="flex items-center gap-4">
                <SignedOut><SignInButton mode="modal"><span className="cursor-pointer bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">{t.navbar.login}</span></SignInButton></SignedOut>
                <SignedIn><div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-600">{t.navbar.profile}</span><UserButton afterSignOutUrl="/" /></div></SignedIn>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Mevcut kodunla aynı */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0"><div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 to-orange-50/90 z-10" /></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8 animate-fade-in-up">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>{t.hero.badge}
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-8">
            {t.hero.titleStart} <span className="text-blue-600">{t.hero.titleHighlight}</span> <br /><span className="text-orange-500">{t.hero.titleEnd}</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">{t.hero.subtitle}</p>
          <div className="flex justify-center items-center">
            <Link href="/universities" className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-600/20 flex items-center justify-center">
              {t.hero.btnPrimary}<ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Özellikler Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{t.features.title}</h2>
            <p className="text-slate-600">{t.features.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition duration-300 group">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition"><GraduationCap className="w-7 h-7 text-blue-600" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t.features.card1Title}</h3>
              <p className="text-slate-600 leading-relaxed">{t.features.card1Desc}</p>
            </div>
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-orange-900/5 transition duration-300 group">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition"><MessageCircle className="w-7 h-7 text-orange-600" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t.features.card2Title}</h3>
              <p className="text-slate-600 leading-relaxed">{t.features.card2Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ISEE HESAPLAYICI BÖLÜMÜ (YENİ) 🚀 */}
      {/* ISEE HESAPLAYICI BÖLÜMÜ (YENİ) 🚀 */}
<section className="py-24 bg-slate-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 md:p-16 shadow-2xl relative overflow-hidden">
      {/* Arkaplan Süsü */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="text-center lg:text-left max-w-2xl">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-xs font-bold mb-6 backdrop-blur-md">
            <Calculator className="w-4 h-4 mr-2" />
            {/* Hardcoded metin yerine çeviri anahtarı 🚀 */}
            {t.isee.homeCardBadge}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {t.isee.homeCardTitle}
          </h2>
          <p className="text-blue-100 text-lg md:text-xl opacity-90 leading-relaxed">
            {t.isee.homeCardDesc}
          </p>
        </div>

        <Link 
          href="/isee" 
          className="group bg-white text-blue-700 px-10 py-5 rounded-2xl font-black text-xl hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl whitespace-nowrap flex items-center"
        >
          {t.isee.homeCardBtn}
          <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform" />
        </Link>
      </div>
    </div>
  </div>
</section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="text-xl font-bold text-slate-900">ItalyPath</span>
            <p className="text-sm text-slate-500 mt-1">© 2026 All rights reserved.</p>
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