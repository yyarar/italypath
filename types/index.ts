// types/index.ts

// University tipi artık app/data.ts'te tanımlı (tek kaynak)
// Bu dosya sadece paylaşılan genel tipler için kullanılır.

export type Language = 'tr' | 'en';

export interface UserDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  storage_path: string;
  created_at: string;
  signed_url?: string;
}

export interface SupabaseUniversityDepartmentRow {
  university_id: number;
  name: string | null;
  slug: string | null;
  languages: string[] | null;
  duration_years: number | null;
  level: string | null;
  sort_order: number | null;
}

export interface SupabaseUniversityRow {
  id: number;
  name: string | null;
  city: string | null;
  type: string | null;
  fee: string | null;
  image: string | null;
  description: string | null;
  description_en: string | null;
  website: string | null;
  features: string[] | null;
  features_en: string[] | null;
  sort_order: number | null;
}
