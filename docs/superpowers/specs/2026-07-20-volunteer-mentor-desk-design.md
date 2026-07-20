# Gönüllü Mentor Masası V1 — Tasarım Belgesi

Tarih: 2026-07-20
Durum: Kerem ile brainstorming oturumunda onaylandı
Uygulayıcı: Codex

---

## 1. Problem ve Amaç

`/ai-mentor` bugün üç danışma masası gösterir:

1. ItalyPath AI aktiftir ve Gemini ile anlık yanıt üretir.
2. ItalyPath Gönüllü Ekip kilitli bir "yakında" ekranıdır.
3. ItalyPath Uzman kilitli bir "yakında" ekranıdır.

Bu çalışmanın amacı yalnızca **ItalyPath Gönüllü Ekip** masasını açmaktır. Öğrenci,
site içinde kalıcı bir görüşme başlatabilmeli; tek yetkili operatör de ItalyPath içindeki
korumalı bir gelen kutusundan görüşmeyi okuyup "ItalyPath Gönüllü Ekip" kimliğiyle
yanıtlayabilmelidir.

Gönüllü masa bir anlık canlı destek vaadi vermez. Ürün davranışı asenkron insan
yazışmasıdır: mesaj kalıcıdır, tarafların hangisinden yanıt beklendiği görünür ve
kullanıcı sayfadan ayrılıp geri döndüğünde görüşme geçmişi korunur.

Uzman lead formu bu belgenin kapsamı dışındadır ve ayrı bir tasarım/uygulama döngüsü
olarak ele alınacaktır.

## 2. Onaylanan Ürün Kararları

- V1 uçtan uca çalışır: öğrenci yazışma alanı ve operatör gelen kutusu birlikte açılır.
- V1'de yanıt verecek tek kişi Kerem'dir; atama, üstlenme, round-robin veya ekip içi
  çakışma yönetimi yoktur.
- Öğrenci yanıtları her zaman **ItalyPath Gönüllü Ekip** adıyla görür. Kişisel operatör
  adı kullanıcı yüzeyinde gösterilmez.
- Her öğrenci aynı anda yalnızca bir açık görüşmeye sahip olabilir.
- Kapanan görüşmeler salt-okunur geçmişe gider. Öğrenci daha sonra yeni bir görüşme
  başlatabilir.
- Öğrenci ve operatör görüşmeyi kapatabilir.
- İlk görüşme kısa bir konu seçimi ve serbest mesajla başlar.
- Gönüllü masa genel öğrenci rehberliği sunar. Kişiye özel hukuki, mali veya resmî
  değerlendirme sunmaz; bu konular resmî kaynağa veya ileride uzman masaya yönlendirilir.
- V1 yalnızca düz metin mesaj destekler. Dosya/belge eki yoktur.
- Kapanan görüşmeler kullanıcı hesabı açık olduğu sürece saklanır. Mesaj düzenleme veya
  normal UI üzerinden silme yoktur; hesap/veri silme işlemi mentor görüşmelerini de
  kapsar.
- Otomatik e-posta bildirimi V1 kapsamı dışındadır. Veri akışı, ileride mesaj insert'i
  sonrasında bildirim eklenebilecek şekilde kurulacaktır.
- Sayfa açıkken yeni mesajlar Supabase Realtime ile görünür.

## 3. Teknik Yaklaşım

Onaylanan yaklaşım: **Supabase + RLS + Realtime**.

- Clerk oturum tokenı Supabase istemcisine aktarılır.
- Görüşme ve mesaj okumaları RLS korumalı Supabase sorgularıyla yapılır.
- Görüşme başlatma, mesaj gönderme ve kapatma işlemleri atomik Postgres fonksiyonları
  üzerinden yürür.
- `mentor_conversations` ve `mentor_messages` değişiklikleri Realtime üzerinden öğrenci
  ve operatör ekranlarına iletilir.
- İki tablo SQL kurulumunda `supabase_realtime` publication'ına eklenir.
- `SUPABASE_SERVICE_ROLE_KEY` hiçbir istemci akışına girmez.

Bu yaklaşım mevcut `createClerkSupabaseClient` ve hook tabanlı veri erişimi modeline
uyar. Mesajlaşma kuralları RLS ve veritabanı fonksiyonlarında tek yerde uygulanır;
Next.js API endpoint'lerinde aynı yetki kuralları tekrar edilmez.

