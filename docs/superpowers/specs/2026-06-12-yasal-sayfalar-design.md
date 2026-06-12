# Tasarım: Yasal Sayfalar (Gizlilik, Kullanım Koşulları, Çerez)

Tarih: 2026-06-12
Durum: Onaylandı (Kerem) — uygulama planına geçilecek
Dal: `feat/legal-pages`

## Amaç

ItalyPath üyelik alıyor, e-posta topluyor, belge yükletiyor ve AI mentor'da
kullanıcı mesajlarını üçüncü tarafa (Google Gemini) gönderiyor. Bu yüzden
yayına çıkmadan önce KVKK'ya uygun yasal sayfalar gerekiyor. Şu an sitede
hiç yasal sayfa yok.

Bu belge, hazırlanacak üç yasal sayfanın içeriğini ve teknik kurgusunu tanımlar.

## Kapsam kararları

- **Yaklaşım: A** — Üç ayrı belge; KVKK aydınlatması Gizlilik içinde birleşik.
- **Veri sorumlusu:** Kerem Yarar (şahıs, şirket yok).
- **İletişim e-postası:** Henüz yok → metinlerde `[iletişim e-postası eklenecek]`
  yer tutucusu kullanılacak. Lansman öncesi doldurulacak.
- **Dil:** Önce yalnızca Türkçe. İngilizce ileride eklenebilir; mimari buna
  engel olmayacak şekilde kurulacak.
- **Yürürlük tarihi:** 12 Haziran 2026.
- **Yeni veritabanı yok.** Sayfalar statik metin.

## Belgeler ve içerik taslağı

### 1. Gizlilik Politikası ve Aydınlatma Metni — `/yasal/gizlilik`

- Veri sorumlusunun kimliği (Kerem Yarar) ve başvuru kanalı (e-posta yer tutucusu)
- Toplanan veriler:
  - Üyelik (Clerk): e-posta, ad
  - Favoriler ve yüklenen belgeler (Supabase)
  - AI mentor'a yazılan mesajlar
  - Tarayıcı tercihleri (localStorage: dil, görünüm, favoriler, aşama)
- İşleme amaçları (hesap, favoriler, belge saklama, AI danışmanlık, tercih hatırlama)
- Aktarım yapılan taraflar: hizmet sağlayıcılar (kimlik doğrulama, saklama, AI)
  ve bunların yurt dışı sunucu kullandığına dair uyarı
- Saklama süresi
- KVKK md.11 hakları (öğrenme, düzeltme, silme, itiraz vb.)
- Başvuru yöntemi
- Veri güvenliği
- Değişiklikler ve yürürlük tarihi

### 2. Kullanım Koşulları — `/yasal/kullanim-kosullari`

- Hizmetin tanımı (bilgi/rehber platformu)
- **Sorumluluk reddi:** üniversite/burs/kabul bilgileri resmi kaynaktan teyit
  edilmeli, bağlayıcı değildir
- **AI mentor uyarısı:** yapay zeka çıktısı hatalı olabilir, resmi danışmanlık
  yerine geçmez
- Kullanıcı yükümlülükleri
- Fikri mülkiyet (içerik ItalyPath'e ait)
- Yüklenen içerikten kullanıcının sorumlu olması
- Sorumluluğun sınırlandırılması
- Değişiklikler, yürürlük, uygulanacak hukuk (Türkiye)

### 3. Çerez Politikası — `/yasal/cerez-politikasi`

- Çerez ve tarayıcı hafızası nedir
- Kullanılanlar: oturum çerezleri (giriş için zorunlu) + tercih hafızası
  (localStorage). Şu an reklam/analitik çerezi **yok** — dürüstçe belirtilecek
- Kullanım amaçları
- Nasıl yönetilir (tarayıcı ayarları)
- Değişiklikler

## Teknik kurgu

- **İçerik kaynağı:** Yasal belge metinleri yapılandırılmış bir içerik modülünde
  tutulur (`lib/legal/documents.ts` gibi). Her belge: slug, başlık, son güncelleme
  tarihi, giriş, ve `{ heading, paragraphs[] }` bölümler dizisi. Böylece İngilizce
  ileride aynı yapıya eklenir.
- **Sunum:** Ortak bir sunum bileşeni (`components/legal/LegalDocument.tsx`)
  editöryal stille (serif başlık, kağıt zemin, okunur prose) belgeyi basar.
- **Yönlendirme:** `app/yasal/[slug]/` dinamik route.
  - `layout.tsx` (Server Component): `generateMetadata()` ile SEO başlığı,
    `generateStaticParams()` ile üç slug.
  - `page.tsx`: ilgili belgeyi içerik modülünden alıp `LegalDocument` ile render eder.
  - Sayfalar interaktif değil → Server Component, `"use client"` yok.
- **Footer:** `components/Footer.tsx` içine "Yasal" başlığı altında üç link eklenir.
- **Erişim:** `proxy.ts` public route listesine `/yasal(.*)` eklenir
  (ziyaretçi giriş yapmadan okuyabilsin).
- **SEO/sitemap:** Üç yasal yol `app/sitemap.ts` içine eklenebilir (opsiyonel,
  düşük öncelik).

## Kapsam dışı (YAGNI)

- İngilizce metinler (sonra)
- Çerez onay banner'ı (şu an analitik/pazarlama çerezi olmadığı için gerekmez)
- KVKK aydınlatma metnini ayrı belge yapmak (B yaklaşımı reddedildi)
- Yeni veritabanı tablosu

## Lansman öncesi yapılacaklar (kod dışı)

- Gerçek iletişim e-postası açılıp yer tutucunun doldurulması
- İdeal: metinlerin bir hukukçuya gösterilmesi
