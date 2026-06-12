# ItalyPath - Agent Context & Knowledge Base

Bu dosya yeni agent'larin projeyi hizli ve dogru anlamasi icin tutulur. Degisiklik gecmisi icin `AGENT_COMMITS.md`, son audit notlari icin `AGENT_CONTEXT_FIX_REPORT.md` okunabilir; bu dosya ise guncel mimari ve calisma kurallarinin kaynak dokumanidir.

Son guncelleme: 2026-06-12

---

## Proje Tanimi

ItalyPath, Italya'da egitim almak isteyen Turk ogrenciler icin Next.js tabanli rehber uygulamasidir. Public tarafta universite/program arama, sehir rehberleri, bolgesel burs haritasi, ISEE hesaplayici ve kurate edilmis topluluk rehberi vardir. Giris gerektiren tarafta AI mentor, favoriler, belge cuzdani ve kisisel calisma dosyasi (`/hub`) bulunur.

Uygulamanin ana tasarim dili editorial paper/sage/terracotta paleti, serif basliklar, keskin border'lar ve mobil oncelikli layout'lardir. Gradient/sparkle/indigo SaaS kalibi yeni islerde genellikle tercih edilmez.

---

## Teknoloji Yigini

| Katman | Teknoloji | Surum |
| --- | --- | --- |
| Framework | Next.js App Router | 16.1.6 |
| UI | React / React DOM | 19.2.3 |
| Stil | Tailwind CSS | v4 |
| Animasyon | Framer Motion | 12.34.0 |
| Ikon | Lucide React | 0.563.0 |
| Markdown | React Markdown | 10.1.0 |
| Auth | Clerk (`@clerk/nextjs`) | 6.37.3 |
| Database/Storage | Supabase JS | 2.95.3 |
| AI | Google Gemini (`@google/generative-ai`) | 0.24.1 |
| AI SDK paketleri | `ai`, `@ai-sdk/google`, `@ai-sdk/react` | Kurulu, aktif mentor akisi native Gemini |
| Dil | TypeScript | 5.x |

Not: AI SDK paketleri kurulu olsa da `app/api/chat/route.ts` ve `app/ai-mentor/page.tsx` mevcut akista `@google/generative-ai` ile native streaming kullanir. `@ai-sdk/react` `useChat` hook'u aktif degildir.

---

## Kritik Proje Yapisi

Bu agac tam envanter degil; mimariyi anlamak icin aktif yuzeyleri ozetler.

