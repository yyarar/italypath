# Gizlilik metni taslağı (hukukçu incelemesi için)

Durum: UYGULANMADI (taslak, hukukçu incelemesi bekliyor) · Hazırlandı: 2026-09-26 · Kaynak: 25 Eylül 2026 güvenlik denetimi (S7#2, S7#3, S7#4), `docs/STATUS.md` #18 · Yayındaki metin: `lib/legal/documents.ts` (bu taslak onu değiştirmez)

Bu belge yayındaki gizlilik ve kullanım koşulları metninin yerine geçecek taslaktır. Kerem kararı (2026-09-26): yayındaki metin, AI mentor ifadeleri dahil, hukukçu onayına kadar aynen kalır; taslak depoda tutulur. Köşeli parantezli notlar (`[Hukukçu: …]`, `[Doğrulanacak: …]`) yayından önce çözülür ve metinden çıkarılır.

Sayılar ve sağlayıcı bilgileri 2026-09-26 tarihli koda ve canlı proje ayarlarına göredir.

## 1. Yayındaki metinden farklar

| Bölüm | Yayındaki metin | Taslak | Neden |
| --- | --- | --- | --- |
| 2. Veriler | AI mentor mesajları var; profil cevapları, SAT geçmişi, teknik kayıtlar, ekip iç notu yok | AI kaldırıldı; profil cevapları, SAT geçmişi, işlem güvenliği kayıtları, ekip notu eklendi; toplama yöntemi yazıldı | Denetim S7#3; AI masası 2026-09-26'da kaldırıldı |
| 3. Amaçlar | AI yanıt üretimi var | AI kaldırıldı; profil önerileri ve SAT ilerlemesi eklendi | Kod ne yapıyorsa o |
| Yeni: Hukuki sebepler | Yok | KVKK md. 5/2 bentleri işleme türüne göre | Aydınlatma Tebliği: hukuki sebep yazılmalı |
| 4. Alıcılar | Kimlik doğrulama, Supabase, yapay zeka | Alıcı grupları: barındırma (Vercel), kimlik doğrulama (Clerk, ABD), veritabanı ve dosya (Supabase), mesajlaşma (WhatsApp/Meta), e-posta; yapay zeka kaldırıldı | Denetim S7#3: barındırma ve WhatsApp eksikti |
| 4. Yurt dışı | "Sunucular yurt dışında bulunabilir" | Ülke ve md. 9 dayanağı (hukukçu seçecek) | KVKK md. 9 (2024 değişikliği) |
| 5. Saklama | Genel ifade; ön görüşme "gerektiği sürece" | Veri türü başına süre; ön görüşme 6 ay / şüpheli 30 gün; hesap silinince otomatik silme | Denetim S7#2, S7#4; Kerem kararı 2026-09-26 |
| Kullanım koşulları 1 ve 3 | "Yapay zeka destekli bir mentor" | AI ifadeleri kaldırıldı | AI masası kaldırıldı |

## 2. Taslak: Gizlilik Politikası ve Aydınlatma Metni

Giriş paragrafı yayındakiyle aynıdır. `[Hukukçu: "Platform'u kullanarak … bilgilendirildiğinizi kabul edersiniz" cümlesi aydınlatmayı rızaya benzetiyor; kalmalı mı?]`

### 1. Veri Sorumlusu

Kişisel verileriniz, veri sorumlusu sıfatıyla Kerem Yarar tarafından işlenmektedir. ItalyPath bir bilgilendirme ve rehberlik platformudur; bağlı olduğu bir şirket bulunmamaktadır.

Her türlü soru ve başvurunuz için iletişim adresi: contact@italypath.app.

`[Hukukçu: gerçek kişi veri sorumlusu için VERBİS kaydı gerekip gerekmediği; adres bilgisinin metne eklenip eklenmeyeceği]`

### 2. Hangi Kişisel Verileri İşliyoruz?

Platform'u nasıl kullandığınıza bağlı olarak aşağıdaki verileri işleriz:

- Hesap bilgileri: Üye olduğunuzda e-posta adresiniz ve adınız. Google ile girişi seçerseniz Google hesabınızdaki adınız, e-posta adresiniz ve profil fotoğrafınız kimlik doğrulama hizmetimize iletilir.
- İşlem güvenliği kayıtları: Giriş ve oturum kayıtları, IP adresi, tarayıcı ve cihaz bilgisi. Bu kayıtları kimlik doğrulama ve barındırma hizmeti sağlayıcılarımız teknik olarak tutar.
- Profil cevapları: Hoş geldin sorularına verdiğiniz cevaplar (hedef eğitim seviyesi, ilgilendiğiniz alanlar, bütçe durumunuz ve burs ihtiyacınız, şehir tercihiniz). Size uygun program önerileri göstermek için kullanılır.
- Favorileriniz: İşaretlediğiniz üniversite ve programlar.
- Yüklediğiniz belgeler: Belge cüzdanına yüklediğiniz dosyalar, dosya adları ve seçtiğiniz belge kategorisi.
- SAT çalışma geçmişi: Çözdüğünüz sorular, verdiğiniz cevaplar, cevabın doğru olup olmadığı ve cevap zamanı.
- Gönüllü mentor görüşmeleri: Görünen adınız, görüşme konusu, yazdığınız mesajlar, görüşme durumu ve ItalyPath Gönüllü Ekibinin yanıtları. Bu masada belge veya dosya eki alınmaz.
- Uzman ön görüşme talepleri: Ad soyadınız, WhatsApp numaranız, hedef eğitim seviyeniz, ilgilendiğiniz alan, hedef başlangıç döneminiz, destek talebiniz; ekibin talebe verdiği durum ve eklediği iç notlar. Talebinizden sonra WhatsApp üzerinden yaptığımız yazışmalar da bu kapsamdadır.
- İletişim talepleri: contact@italypath.app adresine yazdığınızda e-posta adresiniz ve mesajınız.
- Tarayıcı tercihleri: Dil seçiminiz, görünüm tercihiniz ve üye değilken işaretlediğiniz favoriler cihazınızın tarayıcı hafızasında (localStorage) saklanır; bize gönderilmez.

Verileriniz Platform'daki formlar, üyelik ve giriş ekranları ve Platform'u kullanırken otomatik oluşan teknik kayıtlar aracılığıyla elektronik ortamda toplanır.

`[Hukukçu: belge cüzdanına sağlık raporu gibi özel nitelikli kişisel veri (KVKK md. 6) içeren belge yüklenebilir. Özel nitelikli veri için ayrı uyarı veya açık rıza gerekip gerekmediği]`

### 3. Kişisel Verileri Hangi Amaçlarla İşliyoruz?

- Üyelik hesabınızı oluşturmak ve güvenli girişi sağlamak,
- Profil cevaplarınıza göre size uygun program önerilerini göstermek,
- Favorilerinizi, yüklediğiniz belgeleri ve SAT çalışma ilerlemenizi size sunmak ve saklamak,
- Site içindeki insan gönüllü görüşmesini yürütmek ve görüşme geçmişini hesabınıza sunmak; bu görüşmeler yetkilendirilmiş ItalyPath operatörü tarafından okunur ve yanıtlanır,
- Uzman ön görüşme talebinizi değerlendirmek ve verdiğiniz numara üzerinden WhatsApp ile sizinle iletişime geçmek,
- KVKK başvurularınızı ve iletişim taleplerinizi yanıtlamak,
- Dil ve görünüm gibi tercihlerinizi hatırlamak,
- Platform'un güvenliğini sağlamak, kötüye kullanımı önlemek ve hizmeti geliştirmek.

### 4. Hukuki Sebepler (yeni bölüm)

Verilerinizi KVKK'nın 5. maddesinin 2. fıkrasındaki şu sebeplere dayanarak işleriz:

| İşleme | Hukuki sebep |
| --- | --- |
| Hesap, profil cevapları, favoriler, belgeler, SAT geçmişi, gönüllü mentor görüşmeleri | Sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (md. 5/2-c): Kullanım Koşulları çerçevesinde size sunduğumuz hizmet |
| Uzman ön görüşme talebi ve WhatsApp iletişimi | Sözleşmenin kurulmasıyla doğrudan ilgili olması (md. 5/2-c): sizin talebiniz üzerine yapılan ön görüşme `[Hukukçu: md. 5/2-c yeterli mi, açık rıza mı gerekir?]` |
| İşlem güvenliği kayıtları, kötüye kullanımı önleme | Temel hak ve özgürlüklerinize zarar vermemek kaydıyla meşru menfaatimiz (md. 5/2-f) |
| KVKK başvurularına yanıt, yetkili makam talepleri | Hukuki yükümlülüğümüzü yerine getirmek (md. 5/2-ç) |

### 5. Verilerin Aktarıldığı Alıcı Grupları ve Yurt Dışına Aktarım

Platform'u çalıştırmak için bazı hizmetleri dış sağlayıcılardan alırız. Verileriniz yalnızca hizmetin gerektirdiği ölçüde aşağıdaki alıcı gruplarıyla paylaşılır:

| Alıcı grubu | Sağlayıcı ve konum | Hangi veri, hangi amaçla |
| --- | --- | --- |
| Barındırma ve içerik dağıtım hizmeti | Vercel Inc., ABD `[Doğrulanacak: sunucu işlevlerinin çalıştığı bölge]` | Sitenin sunulması; her istekte IP adresi ve tarayıcı bilgisi; çerezsiz ve anonim ziyaret istatistiği |
| Kimlik doğrulama hizmeti | Clerk Inc., ABD | Hesap bilgileri, giriş ve oturum kayıtları; doğrulama e-postaları |
| Veritabanı ve dosya saklama hizmeti | Supabase Inc. (ABD şirketi); veritabanı ve dosya sunucusu İsviçre (Zürih) | Profil cevapları, favoriler, belgeler, SAT geçmişi, gönüllü mentor görüşmeleri, uzman ön görüşme talepleri |
| Mesajlaşma hizmeti | WhatsApp (Meta) `[Doğrulanacak: Türkiye'deki kullanıcılar için hizmeti sunan Meta şirketi ve ülkesi]` | Uzman ön görüşme için WhatsApp numaranız ve yazışmalar |
| E-posta hizmeti | Name.com (yönlendirme) ve Google (Gmail), ABD | contact@italypath.app adresine yazdığınız e-postalar |
| Yetkili kamu kurum ve kuruluşları | Türkiye | Yalnızca hukuki yükümlülük doğduğunda |

Uzman ön görüşme taleplerine ve gönüllü mentor görüşmelerine yalnızca yetkilendirilmiş ItalyPath operatörü erişebilir. Verilerinizi pazarlama amacıyla üçüncü kişilere satmayız.

Yukarıdaki sağlayıcıların sunucuları Türkiye dışındadır; verileriniz hizmetin sağlanabilmesi için yurt dışına aktarılır. Bu aktarım KVKK'nın 9. maddesine dayanır: `[Hukukçu: dayanağı seçin. Seçenekler: (a) sağlayıcı başına Kurul'un standart sözleşmesi ve imzadan sonra 5 iş günü içinde Kurum'a bildirim; (b) md. 9/6 arızi aktarım, ör. sözleşmenin ifası için zorunlu aktarım veya riskler anlatılarak alınan açık rıza. Seçilen dayanağa göre bu paragraf ve gerekirse kayıt/form akışı değişir.]`

### 6. Verilerin Saklanma Süresi

| Veri | Süre | Nasıl silinir |
| --- | --- | --- |
| Hesap bilgileri | Hesabınız açık kaldıkça | Hesabınızı sildiğinizde kimlik doğrulama sağlayıcısında silinir `[Doğrulanacak: Clerk'in silinen hesabı kendi sistemlerinde ne kadar tuttuğu]` |
| Profil cevapları, favoriler, belgeler, SAT geçmişi, gönüllü mentor görüşmeleri | Hesabınız açık kaldıkça; belgeleri istediğiniz zaman tek tek silebilirsiniz | Hesabınızı sildiğinizde otomatik olarak silinir (dosyalar dahil) |
| Uzman ön görüşme talebi | Tamamlanan veya yanıt alınamayan talepler son işlemden 6 ay sonra; ekibin şüpheli (otomatik gönderim) olarak ayırdığı kayıtlar 30 gün sonra | Ayda bir yapılan silme işlemiyle; talebiniz üzerine hemen |
| Uzman ön görüşme WhatsApp yazışmaları | Talep kaydıyla aynı süre `[Kerem: ekip telefonlarındaki yazışmaların aynı takvimle silinmesi süreç kuralı olarak onaylansın]` | Ekip tarafından elle |
| İşlem güvenliği kayıtları | Sağlayıcıların kendi süreleri `[Doğrulanacak: Vercel ve Clerk kayıt süreleri]` | Sağlayıcı tarafından |
| İletişim ve KVKK başvuru e-postaları | `[Hukukçu: süre önerin; ör. başvuru sonuçlandıktan sonra 1 yıl]` | Elle |
| Şifreli veritabanı yedekleri | `[Kerem: süre belirlenmedi, docs/STATUS.md #43]`; silinen veriler bu süre dolana kadar yalnızca şifreli yedekte kalır | Eski yedekler silinerek |
| Tarayıcı tercihleri | Siz silene kadar (cihazınızda) | Tarayıcı ayarlarından |

Yasal saklama yükümlülüğü doğarsa ilgili veriler o süre boyunca saklanabilir.

### 7. Veri Güvenliği

Yayındaki metinle aynı. `[Hukukçu: "yalnızca sizin erişiminize sunulur" ifadesi korunabilir; belgeler özel alanda ve kısa süreli imzalı bağlantıyla açılıyor]`

### 8. KVKK Kapsamındaki Haklarınız

Yayındaki metinle aynı (md. 11 listesi).

### 9. Haklarınızı Nasıl Kullanabilirsiniz?

Yukarıdaki haklarınıza ilişkin taleplerinizi contact@italypath.app adresine iletebilirsiniz. Talebiniz, KVKK'da öngörülen süre içinde ücretsiz olarak sonuçlandırılır. Hesabınızı hesap ayarlarından kendiniz silebilirsiniz; bu durumda Platform'da size bağlı veriler otomatik olarak silinir. `[Doğrulanacak: Clerk panelinde kullanıcının kendi hesabını silmesi açık; hesap penceresi hub ve menüden açılıyor]`

`[Hukukçu: Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ'e göre başvuru yöntemleri (yazılı, KEP, kayıtlı e-posta) yazılmalı mı?]`

### 10. Değişiklikler

Yayındaki metinle aynı.

## 3. Taslak: Kullanım Koşulları değişiklikleri

Yalnız AI ifadeleri değişir; diğer bölümler yayındakiyle aynıdır.

- 1. Hizmetin Tanımı, ilk paragraf: "… hesaplama araçları, yapay zeka destekli bir mentor ve site içi insan gönüllü yazışması sunar." yerine "… hesaplama araçları, site içi insan gönüllü yazışması ve ücretsiz uzman ön görüşmesi sunar."
- 3. Mentor Masaları Hakkında: "Yapay zeka mentor, otomatik olarak yanıt üreten bir yardımcıdır. …" paragrafı silinir.
- 3. Mentor Masaları Hakkında, son paragraf: "Yapay zeka ve insan gönüllü mentor profesyonel danışmanlık …" yerine "Gönüllü mentor masası profesyonel danışmanlık, hukuki görüş, kişiye özel mali değerlendirme veya resmî başvuru rehberliği yerine geçmez. Önemli bilgileri her zaman resmî kaynaklardan doğrulayın."

## 4. Ön görüşme formundaki aydınlatma satırı

Bu kartla birlikte formun gönder düğmesinin altına eklendi (yayın Kerem'in push kararıyla):

- TR: "Bilgilerini yalnızca bu talebi değerlendirmek ve sana WhatsApp'tan ulaşmak için kullanırız. Ayrıntılar: Gizlilik Politikası"
- EN: "We use your details only to review this request and to contact you on WhatsApp. Details: Privacy Policy"

`[Hukukçu: toplama anında bu kısa bilgilendirme ve bağlantı yeterli mi?]`

## 5. Ekip süreci: ilk WhatsApp mesajı

Ekip bir talebe ilk kez yazarken bu şablonu kullanır. Amaç: numaranın nereden geldiğini söylemek, talebin gerçekten o kişiye ait olduğunu teyit etmek (`docs/STATUS.md` #49) ve silme hakkını baştan sunmak.

TR:

> Merhaba [Ad], ben ItalyPath ekibinden [ekip üyesinin adı]. [Tarih] tarihinde italypath.app'teki ücretsiz ön görüşme formu bu numarayla doldurulduğu için yazıyorum.
>
> Talebi sen gönderdiysen, hedefini konuşmak için sana uygun bir zamanı yazman yeterli.
>
> Talebi sen göndermediysen ya da bilgilerinin silinmesini istersen "SİL" yazman yeterli; kaydını ve bu yazışmayı sileriz, sana bir daha yazmayız.
>
> Bilgilerini nasıl kullandığımızı buradan okuyabilirsin: italypath.app/yasal/gizlilik

EN:

> Hi [Name], this is [team member] from the ItalyPath team. I'm writing because the free pre-consultation form on italypath.app was submitted with this number on [date].
>
> If you sent the request, just reply with a time that suits you and we'll talk about your goals.
>
> If you didn't send it, or you'd like your details deleted, reply "DELETE" and we'll remove your record and this chat and won't contact you again.
>
> How we use your details: italypath.app/yasal/gizlilik

"SİL" veya "DELETE" cevabı gelirse: ekip talebi panelden (`/ekip/uzman`) siler, WhatsApp yazışmasını siler ve kişiye bir kez "Bilgilerin silindi." yazar. Talep sahibi değilse ayrıca bir şey yazılmaz.

## 6. Silmeyi uygulayan mekanizmalar

- Hesap silme: Clerk `user.deleted` olayı imzası doğrulanan `/api/webhooks/clerk` adresine gelir; kullanıcının `documents` klasöründeki dosyalar ve `user_documents`, `favorites`, `user_profiles`, `sat_attempts`, `mentor_conversations` satırları silinir (görüşme mesajları görüşmeyle birlikte). Canlıya geçmesi için Kerem'in adımları `docs/STATUS.md` #59'da.
- Ön görüşme saklama: `npm run cleanup:expert-leads` ayda bir kuru çalıştırılır, Kerem onayıyla `-- --apply`. Kurallar `scripts/expert-lead-retention.mjs`.

## 7. Hukukçuya açık sorular

1. Yurt dışı aktarım dayanağı (bölüm 5): standart sözleşme mi, arızi aktarım mı; seçime göre kayıt ve form akışında değişiklik gerekiyor mu?
2. Uzman ön görüşme ve WhatsApp için md. 5/2-c yeterli mi?
3. Belge cüzdanında özel nitelikli veri ihtimali (bölüm 2).
4. VERBİS kaydı gerekiyor mu?
5. KVKK başvuru yöntemleri ve başvuru e-postalarının saklama süresi.
6. Giriş paragrafındaki "kabul edersiniz" cümlesi.
7. Formdaki kısa bilgilendirme satırı yeterli mi?

## 8. Yayına alma (hukukçu onayından sonra)

- `lib/legal/documents.ts` gizlilik ve kullanım koşulları metinleri bu taslağa göre güncellenir; `LEGAL_LAST_UPDATED` yayın gününe çekilir.
- `scripts/check-mentor-desks.mjs` yayındaki metinden birebir cümle arar (ör. bölüm başlıkları ve Supabase paylaşım cümlesi); yeni başlık numaraları ve cümlelerle birlikte güncellenir.
- Bu belgenin durum satırı `UYGULANDI` olur, yanına commit yazılır.
