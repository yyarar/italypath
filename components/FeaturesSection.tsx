"use client";

import Link from 'next/link';
import { GraduationCap, MessageCircle, FileText, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import { useLanguage } from '@/context/LanguageContext';
import Marquee from '@/components/ui/marquee';
import BorderBeam from '@/components/ui/border-beam';
import AnimatedList, { type AnimatedListItemData } from '@/components/ui/animated-list';

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

function UniversitiesCardBackground({
    items,
    reduceMotion,
}: {
    items: string[];
    reduceMotion: boolean;
}) {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/45 via-white/0 to-blue-100/35" />

            <div className="absolute inset-x-0 top-7 opacity-20 mask-fade-horizontal">
                <Marquee duration={reduceMotion ? 60 : 34}>
                    {items.map((label, index) => (
                        <span
                            key={`marquee-top-${index}`}
                            className="rounded-full border border-indigo-200/60 bg-white/70 px-3 py-1 text-[10px] font-semibold text-indigo-500 shadow-sm"
                        >
                            {label}
                        </span>
                    ))}
                </Marquee>
            </div>

            <div className="absolute inset-x-0 top-[4.5rem] opacity-[0.16] mask-fade-horizontal">
                <Marquee reverse duration={reduceMotion ? 56 : 30}>
                    {items.map((label, index) => (
                        <span
                            key={`marquee-bottom-${index}`}
                            className="rounded-full border border-blue-200/60 bg-white/65 px-3 py-1 text-[10px] font-semibold text-blue-500 shadow-sm"
                        >
                            {label}
                        </span>
                    ))}
                </Marquee>
            </div>
        </div>
    );
}

function DocumentsCardBackground({ items }: { items: AnimatedListItemData[] }) {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/45 via-white/0 to-teal-100/35" />
            <div className="absolute inset-x-5 top-5 opacity-20 mask-fade-vertical">
                <AnimatedList
                    items={items}
                    intervalMs={2400}
                    visibleCount={3}
                    itemClassName="border-emerald-100/70 bg-white/80"
                />
            </div>
        </div>
    );
}

function MentorCardBackground() {
    return (
        <>
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100/45 via-white/0 to-orange-100/35" />
                <div className="absolute -left-8 top-3 h-20 w-32 rounded-full bg-orange-200/40 blur-2xl" />
                <div className="absolute -right-8 bottom-4 h-20 w-36 rounded-full bg-amber-200/35 blur-2xl" />
                <div className="absolute inset-y-0 left-6 w-px bg-gradient-to-b from-transparent via-orange-300/35 to-transparent animate-soft-fade-up [--duration:7s]" />
                <div className="absolute inset-y-0 right-9 w-px bg-gradient-to-b from-transparent via-amber-300/30 to-transparent animate-soft-fade-up [--duration:8.2s] [animation-delay:1.1s]" />
            </div>
            <BorderBeam
                className="z-[3]"
                duration={8}
                size={100}
                anchor={24}
                borderWidth={1.5}
                colorFrom="#fb923c"
                colorTo="#f97316"
            />
        </>
    );
}

export default function FeaturesSection() {
    const { t } = useLanguage();
    const { isSignedIn } = useAuth();
    const shouldReduceMotion = useReducedMotion() ?? false;
    const aiMentorHref = isSignedIn
        ? '/ai-mentor'
        : '/sign-in?redirect_url=%2Fai-mentor';
    const documentsHref = isSignedIn
        ? '/documents'
        : '/sign-in?redirect_url=%2Fdocuments';
    const docListItems: AnimatedListItemData[] = t.featureAnimations.docList.map((item, index) => ({
        id: `doc-${index}`,
        title: item.title,
        subtitle: item.subtitle,
    }));

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
            background: <UniversitiesCardBackground items={t.featureAnimations.marquee} reduceMotion={shouldReduceMotion} />,
        },
        {
            href: aiMentorHref,
            icon: MessageCircle,
            color: 'from-orange-500 to-amber-500',
            bg: 'hover:bg-orange-50/50',
            titleKey: 'card2Title' as const,
            descKey: 'card2Desc' as const,
            accent: 'text-orange-600',
            iconBg: 'bg-orange-100',
            span: 'lg:col-span-1',
            background: <MentorCardBackground />,
        },
        {
            href: documentsHref,
            icon: FileText,
            color: 'from-emerald-500 to-teal-600',
            bg: 'hover:bg-emerald-50/50',
            titleKey: 'card3Title' as const,
            descKey: 'card3Desc' as const,
            accent: 'text-emerald-600',
            iconBg: 'bg-emerald-100',
            span: 'md:col-span-2 lg:col-span-3',
            background: <DocumentsCardBackground items={docListItems} />,
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
                                    {card.background}

                                    {/* Soft mask for premium readability */}
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/72 via-white/58 to-white/84"
                                    />

                                    <div className="relative z-10 flex h-full flex-col">
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
