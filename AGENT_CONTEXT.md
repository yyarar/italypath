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
│   ├── ai-mentor/page.tsx          # Danışma Masaları hub'ı: 3 kanal (AI aktif, Gönüllü Ekip + Uzman yakında); state-toggle hub ↔ chat room
│   ├── api/chat/route.ts           # AI backend (Gemini streaming + sohbet hafızası)
│   ├── api/universities/route.ts   # Üniversite verisini cache header'larıyla JSON dönen public API
│   ├── cities/page.tsx             # İtalya Şehir Rehberleri ana sayfası (metadata + Suspense boundaries)
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
│   ├── hub/page.tsx                # Protected editöryel çalışma dosyası (orchestrator: DossierHero + StageStrip + 2×2 Bento + Tercihler + Account footer)
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
│   ├── cities/
│   │   └── CityGuidesExplorer.tsx  # İki sütunlu editoryal Şehir Rehberleri atlası
│   ├── communities/
│   │   └── CommunityAtlas.tsx       # Editöryel topluluk atlası (5 ihtiyaç-bölümü, hybrid editor voice, no filter/badge)
│   ├── hub/
│   │   ├── DossierTopStrip.tsx      # Profil chip (avatar + ad + email) + sağ üst ITALYPATH·tarih etiketi
│   │   ├── DossierHero.tsx          # Eyebrow + stage-aware serif h1 (italic sage second-read) + dinamik lede + 2-cell stat strip
│   │   ├── StageStrip.tsx           # 5 aşama yatay rail (Keşif→Sonuç) — tıklanabilir, layoutId marker, pulse ring, reduced-motion guard
│   │   ├── BentoGrid.tsx            # 2×2 grid wrapper (mobile 4-stack), 36px label kolonu
│   │   ├── KisaListeCell.tsx        # Favoriler top-3 önizleme + empty state ("/12" aspirational cap)
│   │   ├── BelgeCell.tsx            # 8-item core kit checklist (sequential mapping — editorial conceit), empty/unavailable states
│   │   ├── BursNotuCell.tsx         # Tinted krem cell, serif italic pull-quote terracotta 「」 brackets
│   │   ├── ToplulukNotuCell.tsx     # Editöryel nudge + 3 dekoratif tag pill
│   │   ├── PreferencesStrip.tsx     # Dil toggle + Liste görünümü read-only + Mentor masası (italyPathLastMentorDesk forward-compat)
│   │   └── AccountFooter.tsx        # Sessiz hesap aksiyonları (manage + sign-out, terracotta hover, tactile :active)
│   ├── mentor/
│   │   ├── MentorTopBar.tsx         # Hub + chat ortak header (back link, identity, status badge, lang toggle)
│   │   ├── MentorHub.tsx            # 3-masa danışma roster (AI / Gönüllü Ekip / Uzman) editöryel satırlar
│   │   ├── MentorChatRoom.tsx       # Editöryel sütun chat kabuğu (her 3 masa için aynı shell, locked branch)
│   │   ├── EntryPair.tsx            # SORU NN etiketi + sans-bold soru + hairline + serif Markdown cevap + ink cursor
│   │   ├── StarterPrompts.tsx       # AI boş-ekran 4 prompt chip (sparkle/indigo yok)
│   │   └── LockedDeskNotice.tsx     # Yakında masaları için merkezi editöryel kart + mailto notify CTA
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
│   ├── supabaseClient.ts           # Supabase client (anon key)
│   ├── community-links.ts          # CommunityLink tipleri + editoryal topluluk verisi (her kayıt `chapter` alanına sahip)
│   ├── translations.ts             # Tüm UI çevirileri (TR + EN)
│   ├── utils.ts                    # `cn()` className birleştirme helper'ı
│   ├── useFavorites.ts             # Birleşik favori hook'u (localStorage + Supabase)
│   ├── useUniversitiesData.ts      # Üniversite verisi için cache'li client fetch hook'u (/api/universities)
│   ├── cities/
│   │   └── data.ts                 # 8 ana öğrenci şehri (Milano, Roma, Bologna...) editoryal veri tabanı + fallback
│   ├── communities/
│   │   └── chapters.ts             # 5 ihtiyaç-bölümü metadata (TR/EN title/intro/citySummary) + getCommunitiesByChapter() bucketer
│   ├── hub/
│   │   ├── stages.ts                # STAGE_IDS (discovery/shortlist/documents/application/result) + HubStageId/StageState tipleri + getStageState() helper
│   │   ├── useHubStage.ts           # `italyPathStage` localStorage hook'u (useSyncExternalStore + cross-tab `italypath-hub-stage-change` event)
│   │   └── useDocumentsCount.ts     # Supabase user_documents head+count sorgusu (Clerk JWT, error-tolerant)
│   ├── mentor/
│   │   └── channels.ts             # 3 danışma masası tanımı (AI / volunteer / expert) + MentorChannel tipleri + getMentorChannel() helper
│   └── scholarships/
│       └── regions.ts              # 20 bölge burs registry + verified/pending detay katmanı
├── types/
│   ├── index.ts                    # Paylaşılan tipler (Language, UserDocument)
│   ├── cities.ts                   # Şehir rehberi veri sözleşmesi tipleri
│   └── scholarships.ts             # Bölgesel burs veri sözleşmesi tipleri
├── next.config.ts                  # Next.js yapılandırması (remotePatterns: Unsplash, Pexels, plus.unsplash.com)
├── proxy.ts                        # Clerk Request Boundary (Next.js 16 standardı)
├── scripts/
│   ├── check-route-access.mjs              # Public/protected route matrisi smoke check
│   ├── validate-supabase-university-data.mjs # Supabase üniversite veri doğrulaması (npm run check:data hedefi)
│   ├── validate-data-integrity.mjs         # data.ts bütünlük kontrolü (npm run check:local-data)
│   ├── check-editorial-ui.mjs              # Editorial UI tokens smoke check (paper/sage/terracotta + serif kullanımı)
│   ├── check-isee-calculator.mjs           # ISEE hesaplayıcı formül doğrulaması
│   ├── check-scholarships-editorial-atlas.mjs # Scholarships atlas yapısı doğrulaması
│   ├── check-universities-field-guide.mjs  # Universities sayfası alan rehberi doğrulaması
│   ├── check-university-data-source.mjs    # Üniversite veri kaynağı (Supabase vs data.ts) tutarlılığı
│   ├── check-university-department-merge.mjs # Üniversite-bölüm merge doğrulaması
│   └── clean-med-data.mjs                  # `med` kaynağını parse/temizleyip eşleşme+override çıktısı üretir
├── DATA_ENTRY_GUIDE.md             # Yeni bölüm/dil/süre/seviye giriş rehberi (default+override akışı)
├── SUPABASE_SECURITY_RUNBOOK.md    # Clerk + Supabase RLS adım adım operasyon rehberi
├── supabase/
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

