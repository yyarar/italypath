# Volunteer Mentor Desk V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the ItalyPath Volunteer Team desk as a persistent, end-to-end student-to-human messaging experience with a single authorized operator inbox.

**Architecture:** Keep `/ai-mentor` as the desk router, preserve the existing Gemini stream for the AI desk, and give the volunteer desk its own Supabase-backed client experience. Reads and live updates use Clerk-authenticated Supabase RLS + Realtime; atomic Postgres RPCs own conversation creation, student/staff sends, state transitions, and closing. `/ekip/mentor` is a separate RLS-protected single-operator inbox.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Clerk 6, Supabase JS 2.95/Postgres RLS/Realtime, Tailwind CSS v4, Framer Motion 12, Node smoke-check scripts.

## Global Constraints

- Read and preserve the approved spec: `docs/superpowers/specs/2026-07-20-volunteer-mentor-desk-design.md`.
- Do not implement the expert lead form in this plan; the expert desk remains `coming-soon`.
- The volunteer desk is asynchronous human messaging, not an instant-response promise.
- V1 has exactly one operator and no assignment, claim, role hierarchy, SLA, analytics, internal notes, canned replies, presence, typing indicator, read receipts, or automatic close.
- Students see every staff reply as `ItalyPath Gönüllü Ekip`; never expose the real staff Clerk ID in student-readable rows.
- Each student may have one open conversation at a time; both student and operator can close it.
- Messages are immutable plain text, trimmed to 1–4000 characters. Do not render volunteer messages with ReactMarkdown or HTML.
- No attachments and no automatic email/SMS/WhatsApp/Slack/push notifications.
- Closed history stays for the account lifetime; the account/data deletion runbook must delete mentor conversations and cascade messages.
- Use native Clerk session tokens (`getToken()`), not `getToken({ template: "supabase" })`, in the new mentor hooks.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code.
- Keep hooks under `lib/`; explicit Supabase row interfaces go in `types/index.ts`.
- Keep every new TR/EN UI string structurally parallel in `lib/translations.ts`.
- Use the existing editorial paper/sage/terracotta system; no gradient, sparkle, indigo SaaS styling, rounded chat bubbles, or Tailwind config file.
- Preserve unrelated dirty-worktree edits, especially current changes in `components/cities/CityGuidesExplorer.tsx`, `lib/translations.ts`, and `scripts/check-cities-data.mjs`.
- Before each commit run `git diff --check`; stage only files owned by that task.

---

## File Structure Map

### Create

| File | Responsibility |
| --- | --- |
| `supabase/volunteer_mentor.sql` | Tables, constraints, RLS, Realtime publication, and four atomic write RPCs |
| `scripts/check-mentor-desks.mjs` | Permanent source/SQL/route/translation guard for mentor desks |
| `lib/mentor/volunteer.ts` | Stable topic/status IDs and message dedupe helper |
| `lib/mentor/useMentorSupabaseClient.ts` | Native Clerk-token Supabase client shared by student and operator hooks |
| `lib/mentor/useVolunteerDesk.ts` | Student queries, RPC actions, Realtime subscription, and reconnect state |
| `lib/mentor/useMentorOperatorInbox.ts` | Staff gate, queue/thread queries, reply/close actions, and Realtime |
| `components/mentor/volunteer/VolunteerDesk.tsx` | Student volunteer-desk state orchestration |
| `components/mentor/volunteer/VolunteerConversationStart.tsx` | Topic + first-message intake |
| `components/mentor/volunteer/VolunteerThread.tsx` | Chronological thread shell |
| `components/mentor/volunteer/VolunteerMessage.tsx` | Plain-text student/staff message presentation |
| `components/mentor/volunteer/VolunteerComposer.tsx` | Draft-preserving text submission |
| `components/mentor/volunteer/VolunteerConversationStatus.tsx` | Waiting/closed/reconnect status strip |
| `components/mentor/volunteer/VolunteerConversationHistory.tsx` | Closed conversation navigation |
| `components/mentor/operator/MentorOperatorGate.tsx` | Staff authorization loading/denial states |
| `components/mentor/operator/MentorOperatorInbox.tsx` | Operator queue/thread orchestration |
| `components/mentor/operator/OperatorConversationList.tsx` | Status-filtered conversation rows |
| `components/mentor/operator/OperatorConversationThread.tsx` | Selected conversation and close action |
| `components/mentor/operator/OperatorReplyComposer.tsx` | Brand-identity staff reply form |
| `app/ekip/mentor/page.tsx` | Protected operator route client entry |

### Modify

| File | Responsibility of change |
| --- | --- |
| `package.json` | Add `check:mentor-desks` |
| `types/index.ts` | Add mentor row interfaces |
| `lib/supabaseClient.ts` | Make helper documentation valid for native Clerk tokens |
| `lib/mentor/channels.ts` | Separate desk experience from availability |
| `components/mentor/MentorHub.tsx` | Read `availability`, show volunteer active when integrated |
| `components/mentor/MentorChatRoom.tsx` | Read `availability`; remain AI/locked-expert only |
| `app/ai-mentor/page.tsx` | Route AI, volunteer, and locked expert to separate experiences |
| `lib/translations.ts` | Add complete student/operator TR+EN copy and correct live program wording |
| `proxy.ts` | Add `/ekip` to protected-page redirect handling |
| `app/robots.ts` | Disallow `/ekip` |
| `scripts/check-route-access.mjs` | Assert `/ekip/mentor` is protected |
| `lib/legal/documents.ts` | Disclose human volunteer messages, access, purpose, and retention |
| `SUPABASE_SECURITY_RUNBOOK.md` | Native Clerk preflight, staff provisioning, SQL verification, data deletion |
| `AGENT_CONTEXT.md` | Document the live volunteer desk, tables, operator route, and checks |
| `AGENT_COMMITS.md` | Record the completed volunteer desk change set |

## Task 1: Lock the Mentor Domain Contract

**Files:**
- Create: `scripts/check-mentor-desks.mjs`
- Create: `lib/mentor/volunteer.ts`
- Modify: `package.json`
- Modify: `types/index.ts`
- Modify: `lib/mentor/channels.ts`
- Modify: `components/mentor/MentorHub.tsx`
- Modify: `components/mentor/MentorChatRoom.tsx`

**Interfaces:**
- Consumes: current `MentorChannelId`, `MentorHub`, and `MentorChatRoom` APIs.
- Produces: `MentorExperience`, `MentorAvailability`, `VolunteerTopicId`, `MentorConversationStatus`, `MentorConversationRow`, `MentorMessageRow`, and `mergeMentorMessages()` for all later tasks.

- [ ] **Step 1: Add the mentor check command and write the first failing guard**

Add this script to `package.json` immediately after `check:hub-onboarding`:

```json
"check:mentor-desks": "node scripts/check-mentor-desks.mjs",
```

Create `scripts/check-mentor-desks.mjs`:

```js
import { existsSync, readFileSync } from "node:fs";

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`Eksik dosya: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function mustInclude(source, needle, label) {
  if (!source.includes(needle)) failures.push(`${label}: ${needle}`);
}

function mustNotInclude(source, needle, label) {
  if (source.includes(needle)) failures.push(`${label}: ${needle}`);
}

const channels = read("lib/mentor/channels.ts");
const volunteer = read("lib/mentor/volunteer.ts");
const types = read("types/index.ts");

mustInclude(channels, '"ai-chat"', "AI experience eksik");
mustInclude(channels, '"volunteer-inbox"', "Volunteer experience eksik");
mustInclude(channels, '"expert-lead"', "Expert experience eksik");
mustInclude(channels, "availability", "Availability modeli eksik");
mustNotInclude(channels, "MentorChannelStatus", "Eski status tipi kaldı");
mustInclude(volunteer, "VOLUNTEER_TOPIC_IDS", "Konu ID'leri eksik");
mustInclude(volunteer, "MENTOR_CONVERSATION_STATUSES", "Durum ID'leri eksik");
mustInclude(volunteer, "mergeMentorMessages", "Mesaj dedupe helper eksik");
mustInclude(types, "MentorConversationRow", "Conversation row tipi eksik");
mustInclude(types, "MentorMessageRow", "Message row tipi eksik");

if (failures.length) {
  for (const failure of failures) console.error(`HATA: ${failure}`);
  process.exit(1);
}

console.log("check-mentor-desks: PASS");
```

- [ ] **Step 2: Run the guard and verify the domain contract fails**

Run: `npm run check:mentor-desks`

Expected: FAIL with missing `lib/mentor/volunteer.ts`, `"volunteer-inbox"`, `availability`, and mentor row type messages.

- [ ] **Step 3: Replace the channel model with experience + availability**

Replace `lib/mentor/channels.ts` with:

```ts
export const MENTOR_CHANNEL_IDS = ["ai", "volunteer", "expert"] as const;
export type MentorChannelId = (typeof MENTOR_CHANNEL_IDS)[number];

export type MentorExperience = "ai-chat" | "volunteer-inbox" | "expert-lead";
export type MentorAvailability = "active" | "paused" | "coming-soon";

export interface MentorChannel {
  id: MentorChannelId;
  order: number;
  numberLabel: string;
  monogram: string;
  experience: MentorExperience;
  availability: MentorAvailability;
}

