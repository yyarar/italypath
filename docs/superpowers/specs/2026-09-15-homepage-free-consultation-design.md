# Ana Sayfa: Ücretsiz Ön Görüşme Odağı — Tasarım

Tarih: 2026-09-15
Durum (2026-09-21): **UYGULANDI** — 218b2a5 + 2848933 (2026-09-15). Tasarım sırasındaki durum: "Kerem onayı bekliyor".
Önizleme (yerel, commit edilmez): `/communities/prototype/ana-sayfa?v=b`, kaynak `components/prototypes/home/`

## Amaç

Sitenin ilk gelir modeli ücretli danışmanlıktır; müşteriye giden kapı mevcut ücretsiz uzman ön görüşme formudur (`expert_leads`, WhatsApp dönüşü). Bugün ana sayfa yalnızca ücretsiz araçları tanıtıyor, ön görüşme mentor sayfasında üçüncü masa olarak gizli kalıyor.

Hedef: ana sayfada tüm ücretsiz araçlar net görünsün **ve** ücretsiz ön görüşme sayfanın ana çağrısı olsun. Ziyaretçinin çoğu Google'dan program/burs/ISEE sayfalarına indiği için bu sayfalardan da ön görüşmeye yol açılsın.

Başarı ölçütü: ön görüşme formuna ana sayfa, `/on-gorusme` ve içerik sayfalarından en fazla bir tıklamada ulaşılır; mevcut SEO/erişim/veri sözleşmelerinin hiçbiri bozulmaz.

## Alınmış kararlar (tartışmaya açılmaz)

- Fiyat/paket gösterilmez; yalnızca yardım alanları gösterilir. Fiyat ön görüşmede konuşulur.
- "Biz kimiz" bölümü yok. Güven: "ilk görüşme ücretsiz, bağlayıcı değil", süreç adımları, resmi kaynaklı veri.
- Sahte yorum, uydurma başarı sayısı, uydurma yanıt süresi yok.
- Mevcut ana sayfa tasarımı korunur; sıfırdan yeniden tasarım yok. Önizlemede **B** seçildi.
- Form hem ana sayfa bölümünde hem ayrı `/on-gorusme` sayfasında yaşar.
- Bologna ev hizmeti ve IMAT uygulaması bu işin kapsamı dışında.

## Kapsam

### 1. Ana sayfa (`components/HomePageClient.tsx`)

Yeni sıra:

1. `HeroSection` — mevcut. Tek değişiklik: ikinci buton "Planımı oluştur" yerine turuncu (terracotta) **"Ücretsiz ön görüşme al"**; `#on-gorusme` bölümüne kaydırır. "Nereden başlamak istersin?" paneli aynen kalır (d162365'teki ISEE düzenlemesiyle).
2. **`HomeToolsSection` (yeni, `FeaturesSection` yerine)** — `#araclar`. 7 araç kartı: Üniversite ve program rehberi (geniş kart, canlı sayılar), Bölgesel burs haritası, ISEE hesaplayıcı, SAT soru bankası ("ücretsiz hesapla"), Şehir rehberleri, Topluluk atlası, Çalışma dosyası ve belgeler ("ücretsiz hesapla"). Sayı etiketleri canlı veriden ya da mevcut sabitlerden gelir (`stats`, `20 bölge`, `1.400+ SAT sorusu`, şehir kataloğunun gerçek uzunluğu); hard-code sayı eklenmez.
3. **`ConsultationSection` (yeni)** — `#on-gorusme`. Koyu (ink) blok: başlık, açıklama, üç güven rozeti, 5 yardım alanı (form konu seçenekleriyle aynı), 3 adımlık "Nasıl çalışır", sağda gerçek `ExpertLeadForm`. Başarılı gönderimde form yerine başarı mesajı gösterilir (mentor masasına dönüş butonu olmadan).
4. `HomeStoryBand` — mevcut.
5. `VelocityBridge` — mevcut.
6. `ScholarshipsSection` — mevcut.
7. `IseeSection` — mevcut.
8. **`HomeFaq` (yeni)** — 4 soru, `<details>` ile; yalnızca doğru bilinen cevaplar (ücretsiz mi, nasıl yapılır, hangi konular, araçlar için görüşme gerekir mi).
9. `HomeClosingCta` — birincil buton "Hesap oluştur" yerine **"Ücretsiz ön görüşme al"** (`#on-gorusme`); ikincil "Üniversiteleri keşfet" kalır; gövde metni iki yolu anlatacak şekilde güncellenir.
10. `Footer` — mevcut.
11. **`MobileConsultBar` (yeni)** — yalnızca `md` altı; hero geçilince görünür, `#on-gorusme` ekrandayken gizlenir; safe-area uyumlu.

`FeaturesSection.tsx` kaldırılır; yalnızca ona ait `t.features.*` metinleri başka yerde kullanılmıyorsa temizlenir. Guard'lardaki referanslar (`check-editorial-ui`, `check-auth-ui`, `check-university-data-source`) yeni dosyaya taşınır.

### 2. Ayrı sayfa `/on-gorusme`

- `app/on-gorusme/page.tsx` server wrapper + metadata (title, description, canonical `/on-gorusme`, Open Graph).
- İçerik: `Navbar` + `ConsultationSection`'ın sayfa varyantı (üst boşluk, H1 olarak başlık) + `HomeFaq` + `Footer`. Aynı bileşen, iki yerde; kopya kod yok.
- `proxy.ts` public listesine `/on-gorusme(.*)`; `check-route-access` matrisi güncellenir.
- `sitemap.ts` statik rotalarına eklenir; `robots` disallow'a eklenmez.
- `/ai-mentor?desk=expert` masası olduğu gibi kalır.

### 3. İçerik sayfalarında ön görüşme kutusu

Tek paylaşılan bileşen `ConsultPrompt` (mevcut `DetailMentorPrompt` görsel dilini izler), `/on-gorusme`'ye link verir:

- **Program detay** (`DepartmentDetailClient`): kabul dosyası panelinin altında. Mevcut ItalyPath AI taslak aksiyonu dokunulmaz.
- **Üniversite detay** (`UniversityDetailClient`): mevcut `DetailMentorPrompt` bugün duraklatılmış AI masasına gidiyor; ön görüşme kutusuna çevrilir.
- **Burs haritası** (`ScholarshipsExplorer`): sayfa sonunda, bölge panelinin altında.
- **ISEE** (`IseeCalculatorClient`): sonuç alanının altında.

Metin bağlama göre değişir (ör. "Bu programa başvurmak için yardım ister misin?"), ama tek bileşen ve tek link hedefi kullanır.

### 4. Üst menü

Masaüstü menüye "Ücretsiz ön görüşme" linki eklenir (`/on-gorusme`); "Danışma Masaları" linki kalır. Mobil menü değişmez (sabit alt buton zaten var). Menünün tamamı ileride ayrıca yeniden ele alınacak; bu değişiklik geçici ve küçük tutulur.

## Metin ve dil

Tüm yeni metinler `lib/translations.ts` altında TR + EN paralel eklenir (`homeTools`, `consultation`, `homeFaq`, `consultPrompt` namespace'leri; `homeApple` ve `homeClose` güncellenir). Önizlemedeki `copy.ts` Türkçesi başlangıç metnidir. Pazarlama metinlerinde marka ItalyPath kalır (sitenin mevcut adı).

## Veri, güvenlik, SEO sözleşmeleri

- Form gönderimi yalnızca mevcut `POST /api/expert-leads` üzerinden; yeni tablo, kolon, migration yok. Client dosyalarına service-role anahtarı girmez.
- Ana sayfa server wrapper + client leaf yapısı ve canlı stats akışı korunur; `BAILOUT_TO_CLIENT_SIDE_RENDERING` oluşmaz. Form ve sabit buton client leaf içinde.
- Gizli SEO metni yok; SSS görünür içeriktir. FAQ schema bu işte eklenmez.
- `app/data.ts` import edilmez.

## Hata durumları

- Form gönderim hatası: `ExpertLeadForm`'un mevcut hata mesajı ve bilgileri koruma davranışı.
- Stats alınamazsa kartlar sayı yerine mevcut "Canlı üniversite verisi" etiketine düşer.
- `IntersectionObserver` yoksa sabit buton yalnızca scroll eşiğine göre çalışır.

## Doğrulama

- `npm run build`, değişen dosyalarda `eslint`, `tsc`.
- `check:routes`, `check:expert-leads`, `test:expert-leads`, `check:auth-ui`, `check:university-data-source`, `check:scholarships-ui`, `check:isee`, `check:university-details-ui`, `check:admission-dossier`; guard'lar yeni bileşenleri tanıyacak şekilde güncellenir. (`check:editorial-ui` silinmiş `BottomNav.tsx`'i aradığı için zaten kırık; bu işte ilgili satır düzeltilir.)
- Tarayıcıda 375px ve masaüstü: yatay taşma yok, `#on-gorusme` kaydırması, sabit butonun görünme/gizlenme davranışı, `/on-gorusme` HTTP 200 + canonical + H1, içerik sayfalarındaki kutuların linki.
- Form uçtan uca production'da denenmez (gerçek lead oluşturur); yerelde doğrulama hatası akışı test edilir.

## Kapsam dışı (sonraya)

- Lead'in hangi sayfadan geldiğini kaydetmek (kaynak alanı; migration gerektirir).
- Buton tıklama analitiği (Vercel özel olaylarının mevcut planda kullanılabilirliği ayrıca kontrol edilmeli).
- Üst menünün yeniden düzenlenmesi, paket/fiyat sayfası, "biz kimiz".
- Önizleme dosyalarının silinmesi: uygulama bitince Kerem'e sorulur.
