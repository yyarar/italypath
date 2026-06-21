# Tasarım: SEO Server HTML Güçlendirme

Tarih: 2026-06-21
Durum: Tasarım onaylandı; yazılı spec kullanıcı incelemesinde

## Amaç

SEO Adım 1 ile canonical domain `https://italypath.app` olarak düzeltildi.
SEO Adım 2'nin hedefi, public SEO sayfalarının ilk production HTML çıktısını
gerçek, görünür ve indexlenebilir içerikle güçlendirmektir.

Şu an `/universities`, university detail ve program detail sayfaları gerçek
body içeriğini tarayıcıdaki client fetch sonrasına bırakıyor. Özellikle
`/universities` canlı HTML'inde gerçek liste yerine loading/skeleton ve
`BAILOUT_TO_CLIENT_SIDE_RENDERING` izi görülebiliyor. Google JavaScript render
edebilse de, kritik landing ve detail sayfalarında ilk HTML'de gerçek H1,
açıklama, stats ve internal linklerin bulunması gerekir.

## Kapsam

- `/universities`
- `/universities/[id]`
- `/universities/[id]/departments/[deptSlug]`
- `/cities`
- `/scholarships`

Kapsam dışı:

- JSON-LD / schema markup
- PWA, manifest veya ikon çalışması
- Middleware oluşturma
- Tailwind config oluşturma
- Büyük görsel redesign
- Hidden SEO text veya kullanıcıya görünmeyen keyword blokları
- Live SEO için `app/data.ts` seed verisine geri dönüş

## Seçilen Yaklaşım

Ana yaklaşım: **server wrapper + initial data client leaf**.

Server page dosyaları canlı veriyi `getUniversitiesData()` veya
`getUniversityById()` üzerinden alacak, query parametrelerini server tarafında
normalize edecek ve client leaf component'lere initial data geçecek. Bu initial
data sadece client state'i başlatmak için kullanılmayacak; local production
HTML çıktısında gerçek SEO içeriğinin görünmesini sağlayacak.

`/cities` ve `/scholarships` için ana hedef büyük refactor değil, mevcut
interaktif explorer deneyimini koruyarak server-rendered görünür intro ve temel
internal navigation eklemektir. Bu sayfalarda da ilk HTML tamamen skeleton
olmamalıdır.

## Kritik SEO Kabul Kriterleri

1. İlk HTML'deki içerik kullanıcıya görünür olmalıdır. Gizli SEO metni,
   `display: none`, visually-hidden keyword blokları veya botlara farklı
   içerik yoktur.
2. `/universities` local production HTML'inde gerçek H1, canlı stats ve en az
   birkaç gerçek university internal link'i aranarak doğrulanmalıdır.
3. `/universities/[id]` local production HTML'inde okul adı, şehir, açıklama,
   fee ve program linkleri aranarak doğrulanmalıdır.
4. `/universities/[id]/departments/[deptSlug]` local production HTML'inde
   program adı, okul adı, şehir, seviye, dil, süre ve varsa admission details /
   official links aranarak doğrulanmalıdır.
5. `useSearchParams` veya Suspense kaynaklı page-level CSR bailout tekrar
   oluşmamalıdır. Production HTML kontrolünde kritik sayfalarda
   `BAILOUT_TO_CLIENT_SIDE_RENDERING` izi bulunmamalıdır.
6. Client interaktif akışlar korunmalıdır: filtreleme, URL sync, favoriler,
   view mode, dil toggle, program transition ve route animation.
7. Server tarafında live data kaynağı `getUniversitiesData()` /
   `getUniversityById()` olmalıdır. `app/data.ts` sadece tip/default sabitleri
   için kullanılabilir.

## `/universities` Tasarımı

`app/universities/page.tsx` async Server Component'e döner.

Server sorumlulukları:

- `getUniversitiesData()` ile canlı university/program datasını almak.
- `searchParams` üzerinden `q`, `city`, `type`, `fav` değerlerini parse etmek.
- Favori filtresini server'da uygulamamak; favoriler kullanıcıya özel olduğu
  için initial HTML'de normal public liste gösterilir. `fav=1` varsa client
  hydrate sonrası guest/user favori state'i ile daraltma yapılır.
- Canlı stats hesaplamak:
  - university count
  - program count
  - city count
- İlk HTML'de görünür hero, açıklama ve en az birkaç university row/link
  üretmek.

Client leaf sorumlulukları:

- Existing filtreleme, search, city/type filter, favorites-only, view mode ve
  URL sync davranışını korumak.
