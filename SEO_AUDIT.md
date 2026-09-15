# ItalyPath SEO Audit ve Devir Notu

> Son belge güncellemesi: 15 Eylül 2026  
> Bulguların ana doğrulama tarihi: 28 Ağustos 2026  
> İncelenen site: `https://italypath.app`  
> Kapsam: Google Search Console, canlı teknik kontroller, sitemap/robots, indekslenebilirlik, temel on-page SEO, yapılandırılmış veri ve PageSpeed Insights  
> Durum: Bu çalışma bir denetim olarak başladı (28 Ağustos). 15 Eylül 2026'da §19'daki kontrast düzeltmesi ve guard uygulandı; §8.3'teki LCP kök neden çıkarımı aynı gün canlı ölçümle **çürütüldü** (bkz. §19.3). Bölüm 8.3 ve 12/P1 tarihsel kayıt olarak korunur; güncel öncelik listesi §19.6'dadır.

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

> **Düzeltme (15 Eylül 2026):** Bu çıkarım yanlış çıktı. Canlı HTML'de H1'in sarmalayıcısı `style="opacity:1;transform:translateY(0px)"` ile gelir; `components/RouteTransition.tsx` içindeki `<AnimatePresence initial={false}>` ilk render'da alt ağaçtaki tüm framer-motion `initial` durumlarını devre dışı bırakır, yani hero animasyonu ilk yüklemede hiç çalışmaz. Gerçek ağ kısıtlamalı (devtools throttling) ölçümlerde FCP ile LCP her koşuda aynıdır: başlık gizlenmiyor, sayfanın ilk çizimi bütünüyle geç oluyor. Simüle Lighthouse'un “element render delay” değeri, Lantern modelinin gözlenen izde LCP'den önce biten JavaScript dosyalarını LCP bağımlılığı saymasından kaynaklanan bir yapaylıktır. Hero animasyonu kaldırma denemesi ölçümde etkisiz çıktığı için geri alındı. Ayrıntı ve gerçek kök nedenler: §19.3.

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

> Durum 15 Eylül 2026 (ayrıntı §19): 1-2 çürütüldü ve iptal; 3-4 ürün kararıyla korunuyor; 5 uygulandı.

1. ~~Hero H1'in parent `motion.div` başlangıç opacity'sini kaldır.~~ Gereksiz: ilk yüklemede H1 zaten görünür (§8.3 düzeltme notu).
2. ~~H1'i hydration/Framer Motion beklemeden görünür yap.~~ Zaten öyle; asıl neden §19.3.
3. ~~`maximumScale: 1` ve `userScalable: false` ayarlarını kaldır.~~ **Ürün kararı: korunuyor.** Sıralama sinyali değildir; Lighthouse'ta yalnız Erişilebilirlik kategorisini etkiler (`meta-viewport`). Yeniden önerme.
4. ~~`MobileZoomLock` pinch/double-tap engellerini kaldır.~~ Aynı ürün kararı; iOS Safari viewport yasağını yok saydığı için kilit hissini asıl bu bileşen verir, ikisi birlikte kalır.
5. Terracotta küçük metin rengini AA uyumlu koyu tona çek. **Uygulandı:** `--editorial-terracotta-ink: #9f4629` yalnız metin/ikon için; buton/arka plan/çerçeve base tokenda.

Başarı ölçütü:

