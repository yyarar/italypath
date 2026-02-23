"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';

/**
 * Birleşik Favori Hook'u
 * - Giriş yapmamış kullanıcılar → localStorage
 * - Giriş yapmış kullanıcılar → Supabase DB
 * Her iki durumda da aynı API: { favorites, toggleFavorite, isFavorite, loading }
 */
export function useFavorites() {
    const { user, isLoaded } = useUser();
    const [favorites, setFavorites] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    // Favorileri yükle
    useEffect(() => {
        if (!isLoaded) return;

        async function loadFavorites() {
            if (user) {
                // Giriş yapmış → Supabase'den çek
                try {
                    const { data, error } = await supabase
                        .from('favorites')
                        .select('university_id')
                        .eq('user_id', user.id);

                    if (data && !error) {
                        setFavorites(data.map((f) => Number(f.university_id)));
                    }
                } catch (err) {
                    console.error("Favori yükleme hatası:", err);
                }
            } else {
                // Giriş yapmamış → localStorage'dan oku
                try {
                    const saved = localStorage.getItem('italyPathFavorites');
                    if (saved) {
                        setFavorites(JSON.parse(saved));
                    }
                } catch {
                    // localStorage erişim hatası, sessizce devam et
                }
            }
            setLoading(false);
        }

        loadFavorites();
    }, [user, isLoaded]);

    // Favori ekle/çıkar
    const toggleFavorite = useCallback(
        async (universityId: number) => {
            const alreadyFavorite = favorites.includes(universityId);

            // Optimistic update: UI'ı hemen güncelle
            const newFavorites = alreadyFavorite
                ? favorites.filter((id) => id !== universityId)
                : [...favorites, universityId];
            setFavorites(newFavorites);

            if (user) {
                // Supabase'e yaz
                try {
                    if (alreadyFavorite) {
                        await supabase
                            .from('favorites')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('university_id', String(universityId));
                    } else {
                        await supabase
                            .from('favorites')
                            .insert([{ user_id: user.id, university_id: String(universityId) }]);
                    }
                } catch (err) {
                    // Hata olursa geri al
                    console.error("Favori güncelleme hatası:", err);
                    setFavorites(favorites);
                }
            } else {
                // localStorage'a yaz
                try {
                    localStorage.setItem('italyPathFavorites', JSON.stringify(newFavorites));
                } catch {
                    // localStorage erişim hatası
                }
            }
        },
        [favorites, user]
    );

    // Belirli bir üniversitenin favori olup olmadığını kontrol et
    const isFavorite = useCallback(
        (universityId: number) => favorites.includes(universityId),
        [favorites]
    );

    return { favorites, toggleFavorite, isFavorite, loading, isLoggedIn: !!user };
}
