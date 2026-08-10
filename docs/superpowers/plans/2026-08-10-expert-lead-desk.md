# ItalyPath Expert Lead Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the ItalyPath Expert desk to guests and signed-in users, persist free WhatsApp pre-consultation leads safely in Supabase, and let the single existing staff operator manage them from `/ekip/uzman`.

**Architecture:** Keep expert leads isolated from volunteer conversations. A public, server-validated `POST /api/expert-leads` inserts into an RLS-protected `expert_leads` table through a server-only service-role client; the protected operator panel reads and mutates the same table through Clerk's native Supabase token and `is_active_mentor_staff()` RLS. `/ai-mentor` becomes public, while the volunteer experience performs its own sign-in redirect and the paused AI behavior remains unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, Clerk 6, Supabase JS 2, PostgreSQL RLS, Node assertion scripts, existing Framer Motion/Lucide UI stack.

## Global Constraints

- Read `AGENT_CONTEXT.md`, `docs/superpowers/specs/2026-08-10-expert-lead-desk-design.md`, and this plan before editing.
- Treat the worktree as dirty. Do not revert, overwrite, stage, or commit unrelated user changes.
- Do not create `middleware.ts`; route security remains in `proxy.ts`.
- Do not import `app/data.ts` from runtime code.
- Do not add Redux, Zustand, Jotai, a form library, a CAPTCHA provider, a notification provider, or any new dependency.
- Tailwind v4 theme changes belong in `app/globals.css`; this feature should need no new global token.
- Keep all new TR and EN UI copy parallel in `lib/translations.ts`; do not hard-code user-visible form or panel copy in components.
- The public form has exactly six required visible fields: full name, WhatsApp phone, study level, field of interest, target intake, and help request.
- Do not prefill form fields from Clerk. Do not add email, marketing consent, or a required checkbox.
- The first consultation is free. Later professional support may be offered separately as a paid service; form submission is not a purchase.
- Do not deduplicate by phone, user, or time. Only retry/double-click idempotency by `submission_id` is allowed.
- Do not store IP addresses. Do not add automatic deletion, notifications, polling, Realtime, or WhatsApp Business API integration.
- Keep `/ai-mentor` disallowed in `app/robots.ts` and out of the sitemap even though the route becomes public.
- Keep `/ekip/mentor` and `/ekip/uzman` separate; do not create a shared `/ekip` dashboard or refactor the volunteer Realtime state machine.
- Use the existing single active `mentor_staff` row and `public.is_active_mentor_staff()` for operator access.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to a client component or `NEXT_PUBLIC_*` variable.
- Render lead text as plain text. Do not use ReactMarkdown or `dangerouslySetInnerHTML`.
- Commit only the files owned by each task using the exact task commit; verify staged paths before every commit.

---

## File Map

### Create

- `lib/mentor/expertLeads.ts` — domain constants, types, intake options, WhatsApp normalization/link helpers.
- `lib/mentor/expertLeadValidation.ts` — shared pure client/server payload validation.
- `lib/mentor/expertLeadInboxState.ts` — pure filtering, selection, row replacement/removal, and identity fencing helpers.
- `lib/mentor/expertLeads.server.ts` — server-only service-role insert boundary and idempotent conflict classification.
- `lib/mentor/useExpertLeadInbox.ts` — Clerk identity, staff authorization, protected reads and mutations.
- `components/mentor/expert/ExpertLeadDesk.tsx` — expert desk shell and form/success orchestration.
- `components/mentor/expert/ExpertLeadForm.tsx` — controlled six-field public form.
- `components/mentor/expert/ExpertLeadSuccess.tsx` — successful submission state.
- `components/mentor/expert/operator/ExpertLeadGate.tsx` — loading, authorization, and fail-closed access states.
- `components/mentor/expert/operator/ExpertLeadInbox.tsx` — operator page orchestration.
- `components/mentor/expert/operator/ExpertLeadList.tsx` — count, filters, refresh, and selectable list.
- `components/mentor/expert/operator/ExpertLeadDetail.tsx` — WhatsApp, status, note, and delete controls.
- `app/api/expert-leads/route.ts` — public POST-only transport.
- `app/ekip/uzman/page.tsx` — protected operator route.
- `supabase/expert_leads.sql` — table, constraints, indexes, trigger, grants, and RLS.
- `scripts/check-expert-leads.mjs` — permanent source/contract guard.
- `scripts/test-expert-leads.mjs` — executable pure domain/state tests.

### Modify

- `types/index.ts` — add `ExpertLeadRow`.
- `scripts/test-mentor-db.mjs` — load and exercise expert lead SQL in temporary PostgreSQL.
- `package.json` — add `check:expert-leads` and `test:expert-leads`.
- `lib/translations.ts` — parallel expert form and operator copy.
- `lib/mentor/channels.ts` — set expert availability active.
- `components/mentor/MentorHub.tsx` — expert-specific active badge and CTA.
- `app/ai-mentor/page.tsx` — public desk routing, guest volunteer gate, expert branch.
- `proxy.ts` — make hub and submission POST route public; keep `/ekip` protected.
- `scripts/check-route-access.mjs` — reverse the old protected `/ai-mentor` expectation.
- `scripts/check-mentor-desks.mjs` — replace the old expert-coming-soon guard with active lead guards.
- `components/mentor/operator/MentorOperatorInbox.tsx` — add a cross-link to expert leads.
- `lib/legal/documents.ts` — disclose expert lead collection, purpose, staff access, manual deletion, and free/paid boundary.
- `SUPABASE_SECURITY_RUNBOOK.md` — add SQL order, RLS verification, staff check, and test-lead cleanup.
- `AGENT_CONTEXT.md` — update route matrix, mentor architecture, Supabase surfaces, checks, and known debt.

---

### Task 1: Expert Lead Domain and Validation

**Files:**
- Create: `lib/mentor/expertLeads.ts`
- Create: `lib/mentor/expertLeadValidation.ts`
- Create: `scripts/test-expert-leads.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `EXPERT_LEAD_STATUSES`, `EXPERT_STUDY_LEVELS`, `EXPERT_FIELDS`, `ExpertLeadStatus`, `ExpertStudyLevel`, `ExpertField`, `ExpertLeadDraft`, `ExpertLeadSubmission`, `buildTargetIntakeOptions(now)`, `normalizeWhatsAppPhone(value)`, `buildWhatsAppHref(value)`, and `validateExpertLeadPayload(input, now)`.
- Consumes: only JavaScript/TypeScript standard APIs; no React, Clerk, or Supabase.

- [ ] **Step 1: Register the pure test command before the implementation exists**

Add this exact script to `package.json`:

```json
"test:expert-leads": "node scripts/test-expert-leads.mjs"
```

Create `scripts/test-expert-leads.mjs` with the same TypeScript transpilation technique used by `scripts/test-mentor-operator-inbox.mjs`: read both source files, transpile with `typescript.transpileModule`, rewrite the validation import to `./expertLeads.mjs`, write both modules into a `mkdtemp` directory, import them, and remove the directory in `finally`.

The first assertions must import these exact names:

```js
const {
  EXPERT_FIELDS,
  EXPERT_LEAD_STATUSES,
  EXPERT_STUDY_LEVELS,
  buildTargetIntakeOptions,
  buildWhatsAppHref,
  normalizeWhatsAppPhone,
  validateExpertLeadPayload,
} = await importHelpers();

assert.deepEqual(EXPERT_LEAD_STATUSES, ["new", "contacted", "completed"]);
assert.deepEqual(EXPERT_STUDY_LEVELS, ["bachelor", "master", "undecided"]);
assert.equal(EXPERT_FIELDS.at(-1), "undecided");
assert.deepEqual(buildTargetIntakeOptions(new Date("2026-08-10T12:00:00Z")), [
  "2026-2027",
  "2027-2028",
  "2028-2029",
  "undecided",
]);
assert.equal(normalizeWhatsAppPhone("+90 (532) 123-45-67"), "+905321234567");
assert.equal(normalizeWhatsAppPhone("0532 123 45 67"), null);
assert.equal(buildWhatsAppHref("+905321234567"), "https://wa.me/905321234567");
```

Add a valid payload and assert the tagged result:

```js
const validPayload = {
  submissionId: "10000000-0000-4000-8000-000000000001",
  fullName: "  Ada Öğrenci  ",
  whatsappPhone: "+90 532 123 45 67",
  studyLevel: "bachelor",
  fieldOfInterest: "engineering-tech",
  targetIntake: "2027-2028",
  helpRequest: "  Politecnico başvuru yol haritamı netleştirmek istiyorum.  ",
  website: "",
};

