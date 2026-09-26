# ItalyPath - Agent Context & Knowledge Base

Bu dosya yeni agent'larin projeyi hizli ve dogru anlamasi icin tutulur; guncel mimari ve calisma kurallarinin kaynak dokumanidir. `AGENT_COMMITS.md` tarihsel ve eksik degisiklik notlaridir (Git gecmisi esastir). `AGENT_CONTEXT_FIX_REPORT.md` 2026-06-11'de uygulanmis eski bir audit arsividir. En son context degerlendirmesi `docs/CONTEXT_AUDIT_2026-09-19.md` icindedir; bu dosyadaki 2026-09-21 duzeltmeleri o raporun uygulama sirasinin 1. ve 2. adimidir. Okumaya kok `AGENTS.md` ile basla; tek acik is listesi `docs/STATUS.md`, tasarim/plan belgelerinin durumu `docs/superpowers/INDEX.md` icindedir (3. adim, 2026-09-21).

Son guncelleme: 2026-09-21 (dogrulandigi commit: `acdb71a`; canli Supabase sayimi ayni gun) · 2026-09-26: veri katmani, kanonik okul adresi, JSON-LD kacisi, okul fotograflari ve hata sayfalari (guvenlik denetimi kart 2) · 2026-09-26: AI mentor masasi, `/api/chat` ve Gemini/AI SDK paketleri kaldirildi (guvenlik denetimi kart 6; dalda, push bekliyor) · 2026-09-26: katalog yetkileri ve kullanici yazma sinirlari canlida (guvenlik denetimi kart 4) · 2026-09-26: favori/belge/profil/SAT kancalari yerel Clerk oturum anahtarina gecti, sure siniri ve "yuklenemedi" durumu, tiklaninca imzalanan belge linki, SAT ilerleme view/RPC'si, `safeStorage` (guvenlik denetimi kart 7; dalda, push bekliyor) · 2026-09-26: hesap silme webhook'u, on gorusme formu gizlilik satiri ve saklama temizligi (guvenlik denetimi kart 8; dalda, push bekliyor) · 2026-09-26: `check:offline`, ISR layout guard'i, `check:hub-onboarding` cevrimdisi varsayilan, `test:mentor-db` yerel ayar, kullanilmayan bilesen/betik dosyalari ve stilleri silindi (guvenlik denetimi kart 11; yerel main'de, push bekliyor)

Sayilar bu dosyada tarihli snapshot olarak gecer. Guncel sayim "Canli university/program verisi" bolumundedir; eski tarihli bolumlerdeki sayilari bugunku gercek sayma.

---

## Proje Tanimi

ItalyPath, Italya'da egitim almak isteyen Turk ogrenciler icin Next.js tabanli rehber uygulamasidir. Public tarafta universite/program arama, sehir rehberleri, bolgesel burs haritasi, ISEE Parificato hesaplayici, kurate edilmis topluluk rehberi, ucretsiz on gorusme formu ve `/ai-mentor` danisma merkezi (iki masa: Gonullu Ekip giris ister, Uzman formu public; AI masasi 2026-09-26'da kaldirildi) vardir. Giris gerektiren tarafta gonullu ekip yazismasi, favoriler, belge cuzdani, SAT soru bankasi, onboarding (`/hosgeldin`) ve kisisel calisma dosyasi (`/hub`) bulunur. Erisim modelinin tek kaynagi `proxy.ts` ve asagidaki "Auth ve Route Matrix" bolumudur.

Uygulamanin ana tasarim dili editorial paper/sage/terracotta paleti, serif basliklar, keskin border'lar ve mobil oncelikli layout'lardir. Gradient/sparkle/indigo SaaS kalibi yeni islerde genellikle tercih edilmez.

---

## Teknoloji Yigini

| Katman | Teknoloji | Surum |
| --- | --- | --- |
| Framework | Next.js App Router | 16.3.6 (2026-09-25) |
| UI | React / React DOM | 19.2.3 |
| Stil | Tailwind CSS | v4 |
| Animasyon | Framer Motion | 12.34.0 |
| Ikon | Lucide React | 0.563.0 |
| Auth | Clerk (`@clerk/nextjs`, `@clerk/elements`) | 6.39.7 / 0.24.20 (2026-09-25) |
| Database/Storage | Supabase JS | 2.95.3 |
| Dil | TypeScript | 5.x |

Not: Projede AI/LLM paketi yoktur. AI mentor masasi, `/api/chat` (Gemini) ve `ai`, `@ai-sdk/google`, `@ai-sdk/react`, `@google/generative-ai`, `react-markdown` paketleri 2026-09-26'da kaldirildi (Kerem karari 2026-09-25; `docs/STATUS.md` Kapananlar #21, #42).

---

## Kritik Proje Yapisi

Bu agac tam envanter degil; mimariyi anlamak icin aktif yuzeyleri ozetler.

