# ItalyPath - Agent Context & Knowledge Base

Bu dosya yeni agent'larin projeyi hizli ve dogru anlamasi icin tutulur; guncel mimari ve calisma kurallarinin kaynak dokumanidir. `AGENT_COMMITS.md` tarihsel ve eksik degisiklik notlaridir (Git gecmisi esastir). `AGENT_CONTEXT_FIX_REPORT.md` 2026-06-11'de uygulanmis eski bir audit arsividir. En son context degerlendirmesi `docs/CONTEXT_AUDIT_2026-09-19.md` icindedir; bu dosyadaki 2026-09-21 duzeltmeleri o raporun uygulama sirasinin 1. ve 2. adimidir. Okumaya kok `AGENTS.md` ile basla; tek acik is listesi `docs/STATUS.md`, tasarim/plan belgelerinin durumu `docs/superpowers/INDEX.md` icindedir (3. adim, 2026-09-21).

Son guncelleme: 2026-09-21 (dogrulandigi commit: `acdb71a`; canli Supabase sayimi ayni gun)

Sayilar bu dosyada tarihli snapshot olarak gecer. Guncel sayim "Canli university/program verisi" bolumundedir; eski tarihli bolumlerdeki sayilari bugunku gercek sayma.

---

## Proje Tanimi

ItalyPath, Italya'da egitim almak isteyen Turk ogrenciler icin Next.js tabanli rehber uygulamasidir. Public tarafta universite/program arama, sehir rehberleri, bolgesel burs haritasi, ISEE Parificato hesaplayici, kurate edilmis topluluk rehberi, ucretsiz on gorusme formu ve `/ai-mentor` danisma merkezi (uc masa: ItalyPath AI arayuzde `paused`, Gonullu Ekip giris ister, Uzman formu public) vardir. Giris gerektiren tarafta gonullu ekip yazismasi, favoriler, belge cuzdani, SAT soru bankasi, onboarding (`/hosgeldin`) ve kisisel calisma dosyasi (`/hub`) bulunur. Erisim modelinin tek kaynagi `proxy.ts` ve asagidaki "Auth ve Route Matrix" bolumudur.

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
├── AGENTS.md                       # Kisa giris: okuma sirasi + degismez kurallar (ONCE BUNU OKU)
├── app/
│   ├── layout.tsx                  # ClerkProvider, LanguageProvider, MobileZoomLock, RouteTransition
│   ├── page.tsx                    # Home server wrapper (ISR 3h); stats getUniversitiesDirectory() kaynakli
│   ├── sitemap.ts                  # getUniversitiesDirectory() ile dinamik sitemap; lastModified = DB updated_at ∨ PAGE_TEMPLATE_LAST_MODIFIED
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
│   ├── on-gorusme/page.tsx         # Public ucretsiz on gorusme sayfasi (server wrapper)
│   ├── ai-mentor/page.tsx          # Public consultation desks UI (AI masasi paused; gonullu masa giris ister)
│   ├── ekip/mentor/page.tsx        # Protected, staff-allowlisted gonullu operator inbox
│   ├── ekip/uzman/page.tsx         # Protected, staff-allowlisted uzman lead inbox
│   ├── universities/
│   │   ├── layout.tsx              # /universities SEO metadata
│   │   ├── page.tsx                # Server SEO wrapper + crawlable preview + client explorer
│   │   └── [id]/
│   │       ├── layout.tsx          # Server generateMetadata
│   │       ├── page.tsx            # Server SEO wrapper + client university portrait
│   │       └── departments/[deptSlug]/
│   │           ├── layout.tsx      # Server generateMetadata
│   │           └── page.tsx        # Server SEO wrapper (pruneUniversityForProgram, EducationalOccupationalProgram JSON-LD) + client program portrait
│   ├── cities/page.tsx
│   ├── communities/page.tsx        # Public atlas; force-dynamic SEO 2.5 wrapper
│   ├── topluluklar/page.tsx        # redirect -> /communities
│   ├── yasal/[slug]/page.tsx       # Public legal pages (gizlilik/kullanim/cerez)
│   ├── scholarships/page.tsx
│   ├── isee/
│   │   ├── layout.tsx              # /isee SEO metadata
│   │   └── page.tsx                # Server wrapper -> components/isee/IseeParificatoClient.tsx
│   ├── favorites/page.tsx
│   ├── documents/page.tsx
│   ├── hub/page.tsx                # Protected profil bazli oneri merkezi
│   └── sat/page.tsx                # Protected SAT soru bankasi client deneyimi
├── components/
│   ├── Navbar.tsx
│   ├── HomePageClient.tsx          # Home client leaf; Navbar/Hero/sections/Footer composition
│   ├── MobileZoomLock.tsx          # Coarse pointer pinch/double-tap/edge-swipe guard
│   ├── RouteTransition.tsx
│   ├── HeroSection.tsx
│   ├── home/HomeToolsSection.tsx   # Ana sayfa 7 ucretsiz arac vitrini
│   ├── consultation/               # On gorusme bolumu, SSS, mobil sabit buton, ConsultPrompt, /on-gorusme client leaf
│   ├── VelocityBridge.tsx
│   ├── ScholarshipsSection.tsx
│   ├── IseeSection.tsx
│   ├── isee/                       # ISEE Parificato sihirbazi: client leaf, wizard, steps, result, explainer, fields, format
│   ├── Footer.tsx
│   ├── cities/CityGuidesExplorer.tsx
│   ├── communities/CommunityAtlas.tsx
│   ├── scholarships/ScholarshipsExplorer.tsx
│   ├── sat/                        # SAT konu listesi, soru karti, KaTeX MathText, oturum ozeti
│   ├── universities/              # Server-safe rows + UniversitiesExplorer client leaf
│   ├── university-details/         # Detail client leaves, portrait headers, program directory, kabul dosyasi (ProgramAdmissionDetailsPanel, ProgramSummaryStrip, ProgramSourceTrail, programDossierShared), DetailBreadcrumb, RelatedLinks, ProgramNextSteps
│   ├── mentor/                     # Mentor hub + AI, gonullu ogrenci ve operator yuzeyleri
│   ├── legal/                      # LegalDocument.tsx (yasal belge sunum bileseni)
│   ├── auth/                       # /giris parcalari: AuthShell, AuthCard, AuthTabs, OAuthButtons, SignInForm, SignUpForm, PasswordResetFlow (6 haneli dogrulama adimi SignUpForm icindedir)
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
│   ├── admissionPresence.ts        # hasAdmissionDossier(department): tam veri veya hasAdmissionDetails bayragi
│   ├── programMetadata.ts          # Program sayfasi Turkce title/description (saf modul); guard check:program-metadata
│   ├── relatedLinks.ts             # buildRelatedLinks: ayni sehir okullari, sehir rehberi, bolge bursu, ayni degree_class kodlu programlar
│   ├── useFavorites.ts
│   ├── translations.ts
│   ├── cities/data.ts
│   ├── communities/chapters.ts
│   ├── community-links.ts
│   ├── legal/documents.ts          # Yasal sayfa metinleri (TR) + footer/sitemap linkleri
│   ├── hub/                        # profile.ts, useUserProfile.ts, recommendations.ts, useDocumentsCount.ts
│   ├── isee/                       # parificato.ts (saf hesap), reference.ts (kur + limit verisi), verdict.ts (isik), wizardState.ts (form)
│   ├── mentor/                     # Channel registry, native Clerk/Supabase hooks ve state/controller helper'lari
│   ├── sat/                        # SAT types, SPR answer matching, server memo, client hooks
│   └── scholarships/regions.ts
├── types/
│   ├── index.ts                    # Shared app types + Supabase row interfaces
│   ├── universities.ts             # University/Department/admission domain tipleri
│   ├── cities.ts
│   └── scholarships.ts
├── public/data/italy-regions.geojson
├── public/llms.txt                 # AI asistanlari icin discovery dosyasi; proxy allowlist'te (2026-09-21)
├── scripts/
│   ├── check-route-access.mjs
│   ├── check-ai-search-readiness.mjs # public/llms.txt icerigi + robots + proxy allowlist (/llms.txt) statik kontrolu
│   ├── check-program-metadata.mjs   # Turkce program metadata sablonu guard'i
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
│   ├── save-scraped.mjs             # LEGACY deadline scrape kaydetme yardimcisi
│   ├── scrape-deadlines-runbook.md  # LEGACY scrape runbook (LLM extract icermez); guncel veri girisi yolu degil
│   ├── import-*-program-details.mjs # Bologna/Ca'Foscari/Genoa/Milan/Milano-Bicocca/Padua/Polimi/Polito/Sapienza
│   ├── sat/                        # PDF -> JSON pipeline ve import scriptleri
│   └── clean-med-data.mjs
├── supabase/
│   ├── rls_hardening.sql
│   ├── program_admission_details.sql
│   ├── user_profiles.sql
│   ├── volunteer_mentor.sql        # Gonullu mentor tablolar/RLS/RPC/Realtime kontrati
│   ├── expert_leads.sql            # Uzman lead tablosu, staff-only RLS
│   ├── program_degree_class_codes.sql # Salt okunur view (2026-09-19); dizin sorgusu buna BAGIMLI
│   ├── sat_bank.sql                # sat_questions service-role-only + sat_attempts RLS
│   ├── sat_explanations.sql        # sat_questions aciklama kolonlari (service-role-only ek)
│   └── add_documents_category.sql  # user_documents.category kolonu (idempotent)
├── docs/
│   ├── AI_SEARCH_VISIBILITY_PLAN.md
│   ├── SOCIAL_MEDIA.md             # @eduitalya sosyal medya baglami (kreatif marka adi: "Eduitalya Italypath")
│   ├── CONTEXT_AUDIT_2026-09-19.md # Son context degerlendirmesi
│   ├── STATUS.md                   # Tek acik is listesi ve kanitlanmis son durum
│   └── superpowers/
│       ├── INDEX.md                # Her brif/spec/plan belgesinin durumu ve kaniti
│       ├── briefs/                 # ajan brifleri
│       ├── specs/                  # tasarim belgeleri (tarihli; durum etiketi henuz yok, uygulanmis olanlarda "onay bekliyor" kalmis olabilir)
│       └── plans/                  # uygulama planlari (checkbox'lar ilerlemeyi YANSITMAZ; gercek durum icin SEO_AUDIT §23 gibi kayitlara bak)
├── SEO_AUDIT.md                    # SEO olcum/duzeltme kaydi (§1 ozeti tarihsel; guncel is listesi son bolumlerde)
├── EDITORIAL_AUDIT.md              # Temmuz 2026 editorial snapshot
├── DATA_ENTRY_GUIDE.md
├── SUPABASE_SECURITY_RUNBOOK.md
├── AGENT_COMMITS.md                # tarihsel/eksik degisiklik notlari; Git gecmisi esastir
└── AGENT_CONTEXT_FIX_REPORT.md     # 2026-06-11 uygulanmis audit arsivi
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
- `program_degree_class_codes` (salt okunur VIEW, `supabase/program_degree_class_codes.sql`, 2026-09-19): `degree_class` serbest metninden cikarilmis kisa resmi kodlar (LM-32 gibi). `security_invoker = true`, yazma yetkisi yok. Yeni Supabase ortami kurulurken bu view olusturulmazsa dizin sorgusu hata verir.

