begin;

alter table public.university_departments
  drop constraint if exists university_departments_level_check;

alter table public.university_departments
  add constraint university_departments_level_check
  check (level = any (array['bachelor'::text, 'master'::text, 'single-cycle'::text]));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.university_departments'::regclass
      and contype in ('p', 'u')
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.university_departments'::regclass
            and attname = 'id'
        ),
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.university_departments'::regclass
            and attname = 'university_id'
        )
      ]::smallint[]
  ) then
    alter table public.university_departments
      add constraint university_departments_id_university_id_key unique (id, university_id);
  end if;
end $$;

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.program_admission_details'::regclass
      and contype = 'f'
      and confrelid = 'public.university_departments'::regclass
      and confdeltype = 'c'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.program_admission_details'::regclass
            and attname = 'department_id'
        ),
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.program_admission_details'::regclass
            and attname = 'university_id'
        )
      ]::smallint[]
      and confkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.university_departments'::regclass
            and attname = 'id'
        ),
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.university_departments'::regclass
            and attname = 'university_id'
        )
      ]::smallint[]
  ) then
    alter table public.program_admission_details
      add constraint program_admission_details_department_university_fkey
      foreign key (department_id, university_id)
      references public.university_departments(id, university_id)
      on delete cascade;
  end if;
end $$;

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
