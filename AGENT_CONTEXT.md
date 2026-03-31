# ItalyPath — Agent Context & Knowledge Base

> Bu dosya, projeyi anlayan bir AI agent tarafından oluşturulmuştur. Yeni agentler bu dosyayı okuyarak projenin mimarisini, yapılan değişiklikleri ve bilinen sorunları hızlıca kavrayabilir.

---

## 🎯 Proje Tanımı

İtalya'da eğitim almak isteyen Türk öğrenciler için **yapay zeka destekli rehber uygulaması**. Üniversite arama, AI mentörlük, belge yönetimi, ISEE burs hesaplayıcı, bölgesel burs haritası, kürate edilmiş topluluk rehberi, favoriler ve protected kişisel merkez (`/hub`) gibi özellikler sunar. Mobil öncelikli tasarıma sahiptir; temel mobil web app metadata'sı mevcut olsa da tam PWA paketi (manifest + ikon seti) henüz tamamlanmamıştır.

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
│   ├── sitemap.ts                  # Dinamik sitemap (statik rotalar + 64 üniversite + 240 bölüm)
│   ├── robots.ts                   # Robots.txt (seçili public rotalar açık, bazı korumalı rotalar kapalı)
│   ├── globals.css                 # Tailwind v4 + mobil PWA stilleri
│   ├── favicon.ico                 # Site ikonu
│   ├── data.ts                     # 64 üniversite, 240 bölüm verisi (seed + normalized metadata modeli)
│   ├── ai-mentor/page.tsx          # AI sohbet arayüzü (streaming + durdur butonu + prompt chip önerileri)
│   ├── api/chat/route.ts           # AI backend (Gemini streaming + sohbet hafızası)
│   ├── api/communities/route.ts    # Topluluk verisini cache header'larıyla JSON dönen public API
│   ├── api/scholarships/route.ts   # Burs verisini cache header'larıyla JSON dönen public API
│   ├── api/universities/route.ts   # Üniversite verisini cache header'larıyla JSON dönen public API
│   ├── communities/page.tsx         # Kürate edilmiş öğrenci toplulukları rehberi (public)
│   ├── topluluklar/page.tsx         # Türkçe kısa yol route'u (redirect -> /communities)
│   ├── universities/
│   │   ├── page.tsx                # Üniversite listesi (arama, şehir/tip filtreleri, URL sync, favoriler, grid/kompakt görünüm toggle + localStorage)
│   │   └── [id]/
│   │       ├── layout.tsx          # SEO (`generateMetadata`) için Server Component
│   │       ├── page.tsx            # Üniversite detay Ui (`use client`)
│   │       └── departments/
│   │           └── [deptSlug]/
│   │               ├── layout.tsx  # Bölüm SEO (`generateMetadata`) Server Component
│   │               └── page.tsx   # Bölüm detay UI (`use client`)
│   ├── documents/page.tsx          # Belge cüzdanı (Supabase Storage upload/delete + premium empty state)
│   ├── favorites/page.tsx          # Favori üniversiteler listesi (premium empty state + 3 öneri kartı)
│   ├── hub/page.tsx                # Protected kişisel merkez (Clerk profil kartı + Supabase özet + hızlı aksiyonlar)
│   ├── isee/page.tsx               # ISEE burs hesaplayıcı (scala equivalente formülü)
│   └── scholarships/page.tsx       # Bölgesel burs haritası sayfası (metadata + Suspense boundary)
├── components/
│   ├── BottomNav.tsx               # Mobil alt navigasyon (Ana Sayfa, Okullar, AI, Hub)
│   ├── Navbar.tsx                  # Üst navigasyon (masaüstü + mobil, Clerk auth, dil butonu)
│   ├── HeroSection.tsx             # Ana sayfa Hero bölümü (başlık, rozet, CTA)
│   ├── FeaturesSection.tsx         # Ana sayfa 3'lü özellik grid kartları
│   ├── IseeSection.tsx             # Ana sayfa ISEE hesaplayıcı CTA kartı
│   ├── ScholarshipsSection.tsx     # Ana sayfa burs haritası CTA kartı
│   ├── RouteTransition.tsx         # Route geçiş katmanı (Framer Motion + reduced-motion fallback)
│   ├── ScrollProgress.tsx          # Scroll ilerleme çubuğu (Framer Motion useScroll + useSpring)
│   ├── Footer.tsx                  # Alt bilgi (logo, sosyal etiketler)
│   ├── communities/
│   │   └── CommunityLinksExplorer.tsx # Topluluk listesi keşif ekranı (filtre + disclaimer + dış link kartları)
│   ├── scholarships/
│   │   └── ScholarshipsExplorer.tsx # Harita + bölge detay paneli (client)
│   └── ui/
│       ├── marquee.tsx             # Sonsuz kayan metin/ikon animasyon bileşeni (Magic UI yaklaşımı)
│       ├── animated-list.tsx       # Döngüsel bildirim/liste animasyon bileşeni
│       ├── border-beam.tsx         # Kart kenarı boyunca akan beam efekti (Magic UI tarzı)
│       ├── pulsating-button.tsx    # Hero CTA için Magic UI pulsating button bileşeni
│       └── expandable-screen.tsx   # Cult UI benzeri morph/expand geçiş bileşen seti (Trigger/Content/Hook)
├── context/
│   └── LanguageContext.tsx          # TR/EN dil sistemi (Context + localStorage)
├── lib/
│   ├── contentRepository.ts        # Supabase-first içerik deposu (universities/communities/scholarships + local fallback)
│   ├── supabaseClient.ts           # Supabase client (anon key)
│   ├── community-links.ts          # CommunityLink tipleri + editoryal topluluk verisi
│   ├── translations.ts             # Tüm UI çevirileri (TR + EN)
│   ├── utils.ts                    # `cn()` className birleştirme helper'ı
│   ├── useCommunitiesData.ts       # Topluluk verisi için cache'li client fetch hook'u (/api/communities)
│   ├── useFavorites.ts             # Birleşik favori hook'u (localStorage + Supabase)
│   ├── useScholarshipsData.ts      # Burs verisi için cache'li client fetch hook'u (/api/scholarships)
│   ├── useUniversitiesData.ts      # Üniversite verisi için cache'li client fetch hook'u (/api/universities)
│   └── scholarships/
│       └── regions.ts              # 20 bölge burs registry + verified/pending detay katmanı
├── types/
│   ├── index.ts                    # Paylaşılan tipler (Language, UserDocument)
│   └── scholarships.ts             # Bölgesel burs veri sözleşmesi tipleri
├── next.config.ts                  # Next.js yapılandırması (remotePatterns: Unsplash, Pexels, plus.unsplash.com)
├── proxy.ts                        # Clerk Request Boundary (Next.js 16 standardı)
├── scripts/
│   ├── check-route-access.mjs      # Public/protected route matrisi smoke check
│   ├── seed-supabase-content.mjs   # Lokal içerik kaynaklarını Supabase content tablolarına senkronlar
│   ├── validate-data-integrity.mjs # data.ts bütünlük kontrolü (id/slug/override/type dağılımı)
│   ├── clean-med-data.mjs          # `med` kaynağını parse/temizleyip eşleşme+override çıktısı üretir
│   └── utils/load-ts-module.mjs    # Node 20 ortamında TS modülleri script tarafında güvenli import helper'ı
├── DATA_ENTRY_GUIDE.md             # Yeni bölüm/dil/süre/seviye giriş rehberi (default+override akışı)
├── SUPABASE_CONTENT_MIGRATION.md   # Supabase içerik tabloları migration + seed çalışma rehberi
├── SUPABASE_SECURITY_RUNBOOK.md    # Clerk + Supabase RLS adım adım operasyon rehberi
├── supabase/
│   ├── content_schema.sql          # Content tabloları (`universities`, `departments`, `communities`, `scholarships`) + public read policy scripti
│   └── rls_hardening.sql           # RLS + Storage policy hardening SQL scripti
└── public/
    ├── data/italy-regions.geojson # Lokal bölgesel harita verisi (20 bölge)
    └── ...                         # Varsayılan SVG'ler (file, globe, next, vercel, window)