### 3. AI Mentor → Consultation Desks Hub
- `/ai-mentor` artık üç-masalı danışma hub'ı: **ItalyPath AI** (aktif, Gemini), **ItalyPath Gönüllü Ekip** (yakında, ücretsiz/sınırlı), **ItalyPath Uzman** (yakında, ücretli)
- Tek route, state-toggle: sayfa açılınca hub görünür → masaya tıkla → chat room'a `AnimatePresence mode="wait"` geçişi → `Masalar` butonu hub'a döner
- UI editöryel sütun: bubble yok, avatar yok, sparkle yok, "online" status yok — rol typography ile ayrılır (sans-bold soru / serif Markdown cevap)
- **EntryPair anatomy**: terracotta `SORU NN` micro-label → sans bold soru → hairline border → serif Markdown response → ink streaming cursor (`.animate-pulse-cursor`, `prefers-reduced-motion` guard'lı)
- Per-channel message history aynı oturum içinde korunur (`Record<MentorChannelId, ChatMessage[]>`); `Sıfırla` sadece aktif kanalı temizler, hub'a gitmez
- Kilitli masalar (Gönüllü Ekip + Uzman): aynı chat shell + `LockedDeskNotice` (editöryel monogram + serif "yakında" + `mailto:contact@italypath.com` notify CTA); input disabled
- **Backend** (`api/chat/route.ts`): değişmedi — `@google/generative-ai` `sendMessageStream`, full history, Üniversite veritabanından sistem promptu, ReadableStream yanıt, malformed body → 400, no key → 503
- **Frontend stream** (`app/ai-mentor/page.tsx`): `fetch` + `ReadableStream` + `TextDecoder` chunk okuma, `AbortController` durdur — eski davranış birebir korundu; channel switch sırasında inflight stream abort edilir
- Status vocabulary: `HAZIR` (idle muted) / `YAZIYOR…` (streaming sage) / `YAKINDA` (locked muted) / `HATA` (error terracotta) — top bar'da `AnimatePresence` ile cross-fade
- Component decomposition: `MentorHub`, `MentorChatRoom`, `EntryPair`, `LockedDeskNotice`, `StarterPrompts`, `MentorTopBar` — her biri `components/mentor/` altında, tek sorumluluk
- Channel meta: `lib/mentor/channels.ts` — `MentorChannel` tipi + `MENTOR_CHANNELS` array + `getMentorChannel()` helper
- Translations: `t.aiMentor` bloğu tamamen yeniden yazıldı — hub + status + channels nested shape; eski `welcome`/`thinking`/`title` keys kaldırıldı, AI welcome mesajı silindi (boş ekran starter prompts gösterir)

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
- Public rotalar: `/`, `/api/universities(.*)`, `/sign-in(.*)`, `/sign-up(.*)`, `/universities(.*)`, `/cities(.*)`, `/isee(.*)`, `/scholarships(.*)`, `/communities(.*)`, `/topluluklar(.*)`, `/sitemap.xml`, `/robots.txt`
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

### 7. Üniversite Veri Katmanı (`/api/universities` + `useUniversitiesData`)
- `app/api/universities/route.ts` üniversite verisini cache header'ları (`s-maxage`, `stale-while-revalidate`) ile JSON olarak döner
- `lib/useUniversitiesData.ts` client tarafında in-memory cache + request deduplication uygular
- `universities`, `favorites`, üniversite detay ve bölüm detay sayfaları veriyi bu hook üzerinden alır; `data.ts` doğrudan client import'u azaltılmıştır
- `data.ts` içinde `universitiesBaseData` (seed) + `universitiesData` (normalize metadata) ayrımı vardır; API katmanı `universitiesData` döner
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
- `ScholarshipsExplorer` içinde bölgesel veri sözleşmesi `types/scholarships.ts`, veri kaynağı `lib/scholarships/regions.ts`
- Harita render modeli: 20 bölgeyi GeoJSON'dan SVG path'e çeviren client-side çizim (tıklanabilir path + aktif bölge marker)
- Dış bağımlılık kaldırıldı: harita GeoJSON kaynağı artık lokal dosya `public/data/italy-regions.geojson`
- Next.js 16 gereği `useSearchParams` kullanan client leaf, `app/scholarships/page.tsx` içinde `Suspense` boundary ile sarılmıştır (prerender/build hata önlemi)
- Kök hydration mismatch gürültüsünü azaltmak için `app/layout.tsx` içinde `<html>` ve `<body>` elementlerinde `suppressHydrationWarning` aktif
- Mobil taşma stabilizasyonu için grid/kart kapsayıcılarına `min-w-0` ve uzun link metinlerine `truncate` guard'ları eklendi; map alanı bölge değişiminde yatay overflow nedeniyle kayma/kırpma üretmez.
- SVG tarafında `preserveAspectRatio="xMidYMid meet"` açıkça set edilerek farklı cihaz en-boy oranlarında haritanın tutarlı ölçeklenmesi garanti altına alındı.

### 15. Editöryel Topluluk Atlas'ı (Communities)
- Rota: `/communities` (public), ek kısa yol: `/topluluklar` (redirect -> `/communities`)
- Sayfa: `app/communities/page.tsx` (metadata + canonical), client leaf: `components/communities/CommunityAtlas.tsx` — eski filter/badge dashboard tamamen kaldırıldı
- Veri modeli: `lib/community-links.ts` içinde `CommunityPlatform`, `CommunityCategory`, `CommunitySizeHint`, `CommunityLink` + **yeni** `CommunityChapter` alanı (her topluluk bir ihtiyaç-bölümüne atanır, zorunlu)
- Bölüm metadata: `lib/communities/chapters.ts` — `CommunityChapterMeta` (TR/EN title/intro/citySummary) + `getCommunitiesByChapter()` bucketer (status-then-name sıralı)
- 5 ihtiyaç-bölümü: `preparation` (3 topluluk), `housing` (4), `university` (5), `city-voice` (5), `pan-italy` (2) = toplam 19
- UI iskeleti: top bar + hero (eyebrow + serif H1 + intro + terracotta-bordered kürasyon notu) + İçindekiler (lg: 5-sütun grid, mobil: `mask-fade-horizontal` snap strip) + 5 bölüm bloğu + footer "Topluluk Öner" mailto CTA
- Bölüm bloğu: terracotta numara (01..05) + `font-serif text-3xl/4xl` başlık + italic serif intro + LinkRow listesi
- Entry row anatomy: 2-harf platform monogram (WA sage / TG terracotta / FB ink, ikon yok) + name + sağda `region · last-checked` meta + opsiyonel italic serif blurb (sadece `editorialNote` dolu olanlarda — hybrid voice) + `AÇ ↗` terracotta dış-link
- Search/filter/badge UI tamamen kaldırıldı — atlas yapısı kendi navigasyonunu sağlar; İçindekiler hash anchor'lar (`#chapter-housing` vs.) ile bölümlere atlar
- İçerik yaklaşımı: resmi topluluk iddiası yok; sayfa "editoryal/kürate edilmiş dış topluluk rehberi" olarak konumlanır; fake üye sayısı/aktivite/social proof yok
- Atlas pattern, scholarships sayfası ile aynı görsel dilden (paper background, serif + sans, border-divided rows, no SaaS cards)
- Keşfedilebilirlik: masaüstü navbar, Hero CTA ve `/hub` hızlı aksiyon kartları üzerinden erişim açık

### 16. Protected Hub / Çalışma Dosyası (`/hub`)
- Rota: `/hub` (protected, `auth.protect()` via proxy.ts)
- Amaç: editöryel "çalışma dosyası" deneyimi — ana sayfadaki StudyDossier kartının tam sayfaya açılmış hali. Generic SaaS dashboard değil.
- **Görsel dil:** editöryel paper/sage/terracotta palet, serif manşetler, sharp borders. Gradient/sparkle/indigo yasak. Hero h1 stage'a göre dinamik (`Belge toplama *aşamasındasın*` gibi italic sage second-read).
- **Mimari:** `app/hub/page.tsx` orchestrator + signed-out + skeleton; tüm görsel yapı `components/hub/` altında 10 stateless component'te (DossierTopStrip · DossierHero · StageStrip · BentoGrid · 4 cell · PreferencesStrip · AccountFooter).
- **Sayfa iskeleti (üstten alta):** top strip (profil chip + tarih) → hero (eyebrow + serif h1 + lede + 2-cell stat strip Favori/Belge) → 5 adımlı StageStrip → 2×2 Bento (Kısa Liste · Belge Kontrolü · Burs Notu krem · Topluluk) → 3-cell Tercihler şeridi → AccountFooter.
- **Aşama takibi:** localStorage `italyPathStage` (5 sabit ID: discovery/shortlist/documents/application/result). `lib/hub/useHubStage.ts` hook'u `useSyncExternalStore` + cross-tab event ile sync sağlar. Tıkla → aşamayı set et; öncekiler otomatik "done" türetilir. Aktif step terracotta üst-bar + sage nabız (CSS `animate-hub-stage-pulse`, reduced-motion guard'lı).
- **Bento cell border kuralı:** `sm:[&:nth-child(odd)]:border-r` + `sm:[&:nth-child(n+3)]:border-b-0` + `last:border-b-0` — wrapper border ile çakışmasın diye `border-r` mobile'da YOK.
- **Veri kaynakları (yeni Supabase tablosu YOK):**
  - Clerk: avatar, isim fallback zinciri, primary email, `openUserProfile()`, sign-out
  - Supabase: `user_documents` count (`lib/hub/useDocumentsCount.ts`, error-tolerant, "unavailable" state)
  - Mevcut hook/state: `useFavorites` (favori sayısı + ilk 3), `useUniversitiesData` (favori isim/şehir resolve), `LanguageContext`, localStorage `italyPathUniversitiesViewMode` (canonical import `UNIVERSITIES_VIEW_MODE_STORAGE_KEY` from `lib/universitiesFilters.ts`)
  - Forward-compat: `italyPathLastMentorDesk` localStorage anahtarı PreferencesStrip'te okunur ama henüz yazan yok (mentor sayfası yazınca aktif olur)
