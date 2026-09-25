-- user_profiles: onboarding sihirbazi cevaplari (bkz. specs/2026-07-02-hub-onboarding-design.md section 4.4)
-- Uygulama: Supabase Dashboard > SQL Editor'de bu dosyayi calistir.

begin;

create table if not exists public.user_profiles (
  user_id text primary key,
  level text check (level in ('bachelor', 'master')),
  fields text[] not null default '{}'::text[],
  budget text check (budget in ('scholarship-required', 'support-helpful', 'flexible')),
  city_pref text check (city_pref in ('big-city', 'student-city', 'any')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 2026-09-26 (security audit card 4, S3#2): fields holds at most two of the
-- eight PROFILE_FIELDS keys in lib/hub/profile.ts (MAX_PROFILE_FIELDS = 2).
alter table public.user_profiles
  drop constraint if exists user_profiles_fields_check;
alter table public.user_profiles
  add constraint user_profiles_fields_check
    check (
      cardinality(fields) <= 2
      and array_position(fields, null) is null
      and fields <@ array[
        'engineering-tech', 'medicine-health', 'business-economics',
        'design-architecture', 'natural-sciences', 'social-humanities',
        'arts-fashion', 'law-politics'
      ]::text[]
    );

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
on public.user_profiles
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
on public.user_profiles
for insert
to authenticated
with check (user_id = public.requesting_user_id());

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using (user_id = public.requesting_user_id())
with check (user_id = public.requesting_user_id());

drop policy if exists "user_profiles_delete_own" on public.user_profiles;
create policy "user_profiles_delete_own"
on public.user_profiles
for delete
to authenticated
using (user_id = public.requesting_user_id());

-- Upsert in lib/hub/useUserProfile.ts needs select, insert and update.
revoke all on public.user_profiles from public, anon, authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;

commit;
