"use client";

import React from 'react';
import { universitiesData } from '@/app/data';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ArrowLeft, GraduationCap, MapPin, ChevronRight, Sparkles } from 'lucide-react';
import { useFavorites } from '@/lib/useFavorites';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'framer-motion';

// Popüler öneri üniversiteleri (PoliMi, Bologna, Bocconi)
const RECOMMENDED_IDS = [1, 3, 7];

export default function FavoritesPage() {
  const { favorites, loading } = useFavorites();
  const { t } = useLanguage();

  // Favori üniversiteleri data.ts'ten filtrele
  const favoriteUnis = universitiesData.filter((u) => favorites.includes(u.id));
  const recommendedUnis = universitiesData.filter((u) => RECOMMENDED_IDS.includes(u.id));

  if (loading) return <div className="p-10 text-center">{t.favorites.loading}</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex items-center gap-4">
        <Link href="/universities" className="p-2 hover:bg-slate-100 rounded-full transition" aria-label={t.favorites.title}>
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          {t.favorites.title}
        </h1>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {favoriteUnis.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="py-10"
          >
            {/* Animated Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-rose-100 via-pink-50 to-red-100 rounded-full flex items-center justify-center shadow-lg shadow-rose-200/40">
                  <Heart className="w-11 h-11 text-rose-400 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-xl font-black text-slate-800 text-center mb-2">{t.favorites.emptyTitle}</h2>
            <p className="text-sm text-slate-500 text-center mb-8 max-w-xs mx-auto">{t.favorites.emptySubtitle}</p>

            {/* Primary CTA */}
            <div className="flex justify-center mb-10">
              <Link
                href="/universities"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-95 transition-all"
              >
                {t.favorites.emptyCta}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Recommended Universities */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t.favorites.emptyRecommendTitle}</p>
              {recommendedUnis.map((uni, i) => (
                <motion.div
                  key={uni.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                >
                  <Link href={`/universities/${uni.id}`}>
                    <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex items-center gap-3.5 hover:shadow-md hover:border-slate-200 active:scale-[0.98] transition-all">
                      <Image
                        src={uni.image}
                        alt={uni.name}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-slate-800 truncate">{uni.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center text-slate-400 text-xs">
                            <MapPin className="w-3 h-3 mr-0.5 text-red-400" />
                            {uni.city}
                          </span>
                          <span className="flex items-center text-blue-500 text-xs font-medium">
                            <GraduationCap className="w-3 h-3 mr-0.5" />
                            {uni.departments.length}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          favoriteUnis.map((uni) => (
            <Link key={uni.id} href={`/universities/${uni.id}`}>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-transform mb-4">
                <img
                  src={uni.image}
                  className="w-20 h-20 rounded-xl object-cover"
                  alt={uni.name}
                />
                <div className="flex-1">
                  <h2 className="font-bold text-slate-800 leading-tight">{uni.name}</h2>
                  <div className="flex items-center text-slate-500 text-xs mt-1">
                    <MapPin className="w-3 h-3 mr-1 text-red-400" />
                    {uni.city}
                  </div>
                  <div className="flex items-center text-blue-600 text-xs mt-1 font-medium">
                    <GraduationCap className="w-3 h-3 mr-1" />
                    {uni.type}
                  </div>
                </div>
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}