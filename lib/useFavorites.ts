"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { useUserSupabaseClient } from '@/lib/useUserSupabaseClient';

const GUEST_FAVORITES_KEY = 'italyPathFavorites';

function toUniversityIds(values: unknown[]): number[] {
    return values
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
}

/**
 * Birleşik Favori Hook'u
 * - Giriş yapmamış kullanıcılar → localStorage (Supabase istemcisi hiç yüklenmez)
 * - Giriş yapmış kullanıcılar → Supabase DB
 * Her iki durumda da aynı API: { favorites, toggleFavorite, isFavorite, loading, error, reload }
 * error: giriş yapmış kullanıcının favorileri yüklenemedi (boş liste değil).
 */
export function useFavorites() {
    const { user, isLoaded } = useUser();
    const userId = user?.id;
    const getClient = useUserSupabaseClient();
    const [favorites, setFavorites] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    // Favorileri yükle
    useEffect(() => {
        if (!isLoaded) return;

        let isActive = true;

        async function loadFavorites() {
            setLoading(true);
            setError(false);
            setFavorites([]);

            if (userId) {
                // Giriş yapmış → Supabase'den çek
                try {
                    const supabase = await getClient();
                    const { data, error: loadError } = await supabase
                        .from('favorites')
                        .select('university_id')
                        .eq('user_id', userId);

                    if (loadError) {
                        throw loadError;
                    }

                    if (isActive) {
                        setFavorites(toUniversityIds((data ?? []).map((f) => f.university_id)));
                    }
                } catch (err) {
                    console.error("Favori yükleme hatası:", err);
                    if (isActive) {
                        setError(true);
                    }
                } finally {
                    if (isActive) {
                        setLoading(false);
                    }
                }
                return;
            }

            // Giriş yapmamış → localStorage'dan oku
            try {
                const saved = safeGetItem(GUEST_FAVORITES_KEY);
                const parsed: unknown = saved ? JSON.parse(saved) : [];
                if (!Array.isArray(parsed)) {
                    throw new Error('Geçersiz favori verisi');
                }
                if (isActive) {
                    setFavorites(toUniversityIds(parsed));
                }
            } catch (err) {
                console.error("Favori yükleme hatası:", err);
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
    }, [userId, isLoaded, getClient, reloadKey]);

    const reload = useCallback(() => {
        setReloadKey((key) => key + 1);
    }, []);

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

            if (userId) {
                // Supabase'e yaz
                try {
                    const supabase = await getClient();
                    if (alreadyFavorite) {
                        const { error: deleteError } = await supabase
                            .from('favorites')
                            .delete()
                            .eq('user_id', userId)
                            .eq('university_id', String(universityId));

                        if (deleteError) {
                            throw deleteError;
                        }
                    } else {
                        const { error: insertError } = await supabase
                            .from('favorites')
                            .insert([{ user_id: userId, university_id: String(universityId) }]);

                        if (insertError) {
                            throw insertError;
                        }
                    }
                } catch (err) {
                    // Hata olursa geri al
                    console.error("Favori güncelleme hatası:", err);
                    setFavorites(previousFavorites);
                }
            } else if (!safeSetItem(GUEST_FAVORITES_KEY, JSON.stringify(newFavorites))) {
                // Tarayıcı hafızası kapalı: favori yalnız bu sekmede kalır.
                console.error("Favori kaydetme hatası: tarayıcı hafızası kullanılamıyor");
            }
        },
        [favorites, userId, getClient]
    );

    // Belirli bir üniversitenin favori olup olmadığını kontrol et
    const isFavorite = useCallback(
        (universityId: number) => favorites.includes(universityId),
        [favorites]
    );

    return { favorites, toggleFavorite, isFavorite, loading, error, reload, isLoggedIn: !!user };
}