const valid = validateExpertLeadPayload(
  validPayload,
  new Date("2026-08-10T12:00:00Z"),
);
assert.equal(valid.kind, "valid");
assert.equal(valid.value.fullName, "Ada Öğrenci");
assert.equal(valid.value.whatsappPhone, "+905321234567");
assert.equal(valid.value.helpRequest, "Politecnico başvuru yol haritamı netleştirmek istiyorum.");

assert.equal(
  validateExpertLeadPayload(
    { ...validPayload, website: "https://spam.example" },
    new Date("2026-08-10T12:00:00Z"),
  ).kind,
  "honeypot",
);
```

Add invalid cases for: malformed UUID, one-character name, local phone without `+`, unknown study level, unknown field, non-consecutive intake, intake start outside 2025–2030 for the fixed 2026 clock, nine-character help request, and 3001-character help request. Assert `kind === "invalid"` and the exact camelCase field key exists in `errors`.

- [ ] **Step 2: Run the new test and confirm the red state**

Run:

```bash
npm run test:expert-leads
```

Expected: FAIL because `lib/mentor/expertLeads.ts` and `lib/mentor/expertLeadValidation.ts` do not exist.

- [ ] **Step 3: Implement domain constants and helpers**

Create `lib/mentor/expertLeads.ts` with these exact public shapes:

```ts
export const EXPERT_LEAD_STATUSES = ["new", "contacted", "completed"] as const;
export type ExpertLeadStatus = (typeof EXPERT_LEAD_STATUSES)[number];

export const EXPERT_STUDY_LEVELS = ["bachelor", "master", "undecided"] as const;
export type ExpertStudyLevel = (typeof EXPERT_STUDY_LEVELS)[number];

export const EXPERT_FIELDS = [
  "engineering-tech",
  "medicine-health",
  "business-economics",
  "design-architecture",
  "natural-sciences",
  "social-humanities",
  "arts-fashion",
  "law-politics",
  "undecided",
] as const;
export type ExpertField = (typeof EXPERT_FIELDS)[number];

export interface ExpertLeadDraft {
  submissionId: string;
  fullName: string;
  whatsappPhone: string;
  studyLevel: string;
  fieldOfInterest: string;
  targetIntake: string;
  helpRequest: string;
  website: string;
}

export interface ExpertLeadSubmission {
  submissionId: string;
  fullName: string;
  whatsappPhone: string;
  studyLevel: ExpertStudyLevel;
  fieldOfInterest: ExpertField;
  targetIntake: string;
  helpRequest: string;
}

export function buildTargetIntakeOptions(now = new Date()): string[] {
  const year = now.getUTCFullYear();
  return [
    `${year}-${year + 1}`,
    `${year + 1}-${year + 2}`,
    `${year + 2}-${year + 3}`,
    "undecided",
  ];
}

export function normalizeWhatsAppPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\+[0-9\s()-]+$/.test(trimmed)) return null;
  const digits = trimmed.slice(1).replace(/[\s()-]/g, "");
  if (!/^\d{8,15}$/.test(digits)) return null;
  return `+${digits}`;
}

export function buildWhatsAppHref(value: string): string | null {
  const normalized = normalizeWhatsAppPhone(value);
  return normalized ? `https://wa.me/${normalized.slice(1)}` : null;
}
```

- [ ] **Step 4: Implement the tagged validator**

Create `lib/mentor/expertLeadValidation.ts`. Export:

```ts
export type ExpertLeadField =
  | "submissionId"
  | "fullName"
  | "whatsappPhone"
  | "studyLevel"
  | "fieldOfInterest"
  | "targetIntake"
  | "helpRequest";

export type ExpertLeadValidationResult =
  | { kind: "valid"; value: ExpertLeadSubmission }
  | { kind: "invalid"; errors: Partial<Record<ExpertLeadField, string>> }
  | { kind: "honeypot" };
```

Use `typeof input === "object" && input !== null && !Array.isArray(input)` before reading fields. Treat a non-empty string `website` as `{ kind: "honeypot" }` before normal field errors. Validate UUID with:

```ts
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
```

Validate intake with a parser that returns true only for `undecided` or `/^(\d{4})-(\d{4})$/`, second year exactly first plus one, and first year between `now.getUTCFullYear() - 1` and `now.getUTCFullYear() + 4`. Store concise machine codes such as `required`, `invalid`, `too_short`, and `too_long` in the error map; UI translation selects copy from the field key and does not expose these codes directly.

- [ ] **Step 5: Run pure tests and type/lint checks**

Run:

```bash
npm run test:expert-leads
npx eslint lib/mentor/expertLeads.ts lib/mentor/expertLeadValidation.ts scripts/test-expert-leads.mjs
```

Expected: both commands PASS.

- [ ] **Step 6: Commit the domain foundation**

```bash
git add package.json lib/mentor/expertLeads.ts lib/mentor/expertLeadValidation.ts scripts/test-expert-leads.mjs
git diff --cached --name-only
git commit -m "test: define expert lead domain validation"
```

Expected staged paths: exactly the four files above.

---

### Task 2: Database Schema, RLS, and Row Type

**Files:**
- Create: `supabase/expert_leads.sql`
- Modify: `types/index.ts`
- Modify: `scripts/test-mentor-db.mjs`

**Interfaces:**
- Consumes: `public.requesting_user_id()` and `public.is_active_mentor_staff()` created by `supabase/volunteer_mentor.sql`.
- Produces: `public.expert_leads`, `ExpertLeadRow`, staff-only select/update/delete RLS, and unique constraint `expert_leads_submission_id_key`.

- [ ] **Step 1: Extend the temporary PostgreSQL test harness first**

In `scripts/test-mentor-db.mjs`, add:

```js
const expertLeadsSql = resolve("supabase/expert_leads.sql");

function loadExpertLeadsSql(database = "postgres", { allowFailure = false } = {}) {
  return command(psql, [...psqlArgs(database), "-f", expertLeadsSql], { allowFailure });
}
```

After `loadProductionSql()` and after inserting `staff-primary`, call `loadExpertLeadsSql()`.

Add a DB test that inserts one row as the database owner, then verifies:

```js
await test("expert leads enforce staff-only RLS and admin mutations", async () => {
  runSql(`
    insert into public.expert_leads (
      submission_id, full_name, whatsapp_phone, study_level,
      field_of_interest, target_intake, help_request
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'Expert Student', '+905321234567', 'bachelor',
      'engineering-tech', '2027-2028', 'Need an application roadmap.'
    );
  `);

  const anonRead = runSql(
    "set role anon; select * from public.expert_leads;",
    { allowFailure: true },
  );
  assertFailure(anonRead, "permission denied", "anonymous expert lead read");

  const studentCount = scalar(runSql(asUser(
    "ordinary-student",
    "select count(*) from public.expert_leads;",
  )));
  assert(studentCount === "0", `ordinary student saw ${studentCount} expert leads`);

  const staffCount = scalar(runSql(asUser(
    "staff-primary",
    "select count(*) from public.expert_leads;",
  )));
  assert(staffCount === "1", `active staff saw ${staffCount} expert leads`);

  runSql(asUser("staff-primary", `
    update public.expert_leads
    set status = 'contacted', internal_note = 'WhatsApp message sent.'
    where submission_id = '11111111-1111-4111-8111-111111111111';
  `));
  const state = scalar(runSql(`
    select status || ':' || internal_note
    from public.expert_leads
    where submission_id = '11111111-1111-4111-8111-111111111111';
  `));
  assert(state === "contacted:WhatsApp message sent.", `unexpected expert lead state: ${state}`);
});
```

Add separate assertions for: authenticated insert privilege is false, anon insert privilege is false, invalid phone fails, invalid enum fails, non-consecutive intake fails, duplicate `submission_id` fails with `expert_leads_submission_id_key`, `updated_at` increases after update, inactive staff sees zero rows and cannot update/delete, active staff can delete, and the SQL artifact is rerunnable.

- [ ] **Step 2: Run the DB test and confirm the red state**

Run:

```bash
npm run test:mentor-db
```

Expected: FAIL because `supabase/expert_leads.sql` does not exist.

- [ ] **Step 3: Create the SQL artifact**

Create `supabase/expert_leads.sql` as an idempotent transaction. The table and named constraints must match:

```sql
begin;

