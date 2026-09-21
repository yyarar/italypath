# ItalyPath SEO Audit ve Devir Notu

> Son belge güncellemesi: 21 Eylül 2026  
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
- **“Üniversite/program sayfaları taranmadı çünkü Supabase kotası aşıldı ve veritabanı dondu.”** Yanlış (21 Eylül 2026 değerlendirmesi, §24.4). Google'ın tek büyük taraması 28 Haziran'da, ilk aşımdan (2 Temmuz) önceydi; 90 günlük tarama istatistiklerinde sunucu hatası yok; taranmayan 225 sayfada "son tarama: yok" (hiç istenmedi); Supabase kısıtlaması hiçbir zaman uygulanmadı.

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

1. **Sunucu gövde gecikmesi:** ✅ Uygulandı (§20; deploy Kerem onayıyla). Hafif dizin + hedefli okul sorgusu + 3 saatlik ISR. Ölçüt: devtools koşusunda doküman gövdesi bitişi soğukta da < 1,5 sn. Program sayfalarında ayrıca LCP portre görselinin `priority`/`sizes`/ağırlığı gözden geçirilmeli (sıcakta bile görsel yüklemesi 3,9 sn).
2. **Font diyeti:** Spectral ağırlıklarını ilk ekranda kullanılanlarla sınırla (aday: 400 + 600), diğerlerinde `preload: false`; latin-ext kalır. Ölçüt: ilk çizimden önce indirilen font dosyası 10 → ≤ 6, CSS bitişi belirgin erken.
3. **JS diyeti (eski P2):** Clerk'in herkese açık sayfalarda yüklenmesi (~188 KiB kullanılmayan) ve geniş client ağacı; auth regresyon testleriyle birlikte.
4. **On-page (eski P4):** Program meta description Türkçeleştirme, `ExpandableText` çift metin, şehir/bölge landing kararı.
5. **Küçük erişilebilirlik:** `label-content-name-mismatch` linkleri; dekoratif rakam kararı.

### 19.7 Bir sonraki ölçüm protokolü eki

- Kök neden/etki ölçümünde `--throttling-method=devtools` ile FCP, LCP, doküman gövdesi bitişi ve render-blocking CSS bitişini birlikte raporla; soğuk/sıcak ayrımı için aynı URL'yi arka arkaya iki kez koş.
- Deploy sonrası production'da 3 koşu; PSI çalışmıyorsa yerel Lighthouse ile “yerel lab” etiketiyle kaydet.
- Program detay sayfalarında soğuk gecikme aynı gün doğrulandı (yukarıdaki tablo); bir sonraki adım LCP görseli için `priority`/`sizes`/boyut incelemesi ve gövde gecikmesi çözümü.

### 19.8 Dış işlemler ve deploy sonrası doğrulama

