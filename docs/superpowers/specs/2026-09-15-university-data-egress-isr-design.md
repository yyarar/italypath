# Üniversite Verisi: Egress Diyeti ve Hazır Sayfa Önbelleği (ISR) — Tasarım

Tarih: 2026-09-15
Durum: Kerem onayladı (15 Eylül 2026, sohbet). Uygulama planı: `docs/superpowers/plans/2026-09-15-university-data-egress-isr-plan.md`
İlgili kayıt: `SEO_AUDIT.md` §19.3 (LCP kök nedeni) ve §20 (bu işin sonucu)

## Amaç

İki ölçülmüş sorun tek kökten geliyor:

1. **Hız (SEO):** Vercel serverless işçisi soğukken `getUniversitiesData()` bütün veri setini Supabase'den çekip derliyor; HTML gövdesi 3-5 sn bekliyor. Devtools throttling ölçümünde production ana sayfa FCP=LCP 8,3 sn (soğuk) / 3,7 sn (sıcak); program sayfası 6,1 / 3,6 sn. Google'ın "iyi" eşiği 2,5 sn.
2. **Supabase egress:** Loglara göre günde 82-88 tam çekim, her biri farklı işçi IP'sinden (soğuk başlangıç). Tam çekim sıkıştırılmış 4,6 MB; %98'i `program_admission_details` (ham 13,8 MB). Günde ~390 MB → dönemde 7,3 GB (Free kota 5 GB, %145). Mühlet 14 Ekim 2026; sonrasında 402 kısıtlaması.

Bir program sayfası kendi okulu için ~0,1 MB veriye ihtiyaç duyarken 4,6 MB çekiyor; sitemap 16 KB için 4,6 MB çekiyor.

Başarı ölçütü: günlük Supabase egress < 30 MB; production devtools koşusunda doküman gövdesi bitişi soğukta da < 1,5 sn; program/üniversite/ana sayfa Vercel önbelleğinden `x-vercel-cache: HIT` ile dönüyor; görünürde hiçbir değişiklik yok; kabul dosyası paneli program sayfasında tam içerikle çalışıyor.

## Alınmış kararlar (tartışmaya açılmaz)

- Tazelik toleransı: birkaç saat (Kerem, 15 Eylül). Sayfa önbelleği `revalidate = 10800` (3 saat); in-memory memo TTL'i de 3 saat kalır ve `check:university-data-source`'un 1-6 saat kuralı korunur.
- Ağır kabul metinleri (`source_quotes`, `academic_requirements`, `language_requirements`, `required_documents`, `entry_exam_or_test`, `uncertainty_notes`, `source_file`) yalnızca program/üniversite detay sayfalarında ve yalnızca sunucudan (`getUniversityById`) yüklenir. Tarayıcıya giden `/api/universities` bunları taşımaz.
- `/api/universities` `no-store` + `force-dynamic` sözleşmesi ve `lib/useUniversitiesData.ts` `cache: "no-store"` sözleşmesi değişmez (guard). Yükü düşüren şey yanıtın hafiflemesidir, önbellek başlığı değil.
- `/universities` ve `/cities` sunucu tarafında `searchParams` okuduğu için dinamik kalır; hafif veriyle çalışır. ISR'a alınmaz (kapsam dışı).
- Mobil zoom kilidi ve hero animasyonu bu işin dışındadır; dokunulmaz.
- Vercel Data Cache (`unstable_cache`/`"use cache"`) kullanılmaz: parça başına 2 MB sınırı var ve gerek kalmıyor.

## Kapsam

Dahil: `lib/universities.server.ts` veri katmanı, `types/universities.ts` (`hasAdmissionDetails`), yeni `lib/admissionPresence.ts`, `lib/useUniversitiesData.ts` seçeneği, iki detay client leaf'i, `app/page.tsx`, `app/universities/page.tsx`, `app/cities/page.tsx`, `app/sitemap.ts`, `app/api/universities/route.ts`, `app/api/chat/route.ts`, iki detay `page.tsx` (ISR), guard scriptleri, `AGENT_CONTEXT.md`, `SEO_AUDIT.md` §20.

