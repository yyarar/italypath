import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

const pgBin = process.env.POSTGRES_BIN ?? "/opt/homebrew/opt/postgresql@16/bin";
const initdb = join(pgBin, "initdb");
const pgCtl = join(pgBin, "pg_ctl");
const psql = join(pgBin, "psql");
const clusterRoot = mkdtempSync(join(tmpdir(), "italypath-mentor-pg-"));
const dataDir = join(clusterRoot, "data");
const socketDir = join(clusterRoot, "socket");
const serverLog = join(clusterRoot, "postgres.log");
const productionSql = resolve("supabase/volunteer_mentor.sql");
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

function psqlArgs() {
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
    "postgres",
  ];
}

function runSql(sql, { allowFailure = false } = {}) {
  return command(psql, psqlArgs(), {
    input: sql,
    allowFailure,
  });
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

async function main() {
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
  `);
  console.log("mentor-db: installed Supabase test stubs");
  command(psql, [...psqlArgs(), "-f", productionSql]);
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
  console.log(`mentor-db: PostgreSQL 16 temporary cluster ready on port ${port}`);

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
    command(psql, [...psqlArgs(), "-f", productionSql]);
    const activeCount = scalar(runSql("select count(*) from public.mentor_staff where active = true;"));
    assert(activeCount === "1", `SQL rerun changed the active staff invariant: ${activeCount}`);
  });

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
