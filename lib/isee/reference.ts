// ISEE Parificato aracının sabit verileri. Her değer resmi kaynağa ve tarihe bağlıdır; uydurma değer eklenmez.
// Güncelleme: yeni yıl kuru Banca d'Italia yayımlayınca (Ocak), limitler yeni şartnameler çıkınca (yaz) eklenir.

export type ReferenceYear = 2024 | 2025;

// Seçim sırası: en yeni yıl önce.
export const REFERENCE_YEARS: ReferenceYear[] = [2025, 2024];
export const DEFAULT_REFERENCE_YEAR: ReferenceYear = 2025;

// Banca d'Italia yıllık ortalama kur, "1 € = X TL".
export const TRY_PER_EUR: Record<ReferenceYear, number> = {
  2024: 35.5734,
  2025: 44.8161,
};

export const RATE_SOURCE = {
  name: "Banca d'Italia",
  url: "https://tassidicambio.bancaditalia.it/terzevalute-wf-ui-web/averageRates",
  retrievedAt: "2026-09-17",
};

export type CityKey = "milano" | "torino" | "bologna" | "roma" | "padova";

export interface CityThreshold {
  key: CityKey;
  body: string;
  iseeLimit: number;
  ispeLimit: number;
  // AB dışı öğrencilerden 2026/27 başvurusunda istenen gelir/varlık yılı.
  requestedYear: ReferenceYear;
  sourceUrl: string;
}

export const THRESHOLDS_ACADEMIC_YEAR = "2026/27";
export const THRESHOLDS_VERIFIED_AT = "2026-09-17";

export const CITY_THRESHOLDS: CityThreshold[] = [
  {
    key: "milano",
    body: "Regione Lombardia (DSU)",
    iseeLimit: 26_887.93,
    ispeLimit: 58_452.06,
    requestedYear: 2024,
    sourceUrl:
      "https://www.regione.lombardia.it/istruzione-formazione-e-lavoro/universita-e-formazione-accademica/borse-di-studio-universitarie-2026-2027",
  },
  {
    key: "torino",
    body: "EDISU Piemonte",
    iseeLimit: 26_306.25,
    ispeLimit: 57_187.53,
    requestedYear: 2025,
    sourceUrl:
      "https://www.edisu.piemonte.it/sites/default/files/documentazione/bandi-di-concorso/Bando_borsa_di_studio_servizio_abitativo_premio_di_laurea_contributo_studenti_con_disabilit%C3%A0_dal_46_p.c._iscritti_al_collocamento_mirato_a.a._2026-27_0.pdf",
  },
  {
    key: "bologna",
    body: "ER.GO",
    iseeLimit: 25_000,
    ispeLimit: 50_000,
    requestedYear: 2025,
    sourceUrl:
      "https://www.er-go.it/cosa-fare-per/bandi-di-concorso/leggi-il-bando/sezione-i-norme-generali/@@download/file/sezione-i-norme-generali.pdf",
  },
  {
    key: "roma",
    body: "LazioDisco",
    iseeLimit: 28_339.88,
    ispeLimit: 61_608.48,
    requestedYear: 2024,
    sourceUrl: "https://laziodisco.it/wp-content/uploads/2026/07/BANDO-DIRITTO-ALLO-STUDIO-26-27-con-EC.pdf",
  },
  {
    key: "padova",
    body: "Università di Padova / ESU",
    iseeLimit: 26_306.25,
    ispeLimit: 43_125.94,
    requestedYear: 2024,
    sourceUrl: "https://wwwassets.unipd.it/sites/default/files/2026-07/Bando%20Borse%20Studio%202026-27.pdf",
  },
];

export type FormulaSourceKey = "dpcm" | "unimi";

export const FORMULA_SOURCES: Array<{ key: FormulaSourceKey; url: string }> = [
  { key: "dpcm", url: "https://www.gazzettaufficiale.it/eli/id/2014/1/24/14G00009/sg" },
  {
    key: "unimi",
    url: "https://www.unimi.it/sites/default/files/2023-07/Valutazione%20della%20condizione%20economica%20e%20patrimoniale%20degli%20studenti%20stranieri.pdf",
  },
];

export function averageLimits(cities: Array<{ iseeLimit: number; ispeLimit: number }> = CITY_THRESHOLDS) {
  const total = cities.reduce(
    (sum, city) => ({ isee: sum.isee + city.iseeLimit, ispe: sum.ispe + city.ispeLimit }),
    { isee: 0, ispe: 0 },
  );
  const divisor = Math.max(1, cities.length);
  return { isee: total.isee / divisor, ispe: total.ispe / divisor };
}
