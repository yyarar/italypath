"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronDown,
  Coins,
  Compass,
  ExternalLink,
  Globe,
  Info,
  Landmark,
  MapPin,
  Navigation,
  SunDim,
  Users,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useUniversitiesData } from "@/lib/useUniversitiesData";
import { getCityDetailBySlug, getFallbackCityDetail } from "@/lib/cities/data";
import {
  createCityGuideSlug,
  getCityGuideName,
  resolveCityGuideSelection,
} from "@/lib/cities/normalization";
import { getScholarshipRegionBySlug } from "@/lib/scholarships/regions";
import type { CityDetail } from "@/types/cities";
import type { RegionSlug } from "@/types/scholarships";

export type CityGuideOption = {
  name: string;
  count: number;
  slug: string;
};

export type CityGuideUniversitySummary = {
  id: number;
  name: string;
  type: string;
  departmentCount: number;
};

// Physical student cities mapped to their Italian regions for fallback precision.
const CITY_TO_REGION_MAP: Record<string, string> = {
  "Milano": "Lombardia",
  "Pavia": "Lombardia",
  "Bergamo": "Lombardia",
  "Brescia": "Lombardia",
  "Castellanza": "Lombardia",
  "Roma": "Lazio",
  "Viterbo": "Lazio",
  "Cassino": "Lazio",
  "Bologna": "Emilia-Romagna",
  "Parma": "Emilia-Romagna",
  "Ferrara": "Emilia-Romagna",
  "Torino": "Piemonte",
  "Pollenzo": "Piemonte",
  "Piemonte": "Piemonte",
  "Padova": "Veneto",
  "Verona": "Veneto",
  "Venedik": "Veneto",
  "Pisa": "Toscana",
  "Siena": "Toscana",
  "Floransa": "Toscana",
  "Napoli": "Campania",
  "Trento": "Trentino-Alto Adige",
  "Bolzano": "Trentino-Alto Adige",
  "Messina": "Sicilia",
  "Palermo": "Sicilia",
  "Catania": "Sicilia",
  "Cenova": "Liguria",
  "Trieste": "Friuli-Venezia Giulia",
  "Udine": "Friuli-Venezia Giulia",
  "Ancona": "Marche",
  "Macerata": "Marche",
  "Urbino": "Marche",
  "Camerino": "Marche",
  "Perugia": "Umbria",
  "Cagliari": "Sardegna",
  "Sassari": "Sardegna",
  "Casamassima": "Puglia",
  "Bari": "Puglia",
  "Lecce": "Puglia",
  "Pescara": "Abruzzo",
  "Teramo": "Abruzzo",
  "Reggio Calabria": "Calabria",
  "Aosta": "Valle d'Aosta",
};

function getRegionSlugByName(regionName: string): RegionSlug | null {
  const normalized = regionName.toLowerCase().trim();
  if (normalized.includes("lombardia")) return "lombardia";
  if (normalized.includes("lazio")) return "lazio";
  if (normalized.includes("emilia-romagna") || normalized.includes("emilia romagna")) return "emilia-romagna";
  if (normalized.includes("piemonte")) return "piemonte";
  if (normalized.includes("veneto")) return "veneto";
  if (normalized.includes("toscana")) return "toscana";
  if (normalized.includes("trentino")) return "trentino-alto-adige-suedtirol";
  if (normalized.includes("campania")) return "campania";
  if (normalized.includes("sicilia")) return "sicilia";
  if (normalized.includes("liguria")) return "liguria";
  if (normalized.includes("friuli")) return "friuli-venezia-giulia";
  if (normalized.includes("marche")) return "marche";
  if (normalized.includes("puglia")) return "puglia";
  if (normalized.includes("abruzzo")) return "abruzzo";
  if (normalized.includes("sardegna")) return "sardegna";
  if (normalized.includes("calabria")) return "calabria";
  if (normalized.includes("valle d'aosta") || normalized.includes("valle daosta")) return "valle-d-aosta";
  if (normalized.includes("basilicata")) return "basilicata";
  if (normalized.includes("molise")) return "molise";
  if (normalized.includes("umbria")) return "umbria";
  return null;
}

