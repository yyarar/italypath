begin;

do $mentor_upgrade_preflight$
declare
  v_has_legacy_nonce_constraint boolean := false;
  v_has_legacy_messages boolean := false;
  v_has_unmapped_messages boolean := true;
begin
  if to_regclass('public.mentor_messages') is null then
    return;
  end if;

  select exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mentor_messages'::regclass
      and conname = 'mentor_messages_client_nonce_key'
  ) into v_has_legacy_nonce_constraint;

  if not v_has_legacy_nonce_constraint then
    return;
  end if;

  execute 'lock table public.mentor_messages in access exclusive mode';

  select exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mentor_messages'::regclass
      and conname = 'mentor_messages_client_nonce_key'
  ) into v_has_legacy_nonce_constraint;

  if not v_has_legacy_nonce_constraint then
    return;
  end if;

  execute 'select exists (select 1 from public.mentor_messages)'
    into v_has_legacy_messages;

  if not v_has_legacy_messages then
    return;
  end if;

  if to_regclass('public.mentor_rpc_idempotency') is not null then
    execute 'lock table public.mentor_rpc_idempotency in access exclusive mode';

    begin
      execute $coverage$
        select exists (
          select 1
          from public.mentor_messages message
          join public.mentor_conversations conversation
            on conversation.id = message.conversation_id
          where not exists (
            select 1
            from public.mentor_rpc_idempotency request
            where request.conversation_id = message.conversation_id
              and request.client_nonce = message.client_nonce
              and (
                (
                  request.operation = 'start'
                  and request.message_id is null
                  and message.sender_kind = 'student'
                  and request.caller_user_id = conversation.user_id
                )
                or
                (
                  request.operation = 'send_student'
                  and request.message_id = message.id
                  and message.sender_kind = 'student'
                  and request.caller_user_id = conversation.user_id
                )
                or
                (
                  request.operation = 'send_staff'
                  and request.message_id = message.id
                  and message.sender_kind = 'staff'
                )
              )
          )
        )
      $coverage$ into v_has_unmapped_messages;
    exception when undefined_column then
      v_has_unmapped_messages := true;
    end;
  end if;

  if v_has_unmapped_messages then
    raise exception 'legacy_mentor_idempotency_migration_required'
      using errcode = 'P0001',
            detail = 'Legacy mentor messages exist without verifiable caller and operation mappings.',
            hint = 'Stop deployment. A database owner must review and explicitly migrate or archive the experimental legacy data before rerunning this artifact.';
  end if;
end
$mentor_upgrade_preflight$;

create extension if not exists pgcrypto;

create or replace function public.requesting_user_id()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'sub';
$$;

create table if not exists public.mentor_staff (
  user_id text primary key,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mentor_staff_display_name_length
    check (char_length(btrim(display_name)) between 1 and 120)
);

create unique index if not exists mentor_staff_one_active_operator
  on public.mentor_staff (active)
  where active = true;

create table if not exists public.mentor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  student_display_name text not null,
  topic text not null,
  status text not null default 'waiting_for_team',
  last_sender_kind text not null default 'student',
  last_message_preview text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  closed_by text,
  constraint mentor_conversations_student_name_length
    check (char_length(btrim(student_display_name)) between 1 and 120),
  constraint mentor_conversations_topic_check
    check (topic in (
      'university-program',
      'application-documents',
      'scholarship-isee',
      'visa-residence',
      'student-life',
      'other'
    )),
  constraint mentor_conversations_status_check
    check (status in ('waiting_for_team', 'waiting_for_student', 'closed')),
  constraint mentor_conversations_sender_check
    check (last_sender_kind in ('student', 'staff')),
  constraint mentor_conversations_preview_length
    check (char_length(last_message_preview) between 1 and 160),
  constraint mentor_conversations_closed_by_check
    check (closed_by is null or closed_by in ('student', 'staff')),
  constraint mentor_conversations_closed_state_check
    check (
      (status = 'closed' and closed_at is not null and closed_by is not null)
      or
      (status <> 'closed' and closed_at is null and closed_by is null)
    )
);

