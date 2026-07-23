# ItalyPath - Agent Context & Knowledge Base

Bu dosya yeni agent'larin projeyi hizli ve dogru anlamasi icin tutulur. Degisiklik gecmisi icin `AGENT_COMMITS.md`, son audit notlari icin `AGENT_CONTEXT_FIX_REPORT.md` okunabilir; bu dosya ise guncel mimari ve calisma kurallarinin kaynak dokumanidir.

Son guncelleme: 2026-07-22

---

## Proje Tanimi

ItalyPath, Italya'da egitim almak isteyen Turk ogrenciler icin Next.js tabanli rehber uygulamasidir. Public tarafta universite/program arama, sehir rehberleri, bolgesel burs haritasi, ISEE hesaplayici ve kurate edilmis topluluk rehberi vardir. Giris gerektiren tarafta AI mentor, kalici gonullu ekip yazismasi, favoriler, belge cuzdani ve kisisel calisma dosyasi (`/hub`) bulunur.

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
│   ├── data.ts                     # Legacy local seed/yedek; runtime tarafindan import edilmez
│   ├── api/
│   │   ├── universities/route.ts   # force-dynamic, no-store, Supabase-backed public API
│   │   ├── sat/questions/route.ts  # Protected SAT question API; service-role-backed, no-store
│   │   └── chat/route.ts           # Protected Gemini streaming endpoint
│   ├── giris/
│   │   ├── page.tsx                # Tek sayfa giris+kayit (Clerk Elements); /sign-in ve /sign-up next.config redirects
│   │   └── sso-callback/page.tsx   # Google OAuth donus rotasi; /giris sayfasini yeniden kullanir
│   ├── hosgeldin/page.tsx          # Protected 4 adimli onboarding sihirbazi
│   ├── ai-mentor/page.tsx          # Protected consultation desks UI
│   ├── ekip/mentor/page.tsx        # Protected, staff-allowlisted gonullu operator inbox
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
│   ├── hub/page.tsx                # Protected profil bazli oneri merkezi
│   └── sat/page.tsx                # Protected SAT soru bankasi client deneyimi
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
│   ├── sat/                        # SAT konu listesi, soru karti, KaTeX MathText, oturum ozeti
│   ├── universities/              # Server-safe rows + UniversitiesExplorer client leaf
│   ├── university-details/         # Detail client leaves, portrait headers, program directory, admission panel
│   ├── mentor/                     # Mentor hub + AI, gonullu ogrenci ve operator yuzeyleri
│   ├── legal/                      # LegalDocument.tsx (yasal belge sunum bileseni)
│   ├── auth/                       # /giris parcalari: AuthShell, AuthCard, AuthTabs, OAuthButtons, SignInForm, SignUpForm, VerificationStep, PasswordResetFlow
│   ├── onboarding/                 # /hosgeldin wizard kartlari, progress ve finale
│   ├── hub/                        # Profil seridi, program/burs/sehir oneri bloklari, kompakt kartlar
│   └── ui/                         # Small reusable UI/motion helpers; scroll velocity legacy unless imported
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
│   ├── hub/                        # profile.ts, useUserProfile.ts, recommendations.ts, useDocumentsCount.ts
│   ├── mentor/                     # Channel registry, native Clerk/Supabase hooks ve state/controller helper'lari
│   ├── sat/                        # SAT types, SPR answer matching, server memo, client hooks
│   └── scholarships/regions.ts
├── types/
│   ├── index.ts                    # Shared app types + Supabase row interfaces
│   ├── universities.ts             # University/Department/admission domain tipleri
│   ├── cities.ts
│   └── scholarships.ts
├── public/data/italy-regions.geojson
├── scripts/
│   ├── check-route-access.mjs
│   ├── check-mentor-desks.mjs       # Mentor channel/DB/RLS/UI/legal kalici guard'i
│   ├── test-volunteer-desk.mjs      # Ogrenci lifecycle/race davranis testleri
│   ├── test-mentor-operator-inbox.mjs # Operator auth/action/Realtime davranis testleri
│   ├── test-mentor-db.mjs           # Gercek PostgreSQL RLS/RPC/concurrency testleri
│   ├── check-sat-bank.mjs
│   ├── check-auth-ui.mjs            # /giris ve auth migration butunlugu smoke check
│   ├── check-hub-onboarding.mjs     # /hosgeldin + yeni hub smoke/kapsama check
│   ├── check-cities-data.mjs
│   ├── check-program-details.mjs
│   ├── check-university-data-source.mjs
│   ├── check-university-detail-portrait.mjs
│   ├── check-universities-server-compose.mjs
│   ├── validate-supabase-university-data.mjs
│   ├── validate-data-integrity.mjs
│   ├── save-scraped.mjs             # deadline scrape kaydetme yardimcisi
│   ├── scrape-deadlines-runbook.md  # Claude scrape runbook (LLM extract icermez)
│   ├── import-*-program-details.mjs # Bologna/Ca'Foscari/Genoa/Milan/Milano-Bicocca/Padua/Polimi/Polito/Sapienza
│   ├── sat/                        # PDF -> JSON pipeline ve import scriptleri
│   └── clean-med-data.mjs
├── supabase/
│   ├── rls_hardening.sql
│   ├── program_admission_details.sql
│   ├── user_profiles.sql
│   ├── volunteer_mentor.sql        # Gonullu mentor tablolar/RLS/RPC/Realtime kontrati
│   └── sat_bank.sql                # sat_questions service-role-only + sat_attempts RLS
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

