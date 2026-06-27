# ItalyPath - Agent Context & Knowledge Base

Bu dosya yeni agent'larin projeyi hizli ve dogru anlamasi icin tutulur. Degisiklik gecmisi icin `AGENT_COMMITS.md`, son audit notlari icin `AGENT_CONTEXT_FIX_REPORT.md` okunabilir; bu dosya ise guncel mimari ve calisma kurallarinin kaynak dokumanidir.

Son guncelleme: 2026-06-27

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
│   ├── page.tsx                    # Home server wrapper; stats getUniversitiesData() kaynakli
│   ├── sitemap.ts                  # getUniversitiesData() ile dinamik sitemap
│   ├── robots.ts                   # Public/protected indexleme kurallari
│   ├── data.ts                     # Local seed + paylasilan University/Department/Program tipleri
│   ├── api/
│   │   ├── universities/route.ts   # force-dynamic, no-store, Supabase-backed public API
│   │   └── chat/route.ts           # Protected Gemini streaming endpoint
│   ├── giris/page.tsx              # Tek sayfa giris+kayit (Clerk Elements); /sign-in ve /sign-up next.config redirects
│   ├── ai-mentor/page.tsx          # Protected consultation desks UI
│   ├── universities/
│   │   ├── layout.tsx              # /universities SEO metadata
│   │   ├── page.tsx                # Server SEO wrapper + crawlable preview + client explorer
│   │   └── [id]/
│   │       ├── layout.tsx          # Server generateMetadata
│   │       ├── page.tsx            # Server SEO wrapper + client university portrait
│   │       └── departments/[deptSlug]/
│   │           ├── layout.tsx      # Server generateMetadata
│   │           └── page.tsx        # Server SEO wrapper + client program portrait
│   ├── cities/page.tsx
│   ├── communities/page.tsx        # Public atlas; force-dynamic SEO 2.5 wrapper
│   ├── topluluklar/page.tsx        # redirect -> /communities
│   ├── yasal/[slug]/page.tsx       # Public legal pages (gizlilik/kullanim/cerez)
│   ├── scholarships/page.tsx
│   ├── isee/
│   │   ├── layout.tsx              # /isee SEO metadata
│   │   └── page.tsx                # Server wrapper -> components/isee/IseeCalculatorClient.tsx
│   ├── favorites/page.tsx
│   ├── documents/page.tsx
│   └── hub/page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── HomePageClient.tsx          # Home client leaf; Navbar/Hero/sections/Footer composition
│   ├── BottomNav.tsx
│   ├── MobileZoomLock.tsx          # Coarse pointer pinch/double-tap/edge-swipe guard
│   ├── RouteTransition.tsx
│   ├── HeroSection.tsx
│   ├── FeaturesSection.tsx
│   ├── VelocityBridge.tsx
│   ├── ScholarshipsSection.tsx
│   ├── IseeSection.tsx
│   ├── isee/IseeCalculatorClient.tsx
│   ├── Footer.tsx
│   ├── cities/CityGuidesExplorer.tsx
│   ├── communities/CommunityAtlas.tsx
│   ├── scholarships/ScholarshipsExplorer.tsx
│   ├── universities/              # Server-safe rows + UniversitiesExplorer client leaf
│   ├── university-details/         # Detail client leaves, portrait headers, program directory, admission panel
│   ├── mentor/                     # Mentor hub/chat room/topbar/entry/locked notice
│   ├── legal/                      # LegalDocument.tsx (yasal belge sunum bileseni)
│   ├── auth/                       # /giris parcalari: AuthShell, AuthCard, AuthTabs, OAuthButtons, SignInForm, SignUpForm, VerificationStep, PasswordResetFlow
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
│   ├── deadlines/targets.ts         # Deadline scrape hedefleri (universite + admission URL)
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
│   ├── check-auth-ui.mjs            # /giris ve auth migration butunlugu smoke check
│   ├── check-cities-data.mjs
│   ├── check-program-details.mjs
│   ├── check-deadlines.mjs
│   ├── check-university-data-source.mjs
│   ├── check-university-detail-portrait.mjs
│   ├── check-universities-server-compose.mjs
│   ├── validate-supabase-university-data.mjs
│   ├── validate-data-integrity.mjs
│   ├── apply-deadlines.mjs          # cikarilan deadline JSON -> app/data.ts override map
│   ├── save-scraped.mjs             # deadline scrape kaydetme yardimcisi
│   ├── scrape-deadlines-runbook.md  # Claude scrape runbook (LLM extract icermez)
│   ├── import-*-program-details.mjs # Bologna/Ca'Foscari/Genoa/Milan/Milano-Bicocca/Padua/Polimi/Polito/Sapienza
│   └── clean-med-data.mjs
├── supabase/
│   ├── rls_hardening.sql
│   └── program_admission_details.sql
├── docs/
│   ├── CAMPAIGN_PLAN_LAUNCH.md
│   ├── LAUNCH_STRATEGY_INSTAGRAM_TIKTOK.md
│   └── superpowers/
│       ├── specs/                  # tasarim belgeleri; SEO server HTML spec dahil
│       └── plans/                  # uygulama planlari; SEO server HTML plan dahil
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

