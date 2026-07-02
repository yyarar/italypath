# Hub Remake + Onboarding Sihirbazı — Tasarım Belgesi

Tarih: 2026-07-02
Durum: Kerem ile brainstorming oturumunda onaylandı (tek sapma: "Tümünü gör" davranışı, bkz. §4.3)
Uygulayıcı: Codex (bu belge + uygulama planı prompt paketi olarak verilecek)

---

## 1. Problem ve Amaç

Kullanıcı giriş/kayıt sonrası `/hub`'a düşüyor. Mevcut Hub pasif bir "dosya kapağı":
sayaçları yansıtıyor (favori 3/12, belge 2/8), elle tıklanan 5 aşamalı şerit hiçbir şeyi
etkilemiyor, statik burs/topluluk notları var. Yeni kullanıcı boş sayaçlarla karşılaşıyor
ve "şimdi ne yapacağım?" sorusunun cevabı yok. Onboarding hiç yok; kullanıcı hakkında
hiçbir şey öğrenmiyoruz.

Hedef:

1. Kayıt sonrası 4 soruluk, atlanabilir bir onboarding sihirbazı (`/hosgeldin`) ile
   kullanıcı profili toplamak.
2. Hub'ı **akıllı öneri merkezine** dönüştürmek: profil, eldeki canlı program verisiyle
   (64 üniversite, ~1005 program) kural bazlı eşleştirilir; Hub kullanıcıya özel
   program, burs ve şehir önerileri gösterir.

## 2. Onaylanan Ürün Kararları

- Hub'ın ana işi: **akıllı öneri merkezi** (görev listesi / dashboard değil).
- Onboarding: **ayrı, tam sayfa, atlanabilir sihirbaz** (`/hosgeldin`), 4 adım, her adımda tek soru.
- Öneri motoru: **kural bazlı** (AI çağrısı yok; maliyetsiz, deterministik, anında).
- Eski Hub parçaları: öneriler başrol; favoriler + belgeler kompakt yardımcı rolde kalır;
  5 aşamalı şerit, statik burs/topluluk notları ve "3/12" sayaçları kaldırılır.
- Eğitim dili onboarding'de **sorulmaz** (Kerem kararı). Program satırlarında dil etiketi
  (EN/IT) görünmeye devam eder.
- Özellik tanıtımı ("ballandırarak" anlatım) bu projenin **kapsamı dışında**; ana sayfanın
  işi olarak ayrıca ele alınacak. Sihirbaza tanıtım turu ekranı eklenmez.

## 3. Onboarding Sihirbazı — `/hosgeldin`

### 3.1 Akış

- Kayıt tamamlanınca kullanıcı `/hosgeldin`'e yönlenir
  (`app/layout.tsx` → ClerkProvider `signUpFallbackRedirectUrl="/hosgeldin"`).
  `signInFallbackRedirectUrl="/hub"` değişmez.
- `?redirect_url=...` ile kayıt olan kullanıcı Clerk kuralı gereği o adrese gider,
  sihirbazı görmez; güvenlik ağı Hub'daki davet kartıdır (§4.6).
- OAuth ile ilk kez hesap yaratan kullanıcı da (sign-up akışı sayıldığı sürece)
  `/hosgeldin`'e düşer. Clerk Elements transfer akışında bu teknik olarak garanti
  edilemiyorsa zorlamayın; davet kartı yeterli güvenlik ağıdır.
