# ItalyPath SEO Audit ve Devir Notu

> Son belge güncellemesi: 3 Eylül 2026  
> Bulguların ana doğrulama tarihi: 28 Ağustos 2026  
> İncelenen site: `https://italypath.app`  
> Kapsam: Google Search Console, canlı teknik kontroller, sitemap/robots, indekslenebilirlik, temel on-page SEO, yapılandırılmış veri ve PageSpeed Insights  
> Durum: Bu çalışma bir denetimdir. Bu denetim sırasında SEO/performance düzeltmesi yapan kod değişikliği uygulanmadı.

Bu dosya, yeni bir geliştirici veya AI ajanının önceki konuşmayı okumadan SEO durumunu anlayabilmesi için hazırlanmıştır. Sayısal GSC ve PageSpeed verileri zamanla değişir; tarihleri dikkate almadan güncel gerçek kabul edilmemelidir.

## 1. Kısa yönetici özeti

ItalyPath'in temel teknik SEO altyapısı genel olarak sağlıklı:

- HTTPS, yönlendirmeler, `robots.txt` ve sitemap çalışıyor.
- Sitemap 1.087 URL içeriyor ve Search Console tarafından başarıyla okunmuş.
- 28 Ağustos 2026'da sitemapteki 1.087 URL'nin tamamı canlı olarak tarandı; hepsi HTTP 200 döndürdü ve hiçbirinde `noindex` bulunmadı.
- Kontrol edilen örneklerde title, description, canonical, tek H1, sunucu HTML'i ve JSON-LD mevcut.
- Lighthouse temel SEO skoru hem mobil hem masaüstünde 100.

Ancak iki ayrı konu birbirinden ayrılmalıdır:

1. **Google indeksleme gecikmesi:** Search Console hâlâ geçmişteki `noindex` durumunu raporluyor. 857 URL doğrulama bekliyor. Canlı sürümde `noindex` kaldırılmış durumda; Google'ın yeniden taraması bekleniyor.
2. **Mobil performans:** Mobil Lighthouse performansı 81 ve LCP 4,2 saniye. LCP öğesi ana sayfanın H1 başlığı; başlığı başlangıçta görünmez yapan client-side animasyon ve yüksek JavaScript yükü başlıca şüpheliler.

En yüksek öncelikli işler:

1. GSC'deki 857 URL'lik `noindex` doğrulamasını izlemek; toplu manuel indeks isteği göndermemek.
2. LCP olan H1'i ilk HTML çiziminde görünür yapmak.
3. Mobil yakınlaştırma engelini kaldırmak ve erişilebilirlik sorununu çözmek.
4. Herkese açık sayfalarda Clerk ve istemci JavaScript yükünü azaltmak.
5. Düşük kontrastlı terracotta metin rengini düzeltmek.

## 2. Kaynaklar ve kanıt seviyesi

### Birincil kaynaklar

- Kullanıcının Google Search Console ekran görüntüleri.
- Kullanıcının PageSpeed raporu: <https://pagespeed.web.dev/analysis/https-italypath-app/vgyut213to?form_factor=mobile>
- Canlı site üzerinde yapılan HTTP ve HTML kontrolleri.
- Yerel repository kodu.
- Proje bağlamı: `AGENT_CONTEXT.md`.

### Kanıt etiketleri

- **Canlı doğrulandı:** 28 Ağustos 2026'da doğrudan site veya render edilmiş rapor üzerinde kontrol edildi.
- **GSC ekranı:** Kullanıcının paylaştığı Search Console görüntüsündeki değer.
- **Kod doğrulaması:** Repository içindeki mevcut uygulamadan görüldü.
- **Çıkarım:** Birden fazla kanıta dayalı olası neden; değişiklik sonrası yeniden ölçüm gerekir.
- **Bekliyor:** Google veya gerçek kullanıcı verisi nedeniyle henüz sonuçlanmadı.

## 3. Site ve uygulama bağlamı

- Next.js 16.1.6 App Router ve React 19 kullanılıyor.
- Kimlik doğrulama Clerk, veri kaynağı Supabase.
- Önemli herkese açık SEO sayfaları: ana sayfa, üniversite listesi, üniversite detayları, program detayları, şehirler, burslar, topluluklar ve ISEE.
- `app/robots.ts` robots çıktısını, `app/sitemap.ts` sitemap çıktısını üretiyor.
- Sitemap URL'leri Supabase verilerinden dinamik olarak oluşturuluyor.
- Ana sayfa `app/page.tsx` içinde `dynamic = "force-dynamic"` kullanıyor.
- Global yerleşim `app/layout.tsx` içinde bütün site `ClerkProvider`, `LanguageProvider` ve `RouteTransition` ile sarılıyor.

