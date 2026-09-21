import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import ConsultPrompt from "@/components/consultation/ConsultPrompt";
import type { RelatedLinksData } from "@/lib/relatedLinks";

export interface ProgramNextStepsLabels {
  title: string;
  isee: string;
  cityGuide: string;
  regionScholarships: string;
}

interface ProgramNextStepsProps {
  related: RelatedLinksData | null;
  labels: ProgramNextStepsLabels;
  consult: { eyebrow: string; title: string; body: string; cta: string };
}

// Program sayfasinin kapanis blogu: ogrencinin bu programdan sonra bakacagi araclar (ISEE,
// sehir rehberi, bolge burslari) ve ucretsiz on gorusme kutusu tek yerde durur. Sehir/burs
// linkleri bu yuzden RelatedLinks'te tekrar edilmez (showHubLinks={false}).
export function ProgramNextSteps({ related, labels, consult }: ProgramNextStepsProps) {
  const links: { href: string; label: string }[] = [{ href: "/isee", label: labels.isee }];
  if (related?.cityGuide) {
    links.push({
      href: related.cityGuide.href,
      label: labels.cityGuide.replace("{city}", related.cityGuide.name),
    });
  }
  if (related?.regionScholarships) {
    links.push({
      href: related.regionScholarships.href,
      label: labels.regionScholarships.replace("{region}", related.regionScholarships.name),
    });
  }

  return (
    <section
      aria-labelledby="program-next-steps-title"
      className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
    >
      <header className="border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 py-3 sm:px-5">
        <h2
          id="program-next-steps-title"
          className="text-xs font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]"
        >
          {labels.title}
        </h2>
      </header>
      <ul className="grid gap-3 px-4 py-4 sm:grid-cols-3 sm:px-5">
        {links.map((link) => (
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
      <ConsultPrompt {...consult} />
    </section>
  );
}
