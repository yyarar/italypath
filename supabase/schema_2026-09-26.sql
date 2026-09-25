-- ItalyPath live schema baseline: public schema, structure only (no rows).
-- Durum: AKTIF REFERANS · Alindi: 2026-09-25T23:24:33.861Z · Guvenlik denetimi kart 4 (S3#7) uygulandiktan sonra
-- Kaynak: pg_dump 17 --schema-only --schema=public (Supabase projesi "Path").
-- Bu dosya canli durumun tarihli fotografidir; kurulum sirasi ve tekrar calistirilabilir
-- kaynaklar supabase/*.sql dosyalaridir. Supabase'in yonettigi semalar (auth, storage,
-- realtime) dahil degildir; storage ve Realtime ayarlari en altta yorum olarak durur.

--
-- PostgreSQL database dump
--

\restrict italypathschema20260926

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: close_volunteer_conversation(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.close_volunteer_conversation(p_conversation_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
    and (user_id = v_user_id or v_is_staff)
  for update;

  if not found then
    raise exception 'conversation_not_found' using errcode = '42501';
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


ALTER FUNCTION public.close_volunteer_conversation(p_conversation_id uuid) OWNER TO postgres;

--
-- Name: enforce_expert_leads_hourly_cap(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_expert_leads_hourly_cap() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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
  if v_recent_leads >= 150 then
    raise exception 'expert_lead_rate_limited' using errcode = 'P0001';
  end if;
  if v_recent_leads >= 50 then
    new.status := 'suspected';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.enforce_expert_leads_hourly_cap() OWNER TO postgres;

--
-- Name: enforce_favorites_per_user_cap(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_favorites_per_user_cap() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.enforce_favorites_per_user_cap() OWNER TO postgres;

--
-- Name: enforce_sat_attempts_daily_cap(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_sat_attempts_daily_cap() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_recent integer;
begin
  new.answered_at := pg_catalog.now();
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('sat_attempts:daily_cap:' || new.user_id, 0)
  );
  select count(*)
  into v_recent
  from public.sat_attempts
  where user_id = new.user_id
    and answered_at > pg_catalog.now() - interval '24 hours';
  if v_recent >= 2000 then
    raise exception 'sat_attempt_rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.enforce_sat_attempts_daily_cap() OWNER TO postgres;

--
-- Name: enforce_user_documents_per_user_cap(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_user_documents_per_user_cap() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.enforce_user_documents_per_user_cap() OWNER TO postgres;

--
-- Name: is_active_mentor_staff(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_active_mentor_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.mentor_staff
    where user_id = public.requesting_user_id()
      and active = true
  );
$$;


ALTER FUNCTION public.is_active_mentor_staff() OWNER TO postgres;

--
-- Name: requesting_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.requesting_user_id() RETURNS text
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select auth.jwt() ->> 'sub';
$$;


ALTER FUNCTION public.requesting_user_id() OWNER TO postgres;

--
-- Name: send_staff_mentor_message(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.send_staff_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.send_staff_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid) OWNER TO postgres;

--
-- Name: send_student_mentor_message(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.send_student_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id text := public.requesting_user_id();
  v_body text := btrim(p_body);
  v_conversation public.mentor_conversations%rowtype;
  v_idempotency_conversation_id uuid;
  v_message_id uuid;
  v_recent_messages integer;
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
    and user_id = v_user_id
  for update;

  if not found then
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

  -- Abuse cap (2026-09-25): 20 student messages per 10 minutes per student,
  -- counted across all of the student's conversations. Staff sends are not capped.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mentor:student_rate:' || v_user_id, 0)
  );
  select count(*)
  into v_recent_messages
  from public.mentor_messages message
  join public.mentor_conversations conversation
    on conversation.id = message.conversation_id
  where conversation.user_id = v_user_id
    and message.sender_kind = 'student'
    and message.created_at > timezone('utc', now()) - interval '10 minutes';
  if v_recent_messages >= 20 then
    raise exception 'message_rate_limited' using errcode = 'P0001';
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


ALTER FUNCTION public.send_student_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid) OWNER TO postgres;

--
-- Name: set_expert_leads_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_expert_leads_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION public.set_expert_leads_updated_at() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: start_volunteer_conversation(text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.start_volunteer_conversation(p_topic text, p_display_name text, p_body text, p_client_nonce uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id text := public.requesting_user_id();
  v_body text := btrim(p_body);
  v_display_name text := left(
    coalesce(nullif(btrim(p_display_name), ''), 'Öğrenci'),
    120
  );
  v_conversation_id uuid;
  v_recent_messages integer;
  v_recent_conversations integer;
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

  -- Abuse cap (2026-09-25): 5 new conversations per 24 hours and 20 student
  -- messages per 10 minutes per student. Checked after the idempotency lookup
  -- so a same-nonce retry still returns the original result.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mentor:student_rate:' || v_user_id, 0)
  );
  select count(*)
  into v_recent_conversations
  from public.mentor_conversations
  where user_id = v_user_id
    and created_at > timezone('utc', now()) - interval '24 hours';
  if v_recent_conversations >= 5 then
    raise exception 'conversation_rate_limited' using errcode = 'P0001';
  end if;
  select count(*)
  into v_recent_messages
  from public.mentor_messages message
  join public.mentor_conversations conversation
    on conversation.id = message.conversation_id
  where conversation.user_id = v_user_id
    and message.sender_kind = 'student'
    and message.created_at > timezone('utc', now()) - interval '10 minutes';
  if v_recent_messages >= 20 then
    raise exception 'message_rate_limited' using errcode = 'P0001';
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


ALTER FUNCTION public.start_volunteer_conversation(p_topic text, p_display_name text, p_body text, p_client_nonce uuid) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: community_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_links (
    id text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    name text NOT NULL,
    city text,
    region text,
    platform text NOT NULL,
    category text NOT NULL,
    audience text NOT NULL,
    description text NOT NULL,
    url text NOT NULL,
    editorial_note text,
    size_hint text,
    status text NOT NULL,
    verification_source text NOT NULL,
    last_checked_at date NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT community_links_category_check CHECK ((category = ANY (ARRAY['university'::text, 'housing'::text, 'scholarship'::text, 'admissions'::text, 'social'::text, 'general'::text]))),
    CONSTRAINT community_links_platform_check CHECK ((platform = ANY (ARRAY['whatsapp'::text, 'telegram'::text, 'facebook'::text]))),
    CONSTRAINT community_links_size_hint_check CHECK (((size_hint IS NULL) OR (size_hint = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text])))),
    CONSTRAINT community_links_status_check CHECK ((status = ANY (ARRAY['active'::text, 'limited'::text, 'unverified'::text]))),
    CONSTRAINT community_links_verification_source_check CHECK ((verification_source = ANY (ARRAY['user-confirmed'::text, 'editor-reviewed'::text])))
);

ALTER TABLE ONLY public.community_links FORCE ROW LEVEL SECURITY;


ALTER TABLE public.community_links OWNER TO postgres;

--
-- Name: TABLE community_links; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.community_links IS 'ARSIV (2026-09-26): kullanilmiyor. Site topluluk verisini lib/community-links.ts icinden okur. Istemci erisimi kapali; satirlar ve yedek yerinde.';


--
-- Name: expert_leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expert_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    full_name text NOT NULL,
    whatsapp_phone text NOT NULL,
    study_level text NOT NULL,
    field_of_interest text NOT NULL,
    target_intake text NOT NULL,
    help_request text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    internal_note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT expert_leads_field_check CHECK ((field_of_interest = ANY (ARRAY['engineering-tech'::text, 'medicine-health'::text, 'business-economics'::text, 'design-architecture'::text, 'natural-sciences'::text, 'social-humanities'::text, 'arts-fashion'::text, 'law-politics'::text, 'undecided'::text]))),
    CONSTRAINT expert_leads_full_name_check CHECK (((full_name = btrim(full_name)) AND ((char_length(full_name) >= 2) AND (char_length(full_name) <= 120)))),
    CONSTRAINT expert_leads_help_request_check CHECK (((help_request = btrim(help_request)) AND ((char_length(help_request) >= 10) AND (char_length(help_request) <= 3000)))),
    CONSTRAINT expert_leads_internal_note_check CHECK ((char_length(internal_note) <= 4000)),
    CONSTRAINT expert_leads_phone_check CHECK ((whatsapp_phone ~ '^\+[0-9]{8,15}$'::text)),
    CONSTRAINT expert_leads_status_check CHECK ((status = ANY (ARRAY['new'::text, 'contacted'::text, 'completed'::text, 'suspected'::text]))),
    CONSTRAINT expert_leads_study_level_check CHECK ((study_level = ANY (ARRAY['bachelor'::text, 'master'::text, 'undecided'::text]))),
    CONSTRAINT expert_leads_target_intake_check CHECK (((target_intake = 'undecided'::text) OR
CASE
    WHEN (target_intake ~ '^[0-9]{4}-[0-9]{4}$'::text) THEN ((SUBSTRING(target_intake FROM 6 FOR 4))::integer = ((SUBSTRING(target_intake FROM 1 FOR 4))::integer + 1))
    ELSE false
END))
);


ALTER TABLE public.expert_leads OWNER TO postgres;

--
-- Name: favorites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    university_id text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT favorites_university_id_format CHECK ((university_id ~ '^[0-9]{1,6}$'::text))
);

ALTER TABLE ONLY public.favorites FORCE ROW LEVEL SECURITY;


ALTER TABLE public.favorites OWNER TO postgres;

--
-- Name: mentor_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    student_display_name text NOT NULL,
    topic text NOT NULL,
    status text DEFAULT 'waiting_for_team'::text NOT NULL,
    last_sender_kind text DEFAULT 'student'::text NOT NULL,
    last_message_preview text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_message_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at timestamp with time zone,
    closed_by text,
    CONSTRAINT mentor_conversations_closed_by_check CHECK (((closed_by IS NULL) OR (closed_by = ANY (ARRAY['student'::text, 'staff'::text])))),
    CONSTRAINT mentor_conversations_closed_state_check CHECK ((((status = 'closed'::text) AND (closed_at IS NOT NULL) AND (closed_by IS NOT NULL)) OR ((status <> 'closed'::text) AND (closed_at IS NULL) AND (closed_by IS NULL)))),
    CONSTRAINT mentor_conversations_preview_length CHECK (((char_length(last_message_preview) >= 1) AND (char_length(last_message_preview) <= 160))),
    CONSTRAINT mentor_conversations_sender_check CHECK ((last_sender_kind = ANY (ARRAY['student'::text, 'staff'::text]))),
    CONSTRAINT mentor_conversations_status_check CHECK ((status = ANY (ARRAY['waiting_for_team'::text, 'waiting_for_student'::text, 'closed'::text]))),
    CONSTRAINT mentor_conversations_student_name_length CHECK (((char_length(btrim(student_display_name)) >= 1) AND (char_length(btrim(student_display_name)) <= 120))),
    CONSTRAINT mentor_conversations_topic_check CHECK ((topic = ANY (ARRAY['university-program'::text, 'application-documents'::text, 'scholarship-isee'::text, 'visa-residence'::text, 'student-life'::text, 'other'::text])))
);


ALTER TABLE public.mentor_conversations OWNER TO postgres;

--
-- Name: mentor_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_kind text NOT NULL,
    body text NOT NULL,
    client_nonce uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT mentor_messages_body_length CHECK (((char_length(body) >= 1) AND (char_length(body) <= 4000))),
    CONSTRAINT mentor_messages_body_trimmed CHECK ((body = btrim(body))),
    CONSTRAINT mentor_messages_sender_check CHECK ((sender_kind = ANY (ARRAY['student'::text, 'staff'::text])))
);


ALTER TABLE public.mentor_messages OWNER TO postgres;

--
-- Name: mentor_rpc_idempotency; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_rpc_idempotency (
    caller_user_id text NOT NULL,
    operation text NOT NULL,
    client_nonce uuid NOT NULL,
    conversation_id uuid NOT NULL,
    message_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT mentor_rpc_idempotency_operation_check CHECK ((operation = ANY (ARRAY['start'::text, 'send_student'::text, 'send_staff'::text]))),
    CONSTRAINT mentor_rpc_idempotency_result_check CHECK ((((operation = 'start'::text) AND (message_id IS NULL)) OR ((operation = ANY (ARRAY['send_student'::text, 'send_staff'::text])) AND (message_id IS NOT NULL))))
);


ALTER TABLE public.mentor_rpc_idempotency OWNER TO postgres;

--
-- Name: mentor_staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_staff (
    user_id text NOT NULL,
    display_name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT mentor_staff_display_name_length CHECK (((char_length(btrim(display_name)) >= 1) AND (char_length(btrim(display_name)) <= 120)))
);


ALTER TABLE public.mentor_staff OWNER TO postgres;

--
-- Name: program_admission_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.program_admission_details (
    department_id bigint NOT NULL,
    university_id bigint NOT NULL,
    raw_program_name text NOT NULL,
    raw_level text NOT NULL,
    raw_teaching_language text NOT NULL,
    campus text,
    degree_class text,
    admission_type text,
    academic_requirements text,
    language_requirements text,
    application_deadline_eu text,
    application_deadline_non_eu text,
    required_documents jsonb DEFAULT '[]'::jsonb NOT NULL,
    entry_exam_or_test text,
    tuition_or_fees_link text,
    official_program_url text NOT NULL,
    official_call_url text,
    source_quotes jsonb DEFAULT '[]'::jsonb NOT NULL,
    uncertain jsonb DEFAULT '[]'::jsonb NOT NULL,
    uncertainty_notes jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_file text NOT NULL,
    imported_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.program_admission_details OWNER TO postgres;

--
-- Name: program_degree_class_codes; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.program_degree_class_codes WITH (security_invoker='true') AS
 SELECT department_id,
    degree_class_codes
   FROM ( SELECT pad.department_id,
            array_to_string(ARRAY( SELECT m.m[1] AS m
                   FROM regexp_matches(COALESCE(pad.degree_class, ''::text), '\m(LMG\s*/\s*\d{1,2}|LM\s*-?\s*\d{1,2}|L\s*-?\s*\d{1,2})\M'::text, 'gi'::text) m(m)), ' '::text) AS degree_class_codes
           FROM public.program_admission_details pad) coded
  WHERE (degree_class_codes <> ''::text);