Hariç: font diyeti, Clerk JS diyeti, `/universities` ve `/cities` ISR'ı, on-demand revalidation (import sonrası anında yenileme), Supabase şema değişikliği, yeni index (tablolar ≤ 1.100 satır; `university_id` filtresi zaten hızlı).

## Mimari

### Veri katmanı (`lib/universities.server.ts`)

İki çalışma zamanı fonksiyonu; eski tam çekim `getUniversitiesData()` kaldırılır.

- `getUniversitiesDirectory(): Promise<University[]>` — `universities` (mevcut kolonlar) + `university_departments` (mevcut kolonlar) + `program_admission_details?select=department_id` (yalnızca varlık). Her `Department` `hasAdmissionDetails: boolean` taşır, `admissionDetails` alanı **yoktur**. Sıkıştırılmış ~47 KB. Tek memo (`directoryCache`), single-flight, stale-on-error (log metni `serving stale cached data` korunur).
- `getUniversityById(id): Promise<University | undefined>` — `universities?id=eq.{id}`, `university_departments?university_id=eq.{id}`, `program_admission_details?university_id=eq.{id}` (mevcut kolonlar). Tam `admissionDetails` + `hasAdmissionDetails`. Sıkıştırılmış 90-180 KB (okula göre). Okul başına memo (`Map<string, …>`), okul başına single-flight, stale-on-error. Okul yoksa `undefined` (route `notFound()`).
- `composeUniversitiesFromSupabaseRows(universityRows, departmentRows, admissionDetailRows = [], admissionPresenceDepartmentIds?: Set<number>)` saf kalır; 4. parametre varlık bilgisini ayrı taşır. `scripts/check-universities-server-compose.mjs` bu fonksiyonu regex tabanlı transpile ile yüklediği için modülün ilk `import { createClient } from "@supabase/supabase-js";` satırı ve `import type … from "@/types…"` biçimi değişmez; yeni yardımcı dosyalar bu modüle import edilmez.

### Tipler ve varlık yardımcısı

- `types/universities.ts`: `Department.hasAdmissionDetails?: boolean`.
- `lib/admissionPresence.ts`: `hasAdmissionDossier(department)` = `Boolean(department.admissionDetails) || department.hasAdmissionDetails === true`. Kullanım: `lib/hub/recommendations.ts` (0,5 puan bonusu) ve `components/university-details/ProgramTransitionEntry.tsx` ("yakında" rozeti / ok).

### Sayfalar ve önbellek

- `app/page.tsx`: `force-dynamic` kalkar, `export const revalidate = 10800`. İstatistikler `getUniversitiesDirectory()`'den.
- `app/universities/[id]/page.tsx` ve `app/universities/[id]/departments/[deptSlug]/page.tsx`: `export const revalidate = 10800`. `[id]/page.tsx` artık `searchParams` okumaz (aksi hâlde ISR devre dışı kalır); `cameFromList` bilgisi client leaf'te `window.location.search` ile hidrasyon sonrası hesaplanır.
- `app/universities/page.tsx`, `app/cities/page.tsx`, `app/sitemap.ts`, `app/api/universities/route.ts`, `app/api/chat/route.ts`: `getUniversitiesDirectory()`.

### Tarayıcı tarafı

- `useUniversitiesData(initialUniversities?, options?: { fetchWhenInitial?: boolean })`. Varsayılan `true` (liste keşfi 12 okulluk önizlemeyle başlar, tam dizini çeker). Detay leaf'leri `fetchWhenInitial: false` geçer: sunucudan gelen tam okul verisi varken dizin çekilmez ve modül önbelleğindeki hafif kopya tam veriyi ezmez. Sunucu verisi yoksa (hata yolu) dizin çekilir; bu durumda program sayfası kabul paneli olmadan (düşürülmüş) çalışır ve bu kabul edilen davranıştır.
- Detay leaf'lerinde `university = initialUniversity ?? universities.find(...)` (sunucu verisi önce).

