# Faz 2 — Kalan 6 Modül Editorial Kalibrasyonu Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mentör → Profil → Burs → ISEE → Belgelerim → Topluluk ekranlarını AppTheme v3 — Editorial token sistemine kalibre etmek; her modülün işlevsel sözleşmesini bozmadan görsel dili Faz 1 ile birleştirmek.

**Spec:** [Faz 2 spec](../specs/2026-06-13-fase-2-remaining-modules-editorial-design.md)

**Tech Stack:** SwiftUI iOS 17+, mevcut `@Observable` ViewModel'lar, AppTheme v3 (sistem serif + SF Pro).

**Doğrulama (her task sonu):**

```bash
cd /Users/keremyarar/remake && xcodebuild -project remake.xcodeproj -scheme remake \
  -destination 'platform=iOS Simulator,id=14CD2DBB-1FD1-40BE-BF04-A05D013DC40E' build 2>&1 \
  | grep -E "(BUILD SUCCEEDED|BUILD FAILED|error: )"
```

Hedef: **0 error**.

---

## Ortak Editoryal Pattern Şablonu

Her modülde aşağıdaki helper'ı ihtiyaca göre inline uygula (yeni dosyaya ekleme yok):

```swift
// Eyebrow row pattern
HStack(spacing: 6) {
    Circle().fill(AppTheme.Colors.accent).frame(width: 5, height: 5)  // .secondary for ikincil
    Text("EYEBROW")
        .font(AppTheme.Typography.eyebrow)
        .kerning(1.2)
        .foregroundStyle(AppTheme.Colors.secondaryText)
}

// Section header: eyebrow + serif italik vurgu
(Text("Normal ").font(AppTheme.Typography.sectionTitle)
 + Text("italik").font(.system(size: 20, weight: .semibold, design: .serif).italic())
 + Text(" devam").font(AppTheme.Typography.sectionTitle))
    .foregroundStyle(AppTheme.Colors.headline)

// Terra-cotta CTA
Button(action: {}) {
    HStack(spacing: 5) {
        Text("Aksiyon").font(.system(size: 13, weight: .semibold))
        Image(systemName: "arrow.right").font(.system(size: 12, weight: .semibold))
    }
    .foregroundStyle(AppTheme.Colors.background)
    .padding(.horizontal, 16).padding(.vertical, 11)
    .background(AppTheme.Colors.accent, in: RoundedRectangle(cornerRadius: 11))
}
.buttonStyle(EditorialTapStyle())

// Chip aktif state
Text("Etiket")
    .font(.system(size: 12, weight: .semibold))
    .foregroundStyle(AppTheme.Colors.accent)
    .padding(.horizontal, 14).padding(.vertical, 8)
    .background(AppTheme.Colors.accentSoft, in: Capsule())

// Kart yüzey
.background(AppTheme.Colors.surface, in: RoundedRectangle(cornerRadius: AppTheme.Metrics.cardRadius))
.overlay(
    RoundedRectangle(cornerRadius: AppTheme.Metrics.cardRadius)
        .stroke(AppTheme.Colors.elevated, lineWidth: 0.5)
)
```

---

## Task 1: MentorView Editoryal Kalibrasyon

**Files:** `remake/MentorView.swift`

- [ ] Header'ı pageTitle serif + eyebrow + altyazıya çevir
- [ ] Status dot renkleri: online success(oliv), streaming accent(terra-cotta), idle secondaryText
- [ ] Mesaj baloncuğu — kullanıcı: accent arka + background metin, `UnevenRoundedRectangle` sağ alt 6, diğer 16
- [ ] Mesaj baloncuğu — asistan: surface arka + primaryText metin, sol alt 6, diğer 16; üst eyebrow "MENTÖR" 10pt opsiyonel
- [ ] Input alanı: surface arka + 1pt iç-kontur elevated; placeholder italik New York "_Bir şey sor..._" secondaryText
- [ ] Send butonu: terra-cotta circle 44pt + arrow.up
- [ ] Reset butonu: elevated pill + arrow.counterclockwise + headline metin
- [ ] Stop butonu (streaming aktif): error pill + background metin
- [ ] **Sözleşme:** streaming, history 20, FocusState dismiss, accessibility labels — değişmez
- [ ] Build verify + commit `feat(mentor): editorial chat bubble + input + status (sözleşme korundu)`

## Task 2: ProfileView Editoryal Kalibrasyon

**Files:** `remake/ProfileView.swift`

