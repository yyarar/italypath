-- data_api_privileges: which Postgres roles can reach the public schema over
-- Supabase's Data API (security audit card 4, 2026-09-26: S9#1, S3#6, S3#7).
--
-- Catalog tables (universities, university_departments,
-- program_admission_details) and the program_degree_class_codes view are read
-- only by lib/universities.server.ts with the server-only secret key, which
-- runs as service_role. The browser never reads them, so anon and
-- authenticated keep no privilege and no read policy. service_role grants are
-- left as they are (imports write with it).
--
-- Order matters: the site must already read the catalog with
-- SUPABASE_SECRET_KEY in production (security card 2) before this runs, or
-- every school and program page fails.
--
-- Live rollout record: SUPABASE_SECURITY_RUNBOOK.md ("Veri API yetkileri").
-- Rerunnable.

begin;

revoke all on table public.universities from public, anon, authenticated;
revoke all on table public.university_departments from public, anon, authenticated;
revoke all on table public.program_admission_details from public, anon, authenticated;
revoke all on table public.program_degree_class_codes from public, anon, authenticated;

drop policy if exists universities_public_read on public.universities;
drop policy if exists university_departments_public_read on public.university_departments;
drop policy if exists program_admission_details_public_read on public.program_admission_details;

-- New tables and sequences created by postgres in public start closed to the
-- client roles: each migration grants the verbs it needs next to its RLS
-- policies. (Objects created by supabase_admin keep Supabase's own defaults.)
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- set_updated_at() is the updated_at trigger of the catalog tables; it only
-- calls pg_catalog functions, so an empty search_path is safe.
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    alter function public.set_updated_at() set search_path = '';
  end if;
end $$;

-- The site does not use GraphQL; the extension only widened the API surface.
drop extension if exists pg_graphql;

commit;