```

---

## 🔑 Önemli Mimari Kararlar

### 1. Dil Sistemi (i18n)
- `context/LanguageContext.tsx` → React Context + `localStorage` ile dil tercihi saklanır
- `LanguageProvider`, aktif dili runtime'da `document.documentElement.lang` ile senkronlar
- `lib/translations.ts` → Tüm UI metinleri burada (navbar, hero, list, detail, isee, scholarships, communities, favorites, documents, bottomNav, hub, department, featureAnimations)
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
- Sistem promptu: `contentRepository` üzerinden gelen üniversite verisinden dinamik bağlam + mentör kişilik tanımı (TTL cache)
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
- Public rotalar: `/`, `/api/universities(.*)`, `/api/communities(.*)`, `/api/scholarships(.*)`, `/sign-in(.*)`, `/sign-up(.*)`, `/universities(.*)`, `/isee(.*)`, `/scholarships(.*)`, `/communities(.*)`, `/topluluklar(.*)`, `/sitemap.xml`, `/robots.txt`
- Diğer tüm rotalar `auth.protect()` ile korumalı
- Protected örnekler: `/hub`, `/favorites`, `/documents`, `/ai-mentor`, `/api/chat`

### 6. Bölüm Detay Sayfaları
- `data.ts`'te bölüm kaynağı `DepartmentSeed[]` (giriş seviyesi: `{ name, slug }`) olarak tutulur.
- Uygulamanın kullandığı `departments` çıktısı normalize `Department[]` tipidir: `{ name, slug, languages, durationYears, level }`.
- Slug alanları veri setinde hazır tutulur; mevcut veriler bölüm adlarından türetilmiş URL-safe slug'lar içerir. Aynı üniversite içinde benzersizdir.
- Rota: `/universities/[id]/departments/[deptSlug]`
- SEO: `layout.tsx` (Server Component) → dinamik `generateMetadata()` — `page.tsx` ile aynı klasörde
- Üniversite detay sayfasındaki bölüm kartları `ExpandableScreenTrigger` ile açılış animasyonu başlatır; kısa expand geçişinden sonra route push yapılır
- Department detail root'u `ExpandableScreenContent` ile eşlenmiştir; "Diğer Bölümler" kartları da aynı morph/expand modelini kullanır
- Eski/cache kaynaklı eksik metadata alanlarına karşı runtime fallback uygulanır (`languages`, `durationYears`, `level`)

### 7. Üniversite Veri Katmanı (`contentRepository` + `/api/universities` + `useUniversitiesData`)
- `lib/contentRepository.ts` içerik için Supabase-first (anon read) strateji uygular; Supabase erişimi/tabloları yoksa lokal kaynaklara fallback döner
- `app/api/universities/route.ts` `contentRepository.getUniversities()` ile veriyi cache header'ları (`s-maxage`, `stale-while-revalidate`) ile JSON olarak döner
- `lib/useUniversitiesData.ts` client tarafında in-memory cache + request deduplication uygular
- `universities`, `favorites`, üniversite detay ve bölüm detay sayfaları veriyi bu hook üzerinden alır; `data.ts` doğrudan client import'u azaltılmıştır
- `data.ts` içinde `universitiesBaseData` (seed) + `universitiesData` (normalize metadata) ayrımı korunur; fallback ve seed script tarafında kaynak olarak kullanılır
- `app/universities/page.tsx` üzerinde görünüm seçici vardır: varsayılan premium kart/grid + kompakt liste modu.
- Görünüm tercihi `localStorage` içinde `italyPathUniversitiesViewMode` anahtarıyla saklanır; sayfa yenilemelerinde korunur.
- Görünüm state'i `useSyncExternalStore` ile SSR-safe okunur; TypeScript build widening riski explicit generic (`<UniversityViewMode>`) ile engellenmiştir.

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
- Hero satırına ikincil topluluk CTA'sı eklenmiştir (`/communities`), böylece public feature ana sayfadan direkt keşfedilebilir.

### 12. Liste Scroll Koruma & Back Davranışı
- Üniversite listesi -> detay geçişi sırasında kart linkleri `?from=list` query paramı taşır.
- Üniversite detay hero geri butonu `router.back()` + fallback (`/universities`) akışıyla çalışır.
- Böylece kullanıcı listeden bir okula girip geri döndüğünde scroll konumu/history bağlamı korunur.

### 13. Detail Route Transition Çakışma Önlemi
- `components/RouteTransition.tsx` içinde `/universities/[id]` ve `/universities/[id]/departments/[deptSlug]` rotalarında route-level opacity fade devre dışıdır.
- Amaç, shared-layout/morph geçiş sırasında görülen geçici ekran kararmasını engellemektir.

### 14. Bölgesel Burs Haritası (Scholarships)
- Rota: `/scholarships` (public)
- Sayfa yapısı: `app/scholarships/page.tsx` server component, client leaf `components/scholarships/ScholarshipsExplorer.tsx`
- `ScholarshipsExplorer` içinde bölgesel veri sözleşmesi `types/scholarships.ts`, veri kaynağı `lib/useScholarshipsData.ts` (`/api/scholarships`)
- `/api/scholarships` içeriği `contentRepository.getScholarshipsDataset()` üzerinden Supabase-first + local fallback stratejisiyle sunar
- Harita render modeli: 20 bölgeyi GeoJSON'dan SVG path'e çeviren client-side çizim (tıklanabilir path + aktif bölge marker)
- Dış bağımlılık kaldırıldı: harita GeoJSON kaynağı artık lokal dosya `public/data/italy-regions.geojson`
- Next.js 16 gereği `useSearchParams` kullanan client leaf, `app/scholarships/page.tsx` içinde `Suspense` boundary ile sarılmıştır (prerender/build hata önlemi)
- Kök hydration mismatch gürültüsünü azaltmak için `app/layout.tsx` içinde `<html>` ve `<body>` elementlerinde `suppressHydrationWarning` aktif
- Mobil taşma stabilizasyonu için grid/kart kapsayıcılarına `min-w-0` ve uzun link metinlerine `truncate` guard'ları eklendi; map alanı bölge değişiminde yatay overflow nedeniyle kayma/kırpma üretmez.
- SVG tarafında `preserveAspectRatio="xMidYMid meet"` açıkça set edilerek farklı cihaz en-boy oranlarında haritanın tutarlı ölçeklenmesi garanti altına alındı.

### 15. Kürate Edilmiş Öğrenci Toplulukları (Communities)
- Rota: `/communities` (public), ek kısa yol: `/topluluklar` (redirect -> `/communities`)
- Sayfa: `app/communities/page.tsx` (metadata + canonical), client leaf: `components/communities/CommunityLinksExplorer.tsx`
- Veri modeli: `lib/community-links.ts` içinde `CommunityPlatform`, `CommunityCategory`, `CommunitySizeHint`, `CommunityLink`
- Veri erişimi: `lib/useCommunitiesData.ts` üzerinden `/api/communities`; API katmanı `contentRepository.getCommunityLinks()` ile Supabase-first + local fallback döner
- Veri seti: User-confirmed WhatsApp/Telegram/Facebook girişleriyle düzenli genişletilir; güncel listede Bologna/Roma housing odaklı ve genel topluluk kayıtları da bulunur.
- İçerik yaklaşımı: resmi topluluk iddiası yok; sayfa açık şekilde "editoryal/kürate edilmiş dış topluluk rehberi" olarak konumlanır.
- Güven ilkeleri: fake üye sayısı, fake aktivite, fake social proof gösterilmez; kartlarda yalnızca status, verification source ve `lastCheckedAt` bilgisi bulunur.
- Keşfedilebilirlik: masaüstü navbar ve Hero CTA üzerinden topluluklara erişim açıktır; ayrıca `/hub` içindeki hızlı aksiyon kartları topluluklara geçiş sağlar.

### 16. Protected Hub / Hesabım (`/hub`)
- Rota: `/hub` (protected)
- Amaç: Clerk account panelinin kopyası değil, uygulama içi kişisel merkez deneyimi.
- Veri kaynağı:
  - Clerk: avatar, isim fallback zinciri, primary email, `openUserProfile()`, sign-out
  - Supabase: `user_documents` için count sorgusu (`head + exact count`)
  - Mevcut hook/state: `useFavorites` ile favori sayısı, `LanguageContext` ile aktif dil, `localStorage` ile `italyPathUniversitiesViewMode`
- V1 kapsamı: yeni Supabase tablo/policy/env yok; mevcut `favorites` ve `user_documents` altyapısı yeniden kullanılır.
- UI yapısı: profil hero kartı, 4 özet kartı (favoriler/belgeler/dil/liste görünümü), hızlı aksiyon grid'i (`favorites`, `documents`, `universities`, `communities`, `scholarships`, `ai-mentor`), hesap yönetimi CTA ve çıkış butonu.
- Güvenlik & indexleme: route public değil; `robots.txt` içinde `/hub` disallow.
- Navigasyon: signed-in kullanıcı için Navbar'da `/hub` linki bulunur; mobil BottomNav'da topluluk sekmesi Hub/Profil sekmesine dönüştürülmüştür (signed-out kullanıcıya login redirect).

### 17. Supabase Content Migration Katmanı
- Kapsam: `universities`, `university_departments`, `community_links`, `scholarship_regions`
- Şema scripti: `supabase/content_schema.sql` (tablolar + indeksler + `updated_at` trigger + public read policy)
- Seed scripti: `scripts/seed-supabase-content.mjs`
  - Kaynaklar: `app/data.ts`, `lib/community-links.ts`, `lib/scholarships/regions.ts`
  - Gerekli env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Runbook: `SUPABASE_CONTENT_MIGRATION.md`
- Uygulama davranışı: içerik sorgularında önce Supabase denenir; başarısız/tablo yok durumunda lokal kaynaklara otomatik fallback yapılır.
- Script runtime notu: Node 20 ortamında `.ts` modülleri için `scripts/utils/load-ts-module.mjs` transpile+import helper'ı kullanılır.

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
   - Client kritik ekranlar artık `/api/universities`, `/api/communities`, `/api/scholarships` + ilgili hook'ları kullanıyor.
   - Server tarafında `contentRepository` Supabase-first yaklaşımıyla merkezi erişim noktası oldu; `data.ts`/`community-links.ts`/`regions.ts` fallback + seed kaynağı olarak korunuyor.
   - Uzun vadede fallback kaynaklarının DB ile drift üretmemesi için otomatik sync/CI doğrulaması (nightly seed check) eklenebilir.
### 🧠 Bilinmeyen / Sessiz Tehditler

- **Bundle creep:** veri dosyası büyüdükçe performans düşüşü bir anda değil, sessizce ve parça parça hissedilir; bu tip tehditler geç fark edilir.

---

## 🔐 Environment Değişkenleri

Dosya: `.env.local` (git'te yok, `.gitignore`'da)

| Değişken | Kullanım |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonim API anahtarı |
| `SUPABASE_SERVICE_ROLE_KEY` | Content seed/migration scripti (`npm run seed:supabase`) için servis rolü anahtarı (client'a verilmez) |
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
npm run check:routes # proxy.ts public/protected route matrisi doğrulaması
npm run check:data # data.ts bütünlük ve dağılım kontrolü
npm run clean:med  # med kaynağını temizleyip matched/unmatched/override çıktısı üretir
npm run seed:supabase # içerik verisini Supabase content tablolarına senkronlar
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

-- Content tabloları (script ile yönetilir)
-- Kaynak: supabase/content_schema.sql
CREATE TABLE universities (...);
CREATE TABLE university_departments (...);
CREATE TABLE community_links (...);
CREATE TABLE scholarship_regions (...);
```

> ⚠️ `favorites` ve `user_documents` yapıları koddan tahmin edilmiştir. Content tablolarının canonical sürümü `supabase/content_schema.sql` dosyasında tutulur.

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
