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
│   ├── page.tsx                    # Ana sayfa (bileşen birleştirici — sadece import + render)
│   ├── layout.tsx                  # Root layout (Clerk, LanguageProvider, BottomNav)
│   ├── template.tsx                # Sayfa geçiş animasyonları (Framer Motion)
│   ├── not-found.tsx               # Özel 404 Hata Sayfası
│   ├── globals.css                 # Tailwind v4 + mobil PWA stilleri
│   ├── favicon.ico                 # Site ikonu
│   ├── data.ts                     # 45 üniversite verisi (860 satır, çift dilli)
│   ├── ai-mentor/page.tsx          # AI sohbet arayüzü (streaming + durdur butonu)
│   ├── api/chat/route.ts           # AI backend (Gemini streaming + sohbet hafızası)
│   ├── universities/
│   │   ├── page.tsx                # Üniversite listesi (arama, filtre, favoriler)
│   │   └── [id]/
│   │       ├── layout.tsx          # SEO (`generateMetadata`) için Server Component
│   │       └── page.tsx            # Üniversite detay Ui (`use client`)
│   ├── documents/page.tsx          # Belge cüzdanı (Supabase Storage upload/delete)
│   ├── favorites/page.tsx          # Favori üniversiteler listesi
│   └── isee/page.tsx               # ISEE burs hesaplayıcı (scala equivalente formülü)
├── components/
│   ├── BottomNav.tsx               # Mobil alt navigasyon (4 sekme, ortada AI butonu)
│   ├── Navbar.tsx                  # Üst navigasyon (masaüstü + mobil, Clerk auth, dil butonu)
│   ├── HeroSection.tsx             # Ana sayfa Hero bölümü (başlık, rozet, CTA)
│   ├── FeaturesSection.tsx         # Ana sayfa 3'lü özellik grid kartları
│   ├── IseeSection.tsx             # Ana sayfa ISEE hesaplayıcı CTA kartı
│   └── Footer.tsx                  # Alt bilgi (logo, sosyal linkler)
├── context/
│   └── LanguageContext.tsx          # TR/EN dil sistemi (Context + localStorage)
├── lib/
│   ├── supabaseClient.ts           # Supabase client (anon key)
│   ├── translations.ts             # Tüm UI çevirileri (TR + EN)
│   └── useFavorites.ts             # Birleşik favori hook'u (localStorage + Supabase)
├── types/
│   └── index.ts                    # Paylaşılan tipler (Language)
├── next.config.ts                  # Next.js yapılandırması (Unsplash + Pexels remotePatterns)
├── proxy.ts                        # Clerk Request Boundary (Next.js 16 standardı)
└── public/                         # Varsayılan SVG'ler (file, globe, next, vercel, window)
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

### 5. Clerk Request Boundary (proxy.ts)
- `proxy.ts` dosyasında tanımlı (Next.js 16 yeni Request Boundary standardı uyarınca).
- Public rotalar: `/`, `/api/chat`, `/sign-in`, `/sign-up`, `/universities(.*)`, `/isee(.*)`
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

### Commit 3 (Performans ve Güvenlik):
| Dosya | Değişiklik |
|-------|------------|
| `next.config.ts` | 🖼️ `images.remotePatterns` tanımlanarak Unsplash ve Pexels domainleri eklendi |
| `app/universities/page.tsx` | ⚡ `<Image>` component ve liste filtresi için `useMemo` optimizasyonları yapıldı |
| `app/universities/[id]/page.tsx` | ⚡ `<Image>` component eklendi, dış linke `rel="noopener noreferrer"` güvenlik açığı kapatıldı |
| `proxy.ts` | 🔓 `/universities(.*)` ve `/isee(.*)` rotaları public hale getirip i18n/arama indexlenmesi sağlandı |
| `app/template.tsx` | 🐛 Framer Motion `AnimatePresence` temelli sayfa "çift render" olma glitch hatası çözüldü |
| `app/globals.css` | 🌗 Bozuk Dark Mode ayarı silinerek tüm projenin sadece kusursuz Işık (Light) modunda çalışması zorunlu kılındı |
| `app/not-found.tsx` | 🧭 Next.js standartlarına uygun, çift dilli ve özel tasarımlı 404 Not Found sayfası eklendi |
| `app/page.tsx` | 🌍 Eksik i18n çevirileri (Belge Cüzdanı) eklendi ve Footer'daki ölü / boş link sızıntıları giderildi |
| `app/universities/[id]/layout.tsx` | 🔍 Server Component olarak oluşturulup dinamik SEO (`generateMetadata`) işlemi `use client` sayfasından ayrılarak build hatası (çatışması) ortadan kaldırıldı |
| `app/documents/page.tsx` | 🌍 Hard-coded Türkçe → i18n çevirilerine geçildi |
| `components/BottomNav.tsx` | 🌍 Hard-coded İngilizce label'lar → i18n çevirilerine geçildi |
| `lib/translations.ts` | ➕ `favorites`, `documents`, `bottomNav` çeviri blokları eklendi (TR + EN) |
| `types/index.ts` | 🧹 Kullanılmayan `University` ve `Message` interfaceleri kaldırıldı |
| `lib/gemini-service.ts` | 🗑️ Silindi (ölü kod, hiçbir yerden import edilmiyordu) |
| `datatemizyedek.ts` | 🗑️ Silindi (124KB yedek dosya) |
| `datayedek.ts` | 🗑️ Silindi (25KB yedek dosya) |

