"use client";

import { ExternalLink } from "lucide-react";

import { fill, formatEuro, type Language } from "@/components/isee/format";
import { useLanguage } from "@/context/LanguageContext";
import { CITY_THRESHOLDS, FORMULA_SOURCES, RATE_SOURCE, THRESHOLDS_VERIFIED_AT } from "@/lib/isee/reference";

const LINK_CLASS =
  "inline-flex items-center gap-1 font-semibold text-[var(--editorial-sage)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]";

function formatIsoDate(iso: string, language: Language) {
  const [year, month, day] = iso.split("-");
  return language === "tr" ? `${day}.${month}.${year}` : iso;
}

function TextSection({ heading, body }: { heading: string; body: string[] }) {
  return (
    <section>
      <h3 className="font-serif text-2xl font-normal leading-tight text-[var(--editorial-ink)]">{heading}</h3>
      {body.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-base leading-8 text-[var(--editorial-muted)]">
          {paragraph}
        </p>
      ))}
    </section>
  );
}

export default function IseeExplainer() {
  const { t, language } = useLanguage();
  const copy = t.iseeTool.explainer;
  const cityNames = t.iseeTool.result.cityNames;

  return (
    <section aria-labelledby="isee-explainer-heading" className="border-t border-[var(--editorial-border)] pt-10">
      <h2
        id="isee-explainer-heading"
        className="max-w-3xl font-serif text-3xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-4xl"
      >
        {copy.title}
      </h2>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <TextSection heading={copy.what.heading} body={copy.what.body} />
        <section>
          <h3 className="font-serif text-2xl font-normal leading-tight text-[var(--editorial-ink)]">
            {copy.how.heading}
          </h3>
          <ul className="mt-3 space-y-3">
            {copy.how.bullets.map((bullet) => (
              <li
                key={bullet}
                className="border-l-2 border-[var(--editorial-sage)] pl-4 text-base leading-7 text-[var(--editorial-muted)]"
              >
                {bullet}
              </li>
            ))}
          </ul>
        </section>
        <TextSection heading={copy.difference.heading} body={copy.difference.body} />
        <TextSection heading={copy.year.heading} body={copy.year.body} />
        <TextSection heading={copy.official.heading} body={copy.official.body} />
      </div>

      <div className="mt-12">
        <h3 className="font-serif text-2xl font-normal leading-tight text-[var(--editorial-ink)]">
          {copy.limitsTitle}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">
          {fill(copy.limitsCaption, { date: formatIsoDate(THRESHOLDS_VERIFIED_AT, language) })}
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CITY_THRESHOLDS.map((city) => (
            <li key={city.key} className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4">
              <p className="text-lg font-semibold text-[var(--editorial-ink)]">{cityNames[city.key]}</p>
              <p className="text-sm text-[var(--editorial-muted)]">{city.body}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--editorial-muted)]">{copy.iseeLimit}</dt>
                  <dd className="font-semibold tabular-nums text-[var(--editorial-ink)]">
                    {formatEuro(city.iseeLimit, language, 2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--editorial-muted)]">{copy.ispeLimit}</dt>
                  <dd className="font-semibold tabular-nums text-[var(--editorial-ink)]">
                    {formatEuro(city.ispeLimit, language, 2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--editorial-muted)]">{copy.requestedYear}</dt>
                  <dd className="font-semibold tabular-nums text-[var(--editorial-ink)]">{city.requestedYear}</dd>
                </div>
              </dl>
              <a href={city.sourceUrl} target="_blank" rel="noopener noreferrer" className={`mt-3 text-sm ${LINK_CLASS}`}>
                {copy.sourceLink}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <h3 className="text-base font-semibold text-[var(--editorial-ink)]">{copy.sourcesTitle}</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a href={RATE_SOURCE.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {copy.sourceLabels.rates}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </li>
          {FORMULA_SOURCES.map((source) => (
            <li key={source.key}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                {copy.sourceLabels[source.key]}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