### Local seed/yedek

`app/data.ts` ilk universite listesinden kalan legacy local seed/yedektir. Canli uygulama runtime'i bu dosyayi import etmez. Paylasilan `University`, `Department` ve `ProgramAdmissionDetails` domain tipleri `types/universities.ts` icindedir.

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

Son canli Supabase dogrulamasinda (2026-07-22):

- `64` university
- `1017` department
- level dagilimi: `247 bachelor`, `753 master`, `17 single-cycle`
- language dagilimi: `1017 en`, `81 it`

### API ve cache kurali

`app/api/universities/route.ts`:

- `export const dynamic = "force-dynamic"`
- `Cache-Control: no-store, max-age=0`
- hata durumunda `503`

`lib/useUniversitiesData.ts`:

- browser fetch icin `cache: "no-store"`
- client process icinde in-memory cache + request dedupe yapar

`lib/universities.server.ts` (2026-07-02 Supabase egress kota asimi sonrasi):

- `getUniversitiesData()` compose sonucunu **3 saatlik in-memory memo**da tutar (`SERVER_CACHE_TTL_MS`). Tam veri seti ~4.5 MB'dir ve memo'suz her sayfa/crawl compose'u Supabase egress'ini tuketiyordu (ayda 32+ GB, kota %650 asildi).
- Supabase fetch hata verirse eldeki bayat memo sunulur (stale-on-error); memo yoksa hata firlatilir ve mevcut route-level error davranisi calisir.
- Her deploy memo'yu sifirlar; yeni program importlari en gec TTL kadar gecikmeyle canliya yansir.
- `scripts/check-university-data-source.mjs` bu politikayi zorunlu kilar: TTL 1-6 saat araliginda olmali, stale-on-error mevcut olmali. Memo'yu kapatmak (`= 0`) artik fail'dir.

`scripts/check-university-data-source.mjs`, `app/`, `components/` ve `lib/` runtime kaynaklarinin `app/data.ts` import etmesini yasaklar. `/api/universities`, sitemap, university metadata layout'lari ve chat context `getUniversitiesData()` uzerinden calismalidir.

---

## Program Modeli ve Admission Details

`types/universities.ts` program tipleri:

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

