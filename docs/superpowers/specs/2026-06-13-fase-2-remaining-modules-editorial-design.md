# ItalyPath iOS — Faz 2: Kalan 6 Modül Editorial Kalibrasyonu

> **Tarih:** 13 Haziran 2026
> **Kapsam:** Mentör, Profil, Burs, ISEE, Belgelerim, Topluluk — 6 mevcut modül editoryal dile kalibre
> **Bağlı spec:** [Faz 1 — Home + Okullar](2026-06-12-home-schools-editorial-redesign-design.md)
> **Bağlı plan:** [Faz 1 plan](../plans/2026-06-12-home-schools-editorial-redesign-plan.md)
> **Repo:** `/Users/keremyarar/remake/remake.xcodeproj`

---

## 1. Hedef

Faz 1'de tanımlanan AppTheme v3 — Editorial token sistemini kalan 6 ekrana uygulamak. Hiçbir modülün **işlevsel sözleşmesi** (deeplink, auth, fetch, RLS, modal akışı, sertleştirmeler) değiştirilmez — sadece **görsel dil** kalibre edilir.

**Başarı kriteri:**

- 6 modül editoryal pattern'a (eyebrow + serif italik vurgu + terra-cotta CTA + krem yüzeyler + 1pt iç-kontur) geçer
- Tab geçişlerinde "tema atlaması" hissi kaybolur
- `xcodebuild ... build` → 0 warning / 0 error
- Mevcut tüm sözleşmeler (her modülün bölümünde listelidir) bozulmaz

---

## 2. Ortak Editoryal Pattern (Faz 1'den kalıt)

Tüm modüller bu reçeteyi uygular:

- **Sayfa zemini:** `AppTheme.Colors.background` (krem)
- **Kart yüzeyi:** `AppTheme.Colors.surface` + 1pt iç-kontur `elevated`
- **Section header:** Circle eyebrow-dot (accent veya secondary) + `Text("EYEBROW").font(.eyebrow).kerning(1.2)` üstte, altında "normal ifade + _italik vurgu_" serif başlık
- **Birincil CTA:** terra-cotta `accent` arka plan + krem `background` metin, `RoundedRectangle(cornerRadius: 11)` veya `Capsule`, 44pt min tap
- **Aksent metin/link:** terra-cotta `accent`, 13pt Inter semibold + `arrow.right` ikon
- **Chip seçili state:** `accentSoft` arka + `accent` metin
- **Chip inaktif state:** `elevated` arka + `headline` metin
- **Buton basma:** `EditorialTapStyle` (ContentView.swift'te tanımlı — yeniden kullanılır)
- **Eyebrow noktası rengi:** birincil eylem → accent, ikincil/nötr → secondary (oliv)

---

## 3. Modül 1: MentorView

**Mevcut sözleşme korunur:**

- `GeminiMentorChatService` streaming akışı (history 20 mesaj limiti)
- API key çözüm sırası: Info.plist → ENV → Secrets.swift
- TextField `axis: .vertical` + `lineLimit(1...5)` ergonomisi
- `@FocusState` klavye dismiss (UIApplication.sendAction yok)
- Reset 44pt tap target
- Erişilebilirlik etiketleri (send "Mesajı gönder", stop "Yanıtı durdur", reset "Sohbeti sıfırla", status dot combine, avatar accessibilityHidden)

**Görsel kalibrasyon:**

- Header: pageTitle "Mentör" serif bold + eyebrow "GEMINI · AI" + serif altyazı "Türkçe sor, _yanıt al_"
- Status dot: online `success` (oliv), streaming `accent` (terra-cotta), idle `secondaryText` muted gri
- Mesaj baloncukları:
  - Kullanıcı: `accent` (terra-cotta) arka + `background` (krem) metin, `RoundedRectangle(cornerRadius: 16, style: .continuous)`, sağ alta yakın corner sıkı (`UnevenRoundedRectangle` ile sağ alt 6, diğer 16)
  - Asistan: `surface` arka + `primaryText` metin, sol alta yakın corner sıkı; üst sol eyebrow "MENTÖR" mini (10pt, kerning 1) opsiyonel
- Input alanı: krem zemin + `surface` field arka + 1pt iç-kontur `elevated`. Placeholder italik New York "_Bir şey sor..._" `secondaryText` rengi. Send butonu: terra-cotta circle, içinde `arrow.up` SF Symbol
- Reset butonu: ikon `arrow.counterclockwise`, `elevated` arka pill, `headline` metin
- Stop butonu (streaming aktif): `error` arka pill + krem metin

## 4. Modül 2: ProfileView

**Mevcut sözleşme korunur:**

- Clerk tek auth kaynağı; `CLERK_SECRET_KEY` iOS bundle/config/source'a girmez
- 3 state: (a) Clerk yapılandırılmamış (config eksik), (b) signed-out CTA + Clerk `AuthView` sheet, (c) signed-in `UserButton` hesap yönetimi + çıkış
- Associated Domains entitlement değişmez (`webcredentials:nearby-gazelle-66.clerk.accounts.dev`)
- Favori sayısı önce `FavoriteLocalStore` snapshot'ından gösterilir, sonra `FavoriteRepository.countFavorites(userID:)` ile günceller
- `SupabaseConfig.client` Clerk JWT template provider'ı korunur
- Clerk AuthView "Continue to <Application name>" Dashboard'tan ayarlanır (iOS override etmez)

**Görsel kalibrasyon:**

- Signed-out state:
  - Hero: editoryal cover — eyebrow "ITALYPATH HESABI" + Cormorant 28pt "Yolculuğun _seninle_ başlasın" + caption "Favori okullarını kaydet, belgelerini yönet" + terra-cotta CTA "Giriş yap"
  - Alt section: "Hesabın olmadan da kullanabilirsin" + 3 satır feature row (kalp icon + "Okul ara", document icon + "ISEE hesapla", map icon + "Burs haritası")
- Yapılandırma eksik state:
  - editoryal warning hero — eyebrow "YAPILANDIRMA EKSİK" + serif "Auth henüz _hazır_ değil" + caption "Yapılandırma anahtarları eksik; geliştiriciye bildir"
- Signed-in state:
  - Üst hero card: avatar 56x56 circle + serif "Merhaba, _Kerem_" + caption "kerem@gmail.com" + altta "12 favori okul · 3 belge" eyebrow row
  - Account section: `UserButton` mevcut Clerk widget'ı (krem zemin üstünde, surface ile çevreli kart içinde)
  - Action rows: "Hesap detayları" / "Çıkış yap" tap satırları — surface kart + 1pt kontur + chevron.right

## 5. Modül 3: ScholarshipsView (Burs Haritası)

**Mevcut sözleşme korunur (kritik):**

- Deeplink `remake://scholarships?region=<slug>` — 20 geçerli slug aynen kalır
- Supabase `scholarship_regions` fetch + bundled `ScholarshipRegionsData.json` fallback akışı
- GeoJSON parse + 20 bölge shape rendering
- TR/EN dil toggle
- VoiceOver labels + reduced motion
- `consumePendingRegionIfNeeded` + `handleDeeplink` akışı
- Tab içi Burs ekranında sol üst back/dismiss yok (header sadece dil toggle)
- Bölge tap → detay paneli

**Görsel kalibrasyon:**

- Header: pageTitle "Burs Haritası" serif + sağda dil toggle (`TR/EN` pill, seçili accent, diğer elevated)
- Eyebrow + altyazı: "BÖLGE BAZLI" + serif "_İtalya'nın_ 20 bölgesi"
- Harita zemini: krem zemine kalibre. Bölge dolgusu: inaktif `elevated`/`surface` arası açık ton, hover/seçili `accentSoft`, vurgu `accent`. Bölge sınır rengi: `secondaryText` muted gri 0.5pt
- Bölge detay paneli (alttan açılır):
  - Eyebrow: "TOSCANA" + Circle accent-dot
  - serif başlık "Toscana · _ARDSU_" tarzı kurum vurgusu
  - 3-4 satır editoryal info row (ISEE/ISPE limit, başvuru dönemi, yetkili kurum) — her satır eyebrow caption + 14pt bodyLg
  - Resmi link: kompakt "Aç →" accent pill (Faz 1 UDV "Web" pattern'ı)
- Yükleme/hata state'leri: krem zemin + serif italik mesaj + accent retry CTA
- Region picker (`ScholarshipRegionPicker`): sheet ile alttan açılır, krem zemin + chip pattern

## 6. Modül 4: ISEECalculatorView

**Mevcut sözleşme korunur:**

- `ISEEEngine` formül tabanlı hesaplama
- Header geri butonu `dismiss()` aktif
- Euro tutarı alanları slider + klavye girişi tek `Double` state'e bağlı
- `ISEEAmountInputFormatter` parse/format/clamp davranışı
- Hero card ilk açılışta `hasCalculated == false` iken `€ —` placeholder
- `contentTransition(.numericText())` sayı geçişi
- "YENİDEN HESAPLA" + "PDF Paylaş" iki aksiyon
- `ISEEReportInput` + `ISEEReportPDFRenderer` + `UIActivityViewController` sheet
- Dosya adı `ItalyPath-ISEE-Raporu-yyyyMMdd-HHmm.pdf` formatı
- Slider/Toggle accessibility (`.accessibilityLabel + .accessibilityValue`)
- CTA + Slider + Toggle tint `accent`

**Görsel kalibrasyon:**

- Header: pageTitle "ISEE Hesapla" serif + dismiss chevron-left 44pt
- Hero card (sonuç): krem üstü `surface` kart + 1pt kontur
  - Eyebrow "TAHMİNİ ISEE" + Circle accent-dot
  - Büyük rakam: `Font.system(size: 42, weight: .bold, design: .serif)` headline rengi, sayı geçişi mevcut
  - Altta "Henüz hesaplanmadı" italik secondaryText (placeholder iken)
- Input grupları (Aile / Gelir / Mülk vs):
  - Section header pattern: eyebrow "AİLE" + serif italik vurgulu "Hane _halkı_"
  - Slider row: 14pt başlık + sağda accent rakam + slider altta (tint accent)
  - Toggle row: 14pt başlık + sağda Toggle (tint accent), altta caption muted
- Hesap sonrası sticky bottom: HStack — "YENİDEN HESAPLA" elevated pill + "PDF Paylaş" terra-cotta CTA (kompakt arrow.up.doc.fill simgesi)
- Sticky bottom backing: `.ultraThinMaterial` + 0.5pt üst-kontur `elevated`

## 7. Modül 5: DocumentsView (Belgelerim)

**Mevcut sözleşme korunur (kritik):**

- Supabase tablo `public.user_documents` + Storage bucket private `documents`
- Limit 20 MB, MIME: pdf/jpeg/png/webp/heic/heif
- Path: `<Clerk user id>/<timestamp>-<shortUUID>.<ext>`
- `file_url` ve `storage_path` aynı relatif Storage path değerini tutar
- Files (PDF) + Photos (image data) upload kaynakları
- Açma: private bucket → temp cache → QuickLook in-app preview
- Paylaşma: temp cache dosyası → `UIActivityViewController`
- Delete: önce metadata row, sonra Storage objesi (best-effort)
- User switch/sign-out: aktif görevler iptal + liste/temp temizleme
- Signed-out: temalı mesaj + "Profil'e Git" accent CTA — `dismiss()` + `routeManager.selectedTab = .profile` (auth burada açılmaz; tek nokta Profil)
- `DocumentsView` `@EnvironmentObject AppRouteManager` ister

**Görsel kalibrasyon:**

- Header: pageTitle "Belgelerim" serif + sağda upload button (terra-cotta circle + plus icon)
- Signed-out: editoryal cover — eyebrow "GİRİŞ GEREKLİ" + serif "Belgelerin _güvende_ olsun" + caption + terra-cotta CTA "Profil'e Git"
- Empty (signed-in, belge yok): editoryal cover — eyebrow "BOŞ KASA" + serif "İlk _belgeni_ ekle" + alt eyebrow row "PDF / Foto / Pasaport / Diploma" + terra-cotta CTA "Belge ekle"
- Belge listesi:
  - Section header eyebrow `N BELGE` + serif "_Tüm_ belgelerin"
  - Liste kartı: sol 44x44 dosya türü rozet (PDF → kırmızı tinted, JPG → yeşil tinted; krem zemin üzerinde solgun) + sağda ad (2 satır lineLimit) + caption (boyut + tarih) + sağ trash menu (context menu)
  - Kart pattern: surface arka + 1pt kontur (Faz 1 EditorialListCard ile aynı)
- Upload action sheet: krem alt sheet — "Dosya seç" / "Fotoğraf seç" / "Vazgeç" satırları
- QuickLook + share sheet: native (dokunulmaz)

## 8. Modül 6: CommunityView (Topluluk)

**Mevcut sözleşme korunur:**

- Static koleksiyon (CommunityViewModel native data)
- Dış link openURL native
- Header sağ üst arama ikonu → TextField focus
- Platform + kategori pill filtreleri
- Arama metni ad/açıklama/hedef kitle/şehir/bölge alanlarında
- Section header reset butonu ikonlu "Sıfırla" (eski "Tümü" yazısı kaldırıldı, kategori chip'lerindeki "Tümü" pill'iyle çakışma önlendi)
- Keşfet bölümü 5 kart sınırı kalktı, dikey tekil gösterim

**Görsel kalibrasyon:**

- Header: pageTitle "Topluluk" serif + sağda search ikon (44pt surface circle)
- Eyebrow altyazı: "TÜRK ÖĞRENCİ" + serif "İtalya'da _bir_ aradayız"
- Search field açıldığında: krem zemin alttan slide ile yerleşir, italik placeholder "_grup ara_"
- Platform pill row: WhatsApp / Telegram / Discord / Instagram — pill seçili accent, inaktif elevated
- Kategori chip row: "Tümü / Üniversite / Şehir / İlgi" — accent state Faz 1 pattern'ı
- Grup kartı:
  - Eyebrow "ROMA · WHATSAPP" + serif başlık "Sapienza _Türk Öğrenciler_"
  - Caption (üye sayısı + son aktivite eyebrow)
  - Sağda dış-link arrow.up.right.square accent
- Section header reset butonu: ikon + "Sıfırla" eyebrow

---

## 9. Modül Bağımsız Build Doğrulama

Her modül tamamlandığında:

```bash
cd /Users/keremyarar/remake && xcodebuild -project remake.xcodeproj -scheme remake \
  -destination 'platform=iOS Simulator,id=14CD2DBB-1FD1-40BE-BF04-A05D013DC40E' build 2>&1 \
  | grep -E "(BUILD SUCCEEDED|BUILD FAILED|error: )"
```

Hedef: **0 error**.

Modül sonu manuel smoke (her birinde):

- Mentör: bir mesaj yaz → streaming çalışır, stop/reset çalışır
- Profil: signed-out hero → Clerk AuthView sheet açılır → giriş simülasyonu (sandbox); sign-in sonrası UserButton + favori sayısı görünür
- Burs: deeplink `xcrun simctl openurl booted "remake://scholarships?region=toscana"` → Toscana seçili açılır; dil toggle TR/EN değişir
- ISEE: bir kayıt hesapla → hero rakamı geçişle güncellenir → "PDF Paylaş" sheet açılır
- Belgelerim: signed-out CTA → Profil'e yönlenir; sign-in sonrası "Belge ekle" → file picker açılır
- Topluluk: search ikonu → field focus + filtreleme çalışır; reset → tüm filtreler temizlenir

---

## 10. Faz 3 İçin Açık Bırakılanlar

- Cormorant Garamond gerçek font bundling (system serif yerine)
- Push notification (burs son tarihleri)
- Çoklu dil (TR/IT/EN)
- Üniversite foto kalitesi Faz 2'de iyileştirildi (Unsplash size hint + URLCache 50/200 MB); Faz 3'te Wikipedia thumbnail fallback enrichment + Unsplash explicit attribution UI değerlendirilir

---

## 11. Uygulama Sıralaması (Plan'da Detaylanır)

Kullanım sıklığı sırasıyla:

1. **Mentör** — chat günlük kullanım
2. **Profil** — auth giriş noktası
3. **Burs** — deeplink hedefi, sözleşme katı
4. **ISEE** — hesap modal (Home'dan açılır)
5. **Belgelerim** — kayıt modal (Home'dan açılır)
6. **Topluluk** — keşif modal (Home'dan açılır)

Implementasyon her modül için ayrı task. Modül başına: kalibre et → build → smoke → commit.