Iki calisma zamani fonksiyonu vardir (2026-09-15 egress diyeti; tam veri seti compose'u runtime'dan kaldirildi):

- `getUniversitiesDirectory()`: `universities` + `university_departments` + `program_admission_details` uzerinden `select("department_id,updated_at")` (yalnizca VARLIK + sitemap `lastModified` icin tarih) + `program_degree_class_codes` view'inden `select("department_id,degree_class_codes")`. Her `Department` `hasAdmissionDetails` bayragi ve varsa `degreeClassCodes`/`updatedAt` tasir, `admissionDetails` alani yoktur. Sikistirilmis ~50 KB (dizin ~47 KB + kod view'i ~4 KB). Kullananlar: `/`, `/universities`, `/cities`, sitemap, `/api/universities`, `/api/chat`, program sayfasinin ilgili baglanti hesabi.
- `getUniversityById(id)`: tek okulun `id`/`university_id` filtreli tam verisi (`admissionDetails` dahil), ~90-180 KB. Kullananlar: universite/program detay page + layout'lari. Program sayfasi bu veriyi istemciye gondermeden once `pruneUniversityForProgram` ile budar: yalnizca acilan programin `admissionDetails`i kalir, diger programlar bayraga iner (17 Eylul olcumu: budanmazsa RSC yuku medyanda 277 KB, en kotu 2 MB).
- `composeUniversitiesFromSupabaseRows(uniRows, deptRows, admissionRows = [], presenceIds?)` saf compose; `scripts/check-universities-server-compose.mjs` test eder.
- Kabul dosyasi varligini okumak icin `lib/admissionPresence.ts` `hasAdmissionDossier(department)` kullanilir (hub oneri bonusu, "yakinda" rozeti).

Canli Supabase sayimi (2026-09-21, `select count(*)`; 19 Eylul 2026 veri temizliginde 8 okul + 67 program silindi, 41 arastirilmis kabul dosyasi import edildi):

