import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

const postgresToolNames = ["initdb", "pg_ctl", "psql"];

function toolsFromDirectory(directory) {
  return {
    initdb: join(directory, "initdb"),
    pgCtl: join(directory, "pg_ctl"),
    psql: join(directory, "psql"),
    source: directory,
  };
}

function toolsAreRunnable(tools) {
  return [tools.initdb, tools.pgCtl, tools.psql].every((tool) => {
    const result = spawnSync(tool, ["--version"], { encoding: "utf8" });
    return !result.error && result.status === 0;
  });
}

function resolvePostgresTools() {
  if (process.env.POSTGRES_BIN) {
    const explicit = toolsFromDirectory(process.env.POSTGRES_BIN);
    if (!toolsAreRunnable(explicit)) {
      throw new Error(
        `POSTGRES_BIN=${process.env.POSTGRES_BIN} must contain runnable ${postgresToolNames.join(", ")}`,
      );
    }
    return explicit;
  }

  const pgConfig = spawnSync("pg_config", ["--bindir"], { encoding: "utf8" });
  if (!pgConfig.error && pgConfig.status === 0 && pgConfig.stdout.trim()) {
    const configured = toolsFromDirectory(pgConfig.stdout.trim());
    if (toolsAreRunnable(configured)) return configured;
  }

  const pathTools = {
    initdb: "initdb",
    pgCtl: "pg_ctl",
    psql: "psql",
    source: "PATH",
  };
  if (toolsAreRunnable(pathTools)) return pathTools;

  const homebrewFallback = toolsFromDirectory("/opt/homebrew/opt/postgresql@16/bin");
  if (toolsAreRunnable(homebrewFallback)) return homebrewFallback;

  throw new Error(
    `PostgreSQL tools not found (${postgresToolNames.join(", ")}). Set POSTGRES_BIN to the PostgreSQL bin directory.`,
  );
}

const postgresTools = resolvePostgresTools();
const { initdb, pgCtl, psql } = postgresTools;
const clusterRoot = mkdtempSync(join(tmpdir(), "italypath-mentor-pg-"));
const dataDir = join(clusterRoot, "data");
const socketDir = join(clusterRoot, "socket");
const serverLog = join(clusterRoot, "postgres.log");
const productionSql = resolve("supabase/volunteer_mentor.sql");
const expertLeadsSql = resolve("supabase/expert_leads.sql");
const conversationGate = 731002001;
const messageGate = 731002002;
let port;
let started = false;
let cleaned = false;
let workerSequence = 0;

