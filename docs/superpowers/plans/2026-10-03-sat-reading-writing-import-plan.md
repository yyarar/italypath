# SAT Reading and Writing Soru Bankası: Çıkarma ve Yayın Planı

Durum (2026-10-03): **UYGULANMADI** — plan yazıldı; kaynak incelemesi yapıldı (aşağıdaki sayılar 2026-10-03 ölçümü). Kerem kararları (2026-10-03): kapsam yalnız 589 soru; uygulama bu oturumun yönettiği yardımcı ajanlarla. Çalışma dalı `feat/sat-rw` (`.worktrees/sat-rw`).

> Ajanlar için: her görev bağımsız yürütülür. Görevini bitiren ajan yalnız kendi görevinin dosyalarını commit eder (`git add <dosya>`; `git add -A` yok), push yapmaz, canlı veritabanına yazmaz. Bu plandaki checkbox'lar ilerleme göstermez; ilerleme `tmp/sat-bank/rw/DEVAM.md` (ana klasör, Git dışı) dosyasında tutulur. Görev metinleri kodu satır satır vermez: çıkarma kodu gerçek PDF'lere karşı geliştirilir; bağlayıcı olan veri sözleşmeleri, dosya yolları ve kabul sayılarıdır.

**Amaç:** Masaüstündeki `SAT Question Bank PDFs` klasöründen 589 Reading and Writing sorusunu (pasaj, 4 şık, doğru cevap, resmî İngilizce açıklama, zorluk) mevcut `/sat` soru bankasına eklemek.

**Yaklaşım:** Sorular yapay zekâsız, doğrudan PDF metin katmanından çıkarılır (Formatsız sürümün cevap anahtarı dosyaları). Doğruluk dört bağımsız kapıyla kanıtlanır (çift kaynak karşılaştırması, ikinci cevap anahtarı, kör çözücü, resmî görüntüyle göz karşılaştırması). Sorular canlıya `needs_review = true` (karantina) ile eklenir; site yayını çıktıktan sonra açılır.

**Araçlar:** Python 3.9 + `pdfplumber` 0.11.8 (yalnız çıkarma adımı), poppler (`pdftotext`, `pdftoppm`, `pdfimages`), Node 24 (`/usr/local/bin/node`), `sharp` (repo bağımlılığı). Yeni npm paketi eklenmez.

## Kaynak incelemesi (2026-10-03)

| | Formatsız (`Question Bank (Unformatted)`) | Formatlı (`Question Bank (Formatted)`) |
| --- | --- | --- |
| Üretim | College Board soru bankasının tarayıcı çıktısı (Ağustos 2025) | Tabloya dizilmiş derleme |
| Soru metni | Gerçek metin katmanı | JPEG resim (metin katmanında yalnız sıra no + id) |
| Cevap | `Answer Keys/Reading and Writing/**`: doğru cevap + Rationale + zorluk | `Answers/Reading and Writing/*~Key.pdf`: yalnız harf |
| Soru sayısı | 589 (soru dosyaları ve anahtar dosyaları aynı 589 id) | 846 |

- Ortak id: 587. Yalnız formatsızda: `96f3accc`, `4ba0695d`. Yalnız formatlıda: 259 (kapsam dışı, Kerem kararı).
- Formatlı `Inferences 3~Key.pdf` cevap harfi taşımıyor (soru dosyasının kopyası). Karşılaştırılabilir 562 harfin 562'si iki sürümde aynı.
- `tmp/sat-bank/answers.json` içindeki RW kayıtları formatlı anahtardan gelir; Inferences 3'ün 25 kaydı harf yerine sayı taşır. RW için bu dosya cevap kaynağı DEĞİLDİR; yalnız karşılaştırmada kullanılır.
- Dosya adı tuzakları: formatsızda `Test Structure and Purpose 1.pdf` (yazım hatası; beceri adı dosya adından değil soru künyesinden alınır); formatlıda `-Command of Evidence N.pdf`, `-Inferences N.pdf` (baştaki tire).
- Zorluk: dosya adındaki 1/2/3 = Easy/Medium/Hard (589/589 tutuyor). Dağılım: Easy 192, Medium 190, Hard 207. Cevap dağılımı: A 150, B 143, C 130, D 166.
- Gömülü resim yok (her soruda yalnız 46×15 zorluk simgesi). Grafik ve tablolar vektör çizimdir.

Dosya başına beklenen soru sayısı (zorluk 1 / 2 / 3):

| Alan | Beceri | 1 | 2 | 3 | Toplam |
| --- | --- | ---: | ---: | ---: | ---: |
| Information and Ideas | Central Ideas and Details | 16 | 15 | 17 | 48 |
| Information and Ideas | Command of Evidence | 36 | 32 | 36 | 104 |
| Information and Ideas | Inferences | 13 | 13 | 26 | 52 |
| Craft and Structure | Words in Context | 24 | 23 | 21 | 68 |
| Craft and Structure | Text Structure and Purpose | 17 | 17 | 14 | 48 |
| Craft and Structure | Cross-Text Connections | 15 | 9 | 10 | 34 |
| Expression of Ideas | Rhetorical Synthesis | 18 | 27 | 21 | 66 |
| Expression of Ideas | Transitions | 20 | 14 | 15 | 49 |
| Standard English Conventions | Boundaries | 16 | 21 | 24 | 61 |
| Standard English Conventions | Form, Structure, and Sense | 17 | 19 | 23 | 59 |
| | | | | | **589** |