## 4. Google Search Console bulguları

### 4.1 Arama performansı

İncelenen dönem: son 3 ay.

| Metrik | Değer |
|---|---:|
| Toplam tıklama | 10 |
| Toplam gösterim | 444 |
| Ortalama CTR | %2,3 |
| Ortalama konum | 6,5 |

Görünen sorgular:

| Sorgu | Tıklama | Gösterim | CTR | Ortalama konum |
|---|---:|---:|---:|---:|
| `italypath` | 2 | 19 | %10,5 | 2,6 |
| `lisans` | 0 | 1 | %0 | 4,0 |

Yorum:

- Site henüz çok düşük organik hacimde. Ortalama konum tek başına güçlü büyüme göstergesi sayılmamalı; örneklem küçüktür.
- GSC, gizlilik nedeniyle çok düşük hacimli sorguların tamamını tabloya yazmayabilir. Toplamlar ile görünen satırlar arasındaki fark normal olabilir.
- Marka sorgusu `italypath` görünürlük kazanmış; asıl büyüme için marka dışı program, üniversite, burs ve şehir sorgularına ihtiyaç var.

### 4.2 Sayfa indeksleme

GSC ekranındaki dağılım:

| Durum | URL sayısı |
|---|---:|
| Dizine eklenen | 21 |
| Dizine eklenmeyen | 866 |

Dizine eklenmeme nedenleri:

| Neden | URL sayısı | İlk değerlendirme |
|---|---:|---|
| `robots.txt` tarafından engellendi | 3 | URL örnekleri alınmadan kasıtlı/kasıtsız denemez |
| Yönlendirmeli sayfa | 3 | Normal olabilir; hedefler incelenmeli |
| `noindex` etiketi tarafından hariç tutuldu | 857 | Ana indeksleme problemi; canlı sürümde artık `noindex` yok |
| Yeniden yönlendirme hatası | 3 | GSC örnek URL'leri alınarak ayrıca incelenmeli |
| Keşfedildi, şu anda dizine eklenmiş değil | 0 | Sorun görünmüyor |
| Tarandı, şu anda dizine eklenmiş değil | 0 | Sorun görünmüyor |

`noindex` ayrıntıları:

- GSC doğrulaması 22 Temmuz 2026'da başlatılmış.
- Paylaşılan ekranda 857 URL **beklemede**, 0 URL başarısız görünüyordu.
- GSC örnek program URL'lerinin son tarama tarihleri 16–19 Temmuz 2026 idi; yani doğrulama başlangıcından önceki eski taramalardı.
- Örnek URL `https://italypath.app/universities/9/departments/digital-and-public-humanities` için yapılan canlı URL testi başarılıydı:
  - “URL, Google tarafından kullanılabilir”
  - Sayfa dizine eklenebilir
  - Bir geçerli yapılandırılmış veri öğesi algılandı
- Sadece bu örnek URL için indeks isteği gönderildi. 857 URL'ye tek tek istek gönderilmemesi önerildi.

**Canlı doğrulama sonucu:** Sitemapteki 1.087 URL 28 Ağustos 2026'da paralel tarandı. Hepsi 200 döndürdü ve hiçbir HTML çıktısında `noindex` bulunmadı. Repository içinde de SEO sayfalarını etkileyen güncel bir `noindex` kullanımı tespit edilmedi.

Sonuç:

- 857 URL'lik GSC raporu büyük olasılıkla güncel canlı durumdan geride kalan eski tarama verisidir.
- Şu an yeni bir `noindex` kod düzeltmesi gerekmiyor.
- Durum **bekliyor**: Google yeniden taramalı ve doğrulamayı tamamlamalı.
- Eğer doğrulama başarısız olursa GSC'den örnek URL listesi dışa aktarılmalı ve HTML/header bazında tekrar incelenmeli.

### 4.3 Sitemap

GSC'de görünen sitemap:

- URL: `https://italypath.app/sitemap.xml`
- İlk gönderim: 27 Haziran 2026
- Son okuma: 12 Temmuz 2026
- Durum: Başarılı
- Keşfedilen sayfa: 1.087
- Keşfedilen video: 0

