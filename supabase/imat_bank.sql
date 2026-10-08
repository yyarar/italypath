-- imat_bank: IMAT soru bankasi, konu pratigi denemeleri ve deneme sinavi oturumlari
-- (bkz. docs/superpowers/specs/2026-10-08-imat-soru-bankasi-design.md "Veri Modeli").
-- Kart 4 kurali: yeni tablo kapali baslar; gereken yetki RLS ile birlikte acikca
-- yazilir. Puanlama sabitleri lib/imat/scoring.mjs ile ayni: dogru +1,5, yanlis
-- -0,4, bos 0; 60 soru, 100 dakika.
-- Yeniden calistirilabilir. Uygulama: once yerel test (npm run test:mentor-db),
-- sonra Kerem onayiyla (oncesinde npm run backup:supabase --run ve --verify).

begin;

-- Sorular ve dogru cevaplar. Yeni satir karantinada baslar (needs_review = true);
-- sunucu karantinadaki satiri sunmaz.
create table if not exists public.imat_questions (
  id text primary key,
  year int not null check (year between 2011 and 2030),
  number int not null check (number between 1 and 80),
  exam_set text not null check (exam_set in ('mock', 'bank')),
  section text not null check (section in ('reading-general', 'logic', 'biology', 'chemistry', 'physics-math')),
  topic text not null,
  topic_slug text not null check (char_length(topic_slug) between 3 and 60),
  prompt text not null,
  choices jsonb not null,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D', 'E')),
  figure_path text,
  source_file text not null,
  source_page int,
  needs_review boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint imat_questions_choices_shape check (
    jsonb_typeof(choices) = 'object' and choices ?& array['A', 'B', 'C', 'D', 'E']
  ),
  constraint imat_questions_paper_position unique (exam_set, year, number)
);

create index if not exists imat_questions_topic_idx
  on public.imat_questions (section, topic_slug);

alter table public.imat_questions enable row level security;
-- Bilincli olarak HICBIR select policy yok: sorular ve dogru cevaplar yalnizca
-- service role (sunucu) ile okunur. Anon/authenticated dogrudan okuyamaz.
revoke all on public.imat_questions from anon;
revoke all on public.imat_questions from authenticated;
revoke all on public.imat_questions from service_role;
revoke all on public.imat_questions from public;
grant select, insert, update, delete on public.imat_questions to service_role;

-- Konu pratigi cevaplari: sat_attempts ile ayni kurallar. Cevap tek harf A-E;
-- saat sunucudan; hesap basina 24 saatte en cok 2.000 deneme.
create table if not exists public.imat_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  question_id text not null references public.imat_questions (id),
  selected_answer text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default timezone('utc', now()),
  constraint imat_attempts_selected_answer_letter
    check (selected_answer in ('A', 'B', 'C', 'D', 'E'))
);

create index if not exists imat_attempts_user_idx
  on public.imat_attempts (user_id, question_id);

create index if not exists imat_attempts_question_id_idx
  on public.imat_attempts (question_id);

create index if not exists imat_attempts_user_answered_idx
  on public.imat_attempts (user_id, answered_at);

create or replace function public.enforce_imat_attempts_daily_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_recent integer;
begin
  new.answered_at := pg_catalog.now();
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('imat_attempts:daily_cap:' || new.user_id, 0)
  );
  select count(*)
  into v_recent
  from public.imat_attempts
  where user_id = new.user_id
    and answered_at > pg_catalog.now() - interval '24 hours';
  if v_recent >= 2000 then
    raise exception 'imat_attempt_rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists imat_attempts_daily_cap on public.imat_attempts;
create trigger imat_attempts_daily_cap
  before insert on public.imat_attempts
  for each row execute function public.enforce_imat_attempts_daily_cap();

alter table public.imat_attempts enable row level security;

drop policy if exists "imat_attempts_select_own" on public.imat_attempts;
create policy "imat_attempts_select_own"
on public.imat_attempts
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "imat_attempts_insert_own" on public.imat_attempts;
create policy "imat_attempts_insert_own"
on public.imat_attempts
for insert
to authenticated
with check (user_id = public.requesting_user_id());

revoke all on public.imat_attempts from anon;
revoke all on public.imat_attempts from authenticated;
revoke all on public.imat_attempts from service_role;
revoke all on public.imat_attempts from public;
grant select, insert on public.imat_attempts to authenticated;
grant select, insert, update, delete on public.imat_attempts to service_role;

-- Soru basina en son deneme. security_invoker: imat_attempts RLS'i cagiran
-- kullaniciya uygulanir, herkes yalniz kendi satirlarini gorur.
create or replace view public.imat_latest_attempts
with (security_invoker = true)
as
select distinct on (a.user_id, a.question_id)
  a.user_id,
  a.question_id,
  a.selected_answer,
  a.is_correct,
  a.answered_at
