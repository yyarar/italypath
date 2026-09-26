"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import {
  getLoadedEnglishTranslations,
  loadEnglishTranslations,
  tr,
  type Language,
  type Translations,
} from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: Translations; // Çeviri nesnesinin tipi
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const LANGUAGE_STORAGE_KEY = 'italyPathLang';
const LANGUAGE_CHANGE_EVENT = 'italyPathLanguageChange';

function getStoredLanguage(): Language {
  const savedLang = safeGetItem(LANGUAGE_STORAGE_KEY);
  return savedLang === 'tr' || savedLang === 'en' ? savedLang : 'tr';
}

function getServerLanguage(): Language {
  return 'tr';
}

function subscribeToLanguage(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
  };
}

// Ingilizce metinler ilk pakette yok (lib/translations/index.ts). Kayitli dil Ingilizceyse paket
// sayfa acilir acilmaz istenir; gelene kadar arayuz Turkce kalir, sonra birlikte Ingilizceye gecer.
if (typeof window !== 'undefined' && getStoredLanguage() === 'en') {
  loadEnglishTranslations().catch(() => undefined);
}

// Istenen dil Ingilizceyse metinler yuklenince onlari, o ana kadar Turkceyi dondurur. `language`
// ekrandaki metnin dilidir (tarih/sayi bicimi ve TR/EN dugmesi metinle ayni kalir).
export function useActiveTranslations(requested: Language): { language: Language; t: Translations } {
  const [english, setEnglish] = useState<Translations | null>(getLoadedEnglishTranslations);

  useEffect(() => {
    if (requested !== 'en' || english) return;
    let active = true;
    loadEnglishTranslations()
      .then((loaded) => {
        if (active) setEnglish(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [requested, english]);

  return requested === 'en' && english ? { language: 'en', t: english } : { language: 'tr', t: tr };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const requestedLanguage = useSyncExternalStore(
    subscribeToLanguage,
    getStoredLanguage,
    getServerLanguage,
  );
  const { language, t } = useActiveTranslations(requestedLanguage);

  const toggleLanguage = () => {
    const newLang = requestedLanguage === 'tr' ? 'en' : 'tr';
    safeSetItem(LANGUAGE_STORAGE_KEY, newLang);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Kolay kullanım için Custom Hook
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
