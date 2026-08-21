# City Guide Content Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic city-guide fallback claims with source-checked content for 25 real student cities, a centralized three-tier budget model, short Wikipedia-attributed histories, and an honest unresearched state.

**Architecture:** Keep the existing 17 hand-curated records intact. Add a focused tier catalog and a separate `TieredCityRecord[]`; materialize those records into the existing `CityDetail` view model and merge them into `CURATED_CITIES`. Research happens in three bounded waves, raw results stay ignored, and only source-checked TR/EN records enter runtime code.

**Tech Stack:** Next.js 16.1.6 App Router, React 19.2.3, TypeScript 5, Tailwind CSS v4, Framer Motion 12, Lucide React, Node.js validation scripts.

**Spec:** `docs/superpowers/specs/2026-08-19-city-guide-content-expansion-design.md`

Research and runtime integration stay in one plan because the source-checked YAML outputs are direct prerequisites of the TypeScript records. The three research waves remain separate reviewable tasks, so a weak wave can be rejected without blocking the tier foundation or safe fallback.

## Global Constraints

- Read `AGENT_CONTEXT.md`, the spec, `city-content-research/outline.yaml`, and `city-content-research/fields.yaml` before starting.
- Preserve the existing 17 curated records; do not rewrite their prices, copy, source URLs, or Trento's current source-less content.
- Research and add exactly these 25 guides: Perugia, Aosta, Bergamo, Bolzano, Brescia, Cagliari, Camerino, Casamassima, Cassino, Castellanza, Catania, Cenova, Ferrara, Lecce, Macerata, Messina, Palermo, Pescara, Pollenzo, Reggio Calabria, Sassari, Teramo, Udine, Urbino, Viterbo.
- Exclude `Piemonte` only from city-guide normalization. Never delete or mutate the UPO university/program data.
- Use three cost tiers only: `budget`, `balanced`, `high`, mapped to existing ratings `2`, `3`, `4`.
- Use the exact budget bands in the spec; do not perform city-by-city Numbeo or listing-price research.
- Every new city requires fact-equivalent TR/EN history, transport, and city-character copy.
- Wikipedia history must be paraphrased into 2–3 sentences, attributed with a direct article URL, and never copied as a passage.
- Transport sources must prefer official university, municipality, or transit-operator pages. Do not store schedules or volatile fares.
- New UI copy must be added in parallel under both `citiesGuide` translation namespaces.
- Keep `city-content-research/results/` out of Git and out of the runtime bundle.
- Do not add packages, state libraries, `middleware.ts`, `tailwind.config.*`, or Supabase schema changes.
- Do not import runtime university data from `app/data.ts`.
- Treat the worktree as user-owned: inspect `git status --short` before every task, preserve overlapping edits, and stage only files owned by that task.
- Use `apply_patch` for file edits. Each task must finish with its listed checks passing before commit.

## File Responsibility Map

- `.gitignore` — keeps raw per-city research artifacts out of Git.
- `types/cities.ts` — owns `CityDetail`, `CityCostTier`, `CityCostCluster`, `CityPlaceHierarchy`, and `TieredCityRecord` contracts.
- `lib/cities/costTiers.ts` — owns the three immutable budget bands and `materializeTieredCity(record)`.
- `lib/cities/tieredData.ts` — owns only the 25 source-checked lightweight records.
- `lib/cities/data.ts` — preserves the 17 legacy records, composes the combined catalog, resolves names, and creates an honest fallback.
- `lib/cities/normalization.ts` — owns city aliases and city-guide-only exclusions, including `Piemonte`.
- `components/cities/CityGuidesExplorer.tsx` — owns conditional city-detail presentation, history attribution, tier labeling, and the unresearched state.
- `lib/translations.ts` — owns all new TR/EN city-guide interface copy.
- `scripts/check-cities-data.mjs` — owns the permanent structural regression contract.
- `city-content-research/results/*.yaml` — ignored working evidence, never runtime input.
- `AGENT_CONTEXT.md` — records the final city architecture and maintenance rules.

---

### Task 1: Add the tier domain and materializer

**Files:**
- Create: `lib/cities/costTiers.ts`
- Modify: `types/cities.ts:1-34`
- Modify: `components/cities/CityGuidesExplorer.tsx:402-422,591-600`
- Modify: `scripts/check-cities-data.mjs:1-20,313-374`
- Modify: `.gitignore:48-58`
- Test: `scripts/check-cities-data.mjs`

**Interfaces:**
- Consumes: Existing `CityDetail` fields and the approved cost bands from the spec.
- Produces: `CityCostTier`, `CityCostCluster`, `CityPlaceHierarchy`, `TieredCityRecord`, `CITY_COST_TIERS`, `CITY_COST_MODEL_VERSION`, and `materializeTieredCity(record): CityDetail`.

- [ ] **Step 1: Add failing source-contract checks**

At the top of `scripts/check-cities-data.mjs`, add readers for the type and tier files:

```js
const cityTypesPath = new URL("../types/cities.ts", import.meta.url);
const cityCostTiersPath = new URL("../lib/cities/costTiers.ts", import.meta.url);

const cityTypesSource = readFileSync(cityTypesPath, "utf8");
const cityCostTiersSource = readFileSync(cityCostTiersPath, "utf8");
```

Add these assertions after `assertNotIncludes` is declared:

```js
assertIncludes(cityTypesSource, 'export type CityCostTier = "budget" | "balanced" | "high"', "City cost tiers must stay closed to three values.");
assertIncludes(cityTypesSource, "export interface TieredCityRecord", "Tiered city records need an explicit contract.");
assertIncludes(cityCostTiersSource, 'export const CITY_COST_MODEL_VERSION = "2026-08"', "Tier budget copy must expose a version.");
assertIncludes(cityCostTiersSource, 'budget: {', "Budget tier is missing.");
assertIncludes(cityCostTiersSource, 'balanced: {', "Balanced tier is missing.");
assertIncludes(cityCostTiersSource, 'high: {', "High tier is missing.");
assertIncludes(cityCostTiersSource, "250€ - 400€", "Budget room range changed unexpectedly.");
assertIncludes(cityCostTiersSource, "600€ - 850€", "Balanced studio range changed unexpectedly.");
assertIncludes(cityCostTiersSource, "850€ - 1.250€", "High studio range changed unexpectedly.");
assertIncludes(cityCostTiersSource, "materializeTieredCity", "Tiered records need one materializer.");
```

