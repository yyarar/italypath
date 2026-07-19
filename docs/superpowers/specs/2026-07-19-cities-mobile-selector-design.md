# Tasarım: Şehir Rehberleri Mobil Seçici

Tarih: 2026-07-19
Durum: Tasarım onaylandı; yazılı spec kullanıcı incelemesinde

## Amaç

`/cities` sayfasında mobil kullanıcı bir şehir seçtiğinde ilgili şehir
dosyasına ulaşmak için şehir dizininin tamamını geçmek zorunda kalıyor. Bu
çalışmanın amacı, şehir seçimini mobilde kompakt bir kontrol haline getirerek
seçili şehir dosyasını doğrudan erişilebilir kılmaktır.

## Kök Neden

`components/cities/CityGuidesExplorer.tsx` masaüstünde iki kolonlu bir düzen
kullanır: şehir dizini solda, seçili şehir dosyası sağdadır. Mobil breakpoint
altında bu kolonlar tek kolona düşer ve 46 şehirlik dizin şehir dosyasından önce
render edilir. Seçim sırasında kullanılan `router.replace(..., { scroll:
false })` mevcut kaydırma konumunu koruduğu için kullanıcı uzun dizinin altında
kalan şehir dosyasına otomatik olarak ulaşamaz.

## Seçilen Yaklaşım

Mobilde uzun şehir kartları yerine native bir `<select>` tabanlı kompakt şehir
seçici gösterilecektir. Masaüstünde mevcut çok kolonlu şehir dizini korunacaktır.

Bu yaklaşım:

- mobilde tek satırlık ve platforma uyumlu bir seçim deneyimi sunar,
- 46 şehir için uzun bir sayfa veya yatay kaydırma oluşturmaz,
- klavye ve ekran okuyucu desteğini tarayıcının yerleşik davranışıyla korur,
- özel modal, arama paneli veya yeni bir bağımlılık gerektirmez.

Değerlendirilen fakat seçilmeyen yaklaşımlar:

- Açılır/kapanır kart dizini: kapalıyken kompakt olsa da açıldığında aynı uzun
  liste sorununu yeniden üretir.
- Aramalı alt panel: daha zengin keşif sağlar ancak mevcut kapsam için gereksiz
  durum, odak ve overlay yönetimi ekler.

## Responsive Davranış

### Mobil ve tablet (`< lg`)

- Şehir dizini kartları görsel olarak gizlenir.
- Şehir dosyasının hemen üzerinde tam genişlikte bir seçim bölümü gösterilir.
- Bölüm, yerelleştirilmiş bir başlık/etiket ile aktif şehir seçimini içerir.
- Her seçenek şehir adını ve program sayısını gösterir.
- Kontrol en az 44 px dokunma yüksekliğine sahip olur.
- Şehir seçildiğinde aktif dosya aynı konumda güncellenir; ek kaydırma gerekmez.

### Masaüstü (`lg` ve üzeri)

- Mevcut şehir kartları ve iki kolonlu düzen korunur.
- Mobil seçici gizlenir.
- Seçim, aktif kart stili ve sticky şehir dosyası davranışı değişmez.

## Bileşen ve Veri Akışı

Yeni bir veri kaynağı eklenmeyecektir. `citiesWithCounts`, hem masaüstü
kartlarını hem mobil seçiciyi besleyen tek liste olmaya devam eder.

Mobil `<select>` değişikliği mevcut `handleSelectCity(citySlug)` akışını
kullanır. Kontrolün `value` değeri ham query metni değil, `activeCity` ile
eşleşen `CityGuideOption.slug` olur; böylece `Milano` ve `milano` gibi eşdeğer
başlangıç değerleri aynı seçeneği gösterir:

```text
Kullanıcı şehir seçer
  -> selectedQueryCity client state'i güncellenir
  -> URL `?city=<slug>` ile replace edilir
  -> activeCity yeniden hesaplanır
  -> şehir dosyası, burs eşleşmesi ve üniversite listesi güncellenir
```

