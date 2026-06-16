# Tasarım: Auth UX Yenileme (Clerk Elements)

Tarih: 2026-06-16
Durum: Onaylandı (Kerem) — uygulama planına geçilecek
Dal: `feat/auth-redesign` (planlanan)

## Amaç

Mevcut `/sign-in` ve `/sign-up` sayfaları Clerk'in hazır `<SignIn />` /
`<SignUp />` bileşenlerini `bg-slate-50` üzerinde gösteriyor. ItalyPath
editorial kimliğine (paper/sage/terracotta + serif başlıklar) hiç bağlı değil
ve Türkçeleştirme yok. Ek olarak iki farklı giriş noktası var:

- Navbar'daki "Giriş Yap" butonu modal açıyor.
- Korumalı sayfalardan (AI mentor, hub, favoriler, belge cüzdanı) yapılan
  yönlendirmeler tam sayfaya gidiyor.

Bu belge, auth deneyimini tam sayfa, editorial bir kart üzerine taşıyan ve
giriş/kayıt'ı tek sayfada birleştiren yeniden tasarımı tanımlar. Clerk
**altyapısı korunur**; sadece UI değişir.

## Kapsam kararları

- **Entegrasyon seviyesi:** Clerk Elements (Seviye 2). Headless yapı taşları
  ile kendi UI'mızı kuruyoruz; OAuth, e-posta doğrulama, şifre kuralları,
  şifre sıfırlama, oturum yönetimi Clerk'te kalmaya devam ediyor.
- **Giriş yöntemleri:** Google, Apple, e-posta + şifre, "Şifremi unuttum".
  Google ve Apple zaten Clerk dashboard'unda açık. Magic link, SMS, başka SSO
  yok.
- **Yerleşim:** Tam sayfa, ortalanmış kart. Modal yaklaşımı kaldırılır.
- **Tek sayfa + sekme toggle:** Giriş ve kayıt aynı sayfada, üstte "Giriş
  Yap" / "Kayıt Ol" sekmesiyle geçiş.
- **OAuth ile gelen kullanıcıya soru sorulmaz:** Ad/soyad/e-posta zaten
  OAuth'tan geldiği için kayıt formu gösterilmez, direkt yönlendirme.
- **Klasik kayıt formu:** Ad + Soyad + E-posta + Şifre.
- **Kayıt sonrası onboarding yok:** Doğrulama tamamlanır tamamlanmaz `/hub`.
- **URL slug:** Türkçe — `/giris`. Eski `/sign-in` ve `/sign-up` 308 ile
  yönlendirilir.
- **Dil:** Türkçe (LanguageContext varsayılanı). İngilizce ileride
  `lib/translations.ts` üzerinden eklenebilir; mimari engel değil.

## URL ve yönlendirme yapısı

- `/giris` → tek sayfa. Varsayılan sekme: "Giriş Yap".
- `/giris?mode=kayit` → "Kayıt Ol" sekmesinde açılır.
- `/giris?redirect_url=/X` → giriş/kayıt başarılı olunca `/X`'e yönlenir.
  Parametre yoksa `/hub`'a.
- `proxy.ts` public route deseni güncellenir:
  - `/giris(.*)` public.
  - `/sign-in(.*)` ve `/sign-up(.*)` public kalır ama uygulama içinde 308
    ile yönlendirilir.
