# ItalyPath

ItalyPath, Italya'da egitim almak isteyen Turk ogrenciler icin hazirlanan Next.js tabanli rehber uygulamasidir. Universite/program arama, sehir rehberleri, bolgesel burs haritasi, ISEE hesaplayici, kurate topluluk rehberi, AI mentor, favoriler, belge cuzdani ve protected calisma dosyasi (`/hub`) yuzeylerini icerir.

Yeni agent veya gelistirici once [AGENT_CONTEXT.md](./AGENT_CONTEXT.md) dosyasini okumali. Degisiklik gecmisi [AGENT_COMMITS.md](./AGENT_COMMITS.md), son context audit'i [AGENT_CONTEXT_FIX_REPORT.md](./AGENT_CONTEXT_FIX_REPORT.md) icindedir.

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
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/hub
```

Canlı Vercel Production ortamında Clerk anahtarları `pk_live_` ve `sk_live_`
olmalıdır. `pk_test_` / `sk_test_` anahtarları canlı sitede development-mode
uyarısı üretir ve protected route akışlarını Clerk hosted development ekranına
taşıyabilir.

Supabase verisi olmayan ortamda university API ve ilgili dogrulama scriptleri hata verebilir.

## Veri Mimarisi

`app/data.ts`, local seed ve paylasilan TypeScript tiplerini tasir. Canli university/program verisi `lib/universities.server.ts` uzerinden Supabase `universities`, `university_departments` ve `program_admission_details` tablolarindan compose edilir.

`/api/universities` route'u `force-dynamic` ve `no-store` calisir. Client tarafinda `lib/useUniversitiesData.ts` request dedupe ve process-ici cache yapar, fakat browser fetch `cache: "no-store"` kullanir.

Program detay sayfalari `ProgramAdmissionDetailsPanel` ile resmi program linkleri, deadline, gereksinim, belge, kaynak ve belirsizlik notlarini gosterir.

## Komutlar

```bash
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
node scripts/check-universities-server-compose.mjs
```

## Auth Matrix

Public: `/`, `/api/universities`, `/data/*`, `/sign-in`, `/sign-up`, `/universities`, `/cities`, `/isee`, `/scholarships`, `/communities`, `/topluluklar`, `/sitemap.xml`, `/robots.txt`.

Protected: `/ai-mentor`, `/documents`, `/favorites`, `/hub`, `/profile`,
`/api/chat`.

Signed-out kullanıcı protected page route açarsa `proxy.ts` onu
`/giris?redirect_url=<istenen-route>` adresine yönlendirir. Protected API route
olan `/api/chat` HTML login sayfasına yönlendirilmez; API gibi korumalı kalır.

Route guvenligi `proxy.ts` ile yonetilir; `middleware.ts` olusturulmaz.

## Bakim Notlari

- Tailwind v4 token/theme degisiklikleri `app/globals.css` icinde yapilir; `tailwind.config.*` eklenmez.
- UI metinleri `lib/translations.ts` icinde TR/EN paralel tutulur.
- Generated Supabase type dosyasi yoktur; yeni DB row tipleri `types/index.ts` icine explicit interface olarak eklenir.
- Research/import artifact klasorleri ve `output/*` dosyalari commit karari verilmeden temizlenmez.
