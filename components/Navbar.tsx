"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Navbar() {
    const { t, toggleLanguage, language } = useLanguage();

    return (
        <nav aria-label="Ana Navigasyon" className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            ItalyPath
                        </span>
                    </div>

                    {/* MASAÜSTÜ MENÜSÜ */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/universities" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
                            {t.navbar.universities}
                        </Link>
                        <Link href="/ai-mentor" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
                            {t.navbar.mentor}
                        </Link>
                        <button onClick={toggleLanguage} aria-label={language === 'tr' ? 'Switch to English' : 'Türkçeye Geç'} className="flex items-center gap-1 text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition">
                            <Globe className="w-4 h-4" />
                            {language === 'tr' ? 'EN' : 'TR'}
                        </button>
                        <div className="flex items-center gap-4">
                            <SignedOut><SignInButton mode="modal"><span className="cursor-pointer bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">{t.navbar.login}</span></SignInButton></SignedOut>
                            <SignedIn><div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-600">{t.navbar.profile}</span><UserButton afterSignOutUrl="/" /></div></SignedIn>
                        </div>
                    </div>

                    {/* MOBİL NAVBUTONLARI */}
                    <div className="md:hidden flex items-center gap-3">
                        <button
                            onClick={toggleLanguage}
                            aria-label={language === 'tr' ? 'Switch to English' : 'Türkçeye Geç'}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-full"
                        >
                            <Globe className="w-3 h-3" />
                            {language === 'tr' ? 'EN' : 'TR'}
                        </button>

                        <SignedOut>
                            <SignInButton mode="modal">
                                <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-[11px] font-bold shadow-lg shadow-blue-600/20">
                                    {t.navbar.login}
                                </span>
                            </SignInButton>
                        </SignedOut>

                        <SignedIn>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                    </div>

                </div>
            </div>
        </nav>
    );
}
