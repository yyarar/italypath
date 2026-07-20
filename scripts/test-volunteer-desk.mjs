import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "mentor", "volunteerDeskState.ts");

async function importStateHelpers() {
  const source = await readFile(sourcePath, "utf8").catch((error) => {
    assert.fail(`volunteer desk state helpers must exist: ${error.message}`);
  });
  const tempDir = await mkdtemp(path.join(tmpdir(), "volunteer-desk-"));
  const tempFile = path.join(tempDir, "volunteerDeskState.mjs");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  await writeFile(tempFile, compiled, "utf8");
  const loadedModule = await import(`file://${tempFile}`);
  await rm(tempDir, { recursive: true, force: true });
  return loadedModule;
}

const {
  applyAuthoritativeConversationSnapshot,
  applyAuthoritativeMessageSnapshot,
  coalesceOperation,
  createSerializedReconciliationQueue,
  createOwnerScopedNonceRegistry,
  deriveMentorRealtimeState,
  transitionCommittedAuth,
  transitionMessageScope,
} = await importStateHelpers();

const oldConversation = {
  id: "conversation-1",
  updated_at: "2026-07-20T10:00:00.000Z",
  last_message_at: "2026-07-20T10:00:00.000Z",
  status: "waiting_for_team",
};
const realtimeConversation = {
  ...oldConversation,
  updated_at: "2026-07-20T10:01:00.000Z",
  last_message_at: "2026-07-20T10:01:00.000Z",
  status: "waiting_for_student",
};

assert.deepEqual(
  applyAuthoritativeConversationSnapshot(
    [oldConversation],
    [{ version: 2, type: "UPDATE", row: realtimeConversation }],
  ),
  [realtimeConversation],
  "a post-query Realtime update must overlay the authoritative conversation snapshot",
);

const queryMessage = {
  id: "message-1",
  conversation_id: "conversation-1",
  created_at: "2026-07-20T10:00:00.000Z",
};
const realtimeMessage = {
  id: "message-2",
  conversation_id: "conversation-1",
  created_at: "2026-07-20T10:01:00.000Z",
};

assert.deepEqual(
  applyAuthoritativeMessageSnapshot(
    [queryMessage],
    [{ version: 2, row: realtimeMessage }],
    (left, right) => [...left, ...right].sort((a, b) => a.id.localeCompare(b.id)),
  ),
  [queryMessage, realtimeMessage],
  "a late message query must merge rows received from Realtime after the request started",
);

assert.deepEqual(
  applyAuthoritativeConversationSnapshot(
    [oldConversation],
    [{ version: 2, type: "DELETE", id: oldConversation.id }],
  ),
  [],
  "a post-query delete must remove a row from the authoritative snapshot",
);

assert.deepEqual(
  applyAuthoritativeConversationSnapshot([], []),
  [],
  "rows absent from an authoritative conversation snapshot must disappear",
);

const newerSnapshotConversation = {
  ...realtimeConversation,
  updated_at: "2026-07-20T10:02:00.000Z",
  last_message_at: "2026-07-20T10:02:00.000Z",
};
assert.deepEqual(
  applyAuthoritativeConversationSnapshot(
    [newerSnapshotConversation],
    [{ version: 3, type: "UPDATE", row: realtimeConversation }],
  ),
  [newerSnapshotConversation],
  "a queued older Realtime update must not regress a newer server snapshot",
);
assert.deepEqual(
  applyAuthoritativeConversationSnapshot([], [{ version: 4, type: "INSERT", row: realtimeConversation }]),
  [realtimeConversation],
  "a post-start insert must reintroduce a row absent from the query snapshot",
);

const threadA = transitionMessageScope(
  { conversationId: null, epoch: 0, messages: [] },
  "conversation-a",
);
const threadB = transitionMessageScope(
  { ...threadA, messages: [queryMessage] },
  "conversation-b",
);
assert.deepEqual(
  threadB,
  { conversationId: "conversation-b", epoch: 2, messages: [] },
  "switching A to B must clear the message buffer instead of mixing threads",
);

const registry = new Map();
let attempts = 0;
const shared = coalesceOperation(registry, "conversation", async () => {
  attempts += 1;
  return "ok";
});
assert.equal(
  coalesceOperation(registry, "conversation", async () => "unexpected"),
  shared,
  "same-scope reconciliation must share one in-flight promise",
);
assert.equal(await shared, "ok");
assert.equal(attempts, 1);
assert.equal(registry.size, 0, "a completed reconciliation must leave the registry clear");

