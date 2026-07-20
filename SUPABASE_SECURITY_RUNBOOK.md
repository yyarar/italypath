# Supabase Security Runbook (Clerk + RLS)

Bu doküman teknik olmayan kullanım için hazırlanmıştır. Sırayla uygula.

## 1) Clerk tarafı (JWT template)

1. Clerk Dashboard'a gir.
2. `JWT Templates` bölümüne git.
3. Yeni template oluştur: adı `supabase`.
4. Payload içine şunları koy:

```json
{
  "role": "authenticated",
  "email": "{{user.primary_email_address.email_address}}"
}
```

Bu template, uygulamanın Supabase'e güvenli kimlik ile bağlanması için gerekli.

Not:
- `sub` claim'ini elle ekleme. Clerk bunu otomatik üretir (reserved claim).
- `aud` bazı ortamlarda reserved olabilir. Hata alırsan ekleme.

## 2) Supabase tarafı (Clerk provider)

1. Supabase Dashboard'a gir.
2. `Auth` -> `Third-Party Auth` -> `Clerk` entegrasyonunu aç.
3. Clerk domain/JWKS bilgilerini Supabase'in istediği alanlara gir.
4. Kaydet.

Not: Bu adım olmadan RLS politikaları "kim kullanıcı?" bilgisini doğru okuyamaz.

## 3) SQL güvenlik scriptini çalıştır

1. Supabase -> `SQL Editor` aç.
2. Bu dosyanın içeriğini çalıştır:
   - `/Users/keremyarar/italypath-main/supabase/rls_hardening.sql`
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

1. Clerk template adı gerçekten `supabase` mı?
2. Template içinde `sub` elle yazılmış mı? (yazılmamalı)
3. Supabase Third-Party Auth içinde Clerk aktif mi?
4. SQL script hata vermeden tamamlandı mı?
5. `documents` bucket kesinlikle `public = false` mı?

## Volunteer Mentor

1. Enable Clerk under Supabase Dashboard → Authentication → Third-Party Auth.
2. Confirm a normal Clerk session token has `role=authenticated` and that `sub` exactly matches the signed-in user's Clerk Dashboard user ID.
3. Run `supabase/volunteer_mentor.sql` in Supabase SQL Editor.
4. In Clerk Dashboard copy Kerem's exact user ID; in Supabase Table Editor insert one `mentor_staff` row with that ID, display name `Kerem`, and `active=true`.
5. For account/data deletion, delete the user's `mentor_conversations` rows; verify `mentor_messages` and private `mentor_rpc_idempotency` rows disappear through `on delete cascade`.
6. Never put the operator ID or a service-role key in client source.

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

select count(*) as active_operator_count
from public.mentor_staff
where active = true;
```
