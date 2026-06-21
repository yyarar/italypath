# SEO Server HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render visible, indexable server HTML for the public SEO pages while preserving the current client explorer/detail UX.

**Architecture:** Convert the SEO-critical pages into Server Component wrappers that fetch live data and pass bounded initial data into client leaf components. `/universities` must keep the initial HTML compact: render H1, stats, and a limited set of real university links, then let the existing `/api/universities` client flow load the full data. Detail pages can pass one full university as initial data because the payload is bounded to one school.

**Tech Stack:** Next.js App Router 16, React 19, TypeScript, Supabase-backed `getUniversitiesData()`, existing Tailwind v4 editorial styles.

---

### Task 1: Prepare Shared Initial Data Support

**Files:**
- Modify: `lib/useUniversitiesData.ts`

- [ ] **Step 1: Add initial data support to the hook**

Update `useUniversitiesData` so it accepts optional initial university data and starts without a loading skeleton when initial data exists. Keep `/api/universities` as the full client data source.

```ts
export function useUniversitiesData(initialUniversities?: University[]) {
  const hasInitialUniversities = Boolean(initialUniversities?.length);
  const [universities, setUniversities] = useState<University[]>(
    () => universitiesCache ?? initialUniversities ?? []
  );
  const [loading, setLoading] = useState(!universitiesCache && !hasInitialUniversities);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (universitiesCache) {
      setUniversities(universitiesCache);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    fetchUniversities()
      .then((data) => {
        if (!active) return;
        setUniversities(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unexpected error";
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { universities, loading, error };
}
```

- [ ] **Step 2: Verify hook still uses the live API**

Run:

```bash
npm run check:university-data-source
```

Expected: `[OK] University data source check passed.`

### Task 2: Convert `/universities` to Server Wrapper + Compact Client Leaf

**Files:**
- Create: `components/universities/UniversitiesExplorer.tsx`
- Modify: `app/universities/page.tsx`

- [ ] **Step 1: Move current client page logic into `UniversitiesExplorer`**

Create `components/universities/UniversitiesExplorer.tsx` from the current client logic. Remove `useSearchParams`, read filters from props, and keep URL sync with local state plus `router.replace()`.

```ts
interface UniversitiesExplorerProps {
  initialUniversities: University[];
  initialFilters: {
    searchTerm: string;
    selectedCity: string;
    selectedType: string;
    showFavoritesOnly: boolean;
  };
  initialStats: {
    universitiesCount: number;
    departmentsCount: number;
    citiesCount: number;
  };
}
```

The client component calls:

```ts
const { universities, loading: universitiesLoading, error: universitiesError } =
  useUniversitiesData(initialUniversities);
```

When initial data exists, it must not render `UniversitiesLoadingState` on the first server render.

- [ ] **Step 2: Keep `/universities` initial HTML bounded**

In `app/universities/page.tsx`, fetch full live data for stats and filtering, but pass only a limited preview to the client leaf.

```ts
const UNIVERSITIES_HTML_PREVIEW_LIMIT = 12;

function createUniversitiesHtmlPreview(universities: University[]) {
  return universities.slice(0, UNIVERSITIES_HTML_PREVIEW_LIMIT);
}
```

For `q`, `city`, and `type`, build the preview from the public filtered result. Do not server-filter by `fav=1`, because favorites are user-specific.

- [ ] **Step 3: Render the server page without Suspense**

`app/universities/page.tsx` must be an async Server Component with no `"use client"` directive and no Suspense fallback around the explorer.

```ts
export default async function UniversitiesPage({ searchParams }: UniversitiesPageProps) {
  const resolvedSearchParams = await searchParams;
  const universities = await getUniversitiesData();
  const initialFilters = parseUniversitiesSearchParams(resolvedSearchParams);
  const publicFilteredUniversities = filterUniversities(universities, {
    searchTerm: initialFilters.searchTerm,
    selectedCity: initialFilters.selectedCity,
    selectedType: initialFilters.selectedType,
    showFavoritesOnly: false,
    isFavorite: () => false,
  });

  return (
    <UniversitiesExplorer
      initialUniversities={createUniversitiesHtmlPreview(publicFilteredUniversities)}
      initialFilters={initialFilters}
      initialStats={{
        universitiesCount: universities.length,
        departmentsCount: getTotalDepartments(universities),
        citiesCount: getCitiesWithCounts(universities).length,
      }}
    />
  );
}
```

- [ ] **Step 4: Verify list UI guard**

Run:

```bash
npm run check:universities-ui
```

Expected: `[OK] Universities field-guide check passed.`

### Task 3: Convert University Detail to Server Wrapper

