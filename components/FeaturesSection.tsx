"use client";

import Link from 'next/link';
import { GraduationCap, MessageCircle, FileText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function FeaturesSection() {
    const { t } = useLanguage();

    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">{t.features.title}</h2>
                    <p className="text-slate-600">{t.features.subtitle}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Kart 1: Üniversiteler */}
                    <Link href="/universities" className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition duration-300 group">
                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition"><GraduationCap className="w-7 h-7 text-blue-600" /></div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{t.features.card1Title}</h3>
                        <p className="text-slate-600 leading-relaxed text-sm">{t.features.card1Desc}</p>
                    </Link>

                    {/* Kart 2: AI Mentor */}
                    <Link href="/ai-mentor" className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-orange-900/5 transition duration-300 group">
                        <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition"><MessageCircle className="w-7 h-7 text-orange-600" /></div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{t.features.card2Title}</h3>
                        <p className="text-slate-600 leading-relaxed text-sm">{t.features.card2Desc}</p>
                    </Link>

                    {/* Kart 3: Belge Cüzdanı */}
                    <Link href="/documents" className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-emerald-900/5 transition duration-300 group">
                        <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition"><FileText className="w-7 h-7 text-emerald-600" /></div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{t.features.card3Title}</h3>
                        <p className="text-slate-600 leading-relaxed text-sm">
                            {t.features.card3Desc}
                        </p>
                    </Link>
                </div>
            </div>
        </section>
    );
}