UI paneli: `components/university-details/ProgramAdmissionDetailsPanel.tsx`. Panel, ham alanlari alt alta basmak yerine kaynakli kabul dosyasi olarak sunar: program ozeti, basvuru takvimi, kabul kosullari, belgeler, acik belirsizlikler ve URL bazinda gruplanmis kaynak izi. `field_refs`, `sources`, `retrieved_at` ve `[uncertain]` isaretlerinin sunum eslemesi `components/university-details/programAdmissionPresentation.ts` icindedir; kaynak alintilari birlestirilmez veya kaybedilmez. Dossier'daki ItalyPath AI aksiyonu `/ai-mentor?desk=ai&program=...&university=...&focus=...` ile baglami tasir ve mesaji otomatik gondermeden taslak olarak acar.

DB setup/policy: `supabase/program_admission_details.sql`.

Dogrulama: `npm run check:program-details`, `npm run check:admission-dossier` ve `node scripts/check-universities-server-compose.mjs`.

### Program deadline kaynagi

Gercek EU/non-EU basvuru tarihleri Supabase `program_admission_details` tablosundaki `application_deadline_eu` ve `application_deadline_non_eu` alanlarindan gelir. Bos kalan local `Department.deadline`/override altyapisi 2026-07-22'de kaldirildi. Tarihsel scrape tasarim/plan belgeleri `docs/superpowers/` altinda yalnizca arsiv niteligindedir.

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
- `/ekip/mentor`
- `/favorites`
- `/hosgeldin`
- `/hub`
- `/sat`
- `/api/chat`
- `/profile`

Navbar artik signed-out durumda **modal acmaz**; `<Link href="/giris">` ile tam sayfa `/giris`'e gider. BottomNav ve protected CTA linkleri signed-out durumda `/giris?redirect_url=...` adresine gider (`/sign-in?redirect_url=...` referanslari kalmadi).

`npm run check:routes`, public/protected matrix'i ve scholarship GeoJSON fetch kurallarini smoke-test eder. `npm run check:auth-ui`, `/giris` sayfasinin ve auth migration'inin butunlugunu dogrular.

---

## Ozellik Mimarileri

### Auth (Giris/Kayit)

`/giris` tek sayfa giris+kayit deneyimidir. Clerk altyapisi korunur; UI tamamen `@clerk/elements` (Level 2 - headless primitives) ile bizim tarafimizda.

- Sekme toggle: "Giris Yap" / "Kayit Ol"; `?mode=kayit` URL parametresi acilis sekmesini belirler
- OAuth: Google, giris sekmesinde gosterilir; ilk Google girisi Clerk tarafinda hesap da olusturabilir
- E-posta yolu: Kayit'ta Kullanici Adi + E-posta + Sifre; Giris'te E-posta + Sifre; her ikisi de Sifre goster/gizle toggle'i ile
- E-posta dogrulama: 6 haneli OTP, otomatik submit, Clerk'in native `resendableAfter` ile geri sayim
- "Sifremi unuttum": 2 adimli (e-posta -> kod + yeni sifre); inline akis, ayri sayfa degil
- Yonlendirme: `?redirect_url=...` varsa oraya; yoksa sign-in `/hub`'a, sign-up `/hosgeldin`'e gider (ClerkProvider `signInFallbackRedirectUrl="/hub"` / `signUpFallbackRedirectUrl="/hosgeldin"`)
- Eski URL'ler: `/sign-in` ve `/sign-up` `next.config.ts` `redirects()` ile 308 yonlendirilir; sorgu parametreleri korunur

Bilesenler `components/auth/` altinda:

- `AuthShell.tsx`: paper bg + wordmark + ortali kart + yasal alt metin
- `AuthCard.tsx`: surface bg + ince border kart konteyneri
- `AuthTabs.tsx`: ARIA tablist + ok tuslari ile gecis + roving tabIndex
- `OAuthButtons.tsx`: `Clerk.Connection name="google"` + "veya" ayirici
- `SignInForm.tsx`, `SignUpForm.tsx`: form akislari
- 6 haneli dogrulama adimi `SignUpForm.tsx` icindeki Clerk Elements strategy'sinde render edilir
- `PasswordResetFlow.tsx`: 2 adimli sifremi unuttum akisi

