export interface EquivalenceScaleInput {
  members: number;
  children: number;
  childrenUnderThree: number;
  hasMinorChildren: boolean;
  bothParentsWorkedOrSingleParentWorked: boolean;
  disabilityMembers: number;
}

export interface IseeInput {
  members: number;
  children: number;
  childrenUnderThree: number;
  hasMinorChildren: boolean;
  bothParentsWorkedOrSingleParentWorked: boolean;
  disabilityMembers: number;
  income: {
    taxableAndExemptIncome: number;
    employeeIncome: number;
    employeeEarners: number;
    employeeIncomes?: number[];
    pensionIncome: number;
    pensionEarners: number;
    pensionIncomes?: number[];
    maintenancePaid: number;
    disabilityExpenses: number;
    annualRent: number;
    financialYieldRate?: number;
  };
  assets: {
    bankBalances: number;
    bankAverageStock: number;
    accountAssetPurchases?: number;
    otherFinancialAssets: number;
    stateBackedSavings: number;
    otherRealEstateValue: number;
    otherRealEstateMortgage: number;
    mainResidenceValue: number;
    mainResidenceMortgage: number;
    ownedMainResidence: boolean;
  };
}

export interface IseeResult {
  scale: number;
  scaleBase: number;
  scaleIncrements: Array<{ label: string; value: number }>;
  totalIncome: number;
  financialYield: number;
  employeeDeduction: number;
  pensionDeduction: number;
  maintenanceDeduction: number;
  disabilityExpenseDeduction: number;
  rentDeduction: number;
  isr: number;
  bankAssetsForIsee: number;
  protectedStateSavings: number;
  includedStateSavings: number;
  mobileAssetsGross: number;
  mobileAssetDeduction: number;
  mobileAssetsNet: number;
  mainResidenceAsset: number;
  otherRealEstateNet: number;
  realEstateAssetsNet: number;
  isp: number;
  ise: number;
  isee: number;
}

const BASE_SCALE: Record<number, number> = {
  1: 1,
  2: 1.57,
  3: 2.04,
  4: 2.46,
  5: 2.85,
};

function positive(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
}

function count(value: number | undefined, minimum = 0): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.floor(Number(value)));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function cappedPercentDeduction(values: number[] | undefined, aggregateIncome: number, earners: number, capPerEarner: number): number {
  if (values?.length) {
    return values.reduce((sum, value) => sum + Math.min(positive(value) * 0.2, capPerEarner), 0);
  }

  const normalizedEarners = count(earners);
  if (normalizedEarners === 0) return 0;
  return Math.min(positive(aggregateIncome) * 0.2, capPerEarner * normalizedEarners);
}

export function calculateEquivalenceScale(input: EquivalenceScaleInput) {
  const members = count(input.members, 1);
  const children = count(input.children);
  const childrenUnderThree = count(input.childrenUnderThree);
  const disabilityMembers = count(input.disabilityMembers);
  const scaleBase = BASE_SCALE[Math.min(members, 5)] + Math.max(0, members - 5) * 0.35;
  const increments: Array<{ label: string; value: number }> = [];

  if (children === 3) {
    increments.push({ label: "3 figli", value: 0.2 });
  } else if (children === 4) {
    increments.push({ label: "4 figli", value: 0.35 });
  } else if (children >= 5) {
    increments.push({ label: "5+ figli", value: 0.5 });
  }

  if (input.hasMinorChildren && input.bothParentsWorkedOrSingleParentWorked) {
    increments.push({
      label: childrenUnderThree > 0 ? "figli minori + under 3" : "figli minori + lavoro genitori",
      value: childrenUnderThree > 0 ? 0.3 : 0.2,
    });
  }

  if (disabilityMembers > 0) {
    increments.push({ label: "disabilita/non autosufficienza", value: disabilityMembers * 0.5 });
  }

  const value = scaleBase + increments.reduce((sum, increment) => sum + increment.value, 0);
  return {
    value: roundMoney(value),
    base: roundMoney(scaleBase),
    increments: increments.map((increment) => ({ ...increment, value: roundMoney(increment.value) })),
  };
}

export function calculateMobileAssetDeduction(input: { members: number; children: number; mobileAssets: number }) {
  const members = count(input.members, 1);
  const children = count(input.children);
  const base = Math.min(10_000, 6_000 + Math.max(0, members - 1) * 2_000);
  const childIncrease = Math.max(0, children - 2) * 1_000;
  return Math.min(positive(input.mobileAssets), base + childIncrease);
}

export function calculateRentDeduction(input: { annualRent: number; children: number; incomeBeforeRent: number }) {
  const rentCap = 7_000 + Math.max(0, count(input.children) - 2) * 500;
  return Math.min(positive(input.annualRent), rentCap, positive(input.incomeBeforeRent));
}