export const MENTOR_CHANNELS: MentorChannel[] = [
  {
    id: "ai",
    order: 1,
    numberLabel: "01",
    monogram: "AI",
    experience: "ai-chat",
    availability: "active",
  },
  {
    id: "volunteer",
    order: 2,
    numberLabel: "02",
    monogram: "GE",
    experience: "volunteer-inbox",
    availability: "coming-soon",
  },
  {
    id: "expert",
    order: 3,
    numberLabel: "03",
    monogram: "UZ",
    experience: "expert-lead",
    availability: "coming-soon",
  },
];

export function getMentorChannel(id: MentorChannelId): MentorChannel {
  const channel = MENTOR_CHANNELS.find((candidate) => candidate.id === id);
  if (!channel) throw new Error(`Unknown mentor channel: ${id}`);
  return channel;
}
```

Keep the volunteer desk `coming-soon` until Task 5 wires the real student surface.

In `components/mentor/MentorHub.tsx`, replace both `channel.status` reads with:

```ts
const isActive = channel.availability === "active";
```

In `components/mentor/MentorChatRoom.tsx`, replace the locked calculation with:

```ts
const isLocked = channel.availability !== "active";
```

- [ ] **Step 4: Add stable volunteer IDs and the dedupe helper**

Create `lib/mentor/volunteer.ts`:

```ts
import type { MentorMessageRow } from "@/types";

export const VOLUNTEER_TOPIC_IDS = [
  "university-program",
  "application-documents",
  "scholarship-isee",
  "visa-residence",
  "student-life",
  "other",
] as const;

export type VolunteerTopicId = (typeof VOLUNTEER_TOPIC_IDS)[number];

export const MENTOR_CONVERSATION_STATUSES = [
  "waiting_for_team",
  "waiting_for_student",
  "closed",
] as const;

export type MentorConversationStatus =
  (typeof MENTOR_CONVERSATION_STATUSES)[number];
export type MentorSenderKind = "student" | "staff";
export type MentorRealtimeState = "connecting" | "connected" | "disconnected";

export function isVolunteerTopicId(value: string): value is VolunteerTopicId {
  return VOLUNTEER_TOPIC_IDS.includes(value as VolunteerTopicId);
}

export function mergeMentorMessages(
  current: MentorMessageRow[],
  incoming: MentorMessageRow[],
): MentorMessageRow[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((left, right) => {
    const timeDelta = Date.parse(left.created_at) - Date.parse(right.created_at);
    return timeDelta || left.id.localeCompare(right.id);
  });
}
```

- [ ] **Step 5: Add explicit mentor row interfaces**

Append to `types/index.ts`:

```ts
export interface MentorStaffRow {
  user_id: string;
  display_name: string;
  active: boolean;
  created_at: string;
}

export interface MentorConversationRow {
  id: string;
  user_id: string;
  student_display_name: string;
  topic:
    | "university-program"
    | "application-documents"
    | "scholarship-isee"
    | "visa-residence"
    | "student-life"
    | "other";
  status: "waiting_for_team" | "waiting_for_student" | "closed";
  last_sender_kind: "student" | "staff";
  last_message_preview: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  closed_at: string | null;
  closed_by: "student" | "staff" | null;
}

export interface MentorMessageRow {
  id: string;
  conversation_id: string;
  sender_kind: "student" | "staff";
  body: string;
  client_nonce: string;
  created_at: string;
}
```

- [ ] **Step 6: Run the focused checks**

Run:

```bash
npm run check:mentor-desks
npx eslint lib/mentor/channels.ts lib/mentor/volunteer.ts components/mentor/MentorHub.tsx components/mentor/MentorChatRoom.tsx types/index.ts
git diff --check
```

Expected: mentor check PASS, ESLint exits 0, and `git diff --check` prints nothing.

- [ ] **Step 7: Commit the domain contract**

```bash
git add package.json scripts/check-mentor-desks.mjs lib/mentor/channels.ts lib/mentor/volunteer.ts components/mentor/MentorHub.tsx components/mentor/MentorChatRoom.tsx types/index.ts
git commit -m "feat: define volunteer mentor domain"
```

## Task 2: Build the Supabase Security Boundary

**Files:**
- Create: `supabase/volunteer_mentor.sql`
- Modify: `scripts/check-mentor-desks.mjs`
- Modify: `SUPABASE_SECURITY_RUNBOOK.md`

**Interfaces:**
- Consumes: topic/status values and row shapes from Task 1.
- Produces: `is_active_mentor_staff()`, `start_volunteer_conversation()`, `send_student_mentor_message()`, `send_staff_mentor_message()`, and `close_volunteer_conversation()` RPCs.

- [ ] **Step 1: Extend the guard with failing SQL assertions**

Add after the existing source reads in `scripts/check-mentor-desks.mjs`:

```js
const sql = read("supabase/volunteer_mentor.sql");
```

Add before the final failure block:

```js
[
  "create table if not exists public.mentor_staff",
  "create table if not exists public.mentor_conversations",
  "create table if not exists public.mentor_messages",
  "mentor_conversations_one_open_per_user",
  "enable row level security",
  "is_active_mentor_staff",
  "start_volunteer_conversation",
  "send_student_mentor_message",
  "send_staff_mentor_message",
  "close_volunteer_conversation",
  "supabase_realtime",
  "client_nonce",
].forEach((needle) => mustInclude(sql, needle, "Mentor SQL eksik"));

mustNotInclude(sql, "SUPABASE_SERVICE_ROLE_KEY", "SQL dosyasında client secret referansı");
```

- [ ] **Step 2: Run the guard and verify the SQL task fails**

Run: `npm run check:mentor-desks`

Expected: FAIL with `Eksik dosya: supabase/volunteer_mentor.sql` and SQL needle failures.

- [ ] **Step 3: Create the schema, RLS, publication, and RPCs**

Create `supabase/volunteer_mentor.sql` with this transaction. Preserve the exact topic,
status, sender, preview, and message constraints:

```sql
begin;

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
  client_nonce uuid not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mentor_messages_sender_check
    check (sender_kind in ('student', 'staff')),
  constraint mentor_messages_body_length
    check (char_length(body) between 1 and 4000),
  constraint mentor_messages_body_trimmed
    check (body = btrim(body))
);

create index if not exists mentor_messages_conversation_created_idx
  on public.mentor_messages (conversation_id, created_at, id);

alter table public.mentor_staff enable row level security;
alter table public.mentor_conversations enable row level security;
alter table public.mentor_messages enable row level security;

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
  if not (p_topic = any (array[
    'university-program',
    'application-documents',
    'scholarship-isee',
    'visa-residence',
    'student-life',
    'other'
  ]::text[])) then
    raise exception 'invalid_topic' using errcode = '22023';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'invalid_message_length' using errcode = '22023';
  end if;
  if p_client_nonce is null then
    raise exception 'client_nonce_required' using errcode = '22023';
  end if;

  select message.conversation_id
  into v_conversation_id
  from public.mentor_messages message
  join public.mentor_conversations conversation
    on conversation.id = message.conversation_id
  where message.client_nonce = p_client_nonce
    and conversation.user_id = v_user_id;
  if found then return v_conversation_id; end if;

  select id
  into v_conversation_id
  from public.mentor_conversations
  where user_id = v_user_id and status <> 'closed'
  limit 1;
  if found then
    raise exception 'open_conversation_exists' using errcode = 'P0001';
  end if;

  begin
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
  exception when unique_violation then
    select id
    into v_conversation_id
    from public.mentor_conversations
    where user_id = v_user_id and status <> 'closed'
    limit 1;
    if v_conversation_id is null then raise; end if;
    return v_conversation_id;
  end;

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
  v_message_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'invalid_message_length' using errcode = '22023';
  end if;
  if p_client_nonce is null then
    raise exception 'client_nonce_required' using errcode = '22023';
  end if;

  select message.id into v_message_id
  from public.mentor_messages message
  join public.mentor_conversations conversation
    on conversation.id = message.conversation_id
  where message.client_nonce = p_client_nonce
    and message.conversation_id = p_conversation_id
    and conversation.user_id = v_user_id;
  if found then return v_message_id; end if;

  select * into v_conversation
  from public.mentor_conversations
  where id = p_conversation_id
  for update;

  if not found or v_conversation.user_id <> v_user_id then
    raise exception 'conversation_not_found' using errcode = '42501';
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
  v_body text := btrim(p_body);
  v_conversation public.mentor_conversations%rowtype;
  v_message_id uuid;
begin
  if not public.is_active_mentor_staff() then
    raise exception 'staff_access_required' using errcode = '42501';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'invalid_message_length' using errcode = '22023';
  end if;
  if p_client_nonce is null then
    raise exception 'client_nonce_required' using errcode = '22023';
  end if;

  select id into v_message_id
  from public.mentor_messages
  where client_nonce = p_client_nonce;
  if found then return v_message_id; end if;

  select * into v_conversation
  from public.mentor_conversations
  where id = p_conversation_id
  for update;

  if not found then
    raise exception 'conversation_not_found' using errcode = 'P0002';
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
```

- [ ] **Step 4: Add exact operational steps to the security runbook**

Append a `Volunteer Mentor` section to `SUPABASE_SECURITY_RUNBOOK.md` with these
non-secret actions:

1. Enable Clerk under Supabase Dashboard → Authentication → Third-Party Auth.
2. Confirm a normal Clerk session token has `role=authenticated` and that `sub` exactly
   matches the signed-in user's Clerk Dashboard user ID.
3. Run `supabase/volunteer_mentor.sql` in Supabase SQL Editor.
4. In Clerk Dashboard copy Kerem's exact user ID; in Supabase Table Editor insert one
   `mentor_staff` row with that ID, display name `Kerem`, and `active=true`.
5. For account/data deletion, delete the user's `mentor_conversations` rows; verify
   `mentor_messages` rows disappear through `on delete cascade`.
6. Never put the operator ID or a service-role key in client source.

Add these verification queries exactly:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('mentor_staff', 'mentor_conversations', 'mentor_messages')
order by tablename;

select policyname, tablename, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('mentor_conversations', 'mentor_messages')
order by tablename, policyname;

select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('mentor_conversations', 'mentor_messages')
order by tablename;
```

