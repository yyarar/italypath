# Tasarım: SAT Math İngilizce Rationale Çıkarma Operasyonu

Tarih: 2026-07-24

Durum: Tasarım kullanıcı tarafından onaylandı; yürütme planı hazır

Yürütme planı:
`docs/superpowers/plans/2026-07-24-sat-english-rationale-extraction.md`

## Amaç

Mevcut ItalyPath SAT Math bankasındaki resmî kaynakla doğrudan eşleşen sorular
için College Board answer-key PDF'lerinde bulunan İngilizce `Rationale`
metinlerini kaynak sadakatiyle yapılandırılmış bir yan veri setine çıkarmak.

Bu faz bir içerik çıkarma operasyonudur. Uygulama kodu, Supabase verisi, API,
UI ve canlı kullanıcı deneyimi değiştirilmez.

## Sabit Kapsam

Hedef küme şu kesişimle belirlenir:

```text
mevcut tmp/sat-bank/bank.json Math soru ID'leri
∩
Unformatted Math Answer Key PDF'lerindeki rationale ID'leri
= 806 soru
```

Bu sayı operasyon başlamadan yeniden mekanik olarak doğrulanır ve hedef ID
listesi dondurulur. Operasyon sırasında kaynak klasör değişirse aynı run devam
ettirilmez; yeni envanter ve checksum ile yeni run açılır.

### Kapsam dışı

- Mevcut bankanın dışında tutulan `Area and Volume 1` kaynaklı 20 soru
- Mevcut bankada olup resmî Unformatted rationale setinde doğrudan eşleşmeyen
  213 soru
- Unformatted rationale setinde bulunup mevcut bankada olmayan 15 soru
- Türkçe çeviri veya Türkçe çözüm üretimi
- Resmî kaynakta olmayan sorular için özgün açıklama yazımı
- `explanation_tr`, yeni bir İngilizce alan veya başka bir DB şeması değişikliği
- Supabase import/backfill
- API, client type, cache veya soru kartı değişikliği
- Reading and Writing rationale'ları

## Kaynak Gerçeği

Kaynak kök:

```text
/Users/keremyarar/Desktop/SAT Question Bank PDFs
```

Bu operasyonun tek yetkili rationale kaynağı:

```text
Question Bank (Unformatted)/Answer Keys/Math/
```

Güncel kaynak envanteri:

- 57 Math Unformatted Answer Key PDF
- 821 Math rationale kaydı
- Mevcut banka ile doğrudan ID eşleşmesi: 806
- Mevcut bankada rationale eşleşmesi olmayan soru: 213
- Rationale setinde olup mevcut bankada olmayan kayıt: 15

PDF metin katmanı düz İngilizce metni taşır; fakat birçok matematik ifadesi
gömülü görsel/PDF nesnesi olduğu için yalnızca `pdftotext` kullanmak ifadeleri
boş bırakır. Bu nedenle salt metin çıkarma kaynak sadakati için yeterli değildir.

## Değerlendirilen Yaklaşımlar

### 1. Yalnızca metin katmanı

PDF'ler `pdftotext` ile ayrıştırılır ve çıkan metin doğrudan saklanır.

Reddedilme nedeni: Matematik ifadeleri, tablolar ve bazı semboller boşluk olarak
çıkar. Hızlıdır fakat sessiz içerik kaybı üretir.

### 2. Tamamen serbest görsel transkripsiyon

Her answer-key sayfası yalnızca görsel olarak okunur; ID, sınırlar ve içerik
tamamen agent tarafından belirlenir.

Reddedilme nedeni: Kaynak sayfa ve ID eşlemesinde gereksiz hata riski oluşturur,
mekanik olarak çözülebilecek işi modele bırakır ve 806 kayıtta maliyeti artırır.

### 3. Hibrit, kaynak-sadık çıkarma

Seçilen yaklaşım:

1. Soru ID'si, kaynak PDF ve sayfa aralığı mekanik olarak belirlenir.
2. Metin katmanı yardımcı bağlam olarak alınır.
3. Aynı kaynak sayfa görsel olarak okunur.
4. `Rationale` bölümü tam İngilizce metin olarak aktarılır.
5. Görsel matematik ifadeleri LaTeX'e dönüştürülür.
6. Ayrı bir reviewer aynı kaynak sayfaya bakarak kaydı doğrular.

Bu yaklaşım mekanik eşlemenin güvenilirliğini görsel transkripsiyonun matematik
sadakatiyle birleştirir.

