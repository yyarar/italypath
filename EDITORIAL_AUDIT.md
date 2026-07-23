# ItalyPath Editorial Audit

**Audit tarihi:** 22 Temmuz 2026  
**Durum:** Repo + canlı veri + resmî kaynak incelemesi tamamlandı  
**Rol:** Editorial danışmanlık  
**Kapsam:** Ana sayfa, üniversite/program yüzeyleri, burslar, şehirler, topluluklar, ISEE, SAT, mentor, belge cüzdanı, auth/onboarding/Hub, yasal metinler ve lansman dokümanları

> Bu belge hukuki görüş değildir. Yasal metinlerle ilgili maddeler, yayın öncesi operasyon doğrulaması ve KVKK konusunda yetkin hukukçu kontrolü gerektirir.

---

## 1. Yönetici kararı

ItalyPath'ın ürün mimarisi ve görsel dili lansman taşımaya yeterli. Ancak bazı kamuya açık vaatler canlı ürün ve güncel resmî verilerle uyuşmuyor. Bu nedenle önerim:

1. **Yeni trafik ve PR kampanyalarını P0 maddeleri kapanana kadar büyütmemek.** Siteyi kapatmak gerekmiyor; fakat doğrulanmamış sayı ve güncellik iddialarıyla yeni kitle çekilmemeli.
2. **İlk iş olarak güven yüzeylerini düzeltmek:** SAT vaadi, 2026/27 burs çağrıları, şehir fallback'leri, AI/ISEE sınırları ve topluluk durumları.
3. **Ardından dönüşüm ve dil sistemini kurmak:** ölçülebilir funnel, kaynak/güncellik standardı, TR/EN yayın modeli ve ortak terminoloji.

ItalyPath'ın doğru konumlandırması “her şeyi bilen danışman” değil; **öğrenciyi resmî kaynağa daha hızlı ve daha bilinçli götüren editoryal çalışma alanı** olmalı.

---

## 2. Yöntem ve sınırlar

Bu audit üç skill çerçevesiyle yürütüldü:

- `content-strategy`: içerik-pazar uyumu, içerik sütunları, aranabilir/paylaşılabilir içerik ayrımı ve önceliklendirme.
- `copy-editing`: açıklık, ses tonu, kullanıcı faydası, kanıt, özgüllük, duygu ve risk olmak üzere yedi geçişli metin kontrolü.
- `cro`: değer önerisi, CTA hiyerarşisi, güven sinyalleri, itirazlar ve sürtünme noktaları.

İncelenen kanıtlar:

- Uygulamadaki gerçek kullanıcı metinleri ve metadata.
- Canlı Supabase tablolarında salt okunur kapsam sayımları.
- Mevcut smoke/data guard'ları.
- 2026/27 için resmî Lazio DiSCo, ER.GO ve DSU Toscana sayfaları.
- 2026 ISEE resmî talimatları ve Vercel Web Analytics gizlilik dokümanı.

Auditin sınırları:

- Vercel dashboard, Search Console, kayıt dönüşüm oranı, heatmap ve oturum kaydı görülmedi.
- Kullanıcı görüşmesi, destek talebi veya anket verisi paylaşılmadı.
- Bu nedenle CRO puanları davranış verisine değil, ürün akışı ve metin incelemesine dayalı sezgisel puanlardır.
- WhatsApp/Telegram gruplarının içine girilerek insan eliyle güncel üyelik kontrolü yapılmadı.

---

## 3. Sayısal durum fotoğrafı

| Alan | 22 Temmuz 2026 bulgusu | Editorial anlamı |
| --- | ---: | --- |
| Üniversite | 64 | Ana sayfa sayacı canlı veriden geliyor. |
| Program | 1.017 | Eski `240 program` mesajları yalnızca arşiv/lansman belgelerinde kalmış. |
| Kabul detayı bulunan program | 594 / 1.017 (%58,4) | Program kataloğu geniş; kabul detayları henüz tüm kataloğu kapsamıyor. |
| EU deadline bulunan program | 570 | Son tarihin olmadığı programlarda eksiklik açıkça gösterilmeli. |
| Non-EU deadline bulunan program | 579 | Aynı kural Non-EU için de geçerli. |
| Belirsiz alan taşıyan kabul kaydı | 452 / 594 (%76,1) | Belirsizlik modeli iyi; kullanıcıya kaynak tarihi ve alan adları daha anlaşılır sunulmalı. |
| Belirsizlik notu taşıyan kayıt | 548 / 594 (%92,3) | Panelin editoryal yükü yüksek; taranabilirlik geliştirilmeli. |
| Kabul kaynağı alma aralığı | 28 Mayıs–5 Temmuz 2026 | Güncel; fakat bu tarihler UI'da görünmüyor. |
| Üniversitelerde aynı genel ücret bandı | 33 / 64 için `150€ - 3.000€` | “Yıllık ücret” etiketi altında fazla kesin ve kaynak tarihsiz görünüyor. |
| Küratörlü şehir | 17 | Bunların 16'sında Numbeo maliyet kaynağı var; Trento ayrı kaynak ihtiyacı taşıyor. |
| Fallback şehir | 29 | Doğrulanmamış sayısal maliyet ve yaşam iddiaları gerçek şehir dosyası gibi sunuluyor. |
| Burs bölgesi | 20 | 8 detaylı doğrulanmış, 12 yalnızca kurum dizini seviyesinde. |
| Topluluk | 19 | Tüm kayıtların son kontrol tarihi 10 Mart 2026; 1 kayıt `limited`. |
| Canlı SAT sorusu | 1.019 | Kamuya açık `1.400+` iddiasıyla uyuşmuyor. |
| SAT Reading & Writing | 0 | Ana sayfa iki bölüm varmış gibi gösteriyor. |
| SAT Math | 1.019 | Mevcut banka fiilen yalnızca Math. |
| Türkçe SAT açıklaması | 0 / 1.019 | “Pratik” deneyimi var; öğretici açıklama vaadi verilmemeli. |
| Hard-code TR/EN dalı bulunan UI dosyası | 19 | `lib/translations.ts` tek metin kaynağı kuralı uygulanmıyor. |
| Özel dönüşüm event'i | 0 | Yalnızca Vercel pageview analitiği var; funnel ölçülemiyor. |