- [ ] **Step 2: Run the city check and confirm the red state**

Run:

```bash
npm run check:cities
```

Expected: FAIL because `lib/cities/costTiers.ts` does not exist.

- [ ] **Step 3: Expand the city contracts without weakening existing researched records**

Replace `types/cities.ts` with contracts matching this shape:

```ts
export type CityCostTier = "budget" | "balanced" | "high";

export type CityCostCluster =
  | "regional-capital"
  | "provincial-student-city"
  | "micro-campus-town"
  | "tourism-heavy"
  | "island-premium"
  | "alpine-premium"
  | "metro-satellite";

export type CityPlaceHierarchy = "city" | "hamlet" | "satellite-town" | "dual-city";

export interface TieredCityRecord {
  slug: string;
  name: string;
  nameEn: string;
  cityNameIt: string;
  altNames: string[];
  region: string;
  placeHierarchy: CityPlaceHierarchy;
  primaryStudentBase?: string;
  costTier: CityCostTier;
  costCluster: CityCostCluster;
  costTierRationale: string;
  historyShort: string;
  historyShortEn: string;
  historySourceTitle: string;
  historySourceUrl: string;
  transportDetails: string;
  transportDetailsEn: string;
  climateAndVibe: string;
  climateAndVibeEn: string;
  transportSourceUrls: string[];
  sourceRetrievedAt: string;
  sourceConfidence: "official" | "mixed" | "wikipedia-only";
  reviewStatus: "source-checked";
  reviewPriority: string[];
  uncertain: string[];
}

export interface CityDetail {
  slug: string;
  name: string;
  nameEn: string;
  cityNameIt?: string;
  altNames?: string[];
  region: string;
  contentStatus?: "researched" | "unresearched";
  costSourceName?: string;
  costSourceUrl?: string;
  costSourceLastUpdated?: string;
  costModel?: "external" | "italypath-tier";
  costModelVersion?: string;
  costRating: 1 | 2 | 3 | 4 | 5;
  studentPopulation?: string;
  studentPopulationEn?: string;
  rentAverage: string;
  livingExpenses: string;
  transportCost: string;
  rentAverageEn: string;
  livingExpensesEn: string;
  transportCostEn: string;
  transportDetails: string;
  transportDetailsEn: string;
  climateAndVibe: string;
  climateAndVibeEn: string;
  editorialTip?: string;
  editorialTipEn?: string;
  historyShort?: string;
  historyShortEn?: string;
  historySourceTitle?: string;
  historySourceUrl?: string;
  sourceRetrievedAt?: string;
}
```

Do not make cost, transport, vibe, or rating optional in this task; Task 2 introduces those guards together with the safe fallback.

- [ ] **Step 4: Implement the exact three-band catalog and materializer**

Create `lib/cities/costTiers.ts`:

```ts
import type { CityCostTier, CityDetail, TieredCityRecord } from "@/types/cities";

export const CITY_COST_MODEL_VERSION = "2026-08";

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

export const CITY_COST_TIERS: Record<CityCostTier, CityCostBand> = {
  budget: {
    costRating: 2,
    rentAverage: "Özel oda: 250€ - 400€ | Küçük stüdyo: 450€ - 650€",
    rentAverageEn: "Private room: €250 - €400 | Small studio: €450 - €650",
    livingExpenses: "Kira hariç aylık temel gider: 220€ - 300€",
    livingExpensesEn: "Monthly essentials excluding rent: €220 - €300",
    transportCost: "Öğrenci ulaşımı aylık karşılık: 20€ - 30€",
    transportCostEn: "Monthly student transport equivalent: €20 - €30",
  },
  balanced: {
    costRating: 3,
    rentAverage: "Özel oda: 350€ - 550€ | Küçük stüdyo: 600€ - 850€",
    rentAverageEn: "Private room: €350 - €550 | Small studio: €600 - €850",
    livingExpenses: "Kira hariç aylık temel gider: 260€ - 360€",
    livingExpensesEn: "Monthly essentials excluding rent: €260 - €360",
    transportCost: "Öğrenci ulaşımı aylık karşılık: 25€ - 40€",
    transportCostEn: "Monthly student transport equivalent: €25 - €40",
  },
  high: {
    costRating: 4,
    rentAverage: "Özel oda: 500€ - 750€ | Küçük stüdyo: 850€ - 1.250€",
    rentAverageEn: "Private room: €500 - €750 | Small studio: €850 - €1,250",
    livingExpenses: "Kira hariç aylık temel gider: 320€ - 450€",
    livingExpensesEn: "Monthly essentials excluding rent: €320 - €450",
    transportCost: "Öğrenci ulaşımı aylık karşılık: 35€ - 55€",
    transportCostEn: "Monthly student transport equivalent: €35 - €55",
  },
};

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
```

- [ ] **Step 5: Guard the two newly optional legacy UI fields**

In `CityGuidesExplorer.tsx`, derive the selected-language values before `return`:

```ts
const activePopulation = language === "tr" ? activeCity.studentPopulation : activeCity.studentPopulationEn;
const activeEditorialTip = language === "tr" ? activeCity.editorialTip : activeCity.editorialTipEn;
```

Render the population metadata row only when `activePopulation` is truthy, and render the editorial-tip section only when `activeEditorialTip` is truthy. Keep all existing class names and motion structure.

- [ ] **Step 6: Ignore raw research artifacts**

Append to `.gitignore`:

```gitignore

# City-guide research working results
city-content-research/results/
```

- [ ] **Step 7: Run focused verification**

Run:

```bash
npm run check:cities
npm run lint -- types/cities.ts lib/cities/costTiers.ts components/cities/CityGuidesExplorer.tsx scripts/check-cities-data.mjs
```

Expected: both commands PASS.

- [ ] **Step 8: Commit the tier foundation**

```bash
git add .gitignore types/cities.ts lib/cities/costTiers.ts components/cities/CityGuidesExplorer.tsx scripts/check-cities-data.mjs
git commit -m "feat(cities): add shared student budget tiers"
```

---

