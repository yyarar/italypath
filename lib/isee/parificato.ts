// ISEE Parificato tahmini: ailesi Türkiye'de yaşayan öğrenciler için.
// İskelet: ISEE = (ISR + %20 × ISP) ÷ aile katsayısı; ISPE = ISP ÷ aile katsayısı.
// Muafiyet ve katsayılar DPCM 159/2013; yurt dışı binalar m² × 500 €; TL tutarlar yıllık ortalama kurla çevrilir.
// Dayanak: docs/superpowers/specs/2026-09-17-isee-parificato-calculator-design.md

export type EarnerKind = "employee" | "pension" | "other";

export interface ParificatoEarner {
  kind: EarnerKind;
  grossTry: number;
}

export type ParificatoHome =
  | { tenure: "owned"; sqm: number; mortgageTry: number }
  | { tenure: "rented"; annualRentTry: number }
  | { tenure: "free" };

export interface ParificatoHousehold {
  members: number;
  children: number;
  hasMinorChildren: boolean;
  hasChildUnderThree: boolean;
  parentsWork: boolean;
  disabledMembers: number;
}

export interface ParificatoInput extends ParificatoHousehold {
  earners: ParificatoEarner[];
  home: ParificatoHome;
  otherBuildings: { sqm: number; mortgageTry: number };
  savings: { tryAmount: number; eurAmount: number };
}

export type ScaleIncrementKey =
  | "children3"
  | "children4"
  | "children5"
  | "minorsWork"
  | "underThreeWork"
  | "disability";

export interface ScaleIncrement {
  key: ScaleIncrementKey;
  value: number;
}

export interface ScaleResult {
  value: number;
  base: number;
  members: number;
  children: number;
  increments: ScaleIncrement[];
}

export interface ParificatoResult {
  rate: number;
  members: number;
  children: number;
  scale: number;
  scaleBase: number;
  scaleIncrements: ScaleIncrement[];
  totalIncome: number;
  employeeDeduction: number;
  pensionDeduction: number;
  rentCap: number;
  rentDeduction: number;
  isr: number;
  homeSqm: number;
  homeValue: number;
  homeMortgage: number;
  homeFranchise: number;
  homeCounted: number;
  otherBuildingsSqm: number;
  otherBuildingsValue: number;
  otherBuildingsMortgage: number;
  otherBuildingsNet: number;
  savingsTotal: number;
  savingsFranchise: number;
  savingsNet: number;
  isp: number;
  ise: number;
  isee: number;
  ispe: number;
  incomeShare: number;
}

export const SQM_VALUE_EUR = 500;
export const ASSET_WEIGHT = 0.2;
export const HOME_FRANCHISE_EUR = 52_500;
export const HOME_FRANCHISE_PER_EXTRA_CHILD_EUR = 2_500;
export const HOME_COUNTED_SHARE = 2 / 3;
export const RENT_CAP_EUR = 7_000;
export const RENT_CAP_PER_EXTRA_CHILD_EUR = 500;
export const SAVINGS_FRANCHISE_BASE_EUR = 6_000;
export const SAVINGS_FRANCHISE_PER_MEMBER_EUR = 2_000;
export const SAVINGS_FRANCHISE_MAX_EUR = 10_000;
export const SAVINGS_FRANCHISE_PER_EXTRA_CHILD_EUR = 1_000;
export const INCOME_DEDUCTION_RATE = 0.2;
export const EMPLOYEE_DEDUCTION_CAP_EUR = 3_000;
export const PENSION_DEDUCTION_CAP_EUR = 1_000;

const BASE_SCALE: Record<number, number> = { 1: 1, 2: 1.57, 3: 2.04, 4: 2.46, 5: 2.85 };
const EXTRA_MEMBER_SCALE = 0.35;

