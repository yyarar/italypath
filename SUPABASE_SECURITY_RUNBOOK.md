# Supabase Security Runbook (Clerk + RLS)

Bu doküman teknik olmayan kullanım için hazırlanmıştır. Sırayla uygula.

## Kapsam ve son doğrulama

Durum: AKTIF REFERANS · İlk sürüm: 2026-02-26 (1cdc111) · Son doğrulama: 2026-09-26 (`docs/STATUS.md` #32; yalnız repodaki dosyalardan, canlı veritabanına bağlanılmadan) · Kanıt: canlı `public` şema dökümü `supabase/schema_2026-09-26.sql` (alınma 2026-09-25 23:24 UTC, kart 4 sonrası), bölüm 8 ve 9 kayıtları, "Private Realtime" ve "Expert Lead Desk" kayıtları, `docs/STATUS.md` Kapananlar, `supabase/*.sql` dosya başlıkları. "Doğrulanmadı" yazan satırlar repoda kanıtı olmayan noktalardır.

### Ne kapsar, ne kapsamaz

- Kapsar: Clerk ↔ Supabase oturum modeli (bölüm 1-2), kullanıcı tablolarının RLS ve yetkileri (3, 8), doğrulama testleri (5-6), gönüllü ve uzman masası kurulumu ("Volunteer Mentor", "Expert Lead Desk"), yedek ve geri yükleme (7), Veri API yetkileri ve kullanıcı yazma sınırları (8), SAT ilerleme okuması (9) ve aşağıdaki SQL bağımlılık tablosu.
- Kapsamaz: sıfırdan tam kurulum rehberi (böyle bir kurulum hiç denenmedi; aşağıdaki sıra bağımlılıktan türetilmiştir), Vercel ortam değişkenleri ve kod tarafı (`AGENT_CONTEXT.md` "Supabase Yuzeyleri" ve "Environment Degiskenleri"), veri yazma ve import kuralları (`DATA_ENTRY_GUIDE.md`), servis planları ve limitleri (`docs/USAGE_LIMITS.md`), açık işler (`docs/STATUS.md`).
- Bölüm numaraları tarihseldir: 1-6 ilk kurulum (2026-02), ardından numarasız "Volunteer Mentor" (2026-07) ve "Expert Lead Desk" (2026-08), sonra 7 (yedek, 2026-09-25), 8 (Veri API yetkileri, 2026-09-26) ve 9 (SAT ilerleme, 2026-09-26). Numaralar değiştirilmez; `AGENTS.md`, `DATA_ENTRY_GUIDE.md` ve `docs/STATUS.md` bunlara atıf yapar.

### Canlı durumun kaynağı

- `supabase/schema_2026-09-26.sql`: `pg_dump --schema-only --schema=public`, 2026-09-25 23:24 UTC, kart 4 migration'larından hemen sonra. Kart 7 nesneleri (`sat_latest_attempts` view'i ve `sat_attempt_summary` fonksiyonu; migration 23:58 UTC) bu dökümde YOKTUR; kanıtları bölüm 9 kaydıdır. `realtime.messages` politikaları ve Storage politikaları `public` şeması dışındadır: Storage ayarları ve politikaları dökümün altında yorum olarak durur, Realtime politikalarının kanıtı "Private Realtime" kaydıdır.
- Yeni döküm alınırsa dosya adı tarihle değişir, bu bölüm ve `AGENT_CONTEXT.md` "Supabase Yuzeyleri" güncellenir. Dökümü almak canlı okumadır (egress); yalnız şema değişikliğinden sonra alınır.

### SQL bağımlılık tablosu (2026-09-26)

Her dosya yeniden çalıştırılabilir yazılmıştır ("rerunnable"); canlıya uygulama yöntemi bölüm 8 kaydındaki gibidir: dosyanın `begin`/`commit` arası içeriği, Kerem onayıyla, tek migration olarak. "İlk uygulanma tarihi doğrulanmadı" demek: dosya o tarihte repoya girdi ve nesne bugün canlıda var, ama canlıya ilk ne zaman uygulandığına dair kayıt yok.

