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

Katalog okumalari (uygulama ve `import-*` dry-run, `check:program-details`,
`check:data`) server-only `SUPABASE_SECRET_KEY` (yeni tip `sb_secret_...`)
ister; `.env.local`'da yoksa betik acik hata verir, herkese acik anon anahtara
donulmez (2026-09-26).

## Tip ve local yedek siniri

- Paylasilan uygulama tipleri: `types/universities.ts`
- Supabase row tipleri: `types/index.ts`
- Legacy local seed: `app/data.ts`

Runtime kodu `app/data.ts` import edemez. Bu kural
`npm run check:university-data-source` ile korunur.

## Canli yazmadan once yedek (2026-09-25)

Canli veriye yazan her isten once yedek alinir ve acilabildigi kontrol edilir:
`import-*` betiklerinin `--apply` kosusu, SQL ile guncelleme veya silme,
migration. `--verify` gecmeden canli yazma baslamaz.

```bash
npm run backup:supabase -- --run
npm run backup:supabase -- --verify
```

Bunun disinda haftada bir yedek alinir. Kurulum, geri yukleme ve prova:
`SUPABASE_SECURITY_RUNBOOK.md` bolum 7. Her tam yedek Supabase egress harcar
(`docs/USAGE_LIMITS.md`); gunde birden fazla calistirma.

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
