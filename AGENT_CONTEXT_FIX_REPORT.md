# AGENT_CONTEXT Fix Raporu

Tarih: 2026-06-11

Bu rapor, `AGENT_CONTEXT.md` dosyasinin mevcut repo gercekligiyle nerelerde ayrildigini ve yeni agent onboarding'i icin hangi alanlarin fixlenmesi gerektigini listeler. Mevcut `AGENT_CONTEXT.md` dosyasi bu calismada degistirilmedi; rapor ayrica eklendi.

Uygulama durumu: Bu rapordaki ana context/README/hijyen duzenlemeleri 2026-06-11 tarihinde uygulandi. `AGENT_CONTEXT.md` ve `README.md` guncel mimariye gore yeniden yazildi; `.gitignore` icine `*.swp` eklendi ve tracked swap dosyasi kaldirildi. Research/import artifact klasorleri, `output/*` karar dosyalari ve legacy UI dosyalarinin silinmesi ise bilincli olarak yapilmadi; bunlar halen urun/veri karari bekleyen maddelerdir.

## Kisa Ozet

`AGENT_CONTEXT.md` projeyi genel olarak tanitiyor, fakat artik en kritik mimari gercekleri eksik veya eski anlatiyor:

- Canli universite verisi artik sadece `app/data.ts` degil; `lib/universities.server.ts` uzerinden Supabase `universities`, `university_departments`, `program_admission_details` tablolarindan compose ediliyor.
- `/api/universities` artik stale cache'li statik JSON degil; `force-dynamic`, `no-store`, server cache TTL `0`.
- Yerel seed verisi `64` universite / `240` department iken Supabase canli veri `64` universite / `972` department donduruyor.
- Program modeli `single-cycle` ve `ProgramAdmissionDetails` alanlarini tasiyor; mevcut context sadece eski bachelor/master ve temel metadata modelini anlatiyor.
- Raporlama/import dosyalari, yeni scriptler ve Supabase SQL dosyalari context agacinda eksik.
- Calisma agaci kirli: `AGENT_CONTEXT.md` dahil 13 modified dosya ve cok sayida untracked research/import sonucu var. Ayrica tracked bir `.swp` dosyasi bulunuyor.

## P0 - Yanlis Yonlendiren Kritik Duzeltmeler

### 1. Canli universite veri katmani yeniden yazilmali

Mevcut context, `/api/universities` icin cache header'li JSON endpoint ve `data.ts` merkezi kaynak anlatimini koruyor. Kod gercegi farkli:

- `app/api/universities/route.ts`: `export const dynamic = "force-dynamic"` ve `Cache-Control: no-store, max-age=0`.
- `lib/useUniversitiesData.ts`: browser fetch `cache: "no-store"` kullaniyor.
- `lib/universities.server.ts`: Supabase'den uc tablo cekiyor ve `SERVER_CACHE_TTL_MS = 0`.
- `scripts/check-university-data-source.mjs`: live data surfaces icin `app/data.ts`/`universitiesData` kullanimini explicit olarak yasakliyor.

Fix:

- `AGENT_CONTEXT.md` icindeki "Universite Veri Katmani" bolumu bastan yazilmali.
- `app/data.ts` "yerel seed/tip ve integrity kaynagi" olarak; `lib/universities.server.ts` "canli server data composer" olarak anlatilmali.
- `/api/universities`, sitemap, metadata layout'lari ve chat API'nin `getUniversitiesData()` kullandigi belirtilmeli.
- Cache davranisi eski `s-maxage/stale-while-revalidate` yerine `no-store` olarak guncellenmeli.

### 2. Program sayisi ve veri kapsami ayrimi eklenmeli

Calistirilan kontroller:

- `npm run check:local-data`: local seed `64` universite / `240` department, tamamı `bachelor`.
- `npm run check:data`: Supabase `64` universite / `972` department; level dagilimi `243 bachelor`, `721 master`, `8 single-cycle`; language dagilimi `972 en`, `50 it`.