- [ ] **Step 5: Run static security checks**

Run:

```bash
npm run check:mentor-desks
rg -n "sender_user_id|SUPABASE_SERVICE_ROLE_KEY" supabase/volunteer_mentor.sql
git diff --check
```

Expected: mentor check PASS; `rg` returns no matches; diff check prints nothing.

- [ ] **Step 6: Commit the database contract**

```bash
git add supabase/volunteer_mentor.sql scripts/check-mentor-desks.mjs SUPABASE_SECURITY_RUNBOOK.md
git commit -m "feat: add volunteer mentor data model"
```

## Task 3: Build the Student Data Hook

**Files:**
- Create: `lib/mentor/useMentorSupabaseClient.ts`
- Create: `lib/mentor/useVolunteerDesk.ts`
- Modify: `lib/supabaseClient.ts`
- Modify: `scripts/check-mentor-desks.mjs`

**Interfaces:**
- Consumes: Task 1 row/domain types and Task 2 RPC names.
- Produces: `useMentorSupabaseClient()` and `useVolunteerDesk()` for the student UI and the shared native-token client for the operator hook.

- [ ] **Step 1: Extend the guard with failing native-token and hook assertions**

Add these reads to `scripts/check-mentor-desks.mjs`:

```js
const mentorClient = read("lib/mentor/useMentorSupabaseClient.ts");
const studentHook = read("lib/mentor/useVolunteerDesk.ts");
```

Add these assertions before the final failure block:

```js
mustInclude(mentorClient, "getToken()", "Native Clerk token kullanılmıyor");
mustNotInclude(mentorClient, 'template: "supabase"', "Deprecated JWT template kullanılıyor");
mustInclude(studentHook, 'rpc("start_volunteer_conversation"', "Start RPC eksik");
mustInclude(studentHook, 'rpc("send_student_mentor_message"', "Student send RPC eksik");
mustInclude(studentHook, 'rpc("close_volunteer_conversation"', "Close RPC eksik");
mustInclude(studentHook, "realtime.setAuth()", "Realtime auth eksik");
mustInclude(studentHook, 'table: "mentor_messages"', "Message subscription eksik");
mustInclude(studentHook, "mergeMentorMessages", "Realtime dedupe eksik");
mustNotInclude(studentHook, "SUPABASE_SERVICE_ROLE_KEY", "Student hook service role içeriyor");
```

- [ ] **Step 2: Run the guard and verify the hook task fails**

Run: `npm run check:mentor-desks`

Expected: FAIL with both hook files missing and all native-token/RPC/Realtime assertions.

- [ ] **Step 3: Create the shared native Clerk-token client hook**

Create `lib/mentor/useMentorSupabaseClient.ts`:

```ts
"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";

import { createClerkSupabaseClient } from "@/lib/supabaseClient";

export function useMentorSupabaseClient() {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClerkSupabaseClient(async () => {
        try {
          return await getToken();
        } catch {
          return null;
        }
      }),
    [getToken],
  );
}
```

In `lib/supabaseClient.ts`, replace the JWT-template-only comment with:

```ts
/**
 * Clerk access tokenıyla RLS uyumlu Supabase client üretir.
 * Tokenın kabul edilmesi için Clerk, Supabase third-party auth provider olarak
 * yapılandırılmış olmalıdır.
 */
```

Do not change existing favorites/documents/profile callers in this task.

- [ ] **Step 4: Create the student conversation hook with the exact public contract**

Create `lib/mentor/useVolunteerDesk.ts`. The exported result must be:

```ts
export interface UseVolunteerDeskResult {
  openConversation: MentorConversationRow | null;
  closedConversations: MentorConversationRow[];
  selectedConversation: MentorConversationRow | null;
  messages: MentorMessageRow[];
  loading: boolean;
  messagesLoading: boolean;
  sending: boolean;
  closing: boolean;
  error: string | null;
  realtimeState: MentorRealtimeState;
  selectConversation: (conversationId: string | null) => void;
  startConversation: (topic: VolunteerTopicId, body: string) => Promise<void>;
  sendMessage: (body: string) => Promise<void>;
  closeConversation: (conversationId: string) => Promise<void>;
  reload: () => Promise<void>;
}
```

Use these imports and state fields:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

import {
  mergeMentorMessages,
  type MentorRealtimeState,
  type VolunteerTopicId,
} from "@/lib/mentor/volunteer";
import { useMentorSupabaseClient } from "@/lib/mentor/useMentorSupabaseClient";
import type { MentorConversationRow, MentorMessageRow } from "@/types";

function rpcUuid(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("mentor_rpc_invalid_response");
  }
  return value;
}
```

Start the hook body with:

```ts
const { user, isLoaded } = useUser();
const supabase = useMentorSupabaseClient();
const pendingStartRef = useRef<{ key: string; nonce: string } | null>(null);
const pendingSendRef = useRef<{ key: string; nonce: string } | null>(null);
```

The hook must keep these exact states:

```ts
const [conversations, setConversations] = useState<MentorConversationRow[]>([]);
const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
const [messages, setMessages] = useState<MentorMessageRow[]>([]);
const [loading, setLoading] = useState(true);
const [messagesLoading, setMessagesLoading] = useState(false);
const [sending, setSending] = useState(false);
const [closing, setClosing] = useState(false);
const [error, setError] = useState<string | null>(null);
const [realtimeState, setRealtimeState] =
  useState<MentorRealtimeState>("connecting");
```

Implement the derived records exactly as follows:

```ts
const openConversation =
  conversations.find((conversation) => conversation.status !== "closed") ?? null;
const closedConversations = conversations.filter(
  (conversation) => conversation.status === "closed",
);
const selectedConversation =
  conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
