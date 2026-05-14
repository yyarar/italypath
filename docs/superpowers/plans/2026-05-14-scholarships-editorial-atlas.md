# Scholarships Editorial Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/scholarships` as a map-first editorial atlas where the selected region's official institution and official source links are the primary hierarchy.

**Architecture:** Keep the existing Server Component route and client `ScholarshipsExplorer` leaf, but refactor the client leaf into focused internal components. Preserve local GeoJSON loading, URL-synced `?region=`, language context, keyboard map interaction, and the existing `lib/scholarships/regions.ts` data contract. Add a source-level smoke check that prevents the old dashboard styling and verifies the new institution/source hierarchy.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Lucide React, existing `LanguageContext`, local GeoJSON SVG map rendering.

---

## File Structure

- Modify `components/scholarships/ScholarshipsExplorer.tsx`: redesign the page and split the client leaf into internal components:
  - `ScholarshipsTopBar`
  - `ScholarshipsIntro`
  - `ScholarshipMap`
  - `RegionFilePanel`
  - `RegionQuickFacts`
  - `RegionRail`
- Modify `lib/translations.ts`: add TR/EN copy for institution-first labels and remove unused map-header style copy from the visible hierarchy where practical.
- Modify `app/scholarships/page.tsx`: align the Suspense fallback with the new warm editorial skeleton.
- Create `scripts/check-scholarships-editorial-atlas.mjs`: source smoke check for required labels and forbidden old UI tokens.
- Modify `package.json`: add `check:scholarships-ui`.

---

### Task 1: Add The Editorial Atlas Smoke Check

**Files:**
- Create: `scripts/check-scholarships-editorial-atlas.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing smoke check**

Create `scripts/check-scholarships-editorial-atlas.mjs` with this content:

```js
import { readFileSync } from "node:fs";

const explorer = readFileSync("components/scholarships/ScholarshipsExplorer.tsx", "utf8");
const page = readFileSync("app/scholarships/page.tsx", "utf8");
const translations = readFileSync("lib/translations.ts", "utf8");

const failures = [];

function requireToken(source, token, label) {
  if (!source.includes(token)) {
    failures.push(`${label} is missing required token: ${token}`);
  }
}

function forbidToken(source, token, label) {
  if (source.includes(token)) {
    failures.push(`${label} contains forbidden old UI token: ${token}`);
  }
}

for (const token of [
  "ScholarshipsTopBar",
  "ScholarshipsIntro",
  "ScholarshipMap",
  "RegionFilePanel",
  "RegionQuickFacts",
  "RegionRail",
  "institutionFileTitle",
  "officialSources",
  "managingBodies",
]) {
  requireToken(explorer, token, "ScholarshipsExplorer");
}

for (const token of [
  "institutionFileTitle",
  "sourceChecklistTitle",
  "regionRailTitle",
  "selectedRegionLabel",
]) {
  requireToken(translations, token, "translations");
}

for (const token of [
  "bg-[#e9eaec]",
  "bg-rose-600",
  "bg-blue-600",
  "rounded-2xl",
  "rounded-3xl",
  "statusVerified",
]) {
  forbidToken(explorer, token, "ScholarshipsExplorer");
}

forbidToken(page, "bg-[#e9eaec]", "scholarships page fallback");

