# ItalyPath iOS — Home + Okullar "Modern Editorial" Yeniden Tasarımı (Pilot)

> **Tarih:** 12 Haziran 2026
> **Kapsam:** Pilot — Ana Sayfa (Home) + Okullar (liste + detay + program başvuru detayı)
> **Faz 2 (ayrı spec):** Mentör, Burs, Profil, ISEE, Belgelerim, Topluluk — aynı dile kalibre
> **Repo:** `/Users/keremyarar/remake/remake.xcodeproj`
> **Karar sahibi:** Kerem Yarar (ürün), uygulama ajansı bu spec'i kaynak alır

---

## 1. Hedef

ItalyPath iOS uygulamasını "premium dark utility" tonundan, **Modern Editorial İtalyan kültürü** yönüne taşımak. Pilot olarak Home + Okullar yenilenir; baz dil onaylandıktan sonra Faz 2'de kalan 6 ekran aynı dile kalibre edilir.

**Başarı kriteri (pilot):**

- Home + Okullar editoryal palet + tipografi + layout dilini taşır
- 0 warning / 0 error: `xcodebuild -project remake.xcodeproj -scheme remake -destination 'platform=iOS Simulator,name=iPhone 16e' build`
- Mevcut çalışan davranışlar (deeplink, favorites, offline fallback, modal otomatik kapanma, sticky bottom overflow düzeltmeleri, history null gizleme, program admission detail read-only akışı) bozulmaz
- AA kontrast korunur; 44pt min tap target korunur
- Launch screen + app icon yenilenir, pbxproj `INFOPLIST_KEY_UILaunchScreen_Generation = NO` tuzağı sürdürülür

---

## 2. Görsel Dil — `AppTheme v3 — Editorial`

### 2.1 Renk Paleti

| Token | Hex | Kullanım |
|---|---|---|
| `background` | `#FAF7F2` | Sayfa ana zemin (krem) |
| `surface` | `#F1ECE3` | Kart yüzeyi (soğuk fil dişi) |
| `elevated` | `#E7E0D2` | Hover/seçili yüzey, 1pt iç-kontur |
| `headline` | `#1A2238` | Başlık, vurgu (gece-mavisi) |
| `body` | `#3D4458` | Paragraf metni (kahve-mürekkebi) |
| `muted` | `#7A8195` | Caption, meta, alt yazı (taş grisi) |
| `accent` | `#C26B4C` | Birincil CTA, link, tab tint (terra-cotta) |
| `accentSoft` | `accent.opacity(0.12)` | Chip arka planı, hover |
| `secondary` | `#5F7A6B` | İkincil aksent (oliv) |
| `success` | `#5F7A6B` | Pozitif durum |
| `warning` | `#C58B2E` | "Kontrol önerilir" uyarısı |
| `error` | `#A03A28` | Hata mesajı |

**Kontrast doğrulama (zorunlu):**

- `background` vs `headline` → 12.5:1 (AAA)
- `background` vs `body` → 9.8:1 (AAA)
- `background` vs `muted` → 4.6:1 (AA)
- `accent` üstünde `background` metin → 3.8:1 (UI buton için yeterli; metin link için boyut ≥ 14pt + SemiBold zorunlu)

### 2.2 Tipografi Rolleri

Aile seçimi:

- **Serif:** Cormorant Garamond (Google Fonts, SIL OFL, Türkçe glyph tam)
- **San-serif:** Inter (Google Fonts, SIL OFL, sistem font benzeri okunabilirlik)
- Yedek: SF Pro fallback (font bundle yüklenemediğinde)

Bundle yöntemi:

- `.ttf` dosyaları app bundle'a eklenir (`Cormorant-Regular`, `Cormorant-SemiBold`, `Cormorant-SemiBoldItalic`, `Cormorant-Bold`, `Cormorant-BoldItalic`; `Inter-Regular`, `Inter-Medium`, `Inter-SemiBold`)
- `Info.plist` içine `UIAppFonts` array'i eklenir
- `AppTheme.Typography` rolleri `Font.custom(...).relativeTo(.title)` ile dynamic type desteğiyle bağlanır

