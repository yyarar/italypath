const CITY_GUIDE_ALIASES: Record<string, string> = {
  "Napoli / Caserta": "Napoli",
  "Uzaktan Eğitim / Roma": "Roma",
};

const CITY_GUIDE_EXCLUSIONS = new Set(["Benevento / Online", "Piemonte"]);

export function createCityGuideSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function getCityGuideName(city: string | null | undefined): string | null {
  const trimmed = city?.trim();
  if (!trimmed) return null;

  const excluded = [...CITY_GUIDE_EXCLUSIONS].some(
    (name) => name.toLowerCase() === trimmed.toLowerCase()
  );
  if (excluded) return null;

  const alias = Object.entries(CITY_GUIDE_ALIASES).find(
    ([name]) => name.toLowerCase() === trimmed.toLowerCase()
  );
  return alias?.[1] ?? trimmed;
}

export function resolveCityGuideSelection(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  for (const excluded of CITY_GUIDE_EXCLUSIONS) {
    if (
      excluded.toLowerCase() === normalized ||
      createCityGuideSlug(excluded) === normalized
    ) {
      return null;
    }
  }

  for (const [alias, canonical] of Object.entries(CITY_GUIDE_ALIASES)) {
    if (alias.toLowerCase() === normalized || createCityGuideSlug(alias) === normalized) {
      return canonical;
    }
  }

  return value.trim();
}
