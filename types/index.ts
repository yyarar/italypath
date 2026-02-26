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
}
