# Scholarships Editorial Atlas Redesign

Date: 2026-05-14  
Status: Approved design direction, awaiting implementation approval  
Accepted concept: `/Users/keremyarar/.codex/generated_images/019e25c1-6b7f-7dd1-9bc2-80c155ee32b9/ig_06a405745c84f9e9016a059459c6348191838c3f4662dcb190.png`

## Goal

Redesign `/scholarships` from a dense data-panel page into a map-led regional scholarship explorer. The page should feel like an editorial atlas for students, not an AI-generated dashboard. The primary user question is:

> "Bu bölgede burs işleri için hangi resmi kuruma ve kaynağa bakmalıyım?"

The design must avoid claiming student benefits that the data cannot reliably support. Institution and official source discovery are the first hierarchy. Financial thresholds and application windows remain visible, but secondary.

## Visual Direction

Use the accepted **Editorial Atlas** direction:

- Warm paper background, not gray dashboard chrome.
- Deep sage / forest ink for primary UI, terracotta for restrained actions, blue-sage only for selected map state.
- Large Italy region map as the page's main object.
- Slight or square radii, roughly `0-8px`; avoid bubbly cards.
- No purple gradients, glow blobs, fake metrics, AI badges, chat widgets, or bento-style filler.
- Typography should align with the project's editorial direction: serif page heading where consistent, tight readable sans for UI labels and controls.

The page should look like a serious guide a student can trust before opening official DSU/ARDSU pages.

## Information Architecture

Top bar:

- Back link to home.
- ItalyPath wordmark or concise page identity.
- Language toggle.

Hero / page intro:

- H1: `Bölgesel Burs Haritası`
- Short supporting copy explaining that the page helps students find official regional institutions and source links.
- No eyebrow, badge, or decorative hero pill.

Primary atlas area:

- Left: large interactive Italy SVG map from the existing local GeoJSON flow.
- Right: selected-region **Kurum Dosyası** panel.
- Default selected region remains Lombardia.
- Region selection stays URL-synced with `?region=`.

Kurum Dosyası hierarchy:

1. Selected region name.
2. Verification status and last verified date.
3. `Yetkili kurumlar`: linked rows for `managingBodies`.
4. `Resmi kaynaklar`: official source links, shown as trustworthy action rows/buttons.
5. Secondary facts: academic year, ISEE limit, ISPE limit, application window.
6. Required warning: users must re-check the latest official call before applying.

Lower continuation:

- A horizontal region rail or source-check strip appears below the main atlas, with several regions and verification states.
- This rail hints that the page continues and can become the mobile-first region picker.

## Component Architecture

Keep the existing route and data sources:

- `app/scholarships/page.tsx` remains a Server Component with Suspense.
- `components/scholarships/ScholarshipsExplorer.tsx` remains the client leaf because it uses `useSearchParams`, router updates, language context, and browser fetch for GeoJSON.
- Local GeoJSON stays at `public/data/italy-regions.geojson`.
- Scholarship records continue to come from `lib/scholarships/regions.ts`.

Refactor the client leaf into focused internal components:

- `ScholarshipsTopBar`
- `ScholarshipsIntro`
- `ScholarshipMap`
- `RegionFilePanel`
- `RegionQuickFacts`
- `RegionRail`
- Existing GeoJSON parsing helpers can remain in the same file unless the implementation becomes unwieldy.

No new global state library, no new Tailwind config, and no new data model are required.

## Data Flow

- Read `region` from search params.
- Validate with `isRegionSlug`; fall back to `SCHOLARSHIP_DEFAULT_REGION`.
- Derive `selectedRegion` from `getScholarshipRegionBySlug`.
- On map or rail selection, update URL using `router.replace(..., { scroll: false })`.
- Fetch GeoJSON once on mount with the existing local file and version parameter.
- Preserve loading and error states for map fetch.

## Responsive Behavior

Desktop:

- Two-column atlas: large map left, institution file right.
- Right panel should stay readable without becoming a tall dashboard card stack.
- Bottom region rail visible enough to suggest continuation.

Tablet:

- Map remains first, panel follows or sits beside it depending on available width.
- Region rail remains horizontally scrollable.

Mobile:

- Intro stays compact.
- Region picker/rail appears before or near the map for quick selection.
- Map uses stable aspect ratio and must not cause horizontal overflow.
- Region file follows the selected map and keeps official links tappable.

## Accessibility

- SVG map regions must remain keyboard reachable and operable via Enter/Space.
- Active region must expose selected state visually and through accessible labels.
- Links to external official sources keep `target="_blank"` and `rel="noopener noreferrer"`.
- Use semantic section headings for map, institution file, official sources, and warning.
- Preserve reduced-motion safety; do not add continuous decorative motion.

## Error And Empty States

- Map loading: calm inline loading state inside the map canvas.
- Map error: provide a readable fallback and keep the region rail/panel usable.
- Registry-only regions: avoid empty-looking failure states. Show the official registry/body links first, then mark missing facts as not yet verified.
- Long official URLs and institution names must truncate or wrap cleanly without layout overflow.

## Testing And Verification

Run after implementation:

- `npm run lint`
- `npm run check:routes`
- Browser verification on `/scholarships` desktop and mobile widths.
- Confirm query sync by selecting at least two regions and refreshing the URL.
- Confirm keyboard map interaction for at least one region.
- Confirm external official links render and include safe link attributes.
- Confirm no horizontal overflow on mobile.

Visual QA must compare the implemented page against the accepted concept image and verify at least:

- Map-first composition.
- Institution/source-first hierarchy.
- Warm editorial palette.
- Reduced card/dashboard feeling.
- Mobile-safe region selection.
- Warning and verification copy remain visible without dominating the page.

## Non-Goals

- Do not add new scholarship data.
- Do not invent benefit summaries beyond the current record fields.
- Do not change auth, route protection, sitemap, robots, or Supabase behavior.
- Do not implement PWA assets.
- Do not replace the local GeoJSON source with a remote dependency.