### Task 2: Replace fabricated fallback content and exclude Piemonte

**Files:**
- Modify: `types/cities.ts:35-75`
- Modify: `lib/cities/normalization.ts:1-47`
- Modify: `lib/cities/data.ts:411-449`
- Modify: `components/cities/CityGuidesExplorer.tsx:24-34,163-224,402-614`
- Modify: `lib/translations.ts:864-901,1853-1890`
- Modify: `scripts/check-cities-data.mjs`
- Test: `scripts/check-cities-data.mjs`

**Interfaces:**
- Consumes: `CityDetail` and `materializeTieredCity` contracts from Task 1.
- Produces: `getFallbackCityDetail(cityName, regionName): CityDetail`, `contentStatus: "unresearched"`, and city-guide-only exclusion of `Piemonte`.

- [ ] **Step 1: Add failing fallback and exclusion assertions**

Read `lib/cities/normalization.ts` in `scripts/check-cities-data.mjs` and add:

```js
const cityNormalizationPath = new URL("../lib/cities/normalization.ts", import.meta.url);
const cityNormalizationSource = readFileSync(cityNormalizationPath, "utf8");

assertIncludes(cityNormalizationSource, '"Piemonte"', "Piemonte must be excluded from city guides.");
assertIncludes(source, 'contentStatus: "unresearched"', "Unknown cities need an honest status.");
assertNotIncludes(source.slice(source.indexOf("export function getFallbackCityDetail")), "Tek kişilik oda: 300€ - 450€", "Fallback must not invent rent.");
assertNotIncludes(source.slice(source.indexOf("export function getFallbackCityDetail")), "Sakin, güvenli ve otantik", "Fallback must not invent city character.");
assertIncludes(cityExplorerSource, "copy.guidePreparingTitle", "Unresearched cities need a visible honest state.");
assertIncludes(translationsSource, 'guidePreparingTitle: "Bu şehir rehberi hazırlanıyor"', "Turkish fallback title is required.");
assertIncludes(translationsSource, 'guidePreparingTitle: "This city guide is being prepared"', "English fallback title is required.");
```

- [ ] **Step 2: Run the check and confirm it fails**

Run:

```bash
npm run check:cities
```

Expected: FAIL because `Piemonte` is not excluded and the old fabricated fallback remains.

- [ ] **Step 3: Make fallback-only detail fields optional**

In `CityDetail`, make these fields optional while leaving identity fields required:

```ts
costRating?: 1 | 2 | 3 | 4 | 5;
rentAverage?: string;
livingExpenses?: string;
transportCost?: string;
rentAverageEn?: string;
livingExpensesEn?: string;
transportCostEn?: string;
transportDetails?: string;
transportDetailsEn?: string;
climateAndVibe?: string;
climateAndVibeEn?: string;
```

Task 1's `materializeTieredCity` still supplies every one of these for researched tiered records.

- [ ] **Step 4: Exclude Piemonte only at the city-guide normalization boundary**

Change the exclusion set to:

```ts
const CITY_GUIDE_EXCLUSIONS = new Set(["Benevento / Online", "Piemonte"]);
```

Do not add `Piemonte` filtering anywhere in university APIs, Supabase composition, university pages, or Hub program matching.

- [ ] **Step 5: Replace the fallback implementation**

Change the signature and return value in `lib/cities/data.ts`:

```ts
export function getFallbackCityDetail(cityName: string, regionName: string): CityDetail {
  return {
    slug: cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: cityName,
    nameEn: cityName,
    region: regionName,
    contentStatus: "unresearched",
  };
}
```

Update the Explorer call to `getFallbackCityDetail(name, region)` and remove the now-unused `count` local.

- [ ] **Step 6: Derive guarded values for researched cards**

Before the Explorer `return`, add:

```ts
const isUnresearched = activeCity.contentStatus === "unresearched";
const activeRent = language === "tr" ? activeCity.rentAverage : activeCity.rentAverageEn;
const activeExpenses = language === "tr" ? activeCity.livingExpenses : activeCity.livingExpensesEn;
const activeTransportCost = language === "tr" ? activeCity.transportCost : activeCity.transportCostEn;
const activeTransportDetails = language === "tr" ? activeCity.transportDetails : activeCity.transportDetailsEn;
const activeCityCharacter = language === "tr" ? activeCity.climateAndVibe : activeCity.climateAndVibeEn;
const activeCostRating = activeCity.costRating ?? 0;
const hasCostDetails = Boolean(
  activeCity.costRating !== undefined && activeRent && activeExpenses && activeTransportCost
);
```

Inside the guarded rating strip, use `activeCostRating` in the ARIA label and dot comparison so TypeScript never compares against `undefined`.

- [ ] **Step 7: Render an honest state and guard every optional panel**

Immediately after the profile card, render this only for `isUnresearched`:

```tsx
<section className="mt-5 rounded-[1.5rem] border border-[var(--editorial-border)] bg-white/55 p-5 sm:p-6">
  <div className="flex items-start gap-3">
    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--editorial-terracotta)]" />
    <div>
      <h3 className="font-serif text-xl text-[var(--editorial-ink)]">{copy.guidePreparingTitle}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">{copy.guidePreparingBody}</p>
    </div>
  </div>
</section>
```

Guard the rating strip and living-cost panel with `hasCostDetails`. Guard transport with `activeTransportDetails`, city character with `activeCityCharacter`, and the warning notice with `!isUnresearched`. Scholarship and university sections remain outside these guards.

Within those guarded panels, render `activeRent`, `activeExpenses`, `activeTransportCost`, `activeTransportDetails`, and `activeCityCharacter` rather than reading the optional fields again.

- [ ] **Step 8: Add parallel fallback copy**

Add to the Turkish `citiesGuide` object:

```ts
guidePreparingTitle: "Bu şehir rehberi hazırlanıyor",
guidePreparingBody: "Üniversite ve bölgesel burs bağlantılarını inceleyebilirsiniz. Araştırılmamış fiyat veya yaşam iddiası göstermiyoruz.",
```

Add to the English `citiesGuide` object:

```ts
guidePreparingTitle: "This city guide is being prepared",
guidePreparingBody: "You can still explore its universities and regional scholarship links. We do not show unresearched cost or lifestyle claims.",
```