```text
italypath-main/
├── AGENTS.md                       # Kisa giris: okuma sirasi + degismez kurallar (ONCE BUNU OKU)
├── app/
│   ├── layout.tsx                  # ClerkProvider, LanguageProvider, MobileZoomLock, RouteTransition
│   ├── global-error.tsx            # Kok layout hata verirse markali 500 sayfasi (TR/EN, lib/translations.ts globalError)
│   ├── page.tsx                    # Home server wrapper (ISR 3h); stats getUniversitiesDirectory() kaynakli
│   ├── sitemap.ts                  # getUniversitiesDirectory() ile dinamik sitemap; lastModified = DB updated_at ∨ PAGE_TEMPLATE_LAST_MODIFIED
│   ├── robots.ts                   # Public/protected indexleme kurallari
│   ├── data.ts                     # Legacy local seed/yedek; runtime tarafindan import edilmez
│   ├── api/
│   │   ├── universities/route.ts   # force-dynamic, no-store, Supabase-backed public API
│   │   └── sat/questions/route.ts  # Protected SAT question API; service-role-backed, no-store
│   ├── giris/
│   │   ├── page.tsx                # Tek sayfa giris+kayit (Clerk Elements); /sign-in ve /sign-up next.config redirects
│   │   └── sso-callback/page.tsx   # Google OAuth donus rotasi; /giris sayfasini yeniden kullanir
│   ├── hosgeldin/page.tsx          # Protected 4 adimli onboarding sihirbazi
│   ├── on-gorusme/page.tsx         # Public ucretsiz on gorusme sayfasi (server wrapper)
│   ├── ai-mentor/page.tsx          # Public consultation desks UI (gonullu masa giris ister, uzman formu public)
│   ├── ekip/mentor/page.tsx        # Protected, staff-allowlisted gonullu operator inbox
│   ├── ekip/uzman/page.tsx         # Protected, staff-allowlisted uzman lead inbox
│   ├── universities/
│   │   ├── layout.tsx              # /universities SEO metadata
│   │   ├── page.tsx                # Server SEO wrapper + crawlable preview + client explorer
│   │   └── [id]/
│   │       ├── layout.tsx          # Server generateMetadata (getUniversityById: dizin kaydi)
│   │       ├── page.tsx            # Server SEO wrapper + client university portrait (dizin kaydi, kabul dosyasi yok)
│   │       └── departments/[deptSlug]/
│   │           ├── layout.tsx      # Server generateMetadata (getProgramPageData, sayfayla ayni veri)
│   │           └── page.tsx        # Server SEO wrapper (getProgramPageData + pruneUniversityForProgram, EducationalOccupationalProgram JSON-LD) + client program portrait
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
│   ├── mentor/                     # Mentor hub + gonullu ogrenci, uzman formu ve operator yuzeyleri
│   ├── legal/                      # LegalDocument.tsx (yasal belge sunum bileseni)
│   ├── auth/                       # /giris parcalari: AuthShell, AuthCard, AuthTabs, OAuthButtons, SignInForm, SignUpForm, PasswordResetFlow (6 haneli dogrulama adimi SignUpForm icindedir)
│   ├── onboarding/                 # /hosgeldin wizard kartlari, progress ve finale
│   ├── hub/                        # Profil seridi, program/burs/sehir oneri bloklari, kompakt kartlar
│   └── ui/                         # Small reusable UI/motion helpers; scroll velocity legacy unless imported
├── context/LanguageContext.tsx
├── lib/
│   ├── supabaseClient.ts           # createClerkSupabaseClient: Clerk oturum anahtarli istemci fabrikasi (tekil istemci yok)
│   ├── useUserSupabaseClient.ts    # Favori/belge/profil/SAT kancalarinin ortak istemcisi: yerel Clerk anahtari, 15 sn sinir, supabase-js dinamik import
│   ├── safeStorage.ts              # localStorage icin try/catch'li get/set/remove (+ sekme ici bellek yedegi)
│   ├── universities.server.ts      # server-only katalog okuyucu: dizin + program basina kabul satiri (SUPABASE_SECRET_KEY)
│   ├── universityPath.ts           # Kanonik okul id kurali (/universities/003 -> 308); proxy + veri katmani ortak
│   ├── jsonLd.ts                   # serializeJsonLd: JSON-LD <script> govdesi (<, >, & Unicode kacisli)
│   ├── remotePhoto.ts              # Unsplash/Pexels okul fotograflari icin next/image loader (Vercel optimizasyonu yok)
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
│   ├── check-offline.mjs            # Tum cevrimdisi check/test + lint + tsc sirayla; her push'tan once (2026-09-26)
│   ├── check-route-access.mjs
│   ├── check-ai-search-readiness.mjs # public/llms.txt icerigi + robots + proxy allowlist (/llms.txt) statik kontrolu
│   ├── check-program-metadata.mjs   # Turkce program metadata sablonu guard'i
│   ├── check-mentor-desks.mjs       # Mentor channel/DB/RLS/UI/legal kalici guard'i
│   ├── test-volunteer-desk.mjs      # Ogrenci lifecycle/race davranis testleri
│   ├── test-mentor-operator-inbox.mjs # Operator auth/action/Realtime davranis testleri
│   ├── test-mentor-db.mjs           # Gercek PostgreSQL RLS/RPC/concurrency testleri
│   ├── check-sat-bank.mjs
│   ├── check-auth-ui.mjs            # /giris ve auth migration butunlugu smoke check
│   ├── check-hub-onboarding.mjs     # /hosgeldin + yeni hub smoke; canli alan kapsamasi yalniz ITALYPATH_API_BASE ile
│   ├── check-cities-data.mjs
│   ├── check-program-details.mjs
│   ├── check-university-data-source.mjs
│   ├── check-university-detail-portrait.mjs
│   ├── check-universities-server-compose.mjs
│   ├── validate-supabase-university-data.mjs
│   ├── validate-data-integrity.mjs
│   ├── import-*-program-details.mjs # Bologna/Ca'Foscari/Genoa/Milan/Milano-Bicocca/Padua/Polimi/Polito/Sapienza
│   ├── sat/                        # PDF -> JSON pipeline ve import scriptleri
│   └── clean-med-data.mjs
├── supabase/
│   ├── rls_hardening.sql           # favorites, user_documents, documents deposu: RLS, yetki, uzunluk kurallari, kisi basi sinirlar
│   ├── data_api_privileges.sql     # Katalog yalniz sunucuya acik, yeni tablo kapali baslar, pg_graphql kapali (2026-09-26)
│   ├── archive_legacy_content_tables.sql # community_links + scholarship_regions yerinde arsiv (2026-09-26)
│   ├── schema_2026-09-26.sql       # Canli public semasinin tarihli dokumu (veri yok); kurulum kaynagi degil
│   ├── program_admission_details.sql
│   ├── user_profiles.sql
│   ├── volunteer_mentor.sql        # Gonullu mentor tablolar/RLS/RPC/Realtime kontrati
│   ├── expert_leads.sql            # Uzman lead tablosu, staff-only RLS
│   ├── program_degree_class_codes.sql # Salt okunur view (2026-09-19); dizin sorgusu buna BAGIMLI
│   ├── sat_bank.sql                # sat_questions service-role-only + sat_attempts RLS
│   ├── sat_progress.sql            # sat_latest_attempts view + sat_attempt_summary RPC (/sat ilerleme okumasi, 2026-09-26)
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
- `program_degree_class_codes` (salt okunur VIEW, `supabase/program_degree_class_codes.sql`, 2026-09-19): `degree_class` serbest metninden cikarilmis kisa resmi kodlar (LM-32 gibi). `security_invoker = true`, yazma yetkisi yok; 2026-09-26'dan beri yalniz sunucu (service_role) okur. Yeni Supabase ortami kurulurken bu view olusturulmazsa dizin sorgusu hata verir.

Calisma zamani fonksiyonlari (2026-09-15 egress diyeti; 2026-09-26 guvenlik denetimi kart 2: okul sayfasi dizinden, program sayfasi yalnizca kendi kabul satirindan). Tam veri seti compose'u ve okul basina tum kabul dosyalarini ceken sorgu runtime'da YOKTUR:

- `getUniversitiesDirectory()`: `universities` + `university_departments` + `program_admission_details` uzerinden `select("department_id,updated_at")` (yalnizca VARLIK + sitemap `lastModified` icin tarih) + `program_degree_class_codes` view'inden `select("department_id,degree_class_codes")`. Her `Department` `hasAdmissionDetails` bayragi ve varsa `degreeClassCodes`/`updatedAt` tasir, `admissionDetails` alani yoktur. Sikistirilmis ~50 KB (dizin ~47 KB + kod view'i ~4 KB). Kullananlar: `/`, `/universities`, `/cities`, sitemap, `/api/universities` ve asagidaki iki fonksiyon.
- `getUniversityById(id)`: dizindeki okul kaydini dondurur; ayri Supabase sorgusu yapmaz. Yalnizca kanonik id kabul edilir (`lib/universityPath.ts` `parseCanonicalUniversityId`: basinda sifir olmayan, en fazla 9 haneli sayi; "003" aranmaz). Kullananlar: okul sayfasi ve layout'u. Okul sayfasi tarayiciya hicbir programin tam kabul dosyasini gondermez; program listesi yalnizca varlik bayragini kullanir (2026-09-25 olcumu: en buyuk okul sayfasi ~2 MB HTML'di).
- `getProgramPageData(id, deptSlug)`: dizin kaydi + YALNIZCA acilan programin kabul satiri (`program_admission_details`, `.eq("university_id", …).eq("department_id", …).maybeSingle()`, yalnizca panelin okudugu kolonlar; `raw_program_name`, `raw_level`, `source_file` cekilmez). Program sayfasi ve metadata layout'u ayni memo'lu veriyi kullanir (ek istek yok); ilgili baglantilar ayni dizinle hesaplanir. Donen `department` dizin kaydinin KOPYASIDIR.
- `pruneUniversityForProgram(university, department)`: istemciye giden okul nesnesini kurar; kabul dosyasi yalnizca acilan programda, diger programlar dizindeki hafif kayitlar. Paylasilan dizin nesneleri degismez (yeni nesne doner; `check-universities-server-compose.mjs` test eder).
- `composeUniversitiesFromSupabaseRows(uniRows, deptRows, admissionRows = [], presenceIds?, degreeClassCodes?)` saf compose; `scripts/check-universities-server-compose.mjs` test eder.
- Kabul dosyasi varligini okumak icin `lib/admissionPresence.ts` `hasAdmissionDossier(department)` kullanilir (hub oneri bonusu, "yakinda" rozeti, okul sayfasi program listesi).

Katalog okuma anahtari (2026-09-26, S9#1 kod tarafi): `lib/universities.server.ts` `import "server-only"` ile baslar ve dort katalog kaynagini yalnizca server-only `SUPABASE_SECRET_KEY` (Supabase'in yeni tip gizli anahtari, `sb_secret_…`) ile okur. Anahtar yoksa veya `sb_secret_` ile baslamiyorsa acik hata firlatilir; herkese acik anon anahtara geri dusulmez. Ayni kural katalog okuyan betiklerde de gecerlidir (`check-program-details.mjs`, `validate-supabase-university-data.mjs`, `import-*.mjs` okuma/dry-run kismi). Vercel'de degisken Supabase entegrasyonunca tanimlidir (Production, Preview, Development); yerelde `.env.local`'a elle eklenir. 2026-09-26'dan beri (guvenlik karti 4, `supabase/data_api_privileges.sql`) anon ve authenticated rollerinin dort katalog kaynaginda (ve `university_departments` id dizisinde) hicbir yetkisi ve okuma politikasi yoktur; ziyaretci anahtariyla istek 42501 doner. Istemciye katalog grant'i veya okuma politikasi geri eklemek egress acigini yeniden acar (`check:university-data-source` SQL'i de denetler). Ayni projeye bagli `~/remake` iOS uygulamasi bu yuzden katalog okuyamaz (`docs/STATUS.md` #56).

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

- Dizin ve program basina kabul satiri **3 saatlik in-memory memo**da tutulur (`SERVER_CACHE_TTL_MS`; dizin icin tek memo, `okulId:programId` anahtarli kabul memo'su, ust sinir `ADMISSION_MEMO_MAX_ENTRIES` = 2000 > 941 program; dolunca en eski kayit silinir). Single-flight uygulanir. Suresi dolmus kayit HEMEN sunulur ve arka planda tek yenileme baslar (stale-while-revalidate); yenileme basarisizsa bayat kayit `STALE_RETRY_MS` (5 dk) daha sunulur, sonra yeniden denenir. Memo yoksa ve Supabase hata verirse hata firlatilir.
- Her Supabase istegi `SUPABASE_REQUEST_TIMEOUT_MS` (8 sn, `db.timeout`) sonra iptal edilir; asili istek sayfa uretimini tutmaz.
- ISR sayfalari (`/`, okul ve program sayfalari) veri hatasini YAKALAMAZ: yenileme hata verirse Vercel son saglam sayfayi sunmaya devam eder; hic saglam sayfa yoksa istek `app/error.tsx`'e duser ve onbellege yazilmaz. Eski "veri yuklenemedi" yedek govdeleri ve ana sayfanin `null` istatistik yedegi 2026-09-26'da kaldirildi (3 saat onbellekte kaliyorlardi). Kok layout hatasi `app/global-error.tsx` ile markali sayfaya duser. `check:seo-vitals` ISR sayfalarinda `catch (` bulunmasina izin vermez.
- Surec kurali: Supabase kisitli veya hata veriyorken push yapilmaz. Build sirasinda Supabase erisilemezse `/sitemap.xml` on-uretimi basarisiz olur ve Vercel o deploy'u yayina almaz; asil risk basarili bir deploy'dan sonra soguk sayfalarda Supabase hatasidir.
- Tam veri seti sikistirilmis ~4,6 MB'dir ve %98'i `program_admission_details`tir. 2026-09-15 oncesinde her soguk Vercel instance'i (gunde 82-88 tane) bunu tam cekiyordu: gunde ~390 MB, donemde 7,3 GB (Free kota 5 GB). 2026-09-15 ile 2026-09-26 arasinda program sayfasi okulun TUM kabul dosyalarini cekiyordu (en buyuk okul ham ~2 MB); artik program sayfasi yalnizca kendi satirini, okul sayfasi hicbirini cekmez.
- ISR: `app/page.tsx`, `app/universities/[id]/page.tsx` ve program `page.tsx` `export const revalidate = 10800` tasir; detay rotalari bos `generateStaticParams()` ile "statik uretilebilir" olur (build'de sayfa uretilmez, ilk istekte uretilip Vercel onbelleginde 3 saat tutulur). Bu sayfalar sunucu tarafinda `searchParams`/`cookies()`/`headers()` OKUMAZ; aksi halde rota sessizce dinamige duser. `/universities` ve `/cities` `searchParams` okudugu icin dinamik kalir ama dizinle calisir.
- Her deploy memo'yu ve ISR onbellegini sifirlar. Import sonrasi yayin suresi icin KESIN UST SINIR YOKTUR: yenileme araligi 3 saattir ama yeni veri ancak bir istek geldiginde, memo suresi dolmussa ve yeniden uretim basariyla bittiginde gorunur (ISR stale-while-revalidate: suresi dolan sayfayi ilk isteyen hala eski sayfayi alir, yenileme arka planda baslar). Memo ile ISR saatleri ayrisabilir; 2026-09-26'dan beri suresi dolmus memo once bir kez daha sunulup arka planda yenilendigi icin bir ISR yenilemesi hala onceki veriyi yazabilir (yeni veri en gec bir sonraki yenilemede); kaynak hatasinda stale-on-error eski veriyi daha da uzun tutar. Acil yayin yolu: yeniden deploy (memo + ISR sifirlanir); on-demand revalidation yoktur. Import sonrasi canlida dogrulama yap, "3 saat gecti, kesin yansidi" varsayma.
- Guard'lar: `npm run check:university-data-source` (tam compose export'u ve okul basina tum kabul dosyasi cekimi yasak; `getUniversityById` dizinden ve kanonik id ile; `getProgramPageData` + `.eq("university_id", universityId)` + `.eq("department_id", departmentId)` + `.maybeSingle`; kullanilmayan kolonlar yasak; okul sayfasi/layout'u `getUniversityById`, program sayfasi/layout'u `getProgramPageData` + `pruneUniversityForProgram`; `import "server-only"`, `SUPABASE_SECRET_KEY` + `sb_secret_` kontrolu, anon anahtar yasak (katalog okuyan betikler dahil); `db.timeout` 1-15 sn; memo ust siniri > 941; `STALE_RETRY_MS`; view okuma zorunlu (`program_degree_class_codes` + `select("department_id,degree_class_codes")`, uzun `degree_class` metni dizinde yasak); TTL 1-6 saat; stale-on-error; API no-store; detay istemcileri `/api/universities` cekmez; `app/global-error.tsx` var; `proxy.ts` kanonik okul adresini public daldan once cozer ve `lib/universityPath.ts` karar tablosu), `npm run check:seo-vitals` (revalidate/generateStaticParams/searchParams, ISR sayfasinda `catch (` yasak, JSON-LD'de ham `JSON.stringify` yasak ve `serializeJsonLd` zorunlu, sitemap slug kodlamasi ve `revalidate = 10800`), `node scripts/check-universities-server-compose.mjs` (`hasAdmissionDetails` uc durum, `pruneUniversityForProgram` paylasilan nesneyi degistirmez).

`scripts/check-university-data-source.mjs`, `app/`, `components/` ve `lib/` runtime kaynaklarinin `app/data.ts` import etmesini yasaklar. `/api/universities`, sitemap ve chat context `getUniversitiesDirectory()`; okul sayfasi/metadata layout'u `getUniversityById()`, program sayfasi/metadata layout'u `getProgramPageData()` uzerinden calismalidir.

Kanonik okul adresi (2026-09-26, S9#2): her okulun tek adresi `/universities/<id>` (id basinda sifirsiz). `proxy.ts` sayfa uretiminden ve ISR onbelleginden ONCE `lib/universityPath.ts` `resolveUniversityPath` ile karar verir: sifirli veya yuzde kodlu sayi (`/universities/003`, alt yollar dahil) kanonik adrese 308; sayi olmayan id statik 404 sayfasina (`/_not-found`) 404 durum koduyla yeniden yazilir. Canonical, Open Graph ve breadcrumb adresleri kayittaki `university.id` ve `department.slug`'dan kurulur (adresteki yazimdan degil). Bilinmeyen sayisal id ve program slug'i sayfada `notFound()` ile 404 olur.

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

UI paneli: `components/university-details/ProgramAdmissionDetailsPanel.tsx`. Panel, ham alanlari alt alta basmak yerine kaynakli kabul dosyasi olarak sunar: program ozeti, basvuru takvimi, kabul kosullari, belgeler, acik belirsizlikler ve URL bazinda gruplanmis kaynak izi. `field_refs`, `sources`, `retrieved_at` ve `[uncertain]` isaretlerinin sunum eslemesi `components/university-details/programAdmissionPresentation.ts` icindedir; kaynak alintilari birlestirilmez veya kaybedilmez. Kaynak izindeki "Sıradaki adım" butonu (2026-09-26, Kerem karari) giris istemeden uzman masasini acar (`/ai-mentor?desk=expert`); program baglami forma tasinmaz.

DB setup/policy: `supabase/program_admission_details.sql`.

Resmi linkler (2026-09-26, guvenlik denetimi G3#1, G3#2, G3#4, G2#5): izin listesi ve URL kurallari tek dosyadadir, `lib/officialLinkHosts.mjs` (bagimliliksiz `.mjs`, tipleri `officialLinkHosts.d.mts`; hem program sayfasi hem Node betikleri ayni dosyayi kullanir). Liste okulun kendi alan adlarini (`SCHOOL_DOMAINS`, universities.id), bolum bazinda onayli ortak program sitelerini (`PARTNER_DOMAINS_BY_DEPARTMENT`) ve Italyan kamu portallarini (`PUBLIC_PORTAL_DOMAINS`) tutar; eslesme nokta sinirlidir; kisaltici/arsiv alan adlari (`BLOCKED_LINK_DOMAINS`) hicbir link alanina girmez. Program sayfasi (`programDossierShared.tsx` `resolveShowableLink`) bir linki yalnizca gecerli, bosluksuz http(s) ise ve kisaltici/arsiv degilse tiklanabilir gosterir; resmi linklerin yaninda hedef alan adi yazar, okul disi hedefte "Ortak program sitesi / Kamu portali / Dis site" etiketi gosterir (`t.department.partnerSite`, `publicPortal`, `externalSite`; TR/EN). Bunun icin `DepartmentDetailClient` uc bilesene `linkContext = { universityId, departmentId }` gecer.

Kabul dosyasi yazicilari (`scripts/import-*-program-details.mjs`, tek seferlik `scripts/fix-admission-link-fields.mjs`) `scripts/lib/program-details-import.mjs` ortak katmanindan gecer: `--apply` yalnizca `--project-ref kskbnxxyviowmrlskwke` ve eslesen Supabase adresiyle; link alanindaki cumle `uncertainty_notes`'a tasinir, adres yoksa `null`; izin listesinde olmayan host, uzunluk siniri asimi `--apply`'i durdurur; serbest metin taramasi uyari verir; kuru calistirma tam metin farkini `output/` altina yazar; `source_file` klasor + dosya + sha256 ozeti tasir; basarili yazma `supabase/import-manifests/` altina izlenen manifest birakir. Kurallar ve akis `DATA_ENTRY_GUIDE.md`'dedir.

Dogrulama: `npm run check:program-details` (canli; tum okullarin link kolonlari dahil, seyrek calistir), `npm run check:admission-dossier`, `npm run test:program-details-guard` (cevrimdisi) ve `node scripts/check-universities-server-compose.mjs`.

### Program deadline kaynagi

Gercek EU/non-EU basvuru tarihleri Supabase `program_admission_details` tablosundaki `application_deadline_eu` ve `application_deadline_non_eu` alanlarindan gelir. Bos kalan local `Department.deadline`/override altyapisi 2026-07-22'de kaldirildi; scrape hattinin kalan parcalari (`lib/deadlines/targets.ts`, `scripts/save-scraped.mjs`, `scripts/scrape-deadlines-runbook.md`) 2026-09-26'da silindi (Kerem karari). Tarihsel scrape tasarim/plan belgeleri `docs/superpowers/` altinda yalnizca arsiv niteligindedir.

---

## Auth ve Route Matrix

Route guvenligi sadece `proxy.ts` ile saglanir. `middleware.ts` olusturma. Bu bolum ve `proxy.ts` erisim modelinin TEK kaynagidir; README ve diger bolumler buna uyar. `/ai-mentor` public'tir (gonullu masa sayfa icinde `/giris`'e yonlendirir, uzman formu public); `/api/sat/*` ve `/ekip/*` protected'dir.

Public route pattern'leri (2026-09-25'ten beri kesin kalip: agac icin `'/yol'` + `'/yol/(.*)'` cifti, tek uc nokta icin tam yol; `'/yol(.*)'` bicimi ayni onekle baslayan kardes yollari da actigi icin kullanilmaz ve `check:routes` bunu reddeder):

- `/`
- `/ai-mentor`, `/ai-mentor/(.*)`  # public consultation hub; robots disallow/sitemap exclusion sürer
- `/api/expert-leads` # tam yol; public, yalnızca POST expert lead gönderimi
- `/api/universities` # tam yol
- `/api/webhooks/clerk` # tam yol; Clerk hesap olaylari, yalniz imzasi dogrulanan POST (hesap silme temizligi, 2026-09-26)
- `/data/(.*)`       # public statik veri (burs haritasi GeoJSON)
- `/sign-in`, `/sign-in/(.*)`     # eski URL, `next.config.ts` 308 ile `/giris`'e yonlendirir
- `/sign-up`, `/sign-up/(.*)`     # eski URL, `next.config.ts` 308 ile `/giris?mode=kayit`'e yonlendirir
- `/universities`, `/universities/(.*)`
- `/cities`, `/cities/(.*)`
- `/isee`, `/isee/(.*)`
- `/scholarships`, `/scholarships/(.*)`
- `/communities`, `/communities/(.*)`
- `/topluluklar`, `/topluluklar/(.*)`
- `/yasal`, `/yasal/(.*)`
- `/giris`, `/giris/(.*)`       # yeni tek sayfa giris+kayit (+ `/giris/sso-callback`)
- `/on-gorusme`, `/on-gorusme/(.*)`  # ucretsiz on gorusme sayfasi; sitemap'te
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
- `/api/sat/questions`
- `/profile`

Oturumsuz istek davranisi (`proxy.ts` dal sirasi): public -> gecer; `PROTECTED_PAGE_ROUTES` -> `/giris?redirect_url=...`; `/api/*` -> Clerk'in varsayilan API cevabi (HTML giris sayfasina yonlendirme yok); listede olmayan diger yollar -> yine `/giris?redirect_url=...` (2026-09-25 oncesinde Clerk'in barindirilan giris sayfasina gidiyordu). Korumali API handler'lari proxy'ye tek basina guvenmez: `/api/sat/questions` kendi `auth()` kontrolunu yapar ve oturum yoksa 401 doner; `check:routes` her korumali API icin bunu zorlar. Herkese acik webhook (`/api/webhooks/clerk`) oturum tasimaz; tek koruma Clerk imzasidir (`verifyWebhook`, `@clerk/nextjs/webhooks`). `check:routes`, `/api/webhooks/` altindaki her public handler'in baska isten once imzayi dogruladigini ve yalniz POST sundugunu zorlar.

Clerk guvenilen kokenler (2026-09-25): `lib/auth/trustedOrigins.ts` tek kaynaktir. `clerkMiddleware` `authorizedParties`, `ClerkProvider` `allowedRedirectOrigins` olarak ayni listeyi alir: Vercel Production'da yalniz `https://italypath.app`; Preview'da ek olarak yayinin kendi `*.vercel.app` adresleri; yerelde `CLERK_DEV_ORIGINS` (verilmezse `http://localhost:3000`). Liste yanlis olursa girisli kullanici oturumsuz gorunur; yayindan sonra canlida bir kez giris denenmelidir.

`/giris` `redirect_url` degerini tarayicinin URL ayristirmasiyla (`new URL(deger, origin)`) ayni koken sartina ve kontrol karakteri reddine tabi tutar; uymayan deger sorgudan temizlenir.

Guvenlik basliklari (2026-09-25, `next.config.ts` `headers()`, tum yollar): `X-Frame-Options: DENY`; zorunlu `Content-Security-Policy` yalniz `frame-ancestors 'none'; object-src 'none'; base-uri 'self'`; ayrica `Content-Security-Policy-Report-Only` izin listesi (self, satir ici betik, Clerk Frontend API, Supabase https/wss, Clerk gorselleri, okul fotograflari icin Unsplash/Pexels (2026-09-26); test anahtarinda Clerk development instance, `next dev`'de eval/HMR). Nonce tabanli CSP kullanilmaz (ISR onbellegini bozar). Rapor-modu ihlalleri yalniz tarayici konsolunda gorunur (rapor adresi yok); zorunlu hale getirmeden once `/giris`, `/documents`, `/sat` girisli denenmeli. Kayit formunda `SignUp.Captcha` vardir: Clerk panelinde bot korumasi aciksa kayit sirasinda Cloudflare Turnstile yuklenir ve izin listesinde yoktur; zorunlu hale getirmeden once rapor-modunda kayit akisi kontrol edilmeli. `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (kamera, mikrofon, konum, browsing-topics kapali), `poweredByHeader: false`.

Navbar artik signed-out durumda **modal acmaz**; `<Link href="/giris">` ile tam sayfa `/giris`'e gider. Protected CTA linkleri signed-out durumda `/giris?redirect_url=...` adresine gider (`/sign-in?redirect_url=...` referanslari kalmadi). Mobil BottomNav 2026-07-23 tarihinde uygulama genelinden kaldirildi.

`npm run check:routes`, public/protected matrix'i Clerk'in kendi yol eslestiricisiyle (`@clerk/shared/pathMatcher`) dener, kardes onek ve alt yol negatif denemelerini yapar, `app/**/page.tsx`, `app/**/route.ts`, `app/robots.ts`, `app/sitemap.ts` ve `public/*` dosyalarini tarayip ne allowlist'te ne acik korumali listede olan yolu hata sayar, `authorizedParties` sozlesmesini ve scholarship GeoJSON fetch kurallarini kontrol eder. Yeni public sayfa/dosya eklerken `proxy.ts` allowlist'i, yeni korumali sayfada `PROTECTED_PAGE_ROUTES`, yeni korumali API'de script icindeki `protectedApiRoutes` listesi guncellenir. `npm run check:auth-ui`, `/giris` sayfasinin ve auth migration'inin butunlugunu, `redirect_url` ayni koken kontrolunu ve `allowedRedirectOrigins` baglantisini dogrular.

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

Clerk Elements v0.24.18 ile bilinen sapmalar (2026-09-25'te 0.24.20'ye yukseltildi; sapmalar gecerli varsayilir, gelecek auth degisikliklerinde dikkat):

- OAuth butonu icin `Clerk.Connection` (NOT eski `SignIn.SocialProvider`)
- Virtual routing OAuth donusu icin `/giris/sso-callback` sayfasi korunmali; kaldirilirsa Google donusu 404'e duser
- `Clerk.FieldError` ve `Clerk.Loading` children-as-function pattern
- `SignUp.Action resend` `fallback` callback'i `({ resendableAfter }) => ...` imzasiyla cagrilir

Hesap silme (2026-09-26, denetim S7#2): Clerk `user.deleted` olayi `app/api/webhooks/clerk/route.ts`'e gelir; imza `CLERK_WEBHOOK_SIGNING_SECRET` ile dogrulanir (sir yoksa 503, imza gecersizse 400, diger olaylar 200 ile yok sayilir). `lib/account/deleteUserData.server.ts` service role ile once `documents` kovasindaki `{kullanici id}/` dosyalarini Storage API'den, sonra `user_documents`, `favorites`, `user_profiles`, `sat_attempts`, `mentor_conversations` satirlarini siler (`mentor_messages` ve `mentor_rpc_idempotency` cascade ile gider). Saf mantik `lib/account/userDataDeletion.ts`, test `npm run test:account-deletion`. Bir adim hata verirse 500 doner ve Clerk yeniden dener; adimlar tekrar calismaya dayaniklidir. Gunluge kullanici kimligi yazilmaz. `mentor_staff` ve `expert_leads` kullanici kimligine bagli degildir, bu akisla silinmez. Canliya gecis (imza sirri + Clerk panelinde uc nokta) `docs/STATUS.md` #59.

### Dil sistemi

`context/LanguageContext.tsx`, TR/EN dil tercihini React Context + `localStorage` ile saklar ve `document.documentElement.lang` ile senkronlar. Tarayici hafizasina (dil, gorunum modu, son mentor masasi, misafir favorileri) yalniz `lib/safeStorage.ts` ile erisilir: site verisini engelleyen ziyaretcide hata firlatmaz, yazilamayan deger sekme acik kaldikca bellekte kalir (guvenlik denetimi S5#5, 2026-09-26; `check:hub-onboarding` ve `check:universities-ui` zorlar). UI metinleri `lib/translations.ts` icindedir. Yeni metinler hard-code edilmemeli; TR/EN paralel eklenmeli.

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
- Server fetch hata durumlari 2026-09-26'dan beri yakalanmaz (ISR son saglam sayfayi korur, bkz. "API ve cache kurali"); eski route-level editorial error block'lari kaldirildi
- Tasarim/spec: `docs/superpowers/specs/2026-06-21-seo-server-html-design.md`
- Plan: `docs/superpowers/plans/2026-06-21-seo-server-html-plan.md`

SEO Adim 2.5 (`SEO 2.5` deploy'u):

- `/`, `/isee`, `/communities` canli HTML'deki `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi temizlendi
- `/` server wrapper oldu; server'da canli stats hesaplar (o tarihte `getUniversitiesData()`, 2026-09-15'ten beri `getUniversitiesDirectory()`); o tarihte hata durumunda stats `null` donuyordu, 2026-09-26'dan beri hata firlatilir (bos istatistik 3 saat onbellekte kalmasin)
- Home UI `components/HomePageClient.tsx` client leaf'ine tasindi
- `/isee` server wrapper oldu; hesaplayici client leaf'e tasindi (2026-09-17'den beri `components/isee/IseeParificatoClient.tsx`)
- `/communities` `force-dynamic` ile static prerender + analytics kaynakli marker'dan cikarildi; atlas HTML'de gercek H1/chapter/topluluk satirlari tasimaya devam eder

SEO Adim 3 Part 1 (`288dd5d`, breadcrumb polish `b1fd488`):

- Ana sayfaya explicit `alternates.canonical: "/"` eklendi
- `app/layout.tsx` site geneli gercek bilgiye dayali `Organization` + `WebSite` JSON-LD tasir; dogrulanmamis logo/sosyal hesap/SearchAction eklenmez
- Tum JSON-LD `<script>` govdeleri `lib/jsonLd.ts` `serializeJsonLd` ile yazilir (`<`, `>`, `&` Unicode kacisli; 2026-09-26, S5#3); `check:seo-vitals` ham `JSON.stringify`'a izin vermez. Sitemap program slug'larini `encodeURIComponent` ile yazar ve 3 saatte bir yenilenir (dizin memo'suyla ayni)
- University detail sayfalari 3 seviyeli, program detail sayfalari 4 seviyeli `BreadcrumbList` JSON-LD tasir
- University/program kaydi bulunamazsa route `notFound()` ile gercek HTTP 404 dondurur; veri kaynagi hatasi 2026-09-26'dan beri firlatilir (ISR son saglam sayfayi sunar; eski "veri yuklenemedi" govdesi kaldirildi)

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

`app/page.tsx` async Server Component wrapper'dir ve `components/HomePageClient.tsx` client leaf'ini render eder. Server wrapper `getUniversitiesDirectory()` ile canli university/program stat'lerini hesaplar (ISR, `revalidate = 10800`); veri hatasi firlatilir, ISR son saglam ana sayfayi sunar (2026-09-26 oncesinde `null` istatistik 3 saat onbellekte kalabiliyordu).

`components/HomePageClient.tsx` sirasi (2026-09-15): `Navbar` -> `HeroSection` (ikinci CTA "Ucretsiz on gorusme al", `#on-gorusme`) -> `HomeToolsSection` (7 arac) -> `ConsultationSection variant="home"` -> `HomeStoryBand` -> `VelocityBridge` -> `ScholarshipsSection` -> `IseeSection` -> `ConsultationFaq` -> `HomeClosingCta` (birincil CTA on gorusme) -> `Footer` -> `MobileConsultBar`. `FeaturesSection.tsx` kaldirildi. University/program stat'leri canli university data akisi ile gelmelidir; `64/240` gibi local seed sayilari hard-code edilmemeli. Sehir sayisi server wrapper'da `CURATED_CITIES.length` ile prop olarak gecer; sehir verisi client bundle'a import edilmez.

### Ucretsiz on gorusme (gelir hunisi)

Ilk gelir modeli ucretli danismanlik; kapi mevcut uzman lead formudur. Fiyat/paket, "biz kimiz", sahte yorum veya uydurma yanit suresi eklenmez.

- Paylasilan sabitler: `lib/consultation.ts` (`CONSULT_ANCHOR = "on-gorusme"`, `CONSULT_PAGE_PATH = "/on-gorusme"`).
- `components/consultation/ConsultationSection.tsx` gercek `ExpertLeadForm`'u kullanir (`POST /api/expert-leads`); `variant="page"` basligi h1 yapar. Yeni tablo/kolon yok.
- `/on-gorusme`: `app/on-gorusme/page.tsx` server metadata + `ConsultationPageClient`; public route ve sitemap'te.
- `ConsultPrompt` program detay, universite detay (eski duraklatilmis AI masasi kutusunun yerine), `/scholarships` ve `/isee` sayfalarinda `/on-gorusme`'ye gider. Navbar masaustunde ayrica link var; menu ileride yeniden ele alinacak.
- Metinler `lib/translations.ts`: `homeTools`, `consultation`, `homeFaq`, `consultPrompt`, `navbar.consultation` (TR+EN).
- Form gizlilik satiri (2026-09-26, denetim S7#4): gonder dugmesinin altinda `aiMentor.expertDesk.privacyNotice` (TR/EN) ve `/yasal/gizlilik` linki. Hedef donem yil secenekleri sunucu anlik goruntusu `null` olan `useSyncExternalStore` ile sayfa acildiktan sonra uretilir; statik HTML'de yil secenegi yoktur, yilbasindan sonra hidrasyon uyusmazligi olmaz (O4#9). `check:expert-leads` ikisini de zorlar.
- Saklama (Kerem karari 2026-09-26): `completed` ve `contacted` talepler son islemden (`updated_at`) 6 ay, `suspected` 30 gun sonra silinir; `new` taleplere dokunulmaz. Ayda bir `npm run cleanup:expert-leads` (kuru calisma, yalniz sayi okur), Kerem onayiyla `-- --apply`. Kurallar `scripts/expert-lead-retention.mjs` (`npm run test:expert-lead-retention`). Ekibin ilk WhatsApp mesaji sablonu `docs/legal/2026-09-26-gizlilik-taslagi.md` bolum 5.
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

`app/universities/[id]/page.tsx` ve department detail page artik server wrapper + client leaf pattern'i kullanir. Okul sayfasi `getUniversityById()` (dizin kaydi) ile ilk HTML'e okul/program adi, aciklama, fee, sehir ve program linklerini koyar; program sayfasi `getProgramPageData()` ile ayrica o programin kabul dosyasini koyar. Client leaf favori, dil, route animation ve program transition davranisini korur. Sayfa sarmalayicilari ayrica `lib/relatedLinks.ts` `buildRelatedLinks(university, directory)` ile ic baglanti verisini hesaplar; client leaf'ler ustte `DetailBreadcrumb` (gorunur kirinti, JSON-LD ile ayni sira) ve altta `RelatedLinks` (ayni sehirdeki okullar, sehir rehberi, bolge bursu) render eder (2026-09-16, `SEO_AUDIT.md` §22). Detay client leaf'leri yalnizca sunucudan gelen veriyi gosterir, `/api/universities` cekmez (2026-09-26; eski `fetchWhenInitial` secenegi ve ulasilamayan "yukleniyor / veri yuklenemedi" dallari kaldirildi). Universite sayfasinin geri tusu `?from=list` bilgisini tiklama aninda `window.location.search`ten okur (wrapper ISR icin `searchParams` okumaz).

Okul fotograflari (2026-09-26, S9#4): `university.image` ve `DEFAULT_UNIVERSITY_IMAGE` Unsplash/Pexels adresleridir (canli: 54 Unsplash, 2 Pexels). Bunlari gosteren `<Image>` bilesenleri (`UniversityRows`, `favorites`, `UniversityPortraitMasthead`, `ProgramPortraitHeader`, `ProgramTransitionEntry`) `lib/remotePhoto.ts` `remotePhotoProps(src)` ile kendi loader'ini alir: boyutlandirmayi Unsplash/Pexels adres parametreleri yapar (Unsplash'te kaynaktaki genislikten buyutulmez). Global `images.loader` kullanilmaz; `next.config.ts`'te `images.remotePatterns` YOKTUR, yani `/_next/image` yalnizca yerel `/images` dosyalarini isler. Yeni uzak fotograf gosteren bilesen `remotePhotoProps` kullanmali; baska bir uzak alan adi eklenecekse `lib/remotePhoto.ts` ve CSP `img-src` birlikte guncellenir.

Program detay sayfasi turu (17-21 Eylul 2026; kayit `SEO_AUDIT.md` §23, plan `docs/superpowers/plans/2026-09-17-program-detail-pages-plan.md`, plan checkbox'lari guncel degil):

- Metadata: `lib/programMetadata.ts` Turkce, sayfaya ozgu `title`/`description` uretir (saf modul; yalnizca kayittaki alanlar, uydurma bilgi yok; dosyasiz programda vaat cumlesi yok). Guard: `npm run check:program-metadata`.
- Kabul dosyasi sunumu: `ProgramSummaryStrip` (kunye, "Temel bilgiler"), `ProgramAdmissionDetailsPanel`, `ProgramSourceTrail` (URL bazinda kaynak izi), ortak parcalar `programDossierShared.tsx`; `<dl>` yapilari yalnizca `dt`/`dd` icerir (a11y).
- "Ayni alanda diger universiteler": `Department.degreeClassCodes` (view'den) ile `lib/relatedLinks.ts` icinde resmi kod eslesmesi; kodu olmayan programda bolum gosterilmez, anahtar kelime tahmini yapilmaz.
- `ProgramNextSteps`: ISEE, sehir rehberi, bolge bursu linkleri + ucretsiz on gorusme kutusu tek blokta; sehir/burs linkleri `RelatedLinks`te tekrar edilmez (`showHubLinks={false}`).
- JSON-LD: dosyali programda `EducationalOccupationalProgram` (yalnizca dogrulanmis alanlar).
- Bilincli YAPILMAYAN (Kerem karari, 21 Eylul): dosyasiz programlari `noindex` + sitemap disi birakma; canlida dosyasiz program kalmadigi icin anlamsiz. Ileride dosyasiz satir eklenirse yeniden degerlendir.
- Kapsam disi (Kerem karari, 17 Eylul): Turkce cumle ozetleri, son tarih/sinav alan cikarimi, on gorusme tiklama olcumu. "Programin yalnizca kendi kabul satirini cekmesi" 17 Eylul'de kapsam disiydi; 2026-09-26'da guvenlik denetimi kart 2 ile uygulandi (`getProgramPageData`).

SEO `layout.tsx` Server Component'lerinde `generateMetadata()` ile uretilir. `generateMetadata()` hicbir zaman `"use client"` dosyasina konmamalidir.

`components/university-details/ProgramDirectory.tsx`, programlari bachelor/master/single-cycle gruplarina ayirir. Department detail sayfasi admission details panelini varsa gosterir.

### Mentor Masalari (Gonullu + Uzman)

`/ai-mentor` public route'tur; SEO karari değişmediği için `robots.ts` içinde disallow kalır ve sitemap'e eklenmez. Adres tarihsel nedenle `ai-mentor` olarak kalir. UI iki masalı consultation desk modelidir (kanal kaydi `lib/mentor/channels.ts`: `volunteer` 01, `expert` 02; `availability` `active` veya `paused`, duraklatilan masa hub'da secilemez):

- ItalyPath Gönüllü Ekip: aktif, giriş gerektiren Supabase üzerinde kalıcı site içi insan yazışmasıdır. Misafir `desk=volunteer` seçerse `/giris?redirect_url=/ai-mentor?desk=volunteer` akışına gider.
- ItalyPath Uzman: aktif public `expert-lead` formudur. Form altı zorunlu alanla ücretsiz WhatsApp ön görüşme talebi toplar; e-posta, onay kutusu, CAPTCHA, IP saklama, telefon bazlı dedupe veya otomatik silme yoktur. `submission_id` yalnızca retry/double-click idempotency'si içindir.

AI masasi (ItalyPath AI, Gemini) 2026-07-23'ten beri arayuzde duraklatilmisti; 2026-09-26'da tamamen kaldirildi (Kerem karari 2026-09-25, guvenlik denetimi S1#1, S5#6, S6#5, O3#6, O3#9): `app/api/chat/route.ts`, `MentorChatRoom`/`EntryPair`/`StarterPrompts`/`LockedDeskNotice`, AI ceviri anahtarlari, AI SDK/Gemini/`react-markdown` paketleri ve Spectral 700 agirligi (AI yanitlari disindaki tek kullanim, program dizinindeki program sayisi, Kerem karariyla `font-semibold` oldu; `app/layout.tsx` 400/500/600 yukler). Eski `?desk=ai` baglantilari hub'a duser. `check:mentor-desks` kaldirilan dosya ve paketlerin geri gelmesini engeller.

Gonullu masa mimarisi:

- Ogrenci yuzeyi `components/mentor/volunteer/VolunteerDesk.tsx`; veri hook'u `lib/mentor/useVolunteerDesk.ts`.
- `/ekip/mentor`, tek aktif operator icin staff-allowlist ile korunan inbox'tir. Kullaniciya gorunen gonderen markasi `ItalyPath Gonullu Ekip`tir.
- Tablolar: `mentor_staff`, `mentor_conversations`, `mentor_messages`. RPC idempotency kayitlari ogrenci tarafindan okunamayan ayri private tabloda tutulur.
- Yazmalar yalnizca `start_volunteer_conversation`, `send_student_mentor_message`, `send_staff_mentor_message` ve `close_volunteer_conversation` RPC'leriyle yapilir. Operator girisi `is_active_mentor_staff` RPC'siyle ayrica dogrulanir.
- Okumalar ve canli olaylar Clerk'in native session token'i ile Supabase RLS + Realtime kullanir; mentor kodunda deprecated Clerk `supabase` JWT template'i veya service-role key yoktur.
- Realtime kanallari private'tir (2026-09-25, guvenlik denetimi G4#1): dort kanal da `mentorPrivateChannelOptions()` (`lib/mentor/volunteerDeskState.ts`) ile acilir; Realtime katilimi yalnizca `realtime.messages` uzerindeki `mentor_realtime_student_read` (kendi `mentor-conversations:<user id>` ve kendi `mentor-messages:<gorusme id>` konusu) ve `mentor_realtime_staff_read` (aktif operator, kendi id'siyle baslayan `mentor-operator-*` konulari) SELECT politikalarina gore kabul eder (`supabase/volunteer_mentor.sql`). Yazma politikasi bilincli olarak yoktur (masa broadcast kullanmaz). Kanal adi degisirse politika da degismelidir. Supabase panelindeki Realtime "Allow public access" ayari 2026-09-25 22:38 UTC'den beri kapali (proje yalniz private kanal kabul eder); yeni bir Realtime ozelligi private kanal ve `realtime.messages` politikasi olmadan calismaz. Kayit `SUPABASE_SECURITY_RUNBOOK.md` "Private Realtime".
- V1: bir operator, ogrenci basina tek acik gorusme, yalnizca duz metin, ek/atama/not/typing/read receipt/otomatik bildirim yok. Her iki taraf gorusmeyi kapatabilir; kapali gecmis hesap silinene kadar salt okunur tutulur.
- Kotuye kullanim siniri (2026-09-25, `supabase/volunteer_mentor.sql`): ogrenci basina 10 dakikada 20 mesaj (`message_rate_limited`) ve 24 saatte 5 yeni gorusme (`conversation_rate_limited`); ayni nonce ile tekrar deneme sinirdan once cevaplanir, staff mesajlari sinirsizdir. 2026-09-25'te canliya uygulandi (migration `volunteer_mentor_student_rate_limit`).
- Zaman asimi (2026-09-25): `useMentorSupabaseClient` Clerk token beklemesini ve her PostgREST istegini `MENTOR_REQUEST_TIMEOUT_MS` (15 sn, `lib/mentor/volunteerDeskState.ts`) ile sinirlar; takilan istek hataya doner ve ogrenci/operator ekranlarindaki mevcut "yuklenemedi / tekrar dene" durumu acilir. `check:mentor-desks` bu iki sozlesmeyi zorlar.
- Kalici kontrol: `npm run check:mentor-desks`, `npm run test:volunteer-desk`, `npm run test:mentor-operator` ve `npm run test:mentor-db`. Production kabulunde ayrica normal ogrenci + operator hesaplariyla iki-hesap RLS/Realtime matrisi uygulanir.

Uzman lead mimarisi gönüllü konuşma tablolarını, hook'larını veya Realtime state machine'ini yeniden kullanmaz:

- Public form `components/mentor/expert/ExpertLeadDesk.tsx` içindedir; `POST /api/expert-leads` server-side doğrulama ve server-only service-role insert sınırıdır.
- `expert_leads` ayrı tablo, constraint ve RLS yüzeyidir. Anon/normal authenticated kullanıcı okuyamaz veya mutate edemez; insert yalnızca server route ile olur.
- `/ekip/uzman` protected route'tur ve mevcut tek aktif `mentor_staff` operatörü için `is_active_mentor_staff()` + RLS doğrulamasını kullanır. `useExpertLeadInbox` Realtime/polling/notification kullanmaz; yetki veya kullanıcı değişiminde lead state'ini fail-closed temizler.
- Kotuye kullanim siniri (2026-09-25, Kerem kararlari; guvenlik denetimi S3#3): `expert_leads_hourly_cap` BEFORE INSERT tetikleyicisi son bir saatte tum site genelinde sayar. 51. talepten itibaren talep reddedilmez, `status = 'suspected'` ile kaydedilir (ogrenci normal basari ekranini gorur); 151. talepten itibaren insert reddedilir (`expert_lead_rate_limited`). Ayni `submission_id` ile tekrar deneme her iki kontrolden once gecer. Route tavani 429 `rate_limited` olarak doner, form girdiyi koruyarak "yogunluk" mesaji gosterir. Ilk 50 siniri canliya 2026-09-25'te uygulandi (migration `expert_leads_hourly_cap`); supheli esik + 150 tavan surumu 2026-09-25 22:20 UTC'de (migration `expert_leads_suspected_threshold`).
- Route yalnizca `application/json` kabul eder ve Origin basligi varsa site host'uyla eslesmelidir (baska sitenin ziyaretci tarayicilari uzerinden gonderim yapmasini engeller); aksi 403. Dogrulama (`lib/mentor/expertLeadValidation.ts`, denetim S2#4) uzunlugu Postgres gibi kod noktasi olarak sayar; C0/C1 kontrol karakterlerini, yazi yonu kontrol karakterlerini, sifir genislikli/gorunmez bicim karakterlerini ve eslesmemis surrogate'lari `invalid_characters` ile reddeder. Aciklamada yalniz satir sonu ve emoji dizilerinin ihtiyac duydugu U+200C/U+200D serbesttir (sekme artik reddedilir). Ad en az iki harf ister (`too_few_letters`; form bunu mevcut ad mesajiyla gosterir). Dogrulamayi gecip Postgres'in reddettigi girdi (23514 kural ihlali, 22P05 karakter) 503 degil 400 doner; kural adi biliniyorsa ilgili alan hatasi olarak.
- Operator gelen kutusu (`useExpertLeadInbox`, denetim S2#2): varsayilan filtre "Yeni"; filtreler Yeni, Iletisime gecildi, Tamamlandi, Tumu (supheliler haric), Supheli. Filtre sunucuda uygulanir, liste 50'lik sayfalarla (`created_at desc, id desc` imlecli) "Daha fazla goster" ile yuklenir; yeni ve supheli sayilari ayri HEAD sayimidir. Supheli bir talep durumu "Yeni" yapilarak listeye alinir.
- Kalıcı kontroller: `npm run check:expert-leads` ve `npm run test:expert-leads`; DB/RLS matrisi `npm run test:mentor-db` içindedir.

Production acilisi Clerk third-party auth, SQL kurulumu ve `mentor_staff` provision adimlari tamamlanmadan yapilmaz; ayrintilar `SUPABASE_SECURITY_RUNBOOK.md` icindedir.

### Favorites

`lib/useFavorites.ts` tek hook'tur.

- Guest: `localStorage` key `italyPathFavorites` (`lib/safeStorage.ts` uzerinden); misafirde Supabase istemcisi hic yuklenmez
- Signed-in: Supabase `favorites` tablosu, ortak `useUserSupabaseClient` ile (Clerk'in yerel oturum anahtari; supabase-js yalniz giris yapilinca dinamik import edilir, 2026-09-26); veritabani kisi basi en cok 100 favori ve sayisal `university_id` kabul eder (`favorite_limit_reached`, 2026-09-26)
- Yukleme hatasi bos liste degil `error` durumudur; `/favorites` "yuklenemedi, tekrar dene" gosterir, hub kisa liste karti "—" yazar
- optimistic update + rollback
- logout sonrasi stale state temizlenir

### Documents

`app/documents/page.tsx` Supabase Storage `documents` bucket'i ve `user_documents` tablosunu kullanir.

- private bucket uyumlu signed URL akisi: liste yuklenirken link uretilmez; "Goruntule"ye basilinca 90 saniyelik tek link uretilir (`SIGNED_URL_EXPIRES_IN_SECONDS`, `check:documents-ui` 60-120 sn araligini zorlar). Sekme tiklama aninda bos acilir, link hazir olunca yonlendirilir (acilir pencere engelleyicisi). Yeni yuklemeler `cacheControl: "0"` ile yazilir (guvenlik denetimi S7#5, 2026-09-26)
- liste yuklenemezse bos cuzdan degil "yuklenemedi, tekrar dene" gosterilir (`loadError`)
- upload'da storage basarili DB insert basarisiz olursa cleanup
- delete'de storage ve DB hata objeleri kontrol edilir
- client-side mime/size guard'lari vardir: `lib/documents/limits.ts` (5 MB, izinli turler, dosya adi 255) depo ve tablo kurallariyla aynidir (`check:documents-ui` karsilastirir); dosya uzantisi turden gelir, dosya adindan degil
- veritabani/depo sinirlari (2026-09-26, `supabase/rls_hardening.sql`): kisi basi en cok 30 belge satiri (`document_limit_reached`) ve 30 dosya, `storage_path` sahibin klasorunde ve en cok 300 karakter, `category` alti anahtardan biri veya NULL

### Hub

`/hub` protected editorial "akilli oneri merkezi" deneyimidir. Ana component `app/hub/page.tsx`, gorsel parcalar `components/hub/*`.

Veri kaynaklari:

- Clerk user profile
- `useFavorites`
- `useUniversitiesData` (`/api/universities`; `app/data.ts` seed'ine donme yok)
- Supabase `user_profiles` (`lib/hub/useUserProfile.ts`; yuklenemezse `unavailable`: hub davet karti yerine "yuklenemedi, tekrar dene" gosterir, `/hosgeldin` kayitli cevaplarin uzerine yazmamak icin sihirbazi acmaz)
- Supabase `user_documents` count (`lib/hub/useDocumentsCount.ts`)
- Bu kancalarin hepsi (ve favoriler, belgeler, SAT) `lib/useUserSupabaseClient.ts` kullanir: Clerk'in yerel oturum anahtari (eski `supabase` JWT template'i yok), anahtar beklemesi ve her PostgREST istegi mentor masasindaki gibi 15 sn ile sinirli (`withMentorTimeout`, `MENTOR_REQUEST_TIMEOUT_MS`); Storage cagrilari `withUserDataTimeout` ile sinirlanir (yukleme haric)
- localStorage `italyPathUniversitiesViewMode`
- forward-compat `italyPathLastMentorDesk`

`/hosgeldin` protected 4 adimli onboarding sihirbazidir. Kayit sonrasi fallback hedefi burasidir; "Simdilik gec" kullaniciyi `/hub`'a yollar. Profil dolu kullanici bu sayfayi tekrar actiginda cevaplarini duzenler.

Profil modeli:

- `lib/hub/profile.ts`: level/field/budget/city enum'lari, `UserProfile`, bos profil guard'i
- `types/index.ts`: explicit `UserProfileRow` interface'i
- Supabase tablo setup'i: `supabase/user_profiles.sql` (`user_id` Clerk id primary key, RLS `requesting_user_id()`; 2026-09-26'dan beri `fields` yalniz `PROFILE_FIELDS`'in 8 anahtarindan, en cok 2 eleman)

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

Veri modeli `supabase/sat_bank.sql` icindedir: `sat_questions` dogrudan anon/authenticated okumaya kapali, yalnizca server API tarafindan `SUPABASE_SERVICE_ROLE_KEY` ile okunur; `sat_attempts` Clerk user id uzerinden `requesting_user_id()` RLS ile kullanicinin kendi denemelerine aciktir; 2026-09-26'dan beri cevap en cok 32 karakter (`QuestionCard` giris kutusu da 32), hesap basina 24 saatte en cok 2.000 deneme (`sat_attempt_rate_limited`) ve `answered_at` sunucu saatiyle yazilir. `sat-figures` deposu 512 KB, yalniz WebP.

Server katmani `lib/sat/questions.server.ts`: ilk satiri `import "server-only"` (istemci paketine giremez), service role client, 3 saatlik in-memory memo, single-flight refresh ve stale-on-error davranisi kullanir. API route `app/api/sat/questions/route.ts` `force-dynamic` ve `Cache-Control: no-store` dondurur; proxy korumasina ek olarak kendi `auth()` kontrolunu yapar (oturum yoksa 401).

Client yuzeyi `app/sat/page.tsx` ve `components/sat/*` altindadir. `MathText` KaTeX ile `$...$` ifadelerini render eder; `lib/sat/answers.ts` SPR sayi/kesir cevap eslestirmesini yapar. Soru fetch ve attempt yazimi `lib/sat/useSatBank.ts` / `lib/sat/useSatAttempts.ts` hook'larindadir.

Ana sayfa (`homeTools.sat.meta`, `VelocityBridge`) ve `/sat` basligi soru sayisini sabit "1.000+ SAT matematik sorusu" olarak yazar (2026-09-26, denetim O4#7; canli bank 1.019 Math sorusu). Her SAT importundan sonra bu metinleri canli sayimla karsilastir.

Ilerleme okumasi (2026-09-26, guvenlik denetimi O4#3, `supabase/sat_progress.sql`): istemci `sat_attempts`'in tamamini cekmez. `sat_latest_attempts` view'i (`security_invoker`) soru basina en son denemeyi verir (1.000'lik sayfalarla); `sat_attempt_summary(p_time_zone)` RPC'si bugunku deneme sayisi, guncel seri ve en uzun seriyi tarayicinin saat diliminde tek satir dondurur. Ikisi yalniz authenticated'a acik. Yuklenemezse `/sat` "ilerlemen yuklenemedi, tekrar dene" gosterir. Yeni cevapta view ve ozet istemcide iyimser guncellenir.

Yanlislarim v1 tamamen client-side turetilir: `sat_latest_attempts` son denemesinde `is_correct=false` olan soru id'leri konu satirinda sayilir ve `/sat` topics gorunumunde mevcut soru fetch'i istemcide filtrelenerek tekrar oturumu baslatir; yeni tablo/API/route yoktur.

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

GeoJSON lokal `/data/italy-regions.geojson` uzerinden fetch edilir; `/data/(.*)` public olmalidir.

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
- Veri bakimi: yeni yil kuru (Ocak) ve yeni sartname limitleri (yaz) yalnizca `lib/isee/reference.ts` icinde guncellenir; her deger resmi kaynaga bagli olmalidir. Burs haritasi (`lib/scholarships/regions.ts`) ayri veri kaynagidir: 8 `verified-full` bolge 2026-09-24'te 2026/27 resmi bandolariyla guncellendi (Lazio ve Lombardia esikleri ISEE araciyla ayni), 12 `registry-only` bolge hala 2026-03-09 tarihli kurum dizinidir.
- Metinler `lib/translations.ts` `iseeTool` (TR+EN); tutarlar `components/isee/format.ts` ile deterministik bicimlenir (Intl yok, hydration guvenli). Isik renkleri `app/globals.css` `--isee-*` tokenlaridir.
- Dev sunucusu `globals.css` token eklemelerini bazen eski Turbopack onbelleginden sunar; tarayicida `--isee-*` bos donerse `.next/dev` silinip sunucu yeniden baslatilir (uretim build'i etkilenmez).
- Form bos acilir, durum yalnizca bellekte tutulur (localStorage/URL yok).
- Dogrulama: `npm run check:isee` (dort elle hesaplanmis aile, kenar durumlar, isik sinirlari, veri butunlugu, kaynak guard'lari).
- Tasarim/plan: `docs/superpowers/specs/2026-09-17-isee-parificato-calculator-design.md`, `docs/superpowers/plans/2026-09-17-isee-parificato-calculator-plan.md`.

`app/isee/layout.tsx` SEO metadata tasir (ISEE Parificato odakli title/description + Open Graph). Canli HTML'de gercek H1, aciklama bolumu, bes sehir limiti ve sihirbazin ilk adimi gorunur; `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi temizdir.

### Yasal sayfalar

`/yasal/[slug]` dinamik route'u uc statik yasal sayfayi besler: `gizlilik` (Gizlilik Politikasi ve KVKK Aydinlatma Metni), `kullanim-kosullari`, `cerez-politikasi`.

- Icerik: `lib/legal/documents.ts` (yapilandirilmis Turkce metin; yasal iletisim adresi `contact@italypath.app`, Name.com e-posta yonlendirmesi; `italypath.com` baska bir sirkete aittir, public yuzeylerde kullanma, guard `check:mentor-desks`)
- Sunum: `components/legal/LegalDocument.tsx` (saf Server Component, editorial stil)
- Route: `app/yasal/[slug]/page.tsx` (`generateStaticParams` + `generateMetadata`, server)
- Footer'da "Yasal" linkleri `LEGAL_LINKS` ile uretilir
- `proxy.ts` public route: `/yasal` + `/yasal/(.*)`
- Su an sadece Turkce; Ingilizce ileride ayni yapilandirilmis modele eklenebilir.

Tasarim notu: `docs/superpowers/specs/2026-06-12-yasal-sayfalar-design.md`.

Hukukcu taslagi (2026-09-26, denetim S7#3): `docs/legal/2026-09-26-gizlilik-taslagi.md` (UYGULANMADI): veri kategorileri, hukuki sebepler, alici gruplari, yurt disi aktarim, saklama sureleri ve kullanim kosullarindan AI ifadeleri. Kerem karari 2026-09-26: yayindaki metin, AI mentor ifadeleri dahil, hukukcu onayina kadar degismez. `scripts/check-mentor-desks.mjs` yayindaki cumleleri birebir aradigi icin metin yayina alinirken guard da guncellenir.

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
- `sat_latest_attempts` (VIEW, `security_invoker`) ve `sat_attempt_summary(text)` (RPC, security invoker): `/sat` ilerleme okumasi; yalniz authenticated (`supabase/sat_progress.sql`)
- `community_links`, `scholarship_regions`: ARSIV (2026-09-26, Kerem karari); site bu verileri `lib/community-links.ts` ve `lib/scholarships/regions.ts`'ten okur, tablolarda istemci erisimi yok

Yetki modeli (2026-09-26, guvenlik karti 4): `postgres`'in `public` semasinda actigi yeni tablo ve diziler anon/authenticated'a kapali baslar. Yeni tablo ekleyen SQL dosyasi RLS politikalarinin yanina gereken `grant`'lari acikca yazar (ornek: `supabase/user_profiles.sql`). Kullanici tablolarinda authenticated yalniz uygulamanin kullandigi fiilleri tasir; anon hicbir sey yapamaz. Kurallarin yerel testi `npm run test:mentor-db` (Supabase benzeri ayri veritabani, favori/belge/profil/SAT/dosya sahipligi ve sinirlar).

SQL/runbook dosyalari (sifirdan kurulum sirasi DEGILDIR; gercek production schema dashboard'dan dogrulanir):

- `supabase/rls_hardening.sql`: favorites, user_documents ve documents deposu (RLS, yetkiler, uzunluk kurallari, kisi basi sinirlar, 5 MB)
- `supabase/data_api_privileges.sql`: katalog yetkileri, yeni tablo varsayilanlari, `set_updated_at` search_path, `pg_graphql` kapali
- `supabase/archive_legacy_content_tables.sql`: `community_links` ve `scholarship_regions` arsivi
- `supabase/schema_2026-09-26.sql`: kart 4 sonrasi canli `public` semasinin tarihli dokumu (yalniz yapi; storage ve Realtime ayarlari altta yorum)
- `supabase/program_admission_details.sql`: program admission details tablo/policy/grant setup
- `supabase/user_profiles.sql`: onboarding profil tablo/policy/grant setup
- `supabase/volunteer_mentor.sql`: mentor tablolar, private idempotency, RLS, RPC ve Realtime setup
- `supabase/expert_leads.sql`: uzman lead tablo, constraint, `updated_at` trigger, index, grant ve staff-only RLS setup
- `supabase/program_degree_class_codes.sql`: salt okunur degree class kodu view'i (`security_invoker`), 2026-09-19'da uygulandi
- `supabase/sat_bank.sql`, `supabase/sat_explanations.sql`: SAT tablolari ve aciklama kolonlari (service-role-only)
- `supabase/sat_progress.sql`: SAT ilerleme view'i ve gun ozeti RPC'si (sat_bank.sql'den sonra; yerel testi `test:mentor-db`)
- `supabase/add_documents_category.sql`: `user_documents.category` kolonu
- `SUPABASE_SECURITY_RUNBOOK.md`: Clerk + Supabase operasyon rehberi (native token, eski JWT template'in kaldirilma sirasi, yedek, yetkiler; tam kurulum rehberi degildir)

Gercek production schema dashboard'dan dogrulanmalidir; son tarihli dokum `supabase/schema_2026-09-26.sql`.

---

## Environment Degiskenleri

`.env.local` git'e girmez.

| Degisken | Kullanim |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SECRET_KEY` | Server-only, Supabase'in yeni tip gizli anahtari (`sb_secret_…`; 2026-09-26). Katalog okumalari (`lib/universities.server.ts`: okullar, programlar, kabul dosyalari, degree class view'i) ve katalog okuyan betikler (`check-program-details`, `check:data`, `import-*` dry-run). Production, Preview ve local build'de ZORUNLU: yoksa veya `sb_secret_` ile baslamiyorsa okul/program sayfalari, sitemap ve build hata verir (anon'a geri dusulmez). Vercel'de Supabase entegrasyonu tanimlar; yerelde `.env.local`'a elle eklenir. Asla client bundle'a veya `NEXT_PUBLIC_*` alanina girmez |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (eski tip): SAT soru okuma (`lib/sat/questions.server.ts`), expert lead insert (`lib/mentor/expertLeads.server.ts`) ve yetkili admin/import scriptlerinin yazma kismi (`import-*` once `SUPABASE_SECRET_KEY`'i dener). Production ve Preview'da ZORUNLU (yoksa `/sat` ve on gorusme formu calismaz); local'de bu yuzeyler test edilecekse gerekir. Supabase eski tip anahtarlari 2026 sonunda emekliye ayirir; bu yuzeylerin yeni anahtara gecisi ayri istir. Asla client bundle'a veya `NEXT_PUBLIC_*` alanina girmez |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend |
| `CLERK_SECRET_KEY` | Clerk server |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Server-only: Clerk panelindeki webhook uc noktasinin imza sirri (`whsec_…`), `/api/webhooks/clerk` hesap silme temizligi (2026-09-26). Production'da gerekli: yoksa uc nokta 503 doner ve silinen hesabin verisi kalir. Yerelde yalniz webhook denenecekse. Kerem ekler (`docs/STATUS.md` #59). Degeri yazdirilmaz |
| `CLERK_DEV_ORIGINS` | Istege bagli, yalniz yerel: Clerk oturumunun kabul edildigi yerel koken(ler), virgulle ayrilmis; verilmezse `http://localhost:3000`. Vercel Production/Preview'da okunmaz (`lib/auth/trustedOrigins.ts`) |
| `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`, `BACKUP_DIR` | Yalniz yerel `.env.local`: `npm run backup:supabase` (Session pooler baglanti dizesi, arsiv parolasi, repo disi yedek klasoru). Vercel'e eklenmez, degerleri yazdirilmaz (`SUPABASE_SECURITY_RUNBOOK.md` bolum 7) |

Supabase env eksikse university API ve Supabase dogrulama scriptleri hata verir. Ornek dosya `.env.example`; Clerk anahtar kurallari (live/test, Preview) README'dedir. Test edilmis Node surumu: 24.13.0 (2026-09-25; `package.json` `engines.node` = `24.x`, Vercel ile ayni ana surum; eski plan belgelerindeki farkli Node sartlarina bakarak surum cikarma). Guard scriptleri Node 20'de de calisir.

---

## Komutlar

Her push'tan once: `npm run check:offline` (2026-09-26, guvenlik denetimi O5#4). Asagidaki cevrimdisi `check:*`/`test:*` betiklerini, `lint`'i ve `npx tsc --noEmit`'i sirayla calistirir, hata olsa da sonuna kadar gider ve ozet basar (~20 sn). Canli okuma yapan `check:data` ve `check:program-details` burada calismaz. package.json'a yeni `check:*`/`test:*` eklenince `scripts/check-offline.mjs` icindeki OFFLINE veya LIVE listesine yazilir; siniflandirilmamis betik `check:offline`'i kirmizi yapar.

```bash
npm install
npm run dev
npm run build
npm run lint
npm run check:offline
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
npm run test:account-deletion
npm run test:expert-lead-retention
npm run check:cities
npm run check:program-details
npm run check:admission-dossier
npm run test:program-details-guard
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

Notlar (2026-09-26):

- `test:mentor-db` gecici yerel PostgreSQL kurar (Homebrew `postgresql@16`/`@17` veya `POSTGRES_BIN`). macOS'ta `LC_ALL` bos kabukta sunucu baslamiyordu; betik artik `LC_ALL` bossa `C` varsayar, elle ayar gerekmez.
- `check:hub-onboarding` varsayilan olarak cevrimdisidir; canli alan kapsamasi adimini "ATLANDI" diye yazar. Canli okuma icin `ITALYPATH_API_BASE=https://italypath.app npm run check:hub-onboarding` (seyrek; Vercel challenge). Adres verilip ulasilamazsa PASS yerine HATA verir.
- `check:seo-vitals` ISR sayfalarini ve onlari saran layout/template dosyalarini (`app/layout.tsx`, `app/template.tsx`, `app/universities/layout.tsx`, iki universities detay layout'u) tarar: `force-dynamic`, veri hatasi yakalama ve `cookies()`, `headers()`, `auth()`, `currentUser()`, `connection()` cagrisi hatadir.
- Aylik bagimlilik kontrolu `npm audit --omit=dev` ve `npm outdated` (`docs/USAGE_LIMITS.md` kontrol takvimi).

Yedek (canli okuma + repo disina sifreli arsiv yazma; 2026-09-25): `npm run backup:supabase -- --dry-run`, `-- --run`, `-- --verify`, `-- --drill`. Canliya yazan her `--apply`/silme/migration oncesi ve haftada bir calisir; egress harcar. Ayrinti ve prova kaydi `SUPABASE_SECURITY_RUNBOOK.md` bolum 7.

Canli veriye yazan tek seferlik duzeltme (2026-09-26, G3#2/G3#4): `node scripts/fix-admission-link-fields.mjs` kuru calistirir; `--apply --project-ref kskbnxxyviowmrlskwke` yalnizca yedek + Kerem onayiyla. Her `import-*-program-details` betigi de `--dry-run` (varsayilan) / `--apply --project-ref kskbnxxyviowmrlskwke` alir.

On gorusme saklama temizligi (DB yazma; 2026-09-26): `npm run cleanup:expert-leads` varsayilan kuru calismadir (yalniz sayi okur, kisisel veri yazdirmaz); `-- --apply` siler. Ayda bir, `--apply` yalniz Kerem onayiyla.

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
6. Runtime kodunda `app/data.ts` import etme. Live university/program data icin liste yuzeylerinde `getUniversitiesDirectory()` veya `/api/universities`, okul sayfasi icin `getUniversityById()` (dizin kaydi), program sayfasi icin `getProgramPageData()` (dizin + yalnizca o programin kabul satiri), domain tipleri icin `types/universities.ts` kullan. Tam veri seti compose'unu veya okul basina tum kabul dosyalarini ceken sorguyu runtime'a geri getirme (egress). Katalog okumalari yalnizca `lib/universities.server.ts` icinde, server-only `SUPABASE_SECRET_KEY` ile yapilir; anon anahtara geri dusme ekleme. anon/authenticated'a katalog grant'i veya okuma politikasi verme (2026-09-26'dan beri kapali).
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
17. Egress diyeti: agir kabul metinleri (`source_quotes`, sartlar, belgeler) yalnizca program sayfasina ve yalnizca o programin satiri olarak gelir (`getProgramPageData()`); okul sayfasi, liste/API/sitemap/chat `getUniversitiesDirectory()` kullanir. ISR sayfalarinda (`/`, detay sayfalari) `revalidate` + bos `generateStaticParams()` korunur, sunucu tarafinda `searchParams`/`cookies()`/`headers()`/`auth()`/`currentUser()`/`connection()` okunmaz ve veri hatasi yakalanmaz (son saglam sayfa kalsin; yedek govde onbellege yazilir). Ayni kural ISR sayfalarini saran layout'lar icin de gecerlidir, `app/layout.tsx` dahil (`check:seo-vitals`, 2026-09-26).
18. Sitemap `lastModified` gercek degisiklige baglidir: DB `updated_at` (okul/program/kabul dosyasi) ile `app/sitemap.ts` icindeki `PAGE_TEMPLATE_LAST_MODIFIED` sabitinin en yenisi. Program/universite sayfa sablonunun GORUNUR icerigi degistiginde sabiti o deploy tarihine cek; uydurma tarih yazma (SEO_AUDIT.md §21).
19. Yeni Supabase ortami kurarken `program_degree_class_codes` view'ini olustur (`supabase/program_degree_class_codes.sql`); dizin sorgusu view olmadan hata verir. Program sayfasinin `pruneUniversityForProgram` adimini kaldirma; agir kabul dosyasi yalnizca acilan program icin istemciye gider, okul sayfasina hic gitmez. Memo'daki dizin nesneleri paylasilir: yerinde degistirme, kopyala. Okul adresi kanoniktir (`lib/universityPath.ts` + `proxy.ts`); canonical/OG/breadcrumb adreslerini URL parcasindan degil kayittan kur.
20. `/llms.txt` gibi kok dosyalar proxy matcher'da statik sayilmaz (`.txt` haric tutulmaz). Public olacak her kok dosya `proxy.ts` allowlist'ine ve `scripts/check-route-access.mjs` public listesine birlikte eklenir; icerik guard'i tek basina erisimi kanitlamaz.
21. `program_admission_details`'e yazan her betik `scripts/lib/program-details-import.mjs` ortak katmanini kullanir (`createImportClient`, kuru calistirmada `prepareAdmissionWrite`, yazmadan once `finalizeAdmissionPayloads`, sonra `recordImportManifest`); `tmp/` altinda veritabanina yazan betik tutulmaz. Resmi link host'u `lib/officialLinkHosts.mjs` izin listesinde yoksa yazma durur; listeye ekleme (yeni okul alan adi veya bolum icin ortak site) Kerem onayiyla. Arayuzde link yalnizca `resolveShowableLink` ile gosterilir.