Son canli API dogrulamasinda (`https://italypath.app/api/universities`, 2026-06-27):

- `64` university
- `1005` department
- level dagilimi: `247 bachelor`, `743 master`, `15 single-cycle`
- language dagilimi: `1005 en`, `71 it`

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
- `Department`: `id?`, `name`, `slug`, `languages`, `durationYears`, `level`, `admissionDetails?`, `deadline?`

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

### Program deadline modeli ve scrape akisi

`Department.deadline?` alani `ProgramDeadline` tipindedir (`app/data.ts`):

- `date`: ISO `YYYY-MM-DD` veya `"rolling"` / `"TBA"`
- `note?`: serbest metin (orn. "Early round 11 Jun; regular 15 May")
- `sourceUrl`: verinin cekildigi sayfa

Deadline override'lari `app/data.ts` icindeki `DEPARTMENT_DEADLINE_OVERRIDES` map'inde tutulur ve hem local seed hem Supabase compose yolunda ilgili Department'a baglanir. Son toplu kontrol tarihi `DEPARTMENT_DEADLINES_LAST_CHECKED_AT` sabitindedir.

Scrape -> extract -> apply boru hatti (Kerem'in "scrape ile LLM extract ayri" kuralina uygun):

1. `lib/deadlines/targets.ts`: kazinacak universite + admission URL listesi (`DEADLINE_TARGETS`).
2. `scripts/scrape-deadlines-runbook.md` + `scripts/save-scraped.mjs`: her URL'in temiz icerigini `tmp/scraped/`'e markdown olarak kaydeder. Bu adimda LLM extract YOK. `tmp/` gitignore'dadir.
3. LLM extraction ayri, manuel adimda Kerem tarafindan yapilir (`docs/superpowers/specs/extraction-prompt-template.md`).
4. `scripts/apply-deadlines.mjs`: cikarilan JSON'u `DEPARTMENT_DEADLINE_OVERRIDES`'a isler.
5. `npm run check:deadlines`: deadline veri butunlugu guard'i.

---

## Auth ve Route Matrix

Route guvenligi sadece `proxy.ts` ile saglanir. `middleware.ts` olusturma.

Public route pattern'leri:

- `/`
- `/api/universities(.*)`
- `/data(.*)`
- `/sign-in(.*)`     # eski URL, `next.config.ts` 308 ile `/giris`'e yonlendirir
- `/sign-up(.*)`     # eski URL, `next.config.ts` 308 ile `/giris?mode=kayit`'e yonlendirir
- `/universities(.*)`
- `/cities(.*)`
- `/isee(.*)`
- `/scholarships(.*)`
- `/communities(.*)`
- `/topluluklar(.*)`
- `/yasal(.*)`
- `/giris(.*)`       # yeni tek sayfa giris+kayit
- `/sitemap.xml`
- `/robots.txt`

Protected ornekler:

- `/ai-mentor`
- `/documents`
- `/favorites`
- `/hub`
- `/api/chat`
- `/profile`

Navbar artik signed-out durumda **modal acmaz**; `<Link href="/giris">` ile tam sayfa `/giris`'e gider. BottomNav ve protected CTA linkleri signed-out durumda `/giris?redirect_url=...` adresine gider (`/sign-in?redirect_url=...` referanslari kalmadi).

`npm run check:routes`, public/protected matrix'i ve scholarship GeoJSON fetch kurallarini smoke-test eder. `npm run check:auth-ui`, `/giris` sayfasinin ve auth migration'inin butunlugunu dogrular.

---

## Ozellik Mimarileri

### Auth (Giris/Kayit)

`/giris` tek sayfa giris+kayit deneyimidir. Clerk altyapisi korunur; UI tamamen `@clerk/elements` (Level 2 - headless primitives) ile bizim tarafimizda.

- Sekme toggle: "Giris Yap" / "Kayit Ol"; `?mode=kayit` URL parametresi acilis sekmesini belirler
- OAuth: Google + Apple (her iki sekmede de gosterilir; ilk OAuth dokunusunda Clerk otomatik hesap yaratir)
- E-posta yolu: Kayit'ta Ad + Soyad + E-posta + Sifre; Giris'te E-posta + Sifre; her ikisi de Sifre goster/gizle toggle'i ile
- E-posta dogrulama: 6 haneli OTP, otomatik submit, Clerk'in native `resendableAfter` ile geri sayim
- "Sifremi unuttum": 2 adimli (e-posta -> kod + yeni sifre); inline akis, ayri sayfa degil
- Yonlendirme: `?redirect_url=...` varsa oraya, yoksa `/hub`'a (ClerkProvider `signInFallbackRedirectUrl="/hub"` / `signUpFallbackRedirectUrl="/hub"`)
- Eski URL'ler: `/sign-in` ve `/sign-up` `next.config.ts` `redirects()` ile 308 yonlendirilir; sorgu parametreleri korunur

Bilesenler `components/auth/` altinda:

- `AuthShell.tsx`: paper bg + wordmark + ortali kart + yasal alt metin
- `AuthCard.tsx`: surface bg + ince border kart konteyneri
- `AuthTabs.tsx`: ARIA tablist + ok tuslari ile gecis + roving tabIndex
- `OAuthButtons.tsx`: `Clerk.Connection` (Google + Apple) + "veya" ayirici
- `SignInForm.tsx`, `SignUpForm.tsx`: form akislari
- `VerificationStep.tsx`: 6 haneli kod adimi
- `PasswordResetFlow.tsx`: 2 adimli sifremi unuttum akisi

Tum metinler `lib/translations.ts` `auth.*` namespace altinda (TR + EN paralel). Tasarim notu: `docs/superpowers/specs/2026-06-16-auth-redesign-design.md`. Uygulama plani: `docs/superpowers/plans/2026-06-16-auth-redesign-plan.md`.

Clerk Elements v0.24.18 ile bilinen sapmalar (gelecek auth degisikliklerinde dikkat):

- OAuth butonu icin `Clerk.Connection` (NOT eski `SignIn.SocialProvider`)
- `Clerk.FieldError` ve `Clerk.Loading` children-as-function pattern
- `SignUp.Action resend` `fallback` callback'i `({ resendableAfter }) => ...` imzasiyla cagrilir

### Dil sistemi

`context/LanguageContext.tsx`, TR/EN dil tercihini React Context + `localStorage` ile saklar ve `document.documentElement.lang` ile senkronlar. UI metinleri `lib/translations.ts` icindedir. Yeni metinler hard-code edilmemeli; TR/EN paralel eklenmeli.

### SEO ve domain durumu

Canonical marka/domain karari: **ItalyPath** ile devam ediliyor; canonical domain **`https://italypath.app`**.

SEO Adim 1 (`SEO 1` commit'i):

- `app/layout.tsx` icinde `metadataBase: new URL("https://italypath.app")`
- `app/robots.ts` ve `app/sitemap.ts` `https://italypath.app` uretir
- `/universities` ve `/isee` icin server `layout.tsx` metadata eklendi
- cities/scholarships/communities Open Graph URL'leri `.app` oldu
- dynamic university/program layout'larinda canonical + Open Graph URL var

SEO Adim 2 (`SEO 2` merge'i):

- `/universities`, `/universities/[id]`, `/universities/[id]/departments/[deptSlug]`, `/cities`, `/scholarships` icin ilk production HTML guclendirildi
- Target SEO sayfalarinda `BAILOUT_TO_CLIENT_SIDE_RENDERING` temizlendi
- `/universities` server HTML'i sinirli preview tasir: 12 okul + okul basi 3 program etiketi; tam veri client tarafinda `/api/universities` ile gelir
- `components/universities/UniversitiesExplorer.tsx`, `components/university-details/UniversityDetailClient.tsx` ve `DepartmentDetailClient.tsx` client leaf pattern'ini tasir
- `lib/useUniversitiesData.ts` initial data alabilir; initial data varsa skeleton/loading ile baslamaz
- Server fetch hata durumlari route-level editorial error block'a duser; global `app/error.tsx`'e dusmemesi hedeflenir
- Tasarim/spec: `docs/superpowers/specs/2026-06-21-seo-server-html-design.md`
- Plan: `docs/superpowers/plans/2026-06-21-seo-server-html-plan.md`

SEO Adim 2.5 (`SEO 2.5` deploy'u):

- `/`, `/isee`, `/communities` canli HTML'deki `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi temizlendi
- `/` server wrapper oldu; `getUniversitiesData()` ile server'da canli stats hesaplar, hata durumunda stats `null` doner ve sayfa patlamaz
- Home UI `components/HomePageClient.tsx` client leaf'ine tasindi
- `/isee` server wrapper oldu; hesaplayici `components/isee/IseeCalculatorClient.tsx` client leaf'ine tasindi
- `/communities` `force-dynamic` ile static prerender + analytics kaynakli marker'dan cikarildi; atlas HTML'de gercek H1/chapter/topluluk satirlari tasimaya devam eder

Son canli SEO curl audit notlari (SEO 2.5 deploy sonrasi):

- `robots.txt` ve `sitemap.xml` `.app` icin PASS; sitemap yaklasik `1075` URL tasiyor ve `.com` URL kalmadi
- `/`, `/isee`, `/communities`, `/universities`, university detail, program detail, `/cities`, `/scholarships` canli HTML'de gercek gorunen icerik tasiyor ve bailout yok
- `www.italypath.app` SSL/redirect hijyeni duzeltildi: `https://www.italypath.app` artik `308` ile `https://italypath.app/` adresine gider
- Name.com DNS Vercel'in yeni onerilerine guncellendi: apex `A -> 216.198.79.1`, `www` CNAME Vercel'in project-specific `vercel-dns-017.com` hedefine gider
- Google Search Console domain property `italypath.app` dogrulandi; `https://italypath.app/sitemap.xml` gonderildi; kritik URL'ler icin URL Inspection + Request Indexing yapildi (`/`, `/universities`, `/isee`, `/scholarships`, `/cities`, `/communities`)
- JSON-LD/schema/breadcrumb calismasi henuz yapilmadi; SEO 3 olarak planlanacak
- Canli auditte ana sayfada explicit canonical link gorunmedi; metadataBase/sitemap/redirect apex ile uyumlu, ancak ana sayfa canonical'i kucuk hijyen isi olarak SEO 3 oncesi veya SEO 3 icinde eklenebilir

### Home

`app/page.tsx` async Server Component wrapper'dir ve `components/HomePageClient.tsx` client leaf'ini render eder. Server wrapper `getUniversitiesData()` ile canli university/program stat'lerini hesaplar; hata durumunda `{ universitiesCount: null, programsCount: null }` doner.

`components/HomePageClient.tsx`, `Navbar`, `HeroSection`, `FeaturesSection`, `VelocityBridge`, `ScholarshipsSection`, `IseeSection`, `Footer` bilesenlerini birlestirir. University/program stat'leri canli university data akisi ile gelmelidir; `64/240` gibi local seed sayilari hard-code edilmemeli.

SEO 2.5 sonrasi canli audit'te `/` sayfasi gercek H1, CTA/internal link ve canli stats tasir; `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi temizdir. Hidden SEO text ekleme.

### Universities list ve detail

`app/universities/page.tsx`:

- async Server Component wrapper'dir; `getUniversitiesData()` ile canli veri alir
- ilk HTML icin sinirli crawlable preview uretir (12 okul, okul basi 3 program etiketi)
- `components/universities/UniversitiesExplorer.tsx` client leaf'ine `initialUniversities`, initial filters ve stats gecer
- URL sync search/filter: `q`, `city`, `type`, `fav`
- view mode: `grid | compact`
- localStorage key: `italyPathUniversitiesViewMode`
- helper'lar: `lib/universitiesFilters.ts`
- UI parcalari: `components/universities/*`

`app/universities/[id]/page.tsx` ve department detail page artik server wrapper + client leaf pattern'i kullanir. Server wrapper `getUniversityById()` ile ilk HTML'e okul/program adi, aciklama, fee, sehir, program linkleri ve admission details gibi gorunur icerikleri koyar; client leaf favori, dil, route animation ve program transition davranisini korur.

SEO `layout.tsx` Server Component'lerinde `generateMetadata()` ile uretilir. `generateMetadata()` hicbir zaman `"use client"` dosyasina konmamalidir.

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

SEO Adim 2 sonrasi `app/cities/page.tsx` server-rendered gorunur intro/city nav tasir; explorer client davranisi korunur. Son canli audit'te `/cities` bailout temizdir.

Curated data su anda Milano, Roma, Bologna, Torino, Floransa, Venedik, Verona, Padova, Parma, Pisa, Siena, Pavia, Trento, Trieste, Bari, Ancona, Napoli icin tutulur. Bunlarin cogunda Numbeo kaynak metadata'si vardir:

- `costSourceName`
- `costSourceUrl`
- `costSourceLastUpdated`

Slug kurali: app-facing Turkce sehir anahtarini koru (`floransa`, `venedik`, ileride `cenova`). Source-page slug'i (`firenze`, `venezia`, `genova`) app slug'i olarak kullanma.

Dogrulama: `npm run check:cities`.

### Scholarships

`/scholarships` public route'tur. `components/scholarships/ScholarshipsExplorer.tsx`, `lib/scholarships/regions.ts`, `types/scholarships.ts`, `public/data/italy-regions.geojson` kullanir.

GeoJSON lokal `/data/italy-regions.geojson` uzerinden fetch edilir; `/data(.*)` public olmalidir.

SEO Adim 2 sonrasi `app/scholarships/page.tsx` server-rendered gorunur intro/region nav tasir; map/GeoJSON client deneyimi korunur. Son canli audit'te `/scholarships` bailout temizdir.

### Communities

`/communities` public editorial atlas'tir. `/topluluklar` redirect route'udur.

Veri:

- `lib/community-links.ts`
- `lib/communities/chapters.ts`

UI:

- `components/communities/CommunityAtlas.tsx`

Resmi topluluk iddiasi, fake uye sayisi veya social proof ekleme.

SEO 2.5 sonrasi `/communities` `force-dynamic` route'tur. Canli HTML'de gercek H1, intro, chapter nav ve topluluk satirlari bulunur; `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi temizdir. Topluluk verisi yine resmi iddia/fake social proof olmadan kullanilmali.

### ISEE

`app/isee/page.tsx` server wrapper'dir ve `components/isee/IseeCalculatorClient.tsx` client leaf'ini render eder. Hesaplama `lib/iseeCalculator.ts` scala equivalente formulunu kullanir. Dogrulama: `npm run check:isee`.

`app/isee/layout.tsx` SEO metadata tasir. SEO 2.5 sonrasi hesaplayici client interaktivitesi korunur; canli HTML'de gercek H1, aciklama, ISEE formulu ve form alanlari gorunur; `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi temizdir.

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
npm run check:auth-ui
npm run check:cities
npm run check:program-details
npm run check:deadlines
npm run check:data
npm run check:local-data
npm run check:university-data-source
npm run check:isee
npm run check:university-department-merge
npm run check:universities-ui
npm run check:university-details-ui
npm run check:scholarships-ui
npm run check:editorial-ui
npm run check:documents-ui
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
4. Ana sayfada explicit canonical link canli HTML'de gorunmedi; apex domain/sitemap/redirect dogru, ama kucuk SEO hijyeni olarak `/` canonical'i eklenebilir.
5. Search Console yeni kuruldu; ilk 1-2 hafta `Sitemaps`, `Pages` ve `URL Inspection` durumlari izlenmeli. Baslangicta performans/veri gecikmesi normaldir.
6. SEO 3: JSON-LD/schema/breadcrumb henuz eklenmedi. Hidden/uydurma schema yok; sadece sayfada gorunen gercek bilgiye dayali structured data eklenmeli.
7. AI Mentor system prompt'u canli program sayisi arttikca buyuyor; prompt boyutu, latency ve maliyet izlenmeli.
8. Yasal sayfalardaki iletisim e-postasi yer tutucusu (`[iletişim e-postası eklenecek]`, `lib/legal/documents.ts` icindeki `CONTACT_EMAIL_PLACEHOLDER`) lansman oncesi gercek adresle doldurulmali.

### Repo hijyeni

1. Research/import artifact klasorleri (`output/*`, `*-admission-requirements/`, scrape JSON/PNG ciktilari) repoya commitlenmis ve son birlesmeyle hacmi buyumus durumda; dis storage'a mi yoksa `.gitignore`'a mi alinacagi netlestirilmeli.
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
9. SEO icin hidden keyword block, `display:none` SEO metni veya botlara farkli icerik ekleme. Kullaniciya gorunmeyen SEO text yasak.
10. Public SEO sayfalarinda page-level CSR bailout riskine dikkat et. `useSearchParams`/Suspense kullanimi kritik ilk HTML'i skeleton'a dusuruyorsa server wrapper + client leaf pattern'ini tercih et.
11. Existing dirty worktree varsay; kullanici degisikliklerini revert etme.
12. Yeni agent, once bu dosyayi, sonra ilgili feature dosyalarini, sonra dogrulama scriptlerini okumali.