```

Implement `refreshConversations(showLoading = true)` with this query and selection rule:

```ts
const refreshConversations = useCallback(
  async (showLoading = true) => {
    if (!user?.id) {
      setConversations([]);
      setSelectedConversationId(null);
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    const { data, error: queryError } = await supabase
      .from("mentor_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false });
    if (queryError) {
      setError("load_failed");
      setLoading(false);
      throw queryError;
    }
    const rows = (data ?? []) as MentorConversationRow[];
    setConversations(rows);
    setSelectedConversationId((current) => {
      if (current && rows.some((row) => row.id === current)) return current;
      return rows.find((row) => row.status !== "closed")?.id ?? null;
    });
    setError(null);
    setLoading(false);
  },
  [supabase, user?.id],
);
```

Implement message loading with ordered, deduplicated rows:

```ts
const refreshMessages = useCallback(
  async (conversationId: string | null) => {
    if (!conversationId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }
    setMessagesLoading(true);
    const { data, error: queryError } = await supabase
      .from("mentor_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (queryError) {
      setError("messages_load_failed");
      setMessagesLoading(false);
      throw queryError;
    }
    setMessages((data ?? []) as MentorMessageRow[]);
    setMessagesLoading(false);
  },
  [supabase],
);
```

Initial loading effects must wait for Clerk and reload messages whenever the selection changes:

```ts
useEffect(() => {
  if (!isLoaded) return;
  void refreshConversations().catch(() => undefined);
}, [isLoaded, refreshConversations]);

useEffect(() => {
  void refreshMessages(selectedConversationId).catch(() => undefined);
}, [refreshMessages, selectedConversationId]);
```

Add one conversation channel and one selected-thread channel. Before subscribing call
`await supabase.realtime.setAuth()`. Use these filters:

```ts
filter: `user_id=eq.${user.id}`
```

for `mentor_conversations`, and:

```ts
filter: `conversation_id=eq.${selectedConversationId}`
```

for `mentor_messages`. Conversation INSERT/UPDATE callbacks call
`refreshConversations(false)`. Message INSERT callbacks cast `payload.new` to
`MentorMessageRow` and call:

```ts
setMessages((current) =>
  mergeMentorMessages(current, [payload.new as MentorMessageRow]),
);
```

Subscription status handling is exact:

```ts
if (status === "SUBSCRIBED") setRealtimeState("connected");
if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
  setRealtimeState("disconnected");
}
```

Every effect cleanup calls `void supabase.removeChannel(channel)` and prevents a late
async setup from attaching after unmount.

Implement the three actions with a nonce that remains stable for the same unsatisfied
draft. If the database commits but the network response is lost, retrying the same
conversation/topic/body must reuse the nonce. A different draft gets a new nonce. Raw
DB errors are converted to stable UI codes, and success clears the pending nonce:

```ts
const startConversation = useCallback(
  async (topic: VolunteerTopicId, body: string) => {
    setSending(true);
    setError(null);
    try {
      const displayName = user?.fullName?.trim() || user?.firstName?.trim() || "Öğrenci";
      const pendingKey = `${topic}\u0000${body}`;
      if (pendingStartRef.current?.key !== pendingKey) {
        pendingStartRef.current = { key: pendingKey, nonce: crypto.randomUUID() };
      }
      const { data, error: rpcError } = await supabase.rpc(
        "start_volunteer_conversation",
        {
          p_topic: topic,
          p_display_name: displayName,
          p_body: body,
          p_client_nonce: pendingStartRef.current.nonce,
        },
      );
      if (rpcError) throw rpcError;
      const conversationId = rpcUuid(data);
      await refreshConversations(false);
      setSelectedConversationId(conversationId);
      await refreshMessages(conversationId);
      pendingStartRef.current = null;
    } catch (actionError) {
      setError("send_failed");
      throw actionError;
    } finally {
      setSending(false);
    }
  },
  [refreshConversations, refreshMessages, supabase, user?.firstName, user?.fullName],
);

const sendMessage = useCallback(
  async (body: string) => {
    if (!selectedConversation || selectedConversation.status === "closed") {
      throw new Error("conversation_closed");
    }
    setSending(true);
    setError(null);
    try {
      const pendingKey = `${selectedConversation.id}\u0000${body}`;
      if (pendingSendRef.current?.key !== pendingKey) {
        pendingSendRef.current = { key: pendingKey, nonce: crypto.randomUUID() };
      }
      const { error: rpcError } = await supabase.rpc(
        "send_student_mentor_message",
        {
          p_conversation_id: selectedConversation.id,
          p_body: body,
          p_client_nonce: pendingSendRef.current.nonce,
        },
      );
      if (rpcError) throw rpcError;
      await Promise.all([
        refreshConversations(false),
        refreshMessages(selectedConversation.id),
      ]);
      pendingSendRef.current = null;
    } catch (actionError) {
      setError("send_failed");
      throw actionError;
    } finally {
      setSending(false);
    }
  },
  [refreshConversations, refreshMessages, selectedConversation, supabase],
);

const closeConversation = useCallback(
  async (conversationId: string) => {
    setClosing(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc(
        "close_volunteer_conversation",
        { p_conversation_id: conversationId },
      );
      if (rpcError) throw rpcError;
      await refreshConversations(false);
      setSelectedConversationId(conversationId);
    } catch (actionError) {
      setError("close_failed");
      throw actionError;
    } finally {
      setClosing(false);
    }
  },
  [refreshConversations, supabase],
);
```

Return the exact `UseVolunteerDeskResult` fields. `reload()` must clear the stable error,
run `refreshConversations()`, then load the current selected conversation's messages:

```ts
const reload = useCallback(async () => {
  setError(null);
  await refreshConversations();
  await refreshMessages(selectedConversationId);
}, [refreshConversations, refreshMessages, selectedConversationId]);
```

- [ ] **Step 5: Run focused hook checks**

Run:

```bash
npm run check:mentor-desks
npx eslint lib/supabaseClient.ts lib/mentor/useMentorSupabaseClient.ts lib/mentor/useVolunteerDesk.ts
git diff --check
```

Expected: mentor check PASS, ESLint exits 0, and diff check prints nothing.

- [ ] **Step 6: Commit the student data layer**

```bash
git add scripts/check-mentor-desks.mjs lib/supabaseClient.ts lib/mentor/useMentorSupabaseClient.ts lib/mentor/useVolunteerDesk.ts
git commit -m "feat: add volunteer mentor student data hook"
```

## Task 4: Build the Student Volunteer Desk UI

**Files:**
- Create: `components/mentor/volunteer/VolunteerDesk.tsx`
- Create: `components/mentor/volunteer/VolunteerConversationStart.tsx`
- Create: `components/mentor/volunteer/VolunteerThread.tsx`
- Create: `components/mentor/volunteer/VolunteerMessage.tsx`
- Create: `components/mentor/volunteer/VolunteerComposer.tsx`
- Create: `components/mentor/volunteer/VolunteerConversationStatus.tsx`
- Create: `components/mentor/volunteer/VolunteerConversationHistory.tsx`
- Modify: `lib/translations.ts`
- Modify: `scripts/check-mentor-desks.mjs`

**Interfaces:**
- Consumes: `useVolunteerDesk()` and `MentorChannel`.
- Produces: `VolunteerDesk({ channel, onBackToHub })` for Task 5.

- [ ] **Step 1: Extend the guard with failing student UI assertions**

Add these reads:

```js
const volunteerDesk = read("components/mentor/volunteer/VolunteerDesk.tsx");
const volunteerMessage = read("components/mentor/volunteer/VolunteerMessage.tsx");
const translations = read("lib/translations.ts");
```

Add these assertions:

```js
[
  "VolunteerConversationStart.tsx",
  "VolunteerThread.tsx",
  "VolunteerMessage.tsx",
  "VolunteerComposer.tsx",
  "VolunteerConversationStatus.tsx",
  "VolunteerConversationHistory.tsx",
].forEach((file) => read(`components/mentor/volunteer/${file}`));

mustInclude(volunteerDesk, "useVolunteerDesk", "VolunteerDesk hook kullanmıyor");
mustInclude(volunteerDesk, "MentorTopBar", "VolunteerDesk topbar eksik");
mustInclude(volunteerMessage, "whitespace-pre-wrap", "Düz metin newline sunumu eksik");
mustNotInclude(volunteerMessage, "ReactMarkdown", "İnsan mesajında Markdown yasak");
mustNotInclude(translations, "240 bölümün", "Eski canlı program sayısı kaldı");
mustNotInclude(translations, "240 programs", "Stale live program count remains");
if (translations.split("volunteerDesk:").length - 1 < 2) {
  failures.push("volunteerDesk TR+EN çevirileri eksik");
}
```

- [ ] **Step 2: Run the guard and verify the UI task fails**

Run: `npm run check:mentor-desks`

Expected: FAIL listing the seven missing student components and missing translations.

- [ ] **Step 3: Add structurally parallel TR/EN student copy**

Merge this block under both `aiMentor` objects in `lib/translations.ts`. Preserve the
current unrelated city copy in the dirty worktree.

TR block:

```ts
volunteerDesk: {
  eyebrow: "GÖNÜLLÜ MASA · ASENKRON YAZIŞMA",
  title: "Sorunu masaya bırak.",
  intro: "Mesajın ItalyPath Gönüllü Ekibine kalıcı olarak ulaşır. Yanıt anlık olmayabilir; bu sayfaya döndüğünde görüşmen burada kalır.",
  topicLabel: "KONU",
  messageLabel: "MESAJIN",
  firstMessagePlaceholder: "Durumunu ve netleştirmek istediğin noktayı anlat…",
  messagePlaceholder: "Yanıtını yaz…",
  startCta: "GÖRÜŞMEYİ BAŞLAT",
  sendCta: "GÖNDER",
  sending: "GÖNDERİLİYOR…",
  teamName: "ItalyPath Gönüllü Ekip",
  studentName: "Sen",
  statusWaitingTeam: "EKİBİN YANITI BEKLENİYOR",
  statusWaitingStudent: "SENDEN YANIT BEKLENİYOR",
  statusClosed: "GÖRÜŞME KAPATILDI",
  statusConnecting: "BAĞLANTI KURULUYOR…",
  statusDisconnected: "BAĞLANTI KESİLDİ · YENİLE",
  closeCta: "GÖRÜŞMEYİ KAPAT",
  closeConfirm: "Bu görüşmeyi kapatmak istediğine emin misin? Geçmişi okumaya devam edebilirsin.",
  historyTitle: "GEÇMİŞ GÖRÜŞMELER",
  newConversation: "YENİ GÖRÜŞME BAŞLAT",
  backToOpen: "AÇIK GÖRÜŞMEYE DÖN",
  loading: "Görüşmen hazırlanıyor…",
  messagesLoading: "Mesajlar yükleniyor…",
  loadError: "Görüşme şu anda yüklenemedi.",
  sendError: "Mesaj gönderilemedi. Metnin korunuyor; tekrar deneyebilirsin.",
  closeError: "Görüşme kapatılamadı. Tekrar deneyebilirsin.",
  retry: "TEKRAR DENE",
  scopeNote: "Gönüllü ekip öğrenci deneyimine dayalı genel rehberlik sunar; resmî, hukuki veya kişiye özel mali değerlendirme sunmaz.",
  topics: {
    "university-program": "Üniversite ve program",
    "application-documents": "Başvuru ve belgeler",
    "scholarship-isee": "Burs ve ISEE",
    "visa-residence": "Vize ve ikamet",
    "student-life": "İtalya'da öğrenci yaşamı",
    other: "Diğer",
  },
},
```

EN block:

```ts
volunteerDesk: {
  eyebrow: "VOLUNTEER DESK · ASYNC MESSAGING",
  title: "Leave your question at the desk.",
  intro: "Your message reaches the ItalyPath Volunteer Team and stays here. Replies may not be instant; your conversation will be waiting when you return.",
  topicLabel: "TOPIC",
  messageLabel: "YOUR MESSAGE",
  firstMessagePlaceholder: "Describe your situation and what you want to clarify…",
  messagePlaceholder: "Write your reply…",
  startCta: "START CONVERSATION",
  sendCta: "SEND",
  sending: "SENDING…",
  teamName: "ItalyPath Volunteer Team",
  studentName: "You",
  statusWaitingTeam: "WAITING FOR THE TEAM",
  statusWaitingStudent: "WAITING FOR YOUR REPLY",
  statusClosed: "CONVERSATION CLOSED",
  statusConnecting: "CONNECTING…",
  statusDisconnected: "CONNECTION LOST · REFRESH",
  closeCta: "CLOSE CONVERSATION",
  closeConfirm: "Close this conversation? You will still be able to read its history.",
  historyTitle: "PAST CONVERSATIONS",
  newConversation: "START A NEW CONVERSATION",
  backToOpen: "BACK TO OPEN CONVERSATION",
  loading: "Preparing your conversation…",
  messagesLoading: "Loading messages…",
  loadError: "The conversation could not be loaded right now.",
  sendError: "The message could not be sent. Your text is preserved so you can retry.",
  closeError: "The conversation could not be closed. Please try again.",
  retry: "TRY AGAIN",
  scopeNote: "The volunteer team offers general guidance based on student experience, not official, legal, or personalized financial advice.",
  topics: {
    "university-program": "University and program",
    "application-documents": "Application and documents",
    "scholarship-isee": "Scholarships and ISEE",
    "visa-residence": "Visa and residence",
    "student-life": "Student life in Italy",
    other: "Other",
  },
},
```

In the existing `channels.ai.tagline` copy, replace the stale hard-coded `240` count:

```ts
// TR
"Canlı üniversite ve program verisine bağlı yapay zekâ. İlk eşikte hızlı oryantasyon için."

// EN
"AI connected to live university and program data. For fast orientation on the first step."
```

- [ ] **Step 4: Implement the focused leaf components**

Use these exact props; no leaf may query Supabase directly:

```ts
// VolunteerMessage.tsx
export interface VolunteerMessageProps {
  message: MentorMessageRow;
  viewer: "student" | "staff";
  studentDisplayName?: string;
}

// VolunteerComposer.tsx
export interface VolunteerComposerProps {
  sending: boolean;
  onSend: (body: string) => Promise<void>;
}

// VolunteerConversationStatus.tsx
export interface VolunteerConversationStatusProps {
  status: MentorConversationStatus;
  realtimeState: MentorRealtimeState;
  onReload: () => Promise<void>;
}

// VolunteerConversationHistory.tsx
export interface VolunteerConversationHistoryProps {
  conversations: MentorConversationRow[];
  selectedConversationId: string | null;
  onSelect: (conversationId: string) => void;
}
```

`VolunteerMessage.tsx` must render body only through:

```tsx
<p className="whitespace-pre-wrap break-words font-serif text-base leading-7 text-[var(--editorial-ink)]">
  {message.body}
</p>
```

When `viewer === "student"`, use the localized `SEN/YOU` eyebrow for student messages.
When `viewer === "staff"`, use `studentDisplayName || t.mentorOperator.studentFallback`
for student messages. In both perspectives use the sage
`ItalyPath Gönüllü Ekip/ItalyPath Volunteer Team` eyebrow for staff messages. Format
`created_at` with `Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
dateStyle: "medium", timeStyle: "short" })`.

`VolunteerComposer.tsx` owns its draft. Its submit handler must clear the draft only
after `await onSend(trimmed)` succeeds:

```ts
const handleSubmit = async (event: FormEvent) => {
  event.preventDefault();
  const trimmed = draft.trim();
  if (!trimmed || sending) return;
  try {
    await onSend(trimmed);
    setDraft("");
    setFailed(false);
  } catch {
    setFailed(true);
  }
};
```

Use a `<textarea maxLength={4000}>`, display the localized send error when `failed`, and
disable only while `sending`.

`VolunteerConversationStatus.tsx` gives disconnected state priority, otherwise maps:

```ts
const label =
  realtimeState === "disconnected"
    ? copy.statusDisconnected
    : status === "waiting_for_team"
      ? copy.statusWaitingTeam
      : status === "waiting_for_student"
        ? copy.statusWaitingStudent
        : copy.statusClosed;
