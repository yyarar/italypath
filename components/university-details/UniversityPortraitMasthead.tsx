"use client";

import Image from "next/image";
import { ArrowLeft, ExternalLink, Heart, MapPin } from "lucide-react";

import { DEFAULT_IMAGE, type University } from "@/app/data";

interface UniversityPortraitMastheadProps {
  university: University;
  eyebrow: string;
  backLabel: string;
  websiteLabel: string;
  officialSourceLabel: string;
  programCountLabel: string;
  favoriteLabel: string;
  favorite: boolean;
  favoriteLoading: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
}

export function UniversityPortraitMasthead({
  university,
  eyebrow,
  backLabel,
  websiteLabel,
  officialSourceLabel,
  programCountLabel,
  favoriteLabel,
  favorite,
  favoriteLoading,
  onBack,
  onToggleFavorite,
}: UniversityPortraitMastheadProps) {
  return (
    <header className="border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            disabled={favoriteLoading}
            aria-label={favoriteLabel}
            aria-pressed={favorite}
            className={`inline-flex h-11 w-11 items-center justify-center border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
              favorite
                ? "border-[var(--editorial-terracotta)] bg-[#fbf0eb] text-[var(--editorial-terracotta)]"
                : "border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-muted)] hover:border-[var(--editorial-terracotta)] hover:text-[var(--editorial-terracotta)]"
            } disabled:opacity-50`}
          >
            <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(360px,1.02fr)_minmax(0,0.98fr)] lg:items-stretch">
          <div className="relative aspect-[16/11] min-h-64 overflow-hidden border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
            <Image
              src={university.image || DEFAULT_IMAGE}
              alt={university.name}
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-between border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 sm:p-7">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
                {eyebrow}
              </p>
              <h1 className="mt-4 break-words font-serif text-4xl font-semibold leading-[0.98] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl">
                {university.name}
              </h1>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold text-[var(--editorial-muted)]">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0 text-[var(--editorial-terracotta)]" />
                  <span className="truncate">{university.city}</span>
                </span>
                <span>{university.type}</span>
              </div>
            </div>

            <dl className="mt-8 grid gap-3 border-t border-[var(--editorial-border)] pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
                  {programCountLabel}
                </dt>
                <dd className="mt-1 font-serif text-3xl font-semibold text-[var(--editorial-ink)]">
                  {university.departments.length}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
                  {officialSourceLabel}
                </dt>
                <dd className="mt-2">
                  <a
                    href={university.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
                  >
                    {websiteLabel}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </header>
  );
}
