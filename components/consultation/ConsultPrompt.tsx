import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { CONSULT_PAGE_PATH } from "@/lib/consultation";

interface ConsultPromptProps {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}

// İçerik sayfalarında (program, üniversite, burs, ISEE) ücretsiz ön görüşmeye açılan kutu.
export default function ConsultPrompt({ eyebrow, title, body, cta }: ConsultPromptProps) {
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
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">{body}</p>
        </div>
        <Link
          href={CONSULT_PAGE_PATH}
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--editorial-terracotta)] bg-[var(--editorial-terracotta)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-terracotta)]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