```text
italypath-main/
├── app/
│   ├── layout.tsx                  # ClerkProvider, LanguageProvider, MobileZoomLock, RouteTransition, BottomNav
│   ├── page.tsx                    # Home orchestrator; stats /api/universities kaynakli
│   ├── sitemap.ts                  # getUniversitiesData() ile dinamik sitemap
│   ├── robots.ts                   # Public/protected indexleme kurallari
│   ├── data.ts                     # Local seed + paylasilan University/Department/Program tipleri
│   ├── api/
│   │   ├── universities/route.ts   # force-dynamic, no-store, Supabase-backed public API
│   │   └── chat/route.ts           # Protected Gemini streaming endpoint
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── ai-mentor/page.tsx          # Protected consultation desks UI
│   ├── universities/
│   │   ├── page.tsx                # Search/filter/favorites/view-mode list
│   │   └── [id]/
│   │       ├── layout.tsx          # Server generateMetadata
│   │       ├── page.tsx            # Client university portrait
│   │       └── departments/[deptSlug]/
│   │           ├── layout.tsx      # Server generateMetadata
│   │           └── page.tsx        # Client program portrait + admission details
│   ├── cities/page.tsx
│   ├── communities/page.tsx
│   ├── topluluklar/page.tsx        # redirect -> /communities
│   ├── yasal/[slug]/page.tsx       # Public legal pages (gizlilik/kullanim/cerez)
│   ├── scholarships/page.tsx
│   ├── isee/page.tsx
│   ├── favorites/page.tsx
│   ├── documents/page.tsx
│   └── hub/page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── BottomNav.tsx
│   ├── MobileZoomLock.tsx          # Coarse pointer pinch/double-tap/edge-swipe guard
│   ├── RouteTransition.tsx
│   ├── HeroSection.tsx
│   ├── FeaturesSection.tsx
│   ├── VelocityBridge.tsx
│   ├── ScholarshipsSection.tsx
│   ├── IseeSection.tsx
│   ├── Footer.tsx
│   ├── cities/CityGuidesExplorer.tsx
│   ├── communities/CommunityAtlas.tsx
│   ├── scholarships/ScholarshipsExplorer.tsx
│   ├── universities/              # Filter bar, hero, states, row renderers
│   ├── university-details/         # Portrait headers, program directory, admission panel
│   ├── mentor/                     # Mentor hub/chat room/topbar/entry/locked notice
│   ├── legal/                      # LegalDocument.tsx (yasal belge sunum bileseni)
│   ├── hub/                        # Dossier components
│   └── ui/                         # Small reusable UI/motion helpers; bento-grid/scroll velocity are legacy unless imported
├── context/LanguageContext.tsx
├── lib/
│   ├── supabaseClient.ts           # Browser anon client + Clerk JWT client helper
│   ├── universities.server.ts      # Supabase-backed live university composer
│   ├── useUniversitiesData.ts      # Client fetch/dedupe/in-memory cache over /api/universities
│   ├── universitiesFilters.ts      # Search/filter/view mode utilities and storage key
│   ├── universityDefaults.ts
│   ├── universityStats.ts
│   ├── useFavorites.ts
│   ├── translations.ts
│   ├── cities/data.ts
│   ├── communities/chapters.ts
│   ├── community-links.ts
│   ├── legal/documents.ts          # Yasal sayfa metinleri (TR) + footer/sitemap linkleri
│   ├── hub/
│   ├── mentor/channels.ts
│   └── scholarships/regions.ts
├── types/
│   ├── index.ts                    # Shared app types + Supabase row interfaces
│   ├── cities.ts
│   └── scholarships.ts
├── public/data/italy-regions.geojson
├── scripts/
│   ├── check-route-access.mjs
│   ├── check-cities-data.mjs
│   ├── check-program-details.mjs
│   ├── check-university-data-source.mjs
│   ├── check-university-detail-portrait.mjs
│   ├── check-universities-server-compose.mjs
│   ├── validate-supabase-university-data.mjs
│   ├── validate-data-integrity.mjs
│   ├── import-*-program-details.mjs
│   └── clean-med-data.mjs
├── supabase/
│   ├── rls_hardening.sql
│   └── program_admission_details.sql
├── DATA_ENTRY_GUIDE.md
├── SUPABASE_SECURITY_RUNBOOK.md
├── AGENT_COMMITS.md
└── AGENT_CONTEXT_FIX_REPORT.md
```

---

## Veri Katmani: Mutlaka Dogru Anla

### Local seed ve tip kaynagi

`app/data.ts` halen `University`, `Department`, `ProgramAdmissionDetails` gibi uygulama tiplerinin ana kaynagidir ve local seed verisini tasir.

Son local integrity kontrolunde:

- `64` university
- `240` department
- local seed level dagilimi: tamami `bachelor`

Bu local sayilar canli UI/API sayisi olarak kabul edilmemeli.

### Canli university/program verisi

Canli veri `lib/universities.server.ts` icinde Supabase'den compose edilir:

- `universities`
- `university_departments`
- `program_admission_details`

`getUniversitiesData()` bu uc tabloyu sayfali sekilde ceker, normalize eder, `Department.admissionDetails` alanini ilgili department'a ekler ve `University[]` dondurur.

Son Supabase dogrulamasinda:

- `64` university
- `972` department
- level dagilimi: `243 bachelor`, `721 master`, `8 single-cycle`
- language dagilimi: `972 en`, `50 it`

### API ve cache kurali

`app/api/universities/route.ts`:

- `export const dynamic = "force-dynamic"`
- `Cache-Control: no-store, max-age=0`
- hata durumunda `503`

`lib/useUniversitiesData.ts`:

- browser fetch icin `cache: "no-store"`
- client process icinde in-memory cache + request dedupe yapar

`scripts/check-university-data-source.mjs`, live data surfaces icinde `universitiesData`/`app/data.ts` kullanilmasini yasaklar. `/api/universities`, sitemap, university metadata layout'lari ve chat context `getUniversitiesData()` uzerinden calismalidir.

---

## Program Modeli ve Admission Details

`app/data.ts` program tipleri:

- `ProgramLanguage`: `"en" | "it"`
- `ProgramDurationYears`: `1 | 2 | 3 | 4 | 5 | 6`
- `ProgramLevel`: `"bachelor" | "master" | "single-cycle"`
- `Department`: `id?`, `name`, `slug`, `languages`, `durationYears`, `level`, `admissionDetails?`

Local seed default'lari:

- `languages = ["en"]`
- `durationYears = 3`
- `level = "bachelor"`

Supabase canli veri master ve single-cycle satirlarini da tasir. Yeni program importlari icin `university_departments.level` check constraint'i `bachelor`, `master`, `single-cycle` kabul eder.

### Admission details veri sozlesmesi

`program_admission_details` tablosu ve `ProgramAdmissionDetails` modeli su yuzeyleri besler:

- official program URL
- official call URL
- tuition/fees URL
- campus
- degree class
- admission type
- raw teaching language
- EU / non-EU application deadline
- academic requirements
- language requirements
- required documents
- entry exam/test
- source quotes
- uncertain fields
- uncertainty notes

UI paneli: `components/university-details/ProgramAdmissionDetailsPanel.tsx`.

DB setup/policy: `supabase/program_admission_details.sql`.

Dogrulama: `npm run check:program-details` ve `node scripts/check-universities-server-compose.mjs`.

---

## Auth ve Route Matrix

Route guvenligi sadece `proxy.ts` ile saglanir. `middleware.ts` olusturma.

Public route pattern'leri:

- `/`
- `/api/universities(.*)`
- `/data(.*)`
- `/sign-in(.*)`
- `/sign-up(.*)`
- `/universities(.*)`
- `/cities(.*)`
- `/isee(.*)`
- `/scholarships(.*)`
- `/communities(.*)`
- `/topluluklar(.*)`
- `/yasal(.*)`
- `/sitemap.xml`
- `/robots.txt`

Protected ornekler:

- `/ai-mentor`
- `/documents`
- `/favorites`
- `/hub`
- `/api/chat`
- `/profile`

Navbar signed-out durumda `SignInButton mode="modal"` kullanir. BottomNav ve protected CTA linkleri signed-out durumda `/sign-in?redirect_url=...` adresine gider.

`npm run check:routes`, public/protected matrix'i ve scholarship GeoJSON fetch kurallarini smoke-test eder.

---

## Ozellik Mimarileri

### Dil sistemi

`context/LanguageContext.tsx`, TR/EN dil tercihini React Context + `localStorage` ile saklar ve `document.documentElement.lang` ile senkronlar. UI metinleri `lib/translations.ts` icindedir. Yeni metinler hard-code edilmemeli; TR/EN paralel eklenmeli.

### Home

`app/page.tsx`, `Navbar`, `HeroSection`, `FeaturesSection`, `VelocityBridge`, `ScholarshipsSection`, `IseeSection`, `Footer` bileşenlerini birlestirir. University/program stat'leri `useUniversitiesData()` ile canli veriden gelir; `64/240` gibi hard-code sayilar kullanma.

### Universities list ve detail

`app/universities/page.tsx`:

- URL sync search/filter: `q`, `city`, `type`, `fav`
- view mode: `grid | compact`
- localStorage key: `italyPathUniversitiesViewMode`
- helper'lar: `lib/universitiesFilters.ts`
- UI parcalari: `components/universities/*`

`app/universities/[id]/page.tsx` ve department detail sayfasi client leaf'tir. SEO `layout.tsx` Server Component'lerinde `generateMetadata()` ile uretilir. `generateMetadata()` hicbir zaman `"use client"` dosyasina konmamalidir.

`components/university-details/ProgramDirectory.tsx`, programlari bachelor/master/single-cycle gruplarina ayirir. Department detail sayfasi admission details panelini varsa gosterir.

### AI Mentor

`/ai-mentor` protected route'tur. UI uc masali consultation desk modelidir:

- ItalyPath AI: aktif, Gemini
- ItalyPath Gonullu Ekip: locked/yakinda
- ItalyPath Uzman: locked/yakinda

Backend: `app/api/chat/route.ts`.

- `GEMINI_API_KEY` yoksa `503`
- malformed body veya gecersiz messages icin `400`
- Gemini model: `gemini-2.5-flash`
- response: text/plain `ReadableStream`
- sistem promptu `getUniversitiesData()` ile canli university/program listesinden uretilir

