"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ArrowLeft, Globe, GraduationCap, Banknote, BookOpen, CheckCircle, Sparkles, Heart } from 'lucide-react';
// 👇 Dil desteği ve veri importu
import { universitiesData, DEFAULT_IMAGE } from '@/app/data';
import { useLanguage } from '@/context/LanguageContext';

export default function UniversityDetailPage() {
  const params = useParams();
  const { t, language } = useLanguage(); // 🌍 Dil verilerini çek

  const idFromUrl = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const university = universitiesData.find((u) => String(u.id) === String(idFromUrl));

  // Favori State'leri
  const [favorites, setFavorites] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedFavs = localStorage.getItem('italyPathFavorites');
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    }
  }, []);

  const toggleFavorite = () => {
    if (!university) return;

    let newFavs;
    if (favorites.includes(university.id)) {
      newFavs = favorites.filter(id => id !== university.id);
    } else {
      newFavs = [...favorites, university.id];
    }

    setFavorites(newFavs);
    localStorage.setItem('italyPathFavorites', JSON.stringify(newFavs));
  };

  if (!university) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">{t.detail.notFound}</h1>
        <Link href="/universities" className="text-blue-600 hover:underline">
          {t.detail.backToList}
        </Link>
      </div>
    );
  }

  if (!mounted) return null;

  const isFavorite = favorites.includes(university.id);

  // 👇 DİL KONTROLÜ (Mantık: İngilizce seçiliyse ve İngilizce veri varsa onu kullan, yoksa Türkçeyi kullan)
  // Not: TypeScript hatası almamak için 'any' veya type guard kullanılabilir ama şimdilik doğrudan erişiyoruz.
  const description = (language === 'en' && (university as any).description_en) 
                      ? (university as any).description_en 
                      : university.description;

  const features = (language === 'en' && (university as any).features_en) 
                   ? (university as any).features_en 
                   : university.features;

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* 1. ÜST HERO ALANI */}
      <div className="relative h-[50vh] flex items-end overflow-hidden bg-slate-900">
        <div className="absolute inset-0">
            <img 
                src={university.image || DEFAULT_IMAGE} 
                alt={university.name}
                className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/30"></div>
        </div>

        {/* Geri Dön Butonu */}
        <div className="absolute top-6 left-6 z-20">
            <Link href="/universities" className="flex items-center text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition backdrop-blur-md border border-white/10 font-medium">
                <ArrowLeft className="w-5 h-5 mr-2" />
                {t.detail.back}
            </Link>
        </div>

        {/* Favori Butonu */}
        <div className="absolute top-6 right-6 z-20">
            <button 
                onClick={toggleFavorite}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition active:scale-95 group"
            >
                <Heart 
                    className={`w-7 h-7 transition-colors ${
                        isFavorite ? 'fill-red-500 text-red-500' : 'text-white group-hover:text-red-400'
                    }`} 
                />
            </button>
        </div>
        
        <div className="max-w-7xl mx-auto w-full px-6 pb-12 relative z-10">
            <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg shadow-blue-900/20">
                    {university.type}
                </span>
                {features?.[0] && (
                    <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg shadow-emerald-900/20 hidden sm:inline-block">
                        {features[0]}
                    </span>
                )}
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-2 drop-shadow-xl leading-tight">
                {university.name}
            </h1>
            <div className="flex items-center text-slate-200 text-lg font-medium">
                <MapPin className="w-5 h-5 mr-2 text-red-400" />
                {university.city}, Italy
            </div>
        </div>
      </div>

      {/* 2. ANA İÇERİK */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 pb-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* SOL KOLON */}
            <div className="lg:col-span-2 space-y-8">
                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                        <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
                        {t.detail.about}
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-lg">
                        {description}
                    </p>
                </section>

                <hr className="border-slate-100" />

                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                        <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                        {t.detail.why}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {features && features.map((feature: string, idx: number) => (
                            <div key={idx} className="flex items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                <span className="text-slate-700 font-medium">{feature}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <hr className="border-slate-100" />

                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                        <GraduationCap className="w-6 h-6 mr-2 text-indigo-600" />
                        {t.detail.departments}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {university.departments && university.departments.map((dept, index) => (
                            <span key={index} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold border border-indigo-100">
                                {dept}
                            </span>
                        ))}
                    </div>
                </section>
            </div>

            {/* SAĞ KOLON */}
            <div className="lg:col-span-1">
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 sticky top-24">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">
                        {t.detail.summary}
                    </h3>

                    <div className="space-y-6">
                        <div className="flex items-start">
                            <Banknote className="w-6 h-6 text-slate-400 mt-1 mr-3" />
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold">{t.detail.fee}</p>
                                <p className="text-slate-900 font-bold text-lg">{university.fee}</p>
                                <p className="text-xs text-slate-400 mt-1">{t.detail.feeNote}</p>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <Globe className="w-6 h-6 text-slate-400 mt-1 mr-3" />
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold">{t.detail.website}</p>
                                <a 
                                    href={university.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 font-bold hover:underline break-all"
                                >
                                    {t.detail.visitSite}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <Link 
                            href="/ai-mentor" 
                            className="w-full bg-slate-900 text-white flex items-center justify-center py-4 rounded-xl font-bold hover:bg-blue-600 hover:scale-[1.02] transition-all shadow-lg group"
                        >
                            <Sparkles className="w-5 h-5 mr-2 text-yellow-400 group-hover:animate-pulse" />
                            {t.detail.askAi}
                        </Link>
                        <p className="text-xs text-center text-slate-400 mt-3">
                            {t.detail.aiNote}
                        </p>
                    </div>

                </div>
            </div>

        </div>
      </div>
    </div>
  );
}