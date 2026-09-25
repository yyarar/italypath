-- ItalyPath Supabase hardening
-- Scope: favorites + user_documents + documents storage bucket
-- Auth model: Clerk as Supabase third-party auth provider
--
-- 2026-09-26 (security audit card 4: S3#2, S3#6, S3#7, S5#1): least-privilege
-- grants, length checks, per-user caps and the 5 MB documents bucket. The
-- live rollout record is in SUPABASE_SECURITY_RUNBOOK.md ("Kullanici yazma
-- sinirlari"). Rerunnable; live data must fit the checks before a rerun.

begin;

-- Parse Clerk user id from JWT. Same definition as supabase/volunteer_mentor.sql.
create or replace function public.requesting_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select auth.jwt() ->> 'sub';
$$;

-- Favorites table protections
alter table if exists public.favorites enable row level security;
alter table if exists public.favorites force row level security;

-- One row per user and university comes from the table's unique constraint.
-- The older index with the same columns was a duplicate.
drop index if exists public.favorites_user_university_unique;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.favorites'::regclass
      and conname = 'favorites_user_id_university_id_key'
  ) then
    alter table public.favorites
      add constraint favorites_user_id_university_id_key unique (user_id, university_id);
  end if;
end $$;

alter table public.favorites
  drop constraint if exists favorites_university_id_format;
alter table public.favorites
  add constraint favorites_university_id_format
    check (university_id ~ '^[0-9]{1,6}$');

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
on public.favorites
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
on public.favorites
for insert
to authenticated
with check (user_id = public.requesting_user_id());

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
on public.favorites
for delete
to authenticated
using (user_id = public.requesting_user_id());

-- user_documents table protections
alter table if exists public.user_documents enable row level security;
alter table if exists public.user_documents force row level security;

-- Row size limits. storage_path must sit in the owner's folder, like the
-- documents bucket policies below; category NULL is a legacy row ("Diger").
alter table public.user_documents
  drop constraint if exists user_documents_file_name_length;
alter table public.user_documents
  add constraint user_documents_file_name_length
    check (char_length(file_name) between 1 and 255);

alter table public.user_documents
  drop constraint if exists user_documents_file_url_length;
alter table public.user_documents
  add constraint user_documents_file_url_length
    check (char_length(file_url) <= 300);

alter table public.user_documents
  drop constraint if exists user_documents_storage_path_owner;
alter table public.user_documents
  add constraint user_documents_storage_path_owner
    check (
      storage_path is not null
      and char_length(storage_path) <= 300
      and starts_with(storage_path, user_id || '/')
    );

alter table public.user_documents
  drop constraint if exists user_documents_category_check;
alter table public.user_documents
  add constraint user_documents_category_check
    check (
      category is null
      or category in ('identity', 'academic', 'language', 'letters', 'financial', 'other')
    );

-- Serves the owner's list (newest first) and the per-user cap below.
create index if not exists user_documents_user_created_idx
  on public.user_documents (user_id, created_at desc);

drop policy if exists "documents_select_own_rows" on public.user_documents;
create policy "documents_select_own_rows"
on public.user_documents
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "documents_insert_own_rows" on public.user_documents;
create policy "documents_insert_own_rows"
on public.user_documents
for insert
to authenticated
with check (user_id = public.requesting_user_id());

drop policy if exists "documents_delete_own_rows" on public.user_documents;
create policy "documents_delete_own_rows"
on public.user_documents
for delete
to authenticated
using (user_id = public.requesting_user_id());

-- Per-user caps (2026-09-26): at most 100 favorites and 30 documents per
-- account. The advisory lock serializes one user's concurrent inserts so the
-- count cannot be raced. The functions run as the caller: a signed-in user
-- counts only their own rows, which are the rows being capped.
create or replace function public.enforce_favorites_per_user_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('favorites:per_user_cap:' || new.user_id, 0)
  );
  select count(*)
  into v_count
  from public.favorites
  where user_id = new.user_id;
  if v_count >= 100 then
    raise exception 'favorite_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists favorites_per_user_cap on public.favorites;
create trigger favorites_per_user_cap
  before insert on public.favorites
  for each row execute function public.enforce_favorites_per_user_cap();

create or replace function public.enforce_user_documents_per_user_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('user_documents:per_user_cap:' || new.user_id, 0)
  );
  select count(*)
  into v_count
  from public.user_documents
  where user_id = new.user_id;
  if v_count >= 30 then
    raise exception 'document_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists user_documents_per_user_cap on public.user_documents;
create trigger user_documents_per_user_cap
  before insert on public.user_documents
  for each row execute function public.enforce_user_documents_per_user_cap();

-- Grants: anon has no access; signed-in users get only the verbs the app
-- uses (lib/useFavorites.ts, lib/documents/useUserDocuments.ts). Rows are
-- still filtered by the policies above.
revoke all on public.favorites from public, anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;

revoke all on public.user_documents from public, anon, authenticated;
grant select, insert, delete on public.user_documents to authenticated;

-- Documents bucket: private, 5 MB per file (same as app/documents/page.tsx)
-- and the MIME list in lib/documents/limits.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage object protections (folder convention: {clerk_user_id}/filename.ext).
-- RLS on storage.objects is managed by Supabase; the table belongs to the
-- storage admin role, so this file only replaces the policies.
drop policy if exists "documents_select_own_objects" on storage.objects;
create policy "documents_select_own_objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = public.requesting_user_id()
);

-- At most 30 files per account, matching the user_documents cap.
drop policy if exists "documents_insert_own_objects" on storage.objects;
create policy "documents_insert_own_objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = public.requesting_user_id()
  and (
    select count(*)
    from storage.objects as existing
    where existing.bucket_id = 'documents'
      and split_part(existing.name, '/', 1) = public.requesting_user_id()
  ) < 30
);

drop policy if exists "documents_update_own_objects" on storage.objects;
create policy "documents_update_own_objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = public.requesting_user_id()
)
with check (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = public.requesting_user_id()
);

drop policy if exists "documents_delete_own_objects" on storage.objects;
create policy "documents_delete_own_objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = public.requesting_user_id()
);

commit;
