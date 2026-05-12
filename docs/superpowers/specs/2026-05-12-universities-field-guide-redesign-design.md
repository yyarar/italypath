# Universities Field Guide Redesign Design

Date: 2026-05-12

## Goal

Redesign the `/universities` experience from scratch so it no longer feels like a generic AI-generated card grid. The approved direction is **Editorial Atlas**, narrowed to the **Field Guide List** approach.

The page should feel like a calm, trustworthy ItalyPath school research guide: editorial, readable, grounded, and aligned with the existing paper/sage/terracotta visual system used by the main navigation and newer product surfaces.

## Approved Direction

The user selected:

- Visual direction: **Editorial Atlas**
- Experience priority: **editorial discovery**
- Concrete flow: **Field Guide List**

The page keeps fast search and filtering, but the primary feeling is not a dashboard or SaaS directory. It should feel like opening a curated school guide and scanning short school dossiers.

Visual companion references from the brainstorming session:

- `.superpowers/brainstorm/14199-1778578453/content/universities-direction-options.html`
- `.superpowers/brainstorm/14199-1778578453/content/editorial-atlas-approaches.html`
- `.superpowers/brainstorm/14199-1778578453/content/field-guide-first-viewport.html`
- `.superpowers/brainstorm/14199-1778578453/content/field-guide-components-states.html`

## Product Requirements

Preserve the existing `/universities` behavior:

- Search by university name, city, and department name.
- Keep URL-synced filters: `q`, `city`, `type`, and `fav`.
- Keep favorite toggling through `useFavorites`.
- Keep guest and signed-in favorite behavior unchanged.
- Keep city counts derived from loaded university data.
- Keep view mode persistence with `italyPathUniversitiesViewMode`.
- Keep the existing `grid` / `compact` storage values for backward compatibility, but redesign the labels and presentation as the new guide/compact modes.
- Keep detail links as `/universities/[id]?from=list` so back behavior remains intact.
- Keep TR/EN language behavior through `LanguageContext`.
- Keep data loading through `/api/universities` and `useUniversitiesData`.

Do not introduce:

- New state management libraries.
- A Tailwind config file.
- New data sources or Supabase schema changes.
- New public/protected route behavior.
- Decorative gradient blobs, over-rounded cards, or generic glassmorphism.

## Visual System

Use the existing editorial tokens in `app/globals.css`:

- Background: `var(--editorial-paper)`
- Surface: `var(--editorial-surface)`
- Ink: `var(--editorial-ink)`
- Muted text: `var(--editorial-muted)`
- Primary accent: `var(--editorial-sage)`
- Warm accent: `var(--editorial-terracotta)`
- Border: `var(--editorial-border)`

The visual language should be:

- Paper-like, not glossy.
- Rectangular or lightly rounded at most, matching the newer editorial UI.
- Serif-led for page title and university names.
- Sans-serif for controls, metadata, labels, and utility text.
- Quiet shadows, if any.
- No indigo/purple dominant palette.
- No glass panels.
- No decorative orbs, bokeh, or excessive gradients.

## Page Structure

### 1. Editorial Hero

The first viewport opens with a restrained editorial section:

- Back-home link or compact breadcrumb behavior.
- Language toggle retained.
- Large serif headline that frames the page as a decision guide.
- Short support copy.
- Real summary stats derived from data:
  - total universities
  - total departments/programs
  - total cities
- The next control band and the first result should be visible without making the hero feel like a landing page.

The hero should not become a marketing page. It is the top of the actual usable school browser.

### 2. Filter Band

A calm control band directly below the hero:

- Search input.
- City select.
- School type segmented controls for public/private.
- Favorites-only toggle.
- Guide/compact view toggle.
- Result count.
- Clear filters action shown only when filters are active.

The band can be sticky after scrolling if it remains visually light. If sticky behavior makes mobile cramped, keep it static on mobile and prioritize readability.

### 3. Guide Result Rows

The default mode is the redesigned guide view. Each university row is a short school dossier:

- Small fixed-ratio image.
- University name in serif typography.
- Short localized description, using `description_en` when language is English and available.
- City, school type, fee, and department count.
- 1-3 department tags, with a `+N` continuation when needed.
- Favorite button.
- Clear `Review` / `İncele` action.

Rows should feel scan-friendly and editorial, not like floating cards. Use borders, spacing, and typography rhythm instead of heavy shadows.

### 4. Compact Mode

Compact mode remains available for faster scanning:

- Preserve the existing localStorage mode value `compact`.
- Use the same editorial tokens and row style.
- Reduce image size and copy density.
- Keep city, type, fee, department count, favorite button, and review action visible.

### 5. Loading, Empty, and Error States

Loading:

- Replace the indigo spinner with skeleton guide rows on paper background.
- Keep motion minimal and respect reduced motion.

No results:

- Use a short editorial note explaining that the current criteria are too narrow.
- Include a clear filters reset button.
- Avoid generic large circular icon treatments.

Favorites empty:

- Use a warm, quiet note that no schools are saved yet.
- Offer the same clear reset/show-all action.

Error:

- Keep the message simple and bilingual where practical.
- Preserve the paper surface and page tone.

## Component Architecture

Move the redesigned UI into focused components under `components/universities/` where useful. The current `app/universities/page.tsx` should become more composition-oriented while retaining the client route logic.

Suggested components:

- `UniversitiesPageShell`
- `UniversitiesHero`
- `UniversitiesFilterBar`
- `UniversityGuideRow`
- `UniversityCompactRow`
- `UniversitiesLoadingState`
- `UniversitiesEmptyState`
- `UniversityViewToggle`

Keep data filtering and URL update logic close to the page or extract small pure helpers if tests need them. Avoid a broad refactor beyond what the redesign requires.

## Data Flow

The page continues to read:

- `useSearchParams`, `useRouter`, and `usePathname` for URL filters.
- `useLanguage` for translations and language toggling.
- `useFavorites` for saved universities.
- `useUniversitiesData` for university data.
- `useSyncExternalStore` for view mode persistence.

Derived data:

- `citiesWithCounts`
- `totalDepartments`
- `totalCities`
- `filteredUniversities`
- `hasActiveFilters`

Filtering behavior should remain equivalent to the current implementation.

## Responsive Behavior

Desktop:

- Editorial hero uses a two-column composition: copy and stats.
- Filter band is horizontal.
- Guide rows can use multiple metadata columns.

Tablet:

- Hero remains editorial but stats may wrap.
- Filter controls wrap into two rows.
- Guide rows keep image + text + action, with metadata condensed.

Mobile:

- Hero headline is shorter and smaller.
- Stats become compact blocks.
- Filter controls stack into usable rows without horizontal overflow.
- Guide rows become image + text, with actions and metadata below.
- Bottom navigation safe area and page bottom padding must remain comfortable.

Text must not overflow controls or cards. Long university names and department tags need truncation or wrapping rules that preserve layout.

## Accessibility

- Preserve semantic links for university navigation.
- Favorite buttons must keep `aria-label` and `aria-pressed`.
- View toggle must keep `role="group"` and clear pressed states.
- Search input keeps a descriptive `aria-label`.
- Selects and filter buttons are keyboard accessible.
- Focus visible states must be clear on links, buttons, and inputs.
- Reduced motion must remain respected.

## Translations

Reuse existing `t.list` strings where they still fit. Add only the strings needed for the new editorial hero, stats labels, no-result guidance, loading labels, or renamed view labels.

TR/EN parity is required for any new user-facing copy.

## Testing And Verification

Before implementation completion, run:

- `npm run lint`
- `npm run check:routes`
- `npm run check:data`
- `npm run build` if environment variables and sandbox constraints allow it

Add focused checks where practical:

- A pure helper or smoke test for view mode storage behavior if extraction makes it easy.
- A script or component-level test is not required if the project has no test runner, but the redesign must still be manually verified in browser.

Browser verification:

- Desktop viewport for first viewport, filters, guide rows, empty state.
- Mobile viewport for hero, wrapped filters, guide row layout, bottom nav clearance.
- Search filter flow.
- City/type/favorites filter flow.
- Clear filters flow.
- View toggle persistence.
- Favorite toggle interaction.
- Detail link includes `from=list`.

Visual verification:

- Compare the rendered page against the accepted Field Guide visual references.
- Confirm the indigo/glass/card-grid look is gone.
- Confirm the page aligns with the existing editorial navigation style.
- Confirm no mobile horizontal overflow.

## Implementation Notes

The redesign should be implemented conservatively:

- Do not touch PWA manifest/icon work.
- Do not change university data.
- Do not change route protection.
- Do not change Supabase or Clerk integration.
- Do not alter department detail transitions unless a direct visual conflict appears.

The main success criterion is that `/universities` feels designed by the same hand as the newer editorial ItalyPath surfaces, while still functioning as a fast school browser.