## İçerik Sözleşmesi

Her hedef soru için tek kayıt üretilir:

```json
{
  "id": "84664a7c",
  "explanation_en": "Choice A is correct. ...",
  "source_file": "Question Bank (Unformatted)/Answer Keys/Math/Algebra/Linear Functions 1 Answer Key.pdf",
  "source_pages": [1],
  "needs_review": false,
  "review_note": null
}
```

Alan kuralları:

- `id`: Mevcut bankadaki 8 haneli küçük harf hex soru kimliği.
- `explanation_en`: Yalnızca resmî `Rationale` bölümünün tam İngilizce içeriği.
- `source_file`: Kaynak köke göre göreli PDF yolu.
- `source_pages`: Rationale'ın bulunduğu bir veya daha fazla 1-based PDF sayfası.
- `needs_review`: Okunamayan, uyuşmayan veya belirsiz içerikte `true`.
- `review_note`: Yalnızca `needs_review=true` iken kısa ve somut neden.

### Metin sadakati

- İngilizce metin çevrilmez, özetlenmez, sadeleştirilmez veya yeniden yazılmaz.
- Doğru cevabın açıklaması ve yanlış seçeneklerin neden yanlış olduğu paragraflar
  birlikte korunur.
- `Correct Answer` başlığı, soru gövdesi ve `Question Difficulty` alanı
  `explanation_en` içine alınmaz.
- PDF'nin görsel satır kırımları paragraf sınırı değildir. Yapay satır kırımları
  ve satır sonu tirelemeleri mekanik olarak düzeltilir.
- Anlam taşımayan fazla boşluklar normalize edilebilir.
- Kaynaktaki paragraf sırası ve anlamlı vurgu korunur.
- Kaynakta yazım veya ifade tuhaflığı varsa agent bunu “düzeltmez”.

### Matematik sözleşmesi

- Inline matematik `$...$`, gerçekten ayrı satır gereken matematik `$$...$$`
  kullanır.
- Kesirler `\frac{a}{b}`, üsler `x^{2}`, kökler `\sqrt{x}` biçimindedir.
- Değişkenler ve matematiksel eşitlikler uygun delimiter içinde tutulur.
- Para tutarlarında dolar işareti `\$` olarak kaçırılır.
- Görselde okunamayan sembol tahmin edilmez; kayıt `needs_review=true` olur.
- Metin katmanında boş kalan formül görsel sayfadan geri kazanılmadan kayıt
  tamamlanmış sayılmaz.
- Yukarıdaki örnekler parse edilmiş mantıksal metni gösterir. JSON kaynak
  dosyasında her backslash JSON kurallarına göre iki kez yazılır: `\\frac`,
  `\\sqrt` ve `\\$`. Her shard bir JSON parse → serialize → parse round-trip
  kontrolünden geçer; form feed'e dönüşmüş `\f` veya geçersiz escape kabul
  edilmez.

## Çıktı Yerleşimi

Çalışma shard'ları mevcut pipeline kuralına uyar:

```text
tmp/sat-bank/explanations-en/
```

Bu klasör Git'e girmez. Her extractor tek bir kaynak-PDF shard'ına sahip olur;
aynı JSON dosyasını aynı anda iki agent düzenlemez. Sahiplik devri yalnız
orkestrasyon kaydıyla yapılabilir.

Önerilen shard adı:

```text
<normalize-edilmis-source-file>-explanations.json
```

Birleştirilmiş çalışma çıktısı:

```text
tmp/sat-bank/explanations-en.json
```

Donmuş hedef listesi:

```text
tmp/sat-bank/explanations-en/target-ids.json
```

Operasyon kabulünden sonra kalıcı, Git dışı teslim kopyası:

```text
/Users/keremyarar/Documents/Codex/2026-07-01/sat-question-bank-pdfs/outputs/explanations-en/
```

Kalıcı teslim klasörüne yazmadan önce gerekli dosya sistemi izni ayrıca alınır.
Teslim paketi şunları içerir:

- `target-ids.json`
- `explanations-en.json`
- `reviews.json`
- `run-manifest.json`
- `qa-report.json`
- `gap-report.json`
- `SHA256SUMS`

`run-manifest.json`, dondurulmuş hedef ID listesinin checksum'ını, kaynak PDF
checksum'larını, prompt sürümünü, wave kimliklerini ve tamamlanma zamanını taşır.

