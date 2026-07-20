"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

import {
  mergeMentorMessages,
  type MentorRealtimeState,
  type VolunteerTopicId,
} from "@/lib/mentor/volunteer";
import {
  deriveMentorRealtimeState,
  mergeConversationRealtime,
  mergeConversationSnapshot,
  mergeMessageSnapshot,
  type MentorChannelState,
} from "@/lib/mentor/volunteerDeskState";
import { useMentorSupabaseClient } from "@/lib/mentor/useMentorSupabaseClient";
import type { MentorConversationRow, MentorMessageRow } from "@/types";

interface PendingOperation {
  nonce: string;
  promise?: Promise<void>;
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

export function useVolunteerDesk(): UseVolunteerDeskResult {
  const { user, isLoaded } = useUser();
  const userId = isLoaded ? user?.id ?? null : null;
  const supabase = useMentorSupabaseClient();
  const identityRef = useRef<string | null>(userId);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const conversationsRef = useRef<MentorConversationRow[]>([]);
  const messagesRef = useRef<MentorMessageRow[]>([]);
  const selectedConversationIdRef = useRef<string | null>(null);
  const conversationRequestRef = useRef(0);
  const messageRequestRef = useRef(0);
  const pendingStartRef = useRef(new Map<string, PendingOperation>());
  const pendingSendRef = useRef(new Map<string, PendingOperation>());
  const pendingCloseRef = useRef(new Map<string, Promise<void>>());
  const activeSendingRef = useRef(0);
  const activeClosingRef = useRef(0);

  if (identityRef.current !== userId) {
    identityRef.current = userId;
    generationRef.current += 1;
  }

  const [stateUserId, setStateUserId] = useState<string | null>(userId);
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

  const identityReady = stateUserId === userId;
  const visibleConversations = identityReady ? conversations : [];
  const visibleMessages = identityReady ? messages : [];
  const visibleSelectedConversationId = identityReady ? selectedConversationId : null;
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
    Boolean(userId && identityReady),
    Boolean(visibleSelectedConversationId),
    conversationChannelState,
    messageChannelState,
  );

  const isCurrent = useCallback((generation: number, ownerId: string | null) => {
    return (
      mountedRef.current &&
      generation === generationRef.current &&
      ownerId === identityRef.current
    );
  }, []);

  const selectConversation = useCallback((conversationId: string | null) => {
    selectedConversationIdRef.current = conversationId;
    setSelectedConversationId(conversationId);
  }, []);

  const applyConversationSnapshot = useCallback((rows: MentorConversationRow[]) => {
    const next = mergeConversationSnapshot(conversationsRef.current, rows);
    conversationsRef.current = next;
    setConversations(next);

    const current = selectedConversationIdRef.current;
    const selectedId =
      current && next.some((conversation) => conversation.id === current)
        ? current
        : next.find((conversation) => conversation.status !== "closed")?.id ?? null;
    selectedConversationIdRef.current = selectedId;
    setSelectedConversationId(selectedId);
  }, []);

  const applyConversationRealtime = useCallback((row: MentorConversationRow) => {
    const next = mergeConversationRealtime(conversationsRef.current, row);
    conversationsRef.current = next;
    setConversations(next);
  }, []);