- `56` university, `39` sehir
- `941` department (program)
- level dagilimi: `167 bachelor`, `741 master`, `33 single-cycle`
- language dagilimi: `941 en`, `130 it` (cok dilli satirlar iki kez sayilir)
- `941` program_admission_details satiri: her programin kabul dosyasi var, dosyasiz program YOK
- `803` programda view'den gelen resmi degree class kodu var
- sitemap `1.004` URL (7 statik + 56 okul + 941 program)

Eski belgelerde gecen `64 okul / 1017 program / 1.087 URL` (22 Temmuz 2026) sayilari tarihseldir; bugunku gercek olarak kullanma.

### API ve cache kurali

`app/api/universities/route.ts`:

- `export const dynamic = "force-dynamic"`
- `Cache-Control: no-store, max-age=0`
- hata durumunda `503`

`lib/useUniversitiesData.ts`:

- browser fetch icin `cache: "no-store"`
- client process icinde in-memory cache + request dedupe yapar

`lib/universities.server.ts` (2026-07-02 egress kota asimi; 2026-09-15 egress diyeti + ISR):

- Her iki fonksiyon sonucunu **3 saatlik in-memory memo**da tutar (`SERVER_CACHE_TTL_MS`; dizin icin tek memo, okul basina ayri memo), single-flight ve stale-on-error uygular. Supabase fetch hata verirse eldeki bayat memo sunulur; memo yoksa hata firlatilir ve route-level editorial error govdesi calisir.
- Tam veri seti sikistirilmis ~4,6 MB'dir ve %98'i `program_admission_details`tir. 2026-09-15 oncesinde her soguk Vercel instance'i (gunde 82-88 tane) bunu tam cekiyordu: gunde ~390 MB, donemde 7,3 GB (Free kota 5 GB). Agir kabul metinleri artik yalnizca detay sayfalari icin, hedefli sorguyla cekilir; beklenen gunluk egress ~10 MB.
- ISR: `app/page.tsx`, `app/universities/[id]/page.tsx` ve program `page.tsx` `export const revalidate = 10800` tasir; detay rotalari bos `generateStaticParams()` ile "statik uretilebilir" olur (build'de sayfa uretilmez, ilk istekte uretilip Vercel onbelleginde 3 saat tutulur). Bu sayfalar sunucu tarafinda `searchParams`/`cookies()`/`headers()` OKUMAZ; aksi halde rota sessizce dinamige duser. `/universities` ve `/cities` `searchParams` okudugu icin dinamik kalir ama dizinle calisir.
- Her deploy memo'yu ve ISR onbellegini sifirlar. Import sonrasi yayin suresi icin KESIN UST SINIR YOKTUR: yenileme araligi 3 saattir ama yeni veri ancak bir istek geldiginde, memo suresi dolmussa ve yeniden uretim basariyla bittiginde gorunur (ISR stale-while-revalidate: suresi dolan sayfayi ilk isteyen hala eski sayfayi alir, yenileme arka planda baslar). Memo ile ISR saatleri ayrisabilir; kaynak hatasinda stale-on-error eski veriyi daha da uzun tutar. Acil yayin yolu: yeniden deploy (memo + ISR sifirlanir); on-demand revalidation yoktur. Import sonrasi canlida dogrulama yap, "3 saat gecti, kesin yansidi" varsayma.
- Guard'lar: `npm run check:university-data-source` (tam compose export'u yasak, dizin/hedefli fonksiyonlar ve cagiran dosya eslesmesi, `select("department_id,updated_at")`, view okuma zorunlu (`program_degree_class_codes` + `select("department_id,degree_class_codes")`, uzun `degree_class` metni dizinde yasak), `eq("university_id", …)`, TTL 1-6 saat, stale-on-error, API no-store, hook `fetchWhenInitial`), `npm run check:seo-vitals` (revalidate/generateStaticParams/searchParams kurallari), `node scripts/check-universities-server-compose.mjs` (`hasAdmissionDetails` uc durum).

`scripts/check-university-data-source.mjs`, `app/`, `components/` ve `lib/` runtime kaynaklarinin `app/data.ts` import etmesini yasaklar. `/api/universities`, sitemap ve chat context `getUniversitiesDirectory()`; university/program metadata layout'lari `getUniversityById()` uzerinden calismalidir.

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

Route guvenligi sadece `proxy.ts` ile saglanir. `middleware.ts` olusturma. Bu bolum ve `proxy.ts` erisim modelinin TEK kaynagidir; README ve diger bolumler buna uyar. `/ai-mentor` public'tir (AI masasi arayuzde paused, gonullu masa sayfa icinde `/giris`'e yonlendirir, uzman formu public); `/api/chat`, `/api/sat/*` ve `/ekip/*` protected'dir.

Public route pattern'leri:

- `/`
- `/ai-mentor(.*)`  # public consultation hub; robots disallow/sitemap exclusion sürer
- `/api/expert-leads(.*)` # public, yalnızca POST expert lead gönderimi
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
- `/on-gorusme(.*)`  # ucretsiz on gorusme sayfasi; sitemap'te
- `/sitemap.xml`
- `/robots.txt`
- `/llms.txt`       # AI asistanlari icin discovery dosyasi; proxy matcher `.txt` uzantisini haric tutmadigi icin allowlist'te olmali (2026-09-21 oncesinde canlida 404 donuyordu)

Protected ornekler:

- `/documents`
- `/ekip/mentor`
- `/ekip/uzman`
- `/favorites`
- `/hosgeldin`
- `/hub`
- `/sat`
- `/api/chat`
- `/profile`

Navbar artik signed-out durumda **modal acmaz**; `<Link href="/giris">` ile tam sayfa `/giris`'e gider. Protected CTA linkleri signed-out durumda `/giris?redirect_url=...` adresine gider (`/sign-in?redirect_url=...` referanslari kalmadi). Mobil BottomNav 2026-07-23 tarihinde uygulama genelinden kaldirildi.

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

Tum metinler `lib/translations.ts` `auth.*` namespace altinda (TR + EN paralel). Esas referans (Clerk Elements mimarisi): `docs/superpowers/specs/2026-07-01-clerk-elements-auth-rebuild-design.md` ve `docs/superpowers/plans/2026-07-01-clerk-elements-auth-rebuild.md`; production redirect sertlestirmesi `docs/superpowers/*/2026-06-27-auth-production-redirect-hardening*`. 16 Haziran tasarim/plani (`2026-06-16-auth-redesign-*`) ilk surumun arsividir.

Clerk Elements v0.24.18 ile bilinen sapmalar (gelecek auth degisikliklerinde dikkat):

- OAuth butonu icin `Clerk.Connection` (NOT eski `SignIn.SocialProvider`)
- Virtual routing OAuth donusu icin `/giris/sso-callback` sayfasi korunmali; kaldirilirsa Google donusu 404'e duser
- `Clerk.FieldError` ve `Clerk.Loading` children-as-function pattern
- `SignUp.Action resend` `fallback` callback'i `({ resendableAfter }) => ...` imzasiyla cagrilir

