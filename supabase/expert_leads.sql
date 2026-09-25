begin;

create table if not exists public.expert_leads (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  full_name text not null,
  whatsapp_phone text not null,
  study_level text not null,
  field_of_interest text not null,
  target_intake text not null,
  help_request text not null,
  status text not null default 'new',
  internal_note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint expert_leads_submission_id_key unique (submission_id),
  constraint expert_leads_full_name_check
    check (full_name = btrim(full_name) and char_length(full_name) between 2 and 120),
  constraint expert_leads_phone_check
    check (whatsapp_phone ~ '^\+[0-9]{8,15}$'),
  constraint expert_leads_study_level_check
    check (study_level in ('bachelor', 'master', 'undecided')),
  constraint expert_leads_field_check
    check (field_of_interest in (
      'engineering-tech', 'medicine-health', 'business-economics',
      'design-architecture', 'natural-sciences', 'social-humanities',
      'arts-fashion', 'law-politics', 'undecided'
    )),
  constraint expert_leads_target_intake_check
    check (
      target_intake = 'undecided'
      or case
        when target_intake ~ '^[0-9]{4}-[0-9]{4}$' then
          substring(target_intake from 6 for 4)::integer =
          substring(target_intake from 1 for 4)::integer + 1
        else false
      end
    ),
  constraint expert_leads_help_request_check
    check (help_request = btrim(help_request) and char_length(help_request) between 10 and 3000),
  constraint expert_leads_status_check
    check (status in ('new', 'contacted', 'completed')),
  constraint expert_leads_internal_note_check
    check (char_length(internal_note) <= 4000)
);

create index if not exists expert_leads_status_created_idx
  on public.expert_leads (status, created_at desc);
create index if not exists expert_leads_created_idx
  on public.expert_leads (created_at desc);

create or replace function public.set_expert_leads_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists expert_leads_set_updated_at on public.expert_leads;
create trigger expert_leads_set_updated_at
  before update on public.expert_leads
  for each row execute function public.set_expert_leads_updated_at();

-- Abuse cap (2026-09-25, Kerem decision): at most 50 new leads per hour across
-- the whole site, so an unauthenticated flood cannot fill the Free-tier database.
-- A same-submission retry skips the cap and is answered by the unique constraint.
create or replace function public.enforce_expert_leads_hourly_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_recent_leads integer;
begin
  if exists (
    select 1 from public.expert_leads where submission_id = new.submission_id
  ) then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('expert_leads:hourly_cap', 0)
  );
  select count(*)
  into v_recent_leads
  from public.expert_leads
  where created_at > timezone('utc', now()) - interval '1 hour';
  if v_recent_leads >= 50 then
    raise exception 'expert_lead_rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists expert_leads_hourly_cap on public.expert_leads;
create trigger expert_leads_hourly_cap
  before insert on public.expert_leads
  for each row execute function public.enforce_expert_leads_hourly_cap();

alter table public.expert_leads enable row level security;

revoke all on public.expert_leads from anon, authenticated;
grant select, update, delete on public.expert_leads to authenticated;

drop policy if exists "expert_leads_select_staff" on public.expert_leads;
create policy "expert_leads_select_staff"
on public.expert_leads
for select
to authenticated
using ((select public.is_active_mentor_staff()));

drop policy if exists "expert_leads_update_staff" on public.expert_leads;
create policy "expert_leads_update_staff"
on public.expert_leads
for update
to authenticated
using ((select public.is_active_mentor_staff()))
with check ((select public.is_active_mentor_staff()));

drop policy if exists "expert_leads_delete_staff" on public.expert_leads;
create policy "expert_leads_delete_staff"
on public.expert_leads
for delete
to authenticated
using ((select public.is_active_mentor_staff()));

commit;
