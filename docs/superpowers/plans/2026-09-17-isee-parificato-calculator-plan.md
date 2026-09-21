# ISEE Parificato Hesaplayıcı Implementation Plan

> Durum (2026-09-21): **UYGULANDI** — 193a242 (2026-09-19). Checkbox'lar ilerlemeyi yansıtmaz; bkz. docs/superpowers/INDEX.md.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/isee` sayfasındaki normal ISEE hesaplayıcısını kaldırıp, ailesi Türkiye'de yaşayan öğrenciler için TL ve m² ile soran 4 adımlı ISEE Parificato sihirbazını ve mavi/sarı/kırmızı ışıklı sonuç ekranını kurmak.

**Architecture:** Saf hesap katmanı `lib/isee/` altında dört bağımlılıksız dosyadır (`parificato.ts`, `reference.ts`, `verdict.ts`, `wizardState.ts`); hiçbiri React/Next içe aktarmaz ve `scripts/check-isee-calculator.mjs` tarafından transpile edilip test edilir. UI `components/isee/` altında client leaf'lerdir; `app/isee/page.tsx` server wrapper olarak kalır. Tüm metinler `lib/translations.ts` içindeki yeni `iseeTool` ad alanından gelir.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind v4, lucide-react, Node guard scriptleri (`node:assert` + `typescript.transpileModule`).

**Spec:** `docs/superpowers/specs/2026-09-17-isee-parificato-calculator-design.md`

**Çalışma kopyası:** `.worktrees/isee-parificato`, dal `feat/isee-parificato`. Tüm komutlar bu klasörden çalıştırılır. Ana klasörde başka bir ajan oturumu çalışıyor; oraya dokunulmaz, `git push` ve main'e birleştirme Kerem onayı olmadan yapılmaz.

## Global Constraints