- **Belge checklist editorial conceit:** 8-item core kit (Pasaport/Transkript/Dil/Diploma/Motivasyon/CV/Tavsiye/İSEE) sıralı done-mapping — döküman TYPE'ı saklanmadığından sıralı tick decorative; home StudyDossier ile aynı konvansiyon.
- **Token + animasyon eklentileri:** `--editorial-band: #f5f1e8` (krem) ve `@keyframes hub-stage-pulse` (2.4s) — `app/globals.css` içine eklendi, reduced-motion media query'ye dahil.
- **Translations:** `t.hub` namespace TR + EN paralel; yeni nested key'ler (dossierEyebrow, dossierHeadline, dossierLede, stages, heroStats, bento, preferences, accountFooter, topStripEyebrow, stageStripLabel, bentoStripLabel, preferencesStripLabel). Eski hub key'leri (statusGettingStarted, summaryTitle, quickActionsTitle, profileBadge, action* vb.) tamamen kaldırıldı.
- **Güvenlik & indexleme:** `robots.txt` disallow `/hub`; sitemap'te yok.
- **Navigasyon:** signed-in kullanıcı için Navbar'da `/hub` linki; mobil BottomNav'ın 4. sekmesi (signed-out → sign-in redirect).
- **Açık follow-up (kritik değil):** mentor sayfasından `italyPathLastMentorDesk` write ekle; DossierHero'daki `/ 12` ve `/ 8` magic number'lar sabite çıkarılabilir.
- **Spec/Plan:** [`docs/superpowers/specs/2026-05-18-hub-redesign-design.md`](docs/superpowers/specs/2026-05-18-hub-redesign-design.md) · [`docs/superpowers/plans/2026-05-18-hub-redesign-plan.md`](docs/superpowers/plans/2026-05-18-hub-redesign-plan.md)

