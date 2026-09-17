// Tahmini ISEE/ISPE değerini burs limitleriyle karşılaştırır.
// Genel ışık beş şehrin ortalamasına, şehir satırları her şehrin kendi limitine göre belirlenir.
// Bantlar bilerek geniştir: kur yöntemi, referans yıl ve belge farkları tahmini oynatır.

export type Light = "blue" | "yellow" | "red";
export type CityStatus = "below" | "near" | "above";

export const BLUE_BELOW_RATIO = 0.85;
export const RED_ABOVE_RATIO = 1.1;
export const CITY_BELOW_RATIO = 0.9;
export const CITY_ABOVE_RATIO = 1.05;

const LIGHT_RANK: Record<Light, number> = { blue: 0, yellow: 1, red: 2 };
const STATUS_RANK: Record<CityStatus, number> = { below: 0, near: 1, above: 2 };

export function bandFor(value: number, average: number): Light {
  if (value < BLUE_BELOW_RATIO * average) return "blue";
  if (value <= RED_ABOVE_RATIO * average) return "yellow";
  return "red";
}

export function statusFor(value: number, limit: number): CityStatus {
  if (value < CITY_BELOW_RATIO * limit) return "below";
  if (value <= CITY_ABOVE_RATIO * limit) return "near";
  return "above";
}

export interface VerdictCity<K extends string> {
  key: K;
  iseeStatus: CityStatus;
  ispeStatus: CityStatus;
  status: CityStatus;
}

export interface Verdict<K extends string> {
  iseeLight: Light;
  ispeLight: Light;
  light: Light;
  cities: VerdictCity<K>[];
  // Durumu genel ışıktan daha zor olan şehirler (ör. Padova'nın düşük ISPE limiti).
  worseCities: K[];
}

export function buildVerdict<K extends string>(
  isee: number,
  ispe: number,
  cities: Array<{ key: K; iseeLimit: number; ispeLimit: number }>,
  averages: { isee: number; ispe: number },
): Verdict<K> {
  const iseeLight = bandFor(isee, averages.isee);
  const ispeLight = bandFor(ispe, averages.ispe);
  const light = LIGHT_RANK[iseeLight] >= LIGHT_RANK[ispeLight] ? iseeLight : ispeLight;

  const cityResults = cities.map((city) => {
    const iseeStatus = statusFor(isee, city.iseeLimit);
    const ispeStatus = statusFor(ispe, city.ispeLimit);
    const status = STATUS_RANK[iseeStatus] >= STATUS_RANK[ispeStatus] ? iseeStatus : ispeStatus;
    return { key: city.key, iseeStatus, ispeStatus, status };
  });

  return {
    iseeLight,
    ispeLight,
    light,
    cities: cityResults,
    worseCities: cityResults
      .filter((city) => STATUS_RANK[city.status] > LIGHT_RANK[light])
      .map((city) => city.key),
  };
}
