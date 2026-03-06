"use client";

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { PulsatingButton } from '@/components/ui/pulsating-button';

export default function HeroSection() {
    const { t } = useLanguage();
    const router = useRouter();
    const shouldReduceMotion = useReducedMotion();
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
    const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });
    const gradientMask = useMotionTemplate`radial-gradient(320px circle at ${springX}px ${springY}px, rgba(99,102,241,0.08) 0%, transparent 80%)`;

    const sectionRef = useRef<HTMLElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = sectionRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.14, delayChildren: 0.1 }
        }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } }
    };

    return (
        <section
            ref={sectionRef}
            onMouseMove={shouldReduceMotion ? undefined : handleMouseMove}
            className="relative pt-28 pb-20 lg:pt-44 lg:pb-36 overflow-hidden bg-[#fafbff]"
        >
            {/* Gradient background */}
            <div className="absolute inset-0 z-0" style={{ background: 'var(--gradient-hero)' }} />

            {/* Mouse-follow gradient */}
            {!shouldReduceMotion && (
                <motion.div className="absolute inset-0 z-0 pointer-events-none" style={{ background: gradientMask }} />
            )}

            {/* Animated blobs */}
            <div
                className={`${shouldReduceMotion ? '' : 'blob'} absolute top-1/4 left-[10%] w-72 h-72 rounded-full opacity-30 pointer-events-none`}
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', ['--blob-duration' as string]: '10s', ['--blob-delay' as string]: '0s' }}
            />
            <div
                className={`${shouldReduceMotion ? '' : 'blob'} absolute bottom-1/4 right-[8%] w-96 h-96 rounded-full opacity-20 pointer-events-none`}
                style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)', ['--blob-duration' as string]: '14s', ['--blob-delay' as string]: '-4s' }}
            />
            <div
                className={`${shouldReduceMotion ? '' : 'blob'} absolute top-1/3 right-[25%] w-48 h-48 rounded-full opacity-20 pointer-events-none`}
                style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)', ['--blob-duration' as string]: '12s', ['--blob-delay' as string]: '-2s' }}
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
            >
                {/* Badge */}
                <motion.div variants={itemVariants} className="flex justify-center mb-8">
                    <div className="inline-flex items-center px-4 py-2 rounded-full glass border border-indigo-100/60 text-indigo-700 text-sm font-semibold shadow-sm">
                        <span className="relative flex items-center mr-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            {!shouldReduceMotion && (
                                <span className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping opacity-60" />
                            )}
                        </span>
                        <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                        {t.hero.badge}
                    </div>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    variants={itemVariants}
                    className="text-6xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-tighter text-slate-900 mb-6 leading-[0.95]"
                >
                    {t.hero.titleStart}{' '}
                    <span className="gradient-text" style={{ backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)' }}>
                        {t.hero.titleHighlight}
                    </span>
                    <br />
                    <span className="gradient-text" style={{ backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fb923c 60%, #fdba74 100%)' }}>
                        {t.hero.titleEnd}
                    </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    variants={itemVariants}
                    className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
                >
                    {t.hero.subtitle}
                </motion.p>

                {/* Stats row */}
                <motion.div variants={itemVariants} className="flex items-center justify-center gap-6 mb-10">
                    {[
                        { value: '62', label: 'Üniversite' },
                        { value: '262', label: 'Bölüm' },
                        { value: 'AI', label: 'Destekli' },
                    ].map((stat, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <span className="text-xl font-black text-slate-800">{stat.value}</span>
                            <span className="text-sm text-slate-400 font-medium">{stat.label}</span>
                            {i < 2 && <div className="w-px h-4 bg-slate-200 ml-2" />}
                        </div>
                    ))}
                </motion.div>

                {/* CTA Button with pulsating effect */}
                <motion.div variants={itemVariants} className="flex justify-center">
                    <motion.div
                        whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                        <PulsatingButton
                            type="button"
                            onClick={() => router.push('/universities')}
                            duration="2.4s"
                            pulseColor="rgba(99,102,241,0.35)"
                            className="bg-indigo-600 text-white rounded-[14px] px-10 py-4 font-bold text-lg shadow-2xl shadow-indigo-600/30"
                            aria-label={t.hero.btnPrimary}
                        >
                            {t.hero.btnPrimary}
                            <motion.span
                                className="ml-2 flex items-center"
                                initial={{ x: 0 }}
                                whileHover={shouldReduceMotion ? undefined : { x: 3 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            >
                                <ArrowRight className="w-5 h-5" />
                            </motion.span>
                        </PulsatingButton>
                    </motion.div>
                </motion.div>

                {/* Social proof footnote */}
                <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mt-6">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-xs text-slate-400 font-medium">Ücretsiz · Kayıt Gerektirmez · Anında Başla</p>
                </motion.div>
            </motion.div>
        </section>
    );
}