Risk: Supabase department sayisi buyudukce chat system prompt'u da buyur. Latency/cost ve token boyutu izlenmeli.

### Favorites

`lib/useFavorites.ts` tek hook'tur.

- Guest: `localStorage` key `italyPathFavorites`
- Signed-in: Supabase `favorites` tablosu, Clerk `supabase` JWT template ile
- optimistic update + rollback
- logout sonrasi stale state temizlenir

### Documents

`app/documents/page.tsx` Supabase Storage `documents` bucket'i ve `user_documents` tablosunu kullanir.

- private bucket uyumlu signed URL akisi
- upload'da storage basarili DB insert basarisiz olursa cleanup
- delete'de storage ve DB hata objeleri kontrol edilir
- client-side mime/size guard'lari vardir

### Hub

`/hub` protected editorial "calisma dosyasi" deneyimidir. Ana component `app/hub/page.tsx`, gorsel parcalar `components/hub/*`.

Veri kaynaklari:

- Clerk user profile
- `useFavorites`
- `useUniversitiesData`
- Supabase `user_documents` count (`lib/hub/useDocumentsCount.ts`)
- localStorage `italyPathStage`
- localStorage `italyPathUniversitiesViewMode`
- forward-compat `italyPathLastMentorDesk`

Yeni Supabase tablosu yoktur.

### Cities

`/cities` public editorial atlas'tir. `components/cities/CityGuidesExplorer.tsx`, `types/cities.ts`, `lib/cities/data.ts` kullanir.

Curated data su anda Milano, Roma, Bologna, Torino, Floransa, Venedik, Verona, Padova, Parma, Pisa, Siena, Pavia, Trento, Trieste, Bari, Ancona, Napoli icin tutulur. Bunlarin cogunda Numbeo kaynak metadata'si vardir:

- `costSourceName`
- `costSourceUrl`
- `costSourceLastUpdated`

Slug kurali: app-facing Turkce sehir anahtarini koru (`floransa`, `venedik`, ileride `cenova`). Source-page slug'i (`firenze`, `venezia`, `genova`) app slug'i olarak kullanma.

Dogrulama: `npm run check:cities`.

### Scholarships

`/scholarships` public route'tur. `components/scholarships/ScholarshipsExplorer.tsx`, `lib/scholarships/regions.ts`, `types/scholarships.ts`, `public/data/italy-regions.geojson` kullanir.

GeoJSON lokal `/data/italy-regions.geojson` uzerinden fetch edilir; `/data(.*)` public olmalidir.

### Communities

`/communities` public editorial atlas'tir. `/topluluklar` redirect route'udur.

Veri:

- `lib/community-links.ts`
- `lib/communities/chapters.ts`

UI:

- `components/communities/CommunityAtlas.tsx`

Resmi topluluk iddiasi, fake uye sayisi veya social proof ekleme.

### ISEE

`app/isee/page.tsx` ve `lib/iseeCalculator.ts` scala equivalente formulunu kullanir. Dogrulama: `npm run check:isee`.

### Yasal sayfalar

`/yasal/[slug]` dinamik route'u uc statik yasal sayfayi besler: `gizlilik` (Gizlilik Politikasi ve KVKK Aydinlatma Metni), `kullanim-kosullari`, `cerez-politikasi`.

- Icerik: `lib/legal/documents.ts` (yapilandirilmis Turkce metin; `CONTACT_EMAIL_PLACEHOLDER` lansman oncesi gercek e-posta ile doldurulacak)
- Sunum: `components/legal/LegalDocument.tsx` (saf Server Component, editorial stil)
- Route: `app/yasal/[slug]/page.tsx` (`generateStaticParams` + `generateMetadata`, server)
- Footer'da "Yasal" linkleri `LEGAL_LINKS` ile uretilir
- `proxy.ts` public route: `/yasal(.*)`
- Su an sadece Turkce; Ingilizce ileride ayni yapilandirilmis modele eklenebilir.

Tasarim notu: `docs/superpowers/specs/2026-06-12-yasal-sayfalar-design.md`.

---

## Supabase Yuzeyleri

Generated `types/supabase.ts` yoktur. Yeni sorgular icin `types/index.ts` icine spesifik row interface ekle.