`reviews.json`, her ID için reviewer görev kimliğini, `approved` veya `rejected`
durumunu, kaynak-sadakat kontrolünü, matematik kontrolünü, cevap tutarlılığı
sonucunu ve varsa somut düzeltme notunu taşır.

## Orkestrasyon

### Görev sahipliği

- Ana agent hedef listeyi, wave dağılımını ve kabul kapılarını yönetir.
- Extractor yalnızca kendisine atanan kaynak PDF shard'ını yazar.
- Reviewer extractor ile aynı agent olamaz.
- Bir reviewer kaydı kaynak PDF sayfasıyla karşılaştırmadan `approved` sayamaz.
- Reviewer düzeltme gerekiyorsa doğrudan sessizce yeniden yazmaz; kayıt somut
  notla correction kuyruğuna döner.
- Correction aynı shard'ın mevcut extractor sahibine döner. Extractor
  kullanılamıyorsa ana agent tüm shard sahipliğini tek seferde yeni bir
  correction writer'a devreder ve devri `run-manifest.json` içinde kaydeder.
  Aynı shard üzerinde hiçbir zaman iki aktif writer bulunmaz.
- Correction tamamlandıktan sonra farklı bir reviewer ikinci kez kontrol eder.

### Eşzamanlılık

- Mevcut çalışma ortamı toplam dört agent slotu sunduğu için ana agent dışında
  aynı anda en fazla üç extractor/reviewer görevi yürütülür.
- Wave'ler kaynak PDF bazında ayrılır.
- Her wave sonunda shard'lar birleşmeden önce yapısal kontrol çalışır.
- Bir wave başarısızsa sonraki wave başlatılmaz; kök neden bulunur.

Bu model önceki SAT soru çıkarma operasyonundaki dosya sahipliği ve pilot
kapısı desenini korur.

## Pilot

Toplu operasyondan önce 40 soruluk dondurulmuş pilot çalıştırılır.

Pilot seçimi:

- 19 Math skill'inin her birinden iki doğrudan eşleşen soru
- Kalan iki ayrı kayıt:
  - seçilmiş olmayan bir SPR/sayı girişli soru
  - seçilmiş olmayan ve SPR ek kaydıyla aynı olmayan, `figure_path` taşıyan bir
    grafik, tablo veya geometri sorusu
- Dört Math domain'inin tamamı
- Zorluk 1, 2 ve 3'ün tamamı

Seçim deterministiktir:

1. Skill slug'ları alfabetik sıralanır.
2. Her skill için ilk kayıt; `figure_path` varlığı, `spr` türü, yüksek zorluk
   ve son olarak düşük ID önceliğiyle seçilir.
3. İkinci kayıt, ilk kayda göre sırasıyla farklı soru türü, farklı figure
   durumu ve farklı zorluk önceliğiyle; eşitlikte yüksek zorluk ve düşük ID ile
   seçilir.
4. Bir skill'de iki hedef yoksa mevcut hedeflerin tamamı alınır. Eksik yerler,
   henüz seçilmemiş hedefler arasından `figure_path`, `spr`, yüksek zorluk,
   alfabetik skill slug ve düşük ID sırasıyla doldurulur.
5. İlk 38 kayıtta eksik zorluk seviyesi varsa eksik seviyeler küçükten büyüğe
   işlenir. İlgili zorluktaki henüz seçilmemiş adaylar alfabetik skill slug ve
   düşük ID ile sıralanır. Aday, aynı skill'in ikinci kaydının yerine geçirilir;
   ancak bu takas mevcut başka bir zorluk seviyesinin son örneğini kaldıramaz.
   Uygun aday yoksa seçim bloklanır.
6. İlk ek kayıt, henüz seçilmemiş SPR hedefleri arasından yüksek zorluk ve düşük
   ID ile seçilir. İkinci ek kayıt, ilk ek kayıttan farklı olmak şartıyla henüz
   seçilmemiş `figure_path` hedefleri arasından yüksek zorluk ve düşük ID ile
   seçilir.

Seçim sonucu tam 40 farklı ID, dört domain, üç zorluk seviyesi, en az bir SPR
ve en az bir ayrı `figure_path` kaydı üretmezse pilot başlamaz; hedef metadata
veya seçim kuralındaki tutarsızlık ana agent'a raporlanır.

Pilot çıktısı, tabakalı örnekler ve QA özeti kullanıcıya sunulur. Kullanıcı açıkça
onaylamadan kalan 766 soruya geçilmez.

## Doğrulama ve Kabul Kapıları

### 1. Yapısal doğrulama