28 Ağustos 2026'da, 857 URL'deki büyük `noindex` değişikliği nedeniyle mevcut sitemap yeniden gönderildi ve işlem başarılı oldu.

Notlar:

- Sitemapin kendisi normal bir içerik sayfası değildir; URL Denetimi'nde “Google'da yok” görünmesi sitemapin başarısız olduğu anlamına gelmez.
- Sitemap yalnızca “Site Haritaları” raporundan takip edilmelidir.
- Sitemap 1.087 URL keşfetmiş olduğu için Google'ın URL'leri bulamaması ana sorun değildir; sorun yeniden tarama ve indeks durumunun güncellenmesidir.

### 4.4 Core Web Vitals ve HTTPS

GSC Core Web Vitals:

- Mobil için yeterli gerçek kullanıcı verisi yok.
- Masaüstü için yeterli gerçek kullanıcı verisi yok.
- Düşük trafik döneminde bu normaldir; hata olarak değerlendirilmemeli.

GSC HTTPS:

- HTTPS olmayan URL: 0
- HTTPS URL örneği: 3
- Kritik HTTPS sorunu: Yok

Canlı teknik kontroller:

- HTTP → HTTPS yönlendirmesi çalışıyor.
- `www` → apex alan adı yönlendirmesi 308 ile çalışıyor.
- HSTS başlığı mevcut.
- Tercih edilen canonical alan adı `https://italypath.app`.

## 5. Crawlability, robots ve canlı URL kontrolleri

### Sağlıklı bulgular

- Ana sayfa HTTP 200 döndürüyor.
- `robots.txt` erişilebilir ve sitemap referansı içeriyor.
- `sitemap.xml` erişilebilir ve doğru alan adını kullanıyor.
- Sitemap 1.087 URL içeriyor.
- Tam sitemap taramasında 1.087/1.087 URL HTTP 200.
- Tam sitemap taramasında 0 URL `noindex` içeriyor.
- İncelenen örneklerde:
  - title mevcut
  - meta description mevcut
  - canonical mevcut
  - tek H1 mevcut
  - önemli içerik sunucu HTML'inde mevcut
  - JSON-LD mevcut

### İzlenmesi gereken GSC istisnaları

- `robots.txt` tarafından engellenen 3 URL'nin örnekleri henüz alınmadı.
- 3 yönlendirme hatasının örnekleri henüz alınmadı.
- 3 “yönlendirmeli sayfa” normal olabilir; canonical hedeflerine gidip gitmediği doğrulanmalı.

Bu dokümandaki sayılar tek başına bu 9 URL hakkında kod değişikliği yapmaya yetmez. Önce GSC URL örnekleri gerekir.

## 6. Canonical, URL ve indeksleme stratejisi

### Doğrulananlar

- Ana sayfada canonical `/` olarak tanımlı.
- Dinamik üniversite ve program sayfalarında metadata/canonical üretimi mevcut.
- HTTPS ve apex alan adı tutarlı.

### Parametreli sayfalar

- `/cities?city=...` varyasyonları tek `/cities` canonical'ına gidiyor.
- `/scholarships?region=...` varyasyonları tek `/scholarships` canonical'ına gidiyor.

Bu davranış mevcut filtreleme yaklaşımı için teknik olarak tutarlıdır. Ancak sonuç olarak şehir ve bölge filtreleri ayrı SEO landing page'leri olarak indekslenemez/rank alamaz.

Karar gerektirir:

- Eğer hedef yalnızca tek şehirler ve tek burslar sayfasını sıralamaksa mevcut canonical yaklaşımı korunabilir.
- Eğer “Milano'da öğrenci yaşamı”, “Lombardiya bursları” gibi sorgular hedeflenecekse parametre yerine benzersiz içerikli, temiz URL'li landing page'ler tasarlanmalıdır.

## 7. Metadata, başlıklar ve yapılandırılmış veri

### Sağlıklı bulgular

- Global metadata `app/layout.tsx` içinde tanımlı.
- Ana sayfaya özel canonical `app/page.tsx` içinde tanımlı.
- Üniversite ve program detaylarında dinamik metadata mevcut.
- Örnek sayfalarda tek H1 görüldü.
- Site genelinde `Organization` ve `WebSite` JSON-LD mevcut.
- Üniversite/program sayfalarında `BreadcrumbList` mevcut.
- GSC canlı testinde örnek program sayfasında bir geçerli yapılandırılmış öğe algılandı.
- Lighthouse SEO skoru mobil ve masaüstünde 100; yapılandırılmış veri manuel kontrol maddesi geçerli görünüyor.