from public.imat_attempts as a
order by a.user_id, a.question_id, a.answered_at desc, a.id desc;

revoke all on public.imat_latest_attempts from public, anon, authenticated;
grant select on public.imat_latest_attempts to authenticated;

-- Deneme sinavi oturumlari. Istemci yalniz kendi satirlarini okur; yazma yalniz
-- asagidaki uc fonksiyonla olur (sure, puan ve teslim saati sunucudan).
create table if not exists public.imat_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  year int not null,
  started_at timestamptz not null default timezone('utc', now()),
  deadline_at timestamptz not null,
  draft_answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  answers jsonb,
  correct_count int,
  wrong_count int,
  blank_count int,
  score numeric(5, 2),
  section_breakdown jsonb
);

create index if not exists imat_exam_sessions_user_idx
  on public.imat_exam_sessions (user_id, started_at desc);

alter table public.imat_exam_sessions enable row level security;

drop policy if exists "imat_exam_sessions_select_own" on public.imat_exam_sessions;
create policy "imat_exam_sessions_select_own"
on public.imat_exam_sessions
for select
to authenticated
using (user_id = public.requesting_user_id());

revoke all on public.imat_exam_sessions from anon;
revoke all on public.imat_exam_sessions from authenticated;
revoke all on public.imat_exam_sessions from service_role;
revoke all on public.imat_exam_sessions from public;
grant select on public.imat_exam_sessions to authenticated;
grant select, insert, update, delete on public.imat_exam_sessions to service_role;

-- Deneme baslatma. O yilin 60 mock sorusunun hepsi karantina disinda degilse
-- deneme acilmaz. Ayni yil icin suresi dolmamis acik oturum varsa o dondurulur
-- (resumed = true); yoksa yeni oturum acilir. Hesap basina 24 saatte en cok 20
-- yeni oturum.
create or replace function public.imat_start_exam(p_year int)
returns table (
  id uuid,
  started_at timestamptz,
  deadline_at timestamptz,
  draft_answers jsonb,
  resumed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := public.requesting_user_id();
  v_now timestamptz := pg_catalog.now();
  v_available integer;
  v_recent integer;
  v_session public.imat_exam_sessions%rowtype;
begin
  if v_user is null then
    raise exception 'imat_exam_not_found' using errcode = 'P0001';
  end if;

  select count(*)
  into v_available
  from public.imat_questions as q
  where q.year = p_year
    and q.exam_set = 'mock'
    and q.needs_review = false;
  if v_available <> 60 then
    raise exception 'imat_exam_not_available' using errcode = 'P0001';
  end if;

  -- Ayni hesabin es zamanli baslatmalari sirayla calisir: iki acik oturum
  -- veya tavan asimi olmaz.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('imat_exam_sessions:daily_cap:' || v_user, 0)
  );

  select s.*
  into v_session
  from public.imat_exam_sessions as s
  where s.user_id = v_user
    and s.year = p_year
    and s.submitted_at is null
    and s.deadline_at > v_now
  order by s.started_at desc
  limit 1;
  if found then
    return query
    select v_session.id, v_session.started_at, v_session.deadline_at, v_session.draft_answers, true;
    return;
  end if;

  select count(*)
  into v_recent
  from public.imat_exam_sessions as s
  where s.user_id = v_user
    and s.started_at > v_now - interval '24 hours';
  if v_recent >= 20 then
    raise exception 'imat_exam_rate_limited' using errcode = 'P0001';
  end if;

  insert into public.imat_exam_sessions as s (user_id, year, started_at, deadline_at)
  values (v_user, p_year, v_now, v_now + interval '100 minutes')
  returning s.* into v_session;

  return query
  select v_session.id, v_session.started_at, v_session.deadline_at, v_session.draft_answers, false;
end;
$$;

