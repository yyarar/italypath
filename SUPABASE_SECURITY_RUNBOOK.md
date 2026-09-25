# Supabase Security Runbook (Clerk + RLS)

Bu doküman teknik olmayan kullanım için hazırlanmıştır. Sırayla uygula.

## 1) Clerk tarafı (mevcut legacy istemciler)

Favoriler, belgeler, profil ve SAT akışları geçici olarak mevcut `supabase`
JWT template'ini kullanmaya devam eder. Mentor kurulumu için yeni template oluşturma;
mevcut template'i silme, yeniden adlandırma veya payload/secret ayarlarını değiştirme.

Yeni mentor akışı deprecated JWT template kullanmaz. Clerk'in native Supabase
entegrasyonundan gelen normal session token'ını kullanır. Legacy istemcilerin native
token'a taşınması ayrı bir migrasyon ve regresyon testi olarak yapılmalıdır.

## 2) Supabase tarafı (Clerk provider)

1. Supabase Dashboard'a gir.
2. `Auth` -> `Third-Party Auth` -> `Clerk` entegrasyonunu aç.
3. Clerk domain/JWKS bilgilerini Supabase'in istediği alanlara gir.
4. Kaydet.

Not: Bu adım olmadan RLS politikaları "kim kullanıcı?" bilgisini doğru okuyamaz.

## 3) SQL güvenlik scriptini çalıştır

1. Supabase -> `SQL Editor` aç.
2. Bu dosyanın commitlenmiş içeriğini çalıştır:
   - `supabase/rls_hardening.sql`
3. Script şunları yapar:
   - `favorites` ve `user_documents` için RLS açar.
   - Her kullanıcının sadece kendi satırlarını görmesini/yazmasını sağlar.
   - Ziyaretçi (anon) rolüne hiç izin vermez; giriş yapmış kullanıcıya yalnız uygulamanın kullandığı fiilleri verir (okuma, ekleme, silme).
   - Uzunluk kuralları ve kişi başı sınırlar koyar (en çok 100 favori, 30 belge).
   - `documents` bucket'ını private, dosya başına 5 MB ve izinli türlerle kurar.
   - Storage policy'leri ile sadece kendi klasörüne (`{userId}/...`) ve en çok 30 dosyaya izin verir.

`storage.objects` Supabase'in storage rolüne aittir; script tabloyu değiştirmez, yalnız politikaları yeniden kurar (Supabase `postgres` rolüne bu tablo için politika yetkisi verir). Politika adımı yine de `must be owner` hatası verirse politikaları `Storage -> Policies` ekranından elle kur ve `documents` bucket'ının `public = false` olduğunu doğrula.

## 4) Uygulama davranışı (bu repoda hazırlandı)

Kod tarafında şu güvenlik iyileştirmeleri zaten uygulandı:

