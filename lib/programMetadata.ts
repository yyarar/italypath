/* Program detay sayfalarinin Turkce, sayfaya ozgu baslik ve aciklamasi.
   Saf modul: deger import'u yok, sehir cozucusu parametre olarak gelir.
   Uydurma bilgi yok; yalnizca kayittaki alanlar kullanilir. */

const BRAND_SUFFIX = " | ItalyPath";
const TITLE_BRAND_BUDGET = 48;
const TITLE_SCHOOL_BUDGET = 68;
const TITLE_HARD_BUDGET = 100;
const DESCRIPTION_BUDGET = 155;

export interface ProgramMetadataInput {
  programName: string;
  universityName: string;
  city: string;
  level: "bachelor" | "master" | "single-cycle";
  durationYears: number;
  languages: ("en" | "it")[];
  hasDossier: boolean;
}

export type CityResolver = (city: string) => string;

const LEVEL_TR: Record<ProgramMetadataInput["level"], string> = {
  bachelor: "Lisans",
  master: "Yüksek lisans",
  "single-cycle": "Tek devre",
};

// Varsayilan cozucu: "Napoli / Caserta" gibi birlesik degerlerin ilk parcasi.
// layout.tsx gercek getCityGuideName'i gecer.
const defaultCityResolver: CityResolver = (city) =>
  city.split("/")[0].trim() || city.trim();

function languageLabel(languages: ("en" | "it")[]) {
  const list = languages.length > 0 ? languages : ["en"];
  return list
    .map((entry) => (entry === "it" ? "İtalyanca" : "İngilizce"))
    .join(" / ");
}

function trimToBudget(value: string, budget: number) {
  if (value.length <= budget) return value;
  const cut = value.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  const safeCut = lastSpace > budget * 0.5 ? cut.slice(0, lastSpace) : cut;
  return `${safeCut.trimEnd()}…`;
}

export function buildProgramTitle(
  input: ProgramMetadataInput,
  resolveCity: CityResolver = defaultCityResolver,
) {
  const program = input.programName.trim();
  const withSchool = `${program} — ${input.universityName.trim()}`;

  if (withSchool.length <= TITLE_BRAND_BUDGET) {
    return `${withSchool}${BRAND_SUFFIX}`;
  }
  if (withSchool.length <= TITLE_SCHOOL_BUDGET) return withSchool;

  const withCity = `${program} — ${resolveCity(input.city)}`;
  if (withCity.length <= TITLE_SCHOOL_BUDGET) return withCity;

  return trimToBudget(withCity, TITLE_HARD_BUDGET);
}

// Uzun okul adlarinda cumlenin "…" ile kesilmemesi icin, siganin en uzunu
// secilir (arama sonucunda yarim cumle gorunmesin).
const DOSSIER_TAILS = [
  " Başvuru takvimi, kabul koşulları ve gerekli belgeler resmî kaynaklarla tek sayfada.",
  " Başvuru takvimi, kabul koşulları ve belgeler resmî kaynaklarla.",
  " Kabul koşulları ve başvuru takvimi resmî kaynaklarla.",
  " Kabul koşulları resmî kaynaklarla.",
];

const PENDING_TAILS = [
  " Okul bilgileri ve resmî bağlantılar; kabul dosyası hazırlanıyor.",
  " Kabul dosyası hazırlanıyor.",
];

export function buildProgramDescription(
  input: ProgramMetadataInput,
  resolveCity: CityResolver = defaultCityResolver,
) {
  const head = `${input.universityName.trim()} · ${resolveCity(input.city)}. ${
    LEVEL_TR[input.level]
  } programı, ${input.durationYears} yıl, ${languageLabel(input.languages)}.`;

  const tails = input.hasDossier ? DOSSIER_TAILS : PENDING_TAILS;
  const fitting = tails.find(
    (tail) => head.length + tail.length <= DESCRIPTION_BUDGET,
  );

  if (fitting) return `${head}${fitting}`;

  return trimToBudget(`${head}${tails[tails.length - 1]}`, DESCRIPTION_BUDGET);
}
