"use client";

import React, { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { m } from "framer-motion";

import type { University } from "@/types/universities";
import { useLanguage } from "@/context/LanguageContext";
import { useFavorites } from "@/lib/useFavorites";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { useUniversitiesData } from "@/lib/useUniversitiesData";
import {
  UNIVERSITIES_VIEW_MODE_EVENT,
  UNIVERSITIES_VIEW_MODE_STORAGE_KEY,
  createUniversitiesFilterUrl,
  filterUniversities,
  getCitiesWithCounts,
  getTotalDepartments,
  parseUniversitiesFilterParams,
  type UniversitiesExplorerFilters,
  type UniversityViewMode,
} from "@/lib/universitiesFilters";
import { UniversitiesFilterBar } from "./UniversitiesFilterBar";
import { UniversitiesHero } from "./UniversitiesHero";
import {
  UniversitiesEmptyState,
  UniversitiesErrorState,
  UniversitiesLoadingState,
} from "./UniversitiesStates";
import { UniversityCompactRow, UniversityGuideRow } from "./UniversityRows";

const MAX_STAGGER_WINDOW = 0.8;
const MIN_STAGGER = 0.012;
const MAX_STAGGER = 0.06;

export type { UniversitiesExplorerFilters };

interface UniversitiesExplorerProps {
  initialUniversities: University[];
  initialFilters: UniversitiesExplorerFilters;
  initialStats: {
    universitiesCount: number;
    departmentsCount: number;
    citiesCount: number;
  };
  initialCitiesWithCounts: [string, number][];
}

function getDisplayedDepartmentCount(university: University) {
  return (
    (university as University & { departmentCount?: number }).departmentCount ??
    university.departments.length
  );
}

function readStoredViewMode(): UniversityViewMode {
  if (typeof window === "undefined") return "grid";
  const storedMode = safeGetItem(UNIVERSITIES_VIEW_MODE_STORAGE_KEY);
  return storedMode === "compact" ? "compact" : "grid";
}

function subscribeToViewMode(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === UNIVERSITIES_VIEW_MODE_STORAGE_KEY) {
      callback();
    }
  };
  const handleLocalChange = () => callback();

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(UNIVERSITIES_VIEW_MODE_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(UNIVERSITIES_VIEW_MODE_EVENT, handleLocalChange);
  };
}

// Filtreler adres satirina window.history.replaceState ile yazilir (her tusta sunucuya gidis yok).
// Geri tusuyla listeye donulunce sunucu verisi ilk adresin filtrelerini tasiyabilir; baslangic
// durumu bu yuzden adresin kendisinden okunur (ilk yuklemede sunucuyla ayni ayristirici).
function readFiltersFromLocation(fallback: UniversitiesExplorerFilters) {
  if (typeof window === "undefined") return fallback;
  return parseUniversitiesFilterParams(new URLSearchParams(window.location.search));
}

