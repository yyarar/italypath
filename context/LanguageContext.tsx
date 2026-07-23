"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';
import { translations } from '@/lib/translations';

// Dil tipi (Sadece tr veya en olabilir)
type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: typeof translations['tr']; // Çeviri nesnesinin tipi
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const LANGUAGE_STORAGE_KEY = 'italyPathLang';
const LANGUAGE_CHANGE_EVENT = 'italyPathLanguageChange';

function getStoredLanguage(): Language {
  try {
    const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return savedLang === 'tr' || savedLang === 'en' ? savedLang : 'tr';
  } catch {
    return 'tr';
  }
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

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getStoredLanguage,
    getServerLanguage,
  );

  const toggleLanguage = () => {
    const newLang = language === 'tr' ? 'en' : 'tr';
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t: translations[language] }}>
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