```

The disconnected label is a button that calls `onReload`; other states are plain text.

`VolunteerThread.tsx` accepts `messages`, `loading`, `conversationId`,
`viewer: "student" | "staff"`, and optional `studentDisplayName`; it passes perspective
props to `VolunteerMessage` and scrolls a bottom ref into view with
`behavior: "smooth"` when the last message ID changes. Do not pair messages into
question/answer records. The student desk passes `viewer="student"`; Task 6 passes
`viewer="staff"` and the conversation display name.

`VolunteerConversationHistory.tsx` sorts already supplied rows by `last_message_at`
descending, displays localized topic, date, and `last_message_preview`, and uses a
bordered list instead of chat cards.

- [ ] **Step 5: Implement the topic + first-message form**

`VolunteerConversationStart.tsx` props are:

```ts
export interface VolunteerConversationStartProps {
  sending: boolean;
  onStart: (topic: VolunteerTopicId, body: string) => Promise<void>;
}
```

Initialize topic to `"university-program"`, render every `VOLUNTEER_TOPIC_IDS` value as
a radio-like button with `aria-pressed`, render the scope note for
`scholarship-isee`/`visa-residence`, and use a `<textarea maxLength={4000}>`. Keep the
draft on rejection and clear it only after `onStart` resolves.

- [ ] **Step 6: Implement the student desk orchestrator**

`VolunteerDesk.tsx` has this public API:

```ts
export interface VolunteerDeskProps {
  channel: MentorChannel;
  onBackToHub: () => void;
}
```

It calls `useVolunteerDesk()` once and follows this render order:

1. `MentorTopBar` with the volunteer channel and localized desk status.
2. Loading block while `loading`.
3. Editorial error block with `retry` when initial loading fails.
4. `VolunteerConversationStart` when there is no selected/open conversation.
5. For a selected conversation: `VolunteerConversationStatus`, `VolunteerThread`, close
   action, and `VolunteerComposer` only when status is not `closed`.
6. For a closed selection: show `backToOpen` when `openConversation` exists, otherwise
   `newConversation`; both call `selectConversation` with the correct ID/null.
7. `VolunteerConversationHistory` below the active content when history is non-empty.

Close uses `window.confirm(copy.closeConfirm)` and shows `closeError` without hiding the
thread if the RPC rejects. Use `max-w-3xl`, paper/surface variables, sharp borders, and
the same top/bottom spacing as `MentorChatRoom`.

- [ ] **Step 7: Run student UI checks**

Run:

```bash
npm run check:mentor-desks
npx eslint components/mentor/volunteer lib/translations.ts
npm run build
git diff --check
```

Expected: mentor check PASS, ESLint exits 0, Next build succeeds, diff check is clean.

- [ ] **Step 8: Commit the student UI**

Before staging, inspect `git diff -- lib/translations.ts` and preserve the unrelated city
copy already present in the worktree. Then run:

```bash
git add components/mentor/volunteer lib/translations.ts scripts/check-mentor-desks.mjs
git commit -m "feat: build volunteer mentor student desk"
```

## Task 5: Route the Volunteer Desk from `/ai-mentor`

**Files:**
- Modify: `lib/mentor/channels.ts`
- Modify: `app/ai-mentor/page.tsx`
- Modify: `components/mentor/MentorHub.tsx`
- Modify: `scripts/check-mentor-desks.mjs`

**Interfaces:**
- Consumes: `VolunteerDesk` from Task 4 and existing AI `MentorChatRoom` callbacks.
- Produces: active volunteer desk routing while the AI flow remains regression-compatible and expert remains locked.

- [ ] **Step 1: Add failing desk-routing assertions**

Add this read:

```js
const mentorPage = read("app/ai-mentor/page.tsx");
```

Add these assertions:

```js
mustInclude(
  channels,
  'id: "volunteer"',
  "Volunteer channel eksik",
);
mustInclude(mentorPage, "<VolunteerDesk", "Volunteer desk route edilmemiş");
mustInclude(mentorPage, 'activeChannel.experience === "volunteer-inbox"', "Experience branch eksik");
mustInclude(mentorPage, "aiMessages", "AI state ayrıştırılmamış");
mustNotInclude(mentorPage, "MessagesByChannel", "Eski kanal-bazlı AI state kaldı");
```

- [ ] **Step 2: Run the guard and verify routing fails**

Run: `npm run check:mentor-desks`

Expected: FAIL for missing `VolunteerDesk`, experience branch, and isolated AI state.

- [ ] **Step 3: Activate volunteer only after the route exists**

In `lib/mentor/channels.ts`, change only the volunteer record:

```ts
{
  id: "volunteer",
  order: 2,
  numberLabel: "02",
  monogram: "GE",
  experience: "volunteer-inbox",
  availability: "active",
},
```

Keep expert as `expert-lead + coming-soon`.

- [ ] **Step 4: Isolate AI state and render by experience**

In `app/ai-mentor/page.tsx`:

- Import `VolunteerDesk`.
- Move `const activeChannel = activeChannelId ? getMentorChannel(activeChannelId) : null`
  immediately below the state declarations, before callbacks that reference it.
- Replace `MessagesByChannel`, `ErrorByChannel`, `EMPTY_MESSAGES`, and `EMPTY_ERRORS` with:

```ts
const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
const [aiHasError, setAiHasError] = useState(false);
```

- Update reset to clear those two states only when the active experience is `ai-chat`.
- Build the AI request history from `aiMessages`.
- Replace every message/error state update with `setAiMessages`/`setAiHasError`.
- Keep abort, streaming, TextDecoder, stop, reset, and API error behavior unchanged.

Use this exact rendering split inside the active-channel branch:

```tsx
{activeChannel.experience === "volunteer-inbox" ? (
  <VolunteerDesk channel={activeChannel} onBackToHub={handleBackToHub} />
) : (
  <MentorChatRoom
    channel={activeChannel}
    messages={activeChannel.experience === "ai-chat" ? aiMessages : []}
    isStreaming={activeChannel.experience === "ai-chat" && isStreaming}
    hasError={activeChannel.experience === "ai-chat" && aiHasError}
    onSend={handleSend}
    onStop={handleStop}
    onReset={handleReset}
    onBackToHub={handleBackToHub}
  />
)}
```

Guard `handleSend` with:

```ts
if (activeChannel?.experience !== "ai-chat") return;
```

The expert route therefore still reaches `MentorChatRoom` in locked mode and renders
`LockedDeskNotice`; it never reaches volunteer or AI sends.

- [ ] **Step 5: Run integration regression checks**

Run:

```bash
npm run check:mentor-desks
npx eslint app/ai-mentor/page.tsx lib/mentor/channels.ts components/mentor/MentorHub.tsx
npm run build
git diff --check
```

Expected: mentor check PASS, lint/build succeed, diff check is clean.

- [ ] **Step 6: Commit the student route integration**

```bash
git add app/ai-mentor/page.tsx lib/mentor/channels.ts components/mentor/MentorHub.tsx scripts/check-mentor-desks.mjs
git commit -m "feat: open volunteer mentor desk"
```

## Task 6: Build the Single-Operator Inbox

**Files:**
- Create: `lib/mentor/useMentorOperatorInbox.ts`
- Create: `components/mentor/operator/MentorOperatorGate.tsx`
- Create: `components/mentor/operator/MentorOperatorInbox.tsx`
- Create: `components/mentor/operator/OperatorConversationList.tsx`
- Create: `components/mentor/operator/OperatorConversationThread.tsx`
- Create: `components/mentor/operator/OperatorReplyComposer.tsx`
- Create: `app/ekip/mentor/page.tsx`
- Modify: `lib/translations.ts`
- Modify: `scripts/check-mentor-desks.mjs`

**Interfaces:**
- Consumes: shared native-token client, mentor rows, `mergeMentorMessages()`, and staff RPCs.
- Produces: a staff-gated `/ekip/mentor` inbox with status filters, live queue/thread updates, replies, and closing.

- [ ] **Step 1: Add failing operator assertions**

Add these reads:

```js
const operatorPage = read("app/ekip/mentor/page.tsx");
const operatorHook = read("lib/mentor/useMentorOperatorInbox.ts");
const operatorInbox = read("components/mentor/operator/MentorOperatorInbox.tsx");
```

Add these assertions:

```js
[
  "MentorOperatorGate.tsx",
  "MentorOperatorInbox.tsx",
  "OperatorConversationList.tsx",
  "OperatorConversationThread.tsx",
  "OperatorReplyComposer.tsx",
].forEach((file) => read(`components/mentor/operator/${file}`));

