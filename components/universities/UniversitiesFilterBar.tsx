"use client";

import { Heart, LayoutList, MapPin, Rows3, Search, X } from "lucide-react";

import type { UniversityViewMode } from "@/lib/universitiesFilters";

export interface UniversitiesFilterBarProps {
  searchTerm: string;
  selectedCity: string;
  selectedType: string;
  showFavoritesOnly: boolean;
  hasActiveFilters: boolean;
  resultCount: number;
  totalCount: number;
  favoriteCount: number;
  citiesWithCounts: [string, number][];
  viewMode: UniversityViewMode;
  labels: {
    searchPlaceholder: string;
    searchInputPlaceholder: string;
    filterLabel: string;
    allCities: string;
    schoolType: string;
    publicType: string;
    privateType: string;
    favoritesOnly: string;
    showAll: string;
    clearFilters: string;
    resultSummary: string;
    viewSwitcherLabel: string;
    viewGrid: string;
    viewCompact: string;
    viewGridAria: string;
    viewCompactAria: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  onViewModeChange: (mode: UniversityViewMode) => void;
}

export function UniversitiesFilterBar({
  searchTerm,
  selectedCity,
  selectedType,
  showFavoritesOnly,
  hasActiveFilters,
  resultCount,
  totalCount,
  favoriteCount,
  citiesWithCounts,
  viewMode,
  labels,
  onFilterChange,
  onClearFilters,
  onViewModeChange,
}: UniversitiesFilterBarProps) {
  const publicActive = selectedType === "Devlet";
  const privateActive = selectedType === "Özel";

  return (
    <section className="min-w-0 overflow-hidden border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
      <div className="flex min-w-0 flex-col gap-3 border-b border-[var(--editorial-border)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
            {labels.filterLabel}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--editorial-muted)]">
            {resultCount} / {totalCount} {labels.resultSummary}
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-2 border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-3 py-2 text-xs font-bold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-terracotta)] hover:text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              <X className="h-3.5 w-3.5" />
              {labels.clearFilters}
            </button>
          )}

          <div
            className="inline-flex min-w-0 border border-[var(--editorial-border)] bg-[var(--editorial-paper)]"
            role="group"
            aria-label={labels.viewSwitcherLabel}
          >
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              aria-label={labels.viewGridAria}
              aria-pressed={viewMode === "grid"}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
                viewMode === "grid"
                  ? "bg-[var(--editorial-sage)] text-white"
                  : "text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
              }`}
            >
              <Rows3 className="h-3.5 w-3.5" />
              {labels.viewGrid}
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("compact")}
              aria-label={labels.viewCompactAria}
              aria-pressed={viewMode === "compact"}
              className={`inline-flex items-center gap-2 border-l border-[var(--editorial-border)] px-3 py-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
                viewMode === "compact"
                  ? "bg-[var(--editorial-sage)] text-white"
                  : "text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              {labels.viewCompact}
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 p-4 lg:grid-cols-[minmax(260px,1.4fr)_minmax(170px,0.7fr)_minmax(210px,0.8fr)_auto] lg:items-end">
        <label className="min-w-0">
          <span className="sr-only">{labels.searchPlaceholder}</span>
          <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
            <Search className="h-3.5 w-3.5" />
            {labels.searchPlaceholder}
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onFilterChange("q", event.target.value)}
            placeholder={labels.searchInputPlaceholder}
            aria-label={labels.searchPlaceholder}
            className="h-12 w-full border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 text-base font-semibold text-[var(--editorial-ink)] outline-none transition placeholder:text-[var(--editorial-muted)] focus:border-[var(--editorial-sage)] focus:ring-2 focus:ring-[var(--editorial-sage)]/15 sm:text-sm"
          />
        </label>

        <label className="min-w-0">
          <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
            <MapPin className="h-3.5 w-3.5" />
            {labels.allCities}
          </span>
          <select
            value={selectedCity}
            onChange={(event) => onFilterChange("city", event.target.value)}
            aria-label={labels.allCities}
            className="h-12 w-full border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-3 text-sm font-bold text-[var(--editorial-ink)] outline-none transition focus:border-[var(--editorial-sage)] focus:ring-2 focus:ring-[var(--editorial-sage)]/15"
          >
            <option value="">
              {labels.allCities} ({totalCount})
            </option>
            {citiesWithCounts.map(([city, count]) => (
              <option key={city} value={city}>
                {city} ({count})
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
            {labels.schoolType}
          </p>
          <div className="grid h-12 grid-cols-2 border border-[var(--editorial-border)] bg-[var(--editorial-paper)]">
            <button
              type="button"
              onClick={() => onFilterChange("type", publicActive ? "" : "Devlet")}
              aria-pressed={publicActive}
              className={`text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
                publicActive
                  ? "bg-[var(--editorial-sage)] text-white"
                  : "text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
              }`}
            >
              {labels.publicType}
            </button>
            <button
              type="button"
              onClick={() => onFilterChange("type", privateActive ? "" : "Özel")}
              aria-pressed={privateActive}
              className={`border-l border-[var(--editorial-border)] text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
                privateActive
                  ? "bg-[var(--editorial-terracotta)] text-white"
                  : "text-[var(--editorial-muted)] hover:text-[var(--editorial-ink)]"
              }`}
            >
              {labels.privateType}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onFilterChange("fav", showFavoritesOnly ? "" : "1")}
          aria-pressed={showFavoritesOnly}
          className={`flex h-12 items-center justify-center gap-2 border px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
            showFavoritesOnly
              ? "border-[var(--editorial-terracotta)] bg-[var(--editorial-terracotta)] text-white"
              : "border-[var(--editorial-border)] bg-[var(--editorial-paper)] text-[var(--editorial-ink)] hover:border-[var(--editorial-terracotta)] hover:text-[var(--editorial-terracotta)]"
          }`}
        >
          <Heart className={`h-4 w-4 ${favoriteCount > 0 ? "fill-current" : ""}`} />
          {showFavoritesOnly ? labels.showAll : labels.favoritesOnly}
        </button>
      </div>
    </section>
  );
}
