"use client";

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ArrowLeft, Globe, GraduationCap, Banknote, BookOpen, Sparkles, ArrowRight, Building2, ExternalLink } from 'lucide-react';
import { universitiesData, DEFAULT_IMAGE } from '@/app/data';
import { useLanguage } from '@/context/LanguageContext';
import ScrollProgress from '@/components/ScrollProgress';

export default function DepartmentDetailPage() {
    const params = useParams();
    const { t, language } = useLanguage();

    const idFromUrl = Array.isArray(params?.id) ? params?.id[0] : params?.id;
    const deptSlugFromUrl = Array.isArray(params?.deptSlug) ? params?.deptSlug[0] : params?.deptSlug;

    const university = useMemo(() => {
        return universitiesData.find((u) => String(u.id) === String(idFromUrl));
    }, [idFromUrl]);

    const department = useMemo(() => {
        return university?.departments.find((d) => d.slug === deptSlugFromUrl);
    }, [university, deptSlugFromUrl]);

    const otherDepts = useMemo(() => {
        return university?.departments.filter((d) => d.slug !== deptSlugFromUrl) || [];
    }, [university, deptSlugFromUrl]);

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

    return (
        <div className="min-h-screen bg-slate-50">
            <ScrollProgress />
            {/* ÜST HERO */}
            <div className="relative h-[45vh] flex items-end overflow-hidden bg-slate-900">
                <div className="absolute inset-0">
                    <Image
                        src={university.image || DEFAULT_IMAGE}
                        alt={department.name}
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-slate-900/30"></div>
                </div>

                {/* NAVİGASYON */}
                <div className="absolute top-6 left-6 z-20 flex gap-2">
                    <Link
                        href={`/universities/${university.id}`}
                        className="flex items-center text-white/90 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition backdrop-blur-md border border-white/10 font-medium text-sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> {t.department.backToUni}
                    </Link>
                </div>

                <div className="max-w-7xl mx-auto w-full px-6 pb-12 relative z-10">
                    <div className="flex flex-wrap gap-2 mb-3">
                        <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg shadow-indigo-900/20 flex items-center">
                            <GraduationCap className="w-4 h-4 mr-1.5" />
                            {language === 'tr' ? 'Bölüm Detayı' : 'Program Detail'}
                        </span>
                        <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-medium border border-white/10">
                            {university.type}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-2 drop-shadow-xl leading-tight">
                        {department.name}
                    </h1>
                    <div className="flex items-center text-slate-200 text-base font-medium">
                        <Building2 className="w-5 h-5 mr-2 text-indigo-300" /> {university.name}
                        <span className="mx-2 text-white/40">•</span>
                        <MapPin className="w-4 h-4 mr-1 text-red-400" /> {university.city}
                    </div>
                </div>
            </div>

            {/* İÇERİK ALANI */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 pb-20">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-8">
                        {/* HAKKINDA */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                                <BookOpen className="w-6 h-6 mr-2 text-blue-600" /> {t.department.overview}
                            </h2>
                            <p className="text-slate-600 leading-relaxed text-lg">{description}</p>
                        </section>

                        {/* DİĞER BÖLÜMLER */}
                        {otherDepts.length > 0 && (
                            <>
                                <hr className="border-slate-100" />
                                <section>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                                        <GraduationCap className="w-6 h-6 mr-2 text-indigo-600" /> {t.department.otherDepts}
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {otherDepts.map((dept, i) => (
                                            <Link
                                                key={i}
                                                href={`/universities/${university.id}/departments/${dept.slug}`}
                                                className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 p-4 rounded-xl border border-indigo-100 transition-all duration-200 group hover:shadow-md hover:-translate-y-0.5"
                                            >
                                                <div className="flex items-center min-w-0">
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3 shrink-0"></div>
                                                    <span className="text-slate-800 font-medium truncate">{dept.name}</span>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition shrink-0 ml-2" />
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}
                    </div>

                    {/* SAĞ PANEL */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 sticky top-24">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">{t.department.university}</h3>
                            <div className="space-y-5">
                                <div className="flex items-start">
                                    <Building2 className="w-6 h-6 text-slate-400 mt-1 mr-3" />
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-semibold">{t.department.university}</p>
                                        <Link href={`/universities/${university.id}`} className="text-slate-900 font-bold text-lg hover:text-blue-600 transition">
                                            {university.name}
                                        </Link>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <MapPin className="w-6 h-6 text-slate-400 mt-1 mr-3" />
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-semibold">{t.department.city}</p>
                                        <p className="text-slate-900 font-bold text-lg">{university.city}, Italy</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <Banknote className="w-6 h-6 text-slate-400 mt-1 mr-3" />
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-semibold">{t.department.fee}</p>
                                        <p className="text-slate-900 font-bold text-lg">{university.fee}</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <Globe className="w-6 h-6 text-slate-400 mt-1 mr-3" />
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-semibold">{t.detail.website}</p>
                                        <a href={university.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline break-all flex items-center">
                                            {t.detail.visitSite} <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-200">
                                <Link href="/ai-mentor" className="w-full bg-slate-900 text-white flex items-center justify-center py-4 rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg group">
                                    <Sparkles className="w-5 h-5 mr-2 text-yellow-400 group-hover:animate-pulse" /> {t.department.askAi}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
