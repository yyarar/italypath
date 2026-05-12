import type { University } from "../app/data";

export const UNIVERSITIES_VIEW_MODE_STORAGE_KEY = "italyPathUniversitiesViewMode";
export const UNIVERSITIES_VIEW_MODE_EVENT = "italypath-universities-view-mode-change";

export type UniversityViewMode = "grid" | "compact";
export type UniversityLanguage = "tr" | "en";

export interface UniversityFilterOptions {
  searchTerm: string;
  selectedCity: string;
  selectedType: string;
  showFavoritesOnly: boolean;
  isFavorite: (universityId: number) => boolean;
}

export function getTypeLabel(type: string, language: UniversityLanguage) {
  if (language === "tr") return type;
  if (type === "Devlet") return "Public";
  if (type === "Özel") return "Private";
  return type;
}

export function getUniversityDescription(university: University, language: UniversityLanguage) {
  if (language === "en" && university.description_en) {
    return university.description_en;
  }

  return university.description;
}

export function getTotalDepartments(universities: University[]) {
  return universities.reduce((total, university) => total + (university.departments?.length ?? 0), 0);
}

export function getCitiesWithCounts(universities: University[]) {
  const cityMap = new Map<string, number>();

  for (const university of universities) {
    cityMap.set(university.city, (cityMap.get(university.city) ?? 0) + 1);
  }

  return [...cityMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

function universityMatchesSearch(university: University, term: string) {
  if (!term) return true;

  const nameMatch = university.name.toLowerCase().includes(term);
  const cityMatch = university.city.toLowerCase().includes(term);
  const departmentMatch = university.departments.some((department) =>
    department.name.toLowerCase().includes(term)
  );

  return nameMatch || cityMatch || departmentMatch;
}

export function filterUniversities(universities: University[], options: UniversityFilterOptions) {
  const term = normalizeSearchTerm(options.searchTerm);

  return universities.filter((university) => {
    const matchesSearch = universityMatchesSearch(university, term);
    const matchesFavorites = options.showFavoritesOnly ? options.isFavorite(university.id) : true;
    const matchesCity = options.selectedCity ? university.city === options.selectedCity : true;
    const matchesType = options.selectedType ? university.type === options.selectedType : true;

    return matchesSearch && matchesFavorites && matchesCity && matchesType;
  });
}
