# Communities Editorial Atlas Redesign

Date: 2026-05-14
Status: Awaiting user review

## Goal

Redesign `/communities` from a generic filter/badge dashboard into an editorial atlas. The current page tries to be a Notion-style database with 19 hand-curated items — the filter chrome, rounded card grid, and indigo/emerald/slate palette read as AI-generated and conflict with ItalyPath's editorial brand (warm paper, sage, terracotta, serif headlines, border-based separators).

The redesigned page must:

- Read like a hand-edited city guide, not a filterable directory.
- Sit in the same visual grammar as `/scholarships` editorial atlas (paper background, serif `font-serif text-7xl` headlines, terracotta accents, border-divided rows).
- Differentiate from `/scholarships` by axis: scholarships is geographic (region map), communities is need-based (chapters by what the student is looking for).
- Carry editorial voice without committing to write a curator's note for every single community — only where one already exists.

## Visual Direction

Reuse the project's editorial language:

- `bg-[var(--editorial-paper)]` (#f8f7f1) background.
- `font-serif` (Iowan Old Style / Hoefler Text fallback) for hero title and chapter titles.
- `text-[var(--editorial-ink)]` (#15201c) ink, `text-[var(--editorial-muted)]` (#59645f) muted, `text-[var(--editorial-sage)]` (#1f4f46) accents, `text-[var(--editorial-terracotta)]` (#b75b38) for chapter numbers and external link actions.
- Square / `rounded-md` radii at most; **no `rounded-3xl` SaaS cards anywhere**.
- All grouping is achieved with `border-t` / `border-b` and uppercase letter-spaced labels — never with shadowed cards.
- One page, single scroll column, `max-w-7xl mx-auto`.
- No sticky chapter rail, no search input, no filter chips, no badges/pills cluster per row.

## Information Architecture

### Top bar

Identical structure to scholarships:

- `←` Back to home (text only, `text-muted` → hover `text-sage`).
- Page identity center (`Öğrenci Toplulukları · Atlas` / `Student Communities · Atlas`).
- Language toggle pill (TR ⇄ EN).

### Hero

Two-column grid `lg:grid-cols-[1.05fr_0.35fr]`, items end-aligned.

- **Left column:**
  - Issue label `SAYI 01 — 2026 KAYIT YILI` / `ISSUE 01 — 2026 INTAKE YEAR` (uppercase, 11px, muted, letter-spaced).
  - H1 in `font-serif text-5xl sm:text-6xl lg:text-7xl`, three-line block:
    `Öğrenci\ntopluluklarının\natlası.`
    (English: `An atlas of\nstudent\ncommunities.`)
  - Lead paragraph `text-base sm:text-lg leading-8 max-w-2xl text-muted` explaining curation policy briefly.
- **Right column (curation note):**
  - `border-l-2 border-[var(--editorial-terracotta)] pl-4`
  - Italic serif body listing last collection-wide check date + "resmi değil, üye onaylı" disclaimer.

### Table of Contents

Below hero, separated by `border-y border-editorial-border`, `py-6`:

- Italic serif label `İçindekiler` / `Contents` top-left.
- Five-column equal grid (`grid-cols-5`), each column with `border-l border-editorial-border`, last column also `border-r`.
- Each column: chapter number (terracotta 10px letter-spaced) → chapter title (semibold 13px) → topluluk count (10px muted).
- Each column is a hash anchor link (`#chapter-housing`, etc.) that jumps to the chapter.
- **Not sticky.** It appears once after the hero and scrolls with the page.
- **Mobile**: collapses to `overflow-x-auto snap-x` horizontal strip; columns become snap items with min-width 160px. The label sits above the strip.

### Chapter blocks (×5)

For each chapter in fixed order:

```
01 — Hazırlık (Başvuru & Burs)
02 — Konaklama
03 — Üniversite Aileleri
04 — Şehir Sesi
05 — Pan-İtalya
```

Anatomy:

- **Section header row** (`flex justify-between items-baseline`):
  - Left: terracotta chapter number (11px letter-spaced 0.18em) + `font-serif text-3xl sm:text-4xl` title.
  - Right: `text-xs text-muted` city/region summary (`4 topluluk · Roma, Bologna, Ravenna`).
- **Chapter intro** (`font-serif italic text-base sm:text-lg leading-relaxed text-muted max-w-2xl`, `mt-4 mb-8`): 1–2 sentence curated paragraph.
- **Entry list** (`border-t border-editorial-border`):
  - Stack of `<EntryRow>` instances, each terminated by `border-b border-editorial-border/50`. Final row uses bottom border on chapter block instead.

Each chapter is wrapped in `<section id={chapter.slug} aria-labelledby={...}>` to be addressable by TOC anchors.

### EntryRow anatomy

Grid `grid-cols-[32px_minmax(0,1fr)_auto] gap-4 sm:gap-5 py-5`.

1. **Platform monogram** (column 1, top-aligned when blurb present):
   - Two-letter uppercase, `text-[11px] font-bold tracking-[0.08em]`.
   - WA → `text-editorial-sage` (#1f4f46).
   - FB → `text-editorial-ink` (#15201c).
   - TG → `text-editorial-terracotta` (#b75b38).
   - No icons. Letters carry the entire signal — consistent with brand.
2. **Content column:**
   - Top: `flex justify-between items-baseline gap-3`:
     - Community name `text-base sm:text-lg font-semibold text-ink tracking-[-0.005em]`.
     - Right meta `text-[10px] text-muted tracking-wide whitespace-nowrap`:
       `${region ?? cityFallback} · ${formattedLastChecked}`.
   - Conditionally below, when `editorialNote` is present:
     - `mt-1.5 font-serif italic text-sm leading-relaxed text-muted max-w-2xl`.
3. **Action label** (column 3, self-aligned):
   - `text-[11px] font-bold tracking-[0.12em] text-editorial-terracotta` reading `AÇ ↗` / `OPEN ↗`.
   - Includes `<ExternalLink>` icon at `h-3 w-3 ml-1`.

The entire row is rendered as `<a href={url} target="_blank" rel="noopener noreferrer">`.

- Hover: `bg-[#f6f0e7]` (scholarships parity), `transition-colors duration-200 ease-out`.
- `:active`: subtle `scale-[0.995]` via `active:scale-[0.995] transition-transform`.
- Focus visible: `outline-2 outline-offset-2 outline-editorial-sage`.

### Footer prompt

Closing block after the last chapter, separated by `border-t border-editorial-border`, `pt-10 pb-16`:

- Two-column grid `grid-cols-[1fr_auto] gap-6 items-center` (stacks vertically on mobile).
- Left: `font-serif text-xl sm:text-2xl` heading "Bilmediğimiz bir topluluk var mı?" / "Know a community we missed?" + 1-sentence sans body.
- Right: anchor `mailto:contact@italypath.com?subject=...` styled as terracotta dış-buton:
  `border border-editorial-terracotta text-editorial-terracotta text-[11px] font-bold tracking-[0.12em] px-4 py-2.5 uppercase` reading `TOPLULUK ÖNER ↗` / `SUGGEST A COMMUNITY ↗`.

> Mail target `contact@italypath.com` is a placeholder. Confirm or replace with the production address during implementation.

## Component Architecture

Routing remains untouched:

- `app/communities/page.tsx` stays a Server Component, exports `metadata`, renders the new client leaf. Existing OG/canonical metadata is preserved.
- `app/topluluklar/page.tsx` keeps its redirect to `/communities`.

Replace the client leaf entirely. Delete `components/communities/CommunityLinksExplorer.tsx`.

Create:

- `components/communities/CommunityAtlas.tsx` — client component, top-level composition.

Internal sub-components live in the same file (or split if it gets unwieldy, mirroring the scholarships explorer pattern):

- `AtlasTopBar` — back link, identity, language toggle.
- `AtlasHero` — issue label, headline, intro paragraph, terracotta-bordered curation note.
- `AtlasTableOfContents` — desktop 5-col grid + mobile snap strip.
- `ChapterBlock` — section header + intro paragraph + entry list.
- `EntryRow` — single community link.
- `AtlasFooterPrompt` — mailto CTA closing block.

All client-component logic. No async fetch. No `useSearchParams`. No `Suspense` required.

## Data Model Changes

### Add `chapter` to `CommunityLink`

In `lib/community-links.ts`:

```ts
export const COMMUNITY_CHAPTERS = [
  "preparation",
  "housing",
  "university",
  "city-voice",
  "pan-italy",
] as const;
export type CommunityChapter = (typeof COMMUNITY_CHAPTERS)[number];

export interface CommunityLink {
  // ...existing fields preserved
  chapter: CommunityChapter; // NEW, required
}
```

Each of the 19 existing records gains a `chapter` field per the assignment table below. Other fields (`category`, `status`, `audience`, `description`, `sizeHint`, `verificationSource`) remain in the data — they are not rendered by the new UI but are retained to avoid lossy migration. The new component reads only the fields it needs.

### Chapter metadata file

New file: `lib/communities/chapters.ts`.

```ts
export interface CommunityChapterMeta {
  id: CommunityChapter;
  slug: string;          // hash anchor target (kebab-case)
  order: number;         // 1..5
  titleTr: string;
  titleEn: string;
  introTr: string;       // italic serif paragraph, 1–2 sentences
  introEn: string;
  citySummaryTr: string; // e.g. "Roma, Bologna, Ravenna"
  citySummaryEn: string;
}

export const COMMUNITY_CHAPTER_META: CommunityChapterMeta[] = [/* see below */];

export function getCommunitiesByChapter(): Record<CommunityChapter, CommunityLink[]> { /* … */ }
```

City summary is derived at edit time, not auto-computed, so the editor controls phrasing (`"Roma, Bologna, Ravenna"` vs `"Bologna ve Ravenna"`).

## Chapter Assignment (19 → 5)

| Chapter ID    | Slug              | Communities                                                                                                                                                |
| ------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preparation` | `chapter-prep`    | `pre-enrollment-yardimlasma`, `ergo-yardimlasma`, `ergo-burs-basvuru-sureci`                                                                               |
| `housing`     | `chapter-housing` | `roma-ev-oda`, `apartments-bologna`, `accomodations-in-rome-2025-2026`, `househunters-ravenna`                                                             |
| `university`  | `chapter-uni`     | `unibo-general`, `sapienza-general`, `sapienza-2026-2027`, `unito-22-23`, `unito-23-24`                                                                    |
| `city-voice`  | `chapter-city`    | `padova-community`, `firenze-whatsapp`, `bologna-hiking-club`, `bologna-erasmus-students`, `spotted-unibo-ravenna`                                         |
| `pan-italy`   | `chapter-pan`     | `italyada-yasayan-turkler`, `italya-bilgi`                                                                                                                 |

Totals: 3 + 4 + 5 + 5 + 2 = 19.

Within a chapter, entries are ordered by status (active before limited / unverified), then alphabetically by name — same ordering rule as the current page so the implementation reuses the comparator helper.

## Chapter Intro Drafts (TR + EN)

Draft copy below. The user is expected to polish; the implementation lands these verbatim and edits happen in a follow-up content pass.

### 01 — Hazırlık (Başvuru & Burs)

**TR:** İtalya yolu evrak ve başvuru telaşıyla başlar. Pre-enrollment dönemini bilenlerle paylaştığın grup, ilk aylarda en pratik kaynaktır. Burs tarafı Emilia-Romagna ağırlıklı — ER.GO süreç gruplarıdır.

**EN:** Italy begins with paperwork and timing. The pre-enrollment group is your most practical resource in the first months. Scholarships here lean Emilia-Romagna — ER.GO process groups.

### 02 — Konaklama

**TR:** Ev arayan öğrencinin ilk dört haftası bu gruplarda geçer. Roma'da arz az ve rotasyon yavaş; Bologna'da ilan günü gününe düşer. İki şehir için iki ayrı kanal öneriyoruz; Ravenna küçük ama düzenli.

**EN:** The first four weeks of housing hunting live inside these groups. Rome runs scarce and slow; Bologna sees fresh listings daily. Two cities, two separate channels — Ravenna small but steady.

### 03 — Üniversite Aileleri

**TR:** Cohort grupları, üniversitede sınıf arkadaşlarını bulduğun yerdir. UNIBO ve Sapienza geniştir; Unito'nun yıllık (22/23, 23/24) grupları daha küçük ama düzenli. Sapienza 2026/27 yeni kayıt yıllarına özel — dolduğunda kapanabiliyor.

**EN:** Cohort groups are where you find your classmates. UNIBO and Sapienza run large; Unito holds quieter yearly cohorts (22/23, 23/24). Sapienza 2026/27 is fresh-intake-specific and may close once full.

### 04 — Şehir Sesi

**TR:** Bir şehirde yaşamayı, ev arkadaşı bulmayı, hafta sonu yürüyüşüne çıkmayı sağlayan gruplar. Padova ve Firenze'nin genel toplulukları yıllardır ayakta; Bologna iki ayrı sosyal çevreye (Erasmus + hiking) bölünüyor. Ravenna küçük ama hareketli.

**EN:** These are the groups that make a city feel livable — flatmates, weekend hikes, casual meetups. Padova and Firenze run year after year; Bologna splits into two social circles (Erasmus + hiking). Ravenna runs small but lively.

### 05 — Pan-İtalya

**TR:** İtalya'da yaşayan Türk diasporasının geniş Facebook grupları. Yavaş ama derinden besleyen, soru-cevap odaklı — şehirden bağımsız genel bilgiler için.

**EN:** Wide Facebook groups for the Turkish diaspora in Italy. Slow but deep — Q&A oriented, useful for city-agnostic questions.

## Translations

Replace the `communities` block in `lib/translations.ts`. New keys:

- `backHome`, `pageIdentity`, `issueLabel`
- `heroTitle` (string with `\n` newlines for line breaks), `heroIntro`
- `curationNoteLeading` ("Son toplu kontrol: " / "Last collection-wide check: "), `curationNoteBody`
- `tocLabel`
- `communityCountSingular` / `communityCountPlural`
- `platformMonograms.{whatsapp,telegram,facebook}` (WA, TG, FB — same in both languages, but kept in translations for clarity)
- `openAction` (AÇ / OPEN)
- `lastCheckedShort` (used inline; intl-formatted via `formatDate`)
- `regionUnknown` (kept from existing)
- `footerTitle`, `footerBody`, `footerCta`, `footerMailSubject`

Delete obsolete keys: `badge`, `notOfficial`, `curationPolicy`, `searchPlaceholder`, `platformLabel`, `allPlatforms`, `categoryLabel`, `allCategories`, `categoryNames.*`, `statusNames.*`, `allStatuses`, `clearFilters`, `emptyTitle`, `emptyDescription`, `audienceLabel`, `verificationLabel`, `verificationNames.*`, `lastCheckedLabel`, `sizeHintLabel`, `sizeHintNames.*`, `editorialNoteLabel`, `openCommunity`, `resultsLabel`, `platformNames.*` (replaced by monograms), `cityUnknown` (region fallback used instead).

Keep `title`, `subtitle` keys repurposed if they are referenced from page metadata or other places — verify before deletion.

## Tokens & Typography

Reuse existing CSS variables; do not introduce new theme tokens.

- Background: `--editorial-paper`.
- Surface (hover row): `#f6f0e7` (literal; same value used by scholarships LinkRow hover — acceptable to inline).
- Ink: `--editorial-ink`. Muted: `--editorial-muted`. Sage: `--editorial-sage`. Terracotta: `--editorial-terracotta`. Border: `--editorial-border`.
- Type scale:
  - H1: `font-serif text-5xl sm:text-6xl lg:text-7xl font-normal leading-[0.95] tracking-[-0.025em]`.
  - Chapter H2: `font-serif text-3xl sm:text-4xl font-normal leading-tight tracking-[-0.02em]`.
  - Footer H3: `font-serif text-xl sm:text-2xl font-normal leading-tight tracking-[-0.015em]`.
  - Lead intro: `text-base sm:text-lg leading-8 text-muted`.
  - Chapter intro: `font-serif italic text-base sm:text-lg leading-relaxed text-muted`.
  - Per-entry blurb: `font-serif italic text-sm leading-relaxed text-muted`.
  - Eyebrow labels (issue, chapter number): `font-sans uppercase text-[11px] tracking-[0.16em]–[0.18em]`.
  - Action labels (AÇ, TOPLULUK ÖNER): `font-sans font-bold uppercase text-[11px] tracking-[0.12em]`.
  - Entry meta: `font-sans text-[10px] tracking-wide`.

No new font imports. Existing `font-serif` Tailwind default and system sans suffice — matching scholarships.

## Motion & Accessibility

The page is text-heavy editorial; motion stays restrained.

- Hero entry: `framer-motion` container with `staggerChildren: 0.08` and `delayChildren: 0.05`, items animating `opacity 0 → 1` and `y: 18 → 0` with `spring stiffness 110 damping 22`. Same vocabulary as `HeroSection.tsx`.
- Chapter blocks: `whileInView opacity 0/y 14 → 1/0`, `viewport: { once: true, margin: "-80px" }`, transition `duration 0.45 ease-out`. No stagger between rows inside a chapter.
- Row hover: pure CSS `transition-colors duration-200 ease-out` on `background-color`.
- Row `:active`: `active:scale-[0.995] transition-transform duration-100 ease-out`. Subtle Emil-style tactile feedback.
- `prefers-reduced-motion: reduce` → all entrance animations short-circuit to instant; hover transition stays since it's color-only. Use `useReducedMotion()` from framer-motion at the top of the client component.

Accessibility specifics:

- Each chapter `<section aria-labelledby="...-title">` with chapter title carrying that id.
- TOC anchors use semantic `<a href="#chapter-housing">`. Smooth scroll behavior is fine (CSS `scroll-behavior: smooth`) and respects reduced motion at the browser level.
- Row anchor: `target="_blank" rel="noopener noreferrer"`. Visually-hidden suffix announces "external link" via `aria-label` composed as `${name} — ${platformName} — yeni sekmede açılır`.
- Focus ring: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]`.
- Color contrast: all text/background pairs meet WCAG AA against the paper background.

## Responsive Behavior

| Element            | Mobile (<640px)                                                                                  | Tablet (640–1023px)                                                | Desktop (≥1024px)                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Hero               | Single column, terracotta-bordered note stacks below the intro paragraph.                        | Same single column, slightly larger headline.                      | Two-column grid `lg:grid-cols-[1.05fr_0.35fr]` end-aligned.                                  |
| Table of Contents  | Horizontal `overflow-x-auto snap-x` strip, columns min-width 180px each, edges softened with the existing `.mask-fade-horizontal` utility from `app/globals.css`. | Same horizontal strip.                                             | 5-col equal grid, no overflow.                                                               |
| Chapter header     | Title stacks above meta on its own line.                                                         | Same as desktop.                                                   | `flex justify-between items-baseline`.                                                       |
| Chapter intro      | Stays narrow; line-length capped via `max-w-prose`.                                              | Same.                                                              | Same.                                                                                       |
| Entry row          | Grid collapses: monogram on left at 28px wide, name + meta wrap. Right action moves to a new row below the content. | Three-column grid as on desktop.                                   | Three-column grid: `32px | 1fr | auto`.                                                     |
| Footer prompt      | Stacks vertically, CTA button full width.                                                        | Same as desktop.                                                   | Two-column grid `grid-cols-[1fr_auto] items-center`.                                         |

Container: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`.

## Out of Scope

- Search input, platform/category/status filter chips, "clear filters" button — **deleted**.
- Sticky chapter rail / floating TOC.
- New per-entry content writing for the 13 communities that lack `editorialNote` today. They stay sparse; the hybrid model holds.
- Pinning / "Editör'ün Seçtikleri" rotation strip.
- Submission form (a `<form>` to capture suggestions). The CTA is a plain `mailto:` link.
- Mobile BottomNav changes — Hub tab stays.
- Sitemap update — `/communities` is already a static route in `sitemap.ts`; no change needed.
- Supabase, auth, or persistence — page is fully public and reads from `lib/community-links.ts`.

## Smoke Verification (Implementation Exit Criteria)

- `npm run lint` clean.
- `npm run check:routes` passes (no Clerk boundary change).
- `npm run check:data` passes (data integrity script — verify it accepts the new `chapter` field or extend if necessary).
- `npm run build` succeeds.
- Manual dev-server pass at `/communities`:
  - All 19 communities visible.
  - Each chapter shows correct count and city summary.
  - TOC anchors jump to correct chapters.
  - Hover, focus, and tactile press states render.
  - Mobile breakpoint at 375px: TOC horizontally scrolls, entry rows stack action below content.
  - Language toggle flips all chrome and chapter intros.
  - `/topluluklar` still redirects to `/communities`.
  - External link opens correct WhatsApp/Telegram/Facebook URL in new tab.

## Implementation Phases

1. **Data layer**: extend `CommunityLink` with `chapter`; create `lib/communities/chapters.ts`; assign chapter on all 19 records.
2. **Translations**: rewrite `t.communities` block; remove obsolete keys; add new ones.
3. **Component**: delete `CommunityLinksExplorer.tsx`; build `CommunityAtlas.tsx` with all internal pieces.
4. **Page**: update `app/communities/page.tsx` import target only.
5. **Polish & smoke**: motion tuning, focus states, reduced-motion path, dev-server walkthrough, lint/build/route/data scripts.

## Open Questions (Confirm During Review)

- `contact@italypath.com` — placeholder for the suggestion mailto target. Provide the canonical address before implementation, or accept the placeholder.
- Chapter intro drafts — five paragraphs × two languages above are first drafts. Polish during review or after implementation lands.
- Issue label phrasing: `SAYI 01 — 2026 KAYIT YILI` is editorial flavor. If it feels too magazine-affected, replace with a calmer `2026 SEÇKİSİ` or remove entirely.
