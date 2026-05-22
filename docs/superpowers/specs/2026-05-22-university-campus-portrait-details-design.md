# University Details Redesign - Campus Portrait

Date: 2026-05-22
Status: Brainstorm approved, awaiting user review

## Goal

Redesign the university and program detail pages from scratch so they stop feeling like older generic AI UI surfaces and instead read as a calm ItalyPath school portrait.

The approved direction is **Campus Portrait**:

- The school image and school name carry the first impression.
- The rest of the page behaves like an editorial school dossier, not a glossy landing page or SaaS summary card.
- The university and program detail pages feel like siblings of the newer `/universities` Field Guide, `/communities` atlas, Mentor desks, and `/hub` dossier surfaces.
- Existing university and program information stays available in the redesigned UI except for the explicitly approved `fee` exception below.

## Approved Decisions

The user approved:

- Experience direction: **Editorial school dossier**.
- Visual approach: **Campus Portrait**.
- Scope: redesign both `/universities/[id]` and `/universities/[id]/departments/[deptSlug]`.
- AI Mentor placement: keep it on both pages as a secondary action, not a page-defining CTA.
- Program navigation: keep the existing program expand/morph transition and simplify its visual treatment to match the calmer editorial UI.
- Data rule: do not lose existing visible university or program information during the redesign.
- Fee exception: `fee` remains in the data model and other product surfaces, but it must not be displayed in either redesigned detail page.

Visual companion reference from brainstorming:

- `.superpowers/brainstorm/79611-1779460097/content/university-detail-approaches.html`

## Current Problems

The current detail pages are out of step with the newer ItalyPath direction:

- University detail opens with a dark gradient hero, glass buttons, large rounded cards, indigo accents, shadows, and a prominent sparkle AI CTA.
- Program detail goes even farther into dark full-screen gradients, glass panels, radial accent lighting, and theatrical "opening program" overlays.
- The information is useful, but its visual hierarchy makes the pages feel generated and promotional instead of editorial and trustworthy.
- The `/universities` list has already moved to a paper/sage/terracotta Field Guide language, so clicking into a detail page currently feels like crossing into an older product.

This redesign changes the visual attitude and hierarchy. It does not change the data source, route structure, auth boundary, or university/program contracts.

## Non-Goals

Do not use this work to:

- Change Supabase schema or university data.
- Add new university or program fields.
- Replace `useUniversitiesData`, the server metadata layouts, or the existing routes.
- Change route protection or login redirect behavior.
- Redesign `/universities` list again.
- Rework PWA assets or manifest files.
- Add program taxonomy, admissions requirements, rankings, or missing editorial content that is not present in the current dataset.

## Fee Exception

The user explicitly rejected fee display on both detail pages.

Implementation must follow this boundary:

- Keep the `fee` field in the university data model and upstream data flow unchanged.
- Do not render the fee in the redesigned university detail UI.
- Do not render the fee in the redesigned program detail UI.
- Do not treat fee removal from these two UIs as accidental data loss during detail-page verification.

All other currently visible school and program information must be preserved unless the user explicitly approves another exception.

## Visual Language

Use the existing editorial tokens already defined in `app/globals.css`:

- Page background: `var(--editorial-paper)`
- Primary surface: `var(--editorial-surface)`
- Primary text: `var(--editorial-ink)`
- Muted text: `var(--editorial-muted)`
- Primary accent: `var(--editorial-sage)`
- Warm accent: `var(--editorial-terracotta)`
- Borders and dividers: `var(--editorial-border)`
- Optional quiet band treatment: `var(--editorial-band)`

The detail pages should feel:

- Image-led at the top, but not cinematic or marketing-heavy.
- Serif-led for school and program names.
- Structured by borders, captions, rows, and spacing rather than floating glass cards.
- Grounded and readable at mobile sizes.
- Warm enough to feel authored, restrained enough to support repeated research.

Avoid:

- Dominant indigo, purple, or blue visual systems.
- Glassmorphism and blurred floating panels.
- Gradient-orb, radial glow, sparkle, or beam decoration.
- Over-rounded `rounded-3xl` card language for page sections.
- A giant AI CTA in the main decision hierarchy.
- Dark full-page program detail shells that visually detach from the rest of ItalyPath.

## Information Preservation Contract

### University detail must keep visible

- University image, using the existing fallback behavior where needed.
- University name.
- City.
- University type.
- Localized university description: `description` or `description_en`.
- Localized features: `features` or `features_en`.
- Official website link.
- Favorite toggle behavior.
- The complete program directory.
- Program count.
- Program level split between bachelor and master entries.
- Program navigation to the existing program detail route.
- Secondary AI Mentor entry point.
- Back behavior from list routes using the existing `?from=list` logic.