- Mobil LCP < 2,5 sn (bu hedef artık §19.6'daki sunucu gecikmesi ve font/CSS yarışı işleriyle kovalanır).
- Kontrast bulgusu: terracotta metin için sıfırlandı (§19.5); `meta-viewport` bulgusu kabul edilen bulgudur.
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
- [ ] `npm run check:seo-vitals` çalıştır (RouteTransition `initial={false}` + terracotta ink token guard'ı).
- [ ] Simüle Lighthouse'un “render delay” değerini tek başına kanıt sayma; LCP iddialarını devtools throttling ve sunucu HTML'i ile doğrula (§19.2).
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
- `components/home/HomeToolsSection.tsx` (eski `FeaturesSection.tsx` 15 Eylül'de kaldırıldı)
- `components/ui/Reveal.tsx`
- `scripts/check-seo-vitals.mjs`
- `lib/universities.server.ts` (3 saatlik in-memory memo; soğuk instance gecikmesi §19.3)
- `components/HomeClosingCta.tsx`
- `components/university-details/ProgramAdmissionDetailsPanel.tsx`

## 17. Audit sonunda yapılan dış işlemler

- GSC'de bir temsilci program URL'si canlı test edildi.
- Bu temsilci URL için indeksleme isteği gönderildi.
- Mevcut sitemap yeniden gönderildi.
- Başka URL'lere toplu manuel indeks isteği gönderilmedi.
- Repository kodunda SEO/performance düzeltmesi yapılmadı.

## 18. İzleme kaydı — 6 Eylül 2026

Bu kontrol production'ın yalnızca test amaçlı yayında olduğu, henüz PR/reklam yapılmadığı ve Instagram lansmanının yaklaşık bir ay sonra planlandığı bağlamında değerlendirilmelidir. Bu nedenle düşük hacimli sorgu ve tıklama verilerinden büyüme kararı çıkarılmamalıdır.

### GSC indeksleme değişimi

| Metrik | 28 Ağustos baz değeri | 6 Eylül ekranı | Değişim |
|---|---:|---:|---:|
| Dizine eklenen | 21 | 22 | +1 |
| Dizine eklenmeyen | 866 | 864 | -2 |
| `noindex` nedeniyle hariç | 857 | 854 | -3 |
| Tarandı, şu anda dizine eklenmiş değil | 0 | 1 | +1 |

- `noindex` doğrulaması hâlâ “Başladı” durumunda; başarısız değil.
- Raporun son güncellemesi 28 Ağustos 2026 idi.
- Görünen örnek URL'lerin son tarama tarihleri 13–19 Temmuz 2026; toplu yeniden tarama henüz gerçekleşmemiş görünüyor.
- İkinci temsilci program URL'si 6 Eylül'de canlı URL testiyle kontrol edildi: `https://italypath.app/universities/10/departments/management-of-innovation-and-entrepreneurship-mie`.
- Sonuç: URL Google tarafından kullanılabilir, sayfa dizine eklenebilir ve bir geçerli yapılandırılmış veri öğesi algılandı.

### Sitemap

- GSC gönderim tarihi: 28 Ağustos 2026.
- GSC son okuma tarihi: 5 Eylül 2026.
- Durum: Başarılı.
- GSC'nin son okumada keşfettiği URL: 1.069.
- 6 Eylül'de canlı sitemap sayımı: 1.078 URL.
- Önceki canlı sayım 1.087 idi; veri/program ekleme-silme hareketleri nedeniyle sitemap dinamik olarak değişiyor.
- Google dosyayı bir gün önce başarıyla okuduğu için yeniden gönderim yapılmamalı.

### Clerk subdomain uyarısı

GSC'deki “Sayfa içerik olmadan dizine eklendi” tek URL'si `https://clerk.italypath.app/` idi.

Canlı doğrulama:

- HTTP 200 ve boş JSON yanıtı.
- `X-Robots-Tag: noindex, nofollow` mevcut.
- Son GSC taraması 5 Ağustos 2026.
- URL ana içerik sitemapinin parçası değil; Clerk kimlik doğrulama altyapısıdır.

Sonuç: Ana sitenin SEO problemi değildir. İndeksleme isteği veya sitemap işlemi yapılmamalı; Google yeniden taradığında dizinden düşmesi beklenir.

### Arama performansı

Son 7 gün / önceki 7 gün karşılaştırması:

| Metrik | Son 7 gün | Önceki 7 gün | Yorum |
|---|---:|---:|---|
| Tıklama | 1 | 1 | Değişmedi |
| Gösterim | 152 | 59 | +93, yaklaşık %158 artış |
| CTR | %0,7 | %1,7 | Gösterim büyürken tıklama aynı kaldığı için düştü |
| Ortalama konum | 10,1 | 8,5 | Yeni/daha düşük sıralı gösterimler ortalamayı seyreltebilir |

Bu veri istatistiksel karar için yetersizdir. Henüz pazarlama/lansman yapılmadığı için haftalık sorgu ve sayfa tablosu analizi ertelendi.

### Bir sonraki anlamlı kontrol zamanı

1. Instagram lansmanından yaklaşık bir hafta önce teknik SEO preflight yap.
2. Lansman günü ölçüm başlangıç tarihini kaydet.
3. Lansmandan 7 ve 28 gün sonra GSC performansını karşılaştır.
4. Lansman öncesinde yalnız kritik regresyonları izle: sitemap başarısı, canlı URL indekslenebilirliği, robots/noindex, mobil PageSpeed ve analytics event'leri.

## 19. İzleme ve düzeltme kaydı — 15 Eylül 2026

Bağlam: Ana sayfa aynı gün yeniden yapılandırıldı (ücretsiz ön görüşme hunisi, `HomeToolsSection`, stok fotoğraflar, yeni `/on-gorusme` sayfası; commit'ler `b23022a`…`bde55c0`). `FeaturesSection` kaldırıldığı için §9.2'deki örnekler tarihsel; renk tokenı ve sorun aynıydı. Mobil zoom kilidi bu tarihte ürün kararı olarak korundu.

### 19.1 Canlı kontroller

| Kontrol | Sonuç |
|---|---|
| `robots.txt` | Çalışıyor; `/on-gorusme` ve `/yasal/*` `Allow: /` ile taranabilir |
| `sitemap.xml` | 1.079 URL (7 statik + 1.072 üniversite/program); `/on-gorusme` eklendi |
| `/` | 200, title/description/canonical/tek H1/2 JSON-LD, noindex yok; `cache-control: private, no-store` (P3 değişmedi) |
| `/on-gorusme` | 200, title/description/canonical/tek H1; form ve SSS sunucu HTML'inde |
| `/yasal/gizlilik` | 200, canonical ve H1 var; yasal sayfalar sitemap'te değil (bilinçli/düşük öncelik, karar açık) |
| GSC | Bu kontrolde görüntülenmedi; `noindex` doğrulama durumu 6 Eylül'deki 854 bekliyor değerinde bilinir |

`BAILOUT_TO_CLIENT_SIDE_RENDERING` notu: `/on-gorusme` ve `/yasal/*` gibi statik prerender edilen sayfaların HTML'inde bu iz vardır; kaynağı `app/layout.tsx` içindeki `<Analytics />` (Vercel Analytics, Suspense sınırı) olup footer'dan sonra gelir. Görünür içerik tamamen sunucu HTML'indedir; iz zararsızdır ve tek başına FAIL kriteri değildir. Ölçüt: kritik içerik (title, H1, metin, linkler) sunucu HTML'inde mi.

### 19.2 Ölçüm araçları ve tuzaklar

- PageSpeed Insights API anonim kotası 429 verdi; pagespeed.web.dev arayüzü tarayıcıda tamamlanmadı. Yerel Lighthouse 12.8.2 (`npx --yes lighthouse@12 … --chrome-flags="--headless=new"`) kullanıldı.
- **Simüle throttling (PSI/Lighthouse varsayılanı)** metin LCP'sinde “render delay”i JavaScript'e bağlayabilir; yerel hızlı sunucuda bu yapaylık büyür (bkz. §8.3 düzeltme notu). Kök neden analizinde **`--throttling-method=devtools`** kullan: gerçek zaman çizelgesi verir.
- Yerel üretim derlemesinde iki yapaylık görüldü: Clerk `/v1/client/handshake` yönlendirme zinciri (~1,8 sn, yalnız localhost) ve `next/image` optimizasyon önbelleğinin soğuk olması (program sayfasında 71 sn'lik sahte LCP). Yerel sonuçları production ile birebir karşılaştırma; farkı (before/after) karşılaştır.
- Production, aynı koda karşı simüle mobil (15 Eylül, tek koşu): Performans 90, Erişilebilirlik 92, SEO 100, FCP 1,0 sn, LCP 3,7 sn, TBT 30 ms, CLS 0,002, Speed Index 1,8 sn; kullanılmayan JS 265 KiB (Clerk ~188 KiB); erişilebilirlik bulguları `color-contrast` (14), `meta-viewport`, `label-content-name-mismatch`.

### 19.3 LCP kök nedeni (devtools throttling, mobil, Slow 4G)

| Koşu | FCP | LCP | Doküman gövdesi bitişi | Render-blocking CSS bitişi | Not |
|---|---:|---:|---:|---:|---|
| Production #1 | 8,3 sn | 8,3 sn | 5,5 sn | 8,2 sn | Başlıklar 0,5 sn'de geldi, gövde 5 sn sunucuda bekledi; tüm alt kaynaklar 5,4 sn'de keşfedildi |
| Production #2 | 3,7 sn | 3,7 sn | 0,8 sn | 3,6 sn | Gövde hızlı; 20 KiB CSS, 10 font dosyası (164 KiB, High öncelik) ve JS ile bant genişliği yarıştı |
| Yerel yeni derleme #1/#2 | 4,0 / 4,2 sn | 4,0 / 4,2 sn | 2,5 sn | 3,9 sn | Clerk handshake yönlendirmesi dahil; aynı CSS/font yarışı |

Diğer production sayfaları (aynı yöntem, aynı gün):

| Sayfa | FCP | LCP | LCP öğesi | Doküman gövdesi bitişi | CSS bitişi |
|---|---:|---:|---|---:|---:|
| Program detay #1 (soğuk) | 6,1 sn | 8,2 sn | Portre görseli (`/_next/image`, Pexels, 58 KiB) | 3,7 sn | 6,1 sn |
| Program detay #2 (sıcak) | 3,6 sn | 4,6 sn | Aynı görsel (yükleme süresi 3,9 sn) | 0,9 sn | 3,6 sn |
| `/universities` | 3,7 sn | 3,7 sn | H1 | 0,8 sn | 3,6 sn |
| `/cities` | 3,7 sn | 3,7 sn | H1 | 0,8 sn | 3,6 sn |

`/cities` üniversite verisi çekmediği hâlde aynı 3,7 sn'yi vermesi, sıcak durumdaki darboğazın sayfaya değil site geneli CSS/font/JS yarışına ait olduğunu gösterir. Program sayfalarında LCP öğesi görseldir; soğuk gövde gecikmesi orada da (3,7 sn) görülür ve üstüne görsel yükleme eklenir.

Sonuçlar:

1. Her koşuda **FCP = LCP** ve LCP öğesi H1: başlık gizlenmiyor, ilk çizimin kendisi geç. Hero animasyonu ve `RouteTransition` sunucu HTML'inde `opacity:1` üretir.
2. **Soğuk sunucu gecikmesi (production #1):** `app/page.tsx` `force-dynamic` ve `getUniversitiesData()` bekler; `lib/universities.server.ts` memo'su instance başına in-memory'dir. Vercel serverless instance'ları düşük trafikte sık yenilendiği için ilk ziyaretlerin önemli kısmı soğuk memo'ya düşer ve HTML gövdesi ~5 sn bekler. Aynı fonksiyon `/universities`, üniversite ve program detay sayfalarında da çağrılır; 1.072 program sayfası için en büyük CWV riski budur (program sayfasında doğrulandı: soğuk koşuda gövde 3,7 sn, sıcakta 0,9 sn).
3. **Sıcak sunucuda font/CSS yarışı (production #2):** `next/font` 10 dosyayı (Spectral 400/500/600/700 × latin+latin-ext = 8, Hanken Grotesk 2) High öncelikle preload eder; bunlar render-blocking CSS ile aynı anda indiği için CSS 2,8 sn sürer ve ilk çizim onu bekler. Türkçe karakterler için latin-ext gereklidir; kazanç Spectral ağırlıklarını azaltmakta ve ilk ekranda kullanılmayan ağırlıkların preload'unu kapatmaktadır.
4. Simüle modeldeki 3-4 sn'lik “render delay” değerleri (tüm sayfalarda) bu iki gerçek nedenin modeldeki yansımasıdır; animasyon kaynaklı değildir.

### 19.4 Uygulanan değişiklikler

1. `app/globals.css`: `--editorial-terracotta-ink: #9f4629` eklendi (paper zemininde 5,78:1; en koyu kart zemini `#f2e8e0` üzerinde 5,14:1). Base `--editorial-terracotta: #b75b38` buton/arka plan/çerçeve için değişmedi.
2. `text-[var(--editorial-terracotta)]` → `text-[var(--editorial-terracotta-ink)]`: 73 takipli dosyada 170 kullanım (app/components/lib). Untracked prototip dosyalarına dokunulmadı.
3. `scripts/check-seo-vitals.mjs` + `npm run check:seo-vitals`: RouteTransition `initial={false}` korunuyor mu, ink tokenı yerinde mi, base token metinde kullanılıyor mu.
4. Hero H1 giriş animasyonunu kaldırma denemesi yapıldı, ölçümde etkisiz çıktı ve geri alındı (kod değişmedi).
5. Zoom kilidi ürün kararı olarak kaydedildi; P1'den çıkarıldı.

### 19.5 Sonuç (yerel üretim derlemesi, simüle mobil, kontrast bulguları)

| Sayfa | Erişilebilirlik önce → sonra | Kontrast bulgusu önce → sonra |
|---|---:|---:|
| `/` | 92 → 92 | 14 → 3 (kalan: dekoratif gri `01/02/03`, #d8ded9, 1,3:1) |
| `/universities` | 83 → 87 | 41 → 0 |
| Program detay (örnek) | 86 → 90 | 8 → 0 |
| `/cities` | 86 → 90 | 5 → 0 |
| `/scholarships` | 89 → 94 | 1 → 0 |
| `/isee` | 84 → 89 | 1 → 0 |
| `/on-gorusme` | 89 → 93 | 1 → 0 |

Performans/SEO skorları ve LCP değişmedi (beklenen; renk değişikliği performansı etkilemez). Kapsam dışı bırakılanlar: dekoratif `01/02/03` süs rakamları (WCAG'da “pure decoration” istisnası; karar açık), `label-content-name-mismatch` (5 link: `aria-label` görünen metni içermeli; küçük iş), `meta-viewport` (ürün kararı).

### 19.6 Güncel öncelik listesi (P1'in yerine geçer)

1. **Sunucu gövde gecikmesi:** Ana sayfa ve `/universities` için `force-dynamic` yerine kontrollü `revalidate`/ISR veya kalıcı (instance'lar arası) veri önbelleği; ana sayfa istatistikleri için tam 4,5 MB compose yerine hafif sayım sorgusu. Detay sayfalarında `getUniversityById` tüm okulları compose etmek yerine hedefli sorgu + önbellek. Ölçüt: devtools koşusunda doküman gövdesi bitişi soğukta da < 1,5 sn. Program sayfalarında ayrıca LCP portre görselinin `priority`/`sizes`/ağırlığı gözden geçirilmeli (sıcakta bile görsel yüklemesi 3,9 sn).
2. **Font diyeti:** Spectral ağırlıklarını ilk ekranda kullanılanlarla sınırla (aday: 400 + 600), diğerlerinde `preload: false`; latin-ext kalır. Ölçüt: ilk çizimden önce indirilen font dosyası 10 → ≤ 6, CSS bitişi belirgin erken.
3. **JS diyeti (eski P2):** Clerk'in herkese açık sayfalarda yüklenmesi (~188 KiB kullanılmayan) ve geniş client ağacı; auth regresyon testleriyle birlikte.
4. **On-page (eski P4):** Program meta description Türkçeleştirme, `ExpandableText` çift metin, şehir/bölge landing kararı.
5. **Küçük erişilebilirlik:** `label-content-name-mismatch` linkleri; dekoratif rakam kararı.

### 19.7 Bir sonraki ölçüm protokolü eki

- Kök neden/etki ölçümünde `--throttling-method=devtools` ile FCP, LCP, doküman gövdesi bitişi ve render-blocking CSS bitişini birlikte raporla; soğuk/sıcak ayrımı için aynı URL'yi arka arkaya iki kez koş.
- Deploy sonrası production'da 3 koşu; PSI çalışmıyorsa yerel Lighthouse ile “yerel lab” etiketiyle kaydet.
- Program detay sayfalarında soğuk gecikme aynı gün doğrulandı (yukarıdaki tablo); bir sonraki adım LCP görseli için `priority`/`sizes`/boyut incelemesi ve gövde gecikmesi çözümü.

### 19.8 Dış işlemler

- GSC'de işlem yapılmadı; sitemap yeniden gönderilmedi.
- Kod değişiklikleri yerel commit olarak hazırlandı; production'a push kullanıcı onayıyla yapılır.