### 3.1 Clerk–Supabase önkoşulu

Uygulamaya başlamadan önce Supabase Dashboard'da native Clerk third-party auth
entegrasyonunun etkin olduğu doğrulanmalıdır. Yeni gönüllü hook'ları Clerk'in normal
session tokenını (`getToken()`) kullanır. Mevcut yüzeylerin kullandığı deprecated
`getToken({ template: "supabase" })` çağrılarını topluca dönüştürmek bu özelliğin kapsamı
dışındadır; gönüllü masa mevcut çalışma alanlarında ilişkisiz auth refactor'u yapmaz.

Realtime aboneliği açılmadan önce istemcinin Clerk tokenıyla yetkilendirildiği doğrulanır.
Dashboard önkoşulu sağlanmıyorsa özellik canlıya alınmaz; RLS gevşetilerek geçici çözüm
üretilmez.

## 4. Veri Modeli

Kurulum dosyası `supabase/volunteer_mentor.sql` olur. Projede generated Supabase types
olmadığı için açık row interface'leri `types/index.ts` içine eklenir.

### 4.1 `mentor_staff`

Tek operatör için güvenli allowlist'tir; tablo gelecekte ikinci bir kayıt alabilir ancak
V1'de rol ve atama sistemi taşımaz.

| Alan | Tip | Kural |
| --- | --- | --- |
| `user_id` | `text` | PK, Clerk user ID |
| `display_name` | `text` | İç panel etiketi; kullanıcıya gösterilmez |
| `active` | `boolean` | Varsayılan `true` |
| `created_at` | `timestamptz` | UTC oluşturulma zamanı |

Operatör kaydı deploy sırasında gerçek Clerk user ID ile Supabase Dashboard üzerinden
eklenir. ID kaynak koda veya environment değişkenine hard-code edilmez. Normal
authenticated kullanıcılar bu tabloyu listeleyemez veya değiştiremez.

### 4.2 `mentor_conversations`

| Alan | Tip | Kural |
| --- | --- | --- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `user_id` | `text` | Görüşme sahibi Clerk user ID |
| `student_display_name` | `text` | Clerk görünen adının görüşme açılışındaki kopyası |
| `topic` | `text` | Tanımlı konu ID'lerinden biri |
| `status` | `text` | `waiting_for_team`, `waiting_for_student`, `closed` |
| `last_sender_kind` | `text` | `student` veya `staff` |
| `last_message_preview` | `text` | Gelen kutusu için en fazla 160 karakterlik düz metin |
| `created_at` | `timestamptz` | UTC oluşturulma zamanı |
| `updated_at` | `timestamptz` | Son durum değişikliği |
| `last_message_at` | `timestamptz` | Kuyruk sıralaması için |
| `closed_at` | `timestamptz null` | Kapanma zamanı |
| `closed_by` | `text null` | `student` veya `staff` |

`status <> 'closed'` satırları için `user_id` üzerinde partial unique index bulunur.
Bu index iki sekmeden aynı anda görüşme açma yarışında da tek açık görüşme kuralını
korur.

### 4.3 `mentor_messages`

| Alan | Tip | Kural |
| --- | --- | --- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `conversation_id` | `uuid` | `mentor_conversations.id` FK, `on delete cascade` |
| `sender_kind` | `text` | `student` veya `staff` |
| `body` | `text` | Trimlenmiş, 1–4000 karakter düz metin |
| `client_nonce` | `uuid` | Retry/çift gönderim tekilleştirme anahtarı |
| `created_at` | `timestamptz` | UTC gönderim zamanı |

`client_nonce` benzersizdir. Mesajlarda update/delete grant'i veya policy'si bulunmaz.
Gerçek operatör Clerk ID'si öğrenci tarafından okunabilen mesaj satırında saklanmaz;
yetki, RPC çağrısı sırasında `mentor_staff` üzerinden doğrulanır. V1'de tek operatör
olduğu için ayrı staff audit kaydı gerekmez. Staff mesajları daima "ItalyPath Gönüllü
Ekip" etiketi alır. Gelecekte çoklu operatör ve kişi bazlı audit istenirse kullanıcıya
açık mesaj şemasına kimlik eklemek yerine ayrı, özel bir audit yüzeyi tasarlanır.

