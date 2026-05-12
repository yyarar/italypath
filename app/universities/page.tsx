"use client";

import React, { Suspense, useCallback, useMemo, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { UniversitiesFilterBar } from "@/components/universities/UniversitiesFilterBar";
import { UniversitiesHero } from "@/components/universities/UniversitiesHero";
import { UniversitiesEmptyState, UniversitiesErrorState, UniversitiesLoadingState } from "@/components/universities/UniversitiesStates";
import { UniversityCompactRow, UniversityGuideRow } from "@/components/universities/UniversityRows";
import { useLanguage } from "@/context/LanguageContext";
import { useFavorites } from "@/lib/useFavorites";
import { useUniversitiesData } from "@/lib/useUniversitiesData";
import {
  UNIVERSITIES_VIEW_MODE_EVENT,
  UNIVERSITIES_VIEW_MODE_STORAGE_KEY,
  filterUniversities,
  getCitiesWithCounts,
  getTotalDepartments,
  type UniversityViewMode,
} from "@/lib/universitiesFilters";

const MAX_STAGGER_WINDOW = 0.8;
const MIN_STAGGER = 0.012;
const MAX_STAGGER = 0.06;

function readStoredViewMode(): UniversityViewMode {
  if (typeof window === "undefined") return "grid";
  const storedMode = window.localStorage.getItem(UNIVERSITIES_VIEW_MODE_STORAGE_KEY);
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

function UniversitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const searchTerm = searchParams.get("q") || "";
  const selectedCity = searchParams.get("city") || "";
  const selectedType = searchParams.get("type") || "";
  const showFavoritesOnly = searchParams.get("fav") === "1";

  const { t, language, toggleLanguage } = useLanguage();
  const { favorites, toggleFavorite, isFavorite, loading: favoritesLoading } = useFavorites();
  const { universities, loading: universitiesLoading, error: universitiesError } = useUniversitiesData();

  const activeViewMode = useSyncExternalStore<UniversityViewMode>(
    subscribeToViewMode,
    readStoredViewMode,
    (): UniversityViewMode => "grid"
  );

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  const clearAllFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const handleViewModeChange = useCallback((nextMode: UniversityViewMode) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(UNIVERSITIES_VIEW_MODE_STORAGE_KEY, nextMode);
    window.dispatchEvent(new Event(UNIVERSITIES_VIEW_MODE_EVENT));
  }, []);

  const citiesWithCounts = useMemo(() => getCitiesWithCounts(universities), [universities]);
  const totalDepartments = useMemo(() => getTotalDepartments(universities), [universities]);
  const totalCities = citiesWithCounts.length;
  const hasActiveFilters = selectedCity || selectedType || searchTerm || showFavoritesOnly;

  const filteredUniversities = useMemo(() => {
    return filterUniversities(universities, {
      searchTerm,
      selectedCity,
      selectedType,
      showFavoritesOnly,
      isFavorite,
    });
  }, [searchTerm, selectedCity, selectedType, showFavoritesOnly, isFavorite, universities]);

  const staggerChildren = useMemo(() => {
    const childCount = Math.max(filteredUniversities.length - 1, 1);
    const computed = MAX_STAGGER_WINDOW / childCount;
    return Math.min(MAX_STAGGER, Math.max(MIN_STAGGER, computed));
  }, [filteredUniversities.length]);

  if (universitiesError) {
    return <UniversitiesErrorState message={t.list.error} />;
  }

  const showLoadingState = universitiesLoading || (showFavoritesOnly && favoritesLoading);
  if (showLoadingState) {
    return <UniversitiesLoadingState label={t.list.loading} />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren } },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 130, damping: 22 } },
  };

  const emptyDescription = showFavoritesOnly
    ? t.list.emptyFavDesc
    : searchTerm
      ? `"${searchTerm}" — ${t.list.noResultsDesc}`
      : t.list.noResultsDesc;

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24 text-[var(--editorial-ink)] md:pb-12">
      <UniversitiesHero
        backHomeLabel={t.list.backHome}
        guideLabel={t.list.guideLabel}
        title={t.list.heroTitle}
        subtitle={t.list.heroSubtitle}
        universitiesCount={universities.length}
        departmentsCount={totalDepartments}
        citiesCount={totalCities}
        universitiesLabel={t.list.universitiesStat}
        departmentsLabel={t.list.departmentsStat}
        citiesLabel={t.list.citiesStat}
        languageToggleLabel={language === "tr" ? "Switch to English" : "Türkçeye Geç"}
        languageButtonText={language === "tr" ? "EN" : "TR"}
        onToggleLanguage={toggleLanguage}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <UniversitiesFilterBar
          searchTerm={searchTerm}
          selectedCity={selectedCity}
          selectedType={selectedType}
          showFavoritesOnly={showFavoritesOnly}
          hasActiveFilters={Boolean(hasActiveFilters)}
          resultCount={filteredUniversities.length}
          totalCount={universities.length}
          favoriteCount={favorites.length}
          citiesWithCounts={citiesWithCounts}
          viewMode={activeViewMode}
          labels={{
            searchPlaceholder: t.list.searchPlaceholder,
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
          <motion.div
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="mt-6 divide-y divide-[var(--editorial-border)] border border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
          >
            {filteredUniversities.map((university) => (
              <motion.div key={university.id} variants={rowVariants}>
                {activeViewMode === "grid" ? (
                  <UniversityGuideRow
                    university={university}
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
                    language={language}
                    reviewLabel={t.list.review}
                    departmentsLabel={t.list.departmentsStat}
                    moreLabel={t.list.more}
                    isFavorite={isFavorite(university.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <UniversitiesEmptyState
            title={showFavoritesOnly ? t.list.emptyFav : t.list.noResults}
            description={emptyDescription}
            actionLabel={t.list.clearFilters}
            onClearFilters={clearAllFilters}
          />
        )}
      </main>
    </div>
  );
}

export default function UniversitiesPage() {
  return (
    <Suspense fallback={<UniversitiesLoadingState label="Okullar hazırlanıyor" />}>
      <UniversitiesContent />
    </Suspense>
  );
}