interface CityGuidesExplorerProps {
  initialSelectedCity: string;
  initialCitiesWithCounts: CityGuideOption[];
  initialCityUniversities: CityGuideUniversitySummary[];
}

export default function CityGuidesExplorer({
  initialSelectedCity,
  initialCitiesWithCounts,
  initialCityUniversities,
}: CityGuidesExplorerProps) {
  const { t, language, toggleLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const [selectedQueryCity, setSelectedQueryCity] = useState(initialSelectedCity || "Milano");

  const { universities, loading: universitiesLoading } = useUniversitiesData();

  // Calculate unique list of cities and their university counts from Supabase database
  const citiesWithCounts = useMemo(() => {
    if (universities.length === 0) {
      return initialCitiesWithCounts;
    }

    const counts: Record<string, number> = {};
    universities.forEach((u) => {
      const cityName = getCityGuideName(u.city);
      if (cityName) {
        counts[cityName] = (counts[cityName] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        slug: createCityGuideSlug(name),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [initialCitiesWithCounts, universities]);

  // Find the selected city details
  const activeCity = useMemo<CityDetail>(() => {
    const canonicalSelection = resolveCityGuideSelection(selectedQueryCity) ?? "Milano";
    const match = citiesWithCounts.find(
      (c) =>
        c.slug === canonicalSelection.toLowerCase() ||
        c.name.toLowerCase() === canonicalSelection.toLowerCase()
    );

    const name = match ? match.name : "Milano";
    const region = CITY_TO_REGION_MAP[name] || "İtalya";

    const curated = getCityDetailBySlug(name) || getCityDetailBySlug(canonicalSelection);
    if (curated) return curated;

    return getFallbackCityDetail(name, region);
  }, [selectedQueryCity, citiesWithCounts]);

  const activeCitySlug = useMemo(
    () =>
      citiesWithCounts.find(
        (city) => city.name.toLowerCase() === activeCity.name.toLowerCase()
      )?.slug ?? "",
    [activeCity.name, citiesWithCounts]
  );

  // Dynamic regional scholarship lookup
  const scholarshipRegion = useMemo(() => {
    const slug = getRegionSlugByName(activeCity.region);
    if (!slug) return null;
    return getScholarshipRegionBySlug(slug);
  }, [activeCity.region]);

  // Handle city selection
  const handleSelectCity = useCallback(
    (citySlug: string) => {
      setSelectedQueryCity(citySlug);
      const params = new URLSearchParams();
      params.set("city", citySlug);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname]
  );

  // Filter universities in this city
  const cityUniversities = useMemo<CityGuideUniversitySummary[]>(() => {
    if (universities.length === 0) {
      return initialCityUniversities;
    }

    return universities
      .filter((u) => getCityGuideName(u.city)?.toLowerCase() === activeCity.name.toLowerCase())
      .map((university) => ({
        id: university.id,
        name: university.name,
        type: university.type,
        departmentCount: university.departments.length,
      }));
  }, [activeCity, initialCityUniversities, universities]);

  const copy = t.citiesGuide;
  const activePopulation = language === "tr" ? activeCity.studentPopulation : activeCity.studentPopulationEn;
  const activeEditorialTip = language === "tr" ? activeCity.editorialTip : activeCity.editorialTipEn;
  const isUnresearched = activeCity.contentStatus === "unresearched";
  const activeRent = language === "tr" ? activeCity.rentAverage : activeCity.rentAverageEn;
  const activeExpenses = language === "tr" ? activeCity.livingExpenses : activeCity.livingExpensesEn;
  const activeTransportCost = language === "tr" ? activeCity.transportCost : activeCity.transportCostEn;
  const activeTransportDetails = language === "tr" ? activeCity.transportDetails : activeCity.transportDetailsEn;
  const activeCityCharacter = language === "tr" ? activeCity.climateAndVibe : activeCity.climateAndVibeEn;
  const activeCostRating = activeCity.costRating ?? 0;
  const hasCostDetails = Boolean(
    activeCity.costRating !== undefined && activeRent && activeExpenses && activeTransportCost
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--editorial-paper)] pb-24 text-[var(--editorial-ink)] md:pb-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[var(--editorial-sage-soft)]/65 blur-3xl" />
        <div className="absolute -right-24 top-[30rem] h-80 w-80 rounded-full bg-[#efd9cc]/55 blur-3xl" />
      </div>
      {/* Dynamic Header */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
        <header className="city-material sticky top-3 z-40 flex items-center justify-between gap-4 rounded-[1.25rem] px-3 py-2.5 shadow-[0_12px_35px_rgba(21,32,28,0.07)] sm:px-4">
          <Link
            href="/"
            className="city-pressable inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[var(--editorial-muted)] hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.backHome}
          </Link>

          <div className="hidden text-sm font-semibold tracking-[-0.01em] text-[var(--editorial-ink)] sm:block">
            {copy.pageIdentity}
          </div>

          <button
            onClick={toggleLanguage}
            aria-label={language === "tr" ? "Switch to English" : "Türkçeye geç"}
            className="city-pressable inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--editorial-border)] bg-white/70 px-3.5 text-xs font-bold text-[var(--editorial-ink)] hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <Globe className="h-3.5 w-3.5" />
            {language === "tr" ? "EN" : "TR"}
          </button>
        </header>

        {/* Intro */}
        <section className="mt-8 grid gap-7 px-1 py-7 sm:mt-10 sm:px-3 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.32fr)] lg:items-end">
          <div>
            <p className="mb-4 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--editorial-terracotta)]">
              {copy.pageIdentity}
            </p>
            <h1 className="max-w-4xl font-serif text-5xl font-normal leading-[0.94] tracking-[-0.035em] text-[var(--editorial-ink)] sm:text-6xl lg:text-[5.25rem]">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--editorial-muted)] sm:text-lg sm:leading-8">
              {copy.intro}
            </p>
          </div>
          <div className="city-material rounded-[1.5rem] p-5 shadow-[0_14px_40px_rgba(21,32,28,0.06)]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--editorial-sage)] text-white">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <strong className="block text-2xl leading-none text-[var(--editorial-ink)]">{citiesWithCounts.length}</strong>
                <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--editorial-muted)]">
                  {copy.atlasStat}
                </span>
              </div>
            </div>
            <p className="mt-4 border-t border-[var(--editorial-border)] pt-4 text-xs font-semibold leading-5 text-[var(--editorial-muted)]">
              {copy.dataNote}
            </p>
          </div>
        </section>

        {/* Explorer Container */}
        {universitiesLoading && citiesWithCounts.length === 0 ? (
          <div className="city-material mt-10 flex h-[400px] items-center justify-center rounded-[2rem] text-sm font-semibold text-[var(--editorial-muted)]">
            {copy.loading}
          </div>
        ) : (
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
            {/* Mobile City Selector */}
            <section className="city-material min-w-0 rounded-[1.75rem] p-4 shadow-[0_18px_50px_rgba(21,32,28,0.07)] lg:hidden">
              <label
                htmlFor="mobile-city-selector"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]"
              >
                <MapPin className="h-4 w-4 text-[var(--editorial-sage)]" />
                {copy.citySelectorLabel}
              </label>
              <div className="city-scrollbar-hidden -mx-1 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2">
                {citiesWithCounts.map((city) => {
                  const active = activeCity.name.toLowerCase() === city.name.toLowerCase();
                  return (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => handleSelectCity(city.slug)}
                      aria-pressed={active}
                      className={`city-pressable shrink-0 snap-start rounded-full border px-4 py-2.5 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
                        active
                          ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white shadow-[0_8px_20px_rgba(31,79,70,0.2)]"
                          : "border-[var(--editorial-border)] bg-white/70 text-[var(--editorial-ink)]"
                      }`}
                    >
                      {language === "tr" ? city.name : (getCityDetailBySlug(city.name)?.nameEn || city.name)}
                    </button>
                  );
                })}
              </div>
              <div className="relative mt-3">
                <select
                  id="mobile-city-selector"
                  value={activeCitySlug}
                  onChange={(event) => handleSelectCity(event.target.value)}
                  className="min-h-12 w-full appearance-none rounded-[0.9rem] border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 pr-10 text-sm font-bold text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                >
                  {citiesWithCounts.map((city) => (
                    <option key={city.name} value={city.slug}>
                      {language === "tr"
                        ? city.name
                        : getCityDetailBySlug(city.name)?.nameEn || city.name}
                      {` · ${city.count} ${copy.universityCount[city.count === 1 ? "one" : "other"]}`}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--editorial-sage)]"
                />
              </div>
            </section>

            {/* Left Column: Cities Directory */}
            <section className="hidden min-w-0 lg:block city-material city-scrollbar-hidden sticky top-20 max-h-[calc(100vh-6.25rem)] overflow-y-auto rounded-[2rem] p-4 shadow-[0_22px_60px_rgba(21,32,28,0.08)]">
              <div className="sticky -top-4 z-10 mb-3 flex items-center gap-3 border-b border-[var(--editorial-border)] bg-[rgba(255,254,250,0.88)] px-1 pb-4 pt-1 backdrop-blur-xl">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)]">
                  <MapPin className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold leading-5 text-[var(--editorial-ink)]">
                  {copy.directoryTitle}
                </h2>
              </div>

              <div className="grid gap-1.5">
                {citiesWithCounts.map((city) => {
                  const active = activeCity.name.toLowerCase() === city.name.toLowerCase();
                  return (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => handleSelectCity(city.slug)}
                      aria-pressed={active}
                      className={`city-pressable group relative flex min-h-14 items-center justify-between overflow-hidden rounded-[1rem] border px-3.5 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
                        active
                          ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white shadow-[0_9px_24px_rgba(31,79,70,0.18)]"
                          : "border-transparent bg-transparent text-[var(--editorial-ink)] hover:border-[var(--editorial-border)] hover:bg-white/65"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {language === "tr" ? city.name : (getCityDetailBySlug(city.name)?.nameEn || city.name)}
                        </span>
                        <span
                          className={`mt-0.5 block text-[0.7rem] font-semibold ${
                            active ? "text-white/75" : "text-[var(--editorial-muted)]"
                          }`}
                        >
                          {city.count} {copy.universityCount[city.count === 1 ? "one" : "other"]}
                        </span>
                      </span>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-white" : "bg-[var(--editorial-border)] group-hover:bg-[var(--editorial-sage)]"}`} />
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Right Column: Selected City Detailed File */}
            <aside className="city-material min-w-0 overflow-hidden rounded-[2rem] p-5 shadow-[0_26px_80px_rgba(21,32,28,0.09)] sm:p-7 lg:rounded-[2.5rem] lg:p-9">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeCity.name}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38, mass: 0.7 }}
                >
              {/* Profile Card */}
              <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--editorial-sage)] p-6 text-white sm:p-8">
                <div aria-hidden="true" className="absolute -right-12 -top-14 h-40 w-40 rounded-full border-[28px] border-white/[0.06]" />
                <p className="relative text-xs font-bold uppercase tracking-[0.16em] text-[#efc2ad]">
                  {copy.profileLabel}
                </p>
                <h2 className="relative mt-3 font-serif text-5xl font-normal leading-[0.95] tracking-[-0.035em] text-white sm:text-6xl">
                  {language === "tr" ? activeCity.name : activeCity.nameEn}
                </h2>
                
                <div className="relative mt-6 flex flex-wrap gap-2 text-xs font-semibold text-white/75">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#d9b39f]" />
                    <span>{activeCity.region} {copy.regionSuffix}</span>
                  </div>
                  {activePopulation && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-[#d9b39f]" />
                      <span>{copy.population}: {activePopulation}</span>
                    </div>
                  )}
                </div>
              </div>

              {isUnresearched && (
                <section className="mt-5 rounded-[1.5rem] border border-[var(--editorial-border)] bg-white/55 p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--editorial-terracotta)]" />
                    <div>
                      <h3 className="font-serif text-xl text-[var(--editorial-ink)]">{copy.guidePreparingTitle}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">{copy.guidePreparingBody}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Stat Strip: Cost Rating */}
              {hasCostDetails && <section className="mt-5 rounded-[1.4rem] border border-[var(--editorial-border)] bg-white/55 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                    <Coins className="h-4 w-4 text-[var(--editorial-sage)]" />
                    {copy.costLevel}
                  </div>
                  <div className="flex items-center gap-1" aria-label={`Cost rating: ${activeCostRating} of 5`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={`block h-3.5 w-3.5 rounded-full border border-[var(--editorial-border)] ${
                          i <= activeCostRating
                            ? "bg-[var(--editorial-terracotta)]"
                            : "bg-[#e7ded1]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs font-semibold text-[var(--editorial-muted)]">
                  {copy.costExplanation}
                </p>
              </section>
              }

              {/* Living Costs Detailed Info */}
              {hasCostDetails && <section className="mt-5 rounded-[1.5rem] border border-[var(--editorial-border)] bg-white/45 p-5 sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
                  <Info className="h-3.5 w-3.5" />
                  {copy.livingExpensesTitle}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  
                  {/* Rent */}
                  <div className="rounded-[1rem] bg-[var(--editorial-paper)] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                      {copy.rent}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--editorial-ink)]">
                      {activeRent}
                    </p>
                  </div>

                  {/* Groceries & Social */}
                  <div className="rounded-[1rem] bg-[var(--editorial-paper)] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                      {copy.expenses}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--editorial-ink)]">
                      {activeExpenses}
                    </p>
                  </div>

                  {/* Public Transport */}
                  <div className="rounded-[1rem] bg-[var(--editorial-paper)] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                      {copy.transport}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--editorial-ink)]">
                      {activeTransportCost}
                    </p>
                  </div>
                </div>
                {activeCity.costSourceName && (
                  <div className="mt-4 border-t border-[var(--editorial-border)] pt-3 text-xs leading-5 text-[var(--editorial-muted)]">
                    <span className="font-semibold text-[var(--editorial-ink)]">
                      {copy.costSourceLabel}:{" "}
                    </span>
                    {activeCity.costSourceUrl ? (
                      <a
                        href={activeCity.costSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[var(--editorial-terracotta)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)]"
                      >
                        {activeCity.costSourceName}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="font-semibold text-[var(--editorial-ink)]">
                        {activeCity.costSourceName}
                      </span>
                    )}
                    {activeCity.costSourceLastUpdated && (
                      <span>
                        {" "}
                        · {copy.costSourceUpdated}: {activeCity.costSourceLastUpdated}
                      </span>
                    )}
                  </div>
                )}
              </section>
              }

              {/* Regional Scholarship Card */}
              {scholarshipRegion && (
                <section className="mt-5 rounded-[1.5rem] border border-[#e6cabb] bg-[#fbf3ed] p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-terracotta)]">
                    <Landmark className="h-4 w-4" />
                    {copy.bursaryTitle}
                  </div>
                  
                  <p className="text-xs leading-5 text-[var(--editorial-muted)] font-medium">
                    {(copy.bursaryBody || "").replace("{region}", activeCity.region)}
                  </p>

                  <div className="mt-4 space-y-3 border-t border-[var(--editorial-border)]/60 pt-3">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                        {copy.bursaryInstitution}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {scholarshipRegion.managingBodies.map((body, idx) => (
                          <a
                            key={idx}
                            href={body.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--editorial-terracotta)] hover:underline"
                          >
                            {body.name}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                        {copy.bursaryIseeLimit}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-[var(--editorial-ink)]">
                        {scholarshipRegion.iseeLimit || (language === "tr" ? "Açıklanmadı / Kurum Bazlı" : "Not Published / Institution-Specific")}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/scholarships?region=${scholarshipRegion.regionSlug}`}
                    className="city-pressable mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--editorial-terracotta)] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)] hover:bg-[var(--editorial-terracotta)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)]"
                  >
                    {copy.bursaryCta}
                  </Link>
                </section>
              )}

              {/* Transit & Connections */}
              {activeTransportDetails && <section className="mt-5 rounded-[1.5rem] border border-[var(--editorial-border)] bg-white/45 p-5 sm:p-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
                  <Navigation className="h-3.5 w-3.5 text-[var(--editorial-sage)]" />
                  {copy.transportConnections}
                </div>
                <p className="text-sm leading-6 text-[var(--editorial-muted)] font-medium">
                  {activeTransportDetails}
                </p>
              </section>
              }

              {/* Climate & Vibe */}
              {activeCityCharacter && <section className="mt-3 rounded-[1.5rem] border border-[var(--editorial-border)] bg-white/45 p-5 sm:p-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
                  <SunDim className="h-3.5 w-3.5 text-[var(--editorial-sage)]" />
                  {copy.vibe}
                </div>
                <p className="text-sm leading-6 text-[var(--editorial-muted)] font-medium">
                  {activeCityCharacter}
                </p>
              </section>
              }

              {/* Editorial Tip */}
              {activeEditorialTip && (
                <section className="mt-5 rounded-[1.5rem] bg-[var(--editorial-sage-soft)] p-5 sm:p-6">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-sage)]">
                    <Compass className="h-3.5 w-3.5" />
                    {copy.tip}
                  </div>
                  <p className="font-serif text-lg italic leading-relaxed text-[var(--editorial-ink)]">
                    「 {activeEditorialTip} 」
                  </p>
                </section>
              )}

              {/* Warning Notice */}
              {!isUnresearched && <section className="mt-3 rounded-[1.25rem] border border-[#e6cabb] bg-[#fff8f3] p-4">
                <div className="flex items-start gap-2 text-[var(--editorial-terracotta)]">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.1em]">{copy.warningTitle}</p>
                    <ul className="mt-2 list-disc pl-4 text-xs space-y-1 text-[var(--editorial-muted)] font-medium">
                      <li>{copy.warningItem1}</li>
                      <li>{copy.warningItem2}</li>
                    </ul>
                  </div>
                </div>
              </section>
              }

              {/* Universities in this city */}
              <section className="mt-5 rounded-[1.5rem] border border-[var(--editorial-border)] bg-white/45 p-5 sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
                  <Building2 className="h-3.5 w-3.5 text-[var(--editorial-sage)]" />
                  {copy.unisInCity} ({cityUniversities.length})
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {cityUniversities.length > 0 ? (
                    cityUniversities.map((uni) => (
                      <Link
                        key={uni.id}
                        href={`/universities/${uni.id}`}
                        className="city-card-lift group flex min-h-16 items-center justify-between rounded-[1rem] border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                      >
                        <div className="min-w-0 pr-4">
                          <span className="block truncate text-sm font-semibold text-[var(--editorial-ink)]">
                            {uni.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--editorial-muted)] font-medium">
                            {uni.type} · {uni.departmentCount} {t.detail.programCount}
                          </span>
                        </div>
                        <ExternalLink className="city-arrow h-3.5 w-3.5 shrink-0 text-[var(--editorial-terracotta)]" />
                      </Link>
                    ))
                  ) : (
                    <p className="py-3 text-sm text-[var(--editorial-muted)]">
                      {copy.noUni}
                    </p>
                  )}
                </div>
              </section>
                </motion.div>
              </AnimatePresence>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