Kodun bekledigi ana tablolar:

- `favorites`: Clerk user id + university id favorileri
- `user_documents`: belge metadata'si ve storage path
- `universities`: university base rows
- `university_departments`: program rows, languages/duration/level/sort
- `program_admission_details`: program admission metadata ve source/uncertainty modeli

SQL/runbook dosyalari:

- `supabase/rls_hardening.sql`: favorites, user_documents ve storage RLS hardening
- `supabase/program_admission_details.sql`: program admission details tablo/policy/grant setup
- `SUPABASE_SECURITY_RUNBOOK.md`: Clerk + Supabase operasyon rehberi

Gercek production schema dashboard'dan dogrulanmalidir.

---

## Environment Degiskenleri

`.env.local` git'e girmez.

| Degisken | Kullanim |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `GEMINI_API_KEY` | Gemini chat endpoint |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend |
| `CLERK_SECRET_KEY` | Clerk server |

Supabase env eksikse university API ve Supabase dogrulama scriptleri hata verir.

---

## Komutlar

```bash
npm install
npm run dev
npm run build
npm run lint
npm run check:routes
npm run check:cities
npm run check:program-details
npm run check:data
npm run check:local-data
npm run check:university-data-source
npm run check:isee
npm run check:university-department-merge
npm run check:universities-ui
npm run check:university-details-ui
npm run check:scholarships-ui
npm run check:editorial-ui
npm run clean:med
```

Ek dogrulama:

```bash
node scripts/check-universities-server-compose.mjs
```

---

## Bilinen Sorunlar ve Bakim Borcu

### Orta oncelik

1. PWA paketi eksik: `public/manifest.webmanifest` ve ikon setleri (`192x192`, `512x512`) yok.
2. Local seed `app/data.ts` icindeki bazi universite gorselleri tekrarli/placeholder kalitesinde.
3. Universite karsilastirma ozelligi yok; mevcut favori + university data modeliyle yapilabilir.
4. Cities kaynak satiri UI'da gorunmuyor; `costSourceName`, `costSourceUrl`, `costSourceLastUpdated` data layer'da var.
5. AI Mentor system prompt'u canli program sayisi arttikca buyuyor; prompt boyutu, latency ve maliyet izlenmeli.
6. Yasal sayfalardaki iletisim e-postasi yer tutucusu (`[iletişim e-postası eklenecek]`, `lib/legal/documents.ts` icindeki `CONTACT_EMAIL_PLACEHOLDER`) lansman oncesi gercek adresle doldurulmali.

### Repo hijyeni

1. Research/import artifact klasorleri ve `output/*` dosyalarinin commitlenecegi mi yoksa dis storage/.gitignore'a mi alinacagi netlestirilmeli.
2. Legacy UI dosyalari (`components/ui/bento-grid.tsx`, `components/ui/scroll-based-velocity.tsx`) aktif import edilmiyorsa silinmeli veya "kullanma" diye isaretlenmeli.
3. `.DS_Store`, `.swp`, editor artifact'leri repo'ya girmemeli.

---

## Agent Kurallari

1. Tailwind v4: `tailwind.config.*` olusturma. Tema/token degisiklikleri `app/globals.css` icinde `@theme` ve CSS variable modeliyle yapilir.
2. Global state icin React Context ve mevcut hook pattern'leri yeterli. Redux/Zustand/Jotai ekleme.
3. Hook'lar mevcut pattern geregi `lib/` altinda tutulur.
4. SEO gereken dinamik route'larda `generateMetadata()` Server Component `layout.tsx` dosyasinda kalir; client page'e tasima.
5. Route guvenligi `proxy.ts` uzerinden yonetilir; `middleware.ts` olusturma.
6. Live university/program data icin client veya server yuzeylerde dogrudan `app/data.ts` seed'ine donme. `getUniversitiesData()` veya `/api/universities` kullan.
7. UI metinleri `lib/translations.ts` icinde TR/EN paralel tutulur.
8. Supabase generated types yok; yeni DB row ihtiyacinda `types/index.ts` icine explicit interface ekle.
9. Existing dirty worktree varsay; kullanici degisikliklerini revert etme.
10. Yeni agent, once bu dosyayi, sonra ilgili feature dosyalarini, sonra dogrulama scriptlerini okumali.