- Kapsam yalnızca ISEE Parificato (aile Türkiye'de). Normal ISEE kodu silinir; `lib/iseeCalculator.ts` ve `components/isee/IseeCalculatorClient.tsx` kalmaz.
- Kurlar (1 € = X TL, Banca d'Italia yıllık ortalama): `2024: 35.5734`, `2025: 44.8161`. Varsayılan yıl `2025`.
- 2026/27 limitleri: Milano `26887.93 / 58452.06`, Torino `26306.25 / 57187.53`, Bologna `25000 / 50000`, Roma `28339.88 / 61608.48`, Padova `26306.25 / 43125.94` (ISEE / ISPE). Ortalama veriden hesaplanır, elle yazılmaz.
- Sabitler: bina `500 €/m²`; ev muafiyeti `52500` (+`2500` × 2'den sonraki her çocuk), aşan kısmın `2/3`'ü; birikim muafiyeti `min(6000 + 2000 × (hane − 1), 10000)` + `1000` × 2'den sonraki her çocuk; kira tavanı `7000` + `500` × 2'den sonraki her çocuk; maaşlı `%20` en çok `3000`/kişi; emekli `%20` en çok `1000`/kişi; varlık ağırlığı `0.2`.
- Işık: `değer < 0.85 × ort.` mavi; `değer ≤ 1.10 × ort.` sarı; üstü kırmızı; genel ışık kötü olan. Şehir durumu: `< 0.90 × limit` altında; `≤ 1.05 × limit` sınırda; üstü üstünde.
- Tüm UI metinleri `lib/translations.ts` içinde TR + EN paralel; component içinde hard-code kullanıcı metni yok.
- Terracotta renkli metin gerekirse `text-[var(--editorial-terracotta-ink)]`; gradient/sparkle/indigo yok; keskin border'lı editorial stil.
- Form boş açılır; `localStorage`/URL durumu yok; düğmeler devre dışı bırakılmaz, doğrulama tıklamada çalışır.
- `lib/isee/*` dosyaları birbirinden yalnızca `import type` ile tip alır (test scripti tek dosya transpile eder).
- `middleware.ts` oluşturulmaz; `app/data.ts` import edilmez; gizli SEO metni yok.
- Commit'ler yalnızca kendi dosyalarını ekler (`git add <dosya>`), `git add -A` kullanılmaz. Commit mesajı sonu: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## Dosya Haritası

| Dosya | Durum | Sorumluluk |
| --- | --- | --- |
| `lib/isee/parificato.ts` | Yeni | Saf hesap: `calculateScale`, `calculateParificato` |
| `lib/isee/reference.ts` | Yeni | Kurlar, beş şehir limiti, kaynak URL'leri, `averageLimits` |
| `lib/isee/verdict.ts` | Yeni | `bandFor`, `statusFor`, `buildVerdict` |
| `lib/isee/wizardState.ts` | Yeni | Form tipi, boş durum, adım doğrulama, form → hesap girdisi |
| `scripts/check-isee-calculator.mjs` | Baştan yazılır | Hesap/ışık/doğrulama testleri + kaynak guard'ları |
| `lib/translations.ts` | Değişir | Yeni `iseeTool` (TR+EN); `isee` ad alanı sadeleşir |
| `components/IseeSection.tsx` | Değişir | Ana sayfa kartı maddeleri çeviriden gelir |
| `components/isee/format.ts` | Yeni | `fill`, `formatAmount`, `formatEuro`, `parseDigits` |
| `components/isee/fields.tsx` | Yeni | `MoneyField`, `NumberChips`, `ChoiceChips`, `YesNo`, `FieldHint`, `FieldError` |
| `components/isee/steps/*.tsx` | Yeni | Dört adım bileşeni |
| `components/isee/IseeWizard.tsx` | Yeni | Adım durumu, doğrulama, sonuç geçişi |
| `components/isee/IseeResult.tsx` | Yeni | Işık, kartlar, şehir listesi, döküm |
| `components/isee/IseeExplainer.tsx` | Yeni | Görünür açıklama + limit kartları + kaynaklar |
| `components/isee/IseeParificatoClient.tsx` | Yeni | Sayfa client leaf |
| `app/isee/page.tsx`, `app/isee/layout.tsx` | Değişir | Yeni leaf + metadata |
| `lib/iseeCalculator.ts`, `components/isee/IseeCalculatorClient.tsx` | Silinir | Eski normal ISEE |
| `scripts/check-home-consultation.mjs` | Değişir | ISEE dosya yolu |
| `app/sitemap.ts`, `public/llms.txt` | Değişir | `/isee` lastModified, açıklama |
| `AGENT_CONTEXT.md`, `AGENT_COMMITS.md` | Değişir | Dokümantasyon |

---

### Task 1: Hesap motoru (`lib/isee/parificato.ts`)

**Files:**
- Create: `lib/isee/parificato.ts`
- Rewrite: `scripts/check-isee-calculator.mjs`

**Interfaces:**
- Produces: `calculateScale(household: ParificatoHousehold): ScaleResult`, `calculateParificato(input: ParificatoInput, rate: number): ParificatoResult`, tipler `EarnerKind`, `ParificatoEarner`, `ParificatoHome`, `ParificatoHousehold`, `ParificatoInput`, `ScaleIncrementKey`, `ScaleIncrement`, `ScaleResult`, `ParificatoResult`, sabit `SQM_VALUE_EUR`.

- [ ] **Step 1: Test scriptini baştan yaz (başarısız olacak)**

<!-- FILE: scripts/check-isee-calculator.mjs -->
```js
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

console.log("ISEE Parificato checks passed");
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm run check:isee`
Expected: FAIL — `lib/isee/parificato.ts must exist before ISEE checks can run`

- [ ] **Step 3: Hesap motorunu yaz**

<!-- FILE: lib/isee/parificato.ts -->
```ts
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
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `npm run check:isee`
Expected: `ISEE Parificato checks passed`

- [ ] **Step 5: Commit**

```bash
git add lib/isee/parificato.ts scripts/check-isee-calculator.mjs
git commit -m "feat(isee): ISEE Parificato calculation engine with worked-example tests"
```

Not: eski `lib/iseeCalculator.ts` bu aşamada yerinde kalır (eski ekran hâlâ onu kullanıyor); Task 8'de silinir.

---

### Task 2: Referans veriler ve ışık kuralı (`lib/isee/reference.ts`, `lib/isee/verdict.ts`)

**Files:**
- Create: `lib/isee/reference.ts`, `lib/isee/verdict.ts`
- Modify: `scripts/check-isee-calculator.mjs` (son `console.log` satırından önce yeni bölüm)

**Interfaces:**
- Produces (`reference.ts`): `ReferenceYear = 2024 | 2025`, `REFERENCE_YEARS`, `DEFAULT_REFERENCE_YEAR`, `TRY_PER_EUR`, `RATE_SOURCE`, `CityKey`, `CityThreshold`, `CITY_THRESHOLDS`, `THRESHOLDS_ACADEMIC_YEAR`, `THRESHOLDS_VERIFIED_AT`, `FORMULA_SOURCES`, `averageLimits(cities?)`.
- Produces (`verdict.ts`): `Light`, `CityStatus`, `Verdict<K>`, `bandFor(value, average)`, `statusFor(value, limit)`, `buildVerdict(isee, ispe, cities, averages)`.

- [ ] **Step 1: Test bölümünü ekle (başarısız olacak)**

`scripts/check-isee-calculator.mjs` içinde son satırdaki `console.log("ISEE Parificato checks passed");` ifadesinin hemen ÜSTÜNE ekle:

<!-- APPEND: scripts/check-isee-calculator.mjs -->
```js
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
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm run check:isee`
Expected: FAIL — `lib/isee/reference.ts must exist before ISEE checks can run`

- [ ] **Step 3: Referans verileri yaz**

<!-- FILE: lib/isee/reference.ts -->
```ts
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
```

- [ ] **Step 4: Işık kuralını yaz**

<!-- FILE: lib/isee/verdict.ts -->
```ts
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
```

- [ ] **Step 5: Testin geçtiğini gör**

Run: `npm run check:isee`
Expected: `ISEE Parificato checks passed`

- [ ] **Step 6: Commit**

```bash
git add lib/isee/reference.ts lib/isee/verdict.ts scripts/check-isee-calculator.mjs
git commit -m "feat(isee): sourced rates, 2026/27 city limits and traffic-light verdict"
```

---

### Task 3: Form durumu ve doğrulama (`lib/isee/wizardState.ts`)

**Files:**
- Create: `lib/isee/wizardState.ts`
- Modify: `scripts/check-isee-calculator.mjs` (son `console.log` satırından önce yeni bölüm)

**Interfaces:**
- Consumes (yalnızca tip): `EarnerKind`, `ParificatoInput` (`./parificato`), `ReferenceYear` (`./reference`).
- Produces: `Tenure`, `EarnerForm`, `IseeFormState`, `StepKey`, `STEP_ORDER`, `FieldErrorKey`, `StepErrors`, `MAX_EARNERS`, `createEmptyForm(defaultYear)`, `nextEarnerId(earners)`, `validateStep(step, form)`, `toParificatoInput(form)`.
- Hata alan adları: `members`, `children`, `hasMinorChildren`, `hasChildUnderThree`, `parentsWork`, `earners`, `earner-<id>-kind`, `earner-<id>-amount`, `tenure`, `homeSqm`, `annualRentTry`, `hasOtherBuildings`, `otherSqm`, `savingsTry`.

- [ ] **Step 1: Test bölümünü ekle (başarısız olacak)**

`scripts/check-isee-calculator.mjs` içinde son `console.log` satırının hemen ÜSTÜNE ekle:

<!-- APPEND: scripts/check-isee-calculator.mjs -->
```js
// ---------------------------------------------------------------------------
// 3) Form durumu ve doğrulama
// ---------------------------------------------------------------------------
const wizard = await importTs("lib/isee/wizardState.ts");

assert.deepEqual(wizard.STEP_ORDER, ["household", "income", "property", "savings"], "four steps in order");

const emptyForm = wizard.createEmptyForm(2025);
assert.equal(emptyForm.referenceYear, 2025, "default year comes from the caller");
assert.equal(emptyForm.members, null, "form opens empty");
assert.equal(emptyForm.disabledMembers, 0, "disabled members default to zero");
assert.deepEqual(emptyForm.earners, [{ id: 1, kind: null, grossTry: null }], "one empty earner row");
assert.equal(wizard.nextEarnerId(emptyForm.earners), 2, "next earner id follows the highest id");
assert.equal(wizard.nextEarnerId([]), 1, "earner ids start at one");

assert.deepEqual(
  wizard.validateStep("household", emptyForm),
  { members: "choose", children: "choose" },
  "empty household step asks for members and children",
);
assert.deepEqual(
  wizard.validateStep("household", { ...emptyForm, members: 4, children: 2 }),
  { hasMinorChildren: "choose" },
  "minor-children question is required when there are children",
);
assert.deepEqual(
  wizard.validateStep("household", { ...emptyForm, members: 2, children: 0 }),
  {},
  "no minor-children question without children",
);
assert.deepEqual(
  wizard.validateStep("household", { ...emptyForm, members: 3, children: 5, hasMinorChildren: false }),
  { children: "childrenExceedMembers" },
  "children cannot exceed members",
);
assert.deepEqual(
  wizard.validateStep("household", { ...emptyForm, members: 4, children: 2, hasMinorChildren: true }),
  { hasChildUnderThree: "choose", parentsWork: "choose" },
  "follow-up questions are required when there are minor children",
);
assert.deepEqual(
  wizard.validateStep("household", {
    ...emptyForm,
    members: 4,
    children: 2,
    hasMinorChildren: true,
    hasChildUnderThree: false,
    parentsWork: true,
  }),
  {},
  "complete household step is valid",
);

assert.deepEqual(
  wizard.validateStep("income", emptyForm),
  { "earner-1-kind": "earnerKind", "earner-1-amount": "earnerAmount" },
  "empty earner row reports both fields",
);
assert.deepEqual(
  wizard.validateStep("income", { ...emptyForm, earners: [] }),
  { earners: "earnersEmpty" },
  "at least one earner is required",
);
assert.deepEqual(
  wizard.validateStep("income", { ...emptyForm, earners: [{ id: 1, kind: "employee", grossTry: 0 }] }),
  { "earner-1-amount": "earnerAmount" },
  "zero income is not accepted",
);
assert.deepEqual(
  wizard.validateStep("income", { ...emptyForm, earners: [{ id: 3, kind: "pension", grossTry: 480_000 }] }),
  {},
  "complete income step is valid",
);

assert.deepEqual(
  wizard.validateStep("property", emptyForm),
  { tenure: "choose", hasOtherBuildings: "choose" },
  "empty property step asks for tenure and other buildings",
);
assert.deepEqual(
  wizard.validateStep("property", { ...emptyForm, tenure: "owned", hasOtherBuildings: true }),
  { homeSqm: "sqm", otherSqm: "sqm" },
  "owned home and other buildings need square metres",
);
assert.deepEqual(
  wizard.validateStep("property", { ...emptyForm, tenure: "rented", hasOtherBuildings: false }),
  { annualRentTry: "rent" },
  "rented home needs the yearly rent",
);
assert.deepEqual(
  wizard.validateStep("property", { ...emptyForm, tenure: "free", hasOtherBuildings: false }),
  {},
  "rent-free home without other buildings is valid",
);

assert.deepEqual(wizard.validateStep("savings", emptyForm), { savingsTry: "savings" }, "savings are required");
assert.deepEqual(wizard.validateStep("savings", { ...emptyForm, savingsTry: 0 }), {}, "zero savings are accepted");

const formA = {
  ...emptyForm,
  members: 4,
  children: 2,
  hasMinorChildren: false,
  earners: [
    { id: 1, kind: "employee", grossTry: 1_200_000 },
    { id: 2, kind: "employee", grossTry: 600_000 },
  ],
  tenure: "owned",
  homeSqm: 120,
  annualRentTry: 999_999,
  hasOtherBuildings: true,
  otherSqm: 80,
  savingsTry: 500_000,
};
const inputA = wizard.toParificatoInput(formA);
assert.deepEqual(inputA.home, { tenure: "owned", sqm: 120, mortgageTry: 0 }, "only the chosen tenure is mapped");
assert.deepEqual(inputA.otherBuildings, { sqm: 80, mortgageTry: 0 });
assert.deepEqual(inputA.savings, { tryAmount: 500_000, eurAmount: 0 });
near(calculateParificato(inputA, RATE_2025).isee, 17_771.49, "form A reproduces family A");

const formHidden = wizard.toParificatoInput({
  ...formA,
  children: 0,
  hasMinorChildren: true,
  hasChildUnderThree: true,
  parentsWork: true,
  tenure: "rented",
  annualRentTry: 240_000,
  hasOtherBuildings: false,
  otherSqm: 80,
});
assert.equal(formHidden.hasMinorChildren, false, "minor flags are ignored without children");
assert.equal(formHidden.hasChildUnderThree, false);
assert.equal(formHidden.parentsWork, false);
assert.deepEqual(formHidden.home, { tenure: "rented", annualRentTry: 240_000 });
assert.deepEqual(formHidden.otherBuildings, { sqm: 0, mortgageTry: 0 }, "hidden other-building values are ignored");
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm run check:isee`
Expected: FAIL — `lib/isee/wizardState.ts must exist before ISEE checks can run`

- [ ] **Step 3: Form durumunu yaz**

<!-- FILE: lib/isee/wizardState.ts -->
```ts
// ISEE Parificato sihirbazının saf form mantığı: boş durum, adım doğrulama, form → hesap girdisi.
// React içermez; scripts/check-isee-calculator.mjs tarafından tek dosya olarak test edilir (yalnızca `import type`).

import type { EarnerKind, ParificatoInput } from "./parificato";
import type { ReferenceYear } from "./reference";

export type Tenure = "owned" | "rented" | "free";

export interface EarnerForm {
  id: number;
  kind: EarnerKind | null;
  grossTry: number | null;
}

export interface IseeFormState {
  members: number | null;
  children: number | null;
  hasMinorChildren: boolean | null;
  hasChildUnderThree: boolean | null;
  parentsWork: boolean | null;
  disabledMembers: number;
  referenceYear: ReferenceYear;
  earners: EarnerForm[];
  tenure: Tenure | null;
  homeSqm: number | null;
  homeMortgageTry: number | null;
  annualRentTry: number | null;
  hasOtherBuildings: boolean | null;
  otherSqm: number | null;
  otherMortgageTry: number | null;
  savingsTry: number | null;
  savingsEur: number | null;
}

export type StepKey = "household" | "income" | "property" | "savings";

export const STEP_ORDER: StepKey[] = ["household", "income", "property", "savings"];

export const MAX_EARNERS = 6;

export type FieldErrorKey =
  | "choose"
  | "childrenExceedMembers"
  | "earnersEmpty"
  | "earnerKind"
  | "earnerAmount"
  | "sqm"
  | "rent"
  | "savings";

export type StepErrors = Record<string, FieldErrorKey>;

export function createEmptyForm(defaultYear: ReferenceYear): IseeFormState {
  return {
    members: null,
    children: null,
    hasMinorChildren: null,
    hasChildUnderThree: null,
    parentsWork: null,
    disabledMembers: 0,
    referenceYear: defaultYear,
    earners: [{ id: 1, kind: null, grossTry: null }],
    tenure: null,
    homeSqm: null,
    homeMortgageTry: null,
    annualRentTry: null,
    hasOtherBuildings: null,
    otherSqm: null,
    otherMortgageTry: null,
    savingsTry: null,
    savingsEur: null,
  };
}

export function nextEarnerId(earners: EarnerForm[]): number {
  return earners.reduce((highest, earner) => Math.max(highest, earner.id), 0) + 1;
}

function isPositive(value: number | null): boolean {
  return value !== null && Number.isFinite(value) && value > 0;
}

export function validateStep(step: StepKey, form: IseeFormState): StepErrors {
  const errors: StepErrors = {};

  if (step === "household") {
    if (!isPositive(form.members)) errors.members = "choose";
    if (form.children === null) errors.children = "choose";
    else if (form.members !== null && form.children > form.members) errors.children = "childrenExceedMembers";

    if (form.children !== null && form.children > 0 && !errors.children) {
      if (form.hasMinorChildren === null) errors.hasMinorChildren = "choose";
      else if (form.hasMinorChildren) {
        if (form.hasChildUnderThree === null) errors.hasChildUnderThree = "choose";
        if (form.parentsWork === null) errors.parentsWork = "choose";
      }
    }
  }

  if (step === "income") {
    if (form.earners.length === 0) errors.earners = "earnersEmpty";
    for (const earner of form.earners) {
      if (earner.kind === null) errors[`earner-${earner.id}-kind`] = "earnerKind";
      if (!isPositive(earner.grossTry)) errors[`earner-${earner.id}-amount`] = "earnerAmount";
    }
  }

  if (step === "property") {
    if (form.tenure === null) errors.tenure = "choose";
    if (form.tenure === "owned" && !isPositive(form.homeSqm)) errors.homeSqm = "sqm";
    if (form.tenure === "rented" && !isPositive(form.annualRentTry)) errors.annualRentTry = "rent";
    if (form.hasOtherBuildings === null) errors.hasOtherBuildings = "choose";
    if (form.hasOtherBuildings === true && !isPositive(form.otherSqm)) errors.otherSqm = "sqm";
  }

  if (step === "savings") {
    if (form.savingsTry === null || !Number.isFinite(form.savingsTry) || form.savingsTry < 0) {
      errors.savingsTry = "savings";
    }
  }

  return errors;
}

export function toParificatoInput(form: IseeFormState): ParificatoInput {
  const children = form.children ?? 0;
  const hasMinorChildren = children > 0 && form.hasMinorChildren === true;

  let home: ParificatoInput["home"] = { tenure: "free" };
  if (form.tenure === "owned") {
    home = { tenure: "owned", sqm: form.homeSqm ?? 0, mortgageTry: form.homeMortgageTry ?? 0 };
  } else if (form.tenure === "rented") {
    home = { tenure: "rented", annualRentTry: form.annualRentTry ?? 0 };
  }

  return {
    members: form.members ?? 1,
    children,
    hasMinorChildren,
    hasChildUnderThree: hasMinorChildren && form.hasChildUnderThree === true,
    parentsWork: hasMinorChildren && form.parentsWork === true,
    disabledMembers: form.disabledMembers,
    earners: form.earners
      .filter((earner) => earner.kind !== null)
      .map((earner) => ({ kind: earner.kind as EarnerKind, grossTry: earner.grossTry ?? 0 })),
    home,
    otherBuildings:
      form.hasOtherBuildings === true
        ? { sqm: form.otherSqm ?? 0, mortgageTry: form.otherMortgageTry ?? 0 }
        : { sqm: 0, mortgageTry: 0 },
    savings: { tryAmount: form.savingsTry ?? 0, eurAmount: form.savingsEur ?? 0 },
  };
}
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `npm run check:isee`
Expected: `ISEE Parificato checks passed`

- [ ] **Step 5: Tip kontrolü**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: hata yok (yeni dosyalar mevcut kodu etkilemez).

- [ ] **Step 6: Commit**

```bash
git add lib/isee/wizardState.ts scripts/check-isee-calculator.mjs
git commit -m "feat(isee): wizard form state, step validation and input mapping"
```

---

### Task 4: Çeviriler ve ana sayfa kartı (`lib/translations.ts`, `components/IseeSection.tsx`)

**Files:**
- Modify: `lib/translations.ts` (TR `isee` bloğu ~261-276; EN `isee` bloğu ~1331-1345)
- Modify: `components/IseeSection.tsx`
- Modify: `scripts/check-isee-calculator.mjs` (yeni bölüm)

**Interfaces:**
- Produces: `t.isee.{homeCardTitle, homeCardDesc, homeCardItems[3], homeCardBtn}` ve `t.iseeTool.{header, nav, units, household, income, property, savings, errors, result, breakdown, explainer}`. EN nesnesi TR ile birebir aynı anahtar ağacını taşır (`LanguageContext` tipi `typeof translations['tr']`).
- Şablon değişkenleri süslü parantezle yazılır (`{year}`, `{rate}`, `{sqm}`, `{value}`, `{cap}`, `{members}`, `{n}`, `{cities}`, `{date}`); Task 5'teki `fill()` doldurur.

- [ ] **Step 1: Guard bölümünü ekle (başarısız olacak)**

`scripts/check-isee-calculator.mjs` içinde son `console.log` satırının hemen ÜSTÜNE ekle:

<!-- APPEND: scripts/check-isee-calculator.mjs -->
```js
// ---------------------------------------------------------------------------
// 4) Çeviriler
// ---------------------------------------------------------------------------
const translationsSource = await readFile(path.join(root, "lib/translations.ts"), "utf8");
assert.equal(
  translationsSource.split("\n    iseeTool: {").length - 1,
  2,
  "iseeTool namespace must exist once in TR and once in EN",
);
for (const legacyKey of ["incomeLabel:", "assetsLabel:", "familyLabel:", "homeCardBadge:"]) {
  assert.ok(!translationsSource.includes(legacyKey), `legacy isee key must be removed: ${legacyKey}`);
}
assert.equal(
  translationsSource.split("homeCardItems: [").length - 1,
  2,
  "home card items live in translations (TR + EN)",
);
const iseeSectionSource = await readFile(path.join(root, "components/IseeSection.tsx"), "utf8");
assert.ok(iseeSectionSource.includes("t.isee.homeCardItems"), "IseeSection reads its items from translations");
assert.ok(!iseeSectionSource.includes("language ==="), "IseeSection must not branch on language for copy");
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm run check:isee`
Expected: FAIL — `iseeTool namespace must exist once in TR and once in EN`

- [ ] **Step 3: TR bloğunu değiştir**

`lib/translations.ts` içinde `// 👇 ISEE Çevirileri (Türkçe)` yorumundan sonraki `isee: { ... },` bloğunun TAMAMINI aşağıdakiyle değiştir (yorum satırı kalır):

```ts
    isee: {
      homeCardTitle: "Burs şansını ISEE Parificato ile ölç",
      homeCardDesc: "Ailen Türkiye'de yaşıyorsa burs başvurusunda ISEE Parificato hesaplanır. Geliri TL, evi m² olarak gir; tahmini değerini ve beş büyük şehrin burs limitlerine göre durumunu gör.",
      homeCardItems: ["Gelir (TL)", "Ev ve mülk (m²)", "Birikim ve aile"],
      homeCardBtn: "Hesaplamaya başla"
    },
    iseeTool: {
      header: {
        back: "Ana sayfaya dön",
        eyebrow: "ItalyPath ISEE",
        title: "ISEE Parificato hesaplayıcı",
        subtitle: "Ailen Türkiye'de yaşıyorsa İtalya'daki burs başvurularında ISEE Parificato hesaplanır. Geliri TL, evi m² olarak gir; tahmini ISEE ve ISPE değerini ve burs limitlerine göre durumunu gör.",
        trust: ["TL ve m² ile sorar", "Resmi kur, 2026/27 limitleri", "Tahmindir, resmi değeri CAF verir"]
      },
      nav: {
        stepWord: "Adım",
        back: "Geri",
        next: "Devam",
        calculate: "Hesapla",
        edit: "Cevapları düzenle",
        restart: "Baştan başla",
        yes: "Evet",
        no: "Hayır",
        optional: "isteğe bağlı",
        increase: "Artır",
        decrease: "Azalt"
      },
      units: { lira: "TL", euro: "€", sqm: "m²" },
      household: {
        title: "Aile",
        heading: "Evde kaç kişi yaşıyorsunuz?",
        membersHint: "Öğrenci dahil: anne, baba, kardeşler ve aynı evde yaşayan diğer kişiler.",
        childrenLabel: "Bunların kaçı çocuk?",
        childrenHint: "Öğrenci dahil, anne-babasıyla yaşayan çocukların sayısı.",
        minorsLabel: "18 yaşından küçük çocuk var mı?",
        underThreeLabel: "3 yaşından küçük çocuk var mı?",
        parentsWorkLabel: "Anne ve baba, seçeceğin yılda en az 6 ay çalıştı mı?",
        parentsWorkHint: "Tek ebeveynli ailede o ebeveynin çalışması yeterli.",
        specialToggle: "Özel durum: engelli birey",
        disabledLabel: "Engelli veya bakıma muhtaç kişi sayısı",
        disabledHint: "Belgelenebilir orta veya ağır engellilik. Yoksa 0 bırak."
      },
      income: {
        title: "Yıl ve gelir",
        yearHeading: "Hangi yılın rakamlarını giriyorsun?",
        yearHint: "2026/27 başvurularında Torino ve Bologna 2025'i; Milano, Roma ve Padova 2024'ü istedi. Emin değilsen 2025'i seç.",
        rateNote: "Resmi kur (Banca d'Italia {year} ortalaması): 1 € = {rate} TL",
        earnersHeading: "Ailede geliri olan herkesi ekle",
        earnersHint: "O yılın toplam brüt geliri: kesintiler öncesi, ikramiye dahil. Yalnızca net maaşı biliyorsan yaklaşık brüt için neti 0,72'ye böl; bu kaba bir tahmindir.",
        earnerTitle: "Gelir sahibi {n}",
        kindLabel: "Gelir türü",
        kinds: { employee: "Maaşlı", pension: "Emekli", other: "Diğer" },
        otherHint: "Diğer: serbest meslek, ticari kazanç, kira geliri.",
        amountLabel: "Yıllık brüt gelir",
        addEarner: "Gelir sahibi ekle",
        removeEarner: "Satırı sil"
      },
      property: {
        title: "Ev ve mülk",
        heading: "Oturduğunuz ev kimin?",
        tenure: {
          owned: "Kendi evimiz",
          rented: "Kirada oturuyoruz",
          free: "Başkasının evi, kira ödemiyoruz"
        },
        sqmLabel: "Evin büyüklüğü (brüt m²)",
        mortgageLabel: "Kalan konut kredisi",
        mortgageHint: "31 Aralık {year} günü kalan anapara borcu. Yoksa boş bırak.",
        rentLabel: "Yıllık kira",
        rentHint: "{year} yılında ödenen toplam kira. Kira kontratı belgelenirse gelirden düşülür (en çok 7.000 €).",
        sqmInfo: "İtalya evin piyasa değerine bakmaz. Her m² sabit 500 € sayılır: {sqm} m² = {value}.",
        sqmInfoEmpty: "İtalya evin piyasa değerine bakmaz. Her m² sabit 500 € sayılır. Örnek: 120 m² = 60.000 €.",
        homeExemptNote: "Oturduğunuz evin ilk 52.500 €'luk kısmı hesaba katılmaz.",
        otherHeading: "Başka ev, dükkan veya yazlığınız var mı?",
        otherHint: "Aile üyelerinden herhangi birinin üzerine kayıtlı binalar. Arsa ve tarla sayılmaz.",
        otherSqmLabel: "Diğer binaların toplam büyüklüğü (brüt m²)",
        otherMortgageLabel: "Bu binalar için kalan kredi",
        otherMortgageHint: "Yoksa boş bırak."
      },
      savings: {
        title: "Birikim",
        heading: "31 Aralık {year} günü ailenin toplam birikimi ne kadardı?",
        hint: "Tüm aile üyelerinin vadesiz ve vadeli hesapları, fon, hisse ve şirket payları dahil.",
        tryLabel: "TL birikim",
        tryHint: "Birikim yoksa 0 yaz.",
        eurLabel: "Döviz ve altın birikimi (euro karşılığı)",
        eurHint: "Dolar, euro veya altın hesabı varsa yaklaşık euro karşılığını yaz. Yoksa boş bırak."
      },
      errors: {
        choose: "Bir seçenek seç.",
        childrenExceedMembers: "Çocuk sayısı evdeki kişi sayısından fazla olamaz.",
        earnersEmpty: "En az bir gelir sahibi ekle.",
        earnerKind: "Gelir türünü seç.",
        earnerAmount: "Yıllık brüt geliri TL olarak yaz.",
        sqm: "Brüt m² değerini yaz.",
        rent: "Yıllık kirayı TL olarak yaz.",
        savings: "Birikimi TL olarak yaz; birikim yoksa 0 yaz.",
        summary: "Devam etmeden önce işaretli alanları tamamla."
      },
      result: {
        title: "Tahmini sonucun",
        lights: {
          blue: {
            label: "Mavi ışık: rahat görünüyorsun",
            body: "Tahmini değerlerin beş büyük şehrin burs limitlerinin belirgin altında. Resmi hesapta küçük farklar çıksa bile büyük olasılıkla limitin altında kalırsın."
          },
          yellow: {
            label: "Sarı ışık: sınırdasın",
            body: "Tahminin burs limitlerine yakın. Resmi hesapta kur, yıl ve belge farkları sonucu birkaç bin euro oynatabilir; şehir seçimi sonucu değiştirebilir."
          },
          red: {
            label: "Kırmızı ışık: limitlerin üstündesin",
            body: "Bu rakamlarla bölgesel ihtiyaç bursu zor görünüyor. Harç indirimi ve başarı bursları ayrı değerlendirilir; seçenekleri birlikte konuşabiliriz."
          }
        },
        iseeLabel: "Tahmini ISEE",
        iseeHint: "Gelir ve varlıkların %20'si, aile katsayısına bölünür.",
        ispeLabel: "Tahmini ISPE",
        ispeHint: "Yalnızca varlıklar, aile katsayısına bölünür.",
        bindingIsee: "Durumunu gelir tarafı (ISEE) belirliyor.",
        bindingIspe: "Durumunu varlık tarafı (ISPE) belirliyor: m² ve birikim etkili.",
        citiesTitle: "Beş şehrin {year} burs limitleri",
        citiesHint: "Her şehir kendi limitiyle karşılaştırılır. ISEE ya da ISPE limitinden biri aşılırsa burs alınamaz.",
        iseeShort: "ISEE",
        ispeShort: "ISPE",
        status: { below: "altında", near: "sınırda", above: "üstünde" },
        worseNote: "Dikkat: {cities} için durumun genel tablodan daha zor.",
        cityNames: { milano: "Milano", torino: "Torino", bologna: "Bologna", roma: "Roma", padova: "Padova" },
        disclaimerTitle: "Bu bir tahmindir",
        disclaimer: "Resmi ISEE Parificato değerini yalnızca İtalya'daki yetkili CAF ya da burs kurumu, Türkiye'den getirilen çevirili ve apostilli belgelerle hesaplar. Kurumlar farklı yıl ve kur kullanabilir; sonucun birkaç bin euro oynaması normaldir.",
        scholarshipsLink: "Bölgesel burs haritasını aç"
      },
      breakdown: {
        toggle: "Nasıl hesapladık?",
        rate: "Kur ({year} ortalaması)",
        rateValue: "1 € = {rate} TL",
        incomeTitle: "Gelir tarafı (ISR)",
        totalIncome: "Toplam brüt gelir",
        employeeDeduction: "Maaşlı indirimi (%20, kişi başı en çok 3.000 €)",
        pensionDeduction: "Emekli indirimi (%20, kişi başı en çok 1.000 €)",
        rentDeduction: "Kira indirimi (en çok {cap})",
        isr: "Gelir göstergesi (ISR)",
        assetsTitle: "Varlık tarafı (ISP)",
        homeValue: "Oturulan ev ({sqm} m² × 500 €)",
        homeMortgage: "Kalan konut kredisi",
        homeFranchise: "Ev muafiyeti",
        homeCounted: "Evden hesaba giren (kalanın 2/3'ü)",
        otherValue: "Diğer binalar ({sqm} m² × 500 €)",
        otherMortgage: "Diğer binaların kredisi",
        savingsTotal: "Birikim",
        savingsFranchise: "Birikim muafiyeti",
        savingsNet: "Birikimden hesaba giren",
        isp: "Varlık göstergesi (ISP)",
        scaleTitle: "Aile katsayısı",
        scaleBase: "{members} kişilik aile",
        increments: {
          children3: "3 çocuk",
          children4: "4 çocuk",
          children5: "5 ve üzeri çocuk",
          minorsWork: "18 yaş altı çocuk, ebeveynler çalışıyor",
          underThreeWork: "3 yaş altı çocuk, ebeveynler çalışıyor",
          disability: "Engelli birey"
        },
        scaleTotal: "Toplam katsayı",
        formulaTitle: "Sonuç",
        ise: "ISE = ISR + %20 × ISP",
        isee: "ISEE = ISE ÷ katsayı",
        ispe: "ISPE = ISP ÷ katsayı",
        shareTitle: "Sonucu ne belirledi?",
        shareIncome: "Gelirin payı",
        shareAssets: "Varlıkların payı"
      },
      explainer: {
        title: "ISEE Parificato nedir, nasıl hesaplanır?",
        what: {
          heading: "ISEE Parificato nedir?",
          body: [
            "ISEE, İtalya'da burs ve harç indirimi için ailenin ekonomik durumunu tek bir rakama indiren göstergedir. Ailesi İtalya dışında yaşayan ve geliri yurt dışında olan öğrenciler için normal ISEE çıkarılamaz; yerine aynı mantıkla hesaplanan ISEE Parificato kullanılır. Bazı burs kurumları buna ISEEUP der."
          ]
        },
        how: {
          heading: "Nasıl hesaplanır?",
          bullets: [
            "Ailenin yıllık brüt geliri, o yılın Banca d'Italia ortalama kuruyla euroya çevrilir.",
            "Yurt dışındaki evler piyasa değeriyle değil, m² başına sabit 500 € ile değerlenir. Arsa ve tarla sayılmaz; kalan konut kredisi düşülür.",
            "31 Aralık'taki banka birikimi aynı kurla euroya çevrilir.",
            "İtalyan mevzuatındaki (DPCM 159/2013) muafiyetler uygulanır: oturulan evin ilk 52.500 €'su, birikimin ilk 6.000-10.000 €'su, maaş ve emekli gelirinin bir kısmı ve belgelenen kira.",
            "ISEE = (gelir + varlıkların %20'si) ÷ aile katsayısı. Aile kalabalıklaştıkça katsayı büyür, ISEE düşer."
          ]
        },
        difference: {
          heading: "ISEE ve ISPE farkı",
          body: [
            "Burslarda iki ayrı limit vardır. ISEE gelir ve varlığı birlikte ölçer; ISPE yalnızca varlığı ölçer (varlıklar ÷ aile katsayısı). İkisinden biri limiti aşarsa burs alınamaz.",
            "Türkiye'den başvuran ailelerde geliri düşük ama birkaç gayrimenkulü olanlar çoğunlukla ISPE limitine takılır."
          ]
        },
        year: {
          heading: "Hangi yılın geliri istenir?",
          body: [
            "Kurumdan kuruma değişir. 2026/27 başvurularında EDISU Piemonte (Torino) ve ER.GO (Bologna) AB dışı öğrencilerden 2025 yılını; LazioDisco (Roma), Politecnico di Milano ve Padova Üniversitesi 2024 yılını istedi. Başvurmadan önce kendi kurumunun şartnamesine bak."
          ]
        },
        official: {
          heading: "Resmi hesabı kim yapar?",
          body: [
            "Resmi değeri İtalya'da kurumun anlaşmalı olduğu CAF (vergi yardım merkezi) ya da burs kurumunun kendisi hesaplar. Türkiye'den alınan aile, gelir, tapu ve banka belgeleri İtalyancaya çevrilmiş ve apostilli olmalıdır. Bu sayfadaki sonuç yalnızca ön fikir verir."
          ]
        },
        limitsTitle: "2026/27 burs limitleri",
        limitsCaption: "Resmi şartnamelerden alınmıştır. Son doğrulama: {date}.",
        iseeLimit: "ISEE limiti",
        ispeLimit: "ISPE limiti",
        requestedYear: "İstenen yıl",
        sourceLink: "Resmi belge",
        sourcesTitle: "Kaynaklar",
        sourceLabels: {
          rates: "Banca d'Italia yıllık ortalama döviz kurları",
          dpcm: "DPCM 159/2013 (ISEE yönetmeliği)",
          unimi: "Università degli Studi di Milano: yurt dışı gelirli öğrencilerin değerlendirilmesi"
        }
      }
    },
```

- [ ] **Step 4: EN bloğunu değiştir**

`// 👇 ISEE Translations (English)` yorumundan sonraki `isee: { ... },` bloğunun TAMAMINI aşağıdakiyle değiştir:

```ts
    isee: {
      homeCardTitle: "Check your scholarship odds with ISEE Parificato",
      homeCardDesc: "If your family lives in Türkiye, scholarship offices calculate an ISEE Parificato. Enter income in TRY and homes in m² to see your estimate and where you stand against the limits of five major cities.",
      homeCardItems: ["Income (TRY)", "Home and property (m²)", "Savings and family"],
      homeCardBtn: "Start calculating"
    },
    iseeTool: {
      header: {
        back: "Back home",
        eyebrow: "ItalyPath ISEE",
        title: "ISEE Parificato calculator",
        subtitle: "If your family lives in Türkiye, Italian scholarship offices calculate an ISEE Parificato for you. Enter income in TRY and homes in m² to see your estimated ISEE and ISPE and where you stand against scholarship limits.",
        trust: ["Asks in TRY and m²", "Official rate, 2026/27 limits", "An estimate: a CAF issues the official value"]
      },
      nav: {
        stepWord: "Step",
        back: "Back",
        next: "Continue",
        calculate: "Calculate",
        edit: "Edit answers",
        restart: "Start over",
        yes: "Yes",
        no: "No",
        optional: "optional",
        increase: "Increase",
        decrease: "Decrease"
      },
      units: { lira: "TRY", euro: "€", sqm: "m²" },
      household: {
        title: "Family",
        heading: "How many people live in your home?",
        membersHint: "Including the student: mother, father, siblings and anyone else living in the same home.",
        childrenLabel: "How many of them are children?",
        childrenHint: "Children living with their parents, including the student.",
        minorsLabel: "Is any child under 18?",
        underThreeLabel: "Is any child under 3?",
        parentsWorkLabel: "Did both parents work at least 6 months in the year you will choose?",
        parentsWorkHint: "In a single-parent family, that parent working is enough.",
        specialToggle: "Special case: disabled family member",
        disabledLabel: "Disabled or care-dependent members",
        disabledHint: "Documented medium or severe disability. Leave 0 if none."
      },
      income: {
        title: "Year and income",
        yearHeading: "Which year's figures are you entering?",
        yearHint: "For 2026/27 applications Turin and Bologna asked for 2025; Milan, Rome and Padua asked for 2024. If unsure, choose 2025.",
        rateNote: "Official rate (Banca d'Italia {year} average): €1 = {rate} TRY",
        earnersHeading: "Add everyone in the family with income",
        earnersHint: "Total gross income for that year: before deductions, bonuses included. If you only know the net salary, divide it by 0.72 for a rough gross figure.",
        earnerTitle: "Earner {n}",
        kindLabel: "Income type",
        kinds: { employee: "Employee", pension: "Pensioner", other: "Other" },
        otherHint: "Other: self-employment, business profit, rental income.",
        amountLabel: "Yearly gross income",
        addEarner: "Add an earner",
        removeEarner: "Remove row"
      },
      property: {
        title: "Home and property",
        heading: "Who owns the home you live in?",
        tenure: {
          owned: "We own it",
          rented: "We rent it",
          free: "Someone else's home, rent-free"
        },
        sqmLabel: "Size of the home (gross m²)",
        mortgageLabel: "Remaining mortgage",
        mortgageHint: "Outstanding principal on 31 December {year}. Leave empty if none.",
        rentLabel: "Yearly rent",
        rentHint: "Total rent paid in {year}. A documented lease is deducted from income (up to €7,000).",
        sqmInfo: "Italy ignores the market value of the home. Every m² counts as a flat €500: {sqm} m² = {value}.",
        sqmInfoEmpty: "Italy ignores the market value of the home. Every m² counts as a flat €500. Example: 120 m² = €60,000.",
        homeExemptNote: "The first €52,500 of the home you live in is not counted.",
        otherHeading: "Do you own another home, shop or summer house?",
        otherHint: "Buildings registered to any family member. Land and fields are not counted.",
        otherSqmLabel: "Total size of the other buildings (gross m²)",
        otherMortgageLabel: "Remaining mortgage on these buildings",
        otherMortgageHint: "Leave empty if none."
      },
      savings: {
        title: "Savings",
        heading: "What were the family's total savings on 31 December {year}?",
        hint: "Current and deposit accounts, funds, shares and company stakes of all family members.",
        tryLabel: "Savings in TRY",
        tryHint: "Enter 0 if there are no savings.",
        eurLabel: "Foreign currency and gold (in euro)",
        eurHint: "If you hold dollar, euro or gold accounts, enter the approximate euro value. Leave empty if none."
      },
      errors: {
        choose: "Choose an option.",
        childrenExceedMembers: "Children cannot outnumber the people in the home.",
        earnersEmpty: "Add at least one earner.",
        earnerKind: "Choose the income type.",
        earnerAmount: "Enter the yearly gross income in TRY.",
        sqm: "Enter the gross m².",
        rent: "Enter the yearly rent in TRY.",
        savings: "Enter savings in TRY, or 0 if there are none.",
        summary: "Complete the marked fields before continuing."
      },
      result: {
        title: "Your estimate",
        lights: {
          blue: {
            label: "Blue light: you look comfortable",
            body: "Your estimates sit clearly below the scholarship limits of the five major cities. Even if the official figure differs a little, you will most likely stay under the limit."
          },
          yellow: {
            label: "Yellow light: you are borderline",
            body: "Your estimate is close to the scholarship limits. Exchange rate, year and document differences can move the official figure by a few thousand euro, and the city you choose can change the outcome."
          },
          red: {
            label: "Red light: you are above the limits",
            body: "With these figures a need-based regional scholarship looks unlikely. Tuition reductions and merit scholarships are assessed separately, and we can go through the options together."
          }
        },
        iseeLabel: "Estimated ISEE",
        iseeHint: "Income plus 20% of assets, divided by the family coefficient.",
        ispeLabel: "Estimated ISPE",
        ispeHint: "Assets only, divided by the family coefficient.",
        bindingIsee: "The income side (ISEE) decides your status.",
        bindingIspe: "The asset side (ISPE) decides your status: m² and savings matter most.",
        citiesTitle: "{year} scholarship limits in five cities",
        citiesHint: "Each city is compared with its own limits. Exceeding either the ISEE or the ISPE limit rules out the scholarship.",
        iseeShort: "ISEE",
        ispeShort: "ISPE",
        status: { below: "below", near: "borderline", above: "above" },
        worseNote: "Note: your position is harder than the overall picture in {cities}.",
        cityNames: { milano: "Milan", torino: "Turin", bologna: "Bologna", roma: "Rome", padova: "Padua" },
        disclaimerTitle: "This is an estimate",
        disclaimer: "Only an authorised CAF or the scholarship office in Italy calculates the official ISEE Parificato, using translated and apostilled documents from Türkiye. Offices may use a different year and rate, so a difference of a few thousand euro is normal.",
        scholarshipsLink: "Open the regional scholarship map"
      },
      breakdown: {
        toggle: "How did we calculate this?",
        rate: "Exchange rate ({year} average)",
        rateValue: "€1 = {rate} TRY",
        incomeTitle: "Income side (ISR)",
        totalIncome: "Total gross income",
        employeeDeduction: "Employee deduction (20%, up to €3,000 each)",
        pensionDeduction: "Pension deduction (20%, up to €1,000 each)",
        rentDeduction: "Rent deduction (up to {cap})",
        isr: "Income indicator (ISR)",
        assetsTitle: "Asset side (ISP)",
        homeValue: "Home you live in ({sqm} m² × €500)",
        homeMortgage: "Remaining mortgage",
        homeFranchise: "Home exemption",
        homeCounted: "Counted from the home (2/3 of the rest)",
        otherValue: "Other buildings ({sqm} m² × €500)",
        otherMortgage: "Mortgage on other buildings",
        savingsTotal: "Savings",
        savingsFranchise: "Savings exemption",
        savingsNet: "Counted from savings",
        isp: "Asset indicator (ISP)",
        scaleTitle: "Family coefficient",
        scaleBase: "Family of {members}",
        increments: {
          children3: "3 children",
          children4: "4 children",
          children5: "5 or more children",
          minorsWork: "Child under 18, parents working",
          underThreeWork: "Child under 3, parents working",
          disability: "Disabled member"
        },
        scaleTotal: "Total coefficient",
        formulaTitle: "Result",
        ise: "ISE = ISR + 20% × ISP",
        isee: "ISEE = ISE ÷ coefficient",
        ispe: "ISPE = ISP ÷ coefficient",
        shareTitle: "What drove the result?",
        shareIncome: "Share from income",
        shareAssets: "Share from assets"
      },
      explainer: {
        title: "What is ISEE Parificato and how is it calculated?",
        what: {
          heading: "What is ISEE Parificato?",
          body: [
            "ISEE is the indicator Italy uses to reduce a family's economic situation to a single figure for scholarships and tuition reductions. A regular ISEE cannot be issued for students whose family lives and earns outside Italy; an ISEE Parificato, built on the same logic, is used instead. Some scholarship offices call it ISEEUP."
          ]
        },
        how: {
          heading: "How is it calculated?",
          bullets: [
            "The family's yearly gross income is converted to euro at the Banca d'Italia average rate for that year.",
            "Homes abroad are not valued at market price but at a flat €500 per m². Land is not counted, and the remaining mortgage is deducted.",
            "Bank savings on 31 December are converted at the same rate.",
            "The exemptions of Italian law (DPCM 159/2013) apply: the first €52,500 of the home you live in, the first €6,000-10,000 of savings, part of salary and pension income, and documented rent.",
            "ISEE = (income + 20% of assets) ÷ family coefficient. The larger the family, the higher the coefficient and the lower the ISEE."
          ]
        },
        difference: {
          heading: "ISEE versus ISPE",
          body: [
            "Scholarships have two separate limits. ISEE measures income and assets together; ISPE measures assets only (assets ÷ family coefficient). Exceeding either one rules out the scholarship.",
            "Families applying from Türkiye with modest income but several properties usually hit the ISPE limit."
          ]
        },
        year: {
          heading: "Which year's income is requested?",
          body: [
            "It depends on the office. For 2026/27 applications EDISU Piemonte (Turin) and ER.GO (Bologna) asked non-EU students for 2025; LazioDisco (Rome), Politecnico di Milano and the University of Padua asked for 2024. Check your own office's call before applying."
          ]
        },
        official: {
          heading: "Who calculates the official value?",
          body: [
            "In Italy, the official value is calculated by the CAF (tax assistance centre) working with the office, or by the scholarship office itself. Family, income, property and bank documents from Türkiye must be translated into Italian and apostilled. The result on this page is only a first indication."
          ]
        },
        limitsTitle: "2026/27 scholarship limits",
        limitsCaption: "Taken from the official calls. Last verified: {date}.",
        iseeLimit: "ISEE limit",
        ispeLimit: "ISPE limit",
        requestedYear: "Requested year",
        sourceLink: "Official document",
        sourcesTitle: "Sources",
        sourceLabels: {
          rates: "Banca d'Italia yearly average exchange rates",
          dpcm: "DPCM 159/2013 (ISEE regulation)",
          unimi: "Università degli Studi di Milano: assessing students with income abroad"
        }
      }
    },
```

- [ ] **Step 5: Ana sayfa kartını çeviriye bağla**

`components/IseeSection.tsx` içinde `const { t, language } = useLanguage();` ve onu izleyen `const items = language === "tr" ? [...] : [...];` bloğunu şununla değiştir:

```tsx
  const { t } = useLanguage();
  const items = t.isee.homeCardItems;
```

- [ ] **Step 6: Eski anahtarların başka yerde kullanılmadığını doğrula**

Run: `grep -rn "isee\.\(title\|subtitle\|incomeLabel\|assetsLabel\|familyLabel\|calculateBtn\|resultTitle\|disclaimer\|homeCardBadge\|person\)" app components lib --include="*.ts" --include="*.tsx" | grep -v "lib/translations.ts"`
Expected: çıktı yok. Çıktı varsa o kullanım yeni anahtarlara taşınır.

- [ ] **Step 7: Testler**

Run: `npm run check:isee && npx tsc --noEmit -p tsconfig.json && npm run check:editorial-ui`
Expected: üçü de hatasız. (Eski `IseeCalculatorClient.tsx` kendi `COPY` nesnesini kullandığı için derlenmeye devam eder.)

- [ ] **Step 8: Commit**

```bash
git add lib/translations.ts components/IseeSection.tsx scripts/check-isee-calculator.mjs
git commit -m "feat(isee): TR/EN copy for the Parificato wizard and home card"
```

---

### Task 5: Biçimlendirme yardımcıları ve form alanları (`components/isee/format.ts`, `components/isee/fields.tsx`)

**Files:**
- Create: `components/isee/format.ts`, `components/isee/fields.tsx`
- Modify: `scripts/check-isee-calculator.mjs` (yeni bölüm)

**Interfaces:**
- Produces (`format.ts`): `Language = "tr" | "en"`, `fill(template, vars)`, `formatAmount(value, language, digits?)`, `formatEuro(value, language, digits?)`, `parseDigits(raw, maxDigits?)`. `Intl` kullanılmaz: sunucu ve tarayıcı çıktısı birebir aynı olmalı (hydration).
- Produces (`fields.tsx`): `FieldHint`, `FieldError`, `QuestionLabel`, `ChoiceChips<T>`, `NumberChips`, `YesNo`, `MoneyField`.

- [ ] **Step 1: Test bölümünü ekle (başarısız olacak)**

`scripts/check-isee-calculator.mjs` içinde son `console.log` satırının hemen ÜSTÜNE ekle:

<!-- APPEND: scripts/check-isee-calculator.mjs -->
```js
// ---------------------------------------------------------------------------
// 5) Biçimlendirme yardımcıları
// ---------------------------------------------------------------------------
const format = await importTs("components/isee/format.ts");

assert.equal(format.fill("{sqm} m² = {value}", { sqm: 120, value: "60.000 €" }), "120 m² = 60.000 €");
assert.equal(format.fill("{missing} stays", {}), "{missing} stays", "unknown placeholders are left untouched");
assert.equal(format.formatAmount(1_250_000, "tr"), "1.250.000");
assert.equal(format.formatAmount(1_250_000, "en"), "1,250,000");
assert.equal(format.formatAmount(44.8161, "tr", 4), "44,8161");
assert.equal(format.formatAmount(44.8161, "en", 4), "44.8161");
assert.equal(format.formatAmount(999.5, "tr"), "1.000", "rounds to whole units by default");
assert.equal(format.formatAmount(-1_500, "tr"), "-1.500");
assert.equal(format.formatEuro(26_887.93, "tr"), "26.888 €");
assert.equal(format.formatEuro(26_887.93, "en"), "€26,888");
assert.equal(format.formatEuro(26_887.93, "tr", 2), "26.887,93 €");
assert.equal(format.parseDigits("1.250.000"), 1_250_000);
assert.equal(format.parseDigits("12abc3"), 123);
assert.equal(format.parseDigits(""), null);
assert.equal(format.parseDigits("abc"), null);
assert.equal(format.parseDigits("12345", 3), 123, "input length is capped");
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm run check:isee`
Expected: FAIL — `components/isee/format.ts must exist before ISEE checks can run`

- [ ] **Step 3: Biçimlendirme yardımcılarını yaz**

<!-- FILE: components/isee/format.ts -->
```ts
// ISEE aracı için deterministik biçimlendirme. Intl kullanılmaz: sunucu (Node ICU) ile tarayıcı çıktısı
// birebir aynı olmalı, aksi halde sunucu HTML'indeki limit rakamları hydration uyarısı üretir.

export type Language = "tr" | "en";

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export function formatAmount(value: number, language: Language, digits = 0): string {
  const safe = Number.isFinite(value) ? value : 0;
  const [integerPart, fractionPart] = Math.abs(safe).toFixed(digits).split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, language === "tr" ? "." : ",");
  const decimal = fractionPart ? `${language === "tr" ? "," : "."}${fractionPart}` : "";
  const sign = safe < 0 && Number(Math.abs(safe).toFixed(digits)) !== 0 ? "-" : "";
  return `${sign}${grouped}${decimal}`;
}

export function formatEuro(value: number, language: Language, digits = 0): string {
  const amount = formatAmount(value, language, digits);
  return language === "tr" ? `${amount} €` : `€${amount}`;
}

export function parseDigits(raw: string, maxDigits = 12): number | null {
  const digits = raw.replace(/\D/g, "").slice(0, maxDigits);
  return digits === "" ? null : Number(digits);
}
```

- [ ] **Step 4: Testin geçtiğini gör**

Run: `npm run check:isee`
Expected: `ISEE Parificato checks passed`

- [ ] **Step 5: Form alanı bileşenlerini yaz**

<!-- FILE: components/isee/fields.tsx -->
```tsx
"use client";

import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

import { formatAmount, parseDigits, type Language } from "@/components/isee/format";

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]";

export function FieldHint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-sm leading-6 text-[var(--editorial-muted)]">
      {children}
    </p>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm font-semibold text-[#8b321a]">
      {message}
    </p>
  );
}

export function QuestionLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-base font-semibold leading-6 text-[var(--editorial-ink)]">
      {children}
    </p>
  );
}

function Chip({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`min-h-11 min-w-11 border px-4 text-sm font-semibold transition-colors active:translate-y-[1px] ${FOCUS_RING} ${
        selected
          ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white"
          : "border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-ink)] hover:bg-[var(--editorial-sage-soft)]"
      }`}
    >
      {label}
    </button>
  );
}

interface ChoiceChipsProps<T extends string | number> {
  id: string;
  label: string;
  hint?: string;
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
}

export function ChoiceChips<T extends string | number>({
  id,
  label,
  hint,
  options,
  value,
  onChange,
  error,
}: ChoiceChipsProps<T>) {
  return (
    <div>
      <QuestionLabel id={`${id}-label`}>{label}</QuestionLabel>
      {hint ? <FieldHint id={`${id}-hint`}>{hint}</FieldHint> : null}
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-3 flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <Chip
            key={String(option.value)}
            label={option.label}
            selected={value === option.value}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

interface NumberChipsProps {
  id: string;
  label: string;
  hint?: string;
  min: number;
  // Çip olarak gösterilen son sayı; bir üstü "N+" çipidir ve artır/azalt düğmeleriyle devam eder.
  max: number;
  hardMax?: number;
  value: number | null;
  onChange: (value: number) => void;
  increaseLabel: string;
  decreaseLabel: string;
  error?: string;
}

export function NumberChips({
  id,
  label,
  hint,
  min,
  max,
  hardMax = 20,
  value,
  onChange,
  increaseLabel,
  decreaseLabel,
  error,
}: NumberChipsProps) {
  const moreFrom = max + 1;
  const isMore = value !== null && value >= moreFrom;
  const numbers = Array.from({ length: max - min + 1 }, (_, index) => min + index);

  return (
    <div>
      <QuestionLabel id={`${id}-label`}>{label}</QuestionLabel>
      {hint ? <FieldHint id={`${id}-hint`}>{hint}</FieldHint> : null}
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-3 flex flex-wrap gap-2"
      >
        {numbers.map((number) => (
          <Chip key={number} label={String(number)} selected={value === number} onSelect={() => onChange(number)} />
        ))}
        <Chip label={`${moreFrom}+`} selected={isMore} onSelect={() => onChange(isMore && value ? value : moreFrom)} />
      </div>
      {isMore && value !== null ? (
        <div className="mt-3 inline-flex items-center border border-[var(--editorial-border)] bg-white">
          <button
            type="button"
            aria-label={decreaseLabel}
            onClick={() => onChange(Math.max(moreFrom, value - 1))}
            className={`flex h-11 w-11 items-center justify-center text-[var(--editorial-sage)] hover:bg-[var(--editorial-sage-soft)] ${FOCUS_RING}`}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <output
            aria-live="polite"
            className="min-w-12 border-x border-[var(--editorial-border)] px-3 text-center text-base font-semibold tabular-nums text-[var(--editorial-ink)]"
          >
            {value}
          </output>
          <button
            type="button"
            aria-label={increaseLabel}
            onClick={() => onChange(Math.min(hardMax, value + 1))}
            className={`flex h-11 w-11 items-center justify-center text-[var(--editorial-sage)] hover:bg-[var(--editorial-sage-soft)] ${FOCUS_RING}`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

interface YesNoProps {
  id: string;
  label: string;
  hint?: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  yes: string;
  no: string;
  error?: string;
}

export function YesNo({ id, label, hint, value, onChange, yes, no, error }: YesNoProps) {
  return (
    <ChoiceChips<"yes" | "no">
      id={id}
      label={label}
      hint={hint}
      options={[
        { value: "yes", label: yes },
        { value: "no", label: no },
      ]}
      value={value === null ? null : value ? "yes" : "no"}
      onChange={(next) => onChange(next === "yes")}
      error={error}
    />
  );
}

interface MoneyFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix: string;
  language: Language;
  optionalLabel?: string;
  maxDigits?: number;
  error?: string;
}

export function MoneyField({
  id,
  label,
  hint,
  value,
  onChange,
  suffix,
  language,
  optionalLabel,
  maxDigits = 12,
  error,
}: MoneyFieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-base font-semibold leading-6 text-[var(--editorial-ink)]">
        {label}
        {optionalLabel ? (
          <span className="ml-2 text-sm font-normal text-[var(--editorial-muted)]">({optionalLabel})</span>
        ) : null}
      </label>
      {hint ? <FieldHint id={`${id}-hint`}>{hint}</FieldHint> : null}
      <div
        className={`mt-2 flex items-center border bg-white focus-within:ring-2 focus-within:ring-[var(--editorial-sage-soft)] ${
          error
            ? "border-[#b3401f]"
            : "border-[var(--editorial-border)] focus-within:border-[var(--editorial-sage)]"
        }`}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value === null ? "" : formatAmount(value, language)}
          onChange={(event) => onChange(parseDigits(event.target.value, maxDigits))}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-right text-base font-semibold tabular-nums text-[var(--editorial-ink)] outline-none"
        />
        <span className="flex h-12 min-w-12 items-center justify-center border-l border-[var(--editorial-border)] px-3 text-sm font-semibold text-[var(--editorial-muted)]">
          {suffix}
        </span>
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
```

- [ ] **Step 6: Lint ve tip kontrolü**

Run: `npx eslint components/isee/format.ts components/isee/fields.tsx && npx tsc --noEmit -p tsconfig.json`
Expected: hata yok.

- [ ] **Step 7: Commit**

```bash
git add components/isee/format.ts components/isee/fields.tsx scripts/check-isee-calculator.mjs
git commit -m "feat(isee): deterministic formatters and accessible wizard fields"
```

---

### Task 6: Adım bileşenleri (`components/isee/steps/*`)

**Files:**
- Create: `components/isee/steps/types.ts`, `HouseholdStep.tsx`, `IncomeStep.tsx`, `PropertyStep.tsx`, `SavingsStep.tsx`

**Interfaces:**
- Consumes: `fields.tsx` bileşenleri, `fill/formatAmount/formatEuro` (`format.ts`), `IseeFormState/StepErrors/EarnerForm/MAX_EARNERS/nextEarnerId` (`wizardState.ts`), `REFERENCE_YEARS/TRY_PER_EUR/ReferenceYear` (`reference.ts`), `SQM_VALUE_EUR` (`parificato.ts`), `WizardOptionCard` (`components/onboarding`), `t.iseeTool.*`.
- Produces: her adım `export default function XStep(props: StepProps)`; `StepProps = { form, update(patch), errors, language }`.

- [ ] **Step 1: Ortak tip**

<!-- FILE: components/isee/steps/types.ts -->
```ts
import type { Language } from "@/components/isee/format";
import type { IseeFormState, StepErrors } from "@/lib/isee/wizardState";

export interface StepProps {
  form: IseeFormState;
  update: (patch: Partial<IseeFormState>) => void;
  errors: StepErrors;
  language: Language;
}
```

- [ ] **Step 2: Aile adımı**

<!-- FILE: components/isee/steps/HouseholdStep.tsx -->
```tsx
"use client";

import { NumberChips, YesNo } from "@/components/isee/fields";
import type { StepProps } from "@/components/isee/steps/types";
import { useLanguage } from "@/context/LanguageContext";

export default function HouseholdStep({ form, update, errors }: StepProps) {
  const { t } = useLanguage();
  const copy = t.iseeTool.household;
  const nav = t.iseeTool.nav;
  const messages = t.iseeTool.errors;
  const errorFor = (field: string) => (errors[field] ? messages[errors[field]] : undefined);
  const hasChildren = (form.children ?? 0) > 0;

  return (
    <div className="space-y-8">
      <NumberChips
        id="isee-members"
        label={copy.heading}
        hint={copy.membersHint}
        min={1}
        max={6}
        value={form.members}
        onChange={(members) => update({ members })}
        increaseLabel={nav.increase}
        decreaseLabel={nav.decrease}
        error={errorFor("members")}
      />

      <NumberChips
        id="isee-children"
        label={copy.childrenLabel}
        hint={copy.childrenHint}
        min={0}
        max={5}
        value={form.children}
        onChange={(children) =>
          update(
            children === 0
              ? { children, hasMinorChildren: null, hasChildUnderThree: null, parentsWork: null }
              : { children },
          )
        }
        increaseLabel={nav.increase}
        decreaseLabel={nav.decrease}
        error={errorFor("children")}
      />

      {hasChildren ? (
        <YesNo
          id="isee-minors"
          label={copy.minorsLabel}
          value={form.hasMinorChildren}
          onChange={(hasMinorChildren) =>
            update(
              hasMinorChildren
                ? { hasMinorChildren }
                : { hasMinorChildren, hasChildUnderThree: null, parentsWork: null },
            )
          }
          yes={nav.yes}
          no={nav.no}
          error={errorFor("hasMinorChildren")}
        />
      ) : null}

      {hasChildren && form.hasMinorChildren ? (
        <>
          <YesNo
            id="isee-under-three"
            label={copy.underThreeLabel}
            value={form.hasChildUnderThree}
            onChange={(hasChildUnderThree) => update({ hasChildUnderThree })}
            yes={nav.yes}
            no={nav.no}
            error={errorFor("hasChildUnderThree")}
          />
          <YesNo
            id="isee-parents-work"
            label={copy.parentsWorkLabel}
            hint={copy.parentsWorkHint}
            value={form.parentsWork}
            onChange={(parentsWork) => update({ parentsWork })}
            yes={nav.yes}
            no={nav.no}
            error={errorFor("parentsWork")}
          />
        </>
      ) : null}

      <details className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)]">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]">
          {copy.specialToggle}
        </summary>
        <div className="border-t border-[var(--editorial-border)] p-4">
          <NumberChips
            id="isee-disabled"
            label={copy.disabledLabel}
            hint={copy.disabledHint}
            min={0}
            max={3}
            hardMax={10}
            value={form.disabledMembers}
            onChange={(disabledMembers) => update({ disabledMembers })}
            increaseLabel={nav.increase}
            decreaseLabel={nav.decrease}
          />
        </div>
      </details>
    </div>
  );
}
```

- [ ] **Step 3: Yıl ve gelir adımı**

<!-- FILE: components/isee/steps/IncomeStep.tsx -->
```tsx
"use client";

import { Plus, Trash2 } from "lucide-react";

import { ChoiceChips, FieldError, FieldHint, MoneyField, QuestionLabel } from "@/components/isee/fields";
import { fill, formatAmount } from "@/components/isee/format";
import type { StepProps } from "@/components/isee/steps/types";
import { useLanguage } from "@/context/LanguageContext";
import type { EarnerKind } from "@/lib/isee/parificato";
import { REFERENCE_YEARS, TRY_PER_EUR, type ReferenceYear } from "@/lib/isee/reference";
import { MAX_EARNERS, nextEarnerId, type EarnerForm } from "@/lib/isee/wizardState";

const EARNER_KINDS: EarnerKind[] = ["employee", "pension", "other"];

export default function IncomeStep({ form, update, errors, language }: StepProps) {
  const { t } = useLanguage();
  const copy = t.iseeTool.income;
  const units = t.iseeTool.units;
  const messages = t.iseeTool.errors;
  const errorFor = (field: string) => (errors[field] ? messages[errors[field]] : undefined);

  const setEarner = (id: number, patch: Partial<EarnerForm>) =>
    update({ earners: form.earners.map((earner) => (earner.id === id ? { ...earner, ...patch } : earner)) });
  const addEarner = () =>
    update({ earners: [...form.earners, { id: nextEarnerId(form.earners), kind: null, grossTry: null }] });
  const removeEarner = (id: number) => update({ earners: form.earners.filter((earner) => earner.id !== id) });

  return (
    <div className="space-y-8">
      <div>
        <ChoiceChips<ReferenceYear>
          id="isee-year"
          label={copy.yearHeading}
          hint={copy.yearHint}
          options={REFERENCE_YEARS.map((year) => ({ value: year, label: String(year) }))}
          value={form.referenceYear}
          onChange={(referenceYear) => update({ referenceYear })}
        />
        <p className="mt-3 border-l-2 border-[var(--editorial-sage)] pl-3 text-sm leading-6 text-[var(--editorial-muted)]">
          {fill(copy.rateNote, {
            year: form.referenceYear,
            rate: formatAmount(TRY_PER_EUR[form.referenceYear], language, 4),
          })}
        </p>
      </div>

      <div>
        <QuestionLabel id="isee-earners-label">{copy.earnersHeading}</QuestionLabel>
        <FieldHint>{copy.earnersHint}</FieldHint>
        <FieldHint>{copy.otherHint}</FieldHint>

        <div className="mt-4 space-y-4">
          {form.earners.map((earner, index) => (
            <fieldset
              key={earner.id}
              className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)] p-4"
            >
              <legend className="px-1 text-sm font-semibold text-[var(--editorial-muted)]">
                {fill(copy.earnerTitle, { n: index + 1 })}
              </legend>
              <ChoiceChips<EarnerKind>
                id={`isee-earner-${earner.id}-kind`}
                label={copy.kindLabel}
                options={EARNER_KINDS.map((kind) => ({ value: kind, label: copy.kinds[kind] }))}
                value={earner.kind}
                onChange={(kind) => setEarner(earner.id, { kind })}
                error={errorFor(`earner-${earner.id}-kind`)}
              />
              <div className="mt-5">
                <MoneyField
                  id={`isee-earner-${earner.id}-amount`}
                  label={copy.amountLabel}
                  value={earner.grossTry}
                  onChange={(grossTry) => setEarner(earner.id, { grossTry })}
                  suffix={units.lira}
                  language={language}
                  error={errorFor(`earner-${earner.id}-amount`)}
                />
              </div>
              {form.earners.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeEarner(earner.id)}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#8b321a] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {copy.removeEarner}
                </button>
              ) : null}
            </fieldset>
          ))}
        </div>

        <FieldError id="isee-earners-error" message={errorFor("earners")} />

        {form.earners.length < MAX_EARNERS ? (
          <button
            type="button"
            onClick={addEarner}
            className="mt-4 inline-flex min-h-11 items-center gap-2 border border-[var(--editorial-sage)] px-4 text-sm font-semibold text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {copy.addEarner}
          </button>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Ev ve mülk adımı**

<!-- FILE: components/isee/steps/PropertyStep.tsx -->
```tsx
"use client";

import { Info } from "lucide-react";

import { FieldError, MoneyField, QuestionLabel, YesNo } from "@/components/isee/fields";
import { fill, formatAmount, formatEuro } from "@/components/isee/format";
import type { StepProps } from "@/components/isee/steps/types";
import WizardOptionCard from "@/components/onboarding/WizardOptionCard";
import { useLanguage } from "@/context/LanguageContext";
import { SQM_VALUE_EUR } from "@/lib/isee/parificato";
import type { Tenure } from "@/lib/isee/wizardState";

const TENURES: Tenure[] = ["owned", "rented", "free"];

function InfoBox({ children }: { children: string }) {
  return (
    <p className="flex gap-2 border border-[#b9cde0] bg-[#e6eef5] p-3 text-sm leading-6 text-[#1d4568]">
      <Info className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export default function PropertyStep({ form, update, errors, language }: StepProps) {
  const { t } = useLanguage();
  const copy = t.iseeTool.property;
  const nav = t.iseeTool.nav;
  const units = t.iseeTool.units;
  const messages = t.iseeTool.errors;
  const errorFor = (field: string) => (errors[field] ? messages[errors[field]] : undefined);

  const sqmInfo = (sqm: number | null) =>
    sqm && sqm > 0
      ? fill(copy.sqmInfo, {
          sqm: formatAmount(sqm, language),
          value: formatEuro(sqm * SQM_VALUE_EUR, language),
        })
      : copy.sqmInfoEmpty;

  return (
    <div className="space-y-8">
      <div>
        <QuestionLabel id="isee-tenure-label">{copy.heading}</QuestionLabel>
        <div role="radiogroup" aria-labelledby="isee-tenure-label" className="mt-3 grid gap-2">
          {TENURES.map((tenure) => (
            <WizardOptionCard
              key={tenure}
              label={copy.tenure[tenure]}
              selected={form.tenure === tenure}
              onToggle={() => update({ tenure })}
            />
          ))}
        </div>
        <FieldError id="isee-tenure-error" message={errorFor("tenure")} />
      </div>

      {form.tenure === "owned" ? (
        <div className="space-y-5">
          <MoneyField
            id="isee-home-sqm"
            label={copy.sqmLabel}
            value={form.homeSqm}
            onChange={(homeSqm) => update({ homeSqm })}
            suffix={units.sqm}
            language={language}
            maxDigits={5}
            error={errorFor("homeSqm")}
          />
          <InfoBox>{`${sqmInfo(form.homeSqm)} ${copy.homeExemptNote}`}</InfoBox>
          <MoneyField
            id="isee-home-mortgage"
            label={copy.mortgageLabel}
            hint={fill(copy.mortgageHint, { year: form.referenceYear })}
            value={form.homeMortgageTry}
            onChange={(homeMortgageTry) => update({ homeMortgageTry })}
            suffix={units.lira}
            language={language}
            optionalLabel={nav.optional}
          />
        </div>
      ) : null}

      {form.tenure === "rented" ? (
        <MoneyField
          id="isee-rent"
          label={copy.rentLabel}
          hint={fill(copy.rentHint, { year: form.referenceYear })}
          value={form.annualRentTry}
          onChange={(annualRentTry) => update({ annualRentTry })}
          suffix={units.lira}
          language={language}
          error={errorFor("annualRentTry")}
        />
      ) : null}

      <YesNo
        id="isee-other-buildings"
        label={copy.otherHeading}
        hint={copy.otherHint}
        value={form.hasOtherBuildings}
        onChange={(hasOtherBuildings) => update({ hasOtherBuildings })}
        yes={nav.yes}
        no={nav.no}
        error={errorFor("hasOtherBuildings")}
      />

      {form.hasOtherBuildings ? (
        <div className="space-y-5">
          <MoneyField
            id="isee-other-sqm"
            label={copy.otherSqmLabel}
            value={form.otherSqm}
            onChange={(otherSqm) => update({ otherSqm })}
            suffix={units.sqm}
            language={language}
            maxDigits={5}
            error={errorFor("otherSqm")}
          />
          <InfoBox>{sqmInfo(form.otherSqm)}</InfoBox>
          <MoneyField
            id="isee-other-mortgage"
            label={copy.otherMortgageLabel}
            hint={copy.otherMortgageHint}
            value={form.otherMortgageTry}
            onChange={(otherMortgageTry) => update({ otherMortgageTry })}
            suffix={units.lira}
            language={language}
            optionalLabel={nav.optional}
          />
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Birikim adımı**

<!-- FILE: components/isee/steps/SavingsStep.tsx -->
```tsx
"use client";

import { FieldHint, MoneyField, QuestionLabel } from "@/components/isee/fields";
import { fill } from "@/components/isee/format";
import type { StepProps } from "@/components/isee/steps/types";
import { useLanguage } from "@/context/LanguageContext";

export default function SavingsStep({ form, update, errors, language }: StepProps) {
  const { t } = useLanguage();
  const copy = t.iseeTool.savings;
  const nav = t.iseeTool.nav;
  const units = t.iseeTool.units;
  const messages = t.iseeTool.errors;
  const errorFor = (field: string) => (errors[field] ? messages[errors[field]] : undefined);

  return (
    <div className="space-y-8">
      <div>
        <QuestionLabel id="isee-savings-label">{fill(copy.heading, { year: form.referenceYear })}</QuestionLabel>
        <FieldHint>{copy.hint}</FieldHint>
      </div>
      <MoneyField
        id="isee-savings-try"
        label={copy.tryLabel}
        hint={copy.tryHint}
        value={form.savingsTry}
        onChange={(savingsTry) => update({ savingsTry })}
        suffix={units.lira}
        language={language}
        error={errorFor("savingsTry")}
      />
      <MoneyField
        id="isee-savings-eur"
        label={copy.eurLabel}
        hint={copy.eurHint}
        value={form.savingsEur}
        onChange={(savingsEur) => update({ savingsEur })}
        suffix={units.euro}
        language={language}
        optionalLabel={nav.optional}
        maxDigits={9}
      />
    </div>
  );
}
```

- [ ] **Step 6: Lint ve tip kontrolü**

Run: `npx eslint components/isee && npx tsc --noEmit -p tsconfig.json`
Expected: hata yok.

- [ ] **Step 7: Commit**

```bash
git add components/isee/steps
git commit -m "feat(isee): four wizard steps asking in TRY and square metres"
```

---

### Task 7: Sonuç ekranı ve sihirbaz (`components/isee/IseeResult.tsx`, `components/isee/IseeWizard.tsx`)

**Files:**
- Create: `components/isee/IseeResult.tsx`, `components/isee/IseeWizard.tsx`

**Interfaces:**
- Consumes: Task 1-6 çıktıları; `WizardProgress` (`components/onboarding`).
- Produces: `IseeWizard` (prop almaz, default export); `IseeResult` props: `{ result: ParificatoResult; verdict: Verdict<CityKey>; referenceYear: ReferenceYear; language: Language; headingRef: RefObject<HTMLHeadingElement | null>; onEdit(): void; onRestart(): void }`.
- Her iki görünümde de kart başlığı `id="isee-wizard-heading"` taşır (kartın `aria-labelledby` hedefi).

- [ ] **Step 1: Sonuç ekranı**

<!-- FILE: components/isee/IseeResult.tsx -->
```tsx
"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";

import { fill, formatAmount, formatEuro, type Language } from "@/components/isee/format";
import { useLanguage } from "@/context/LanguageContext";
import type { ParificatoResult } from "@/lib/isee/parificato";
import {
  CITY_THRESHOLDS,
  THRESHOLDS_ACADEMIC_YEAR,
  type CityKey,
  type ReferenceYear,
} from "@/lib/isee/reference";
import type { CityStatus, Light, Verdict } from "@/lib/isee/verdict";

interface IseeResultProps {
  result: ParificatoResult;
  verdict: Verdict<CityKey>;
  referenceYear: ReferenceYear;
  language: Language;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: () => void;
  onRestart: () => void;
}

const LIGHT_STYLES: Record<Light, { box: string; dot: string; text: string }> = {
  blue: { box: "border-[#b9cde0] bg-[#e6eef5]", dot: "bg-[#2f6ea5]", text: "text-[#1d4568]" },
  yellow: { box: "border-[#e4cd8a] bg-[#f7edd0]", dot: "bg-[#c99700]", text: "text-[#6b4e00]" },
  red: { box: "border-[#e8c9bd] bg-[#f5d9cf]", dot: "bg-[#b3401f]", text: "text-[#8b321a]" },
};

const LIGHT_ICONS: Record<Light, LucideIcon> = { blue: CheckCircle2, yellow: AlertTriangle, red: XCircle };

const STATUS_STYLES: Record<CityStatus, string> = {
  below: "text-[#1d4568]",
  near: "text-[#6b4e00]",
  above: "text-[#8b321a]",
};

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-[var(--editorial-border)] px-3 py-2 last:border-b-0 ${
        strong
          ? "bg-[var(--editorial-sage-soft)]/55 font-semibold text-[var(--editorial-ink)]"
          : "text-[var(--editorial-muted)]"
      }`}
    >
      <span className="min-w-0 text-sm leading-5">{label}</span>
      <span className="shrink-0 text-sm tabular-nums">{value}</span>
    </div>
  );
}

function RowGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-[var(--editorial-ink)]">{title}</h4>
      <div className="border border-[var(--editorial-border)] bg-white">{children}</div>
    </div>
  );
}

export default function IseeResult({
  result,
  verdict,
  referenceYear,
  language,
  headingRef,
  onEdit,
  onRestart,
}: IseeResultProps) {
  const { t } = useLanguage();
  const copy = t.iseeTool.result;
  const rows = t.iseeTool.breakdown;
  const nav = t.iseeTool.nav;

  const euro = (value: number) => formatEuro(value, language);
  const minus = (value: number) => (value > 0 ? `-${euro(value)}` : euro(0));
  const light = LIGHT_STYLES[verdict.light];
  const LightIcon = LIGHT_ICONS[verdict.light];

  const bindingNote =
    verdict.iseeLight === verdict.ispeLight
      ? null
      : verdict.light === verdict.iseeLight
        ? copy.bindingIsee
        : copy.bindingIspe;
  const worseNote =
    verdict.worseCities.length > 0
      ? fill(copy.worseNote, { cities: verdict.worseCities.map((key) => copy.cityNames[key]).join(", ") })
      : null;

  const incomePercent = Math.round(result.incomeShare * 100);
  const assetPercent = 100 - incomePercent;

  return (
    <div className="p-5 sm:p-8">
      <h2
        id="isee-wizard-heading"
        ref={headingRef}
        tabIndex={-1}
        className="font-serif text-3xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] outline-none"
      >
        {copy.title}
      </h2>

      <div className={`mt-6 border p-4 ${light.box}`}>
        <div className={`flex items-center gap-3 ${light.text}`}>
          <span className={`h-3 w-3 shrink-0 rounded-full ${light.dot}`} aria-hidden="true" />
          <LightIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-base font-semibold leading-6">{copy.lights[verdict.light].label}</p>
        </div>
        <p className={`mt-2 text-sm leading-6 ${light.text}`}>{copy.lights[verdict.light].body}</p>
        {bindingNote ? <p className={`mt-2 text-sm font-semibold leading-6 ${light.text}`}>{bindingNote}</p> : null}
        {worseNote ? <p className={`mt-2 text-sm font-semibold leading-6 ${light.text}`}>{worseNote}</p> : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)] p-4">
          <p className="text-sm font-semibold text-[var(--editorial-muted)]">{copy.iseeLabel}</p>
          <p className="mt-1 font-serif text-4xl tracking-[-0.02em] text-[var(--editorial-sage)] tabular-nums">
            {euro(result.isee)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--editorial-muted)]">{copy.iseeHint}</p>
        </div>
        <div className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)] p-4">
          <p className="text-sm font-semibold text-[var(--editorial-muted)]">{copy.ispeLabel}</p>
          <p className="mt-1 font-serif text-4xl tracking-[-0.02em] text-[var(--editorial-sage)] tabular-nums">
            {euro(result.ispe)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--editorial-muted)]">{copy.ispeHint}</p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold text-[var(--editorial-ink)]">
          {fill(copy.citiesTitle, { year: THRESHOLDS_ACADEMIC_YEAR })}
        </h3>
        <p className="mt-1 text-sm leading-6 text-[var(--editorial-muted)]">{copy.citiesHint}</p>
        <ul className="mt-3 divide-y divide-[var(--editorial-border)] border border-[var(--editorial-border)] bg-white">
          {CITY_THRESHOLDS.map((city) => {
            const status = verdict.cities.find((item) => item.key === city.key)?.status ?? "near";
            return (
              <li key={city.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--editorial-ink)]">{copy.cityNames[city.key]}</p>
                  <p className="text-xs leading-5 text-[var(--editorial-muted)] tabular-nums">
                    {copy.iseeShort} {euro(city.iseeLimit)} · {copy.ispeShort} {euro(city.ispeLimit)}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${STATUS_STYLES[status]}`}>{copy.status[status]}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <details className="mt-8 border border-[var(--editorial-border)] bg-[var(--editorial-paper)]">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]">
          {rows.toggle}
        </summary>
        <div className="space-y-6 border-t border-[var(--editorial-border)] p-4">
          <RowGroup title={rows.incomeTitle}>
            <Row
              label={fill(rows.rate, { year: referenceYear })}
              value={fill(rows.rateValue, { rate: formatAmount(result.rate, language, 4) })}
            />
            <Row label={rows.totalIncome} value={euro(result.totalIncome)} />
            {result.employeeDeduction > 0 ? (
              <Row label={rows.employeeDeduction} value={minus(result.employeeDeduction)} />
            ) : null}
            {result.pensionDeduction > 0 ? (
              <Row label={rows.pensionDeduction} value={minus(result.pensionDeduction)} />
            ) : null}
            {result.rentDeduction > 0 ? (
              <Row
                label={fill(rows.rentDeduction, { cap: euro(result.rentCap) })}
                value={minus(result.rentDeduction)}
              />
            ) : null}
            <Row label={rows.isr} value={euro(result.isr)} strong />
          </RowGroup>

          <RowGroup title={rows.assetsTitle}>
            {result.homeSqm > 0 ? (
              <>
                <Row
                  label={fill(rows.homeValue, { sqm: formatAmount(result.homeSqm, language) })}
                  value={euro(result.homeValue)}
                />
                {result.homeMortgage > 0 ? <Row label={rows.homeMortgage} value={minus(result.homeMortgage)} /> : null}
                <Row label={rows.homeFranchise} value={minus(result.homeFranchise)} />
                <Row label={rows.homeCounted} value={euro(result.homeCounted)} />
              </>
            ) : null}
            {result.otherBuildingsSqm > 0 ? (
              <>
                <Row
                  label={fill(rows.otherValue, { sqm: formatAmount(result.otherBuildingsSqm, language) })}
                  value={euro(result.otherBuildingsValue)}
                />
                {result.otherBuildingsMortgage > 0 ? (
                  <Row label={rows.otherMortgage} value={minus(result.otherBuildingsMortgage)} />
                ) : null}
              </>
            ) : null}
            <Row label={rows.savingsTotal} value={euro(result.savingsTotal)} />
            <Row label={rows.savingsFranchise} value={minus(result.savingsFranchise)} />
            <Row label={rows.savingsNet} value={euro(result.savingsNet)} />
            <Row label={rows.isp} value={euro(result.isp)} strong />
          </RowGroup>

          <RowGroup title={rows.scaleTitle}>
            <Row
              label={fill(rows.scaleBase, { members: result.members })}
              value={formatAmount(result.scaleBase, language, 2)}
            />
            {result.scaleIncrements.map((increment) => (
              <Row
                key={increment.key}
                label={rows.increments[increment.key]}
                value={`+${formatAmount(increment.value, language, 2)}`}
              />
            ))}
            <Row label={rows.scaleTotal} value={formatAmount(result.scale, language, 2)} strong />
          </RowGroup>

          <RowGroup title={rows.formulaTitle}>
            <Row label={rows.ise} value={euro(result.ise)} />
            <Row label={rows.isee} value={euro(result.isee)} strong />
            <Row label={rows.ispe} value={euro(result.ispe)} strong />
          </RowGroup>

          {result.ise > 0 ? (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-[var(--editorial-ink)]">{rows.shareTitle}</h4>
              <div className="flex h-3 overflow-hidden border border-[var(--editorial-border)] bg-white" aria-hidden="true">
                <span className="bg-[var(--editorial-sage)]" style={{ width: `${incomePercent}%` }} />
                <span className="bg-[var(--editorial-terracotta)]" style={{ width: `${assetPercent}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-[var(--editorial-muted)]">
                <span>
                  {rows.shareIncome}: %{incomePercent}
                </span>
                <span>
                  {rows.shareAssets}: %{assetPercent}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </details>

      <div className="mt-6 border border-[#e8c9bd] bg-[#fff8f5] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#8b321a]">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {copy.disclaimerTitle}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#8b321a]">{copy.disclaimer}</p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--editorial-border)] pt-5">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-11 items-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          {nav.edit}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex min-h-11 items-center border border-[var(--editorial-border)] px-5 text-sm font-semibold text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          {nav.restart}
        </button>
        <Link
          href="/scholarships"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--editorial-sage)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          {copy.scholarshipsLink}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Sihirbaz**

<!-- FILE: components/isee/IseeWizard.tsx -->
```tsx
"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import IseeResult from "@/components/isee/IseeResult";
import HouseholdStep from "@/components/isee/steps/HouseholdStep";
import IncomeStep from "@/components/isee/steps/IncomeStep";
import PropertyStep from "@/components/isee/steps/PropertyStep";
import SavingsStep from "@/components/isee/steps/SavingsStep";
import WizardProgress from "@/components/onboarding/WizardProgress";
import { useLanguage } from "@/context/LanguageContext";
import { calculateParificato } from "@/lib/isee/parificato";
import { CITY_THRESHOLDS, DEFAULT_REFERENCE_YEAR, TRY_PER_EUR, averageLimits } from "@/lib/isee/reference";
import { buildVerdict } from "@/lib/isee/verdict";
import {
  STEP_ORDER,
  createEmptyForm,
  toParificatoInput,
  validateStep,
  type IseeFormState,
  type StepErrors,
} from "@/lib/isee/wizardState";

export default function IseeWizard() {
  const { t, language } = useLanguage();
  const copy = t.iseeTool;
  const [form, setForm] = useState<IseeFormState>(() => createEmptyForm(DEFAULT_REFERENCE_YEAR));
  const [stepIndex, setStepIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [errors, setErrors] = useState<StepErrors>({});
  const [errorTick, setErrorTick] = useState(0);
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  // Adım ya da görünüm değişince odağı başlığa taşı; ilk yüklemede sayfayı kaydırma.
  useEffect(() => {
    if (!hasNavigated.current) return;
    headingRef.current?.focus({ preventScroll: true });
    cardRef.current?.scrollIntoView({ block: "start" });
  }, [stepIndex, showResult]);

  // Doğrulama başarısızsa ilk hata mesajını görünür alana getir.
  useEffect(() => {
    if (errorTick === 0) return;
    cardRef.current?.querySelector('[role="alert"]')?.scrollIntoView({ block: "center" });
  }, [errorTick]);

  const outcome = useMemo(() => {
    if (!showResult) return null;
    const result = calculateParificato(toParificatoInput(form), TRY_PER_EUR[form.referenceYear]);
    return { result, verdict: buildVerdict(result.isee, result.ispe, CITY_THRESHOLDS, averageLimits()) };
  }, [form, showResult]);

  const step = STEP_ORDER[stepIndex];
  const isLastStep = stepIndex === STEP_ORDER.length - 1;
  const stepTitles = {
    household: copy.household.title,
    income: copy.income.title,
    property: copy.property.title,
    savings: copy.savings.title,
  };

  const update = (patch: Partial<IseeFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      if (Object.keys(current).length === 0) return current;
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      if ("earners" in patch) {
        for (const key of Object.keys(next)) {
          if (key.startsWith("earner")) delete next[key];
        }
      }
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateStep(step, form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setErrorTick((tick) => tick + 1);
      return;
    }
    setErrors({});
    hasNavigated.current = true;
    if (isLastStep) setShowResult(true);
    else setStepIndex((index) => index + 1);
  };

  const handleBack = () => {
    setErrors({});
    hasNavigated.current = true;
    setStepIndex((index) => Math.max(0, index - 1));
  };

  const handleEdit = () => {
    hasNavigated.current = true;
    setShowResult(false);
    setStepIndex(0);
  };

  const handleRestart = () => {
    hasNavigated.current = true;
    setForm(createEmptyForm(DEFAULT_REFERENCE_YEAR));
    setErrors({});
    setShowResult(false);
    setStepIndex(0);
  };

  const stepProps = { form, update, errors, language };

  return (
    <section
      ref={cardRef}
      aria-labelledby="isee-wizard-heading"
      className="mx-auto max-w-2xl scroll-mt-6 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shadow-[0_18px_50px_rgba(21,32,28,0.08)]"
    >
      {outcome ? (
        <IseeResult
          result={outcome.result}
          verdict={outcome.verdict}
          referenceYear={form.referenceYear}
          language={language}
          headingRef={headingRef}
          onEdit={handleEdit}
          onRestart={handleRestart}
        />
      ) : (
        <form noValidate onSubmit={handleSubmit} className="p-5 sm:p-8">
          <WizardProgress
            current={stepIndex + 1}
            total={STEP_ORDER.length}
            label={`${copy.nav.stepWord} ${stepIndex + 1} / ${STEP_ORDER.length}`}
          />
          <h2
            id="isee-wizard-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-5 font-serif text-3xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] outline-none"
          >
            {stepTitles[step]}
          </h2>

          <div className="mt-7">
            {step === "household" ? <HouseholdStep {...stepProps} /> : null}
            {step === "income" ? <IncomeStep {...stepProps} /> : null}
            {step === "property" ? <PropertyStep {...stepProps} /> : null}
            {step === "savings" ? <SavingsStep {...stepProps} /> : null}
          </div>

          {Object.keys(errors).length > 0 ? (
            <p role="alert" className="mt-6 text-sm font-semibold text-[#8b321a]">
              {copy.errors.summary}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--editorial-border)] pt-5">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex min-h-11 items-center gap-2 border border-[var(--editorial-border)] px-5 text-sm font-semibold text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {copy.nav.back}
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-6 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              {isLastStep ? copy.nav.calculate : copy.nav.next}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Lint ve tip kontrolü**

Run: `npx eslint components/isee && npx tsc --noEmit -p tsconfig.json`
Expected: hata yok.

- [ ] **Step 4: Commit**

```bash
git add components/isee/IseeResult.tsx components/isee/IseeWizard.tsx
git commit -m "feat(isee): wizard flow and traffic-light result screen"
```

---

### Task 8: Sayfa, açıklama bölümü, eski kodun kaldırılması ve guard'lar

**Files:**
- Create: `components/isee/IseeExplainer.tsx`, `components/isee/IseeParificatoClient.tsx`
- Modify: `app/isee/page.tsx`, `app/isee/layout.tsx`, `app/sitemap.ts`, `public/llms.txt`, `scripts/check-home-consultation.mjs`, `scripts/check-isee-calculator.mjs`
- Delete: `lib/iseeCalculator.ts`, `components/isee/IseeCalculatorClient.tsx`

**Interfaces:**
- Consumes: `IseeWizard`, `ConsultPrompt`, `t.iseeTool.header/explainer`, `t.consultPrompt.isee`, `CITY_THRESHOLDS/FORMULA_SOURCES/RATE_SOURCE/THRESHOLDS_VERIFIED_AT`.
- Produces: `IseeParificatoClient` (default export, prop almaz). Dosya `<ConsultPrompt` ve `t.consultPrompt.isee` dizgilerini içermek zorundadır (`check:home-consultation`).

- [ ] **Step 1: Guard bölümünü ekle (başarısız olacak)**

`scripts/check-isee-calculator.mjs` içinde son `console.log` satırının hemen ÜSTÜNE ekle:

<!-- APPEND: scripts/check-isee-calculator.mjs -->
```js
// ---------------------------------------------------------------------------
// 6) Sayfa ve kaynak guard'ları
// ---------------------------------------------------------------------------
for (const removed of ["lib/iseeCalculator.ts", "components/isee/IseeCalculatorClient.tsx"]) {
  assert.ok(!existsSync(path.join(root, removed)), `legacy ordinary-ISEE file must be removed: ${removed}`);
}

for (const pureFile of [
  "lib/isee/parificato.ts",
  "lib/isee/reference.ts",
  "lib/isee/verdict.ts",
  "lib/isee/wizardState.ts",
]) {
  const source = await readFile(path.join(root, pureFile), "utf8");
  assert.ok(!/from\s+["'](react|next)/.test(source), `${pureFile} must stay framework-free`);
  assert.ok(!/^import\s+(?!type\b)/m.test(source), `${pureFile} may only use type imports`);
}

const pageSource = await readFile(path.join(root, "app/isee/page.tsx"), "utf8");
assert.ok(pageSource.includes("IseeParificatoClient"), "app/isee/page.tsx renders the Parificato client leaf");
assert.ok(!pageSource.includes('"use client"'), "app/isee/page.tsx stays a server wrapper");

const layoutSource = await readFile(path.join(root, "app/isee/layout.tsx"), "utf8");
assert.ok(layoutSource.includes("ISEE Parificato"), "metadata names ISEE Parificato");
assert.ok(layoutSource.includes('canonical: "/isee"'), "canonical stays /isee");

const clientSource = await readFile(path.join(root, "components/isee/IseeParificatoClient.tsx"), "utf8");
assert.ok(clientSource.includes("<h1"), "client leaf renders the page H1");
assert.ok(clientSource.includes("<IseeWizard"), "client leaf renders the wizard");
assert.ok(clientSource.includes("<IseeExplainer"), "client leaf renders the visible explainer");
assert.ok(clientSource.includes("<ConsultPrompt"), "client leaf keeps the consultation prompt");

for (const uiFile of [
  "components/isee/IseeParificatoClient.tsx",
  "components/isee/IseeWizard.tsx",
  "components/isee/IseeResult.tsx",
  "components/isee/IseeExplainer.tsx",
  "components/isee/steps/HouseholdStep.tsx",
  "components/isee/steps/IncomeStep.tsx",
  "components/isee/steps/PropertyStep.tsx",
  "components/isee/steps/SavingsStep.tsx",
]) {
  const source = await readFile(path.join(root, uiFile), "utf8");
  assert.ok(source.includes("t.iseeTool"), `${uiFile} must read its copy from t.iseeTool`);
  assert.ok(!/[ğĞşŞıİçÇöÖüÜ]/.test(source.replace(/\/\/.*$/gm, "")), `${uiFile} must not hard-code Turkish copy`);
}

const explainerSource = await readFile(path.join(root, "components/isee/IseeExplainer.tsx"), "utf8");
assert.ok(explainerSource.includes("CITY_THRESHOLDS"), "explainer lists the sourced city limits");
assert.ok(explainerSource.includes("sourceUrl"), "explainer links every limit to its official source");
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm run check:isee`
Expected: FAIL — `legacy ordinary-ISEE file must be removed: lib/iseeCalculator.ts`

- [ ] **Step 3: Açıklama bölümü**

<!-- FILE: components/isee/IseeExplainer.tsx -->
```tsx
"use client";

import { ExternalLink } from "lucide-react";

import { fill, formatEuro, type Language } from "@/components/isee/format";
import { useLanguage } from "@/context/LanguageContext";
import { CITY_THRESHOLDS, FORMULA_SOURCES, RATE_SOURCE, THRESHOLDS_VERIFIED_AT } from "@/lib/isee/reference";

const LINK_CLASS =
  "inline-flex items-center gap-1 font-semibold text-[var(--editorial-sage)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]";

function formatIsoDate(iso: string, language: Language) {
  const [year, month, day] = iso.split("-");
  return language === "tr" ? `${day}.${month}.${year}` : iso;
}

function TextSection({ heading, body }: { heading: string; body: string[] }) {
  return (
    <section>
      <h3 className="font-serif text-2xl font-normal leading-tight text-[var(--editorial-ink)]">{heading}</h3>
      {body.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-base leading-8 text-[var(--editorial-muted)]">
          {paragraph}
        </p>
      ))}
    </section>
  );
}

export default function IseeExplainer() {
  const { t, language } = useLanguage();
  const copy = t.iseeTool.explainer;
  const cityNames = t.iseeTool.result.cityNames;

  return (
    <section aria-labelledby="isee-explainer-heading" className="border-t border-[var(--editorial-border)] pt-10">
      <h2
        id="isee-explainer-heading"
        className="max-w-3xl font-serif text-3xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-4xl"
      >
        {copy.title}
      </h2>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <TextSection heading={copy.what.heading} body={copy.what.body} />
        <section>
          <h3 className="font-serif text-2xl font-normal leading-tight text-[var(--editorial-ink)]">
            {copy.how.heading}
          </h3>
          <ul className="mt-3 space-y-3">
            {copy.how.bullets.map((bullet) => (
              <li
                key={bullet}
                className="border-l-2 border-[var(--editorial-sage)] pl-4 text-base leading-7 text-[var(--editorial-muted)]"
              >
                {bullet}
              </li>
            ))}
          </ul>
        </section>
        <TextSection heading={copy.difference.heading} body={copy.difference.body} />
        <TextSection heading={copy.year.heading} body={copy.year.body} />
        <TextSection heading={copy.official.heading} body={copy.official.body} />
      </div>

      <div className="mt-12">
        <h3 className="font-serif text-2xl font-normal leading-tight text-[var(--editorial-ink)]">
          {copy.limitsTitle}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">
          {fill(copy.limitsCaption, { date: formatIsoDate(THRESHOLDS_VERIFIED_AT, language) })}
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CITY_THRESHOLDS.map((city) => (
            <li key={city.key} className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4">
              <p className="text-lg font-semibold text-[var(--editorial-ink)]">{cityNames[city.key]}</p>
              <p className="text-sm text-[var(--editorial-muted)]">{city.body}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--editorial-muted)]">{copy.iseeLimit}</dt>
                  <dd className="font-semibold tabular-nums text-[var(--editorial-ink)]">
                    {formatEuro(city.iseeLimit, language, 2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--editorial-muted)]">{copy.ispeLimit}</dt>
                  <dd className="font-semibold tabular-nums text-[var(--editorial-ink)]">
                    {formatEuro(city.ispeLimit, language, 2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--editorial-muted)]">{copy.requestedYear}</dt>
                  <dd className="font-semibold tabular-nums text-[var(--editorial-ink)]">{city.requestedYear}</dd>
                </div>
              </dl>
              <a href={city.sourceUrl} target="_blank" rel="noopener noreferrer" className={`mt-3 text-sm ${LINK_CLASS}`}>
                {copy.sourceLink}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <h3 className="text-base font-semibold text-[var(--editorial-ink)]">{copy.sourcesTitle}</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a href={RATE_SOURCE.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {copy.sourceLabels.rates}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </li>
          {FORMULA_SOURCES.map((source) => (
            <li key={source.key}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                {copy.sourceLabels[source.key]}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Sayfa client leaf'i**

<!-- FILE: components/isee/IseeParificatoClient.tsx -->
```tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

import ConsultPrompt from "@/components/consultation/ConsultPrompt";
import IseeExplainer from "@/components/isee/IseeExplainer";
import IseeWizard from "@/components/isee/IseeWizard";
import { useLanguage } from "@/context/LanguageContext";

export default function IseeParificatoClient() {
  const { t } = useLanguage();
  const copy = t.iseeTool.header;

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 pb-20 pt-7 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-terracotta-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {copy.back}
        </Link>

        <header className="mt-5 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 shadow-[0_18px_50px_rgba(21,32,28,0.08)] sm:p-8 lg:p-10">
          <p className="text-sm font-medium text-[var(--editorial-muted)]">{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-normal leading-[1.02] tracking-[-0.025em] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--editorial-muted)] sm:text-lg">
            {copy.subtitle}
          </p>
          <ul className="mt-7 grid gap-3 border-t border-[var(--editorial-border)] pt-5 text-sm sm:grid-cols-3">
            {copy.trust.map((item) => (
              <li key={item} className="flex items-start gap-2 font-medium text-[var(--editorial-ink)]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--editorial-sage)]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </header>

        <div className="mt-8">
          <IseeWizard />
        </div>

        <div className="mt-14">
          <IseeExplainer />
        </div>

        <div className="mt-12">
          <ConsultPrompt {...t.consultPrompt.isee} cta={t.consultPrompt.cta} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Sayfa ve metadata**

<!-- FILE: app/isee/page.tsx -->
```tsx
import IseeParificatoClient from "@/components/isee/IseeParificatoClient";

export const dynamic = "force-dynamic";

export default function IseePage() {
  return <IseeParificatoClient />;
}
```

<!-- FILE: app/isee/layout.tsx -->
```tsx
import type { Metadata } from "next";

const title = "ISEE Parificato Hesaplayıcı | İtalya Burs Tahmini";
const description =
  "Ailen Türkiye'de yaşıyorsa İtalya burs başvurusunda ISEE Parificato hesaplanır. Geliri TL, evi m² olarak gir; tahmini ISEE ve ISPE değerini 2026/27 burs limitleriyle karşılaştır.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/isee",
  },
  openGraph: {
    title,
    description,
    url: "https://italypath.app/isee",
    type: "website",
  },
};

export default function IseeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
```

- [ ] **Step 6: Eski kodu sil ve guard yolunu güncelle**

```bash
git rm -q lib/iseeCalculator.ts components/isee/IseeCalculatorClient.tsx
```

`scripts/check-home-consultation.mjs` içinde şu satırı:

```js
  ["components/isee/IseeCalculatorClient.tsx", "t.consultPrompt.isee"],
```

şununla değiştir:

```js
  ["components/isee/IseeParificatoClient.tsx", "t.consultPrompt.isee"],
```

- [ ] **Step 7: Sitemap tarihi ve llms.txt**

`app/sitemap.ts` içinde `PAGE_TEMPLATE_LAST_MODIFIED` sabitinin hemen altına ekle:

```ts
// /isee görünür içeriği 2026-09-17'de ISEE Parificato aracıyla yenilendi (SEO_AUDIT.md §21 kuralı: gerçek değişiklik tarihi).
const ISEE_PAGE_LAST_MODIFIED = new Date('2026-09-17T00:00:00Z');
```

ve `/isee` girdisindeki `lastModified: PAGE_TEMPLATE_LAST_MODIFIED,` satırını `lastModified: ISEE_PAGE_LAST_MODIFIED,` yap (yalnızca `url: \`${baseUrl}/isee\`` girdisinde).

`public/llms.txt` içinde:
- `- An educational ISEE calculator. Its result is an estimate only, not an official ISEE declaration or eligibility decision.` satırını şununla değiştir: `- An educational ISEE Parificato calculator for families living in Türkiye (income in TRY, homes in m² at the conventional EUR 500 per m², official Banca d'Italia yearly average rate). Its result is an estimate only, not an official ISEE declaration or eligibility decision.`
- `- [ISEE estimate calculator](https://italypath.app/isee): https://italypath.app/isee` satırında bağlantı metnini `ISEE Parificato estimate calculator` yap.

- [ ] **Step 8: Tüm kontroller**

Run: `npm run check:isee && npm run check:home-consultation && npm run check:seo-vitals && npm run check:routes && npm run check:editorial-ui && npm run check:ai-search && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: hepsi hatasız.

- [ ] **Step 9: Commit**

```bash
git add components/isee/IseeExplainer.tsx components/isee/IseeParificatoClient.tsx app/isee/page.tsx app/isee/layout.tsx app/sitemap.ts public/llms.txt scripts/check-home-consultation.mjs scripts/check-isee-calculator.mjs
git commit -m "feat(isee): replace ordinary ISEE page with the Parificato wizard"
```

---

### Task 9: Tarayıcı doğrulaması, build ve dokümantasyon

**Files:**
- Modify: `AGENT_CONTEXT.md`, `AGENT_COMMITS.md`

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: derleme başarılı; `/isee` rotası listede `ƒ` (dynamic) olarak görünür.

- [ ] **Step 2: Tarayıcıda akış (mobil 375 px ve masaüstü)**

Dev sunucusu worktree'den ayrı bir portta başlatılır (3000'i başka oturum kullanıyor olabilir). Doğrulanacaklar:

1. `/isee` sunucu HTML'i: H1 "ISEE Parificato hesaplayıcı", açıklama bölümü ve beş şehir limiti `curl` çıktısında görünür; `BAILOUT_TO_CLIENT_SIDE_RENDERING` içerik içinde yok.
2. Boş formda "Devam" → hata mesajları alanların yanında; ilerlemez.
3. Aile A girdileri (4 kişi, 2 çocuk, 18 yaş altı yok; 2025; maaşlı 1.200.000 + 600.000; kendi evi 120 m²; diğer bina 80 m²; birikim 500.000) → ISEE `17.771 €`, ISPE `18.763 €`, mavi ışık, beş şehir "altında".
4. Aile D → ISEE `24.846 €`, sarı ışık, Roma "altında", diğerleri "sınırda", "gelir tarafı" notu görünür.
5. Aile C → kırmızı ışık, tüm şehirler "üstünde".
6. `10.000 / 44.500` benzeri durum için Padova dikkat satırı (ör. 3 kişi, gelir düşük, diğer binalar ~190 m²) görünür.
7. "Cevapları düzenle" değerleri korur; "Baştan başla" temizler.
8. Klavye: Tab ile çipler, Enter ile "Devam"; adım değişince odak başlığa gider.
9. Dil EN: tüm metinler İngilizce, tutarlar `€26,888` biçiminde; konsolda hata/hydration uyarısı yok.
10. 375 px'de yatay taşma yok; dokunma hedefleri ≥ 44 px.

- [ ] **Step 3: `AGENT_CONTEXT.md` güncelle**

- "Son guncelleme" tarihini `2026-09-17` yap.
- Proje ağacında `components/isee/IseeCalculatorClient.tsx` satırını `components/isee/` (ISEE Parificato sihirbazi: client leaf, wizard, steps, result, explainer) olarak değiştir; `lib/` altına `isee/` (parificato.ts, reference.ts, verdict.ts, wizardState.ts) ekle; `app/isee/page.tsx` açıklamasını `Server wrapper -> components/isee/IseeParificatoClient.tsx` yap.
- "### ISEE" bölümünü şu içerikle değiştir:

```markdown
### ISEE

`/isee` yalnizca **ISEE Parificato** tahmini yapar (ailesi Turkiye'de yasayan ogrenciler). Normal ISEE hesabi 2026-09-17'de kaldirildi; geri getirme.

- `app/isee/page.tsx` server wrapper (`force-dynamic`), `components/isee/IseeParificatoClient.tsx` client leaf: H1, 4 adimli sihirbaz (`IseeWizard` + `steps/*`), sonuc (`IseeResult`), gorunur aciklama + limit kartlari (`IseeExplainer`), `ConsultPrompt`.
- Saf hesap katmani `lib/isee/`: `parificato.ts` (DPCM 159/2013 muafiyet/katsayilari, bina m2 x 500 EUR, TL -> EUR), `reference.ts` (Banca d'Italia yillik ortalama kurlar, bes sehrin 2026/27 ISEE/ISPE limitleri, kaynak URL + dogrulama tarihi), `verdict.ts` (ortalamaya gore mavi/sari/kirmizi, sehir bazinda altinda/sinirda/ustunde), `wizardState.ts` (form durumu, adim dogrulama). Bu dosyalar React/Next icermez ve birbirinden yalnizca `import type` alir.
- Veri bakimi: yeni yil kuru (Ocak) ve yeni sartname limitleri (yaz) yalnizca `lib/isee/reference.ts` icinde guncellenir; her deger resmi kaynaga bagli olmalidir. Burs haritasi (`lib/scholarships/regions.ts`) ayri veri kaynagidir ve hala 2025/26 tasir.
- Metinler `lib/translations.ts` `iseeTool` (TR+EN); tutarlar `components/isee/format.ts` ile deterministik bicimlenir (Intl yok, hydration guvenli).
- Form bos acilir, durum yalnizca bellekte tutulur (localStorage/URL yok).
- Dogrulama: `npm run check:isee` (dort elle hesaplanmis aile, kenar durumlar, isik sinirlari, veri butunlugu, kaynak guard'lari).
- Tasarim/plan: `docs/superpowers/specs/2026-09-17-isee-parificato-calculator-design.md`, `docs/superpowers/plans/2026-09-17-isee-parificato-calculator-plan.md`.
```

- [ ] **Step 4: `AGENT_COMMITS.md` kaydı**

Dosyanın sonuna ekle:

```markdown

### ISEE Parificato hesaplayıcı (2026-09-17, `feat/isee-parificato`)
| Dosya | Değişiklik |
|-------|------------|
| `lib/isee/parificato.ts`, `reference.ts`, `verdict.ts`, `wizardState.ts` | 🆕 Saf ISEE Parificato hesabı, kaynaklı kur/limit verisi, ışık kuralı, form doğrulama |
| `components/isee/*` | 🆕 4 adımlı sihirbaz, sonuç ekranı, açıklama bölümü, form alanları, deterministik biçimlendirme |
| `lib/iseeCalculator.ts`, `components/isee/IseeCalculatorClient.tsx` | 🗑️ Normal ISEE hesabı ve ekranı kaldırıldı |
| `lib/translations.ts` | ♻️ Yeni `iseeTool` ad alanı (TR+EN); `isee` yalnızca ana sayfa kartı |
| `components/IseeSection.tsx` | ♻️ Kart maddeleri çeviriden gelir |
| `app/isee/page.tsx`, `app/isee/layout.tsx` | ♻️ Yeni client leaf ve ISEE Parificato metadata'sı |
| `scripts/check-isee-calculator.mjs` | ♻️ Baştan yazıldı: örnek aileler, ışık sınırları, veri ve kaynak guard'ları |
| `scripts/check-home-consultation.mjs`, `app/sitemap.ts`, `public/llms.txt` | ♻️ Yeni dosya yolu, `/isee` lastModified, açıklama |
```

- [ ] **Step 5: Commit**

```bash
git add AGENT_CONTEXT.md AGENT_COMMITS.md
git commit -m "docs: ISEE Parificato calculator in agent context and commit log"
```

- [ ] **Step 6: Kerem'e rapor**

Canlıya alma (main'e birleştirme + push = Vercel production deploy) Kerem onayı olmadan yapılmaz. Rapor: ne değişti, ekran görüntüleri, test sonuçları, açık öneri (burs haritası 2026/27 güncellemesi ayrı görev).
