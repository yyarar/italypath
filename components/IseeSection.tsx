"use client";

import Link from 'next/link';
import { Calculator, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function IseeSection() {
    const { t } = useLanguage();

    return (
        <section className="py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 md:p-16 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                        <div className="text-center lg:text-left max-w-2xl">
                            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-xs font-bold mb-6 backdrop-blur-md">
                                <Calculator className="w-4 h-4 mr-2" />
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
    );
}
