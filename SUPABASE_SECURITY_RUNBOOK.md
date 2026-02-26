# Supabase Security Runbook (Clerk + RLS)

Bu doküman teknik olmayan kullanım için hazırlanmıştır. Sırayla uygula.

## 1) Clerk tarafı (JWT template)

1. Clerk Dashboard'a gir.
2. `JWT Templates` bölümüne git.
3. Yeni template oluştur: adı `supabase`.
4. Payload içine şunları koy:

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}"
}
```

Bu template, uygulamanın Supabase'e güvenli kimlik ile bağlanması için gerekli.

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
2. Supabase Third-Party Auth içinde Clerk aktif mi?
3. SQL script hata vermeden tamamlandı mı?
4. `documents` bucket kesinlikle `public = false` mı?