- [ ] **Step 9: Run focused verification**

```bash
npm run check:cities
npm run check:routes
npm run lint -- types/cities.ts lib/cities/data.ts lib/cities/normalization.ts components/cities/CityGuidesExplorer.tsx lib/translations.ts scripts/check-cities-data.mjs
```

Expected: all commands PASS; `Piemonte` no longer appears as a city option when the normalizer is used.

- [ ] **Step 10: Commit the honest fallback boundary**

```bash
git add types/cities.ts lib/cities/data.ts lib/cities/normalization.ts components/cities/CityGuidesExplorer.tsx lib/translations.ts scripts/check-cities-data.mjs
git commit -m "fix(cities): remove fabricated guide fallback"
```

---

### Task 3: Research and integrate Wave 1

**Files:**
- Create ignored: `city-content-research/results/aosta.yaml`
- Create ignored: `city-content-research/results/bergamo.yaml`
- Create ignored: `city-content-research/results/brescia.yaml`
- Create ignored: `city-content-research/results/bolzano.yaml`
- Create ignored: `city-content-research/results/castellanza.yaml`
- Create ignored: `city-content-research/results/udine.yaml`
- Create ignored: `city-content-research/results/perugia.yaml`
- Create ignored: `city-content-research/results/camerino.yaml`
- Create ignored: `city-content-research/results/urbino.yaml`
- Create: `lib/cities/tieredData.ts`
- Modify: `scripts/check-cities-data.mjs`
- Test: `scripts/check-cities-data.mjs`

**Interfaces:**
- Consumes: `TieredCityRecord`, `CityCostTier`, and the research field contract.
- Produces: `TIERED_CITY_RECORDS: TieredCityRecord[]` containing nine source-checked Wave 1 records.

- [ ] **Step 1: Confirm clean ownership and ignored output**

Run:

```bash
git status --short
git check-ignore -v city-content-research/results/aosta.yaml
```

Expected: the first command shows no unexpected overlapping edits; the second points to the city-results `.gitignore` rule.

- [ ] **Step 2: Dispatch the three Wave 1 research groups**

Dispatch at most three web research agents concurrently with these exact assignments:

- Agent A: `Aosta, Bergamo, Brescia`
- Agent B: `Bolzano, Castellanza, Udine`
- Agent C: `Perugia, Camerino, Urbino`

Append this exact contract to every assignment:

```text
Research each assigned ItalyPath student-city guide. Return one YAML mapping per city with every field from TieredCityRecord: slug, name, nameEn, cityNameIt, altNames, region, placeHierarchy, optional primaryStudentBase, costTier, costCluster, costTierRationale, historyShort, historyShortEn, historySourceTitle, historySourceUrl, transportDetails, transportDetailsEn, climateAndVibe, climateAndVibeEn, transportSourceUrls, sourceRetrievedAt, sourceConfidence, reviewStatus, reviewPriority, uncertain.

History must be a 2-3 sentence TR/EN paraphrase of a direct Wikipedia article, never copied. Transport must use at least one official university, municipality, or transit-operator source and omit schedules and volatile fares. City character must be concise and student-relevant. Do not research Numbeo, listings, student population, or editorial tips. Assign only budget, balanced, or high using the approved ItalyPath bands; explain the classification in costTierRationale. Use the actual ISO retrieval date. Set reviewStatus to draft. Put unresolved facts in uncertain rather than guessing. Return sources as direct URLs.
```

- [ ] **Step 3: Save the nine raw mappings with no prose wrapper**

Use `apply_patch` to write each agent result to its exact ignored YAML path. One file contains one city mapping. Do not combine cities and do not add Markdown fences.

- [ ] **Step 4: Perform source and parity review**

For every Wave 1 file, verify all of the following before changing `reviewStatus` to `source-checked`:

- `historySourceUrl` is a direct `wikipedia.org/wiki/` article.
- TR and EN histories contain the same dates, people, places, and events.
- `transportSourceUrls` contains at least one official source.
- TR and EN transport text names the same modes and nodes.
- No schedule, current fare, exact rent claim, Numbeo URL, student count, or unsourced safety claim appears.
- `costTier` is one of the three approved values and `costTierRationale` explains the city-scale or premium factor.
- Aosta keeps Italian/French variants; Bolzano keeps `Bolzano/Bozen`; Castellanza does not generalize LIUC residence facts to the municipality.
- Every uncertainty is explicit; an empty list is written as `uncertain: []`.

- [ ] **Step 5: Add a failing nine-record regression contract**

Read `lib/cities/tieredData.ts` in `check-cities-data.mjs` and define:

```js
const tieredCityDataPath = new URL("../lib/cities/tieredData.ts", import.meta.url);
const tieredCityDataSource = readFileSync(tieredCityDataPath, "utf8");

const expectedTieredSlugs = [
  "aosta",
  "bergamo",
  "brescia",
  "bolzano",
  "castellanza",
  "udine",
  "perugia",
  "camerino",
  "urbino",
];

for (const slug of expectedTieredSlugs) {
  assertIncludes(tieredCityDataSource, `slug: "${slug}"`, `Missing tiered city ${slug}.`);
}

assertIncludes(tieredCityDataSource, 'reviewStatus: "source-checked"', "Runtime city data must be source checked.");
assertIncludes(tieredCityDataSource, "wikipedia.org/wiki/", "Tiered city histories need Wikipedia attribution.");
assertIncludes(tieredCityDataSource, "transportSourceUrls:", "Tiered city records need transport sources.");
```

- [ ] **Step 6: Run the check and confirm it fails**

```bash
npm run check:cities
```

Expected: FAIL because `lib/cities/tieredData.ts` does not exist.

- [ ] **Step 7: Create the runtime array from reviewed YAML only**

Create `lib/cities/tieredData.ts` with the import and opening declaration:

```ts
import type { TieredCityRecord } from "@/types/cities";

export const TIERED_CITY_RECORDS = [
```

Insert the nine complete mappings from the accepted YAML files, then close the file with:

```ts
] satisfies TieredCityRecord[];
```

Preserve source URLs, retrieval dates, review priority, and uncertainty arrays. Do not copy `reviewStatus: draft` into runtime; every runtime record must be `source-checked`.

