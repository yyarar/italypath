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

insert into storage.buckets (id, name, public)
values ('sat-figures', 'sat-figures', true)
on conflict (id) do update
set public = true;

commit;
