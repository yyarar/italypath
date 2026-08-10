# ItalyPath Uzman Lead Masası — Tasarım Belgesi

Tarih: 2026-08-10  
Durum: Kerem ile brainstorming oturumunda onaylandı  
Uygulayıcı: Ayrı bir uygulayıcı agent  
Tasarım ve uygulama planı sorumlusu: Codex

---

## 1. Problem ve Amaç

`/ai-mentor` bugün üç danışma masası gösterir:

1. ItalyPath AI arayüzde geçici olarak duraklatılmıştır.
2. ItalyPath Gönüllü Ekip giriş yapan öğrenciler için aktif, kalıcı bir site içi
   yazışmadır.
3. ItalyPath Uzman `expert-lead + coming-soon` durumundadır ve yalnızca kilitli bir
   tanıtım ekranı gösterir.

Bu çalışmanın amacı ItalyPath Uzman masasını herkese açık bir lead toplama deneyimi
olarak açmaktır. Kullanıcı giriş yapmış olsun veya olmasın kısa bir form bırakabilmeli;
ItalyPath ekibi ücretsiz ön görüşme için kullanıcıya WhatsApp üzerinden ulaşabilmelidir.
İlk ön görüşme ücretsizdir. Kullanıcı sonrasında profesyonel destek almak isterse bu
hizmet ayrıca ve ücretli olarak sunulabilir; form göndermek satın alma veya ödeme
taahhüdü oluşturmaz.

Lead'ler Supabase'de ayrı bir tabloda tutulur ve yalnızca mevcut tek yetkili ItalyPath
operatörünün erişebildiği `/ekip/uzman` panelinden yönetilir. Gönüllü mesajlaşma tabloları,
hook'ları ve operatör kuyruğu uzman lead akışının veri modeli olarak kullanılmaz.

## 2. Onaylanan Ürün Kararları

- `/ai-mentor` danışma masaları hub'ı giriş yapan ve yapmayan herkese açılır.
- ItalyPath Uzman masası listede aynı adla kalır; seçildiğinde `Size ulaşalım.` başlıklı
  ayrı form deneyimi açılır.
- ItalyPath Gönüllü Ekip görüşmesi hesap gerektirmeye devam eder. Misafir kullanıcı
  gönüllü masayı seçerse `/giris` akışına gider ve girişten sonra gönüllü masa açılır.
- ItalyPath AI'ın duraklatılmış davranışı değişmez.
- Form, kullanıcının giriş durumundan bağımsız olarak aynı alanları gösterir. Clerk
  profilinden otomatik ad veya e-posta doldurulmaz.
- Dönüş kanalı yalnızca WhatsApp'tır; e-posta alanı alınmaz.
- Form tek ekranlıdır ve altı alanın tamamı zorunludur. Kararsız kullanıcılar için
  seçim alanlarında `Henüz karar vermedim` seçeneği bulunur.
- Aynı kişi daha sonra bilinçli olarak tekrar form gönderebilir. Telefon numarasına,
  hesaba veya zamana göre ürün seviyesinde tekrar gönderim engeli yoktur.
- Aynı gönderimin çift tıklama veya ağ retry'ı nedeniyle iki kez kaydolması ayrı bir
  submission kimliğiyle engellenir.
- Kullanıcıya görünür CAPTCHA, pazarlama izni veya zorunlu onay kutusu yoktur.
- V1'de bildirim yoktur. Operatör yeni talepleri paneli açarak veya `Yenile` düğmesiyle
  görür.
- Otomatik silme yoktur. Yetkili operatör talebi panelden onay sorusu sonrasında elle
  silebilir.
- `/ekip/mentor` ve `/ekip/uzman` ayrı modüller olarak kalır. Ortak `/ekip` admin ana
  sayfası bu çalışmanın kapsamında değildir.
- Uzman paneline yalnızca mevcut tek aktif `mentor_staff` operatörü erişir. Yeni rol,
  kullanıcı veya ayrı allowlist sistemi kurulmaz.