Tum metinler `lib/translations.ts` `auth.*` namespace altinda (TR + EN paralel). Tasarim notu: `docs/superpowers/specs/2026-06-16-auth-redesign-design.md`. Uygulama plani: `docs/superpowers/plans/2026-06-16-auth-redesign-plan.md`.

Clerk Elements v0.24.18 ile bilinen sapmalar (gelecek auth degisikliklerinde dikkat):

- OAuth butonu icin `Clerk.Connection` (NOT eski `SignIn.SocialProvider`)
- Virtual routing OAuth donusu icin `/giris/sso-callback` sayfasi korunmali; kaldirilirsa Google donusu 404'e duser
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

SEO Adim 3 Part 1 (`288dd5d`, breadcrumb polish `b1fd488`):

- Ana sayfaya explicit `alternates.canonical: "/"` eklendi
- `app/layout.tsx` site geneli gercek bilgiye dayali `Organization` + `WebSite` JSON-LD tasir; dogrulanmamis logo/sosyal hesap/SearchAction eklenmez
- University detail sayfalari 3 seviyeli, program detail sayfalari 4 seviyeli `BreadcrumbList` JSON-LD tasir
- University/program kaydi bulunamazsa route `notFound()` ile gercek HTTP 404 dondurur; veri kaynagi hata verirse editorial "veri yuklenemedi" govdesi korunur

Son canli SEO kabul audit notlari (2026-07-22):

- `robots.txt` ve `sitemap.xml` `.app` icin PASS; sitemap `1087` URL tasiyor (`6` statik + `64` university + `1017` program) ve `.com` URL kalmadi
- Sitemap'teki `1087/1087` URL HTTP 200, tekil self-canonical, title, description, gorunur H1, server HTML ve parse edilebilir JSON-LD kontrollerinden gecti; bailout/noindex/server hata govdesi yok
- `64/64` university breadcrumb'i ve `1017/1017` program breadcrumb'i canonical/H1/sira sozlesmesini gecti
- `www.italypath.app` SSL/redirect hijyeni duzeltildi: `https://www.italypath.app` artik `308` ile `https://italypath.app/` adresine gider
- Name.com DNS Vercel'in yeni onerilerine guncellendi: apex `A -> 216.198.79.1`, `www` CNAME Vercel'in project-specific `vercel-dns-017.com` hedefine gider
- Google Search Console domain property `italypath.app` dogrulandi; `https://italypath.app/sitemap.xml` gonderildi; kritik URL'ler icin URL Inspection + Request Indexing yapildi (`/`, `/universities`, `/isee`, `/scholarships`, `/cities`, `/communities`)
- SEO 3 Part 2 icin henuz ayri spec/plan yoktur. Yeni schema yalnizca sayfada gorunen, dogrulanmis bilgiye dayanmali; Rich Results Test ve Search Console URL Inspection ile deploy sonrasi kontrol edilmelidir

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

### Mentor Masalari (AI + Gonullu)

`/ai-mentor` protected route'tur. UI uc masali consultation desk modelidir:

- ItalyPath AI: aktif; native Gemini streaming masasi.
- ItalyPath Gonullu Ekip: aktif; Supabase uzerinde kalici, site ici insan yazismasi.
- ItalyPath Uzman: ayri uzman lead-form projesi tamamlanana kadar `coming-soon`.

AI backend'i `app/api/chat/route.ts` icindedir.

- `GEMINI_API_KEY` yoksa `503`
- malformed body veya gecersiz messages icin `400`
- Gemini model: `gemini-2.5-flash`
- response: text/plain `ReadableStream`
- sistem promptu `getUniversitiesData()` ile canli university/program listesinden uretilir

Risk: Supabase department sayisi buyudukce chat system prompt'u da buyur. Latency/cost ve token boyutu izlenmeli.

Gonullu masa mimarisi:

