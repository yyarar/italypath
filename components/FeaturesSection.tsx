"use client";

import Link from 'next/link';
import { GraduationCap, MessageCircle, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';



const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.12, delayChildren: 0.1 }
    }
};
const itemVariants = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } }
};

export default function FeaturesSection() {
    const { t } = useLanguage();

    const displayCards = [
        {
            href: '/universities',
            icon: GraduationCap,
            color: 'from-indigo-500 to-blue-600',
            bg: 'hover:bg-indigo-50/50',
            titleKey: 'card1Title' as const,
            descKey: 'card1Desc' as const,
            accent: 'text-indigo-600',
            iconBg: 'bg-indigo-100',
            span: 'md:col-span-2 lg:col-span-2',
        },
        {
            href: '/ai-mentor',
            icon: MessageCircle,
            color: 'from-orange-500 to-amber-500',
            bg: 'hover:bg-orange-50/50',
            titleKey: 'card2Title' as const,
            descKey: 'card2Desc' as const,
            accent: 'text-orange-600',
            iconBg: 'bg-orange-100',
            span: 'lg:col-span-1',
        },
        {
            href: '/documents',
            icon: FileText,
            color: 'from-emerald-500 to-teal-600',
            bg: 'hover:bg-emerald-50/50',
            titleKey: 'card3Title' as const,
            descKey: 'card3Desc' as const,
            accent: 'text-emerald-600',
            iconBg: 'bg-emerald-100',
            span: 'md:col-span-2 lg:col-span-3',
        },
    ];

    return (
        <section className="py-20 lg:py-28 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="text-center mb-14"
                >
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400 mb-4">Özellikler</p>
                    <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-slate-900 mb-4 leading-tight">
                        {t.features.title}
                    </h2>
                    <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">{t.features.subtitle}</p>
                </motion.div>

                {/* Bento grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-50px" }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                    {displayCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <motion.div key={card.href} variants={itemVariants} className={card.span}>
                                <Link
                                    href={card.href}
                                    className={`group relative flex flex-col h-full p-8 rounded-3xl bg-slate-50 border border-slate-100/80 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 overflow-hidden ${card.bg}`}
                                >
                                    {/* Background decoration */}
                                    <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.04] pointer-events-none"
                                        style={{ background: `radial-gradient(circle, currentColor 0%, transparent 70%)` }}
                                    />

                                    {/* Icon */}
                                    <motion.div
                                        whileHover={{ scale: 1.1, rotate: 3 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        className={`w-14 h-14 ${card.iconBg} rounded-2xl flex items-center justify-center mb-6 shadow-sm`}
                                    >
                                        <Icon className={`w-7 h-7 ${card.accent}`} />
                                    </motion.div>

                                    {/* Content */}
                                    <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-slate-700 transition-colors">
                                        {t.features[card.titleKey]}
                                    </h3>
                                    <p className="text-slate-500 leading-relaxed text-sm flex-1">
                                        {t.features[card.descKey]}
                                    </p>

                                    {/* Arrow */}
                                    <div className="flex items-center mt-6 gap-1">
                                        <span className={`text-xs font-bold ${card.accent} opacity-0 group-hover:opacity-100 transition-all`}>
                                            Keşfet
                                        </span>
                                        <motion.div
                                            className={`${card.accent} opacity-0 group-hover:opacity-100`}
                                            initial={{ x: 0 }}
                                            whileHover={{ x: 3 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                        >
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </motion.div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
