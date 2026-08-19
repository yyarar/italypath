# Eksik Şehir Rehberi İçerikleri Tasarımı

**Tarih:** 2026-08-19  
**Durum:** Kullanıcı tarafından onaylandı  
**Araştırma girdileri:** `city-content-research/outline.yaml`, `city-content-research/fields.yaml`

## Amaç

ItalyPath şehir atlasında yalnız genel fallback metniyle gösterilen gerçek şehirleri araştırılmış, kaynak izi bulunan ve TR/EN paralel içeriklerle tamamlamak. Yeni şehirlerde tek tek Numbeo fiyatı toplamak yerine üç seviyeli, açıkça yaklaşık olarak etiketlenen merkezi bir öğrenci bütçesi modeli kullanılacak. Her yeni şehir Wikipedia kaynaklı kısa bir tarihçe, güncel ve kısa bir ulaşım özeti ve öğrenci açısından şehir karakteri kazanacak.

## Kapsam

Bu faz yalnız aşağıdaki 25 görünür şehri kapsar:

1. Perugia
2. Aosta
3. Bergamo
4. Bolzano
5. Brescia
6. Cagliari
7. Camerino
8. Casamassima
9. Cassino
10. Castellanza
11. Catania
12. Cenova (`Genova` kaynak adı)
13. Ferrara
14. Lecce
15. Macerata
16. Messina
17. Palermo
18. Pescara
19. Pollenzo
20. Reggio Calabria
21. Sassari
22. Teramo
23. Udine
24. Urbino
25. Viterbo

Mevcut 16 Numbeo kaynaklı şehir ve kaynak metadatası olmayan fakat özel içeriği bulunan Trento bu fazda değiştirilmez. Yeni tarihçe alanı bu nedenle opsiyoneldir ve yalnız yeni 25 kayıtta zorunlu tutulur.

`Piemonte` bir şehir olmadığı için şehir rehberi seçeneklerinden çıkarılır. Università del Piemonte Orientale üniversite ve program verileri korunur; Supabase satırı silinmez veya değiştirilmez. Alessandria, Novara ve Vercelli bu fazda ayrı rehber olarak eklenmez.

## Kapsam Dışı

- Mevcut 17 özel içerikli şehrin fiyat, metin veya kaynak modelini migrate etmek
- Mevcut 17 şehre Wikipedia tarihçesi eklemek
- Şehir başına Numbeo veya ilan sitesi fiyatı toplamak
- Canlı fiyat scraper'ı, generator veya zamanlanmış veri işi kurmak
- Supabase şemasını ya da üniversite/program satırlarını değiştirmek
- Chieti, Bra, Alessandria, Novara veya Vercelli'yi ayrı görünür şehir rehberi yapmak
- Öğrenci nüfusu veya uzun editoryal tavsiye araştırmak
- Saat, sefer veya bilet fiyatı gibi hızla eskiyen ulaşım ayrıntılarını saklamak

## Araştırma Süreci

### Ön Kontrol

Derin araştırma başlamadan önce canlı Supabase `universities` verisi yeniden okunur. Normalizasyon sonrası görünür ve araştırılmamış 25 şehir ile bu belgedeki liste birebir karşılaştırılır. `Piemonte` yalnız şehir rehberinde hariç tutulur; UPO kaydının üniversite ve program yüzeylerinde kalması doğrulanır.

### Dağıtım

Araştırma en fazla üç paralel ajanla ve ajan başına en fazla üç görünür şehirle yürür:

- Dalga 1
  - Ajan A: Aosta, Bergamo, Brescia
  - Ajan B: Bolzano, Castellanza, Udine
  - Ajan C: Perugia, Camerino, Urbino
- Dalga 2
  - Ajan A: Cagliari, Sassari, Palermo
  - Ajan B: Catania, Messina, Reggio Calabria
  - Ajan C: Casamassima, Lecce, Pescara
- Dalga 3
  - Ajan A: Cassino, Viterbo, Teramo
  - Ajan B: Cenova, Ferrara, Macerata
  - Ajan C: Pollenzo

Ham sonuçlar `city-content-research/results/<slug>.yaml` altında çalışma artefaktı olarak tutulur. `city-content-research/results/` `.gitignore` ile hariç tutulur; uygulama runtime'ına girmez ve repoya commitlenmez. Onaylanan gerçekler ve kaynak URL'leri TypeScript şehir kaydına aktarılır.

