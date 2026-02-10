"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ArrowLeft, Globe, GraduationCap, Banknote, BookOpen, CheckCircle, Sparkles, Heart } from 'lucide-react';
import { useUser, useAuth } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { universitiesData, DEFAULT_IMAGE } from '@/app/data';
import { useLanguage } from '@/context/LanguageContext';

export default function UniversityDetailPage() {
  const params = useParams();
  const { t, language } = useLanguage();
  const { user } = useUser();
  const { isLoaded: authLoaded } = useAuth();

  const idFromUrl = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const university = universitiesData.find((u) => String(u.id) === String(idFromUrl));

  const [isFavorite, setIsFavorite] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);

  // 1. Sayfa yüklendiğinde favori durumunu DB'den kontrol et
  useEffect(() => {
    async function checkFavoriteStatus() {
      if (!user || !university) {
        setDbLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('university_id', String(university.id))
          .single();

        if (data) setIsFavorite(true);
      } catch (err) {
        console.error("Favori kontrol hatası:", err);
      } finally {
        setDbLoading(false);
      }
    }

    if (authLoaded) checkFavoriteStatus();
  }, [user, university, authLoaded]);

  // 2. Favori Ekleme/Çıkarma İşlemi
  const toggleFavorite = async () => {
    if (!user) {
      alert("Favorilere eklemek için giriş yapmalısın! 🇮🇹");
      return;
    }
    if (!university) return;

    setDbLoading(true);
    if (isFavorite) {
      // Çıkar
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('university_id', String(university.id));
      
      if (!error) setIsFavorite(false);
    } else {
      // Ekle
      const { error } = await supabase
        .from('favorites')
        .insert([{ user_id: user.id, university_id: String(university.id) }]);
      
      if (!error) setIsFavorite(true);
    }
    setDbLoading(false);
  };

  if (!university) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">{t.detail.notFound}</h1>
        <Link href="/universities" className="text-blue-600 hover:underline">{t.detail.backToList}</Link>
      </div>
    );
  }

  // Dil içeriği seçimi
  const description = (language === 'en' && (university as any).description_en) 
                      ? (university as any).description_en : university.description;
  const features = (language === 'en' && (university as any).features_en) 
                   ? (university as any).features_en : university.features;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ÜST HERO */}
      <div className="relative h-[50vh] flex items-end overflow-hidden bg-slate-900">
        <div className="absolute inset-0">
            <img src={university.image || DEFAULT_IMAGE} alt={university.name} className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/30"></div>
        </div>

        <div className="absolute top-6 left-6 z-20">
            <Link href="/universities" className="flex items-center text-white/90 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition backdrop-blur-md border border-white/10 font-medium">
                <ArrowLeft className="w-5 h-5 mr-2" /> {t.detail.back}
            </Link>
        </div>

        {/* Favori Butonu (Supabase Bağlantılı) */}
        <div className="absolute top-6 right-6 z-20">
            <button 
                onClick={toggleFavorite}
                disabled={dbLoading}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition active:scale-95 group disabled:opacity-50"
            >
                <Heart className={`w-7 h-7 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white group-hover:text-red-400'}`} />
            </button>
        </div>
        
        <div className="max-w-7xl mx-auto w-full px-6 pb-12 relative z-10">
            <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg shadow-blue-900/20">{university.type}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-2 drop-shadow-xl leading-tight">{university.name}</h1>
            <div className="flex items-center text-slate-200 text-lg font-medium">
                <MapPin className="w-5 h-5 mr-2 text-red-400" /> {university.city}, Italy
            </div>
        </div>
      </div>

      {/* İÇERİK ALANI */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 pb-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center"><BookOpen className="w-6 h-6 mr-2 text-blue-600" /> {t.detail.about}</h2>
                    <p className="text-slate-600 leading-relaxed text-lg">{description}</p>
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
                                <a href={university.website} target="_blank" className="text-blue-600 font-bold hover:underline break-all">{t.detail.visitSite}</a>
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