1. Supabase istekleri Clerk token ile gönderiliyor.
2. Documents için `publicUrl` yerine kısa ömürlü `signed URL` kullanılıyor.
3. Upload edilen dokümanlarda `storage_path` bazlı erişim yapılıyor.
4. Katalog tabloları (`universities`, `university_departments`, `program_admission_details`, `program_degree_class_codes` view'i) yalnızca sunucuda, `lib/universities.server.ts` içinde server-only `SUPABASE_SECRET_KEY` (yeni tip gizli anahtar, `sb_secret_…`) ile okunuyor (2026-09-26). Tarayıcı bu tabloları okumaz; herkese açık anon anahtara geri düşülmez. Katalog okuyan betikler de aynı anahtarı kullanır. Anahtar Supabase Dashboard → Project Settings → API Keys → Secret keys altındadır; Vercel'de Supabase entegrasyonu `SUPABASE_SECRET_KEY` olarak tanımlar (Production, Preview, Development). Sızarsa yalnızca o gizli anahtar panelden silinip yenisi oluşturulur; eski tip anahtarlar etkilenmez. 2026-09-26'dan beri ziyaretçi (anon) ve giriş yapmış kullanıcı (authenticated) rolleri bu dört kaynağa hiç erişemez (bölüm 8).

## 5) Doğrulama testi (zorunlu)

1. Kullanıcı A ile giriş yap, bir belge yükle, favori ekle.
2. Kullanıcı B ile giriş yap, A'nın belgesi/favorisi görünmemeli.
3. Belgede "Görüntüle" linki çalışmalı (signed URL).
4. 10 dakika sonra eski belge linki geçersiz olmalı (normal davranış).

## 6) Sorun olursa hızlı kontrol

1. Legacy özelliklerde hata varsa mevcut Clerk template adı gerçekten `supabase` mı?
2. Mentor akışında hata varsa native session token yenilendi mi (çıkış/giriş)?
3. Supabase Third-Party Auth içinde doğru Clerk domain'i aktif mi?
4. SQL script hata vermeden tamamlandı mı?
5. `documents` bucket kesinlikle `public = false` mı?

## Volunteer Mentor

1. In Clerk's Supabase setup, activate the matching instance and confirm the domain.
2. Under Supabase Dashboard → Authentication → Third-Party Auth, confirm that exact Clerk domain is enabled. Do not add a duplicate provider.
3. Sign out and back in so the browser receives a fresh native session token. Confirm it has `role=authenticated`; `sub` must exactly match the signed-in Clerk user ID.
4. Run the exact committed `supabase/volunteer_mentor.sql` artifact in Supabase SQL Editor (or apply it once through the approved migration workflow).
5. Run the verification queries below and review Supabase Security Advisor before deploying client traffic.
6. In Clerk Dashboard copy Kerem's exact user ID; insert one `mentor_staff` row with that ID, display name `Kerem`, and `active=true`.
7. Complete a two-account RLS and Realtime test: each student sees only their own thread; the active operator sees both and can reply.
8. For account/data deletion, delete the user's `mentor_conversations` rows; verify `mentor_messages` and private `mentor_rpc_idempotency` rows disappear through `on delete cascade`.
9. Never put the operator ID or a service-role key in client source.

### Legacy upgrade safe stop

If step 3 raises `legacy_mentor_idempotency_migration_required`, stop the deployment. The transaction has rolled back: the legacy messages and `mentor_messages_client_nonce_key` constraint remain unchanged, and the hardened schema has not been partially applied.

This means the experimental legacy schema contains messages whose nonce cannot prove whether the original operation was conversation start, student send, or staff send, and staff messages do not contain the real staff caller ID. Do not guess, drop the constraint manually, or rerun after an automatic backfill. A database owner must review the legacy rows and approve an explicit migration or archival/deletion plan that preserves the required caller, operation, nonce, target, and result mapping. An empty legacy mentor schema upgrades automatically.

V1 enforces at most one `active=true` operator in the database. To rotate the operator safely, replace the placeholder values and run the whole transaction together. If the new row cannot be activated, the transaction rolls back and preserves the previous operator:

```sql
begin;

update public.mentor_staff
set active = false
where active = true;

insert into public.mentor_staff (user_id, display_name, active)
values ('NEW_CLERK_USER_ID', 'New operator display name', true)
on conflict (user_id) do update
set display_name = excluded.display_name,
    active = true;

commit;
```

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'mentor_staff',
    'mentor_conversations',
    'mentor_messages',
    'mentor_rpc_idempotency'
  )
order by tablename;

select policyname, tablename, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('mentor_conversations', 'mentor_messages')
order by tablename, policyname;

select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('mentor_conversations', 'mentor_messages')
order by tablename;

select count(*) as private_idempotency_realtime_rows
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename = 'mentor_rpc_idempotency';

