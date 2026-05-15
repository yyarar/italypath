export interface UniversityStats {
  universitiesCount: number | null;
  programsCount: number | null;
}

export function formatStatValue(value: number | null) {
  return value === null ? "..." : new Intl.NumberFormat("tr-TR").format(value);
}