### Kaynak Standardı

- Tarihçe için uygun Wikipedia maddesi kullanılır. Türkçe madde yoksa İngilizce veya İtalyanca madde seçilir.
- Tarihçe metni kopyalanmaz. Aynı olguları taşıyan 2–3 cümlelik TR ve EN paraphrase yazılır.
- Tarihçe kaynağının başlığı, doğrudan URL'si ve erişim tarihi saklanır ve UI'de gösterilir.
- Ulaşım için öncelik resmî üniversite, belediye veya ulaşım işletmecisi sayfasıdır.
- Ulaşım özeti ulaşım türleri, ana istasyon/terminal ve gerekiyorsa kampüs–yaşam üssü ilişkisini anlatır; sefer saati ve değişken fiyat içermez.
- Şehir karakteri kısa tutulur; iklim, ölçek, kentsel biçim ve günlük öğrenci ritmini tek paragrafta birleştirir.
- Her sonuç `sourceConfidence`, `sourceRetrievedAt`, `reviewStatus`, `reviewPriority` ve `uncertain` alanlarını taşır.
- Yalnız `reviewStatus: source-checked` olan sonuç uygulama verisine alınır.

### Özel Yer Kuralları

- `Cenova` kullanıcıya gösterilen Türkçe addır; kaynak eşlemesi `Genova` ile yapılır.
- `Aosta` için İtalyanca ve Fransızca resmî ad varyantları korunur.
- `Bolzano` için `Bolzano/Bozen` iki dilli ad varyantı korunur.
- `Pollenzo` kampüs yerleşimidir; öğrencinin günlük yaşam üssü olan Bra ulaşım ve şehir karakterinde açıklanır, fakat ayrı rehber olmaz. Fiyat tier'i Pollenzo'nun tek başına küçük yerleşim olmasına göre değil Bra'daki gerçek öğrenci yaşamına göre seçilir.
- `Pescara` içeriği üniversitenin Chieti–Pescara çift şehirli yapısını açıklar; Chieti ayrı rehber olmaz.
- `Casamassima` ve `Castellanza` için kampüs belediyesi ile daha geniş günlük yaşam/ulaşım koridoru birbirine karıştırılmaz.

## Veri Mimarisi

### Merkezi Tier Kataloğu

Yeni `lib/cities/costTiers.ts` üç bütçe tanımı ve materializer helper'larını taşır. Tier anahtarları:

```ts
export type CityCostTier = "budget" | "balanced" | "high";

export type CityCostCluster =
  | "regional-capital"
  | "provincial-student-city"
  | "micro-campus-town"
  | "tourism-heavy"
  | "island-premium"
  | "alpine-premium"
  | "metro-satellite";
```

Her tanım TR/EN kira, temel gider ve ulaşım metinleri ile mevcut UI için `costRating` eşlemesini taşır:

| Tier | Özel oda | Küçük stüdyo | Kira hariç temel gider | Öğrenci ulaşımı aylık karşılık | `costRating` |
| --- | --- | --- | --- | --- | --- |
| `budget` / Ekonomik | 250–400€ | 450–650€ | 220–300€ | 20–30€ | 2 |
| `balanced` / Dengeli | 350–550€ | 600–850€ | 260–360€ | 25–40€ | 3 |
| `high` / Yüksek | 500–750€ | 850–1.250€ | 320–450€ | 35–55€ | 4 |

Aralıkların örtüşmesi bilinçlidir. Bunlar kesin ilan veya piyasa fiyatı değil, öğrencinin ilk bütçe planı için editoryal bantlardır. Yeni kayıtlarda maliyet kaynağı UI'de TR/EN olarak “ItalyPath yaklaşık öğrenci bütçesi” şeklinde görünür. Model sürümü `2026-08` olur. Şehir başına dış fiyat URL'si gösterilmez.

Tier ataması araştırmacının `costCluster` ve `costTierRationale` alanlarıyla gerekçelendirilir. İzin verilen cluster değerleri:

- `regional-capital`
- `provincial-student-city`
- `micro-campus-town`
- `tourism-heavy`
- `island-premium`
- `alpine-premium`
- `metro-satellite`

Tier ataması yalnız cluster adına otomatik bağlanmaz; yerleşimin gerçek öğrenci yaşam üssü ve birden fazla premium etkisi editoryal kontrolde değerlendirilir. Aynı kararı tekrar verebilmek için gerekçe zorunludur.

