"use client";

import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { universitiesData } from '@/app/data';
import Link from 'next/link';
import { Heart, ArrowLeft, GraduationCap, MapPin } from 'lucide-react';

export default function FavoritesPage() {
  const { user, isLoaded } = useUser();
  const [favoriteUnis, setFavoriteUnis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFavorites() {
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Supabase'den kullanıcının favori ID'lerini çek
      const { data, error } = await supabase
        .from('favorites')
        .select('university_id')
        .eq('user_id', user.id);

      if (data && !error) {
        const favIds = data.map(f => String(f.university_id));
        // 2. data.ts içinden bu ID'lere sahip üniversiteleri filtrele
        const filtered = universitiesData.filter(u => favIds.includes(String(u.id)));
        setFavoriteUnis(filtered);
      }
      setLoading(false);
    }

    if (isLoaded) fetchFavorites();
  }, [user, isLoaded]);

  if (loading) return <div className="p-10 text-center">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex items-center gap-4">
        <Link href="/universities" className="p-2 hover:bg-slate-100 rounded-full transition">
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          Favorilerim
        </h1>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {favoriteUnis.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Heart className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-500">Henüz favori üniversiten yok.</p>
            <Link href="/universities" className="text-blue-600 font-semibold mt-2 inline-block">
              Okulları Keşfet
            </Link>
          </div>
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