### Guard'lar

- `scripts/check-university-data-source.mjs`: tam çekim export'u yok; dizin/hedefli fonksiyonlar var; varlık sorgusu yalnızca `department_id`; hedefli sorgu `.eq("university_id"`; çağıran dosyalar doğru fonksiyonu kullanıyor; hook `fetchWhenInitial` tanıyor ve iki detay leaf'i `fetchWhenInitial: false` geçiyor; TTL/stale/no-store kuralları aynen.
- `scripts/check-seo-vitals.mjs`: `app/page.tsx` `force-dynamic` içermez ve `revalidate` 3600-21600 arası; iki detay `page.tsx` `revalidate` export eder; `[id]/page.tsx` `searchParams` okumaz.
- `scripts/check-universities-server-compose.mjs`: `hasAdmissionDetails` üç durumda (detaylı, yalnız varlık, hiçbiri) doğrulanır.

## Hata durumları

- Supabase hatası + memo var → bayat veri sunulur, `console.error` "serving stale cached data".
- Supabase hatası + memo yok → fonksiyon fırlatır; route'lar mevcut editorial "veri yüklenemedi" gövdesini gösterir (değişmez).
- Okul id'si yok → `getUniversityById` `undefined` → `notFound()` (HTTP 404, değişmez).
- ISR yenilemesi başarısız olursa Vercel eski kopyayı sunmaya devam eder.

## Doğrulama

1. `npm run check:university-data-source`, `npm run check:seo-vitals`, `node scripts/check-universities-server-compose.mjs`, `npm run check:universities-ui`, `npm run check:university-details-ui`, `npm run check:admission-dossier`, `npm run check:hub-onboarding`, `npm run check:routes`, `npm run lint`.
2. `npm run build`: rota tablosunda `/`, `/universities/[id]`, `/universities/[id]/departments/[deptSlug]` ISR (revalidate 3h) olarak görünür; `/universities`, `/cities` dinamik kalır.
3. Yerel üretim sunucusunda bir program sayfası ve `/universities` açılır; Supabase edge loglarında `program_admission_details` isteği `university_id=eq.` filtresiyle ve küçük `content-range` ile; dizin isteği `select=department_id` ile görünür. Tarayıcı panelinde program sayfası hidrasyon sonrası kabul dosyası panelini tam gösterir.
4. Deploy sonrası: aynı program sayfasına iki istek → ikincide `x-vercel-cache: HIT`; devtools throttling ile soğuk/sıcak FCP; ertesi gün Supabase log sayımı (istek başına boyut ve gün başına toplam).

## Beklenen etki

| Yüzey | Önce (gz) | Sonra (gz) |
|---|---:|---:|
| Program / üniversite sayfası (soğuk) | 4,6 MB | 0,09-0,18 MB |
| Ana sayfa, liste, şehirler, sitemap, API, chat (soğuk) | 4,6 MB | 0,05 MB |
| Günlük egress (85 soğuk çekim) | ~390 MB | ~10 MB |

## Riskler

- Kabul paneli tarayıcıda hafif veriyle ezilirse boş kalır → `fetchWhenInitial: false` + `initialUniversity` önceliği + guard + tarayıcı testi.
- `hasAdmissionDetails` bayrağı unutulursa "yakında" rozetleri yanlış görünür → compose testi üç durumu kapsar.
- ISR'da `searchParams`/`cookies()` kullanımı sayfayı sessizce dinamiğe düşürür → build rota tablosu ve guard.
- Import sonrası veri en fazla 3 saat gecikir → kabul edilen tolerans; gerekirse ileride on-demand revalidation eklenir.