## 3. Başarı Ölçütü

Özellik şu koşullarda başarılıdır:

1. Misafir ziyaretçi danışma hub'ını açıp uzman formunu gönderebilir.
2. Başarılı gönderim Supabase'de eksiksiz tek bir lead satırı oluşturur.
3. Kullanıcı kesin kayıt oluşmadan başarı ekranı görmez; hata halinde form değerleri
   korunur.
4. Aktif operatör lead'i panelde görür, WhatsApp konuşmasını açar, durumunu ve iç notunu
   değiştirir ve gerektiğinde kaydı siler.
5. Anonim, normal authenticated veya yetkisiz kullanıcı lead satırlarını okuyamaz,
   değiştiremez ve silemez.
6. Gönüllü mesajlaşma ile duraklatılmış AI masası davranışları regresyona uğramaz.

## 4. Route ve Erişim Matrisi

| Route | Erişim | Davranış |
| --- | --- | --- |
| `/ai-mentor` | Public | Üç danışma masasını gösterir |
| `/ai-mentor?desk=expert` | Public | Uzman formunu açabilir |
| `/ai-mentor?desk=volunteer` | Hesap gerekir | Misafiri girişe yollar; girişten sonra gönüllü masayı açar |
| `/api/expert-leads` `POST` | Public | Yalnızca doğrulanmış yeni lead gönderimini kabul eder |
| `/api/expert-leads` diğer metodlar | Kapalı | Lead okuma/değiştirme API'si sunmaz |
| `/ekip/mentor` | Protected + aktif staff | Mevcut gönüllü gelen kutusu |
| `/ekip/uzman` | Protected + aktif staff | Yeni uzman lead paneli |

`proxy.ts` değişiklikleri:

- `/ai-mentor(.*)` public matcher'a eklenir ve `PROTECTED_PAGE_ROUTES` içinden çıkarılır.
- `/api/expert-leads(.*)` public matcher'a eklenir. Route yalnızca `POST` kabul eder ve
  kendi sunucu doğrulamasını uygular.
- `/ekip` protected prefix olarak kalır; iki ekip ekranı da mevcut özel `/giris` dönüş
  politikasını kullanır.

Public erişim otomatik olarak SEO indexleme kararı değildir. `/ai-mentor`, bu çalışmada
`robots.ts` disallow listesinden çıkarılmaz ve sitemap'e eklenmez. SEO/indexleme ayrı bir
ürün kararı olarak bırakılır.

`scripts/check-route-access.mjs`, yeni matrisi açıkça doğrulayacak şekilde güncellenir;
mevcut `/ai-mentor public olamaz` guard'ı tersine çevrilir.

## 5. Danışma Hub Davranışı

`lib/mentor/channels.ts` deneyim türlerini korur:

```ts
experience: "ai-chat" | "volunteer-inbox" | "expert-lead"
availability: "active" | "paused" | "coming-soon"
```

Yeni kanal durumu:

- ItalyPath AI: `ai-chat + paused`
- ItalyPath Gönüllü Ekip: `volunteer-inbox + active`
- ItalyPath Uzman: `expert-lead + active`

Hub CTA'sı deneyim türüne göre üretilir; bütün aktif masalara aynı `SOHBETE BAŞLA`
metni verilmez.

- Gönüllü CTA: mevcut sohbet/görüşme çağrısı
- Uzman CTA: `ÜCRETSİZ ÖN GÖRÜŞME ↗`
- Uzman meta: `Ön görüşme ücretsiz · WhatsApp`
- Uzman adı: `ItalyPath Uzman`

Misafir gönüllü masasını seçtiğinde hedef:

```text
/giris?redirect_url=%2Fai-mentor%3Fdesk%3Dvolunteer
```

Giriş dönüşünde sayfa `desk=volunteer` parametresini okuyup yalnızca authenticated
kullanıcı için `VolunteerDesk` açar. Program dossier'ından gelen mevcut `desk=ai`
bağlamı, AI `paused` olduğu sürece masayı açmama guard'ını korur. `desk=expert` public
deep-link olarak uzman formunu açabilir. Geçersiz `desk` değeri hub'da kalır.

