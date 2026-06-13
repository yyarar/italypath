# Home + Okullar Modern Editorial Yeniden Tasarımı — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ItalyPath iOS uygulamasının Home + Okullar (liste + detay + program admission detail) ekranlarını "Modern Editorial İtalyan kültürü" yönünde yeniden tasarlamak; AppTheme v3 — Editorial token sistemini kurmak; launch screen + app icon'u kalibre etmek; mevcut çalışan davranışları bozmadan.

**Architecture:** Mevcut MVVM mimarisi korunur. AppTheme v3 token sistemi mevcut `AppTheme.swift`'i tamamen değiştirir; tüm tüketici View'lar yeni token isimlerine geçer. HomeView'a `NavigationStack` eklenir (popüler/önerilen kart tap'i `UniversityDetailView` push). Mevcut sözleşmeler (deeplink, favorites, offline fallback, Clerk, pbxproj `INFOPLIST_KEY_UILaunchScreen_Generation=NO`, sticky bottom overflow düzeltmeleri, `routeManager.selectedTab` izleme + fullScreenCover otomatik kapanma zinciri) değişmeden korunur.

**Tech Stack:** SwiftUI iOS 17+, sistem font'ları (New York serif + SF Pro sans), Supabase, Clerk, mevcut `@Observable` ViewModel'lar, `AppRouteManager`.

**Spec:** [docs/superpowers/specs/2026-06-12-home-schools-editorial-redesign-design.md](../specs/2026-06-12-home-schools-editorial-redesign-design.md)

**Doğrulama komutu (her major task sonrası):**

```bash
cd /Users/keremyarar/remake && xcodebuild -project remake.xcodeproj -scheme remake \
  -destination 'platform=iOS Simulator,name=iPhone 16e' build 2>&1 | tail -30
```

Hedef: **0 warning / 0 error**.

---

## Dosya Yapısı