if (failures.length > 0) {
  console.error("[FAIL] Scholarships editorial atlas check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Scholarships editorial atlas check passed.");
```

- [ ] **Step 2: Add the package script**

In `package.json`, add:

```json
"check:scholarships-ui": "node scripts/check-scholarships-editorial-atlas.mjs"
```

- [ ] **Step 3: Run RED**

Run:

```bash
npm run check:scholarships-ui
```

Expected: FAIL with missing component tokens and old UI tokens such as `bg-[#e9eaec]`, `bg-rose-600`, or `bg-blue-600`.

---

### Task 2: Add Institution-First Translation Copy

**Files:**
- Modify: `lib/translations.ts`

- [ ] **Step 1: Add TR keys under `scholarships`**

Add these keys to the Turkish `scholarships` object:

```ts
pageIdentity: "ItalyPath Burs Atlası",
intro: "İtalya'da burs işleri bölge bazlı yürür. Haritadan bölge seç, yetkili kurumu ve resmi kaynak sayfalarını hızlıca aç.",
institutionFileTitle: "Kurum Dosyası",
selectedRegionLabel: "Seçili bölge",
sourceChecklistTitle: "Başvuru öncesi kontrol",
sourceChecklistBody: "Eşikler ve tarihler her akademik yılda değişebilir. Başvuru yapmadan önce en güncel bando metnini resmi kurum sayfasından tekrar doğrula.",
regionRailTitle: "Bölgeler",
verifiedShort: "Doğrulanmış",
pendingShort: "Kayıt seviyesi",
openSource: "Kaynağı aç",
openInstitution: "Kurumu aç",
secondaryFacts: "İkincil bilgiler",
mapTitle: "İtalya burs bölgeleri",
```

- [ ] **Step 2: Add EN keys under `scholarships`**

Add these keys to the English `scholarships` object:

```ts
pageIdentity: "ItalyPath Scholarship Atlas",
intro: "Scholarship processes in Italy are regional. Pick a region on the map, then open the official institution and source pages.",
institutionFileTitle: "Institution File",
selectedRegionLabel: "Selected region",
sourceChecklistTitle: "Pre-application check",
sourceChecklistBody: "Thresholds and dates can change every academic year. Before applying, re-check the latest official call on the institution website.",
regionRailTitle: "Regions",
verifiedShort: "Verified",
pendingShort: "Registry level",
openSource: "Open source",
openInstitution: "Open institution",
secondaryFacts: "Secondary details",
mapTitle: "Italian scholarship regions",
```

---

### Task 3: Implement The Editorial Atlas Explorer

**Files:**
- Modify: `components/scholarships/ScholarshipsExplorer.tsx`

- [ ] **Step 1: Replace old color and layout primitives**

Use warm editorial primitives:

```ts
const REGION_FILL_COLORS = [
  '#d7e0d7', '#cbd8cf', '#e0ded2', '#d1dccf', '#e5dccf',
  '#cfdad4', '#ded7ca', '#d9e2d8', '#c9d6cc', '#e2ddcf',
  '#d3ddd5', '#dad6ca', '#cdd9d0', '#e4dbce', '#d1ddd7',
  '#d8decf', '#cbd8d3', '#e1dacd', '#d4dfd6', '#dcd6ca',
] as const;
const ACTIVE_REGION_FILL = '#285f68';
const MAP_INK = '#28443d';
```

- [ ] **Step 2: Create internal components**

Create internal React components with these concrete prop shapes:

```ts
type MapStatus = 'loading' | 'ready' | 'error';

interface ScholarshipMapProps {
  regionShapes: RegionShape[];
  mapStatus: MapStatus;
  selectedSlug: RegionSlug;
  mapTitle: string;
  mapAlt: string;
  loadingText: string;
  errorText: string;
  openRegionAria: string;
  onSelectRegion: (slug: RegionSlug) => void;
  onRegionKeyDown: (event: KeyboardEvent<SVGPathElement>, slug: RegionSlug) => void;
}

function ScholarshipsTopBar({
  language,
  onToggleLanguage,
}: {
  language: 'tr' | 'en';
  onToggleLanguage: () => void;
}) {
  return null;
}

function ScholarshipsIntro({
  title,
  intro,
  verifiedAsOf,
}: {
  title: string;
  intro: string;
  verifiedAsOf: string;
}) {
  return null;
}

function ScholarshipMap(props: ScholarshipMapProps) {
  return null;
}

function RegionFilePanel({
  region,
  language,
}: {
  region: ScholarshipRegionRecord;
  language: 'tr' | 'en';
}) {
  return null;
}

function RegionQuickFacts({ region }: { region: ScholarshipRegionRecord }) {
  return null;
}

function RegionRail({
  selectedSlug,
  onSelectRegion,
}: {
  selectedSlug: RegionSlug;
  onSelectRegion: (slug: RegionSlug) => void;
}) {
  return null;
}
```

- [ ] **Step 3: Render the new page composition**

The default export should render this high-level structure:

```tsx
<div className="min-h-screen bg-[var(--editorial-paper)] pb-12 text-[var(--editorial-ink)]">
  <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
    <ScholarshipsTopBar language={language} onToggleLanguage={toggleLanguage} />
    <ScholarshipsIntro title={t.scholarships.title} intro={t.scholarships.intro} verifiedAsOf={t.scholarships.verifiedAsOf} />
    <main className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:items-start">
      <ScholarshipMap
        regionShapes={regionShapes}
        mapStatus={mapStatus}
        selectedSlug={selectedSlug}
        mapTitle={t.scholarships.mapTitle}
        mapAlt={t.scholarships.mapAlt}
        loadingText={t.scholarships.mapLoading}
        errorText={t.scholarships.mapError}
        openRegionAria={t.scholarships.openRegionAria}
        onSelectRegion={handleRegionSelect}
        onRegionKeyDown={handleMapKeyDown}
      />
      <RegionFilePanel region={selectedRegion} language={language} />
    </main>
    <RegionRail selectedSlug={selectedSlug} onSelectRegion={handleRegionSelect} />
  </div>
</div>
```

- [ ] **Step 4: Preserve map behavior**

Keep `fetch('/data/italy-regions.geojson?v=2026-05-14')`, `buildRegionShapes`, `router.replace`, keyboard Enter/Space selection, `preserveAspectRatio="xMidYMid meet"`, and `fillRule="evenodd"`.

---

### Task 4: Align The Suspense Fallback

**Files:**
- Modify: `app/scholarships/page.tsx`

- [ ] **Step 1: Replace gray/red/blue skeleton**

Use a warm fallback:

```tsx
function ScholarshipsPageFallback() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <div className="h-10 w-56 rounded-md bg-[#e7ded1]" />
        <div className="mt-10 h-24 max-w-3xl rounded-md bg-[#e7ded1]" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
          <div className="h-[640px] rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-surface)]" />
          <div className="h-[640px] rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-surface)]" />
        </div>
      </div>
    </div>
  );
}
```

---

### Task 5: Verify And Polish

**Files:**
- Modify as needed: `components/scholarships/ScholarshipsExplorer.tsx`, `lib/translations.ts`, `app/scholarships/page.tsx`

- [ ] **Step 1: Run GREEN for smoke check**

Run:

```bash
npm run check:scholarships-ui
```

Expected:

```text
[OK] Scholarships editorial atlas check passed.
```

- [ ] **Step 2: Run route and lint checks**

Run:

```bash
npm run check:routes
npm run lint
```

Expected: both exit 0.

- [ ] **Step 3: Browser verification**

Start or reuse the dev server and open `/scholarships`. Verify:

- Lombardia is selected by default.
- Clicking at least two map regions updates `?region=`.
- Region rail also updates selection.
- Official institution and source links are primary in the panel.
- Mobile width has no horizontal overflow and keeps the region rail usable.
- Keyboard Enter/Space on a map path selects the region.

- [ ] **Step 4: Visual fidelity pass**

Compare the browser screenshot with the accepted concept image at:

```text
/Users/keremyarar/.codex/generated_images/019e25c1-6b7f-7dd1-9bc2-80c155ee32b9/ig_06a405745c84f9e9016a059459c6348191838c3f4662dcb190.png
```

Confirm map-first composition, institution/source-first hierarchy, warm editorial palette, reduced dashboard feeling, mobile-safe region selection, and visible but non-dominating warning copy.