mustInclude(operatorPage, "MentorOperatorInbox", "Operator route inbox render etmiyor");
mustInclude(operatorHook, 'rpc("is_active_mentor_staff"', "Staff gate RPC eksik");
mustInclude(operatorHook, 'rpc("send_staff_mentor_message"', "Staff reply RPC eksik");
mustInclude(operatorHook, 'rpc("close_volunteer_conversation"', "Staff close RPC eksik");
mustInclude(operatorHook, "realtime.setAuth()", "Operator Realtime auth eksik");
mustInclude(operatorInbox, "OperatorConversationList", "Operator liste eksik");
mustInclude(operatorInbox, "OperatorConversationThread", "Operator thread eksik");
mustNotInclude(operatorHook, "SUPABASE_SERVICE_ROLE_KEY", "Operator hook service role içeriyor");
if (translations.split("mentorOperator:").length - 1 < 2) {
  failures.push("mentorOperator TR+EN çevirileri eksik");
}
```

- [ ] **Step 2: Run the guard and verify operator files fail**

Run: `npm run check:mentor-desks`

Expected: FAIL listing the operator route, hook, five components, and translations.

- [ ] **Step 3: Add structurally parallel operator copy**

Add `mentorOperator` as a sibling of `aiMentor` in both language roots.

TR block:

```ts
mentorOperator: {
  eyebrow: "ITALYPATH · GÖNÜLLÜ OPERASYONU",
  title: "Gönüllü gelen kutusu",
  backHome: "Ana sayfaya dön",
  filters: {
    waiting_for_team: "YANIT BEKLİYOR",
    waiting_for_student: "ÖĞRENCİDEN BEKLENİYOR",
    closed: "KAPALI",
  },
  unauthorizedTitle: "Bu alan ekip erişimi gerektiriyor.",
  unauthorizedBody: "Giriş yaptığın hesap aktif mentor operatörü olarak yetkilendirilmemiş.",
  loading: "Gelen kutusu hazırlanıyor…",
  loadError: "Gelen kutusu şu anda yüklenemedi.",
  retry: "TEKRAR DENE",
  empty: "Bu durumda görüşme yok.",
  studentFallback: "Öğrenci",
  replyPlaceholder: "ItalyPath Gönüllü Ekip adına yanıt yaz…",
  send: "YANITI GÖNDER",
  sending: "GÖNDERİLİYOR…",
  sendError: "Yanıt gönderilemedi. Metin korunuyor.",
  close: "GÖRÜŞMEYİ KAPAT",
  closeConfirm: "Bu görüşmeyi kapatmak istediğine emin misin?",
  closeError: "Görüşme kapatılamadı.",
  selectConversation: "Okumak için bir görüşme seç.",
  connectionLost: "CANLI BAĞLANTI KESİLDİ · YENİLE",
  teamIdentity: "ItalyPath Gönüllü Ekip",
},
```

EN block:

```ts
mentorOperator: {
  eyebrow: "ITALYPATH · VOLUNTEER OPERATIONS",
  title: "Volunteer inbox",
  backHome: "Back to home",
  filters: {
    waiting_for_team: "WAITING FOR REPLY",
    waiting_for_student: "WAITING FOR STUDENT",
    closed: "CLOSED",
  },
  unauthorizedTitle: "This area requires team access.",
  unauthorizedBody: "The signed-in account is not authorized as an active mentor operator.",
  loading: "Preparing the inbox…",
  loadError: "The inbox could not be loaded right now.",
  retry: "TRY AGAIN",
  empty: "There are no conversations in this state.",
  studentFallback: "Student",
  replyPlaceholder: "Reply as ItalyPath Volunteer Team…",
  send: "SEND REPLY",
  sending: "SENDING…",
  sendError: "The reply could not be sent. Your text is preserved.",
  close: "CLOSE CONVERSATION",
  closeConfirm: "Are you sure you want to close this conversation?",
  closeError: "The conversation could not be closed.",
  selectConversation: "Select a conversation to read it.",
  connectionLost: "LIVE CONNECTION LOST · REFRESH",
  teamIdentity: "ItalyPath Volunteer Team",
},
```

- [ ] **Step 4: Create the operator data hook**

Create `lib/mentor/useMentorOperatorInbox.ts` with this public contract:

```ts
export interface UseMentorOperatorInboxResult {
  authorized: boolean | null;
  conversations: MentorConversationRow[];
  selectedConversation: MentorConversationRow | null;
  messages: MentorMessageRow[];
  filter: MentorConversationStatus;
  loading: boolean;
  messagesLoading: boolean;
  sending: boolean;
  closing: boolean;
  error: string | null;
  realtimeState: MentorRealtimeState;
  setFilter: (filter: MentorConversationStatus) => void;
  selectConversation: (conversationId: string | null) => void;
  sendReply: (body: string) => Promise<void>;
  closeConversation: () => Promise<void>;
  reload: () => Promise<void>;
}
```

Use `useMentorSupabaseClient()`. Staff authorization runs before any conversation query:

```ts
const [filter, setFilter] =
  useState<MentorConversationStatus>("waiting_for_team");
const pendingReplyRef =
  useRef<{ key: string; nonce: string } | null>(null);
```

```ts
const checkAccess = useCallback(async () => {
  const { data, error: accessError } = await supabase.rpc("is_active_mentor_staff");
  if (accessError) {
    setAuthorized(false);
    setError("access_check_failed");
    throw accessError;
  }
  const allowed = data === true;
  setAuthorized(allowed);
  if (!allowed) {
    setConversations([]);
    setSelectedConversationId(null);
  }
  return allowed;
}, [supabase]);
```

Queue loading must filter and order exactly:

```ts
const { data, error: queryError } = await supabase
  .from("mentor_conversations")
  .select("*")
  .eq("status", filter)
  .order("last_message_at", { ascending: false });
```

When rows load, preserve the current selection only if it is still in the filtered list;
otherwise select `rows[0]?.id ?? null`. Message loading uses the same ordered query as
the student hook.

After access succeeds, subscribe to all `mentor_conversations` INSERT/UPDATE events and
call `refreshConversations(false)`. Subscribe to selected conversation message INSERTs
with `filter: conversation_id=eq.<selected ID>` and merge by ID. Call
`await supabase.realtime.setAuth()` before both subscriptions; clean both channels on
selection/session/unmount changes.

Implement reply and close with these RPC payloads:

```ts
const pendingKey = `${selectedConversation.id}\u0000${body}`;
if (pendingReplyRef.current?.key !== pendingKey) {
  pendingReplyRef.current = { key: pendingKey, nonce: crypto.randomUUID() };
}