**Files:**
- Create: `components/university-details/UniversityDetailClient.tsx`
- Modify: `app/universities/[id]/page.tsx`
- Modify: `components/university-details/UniversityPortraitMasthead.tsx`
- Modify: `components/university-details/ProgramTransitionEntry.tsx`

- [ ] **Step 1: Move current university detail client logic**

Create `UniversityDetailClient` with:

```ts
interface UniversityDetailClientProps {
  initialUniversity: University | null;
  idFromUrl: string;
  cameFromList: boolean;
}
```

It should call `useUniversitiesData(initialUniversity ? [initialUniversity] : [])`, find the current university from refreshed data when available, and never show the loading screen while `initialUniversity` exists.

- [ ] **Step 2: Make `app/universities/[id]/page.tsx` a server wrapper**

Fetch one school with `getUniversityById()` and pass it to the client component:

```ts
export default async function UniversityDetailPage({ params, searchParams }: UniversityDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const university = await getUniversityById(resolvedParams.id);

  return (
    <UniversityDetailClient
      initialUniversity={university ?? null}
      idFromUrl={resolvedParams.id}
      cameFromList={getSingleParam(resolvedSearchParams.from) === "list"}
    />
  );
}
```

- [ ] **Step 3: Add visible fee to the masthead**

Add a `feeLabel` prop to `UniversityPortraitMasthead` and render `university.fee` as a visible fact near program count and official source.

```tsx
<div>
  <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
    {feeLabel}
  </dt>
  <dd className="mt-1 font-serif text-2xl font-semibold text-[var(--editorial-ink)]">
    {university.fee}
  </dd>
</div>
```

- [ ] **Step 4: Turn program rows into real links**

In `ProgramTransitionEntry`, replace the clickable `<button>` with a real `Link` that has an `href` to the program detail route. Preserve the transition by preventing default after hydration and calling `onSelect()`.

```tsx
<Link
  href={`/universities/${university.id}/departments/${department.slug}`}
  onClick={(event) => {
    if (expanding) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    onSelect(department.slug);
  }}
  aria-label={department.admissionDetails ? undefined : `${department.name} — ${comingSoonLabel}`}
  className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"
>
  ...
</Link>
```

With JavaScript disabled or before hydration, the HTML still exposes real internal links.

### Task 4: Convert Program Detail to Server Wrapper

**Files:**
- Create: `components/university-details/DepartmentDetailClient.tsx`
- Modify: `app/universities/[id]/departments/[deptSlug]/page.tsx`

- [ ] **Step 1: Move current program detail client logic**

Create `DepartmentDetailClient` with:

```ts
interface DepartmentDetailClientProps {
  initialUniversity: University | null;
  initialDepartmentSlug: string;
  idFromUrl: string;
}
```

It should use `useUniversitiesData(initialUniversity ? [initialUniversity] : [])`, find `department`, and render the existing `ProgramPortraitHeader`, `ProgramMetaStrip`, `ProgramAdmissionDetailsPanel`, `ProgramDirectory`, `ComingSoonNotice`, and `DetailMentorPrompt`.

- [ ] **Step 2: Make route page fetch data on the server**

`app/universities/[id]/departments/[deptSlug]/page.tsx` becomes an async Server Component:

```ts
export default async function DepartmentDetailPage({ params }: DepartmentDetailPageProps) {
  const resolvedParams = await params;
  const university = await getUniversityById(resolvedParams.id);

  return (
    <DepartmentDetailClient
      initialUniversity={university ?? null}
      initialDepartmentSlug={resolvedParams.deptSlug}
      idFromUrl={resolvedParams.id}
    />
  );
}
```

### Task 5: Strengthen `/cities` Server HTML Without Big Refactor

**Files:**
- Modify: `app/cities/page.tsx`
- Modify: `components/cities/CityGuidesExplorer.tsx`

- [ ] **Step 1: Remove Suspense fallback and parse selected city on server**

`app/cities/page.tsx` should fetch live universities, compute compact city options, compute compact selected-city university summaries, and pass them into `CityGuidesExplorer`.

```ts
type CityOption = { name: string; count: number; slug: string };
type CityUniversitySummary = { id: number; name: string; type: string; departmentCount: number };
```

- [ ] **Step 2: Remove `useSearchParams` from `CityGuidesExplorer`**

Accept:

```ts
initialSelectedCity: string;
initialCitiesWithCounts: CityOption[];
initialCityUniversities: CityUniversitySummary[];
```

Use `useState(initialSelectedCity)` for selection and `router.replace()` for URL sync. When full client university data arrives, prefer it; before that, render the compact server-provided city options and university summaries. The first HTML must include the existing H1, intro, city buttons, and selected city university links.

### Task 6: Strengthen `/scholarships` Server HTML

**Files:**
- Modify: `app/scholarships/page.tsx`
- Modify: `components/scholarships/ScholarshipsExplorer.tsx`