  const applyMessageSnapshot = useCallback((rows: MentorMessageRow[]) => {
    const next = mergeMessageSnapshot(
      messagesRef.current,
      rows,
      mergeMentorMessages,
    );
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const applyMessageRealtime = useCallback((row: MentorMessageRow) => {
    const next = mergeMentorMessages(messagesRef.current, [row]);
    messagesRef.current = next;
    setMessages(next);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    conversationsRef.current = [];
    messagesRef.current = [];
    selectedConversationIdRef.current = null;
    pendingStartRef.current.clear();
    pendingSendRef.current.clear();
    pendingCloseRef.current.clear();
    activeSendingRef.current = 0;
    activeClosingRef.current = 0;
    setConversations([]);
    setMessages([]);
    setSelectedConversationId(null);
    setError(null);
    setSending(false);
    setClosing(false);
    setMessagesLoading(false);
    setConversationChannelState(userId ? "connecting" : "idle");
    setMessageChannelState("idle");
    setLoading(Boolean(userId));
    setStateUserId(userId);
  }, [userId]);

  const refreshConversations = useCallback(
    async (showLoading = true) => {
      const generation = generationRef.current;
      const ownerId = userId;
      const requestId = ++conversationRequestRef.current;
      if (!ownerId) {
        if (!isCurrent(generation, ownerId)) return;
        conversationsRef.current = [];
        selectedConversationIdRef.current = null;
        setConversations([]);
        setSelectedConversationId(null);
        setLoading(false);
        return;
      }
      if (showLoading && isCurrent(generation, ownerId)) setLoading(true);
      const { data, error: queryError } = await supabase
        .from("mentor_conversations")
        .select("*")
        .eq("user_id", ownerId)
        .order("last_message_at", { ascending: false });
      if (
        !isCurrent(generation, ownerId) ||
        requestId !== conversationRequestRef.current
      ) {
        return;
      }
      if (queryError) {
        setError("load_failed");
        setLoading(false);
        throw queryError;
      }
      applyConversationSnapshot((data ?? []) as MentorConversationRow[]);
      setError(null);
      setLoading(false);
    },
    [applyConversationSnapshot, isCurrent, supabase, userId],
  );

  const refreshMessages = useCallback(
    async (conversationId: string | null) => {
      const generation = generationRef.current;
      const ownerId = userId;
      const requestId = ++messageRequestRef.current;
      if (!conversationId) {
        if (!isCurrent(generation, ownerId)) return;
        messagesRef.current = [];
        setMessages([]);
        setMessagesLoading(false);
        return;
      }
      if (!ownerId || selectedConversationIdRef.current !== conversationId) return;
      if (isCurrent(generation, ownerId)) setMessagesLoading(true);
      const { data, error: queryError } = await supabase
        .from("mentor_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (
        !isCurrent(generation, ownerId) ||
        requestId !== messageRequestRef.current ||
        selectedConversationIdRef.current !== conversationId
      ) {
        return;
      }
      if (queryError) {
        setError("messages_load_failed");
        setMessagesLoading(false);
        throw queryError;
      }
      applyMessageSnapshot((data ?? []) as MentorMessageRow[]);
      setMessagesLoading(false);
    },
    [applyMessageSnapshot, isCurrent, supabase, userId],
  );

  useEffect(() => {
    if (!isLoaded) return;
    void refreshConversations().catch(() => undefined);
  }, [isLoaded, refreshConversations]);

  useEffect(() => {
    void refreshMessages(visibleSelectedConversationId).catch(() => undefined);
  }, [refreshMessages, visibleSelectedConversationId]);

  useEffect(() => {
    if (!userId) {
      setConversationChannelState("idle");
      return;
    }

    const generation = generationRef.current;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      if (isCurrent(generation, userId)) setConversationChannelState("connecting");
      try {
        await supabase.realtime.setAuth();
        if (!active || !isCurrent(generation, userId)) return;
        channel = supabase
          .channel(`mentor-conversations:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "mentor_conversations",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (!active || !isCurrent(generation, userId)) return;
              if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
                applyConversationRealtime(payload.new as MentorConversationRow);
              }
              void refreshConversations(false).catch(() => undefined);
            },
          )
          .subscribe((status) => {
            if (!active || !isCurrent(generation, userId)) return;
            if (status === "SUBSCRIBED") {
              setConversationChannelState("connected");
              void refreshConversations(false).catch(() => undefined);
            }
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setConversationChannelState("disconnected");
            }
          });
      } catch {
        if (active && isCurrent(generation, userId)) {
          setConversationChannelState("disconnected");
        }
      }
    };

    void subscribe();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [applyConversationRealtime, isCurrent, refreshConversations, supabase, userId]);

  useEffect(() => {
    if (!userId || !visibleSelectedConversationId) {
      setMessageChannelState("idle");
      return;
    }

    const conversationId = visibleSelectedConversationId;
    const generation = generationRef.current;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      if (isCurrent(generation, userId)) setMessageChannelState("connecting");
      try {
        await supabase.realtime.setAuth();
        if (!active || !isCurrent(generation, userId)) return;
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
              if (
                !active ||
                !isCurrent(generation, userId) ||
                selectedConversationIdRef.current !== conversationId
              ) {
                return;
              }
              applyMessageRealtime(payload.new as MentorMessageRow);
            },
          )
          .subscribe((status) => {
            if (!active || !isCurrent(generation, userId)) return;
            if (status === "SUBSCRIBED") {
              setMessageChannelState("connected");
              void refreshMessages(conversationId).catch(() => undefined);
            }
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setMessageChannelState("disconnected");
            }
          });
      } catch {
        if (active && isCurrent(generation, userId)) {
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
    applyMessageRealtime,
    isCurrent,
    refreshMessages,
    supabase,
    userId,
    visibleSelectedConversationId,
  ]);

  const startConversation = useCallback(
    async (topic: VolunteerTopicId, body: string) => {
      const generation = generationRef.current;
      const ownerId = userId;
      if (!ownerId || !isCurrent(generation, ownerId)) {
        throw new Error("authentication_required");
      }
      const displayName = user?.fullName?.trim() || user?.firstName?.trim() || "Öğrenci";
      const key = `${topic}\u0000${body}`;
      const existing = pendingStartRef.current.get(key);
      if (existing?.promise) return existing.promise;
      const operation = existing ?? { nonce: crypto.randomUUID() };

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
          if (!isCurrent(generation, ownerId)) return;
          const conversationId = rpcUuid(data);
          await refreshConversations(false);
          if (!isCurrent(generation, ownerId)) return;
          selectConversation(conversationId);
          await refreshMessages(conversationId);
          if (!isCurrent(generation, ownerId)) return;
          if (pendingStartRef.current.get(key) === operation) {
            pendingStartRef.current.delete(key);
          }
        } catch (actionError) {
          if (isCurrent(generation, ownerId)) setError("send_failed");
          throw actionError;
        } finally {
          if (pendingStartRef.current.get(key) === operation) {
            operation.promise = undefined;
          }
          if (isCurrent(generation, ownerId)) {
            activeSendingRef.current -= 1;
            setSending(activeSendingRef.current > 0);
          }
        }
      });

      operation.promise = promise;
      pendingStartRef.current.set(key, operation);
      return promise;
    },
    [
      isCurrent,
      refreshConversations,
      refreshMessages,
      selectConversation,
      supabase,
      user?.firstName,
      user?.fullName,
      userId,
    ],
  );

  const sendMessage = useCallback(
    async (body: string) => {
      const generation = generationRef.current;
      const ownerId = userId;
      const conversation = selectedConversation;
      if (!ownerId || !isCurrent(generation, ownerId)) {
        throw new Error("authentication_required");
      }
      if (!conversation || conversation.status === "closed") {
        throw new Error("conversation_closed");
      }
      const key = `${conversation.id}\u0000${body}`;
      const existing = pendingSendRef.current.get(key);
      if (existing?.promise) return existing.promise;
      const operation = existing ?? { nonce: crypto.randomUUID() };

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
          if (!isCurrent(generation, ownerId)) return;
          await Promise.all([
            refreshConversations(false),
            refreshMessages(conversation.id),
          ]);
          if (!isCurrent(generation, ownerId)) return;
          if (pendingSendRef.current.get(key) === operation) {
            pendingSendRef.current.delete(key);
          }
        } catch (actionError) {
          if (isCurrent(generation, ownerId)) setError("send_failed");
          throw actionError;
        } finally {
          if (pendingSendRef.current.get(key) === operation) {
            operation.promise = undefined;
          }
          if (isCurrent(generation, ownerId)) {
            activeSendingRef.current -= 1;
            setSending(activeSendingRef.current > 0);
          }
        }
      });

      operation.promise = promise;
      pendingSendRef.current.set(key, operation);
      return promise;
    },
    [
      isCurrent,
      refreshConversations,
      refreshMessages,
      selectedConversation,
      supabase,
      userId,
    ],
  );

  const closeConversation = useCallback(
    async (conversationId: string) => {
      const generation = generationRef.current;
      const ownerId = userId;
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
          if (!isCurrent(generation, ownerId)) return;
          await refreshConversations(false);
          if (!isCurrent(generation, ownerId)) return;
          selectConversation(conversationId);
        } catch (actionError) {
          if (isCurrent(generation, ownerId)) setError("close_failed");
          throw actionError;
        } finally {
          if (pendingCloseRef.current.get(conversationId) === promise) {
            pendingCloseRef.current.delete(conversationId);
          }
          if (isCurrent(generation, ownerId)) {
            activeClosingRef.current -= 1;
            setClosing(activeClosingRef.current > 0);
          }
        }
      });

      pendingCloseRef.current.set(conversationId, promise);
      return promise;
    },
    [isCurrent, refreshConversations, selectConversation, supabase, userId],
  );

  const reload = useCallback(async () => {
    const generation = generationRef.current;
    const ownerId = userId;
    if (!isCurrent(generation, ownerId)) return;
    setError(null);
    await refreshConversations();
    if (!isCurrent(generation, ownerId)) return;
    await refreshMessages(selectedConversationIdRef.current);
  }, [isCurrent, refreshConversations, refreshMessages, userId]);

  return {
    openConversation,
    closedConversations,
    selectedConversation,
    messages: visibleMessages,
    loading: identityReady ? loading : Boolean(userId),
    messagesLoading: identityReady ? messagesLoading : false,
    sending: identityReady ? sending : false,
    closing: identityReady ? closing : false,
    error: identityReady ? error : null,
    realtimeState,
    selectConversation,
    startConversation,
    sendMessage,
    closeConversation,
    reload,
  };
}
