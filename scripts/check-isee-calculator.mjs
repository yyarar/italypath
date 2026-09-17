import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

// ISEE Parificato kalıcı guard'ı. lib/isee/* dosyaları bağımlılıksızdır; her biri tek başına transpile edilip içe aktarılır.
const root = process.cwd();

async function importTs(relativePath) {
  const source = await readFile(path.join(root, relativePath), "utf8").catch((error) => {
    assert.fail(`${relativePath} must exist before ISEE checks can run: ${error.message}`);
  });
  const tempDir = await mkdtemp(path.join(tmpdir(), "isee-check-"));
  const tempFile = path.join(tempDir, `${path.basename(relativePath, ".ts")}.mjs`);
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  await writeFile(tempFile, compiled, "utf8");
  try {
    return await import(`file://${tempFile}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function near(actual, expected, message, tolerance = 0.5) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, received ${actual}`,
  );
}

const RATE_2024 = 35.5734;
const RATE_2025 = 44.8161;

function household(overrides = {}) {
  return {
    members: 4,
    children: 2,
    hasMinorChildren: false,
    hasChildUnderThree: false,
    parentsWork: false,
    disabledMembers: 0,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    ...household(),
    earners: [],
    home: { tenure: "free" },
    otherBuildings: { sqm: 0, mortgageTry: 0 },
    savings: { tryAmount: 0, eurAmount: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1) Hesap motoru
// ---------------------------------------------------------------------------
const { calculateParificato, calculateScale, SQM_VALUE_EUR } = await importTs("lib/isee/parificato.ts");

assert.equal(SQM_VALUE_EUR, 500, "foreign buildings are valued at 500 EUR per sqm");

// Aile katsayısı
near(calculateScale(household({ members: 1, children: 0 })).value, 1, "1 member", 0.001);
near(calculateScale(household({ members: 2, children: 1 })).value, 1.57, "2 members", 0.001);
near(calculateScale(household({ members: 3, children: 1 })).value, 2.04, "3 members", 0.001);
near(calculateScale(household()).value, 2.46, "4 members", 0.001);
near(calculateScale(household({ members: 5, children: 2 })).value, 2.85, "5 members", 0.001);
near(calculateScale(household({ members: 6, children: 2 })).value, 3.2, "6 members add 0.35", 0.001);
near(calculateScale(household({ members: 7, children: 2 })).value, 3.55, "7 members add 0.70", 0.001);
near(calculateScale(household({ members: 5, children: 3 })).value, 3.05, "3 children add 0.20", 0.001);
near(calculateScale(household({ members: 6, children: 4 })).value, 3.55, "4 children add 0.35", 0.001);
near(calculateScale(household({ members: 7, children: 5 })).value, 4.05, "5+ children add 0.50", 0.001);
near(
  calculateScale(household({ hasMinorChildren: true, parentsWork: true })).value,
  2.66,
  "minor children with working parents add 0.20",
  0.001,
);
near(
  calculateScale(household({ hasMinorChildren: true, hasChildUnderThree: true, parentsWork: true })).value,
  2.76,
  "child under three with working parents adds 0.30",
  0.001,
);
near(
  calculateScale(household({ hasMinorChildren: true, parentsWork: false })).value,
  2.46,
  "no increase when parents do not work",
  0.001,
);
near(
  calculateScale(household({ hasMinorChildren: false, hasChildUnderThree: true, parentsWork: true })).value,
  2.46,
  "under-three flag is ignored without minor children",
  0.001,
);
near(calculateScale(household({ disabledMembers: 2 })).value, 3.46, "each disabled member adds 0.50", 0.001);
near(
  calculateScale(household({ members: 1, children: 0, disabledMembers: 3 })).value,
  1.5,
  "disabled members are clamped to household size",
  0.001,
);
assert.deepEqual(
  calculateScale(household({ members: 5, children: 3, hasMinorChildren: true, parentsWork: true })).increments,
  [
    { key: "children3", value: 0.2 },
    { key: "minorsWork", value: 0.2 },
  ],
  "increments are reported with stable keys",
);

// Aile A — mavi
const familyA = calculateParificato(
  input({
    earners: [
      { kind: "employee", grossTry: 1_200_000 },
      { kind: "employee", grossTry: 600_000 },
    ],
    home: { tenure: "owned", sqm: 120, mortgageTry: 0 },
    otherBuildings: { sqm: 80, mortgageTry: 0 },
    savings: { tryAmount: 500_000, eurAmount: 0 },
  }),
  RATE_2025,
);
near(familyA.totalIncome, 40_164.14, "A total income");
near(familyA.employeeDeduction, 5_677.61, "A employee deduction is capped per earner");
near(familyA.isr, 34_486.53, "A ISR");
near(familyA.homeValue, 60_000, "A home value");
near(familyA.homeCounted, 5_000, "A home counts two thirds above the franchise");
near(familyA.otherBuildingsNet, 40_000, "A other buildings");
near(familyA.savingsNet, 1_156.7, "A savings above the franchise");
near(familyA.isp, 46_156.7, "A ISP");
near(familyA.scale, 2.46, "A scale", 0.001);
near(familyA.isee, 17_771.49, "A ISEE");
near(familyA.ispe, 18_762.89, "A ISPE");
near(familyA.incomeShare, 34_486.53 / 43_717.87, "A income share of ISE", 0.001);

// Aile B — kira, 3 çocuk, 2024
const familyB = calculateParificato(
  input({
    members: 5,
    children: 3,
    hasMinorChildren: true,
    parentsWork: true,
    earners: [
      { kind: "employee", grossTry: 900_000 },
      { kind: "employee", grossTry: 480_000 },
    ],
    home: { tenure: "rented", annualRentTry: 240_000 },
    savings: { tryAmount: 300_000, eurAmount: 2_000 },
  }),
  RATE_2024,
);
near(familyB.rentCap, 7_500, "B rent cap grows with the third child");
near(familyB.rentDeduction, 6_746.61, "B rent deduction");
near(familyB.isr, 26_347.77, "B ISR");
near(familyB.savingsFranchise, 11_000, "B savings franchise grows with the third child");
near(familyB.isp, 0, "B ISP");
near(familyB.scale, 3.25, "B scale", 0.001);
near(familyB.isee, 8_107.01, "B ISEE");
near(familyB.ispe, 0, "B ISPE");

// Aile C — varlık ağır, kırmızı
const familyC = calculateParificato(
  input({
    members: 3,
    children: 1,
    earners: [
      { kind: "pension", grossTry: 480_000 },
      { kind: "other", grossTry: 360_000 },
    ],
    home: { tenure: "owned", sqm: 200, mortgageTry: 900_000 },
    otherBuildings: { sqm: 330, mortgageTry: 0 },
    savings: { tryAmount: 2_000_000, eurAmount: 15_000 },
  }),
  RATE_2025,
);
near(familyC.pensionDeduction, 1_000, "C pension deduction is capped");
near(familyC.employeeDeduction, 0, "C other income has no deduction");
near(familyC.isr, 17_743.26, "C ISR");
near(familyC.homeCounted, 18_278.62, "C home after mortgage and franchise");
near(familyC.isp, 232_905.44, "C ISP");
near(familyC.isee, 31_531.55, "C ISEE");
near(familyC.ispe, 114_169.33, "C ISPE");

// Aile D — sarı
const familyD = calculateParificato(
  input({
    earners: [{ kind: "employee", grossTry: 2_400_000 }],
    home: { tenure: "owned", sqm: 150, mortgageTry: 0 },
    otherBuildings: { sqm: 60, mortgageTry: 0 },
    savings: { tryAmount: 800_000, eurAmount: 0 },
  }),
  RATE_2025,
);
near(familyD.isr, 50_552.18, "D ISR");
near(familyD.isp, 52_850.73, "D ISP");
near(familyD.isee, 24_846.48, "D ISEE");
near(familyD.ispe, 21_484.04, "D ISPE");

// Kenar durumlar
const rentOverIncome = calculateParificato(
  input({
    earners: [{ kind: "employee", grossTry: 100_000 }],
    home: { tenure: "rented", annualRentTry: 300_000 },
  }),
  RATE_2025,
);
near(rentOverIncome.rentDeduction, 1_785.08, "rent deduction cannot exceed remaining income");
near(rentOverIncome.isr, 0, "ISR never goes below zero");

const mortgageOverValue = calculateParificato(
  input({
    home: { tenure: "owned", sqm: 50, mortgageTry: 2_000_000 },
    otherBuildings: { sqm: 40, mortgageTry: 1_500_000 },
  }),
  RATE_2025,
);
near(mortgageOverValue.homeCounted, 0, "mortgage above home value gives zero");
near(mortgageOverValue.otherBuildingsNet, 0, "mortgage above other building value gives zero");

const fourChildren = calculateParificato(
  input({
    members: 6,
    children: 4,
    earners: [{ kind: "employee", grossTry: 3_000_000 }],
    home: { tenure: "owned", sqm: 130, mortgageTry: 0 },
    savings: { tryAmount: 0, eurAmount: 20_000 },
  }),
  RATE_2025,
);
near(fourChildren.homeFranchise, 57_500, "home franchise grows by 2,500 per child after the second");
near(fourChildren.homeCounted, 5_000, "home counted with larger franchise");
near(fourChildren.savingsFranchise, 12_000, "savings franchise max grows by 1,000 per child after the second");
near(fourChildren.savingsNet, 8_000, "savings above larger franchise");

const messy = calculateParificato(
  input({
    members: 2,
    children: 9,
    disabledMembers: -3,
    earners: [
      { kind: "employee", grossTry: -50_000 },
      { kind: "other", grossTry: Number.NaN },
    ],
    home: { tenure: "owned", sqm: Number.NaN, mortgageTry: -1 },
    otherBuildings: { sqm: -10, mortgageTry: 0 },
    savings: { tryAmount: -5, eurAmount: Number.NaN },
  }),
  RATE_2025,
);
assert.equal(messy.children, 2, "children are clamped to household size");
near(messy.isee, 0, "negative and NaN inputs are treated as zero");
near(messy.scale, 1.57, "scale uses sanitized household", 0.001);

assert.throws(() => calculateParificato(input(), 0), RangeError, "rate must be positive");
assert.throws(() => calculateParificato(input(), Number.NaN), RangeError, "rate must be a number");

// ---------------------------------------------------------------------------
// 2) Referans veriler ve ışık kuralı
// ---------------------------------------------------------------------------
const reference = await importTs("lib/isee/reference.ts");
const { bandFor, statusFor, buildVerdict } = await importTs("lib/isee/verdict.ts");

assert.equal(reference.TRY_PER_EUR[2024], RATE_2024, "2024 Banca d'Italia annual average");
assert.equal(reference.TRY_PER_EUR[2025], RATE_2025, "2025 Banca d'Italia annual average");
assert.equal(reference.DEFAULT_REFERENCE_YEAR, 2025, "default reference year");
assert.deepEqual(reference.REFERENCE_YEARS, [2025, 2024], "selectable years, newest first");
assert.match(reference.RATE_SOURCE.url, /^https:\/\/tassidicambio\.bancaditalia\.it\//, "rate source is Banca d'Italia");
assert.match(reference.THRESHOLDS_VERIFIED_AT, /^\d{4}-\d{2}-\d{2}$/, "verification date is ISO");
assert.equal(reference.THRESHOLDS_ACADEMIC_YEAR, "2026/27");

assert.deepEqual(
  reference.CITY_THRESHOLDS.map((city) => city.key),
  ["milano", "torino", "bologna", "roma", "padova"],
  "five main destinations in display order",
);
const expectedLimits = {
  milano: [26_887.93, 58_452.06, 2024],
  torino: [26_306.25, 57_187.53, 2025],
  bologna: [25_000, 50_000, 2025],
  roma: [28_339.88, 61_608.48, 2024],
  padova: [26_306.25, 43_125.94, 2024],
};
for (const city of reference.CITY_THRESHOLDS) {
  const [iseeLimit, ispeLimit, requestedYear] = expectedLimits[city.key];
  assert.equal(city.iseeLimit, iseeLimit, `${city.key} ISEE limit`);
  assert.equal(city.ispeLimit, ispeLimit, `${city.key} ISPE limit`);
  assert.equal(city.requestedYear, requestedYear, `${city.key} requested year`);
  assert.match(city.sourceUrl, /^https:\/\//, `${city.key} source must be https`);
  assert.ok(city.body.length > 0, `${city.key} managing body`);
}
for (const source of reference.FORMULA_SOURCES) {
  assert.match(source.url, /^https:\/\//, `${source.key} formula source must be https`);
}

const averages = reference.averageLimits();
near(averages.isee, 26_568.06, "average ISEE limit is computed from data", 0.01);
near(averages.ispe, 54_074.8, "average ISPE limit is computed from data", 0.01);

assert.equal(bandFor(0.85 * averages.isee - 0.01, averages.isee), "blue", "below 85% of average is blue");
assert.equal(bandFor(0.85 * averages.isee, averages.isee), "yellow", "exactly 85% of average is yellow");
assert.equal(bandFor(1.1 * averages.isee, averages.isee), "yellow", "exactly 110% of average is yellow");
assert.equal(bandFor(1.1 * averages.isee + 0.01, averages.isee), "red", "above 110% of average is red");
assert.equal(bandFor(0, averages.isee), "blue", "zero is blue");

assert.equal(statusFor(0.9 * 25_000 - 0.01, 25_000), "below");
assert.equal(statusFor(0.9 * 25_000, 25_000), "near");
assert.equal(statusFor(1.05 * 25_000, 25_000), "near");
assert.equal(statusFor(1.05 * 25_000 + 0.01, 25_000), "above");

const verdictA = buildVerdict(familyA.isee, familyA.ispe, reference.CITY_THRESHOLDS, averages);
assert.equal(verdictA.light, "blue", "family A is blue");
assert.deepEqual(verdictA.worseCities, [], "family A has no harder city");
assert.ok(verdictA.cities.every((city) => city.status === "below"), "family A is below every city limit");

const verdictC = buildVerdict(familyC.isee, familyC.ispe, reference.CITY_THRESHOLDS, averages);
assert.equal(verdictC.light, "red", "family C is red");
assert.ok(verdictC.cities.every((city) => city.status === "above"), "family C is above every city limit");

const verdictD = buildVerdict(familyD.isee, familyD.ispe, reference.CITY_THRESHOLDS, averages);
assert.equal(verdictD.iseeLight, "yellow", "family D ISEE is yellow");
assert.equal(verdictD.ispeLight, "blue", "family D ISPE is blue");
assert.equal(verdictD.light, "yellow", "overall light is the worse of the two");
assert.deepEqual(
  Object.fromEntries(verdictD.cities.map((city) => [city.key, city.status])),
  { milano: "near", torino: "near", bologna: "near", roma: "below", padova: "near" },
  "family D city statuses",
);
assert.deepEqual(verdictD.worseCities, [], "near cities are not worse than a yellow light");

// Genel tablo mavi ama Padova'nın düşük ISPE limiti aşılıyor
const verdictPadova = buildVerdict(10_000, 44_500, reference.CITY_THRESHOLDS, averages);
assert.equal(verdictPadova.light, "blue", "44,500 ISPE is still below 85% of the average");
assert.deepEqual(verdictPadova.worseCities, ["padova"], "Padova is flagged as harder than the overall light");
assert.equal(
  verdictPadova.cities.find((city) => city.key === "padova").ispeStatus,
  "near",
  "Padova ISPE status is near at 44,500",
);

console.log("ISEE Parificato checks passed");
