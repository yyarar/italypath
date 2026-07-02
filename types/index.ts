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
  category?: string | null;
  signed_url?: string;
}

export interface SupabaseUniversityDepartmentRow {
  id?: number;
  university_id: number;
  name: string | null;
  slug: string | null;
  languages: string[] | null;
  duration_years: number | null;
  level: string | null;
  sort_order: number | null;
}

export interface SupabaseProgramAdmissionDetailsRow {
  department_id: number;
  university_id: number;
  raw_program_name: string | null;
  raw_level: string | null;
  raw_teaching_language: string | null;
  campus: string | null;
  degree_class: string | null;
  admission_type: string | null;
  academic_requirements: string | null;
  language_requirements: string | null;
  application_deadline_eu: string | null;
  application_deadline_non_eu: string | null;
  required_documents: unknown;
  entry_exam_or_test: string | null;
  tuition_or_fees_link: string | null;
  official_program_url: string | null;
  official_call_url: string | null;
  source_quotes: unknown;
  uncertain: unknown;
  uncertainty_notes: unknown;
  source_file: string | null;
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

export interface UserProfileRow {
  user_id: string;
  level: string | null;
  fields: string[] | null;
  budget: string | null;
  city_pref: string | null;
  created_at?: string;
  updated_at?: string;
}
