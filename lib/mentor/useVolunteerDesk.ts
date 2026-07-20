"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

import {
  mergeMentorMessages,
  type MentorRealtimeState,
  type VolunteerTopicId,
} from "@/lib/mentor/volunteer";
import {
  applyAuthoritativeConversationSnapshot,
  applyAuthoritativeMessageSnapshot,
  coalesceOperation,
  createOwnerScopedNonceRegistry,
  createSerializedReconciliationQueue,
  deriveMentorRealtimeState,
  transitionCommittedAuth,
  transitionMessageScope,
  type ConversationEvent,
  type MentorChannelState,
} from "@/lib/mentor/volunteerDeskState";
import { useMentorSupabaseClient } from "@/lib/mentor/useMentorSupabaseClient";
import type { MentorConversationRow, MentorMessageRow } from "@/types";

interface MessageScope {
  conversationId: string | null;
  epoch: number;
  messages: MentorMessageRow[];
  eventVersion: number;
  events: Array<{ version: number; row: MentorMessageRow }>;
}

export interface UseVolunteerDeskResult {
  openConversation: MentorConversationRow | null;
  closedConversations: MentorConversationRow[];
  selectedConversation: MentorConversationRow | null;
  messages: MentorMessageRow[];
  loading: boolean;
  messagesLoading: boolean;
  sending: boolean;
  closing: boolean;
  error: string | null;
  realtimeState: MentorRealtimeState;
  selectConversation: (conversationId: string | null) => void;
  startConversation: (topic: VolunteerTopicId, body: string) => Promise<void>;
  sendMessage: (body: string) => Promise<void>;
  closeConversation: (conversationId: string) => Promise<void>;
  reload: () => Promise<void>;
}

function rpcUuid(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("mentor_rpc_invalid_response");
  }
  return value;
}

function staleLifecycleError(): Error {
  return new Error("mentor_lifecycle_stale");
}

