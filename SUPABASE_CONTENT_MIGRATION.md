# Supabase Content Migration Runbook

Bu doküman statik içerik verilerini (`universities`, `departments`, `communities`, `scholarships`) Supabase'e taşıma adımlarını açıklar.

## 1) Şemayı kur

Supabase SQL Editor'da şu dosyayı çalıştır:

- `/Users/keremyarar/italypath-main/supabase/content_schema.sql`

Bu script şu tabloları oluşturur:

- `public.universities`
- `public.university_departments`
- `public.community_links`
- `public.scholarship_regions`

Ayrıca public read (anon + authenticated `SELECT`) policy'lerini ekler.

## 2) (Mevcut güvenlik için) RLS hardening scriptini çalıştırmaya devam et

Kullanıcıya özel veriler (`favorites`, `user_documents`, `storage.objects`) için:

- `/Users/keremyarar/italypath-main/supabase/rls_hardening.sql`

## 3) Seed için environment hazırla

`.env.local` içinde aşağıdaki değişkenler olmalı:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Not: `SUPABASE_SERVICE_ROLE_KEY` yalnızca seed/migration komutu için kullanılmalı; client'a asla açılmamalı.

## 4) İçeriği Supabase'e yükle

```bash
npm run seed:supabase
```

Bu komut lokal kaynaklardan okuyup Supabase tablolarını tam yeniler.

## 5) Doğrulama

Uygulama çalışırken aşağıdaki endpoint'leri kontrol et:

- `/api/universities`
- `/api/communities`
- `/api/scholarships`

Beklenen: 200 yanıt + dolu JSON payload.

## 6) Fallback davranışı

Supabase erişimi yoksa uygulama otomatik olarak lokal statik kaynaklara fallback yapar.
