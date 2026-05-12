# Universities Field Guide Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/universities` as an editorial field-guide school browser while preserving existing search, URL filters, favorites, language, and view-mode behavior.

**Architecture:** Keep `app/universities/page.tsx` as the client route orchestrator and move visual pieces into focused `components/universities/*` files. Extract pure filtering/stat helpers into `lib/universitiesFilters.ts` so behavior can be smoke-checked without rendering React. Add a project script that guards the critical redesign boundaries: no invented department category filters, neutral search copy, no old indigo/glass/card-grid tokens, and equivalent plain-text search behavior.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide React, Clerk/Supabase hooks already present in the project.

---

## File Structure

- Create `lib/universitiesFilters.ts`: pure helpers for type labels, city counts, total department count, localized descriptions, and plain-text filtering.
- Create `components/universities/UniversitiesHero.tsx`: editorial hero, back-home link, language toggle, stats.
- Create `components/universities/UniversitiesFilterBar.tsx`: search, city select, type filters, favorites toggle, view toggle, result count, clear action.
- Create `components/universities/UniversityRows.tsx`: guide row and compact row components.
- Create `components/universities/UniversitiesStates.tsx`: loading skeleton, empty state, and error state.
- Modify `app/universities/page.tsx`: orchestrate hooks, URL sync, derived data, and render the new components.
- Modify `lib/translations.ts`: neutral search copy and new editorial list labels in TR/EN.
- Create `scripts/check-universities-field-guide.mjs`: smoke checks for filtering boundaries and source-level design drift.
- Modify `package.json`: add `check:universities-ui`.

---

### Task 1: Add A Failing Smoke Check For Search Boundaries And Design Drift

**Files:**
- Create: `scripts/check-universities-field-guide.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing smoke check**

Create `scripts/check-universities-field-guide.mjs` with this content:

```js
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const helperPath = resolve(process.cwd(), "lib/universitiesFilters.ts");
if (!existsSync(helperPath)) {
  fail("lib/universitiesFilters.ts is missing");
} else {
  const helperModule = await import(pathToFileURL(helperPath).href);
  const { filterUniversities, getCitiesWithCounts, getTotalDepartments } = helperModule;

  const sampleUniversities = [
    {
      id: 1,
      name: "Sapienza University of Rome",
      city: "Roma",
      type: "Devlet",
      fee: "150€ - 2.924€",
      image: "",
      description: "Roma merkezli okul.",
      description_en: "A Rome-based university.",
      website: "https://example.com",
      features: [],
      departments: [{ name: "Nursing", slug: "nursing", languages: ["en"], durationYears: 3, level: "bachelor" }],
    },
    {
      id: 2,
      name: "Politecnico di Milano",
      city: "Milano",
      type: "Devlet",
      fee: "150€ - 3.898€",
      image: "",
      description: "Teknik okul.",
      description_en: "Technical university.",
      website: "https://example.com",
      features: [],
      departments: [{ name: "Civil Engineering", slug: "civil-engineering", languages: ["en"], durationYears: 3, level: "bachelor" }],
    },
  ];

  const favoriteIds = new Set([2]);
  const isFavorite = (id) => favoriteIds.has(id);

  const nursingResults = filterUniversities(sampleUniversities, {
    searchTerm: "nursing",
    selectedCity: "",
    selectedType: "",
    showFavoritesOnly: false,
    isFavorite,
  });
  if (nursingResults.length !== 1 || nursingResults[0].id !== 1) {
    fail("plain text department search should match only direct department names");
  }

  const categoryResults = filterUniversities(sampleUniversities, {
    searchTerm: "healthcare",
    selectedCity: "",
    selectedType: "",
    showFavoritesOnly: false,
    isFavorite,
  });
  if (categoryResults.length !== 0) {
    fail("search must not infer missing department categories such as healthcare");
  }

  const favoriteResults = filterUniversities(sampleUniversities, {
    searchTerm: "",
    selectedCity: "",
    selectedType: "",
    showFavoritesOnly: true,
    isFavorite,
  });
  if (favoriteResults.length !== 1 || favoriteResults[0].id !== 2) {
    fail("favorites-only filter should use the supplied favorite predicate");
  }

  const cityCounts = getCitiesWithCounts(sampleUniversities);
  if (cityCounts.length !== 2 || cityCounts[0][0] !== "Milano" || cityCounts[1][0] !== "Roma") {
    fail("city counts should be sorted by city name");
  }

  if (getTotalDepartments(sampleUniversities) !== 2) {
    fail("total department count should sum all university departments");
  }
}