| Dosya | Amaç | Bağımlı olduğu nesneler | Canlıda uygulanmış mı | Kanıt |
| --- | --- | --- | --- | --- |
| `supabase/rls_hardening.sql` | `favorites` ve `user_documents` RLS, en az yetki, uzunluk kuralları, kişi başı 100 favori / 30 belge; `documents` bucket'ı (private, 5 MB, MIME listesi) ve Storage politikaları; `requesting_user_id()` fonksiyonu | `favorites`, `user_documents` tabloları (repoda CREATE yok; dökümde var), `user_documents.category` kolonu (`add_documents_category.sql` önce), `storage.buckets` / `storage.objects` | Evet. İlk sürüm bölüm 3 ile (repoya 2026-02-26; ilk uygulanma tarihi doğrulanmadı); kart 4 sürümü migration `card4_rls_hardening_limits` 2026-09-25 23:19 UTC | Bölüm 8 kaydı; dökümde `favorites_*_own` ve `documents_*_own_rows` politikaları, `favorites_per_user_cap` ve `user_documents_per_user_cap` trigger'ları, `documents` bucket ayarı (alt yorum) |
| `supabase/add_documents_category.sql` | `user_documents.category` kolonu (belge türü) | `user_documents` | Evet; tarih doğrulanmadı (repoya 2026-06-01) | Dökümde `user_documents.category text`; `rls_hardening.sql` bu kolona kısıt koyar |
| `supabase/user_profiles.sql` | `user_profiles` tablosu (onboarding cevapları), en çok 2 alan kısıtı, RLS, authenticated grant | `requesting_user_id()` (`rls_hardening.sql` veya `volunteer_mentor.sql`) | Evet. İlk kurulum tarihi doğrulanmadı (repoya 2026-07-02); kart 4 sürümü `card4_user_profiles_limits` 2026-09-25 23:20 UTC | Bölüm 8 kaydı; dökümde tablo ve 4 `user_profiles_*_own` politikası |
| `supabase/program_admission_details.sql` | Kabul dosyası tablosu; `university_departments.level` kısıtı (bachelor / master / single-cycle) ve `(id, university_id)` benzersizliği; yabancı anahtar (cascade); indeks; yalnız `service_role` yetkisi | `universities`, `university_departments` (repoda CREATE yok; dökümde var) | Tablo: evet (dökümde; 941 satır, 2026-09-21 sayımı). Sunucuya özel yetki kısmı `card4_data_api_privileges` ile canlıda (aynı revoke ve `program_admission_details_public_read` politikasının düşürülmesi); bu dosyanın kart 4 sürümünün kendisinin yeniden koşulup koşulmadığı doğrulanmadı | Döküm; bölüm 8 kaydı; `npm run check:university-data-source` dosyada istemci grant'ı olmadığını denetler |
| `supabase/program_degree_class_codes.sql` | `degree_class` metninden kısa resmî kodları (LM-32 gibi) veren salt okunur view (`security_invoker`). **Dizin sorgusunun bağımlılığıdır:** `lib/universities.server.ts` her dizin yenilemesinde bu view'i okur; yeni bir Supabase ortamında oluşturulmazsa okul/program listeleri ve sitemap hata verir (`AGENTS.md`) | `program_admission_details` | Evet: 2026-09-19 migration `program_degree_class_codes_view` (dosya başlığı, Kerem onayı); istemci yetkileri kart 4 ile kapandı | Dosya başlığı; dökümde `CREATE VIEW`; `check:university-data-source` view okumasını zorlar |
| `supabase/data_api_privileges.sql` | Katalog tabloları, view ve `university_departments_id_seq` istemci rollerine kapalı; `*_public_read` politikaları düşer; `postgres`'in yeni tablo ve dizileri kapalı başlar; `set_updated_at()` `search_path`; `pg_graphql` kaldırılır | 3 katalog tablosu, view, id dizisi, `set_updated_at()` (koşullu). **Sıra:** site katalogu `SUPABASE_SECRET_KEY` ile okuyor olmalı (kart 2), aksi halde okul ve program sayfaları çöker | Evet: `card4_data_api_privileges` 23:16 UTC ve `card4_catalog_sequence_privileges` 23:24 UTC (2026-09-25) | Bölüm 8 kaydı; dökümde varsayılan yetkiler; `check:university-data-source` dosyanın revoke satırlarını denetler |
| `supabase/archive_legacy_content_tables.sql` | `community_links` ve `scholarship_regions` yerinde arşiv: istemci yetkileri ve okuma politikaları kalkar, tablo yorumu "ARSIV" | Bu iki tablo (repoda CREATE yok; dökümde var) | Evet: `card4_archive_legacy_content_tables` 2026-09-25 23:18 UTC | Bölüm 8 kaydı; dökümde tablolar ve `set_updated_at_*` trigger'ları |
| `supabase/sat_bank.sql` | `sat_questions` (yalnız `service_role`), `sat_attempts` (RLS, 24 saatte 2.000 deneme, cevap 32 karakter, sunucu zamanı), `sat-figures` bucket'ı (public, 512 KB, WebP) | `requesting_user_id()`, `storage.buckets` | Evet. İlk kurulum tarihi doğrulanmadı (repoya 2026-07-04; canlıda 1.019 soru, `docs/STATUS.md` 2026-09-21); kart 4 sürümü `card4_sat_bank_limits` 2026-09-25 23:20 UTC | Bölüm 8 kaydı; dökümde iki tablo, `sat_attempts_daily_cap` trigger'ı, `sat_attempts_user_answered_idx`, `sat-figures` bucket ayarı (alt yorum) |
| `supabase/sat_explanations.sql` | `sat_questions.explanation_en` kolonu (mevcut veritabanı için; güncel `sat_bank.sql` kolonu tablo tanımında zaten taşır) | `sat_questions` | Evet; tarih doğrulanmadı (repoya 2026-08-13) | Dökümde kolon; 1.019/1.019 dolu (`docs/STATUS.md` 2026-09-21) |
| `supabase/sat_progress.sql` | `sat_latest_attempts` view'i (soru başına son deneme) ve `sat_attempt_summary(text)` fonksiyonu (bugün / seri); yalnız authenticated | `sat_attempts` ve `sat_attempts_user_answered_idx` (`sat_bank.sql`); RLS üzerinden `requesting_user_id()` | Evet: `card7_sat_progress` 2026-09-25 23:58 UTC (bölüm 9). Dökümde YOK (döküm 23:24 UTC'de, bu migration'dan önce alındı) | Bölüm 9 kaydı; `npm run test:mentor-db` yerel testi; `docs/STATUS.md` #60 |
| `supabase/volunteer_mentor.sql` | Gönüllü masa: `mentor_staff`, `mentor_conversations`, `mentor_messages`, `mentor_rpc_idempotency`; `requesting_user_id()` ve `is_active_mentor_staff()`; 4 RPC; öğrenci hız sınırları (10 dk 20 mesaj, 24 saat 5 görüşme); Realtime yayını ve `realtime.messages` private kanal politikaları; legacy ön kontrol (`legacy_mentor_idempotency_migration_required`) | `realtime.messages` ve `supabase_realtime` yayını (Supabase yönetir) | Evet. İlk kurulum 2026-07 (bölüm 1 "mentor masası 2026-07'den beri"; kesin gün doğrulanmadı, repoya 2026-07-20); `volunteer_mentor_student_rate_limit` 2026-09-25; `volunteer_mentor_private_realtime` 2026-09-25 22:04 UTC | "Volunteer Mentor" ve "Private Realtime" kayıtları; `docs/STATUS.md` Kapananlar 2026-09-25/26; dökümde 4 tablo, fonksiyonlar (`message_rate_limited`, `conversation_rate_limited` dahil), 2 SELECT politikası, Realtime yayın tabloları (alt yorum). `realtime.messages` politikaları `public` dökümünde görünmez |
| `supabase/expert_leads.sql` | Uzman masası: `expert_leads` tablosu ve kısıtları (`suspected` durumu dahil), `updated_at` trigger'ı, saatlik 50 şüpheli / 150 tavan trigger'ı, indeksler, yalnız aktif staff RLS | `is_active_mentor_staff()` (`volunteer_mentor.sql`; bu yüzden ondan sonra) | Evet. İlk kurulum tarihi doğrulanmadı (repoya 2026-08-10); `expert_leads_hourly_cap` 2026-09-25; `expert_leads_suspected_threshold` 2026-09-25 22:20 UTC | "Expert Lead Desk" bölümü; `docs/STATUS.md` Kapananlar; dökümde tablo (`expert_leads_status_check` içinde `suspected`), `expert_leads_hourly_cap` ve `expert_leads_set_updated_at` trigger'ları, 3 `expert_leads_*_staff` politikası |
| `supabase/schema_2026-09-26.sql` | Canlı `public` şemasının tarihli dökümü (yalnız yapı, satır yok). Uygulanmaz; referans | — | Uygulanmaz | Dosya başlığı (alınma zamanı, kaynak) |

