"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, MapPin } from "lucide-react";

import { DEFAULT_IMAGE, type University } from "@/app/data";
import {
  getTypeLabel,
  getUniversityDescription,
  type UniversityLanguage,
} from "@/lib/universitiesFilters";

export interface UniversityRowProps {
  university: University;
  departmentCount?: number;
  language: UniversityLanguage;
  reviewLabel: string;
  departmentsLabel: string;
  moreLabel: string;
  isFavorite: boolean;
  onToggleFavorite: (universityId: number) => void;
}

function favoriteLabel(universityName: string, language: UniversityLanguage, isFavorite: boolean) {
  if (language === "tr") {
    return isFavorite
      ? `${universityName} favorilerden çıkar`
      : `${universityName} favorilere ekle`;
  }

  return isFavorite
    ? `Remove ${universityName} from favorites`
    : `Add ${universityName} to favorites`;
}

function DepartmentTags({
  university,
  departmentCount,
  moreLabel,
}: {
  university: University;
  departmentCount?: number;
  moreLabel: string;
}) {
  const visibleDepartments = university.departments.slice(0, 3);
  const totalDepartmentCount = departmentCount ?? university.departments.length;
  const hiddenCount = Math.max(totalDepartmentCount - visibleDepartments.length, 0);

  return (
    <div className="mt-4 flex min-w-0 flex-wrap gap-2">
      {visibleDepartments.map((department) => (
        <span
          key={department.slug}
          className="max-w-full truncate border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-2.5 py-1 text-[11px] font-bold text-[var(--editorial-muted)]"
        >
          {department.name}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-2.5 py-1 text-[11px] font-bold text-[var(--editorial-terracotta)]">
          +{hiddenCount} {moreLabel}
        </span>
      )}
    </div>
  );
}

function FavoriteButton({
  university,
  language,
  isFavorite,
  onToggleFavorite,
}: {
  university: University;
  language: UniversityLanguage;
  isFavorite: boolean;
  onToggleFavorite: (universityId: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggleFavorite(university.id)}
      aria-label={favoriteLabel(university.name, language, isFavorite)}
      aria-pressed={isFavorite}
      className={`inline-flex h-10 w-10 items-center justify-center border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
        isFavorite
          ? "border-[var(--editorial-terracotta)] bg-[#fbf0eb] text-[var(--editorial-terracotta)]"
          : "border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-muted)] hover:border-[var(--editorial-terracotta)] hover:text-[var(--editorial-terracotta)]"
      }`}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
    </button>
  );
}

export function UniversityGuideRow({
  university,
  departmentCount,
  language,
  reviewLabel,
  departmentsLabel,
  moreLabel,
  isFavorite,
  onToggleFavorite,
}: UniversityRowProps) {
  const typeLabel = getTypeLabel(university.type, language);
  const description = getUniversityDescription(university, language);
  const displayedDepartmentCount = departmentCount ?? university.departments.length;

  return (
    <article className="grid gap-4 p-4 transition hover:bg-[var(--editorial-paper)] sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:p-5">
      <Link
        href={{ pathname: `/universities/${university.id}`, query: { from: "list" } }}
        className="relative h-24 overflow-hidden border border-[var(--editorial-border)] bg-[var(--editorial-paper)] sm:h-28"
        aria-label={university.name}
      >
        <Image
          src={university.image || DEFAULT_IMAGE}
          alt={university.name}
          fill
          sizes="112px"
          className="object-cover transition duration-500 hover:scale-105"
        />
      </Link>

      <div className="min-w-0">
        <Link
          href={{ pathname: `/universities/${university.id}`, query: { from: "list" } }}
          className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          <h2 className="font-serif text-2xl font-semibold leading-tight tracking-[-0.02em] text-[var(--editorial-ink)] transition group-hover:text-[var(--editorial-sage)]">
            {university.name}
          </h2>
          <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-[var(--editorial-muted)]">
            {description}
          </p>
        </Link>

        <div className="mt-4 grid gap-2 text-xs font-bold text-[var(--editorial-muted)] sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/cities?city=${encodeURIComponent(university.city)}`}
            className="inline-flex min-w-0 items-center gap-1.5 hover:text-[var(--editorial-terracotta)] transition"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--editorial-terracotta)]" />
            <span className="truncate">{university.city}</span>
          </Link>
          <span>{typeLabel}</span>
          <span className="truncate">{university.fee}</span>
          <span>
            {displayedDepartmentCount} {departmentsLabel}
          </span>
        </div>

        <DepartmentTags
          university={university}
          departmentCount={displayedDepartmentCount}
          moreLabel={moreLabel}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--editorial-border)] pt-4 sm:min-w-[112px] sm:flex-col sm:items-end sm:justify-between sm:border-t-0 sm:pt-0">
        <FavoriteButton
          university={university}
          language={language}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
        <Link
          href={{ pathname: `/universities/${university.id}`, query: { from: "list" } }}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--editorial-sage)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          {reviewLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

export function UniversityCompactRow({
  university,
  departmentCount,
  language,
  reviewLabel,
  departmentsLabel,
  isFavorite,
  onToggleFavorite,
}: UniversityRowProps) {
  const typeLabel = getTypeLabel(university.type, language);
  const displayedDepartmentCount = departmentCount ?? university.departments.length;

  return (
    <article className="grid gap-3 p-3 transition hover:bg-[var(--editorial-paper)] sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:p-4">
      <Link
        href={{ pathname: `/universities/${university.id}`, query: { from: "list" } }}
        className="relative h-18 min-h-18 overflow-hidden border border-[var(--editorial-border)] bg-[var(--editorial-paper)]"
        aria-label={university.name}
      >
        <Image
          src={university.image || DEFAULT_IMAGE}
          alt={university.name}
          fill
          sizes="72px"
          className="object-cover"
        />
      </Link>

      <Link
        href={{ pathname: `/universities/${university.id}`, query: { from: "list" } }}
        className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
      >
        <h2 className="truncate font-serif text-xl font-semibold tracking-[-0.015em] text-[var(--editorial-ink)]">
          {university.name}
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold text-[var(--editorial-muted)] sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <span className="truncate">{university.city}</span>
          <span>{typeLabel}</span>
          <span className="truncate">{university.fee}</span>
          <span>
            {displayedDepartmentCount} {departmentsLabel}
          </span>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <FavoriteButton
          university={university}
          language={language}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
        <Link
          href={{ pathname: `/universities/${university.id}`, query: { from: "list" } }}
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-[var(--editorial-sage)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          {reviewLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