- Ogrenci yuzeyi `components/mentor/volunteer/VolunteerDesk.tsx`; veri hook'u `lib/mentor/useVolunteerDesk.ts`.
- `/ekip/mentor`, tek aktif operator icin staff-allowlist ile korunan inbox'tir. Kullaniciya gorunen gonderen markasi `ItalyPath Gonullu Ekip`tir.
- Tablolar: `mentor_staff`, `mentor_conversations`, `mentor_messages`. RPC idempotency kayitlari ogrenci tarafindan okunamayan ayri private tabloda tutulur.
- Yazmalar yalnizca `start_volunteer_conversation`, `send_student_mentor_message`, `send_staff_mentor_message` ve `close_volunteer_conversation` RPC'leriyle yapilir. Operator girisi `is_active_mentor_staff` RPC'siyle ayrica dogrulanir.
- Okumalar ve canli olaylar Clerk'in native session token'i ile Supabase RLS + Realtime kullanir; mentor kodunda deprecated Clerk `supabase` JWT template'i veya service-role key yoktur.
- V1: bir operator, ogrenci basina tek acik gorusme, yalnizca duz metin, ek/atama/not/typing/read receipt/otomatik bildirim yok. Her iki taraf gorusmeyi kapatabilir; kapali gecmis hesap silinene kadar salt okunur tutulur.
- Kalici kontrol: `npm run check:mentor-desks`, `npm run test:volunteer-desk`, `npm run test:mentor-operator` ve `npm run test:mentor-db`. Production kabulunde ayrica normal ogrenci + operator hesaplariyla iki-hesap RLS/Realtime matrisi uygulanir.

Production acilisi Clerk third-party auth, SQL kurulumu ve `mentor_staff` provision adimlari tamamlanmadan yapilmaz; ayrintilar `SUPABASE_SECURITY_RUNBOOK.md` icindedir.

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

`/hub` protected editorial "akilli oneri merkezi" deneyimidir. Ana component `app/hub/page.tsx`, gorsel parcalar `components/hub/*`.

Veri kaynaklari:

- Clerk user profile
- `useFavorites`
- `useUniversitiesData` (`/api/universities`; `app/data.ts` seed'ine donme yok)
- Supabase `user_profiles` (`lib/hub/useUserProfile.ts`)
- Supabase `user_documents` count (`lib/hub/useDocumentsCount.ts`)
- localStorage `italyPathUniversitiesViewMode`
- forward-compat `italyPathLastMentorDesk`

`/hosgeldin` protected 4 adimli onboarding sihirbazidir. Kayit sonrasi fallback hedefi burasidir; "Simdilik gec" kullaniciyi `/hub`'a yollar. Profil dolu kullanici bu sayfayi tekrar actiginda cevaplarini duzenler.

Profil modeli:

- `lib/hub/profile.ts`: level/field/budget/city enum'lari, `UserProfile`, bos profil guard'i
- `types/index.ts`: explicit `UserProfileRow` interface'i
- Supabase tablo setup'i: `supabase/user_profiles.sql` (`user_id` Clerk id primary key, RLS `requesting_user_id()`)

Oneri motoru:

- `lib/hub/recommendations.ts` saf fonksiyonlardan olusur; AI cagrisi yoktur
- `matchPrograms(profile, universities)`: seviye sert filtre, alan sert filtre, sehir bonus, admissionDetails bonus, zayif sonuc guard'i
- `pickScholarshipRegion(matches)`: en iyi eslesme sehirlerinden bolge burs kaydi secer
- `pickCities(matches, cityPref)`: curated sehir rehberlerinden 2-3 kart secer

Yeni Hub layout'u profil varsa: `DossierTopStrip` -> `ProfileStrip` -> `RecommendationHero` -> `ProgramMatchList` -> `ScholarshipBlock` -> `CityPicksBlock` -> kompakt favori/belge kartlari -> `PreferencesStrip` -> `AccountFooter`.

Profil yoksa onerilerin yerinde `ProfileInviteCard` gosterilir; kompakt favori/belge kartlari ve footer yine kalir. Dort sorunun hepsi bossa kullanici profilsiz sayilir; en az bir cevap varsa guard'li oneriler uretilir.

Emekli edilenler: `StageStrip`, `DossierHero`, Hub `BentoGrid`, `KisaListeCell`, `BelgeCell`, `BursNotuCell`, `ToplulukNotuCell`, `lib/hub/stages.ts`, `lib/hub/useHubStage.ts`. `italyPathStage` localStorage anahtari artik okunmaz; `/hub` ilk yuklemede sessizce siler.

Dogrulama: `npm run check:hub-onboarding` ve `npm run check:university-data-source`.

### SAT Soru Bankasi

`/sat` protected soru cozme deneyimidir. Public route listesine eklenmez; `PROTECTED_PAGE_ROUTES` icinde acikca yer alir ve signed-out kullanici `/giris?redirect_url=/sat` adresine yonlenir. Robots disallow listesinde tutulur.

Veri modeli `supabase/sat_bank.sql` icindedir: `sat_questions` dogrudan anon/authenticated okumaya kapali, yalnizca server API tarafindan `SUPABASE_SERVICE_ROLE_KEY` ile okunur; `sat_attempts` Clerk user id uzerinden `requesting_user_id()` RLS ile kullanicinin kendi denemelerine aciktir.

Server katmani `lib/sat/questions.server.ts`: service role client, 3 saatlik in-memory memo, single-flight refresh ve stale-on-error davranisi kullanir. API route `app/api/sat/questions/route.ts` `force-dynamic` ve `Cache-Control: no-store` dondurur.

Client yuzeyi `app/sat/page.tsx` ve `components/sat/*` altindadir. `MathText` KaTeX ile `$...$` ifadelerini render eder; `lib/sat/answers.ts` SPR sayi/kesir cevap eslestirmesini yapar. Soru fetch ve attempt yazimi `lib/sat/useSatBank.ts` / `lib/sat/useSatAttempts.ts` hook'larindadir.

Yanlislarim v1 tamamen client-side turetilir: `sat_attempts` son denemesinde `is_correct=false` olan soru id'leri konu satirinda sayilir ve `/sat` topics gorunumunde mevcut soru fetch'i istemcide filtrelenerek tekrar oturumu baslatir; yeni tablo/API/route yoktur.

Pipeline `scripts/sat/` altindadir: mekanik PDF/answer/RW/math slice adimlari, ayri LLM extract runbook'u, validate/import adimlari. Ara ciktular `tmp/sat-bank/` altinda kalir ve commit edilmez. Dogrulama: `npm run check:sat-bank`.

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

- Icerik: `lib/legal/documents.ts` (yapilandirilmis Turkce metin; yasal iletisim adresi `contact@italypath.com`)
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
- `user_profiles`: onboarding cevaplari ve hub oneri profili
- `mentor_staff`: aktif gonullu operator allowlist'i (V1'de tek aktif satir)
- `mentor_conversations`: ogrenciye ait kalici gorusme, konu ve durum kaydi
- `mentor_messages`: ogrenci/gonullu duz metin mesajlari; staff kullanici kimligi tasimaz
- `universities`: university base rows
- `university_departments`: program rows, languages/duration/level/sort
- `program_admission_details`: program admission metadata ve source/uncertainty modeli

SQL/runbook dosyalari:

- `supabase/rls_hardening.sql`: favorites, user_documents ve storage RLS hardening
- `supabase/program_admission_details.sql`: program admission details tablo/policy/grant setup
- `supabase/user_profiles.sql`: onboarding profil tablo/policy/grant setup
- `supabase/volunteer_mentor.sql`: mentor tablolar, private idempotency, RLS, RPC ve Realtime setup
- `SUPABASE_SECURITY_RUNBOOK.md`: Clerk + Supabase operasyon rehberi

Gercek production schema dashboard'dan dogrulanmalidir.