### Program detail must keep visible

- Program name.
- Owning university name and link back to its university detail.
- University image, using the existing fallback behavior where needed.
- City.
- Program level.
- Program duration.
- Program teaching language or languages.
- Localized university description as the available context note for the program.
- Official university website link.
- Other programs from the same university.
- Program navigation between other programs.
- Secondary AI Mentor entry point.

### Preserve in behavior

- Data loading and error handling around `useUniversitiesData`.
- Existing `not found` branches.
- External link safety for official site links.
- Signed-in versus signed-out AI Mentor destination behavior.
- Reduced-motion compatibility of motion interactions.
- Existing server metadata generation in route layouts.

## University Detail Structure

`/universities/[id]` becomes a school portrait followed by an editorial dossier.

### 1. Portrait Masthead

The first section opens with the school photograph and school identity.

Required content:

- Back action.
- Favorite action.
- School image.
- School name.
- City.
- University type.
- Program count.
- Official site link.

The masthead uses a two-zone layout on desktop:

- A strong image panel for the campus portrait.
- A school identity block with title and metadata.

On mobile it should collapse into a compact image-first sequence without hiding the school name or pushing all useful metadata below a full viewport image.

The photo should not be darkened into the current slate/indigo cinematic hero. If an overlay is needed for control legibility, keep it local and restrained.

### 2. School Note

Render the full localized description as a readable editorial note.

This section should:

- Use a comfortable reading measure.
- Avoid wrapping the prose in a glossy summary card.
- Treat the copy as guide text, not promotional chatbot output.

### 3. Highlights

Render every localized feature in a quiet editorial treatment.

Use divided editorial highlight rows that become a restrained multi-column list on larger viewports. Each row keeps one existing feature string intact and uses borders rather than colorful icon tiles.

Do not turn features into colorful SaaS badge cards.

### 4. Program Directory

Keep the program directory as the most important action area below the school identity.

Requirements:

- Show total program count.
- Keep bachelor and master groups separate.
- Render every program entry in the matching group.
- Keep program names intact.
- Keep program links routed through the current program detail path.
- Keep the expand/morph transition entry point.

The directory should read like a school catalog page:

- Section labels and counts are clear.
- Rows have strong scan rhythm.
- Tappable area is stable and large enough on mobile.
- The transition cue is quieter than the current indigo card hover treatment.

### 5. Secondary Mentor Action

Keep the AI Mentor affordance after the main school information and program directory or in another clearly secondary placement.

The action should:

- Remain discoverable.
- Preserve signed-out login redirect behavior.
- Read as a next step for asking about the school, not the hero CTA of the page.

## Program Detail Structure

`/universities/[id]/departments/[deptSlug]` becomes the program-focused sibling of the school portrait page.

### 1. Program Portrait Header

Use the owning school image as a visual anchor while making the program name the main headline.

Required content:

- Back link to the owning university detail.
- School image.
- Program name.
- Owning university name.
- City.
- Program level.
- Program duration.
- Program language or languages.

The page must stay in the editorial paper system. It should no longer open as a dark nearly full-screen modal-like surface.

### 2. Program Metadata Strip

Level, duration, and language need a highly scannable treatment.

The current runtime fallbacks stay meaningful:

- Languages fall back when an older cached program misses metadata.
- Duration falls back when it is missing.
- Level falls back to bachelor unless the program explicitly says master.

This section must not include fee.

### 3. Context Note

Current program records do not have a dedicated program description. Keep using the localized university description as the contextual editorial note.

The UI should make that relationship honest:

- It may be labeled as school context or an editorial note.
- It must not imply that the university description is a detailed curriculum description.

### 4. Official Site And Mentor

Keep the official university website as the trusted external route.

Keep AI Mentor as a secondary next step for questions about the program. It must not overpower the official source link or program metadata.

### 5. Other Programs

Keep the list of other programs from the same university.

Requirements:

- Render all `otherDepts`.
- Keep navigation to sibling program routes.
- Keep the existing expand/morph transition model for sibling program navigation.
- Use the same calmer program-row treatment as the university directory where practical.

## Program Transition Design

The existing `ExpandableScreen` path is useful and stays in scope.

The redesign should keep:

- Layout continuity from program row to program detail.
- Route push after the short transition delay.
- Shared layout IDs where they remain part of the current working behavior.

The redesign should reduce:

- Dark overlay theater.
- Full-screen gradient loading drama.
- Copy and motion that make every click feel like launching a separate product.

The transition becomes a brief editorial expansion state with the school image and program title, then resolves into the paper detail page.

## Suggested Component Boundaries

Keep route logic in the existing page files, but move repeated and visual-heavy detail UI into focused components.

Use a focused component area:

```text
components/university-details/
  UniversityPortraitMasthead.tsx
  UniversityHighlights.tsx
  ProgramDirectory.tsx
  ProgramTransitionEntry.tsx
  ProgramPortraitHeader.tsx
  ProgramMetaStrip.tsx
  DetailMentorPrompt.tsx
```

The intended boundaries are:

- Masthead/header components own page identity presentation.
- Program directory components own level grouping and row rendering.
- Transition entry component centralizes the morph surface shared by university and program pages if the existing animation contract supports that extraction cleanly.
- Mentor prompt component keeps the secondary AI action visually consistent across both pages.

Avoid creating a broad design system layer just for two routes.

## Data Flow

The redesign continues to rely on current data and route mechanisms:

- `useParams` to locate university and program IDs in client pages.
- `useUniversitiesData` for client university/program lookup.
- `useLanguage` for localized copy and field selection.
- `useFavorites` for university favorite state.
- Auth-aware AI route selection already present in page logic.
- Server `layout.tsx` metadata generation remains separate from client page UI.

Derived detail data stays local:

- Selected university by route ID.
- Selected program by slug.
- `bachelorDepts` and `masterDepts`.
- `otherDepts`.
- Localized description and feature arrays.
- Safe program metadata fallback labels.

No new global state is required.

## States And Error Handling

University detail and program detail should include redesigned states for:

- Loading.
- University data fetch error.
- Missing university.
- Missing program.

These states should match the paper/editorial language instead of retaining the current slate full-screen placeholders.

Do not degrade correctness while redesigning states:

- Missing university on the university detail page still provides a route back to `/universities`.
- Missing university or program on program detail still gives a clear path back to university exploration.
- Error copy remains concise and understandable in the current language path where translations exist.

## Responsive Behavior

Desktop:

- Campus portrait and identity can sit in a composed multi-column masthead.
- Description and feature sections can use wider editorial grids.
- Program directory can use grouped rows or two-column rhythm if names remain readable.

Mobile:

- School and program names wrap safely.
- Masthead photo has stable responsive dimensions.
- Back, favorite, official site, and Mentor actions stay tappable.
- Metadata strips avoid overflow on long university names or language labels.
- Program directory rows preserve enough width for program names.
- Bottom navigation clearance remains comfortable.

The next section of content should remain hinted below the first viewport. The page should not become a one-screen marketing hero.

## Accessibility

- Keep semantic links for official site and route navigation.
- Keep buttons for favorite toggles and animated program triggers.
- Favorite control keeps `aria-pressed` and an accessible label.
- External link text remains meaningful and links keep `rel="noopener noreferrer"`.
- Focus-visible states must be obvious in the editorial palette.
- Reduced-motion users keep a coherent route flow with toned-down transitions.
- Long display text must wrap or truncate only where truncation does not hide essential identity.

## Translation Guidance

Reuse `t.detail` and `t.department` where their meaning remains accurate.

Add TR/EN strings only where the new editorial information hierarchy needs them, such as:

- Masthead eyebrow or section labels.
- Program directory summaries.
- Context-note labels that make the university description honest on program pages.
- Secondary Mentor prompt copy if existing CTA labels are too loud for the new placement.

Translations must remain parallel across TR and EN.

## Verification Plan

Implementation should add an explicit focused check for the detail redesign because data preservation is a user requirement.

The check should guard that:

- University detail still renders description, features, official site, complete program groups, and favorite affordance.
- Program detail still renders university identity, city, program level, duration, language, official site, other programs, and context note.
- AI Mentor remains present but secondary on both pages.
- `fee` is not rendered in these two detail page UIs.
- The redesign does not reintroduce old detail-page indigo/glass/sparkle tokens.

Run existing project verification after implementation:

- `npm run lint`
- `npm run check:universities-ui`
- `npm run check:university-data-source`
- `npm run check:university-department-merge`
- `npm run build` when environment variables and sandbox constraints allow it

Browser verification after implementation:

- University detail desktop and mobile.
- Program detail desktop and mobile.
- University list -> detail -> back flow with `?from=list`.
- Favorite toggle from university detail.
- Official site link presence.
- Bachelor and master program group rendering.
- University program row -> program detail morph transition.
- Program detail other-program row -> sibling program transition.
- Reduced-motion sanity check.
- Long school and program name wrapping.

## Success Criteria

The redesign succeeds when:

- University and program detail pages feel authored in the same ItalyPath editorial family as the newer guide and dossier surfaces.
- Campus imagery gives the pages school identity without reviving dark glossy AI-era UI.
- The user can still inspect the same relevant school and program information, with `fee` excluded only by explicit product decision.
- Program navigation keeps its useful motion continuity while becoming calmer.
- Official-site and Mentor next steps are both available with the official route taking the more trustworthy visual priority.