## 6. Kullanıcı Form Deneyimi

Yeni kullanıcı yüzeyi `MentorChatRoom` içinde sahte bir chat veya kilitli ekran olarak
uygulanmaz. `expert-lead` deneyimi ayrı `ExpertLeadDesk` bileşenine yönlendirilir.

### 6.1 Başlık ve hizmet açıklaması

Form ekranının ana başlığı:

> Size ulaşalım.

Görünür açıklama şu üç gerçeği kısa ve açık biçimde taşır:

- İlk ön görüşme ücretsizdir.
- ItalyPath ekibi formdaki numaraya WhatsApp üzerinden ulaşır.
- Devamında profesyonel destek istenirse ücretli hizmet ayrıca sunulabilir; bu form bir
  ödeme veya satın alma değildir.

Kullanıcıya geri dönüş süresi için saat/gün SLA'sı verilmez.

### 6.2 Alanlar

| Alan | UI | Zorunlu | Saklanan değer |
| --- | --- | --- | --- |
| Ad soyad | Text input | Evet | Trim edilmiş görünür ad |
| WhatsApp numarası | Tel input | Evet | Ülke kodlu normalize numara |
| Hedef eğitim seviyesi | Select/radio | Evet | Sabit ID |
| İlgilenilen alan | Select | Evet | Sabit ID |
| Hedef başlangıç dönemi | Select | Evet | `YYYY-YYYY` veya `undecided` |
| Nasıl yardımcı olabiliriz? | Textarea | Evet | Trim edilmiş düz metin |

Eğitim seviyesi ID'leri:

```text
bachelor
master
undecided
```

Alan ID'leri mevcut profil sınıflandırmasıyla uyumlu kalır:

```text
engineering-tech
medicine-health
business-economics
design-architecture
natural-sciences
social-humanities
arts-fashion
law-politics
undecided
```

Hedef dönem seçenekleri, form açıldığı takvim yılından başlayan üç ardışık akademik
yılı (`2026-2027`, `2027-2028`, `2028-2029` örneği) ve `Henüz karar vermedim`
seçeneğini gösterir. Böylece her yıl çeviri dosyasında hard-code yıl güncellemesi
gerekmez. Sunucu `YYYY-YYYY` değerinde ikinci yılın ilk yıldan tam bir fazla olmasını
ve ilk yılın request anındaki UTC takvim yılının bir eksiği ile dört fazlası arasında
olmasını zorunlu kılar. Bu tolerans yılbaşı sınırında açık kalmış formları reddetmez.

### 6.3 Form doğrulaması

- `fullName`: trim sonrası 2–120 karakter
- `whatsappPhone`: başta zorunlu `+`; girişte rakam, boşluk, `(`, `)`, `-` kabul edilir;
  ayraçlar çıkarıldığında `+` sonrasında 8–15 rakam kalmalıdır. Yerel `05...` biçimi
  ülke kodu belirsiz olduğu için reddedilir ve kullanıcıdan `+90...` benzeri biçim istenir.
- `studyLevel`: yalnızca onaylı ID'ler
- `fieldOfInterest`: yalnızca onaylı ID'ler
- `targetIntake`: `undecided` veya ardışık iki yılı taşıyan `YYYY-YYYY`
- `helpRequest`: trim sonrası 10–3000 karakter
- Düz metin dışında içerik render edilmez.
- Alan hatası ilgili alanın yanında gösterilir; üstte genel bir hata özeti de olabilir.
- Hata halinde değerler ve mevcut `submissionId` korunur.

Form düğmesi gönderim sırasında kilitlenir. Kullanıcı formu başarıyla gönderdikten sonra
formun yerini başarı ekranı alır:

> Talebini aldık. Ekibimiz WhatsApp üzerinden en kısa sürede sana ulaşacak.