export function UniversitiesExplorer({
  initialUniversities,
  initialFilters,
  initialStats,
  initialCitiesWithCounts,
}: UniversitiesExplorerProps) {
  const [filters, setFilters] = useState<UniversitiesExplorerFilters>(() =>
    readFiltersFromLocation(initialFilters)
  );

  const { t, language, toggleLanguage } = useLanguage();
  const { favorites, toggleFavorite, isFavorite, loading: favoritesLoading } = useFavorites();
  const { universities, loading: universitiesLoading, error: universitiesError } =
    useUniversitiesData(initialUniversities);

  const activeViewMode = useSyncExternalStore<UniversityViewMode>(
    subscribeToViewMode,
    readStoredViewMode,
    (): UniversityViewMode => "grid"
  );

  const hasFullUniversityData = universities.length >= initialStats.universitiesCount;
  const computedCitiesWithCounts = useMemo(() => getCitiesWithCounts(universities), [universities]);
  const citiesWithCounts = hasFullUniversityData
    ? computedCitiesWithCounts
    : initialCitiesWithCounts;
  const totalDepartments = useMemo(() => getTotalDepartments(universities), [universities]);
  const displayedDepartmentsCount = hasFullUniversityData
    ? totalDepartments
    : initialStats.departmentsCount;
  const displayedUniversitiesCount = hasFullUniversityData
    ? universities.length
    : initialStats.universitiesCount;
  const displayedCitiesCount = hasFullUniversityData
    ? computedCitiesWithCounts.length
    : initialStats.citiesCount;
  const hasActiveFilters =
    filters.selectedCity ||
    filters.selectedType ||
    filters.searchTerm ||
    filters.showFavoritesOnly;

  const updateUrl = useCallback((nextFilters: UniversitiesExplorerFilters) => {
    window.history.replaceState(
      null,
      "",
      createUniversitiesFilterUrl(window.location.pathname, nextFilters)
    );
  }, []);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      setFilters((currentFilters) => {
        const nextFilters = { ...currentFilters };

        if (key === "q") nextFilters.searchTerm = value;
        if (key === "city") nextFilters.selectedCity = value;
        if (key === "type") nextFilters.selectedType = value;
        if (key === "fav") nextFilters.showFavoritesOnly = value === "1";

        updateUrl(nextFilters);
        return nextFilters;
      });
    },
    [updateUrl]
  );

  const clearAllFilters = useCallback(() => {
    const nextFilters: UniversitiesExplorerFilters = {
      searchTerm: "",
      selectedCity: "",
      selectedType: "",
      showFavoritesOnly: false,
    };
    setFilters(nextFilters);
    updateUrl(nextFilters);
  }, [updateUrl]);

  const handleViewModeChange = useCallback((nextMode: UniversityViewMode) => {
    if (typeof window === "undefined") return;
    safeSetItem(UNIVERSITIES_VIEW_MODE_STORAGE_KEY, nextMode);
    window.dispatchEvent(new Event(UNIVERSITIES_VIEW_MODE_EVENT));
  }, []);

  const filteredUniversities = useMemo(() => {
    return filterUniversities(universities, {
      searchTerm: filters.searchTerm,
      selectedCity: filters.selectedCity,
      selectedType: filters.selectedType,
      showFavoritesOnly: filters.showFavoritesOnly,
      isFavorite,
    });
  }, [filters, isFavorite, universities]);

  const staggerChildren = useMemo(() => {
    const childCount = Math.max(filteredUniversities.length - 1, 1);
    const computed = MAX_STAGGER_WINDOW / childCount;
    return Math.min(MAX_STAGGER, Math.max(MIN_STAGGER, computed));
  }, [filteredUniversities.length]);

  if (universitiesError && universities.length === 0) {
    return <UniversitiesErrorState message={t.list.error} />;
  }

  const showLoadingState =
    universitiesLoading || (filters.showFavoritesOnly && favoritesLoading);
  if (showLoadingState) {
    return <UniversitiesLoadingState label={t.list.loading} />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren } },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 130, damping: 22 },
    },
  };

  const emptyDescription = filters.showFavoritesOnly
    ? t.list.emptyFavDesc
    : filters.searchTerm
      ? `"${filters.searchTerm}" — ${t.list.noResultsDesc}`
      : t.list.noResultsDesc;

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24 text-[var(--editorial-ink)] md:pb-12">
      <UniversitiesHero
        backHomeLabel={t.list.backHome}
        guideLabel={t.list.guideLabel}
        title={t.list.heroTitle}
        subtitle={t.list.heroSubtitle}
        universitiesCount={displayedUniversitiesCount}
        departmentsCount={displayedDepartmentsCount}
        citiesCount={displayedCitiesCount}
        universitiesLabel={t.list.universitiesStat}
        departmentsLabel={t.list.departmentsStat}
        citiesLabel={t.list.citiesStat}
        languageToggleLabel={language === "tr" ? "Switch to English" : "Türkçeye Geç"}
        languageButtonText={language === "tr" ? "EN" : "TR"}
        onToggleLanguage={toggleLanguage}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <UniversitiesFilterBar
          searchTerm={filters.searchTerm}
          selectedCity={filters.selectedCity}
          selectedType={filters.selectedType}
          showFavoritesOnly={filters.showFavoritesOnly}
          hasActiveFilters={Boolean(hasActiveFilters)}
          resultCount={filteredUniversities.length}
          totalCount={displayedUniversitiesCount}
          favoriteCount={favorites.length}
          citiesWithCounts={citiesWithCounts}
          viewMode={activeViewMode}
          labels={{
            searchPlaceholder: t.list.searchPlaceholder,
            searchInputPlaceholder: t.list.searchInputPlaceholder,
            filterLabel: t.list.filterLabel,
            allCities: t.list.allCities,
            schoolType: t.list.schoolType,
            publicType: t.list.publicType,
            privateType: t.list.privateType,
            favoritesOnly: t.list.favoritesOnly,
            showAll: t.list.showAll,
            clearFilters: t.list.clearFilters,
            resultSummary: t.list.resultSummary,
            viewSwitcherLabel: t.list.viewSwitcherLabel,
            viewGrid: t.list.viewGrid,
            viewCompact: t.list.viewCompact,
            viewGridAria: t.list.viewGridAria,
            viewCompactAria: t.list.viewCompactAria,
          }}
          onFilterChange={updateFilter}
          onClearFilters={clearAllFilters}
          onViewModeChange={handleViewModeChange}
        />

        {filteredUniversities.length > 0 ? (
          <m.div
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="mt-6 divide-y divide-[var(--editorial-border)] border border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
          >
            {filteredUniversities.map((university) => (
              <m.div key={university.id} variants={rowVariants}>
                {activeViewMode === "grid" ? (
                  <UniversityGuideRow
                    university={university}
                    departmentCount={getDisplayedDepartmentCount(university)}
                    language={language}
                    reviewLabel={t.list.review}
                    departmentsLabel={t.list.departmentsStat}
                    moreLabel={t.list.more}
                    isFavorite={isFavorite(university.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ) : (
                  <UniversityCompactRow
                    university={university}
                    departmentCount={getDisplayedDepartmentCount(university)}
                    language={language}
                    reviewLabel={t.list.review}
                    departmentsLabel={t.list.departmentsStat}
                    moreLabel={t.list.more}
                    isFavorite={isFavorite(university.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                )}
              </m.div>
            ))}
          </m.div>
        ) : (
          <UniversitiesEmptyState
            title={filters.showFavoritesOnly ? t.list.emptyFav : t.list.noResults}
            description={emptyDescription}
            actionLabel={t.list.clearFilters}
            onClearFilters={clearAllFilters}
          />
        )}
      </main>
    </div>
  );
}
