"use client";

import { useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorChannel } from "@/lib/mentor/channels";

import MentorTopBar from "../MentorTopBar";
import ExpertLeadForm from "./ExpertLeadForm";
import ExpertLeadSuccess from "./ExpertLeadSuccess";

export interface ExpertLeadDeskProps {
  channel: MentorChannel;
  onBackToHub: () => void;
}

export default function ExpertLeadDesk({ channel, onBackToHub }: ExpertLeadDeskProps) {
  const { t } = useLanguage();
  const copy = t.aiMentor.expertDesk;
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="min-h-[100dvh] bg-[var(--editorial-paper)]">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
        <MentorTopBar
          mode="chat"
          channel={channel}
          statusKey="idle"
          statusLabel={t.aiMentor.statusReady}
          onBackToHub={onBackToHub}
        />
      </div>

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <header className="border-b border-[var(--editorial-border)] pb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-[var(--editorial-ink)] sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-base leading-7 text-[var(--editorial-muted)]">
            {copy.intro}
          </p>
        </header>

        <div className="border-b border-[var(--editorial-border)] py-6">
          <p className="font-serif text-base text-[var(--editorial-ink)]">
            {copy.firstConsultationFree}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">
            {copy.paidContinuation}
          </p>
        </div>

        <div className="pt-8">
          {submitted ? (
            <ExpertLeadSuccess onBackToHub={onBackToHub} />
          ) : (
            <ExpertLeadForm onSubmitted={() => setSubmitted(true)} />
          )}
        </div>
      </section>
    </main>
  );
}
