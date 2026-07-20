import type { MentorConversationRow } from "@/types";

export type MentorChannelState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected";

export type ConversationEvent<T extends MentorConversationRow> =
  | { version: number; type: "INSERT" | "UPDATE"; row: T }
  | { version: number; type: "DELETE"; id: string };

export interface MessageScope<T> {
  conversationId: string | null;
  epoch: number;
  messages: T[];
}

function sortConversations<T extends MentorConversationRow>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const lastMessageDelta = Date.parse(right.last_message_at) - Date.parse(left.last_message_at);
    return lastMessageDelta || right.id.localeCompare(left.id);
  });
}

export function applyAuthoritativeConversationSnapshot<T extends MentorConversationRow>(
  snapshot: T[],
  postStartEvents: ConversationEvent<T>[],
): T[] {
  const byId = new Map(snapshot.map((conversation) => [conversation.id, conversation]));

  for (const event of postStartEvents) {
    if (event.type === "DELETE") {
      byId.delete(event.id);
      continue;
    }

    const existing = byId.get(event.row.id);
    if (
      !existing ||
      Date.parse(event.row.updated_at) >= Date.parse(existing.updated_at)
    ) {
      byId.set(event.row.id, event.row);
    }
  }

  return sortConversations([...byId.values()]);
}

export function transitionMessageScope<T>(
  current: MessageScope<T>,
  conversationId: string | null,
): MessageScope<T> {
  if (current.conversationId === conversationId) return current;
  return {
    conversationId,
    epoch: current.epoch + 1,
    messages: [],
  };
}

export function applyAuthoritativeMessageSnapshot<T>(
  snapshot: T[],
  postStartEvents: Array<{ version: number; row: T }>,
  merge: (current: T[], incoming: T[]) => T[],
): T[] {
  return merge(snapshot, postStartEvents.map((event) => event.row));
}

export function coalesceOperation<K, T>(
  registry: Map<K, Promise<T>>,
  key: K,
  run: () => Promise<T>,
): Promise<T> {
  const existing = registry.get(key);
  if (existing) return existing;

  const promise = Promise.resolve().then(run);
  registry.set(key, promise);
  void promise.then(
    () => {
      if (registry.get(key) === promise) registry.delete(key);
    },
    () => {
      if (registry.get(key) === promise) registry.delete(key);
    },
  );
  return promise;
}

export interface SerializedReconciliationQueue {
  enqueue<T>(run: () => Promise<T>): Promise<T>;
}

export function createSerializedReconciliationQueue(): SerializedReconciliationQueue {
  let tail: Promise<void> = Promise.resolve();

  return {
    enqueue<T>(run: () => Promise<T>): Promise<T> {
      const task = tail.then(run, run);
      tail = task.then(
        () => undefined,
        () => undefined,
      );
      return task;
    },
  };
}

export interface OwnerScopedNonceOperation {
  nonce: string;
  promise?: Promise<void>;
}

export interface OwnerScopedNonceRegistry {
  get(ownerId: string, key: string): OwnerScopedNonceOperation | undefined;
  getOrCreate(
    ownerId: string,
    key: string,
    createNonce: () => string,
  ): OwnerScopedNonceOperation;
  deleteIfSame(ownerId: string, key: string, operation: OwnerScopedNonceOperation): void;
  releasePromiseIfSame(
    ownerId: string,
    key: string,
    operation: OwnerScopedNonceOperation,
  ): void;
}

export function createOwnerScopedNonceRegistry(): OwnerScopedNonceRegistry {
  const owners = new Map<string, Map<string, OwnerScopedNonceOperation>>();

  function entries(ownerId: string): Map<string, OwnerScopedNonceOperation> {
    let ownerEntries = owners.get(ownerId);
    if (!ownerEntries) {
      ownerEntries = new Map();
      owners.set(ownerId, ownerEntries);
    }
    return ownerEntries;
  }

  return {
    get(ownerId, key) {
      return owners.get(ownerId)?.get(key);
    },
    getOrCreate(ownerId, key, createNonce) {
      const ownerEntries = entries(ownerId);
      const existing = ownerEntries.get(key);
      if (existing) return existing;
      const operation = { nonce: createNonce() };
      ownerEntries.set(key, operation);
      return operation;
    },
    deleteIfSame(ownerId, key, operation) {
      const ownerEntries = owners.get(ownerId);
      if (ownerEntries?.get(key) !== operation) return;
      ownerEntries.delete(key);
      if (ownerEntries.size === 0) owners.delete(ownerId);
    },
    releasePromiseIfSame(ownerId, key, operation) {
      if (owners.get(ownerId)?.get(key) === operation) {
        operation.promise = undefined;
      }
    },
  };
}

export interface CommittedAuthState {
  hasCommittedOwner: boolean;
  ownerId: string | null;
  ready: boolean;
}

export function transitionCommittedAuth(
  current: CommittedAuthState,
  resolvedOwnerId: string | null | undefined,
): CommittedAuthState & { commitOwner: boolean } {
  if (resolvedOwnerId === undefined) {
    return { ...current, ready: false, commitOwner: false };
  }
  if (current.hasCommittedOwner && current.ownerId === resolvedOwnerId) {
    return { ...current, ready: true, commitOwner: false };
  }
  return {
    hasCommittedOwner: true,
    ownerId: resolvedOwnerId,
    ready: true,
    commitOwner: true,
  };
}

export function deriveMentorRealtimeState(
  hasAuthenticatedUser: boolean,
  hasSelectedConversation: boolean,
  conversations: MentorChannelState,
  messages: MentorChannelState,
): "connecting" | "connected" | "disconnected" {
  if (!hasAuthenticatedUser) return "disconnected";

  const requiredChannels = hasSelectedConversation
    ? [conversations, messages]
    : [conversations];

  if (requiredChannels.includes("disconnected")) return "disconnected";
  if (requiredChannels.every((state) => state === "connected")) return "connected";
  return "connecting";
}
