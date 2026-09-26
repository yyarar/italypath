-- sat_progress: /sat ilerleme okumasi (guvenlik denetimi O4#3, 2026-09-26)
-- Istemci artik tum denemeleri cekmez: soru basina en son deneme (view) ve
-- seri / bugun ozeti (RPC) okunur. Tablo, RLS ve ozetin kullandigi
-- (user_id, answered_at) indeksi supabase/sat_bank.sql'dedir; bu dosya onun
-- uzerine kurulur ve yeniden calistirilabilir.
-- Yeni view ve fonksiyon istemci rollerine kapali baslar (kart 4 varsayilani
-- tablolar icin; fonksiyonlarda Supabase varsayilani acik oldugu icin burada
-- kapatilir): yalniz giris yapmis kullaniciya acikca izin verilir.
-- Uygulama: once yerel test (npm run test:mentor-db), sonra Kerem onayiyla.

begin;

-- Soru basina en son deneme. security_invoker: sat_attempts RLS'i cagiran
-- kullaniciya uygulanir, herkes yalniz kendi satirlarini gorur.
create or replace view public.sat_latest_attempts
with (security_invoker = true)
as
select distinct on (a.user_id, a.question_id)
  a.user_id,
  a.question_id,
  a.selected_answer,
  a.is_correct,
  a.answered_at
from public.sat_attempts as a
order by a.user_id, a.question_id, a.answered_at desc, a.id desc;

revoke all on public.sat_latest_attempts from public, anon, authenticated;
grant select on public.sat_latest_attempts to authenticated;

-- Bugunku deneme sayisi, guncel seri ve en uzun seri; gunler kullanicinin
-- saat diliminde sayilir. Gecersiz saat dilimi UTC'ye duser. Tek satir doner.
create or replace function public.sat_attempt_summary(p_time_zone text default 'UTC')
returns table (today_count integer, current_streak integer, longest_streak integer)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_zone text := coalesce(nullif(btrim(p_time_zone), ''), 'UTC');
  v_today date;
begin
  begin
    v_today := (pg_catalog.now() at time zone v_zone)::date;
  exception when invalid_parameter_value then
    v_zone := 'UTC';
    v_today := (pg_catalog.now() at time zone v_zone)::date;
  end;

  return query
  with days as (
    select (a.answered_at at time zone v_zone)::date as day, count(*)::integer as attempts
    from public.sat_attempts as a
    where a.user_id = (select public.requesting_user_id())
    group by 1
  ),
  runs as (
    select max(day) as last_day, count(*)::integer as run_length
    from (
      select day, day - (row_number() over (order by day))::integer as run_key
      from days
    ) as numbered
    group by run_key
  )
  select
    coalesce((select d.attempts from days as d where d.day = v_today), 0),
    coalesce((
      select r.run_length from runs as r
      where r.last_day >= v_today - 1
      order by r.last_day desc
      limit 1
    ), 0),
    coalesce((select max(r.run_length) from runs as r), 0);
end;
$$;

revoke all on function public.sat_attempt_summary(text) from public, anon, authenticated;
grant execute on function public.sat_attempt_summary(text) to authenticated;

commit;
