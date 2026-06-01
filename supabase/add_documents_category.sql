-- Belge Cüzdanı — belge "tür"ünü (kategori) saklamak için tek alan.
-- Idempotent. Supabase SQL editor'da bir kez çalıştır. RLS/policy değişmez.
-- Mevcut satırlar NULL kalır ve UI'da "Diğer" altında görünür.
alter table public.user_documents
  add column if not exists category text;
