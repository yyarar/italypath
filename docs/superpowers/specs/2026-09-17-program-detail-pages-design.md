# Program Detay Sayfalarını Geliştirme — Tasarım

Tarih: 2026-09-17
Brif: `docs/superpowers/briefs/2026-09-17-program-detail-pages-brief.md`
İlgili: `SEO_AUDIT.md` §19-22, `docs/superpowers/specs/2026-09-15-university-data-egress-isr-design.md`, `docs/superpowers/specs/2026-09-16-internal-linking-phase1-design.md`
Durum: Kerem'in 5 kararı alındı (sohbet, 17 Eylül). Uygulama planı ayrı belgede yazılacak.

## Amaç

1.008 program sayfasını (a) Türk öğrenci için okunur ve karar verdirici, (b) Google için benzersiz ve değerli, (c) ücretsiz araçların yanında ön görüşmeyi bir seçenek olarak sunan sayfalar hâline getirmek. Tasarım dili, doğrulanmış-kaynak ilkesi ve egress/ISR sözleşmesi bozulmadan.

## Kerem'in kararları (bu tasarımın çerçevesi)

1. **Öncelik sırası:** brifteki sıra — A → B → C+G → D → E → I → H → F → J.
2. **Kabul metinleri:** aşamalı. Şimdi İngilizce metin yapılandırılır, üstte Türkçe başlıklı künye görünür. Türkçe cümle özetleri (LLM ile toplu üretim) **şimdilik park edildi**.
3. **Kabul dosyası olmayan 108 program:** sayfa ziyaretçi için faydalı hâle getirilir, Google'a `noindex` + sitemap dışı; dosya eklenince kendiliğinden açılır.
4. **Görsel değişim toleransı:** kabul dosyasının düzeni ve sayfadaki bölüm sırası değişebilir; üstteki görsel/başlık alanı, renkler ve yazı tipleri değişmez.
5. **Ön görüşme:** tek noktada, "Sonraki adımlar" bölümünün içinde, ISEE/şehir rehberi/bölge bursu ile aynı ağırlıkta bir seçenek olarak. Ton "isterseniz"; aciliyet/fiyat/sosyal kanıt yok.
6. **Ek veri işi yok:** son tarih/sınav bilgisini yapılandırılmış alana çıkarma işi yapılmayacak (17 Eylül kararı). Dolayısıyla **veritabanı şeması değişmiyor**; hiçbir yeni kolon/migration yok.

### Kararı doğrulayan veri gerçekleri (17 Eylül, Supabase)

| Ölçüm | Değer |
|---|---|
| Program / kabul dosyası | 1.008 / 900 (108 dosyasız) |
| AB dışı son tarih metninde ayrılabilir yapı (`;` veya satır sonu) | 662 / 900 |
| ISO tarih (`2026-01-14`) içeren | 286 |
| İngilizce ay adıyla tarih içeren | 596 |
| `admission_type` farklı ifade sayısı | 364 (en yaygın 8 ifade 517 kaydı kapsıyor) |
| `entry_exam_or_test` 80 karakterden kısa | 0 (hepsi açıklama metni) |
| Resmî bölüm sınıfı kodu çıkarılabilen | 763 / 900; bunların 738'i başka okulda da bulunan bir kodu paylaşıyor (93 kod 2+ okulda) |
| Program adı uzunluğu | p90 = 55, 180 ad > 46, 70 ad > 60, en uzun 134 karakter; 82 ad birden çok okulda ortak |
| **Sayfaya gömülen kabul verisi (ham)** | medyan 277 KB, p90 1,15 MB, en kötü 2,02 MB (Napoli Federico II); sayfanın kendi dosyası medyan 8,3 KB |

Son satır bu turun en büyük teknik bulgusu: program sayfası bugün **okulun tüm programlarının** kabul dosyasını RSC yüküne gömüyor.

## İş sırası ve içerikleri

### İş 1 (A) — Kabul dosyası okunurluğu + bölüm sırası

