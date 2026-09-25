-- sat_bank: SAT soru bankasi tablolari (bkz. specs/2026-07-03-sat-soru-bankasi-design.md)
-- Uygulama: Kerem onayi sonrasi Supabase Dashboard > SQL Editor'de calistir.

begin;

create table if not exists public.sat_questions (
  id text primary key,
  section text not null check (section in ('math', 'reading-writing')),
  domain text not null,
  skill text not null,
  skill_slug text not null,
  difficulty int not null check (difficulty in (1, 2, 3)),
  question_type text not null check (question_type in ('mcq', 'spr')),
  prompt text not null,
  choices jsonb,
  correct_answer jsonb not null,
  figure_path text,
  explanation_tr text,
  explanation_en text,
  source_file text not null,
  needs_review boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sat_questions_skill_idx
  on public.sat_questions (section, skill_slug, difficulty);

alter table public.sat_questions enable row level security;
-- Bilincli olarak HICBIR select policy yok: korumali icerik yalnizca service role
-- (server API route) uzerinden okunur. Anon/authenticated dogrudan okuyamaz.
revoke all on public.sat_questions from anon;
revoke all on public.sat_questions from authenticated;
revoke all on public.sat_questions from service_role;
revoke all on public.sat_questions from public;
grant select, insert, update, delete on public.sat_questions to service_role;

create table if not exists public.sat_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  question_id text not null references public.sat_questions (id),
  selected_answer text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default timezone('utc', now())
);

create index if not exists sat_attempts_user_idx
  on public.sat_attempts (user_id, question_id);

create index if not exists sat_attempts_question_id_idx
  on public.sat_attempts (question_id);

-- 2026-09-26 (security audit card 4, S3#2): answers are short (a choice
-- letter or a typed SPR value; components/sat/QuestionCard.tsx caps input at
-- 32) and one account records at most 2,000 attempts in any 24 hours. The
-- time is stamped by the server so the daily count cannot be moved by a
-- client-supplied answered_at.
alter table public.sat_attempts
  drop constraint if exists sat_attempts_selected_answer_length;
alter table public.sat_attempts
  add constraint sat_attempts_selected_answer_length
    check (char_length(selected_answer) <= 32);

create index if not exists sat_attempts_user_answered_idx
  on public.sat_attempts (user_id, answered_at);

create or replace function public.enforce_sat_attempts_daily_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_recent integer;
begin
  new.answered_at := pg_catalog.now();
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('sat_attempts:daily_cap:' || new.user_id, 0)
  );
  select count(*)
  into v_recent
  from public.sat_attempts
  where user_id = new.user_id
    and answered_at > pg_catalog.now() - interval '24 hours';
  if v_recent >= 2000 then
    raise exception 'sat_attempt_rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists sat_attempts_daily_cap on public.sat_attempts;
create trigger sat_attempts_daily_cap
  before insert on public.sat_attempts
  for each row execute function public.enforce_sat_attempts_daily_cap();

alter table public.sat_attempts enable row level security;

drop policy if exists "sat_attempts_select_own" on public.sat_attempts;
create policy "sat_attempts_select_own"
on public.sat_attempts
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "sat_attempts_insert_own" on public.sat_attempts;
create policy "sat_attempts_insert_own"
on public.sat_attempts
for insert
to authenticated
with check (user_id = public.requesting_user_id());

revoke all on public.sat_attempts from anon;
revoke all on public.sat_attempts from authenticated;
revoke all on public.sat_attempts from service_role;
revoke all on public.sat_attempts from public;
grant select, insert on public.sat_attempts to authenticated;
grant select, insert, update, delete on public.sat_attempts to service_role;

-- Figures are small WebP files written only by scripts/sat/import-bank.mjs
-- (largest 31 KB on 2026-09-26); 512 KB and WebP only (audit G4#3).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sat-figures', 'sat-figures', true, 524288, array['image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

commit;