- GSC'de işlem yapılmadı; sitemap yeniden gönderilmedi.
- Kullanıcı onayıyla `bad8ae3` 15 Eylül 2026 akşamı `main`'e push edildi; Vercel deploy'u yaklaşık 3 dakikada canlıya düştü (production CSS'inde `--editorial-terracotta-ink` görüldü).
- Canlı sağlık kontrolü: `/`, `/universities`, örnek program sayfası ve `/on-gorusme` 200, tek H1, `noindex` yok, yeni renk sınıfları HTML'de; sitemap 1.079 URL.
- Deploy sonrası production, simüle mobil, 3 koşu (ana sayfa): erişilebilirlik 92/92/92; kontrast bulgusu 14 → **3** (yalnız dekoratif `01/02/03`); kalan erişilebilirlik bulguları `meta-viewport` (ürün kararı), `label-content-name-mismatch`, dekoratif rakamlar. Performans 89/74/76 ve LCP 3,8/7,2/5,9 sn arasında dalgalandı; üç koşuda da sunucu yanıtı 40 ms ve doküman ~0,5 sn'de tamamlandı, yani dalgalanma §19.2'de anlatılan simüle model yapaylığıdır (renk değişikliği yükleme performansını etkileyemez).
- Regresyon kontrolü, devtools throttling ile birebir: deploy öncesi FCP=LCP 3,7 sn (sıcak); deploy sonrası 3,7 ve 3,6 sn; doküman ve CSS bitiş zamanları aynı. Regresyon yok.

## 20. Egress diyeti ve ISR — 15-16 Eylül 2026

Tasarım: `docs/superpowers/specs/2026-09-15-university-data-egress-isr-design.md`. Plan: `docs/superpowers/plans/2026-09-15-university-data-egress-isr-plan.md`. Commit'ler: `44b4e11` … `be7a2d5`.

### 20.1 Teşhis (Supabase logları ve ölçümler, 15 Eylül)

- Supabase Usage: egress 7,27 / 5 GB (%145), dönem 27 Ağustos – 27 Eylül 2026; mühlet 14 Ekim 2026'da bitiyor, sonrasında 402 kısıtlaması riski. Free planda para cezası yok, kısıtlama var; ikinci mühlet verilmiyor.
- Edge log sayımı: 15 Eylül'de 24 saatte 168 tam çekim (deploy ve yerel ölçümler dahil); normal günlerde 82-88 (3 Eylül: 88, 10 Eylül: 82). Her çekim farklı bir Vercel IP'sinden geliyor (soğuk instance); her çekim = `universities` (0-63) + `university_departments` (0-999, 1000-1007) + `program_admission_details` (0-899).
- Boyutlar (gzip): universities 12,5 KB, departments 32 KB, admission details 4.575 KB → 4,62 MB/çekim; admission tablosu ham 13,8 MB. 85 çekim × 4,6 MB ≈ 390 MB/gün ≈ 7,3 GB / 19 gün; ekrandaki rakamla uyumlu.
- Tetikleyiciler: ana sayfa, `/universities`, `/cities`, 64 üniversite + 1.072 program sayfası, sitemap (saatte bir), `/api/universities` (her tarayıcı ziyareti) ve chat aynı tam çekimi kullanıyordu. Program sayfası kendi okulu için 90-180 KB'a ihtiyaç duyarken 4,6 MB çekiyordu; sitemap 16 KB için 4,6 MB.
- Bu aynı zamanda §19.3'teki "soğuk sunucuda gövde 3-5 sn" gecikmesinin kaynağıdır.
- Temmuz'daki memo düzeltmesinden sonra neden yeniden aşıldı (17 Eylül analizi): egress = günlük soğuk instance sayısı × tam veri seti boyutu; ikisi birden büyüdü. (a) Kabul dosyası satırları Temmuz sonunda 571 iken 30 Ağustos-6 Eylül importlarıyla 900'e çıktı (+%58; çekim başına ~4,6 MB). (b) Günlük soğuk çekim ~40'tan (28 Ağustos, ~190 MB/gün) 80-90'a (Eylül başı), 128-168'e (14-15 Eylül) yükseldi: 1.000+ sayfaya gelen bot/tarayıcı dalgaları, düşük gerçek trafikte instance'ların sürekli yenilenmesi ve sık deploy'lar (28 Ağustos 23 commit, 15-16 Eylül 26 commit; her deploy tüm memo'ları sıfırlar; 15 Eylül'deki ölçüm trafiği de o günün 683 MB'lık zirvesine katkı yaptı). In-memory memo yalnızca aynı instance'a gelen tekrar istekleri kurtarıyordu; yapısal sorun (her yeni instance'ın ve her sayfa türünün tüm veri setini indirmesi) duruyordu.

### 20.2 Uygulanan tasarım

- `lib/universities.server.ts`: tam çekim `getUniversitiesData()` kaldırıldı. `getUniversitiesDirectory()` (okul + program satırları + kabul dosyası VARLIĞI, `select=department_id`; ~47 KB gz) ve `getUniversityById(id)` (`eq("university_id")` filtreli tam okul; 90-180 KB gz). İkisi de 3 saatlik in-memory memo, single-flight, stale-on-error.
- `Department.hasAdmissionDetails` bayrağı + `lib/admissionPresence.ts` `hasAdmissionDossier()`; hub öneri bonusu ve "yakında" rozeti bununla çalışır.
- Ana sayfa, liste, şehirler, sitemap, `/api/universities`, chat → dizin. `/api/universities` yanıtı ağır kabul metinlerini taşımaz (224 KB ham; Vercel gzip ile ~50 KB beklenir); `no-store` sözleşmesi aynen.
- ISR: `app/page.tsx` (`force-dynamic` kaldırıldı), üniversite ve program `page.tsx` → `revalidate = 10800` + boş `generateStaticParams()`; üniversite sayfası sunucuda `searchParams` okumaz, geri tuşu `?from=list`i tıklama anında tarayıcıdan okur.
- `useUniversitiesData(initial, { fetchWhenInitial: false })`: detay leaf'leri sunucudan gelen tam okul verisini korur; hafif dizin kabul panelini ezmez.
- Guard'lar: `check:university-data-source` (yeni sözleşme), `check:seo-vitals` (revalidate/generateStaticParams/searchParams), `check-universities-server-compose` (bayrak üç durum), `check:university-details-ui` (cameFromList client'ta).

### 20.3 Yerel doğrulama (16 Eylül, üretim derlemesi)

