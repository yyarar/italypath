"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function HeroSection() {
    const { t } = useLanguage();

    return (
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
    );
}
