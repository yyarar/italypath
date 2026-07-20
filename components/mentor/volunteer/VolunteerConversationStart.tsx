"use client";

import { type FormEvent, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import {
  VOLUNTEER_TOPIC_IDS,
  type VolunteerTopicId,
} from "@/lib/mentor/volunteer";

export interface VolunteerConversationStartProps {
  sending: boolean;
  onStart: (topic: VolunteerTopicId, body: string) => Promise<void>;
}

export default function VolunteerConversationStart({
  sending,
  onStart,
}: VolunteerConversationStartProps) {
  const { t } = useLanguage();
  const copy = t.aiMentor.volunteerDesk;
  const [topic, setTopic] = useState<VolunteerTopicId>("university-program");
  const [draft, setDraft] = useState("");
  const [failed, setFailed] = useState(false);
  const showScopeNote = topic === "scholarship-isee" || topic === "visa-residence";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    try {
      await onStart(topic, trimmed);
      setDraft("");
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-y border-[var(--editorial-border)] py-6">
      <fieldset disabled={sending}>
        <legend className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
          {copy.topicLabel}
        </legend>
        <div className="grid gap-px border border-[var(--editorial-border)] bg-[var(--editorial-border)] sm:grid-cols-2">
          {VOLUNTEER_TOPIC_IDS.map((topicId) => {
            const isSelected = topic === topicId;
            return (
              <button
                key={topicId}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setTopic(topicId)}
                className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] transition-colors duration-200 ease-out focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)] ${
                  isSelected
                    ? "bg-[var(--editorial-sage)] text-white"
                    : "bg-[var(--editorial-surface)] text-[var(--editorial-ink)] hover:bg-[var(--editorial-paper)]"
                }`}
              >
                {copy.topics[topicId]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {showScopeNote ? (
        <p className="mt-4 border-l-2 border-[var(--editorial-sage)] pl-4 font-serif text-sm leading-6 text-[var(--editorial-muted)]">
          {copy.scopeNote}
        </p>
      ) : null}

      <label
        htmlFor="volunteer-first-message"
        className="mb-3 mt-6 block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]"
      >
        {copy.messageLabel}
      </label>
      <textarea
        id="volunteer-first-message"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (failed) setFailed(false);
        }}
        maxLength={4000}
        disabled={sending}
        placeholder={copy.firstMessagePlaceholder}
        rows={7}
        className="w-full resize-y border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-3 font-serif text-base leading-7 text-[var(--editorial-ink)] outline-none placeholder:italic placeholder:text-[var(--editorial-muted)] focus:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-60"
      />

      {failed ? (
        <p role="alert" className="mt-3 text-sm text-[var(--editorial-terracotta)]">
          {copy.sendError}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={sending}
          className="bg-[var(--editorial-ink)] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-paper)] transition-colors duration-200 ease-out hover:bg-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? copy.sending : copy.startCta}
        </button>
      </div>
    </form>
  );
}