- [ ] **Step 1: Remove Suspense fallback and parse selected region on server**

`app/scholarships/page.tsx` passes `initialSelectedRegion` into the client explorer.

```ts
export default async function ScholarshipsPage({ searchParams }: ScholarshipsPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawRegion = getSingleParam(resolvedSearchParams.region);
  const initialSelectedRegion = isRegionSlug(rawRegion) ? rawRegion : SCHOLARSHIP_DEFAULT_REGION;

  return <ScholarshipsExplorer initialSelectedRegion={initialSelectedRegion} />;
}
```

- [ ] **Step 2: Remove `useSearchParams` from `ScholarshipsExplorer`**

Use local selected region state initialized from props:

```ts
const [selectedSlug, setSelectedSlug] = useState<RegionSlug>(initialSelectedRegion);
```

On region selection, update state and call `router.replace()` to preserve URL sync. The first HTML should include the real H1, intro, selected region panel, official source links, and region rail.

### Task 7: Update Guards for Intentional Fee Rendering

**Files:**
- Modify: `scripts/check-university-detail-portrait.mjs`

- [ ] **Step 1: Remove fee from forbidden tokens**

Keep old redesign tokens forbidden, but allow `university.fee` and translation fee labels.

```js
forbidTokens("detail redesign", allDetailSource, [
  "Sparkles",
  "glass-dark",
  "glass ",
  "bg-indigo",
  "text-indigo",
  "shadow-indigo",
  "radial-gradient",
  "rounded-3xl",
  "bg-slate-950",
]);
```

- [ ] **Step 2: Require fee visibility**

Add required tokens so the guard confirms the SEO requirement:

```js
requireTokens("university detail fee", allDetailSource, [
  "feeLabel",
  "university.fee",
  "t.detail.fee",
]);
```

### Task 8: Automated Verification

**Files:**
- No source files; commands only.

- [ ] **Step 1: Run required checks**

```bash
npm run build
npm run lint
npm run check:routes
npm run check:university-data-source
npm run check:universities-ui
npm run check:university-details-ui
node scripts/check-universities-server-compose.mjs
```

Expected: all pass.

- [ ] **Step 2: Run related page guards**

```bash
npm run check:cities
npm run check:scholarships-ui
```

Expected: both pass.

### Task 9: Local Production HTML Verification

**Files:**
- No source files; commands only.

- [ ] **Step 1: Start local production server**

```bash
npm run start
```

Use an available port if the default is occupied.

- [ ] **Step 2: Verify `/universities` HTML**

```bash
curl -sL http://localhost:3000/universities > /tmp/italypath-universities.html
rg "Okul listesini|/universities/[0-9]+|BAILOUT_TO_CLIENT_SIDE_RENDERING" /tmp/italypath-universities.html
```

Expected: H1 text and university links are present; bailout token is absent.

- [ ] **Step 3: Verify university detail HTML**

```bash
curl -sL http://localhost:3000/universities/1 > /tmp/italypath-university-detail.html
rg "Politecnico di Milano|Milano|Civil Engineering|150|BAILOUT_TO_CLIENT_SIDE_RENDERING" /tmp/italypath-university-detail.html
```

Expected: school content and program links are present; bailout token is absent.

- [ ] **Step 4: Verify program detail HTML**

```bash
curl -sL http://localhost:3000/universities/1/departments/civil-engineering > /tmp/italypath-program-detail.html
rg "Civil Engineering|Politecnico di Milano|Seviye|Süre|Dil|BAILOUT_TO_CLIENT_SIDE_RENDERING" /tmp/italypath-program-detail.html
```

Expected: program facts are present; bailout token is absent.

### Task 10: Final Review

**Files:**
- Review all changed files.

- [ ] **Step 1: Inspect changed files**

```bash
git status --short
git diff --stat
```

Expected: only intended SEO server HTML, client leaf, hook, guard, and plan files changed.

- [ ] **Step 2: Confirm no forbidden files were created**

```bash
test ! -f middleware.ts
test ! -f tailwind.config.ts
test ! -f tailwind.config.js
```

Expected: all commands exit successfully.

- [ ] **Step 3: Summarize outcome**

Final report must include:

- selected approach and reason
- changed files
- SEO content now visible in first HTML
- tests run and results
- remaining risks

## Plan Self-Review

- Spec coverage: `/universities`, university detail, program detail, `/cities`, `/scholarships`, guard update, hidden text ban, and production HTML validation all have tasks.
- Deferred-decision scan: no temporary decisions or empty test instructions remain.
- Type consistency: initial prop names are consistent across wrapper and client tasks.
- Payload control: `/universities` explicitly passes a limited preview instead of all universities/programs into first HTML.
