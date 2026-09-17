/* Kaynak izi ve acik belirsizlikler: sayfanin altinda, acilir-kapanir blok.
   Kaynak alintilari birlestirilmez veya kisaltilmaz. */

import Link from "next/link";
import { ArrowRight, ChevronDown, ExternalLink } from "lucide-react";

import type { ProgramAdmissionDetails } from "@/types/universities";
import {
  buildAdmissionEvidence,
  localizeAdmissionDates,
  normalizeAdmissionSourceUrl,
} from "./programAdmissionPresentation";
import {
  buildDossierSources,
  fillTemplate,
  formatSourceDate,
  getUncertaintyLabels,
  type ProgramDossierLabels,
} from "./programDossierShared";

interface ProgramSourceTrailProps {
  details: ProgramAdmissionDetails;
  labels: ProgramDossierLabels;
  language: "tr" | "en";
  programName: string;
  universityName: string;
  isSignedIn?: boolean;
}

function buildMentorHref({
  isSignedIn,
  programName,
  universityName,
  focus,
}: {
  isSignedIn?: boolean;
  programName: string;
  universityName: string;
  focus: string[];
}) {
  const params = new URLSearchParams({
    desk: "ai",
    program: programName,
    university: universityName,
  });
  if (focus.length > 0) params.set("focus", focus.join(", "));

  const target = `/ai-mentor?${params.toString()}`;
  return isSignedIn
    ? target
    : `/giris?redirect_url=${encodeURIComponent(target)}`;
}

export function ProgramSourceTrail({
  details,
  labels,
  language,
  programName,
  universityName,
  isSignedIn,
}: ProgramSourceTrailProps) {
  const evidence = buildAdmissionEvidence(details.sourceQuotes);
  const sources = buildDossierSources(details, evidence, labels);
  const uncertaintyLabels = getUncertaintyLabels(details.uncertain, labels);
  const hasUncertainty =
    uncertaintyLabels.length > 0 || details.uncertaintyNotes.length > 0;

  if (sources.length === 0 && !hasUncertainty) return null;

  const mentorHref = buildMentorHref({
    isSignedIn,
    programName,
    universityName,
    focus: uncertaintyLabels,
  });

  return (
    <details className="group select-text border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] sm:px-7">
        <span>
          {labels.sourceTrail}
          {sources.length > 0 ? (
            <span className="ml-2 font-semibold text-[var(--editorial-muted)]">
              {sources.length === 1
                ? labels.sourceCountSingle
                : fillTemplate(labels.sourceCount, { count: sources.length })}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="border-t border-[var(--editorial-border)] px-5 py-6 sm:px-7">
        {hasUncertainty ? (
          <section className="border-b border-[var(--editorial-terracotta)]/20 pb-5">
            <h3 className="font-serif text-xl font-semibold text-[var(--editorial-terracotta-ink)] sm:text-2xl">
              {labels.uncertaintyTitle}
            </h3>
            {uncertaintyLabels.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--editorial-ink)]">
                {uncertaintyLabels.map((fieldLabel) => (
                  <li key={fieldLabel}>{fieldLabel}</li>
                ))}
              </ul>
            ) : null}
            {details.uncertaintyNotes.length > 0 ? (
              <ul className="mt-3 space-y-2 border-t border-[var(--editorial-terracotta)]/20 pt-3 text-sm leading-6 text-[var(--editorial-muted)]">
                {details.uncertaintyNotes.map((note, index) => (
                  <li key={`${note}-${index}`} className="break-words">
                    {localizeAdmissionDates(note, language)}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--editorial-ink)]">
              {labels.uncertaintyNote}
            </p>
          </section>
        ) : null}

        <ol className="border-b border-[var(--editorial-border)]">
          {sources.map((source) => {
            const SourceIcon = source.icon;
            const formattedDate = formatSourceDate(
              source.latestRetrievedAt,
              language,
            );

            return (
              <li
                key={normalizeAdmissionSourceUrl(source.url)}
                className="border-t border-[var(--editorial-border)] py-4"
              >
                <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 place-items-center bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)]"
                  >
                    <SourceIcon className="h-4 w-4 stroke-[1.7]" />
                  </span>
                  <div className="min-w-0">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1 break-words text-sm font-bold leading-5 text-[var(--editorial-ink)] transition hover:text-[var(--editorial-terracotta-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                    >
                      {source.title}
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    </a>
                    <p className="mt-1 text-xs leading-5 text-[var(--editorial-muted)]">
                      {source.purpose}
                    </p>
                    {formattedDate && source.latestRetrievedAt ? (
                      <time
                        dateTime={source.latestRetrievedAt}
                        className="mt-1 block text-xs text-[var(--editorial-muted)]"
                      >
                        {formattedDate}
                      </time>
                    ) : null}
                  </div>
                </div>

                {source.evidence.length > 0 ? (
                  <details className="group/excerpt mt-3 pl-12">
                    <summary className="w-fit cursor-pointer text-xs font-bold text-[var(--editorial-sage)] transition marker:text-[var(--editorial-terracotta-ink)] hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]">
                      {source.evidence.length === 1
                        ? labels.sourceExcerptSingle
                        : fillTemplate(labels.sourceExcerptCount, {
                            count: source.evidence.length,
                          })}
                    </summary>
                    <div className="mt-3 space-y-3">
                      {source.evidence.map((item) => (
                        <blockquote
                          id={item.id}
                          key={item.id}
                          className="break-words border-l-2 border-[var(--editorial-sage-soft)] pl-3 text-xs leading-5 text-[var(--editorial-muted)]"
                        >
                          “{item.quote}”
                        </blockquote>
                      ))}
                    </div>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="pt-5">
          <h3 className="font-serif text-xl font-semibold text-[var(--editorial-ink)] sm:text-2xl">
            {labels.nextStep}
          </h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:max-w-xl">
            <a
              href={details.officialProgramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
            >
              {labels.openOfficialSource}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link
              href={mentorHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--editorial-ink)] px-3 py-2 text-center text-sm font-bold text-[var(--editorial-ink)] transition hover:bg-[var(--editorial-ink)] hover:text-[var(--editorial-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
            >
              {labels.askAi}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--editorial-muted)]">
            {labels.aiContextNote}
          </p>
        </div>
      </div>
    </details>
  );
}
