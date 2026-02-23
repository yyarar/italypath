"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, ArrowRight, GraduationCap, School, ArrowLeft, Heart, X, Globe } from 'lucide-react';
import { universitiesData, DEFAULT_IMAGE } from '@/app/data';
import { useLanguage } from '@/context/LanguageContext';
import { useFavorites } from '@/lib/useFavorites';

export default function UniversitiesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    const { t, language, toggleLanguage } = useLanguage();
    const { favorites, toggleFavorite, isFavorite, loading } = useFavorites();

    const filteredUniversities = universitiesData.filter((uni) => {
        const term = searchTerm.toLowerCase();
        const nameMatch = uni.name ? uni.name.toLowerCase().includes(term) : false;
        const cityMatch = uni.city ? uni.city.toLowerCase().includes(term) : false;
        const deptMatch = uni.departments ? uni.departments.some((dep) => dep.toLowerCase().includes(term)) : false;
        const matchesSearch = nameMatch || cityMatch || deptMatch;
        const matchesFavorites = showFavoritesOnly ? isFavorite(uni.id) : true;

        return matchesSearch && matchesFavorites;
    });

    if (loading) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-10 lg:px-20">

            {/* Üst Navigasyon (Geri Dön + Dil Butonu) */}
            <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
                <Link
                    href="/"
                    className="inline-flex items-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-full transition-all text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t.list.backHome}
                </Link>

                <div className="flex items-center gap-3">
                    {/* Favori Sayacı */}
                    {favorites.length > 0 && !showFavoritesOnly && (
                        <div className="text-xs font-medium text-slate-400 hidden sm:block">
                            {favorites.length} {language === 'tr' ? 'okul kayıtlı' : 'saved'}
                        </div>
                    )}

                    {/* DİL DEĞİŞTİRME BUTONU */}
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100 transition shadow-sm"
                    >
                        <Globe className="w-3 h-3" />
                        {language === 'tr' ? 'EN' : 'TR'}
                    </button>
                </div>
            </div>

            {/* BAŞLIK ALANI */}
            <div className="max-w-7xl mx-auto mb-10">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 flex items-center">
                    <School className="w-10 h-10 mr-3 text-blue-600" />
                    {t.list.title}
                </h1>
                <p className="text-slate-600 text-lg mb-8 max-w-3xl">
                    {t.list.subtitle} <strong>{universitiesData.length}</strong> {t.list.subtitleEnd}
                </p>

                {/* ARAMA VE FİLTRE KUTUSU */}
                <div className="flex flex-col md:flex-row gap-4 max-w-5xl">

                    {/* Arama Inputu */}
                    <div className="relative flex-1 shadow-lg rounded-xl">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Search className="h-6 w-6 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder={t.list.searchPlaceholder}
                            className="block w-full pl-14 pr-6 py-4 bg-white border-0 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-lg transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none">
                            <span className="text-sm text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                {filteredUniversities.length} {t.list.results}
                            </span>
                        </div>
                    </div>

                    {/* FAVORİ FİLTRE BUTONU */}
                    <button
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`flex items-center justify-center px-6 py-4 rounded-xl font-bold transition-all shadow-lg border-2 whitespace-nowrap ${showFavoritesOnly
                                ? 'bg-red-500 border-red-500 text-white hover:bg-red-600'
                                : 'bg-white border-white text-slate-600 hover:border-red-100 hover:text-red-500'
                            }`}
                    >
                        {showFavoritesOnly ? (
                            <>
                                <X className="w-5 h-5 mr-2" />
                                {t.list.showAll}
                            </>
                        ) : (
                            <>
                                <Heart className={`w-5 h-5 mr-2 ${favorites.length > 0 ? 'text-red-500 fill-red-500' : ''}`} />
                                {t.list.favoritesOnly}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* LİSTELEME ALANI */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredUniversities.length > 0 ? (
                    filteredUniversities.map((uni) => {
                        const favStatus = isFavorite(uni.id);
                        const description = (language === 'en' && uni.description_en) ? uni.description_en : uni.description;

                        return (
                            <Link href={`/universities/${uni.id}`} key={uni.id} className="block h-full">
                                <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative">

                                    {/* GÖRSEL ALANI */}
                                    <div className="h-48 relative overflow-hidden">
                                        <img
                                            src={uni.image || DEFAULT_IMAGE}
                                            alt={uni.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>

                                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-900 shadow-md flex items-center z-10">
                                            <GraduationCap className="w-3 h-3 mr-1 text-blue-600" />
                                            {uni.type}
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                toggleFavorite(uni.id);
                                            }}
                                            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-md shadow-lg hover:scale-110 active:scale-95 transition z-20 group-hover:bg-white"
                                        >
                                            <Heart
                                                className={`w-5 h-5 transition-colors ${favStatus ? 'fill-red-500 text-red-500' : 'text-slate-400 hover:text-red-500'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {/* İÇERİK */}
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="mb-2">
                                            <h2 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition line-clamp-2 min-h-[3.5rem]">
                                                {uni.name}
                                            </h2>
                                        </div>

                                        <div className="flex items-center text-slate-500 text-sm mb-4">
                                            <MapPin className="w-4 h-4 mr-1 text-red-500" />
                                            <span className="font-medium">{uni.city}</span>
                                        </div>

                                        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                                            {description}
                                        </p>

                                        <div className="space-y-2 mb-6 flex-1">
                                            <div className="flex flex-wrap gap-2">
                                                {uni.departments && uni.departments.slice(0, 3).map((dep, idx) => (
                                                    <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-medium truncate max-w-full">
                                                        {dep}
                                                    </span>
                                                ))}
                                                {uni.departments && uni.departments.length > 3 && (
                                                    <span className="text-xs text-slate-400">+ {uni.departments.length - 3} {t.list.more}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                                            <span className="text-sm font-bold text-slate-900">{uni.fee}</span>
                                            <div className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold group-hover:bg-blue-600 transition flex items-center">
                                                {t.list.review}
                                                <ArrowRight className="w-3 h-3 ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                        {showFavoritesOnly ? (
                            <>
                                <Heart className="w-16 h-16 text-slate-200 mb-4" />
                                <h3 className="text-xl font-bold text-slate-900">{t.list.emptyFav}</h3>
                                <p className="text-slate-500 max-w-md mx-auto mt-2">
                                    {t.list.emptyFavDesc}
                                </p>
                            </>
                        ) : (
                            <>
                                <Search className="w-16 h-16 text-slate-200 mb-4" />
                                <h3 className="text-xl font-bold text-slate-900">{t.list.noResults}</h3>
                                <p className="text-slate-500">"{searchTerm}" {t.list.noResultsDesc}</p>
                            </>
                        )}

                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setShowFavoritesOnly(false);
                            }}
                            className="mt-6 px-6 py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition"
                        >
                            {t.list.clearFilters}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}