# Bologna Program Admission Details

**Tarih:** 2026-06-02
**Durum:** Brainstorming onaylandi, kullanici spec review bekliyor
**Sahip:** Kerem Yarar (product owner) + Codex (implementer)

---

## Ozet

`/Users/keremyarar/Desktop/results` klasorunde University of Bologna icin 97 adet program JSON'u var. Bu JSON'lar program bazinda resmi UniBo linklerini, admission turunu, EU/non-EU deadline metinlerini, akademik kosullari, dil kosullarini, gerekli belgeleri, kaynak alintilarini ve belirsizlik notlarini tasiyor.

Hedef bu veriyi mevcut ItalyPath datasini karistirmadan Supabase'e almak:

1. Mevcut `university_departments` ana program listesi olarak kalir.
2. Detayli admission verisi ayri bir tabloda tutulur.
3. `single-cycle` yeni gecerli program level'i olur.
4. Bologna'daki 97 results programinin tamaminda `official_program_url` korunur.
5. Mevcut 63 Bologna programi isim bazli eslestirilir; results'ta olup DB'de olmayan programlar yeni Bologna programi olarak eklenir.
6. `source_quotes`, `uncertain`, `uncertainty_notes` kaybolmaz; veri kalitesi kullaniciya ve editore acik kalir.

Bu spec yalnizca University of Bologna batch'ini kapsar. Diger universiteler icin ayni pipeline daha sonra tekrar kullanilabilir.

---

## Kaynak Veri

Kaynak klasor:

```text
/Users/keremyarar/Desktop/results
```

Okunan batch ozeti:

- 97 JSON dosyasi
- Tum dosyalarda ayni ust seviye schema
- 97 programin tamaminda `official_program_url` var
- 69 program temiz, 28 program en az bir alanda belirsizlik isareti tasiyor
- 8 programda EU/non-EU deadline null
- 5 programda `official_call_url` null
- 5 programda `tuition_or_fees_link` null
- `source_quotes` her dosyada korunuyor

Ornek alanlar:

```ts
program_name
level
teaching_language
campus
degree_class
admission_type
academic_requirements
language_requirements
application_deadline_eu
application_deadline_non_eu
required_documents
entry_exam_or_test
tuition_or_fees_link
official_program_url
official_call_url
source_quotes
uncertain
uncertainty_notes
```

---

## Mevcut Durum

Canli Supabase projesi:

- Project: `Path`
- Project id: `kskbnxxyviowmrlskwke`
- University of Bologna id: `3`
- Mevcut Bologna program sayisi: `63`
- Results program sayisi: `97`

Mevcut uygulama `university_departments` tablosundan su kisa program modelini uretiyor:

```ts
{
  name: string;
  slug: string;
  languages: ("en" | "it")[];
  durationYears: 1 | 2 | 3 | 4 | 5 | 6;
  level: "bachelor" | "master";
}
```

Bu model admission detaylari icin yetersiz, ama program directory/list experience icin dogru yerde duruyor. Bu yuzden yeni uzun metinleri ayni tabloya doldurmak yerine ayri tablo kullanilacak.

---

## Kararlar

### 1. `single-cycle` Gercek Level Olacak

`ProgramLevel` su hale genisletilecek:

```ts
export type ProgramLevel = "bachelor" | "master" | "single-cycle";
```

Supabase tarafinda `university_departments.level` check constraint'i de ayni uc degeri kabul edecek.

Medicine and Surgery, Pharmacy, Veterinary Medicine gibi programlar artik `bachelor` gibi gosterilmeyecek. Eski model siniri yuzunden `bachelor` duran kayitlar results datasinda `single-cycle` geliyorsa mevcut kayit uzerinde level duzeltmesi yapilacak.

### 2. Ayni Isim Farkli Level Ayridir

Kucuk harf, tire, virgul, bosluk, aksan farklari eslestirme icin onemsizdir. Ama level ayrimi gercek ayrimdir.

Ornek:

- `Statistical Sciences` + `bachelor` ayri program
- `Statistical Sciences` + `master` ayri program