create unique index if not exists mentor_conversations_one_open_per_user
  on public.mentor_conversations (user_id)
  where status <> 'closed';

create index if not exists mentor_conversations_queue_idx
  on public.mentor_conversations (status, last_message_at desc);

create table if not exists public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.mentor_conversations(id) on delete cascade,
  sender_kind text not null,
  body text not null,
  client_nonce uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mentor_messages_sender_check
    check (sender_kind in ('student', 'staff')),
  constraint mentor_messages_body_length
    check (char_length(body) between 1 and 4000),
  constraint mentor_messages_body_trimmed
    check (body = btrim(body))
);

alter table public.mentor_messages
  drop constraint if exists mentor_messages_client_nonce_key;

create index if not exists mentor_messages_conversation_created_idx
  on public.mentor_messages (conversation_id, created_at, id);

create table if not exists public.mentor_rpc_idempotency (
  caller_user_id text not null,
  operation text not null,
  client_nonce uuid not null,
  conversation_id uuid not null
    references public.mentor_conversations(id) on delete cascade,
  message_id uuid
    references public.mentor_messages(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (caller_user_id, operation, client_nonce),
  constraint mentor_rpc_idempotency_operation_check
    check (operation in ('start', 'send_student', 'send_staff')),
  constraint mentor_rpc_idempotency_result_check
    check (
      (operation = 'start' and message_id is null)
      or
      (operation in ('send_student', 'send_staff') and message_id is not null)
    )
);

create index if not exists mentor_rpc_idempotency_conversation_idx
  on public.mentor_rpc_idempotency (conversation_id);

create unique index if not exists mentor_rpc_idempotency_message_idx
  on public.mentor_rpc_idempotency (message_id)
  where message_id is not null;

alter table public.mentor_staff enable row level security;
alter table public.mentor_conversations enable row level security;
alter table public.mentor_messages enable row level security;
alter table public.mentor_rpc_idempotency enable row level security;

create or replace function public.is_active_mentor_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.mentor_staff
    where user_id = public.requesting_user_id()
      and active = true
  );
$$;

drop policy if exists "mentor_conversations_select_allowed" on public.mentor_conversations;
create policy "mentor_conversations_select_allowed"
on public.mentor_conversations
for select
to authenticated
using (
  user_id = public.requesting_user_id()
  or public.is_active_mentor_staff()
);

drop policy if exists "mentor_messages_select_allowed" on public.mentor_messages;
create policy "mentor_messages_select_allowed"
on public.mentor_messages
for select
to authenticated
using (
  public.is_active_mentor_staff()
  or exists (
    select 1
    from public.mentor_conversations conversation
    where conversation.id = mentor_messages.conversation_id
      and conversation.user_id = public.requesting_user_id()
  )
);