### On-page iyileştirme fırsatları

#### Program meta description dili

Dinamik program meta description'larının önemli bölümü İngilizce. Ana hedef kitle ve arayüz Türkçe olduğundan, Türkçe sorgulardaki tıklama oranı için program açıklamaları doğal Türkçe değer önerisiyle üretilmeli.

Öneri:

- Program adı ve üniversite adı korunarak Türkçe, benzersiz açıklama şablonu oluştur.
- 150–160 karakter katı bir kural değildir; ana hedef sorgu ve net fayda ilk bölümde görünmeli.
- Otomatik şablon, boş/verisiz programlarda anlamsız tekrar üretmemeli.

#### Tekrarlanan program metni

`components/university-details/ProgramAdmissionDetailsPanel.tsx` içindeki `ExpandableText`, aynı uzun metni hem özet hem genişletilmiş paragraf olarak DOM'a iki kez yazıyor.

Etkisi:

- Sayfa metni gereksiz tekrar ediyor.
- Arama snippet'i ve içerik kalite değerlendirmesi açısından gürültü oluşturabilir.
- Ekran okuyucu deneyimini de kötüleştirebilir.

Öneri:

- Metni DOM'da yalnızca bir kez tut.
- CSS line-clamp veya tek düğümün genişleme durumunu değiştir.

## 8. PageSpeed Insights bulguları

Rapor:

- URL: <https://pagespeed.web.dev/analysis/https-italypath-app/vgyut213to?form_factor=mobile>
- Rapor zamanı: 28 Ağustos 2026, 19:54 GMT+3
- Lighthouse: 13.4.1
- Mobil profil: Emulated Moto G Power, Slow 4G
- Gerçek kullanıcı/CrUX verisi: Yok

### 8.1 Özet skorlar

| Kategori | Mobil | Masaüstü |
|---|---:|---:|
| Performance | 81 | 99 |
| Accessibility | 92 | 92 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| Agentic Browsing | 2/2 | 2/2 |

### 8.2 Laboratuvar metrikleri

| Metrik | Mobil | Masaüstü | Değerlendirme |
|---|---:|---:|---|
| FCP | 0,9 sn | 0,2 sn | İyi |
| LCP | 4,2 sn | 0,9 sn | Mobil kötü; ana performans sorunu |
| TBT | 250 ms | 10 ms | Mobil iyileştirilmeli |
| CLS | 0,002 | 0,004 | Çok iyi |
| Speed Index | 3,0 sn | 0,7 sn | Mobil kabul edilebilir ama geliştirilebilir |

Bu değerler sentetik laboratuvar ölçümüdür. Sonuçlar koşudan koşuya değişebilir. Düzeltme sonrası en az üç mobil koşunun medyanı karşılaştırılmalıdır.

### 8.3 LCP kök nedeni

Raporun LCP öğesi bir görsel değil, ana sayfadaki H1:

> İtalya’da eğitim için sonraki adımın net olsun.

DOM seçicisi:

`section.relative > div.mx-auto > div.max-w-3xl > h1.mt-7`

Raporun LCP breakdown verisi:

| Alt bölüm | Süre |
|---|---:|
| Time to First Byte | 0 ms (Lighthouse breakdown görünümü) |
| Element render delay | 1.300 ms |

Kod kanıtı:

- `components/HeroSection.tsx` client component.
- H1'in üstündeki `motion.div` başlangıçta `opacity: 0` ve `translateY(22px)` alıyor.
- Görünürlük `framer-motion` çalıştıktan sonra animasyonla açılıyor.
- H1 ayrıca Spectral web fontunu kullanıyor.

**Çıkarım:** En önemli içerik ilk HTML'de mevcut olsa bile başlangıç stiliyle görünmez yapılıyor ve client-side animasyon/render sürecini bekliyor. Bu, rapordaki 1.300 ms element render delay ile doğrudan uyumlu.

Önerilen düzeltme:

- H1 ve üst metin grubunu ilk çizimde görünür bırak.
- İlk viewport dışındaki alanlarda scroll reveal animasyonu kullanılabilir.
- Hero'da animasyon korunacaksa opacity animasyonu LCP öğesine uygulanmamalı; tercihen yalnızca ikincil panel/ikonlarda kullanılmalı.
- Düzeltme sonrası LCP yeniden ölçülmeli; varsayım test edilmeden “çözüldü” kabul edilmemeli.

### 8.4 Render-blocking CSS

Rapor:

- Tahmini kazanç: 650 ms
- Toplam birinci taraf bloklayan CSS: 21,2 KiB / 940 ms
- `/_next/static/chunks/094e97d94d604552.css`: 19,4 KiB / 750 ms
- `/_next/static/chunks/0f8063c6dc32e49d.css`: 1,8 KiB / 190 ms
- Maksimum kritik yol gecikmesi: 874 ms
- İlk navigation: 559 ms / 12,22 KiB

Öneri:

- Önce H1 görünürlüğü ve JavaScript azaltımı çözülmeli.
- Sonra ana sayfaya ait kullanılmayan global CSS, font weight'leri ve kritik üst-kat CSS'i incelenmeli.
- CSS dosya boyutu tek başına aşırı büyük değil; ölçüm olmadan karmaşık kritik-CSS altyapısı eklenmemeli.

### 8.5 Kullanılmayan JavaScript

Rapor toplamı:

- Birinci taraf/uygulama grubunda transfer: 410,4 KiB
- Tahmini kullanılmayan JavaScript: 266,2 KiB

Başlıca satırlar:

| Kaynak | Transfer | Tahmini kullanılmayan |
|---|---:|---:|
| Clerk `ui-common` | 118,1 KiB | 84,4 KiB |
| Clerk `clerk.browser.js` | 85,8 KiB | 59,0 KiB |
| Clerk `vendors` | 46,8 KiB | 44,2 KiB |
| Next chunk `793f...` | 44,8 KiB | 28,0 KiB |
| Next chunk `230a...` | 69,2 KiB | 25,4 KiB |
| Next chunk `b91e...` | 45,8 KiB | 25,2 KiB |

Clerk satırlarının tahmini kullanılmayan toplamı yaklaşık 187,6 KiB.

Kod bağlamı:

- `app/layout.tsx` bütün uygulamayı `ClerkProvider` ile sarıyor.
- Herkese açık ana sayfada `Navbar`, `HeroSection`, `FeaturesSection` ve `HomeClosingCta` gibi bileşenler yalnızca CTA hedefi/oturum durumu için `useAuth` veya Clerk bileşenlerini kullanıyor.
- `components/HomePageClient.tsx` tüm ana sayfa ağacını client boundary içine alıyor.
- `components/RouteTransition.tsx` tüm sayfa ağacında Framer Motion kullanıyor.

**Çıkarım:** Herkese açık ve SEO odaklı ilk ziyarette kimlik doğrulama UI'ı ile geniş client component ağacı gereğinden fazla JavaScript yüklüyor.

Önerilen mimari yön:

1. Herkese açık layout ile authenticated uygulama layout'unu ayırmayı değerlendir.
2. Public sayfalarda Clerk'i yalnız gerektiğinde/lazy yükle veya sunucu tarafında hafif auth kararı kullan.
3. Ana sayfayı varsayılan olarak server component bölümlerine ayır; sadece tab, dil düğmesi ve kullanıcı menüsü gibi etkileşimli küçük adaları client yap.
4. Global route transition'ın ilk sayfa çizimindeki maliyetini ölç; SEO sayfalarında animasyon gerekmiyorsa kapsamını daralt.

Bu değişiklikler auth davranışını etkileyebileceği için tek seferde körlemesine yapılmamalı; oturum açma/çıkış ve protected route testleri gerekir.

### 8.6 Uzun main-thread görevleri

Rapor 8 uzun görev buldu. Görünen başlıca katkılar:

- Clerk `clerk.browser.js`: 158 ms
- Next chunk `82ab...`: 117 ms
- Next chunk `793f...`: 108 ms
- Ana doküman: 89 ms
- Clerk framework chunk: 82 ms
- Clerk `ui-common`: 57 ms

Bu bulgu, Clerk/public JavaScript ayrımını yüksek öncelik yapar. Mobil TBT 250 ms'dir; hedef 200 ms altıdır.

### 8.7 Legacy JavaScript

