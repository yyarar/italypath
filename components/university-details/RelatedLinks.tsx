import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { RelatedLinksData } from "@/lib/relatedLinks";

export interface RelatedLinksLabels {
  title: string;
  sameCity: string;
  cityGuide: string;
  regionScholarships: string;
  programs: string;
  sameField: string;
  sameFieldNote: string;
}

interface RelatedLinksProps {
  data: RelatedLinksData;
  labels: RelatedLinksLabels;
  /** Program sayfasinda sehir/burs linkleri "Sonraki adimlar" blogunda durur; burada tekrar edilmez. */
  showHubLinks?: boolean;
}

interface HubLink {
  href: string;
  label: string;
}

// Ic baglanti blogu: ayni resmi bolum sinifindaki diger okullarin programlari, ayni sehirdeki
// universiteler, sehir rehberi ve bolge burslari (SEO_AUDIT.md §22). Sunucu HTML'inde render
// edilir; Googlebot ve ziyaretci ayni linkleri gorur.
export function RelatedLinks({ data, labels, showHubLinks = true }: RelatedLinksProps) {
  const hubLinks: HubLink[] = [];
  if (showHubLinks && data.cityGuide) {
    hubLinks.push({
      href: data.cityGuide.href,
      label: labels.cityGuide.replace("{city}", data.cityGuide.name),
    });
  }
  if (showHubLinks && data.regionScholarships) {
    hubLinks.push({
      href: data.regionScholarships.href,
      label: labels.regionScholarships.replace("{region}", data.regionScholarships.name),
    });
  }

  const sameFieldPrograms = data.sameFieldPrograms ?? [];
  if (
    sameFieldPrograms.length === 0 &&
    data.sameCityUniversities.length === 0 &&
    hubLinks.length === 0
  ) {
    return null;
  }

  return (
    <section
      aria-labelledby="related-links-title"
      className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
    >
      <header className="border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 py-3 sm:px-5">
        <h2
          id="related-links-title"
          className="text-xs font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]"
        >
          {labels.title}
        </h2>
      </header>
      {sameFieldPrograms.length > 0 ? (
        <div className="border-b border-[var(--editorial-border)] px-4 py-4 sm:px-5">
          <h3 className="font-serif text-lg font-semibold text-[var(--editorial-ink)]">
            {labels.sameField}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[var(--editorial-muted)]">
            {labels.sameFieldNote}
          </p>
          <ul className="mt-2 grid gap-x-8 md:grid-cols-2">
            {sameFieldPrograms.map((entry) => (
              <li
                key={entry.href}
                className="border-t border-[var(--editorial-border)]"
              >
                <Link
                  href={entry.href}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm text-[var(--editorial-ink)] transition hover:text-[var(--editorial-terracotta-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{entry.programName}</span>
                    <span className="block truncate text-xs text-[var(--editorial-muted)]">
                      {entry.universityName}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-[var(--editorial-muted)]">
                    {entry.code}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {data.sameCityUniversities.length > 0 ? (
          <div className="px-4 py-4 sm:px-5">
            <h3 className="font-serif text-lg font-semibold text-[var(--editorial-ink)]">
              {labels.sameCity.replace("{city}", data.city)}
            </h3>
            <ul className="mt-2 divide-y divide-[var(--editorial-border)]">
              {data.sameCityUniversities.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/universities/${entry.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm font-semibold text-[var(--editorial-ink)] transition hover:text-[var(--editorial-terracotta-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                  >
                    <span className="min-w-0 truncate">{entry.name}</span>
                    <span className="shrink-0 text-xs font-bold text-[var(--editorial-muted)]">
                      {entry.programCount} {labels.programs}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {hubLinks.length > 0 ? (
          <div className="border-t border-[var(--editorial-border)] px-4 py-4 sm:px-5 md:border-l md:border-t-0">
            <ul className="space-y-3">
              {hubLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--editorial-terracotta-ink)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                  >
                    {link.label}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