### Dil sistemi

`context/LanguageContext.tsx`, TR/EN dil tercihini React Context + `localStorage` ile saklar ve `document.documentElement.lang` ile senkronlar. UI metinleri `lib/translations.ts` icindedir. Yeni metinler hard-code edilmemeli; TR/EN paralel eklenmeli.

### SEO ve domain durumu

Canonical marka/domain karari: **ItalyPath** ile devam ediliyor; canonical domain **`https://italypath.app`**. Sosyal medya/kreatif iceriklerde marka adi "Eduitalya Italypath" ve hesap `@eduitalya`dir (`docs/SOCIAL_MEDIA.md`); bu, site basligini, JSON-LD `Organization` adini veya domain'i degistirmek icin gerekce degildir.

SEO Adim 1 (`SEO 1` commit'i):

- `app/layout.tsx` icinde `metadataBase: new URL("https://italypath.app")`
- `app/robots.ts` ve `app/sitemap.ts` `https://italypath.app` uretir
- `/universities` ve `/isee` icin server `layout.tsx` metadata eklendi
- cities/scholarships/communities Open Graph URL'leri `.app` oldu
- dynamic university/program layout'larinda canonical + Open Graph URL var

SEO Adim 2 (`SEO 2` merge'i):

- `/universities`, `/universities/[id]`, `/universities/[id]/departments/[deptSlug]`, `/cities`, `/scholarships` icin ilk production HTML guclendirildi
- Target SEO sayfalarinda `BAILOUT_TO_CLIENT_SIDE_RENDERING` temizlendi
- `/universities` server HTML'i tum okullari (2026-09-21 itibariyla 56) okul basi 3 program etiketiyle tasir (2026-09-16'ya kadar 12 okuldu; Googlebot `/api/universities`'i robots nedeniyle cekemedigi icin ic linkler HTML'de olmali); tam program listesi client tarafinda `/api/universities` ile gelir
- `components/universities/UniversitiesExplorer.tsx`, `components/university-details/UniversityDetailClient.tsx` ve `DepartmentDetailClient.tsx` client leaf pattern'ini tasir
- `lib/useUniversitiesData.ts` initial data alabilir; initial data varsa skeleton/loading ile baslamaz
- Server fetch hata durumlari route-level editorial error block'a duser; global `app/error.tsx`'e dusmemesi hedeflenir
- Tasarim/spec: `docs/superpowers/specs/2026-06-21-seo-server-html-design.md`
- Plan: `docs/superpowers/plans/2026-06-21-seo-server-html-plan.md`

SEO Adim 2.5 (`SEO 2.5` deploy'u):

- `/`, `/isee`, `/communities` canli HTML'deki `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi temizlendi
- `/` server wrapper oldu; server'da canli stats hesaplar (o tarihte `getUniversitiesData()`, 2026-09-15'ten beri `getUniversitiesDirectory()`), hata durumunda stats `null` doner ve sayfa patlamaz
- Home UI `components/HomePageClient.tsx` client leaf'ine tasindi
- `/isee` server wrapper oldu; hesaplayici client leaf'e tasindi (2026-09-17'den beri `components/isee/IseeParificatoClient.tsx`)
- `/communities` `force-dynamic` ile static prerender + analytics kaynakli marker'dan cikarildi; atlas HTML'de gercek H1/chapter/topluluk satirlari tasimaya devam eder

SEO Adim 3 Part 1 (`288dd5d`, breadcrumb polish `b1fd488`):

- Ana sayfaya explicit `alternates.canonical: "/"` eklendi
- `app/layout.tsx` site geneli gercek bilgiye dayali `Organization` + `WebSite` JSON-LD tasir; dogrulanmamis logo/sosyal hesap/SearchAction eklenmez
- University detail sayfalari 3 seviyeli, program detail sayfalari 4 seviyeli `BreadcrumbList` JSON-LD tasir
- University/program kaydi bulunamazsa route `notFound()` ile gercek HTTP 404 dondurur; veri kaynagi hata verirse editorial "veri yuklenemedi" govdesi korunur

SEO Adim 3.5 (2026-09-15, kontrast + vitals guard; ayrinti `SEO_AUDIT.md` §19):

- `--editorial-terracotta-ink: #9f4629` tokeni eklendi; terracotta renkli METIN/ikon her yerde `text-[var(--editorial-terracotta-ink)]` kullanir (kucuk puntoda WCAG AA). Base `--editorial-terracotta` yalnizca buton/arka plan/cerceve icindir.
- `components/RouteTransition.tsx` icindeki `<AnimatePresence initial={false}>` ilk yuklemede alt agactaki tum framer-motion `initial` durumlarini devre disi birakir; sunucu HTML'i `opacity:1` ile gelir. Bu prop kaldirilirsa tum sayfalarda H1 hidrasyona kadar gizlenir. Guard: `npm run check:seo-vitals`.
- Mobil zoom kilidi (`maximumScale: 1`, `userScalable: false`, `MobileZoomLock`) bilincli urun karari; SEO siralama sinyali degildir, yeniden onerme.
- Gercek LCP darbogazi (devtools throttling ile dogrulandi): 2026-09-15 oncesinde soguk instance'da eski tam compose (`getUniversitiesData()`, kaldirildi) beklenirken HTML govdesi ~5 sn gecikirdi (egress diyeti + ISR ile cozuldu, `SEO_AUDIT.md` §20); sicak instance'da hala render-blocking CSS, 10 preload font dosyasi (164 KiB) ve JS ile bant genisligi yarisir. Simule Lighthouse'un "render delay" degeri bu yuzden animasyon kaniti degildir.
- Statik prerender edilen sayfalardaki `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi `app/layout.tsx` `<Analytics />` bileseninden gelir ve footer sonrasindadir; icerik sunucu HTML'inde oldugu surece zararsizdir.

Son canli SEO kabul audit notlari (2026-07-22):

- `robots.txt` ve `sitemap.xml` `.app` icin PASS; sitemap `1087` URL tasiyor (`6` statik + `64` university + `1017` program) ve `.com` URL kalmadi
- Sitemap'teki `1087/1087` URL HTTP 200, tekil self-canonical, title, description, gorunur H1, server HTML ve parse edilebilir JSON-LD kontrollerinden gecti; bailout/noindex/server hata govdesi yok
- `64/64` university breadcrumb'i ve `1017/1017` program breadcrumb'i canonical/H1/sira sozlesmesini gecti
- `www.italypath.app` SSL/redirect hijyeni duzeltildi: `https://www.italypath.app` artik `308` ile `https://italypath.app/` adresine gider
- Name.com DNS Vercel'in yeni onerilerine guncellendi: apex `A -> 216.198.79.1`, `www` CNAME Vercel'in project-specific `vercel-dns-017.com` hedefine gider
- Google Search Console domain property `italypath.app` dogrulandi; `https://italypath.app/sitemap.xml` gonderildi; kritik URL'ler icin URL Inspection + Request Indexing yapildi (`/`, `/universities`, `/isee`, `/scholarships`, `/cities`, `/communities`)
- SEO 3 Part 2 icin henuz ayri spec/plan yoktur. Yeni schema yalnizca sayfada gorunen, dogrulanmis bilgiye dayanmali; Rich Results Test ve Search Console URL Inspection ile deploy sonrasi kontrol edilmelidir