const rejected = coalesceOperation(registry, "failed", async () => {
  throw new Error("query_failed");
});
await assert.rejects(rejected, /query_failed/);
assert.equal(registry.size, 0, "a failed reconciliation must reject and allow a retry");

const reconciliationQueue = createSerializedReconciliationQueue();
const queueOrder = [];
let releaseFirst;
const firstGate = new Promise((resolve) => {
  releaseFirst = resolve;
});
const firstForcedRead = reconciliationQueue.enqueue(async () => {
  queueOrder.push("first-start");
  await firstGate;
  queueOrder.push("first-finish");
  return "first-authoritative";
});
const secondForcedRead = reconciliationQueue.enqueue(async () => {
  queueOrder.push("second-start");
  queueOrder.push("second-finish");
  return "second-authoritative";
});
await Promise.resolve();
assert.deepEqual(queueOrder, ["first-start"], "overlapping forced reads must serialize");
releaseFirst();
assert.equal(await firstForcedRead, "first-authoritative");
assert.equal(await secondForcedRead, "second-authoritative");
assert.deepEqual(
  queueOrder,
  ["first-start", "first-finish", "second-start", "second-finish"],
  "two successful forced reconciliation callers must both finish without invalidating each other",
);
await assert.rejects(
  reconciliationQueue.enqueue(async () => {
    throw new Error("authoritative_query_failed");
  }),
  /authoritative_query_failed/,
);
assert.equal(
  await reconciliationQueue.enqueue(async () => "retry-authoritative"),
  "retry-authoritative",
  "a failed queued read must not poison a later forced reconciliation",
);

const ownerOperations = createOwnerScopedNonceRegistry();
const ownerAStart = ownerOperations.getOrCreate("owner-a", "topic\u0000body", () => "nonce-a");
ownerAStart.promise = Promise.resolve();
ownerOperations.releasePromiseIfSame("owner-a", "topic\u0000body", ownerAStart);
assert.equal(
  ownerOperations.getOrCreate("owner-a", "topic\u0000body", () => "unexpected").nonce,
  "nonce-a",
  "a stale generation release must preserve owner A's retry nonce",
);
assert.equal(
  ownerOperations.getOrCreate("owner-b", "topic\u0000body", () => "nonce-b").nonce,
  "nonce-b",
  "owner B must receive an independent nonce for the same draft key",
);
ownerOperations.deleteIfSame("owner-a", "topic\u0000body", ownerAStart);
assert.equal(
  ownerOperations.get("owner-a", "topic\u0000body"),
  undefined,
  "only owner A's successful reconciliation may remove owner A's entry",
);
assert.equal(
  ownerOperations.get("owner-b", "topic\u0000body")?.nonce,
  "nonce-b",
  "removing owner A's entry must not affect owner B",
);

const ownerAReady = { hasCommittedOwner: true, ownerId: "owner-a", ready: true };
const unresolvedAuth = transitionCommittedAuth(ownerAReady, undefined);
assert.deepEqual(
  unresolvedAuth,
  { hasCommittedOwner: true, ownerId: "owner-a", ready: false, commitOwner: false },
  "owner A to unresolved Clerk state must close the auth gate without changing owner",
);
assert.deepEqual(
  transitionCommittedAuth(unresolvedAuth, "owner-a"),
  { hasCommittedOwner: true, ownerId: "owner-a", ready: true, commitOwner: false },
  "same-owner Clerk resolution must restore readiness without a new identity generation",
);
assert.equal(
  transitionCommittedAuth(unresolvedAuth, "owner-b").commitOwner,
  true,
  "a different resolved owner must still commit a new isolated identity",
);
const unresolvedRegistry = createOwnerScopedNonceRegistry();
const unresolvedOwnerOperation = unresolvedRegistry.getOrCreate(
  "owner-a",
  "retry-key",
  () => "nonce-survives-unresolved",
);
transitionCommittedAuth(ownerAReady, undefined);
transitionCommittedAuth(unresolvedAuth, "owner-a");
assert.equal(
  unresolvedRegistry.getOrCreate("owner-a", "retry-key", () => "unexpected").nonce,
  unresolvedOwnerOperation.nonce,
  "unresolved auth must not discard owner A's pending retry nonce",
);

assert.equal(
  deriveMentorRealtimeState(true, true, "connected", "disconnected"),
  "disconnected",
  "a connected conversation channel must not mask a disconnected selected-message channel",
);

console.log("volunteer desk lifecycle checks passed");
