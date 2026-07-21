"use client";

import { type FormEvent, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";

export interface VolunteerComposerProps {
  sending: boolean;
  onSend: (body: string) => Promise<void>;
}

export default function VolunteerComposer({ sending, onSend }: VolunteerComposerProps) {
  const { t } = useLanguage();
  const copy = t.aiMentor.volunteerDesk;
  const [draft, setDraft] = useState("");
  const [failed, setFailed] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    try {
      await onSend(trimmed);
      setDraft("");
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 border-t border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-5 sm:px-5"
    >
      <label
        htmlFor="volunteer-message"
        className="mb-3 block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]"
      >
        {copy.messageLabel}
      </label>
      <textarea
        id="volunteer-message"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (failed) setFailed(false);
        }}
        maxLength={4000}
        disabled={sending}
        placeholder={copy.messagePlaceholder}
        rows={5}
        className="w-full resize-y border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 py-3 font-serif text-base leading-7 text-[var(--editorial-ink)] outline-none placeholder:italic placeholder:text-[var(--editorial-muted)] focus:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-60"
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
          {sending ? copy.sending : copy.sendCta}
        </button>
      </div>
    </form>
  );
}
