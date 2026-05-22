import Link from "next/link";
import { ArrowRight, MessageSquareText } from "lucide-react";

interface DetailMentorPromptProps {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}

export function DetailMentorPrompt({
  href,
  eyebrow,
  title,
  body,
  cta,
}: DetailMentorPromptProps) {
  return (
    <aside className="border-y border-[var(--editorial-border)] bg-[var(--editorial-band)] px-4 py-6 sm:px-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-[var(--editorial-ink)]">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">
            {body}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          <MessageSquareText className="h-4 w-4" />
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}