- Tahmini tasarruf: 13,7–14 KiB.
- Kaynak: `/_next/static/chunks/230a3a8ef9c4d5a7.js`.
- Örnek polyfill'ler: `Array.prototype.at`, `flat`, `flatMap`, `Object.fromEntries`, `Object.hasOwn`.

Bu düşük önceliklidir. Framework/build hedefi incelenebilir; yalnızca 14 KiB için riskli özel transpilation değişikliği yapılmamalı.

### 8.8 Görsel teslimi

Raporun tek belirgin görsel fırsatı:

- Görsel: `public/images/home/bologna-rooftops.jpg`
- Sunulan kaynak: Next Image `w=750&q=75`
- Transfer: 76,1 KiB
- Tahmini tasarruf: 43,6 KiB
- Rapor önerisi: Daha yüksek sıkıştırma.

Bu görsel LCP öğesi değildir ve `loading="lazy"` kullanıyor. Bu nedenle H1/JavaScript düzeltmelerinden sonra ele alınmalı.

### 8.9 DOM boyutu

- Toplam element: 348
- En derin DOM: 15
- Bir ebeveyn altındaki en fazla çocuk: 12

Bu değerler ana performans problemi değildir. DOM küçültme düşük önceliklidir.

## 9. Erişilebilirlik bulguları

Lighthouse Accessibility: 92.

### 9.1 Kullanıcı yakınlaştırması engelleniyor

Kod:

- `app/layout.tsx` viewport ayarları:
  - `maximumScale: 1`
  - `userScalable: false`
- `components/MobileZoomLock.tsx`:
  - pinch gesture'ları engelliyor
  - double-tap zoom'u engelliyor
  - bazı edge swipe hareketlerini engelliyor

Lighthouse bulgusu:

`user-scalable="no"` kullanılıyor veya `maximum-scale` 5'ten küçük.

Etki:

- Görme zorluğu yaşayan kullanıcılar yakınlaştıramaz.
- Accessibility skorunu düşürür.
- Mobil kullanılabilirlik açısından gereksiz risk oluşturur.

Öneri:

- `maximumScale` ve `userScalable: false` ayarlarını kaldır.
- `MobileZoomLock` bileşenini kaldır veya yalnızca gerçekten problemli, erişilebilirliği bozmayan belirli gesture davranışına indir.
- iOS/Safari navigasyon hareketi sorunu varsa pinch zoom'u kapatmadan çöz.

### 9.2 Yetersiz renk kontrastı

Temel renk:

- `--editorial-terracotta: #b75b38`
- Zemin: `--editorial-paper: #f8f7f1`
- Hesaplanan kontrast: yaklaşık 4,28:1
- Küçük normal metin için gereken WCAG AA seviyesi: 4,5:1

Raporun işaretlediği örnekler:

- “TEK, ANLAŞILIR AKIŞ” eyebrow metni.
- Feature kartlarındaki “64 üniversite · 1.017 program”.
- “AI · Gönüllü ekip · Uzman”.
- “Başvuru evrakları”.

Kod konumu:

- Renk tokenı: `app/globals.css`
- Örnek kullanım: `components/FeaturesSection.tsx`

Öneri:

- Küçük metinde daha koyu bir terracotta token kullan.
- Örnek `#9f4629`, aynı zemin üzerinde yaklaşık 5,78:1 kontrast verir.
- Görsel tasarım kararı sonrası tüm zemin kombinasyonları tekrar Lighthouse/axe ile test edilmeli.

## 10. Sunucu üretimi, caching ve fontlar

### Ana sayfa caching

- `app/page.tsx` `force-dynamic`.
- Ana sayfa istatistikleri Supabase/üniversite verisinden sunucuda hesaplanıyor.
- Canlı ana sayfa yanıtında `private/no-store` davranışı gözlendi.
- PageSpeed kritik zincirinde ilk navigation 559 ms ölçüldü.

**Çıkarım:** Ana sayfanın her istekte dinamik olması CDN/edge cache avantajını azaltabilir. Üniversite ve program sayıları saniyelik güncellik gerektirmiyorsa ISR/revalidate veya önceden hesaplanmış istatistik kullanılabilir.

Öneri:

- Auth kişiselleştirmesini HTML'in tamamını dinamik yapmak yerine küçük client adasına taşı.
- Ana sayfa veri tazeliği gereksinimini belirle.
- Uygunsa `force-dynamic` kaldırılıp kontrollü `revalidate` kullanılmalı.
- Değişiklik öncesi ve sonrası TTFB/LCP ölçülmeli.