-- Ara kayit: yalniz sahibinin teslim edilmemis oturumuna yazilir. Yalniz o yilin
-- mock soru kimlikleri ve A-E harfleri kalir; nesne olmayan girdi {} olur.
create or replace function public.imat_save_exam_draft(p_session_id uuid, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := public.requesting_user_id();
  v_year integer;
  v_answers jsonb := '{}'::jsonb;
begin
  select s.year
  into v_year
  from public.imat_exam_sessions as s
  where s.id = p_session_id
    and s.user_id = v_user
    and s.submitted_at is null
  for update;
  if not found then
    raise exception 'imat_exam_not_found' using errcode = 'P0001';
  end if;

  if pg_catalog.jsonb_typeof(p_answers) = 'object' then
    select coalesce(pg_catalog.jsonb_object_agg(q.id, p_answers ->> q.id), '{}'::jsonb)
    into v_answers
    from public.imat_questions as q
    where q.year = v_year
      and q.exam_set = 'mock'
      and (p_answers ->> q.id) in ('A', 'B', 'C', 'D', 'E');
  end if;

  update public.imat_exam_sessions as s
  set draft_answers = v_answers
  where s.id = p_session_id;
end;
$$;

-- Teslim: cevaplar taslaktaki gibi suzulur ve o yilin karantina disindaki 60 mock
-- sorusuyla karsilastirilir (dogru cevaplar yalniz burada okunur). Puan
-- 1,5 x dogru - 0,4 x yanlis; teslim saati sunucudan. Sure asimi reddedilmez.
create or replace function public.imat_submit_exam(p_session_id uuid, p_answers jsonb)
returns table (
  correct_count int,
  wrong_count int,
  blank_count int,
  score numeric,
  section_breakdown jsonb,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := public.requesting_user_id();
  v_now timestamptz := pg_catalog.now();
  v_session public.imat_exam_sessions%rowtype;
  v_answers jsonb := '{}'::jsonb;
  v_total integer;
  v_correct integer;
  v_wrong integer;
  v_blank integer;
  v_score numeric(5, 2);
  v_breakdown jsonb;
begin
  select s.*
  into v_session
  from public.imat_exam_sessions as s
  where s.id = p_session_id
    and s.user_id = v_user
  for update;
  if not found then
    raise exception 'imat_exam_not_found' using errcode = 'P0001';
  end if;
  if v_session.submitted_at is not null then
    raise exception 'imat_exam_already_submitted' using errcode = 'P0001';
  end if;

  if pg_catalog.jsonb_typeof(p_answers) = 'object' then
    select coalesce(pg_catalog.jsonb_object_agg(q.id, p_answers ->> q.id), '{}'::jsonb)
    into v_answers
    from public.imat_questions as q
    where q.year = v_session.year
      and q.exam_set = 'mock'
      and (p_answers ->> q.id) in ('A', 'B', 'C', 'D', 'E');
  end if;

  with exam as (
    select
      q.section,
      case
        when not (v_answers ? q.id) then 'blank'
        when (v_answers ->> q.id) = q.correct_answer then 'correct'
        else 'wrong'
      end as outcome
    from public.imat_questions as q
    where q.year = v_session.year
      and q.exam_set = 'mock'
      and q.needs_review = false
  ),
  per_section as (
    select
      sections.section_name,
      count(e.outcome) filter (where e.outcome = 'correct') as n_correct,
      count(e.outcome) filter (where e.outcome = 'wrong') as n_wrong,
      count(e.outcome) filter (where e.outcome = 'blank') as n_blank
    from unnest(array['reading-general', 'logic', 'biology', 'chemistry', 'physics-math']) as sections(section_name)
    left join exam as e on e.section = sections.section_name
    group by sections.section_name
  )
  select
    (select count(*) from exam),
    (select count(*) from exam where exam.outcome = 'correct'),
    (select count(*) from exam where exam.outcome = 'wrong'),
    (select count(*) from exam where exam.outcome = 'blank'),
    (
      select pg_catalog.jsonb_object_agg(
        p.section_name,
        pg_catalog.jsonb_build_object('correct', p.n_correct, 'wrong', p.n_wrong, 'blank', p.n_blank)
      )
      from per_section as p
    )
  into v_total, v_correct, v_wrong, v_blank, v_breakdown;

  if v_total <> 60 then
    raise exception 'imat_exam_not_available' using errcode = 'P0001';
  end if;

  v_score := pg_catalog.round(1.5 * v_correct - 0.4 * v_wrong, 2);

  update public.imat_exam_sessions as s
  set submitted_at = v_now,
      answers = v_answers,
      correct_count = v_correct,
      wrong_count = v_wrong,
      blank_count = v_blank,
      score = v_score,
      section_breakdown = v_breakdown,
      draft_answers = '{}'::jsonb
  where s.id = v_session.id;

  return query
  select v_correct, v_wrong, v_blank, v_score, v_breakdown, v_now;
end;
$$;

-- Fonksiyonlarda Supabase varsayilani acik oldugu icin kapatilir; yalniz giris
-- yapmis kullaniciya acikca izin verilir.
revoke all on function public.imat_start_exam(int) from public, anon, authenticated;
grant execute on function public.imat_start_exam(int) to authenticated;
revoke all on function public.imat_save_exam_draft(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.imat_save_exam_draft(uuid, jsonb) to authenticated;
revoke all on function public.imat_submit_exam(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.imat_submit_exam(uuid, jsonb) to authenticated;

-- Sekiller kucuk WebP dosyalari; yalniz scripts/imat/import-bank.mjs yazar.
-- 512 KB ve yalniz WebP (sat-figures ile ayni kural).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imat-figures', 'imat-figures', true, 524288, array['image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

commit;
