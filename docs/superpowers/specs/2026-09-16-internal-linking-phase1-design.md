# İç Bağlantı Ağı, 1. Faz — Tasarım

Tarih: 2026-09-16
Durum (2026-09-21): **UYGULANDI** — 4c112cf (2026-09-16); SEO_AUDIT §22. Tasarım sırasındaki durum: "Kerem onayladı (sohbet). Kapsam sınırlı (yeni URL yok), plan belgesi gerekmedi.".
İlgili: `SEO_AUDIT.md` §21 (Google'ın Haziran'dan beri geri gelmemesi), §22 (bu işin kaydı)

## Amaç

1.072 program ve 64 üniversite sayfası siteye zayıf bağlıydı: görünür ekmek kırıntısı yoktu, program sayfasından aynı şehirdeki okullara, şehir rehberine ve bölge bursuna link yoktu. Google için "bu sayfalar önemli" iç sinyali ve ziyaretçi için gezinme yolu eklemek.

## Kararlar

- Yeni URL açılmaz; şehir/bölge linkleri mevcut `?city=` / `?region=` filtre adreslerine gider (2. fazda gerçek adresli sayfalar değerlendirilir).
- Tüm linkler sunucu HTML'inde render edilir (Googlebot `/api/universities`'i çekemez).
- Veri: `getUniversityById` (ana varlık) + hafif `getUniversitiesDirectory()` (aynı şehir listesi); ilgili blok hesaplanamazsa sayfa yine açılır.
- Görsel: mevcut editorial dil; üstte küçük kırıntı satırı, altta "İlgili bağlantılar" kutusu (ProgramDirectory ile aynı çerçeve/başlık stili).

## Parçalar

- `lib/relatedLinks.ts` `buildRelatedLinks(university, directory)`: aynı şehirdeki en fazla 6 okul (program sayısına göre), şehir rehberi (`getCityGuideName`), bölge bursu (`CITY_TO_REGION` + `SCHOLARSHIP_REGION_MAP`).
- `components/university-details/DetailBreadcrumb.tsx`: `nav[aria-label]` + `ol`; JSON-LD BreadcrumbList ile aynı sıra.
- `components/university-details/RelatedLinks.tsx`: iki sütun (okullar / şehir+burs), boşsa render etmez.
- Sayfa sarmalayıcıları `related` prop'unu hesaplar; client leaf'ler kırıntıyı üstte, bloğu ConsultPrompt sonrasında (program sayfasında diğer programlar listesinden sonra) render eder.
- Çeviriler: `breadcrumb.*`, `related.*` (TR/EN).
- Guard: `check:university-details-ui` kırıntı/blok/`buildRelatedLinks` token'larını ister; `check:university-data-source` detay sayfalarında hafif dizine izin verir.

## 2. faz (ayrı karar)

Şehir ve bölge için gerçek adresli sayfalar; "aynı alanda diğer üniversiteler" için İtalya resmi bölüm sınıfı kodları (`degree_class`: 900 kabul kaydının 778'inde kod var, 124 kod 2+ okulda ortak) + anahtar kelime taksonomisi.
