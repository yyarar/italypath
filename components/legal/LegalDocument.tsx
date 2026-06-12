import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { LegalDocument } from "@/lib/legal/documents";

// Yasal belgeleri editöryal stille basan sunum bileşeni.
// İnteraktif değil; saf Server Component.
export default function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--editorial-muted)] transition hover:text-[var(--editorial-ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Ana sayfaya dön
      </Link>

      <header className="mt-8 border-b border-[var(--editorial-border)] pb-6">
        <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] text-[var(--editorial-ink)] sm:text-4xl">
          {doc.title}
        </h1>
        <p className="mt-3 text-sm text-[var(--editorial-muted)]">
          Son güncelleme: {doc.lastUpdated}
        </p>
      </header>

      <div className="mt-8 space-y-4">
        {doc.intro.map((paragraph, index) => (
          <p
            key={`intro-${index}`}
            className="text-[15px] leading-7 text-[var(--editorial-ink)]"
          >
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-10 space-y-10">
        {doc.sections.map((section, index) => (
          <section key={`section-${index}`} className="space-y-4">
            {section.heading ? (
              <h2 className="font-serif text-xl font-medium tracking-[-0.01em] text-[var(--editorial-ink)]">
                {section.heading}
              </h2>
            ) : null}

            {section.paragraphs?.map((paragraph, pIndex) => (
              <p
                key={`p-${index}-${pIndex}`}
                className="text-[15px] leading-7 text-[var(--editorial-muted)]"
              >
                {paragraph}
              </p>
            ))}

            {section.list ? (
              <ul className="space-y-2">
                {section.list.map((item, lIndex) => (
                  <li
                    key={`li-${index}-${lIndex}`}
                    className="flex gap-3 text-[15px] leading-7 text-[var(--editorial-muted)]"
                  >
                    <span
                      aria-hidden
                      className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--editorial-terracotta)]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