`app/cities/page.tsx` içindeki server wrapper ve initial data akışı
değişmeyecektir. Böylece doğrudan `?city=` ile açılış, hydration ve canlı
üniversite verisiyle yenilenme davranışları korunur.

## Yerelleştirme

Mobil seçicinin kullanıcıya görünen yeni metinleri
`lib/translations.ts` içindeki `citiesGuide` alanına Türkçe ve İngilizce
paralel olarak eklenecektir. Şehir adları için mevcut `name` / `nameEn`
eşleşmesi kullanılacaktır; uygulamanın Türkçe şehir slug kuralları
değişmeyecektir.

## Erişilebilirlik

- `<select>` görünür veya programatik olarak bağlı bir `<label>` taşır.
- Aktif şehir gerçek `value` üzerinden ifade edilir.
- Native kontrol klavye, VoiceOver ve platform seçim arayüzünü korur.
- Focus-visible stili editorial sage token'ı ile belirgin olur.
- Şehir kartlarının mevcut `aria-pressed` davranışı masaüstünde korunur.

## SEO ve İlk HTML

- `app/cities/page.tsx` Server Component olarak kalır.
- `useSearchParams` eklenmez ve page-level CSR bailout oluşturulmaz.
- Şehir seçenekleri initial server verisiyle ilk HTML'de bulunmaya devam eder.
- SEO için gizli metin veya kullanıcıdan farklı bot içeriği eklenmez.
- Mobil/masaüstü görünürlüğü yalnızca responsive sunum farkıdır; aynı gerçek
  şehir verisi kullanılır.

## Hata Davranışı

Canlı üniversite verisinin yüklenemediği mevcut route-level editorial hata
durumu korunur. Client veri yenilenirken initial şehir listesi kullanılmaya
devam eder. Seçili slug eşleşmezse mevcut Milano fallback davranışı değişmez.

## Test Stratejisi

Uygulama TDD sırasıyla yapılacaktır:

1. `scripts/check-cities-data.mjs` içine mobil seçicinin, responsive görünürlük
   sınırlarının ve ortak seçim handler'ının varlığını doğrulayan regresyon
   kontrolleri eklenir.
2. Kontrolün mevcut kodda beklenen nedenle başarısız olduğu görülür.
3. Minimum component ve translation değişiklikleri uygulanır.
4. `npm run check:cities`, hedefli lint ve production build çalıştırılır.
5. Mobil viewport'ta şehir dosyasının seçicinin hemen altında kaldığı ve seçim
   sonrası uzun kaydırma gerekmediği görsel olarak doğrulanır.

## Kabul Kriterleri

1. Mobilde uzun şehir kartları şehir dosyasının önünde görünmez.
2. Mobil kullanıcı tek kompakt kontrolden tüm şehirleri seçebilir.
3. Seçim sonrası URL, aktif şehir dosyası, burs bölgesi ve üniversite listesi
   birlikte güncellenir.
4. Şehir seçimi kullanıcıyı sayfada uzun bir mesafe kaydırmaya zorlamaz.
5. Masaüstü şehir dizini ve sticky detay düzeni değişmez.
6. Yeni metinler Türkçe ve İngilizce paralel tutulur.
7. Erişilebilir label, native klavye kullanımı ve focus-visible durumu vardır.
8. Şehir veri kontrolü, lint ve production build başarılıdır.
9. İlgisiz dosyalar veya kullanıcının mevcut değişiklikleri etkilenmez.

## Kapsam Dışı

- Şehir içeriklerinin veya maliyet verilerinin yeniden yazılması
- Aramalı modal ya da bottom-sheet geliştirilmesi
- Şehir URL modelinin ayrı dinamik route'lara taşınması
- Masaüstü explorer tasarımının yenilenmesi
- Yeni state kütüphanesi, UI bağımlılığı veya Tailwind config eklenmesi