Başarı ekranında yalnızca `Masalara dön` eylemi bulunur. Yeni lead için aynı oturumda
ayrı bir `tekrar gönder` CTA'sı sunulmaz; kullanıcı masaya daha sonra yeniden girerse
yeni form açılır.

## 7. Veri Modeli

Yeni kurulum dosyası: `supabase/expert_leads.sql`.

Yeni tablo: `public.expert_leads`.

| Alan | Tip | Kural |
| --- | --- | --- |
| `id` | `uuid` | Primary key, DB üretir |
| `submission_id` | `uuid` | Not null, unique; ağ retry idempotency anahtarı |
| `full_name` | `text` | 2–120 trim edilmiş karakter |
| `whatsapp_phone` | `text` | Normalize ülke kodlu numara |
| `study_level` | `text` | `bachelor`, `master`, `undecided` |
| `field_of_interest` | `text` | Onaylı alan ID'lerinden biri |
| `target_intake` | `text` | `undecided` veya `YYYY-YYYY` |
| `help_request` | `text` | 10–3000 karakter düz metin |
| `status` | `text` | `new`, `contacted`, `completed`; default `new` |
| `internal_note` | `text` | Not null default `''`, en fazla 4000 karakter |
| `created_at` | `timestamptz` | UTC, DB default |
| `updated_at` | `timestamptz` | UTC, her gerçek admin mutation'ında güncellenir |

SQL, `updated_at` değerini her update'te DB saatine çeken idempotent bir trigger kurar;
client'ın gönderdiği timestamp authoritative kabul edilmez. Status geçişleri bilinçli
operatör düzeltmelerine izin vermek için `new`, `contacted` ve `completed` değerleri
arasında iki yönlüdür.

Index'ler:

- unique `submission_id`
- `(status, created_at desc)` panel filtresi
- `(created_at desc)` tüm talepler sırası

`types/index.ts` içine explicit `ExpertLeadRow` interface'i eklenir; generated Supabase
type altyapısı oluşturulmaz.

### 7.1 RLS ve yetki

- `expert_leads` için RLS etkinleştirilir.
- `anon` rolüne tablo yetkisi verilmez.
- Normal authenticated kullanıcı için insert veya kendi-lead'ini-okuma politikası
  oluşturulmaz; form gönderimi public server route üzerinden yapılır.
- `authenticated` rolüne select/update/delete grant'i verilebilir, ancak her işlem RLS
  içinde `public.is_active_mentor_staff()` koşuluna bağlıdır.
- Aktif staff olmayan authenticated kullanıcı sıfır satır görür ve mutation yapamaz.
- Insert yalnızca server-side service role üzerinden yapılır.
- `is_active_mentor_staff()` bağımlılığı nedeniyle production'da
  `supabase/volunteer_mentor.sql` kurulumu önkoşuldur; RLS gevşetilerek fallback yapılmaz.

## 8. Public Lead Gönderim API'si

Route: `app/api/expert-leads/route.ts`.

Yalnızca `POST` export edilir. Route:

1. JSON gövdesini boyut ve şekil açısından doğrular.
2. Ortak saf doğrulama helper'ıyla alanları sanitize eder.
3. `website` adlı, `autocomplete="off"`, tab sırasına ve erişilebilirlik ağacına girmeyen
   honeypot alanı doluysa kayıt oluşturmaz ve botun tekrar denemesini teşvik etmemek için
   normal başarıyla aynı gövdede `200` döner.
4. Server-only Supabase service-role client ile `expert_leads` insert'i yapar.
5. Aynı `submission_id` zaten varsa yeni satır açmadan başarılı idempotent sonuç döner.
6. İlk gerçek insert için `201`, idempotent tekrar için `200`, alan hatası için `400`,
   yapılandırma veya Supabase hatası için güvenli genel `503` döner.
7. Ham Supabase hata metnini, tablo adını veya secret bilgisini client'a göndermez.

API'de `GET`, `PATCH`, `PUT` veya `DELETE` lead yönetimi sunulmaz. Admin paneli Clerk'in
native session tokenı ve Supabase RLS üzerinden çalışır.