select count(*) as active_operator_count
from public.mentor_staff
where active = true;
```

`private_idempotency_realtime_rows` must be `0`. Any non-zero result is a deployment failure: remove `mentor_rpc_idempotency` from `supabase_realtime` before client traffic.

### Private Realtime

Durum: AKTIF REFERANS · Tasarım: 2026-09-25 (güvenlik denetimi G4#1) · Kanıt: `supabase/volunteer_mentor.sql` Realtime bölümü, `lib/mentor/volunteerDeskState.ts` `mentorPrivateChannelOptions()`, `npm run test:mentor-db` "private Realtime topics". Canlı durum `docs/STATUS.md`.

Gönüllü masanın dört canlı kanalı private açılır. Supabase bir private kanala katılımı yalnız `realtime.messages` üzerindeki SELECT politikalarına göre kabul eder: öğrenci yalnız kendi görüşme listesi ve kendi görüşmesinin mesaj kanalına, aktif operatör yalnız kendi kimliğiyle başlayan operatör kanallarına girer. Yazma politikası yoktur. Satır verisi yine tabloların RLS'iyle süzülür.

Sıra önemlidir. Panel ayarı koddan önce kapatılırsa bugünkü kanallar reddedilir ve masa canlı güncellemeyi kaybeder:

1. Yedek al ve doğrula (bölüm 7).
2. SQL'in Realtime bölümünü canlıya uygula (Kerem onayı). Bu adım bugünkü kanalları etkilemez.
3. Private kanal kullanan kodu yayına al (push, Kerem kararı).
4. İki hesaplı testi yap (aşağıda).
5. Supabase Dashboard → Realtime → Settings → "Allow public access" ayarını kapat ve sayfa altındaki "Save" ile kaydet (Kerem). Ekranda kapalı görünmesi yetmez; genel anahtarla herkese açık bir kanala katılma denemesi `PrivateOnly` ile reddedilmelidir.
6. İki hesaplı testi tekrarla. Masa bozulursa ayarı hemen geri aç, sonra incele.

Doğrulama sorgusu: politika listesinde yalnız iki satır olmalı (`mentor_realtime_staff_read`, `mentor_realtime_student_read`), ikisi de `SELECT`; anon yazma yetkileri `false` beklenir:

```sql
select policyname, cmd, roles
from pg_policies
where schemaname = 'realtime' and tablename = 'messages'
order by policyname;

select has_table_privilege('anon', 'realtime.messages', 'insert') as anon_insert,
       has_table_privilege('anon', 'realtime.messages', 'update') as anon_update;