### 4.4 Konu ID'leri

Saklanan değerler dil bağımsızdır; TR/EN etiketleri `lib/translations.ts` içindedir.

| ID | TR anlamı |
| --- | --- |
| `university-program` | Üniversite ve program seçimi |
| `application-documents` | Başvuru ve belgeler |
| `scholarship-isee` | Burs ve ISEE hakkında genel bilgi |
| `visa-residence` | Vize ve ikamet hakkında genel bilgi |
| `student-life` | İtalya'da öğrenci yaşamı |
| `other` | Diğer |

`scholarship-isee` ve `visa-residence` seçildiğinde arayüz, gönüllü yanıtının resmî veya
kişiye özel değerlendirme yerine geçmediğini açıkça belirtir.

## 5. Yetkilendirme ve Veritabanı Fonksiyonları

### 5.1 RLS okuma kuralları

- Öğrenci `mentor_conversations.user_id = requesting_user_id()` olan görüşmeleri okur.
- Öğrenci yalnızca sahibi olduğu görüşmelerin mesajlarını okur.
- Aktif `mentor_staff` kaydı olan operatör bütün gönüllü görüşme ve mesajlarını okur.
- Normal kullanıcı `mentor_staff` kayıtlarını okuyamaz.
- Anon rol hiçbir mentor tablosuna erişemez.

Aktif personel kontrolü, güvenli `search_path` kullanan ve authenticated role ile sınırlı
bir yardımcı fonksiyonda yapılır. İstemciden gönderilen `sender_kind`, `user_id` veya
status değerlerine güvenilmez.

### 5.2 Yazma fonksiyonları

İstemci tablolara doğrudan insert/update/delete yapmaz. Authenticated role yalnızca şu
fonksiyonları çağırabilir:

1. `start_volunteer_conversation(topic, display_name, body, client_nonce)`
   - JWT'den öğrenci ID'sini alır.
   - Girdileri normalize eder ve doğrular.
   - Açık görüşme yoksa görüşme + ilk mesajı tek transaction içinde oluşturur.
   - Eşzamanlı istekte mevcut açık görüşmeyi güvenli biçimde döndürür.

2. `send_student_mentor_message(conversation_id, body, client_nonce)`
   - Çağıranın görüşme sahibi olduğunu ve görüşmenin açık olduğunu doğrular.
   - Mesajı `student` olarak ekler.
   - Görüşmeyi `waiting_for_team` durumuna geçirir ve son mesaj alanlarını günceller.

3. `send_staff_mentor_message(conversation_id, body, client_nonce)`
   - Çağıranın aktif `mentor_staff` olduğunu ve görüşmenin açık olduğunu doğrular.
   - Mesajı `staff` olarak ekler.
   - Görüşmeyi `waiting_for_student` durumuna geçirir ve son mesaj alanlarını günceller.

4. `close_volunteer_conversation(conversation_id)`
   - Görüşme sahibi öğrenciye veya aktif operatöre izin verir.
   - `status`, `closed_at`, `closed_by` ve `updated_at` alanlarını atomik günceller.
   - Zaten kapalıysa idempotent başarı döndürür.

Fonksiyonlar mesaj kaydını oluşturduktan sonra Realtime'a konu olacak normal tablo
değişikliği üretir. Gelecekte e-posta bildirimi gerektiğinde aynı mesaj insert olayına
trigger/webhook bağlanabilir; istemci veri sözleşmesi değişmez.

SQL kurulumu `mentor_conversations` ve `mentor_messages` tablolarını
`supabase_realtime` publication'ına idempotent biçimde ekler. Realtime erişimi de aynı
select RLS politikalarına bağlıdır; publication üyeliği veri okuma yetkisi vermez.

## 6. Öğrenci Deneyimi

`app/ai-mentor/page.tsx` masa yönlendiricisi olmaya devam eder. Kanal modelinde masanın
ürün türü ile kullanılabilirliği ayrılır:

```ts
experience: "ai-chat" | "volunteer-inbox" | "expert-lead"
availability: "active" | "paused" | "coming-soon"
```

- ItalyPath AI: `ai-chat + active`
- ItalyPath Gönüllü Ekip: `volunteer-inbox + active`
- ItalyPath Uzman: `expert-lead + coming-soon` (bu çalışmada form açılmaz)