| Kontrol | Sonuç |
|---|---|
| Build rota tablosu | `/` ○ revalidate 3h; `/universities/[id]` ve program rotası ● (bos generateStaticParams); `/universities`, `/cities` ƒ (searchParams) |
| Program sayfası | 1. istek 0,49 sn `x-nextjs-cache: MISS`, 2. istek 5 ms `HIT`; `Cache-Control: s-maxage=10800`; H1, 4 JSON-LD, kabul paneli sunucu HTML'inde (13 "Tümünü oku") |
| Tarayıcı (hidrasyon sonrası) | Kabul paneli tam: "Kaynaklı kabul dosyası", 1. Başvuru takvimi, 2. Kabul koşulları; dizin verisi paneli ezmedi |
| Üniversite sayfası | MISS 42 ms → HIT; H1 + 31 program linki |
| Ana sayfa / liste / şehirler / sitemap | HIT ve 64 · 1.008 istatistikleri; 12 okul kartı; şehirler 200; sitemap 1.079 URL |
| 404 | `/universities/99999` ve `/universities/abc` → 404 |
| `/api/universities` | 64 okul, 1.008 program, 900 `hasAdmissionDetails`; `admissionDetails`/`sourceQuotes` yok |
| Supabase edge logları (kendi IP'm) | admission isteği ya hedefli (`university_id=eq.9`, range 0-28) ya yalnız `select=department_id`; tam admission çekimi yok |
| Guard'lar, `tsc`, ESLint | Yeşil (tek lint hatası `app/communities/prototype`, bu işin dışında ve untracked) |

### 20.4 Deploy sonrası doğrulama

- Kerem'in onayıyla 16 Eylül 2026 00:04 (TSİ) civarı `main`'e push edildi (`44b4e11`…`8f66ecc`); Vercel deploy'u birkaç dakikada canlıya düştü.
- Production, tarayıcı içinden (same-origin fetch, `x-vercel-cache` başlığı okunarak):

| Sayfa | 1. istek | Sonraki istekler | Not |
|---|---|---|---|
| `/` | HIT (`age` 67 sn) | HIT | build'de üretilmiş, 3 saat önbellek |
| Program sayfası (Ca' Foscari / Digital and Public Humanities) | HIT (`age` 56 sn) | HIT, HIT | ilk ziyaretimde üretilmiş, sonra önbellekten |
| `/universities/12` (ilk kez açılan sayfa) | MISS (`age` 0) | 4 sn sonra HIT | on-demand ISR çalışıyor |
| `/universities` | MISS, `private, no-store` | — | tasarım gereği dinamik (searchParams) |
| `/api/universities` | 200, `no-store` | — | 64 okul, 1.008 program, 900 kabul bayrağı, ağır alan yok |

- Arka arkaya iki isteğin ikisi de MISS dönebilir (önbellek yazımı yanıt sonrası tamamlanıyor); birkaç saniye sonra HIT.
- **Vercel Security Checkpoint olayı:** deploy sonrası aynı gece tarayıcı olmayan istekler (curl, Lighthouse, harici fetch) `403` + `x-vercel-mitigated: challenge` aldı; gerçek tarayıcı doğrulamayı geçip sayfayı normal açtı. Bu Vercel Firewall'un challenge katmanıdır (Attack Challenge Mode veya otomatik DDoS mitigasyonu); büyük olasılıkla aynı gün yapılan yoğun ölçüm trafiği (Lighthouse koşuları, 20 saniyelik polling) tetikledi. Takip: Vercel → Project → Firewall ekranında Attack Challenge Mode'un kapalı olduğu doğrulanmalı; GSC URL Inspection "canlı test" ile Googlebot'un sayfayı çekebildiği teyit edilmeli. Ders: production'a karşı polling/Lighthouse koşularını seyrek tut (saniyede değil dakikada bir; art arda en fazla 3-4 koşu).
- Devtools throttling hız ölçümü ve ertesi gün Supabase log sayımı, challenge kalktıktan sonra alınacak (20.6).

### 20.6 Takip ölçümleri

Production, devtools throttling (mobil, Slow 4G), 16 Eylül 2026 gece (challenge kalktıktan sonra, koşular 60 sn aralıklı):

| Koşu | Doküman gövdesi bitişi | FCP | LCP | LCP öğesi |
|---|---:|---:|---:|---|
| Program sayfası, deploy öncesi soğuk | 3,7 sn | 6,1 sn | 8,2 sn | portre görseli |
| Program sayfası, deploy öncesi sıcak | 0,9 sn | 3,6 sn | 4,6 sn | portre görseli |
| Program sayfası, deploy sonrası #1 (yeni deploy sonrası ilk istek, ISR MISS) | **1,0 sn** | 3,7 sn | 4,7 sn | portre görseli |
| Program sayfası, deploy sonrası #2 (ISR HIT) | 1,0 sn | 3,7 sn | 4,7 sn | portre görseli |
| Ana sayfa, deploy öncesi sıcak | 0,8 sn | 3,6 sn | 3,6 sn | H1 |
| Ana sayfa, deploy sonrası | 0,9 sn | 3,8 sn | 3,8 sn | H1 |

Sonuç: soğuk sunucudaki 3-5 saniyelik gövde beklemesi kalktı (hedef < 1,5 sn sağlandı); ilk çizim (FCP) beklendiği gibi değişmedi, çünkü sıcak durumdaki darboğaz §19.3/3'teki font/CSS/JS bant genişliği yarışıdır (sıradaki iş: §19.6/2 font diyeti ve /3 Clerk JS). Program sayfasında LCP portre görseli olmaya devam ediyor (§19.6/1 alt maddesi: `priority`/`sizes` incelemesi).

Not: yalnızca belge değişikliği içeren push'lar da Vercel'de yeni deploy üretir ve ISR önbelleğini sıfırlar (ilk istekler yeniden MISS). Belge commit'lerini toplu push et; istenirse Vercel "Ignored Build Step" ile yalnız `*.md`/`docs/` değişikliklerinde build atlanabilir.

Supabase edge log sayımı, 17 Eylül 2026 (son 24 saat, Vercel IP'leri) ve karşılaştırma:

| Gün | `program_admission_details` istekleri | Tahmini egress |
|---|---|---:|
| 14 Eylül (deploy öncesi) | 128 tam çekim (0-899, eski 4,6 MB'lık sorgu) | ~590 MB |
| 16-17 Eylül (deploy sonrası) | 0 tam çekim; 111 yalnız-varlık (dizin) + 250 hedefli (tek okul; toplam ~8.800 satır) | ~30-50 MB (dizin ~6 MB + hedefli 21-45 MB) |

- Eski tam çekim production'da tamamen bitti. Düşüş 12-20 kat; bu tempoyla aylık ~0,9-1,5 GB (Free kota 5 GB).
- Hedefli çekim sayısının (250/gün, 100 farklı instance) deploy öncesi toplam çekimden (128/gün) yüksek olması tarama trafiğinin arttığına işaret ediyor (sitemap lastmod + yeniden gönderim sonrası); GSC tarama istatistikleriyle teyit edilecek.
- Yedek optimizasyon (gerekirse): program sayfası okulun tüm kabul satırları yerine yalnız kendi satırını, üniversite sayfası yalnız varlık bilgisini çekerse hedefli egress 5-10 kat daha düşer.
- Fatura düzeyi (Usage ekranı, 17 Eylül): dönem toplamı 7,40 GB (aşım 2,40 GB). Günlük egress grafiği 28 Ağustos'ta ~190 MB'tan 15 Eylül'de 683 MB'a tırmanmış; 16 ve 17 Eylül çubukları ~30 MB'a çökmüş (log tahminiyle uyumlu). Dönem kümülatif olduğu için 27 Eylül'e kadar "aşıldı" görünür (tahmini kapanış ~7,7 GB); belirleyici olan 27 Eylül'de başlayan dönemdir (14 Ekim'e kadar beklenen ~0,5 GB / 5 GB). Organizasyon Vercel Marketplace üzerinden yönetiliyor; plan değişikliği gerekirse Vercel'den yapılır.

### 20.5 Notlar ve kalan riskler

- Yeni program importları canlıya en geç 3 saat gecikmeyle yansır (memo + ISR). On-demand revalidation yok; istenirse sonra eklenir.
- Free planda ikinci mühlet olmadığı için haftalık Supabase Usage kontrolü SEO takvimine eklendi; hedef dönem başına < 1 GB.
- Chat sistem promptu artık kabul metinlerini içermiyor; AI masası duraklatılmış durumda, yeniden açılırsa değerlendirilir.
- Sonraki hız kalemi §19.6/2: font diyeti (10 preload dosyası, CSS ile yarış).

## 21. Search Console kontrolü — 16 Eylül 2026

Kaynak: Kerem'in paylaştığı ekran görüntüleri (gece 00:30-01:30). Core Web Vitals: veri yok (düşük trafik, beklenen). Güvenlik/Manuel işlemler: sorun yok.

### 21.1 Ekranlar

| Rapor | Değer |
|---|---|
| Sayfalar | Dizinde 22; dizin dışı 1.090 (6 neden). Grafik: Temmuz başından 29 Ağustos'a ~860, sonra ~1.090 |
| "noindex" ile hariç | 854, doğrulama 22 Temmuz'dan beri "Başladı", sayı değişmiyor |
| Keşfedildi, dizine eklenmedi | 225; örneklerin hepsi gerçek program/üniversite sayfası (ör. 1 numaralı okulun mühendislik programları), "son tarama: yok" |
| Tarandı, dizine eklenmedi | 1: `/universities/52` (28 Haziran) |
| Robots.txt engeli | 3: `/giris?redirect_url=/ai-mentor`, `/hub`, `/giris?mode=kayit` (kasıtlı) |
| Yönlendirmeli sayfa | 3: `http://www`, `https://www`, `http://` kökleri → kanonik (normal) |
| Yeniden yönlendirme hatası | 3: `/universities`, `/isee`, `/scholarships`; son tarama 27 Haziran (alan adı taşınması dönemi); sayfalar bugün 200 |
| Tarama istatistikleri (90 gün) | 67,1 B istek, 186 MB, ortalama yanıt 605 ms; neredeyse tamamı 28 Haziran civarındaki tek günlük ~55-60 B'lik ilk tarama, sonrası sıfıra yakın düz |
| Yanıta göre | 200 %93, 302 %7, 301/404/ulaşılamadı < %1 (403 yok) |
| Dosya türüne göre | "Diğer" %92, HTML %5, JSON %1, JS %1 (font vb. varlıklar) |
| Googlebot türü | Masaüstü %87, akıllı telefon %4 |
| Ana makineler | italypath.app 66.809 sorunsuz; clerk.italypath.app 263; www 28 (geçmişte sorun, çözüldü) |
| URL denetimi (canlı) | Program sayfası kullanılabilir, 1 geçerli yapılandırılmış öğe; dizin isteği gönderildi (16 Eyl 00:43). Vercel challenge Googlebot'u etkilemiyor |
| Site haritası | Son okuma 14.09.2026, 1.078 sayfa, başarılı |
| Performans (28 gün / önceki) | Tıklama 7 / 4; gösterim 646 / 267; CTR %1,1 / %1,5; konum 8,4 / 6,2 |
| Sorgular | `italypath` 20 gösterim; "italya şehirleri" ailesi ~14; program adları ("digital and public humanities", "digital humanities ca foscari") |
| Sayfalar | `/communities` 7 tıklama / 27 gösterim; Digital and Public Humanities 209 gösterim (28 Ağustos'ta dizin isteği gönderilen sayfa); Management of Innovation (MIE) 77 (6 Eylül'de istek gönderilen); environmental-engineering 73; criminology 51 |

### 21.2 Yorum

- Google siteyi 28 Haziran'da bir kez taradı, 857 sayfada (o günkü) noindex gördü ve sonra neredeyse geri gelmedi. Sonuçları: noindex doğrulaması 8 haftadır ilerlemiyor; 225 sitemap URL'si hiç taranmadı; üç ana sayfa 27 Haziran'daki yönlendirme hatasıyla kayıtlı kaldı. Bugün hiçbir şey bozuk değil; sorun "yeniden tarama talebi"nin düşük olması.
- Yeniden taranan program sayfaları hemen gösterim alıyor (209 ve 77 gösterim, ikisi de dizin isteği gönderilen sayfalar). Yani en yüksek kaldıraç: yeniden taramayı tetiklemek. Hız düzeltmesi (§20) ve aşağıdaki iki değişiklik bunun için.
- Tarama trafiğinin %92'si sayfa değil varlık (font vb.); font diyeti tarama verimliliği için de değerli (§19.6/2).
- 854 + 225 + 22 ≈ 1.079 sitemap; parametreli/kopya URL sorunu yok.

### 21.3 Aksiyonlar

1. Kerem (GSC): `/universities`, `/isee`, `/scholarships` için URL denetimi canlı test + "dizine eklenmesini iste" — 16 Eylül gece yapıldı. Deploy (4f1cfd4, 16 Eylül ~01:20) sonrası sitemap 16 Eylül gece Kerem tarafından yeniden gönderildi (Başarılı). Bir sonraki kontrol: en erken 23 Eylül, tercihen 30 Eylül.
2. Kod (16 Eylül, bu kayıtla aynı commit): `app/sitemap.ts` her URL'ye `lastModified` yazar: veritabanı `updated_at` (okul, program, kabul dosyası) ile `PAGE_TEMPLATE_LAST_MODIFIED = 2026-09-15` (program/üniversite/ISEE/burs sayfalarına ön görüşme bölümü eklenen deploy) arasındaki en yeni tarih. Şablon içeriği yeniden değişirse sabit güncellenir; uydurma tarih yok.
3. Kod: `/universities` sunucu HTML'i artık 64 okulun tamamını listeler (önceden 12). Googlebot `/api/universities`'i robots.txt nedeniyle çekemediği için 52 okula iç link göremiyordu.
4. İzleme (1-2 hafta): "Keşfedildi" ve "noindex" sayıları, tarama istatistiklerinde istek sayısı ve ortalama yanıt süresi (605 ms bazı), performans raporunda gösterim. Googlebot masaüstü ağırlığı ve %7 302 (girişli sayfa yönlendirmeleri) not edildi, acil değil.

## 22. İç bağlantı ağı, 1. faz — 16 Eylül 2026

Tasarım: `docs/superpowers/specs/2026-09-16-internal-linking-phase1-design.md`. Commit: `4c112cf` (push 16 Eylül gece, Kerem onayıyla).

- Üniversite ve program sayfalarına görünür ekmek kırıntısı (Ana sayfa › Üniversiteler › Okul › Program; JSON-LD ile aynı sıra) ve "İlgili bağlantılar" kutusu eklendi: aynı şehirdeki en fazla 6 okul (program sayısıyla), şehir rehberi (`/cities?city=…`), bölge bursları (`/scholarships?region=…`). Sunucu HTML'inde; hafif dizinle hesaplanır, hata sayfayı bozmaz.
- Amaç: Google'ın Haziran'dan beri geri dönmediği 1.136 sayfaya iç sinyal (§21) ve ziyaretçiye gezinme yolu. Yeni URL yok; 2. fazda şehir/bölge için gerçek adresli sayfalar ve "aynı alanda diğer üniversiteler" (resmi bölüm sınıfı kodu `degree_class`: 900 kabul kaydının 778'inde var, 124 kod 2+ okulda ortak; kodu olmayanlar için hub anahtar kelime sözlüğü) değerlendirilecek.
- Yerel doğrulama: Politecnico di Milano ve Aeronautical Engineering sayfalarında kırıntı + 6 Milano okulu + Milano şehir rehberi + Lombardia bursları; guard'lar (`check:university-details-ui` yeni token'lar), tsc, lint temiz.
- Deploy doğrulandı (16 Eylül gece): production'da üniversite ve program sayfalarında kırıntı satırı ve "İlgili bağlantılar" kutusu (6 aynı-şehir linki) sunucu HTML'inde. İzleme: 1-2 hafta sonra GSC tarama istatistikleri ve "Keşfedildi" sayısı (§21.3/4).

### Sonraki aday işler (öncelik sırası, Kerem seçer)

1. Program/üniversite başlık ve meta açıklamalarını Türkçeleştirip benzersizleştirme (1.072 sayfa, şablon işi; §7).
2. Font diyeti (§19.6/2): 10 preload dosyası → ilk ekranda kullanılan ağırlıklar; ilk çizim ~3,7 sn'nin ana kalemi.
3. Anahtar kelime listesi (GSC + otomatik tamamlama) ve rehber içerik/şehir sayfası kararı (§21, 2. faz).
4. Ön görüşme SSS'sine FAQPage şeması; program sayfası LCP görselinin `priority`/`sizes` incelemesi.

## 23. Program detay sayfaları turu — 17-21 Eylül 2026

Tasarım/plan: `docs/superpowers/specs/2026-09-17-program-detail-pages-design.md`, `docs/superpowers/plans/2026-09-17-program-detail-pages-plan.md` (9 görev, 4 deploy grubu). Dal: `feat/program-detail-pages`.

### 23.1 Yapılanlar

- **Deploy 1 (17 Eylül, canlı):** kaynaklı kabul dosyası düzeni (künye + takvim + koşullar + belgeler + belirsizlikler + kaynak izi), Türkçe ve sayfaya özgü `title`/`description` (1.000+ sayfa).
- **Deploy 2 (19 Eylül, canlı):** sayfa ağırlığı (yalnız açılan programın kabul dosyası istemciye gider), "Aynı alanda diğer üniversiteler" (resmî `degree_class` koduna göre), künye başlığı "Temel bilgiler", her dosyalı sayfada kaynak değişim notu, "open access" → "Açık kabul (kontenjansız)".
- **Deploy 3+4 (21 Eylül, bu kayıt):**
  - **Task 7 — "Sonraki adımlar":** ISEE, şehir rehberi ve bölge bursları linkleri + ücretsiz ön görüşme kutusu tek blokta toplandı. Şehir/burs linkleri "İlgili bağlantılar"da tekrar edilmiyor (`showHubLinks={false}`); üniversite sayfası değişmedi. Ön görüşme metni teklif tonuna çekildi.
  - **Task 8 — erişilebilirlik:** kabul dosyasındaki iki `<dl>` yalnız `dt`/`dd` içerecek şekilde düzeltildi (kaynak linki `dd` içine alındı; geniş ekranda `dd` iki sütuna yayılır, görünüm aynı).
  - **Task 9 — yapılandırılmış veri:** dosyalı programlarda ikinci JSON-LD (`EducationalOccupationalProgram`): ad, URL, okul, dil, süre, tam zamanlı. Tarih/ücret/kabul koşulu **yok** (doğrulanmış tek değer yok).
  - **Task 6 — YAPILMADI (Kerem kararı, 21 Eylül):** "dosyasız programları noindex + sitemap dışı" adımı anlamını yitirdi; 19 Eylül'deki 108 program turundan sonra canlıda dosyasız program kalmadı (56 okul / 941 program / %100 dosyalı, bkz. `tmp/uni-research/STATUS.md`). İleride dosyasız satır eklenirse emniyet kemeri olarak yeniden değerlendirilir.

### 23.2 Ölçümler (yerel üretim derlemesi, 21 Eylül)

| Ölçü | Değer |
| --- | --- |
| Erişilebilirlik (Lighthouse, devtools throttling, program sayfası) | 91 → **93** |
| Kalan tek erişilebilirlik bulgusu | `meta-viewport` (`user-scalable=no`) — bilinçli zoom kilidi ürün kararı; 95 bu karar değişmeden mümkün değil |
| Program sayfası sunucu HTML'i | 141 KB ham / **20 KB gzip** |
| Başlık hiyerarşisi | h1 → h2 → h3, atlama yok (doğrulandı) |
| JSON-LD | sayfa başına 4 script (Organization, WebSite, BreadcrumbList, EducationalOccupationalProgram) |
| Sitemap | **1.004 URL** (7 statik + 56 okul + 941 program). Düşüşün sebebi Task 6 değil, 19 Eylül'deki veri temizliği (67 program + 8 okul silindi). |

`PAGE_TEMPLATE_LAST_MODIFIED` 2026-09-21'e çekildi (görünür şablon değişikliği: "Sonraki adımlar" bloğu).

### 23.3 Açık kalanlar

- Deploy sonrası: Rich Results Test ile `EducationalOccupationalProgram` doğrulaması; Search Console'da site haritasının yeniden gönderilmesi (19 Eylül silmeleri + bu deploy).
- Plan kapsamı dışı bırakılanlar (Kerem, 17 Eylül): programın yalnız kendi kabul satırını çekmesi (İş 9/J), Türkçe cümle özetleri, son tarih/sınav alan çıkarımı, ön görüşme tıklama ölçümü (Vercel Hobby).
- SEO sıradaki adaylar değişmedi (§22): font diyeti, Clerk JS diyeti, anahtar kelime listesi + şehir/bölge sayfaları, ön görüşme SSS'si için FAQPage şeması, program sayfası LCP görselinin `priority`/`sizes` incelemesi.

## 24. Search Console sinyali ve dizin isteği turu — 21 Eylül 2026

Bağlam: 19 Eylül'de yeni SEO oturumu devraldı (AGENT_CONTEXT.md → §19-23 → hafıza). §22'deki 1. aday iş (Türkçe, sayfaya özgü program başlık/açıklaması) §23 Deploy 1 ile bitti. Bu kayıt kod değişikliği içermez; gelen sinyali, envanter değişiminin GSC'ye beklenen yansımasını ve başlatılan dizin isteği turunu belgeler.

### 24.1 Gelen sinyal: ilk başarılı doğrulama

- 21 Eylül'de Search Console e-postası: "italypath.app sitesindeki Sayfayı dizine ekleme sorunları başarıyla düzeltildi", doğrulanan sorun **"Yeniden yönlendirme hatası"**, 3 sayfa düzeltilmiş olarak doğrulandı.
- Bunlar §21'deki `/universities`, `/isee`, `/scholarships` (27 Haziran'daki alan adı taşınma döneminden kalan kayıt). 16 Eylül gece Kerem üçü için URL denetimi + "dizine eklenmesini iste" yapmıştı (§21.3/1).
- Anlamı: Haziran'dan beri ilk başarılı doğrulama. İstek gönderilen sayfalarda Googlebot geri geliyor ve yeniden tarıyor; yöntem bu sitede kanıtlı (§21'de 2 program sayfası da istek sonrası hemen gösterim almıştı).
- Kapsamadıkları: 854 `noindex` doğrulaması ve 225 "keşfedildi, dizine eklenmedi" ayrı süreçler; bu kayıtta GSC ekranı görüntülenmedi, durumları bilinmiyor.

### 24.2 Envanter değişiminin GSC'ye beklenen yansıması

- 19 Eylül veri temizliği (§23.2): 8 okul + 67 program silindi; sitemap 1.079 → **1.004** URL (7 statik + 56 okul + 941 program). Silinen adresler `notFound()` ile gerçek HTTP 404 döner.
- Bir sonraki GSC kontrolünde "Bulunamadı (404)" sayısında artış **beklenir ve normaldir**; 854 `noindex` listesindeki silinmiş adresler 404'e geçerek listeden düşer. Aksiyon gerekmez; 404'leri yönlendirmeye çevirme (eşdeğer sayfa yok).
- Kerem'in yapacağı (§23.3 ile aynı): site haritasını GSC'de yeniden gönder (19 Eylül silmeleri + 21 Eylül şablon tarihi).

### 24.3 Dizin isteği turu (başlatıldı)

Gerekçe: Google siteye kendiliğinden dönmüyor (§21.2); "dizine eklenmesini iste" kanıtlı tek tetikleyici. §12/P0 gereği 941 program sayfasına tek tek istek gönderilmez; bunun yerine her biri kendi programlarının tamamına link veren **56 üniversite sayfası** hub olarak kullanılır. Günlük kota ~10 istek; sıra canlı Supabase'den program sayısına göre (en büyük okul önce).

| Gün | Kapsam | Program kapsamı | Durum |
|---|---|---:|---|
| 1 | Okul id 3, 4, 1, 10, 15, 7, 5, 8, 14, 18 (Bologna … Trento) | 468 | ✅ 21 Eylül |
| 2 | id 6, 9, 11, 25, 20, 2, 13, 16, 63, 17 | 241 | bekliyor |
| 3 | id 19, 21, 12, 29, 23, 22, 33, 28, 26, 32 | 144 | bekliyor |
| 4 | id 57, 51, 27, 24, 42, 37, 44, 64, 61, 41 | 62 | bekliyor |
| 5 | id 47, 52, 31, 40, 54, 35, 43, 55, 46, 53 | 20 | bekliyor |
| 6 | id 48, 56, 59, 50, 30, 38 + `/`, `/cities`, `/communities`, `/on-gorusme` | 6 | bekliyor |

`/universities`, `/isee`, `/scholarships` 16 Eylül'de gönderildi (24.1), tekrar gerekmez. Sıralı adres listesi Kerem'e dosya olarak verildi; gerekirse `universities` ⨝ `university_departments` sayımıyla yeniden üretilir.

### 24.4 Değerlendirilen ve reddedilen teori: "Supabase aşımı taramayı engelledi"

Kerem'in sorusu üzerine incelendi; kanıtlar teoriyi desteklemiyor (§14'e de eklendi):

