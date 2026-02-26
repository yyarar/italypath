-- ItalyPath Supabase hardening
-- Scope: favorites + user_documents + documents storage bucket
-- Auth model: Clerk as Supabase third-party auth provider

begin;

-- Parse Clerk user id from JWT.
create or replace function public.requesting_user_id()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'sub';
$$;

-- Favorites table protections
alter table if exists public.favorites enable row level security;
alter table if exists public.favorites force row level security;

create unique index if not exists favorites_user_university_unique
  on public.favorites (user_id, university_id);

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

-- Make sure documents bucket exists and is private.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update
set public = false;

-- Storage object protections (folder convention: {clerk_user_id}/filename.ext)
alter table if exists storage.objects enable row level security;

drop policy if exists "documents_select_own_objects" on storage.objects;
create policy "documents_select_own_objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = public.requesting_user_id()
);

drop policy if exists "documents_insert_own_objects" on storage.objects;
create policy "documents_insert_own_objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = public.requesting_user_id()
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
