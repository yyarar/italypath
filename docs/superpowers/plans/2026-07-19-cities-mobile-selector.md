# City Guides Mobile Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long mobile city directory with a compact, accessible city selector while preserving the current desktop atlas.

**Architecture:** Keep `citiesWithCounts` and `handleSelectCity(citySlug)` as the single data and navigation path for both responsive presentations. Render a native `<select>` before the city profile below `lg`, render the existing card directory only at `lg` and above, and leave the server wrapper and URL model unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Lucide React, Node source-check scripts.

## Global Constraints

- Below `lg`, the city directory cards are hidden and a full-width native selector appears immediately before the city profile.
- At `lg` and above, the existing card directory and sticky two-column city profile remain unchanged.
- The selector uses the existing `CityGuideOption.slug` and `handleSelectCity(citySlug)` URL-sync path.
- All new user-facing copy is added to `lib/translations.ts` in Turkish and English.
- `app/cities/page.tsx` remains a Server Component; do not add `useSearchParams` or a page-level CSR bailout.
- Do not add a state library, UI dependency, Tailwind config, modal, bottom sheet, or city-content rewrite.
- Preserve unrelated dirty-worktree changes and stage only the city-selector files.

---

### Task 1: Add the compact responsive city selector

**Files:**
- Modify: `scripts/check-cities-data.mjs:1-5,305`
- Modify: `lib/translations.ts:648-675,1399-1426`
- Modify: `components/cities/CityGuidesExplorer.tsx:6-22,157-209,259-304`
- Reference: `docs/superpowers/specs/2026-07-19-cities-mobile-selector-design.md`

**Interfaces:**
- Consumes: `CityGuideOption { name: string; count: number; slug: string }`, `activeCity: CityDetail`, `handleSelectCity(citySlug: string): void`, `t.detail.programCount`.
- Produces: `citiesGuide.citySelectorLabel: string` in both locales and `activeCitySlug: string` for the controlled mobile `<select>`.
- Preserves: `router.replace(..., { scroll: false })`, desktop `aria-pressed`, initial server data, scholarship matching, and city university filtering.

- [ ] **Step 1: Add a failing source regression check**

Extend the path setup at the top of `scripts/check-cities-data.mjs`:

~~~js
const cityDataPath = new URL("../lib/cities/data.ts", import.meta.url);
const cityExplorerPath = new URL(
  "../components/cities/CityGuidesExplorer.tsx",
  import.meta.url
);
const translationsPath = new URL("../lib/translations.ts", import.meta.url);

const source = readFileSync(cityDataPath, "utf8");
const cityExplorerSource = readFileSync(cityExplorerPath, "utf8");
const translationsSource = readFileSync(translationsPath, "utf8");
~~~

Insert these assertions immediately before the final `console.log`:

~~~js
assertIncludes(
  cityExplorerSource,
  'htmlFor="mobile-city-selector"',
  "Mobile city selector must have a programmatically associated label."
);
assertIncludes(
  cityExplorerSource,
  'id="mobile-city-selector"',
  "Mobile city selector must expose a stable control id."
);
assertIncludes(
  cityExplorerSource,
  "value={activeCitySlug}",
  "Mobile city selector must reflect the active city slug."
);
assertIncludes(
  cityExplorerSource,
  "handleSelectCity(event.target.value)",
  "Mobile city selector must reuse the existing city selection flow."
);
assertIncludes(
  cityExplorerSource,
  "lg:hidden",
  "Mobile city selector must be hidden at the desktop breakpoint."
);
assertIncludes(
  cityExplorerSource,
  "hidden min-w-0 lg:block",
  "The long city directory must be hidden below the desktop breakpoint."
);
assertIncludes(
  translationsSource,
  'citySelectorLabel: "Şehir seç"',
  "Turkish mobile city selector copy is required."
);
assertIncludes(
  translationsSource,
  'citySelectorLabel: "Choose a city"',
  "English mobile city selector copy is required."
);
~~~

- [ ] **Step 2: Run the city check and confirm the RED state**

Run:

~~~bash
npm run check:cities
~~~

Expected: exit code `1` with `Mobile city selector must have a programmatically associated label.` The failure must come from the missing mobile selector, not from existing city data assertions.

- [ ] **Step 3: Add Turkish and English selector copy**

Add the new field after `pageIdentity` in both `citiesGuide` objects in `lib/translations.ts`:

~~~ts
// Turkish
citySelectorLabel: "Şehir seç",

// English
citySelectorLabel: "Choose a city",
~~~