- [ ] Signed-out hero: eyebrow "ITALYPATH HESABI" + serif italik "Yolculuğun _seninle_ başlasın" + caption + terra-cotta "Giriş yap" CTA
- [ ] Signed-out alt: 3 satır feature row (heart/document/map icons + caption)
- [ ] Yapılandırma eksik: warning hero — eyebrow + serif italik "Auth henüz _hazır_ değil"
- [ ] Signed-in hero card: avatar 56x56 + serif "Merhaba, _<isim>_" + caption (email) + eyebrow row "N favori · M belge"
- [ ] Account section: UserButton (Clerk) — surface kart içinde sarılır
- [ ] Action rows: "Hesap detayları" / "Çıkış yap" — surface kart + chevron.right
- [ ] **Sözleşme:** Clerk tek auth, CLERK_SECRET_KEY iOS'a girmez, AuthView Dashboard'tan ayarlanır, FavoriteLocalStore + FavoriteRepository count flow — değişmez
- [ ] Build verify + commit `feat(profile): editorial signed-out hero + signed-in card (Clerk sözleşmesi korundu)`

## Task 3: ScholarshipsView Editoryal Kalibrasyon

**Files:** `remake/ScholarshipsView.swift` + `remake/ScholarshipMapView.swift` + `remake/ScholarshipRegionPicker.swift`

- [ ] Header pageTitle "Burs Haritası" serif + sağ dil toggle (TR/EN accent pill)
- [ ] Eyebrow + altyazı "BÖLGE BAZLI · _İtalya'nın_ 20 bölgesi"
- [ ] ScholarshipMapView bölge dolgu renkleri:
  - inaktif: `elevated`/`surface` arası açık ton
  - hover/seçili: `accentSoft`
  - vurgu: `accent`
  - sınır: `secondaryText` muted 0.5pt
- [ ] Bölge detay paneli:
  - Eyebrow "TOSCANA" + Circle accent-dot
  - Serif başlık + accent italik kurum adı
  - 3-4 editoryal info row (eyebrow caption + bodyLg)
  - Resmi link kompakt "Aç →" accent pill
- [ ] Loading/error: krem zemin + serif italik + accent retry CTA
- [ ] ScholarshipRegionPicker sheet: krem zemin + chip pattern
- [ ] **Sözleşme (KRİTİK):** Deeplink `remake://scholarships?region=<slug>` + 20 slug + Supabase→bundled fallback + GeoJSON parse + TR/EN toggle + consumePendingRegionIfNeeded + VoiceOver + reduced motion — kesinlikle değişmez
- [ ] Build verify + deeplink test `xcrun simctl openurl booted "remake://scholarships?region=toscana"`
- [ ] Commit `feat(scholarships): editorial header + map renkleri + bölge paneli (deeplink sözleşmesi korundu)`

## Task 4: ISEECalculatorView Editoryal Kalibrasyon

**Files:** `remake/ISEECalculatorView.swift`

- [ ] Header pageTitle "ISEE Hesapla" serif + dismiss chevron-left 44pt
- [ ] Hero card sonuç: surface kart + 1pt kontur
  - Eyebrow "TAHMİNİ ISEE" + Circle accent-dot
  - 42pt serif bold sayı (numericText geçişi korundu)
  - Placeholder italik "Henüz hesaplanmadı"
- [ ] Input grupları section header: eyebrow + serif italik vurgu
- [ ] Slider row: 14pt başlık + accent rakam + slider tint accent
- [ ] Toggle row: 14pt başlık + Toggle tint accent + caption muted
- [ ] Sticky bottom hesap sonrası: HStack — "YENİDEN HESAPLA" elevated pill + "PDF Paylaş" terra-cotta CTA (arrow.up.doc.fill)
- [ ] Sticky bottom backing: ultraThinMaterial + 0.5pt üst-kontur elevated
- [ ] **Sözleşme:** ISEEEngine, ISEEAmountInputFormatter parse/format/clamp, contentTransition numericText, ISEEReportInput + PDFRenderer + share sheet, dosya adı format, slider/toggle accessibility — değişmez
- [ ] Build verify + commit `feat(isee): editorial hero + input grupları + sticky bottom (PDF + accessibility sözleşmesi korundu)`

## Task 5: DocumentsView Editoryal Kalibrasyon

**Files:** `remake/DocumentsView.swift`