await supabase.rpc("send_staff_mentor_message", {
  p_conversation_id: selectedConversation.id,
  p_body: body,
  p_client_nonce: pendingReplyRef.current.nonce,
});

await supabase.rpc("close_volunteer_conversation", {
  p_conversation_id: selectedConversation.id,
});
```

Declare `pendingReplyRef` with
`useRef<{ key: string; nonce: string } | null>(null)`. On successful reply, reload the
queue/thread and then clear the ref. On failure set stable `send_failed`, throw the
original error, and preserve both draft and nonce. Close failures use `close_failed`.

- [ ] **Step 5: Create the operator presentational components**

`MentorOperatorGate.tsx` props:

```ts
export interface MentorOperatorGateProps {
  authorized: boolean | null;
  loading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
  children: ReactNode;
}
```

It renders loading, access-denied, or load-error states without rendering `children`
until `authorized === true`. The access-denied state must not disclose conversation
counts, student names, or staff IDs.

`OperatorConversationList.tsx` props:

```ts
export interface OperatorConversationListProps {
  conversations: MentorConversationRow[];
  selectedConversationId: string | null;
  filter: MentorConversationStatus;
  onFilterChange: (filter: MentorConversationStatus) => void;
  onSelect: (conversationId: string) => void;
}
```

Render three sharp-border filter buttons from `MENTOR_CONVERSATION_STATUSES`. Each row
shows `student_display_name || copy.studentFallback`, localized topic from
`t.aiMentor.volunteerDesk.topics`, `last_message_preview`, and localized
`last_message_at`. Do not add assignment or unread badges.

`OperatorReplyComposer.tsx` uses the same draft-clearing-on-success behavior as the
student composer and a `<textarea maxLength={4000}>`.

`OperatorConversationThread.tsx` props:

```ts
export interface OperatorConversationThreadProps {
  conversation: MentorConversationRow | null;
  messages: MentorMessageRow[];
  messagesLoading: boolean;
  sending: boolean;
  closing: boolean;
  onSend: (body: string) => Promise<void>;
  onClose: () => Promise<void>;
}
```

Reuse `VolunteerThread` with `viewer="staff"` and
`studentDisplayName={conversation.student_display_name}` for plain-text rendering. Show
the reply composer and close button only for open conversations. Confirm close with
localized operator copy.

- [ ] **Step 6: Create the inbox orchestration and route**

Create `components/mentor/operator/MentorOperatorInbox.tsx`. It calls the operator hook
once, wraps all data UI in `MentorOperatorGate`, and uses:

```ts
const { t } = useLanguage();
const copy = t.mentorOperator;
const {
  authorized,
  conversations,
  selectedConversation,
  messages,
  filter,
  loading,
  messagesLoading,
  sending,
  closing,
  error,
  realtimeState,
  setFilter,
  selectConversation,
  sendReply,
  closeConversation,
  reload,
} = useMentorOperatorInbox();
```

Pass `authorized`, `loading`, `error`, and `reload` to `MentorOperatorGate`. Render the
following inside the gate; when `realtimeState === "disconnected"`, add the localized
connection-lost retry button above the grid:

```tsx
<main className="min-h-[100dvh] bg-[var(--editorial-paper)]">
  <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <header className="border-b border-[var(--editorial-border)] pb-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
        {copy.eyebrow}
      </p>
      <h1 className="mt-3 font-serif text-4xl text-[var(--editorial-ink)]">
        {copy.title}
      </h1>
    </header>
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.7fr)]">
      <OperatorConversationList
        conversations={conversations}
        selectedConversationId={selectedConversation?.id ?? null}
        filter={filter}
        onFilterChange={setFilter}
        onSelect={selectConversation}
      />
      <OperatorConversationThread
        conversation={selectedConversation}
        messages={messages}
        messagesLoading={messagesLoading}
        sending={sending}
        closing={closing}
        onSend={sendReply}
        onClose={closeConversation}
      />
    </div>
  </div>
</main>
```

On mobile the list appears first; selecting a row scrolls the thread container into
view. Do not add the operator route to Navbar or BottomNav.

Create `app/ekip/mentor/page.tsx`:

```tsx
"use client";

import MentorOperatorInbox from "@/components/mentor/operator/MentorOperatorInbox";

export default function MentorOperatorPage() {
  return <MentorOperatorInbox />;
}
```

- [ ] **Step 7: Run operator checks**

Run:

```bash
npm run check:mentor-desks
npx eslint app/ekip/mentor/page.tsx lib/mentor/useMentorOperatorInbox.ts components/mentor/operator
npm run build
git diff --check
```

Expected: mentor check PASS, lint/build succeed, diff check is clean.

- [ ] **Step 8: Commit the operator inbox**

If unrelated translation hunks are still present, stage only mentor hunks from
`lib/translations.ts`; do not absorb city changes into this commit.

```bash
git add app/ekip/mentor/page.tsx lib/mentor/useMentorOperatorInbox.ts components/mentor/operator scripts/check-mentor-desks.mjs
git add -p lib/translations.ts
git commit -m "feat: add volunteer mentor operator inbox"
```

## Task 7: Protect the Operator Route and Disclose Human Messaging

**Files:**
- Modify: `proxy.ts`
- Modify: `app/robots.ts`
- Modify: `scripts/check-route-access.mjs`
- Modify: `lib/legal/documents.ts`
- Modify: `scripts/check-mentor-desks.mjs`

**Interfaces:**
- Consumes: `/ekip/mentor` and the approved retention model.
- Produces: correct signed-out redirect behavior, robot exclusion, route regression checks, and truthful legal copy.

- [ ] **Step 1: Add failing route/legal assertions**

Add these reads to `scripts/check-mentor-desks.mjs`:

```js
const proxySource = read("proxy.ts");
const robotsSource = read("app/robots.ts");
const legalSource = read("lib/legal/documents.ts");
```

Add these assertions:

```js
mustInclude(proxySource, '"/ekip"', "/ekip protected redirect listesinde değil");
mustInclude(robotsSource, "'/ekip'", "/ekip robots disallow eksik");
mustInclude(legalSource, "Gönüllü mentor görüşmeleri", "Gizlilik gönüllü mesajlarını açıklamıyor");
mustInclude(legalSource, "insan gönüllü", "Kullanım koşullarında insan mentor sınırı eksik");
mustInclude(
  legalSource,
  "Gönüllü mentor görüşmeleri, görüşme kapandıktan sonra da hesabınız aktif olduğu sürece",
  "Mentor saklama süresi eksik",
);
```

- [ ] **Step 2: Run checks and verify route/legal coverage fails**

Run:

```bash
npm run check:mentor-desks
npm run check:routes
```

Expected: mentor check fails for `/ekip` and legal copy; route check does not yet list
`/ekip/mentor` in its protected matrix.

- [ ] **Step 3: Add `/ekip` to protected redirect and robots policies**

In `proxy.ts`, add this exact entry to `PROTECTED_PAGE_ROUTES`:

```ts
"/ekip",
```

In `app/robots.ts`, add `'/ekip'` to the existing `disallow` array.

In `scripts/check-route-access.mjs`, add:

```js
"/ekip/mentor",
```

to `protectedChecks`.

- [ ] **Step 4: Update privacy and terms with exact product behavior**

Set:

```ts
export const LEGAL_LAST_UPDATED = "20 Temmuz 2026";
```

In privacy section 2, add this list item after the AI mentor item:

```ts
"Gönüllü mentor görüşmeleri: Gönüllü masaya yazdığınız mesajlar, görüşme konusu, görüşme durumu ve ItalyPath Gönüllü Ekibinin yanıtları.",
```

In privacy section 3, add:

```ts
"Site içindeki insan gönüllü görüşmesini yürütmek ve görüşme geçmişini hesabınıza sunmak,",
```

In privacy section 4, change the cloud storage item to:

```ts
"Bulut veri saklama hizmeti: favorileriniz, yüklediğiniz belgeler ve gönüllü mentor görüşmeleriniz için,",
```

Append this paragraph to privacy section 5:

```ts
"Gönüllü mentor görüşmeleri, görüşme kapandıktan sonra da hesabınız aktif olduğu sürece geçmişinizde tutulur. Hesap veya veri silme talebiniz uygulandığında bu görüşmeler ve bağlı mesajlar da kaldırılır.",
```

Change terms section 1 service description to include:

```ts
"ItalyPath, İtalya’da eğitim almak isteyen öğrencilere yönelik bir bilgilendirme ve rehberlik platformudur. Üniversite ve program bilgileri, şehir rehberleri, burs bilgileri, hesaplama araçları, yapay zeka destekli bir mentor ve site içi insan gönüllü yazışması sunar.",
```

Rename section 3 to `"3. Mentor Masaları Hakkında"` and use these three paragraphs:

```ts
[
  "Yapay zeka mentor, otomatik olarak yanıt üreten bir yardımcıdır. Verdiği yanıtlar hatalı, eksik veya güncel olmayan bilgiler içerebilir.",
  "Gönüllü mentor masası, öğrenci deneyimine dayalı genel rehberlik sunan site içi bir insan yazışmasıdır. Yanıtların anlık, eksiksiz veya resmî olduğu garanti edilmez.",
  "Yapay zeka ve insan gönüllü mentor profesyonel danışmanlık, hukuki görüş, kişiye özel mali değerlendirme veya resmî başvuru rehberliği yerine geçmez. Önemli bilgileri her zaman resmî kaynaklardan doğrulayın.",
]
```

- [ ] **Step 5: Run route and legal checks**

Run:

```bash
npm run check:mentor-desks
npm run check:routes
npx eslint proxy.ts app/robots.ts lib/legal/documents.ts
git diff --check
```

Expected: both checks PASS, ESLint exits 0, diff check is clean.

- [ ] **Step 6: Commit route and legal behavior**

```bash
git add proxy.ts app/robots.ts scripts/check-route-access.mjs lib/legal/documents.ts scripts/check-mentor-desks.mjs
git commit -m "feat: protect and disclose volunteer mentor messaging"
```

## Task 8: Harden the Permanent Guard and Project Context

**Files:**
- Modify: `scripts/check-mentor-desks.mjs`
- Modify: `AGENT_CONTEXT.md`
- Modify: `AGENT_COMMITS.md`

**Interfaces:**
- Consumes: the complete implementation from Tasks 1–7.
- Produces: final regression coverage and accurate onboarding/change-history documentation.

- [ ] **Step 1: Add the final failing coverage assertions**

Add these reads:

```js
const packageSource = read("package.json");
const mentorRoom = read("components/mentor/MentorChatRoom.tsx");
const agentContext = read("AGENT_CONTEXT.md");
```

Add these final assertions:

```js
mustInclude(packageSource, '"check:mentor-desks"', "Package mentor check script eksik");
mustInclude(channels, 'experience: "volunteer-inbox"', "Volunteer experience kaydı eksik");
mustInclude(channels, 'availability: "active"', "Aktif masa kaydı eksik");
mustInclude(channels, 'experience: "expert-lead"', "Expert experience kaydı eksik");
mustInclude(mentorRoom, "LockedDeskNotice", "Expert locked branch kaldırılmış");
mustNotInclude(sql, "sender_user_id", "Student-readable message row staff ID taşıyor");
mustNotInclude(volunteerMessage, "dangerouslySetInnerHTML", "İnsan mesajında raw HTML yasak");
mustNotInclude(operatorHook, 'template: "supabase"', "Operator deprecated JWT template kullanıyor");
mustInclude(agentContext, "mentor_conversations", "Agent context mentor tablolarını açıklamıyor");
mustInclude(agentContext, "check:mentor-desks", "Agent context mentor doğrulamasını açıklamıyor");
```

Also add a structural availability check so one active record cannot accidentally satisfy
both AI and volunteer expectations:

```js
const volunteerRecord = channels.match(/\{\s*id: "volunteer"[\s\S]*?\n\s*\}/)?.[0] ?? "";
const expertRecord = channels.match(/\{\s*id: "expert"[\s\S]*?\n\s*\}/)?.[0] ?? "";
mustInclude(volunteerRecord, 'availability: "active"', "Volunteer masa aktif değil");
mustInclude(expertRecord, 'availability: "coming-soon"', "Expert masa erken açılmış");
```

- [ ] **Step 2: Run the guard and verify documentation fails**

Run: `npm run check:mentor-desks`

Expected: FAIL because `AGENT_CONTEXT.md` does not yet describe the three mentor tables
or the new check command.

- [ ] **Step 3: Update agent context and commit ledger**

Update the AI Mentor section in `AGENT_CONTEXT.md` to state:

- AI is an active Gemini streaming desk.
- Volunteer is an active, persistent Supabase human conversation desk.
- Expert remains coming-soon until its separate lead-form project.
- `/ekip/mentor` is the single-operator, staff-allowlisted inbox.
- Tables: `mentor_staff`, `mentor_conversations`, `mentor_messages`.
- Writes use four RPCs; reads/live events use Clerk-native RLS + Realtime.
- V1 has one operator, plain text, one open conversation per student, no attachments or
  automatic notifications.
- Validation: `npm run check:mentor-desks` plus two-account manual RLS matrix.

Add the three mentor tables to the Supabase surfaces list, add
`supabase/volunteer_mentor.sql` to SQL/runbook files, add `/ekip/mentor` to protected
examples, and add `npm run check:mentor-desks` to the command list.

Append one concise entry to `AGENT_COMMITS.md` listing the volunteer data model, student
desk, operator inbox, RLS/Realtime, legal disclosure, and verification command. Do not
rewrite older entries.

- [ ] **Step 4: Run the complete automated regression suite**

Run in this order:

```bash
npm run check:mentor-desks
npm run check:routes
npm run check:auth-ui
npm run check:hub-onboarding
npm run check:university-data-source
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0. `check:hub-onboarding` may print a network warning if
the live university API is unavailable, but it must not print `HATA` or exit non-zero.