### Fontlar

- `app/layout.tsx` içinde Spectral için 400, 500, 600, 700 ağırlıkları yükleniyor.
- Hanken Grotesk variable font kullanılıyor.
- LCP H1 Spectral kullanıyor.

Rapor font dosyasını doğrudan ana hata olarak listelemedi. Yine de kullanılmayan Spectral ağırlıkları ve preload sayısı bundle/network analiziyle kontrol edilebilir. H1'in görünmez başlangıç animasyonu çözülmeden font optimizasyonu ana çözüm kabul edilmemeli.

## 11. Ölçüm ve analitik boşlukları

- GSC organik performans verisi var ancak hacim çok düşük.
- GSC Core Web Vitals için yeterli CrUX saha verisi yok.
- Repository incelemesinde Vercel Analytics mevcut.
- GA4 kurulumu tespit edilmedi.

SEO etkisini ölçmek için minimum takip:

- GSC: tıklama, gösterim, CTR, sorgu, sayfa, ülke ve cihaz.
- Vercel Analytics: trafik ve temel davranış.
- İstenirse GA4: organik landing page, kayıt başlangıcı, kayıt tamamlanması, üniversite/program CTA tıklamaları.

GA4 olmaması indekslenmeyi bozmaz; yalnızca SEO'nun iş sonucuna etkisini ölçmeyi zorlaştırır.

## 12. Önceliklendirilmiş aksiyon planı

### P0 — Google indeksleme takibi

1. GSC “Sayfa sayısı” raporunda 857 `noindex` doğrulamasını haftalık kontrol et.
2. Sitemapin son okuma tarihinin yenilenmesini izle.
3. 857 URL için tek tek “Dizine eklenmesini iste” gönderme.
4. Doğrulama başarısız olursa örnek URL listesini dışa aktar ve canlı HTML/header kontrolü yap.
5. `robots.txt` engelli 3 ve redirect error 3 URL'nin örneklerini ayrıca al.

Başarı ölçütü:

- `noindex` hariç tutulan URL sayısının düşmesi.
- Dizine eklenen URL sayısının 21'den düzenli biçimde yükselmesi.
- GSC doğrulamasının “Başarılı” olması.

### P1 — Mobil LCP ve erişilebilirlik hızlı düzeltmeleri

1. Hero H1'in parent `motion.div` başlangıç opacity'sini kaldır.
2. H1'i hydration/Framer Motion beklemeden görünür yap.
3. `maximumScale: 1` ve `userScalable: false` ayarlarını kaldır.
4. `MobileZoomLock` pinch/double-tap engellerini kaldır.
5. Terracotta küçük metin rengini AA uyumlu koyu tona çek.

Başarı ölçütü:

- Mobil LCP < 2,5 sn.
- Accessibility 100 veya viewport/contrast bulgularının sıfırlanması.
- CLS < 0,1 korunmalı.

### P2 — JavaScript ve public/auth mimarisi

1. Public ve authenticated layout ayrımını tasarla.
2. Ana sayfada Clerk bağımlı CTA'ları küçük bir client adasına indir.
3. `HomePageClient` altındaki statik bölümleri server component yap.
4. Global `RouteTransition` maliyetini ve ilk çizim etkisini ölç.
5. Auth, dil seçimi ve protected route regresyon testleri ekle.

Başarı ölçütü:

- Unused JS tahmini 266 KiB'den belirgin biçimde düşmeli.
- Mobil TBT < 200 ms.
- Oturum açma/çıkış ve korumalı sayfa davranışı değişmemeli.

### P3 — Caching, CSS ve görseller

1. Ana sayfa `force-dynamic` gereksinimini kaldır veya ISR uygula.
2. Kullanılmayan Spectral weight'lerini azalt.
3. Global CSS ve route-level CSS kapsamını analiz et.
4. Bologna görselini daha yüksek sıkıştırma/uygun formatla yeniden ölç.

### P4 — On-page ve içerik geliştirmeleri

1. Program meta description'larını Türkçeleştir ve benzersizleştir.
2. `ExpandableText` çift DOM metnini tek düğüme indir.
3. Şehir/bölge landing page stratejisine karar ver.
4. Marka dışı sorgular için içerik kümeleri ve iç linkleme planı hazırla.
5. Program/üniversite sayfalarında güncellik, kaynak ve güven sinyallerini güçlendir.

