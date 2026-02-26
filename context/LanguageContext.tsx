"use client";

import React, { createContext, useContext, useState } from 'react';
import { translations } from '@/lib/translations';

// Dil tipi (Sadece tr veya en olabilir)
type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: typeof translations['tr']; // Çeviri nesnesinin tipi
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'tr';
    const savedLang = localStorage.getItem('italyPathLang');
    return savedLang === 'tr' || savedLang === 'en' ? savedLang : 'tr';
  });

  const toggleLanguage = () => {
    setLanguage((prevLang) => {
      const newLang = prevLang === 'tr' ? 'en' : 'tr';
      localStorage.setItem('italyPathLang', newLang); // Seçimi kaydet
      return newLang;
    });
  };

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