- [ ] Header pageTitle "Belgelerim" serif + sağda terra-cotta circle "+" upload button
- [ ] Signed-out hero: eyebrow "GİRİŞ GEREKLİ" + serif italik "Belgelerin _güvende_ olsun" + caption + terra-cotta "Profil'e Git" CTA (mevcut dismiss + selectedTab=.profile akışı)
- [ ] Empty (signed-in): eyebrow "BOŞ KASA" + serif italik "İlk _belgeni_ ekle" + eyebrow row "PDF / Foto / Pasaport / Diploma" + terra-cotta "Belge ekle"
- [ ] Belge listesi section header: eyebrow "N BELGE" + serif italik "_Tüm_ belgelerin"
- [ ] Liste kartı: 44x44 dosya türü rozet (PDF kırmızı tinted, JPG yeşil tinted; krem üzerinde solgun) + ad lineLimit(2) + caption (boyut + tarih) + context menu (Aç/Paylaş/Sil)
- [ ] Kart pattern: surface + 1pt kontur (EditorialListCard pattern'ı)
- [ ] Upload action sheet: krem alt sheet "Dosya seç / Fotoğraf seç / Vazgeç"
- [ ] **Sözleşme (KRİTİK):** Supabase user_documents + private bucket documents + 20MB limit + MIME listesi + path format `<uid>/<ts>-<uuid>.<ext>` + file_url = storage_path + Files/Photos upload + QuickLook preview + share + delete (metadata then storage) + user switch temizleme + Profil'e yönlendirme — kesinlikle değişmez
- [ ] Build verify + commit `feat(documents): editorial header + empty + liste + upload sheet (Supabase + auth sözleşmesi korundu)`

## Task 6: CommunityView Editoryal Kalibrasyon

**Files:** `remake/CommunityView.swift`

- [ ] Header pageTitle "Topluluk" serif + sağda search ikon 44pt surface circle
- [ ] Eyebrow + serif "TÜRK ÖĞRENCİ · _İtalya'da bir aradayız_"
- [ ] Search field açıldığında alttan slide; italik placeholder "_grup ara_" New York 14pt
- [ ] Platform pill row: WhatsApp/Telegram/Discord/Instagram — seçili accent, inaktif elevated
- [ ] Kategori chip row: Tümü/Üniversite/Şehir/İlgi — Faz 1 pattern
- [ ] Grup kartı:
  - Eyebrow "ROMA · WHATSAPP" + Circle accent-dot
  - Serif başlık + italik vurgu "Sapienza _Türk Öğrenciler_"
  - Caption (üye sayısı + son aktivite eyebrow)
  - Sağda arrow.up.right.square accent
- [ ] Section header reset butonu: ikon + "Sıfırla" eyebrow
- [ ] **Sözleşme:** Static native koleksiyon + openURL dış link + arama ikon → TextField focus + platform + kategori pill filtreleri + search alanları + reset butonu adı + dikey tekil grup gösterimi — değişmez
- [ ] Build verify + commit `feat(community): editorial header + arama + pill filtreleri + grup kartı (filtre sözleşmesi korundu)`

## Task 7: Full Build + Smoke Test + Context.md Güncelle

- [ ] Clean build: `xcodebuild ... clean build` → 0 error
- [ ] Manuel smoke 6 modül (spec Bölüm 9 listesi)
- [ ] `ItalyPath_iOS_SwiftUI_Context.md` Bölüm 5 modül durumlarına "Faz 2 editorial kalibre" notları
- [ ] Roadmap'te "Faz 2" task'ını [x] işaretle
- [ ] Final commit `docs: AGENT_CONTEXT — Faz 2 editorial kalibrasyon tamamlandı`

---

## Mevcut Sözleşmeler Hatırlatma — Hiçbiri Değişmez

1. Deeplink `remake://scholarships?region=<slug>` formatı + 20 slug
2. Favorites: user_id=Clerk id, university_id=String(university.id)
3. Burs offline fallback (Supabase → bundled JSON)
4. Clerk tek auth, CLERK_SECRET_KEY iOS'a girmez
5. `INFOPLIST_KEY_UILaunchScreen_Generation = NO` her iki SDK
6. universities additive kolon (ALTER TABLE ADD COLUMN IF NOT EXISTS)
7. program_admission_details read-only
8. Home routeManager.selectedTab izleyici + fullScreenCover otomatik kapanma + NavigationStack
9. UniversityDetailView sticky bottom sertleştirmeleri
10. Documents Supabase tablo/bucket/path/MIME sözleşmesi
11. ISEE PDF dosya adı + report content
12. Mentör Gemini streaming + history limit + FocusState dismiss