### Yeni Şehir Kayıtları

Yeni `lib/cities/tieredData.ts`, 25 sade `TieredCityRecord` kaydı taşır. Kayıt, şehir başına fiyat metni tekrarlamaz:

```ts
export interface TieredCityRecord {
  slug: string;
  name: string;
  nameEn: string;
  cityNameIt: string;
  altNames: string[];
  region: string;
  placeHierarchy: "city" | "hamlet" | "satellite-town" | "dual-city";
  primaryStudentBase?: string;
  costTier: CityCostTier;
  costCluster: CityCostCluster;
  costTierRationale: string;
  historyShort: string;
  historyShortEn: string;
  historySourceTitle: string;
  historySourceUrl: string;
  transportDetails: string;
  transportDetailsEn: string;
  climateAndVibe: string;
  climateAndVibeEn: string;
  transportSourceUrls: string[];
  sourceRetrievedAt: string;
  sourceConfidence: "official" | "mixed" | "wikipedia-only";
  reviewStatus: "source-checked";
  reviewPriority: string[];
  uncertain: string[];
}
```

`materializeTieredCity(record)` tier tanımını kayda ekleyerek UI'nin kullandığı `CityDetail` üretir. `lib/cities/data.ts` mevcut 17 kaydı değiştirmeden bu 25 materialized kaydı aynı `CURATED_CITIES` kataloğunda birleştirir. Böylece şehir atlası ve Hub önerileri aynı katalogdan yararlanır.

### `CityDetail` Değişiklikleri

`types/cities.ts` aşağıdaki opsiyonel görünür alanları alır:

```ts
contentStatus?: "researched" | "unresearched";
historyShort?: string;
historyShortEn?: string;
historySourceTitle?: string;
historySourceUrl?: string;
sourceRetrievedAt?: string;
costModel?: "external" | "italypath-tier";
costModelVersion?: string;
```

Sade kayıt ve güvenli fallback desteği için şu mevcut alanlar opsiyonel olur:

- `studentPopulation`, `studentPopulationEn`
- `costRating`
- `rentAverage`, `rentAverageEn`
- `livingExpenses`, `livingExpensesEn`
- `transportCost`, `transportCostEn`
- `transportDetails`, `transportDetailsEn`
- `climateAndVibe`, `climateAndVibeEn`
- `editorialTip`, `editorialTipEn`

Yeni 25 researched kayıt tarihçe, tier'den türemiş fiyatlar, ulaşım ve şehir karakterini her zaman taşır. Yalnız öğrenci nüfusu ve editoryal tavsiye araştırılmaz. Opsiyonellik esas olarak güvenli fallback'in iddia uydurmadan oluşturulabilmesi içindir.

### Güvenli Fallback

`getFallbackCityDetail()` artık genel kira, ulaşım veya şehir karakteri üretmez. Yalnız kimlik, bölge ve `contentStatus: "unresearched"` taşır. UI bu durumda araştırılmış detay kartlarını gizleyip “Bu şehir rehberi hazırlanıyor” mesajını, üniversite listesini ve mevcutsa bölgesel burs bağlantısını gösterir.

## Çözümleme ve Normalizasyon

`lib/cities/normalization.ts` server ve client için tek kaynak olmaya devam eder.

- `Piemonte` şehir rehberi exclusion setine eklenir.
- UPO üniversite satırı ve programları hiçbir veri kaynağından silinmez.
- `getCityDetailByName()` veya eşdeğer tek resolver ad, İngilizce ad, İtalyanca ad ve slug üzerinden kayıt çözer. `getCityDetailBySlug(name)` gibi boşluklu şehirlerde initial-render fallback'ine yol açan çağrı pattern'i bırakılmaz.
- `Napoli / Caserta` ve `Uzaktan Eğitim / Roma` alias'ları, `Benevento / Online` exclusion'ı korunur.

## UI Tasarımı

### Tarihçe

`CityGuidesExplorer` içinde başlık bloğundan sonra, maliyet kartından önce “Kısaca tarih” bölümü görünür. Bölüm yalnız `historyShort`/`historyShortEn` varsa render edilir. Metnin altında Wikipedia madde başlığına giden dış bağlantı ve erişim tarihi gösterilir.

Mevcut 17 şehir bu fazda tarihçe almadığı için bu bölüm onlarda görünmez.