SQL olmayan izleme dosyası: `supabase/import-manifests/` (kabul dosyası yazıcılarının başarılı `--apply` sonrası bıraktığı manifestler; kural `DATA_ENTRY_GUIDE.md`).

### Uygulama sırası (bağımlılıktan türetildi; sıfırdan kurulum denenmedi)

1. Repoda `CREATE TABLE` metni olmayan tablolar: `universities`, `university_departments`, `favorites`, `user_documents` (ve arşivlenecekse `community_links`, `scholarship_regions`). Yapıları dökümden okunur; canlıda nasıl oluşturuldukları (panel mi, eski bir SQL mi) doğrulanmadı.
2. `supabase/add_documents_category.sql`, sonra `supabase/rls_hardening.sql` (`requesting_user_id()` burada tanımlanır).
3. `supabase/user_profiles.sql`.
4. `supabase/program_admission_details.sql`, sonra `supabase/program_degree_class_codes.sql` (dizin bu view olmadan çalışmaz).
5. `supabase/sat_bank.sql`; yalnız eski veritabanında `supabase/sat_explanations.sql`; sonra `supabase/sat_progress.sql`.
6. `supabase/volunteer_mentor.sql`, sonra `supabase/expert_leads.sql`.
7. Yalnız o tablolar varsa `supabase/archive_legacy_content_tables.sql`.
8. En son `supabase/data_api_privileges.sql`: site katalogu gizli anahtarla okuyor olmalı (kart 2); sonra Realtime "Allow public access" kapatma sırası "Private Realtime" bölümündeki gibi.