**Modify:**
- `/Users/keremyarar/remake/remake/AppTheme.swift` — full rewrite (v3 Editorial token sistemi)
- `/Users/keremyarar/remake/remake/ContentView.swift` — TabView içeriği değişmez; tab bar tint + appearance editoryal token'larla; HomeView NavigationStack ile sarılır
- `/Users/keremyarar/remake/remake/SchoolsView.swift` — full visual rewrite (search/chip/list/filter sheet editoryal token'lar)
- `/Users/keremyarar/remake/remake/UniversityDetailView.swift` — full visual rewrite (hero + sections + sticky bottom editoryal token'lar, sertleştirmeler korunur)
- `/Users/keremyarar/remake/remake/ProgramAdmissionDetailView.swift` — visual rewrite (editoryal section başlıkları + chip dili)
- `/Users/keremyarar/remake/remake/UniversityImageView.swift` — initials fallback editoryal token'lara kalibre
- `/Users/keremyarar/remake/remake/Assets.xcassets/LaunchBackground.colorset/Contents.json` — rengi `#FAF7F2`'ye çevir
- `/Users/keremyarar/remake/imports/launch_wordmark.pdf` — yeni master (Cormorant italik wordmark navy)
- `/Users/keremyarar/remake/remake/Assets.xcassets/LaunchWordmark.imageset/launch_wordmark.pdf` — master kopyası
- `/Users/keremyarar/remake/imports/app_icon_1024.png` — yeni master (krem zemin + navy wordmark)
- `/Users/keremyarar/remake/remake/Assets.xcassets/AppIcon.appiconset/AppIcon.png` — master kopyası

**Tek dokunulmaz:**
- `/Users/keremyarar/remake/remake.xcodeproj/project.pbxproj` — `INFOPLIST_KEY_UILaunchScreen_Generation = NO` korunur, başka değişiklik yok
- `/Users/keremyarar/remake/remake/Info.plist` — `UILaunchScreen` dict aynı kalır, `UIAppFonts` eklenmez
- `/Users/keremyarar/remake/remake/AppRouteManager.swift` — selectedTab + scholarshipRegionSlug akışı değişmez
- `/Users/keremyarar/remake/remake/FavoriteRepository.swift` + `FavoriteLocalStore.swift` — favorites sözleşmesi değişmez
- `/Users/keremyarar/remake/remake/ScholarshipsView.swift` ve burs modülü — pilot dışı, faz 2

---

## Task 1: AppTheme v3 — Editorial Token Sistemi

**Files:**
- Modify: `/Users/keremyarar/remake/remake/AppTheme.swift` (full rewrite)

**Hedef:** Mevcut dark token sistemini krem editoryal token sistemine değiştir. Tüm tüketici View'lar derleme hatası vermesin diye eski rol isimleri (`headline`, `primaryText`, `secondaryText`, `accent`, `accentSoft`, `background`, `surface`, `elevated`, `error`, `warning`, `success`, `successSoft`) korunur ve **yeni editoryal renklere** mapping yapılır. Eski tipografi rolleri (`pageTitle`, `sectionTitle`, `cardTitle`, `bodyLg`, `body`, `caption`, `heroTitle`, `screenTitle`, `chip`, `cardSubtitle`, `logo`) korunur, ayrıca yeni `display`, `eyebrow` rolleri eklenir.

- [ ] **Step 1: Mevcut AppTheme.swift'i oku ve mevcut rolleri çıkar**

  ```bash
  cat /Users/keremyarar/remake/remake/AppTheme.swift
  ```

  Eski rol isimleri listesi çıkarılır; her birinin yeni karşılığı netleştirilir.

- [ ] **Step 2: AppTheme.swift'i full rewrite et**

  ```swift
  import SwiftUI

  enum AppTheme {
      enum Colors {
          // --- Editorial v3 surface ---
          static let background = Color(hex: "#FAF7F2")  // cream
          static let surface = Color(hex: "#F1ECE3")     // ivory
          static let elevated = Color(hex: "#E7E0D2")    // sand

          // --- Editorial v3 text ---
          static let headline = Color(hex: "#1A2238")        // navy ink
          static let primaryText = Color(hex: "#3D4458")     // body
          static let secondaryText = Color(hex: "#7A8195")   // muted
          static let muted = Color(hex: "#7A8195")           // alias

          // --- Brand accent ---
          static let accent = Color(hex: "#C26B4C")          // terra-cotta
          static let accentSoft = accent.opacity(0.14)
          static let secondary = Color(hex: "#5F7A6B")       // olive

          // --- Semantics (editorial-tuned) ---
          static let success = Color(hex: "#5F7A6B")
          static let successSoft = success.opacity(0.12)
          static let warning = Color(hex: "#C58B2E")
          static let warningStrong = Color(hex: "#A66E1A")
          static let error = Color(hex: "#A03A28")
      }

      enum Typography {
          // System serif (New York) + SF Pro
          static let display = Font.system(size: 34, weight: .bold, design: .serif)
          static let pageTitle = Font.system(size: 28, weight: .bold, design: .serif)
          static let screenTitle = Font.system(size: 26, weight: .semibold, design: .serif)
          static let heroTitle = Font.system(size: 24, weight: .semibold, design: .serif)
          static let sectionTitle = Font.system(size: 20, weight: .semibold, design: .serif)
          static let cardTitle = Font.system(size: 17, weight: .semibold, design: .default)
          static let bodyLg = Font.system(size: 16, weight: .regular, design: .default)
          static let body = Font.system(size: 14, weight: .regular, design: .default)
          static let caption = Font.system(size: 12, weight: .medium, design: .default)
          static let cardSubtitle = Font.system(size: 12, weight: .regular, design: .default)
          static let chip = Font.system(size: 11, weight: .semibold, design: .default)
          static let eyebrow = Font.system(size: 11, weight: .semibold, design: .default)
          static let logo = Font.system(size: 30, weight: .bold, design: .serif)
      }

      enum Metrics {
          static let minTapTarget: CGFloat = 44
          static let pageHorizontalPadding: CGFloat = 24
          static let cardRadius: CGFloat = 16
          static let heroRadius: CGFloat = 24
          static let chipRadius: CGFloat = 100
          static let buttonRadius: CGFloat = 12
          static let imageRadius: CGFloat = 12
          static let iconBadge: CGFloat = 50
          static let iconBadgeRadius: CGFloat = 14
          static let sectionGap: CGFloat = 32
          static let heroTopPadding: CGFloat = 40
          static let statusBarBreathing: CGFloat = 24
      }

      enum Motion {
          static let tapScale: CGFloat = 0.97
          static let tapSpring = Animation.spring(response: 0.3, damping: 0.65)
          static let sectionEnter = Animation.spring(response: 0.3, damping: 0.7)
          static let sectionStaggerMs: Int = 60
      }
  }

  // MARK: - Color hex initializer (mevcut helper varsa kaldırılmaz, çakışırsa bu blok silinir)
  extension Color {
      init(hex: String) {
          var hex = hex
          if hex.hasPrefix("#") { hex.removeFirst() }
          var rgb: UInt64 = 0
          Scanner(string: hex).scanHexInt64(&rgb)
          let r = Double((rgb >> 16) & 0xFF) / 255
          let g = Double((rgb >> 8) & 0xFF) / 255
          let b = Double(rgb & 0xFF) / 255
          self.init(red: r, green: g, blue: b)
      }
  }
  ```

  **Önemli:** Eğer mevcut AppTheme.swift'te `Color(hex:)` initializer'ı varsa, dosyanın sonundaki extension'ı silmeyi unutma (duplicate symbol hatası verir).

- [ ] **Step 3: Build et — eski token isimleri çalışmalı**

  ```bash
  cd /Users/keremyarar/remake && xcodebuild -project remake.xcodeproj -scheme remake \
    -destination 'platform=iOS Simulator,name=iPhone 16e' build 2>&1 | tail -40
  ```

  Beklenen: 0 error. Warning olabilir (yeni eyebrow/display kullanılmıyor) — kabul edilebilir.

- [ ] **Step 4: Commit**

  ```bash
  cd /Users/keremyarar/italypath-main && git add -A && git -C /Users/keremyarar/remake add -A
  git -C /Users/keremyarar/remake commit -m "$(cat <<'EOF'
  feat(theme): AppTheme v3 — Editorial token sistemi

  - Krem editoryal palet (#FAF7F2 zemin, #1A2238 navy, #C26B4C terra-cotta)
  - System serif (New York) + SF Pro tipografi rolleri
  - Eyebrow + display rolleri eklendi
  - Eski rol isimleri korundu (mevcut View'lar derlenmeye devam eder)

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Task 2: ContentView — TabView Editorial Appearance

**Files:**
- Modify: `/Users/keremyarar/remake/remake/ContentView.swift`

**Hedef:** TabView tab bar arka planı + tint + selected indicator editoryal token'larla; HomeView'ı `NavigationStack` ile sar (popüler/önerilen kart tap'i için).

- [ ] **Step 1: ContentView.swift'i oku, mevcut TabView yapısını anla**

  ```bash
  cat /Users/keremyarar/remake/remake/ContentView.swift
  ```

- [ ] **Step 2: TabView'da:**
  - `.tint(AppTheme.Colors.accent)` ekle veya güncelle (terra-cotta).
  - `UITabBarAppearance` ile arka planı `AppTheme.Colors.background` blur material'a kalibre et (`init.swift`'te veya ContentView `init` içinde).
  - HomeView'ı `NavigationStack { HomeView() }` ile sar — Home stack içinde detay push yapabilsin.

  Pattern:

  ```swift
  init() {
      let appearance = UITabBarAppearance()
      appearance.configureWithDefaultBackground()
      appearance.backgroundColor = UIColor(AppTheme.Colors.background.opacity(0.92))
      appearance.shadowColor = UIColor(AppTheme.Colors.elevated)
      UITabBar.appearance().standardAppearance = appearance
      UITabBar.appearance().scrollEdgeAppearance = appearance
  }
  ```

  TabView body:

  ```swift
  TabView(selection: $routeManager.selectedTab) {
      NavigationStack { HomeView(...) }
          .tabItem { Label("Ana Sayfa", systemImage: "house") }
          .tag(AppTab.home)
      // ... mevcut diğer sekmeler aynı kalır
  }
  .tint(AppTheme.Colors.accent)
  ```

- [ ] **Step 3: Build verify**

  ```bash
  cd /Users/keremyarar/remake && xcodebuild ... build 2>&1 | tail -20
  ```

  Beklenen: 0 error.

- [ ] **Step 4: Commit**

  ```bash
  git -C /Users/keremyarar/remake add -A
  git -C /Users/keremyarar/remake commit -m "feat(content): TabView editorial appearance + Home NavigationStack"
  ```

---

## Task 3: HomeView — Editorial Cover + Header

**Files:**
- Modify: `/Users/keremyarar/remake/remake/ContentView.swift` (HomeView struct)

**Hedef:** HomeView'ı yeni editoryal kompozisyona getir: krem zemin + asimetrik grid + status bar altı 88pt nefes. Header (avatar + Merhaba/isim + bildirim zili) + editoryal hero (eyebrow + Cormorant başlık + caption + Başla CTA).

- [ ] **Step 1: Mevcut HomeView'da koru:**
  - `@EnvironmentObject var routeManager: AppRouteManager`
  - `@State` modal kontrolleri (ISEE, Belgelerim, Topluluk için fullScreenCover)
  - `routeManager.selectedTab` izleme + `.home` dışına geçince modal otomatik kapanma zinciri

- [ ] **Step 2: HomeView body'sini yeniden yaz, en üst seviyede:**

  ```swift
  ScrollView {
      VStack(alignment: .leading, spacing: 0) {
          headerSection
              .padding(.top, AppTheme.Metrics.statusBarBreathing)
              .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)

          heroSection
              .padding(.top, 14)
              .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)
              .padding(.bottom, 28)

          // Task 4-7'de eklenecek section'lar buraya
      }
  }
  .background(AppTheme.Colors.background.ignoresSafeArea())
  .refreshable { /* trigger refresh */ }
  ```

- [ ] **Step 3: headerSection ve heroSection computed property'lerini yaz:**

  ```swift
  private var headerSection: some View {
      HStack(spacing: 12) {
          Circle()
              .fill(AppTheme.Colors.elevated)
              .frame(width: 40, height: 40)
              .overlay(
                  Text(userInitial)
                      .font(.system(size: 18, weight: .semibold, design: .serif))
                      .foregroundStyle(AppTheme.Colors.headline)
              )
          VStack(alignment: .leading, spacing: 2) {
              Text("MERHABA").font(AppTheme.Typography.eyebrow)
                  .kerning(1.2).foregroundStyle(AppTheme.Colors.secondaryText)
              Text(userDisplayName)
                  .font(.system(size: 17, weight: .semibold))
                  .foregroundStyle(AppTheme.Colors.headline)
          }
          Spacer()
          Image(systemName: "bell")
              .font(.system(size: 18, weight: .regular))
              .foregroundStyle(AppTheme.Colors.secondaryText)
              .frame(width: 44, height: 44)
              .background(AppTheme.Colors.surface, in: Circle())
      }
      .accessibilityElement(children: .combine)
      .onTapGesture {
          // avatar tap → Profil sekmesi (mevcut sözleşme)
          routeManager.selectedTab = .profile
      }
  }

  private var heroSection: some View {
      VStack(alignment: .leading, spacing: 14) {
          HStack(spacing: 6) {
              Circle().fill(AppTheme.Colors.accent).frame(width: 5, height: 5)
              Text("BU HAFTA · \(currentDateLabel)")
                  .font(AppTheme.Typography.eyebrow).kerning(1.2)
                  .foregroundStyle(AppTheme.Colors.secondaryText)
          }
          Text(heroAttributedTitle) // "İtalya'da " + italic("eğitim") + " yolunda bir adım daha"
              .font(.system(size: 28, weight: .bold, design: .serif))
              .foregroundStyle(AppTheme.Colors.headline)
              .lineLimit(3).fixedSize(horizontal: false, vertical: true)
          Text("Profilini tamamla, sana özel öneri al.")
              .font(AppTheme.Typography.body)
              .foregroundStyle(AppTheme.Colors.secondaryText)
          Button {
              routeManager.selectedTab = .profile
          } label: {
              HStack(spacing: 4) {
                  Text("Başla")
                  Image(systemName: "arrow.right").font(.system(size: 12, weight: .semibold))
              }
              .font(.system(size: 13, weight: .semibold))
              .foregroundStyle(AppTheme.Colors.accent)
          }
          .buttonStyle(.plain)
      }
      .accessibilityAddTraits(.isHeader)
  }
  ```

  `heroAttributedTitle` için `AttributedString` ile italik kelime serpiştirilir (örnek):

  ```swift
  private var heroAttributedTitle: AttributedString {
      var s = AttributedString("İtalya'da ")
      var italic = AttributedString("eğitim")
      italic.font = .system(size: 28, weight: .bold, design: .serif).italic()
      italic.foregroundColor = AppTheme.Colors.accent
      s.append(italic)
      s.append(AttributedString(" yolunda bir adım daha"))
      return s
  }
  ```

  `currentDateLabel` Türkçe ay adıyla:

  ```swift
  private var currentDateLabel: String {
      let f = DateFormatter()
      f.locale = Locale(identifier: "tr_TR")
      f.dateFormat = "d MMMM"
      return f.string(from: Date()).uppercased(with: Locale(identifier: "tr_TR"))
  }
  ```

  `userInitial` ve `userDisplayName` Clerk session'dan veya placeholder ("K" / "Misafir"):

  ```swift
  @Environment(\.clerk) private var clerk
  private var userDisplayName: String { clerk.user?.firstName ?? "Misafir" }
  private var userInitial: String { String(userDisplayName.prefix(1)).uppercased() }
  ```

- [ ] **Step 4: Build verify**

  ```bash
  cd /Users/keremyarar/remake && xcodebuild ... build 2>&1 | tail -20
  ```

- [ ] **Step 5: Commit**

  ```bash
  git -C /Users/keremyarar/remake add -A
  git -C /Users/keremyarar/remake commit -m "feat(home): editoryal header + hero cover (Bölüm 4.1-4.2)"
  ```

---

## Task 4: HomeView — Hızlı Erişim 4 İkon Row

**Files:**
- Modify: `/Users/keremyarar/remake/remake/ContentView.swift` (HomeView)

**Hedef:** Hero'nun altına 4 ikon row: ISEE (modal) / Belgelerim (modal) / Topluluk (modal) / Mentör (tab).

- [ ] **Step 1: quickAccessSection computed property:**

  ```swift
  private var quickAccessSection: some View {
      HStack(spacing: 8) {
          quickItem(icon: "function", label: "ISEE") { showISEE = true }
          quickItem(icon: "doc.text", label: "BELGE") { showDocs = true }
          quickItem(icon: "person.3", label: "TOPLULUK") { showCommunity = true }
          quickItem(icon: "message", label: "MENTÖR") { routeManager.selectedTab = .mentor }
      }
      .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)
      .padding(.bottom, 28)
  }

  @ViewBuilder
  private func quickItem(icon: String, label: String, action: @escaping () -> Void) -> some View {
      Button(action: action) {
          VStack(spacing: 8) {
              Image(systemName: icon)
                  .font(.system(size: 18, weight: .regular))
                  .foregroundStyle(AppTheme.Colors.headline)
                  .frame(width: 46, height: 46)
                  .background(AppTheme.Colors.surface, in: RoundedRectangle(cornerRadius: 14))
                  .overlay(
                      RoundedRectangle(cornerRadius: 14)
                          .stroke(AppTheme.Colors.elevated, lineWidth: 0.5)
                  )
              Text(label).font(AppTheme.Typography.eyebrow).kerning(0.6)
                  .foregroundStyle(AppTheme.Colors.primaryText)
          }
          .frame(maxWidth: .infinity, minHeight: AppTheme.Metrics.minTapTarget)
      }
      .buttonStyle(.plain)
      .accessibilityLabel(label)
  }
  ```

  Mevcut `@State var showISEE: Bool`, `showDocs: Bool`, `showCommunity: Bool` flag'leri korunur. Mevcut `routeManager.selectedTab` izleyici otomatik kapama zinciri korunur.

- [ ] **Step 2: Body'de hero'dan sonra `quickAccessSection`'ı çağır.**

- [ ] **Step 3: Build verify + commit**

  ```bash
  git -C /Users/keremyarar/remake commit -m "feat(home): hızlı erişim 4 ikon row (Bölüm 4.3)"
  ```

---

## Task 5: HomeView — Popüler Üniversiteler Carousel

**Files:**
- Modify: `/Users/keremyarar/remake/remake/ContentView.swift` (HomeView)
- Reference: `/Users/keremyarar/remake/remake/SchoolsViewModel.swift` (mevcut popüler liste sağlayıcı)

**Hedef:** Section header (POPÜLER + "Bu hafta öne çıkanlar" + Tümü → Okullar tab) + 3-4 Hero kart yatay scroll. Tap → NavigationStack üzerinden `UniversityDetailView` push.

- [ ] **Step 1: ViewModel sağlayıcısını netle:**
  - `SchoolsViewModel`'da `popularUniversities: [University]` veya benzeri property varsa onu kullan.
  - Yoksa `homeViewModel` veya `SchoolsViewModel`'dan ilk 5 üniversiteyi öncele.

- [ ] **Step 2: popularSection computed property:**

  ```swift
  private var popularSection: some View {
      VStack(alignment: .leading, spacing: 14) {
          HStack(alignment: .bottom) {
              VStack(alignment: .leading, spacing: 4) {
                  HStack(spacing: 6) {
                      Circle().fill(AppTheme.Colors.accent).frame(width: 5, height: 5)
                      Text("POPÜLER").font(AppTheme.Typography.eyebrow).kerning(1.2)
                          .foregroundStyle(AppTheme.Colors.secondaryText)
                  }
                  popularTitle // "Bu hafta öne çıkanlar" italic vurgu
              }
              Spacer()
              Button {
                  routeManager.selectedTab = .schools
              } label: {
                  HStack(spacing: 3) {
                      Text("Tümü"); Image(systemName: "arrow.right").font(.system(size: 11, weight: .semibold))
                  }
                  .font(.system(size: 13, weight: .semibold))
                  .foregroundStyle(AppTheme.Colors.accent)
              }.buttonStyle(.plain)
          }
          .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)

          ScrollView(.horizontal, showsIndicators: false) {
              HStack(spacing: 12) {
                  ForEach(popularUniversities) { uni in
                      NavigationLink(value: uni) {
                          PopularHeroCard(university: uni)
                      }.buttonStyle(.plain)
                  }
              }
              .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)
          }
      }
      .padding(.bottom, 28)
      .navigationDestination(for: University.self) { uni in
          UniversityDetailView(university: uni)
      }
  }
  ```

  `popularTitle` AttributedString ile "Bu hafta " + italic("öne çıkanlar"):

  ```swift
  private var popularTitle: Text {
      Text("Bu hafta ").font(AppTheme.Typography.sectionTitle)
          .foregroundStyle(AppTheme.Colors.headline)
      + Text("öne çıkanlar").font(.system(size: 20, weight: .semibold, design: .serif).italic())
          .foregroundStyle(AppTheme.Colors.headline)
  }
  ```

- [ ] **Step 3: `PopularHeroCard` view'ı tanımla:**

  ```swift
  struct PopularHeroCard: View {
      let university: University
      var body: some View {
          VStack(alignment: .leading, spacing: 0) {
              ZStack(alignment: .topLeading) {
                  UniversityImageView(university: university)
                      .frame(width: 240, height: 165)
                      .clipped()
                      .clipShape(.rect(topLeadingRadius: AppTheme.Metrics.heroRadius,
                                        topTrailingRadius: AppTheme.Metrics.heroRadius))
                  LinearGradient(colors: [
                      Color.black.opacity(0.35), Color.clear
                  ], startPoint: .top, endPoint: .bottom)
                  .frame(height: 60)
                  .clipShape(.rect(topLeadingRadius: AppTheme.Metrics.heroRadius,
                                    topTrailingRadius: AppTheme.Metrics.heroRadius))
                  HStack(spacing: 6) {
                      Circle().fill(.white.opacity(0.8)).frame(width: 5, height: 5)
                      Text(university.city.uppercased())
                          .font(AppTheme.Typography.eyebrow).kerning(1.2)
                          .foregroundStyle(.white.opacity(0.92))
                  }
                  .padding(12)
              }
              VStack(alignment: .leading, spacing: 4) {
                  Text(university.name)
                      .font(.system(size: 17, weight: .semibold, design: .serif))
                      .foregroundStyle(AppTheme.Colors.headline)
                      .lineLimit(2)
                  Text("\(university.departmentCount) bölüm · \(university.categoryLabel)")
                      .font(AppTheme.Typography.caption)
                      .foregroundStyle(AppTheme.Colors.secondaryText)
              }
              .padding(12)
          }
          .frame(width: 240)
          .background(AppTheme.Colors.surface)
          .clipShape(RoundedRectangle(cornerRadius: AppTheme.Metrics.heroRadius))
          .overlay(
              RoundedRectangle(cornerRadius: AppTheme.Metrics.heroRadius)
                  .stroke(AppTheme.Colors.elevated, lineWidth: 0.5)
          )
      }
  }
  ```

- [ ] **Step 4: University Hashable conformance varsa kullan, yoksa ekle (NavigationLink value için):**

  ```swift
  extension University: Hashable {
      static func == (lhs: University, rhs: University) -> Bool { lhs.id == rhs.id }
      func hash(into hasher: inout Hasher) { hasher.combine(id) }
  }
  ```

  Eğer zaten varsa atla.

- [ ] **Step 5: Build verify + commit**

  ```bash
  git -C /Users/keremyarar/remake commit -m "feat(home): popüler üniversiteler editoryal carousel (Bölüm 4.4)"
  ```

---

## Task 6: HomeView — Mentör + Burs CTA Kartları + Önerilen Liste

**Files:**
- Modify: `/Users/keremyarar/remake/remake/ContentView.swift` (HomeView)

**Hedef:** Mentör geniş kartı (Türkçe sor, yanıt al → Mentör tab) + Burs geniş kartı (Bölgene göre bursunu bul → Burs tab) + Önerilen üniversiteler dikey liste (3-5 liste kartı, tap → UniversityDetailView push).

- [ ] **Step 1: mentorCard ve scholarshipsCard computed property'leri:**

  ```swift
  private var mentorCard: some View {
      Button {
          routeManager.selectedTab = .mentor
      } label: {
          HStack {
              VStack(alignment: .leading, spacing: 6) {
                  HStack(spacing: 6) {
                      Circle().fill(AppTheme.Colors.secondary).frame(width: 5, height: 5)
                      Text("MENTÖR").font(AppTheme.Typography.eyebrow).kerning(1.2)
                          .foregroundStyle(AppTheme.Colors.secondary)
                  }
                  (Text("Türkçe sor, ") + Text("yanıt al")
                      .font(.system(size: 18, weight: .semibold, design: .serif).italic())
                      .foregroundStyle(AppTheme.Colors.accent))
                      .font(.system(size: 18, weight: .semibold, design: .serif))
                      .foregroundStyle(AppTheme.Colors.headline)
                  Text("Senin için Gemini")
                      .font(AppTheme.Typography.caption)
                      .foregroundStyle(AppTheme.Colors.secondaryText)
              }
              Spacer()
              Text("?")
                  .font(.system(size: 44, weight: .semibold, design: .serif).italic())
                  .foregroundStyle(AppTheme.Colors.secondary.opacity(0.85))
          }
          .padding(16)
          .background(AppTheme.Colors.surface, in: RoundedRectangle(cornerRadius: AppTheme.Metrics.cardRadius))
          .overlay(
              RoundedRectangle(cornerRadius: AppTheme.Metrics.cardRadius)
                  .stroke(AppTheme.Colors.elevated, lineWidth: 0.5)
          )
      }
      .buttonStyle(.plain)
      .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)
      .padding(.bottom, 16)
  }

  private var scholarshipsCard: some View {
      Button {
          routeManager.selectedTab = .scholarships
      } label: {
          HStack {
              VStack(alignment: .leading, spacing: 6) {
                  HStack(spacing: 6) {
                      Circle().fill(AppTheme.Colors.accent).frame(width: 5, height: 5)
                      Text("BURS").font(AppTheme.Typography.eyebrow).kerning(1.2)
                          .foregroundStyle(AppTheme.Colors.secondaryText)
                  }
                  (Text("Bölgene göre ") + Text("bursunu bul")
                      .font(.system(size: 18, weight: .semibold, design: .serif).italic())
                      .foregroundStyle(AppTheme.Colors.accent))
                      .font(.system(size: 18, weight: .semibold, design: .serif))
                      .foregroundStyle(AppTheme.Colors.headline)
                  Text("20 İtalyan bölgesi")
                      .font(AppTheme.Typography.caption)
                      .foregroundStyle(AppTheme.Colors.secondaryText)
              }
              Spacer()
              Image(systemName: "map")
                  .font(.system(size: 22, weight: .light))
                  .foregroundStyle(AppTheme.Colors.headline.opacity(0.4))
          }
          .padding(16)
          .background(AppTheme.Colors.surface, in: RoundedRectangle(cornerRadius: AppTheme.Metrics.cardRadius))
          .overlay(
              RoundedRectangle(cornerRadius: AppTheme.Metrics.cardRadius)
                  .stroke(AppTheme.Colors.elevated, lineWidth: 0.5)
          )
      }
      .buttonStyle(.plain)
      .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)
      .padding(.bottom, 28)
  }
  ```

- [ ] **Step 2: recommendedSection computed property:**

  ```swift
  private var recommendedSection: some View {
      VStack(alignment: .leading, spacing: 14) {
          VStack(alignment: .leading, spacing: 4) {
              HStack(spacing: 6) {
                  Circle().fill(AppTheme.Colors.secondary).frame(width: 5, height: 5)
                  Text("SENİN İÇİN").font(AppTheme.Typography.eyebrow).kerning(1.2)
                      .foregroundStyle(AppTheme.Colors.secondaryText)
              }
              (Text("Önerilen ").font(.system(size: 20, weight: .semibold, design: .serif).italic())
                  + Text("üniversiteler").font(AppTheme.Typography.sectionTitle))
                  .foregroundStyle(AppTheme.Colors.headline)
          }
          .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)

          LazyVStack(spacing: 10) {
              ForEach(recommendedUniversities) { uni in
                  NavigationLink(value: uni) {
                      EditorialListCard(university: uni)
                  }.buttonStyle(.plain)
              }
          }
          .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)

          NavigationLink(value: "all") {
              HStack(spacing: 4) {
                  Text("Daha fazla öneri"); Image(systemName: "arrow.right")
              }
              .font(.system(size: 13, weight: .semibold))
              .foregroundStyle(AppTheme.Colors.accent)
              .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)
              .padding(.top, 12)
          }
      }
      .padding(.bottom, 80) // tab bar boşluğu
  }
  ```

- [ ] **Step 3: `EditorialListCard` View'ı tanımla (UniversityImageView 60x60 + isim + meta + heart + count):**

  ```swift
  struct EditorialListCard: View {
      let university: University
      var body: some View {
          HStack(spacing: 12) {
              UniversityImageView(university: university)
                  .frame(width: 60, height: 60)
                  .clipShape(RoundedRectangle(cornerRadius: AppTheme.Metrics.imageRadius))
              VStack(alignment: .leading, spacing: 4) {
                  Text(university.name)
                      .font(.system(size: 14, weight: .semibold))
                      .foregroundStyle(AppTheme.Colors.headline)
                      .lineLimit(2)
                  Text("\(university.city) · \(university.categoryLabel) · \(university.foundationYear)")
                      .font(AppTheme.Typography.caption)
                      .foregroundStyle(AppTheme.Colors.secondaryText)
              }
              Spacer()
              Image(systemName: "heart")
                  .font(.system(size: 16))
                  .foregroundStyle(AppTheme.Colors.elevated)
          }
          .padding(12)
          .background(AppTheme.Colors.surface, in: RoundedRectangle(cornerRadius: AppTheme.Metrics.cardRadius))
          .overlay(
              RoundedRectangle(cornerRadius: AppTheme.Metrics.cardRadius)
                  .stroke(AppTheme.Colors.elevated, lineWidth: 0.5)
          )
      }
  }
  ```

  Not: `university.foundationYear`, `university.categoryLabel`, `university.city` mevcut model'de bulunur — yoksa `University` extension'ı ile alanlardan türetilir (mevcut UniversityModel.swift'i incele).

- [ ] **Step 4: Body'de sırayı tamamla:**

  ```swift
  VStack(...) {
      headerSection.padding(...)
      heroSection.padding(...)
      quickAccessSection
      popularSection
      mentorCard
      scholarshipsCard
      recommendedSection
  }
  ```

- [ ] **Step 5: Build verify + commit**

  ```bash
  git -C /Users/keremyarar/remake commit -m "feat(home): Mentör + Burs CTA + Önerilen liste (Bölüm 4.5-4.7)"
  ```

---

## Task 7: SchoolsView — Editoryal Header + Search + Chips + Liste

**Files:**
- Modify: `/Users/keremyarar/remake/remake/SchoolsView.swift`

**Hedef:** Mevcut SchoolsView yapısını koru (ViewModel, filter, favorites, NavigationStack) ama görsel dili tamamen editoryal token'lara taşı.

- [ ] **Step 1: pageTitle "Okullar" Cormorant 28pt:**

  ```swift
  Text("Okullar")
      .font(AppTheme.Typography.pageTitle)
      .foregroundStyle(AppTheme.Colors.headline)
  ```

  Sağda filtre butonu (44pt tap target, surface circle + headline ikon).

- [ ] **Step 2: Search bar:**
  - Arka plan `AppTheme.Colors.surface`
  - 1pt iç-kontur `AppTheme.Colors.elevated`
  - Placeholder italik New York 14pt "üniversite veya şehir ara"
  - Focus state: 1.5pt accent border

  ```swift
  HStack(spacing: 9) {
      Image(systemName: "magnifyingglass").foregroundStyle(AppTheme.Colors.secondaryText)
      TextField("", text: $searchText, prompt: Text("üniversite veya şehir ara")
          .font(.system(size: 14, design: .serif).italic())
          .foregroundColor(AppTheme.Colors.secondaryText))
          .foregroundStyle(AppTheme.Colors.headline)
          .font(.system(size: 14))
  }
  .padding(.horizontal, 14).padding(.vertical, 11)
  .background(AppTheme.Colors.surface, in: RoundedRectangle(cornerRadius: 14))
  .overlay(
      RoundedRectangle(cornerRadius: 14)
          .stroke(searchFocused ? AppTheme.Colors.accent : AppTheme.Colors.elevated,
                  lineWidth: searchFocused ? 1.5 : 0.5)
  )
  ```

- [ ] **Step 3: Kategori chip'leri (mevcut `selectedCategory` state korunur):**

  ```swift
  ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 7) {
          ForEach(categories, id: \.self) { cat in
              Button { selectedCategory = cat } label: {
                  Text(cat.label)
                      .font(.system(size: 11, weight: cat == selectedCategory ? .semibold : .medium))
                      .foregroundStyle(cat == selectedCategory ? AppTheme.Colors.accent : AppTheme.Colors.headline)
                      .padding(.horizontal, 13).padding(.vertical, 8)
                      .background(
                          cat == selectedCategory ? AppTheme.Colors.accentSoft : AppTheme.Colors.elevated,
                          in: Capsule()
                      )
              }.buttonStyle(.plain)
          }
      }
      .padding(.horizontal, AppTheme.Metrics.pageHorizontalPadding)
  }
  ```

- [ ] **Step 4: Liste kartları — mevcut RecommendedCard'ı `EditorialListCard` ile değiştir (Task 6'da tanımlı) veya schools dosyasına yeni varyant ekle (favori toggle ile).**

- [ ] **Step 5: Empty state ve hata mesajları:**
  - Empty: krem zemin + Cormorant italik "Aradığın sonuç yok" + "Filtreyi sıfırla" link
  - LocalizedError mesajları: AppTheme.Colors.error metin, ham enum string YOK

- [ ] **Step 6: Build verify + commit**

  ```bash
  git -C /Users/keremyarar/remake commit -m "feat(schools): editorial header + search + chips + liste"
  ```

---

## Task 8: SchoolsView — Filtre Alt Sheet

**Files:**
- Modify: `/Users/keremyarar/remake/remake/SchoolsView.swift`

**Hedef:** Filtre ikonu tap → `presentationDetents([.medium])` alt sheet açılır. Kategori chip'leri + sıralama (alfabetik / şehir / bölüm sayısı) + şehir filtresi + "Uygula" accent CTA.

- [ ] **Step 1: `@State var showFilterSheet = false` ekle, filtre ikonu tap action'a bağla.**

- [ ] **Step 2: Sheet content:**

  ```swift
  .sheet(isPresented: $showFilterSheet) {
      FilterSheet(...)
          .presentationDetents([.medium])
          .presentationDragIndicator(.visible)
          .presentationBackground(AppTheme.Colors.background)
  }
  ```

- [ ] **Step 3: `FilterSheet` view'ı:**
  - Cormorant 20pt italik "Filtrele" başlık
  - Kategori chip'leri (mevcut chip stili)
  - Sıralama segmented control veya pill row
  - "Uygula" terra-cotta full width CTA

- [ ] **Step 4: Build verify + commit**

  ```bash
  git -C /Users/keremyarar/remake commit -m "feat(schools): filtre alt sheet"
  ```

---

## Task 9: UniversityDetailView — Editorial Hero + Section'lar + Sticky Bottom

**Files:**
- Modify: `/Users/keremyarar/remake/remake/UniversityDetailView.swift`

**Hedef:** Mevcut Hakkında / Tarihçe / Bölümler / Detaylar section yapısı korunur (history null gizli, level bazlı bölüm grupları, "Başvuru detayı: X/Y" özeti, "Detayları gör →" / "Detay yakında" mevcut sözleşmesi). Görsel dil editoryal token'lara taşınır. Sticky bottom overflow sertleştirmeleri (lineLimit + minimumScaleFactor + fixedSize + layoutPriority) **kesinlikle korunur**.

- [ ] **Step 1: Hero photo (320pt full-bleed, alttan koyu gradient, sol back + sağ favori blur circle):**

  ```swift
  ZStack(alignment: .topLeading) {
      UniversityImageView(university: university)
          .frame(height: 320)
          .clipped()
          .ignoresSafeArea(edges: .top)
      LinearGradient(colors: [
          Color.black.opacity(0.4), Color.clear, Color.clear,
          Color.black.opacity(0.45)
      ], startPoint: .top, endPoint: .bottom)
      .frame(height: 320)
      .ignoresSafeArea(edges: .top)

      // Sol back + sağ favori
      HStack {
          backButton; Spacer(); favoriteButton
      }
      .padding(.horizontal, 16)
      .padding(.top, 8)

      // Alt sol eyebrow + serif başlık
      VStack(alignment: .leading, spacing: 6) {
          Spacer()
          HStack(spacing: 6) {
              Circle().fill(.white.opacity(0.8)).frame(width: 5, height: 5)
              Text("\(university.city.uppercased()) · \(university.categoryLabel.uppercased())")
                  .font(AppTheme.Typography.eyebrow).kerning(1.2)
                  .foregroundStyle(.white.opacity(0.92))
          }
          Text(university.nameAttributedItalic) // soy ad italic
              .font(.system(size: 28, weight: .bold, design: .serif))
              .foregroundStyle(.white)
              .lineLimit(2).fixedSize(horizontal: false, vertical: true)
      }
      .padding(.horizontal, 18)
      .padding(.bottom, 14)
  }
  .frame(height: 320)
  ```

- [ ] **Step 2: Section'lar — her birinde "eyebrow + serif header" pattern:**

  - **Hakkında** (mevcut 4 satır collapse + "Devamını oku" — koru):

    ```swift
    SectionContainer {
        eyebrow("HAKKINDA", color: AppTheme.Colors.secondary)
        Text("Şu üniversite hakkında...").font(...)
        Text(university.description)
            .font(AppTheme.Typography.bodyLg)
            .lineLimit(isAboutExpanded ? nil : 4)
        Button("Devamını oku") { isAboutExpanded.toggle() }
    }
    ```

  - **Tarihçe** (mevcut history null gizli sözleşmesi korunur):

    ```swift
    if let history = university.history, !history.isEmpty {
        SectionContainer { ... }
    }
    ```

  - **Bölümler** (mevcut level bazlı grup + admission detail özeti korunur):

    ```swift
    ForEach(levelGroups) { group in
        SectionContainer {
            HStack {
                VStack(alignment: .leading) {
                    eyebrow("BÖLÜMLER", color: AppTheme.Colors.secondary)
                    Text(group.title).font(AppTheme.Typography.sectionTitle)
                }
                Spacer()
                Text("Başvuru detayı: \(detailedCount)/\(group.count)")
                    .font(AppTheme.Typography.caption)
                    .foregroundStyle(AppTheme.Colors.secondaryText)
            }
            ForEach(group.programs) { p in
                NavigationLink(value: p) {
                    ProgramRow(program: p, hasDetail: p.hasAdmissionDetail)
                }
            }
        }
    }
    ```

  - **Detaylar** (mevcut "Web" kompakt accent kapsül + `.layoutPriority(1)` korunur):

    ```swift
    HStack {
        Text(university.name).fixedSize(horizontal: false, vertical: true)
        Spacer()
        Link("Web", destination: webURL)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(AppTheme.Colors.accent)
            .padding(.horizontal, 10).padding(.vertical, 6)
            .background(AppTheme.Colors.accentSoft, in: Capsule())
            .layoutPriority(1)
    }
    ```

- [ ] **Step 3: Sticky bottom — sertleştirmeler korunur:**

  ```swift
  HStack(spacing: 12) {
      VStack(alignment: .leading, spacing: 2) {
          Text("YILLIK HARÇ").font(AppTheme.Typography.eyebrow).kerning(1)
              .foregroundStyle(AppTheme.Colors.secondaryText)
          Text(feeRangeLabel)
              .font(.system(size: 15, weight: .semibold, design: .serif))
              .foregroundStyle(AppTheme.Colors.headline)
              .lineLimit(1).minimumScaleFactor(0.7)
      }
      Spacer()
      Button { showISEE = true } label: {
          HStack(spacing: 5) {
              Text("ISEE Hesapla"); Image(systemName: "arrow.right").font(.system(size: 13, weight: .semibold))
          }
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(AppTheme.Colors.background)
          .padding(.horizontal, 16).padding(.vertical, 10)
          .background(AppTheme.Colors.accent, in: RoundedRectangle(cornerRadius: 11))
      }
      .buttonStyle(.plain)
      .fixedSize(horizontal: true, vertical: false)
      .layoutPriority(1)
  }
  .padding(.horizontal, 16).padding(.vertical, 11)
  .background(.ultraThinMaterial)
  .overlay(Rectangle().fill(AppTheme.Colors.elevated).frame(height: 0.5), alignment: .top)
  ```

- [ ] **Step 4: Build verify + commit**

  ```bash
  git -C /Users/keremyarar/remake commit -m "feat(uni-detail): editorial hero + section'lar + sticky bottom (sertleştirmeler korundu)"
  ```

---

## Task 10: ProgramAdmissionDetailView — Editorial Visual Rewrite

**Files:**
- Modify: `/Users/keremyarar/remake/remake/ProgramAdmissionDetailView.swift`

**Hedef:** Mevcut tüm alan sözleşmesi korunur (başvuru tipi, akademik şartlar, dil şartları, EU/non-EU deadline, belgeler, sınav, resmi linkler, source_quotes, uncertain alanlar, "Kontrol önerilir" rozeti, openURL). Görsel: editoryal eyebrow + serif başlık + section ayraçları + uncertain alanlarda `warning` rozet.

- [ ] **Step 1: Header:**

  ```swift
  VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 6) {
          Circle().fill(AppTheme.Colors.accent).frame(width: 5, height: 5)
          Text("BAŞVURU DETAYI").font(AppTheme.Typography.eyebrow).kerning(1.2)
              .foregroundStyle(AppTheme.Colors.secondaryText)
      }
      (Text("\(universityShortName) — ").font(.system(size: 22, weight: .semibold, design: .serif).italic())
          + Text(programName).font(AppTheme.Typography.heroTitle))
          .foregroundStyle(AppTheme.Colors.headline)
  }
  ```

- [ ] **Step 2: Section pattern (her bilgi grubu için):**

  ```swift
  SectionContainer {
      eyebrow("AKADEMİK ŞARTLAR", color: AppTheme.Colors.secondary)
      if detail.academicRequirementUncertain {
          UncertainBadge()  // "Kontrol önerilir" warning rozet
      }
      Text(detail.academicRequirements ?? "Belirtilmemiş")
          .font(AppTheme.Typography.bodyLg)
          .foregroundStyle(detail.academicRequirements == nil ? AppTheme.Colors.secondaryText : AppTheme.Colors.primaryText)
  }
  ```

- [ ] **Step 3: `UncertainBadge`:**

  ```swift
  struct UncertainBadge: View {
      var body: some View {
          HStack(spacing: 5) {
              Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 10))
              Text("Kontrol önerilir").font(.system(size: 10.5, weight: .semibold))
          }
          .foregroundStyle(AppTheme.Colors.warningStrong)
          .padding(.horizontal, 8).padding(.vertical, 4)
          .background(AppTheme.Colors.warning.opacity(0.16), in: Capsule())
      }
  }
  ```

- [ ] **Step 4: Resmi link bölümleri (`openURL` mevcut akış):**

  ```swift
  if let url = detail.officialProgramURL {
      Link(destination: url) {
          HStack {
              Text("Resmi program sayfası").foregroundStyle(AppTheme.Colors.headline)
              Spacer()
              Image(systemName: "arrow.up.right.square").foregroundStyle(AppTheme.Colors.accent)
          }
          .padding(.vertical, 10)
      }
  }
  ```

- [ ] **Step 5: Build verify + commit**

  ```bash
  git -C /Users/keremyarar/remake commit -m "feat(program-detail): editorial visual rewrite (alan sözleşmesi korundu)"
  ```

---

## Task 11: Launch Screen — Krem Zemin + Wordmark

**Files:**
- Modify: `/Users/keremyarar/remake/remake/Assets.xcassets/LaunchBackground.colorset/Contents.json`
- Create/Modify: `/Users/keremyarar/remake/imports/launch_wordmark.pdf`
- Modify: `/Users/keremyarar/remake/remake/Assets.xcassets/LaunchWordmark.imageset/launch_wordmark.pdf`

**Hedef:** Launch screen zemini krem (#FAF7F2), wordmark navy (#1A2238) italik serif. pbxproj `INFOPLIST_KEY_UILaunchScreen_Generation = NO` sözleşmesi korunur (değiştirme).

- [ ] **Step 1: pbxproj sözleşmesini doğrula:**

  ```bash
  grep -c "INFOPLIST_KEY_UILaunchScreen_Generation = NO" /Users/keremyarar/remake/remake.xcodeproj/project.pbxproj
  ```

  Beklenen: ≥ 2 (her iki SDK için).

- [ ] **Step 2: LaunchBackground.colorset Contents.json'u krem'e güncelle:**

  ```json
  {
    "colors": [
      {
        "color": {
          "color-space": "srgb",
          "components": { "alpha": "1.000", "blue": "0xF2", "green": "0xF7", "red": "0xFA" }
        },
        "idiom": "universal"
      }
    ],
    "info": { "author": "xcode", "version": 1 }
  }
  ```

- [ ] **Step 3: Yeni launch wordmark PDF üret:**

  Swift script `tools/generate_launch_wordmark.swift` (geçici, repoda kalıcı tutulmaz):

  ```swift
  import AppKit
  import CoreGraphics

  let pageWidth: CGFloat = 800
  let pageHeight: CGFloat = 200
  let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)

  let url = URL(fileURLWithPath: "/Users/keremyarar/remake/imports/launch_wordmark.pdf")
  guard let ctx = CGContext(url as CFURL, mediaBox: nil, nil) else { exit(1) }
  ctx.beginPDFPage(nil)
  ctx.translateBy(x: 0, y: pageHeight); ctx.scaleBy(x: 1, y: -1)

  let attrs: [NSAttributedString.Key: Any] = [
      .font: NSFont(name: "New York Bold Italic", size: 96) ?? NSFont.systemFont(ofSize: 96, weight: .bold),
      .foregroundColor: NSColor(red: 0x1A/255, green: 0x22/255, blue: 0x38/255, alpha: 1)
  ]
  let text = NSAttributedString(string: "ItalyPath", attributes: attrs)
  let line = CTLineCreateWithAttributedString(text)
  let lineBounds = CTLineGetBoundsWithOptions(line, .useOpticalBounds)
  let x = (pageWidth - lineBounds.width) / 2
  let y = (pageHeight - lineBounds.height) / 2 - lineBounds.origin.y
  ctx.textPosition = CGPoint(x: x, y: y)
  CTLineDraw(line, ctx)

  ctx.endPDFPage()
  ctx.closePDF()
  print("✅ launch_wordmark.pdf written")
  ```

  Çalıştır:

  ```bash
  cd /Users/keremyarar/remake && swift tools/generate_launch_wordmark.swift
  ```

  PDF üretildikten sonra Asset Catalog'a kopyala:

  ```bash
  cp /Users/keremyarar/remake/imports/launch_wordmark.pdf \
     /Users/keremyarar/remake/remake/Assets.xcassets/LaunchWordmark.imageset/launch_wordmark.pdf
  ```

  Geçici script'i sil:

  ```bash
  rm /Users/keremyarar/remake/tools/generate_launch_wordmark.swift
  ```

- [ ] **Step 4: Build verify ve PlistBuddy ile UILaunchScreen dolu mu kontrol et:**

  ```bash
  cd /Users/keremyarar/remake && xcodebuild -project remake.xcodeproj -scheme remake \
    -destination 'platform=iOS Simulator,name=iPhone 16e' build 2>&1 | tail -10

  BUILT=$(xcodebuild -project remake.xcodeproj -scheme remake \
    -destination 'platform=iOS Simulator,name=iPhone 16e' \
    -showBuildSettings 2>/dev/null | grep BUILT_PRODUCTS_DIR | awk '{print $3}')
  /usr/libexec/PlistBuddy -c "Print :UILaunchScreen" "$BUILT/remake.app/Info.plist"
  ```

  Beklenen: dict dolu, `UIColorName = LaunchBackground`, `UIImageName = LaunchWordmark`, `UIImageRespectsSafeAreaInsets = false`.

- [ ] **Step 5: Commit**

  ```bash
  git -C /Users/keremyarar/remake commit -m "feat(launch): krem zemin + navy italic wordmark (pbxproj sözleşmesi korundu)"
  ```

---

## Task 12: App Icon — Krem Zemin + Navy Wordmark

**Files:**
- Create/Modify: `/Users/keremyarar/remake/imports/app_icon_1024.png`
- Modify: `/Users/keremyarar/remake/remake/Assets.xcassets/AppIcon.appiconset/AppIcon.png`

**Hedef:** 1024x1024 opaque krem (#FAF7F2) zemin + ortalı navy (#1A2238) italic serif "ItalyPath" wordmark.

- [ ] **Step 1: Geçici Swift script `tools/generate_app_icon.swift`:**

  ```swift
  import AppKit
  import CoreGraphics

  let size: CGFloat = 1024
  let url = URL(fileURLWithPath: "/Users/keremyarar/remake/imports/app_icon_1024.png")
  let img = NSImage(size: NSSize(width: size, height: size))
  img.lockFocus()

  NSColor(red: 0xFA/255, green: 0xF7/255, blue: 0xF2/255, alpha: 1).setFill()
  NSRect(x: 0, y: 0, width: size, height: size).fill()

  let attrs: [NSAttributedString.Key: Any] = [
      .font: NSFont(name: "New York Bold Italic", size: 200) ?? NSFont.systemFont(ofSize: 200, weight: .bold),
      .foregroundColor: NSColor(red: 0x1A/255, green: 0x22/255, blue: 0x38/255, alpha: 1)
  ]
  let text = NSAttributedString(string: "ItalyPath", attributes: attrs)
  let textSize = text.size()
  let textRect = NSRect(x: (size - textSize.width)/2, y: (size - textSize.height)/2,
                        width: textSize.width, height: textSize.height)
  text.draw(in: textRect)
  img.unlockFocus()

  let rep = img.representations.first as? NSBitmapImageRep ?? NSBitmapImageRep(data: img.tiffRepresentation!)!
  let png = rep.representation(using: .png, properties: [:])!
  try png.write(to: url)
  print("✅ app_icon_1024.png written")
  ```

  Çalıştır + Asset Catalog'a kopyala + script sil:

  ```bash
  cd /Users/keremyarar/remake && swift tools/generate_app_icon.swift
  cp /Users/keremyarar/remake/imports/app_icon_1024.png \
     /Users/keremyarar/remake/remake/Assets.xcassets/AppIcon.appiconset/AppIcon.png
  rm /Users/keremyarar/remake/tools/generate_app_icon.swift
  ```

- [ ] **Step 2: Build verify + commit**

  ```bash
  cd /Users/keremyarar/remake && xcodebuild ... build 2>&1 | tail -10
  git -C /Users/keremyarar/remake commit -m "feat(icon): krem zemin + navy italic wordmark app icon"
  ```

---

## Task 13: Full Build + Manual Smoke Test (iPhone 16e Simulator)

- [ ] **Step 1: Clean build:**

  ```bash
  cd /Users/keremyarar/remake && xcodebuild -project remake.xcodeproj -scheme remake \
    -destination 'platform=iOS Simulator,name=iPhone 16e' clean build 2>&1 | tail -40
  ```

  Beklenen: **0 warning / 0 error**.

- [ ] **Step 2: Launch screen Info.plist doğrulaması:**

  ```bash
  BUILT=$(xcodebuild -project remake.xcodeproj -scheme remake \
    -destination 'platform=iOS Simulator,name=iPhone 16e' \
    -showBuildSettings 2>/dev/null | grep BUILT_PRODUCTS_DIR | awk '{print $3}')
  /usr/libexec/PlistBuddy -c "Print :UILaunchScreen" "$BUILT/remake.app/Info.plist"
  ```

  Beklenen: dict dolu (`UIColorName`, `UIImageName`, `UIImageRespectsSafeAreaInsets`).

- [ ] **Step 3: Manuel smoke rotası:**
  1. App launch → launch screen krem zemin + ItalyPath italik navy wordmark görünür
  2. Home → header + hero editoryal + 4 ikon row + popüler carousel + mentor card + burs card + önerilen liste
  3. Hızlı erişim ISEE → fullScreenCover açılır
  4. ISEE içinde tab Okullar'a geç → modal otomatik kapanır (mevcut sözleşme)
  5. Tab Okullar → liste editoryal + chip + arama + filtre sheet
  6. Bir okul aç → editoryal hero + section'lar + sticky bottom CTA çalışır
  7. Bölüm satırı → program admission detail editoryal görünür, "Kontrol önerilir" rozeti var
  8. Tab Mentör → mevcut dark tema gelir (faz 2 öncesi beklenen)
  9. Deeplink: `xcrun simctl openurl booted "remake://scholarships?region=toscana"` → Burs sekmesi + Toscana seçili
  10. Profil → sign-out → favori kalp tap → Profil'e yönlendirme

- [ ] **Step 4: Bulgu varsa düzelt → yeniden build → smoke tekrar.**

- [ ] **Step 5: Commit (varsa)**

---

## Task 14: Context.md Güncelle + Final Commit

**Files:**
- Modify: `/Users/keremyarar/remake/ItalyPath_iOS_SwiftUI_Context.md`

**Hedef:** Bölüm 3 "AppTheme v3 — Editorial", Bölüm 4 file map'te değişen dosyalar, Bölüm 5 modül durumu (Home + Okullar editoryal pilot), Bölüm 8 roadmap'e pilot işareti.

- [ ] **Step 1: Context md'de:**
  - Bölüm 3 başlığını "AppTheme v3 — Editorial" yap, palet/tipografi tablolarını güncelle (krem/navy/terra-cotta, New York + SF Pro).
  - Bölüm 5 "Ana Navigasyon" altına "Home NavigationStack eklendi" notunu ekle.
  - Bölüm 8 Kısa Vade'ye: `[x] Home + Okullar Modern Editorial pilot (faz 1)` ekle.
  - Bölüm 9 Handoff Checklist'e: "Pilot light, kalan 6 ekran (Mentör/Burs/Profil/ISEE/Belgelerim/Topluluk) hâlâ dark; geçici tema atlaması beklenir, faz 2 ayrı plan ile uygulanacak" notunu ekle.

- [ ] **Step 2: Son commit:**

  ```bash
  git -C /Users/keremyarar/remake add ItalyPath_iOS_SwiftUI_Context.md
  git -C /Users/keremyarar/remake commit -m "$(cat <<'EOF'
  docs: AGENT_CONTEXT — AppTheme v3 + Home/Okullar editoryal pilot

  - Bölüm 3 AppTheme v3 — Editorial palet/tipografi
  - Bölüm 5 Home NavigationStack notu
  - Bölüm 8 pilot işareti
  - Bölüm 9 faz 2 dark→cream geçiş notu

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Mevcut Sözleşmeler — Hatırlatma (Spec Bölüm 8)