AI masası mevcut `MentorChatRoom` ve Gemini streaming davranışını korur. Gönüllü
mesajları `messagesByChannel` state'ine alınmaz; Supabase kalıcı verisi tek kaynaktır.

### 6.1 Bileşen sınırları

- `VolunteerDesk`: yükleme, açık görüşme, kapalı geçmiş ve hata durumlarını orkestre eder.
- `VolunteerConversationStart`: konu seçimi, kapsam notu ve ilk mesaj alanıdır.
- `VolunteerThread`: kronolojik mesaj listesidir.
- `VolunteerMessage`: öğrenci/staff sunumunu yapar; düz metin dışında render etmez.
- `VolunteerComposer`: mesaj gönderir, pending/retry davranışını yönetir.
- `VolunteerConversationStatus`: hangi taraftan yanıt beklendiğini gösterir.
- `VolunteerConversationHistory`: kapanmış görüşme özetlerini ve salt-okunur geçmişi açar.
- `lib/mentor/useVolunteerDesk.ts`: sorgu, RPC ve Realtime aboneliğini kapsüller.

Yeni görsel parçalar `components/mentor/volunteer/` altında tutulur. Hook proje kuralına
uygun olarak `lib/mentor/` altında kalır.

### 6.2 Ekran durumları

1. **İlk kullanım:** Masa açıklaması, altı konudan biri, serbest mesaj ve gönder CTA'sı.
2. **Ekibin yanıtı bekleniyor:** Thread görünür; öğrenci ek mesaj gönderebilir.
3. **Senden yanıt bekleniyor:** Staff yanıtı vurgulanmadan, durum şeridiyle belirtilir.
4. **Kapalı:** Composer yoktur; görüşme salt-okunurdur. Yeni görüşme CTA'sı görünür.
5. **Geçmiş:** Kapanmış görüşmeler tarih ve konuyla listelenir.

Öğrenci ve operatör mesajları klasik parlak SaaS chat bubble'ları yerine mevcut
paper/sage/terracotta editoryal sistemde sade bir yazışma kaydı olarak sunulur.
`EntryPair` kullanılmaz; insan konuşmasında soru-cevap çiftleri her zaman bire bir değildir.

## 7. Tek Operatör Paneli

Route: `/ekip/mentor`.

Route Clerk ile protected olur ve `PROTECTED_PAGE_ROUTES` listesine eklenir. Bunun
yanında sayfa aktif `mentor_staff` kontrolü yapar. Yetkisiz, giriş yapmış kullanıcı
veri yüklemeden erişim reddi görür; asıl veri güvenliği RLS ile sağlanır.

### 7.1 Bileşenler

- `MentorOperatorGate`: aktif staff kontrolü ve erişim reddi.
- `MentorOperatorInbox`: filtre, sıralama, seçili görüşme orchestration'ı.
- `OperatorConversationList`: görüşmeleri `last_message_at desc` sıralar.
- `OperatorConversationRow`: öğrenci adı, konu, son mesaj özeti, zaman ve durum.
- `OperatorConversationThread`: mesaj geçmişi ve kapatma aksiyonu.
- `OperatorReplyComposer`: staff RPC ile marka adına yanıt gönderir.
- `lib/mentor/useMentorOperatorInbox.ts`: staff kontrolü, liste/thread sorguları ve
  Realtime aboneliklerini kapsüller.

Operatör listesi üç filtre taşır:

1. Yanıt bekliyor (`waiting_for_team`)
2. Öğrenciden bekleniyor (`waiting_for_student`)
3. Kapalı (`closed`)

V1'de atama, etiket, iç not, canned response, SLA sayacı ve analitik yoktur. Mobilde
liste ve görüşme iki adımlı görünür; masaüstünde yan yana sunulabilir.

Tüm kullanıcıya dönük ve operatör UI metinleri `lib/translations.ts` altında TR/EN
paralel eklenir. `/ekip` robots disallow listesine alınır ve sitemap'e eklenmez.

## 8. Realtime ve İstemci Veri Akışı

### 8.1 Öğrenci

