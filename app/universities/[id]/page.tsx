"use client";

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ArrowLeft, ArrowRight, Globe, GraduationCap, Banknote, BookOpen, CheckCircle, Sparkles, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { universitiesData, DEFAULT_IMAGE } from '@/app/data';
import { useLanguage } from '@/context/LanguageContext';
import { useFavorites } from '@/lib/useFavorites';
import ScrollProgress from '@/components/ScrollProgress';

export default function UniversityDetailPage() {
  const params = useParams();
  const { t, language } = useLanguage();
  const { isFavorite, toggleFavorite, loading } = useFavorites();

  const idFromUrl = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const university = useMemo(() => {
    return universitiesData.find((u) => String(u.id) === String(idFromUrl));
  }, [idFromUrl]);

  if (!university) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">{t.detail.notFound}</h1>
        <Link href="/universities" className="text-blue-600 hover:underline">{t.detail.backToList}</Link>
      </div>
    );
  }

  const favStatus = isFavorite(university.id);

  // Dil içeriği seçimi
  const description = (language === 'en' && university.description_en)
    ? university.description_en : university.description;
  const features = (language === 'en' && university.features_en)
    ? university.features_en : university.features;

  return (
    <div className="min-h-screen bg-slate-50">
      <ScrollProgress />
      {/* ÜST HERO */}
      <motion.div
        className="relative h-[50vh] flex items-end overflow-hidden bg-slate-900"
        layoutId={`uni-hero-${university.id}`}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="absolute inset-0">
          <Image
            src={university.image || DEFAULT_IMAGE}
            alt={university.name}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/30"></div>
        </div>

        <div className="absolute top-6 left-6 z-20">
          <Link href="/universities" className="flex items-center text-white/90 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition backdrop-blur-md border border-white/10 font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" /> {t.detail.back}
          </Link>
        </div>

        {/* Favori Butonu (Birleşik Hook) */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => toggleFavorite(university.id)}
            disabled={loading}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition active:scale-95 group disabled:opacity-50"
          >
            <Heart className={`w-7 h-7 transition-colors ${favStatus ? 'fill-red-500 text-red-500' : 'text-white group-hover:text-red-400'}`} />
          </button>
        </div>

        <div className="max-w-7xl mx-auto w-full px-6 pb-12 relative z-10">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg shadow-blue-900/20">{university.type}</span>
          </div>
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-2 drop-shadow-xl leading-tight"
            layoutId={`uni-title-${university.id}`}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >{university.name}</motion.h1>
          <div className="flex items-center text-slate-200 text-lg font-medium">
            <MapPin className="w-5 h-5 mr-2 text-red-400" /> {university.city}, Italy
          </div>
        </div>
      </motion.div>

      {/* İÇERİK ALANI */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 pb-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center"><BookOpen className="w-6 h-6 mr-2 text-blue-600" /> {t.detail.about}</h2>
              <p className="text-slate-600 leading-relaxed text-lg">{description}</p>
            </section>
            <hr className="border-slate-100" />
            {/* BÖLÜMLER - Tıklanabilir */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center"><GraduationCap className="w-6 h-6 mr-2 text-indigo-600" /> {t.detail.departments}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {university.departments && university.departments.map((dept, i) => (
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
            <hr className="border-slate-100" />
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center"><CheckCircle className="w-6 h-6 mr-2 text-green-600" /> {t.detail.why}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features && features.map((f: string, i: number) => (
                  <div key={i} className="flex items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-slate-700 font-medium">{f}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* SAĞ PANEL */}
          <div className="lg:col-span-1">
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 sticky top-24">
              <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">{t.detail.summary}</h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <Banknote className="w-6 h-6 text-slate-400 mt-1 mr-3" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">{t.detail.fee}</p>
                    <p className="text-slate-900 font-bold text-lg">{university.fee}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Globe className="w-6 h-6 text-slate-400 mt-1 mr-3" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">{t.detail.website}</p>
                    <a href={university.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline break-all">{t.detail.visitSite}</a>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-200">
                <Link href="/ai-mentor" className="w-full bg-slate-900 text-white flex items-center justify-center py-4 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg group">
                  <Sparkles className="w-5 h-5 mr-2 text-yellow-400 group-hover:animate-pulse" /> {t.detail.askAi}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