### Fiyat Etiketi

- `costModel: "italypath-tier"` olan şehirde çevrilmiş yaklaşık bütçe etiketi ve `2026-08` model sürümü görünür.
- Mevcut `costSourceName`/`costSourceUrl` taşıyan 16 şehir eski Numbeo kaynak linkini göstermeye devam eder.
- Trento mevcut kaynaksız görünümünü korur.
- Fiyat kartı ancak üç maliyet alanı da mevcutsa render edilir.

### Opsiyonel Alanlar

- Başlıktaki öğrenci nüfusu satırı yalnız ilgili dilde değer varsa görünür.
- Editoryal tavsiye kartı yalnız ilgili dilde değer varsa görünür.
- Ulaşım ve şehir karakteri kartları yalnız ilgili dilde değer varsa görünür.
- Bu koşullar TR ve EN arasında aynı yapısal davranışı taşır.

### Araştırılmamış Durum

`contentStatus: "unresearched"` durumunda fiyat, tarihçe, ulaşım, şehir karakteri ve editoryal tavsiye kartları gösterilmez. Görünür mesaj hiçbir fiyat veya güvenlik/otantiklik iddiası içermez. Üniversite listesi ve bölgesel burs kartı kullanılabilir kalır.

Mevcut responsive düzen, animasyon, reduced-motion davranışı ve dirty worktree'deki şehir sayfası görsel değişiklikleri korunur. Uygulama bu dosyaları eski sürüme döndürmez veya toplu yeniden yazmaz.

## Çeviriler

Yeni tüm UI metinleri `lib/translations.ts` içindeki `citiesGuide` namespace'ine TR/EN paralel eklenir:

- kısa tarihçe başlığı
- Wikipedia kaynak etiketi
- kaynak erişim tarihi
- ItalyPath yaklaşık bütçe etiketi
- model sürümü etiketi
- şehir rehberi hazırlanıyor başlığı ve açıklaması

Şehir içerikleri komponent içinde hard-code edilmez; `tieredData.ts` kaydından gelir.

## Doğrulama Sözleşmesi

`scripts/check-cities-data.mjs` şu kuralları doğrulayacak biçimde genişletilir:

1. Mevcut 17 şehir kaydı ve 16 Numbeo kaynak sözleşmesi korunur.
2. Yeni 25 slug eksiksiz ve tekildir.
3. Her yeni kayıt izin verilen üç tier'den birini ve izin verilen cost cluster değerini kullanır.
4. Her yeni kayıt TR/EN tarihçe, ulaşım ve şehir karakteri taşır.
5. Her yeni kayıt doğrudan Wikipedia URL'si, en az bir ulaşım kaynak URL'si, ISO erişim tarihi ve `source-checked` durumu taşır.
6. `uncertain` alanı bulunur; boşsa boş array olarak açıkça yazılır.
7. Tier materializer doğru TR/EN aralıklarını ve `2/3/4` rating eşlemesini üretir.
8. `Piemonte` şehir rehberi seçeneklerinden hariç tutulur; üniversite verisi için silme veya filtreleme eklenmez.
9. Güvenli fallback genel fiyat, ulaşım, iklim, güvenlik veya otantiklik iddiası taşımaz.
10. UI tarihçe, öğrenci nüfusu, editoryal tavsiye ve araştırılmamış durum için koşullu render sözleşmesini taşır.

Son kabul komutları:

```bash
npm run check:cities
npm run check:routes
npm run lint
npm run build
```

Canlı Supabase ön kontrolü ayrı read-only kabul adımıdır. Bu faz veritabanına yazmaz.

## Başarı Ölçütleri

- Şehir atlasında `Piemonte` hariç mevcut gerçek şehir seçeneklerinin tümü araştırılmış içerik gösterir.
- Yeni 25 şehrin her birinde kaynaklı kısa tarihçe, ulaşım özeti, şehir karakteri ve açıkça yaklaşık etiketlenmiş merkezi tier bütçesi bulunur.
- Mevcut 17 şehir görünüm ve veri açısından gerilemez.
- Araştırılmamış yeni bir şehir geldiğinde uygulama uydurma fallback bilgisi göstermez.
- TR ve EN içerik aynı olguları ve aynı görünür alan yapısını taşır.
- Ham araştırma artefaktları runtime veya client bundle'a girmez.
- Kullanıcıya ait mevcut city UI değişiklikleri korunur.