- `initialUniversities`, `initialFilters` ve initial stats ile hydrate olmak.
- İlk render'da initial data varken loading state göstermemek.
- `useSearchParams` bağımlılığını kaldırmak veya page-level bailout
  üretmeyecek şekilde server'dan gelen initial filtreleri kullanmak.

Önerilen component sınırı:

- `app/universities/page.tsx`: server wrapper
- `components/universities/UniversitiesExplorer.tsx`: client leaf
- Gerekirse görünür server/client ortak render için küçük saf component'ler:
  `UniversitiesServerHero`, `UniversitySeoRows` veya mevcut row stillerinin
  prop-onClick bağımlılığı azaltılmış varyantları.

## `/universities/[id]` Tasarımı

`app/universities/[id]/page.tsx` async Server Component'e döner.

Server sorumlulukları:

- `getUniversityById(params.id)` ile canlı okul verisini almak.
- Okul yoksa görünür not-found state'i üretmek.
- İlk HTML'de şu bilgileri görünür basmak:
  - university name (`h1`)
  - city link'i
  - type
  - description
  - fee
  - program count
  - official website link
  - program internal links
- Client detail component'e `initialUniversity` geçirmek.

Client leaf sorumlulukları:

- Favori butonu, back behavior, language toggle kaynaklı metin seçimi,
  AI mentor link'i ve program transition davranışını korumak.
- Initial data varken `/api/universities` fetch bitene kadar loading
  göstermemek.
- Program linkleri server HTML'de gerçek `<a href="/universities/...">`
  olarak kalmalı; sadece click transition gerekiyorsa progressive enhancement
  olarak client tarafında uygulanmalı.

## `/universities/[id]/departments/[deptSlug]` Tasarımı

`app/universities/[id]/departments/[deptSlug]/page.tsx` async Server Component'e
döner.

Server sorumlulukları:

- `getUniversityById(params.id)` ile okul verisini almak.
- `deptSlug` ile programı bulmak.
- İlk HTML'de şu bilgileri görünür basmak:
  - program name (`h1`)
  - university name link'i
  - city
  - level
  - duration
  - languages
  - school context description
  - admission details varsa campus, degree class, admission type, deadlines,
    academic/language requirements, required documents ve official links
  - admission details yoksa görünür "kabul detayları yakında" notu
  - diğer program internal linkleri
- Client detail component'e `initialUniversity` ve `initialDepartment`
  geçirmek.

Client leaf sorumlulukları:

- Program transition, AI mentor CTA ve mevcut route animation davranışını
  korumak.
- Initial data varken loading state göstermemek.
- Official links kullanıcıya görünür olmalı; hidden SEO link listesi yok.

## `/cities` Tasarımı

Amaç, büyük explorer refactor yapmadan ilk HTML'i skeleton-only olmaktan
çıkarmaktır.

Server page şunları görünür basar:

- gerçek H1
- açıklayıcı intro
- öne çıkan city internal navigation linkleri
- `/universities` ve `/scholarships` gibi ilişkili public sayfalara linkler

Client explorer mevcut city selection, URL sync, university city listesi ve
scholarship cross-link davranışını sürdürür. `useSearchParams` bağımlılığı
server'dan gelen `initialSelectedCity` prop'una taşınır; URL sync client state
ve `router.replace()` ile sürer. Bu sayfada page-level CSR bailout
üretilmemelidir.

## `/scholarships` Tasarımı

Amaç, bölgesel burs haritasını skeleton-only ilk HTML'den çıkarıp görünür,
indexlenebilir bir başlangıç bölümü sağlamaktır.

Server page şunları görünür basar:

- gerçek H1
- açıklayıcı intro
- birkaç bölge link'i veya region rail başlangıcı
- `/cities` ve `/universities` gibi ilişkili public sayfalara linkler

Client explorer mevcut map, GeoJSON fetch, region selection ve URL sync
davranışını sürdürür. `useSearchParams` bağımlılığı server'dan gelen
`initialSelectedRegion` prop'una taşınır; URL sync client state ve
`router.replace()` ile sürer. Page-level CSR bailout üretilmemelidir.

## Data Flow

```text
Request
  -> Server page parses params/searchParams
  -> Server fetches live university data through lib/universities.server.ts
  -> Server renders visible SEO content and passes initial data to client leaf
  -> Client hydrates with same initial data
  -> Client preserves filters/favorites/view mode/animations
```

Client fetch stratejisi:

- `useUniversitiesData()` initial data kabul edecek şekilde genişletilebilir.
- Initial data varsa hook loading state ile başlamaz.
- Background refresh yapılacaksa kullanıcıya skeleton gösterilmeden yapılır.
- API fetch yine `/api/universities` ve `cache: "no-store"` ile kalır.