Guncel durum (2026-09-21, `SEO_AUDIT.md` §23-24): sitemap `1.004` URL; dosyali program sayfalari ikinci JSON-LD olarak `EducationalOccupationalProgram` tasir (ad, URL, okul, dil, sure, tam zamanli; tarih/ucret/kosul YOK cunku dogrulanmis tek deger yok). Rich Results Test dogrulamasi ve sitemap'in yeniden gonderimi deploy sonrasi acik istir. Yukaridaki 22 Temmuz sayilari tarihseldir.

### Home

`app/page.tsx` async Server Component wrapper'dir ve `components/HomePageClient.tsx` client leaf'ini render eder. Server wrapper `getUniversitiesDirectory()` ile canli university/program stat'lerini hesaplar (ISR, `revalidate = 10800`); hata durumunda `{ universitiesCount: null, programsCount: null }` doner.

`components/HomePageClient.tsx` sirasi (2026-09-15): `Navbar` -> `HeroSection` (ikinci CTA "Ucretsiz on gorusme al", `#on-gorusme`) -> `HomeToolsSection` (7 arac) -> `ConsultationSection variant="home"` -> `HomeStoryBand` -> `VelocityBridge` -> `ScholarshipsSection` -> `IseeSection` -> `ConsultationFaq` -> `HomeClosingCta` (birincil CTA on gorusme) -> `Footer` -> `MobileConsultBar`. `FeaturesSection.tsx` kaldirildi. University/program stat'leri canli university data akisi ile gelmelidir; `64/240` gibi local seed sayilari hard-code edilmemeli. Sehir sayisi server wrapper'da `CURATED_CITIES.length` ile prop olarak gecer; sehir verisi client bundle'a import edilmez.

### Ucretsiz on gorusme (gelir hunisi)

Ilk gelir modeli ucretli danismanlik; kapi mevcut uzman lead formudur. Fiyat/paket, "biz kimiz", sahte yorum veya uydurma yanit suresi eklenmez.

- Paylasilan sabitler: `lib/consultation.ts` (`CONSULT_ANCHOR = "on-gorusme"`, `CONSULT_PAGE_PATH = "/on-gorusme"`).
- `components/consultation/ConsultationSection.tsx` gercek `ExpertLeadForm`'u kullanir (`POST /api/expert-leads`); `variant="page"` basligi h1 yapar. Yeni tablo/kolon yok.
- `/on-gorusme`: `app/on-gorusme/page.tsx` server metadata + `ConsultationPageClient`; public route ve sitemap'te.
- `ConsultPrompt` program detay, universite detay (eski duraklatilmis AI masasi kutusunun yerine), `/scholarships` ve `/isee` sayfalarinda `/on-gorusme`'ye gider. Navbar masaustunde ayrica link var; menu ileride yeniden ele alinacak.
- Metinler `lib/translations.ts`: `homeTools`, `consultation`, `homeFaq`, `consultPrompt`, `navbar.consultation` (TR+EN).
- Guard: `npm run check:home-consultation`. Spec/plan: `docs/superpowers/specs/2026-09-15-homepage-free-consultation-design.md`, `docs/superpowers/plans/2026-09-15-homepage-free-consultation-plan.md`.

SEO 2.5 sonrasi canli audit'te `/` sayfasi gercek H1, CTA/internal link ve canli stats tasir; `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi temizdir. Hidden SEO text ekleme.

### Universities list ve detail

`app/universities/page.tsx`:

- async Server Component wrapper'dir; `getUniversitiesDirectory()` ile hafif canli veri alir (`searchParams` okudugu icin dinamik)
- ilk HTML'e tum okullari koyar (okul basi 3 program etiketi); Googlebot API'yi cekemedigi icin okul linkleri HTML'de olmali
- `components/universities/UniversitiesExplorer.tsx` client leaf'ine `initialUniversities`, initial filters ve stats gecer
- URL sync search/filter: `q`, `city`, `type`, `fav`
- view mode: `grid | compact`
- localStorage key: `italyPathUniversitiesViewMode`
- helper'lar: `lib/universitiesFilters.ts`
- UI parcalari: `components/universities/*`

`app/universities/[id]/page.tsx` ve department detail page artik server wrapper + client leaf pattern'i kullanir. Server wrapper `getUniversityById()` ile ilk HTML'e okul/program adi, aciklama, fee, sehir, program linkleri ve admission details gibi gorunur icerikleri koyar; client leaf favori, dil, route animation ve program transition davranisini korur. Sayfa sarmalayicilari ayrica `lib/relatedLinks.ts` `buildRelatedLinks(university, directory)` ile ic baglanti verisini hesaplar; client leaf'ler ustte `DetailBreadcrumb` (gorunur kirinti, JSON-LD ile ayni sira) ve altta `RelatedLinks` (ayni sehirdeki okullar, sehir rehberi, bolge bursu) render eder (2026-09-16, `SEO_AUDIT.md` §22). Client leaf'ler `useUniversitiesData(initial, { fetchWhenInitial: false })` cagirir: sunucudan gelen tam okul verisi varken hafif dizin cekilmez ve onu ezmez (kabul paneli tam veriyle kalir). Universite sayfasinin geri tusu `?from=list` bilgisini tiklama aninda `window.location.search`ten okur (wrapper ISR icin `searchParams` okumaz).

