export type OperatorRealtimeStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR";

export type OperatorMutationFailureKind =
  | "access_denied"
  | "definitive_rejection"
  | "ambiguous";

export interface OperatorMutationFailureResolution {
  kind: OperatorMutationFailureKind;
  preservePin: boolean;
  preserveNonce: boolean;
  forceReconciliation: boolean;
}

interface ErrorCandidate {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
}

function normalizedErrorText(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const candidate = error as ErrorCandidate;
  return [candidate.message, candidate.details, candidate.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

export function operatorBackendDeniedAccess(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as ErrorCandidate;
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const text = normalizedErrorText(error);
  return (
    code === "42501" ||
    code === "PGRST301" ||
    code === "PGRST302" ||
    code === "PGRST303" ||
    text.includes("authentication_required") ||
    text.includes("staff_access_required") ||
    text.includes("conversation_access_denied") ||
    text.includes("permission denied") ||
    text.includes("row-level security") ||
    text.includes("jwt expired")
  );
}

const DEFINITIVE_OPERATOR_REJECTIONS = [
  "conversation_closed",
  "conversation_not_found",
  "invalid_message_length",
  "client_nonce_required",
  "idempotency_conflict",
] as const;

export function resolveOperatorMutationFailure(
  error: unknown,
): OperatorMutationFailureResolution {
  if (operatorBackendDeniedAccess(error)) {
    return {
      kind: "access_denied",
      preservePin: false,
      preserveNonce: false,
      forceReconciliation: false,
    };
  }

  const text = normalizedErrorText(error);
  if (DEFINITIVE_OPERATOR_REJECTIONS.some((token) => text.includes(token))) {
    return {
      kind: "definitive_rejection",
      preservePin: false,
      preserveNonce: false,
      forceReconciliation: true,
    };
  }

  return {
    kind: "ambiguous",
    preservePin: true,
    preserveNonce: true,
    forceReconciliation: false,
  };
}

export interface HandleOperatorMutationFailureOptions {
  discardRetryNonce?: () => void;
  releasePinAndReconcile: () => Promise<unknown> | unknown;
  invalidateAccess: () => void;
}

export async function handleOperatorMutationFailure(
  error: unknown,
  {
    discardRetryNonce,
    releasePinAndReconcile,
    invalidateAccess,
  }: HandleOperatorMutationFailureOptions,
): Promise<OperatorMutationFailureResolution> {
  const resolution = resolveOperatorMutationFailure(error);
  if (!resolution.preserveNonce) discardRetryNonce?.();
  if (resolution.kind === "access_denied") {
    invalidateAccess();
    return resolution;
  }
  if (resolution.forceReconciliation) {
    try {
      await releasePinAndReconcile();
    } catch {
      // Keep the definitive domain result primary; a later reload can reconcile.
    }
  }
  return resolution;
}

export interface RunAuthorizedOperatorRefreshOptions {
  checkAccess: () => Promise<boolean>;
  assertCurrent: () => void;
  refreshConversations: () => Promise<void>;
}

/**
 * Orders the staff gate before the first protected read and fences every awaited
 * boundary against Clerk owner/generation changes.
 */
export async function runAuthorizedOperatorRefresh({
  checkAccess,
  assertCurrent,
  refreshConversations,
}: RunAuthorizedOperatorRefreshOptions): Promise<boolean> {
  const allowed = await checkAccess();
  assertCurrent();
  if (!allowed) return false;
  await refreshConversations();
  assertCurrent();
  return true;
}

export interface RunOperatorInboxReloadOptions
  extends RunAuthorizedOperatorRefreshOptions {
  requestRealtimeReconnect: () => void;
  refreshMessages: () => Promise<void>;
}

export async function runOperatorInboxReload({
  checkAccess,
  assertCurrent,
  refreshConversations,
  requestRealtimeReconnect,
  refreshMessages,
}: RunOperatorInboxReloadOptions): Promise<boolean> {
  const allowed = await runAuthorizedOperatorRefresh({
    checkAccess,
    assertCurrent,
    refreshConversations,
  });
  if (!allowed) return false;
  assertCurrent();
  requestRealtimeReconnect();
  await refreshMessages();
  assertCurrent();
  return true;
}

export interface StartOperatorRealtimeSubscriptionOptions<TChannel> {
  setAuth: () => Promise<unknown>;
  isCurrent: () => boolean;
  createChannel: () => TChannel;
  subscribe: (
    channel: TChannel,
    onStatus: (status: OperatorRealtimeStatus) => void,
  ) => void;
  removeChannel: (channel: TChannel) => PromiseLike<unknown> | unknown;
  setState: (state: "connecting" | "connected" | "disconnected") => void;
  reconcileAfterSubscribed: () => Promise<unknown> | unknown;
}

/**
 * Starts one fenced Supabase channel. The caller owns the React generation key;
 * invoking this again after a retry creates a genuinely new channel.
 */
export function startOperatorRealtimeSubscription<TChannel>({
  setAuth,
  isCurrent,
  createChannel,
  subscribe,
  removeChannel,
  setState,
  reconcileAfterSubscribed,
}: StartOperatorRealtimeSubscriptionOptions<TChannel>): () => void {
  let active = true;
  let channel: TChannel | null = null;

  if (isCurrent()) setState("connecting");

  void (async () => {
    try {
      await setAuth();
      if (!active || !isCurrent()) return;
      channel = createChannel();
      subscribe(channel, (status) => {
        if (!active || !isCurrent()) return;
        if (status === "SUBSCRIBED") {
          setState("connected");
          void Promise.resolve(reconcileAfterSubscribed()).catch(() => undefined);
          return;
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setState("disconnected");
        }
      });
    } catch {
      if (active && isCurrent()) setState("disconnected");
    }
  })();

  return () => {
    active = false;
    if (channel !== null) {
      void Promise.resolve(removeChannel(channel)).catch(() => undefined);
    }
  };
}
