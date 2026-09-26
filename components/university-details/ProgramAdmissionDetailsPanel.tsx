"use client";

/* Kaynakli kabul dosyasinin govdesi: basvuru takvimi, kabul kosullari ve
   gerekli belgeler. Kunye ProgramSummaryStrip'te, kaynak izi ve belirsizlikler
   ProgramSourceTrail'de. Uzun metinler madde madde gosterilir; metin HTML'e
   yalnizca BIR kez yazilir (line-clamp + aria-expanded dugmesi). */

import { useId, useState } from "react";
import { ChevronDown, ExternalLink, Square } from "lucide-react";

import type { ProgramAdmissionDetails } from "@/types/universities";
import {
  admissionFieldIsUncertain,
  buildAdmissionEvidence,
  getAdmissionFieldEvidence,
  localizeAdmissionDates,
  splitAdmissionSegments,
  type AdmissionFieldKey,
} from "./programAdmissionPresentation";
import {
  DossierSectionTitle,
  EvidenceLink,
  LinkHost,
  ToggleButton,
  SourceMeta,
  buildDossierSources,
  fillTemplate,
  latestQuote,
  resolveShowableLink,
  sourceNameForEvidence,
  type OfficialLinkContext,
  type ProgramDossierLabels,
} from "./programDossierShared";

interface ProgramAdmissionDetailsPanelProps {
  details?: ProgramAdmissionDetails;
  labels: ProgramDossierLabels;
  language: "tr" | "en";
  linkContext: OfficialLinkContext;
}

const COLLAPSED_SEGMENT_COUNT = 3;