Canlı kabul detaylarında 594 kaydın tamamında en az bir `source_quote` bulunması güçlü bir temel. Sorun veri toplamaktan çok, **kaynağın ne zaman alındığını ve hangi alanın ne kadar kesin olduğunu kullanıcıya daha anlaşılır sunmak**.

---

## 4. Yüzey puan kartı

Puanlar 10 üzerinden sezgisel editorial/CRO değerlendirmesidir. `10`, yayın ve güven açısından güçlü durumu gösterir.

| Yüzey | Açıklık | Güven | Güncellik | Sonraki adım | Öncelik |
| --- | ---: | ---: | ---: | ---: | --- |
| Ana sayfa | 8 | 4 | 4 | 8 | P0 |
| Üniversite listesi | 8 | 6 | 7 | 8 | P1 |
| Üniversite/program detayı | 7 | 6 | 6 | 7 | P1 |
| Burs haritası | 8 | 2 | 1 | 7 | P0 |
| Şehir atlası | 7 | 2 | 3 | 7 | P0 |
| Topluluk atlası | 8 | 4 | 2 | 6 | P0 |
| ISEE | 6 | 5 | 7 | 7 | P0 |
| SAT | 8 | 1 | 1 | 8 | P0 |
| AI/Gönüllü mentor | 8 | 3 | 6 | 8 | P0 |
| Auth/onboarding/Hub | 8 | 7 | 7 | 8 | P1 |
| Belge cüzdanı | 8 | 6 | 7 | 7 | P1 |
| Yasal metinler | 7 | 5 | 8 | 5 | P0 doğrulama |
| Lansman dokümanları | 6 | 2 | 1 | 7 | P0, kullanma |

---

## 5. P0 — Trafik büyütmeden önce kapatılmalı

### P0-01 — SAT ürün vaadini canlı kapsamla eşleştir

**Bulgular**

- `lib/translations.ts` ve ana sayfa `1.400+ resmi SAT sorusu` diyor.
- Canlı `sat_questions` tablosunda 1.019 kayıt var.
- 1.019 kaydın tamamı Math; Reading & Writing kaydı yok.
- Ana sayfadaki SAT paneli Math ve Reading & Writing'i birlikte aktif kapsam gibi gösteriyor.
- 1.019 sorunun tamamında `explanation_tr` boş.
- `scripts/check-sat-bank.mjs` güvenlik ve dosya sözleşmesini kontrol ediyor; canlı sayı, bölüm dağılımı veya açıklama kapsamını kontrol etmiyor.

**Karar**

- Hemen `1.400+` yerine **`1.000+ SAT matematik sorusu`** kullanılmalı.
- Reading & Writing satırı, canlı kayıt gelene kadar ana sayfadan çıkarılmalı veya açıkça “hazırlanıyor” olarak işaretlenmeli.
- “Resmî” kelimesi ancak soru kaynağı ve kullanım hakkı/atıf modeli belgelenmişse korunmalı. Aksi durumda “SAT matematik soruları” denmeli.
- Açıklama olmadığı için “öğren”, “çözümünü gör” gibi bir vaat kullanılmamalı.

**Kabul kriteri**

- Ana sayfa, SAT ekranı ve tüm lansman metinleri canlı sayıyla çelişmez.
- Yeni guard canlı toplamı, bölüm dağılımını ve kamuya açık iddia eşiğini denetler.
- Reading & Writing sayısı `0` iken kamuya açık aktif kapsamda gösterilmez.

---

### P0-02 — Burs haritasını 2026/27 çağrılarına geçir

**Bulgular**