export function useVolunteerDesk(): UseVolunteerDeskResult {
  const { user, isLoaded } = useUser();
  const resolvedUserId = isLoaded ? user?.id ?? null : undefined;
  const supabase = useMentorSupabaseClient();
  const mountedRef = useRef(false);
  const identityRef = useRef<string | null>(null);
  const hasCommittedIdentityRef = useRef(false);
  const authReadyRef = useRef(false);
  const generationRef = useRef(0);
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
  const pendingStartRef = useRef(createOwnerScopedNonceRegistry());
  const pendingSendRef = useRef(createOwnerScopedNonceRegistry());
  const pendingCloseRef = useRef(new Map<string, Promise<void>>());
  const activeSendingRef = useRef(0);
  const activeClosingRef = useRef(0);

  const [stateUserId, setStateUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [conversations, setConversations] = useState<MentorConversationRow[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MentorMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationChannelState, setConversationChannelState] =
    useState<MentorChannelState>("idle");
  const [messageChannelState, setMessageChannelState] =
    useState<MentorChannelState>("idle");
  const [messageChannelConversationId, setMessageChannelConversationId] =
    useState<string | null>(null);

  const identityReady =
    authReady && resolvedUserId !== undefined && stateUserId === resolvedUserId;
  const visibleConversations = identityReady ? conversations : [];
  const visibleSelectedConversationId = identityReady ? selectedConversationId : null;
  const visibleMessages =
    identityReady && messageScopeRef.current.conversationId === visibleSelectedConversationId
      ? messages
      : [];
  const openConversation =
    visibleConversations.find((conversation) => conversation.status !== "closed") ?? null;
  const closedConversations = visibleConversations.filter(
    (conversation) => conversation.status === "closed",
  );
  const selectedConversation =
    visibleConversations.find(
      (conversation) => conversation.id === visibleSelectedConversationId,
    ) ?? null;
  const realtimeState = deriveMentorRealtimeState(
    Boolean(resolvedUserId && identityReady),
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

  const assertCurrent = useCallback(
    (generation: number, ownerId: string | null) => {
      if (!isCurrent(generation, ownerId)) throw staleLifecycleError();
    },
    [isCurrent],
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
    return true;
  }, []);

  const commitConversations = useCallback(
    (rows: MentorConversationRow[]) => {
      conversationsRef.current = rows;
      setConversations(rows);
      const current = selectedConversationIdRef.current;
      const selectedId =
        current && rows.some((conversation) => conversation.id === current)
          ? current
          : rows.find((conversation) => conversation.status !== "closed")?.id ?? null;
      transitionSelection(selectedId);
    },
    [transitionSelection],
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

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  useLayoutEffect(() => {
    const authTransition = transitionCommittedAuth(
      {
        hasCommittedOwner: hasCommittedIdentityRef.current,
        ownerId: identityRef.current,
        ready: authReadyRef.current,
      },
      resolvedUserId,
    );
    authReadyRef.current = authTransition.ready;
    setAuthReady(authTransition.ready);
    if (!authTransition.commitOwner) {
      if (authTransition.ready) {
        setSending(activeSendingRef.current > 0);
        setClosing(activeClosingRef.current > 0);
      }
      return;
    }
    hasCommittedIdentityRef.current = true;
    generationRef.current += 1;
    identityRef.current = authTransition.ownerId;
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
    conversationQueueRef.current = createSerializedReconciliationQueue();
    messageQueueRef.current = createSerializedReconciliationQueue();
    pendingCloseRef.current.clear();
    activeSendingRef.current = 0;
    activeClosingRef.current = 0;
    setConversations([]);
    setSelectedConversationId(null);
    setMessages([]);
    setLoading(Boolean(authTransition.ownerId));
    setMessagesLoading(false);
    setSending(false);
    setClosing(false);
    setError(null);
    setConversationChannelState(authTransition.ownerId ? "connecting" : "idle");
    setMessageChannelState("idle");
    setMessageChannelConversationId(null);
    setStateUserId(authTransition.ownerId);
  }, [resolvedUserId]);

  const refreshConversations = useCallback(
    (showLoading = true, force = false): Promise<void> => {
      const generation = generationRef.current;
      const ownerId = identityRef.current;
      if (!ownerId) {
        if (!isCurrent(generation, ownerId)) return Promise.reject(staleLifecycleError());
        commitConversations([]);
        setLoading(false);
        return Promise.resolve();
      }
      const key = `${generation}\u0000${ownerId}`;
      const runAuthoritativeRead = () =>
        coalesceOperation(conversationRefreshesRef.current, key, async () => {
          assertCurrent(generation, ownerId);
          if (showLoading) setLoading(true);
          const startEventVersion = conversationEventVersionRef.current;
          const { data, error: queryError } = await supabase
            .from("mentor_conversations")
            .select("*")
            .eq("user_id", ownerId)
            .order("last_message_at", { ascending: false });
          assertCurrent(generation, ownerId);
          if (queryError) {
            setError("load_failed");
            setLoading(false);
            throw queryError;
          }
          const postStartEvents = conversationEventsRef.current.filter(
            (event) => event.version > startEventVersion,
          );
          const rows = applyAuthoritativeConversationSnapshot(
            (data ?? []) as MentorConversationRow[],
            postStartEvents,
          );
          conversationEventsRef.current = [];
          commitConversations(rows);
          setError(null);
          setLoading(false);
        });

      if (!force) return runAuthoritativeRead();
      const queue = conversationQueueRef.current;
      return queue.enqueue(async () => {
        assertCurrent(generation, ownerId);
        const predecessor = conversationRefreshesRef.current.get(key);
        if (predecessor) {
          try {
            await predecessor;
          } catch {
            // A forced read is the successor reconciliation after a prior failure.
          }
          assertCurrent(generation, ownerId);
          if (conversationRefreshesRef.current.get(key) === predecessor) {
            conversationRefreshesRef.current.delete(key);
          }
        }
        return runAuthoritativeRead();
      });
    },
    [assertCurrent, commitConversations, isCurrent, supabase],
  );

  const refreshMessages = useCallback(
    (conversationId: string | null, force = false): Promise<void> => {
      const generation = generationRef.current;
      const ownerId = identityRef.current;
      const scope = messageScopeRef.current;
      if (!conversationId) {
        if (!isCurrent(generation, ownerId)) return Promise.reject(staleLifecycleError());
        if (scope.conversationId !== null) return Promise.reject(staleLifecycleError());
        setMessagesLoading(false);
        return Promise.resolve();
      }
      if (!ownerId || scope.conversationId !== conversationId) {
        return Promise.reject(staleLifecycleError());
      }
      const epoch = scope.epoch;
      const key = `${generation}\u0000${ownerId}\u0000${conversationId}\u0000${epoch}`;
      const runAuthoritativeRead = () =>
        coalesceOperation(messageRefreshesRef.current, key, async () => {
          assertCurrent(generation, ownerId);
          if (
            messageScopeRef.current.conversationId !== conversationId ||
            messageScopeRef.current.epoch !== epoch
          ) {
            throw staleLifecycleError();
          }
          setMessagesLoading(true);
          const startEventVersion = messageScopeRef.current.eventVersion;
          const { data, error: queryError } = await supabase
            .from("mentor_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true });
          assertCurrent(generation, ownerId);
          const currentScope = messageScopeRef.current;
          if (
            currentScope.conversationId !== conversationId ||
            currentScope.epoch !== epoch
          ) {
            throw staleLifecycleError();
          }
          if (queryError) {
            setError("messages_load_failed");
            setMessagesLoading(false);
            throw queryError;
          }
          const postStartEvents = currentScope.events.filter(
            (event) => event.version > startEventVersion,
          );
          const rows = applyAuthoritativeMessageSnapshot(
            ((data ?? []) as MentorMessageRow[]).filter(
              (row) => row.conversation_id === conversationId,
            ),
            postStartEvents,
            mergeMentorMessages,
          );
          currentScope.events = [];
          commitMessages(conversationId, epoch, rows);
          setMessagesLoading(false);
        });

      if (!force) return runAuthoritativeRead();
      const queue = messageQueueRef.current;
      return queue.enqueue(async () => {
        assertCurrent(generation, ownerId);
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
            // The queued forced read retries after a failed predecessor.
          }
          assertCurrent(generation, ownerId);
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
    [assertCurrent, commitMessages, isCurrent, supabase],
  );

  useEffect(() => {
    if (!isLoaded || !identityReady) return;
    void refreshConversations().catch(() => undefined);
  }, [identityReady, isLoaded, refreshConversations]);

  useEffect(() => {
    if (!identityReady) return;
    void refreshMessages(visibleSelectedConversationId).catch(() => undefined);
  }, [identityReady, refreshMessages, visibleSelectedConversationId]);

  useEffect(() => {
    const generation = generationRef.current;
    const ownerId = identityRef.current;
    if (!identityReady || !ownerId) {
      setConversationChannelState("idle");
      return;
    }
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      if (isCurrent(generation, ownerId)) setConversationChannelState("connecting");
      try {
        await supabase.realtime.setAuth();
        if (!active || !isCurrent(generation, ownerId)) return;
        channel = supabase
          .channel(`mentor-conversations:${ownerId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "mentor_conversations",
              filter: `user_id=eq.${ownerId}`,
            },
            (payload) => {
              if (!active || !isCurrent(generation, ownerId)) return;
              const version = ++conversationEventVersionRef.current;
              if (payload.eventType === "DELETE") {
                const id = (payload.old as { id?: string }).id;
                if (id) {
                  conversationEventsRef.current.push({ version, type: "DELETE", id });
                  commitConversations(
                    applyAuthoritativeConversationSnapshot(conversationsRef.current, [
                      { version, type: "DELETE", id },
                    ]),
                  );
                }
              } else {
                const row = payload.new as MentorConversationRow;
                conversationEventsRef.current.push({
                  version,
                  type: payload.eventType === "INSERT" ? "INSERT" : "UPDATE",
                  row,
                });
                commitConversations(
                  applyAuthoritativeConversationSnapshot(conversationsRef.current, [
                    {
                      version,
                      type: payload.eventType === "INSERT" ? "INSERT" : "UPDATE",
                      row,
                    },
                  ]),
                );
              }
              void refreshConversations(false).catch(() => undefined);
            },
          )
          .subscribe((status) => {
            if (!active || !isCurrent(generation, ownerId)) return;
            if (status === "SUBSCRIBED") {
              setConversationChannelState("connected");
              void refreshConversations(false).catch(() => undefined);
            }
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setConversationChannelState("disconnected");
            }
          });
      } catch {
        if (active && isCurrent(generation, ownerId)) {
          setConversationChannelState("disconnected");
        }
      }
    };

    void subscribe();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [
    commitConversations,
    identityReady,
    isCurrent,
    refreshConversations,
    supabase,
    stateUserId,
  ]);

  useEffect(() => {
    const generation = generationRef.current;
    const ownerId = identityRef.current;
    const conversationId = visibleSelectedConversationId;
    if (!identityReady || !ownerId || !conversationId) {
      setMessageChannelConversationId(null);
      setMessageChannelState("idle");
      return;
    }
    const epoch = messageScopeRef.current.epoch;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      if (isCurrent(generation, ownerId)) {
        setMessageChannelConversationId(conversationId);
        setMessageChannelState("connecting");
      }
      try {
        await supabase.realtime.setAuth();
        if (!active || !isCurrent(generation, ownerId)) return;
        channel = supabase
          .channel(`mentor-messages:${conversationId}`)
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
                !isCurrent(generation, ownerId) ||
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
          )
          .subscribe((status) => {
            if (!active || !isCurrent(generation, ownerId)) return;
            if (status === "SUBSCRIBED") {
              setMessageChannelConversationId(conversationId);
              setMessageChannelState("connected");
              void refreshMessages(conversationId).catch(() => undefined);
            }
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setMessageChannelState("disconnected");
            }
          });
      } catch {
        if (active && isCurrent(generation, ownerId)) {
          setMessageChannelState("disconnected");
        }
      }
    };

    void subscribe();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [
    commitMessages,
    identityReady,
    isCurrent,
    refreshMessages,
    supabase,
    stateUserId,
    visibleSelectedConversationId,
  ]);

  const startConversation = useCallback(
    async (topic: VolunteerTopicId, body: string) => {
      const generation = generationRef.current;
      const ownerId = identityRef.current;
      if (!ownerId || !isCurrent(generation, ownerId)) {
        throw new Error("authentication_required");
      }
      const displayName = user?.fullName?.trim() || user?.firstName?.trim() || "Öğrenci";
      const key = `${topic}\u0000${body}`;
      const operation = pendingStartRef.current.getOrCreate(
        ownerId,
        key,
        () => crypto.randomUUID(),
      );
      if (operation.promise) return operation.promise;
      const promise = Promise.resolve().then(async () => {
        activeSendingRef.current += 1;
        if (isCurrent(generation, ownerId)) {
          setSending(true);
          setError(null);
        }
        try {
          const { data, error: rpcError } = await supabase.rpc("start_volunteer_conversation", {
            p_topic: topic,
            p_display_name: displayName,
            p_body: body,
            p_client_nonce: operation.nonce,
          });
          if (rpcError) throw rpcError;
          assertCurrent(generation, ownerId);
          const conversationId = rpcUuid(data);
          await refreshConversations(false, true);
          assertCurrent(generation, ownerId);
          transitionSelection(conversationId);
          await refreshMessages(conversationId, true);
          assertCurrent(generation, ownerId);
          pendingStartRef.current.deleteIfSame(ownerId, key, operation);
        } catch (actionError) {
          if (isCurrent(generation, ownerId)) setError("send_failed");
          throw actionError;
        } finally {
          pendingStartRef.current.releasePromiseIfSame(ownerId, key, operation);
          if (isCommittedOwner(generation, ownerId)) {
            activeSendingRef.current -= 1;
            if (authReadyRef.current) setSending(activeSendingRef.current > 0);
          }
        }
      });
      operation.promise = promise;
      return promise;
    },
    [
      assertCurrent,
      isCommittedOwner,
      isCurrent,
      refreshConversations,
      refreshMessages,
      supabase,
      transitionSelection,
      user?.firstName,
      user?.fullName,
    ],
  );

  const sendMessage = useCallback(
    async (body: string) => {
      const generation = generationRef.current;
      const ownerId = identityRef.current;
      const conversation = selectedConversation;
      if (!ownerId || !isCurrent(generation, ownerId)) {
        throw new Error("authentication_required");
      }
      if (!conversation || conversation.status === "closed") {
        throw new Error("conversation_closed");
      }
      const key = `${conversation.id}\u0000${body}`;
      const operation = pendingSendRef.current.getOrCreate(
        ownerId,
        key,
        () => crypto.randomUUID(),
      );
      if (operation.promise) return operation.promise;
      const promise = Promise.resolve().then(async () => {
        activeSendingRef.current += 1;
        if (isCurrent(generation, ownerId)) {
          setSending(true);
          setError(null);
        }
        try {
          const { error: rpcError } = await supabase.rpc("send_student_mentor_message", {
            p_conversation_id: conversation.id,
            p_body: body,
            p_client_nonce: operation.nonce,
          });
          if (rpcError) throw rpcError;
          assertCurrent(generation, ownerId);
          await Promise.all([
            refreshConversations(false, true),
            refreshMessages(conversation.id, true),
          ]);
          assertCurrent(generation, ownerId);
          pendingSendRef.current.deleteIfSame(ownerId, key, operation);
        } catch (actionError) {
          if (isCurrent(generation, ownerId)) setError("send_failed");
          throw actionError;
        } finally {
          pendingSendRef.current.releasePromiseIfSame(ownerId, key, operation);
          if (isCommittedOwner(generation, ownerId)) {
            activeSendingRef.current -= 1;
            if (authReadyRef.current) setSending(activeSendingRef.current > 0);
          }
        }
      });
      operation.promise = promise;
      return promise;
    },
    [
      assertCurrent,
      isCommittedOwner,
      isCurrent,
      refreshConversations,
      refreshMessages,
      selectedConversation,
      supabase,
    ],
  );

  const closeConversation = useCallback(
    async (conversationId: string) => {
      const generation = generationRef.current;
      const ownerId = identityRef.current;
      if (!ownerId || !isCurrent(generation, ownerId)) {
        throw new Error("authentication_required");
      }
      const existing = pendingCloseRef.current.get(conversationId);
      if (existing) return existing;
      const promise = Promise.resolve().then(async () => {
        activeClosingRef.current += 1;
        if (isCurrent(generation, ownerId)) {
          setClosing(true);
          setError(null);
        }
        try {
          const { error: rpcError } = await supabase.rpc("close_volunteer_conversation", {
            p_conversation_id: conversationId,
          });
          if (rpcError) throw rpcError;
          assertCurrent(generation, ownerId);
          await refreshConversations(false, true);
          assertCurrent(generation, ownerId);
          transitionSelection(conversationId);
        } catch (actionError) {
          if (isCurrent(generation, ownerId)) setError("close_failed");
          throw actionError;
        } finally {
          if (pendingCloseRef.current.get(conversationId) === promise) {
            pendingCloseRef.current.delete(conversationId);
          }
          if (isCommittedOwner(generation, ownerId)) {
            activeClosingRef.current -= 1;
            if (authReadyRef.current) setClosing(activeClosingRef.current > 0);
          }
        }
      });
      pendingCloseRef.current.set(conversationId, promise);
      return promise;
    },
    [
      assertCurrent,
      isCommittedOwner,
      isCurrent,
      refreshConversations,
      supabase,
      transitionSelection,
    ],
  );

  const reload = useCallback(async () => {
    const generation = generationRef.current;
    const ownerId = identityRef.current;
    assertCurrent(generation, ownerId);
    setError(null);
    await refreshConversations(true, true);
    assertCurrent(generation, ownerId);
    await refreshMessages(selectedConversationIdRef.current, true);
  }, [assertCurrent, refreshConversations, refreshMessages]);

  return {
    openConversation,
    closedConversations,
    selectedConversation,
    messages: visibleMessages,
    loading: resolvedUserId === undefined ? true : identityReady ? loading : Boolean(resolvedUserId),
    messagesLoading: identityReady ? messagesLoading : false,
    sending: identityReady ? sending : false,
    closing: identityReady ? closing : false,
    error: identityReady ? error : null,
    realtimeState,
    selectConversation: transitionSelection,
    startConversation,
    sendMessage,
    closeConversation,
    reload,
  };
}
