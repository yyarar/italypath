"use client";

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ArrowLeft, Globe, GraduationCap, Banknote, BookOpen, Sparkles, ArrowRight, Building2, ExternalLink, Languages, Clock3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import { useLanguage } from '@/context/LanguageContext';
import ScrollProgress from '@/components/ScrollProgress';
import { useUniversitiesData } from '@/lib/useUniversitiesData';

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80";

export default function DepartmentDetailPage() {
    const params = useParams();
    const { isSignedIn } = useAuth();
    const { t, language } = useLanguage();
    const { universities, loading: universitiesLoading, error: universitiesError } = useUniversitiesData();
    const aiMentorHref = isSignedIn
        ? '/ai-mentor'
        : '/sign-in?redirect_url=%2Fai-mentor';

    const idFromUrl = Array.isArray(params?.id) ? params?.id[0] : params?.id;
    const deptSlugFromUrl = Array.isArray(params?.deptSlug) ? params?.deptSlug[0] : params?.deptSlug;

    const university = useMemo(() => {
        return universities.find((u) => String(u.id) === String(idFromUrl));
    }, [idFromUrl, universities]);

    const department = useMemo(() => {
        return university?.departments.find((d) => d.slug === deptSlugFromUrl);
    }, [university, deptSlugFromUrl]);

    const otherDepts = useMemo(() => {
        return university?.departments.filter((d) => d.slug !== deptSlugFromUrl) || [];
    }, [university, deptSlugFromUrl]);

    if (universitiesLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <p className="text-sm text-slate-500">Yükleniyor...</p>
            </div>
        );
    }

    if (universitiesError) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <p className="text-sm text-slate-500">Üniversite verisi yüklenemedi.</p>
            </div>
        );
    }

    if (!university || !department) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <GraduationCap className="w-16 h-16 text-slate-200 mb-4" />
                <h1 className="text-3xl font-bold text-slate-800 mb-4">
                    {language === 'tr' ? 'Bölüm Bulunamadı 😕' : 'Program Not Found 😕'}
                </h1>
                <Link href="/universities" className="text-blue-600 hover:underline font-medium">
                    {language === 'tr' ? 'Üniversitelere Dön' : 'Back to Universities'}
                </Link>
            </div>
        );
    }

    const description = (language === 'en' && university.description_en)
        ? university.description_en : university.description;
    const safeLanguages = Array.isArray(department.languages) && department.languages.length > 0
        ? department.languages
        : ['en'];
    const safeDurationYears = typeof department.durationYears === 'number'
        ? department.durationYears
        : 3;
    const safeLevel = department.level === 'master' ? 'master' : 'bachelor';
    const deptCardLayoutId = `dept-card-${university.id}-${department.slug}`;
    const deptTitleLayoutId = `dept-title-${university.id}-${department.slug}`;
    const deptLevelLabel = safeLevel === 'master'
        ? (language === 'tr' ? 'Yüksek Lisans' : 'Master')
        : (language === 'tr' ? 'Lisans' : 'Bachelor');
    const deptDuration = language === 'tr'
        ? `${safeDurationYears} yıl`
        : `${safeDurationYears} year${safeDurationYears === 1 ? '' : 's'}`;
    const deptLanguageLabel = safeLanguages
        .map((lang) => {
            if (lang === 'it') return language === 'tr' ? 'İtalyanca' : 'Italian';
            return language === 'tr' ? 'İngilizce' : 'English';
        })
        .join(' / ');

    return (
        <div className="min-h-screen bg-slate-950 p-2 sm:p-3">
            <ScrollProgress />
            <motion.section
                layoutId={deptCardLayoutId}
                transition={{ type: "spring", stiffness: 220, damping: 30 }}
                className="relative min-h-[calc(100vh-0.5rem)] sm:min-h-[calc(100vh-0.75rem)] overflow-hidden rounded-[24px] border border-white/10 bg-slate-900 shadow-[0_30px_120px_rgba(2,6,23,0.6)]"
            >
                <div className="absolute inset-0 z-0">
                    <Image
                        src={university.image || DEFAULT_IMAGE}
                        alt={`${department.name} - ${university.name}`}
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/78 to-indigo-950/72" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(99,102,241,0.38),transparent_38%),radial-gradient(circle_at_84%_72%,rgba(14,165,233,0.32),transparent_42%)]" />
                </div>

                <div className="absolute top-5 left-5 z-30 flex gap-2">
                    <Link
                        href={`/universities/${university.id}`}
                        className="flex items-center text-white bg-white/12 hover:bg-white/20 px-4 py-2 rounded-full transition backdrop-blur-md border border-white/20 font-semibold text-sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> {t.department.backToUni}
                    </Link>
                </div>

                <div className="relative z-20 mx-auto flex min-h-[calc(100vh-0.5rem)] max-w-7xl items-center px-4 py-24 sm:px-6 lg:px-8">
                    <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
                        <div className="rounded-3xl border border-white/15 bg-white/8 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                            <div className="mb-4 flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/12 px-3 py-1 text-xs font-semibold text-white">
                                    <GraduationCap className="mr-1.5 h-3.5 w-3.5 text-indigo-200" />
                                    {language === 'tr' ? 'Bölüm Detayı' : 'Program Detail'}
                                </span>
                                <span className="rounded-full border border-indigo-200/40 bg-indigo-400/20 px-3 py-1 text-xs font-semibold text-indigo-100">
                                    {deptLevelLabel}
                                </span>
                            </div>

                            <motion.h1
                                layoutId={deptTitleLayoutId}
                                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                                className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
                            >
                                {department.name}
                            </motion.h1>

                            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-200">
                                <span className="inline-flex items-center">
                                    <Building2 className="mr-1.5 h-4 w-4 text-indigo-200" />
                                    {university.name}
                                </span>
                                <span className="inline-flex items-center">
                                    <MapPin className="mr-1.5 h-4 w-4 text-rose-300" />
                                    {university.city}, Italy
                                </span>
                            </div>

                            <p className="mt-6 text-base leading-relaxed text-slate-100/95 sm:text-lg">
                                {description}
                            </p>

                            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-white/15 bg-slate-950/35 p-4">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                                        {t.department.fee}
                                    </p>
                                    <p className="text-base font-bold text-white">{university.fee}</p>
                                </div>
                                <div className="rounded-2xl border border-white/15 bg-slate-950/35 p-4">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                                        {language === 'tr' ? 'Süre' : 'Duration'}
                                    </p>
                                    <p className="inline-flex items-center text-base font-bold text-white">
                                        <Clock3 className="mr-1.5 h-4 w-4 text-cyan-200" />
                                        {deptDuration}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/15 bg-slate-950/35 p-4">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                                        {language === 'tr' ? 'Dil' : 'Language'}
                                    </p>
                                    <p className="inline-flex items-center text-base font-bold text-white">
                                        <Languages className="mr-1.5 h-4 w-4 text-emerald-200" />
                                        {deptLanguageLabel}
                                    </p>
                                </div>
                            </div>

                            {otherDepts.length > 0 && (
                                <section className="mt-8 border-t border-white/15 pt-6">
                                    <h2 className="mb-4 flex items-center text-lg font-bold text-white sm:text-xl">
                                        <BookOpen className="mr-2 h-5 w-5 text-indigo-200" />
                                        {t.department.otherDepts}
                                    </h2>
                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        {otherDepts.map((dept) => {
                                            const otherDeptCardLayoutId = `dept-card-${university.id}-${dept.slug}`;
                                            const otherDeptTitleLayoutId = `dept-title-${university.id}-${dept.slug}`;

                                            return (
                                                <Link
                                                    key={dept.slug}
                                                    href={`/universities/${university.id}/departments/${dept.slug}`}
                                                    className="block"
                                                >
                                                    <motion.div
                                                        layoutId={otherDeptCardLayoutId}
                                                        transition={{ type: "spring", stiffness: 250, damping: 28 }}
                                                        className="group flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 p-3.5 hover:bg-white/16 transition-all"
                                                    >
                                                        <motion.span
                                                            layoutId={otherDeptTitleLayoutId}
                                                            transition={{ type: "spring", stiffness: 280, damping: 28 }}
                                                            className="truncate pr-3 text-sm font-semibold text-white"
                                                        >
                                                            {dept.name}
                                                        </motion.span>
                                                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-200 group-hover:text-white transition" />
                                                    </motion.div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="rounded-3xl border border-white/15 bg-white/8 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
                            <h2 className="mb-6 text-lg font-bold text-white">{t.department.university}</h2>
                            <div className="space-y-5 text-slate-100">
                                <div className="flex items-start gap-3">
                                    <Building2 className="mt-0.5 h-5 w-5 text-indigo-200 shrink-0" />
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-300">{t.department.university}</p>
                                        <Link
                                            href={`/universities/${university.id}`}
                                            className="text-base font-bold text-white hover:text-indigo-200 transition"
                                        >
                                            {university.name}
                                        </Link>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="mt-0.5 h-5 w-5 text-rose-200 shrink-0" />
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-300">{t.department.city}</p>
                                        <p className="text-base font-semibold text-white">{university.city}, Italy</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Banknote className="mt-0.5 h-5 w-5 text-emerald-200 shrink-0" />
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-300">{t.department.fee}</p>
                                        <p className="text-base font-semibold text-white">{university.fee}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Globe className="mt-0.5 h-5 w-5 text-cyan-200 shrink-0" />
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-300">{t.detail.website}</p>
                                        <a
                                            href={university.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-sm font-semibold text-indigo-200 hover:text-white transition"
                                        >
                                            {t.detail.visitSite} <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-7 border-t border-white/15 pt-6">
                                <Link
                                    href={aiMentorHref}
                                    className="flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-bold text-slate-900 transition hover:bg-indigo-100"
                                >
                                    <Sparkles className="mr-2 h-4 w-4 text-indigo-600" />
                                    {t.department.askAi}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>
        </div>
    );
}
