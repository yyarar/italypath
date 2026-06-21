import type { Metadata } from "next";

import CityGuidesExplorer, {
  type CityGuideOption,
  type CityGuideUniversitySummary,
} from "@/components/cities/CityGuidesExplorer";
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

function createCitySlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function createCityOptions(universities: Awaited<ReturnType<typeof getUniversitiesData>>) {
  const counts: Record<string, number> = {};
  universities.forEach((university) => {
    if (university.city) {
      counts[university.city] = (counts[university.city] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      slug: createCitySlug(name),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function resolveSelectedCity(rawCity: string, cityOptions: CityGuideOption[]) {
  const normalizedRawCity = rawCity.toLowerCase();
  const match = cityOptions.find(
    (city) =>
      city.slug === normalizedRawCity ||
      city.name.toLowerCase() === normalizedRawCity
  );

  return match?.name ?? "Milano";
}

function createCityUniversitySummaries(
  universities: Awaited<ReturnType<typeof getUniversitiesData>>,
  cityName: string
): CityGuideUniversitySummary[] {
  return universities
    .filter((university) => university.city?.toLowerCase() === cityName.toLowerCase())
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
      initialSelectedCity={rawSelectedCity}
      initialCitiesWithCounts={cityOptions}
      initialCityUniversities={createCityUniversitySummaries(universities, selectedCity)}
    />
  );
}
