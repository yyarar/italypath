"use client";

import { useState } from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

export default function Navbar() {
    const { t, toggleLanguage, language } = useLanguage();
    const [scrolled, setScrolled] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setScrolled(latest > 20);
    });

    return (
        <motion.nav
            aria-label="Ana Navigasyon"
            className="fixed w-full z-50 transition-all duration-300"
            style={{
                background: scrolled ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.60)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: scrolled ? '1px solid rgba(226,232,240,0.8)' : '1px solid rgba(226,232,240,0.3)',
                boxShadow: scrolled ? '0 2px 24px rgba(0,0,0,0.06)' : 'none',
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center">
                        <span className="text-xl font-black tracking-tight gradient-text"
                            style={{ backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)' }}
                        >
                            ItalyPath
                        </span>
                    </Link>

                    {/* Desktop menu */}
                    <div className="hidden md:flex items-center space-x-1">
                        {[
                            { href: '/universities', label: t.navbar.universities },
                            { href: '/ai-mentor', label: t.navbar.mentor },
                        ].map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 transition-all duration-200"
                            >
                                {item.label}
                            </Link>
                        ))}

                        <div className="w-px h-5 bg-slate-200 mx-2" />

                        <button
                            onClick={toggleLanguage}
                            aria-label={language === 'tr' ? 'Switch to English' : 'Türkçeye Geç'}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-all duration-200"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            {language === 'tr' ? 'EN' : 'TR'}
                        </button>

                        <SignedOut>
                            <SignInButton mode="modal">
                                <motion.span
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className="cursor-pointer ml-1 bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 inline-block"
                                >
                                    {t.navbar.login}
                                </motion.span>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <div className="flex items-center gap-2 ml-1">
                                <span className="text-sm font-medium text-slate-500">{t.navbar.profile}</span>
                                <UserButton afterSignOutUrl="/" />
                            </div>
                        </SignedIn>
                    </div>

                    {/* Mobile nav buttons */}
                    <div className="md:hidden flex items-center gap-2">
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
                                <span className="bg-indigo-600 text-white px-4 py-2 rounded-full text-[11px] font-bold shadow-lg shadow-indigo-600/20">
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
        </motion.nav>
    );
}
