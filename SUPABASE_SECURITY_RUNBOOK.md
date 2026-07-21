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
   - `documents` bucket'ını private yapar.
   - Storage policy'leri ile sadece kendi klasörüne (`{userId}/...`) erişim verir.

Eğer şu hatayı alırsan:
- `ERROR: must be owner of table objects`

Şu yolu izle:
1. Scriptin `public` tablolarını (`favorites`, `user_documents`) çalıştır.
2. `storage.objects` policy'lerini `Storage -> Policies` ekranından UI ile yönet.
3. `documents` bucket için `public = false` ayarını UI'dan doğrula.

## 4) Uygulama davranışı (bu repoda hazırlandı)

Kod tarafında şu güvenlik iyileştirmeleri zaten uygulandı:

1. Supabase istekleri Clerk token ile gönderiliyor.
2. Documents için `publicUrl` yerine kısa ömürlü `signed URL` kullanılıyor.
3. Upload edilen dokümanlarda `storage_path` bazlı erişim yapılıyor.

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
