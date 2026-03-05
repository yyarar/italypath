"use client";

import React, { Suspense, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, MapPin, ArrowRight, GraduationCap, School, ArrowLeft, Heart, X, Globe, Building2, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useFavorites } from '@/lib/useFavorites';
import { useUniversitiesData } from '@/lib/useUniversitiesData';

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80";
const MAX_STAGGER_WINDOW = 0.9;
const MIN_STAGGER = 0.014;
const MAX_STAGGER = 0.09;

function UniversitiesLoadingState() {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                <p className="text-sm text-slate-400 font-medium">Yükleniyor...</p>
            </div>
        </div>
    );
}

function UniversitiesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const searchTerm = searchParams.get('q') || '';
    const selectedCity = searchParams.get('city') || '';
    const selectedType = searchParams.get('type') || '';
    const showFavoritesOnly = searchParams.get('fav') === '1';

    const updateFilter = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [searchParams, router, pathname]);

    const clearAllFilters = useCallback(() => {
        router.replace(pathname, { scroll: false });
    }, [router, pathname]);

    const { t, language, toggleLanguage } = useLanguage();
    const { favorites, toggleFavorite, isFavorite, loading } = useFavorites();
    const { universities, loading: universitiesLoading, error: universitiesError } = useUniversitiesData();

    const citiesWithCounts = useMemo(() => {
        const cityMap = new Map<string, number>();
        universities.forEach(u => cityMap.set(u.city, (cityMap.get(u.city) || 0) + 1));
        return [...cityMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [universities]);

    const hasActiveFilters = selectedCity || selectedType || searchTerm || showFavoritesOnly;

    const filteredUniversities = useMemo(() => {
        return universities.filter((uni) => {
            const term = searchTerm.toLowerCase();
            const nameMatch = uni.name ? uni.name.toLowerCase().includes(term) : false;
            const cityMatch = uni.city ? uni.city.toLowerCase().includes(term) : false;
            const deptMatch = uni.departments ? uni.departments.some((dep) => dep.name.toLowerCase().includes(term)) : false;
            const matchesSearch = nameMatch || cityMatch || deptMatch;
            const matchesFavorites = showFavoritesOnly ? isFavorite(uni.id) : true;
            const matchesCity = selectedCity ? uni.city === selectedCity : true;
            const matchesType = selectedType ? uni.type === selectedType : true;
            return matchesSearch && matchesFavorites && matchesCity && matchesType;
        });
    }, [searchTerm, showFavoritesOnly, selectedCity, selectedType, isFavorite, universities]);

    const staggerChildren = useMemo(() => {
        const childCount = Math.max(filteredUniversities.length - 1, 1);
        const computed = MAX_STAGGER_WINDOW / childCount;
        return Math.min(MAX_STAGGER, Math.max(MIN_STAGGER, computed));
    }, [filteredUniversities.length]);

    if (universitiesError) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
                <p className="text-sm text-slate-500">Üniversite verisi yüklenemedi.</p>
            </div>
        );
    }

    const showLoadingState = universitiesLoading || (showFavoritesOnly && loading);
    if (showLoadingState) {
        return <UniversitiesLoadingState />;
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren } }
    };
    const cardVariants = {
        hidden: { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-10">
            {/* Header bar */}
            <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-100/80 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center mb-4">
                        <Link
                            href="/"
                            className="inline-flex items-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-full transition-all text-sm font-semibold"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            {t.list.backHome}
                        </Link>
                        <div className="flex items-center gap-2.5">
                            {favorites.length > 0 && !showFavoritesOnly && (
                                <span className="text-xs font-medium text-slate-400 hidden sm:block">
                                    {favorites.length} {language === 'tr' ? 'kayıtlı' : 'saved'}
                                </span>
                            )}
                            <button
                                onClick={toggleLanguage}
                                aria-label={language === 'tr' ? 'Switch to English' : 'Türkçeye Geç'}
                                className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition"
                            >
                                <Globe className="w-3 h-3" />
                                {language === 'tr' ? 'EN' : 'TR'}
                            </button>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/25">
                            <School className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none">{t.list.title}</h1>
                            <p className="text-slate-400 text-xs font-medium mt-0.5">
                                {t.list.subtitle} <strong className="text-slate-600">{universities.length}</strong> {t.list.subtitleEnd}
                            </p>
                        </div>
                    </div>

                    {/* Search + Favorite filter row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder={t.list.searchPlaceholder}
                                aria-label={t.list.searchPlaceholder}
                                className="block w-full pl-11 pr-20 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 text-base sm:text-sm transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => updateFilter('q', e.target.value)}
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                                    {hasActiveFilters
                                        ? <><strong className="text-indigo-600">{filteredUniversities.length}</strong> / {universities.length}</>
                                        : <>{filteredUniversities.length} {t.list.results}</>}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => updateFilter('fav', showFavoritesOnly ? '' : '1')}
                            aria-label={showFavoritesOnly ? t.list.showAll : t.list.favoritesOnly}
                            aria-pressed={showFavoritesOnly}
                            className={`flex items-center justify-center px-5 py-3 rounded-2xl font-bold transition-all text-sm border whitespace-nowrap shadow-sm ${showFavoritesOnly
                                ? 'bg-rose-500 border-rose-500 text-white shadow-rose-200'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-500'
                                }`}
                        >
                            {showFavoritesOnly ? (
                                <><X className="w-4 h-4 mr-1.5" />{t.list.showAll}</>
                            ) : (
                                <><Heart className={`w-4 h-4 mr-1.5 ${favorites.length > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />{t.list.favoritesOnly}</>
                            )}
                        </button>
                    </div>

                    {/* Filter pills row */}
                    <div className="flex flex-wrap gap-2 mt-3 items-center">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-300 hidden sm:block" />

                        {/* City select */}
                        <div className="relative">
                            <select
                                value={selectedCity}
                                onChange={(e) => updateFilter('city', e.target.value)}
                                aria-label={language === 'tr' ? 'Şehir filtrele' : 'Filter by city'}
                                className="appearance-none bg-white border border-slate-200 text-slate-600 text-xs font-semibold pl-8 pr-7 py-2 rounded-full hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer shadow-sm"
                            >
                                <option value="">{language === 'tr' ? '🏙️ Tüm Şehirler' : '🏙️ All Cities'} ({universities.length})</option>
                                {citiesWithCounts.map(([city, count]) => (
                                    <option key={city} value={city}>{city} ({count})</option>
                                ))}
                            </select>
                            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Type filter */}
                        <button
                            onClick={() => updateFilter('type', selectedType === 'Devlet' ? '' : 'Devlet')}
                            className={`flex items-center text-xs font-semibold px-3.5 py-2 rounded-full border transition-all shadow-sm ${selectedType === 'Devlet'
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                                }`}
                        >
                            <Building2 className="w-3 h-3 mr-1.5" />
                            {language === 'tr' ? 'Devlet' : 'Public'}
                        </button>
                        <button
                            onClick={() => updateFilter('type', selectedType === 'Özel' ? '' : 'Özel')}
                            className={`flex items-center text-xs font-semibold px-3.5 py-2 rounded-full border transition-all shadow-sm ${selectedType === 'Özel'
                                ? 'bg-purple-600 border-purple-600 text-white shadow-purple-200'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'
                                }`}
                        >
                            <GraduationCap className="w-3 h-3 mr-1.5" />
                            {language === 'tr' ? 'Özel' : 'Private'}
                        </button>

                        <AnimatePresence>
                            {hasActiveFilters && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    onClick={clearAllFilters}
                                    className="flex items-center text-xs font-semibold px-3.5 py-2 rounded-full border border-rose-200 text-rose-500 bg-rose-50 hover:bg-rose-100 transition-all shadow-sm"
                                >
                                    <X className="w-3 h-3 mr-1.5" />
                                    {language === 'tr' ? 'Temizle' : 'Clear'}
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                {filteredUniversities.length > 0 ? (
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={containerVariants}
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                    >
                        {filteredUniversities.map((uni) => {
                            const favStatus = isFavorite(uni.id);
                            const description = (language === 'en' && uni.description_en) ? uni.description_en : uni.description;

                            return (
                                <motion.div
                                    key={uni.id}
                                    variants={cardVariants}
                                    className="block h-full"
                                >
                                    <Link href={`/universities/${uni.id}`} className="block h-full">
                                        <motion.div
                                            whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                            className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md group flex flex-col h-full relative"
                                        >
                                            {/* Image area */}
                                            <div className="h-44 relative overflow-hidden">
                                                <motion.div
                                                    className="absolute inset-0"
                                                    layoutId={`uni-hero-${uni.id}`}
                                                    transition={{ type: "spring", stiffness: 260, damping: 25 }}
                                                >
                                                    <Image
                                                        src={uni.image || DEFAULT_IMAGE}
                                                        alt={uni.name}
                                                        fill
                                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                                                </motion.div>

                                                {/* Type badge */}
                                                <div className="absolute bottom-3 left-3 glass px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-800 flex items-center z-10">
                                                    <GraduationCap className="w-2.5 h-2.5 mr-1 text-indigo-600" />
                                                    {uni.type}
                                                </div>

                                                {/* Favorite button */}
                                                <motion.button
                                                    onClick={(e) => { e.preventDefault(); toggleFavorite(uni.id); }}
                                                    whileTap={{ scale: 0.8 }}
                                                    whileHover={{ scale: 1.1 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                                    aria-label={favStatus
                                                        ? (language === 'tr' ? `${uni.name} favorilerden çıkar` : `Remove ${uni.name} from favorites`)
                                                        : (language === 'tr' ? `${uni.name} favorilere ekle` : `Add ${uni.name} to favorites`)}
                                                    aria-pressed={favStatus}
                                                    className="absolute top-3 right-3 p-2 rounded-full glass shadow-lg z-20"
                                                >
                                                    <Heart className={`w-4 h-4 transition-colors ${favStatus ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
                                                </motion.button>
                                            </div>

                                            {/* Content */}
                                            <div className="p-5 flex-1 flex flex-col">
                                                <motion.h2
                                                    className="text-base font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition line-clamp-2 mb-2"
                                                    layoutId={`uni-title-${uni.id}`}
                                                    transition={{ type: "spring", stiffness: 280, damping: 24 }}
                                                >
                                                    {uni.name}
                                                </motion.h2>

                                                {/* Three key stats */}
                                                <div className="flex items-center gap-3 mb-4 flex-wrap">
                                                    <div className="flex items-center text-slate-500 text-xs font-medium">
                                                        <MapPin className="w-3 h-3 mr-1 text-rose-400" />
                                                        {uni.city}
                                                    </div>
                                                    <div className="w-px h-3 bg-slate-200" />
                                                    <div className="text-xs font-semibold text-slate-700">{uni.fee}</div>
                                                    <div className="w-px h-3 bg-slate-200" />
                                                    <div className="text-xs text-slate-400 font-medium">
                                                        {uni.departments?.length ?? 0} {language === 'tr' ? 'bölüm' : 'dept'}
                                                    </div>
                                                </div>

                                                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 flex-1">
                                                    {description}
                                                </p>

                                                {/* Department tags */}
                                                <div className="flex flex-wrap gap-1.5 mt-3">
                                                    {uni.departments && uni.departments.slice(0, 2).map((dep, idx) => (
                                                        <span key={idx} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 font-semibold truncate max-w-[110px]">
                                                            {dep.name}
                                                        </span>
                                                    ))}
                                                    {uni.departments && uni.departments.length > 2 && (
                                                        <span className="text-[10px] text-slate-400 font-medium">+{uni.departments.length - 2}</span>
                                                    )}
                                                </div>

                                                {/* Footer CTA */}
                                                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-end">
                                                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:gap-2 transition-all">
                                                        {t.list.review}
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="flex flex-col items-center justify-center py-24 text-center"
                    >
                        {showFavoritesOnly ? (
                            <>
                                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                                    <Heart className="w-9 h-9 text-rose-200" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">{t.list.emptyFav}</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm leading-relaxed">{t.list.emptyFavDesc}</p>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <Search className="w-9 h-9 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">{t.list.noResults}</h3>
                                <p className="text-slate-500 text-sm mt-1">&quot;{searchTerm}&quot; {t.list.noResultsDesc}</p>
                            </>
                        )}
                        <button
                            onClick={clearAllFilters}
                            className="mt-6 px-6 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-100 transition text-sm"
                        >
                            {t.list.clearFilters}
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default function UniversitiesPage() {
    return (
        <Suspense fallback={<UniversitiesLoadingState />}>
            <UniversitiesContent />
        </Suspense>
    );
}