## 13. Düzeltme sonrası doğrulama protokolü

Her performans deploy'undan sonra:

1. Canlı production ana sayfada üç ayrı mobil PageSpeed koşusu yap.
2. Tek en iyi skoru değil medyan LCP/TBT değerini kaydet.
3. Masaüstü skorunun gerilemediğini doğrula.
4. Lighthouse Accessibility viewport ve contrast bulgularını kontrol et.
5. Ana sayfa source/rendered DOM'da title, description, canonical, H1 ve JSON-LD'nin kaldığını doğrula.
6. Auth giriş/çıkış, dil değiştirme ve CTA hedeflerini test et.
7. GSC değişiklikleri için birkaç gün/hafta bekle; Lighthouse sonucu ile GSC indeks durumunu birbirine karıştırma.

Hedefler:

- LCP < 2,5 sn
- TBT < 200 ms (laboratuvar için)
- CLS < 0,1
- Accessibility viewport/contrast hatası yok
- SEO skoru 100 korunuyor
- Sitemap URL'leri 200 ve indexable kalıyor

## 14. Bilinen yanlış yorumlamalar

- **“Lighthouse SEO 100, o halde tüm SEO tamam.”** Yanlış. Lighthouse yalnız temel sayfa kontrollerini yapar; GSC indeksleme, içerik kalitesi, otorite ve sorgu talebi ayrı konulardır.
- **“Sitemap URL'si Google'da indeksli değil, sitemap bozuk.”** Yanlış. Sitemap içerik sayfası olarak indekslenmek zorunda değildir.
- **“866 sayfa indekslenmiyor, canlı sitede hâlâ noindex var.”** 28 Ağustos taramasına göre yanlış. 1.087 canlı URL'nin hiçbirinde `noindex` yoktu; GSC eski taramaları gösteriyordu.
- **“857 URL'ye tek tek indeks isteği atalım.”** Önerilmez. Sitemap ve doğrulama süreci kullanılmalı; birkaç temsilci URL ile canlı test yeterlidir.
- **“PageSpeed 81 kesin saha performansıdır.”** Yanlış. Raporda CrUX verisi yok; 81 laboratuvar skorudur.
- **“Bologna görseli LCP sorunu.”** Yanlış. Raporun LCP öğesi H1 başlığıdır.

## 15. Gelecek ajan için başlangıç kontrol listesi

Bir sonraki AI ajanı işe başlamadan önce:

- [ ] Bu dosyanın tarihini kontrol et.
- [ ] `AGENT_CONTEXT.md` dosyasını oku.
- [ ] `git status --short` çalıştır; kullanıcıya/diğer ajanlara ait değişiklikleri koru.
- [ ] GSC'nin güncel ekranını iste veya kullanıcıyla birlikte aç.
- [ ] `noindex` doğrulamasının yeni durumunu kaydet.
- [ ] Sitemap URL sayısını ve son okuma tarihini karşılaştır.
- [ ] Canlı `robots.txt` ve sitemap'i tekrar doğrula.
- [ ] Düzeltme isteniyorsa önce P1 maddelerini küçük, geri alınabilir değişiklikler halinde uygula.
- [ ] Her düzeltmeyi production PageSpeed ve erişilebilirlik testiyle doğrula.
- [ ] Kullanıcı açıkça istemeden GSC, deploy veya production üzerinde değişiklik yapma.

## 16. İlgili dosyalar

- `AGENT_CONTEXT.md`
- `app/layout.tsx`
- `app/page.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `app/globals.css`
- `components/HomePageClient.tsx`
- `components/HeroSection.tsx`
- `components/RouteTransition.tsx`
- `components/MobileZoomLock.tsx`
- `components/Navbar.tsx`
- `components/FeaturesSection.tsx`
- `components/HomeClosingCta.tsx`
- `components/university-details/ProgramAdmissionDetailsPanel.tsx`

## 17. Audit sonunda yapılan dış işlemler

- GSC'de bir temsilci program URL'si canlı test edildi.
- Bu temsilci URL için indeksleme isteği gönderildi.
- Mevcut sitemap yeniden gönderildi.
- Başka URL'lere toplu manuel indeks isteği gönderilmedi.
- Repository kodunda SEO/performance düzeltmesi yapılmadı.