---

## Environment Degiskenleri

`.env.local` git'e girmez.

| Degisken | Kullanim |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only SAT soru okuma/import islemleri; client bundle'a girmemeli |
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
npm run check:sat-bank
npm run check:auth-ui
npm run check:hub-onboarding
npm run check:mentor-desks
npm run test:volunteer-desk
npm run test:mentor-operator
npm run test:mentor-db
npm run check:cities
npm run check:program-details
npm run check:admission-dossier
npm run check:data
npm run check:local-data
npm run check:university-data-source
npm run check:isee
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
2. Legacy local seed `app/data.ts` icindeki bazi universite gorselleri tekrarli/placeholder kalitesinde; runtime bu veriyi kullanmaz.
3. Universite karsilastirma ozelligi yok; mevcut favori + university data modeliyle yapilabilir.
4. Search Console `Sitemaps`, `Pages`, Core Web Vitals ve URL Inspection durumlari izlenmeli; bu production verisine repo icinden erisilemez.
5. SEO 3 Part 1 tamamlandi; Part 2 icin ayri spec/plan henuz yazilmadi. Hidden/uydurma schema yok; sadece sayfada gorunen gercek bilgiye dayali structured data eklenmeli.
6. `Organization` + `WebSite` JSON-LD root layout nedeniyle her sayfada tekrar eder. Bu gecersiz degildir; Google ana sayfa veya tek bir kurumsal sayfanin yeterli oldugunu belirttigi icin ileride dusuk oncelikli sadeleştirme olarak degerlendirilebilir.
7. AI Mentor system prompt'u canli program sayisi arttikca buyuyor; prompt boyutu, latency ve maliyet izlenmeli.

### Repo hijyeni

1. Research/import artifact klasorleri (`output/*`, `*-admission-requirements/`, scrape JSON/PNG ciktilari) repoya commitlenmis ve son birlesmeyle hacmi buyumus durumda; dis storage'a mi yoksa `.gitignore`'a mi alinacagi netlestirilmeli.
2. Legacy UI dosyalari (`components/ui/scroll-based-velocity.tsx` gibi) aktif import edilmiyorsa silinmeli veya "kullanma" diye isaretlenmeli.
3. `.DS_Store`, `.swp`, editor artifact'leri repo'ya girmemeli.

---

## Agent Kurallari

1. Tailwind v4: `tailwind.config.*` olusturma. Tema/token degisiklikleri `app/globals.css` icinde `@theme` ve CSS variable modeliyle yapilir.
2. Global state icin React Context ve mevcut hook pattern'leri yeterli. Redux/Zustand/Jotai ekleme.
3. Hook'lar mevcut pattern geregi `lib/` altinda tutulur.
4. SEO gereken dinamik route'larda `generateMetadata()` Server Component `layout.tsx` dosyasinda kalir; client page'e tasima.
5. Route guvenligi `proxy.ts` uzerinden yonetilir; `middleware.ts` olusturma.
6. Runtime kodunda `app/data.ts` import etme. Live university/program data icin `getUniversitiesData()` veya `/api/universities`, domain tipleri icin `types/universities.ts` kullan.
7. UI metinleri `lib/translations.ts` icinde TR/EN paralel tutulur.
8. Supabase generated types yok; yeni DB row ihtiyacinda `types/index.ts` icine explicit interface ekle.
9. SEO icin hidden keyword block, `display:none` SEO metni veya botlara farkli icerik ekleme. Kullaniciya gorunmeyen SEO text yasak.
10. Public SEO sayfalarinda page-level CSR bailout riskine dikkat et. `useSearchParams`/Suspense kullanimi kritik ilk HTML'i skeleton'a dusuruyorsa server wrapper + client leaf pattern'ini tercih et.
11. Existing dirty worktree varsay; kullanici degisikliklerini revert etme.
12. Yeni agent, once bu dosyayi, sonra ilgili feature dosyalarini, sonra dogrulama scriptlerini okumali.
