import type { Department, University } from "@/types/universities";
import {
  UniversitiesExplorer,
  type UniversitiesExplorerFilters,
} from "@/components/universities/UniversitiesExplorer";
import { getUniversitiesData } from "@/lib/universities.server";
import {
  filterUniversities,
  getCitiesWithCounts,
  getTotalDepartments,
} from "@/lib/universitiesFilters";

const UNIVERSITIES_HTML_PREVIEW_LIMIT = 12;

type SearchParamValue = string | string[] | undefined;
type UniversitiesPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function getSingleParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseUniversitiesSearchParams(
  searchParams: Record<string, SearchParamValue>
): UniversitiesExplorerFilters {
  const selectedType = getSingleParam(searchParams.type);

  return {
    searchTerm: getSingleParam(searchParams.q),
    selectedCity: getSingleParam(searchParams.city),
    selectedType: selectedType === "Devlet" || selectedType === "Özel" ? selectedType : "",
    showFavoritesOnly: getSingleParam(searchParams.fav) === "1",
  };
}

function createDepartmentHtmlPreview(department: Department): Department {
  return {
    id: department.id,
    name: department.name,
    slug: department.slug,
    languages: department.languages,
    durationYears: department.durationYears,
    level: department.level,
  };
}

function createUniversitiesHtmlPreview(universities: University[]) {
  return universities.slice(0, UNIVERSITIES_HTML_PREVIEW_LIMIT).map((university) => ({
    ...university,
    departments: university.departments.slice(0, 3).map(createDepartmentHtmlPreview),
    departmentCount: university.departments.length,
  }));
}

function UniversitiesDataUnavailable() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-[var(--editorial-ink)] sm:px-6 lg:px-8">
      <main className="mx-auto max-w-3xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
          ItalyPath okul rehberi
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.03em]">
          Üniversite verisi yüklenemedi
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--editorial-muted)] sm:text-base">
          Canlı okul ve program listesine şu anda ulaşılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.
        </p>
      </main>
    </div>
  );
}

export default async function UniversitiesPage({ searchParams }: UniversitiesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  let universities: University[];

  try {
    universities = await getUniversitiesData();
  } catch (error) {
    console.error("Failed to load universities page data:", error);
    return <UniversitiesDataUnavailable />;
  }

  const initialFilters = parseUniversitiesSearchParams(resolvedSearchParams);
  const initialCitiesWithCounts = getCitiesWithCounts(universities);
  const publicFilteredUniversities = filterUniversities(universities, {
    searchTerm: initialFilters.searchTerm,
    selectedCity: initialFilters.selectedCity,
    selectedType: initialFilters.selectedType,
    showFavoritesOnly: false,
    isFavorite: () => false,
  });

  return (
    <UniversitiesExplorer
      initialUniversities={createUniversitiesHtmlPreview(publicFilteredUniversities)}
      initialFilters={initialFilters}
      initialStats={{
        universitiesCount: universities.length,
        departmentsCount: getTotalDepartments(universities),
        citiesCount: initialCitiesWithCounts.length,
      }}
      initialCitiesWithCounts={initialCitiesWithCounts}
    />
  );
}