Fix:

- Context'teki "64 universite + 240 bolum" ifadesi sadece local seed icin gecerli diye isaretlenmeli.
- Canli UI/API/SEO/AI yuzeylerinin Supabase sayilarini kullandigi yazilmali.
- Ana sayfadaki istatistiklerin `useUniversitiesData()` ile dinamik geldigi ve hard-code `64/240` kullanilmamasi gerektigi vurgulanmali.

### 3. Program admission details mimarisi context'e eklenmeli

Kodda artik program kabul detaylari var:

- `app/data.ts`: `ProgramAdmissionDetails`, `ProgramSourceQuote`, `Department.admissionDetails`.
- `types/index.ts`: `SupabaseProgramAdmissionDetailsRow`.
- `components/university-details/ProgramAdmissionDetailsPanel.tsx`: resmi program linki, call linki, tuition linki, campus, degree class, admission type, deadlines, requirements, documents, exam/test, uncertainty fields/notes ve official source linkleri.
- `supabase/program_admission_details.sql`: tablo, policy ve grant tanimlari.
- `scripts/check-program-details.mjs`: Bologna, Polimi, Polito, Sapienza, Padua, Ca' Foscari, Milan, Genoa gibi importlar icin DB dogrulamasi.

Fix:

- "Bolum Detay Sayfalari" bolumune admission panel akisi eklenmeli.
- "Supabase Tablo Yapisi" bolumu artik sadece tahmini `favorites` ve `user_documents` degil; `universities`, `university_departments`, `program_admission_details` beklentilerini de anlatmali.
- `single-cycle` level, `source_quotes`, `uncertain`, `uncertainty_notes`, `source_file` gibi alanlar yeni agent'lar icin belgelenmeli.

### 4. Route/auth matrix eksik

`npm run check:routes` ciktisina gore public pattern'ler:

`/`, `/api/universities(.*)`, `/data(.*)`, `/sign-in(.*)`, `/sign-up(.*)`, `/universities(.*)`, `/cities(.*)`, `/isee(.*)`, `/scholarships(.*)`, `/communities(.*)`, `/topluluklar(.*)`, `/sitemap.xml`, `/robots.txt`.

Protected:

`/ai-mentor`, `/documents`, `/favorites`, `/hub`, `/api/chat`, `/profile`.

Fix:

- Context'teki Clerk Request Boundary bolumune `/data(.*)` eklenmeli.
- `app/sign-in/[[...sign-in]]/page.tsx` ve `app/sign-up/[[...sign-up]]/page.tsx` proje agacina eklenmeli.
- Navbar'in signed-out durumda modal `SignInButton`, protected linklerin ise `redirect_url` ile `/sign-in` route'una gittigi yazilmali.
- `/ai-mentor` protected kalmali; public sitemap/robots anlatiminda yer almamali.

## P1 - Onboarding'i Eksik Birakan Duzeltmeler

### 5. Proje agaci ciddi sekilde eksik

`AGENT_CONTEXT.md` proje agaci su aktif dosyalari kapsamiyor veya eksik anlatiyor:

- `components/MobileZoomLock.tsx`
- `components/VelocityBridge.tsx`
- `components/universities/*`
- `components/university-details/*`
- `lib/universities.server.ts`
- `lib/universitiesFilters.ts`
- `lib/universityDefaults.ts`
- `lib/universityStats.ts`
- `supabase/program_admission_details.sql`
- `scripts/check-program-details.mjs`
- `scripts/check-university-detail-portrait.mjs`
- `scripts/check-universities-server-compose.mjs`
- `scripts/import-*-program-details.mjs`

Fix:

- Proje agaci "tam envanter degil" diyebilir, ama aktif mimari sinirlari gostermeli.
- Universite liste ve detay sayfalari artik component decomposition ile calistigi icin `components/universities` ve `components/university-details` klasorleri context'te ayrica acilmali.