function command(commandPath, args, options = {}) {
  const result = spawnSync(commandPath, args, {
    encoding: "utf8",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${commandPath} ${args.join(" ")} failed (${result.status})\n${result.stdout}${result.stderr}`,
    );
  }
  return result;
}

function psqlArgs(database = "postgres") {
  return [
    "-X",
    "-qAt",
    "-v",
    "ON_ERROR_STOP=1",
    "-h",
    socketDir,
    "-p",
    String(port),
    "-U",
    "postgres",
    "-d",
    database,
  ];
}

function runSql(sql, { allowFailure = false, database = "postgres" } = {}) {
  return command(psql, psqlArgs(database), {
    input: sql,
    allowFailure,
  });
}

function loadProductionSql(database = "postgres", { allowFailure = false } = {}) {
  return command(psql, [...psqlArgs(database), "-f", productionSql], { allowFailure });
}

function loadExpertLeadsSql(database = "postgres", { allowFailure = false } = {}) {
  return command(psql, [...psqlArgs(database), "-f", expertLeadsSql], {
    allowFailure,
  });
}

function installSupabaseStubs(database) {
  runSql(`
    create schema auth;
    create function auth.jwt()
    returns jsonb
    language sql
    stable
    as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.jwt() to anon, authenticated;
    create publication supabase_realtime;

    -- Shape of Supabase's realtime.messages and realtime.topic(); hosted
    -- projects grant select/insert/update to both client roles.
    create schema realtime;
    create table realtime.messages (
      id uuid primary key default gen_random_uuid(),
      topic text not null,
      extension text not null,
      payload jsonb,
      event text,
      private boolean default false,
      inserted_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
    alter table realtime.messages enable row level security;
    create function realtime.topic()
    returns text
    language sql
    stable
    as $$
      select nullif(current_setting('realtime.topic', true), '')::text;
    $$;
    grant usage on schema realtime to anon, authenticated;
    grant select, insert, update on realtime.messages to anon, authenticated;
    grant execute on function realtime.topic() to anon, authenticated;
  `, { database });
}

function legacySchemaSql({ withData }) {
  return `
    create extension if not exists pgcrypto;

    create table public.mentor_staff (
      user_id text primary key,
      display_name text not null,
      active boolean not null default true,
      created_at timestamptz not null default timezone('utc', now()),
      constraint mentor_staff_display_name_length
        check (char_length(btrim(display_name)) between 1 and 120)
    );

    create table public.mentor_conversations (
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

    create unique index mentor_conversations_one_open_per_user
      on public.mentor_conversations (user_id)
      where status <> 'closed';

    create table public.mentor_messages (
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

    ${withData ? `
      insert into public.mentor_conversations (
        id,
        user_id,
        student_display_name,
        topic,
        status,
        last_sender_kind,
        last_message_preview
      ) values (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'legacy-student',
        'Legacy Student',
        'other',
        'waiting_for_team',
        'student',
        'Legacy message'
      );

      insert into public.mentor_messages (
        id,
        conversation_id,
        sender_kind,
        body,
        client_nonce
      ) values (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'student',
        'Legacy message',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      );
    ` : ""}
  `;
}

function runSqlAsync(sql) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(psql, psqlArgs(), { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", rejectPromise);
    child.on("close", (status) => resolvePromise({ status, stdout, stderr }));
    child.stdin.end(sql);
  });
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function asUser(userId, sql, applicationName = "") {
  const app = applicationName
    ? `set application_name = ${quote(applicationName)};`
    : "";
  return `${app}
set role authenticated;
set request.jwt.claims = ${quote(JSON.stringify({ sub: userId }))};
${sql}`;
}

// Mirrors Realtime's private-channel join check: a probe row for the topic is
// written by the server role, then the caller must be able to select it.
function realtimeJoinSql(userId, topic) {
  const caller = userId
    ? `set local role authenticated;
set local request.jwt.claims = ${quote(JSON.stringify({ sub: userId }))};`
    : "set local role anon;";
  return `begin;
insert into realtime.messages (topic, extension, private)
values (${quote(topic)}, 'broadcast', true);
${caller}
select set_config('realtime.topic', ${quote(topic)}, true) is not null;
select 'join:' || count(*) from realtime.messages where topic = ${quote(topic)};
rollback;`;
}

function canJoinRealtimeTopic(userId, topic) {
  const lines = runSql(realtimeJoinSql(userId, topic)).stdout.trim().split("\n");
  const verdict = lines.find((line) => line.startsWith("join:"));
  assert(verdict, `realtime join probe returned no verdict for ${topic}`);
  return verdict === "join:1";
}

function scalar(result) {
  return result.stdout.trim().split("\n").at(-1) ?? "";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSuccess(result, label) {
  assert(result.status === 0, `${label} failed: ${result.stderr}`);
  return scalar(result);
}

function assertFailure(result, expected, label) {
  assert(result.status !== 0, `${label} unexpectedly succeeded: ${result.stdout}`);
  assert(
    result.stderr.includes(expected),
    `${label} returned the wrong error; expected ${expected}: ${result.stderr}`,
  );
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function freePort() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.on("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePromise(address.port));
    });
  });
}

async function acquireBarrier(key) {
  const blocker = spawn(psql, psqlArgs(), { stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let released = false;
  blocker.stdout.setEncoding("utf8");
  blocker.stderr.setEncoding("utf8");
  blocker.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  blocker.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  blocker.stdin.write(`select pg_advisory_lock(${key});\n\\echo READY\n`);

  const deadline = Date.now() + 5000;
  while (!stdout.includes("READY")) {
    if (Date.now() > deadline) {
      blocker.kill("SIGTERM");
      throw new Error(`Timed out acquiring test barrier ${key}: ${stderr}`);
    }
    await sleep(10);
  }

  return async () => {
    if (released) return;
    released = true;
    blocker.stdin.end(`select pg_advisory_unlock(${key});\n\\q\n`);
    await new Promise((resolvePromise, rejectPromise) => {
      blocker.on("error", rejectPromise);
      blocker.on("close", resolvePromise);
    });
  };
}

async function runConcurrentBehindGate(gate, userCalls) {
  const release = await acquireBarrier(gate);
  const workerPrefix = `mentor-db-worker-${Date.now()}-${workerSequence++}`;
  const workers = userCalls.map(({ userId, sql }, index) =>
    runSqlAsync(asUser(userId, sql, `${workerPrefix}-${index}`)),
  );

  try {
    const deadline = Date.now() + 5000;
    while (true) {
      const waiting = Number(
        scalar(
          runSql(`
            select count(*)
            from pg_stat_activity
            where application_name like ${quote(`${workerPrefix}-%`)}
              and wait_event_type = 'Lock';
          `),
        ),
      );
      if (waiting === userCalls.length) break;
      if (Date.now() > deadline) {
        throw new Error(
          `Timed out waiting for ${userCalls.length} concurrent workers; observed ${waiting}`,
        );
      }
      await sleep(10);
    }
  } finally {
    await release();
  }

  return Promise.all(workers);
}

async function test(name, callback) {
  try {
    await callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    throw error;
  }
}

function cleanup() {
  if (cleaned) return;
  cleaned = true;
  if (started) {
    command(pgCtl, ["-D", dataDir, "-m", "fast", "-w", "stop"], { allowFailure: true });
    started = false;
  }
  rmSync(clusterRoot, { recursive: true, force: true });
}

function functionCall(name, args) {
  return `select public.${name}(${args.join(", ")});`;
}

// Security audit card 4 (2026-09-26): favorites, documents, profiles, SAT
// attempts, storage policies and catalog grants. Loaded in their own database
// in the order a fresh project would apply them.
const userDataDatabase = "user_data";
const userDataSqlFiles = [
  "supabase/add_documents_category.sql",
  "supabase/rls_hardening.sql",
  "supabase/user_profiles.sql",
  "supabase/sat_bank.sql",
  "supabase/program_admission_details.sql",
  "supabase/program_degree_class_codes.sql",
  "supabase/data_api_privileges.sql",
  "supabase/archive_legacy_content_tables.sql",
].map((file) => resolve(file));

function userDataSql(sql, { allowFailure = false } = {}) {
  return runSql(sql, { allowFailure, database: userDataDatabase });
}

function asAnon(sql) {
  return `set role anon;
${sql}`;
}

function loadUserDataSql() {
  for (const file of userDataSqlFiles) {
    command(psql, [...psqlArgs(userDataDatabase), "-f", file]);
  }
}

// Hosted-project state before card 4: Supabase's default grants for objects
// postgres creates in public, a minimal storage schema, catalog tables with
// public read policies, dashboard-made user tables with the duplicate
// favorites index, and set_updated_at() without a pinned search_path.
function installUserDataStubs() {
  runSql(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin bypassrls;
      end if;
    end $$;
    create database ${userDataDatabase};
  `);
  installSupabaseStubs(userDataDatabase);
  userDataSql(`
    alter default privileges for role postgres in schema public
      grant all on tables to anon, authenticated, service_role;
    alter default privileges for role postgres in schema public
      grant all on sequences to anon, authenticated, service_role;
    alter default privileges for role postgres in schema public
      grant all on functions to anon, authenticated, service_role;

    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets (id),
      name text not null,
      created_at timestamptz not null default now()
    );
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated, service_role;
    grant select, insert, update, delete on storage.buckets, storage.objects
      to anon, authenticated, service_role;
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('documents', 'documents', false, 20971520,
      array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

    create function public.set_updated_at()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = timezone('utc', now());
      return new;
    end;
    $fn$;

    create table public.universities (
      id bigint primary key,
      name text not null,
      updated_at timestamptz not null default now()
    );
    create table public.university_departments (
      id bigint primary key,
      university_id bigint not null references public.universities (id),
      slug text not null,
      level text not null,
      updated_at timestamptz not null default now()
    );
    create table public.program_admission_details (
      department_id bigint primary key
        references public.university_departments (id) on delete cascade,
      university_id bigint not null references public.universities (id),
      degree_class text,
      updated_at timestamptz not null default now()
    );
    alter table public.universities enable row level security;
    alter table public.university_departments enable row level security;
    alter table public.program_admission_details enable row level security;
    create policy universities_public_read on public.universities
      for select to anon, authenticated using (true);
    create policy university_departments_public_read on public.university_departments
      for select to anon, authenticated using (true);
    create policy program_admission_details_public_read on public.program_admission_details
      for select to anon, authenticated using (true);
    insert into public.universities (id, name) values (1, 'Probe University');
    insert into public.university_departments (id, university_id, slug, level)
    values (10, 1, 'probe-program', 'master');
    insert into public.program_admission_details (department_id, university_id, degree_class)
    values (10, 1, 'LM-32 Ingegneria informatica');

    create table public.community_links (id text primary key, name text not null);
    create table public.scholarship_regions (region_slug text primary key, region_name text not null);
    alter table public.community_links enable row level security;
    alter table public.scholarship_regions enable row level security;
    create policy community_links_public_read on public.community_links
      for select to anon, authenticated using (true);
    create policy scholarship_regions_public_read on public.scholarship_regions
      for select to anon, authenticated using (true);
    insert into public.community_links (id, name) values ('probe', 'Probe community');
    insert into public.scholarship_regions (region_slug, region_name) values ('lazio', 'Lazio');

    create table public.favorites (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      university_id text not null,
      created_at timestamptz not null default timezone('utc', now()),
      unique (user_id, university_id)
    );
    create unique index favorites_user_university_unique
      on public.favorites (user_id, university_id);
    create table public.user_documents (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      file_name text not null,
      file_url text not null,
      created_at timestamptz default now(),
      storage_path text
    );
  `);
}

function documentRowSql(userId, fileName, path, category = "'identity'") {
  return `insert into public.user_documents (user_id, file_name, file_url, storage_path, category)
values (${quote(userId)}, ${quote(fileName)}, ${quote(path)}, ${quote(path)}, ${category});`;
}

function documentObjectSql(path) {
  return `insert into storage.objects (bucket_id, name) values ('documents', ${quote(path)});`;
}

function satAttemptSql(userId, answer, answeredAt = "timezone('utc', now())") {
  return `insert into public.sat_attempts (user_id, question_id, selected_answer, is_correct, answered_at)
values (${quote(userId)}, 'sat-probe-q1', ${quote(answer)}, true, ${answeredAt});`;
}

async function runUserDataTests() {
  installUserDataStubs();
  loadUserDataSql();
  userDataSql(`
    insert into public.sat_questions (
      id, section, domain, skill, skill_slug, difficulty, question_type,
      prompt, correct_answer, source_file
    ) values (
      'sat-probe-q1', 'math', 'Algebra', 'Linear equations', 'linear-equations', 1, 'mcq',
      'Probe', '"A"'::jsonb, 'probe.pdf'
    );
  `);
  console.log("mentor-db: loaded user-data SQL artifacts");

  await test("catalog tables and the class-code view are server-only", async () => {
    const grants = scalar(userDataSql(`
      select concat_ws(':',
        has_table_privilege('anon', 'public.universities', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('authenticated', 'public.universities', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('anon', 'public.university_departments', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('authenticated', 'public.university_departments', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('anon', 'public.program_admission_details', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('authenticated', 'public.program_admission_details', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('anon', 'public.program_degree_class_codes', 'select,insert,update,delete'),
        has_table_privilege('authenticated', 'public.program_degree_class_codes', 'select,insert,update,delete'),
        has_table_privilege('service_role', 'public.program_admission_details', 'select'),
        has_table_privilege('service_role', 'public.program_degree_class_codes', 'select'),
        (select count(*) from pg_policies
          where schemaname = 'public'
            and tablename in ('universities', 'university_departments', 'program_admission_details'))
      );
    `));
    assert(grants === "f:f:f:f:f:f:f:f:t:t:0", `unexpected catalog grants: ${grants}`);
    for (const relation of ["universities", "university_departments", "program_admission_details", "program_degree_class_codes"]) {
      assertFailure(
        userDataSql(asAnon(`select count(*) from public.${relation};`), { allowFailure: true }),
        "permission denied",
        `anon read of ${relation}`,
      );
      assertFailure(
        userDataSql(asUser("catalog-reader", `select count(*) from public.${relation};`), { allowFailure: true }),
        "permission denied",
        `authenticated read of ${relation}`,
      );
    }
    assertFailure(
      userDataSql(asAnon("update public.universities set name = 'x';"), { allowFailure: true }),
      "permission denied",
      "anon catalog write",
    );
    const serverRead = scalar(userDataSql(`
      set role service_role;
      select concat_ws(':',
        (select count(*) from public.program_admission_details),
        (select degree_class_codes from public.program_degree_class_codes where department_id = 10)
      );
    `));
    assert(serverRead === "1:LM-32", `service_role catalog read failed: ${serverRead}`);
  });

  await test("archived content tables are closed to client roles and keep their rows", async () => {
    const state = scalar(userDataSql(`
      select concat_ws(':',
        has_table_privilege('anon', 'public.community_links', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('authenticated', 'public.community_links', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('anon', 'public.scholarship_regions', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('authenticated', 'public.scholarship_regions', 'select,insert,update,delete,truncate,references,trigger'),
        (select count(*) from pg_policies where tablename in ('community_links', 'scholarship_regions')),
        (select count(*) from public.community_links) + (select count(*) from public.scholarship_regions),
        obj_description('public.scholarship_regions'::regclass, 'pg_class') like 'ARSIV%'
      );
    `));
    assert(state === "f:f:f:f:0:2:t", `archived tables are not closed: ${state}`);
    assertFailure(
      userDataSql(asAnon("select count(*) from public.scholarship_regions;"), { allowFailure: true }),
      "permission denied",
      "anon read of archived scholarship_regions",
    );
  });

  await test("new public tables start closed; helper functions pin search_path", async () => {
    const probe = scalar(userDataSql(`
      create table public.card4_default_probe (
        id bigint generated always as identity primary key,
        note text
      );
      select concat_ws(':',
        has_table_privilege('anon', 'public.card4_default_probe', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('authenticated', 'public.card4_default_probe', 'select,insert,update,delete,truncate,references,trigger'),
        has_sequence_privilege('anon', 'public.card4_default_probe_id_seq', 'usage,select,update'),
        has_sequence_privilege('authenticated', 'public.card4_default_probe_id_seq', 'usage,select,update'),
        has_table_privilege('service_role', 'public.card4_default_probe', 'select')
      );
      drop table public.card4_default_probe;
    `));
    assert(probe === "f:f:f:f:t", `new table default privileges are open: ${probe}`);
    const configs = scalar(userDataSql(`
      select string_agg(p.proname || '=' || array_to_string(coalesce(p.proconfig, '{}'), ','), ';' order by p.proname)
      from pg_proc p
      where p.pronamespace = 'public'::regnamespace
        and p.proname in (
          'requesting_user_id', 'set_updated_at', 'enforce_favorites_per_user_cap',
          'enforce_user_documents_per_user_cap', 'enforce_sat_attempts_daily_cap'
        );
    `));
    assert(
      configs === 'enforce_favorites_per_user_cap=search_path=""'
        + ';enforce_sat_attempts_daily_cap=search_path=""'
        + ';enforce_user_documents_per_user_cap=search_path=""'
        + ';requesting_user_id=search_path=""'
        + ';set_updated_at=search_path=""',
      `unexpected function search_path settings: ${configs}`,
    );
  });

  await test("user tables grant only the verbs the app uses", async () => {
    const grants = scalar(userDataSql(`
      select concat_ws(':',
        has_table_privilege('anon', 'public.favorites', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('anon', 'public.user_documents', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('anon', 'public.user_profiles', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('anon', 'public.sat_attempts', 'select,insert,update,delete,truncate,references,trigger'),
        has_table_privilege('authenticated', 'public.favorites', 'select'),
        has_table_privilege('authenticated', 'public.favorites', 'insert'),
        has_table_privilege('authenticated', 'public.favorites', 'delete'),
        has_table_privilege('authenticated', 'public.favorites', 'update,truncate,references,trigger'),
        has_table_privilege('authenticated', 'public.user_documents', 'select'),
        has_table_privilege('authenticated', 'public.user_documents', 'insert'),
        has_table_privilege('authenticated', 'public.user_documents', 'delete'),
        has_table_privilege('authenticated', 'public.user_documents', 'update,truncate,references,trigger'),
        has_table_privilege('authenticated', 'public.user_profiles', 'select'),
        has_table_privilege('authenticated', 'public.user_profiles', 'insert'),
        has_table_privilege('authenticated', 'public.user_profiles', 'update'),
        has_table_privilege('authenticated', 'public.user_profiles', 'delete'),
        has_table_privilege('authenticated', 'public.user_profiles', 'truncate,references,trigger'),
        has_table_privilege('authenticated', 'public.sat_attempts', 'update,delete,truncate,references,trigger')
      );
    `));
    assert(
      grants === "f:f:f:f:t:t:t:f:t:t:t:f:t:t:t:t:f:f",
      `unexpected user table grants: ${grants}`,
    );
    for (const table of ["favorites", "user_documents", "user_profiles", "sat_attempts"]) {
      assertFailure(
        userDataSql(asAnon(`select count(*) from public.${table};`), { allowFailure: true }),
        "permission denied",
        `anon read of ${table}`,
      );
    }
  });

  await test("favorites: owners only, numeric ids, at most 100 per account", async () => {
    userDataSql(asUser("fav-a", "insert into public.favorites (user_id, university_id) values ('fav-a', '1');"));
    assertFailure(
      userDataSql(asUser("fav-b", "insert into public.favorites (user_id, university_id) values ('fav-a', '2');"), { allowFailure: true }),
      "row-level security",
      "insert into another user's favorites",
    );
    const visibleToB = scalar(userDataSql(asUser("fav-b", "select count(*) from public.favorites where user_id = 'fav-a';")));
    assert(visibleToB === "0", `user B can read user A's favorites: ${visibleToB}`);
    userDataSql(asUser("fav-b", "delete from public.favorites where user_id = 'fav-a';"));
    assertFailure(
      userDataSql(asUser("fav-b", "update public.favorites set university_id = '9' where user_id = 'fav-a';"), { allowFailure: true }),
      "permission denied",
      "favorites update",
    );
    const stillThere = scalar(userDataSql("select count(*) from public.favorites where user_id = 'fav-a';"));
    assert(stillThere === "1", `user B changed user A's favorites: ${stillThere}`);

    for (const badId of ["abc", "1234567", "1; drop"]) {
      assertFailure(
        userDataSql(asUser("fav-a", `insert into public.favorites (user_id, university_id) values ('fav-a', ${quote(badId)});`), { allowFailure: true }),
        "favorites_university_id_format",
        `favorite university id ${badId}`,
      );
    }

    userDataSql(asUser("fav-a", `
      insert into public.favorites (user_id, university_id)
      select 'fav-a', g::text from generate_series(2, 100) as g;
    `));
    assertFailure(
      userDataSql(asUser("fav-a", "insert into public.favorites (user_id, university_id) values ('fav-a', '101');"), { allowFailure: true }),
      "favorite_limit_reached",
      "101st favorite",
    );
    userDataSql(asUser("fav-b", "insert into public.favorites (user_id, university_id) values ('fav-b', '101');"));
    const indexes = scalar(userDataSql(`
      select concat_ws(':',
        (select count(*) from pg_indexes where schemaname = 'public' and indexname = 'favorites_user_university_unique'),
        (select count(*) from pg_constraint where conname = 'favorites_user_id_university_id_key')
      );
    `));
    assert(indexes === "0:1", `favorites uniqueness should be one constraint, no duplicate index: ${indexes}`);
  });

  await test("user_documents: owners only, bounded rows, at most 30 per account", async () => {
    userDataSql(asUser("doc-a", documentRowSql("doc-a", "passport.pdf", "doc-a/1.pdf")));
    userDataSql(asUser("doc-a", documentRowSql("doc-a", "legacy.pdf", "doc-a/2.pdf", "null")));
    const failures = [
      [documentRowSql("doc-a", "stolen.pdf", "doc-b/1.pdf"), "user_documents_storage_path_owner"],
      [documentRowSql("doc-a", "x".repeat(256), "doc-a/3.pdf"), "user_documents_file_name_length"],
      [documentRowSql("doc-a", "long.pdf", `doc-a/${"x".repeat(300)}.pdf`), "user_documents_file_url_length"],
      [documentRowSql("doc-a", "secret.pdf", "doc-a/4.pdf", "'secret'"), "user_documents_category_check"],
    ];
    for (const [sql, expected] of failures) {
      assertFailure(userDataSql(asUser("doc-a", sql), { allowFailure: true }), expected, expected);
    }
    assertFailure(
      userDataSql(asUser("doc-b", documentRowSql("doc-a", "planted.pdf", "doc-a/5.pdf")), { allowFailure: true }),
      "row-level security",
      "insert into another user's documents",
    );
    const visibleToB = scalar(userDataSql(asUser("doc-b", "select count(*) from public.user_documents where user_id = 'doc-a';")));
    assert(visibleToB === "0", `user B can read user A's documents: ${visibleToB}`);
    userDataSql(asUser("doc-b", "delete from public.user_documents where user_id = 'doc-a';"));
    assertFailure(
      userDataSql(asUser("doc-b", "update public.user_documents set file_name = 'x' where user_id = 'doc-a';"), { allowFailure: true }),
      "permission denied",
      "user_documents update",
    );
    const stillThere = scalar(userDataSql("select count(*) from public.user_documents where user_id = 'doc-a';"));
    assert(stillThere === "2", `user B changed user A's documents: ${stillThere}`);

    userDataSql(asUser("doc-a", Array.from({ length: 28 }, (_, index) =>
      documentRowSql("doc-a", `file-${index}.pdf`, `doc-a/bulk-${index}.pdf`)).join("\n")));
    assertFailure(
      userDataSql(asUser("doc-a", documentRowSql("doc-a", "one-too-many.pdf", "doc-a/31.pdf")), { allowFailure: true }),
      "document_limit_reached",
      "31st document",
    );
  });

  await test("user_profiles: owners only, eight field keys, at most two", async () => {
    const upsert = (userId, fields) => `
      insert into public.user_profiles (user_id, level, fields)
      values (${quote(userId)}, 'master', ${fields})
      on conflict (user_id) do update set fields = excluded.fields, updated_at = timezone('utc', now());`;
    userDataSql(asUser("profile-a", upsert("profile-a", "array['engineering-tech']")));
    userDataSql(asUser("profile-a", upsert("profile-a", "array['engineering-tech', 'law-politics']")));
    for (const [fields, label] of [
      ["array['engineering-tech', 'law-politics', 'arts-fashion']", "three fields"],
      ["array['hacking']", "unknown field"],
      ["array[null]::text[]", "null field"],
    ]) {
      assertFailure(
        userDataSql(asUser("profile-a", upsert("profile-a", fields)), { allowFailure: true }),
        "user_profiles_fields_check",
        label,
      );
    }
    assertFailure(
      userDataSql(asUser("profile-b", upsert("profile-a", "array['arts-fashion']")), { allowFailure: true }),
      "row-level security",
      "profile upsert for another user",
    );
    const visibleToB = scalar(userDataSql(asUser("profile-b", "select count(*) from public.user_profiles where user_id = 'profile-a';")));
    assert(visibleToB === "0", `user B can read user A's profile: ${visibleToB}`);
    userDataSql(asUser("profile-b", `
      update public.user_profiles set fields = array['arts-fashion'] where user_id = 'profile-a';
      delete from public.user_profiles where user_id = 'profile-a';
    `));
    const stored = scalar(userDataSql("select array_to_string(fields, ',') from public.user_profiles where user_id = 'profile-a';"));
    assert(stored === "engineering-tech,law-politics", `user B changed user A's profile: ${stored}`);
  });

  await test("sat_attempts: owners only, short answers, 2,000 per 24 hours on server time", async () => {
    userDataSql(asUser("sat-a", satAttemptSql("sat-a", "A", "'2000-01-01T00:00:00Z'")));
    const stamped = scalar(userDataSql("select answered_at > now() - interval '5 minutes' from public.sat_attempts where user_id = 'sat-a';"));
    assert(stamped === "t", "answered_at must be stamped with server time");
    assertFailure(
      userDataSql(asUser("sat-a", satAttemptSql("sat-a", "9".repeat(33))), { allowFailure: true }),
      "sat_attempts_selected_answer_length",
      "33-character answer",
    );
    assertFailure(
      userDataSql(asUser("sat-b", satAttemptSql("sat-a", "B")), { allowFailure: true }),
      "row-level security",
      "attempt recorded for another user",
    );
    const visibleToB = scalar(userDataSql(asUser("sat-b", "select count(*) from public.sat_attempts where user_id = 'sat-a';")));
    assert(visibleToB === "0", `user B can read user A's attempts: ${visibleToB}`);

    userDataSql(asUser("sat-a", `
      insert into public.sat_attempts (user_id, question_id, selected_answer, is_correct)
      select 'sat-a', 'sat-probe-q1', 'A', true from generate_series(2, 2000);
    `));
    assertFailure(
      userDataSql(asUser("sat-a", satAttemptSql("sat-a", "A")), { allowFailure: true }),
      "sat_attempt_rate_limited",
      "2,001st attempt in 24 hours",
    );
    userDataSql(asUser("sat-b", satAttemptSql("sat-b", "C")));
    userDataSql("update public.sat_attempts set answered_at = answered_at - interval '25 hours' where user_id = 'sat-a';");
    userDataSql(asUser("sat-a", satAttemptSql("sat-a", "A")));
  });

  await test("storage buckets: private 5 MB documents, owner folders, 30 files; WebP figures", async () => {
    const buckets = scalar(userDataSql(`
      select string_agg(
        concat_ws('|', id, public, file_size_limit, array_to_string(allowed_mime_types, ',')),
        ';' order by id
      )
      from storage.buckets;
    `));
    assert(
      buckets === "documents|f|5242880|application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
        + ";sat-figures|t|524288|image/webp",
      `unexpected bucket settings: ${buckets}`,
    );
    userDataSql(asUser("obj-a", documentObjectSql("obj-a/1.pdf")));
    assertFailure(
      userDataSql(asUser("obj-a", documentObjectSql("obj-b/1.pdf")), { allowFailure: true }),
      "row-level security",
      "upload into another user's folder",
    );
    const visibleToB = scalar(userDataSql(asUser("obj-b", "select count(*) from storage.objects where name like 'obj-a/%';")));
    assert(visibleToB === "0", `user B can list user A's files: ${visibleToB}`);
    userDataSql(asUser("obj-b", `
      update storage.objects set name = 'obj-b/taken.pdf' where name = 'obj-a/1.pdf';
      delete from storage.objects where name = 'obj-a/1.pdf';
    `));
    const anonVisible = scalar(userDataSql(asAnon("select count(*) from storage.objects where bucket_id = 'documents';")));
    assert(anonVisible === "0", `anon can list documents: ${anonVisible}`);
    const stillThere = scalar(userDataSql("select count(*) from storage.objects where name = 'obj-a/1.pdf';"));
    assert(stillThere === "1", `user B changed user A's file: ${stillThere}`);

    userDataSql(asUser("obj-a", Array.from({ length: 29 }, (_, index) =>
      documentObjectSql(`obj-a/bulk-${index}.pdf`)).join("\n")));
    assertFailure(
      userDataSql(asUser("obj-a", documentObjectSql("obj-a/31.pdf")), { allowFailure: true }),
      "row-level security",
      "31st file",
    );
    userDataSql(asUser("obj-b", documentObjectSql("obj-b/1.pdf")));
  });

  await test("user-data SQL artifacts are rerunnable", async () => {
    loadUserDataSql();
    const state = scalar(userDataSql(`
      select concat_ws(':',
        has_table_privilege('anon', 'public.program_admission_details', 'select'),
        has_table_privilege('authenticated', 'public.favorites', 'update'),
        (select count(*) from public.favorites where user_id = 'fav-a'),
        (select count(*) from pg_indexes where indexname = 'favorites_user_university_unique')
      );
    `));
    assert(state === "f:f:100:0", `SQL rerun changed card 4 state: ${state}`);
  });
}

async function main() {
  console.log(`mentor-db: using PostgreSQL tools from ${postgresTools.source}`);
  port = await freePort();
  command(initdb, ["-D", dataDir, "-A", "trust", "-U", "postgres", "--no-locale"]);
  console.log("mentor-db: initialized temporary cluster");
  mkdirSync(socketDir);
  command(pgCtl, [
    "-D",
    dataDir,
    "-l",
    serverLog,
    "-o",
    `-F -h 127.0.0.1 -p ${port} -k ${socketDir}`,
    "-w",
    "start",
  ]);
  started = true;
  console.log(`mentor-db: started temporary cluster on port ${port}`);

  runSql(`
    create role anon nologin;
    create role authenticated nologin;
    create database mentor_legacy_data;
    create database mentor_legacy_empty;
  `);
  installSupabaseStubs("mentor_legacy_data");
  installSupabaseStubs("mentor_legacy_empty");
  runSql(legacySchemaSql({ withData: true }), { database: "mentor_legacy_data" });
  runSql(legacySchemaSql({ withData: false }), { database: "mentor_legacy_empty" });

  await test("data-bearing legacy upgrade stops without mutating legacy state", async () => {
    const deployment = loadProductionSql("mentor_legacy_data", { allowFailure: true });
    assertFailure(
      deployment,
      "legacy_mentor_idempotency_migration_required",
      "data-bearing legacy upgrade",
    );
    const state = scalar(runSql(`
      select concat_ws(':',
        (select count(*) from public.mentor_messages),
        exists (
          select 1 from pg_constraint
          where conrelid = 'public.mentor_messages'::regclass
            and conname = 'mentor_messages_client_nonce_key'
        ),
        to_regclass('public.mentor_rpc_idempotency') is null
      );
    `, { database: "mentor_legacy_data" }));
    assert(state === "1:t:t", `legacy failure changed data/constraint/ledger state: ${state}`);
  });

  await test("empty legacy schema upgrades automatically", async () => {
    loadProductionSql("mentor_legacy_empty");
    const state = scalar(runSql(`
      select concat_ws(':',
        (select count(*) from public.mentor_messages),
        exists (
          select 1 from pg_constraint
          where conrelid = 'public.mentor_messages'::regclass
            and conname = 'mentor_messages_client_nonce_key'
        ),
        to_regclass('public.mentor_rpc_idempotency') is not null
      );
    `, { database: "mentor_legacy_empty" }));
    assert(state === "0:f:t", `empty legacy upgrade state mismatch: ${state}`);
  });

  installSupabaseStubs("postgres");
  console.log("mentor-db: installed Supabase test stubs");
  loadProductionSql();
  console.log("mentor-db: loaded production SQL artifact");
  runSql(`
    create function public.mentor_test_gate()
    returns trigger
    language plpgsql
    as $$
    begin
      perform pg_advisory_xact_lock(TG_ARGV[0]::bigint);
      return new;
    end;
    $$;
    create trigger mentor_test_conversation_gate
      before insert on public.mentor_conversations
      for each row execute function public.mentor_test_gate('${conversationGate}');
    create trigger mentor_test_message_gate
      before insert on public.mentor_messages
      for each row execute function public.mentor_test_gate('${messageGate}');
    insert into public.mentor_staff (user_id, display_name, active)
    values ('staff-primary', 'Primary Staff', true);
  `);
  loadExpertLeadsSql();
  console.log(`mentor-db: PostgreSQL 16 temporary cluster ready on port ${port}`);

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

    const grants = scalar(runSql(`
      select concat_ws(':',
        has_table_privilege('authenticated', 'public.expert_leads', 'insert'),
        has_table_privilege('anon', 'public.expert_leads', 'insert')
      );
    `));
    assert(grants === "f:f", `unexpected expert lead insert grants: ${grants}`);

    const invalidPhone = runSql(`
      insert into public.expert_leads (
        submission_id, full_name, whatsapp_phone, study_level,
        field_of_interest, target_intake, help_request
      ) values (
        '11111111-1111-4111-8111-111111111112',
        'Invalid Phone', '05321234567', 'bachelor',
        'engineering-tech', '2027-2028', 'Need an application roadmap.'
      );
    `, { allowFailure: true });
    assertFailure(invalidPhone, "expert_leads_phone_check", "invalid expert phone");

    const invalidEnum = runSql(`
      insert into public.expert_leads (
        submission_id, full_name, whatsapp_phone, study_level,
        field_of_interest, target_intake, help_request
      ) values (
        '11111111-1111-4111-8111-111111111113',
        'Invalid Level', '+905321234567', 'doctorate',
        'engineering-tech', '2027-2028', 'Need an application roadmap.'
      );
    `, { allowFailure: true });
    assertFailure(invalidEnum, "expert_leads_study_level_check", "invalid expert level");

    const invalidIntake = runSql(`
      insert into public.expert_leads (
        submission_id, full_name, whatsapp_phone, study_level,
        field_of_interest, target_intake, help_request
      ) values (
        '11111111-1111-4111-8111-111111111114',
        'Invalid Intake', '+905321234567', 'bachelor',
        'engineering-tech', '2027-2029', 'Need an application roadmap.'
      );
    `, { allowFailure: true });
    assertFailure(
      invalidIntake,
      "expert_leads_target_intake_check",
      "non-consecutive expert intake",
    );

    const duplicateSubmission = runSql(`
      insert into public.expert_leads (
        submission_id, full_name, whatsapp_phone, study_level,
        field_of_interest, target_intake, help_request
      ) values (
        '11111111-1111-4111-8111-111111111111',
        'Duplicate Student', '+905321234567', 'bachelor',
        'engineering-tech', '2027-2028', 'Need an application roadmap.'
      );
    `, { allowFailure: true });
    assertFailure(
      duplicateSubmission,
      "expert_leads_submission_id_key",
      "duplicate expert submission",
    );

    const updatedAtBefore = scalar(runSql(`
      select updated_at
      from public.expert_leads
      where submission_id = '11111111-1111-4111-8111-111111111111';
    `));
    runSql("select pg_sleep(0.01);");
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
    assert(
      state === "contacted:WhatsApp message sent.",
      `unexpected expert lead state: ${state}`,
    );
    const updatedAtAdvanced = scalar(runSql(`
      select updated_at > ${quote(updatedAtBefore)}::timestamptz
      from public.expert_leads
      where submission_id = '11111111-1111-4111-8111-111111111111';
    `));
    assert(updatedAtAdvanced === "t", "expert updated_at did not advance");

    runSql(`
      insert into public.mentor_staff (user_id, display_name, active)
      values ('staff-inactive', 'Inactive Staff', false);
    `);
    const inactiveCount = scalar(runSql(asUser(
      "staff-inactive",
      "select count(*) from public.expert_leads;",
    )));
    assert(inactiveCount === "0", `inactive staff saw ${inactiveCount} expert leads`);
    const inactiveUpdate = scalar(runSql(asUser("staff-inactive", `
      update public.expert_leads
      set status = 'completed'
      where submission_id = '11111111-1111-4111-8111-111111111111'
      returning id;
    `)));
    assert(inactiveUpdate === "", "inactive staff updated an expert lead");
    const inactiveDelete = scalar(runSql(asUser("staff-inactive", `
      delete from public.expert_leads
      where submission_id = '11111111-1111-4111-8111-111111111111'
      returning id;
    `)));
    assert(inactiveDelete === "", "inactive staff deleted an expert lead");

    const activeDelete = scalar(runSql(asUser("staff-primary", `
      delete from public.expert_leads
      where submission_id = '11111111-1111-4111-8111-111111111111'
      returning id;
    `)));
    assert(activeDelete !== "", "active staff could not delete an expert lead");

    loadExpertLeadsSql();
  });

  await test("expert leads past 50 an hour are kept as suspected; the 151st is refused", async () => {
    const leadInsert = (submissionId, suffix) => `
      insert into public.expert_leads (
        submission_id, full_name, whatsapp_phone, study_level,
        field_of_interest, target_intake, help_request
      ) values (
        ${quote(submissionId)}, ${quote(`Cap Lead ${suffix}`)}, '+905321239999', 'bachelor',
        'undecided', 'undecided', ${quote(`Hourly cap request ${suffix}`)}
      )
      returning status;
    `;
    const recentLeads = () => Number(scalar(runSql(`
      select count(*) from public.expert_leads
      where created_at > timezone('utc', now()) - interval '1 hour';
    `)));
    const fillTo = (target, series) => {
      const missing = Math.max(0, target - recentLeads());
      runSql(`
        insert into public.expert_leads (
          submission_id, full_name, whatsapp_phone, study_level,
          field_of_interest, target_intake, help_request
        )
        select ('${series}-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
          'Cap Lead ' || g, '+90532123' || lpad(g::text, 4, '0'), 'bachelor',
          'undecided', 'undecided', 'Hourly cap request ' || g
        from generate_series(1, ${missing}) g;
      `);
    };

    fillTo(50, "b1000000");
    const fiftyFirst = scalar(runSql(leadInsert("b3000000-0000-4000-8000-000000000051", "soft")));
    assert(fiftyFirst === "suspected", `51st lead within an hour was stored as ${fiftyFirst}`);

    fillTo(150, "b2000000");
    const suspected = scalar(runSql(`
      select count(*) from public.expert_leads
      where created_at > timezone('utc', now()) - interval '1 hour'
        and status = 'suspected';
    `));
    assert(suspected === "100", `expected leads 51-150 to be suspected, got ${suspected}`);

    const limited = runSql(leadInsert("b3000000-0000-4000-8000-000000000151", "overflow"), { allowFailure: true });
    assertFailure(limited, "expert_lead_rate_limited", "151st expert lead within an hour");
    const retry = runSql(leadInsert("b1000000-0000-4000-8000-000000000001", "retry"), { allowFailure: true });
    assertFailure(retry, "expert_leads_submission_id_key", "same-submission retry during the cap");

    const promoted = scalar(runSql(asUser("staff-primary", `
      update public.expert_leads set status = 'new'
      where submission_id = 'b3000000-0000-4000-8000-000000000051'
      returning status;
    `)));
    assert(promoted === "new", "active staff could not move a suspected lead back to new");
    const unknownStatus = runSql(
      "update public.expert_leads set status = 'spam' where submission_id = 'b3000000-0000-4000-8000-000000000051';",
      { allowFailure: true },
    );
    assertFailure(unknownStatus, "expert_leads_status_check", "unknown expert lead status");

    runSql("update public.expert_leads set created_at = created_at - interval '2 hours';");
    const afterWindow = scalar(runSql(leadInsert("b3000000-0000-4000-8000-000000000152", "after window")));
    assert(afterWindow === "new", `a lead after the window was stored as ${afterWindow}`);
  });

  await test("different-nonce concurrent starts reject the losing request", async () => {
    const results = await runConcurrentBehindGate(conversationGate, [
      {
        userId: "student-start-race",
        sql: functionCall("start_volunteer_conversation", [
          quote("other"),
          quote("Race Student"),
          quote("First concurrent body"),
          quote("10000000-0000-4000-8000-000000000001"),
        ]),
      },
      {
        userId: "student-start-race",
        sql: functionCall("start_volunteer_conversation", [
          quote("other"),
          quote("Race Student"),
          quote("Second concurrent body"),
          quote("10000000-0000-4000-8000-000000000002"),
        ]),
      },
    ]);
    const successes = results.filter((result) => result.status === 0);
    const failures = results.filter((result) => result.status !== 0);
    assert(successes.length === 1, `expected one success, got ${successes.length}`);
    assert(failures.length === 1, `expected one explicit failure, got ${failures.length}`);
    assertFailure(failures[0], "open_conversation_exists", "losing concurrent start");
    const counts = scalar(runSql(`
      select count(*) || ':' || (select count(*) from public.mentor_messages where conversation_id = c.id)
      from public.mentor_conversations c
      where user_id = 'student-start-race'
      group by c.id;
    `));
    assert(counts === "1:1", `concurrent starts lost or duplicated data: ${counts}`);
  });

  await test("same-nonce concurrent starts return one conversation and one message", async () => {
    const nonce = quote("20000000-0000-4000-8000-000000000001");
    const call = functionCall("start_volunteer_conversation", [
      quote("student-life"),
      quote("Retry Student"),
      quote("Retry-safe initial body"),
      nonce,
    ]);
    const results = await runConcurrentBehindGate(conversationGate, [
      { userId: "student-start-retry", sql: call },
      { userId: "student-start-retry", sql: call },
    ]);
    const ids = results.map((result) => assertSuccess(result, "same-nonce start"));
    assert(ids[0] === ids[1], `same-nonce starts returned different IDs: ${ids.join(", ")}`);
    const count = scalar(runSql(`select count(*) from public.mentor_messages where conversation_id = ${quote(ids[0])};`));
    assert(count === "1", `same-nonce starts created ${count} messages`);
  });

  const sharedStartNonce = "30000000-0000-4000-8000-000000000001";
  const callerOneConversation = scalar(runSql(asUser("student-caller-one", functionCall(
    "start_volunteer_conversation",
    [quote("other"), quote("Caller One"), quote("Caller one body"), quote(sharedStartNonce)],
  ))));
  const callerTwoConversation = scalar(runSql(asUser("student-caller-two", functionCall(
    "start_volunteer_conversation",
    [quote("other"), quote("Caller Two"), quote("Caller two body"), quote(sharedStartNonce)],
  ))));

  await test("idempotency keys are bound to caller and operation", async () => {
    assert(callerOneConversation !== callerTwoConversation, "two callers shared a conversation result");
    const messageId = scalar(runSql(asUser("student-caller-one", functionCall(
      "send_student_mentor_message",
      [quote(callerOneConversation), quote("Same nonce, different operation"), quote(sharedStartNonce)],
    ))));
    assert(messageId && messageId !== callerOneConversation, "cross-operation nonce returned an unrelated result");
  });

  await test("owner and active staff RLS reads are isolated", async () => {
    const ownerConversationCount = scalar(runSql(asUser(
      "student-caller-one",
      "select count(*) from public.mentor_conversations;",
    )));
    const ownerMessageCount = scalar(runSql(asUser(
      "student-caller-one",
      "select count(*) from public.mentor_messages;",
    )));
    const staffConversationCount = Number(scalar(runSql(asUser(
      "staff-primary",
      "select count(*) from public.mentor_conversations;",
    ))));
    const staffMessageCount = Number(scalar(runSql(asUser(
      "staff-primary",
      "select count(*) from public.mentor_messages;",
    ))));
    const totalConversationCount = Number(scalar(runSql("select count(*) from public.mentor_conversations;")));
    const totalMessageCount = Number(scalar(runSql("select count(*) from public.mentor_messages;")));
    assert(ownerConversationCount === "1", `owner saw ${ownerConversationCount} conversations`);
    assert(ownerMessageCount === "2", `owner saw ${ownerMessageCount} messages`);
    assert(staffConversationCount === totalConversationCount, "active staff could not read the complete queue");
    assert(staffMessageCount === totalMessageCount, "active staff could not read the complete message history");
    const anonRead = runSql("set role anon; select * from public.mentor_conversations;", { allowFailure: true });
    assertFailure(anonRead, "permission denied", "anonymous conversation read");
  });

  await test("private Realtime topics admit only their owner or the active operator", async () => {
    const studentOne = "student-caller-one";
    const studentTwo = "student-caller-two";
    const staff = "staff-primary";
    const allowed = [
      [studentOne, `mentor-conversations:${studentOne}`],
      [studentOne, `mentor-messages:${callerOneConversation}`],
      [studentTwo, `mentor-messages:${callerTwoConversation}`],
      [staff, `mentor-operator-conversations:${staff}:all:1:0`],
      [staff, `mentor-operator-messages:${staff}:${callerOneConversation}:1:0`],
    ];
    const denied = [
      [studentOne, `mentor-conversations:${studentTwo}`],
      [studentOne, `mentor-messages:${callerTwoConversation}`],
      [studentOne, `mentor-operator-conversations:${studentOne}:all:1:0`],
      [studentOne, `mentor-operator-messages:${studentOne}:${callerOneConversation}:1:0`],
      [studentOne, "mentor-conversations:"],
      [staff, `mentor-operator-conversations:${studentOne}:all:1:0`],
      [staff, `mentor-conversations:${studentOne}`],
      [null, `mentor-conversations:${studentOne}`],
      [null, `mentor-messages:${callerOneConversation}`],
      [null, `mentor-operator-conversations:${staff}:all:1:0`],
    ];
    for (const [userId, topic] of allowed) {
      assert(canJoinRealtimeTopic(userId, topic), `${userId} could not join ${topic}`);
    }
    for (const [userId, topic] of denied) {
      assert(!canJoinRealtimeTopic(userId, topic), `${userId ?? "anon"} joined ${topic}`);
    }

    const studentBroadcast = runSql(asUser(studentOne, `
      select set_config('realtime.topic', ${quote(`mentor-conversations:${studentOne}`)}, false);
      insert into realtime.messages (topic, extension, private)
      values (${quote(`mentor-conversations:${studentOne}`)}, 'broadcast', true);
    `), { allowFailure: true });
    assertFailure(studentBroadcast, "row-level security", "student broadcast into own topic");
    const anonBroadcast = runSql(`
      set role anon;
      insert into realtime.messages (topic, extension, private)
      values ('mentor-conversations:any', 'broadcast', true);
    `, { allowFailure: true });
    assertFailure(anonBroadcast, "permission denied", "anonymous broadcast");
    const grants = scalar(runSql(`
      select concat_ws(':',
        has_table_privilege('anon', 'realtime.messages', 'insert'),
        has_table_privilege('anon', 'realtime.messages', 'update'),
        (select count(*) from pg_policies
          where schemaname = 'realtime' and tablename = 'messages' and cmd <> 'SELECT')
      );
    `));
    assert(grants === "f:f:0", `realtime write surface is open: ${grants}`);
  });

  await test("student nonce reuse against a different target is rejected", async () => {
    const first = scalar(runSql(asUser("student-target-reuse", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Target Student"), quote("First conversation"), quote("40000000-0000-4000-8000-000000000001")],
    ))));
    const reusedNonce = quote("40000000-0000-4000-8000-000000000002");
    runSql(asUser("student-target-reuse", functionCall(
      "send_student_mentor_message",
      [quote(first), quote("Bound to first target"), reusedNonce],
    )));
    runSql(asUser("student-target-reuse", functionCall(
      "close_volunteer_conversation",
      [quote(first)],
    )));
    const second = scalar(runSql(asUser("student-target-reuse", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Target Student"), quote("Second conversation"), quote("40000000-0000-4000-8000-000000000003")],
    ))));
    const conflict = runSql(asUser("student-target-reuse", functionCall(
      "send_student_mentor_message",
      [quote(second), quote("Hostile target reuse"), reusedNonce],
    )), { allowFailure: true });
    assertFailure(conflict, "idempotency_conflict", "student target reuse");
  });

  await test("staff nonce reuse against a different target is rejected", async () => {
    const nonce = quote("50000000-0000-4000-8000-000000000001");
    runSql(asUser("staff-primary", functionCall(
      "send_staff_mentor_message",
      [quote(callerOneConversation), quote("Staff first target"), nonce],
    )));
    const conflict = runSql(asUser("staff-primary", functionCall(
      "send_staff_mentor_message",
      [quote(callerTwoConversation), quote("Staff hostile target reuse"), nonce],
    )), { allowFailure: true });
    assertFailure(conflict, "idempotency_conflict", "staff target reuse");
  });

  await test("same-nonce concurrent student sends return the original message", async () => {
    const conversation = scalar(runSql(asUser("student-send-retry", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Student Send Retry"), quote("Initial"), quote("60000000-0000-4000-8000-000000000001")],
    ))));
    const call = functionCall("send_student_mentor_message", [
      quote(conversation),
      quote("Concurrent student retry"),
      quote("60000000-0000-4000-8000-000000000002"),
    ]);
    const results = await runConcurrentBehindGate(messageGate, [
      { userId: "student-send-retry", sql: call },
      { userId: "student-send-retry", sql: call },
    ]);
    const ids = results.map((result) => assertSuccess(result, "same-nonce student send"));
    assert(ids[0] === ids[1], `student retry returned different IDs: ${ids.join(", ")}`);
    const count = scalar(runSql(`select count(*) from public.mentor_messages where body = 'Concurrent student retry';`));
    assert(count === "1", `student retry created ${count} messages`);
  });

  await test("same-nonce concurrent staff sends return the original message", async () => {
    const conversation = scalar(runSql(asUser("student-staff-retry", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Staff Send Retry"), quote("Initial"), quote("70000000-0000-4000-8000-000000000001")],
    ))));
    const call = functionCall("send_staff_mentor_message", [
      quote(conversation),
      quote("Concurrent staff retry"),
      quote("70000000-0000-4000-8000-000000000002"),
    ]);
    const results = await runConcurrentBehindGate(messageGate, [
      { userId: "staff-primary", sql: call },
      { userId: "staff-primary", sql: call },
    ]);
    const ids = results.map((result) => assertSuccess(result, "same-nonce staff send"));
    assert(ids[0] === ids[1], `staff retry returned different IDs: ${ids.join(", ")}`);
    const state = scalar(runSql(`
      select count(*) || ':' || max(conversation.status)
      from public.mentor_messages message
      join public.mentor_conversations conversation on conversation.id = message.conversation_id
      where message.body = 'Concurrent staff retry';
    `));
    assert(state === "1:waiting_for_student", `staff retry count/status mismatch: ${state}`);
  });

  await test("status transitions and both close paths remain valid", async () => {
    const conversation = scalar(runSql(asUser("student-status", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Status Student"), quote("Initial status"), quote("80000000-0000-4000-8000-000000000001")],
    ))));
    assert(scalar(runSql(`select status from public.mentor_conversations where id = ${quote(conversation)};`)) === "waiting_for_team", "start status mismatch");
    runSql(asUser("staff-primary", functionCall("send_staff_mentor_message", [
      quote(conversation), quote("Staff status"), quote("80000000-0000-4000-8000-000000000002"),
    ])));
    assert(scalar(runSql(`select status from public.mentor_conversations where id = ${quote(conversation)};`)) === "waiting_for_student", "staff status mismatch");
    runSql(asUser("student-status", functionCall("send_student_mentor_message", [
      quote(conversation), quote("Student status"), quote("80000000-0000-4000-8000-000000000003"),
    ])));
    assert(scalar(runSql(`select status from public.mentor_conversations where id = ${quote(conversation)};`)) === "waiting_for_team", "student status mismatch");
    runSql(asUser("staff-primary", functionCall("close_volunteer_conversation", [quote(conversation)])));
    assert(scalar(runSql(`select status || ':' || closed_by from public.mentor_conversations where id = ${quote(conversation)};`)) === "closed:staff", "staff close mismatch");

    const studentClose = scalar(runSql(asUser("student-close", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Close Student"), quote("Close me"), quote("80000000-0000-4000-8000-000000000004")],
    ))));
    runSql(asUser("student-close", functionCall("close_volunteer_conversation", [quote(studentClose)])));
    assert(scalar(runSql(`select status || ':' || closed_by from public.mentor_conversations where id = ${quote(studentClose)};`)) === "closed:student", "student close mismatch");
  });

  await test("students cannot close another student's conversation", async () => {
    const conversation = scalar(runSql(asUser("student-close-owner", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Close Owner"), quote("Owner only"), quote("85000000-0000-4000-8000-000000000001")],
    ))));
    const denied = runSql(asUser("student-close-attacker", functionCall(
      "close_volunteer_conversation",
      [quote(conversation)],
    )), { allowFailure: true });
    assertFailure(denied, "conversation_not_found", "cross-owner close");
    assert(
      scalar(runSql(`select status from public.mentor_conversations where id = ${quote(conversation)};`)) === "waiting_for_team",
      "cross-owner close changed conversation state",
    );
  });

  await test("NULL topic and body inputs return domain errors", async () => {
    const nullTopic = runSql(asUser("student-null", functionCall(
      "start_volunteer_conversation",
      ["null", quote("Null Student"), quote("Body"), quote("90000000-0000-4000-8000-000000000001")],
    )), { allowFailure: true });
    assertFailure(nullTopic, "invalid_topic", "NULL topic");
    const nullStartBody = runSql(asUser("student-null", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Null Student"), "null", quote("90000000-0000-4000-8000-000000000002")],
    )), { allowFailure: true });
    assertFailure(nullStartBody, "invalid_message_length", "NULL start body");
    const conversation = scalar(runSql(asUser("student-null", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Null Student"), quote("Valid body"), quote("90000000-0000-4000-8000-000000000003")],
    ))));
    const nullStudentBody = runSql(asUser("student-null", functionCall(
      "send_student_mentor_message",
      [quote(conversation), "null", quote("90000000-0000-4000-8000-000000000004")],
    )), { allowFailure: true });
    assertFailure(nullStudentBody, "invalid_message_length", "NULL student body");
    const nullStaffBody = runSql(asUser("staff-primary", functionCall(
      "send_staff_mentor_message",
      [quote(conversation), "null", quote("90000000-0000-4000-8000-000000000005")],
    )), { allowFailure: true });
    assertFailure(nullStaffBody, "invalid_message_length", "NULL staff body");
  });

  await test("student messages are capped at 20 per 10 minutes; retries and staff are exempt", async () => {
    const conversation = scalar(runSql(asUser("student-rate", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Rate Student"), quote("Rate message 0"), quote("a1000000-0000-4000-8000-000000000000")],
    ))));
    runSql(asUser("student-rate", `
      select public.send_student_mentor_message(${quote(conversation)}, 'Rate message ' || g, ('a1000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid)
      from generate_series(1, 19) g;
    `));
    const limited = runSql(asUser("student-rate", functionCall(
      "send_student_mentor_message",
      [quote(conversation), quote("Rate message 20"), quote("a1000000-0000-4000-8000-000000000020")],
    )), { allowFailure: true });
    assertFailure(limited, "message_rate_limited", "21st student message in 10 minutes");
    const retryId = scalar(runSql(asUser("student-rate", functionCall(
      "send_student_mentor_message",
      [quote(conversation), quote("Rate message 5"), quote("a1000000-0000-4000-8000-000000000005")],
    ))));
    const originalId = scalar(runSql(`select id from public.mentor_messages where client_nonce = 'a1000000-0000-4000-8000-000000000005';`));
    assert(retryId === originalId, "same-nonce retry past the limit must return the original message");
    runSql(asUser("staff-primary", functionCall(
      "send_staff_mentor_message",
      [quote(conversation), quote("Staff reply past student limit"), quote("a1000000-0000-4000-8000-000000000099")],
    )));
    runSql(`update public.mentor_messages set created_at = created_at - interval '11 minutes' where conversation_id = ${quote(conversation)};`);
    runSql(asUser("student-rate", functionCall(
      "send_student_mentor_message",
      [quote(conversation), quote("Rate message after window"), quote("a1000000-0000-4000-8000-000000000021")],
    )));
    const studentCount = scalar(runSql(`select count(*) from public.mentor_messages where conversation_id = ${quote(conversation)} and sender_kind = 'student';`));
    assert(studentCount === "21", `unexpected student message count after window: ${studentCount}`);
  });

  await test("students can start at most 5 conversations per 24 hours", async () => {
    const started = [];
    for (let index = 1; index <= 5; index += 1) {
      const conversation = scalar(runSql(asUser("student-conversation-rate", functionCall(
        "start_volunteer_conversation",
        [quote("other"), quote("Conversation Rate"), quote(`Conversation ${index}`), quote(`a2000000-0000-4000-8000-00000000000${index}`)],
      ))));
      runSql(asUser("student-conversation-rate", functionCall("close_volunteer_conversation", [quote(conversation)])));
      started.push(conversation);
    }
    const limited = runSql(asUser("student-conversation-rate", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Conversation Rate"), quote("Conversation 6"), quote("a2000000-0000-4000-8000-000000000006")],
    )), { allowFailure: true });
    assertFailure(limited, "conversation_rate_limited", "6th conversation in 24 hours");
    const retry = scalar(runSql(asUser("student-conversation-rate", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Conversation Rate"), quote("Conversation 5"), quote("a2000000-0000-4000-8000-000000000005")],
    ))));
    assert(retry === started[4], "same-nonce start retry past the limit must return the original conversation");
    runSql(`update public.mentor_conversations set created_at = created_at - interval '25 hours' where user_id = 'student-conversation-rate';`);
    runSql(asUser("student-conversation-rate", functionCall(
      "start_volunteer_conversation",
      [quote("other"), quote("Conversation Rate"), quote("Conversation after window"), quote("a2000000-0000-4000-8000-000000000007")],
    )));
  });

  await test("grants and private ledger enforce the RPC boundary", async () => {
    const grants = scalar(runSql(`
      select concat_ws(':',
        has_table_privilege('authenticated', 'public.mentor_conversations', 'select'),
        has_table_privilege('authenticated', 'public.mentor_conversations', 'insert,update,delete'),
        has_table_privilege('authenticated', 'public.mentor_messages', 'select'),
        has_table_privilege('authenticated', 'public.mentor_staff', 'select'),
        has_table_privilege('authenticated', 'public.mentor_rpc_idempotency', 'select'),
        has_function_privilege('authenticated', 'public.send_student_mentor_message(uuid,text,uuid)', 'execute'),
        has_function_privilege('anon', 'public.send_student_mentor_message(uuid,text,uuid)', 'execute')
      );
    `));
    assert(grants === "t:f:t:f:f:t:f", `unexpected grants: ${grants}`);
    const ledgerRead = runSql(asUser("student-caller-one", "select * from public.mentor_rpc_idempotency;"), { allowFailure: true });
    assertFailure(ledgerRead, "permission denied", "private idempotency ledger read");
    const published = scalar(runSql(`
      select count(*) from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'mentor_rpc_idempotency';
    `));
    assert(published === "0", "private idempotency ledger was published to Realtime");
  });

  await test("at most one mentor staff row can be active", async () => {
    const secondActive = runSql(`
      insert into public.mentor_staff (user_id, display_name, active)
      values ('staff-secondary', 'Secondary Staff', true);
    `, { allowFailure: true });
    assertFailure(secondActive, "mentor_staff_one_active_operator", "second active staff insert");
    runSql(`
      insert into public.mentor_staff (user_id, display_name, active)
      values ('staff-secondary', 'Secondary Staff', false);
      begin;
      update public.mentor_staff set active = false where active = true;
      update public.mentor_staff set active = true where user_id = 'staff-secondary';
      commit;
    `);
    const activeCount = scalar(runSql("select count(*) from public.mentor_staff where active = true;"));
    assert(activeCount === "1", `operator rotation left ${activeCount} active staff rows`);
  });

  await test("production SQL artifact is rerunnable", async () => {
    loadProductionSql();
    loadExpertLeadsSql();
    const activeCount = scalar(runSql("select count(*) from public.mentor_staff where active = true;"));
    assert(activeCount === "1", `SQL rerun changed the active staff invariant: ${activeCount}`);
  });

  await runUserDataTests();

  console.log("mentor-db: PASS");
}

process.once("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.once("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

try {
  await main();
} finally {
  cleanup();
}
