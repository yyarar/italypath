"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { createClerkSupabaseClient } from '@/lib/supabaseClient';

/**
 * Birleşik Favori Hook'u
 * - Giriş yapmamış kullanıcılar → localStorage
 * - Giriş yapmış kullanıcılar → Supabase DB
 * Her iki durumda da aynı API: { favorites, toggleFavorite, isFavorite, loading }
 */
export function useFavorites() {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const [favorites, setFavorites] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = useMemo(
        () => createClerkSupabaseClient(async () => {
            try {
                return await getToken({ template: 'supabase' });
            } catch {
                return null;
            }
        }),
        [getToken]
    );

    // Favorileri yükle
    useEffect(() => {
        if (!isLoaded) return;

        let isActive = true;

        async function loadFavorites() {
            setLoading(true);
            setFavorites([]);

            try {
                if (user) {
                    // Giriş yapmış → Supabase'den çek
                    const { data, error } = await supabase
                        .from('favorites')
                        .select('university_id')
                        .eq('user_id', user.id);

                    if (error) {
                        throw error;
                    }

                    if (isActive) {
                        setFavorites(
                            (data ?? [])
                                .map((f) => Number(f.university_id))
                                .filter((id) => Number.isFinite(id))
                        );
                    }
                    return;
                }

                // Giriş yapmamış → localStorage'dan oku
                const saved = localStorage.getItem('italyPathFavorites');
                if (!saved) return;

                const parsed = JSON.parse(saved);
                if (!Array.isArray(parsed)) {
                    throw new Error('Geçersiz favori verisi');
                }

                if (isActive) {
                    setFavorites(
                        parsed
                            .map((id) => Number(id))
                            .filter((id) => Number.isFinite(id))
                    );
                }
            } catch (err) {
                console.error("Favori yükleme hatası:", err);
                if (isActive) {
                    setFavorites([]);
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        }

        void loadFavorites();

        return () => {
            isActive = false;
        };
    }, [user, isLoaded, supabase]);

    // Favori ekle/çıkar
    const toggleFavorite = useCallback(
        async (universityId: number) => {
            const previousFavorites = favorites;
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
                        const { error } = await supabase
                            .from('favorites')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('university_id', String(universityId));

                        if (error) {
                            throw error;
                        }
                    } else {
                        const { error } = await supabase
                            .from('favorites')
                            .insert([{ user_id: user.id, university_id: String(universityId) }]);

                        if (error) {
                            throw error;
                        }
                    }
                } catch (err) {
                    // Hata olursa geri al
                    console.error("Favori güncelleme hatası:", err);
                    setFavorites(previousFavorites);
                }
            } else {
                // localStorage'a yaz
                try {
                    localStorage.setItem('italyPathFavorites', JSON.stringify(newFavorites));
                } catch (err) {
                    console.error("Favori kaydetme hatası:", err);
                    setFavorites(previousFavorites);
                }
            }
        },
        [favorites, user, supabase]
    );

    // Belirli bir üniversitenin favori olup olmadığını kontrol et
    const isFavorite = useCallback(
        (universityId: number) => favorites.includes(universityId),
        [favorites]
    );

    return { favorites, toggleFavorite, isFavorite, loading, isLoggedIn: !!user };
}
