# ItalyPath

ItalyPath, Italya'da egitim almak isteyen Turk ogrenciler icin hazirlanan Next.js tabanli rehber uygulamasidir. Universite/program arama, sehir rehberleri, bolgesel burs haritasi, ISEE hesaplayici, kurate topluluk rehberi, ucretsiz on gorusme formu ve `/ai-mentor` danisma merkezi (public; AI masasi arayuzde duraklatilmis, gonullu masa giris ister) ile giris gerektiren favoriler, belge cuzdani, SAT soru bankasi ve calisma dosyasi (`/hub`) yuzeylerini icerir.

Yeni agent veya gelistirici once [AGENTS.md](./AGENTS.md) (okuma sirasi + degismez kurallar), sonra [AGENT_CONTEXT.md](./AGENT_CONTEXT.md) dosyasini okumali; erisim modeli, veri katmani ve calisma kurallari oradadir. Tek acik is listesi [docs/STATUS.md](./docs/STATUS.md), tasarim/plan durumlari [docs/superpowers/INDEX.md](./docs/superpowers/INDEX.md) icindedir. [AGENT_COMMITS.md](./AGENT_COMMITS.md) tarihsel ve eksik degisiklik notlaridir (Git gecmisi esastir); [AGENT_CONTEXT_FIX_REPORT.md](./AGENT_CONTEXT_FIX_REPORT.md) 2026-06-11'de uygulanmis eski bir audit arsividir. En son context degerlendirmesi `docs/CONTEXT_AUDIT_2026-09-19.md` icindedir.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS v4
- Framer Motion
- Clerk auth
- Supabase database/storage
- Google Gemini streaming chat
- TypeScript

## Kurulum

```bash
npm install
npm run dev
```

Dev server varsayilan olarak `http://localhost:3000` adresinde calisir.

Test edilmis Node surumu: 20.20.1 (2026-09-21). `package.json` icinde `engines` alani yoktur; eski plan belgelerindeki farkli Node sartlarina bakarak surum cikarma.

## Environment

`.env.local` git'e girmez. Gerekli degiskenler:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/giris
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/giris?mode=kayit
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/hub
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/hosgeldin
```

Ornek dosya: `.env.example`. Hangi ortamda ne gerekir:

| Degisken | Local | Preview | Production | Not |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Zorunlu | Zorunlu | Zorunlu | Public anon erisim; RLS ile korunur |
| `SUPABASE_SERVICE_ROLE_KEY` | `/sat` veya on gorusme formu test edilecekse | Zorunlu | Zorunlu | Server-only: SAT soru okuma, expert lead insert, admin/import scriptleri. Asla `NEXT_PUBLIC_*` yapma, client dosyasina koyma |
| `GEMINI_API_KEY` | Istege bagli | Istege bagli | Istege bagli | `/api/chat` anahtarsiz 503 doner; AI masasi arayuzde duraklatilmis |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Zorunlu (test anahtari) | Zorunlu (development anahtari) | Zorunlu (`pk_live`/`sk_live`) | Asagidaki Clerk notlarina bak |

Canlı Vercel Production ortamında Clerk anahtarları `pk_live_` ve `sk_live_`
olmalıdır. `pk_test_` / `sk_test_` anahtarları canlı sitede development-mode
uyarısı üretir ve protected route akışlarını Clerk hosted development ekranına
taşıyabilir.

Vercel'in `*.vercel.app` Preview deployment'larında Clerk production anahtarları
kullanılmaz. Preview scope'unda Clerk development anahtarlarını kullanın; aynı
production Clerk instance'ını test etmek gerekiyorsa preview URL'lerini ItalyPath
root domain'i altında bir Preview Deployment Suffix ile yayınlayın.

Supabase verisi olmayan ortamda university API ve ilgili dogrulama scriptleri hata verebilir.

## Veri Mimarisi

Supabase; university, program ve admission verisinin tek dogru kaynagidir. Canli veri `lib/universities.server.ts` uzerinden Supabase `universities`, `university_departments`, `program_admission_details` tablolarindan ve `program_degree_class_codes` salt okunur view'inden (`supabase/program_degree_class_codes.sql`; yeni ortamda olusturulmazsa dizin sorgusu hata verir) compose edilir. Liste yuzeyleri hafif `getUniversitiesDirectory()`, detay sayfalari `getUniversityById()` kullanir; ayrinti AGENT_CONTEXT.md "Veri Katmani" bolumundedir. Paylasilan domain tipleri `types/universities.ts` icindedir. `app/data.ts` yalnizca legacy local seed/yedek olarak tutulur ve runtime tarafindan import edilmez.

`/api/universities` route'u `force-dynamic` ve `no-store` calisir. Client tarafinda `lib/useUniversitiesData.ts` request dedupe ve process-ici cache yapar, fakat browser fetch `cache: "no-store"` kullanir.

Program detay sayfalari `ProgramAdmissionDetailsPanel` ile resmi program linkleri, deadline, gereksinim, belge, kaynak ve belirsizlik notlarini gosterir.

## Komutlar

```bash
npm run build
npm run lint
npm run check:routes
npm run check:auth-production
npm run check:ai-search
npm run check:program-metadata
npm run check:cities
npm run check:program-details
npm run check:data
npm run check:local-data
npm run check:university-data-source
npm run check:isee
npm run check:universities-ui
npm run check:university-details-ui
npm run check:scholarships-ui
npm run check:editorial-ui
node scripts/check-universities-server-compose.mjs
```

## Auth Matrix

Tek kaynak `proxy.ts` ve AGENT_CONTEXT.md "Auth ve Route Matrix" bolumudur; bu liste ozettir.

Public: `/`, `/ai-mentor/*`, `/api/expert-leads`, `/api/universities`, `/data/*`, `/sign-in`, `/sign-up`, `/universities`, `/cities`, `/isee`, `/scholarships`, `/communities`, `/topluluklar`, `/yasal/*`, `/giris`, `/on-gorusme`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`.

`/ai-mentor` public'tir: AI masasi arayuzde duraklatilmis, gonullu masa sayfa icinde `/giris`'e yonlendirir, uzman on gorusme formu herkese aciktir.

Protected: `/documents`, `/ekip/*`, `/favorites`, `/hosgeldin`, `/hub`, `/profile`, `/sat`,
`/api/chat`, `/api/sat/*`.

Signed-out kullanıcı protected page route açarsa `proxy.ts` onu
`/giris?redirect_url=<istenen-route>` adresine yönlendirir. Protected API route
olan `/api/chat` HTML login sayfasına yönlendirilmez; API gibi korumalı kalır.

Route guvenligi `proxy.ts` ile yonetilir; `middleware.ts` olusturulmaz.

## Bakim Notlari

- Tailwind v4 token/theme degisiklikleri `app/globals.css` icinde yapilir; `tailwind.config.*` eklenmez.
- UI metinleri `lib/translations.ts` icinde TR/EN paralel tutulur.
- Generated Supabase type dosyasi yoktur; yeni DB row tipleri `types/index.ts` icine explicit interface olarak eklenir.
- Research/import artifact klasorleri ve `output/*` dosyalari commit karari verilmeden temizlenmez.