1. **Zaman çizelgesi:** Google'ın tek büyük taraması 28 Haziran (55-60 bin istek); ilk egress aşımı 2 Temmuz'da fark edildi, yani taramadan sonra. O gün sayfalar sunuluyordu ama `noindex` taşıyordu (§14).
2. **GSC sunucu sorunu görmedi:** 90 günlük tarama istatistikleri (§21.1) %93 `200`, 5xx yok, ana makine durumu 66.809 istekte sorunsuz. Veritabanı donsaydı "Sunucu hatası (5xx)" veya "Tarandı, dizine eklenmedi" artardı; ikincisi 1 adet.
3. **225 sayfa hiç istenmedi:** "son tarama: yok" → hata değil, tarama önceliği kararı.
4. **Kısıtlama hiç uygulanmadı:** Temmuz aşımı memo ile çözüldü; Eylül aşımı mühlet içinde (14 Ekim). Ayrıca stale-on-error memo Supabase hatasında eski veriyi sunar, sayfa çökmez.
5. **Eylül'de nedensellik ters:** bot tarama dalgaları soğuk instance'ları çoğaltıp egress'i şişirdi (§20.1); aşım taramayı değil, tarama aşımı üretti.

Tek dolaylı etki: soğuk instance'da 3-5 sn gövde gecikmesi (§19.3) tarama hızını bir miktar düşürmüş olabilir; GSC ortalama yanıt 605 ms idi ve 16 Eylül'de çözüldü (§20). Asıl neden: 28 Haziran'da 857 `noindex` + üç aylık alan adı + dış bağlantı yokluğu → düşük tarama talebi. Dış sinyal (bağlantı/otorite) ayrı bir karar konusu; Kerem'e sorulmadan açılmaz.

### 24.5 Bir sonraki GSC kontrolü (23-30 Eylül) — kontrol listesi

- **Sayfalar:** dizinde (22 bazı) ↑?; `noindex` (854) ↓?; keşfedildi (225) ↓?; **404 ↑ beklenen** (24.2).
- **Tarama istatistikleri:** günlük istek sayısı (16 Eylül sonrası artış beklenir; Supabase logları 250 hedefli/gün gösteriyordu, §20.6), ortalama yanıt (605 ms bazı, ISR sonrası düşmeli), ana makine durumu (24.4'ü kesin kapatır).
- **Performans:** gösterim (646/28 gün bazı); dizin isteği gönderilen okul sayfalarında ilk gösterimler.
- **Site haritası:** yeniden gönderim sonrası son okuma tarihi ve **1.004** sayfa.
- **Rich Results Test:** bir dosyalı program sayfasında `EducationalOccupationalProgram` (§23.3).
- **Supabase Usage:** dönem 27 Eylül'de sıfırlanır; 14 Ekim'e kadar hedef < 1 GB (§20.6).