- [ ] **Step 5: Audit scope and secret boundaries**

Run:

```bash
rg -n "SUPABASE_SERVICE_ROLE_KEY|getToken\(\{\s*template|ReactMarkdown|dangerouslySetInnerHTML" lib/mentor components/mentor/volunteer components/mentor/operator app/ekip
rg -n "assignment|assignee|typing|presence|attachment|upload" lib/mentor components/mentor/volunteer components/mentor/operator app/ekip
```

Expected: the first command returns no matches. The second command returns no
implementation of out-of-scope features; copy inside the approved design/plan is not in
the searched paths.

- [ ] **Step 6: Commit final guards and context**

```bash
git add scripts/check-mentor-desks.mjs AGENT_CONTEXT.md AGENT_COMMITS.md
git commit -m "docs: record volunteer mentor operations"
```

## Task 9: Production Enablement and Two-Account Acceptance

**Files:**
- No repository files unless a verification failure requires a scoped fix.

**Interfaces:**
- Consumes: the complete code, `supabase/volunteer_mentor.sql`, and runbook from prior tasks.
- Produces: a live, staff-provisioned volunteer desk verified with one normal student and Kerem's operator account.

- [ ] **Step 1: Verify native Clerk third-party auth before applying schema**

In Clerk Dashboard, open the Supabase integration setup and confirm it is active for the
production Clerk instance. In Supabase Dashboard → Authentication → Third-Party Auth,
confirm the same Clerk issuer/domain is configured.

Expected: a normal signed-in Clerk session token contains `sub` with the Clerk user ID
and `role` with `authenticated`. Stop deployment if this is false; do not weaken RLS.

- [ ] **Step 2: Apply the SQL and verify database metadata**

Run the complete contents of `supabase/volunteer_mentor.sql` in Supabase SQL Editor,
then run the three verification queries from `SUPABASE_SECURITY_RUNBOOK.md`.

Expected:

- all three tables report `rowsecurity=true`;
- conversation and message select policies exist for `authenticated`;
- both conversation and message tables appear in `supabase_realtime`.

- [ ] **Step 3: Provision the only operator without committing identity data**

Copy Kerem's exact production Clerk user ID from Clerk Dashboard. In Supabase Table
Editor insert one `mentor_staff` row:

- `user_id`: the copied Clerk ID;
- `display_name`: `Kerem`;
- `active`: `true`.

Expected: `/ekip/mentor` authorizes that account and rejects a different authenticated
account. Do not paste the Clerk ID into source code, the plan, commit messages, or logs.

- [ ] **Step 4: Run the two-account acceptance matrix**

Use two separate browser profiles so sessions do not overwrite each other:

1. Student opens `/ai-mentor`, selects Gönüllü Ekip, chooses a topic, and sends a first
   message. Expected: one open conversation and `waiting_for_team`.
2. Operator opens `/ekip/mentor`. Expected: the row appears without refresh.
3. A second normal user attempts `/ekip/mentor` and direct conversation reads. Expected:
   access denial and no student data.
4. Operator replies. Expected: student sees the reply live under `ItalyPath Gönüllü
   Ekip`; status becomes `waiting_for_student`.
5. Student replies. Expected: operator sees it live; status becomes `waiting_for_team`.
6. Student double-submits/retries one message. Expected: one persisted row per nonce and
   no duplicate render.
7. Close from student, then from a second test conversation close from operator.
   Expected: both become read-only history and reject later send RPCs.
8. Student opens a new conversation after closing. Expected: exactly one new open row.
9. Temporarily set the staff row `active=false`. Expected: operator access and staff RPC
   fail; set it back to `true` after the check.
10. Disable network in browser devtools, send nothing, restore network, and press retry.
    Expected: existing history remains and normal fetch re-synchronizes.
11. Open AI desk and send a prompt. Expected: Gemini streaming, stop, reset, and error
    handling still work.

- [ ] **Step 5: Record rollout evidence without secrets**

Record only pass/fail, UTC timestamp, production deployment identifier, and the two test
account roles in the implementation handoff. Do not record Clerk IDs, JWTs, message
contents, or service-role credentials.

Expected: all acceptance items pass before calling the volunteer desk live.

---

## Execution Notes

- Tasks 1–8 are repository work and each ends in a reviewable commit.
- Task 9 mutates production Supabase/Clerk state and must be performed only with the
  project owner's dashboard access and explicit deployment timing.
- If Realtime is unavailable during local development, complete persistence/RLS first;
  do not replace Realtime with an unplanned polling/API architecture.
- If current dirty `lib/translations.ts` hunks overlap mentor copy, preserve the existing
  city changes and stage only the mentor hunks for mentor commits.
- Do not start the expert lead-form design or implementation from this plan.