- [ ] **Step 4: Add the controlled active slug and selector icon**

Add `ChevronDown` to the existing Lucide import in `CityGuidesExplorer.tsx`:

~~~ts
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronDown,
  Coins,
  Compass,
  ExternalLink,
  Globe,
  Info,
  Landmark,
  MapPin,
  Navigation,
  SunDim,
  Users,
} from "lucide-react";
~~~

After the `activeCity` memo and before the scholarship memo, derive the exact option slug used by the native control:

~~~ts
const activeCitySlug = useMemo(
  () =>
    citiesWithCounts.find(
      (city) => city.name.toLowerCase() === activeCity.name.toLowerCase()
    )?.slug ?? "",
  [activeCity.name, citiesWithCounts]
);
~~~

- [ ] **Step 5: Render the mobile selector and hide the long directory below `lg`**

Inside the explorer grid, immediately before the existing city directory section, add:

~~~tsx
{/* Mobile City Selector */}
<section className="min-w-0 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 shadow-[0_24px_70px_rgba(21,32,28,0.08)] lg:hidden">
  <label
    htmlFor="mobile-city-selector"
    className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]"
  >
    <MapPin className="h-4 w-4 text-[var(--editorial-sage)]" />
    {copy.citySelectorLabel}
  </label>
  <div className="relative mt-3">
    <select
      id="mobile-city-selector"
      value={activeCitySlug}
      onChange={(event) => handleSelectCity(event.target.value)}
      className="min-h-11 w-full appearance-none border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-3 pr-10 text-sm font-bold text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
    >
      {citiesWithCounts.map((city) => (
        <option key={city.name} value={city.slug}>
          {language === "tr"
            ? city.name
            : getCityDetailBySlug(city.name)?.nameEn || city.name}
          {` · ${city.count} ${t.detail.programCount}`}
        </option>
      ))}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--editorial-sage)]"
    />
  </div>
</section>
~~~

Change the existing directory section opening tag to include the exact responsive visibility contract checked by the regression script:

~~~tsx
<section className="hidden min-w-0 lg:block border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 shadow-[0_24px_70px_rgba(21,32,28,0.08)] sm:p-5">
~~~

Do not move or duplicate the city profile `<aside>`; mobile DOM order must be selector, hidden directory, city profile.

- [ ] **Step 6: Run the city check and confirm the GREEN state**

Run:

~~~bash
npm run check:cities
~~~

Expected: exit code `0` and `[OK] City data source checks passed.`

- [ ] **Step 7: Run focused lint**

Run:

~~~bash
npx eslint components/cities/CityGuidesExplorer.tsx lib/translations.ts scripts/check-cities-data.mjs
~~~

Expected: exit code `0` with no warnings or errors.

- [ ] **Step 8: Verify the responsive interaction in a real browser**

Start the app:

~~~bash
npm run dev
~~~

At a `390 × 844` viewport, open `http://localhost:3000/cities?city=milano` and verify all of the following:

- the long card directory is absent,
- the `Şehir seç` control is immediately above `ŞEHİR DOSYASI`,
- the control is at least 44 px high,
- choosing Roma changes the URL to `?city=roma`, the heading to `Roma`, the regional scholarship to Lazio, and the listed universities without requiring a long scroll,
- toggling to English changes the label to `Choose a city` and the selected city name to its English display value where available.

At a `1280 × 900` viewport, reload the same URL and verify:

- the compact selector is absent,
- the existing card directory is visible,
- Roma has the active card style,
- the city profile remains sticky and scrollable as before.

Stop the dev server after verification.

- [ ] **Step 9: Run the production build**

Run:

~~~bash
npm run build
~~~

Expected: exit code `0`; `/cities` compiles without a CSR bailout, TypeScript error, or build warning introduced by this change.

- [ ] **Step 10: Review the scoped diff**

Run:

~~~bash
git diff --check
git diff -- components/cities/CityGuidesExplorer.tsx lib/translations.ts scripts/check-cities-data.mjs
git status --short
~~~

Expected: no whitespace errors; only the three city-selector files contain implementation changes from this task. Existing unrelated auth and context changes remain unstaged and unmodified.

- [ ] **Step 11: Commit the implementation files only**

~~~bash
git add components/cities/CityGuidesExplorer.tsx lib/translations.ts scripts/check-cities-data.mjs
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(cities): add compact mobile city selector"
~~~

Expected staged names before the commit:

~~~text
components/cities/CityGuidesExplorer.tsx
lib/translations.ts
scripts/check-cities-data.mjs
~~~