create or replace function public.start_volunteer_conversation(
  p_topic text,
  p_display_name text,
  p_body text,
  p_client_nonce uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text := public.requesting_user_id();
  v_body text := btrim(p_body);
  v_display_name text := left(
    coalesce(nullif(btrim(p_display_name), ''), 'Öğrenci'),
    120
  );
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_topic is null or not (p_topic = any (array[
    'university-program',
    'application-documents',
    'scholarship-isee',
    'visa-residence',
    'student-life',
    'other'
  ]::text[])) then
    raise exception 'invalid_topic' using errcode = '22023';
  end if;
  if v_body is null or char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'invalid_message_length' using errcode = '22023';
  end if;
  if p_client_nonce is null then
    raise exception 'client_nonce_required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mentor:start:' || v_user_id, 0)
  );

  select request.conversation_id
  into v_conversation_id
  from public.mentor_rpc_idempotency request
  where request.caller_user_id = v_user_id
    and request.operation = 'start'
    and request.client_nonce = p_client_nonce;
  if found then return v_conversation_id; end if;

  select id
  into v_conversation_id
  from public.mentor_conversations
  where user_id = v_user_id and status <> 'closed'
  limit 1;
  if found then
    raise exception 'open_conversation_exists' using errcode = 'P0001';
  end if;

  insert into public.mentor_conversations (
    user_id,
    student_display_name,
    topic,
    status,
    last_sender_kind,
    last_message_preview
  ) values (
    v_user_id,
    v_display_name,
    p_topic,
    'waiting_for_team',
    'student',
    left(v_body, 160)
  )
  returning id into v_conversation_id;

  insert into public.mentor_messages (
    conversation_id,
    sender_kind,
    body,
    client_nonce
  ) values (
    v_conversation_id,
    'student',
    v_body,
    p_client_nonce
  );

  insert into public.mentor_rpc_idempotency (
    caller_user_id,
    operation,
    client_nonce,
    conversation_id,
    message_id
  ) values (
    v_user_id,
    'start',
    p_client_nonce,
    v_conversation_id,
    null
  );

  return v_conversation_id;
end;
$$;

create or replace function public.send_student_mentor_message(
  p_conversation_id uuid,
  p_body text,
  p_client_nonce uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text := public.requesting_user_id();
  v_body text := btrim(p_body);
  v_conversation public.mentor_conversations%rowtype;
  v_idempotency_conversation_id uuid;
  v_message_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if v_body is null or char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'invalid_message_length' using errcode = '22023';
  end if;
  if p_client_nonce is null then
    raise exception 'client_nonce_required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'mentor:send_student:' || v_user_id || ':' || p_client_nonce::text,
      0
    )
  );

  select * into v_conversation
  from public.mentor_conversations
  where id = p_conversation_id
  for update;

  if not found or v_conversation.user_id <> v_user_id then
    raise exception 'conversation_not_found' using errcode = '42501';
  end if;

  select request.conversation_id, request.message_id
  into v_idempotency_conversation_id, v_message_id
  from public.mentor_rpc_idempotency request
  where request.caller_user_id = v_user_id
    and request.operation = 'send_student'
    and request.client_nonce = p_client_nonce;
  if found then
    if v_idempotency_conversation_id <> p_conversation_id then
      raise exception 'idempotency_conflict' using errcode = '22023';
    end if;
    return v_message_id;
  end if;

  if v_conversation.status = 'closed' then
    raise exception 'conversation_closed' using errcode = 'P0001';
  end if;

  insert into public.mentor_messages (
    conversation_id,
    sender_kind,
    body,
    client_nonce
  ) values (
    p_conversation_id,
    'student',
    v_body,
    p_client_nonce
  ) returning id into v_message_id;

  insert into public.mentor_rpc_idempotency (
    caller_user_id,
    operation,
    client_nonce,
    conversation_id,
    message_id
  ) values (
    v_user_id,
    'send_student',
    p_client_nonce,
    p_conversation_id,
    v_message_id
  );

  update public.mentor_conversations
  set status = 'waiting_for_team',
      last_sender_kind = 'student',
      last_message_preview = left(v_body, 160),
      last_message_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_conversation_id;

  return v_message_id;
end;
$$;