Slug benzersiz kalmak zorunda oldugu icin ikinci level ayni base slug'i kullanamaz. Yeni slug level suffix'i alir:

```text
statistical-sciences
statistical-sciences-master
```

### 3. Farkli Isim Ayridir

`Archaeology` ile `Archaeology and Cultures of the Ancient World` ayni program degildir. Alias kullanilmayacak.

Results'ta `Archaeology` varsa ve DB'de sadece `Archaeology and Cultures of the Ancient World` varsa, `Archaeology` yeni program olarak eklenecek.

### 4. Raw Dil Metni Kaybedilmeyecek

Mevcut ana program listesi `languages` alaninda yalnizca `en | it` destekliyor. Results icinde `English, French, Italian` gibi daha zengin metinler var.

Bu batch'te ana filter modelini buyutmek zorunda degiliz. `raw_teaching_language` detay tablosunda saklanacak. Boylece UI ileride "English, French, Italian" metnini birebir gosterebilir, ama mevcut filtre sistemi bozulmaz.

---

## Veri Modeli

### Ana Tablo: `public.university_departments`

Bu tablo program identity ve directory bilgisi olarak kalir.

Gerekli degisiklik:

- `level` check constraint'i `bachelor`, `master`, `single-cycle` kabul eder.
- Results'tan gelen yeni Bologna programlari bu tabloya eklenir.
- Mevcut Bologna programlarinda level correction gerekiyorsa uygulanir.

### Yeni Tablo: `public.program_admission_details`

Detayli admission verisi bu tabloda tutulur.

Onerilen kolonlar:

```sql
create table public.program_admission_details (
  department_id bigint primary key references public.university_departments(id) on delete cascade,
  university_id bigint not null references public.universities(id) on delete cascade,
  raw_program_name text not null,
  raw_level text not null,
  raw_teaching_language text not null,
  campus text,
  degree_class text,
  admission_type text,
  academic_requirements text,
  language_requirements text,
  application_deadline_eu text,
  application_deadline_non_eu text,
  required_documents jsonb not null default '[]'::jsonb,
  entry_exam_or_test text,
  tuition_or_fees_link text,
  official_program_url text not null,
  official_call_url text,
  source_quotes jsonb not null default '[]'::jsonb,
  uncertain jsonb not null default '[]'::jsonb,
  uncertainty_notes jsonb not null default '[]'::jsonb,
  source_file text not null,
  imported_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
```

Neden `department_id` primary key:

- Program slug'i URL icin kullaniliyor ama DB identity icin `id` daha saglam.
- Slug degisirse detay kaydi kopmaz.
- Her program icin tek detay kaydi hedefleniyor.

`university_id` denormalize tutulur:

- Query ve raporlama kolaylasir.
- Import validation daha okunur olur.

### RLS ve Public Read

Bu tablo public content'tir, kullaniciya ait veri degildir.

Supabase exposed schema kurali geregi:

- RLS acik olacak.
- `anon` ve `authenticated` rolleri icin `SELECT using (true)` policy olacak.
- Client write policy olmayacak.
- Data import yazimlari dashboard/MCP/admin context ile yapilacak.

Bu desen mevcut `universities`, `university_departments`, `community_links`, `scholarship_regions` tablolarindaki public read modelini takip eder.

---

## Eslestirme Kurallari

### Normalize Fonksiyonu

Import dry-run ve apply script'i ayni normalize fonksiyonunu kullanir:

```ts
normalizeName(value)
  .toLowerCase()
  .normalize("NFKD")
  .removeAccents()
  .replace("&", "and")
  .replace(nonAlphaNumeric, " ")
  .collapseWhitespace()
```

Bu sayede kucuk harf, aksan, tire, cift bosluk gibi farklar sorun olmaz.

### Match Akisi

Her results JSON'u icin:

1. `normalizedName = normalizeName(program_name)`
2. `sourceLevel = normalizeLevel(level)`
3. Bologna DB programlari icinde ayni normalize isme bak.
4. Ayni isim + ayni level varsa mevcut `department_id` kullan.
5. Ayni isim + DB level `bachelor` + source level `single-cycle` + results tarafinda ayni ismin bachelor versiyonu yoksa mevcut kaydi `single-cycle` olarak duzelt.
6. Ayni isim + farkli level varsa yeni program olustur.
7. Farkli isim varsa yeni program olustur.

### Slug Uretimi

Base slug `program_name` uzerinden uretilir:

```text
Statistics, Economics and Business -> statistics-economics-and-business
```

Slug mevcutsa:

- Ayni kayit ise kullanilir.
- Farkli level icin yeni kayitsa `-${level}` suffix'i eklenir.
- Hala cakisma varsa `-2`, `-3` suffix'i kullanilir.

Ornek:

```text
statistical-sciences
statistical-sciences-master
```

### Import Raporu

DB'ye yazmadan once dry-run raporu zorunlu:

```json
{
  "universityId": 3,
  "sourceFiles": 97,
  "matchedExisting": 63,
  "levelCorrections": [
    "Medicine and Surgery: bachelor -> single-cycle"
  ],
  "newDepartments": [
    "Archaeology",
    "Advanced Cosmetic Sciences"
  ],
  "duplicateNameDifferentLevel": [
    "Statistical Sciences: bachelor + master"
  ],
  "warnings": []
}
```

Kerem bu raporu onaylamadan canli DB write yapilmayacak.

---

## Uygulama Data Flow

### API Fetch

`lib/universities.server.ts` su an `universities` ve `university_departments` tablolarini okuyup `University[]` uretiyor.

Yeni akista:

1. `university_departments` select'ine `id` eklenecek.
2. `program_admission_details` detaylari ayrica okunacak.
3. Detaylar `department_id` ile ilgili department objesine opsiyonel olarak eklenecek.

Yeni TypeScript shape:

```ts
export interface ProgramAdmissionDetails {
  officialProgramUrl: string;
  officialCallUrl?: string;
  tuitionOrFeesLink?: string;
  campus?: string;
  degreeClass?: string;
  admissionType?: string;
  academicRequirements?: string;
  languageRequirements?: string;
  applicationDeadlineEu?: string;
  applicationDeadlineNonEu?: string;
  requiredDocuments: string[];
  entryExamOrTest?: string;
  sourceQuotes: ProgramSourceQuote[];
  uncertain: string[];
  uncertaintyNotes: string[];
  rawTeachingLanguage: string;
}

export interface Department {
  id?: number;
  name: string;
  slug: string;
  languages: ProgramLanguage[];
  durationYears: ProgramDurationYears;
  level: ProgramLevel;
  admissionDetails?: ProgramAdmissionDetails;
}
```

`id` opsiyonel tutulur ki eski local helper'lar ve tests bir anda kirilmasin.

### UI Surface

Ilk UI pass program detay sayfasinda olacak:

- Hero/header alaninda "Official program page" linki
- Admission details bolumu:
  - campus
  - degree class
  - admission type
  - EU deadline
  - non-EU deadline
  - academic requirements
  - language requirements
  - required documents
  - entry exam/test
  - tuition/fees link
  - official call link
- Belirsiz alanlar icin editorial note:
  - `uncertain` doluysa "Bu alan resmi kaynakta belirsiz veya onceki yil cagrisiyla desteklenmis olabilir." gibi kisa bir uyari.

Program listesi ve cards bu pass'te sade kalabilir. Official linkin asil gorunur yeri program detay sayfasi olur.

---

## Scripts

### `scripts/import-bologna-program-details.mjs`

Tek script iki modla calisir:

```bash
node scripts/import-bologna-program-details.mjs --dry-run
node scripts/import-bologna-program-details.mjs --apply
```

Dry-run:

- Desktop results klasorunu okur.
- JSON schema'yi validate eder.
- Canli Supabase Bologna programlarini okur.
- Match/new/update raporu uretir.
- DB'ye yazmaz.

Apply:

- Dry-run ile ayni validation'i tekrar yapar.
- `university_departments` icin yeni programlari ekler.
- Level correction gerektiren mevcut programlari gunceller.
- `program_admission_details` kayitlarini upsert eder.
- Son raporu `output/bologna-program-details-import-report.json` olarak yazar.

### Guard Script

Yeni check:

```bash
npm run check:program-details
```

Kontroller:

- `program_admission_details.department_id` gercek department'a bagli mi
- Bologna icin beklenen 97 detail kaydi var mi
- Her kayitta `official_program_url` dolu ve HTTPS mi
- `required_documents`, `source_quotes`, `uncertain`, `uncertainty_notes` array mi
- `level` yalnizca `bachelor | master | single-cycle` mi
- Ayni university icinde duplicate slug yok mu
- `npm run check:data` hala geciyor mu

---

## Error Handling

Import script fail-fast calisir:

- JSON parse hatasi varsa apply yapmaz.
- Eksik `program_name`, `level`, `official_program_url` varsa apply yapmaz.
- Slug cakismasi cozumlenemiyorsa apply yapmaz.
- Supabase write adiminda hata olursa rapor basar ve non-zero exit eder.

Partial write riskini azaltmak icin apply sirasi:

1. Schema hazir mi kontrol et.
2. Yeni departments upsert/insert.
3. Level corrections update.
4. Departments tekrar fetch.
5. Admission details upsert.
6. Final count validation.

Tek transaction tercih edilir. MCP/CLI yolu transaction desteklemezse SQL tarafinda `begin/commit` bloklu tek statement kullanilir veya apply script idempotent upsert mantigiyla tekrar calistirilabilir tasarlanir.

---

## Verification

Minimum verification set:

```bash
npm run check:program-details
npm run check:data
npm run check:university-data-source
npm run lint
```

Data-specific manuel kontrol:

- `/universities/3/departments/medicine-and-surgery` level `single-cycle` gorunur.
- `/universities/3/departments/statistical-sciences` bachelor kaydi korunur.
- `Statistical Sciences` master kaydi ayri slug ile gorunur.
- `Archaeology` ve `Archaeology and Cultures of the Ancient World` ayri programlar olarak gorunur.
- Bologna details count 97 olur.
- Her 97 detail kaydinda official program link vardir.

---

## Rollback

Bu tasarim rollback'i kolay tutar:

1. `program_admission_details` tablosu ayri oldugu icin detay verisi silinirse ana university/program listesi calismaya devam eder.
2. Import raporu yeni eklenen department slug'larini listeler.
3. Gerekirse sadece bu batch'in ekledigi Bologna programlari silinebilir.
4. Level corrections raporda tutuldugu icin eski level'e geri donus manuel olarak mumkundur.

Kalici risk: Yeni department route'lari public URL uretecegi icin, production'a ciktiktan sonra silmek SEO/link kirilmasi yaratabilir. Bu yuzden canli apply oncesi dry-run raporu Kerem tarafindan onaylanacak.

---

## Kapsam Disi

Bu spec su isleri kapsamaz:

- Diger universiteler icin admission detail import
- Otomatik web scraping
- LLM ile yeni data extraction
- Admin panel
- Kullanici tarafindan data edit etme
- Deadline tarihlerini parse edip takvim formatina cevirmek

Deadline alanlari ilk pass'te kaynak metindeki gibi string kalir. Bu, "Intake 1", "conditional extra intake", "fallback to previous year" gibi resmi kaynak karmasini kaybetmemek icin bilincli tercih.

---

## Basari Kriterleri

Bu is bitti sayilmak icin:

- `single-cycle` level'i app ve Supabase tarafinda desteklenir.
- Bologna icin results batch'indeki 97 programin her biri DB'de temsil edilir.
- 97 programin tamaminda `official_program_url` saklanir.
- Existing Bologna programlari gereksiz duplicate olmaz.
- `Statistical Sciences` bachelor ve master ayri gorunur.
- `Archaeology` ve `Archaeology and Cultures of the Ancient World` ayri gorunur.
- Source quote ve uncertainty datasi kaybolmaz.
- Guard scriptleri ve mevcut data check'leri gecer.