- 308 yönlendirmeleri **`next.config.ts`'in `redirects()` fonksiyonu ile**
  uygulanır (statik, declarative, `proxy.ts`'in route koruma mantığından
  ayrı tutulur; `proxy.ts`'i değiştirmez):
  - `/sign-in` → `/giris` (`permanent: true`, sorgu parametresi korunur)
  - `/sign-up` → `/giris?mode=kayit` (`permanent: true`, sorgu parametresi
    korunur)
- `app/robots.ts`: `/giris` disallow listesine eklenir; `/sign-in` ve
  `/sign-up` listede kalmaya devam eder.

## Sayfa anatomisi

Ortalanmış kart, editorial dil, mobil-friendly. Şu yapı:

```
┌─────────────────────────────────────┐
│            ItalyPath ↗               │   wordmark → ana sayfa
│                                      │
│         ┌──────────────────┐         │
│         │ Giriş Yap │ Kayıt│         │   sekme toggle
│         ├──────────────────┤         │
│         │                  │         │
│         │ [G] Google ile.. │         │   OAuth — her sekmede
│         │ [A] Apple ile..  │         │
│         │ ─── veya ───     │         │
│         │                  │         │
│         │ <forma göre>     │         │
│         │                  │         │
│         │ [   CTA          │         │   terracotta
│         └──────────────────┘         │
│                                      │
│   Devam ederek Kullanım Koşulları ve │
│   Gizlilik Politikası'nı kabul edersin │
└─────────────────────────────────────┘
```

- **Kart:** maks 420px genişlik, paper-cream zemin, 1px ince sage border,
  yumuşak köşe (Tailwind: `rounded-lg`).
- **Wordmark:** üstte, sayfa ortasında, tıklanır (`/`'e döner).
- **Alt metin:** kart altında küçük metin, yasal linkler:
  - `/yasal/kullanim-kosullari`
  - `/yasal/gizlilik`
- **Mobil davranış:**
  - Kart genişliği `100vw - 32px` (her iki yanda 16px boşluk).
  - Sayfa `min-h-dvh flex items-center justify-center` — klavye açılınca
    `vh` ile bozulan layout'u önler.
  - Tüm dokunmatik hedefler ≥ 44px.

## Form akışları

### OAuth (Google + Apple)

- Her iki sekmede de görünür, üst kısımda iki buton.
- Tek tıkla Google/Apple'a yönlenir.
- Geri dönüşte:
  - Hesap yoksa Clerk otomatik oluşturur (ad/soyad/e-posta OAuth'tan).
  - Hesap varsa giriş yapılır.
- Sonuçta `?redirect_url` varsa oraya, yoksa `/hub`'a.

### Giriş Yap (e-posta + şifre)

- Alanlar: E-posta, Şifre.
- Altta küçük "Şifremi unuttum" linki.
- CTA: "Giriş Yap" (terracotta).
- Hata mesajı: alan altında, küçük metin (form üstü genel hata bandı yok).
  Yanlış kimlik bilgisi için tek mesaj: "E-posta veya şifre hatalı."

### Kayıt Ol (e-posta + şifre)

- Alanlar: Ad, Soyad, E-posta, Şifre (yan yana iki kolon değil, tek kolon).
- Şifre kuralları: Clerk varsayılan (min 8 karakter, yaygın şifre listesi
  reddedilir). Hata Clerk'ten gelir, Türkçe karşılığa eşlenir.
- "Bu e-posta zaten kayıtlı" durumu: alan altında mesaj + tek tık "Giriş
  sekmesine geç" butonu. Kullanıcının manuel sekme değiştirmesi gerekmez.
- CTA: "Kayıt Ol" (terracotta).
- Başarılı kayıt sonrası kart içeriği e-posta doğrulama adımına geçer
  (aynı sayfa, içerik değişir).

### E-posta doğrulama (kayıt sonrası)

- Kart başlığı: "E-postana 6 haneli kod gönderdik"
- Alt başlık: yazılan e-posta (örn. `ayse@example.com`)
- 6 haneli kod inputu: tek tek 6 kutu, otomatik odak ilerlemesi, geri tuşuyla
  geri silme, kopyala-yapıştır desteği.
- "Tekrar gönder" linki: 60 saniyelik geri sayım kilidi.
- Doğrulama başarılı → otomatik giriş + `/hub` (veya `?redirect_url`).

### Şifremi unuttum

- "Giriş Yap" sekmesinde küçük link → kart içeriği değişir.
- Adım 1: E-posta gir → "Kod gönder" → Clerk e-postaya kod yollar.
- Adım 2: 6 haneli kod + yeni şifre + yeni şifre tekrar → "Şifreyi sıfırla".
- Başarılı → otomatik giriş + `/hub` (veya `?redirect_url`).
- "Giriş sayfasına dön" linki her adımda görünür.

## Hata, yükleme, edge case

- **Yükleme:** CTA butonunda spinner + metin değişimi ("Giriş yapılıyor...",
  "Kayıt oluşturuluyor...", "Kod gönderiliyor..."). Form alanları kilitlenir.
- **Alan hatası:** İlgili alanın altında küçük metin, semantik renk
  (terracotta).
- **Form-üstü genel hata bandı yok** — gürültüyü azaltır, alan-spesifik
  mesajlar daha aksiyon odaklı.
- **Hesap zaten var (kayıt):** "Bu e-posta zaten kayıtlı." mesajı + "Giriş
  sekmesine geç" eylem butonu.
- **Bağlantı sorunu:** Kart üstünde toast: "Bağlantı sorunu, tekrar dene."
- **OAuth iptali:** Google/Apple ekranından geri gelirse sessiz dönüş, hata
  toast'u yok (kullanıcı bilerek vazgeçti).
- **OAuth hata:** Toast: "Google ile giriş başarısız oldu. Tekrar dene veya
  başka bir yöntemle giriş yap."
- **Doğrulama kodu yanlış:** Kod kutularının altında: "Kod hatalı veya süresi
  doldu."
- **Doğrulama kodu süre aşımı:** "Kodun süresi doldu, yeni kod isteyebilirsin."

## Yönlendirme davranışı (Clerk afterSignInUrl / afterSignUpUrl)

- Hem giriş hem kayıt için aynı varsayılan: `/hub`.
- `?redirect_url=/X` varsa o değer öncelik kazanır.
- E-posta doğrulamadan sonra otomatik giriş yapılır, aynı yönlendirme
  uygulanır.

## Localization

- Tüm metinler `lib/translations.ts` içine TR + EN paralel eklenir.
- Yeni anahtar grupları (öneri):
  - `auth.tabs.signIn`, `auth.tabs.signUp`
  - `auth.oauth.google`, `auth.oauth.apple`, `auth.oauth.divider`
  - `auth.fields.firstName`, `auth.fields.lastName`, `auth.fields.email`,
    `auth.fields.password`
  - `auth.actions.signIn`, `auth.actions.signUp`, `auth.actions.forgotPassword`
  - `auth.verification.title`, `auth.verification.resend`,
    `auth.verification.resendIn`
  - `auth.passwordReset.step1Title`, `auth.passwordReset.step2Title`
  - `auth.errors.invalidCredentials`, `auth.errors.emailExists`,
    `auth.errors.network`, `auth.errors.oauthFailed`,
    `auth.errors.invalidCode`, `auth.errors.codeExpired`
  - `auth.legal.consent` (yasal linkleri içeren cümle)
- Clerk Elements headless olduğu için otomatik çeviri katmanı kullanılmaz;
  metin kontrolü tamamen bizde.

## Bileşen mimarisi

```
app/
└── giris/
    └── page.tsx              # tek sayfa; sekme state'i + Clerk Elements kökü

components/auth/
├── AuthShell.tsx             # wordmark + ortalanmış kart konteyner + yasal alt metin
├── AuthCard.tsx              # paper kart (border, padding, mobil dvh)
├── AuthTabs.tsx              # "Giriş Yap" / "Kayıt Ol" sekme toggle
├── OAuthButtons.tsx          # Google + Apple butonları + "veya" ayırıcı
├── SignInForm.tsx            # e-posta + şifre + "Şifremi unuttum" link
├── SignUpForm.tsx            # ad + soyad + e-posta + şifre
├── VerificationStep.tsx      # 6 haneli kod + tekrar gönder sayacı
└── PasswordResetFlow.tsx     # 2 adımlı sıfırlama akışı
```

**Silinecek dosyalar:**
- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`
- (Dizin tamamen kaldırılır; route'lar `proxy.ts` üzerinden yönlendirilir.)

**Güncellenecek dosyalar:**
- `proxy.ts`: sadece public route deseni güncellenir.
  - `/giris(.*)` public listeye eklenir.
  - `/sign-in(.*)` ve `/sign-up(.*)` public listede kalmaya devam eder
    (yönlendirilen URL'lerin de public olması gerekiyor).
- `next.config.ts`: `redirects()` fonksiyonu eklenir.
  - `/sign-in` → `/giris` (permanent)
  - `/sign-up` → `/giris?mode=kayit` (permanent)
  - Sorgu parametreleri korunur.
- `components/Navbar.tsx`:
  - `SignInButton mode="modal"` blokları kaldırılır.
  - "Giriş Yap" → `<Link href="/giris">`
  - "Kayıt Ol" → `<Link href="/giris?mode=kayit">`
- `components/BottomNav.tsx`: `/sign-in?redirect_url=...` linkleri
  `/giris?redirect_url=...` olarak güncellenir.
- `components/FeaturesSection.tsx`: aynı şekilde güncelleme.
- `app/universities/[id]/page.tsx` ve
  `app/universities/[id]/departments/[deptSlug]/page.tsx`: AI mentor
  yönlendirmesindeki `/sign-in?redirect_url=...` → `/giris?redirect_url=...`
- `app/hub/page.tsx`: anonim ziyaretçi durumundaki yönlendirme.
- `app/robots.ts`: disallow listesine `/giris` eklenir.

## Erişilebilirlik

- Tüm form etiketleri görünür (sr-only kullanılmaz).
- Klavye odak halkası belirgin (sage tonunda).
- Sekme toggle:
  - Klavye ok tuşlarıyla geçiş (`role="tablist"`, `role="tab"`,
    `aria-selected`).
  - Sekme içeriği `role="tabpanel"` ile bağlanır.
- Tüm şifre alanlarında (giriş, kayıt, şifre sıfırlamada yeni şifre)
  "Göster/Gizle" toggle (göz ikonu, `aria-pressed`).
- Hata mesajları `aria-live="polite"` ile ekran okuyucuya iletilir.
- 6 haneli kod inputu: ekran okuyucuya tek input gibi sunulur
  (görsel olarak 6 kutu, semantik olarak grup).

## Test stratejisi

### Otomatik smoke testleri

- `npm run check:routes` mevcut matrise eklenir:
  - `/giris` → 200 (public)
  - `/sign-in` → 308 → `/giris`
  - `/sign-up` → 308 → `/giris?mode=kayit`
  - `/sign-in?redirect_url=/ai-mentor` → 308 → `/giris?redirect_url=/ai-mentor`
- Yeni script: `scripts/check-auth-ui.mjs`
  - `/giris` sayfası 200 dönüyor.
  - "Giriş Yap" ve "Kayıt Ol" sekme metinleri sayfada.
  - Google ve Apple buton metinleri sayfada.
  - E-posta ve şifre alan etiketleri var.
  - `?mode=kayit` ile gelindiğinde "Kayıt Ol" sekmesi aktif.

### Manuel test akışı

- Google ile giriş (yeni hesap + var olan hesap).
- Apple ile giriş.
- E-posta + şifre kayıt → 6 haneli kod doğrulama → `/hub`.
- E-posta + şifre giriş.
- "Şifremi unuttum" → kod → yeni şifre → `/hub`.
- Yanlış şifre, var olan e-posta ile kayıt, yanlış kod, süresi dolmuş kod.
- Korumalı sayfadan (AI mentor) yönlendirme → giriş sonrası geri dönüş.
- Navbar "Giriş Yap" ve "Kayıt Ol" tıklamaları.
- Mobil viewport (iOS Safari, Android Chrome) — klavye açıkken layout
  bozulması yok.

## Kapsam dışı (sonraki sprintler)

- `/universities` → `/universiteler` Türkçeleştirmesi (geniş bir refactor;
  ayrı bir iş).
- 2FA/MFA özel UI. Clerk dashboard'undan açılırsa Elements otomatik destekler
  ancak bu spec'te özelleştirilmiş başlık/akış yok.
- Hesap silme akışı (Clerk UserProfile altında zaten var; `/hub`
  entegrasyonu ayrı iş).
- Microsoft / Facebook / GitHub SSO eklenmesi.
- E-posta değiştirme akışı için özel UI.
- Onboarding soruları (lisans/yüksek lisans, şehir tercihi vb.).

## Riskler ve notlar

- **Clerk Elements henüz görece yeni** — sürüm güncellemelerinde breaking
  change ihtimali mevcut. Lock dosyasında sürüm sabit.
- **Eski URL'lere doğrudan link veren paylaşımlar (Instagram bio, eski
  mailler) bozulmaz** çünkü 308 yönlendirme kalıcı. Tarayıcı cache'ler.
- **Modal'ı kaldırmak**, ana sayfadaki "Giriş Yap" tıklamasında sayfa
  geçişi yaratır. Bu kabul edilebilir bir trade-off; tam sayfa editorial
  deneyim modal'ın "sayfada kalma" avantajından önemli görüldü.
- **AI mentor sistemi promptu büyük** olduğu için giriş sonrası `/hub`'a
  yönlendirme, `/ai-mentor`'a doğrudan değil — ilk açılışta gereksiz
  Gemini context yüklemesi olmaz.
- **`remake` (paralel mobil app)** ayrı bir proje; bu spec sadece web içindir.
  Mobil app'in kendi auth UI'sı orada tasarlanacak.
