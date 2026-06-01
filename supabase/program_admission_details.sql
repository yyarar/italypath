begin;

alter table public.university_departments
  drop constraint if exists university_departments_level_check;

alter table public.university_departments
  add constraint university_departments_level_check
  check (level = any (array['bachelor'::text, 'master'::text, 'single-cycle'::text]));

create table if not exists public.program_admission_details (
  department_id bigint primary key references public.university_departments(id) on delete cascade,
  university_id bigint not null references public.universities(id) on delete cascade,
  raw_program_name text not null,
  raw_level text not null,
  raw_teaching_language text not null,
  campus text,
  degree_class text,
  admission_type text,
  academic_requirements text,
  language_requirements text,
  application_deadline_eu text,
  application_deadline_non_eu text,
  required_documents jsonb not null default '[]'::jsonb,
  entry_exam_or_test text,
  tuition_or_fees_link text,
  official_program_url text not null,
  official_call_url text,
  source_quotes jsonb not null default '[]'::jsonb,
  uncertain jsonb not null default '[]'::jsonb,
  uncertainty_notes jsonb not null default '[]'::jsonb,
  source_file text not null,
  imported_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists program_admission_details_university_id_idx
  on public.program_admission_details(university_id);

alter table public.program_admission_details enable row level security;

drop policy if exists program_admission_details_public_read
  on public.program_admission_details;

create policy program_admission_details_public_read
  on public.program_admission_details
  for select
  to anon, authenticated
  using (true);

grant select on table public.program_admission_details to anon, authenticated;
grant select, insert, update, delete on table public.program_admission_details to service_role;

commit;
