# Data Entry Guide

Supabase; universite, program ve admission verisinin tek dogru kaynagidir.
`app/data.ts` legacy local seed/yedektir; canli urun verisi eklemek veya duzeltmek
icin kullanilmaz.

## Veri tablolari

- `universities`: universite temel bilgileri
- `university_departments`: program adi, slug, dil, sure, seviye ve siralama
- `program_admission_details`: resmi linkler, gereksinimler, EU/non-EU deadline,
  belgeler, sinavlar, kaynaklar ve belirsizlik notlari

Yeni veya guncellenen program verisi once bu tablolara yazilir. Uygulama
`lib/universities.server.ts` ile bu uc tabloyu tek `University[]` modelinde
birlesitirir.

## Tip ve local yedek siniri

- Paylasilan uygulama tipleri: `types/universities.ts`
- Supabase row tipleri: `types/index.ts`
- Legacy local seed: `app/data.ts`

Runtime kodu `app/data.ts` import edemez. Bu kural
`npm run check:university-data-source` ile korunur.

## Kontrol komutlari

Canli veri degisikliginden sonra:

```bash
npm run check:data
npm run check:program-details
node scripts/check-universities-server-compose.mjs
npm run check:university-data-source
```

`npm run check:local-data` yalnizca legacy yedegin kendi butunlugunu kontrol
eder; canli verinin dogrulama sonucu olarak kabul edilmez.