### 6. Program metadata modeli eski

Context'te gecerli `ProgramLevel` degerleri `bachelor | master` olarak yaziyor. Kodda gercek tip:

`"bachelor" | "master" | "single-cycle"`.

Fix:

- Program metadata bolumunde `single-cycle` eklenmeli.
- Yerel seed default'lari ile Supabase canli degerleri ayrilmali: local seed su an `bachelor` agirlikli kalirken Supabase master/single-cycle satirlarini tasiyor.
- `ProgramDirectory`nin programlari bachelor/master/single-cycle olarak grupladigi belirtilmeli.

### 7. Script listesi package.json ile hizalanmali

`AGENT_CONTEXT.md` calistirma listesi eksik. `package.json` mevcut scriptleri:

- `check:program-details`
- `check:university-details-ui`
- `check:cities`
- `check:university-data-source`
- `check:university-department-merge`
- `check:universities-ui`
- `check:scholarships-ui`
- `check:editorial-ui`

Fix:

- "Calistirma" bolumu `package.json` ile birebir hizalanmali.
- `scripts/check-universities-server-compose.mjs` package script degil ama dogrudan dogrulama komutu olarak not dusulebilir.
- `check:cities` su anda package script'te var, fakat `scripts/check-cities-data.mjs` untracked; commit karari verilmeden context'te kalici gerceklik gibi anlatilmamali.

### 8. README hala create-next-app sablonu

`README.md` proje icin hic onboarding saglamiyor; default Next.js metni duruyor.

Fix:

- README en azindan proje amaci, env degiskenleri, temel komutlar, Supabase/Clerk/Gemini bagimliliklari ve dogrulama komutlarini icermeli.
- AGENT_CONTEXT yeni agent icin detayli kalabilir; README daha kisa insan onboarding'i olmali.

### 9. AI Mentor riskleri guncellenmeli

`app/api/chat/route.ts`, sistem promptunu `getUniversitiesData()` ile uretiyor ve canli Supabase program listesini Gemini history'sine koyuyor.

Fix:

- Bilinen risklere "AI prompt context buyumesi" eklenmeli. Supabase department sayisi `972` oldugu icin prompt boyutu ve latency/cost izlenmeli.
- `GEMINI_API_KEY` eksikse 503 dondugu, malformed body icin 400 verdigi ve route'un protected oldugu yazilmali.

### 10. Cities bolumu kismen guncel ama commit riski var

`AGENT_CONTEXT.md` cities bolumu Numbeo kaynaklari icin yeni bilgi tasiyor. Fakat:

- `scripts/check-cities-data.mjs` untracked.
- `package.json` modified ve `check:cities` script'i yeni eklenmis.
- `lib/cities/data.ts` ve `types/cities.ts` modified.

Fix:

- Bu paket beraber commitlenmeli veya context'ten geri alinmali.
- Context'teki "curated 17 sehir / 16 Numbeo kaynakli" iddiasi, ilgili data ve check script commitlenmeden yeni agent icin guvenilir kabul edilmemeli.

## P2 - Repo Hijyeni ve Eski Parcalar

### 11. Tracked swap dosyasi temizlenmeli

Tracked dosya:

- `app/universities/[id]/departments/[deptSlug]/.page.tsx.swp`

Fix:

- Dosya git'ten kaldirilmali.
- `.gitignore` icine `*.swp` eklenmeli.

### 12. Untracked research/import ciktilari karar bekliyor

Calisma agacinda cok sayida untracked klasor ve cikti var:

- `ca-foscari-english-program-admission-requirements/`
- `milano-bicocca-english-program-admission-requirements/`
- `polimi-english-program-admission-requirements/`
- `politecnico-di-torino-english-program-admission-requirements/`
- `sapienza-english-program-admission-requirements/`
- `university-of-genoa-english-program-admission-requirements/`
- `university-of-milan-english-program-admission-requirements/`
- `university-of-padua-english-program-admission-requirements/`
- `output/*`
- `docs/CAMPAIGN_PLAN_LAUNCH.md`
- `docs/LAUNCH_STRATEGY_INSTAGRAM_TIKTOK.md`
- `docs/superpowers/specs/2026-05-27-program-deadline-scraping-design.md`
- `docs/superpowers/plans/2026-05-28-program-deadline-scraping-plan.md`

Fix:

- Bunlar kaynak/veri artefact'i olarak commitlenecek mi, yoksa `.gitignore`/storage disina mi alinacak karar verilmeli.
- Context'te bu import akisi anlatilacaksa kaynak klasorlerinin status'u netlestirilmeli.

### 13. Kullanilmayan veya legacy UI dosyalari isaretlenmeli

Aktif import edilmeyen ama tracked duran ornekler:

- `components/ui/bento-grid.tsx`
- `components/ui/scroll-based-velocity.tsx`

`scripts/check-editorial-ui.mjs` ana sayfada `BentoGrid`, `BentoCard`, `Marquee`, `AnimatedList`, `BorderBeam` gibi token'lari yasakliyor; bu nedenle legacy UI dosyalari yeni agent'i yanlis yola sokabilir.

Fix:

- Gercekten kullanilmiyorsa silinmeli.
- Saklanacaksa context'te "legacy / kullanma" diye belirtilmeli.

### 14. Supabase dokumani ikiye ayrilmali

`SUPABASE_SECURITY_RUNBOOK.md` favorites/documents RLS icin yararli, fakat yeni program admission data akisi ayri bir veri operasyonu.

Fix:

- `AGENT_CONTEXT.md` "Supabase Tablo Yapisi (Tahmin)" basligini artik "Kodun bekledigi Supabase yuzeyleri" diye degistirmeli.
- `supabase/program_admission_details.sql` ile `supabase/rls_hardening.sql` farkli amaclarda anlatilmali.
- Gercek DB schema dashboard'dan dogrulama gerektiriyorsa bu explicit kalmali.

## AGENT_CONTEXT Icin Onerilen Duzeltme Sirasi

1. Calisma agacini netlestir: modified/untracked dosyalarin hangisi bu is kapsaminda commitlenecek karar ver.
2. Tracked `.swp` dosyasini kaldir ve `.gitignore`a `*.swp` ekle.
3. `AGENT_CONTEXT.md` proje agacini aktif route/component/lib/script/supabase dosyalariyla guncelle.
4. "Universite Veri Katmani" bolumunu Supabase-backed, no-store, no server-cache modele gore yeniden yaz.
5. Program metadata ve admission details bolumlerini `single-cycle`, `ProgramAdmissionDetails`, `program_admission_details` tablosu ve source/uncertainty modelini icerecek sekilde guncelle.
6. Route/auth matrix'i `npm run check:routes` ciktisiyla hizala.
7. "Calistirma" bolumunu `package.json` ile birebir hizala.
8. Bilinen sorunlara AI prompt buyumesi, Supabase/env yokken university API 503 riski, data import artefact karari ve README onboarding eksigini ekle.
9. README'yi create-next-app sablonundan proje onboarding dokumanina cevir.
10. Sonra `npm run check:routes`, `npm run check:local-data`, `npm run check:data`, `npm run check:program-details`, `npm run check:cities`, `npm run check:university-data-source` calistir.

## Dogrulama Notlari

Bu rapor yazilmadan once asagidaki komutlar basarili calisti:

- `npm run check:local-data`
- `npm run check:routes`
- `npm run check:university-data-source`
- `npm run check:data`
- `npm run check:program-details`
- `npm run check:cities`
- `node scripts/check-universities-server-compose.mjs`

Bu komutlar uygulamanin tamamini build etmez; sadece rapordaki veri/route/context bulgularini destekleyen kontrollerdir.