ALTER VIEW public.program_degree_class_codes OWNER TO postgres;

--
-- Name: VIEW program_degree_class_codes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.program_degree_class_codes IS 'Program basina resmi bolum sinifi kodlari (bosluk ayrimli, ham). Uygulama extractDegreeClassCodes ile normalize eder. Salt okunur.';


--
-- Name: sat_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sat_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    question_id text NOT NULL,
    selected_answer text NOT NULL,
    is_correct boolean NOT NULL,
    answered_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT sat_attempts_selected_answer_length CHECK ((char_length(selected_answer) <= 32))
);


ALTER TABLE public.sat_attempts OWNER TO postgres;

--
-- Name: sat_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sat_questions (
    id text NOT NULL,
    section text NOT NULL,
    domain text NOT NULL,
    skill text NOT NULL,
    skill_slug text NOT NULL,
    difficulty integer NOT NULL,
    question_type text NOT NULL,
    prompt text NOT NULL,
    choices jsonb,
    correct_answer jsonb NOT NULL,
    figure_path text,
    explanation_tr text,
    source_file text NOT NULL,
    needs_review boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    explanation_en text,
    CONSTRAINT sat_questions_difficulty_check CHECK ((difficulty = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT sat_questions_question_type_check CHECK ((question_type = ANY (ARRAY['mcq'::text, 'spr'::text]))),
    CONSTRAINT sat_questions_section_check CHECK ((section = ANY (ARRAY['math'::text, 'reading-writing'::text])))
);


ALTER TABLE public.sat_questions OWNER TO postgres;

--
-- Name: scholarship_regions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scholarship_regions (
    region_slug text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    region_name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    managing_bodies jsonb DEFAULT '[]'::jsonb NOT NULL,
    current_academic_year text,
    application_window text,
    isee_limit text,
    ispe_limit text,
    benefits text[] DEFAULT '{}'::text[] NOT NULL,
    housing_support text,
    canteen_support text,
    international_student_notes text,
    official_source_urls text[] DEFAULT '{}'::text[] NOT NULL,
    last_verified_at date,
    status_note text NOT NULL,
    completeness text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT scholarship_regions_completeness_check CHECK ((completeness = ANY (ARRAY['verified-full'::text, 'registry-only'::text])))
);

ALTER TABLE ONLY public.scholarship_regions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.scholarship_regions OWNER TO postgres;

--
-- Name: TABLE scholarship_regions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.scholarship_regions IS 'ARSIV (2026-09-26): kullanilmiyor. Site burs verisini lib/scholarships/regions.ts icinden okur; bu tablo 2026-03-30 verisidir. Istemci erisimi kapali; satirlar ve yedek yerinde.';


--
-- Name: universities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.universities (
    id bigint NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    name text NOT NULL,
    city text NOT NULL,
    type text NOT NULL,
    fee text NOT NULL,
    image text NOT NULL,
    description text NOT NULL,
    description_en text,
    website text NOT NULL,
    features text[] DEFAULT '{}'::text[] NOT NULL,
    features_en text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    history text
);

ALTER TABLE ONLY public.universities FORCE ROW LEVEL SECURITY;


ALTER TABLE public.universities OWNER TO postgres;

--
-- Name: university_departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.university_departments (
    id bigint NOT NULL,
    university_id bigint NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    languages text[] DEFAULT ARRAY['en'::text] NOT NULL,
    duration_years smallint DEFAULT 3 NOT NULL,
    level text DEFAULT 'bachelor'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT university_departments_duration_years_check CHECK (((duration_years >= 1) AND (duration_years <= 6))),
    CONSTRAINT university_departments_level_check CHECK ((level = ANY (ARRAY['bachelor'::text, 'master'::text, 'single-cycle'::text])))
);

ALTER TABLE ONLY public.university_departments FORCE ROW LEVEL SECURITY;


ALTER TABLE public.university_departments OWNER TO postgres;

--
-- Name: university_departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.university_departments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.university_departments_id_seq OWNER TO postgres;

--
-- Name: university_departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.university_departments_id_seq OWNED BY public.university_departments.id;


--
-- Name: user_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    storage_path text,
    category text,
    CONSTRAINT user_documents_category_check CHECK (((category IS NULL) OR (category = ANY (ARRAY['identity'::text, 'academic'::text, 'language'::text, 'letters'::text, 'financial'::text, 'other'::text])))),
    CONSTRAINT user_documents_file_name_length CHECK (((char_length(file_name) >= 1) AND (char_length(file_name) <= 255))),
    CONSTRAINT user_documents_file_url_length CHECK ((char_length(file_url) <= 300)),
    CONSTRAINT user_documents_storage_path_owner CHECK (((storage_path IS NOT NULL) AND (char_length(storage_path) <= 300) AND starts_with(storage_path, (user_id || '/'::text))))
);

ALTER TABLE ONLY public.user_documents FORCE ROW LEVEL SECURITY;


ALTER TABLE public.user_documents OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    user_id text NOT NULL,
    level text,
    fields text[] DEFAULT '{}'::text[] NOT NULL,
    budget text,
    city_pref text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_profiles_budget_check CHECK ((budget = ANY (ARRAY['scholarship-required'::text, 'support-helpful'::text, 'flexible'::text]))),
    CONSTRAINT user_profiles_city_pref_check CHECK ((city_pref = ANY (ARRAY['big-city'::text, 'student-city'::text, 'any'::text]))),
    CONSTRAINT user_profiles_fields_check CHECK (((cardinality(fields) <= 2) AND (array_position(fields, NULL::text) IS NULL) AND (fields <@ ARRAY['engineering-tech'::text, 'medicine-health'::text, 'business-economics'::text, 'design-architecture'::text, 'natural-sciences'::text, 'social-humanities'::text, 'arts-fashion'::text, 'law-politics'::text]))),
    CONSTRAINT user_profiles_level_check CHECK ((level = ANY (ARRAY['bachelor'::text, 'master'::text])))
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: university_departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.university_departments ALTER COLUMN id SET DEFAULT nextval('public.university_departments_id_seq'::regclass);


--
-- Name: community_links community_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_links
    ADD CONSTRAINT community_links_pkey PRIMARY KEY (id);


--
-- Name: expert_leads expert_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_leads
    ADD CONSTRAINT expert_leads_pkey PRIMARY KEY (id);


--
-- Name: expert_leads expert_leads_submission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_leads
    ADD CONSTRAINT expert_leads_submission_id_key UNIQUE (submission_id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_user_id_university_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_university_id_key UNIQUE (user_id, university_id);


--
-- Name: mentor_conversations mentor_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_conversations
    ADD CONSTRAINT mentor_conversations_pkey PRIMARY KEY (id);


--
-- Name: mentor_messages mentor_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_messages
    ADD CONSTRAINT mentor_messages_pkey PRIMARY KEY (id);


--
-- Name: mentor_rpc_idempotency mentor_rpc_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_rpc_idempotency
    ADD CONSTRAINT mentor_rpc_idempotency_pkey PRIMARY KEY (caller_user_id, operation, client_nonce);


--
-- Name: mentor_staff mentor_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_staff
    ADD CONSTRAINT mentor_staff_pkey PRIMARY KEY (user_id);


--
-- Name: program_admission_details program_admission_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_admission_details
    ADD CONSTRAINT program_admission_details_pkey PRIMARY KEY (department_id);


--
-- Name: sat_attempts sat_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sat_attempts
    ADD CONSTRAINT sat_attempts_pkey PRIMARY KEY (id);


--
-- Name: sat_questions sat_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sat_questions
    ADD CONSTRAINT sat_questions_pkey PRIMARY KEY (id);


--
-- Name: scholarship_regions scholarship_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scholarship_regions
    ADD CONSTRAINT scholarship_regions_pkey PRIMARY KEY (region_slug);


--
-- Name: universities universities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.universities
    ADD CONSTRAINT universities_pkey PRIMARY KEY (id);


--
-- Name: university_departments university_departments_id_university_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.university_departments
    ADD CONSTRAINT university_departments_id_university_id_key UNIQUE (id, university_id);


--
-- Name: university_departments university_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.university_departments
    ADD CONSTRAINT university_departments_pkey PRIMARY KEY (id);


--
-- Name: university_departments university_departments_university_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.university_departments
    ADD CONSTRAINT university_departments_university_id_slug_key UNIQUE (university_id, slug);


--
-- Name: user_documents user_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: community_links_sort_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX community_links_sort_order_idx ON public.community_links USING btree (sort_order, id);


--
-- Name: expert_leads_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX expert_leads_created_idx ON public.expert_leads USING btree (created_at DESC);


--
-- Name: expert_leads_status_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX expert_leads_status_created_idx ON public.expert_leads USING btree (status, created_at DESC);


--
-- Name: mentor_conversations_one_open_per_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX mentor_conversations_one_open_per_user ON public.mentor_conversations USING btree (user_id) WHERE (status <> 'closed'::text);


--
-- Name: mentor_conversations_queue_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mentor_conversations_queue_idx ON public.mentor_conversations USING btree (status, last_message_at DESC);


--
-- Name: mentor_conversations_user_last_message_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mentor_conversations_user_last_message_idx ON public.mentor_conversations USING btree (user_id, last_message_at DESC);


--
-- Name: mentor_messages_conversation_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mentor_messages_conversation_created_idx ON public.mentor_messages USING btree (conversation_id, created_at, id);


--
-- Name: mentor_rpc_idempotency_conversation_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mentor_rpc_idempotency_conversation_idx ON public.mentor_rpc_idempotency USING btree (conversation_id);


--
-- Name: mentor_rpc_idempotency_message_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX mentor_rpc_idempotency_message_idx ON public.mentor_rpc_idempotency USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: mentor_staff_one_active_operator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX mentor_staff_one_active_operator ON public.mentor_staff USING btree (active) WHERE (active = true);


--
-- Name: program_admission_details_university_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX program_admission_details_university_id_idx ON public.program_admission_details USING btree (university_id);


--
-- Name: sat_attempts_question_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sat_attempts_question_id_idx ON public.sat_attempts USING btree (question_id);


--
-- Name: sat_attempts_user_answered_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sat_attempts_user_answered_idx ON public.sat_attempts USING btree (user_id, answered_at);


--
-- Name: sat_attempts_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sat_attempts_user_idx ON public.sat_attempts USING btree (user_id, question_id);


--
-- Name: sat_questions_skill_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sat_questions_skill_idx ON public.sat_questions USING btree (section, skill_slug, difficulty);


--
-- Name: scholarship_regions_single_default_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX scholarship_regions_single_default_idx ON public.scholarship_regions USING btree (is_default) WHERE is_default;


--
-- Name: scholarship_regions_sort_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX scholarship_regions_sort_order_idx ON public.scholarship_regions USING btree (sort_order, region_slug);


--
-- Name: universities_sort_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX universities_sort_order_idx ON public.universities USING btree (sort_order, id);


--
-- Name: university_departments_university_sort_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX university_departments_university_sort_idx ON public.university_departments USING btree (university_id, sort_order, id);


--
-- Name: user_documents_user_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_documents_user_created_idx ON public.user_documents USING btree (user_id, created_at DESC);


--
-- Name: expert_leads expert_leads_hourly_cap; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER expert_leads_hourly_cap BEFORE INSERT ON public.expert_leads FOR EACH ROW EXECUTE FUNCTION public.enforce_expert_leads_hourly_cap();


--
-- Name: expert_leads expert_leads_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER expert_leads_set_updated_at BEFORE UPDATE ON public.expert_leads FOR EACH ROW EXECUTE FUNCTION public.set_expert_leads_updated_at();


--
-- Name: favorites favorites_per_user_cap; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER favorites_per_user_cap BEFORE INSERT ON public.favorites FOR EACH ROW EXECUTE FUNCTION public.enforce_favorites_per_user_cap();


--
-- Name: sat_attempts sat_attempts_daily_cap; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sat_attempts_daily_cap BEFORE INSERT ON public.sat_attempts FOR EACH ROW EXECUTE FUNCTION public.enforce_sat_attempts_daily_cap();


--
-- Name: community_links set_updated_at_community_links; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_community_links BEFORE UPDATE ON public.community_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: scholarship_regions set_updated_at_scholarship_regions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_scholarship_regions BEFORE UPDATE ON public.scholarship_regions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: universities set_updated_at_universities; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_universities BEFORE UPDATE ON public.universities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: university_departments set_updated_at_university_departments; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_university_departments BEFORE UPDATE ON public.university_departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_documents user_documents_per_user_cap; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER user_documents_per_user_cap BEFORE INSERT ON public.user_documents FOR EACH ROW EXECUTE FUNCTION public.enforce_user_documents_per_user_cap();


--
-- Name: mentor_messages mentor_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_messages
    ADD CONSTRAINT mentor_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.mentor_conversations(id) ON DELETE CASCADE;


--
-- Name: mentor_rpc_idempotency mentor_rpc_idempotency_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_rpc_idempotency
    ADD CONSTRAINT mentor_rpc_idempotency_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.mentor_conversations(id) ON DELETE CASCADE;


--
-- Name: mentor_rpc_idempotency mentor_rpc_idempotency_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_rpc_idempotency
    ADD CONSTRAINT mentor_rpc_idempotency_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.mentor_messages(id) ON DELETE CASCADE;


--
-- Name: program_admission_details program_admission_details_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_admission_details
    ADD CONSTRAINT program_admission_details_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.university_departments(id) ON DELETE CASCADE;


--
-- Name: program_admission_details program_admission_details_department_university_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_admission_details
    ADD CONSTRAINT program_admission_details_department_university_fkey FOREIGN KEY (department_id, university_id) REFERENCES public.university_departments(id, university_id) ON DELETE CASCADE;


--
-- Name: program_admission_details program_admission_details_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_admission_details
    ADD CONSTRAINT program_admission_details_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: sat_attempts sat_attempts_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sat_attempts
    ADD CONSTRAINT sat_attempts_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.sat_questions(id);


--
-- Name: university_departments university_departments_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.university_departments
    ADD CONSTRAINT university_departments_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: community_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_links ENABLE ROW LEVEL SECURITY;

--
-- Name: user_documents documents_delete_own_rows; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY documents_delete_own_rows ON public.user_documents FOR DELETE TO authenticated USING ((user_id = public.requesting_user_id()));


--
-- Name: user_documents documents_insert_own_rows; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY documents_insert_own_rows ON public.user_documents FOR INSERT TO authenticated WITH CHECK ((user_id = public.requesting_user_id()));


--
-- Name: user_documents documents_select_own_rows; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY documents_select_own_rows ON public.user_documents FOR SELECT TO authenticated USING ((user_id = public.requesting_user_id()));


--
-- Name: expert_leads; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expert_leads ENABLE ROW LEVEL SECURITY;

--
-- Name: expert_leads expert_leads_delete_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY expert_leads_delete_staff ON public.expert_leads FOR DELETE TO authenticated USING (( SELECT public.is_active_mentor_staff() AS is_active_mentor_staff));


--
-- Name: expert_leads expert_leads_select_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY expert_leads_select_staff ON public.expert_leads FOR SELECT TO authenticated USING (( SELECT public.is_active_mentor_staff() AS is_active_mentor_staff));


--
-- Name: expert_leads expert_leads_update_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY expert_leads_update_staff ON public.expert_leads FOR UPDATE TO authenticated USING (( SELECT public.is_active_mentor_staff() AS is_active_mentor_staff)) WITH CHECK (( SELECT public.is_active_mentor_staff() AS is_active_mentor_staff));


--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites favorites_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY favorites_delete_own ON public.favorites FOR DELETE TO authenticated USING ((user_id = public.requesting_user_id()));


--
-- Name: favorites favorites_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY favorites_insert_own ON public.favorites FOR INSERT TO authenticated WITH CHECK ((user_id = public.requesting_user_id()));


--
-- Name: favorites favorites_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY favorites_select_own ON public.favorites FOR SELECT TO authenticated USING ((user_id = public.requesting_user_id()));


--
-- Name: mentor_conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mentor_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_conversations mentor_conversations_select_allowed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mentor_conversations_select_allowed ON public.mentor_conversations FOR SELECT TO authenticated USING (((user_id = ( SELECT public.requesting_user_id() AS requesting_user_id)) OR ( SELECT public.is_active_mentor_staff() AS is_active_mentor_staff)));


--
-- Name: mentor_messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mentor_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_messages mentor_messages_select_allowed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mentor_messages_select_allowed ON public.mentor_messages FOR SELECT TO authenticated USING ((( SELECT public.is_active_mentor_staff() AS is_active_mentor_staff) OR (EXISTS ( SELECT 1
   FROM public.mentor_conversations conversation
  WHERE ((conversation.id = mentor_messages.conversation_id) AND (conversation.user_id = ( SELECT public.requesting_user_id() AS requesting_user_id)))))));


--
-- Name: mentor_rpc_idempotency; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mentor_rpc_idempotency ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_staff; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mentor_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: program_admission_details; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.program_admission_details ENABLE ROW LEVEL SECURITY;

--
-- Name: sat_attempts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sat_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: sat_attempts sat_attempts_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sat_attempts_insert_own ON public.sat_attempts FOR INSERT TO authenticated WITH CHECK ((user_id = public.requesting_user_id()));


--
-- Name: sat_attempts sat_attempts_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sat_attempts_select_own ON public.sat_attempts FOR SELECT TO authenticated USING ((user_id = public.requesting_user_id()));


--
-- Name: sat_questions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sat_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: scholarship_regions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.scholarship_regions ENABLE ROW LEVEL SECURITY;

--
-- Name: universities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

--
-- Name: university_departments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.university_departments ENABLE ROW LEVEL SECURITY;

--
-- Name: user_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles user_profiles_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_profiles_delete_own ON public.user_profiles FOR DELETE TO authenticated USING ((user_id = public.requesting_user_id()));


--
-- Name: user_profiles user_profiles_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_profiles_insert_own ON public.user_profiles FOR INSERT TO authenticated WITH CHECK ((user_id = public.requesting_user_id()));


--
-- Name: user_profiles user_profiles_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_profiles_select_own ON public.user_profiles FOR SELECT TO authenticated USING ((user_id = public.requesting_user_id()));


--
-- Name: user_profiles user_profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_profiles_update_own ON public.user_profiles FOR UPDATE TO authenticated USING ((user_id = public.requesting_user_id())) WITH CHECK ((user_id = public.requesting_user_id()));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION close_volunteer_conversation(p_conversation_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.close_volunteer_conversation(p_conversation_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.close_volunteer_conversation(p_conversation_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.close_volunteer_conversation(p_conversation_id uuid) TO service_role;


--
-- Name: FUNCTION enforce_expert_leads_hourly_cap(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enforce_expert_leads_hourly_cap() TO anon;
GRANT ALL ON FUNCTION public.enforce_expert_leads_hourly_cap() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_expert_leads_hourly_cap() TO service_role;


--
-- Name: FUNCTION enforce_favorites_per_user_cap(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enforce_favorites_per_user_cap() TO anon;
GRANT ALL ON FUNCTION public.enforce_favorites_per_user_cap() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_favorites_per_user_cap() TO service_role;


--
-- Name: FUNCTION enforce_sat_attempts_daily_cap(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enforce_sat_attempts_daily_cap() TO anon;
GRANT ALL ON FUNCTION public.enforce_sat_attempts_daily_cap() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_sat_attempts_daily_cap() TO service_role;


--
-- Name: FUNCTION enforce_user_documents_per_user_cap(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enforce_user_documents_per_user_cap() TO anon;
GRANT ALL ON FUNCTION public.enforce_user_documents_per_user_cap() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_user_documents_per_user_cap() TO service_role;


--
-- Name: FUNCTION is_active_mentor_staff(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.is_active_mentor_staff() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_active_mentor_staff() TO authenticated;
GRANT ALL ON FUNCTION public.is_active_mentor_staff() TO service_role;


--
-- Name: FUNCTION requesting_user_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.requesting_user_id() TO anon;
GRANT ALL ON FUNCTION public.requesting_user_id() TO authenticated;
GRANT ALL ON FUNCTION public.requesting_user_id() TO service_role;


--
-- Name: FUNCTION send_staff_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.send_staff_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.send_staff_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid) TO authenticated;
GRANT ALL ON FUNCTION public.send_staff_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid) TO service_role;


--
-- Name: FUNCTION send_student_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.send_student_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.send_student_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid) TO authenticated;
GRANT ALL ON FUNCTION public.send_student_mentor_message(p_conversation_id uuid, p_body text, p_client_nonce uuid) TO service_role;


--
-- Name: FUNCTION set_expert_leads_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_expert_leads_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_expert_leads_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_expert_leads_updated_at() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION start_volunteer_conversation(p_topic text, p_display_name text, p_body text, p_client_nonce uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.start_volunteer_conversation(p_topic text, p_display_name text, p_body text, p_client_nonce uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.start_volunteer_conversation(p_topic text, p_display_name text, p_body text, p_client_nonce uuid) TO authenticated;
GRANT ALL ON FUNCTION public.start_volunteer_conversation(p_topic text, p_display_name text, p_body text, p_client_nonce uuid) TO service_role;


--
-- Name: TABLE community_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.community_links TO service_role;


--
-- Name: TABLE expert_leads; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.expert_leads TO service_role;
GRANT SELECT,DELETE,UPDATE ON TABLE public.expert_leads TO authenticated;


--
-- Name: TABLE favorites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.favorites TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.favorites TO authenticated;


--
-- Name: TABLE mentor_conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mentor_conversations TO service_role;
GRANT SELECT ON TABLE public.mentor_conversations TO authenticated;


--
-- Name: TABLE mentor_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mentor_messages TO service_role;
GRANT SELECT ON TABLE public.mentor_messages TO authenticated;


--
-- Name: TABLE mentor_rpc_idempotency; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mentor_rpc_idempotency TO service_role;


--
-- Name: TABLE mentor_staff; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mentor_staff TO service_role;


--
-- Name: TABLE program_admission_details; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.program_admission_details TO service_role;


--
-- Name: TABLE program_degree_class_codes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.program_degree_class_codes TO service_role;


--
-- Name: TABLE sat_attempts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE public.sat_attempts TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sat_attempts TO service_role;


--
-- Name: TABLE sat_questions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sat_questions TO service_role;


--
-- Name: TABLE scholarship_regions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.scholarship_regions TO service_role;


--
-- Name: TABLE universities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.universities TO service_role;


--
-- Name: TABLE university_departments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.university_departments TO service_role;


--
-- Name: SEQUENCE university_departments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.university_departments_id_seq TO service_role;


--
-- Name: TABLE user_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_documents TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.user_documents TO authenticated;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_profiles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_profiles TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict italypathschema20260926


-- ---------------------------------------------------------------------------
-- Supabase-managed settings (read with psql at dump time; not executable)
-- bucket documents: public=false, file_size_limit=5242880, allowed_mime_types=application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif
-- bucket sat-figures: public=true, file_size_limit=524288, allowed_mime_types=image/webp
-- policy documents_delete_own_objects (DELETE to authenticated)
--   using: ((bucket_id = 'documents'::text) AND (split_part(name, '/'::text, 1) = requesting_user_id()))
-- policy documents_insert_own_objects (INSERT to authenticated)
--   with check: ((bucket_id = 'documents'::text) AND (split_part(name, '/'::text, 1) = requesting_user_id()) AND (( SELECT count(*) AS count FROM storage.objects existing WHERE ((existing.bucket_id = 'documents'::text) AND (split_part(existing.name, '/'::text, 1) = requesting_user_id()))) < 30))
-- policy documents_select_own_objects (SELECT to authenticated)
--   using: ((bucket_id = 'documents'::text) AND (split_part(name, '/'::text, 1) = requesting_user_id()))
-- policy documents_update_own_objects (UPDATE to authenticated)
--   using: ((bucket_id = 'documents'::text) AND (split_part(name, '/'::text, 1) = requesting_user_id()))
--   with check: ((bucket_id = 'documents'::text) AND (split_part(name, '/'::text, 1) = requesting_user_id()))
-- realtime publication table: public.mentor_conversations
-- realtime publication table: public.mentor_messages
-- server version: 17.6
