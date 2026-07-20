"use client";

import { useLanguage } from "@/context/LanguageContext";
import type {
  MentorConversationStatus,
  MentorRealtimeState,
} from "@/lib/mentor/volunteer";

export interface VolunteerConversationStatusProps {
  status: MentorConversationStatus;
  realtimeState: MentorRealtimeState;
  onReload: () => Promise<void>;
}

export default function VolunteerConversationStatus({
  status,
  realtimeState,
  onReload,
}: VolunteerConversationStatusProps) {
  const { t } = useLanguage();
  const copy = t.aiMentor.volunteerDesk;
  const label =
    realtimeState === "disconnected"
      ? copy.statusDisconnected
      : status === "waiting_for_team"
        ? copy.statusWaitingTeam
        : status === "waiting_for_student"
          ? copy.statusWaitingStudent
          : copy.statusClosed;
  const className = `text-[10px] font-bold uppercase tracking-[0.14em] ${
    realtimeState === "disconnected" || status === "closed"
      ? "text-[var(--editorial-terracotta)]"
      : "text-[var(--editorial-sage)]"
  }`;

  if (realtimeState === "disconnected") {
    return (
      <button
        type="button"
        onClick={() => void onReload().catch(() => undefined)}
        className={`${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]`}
      >
        {label}
      </button>
    );
  }

  return <p className={className}>{label}</p>;
}