```

`realtime.messages` Supabase'in Realtime rolüne aittir. Barındırılan projede `revoke` bu yetkileri kaldıramayabilir; o durumda sonuç `true` kalır ve anon yazmasını RLS reddeder (yazma politikası yok). Sonucu STATUS'a yaz.

İki hesaplı test (üretimde, iki normal öğrenci hesabı + operatör hesabı, üç ayrı tarayıcı profili):

1. Öğrenci A `/ai-mentor?desk=volunteer` sayfasında görüşme başlatır veya açık görüşmesini açar; bağlantı durumu canlı görünür.
2. Operatör `/ekip/mentor` sayfasında A'nın görüşmesini açar ve cevap yazar; cevap A'nın ekranında sayfa yenilemeden görünür.
3. A cevap yazar; mesaj operatör ekranında yenilemeden görünür, liste sırası güncellenir.
4. Öğrenci B yalnız kendi görüşmesini görür; A'nın görüşmesi ve mesajları B'de hiç görünmez.
5. Üç tarayıcının geliştirici konsolunda Realtime yetki hatası (`Unauthorized`, `CHANNEL_ERROR`) yoktur.
6. Test görüşmelerini kapat.

Kayıt:

| Tarih | Adım | Sonuç |
| --- | --- | --- |
| 2026-09-25 22:04 UTC | 2. adım: migration `volunteer_mentor_private_realtime` (Kerem onayı; önce 21:11 UTC yedeği `--verify` ile doğrulandı) | İki SELECT politikası canlıda. Anon `insert`/`update` yetkisi `true` kaldı (Supabase'e ait). Geri alınan canlı denemede gerçek 2 öğrenci + operatör kimliğiyle 10/10 giriş kararı doğru; öğrenci ve anon yazma 42501 ile reddedildi; deneme satırı kalmadı. Canlıdaki herkese açık kanallar etkilenmedi. |
| 2026-09-26 | 3. adım: push (c2bab1e, kart 2 ile aynı yayın) | Yayın Ready. |
| 2026-09-25 22:38 UTC | 5. adım: "Allow public access" kapatıldı (Kerem; ilk denemede ekranda kapalı görünüyordu ama kaydedilmemişti, "Save" sonrası devreye girdi) | Genel anahtarla herkese açık kanal `PrivateOnly`, girişsiz masa kanalı `Unauthorized` ile reddedildi. |
| 2026-09-26 | 4.+6. adım: üretimde iki hesaplı test (Kerem) | Mesajlar öğrenci ve operatör arasında iki yönde yenilemeden geliyor. |

## Expert Lead Desk

Bu masa gönüllü görüşmelerinden ayrı bir `expert_leads` tablosu ve public form
endpoint'i kullanır. Kurulumu yalnızca production deploy yetkisi olan kişi yapar:

1. `supabase/volunteer_mentor.sql` artefact'ının uygulandığını ve tam olarak bir aktif `mentor_staff` satırı olduğunu doğrula.
2. Supabase SQL Editor'da `supabase/expert_leads.sql` artefact'ını uygula.
3. RLS matrisini doğrula: anon erişim reddedilmeli, normal authenticated kullanıcı satır okuyamamalı/değiştirememeli/silememeli, aktif staff ise select/update/delete yapabilmelidir. `is_active_mentor_staff()` kontrolünü staff tokenıyla ayrıca doğrula.
4. Uygulamayı yalnızca server-only `SUPABASE_SERVICE_ROLE_KEY` ile deploy et; bu key hiçbir client dosyasına veya `NEXT_PUBLIC_*` değişkenine konulamaz.
5. Signed-out durumda public form ile bir guest lead gönder ve `/ekip/uzman` panelinden listeleme, filtre, WhatsApp bağlantısı, durum ve ekip notu işlemlerini doğrula.
6. Manuel test sonunda test lead kaydını `/ekip/uzman` panelinden sil.

`supabase/expert_leads.sql` kurulmamışsa public endpoint kontrollü `503` döner; RLS'yi gevşetmek veya service-role key'i client'a vermek kabul edilebilir bir fallback değildir.

Saatlik yoğunluk (2026-09-25, Kerem kararı 50 / 150): son bir saatte site genelinde 50 talep dolduysa yeni talepler `suspected` durumuyla kaydedilir ve `/ekip/uzman` "Şüpheli" filtresinde bekler; 150'den sonrası reddedilir ve form öğrencinin girdisini koruyarak "yoğunluk" mesajı gösterir. Gerçek bir şüpheli talep durumunu "Yeni" yaparak listeye alınır. Gelen kutusu "Yeni" filtresiyle açılır ve 50'lik sayfalarla yüklenir. Canlıya uygulama: 2026-09-25 22:20 UTC, migration `expert_leads_suspected_threshold` (Kerem onayı). Geri alınan denemede ilk 50 `new`, 51-150 `suspected`, 151. `expert_lead_rate_limited`; deneme satırı kalmadı.

## 7) Yedek ve geri yükleme

Durum: AKTIF REFERANS · Kuruluş: 2026-09-25 (güvenlik denetimi G2#2) · Kanıt: `scripts/backup-supabase.mjs`, aşağıdaki prova kaydı.

Supabase Free planında otomatik yedek (PITR) yoktur. Veritabanı veya belge deposu bozulur, yanlış bir `--apply`/silme olur ya da proje kısıtlanırsa geri dönüş yolu bu bölümdür.

### Ne yedeklenir, ne yedeklenmez

| Yedeklenir | Yedeklenmez (yeni projede panelden veya repodan kurulur) |
| --- | --- |
| `public` şemasının tamamı: 15 tablo ve verileri (kullanıcı tabloları dahil: `favorites`, `user_documents`, `user_profiles`, `mentor_*`, `expert_leads`, `sat_attempts`), `program_degree_class_codes` view'i, fonksiyonlar, trigger'lar, RLS politikaları, tablo/fonksiyon yetkileri, varsayılan yetkiler | `auth` şeması (giriş Clerk'te; 2026-09-25'te 1 eski kayıt), `vault` (boş), `supabase_migrations` geçmişi, `extensions` |
| Storage `documents` (öğrenci belgeleri) ve `sat-figures` (SAT şekilleri) dosyaları | Panel ayarları: Third-Party Auth (Clerk, bölüm 2), API anahtarları, Data API ayarları |
| `manifest.json`: tablo satır ve nesne sayıları (dump ile aynı snapshot), dosya sha256 özetleri, bucket ayarları, Storage politikalarının metni, Realtime yayınındaki tablolar | Vercel ortam değişkenleri |

`pg_dump --schema=public` Realtime yayın üyeliğini içermez; bu yüzden liste manifest'e yazılır ve geri yüklemede yeniden kurulur (prova bunu 2026-09-25'te yakaladı).

Arşiv: `italypath-supabase-<UTC zaman>.tar.gpg`. İçinde `manifest.json`, `db/public.dump` (pg_dump custom format) ve `storage/<bucket>/<yol>`. Şifreleme gpg simetrik AES256 (RFC 4880, bütünlük kontrollü); parola `BACKUP_PASSPHRASE`. Arşiv kişisel veri içerir: parolasız paylaşılmaz, repoya girmez (betik repo içi klasörü reddeder, `.gitignore` `*.tar.gpg` ve `*.dump` dosyalarını dışlar).

### Bir kez kurulum

1. PostgreSQL araçları sunucu sürümünden eski olamaz. Supabase 17 kullanıyor: `brew install postgresql@17` (2026-09-25'te 17.11 kuruldu; 16 yerinde kaldı). Homebrew'un 17.11 paketi, 16 bağlıyken paylaşım ve kütüphane klasörlerini bağlamıyor. Bu yüzden iki kısayol eklendi: `/opt/homebrew/share/postgresql@17` → `../opt/postgresql@17/share/postgresql` ve `/opt/homebrew/lib/postgresql@17` → `../opt/postgresql@17/lib/postgresql`. Bunlar olmadan `initdb` "postgres.bki does not exist" hatası verir.
2. gpg: bu Mac'te 2.5.20 kurulu (`brew install gnupg`).
3. `.env.local` içine üç değer girer (değerler asla yazdırılmaz; betik bağlantıyı `PG*` ortam değişkenleriyle, parolayı gpg'ye ayrı kanaldan verir):
   - `SUPABASE_DB_URL`: Dashboard → Connect → **Session pooler** (port 5432). Doğrudan bağlantı yalnız IPv6'dır; transaction pooler (6543) reddedilir.
   - `BACKUP_PASSPHRASE`: en az 16 karakter. Kerem şifre yöneticisinde de tutar. **Parola kaybolursa yedek açılamaz.**
   - `BACKUP_DIR`: repo dışında bir klasör. 2026-09-25: `~/Desktop/ItalyPath-Yedek`. Kerem arşivleri daha sonra bilgisayar dışında bir yere (harici disk veya bulut) kopyalayacak. Betik hedef bu bilgisayardaysa uyarı verir.

### Ne zaman

- Haftada bir (`docs/USAGE_LIMITS.md` kontrol takvimi).
- Canlı veriye yazan her işten önce: `import-*` betiklerinin `--apply` koşusu, SQL ile güncelleme/silme, migration. Yedek alınıp `--verify` geçmeden bu işler başlamaz.
- Her tam yedek Supabase egress harcar (2026-09-25 ölçümü aşağıdaki kayıtta). Günde birden fazla çalıştırma.

### Komutlar

1. `npm run backup:supabase -- --dry-run`: canlıdan yalnız sayım okur. Ne yedekleneceğini, tahmini boyutu ve hazırlık eksiklerini yazar. Dosya yazmaz.
2. `npm run backup:supabase -- --run`: şifreli arşivi oluşturur, ardından hemen açıp dump özetini kontrol eder.
3. `npm run backup:supabase -- --verify [arşiv]`: arşivi geçici klasöre açar. Parola, gpg bütünlüğü, dump ve dosya sha256 özetleri ve dump içerik listesini kontrol eder. Canlıya bağlanmaz.
4. `npm run backup:supabase -- --drill [arşiv]`: geri yükleme provası (aşağıda). Canlıya bağlanmaz.

`[arşiv]` verilmezse `BACKUP_DIR` içindeki en yeni arşiv kullanılır.

### Geri yükleme provası (`--drill`)

1. Arşivi geçici klasöre açar ve `--verify` kontrollerini yapar.
2. Geçici bir PostgreSQL kümesi kurar (`initdb --no-locale`, `LC_ALL=C`). Küme yalnız bu kullanıcıya açık bir unix soketinde dinler, TCP portu açmaz.
3. Supabase'in hazır kurduğu parçaların taslaklarını ekler: `anon`, `authenticated`, `service_role`, `authenticator`, `supabase_admin` rolleri, `auth.jwt()`/`auth.uid()`/`auth.role()`, `extensions` şeması (pgcrypto, uuid-ossp) ve `supabase_realtime` yayını.
4. `pg_restore --single-transaction --exit-on-error` çalıştırır. İçerik listesinden yalnız `SCHEMA - public` satırı çıkarılır (hedefte şema zaten vardır).
5. Manifest'teki Realtime tablolarını yayına ekler.
6. Karşılaştırma: her tablonun satır sayısı ve 15 nesne türü yedek anıyla eşleşmelidir (tablo, view, materialized view, sequence, indeks, kısıt, fonksiyon, trigger, politika, RLS açık tablo, tip, tablo yetkisi, fonksiyon yetkisi, varsayılan yetki, Realtime tablosu). Storage dosyalarının sha256 özetleri de eşleşmelidir. Tek bir eşleşmeme varsa sonuç "TUTMADI" olur ve çıkış kodu 1'dir.
7. Kümeyi durdurur, açılan dosyaları siler.

### Prova kaydı

| Tarih | Arşiv | Sonuç | Not |
| --- | --- | --- | --- |
| 2026-09-25 | `italypath-supabase-20260925T211128Z.tar.gpg`: 7,7 MB (dump 3,3 MB + 265 dosya 4,5 MB), yedek süresi ~1,5 dk | **TUTTU**: tablo 15/15 (3.168 satır), nesne türü 15/15 (15 tablo, 1 view, 38 indeks, 62 kısıt, 9 fonksiyon, 6 trigger, 22 politika, 389 tablo yetkisi, 35 fonksiyon yetkisi, 6 varsayılan yetki, 2 Realtime tablosu), dosya 265/265 sha256 | Kaynak Supabase 17.6, prova yerel PostgreSQL 17.11. Sayımlar ve dump aynı snapshot'tan alındı (Session pooler snapshot paylaşımına izin verdi). Egress üst sınırı ~16,6 MB. Aynı gün sahte veriyle yapılan ön prova, Realtime üyeliğinin dump'ta olmadığını yakaladı ve düzeltildi. Gerçek bir Supabase projesine geri yükleme denenmedi. |

### Acil durumda gerçek geri yükleme

Bu adımlar canlıya yazar. Her adım yalnız Kerem'in açık onayıyla yapılır. 2026-09-25 itibarıyla gerçek bir Supabase projesine karşı denenmedi; yukarıdaki prova yerel Postgres'te süper kullanıcıyla yapıldı.

**A) Yeni, boş bir Supabase projesine tam geri yükleme (proje kaybı):**

1. Aynı bölgede (eu-central-2) Postgres 17 ile yeni proje aç. Bölüm 2'deki Clerk Third-Party Auth ayarını yap.
2. Arşivi aç. Repo gerekmez, gpg ve tar yeterlidir: `gpg --decrypt <arşiv> | tar -xf - -C <boş klasör>`. gpg parolayı sorar.
3. İçerik listesini hazırla. İki tür satır çıkarılır: `SCHEMA - public` (yeni projede şema hazır gelir) ve `DEFAULT ACL ... supabase_admin` ile biten 3 satır. Supabase'de `postgres` rolü `supabase_admin` adına varsayılan yetki değiştiremez; yeni projede bu yetkiler zaten aynıdır. Komut: `pg_restore --list db/public.dump | grep -v -E ' SCHEMA - public | DEFAULT ACL .* supabase_admin$' > restore.list`
4. Geri yükle: `pg_restore --dbname=postgres --single-transaction --exit-on-error --use-list=restore.list db/public.dump`. Bağlantıyı komut satırına parola yazarak değil, yeni projenin Session pooler bilgileriyle `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGSSLMODE=require` ortam değişkenleriyle ver. Hata olursa tek transaction olduğu için hiçbir şey yazılmaz; hatayı oku, listeyi düzelt, yeniden dene.
5. Realtime'ı yeniden kur: `alter publication supabase_realtime add table public.mentor_conversations, public.mentor_messages;` Tablo listesi `manifest.json` → `database.realtime_tables` alanındadır.
6. Storage'ı kur:
   - Bucket'ları `manifest.json` → `storage.buckets` ayarlarıyla oluştur. 2026-09-26'dan beri: `documents` private, 5 MB sınır, pdf/jpeg/png/webp/heic/heif (`supabase/rls_hardening.sql`); `sat-figures` public, 512 KB, yalnız WebP (`supabase/sat_bank.sql`). 2026-09-25 arşivinin manifest'i eski ayarı (20 MB, `sat-figures` sınırsız) taşır; repodaki SQL esastır.
   - `documents` politikaları için `supabase/rls_hardening.sql` Storage bölümünü uygula. Sonucu manifest'teki 4 politikayla karşılaştır (`documents_select/insert/update/delete_own_objects`).
   - Dosyaları service-role ile `storage/<bucket>/<yol>` altındaki aynı yola yükle. `user_documents.storage_path` bu yollara bakar.
7. Vercel'de `NEXT_PUBLIC_SUPABASE_URL`, anon/publishable, service-role ve `SUPABASE_SECRET_KEY` (yeni projenin `sb_secret_…` anahtarı; yoksa okul/program sayfaları çalışmaz) anahtarlarını yeni projeye çevir. Ardından `npm run check:data` ve bölüm 5'teki doğrulama testini yap.

**B) Mevcut projede kısmi kurtarma (örneğin yanlış bir `--apply` sonrası birkaç satır):**

1. Önce bugünkü durumun yedeğini al (`--run`), `--verify` ile kontrol et.
2. Eski satırları yedekten SQL dosyasına çıkar. Canlıya dokunmaz: `pg_restore --data-only --table=<tablo> --file=<tablo>.sql db/public.dump`
3. Yalnız gereken satırlar için düzeltme SQL'i hazırla ve canlıyla karşılaştır. Kerem onayıyla uygula.

## 8) Veri API yetkileri ve kullanıcı yazma sınırları

Durum: AKTIF REFERANS · Uygulama: 2026-09-26 (güvenlik denetimi kart 4: S9#1 veritabanı tarafı, S3#6, S3#2, S5#1, G4#3, S3#7, O5#7) · Kanıt: `supabase/data_api_privileges.sql`, `supabase/archive_legacy_content_tables.sql`, `supabase/rls_hardening.sql`, `supabase/user_profiles.sql`, `supabase/sat_bank.sql`, `supabase/schema_2026-09-26.sql`, `npm run test:mentor-db`.

Kural özeti:

- Katalog (`universities`, `university_departments` ve id dizisi, `program_admission_details`, `program_degree_class_codes`) yalnız sunucudan, gizli anahtarla (service_role) okunur. anon ve authenticated rollerinin yetkisi ve okuma politikası yoktur.
- `community_links` ve `scholarship_regions` yerinde arşivlidir (Kerem kararı): satırlar ve yedek yerinde, istemci erişimi kapalı, tablo yorumu "ARSIV". Site bu verileri kod içinden okur.
- `postgres` rolünün `public` şemasında açtığı yeni tablo ve diziler istemci rollerine kapalı başlar. Yeni tablo ekleyen SQL dosyası, RLS politikalarının yanında gereken `grant`'ları açıkça yazar. Yeni fonksiyonların varsayılan çalıştırma izni değişmedi.
- `pg_graphql` kapalıdır (site GraphQL kullanmaz). Yeniden açmak: Dashboard → Database → Extensions.
- Kullanıcı tabloları: anon hiçbir şey yapamaz. authenticated `favorites` ve `user_documents`'ta okuma/ekleme/silme, `user_profiles`'ta okuma/ekleme/güncelleme/silme, `sat_attempts`'ta okuma/ekleme yapar; satırlar RLS ile sahibine süzülür.
- Kişi başı sınırlar: 100 favori (`favorite_limit_reached`), 30 belge satırı (`document_limit_reached`), `documents` deposunda 30 dosya, 24 saatte 2.000 SAT denemesi (`sat_attempt_rate_limited`; deneme saati sunucudan yazılır), profilde en çok 2 alan. Uzunluk kuralları: dosya adı 255, depo yolu 300 ve sahibin klasöründe, SAT cevabı 32 karakter.

Sıra önemlidir: katalog kapatılmadan önce sitenin katalogu gizli anahtarla okuduğu canlıda doğrulanmalıdır (kart 2). Aksi halde tüm okul ve program sayfaları çöker.

Kayıt:

| Tarih | Adım | Sonuç |
| --- | --- | --- |
| 2026-09-25 23:10 UTC (TR 26 Eylül) | Ön kontrol: kart 2 canlıda (22:25 UTC'den beri katalog okumalarının tamamı gizli anahtarla), 21:11 UTC yedeği `--verify` ile sağlam, canlı veride yeni kurallara aykırı satır 0 (yalnız sayım sorguları) | Geçti |
| 2026-09-25 23:16-23:24 UTC | Migration `card4_data_api_privileges` (23:16), `card4_archive_legacy_content_tables` (23:18), `card4_rls_hardening_limits` (23:19), `card4_user_profiles_limits` (23:20), `card4_sat_bank_limits` (23:20), `card4_catalog_sequence_privileges` (23:24; ilk migration'da atlanan id dizisi) (Kerem onayı; her biri repodaki dosyanın `begin`/`commit` arası içeriği) | anon anahtarıyla katalog isteği 42501 "permission denied"; gizli anahtarla okuma 200; GraphQL "extension is not enabled"; önbellekte olmayan okul/program sayfaları, `/api/universities` ve `/sitemap.xml` 200; Supabase kayıtlarında sunucu okumaları 200; yabancı bir kullanıcı rolüyle salt okunur denemede başkasına ait favori/belge/profil/SAT/dosya 0 satır |
| 2026-09-25 23:22 UTC | Danışmanlar: güvenlik `function_search_path_mutable` 1 → 0, GraphQL görünürlük uyarıları 8+13 → 0; performans `duplicate_index` 1 → 0. Bilinçli kalanlar: RLS açık ama politikasız tablolar (katalog, arşiv, SAT soruları, mentor iç tabloları; yalnız sunucu okur), mentor RPC'leri (kart 5), Supabase Auth parola uyarısı (giriş Clerk'te) | Kayıt |

Canlı kabul (giriş gerektirir, Kerem): favori ekle/çıkar, 5 MB altı belge yükle/sil, bir SAT sorusu çöz, profil kaydet. Hepsi normal çalışmalı.

Geri alma (yalnız Kerem onayıyla, migration olarak): katalogda istemci okumasını açmak için `grant select` ve okuma politikası geri kurulur; sınırlar ilgili `drop trigger`/`drop constraint` ile kaldırılır; `documents` sınırı `storage.buckets` üzerinden değiştirilir. Ayrıntılı komutlar bu belgeye yazılmaz; repodaki SQL dosyaları referanstır.

Bilinen etki: `~/remake` iOS uygulaması (yayında değil) katalog ve burs tablolarını anon anahtarla okur ve 20 MB belge yükler; bu değişiklikten sonra o ekranlar çalışmaz. Yayınlanırsa sitenin sunucu adresinden okumaya taşınmalı (`docs/STATUS.md`).

