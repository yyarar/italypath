"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

import {
  applyOperatorConversationSnapshot,
  commitOperatorAuthorization,
  isOperatorQueueScopeCurrent,
  operatorCanAccess,
  preservePinnedOperatorConversation,
  resolveOperatorConversationSelection,
  transitionOperatorLifecycle,
  type OperatorQueueScope,
} from "@/lib/mentor/operatorInboxState";
import {
  handleOperatorMutationFailure,
  operatorBackendDeniedAccess,
  runAuthorizedOperatorRefresh,
  runOperatorInboxReload,
  startOperatorRealtimeSubscription,
  type OperatorRealtimeStatus,
} from "@/lib/mentor/operatorInboxController";
import {
  applyAuthoritativeMessageSnapshot,
  clearMentorMessageLoadError,
  coalesceOperation,
  createOwnerScopedNonceRegistry,
  createSerializedReconciliationQueue,
  deriveMentorRealtimeState,
  transitionMessageScope,
  type ConversationEvent,
  type MentorChannelState,
} from "@/lib/mentor/volunteerDeskState";
import { useMentorSupabaseClient } from "@/lib/mentor/useMentorSupabaseClient";
import {
  mergeMentorMessages,
  type MentorConversationStatus,
  type MentorRealtimeState,
} from "@/lib/mentor/volunteer";
import type { MentorConversationRow, MentorMessageRow } from "@/types";

interface MessageScope {
  conversationId: string | null;
  epoch: number;
  messages: MentorMessageRow[];
  eventVersion: number;
  events: Array<{ version: number; row: MentorMessageRow }>;
}

interface OperatorActionPin {
  kind: "reply" | "close";
  generation: number;
  ownerId: string;
  filter: MentorConversationStatus;
  filterEpoch: number;
  conversation: MentorConversationRow;
  inFlight: boolean;
}

export interface UseMentorOperatorInboxResult {
  authorized: boolean | null;
  conversations: MentorConversationRow[];
  selectedConversation: MentorConversationRow | null;
  messages: MentorMessageRow[];
  filter: MentorConversationStatus;
  loading: boolean;
  messagesLoading: boolean;
  sending: boolean;
  closing: boolean;
  actionLocked: boolean;
  error: string | null;
  realtimeState: MentorRealtimeState;
  setFilter: (filter: MentorConversationStatus) => void;
  selectConversation: (conversationId: string | null) => void;
  sendReply: (body: string) => Promise<void>;
  closeConversation: () => Promise<void>;
  reload: () => Promise<void>;
}

function staleLifecycleError(): Error {
  return new Error("mentor_operator_lifecycle_stale");
}