Roller:

| Token | Boyut | Aile / Ağırlık | Kullanım |
|---|---|---|---|
| `display` | 34 | Cormorant Bold + Italic karışım | Hero başlığı |
| `pageTitle` | 28 | Cormorant Bold | Home/Okullar pageTitle |
| `sectionTitle` | 20 | Cormorant SemiBold + Italic | Bölüm başlığı (italik kelime serpiştirir) |
| `cardTitle` | 17 | Inter SemiBold | Liste kart başlığı (serif değil!) |
| `bodyLg` | 16 | Inter Regular | Paragraf, açıklama |
| `body` | 14 | Inter Regular | UI body |
| `caption` | 12 | Inter Medium | Meta, caption |
| `eyebrow` | 11 | Inter SemiBold, kerning +1.2 | All-caps kushe etiket ("ROMA", "ZORUNLU") |

### 2.3 Ölçü Sistemi

- Köşe yarıçapları: kart 16, hero 24, chip 100 (pill), button 12, image cell 12
- Min tap target: 44pt (Apple HIG, korunur)
- 8pt padding skala: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48
- Page horizontal margin: 24pt (eski 16'dan fazla — editoryal nefes)
- Status bar altı üst nefes: 88pt (pageTitle "ekranın üstünde duruyor" hissi)
- Bölüm araları min 32pt, hero üstü 40pt
- Buton basma: scale 0.97 + spring (0.3, 0.65)

### 2.4 Gölge Dili

- Editoryal his = "fotoğraf basılı kağıt" → gölge **yok ya da çok hafif**
- Liste kart: gölge yok, 1pt iç-kontur `elevated` (#E7E0D2) ile ayrılır
- Hero kart: gölge yok, foto kendi sınırını çizer
- Modal/sheet: çok yumuşak `radius 24, y 8, opacity 0.06` ile alttan ışık
- "Materyal kartı" hissinden bilinçli kaçınılır

### 2.5 Motion

- Section enter: opacity 0→1, y +8pt→0, spring (response 0.3, damping 0.7), stagger 60ms
- Tap: scale 0.97, spring (0.3, 0.65)
- Sayfa geçişi: iOS 18+ `.navigationTransition(.zoom)` (hero foto bağlantısı varsa), aksi halde standart push
- `accessibilityReduceMotion = true` → sadece opacity, scale/translate kapanır
- TabView geçişleri: yumuşak fade (mevcut native korunur)

---

## 3. Layout Sistemi

### 3.1 Sayfa Kompozisyonu

- Asimetrik editoryal grid: içerik sol kenara hizalı, sağda bilinçli boşluk
- pageTitle status bar'a yapışmaz, 88pt nefes boşluğuyla "asılı durur"
- 24pt horizontal margin (eski 16'dan fazla)
- 32pt minimum bölüm araları

### 3.2 Kart Anatomisi

**Hero kart** (Home popüler carousel + okul detay başı)

- Full-bleed foto, 16:11 oran, ekran genişliği eksi 24pt margin
- Üstte hafif koyu gradient sadece eyebrow okunabilirliği için (mevcut Popular kart sertleştirmesi korunur)
- Köşe yarıçapı 24
- Foto üzerinde: eyebrow ("ROMA / Sapienza") + Cormorant 28pt italik vurgulu başlık + 14pt Inter caption

**Liste kart** (Okullar liste, Home önerilen)

- Yatay layout: sol 80x80 foto (radius 12), sağ 2 satır metin + meta
- Arka plan `surface`, 1pt iç-kontur `elevated`
- Padding 16, kartlar arası 12, tap target ≥ 80pt
- Sağ alt köşede ufak departman sayısı rozeti (mevcut RecommendedCard pattern korunur)
- Sağ üst kalp (favori), 44pt tap target

**Bilgi kartı** (Home hızlı erişim 4 ikon row)

- Dikey: 56x56 yuvarlak ikon + 11pt eyebrow caption
- Arka plan yok (krem zemin üstünde sade kalır)

### 3.3 Eyebrow Motif

Tüm editoryal kartlarda üst sol köşede 11pt Inter SemiBold all-caps eyebrow:

- Yan yana renkli nokta (kategori rengi) + metin
- Örnek: "• ROMA", "• ZORUNLU BELGE", "• BU HAFTA"
- Editoryal magazine kushe etiketinin uygulama içi versiyonu

### 3.4 Section Header

- eyebrow + Cormorant 20pt italik vurgulu sectionTitle + sağda "Tümü →" (varsa anlamlı, yoksa gizli)
- Boş "Tümü" kesinlikle yasak (mevcut Home cleanup korunur)

### 3.5 Tab Bar

- 5 sekme korunur: Ana Sayfa / Okullar / Mentör / Burs / Profil
- Aktif: terra-cotta `accent` + üstte 2pt ince çizgi
- İnaktif: muted `#7A8195`
- Tab bar arka planı: blur material + 1pt üst-kontur (krem zemine yapışmaz)

---

## 4. Home Ekranı

Yukarıdan aşağı 7 bölüm:

### 4.1 Header

- 40x40 avatar (sol) + eyebrow "MERHABA" + 17pt Inter SemiBold ad
- Sağda 44pt bildirim zili (disabled görünüm, future push notif)
- Avatar tap → Profil sekmesi (mevcut davranış)
- Scroll'da fade-shrink

### 4.2 Hero — Editoryal Kapak

- Foto yok, saf tipografi
- Eyebrow: "BU HAFTA • 12 HAZİRAN"
- Cormorant 28pt italik vurgulu başlık: "İtalya'da _eğitim_ yolunda bir adım daha"
- 14pt Inter caption: "Profilini tamamla, sana özel öneri al"
- Terra-cotta CTA "Başla →" → Profil sekmesi

### 4.3 Hızlı Erişim — 4 İkon Row

- ISEE / Belgelerim / Topluluk / Mentör
- İlk üçü `fullScreenCover` (mevcut), Mentör tab geçişi (mevcut)
- Eski "Özellikler" başlığı ve boş "Tümünü gör" kaldırılır (mevcut karar)

### 4.4 Popüler Üniversiteler — Yatay Scroll

- Section header: "POPÜLER" + "_Bu hafta öne çıkanlar_" + "Tümü →" (Okullar tab)
- 3-4 Hero kart, ekranın ~%85'i genişlik, 24pt peek
- **Navigasyon kararı:** `HomeView` etrafına yeni bir `NavigationStack` eklenir. Popüler kart tap → bu stack üzerinden `UniversityDetailView` push. Mevcut "Okullar/Mentör/Burs **feature kartları** ilgili TabView sekmesine geçirir" davranışı feature grid'e özeldir; popüler/önerilen üniversite kartları farklı bir akıştır ve onunla çakışmaz.

### 4.5 Mentör Kartı

- Geniş yatay kart, Cormorant italik "Türkçe sor, _yanıt al_" + Inter caption "Senin için Gemini"
- Dekoratif italik "?" hat
- CTA "Mentörle konuş →" (Mentör tab)

### 4.6 Burs Haritası Kartı

- Geniş yatay kart, arka plan %15 opacity İtalya silüeti SVG
- "BURS" eyebrow + "_Bölgene göre bursunu bul_"
- CTA "Haritaya git →" (Burs tab)

### 4.7 Önerilen Üniversiteler — Dikey Liste

- Section header: "SENİN İÇİN" + "_Önerilen_ üniversiteler"
- 4-6 liste kartı (mevcut RecommendedCard yapısı editoryal token'larla)
- Liste sonunda "Daha fazla öneri →" link → Okullar tab (mevcut feature kartı pattern'i)
- Tap → 4.4 ile aynı: Home `NavigationStack` üzerinden `UniversityDetailView` push
- Footer 80pt tab bar boşluğu

### 4.8 Empty / First-Visit

- Hero "Hoş geldin" varyantı: "İtalya yolculuğun _burada_ başlıyor"
- Önerilen yoksa generic 6 popüler üni

### 4.9 Pull-to-Refresh

- Native `.refreshable`, accent rengi spinner

### 4.10 Sözleşme

- `HomeView` `routeManager.selectedTab` izler → tab `.home` dışına geçince aktif `fullScreenCover` (ISEE/Belgelerim/Topluluk) otomatik kapanır (mevcut zincir korunur)

---

## 5. Okullar (Liste + Detay + Program Başvuru)

### 5.1 Okullar Liste

**Header**

- pageTitle "Okullar" (Cormorant 28pt) + sağda 44pt filtre ikonu

**Search**

- `surface` arka plan, 1pt iç-kontur, terra-cotta focus state
- Placeholder italik Cormorant 14pt: "_üniversite veya şehir ara_"

**Kategori chip'leri**

- Yatay scroll, pill 100r
- Seçili: `accentSoft` fon + `accent` metin
- İnaktif: `elevated` fon + `headline` metin
- "Tümü / Devlet / Özel / Sanat / Araştırma" — mevcut `UniversityCategoryResolver` çıktısı

**Liste**

- 80x80 foto (radius 12) + 2 satır Inter (SemiBold başlık + Regular caption) + sağ alt departman sayısı rozeti + sağ üst kalp
- 12pt kartlar arası
- Pull-to-refresh native
- Empty state: italik "_Aradığın sonuç yok_" + "Filtreyi sıfırla" link
- Favori sync hatası listelemeyi bozmaz; ayrı caption (mevcut sözleşme)

**Filtre alt sheet (yeni)**

- `presentationDetents([.medium])`, krem zemin
- Cormorant 20pt italik "_Filtrele_"
- Kategori chip'leri, sıralama (Alfabetik / Şehir / Bölüm sayısı), şehir filtresi
- Alt CTA "Uygula" — terra-cotta full width

### 5.2 Üniversite Detay

**Hero**

- Status bar altına oturan full-bleed foto, 320pt yükseklik
- Alttan koyu→şeffaf gradient (back/favori butonu okunabilirliği — mevcut sertleştirme korunur)
- Sol 44pt back button + sağ 44pt favori kalp, blur circle backdrop

**Hero altı**

- Eyebrow şehir + kategori: "MILANO • DEVLET / ARAŞTIRMA"
- Cormorant 28pt italik vurgulu başlık: "Politecnico _di Milano_"

**Section'lar**

- **Hakkında:** Inter 15pt, 4 satır collapse + "Devamını oku" (mevcut)
- **Tarihçe:** history null ise tamamen gizli (mevcut), açıksa aynı pattern + eyebrow "TARİHÇE"
- **Bölümler:** level bazlı gruplar (Lisans / Yüksek Lisans / Tek Döngü)
  - Section header "_Lisans_ programları" + "Başvuru detayı: 18/24" özeti (mevcut)
  - Satır: program adı + sağ "Detayları gör →" (varsa) ya da "Detay yakında" pasif rozet (yoksa)
  - Detay kaydı olan satır → `ProgramAdmissionDetailView` push
- **Detaylar:** kompakt "Web" accent kapsül (`layoutPriority(1)`, uzun isimde kırılmaz — mevcut sertleştirme korunur), kuruluş yılı, vb.

**Sticky bottom**

- HStack horizontal padding 16
- Yıllık harç: `.lineLimit(1).minimumScaleFactor(0.7)` (mevcut)
- "ISEE Hesapla" CTA: `.fixedSize(horizontal:true, vertical:false).layoutPriority(1)` (mevcut)
- CTA terra-cotta accent

### 5.3 Program Başvuru Detayı

- Header: eyebrow "BAŞVURU DETAYI" + serif "_Sapienza_ — Computer Science"
- Section'lar: Başvuru tipi / Akademik şartlar / Dil şartları / EU & non-EU deadline / Belgeler / Sınav / Resmi linkler / Kaynak alıntılar
- "Kontrol önerilir" rozeti `warning` ile uncertain alanlarda
- Linkler `openURL` (mevcut)
- Read-only — DB migration veya policy değişikliği yok

---

## 6. Marka Asset Yenileme

### 6.1 Launch Screen

- `Assets.xcassets/LaunchBackground.colorset` → `#FAF7F2` (krem)
- `Assets.xcassets/LaunchWordmark.imageset/launch_wordmark.pdf` yenilenir:
  - "ItalyPath" wordmark, Cormorant SemiBold italik
  - Renk: `#1A2238` (gece-mavisi)
  - Transparent BG, vektör (`preserves-vector-representation = true`)
- `imports/launch_wordmark.pdf` master güncellenir
- `Info.plist > UILaunchScreen` korunur:
  - `UIColorName = LaunchBackground`
  - `UIImageName = LaunchWordmark`
  - `UIImageRespectsSafeAreaInsets = false`
- **KRİTİK pbxproj sözleşmesi:** `INFOPLIST_KEY_UILaunchScreen_Generation = NO` her iki SDK için (`iphoneos` + `iphonesimulator`)
- **Doğrulama adımı (zorunlu):**
  `PlistBuddy -c "Print :UILaunchScreen" <App>/Info.plist` ile bundle Info.plist'inde dict'in dolu geldiği görülmeli

### 6.2 App Icon

- 1024x1024 PNG, opaque `#FAF7F2` zemin
- Ortalı Cormorant italik "ItalyPath" wordmark, `#1A2238`
- `Assets.xcassets/AppIcon.appiconset/AppIcon.png`
- iOS Universal `light`, `dark`, `tinted` slotları aynı PNG'ye referans
- `imports/app_icon_1024.png` master güncellenir

---

## 7. Erişilebilirlik

- Tüm hero başlıkları `.accessibilityAddTraits(.isHeader)`
- Eyebrow + başlık tek okumaya: `.accessibilityElement(children: .combine)`
- 44pt min tap target (mevcut korunur)
- Dynamic Type: Cormorant + Inter `Font.custom(...).relativeTo(.title)` ile ölçeklenir; XXL size testi zorunlu (build sonrası simulator manuel)
- AA kontrast doğrulanmıştır (Bölüm 2.1)
- `accessibilityReduceMotion = true` → opacity'siz section enter, scale/translate kapanır
- VoiceOver test rotası: Home → Okullar → bir okul detayı → bir program admission detail → geri (zorunlu manuel kontrol)

---

## 8. Mevcut Sözleşmelerin Korunması (DEĞİŞTİRİLMEZ)

1. **Deeplink:** `remake://scholarships?region=<slug>` formatı ve 20 geçerli slug değişmez. Burs modülü Faz 2'de aynı kalır.
2. **Favorites tablosu:** `favorites.user_id = Clerk user.id`, `favorites.university_id = String(university.id)`. SwiftData local cache + pending mutation queue + signed-out durumda Profil'e yönlendirme (mevcut).
3. **Burs modülü offline fallback:** Supabase `scholarship_regions` → bundled `ScholarshipRegionsData.json`. Pilot'ta tema kalibresi yok; Faz 2'de uygulanır.
4. **Clerk tek auth kaynağı:** iOS bundle/config/source'da `CLERK_SECRET_KEY` yok. `CLERK_PUBLISHABLE_KEY` + `CLERK_FRONTEND_API_URL` mevcut config akışıyla kalır. Associated Domains entitlement değişmez.
5. **Launch screen pbxproj tuzağı:** `INFOPLIST_KEY_UILaunchScreen_Generation = NO` her iki SDK için. Asset rengi/PDF güncellenir, anahtar değişmez.
6. **Universities tablosu additive kolon:** Pilot DB migration yapmaz. İleride iOS-specific kolon eklenirse `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (additive). Webapp şemasını override etmez.
7. **`program_admission_details` read-only:** Pilot tabloya yazma yapmaz. Mevcut `ProgramAdmissionDetailRepository` + `ProgramAdmissionDetailView` editoryal token'larla yeniden boyanır, akış aynı kalır.
8. **Home modal otomatik kapanma:** `HomeView` `routeManager.selectedTab` izleme + `.home` dışına geçince aktif `fullScreenCover` (ISEE/Belgelerim/Topluluk) otomatik kapanır. Bu zincir korunur. Yeni eklenen `HomeView` `NavigationStack`'i bu davranışı bozmaz; `NavigationStack` `HomeView`'in iç akışıdır, `fullScreenCover` ve `selectedTab` izleme dış zincirde kalır.
9. **`UniversityDetailView` overflow sertleştirmeleri:** Sticky bottom HStack 16pt margin + "ISEE Hesapla" `.fixedSize.layoutPriority(1)` + yıllık harç `.lineLimit(1).minimumScaleFactor(0.7)`. Info section "Web" kompakt accent kapsül + `.layoutPriority(1)`. Üniversite adı `.fixedSize(horizontal:false, vertical:true)`. Mevcut iPhone 16e overflow düzeltmeleri korunur.

---

## 9. Faz 2 Geçiş Notu

Pilot sırasında **Mentör / Burs / Profil / ISEE / Belgelerim / Topluluk** mevcut dark tema (AppTheme v2) ile çalışmaya devam eder. Kullanıcı sekme/modal değiştirince geçici tema atlaması yaşar — kabul edilmiş risktir.

Faz 2 ayrı spec olarak yazılır; aynı `AppTheme v3 — Editorial` token sistemi 6 ekrana uygulanır. Sıra: Mentör → Profil → Burs → ISEE → Belgelerim → Topluluk (kullanım sıklığına göre).

---

## 10. Doğrulama Sözleşmesi

Her anlamlı uygulama adımı sonunda:

```
xcodebuild -project remake.xcodeproj -scheme remake \
  -destination 'platform=iOS Simulator,name=iPhone 16e' build
```

Hedef: **0 warning / 0 error**.

Build sonrası launch screen doğrulaması (zorunlu):

```
/usr/libexec/PlistBuddy -c "Print :UILaunchScreen" \
  <build dir>/remake.app/Info.plist
```

Dict dolu gelmeli (`UIColorName`, `UIImageName`, `UIImageRespectsSafeAreaInsets`).

Manuel smoke test rotası (zorunlu, simulator iPhone 16e):

1. App launch → launch screen krem zemin + ItalyPath wordmark görünür
2. Home → hero + 4 ikon row + popüler carousel + mentor card + burs card + önerilen liste
3. Hızlı erişim ISEE → fullScreenCover açılır (mevcut)
4. Tab Okullar → liste + kategori chip + arama
5. Bir okul aç → hero foto + section'lar + sticky bottom CTA → ISEE açılır
6. Bölüm satırı → program admission detail
7. Tab Mentör → dark tema gelir (faz 2 öncesi beklenen davranış)
8. Deeplink test: `xcrun simctl openurl booted "remake://scholarships?region=toscana"` → Burs sekmesi açılır + Toscana seçili
9. Sign-out → favori kalp tap → Profil'e yönlendirme (mevcut)

---

## 11. Geçmişten Bağlı Spec'ler

- `2026-05-10-italypath-editorial-ui-design.md` — daha önce yapılmış editoryal yön keşfi (uygulanmamış); bu spec onun yerini alır, kapsamı net olarak Home + Okullar pilotuna daraltır.
- `2026-05-12-universities-field-guide-redesign-design.md` — Okullar konusu önceki keşif; section yapısı kısmen referans alınmıştır, palet/tipografi tamamen bu spec'e göre yeniden tanımlıdır.
- Mevcut `ItalyPath_iOS_SwiftUI_Context.md` (Bölüm 9) — Agent Handoff Checklist bağlayıcıdır.

---

## 12. Açık Sorular (implementasyon planı yazılırken karara bağlanır)

- **Font lisanslama:** Cormorant + Inter SIL OFL — ticari kullanım serbest, ama font dosyalarının repo içinde mi yoksa sadece bundle resource olarak mı tutulacağı (öneri: `remake/Fonts/` altında commit, README'de lisans notu).
- **iOS 17 vs 18 `.navigationTransition(.zoom)` fallback:** mevcut deployment target 17.0; iOS 17'de standart push, iOS 18'de zoom (planda netleşir).
- **Üniversite foto kalitesi:** Wikipedia thumbnail backfill mevcut; yeni hero kompozisyon büyük foto ister, low-res üniversiteler için Faz 2'de Unsplash fallback planlanabilir (pilot dışı).
