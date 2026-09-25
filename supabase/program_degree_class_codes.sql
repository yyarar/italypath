-- program_degree_class_codes: resmi Italyan bolum sinifi kodlari (ör. LM-18) icin salt okunur gorunum.
-- Uygulandi: 2026-09-19 (Supabase migration: program_degree_class_codes_view), Kerem onayiyla.
--
-- Neden: "Ayni alanda diger universiteler" eslesmesi her programin resmi kodunu ister. Kod,
-- program_admission_details.degree_class serbest metninin icinde (ortalama 128, en fazla 3.300
-- karakter). Dizin her yenilemede bu metni indirseydi 38 KB gz ek egress olurdu; gorunum yalnizca
-- kisa kodlari dondurur (~4 KB gz). Uygulama kodlari lib/universities.server.ts icinde
-- extractDegreeClassCodes ile normalize eder (tek normalizasyon kaynagi JS; 900/900 esit dogrulandi).
--
-- Guvenlik: security_invoker = true -> program_admission_details tablosunun yetki ve RLS kurallari
-- aynen gecerli. 2026-09-26'dan beri (guvenlik denetimi kart 4) yalnizca sunucu okur: service_role
-- SELECT; anon/authenticated hic yetki tasimaz.
-- Geri alma: drop view if exists public.program_degree_class_codes;

create or replace view public.program_degree_class_codes
with (security_invoker = true) as
select department_id, degree_class_codes
from (
  select
    pad.department_id,
    array_to_string(
      array(
        select m[1]
        from regexp_matches(
          coalesce(pad.degree_class, ''),
          '\m(LMG\s*/\s*\d{1,2}|LM\s*-?\s*\d{1,2}|L\s*-?\s*\d{1,2})\M',
          'gi'
        ) as m
      ),
      ' '
    ) as degree_class_codes
  from public.program_admission_details pad
) coded
where degree_class_codes <> '';

comment on view public.program_degree_class_codes is
  'Program basina resmi bolum sinifi kodlari (bosluk ayrimli, ham). Uygulama extractDegreeClassCodes ile normalize eder. Salt okunur.';

revoke all on public.program_degree_class_codes from public, anon, authenticated;
grant select on public.program_degree_class_codes to service_role;