Honeypot kullanıcıya görünmez ve normal klavye/ekran okuyucu akışına girmez. V1'de IP
adresi toplama, telefon bazlı engel, CAPTCHA, Turnstile veya harici rate-limit servisi
yoktur. Gerçek spam görülürse bu kontroller ayrı bir ürün/güvenlik işi olarak ele alınır.

## 9. `/ekip/uzman` Operatör Paneli

Panel ayrı protected route'tur ve mevcut aktif `mentor_staff` yetkisini kullanır. Mevcut
gönüllü operatör hook'unun karmaşık Realtime state'i uzman paneline taşınmaz veya bu iş
için refactor edilmez.

### 9.1 Liste

- Varsayılan sıra: `created_at desc`
- Üst özet: `Yeni talepler: N`
- Filtreler: `Tümü`, `Yeni`, `İletişime geçildi`, `Tamamlandı`
- Satır özeti: ad soyad, oluşturulma zamanı, eğitim seviyesi, alan ve durum
- Boş durum ve yükleme/hata durumları her filtre için açıkça gösterilir.
- Realtime aboneliği veya otomatik polling yoktur.
- `Yenile` düğmesi yetkiyi ve mevcut filtre listesini yeniden yükler.

### 9.2 Detay ve işlemler

Seçili lead detayında:

- Formdaki altı alan
- Oluşturulma ve son güncellenme zamanı
- Durum seçimi
- İç not textarea'sı ve açık `Notu kaydet` eylemi
- `WhatsApp'tan ulaş` eylemi
- `Talebi sil` eylemi

WhatsApp linki normalize numaranın yalnızca rakam biçimini kullanarak `wa.me` hedefi
üretir ve yeni sekmede açılır. Linke tıklamak status'ü otomatik değiştirmez; operatör
durumu bilinçli olarak değiştirir.

Silme geri alınamaz. UI, lead'in adını taşıyan ikinci bir onay adımı gösterir ve yalnızca
onay sonrası delete gönderir. Başarılı silmede lead listeden kaldırılır ve seçili detay
temizlenir. Başarısız silmede satır ekranda kalır.

İç not yalnızca staff panelinde görünür; public API response'una veya kullanıcı başarı
ekranına hiçbir zaman girmez.

### 9.3 Responsive düzen

- Masaüstü: liste ve seçili detay yan yana
- Mobil: önce liste, ardından seçilen detay; geri eylemi listeye döner
- Mevcut paper/sage/terracotta editoryal dil, keskin border ve serif başlıklar korunur.
- Yeni gradient, dashboard UI kiti veya state kütüphanesi eklenmez.

Her iki ekip ekranında da küçük çapraz navigasyon bulunur:

- `/ekip/mentor` → `Uzman talepleri`
- `/ekip/uzman` → `Gönüllü görüşmeleri`

Ortak `/ekip` shell, sidebar veya ana dashboard bu işte yapılmaz.

## 10. Bileşen ve Modül Sınırları

Önerilen dosya sınırları:

| Birim | Sorumluluk |
| --- | --- |
| `components/mentor/expert/ExpertLeadDesk.tsx` | Uzman masa başlığı, form/success orkestrasyonu, masalara dönüş |
| `components/mentor/expert/ExpertLeadForm.tsx` | Altı alan, client doğrulama, submit ve korunmuş form state'i |
| `components/mentor/expert/ExpertLeadSuccess.tsx` | Onaylı başarı mesajı |
| `components/mentor/expert/operator/ExpertLeadInbox.tsx` | Yetki, filtre, liste/detay ve reload orkestrasyonu |
| `components/mentor/expert/operator/ExpertLeadList.tsx` | Filtrelenmiş lead listesi ve seçim |
| `components/mentor/expert/operator/ExpertLeadDetail.tsx` | WhatsApp, status, note ve delete işlemleri |
| `lib/mentor/expertLeads.ts` | Sabit ID'ler, domain tipleri, label yardımcıları, telefon ve intake helper'ları |
| `lib/mentor/expertLeadValidation.ts` | Client/server ortak saf payload doğrulaması |
| `lib/mentor/useExpertLeadInbox.ts` | Staff access check, Supabase read/update/delete ve korunmuş UI state'i |
| `lib/mentor/expertLeads.server.ts` | `server-only` service-role insert sınırı |
| `app/api/expert-leads/route.ts` | Public POST transport katmanı |
| `app/ekip/uzman/page.tsx` | Protected uzman panel route'u |
| `supabase/expert_leads.sql` | Tablo, constraints, index, grant ve RLS |