- Sihirbaz korumalıdır: `proxy.ts` içindeki `PROTECTED_PAGE_ROUTES` listesine
  `"/hosgeldin"` eklenir (girişsiz gelen `/giris?redirect_url=%2Fhosgeldin`'e gider).
- Sağ üstte her adımda "Şimdilik geç" → `/hub`. Geçilen sorular boş kalır.
- Profili olan kullanıcı `/hosgeldin`'i tekrar açarsa cevapları önceden seçili görür
  (düzenleme modu — Hub'daki "Düzenle" linki buraya gelir). Ayrı bir düzenleme UI'ı yok.
- 4. adım bitince cevaplar kaydedilir, kısa bir "Dosyan hazırlanıyor" geçiş ekranı
  gösterilir (1-2 sn, editorial stil, spinner değil — serif metin + ince animasyon)
  ve `/hub`'a yönlenir.

### 3.2 Adımlar ve kesin seçenekler (TR metinler; EN karşılıkları paralel eklenecek)

Üstte ilerleme: "ADIM n / 4" (terracotta, uppercase, letterspaced) + 4 ince bar
(tamamlananlar sage dolu). Sorular serif başlık, seçenekler büyük dokunmatik kartlar
(keskin border, seçili durumda sage-soft zemin + sage border + check ikonu).

**Adım 1 — Seviye** ("Hangi seviyede okumak istiyorsun?"), tek seçim:

| UI etiketi | Kayıt değeri | Eşleşme |
| --- | --- | --- |
| Lisans | `bachelor` | level `bachelor` + `single-cycle` programlar |
| Yüksek lisans | `master` | level `master` programlar |

"Kararsızım" seçeneği YOK (Kerem kararı).

**Adım 2 — İlgi alanı** ("Hangi alan seni çekiyor?"), en fazla 2 seçim, 8 kategori:

| UI etiketi | Kayıt değeri |
| --- | --- |
| Mühendislik ve teknoloji | `engineering-tech` |
| Tıp ve sağlık | `medicine-health` |
| İşletme ve ekonomi | `business-economics` |
| Tasarım ve mimarlık | `design-architecture` |
| Fen bilimleri | `natural-sciences` |
| Sosyal ve beşeri bilimler | `social-humanities` |
| Sanat ve moda | `arts-fashion` |
| Hukuk ve siyaset | `law-politics` |

**Adım 3 — Bütçe** ("Eğitim bütçen için hangisi sana yakın?"), tek seçim
(etiketler Kerem'in ifadesiyle):

| UI etiketi | Kayıt değeri |
| --- | --- |
| Burssuz okuyamam | `scholarship-required` |
| Maddi destek iyi olur | `support-helpful` |
| Esneğim | `flexible` |

**Adım 4 — Şehir / yaşam** ("Nasıl bir şehirde yaşamak istersin?"), tek seçim:

| UI etiketi | Kayıt değeri |
| --- | --- |
| Olabildiğince büyük bir şehir | `big-city` |
| Çok büyük olmasın, öğrenci şehri olsun | `student-city` |
| Farketmez, program önemli | `any` |

### 3.3 Dosya yapısı

- `app/hosgeldin/page.tsx` — client page (SEO gereksiz, korumalı sayfa).
- `components/onboarding/` — `WizardShell.tsx` (paper zemin + wordmark + ilerleme +
  "Şimdilik geç"), `WizardStep.tsx` / soru bileşenleri, `WizardOptionCard.tsx`,
  `WizardFinale.tsx` ("Dosyan hazırlanıyor" geçişi).
- Metinler `lib/translations.ts` → `onboarding.*` namespace, TR/EN paralel.
- Tasarım dili: mevcut editorial sistem (paper/sage/terracotta, serif başlık, keskin
  border, `--editorial-*` CSS değişkenleri). Gradient/sparkle yok. Mobil öncelikli.

## 4. Yeni Hub — `/hub`

### 4.1 Sayfa iskeleti (profil TAMAMLANMIŞ kullanıcı)

Tek kolon, `max-w-3xl`, yukarıdan aşağıya:

1. **Üst şerit** — sol: "ÇALIŞMA DOSYAN" eyebrow; sağ: "Merhaba, {ad}".
2. **Profil şeridi** — sage-soft bant: cevapların özeti
   ("Yüksek lisans · Mühendislik ve teknoloji · Burssuz okuyamam · Öğrenci şehri";
   iki alan seçildiyse ikisi de gösterilir) + "Düzenle" linki → `/hosgeldin`.
3. **Öneri hero'su** — serif başlık: "Profiline uyan **{N} program** bulduk."
   (italik sage vurgusu) + tek satır lede (alan + seviye + şehir tercihine göre).
4. **SANA ÖZEL PROGRAMLAR** — en iyi eşleşen ilk 5 program satırı: serif program adı,
   altında üniversite · şehir; sağda seviye+dil etiketi (örn. "YL · EN") ve ok.
   Satır tıklaması → `/universities/[id]/departments/[deptSlug]`.
   Altında "Tüm {N} programı gör" (bkz. §4.3).
5. **BURSUN İÇİN** — iki kart: (a) eşleşen şehirlerin bölgesine ait burs kartı
   (`lib/scholarships/regions.ts` verisinden; tıklayınca `/scholarships`),
   (b) "ISEE değerini hesapla" kartı (→ `/isee`).
   Görünürlük bütçe cevabına göre: `scholarship-required` → blok tam boy ve programların
   hemen altında; `support-helpful` → aynı yerde standart; `flexible` → sayfanın altına
   iner ve tek satır kompakt hale gelir.
6. **SANA GÖRE ŞEHİRLER** — yaşam tercihine uyan 2-3 şehir kartı
   (`lib/cities/data.ts` curated rehberlerinden; öncelik: en iyi program eşleşmelerinin
   şehirleri). Tıklayınca `/cities` (mevcutta şehir bazlı anchor/param varsa onu kullan).
7. **Kompakt ikili** — "KISA LİSTEM {n} okul" (→ `/favorites`) ve
   "BELGELERİM {n} belge" (→ `/documents`). Sayaç var, "n / 12" tarzı hedef sayı YOK.
8. **PreferencesStrip + AccountFooter** — mevcut haliyle kalır.

### 4.2 Öneri motoru — `lib/hub/recommendations.ts`

Saf, test edilebilir fonksiyonlar; veri `useUniversitiesData()` üzerinden gelir
(`app/data.ts` seed'ine dönmek YASAK — mevcut kural).

- `FIELD_CATEGORIES`: 8 kategori → İngilizce + İtalyanca anahtar kelime listeleri.
  Eşleşme, program adı (`department.name`) üzerinde case-insensitive substring/kelime
  bazlıdır. Örnek: `engineering-tech` → engineering, computer, software, mechanical,
  electronic, electrical, aerospace, automation, robotics, ICT, informatics,
  ingegneria, informatica... Listeler Codex tarafından canlı program adlarına bakılarak
  kapsayıcı yazılır; hedef: canlı verideki programların büyük çoğunluğu en az bir
  kategoriye düşmeli (doğrulama scripti §7).
- `CITY_GROUPS`: `big-city` → Milano, Roma, Torino, Napoli, Bologna;
  `student-city` → Bologna, Padova, Pavia, Pisa, Siena, Trento, Parma, Ferrara, Ancona;
  `any` → grup filtresi yok. (Bologna bilinçli olarak iki grupta.)
- `matchPrograms(profile, universities)`:
  - Sert filtre: seviye (adım 1 eşlemesi). Alan seçiliyse alan da sert filtredir.
  - Skorlama: alan anahtar kelime eşleşme gücü (tam kelime > parça) + şehir grubu
    bonusu (+ küçük bonus: admission details verisi olan programlar — daha zengin
    detay sayfası açılır).
  - Şehir tercihi **bonus**tur, eleme değildir ("farketmez" ve zayıf sonuç durumları
    için).
  - Çıktı: skor sıralı `{ university, department, reasons }` listesi.
- `pickScholarships(matches, budget)`: en iyi eşleşmelerin şehirlerini
  `lib/scholarships/regions.ts` bölgelerine eşler; 1 bölge kartı döner.
- `pickCities(matches, cityPref)`: curated şehir rehberlerinden 2-3 kart;
  önce eşleşme şehirleri, sonra grup üyeleri.
- **Zayıf sonuç guard'ı**: eşleşme < 3 ise kademeli gevşet: önce alan eşleşmesi
  gevşer (tam kelime yerine parça eşleşme de kabul edilir), hâlâ azsa yalnız seviye
  filtresiyle liste doldurulur ve hero lede'ine dürüst bir not eklenir
  ("Alanını biraz genişlettik"). Sonuç 0 program göstermek yok.

### 4.3 "Tüm {N} programı gör" — onaylı tasarımdan tek sapma

Brainstorming'de "üniversiteler sayfasına filtreli link" konuşuldu; ancak
`/universities` URL filtreleri yalnızca `q`/`city`/`type`/`fav` destekliyor —
"alan + seviye" kombinasyonunu taşıyamıyor ve SEO açısından kritik o sayfaya yeni
filtre eklemek kapsamı büyütür. Karar: **liste Hub içinde yerinde genişler**
(veri client'ta zaten yüklü; tek tıkla ilk 5'ten tüm eşleşmelere açılır, tekrar
kapanabilir). Şehir kartları gibi tekil boyutlarda mevcut deep-link'ler
(`/universities?city=Bologna`) kullanılabilir.

### 4.4 Veri modeli — Supabase `user_profiles`

Favorites pattern'inin aynısı (Clerk `supabase` JWT template + RLS):

- `user_id` text PK (Clerk user id)
- `level` text null — `bachelor` | `master`
- `fields` text[] null — en fazla 2 kategori id'si
- `budget` text null — `scholarship-required` | `support-helpful` | `flexible`
- `city_pref` text null — `big-city` | `student-city` | `any`
- `created_at` / `updated_at` timestamptz

Kurulum: `supabase/user_profiles.sql` (tablo + RLS policy + grant; check constraint'ler
enum değerleri için). `types/index.ts` içine `UserProfileRow` interface'i eklenir
(generated types yok — mevcut kural). Tüm alanlar null olabilir: kısmi cevap geçerli
profil sayılır (cevaplanan kadarıyla öneri üretilir; eksik boyutlar filtre/bonus dışı).

Hook: `lib/hub/useUserProfile.ts` — `useFavorites` pattern'i: yükleme, upsert,
optimistic update + rollback, signed-out temizliği. localStorage fallback YOK
(sihirbaz ve Hub zaten korumalı).

### 4.5 Kaldırılanlar

- `components/hub/StageStrip.tsx`, `BursNotuCell.tsx`, `ToplulukNotuCell.tsx`,
  `DossierHero.tsx` (yerine öneri hero'su), `BentoGrid.tsx` (yeni yerleşim gerekirse
  sadeleştirilir/silinir).
- `lib/hub/stages.ts`, `lib/hub/useHubStage.ts`; localStorage `italyPathStage` artık
  okunmaz (ilk yüklemede sessizce silinebilir).
- `KisaListeCell` / `BelgeCell` kompakt ikiliye evrilir (yeniden yazılabilir).
- `useDocumentsCount` kalır (kompakt belge kutusu için).

### 4.6 Profilsiz kullanıcı (sihirbazı atlayan veya eski kullanıcı)

Profil şeridi + öneri bloklarının yerinde tek bir **davet kartı**:
"2 dakikada profilini oluştur, bu sayfa sana göre şekillensin." → `/hosgeldin`.
Altında genel keşif kısayolları (Üniversiteler, Şehirler, Burslar) ve §4.1/7 kompakt
ikili + footer aynen durur. Dört sorunun DÖRDÜ de boşsa kullanıcı "profilsiz" sayılır;
en az bir cevap varsa öneri düzeni (guard'lı) çalışır ve profil şeridinde eksik
boyutlar için "Tamamla" vurgusu görünür.

## 5. Hata / kenar durumları

- `useUniversitiesData` hata verirse: öneri blokları yerine mevcut editorial hata
  bloğu kalıbı (yeniden dene); profil şeridi ve kompakt ikili çalışmaya devam eder.
- Supabase profil okuma hatası: Hub profilsiz görünümüne düşer (davet kartı), konsol
  dışında kullanıcıya hata gösterilmez; sihirbazda kayıt hatası inline mesaj + tekrar
  dene.
- `documentsUnavailable` mevcut davranışı korunur ("—" gösterimi).

## 6. Kapsam dışı

- Özellik tanıtımı / tur ekranları (ana sayfa projesi).
- AI mentor'a profil köprüsü (ileride ayrı iş).
- Eğitim dili sorusu.
- `/universities` sayfasına yeni filtre türleri.
- Görev/checklist sistemi, deadline hatırlatıcıları.

## 7. Doğrulama

- `npm run check:routes` güncellenir: `/hosgeldin` protected matrix'e eklenir.
- Yeni script `scripts/check-hub-onboarding.mjs` (`npm run check:hub-onboarding`):
  - `/hosgeldin` ve `/hub` dosyalarının varlığı, `onboarding.*` / yeni `hub.*`
    translation anahtarlarının TR+EN eksiksizliği,
  - Hub'da `app/data.ts` seed importu olmadığı,
  - kaldırılan bileşenlere (StageStrip vb.) referans kalmadığı,
  - `FIELD_CATEGORIES` kapsama testi: canlı `/api/universities` verisi (veya compose
    scripti çıktısı) üzerinde programların en az %80'i bir kategoriye düşmeli.
- `npm run check:university-data-source` geçmeye devam etmeli.
- `npm run build` + `npm run lint` temiz.
- Manuel senaryolar: yeni kayıt → sihirbaz → Hub önerili; "Şimdilik geç" → davet kartı;
  profil düzenle → öneriler değişir; zayıf profil (nadir alan + dar şehir) → guard.

## 8. AGENT_CONTEXT.md güncellemesi

Uygulama bitince: Hub bölümü yeniden yazılır (öneri merkezi mimarisi, `user_profiles`
tablosu, `/hosgeldin` route'u, kaldırılan localStorage `italyPathStage`), Supabase
yüzeyleri listesine `user_profiles` eklenir, route matrix'e `/hosgeldin` işlenir.
