import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "iseeCalculator.ts");

async function importCalculator() {
  const source = await readFile(sourcePath, "utf8").catch((error) => {
    assert.fail(`lib/iseeCalculator.ts must exist before ISEE checks can run: ${error.message}`);
  });

  const tempDir = await mkdtemp(path.join(tmpdir(), "isee-calculator-"));
  const tempFile = path.join(tempDir, "iseeCalculator.mjs");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  await writeFile(tempFile, compiled, "utf8");
  const loadedModule = await import(`file://${tempFile}`);
  await rm(tempDir, { recursive: true, force: true });
  return loadedModule;
}

function approx(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 0.01, `${message}: expected ${expected}, received ${actual}`);
}

const {
  calculateIsee,
  calculateEquivalenceScale,
  calculateMobileAssetDeduction,
  calculateRentDeduction,
  calculateMainResidenceAsset,
} = await importCalculator();

approx(
  calculateEquivalenceScale({
    members: 6,
    children: 4,
    childrenUnderThree: 1,
    hasMinorChildren: true,
    bothParentsWorkedOrSingleParentWorked: true,
    disabilityMembers: 1,
  }).value,
  3.2 + 0.35 + 0.3 + 0.5,
  "ordinary scale includes base, four-child, minor-work and disability increases",
);

assert.equal(calculateMobileAssetDeduction({ members: 3, children: 1, mobileAssets: 8_000 }), 8_000);
assert.equal(calculateMobileAssetDeduction({ members: 4, children: 3, mobileAssets: 25_000 }), 11_000);

assert.equal(calculateRentDeduction({ annualRent: 9_600, children: 3, incomeBeforeRent: 12_000 }), 7_500);
assert.equal(calculateRentDeduction({ annualRent: 9_600, children: 3, incomeBeforeRent: 4_000 }), 4_000);

approx(
  calculateMainResidenceAsset({
    mainResidenceValue: 70_000,
    mainResidenceMortgage: 0,
    children: 3,
  }),
  10_000,
  "main residence counts as two thirds of value above the ordinary threshold",
);

const result = calculateIsee({
  members: 3,
  children: 1,
  childrenUnderThree: 0,
  hasMinorChildren: true,
  bothParentsWorkedOrSingleParentWorked: false,
  disabilityMembers: 0,
  income: {
    taxableAndExemptIncome: 30_000,
    employeeIncome: 20_000,
    employeeEarners: 1,
    pensionIncome: 5_000,
    pensionEarners: 1,
    maintenancePaid: 0,
    disabilityExpenses: 0,
    annualRent: 8_400,
  },
  assets: {
    bankBalances: 15_000,
    bankAverageStock: 12_000,
    otherFinancialAssets: 10_000,
    stateBackedSavings: 30_000,
    otherRealEstateValue: 50_000,
    otherRealEstateMortgage: 0,
    mainResidenceValue: 0,
    mainResidenceMortgage: 0,
    ownedMainResidence: false,
  },
});

approx(result.isr, 19_000, "ISR subtracts work, pension and rent deductions");
approx(result.mobileAssetsNet, 15_000, "mobile assets exclude protected state savings and apply franchise");
approx(result.isp, 65_000, "ISP combines net mobile and real-estate assets");
approx(result.ise, 32_000, "ISE applies 20 percent of ISP");
approx(result.isee, 15_686.27, "ISEE divides ISE by equivalence scale");

console.log("ISEE calculator checks passed");