- Pilot için tam 40, final için tam 806 kayıt
- Her ID hedef listede
- Eksik, fazla veya yinelenen ID yok
- Her kayıtta dolu `explanation_en`
- Her kayıtta geçerli `source_file` ve en az bir `source_pages` değeri
- `needs_review=false` kayıtlarında `review_note=null`
- Kaynak PDF yolu gerçekten mevcut

### 2. Kaynak sadakati

- Her kayıt bağımsız reviewer tarafından görsel kaynakla karşılaştırılmış
- Rationale paragraf sırası korunmuş
- Yanlış seçenek açıklamaları kaybolmamış
- Kaynakta olmayan yorum, çözüm adımı veya ipucu eklenmemiş
- İngilizce içerik Türkçeleştirilmemiş veya yeniden ifade edilmemiş

### 3. Matematik doğruluğu

- LaTeX delimiter'ları dengeli
- Görsel formül boşluğu kalmamış
- Değişken, üs, kesir, kök, eşitsizlik ve para işaretleri görselle uyumlu
- Uygun olduğunda mevcut `MathText` sözleşmesiyle render edilebilir ifade
- Rationale'ın vardığı sonuç mevcut bankadaki `correct_answer` ile uyumlu

### 4. Final kabul

- 806/806 kayıt yapısal kontrolden geçmiş
- 806/806 kayıt bağımsız review'dan geçmiş
- Açık `needs_review` kaydı: 0
- Cevap çelişkisi: 0
- Eksik rationale: 0
- Ekstra veya kapsam dışı kayıt: 0
- Birleşik dosya ve teslim paketi checksum'ları üretilmiş
- Uygulama, DB ve canlı sistem değişikliği: 0

## Hata Politikası

- ID doğrudan eşleşmiyorsa içerik benzerliğine bakıp otomatik bağlama yapılmaz.
- Kaynak metin ile mevcut doğru cevap çelişirse mevcut banka veya kaynak sessizce
  değiştirilmez; kayıt bloklanır ve ana agent'a raporlanır.
- Rationale iki sayfaya taşıyorsa tüm sayfalar `source_pages` içinde tutulur.
- Formül veya sembol okunamıyorsa tahmin edilmez.
- Bir kayıt doğrulanamıyorsa eksik bırakmak, uydurma içerikle tamamlamaya tercih
  edilir; ancak final kabul kapısı açık kayıt varken geçmez.
- Kaynak PDF checksum'ı run sırasında değişirse operasyon durur ve hedef/source
  envanteri yeniden oluşturulur.

## Riskler ve Önlemler

1. **Metin katmanı formülleri düşürür.**

   Önlem: Her kayıt için görsel kaynak kontrolü ve bağımsız review.

2. **Formatted ve Unformatted ID kümeleri aynı değildir.**

   Önlem: Yalnız doğrudan kesişimdeki dondurulmuş 806 ID; fuzzy eşleme yok.

3. **Paralel agent'lar aynı dosyayı bozabilir.**

   Önlem: Kaynak-PDF bazlı tekil shard sahipliği.

4. **Agent resmî metni iyileştirmeye çalışabilir.**

   Önlem: Prompt'ta çeviri, özet, sadeleştirme ve yeni çözüm üretme yasağı;
   reviewer kaynak-sadakat kontrolü.

5. **Ignore edilen çalışma çıktısı kaybolabilir.**

   Önlem: Her kabul edilen wave sonrası checksum; finalde Git dışı kalıcı teslim
   paketi.

6. **Korumalı SAT içeriği Git'e sızabilir.**

   Önlem: Kaynak ve rationale çıktıları repo geçmişine commit edilmez;
   `tmp/sat-bank/` ve Git dışı teslim alanı kullanılır.

## Faz Sonu Teslimi

Bu faz tamamlandığında kullanıcıya şunlar sunulur:

- 806 İngilizce resmî rationale kaydı
- Kaynak PDF ve sayfa izi
- Her kayıt için bağımsız review sonucu
- Kapsama ve kalite metriklerini içeren QA raporu
- Checksum'lı, Git dışı teslim paketi
- 213 rationale'sız mevcut soru ve kapsam dışı 20 soru için değişmeden bırakılmış
  ayrı boşluk raporu

Sonraki faz ancak ayrı tasarım ve kullanıcı onayıyla başlayabilir. Olası sonraki
fazlar: 213 soruya özgün İngilizce çözüm üretimi, veri alanı kararı, DB backfill
ve cevap sonrası UI gösterimi.