export function useMentorOperatorInbox(): UseMentorOperatorInboxResult {
  const { user, isLoaded } = useUser();
  const resolvedUserId = isLoaded ? user?.id ?? null : undefined;
  const supabase = useMentorSupabaseClient();

  const mountedRef = useRef(false);
  const identityRef = useRef<string | null>(null);
  const hasCommittedIdentityRef = useRef(false);
  const authReadyRef = useRef(false);
  const authorizedRef = useRef<boolean | null>(null);
  const hasLoadedQueueRef = useRef(false);
  const generationRef = useRef(0);
  const filterRef = useRef<MentorConversationStatus>("waiting_for_team");
  const filterEpochRef = useRef(0);
  const conversationsRef = useRef<MentorConversationRow[]>([]);
  const conversationEventsRef = useRef<ConversationEvent<MentorConversationRow>[]>([]);
  const conversationEventVersionRef = useRef(0);
  const selectedConversationIdRef = useRef<string | null>(null);
  const messagesRef = useRef<MentorMessageRow[]>([]);
  const messageScopeRef = useRef<MessageScope>({
    conversationId: null,
    epoch: 0,
    messages: [],
    eventVersion: 0,
    events: [],
  });
  const conversationRefreshesRef = useRef(new Map<string, Promise<void>>());
  const messageRefreshesRef = useRef(new Map<string, Promise<void>>());
  const conversationQueueRef = useRef(createSerializedReconciliationQueue());
  const messageQueueRef = useRef(createSerializedReconciliationQueue());
  const accessChecksRef = useRef(new Map<string, Promise<boolean>>());
  const pendingReplyRef = useRef(
    createOwnerScopedNonceRegistry({
      maxEntriesPerOwner: 32,
      ttlMs: 7 * 24 * 60 * 60 * 1000,
    }),
  );
  const pendingCloseRef = useRef(new Map<string, Promise<void>>());
  const actionPinRef = useRef<OperatorActionPin | null>(null);
  const activeSendingRef = useRef(0);
  const activeClosingRef = useRef(0);

  const [stateUserId, setStateUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [filter, setFilterState] =
    useState<MentorConversationStatus>("waiting_for_team");
  const [conversations, setConversations] = useState<MentorConversationRow[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MentorMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [actionLocked, setActionLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationChannelState, setConversationChannelState] =
    useState<MentorChannelState>("idle");
  const [messageChannelState, setMessageChannelState] =
    useState<MentorChannelState>("idle");
  const [messageChannelConversationId, setMessageChannelConversationId] =
    useState<string | null>(null);
  const [realtimeGeneration, setRealtimeGeneration] = useState(0);

  const identityReady =
    authReady && resolvedUserId !== undefined && stateUserId === resolvedUserId;
  const accessReady = identityReady && authorized === true;
  const visibleConversations = accessReady ? conversations : [];
  const visibleSelectedConversationId = accessReady ? selectedConversationId : null;
  const visibleMessages =
    accessReady && messageScopeRef.current.conversationId === visibleSelectedConversationId
      ? messages
      : [];
  const selectedConversation =
    visibleConversations.find(
      (conversation) => conversation.id === visibleSelectedConversationId,
    ) ?? null;
  const realtimeState = deriveMentorRealtimeState(
    Boolean(resolvedUserId && accessReady),
    Boolean(visibleSelectedConversationId),
    conversationChannelState,
    messageChannelConversationId === visibleSelectedConversationId
      ? messageChannelState
      : "connecting",
  );

  const isCommittedOwner = useCallback((generation: number, ownerId: string | null) => {
    return (
      mountedRef.current &&
      generation === generationRef.current &&
      ownerId === identityRef.current
    );
  }, []);

  const isCurrent = useCallback(
    (generation: number, ownerId: string | null) => {
      return authReadyRef.current && isCommittedOwner(generation, ownerId);
    },
    [isCommittedOwner],
  );

  const isAuthorizedCurrent = useCallback(
    (generation: number, ownerId: string | null) => {
      return (
        isCurrent(generation, ownerId) &&
        operatorCanAccess({
          hasCommittedOwner: hasCommittedIdentityRef.current,
          ownerId: identityRef.current,
          authReady: authReadyRef.current,
          authorized: authorizedRef.current,
          generation: generationRef.current,
        })
      );
    },
    [isCurrent],
  );

  const assertCurrent = useCallback(
    (generation: number, ownerId: string | null) => {
      if (!isCurrent(generation, ownerId)) throw staleLifecycleError();
    },
    [isCurrent],
  );

  const assertAuthorizedCurrent = useCallback(
    (generation: number, ownerId: string | null) => {
      if (!isAuthorizedCurrent(generation, ownerId)) throw staleLifecycleError();
    },
    [isAuthorizedCurrent],
  );

  const currentQueueScope = useCallback((): OperatorQueueScope | null => {
    const ownerId = identityRef.current;
    if (!ownerId) return null;
    return {
      generation: generationRef.current,
      ownerId,
      filter: filterRef.current,
      epoch: filterEpochRef.current,
    };
  }, []);

  const isQueueScopeCurrent = useCallback(
    (scope: OperatorQueueScope) => {
      const current = currentQueueScope();
      return (
        current !== null &&
        isAuthorizedCurrent(scope.generation, scope.ownerId) &&
        isOperatorQueueScopeCurrent(scope, current)
      );
    },
    [currentQueueScope, isAuthorizedCurrent],
  );

  const transitionSelection = useCallback((conversationId: string | null) => {
    if (selectedConversationIdRef.current === conversationId) return false;
    const nextScope = transitionMessageScope(messageScopeRef.current, conversationId);
    selectedConversationIdRef.current = conversationId;
    messageScopeRef.current = {
      ...nextScope,
      eventVersion: 0,
      events: [],
    };
    messagesRef.current = [];
    messageRefreshesRef.current.clear();
    messageQueueRef.current = createSerializedReconciliationQueue();
    setSelectedConversationId(conversationId);
    setMessages([]);
    setMessagesLoading(false);
    setMessageChannelConversationId(null);
    setMessageChannelState("idle");
    setError(clearMentorMessageLoadError);
    return true;
  }, []);

  const pinMatchesCurrentScope = useCallback((pin: OperatorActionPin) => {
    return (
      pin.generation === generationRef.current &&
      pin.ownerId === identityRef.current &&
      pin.filter === filterRef.current &&
      pin.filterEpoch === filterEpochRef.current
    );
  }, []);

  const commitConversations = useCallback(
    (incomingRows: MentorConversationRow[], releasePin?: OperatorActionPin) => {
      if (releasePin && actionPinRef.current === releasePin) {
        actionPinRef.current = null;
      }
      let rows = incomingRows;
      const pin = actionPinRef.current;
      if (pin && pinMatchesCurrentScope(pin)) {
        rows = preservePinnedOperatorConversation(
          rows,
          pin.conversation,
          filterRef.current,
        );
      }
      conversationsRef.current = rows;
      setConversations(rows);
      transitionSelection(
        resolveOperatorConversationSelection(rows, selectedConversationIdRef.current),
      );
    },
    [pinMatchesCurrentScope, transitionSelection],
  );

  const commitMessages = useCallback(
    (conversationId: string, epoch: number, rows: MentorMessageRow[]) => {
      const scope = messageScopeRef.current;
      if (scope.conversationId !== conversationId || scope.epoch !== epoch) return;
      const matchingRows = rows.filter((row) => row.conversation_id === conversationId);
      scope.messages = matchingRows;
      messagesRef.current = matchingRows;
      setMessages(matchingRows);
    },
    [],
  );

  const purgeVisibleData = useCallback(() => {
    actionPinRef.current = null;
    hasLoadedQueueRef.current = false;
    conversationsRef.current = [];
    conversationEventsRef.current = [];
    conversationEventVersionRef.current = 0;
    commitConversations([]);
    setMessagesLoading(false);
    setActionLocked(false);
    setConversationChannelState("idle");
    setMessageChannelState("idle");
    setMessageChannelConversationId(null);
  }, [commitConversations]);

  const invalidateAccess = useCallback(
    (failure: "access_check_failed" | "load_failed" | "messages_load_failed") => {
      authorizedRef.current = null;
      setAuthorized(null);
      purgeVisibleData();
      setLoading(false);
      setError(failure);
    },
    [purgeVisibleData],
  );

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  useLayoutEffect(() => {
    const currentLifecycle = {
      hasCommittedOwner: hasCommittedIdentityRef.current,
      ownerId: identityRef.current,
      authReady: authReadyRef.current,
      authorized: authorizedRef.current,
      generation: generationRef.current,
    };
    const nextLifecycle = transitionOperatorLifecycle(
      currentLifecycle,
      resolvedUserId,
    );
    authReadyRef.current = nextLifecycle.authReady;
    setAuthReady(nextLifecycle.authReady);
    if (nextLifecycle.generation === currentLifecycle.generation) {
      if (nextLifecycle.authReady) {
        setSending(activeSendingRef.current > 0);
        setClosing(activeClosingRef.current > 0);
      }
      return;
    }

    hasCommittedIdentityRef.current = nextLifecycle.hasCommittedOwner;
    generationRef.current = nextLifecycle.generation;
    identityRef.current = nextLifecycle.ownerId;
    authorizedRef.current = nextLifecycle.authorized;
    hasLoadedQueueRef.current = false;
    filterRef.current = "waiting_for_team";
    filterEpochRef.current += 1;
    conversationsRef.current = [];
    conversationEventsRef.current = [];
    conversationEventVersionRef.current = 0;
    selectedConversationIdRef.current = null;
    messagesRef.current = [];
    messageScopeRef.current = {
      conversationId: null,
      epoch: messageScopeRef.current.epoch + 1,
      messages: [],
      eventVersion: 0,
      events: [],
    };
    conversationRefreshesRef.current.clear();
    messageRefreshesRef.current.clear();
    accessChecksRef.current.clear();
    conversationQueueRef.current = createSerializedReconciliationQueue();
    messageQueueRef.current = createSerializedReconciliationQueue();
    pendingCloseRef.current.clear();
    actionPinRef.current = null;
    activeSendingRef.current = 0;
    activeClosingRef.current = 0;

    setStateUserId(nextLifecycle.ownerId);
    setAuthorized(nextLifecycle.authorized);
    setFilterState("waiting_for_team");
    setConversations([]);
    setSelectedConversationId(null);
    setMessages([]);
    setLoading(Boolean(nextLifecycle.ownerId));
    setMessagesLoading(false);
    setSending(false);
    setClosing(false);
    setActionLocked(false);
    setError(null);
    setConversationChannelState("idle");
    setMessageChannelState("idle");
    setMessageChannelConversationId(null);
  }, [resolvedUserId]);

  const checkAccess = useCallback((): Promise<boolean> => {
    const generation = generationRef.current;
    const ownerId = identityRef.current;
    if (!ownerId || !isCurrent(generation, ownerId)) {
      return Promise.reject(staleLifecycleError());
    }
    const key = `${generation}\u0000${ownerId}`;
    return coalesceOperation(accessChecksRef.current, key, async () => {
      assertCurrent(generation, ownerId);
      const { data, error: accessError } = await supabase.rpc("is_active_mentor_staff");
      assertCurrent(generation, ownerId);
      if (accessError) {
        invalidateAccess("access_check_failed");
        throw accessError;
      }
      const allowed = data === true;
      const committed = commitOperatorAuthorization(
        {
          hasCommittedOwner: hasCommittedIdentityRef.current,
          ownerId: identityRef.current,
          authReady: authReadyRef.current,
          authorized: authorizedRef.current,
          generation: generationRef.current,
        },
        generation,
        ownerId,
        allowed,
      );
      authorizedRef.current = committed.authorized;
      setAuthorized(allowed && !hasLoadedQueueRef.current ? null : allowed);
      setError((current) => (current === "access_check_failed" ? null : current));
      if (!allowed) {
        purgeVisibleData();
        setLoading(false);
      }
      return allowed;
    });
  }, [assertCurrent, invalidateAccess, isCurrent, purgeVisibleData, supabase]);

  const refreshConversations = useCallback(
    (
      showLoading = true,
      force = false,
      releasePin?: OperatorActionPin,
    ): Promise<void> => {
      const scope = currentQueueScope();
      if (!scope || !isQueueScopeCurrent(scope)) {
        return Promise.reject(staleLifecycleError());
      }
      const key = `${scope.generation}\u0000${scope.ownerId}\u0000${scope.filter}\u0000${scope.epoch}`;
      const runAuthoritativeRead = () =>
        coalesceOperation(conversationRefreshesRef.current, key, async () => {
          if (!isQueueScopeCurrent(scope)) throw staleLifecycleError();
          if (showLoading) setLoading(true);
          const startEventVersion = conversationEventVersionRef.current;
          const { data, error: queryError } = await supabase
            .from("mentor_conversations")
            .select("*")
            .eq("status", scope.filter)
            .order("last_message_at", { ascending: false });
          if (!isQueueScopeCurrent(scope)) throw staleLifecycleError();
          if (queryError) {
            setLoading(false);
            if (operatorBackendDeniedAccess(queryError)) {
              invalidateAccess("access_check_failed");
            } else {
              setError("load_failed");
            }
            throw queryError;
          }
          const rows = applyOperatorConversationSnapshot(
            (data ?? []) as MentorConversationRow[],
            conversationEventsRef.current.filter(
              (event) => event.version > startEventVersion,
            ),
            scope.filter,
          );
          if (!isQueueScopeCurrent(scope)) throw staleLifecycleError();
          conversationEventsRef.current = [];
          commitConversations(rows, releasePin);
          hasLoadedQueueRef.current = true;
          setAuthorized(true);
          setLoading(false);
          setError((current) => (current === "load_failed" ? null : current));
        });

      if (!force) return runAuthoritativeRead();
      const queue = conversationQueueRef.current;
      return queue.enqueue(async () => {
        if (!isQueueScopeCurrent(scope)) throw staleLifecycleError();
        const predecessor = conversationRefreshesRef.current.get(key);
        if (predecessor) {
          try {
            await predecessor;
          } catch {
            // The forced read is the successor reconciliation after a stale/failing read.
          }
          if (!isQueueScopeCurrent(scope)) throw staleLifecycleError();
          if (conversationRefreshesRef.current.get(key) === predecessor) {
            conversationRefreshesRef.current.delete(key);
          }
        }
        return runAuthoritativeRead();
      });
    },
    [
      commitConversations,
      currentQueueScope,
      invalidateAccess,
      isQueueScopeCurrent,
      supabase,
    ],
  );

  const refreshMessages = useCallback(
    (conversationId: string | null, force = false): Promise<void> => {
      const generation = generationRef.current;
      const ownerId = identityRef.current;
      const scope = messageScopeRef.current;
      if (!conversationId) {
        if (!isAuthorizedCurrent(generation, ownerId) || scope.conversationId !== null) {
          return Promise.reject(staleLifecycleError());
        }
        setMessagesLoading(false);
        return Promise.resolve();
      }
      if (
        !ownerId ||
        !isAuthorizedCurrent(generation, ownerId) ||
        scope.conversationId !== conversationId
      ) {
        return Promise.reject(staleLifecycleError());
      }
      const epoch = scope.epoch;
      const key = `${generation}\u0000${ownerId}\u0000${conversationId}\u0000${epoch}`;
      const runAuthoritativeRead = () =>
        coalesceOperation(messageRefreshesRef.current, key, async () => {
          assertAuthorizedCurrent(generation, ownerId);
          const currentScope = messageScopeRef.current;
          if (
            currentScope.conversationId !== conversationId ||
            currentScope.epoch !== epoch
          ) {
            throw staleLifecycleError();
          }
          setMessagesLoading(true);
          const startEventVersion = currentScope.eventVersion;
          const { data, error: queryError } = await supabase
            .from("mentor_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true });
          assertAuthorizedCurrent(generation, ownerId);
          const latestScope = messageScopeRef.current;
          if (
            latestScope.conversationId !== conversationId ||
            latestScope.epoch !== epoch
          ) {
            throw staleLifecycleError();
          }
          if (queryError) {
            setMessagesLoading(false);
            if (operatorBackendDeniedAccess(queryError)) {
              invalidateAccess("access_check_failed");
            } else {
              setError("messages_load_failed");
            }
            throw queryError;
          }
          const rows = applyAuthoritativeMessageSnapshot(
            ((data ?? []) as MentorMessageRow[]).filter(
              (row) => row.conversation_id === conversationId,
            ),
            latestScope.events.filter((event) => event.version > startEventVersion),
            mergeMentorMessages,
          );
          latestScope.events = [];
          commitMessages(conversationId, epoch, rows);
          setMessagesLoading(false);
          setError(clearMentorMessageLoadError);
        });

      if (!force) return runAuthoritativeRead();
      const queue = messageQueueRef.current;
      return queue.enqueue(async () => {
        assertAuthorizedCurrent(generation, ownerId);
        if (
          messageScopeRef.current.conversationId !== conversationId ||
          messageScopeRef.current.epoch !== epoch
        ) {
          throw staleLifecycleError();
        }
        const predecessor = messageRefreshesRef.current.get(key);
        if (predecessor) {
          try {
            await predecessor;
          } catch {
            // Retry after the predecessor has settled.
          }
          assertAuthorizedCurrent(generation, ownerId);
          if (
            messageScopeRef.current.conversationId !== conversationId ||
            messageScopeRef.current.epoch !== epoch
          ) {
            throw staleLifecycleError();
          }
          if (messageRefreshesRef.current.get(key) === predecessor) {
            messageRefreshesRef.current.delete(key);
          }
        }
        return runAuthoritativeRead();
      });
    },
    [
      assertAuthorizedCurrent,
      commitMessages,
      invalidateAccess,
      isAuthorizedCurrent,
      supabase,
    ],
  );

  useEffect(() => {
    if (!identityReady) return;
    const generation = generationRef.current;
    const ownerId = identityRef.current;
    if (!ownerId) {
      authorizedRef.current = false;
      setAuthorized(false);
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        setLoading(true);
        await runAuthorizedOperatorRefresh({
          checkAccess,
          assertCurrent: () => assertCurrent(generation, ownerId),
          refreshConversations: () => refreshConversations(true, true),
        });
      } catch {
        // Stable UI state is set at the failing boundary.
      }
    })();
  }, [assertCurrent, checkAccess, identityReady, refreshConversations, stateUserId]);

  useEffect(() => {
    if (!accessReady) return;
    void refreshMessages(visibleSelectedConversationId).catch(() => undefined);
  }, [accessReady, refreshMessages, visibleSelectedConversationId]);

  useEffect(() => {
    const scope = currentQueueScope();
    if (!accessReady || !scope || !isQueueScopeCurrent(scope)) {
      setConversationChannelState("idle");
      return;
    }
    let active = true;
    const stop = startOperatorRealtimeSubscription({
      setAuth: () => supabase.realtime.setAuth(),
      isCurrent: () => active && isQueueScopeCurrent(scope),
      createChannel: () => {
        const handleConversationChange = (
          type: "INSERT" | "UPDATE",
          row: MentorConversationRow,
        ) => {
          if (!active || !isQueueScopeCurrent(scope)) return;
          const version = ++conversationEventVersionRef.current;
          const event: ConversationEvent<MentorConversationRow> = { version, type, row };
          conversationEventsRef.current.push(event);
          commitConversations(
            applyOperatorConversationSnapshot(
              conversationsRef.current,
              [event],
              scope.filter,
            ),
          );
          void refreshConversations(false).catch(() => undefined);
        };
        return supabase
          .channel(
            `mentor-operator-conversations:${scope.ownerId}:${scope.filter}:${scope.epoch}:${realtimeGeneration}`,
          )
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "mentor_conversations" },
            (payload) => {
              handleConversationChange("INSERT", payload.new as MentorConversationRow);
            },
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "mentor_conversations" },
            (payload) => {
              handleConversationChange("UPDATE", payload.new as MentorConversationRow);
            },
          );
      },
      subscribe: (channel, onStatus) => {
        channel.subscribe((status) => onStatus(status as OperatorRealtimeStatus));
      },
      removeChannel: (channel) => supabase.removeChannel(channel),
      setState: setConversationChannelState,
      reconcileAfterSubscribed: () => refreshConversations(false, true),
    });

    return () => {
      active = false;
      stop();
    };
  }, [
    accessReady,
    commitConversations,
    currentQueueScope,
    filter,
    isQueueScopeCurrent,
    realtimeGeneration,
    refreshConversations,
    stateUserId,
    supabase,
  ]);

  useEffect(() => {
    const generation = generationRef.current;
    const ownerId = identityRef.current;
    const conversationId = visibleSelectedConversationId;
    if (!accessReady || !ownerId || !conversationId) {
      setMessageChannelConversationId(null);
      setMessageChannelState("idle");
      return;
    }
    const epoch = messageScopeRef.current.epoch;
    let active = true;
    setMessageChannelConversationId(conversationId);
    const stop = startOperatorRealtimeSubscription({
      setAuth: () => supabase.realtime.setAuth(),
      isCurrent: () => active && isAuthorizedCurrent(generation, ownerId),
      createChannel: () =>
        supabase
          .channel(
            `mentor-operator-messages:${ownerId}:${conversationId}:${epoch}:${realtimeGeneration}`,
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "mentor_messages",
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
              const scope = messageScopeRef.current;
              if (
                !active ||
                !isAuthorizedCurrent(generation, ownerId) ||
                scope.conversationId !== conversationId ||
                scope.epoch !== epoch
              ) {
                return;
              }
              const row = payload.new as MentorMessageRow;
              const version = ++scope.eventVersion;
              scope.events.push({ version, row });
              commitMessages(
                conversationId,
                epoch,
                mergeMentorMessages(scope.messages, [row]),
              );
            },
          ),
      subscribe: (channel, onStatus) => {
        channel.subscribe((status) => onStatus(status as OperatorRealtimeStatus));
      },
      removeChannel: (channel) => supabase.removeChannel(channel),
      setState: (nextState) => {
        setMessageChannelConversationId(conversationId);
        setMessageChannelState(nextState);
      },
      reconcileAfterSubscribed: () => refreshMessages(conversationId, true),
    });

    return () => {
      active = false;
      stop();
    };
  }, [
    accessReady,
    commitMessages,
    isAuthorizedCurrent,
    realtimeGeneration,
    refreshMessages,
    stateUserId,
    supabase,
    visibleSelectedConversationId,
  ]);

  const setFilter = useCallback(
    (nextFilter: MentorConversationStatus) => {
      if (filterRef.current === nextFilter) return;
      if (actionPinRef.current?.inFlight) return;
      actionPinRef.current = null;
      filterRef.current = nextFilter;
      filterEpochRef.current += 1;
      conversationEventsRef.current = [];
      conversationEventVersionRef.current = 0;
      conversationRefreshesRef.current.clear();
      conversationQueueRef.current = createSerializedReconciliationQueue();
      conversationsRef.current = [];
      setFilterState(nextFilter);
      setConversations([]);
      transitionSelection(null);
      setLoading(false);
      setError((current) => (current === "load_failed" ? null : current));
      if (authorizedRef.current === true) {
        void Promise.resolve().then(() => refreshConversations(false, true)).catch(() => undefined);
      }
    },
    [refreshConversations, transitionSelection],
  );

  const selectConversation = useCallback(
    (conversationId: string | null) => {
      if (actionPinRef.current?.inFlight) return;
      if (
        conversationId &&
        !conversationsRef.current.some((conversation) => conversation.id === conversationId)
      ) {
        return;
      }
      if (
        actionPinRef.current &&
        actionPinRef.current.conversation.id !== conversationId
      ) {
        actionPinRef.current = null;
        void refreshConversations(false, true).catch(() => undefined);
      }
      transitionSelection(conversationId);
    },
    [refreshConversations, transitionSelection],
  );

  const releaseDefinitiveActionPin = useCallback(
    async (pin: OperatorActionPin) => {
      pin.inFlight = false;
      if (actionPinRef.current !== pin) return;
      actionPinRef.current = null;
      if (
        !pinMatchesCurrentScope(pin) ||
        !isAuthorizedCurrent(pin.generation, pin.ownerId)
      ) {
        return;
      }
      commitConversations(
        applyOperatorConversationSnapshot(
          conversationsRef.current,
          conversationEventsRef.current,
          filterRef.current,
        ),
      );
      try {
        await refreshConversations(false, true);
      } catch {
        // The domain rejection is still definitive; a later retry can refresh the queue.
      }
    },
    [
      commitConversations,
      isAuthorizedCurrent,
      pinMatchesCurrentScope,
      refreshConversations,
    ],
  );

  const sendReply = useCallback(
    async (body: string) => {
      const generation = generationRef.current;
      const ownerId = identityRef.current;
      const conversation = selectedConversation;
      if (!ownerId || !isAuthorizedCurrent(generation, ownerId)) {
        throw new Error("staff_access_required");
      }
      if (!conversation || conversation.status === "closed") {
        throw new Error("conversation_closed");
      }
      const key = `${conversation.id}\u0000${body}`;
      const existingOperation = pendingReplyRef.current.get(ownerId, key);
      if (existingOperation?.promise) return existingOperation.promise;
      if (actionPinRef.current?.inFlight) {
        throw new Error("mentor_operator_action_in_progress");
      }
      const operation =
        existingOperation ??
        pendingReplyRef.current.getOrCreate(
          ownerId,
          key,
          () => crypto.randomUUID(),
        );
      const pin: OperatorActionPin = {
        kind: "reply",
        generation,
        ownerId,
        filter: filterRef.current,
        filterEpoch: filterEpochRef.current,
        conversation,
        inFlight: true,
      };
      actionPinRef.current = pin;
      setActionLocked(true);

      const promise = Promise.resolve().then(async () => {
        activeSendingRef.current += 1;
        if (isAuthorizedCurrent(generation, ownerId)) {
          setSending(true);
          setError((current) => (current === "send_failed" ? null : current));
        }
        try {
          const { error: rpcError } = await supabase.rpc("send_staff_mentor_message", {
            p_conversation_id: conversation.id,
            p_body: body,
            p_client_nonce: operation.nonce,
          });
          if (rpcError) throw rpcError;
          assertAuthorizedCurrent(generation, ownerId);
          await refreshMessages(conversation.id, true);
          assertAuthorizedCurrent(generation, ownerId);
          await refreshConversations(false, true, pin);
          assertAuthorizedCurrent(generation, ownerId);
          pendingReplyRef.current.deleteIfSame(ownerId, key, operation);
          setError((current) => (current === "send_failed" ? null : current));
        } catch (actionError) {
          pin.inFlight = false;
          const resolution = await handleOperatorMutationFailure(actionError, {
            discardRetryNonce: () =>
              pendingReplyRef.current.deleteIfSame(ownerId, key, operation),
            releasePinAndReconcile: () => releaseDefinitiveActionPin(pin),
            invalidateAccess: () => invalidateAccess("access_check_failed"),
          });
          if (
            resolution.kind !== "access_denied" &&
            isAuthorizedCurrent(generation, ownerId)
          ) {
            setError("send_failed");
          }
          throw actionError;
        } finally {
          pendingReplyRef.current.releasePromiseIfSame(ownerId, key, operation);
          if (isCommittedOwner(generation, ownerId)) {
            activeSendingRef.current -= 1;
            if (authReadyRef.current) setSending(activeSendingRef.current > 0);
            if (actionPinRef.current === pin) pin.inFlight = false;
            setActionLocked(Boolean(actionPinRef.current?.inFlight));
          }
        }
      });
      operation.promise = promise;
      return promise;
    },
    [
      assertAuthorizedCurrent,
      invalidateAccess,
      isAuthorizedCurrent,
      isCommittedOwner,
      releaseDefinitiveActionPin,
      refreshConversations,
      refreshMessages,
      selectedConversation,
      supabase,
    ],
  );

  const closeConversation = useCallback(async () => {
    const generation = generationRef.current;
    const ownerId = identityRef.current;
    const conversation = selectedConversation;
    if (!ownerId || !isAuthorizedCurrent(generation, ownerId)) {
      throw new Error("staff_access_required");
    }
    if (!conversation || conversation.status === "closed") {
      throw new Error("conversation_closed");
    }
    const closeKey = `${ownerId}\u0000${conversation.id}`;
    const existing = pendingCloseRef.current.get(closeKey);
    if (existing) return existing;
    if (actionPinRef.current?.inFlight) {
      throw new Error("mentor_operator_action_in_progress");
    }
    const pin: OperatorActionPin = {
      kind: "close",
      generation,
      ownerId,
      filter: filterRef.current,
      filterEpoch: filterEpochRef.current,
      conversation,
      inFlight: true,
    };
    actionPinRef.current = pin;
    setActionLocked(true);

    const promise = Promise.resolve().then(async () => {
      activeClosingRef.current += 1;
      if (isAuthorizedCurrent(generation, ownerId)) {
        setClosing(true);
        setError((current) => (current === "close_failed" ? null : current));
      }
      try {
        const { error: rpcError } = await supabase.rpc("close_volunteer_conversation", {
          p_conversation_id: conversation.id,
        });
        if (rpcError) throw rpcError;
        assertAuthorizedCurrent(generation, ownerId);
        await refreshConversations(false, true, pin);
        assertAuthorizedCurrent(generation, ownerId);
        setError((current) => (current === "close_failed" ? null : current));
      } catch (actionError) {
        pin.inFlight = false;
        const resolution = await handleOperatorMutationFailure(actionError, {
          releasePinAndReconcile: () => releaseDefinitiveActionPin(pin),
          invalidateAccess: () => invalidateAccess("access_check_failed"),
        });
        if (
          resolution.kind !== "access_denied" &&
          isAuthorizedCurrent(generation, ownerId)
        ) {
          setError("close_failed");
        }
        throw actionError;
      } finally {
        if (pendingCloseRef.current.get(closeKey) === promise) {
          pendingCloseRef.current.delete(closeKey);
        }
        if (isCommittedOwner(generation, ownerId)) {
          activeClosingRef.current -= 1;
          if (authReadyRef.current) setClosing(activeClosingRef.current > 0);
          if (actionPinRef.current === pin) pin.inFlight = false;
          setActionLocked(Boolean(actionPinRef.current?.inFlight));
        }
      }
    });
    pendingCloseRef.current.set(closeKey, promise);
    return promise;
  }, [
    assertAuthorizedCurrent,
    invalidateAccess,
    isAuthorizedCurrent,
    isCommittedOwner,
    releaseDefinitiveActionPin,
    refreshConversations,
    selectedConversation,
    supabase,
  ]);

  const reload = useCallback(async () => {
    const generation = generationRef.current;
    const ownerId = identityRef.current;
    assertCurrent(generation, ownerId);
    if (!ownerId) throw new Error("staff_access_required");
    setError(null);
    setLoading(true);
    await runOperatorInboxReload({
      checkAccess,
      assertCurrent: () => assertCurrent(generation, ownerId),
      refreshConversations: () => refreshConversations(true, true),
      requestRealtimeReconnect: () =>
        setRealtimeGeneration((current) => current + 1),
      refreshMessages: () =>
        refreshMessages(selectedConversationIdRef.current, true),
    });
  }, [
    assertCurrent,
    checkAccess,
    refreshConversations,
    refreshMessages,
  ]);

  return {
    authorized: identityReady ? authorized : resolvedUserId === null ? false : null,
    conversations: visibleConversations,
    selectedConversation,
    messages: visibleMessages,
    filter,
    loading: resolvedUserId === undefined ? true : identityReady ? loading : Boolean(resolvedUserId),
    messagesLoading: accessReady ? messagesLoading : false,
    sending: accessReady ? sending : false,
    closing: accessReady ? closing : false,
    actionLocked: accessReady ? actionLocked : false,
    error: identityReady ? error : null,
    realtimeState,
    setFilter,
    selectConversation,
    sendReply,
    closeConversation,
    reload,
  };
}
