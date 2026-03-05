"use client";

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ArrowLeft, ArrowRight, Globe, GraduationCap, Banknote, BookOpen, CheckCircle, Sparkles, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useFavorites } from '@/lib/useFavorites';
import ScrollProgress from '@/components/ScrollProgress';
import { useUniversitiesData } from '@/lib/useUniversitiesData';

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80";

export default function UniversityDetailPage() {
  const params = useParams();
  const { t, language } = useLanguage();
  const { isFavorite, toggleFavorite, loading } = useFavorites();
  const { universities, loading: universitiesLoading, error: universitiesError } = useUniversitiesData();

  const idFromUrl = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const university = useMemo(() => {
    return universities.find((u) => String(u.id) === String(idFromUrl));
  }, [idFromUrl, universities]);

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

  if (!university) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">{t.detail.notFound}</h1>
        <Link href="/universities" className="text-indigo-600 hover:underline">{t.detail.backToList}</Link>
      </div>
    );
  }

  const favStatus = isFavorite(university.id);
  const description = (language === 'en' && university.description_en) ? university.description_en : university.description;
  const features = (language === 'en' && university.features_en) ? university.features_en : university.features;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <ScrollProgress />

      {/* Hero */}
      <motion.div
        className="relative h-[55vh] lg:h-[60vh] flex items-end overflow-hidden bg-slate-900"
      >
        <motion.div
          className="absolute inset-0"
          layoutId={`uni-hero-${university.id}`}
          transition={{ type: "spring", stiffness: 260, damping: 25 }}
        >
          <Image
            src={university.image || DEFAULT_IMAGE}
            alt={university.name}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/20" />
        </motion.div>

        {/* Back + Fav buttons */}
        <div className="absolute top-6 left-6 z-20">
          <Link
            href="/universities"
            className="flex items-center text-white/90 glass-dark hover:bg-white/20 px-4 py-2 rounded-full transition font-semibold text-sm gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.detail.back}
          </Link>
        </div>
        <div className="absolute top-6 right-6 z-20">
          <motion.button
            onClick={() => toggleFavorite(university.id)}
            disabled={loading}
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center justify-center w-12 h-12 rounded-full glass-dark hover:bg-white/20 transition active:scale-90 disabled:opacity-50"
          >
            <Heart className={`w-6 h-6 transition-colors ${favStatus ? 'fill-rose-500 text-rose-500' : 'text-white/90'}`} />
          </motion.button>
        </div>

        {/* Hero content */}
        <div className="max-w-7xl mx-auto w-full px-6 pb-12 lg:pb-16 relative z-10">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-indigo-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              {university.type}
            </span>
          </div>
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter text-white mb-3 drop-shadow-xl leading-tight"
            layoutId={`uni-title-${university.id}`}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            {university.name}
          </motion.h1>
          <div className="flex items-center text-slate-300 text-base font-medium">
            <MapPin className="w-4 h-4 mr-2 text-rose-400" />
            {university.city}, Italy
          </div>
        </div>
      </motion.div>

      {/* Content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 pb-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">

            {/* About card */}
            <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2 tracking-tight">
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                </div>
                {t.detail.about}
              </h2>
              <p className="text-slate-600 leading-relaxed">{description}</p>
            </motion.div>

            {/* Departments card */}
            <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2 tracking-tight">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                </div>
                {t.detail.departments}
                <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                  {university.departments?.length ?? 0}
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {university.departments && university.departments.map((dept, i) => (
                  <Link
                    key={i}
                    href={`/universities/${university.id}/departments/${dept.slug}`}
                    className="group flex items-center justify-between bg-slate-50 hover:bg-indigo-50 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all duration-200"
                  >
                    <div className="flex items-center min-w-0 gap-2.5">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />
                      <span className="text-slate-700 font-medium text-sm truncate group-hover:text-indigo-700">{dept.name}</span>
                    </div>
                    <motion.div
                      initial={{ x: 0 }}
                      whileHover={{ x: 3 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition shrink-0 ml-2" />
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Features card */}
            <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2 tracking-tight">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                {t.detail.why}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {features && features.map((f: string, i: number) => (
                  <div key={i} className="flex items-center bg-emerald-50 p-3.5 rounded-xl border border-emerald-100/80">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3 shrink-0" />
                    <span className="text-slate-700 font-medium text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div variants={itemVariants} className="glass rounded-3xl p-6 border border-white/40 sticky top-20 shadow-lg shadow-slate-200/40">
              <h3 className="text-base font-bold text-slate-900 mb-5 tracking-tight border-b border-slate-100 pb-4">
                {t.detail.summary}
              </h3>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <Banknote className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">{t.detail.fee}</p>
                    <p className="text-slate-900 font-bold text-base leading-tight">{university.fee}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">{t.detail.website}</p>
                    <a
                      href={university.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-bold hover:underline text-sm break-all"
                    >
                      {t.detail.visitSite}
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <Link href="/ai-mentor">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="w-full bg-indigo-600 text-white flex items-center justify-center py-3.5 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25 group text-sm"
                  >
                    <Sparkles className="w-4 h-4 mr-2 text-yellow-300 group-hover:animate-pulse" />
                    {t.detail.askAi}
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
