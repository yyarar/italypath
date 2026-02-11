// types/index.ts

export interface University {
  id: string;
  name: string;
  city: string;
  type: string;
  ranking?: number;
  description?: string;
  website?: string;
  logo_url?: string;
  is_favorite?: boolean;
}

// 🤖 AI Mentor Yapısını SDK ile uyumlu hale getirelim
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content?: string; // Bazı sürümler hala bunu kullanır
  parts?: Array<{ type: 'text'; text: string }>; // Yeni sürümler bunu bekler
  timestamp?: number;
}

export type Language = 'tr' | 'en';