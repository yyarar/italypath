# Data Entry Guide

Bu projede bolum metadata'si tek merkezden yonetilir.

## Mevcut varsayilanlar

Tum bolumler varsayilan olarak:
- `languages: ["en"]`
- `durationYears: 3`
- `level: "bachelor"`

Bu varsayilanlar `app/data.ts` icinde uygulanir.

## Yeni bolum ekleme

1. Universiteyi bul (`universitiesBaseData`).
2. `departments` listesine sadece su formatta ekle:

```ts
{ name: "Medicine", slug: "medicine" }
```

3. Sonra gerekiyorsa override ekle.

## Override kullanimi

Anahtar formati: `universityId:departmentSlug`

Ornek:

```ts
DEPARTMENT_LANGUAGE_OVERRIDES[createDepartmentKey(10, "medicine")] = ["it"];
DEPARTMENT_DURATION_OVERRIDES[createDepartmentKey(10, "medicine")] = 6;
DEPARTMENT_LEVEL_OVERRIDES[createDepartmentKey(10, "medicine")] = "master";
```

## Senaryolar

- Italyanca 3 yillik lisans:
  - language override: `["it"]`
- Ingilizce 6 yillik lisans:
  - duration override: `6`
- Italyanca 6 yillik lisans:
  - language override: `["it"]`
  - duration override: `6`
- 5 yillik program:
  - duration override: `5`
- Master program:
  - level override: `"master"` (gerekiyorsa dil/sure de override edilir)

## Kontrol komutu

Data girisinden sonra mutlaka calistir:

```bash
npm run check:data
```

Bu komut su kontrolleri yapar:
- duplicate universite id/adi
- universite icinde duplicate department slug
- override anahtarlari gecerli mi
- dil/sure/seviye degerleri gecerli mi
- dagilim ozeti (language/duration/level)