create or replace function public.send_staff_mentor_message(
  p_conversation_id uuid,
  p_body text,
  p_client_nonce uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text := public.requesting_user_id();
  v_body text := btrim(p_body);
  v_conversation public.mentor_conversations%rowtype;
  v_idempotency_conversation_id uuid;
  v_message_id uuid;
begin
  if not public.is_active_mentor_staff() then
    raise exception 'staff_access_required' using errcode = '42501';
  end if;
  if v_body is null or char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'invalid_message_length' using errcode = '22023';
  end if;
  if p_client_nonce is null then
    raise exception 'client_nonce_required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'mentor:send_staff:' || v_user_id || ':' || p_client_nonce::text,
      0
    )
  );

  select * into v_conversation
  from public.mentor_conversations
  where id = p_conversation_id
  for update;

  if not found then
    raise exception 'conversation_not_found' using errcode = 'P0002';
  end if;

  select request.conversation_id, request.message_id
  into v_idempotency_conversation_id, v_message_id
  from public.mentor_rpc_idempotency request
  where request.caller_user_id = v_user_id
    and request.operation = 'send_staff'
    and request.client_nonce = p_client_nonce;
  if found then
    if v_idempotency_conversation_id <> p_conversation_id then
      raise exception 'idempotency_conflict' using errcode = '22023';
    end if;
    return v_message_id;
  end if;

  if v_conversation.status = 'closed' then
    raise exception 'conversation_closed' using errcode = 'P0001';
  end if;

  insert into public.mentor_messages (
    conversation_id,
    sender_kind,
    body,
    client_nonce
  ) values (
    p_conversation_id,
    'staff',
    v_body,
    p_client_nonce
  ) returning id into v_message_id;

  insert into public.mentor_rpc_idempotency (
    caller_user_id,
    operation,
    client_nonce,
    conversation_id,
    message_id
  ) values (
    v_user_id,
    'send_staff',
    p_client_nonce,
    p_conversation_id,
    v_message_id
  );

  update public.mentor_conversations
  set status = 'waiting_for_student',
      last_sender_kind = 'staff',
      last_message_preview = left(v_body, 160),
      last_message_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_conversation_id;

  return v_message_id;
end;
$$;

create or replace function public.close_volunteer_conversation(
  p_conversation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text := public.requesting_user_id();
  v_is_staff boolean := public.is_active_mentor_staff();
  v_conversation public.mentor_conversations%rowtype;
  v_closed_by text;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select * into v_conversation
  from public.mentor_conversations
  where id = p_conversation_id
  for update;

  if not found then
    raise exception 'conversation_not_found' using errcode = 'P0002';
  end if;
  if v_conversation.user_id <> v_user_id and not v_is_staff then
    raise exception 'conversation_access_denied' using errcode = '42501';
  end if;
  if v_conversation.status = 'closed' then return v_conversation.id; end if;

  v_closed_by := case when v_is_staff then 'staff' else 'student' end;
  update public.mentor_conversations
  set status = 'closed',
      closed_at = timezone('utc', now()),
      closed_by = v_closed_by,
      updated_at = timezone('utc', now())
  where id = p_conversation_id;

  return p_conversation_id;
end;
$$;

revoke all on public.mentor_staff from anon, authenticated;
revoke all on public.mentor_conversations from anon, authenticated;
revoke all on public.mentor_messages from anon, authenticated;
revoke all on public.mentor_rpc_idempotency from public, anon, authenticated;
grant select on public.mentor_conversations to authenticated;
grant select on public.mentor_messages to authenticated;

revoke all on function public.is_active_mentor_staff() from public, anon;
revoke all on function public.start_volunteer_conversation(text, text, text, uuid) from public, anon;
revoke all on function public.send_student_mentor_message(uuid, text, uuid) from public, anon;
revoke all on function public.send_staff_mentor_message(uuid, text, uuid) from public, anon;
revoke all on function public.close_volunteer_conversation(uuid) from public, anon;

grant execute on function public.is_active_mentor_staff() to authenticated;
grant execute on function public.start_volunteer_conversation(text, text, text, uuid) to authenticated;
grant execute on function public.send_student_mentor_message(uuid, text, uuid) to authenticated;
grant execute on function public.send_staff_mentor_message(uuid, text, uuid) to authenticated;
grant execute on function public.close_volunteer_conversation(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mentor_conversations'
  ) then
    alter publication supabase_realtime add table public.mentor_conversations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mentor_messages'
  ) then
    alter publication supabase_realtime add table public.mentor_messages;
  end if;
end
$$;

commit;
