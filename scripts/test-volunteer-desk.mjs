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
  deriveMentorRealtimeState,
  mergeConversationSnapshot,
  mergeMessageSnapshot,
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
  mergeConversationSnapshot([realtimeConversation], [oldConversation]),
  [realtimeConversation],
  "a late conversation snapshot must not overwrite a newer Realtime update",
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
  mergeMessageSnapshot(
    [realtimeMessage],
    [queryMessage],
    (left, right) => [...left, ...right].sort((a, b) => a.id.localeCompare(b.id)),
  ),
  [queryMessage, realtimeMessage],
  "a late message query must merge rows received from Realtime after the request started",
);

assert.equal(
  deriveMentorRealtimeState(true, true, "connected", "disconnected"),
  "disconnected",
  "a connected conversation channel must not mask a disconnected selected-message channel",
);

console.log("volunteer desk lifecycle checks passed");