function AdmissionText({
  value,
  language,
  readFullLabel,
  collapseLabel,
  className = "",
  clampClassName = "line-clamp-4",
  clampThreshold = 360,
}: {
  value: string;
  language: "tr" | "en";
  readFullLabel: string;
  collapseLabel: string;
  className?: string;
  clampClassName?: string;
  clampThreshold?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  const segments = splitAdmissionSegments(value).map((segment) => ({
    label: segment.label,
    text: localizeAdmissionDates(segment.text, language),
  }));

  if (segments.length === 1) {
    const text = segments[0].text;
    const needsClamp = text.length > clampThreshold;

    return (
      <div>
        <p
          id={contentId}
          className={`break-words ${
            needsClamp && !expanded ? clampClassName : ""
          } ${className}`}
        >
          {text}
        </p>
        {needsClamp ? (
          <ToggleButton
            expanded={expanded}
            onToggle={() => setExpanded((current) => !current)}
            contentId={contentId}
            readFullLabel={readFullLabel}
            collapseLabel={collapseLabel}
          />
        ) : null}
      </div>
    );
  }

  const hiddenCount = segments.length - COLLAPSED_SEGMENT_COUNT;
  const visibleSegments = expanded
    ? segments
    : segments.slice(0, COLLAPSED_SEGMENT_COUNT);

  return (
    <div>
      <ul id={contentId} className="space-y-2">
        {visibleSegments.map((segment, index) => (
          <li
            key={`${segment.label ?? "segment"}-${index}`}
            className={`break-words ${className}`}
          >
            {segment.label ? (
              <span className="font-bold">{segment.label}: </span>
            ) : null}
            {segment.text}
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <ToggleButton
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
          contentId={contentId}
          readFullLabel={readFullLabel}
          collapseLabel={collapseLabel}
        />
      ) : null}
    </div>
  );
}

export function ProgramAdmissionDetailsPanel({
  details,
  labels,
  language,
  linkContext,
}: ProgramAdmissionDetailsPanelProps) {
  if (!details) return null;

  const evidence = buildAdmissionEvidence(details.sourceQuotes);
  const sources = buildDossierSources(details, evidence, labels, linkContext);
  const callLink = resolveShowableLink(details.officialCallUrl, linkContext);
  const evidenceFor = (field: AdmissionFieldKey) =>
    latestQuote(getAdmissionFieldEvidence(evidence, field));

  const hasTimeline =
    Boolean(details.applicationDeadlineEu || details.applicationDeadlineNonEu) ||
    admissionFieldIsUncertain(details, "applicationDeadlineEu") ||
    admissionFieldIsUncertain(details, "applicationDeadlineNonEu");

  const requirementRows = [
    {
      field: "academicRequirements" as const,
      label: labels.academicRequirements,
      value: details.academicRequirements,
    },
    {
      field: "languageRequirements" as const,
      label: labels.languageRequirements,
      value: details.languageRequirements,
    },
    {
      field: "entryExamOrTest" as const,
      label: labels.entryExamOrTest,
      value: details.entryExamOrTest,
    },
  ].filter(
    (row) => Boolean(row.value) || admissionFieldIsUncertain(details, row.field),
  );

  const visibleDocuments = details.requiredDocuments.slice(0, 6);
  const additionalDocuments = details.requiredDocuments.slice(6);

  if (!hasTimeline && requirementRows.length === 0 && visibleDocuments.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="program-admission-dossier"
      className="select-text border border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
    >
      <header className="border-b border-[var(--editorial-border)] px-5 py-6 sm:px-7">
        <h2 className="font-serif text-3xl font-semibold tracking-[-0.025em] text-[var(--editorial-ink)] sm:text-4xl">
          {labels.title}
        </h2>
      </header>

      <div className="min-w-0 px-5 sm:px-7">
        {hasTimeline ? (
          <section className="py-6">
            <DossierSectionTitle index={1}>
              {labels.applicationTimeline}
            </DossierSectionTitle>
            <div className="mt-4 divide-y divide-[var(--editorial-border)] sm:grid sm:grid-cols-2 sm:gap-x-5 sm:divide-x sm:divide-y-0">
              {[
                {
                  field: "applicationDeadlineEu" as const,
                  label: labels.euDeadline,
                  value: details.applicationDeadlineEu,
                },
                {
                  field: "applicationDeadlineNonEu" as const,
                  label: labels.nonEuDeadline,
                  value: details.applicationDeadlineNonEu,
                },
              ].map((deadline, index) => {
                const fieldEvidence = evidenceFor(deadline.field);
                const sourceName = sourceNameForEvidence(
                  fieldEvidence,
                  sources,
                  labels.officialSource,
                );

                return (
                  <article
                    key={deadline.field}
                    className={`py-4 sm:py-1 ${index === 0 ? "sm:pr-5" : "sm:pl-5"}`}
                  >
                    <h4 className="text-sm font-bold text-[var(--editorial-ink)]">
                      {deadline.label}
                    </h4>
                    <div className="mt-2">
                      {deadline.value ? (
                        <AdmissionText
                          value={deadline.value}
                          language={language}
                          readFullLabel={labels.readFull}
                          collapseLabel={labels.collapseText}
                          clampThreshold={200}
                          clampClassName="line-clamp-5"
                          className="text-base font-semibold leading-7 text-[var(--editorial-ink)]"
                        />
                      ) : (
                        <p className="break-words text-base leading-7 text-[var(--editorial-muted)]">
                          {labels.notSpecifiedInSources}
                        </p>
                      )}
                    </div>
                    <SourceMeta
                      evidence={fieldEvidence}
                      sourceLabel={labels.sourceLabel}
                      sourceName={sourceName}
                      language={language}
                    />
                    {!deadline.value && callLink ? (
                      <>
                        <a
                          href={callLink.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[var(--editorial-terracotta-ink)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                        >
                          {labels.verifyInOfficialCall}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <LinkHost link={callLink} labels={labels} className="-mt-2" />
                      </>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {requirementRows.length > 0 ? (
          <section className="border-t border-[var(--editorial-border)] py-6">
            <DossierSectionTitle index={hasTimeline ? 2 : 1}>
              {labels.admissionRequirements}
            </DossierSectionTitle>
            <dl className="mt-4 border-b border-[var(--editorial-border)]">
              {requirementRows.map((row) => (
                <div
                  key={row.field}
                  className="grid gap-2 border-t border-[var(--editorial-border)] py-4 sm:grid-cols-[165px_minmax(0,1fr)_auto] sm:items-start sm:gap-5"
                >
                  <dt className="text-sm font-bold text-[var(--editorial-ink)]">
                    {row.label}
                  </dt>
                  {/* Kaynak linki <dd> icinde: <dl> altindaki sarmalayici yalnizca dt+dd icermeli
                      (axe definition-list). Genis ekranda dd iki sutuna yayilir, gorunum ayni. */}
                  <dd className="sm:col-start-2 sm:col-end-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-5">
                    {row.value ? (
                      <AdmissionText
                        value={row.value}
                        language={language}
                        readFullLabel={labels.readFull}
                        collapseLabel={labels.collapseText}
                        className="text-sm leading-6 text-[var(--editorial-ink)] sm:text-base sm:leading-7"
                      />
                    ) : (
                      <p className="break-words text-sm leading-6 text-[var(--editorial-muted)] sm:text-base sm:leading-7">
                        {labels.notSpecifiedInSources}
                      </p>
                    )}
                    <EvidenceLink
                      evidence={evidenceFor(row.field)}
                      label={labels.viewSource}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {details.requiredDocuments.length > 0 ? (
          <section className="border-t border-[var(--editorial-border)] py-6">
            <DossierSectionTitle
              index={Number(hasTimeline) + Number(requirementRows.length > 0) + 1}
            >
              {labels.requiredDocuments}
            </DossierSectionTitle>
            <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {visibleDocuments.map((document, index) => (
                <li
                  key={`${document}-${index}`}
                  className="flex min-w-0 items-start gap-3 text-sm leading-6 text-[var(--editorial-ink)] sm:text-base"
                >
                  <Square
                    aria-hidden="true"
                    className="mt-1 h-4 w-4 shrink-0 stroke-[1.5]"
                  />
                  <div className="min-w-0 flex-1">
                    <AdmissionText
                      value={document}
                      language={language}
                      readFullLabel={labels.readFull}
                      collapseLabel={labels.collapseText}
                      clampThreshold={180}
                      clampClassName="line-clamp-3"
                      className="text-sm leading-6 text-[var(--editorial-ink)] sm:text-base"
                    />
                  </div>
                </li>
              ))}
            </ul>
            {additionalDocuments.length > 0 ? (
              <details className="group mt-4 border-t border-[var(--editorial-border)] pt-3">
                <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-bold text-[var(--editorial-terracotta-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]">
                  {additionalDocuments.length === 1
                    ? labels.moreDocumentsSingle
                    : fillTemplate(labels.moreDocuments, {
                        count: additionalDocuments.length,
                      })}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {additionalDocuments.map((document, index) => (
                    <li
                      key={`${document}-${index + visibleDocuments.length}`}
                      className="flex min-w-0 items-start gap-3 text-sm leading-6 text-[var(--editorial-ink)] sm:text-base"
                    >
                      <Square
                        aria-hidden="true"
                        className="mt-1 h-4 w-4 shrink-0 stroke-[1.5]"
                      />
                      <div className="min-w-0 flex-1">
                        <AdmissionText
                          value={document}
                          language={language}
                          readFullLabel={labels.readFull}
                          collapseLabel={labels.collapseText}
                          clampThreshold={180}
                          clampClassName="line-clamp-3"
                          className="text-sm leading-6 text-[var(--editorial-ink)] sm:text-base"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {admissionFieldIsUncertain(details, "requiredDocuments") ? (
              <p className="mt-4 text-sm text-[var(--editorial-muted)]">
                {labels.additionalDocumentsMayApply}
              </p>
            ) : null}
            <div className="mt-2">
              <EvidenceLink
                evidence={evidenceFor("requiredDocuments")}
                label={labels.viewSource}
              />
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