Kesin dosya sayısı uygulama planında küçük ölçüde birleştirilebilir; ancak şu sınırlar
bozulmaz:

- Public form, admin paneli ve server secret aynı modülde karışmaz.
- Hook'lar proje kuralına uygun olarak `lib/` altında kalır.
- Gönüllü inbox state/controller dosyaları uzman lead CRUD'u için yeniden kullanılmaz.
- Runtime kodu `app/data.ts` import etmez.
- Form ve admin copy'si TR/EN paralel olarak `lib/translations.ts` içinde tutulur.

## 11. Veri Akışı

### 11.1 Lead gönderimi

1. Kullanıcı ItalyPath Uzman masasını açar.
2. Client yeni UUID `submissionId` üretir.
3. Kullanıcı altı alanı doldurur; client hızlı geri bildirim için doğrular.
4. `POST /api/expert-leads` aynı alanları server'da yeniden doğrular.
5. Server service role ile tek satır insert eder.
6. Başarı cevabında form success ekranına geçer.
7. Network retry aynı `submissionId` ile gelirse unique constraint ikinci satırı engeller
   ve API yine başarı döner.

### 11.2 Panel

1. Clerk kullanıcı oturumu yüklenir.
2. `is_active_mentor_staff()` ile yetki doğrulanır.
3. Yetkiliyse lead listesi RLS üzerinden okunur; değilse hiçbir lead state'e alınmaz.
4. Filtre/seçim client UI state'idir; `Yenile` authoritative Supabase snapshot'ı getirir.
5. Status, note ve delete mutation'ları RLS altında çalışır.
6. Mutation başarılıysa local liste authoritative row ile güncellenir; başarısızsa eski
   görünür değer korunur.

## 12. Hata Durumları

### 12.1 Kullanıcı formu

- Geçersiz alan: ilgili alan hatası, form korunur.
- Network/API hatası: `Talebin şu anda gönderilemedi. Bilgilerin duruyor; tekrar
  deneyebilirsin.` benzeri genel mesaj, form korunur.
- `SUPABASE_SERVICE_ROLE_KEY` veya URL eksik: API `503`; sahte başarı yoktur.
- DB tablosu/constraint kurulmamış: API `503`; ham DB ayrıntısı yalnızca server log'una
  gider.
- Başarı sonrası sayfa refresh edilirse yeni boş form gösterilebilir; bu bilinçli yeni
  gönderime izin veren ürün kararıyla uyumludur.

### 12.2 Panel

- Auth yükleniyor: lead içermeyen yükleme yüzeyi
- Yetkisiz: lead içermeyen erişim reddi yüzeyi
- Access check/load başarısız: boş liste yanılsaması yerine retry'lı hata
- Status/note başarısız: optimistik kalıcı görünüm yok; eski değer korunur
- Delete başarısız: satır ve detay korunur
- Kullanıcı değişimi/logout: önceki operatör lead state'i derhal temizlenir

## 13. Dil, Erişilebilirlik ve Görsel Dil