### Commit 4 (Modülerlik — Ana Sayfa):
| Dosya | Değişiklik |
|-------|------------|
| `app/page.tsx` | ♻️ 169 satırlık monolitik sayfa → 14 satırlık bileşen birleştirici haline getirildi |
| `components/Navbar.tsx` | 🆕 Oluşturuldu: Masaüstü + mobil navigasyon, Clerk auth, dil geçiş butonu |
| `components/HeroSection.tsx` | 🆕 Oluşturuldu: Hero başlık, rozet ve birincil CTA butonu |
| `components/FeaturesSection.tsx` | 🆕 Oluşturuldu: Üniversiteler, AI Mentor ve Belge Cüzdanı 3'lü grid |
| `components/IseeSection.tsx` | 🆕 Oluşturuldu: ISEE hesaplayıcıya yönlendiren gradient CTA kartı |
| `components/Footer.tsx` | 🆕 Oluşturuldu: Alt bilgi logosu ve sosyal medya linkleri |

---

## ⚠️ Bilinen Sorunlar & Açık Öneriler

### 🔴 Yüksek Öncelik
1. **Supabase RLS:** `user_documents`, `favorites` tabloları ve `documents` storage bucket'ında Row Level Security politikaları doğrulanmalı

### 🟡 Orta Öncelik
2. **Global Error Boundary (`error.tsx`):** `app/error.tsx` eksik. Beklenmedik çökmeleri yakalamak için global bir hata yakalayıcı oluşturulmalı
3. **`target="_blank"` güvenlik:** Sadece `documents/page.tsx` (145. satır) dosyasındaki dış linkte `rel="noopener noreferrer"` eksik
4. **PWA eksikleri:** `public/manifest.webmanifest` ve uygulama ikonları (`192x192`, `512x512`) oluşturulmalı. Şu anda tasarım aşamasındadır. Dokunma.
5. **Tekrarlanan görseller:** `data.ts`'te id 30+ üniversitelerin çoğu aynı placeholder görseli kullanıyor
6. ~~**Modülerlik (Ana Sayfa):** `app/page.tsx` içeriği tek dosyada gömülü.~~ ✅ **TAMAMLANDI** — `Navbar`, `HeroSection`, `FeaturesSection`, `IseeSection`, `Footer` bileşenleri `components/` altına ayrıldı.

### 🟢 Düşük Öncelik
7. **Erişilebilirlik (a11y):** `ai-mentor` haricindeki sayfalarda `aria-label` eksik (favori butonları, arama kutusu, dil değiştirme butonu, `<nav>` etiketi)
8. **SEO / Bot Dosyaları:** Google botları için dinamik bir `sitemap.ts` ve `robots.ts` yazılmalı
9. **`katex` paketi** projede kullanılmıyor → `npm uninstall katex @types/katex`
10. **Supabase SSR:** `@supabase/ssr` paketi ile server/client ayrımı
11. **Veri katmanı:** 860 satırlık `data.ts` (38KB) client bundle'a dahil — üniversite sayısı artarsa Supabase'e taşınmalı

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

---

## 🛑 STRICT AGENT GUIDELINES (AI'lar İçin Kesin Kurallar)

> **DİKKAT YENİ AGENT:** Aşağıdaki kurallar projenin bütünlüğünü korumak için yazılmıştır. Bu kuralları çiğnediğin an Next.js build'i kırılacaktır. Asla inisiyatif alıp bu kuralların dışına çıkma.

1. **Supabase TypeScript Kuralları**
   - Şu an projede `types/supabase.ts` (Database Generated Types) **YOKTUR**. `lib/supabaseClient.ts` düz JS tipleriyle çalışmaktadır. 
   - Yeni bir veritabanı sorgusu yazarken `any` kullanmaktan kaçın; `types/index.ts` içine spesifik interface yaz. Zamanı geldiğinde Supabase CLI ile type-generation işlemi yapılacaktır.

2. **Tailwind CSS v4 Standartları**
   - Bu projede **Tailwind v4** kullanılmaktadır. 
   - `tailwind.config.ts` veya `tailwind.config.js` dosyası **YOKTUR** ve oluşturulmamalıdır.
   - Tüm özel temalar, fontlar ve değişkenler sadece `app/globals.css` içinde `@theme` ve `:root` mantığıyla tanımlanır.

3. **React State Management & Hooks**
   - Küresel (Global) state için sadece **React Context** (`context/` klasörü) kullanılacaktır.
   - Redux, Zustand veya Jotai gibi dış kütüphaneler projeye eklenecek kadar karmaşık bir veri ağacı yoktur, KESİNLİKLE önermeyin.
   - Hook'lar `lib/` klasörü içinde toplanmalıdır (örneğin `useFavorites.ts`).

4. **Next.js 16 (App Router) Component Mimarisi**
   - `"use client"` direktifi sadece hook (useState, useEffect vb.), onClick veya tarayıcı API'si gerektiren en uç (yaprak) komponentlere eklenmelidir.
   - **Kritik Kural:** Dinamik Meta Verileri (`generateMetadata()`) KESİNLİKLE `"use client"` ibaresi olan sayfalarda barınamaz (Build hatası yaratır). SEO gerektiren her dinamik sayfa için mecburen aynı klasörde ayrı bir `layout.tsx` (Server Component) yaratılmalı ve SEO tarafı orada işlenmelidir. 
   - Detay sayfalarındaki asenkron veri çekme opsiyonları (`fetch`) mümkünse Server Component'lerde tutulmalıdır. 
   - Route güvenliği sadece `proxy.ts` (Clerk Request Boundary) ile sağlanır, eski tip `middleware.ts` oluşturulmayacaktır.

*(Bu dosyanın son sürümü Agent Antigravity tarafından v4 standartlarına uygun olarak mühürlenmiştir.)*
