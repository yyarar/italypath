"use client";

import Link from 'next/link';
import { Calculator, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

export default function IseeSection() {
    const { t } = useLanguage();

    return (
        <section className="bg-slate-50/80 pb-20 pt-0 lg:pb-28 lg:pt-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="relative rounded-[2.5rem] overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 40%, #6366f1 70%, #38bdf8 100%)',
                    }}
                >
                    {/* Decorative blobs */}
                    <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-32 h-32 rounded-full bg-violet-400/20 blur-xl pointer-events-none" />

                    {/* Subtle noise texture overlay */}
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }}
                    />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 p-10 md:p-16">
                        <div className="text-center lg:text-left max-w-2xl">
                            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold mb-6 border border-white/10">
                                <Calculator className="w-3.5 h-3.5 mr-2" />
                                {t.isee.homeCardBadge}
                            </div>
                            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter text-white mb-6 leading-tight">
                                {t.isee.homeCardTitle}
                            </h2>
                            <p className="text-blue-100 text-lg md:text-xl opacity-90 leading-relaxed">
                                {t.isee.homeCardDesc}
                            </p>

                            <div className="flex items-center gap-2 mt-6 justify-center lg:justify-start">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                                <span className="text-white/70 text-xs font-medium">Formül: İtalya DSS standartlarına göre</span>
                            </div>
                        </div>

                        <Link href="/isee">
                            <motion.div
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className="group bg-white/95 backdrop-blur-md text-indigo-700 px-10 py-5 rounded-2xl font-black text-xl hover:bg-white transition-all shadow-2xl shadow-indigo-900/30 whitespace-nowrap flex items-center border border-white/50"
                            >
                                {t.isee.homeCardBtn}
                                <motion.span
                                    className="ml-2"
                                    initial={{ x: 0 }}
                                    whileHover={{ x: 3 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                >
                                    <ArrowRight className="w-6 h-6" />
                                </motion.span>
                            </motion.div>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
