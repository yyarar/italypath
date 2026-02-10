// types/index.ts

// 🏛️ Üniversite Veri Yapısı
export interface University {
  id: string;
  name: string;
  city: string;
  type: string; // Public / Private
  ranking?: number;
  description?: string;
  website?: string;
  logo_url?: string;
  is_favorite?: boolean;
}

// 🤖 AI Mentor (Chat) Yapısı
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// 🌍 Dil Seçenekleri (Sadece gerçek olanlar!)
export type Language = 'tr' | 'en';