- Bütün yeni kullanıcı ve operatör metinleri TR/EN paralel eklenir.
- Alan label'ları kalıcıdır; placeholder tek başına label yerine kullanılmaz.
- Hatalar `aria-describedby`; genel submit durumu uygun `aria-live` bölgesi kullanır.
- Gönderim düğmesi pending durumda disabled ve metinsel duruma sahiptir.
- Status filtreleri klavye ile kullanılabilir ve seçili durum semantik olarak belirtilir.
- Silme onayı yalnızca renge dayanmaz.
- Mobilde input font boyutu istenmeyen zoom üretmeyecek düzeyde tutulur.
- Mevcut `MentorTopBar` dili ve masalara dönüş davranışı korunur; gerekirse expert ekranı
  için mevcut prop sözleşmesi küçük ve geriye uyumlu biçimde genişletilir.

## 14. Yasal Metin ve Şeffaflık

Formda zorunlu onay kutusu veya pazarlama izni gösterilmez. Buna rağmen mevcut yasal
belgeler gerçek veri akışını eksiksiz tarif etmelidir.

`lib/legal/documents.ts` güncellemesi:

- Toplanan veriler: ad soyad, WhatsApp numarası, eğitim seviyesi, ilgi alanı, hedef dönem
  ve yardım talebi
- Amaç: ücretsiz ön görüşme talebini değerlendirmek ve WhatsApp üzerinden geri dönmek
- Erişim: yalnızca yetkili ItalyPath operatörü
- Saklama: talebi yönetmek için gerekli olduğu sürece; artık gerekmediğinde operatör
  panelinden manuel silme
- Pazarlama amacıyla kullanım veya satış iddiası yoktur.
- Kullanım Koşulları: ücretsiz ön görüşme ile sonradan ayrıca seçilebilecek ücretli
  profesyonel hizmet birbirinden ayrılır.

`LEGAL_LAST_UPDATED` gerçek uygulama tarihine güncellenir. Metin güncellemesi hukuki
uygunluk garantisi olarak sunulmaz; yalnızca uygulanan ürün davranışını dürüstçe açıklar.

## 15. Otomatik Doğrulama

Yeni kalıcı komutlar:

```bash
npm run check:expert-leads
npm run test:expert-leads
```

`check:expert-leads` en az şunları doğrular:

- expert kanalının `expert-lead + active` olması
- `app/ai-mentor/page.tsx` içinde ayrı expert experience branch'i
- public hub ve public POST route matcher'ları
- `/ekip/uzman` protected route politikası
- misafir gönüllü login redirect + `desk=volunteer` dönüş sözleşmesi
- SQL tablo, constraints, index, RLS ve `is_active_mentor_staff()` kullanımı
- anon read/update/delete grant veya policy bulunmaması
- service-role anahtarının client dosyalarında bulunmaması
- TR/EN expert form ve panel anahtarlarının paralelliği
- yasal metinlerde uzman lead veri akışının açıklanması
- eski `expert coming-soon` guard'larının kaldırılması

`test:expert-leads` saf davranış testleri en az şunları kapsar:

- bütün alan normalizasyonu ve sınır değerleri
- telefon normalizasyonu ve hatalı ülke kodu
- eğitim/alan ID allowlist'i
- dinamik intake üretimi ve server doğrulaması
- payload trim/length kuralları
- submission idempotency sonucu
- admin status geçişleri ve mutation hata halinde state koruması
- logout/kullanıcı değişiminde lead state temizliği

Güncellenecek mevcut kontroller:

- `npm run check:routes`
- `npm run check:mentor-desks` — eski `expert coming-soon` beklentisi yerine aktif ve
  ayrı lead deneyimini zorlar

Tam kabul komutları:

```bash
npm run check:expert-leads
npm run test:expert-leads
npm run check:mentor-desks
npm run test:volunteer-desk
npm run test:mentor-operator
npm run check:routes
npm run lint
npm run build
```

DB/RLS kabulü yalnızca statik kaynak aramasıyla bırakılmaz. Production öncesinde normal
authenticated kullanıcı, aktif staff kullanıcı ve public submission için gerçek
Supabase matrisi uygulanır.

## 16. Manuel Kabul Matrisi