## Component ve Dosya Planı

Beklenen dosya değişiklikleri:

- `app/universities/page.tsx`
- `app/universities/[id]/page.tsx`
- `app/universities/[id]/departments/[deptSlug]/page.tsx`
- `app/cities/page.tsx`
- `app/scholarships/page.tsx`
- `components/universities/*` içinde client leaf veya server-safe küçük render
  bileşenleri
- `components/university-details/*` içinde client leaf veya server-safe küçük
  render bileşenleri
- `lib/useUniversitiesData.ts` initial data desteği için
- `scripts/check-university-detail-portrait.mjs`

Guard güncellemesi:

- `check-university-detail-portrait.mjs` şu anda `university.fee`,
  `t.detail.fee` ve `t.department.fee` token'larını forbidden listesinde
  tutuyor.
- Bu eski yasak büyük detail redesign sırasında fee bloğunun geri getirilip
  UI'ı eski özet kart yapısına döndürmesini engellemek için konmuş görünüyor.
- SEO Adım 2'de fee bilgisi university detail ilk HTML'inde görünür olmalıdır.
  Bu yüzden guard bilinçli güncellenir: fee'nin görünür ve sınırlı bir fact
  olarak kullanılmasına izin verilir, ancak eski redesign token'ları ve büyük
  özet kart regresyonları yasak kalır.

## Error Handling

- Server data fetch hata verirse kritik sayfalarda görünür, kullanıcı dostu
  error state üretilir.
- Error state hidden değildir ve skeleton-only değildir.
- Detail route'ta okul veya program bulunamazsa gerçek `h1` içeren not-found
  gövdesi render edilir.
- Client hydrate sonrası API refresh hata verirse initial server data ekrandan
  kaldırılmaz.

## Test ve Doğrulama

Otomatik komutlar:

```bash
npm run build
npm run lint
npm run check:routes
npm run check:university-data-source
npm run check:universities-ui
npm run check:university-details-ui
node scripts/check-universities-server-compose.mjs
```

Gerekirse ek kontroller:

```bash
npm run check:cities
npm run check:scholarships-ui
```

Local production HTML doğrulaması:

1. `npm run build`
2. `npm run start`
3. `curl -sL http://localhost:<port>/universities` çıktısında:
   - gerçek H1
   - canlı stats
   - en az birkaç `/universities/<id>` link'i
   - `BAILOUT_TO_CLIENT_SIDE_RENDERING` olmaması
4. `curl -sL http://localhost:<port>/universities/<id>` çıktısında:
   - okul adı
   - şehir
   - açıklama
   - fee
   - program linkleri
   - `BAILOUT_TO_CLIENT_SIDE_RENDERING` olmaması
5. `curl -sL http://localhost:<port>/universities/<id>/departments/<deptSlug>`
   çıktısında:
   - program adı
   - okul adı
   - seviye/dil/süre
   - admission details varsa temel kabul bilgileri ve official links
   - `BAILOUT_TO_CLIENT_SIDE_RENDERING` olmaması

Production deploy sonrası manuel doğrulama:

```bash
curl -sL https://italypath.app/universities
```

Bu çıktıda gerçek H1, liste/linkler ve canlı içerik aranır.

## Riskler ve Sınırlar

- Server page'lerin Supabase canlı veriye bağımlılığı TTFB'yi artırabilir.
  Bu adımda veri cache TTL'i değiştirilmez; mevcut no-store/live data kuralı
  korunur.
- Initial server data ile client background refresh arasında veri farkı
  olabilir. UX skeleton'a düşmemeli; refresh yalnızca veri günceller.
- Favoriler kullanıcıya özel olduğu için server HTML'de favorites-only
  filtrelenmiş sonuç beklenmez. Public SEO HTML normal listeyi taşır.
- TR varsayılan server HTML üretimi LanguageContext varsayılanıyla uyumludur.
  Dil toggle hydrate sonrası mevcut davranışı sürdürür.
- `/cities` ve `/scholarships` için hedef küçük SEO güçlendirmesidir; harita
  veya atlas deneyimi yeniden tasarlanmaz.

## Spec Self-Review

- Placeholder yok: eksik veya geçici karar bırakılmadı.
- Kapsam tek implementation plan'a sığacak şekilde SEO body HTML ve client UX
  korunmasıyla sınırlı tutuldu.
- Hidden SEO text yasağı ve kullanıcıya görünen içerik şartı açık.
- `useSearchParams` / Suspense kaynaklı bailout riski kabul kriteri ve sayfa
  tasarımlarında açıkça ele alındı.
- Fee guard çakışması not edildi ve guard güncellemesinin amacı belirtildi.