- [ ] **Step 8: Verify Wave 1**

```bash
npm run check:cities
npm run lint -- lib/cities/tieredData.ts scripts/check-cities-data.mjs
git status --ignored --short city-content-research/results lib/cities/tieredData.ts
```

Expected: checks PASS; nine YAML files appear ignored; only `tieredData.ts` and the check script are trackable.

- [ ] **Step 9: Commit Wave 1 runtime data**

```bash
git add lib/cities/tieredData.ts scripts/check-cities-data.mjs
git commit -m "data(cities): add first researched city wave"
```

---

### Task 4: Research and integrate Wave 2

**Files:**
- Create ignored: `city-content-research/results/cagliari.yaml`
- Create ignored: `city-content-research/results/sassari.yaml`
- Create ignored: `city-content-research/results/palermo.yaml`
- Create ignored: `city-content-research/results/catania.yaml`
- Create ignored: `city-content-research/results/messina.yaml`
- Create ignored: `city-content-research/results/reggio-calabria.yaml`
- Create ignored: `city-content-research/results/casamassima.yaml`
- Create ignored: `city-content-research/results/lecce.yaml`
- Create ignored: `city-content-research/results/pescara.yaml`
- Modify: `lib/cities/tieredData.ts`
- Modify: `scripts/check-cities-data.mjs`
- Test: `scripts/check-cities-data.mjs`

**Interfaces:**
- Consumes: The exact `TieredCityRecord` array created in Task 3.
- Produces: The same `TIERED_CITY_RECORDS` export expanded to 18 source-checked records.

- [ ] **Step 1: Dispatch the three Wave 2 groups**

Dispatch at most three web research agents concurrently:

- Agent A: `Cagliari, Sassari, Palermo`
- Agent B: `Catania, Messina, Reggio Calabria`
- Agent C: `Casamassima, Lecce, Pescara`

Append this exact contract to every assignment:

```text
Research each assigned ItalyPath student-city guide. Return one YAML mapping per city with every field from TieredCityRecord: slug, name, nameEn, cityNameIt, altNames, region, placeHierarchy, optional primaryStudentBase, costTier, costCluster, costTierRationale, historyShort, historyShortEn, historySourceTitle, historySourceUrl, transportDetails, transportDetailsEn, climateAndVibe, climateAndVibeEn, transportSourceUrls, sourceRetrievedAt, sourceConfidence, reviewStatus, reviewPriority, uncertain.

History must be a 2-3 sentence TR/EN paraphrase of a direct Wikipedia article, never copied. Transport must use at least one official university, municipality, or transit-operator source and omit schedules and volatile fares. City character must be concise and student-relevant. Do not research Numbeo, listings, student population, or editorial tips. Assign only budget, balanced, or high using the approved ItalyPath bands; explain the classification in costTierRationale. Use the actual ISO retrieval date. Set reviewStatus to draft. Put unresolved facts in uncertain rather than guessing. Return sources as direct URLs.
```

- [ ] **Step 2: Save and review all nine Wave 2 YAML mappings**

Write each result to the exact ignored path listed above. Before setting `reviewStatus` to `source-checked`, verify:

- `historySourceUrl` is a direct `wikipedia.org/wiki/` article.
- TR and EN histories contain the same dates, people, places, and events.
- `transportSourceUrls` contains at least one official source.
- TR and EN transport text names the same modes and nodes.
- No schedule, current fare, exact rent claim, Numbeo URL, student count, or unsourced safety claim appears.
- `costTier` is one of the three approved values and `costTierRationale` explains the city-scale or premium factor.
- Every uncertainty is explicit; an empty list is written as `uncertain: []`.

Also enforce these Wave 2 rules:

- Distinguish Sardinian island context from an automatic `high` tier; the rationale must justify the chosen band.
- Keep Catania, Messina, Palermo, and Reggio Calabria histories city-specific rather than generic southern-Italy summaries.
- Pescara must explain the Chieti–Pescara university footprint without creating a separate Chieti guide.
- Casamassima must distinguish the campus municipality from any wider Bari travel corridor.

- [ ] **Step 3: Extend the expected slug contract before runtime data**

Append these slugs to `expectedTieredSlugs`:

```js
"cagliari",
"sassari",
"palermo",
"catania",
"messina",
"reggio-calabria",
"casamassima",
"lecce",
"pescara",
```

Run `npm run check:cities` and confirm FAIL for the first missing Wave 2 slug.

- [ ] **Step 4: Append the nine reviewed records**

Translate the accepted Wave 2 YAML mappings field-for-field into `TIERED_CITY_RECORDS`. Keep a single array export; do not create a second data registry.

- [ ] **Step 5: Verify Wave 2**

```bash
npm run check:cities
npm run lint -- lib/cities/tieredData.ts scripts/check-cities-data.mjs
git status --ignored --short city-content-research/results lib/cities/tieredData.ts
```

Expected: checks PASS and 18 runtime records are covered.

- [ ] **Step 6: Commit Wave 2 runtime data**

```bash
git add lib/cities/tieredData.ts scripts/check-cities-data.mjs
git commit -m "data(cities): add second researched city wave"
```

---

### Task 5: Research and integrate Wave 3

**Files:**
- Create ignored: `city-content-research/results/cassino.yaml`
- Create ignored: `city-content-research/results/viterbo.yaml`
- Create ignored: `city-content-research/results/teramo.yaml`
- Create ignored: `city-content-research/results/cenova.yaml`
- Create ignored: `city-content-research/results/ferrara.yaml`
- Create ignored: `city-content-research/results/macerata.yaml`
- Create ignored: `city-content-research/results/pollenzo.yaml`
- Modify: `lib/cities/tieredData.ts`
- Modify: `scripts/check-cities-data.mjs`
- Test: `scripts/check-cities-data.mjs`

**Interfaces:**
- Consumes: The 18-record array from Task 4.
- Produces: The final exact 25-record `TIERED_CITY_RECORDS` export.

- [ ] **Step 1: Dispatch the three Wave 3 groups**

Dispatch at most three web research agents concurrently:

- Agent A: `Cassino, Viterbo, Teramo`
- Agent B: `Cenova, Ferrara, Macerata`
- Agent C: `Pollenzo`

Append this exact contract to every assignment:

```text
Research each assigned ItalyPath student-city guide. Return one YAML mapping per city with every field from TieredCityRecord: slug, name, nameEn, cityNameIt, altNames, region, placeHierarchy, optional primaryStudentBase, costTier, costCluster, costTierRationale, historyShort, historyShortEn, historySourceTitle, historySourceUrl, transportDetails, transportDetailsEn, climateAndVibe, climateAndVibeEn, transportSourceUrls, sourceRetrievedAt, sourceConfidence, reviewStatus, reviewPriority, uncertain.

History must be a 2-3 sentence TR/EN paraphrase of a direct Wikipedia article, never copied. Transport must use at least one official university, municipality, or transit-operator source and omit schedules and volatile fares. City character must be concise and student-relevant. Do not research Numbeo, listings, student population, or editorial tips. Assign only budget, balanced, or high using the approved ItalyPath bands; explain the classification in costTierRationale. Use the actual ISO retrieval date. Set reviewStatus to draft. Put unresolved facts in uncertain rather than guessing. Return sources as direct URLs.
```

- [ ] **Step 2: Save and review all seven Wave 3 YAML mappings**

Before setting `reviewStatus` to `source-checked`, verify:

- `historySourceUrl` is a direct `wikipedia.org/wiki/` article.
- TR and EN histories contain the same dates, people, places, and events.
- `transportSourceUrls` contains at least one official source.
- TR and EN transport text names the same modes and nodes.
- No schedule, current fare, exact rent claim, Numbeo URL, student count, or unsourced safety claim appears.
- `costTier` is one of the three approved values and `costTierRationale` explains the city-scale or premium factor.
- Every uncertainty is explicit; an empty list is written as `uncertain: []`.

Also enforce these Wave 3 rules:

- `Cenova` remains the Turkish display name, while `cityNameIt` is `Genova` and aliases support English/Italian source matching.
- Pollenzo is marked as a hamlet/frazione, `primaryStudentBase` is Bra, and tier rationale is based on real student life in Bra rather than an isolated hamlet assumption.
- Cassino, Viterbo, Teramo, Ferrara, and Macerata retain distinct histories and mobility nodes.

- [ ] **Step 3: Lock the final exact slug list**

Append:

```js
"cassino",
"viterbo",
"teramo",
"cenova",
"ferrara",
"macerata",
"pollenzo",
```

Then add:

```js
const tieredSlugCount = (tieredCityDataSource.match(/\n\s+slug: "/g) || []).length;
if (tieredSlugCount !== 25) {
  throw new Error(`Expected 25 tiered city records, found ${tieredSlugCount}.`);
}
```

Run `npm run check:cities` and confirm FAIL before appending the data.

- [ ] **Step 4: Append the final seven records**

Translate the seven accepted YAML mappings field-for-field into the existing array. Confirm the array contains exactly the 25 approved cities and no `Piemonte` record.

- [ ] **Step 5: Verify the completed dataset**

```bash
npm run check:cities
npm run lint -- lib/cities/tieredData.ts scripts/check-cities-data.mjs
rg -n 'slug: "piemonte"|Numbeo' lib/cities/tieredData.ts
```

Expected: checks PASS; the final `rg` command returns no matches.

- [ ] **Step 6: Commit Wave 3 runtime data**

```bash
git add lib/cities/tieredData.ts scripts/check-cities-data.mjs
git commit -m "data(cities): complete researched city guides"
```

---

### Task 6: Compose the combined catalog and fix all name resolution

**Files:**
- Modify: `lib/cities/data.ts:1-449`
- Modify: `components/cities/CityGuidesExplorer.tsx:24-33,163-188,301-380`
- Modify: `scripts/check-cities-data.mjs`
- Test: `scripts/check-cities-data.mjs`
- Test: `scripts/check-hub-onboarding.mjs`

**Interfaces:**
- Consumes: `TIERED_CITY_RECORDS` and `materializeTieredCity`.
- Produces: `CURATED_CITIES` with 42 records and a single `getCityDetailByName(name)` resolver supporting slug, TR, EN, Italian, and aliases.

- [ ] **Step 1: Add failing catalog-composition checks**

Add:

```js
assertIncludes(source, 'import { materializeTieredCity } from "@/lib/cities/costTiers"', "City data must use the tier materializer.");
assertIncludes(source, 'import { TIERED_CITY_RECORDS } from "@/lib/cities/tieredData"', "City data must import researched records.");
assertIncludes(source, "...TIERED_CITY_RECORDS.map(materializeTieredCity)", "Combined city catalog is incomplete.");
assertIncludes(source, "...(city.altNames ?? [])", "City name resolution must include aliases.");
assertNotIncludes(cityExplorerSource, "getCityDetailBySlug(city.name)", "City labels must resolve by name, not treat names as slugs.");
```

Run `npm run check:cities` and confirm FAIL.

- [ ] **Step 2: Preserve the 17-record array and compose the export**

Rename the existing declaration without changing its object literals:

```ts
-export const CURATED_CITIES: CityDetail[] = [
+const LEGACY_CURATED_CITIES: CityDetail[] = [
```

Add the imports at the top:

```ts
import { materializeTieredCity } from "@/lib/cities/costTiers";
import { TIERED_CITY_RECORDS } from "@/lib/cities/tieredData";
```

Keep the existing `import type { CityDetail } from "@/types/cities";` line exactly once.

After the existing 17-record array closes, add:

```ts
export const CURATED_CITIES: CityDetail[] = [
  ...LEGACY_CURATED_CITIES,
  ...TIERED_CITY_RECORDS.map(materializeTieredCity),
];
```

Do not reformat or rewrite the 17 object literals.

- [ ] **Step 3: Implement one normalized name resolver**

Replace `getCityDetailByName` with:

```ts
export function getCityDetailByName(name: string): CityDetail | undefined {
  const normalized = name.toLowerCase().trim();

  return CURATED_CITIES.find((city) =>
    [city.slug, city.name, city.nameEn, city.cityNameIt, ...(city.altNames ?? [])]
      .filter((candidate): candidate is string => Boolean(candidate))
      .some((candidate) => candidate.toLowerCase().trim() === normalized)
  );
}
```

Keep `getCityDetailBySlug` for true slug callers.

