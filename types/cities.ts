export type CityCostTier = "budget" | "balanced" | "high";

export type CityCostCluster =
  | "regional-capital"
  | "provincial-student-city"
  | "micro-campus-town"
  | "tourism-heavy"
  | "island-premium"
  | "alpine-premium"
  | "metro-satellite";

export type CityPlaceHierarchy = "city" | "hamlet" | "satellite-town" | "dual-city";

export interface TieredCityRecord {
  slug: string;
  name: string;
  nameEn: string;
  cityNameIt: string;
  altNames: string[];
  region: string;
  placeHierarchy: CityPlaceHierarchy;
  primaryStudentBase?: string;
  costTier: CityCostTier;
  costCluster: CityCostCluster;
  costTierRationale: string;
  historyShort: string;
  historyShortEn: string;
  historySourceTitle: string;
  historySourceUrl: string;
  transportDetails: string;
  transportDetailsEn: string;
  climateAndVibe: string;
  climateAndVibeEn: string;
  transportSourceUrls: string[];
  sourceRetrievedAt: string;
  sourceConfidence: "official" | "mixed" | "wikipedia-only";
  reviewStatus: "source-checked";
  reviewPriority: string[];
  uncertain: string[];
}

export interface CityDetail {
  slug: string;
  name: string;
  nameEn: string;
  cityNameIt?: string;
  altNames?: string[];
  region: string;
  contentStatus?: "researched" | "unresearched";
  costSourceName?: string;
  costSourceUrl?: string;
  costSourceLastUpdated?: string;
  costModel?: "external" | "italypath-tier";
  costModelVersion?: string;
  costRating: 1 | 2 | 3 | 4 | 5;
  studentPopulation?: string;
  studentPopulationEn?: string;
  rentAverage: string;
  livingExpenses: string;
  transportCost: string;
  rentAverageEn: string;
  livingExpensesEn: string;
  transportCostEn: string;
  transportDetails: string;
  transportDetailsEn: string;
  climateAndVibe: string;
  climateAndVibeEn: string;
  editorialTip?: string;
  editorialTipEn?: string;
  historyShort?: string;
  historyShortEn?: string;
  historySourceTitle?: string;
  historySourceUrl?: string;
  sourceRetrievedAt?: string;
}