function positive(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function count(value: number | undefined, minimum = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.floor(value));
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateScale(household: ParificatoHousehold): ScaleResult {
  const members = count(household.members, 1);
  const children = Math.min(count(household.children), members);
  const disabledMembers = Math.min(count(household.disabledMembers), members);
  const base = BASE_SCALE[Math.min(members, 5)] + Math.max(0, members - 5) * EXTRA_MEMBER_SCALE;
  const increments: ScaleIncrement[] = [];

  if (children === 3) increments.push({ key: "children3", value: 0.2 });
  else if (children === 4) increments.push({ key: "children4", value: 0.35 });
  else if (children >= 5) increments.push({ key: "children5", value: 0.5 });

  if (household.hasMinorChildren && household.parentsWork) {
    increments.push(
      household.hasChildUnderThree
        ? { key: "underThreeWork", value: 0.3 }
        : { key: "minorsWork", value: 0.2 },
    );
  }

  if (disabledMembers > 0) increments.push({ key: "disability", value: disabledMembers * 0.5 });

  const value = base + increments.reduce((sum, increment) => sum + increment.value, 0);
  return {
    value: round2(value),
    base: round2(base),
    members,
    children,
    increments: increments.map((increment) => ({ ...increment, value: round2(increment.value) })),
  };
}

export function calculateParificato(input: ParificatoInput, rate: number): ParificatoResult {
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new RangeError("Exchange rate must be a positive number of TRY per EUR");
  }

  const toEur = (tryAmount: number | undefined) => positive(tryAmount) / rate;
  const scale = calculateScale(input);
  const { members, children } = scale;
  const extraChildren = Math.max(0, children - 2);

  let totalIncome = 0;
  let employeeDeduction = 0;
  let pensionDeduction = 0;
  for (const earner of input.earners) {
    const income = toEur(earner.grossTry);
    totalIncome += income;
    if (earner.kind === "employee") {
      employeeDeduction += Math.min(income * INCOME_DEDUCTION_RATE, EMPLOYEE_DEDUCTION_CAP_EUR);
    } else if (earner.kind === "pension") {
      pensionDeduction += Math.min(income * INCOME_DEDUCTION_RATE, PENSION_DEDUCTION_CAP_EUR);
    }
  }

  const incomeBeforeRent = Math.max(0, totalIncome - employeeDeduction - pensionDeduction);
  const rentCap = RENT_CAP_EUR + RENT_CAP_PER_EXTRA_CHILD_EUR * extraChildren;
  const rentDeduction =
    input.home.tenure === "rented"
      ? Math.min(toEur(input.home.annualRentTry), rentCap, incomeBeforeRent)
      : 0;
  const isr = Math.max(0, incomeBeforeRent - rentDeduction);

  const homeSqm = input.home.tenure === "owned" ? positive(input.home.sqm) : 0;
  const homeValue = homeSqm * SQM_VALUE_EUR;
  const homeMortgage = input.home.tenure === "owned" ? Math.min(toEur(input.home.mortgageTry), homeValue) : 0;
  const homeFranchise = HOME_FRANCHISE_EUR + HOME_FRANCHISE_PER_EXTRA_CHILD_EUR * extraChildren;
  const homeCounted = Math.max(0, homeValue - homeMortgage - homeFranchise) * HOME_COUNTED_SHARE;

  const otherBuildingsSqm = positive(input.otherBuildings.sqm);
  const otherBuildingsValue = otherBuildingsSqm * SQM_VALUE_EUR;
  const otherBuildingsMortgage = Math.min(toEur(input.otherBuildings.mortgageTry), otherBuildingsValue);
  const otherBuildingsNet = otherBuildingsValue - otherBuildingsMortgage;

  const savingsTotal = toEur(input.savings.tryAmount) + positive(input.savings.eurAmount);
  const savingsFranchise =
    Math.min(
      SAVINGS_FRANCHISE_BASE_EUR + SAVINGS_FRANCHISE_PER_MEMBER_EUR * (members - 1),
      SAVINGS_FRANCHISE_MAX_EUR,
    ) +
    SAVINGS_FRANCHISE_PER_EXTRA_CHILD_EUR * extraChildren;
  const savingsNet = Math.max(0, savingsTotal - savingsFranchise);

  const isp = homeCounted + otherBuildingsNet + savingsNet;
  const ise = isr + ASSET_WEIGHT * isp;
  const isee = ise / scale.value;
  const ispe = isp / scale.value;

  return {
    rate,
    members,
    children,
    scale: scale.value,
    scaleBase: scale.base,
    scaleIncrements: scale.increments,
    totalIncome: round2(totalIncome),
    employeeDeduction: round2(employeeDeduction),
    pensionDeduction: round2(pensionDeduction),
    rentCap,
    rentDeduction: round2(rentDeduction),
    isr: round2(isr),
    homeSqm,
    homeValue: round2(homeValue),
    homeMortgage: round2(homeMortgage),
    homeFranchise,
    homeCounted: round2(homeCounted),
    otherBuildingsSqm,
    otherBuildingsValue: round2(otherBuildingsValue),
    otherBuildingsMortgage: round2(otherBuildingsMortgage),
    otherBuildingsNet: round2(otherBuildingsNet),
    savingsTotal: round2(savingsTotal),
    savingsFranchise,
    savingsNet: round2(savingsNet),
    isp: round2(isp),
    ise: round2(ise),
    isee: round2(isee),
    ispe: round2(ispe),
    incomeShare: ise > 0 ? isr / ise : 0,
  };
}