create table if not exists public.expert_leads (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  full_name text not null,
  whatsapp_phone text not null,
  study_level text not null,
  field_of_interest text not null,
  target_intake text not null,
  help_request text not null,
  status text not null default 'new',
  internal_note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint expert_leads_submission_id_key unique (submission_id),
  constraint expert_leads_full_name_check
    check (full_name = btrim(full_name) and char_length(full_name) between 2 and 120),
  constraint expert_leads_phone_check
    check (whatsapp_phone ~ '^\+[0-9]{8,15}$'),
  constraint expert_leads_study_level_check
    check (study_level in ('bachelor', 'master', 'undecided')),
  constraint expert_leads_field_check
    check (field_of_interest in (
      'engineering-tech', 'medicine-health', 'business-economics',
      'design-architecture', 'natural-sciences', 'social-humanities',
      'arts-fashion', 'law-politics', 'undecided'
    )),
  constraint expert_leads_target_intake_check
    check (
      target_intake = 'undecided'
      or case
        when target_intake ~ '^[0-9]{4}-[0-9]{4}$' then
          substring(target_intake from 6 for 4)::integer =
          substring(target_intake from 1 for 4)::integer + 1
        else false
      end
    ),
  constraint expert_leads_help_request_check
    check (help_request = btrim(help_request) and char_length(help_request) between 10 and 3000),
  constraint expert_leads_status_check
    check (status in ('new', 'contacted', 'completed')),
  constraint expert_leads_internal_note_check
    check (char_length(internal_note) <= 4000)
);
```

Add indexes named `expert_leads_status_created_idx` and `expert_leads_created_idx`. Add an idempotent trigger function `public.set_expert_leads_updated_at()` with `set search_path = ''`, drop/recreate trigger `expert_leads_set_updated_at`, and set `new.updated_at = timezone('utc', now())`.

Enable RLS, revoke all from `anon` and `authenticated`, grant only `select, update, delete` to `authenticated`, and create three policies:

```sql
using ((select public.is_active_mentor_staff()))
```

Use both `using` and `with check` on update. Do not create an insert policy. End with `commit;`.

- [ ] **Step 4: Add the explicit row interface**

Append to `types/index.ts`:

```ts
export interface ExpertLeadRow {
  id: string;
  submission_id: string;
  full_name: string;
  whatsapp_phone: string;
  study_level: "bachelor" | "master" | "undecided";
  field_of_interest:
    | "engineering-tech"
    | "medicine-health"
    | "business-economics"
    | "design-architecture"
    | "natural-sciences"
    | "social-humanities"
    | "arts-fashion"
    | "law-politics"
    | "undecided";
  target_intake: string;
  help_request: string;
  status: "new" | "contacted" | "completed";
  internal_note: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 5: Run DB, pure, and lint checks**

```bash
npm run test:mentor-db
npm run test:expert-leads
npx eslint types/index.ts scripts/test-mentor-db.mjs
```

Expected: PASS. If PostgreSQL tools are unavailable, install/locate PostgreSQL 16 and set `POSTGRES_BIN`; do not skip the RLS test.

- [ ] **Step 6: Commit the database boundary**

```bash
git add supabase/expert_leads.sql types/index.ts scripts/test-mentor-db.mjs
git diff --cached --name-only
git commit -m "feat: add expert lead database policy"
```

---

### Task 3: Public Server Submission Endpoint

**Files:**
- Create: `lib/mentor/expertLeads.server.ts`
- Create: `app/api/expert-leads/route.ts`
- Create: `scripts/check-expert-leads.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ExpertLeadSubmission` and `validateExpertLeadPayload(input, now)` from Task 1; `expert_leads_submission_id_key` from Task 2.
- Produces: `storeExpertLead(value): Promise<"created" | "duplicate">` and public `POST /api/expert-leads` JSON responses.

- [ ] **Step 1: Write the failing structural guard**

Add to `package.json`:

```json
"check:expert-leads": "node scripts/check-expert-leads.mjs"
```

Create `scripts/check-expert-leads.mjs` with `read`, `mustInclude`, `mustNotInclude`, and a `failures` array matching the style of `scripts/check-mentor-desks.mjs`. For this task, assert:

```js
const route = read("app/api/expert-leads/route.ts");
const server = read("lib/mentor/expertLeads.server.ts");
const sql = read("supabase/expert_leads.sql");

mustInclude(route, "export async function POST", "Public expert POST eksik");
mustNotInclude(route, "export async function GET", "Lead GET public olamaz");
mustInclude(route, 'export const dynamic = "force-dynamic"', "POST force-dynamic degil");
mustInclude(route, '"Cache-Control": "no-store, max-age=0"', "POST no-store degil");
mustInclude(route, "validateExpertLeadPayload", "Server payload dogrulamiyor");
mustInclude(server, 'import "server-only"', "Service role modulu server-only degil");
mustInclude(server, "SUPABASE_SERVICE_ROLE_KEY", "Service role insert eksik");
mustInclude(server, "expert_leads_submission_id_key", "Idempotent conflict guard eksik");
mustInclude(sql, "enable row level security", "Expert lead RLS eksik");
```

Also scan every file under `components/`, `app/` excluding `app/api/expert-leads/route.ts`, and client-marked `lib/` files; fail if any contains `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 2: Run the guard and confirm the red state**

```bash
npm run check:expert-leads
```

Expected: FAIL with missing route and server module messages.

- [ ] **Step 3: Implement the server-only insert boundary**

Create `lib/mentor/expertLeads.server.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

import type { ExpertLeadSubmission } from "@/lib/mentor/expertLeads";

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("expert_leads_server_unconfigured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function storeExpertLead(
  value: ExpertLeadSubmission,
): Promise<"created" | "duplicate"> {
  const { error } = await createServiceRoleClient().from("expert_leads").insert({
    submission_id: value.submissionId,
    full_name: value.fullName,
    whatsapp_phone: value.whatsappPhone,
    study_level: value.studyLevel,
    field_of_interest: value.fieldOfInterest,
    target_intake: value.targetIntake,
    help_request: value.helpRequest,
  });
  if (!error) return "created";
  if (
    error.code === "23505" &&
    error.message.includes("expert_leads_submission_id_key")
  ) {
    return "duplicate";
  }
  throw new Error(`expert_lead_insert_failed:${error.code ?? "unknown"}`);
}
```

Do not export the service-role client and do not return DB rows.

- [ ] **Step 4: Implement the POST-only route**

Create `app/api/expert-leads/route.ts` with `dynamic = "force-dynamic"`, a 20,000-byte body limit using `TextEncoder`, and exact no-store JSON headers.

The control flow must be:

```ts
const validation = validateExpertLeadPayload(body);
if (validation.kind === "honeypot") {
  return json({ ok: true }, 200);
}
if (validation.kind === "invalid") {
  return json({ ok: false, errors: validation.errors }, 400);
}

try {
  const result = await storeExpertLead(validation.value);
  return json({ ok: true }, result === "created" ? 201 : 200);
} catch (error) {
  console.error("Expert lead submission failed:", error);
  return json({ ok: false, error: "temporarily_unavailable" }, 503);
}
```

Return `400` with `{ ok: false, error: "invalid_json" }` for malformed JSON or over-limit bodies. The `json` helper must always include `Content-Type: application/json; charset=utf-8` and `Cache-Control: no-store, max-age=0`.

- [ ] **Step 5: Run structural, pure, and build checks**

```bash
npm run check:expert-leads
npm run test:expert-leads
npx eslint app/api/expert-leads/route.ts lib/mentor/expertLeads.server.ts scripts/check-expert-leads.mjs
npm run build
```

Expected: PASS. Build may still show the existing route matrix; no proxy change occurs until Task 5.

- [ ] **Step 6: Commit the public submission boundary**

```bash
git add package.json app/api/expert-leads/route.ts lib/mentor/expertLeads.server.ts scripts/check-expert-leads.mjs
git diff --cached --name-only
git commit -m "feat: add public expert lead submission API"
```

---

### Task 4: Public Expert Form and Bilingual Copy

**Files:**
- Create: `components/mentor/expert/ExpertLeadDesk.tsx`
- Create: `components/mentor/expert/ExpertLeadForm.tsx`
- Create: `components/mentor/expert/ExpertLeadSuccess.tsx`
- Modify: `lib/translations.ts`
- Modify: `scripts/check-expert-leads.mjs`

**Interfaces:**
- Consumes: Task 1 helpers and `POST /api/expert-leads` from Task 3.
- Produces: `<ExpertLeadDesk channel={channel} onBackToHub={fn} />`.

- [ ] **Step 1: Extend the guard for form files and exact copy**

Append assertions to `scripts/check-expert-leads.mjs` for the three component files, `fetch("/api/expert-leads"`, `crypto.randomUUID`, all six field names, `website`, `ExpertLeadSuccess`, and the exact Turkish success sentence:

```text
Talebini aldık. Ekibimiz WhatsApp üzerinden en kısa sürede sana ulaşacak.
```

Assert `lib/translations.ts` contains both `expertDesk:` blocks, `firstConsultationFree`, `paidContinuation`, `submit`, `submitting`, `submitError`, `success`, `backToDesks`, `fields`, `studyLevels`, `fieldsOfInterest`, and `undecided` at least twice.

- [ ] **Step 2: Run the guard and confirm the red state**

```bash
npm run check:expert-leads
```

Expected: FAIL because expert form components and copy are missing.

- [ ] **Step 3: Add exact TR/EN translation structure**

Inside both `aiMentor` objects add `expertDesk` with this key structure:

```ts
expertDesk: {
  eyebrow: "UZMAN MASASI · WHATSAPP ÖN GÖRÜŞMESİ",
  title: "Size ulaşalım.",
  intro: "Hedefini ve desteğe ihtiyaç duyduğun noktayı paylaş. ItalyPath ekibi ücretsiz ön görüşme için WhatsApp üzerinden sana ulaşsın.",
  firstConsultationFree: "İlk ön görüşme ücretsizdir.",
  paidContinuation: "Daha sonra profesyonel destek istersen ücretli hizmet ayrıca sunulabilir. Bu form bir satın alma değildir.",
  submit: "ÜCRETSİZ ÖN GÖRÜŞME TALEBİ GÖNDER",
  submitting: "GÖNDERİLİYOR…",
  submitError: "Talebin şu anda gönderilemedi. Bilgilerin duruyor; tekrar deneyebilirsin.",
  success: "Talebini aldık. Ekibimiz WhatsApp üzerinden en kısa sürede sana ulaşacak.",
  backToDesks: "MASALARA DÖN",
  fields: {
    fullName: "AD SOYAD",
    whatsappPhone: "WHATSAPP NUMARASI",
    studyLevel: "HEDEF EĞİTİM SEVİYESİ",
    fieldOfInterest: "İLGİLENDİĞİN ALAN",
    targetIntake: "HEDEF BAŞLANGIÇ DÖNEMİ",
    helpRequest: "NASIL YARDIMCI OLABİLİRİZ?",
  },
  placeholders: {
    fullName: "Adın ve soyadın",
    whatsappPhone: "+90 5xx xxx xx xx",
    helpRequest: "Hedefini ve netleştirmek istediğin noktaları kısaca anlat…",
  },
  studyLevels: {
    bachelor: "Lisans",
    master: "Yüksek lisans",
    undecided: "Henüz karar vermedim",
  },
  fieldsOfInterest: {
    "engineering-tech": "Mühendislik ve teknoloji",
    "medicine-health": "Tıp ve sağlık",
    "business-economics": "İşletme ve ekonomi",
    "design-architecture": "Tasarım ve mimarlık",
    "natural-sciences": "Fen bilimleri",
    "social-humanities": "Sosyal ve beşerî bilimler",
    "arts-fashion": "Sanat ve moda",
    "law-politics": "Hukuk ve siyaset",
    undecided: "Henüz karar vermedim",
  },
  intakeUndecided: "Henüz karar vermedim",
  validation: {
    required: "Bu alan zorunlu.",
    fullName: "Ad soyad 2–120 karakter olmalı.",
    whatsappPhone: "Numarayı ülke koduyla yaz. Örnek: +90 532 123 45 67",
    studyLevel: "Geçerli bir eğitim seviyesi seç.",
    fieldOfInterest: "Geçerli bir alan seç.",
    targetIntake: "Geçerli bir başlangıç dönemi seç.",
    helpRequest: "Açıklama 10–3000 karakter olmalı.",
  },
},
```

Use this exact English object with the same key order:

```ts
expertDesk: {
  eyebrow: "EXPERT DESK · WHATSAPP PRE-CONSULTATION",
  title: "Let us reach you.",
  intro: "Share your goal and where you need support. The ItalyPath team will contact you on WhatsApp for a free pre-consultation.",
  firstConsultationFree: "The first consultation is free.",
  paidContinuation: "If you later want professional support, a paid service may be offered separately. This form is not a purchase.",
  submit: "SEND FREE PRE-CONSULTATION REQUEST",
  submitting: "SENDING…",
  submitError: "Your request could not be sent right now. Your information is still here, so you can try again.",
  success: "We received your request. Our team will contact you on WhatsApp as soon as possible.",
  backToDesks: "BACK TO DESKS",
  fields: {
    fullName: "FULL NAME",
    whatsappPhone: "WHATSAPP NUMBER",
    studyLevel: "TARGET STUDY LEVEL",
    fieldOfInterest: "FIELD OF INTEREST",
    targetIntake: "TARGET INTAKE",
    helpRequest: "HOW CAN WE HELP?",
  },
  placeholders: {
    fullName: "Your full name",
    whatsappPhone: "+90 5xx xxx xx xx",
    helpRequest: "Briefly describe your goal and what you want to clarify…",
  },
  studyLevels: {
    bachelor: "Bachelor's",
    master: "Master's",
    undecided: "I haven't decided yet",
  },
  fieldsOfInterest: {
    "engineering-tech": "Engineering and technology",
    "medicine-health": "Medicine and health",
    "business-economics": "Business and economics",
    "design-architecture": "Design and architecture",
    "natural-sciences": "Natural sciences",
    "social-humanities": "Social sciences and humanities",
    "arts-fashion": "Arts and fashion",
    "law-politics": "Law and politics",
    undecided: "I haven't decided yet",
  },
  intakeUndecided: "I haven't decided yet",
  validation: {
    required: "This field is required.",
    fullName: "Full name must be 2–120 characters.",
    whatsappPhone: "Enter the number with a country code. Example: +90 532 123 45 67",
    studyLevel: "Choose a valid study level.",
    fieldOfInterest: "Choose a valid field.",
    targetIntake: "Choose a valid intake.",
    helpRequest: "The description must be 10–3000 characters.",
  },
},
```

- [ ] **Step 4: Implement the controlled form**

`ExpertLeadForm.tsx` is a client component with:

```ts
export interface ExpertLeadFormProps {
  onSubmitted: () => void;
}
```

Initialize one `ExpertLeadDraft` with `submissionId: crypto.randomUUID()` and empty strings. Render permanent `<label>` elements, one text input, one tel input with `inputMode="tel"`, three selects, one textarea, and the hidden honeypot. Use `text-base` on mobile inputs.

On submit:

```ts
const validation = validateExpertLeadPayload(draft);
if (validation.kind !== "valid") {
  setFieldErrors(validation.kind === "invalid" ? validation.errors : {});
  return;
}

setSubmitting(true);
setSubmitError(false);
try {
  const response = await fetch("/api/expert-leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  const result = (await response.json()) as {
    ok?: boolean;
    errors?: Partial<Record<ExpertLeadField, string>>;
  };
  if (!response.ok || !result.ok) {
    if (result.errors) setFieldErrors(result.errors);
    throw new Error("expert_lead_submit_failed");
  }
  onSubmitted();
} catch {
  setSubmitError(true);
} finally {
  setSubmitting(false);
}
```

Do not clear the draft on failure. Disable the submit button while sending. Use `aria-describedby` for field errors and `role="alert"` for the general error.

- [ ] **Step 5: Implement success and desk orchestration**

`ExpertLeadSuccess.tsx` renders the translated success sentence in an `aria-live="polite"` region and a single `Masalara dön` button.

`ExpertLeadDesk.tsx` receives the existing `MentorChannel` and `onBackToHub`, renders `MentorTopBar` in chat mode with `statusKey="idle"` and `statusLabel={t.aiMentor.statusReady}`, the free/paid explanation, and switches from `<ExpertLeadForm>` to `<ExpertLeadSuccess>` using local `submitted` state. Keep the outer layout `min-h-[100dvh] bg-[var(--editorial-paper)]`, `max-w-3xl`, border-based sections, serif title, and existing editorial variables.

- [ ] **Step 6: Run guard, pure tests, lint, and build**

```bash
npm run check:expert-leads
npm run test:expert-leads
npx eslint components/mentor/expert lib/translations.ts
npm run build
```

Expected: PASS; the form is not reachable from the hub until Task 5.

- [ ] **Step 7: Commit the public expert form**

```bash
git add components/mentor/expert/ExpertLeadDesk.tsx components/mentor/expert/ExpertLeadForm.tsx components/mentor/expert/ExpertLeadSuccess.tsx lib/translations.ts scripts/check-expert-leads.mjs
git diff --cached --name-only
git commit -m "feat: add expert consultation form"
```

---

### Task 5: Public Hub Routing and Guest Volunteer Gate

**Files:**
- Modify: `lib/mentor/channels.ts`
- Modify: `components/mentor/MentorHub.tsx`
- Modify: `app/ai-mentor/page.tsx`
- Modify: `proxy.ts`
- Modify: `scripts/check-route-access.mjs`
- Modify: `scripts/check-mentor-desks.mjs`
- Modify: `scripts/check-expert-leads.mjs`

**Interfaces:**
- Consumes: `<ExpertLeadDesk>` from Task 4 and existing `<VolunteerDesk>`/`<MentorChatRoom>`.
- Produces: public `/ai-mentor`, public expert deep link, signed-in volunteer deep link, and guest login redirect.

- [ ] **Step 1: Update route and mentor guards first**

In `scripts/check-route-access.mjs` move `/ai-mentor` and `/ai-mentor/session` to `publicChecks`, add `/api/expert-leads`, keep `/api/chat`, `/ekip/mentor`, and `/ekip/uzman` protected, and replace:

```js
if (publicPatterns.includes("/ai-mentor(.*)")) {
  failures.push("Public list still contains /ai-mentor(.*)");
}
```

with assertions that both `/ai-mentor(.*)` and `/api/expert-leads(.*)` are present.

In `scripts/check-mentor-desks.mjs`, replace the expert `coming-soon` assertion with:

```js
mustInclude(expertRecord, 'availability: "active"', "Expert masa aktif degil");
mustInclude(mentorPage, "<ExpertLeadDesk", "Expert lead deneyimi route edilmemis");
mustInclude(mentorPage, 'activeChannel.experience === "expert-lead"', "Expert branch eksik");
```

In `scripts/check-expert-leads.mjs`, add guards for the public matchers, `useAuth`, the encoded volunteer redirect, `desk=volunteer`, `desk=expert`, expert active status, expert CTA, and continued `robots.ts` disallow of `/ai-mentor`.

- [ ] **Step 2: Run guards and confirm the red state**

```bash
npm run check:routes
npm run check:mentor-desks
npm run check:expert-leads
```

Expected: all three FAIL on the old protected/coming-soon behavior.

- [ ] **Step 3: Activate expert and add hub-specific copy**

Set the expert record in `lib/mentor/channels.ts` to:

```ts
{
  id: "expert",
  order: 3,
  numberLabel: "03",
  monogram: "UZ",
  experience: "expert-lead",
  availability: "active",
}
```

Add `hubExpertActiveBadge` and `hubExpertCta` to both translation languages:

```text
TR: AKTİF · ÜCRETSİZ ÖN GÖRÜŞME / ÜCRETSİZ ÖN GÖRÜŞME
EN: ACTIVE · FREE PRE-CONSULTATION / FREE PRE-CONSULTATION
```

Update expert `meta` to `Ön görüşme ücretsiz · WhatsApp` / `Free pre-consultation · WhatsApp`. Remove expert copy that still says `coming soon` from the active presentation.

In `MentorHub.tsx`, choose badge and CTA by `channel.id`; volunteer keeps its existing copy, expert uses the new expert copy, AI remains paused. Do not label expert as chat.

- [ ] **Step 4: Make the route public while preserving staff/API protection**

In `proxy.ts`:

```ts
'/ai-mentor(.*)',
'/api/expert-leads(.*)',
```

Add both to `isPublicRoute`. Remove only `"/ai-mentor"` from `PROTECTED_PAGE_ROUTES`; keep `"/ekip"`, `"/documents"`, `"/favorites"`, `"/hosgeldin"`, `"/hub"`, `"/profile"`, and `"/sat"`.

Do not modify `app/robots.ts` or `app/sitemap.ts`.

- [ ] **Step 5: Route the expert experience and gate volunteer selection**

In `app/ai-mentor/page.tsx`, import `useAuth`, `useRouter`, and `ExpertLeadDesk`. Keep separate refs for desk-param handling and AI program context so auth loading cannot permanently consume `desk=volunteer`.

Implement guest redirect construction exactly:

```ts
function volunteerSignInHref() {
  return `/giris?redirect_url=${encodeURIComponent("/ai-mentor?desk=volunteer")}`;
}
```

Selection behavior:

```ts
if (channel.experience === "volunteer-inbox" && !isLoaded) return;
if (channel.experience === "volunteer-inbox" && !isSignedIn) {
  router.push(volunteerSignInHref());
  return;
}
if (channel.availability === "paused") return;
```

The query effect must wait for `isLoaded` before resolving `desk=volunteer`; authenticated users open volunteer, guests route to login, `desk=expert` opens expert without auth, and invalid values leave the hub visible.

Render branches in this order:

```tsx
{activeChannel.experience === "volunteer-inbox" ? (
  <VolunteerDesk channel={activeChannel} onBackToHub={handleBackToHub} />
) : activeChannel.experience === "expert-lead" ? (
  <ExpertLeadDesk channel={activeChannel} onBackToHub={handleBackToHub} />
) : (
  <MentorChatRoom /* existing AI props unchanged */ />
)}
```

- [ ] **Step 6: Run route, mentor, expert, volunteer, lint, and build checks**

```bash
npm run check:routes
npm run check:mentor-desks
npm run check:expert-leads
npm run test:volunteer-desk
npx eslint app/ai-mentor/page.tsx components/mentor/MentorHub.tsx lib/mentor/channels.ts proxy.ts scripts/check-route-access.mjs scripts/check-mentor-desks.mjs
npm run build
```

Expected: PASS. Manually verify signed-out `/ai-mentor` no longer redirects before continuing.

- [ ] **Step 7: Commit public desk routing**

```bash
git add lib/mentor/channels.ts components/mentor/MentorHub.tsx app/ai-mentor/page.tsx proxy.ts scripts/check-route-access.mjs scripts/check-mentor-desks.mjs scripts/check-expert-leads.mjs lib/translations.ts
git diff --cached --name-only
git commit -m "feat: open public expert consultation desk"
```

---

### Task 6: Expert Lead Inbox State and Protected Hook

**Files:**
- Create: `lib/mentor/expertLeadInboxState.ts`
- Create: `lib/mentor/useExpertLeadInbox.ts`
- Modify: `scripts/test-expert-leads.mjs`
- Modify: `scripts/check-expert-leads.mjs`

**Interfaces:**
- Consumes: `ExpertLeadRow`, `ExpertLeadStatus`, and existing `useMentorSupabaseClient()`.
- Produces: `useExpertLeadInbox(): UseExpertLeadInboxResult` with fail-closed staff access and no Realtime.

- [ ] **Step 1: Add failing pure state tests**

Extend the test transpiler to import `expertLeadInboxState.ts`. Add fixtures for three leads and assert these exact exports:

```js
const {
  filterExpertLeads,
  removeExpertLead,
  replaceExpertLead,
  resolveExpertLeadSelection,
  transitionExpertLeadIdentity,
} = await importHelpers();
```

Test:

```js
assert.deepEqual(filterExpertLeads(rows, "new").map((row) => row.id), ["lead-new"]);
assert.equal(replaceExpertLead(rows, contactedRow)[0].status, "contacted");
assert.equal(removeExpertLead(rows, "lead-new").some((row) => row.id === "lead-new"), false);
assert.equal(resolveExpertLeadSelection(rows, "missing", "all"), rows[0].id);
assert.equal(resolveExpertLeadSelection(rows, "lead-new", "contacted"), null);

const initial = {
  ownerId: "owner-a",
  generation: 4,
  authorized: true,
};
assert.deepEqual(transitionExpertLeadIdentity(initial, undefined), {
  ownerId: "owner-a",
  generation: 5,
  authorized: null,
  ready: false,
  changed: true,
});
assert.equal(transitionExpertLeadIdentity(initial, "owner-b").ownerId, "owner-b");
```

- [ ] **Step 2: Run pure tests and confirm the red state**

```bash
npm run test:expert-leads
```

Expected: FAIL because the state module does not exist.

- [ ] **Step 3: Implement pure inbox state helpers**

Create `lib/mentor/expertLeadInboxState.ts` with:

```ts
export type ExpertLeadFilter = "all" | ExpertLeadStatus;

export interface ExpertLeadIdentityState {
  ownerId: string | null;
  generation: number;
  authorized: boolean | null;
}

export interface ExpertLeadIdentityTransition extends ExpertLeadIdentityState {
  ready: boolean;
  changed: boolean;
}

export function filterExpertLeads(
  rows: ExpertLeadRow[],
  filter: ExpertLeadFilter,
): ExpertLeadRow[] {
  return filter === "all" ? rows : rows.filter((row) => row.status === filter);
}

export function replaceExpertLead(
  rows: ExpertLeadRow[],
  replacement: ExpertLeadRow,
): ExpertLeadRow[] {
  return rows.map((row) => row.id === replacement.id ? replacement : row);
}

export function removeExpertLead(rows: ExpertLeadRow[], id: string): ExpertLeadRow[] {
  return rows.filter((row) => row.id !== id);
}
```

`resolveExpertLeadSelection` keeps a selected ID only if it exists and matches the current filter; otherwise it returns the first matching row ID or `null`.

Export this exact identity transition:

```ts
export function transitionExpertLeadIdentity(
  current: ExpertLeadIdentityState,
  resolvedUserId: string | null | undefined,
): ExpertLeadIdentityTransition {
  if (resolvedUserId === undefined) {
    return {
      ownerId: current.ownerId,
      generation: current.generation + 1,
      authorized: null,
      ready: false,
      changed: true,
    };
  }
  if (resolvedUserId === null) {
    const changed = current.ownerId !== null || current.authorized !== false;
    return {
      ownerId: null,
      generation: current.generation + (changed ? 1 : 0),
      authorized: false,
      ready: true,
      changed,
    };
  }
  if (current.ownerId === resolvedUserId) {
    return { ...current, ready: true, changed: false };
  }
  return {
    ownerId: resolvedUserId,
    generation: current.generation + 1,
    authorized: null,
    ready: true,
    changed: true,
  };
}
```

`undefined` means Clerk is unresolved: retain the committed owner only for stale-result fencing, increment generation, set `authorized: null`, `ready: false`, and `changed: true`. `null` means resolved signed-out: clear owner, increment generation, set `authorized: false`, `ready: true`, and `changed: true`. The same resolved owner returns `ready: true` without incrementing generation; a different owner commits the new ID, increments generation, and resets authorization to null. The hook must never keep owner A rows visible while owner B or unresolved auth is active.

- [ ] **Step 4: Implement the protected hook without Realtime or optimistic writes**

Create `lib/mentor/useExpertLeadInbox.ts` as a client hook. Export:

```ts
export interface UseExpertLeadInboxResult {
  authorized: boolean | null;
  leads: ExpertLeadRow[];
  selectedLead: ExpertLeadRow | null;
  filter: ExpertLeadFilter;
  newCount: number;
  loading: boolean;
  savingStatus: boolean;
  savingNote: boolean;
  deleting: boolean;
  error: "access_check_failed" | "load_failed" | "status_failed" | "note_failed" | "delete_failed" | null;
  setFilter: (filter: ExpertLeadFilter) => void;
  selectLead: (id: string | null) => void;
  reload: () => Promise<void>;
  updateStatus: (status: ExpertLeadStatus) => Promise<void>;
  saveNote: (note: string) => Promise<void>;
  deleteLead: () => Promise<void>;
}
```

Use `useUser()` and `useMentorSupabaseClient()`. Before any table read, call:

```ts
const { data, error } = await supabase.rpc("is_active_mentor_staff");
```

Only `data === true` authorizes. Fetch exact columns in one query ordered by `created_at desc`. Capture `{ ownerId, generation }` before every async operation and discard late results when either differs. On logout/unresolved/user change, synchronously set `authorized` to null/false as appropriate, clear rows, clear selection, and clear mutation flags.

Mutations must use `.update(...).eq("id", selected.id).select(EXPERT_LEAD_COLUMNS).single()` or `.delete().eq("id", selected.id)`. Do not mutate local rows until Supabase succeeds. Trim note before save and reject over 4000 characters in the hook. After a status mutation, resolve selection against the active filter.

- [ ] **Step 5: Extend structural guards**

Assert the hook contains `is_active_mentor_staff`, no `.channel(`, no `postgres_changes`, no `service_role`, explicit purge on identity change, and no query before positive authorization. Assert `expertLeadInboxState.ts` exists and test script imports it.

- [ ] **Step 6: Run tests and lint**

```bash
npm run test:expert-leads
npm run check:expert-leads
npx eslint lib/mentor/expertLeadInboxState.ts lib/mentor/useExpertLeadInbox.ts scripts/test-expert-leads.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit protected inbox state**

```bash
git add lib/mentor/expertLeadInboxState.ts lib/mentor/useExpertLeadInbox.ts scripts/test-expert-leads.mjs scripts/check-expert-leads.mjs
git diff --cached --name-only
git commit -m "feat: add protected expert lead inbox state"
```

---

### Task 7: Expert Operator Panel and Cross-Navigation

**Files:**
- Create: `components/mentor/expert/operator/ExpertLeadGate.tsx`
- Create: `components/mentor/expert/operator/ExpertLeadInbox.tsx`
- Create: `components/mentor/expert/operator/ExpertLeadList.tsx`
- Create: `components/mentor/expert/operator/ExpertLeadDetail.tsx`
- Create: `app/ekip/uzman/page.tsx`
- Modify: `components/mentor/operator/MentorOperatorInbox.tsx`
- Modify: `lib/translations.ts`
- Modify: `scripts/check-expert-leads.mjs`

**Interfaces:**
- Consumes: `useExpertLeadInbox()` and `buildWhatsAppHref()`.
- Produces: protected `/ekip/uzman` UI with list/detail, status, note, delete, refresh, and links between staff modules.

- [ ] **Step 1: Add failing panel guards**

Append checks for all five new files, `<ExpertLeadInbox />` in the page, use of `useExpertLeadInbox`, all four filters, `buildWhatsAppHref`, `target="_blank"`, `rel="noreferrer"`, `window.confirm`, the `Yenile` action, and links between `/ekip/mentor` and `/ekip/uzman`.

Assert `lib/translations.ts` contains two `expertOperator:` blocks with keys: `eyebrow`, `title`, `backHome`, `volunteerInbox`, `refresh`, `newCount`, `filters`, `empty`, `selectLead`, `whatsapp`, `statusLabel`, `noteLabel`, `saveNote`, `deleteLead`, `deleteConfirm`, `loading`, `unauthorizedTitle`, `unauthorizedBody`, `loadError`, `retry`, and mutation errors.

- [ ] **Step 2: Run the guard and confirm the red state**

```bash
npm run check:expert-leads
```

Expected: FAIL on missing operator components and translations.

- [ ] **Step 3: Add exact bilingual operator copy**

Add top-level `expertOperator` objects in TR and EN. Use these Turkish values:

```ts
eyebrow: "ITALYPATH · UZMAN TALEPLERİ",
title: "Uzman ön görüşme talepleri",
backHome: "Ana sayfaya dön",
volunteerInbox: "Gönüllü görüşmeleri",
refresh: "YENİLE",
newCount: "YENİ TALEP: {count}",
filters: { all: "TÜMÜ", new: "YENİ", contacted: "İLETİŞİME GEÇİLDİ", completed: "TAMAMLANDI" },
empty: "Bu durumda uzman talebi yok.",
selectLead: "Detayları görmek için bir talep seç.",
whatsapp: "WHATSAPP'TAN ULAŞ ↗",
statusLabel: "DURUM",
noteLabel: "EKİP NOTU",
saveNote: "NOTU KAYDET",
deleteLead: "TALEBİ SİL",
deleteConfirm: "{name} adlı kişinin talebini kalıcı olarak silmek istediğine emin misin?",
loading: "Uzman talepleri hazırlanıyor…",
unauthorizedTitle: "Bu alan ekip erişimi gerektiriyor.",
unauthorizedBody: "Giriş yaptığın hesap aktif ekip operatörü olarak yetkilendirilmemiş.",
loadError: "Uzman talepleri şu anda yüklenemedi.",
retry: "TEKRAR DENE",
statusError: "Durum kaydedilemedi.",
noteError: "Ekip notu kaydedilemedi. Metin korunuyor.",
deleteError: "Talep silinemedi.",
```

Use these exact English values and reuse `aiMentor.expertDesk` option labels for study level and field labels rather than duplicating a third set:

```ts
eyebrow: "ITALYPATH · EXPERT REQUESTS",
title: "Expert pre-consultation requests",
backHome: "Back to home",
volunteerInbox: "Volunteer conversations",
refresh: "REFRESH",
newCount: "NEW REQUESTS: {count}",
filters: { all: "ALL", new: "NEW", contacted: "CONTACTED", completed: "COMPLETED" },
empty: "There are no expert requests in this state.",
selectLead: "Select a request to view its details.",
whatsapp: "CONTACT ON WHATSAPP ↗",
statusLabel: "STATUS",
noteLabel: "TEAM NOTE",
saveNote: "SAVE NOTE",
deleteLead: "DELETE REQUEST",
deleteConfirm: "Permanently delete the request from {name}?",
loading: "Preparing expert requests…",
unauthorizedTitle: "This area requires team access.",
unauthorizedBody: "The signed-in account is not authorized as an active team operator.",
loadError: "Expert requests could not be loaded right now.",
retry: "TRY AGAIN",
statusError: "The status could not be saved.",
noteError: "The team note could not be saved. Your text is preserved.",
deleteError: "The request could not be deleted.",
```

- [ ] **Step 4: Implement the access gate**

`ExpertLeadGate.tsx` accepts:

```ts
interface ExpertLeadGateProps {
  authorized: boolean | null;
  loading: boolean;
  error: UseExpertLeadInboxResult["error"];
  onRetry: () => Promise<void>;
  children: ReactNode;
}
```

Render no children until `authorized === true`. Render distinct loading, unauthorized, and retryable access/load error surfaces using expert operator copy. Never render cached list markup behind the error state.

- [ ] **Step 5: Implement list and detail components**

`ExpertLeadList` receives filtered rows, selected ID, filter, new count, loading, disabled, `onRefresh`, `onFilterChange`, and `onSelect`. Render four `aria-pressed` filter buttons, a refresh button, count text with `{count}` replacement, and list rows with full name, localized created date, study-level label, field label, and status label.

`ExpertLeadDetail` receives the selected row and mutation flags/callbacks. Use a keyed instance by lead ID so local note draft resets only on selection change. Render all six submitted values as text, not HTML. Status is a select with three values. Note uses an explicit save button. WhatsApp link is:

```tsx
<a href={buildWhatsAppHref(lead.whatsapp_phone) ?? "#"} target="_blank" rel="noreferrer">
  {copy.whatsapp}
</a>
```

Disable the link if helper returns null. Delete must call `window.confirm` with `{name}` replaced before invoking `onDelete`. Preserve the note text if save fails.

- [ ] **Step 6: Implement inbox orchestration and route**

`ExpertLeadInbox.tsx` calls the hook, derives filtered rows with `filterExpertLeads`, scrolls selected detail into view on screens below `1024px`, and renders desktop grid:

```text
lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.6fr)]
```

Header includes home and `/ekip/mentor` links. Render mutation-specific errors near the detail without replacing the list.

Create `app/ekip/uzman/page.tsx`:

```tsx
"use client";

import ExpertLeadInbox from "@/components/mentor/expert/operator/ExpertLeadInbox";

export default function ExpertLeadOperatorPage() {
  return <ExpertLeadInbox />;
}
```

Add an `Uzman talepleri` link to `/ekip/uzman` in the existing volunteer operator header. Do not change volunteer hook/state/controller behavior.

- [ ] **Step 7: Run operator, expert, mentor, route, lint, and build checks**

```bash
npm run test:expert-leads
npm run check:expert-leads
npm run check:mentor-desks
npm run test:mentor-operator
npm run check:routes
npx eslint app/ekip/uzman components/mentor/expert/operator components/mentor/operator/MentorOperatorInbox.tsx lib/translations.ts
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit the operator panel**

```bash
git add app/ekip/uzman/page.tsx components/mentor/expert/operator components/mentor/operator/MentorOperatorInbox.tsx lib/translations.ts scripts/check-expert-leads.mjs
git diff --cached --name-only
git commit -m "feat: add expert lead operator panel"
```

---

### Task 8: Legal Disclosure, Runbook, Context, and Final Guards

**Files:**
- Modify: `lib/legal/documents.ts`
- Modify: `SUPABASE_SECURITY_RUNBOOK.md`
- Modify: `AGENT_CONTEXT.md`
- Modify: `scripts/check-expert-leads.mjs`

**Interfaces:**
- Consumes: completed form, API, DB, public route, and operator panel contracts.
- Produces: truthful documentation, production setup sequence, and a complete permanent source guard.

- [ ] **Step 1: Make the final guard fail on missing disclosure and docs**

Add assertions that `lib/legal/documents.ts` mentions all of: `Uzman ön görüşme talepleri`, `WhatsApp numarası`, `eğitim seviyesi`, `ilgi alanı`, `hedef başlangıç dönemi`, `ücretsiz ön görüşme`, `ücretli`, `yetkili ItalyPath operatörü`, and manual deletion when no longer needed.

Assert `SUPABASE_SECURITY_RUNBOOK.md` contains `supabase/expert_leads.sql`, `/ekip/uzman`, `is_active_mentor_staff`, public form test, and test-lead deletion. Assert `AGENT_CONTEXT.md` names `expert_leads`, public `/ai-mentor`, protected `/ekip/uzman`, `check:expert-leads`, and `test:expert-leads`.

Extend the guard to cover every remaining spec invariant: no Realtime in expert hook, no notifications/CAPTCHA packages, no expert profile prefill, no email field, no consent checkbox key, `robots.ts` still disallows `/ai-mentor`, and no sitemap entry.

- [ ] **Step 2: Run the guard and confirm the red state**

```bash
npm run check:expert-leads
```

Expected: FAIL on legal/runbook/context omissions.

- [ ] **Step 3: Update privacy and terms copy**

Set `LEGAL_LAST_UPDATED` to the real implementation date. In the `Gizlilik Politikası ve Aydınlatma Metni` privacy document:

- Add the six lead fields to the collected-data section.
- Add the purpose: assess the free pre-consultation request and contact the person on WhatsApp.
- State that only the authorized ItalyPath operator can access the lead.
- Add Supabase/cloud storage to the sharing/storage explanation without claiming marketing use.
- State that the lead is retained only while needed to manage the request and is manually deleted from the operator panel when no longer needed.

Use these exact Turkish disclosures in the matching structured sections:

```text
Uzman ön görüşme talepleri: Ad soyadınız, WhatsApp numaranız, hedef eğitim seviyeniz, ilgilendiğiniz alan, hedef başlangıç döneminiz ve destek talebiniz.

Uzman ön görüşme talebinizi değerlendirmek ve verdiğiniz numara üzerinden WhatsApp ile sizinle iletişime geçmek.

Uzman ön görüşme taleplerine yalnızca yetkilendirilmiş ItalyPath operatörü erişebilir.

Uzman ön görüşme talebiniz, talebi yönetmek için gerekli olduğu sürece saklanır; artık ihtiyaç kalmadığında yetkili operatör tarafından panelden manuel olarak silinir.
```

In `Hizmetin Tanımı` and `Mentor Masaları Hakkında`, add this exact product boundary:

```text
ItalyPath Uzman masasında ilk ön görüşme ücretsizdir. Kullanıcı daha sonra profesyonel destek almak isterse ücretli hizmet ayrıca sunulabilir; ön görüşme formunu göndermek bir satın alma veya ödeme taahhüdü oluşturmaz.
```

Do not claim a response SLA, guaranteed outcome, or official/legal advice.

- [ ] **Step 4: Update the production runbook**

Add an ordered expert lead section:

```text
1. Verify volunteer_mentor.sql and one active mentor_staff row.
2. Apply supabase/expert_leads.sql.
3. Test anon denial, ordinary authenticated denial, and active staff select/update/delete.
4. Deploy the app with server-only SUPABASE_SERVICE_ROLE_KEY.
5. Submit one guest lead and manage it in /ekip/uzman.
6. Delete the test lead manually.
```

State that missing SQL returns controlled 503 and that weakening RLS or exposing the service-role key is forbidden.

- [ ] **Step 5: Update agent context**

Update all stale statements, not just one paragraph:

- Route matrix: `/ai-mentor` public; `/api/expert-leads` public POST; `/ekip/uzman` protected.
- Mentor architecture: AI paused, volunteer active/authenticated, expert active/public lead form.
- Supabase surfaces: `expert_leads` and `supabase/expert_leads.sql`.
- Commands: `npm run check:expert-leads`, `npm run test:expert-leads`.
- Environment: service role also powers server-only expert insert.
- Known issues: remove the statement that expert remains coming-soon.
- Agent rules: expert lead client code must never receive service role.

- [ ] **Step 6: Run the complete verification matrix**

Run in this order and capture exact outputs for handoff:

```bash
npm run test:expert-leads
npm run check:expert-leads
npm run test:mentor-db
npm run check:mentor-desks
npm run test:volunteer-desk
npm run test:mentor-operator
npm run check:routes
npm run lint
npm run build
```

Expected: every command PASS. Do not report completion if any command is skipped or fails.

- [ ] **Step 7: Perform the manual local browser matrix**

With the development server and valid environment variables:

```bash
npm run dev
```

Verify:

1. Signed-out `/ai-mentor` loads without redirect.
2. Expert form retains data after a forced 503 and succeeds after recovery.
3. Double-click/retry creates one row for one `submissionId`.
4. A fresh form can intentionally create a second row.
5. Signed-out volunteer selection goes to `/giris?redirect_url=%2Fai-mentor%3Fdesk%3Dvolunteer`.
6. Signed-in return opens volunteer desk.
7. Ordinary user cannot open `/ekip/uzman` data.
8. Staff can refresh, filter, open WhatsApp, update status, save note, and delete.
9. Logout/user switch clears panel rows immediately.
10. TR/EN, mobile, and desktop layouts work.

Do not apply production SQL or create production test data without explicit user authorization. Local/manual checks may use an approved development Supabase project.

- [ ] **Step 8: Commit docs and final guards**

```bash
git add lib/legal/documents.ts SUPABASE_SECURITY_RUNBOOK.md AGENT_CONTEXT.md scripts/check-expert-leads.mjs
git diff --cached --name-only
git commit -m "docs: document expert lead operations"
```

- [ ] **Step 9: Verify final repository scope**

```bash
git status --short
git log -8 --oneline
git diff HEAD~8..HEAD --stat
```

Confirm unrelated pre-existing dirty files are still present and untouched. Report the eight feature commits, all verification outputs, production SQL still requiring explicit application, and any manual check that could not run because credentials were unavailable.

---

## Uygulayıcı Agent Başlangıç Promptu

Use the following prompt verbatim in the separate implementation task:

```text
ItalyPath projesinde onaylanmış Uzman Lead Masası özelliğini uygula.

Çalışmaya başlamadan önce şu üç dosyayı eksiksiz oku:
1. AGENT_CONTEXT.md
2. docs/superpowers/specs/2026-08-10-expert-lead-desk-design.md
3. docs/superpowers/plans/2026-08-10-expert-lead-desk.md

REQUIRED SUB-SKILL: superpowers:executing-plans becerisini kullan ve planı Task 1'den Task 8'e sırayla uygula. Her checkbox adımını izle; TDD red/green döngülerini, dosya kapsamlarını, testleri ve task sonu commitlerini atlama.

Kritik çalışma kuralları:
- Worktree dirty kabul et. Sana ait olmayan değişiklikleri revert etme, stage etme veya commit etme.
- Uygulama planından sapma gerektiğini düşünürsen kod yazmadan önce dur, somut gerekçeyi ve önerdiğin farkı bildir.
- Production Supabase SQL'ini çalıştırma ve production verisi oluşturma; yalnızca SQL artifact'ını ve testleri hazırla. Canlı uygulama için ayrıca kullanıcı onayı gerekir.
- SUPABASE_SERVICE_ROLE_KEY hiçbir client dosyasına veya NEXT_PUBLIC değişkenine girmeyecek.
- /ai-mentor public olacak; gönüllü masa giriş istemeye devam edecek; /ekip/uzman yalnızca mevcut tek aktif mentor_staff operatörüne açık olacak.
- Uzman lead sistemi gönüllü konuşma tablolarını/state machine'ini yeniden kullanmayacak.
- Yeni dependency, bildirim, Realtime, CAPTCHA, IP saklama, telefon bazlı dedupe, otomatik silme, e-posta alanı veya onay kutusu ekleme.
- TR/EN metinleri paralel olacak; mevcut editorial paper/sage/terracotta görsel dili korunacak.

Her task sonunda:
1. Task'a özel testleri çalıştır.
2. git diff ve staged dosya listesini incele.
3. Yalnızca task dosyalarını exact commit mesajıyla commit et.
4. Sonraki task'a geç.

Task 8 sonunda plandaki tam doğrulama matrisini çalıştır. Bir test başarısızsa tamamlandı deme. Final raporunda commitleri, test sonuçlarını, değiştirdiğin dosyaları, production'da uygulanması gereken supabase/expert_leads.sql adımını ve yapılamayan manuel kontrolleri açıkça belirt.
```