Canlıdaki gerçek sıra tarihseldir ve bunun aynısı değildir (2026-02 hardening, 2026-06 kabul dosyası, 2026-07 profil / SAT / mentor, 2026-08 uzman masası, 2026-09-19 view, 2026-09-25 hız sınırları + private Realtime + kart 4, 2026-09-25 23:58 UTC kart 7). Her adımdan önce yedek + `--verify` (bölüm 7) ve Kerem onayı; `execute_sql` ile DDL/DML yapılmaz (`AGENTS.md`).

## 1) Clerk tarafı (oturum anahtarı)

Sitenin Supabase'e giden bütün istekleri Clerk'in native Supabase entegrasyonundan
gelen normal session token'ını kullanır (mentor masası 2026-07'den beri; favoriler,
belgeler, profil ve SAT 2026-09-26'dan beri, güvenlik denetimi kart 7:
`lib/useUserSupabaseClient.ts`). Kodda deprecated `supabase` JWT template'i yoktur;
`check:hub-onboarding` ve `check:mentor-desks` geri gelmesini engeller.

Clerk panelindeki eski `supabase` JWT template'i yalnız şu sırayla kaldırılır:

1. Kart 7 kodu yayında (push, Kerem kararı).
2. Bölüm 5'teki iki hesaplı test canlıda geçti.
3. Kerem Clerk Dashboard → JWT Templates → `supabase` ekranında imza ayarını not eder (özel imza anahtarı mı, hangi algoritma) ve sonucu `docs/STATUS.md`'ye yazar.
4. Kerem template'i siler. Yeni template oluşturulmaz.

Template silinmeden önce yayındaki eski sürüm (kart 7 öncesi) hâlâ onu kullanır; bu yüzden sıra değişmez.

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