### 17. Editoryal Şehir Rehberleri (Cities)
- **Rota:** `/cities` (public)
- **Sayfa:** `app/cities/page.tsx` (metadata + canonical), client leaf: `components/cities/CityGuidesExplorer.tsx`
- **Veri Modeli:** `types/cities.ts` & `lib/cities/data.ts` - 8 ana öğrenci şehri (Milano, Roma, Bologna, Torino, Padova, Pisa, Pavia, Trento) için detaylı yaşam maliyetleri, kira aralıkları, aylık ulaşım giderleri, iklim/öğrenci atmosferi ve editoryal tüyolar. Diğer 38 şehir için dinamik fallback şablonu.
- **UI & UX:** İki sütunlu editoryal atlas tasarımı. Sol tarafta üniversite/bölüm sayılarına göre sıralı şehir listesi, sağ tarafta seçili şehre ait detay paneli. Detay panelinde o şehirde yer alan üniversitelerin dinamik linkleri listelenir.
- **Entegrasyonlar:** Üniversite rehber kartlarındaki ve üniversite detay başlıklarındaki şehir isimleri tıklanabilir hale getirilerek `/cities?city={city}` adresine akıllı geçişler sağlanmıştır. UniversitiesHero üzerindeki "şehir" stat hücresi de `/cities` atlasına bağlanmıştır.
- **SEO & Güvenlik:** `proxy.ts` public route matrix'ine eklenmiş, sitemap ve robots.txt kuralları ile endekslenmeye açılmıştır.

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
npm run dev                              # http://localhost:3000
npm run build                            # Production build
npm run lint                             # ESLint kontrolü
npm run check:routes                     # proxy.ts public/protected route matrisi doğrulaması
npm run check:data                       # Supabase üniversite veri doğrulaması (validate-supabase-university-data.mjs)
npm run check:local-data                 # data.ts bütünlük kontrolü (validate-data-integrity.mjs)
npm run check:isee                       # ISEE hesaplayıcı formül doğrulaması
npm run check:scholarships-ui            # Scholarships atlas yapısı doğrulaması
npm run check:universities-ui            # Universities field guide doğrulaması
npm run check:editorial-ui               # Editorial UI tokens smoke check
npm run check:university-data-source     # Üniversite veri kaynağı (Supabase vs data.ts) tutarlılığı
npm run check:university-department-merge # Üniversite-bölüm merge doğrulaması
npm run clean:med                        # med kaynağını parse + matched/unmatched/override çıktısı
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