1. Sayfa açıldığında açık görüşme, mesajlar ve kapalı görüşme özetleri yüklenir.
2. İlk gönderim `start_volunteer_conversation` çağrısıdır.
3. Açık görüşmenin ID'sine filtreli `mentor_messages` aboneliği kurulur.
4. Görüşme durum değişiklikleri için kullanıcının kendi conversation satırlarına abone
   olunur.
5. RPC cevabı ve Realtime olayı aynı mesajı getirirse `message.id` ile tekilleştirilir.
6. Görüşme kapanınca composer kaldırılır ve abonelik salt-okunur geçmiş davranışına geçer.

### 8.2 Operatör

1. Staff kontrolü başarılı olunca görüşme listesi yüklenir.
2. Conversation insert/update olayları kuyruk satırlarını canlı günceller.
3. Seçili görüşme için mesajlar yüklenir ve ID filtreli abonelik açılır.
4. Yanıt RPC'si başarılı olduğunda liste durumu ve thread güncellenir.
5. Seçim değişince eski thread aboneliği temizlenir.

Realtime, kalıcılığın kaynağı değildir. Bağlantı yeniden kurulduğunda ekran normal
Supabase sorgusuyla yeniden senkronlanır. Abonelik cleanup'ları unmount, görüşme değişimi
ve Clerk oturumu değişiminde çalışır.

## 9. Hata ve Sınır Durumları

- Supabase ilk yüklemesi başarısızsa boş görüşme yanılsaması gösterilmez; editoryal hata
  bloğu ve yeniden dene aksiyonu görünür.
- Mesaj gönderimi sırasında buton kilitlenir. Hata durumunda draft kaybolmaz.
- `client_nonce` aynı isteğin retry sırasında iki mesaj oluşturmasını engeller.
- İki sekmeden görüşme açma denemesinde partial unique index tek açık görüşmeyi korur;
  istemci oluşan/mevcut görüşmeyi yükler.
- Başka sekmede kapanmış görüşmeye mesaj gönderilirse RPC reddeder; istemci güncel kapalı
  görüşmeyi yeniden yükler.
- Realtime koparsa mevcut geçmiş korunur, bağlantı durumu ve manuel yenileme sunulur.
- Yetkisiz `/ekip/mentor` isteği conversation sorgusu çalıştırmadan reddedilir. RLS ayrıca
  doğrudan Supabase isteğinde veri sızmasını önler.
- Clerk oturumu biterse mevcut protected route giriş akışı kullanılır.
- Öğrenci görünen adı boşsa arayüzde nötr "Öğrenci" etiketi saklanır; görüşme açılması
  engellenmez.
- Mesajlar kullanıcı içeriği olduğundan ReactMarkdown ile render edilmez; newline'lar
  düz metin sunumuyla korunur.
- Staff pasif hale getirilirse sonraki sorgu/RPC/Realtime yetkisi kesilir.

## 10. Gizlilik ve Yasal Metinler

Mevcut yasal belgeler AI mentor mesajlarından söz eder; insan gönüllü görüşmelerini
ayrıca kapsamaz. Uygulama sırasında `lib/legal/documents.ts` şu gerçek davranışları
açıklayacak şekilde güncellenir:

- Kullanıcının gönüllü masaya yazdığı mesajlar ve staff yanıtları işlenir.
- Amaç, site içi insan destek görüşmesini yürütmektir.
- Yetkili ItalyPath operatörü görüşmeleri okuyabilir ve yanıtlayabilir.
- Kapanan geçmiş hesap süresince saklanır.
- V1'de mesajlarla belge eki alınmaz.

Clerk hesap silme olayı bu özellik kapsamında yeni bir webhook sistemi kurmaz. Ancak
mevcut hesap/veri silme talebi uygulanırken ilgili `mentor_conversations` satırları da
silinir; `mentor_messages` kayıtları FK cascade ile temizlenir. Bu operasyon
`SUPABASE_SECURITY_RUNBOOK.md` içine açık bir kontrol adımı olarak eklenir.

Yasal metin güncellemesi ürün davranışını dürüstçe tarif eder; yeni bir hukuki garanti
veya uydurma saklama süresi eklemez.

## 11. Kapsam Dışı

