"use client";

import { useMemo, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import {
  EXPERT_LEAD_STATUSES,
  buildWhatsAppHref,
  type ExpertLeadStatus,
} from "@/lib/mentor/expertLeads";
import type { UseExpertLeadInboxResult } from "@/lib/mentor/useExpertLeadInbox";
import type { ExpertLeadRow } from "@/types";

export interface ExpertLeadDetailProps {
  lead: ExpertLeadRow | null;
  savingStatus: boolean;
  savingNote: boolean;
  deleting: boolean;
  error: UseExpertLeadInboxResult["error"];
  onStatusChange: (status: ExpertLeadStatus) => Promise<void>;
  onSaveNote: (note: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function ExpertLeadDetail({
  lead,
  savingStatus,
  savingNote,
  deleting,
  error,
  onStatusChange,
  onSaveNote,
  onDelete,
}: ExpertLeadDetailProps) {
  const { t, language } = useLanguage();
  const copy = t.expertOperator;
  const formCopy = t.aiMentor.expertDesk;
  const [note, setNote] = useState(lead?.internal_note ?? "");
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [language],
  );

  if (!lead) {
    return (
      <section className="border-y border-[var(--editorial-border)] py-12 lg:px-6">
        <p className="font-serif text-base italic text-[var(--editorial-muted)]">
          {copy.selectLead}
        </p>
      </section>
    );
  }

  const whatsappHref = buildWhatsAppHref(lead.whatsapp_phone);
  const handleDelete = () => {
    const message = copy.deleteConfirm.replace("{name}", lead.full_name);
    if (!window.confirm(message)) return;
    void onDelete();
  };

  const fields = [
    [formCopy.fields.fullName, lead.full_name],
    [formCopy.fields.whatsappPhone, lead.whatsapp_phone],
    [formCopy.fields.studyLevel, formCopy.studyLevels[lead.study_level]],
    [
      formCopy.fields.fieldOfInterest,
      formCopy.fieldsOfInterest[lead.field_of_interest],
    ],
    [
      formCopy.fields.targetIntake,
      lead.target_intake === "undecided" ? formCopy.intakeUndecided : lead.target_intake,
    ],
    [formCopy.fields.helpRequest, lead.help_request],
  ];

  return (
    <section
      aria-labelledby={`expert-lead-${lead.id}`}
      className="min-w-0 border-y border-[var(--editorial-border)] py-5 lg:px-6"
    >
      <header className="border-b border-[var(--editorial-border)] pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)]">
          {copy.filters[lead.status]}
        </p>
        <h2 id={`expert-lead-${lead.id}`} className="mt-2 font-serif text-3xl text-[var(--editorial-ink)]">
          {lead.full_name}
        </h2>
      </header>

      <dl className="divide-y divide-[var(--editorial-border)]">
        {fields.map(([label, value]) => (
          <div key={label} className="py-4">
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
              {label}
            </dt>
            <dd className="mt-2 whitespace-pre-wrap break-words font-serif text-base leading-7 text-[var(--editorial-ink)]">
              {value}
            </dd>
          </div>
        ))}
        <div className="py-4 text-sm text-[var(--editorial-muted)]">
          <p>{copy.createdAt}: {dateFormatter.format(new Date(lead.created_at))}</p>
          <p className="mt-1">{copy.updatedAt}: {dateFormatter.format(new Date(lead.updated_at))}</p>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={whatsappHref ?? "#"}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!whatsappHref}
          onClick={(event) => {
            if (!whatsappHref) event.preventDefault();
          }}
          className="border border-[var(--editorial-ink)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] transition hover:bg-[var(--editorial-ink)] hover:text-[var(--editorial-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          {copy.whatsapp}
        </a>
      </div>

      <div className="mt-8 border-t border-[var(--editorial-border)] pt-6">
        <label
          htmlFor={`expert-status-${lead.id}`}
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]"
        >
          {copy.statusLabel}
        </label>
        <select
          id={`expert-status-${lead.id}`}
          value={lead.status}
          disabled={savingStatus || deleting}
          onChange={(event) => void onStatusChange(event.target.value as ExpertLeadStatus)}
          className="mt-2 w-full border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-3 text-base text-[var(--editorial-ink)] outline-none focus:border-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {EXPERT_LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {copy.filters[status]}
            </option>
          ))}
        </select>
        {error === "status_failed" ? (
          <p role="alert" className="mt-2 text-sm text-[var(--editorial-terracotta)]">
            {copy.statusError}
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        <label
          htmlFor={`expert-note-${lead.id}`}
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]"
        >
          {copy.noteLabel}
        </label>
        <textarea
          id={`expert-note-${lead.id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={5}
          disabled={savingNote || deleting}
          className="mt-2 w-full resize-y border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-3 text-base text-[var(--editorial-ink)] outline-none focus:border-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-50"
        />
        {error === "note_failed" ? (
          <p role="alert" className="mt-2 text-sm text-[var(--editorial-terracotta)]">
            {copy.noteError}
          </p>
        ) : null}
        <button
          type="button"
          disabled={savingNote || deleting}
          onClick={() => void onSaveNote(note)}
          className="mt-3 border border-[var(--editorial-border)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copy.saveNote}
        </button>
      </div>

      <div className="mt-8 border-t border-[var(--editorial-border)] pt-6">
        {error === "delete_failed" ? (
          <p role="alert" className="mb-3 text-sm text-[var(--editorial-terracotta)]">
            {copy.deleteError}
          </p>
        ) : null}
        <button
          type="button"
          disabled={deleting || savingStatus || savingNote}
          onClick={handleDelete}
          className="border border-[var(--editorial-terracotta)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)] transition hover:bg-[var(--editorial-terracotta)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copy.deleteLead}
        </button>
      </div>
    </section>
  );
}
