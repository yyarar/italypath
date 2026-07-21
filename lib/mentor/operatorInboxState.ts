import { applyAuthoritativeConversationSnapshot } from "@/lib/mentor/volunteerDeskState";
import type { MentorConversationStatus } from "@/lib/mentor/volunteer";
import type { MentorConversationRow } from "@/types";

import type { ConversationEvent } from "@/lib/mentor/volunteerDeskState";

export interface OperatorLifecycleState {
  hasCommittedOwner: boolean;
  ownerId: string | null;
  authReady: boolean;
  authorized: boolean | null;
  generation: number;
}

export interface OperatorQueueScope {
  generation: number;
  ownerId: string;
  filter: MentorConversationStatus;
  epoch: number;
}

export function createInitialOperatorLifecycle(): OperatorLifecycleState {
  return {
    hasCommittedOwner: false,
    ownerId: null,
    authReady: false,
    authorized: null,
    generation: 0,
  };
}

export function transitionOperatorLifecycle(
  current: OperatorLifecycleState,
  resolvedOwnerId: string | null | undefined,
): OperatorLifecycleState {
  if (resolvedOwnerId === undefined) {
    if (!current.authReady && current.authorized === null) return current;
    return {
      ...current,
      authReady: false,
      authorized: null,
      generation: current.generation + 1,
    };
  }

  if (
    current.hasCommittedOwner &&
    current.ownerId === resolvedOwnerId &&
    current.authReady
  ) {
    return current;
  }

  return {
    hasCommittedOwner: true,
    ownerId: resolvedOwnerId,
    authReady: true,
    authorized: resolvedOwnerId ? null : false,
    generation: current.generation + 1,
  };
}

export function commitOperatorAuthorization(
  current: OperatorLifecycleState,
  generation: number,
  ownerId: string,
  authorized: boolean,
): OperatorLifecycleState {
  if (
    current.generation !== generation ||
    current.ownerId !== ownerId ||
    !current.authReady
  ) {
    return current;
  }
  return { ...current, authorized };
}

export function operatorCanAccess(state: OperatorLifecycleState): boolean {
  return Boolean(state.authReady && state.ownerId && state.authorized === true);
}

export function transitionOperatorFilterScope(
  current: OperatorQueueScope,
  filter: MentorConversationStatus,
): OperatorQueueScope {
  if (current.filter === filter) return current;
  return { ...current, filter, epoch: current.epoch + 1 };
}

export function isOperatorQueueScopeCurrent(
  expected: OperatorQueueScope,
  current: OperatorQueueScope,
): boolean {
  return (
    expected.generation === current.generation &&
    expected.ownerId === current.ownerId &&
    expected.filter === current.filter &&
    expected.epoch === current.epoch
  );
}

export function applyOperatorConversationSnapshot<
  T extends MentorConversationRow,
>(
  snapshot: T[],
  postStartEvents: ConversationEvent<T>[],
  filter: MentorConversationStatus,
): T[] {
  return applyAuthoritativeConversationSnapshot(snapshot, postStartEvents).filter(
    (conversation) => conversation.status === filter,
  );
}

export function preservePinnedOperatorConversation<
  T extends MentorConversationRow,
>(
  rows: T[],
  pinnedConversation: T,
  filter: MentorConversationStatus,
): T[] {
  if (rows.some((conversation) => conversation.id === pinnedConversation.id)) {
    return applyOperatorConversationSnapshot(rows, [], filter);
  }
  return applyOperatorConversationSnapshot(
    [...rows, pinnedConversation],
    [],
    filter,
  );
}

export function resolveOperatorConversationSelection<
  T extends MentorConversationRow,
>(rows: T[], selectedConversationId: string | null): string | null {
  if (
    selectedConversationId &&
    rows.some((conversation) => conversation.id === selectedConversationId)
  ) {
    return selectedConversationId;
  }
  return rows[0]?.id ?? null;
}