- Uzman lead formu ve uzman talep yönetimi
- E-posta, SMS, WhatsApp, Slack veya push bildirimleri
- Dosya/belge eki ve belge cüzdanı paylaşımı
- Birden fazla operatör için atama, üstlenme ve iş yükü dağıtımı
- Otomatik kapanma ve SLA
- Yazıyor göstergesi, online presence ve okundu bilgisi
- Mesaj düzenleme/silme
- İç not, hazır yanıt, etiket ve analitik
- AI ile otomatik cevap önerisi veya gönüllü konuşmasını AI promptuna taşıma
- Mevcut favorites/documents/profile auth istemcilerini topluca native tokena taşıma

## 12. Doğrulama ve Kabul Kriterleri

### 12.1 Otomatik kontroller

Yeni `scripts/check-mentor-desks.mjs` ve `npm run check:mentor-desks` aşağıdakileri
korur:

- Kanal modelinde AI, gönüllü ve uzman deneyim türlerinin açık tanımı
- Gönüllü masanın aktif, uzman masanın bu iş kapsamında hâlâ coming-soon olması
- Öğrenci ve operatör bileşen/hook dosyalarının varlığı
- TR/EN mentor ve operatör çeviri anahtarlarının paralelliği
- `/ai-mentor` ve `/ekip/mentor` protected route matrisi
- `/ekip` robots disallow kuralı
- Gönüllü istemci kodunda service-role anahtarı bulunmaması
- Öğrenci tarafından okunabilen mesaj satırlarında gerçek staff Clerk ID'si tutulmaması
- Mesaj render yolunda ReactMarkdown kullanılmaması
- SQL dosyasında RLS, Realtime publication kurulumu, tek açık görüşme index'i, mesaj
  uzunluk kısıtı ve dört RPC'nin varlığı

Ek kontroller:

- `npm run check:routes`
- `npm run lint`
- `npm run build`

### 12.2 Manuel iki-oturum matrisi

Bir normal öğrenci hesabı ve Supabase `mentor_staff` tablosunda aktif olan operatör
hesabıyla şu senaryolar doğrulanır:

1. Öğrenci konu + mesajla görüşme açar; operatör kuyruğunda canlı görünür.
2. Başka bir normal kullanıcı görüşmeyi veya mesajları okuyamaz.
3. Operatör yanıtı öğrencinin açık sayfasında canlı görünür.
4. Yanıt sonrası durum `waiting_for_student` olur.
5. Öğrenci yeni mesaj yazınca durum `waiting_for_team` olur.
6. Öğrenci veya operatör görüşmeyi kapatabilir.
7. Kapalı görüşmeye iki taraf da mesaj gönderemez.
8. Öğrenci kapalı geçmişi okuyabilir ve yeni görüşme açabilir.
9. Çift gönderim/retry aynı mesajı çoğaltmaz.
10. Staff kaydı pasifleştirildiğinde operatör paneli ve staff RPC erişimi kesilir.
11. Realtime bağlantısı kesilip geldiğinde thread normal fetch ile doğru duruma döner.
12. AI masası mevcut streaming, stop ve reset davranışlarını korur.

## 13. Uygulama Sırası

Bu sıra ayrıntılı implementation planında dosya ve test bazında açılacaktır:

1. **Veri ve yetki temeli:** native auth preflight, SQL/RLS/RPC, row/domain tipleri.
2. **Öğrenci gönüllü masası:** kanal modeli, başlangıç ekranı, thread, composer, geçmiş ve hook.
3. **Tek operatör paneli:** staff gate, kuyruk, thread, yanıt ve kapatma.
4. **Realtime ve kalite:** abonelik/reconnect/dedupe, TR/EN, yasal metin, route/robots,
   otomatik kontroller ve production build.

## 14. Dokümantasyon Güncellemeleri

Uygulama tamamlandığında:

- `AGENT_CONTEXT.md` AI Mentor bölümü gönüllü masanın aktif ve kalıcı insan yazışması
  olduğunu açıklayacak şekilde güncellenir.
- Supabase yüzeylerine üç mentor tablosu ve `supabase/volunteer_mentor.sql` eklenir.
- Route matrix'e `/ekip/mentor` protected operatör yüzeyi eklenir.
- Ortam/runbook notuna native Clerk–Supabase doğrulaması ve operatör allowlist kurulum
  adımı ile hesap/veri silmede mentor görüşmelerini temizleme adımı eklenir.
- Bildirimler, çoklu operatör ve uzman lead alanı takip eden bağımsız işler olarak
  belirtilir.