**Sunum katmanı, veri değişmez.** Yeni saf fonksiyonlar `components/university-details/programAdmissionPresentation.ts` içine eklenir (bu dosya yalnız `import type` taşır; `check:admission-dossier` guard'ı onu transpile edip birim testten geçirir, yeni fonksiyonlar da oradan test edilir):

- `splitAdmissionSegments(value)`: önce satır sonları, sonra `; ` ile böler. Kural: en az 2 ayırıcı **ve** her parça ≥ 25 karakter olmalı; aksi hâlde tek paragraf döner. Karakter kaybı yok (birim test: parçaları birleştir → kaynakla eşit, yalnız boşluk farkı).
- `extractSegmentLabel(segment)`: baştaki `Label:` kalıbını (büyük harfle başlayan, ≤ 40 karakter) ayırır; ör. `Application Window:`, `Round Name:`, `Test Dates:`. Etiket kalın, gerisi normal.
- `localizeAdmissionDates(text, "tr")`: yalnız TR dilinde, yalnız tarih biçimlerini çevirir — `2026-01-14` → `14 Ocak 2026`; `18 March 2026` → `18 Mart 2026`; `January 15, 2026` → `15 Ocak 2026`; `March 2026` → `Mart 2026`. Başka hiçbir kelime çevrilmez. EN dilinde metin aynen kalır.
- `localizeAdmissionType(value, "tr")`: yalnız 8 yaygın kategorik ifadeyi Türkçeleştirir (`open access` → "Serbest giriş", `selection call` → "Seçme çağrısı", `restricted access` → "Kontenjanlı giriş", `TOLC` → "TOLC sınavı" vb.; 517/900 kayıt). Tanınmayan ifade **aynen** gösterilir.
- `extractDegreeClassCode(value)`: `LM-32`, `L-8`, `LMG/01` gibi resmî kodu çıkarır (İş 4'te de kullanılır).

**Panel yeniden düzeni** (`ProgramAdmissionDetailsPanel.tsx` 943 satır; üç dosyaya bölünür):

- `ProgramSummaryStrip.tsx` (yeni): künye — kampüs, bölüm sınıfı kodu, kabul tipi (Türkçe), öğretim dili + resmî linkler (program sayfası, başvuru çağrısı, harç) + kaynak sayısı ve son kontrol tarihi. **Sayfada "Okul bağlamı"nın üstüne çıkar.**
- `ProgramAdmissionDetailsPanel.tsx` (kalan gövde): 1. Başvuru takvimi, 2. Kabul koşulları, 3. Gerekli belgeler — uzun metinler artık madde madde, etiketler kalın, TR'de tarihler Türkçe.
- `ProgramSourceTrail.tsx` (yeni): kaynak izi + açık belirsizlikler, **açılır-kapanır** ve sayfanın altında.

**`ExpandableText` tek düğüme iner:** metin HTML'e bir kez yazılır; `line-clamp` + `useState` düğmesi (`aria-expanded`, `aria-controls`) ile açılır. Bugünkü `details/summary` yapısı metni iki kez yazıyor (`ProgramAdmissionDetailsPanel.tsx:289-303`).

Sayfa sırası (karar 4'te onaylanan): görsel/başlık → seviye-süre-dil şeridi → **künye** → Okul bağlamı → kabul dosyası gövdesi → Sonraki adımlar (İş 6) → kaynak izi/belirsizlikler → diğer programlar → ilgili bağlantılar.

Guard: yeni `ProgramSummaryStrip.tsx` ve `ProgramSourceTrail.tsx` dosyaları `scripts/check-university-detail-portrait.mjs` içindeki `portraitFiles` listesine eklenir — böylece panelden taşınan literaller (`teachingLanguage`, `sourceCount`, `lastChecked`, `sourceTrail`, `sourceExcerptCount`, `uncertaintyNote`, `details.uncertaintyNotes.map`) ve yasak token taraması yeni dosyaları da kapsar.

Kabul ölçütü: `check:admission-dossier` yeşil; 30 programlık örnekte (farklı okul/format) hiçbir bilgi kaybı ve bozuk madde yok; aynı bilgi daha az kaydırmayla bulunur.

### İş 2 (B) — Türkçe, benzersiz başlık ve açıklama

Yeni saf modül `lib/programMetadata.ts`; `app/universities/[id]/departments/[deptSlug]/layout.tsx` bunu kullanır (`getUniversityById(` literali korunur — `check:university-data-source`).

- **Başlık:** `{Program} — {Okul}`. ≤ 48 karakterse ` | ItalyPath` eklenir. 68 karakteri aşarsa okul yerine şehir (`getCityGuideName(city) ?? city`) kullanılır. Program adı asla kelime ortasından kesilmez; yalnız 75 karakteri aşan tek başına program adı `…` ile kısaltılır. Program adları İngilizce kalır (arama sorguları bu adlarla geliyor: GSC'de "digital humanities ca foscari"). 82 ad birden çok okulda ortak olduğu için okul adı benzersizlik için gereklidir.
- **Açıklama (dosyalı):** `{Okul} · {Şehir}. {Seviye} programı, {süre} yıl, {dil}. Başvuru takvimi, kabul koşulları ve gerekli belgeler resmî kaynaklarla tek sayfada.` → ~150 karaktere kırpılır (kelime sınırında).
- **Açıklama (dosyasız):** `… Okul bilgileri ve resmî bağlantılar; kabul dosyası hazırlanıyor.` Boş vaat yok.
- Open Graph başlık/açıklama aynı metinden; `canonical` ve görsel aynen kalır.
- Seviye sözcükleri `translations.tr.department.*` (`Lisans` / `Yüksek Lisans` / `Tek Devre`), dil `İngilizce` / `İtalyanca`. Site kuralı: `… | ItalyPath` (12 karakter).

Kabul ölçütü: yeni guard `npm run check:program-metadata` — saf fonksiyonu birim testten geçirir (başlık ≤ 75, açıklama ≤ 160, `Study ` ve `Tuition:` yok, dosyasız programda vaat cümlesi yok, iki farklı programda aynı çıktı olmaz). Ayrıca 20 gerçek programda elle kontrol.

### İş 3 (C+G) — Sayfa ağırlığı

- **Prop budama:** sunucu `initialUniversity` prop'unu (ad korunuyor, guard `check-university-detail-portrait.mjs:91`) budanmış hâlde geçer: yalnız açılan programın `admissionDetails`'i tam, diğer programlarda bu alan yok, `hasAdmissionDetails` bayrağı var. `University` tipi değişmez; `otherDepts`, `department.admissionDetails`, `department.durationYears`, `department.languages`, `fetchWhenInitial: false` literalleri yerinde kalır. Beklenen etki: sayfaya gömülen kabul verisi medyanda 277 KB → ~8 KB.
- **Görsel:** portre görselinin `sizes` değeri ve kaynağın boyutu gözden geçirilir (`priority` kalır; LCP öğesi bu görsel).
- Ölçüm: yerel üretim derlemesinde üç sayfanın (Napoli Federico II, Ca' Foscari, Bologna) ham HTML boyutu önce/sonra.

### İş 4 (D) — "Aynı alanda diğer üniversiteler"

- `lib/universities.server.ts` içine **ayrı** bir sorgu: `program_admission_details` → `select("department_id,degree_class")` (mevcut `select("department_id,updated_at")` literali guard gereği korunur). Yanıt ~900 kısa satır (~10 KB gz), 3 saatlik memo'ya girer.
- Kodlar `extractDegreeClassCode` ile normalize edilip dizin compose'unda `Department.degreeClassCode` alanına yazılır. Dizin satırları **asla** `admissionDetails` taşımaz (`check-universities-server-compose.mjs:134`); compose'un 4. parametresinin tipi değişmez, kodlar 5. parametre olarak gelir.
- `lib/relatedLinks.ts`: aynı koda sahip, farklı okuldaki en fazla 6 program. Sıralama: kabul dosyası olanlar önce, sonra okulun program sayısı, sonra ad. Sunucu HTML'inde, `RelatedLinks` içinde yeni bölüm.
- Kodu olmayan programlarda (137 dosyalı + 108 dosyasız) bu bölüm **gösterilmez**. Brifte önerilen anahtar kelime sözlüğü (`FIELD_KEYWORDS`) kullanılmayacak: kategorileri çok geniş ("digital", "energy", "industrial"), yanlış eşleşme üretir. 738 sayfa zaten kodla eşleşiyor.
- Guard: `check:university-data-source` ve `check-universities-server-compose` yeni sözleşme için güncellenir.

### İş 5 (E) — Kabul dosyası olmayan 108 program

- `layout.tsx` `generateMetadata`: dosya yoksa `robots: { index: false, follow: true }`.
- `app/sitemap.ts`: program URL'leri `hasAdmissionDossier(department)` ile filtrelenir (1.079 → ~971 URL). `/on-gorusme` ve statik rotalar aynen kalır; `universitiesData` dizesi kullanılmaz (guard).
- Sayfa faydalı hâle gelir: künye (elde olan alanlar) + okul bağlamı + okulun resmî sitesi + dürüst "kabul dosyası hazırlanıyor" notu + Sonraki adımlar + okulun diğer programları + ilgili bağlantılar.
- Dosya eklendiği an (en geç 3 saat ISR gecikmesiyle) sayfa indekse ve sitemap'e kendiliğinden döner; elle iş yok.

### İş 6 (I) — "Sonraki adımlar" + ölçüm

- Yeni `components/university-details/ProgramNextSteps.tsx`: ISEE hesaplayıcı (`/isee`), şehir rehberi (`/cities?city=…`), bölge bursları (`/scholarships?region=…`) ve son sırada ön görüşme. Ön görüşme kutusu mevcut `ConsultPrompt` bileşeniyle, bu bölümün içinde ve yumuşatılmış metinle render edilir (`<ConsultPrompt` ve `t.consultPrompt.program` literalleri `check:home-consultation` gereği korunur; TR metni "isterseniz" tonuna çekilir).
- Şehir rehberi ve bölge bursu linkleri `RelatedLinks`'ten buraya taşınır; `RelatedLinks` aynı şehirdeki okullar + (İş 4) aynı alandaki okullar olarak kalır. Tekrar yok.
- Şehri rehberde olmayan veya bölgesi tanımsız okullarda ilgili satır gösterilmez (mevcut `buildRelatedLinks` davranışı).
- Guard: `ProgramNextSteps.tsx` de `portraitFiles` listesine eklenir (yasak token taraması ve literal kapsaması için).
- **Ölçüm açık soru:** ön görüşme tıklamalarını saymak Vercel Web Analytics özel olay desteği gerektirir (ücretsiz planda yok). Plan Pro ise `track("consult_cta_click", { source: "program" })` eklenir; değilse bu kalem atlanır ve Kerem'e ayrıca sorulur.

### İş 7 (H) — Erişilebilirlik ≥ 95

Yerel Lighthouse (devtools throttling) ile örnek program sayfası taranır; `design:accessibility-review` merceğiyle: başlık hiyerarşisi (yeni bölümlerden sonra h2/h3 sırası), link adı–`aria-label` uyumu, açılır blokların `aria-expanded` durumu, küçük punto ve dokunma hedefi (≥ 44 px). Kontrast hatası 0 korunur; terracotta metin `--editorial-terracotta-ink` (guard).

### İş 8 (F) — Yapılandırılmış veri (düşük öncelik)

`EducationalOccupationalProgram`: yalnız sayfada görünen ve doğrulanmış alanlar — `name`, `url`, `provider` (okul adı), `inLanguage`, `timeToComplete` (ör. `P2Y`), `educationalProgramMode`. Son tarih alanları **eklenmez** (karar 6: tarih çıkarımı yok). Rich Results Test ile doğrulanır; yalnız dosyalı sayfalarda.

### İş 9 (J) — Egress yedek optimizasyonu (isteğe bağlı)

Program sayfasının yalnız kendi kabul satırını çekmesi. İş 3 prop budamasından sonra bile sunucu tarafı okulun tüm satırlarını çekiyor (90-180 KB gz). Trafik büyürse yapılır; `eq("university_id", ` literali korunarak.

## Dokunulmazlar (bu tasarımda korunuyor)

- Editorial paper/sage/terracotta dili, serif başlık, keskin çerçeve; `rounded-3xl`, `glass`, indigo, `radial-gradient` yasak (guard `forbidTokens`).
- Görünür tüm içerik sunucu HTML'inde; gizli SEO metni yok. `line-clamp` ile kısaltma kullanıcı tarafından açılabilir olduğu için gizli metin değildir.
- `generateMetadata` server `layout.tsx`'te; kayıt yoksa gerçek 404.
- ISR sözleşmesi: `revalidate = 10800`, boş `generateStaticParams()`, sunucuda `searchParams`/`cookies()`/`headers()` okunmaz.
- Veri/egress: detay `getUniversityById`, liste yüzeyleri `getUniversitiesDirectory`; tam veri seti compose'u geri gelmez.
- Çeviriler `lib/translations.ts` içinde TR/EN paralel; hard-code metin yok.
- **Sitemap tarihi:** görünür içerik değişen her deploy'da `PAGE_TEMPLATE_LAST_MODIFIED` o tarihe çekilir ve Kerem sitemap'i yeniden gönderir.
- Supabase Free kota: 14 Ekim mühleti; yeni iş egress'i artırmıyor (İş 4'ün küçük eki hariç, ~10 KB gz / 3 saat).

## Deploy grupları

Her deploy: guard'lar + `npx tsc --noEmit` + değişen dosyalarda ESLint yeşil → yerel üretim derlemesi + ekran görüntüsü → Kerem onayı → push.

| Deploy | İçerik | Görünür mü |
|---|---|---|
| 1 | İş 1 (A) + İş 2 (B) | Evet (panel düzeni, künye, Google başlıkları) |
| 2 | İş 3 (C+G) + İş 4 (D) | Kısmen (yeni "aynı alanda" bölümü) |
| 3 | İş 5 (E) + İş 6 (I) | Evet (108 sayfa + Sonraki adımlar) |
| 4 | İş 7 (H) + İş 8 (F) | Hayır |

Deploy 1, 2 ve 3'te sitemap sabiti güncellenir; belge commit'leri bu push'lara bindirilir.

## Doğrulama protokolü

- Yerel: `npm run build` + `.claude/launch.json` `italypath-prod`; sunucu HTML'inde içerik kontrolü; headless Chrome ile uzun pencere ekran görüntüsü; HTML boyutu önce/sonra (3 sayfa).
- Guard'lar: `check:university-details-ui`, `check:admission-dossier`, `check:program-details`, `check:university-data-source`, `check:seo-vitals`, `check:home-consultation`, `check:program-metadata` (yeni), `node scripts/check-universities-server-compose.mjs`, `check:routes`.
- Production sonrası: yeni blokların HTML'de görünmesi, `x-vercel-cache`, bir hafta sonra GSC (gösterim/tıklama, tarama istatistikleri, "Keşfedildi" sayısı), Supabase Usage günlük egress (~30 MB bazı).
- Lighthouse: `--throttling-method=devtools`; production'a karşı art arda en fazla 3-4 koşu, ≥ 60 sn aralık (Vercel challenge).
- Her turun kaydı `SEO_AUDIT.md`'ye yeni bölüm (§23).

## Riskler

| Risk | Karşılık |
|---|---|
| Uzun İngilizce metni maddelere bölmek bozuk parçalar üretebilir | Eşikler (≥ 2 ayırıcı, parça ≥ 25 karakter); 30 programlık örnek elle kontrol; birim testte karakter kaybı yasak |
| Tarih çevirisi yanlış eşleşebilir | Yalnız üç kalıp, kelime sınırı zorunlu; birim test; ay adı dışında hiçbir kelime çevrilmez |
| 108 sayfanın `noindex`'i indekslenmiş sayfayı düşürebilir | Şu an bu sayfaların indekste olduğuna dair kanıt yok (GSC: 22 indeksli, 225 "keşfedildi"); karar geri alınabilir |
| Prop budaması kabul panelini boşaltabilir (dizin verisinin paneli ezmesi) | `fetchWhenInitial: false` korunur; yerelde panel dolu mu diye tarayıcıdan doğrulanır |
| Guard'lar literal dizeler arıyor | Her iş öncesi ilgili guard dosyası okunur; sözleşme değişirse guard aynı commit'te güncellenir |
| Sık deploy ISR önbelleğini sıfırlar | 4 deploy grubu; belge commit'leri biriktirilip aynı push'a bindirilir |

## Açık sorular

1. **Vercel planı:** özel olay sayımı (ön görüşme tıklaması) mümkün mü? Ücretsiz planda değilse İş 6'nın ölçüm kalemi atlanır.
2. Türkçe cümle özetleri (LLM ile toplu üretim) park edildi; ileride açılırsa ayrı tasarım ve veritabanı alanı gerekir.
3. Kodu olmayan 137 dosyalı programda "aynı alanda diğer üniversiteler" bölümü gösterilmiyor; anahtar kelime eşleştirmesi bilinçli olarak kullanılmıyor.