Özel biçim taşıyan sorular (çıkarıcının 2026-10-03 sayımı):

| Durum | Soru | PDF'te nasıl görünür |
| --- | ---: | --- |
| Altı çizili bölüm | 46 (33'ünün kökünde "underlined" geçer, 13'ü Words in Context) | Metnin altında 0,75 pt yüksekliğinde koyu dolgu dikdörtgen |
| İtalik | 176 | Font adı `Roboto-Italic` |
| Not listesi (Rhetorical Synthesis) | 66 | Madde imi vektör daire; metin satırları normal |
| Grafik | 23 (hepsi Command of Evidence) | Vektör çizim + farklı (serif) fontla eksen/başlık yazıları |
| Tablo | 25 (hepsi Command of Evidence; `5c7e0d62` "Round Table" der, tablosu yoktur) | Çerçeve çizgileri + hücre metni |
| Şiir / diyalog (satır sonu korunan) | 10 | Kısa satırlar; satır sonları anlam taşır. Şıklarda ` / ` ile satır içi alıntılanan dizeler ayrıdır |
| İki metin (Text 1 / Text 2) | 34 | Kalın etiket satırları |
| Boşluk (`______`) | 321 | Alt çizgi karakterleri |
| Dolar işareti | 0 (metinde) | Tek `# SAT Reading and Writing Soru Bankası: Çıkarma ve Yayın Planı

Durum (2026-10-03): **UYGULANMADI** — plan yazıldı; kaynak incelemesi yapıldı (aşağıdaki sayılar 2026-10-03 ölçümü). Kerem kararları (2026-10-03): kapsam yalnız 589 soru; uygulama bu oturumun yönettiği yardımcı ajanlarla. Çalışma dalı `feat/sat-rw` (`.worktrees/sat-rw`).

> Ajanlar için: her görev bağımsız yürütülür. Görevini bitiren ajan yalnız kendi görevinin dosyalarını commit eder (`git add <dosya>`; `git add -A` yok), push yapmaz, canlı veritabanına yazmaz. Bu plandaki checkbox'lar ilerleme göstermez; ilerleme `tmp/sat-bank/rw/DEVAM.md` (ana klasör, Git dışı) dosyasında tutulur. Görev metinleri kodu satır satır vermez: çıkarma kodu gerçek PDF'lere karşı geliştirilir; bağlayıcı olan veri sözleşmeleri, dosya yolları ve kabul sayılarıdır.

**Amaç:** Masaüstündeki `SAT Question Bank PDFs` klasöründen 589 Reading and Writing sorusunu (pasaj, 4 şık, doğru cevap, resmî İngilizce açıklama, zorluk) mevcut `/sat` soru bankasına eklemek.

**Yaklaşım:** Sorular yapay zekâsız, doğrudan PDF metin katmanından çıkarılır (Formatsız sürümün cevap anahtarı dosyaları). Doğruluk dört bağımsız kapıyla kanıtlanır (çift kaynak karşılaştırması, ikinci cevap anahtarı, kör çözücü, resmî görüntüyle göz karşılaştırması). Sorular canlıya `needs_review = true` (karantina) ile eklenir; site yayını çıktıktan sonra açılır.

**Araçlar:** Python 3.9 + `pdfplumber` 0.11.8 (yalnız çıkarma adımı), poppler (`pdftotext`, `pdftoppm`, `pdfimages`), Node 24 (`/usr/local/bin/node`), `sharp` (repo bağımlılığı). Yeni npm paketi eklenmez.

## Kaynak incelemesi (2026-10-03)

| | Formatsız (`Question Bank (Unformatted)`) | Formatlı (`Question Bank (Formatted)`) |
| --- | --- | --- |
| Üretim | College Board soru bankasının tarayıcı çıktısı (Ağustos 2025) | Tabloya dizilmiş derleme |
| Soru metni | Gerçek metin katmanı | JPEG resim (metin katmanında yalnız sıra no + id) |
| Cevap | `Answer Keys/Reading and Writing/**`: doğru cevap + Rationale + zorluk | `Answers/Reading and Writing/*~Key.pdf`: yalnız harf |
| Soru sayısı | 589 (soru dosyaları ve anahtar dosyaları aynı 589 id) | 846 |

- Ortak id: 587. Yalnız formatsızda: `96f3accc`, `4ba0695d`. Yalnız formatlıda: 259 (kapsam dışı, Kerem kararı).
- Formatlı `Inferences 3~Key.pdf` cevap harfi taşımıyor (soru dosyasının kopyası). Karşılaştırılabilir 562 harfin 562'si iki sürümde aynı.
- `tmp/sat-bank/answers.json` içindeki RW kayıtları formatlı anahtardan gelir; Inferences 3'ün 25 kaydı harf yerine sayı taşır. RW için bu dosya cevap kaynağı DEĞİLDİR; yalnız karşılaştırmada kullanılır.
- Dosya adı tuzakları: formatsızda `Test Structure and Purpose 1.pdf` (yazım hatası; beceri adı dosya adından değil soru künyesinden alınır); formatlıda `-Command of Evidence N.pdf`, `-Inferences N.pdf` (baştaki tire).
- Zorluk: dosya adındaki 1/2/3 = Easy/Medium/Hard (589/589 tutuyor). Dağılım: Easy 192, Medium 190, Hard 207. Cevap dağılımı: A 150, B 143, C 130, D 166.
- Gömülü resim yok (her soruda yalnız 46×15 zorluk simgesi). Grafik ve tablolar vektör çizimdir.

Dosya başına beklenen soru sayısı (zorluk 1 / 2 / 3):

| Alan | Beceri | 1 | 2 | 3 | Toplam |
| --- | --- | ---: | ---: | ---: | ---: |
| Information and Ideas | Central Ideas and Details | 16 | 15 | 17 | 48 |
| Information and Ideas | Command of Evidence | 36 | 32 | 36 | 104 |
| Information and Ideas | Inferences | 13 | 13 | 26 | 52 |
| Craft and Structure | Words in Context | 24 | 23 | 21 | 68 |
| Craft and Structure | Text Structure and Purpose | 17 | 17 | 14 | 48 |
| Craft and Structure | Cross-Text Connections | 15 | 9 | 10 | 34 |
| Expression of Ideas | Rhetorical Synthesis | 18 | 27 | 21 | 66 |
| Expression of Ideas | Transitions | 20 | 14 | 15 | 49 |
| Standard English Conventions | Boundaries | 16 | 21 | 24 | 61 |
| Standard English Conventions | Form, Structure, and Sense | 17 | 19 | 23 | 59 |
| | | | | | **589** |

Özel biçim taşıyan sorular (çıkarıcının 2026-10-03 sayımı):

| Durum | Soru | PDF'te nasıl görünür |
| --- | ---: | --- |
| Altı çizili bölüm | 46 (33'ünün kökünde "underlined" geçer, 13'ü Words in Context) | Metnin altında 0,75 pt yüksekliğinde koyu dolgu dikdörtgen |
| İtalik | 176 | Font adı `Roboto-Italic` |
| Not listesi (Rhetorical Synthesis) | 66 | Madde imi vektör daire; metin satırları normal |
| Grafik | 23 (hepsi Command of Evidence) | Vektör çizim + farklı (serif) fontla eksen/başlık yazıları |
| Tablo | 25 (hepsi Command of Evidence; `5c7e0d62` "Round Table" der, tablosu yoktur) | Çerçeve çizgileri + hücre metni |
| Şiir / diyalog (satır sonu korunan) | 10 | Kısa satırlar; satır sonları anlam taşır. Şıklarda ` / ` ile satır içi alıntılanan dizeler ayrıdır |
| İki metin (Text 1 / Text 2) | 34 | Kalın etiket satırları |
| Boşluk (`______`) | 321 | Alt çizgi karakterleri |
 bir tablo başlığındadır, görsele girer |

Ham metin hacmi: soru ~0,53 MB, açıklama ~0,67 MB.

## Değişmez kurallar (her görev için)

- Kaynak klasöre yazılmaz. Çıktılar ana klasörde `tmp/sat-bank/rw/` altına gider (Git dışı; worktree silinince kaybolmasın diye ortam değişkeni `SAT_BANK_OUT` ile verilir).
- Çıkarma adımında yapay zekâ metin ÜRETMEZ ve düzeltmez. Yapay zekâ yalnız kapılarda denetçi olarak çalışır (kör çözücü, görsel karşılaştırma); bulduğu fark kaynağa bakılarak betikte ya da açık bir düzeltme listesinde giderilir.
- Canlı veritabanına yalnız ana oturum, Kerem onayıyla yazar: önce `npm run backup:supabase -- --run` + `-- --verify`, sonra kuru çalıştırma, sonra `--apply --project-ref kskbnxxyviowmrlskwke`.
- `scripts/sat/import-bank.mjs` insert-only kalır; var olan sorular yalnız `scripts/sat/patch-sat-questions.mjs` ile değişir. `lib/sat/questions.server.ts` `needs_review = true` satırı asla sunmaz.
- Mevcut 1.019 matematik sorusunun metni, ayrıştırması ve görünümü değişmez (her site görevinde kanıtlanır).
- UI metni `lib/translations/tr.ts` + `en.ts`; framer-motion yalnız `m`; terracotta metin `--editorial-terracotta-ink`.
- Push yalnız Kerem'in açık sözüyle; 17 Ekim'e kadar haftada en fazla 1 toplu push (`docs/USAGE_LIMITS.md`). Push öncesi `npm run check:offline` yeşil.
- Paralel ajan en fazla 8; dalga dalga.

## RW metin sözleşmesi

`prompt`, `choices` ve `explanation_en` alanları için geçerlidir. Aynı kuralı site (`components/sat/MathText.tsx`), içerik taraması ve `~/eduitalya` uygulaması uygular.

- Paragraflar tek boş satırla (`\n\n`) ayrılır. Satır sonu (`\n`) yalnız anlam taşıdığı yerde kalır: şiir dizeleri, not listesi maddeleri, `Text 1` / `Text 2` etiket satırları. Sarılmış düz yazı satırları tek boşlukla birleştirilir; satır sonundaki tire ya da uzun çizgiden sonra boşluk eklenmez (`megawatt-` + `hours` → `megawatt-hours`).
- Altı çizili: `<u>…</u>`. İtalik: `<i>…</i>`. Başka etiket yoktur. İşaretler dengelidir, boş olamaz, aynı tür iç içe geçmez ve satır sonunu (`\n`) aşmaz (şiirde her dizede kapatılıp yeniden açılır). `<u><i>…</i></u>` iç içeliği serbesttir.
- Boşluk tam altı alt çizgidir: `______`.
- Not listesi maddesi `• ` ile başlar.
- Gerçek dolar işareti `\$` yazılır. RW metinlerinde formül (`$…$`) beklenmez; çıkarsa kapı hatasıdır.
- Grafik ve tablo metne yazılmaz; `figure_path` ile WebP görsel olarak eklenir (en çok 512 KB). Grafiğin başlığı, eksen yazıları ve tablo hücreleri `prompt` içinde yer almaz. RW'de görsel soru metninin ÜSTÜNDE gösterilir (matematikte altında).
- `prompt` içindeki sıra: (varsa giriş cümlesi) → pasaj → soru cümlesi. Şıklar `choices` içindedir; `A.` öneki yazılmaz.
- `explanation_en`: Rationale metni, paragrafları korunmuş; `Correct Answer`, `Rationale`, `Question Difficulty` başlıkları yazılmaz.

Banka kaydı (`tmp/sat-bank/rw/bank.json` → `bank[]`; matematik `bank.json` ile aynı şekil + açıklama):

| Alan | Değer |
| --- | --- |
| `id` | 8 haneli onaltılık kimlik |
| `section` | `reading-writing` |
| `domain`, `skill` | Soru künyesinden (dört alan, on beceri; yukarıdaki tablo) |
| `skill_slug` | `slugify(skill)` (`scripts/sat/lib.mjs`), ör. `form-structure-and-sense` |
| `difficulty` | 1, 2 veya 3 |
| `question_type` | `mcq` |
| `prompt`, `choices` | Sözleşmeye uygun metin; `choices` = `{A,B,C,D}` |
| `correct_answer` | Tek elemanlı dizi, ör. `["D"]` (formatsız anahtardan) |
| `figure_path` | `figures/<id>.webp` ya da alan yok |
| `explanation_en` | Sözleşmeye uygun açıklama |
| `source_file` | Anahtar dosyasının adı, ör. `Words in Context 1 Answer Key.pdf` |
| `needs_review` | `true` (karantinada eklenir) |

## Dosya haritası

| Dosya | Sorumluluk | Görev |
| --- | --- | --- |
| `lib/sat/mathSegments.mjs`, `mathSegments.d.mts` | `splitRichText`, `stripMarks`, `MARK_TAGS` (formül kuralı değişmez) | 1 |
| `scripts/sat/lib/content-audit.mjs` | `markIssues(text)` | 1 |
| `scripts/sat/lib.mjs` | `OUT_ROOT` için `SAT_BANK_OUT` | 1 |
| `scripts/sat/rw/paths.mjs` | Ortak yollar: `RW_OUT` (`SAT_BANK_OUT` ya da `tmp/sat-bank/rw`), kaynak klasörleri | hazır |
| `scripts/sat/rw/extract_rw.py` | PDF → ham kayıt (anahtar ve soru dosyalarından ayrı ayrı) | 2 |
| `scripts/sat/rw/inventory-rw.mjs` | Kaynak dosya listesi + sha256 | 2 |
| `scripts/sat/rw/validate-rw.mjs` | Kapılar + `bank.json` | 3 |
| `scripts/sat/rw/crop-rw-figures.mjs` | Grafik/tablo kırpma → WebP | 4 |
| `scripts/sat/rw/slice-rw-formatted.mjs` | Formatlı resmî görüntüler (id başına) | 5 |
| `scripts/sat/rw/render-rw-preview.mjs` | Yan yana önizleme sayfası (resmî görüntü + bizim metin) | 5 |
| `components/sat/MathText.tsx`, `QuestionCard.tsx`, `SatBankExplorer.tsx`, `lib/sat/domains.ts`, `lib/translations/tr.ts`, `en.ts`, `scripts/check-sat-bank.mjs` | Site | 6 |
| `scripts/sat/import-bank.mjs`, `scripts/sat/rw/build-rw-release-package.mjs`, `scripts/sat/test-question-patch.mjs` | Yazma araçları | 7 |
| `scripts/sat/rw/build-rw-solver-packages.mjs`, `scripts/sat/rw/gate-rw.mjs` | Kör çözücü paketleri ve kapı raporu | 8 |

Çıktılar (`tmp/sat-bank/rw/`): `source-inventory.json`, `extract-keys.json`, `extract-questions.json`, `bank.json`, `validate-report.json`, `figures/<id>.webp`, `formatted-images/<id>.png`, `preview/*.html`, `solver/package-NN.json`, `solver/result-NN.json`, `visual/package-NN.json`, `visual/result-NN.json`, `gate-report.json`, `corrections.json`, `DEVAM.md`.

---

## Faz A — Temel

### Görev 1: Metin sözleşmesi modülü

**Dosyalar:** `lib/sat/mathSegments.mjs`, `lib/sat/mathSegments.d.mts`, `scripts/sat/lib/content-audit.mjs`, `scripts/sat/test-content-audit.mjs`, `scripts/sat/lib.mjs`.

**Üretir (sonraki görevler bu adları kullanır):**
- `MARK_TAGS`: `["<u>", "</u>", "<i>", "</i>"]`.
- `splitRichText(text)` → sıralı parçalar: `{ kind: "text" | "inline" | "display", value: string, italic: boolean, underline: boolean }`. Formül parçaları `splitMathText` ile aynıdır ve işaret taşımaz; işaretler yalnız formül dışındaki metinde tanınır; işaret durumu formül parçasının iki yanında sürer. Dört etiket dışındaki her `<` düz metindir. Dengesiz girdi çökmez (kapanmayan işaret metnin sonunda kapanmış sayılır).
- `stripMarks(text)` → dört etiketi siler, başka hiçbir şeye dokunmaz.
- `markIssues(text)` (`content-audit.mjs`) → sorun listesi (boş dizi = temiz): dengesiz/kapanmamış işaret, aynı tür iç içe, boş işaret, satır sonunu aşan işaret, dört etiket dışında etikete benzeyen yazı (`<b>`, `</em>`, `<u ` gibi).
- `scripts/sat/lib.mjs`: `OUT_ROOT`, `SAT_BANK_OUT` verilmişse onu (mutlak yola çevrilmiş), yoksa bugünkü `tmp/sat-bank` yolunu kullanır.

**Kabul:**
- `splitMathText` ve `mapTextOutsideMath` davranışı değişmez. Kanıt: `tmp/sat-bank/bank.json` içindeki bütün matematik metinlerinde (soru, şık) ve `tmp/sat-bank/authored-explanations-en`, `explanations-en` altındaki açıklama metinlerinde dört etiketin hiçbiri geçmiyor (sayım 0) ve bu metinlerde `splitRichText` çıktısı, işaret alanları dışında `splitMathText` ile birebir aynı.
- `npm run test:sat-audit` yeni durumları sınar: düz metin, tek işaret, iç içe iki tür, formülün içindeki `<`, formülün iki yanında süren italik, dengesiz girdi, `markIssues` beş sorun türü.
- `npm run check:offline` yeşil.

## Faz B — Veri ve site (paralel)

### Görev 2: Kaynak envanteri ve çıkarıcı

**Dosyalar:** `scripts/sat/rw/inventory-rw.mjs`, `scripts/sat/rw/extract_rw.py`.

**Girdi:** `Question Bank (Unformatted)/Answer Keys/Reading and Writing/**` (30 PDF) ve `Question Bank (Unformatted)/Reading and Writing/**` (30 PDF). Kök `SAT_BANK_SRC` (`scripts/sat/lib.mjs` `SOURCE_ROOT`).

**Üretir:**
- `source-inventory.json`: 60 dosyanın göreli yolu, bayt boyutu, sha256, sayfa sayısı. Çıkarıcı başlarken envanteri doğrular; uymazsa durur.
- `extract-keys.json` ve `extract-questions.json`: `{ records: [...] }`. Kayıt: `id`, `source_file`, `page` (sorunun başladığı sayfa, 1'den), `domain`, `skill`, `stem` (sözleşmeye uygun, işaretli), `choices` `{A,B,C,D}`, `figure` (`null` ya da `{ kind: "graph" | "table", page, bbox: [x0, top, x1, bottom] }`, PDF noktası, kaynak dosya aynı `source_file`). Yalnız anahtar kayıtlarında ayrıca `answer`, `rationale`, `difficulty_label`.

**Uygulama notları (bağlayıcı olmayan ipuçları; kabul sayıları bağlayıcı):**
- Soru başlangıcı: kalın `Question ID <id>` başlığı. Gövde `ID: <id>` şeridinden sonra, cevap bölümü `ID: <id> Answer` şeridinden sonra başlar. Soru sayfa sınırını aşabilir.
- Altı çizili: `pdfplumber` `page.rects` içinde yüksekliği 1,6 pt altında, koyu dolgulu dikdörtgen; üstündeki satırda yatay olarak örtüştüğü karakterler altı çizilidir. Tablo çizgileriyle karışmaması için yalnız metin satırının hemen altındaki dikdörtgenler sayılır.
- İtalik: karakter `fontname` içinde `Italic`.
- Sarılmış satır mı, gerçek satır sonu mu: bir sonraki satırın ilk sözcüğü bu satırda kalan boşluğa sığıyorsa satır sonu gerçektir (şiir, liste); sığmıyorsa sarılmıştır.
- Grafik yazıları Roboto olmayan fonttadır; tablo, çerçeve çizgileriyle sınırlıdır. Grafik/tablo bandındaki karakterler `stem`'e girmez.
- Not listesi madde imleri `page.curves` içindeki küçük dairelerdir; madde satırının başına `• ` yazılır.

**Kabul:** iki dosyada da 589 kayıt, id kümeleri aynı; dosya başına sayılar yukarıdaki tabloyla aynı; çıkarıcı iki kez çalıştırıldığında çıktı bayt bayt aynı.

### Görev 3: Doğrulayıcı ve banka dosyası

**Dosya:** `scripts/sat/rw/validate-rw.mjs` (salt yerel; ağ yok).

**Üretir:** `bank.json` (`{ bank, failures, warnings, excluded }`; `scripts/sat/import-bank.mjs` bu şekli okur) ve `validate-report.json` (her kapı için sayı ve ilk örnekler). Hata varsa çıkış kodu 1.

**Kapılar (hepsi hata; aksi yazılmadıkça):**
1. Sayım: 589 kayıt; dosya, beceri ve zorluk dağılımı yukarıdaki tablolarla aynı.
2. Künye: `skill` ve `domain` dosyanın klasörü/adıyla tutarlı; `difficulty_label` dosya adındaki rakamla tutarlı.
3. Şekil: dört şık dolu; `answer` A-D; `rationale` dolu. Uyarı: açıklamanın ilk cümlesi doğru şıkkın harfini anmıyorsa listelenir.
4. Çift kaynak: `extract-keys.json` ile `extract-questions.json` içinde aynı id'nin `stem` ve `choices` değerleri birebir aynı (589/589). Not (2026-10-03): iki baskının sayfa düzeni aynı çıktı, bu kapı tek başına bağımsız kanıt sayılmaz.
4b. Bağımsız motor: her sorunun metni (soru, şıklar, açıklama) poppler `pdftotext` çıktısıyla, boşluklar ve belgelenmiş dönüşümler dışında karakter karakter aynı sırada eşleşir. Görselli 48 soruda görselin kendi yazısı karşılaştırma dışıdır (Görev 9 göz kontrolü kapsar).
5. İkinci anahtar: formatlı `Answers/Reading and Writing/*~Key.pdf` harfleri (tablo satırı `sıra  id  harf`) ile karşılaştırma; karşılaştırılabilen her harf aynı olmalı (beklenen 562/562). Karşılaştırılamayan id'ler raporda listelenir (beklenen 27: Inferences 3'ün 25'i + yalnız formatsızdaki 2).
6. Sözleşme: `markIssues` her metinde boş; `stripMarks` sonrası `<` ile başlayan etiket benzeri kalmaz; kaçışsız `$` yok; `Question ID`, `Correct Answer`, `Rationale`, `Question Difficulty`, `Assessment` gibi sayfa/künye kalıntısı yok; art arda üç satır sonu yok; baş/son boşluk yok.
7. Altı çizili: kökünde "underlined" geçen her sorunun `prompt`'unda en az bir `<u>` var; `<u>` taşıyıp kökünde "underlined" geçmeyen sorular raporda listelenir (Words in Context'te beklenir).
8. Boşluk: kökünde "completes the text" geçen her soruda `______` var.
9. Görsel: kökünde "graph" ya da "table" geçen her sorunun `figure` kaydı var (beklenen 23 + 25; tablosuz/grafiksiz olup bu sözcüğü kullanan sorular gerekçeli izin listesinde); başka soruda `figure` varsa listelenir. `figure_path` dosyası Görev 4'ten sonra diskte olmalı (dosya yoksa uyarı, `--require-figures` ile hata).
10. `corrections.json` varsa uygulanır: her kayıt `{ id, field, find, replace, reason, evidence }`; `find` metinde tam bir kez geçmezse hata. Düzeltmeler raporda sayılır.

`bank.json` kaydı: yukarıdaki banka tablosu; `prompt` = `stem`, `explanation_en` = `rationale`, `needs_review` = `true`.

### Görev 4: Grafik ve tablo görselleri

**Dosya:** `scripts/sat/rw/crop-rw-figures.mjs`.

**Tüketir:** `extract-keys.json` kayıtlarındaki `figure` (`page`, `bbox`). **Üretir:** `figures/<id>.webp` ve `figure-crop-report.json`.

**Yöntem:** kaynak sayfa `pdftoppm -r 200 -png` ile çizilir, `bbox` 8 pt kenar payıyla `sharp` ile kırpılır, beyaz zemin, en çok 1.400 px genişlik, WebP. Dosya 512 KB'ı aşarsa kalite düşürülür.

**Kabul:** 48 dosya (23 grafik + 25 tablo); her biri ≤ 512 KB ve WebP; kırpıntının dört kenarında içerik kesilmemiş (kenar şeridi tamamen beyaz; rapor kenarı beyaz olmayanları listeler). Göz kontrolü Görev 9'da.

### Görev 5: Resmî görüntüler ve önizleme

**Dosyalar:** `scripts/sat/rw/slice-rw-formatted.mjs`, `scripts/sat/rw/render-rw-preview.mjs`.

**Üretir:**
- `formatted-images/<id>.png`: formatlı soru PDF'lerindeki soru görüntüleri (her PDF'te gömülü JPEG'ler metin katmanındaki `sıra  id` satırlarıyla aynı sırada; `scripts/sat/slice-math.mjs` matematikteki örnektir). Kabul: 589 hedefin 587'si için dosya var; eksik 2 id raporda (`96f3accc`, `4ba0695d`); her dosyada eşleme bir örnekle gözle doğrulanmış (görüntüdeki ilk sözcükler = `stem` başı, otomatik değil, ajan görüntüye bakar: dosya başına ilk ve son soru).
- `render-rw-preview.mjs --ids <virgülle id listesi> --out <ad>` → `preview/<ad>.html`: her soru için solda resmî görüntü (yoksa formatsız sayfa görüntüsü), sağda bizim kayıt sitedeki kuralla çizilmiş (`splitRichText`; altı çizili `<u>`, italik `<em>`, satır sonları korunur, görsel metnin üstünde, şıklar, doğru cevap, açıklama). Sayfa kendi kendine yeter (görüntüler göreli yolla), ağ istemez.

### Görev 6: Site

**Dosyalar:** `components/sat/MathText.tsx`, `components/sat/QuestionCard.tsx`, `components/sat/SatBankExplorer.tsx`, `lib/sat/domains.ts`, `lib/translations/tr.ts`, `lib/translations/en.ts`, `scripts/check-sat-bank.mjs` (+ gerekiyorsa `components/sat/SatDomainGroup.tsx`, `TopicReportCard.tsx`).

**Kapsam:**
- `MathText` `splitRichText` kullanır; altı çizili `<u>`, italik `<em>` olarak React düğümüyle çizilir (`dangerouslySetInnerHTML` yalnız KaTeX çıktısında kalır).
- `QuestionCard`: `section === "reading-writing"` ise görsel soru metninin üstünde; matematikte yer değişmez.
- RW bölümü matematikle aynı alan grubu görünümünü kullanır. Sıra: Information and Ideas, Craft and Structure, Expression of Ideas, Standard English Conventions. `lib/sat/domains.ts` bölüm bazlı sıra ve etiket anahtarı verir. Etiketler (TR / EN): "Bilgi ve Fikirler" / "Information and Ideas"; "Üslup ve Yapı" / "Craft and Structure"; "Fikirlerin İfadesi" / "Expression of Ideas"; "Standart İngilizce Kuralları" / "Standard English Conventions". Beceri adları matematikteki gibi İngilizce kalır.
- Pano ölçüleri (hazırlık halkası, seviye/XP, rozetler, zayıf konu odağı, yanlışlarım, konu karnesi): ajan her birinin bugün hangi konu kümesini saydığını raporlar. Kural: yeni ölçü ya da rozet eklenmez; RW konuları, matematik konularının girdiği her hesaba aynı kuralla girer. Yalnız matematiğe özel kalan bir hesap varsa raporda gerekçesiyle yazılır.
- Soru sayısı iddiası (2026-10-03 düzeltmesi): yayın, soruların açılmasından ÖNCE çıktığı için bu yayında sayı `1.000+` / `1,000+` kalır ve "matematik sorusu" / "math questions" geçen üç metin (`satQuestions.label`, `homeTools.sat.meta`, `sat.subtitle`) bölüm adı vermeyen "SAT sorusu" / "SAT questions" olur; böylece metin açılmadan önce de sonra da doğrudur. Sayı, sorular canlıda açıldıktan sonraki bir yayında `1.600+` yapılır (canlı sayım 1.608 olmalı; Görev 13 doğrular). Kerem pilot kapısında aksi karar verebilir.
- `check:sat-bank`: `MathText`'in `splitRichText` kullandığını, `QuestionCard`'ın RW'de görseli üstte çizdiğini, `domains.ts`'in dört RW alanını tanıdığını zorlar.

**Kabul:** `npm run check:offline` yeşil; `npm run build` başarılı; matematik soru kartının HTML çıktısı değişmemiş (aynı kayıtla önce/sonra karşılaştırma, bir düz ve bir `$$…$$` açıklamalı soru); önizleme sayfasındaki çizim (Görev 5) ile `MathText` aynı modülü kullanıyor.

### Görev 7: Yazma araçları

**Dosyalar:** `scripts/sat/import-bank.mjs`, `scripts/sat/rw/build-rw-release-package.mjs`, `scripts/sat/test-question-patch.mjs`.

- `import-bank.mjs`: banka kaydında `explanation_en` varsa eklenen satıra yazılır (yalnız yeni id'lerde; var olan id'lerin karşılaştırma kolonları değişmez, insert-only sözleşme aynı). `SAT_BANK_OUT=<…>/tmp/sat-bank/rw` ile çalışınca yalnız RW bankasını okur. Kuru çalıştırma beklenen çıktı: 589 yeni soru, 0 atlanan, 48 yeni görsel.
- `build-rw-release-package.mjs --skills <slug,…> | --all` (salt okuma): canlıdaki `section = reading-writing` ve `needs_review = true` satırlarını okur, `patch-sat-questions.mjs` paket biçiminde (`scripts/sat/lib/question-patch.mjs` `validatePackage`) `needs_review: true → false` paketi kurar; `prompt` ve `choices` beklenen eski değer olarak girer, değişmez. Paket `tmp/sat-bank/rw/release/` altına yazılır.
- Test: `npm run test:sat-patch` sahte istemciyle (1) açıklamalı yeni satırın açıklamasıyla eklendiğini, (2) var olan id'de açıklama farkının yazma üretmediğini, (3) açma paketinin yalnız `needs_review` değiştirdiğini kanıtlar.

**Kabul:** `npm run check:offline` yeşil; `check:sat-bank`'in insert-only ve upsert yasağı kuralları geçer.

## Faz C — Kapılar

### Görev 8: Kör çözücü

- `build-rw-solver-packages.mjs`: `bank.json`'dan 8 paket (≈74 soru; her pakette becerilerin karışımı). Paket kaydı: `id`, `prompt` (işaretli), `choices`, `figure` (varsa dosya yolu). Cevap, açıklama ve zorluk pakete GİRMEZ.
- 8 ajan (Sonnet), birer paket: soruyu yalnız paketteki metin ve görselden çözer; `result-NN.json` → `[{ id, answer, confidence: "high" | "medium" | "low", note }]`. Ajan kaynak PDF'lere, `bank.json`'a ve anahtarlara bakmaz. Soru eksik, bozuk ya da çözülemez görünüyorsa `note` alanına yazar.
- `gate-rw.mjs`: sonuçları resmî cevapla karşılaştırır → `gate-report.json` (uyuşan, uyuşmayan, `note` taşıyan). Paket kaydı sorunun metin özetini (`hash`) taşır; metin sonradan değişirse o sorunun sonucu bayat sayılır ve yeniden açılır. Kapatma kararları `gate-resolutions.json` içinde, güncel özetle tutulur.
- Ana oturum her uyuşmazlığı ve her notu resmî görüntüyle karşılaştırır. Çıkarma kusuruysa betik düzeltilir (tekrarlayan kusur) ya da `corrections.json`'a kanıtıyla girer (tekil kusur); metin doğruysa "çözücü yanıldı" notuyla kapanır. Kapı: açık uyuşmazlık 0.

### Görev 9: Görsel sadakat

- Hedef: altı çizili, görselli, şiirli ve iki metinli soruların tamamı + geri kalandan rastgele 60 (sabit tohum). Paket: `id`, resmî görüntü yolu, bizim `prompt`/`choices`, varsa `figures/<id>.webp`.
- Ajanlar (Sonnet, ≈30 soru/ajan) görüntüye bakıp raporlar: sözcük farkı, eksik/fazla metin, altı çizili bölümün başı-sonu, italik, satır sonları (şiir, liste), boşluk, görselin eksiksizliği ve `prompt`'ta görsel yazısı kalıntısı. Ajan düzeltme YAZMAZ, yalnız bulgu yazar (`visual/result-NN.json`).
- Ana oturum bulguları Görev 8'deki gibi kapatır. Kapı: açık bulgu 0; rastgele 60'ta bulgu çıkarsa örnek 120'ye genişletilir.

### Görev 10: Pilot önizleme — KEREM KAPISI 1

`preview/pilot.html`: 14 soru (düz 3, boşluklu 2, altı çizili 2, grafik 2, tablo 2, şiir 1, iki metin 1, not listesi 1). Kerem yan yana bakar; ayrıca alan etiketleri ve soru sayısı metni onaylanır. Onay yoksa canlı adımlar başlamaz.

## Faz D — Canlı

### Görev 11: Karantinalı ekleme — KEREM KAPISI 2

1. `feat/sat-rw` güncel `main` ile birleştirilir; `npm run check:offline` ve `npm run build`.
2. `validate-rw.mjs --require-figures` temiz; `gate-report.json` açık kayıt 0.
3. `npm run backup:supabase -- --run`, ardından `-- --verify`.
4. `SAT_BANK_OUT=…/tmp/sat-bank/rw node scripts/sat/import-bank.mjs` (kuru): 589 yeni, 0 atlanan, 48 görsel.
5. Kerem onayı → `--apply --project-ref kskbnxxyviowmrlskwke`.
6. Salt okuma doğrulama: toplam 1.608; `reading-writing` 589, hepsi `needs_review = true`; matematik 1.019 ve `needs_review` 0; `sat-figures` deposu 258 → 306 nesne; beceri başına sayılar tabloyla aynı; rastgele 10 satır `bank.json` ile birebir.

Bu adımdan sonra sitede ve uygulamada görünen hiçbir şey değişmez.

### Görev 12: Yayın — KEREM KAPISI 3

Tek toplu push (bekleyen `b59272f` dahil). Yayın sonrası seyrek kontrol: ana sayfa 200, soru sayısı metni, oturumsuz `/api/sat/questions` reddi. `docs/STATUS.md` #100 notundaki girişli formül kontrolü aynı ziyarette yapılır.

### Görev 13: Açma — KEREM KAPISI 4

1. Pilot: `build-rw-release-package.mjs --skills text-structure-and-purpose,command-of-evidence` (152 soru; altı çizili + grafik/tablo) → kuru çalıştırma → Kerem onayı → `patch-sat-questions.mjs --apply …`.
2. Kerem girişliyken bakar: bir altı çizili soru, bir grafik, bir tablo, bir açıklama; telefonda tablo okunaklılığı. Sorun varsa aynı araçla `--rollback`.
3. Kalan 437 soru aynı yolla açılır.
4. Son sayım: `needs_review` 0; konu listesi 19 → 29 konu; toplam 1.608.

### Görev 14: Kayıt

`docs/STATUS.md` (iş kapanışı, #22 güncellemesi), `AGENT_CONTEXT.md` "SAT Soru Bankasi" (RW metin sözleşmesi, görsel sırası, yeni betikler, sayılar), `docs/superpowers/INDEX.md` ve bu belgenin durum satırı (kanıt commit'leriyle), `~/eduitalya/docs/ARKA_UC.md` (işaret kuralı, RW'de görsel üstte, konu sayısı), bellek notu.

## Görev sırası ve ajanlar

| Sıra | Görev | Kim | Not |
| --- | --- | --- | --- |
| 1 | 1 | 1 ajan (Opus) | Diğer her şey buna dayanır |
| 2 | 2 → 3 → 4 | 1 ajan (Opus), `.worktrees/sat-rw` | Sıralı |
| 2 | 5 | 1 ajan (Sonnet), aynı worktree, ayrı dosyalar | Görev 2 çıktısını yalnız önizlemede kullanır |
| 2 | 6 + 7 | 1 ajan (Opus), `.worktrees/sat-rw-site` (dal `feat/sat-rw-site`, Görev 1 commit'inden) | Ana oturum `feat/sat-rw`'ye birleştirir |
| 3 | 8, 9 | 8 + ~7 ajan (Sonnet), iki dalga | Yalnız `tmp/sat-bank/rw/` altına yazar |
| 4 | 10-14 | Ana oturum + Kerem kapıları | |

## Kapsam dışı

- Yalnız formatlı sürümde bulunan 259 soru (Kerem kararı, 2026-10-03).
- Türkçe açıklama (`explanation_tr`), süreli deneme modu, yeni rozet/ölçü.
- Tabloların metin olarak (HTML tablo) gösterimi; pilotta telefonda okunaklılık yetersiz bulunursa ayrı iş açılır.
- `~/eduitalya` uygulama kodu (yalnız sözleşme notu güncellenir).