İmplementasyon sırasında **kesinlikle değiştirilmez:**

1. Deeplink `remake://scholarships?region=<slug>` (Burs faz 2'de aynı)
2. Favorites: `user_id = Clerk user.id`, `university_id = String(university.id)` + SwiftData local cache + pending sync + signed-out Profil yönlendirme
3. Burs offline fallback akışı
4. Clerk tek auth kaynağı, `CLERK_SECRET_KEY` iOS'a girmez
5. `INFOPLIST_KEY_UILaunchScreen_Generation = NO` pbxproj her iki SDK için
6. Universities tablosuna additive kolon (Pilot'ta DB değişikliği yok)
7. `program_admission_details` read-only
8. Home `routeManager.selectedTab` izleme + `.home` dışına geçince fullScreenCover otomatik kapanma + yeni NavigationStack bu zinciri etkilemez (spec Bölüm 8.8)
9. UniversityDetailView sticky bottom + Info section sertleştirmeleri (lineLimit / minimumScaleFactor / fixedSize / layoutPriority / compact "Web" kapsül)

---

## Faz 2 (Ayrı Plan)

Bu pilot bitince Mentör → Profil → Burs → ISEE → Belgelerim → Topluluk sırasıyla aynı AppTheme v3 token sistemine kalibre edilir. Ayrı spec + ayrı plan yazılır.
