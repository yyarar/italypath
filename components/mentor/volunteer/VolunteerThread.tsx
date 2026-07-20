"use client";

import { useEffect, useRef } from "react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorMessageRow } from "@/types";

import VolunteerMessage from "./VolunteerMessage";

export interface VolunteerThreadProps {
  messages: MentorMessageRow[];
  loading: boolean;
  conversationId: string;
  viewer: "student" | "staff";
  studentDisplayName?: string;
}

export default function VolunteerThread({
  messages,
  loading,
  conversationId,
  viewer,
  studentDisplayName,
}: VolunteerThreadProps) {
  const { t } = useLanguage();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages[messages.length - 1]?.id;

  useEffect(() => {
    if (!lastMessageId) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversationId, lastMessageId]);

  if (loading) {
    return (
      <p className="py-10 font-serif text-base italic text-[var(--editorial-muted)]">
        {t.aiMentor.volunteerDesk.messagesLoading}
      </p>
    );
  }

  return (
    <div aria-live="polite" aria-atomic="false" className="mt-6">
      {messages.map((message) => (
        <VolunteerMessage
          key={message.id}
          message={message}
          viewer={viewer}
          studentDisplayName={studentDisplayName}
        />
      ))}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