- [ ] **Step 4: Replace every Explorer name-as-slug call**

Import `getCityDetailByName`. Resolve `activeCity` with:

```ts
const curated = getCityDetailByName(name) || getCityDetailByName(canonicalSelection);
```

Replace all three English city-label lookups with `getCityDetailByName(city.name)?.nameEn`. No `getCityDetailBySlug(city.name)` call remains.

Remove `getCityDetailBySlug` from the Explorer import when it has no remaining caller.

- [ ] **Step 5: Verify city and Hub consumers**

```bash
npm run check:cities
npm run check:hub-onboarding
npm run lint -- lib/cities/data.ts components/cities/CityGuidesExplorer.tsx scripts/check-cities-data.mjs
```

Expected: all commands PASS; Hub city picks can consume new records because they only require names and slugs.

- [ ] **Step 6: Commit catalog composition**

```bash
git add lib/cities/data.ts components/cities/CityGuidesExplorer.tsx scripts/check-cities-data.mjs
git commit -m "feat(cities): compose researched guide catalog"
```

---

### Task 7: Render history attribution and tier provenance

**Files:**
- Modify: `components/cities/CityGuidesExplorer.tsx:224-225,402-520`
- Modify: `lib/translations.ts:864-901,1853-1890`
- Modify: `scripts/check-cities-data.mjs`
- Test: `scripts/check-cities-data.mjs`

**Interfaces:**
- Consumes: Materialized `history*`, `sourceRetrievedAt`, `costModel`, and `costModelVersion` fields.
- Produces: Conditional “Kısaca tarih” UI and translated ItalyPath tier-source labeling.

- [ ] **Step 1: Add failing UI and translation assertions**

Add:

```js
assertIncludes(cityExplorerSource, "copy.historyTitle", "History panel heading is missing.");
assertIncludes(cityExplorerSource, "activeCity.historySourceUrl", "History attribution link is missing.");
assertIncludes(cityExplorerSource, 'activeCity.costModel === "italypath-tier"', "Tier cost provenance is missing.");
assertIncludes(translationsSource, 'historyTitle: "Kısaca tarih"', "Turkish history heading is required.");
assertIncludes(translationsSource, 'historyTitle: "A brief history"', "English history heading is required.");
assertIncludes(translationsSource, 'tierCostSource: "ItalyPath yaklaşık öğrenci bütçesi"', "Turkish tier provenance is required.");
assertIncludes(translationsSource, 'tierCostSource: "ItalyPath approximate student budget"', "English tier provenance is required.");
```

Run `npm run check:cities` and confirm FAIL.

- [ ] **Step 2: Add exact parallel copy**

Add to Turkish `citiesGuide`:

```ts
historyTitle: "Kısaca tarih",
historySourceLabel: "Wikipedia kaynağı",
sourceAccessed: "erişim",
tierCostSource: "ItalyPath yaklaşık öğrenci bütçesi",
costModelVersion: "model sürümü",
```

Add to English `citiesGuide`:

```ts
historyTitle: "A brief history",
historySourceLabel: "Wikipedia source",
sourceAccessed: "accessed",
tierCostSource: "ItalyPath approximate student budget",
costModelVersion: "model version",
```

- [ ] **Step 3: Derive active history before render**

```ts
const activeHistory = language === "tr" ? activeCity.historyShort : activeCity.historyShortEn;
```

- [ ] **Step 4: Render the attributed history card**

Immediately after the profile card and before the cost rating, render only when `activeHistory` exists:

```tsx
{activeHistory && (
  <section className="mt-5 rounded-[1.5rem] border border-[var(--editorial-border)] bg-white/45 p-5 sm:p-6">
    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
      <Landmark className="h-3.5 w-3.5 text-[var(--editorial-terracotta)]" />
      {copy.historyTitle}
    </div>
    <p className="text-sm font-medium leading-6 text-[var(--editorial-muted)]">{activeHistory}</p>
    {activeCity.historySourceUrl && activeCity.historySourceTitle && (
      <p className="mt-3 border-t border-[var(--editorial-border)] pt-3 text-xs text-[var(--editorial-muted)]">
        {copy.historySourceLabel}:{" "}
        <a
          href={activeCity.historySourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--editorial-terracotta)] underline-offset-4 hover:underline"
        >
          {activeCity.historySourceTitle}
        </a>
        {activeCity.sourceRetrievedAt && ` · ${copy.sourceAccessed}: ${activeCity.sourceRetrievedAt}`}
      </p>
    )}
  </section>
)}
```

- [ ] **Step 5: Branch cost provenance without changing legacy sources**

In the living-cost source footer, change the current `activeCity.costSourceName` conditional into a tier-first ternary. The first branch is:

```tsx
activeCity.costModel === "italypath-tier" ? (
  <div className="mt-4 border-t border-[var(--editorial-border)] pt-3 text-xs leading-5 text-[var(--editorial-muted)]">
    <span className="font-semibold text-[var(--editorial-ink)]">{copy.costSourceLabel}: </span>
    <span className="font-semibold text-[var(--editorial-ink)]">{copy.tierCostSource}</span>
    {activeCity.costModelVersion && ` · ${copy.costModelVersion}: ${activeCity.costModelVersion}`}
  </div>
)
```

Use the existing external-source JSX verbatim as the `activeCity.costSourceName` second branch and return `null` when neither branch applies. Do not alter the existing external link, label, or last-updated behavior.

- [ ] **Step 6: Run focused verification**

```bash
npm run check:cities
npm run lint -- components/cities/CityGuidesExplorer.tsx lib/translations.ts scripts/check-cities-data.mjs
```

Expected: PASS. Existing 17 cities have no history card; new 25 have one; tiered cities show no Numbeo link.

- [ ] **Step 7: Commit history and provenance UI**

```bash
git add components/cities/CityGuidesExplorer.tsx lib/translations.ts scripts/check-cities-data.mjs
git commit -m "feat(cities): show sourced city histories"
```

---

### Task 8: Harden final validation, document the architecture, and run acceptance

**Files:**
- Modify: `scripts/check-cities-data.mjs`
- Modify: `AGENT_CONTEXT.md: Cities section and Agent Rules`
- Verify: `app/cities/page.tsx`
- Verify: `lib/hub/recommendations.ts`
- Verify: `components/hub/CityPicksBlock.tsx`

