import type { Metadata } from "next";

import CityGuidesExplorer from "@/components/cities/CityGuidesExplorer";
import {
  getCanonicalCitySlug,
  getCityDetailByName,
} from "@/lib/cities/data";
import {
  resolveCityGuidePanel,
  type CityGuideOption,
  type CityGuideUniversitySummary,
} from "@/lib/cities/guidePanel";
import {
  createCityGuideSlug,
  getCityGuideName,
  resolveCityGuideSelection,
} from "@/lib/cities/normalization";
import { getUniversitiesDirectory } from "@/lib/universities.server";

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

function createCityOptions(universities: Awaited<ReturnType<typeof getUniversitiesDirectory>>) {
  const options = new Map<string, CityGuideOption>();
  universities.forEach((university) => {
    const cityName = getCityGuideName(university.city);
    if (cityName) {
      const resolved = getCityDetailByName(cityName);
      const slug = resolved?.slug ?? createCityGuideSlug(cityName);
      const existing = options.get(slug);
      const name = existing?.name ?? cityName;
      options.set(slug, {
        name,
        nameEn: getCityDetailByName(name)?.nameEn || name,
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
    nameEn: "Milan",
    count: 0,
    slug: "milano",
  };
}

// Sehir basina okul ozeti (ad, tur, program sayisi) sunucuda gruplanir; tarayici sehir degistirince
// okul dizinini /api/universities'ten yeniden cekmez. Anahtar, panelin sehir kaydindaki slug'dir.
function createUniversitiesByCity(
  universities: Awaited<ReturnType<typeof getUniversitiesDirectory>>
): Record<string, CityGuideUniversitySummary[]> {
  const byCity: Record<string, CityGuideUniversitySummary[]> = {};
  universities.forEach((university) => {
    const cityName = getCityGuideName(university.city);
    if (!cityName) return;
    const citySlug = getCanonicalCitySlug(cityName);
    (byCity[citySlug] ??= []).push({
      id: university.id,
      name: university.name,
      type: university.type,
      departmentCount: university.departments.length,
    });
  });
  return byCity;
}

function CityGuidesDataUnavailable() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-[var(--editorial-ink)] sm:px-6 lg:px-8">
      <main className="mx-auto max-w-3xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta-ink)]">
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
  let universities: Awaited<ReturnType<typeof getUniversitiesDirectory>>;

  try {
    universities = await getUniversitiesDirectory();
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
      initialPanel={resolveCityGuidePanel(selectedCity.slug, cityOptions)}
      citiesWithCounts={cityOptions}
      universitiesByCity={createUniversitiesByCity(universities)}
    />
  );
}
