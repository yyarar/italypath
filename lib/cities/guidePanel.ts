import {
  getCanonicalCitySlug,
  getCityDetailByName,
  getFallbackCityDetail,
} from "@/lib/cities/data";
import { resolveCityGuideSelection } from "@/lib/cities/normalization";
import { getScholarshipRegionBySlug } from "@/lib/scholarships/regions";
import type { CityDetail } from "@/types/cities";
import type { ManagingBody, RegionSlug } from "@/types/scholarships";

// /cities sag panelinin verisi. Sunucu ilk sehri bununla hazirlar; tarayici bu modulu yalnizca
// kullanici baska bir sehre gectiginde dinamik import ile yukler (44 sehir rehberinin metni ve
// burs bolgeleri ilk sayfa paketine girmez).

export type CityGuideOption = {
  name: string;
  nameEn: string;
  count: number;
  slug: string;
};

export type CityGuideUniversitySummary = {
  id: number;
  name: string;
  type: string;
  departmentCount: number;
};

export type CityScholarshipSummary = {
  regionSlug: RegionSlug;
  managingBodies: ManagingBody[];
  iseeLimit: string | null;
};

export type CityGuidePanel = {
  city: CityDetail;
  scholarship: CityScholarshipSummary | null;
};

// Physical student cities mapped to their Italian regions for fallback precision.
const CITY_TO_REGION_MAP: Record<string, string> = {
  "Milano": "Lombardia",
  "Pavia": "Lombardia",
  "Bergamo": "Lombardia",
  "Brescia": "Lombardia",
  "Castellanza": "Lombardia",
  "Roma": "Lazio",
  "Viterbo": "Lazio",
  "Cassino": "Lazio",
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

function resolveCityDetail(selection: string, cityOptions: CityGuideOption[]): CityDetail {
  const canonicalSelection = resolveCityGuideSelection(selection) ?? "Milano";
  const resolvedSelection = getCityDetailByName(canonicalSelection);
  const selectedSlug = resolvedSelection?.slug ?? getCanonicalCitySlug(canonicalSelection);
  const match = cityOptions.find((city) => city.slug === selectedSlug);

  const name = match ? match.name : "Milano";
  const region = CITY_TO_REGION_MAP[name] || "İtalya";

  const curated = resolvedSelection || getCityDetailByName(name);
  if (curated) return curated;

  return getFallbackCityDetail(name, region);
}

function summarizeScholarshipRegion(regionName: string): CityScholarshipSummary | null {
  const slug = getRegionSlugByName(regionName);
  if (!slug) return null;

  const region = getScholarshipRegionBySlug(slug);
  return {
    regionSlug: region.regionSlug,
    managingBodies: region.managingBodies.map((body) => ({
      name: body.name,
      officialUrl: body.officialUrl,
    })),
    iseeLimit: region.iseeLimit,
  };
}

export function resolveCityGuidePanel(
  selection: string,
  cityOptions: CityGuideOption[]
): CityGuidePanel {
  const city = resolveCityDetail(selection, cityOptions);
  return { city, scholarship: summarizeScholarshipRegion(city.region) };
}
