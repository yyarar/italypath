# ItalyPath — Agent Context & Knowledge Base

> Bu dosya, projeyi anlayan bir AI agent tarafından oluşturulmuştur. Yeni agentler bu dosyayı okuyarak projenin mimarisini, yapılan değişiklikleri ve bilinen sorunları hızlıca kavrayabilir.

---

## 🎯 Proje Tanımı

İtalya'da eğitim almak isteyen Türk öğrenciler için **yapay zeka destekli rehber uygulaması**. Üniversite arama, AI mentörlük, belge yönetimi, ISEE burs hesaplayıcı ve favoriler gibi özellikler sunar. Mobil öncelikli tasarıma sahiptir; temel mobil web app metadata'sı mevcut olsa da tam PWA paketi (manifest + ikon seti) henüz tamamlanmamıştır.

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
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/react`) | `ai` 6.0.78 / `@ai-sdk/google` 3.0.23 / `@ai-sdk/react` 3.0.80 |
| Dil | TypeScript | 5.x |

> ℹ️ **AI SDK Notu:** Bu paketler projede kurulu olsa da mevcut AI Mentor implementasyonu `@google/generative-ai` üzerinden native streaming kullanır. `@ai-sdk/react` içindeki `useChat` hook'u bu akışta kullanılmamaktadır.

---

## 📁 Proje Yapısı (Uygulama Odaklı Özet)

> Aşağıdaki ağaç repo'nun tam envanteri değil; mimariyi anlamak için kritik uygulama dosyalarını özetler.

```
italypath-main/
├── app/
│   ├── page.tsx                    # Ana sayfa (bileşen birleştirici — sadece import + render)
│   ├── layout.tsx                  # Root layout (Clerk, LanguageProvider, RouteTransition içinde BottomNav)
│   ├── template.tsx                # Next.js template boundary (minimal passthrough)
│   ├── not-found.tsx               # Özel 404 Hata Sayfası
│   ├── error.tsx                   # Çift dilli Global Error Boundary
│   ├── sitemap.ts                  # Dinamik sitemap (statik rotalar + 64 üniversite + 238 bölüm)
│   ├── robots.ts                   # Robots.txt (seçili public rotalar açık, bazı korumalı rotalar kapalı)
│   ├── globals.css                 # Tailwind v4 + mobil PWA stilleri
│   ├── favicon.ico                 # Site ikonu
│   ├── data.ts                     # 64 üniversite, 238 bölüm verisi (seed + normalized metadata modeli)
│   ├── ai-mentor/page.tsx          # AI sohbet arayüzü (streaming + durdur butonu + prompt chip önerileri)
│   ├── api/chat/route.ts           # AI backend (Gemini streaming + sohbet hafızası)
│   ├── api/universities/route.ts   # Üniversite verisini cache header'larıyla JSON dönen public API
│   ├── universities/
│   │   ├── page.tsx                # Üniversite listesi (arama, şehir/tip filtreleri, URL sync, favoriler, API veri kaynağı)
│   │   └── [id]/
│   │       ├── layout.tsx          # SEO (`generateMetadata`) için Server Component
│   │       ├── page.tsx            # Üniversite detay Ui (`use client`)
│   │       └── departments/
│   │           └── [deptSlug]/
│   │               ├── layout.tsx  # Bölüm SEO (`generateMetadata`) Server Component
│   │               └── page.tsx   # Bölüm detay UI (`use client`)
│   ├── documents/page.tsx          # Belge cüzdanı (Supabase Storage upload/delete + premium empty state)
│   ├── favorites/page.tsx          # Favori üniversiteler listesi (premium empty state + 3 öneri kartı)
│   └── isee/page.tsx               # ISEE burs hesaplayıcı (scala equivalente formülü)
├── components/
│   ├── BottomNav.tsx               # Mobil alt navigasyon (4 sekme, ortada AI butonu)
│   ├── Navbar.tsx                  # Üst navigasyon (masaüstü + mobil, Clerk auth, dil butonu)
│   ├── HeroSection.tsx             # Ana sayfa Hero bölümü (başlık, rozet, CTA)
│   ├── FeaturesSection.tsx         # Ana sayfa 3'lü özellik grid kartları
│   ├── IseeSection.tsx             # Ana sayfa ISEE hesaplayıcı CTA kartı
│   ├── RouteTransition.tsx         # Route geçiş katmanı (Framer Motion + reduced-motion fallback)
│   ├── ScrollProgress.tsx          # Scroll ilerleme çubuğu (Framer Motion useScroll + useSpring)
│   ├── Footer.tsx                  # Alt bilgi (logo, sosyal etiketler)
│   └── ui/
│       ├── marquee.tsx             # Sonsuz kayan metin/ikon animasyon bileşeni (Magic UI yaklaşımı)
│       ├── animated-list.tsx       # Döngüsel bildirim/liste animasyon bileşeni
│       ├── border-beam.tsx         # Kart kenarı boyunca akan beam efekti (Magic UI tarzı)
│       └── pulsating-button.tsx    # Hero CTA için Magic UI pulsating button bileşeni
├── context/
│   └── LanguageContext.tsx          # TR/EN dil sistemi (Context + localStorage)
├── lib/
│   ├── supabaseClient.ts           # Supabase client (anon key)
│   ├── translations.ts             # Tüm UI çevirileri (TR + EN)
│   ├── utils.ts                    # `cn()` className birleştirme helper'ı
│   ├── useFavorites.ts             # Birleşik favori hook'u (localStorage + Supabase)
│   └── useUniversitiesData.ts      # Üniversite verisi için cache'li client fetch hook'u (/api/universities)
├── types/
│   └── index.ts                    # Paylaşılan tipler (Language, UserDocument)
├── next.config.ts                  # Next.js yapılandırması (remotePatterns: Unsplash, Pexels, plus.unsplash.com)
├── proxy.ts                        # Clerk Request Boundary (Next.js 16 standardı)
├── scripts/
│   ├── check-route-access.mjs      # Public/protected route matrisi smoke check
│   ├── validate-data-integrity.mjs # data.ts bütünlük kontrolü (id/slug/override/type dağılımı)
│   └── clean-med-data.mjs          # `med` kaynağını parse/temizleyip eşleşme+override çıktısı üretir
├── DATA_ENTRY_GUIDE.md             # Yeni bölüm/dil/süre/seviye giriş rehberi (default+override akışı)
├── SUPABASE_SECURITY_RUNBOOK.md    # Clerk + Supabase RLS adım adım operasyon rehberi
├── supabase/
│   └── rls_hardening.sql           # RLS + Storage policy hardening SQL scripti
└── public/                         # Varsayılan SVG'ler (file, globe, next, vercel, window)
```

---

## 🔑 Önemli Mimari Kararlar

### 1. Dil Sistemi (i18n)
- `context/LanguageContext.tsx` → React Context + `localStorage` ile dil tercihi saklanır
- `LanguageProvider`, aktif dili runtime'da `document.documentElement.lang` ile senkronlar
- `lib/translations.ts` → Tüm UI metinleri burada (navbar, hero, list, detail, isee, favorites, documents, bottomNav, department, featureAnimations)
- Üniversite verileri (`data.ts`) → `description_en`, `features_en` opsiyonel alanları ile çift dilli
- Dil değiştirme: Navbar ve üniversite listesi gibi toggle sunan ekranlarda `toggleLanguage()` çağrılır

### 2. Favori Sistemi (`lib/useFavorites.ts`)
- **Misafir kullanıcı:** `localStorage` → `italyPathFavorites` key'i
- **Giriş yapmış kullanıcı:** Supabase `favorites` tablosu (`user_id`, `university_id`)
- Giriş yapmış kullanıcı istekleri Clerk `supabase` JWT template token'ı ile Supabase'e gider (`createClerkSupabaseClient`)
- Hook tüm sayfalarda aynı API sunar: `{ favorites, toggleFavorite, isFavorite, loading, isLoggedIn }`
- Auth durumu değiştiğinde state deterministik temizlenir; logout sonrası stale favori state'i bırakılmaz
- Optimistic update uygulanmış (UI anında güncellenir, Supabase response `error` dönerse geri alınır)

### 3. AI Mentor Streaming
- **Backend** (`api/chat/route.ts`): `@google/generative-ai` paketi ile `sendMessageStream` kullanılır
- Tüm mesaj geçmişi Gemini chat history olarak iletilir (sohbet hafızası)
- Sistem promptu: Üniversite veritabanından oluşturulan bağlam + mentör kişilik tanımı
- İstek gövdesi temel şema doğrulamasından geçer (`messages[]`, rol, boş olmayan içerik, adet/uzunluk sınırları)
- `GEMINI_API_KEY` yoksa kontrollü `503` döner; malformed body doğrudan `500` üretmez
- **Frontend** (`ai-mentor/page.tsx`): `fetch` + `ReadableStream` + `TextDecoder` ile chunk chunk okuma
- `AbortController` ile kullanıcı yanıtı yarıda kesebilir (kırmızı durdur butonu)
- Stream başlayana kadar zıplayan 3 nokta animasyonu gösterilir
- Scroll davranışı chunk akışında stabil olacak şekilde ayarlanmıştır: yeni mesaj balonunda `smooth`, stream token güncellemelerinde `auto`
- AI Mentor ekranındaki temel UI metinleri artık `lib/translations.ts` üzerinden dil uyumlu çalışır

### 4. Belge Cüzdanı
- Supabase Storage `documents` bucket'ına dosya yükleme
- Supabase `user_documents` tablosuna metadata yazma
- Kamera ile doğrudan tarama (`capture="environment"`) veya galeriden dosya seçme
- Clerk `user.id` ile kullanıcıya özel dosya yolu: `{userId}/{timestamp}.{ext}`
- Belge görüntüleme için kalıcı public URL yerine kısa ömürlü signed URL (`createSignedUrls`) kullanılır
- Upload akışında storage başarılı, DB insert başarısız olursa yüklenen obje cleanup edilir
- Silme akışında hem storage hem DB response hataları kontrol edilir; sessiz başarısızlık bırakılmaz

### 5. Clerk Request Boundary (proxy.ts)
- `proxy.ts` dosyasında tanımlı (Next.js 16 yeni Request Boundary standardı uyarınca).
- Public rotalar: `/`, `/api/universities(.*)`, `/sign-in(.*)`, `/sign-up(.*)`, `/universities(.*)`, `/isee(.*)`, `/sitemap.xml`, `/robots.txt`
- Diğer tüm rotalar `auth.protect()` ile korumalı

### 6. Bölüm Detay Sayfaları
- `data.ts`'te bölüm kaynağı `DepartmentSeed[]` (giriş seviyesi: `{ name, slug }`) olarak tutulur.
- Uygulamanın kullandığı `departments` çıktısı normalize `Department[]` tipidir: `{ name, slug, languages, durationYears, level }`.
- Slug alanları veri setinde hazır tutulur; mevcut veriler bölüm adlarından türetilmiş URL-safe slug'lar içerir. Aynı üniversite içinde benzersizdir.
- Rota: `/universities/[id]/departments/[deptSlug]`
- SEO: `layout.tsx` (Server Component) → dinamik `generateMetadata()` — `page.tsx` ile aynı klasörde
- Üniversite detay sayfasındaki bölüm kartları `Link` ile bu rotaya yönlendirilir

### 7. Üniversite Veri Katmanı (`/api/universities` + `useUniversitiesData`)
- `app/api/universities/route.ts` üniversite verisini cache header'ları (`s-maxage`, `stale-while-revalidate`) ile JSON olarak döner
- `lib/useUniversitiesData.ts` client tarafında in-memory cache + request deduplication uygular
- `universities`, `favorites`, üniversite detay ve bölüm detay sayfaları veriyi bu hook üzerinden alır; `data.ts` doğrudan client import'u azaltılmıştır
- `data.ts` içinde `universitiesBaseData` (seed) + `universitiesData` (normalize metadata) ayrımı vardır; API katmanı `universitiesData` döner

### 11. Program Metadata Modeli (Dil / Süre / Seviye)
- Program metadata modeli: `languages: ProgramLanguage[]`, `durationYears: ProgramDurationYears`, `level: ProgramLevel`
- Geçerli değerler:
  - `ProgramLanguage`: `"en" | "it"`
  - `ProgramDurationYears`: `1 | 2 | 3 | 4 | 5 | 6`
  - `ProgramLevel`: `"bachelor" | "master"`
- Varsayılanlar merkezi uygulanır:
  - `languages = ["en"]`
  - `durationYears = 3`
  - `level = "bachelor"`
- İstisnalar `DepartmentKey` (`"${universityId}:${departmentSlug}"`) ile override map'lerinde tutulur:
  - `DEPARTMENT_LANGUAGE_OVERRIDES`
  - `DEPARTMENT_DURATION_OVERRIDES`
  - `DEPARTMENT_LEVEL_OVERRIDES`
- `createDepartmentKey(universityId, slug)` helper'ı override anahtar tutarlılığı için kullanılır.
- Mevcut durumda 24 program için `6 yıl + EN` override aktif (Medicine/Dentistry listesi).

### 8. Motion Erişilebilirlik & Native Hissiyat
- `components/RouteTransition.tsx` geçişleri blur/scale yerine hafif `opacity + y` ile çalışır; `AnimatePresence mode="popLayout"` kullanılır
- `BottomNav`, `HeroSection`, `ai-mentor/page.tsx` içinde `useReducedMotion` ile sürekli/pulse animasyonlar azaltılmış hareket tercihine göre devre dışı kalır
- `app/globals.css` içinde `@media (prefers-reduced-motion: reduce)` ile CSS tabanlı sonsuz animasyonlar kapatılır
- `app/globals.css` içindeki `overscroll-behavior-y: none` kaldırılarak platformun doğal scroll/overscroll davranışı korunur

### 9. Magic UI Esintili Bento Arka Planları
- Ana sayfa `FeaturesSection` kartları dekoratif arka plan katmanlarıyla çalışır: Üniversiteler kartında `Marquee`, Belge kartında `AnimatedList`, AI kartında `BorderBeam`
- Arka plan metinleri hard-code değil, `lib/translations.ts` içindeki `featureAnimations` alanından dil uyumlu (TR/EN) okunur
- Kartlarda `pointer-events-none` ve soft mask (`bg-gradient`) katmanı ile hem etkileşim güvenliği hem içerik okunurluğu korunur
- `BorderBeam` bileşeni Magic UI tekniğine yakın şekilde `offsetPath(rect)` + `offsetDistance` + mask compositing ile uygulanır; animasyon motoru ilk açılış güvenilirliği için CSS keyframe (`border-beam`) kullanır, reduced-motion modunda statik beam gösterir

### 10. Hero CTA Animasyonu
- Ana sayfadaki birincil CTA (`Hemen Başla / Get Started`) için `components/ui/pulsating-button.tsx` kullanılır
- Pulsating efekt global animasyon token'ı üzerinden (`--animate-pulsating-button`) `app/globals.css` içinde yönetilir
- Efekt yalnızca Hero CTA'da aktif olacak şekilde sınırlandırılmıştır

---

## 🛠️ Yapılan Değişiklikler 

BURADA DEĞİL BAŞKA DOSYADA! AGENT_COMMITS.MD DOSYASINA BAK!

## ⚠️ Bilinen Sorunlar & Açık Öneriler

### 🟡 Orta Öncelik
1. **PWA eksikleri:** `public/manifest.webmanifest` ve uygulama ikonları (`192x192`, `512x512`) oluşturulmalı. Şu anda tasarım aşamasındadır. Dokunma.
2. **Tekrarlanan görseller:** `data.ts`'te yeni eklenen 17 üniversite ve id 30+ üniversitelerin çoğu aynı placeholder görseli kullanıyor.
3. **Üniversite Karşılaştırma:** 2-3 üniversiteyi yan yana kıyaslama (ücret, bölüm sayısı, şehir, özellikler). Mevcut `data.ts` yapısıyla yapılabilir, ek veri gerekmez. Favori sisteminden beslenebilir.
4. **Şehir Rehberi:** Her şehir için yaşam maliyeti, ulaşım, iklim, öğrenci nüfusu bilgisi. Şehir filtresi zaten mevcut — detay sayfası eklenebilir.

### 🟢 Düşük Öncelik
1. **Supabase SSR:** `@supabase/ssr` paketi ile server/client ayrımı.
2. **Veri katmanı kısmen iyileştirildi, server taşınması uzun vadede hala açık**
   - Client kritik ekranlar artık `/api/universities` + `useUniversitiesData` kullanıyor.
   - `data.ts` halen API, sitemap/metadata ve chat context tarafında merkezi kaynak.
   - Veri büyüme trendi sürerse DB veya ayrı server-side content katmanına taşınmalı.
### 🧠 Bilinmeyen / Sessiz Tehditler

- **Bundle creep:** veri dosyası büyüdükçe performans düşüşü bir anda değil, sessizce ve parça parça hissedilir; bu tip tehditler geç fark edilir.

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
npm run check:data # data.ts bütünlük ve dağılım kontrolü
npm run clean:med  # med kaynağını temizleyip matched/unmatched/override çıktısı üretir
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