1. Misafir `/ai-mentor` açar; Clerk'e yönlenmez.
2. Misafir uzman formunda bütün alanları doldurur ve tek lead oluşturur.
3. Hatalı numara/eksik alan gönderilemez; değerler kaybolmaz.
4. Çift tıklama ve aynı request retry'ı tek satır oluşturur.
5. Aynı kişi yeni form açıp bilinçli ikinci lead oluşturabilir.
6. Signed-in kullanıcı aynı boş form deneyimini görür; profil prefill edilmez.
7. Misafir gönüllü masayı seçer, `/giris` sonrası gönüllü masaya döner.
8. Normal authenticated kullanıcı `expert_leads` select/update/delete yapamaz.
9. Aktif staff `/ekip/uzman` listesini ve yeni sayacını görür.
10. Filtreler doğru satırları gösterir; `Yenile` yeni lead'i getirir.
11. WhatsApp düğmesi doğru `wa.me` numarasını açar ve status'ü değiştirmez.
12. Status ve iç not kaydedilir; kullanıcı yüzeyine sızmaz.
13. Silme ikinci onay ister; başarıda satır kalkar, hatada kalır.
14. Staff kaydı pasifleştirilince panel erişimi ve RLS mutation'ları kesilir.
15. Logout/kullanıcı değişiminde önceki lead verisi görünmez.
16. TR/EN ve mobil/masaüstü görünümler çalışır.
17. AI paused davranışı ile gönüllü öğrenci/operator akışları mevcut testlerini geçer.

## 17. Production Kurulum Sırası

1. Production'da `supabase/volunteer_mentor.sql` ve aktif tek `mentor_staff` kaydı mevcut
   olduğu doğrulanır.
2. `supabase/expert_leads.sql` Supabase SQL Editor'da uygulanır.
3. RLS matrisi normal kullanıcı ve staff tokenıyla doğrulanır.
4. `NEXT_PUBLIC_SUPABASE_URL` ve server-only `SUPABASE_SERVICE_ROLE_KEY` doğrulanır.
5. Uygulama deploy edilir.
6. Misafir gerçek form gönderimi ve staff panel yönetimi test edilir.
7. Test lead'i panelden elle silinir.

SQL kurulmadan önce uygulamayı açmak form gönderimlerinde kontrollü `503` üretir; RLS'yi
gevşetmek veya client'a service-role anahtarı vermek fallback değildir.

## 18. Kapsam Dışı

- Ortak `/ekip` admin ana sayfası, sidebar veya dashboard
- E-posta, WhatsApp, SMS, Slack veya push bildirimleri
- WhatsApp Business/Meta API entegrasyonu ve otomatik mesaj gönderimi
- Randevu takvimi, müsaitlik seçimi veya Calendar entegrasyonu
- Ödeme, paket seçimi, fiyat teklifi veya Stripe
- Lead atama, çoklu operatör, görev ve takım içi yorumlar
- Lead arama, dışa aktarma, analitik, pipeline değeri ve CRM entegrasyonu
- Otomatik saklama süresi veya otomatik silme
- CAPTCHA/Turnstile, IP tabanlı rate limit veya telefon bazlı dedupe
- Kullanıcıya lead geçmişi, düzenleme veya iptal ekranı
- Formda belge/dosya yükleme
- AI ile lead puanlama veya otomatik yanıt
- `/ai-mentor` SEO/indexleme çalışması

## 19. Dokümantasyon Güncellemeleri

Uygulama tamamlandığında:

- `AGENT_CONTEXT.md` route matrisinde `/ai-mentor` public olarak güncellenir.
- Mentor Masaları bölümü uzman masasının aktif public lead formunu ve ayrı
  `/ekip/uzman` panelini açıklar.
- Supabase yüzeylerine `expert_leads` ve `supabase/expert_leads.sql` eklenir.
- Komutlara `check:expert-leads` ve `test:expert-leads` eklenir.
- Bilinen sorunlardan `uzman lead-form projesi tamamlanana kadar coming-soon` notu
  kaldırılır.
- Production/runbook notlarına SQL uygulama, staff RLS doğrulama ve manuel test lead'i
  temizleme adımı eklenir.
