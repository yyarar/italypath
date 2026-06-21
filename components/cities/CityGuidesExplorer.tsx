"use client";

import React, { useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
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
import { getScholarshipRegionBySlug } from "@/lib/scholarships/regions";
import type { CityDetail } from "@/types/cities";
import type { RegionSlug } from "@/types/scholarships";

// All 46 unique cities mapped to their Italian regions for fallback precision
const CITY_TO_REGION_MAP: Record<string, string> = {
  "Milano": "Lombardia",
  "Pavia": "Lombardia",
  "Bergamo": "Lombardia",
  "Brescia": "Lombardia",
  "Castellanza": "Lombardia",
  "Roma": "Lazio",
  "Viterbo": "Lazio",
  "Cassino": "Lazio",
  "Uzaktan Eğitim / Roma": "Lazio",
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
  "Napoli / Caserta": "Campania",
  "Benevento / Online": "Campania",
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

export default function CityGuidesExplorer() {
  const { t, language, toggleLanguage } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { universities, loading: universitiesLoading } = useUniversitiesData();

  // Get active city from URL
  const selectedQueryCity = searchParams.get("city") || "Milano";

  // Calculate unique list of cities and their university counts from Supabase database
  const citiesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    universities.forEach((u) => {
      if (u.city) {
        counts[u.city] = (counts[u.city] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [universities]);

  // Find the selected city details
  const activeCity = useMemo<CityDetail>(() => {
    const match = citiesWithCounts.find(
      (c) =>
        c.slug === selectedQueryCity.toLowerCase() ||
        c.name.toLowerCase() === selectedQueryCity.toLowerCase()
    );

    const name = match ? match.name : "Milano";
    const count = match ? match.count : 0;
    const region = CITY_TO_REGION_MAP[name] || "İtalya";

    const curated = getCityDetailBySlug(name) || getCityDetailBySlug(selectedQueryCity);
    if (curated) return curated;

    return getFallbackCityDetail(name, count, region);
  }, [selectedQueryCity, citiesWithCounts]);

  // Dynamic regional scholarship lookup
  const scholarshipRegion = useMemo(() => {
    const slug = getRegionSlugByName(activeCity.region);
    if (!slug) return null;
    return getScholarshipRegionBySlug(slug);
  }, [activeCity.region]);

  // Handle city selection
  const handleSelectCity = useCallback(
    (citySlug: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("city", citySlug);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Filter universities in this city
  const cityUniversities = useMemo(() => {
    return universities.filter(
      (u) => u.city.toLowerCase() === activeCity.name.toLowerCase()
    );
  }, [universities, activeCity]);

  const copy = t.citiesGuide;

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24 text-[var(--editorial-ink)] md:pb-12">
      {/* Dynamic Header */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-border)] pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.backHome}
          </Link>

          <div className="hidden text-sm font-semibold text-[var(--editorial-ink)] sm:block">
            {copy.pageIdentity}
          </div>

          <button
            onClick={toggleLanguage}
            aria-label={language === "tr" ? "Switch to English" : "Türkçeye geç"}
            className="inline-flex items-center gap-2 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-2 text-xs font-bold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <Globe className="h-3.5 w-3.5" />
            {language === "tr" ? "EN" : "TR"}
          </button>
        </header>

        {/* Intro */}
        <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.35fr)] lg:items-end">
          <div>
            <h1 className="font-serif text-5xl font-normal leading-[0.95] tracking-normal text-[var(--editorial-ink)] sm:text-6xl lg:text-7xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--editorial-muted)] sm:text-lg">
              {copy.intro}
            </p>
          </div>
          <div className="border-l-2 border-[var(--editorial-terracotta)] pl-4 text-sm leading-6 text-[var(--editorial-muted)]">
            {language === "tr" ? "Güncel akademik verilere dayanmaktadır." : "Based on recent academic datasets."}
          </div>
        </section>

        {/* Explorer Container */}
        {universitiesLoading ? (
          <div className="mt-10 flex h-[400px] items-center justify-center border border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-sm font-semibold text-[var(--editorial-muted)]">
            {language === "tr" ? "Şehir rehberi yükleniyor..." : "Loading city atlas..."}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
            
            {/* Left Column: Cities Directory */}
            <section className="min-w-0 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 shadow-[0_24px_70px_rgba(21,32,28,0.08)] sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md border border-[var(--editorial-border)] bg-[#f1eadf] text-[var(--editorial-sage)]">
                  <MapPin className="h-4 w-4" />
                </span>
                <h2 className="text-base font-semibold text-[var(--editorial-ink)]">
                  {language === "tr" ? "İtalya Öğrenci Şehirleri" : "Italian Student Cities"}
                </h2>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {citiesWithCounts.map((city) => {
                  const active = activeCity.name.toLowerCase() === city.name.toLowerCase();
                  return (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => handleSelectCity(city.slug)}
                      aria-pressed={active}
                      className={`flex flex-col border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
                        active
                          ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white"
                          : "border-[var(--editorial-border)] bg-[var(--editorial-paper)] text-[var(--editorial-ink)] hover:border-[var(--editorial-sage)]"
                      }`}
                    >
                      <span className="block truncate text-sm font-bold">
                        {language === "tr" ? city.name : (getCityDetailBySlug(city.name)?.nameEn || city.name)}
                      </span>
                      <span
                        className={`mt-1 block text-xs font-semibold ${
                          active ? "text-white/80" : "text-[var(--editorial-muted)]"
                        }`}
                      >
                        {city.count} {t.detail.programCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Right Column: Selected City Detailed File */}
            <aside className="min-w-0 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 shadow-[0_24px_70px_rgba(21,32,28,0.08)] lg:sticky lg:top-20 lg:max-h-[820px] lg:overflow-y-auto">
              
              {/* Profile Card */}
              <div className="border-b border-[var(--editorial-border)] pb-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
                  {language === "tr" ? "ŞEHİR DOSYASI" : "CITY PROFILE"}
                </p>
                <h2 className="mt-2 font-serif text-4xl font-normal leading-tight tracking-normal text-[var(--editorial-ink)]">
                  {language === "tr" ? activeCity.name : activeCity.nameEn}
                </h2>
                
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[var(--editorial-muted)]">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[var(--editorial-sage)]" />
                    <span>{activeCity.region} Bölgesi</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-[var(--editorial-sage)]" />
                    <span>{copy.population}: {language === "tr" ? activeCity.studentPopulation : activeCity.studentPopulationEn}</span>
                  </div>
                </div>
              </div>

              {/* Stat Strip: Cost Rating */}
              <section className="mt-5 border-b border-[var(--editorial-border)] pb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                    <Coins className="h-4 w-4 text-[var(--editorial-sage)]" />
                    {copy.costLevel}
                  </div>
                  <div className="flex items-center gap-1" aria-label={`Cost rating: ${activeCity.costRating} of 5`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={`block h-3.5 w-3.5 border border-[var(--editorial-border)] ${
                          i <= activeCity.costRating
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

              {/* Living Costs Detailed Info */}
              <section className="mt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
                  <Info className="h-3.5 w-3.5" />
                  {language === "tr" ? "YAŞAM MALİYETLERİ" : "LIVING EXPENSES"}
                </div>
                <div className="divide-y divide-[var(--editorial-border)]">
                  
                  {/* Rent */}
                  <div className="py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                      {copy.rent}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--editorial-ink)]">
                      {language === "tr" ? activeCity.rentAverage : activeCity.rentAverageEn}
                    </p>
                  </div>

                  {/* Groceries & Social */}
                  <div className="py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                      {copy.expenses}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--editorial-ink)]">
                      {language === "tr" ? activeCity.livingExpenses : activeCity.livingExpensesEn}
                    </p>
                  </div>

                  {/* Public Transport */}
                  <div className="py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                      {copy.transport}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--editorial-ink)]">
                      {language === "tr" ? activeCity.transportCost : activeCity.transportCostEn}
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

              {/* Regional Scholarship Card */}
              {scholarshipRegion && (
                <section className="mt-6 border-t border-[var(--editorial-border)] pt-4 bg-[#FAF7F2] p-4 border-l-2 border-l-[var(--editorial-terracotta)]">
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
                    className="mt-4 flex w-full items-center justify-center gap-2 border border-[var(--editorial-terracotta)] bg-transparent py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)] transition hover:bg-[var(--editorial-terracotta)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)]"
                  >
                    {copy.bursaryCta}
                  </Link>
                </section>
              )}

              {/* Transit & Connections */}
              <section className="mt-6 border-t border-[var(--editorial-border)] pt-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
                  <Navigation className="h-3.5 w-3.5 text-[var(--editorial-sage)]" />
                  {language === "tr" ? "ULAŞIM VE BAĞLANTILAR" : "TRANSPORTATION & NETWORK"}
                </div>
                <p className="text-sm leading-6 text-[var(--editorial-muted)] font-medium">
                  {language === "tr" ? activeCity.transportDetails : activeCity.transportDetailsEn}
                </p>
              </section>

              {/* Climate & Vibe */}
              <section className="mt-6 border-t border-[var(--editorial-border)] pt-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
                  <SunDim className="h-3.5 w-3.5 text-[var(--editorial-sage)]" />
                  {copy.vibe}
                </div>
                <p className="text-sm leading-6 text-[var(--editorial-muted)] font-medium">
                  {language === "tr" ? activeCity.climateAndVibe : activeCity.climateAndVibeEn}
                </p>
              </section>

              {/* Editorial Tip */}
              <section className="mt-6 border-t border-[var(--editorial-border)] pt-4 bg-[#fbf9f4] p-3 border-l-2 border-l-[var(--editorial-sage)]">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-sage)]">
                  <Compass className="h-3.5 w-3.5" />
                  {copy.tip}
                </div>
                <p className="font-serif italic text-sm leading-relaxed text-[var(--editorial-ink)]">
                  「 {language === "tr" ? activeCity.editorialTip : activeCity.editorialTipEn} 」
                </p>
              </section>

              {/* Warning Notice */}
              <section className="mt-6 border-t border-[var(--editorial-border)] pt-4">
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

              {/* Universities in this city */}
              <section className="mt-6 border-t border-[var(--editorial-border)] pt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
                  <Building2 className="h-3.5 w-3.5 text-[var(--editorial-sage)]" />
                  {copy.unisInCity} ({cityUniversities.length})
                </div>

                <div className="divide-y divide-[var(--editorial-border)]">
                  {cityUniversities.length > 0 ? (
                    cityUniversities.map((uni) => (
                      <Link
                        key={uni.id}
                        href={`/universities/${uni.id}`}
                        className="flex items-center justify-between py-3 transition hover:bg-[#f6f0e7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                      >
                        <div className="min-w-0 pr-4">
                          <span className="block truncate text-sm font-semibold text-[var(--editorial-ink)]">
                            {uni.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--editorial-muted)] font-medium">
                            {uni.type} · {uni.departments.length} {t.detail.programCount}
                          </span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--editorial-terracotta)]" />
                      </Link>
                    ))
                  ) : (
                    <p className="py-3 text-sm text-[var(--editorial-muted)]">
                      {copy.noUni}
                    </p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