1. Kullanıcı A ile giriş yap, bir belge yükle, favori ekle, `/hosgeldin`'de profil kaydet, `/sat`'ta bir soru çöz.
2. Kullanıcı B ile giriş yap, A'nın belgesi/favorisi/profili/SAT ilerlemesi görünmemeli.
3. Belgede "Görüntüle" yeni sekmede belgeyi açmalı. Link yalnız tıklanınca üretilir (2026-09-26'dan beri).
4. Açılan belge adresi 2 dakika sonra tekrar açılınca geçersiz olmalı (link ömrü 90 saniye; normal davranış).
5. `/sat`'ta çözülen soru, "bugün" sayısı ve seri sayfa yenilenince korunmalı.
6. Tarayıcı konsolunda Supabase 401/403 hatası olmamalı.

## 6) Sorun olursa hızlı kontrol

1. Favori/belge/profil/SAT veya mentor akışında 401/403 varsa native session token yenilendi mi (çıkış/giriş)? Token'da `role=authenticated` ve Clerk kullanıcı kimliğiyle aynı `sub` olmalı.
2. Sayfa "yüklenemedi, tekrar dene" gösteriyorsa istek 15 saniyede cevap alamamış veya reddedilmiştir; konsoldaki hatayı oku.
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

Saklama (2026-09-26, Kerem kararı): `completed` ve `contacted` talepler son işlemden 6 ay, `suspected` talepler 30 gün sonra silinir; `new` taleplere dokunulmaz. Ayda bir `npm run cleanup:expert-leads` kuru çalıştırılır (yalnız sayı okur), silme `-- --apply` ile ve Kerem onayıyla yapılır. Tek tek silme talepleri ("SİL" cevabı) panelden hemen uygulanır.

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

## 9) SAT ilerleme okuması

Durum: AKTIF REFERANS · Tasarım: 2026-09-26 (güvenlik denetimi kart 7, O4#3) · Kanıt: `supabase/sat_progress.sql`, `lib/sat/useSatAttempts.ts`, `npm run test:mentor-db` ("sat progress"), `npm run check:sat-bank`.

`/sat` artık kullanıcının bütün denemelerini indirmez. İki okuma vardır:

- `sat_latest_attempts` (view, `security_invoker`): soru başına en son deneme. `sat_attempts` RLS'i çağıran kullanıcıya uygulanır; herkes yalnız kendi satırlarını görür.
- `sat_attempt_summary(p_time_zone)` (fonksiyon, `security invoker`): bugünkü deneme sayısı, güncel seri ve en uzun seri, tek satır. Günler tarayıcının saat diliminde sayılır; geçersiz saat dilimi UTC'ye düşer.

Yetki: ikisi de yalnız giriş yapmış kullanıcıya (authenticated) açıktır; ziyaretçi (anon) ve PUBLIC kapalıdır. Yeni tablo/view'lar kart 4'ten beri kapalı başlar, fonksiyonlarda Supabase varsayılanı açık olduğu için dosya fonksiyon iznini kendisi kapatır.

Sıra önemlidir: SQL canlıya push'tan ÖNCE uygulanır. Yeni kod view ve fonksiyon olmadan SAT ilerlemesini yükleyemez ("yüklenemedi" gösterir); eski kod bunlardan etkilenmez.

Kayıt:

| Tarih | Adım | Sonuç |
| --- | --- | --- |
| 2026-09-26 | Yerel test: `npm run test:mentor-db` (PostgreSQL 16 ve 17, `LC_ALL=C`) | Geçti: soru başına son deneme, gün özeti (bugün/seri/en uzun seri, saat dilimi, geçersiz saat dilimi), başka kullanıcının satırları görünmez, anon reddedilir, dosya yeniden çalıştırılabilir |
| 2026-09-25 23:55 UTC (TR 26 Eylül) | Yedek `italypath-supabase-20260925T235549Z.tar.gpg` (7,7 MB) alındı, `--verify` sağlam | Geçti |
| 2026-09-25 23:58 UTC (TR 26 Eylül) | Migration `card7_sat_progress` (Kerem onayı; dosyanın `begin`/`commit` arası içeriği) | Canlı kontrol (yalnız okuma, işlem sonunda geri alınan rol/kimlik ayarı): en çok denemesi olan gerçek öğrenci kimliğiyle `authenticated` rolünde görünüm 76 soru / 12 doğru, özet `0:0:3`; ikisi de tablodan bağımsız hesaplamayla aynı. Geçersiz saat dilimi UTC'ye düştü. İkinci gerçek öğrenci birincinin satırlarını 0 gördü, kendi 27 sorusunu gördü. anon: görünüm ve fonksiyon 42501. Güvenlik danışmanında yeni uyarı yok |
