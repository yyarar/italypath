# ItalyPath — Agent Context & Knowledge Base

> Bu dosya, projeyi anlayan bir AI agent tarafından oluşturulmuştur. Yeni agentler bu dosyayı okuyarak projenin mimarisini, yapılan değişiklikleri ve bilinen sorunları hızlıca kavrayabilir.

---

## 🎯 Proje Tanımı

İtalya'da eğitim almak isteyen Türk öğrenciler için **yapay zeka destekli rehber uygulaması**. Üniversite arama, AI mentörlük, belge yönetimi, ISEE burs hesaplayıcı ve favoriler gibi özellikler sunar. Mobil öncelikli (PWA-ready) tasarıma sahiptir.

---

## 🧰 Teknoloji Yığını

| Katman | Teknoloji | Sürüm |
|--------|-----------|-------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Stil | Tailwind CSS | v4 |
| Animasyon | Framer Motion | 12.34.0 |
| İkonlar | Lucide React | 0.563.0 |
| Markdown | React Markdown | 10.1.0 |
| Auth | Clerk (`@clerk/nextjs`) | 6.37.3 |
| Veritabanı | Supabase (`@supabase/supabase-js`) | 2.95.3 |
| AI | Google Gemini (`@google/generative-ai`) | 0.24.1 |
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/react`) | v6 (yeni API) |
| Dil | TypeScript | 5.x |

> ⚠️ **AI SDK v6 Uyarısı:** `@ai-sdk/react` v6'da `useChat` hook'u tamamen değişti. Eski `handleSubmit`, `handleInputChange`, `isLoading`, `input` property'leri artık yok. Yeni API: `sendMessage`, `status`, `UIMessage.parts`. Bu nedenle AI Mentor **native Google AI streaming** kullanılarak yazıldı, Vercel AI SDK'nın `useChat` hook'u kullanılmadı.

---

## 📁 Proje Yapısı

```
italypath-main/
├── app/
│   ├── page.tsx                    # Ana sayfa (Hero, Features, ISEE CTA, Footer)
│   ├── layout.tsx                  # Root layout (Clerk, LanguageProvider, BottomNav)
│   ├── template.tsx                # Sayfa geçiş animasyonları (Framer Motion)
│   ├── globals.css                 # Tailwind v4 + mobil PWA stilleri
│   ├── data.ts                     # 45 üniversite verisi (860 satır, çift dilli)
│   ├── ai-mentor/page.tsx          # AI sohbet arayüzü (streaming + durdur butonu)
│   ├── api/chat/route.ts           # AI backend (Gemini streaming + sohbet hafızası)
│   ├── universities/
│   │   ├── page.tsx                # Üniversite listesi (arama, filtre, favoriler)
│   │   └── [id]/page.tsx           # Üniversite detay (hero, bilgiler, favori butonu)
│   ├── documents/page.tsx          # Belge cüzdanı (Supabase Storage upload/delete)
│   ├── favorites/page.tsx          # Favori üniversiteler listesi
│   └── isee/page.tsx               # ISEE burs hesaplayıcı (scala equivalente formülü)
├── components/
│   └── BottomNav.tsx               # Mobil alt navigasyon (4 sekme, ortada AI butonu)
├── context/
│   └── LanguageContext.tsx          # TR/EN dil sistemi (Context + localStorage)
├── lib/
│   ├── supabaseClient.ts           # Supabase client (anon key)
│   ├── translations.ts             # Tüm UI çevirileri (TR + EN)
│   └── useFavorites.ts             # Birleşik favori hook'u (localStorage + Supabase)
├── types/
│   └── index.ts                    # Paylaşılan tipler (Language)
├── proxy.ts                        # Clerk middleware (⚠️ dosya adı middleware.ts olmalı)
└── public/                         # Sadece varsayılan SVG'ler (PWA ikonları eksik)
```

---

## 🔑 Önemli Mimari Kararlar

### 1. Dil Sistemi (i18n)
- `context/LanguageContext.tsx` → React Context + `localStorage` ile dil tercihi saklanır
- `lib/translations.ts` → Tüm UI metinleri burada (navbar, hero, list, detail, isee, favorites, documents, bottomNav)
- Üniversite verileri (`data.ts`) → `description_en`, `features_en` opsiyonel alanları ile çift dilli
- Dil değiştirme: Her sayfada Globe butonu ile `toggleLanguage()` çağrılır

### 2. Favori Sistemi (`lib/useFavorites.ts`)
- **Misafir kullanıcı:** `localStorage` → `italyPathFavorites` key'i
- **Giriş yapmış kullanıcı:** Supabase `favorites` tablosu (`user_id`, `university_id`)
- Hook tüm sayfalarda aynı API sunar: `{ favorites, toggleFavorite, isFavorite, loading }`
- Optimistic update uygulanmış (UI anında güncellenir, hata olursa geri alınır)

### 3. AI Mentor Streaming
- **Backend** (`api/chat/route.ts`): `@google/generative-ai` paketi ile `sendMessageStream` kullanılır
- Tüm mesaj geçmişi Gemini chat history olarak iletilir (sohbet hafızası)
- Sistem promptu: Üniversite veritabanından oluşturulan bağlam + mentör kişilik tanımı
- **Frontend** (`ai-mentor/page.tsx`): `fetch` + `ReadableStream` + `TextDecoder` ile chunk chunk okuma
- `AbortController` ile kullanıcı yanıtı yarıda kesebilir (kırmızı durdur butonu)
- Stream başlayana kadar zıplayan 3 nokta animasyonu gösterilir

### 4. Belge Cüzdanı
- Supabase Storage `documents` bucket'ına dosya yükleme
- Supabase `user_documents` tablosuna metadata yazma
- Kamera ile doğrudan tarama (`capture="environment"`) veya galeriden dosya seçme
- Clerk `user.id` ile kullanıcıya özel dosya yolu: `{userId}/{timestamp}.{ext}`

### 5. Clerk Middleware
- `proxy.ts` (⚠️ `middleware.ts` olmalı) dosyasında tanımlı
- Public rotalar: `/`, `/api/chat`, `/sign-in`, `/sign-up`
- Diğer tüm rotalar `auth.protect()` ile korumalı

---

## 🛠️ Yapılan Değişiklikler (Bu Chat'te)

### Commit 1: `feat: AI Mentor streaming and memory logic completed`
| Dosya | Değişiklik |
|-------|------------|
| `app/api/chat/route.ts` | ❌ Eski: Tek mesaj gönderim, JSON yanıt → ✅ Yeni: `sendMessageStream`, full history, sistem promptu, ReadableStream yanıt |
| `app/ai-mentor/page.tsx` | ❌ Eski: `fetch` + `res.json()` bekleme → ✅ Yeni: Stream okuma, durdur butonu (AbortController), yazıyor animasyonu, aria-label'lar |

### Commit 2 (henüz commit edilmedi):
| Dosya | Değişiklik |
|-------|------------|
| `lib/useFavorites.ts` | 🆕 Oluşturuldu: Birleşik favori hook'u (localStorage + Supabase) |
| `app/universities/page.tsx` | ♻️ localStorage lojiği → `useFavorites` hook'una geçildi |
| `app/universities/[id]/page.tsx` | ♻️ Supabase + Clerk direkt çağrıları → `useFavorites` hook'una geçildi, `any` cast kaldırıldı |
| `app/favorites/page.tsx` | ♻️ Supabase + Clerk direkt çağrıları → `useFavorites` hook'una geçildi, i18n eklendi |
| `app/documents/page.tsx` | 🌍 Hard-coded Türkçe → i18n çevirilerine geçildi |
| `components/BottomNav.tsx` | 🌍 Hard-coded İngilizce label'lar → i18n çevirilerine geçildi |
| `lib/translations.ts` | ➕ `favorites`, `documents`, `bottomNav` çeviri blokları eklendi (TR + EN) |
| `types/index.ts` | 🧹 Kullanılmayan `University` ve `Message` interfaceleri kaldırıldı |
| `lib/gemini-service.ts` | 🗑️ Silindi (ölü kod, hiçbir yerden import edilmiyordu) |
| `datatemizyedek.ts` | 🗑️ Silindi (124KB yedek dosya) |
| `datayedek.ts` | 🗑️ Silindi (25KB yedek dosya) |

---

## ⚠️ Bilinen Sorunlar & Açık Öneriler

### 🔴 Yüksek Öncelik
1. **`proxy.ts` → `middleware.ts`** olarak yeniden adlandırılmalı (Next.js standardı)
2. **Public route eksikleri:** `/universities(.*)` ve `/isee(.*)` middleware'de public değil — giriş yapmadan erişilemez
3. **Supabase RLS:** `user_documents`, `favorites` tabloları ve `documents` storage bucket'ında Row Level Security politikaları doğrulanmalı
4. **Dark mode bozuk:** `globals.css`'te `prefers-color-scheme: dark` tanımlı ama hiçbir bileşende `dark:` prefix kullanılmıyor → koyu modda body arka planı siyah, kartlar/butonlar beyaz kalıyor. Ya tüm bileşenlere `dark:` sınıfları eklenmeli ya da CSS'teki dark mode bloğu kaldırılmalı

### 🟡 Orta Öncelik
5. **`error.tsx` / `not-found.tsx` yok:** Hiçbir hata boundary veya 404 sayfası tanımlanmamış — hatalarda ham Next.js ekranı görünür
6. **`target="_blank"` güvenlik:** `universities/[id]/page.tsx` ve `documents/page.tsx`'te `rel="noopener noreferrer"` eksik
7. **Ana sayfa i18n eksik:** `page.tsx`'teki 3. özellik kartı (Belge Cüzdanı) hard-coded Türkçe, diğer kartlar i18n kullanıyor
8. **PWA eksikleri:** `public/manifest.webmanifest` ve uygulama ikonları (`192x192`, `512x512`) oluşturulmalı
9. **SEO:** Her sayfaya `generateMetadata` ile dinamik `title` ve `description` eklenmeli
10. **Tekrarlanan görseller:** `data.ts`'te id 30+ üniversitelerin çoğu aynı placeholder görseli kullanıyor

### 🟢 Düşük Öncelik
11. **Erişilebilirlik (a11y):** `ai-mentor` haricindeki sayfalarda `aria-label` eksik (favori butonları, arama kutusu, dil değiştirme butonu, `<nav>` etiketi)
12. **Footer boş linkler:** Ana sayfadaki sosyal medya linkleri `href="#"` → SEO'yu olumsuz etkiler
13. **`katex` paketi** projede kullanılmıyor → `npm uninstall katex @types/katex`
14. **`next/image`** geçişi: `<img>` → `<Image>` bileşeni ile performans optimizasyonu
15. **Supabase SSR:** `@supabase/ssr` paketi ile server/client ayrımı
16. **Veri katmanı:** 860 satırlık `data.ts` (38KB) client bundle'a dahil — üniversite sayısı artarsa Supabase'e taşınmalı

---

## 🔐 Environment Değişkenleri

Dosya: `.env.local` (git'te yok, `.gitignore`'da)

| Değişken | Kullanım |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonim API anahtarı |
| `GEMINI_API_KEY` | Google Gemini AI API anahtarı |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk yayın anahtarı |
| `CLERK_SECRET_KEY` | Clerk gizli anahtar |

---

## 🚀 Çalıştırma

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint kontrolü
```

---

## 📌 Supabase Tablo Yapısı (Tahmin)

```sql
-- Favoriler
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,          -- Clerk user ID
  university_id TEXT NOT NULL,     -- data.ts'teki university.id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Belgeler
CREATE TABLE user_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,      -- Supabase Storage path
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

> ⚠️ Bu tablo yapıları koddan tahmin edilmiştir. Gerçek şema Supabase Dashboard'dan doğrulanmalıdır.