const translationsModule = await import(pathToFileURL(resolve(process.cwd(), "lib/translations.ts")).href);
const { translations } = translationsModule;

for (const language of ["tr", "en"]) {
  const placeholder = translations[language].list.searchPlaceholder;
  if (/Nursing|Psychology/i.test(placeholder)) {
    fail(`${language} search placeholder should not use hard-coded department examples`);
  }
}

const sourceFiles = [
  "app/universities/page.tsx",
  "components/universities/UniversitiesHero.tsx",
  "components/universities/UniversitiesFilterBar.tsx",
  "components/universities/UniversityRows.tsx",
  "components/universities/UniversitiesStates.tsx",
].filter((path) => existsSync(resolve(process.cwd(), path)));

const forbiddenTokens = [
  "glass",
  "rounded-3xl",
  "bg-[#f8fafc]",
  "bg-indigo",
  "text-indigo",
  "border-indigo",
  "shadow-indigo",
  "bg-purple",
  "category",
  "Kategori",
  "Nursing, Psychology",
];

for (const file of sourceFiles) {
  const source = read(file);
  for (const token of forbiddenTokens) {
    if (source.includes(token)) {
      fail(`${file} contains forbidden redesign token: ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error("[FAIL] Universities field-guide check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Universities field-guide check passed.");
```

- [ ] **Step 2: Add the package script**

In `package.json`, add this script next to the existing checks:

```json
"check:universities-ui": "node --no-warnings scripts/check-universities-field-guide.mjs"
```

- [ ] **Step 3: Run the check and verify it fails for the right reason**

Run:

```bash
npm run check:universities-ui
```

Expected:

```text
[FAIL] Universities field-guide check failed.
 - lib/universitiesFilters.ts is missing
 - tr search placeholder should not use hard-coded department examples
 - en search placeholder should not use hard-coded department examples
```

The exact source-token failures may include the current old UI tokens. That is acceptable in RED because this task intentionally captures the existing drift.

- [ ] **Step 4: Commit the failing check**

```bash
git add scripts/check-universities-field-guide.mjs package.json
git commit -m "test: add universities field guide smoke check"
```

---

### Task 2: Implement Pure University Filtering Helpers

**Files:**
- Create: `lib/universitiesFilters.ts`
- Test: `scripts/check-universities-field-guide.mjs`

- [ ] **Step 1: Add the helper module**

Create `lib/universitiesFilters.ts`:

```ts
import type { University } from "../app/data";

export const UNIVERSITIES_VIEW_MODE_STORAGE_KEY = "italyPathUniversitiesViewMode";
export const UNIVERSITIES_VIEW_MODE_EVENT = "italypath-universities-view-mode-change";

export type UniversityViewMode = "grid" | "compact";
export type UniversityLanguage = "tr" | "en";

export interface UniversityFilterOptions {
  searchTerm: string;
  selectedCity: string;
  selectedType: string;
  showFavoritesOnly: boolean;
  isFavorite: (universityId: number) => boolean;
}

export function getTypeLabel(type: string, language: UniversityLanguage) {
  if (language === "tr") return type;
  if (type === "Devlet") return "Public";
  if (type === "Özel") return "Private";
  return type;
}

export function getUniversityDescription(university: University, language: UniversityLanguage) {
  if (language === "en" && university.description_en) {
    return university.description_en;
  }

  return university.description;
}

export function getTotalDepartments(universities: University[]) {
  return universities.reduce((total, university) => total + (university.departments?.length ?? 0), 0);
}

export function getCitiesWithCounts(universities: University[]) {
  const cityMap = new Map<string, number>();

  for (const university of universities) {
    cityMap.set(university.city, (cityMap.get(university.city) ?? 0) + 1);
  }

  return [...cityMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

function universityMatchesSearch(university: University, term: string) {
  if (!term) return true;

  const nameMatch = university.name.toLowerCase().includes(term);
  const cityMatch = university.city.toLowerCase().includes(term);
  const departmentMatch = university.departments.some((department) =>
    department.name.toLowerCase().includes(term)
  );

  return nameMatch || cityMatch || departmentMatch;
}

export function filterUniversities(universities: University[], options: UniversityFilterOptions) {
  const term = normalizeSearchTerm(options.searchTerm);

  return universities.filter((university) => {
    const matchesSearch = universityMatchesSearch(university, term);
    const matchesFavorites = options.showFavoritesOnly ? options.isFavorite(university.id) : true;
    const matchesCity = options.selectedCity ? university.city === options.selectedCity : true;
    const matchesType = options.selectedType ? university.type === options.selectedType : true;

    return matchesSearch && matchesFavorites && matchesCity && matchesType;
  });
}
```

- [ ] **Step 2: Run the smoke check**

Run:

```bash
npm run check:universities-ui
```

Expected:

```text
[FAIL] Universities field-guide check failed.
 - tr search placeholder should not use hard-coded department examples
 - en search placeholder should not use hard-coded department examples
```

Old UI token failures may still appear until the page rewrite lands.

- [ ] **Step 3: Commit the helpers**

```bash
git add lib/universitiesFilters.ts
git commit -m "feat: add university filtering helpers"
```

---

### Task 3: Update List Translations For Editorial Search And States

**Files:**
- Modify: `lib/translations.ts`
- Test: `scripts/check-universities-field-guide.mjs`

- [ ] **Step 1: Update the Turkish `list` block**

In `lib/translations.ts`, update and add these keys inside `tr.list`:

```ts
searchPlaceholder: "Okul, şehir veya bölüm adı ara",
results: "sonuç",
favoritesOnly: "Favoriler",
showAll: "Tüm okullar",
noResults: "Bu aramada okul bulunamadı",
noResultsDesc: "Bu kelime mevcut okul, şehir veya bölüm adlarında geçmiyor.",
emptyFav: "Henüz kayıtlı okul yok",
emptyFavDesc: "Favori görünümü açık ama listen boş. Okulları incelerken kalp ikonuyla kaydedebilirsin.",
clearFilters: "Filtreleri temizle",
viewGrid: "Rehber",
viewCompact: "Kompakt",
viewGridAria: "Rehber görünümünü aç",
viewCompactAria: "Kompakt görünümü aç",
review: "İncele",
more: "daha",
heroTitle: "Okul listesini değil, karar haritanı aç.",
heroSubtitle: "İngilizce programları, şehirleri ve okul tiplerini aynı sakin yüzeyde tara. Favorilerini ayır, sonra detay sayfasında derinleş.",
guideLabel: "İtalya okul rehberi",
universitiesStat: "üniversite",
departmentsStat: "program",
citiesStat: "şehir",
filterLabel: "Filtre defteri",
allCities: "Tüm şehirler",
schoolType: "Okul tipi",
publicType: "Devlet",
privateType: "Özel",
resultSummary: "gösteriliyor",
loading: "Okullar hazırlanıyor",
error: "Üniversite verisi yüklenemedi.",
```

- [ ] **Step 2: Update the English `list` block**

In `lib/translations.ts`, update and add these keys inside `en.list`:

```ts
searchPlaceholder: "Search school, city, or department name",
results: "results",
favoritesOnly: "Favorites",
showAll: "All schools",
noResults: "No school found for this search",
noResultsDesc: "This term does not appear in the current school, city, or department names.",
emptyFav: "No saved schools yet",
emptyFavDesc: "Favorites view is on, but your list is empty. Save schools with the heart icon while browsing.",
clearFilters: "Clear filters",
viewGrid: "Guide",
viewCompact: "Compact",
viewGridAria: "Switch to guide view",
viewCompactAria: "Switch to compact view",
review: "Review",
more: "more",
heroTitle: "Open a decision map, not just a school list.",
heroSubtitle: "Scan English-taught programs, cities, and school types in one calm guide surface. Save favorites, then go deeper on each school page.",
guideLabel: "Italy school guide",
universitiesStat: "universities",
departmentsStat: "programs",
citiesStat: "cities",
filterLabel: "Filter notebook",
allCities: "All cities",
schoolType: "School type",
publicType: "Public",
privateType: "Private",
resultSummary: "showing",
loading: "Preparing schools",
error: "University data could not be loaded.",
```

- [ ] **Step 3: Run the smoke check**

Run:

```bash
npm run check:universities-ui
```

Expected:

```text
[FAIL] Universities field-guide check failed.
```

At this point, placeholder failures should be gone. Remaining failures should be old UI source-token failures from `app/universities/page.tsx`.

- [ ] **Step 4: Commit translation changes**

```bash
git add lib/translations.ts
git commit -m "feat: update universities editorial copy"
```

---

### Task 4: Build The Editorial University Components

**Files:**
- Create: `components/universities/UniversitiesHero.tsx`
- Create: `components/universities/UniversitiesFilterBar.tsx`
- Create: `components/universities/UniversityRows.tsx`
- Create: `components/universities/UniversitiesStates.tsx`
- Test: `scripts/check-universities-field-guide.mjs`

- [ ] **Step 1: Create `UniversitiesHero.tsx`**

Use this component API and structure:

```tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Globe2 } from "lucide-react";

interface UniversitiesHeroProps {
  backHomeLabel: string;
  guideLabel: string;
  title: string;
  subtitle: string;
  universitiesCount: number;
  departmentsCount: number;
  citiesCount: number;
  universitiesLabel: string;
  departmentsLabel: string;
  citiesLabel: string;
  languageToggleLabel: string;
  languageButtonText: string;
  onToggleLanguage: () => void;
}

export function UniversitiesHero({
  backHomeLabel,
  guideLabel,
  title,
  subtitle,
  universitiesCount,
  departmentsCount,
  citiesCount,
  universitiesLabel,
  departmentsLabel,
  citiesLabel,
  languageToggleLabel,
  languageButtonText,
  onToggleLanguage,
}: UniversitiesHeroProps) {
  const stats = [
    { value: universitiesCount, label: universitiesLabel },
    { value: departmentsCount, label: departmentsLabel },
    { value: citiesCount, label: citiesLabel },
  ];

  return (
    <header className="border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backHomeLabel}
          </Link>
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={languageToggleLabel}
            className="inline-flex items-center gap-2 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-2 text-xs font-bold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
          >
            <Globe2 className="h-3.5 w-3.5" />
            {languageButtonText}
          </button>
        </div>

        <div className="grid gap-8 py-10 md:grid-cols-[minmax(0,1fr)_360px] md:items-end lg:py-14">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
              {guideLabel}
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.04em] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--editorial-muted)]">
              {subtitle}
            </p>
          </div>

          <dl className="grid grid-cols-3 border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`p-4 sm:p-5 ${index > 0 ? "border-l border-[var(--editorial-border)]" : ""}`}
              >
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
                  {stat.label}
                </dt>
                <dd className="mt-2 font-serif text-3xl font-semibold text-[var(--editorial-ink)]">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create `UniversitiesFilterBar.tsx`**

Implement props for current filters, update callbacks, city counts, favorite count, and view labels. Use `Search`, `MapPin`, `Heart`, `X`, `LayoutList`, and `Rows3` icons from Lucide. The component must:

```tsx
export interface UniversitiesFilterBarProps {
  searchTerm: string;
  selectedCity: string;
  selectedType: string;
  showFavoritesOnly: boolean;
  hasActiveFilters: boolean;
  resultCount: number;
  totalCount: number;
  favoriteCount: number;
  citiesWithCounts: [string, number][];
  viewMode: "grid" | "compact";
  labels: {
    searchPlaceholder: string;
    filterLabel: string;
    allCities: string;
    schoolType: string;
    publicType: string;
    privateType: string;
    favoritesOnly: string;
    showAll: string;
    clearFilters: string;
    resultSummary: string;
    viewSwitcherLabel: string;
    viewGrid: string;
    viewCompact: string;
    viewGridAria: string;
    viewCompactAria: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  onViewModeChange: (mode: "grid" | "compact") => void;
}
```

Use editorial classes only: `border-[var(--editorial-border)]`, `bg-[var(--editorial-surface)]`, `text-[var(--editorial-ink)]`, `text-[var(--editorial-muted)]`, `text-[var(--editorial-sage)]`, and `text-[var(--editorial-terracotta)]`.

- [ ] **Step 3: Create `UniversityRows.tsx`**

Export both row variants:

```tsx
export interface UniversityRowProps {
  university: University;
  language: "tr" | "en";
  reviewLabel: string;
  departmentsLabel: string;
  moreLabel: string;
  isFavorite: boolean;
  onToggleFavorite: (universityId: number) => void;
}

export function UniversityGuideRow(props: UniversityRowProps) {
  // Uses a larger image, description, fee, city, type, department count,
  // first 3 department names, favorite button, and detail Link with from=list.
}

export function UniversityCompactRow(props: UniversityRowProps) {
  // Uses a smaller image, denser metadata, favorite button, and detail Link with from=list.
}
```

The implementation must use `getTypeLabel()` and `getUniversityDescription()` from `lib/universitiesFilters.ts`. It must not create subject-category chips. Department tags must come from `university.departments.slice(0, 3)`.

- [ ] **Step 4: Create `UniversitiesStates.tsx`**

Export:

```tsx
export function UniversitiesLoadingState({ label }: { label: string }) {
  // Return paper background with 4 skeleton guide rows.
}

export function UniversitiesErrorState({ message }: { message: string }) {
  // Return centered editorial error note.
}

export function UniversitiesEmptyState({
  title,
  description,
  actionLabel,
  onClearFilters,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onClearFilters: () => void;
}) {
  // Return editorial empty note and clear button.
}
```

- [ ] **Step 5: Run source smoke check**

Run:

```bash
npm run check:universities-ui
```

Expected:

```text
[FAIL] Universities field-guide check failed.
```

Remaining failures should point to `app/universities/page.tsx`, because it still contains the old UI.

- [ ] **Step 6: Commit components**

```bash
git add components/universities
git commit -m "feat: add universities field guide components"
```

---

### Task 5: Rewrite `/universities` Page Composition

**Files:**
- Modify: `app/universities/page.tsx`
- Test: `scripts/check-universities-field-guide.mjs`

- [ ] **Step 1: Replace local helper definitions with imports**

At the top of `app/universities/page.tsx`, keep it as a client component and import:

```tsx
import React, { Suspense, useMemo, useCallback, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useFavorites } from "@/lib/useFavorites";
import { useUniversitiesData } from "@/lib/useUniversitiesData";
import {
  UNIVERSITIES_VIEW_MODE_EVENT,
  UNIVERSITIES_VIEW_MODE_STORAGE_KEY,
  filterUniversities,
  getCitiesWithCounts,
  getTotalDepartments,
  type UniversityViewMode,
} from "@/lib/universitiesFilters";
import { UniversitiesHero } from "@/components/universities/UniversitiesHero";
import { UniversitiesFilterBar } from "@/components/universities/UniversitiesFilterBar";
import { UniversityCompactRow, UniversityGuideRow } from "@/components/universities/UniversityRows";
import { UniversitiesEmptyState, UniversitiesErrorState, UniversitiesLoadingState } from "@/components/universities/UniversitiesStates";
```

Remove old imports for `Link`, `Image`, and Lucide icons that are now owned by child components.

- [ ] **Step 2: Keep view-mode store helpers in the route file**

Use the existing functions, updated to import constants:

```tsx
function readStoredViewMode(): UniversityViewMode {
  if (typeof window === "undefined") return "grid";
  const storedMode = window.localStorage.getItem(UNIVERSITIES_VIEW_MODE_STORAGE_KEY);
  return storedMode === "compact" ? "compact" : "grid";
}

function subscribeToViewMode(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === UNIVERSITIES_VIEW_MODE_STORAGE_KEY) callback();
  };
  const handleLocalChange = () => callback();

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(UNIVERSITIES_VIEW_MODE_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(UNIVERSITIES_VIEW_MODE_EVENT, handleLocalChange);
  };
}
```

- [ ] **Step 3: Replace filtering with helper calls**

Inside `UniversitiesContent`, compute:

```tsx
const citiesWithCounts = useMemo(() => getCitiesWithCounts(universities), [universities]);
const totalDepartments = useMemo(() => getTotalDepartments(universities), [universities]);
const totalCities = citiesWithCounts.length;

const filteredUniversities = useMemo(
  () =>
    filterUniversities(universities, {
      searchTerm,
      selectedCity,
      selectedType,
      showFavoritesOnly,
      isFavorite,
    }),
  [searchTerm, selectedCity, selectedType, showFavoritesOnly, isFavorite, universities]
);
```

- [ ] **Step 4: Render the new page shell**

The returned JSX should have this structure:

```tsx
return (
  <div className="min-h-screen bg-[var(--editorial-paper)] pb-24 text-[var(--editorial-ink)] md:pb-12">
    <UniversitiesHero
      backHomeLabel={t.list.backHome}
      guideLabel={t.list.guideLabel}
      title={t.list.heroTitle}
      subtitle={t.list.heroSubtitle}
      universitiesCount={universities.length}
      departmentsCount={totalDepartments}
      citiesCount={totalCities}
      universitiesLabel={t.list.universitiesStat}
      departmentsLabel={t.list.departmentsStat}
      citiesLabel={t.list.citiesStat}
      languageToggleLabel={language === "tr" ? "Switch to English" : "Türkçeye Geç"}
      languageButtonText={language === "tr" ? "EN" : "TR"}
      onToggleLanguage={toggleLanguage}
    />

    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <UniversitiesFilterBar
        searchTerm={searchTerm}
        selectedCity={selectedCity}
        selectedType={selectedType}
        showFavoritesOnly={showFavoritesOnly}
        hasActiveFilters={Boolean(hasActiveFilters)}
        resultCount={filteredUniversities.length}
        totalCount={universities.length}
        favoriteCount={favorites.length}
        citiesWithCounts={citiesWithCounts}
        viewMode={activeViewMode}
        labels={{
          searchPlaceholder: t.list.searchPlaceholder,
          filterLabel: t.list.filterLabel,
          allCities: t.list.allCities,
          schoolType: t.list.schoolType,
          publicType: t.list.publicType,
          privateType: t.list.privateType,
          favoritesOnly: t.list.favoritesOnly,
          showAll: t.list.showAll,
          clearFilters: t.list.clearFilters,
          resultSummary: t.list.resultSummary,
          viewSwitcherLabel: t.list.viewSwitcherLabel,
          viewGrid: t.list.viewGrid,
          viewCompact: t.list.viewCompact,
          viewGridAria: t.list.viewGridAria,
          viewCompactAria: t.list.viewCompactAria,
        }}
        onFilterChange={updateFilter}
        onClearFilters={clearAllFilters}
        onViewModeChange={handleViewModeChange}
      />

      {filteredUniversities.length > 0 ? (
        <motion.div initial="hidden" animate="show" variants={containerVariants} className="mt-6 divide-y divide-[var(--editorial-border)] border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
          {filteredUniversities.map((university) => (
            <motion.div key={university.id} variants={rowVariants}>
              {activeViewMode === "grid" ? (
                <UniversityGuideRow
                  university={university}
                  language={language}
                  reviewLabel={t.list.review}
                  departmentsLabel={t.list.departmentsStat}
                  moreLabel={t.list.more}
                  isFavorite={isFavorite(university.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ) : (
                <UniversityCompactRow
                  university={university}
                  language={language}
                  reviewLabel={t.list.review}
                  departmentsLabel={t.list.departmentsStat}
                  moreLabel={t.list.more}
                  isFavorite={isFavorite(university.id)}
                  onToggleFavorite={toggleFavorite}
                />
              )}
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <UniversitiesEmptyState
          title={showFavoritesOnly ? t.list.emptyFav : t.list.noResults}
          description={showFavoritesOnly ? t.list.emptyFavDesc : t.list.noResultsDesc}
          actionLabel={t.list.clearFilters}
          onClearFilters={clearAllFilters}
        />
      )}
    </main>
  </div>
);
```

- [ ] **Step 5: Run smoke check**

Run:

```bash
npm run check:universities-ui
```

Expected:

```text
[OK] Universities field-guide check passed.
```

- [ ] **Step 6: Commit page rewrite**

```bash
git add app/universities/page.tsx
git commit -m "feat: redesign universities as field guide"
```

---

### Task 6: Verify Build, Data, Routes, And Browser Behavior

**Files:**
- Modify only if verification exposes a defect in the touched files.

- [ ] **Step 1: Run static checks**

Run:

```bash
npm run check:universities-ui
npm run check:routes
npm run check:data
npm run lint
```

Expected:

```text
[OK] Universities field-guide check passed.
```

`check:routes`, `check:data`, and `lint` must exit with code 0.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: exit code 0. If build fails because environment variables for Clerk/Supabase/Gemini are missing, record the exact missing variable or error and continue with the available verification commands.

- [ ] **Step 3: Start the development server**

Run:

```bash
npm run dev
```

Expected: Next.js serves the app on a local URL, usually `http://localhost:3000`.

- [ ] **Step 4: Browser desktop verification**

Open `/universities` in the in-app Browser and verify:

- Editorial hero renders with paper/sage/terracotta system.
- Search placeholder is neutral and does not say "Nursing, Psychology".
- Filter bar has search, city, type, favorites, guide/compact view, result count, and clear action.
- Default guide rows show real department names only.
- Searching `nursing` behaves as direct text search.
- Searching `healthcare-taxonomy-check` shows the no-match empty state.
- Clicking clear filters resets URL params.
- Favorite toggle keeps `aria-pressed` and updates the UI.
- University detail links include `?from=list`.

- [ ] **Step 5: Browser mobile verification**

In a mobile viewport, verify:

- No horizontal overflow.
- Hero text wraps cleanly.
- Stats fit without overlapping.
- Filter controls wrap into usable rows.
- Guide and compact rows remain readable.
- Bottom nav does not cover the final rows or empty state action.

- [ ] **Step 6: Visual fidelity check**

Compare the rendered desktop and mobile page against these accepted references:

- `.superpowers/brainstorm/14199-1778578453/content/field-guide-first-viewport.html`
- `.superpowers/brainstorm/14199-1778578453/content/field-guide-components-states.html`

Record the comparison in the final response:

- Copy and hierarchy.
- Palette and absence of indigo/glass style.
- Result row anatomy.
- Filter boundary accuracy.
- Mobile wrapping and spacing.

- [ ] **Step 7: Commit verification fixes if needed**

If any verification fix was required:

```bash
git add app/universities/page.tsx components/universities lib/translations.ts lib/universitiesFilters.ts scripts/check-universities-field-guide.mjs package.json
git commit -m "fix: polish universities field guide verification"
```

If no fixes were required, do not create an empty commit.
