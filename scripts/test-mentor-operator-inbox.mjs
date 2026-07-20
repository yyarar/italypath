import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const helperPath = path.join(root, "lib", "mentor", "operatorInboxState.ts");
const sharedStatePath = path.join(root, "lib", "mentor", "volunteerDeskState.ts");

async function importHelpers() {
  const [helperSource, sharedStateSource] = await Promise.all([
    readFile(helperPath, "utf8"),
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

  await Promise.all([
    writeFile(path.join(tempDir, "volunteerDeskState.mjs"), compiledSharedState, "utf8"),
    writeFile(path.join(tempDir, "operatorInboxState.mjs"), compiledHelpers, "utf8"),
  ]);
  const loadedModule = await import(`file://${tempDir}/operatorInboxState.mjs`);
  await rm(tempDir, { recursive: true, force: true });
  return loadedModule;
}

const {
  applyOperatorConversationSnapshot,
  commitOperatorAuthorization,
  createInitialOperatorLifecycle,
  isOperatorQueueScopeCurrent,
  operatorCanAccess,
  preservePinnedOperatorConversation,
  resolveOperatorConversationSelection,
  transitionOperatorFilterScope,
  transitionOperatorLifecycle,
} = await importHelpers();

let lifecycle = createInitialOperatorLifecycle();
assert.equal(operatorCanAccess(lifecycle), false, "unresolved auth must block operator data");

lifecycle = transitionOperatorLifecycle(lifecycle, "owner-a");
assert.equal(lifecycle.authReady, true);
assert.equal(lifecycle.authorized, null);
assert.equal(
  operatorCanAccess(lifecycle),
  false,
  "a Clerk owner alone must not authorize any conversation read or subscription",
);

const ownerAGeneration = lifecycle.generation;
lifecycle = commitOperatorAuthorization(
  lifecycle,
  ownerAGeneration,
  "owner-a",
  true,
);
assert.equal(operatorCanAccess(lifecycle), true, "positive staff RPC must open the data gate");

lifecycle = transitionOperatorLifecycle(lifecycle, undefined);
assert.equal(operatorCanAccess(lifecycle), false, "unresolved Clerk state must close the data gate");
assert.equal(lifecycle.authorized, null, "unresolved auth must require a fresh staff check");
const unresolvedGeneration = lifecycle.generation;
lifecycle = transitionOperatorLifecycle(lifecycle, "owner-a");
assert.equal(lifecycle.authorized, null, "the same owner must be re-authorized after Clerk resumes");
assert.ok(
  lifecycle.generation > unresolvedGeneration,
  "resuming the same owner must invalidate work from before the unresolved interval",
);
assert.equal(
  commitOperatorAuthorization(lifecycle, ownerAGeneration, "owner-a", true).authorized,
  null,
  "a pre-interruption authorization result must not reopen the resumed owner",
);

lifecycle = transitionOperatorLifecycle(lifecycle, "owner-b");
assert.equal(operatorCanAccess(lifecycle), false, "owner changes must reset staff authorization");
assert.equal(lifecycle.ownerId, "owner-b");
const ownerBGeneration = lifecycle.generation;
const staleAccessResult = commitOperatorAuthorization(
  lifecycle,
  ownerAGeneration,
  "owner-a",
  true,
);
assert.deepEqual(
  staleAccessResult,
  lifecycle,
  "a late owner-A authorization response must not authorize owner B",
);
lifecycle = commitOperatorAuthorization(
  lifecycle,
  ownerBGeneration,
  "owner-b",
  false,
);
assert.equal(operatorCanAccess(lifecycle), false, "an explicit staff denial must block data");

const baseConversation = {
  id: "conversation-a",
  status: "waiting_for_team",
  updated_at: "2026-07-20T10:00:00.000Z",
  last_message_at: "2026-07-20T10:00:00.000Z",
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

assert.deepEqual(
  applyOperatorConversationSnapshot(
    [baseConversation, secondConversation],
    [{ version: 1, type: "UPDATE", row: movedConversation }],
    "waiting_for_team",
  ).map((row) => row.id),
  ["conversation-b"],
  "a post-query Realtime status change must remove a row from the current queue",
);
assert.deepEqual(
  applyOperatorConversationSnapshot(
    [],
    [{ version: 2, type: "INSERT", row: movedConversation }],
    "waiting_for_student",
  ),
  [movedConversation],
  "a Realtime insert arriving during a query must survive the authoritative snapshot",
);
assert.deepEqual(
  preservePinnedOperatorConversation(
    [secondConversation],
    baseConversation,
    "waiting_for_team",
  ).map((row) => row.id),
  ["conversation-a", "conversation-b"],
  "a lost staff RPC response must keep the acted-on conversation selected for idempotent retry",
);

assert.equal(
  resolveOperatorConversationSelection(
    [baseConversation, secondConversation],
    "conversation-b",
  ),
  "conversation-b",
  "selection must survive while the row remains in the filtered queue",
);
assert.equal(
  resolveOperatorConversationSelection([baseConversation], "conversation-b"),
  "conversation-a",
  "a removed selection must fall back to the first queue row",
);

const waitingScope = {
  generation: 4,
  ownerId: "owner-b",
  filter: "waiting_for_team",
  epoch: 3,
};
const studentScope = transitionOperatorFilterScope(waitingScope, "waiting_for_student");
assert.equal(studentScope.epoch, 4, "filter changes must invalidate the prior queue scope");
assert.equal(
  isOperatorQueueScopeCurrent(waitingScope, studentScope),
  false,
  "a late waiting-for-team query must not commit into waiting-for-student state",
);
assert.equal(
  isOperatorQueueScopeCurrent(studentScope, studentScope),
  true,
  "the active filter scope must accept its own authoritative result",
);

const hookSource = await readFile(
  path.join(root, "lib", "mentor", "useMentorOperatorInbox.ts"),
  "utf8",
);
const [gateSource, inboxSource] = await Promise.all([
  readFile(path.join(root, "components", "mentor", "operator", "MentorOperatorGate.tsx"), "utf8"),
  readFile(path.join(root, "components", "mentor", "operator", "MentorOperatorInbox.tsx"), "utf8"),
]);
assert.match(hookSource, /createOwnerScopedNonceRegistry/);
assert.match(hookSource, /releasePromiseIfSame/);
assert.match(hookSource, /deleteIfSame/);
assert.doesNotMatch(
  hookSource,
  /pendingReplyRef\.current\.clear\(/,
  "owner/session transitions must not destroy a failed reply's stable retry nonce",
);
assert.match(hookSource, /pendingCloseRef\.current\.get\(closeKey\)/);
assert.match(hookSource, /pendingCloseRef\.current\.delete\(closeKey\)/);
assert.match(hookSource, /transitionOperatorLifecycle/);
assert.match(hookSource, /hasLoadedQueueRef/);
assert.match(hookSource, /actionPinRef/);
assert.match(hookSource, /refreshConversations\(false, true, pin\)/);
assert.match(
  hookSource,
  /status === "SUBSCRIBED"[\s\S]{0,240}refreshConversations\(false, true\)/,
  "the conversation subscription must close the query/subscription gap with a forced read",
);
assert.doesNotMatch(
  gateSource,
  /authorized !== true \|\| loading/,
  "authorized background loading must not unmount the operator composer",
);
assert.match(
  inboxSource,
  /error === "load_failed" \|\| error === "messages_load_failed"/,
  "authorized queue and thread failures must remain inline and retryable",
);
assert.match(
  inboxSource,
  /key=\{selectedConversation\?\.id \?\? "no-conversation"\}/,
  "operator drafts must be scoped to the selected conversation",
);

console.log("test-mentor-operator-inbox: PASS");
