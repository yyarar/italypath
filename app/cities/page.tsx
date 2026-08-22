import type { Metadata } from "next";

import CityGuidesExplorer, {
  type CityGuideOption,
  type CityGuideUniversitySummary,
} from "@/components/cities/CityGuidesExplorer";
import {
  getCanonicalCitySlug,
  getCityDetailByName,
} from "@/lib/cities/data";
import {
  createCityGuideSlug,
  getCityGuideName,
  resolveCityGuideSelection,
} from "@/lib/cities/normalization";
import { getUniversitiesData } from "@/lib/universities.server";

export const metadata: Metadata = {
  title: "İtalya Şehir Rehberleri | ItalyPath",
  description:
    "İtalya'da okuyacağınız üniversite şehrini yaşam maliyetleri, oda kiraları, ulaşım abonmanları ve öğrenci atmosferiyle keşfedin.",
  alternates: {
    canonical: "/cities",
  },
  openGraph: {
    title: "İtalya Şehir Rehberleri | ItalyPath",
    description:
      "İtalya'nın en popüler öğrenci şehirlerine ait oda fiyatları, ulaşım imkanları, iklim ve editoryal tüyolar tek ekranda.",
    url: "https://italypath.app/cities",
    type: "website",
  },
};

type SearchParamValue = string | string[] | undefined;
type CityGuidesPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function getSingleParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function createCityOptions(universities: Awaited<ReturnType<typeof getUniversitiesData>>) {
  const options = new Map<string, CityGuideOption>();
  universities.forEach((university) => {
    const cityName = getCityGuideName(university.city);
    if (cityName) {
      const resolved = getCityDetailByName(cityName);
      const slug = resolved?.slug ?? createCityGuideSlug(cityName);
      const existing = options.get(slug);
      options.set(slug, {
        name: existing?.name ?? cityName,
        count: (existing?.count ?? 0) + 1,
        slug,
      });
    }
  });

  return Array.from(options.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function resolveSelectedCity(rawCity: string, cityOptions: CityGuideOption[]) {
  const resolvedSelection = resolveCityGuideSelection(rawCity);
  const resolvedDetail = resolvedSelection
    ? getCityDetailByName(resolvedSelection)
    : undefined;
  const selectedSlug = resolvedDetail?.slug ?? (
    resolvedSelection ? getCanonicalCitySlug(resolvedSelection) : ""
  );
  const match = cityOptions.find(
    (city) => city.slug === selectedSlug
  );

  return match ?? cityOptions.find((city) => city.slug === "milano") ?? {
    name: "Milano",
    count: 0,
    slug: "milano",
  };
}

function createCityUniversitySummaries(
  universities: Awaited<ReturnType<typeof getUniversitiesData>>,
  citySlug: string
): CityGuideUniversitySummary[] {
  return universities
    .filter((university) => {
      const cityName = getCityGuideName(university.city);
      return cityName ? getCanonicalCitySlug(cityName) === citySlug : false;
    })
    .map((university) => ({
      id: university.id,
      name: university.name,
      type: university.type,
      departmentCount: university.departments.length,
    }));
}

function CityGuidesDataUnavailable() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-[var(--editorial-ink)] sm:px-6 lg:px-8">
      <main className="mx-auto max-w-3xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
          ItalyPath şehir rehberleri
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.03em]">
          Şehir rehberi verisi yüklenemedi
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--editorial-muted)] sm:text-base">
          Canlı üniversite ve şehir eşleşmelerine şu anda ulaşılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.
        </p>
      </main>
    </div>
  );
}

export default async function CityGuidesPage({ searchParams }: CityGuidesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  let universities: Awaited<ReturnType<typeof getUniversitiesData>>;

  try {
    universities = await getUniversitiesData();
  } catch (error) {
    console.error("Failed to load city guides data:", error);
    return <CityGuidesDataUnavailable />;
  }

  const cityOptions = createCityOptions(universities);
  const rawSelectedCity = getSingleParam(resolvedSearchParams.city) || "Milano";
  const selectedCity = resolveSelectedCity(rawSelectedCity, cityOptions);

  return (
    <CityGuidesExplorer
      initialSelectedCity={selectedCity.slug}
      initialCitiesWithCounts={cityOptions}
      initialCityUniversities={createCityUniversitySummaries(universities, selectedCity.slug)}
    />
  );
}
