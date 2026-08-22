import type { CityCostTier, CityDetail, TieredCityRecord } from "@/types/cities";

export const CITY_COST_MODEL_VERSION = "2026-08";

type DeepReadonly<T> = {
  readonly [Key in keyof T]: T[Key] extends object
    ? DeepReadonly<T[Key]>
    : T[Key];
};

type CityCostBand = Required<Pick<
  CityDetail,
  | "costRating"
  | "rentAverage"
  | "rentAverageEn"
  | "livingExpenses"
  | "livingExpensesEn"
  | "transportCost"
  | "transportCostEn"
>>;

type CityCostTierCatalog = DeepReadonly<Record<CityCostTier, CityCostBand>>;

function freezeCostBand(band: CityCostBand): DeepReadonly<CityCostBand> {
  return Object.freeze(band);
}

export const CITY_COST_TIERS: CityCostTierCatalog = Object.freeze({
  budget: freezeCostBand({
    costRating: 2,
    rentAverage: "Özel oda: 250€ - 400€ | Küçük stüdyo: 450€ - 650€",
    rentAverageEn: "Private room: €250 - €400 | Small studio: €450 - €650",
    livingExpenses: "Kira hariç aylık temel gider: 220€ - 300€",
    livingExpensesEn: "Monthly essentials excluding rent: €220 - €300",
    transportCost: "Öğrenci ulaşımı aylık karşılık: 20€ - 30€",
    transportCostEn: "Monthly student transport equivalent: €20 - €30",
  }),
  balanced: freezeCostBand({
    costRating: 3,
    rentAverage: "Özel oda: 350€ - 550€ | Küçük stüdyo: 600€ - 850€",
    rentAverageEn: "Private room: €350 - €550 | Small studio: €600 - €850",
    livingExpenses: "Kira hariç aylık temel gider: 260€ - 360€",
    livingExpensesEn: "Monthly essentials excluding rent: €260 - €360",
    transportCost: "Öğrenci ulaşımı aylık karşılık: 25€ - 40€",
    transportCostEn: "Monthly student transport equivalent: €25 - €40",
  }),
  high: freezeCostBand({
    costRating: 4,
    rentAverage: "Özel oda: 500€ - 750€ | Küçük stüdyo: 850€ - 1.250€",
    rentAverageEn: "Private room: €500 - €750 | Small studio: €850 - €1,250",
    livingExpenses: "Kira hariç aylık temel gider: 320€ - 450€",
    livingExpensesEn: "Monthly essentials excluding rent: €320 - €450",
    transportCost: "Öğrenci ulaşımı aylık karşılık: 35€ - 55€",
    transportCostEn: "Monthly student transport equivalent: €35 - €55",
  }),
});

export function materializeTieredCity(record: TieredCityRecord): CityDetail {
  const cost = CITY_COST_TIERS[record.costTier];

  return {
    slug: record.slug,
    name: record.name,
    nameEn: record.nameEn,
    cityNameIt: record.cityNameIt,
    altNames: record.altNames,
    region: record.region,
    contentStatus: "researched",
    costModel: "italypath-tier",
    costModelVersion: CITY_COST_MODEL_VERSION,
    ...cost,
    historyShort: record.historyShort,
    historyShortEn: record.historyShortEn,
    historySourceTitle: record.historySourceTitle,
    historySourceUrl: record.historySourceUrl,
    sourceRetrievedAt: record.sourceRetrievedAt,
    transportDetails: record.transportDetails,
    transportDetailsEn: record.transportDetailsEn,
    climateAndVibe: record.climateAndVibe,
    climateAndVibeEn: record.climateAndVibeEn,
  };
}
