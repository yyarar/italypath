import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const helperPath = path.join(root, "lib", "mentor", "operatorInboxState.ts");
const controllerPath = path.join(
  root,
  "lib",
  "mentor",
  "operatorInboxController.ts",
);
const sharedStatePath = path.join(root, "lib", "mentor", "volunteerDeskState.ts");

async function importHelpers() {
  const [helperSource, controllerSource, sharedStateSource] = await Promise.all([
    readFile(helperPath, "utf8"),
    readFile(controllerPath, "utf8"),
    readFile(sharedStatePath, "utf8"),
  ]);
  const tempDir = await mkdtemp(path.join(tmpdir(), "mentor-operator-"));
  const compilerOptions = {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
  };
  const compiledSharedState = ts.transpileModule(sharedStateSource, {
    compilerOptions,
  }).outputText;
  const compiledHelpers = ts
    .transpileModule(helperSource, { compilerOptions })
    .outputText.replace(
      'from "@/lib/mentor/volunteerDeskState"',
      'from "./volunteerDeskState.mjs"',
    );
  const compiledController = ts.transpileModule(controllerSource, {
    compilerOptions,
  }).outputText;

  await Promise.all([
    writeFile(
      path.join(tempDir, "volunteerDeskState.mjs"),
      compiledSharedState,
      "utf8",
    ),
    writeFile(
      path.join(tempDir, "operatorInboxState.mjs"),
      compiledHelpers,
      "utf8",
    ),
    writeFile(
      path.join(tempDir, "operatorInboxController.mjs"),
      compiledController,
      "utf8",
    ),
  ]);
  const [shared, state, controller] = await Promise.all([
    import(`file://${tempDir}/volunteerDeskState.mjs`),
    import(`file://${tempDir}/operatorInboxState.mjs`),
    import(`file://${tempDir}/operatorInboxController.mjs`),
  ]);
  await rm(tempDir, { recursive: true, force: true });
  return { ...shared, ...state, ...controller };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

const {
  applyOperatorConversationSnapshot,
  commitOperatorAuthorization,
  createInitialOperatorLifecycle,
  createOwnerScopedNonceRegistry,
  handleOperatorMutationFailure,
  isOperatorQueueScopeCurrent,
  operatorCanAccess,
  preservePinnedOperatorConversation,
  resolveOperatorConversationSelection,
  runAuthorizedOperatorRefresh,
  runOperatorInboxReload,
  startOperatorRealtimeSubscription,
  transitionOperatorFilterScope,
  transitionOperatorLifecycle,
} = await importHelpers();

let lifecycle = createInitialOperatorLifecycle();
assert.equal(operatorCanAccess(lifecycle), false, "unresolved auth must block data");

lifecycle = transitionOperatorLifecycle(lifecycle, "owner-a");
assert.equal(lifecycle.authorized, null);
assert.equal(
  operatorCanAccess(lifecycle),
  false,
  "a Clerk owner must not authorize protected reads by itself",
);
const ownerAGeneration = lifecycle.generation;
lifecycle = commitOperatorAuthorization(
  lifecycle,
  ownerAGeneration,
  "owner-a",
  true,
);
assert.equal(operatorCanAccess(lifecycle), true);

lifecycle = transitionOperatorLifecycle(lifecycle, undefined);
assert.equal(operatorCanAccess(lifecycle), false);
const unresolvedGeneration = lifecycle.generation;
lifecycle = transitionOperatorLifecycle(lifecycle, "owner-a");
assert.equal(lifecycle.authorized, null);
assert.ok(lifecycle.generation > unresolvedGeneration);
assert.equal(
  commitOperatorAuthorization(lifecycle, ownerAGeneration, "owner-a", true)
    .authorized,
  null,
  "a late result from before the unresolved interval must stay fenced",
);

lifecycle = transitionOperatorLifecycle(lifecycle, "owner-b");
const ownerBGeneration = lifecycle.generation;
assert.equal(
  commitOperatorAuthorization(lifecycle, ownerAGeneration, "owner-a", true)
    .authorized,
  null,
  "a late owner-A result must never authorize owner B",
);
lifecycle = commitOperatorAuthorization(
  lifecycle,
  ownerBGeneration,
  "owner-b",
  false,
);
assert.equal(operatorCanAccess(lifecycle), false);

const staffGate = deferred();
let protectedReads = 0;
let createdChannels = 0;
let sessionCurrent = true;
let sessionCleanup = () => undefined;
const sessionStart = (async () => {
  const allowed = await runAuthorizedOperatorRefresh({
    checkAccess: () => staffGate.promise,
    assertCurrent: () => {
      if (!sessionCurrent) throw new Error("mentor_operator_lifecycle_stale");
    },
    refreshConversations: async () => {
      protectedReads += 1;
    },
  });
  if (!allowed) return;
  sessionCleanup = startOperatorRealtimeSubscription({
    setAuth: async () => undefined,
    isCurrent: () => sessionCurrent,
    createChannel: () => {
      createdChannels += 1;
      return {};
    },
    subscribe: () => undefined,
    removeChannel: () => undefined,
    setState: () => undefined,
    reconcileAfterSubscribed: () => undefined,
  });
})();
await flush();
assert.equal(protectedReads, 0, "queue reads must wait for the positive staff RPC");
assert.equal(createdChannels, 0, "channels must wait for the positive staff RPC");
staffGate.resolve(true);
await sessionStart;
await flush();
assert.equal(protectedReads, 1);
assert.equal(createdChannels, 1);
sessionCleanup();

const staleGate = deferred();
let staleProtectedReads = 0;
let staleOwnerCurrent = true;
const lateOwnerA = runAuthorizedOperatorRefresh({
  checkAccess: () => staleGate.promise,
  assertCurrent: () => {
    if (!staleOwnerCurrent) throw new Error("mentor_operator_lifecycle_stale");
  },
  refreshConversations: async () => {
    staleProtectedReads += 1;
  },
});
await flush();
staleOwnerCurrent = false;
staleGate.resolve(true);
await assert.rejects(lateOwnerA, /mentor_operator_lifecycle_stale/);
assert.equal(staleProtectedReads, 0, "a late owner-A access result must not read owner-B data");

const baseConversation = {
  id: "conversation-a",
  status: "waiting_for_team",
  updated_at: "2026-07-20T10:00:00.000Z",
  last_message_at: "2026-07-20T10:00:00.000Z",
  last_message_preview: "Old preview",
};
const secondConversation = {
  ...baseConversation,
  id: "conversation-b",
  last_message_at: "2026-07-20T09:00:00.000Z",
};
const movedConversation = {
  ...baseConversation,
  status: "waiting_for_student",
  updated_at: "2026-07-20T10:01:00.000Z",
  last_message_at: "2026-07-20T10:01:00.000Z",
};
const freshSameConversation = {
  ...baseConversation,
  updated_at: "2026-07-20T10:02:00.000Z",
  last_message_at: "2026-07-20T10:02:00.000Z",
  last_message_preview: "Fresh student message",
};

assert.deepEqual(
  applyOperatorConversationSnapshot(
    [baseConversation, secondConversation],
    [{ version: 1, type: "UPDATE", row: movedConversation }],
    "waiting_for_team",
  ).map((row) => row.id),
  ["conversation-b"],
);

const deferredSnapshot = deferred();
const eventJournal = [];
const snapshotStartVersion = 0;
const reconciledSnapshot = deferredSnapshot.promise.then((snapshot) =>
  applyOperatorConversationSnapshot(
    snapshot,
    eventJournal.filter((event) => event.version > snapshotStartVersion),
    "waiting_for_team",
  ),
);
eventJournal.push({ version: 1, type: "UPDATE", row: freshSameConversation });
deferredSnapshot.resolve([baseConversation]);
assert.equal(
  (await reconciledSnapshot)[0].last_message_preview,
  "Fresh student message",
  "an event arriving during a deferred query must survive its snapshot",
);

assert.deepEqual(
  preservePinnedOperatorConversation(
    [secondConversation],
    baseConversation,
    "waiting_for_team",
  ).map((row) => row.id),
  ["conversation-a", "conversation-b"],
  "an ambiguous action keeps a missing row available for exact retry",
);
assert.equal(
  preservePinnedOperatorConversation(
    [freshSameConversation, secondConversation],
    baseConversation,
    "waiting_for_team",
  ).find((row) => row.id === baseConversation.id).last_message_preview,
  "Fresh student message",
  "a pin must not overwrite fresher same-ID queue metadata",
);

assert.equal(
  resolveOperatorConversationSelection(
    [baseConversation, secondConversation],
    "conversation-b",
  ),
  "conversation-b",
);
assert.equal(
  resolveOperatorConversationSelection([baseConversation], "conversation-b"),
  "conversation-a",
);

const waitingScope = {
  generation: 4,
  ownerId: "owner-b",
  filter: "waiting_for_team",
  epoch: 3,
};
const studentScope = transitionOperatorFilterScope(
  waitingScope,
  "waiting_for_student",
);
assert.equal(isOperatorQueueScopeCurrent(waitingScope, studentScope), false);
assert.equal(isOperatorQueueScopeCurrent(studentScope, studentScope), true);

let pinPresent = true;
let retryNoncePresent = true;
let forcedReconciliations = 0;
const definitiveResolution = await handleOperatorMutationFailure(
  { code: "P0001", message: "conversation_closed" },
  {
    discardRetryNonce: () => {
      retryNoncePresent = false;
    },
    releasePinAndReconcile: async () => {
      pinPresent = false;
      forcedReconciliations += 1;
    },
    invalidateAccess: () => assert.fail("domain rejection is not access denial"),
  },
);
assert.equal(definitiveResolution.kind, "definitive_rejection");
assert.equal(pinPresent, false);
assert.equal(retryNoncePresent, false);
assert.equal(forcedReconciliations, 1);

pinPresent = true;
retryNoncePresent = true;
forcedReconciliations = 0;
const ambiguousResolution = await handleOperatorMutationFailure(
  new TypeError("fetch failed"),
  {
    discardRetryNonce: () => {
      retryNoncePresent = false;
    },
    releasePinAndReconcile: async () => {
      pinPresent = false;
      forcedReconciliations += 1;
    },
    invalidateAccess: () => assert.fail("transport failure is not access denial"),
  },
);
assert.equal(ambiguousResolution.kind, "ambiguous");
assert.equal(pinPresent, true);
assert.equal(retryNoncePresent, true);
assert.equal(forcedReconciliations, 0);

for (const code of ["PGRST302", "PGRST303"]) {
  let accessInvalidated = false;
  let accessNoncePresent = true;
  let accessReconciliations = 0;
  const accessResolution = await handleOperatorMutationFailure(
    { code, message: "JWT validation failed" },
    {
      discardRetryNonce: () => {
        accessNoncePresent = false;
      },
      releasePinAndReconcile: () => {
        accessReconciliations += 1;
      },
      invalidateAccess: () => {
        accessInvalidated = true;
      },
    },
  );
  assert.equal(accessResolution.kind, "access_denied");
  assert.equal(accessInvalidated, true, `${code} must purge the authorized cache`);
  assert.equal(accessNoncePresent, false, `${code} must discard the failed retry entry`);
  assert.equal(accessReconciliations, 0);
}

let clock = 0;
const nonceRegistry = createOwnerScopedNonceRegistry({
  maxEntriesPerOwner: 2,
  ttlMs: 1_000,
  now: () => clock,
});
const ambiguousOperation = nonceRegistry.getOrCreate(
  "owner-a",
  "conversation-a\0same body",
  () => "stable-nonce",
);
ambiguousOperation.promise = Promise.resolve();
nonceRegistry.releasePromiseIfSame(
  "owner-a",
  "conversation-a\0same body",
  ambiguousOperation,
);
clock = 500;
assert.equal(
  nonceRegistry.getOrCreate(
    "owner-a",
    "conversation-a\0same body",
    () => "wrong-nonce",
  ).nonce,
  "stable-nonce",
  "an ambiguous exact retry must reuse its nonce",
);
clock = 600;
nonceRegistry.getOrCreate("owner-a", "second body", () => "nonce-2");
clock = 700;
nonceRegistry.getOrCreate("owner-a", "third body", () => "nonce-3");
assert.equal(
  nonceRegistry.get("owner-a", "conversation-a\0same body"),
  undefined,
  "operator retry entries must be LRU-bounded",
);
clock = 2_000;
assert.equal(
  nonceRegistry.get("owner-a", "third body"),
  undefined,
  "operator retry entries must also expire after their TTL",
);

const realtimeStates = [];
const realtimeChannels = [];
let reconcileCount = 0;
let removedChannels = 0;
let failSetAuth = true;
const launchRealtime = () =>
  startOperatorRealtimeSubscription({
    setAuth: async () => {
      if (failSetAuth) throw new Error("token unavailable");
    },
    isCurrent: () => true,
    createChannel: () => {
      const channel = { onStatus: null };
      realtimeChannels.push(channel);
      return channel;
    },
    subscribe: (channel, onStatus) => {
      channel.onStatus = onStatus;
    },
    removeChannel: () => {
      removedChannels += 1;
    },
    setState: (state) => realtimeStates.push(state),
    reconcileAfterSubscribed: async () => {
      reconcileCount += 1;
    },
  });

let stopRealtime = launchRealtime();
await flush();
assert.equal(realtimeStates.at(-1), "disconnected");
assert.equal(realtimeChannels.length, 0, "setAuth failure must not create a channel");

failSetAuth = false;
await runOperatorInboxReload({
  checkAccess: async () => true,
  assertCurrent: () => undefined,
  refreshConversations: async () => undefined,
  requestRealtimeReconnect: () => {
    stopRealtime();
    stopRealtime = launchRealtime();
  },
  refreshMessages: async () => undefined,
});
await flush();
assert.equal(realtimeChannels.length, 1, "retry after setAuth failure creates a channel");
realtimeChannels[0].onStatus("SUBSCRIBED");
await flush();
assert.equal(realtimeStates.at(-1), "connected");
assert.equal(reconcileCount, 1, "SUBSCRIBED must force a successor reconciliation");
realtimeChannels[0].onStatus("CLOSED");
assert.equal(realtimeStates.at(-1), "disconnected");

await runOperatorInboxReload({
  checkAccess: async () => true,
  assertCurrent: () => undefined,
  refreshConversations: async () => undefined,
  requestRealtimeReconnect: () => {
    stopRealtime();
    stopRealtime = launchRealtime();
  },
  refreshMessages: async () => undefined,
});
await flush();
assert.equal(realtimeChannels.length, 2, "retry after CLOSED must create a new channel");
realtimeChannels[1].onStatus("SUBSCRIBED");
await flush();
assert.equal(realtimeStates.at(-1), "connected");
assert.equal(reconcileCount, 2);
stopRealtime();
assert.equal(removedChannels, 2);

const [inboxSource, listSource] = await Promise.all([
  readFile(
    path.join(root, "components", "mentor", "operator", "MentorOperatorInbox.tsx"),
    "utf8",
  ),
  readFile(
    path.join(root, "components", "mentor", "operator", "OperatorConversationList.tsx"),
    "utf8",
  ),
]);
assert.match(inboxSource, /actionLocked/);
assert.match(listSource, /disabled=\{disabled\}/);
assert.match(listSource, /aria-disabled=\{disabled\}/);

console.log("test-mentor-operator-inbox: PASS");