- 20 bölgenin tümü 9 Mart 2026 tarihli; detaylı 8 kayıt hâlâ 2025/26 dönemini gösteriyor.
- Bugün için kritik üç resmî kaynak çoktan 2026/27 dönemine geçti:
  - [Lazio DiSCo 2026/27](https://laziodisco.it/bando-diritto-allo-studio-2026-2027/): ilk faz son tarihi 22 Temmuz 2026 saat 12.00.
  - [ER.GO 2026/27 tarihleri](https://www.er-go.it/cosa-fare-per/bandi-di-concorso/scadenze/copy_of_scadenze-per-richiedere-i-benefici): başvurular 23 Haziran–24 Ağustos 2026.
  - [DSU Toscana 2026/27](https://www.dsu.toscana.it/it/home): başvurular 20 Temmuz–7 Eylül 2026.
- Ana sayfa 9 Mart tarihli kayıtları “Öncelikli kontrol” olarak öne çıkarıyor. Lazio için sitedeki eski tarih, kullanıcının aktif 2026 son tarihini kaçırmasına yol açabilir.

**Karar**

- En az 8 `verified-full` bölge 2026/27 çağrılarına güncellenmeli.
- Sayfa düzeyindeki “9 Mart 2026 itibarıyla doğrulanan veriler” ifadesi kaldırılmalı; her bölge kendi akademik yılı ve son kontrol tarihini göstermeli.
- 12 `registry-only` kayıt “burs detayı” gibi değil, **“kurum dizini — çağrı henüz işlenmedi”** şeklinde sunulmalı.
- Aktif tarihler için “son gün”, “başvuru açık/kapalı” gibi durumlar yalnızca makinece hesaplanıyor ve tarih doğrulanıyorsa kullanılmalı.

**Kabul kriteri**

- `currentAcademicYear`, `applicationWindow`, eşikler, kaynaklar ve `lastVerifiedAt` aynı çağrı dönemine aittir.
- Eski akademik yıl aktif dönem gibi gösterilmez.
- Guard, `verified-full` satırında geçmiş akademik yıl veya belirlenen tazelik eşiğini aşan kayıt varsa fail olur.

---

### P0-03 — 29 şehirde üretilen tahminleri gerçek veri gibi sunmayı bırak

**Bulgular**

- Canlı üniversite verisinde 46 şehir var; yalnızca 17 şehir küratörlü.
- Diğer 29 şehir `getFallbackCityDetail()` ile aynı kira, gider ve ulaşım aralıklarını alıyor.
- Fallback metni bu şehirleri “sakin, güvenli ve otantik” diye tanımlıyor; bunlar kaynaklı şehir tespiti değil.
- Buna rağmen sayfa “Güncel akademik verilere dayanmaktadır” diyor.
- 17 küratörlü şehirden Trento'da kesin fiyat/sıralama iddiaları var, fakat maliyet kaynak metadata'sı yok.
- `check:cities` geçiyor; çünkü fallback sayısal iddialarını ve kaynak zorunluluğunu denetlemiyor.

**Karar**

- Fallback şehirlerde kira, aylık gider, ulaşım ücreti, güvenlik ve yaşam kalitesi iddiaları gösterilmemeli.
- Fallback yalnızca canlı üniversite sayısı, bölge, üniversite listesi ve bölgesel burs kurumuna bağlantı göstermeli.
- Önerilen fallback metni:

> Bu şehir için kaynaklı yaşam maliyeti dosyası henüz hazırlanmadı. Şimdilik şehirdeki üniversiteleri ve bölgesel burs kurumlarını inceleyebilirsin.

- “Güncel akademik verilere dayanmaktadır” yerine kaynak sınıfı açıkça ayrılmalı: üniversite listesi canlı Supabase; maliyetler üçüncü taraf kaynak; atmosfer/tüyo editoryal değerlendirme.
- Trento sayısal iddiaları kaynaklanmalı veya kaldırılmalı.

**Kabul kriteri**

- Kaynaksız şehirde sayısal maliyet gösterilmez.
- Her sayısal şehir verisinde `sourceName`, `sourceUrl`, `retrievedAt` bulunur.
- Guard kaynak metadata'sı olmayan sayısal kaydı reddeder ve fallback'te fiyat kalıbını yasaklar.

---

### P0-04 — AI Mentor'un bilgi sınırını görünür ve gerçek yap

**Bulgular**

- AI sistem promptu yalnızca üniversite adı, şehir ve program adlarını içeriyor.
- Starter prompt'lar ücret, ISEE burs miktarı ve gerekli belgeler hakkında kesin bilgi istiyor.
- Ana sayfa AI'ın “kişiselleştirilmiş yol haritası” çıkardığını söylüyor; kullanıcı profili chat promptuna eklenmiyor.
- AI sohbet ekranında gönüllü masa kadar görünür bir hizmet sınırı/sorumluluk notu yok.
- Program sayfasındaki “Bu programı mentor masasına taşı” CTA'sı yalnızca `/ai-mentor` rotasına gider; program bağlamını taşımıyor.

**Karar**

- Ya sistem promptu kaynaklı kabul detaylarıyla genişletilmeli ya da soru/vaat kapsamı program keşfiyle sınırlandırılmalı.
- Her AI yanıt yüzeyinde kısa sabit not bulunmalı: “İlk yönlendirme içindir; tarih, ücret, burs ve resmî koşulları kaynak sayfasından doğrula.”
- Yanıtta kullanılan program kaydı varsa resmî program bağlantısı sunulmalı.
- “Kişiselleştirilmiş yol haritası” çıkarılmalı; profil gerçekten prompta bağlanırsa geri getirilebilir.
- Program CTA'sı program adı/id/URL bağlamını chat başlangıcına taşımalı veya “AI masasına git” diye daha dürüst adlandırılmalı.

**Kabul kriteri**

- AI, promptunda bulunmayan ücret/burs/tarih için kesin yanıt vermemesi yönünde açık talimat taşır.
- Kullanıcıya görünür kaynak ve sınır notu vardır.
- CTA metni ve gerçek navigasyon davranışı aynı şeyi vaat eder.

---

### P0-05 — ISEE'yi “hesap” değil, sınırlı bir simülasyon olarak çerçevele

**Bulgular**

- Sonuç başlığı “Hesaplanan ISEE”; ana sayfa “burs ve harç indirimi şansınızı hesaplayın” diyor.
- Hub, işlemin “5 dakika” sürdüğünü ve burs başvurusunun ilk adımı olduğunu kesin ifade ediyor.
- Araç, öğrenci özerk değilse aile çekirdeğinin gerektiğini söylüyor; fakat doğru aile çekirdeğinin girildiğini zorunlu kılmıyor veya sonucu bu duruma göre bloke etmiyor.
- Resmî olmayan sonuç, görsel hiyerarşide uyarıdan önce ve daha güçlü sunuluyor.
- Olumlu taraf: 2026 kaynağı mevcut ve 9.000 EUR özerklik eşiği [resmî 2026 DSU talimatıyla](https://www.lavoro.gov.it/strumenti-e-servizi/isee-istruzioni-2026) uyumlu.

**Karar**

- Sonuç başlığı **“Tahmini ISEE simülasyonu”** olmalı.
- Özerk olmayan öğrenci aile verisini girmediyse sayı “başvuru değeri” gibi sunulmamalı.
- “5 dakika” ölçülmediyse çıkarılmalı.
- “Burs şansını hesapla” yerine “ISEE kalemlerini önceden gör” kullanılmalı.
- Sonuç yakınında şu açıklama bulunmalı: “Bu değer attestazione değildir; başvuruda yalnızca INPS/CAF üzerinden düzenlenen ISEE/ISEEUP geçerlidir.”
- Formül ve 2026 kural seti her yıl uzman tarafından yeniden doğrulanmalı.

**Kabul kriteri**

- “Resmî”, “kesin”, “şans” ve ölçülmemiş süre vaadi yoktur.
- Özerklik/aile çekirdeği hatası kullanıcıya sayıdan önce gösterilir.
- Kaynak yılı ve son metodoloji kontrol tarihi görünürdür.

---

### P0-06 — Topluluk atlasını tekrar doğrula ve risk durumunu göster

**Bulgular**

- 19 kaydın tümü 10 Mart 2026 tarihinde kontrol edilmiş görünüyor.
- Bir kayıt `limited`; UI bu durumu göstermiyor.
- `verificationSource` ve `status` veri modelinde var, satırda görünmüyor.
- “Yıllardır ayakta”, “her gün ilan”, “her topluluk üye tarafından onaylandı” gibi kanıt yükü yüksek ifadeler var.
- Konaklama gruplarında dolandırıcılık/kapora riski için görünür güvenlik notu yok.

**Karar**

- Tüm 19 bağlantı insan eliyle tekrar kontrol edilmeli.
- Her satırda `aktif / sınırlı / doğrulanamadı`, doğrulama türü ve son kontrol tarihi gösterilmeli.
- Kanıtı olmayan süre, hareketlilik ve büyüklük ifadeleri çıkarılmalı.
- Housing kayıtlarında sabit uyarı olmalı: ilanı ve kimliği doğrulamadan ödeme/kapora gönderme.
- Kullanıcı önerisi yalnızca link değil; grup adı, şehir, amaç, doğrulayan kişi ve onay tarihi alanlarıyla alınmalı.

**Kabul kriteri**

- `limited` kayıt aktif kayıtla aynı şekilde görünmez.
- Tazelik süresi aşılmış topluluk satırı otomatik olarak “yeniden kontrol gerekli” durumuna geçer.
- UI veri modelindeki `status` ve `verificationSource` alanlarını gerçekten kullanır.

---

### P0-07 — Yasal vaatleri gerçek operasyonla eşleştir

**Bulgular**

- Yasal belgeler 20 Temmuz 2026 tarihli ve mentor kapsamını iyi anlatıyor.
- Ancak tasarım belgelerinde `contact@italypath.com` adresi başlangıçta placeholder olarak işaretlenmiş; production alıcılığı repo içinden doğrulanamıyor.
- Metin hesap/veri silme uygulandığında mentor görüşmeleri ve diğer verilerin kaldırılacağını söylüyor; repo içinde Clerk hesap silme webhook'u yok. Bu vaat manuel runbook'a dayanıyor.
- Çerez politikası analitik aracını isimsiz ve “kişisel veri toplamaz” diye tanımlıyor. Vercel Web Analytics gerçekten cookie kullanmadan anonim/aggregate çalıştığını belirtiyor; yine de [Vercel'in kendi dokümanı](https://vercel.com/docs/analytics/privacy-policy) URL, referrer, ülke, cihaz ve tarayıcı gibi veri noktalarını açıklar ve hassas URL/query değerleri için yapılandırma önerir.
- Kimlik doğrulama, veri saklama ve AI sağlayıcıları metinde isimleriyle belirtilmiyor.

**Karar**

- İletişim adresinin gerçekten alıp yanıt verdiği doğrulanmalı.
- Hesap/veri silme için sorumlu kişi, SLA, Supabase/Storage/mentor temizliği ve kanıt kaydı içeren operasyon checklist'i oluşturulmalı.
- Sağlayıcı adları, veri kategorileri, aktarım amacı ve saklama yaklaşımı hukukçu ile gözden geçirilmeli.
- “Kişisel veri toplamaz” gibi mutlak cümle yerine kullanılan analitik veri noktaları açık ve ölçülü anlatılmalı.
- Auth altındaki “devam ederek gizlilik politikasını kabul edersiniz” cümlesi hukukçu tarafından kontrol edilmeli; gizlilik bildirimi çoğu durumda bir rıza sözleşmesi değil, aydınlatma metnidir.

**Kabul kriteri**

- Her yasal vaat için çalışan operasyon veya doğrulanmış sağlayıcı davranışı vardır.
- Production iletişim adresi test edilmiştir.
- Hukukçu inceleme tarihi ve sürüm notu belge metadata'sında tutulur.

---

### P0-08 — Mevcut lansman dokümanlarını kullanım dışı işaretle

**Bulgular**

- `docs/LAUNCH_STRATEGY_INSTAGRAM_TIKTOK.md` hâlâ 240 program diyor.
- `docs/CAMPAIGN_PLAN_LAUNCH.md` bir yerde `italypath.com` kullanıyor.
- İki doküman gerçekte olmayan “premium erişim” teklifini öneriyor.
- “Bölge bölge burs miktarları” öneriliyor; ürün şu anda çoğunlukla kurum, eşik ve başvuru penceresi sunuyor.
- “Bursumu hesapladım — inanamadım”, “kimse söylemedi ama” gibi kalıplar ItalyPath'ın sakin ve güvenilir editorial tonuyla uyuşmuyor.
- İlk kullanıcı geri bildirimi, giveaway ve influencer karşılığı gibi maddeler için izin, gerçek fayda ve sosyal kanıt süreci tanımlı değil.

**Karar**

- Bu iki dosyanın başına **`ARCHIVED — DO NOT USE FOR CURRENT CLAIMS`** uyarısı eklenmeli veya yerlerine tek güncel launch brief yazılmalı.
- Yeni brief yalnızca canlı ürün kanıtlarını kullanmalı.
- “Premium”, “burs miktarı”, “resmî soru”, kullanıcı sayısı ve testimonial gibi iddialar kanıtsız yayınlanmamalı.

**Kabul kriteri**

- Aktif kampanya dokümanında 240 program, `.com` ürün URL'si, premium erişim ve ölçülmemiş sosyal kanıt kalmaz.
- Her kampanya iddiasının repo/veri kaynağı veya onay sahibi vardır.

---

## 6. P1 — Güven düzeltmelerinden sonraki ana sprint

### P1-01 — Üniversite ücretlerini kaynaklı ve program düzeyinde anlat

- 64 üniversitenin 33'ünde aynı `150€ - 3.000€` bandı var; kullanıcı bunu güncel okul ücreti sanabilir.
- Üniversite masthead'i bunu “Yıllık Ücret” diye gösteriyor, fakat kaynak tarihi yok.
- Program metadata açıklaması da aynı okul geneli ücreti her programa taşıyor.

**Öneri:** Üniversite seviyesinde “Gösterge ücret bandı” etiketi kullan; akademik yıl ve kaynak ekle. Kabul detayı olan programda `tuitionOrFeesLink` esas CTA olsun. `Özel Ücret` gibi bilgi taşımayan değerleri “Resmî ücret sayfasını kontrol et” durumuna çevir.

### P1-02 — Kabul detaylarında kapsam ve tazeliği görünür yap

- 1.017 programın 594'ünde kabul dosyası var.
- 423 program “kabul detayları yakında” durumunda.
- Kaynak alma tarihleri veride mevcut fakat kullanıcıya gösterilmiyor.
- `uncertain` alanları kullanıcıya `application_deadline_non_eu` gibi iç anahtarlarla çıkabiliyor.

**Öneri:** “594 kaynaklı kabul dosyası” gibi canlı kapsama mesajı kullan; her panelde en son kaynak tarihi göster; belirsiz alan anahtarlarını TR/EN sözlükle çevir; kaynak alıntısının tamamını değil, ilgili alan-kaynak ilişkisini sun.

### P1-03 — Ana sayfa değer önerisini kanıt düzeyine indir

Sorunlu mevcut kalıplar:

- “En güncel veritabanı” — karşılaştırmalı kanıt yok.
- “Kişiselleştirilmiş yol haritası” — profil AI promptuna gitmiyor.
- “Güvenle sakla” — private storage var; yine de güvenlik iddiası teknik kapsamıyla anlatılmalı.
- “Sadece bir danışmanlık değil” — yasal metin platformun danışmanlık olmadığını söylüyor.
- “Hepsi tek hesapta toplansın” — ISEE sonucu ve burs seçimi hesapta saklanmıyor.

**Önerilen ana sayfa metin seti**

**Hero alt metni**

> Programları karşılaştır, resmî başvuru kaynaklarına ulaş; burs, ISEE ve belge sürecini aynı çalışma alanından takip et.

**Bölüm başlığı altı**

> Araştırmadan başvuru dosyana kadar daha düzenli ilerle.

**Üniversite kartı**

> Canlı program kataloğunu şehir, seviye ve okul türüne göre tara. Kaynaklı kabul dosyası bulunan programlarda resmî sayfalara doğrudan git.

**AI kartı**

> Canlı program kataloğuyla hızlı bir ilk yön bul. Tarih, ücret ve burs koşullarını resmî kaynaktan doğrula.

**Belge kartı**

> Başvuru belgelerini özel belge cüzdanında türlerine göre düzenle ve ihtiyaç duyduğunda yeniden aç.

**Kapanış metni**

> Programlarını kısa listeye al, SAT ilerlemeni kaydet ve başvuru belgelerini tek çalışma dosyasında düzenle.

### P1-04 — TR/EN sistemini tek yayın modeline bağla

- 19 UI dosyasında görünür metinler `language === "tr" ? ... : ...` biçiminde hard-code.
- Agent kuralı yeni metinlerin `lib/translations.ts` içinde paralel tutulmasını istiyor.
- İngilizce içerik client-side toggle ile aynı URL'de; İngilizce acquisition/SEO stratejisi için ayrı indexlenebilir URL ve metadata yok.
- Dynamic metadata İngilizce, bazı liste/ana sayfa metadata'ları Türkçe; sonuç karışık bir arama dili.

**Öneri:** Önce tüm görünür metinleri translation namespace'e taşı. Ardından stratejik karar ver:

1. EN yalnızca uygulama içi kolaylık ise bunu SEO hedefi yapma.
2. EN büyüme kanalı ise `/en/...` veya locale routing, İngilizce metadata, canonical/hreflang ve ayrı editorial QA kur.

### P1-05 — Hub önerilerinin nedenini açıkla

- Hub'ın deterministic eşleştirme motoru iyi ve canlı alan kapsaması %92.
- “Sana özel” ifadesi makul; ancak kullanıcının hangi yanıtının hangi sonucu etkilediği görünür değil.
- “Alanını biraz genişlettik” notu iyi bir başlangıç.

**Öneri:** Her öneride 1–2 neden etiketi göster: “seviye eşleşti”, “şehir tercihin”, “kaynaklı kabul dosyası var”. Böylece kişiselleştirme iddiası şeffaflaşır.

### P1-06 — Belge cüzdanında güvenlik ve işlev kelimelerini hassaslaştır

- “Belge Tara” kullanıcıya OCR/doğrulama beklentisi verebilir; akış esas olarak dosya/resim yükler.
- Eski translation kayıtlarında “Pasaport doğrulandı”, “Kontrol tamamlandı”, “Şifreli klasör” gibi ürünün kanıtlamadığı metinler bulunuyor; aktif import edilmese bile tekrar kullanılma riski var.

**Öneri:** `Belge Tara` yalnızca kamera capture gerçekten varsa kalsın; yoksa `Fotoğraf Çek`. `Doğrulandı`, `kontrol edildi`, `şifreli` kelimelerini gerçek teknik/operasyonel karşılığı olmadan kullanma. Legacy demo metinlerini sil veya “kullanma” olarak işaretle.

### P1-07 — Mentor masası insan vaadini operasyonla eşleştir

- V1 gerçekte tek operator allowlist'iyle çalışıyor.
- Metin “aynı yoldan geçmiş, halen İtalya'da yaşayan öğrenciler” çoğul ve doğrulanmış ekip izlenimi veriyor.

**Öneri:** Ekip yapısı gerçekten doğrulanana kadar “ItalyPath gönüllü operatörü” veya “öğrenci deneyimine dayalı gönüllü ekip” gibi daha ölçülü ifade kullan. Yanıt süresi garantisi verme; mevcut asenkron/sınırlı notunu koru.

### P1-08 — Dönüşüm ölçümünü kurmadan A/B testine başlama

Şu anda `@vercel/analytics` pageview topluyor; özel event yok. Ölçülmesi gereken temel funnel:

```text
Landing
  -> üniversite araması
  -> program detayı
  -> resmî kaynak tıklaması veya favori
  -> kayıt başlangıcı
  -> kayıt tamamlandı
  -> onboarding tamamlandı
  -> ilk değer (favori / SAT yanıtı / belge / mentor mesajı)
```

İlk event seti:

- `home_primary_cta_clicked`
- `university_search_used`
- `program_opened`
- `official_source_clicked`
- `favorite_added`
- `signup_started`
- `signup_completed`
- `onboarding_completed`
- `isee_completed`
- `scholarship_source_clicked`
- `sat_session_started`
- `mentor_conversation_started`

Event'lerde e-posta, ad, mesaj, belge adı veya serbest metin gönderilmemeli.

---

## 7. P2 — Editoryal sistem ve polish

### P2-01 — Terminoloji sözlüğü

Önerilen ana terimler:

| Şu an karışan kullanım | Standart |
| --- | --- |
| bölüm / department / degree | **program**; yalnız akademik organizasyon birimi kastediliyorsa bölüm |
| single-cycle / tek devre | **tek döngülü program** veya ekipçe seçilecek tek karşılık |
| Hub / çalışma merkezi / çalışma dosyası | Kullanıcıya görünen ana ad: **Çalışma Dosyam** |
| AI Mentor / ItalyPath AI / AI'ya sor | Marka adı: **ItalyPath AI**; CTA: **AI'a sor** |
| Burs Haritası / Burs Atlası | Navigasyon: **Burslar**; sayfa adı: **Bölgesel Burs Atlası** |
| Ajanın Tüyosu | **Editör Notu** |
| EU Deadline / Non-EU Deadline | **AB/AEA son tarihi** ve **AB/AEA dışı son tarih**; kapsam kurala göre netleştirilmeli |
| resmi / doğrulanmış / güncel | Yalnız kaynak ve kontrol tarihi varsa kullanılmalı |

Not: “AB/AEA” karşılığının her üniversitenin gerçek aday sınıflandırmasını karşılamadığı durumlar olabilir. Veri kaynağındaki kategori neyse etiket onu açıklamalı; tek bir hukuki kategori varsayılmamalı.

### P2-02 — ItalyPath ses tonu

**Olmalı**

- Sakin, açık, öğrenciye yukarıdan bakmayan.
- Önce sonuç, sonra açıklama.
- Resmî İtalyanca terimi ilk kullanımda Türkçe karşılığıyla veren.
- Belirsizliği saklamayan.
- Kullanıcının bir sonraki adımını açık söyleyen.

**Olmamalı**

- “İnanamayacaksın”, “kimse söylemedi”, “en iyi”, “en güncel”, “kusursuz”, “zirvede”.
- Kanıtsız güvenlik, popülerlik, hız veya kişiselleştirme iddiası.
- Korku üzerinden dönüşüm: son tarih baskısı yalnız gerçekten aktif ve kaynaklıysa kullanılmalı.
- Kurumla resmî ilişki veya danışmanlık izlenimi.

### P2-03 — Metin biçim standardı

- Tarih: `22 Temmuz 2026, 12.00`.
- Akademik yıl: `2026/27` kısa kullanım; kaynak başlığında gerekiyorsa `2026/2027`.
- Para: Türkçe metinde `25.000 €`; resmî kaynaktaki yazım alıntılanıyorsa aynen korunabilir.
- Kaynak etiketi: `Kaynak · Kurum · 5 Temmuz 2026'da kontrol edildi`.
- Dış bağlantı CTA'sı: `Resmî program sayfasını aç` gibi hedefi açıklamalı.
- Emoji, yüksek etkili hata/404 metinlerinde dekoratif kullanılmamalı.
- Bir paragraf bir ana fikir; web paragrafı çoğunlukla 2–4 cümle.

---

## 8. Kaynak ve güncellik politikası

### Kaynak sınıfları

1. **Resmî kaynak:** üniversite, bölgesel kurum, bakanlık, INPS, College Board gibi birincil kaynak.
2. **Birinci taraf ürün verisi:** ItalyPath canlı program sayısı, kullanıcıya ait favori/belge/SAT ilerlemesi.
3. **Üçüncü taraf toplu veri:** Numbeo gibi kaynaklar; resmî gerçek değil, gösterge değer.
4. **Öğrenci teyidi:** kim tarafından ve ne zaman doğrulandığı kayıtlı deneyim.
5. **Editör değerlendirmesi:** olgu değil, açıkça `Editör Notu` olarak etiketlenmiş yorum.

### Önerilen tazelik süreleri

| İçerik | Kontrol sıklığı |
| --- | --- |
| Aktif burs çağrısı | Haziran–Eylül arasında haftalık; son 14 günde daha sık |
| Program son tarihi | Başvuru dönemi boyunca 14–30 gün; dönem dışında 90 gün |
| Program koşulu/belgesi | Her akademik yıl ve resmî çağrı değişiminde |
| Üniversite ücret bandı | Akademik yıl başına en az bir kez |
| Şehir maliyeti | 90 gün |
| Topluluk bağlantısı | 30 gün; konaklama gruplarında daha sık |
| ISEE metodolojisi | Her yeni DSU/ISEE düzenlemesinde ve yılda en az bir kez |
| Yasal metin | Sağlayıcı/veri akışı değişiminde; üç ayda bir operasyon kontrolü |
| Ürün vaadi ve sayıları | Her release ve kampanya öncesi |

### İçerik kayıt alanları

Her zaman hassas içerikte en az şu alanlar bulunmalı:

```text
source_type
source_name
source_url
retrieved_at
academic_year
editorial_status      # draft | reviewed | published | stale
review_due_at
reviewed_by
uncertainty_note
language_status       # tr_ready | en_ready | partial
```

---

## 9. İçerik stratejisi: güven düzeltmelerinden sonra

Yeni bir blog hacmi yaratmadan önce mevcut 1.087 indexlenebilir ürün sayfasının kalite ve iç linkleri güçlendirilmeli. İlk içerik sütunları:

### 1. Program seçimi ve kabul

- Aranabilir: “İtalya'da İngilizce lisans programları”, alan + seviye + şehir rehberleri.
- Ürün bağlantısı: program kataloğu, kaynaklı kabul dosyaları, favoriler.

### 2. Burs, ISEE ve gerçek maliyet

- Aranabilir: 2026/27 bölgesel burs çağrıları, ISEE Università, ISEEUP/ISEE parificato.
- Ürün bağlantısı: burs atlası, ISEE simülasyonu, şehir maliyetleri.

### 3. Başvuru operasyonu

- Aranabilir: pre-enrollment, belge listesi, program son tarihleri, resmî çağrı okuma rehberi.
- Ürün bağlantısı: program kabul paneli, belge cüzdanı, mentor.

### 4. Şehir ve öğrenci yaşamı

- Aranabilir/paylaşılabilir: kaynaklı kira göstergeleri, kampüs-ulaşım ilişkisi, şehir karşılaştırmaları.
- Ürün bağlantısı: şehir atlası, üniversiteler, burs bölgesi.

### 5. Gerçek öğrenci deneyimi

- Paylaşılabilir: izinli ve isimlendirilmiş deneyim notları, gönüllü röportajları, süreç hataları.
- Ürün bağlantısı: topluluk atlası ve gönüllü mentor.
- Kural: anonim uydurma testimonial veya kanıtsız “herkes böyle yapıyor” anlatısı yok.

İlk üç editorial içerik önerisi:

1. **2026/27 İtalya bölgesel burs takvimi** — aranabilir, yüksek aciliyet, ürünle doğrudan bağlı.
2. **Türkiye'den başvuran öğrenci için ISEE Università ve ISEEUP rehberi** — aranabilir, yüksek güven etkisi.
3. **Bir program çağrısı nasıl okunur? Son tarih, dil şartı ve belge kontrol listesi** — aranabilir, program sayfalarına doğal iç link üretir.

Anahtar kelime hacmi verilmediği için bu sıra search volume'a değil; kullanıcı riski, ürün-pazar uyumu ve mevcut içerik boşluğuna göre önerildi.

---

## 10. Test fikirleri

P0 kapanmadan ikna gücünü artıran deneyler yapılmamalı. Önce doğruluk, sonra test.

Ölçüm kurulduktan sonra:

1. **Hero CTA testi**  
   Kontrol: `Üniversiteleri İncele`  
   Varyant: `Programları Karşılaştır`  
   Başarı: program detayı açma + resmî kaynak tıklama.

2. **Program kaynağı CTA testi**  
   Kontrol: üstte üç küçük kaynak butonu.  
   Varyant: son tarih/koşul bloklarının yanında bağlamsal `Bu bilgiyi resmî sayfada doğrula`.  
   Başarı: resmî kaynak tıklama; hemen çıkma artışı ayrıca izlenmeli.

3. **Kayıt değeri testi**  
   Kontrol: `Hesap oluştur`.  
   Varyant: `Kısa listemi kaydet`.  
   Yalnız favori bağlamında gösterilmeli. Başarı: kayıt tamamlama + ilk favori.

4. **Onboarding açıklama testi**  
   Kontrol: dört soru.  
   Varyant: her adımda “Bu cevap neyi etkiler?” tek cümlesi.  
   Başarı: onboarding tamamlama ve ilk program açma.

---

## 11. Guard boşlukları

Mevcut kontroller teknik yapı ve görsel sözleşmeleri iyi koruyor; editorial gerçekliği yeterince korumuyor.

| Guard | Geçiyor mu? | Kaçırdığı kritik konu |
| --- | --- | --- |
| `check:editorial-ui` | Evet | Metin doğruluğu, kanıt ve güncellik kontrol etmiyor. |
| `check:cities` | Evet | 29 fallback şehirde üretilen fiyat/yaşam iddialarına izin veriyor. |
| `check:scholarships-ui` | Evet | Akademik yıl ve tazelik denetlemiyor. |
| `check:sat-bank` | Evet | Canlı soru sayısı, bölüm dağılımı ve açıklama kapsamını kontrol etmiyor. |
| `check:program-details` | Evet | Belirli okul kayıtlarını doğruluyor; toplam coverage/tazelik eşiği vermiyor. |
| `check:hub-onboarding` | Evet | Canlı alan coverage %92; öneri nedenlerinin UI'da açıklanmasını denetlemiyor. |

Eklenmesi önerilen guard'lar:

- `check:editorial-claims`: sayı ve ürün kapsamı iddialarını canlı/tek kaynak sabitleriyle eşleştirir.
- `check:content-freshness`: burs, şehir ve topluluk `review_due_at` ihlallerini raporlar.
- `check:translation-surface`: görünür TR/EN hard-code kullanımını allowlist dışında yasaklar.
- `check:legal-ops`: production iletişim adresi, silme runbook'u ve sağlayıcı listesinin mevcut olduğunu doğrular; hukuk uygunluğunu otomatik iddia etmez.

---

## 12. Uygulama sırası

### İlk 24 saat

1. SAT `1.400+` ve Reading & Writing vaadini düzelt.
2. Ana sayfadaki “en güncel”, “kişiselleştirilmiş”, “tek hesapta” gibi kanıtsız iddiaları yumuşat.
3. Şehir fallback'lerinde sayısal maliyetleri kapat.
4. Lansman dokümanlarını arşiv/uyarı durumuna al.

### İlk 72 saat

1. Lazio, Emilia-Romagna ve Toscana başta olmak üzere 2026/27 burs verilerini güncelle.
2. AI ve ISEE yüzeylerine görünür kapsam/sorumluluk notları ekle.
3. Topluluk linklerini yeniden kontrol et; durum rozetlerini göster.
4. Production iletişim ve silme operasyonunu doğrula.

### İlk iki hafta

1. 8 `verified-full` burs bölgesini 2026/27'ye tamamla.
2. Üniversite ücret bandı ve kabul kaynağı güncellik modelini UI'a ekle.
3. TR/EN görünür metinleri translation sistemine taşı.
4. Temel dönüşüm event'lerini kur.
5. Editorial style guide ve claim checklist'i repo standardı yap.

### Sonraki aşama

P0/P1 tamamlandıktan sonra 2026/27 burs takvimi ve ISEE Università rehberiyle içerik büyümesine başla. İlk A/B testi ancak event verisi güvenilir biçimde akmaya başladıktan sonra yapılmalı.

---

## 13. Yayın öncesi editorial checklist

Her yeni sayfa, veri importu veya kampanya için:

- [ ] Ana hedef kitle ve istenen sonraki adım tek cümlede belli mi?
- [ ] Başlık 5 saniyede ne olduğunu anlatıyor mu?
- [ ] Her sayı ve tarih için kaynak + kontrol tarihi var mı?
- [ ] “Resmî”, “güncel”, “güvenli”, “kişiselleştirilmiş”, “en iyi” kelimeleri kanıtlı mı?
- [ ] Eksik veya belirsiz bilgi açıkça işaretlendi mi?
- [ ] CTA tıklanınca vaat edilen bağlam gerçekten taşınıyor mu?
- [ ] TR ve EN metinleri aynı anlam ve kanıt düzeyinde mi?
- [ ] Yüksek etkili mali/hukuki karar için resmî kaynağa çıkış var mı?
- [ ] Kişisel veri veya mesaj içeriği analitik event'e gitmiyor mu?
- [ ] Mobilde kaynak, tarih ve uyarı ana bilginin altında kaybolmuyor mu?
- [ ] İlgili freshness ve claim guard'ı geçiyor mu?

---

## Sonuç

ItalyPath'ın en güçlü tarafı geniş program kataloğu değil; **kaynak, belirsizlik ve öğrencinin sonraki adımını aynı yüzeyde buluşturabilme potansiyeli**. Şu an en büyük editorial risk, güçlü görsel güvenin bazı eski veya üretilmiş bilgileri olduğundan daha kesin göstermesi.

Önce kesinlik seviyesini doğru anlatırsak, ürün daha az iddialı değil; daha güvenilir olur. ItalyPath'ın savunulabilir marka avantajı da burada kurulabilir.
