"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

import {
  mergeMentorMessages,
  type MentorRealtimeState,
  type VolunteerTopicId,
} from "@/lib/mentor/volunteer";
import { useMentorSupabaseClient } from "@/lib/mentor/useMentorSupabaseClient";
import type { MentorConversationRow, MentorMessageRow } from "@/types";

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
  const supabase = useMentorSupabaseClient();
  const pendingStartRef = useRef<{ key: string; nonce: string } | null>(null);
  const pendingSendRef = useRef<{ key: string; nonce: string } | null>(null);
  const mountedRef = useRef(true);
  const conversationRequestRef = useRef(0);
  const messageRequestRef = useRef(0);

  const [conversations, setConversations] = useState<MentorConversationRow[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MentorMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] =
    useState<MentorRealtimeState>("connecting");

  const openConversation =
    conversations.find((conversation) => conversation.status !== "closed") ?? null;
  const closedConversations = conversations.filter(
    (conversation) => conversation.status === "closed",
  );
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshConversations = useCallback(
    async (showLoading = true) => {
      const requestId = ++conversationRequestRef.current;
      if (!user?.id) {
        if (!mountedRef.current || requestId !== conversationRequestRef.current) return;
        setConversations([]);
        setSelectedConversationId(null);
        setLoading(false);
        return;
      }
      if (showLoading && mountedRef.current) setLoading(true);
      const { data, error: queryError } = await supabase
        .from("mentor_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false });
      if (!mountedRef.current || requestId !== conversationRequestRef.current) return;
      if (queryError) {
        setError("load_failed");
        setLoading(false);
        throw queryError;
      }
      const rows = (data ?? []) as MentorConversationRow[];
      setConversations(rows);
      setSelectedConversationId((current) => {
        if (current && rows.some((row) => row.id === current)) return current;
        return rows.find((row) => row.status !== "closed")?.id ?? null;
      });
      setError(null);
      setLoading(false);
    },
    [supabase, user?.id],
  );

  const refreshMessages = useCallback(
    async (conversationId: string | null) => {
      const requestId = ++messageRequestRef.current;
      if (!conversationId) {
        if (!mountedRef.current || requestId !== messageRequestRef.current) return;
        setMessages([]);
        setMessagesLoading(false);
        return;
      }
      if (mountedRef.current) setMessagesLoading(true);
      const { data, error: queryError } = await supabase
        .from("mentor_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (!mountedRef.current || requestId !== messageRequestRef.current) return;
      if (queryError) {
        setError("messages_load_failed");
        setMessagesLoading(false);
        throw queryError;
      }
      setMessages(mergeMentorMessages([], (data ?? []) as MentorMessageRow[]));
      setMessagesLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    if (!isLoaded) return;
    void refreshConversations().catch(() => undefined);
  }, [isLoaded, refreshConversations]);

  useEffect(() => {
    void refreshMessages(selectedConversationId).catch(() => undefined);
  }, [refreshMessages, selectedConversationId]);

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setRealtimeState("disconnected");
      return;
    }

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      setRealtimeState("connecting");
      try {
        await supabase.realtime.setAuth();
        if (!active) return;
        channel = supabase
          .channel(`mentor-conversations:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "mentor_conversations",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              void refreshConversations(false).catch(() => undefined);
            },
          )
          .subscribe((status) => {
            if (!active) return;
            if (status === "SUBSCRIBED") setRealtimeState("connected");
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setRealtimeState("disconnected");
            }
          });
      } catch {
        if (active) setRealtimeState("disconnected");
      }
    };

    void subscribe();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [isLoaded, refreshConversations, supabase, user?.id]);

  useEffect(() => {
    if (!isLoaded || !user?.id || !selectedConversationId) return;

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      try {
        await supabase.realtime.setAuth();
        if (!active) return;
        channel = supabase
          .channel(`mentor-messages:${selectedConversationId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "mentor_messages",
              filter: `conversation_id=eq.${selectedConversationId}`,
            },
            (payload) => {
              if (!active) return;
              setMessages((current) =>
                mergeMentorMessages(current, [payload.new as MentorMessageRow]),
              );
            },
          )
          .subscribe((status) => {
            if (!active) return;
            if (status === "SUBSCRIBED") setRealtimeState("connected");
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setRealtimeState("disconnected");
            }
          });
      } catch {
        if (active) setRealtimeState("disconnected");
      }
    };

    void subscribe();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [isLoaded, selectedConversationId, supabase, user?.id]);

  const startConversation = useCallback(
    async (topic: VolunteerTopicId, body: string) => {
      setSending(true);
      setError(null);
      try {
        const displayName = user?.fullName?.trim() || user?.firstName?.trim() || "Öğrenci";
        const pendingKey = `${topic}\u0000${body}`;
        if (pendingStartRef.current?.key !== pendingKey) {
          pendingStartRef.current = { key: pendingKey, nonce: crypto.randomUUID() };
        }
        const { data, error: rpcError } = await supabase.rpc("start_volunteer_conversation",
          {
            p_topic: topic,
            p_display_name: displayName,
            p_body: body,
            p_client_nonce: pendingStartRef.current.nonce,
          },
        );
        if (rpcError) throw rpcError;
        const conversationId = rpcUuid(data);
        await refreshConversations(false);
        setSelectedConversationId(conversationId);
        await refreshMessages(conversationId);
        pendingStartRef.current = null;
      } catch (actionError) {
        setError("send_failed");
        throw actionError;
      } finally {
        setSending(false);
      }
    },
    [refreshConversations, refreshMessages, supabase, user?.firstName, user?.fullName],
  );

  const sendMessage = useCallback(
    async (body: string) => {
      if (!selectedConversation || selectedConversation.status === "closed") {
        throw new Error("conversation_closed");
      }
      setSending(true);
      setError(null);
      try {
        const pendingKey = `${selectedConversation.id}\u0000${body}`;
        if (pendingSendRef.current?.key !== pendingKey) {
          pendingSendRef.current = { key: pendingKey, nonce: crypto.randomUUID() };
        }
        const { error: rpcError } = await supabase.rpc("send_student_mentor_message",
          {
            p_conversation_id: selectedConversation.id,
            p_body: body,
            p_client_nonce: pendingSendRef.current.nonce,
          },
        );
        if (rpcError) throw rpcError;
        await Promise.all([
          refreshConversations(false),
          refreshMessages(selectedConversation.id),
        ]);
        pendingSendRef.current = null;
      } catch (actionError) {
        setError("send_failed");
        throw actionError;
      } finally {
        setSending(false);
      }
    },
    [refreshConversations, refreshMessages, selectedConversation, supabase],
  );

  const closeConversation = useCallback(
    async (conversationId: string) => {
      setClosing(true);
      setError(null);
      try {
        const { error: rpcError } = await supabase.rpc("close_volunteer_conversation",
          { p_conversation_id: conversationId },
        );
        if (rpcError) throw rpcError;
        await refreshConversations(false);
        setSelectedConversationId(conversationId);
      } catch (actionError) {
        setError("close_failed");
        throw actionError;
      } finally {
        setClosing(false);
      }
    },
    [refreshConversations, supabase],
  );

  const reload = useCallback(async () => {
    setError(null);
    await refreshConversations();
    await refreshMessages(selectedConversationId);
  }, [refreshConversations, refreshMessages, selectedConversationId]);

  return {
    openConversation,
    closedConversations,
    selectedConversation,
    messages,
    loading,
    messagesLoading,
    sending,
    closing,
    error,
    realtimeState,
    selectConversation: setSelectedConversationId,
    startConversation,
    sendMessage,
    closeConversation,
    reload,
  };
}