Program detay sayfasi turu (17-21 Eylul 2026; kayit `SEO_AUDIT.md` §23, plan `docs/superpowers/plans/2026-09-17-program-detail-pages-plan.md`, plan checkbox'lari guncel degil):

- Metadata: `lib/programMetadata.ts` Turkce, sayfaya ozgu `title`/`description` uretir (saf modul; yalnizca kayittaki alanlar, uydurma bilgi yok; dosyasiz programda vaat cumlesi yok). Guard: `npm run check:program-metadata`.
- Kabul dosyasi sunumu: `ProgramSummaryStrip` (kunye, "Temel bilgiler"), `ProgramAdmissionDetailsPanel`, `ProgramSourceTrail` (URL bazinda kaynak izi), ortak parcalar `programDossierShared.tsx`; `<dl>` yapilari yalnizca `dt`/`dd` icerir (a11y).
- "Ayni alanda diger universiteler": `Department.degreeClassCodes` (view'den) ile `lib/relatedLinks.ts` icinde resmi kod eslesmesi; kodu olmayan programda bolum gosterilmez, anahtar kelime tahmini yapilmaz.
- `ProgramNextSteps`: ISEE, sehir rehberi, bolge bursu linkleri + ucretsiz on gorusme kutusu tek blokta; sehir/burs linkleri `RelatedLinks`te tekrar edilmez (`showHubLinks={false}`).
- JSON-LD: dosyali programda `EducationalOccupationalProgram` (yalnizca dogrulanmis alanlar).
- Bilincli YAPILMAYAN (Kerem karari, 21 Eylul): dosyasiz programlari `noindex` + sitemap disi birakma; canlida dosyasiz program kalmadigi icin anlamsiz. Ileride dosyasiz satir eklenirse yeniden degerlendir.
- Kapsam disi (Kerem karari, 17 Eylul): programin yalnizca kendi kabul satirini cekmesi, Turkce cumle ozetleri, son tarih/sinav alan cikarimi, on gorusme tiklama olcumu.

SEO `layout.tsx` Server Component'lerinde `generateMetadata()` ile uretilir. `generateMetadata()` hicbir zaman `"use client"` dosyasina konmamalidir.

`components/university-details/ProgramDirectory.tsx`, programlari bachelor/master/single-cycle gruplarina ayirir. Department detail sayfasi admission details panelini varsa gosterir.

### Mentor Masalari (AI + Gonullu + Uzman)

`/ai-mentor` public route'tur; SEO karari değişmediği için `robots.ts` içinde disallow kalır ve sitemap'e eklenmez. UI üç masalı consultation desk modelidir:

- ItalyPath AI: backend/native Gemini streaming akışı korunur; masa 2026-07-23 itibarıyla arayüzde geçici olarak `paused` ve seçilemez.
- ItalyPath Gönüllü Ekip: aktif, giriş gerektiren Supabase üzerinde kalıcı site içi insan yazışmasıdır. Misafir `desk=volunteer` seçerse `/giris?redirect_url=/ai-mentor?desk=volunteer` akışına gider.
- ItalyPath Uzman: aktif public `expert-lead` formudur. Form altı zorunlu alanla ücretsiz WhatsApp ön görüşme talebi toplar; e-posta, onay kutusu, CAPTCHA, IP saklama, telefon bazlı dedupe veya otomatik silme yoktur. `submission_id` yalnızca retry/double-click idempotency'si içindir.

AI backend'i `app/api/chat/route.ts` icindedir.

- `GEMINI_API_KEY` yoksa `503`
- malformed body veya gecersiz messages icin `400`
- Gemini model: `gemini-2.5-flash`
- response: text/plain `ReadableStream`
- sistem promptu `getUniversitiesDirectory()` ile hafif university/program listesinden uretilir (kabul metinleri yok)

Risk: Supabase department sayisi buyudukce chat system prompt'u da buyur. Latency/cost ve token boyutu izlenmeli.

Gonullu masa mimarisi:

- Ogrenci yuzeyi `components/mentor/volunteer/VolunteerDesk.tsx`; veri hook'u `lib/mentor/useVolunteerDesk.ts`.
- `/ekip/mentor`, tek aktif operator icin staff-allowlist ile korunan inbox'tir. Kullaniciya gorunen gonderen markasi `ItalyPath Gonullu Ekip`tir.
- Tablolar: `mentor_staff`, `mentor_conversations`, `mentor_messages`. RPC idempotency kayitlari ogrenci tarafindan okunamayan ayri private tabloda tutulur.
- Yazmalar yalnizca `start_volunteer_conversation`, `send_student_mentor_message`, `send_staff_mentor_message` ve `close_volunteer_conversation` RPC'leriyle yapilir. Operator girisi `is_active_mentor_staff` RPC'siyle ayrica dogrulanir.
- Okumalar ve canli olaylar Clerk'in native session token'i ile Supabase RLS + Realtime kullanir; mentor kodunda deprecated Clerk `supabase` JWT template'i veya service-role key yoktur.
- V1: bir operator, ogrenci basina tek acik gorusme, yalnizca duz metin, ek/atama/not/typing/read receipt/otomatik bildirim yok. Her iki taraf gorusmeyi kapatabilir; kapali gecmis hesap silinene kadar salt okunur tutulur.
- Kalici kontrol: `npm run check:mentor-desks`, `npm run test:volunteer-desk`, `npm run test:mentor-operator` ve `npm run test:mentor-db`. Production kabulunde ayrica normal ogrenci + operator hesaplariyla iki-hesap RLS/Realtime matrisi uygulanir.

Uzman lead mimarisi gönüllü konuşma tablolarını, hook'larını veya Realtime state machine'ini yeniden kullanmaz:

- Public form `components/mentor/expert/ExpertLeadDesk.tsx` içindedir; `POST /api/expert-leads` server-side doğrulama ve server-only service-role insert sınırıdır.
- `expert_leads` ayrı tablo, constraint ve RLS yüzeyidir. Anon/normal authenticated kullanıcı okuyamaz veya mutate edemez; insert yalnızca server route ile olur.
- `/ekip/uzman` protected route'tur ve mevcut tek aktif `mentor_staff` operatörü için `is_active_mentor_staff()` + RLS doğrulamasını kullanır. `useExpertLeadInbox` Realtime/polling/notification kullanmaz; yetki veya kullanıcı değişiminde lead state'ini fail-closed temizler.
- Kalıcı kontroller: `npm run check:expert-leads` ve `npm run test:expert-leads`; DB/RLS matrisi `npm run test:mentor-db` içindedir.

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

Remediation (2026-08-29 tamamlandi): Ilk extract'tan kalan erisilebilirlik-metni bozuklugu tasiyan 237 soru, kaynak goruntulerden yeniden yazilip kor-cozucu/KaTeX/marker kapilarindan gecirilerek duzeltildi; plan `docs/superpowers/plans/2026-08-28-sat-question-remediation-slim-plan.md`. Kalici guvenlik sozlesmeleri: `lib/sat/questions.server.ts` `needs_review=true` satirlari ASLA sunmaz; `scripts/sat/import-bank.mjs` insert-only'dir (var olan id'yi degistiremez, upsert yasak); var olan sorularin tek guncelleme yolu compare-and-swap + yedekli `scripts/sat/patch-sat-questions.mjs` aracidir; icerik taramasi `scripts/sat/audit-sat-content.mjs` ile yapilir. Bu sozlesmeler `npm run check:sat-bank` tarafindan zorlanir; ek testler `npm run test:sat-audit` ve `npm run test:sat-patch`. Yedekler/paketler `tmp/sat-bank/remediation/` altinda (Git disi); acik is: 2 kayitlik figur onarim backlog'u (`figure-repair-backlog.json`).

### Cities

`/cities` public editorial atlas'tir. `components/cities/CityGuidesExplorer.tsx`, `types/cities.ts`, `lib/cities/data.ts` kullanir. Birlesik katalog 17 legacy exact/source kaydi ile 25 tiered, arastirilmis kayittan olusur.

SEO Adim 2 sonrasi `app/cities/page.tsx` server-rendered gorunur intro/city nav tasir; explorer client davranisi korunur. Son canli audit'te `/cities` bailout temizdir.

Legacy exact/source verisi Milano, Roma, Bologna, Torino, Floransa, Venedik, Verona, Padova, Parma, Pisa, Siena, Pavia, Trento, Trieste, Bari, Ancona ve Napoli icin tutulur. Bunlarin cogunda Numbeo kaynak metadata'si vardir:

- `costSourceName`
- `costSourceUrl`
- `costSourceLastUpdated`

Tiered maliyetler `lib/cities/costTiers.ts` icindeki `2026-08` model surumunden gelir. `lib/cities/tieredData.ts`, kaynak kontrolu yapilmis TR/EN tarih, ulasim, sehir karakteri ve audit metadata'sini saklar. Ham arastirma ciktilari ignored `city-content-research/results/` altinda kalir ve runtime ya da commit kapsamına alinmaz.

Katalogda bulunmayan sehirler uydurma generic bilgi yerine acik bir `unresearched` durumu gosterir. `Piemonte` yalnizca sehir rehberlerinden dislanir; Universita del Piemonte Orientale (UPO) universite ve program verisi kullanilabilir kalir.

Slug kurali: app-facing Turkce sehir anahtarini koru (`floransa`, `venedik`, ileride `cenova`). Source-page slug'i (`firenze`, `venezia`, `genova`) app slug'i olarak kullanma.

Kalici dogrulama: `npm run check:cities`.

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

`/isee` yalnizca **ISEE Parificato** tahmini yapar (ailesi Turkiye'de yasayan ogrenciler). Normal ISEE hesabi 2026-09-17'de kaldirildi; geri getirme.

- `app/isee/page.tsx` server wrapper (`force-dynamic`), `components/isee/IseeParificatoClient.tsx` client leaf: H1, 4 adimli sihirbaz (`IseeWizard` + `steps/*`), sonuc (`IseeResult`), gorunur aciklama + limit kartlari (`IseeExplainer`), `ConsultPrompt`.
- Saf hesap katmani `lib/isee/`: `parificato.ts` (DPCM 159/2013 muafiyet/katsayilari, bina m2 x 500 EUR, TL -> EUR), `reference.ts` (Banca d'Italia yillik ortalama kurlar, bes sehrin 2026/27 ISEE/ISPE limitleri, kaynak URL + dogrulama tarihi), `verdict.ts` (ortalamaya gore mavi/sari/kirmizi; bir sehrin kendi limiti asiliyorsa isik en az sari; sehir bazinda altinda/sinirda/ustunde), `wizardState.ts` (form durumu, adim dogrulama). Bu dosyalar React/Next icermez ve birbirinden yalnizca `import type` alir.
- Veri bakimi: yeni yil kuru (Ocak) ve yeni sartname limitleri (yaz) yalnizca `lib/isee/reference.ts` icinde guncellenir; her deger resmi kaynaga bagli olmalidir. Burs haritasi (`lib/scholarships/regions.ts`) ayri veri kaynagidir ve hala 2025/26 tasir.
- Metinler `lib/translations.ts` `iseeTool` (TR+EN); tutarlar `components/isee/format.ts` ile deterministik bicimlenir (Intl yok, hydration guvenli). Isik renkleri `app/globals.css` `--isee-*` tokenlaridir.
- Dev sunucusu `globals.css` token eklemelerini bazen eski Turbopack onbelleginden sunar; tarayicida `--isee-*` bos donerse `.next/dev` silinip sunucu yeniden baslatilir (uretim build'i etkilenmez).
- Form bos acilir, durum yalnizca bellekte tutulur (localStorage/URL yok).
- Dogrulama: `npm run check:isee` (dort elle hesaplanmis aile, kenar durumlar, isik sinirlari, veri butunlugu, kaynak guard'lari).
- Tasarim/plan: `docs/superpowers/specs/2026-09-17-isee-parificato-calculator-design.md`, `docs/superpowers/plans/2026-09-17-isee-parificato-calculator-plan.md`.

`app/isee/layout.tsx` SEO metadata tasir (ISEE Parificato odakli title/description + Open Graph). Canli HTML'de gercek H1, aciklama bolumu, bes sehir limiti ve sihirbazin ilk adimi gorunur; `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi temizdir.

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
- `expert_leads`: public uzman ön görüşme formu satırları; yalnızca aktif staff select/update/delete yapabilir
- `universities`: university base rows
- `university_departments`: program rows, languages/duration/level/sort
- `program_admission_details`: program admission metadata ve source/uncertainty modeli
- `program_degree_class_codes` (VIEW): `program_admission_details.degree_class` metninden kisa resmi kodlar; dizin sorgusu buna bagimli
- `sat_questions`: SAT soru bankasi; anon/authenticated okuyamaz, yalnizca server service-role okur (`needs_review=true` satirlari sunulmaz)
- `sat_attempts`: kullanicinin kendi denemeleri (`requesting_user_id()` RLS)

SQL/runbook dosyalari (sifirdan kurulum sirasi DEGILDIR; gercek production schema dashboard'dan dogrulanir):

- `supabase/rls_hardening.sql`: favorites, user_documents ve storage RLS hardening
- `supabase/program_admission_details.sql`: program admission details tablo/policy/grant setup
- `supabase/user_profiles.sql`: onboarding profil tablo/policy/grant setup
- `supabase/volunteer_mentor.sql`: mentor tablolar, private idempotency, RLS, RPC ve Realtime setup
- `supabase/expert_leads.sql`: uzman lead tablo, constraint, `updated_at` trigger, index, grant ve staff-only RLS setup
- `supabase/program_degree_class_codes.sql`: salt okunur degree class kodu view'i (`security_invoker`), 2026-09-19'da uygulandi
- `supabase/sat_bank.sql`, `supabase/sat_explanations.sql`: SAT tablolari ve aciklama kolonlari (service-role-only)
- `supabase/add_documents_category.sql`: `user_documents.category` kolonu
- `SUPABASE_SECURITY_RUNBOOK.md`: Clerk + Supabase operasyon rehberi (legacy/native token ayrimi; tam kurulum rehberi degildir)

Gercek production schema dashboard'dan dogrulanmalidir.

---

## Environment Degiskenleri

`.env.local` git'e girmez.

| Degisken | Kullanim |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: SAT soru okuma (`lib/sat/questions.server.ts`), expert lead insert (`lib/mentor/expertLeads.server.ts`) ve yetkili admin/import scriptleri. Production ve Preview'da ZORUNLU (yoksa `/sat` ve on gorusme formu calismaz); local'de bu yuzeyler test edilecekse gerekir. Asla client bundle'a veya `NEXT_PUBLIC_*` alanina girmez |
| `GEMINI_API_KEY` | Gemini chat endpoint (`/api/chat`); yoksa 503. AI masasi arayuzde paused oldugu icin bugun kullaniciya acik yuzey yok |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend |
| `CLERK_SECRET_KEY` | Clerk server |

Supabase env eksikse university API ve Supabase dogrulama scriptleri hata verir. Ornek dosya `.env.example`; Clerk anahtar kurallari (live/test, Preview) README'dedir. Test edilmis Node surumu: 20.20.1 (2026-09-21; `package.json` icinde `engines` alani yok, eski plan belgelerindeki farkli Node sartlarina bakarak surum cikarma).

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
npm run check:expert-leads
npm run check:home-consultation
npm run check:seo-vitals
npm run test:volunteer-desk
npm run test:mentor-operator
npm run test:mentor-db
npm run test:expert-leads
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
npm run check:program-metadata
npm run check:ai-search
npm run check:auth-production
```

Ek dogrulama:

```bash
node scripts/check-universities-server-compose.mjs
```

Dogrulama olmayan legacy arac: `npm run clean:med` kok dizinde `med` dosyasi bekler (repoda yok) ve dosya uretir; kontrol komutu degildir.

---

## Bilinen Sorunlar ve Bakim Borcu

Tek acik is listesi 2026-09-21'den beri `docs/STATUS.md` icindedir (zaman kritik isler, veri guncelligi, SEO/performans, urun borcu, repo/belge hijyeni; her madde kanit ve karar sahibiyle). Buraya is listesi yazilmaz; mimari nitelikteki uyarilar ilgili feature bolumlerinde durur. Eski liste `docs/STATUS.md` D ve E bolumlerine tasindi (PWA, karsilastirma, legacy gorseller, JSON-LD tekrari, AI prompt boyutu, font diyeti, artifact klasorleri, legacy UI dosyalari).

---

## Agent Kurallari

1. Tailwind v4: `tailwind.config.*` olusturma. Tema/token degisiklikleri `app/globals.css` icinde `@theme` ve CSS variable modeliyle yapilir.
2. Global state icin React Context ve mevcut hook pattern'leri yeterli. Redux/Zustand/Jotai ekleme.
3. Hook'lar mevcut pattern geregi `lib/` altinda tutulur.
4. SEO gereken dinamik route'larda `generateMetadata()` Server Component `layout.tsx` dosyasinda kalir; client page'e tasima.
5. Route guvenligi `proxy.ts` uzerinden yonetilir; `middleware.ts` olusturma.
6. Runtime kodunda `app/data.ts` import etme. Live university/program data icin liste yuzeylerinde `getUniversitiesDirectory()` veya `/api/universities`, tek okul icin `getUniversityById()`, domain tipleri icin `types/universities.ts` kullan. Tam veri seti compose'unu runtime'a geri getirme (egress).
7. UI metinleri `lib/translations.ts` icinde TR/EN paralel tutulur.
8. Supabase generated types yok; yeni DB row ihtiyacinda `types/index.ts` icine explicit interface ekle.
9. SEO icin hidden keyword block, `display:none` SEO metni veya botlara farkli icerik ekleme. Kullaniciya gorunmeyen SEO text yasak.
10. Public SEO sayfalarinda page-level CSR bailout riskine dikkat et. `useSearchParams`/Suspense kullanimi kritik ilk HTML'i skeleton'a dusuruyorsa server wrapper + client leaf pattern'ini tercih et.
11. Existing dirty worktree varsay; kullanici degisikliklerini revert etme.
12. Yeni agent once `AGENTS.md`, sonra bu dosyayi, sonra `docs/STATUS.md`, ilgili feature dosyalarini ve dogrulama scriptlerini okumali.
13. Expert lead client dosyalari veya `NEXT_PUBLIC_*` değişkenleri hiçbir zaman `SUPABASE_SERVICE_ROLE_KEY` alamaz; public form insert'i yalnızca server-only `app/api/expert-leads` sınırından geçer.
14. Sehir rehberlerinde generic fallback iddialari uretme; arastirilmamis sehri acikca `unresearched` olarak goster. Tiered kayitlarda sehir bazinda fiyat/Numbeo verisi cogaltma; merkezi, surumlu tier maliyet modelini kullan.
15. Terracotta renkli metin/ikon icin `text-[var(--editorial-terracotta-ink)]` kullan; `--editorial-terracotta` base tokeni yalnizca buton/arka plan/cerceve icin. `npm run check:seo-vitals` bunu zorlar.
16. `components/RouteTransition.tsx` icindeki `<AnimatePresence initial={false}>` kaldirilmaz; ilk yuklemede sayfa iceriginin gorunur gelmesini bu saglar.
17. Egress diyeti: agir kabul metinleri (`source_quotes`, sartlar, belgeler) yalnizca `getUniversityById()` ile detay sayfalarina gelir; liste/API/sitemap/chat `getUniversitiesDirectory()` kullanir. ISR sayfalarinda (`/`, detay sayfalari) `revalidate` + bos `generateStaticParams()` korunur ve sunucu tarafinda `searchParams`/`cookies()`/`headers()` okunmaz.
18. Sitemap `lastModified` gercek degisiklige baglidir: DB `updated_at` (okul/program/kabul dosyasi) ile `app/sitemap.ts` icindeki `PAGE_TEMPLATE_LAST_MODIFIED` sabitinin en yenisi. Program/universite sayfa sablonunun GORUNUR icerigi degistiginde sabiti o deploy tarihine cek; uydurma tarih yazma (SEO_AUDIT.md §21).
19. Yeni Supabase ortami kurarken `program_degree_class_codes` view'ini olustur (`supabase/program_degree_class_codes.sql`); dizin sorgusu view olmadan hata verir. Program sayfasinin `pruneUniversityForProgram` budamasini kaldirma; agir kabul dosyasi yalnizca acilan program icin istemciye gider.
20. `/llms.txt` gibi kok dosyalar proxy matcher'da statik sayilmaz (`.txt` haric tutulmaz). Public olacak her kok dosya `proxy.ts` allowlist'ine ve `scripts/check-route-access.mjs` public listesine birlikte eklenir; icerik guard'i tek basina erisimi kanitlamaz.
