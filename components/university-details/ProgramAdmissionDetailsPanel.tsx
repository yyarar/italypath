import { ExternalLink } from "lucide-react";

import type { ProgramAdmissionDetails } from "@/app/data";

interface ProgramAdmissionDetailsLabels {
  title: string;
  officialProgramPage: string;
  officialCall: string;
  tuitionFees: string;
  campus: string;
  degreeClass: string;
  admissionType: string;
  euDeadline: string;
  nonEuDeadline: string;
  academicRequirements: string;
  languageRequirements: string;
  requiredDocuments: string;
  entryExamOrTest: string;
  uncertaintyNote: string;
}

interface ProgramAdmissionDetailsPanelProps {
  details?: ProgramAdmissionDetails;
  labels: ProgramAdmissionDetailsLabels;
}

function ExternalSourceLink({ href, label }: { href?: string; label: string }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-10 items-center gap-2 border border-[var(--editorial-border)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--editorial-sage)] transition hover:border-[var(--editorial-sage)] hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="grid gap-2 border-t border-[var(--editorial-border)] py-4 md:grid-cols-[210px_minmax(0,1fr)]">
      <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
        {label}
      </dt>
      <dd className="break-words font-serif text-lg leading-7 text-[var(--editorial-ink)]">
        {value}
      </dd>
    </div>
  );
}

export function ProgramAdmissionDetailsPanel({
  details,
  labels,
}: ProgramAdmissionDetailsPanelProps) {
  if (!details) return null;

  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--editorial-border)] px-4 py-4 sm:px-5">
        <h2 className="font-serif text-3xl font-semibold text-[var(--editorial-ink)]">
          {labels.title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <ExternalSourceLink
            href={details.officialProgramUrl}
            label={labels.officialProgramPage}
          />
          <ExternalSourceLink
            href={details.officialCallUrl}
            label={labels.officialCall}
          />
          <ExternalSourceLink
            href={details.tuitionOrFeesLink}
            label={labels.tuitionFees}
          />
        </div>
      </header>

      <dl className="px-4 sm:px-5">
        <DetailRow label={labels.campus} value={details.campus} />
        <DetailRow label={labels.degreeClass} value={details.degreeClass} />
        <DetailRow label={labels.admissionType} value={details.admissionType} />
        <DetailRow
          label={labels.euDeadline}
          value={details.applicationDeadlineEu}
        />
        <DetailRow
          label={labels.nonEuDeadline}
          value={details.applicationDeadlineNonEu}
        />
        <DetailRow
          label={labels.academicRequirements}
          value={details.academicRequirements}
        />
        <DetailRow
          label={labels.languageRequirements}
          value={details.languageRequirements}
        />
        <DetailRow
          label={labels.entryExamOrTest}
          value={details.entryExamOrTest}
        />
      </dl>

      {details.requiredDocuments.length > 0 && (
        <div className="border-t border-[var(--editorial-border)] px-4 py-5 sm:px-5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
            {labels.requiredDocuments}
          </h3>
          <ul className="mt-4 space-y-3">
            {details.requiredDocuments.map((document) => (
              <li
                key={document}
                className="break-words border-l-2 border-[var(--editorial-sage)] pl-3 font-serif text-lg leading-7 text-[var(--editorial-ink)]"
              >
                {document}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(details.uncertain.length > 0 ||
        details.uncertaintyNotes.length > 0) && (
        <div className="border-t border-[var(--editorial-border)] bg-[var(--editorial-band)] px-4 py-4 text-sm font-bold leading-6 text-[var(--editorial-muted)] sm:px-5">
          {labels.uncertaintyNote}
        </div>
      )}
    </section>
  );
}