**Interfaces:**
- Consumes: The final 42-record combined catalog and all UI/data contracts.
- Produces: Permanent checks and current project documentation.

- [ ] **Step 1: Add final forbidden-content and completeness checks**

Ensure `check-cities-data.mjs` contains one final `expectedTieredSlugs` array with all 25 approved slugs and add:

```js
assertNotIncludes(tieredCityDataSource, 'slug: "piemonte"', "Piemonte is not a city guide.");
assertNotIncludes(tieredCityDataSource, "Numbeo", "Tiered records must not use city-by-city Numbeo data.");
assertNotIncludes(tieredCityDataSource, 'reviewStatus: "draft"', "Draft research must not enter runtime.");
assertNotIncludes(tieredCityDataSource, "studentPopulation:", "Tiered scope excludes student-population claims.");
assertNotIncludes(tieredCityDataSource, "editorialTip:", "Tiered scope excludes long editorial tips.");
assertIncludes(cityExplorerSource, 'activeCity.contentStatus === "unresearched"', "Unknown-city UI must remain honest.");
```

Add a concrete block extractor and required-field loop:

```js
function extractTieredCityBlock(slug) {
  const marker = `slug: "${slug}"`;
  const start = tieredCityDataSource.indexOf(marker);
  if (start === -1) throw new Error(`Missing tiered city ${slug}.`);
  const next = tieredCityDataSource.indexOf('\n    slug: "', start + marker.length);
  return tieredCityDataSource.slice(start, next === -1 ? tieredCityDataSource.length : next);
}

const requiredTieredFields = [
  "name",
  "nameEn",
  "cityNameIt",
  "altNames",
  "region",
  "placeHierarchy",
  "costTier",
  "costCluster",
  "costTierRationale",
  "historyShort",
  "historyShortEn",
  "historySourceTitle",
  "historySourceUrl",
  "transportDetails",
  "transportDetailsEn",
  "climateAndVibe",
  "climateAndVibeEn",
  "transportSourceUrls",
  "sourceRetrievedAt",
  "sourceConfidence",
  "reviewStatus",
  "reviewPriority",
  "uncertain",
];

for (const slug of expectedTieredSlugs) {
  const block = extractTieredCityBlock(slug);
  for (const field of requiredTieredFields) {
    assertIncludes(block, `${field}:`, `${slug} is missing ${field}.`);
  }
  const transportSources = block.slice(
    block.indexOf("transportSourceUrls:"),
    block.indexOf("sourceRetrievedAt:")
  );
  assertIncludes(transportSources, "https://", `${slug} needs an official transport source.`);
}
```

- [ ] **Step 2: Run the permanent city contract**

```bash
npm run check:cities
```

Expected: PASS with `[OK] City data source checks passed.`

- [ ] **Step 3: Perform the live read-only city preflight**

Run this read-only query; request network approval if the sandbox blocks Supabase DNS:

```bash
node --env-file=.env.local --input-type=module -e 'import { createClient } from "@supabase/supabase-js"; const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}); const {data,error}=await db.from("universities").select("id,name,city").order("id"); if(error) throw error; const excluded=new Set(["benevento / online","piemonte"]); const aliases=new Map([["napoli / caserta","Napoli"],["uzaktan eğitim / roma","Roma"]]); const visible=[...new Set((data??[]).map(row=>{const raw=(row.city??"").trim(); if(!raw||excluded.has(raw.toLowerCase())) return null; return aliases.get(raw.toLowerCase())??raw;}).filter(Boolean))]; const upo=(data??[]).filter(row=>row.name.includes("Piemonte Orientale")); console.log(JSON.stringify({rowCount:data?.length??0,visibleCityCount:visible.length,piemonteVisible:visible.includes("Piemonte"),upoRows:upo.length},null,2));'
```

Expected on the current dataset: `rowCount: 64`, `visibleCityCount: 42`, `piemonteVisible: false`, `upoRows: 1`. If row counts changed legitimately, investigate the new rows; `piemonteVisible` must still be false and `upoRows` must remain nonzero.

- [ ] **Step 4: Update the project knowledge base**

Update the Cities section in `AGENT_CONTEXT.md` to state:

- the combined catalog contains 17 legacy exact/source records plus 25 tiered researched records;
- tiered costs come from `lib/cities/costTiers.ts` with model version `2026-08`;
- `lib/cities/tieredData.ts` stores source-checked TR/EN history, transport, character, and audit metadata;
- raw research outputs live under ignored `city-content-research/results/`;
- unknown cities show an honest unresearched state;
- `Piemonte` is excluded from city guides only, while UPO university/program data remains available;
- the permanent validation command is `npm run check:cities`.

Add an Agent Rule forbidding generic city fallback claims and city-by-city price duplication for tiered records.

- [ ] **Step 5: Run the full regression suite**

```bash
npm run check:cities
npm run check:routes
npm run check:hub-onboarding
npm run lint
npm run build
git diff --check
```

Expected: every command PASS. A pre-existing failure outside city-owned files must be documented with its exact command and error; do not mask it by weakening city checks.

- [ ] **Step 6: Perform manual city-atlas acceptance**

Run `npm run dev` and verify:

1. `/cities?city=milano` retains Numbeo provenance and no history card.
2. `/cities?city=aosta` shows a Wikipedia-attributed history and tier provenance.
3. `/cities?city=cenova` renders English as Genoa and retains the `cenova` app slug.
4. `/cities?city=pollenzo` explains Bra as the student base.
5. `/cities?city=piemonte` does not select or display a Piemonte guide.
6. Switching TR/EN preserves fact parity and never reveals blank population or tip labels.
7. Mobile selector, desktop directory, reduced motion, bursary card, and university links continue to work.

Stop the dev server after verification.

- [ ] **Step 7: Commit validation and documentation**

```bash
git add scripts/check-cities-data.mjs AGENT_CONTEXT.md
git commit -m "docs(cities): document researched guide catalog"
```

- [ ] **Step 8: Inspect final scope**

```bash
git status --short
git log --oneline -8
```

Expected: no raw YAML research result is staged or committed; only the planned city files and documentation changed across the task commits.
