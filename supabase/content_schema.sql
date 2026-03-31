-- ItalyPath content schema (universities, departments, communities, scholarships)
-- This script moves static app content into Supabase tables with read-only public access.

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.universities (
  id bigint primary key,
  sort_order integer not null default 0,
  name text not null,
  city text not null,
  type text not null,
  fee text not null,
  image text not null,
  description text not null,
  description_en text,
  website text not null,
  features text[] not null default '{}',
  features_en text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.university_departments (
  id bigserial primary key,
  university_id bigint not null references public.universities(id) on delete cascade,
  sort_order integer not null default 0,
  name text not null,
  slug text not null,
  languages text[] not null default array['en']::text[],
  duration_years smallint not null default 3,
  level text not null default 'bachelor',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (university_id, slug),
  check (duration_years between 1 and 6),
  check (level in ('bachelor', 'master'))
);

create index if not exists universities_sort_order_idx
  on public.universities (sort_order, id);

create index if not exists university_departments_university_sort_idx
  on public.university_departments (university_id, sort_order, id);

create table if not exists public.community_links (
  id text primary key,
  sort_order integer not null default 0,
  name text not null,
  city text,
  region text,
  platform text not null,
  category text not null,
  audience text not null,
  description text not null,
  url text not null,
  editorial_note text,
  size_hint text,
  status text not null,
  verification_source text not null,
  last_checked_at date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (platform in ('whatsapp', 'telegram', 'facebook')),
  check (category in ('university', 'housing', 'scholarship', 'admissions', 'social', 'general')),
  check (status in ('active', 'limited', 'unverified')),
  check (verification_source in ('user-confirmed', 'editor-reviewed')),
  check (size_hint is null or size_hint in ('small', 'medium', 'large'))
);

create index if not exists community_links_sort_order_idx
  on public.community_links (sort_order, id);

create table if not exists public.scholarship_regions (
  region_slug text primary key,
  sort_order integer not null default 0,
  region_name text not null,
  is_default boolean not null default false,
  managing_bodies jsonb not null default '[]'::jsonb,
  current_academic_year text,
  application_window text,
  isee_limit text,
  ispe_limit text,
  benefits text[] not null default '{}',
  housing_support text,
  canteen_support text,
  international_student_notes text,
  official_source_urls text[] not null default '{}',
  last_verified_at date,
  status_note text not null,
  completeness text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (completeness in ('verified-full', 'registry-only'))
);

create index if not exists scholarship_regions_sort_order_idx
  on public.scholarship_regions (sort_order, region_slug);

create unique index if not exists scholarship_regions_single_default_idx
  on public.scholarship_regions (is_default)
  where is_default;

drop trigger if exists set_updated_at_universities on public.universities;
create trigger set_updated_at_universities
before update on public.universities
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_university_departments on public.university_departments;
create trigger set_updated_at_university_departments
before update on public.university_departments
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_community_links on public.community_links;
create trigger set_updated_at_community_links
before update on public.community_links
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_scholarship_regions on public.scholarship_regions;
create trigger set_updated_at_scholarship_regions
before update on public.scholarship_regions
for each row
execute function public.set_updated_at();

alter table public.universities enable row level security;
alter table public.university_departments enable row level security;
alter table public.community_links enable row level security;
alter table public.scholarship_regions enable row level security;

alter table public.universities force row level security;
alter table public.university_departments force row level security;
alter table public.community_links force row level security;
alter table public.scholarship_regions force row level security;

drop policy if exists "universities_public_read" on public.universities;
create policy "universities_public_read"
on public.universities
for select
to anon, authenticated
using (true);

drop policy if exists "university_departments_public_read" on public.university_departments;
create policy "university_departments_public_read"
on public.university_departments
for select
to anon, authenticated
using (true);

drop policy if exists "community_links_public_read" on public.community_links;
create policy "community_links_public_read"
on public.community_links
for select
to anon, authenticated
using (true);

drop policy if exists "scholarship_regions_public_read" on public.scholarship_regions;
create policy "scholarship_regions_public_read"
on public.scholarship_regions
for select
to anon, authenticated
using (true);

commit;