export function calculateMainResidenceAsset(input: {
  mainResidenceValue: number;
  mainResidenceMortgage: number;
  children: number;
}) {
  const netValue = Math.max(0, positive(input.mainResidenceValue) - positive(input.mainResidenceMortgage));
  const ordinaryResidenceDeduction = 52_500 + Math.max(0, count(input.children) - 2) * 2_500;
  return roundMoney(Math.max(0, netValue - ordinaryResidenceDeduction) * (2 / 3));
}

function calculateBankAssetsForIsee(input: IseeInput["assets"]) {
  const balance = positive(input.bankBalances);
  const averageStock = positive(input.bankAverageStock);
  const assetPurchases = positive(input.accountAssetPurchases);
  const averageExcess = Math.max(0, averageStock - balance);

  if (averageExcess > 0 && assetPurchases >= averageExcess) {
    return balance;
  }

  return Math.max(balance, averageStock);
}

export function calculateIsee(input: IseeInput): IseeResult {
  const members = count(input.members, 1);
  const children = count(input.children);
  const scale = calculateEquivalenceScale(input);
  const employeeDeduction = cappedPercentDeduction(
    input.income.employeeIncomes,
    input.income.employeeIncome,
    input.income.employeeEarners,
    3_000,
  );
  const pensionDeduction = cappedPercentDeduction(
    input.income.pensionIncomes,
    input.income.pensionIncome,
    input.income.pensionEarners,
    1_000,
  );

  const bankAssetsForIsee = calculateBankAssetsForIsee(input.assets);
  const protectedStateSavings = Math.min(positive(input.assets.stateBackedSavings), 50_000);
  const includedStateSavings = Math.max(0, positive(input.assets.stateBackedSavings) - protectedStateSavings);
  const otherFinancialAssets = positive(input.assets.otherFinancialAssets);
  const financialYieldRate = positive(input.income.financialYieldRate);
  const financialYield = otherFinancialAssets * financialYieldRate;
  const totalIncome = positive(input.income.taxableAndExemptIncome) + financialYield;
  const maintenanceDeduction = positive(input.income.maintenancePaid);
  const disabilityExpenseDeduction = positive(input.income.disabilityExpenses);
  const incomeBeforeRent = Math.max(
    0,
    totalIncome - employeeDeduction - pensionDeduction - maintenanceDeduction - disabilityExpenseDeduction,
  );
  const rentDeduction = calculateRentDeduction({
    annualRent: input.income.annualRent,
    children,
    incomeBeforeRent,
  });
  const isr = Math.max(0, incomeBeforeRent - rentDeduction);

  const mobileAssetsGross = bankAssetsForIsee + otherFinancialAssets + includedStateSavings;
  const mobileAssetDeduction = calculateMobileAssetDeduction({ members, children, mobileAssets: mobileAssetsGross });
  const mobileAssetsNet = Math.max(0, mobileAssetsGross - mobileAssetDeduction);
  const mainResidenceAsset = input.assets.ownedMainResidence ? calculateMainResidenceAsset({
    mainResidenceValue: input.assets.mainResidenceValue,
    mainResidenceMortgage: input.assets.mainResidenceMortgage,
    children,
  }) : 0;
  const otherRealEstateNet = Math.max(0, positive(input.assets.otherRealEstateValue) - positive(input.assets.otherRealEstateMortgage));
  const realEstateAssetsNet = mainResidenceAsset + otherRealEstateNet;
  const isp = mobileAssetsNet + realEstateAssetsNet;
  const ise = isr + isp * 0.2;
  const isee = scale.value > 0 ? ise / scale.value : 0;

  return {
    scale: scale.value,
    scaleBase: scale.base,
    scaleIncrements: scale.increments,
    totalIncome: roundMoney(totalIncome),
    financialYield: roundMoney(financialYield),
    employeeDeduction: roundMoney(employeeDeduction),
    pensionDeduction: roundMoney(pensionDeduction),
    maintenanceDeduction: roundMoney(maintenanceDeduction),
    disabilityExpenseDeduction: roundMoney(disabilityExpenseDeduction),
    rentDeduction: roundMoney(rentDeduction),
    isr: roundMoney(isr),
    bankAssetsForIsee: roundMoney(bankAssetsForIsee),
    protectedStateSavings: roundMoney(protectedStateSavings),
    includedStateSavings: roundMoney(includedStateSavings),
    mobileAssetsGross: roundMoney(mobileAssetsGross),
    mobileAssetDeduction: roundMoney(mobileAssetDeduction),
    mobileAssetsNet: roundMoney(mobileAssetsNet),
    mainResidenceAsset: roundMoney(mainResidenceAsset),
    otherRealEstateNet: roundMoney(otherRealEstateNet),
    realEstateAssetsNet: roundMoney(realEstateAssetsNet),
    isp: roundMoney(isp),
    ise: roundMoney(ise),
    isee: roundMoney(isee),
  };
}
