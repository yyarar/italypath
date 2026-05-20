# Home Wiring + Auto-Advance Stage — Design

**Date:** 2026-05-19
**Scope:** Three small connected pieces of polish following the hub editorial dossier ship: (1) auto-advance the localStorage `italyPathStage` from user actions (favorites + documents) so the dossier feels alive without manual clicking, (2) make every decorative-but-non-clickable element on the home page actually navigate somewhere meaningful, (3) catch up `AGENT_COMMITS.md` with the four major redesigns shipped recently.
**Status:** Brainstorm approved · ready for implementation plan.

---

## 1. Goal & motivation

After the editorial hub redesign shipped, three follow-up gaps remain:

- The new stage tracker on `/hub` is purely manual. Users must click a step in StageStrip to set "şu an buradayım". The app already knows when they've started a shortlist (first favorite) or begun gathering documents (first upload), but does nothing with that signal. Auto-advancing fixes this without any new persistence.
- The home page's editorial-style cards and tables (StudyDossier, ScholarshipsSection's regional list, VelocityBridge stats) include several elements that LOOK clickable — arrow icons, count chips, framed cards — but aren't wired to links. Users tap them and nothing happens. Either remove the arrows or make them real; we're making them real.
- `AGENT_COMMITS.md` last entry is Commit 50. Three major redesigns (mentor consultation hub, communities atlas, hub dossier) and the current spec have shipped since then. The file needs to catch up.

---

## 2. Out of scope

- No new Supabase tables, columns, or policies.
- No new dependencies.
- No changes to `proxy.ts` route protection.
- No automatic stage advance for `application` or `result` — the app has no signal for "user submitted" or "results received". Those stages remain manual via StageStrip.
- No changes to IseeSection's three feature-description items (Gelir/Aile/Tahmini) — they are explanatory copy, not navigation, and are correctly left as-is.
- No backfill or migration of existing users' stages — anyone who already used StageStrip manually keeps whatever they set.

---

## 3. Part A — Auto-advance stage

### 3.1 Helper contract

Append a single export to `lib/hub/useHubStage.ts`:

```ts
export function advanceStageIfBefore(target: HubStageId): void {
  if (typeof window === "undefined") return;
  const current = readStage();
  if (getStageIndex(current) < getStageIndex(target)) {
    window.localStorage.setItem(STORAGE_KEY, target);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}
```

`readStage`, `getStageIndex`, `STORAGE_KEY`, `CHANGE_EVENT` already exist in the same file — reuse them. No new constants.

**Semantics:**
- Idempotent. Calling `advanceStageIfBefore("shortlist")` 100 times in a row has the same effect as calling it once.
- Never moves the stage backward. If the user manually set themselves to `application`, calling `advanceStageIfBefore("shortlist")` is a no-op.
- Dispatches `CHANGE_EVENT` after the localStorage write so any mounted StageStrip / DossierHero / DossierLede instance reactively updates in the same tab. Cross-tab updates via the native `storage` event already work.
- SSR-safe: guards `typeof window === "undefined"` first.
- Resilient to corrupted state: `readStage()` already falls back to `DEFAULT_STAGE` if localStorage holds an invalid value. No additional handling needed.

### 3.2 Call sites

**`lib/useFavorites.ts` — `toggleFavorite` add branch:**

The existing `toggleFavorite` function already distinguishes add from remove. Add `advanceStageIfBefore("shortlist")` only on the add branch — never on remove. Removing a favorite must NOT walk the stage backward.

If the existing implementation does an optimistic add then rolls back on Supabase error, the advance call goes BEFORE the Supabase write. If the write fails, the stage stays advanced — that's acceptable. The user did intend to favorite something; the dossier reflecting that intent is fine even if persistence hiccups.

**`app/documents/page.tsx` — upload success:**

The page already has an upload flow that writes to Supabase Storage then inserts a `user_documents` row. Add `advanceStageIfBefore("documents")` AFTER the DB insert succeeds — not after just the storage upload, because the current cleanup logic deletes the storage object if the DB insert fails. Aligning advance with the DB success keeps the dossier truthful.

Both call sites import from `@/lib/hub/useHubStage` (a top-level import — these are existing client components so the import is safe).

### 3.3 Edge cases

- **Guest user adds favorite:** localStorage works for guests; `italyPathFavorites` and `italyPathStage` both live there. Advance fires. The dossier on `/hub` won't be visible (route is protected) but if the user later signs in, the stage persists.
- **Race between favorite and document upload:** localStorage writes are not transactional, but since `advanceStageIfBefore` only moves forward and both targets (`shortlist`, `documents`) are in-order, the worst case is "shortlist set, then documents set, then shortlist no-ops" — final state correct.
- **User on `/hub` adds favorite from another tab:** `storage` event fires, StageStrip's `useSyncExternalStore` re-reads, marker animates to the new stage. Already works because of the existing hook plumbing.
- **Reduced motion:** This change touches state, not UI. StageStrip's pulse ring already respects `prefers-reduced-motion`. No new motion introduced.

### 3.4 Files touched

- `lib/hub/useHubStage.ts` (append `advanceStageIfBefore` export)
- `lib/useFavorites.ts` (call advance in toggleFavorite add branch)
- `app/documents/page.tsx` (call advance after DB insert success)

---

## 4. Part B — Home page decorative → real wiring

Every element below currently renders as a `<div>` or `<span>` that looks interactive but isn't. The change converts each to a `<Link>` from `next/link` with semantic href, hover/focus styling matching the existing editorial pattern, and an `aria-label` where the visible text alone doesn't say where the click leads.

### 4.1 `components/HeroSection.tsx` — StudyDossier card

The aside wrapper `<motion.aside>` stays. Internal elements that change:

**Header row** (Çalışma Dosyası eyebrow + "2026 ItalyPath" h2 + GraduationCap icon)

Wrap the entire flex row in a single `<Link href="/hub">`. Hover state: background lightens to `var(--editorial-band)`. Focus-visible: outline-2 sage with offset-2.

```tsx
<Link
  href="/hub"
  aria-label={language === "tr" ? "Çalışma dosyasına git" : "Open your study dossier"}
  className="-m-2 flex items-center justify-between gap-3 rounded-none p-2 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
>
  {/* existing children: eyebrow + h2 + icon */}
</Link>
```

The `-m-2 p-2` trick gives a slightly larger hit area without shifting layout.

**Kısa Liste eyebrow + `3/12` count row**

The current `<div className="mb-3 flex items-center justify-between">` containing the eyebrow `<p>` and count `<span>` becomes a `<Link href="/favorites">`. Same hover treatment (band background tint). aria-label: "Favori listene git" / "Open your favorites".

**3 university rows** (Politecnico Milano, Bologna, Sapienza Roma)

Replace the `schools` arrays with typed entries that include `id`, `name`, `meta`. Each `<div className="grid grid-cols-[1fr_auto] gap-4 py-3">` becomes a `<Link>`:

```tsx
const featuredSchools = language === "tr"
  ? [
      { id: "politecnico-di-milano", name: "Politecnico di Milano", meta: "Mühendislik" },
      { id: "universita-di-bologna", name: "University of Bologna", meta: "Kamu üniversitesi" },
      { id: "sapienza-universita-di-roma", name: "Sapienza Roma", meta: "Tıp ve sosyal bilimler" },
    ]
  : [
      { id: "politecnico-di-milano", name: "Politecnico di Milano", meta: "Engineering" },
      { id: "universita-di-bologna", name: "University of Bologna", meta: "Public university" },
      { id: "sapienza-universita-di-roma", name: "Sapienza Rome", meta: "Medicine and social sciences" },
    ];

// then in JSX:
{featuredSchools.map(({ id, name, meta }) => (
  <Link
    key={id}
    href={`/universities/${id}`}
    className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)]"
  >
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-[var(--editorial-ink)]">{name}</p>
      <p className="mt-1 text-xs text-[var(--editorial-muted)]">{meta}</p>
    </div>
    <ArrowRight className="mt-1 h-4 w-4 text-[var(--editorial-muted)] transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
  </Link>
))}
```

**ID slug verification (mandatory before merge):** The implementer must `grep -nE "id: ['\"](politecnico-di-milano|universita-di-bologna|sapienza-universita-di-roma)['\"]" app/data.ts` to confirm the exact slug values. If any slug differs (e.g., `politecnico_milano`, `bologna`, `sapienza-roma`), adjust the array to match the actual ids in `app/data.ts`. If a school's id can't be found, BLOCK and report — don't ship broken links.

**Belge kontrolü card** (the white-bg card with FileText icon + 4 documents)

Wrap the entire `<div className="border border-[var(--editorial-border)] bg-white p-4">` in `<Link href="/documents">`. Hover: border swaps to sage. aria-label: "Belge cüzdanına git" / "Open document wallet". The internal checklist (Pasaport ✓ etc.) remains decorative — those individual lines are not links.

**Burs notu card** (the band-bg card with Landmark icon + scholarship paragraph)

Wrap entire card in `<Link href="/scholarships">`. Hover: background tint slightly deeper (use `hover:bg-[#efe9da]`). aria-label: "Burs haritasına git" / "Open scholarship map".

### 4.2 `components/HeroSection.tsx` — Left column stat grid

The 3-cell `<motion.div className="mt-10 grid max-w-xl grid-cols-3 border-y border-[var(--editorial-border)] text-sm">` with [universities, programs, regions] becomes:

```tsx
const heroStats: Array<{ value: string; label: string; href: string; ariaLabel: { tr: string; en: string } }> = [
  {
    value: formatStatValue(stats.universitiesCount),
    label: language === "tr" ? "üniversite" : "universities",
    href: "/universities",
    ariaLabel: { tr: "Üniversite listesine git", en: "Open university list" },
  },
  {
    value: formatStatValue(stats.programsCount),
    label: language === "tr" ? "program" : "programs",
    href: "/universities",
    ariaLabel: { tr: "Program listesine git", en: "Open program list" },
  },
  {
    value: "20",
    label: language === "tr" ? "bölge" : "regions",
    href: "/scholarships",
    ariaLabel: { tr: "Bölgesel burs haritasına git", en: "Open regional scholarship map" },
  },
];
```

Each cell `<div className="py-4 pr-4">` becomes `<Link>` with the same py/pr padding plus hover (value text shifts to sage, label to ink) and focus-visible outline. Keep the existing `border-y` divider on the grid container.

### 4.3 `components/VelocityBridge.tsx`

Convert the items array to include hrefs:

```tsx
const items: Array<{ value: string; label: string; href: string }> = language === "tr"
  ? [
      { value: formatStatValue(stats.universitiesCount), label: "üniversite", href: "/universities" },
      { value: formatStatValue(stats.programsCount), label: "program", href: "/universities" },
      { value: "20", label: "bölgesel burs kaydı", href: "/scholarships" },
      { value: "1", label: "kişisel merkez", href: "/hub" },
    ]
  : [
      { value: formatStatValue(stats.universitiesCount), label: "universities", href: "/universities" },
      { value: formatStatValue(stats.programsCount), label: "programs", href: "/universities" },
      { value: "20", label: "regional scholarship records", href: "/scholarships" },
      { value: "1", label: "personal hub", href: "/hub" },
    ];
```

Each cell currently is a `<div className="border-b ... py-5 sm:border-r sm:pr-6 lg:border-b-0">`. Wrap in `<Link>` with the same classes plus `transition-colors hover:bg-[var(--editorial-surface)]` and focus-visible outline.

### 4.4 `components/ScholarshipsSection.tsx` — 3 region rows

The `regions` array (Lazio / Lombardia or Lombardy / Emilia-Romagna) maps to slugs:

```tsx
const REGION_SLUGS = ["lazio", "lombardia", "emilia-romagna"] as const;
const regions = language === "tr"
  ? [
      { slug: "lazio", name: "Lazio" },
      { slug: "lombardia", name: "Lombardia" },
      { slug: "emilia-romagna", name: "Emilia-Romagna" },
    ]
  : [
      { slug: "lazio", name: "Lazio" },
      { slug: "lombardia", name: "Lombardy" },
      { slug: "emilia-romagna", name: "Emilia-Romagna" },
    ];
```

Each `<div className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4">` becomes:

```tsx
<Link
  key={slug}
  href={`/scholarships?region=${slug}`}
  className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)]"
>
  {/* existing children: number, name+meta, ArrowRight */}
</Link>
```

ArrowRight gains `group-hover:translate-x-0.5 transition-transform`.

**Verified:** `components/scholarships/ScholarshipsExplorer.tsx` already reads `region` from `useSearchParams()` and pre-selects the region on mount. No changes needed there. The slugs in `lib/scholarships/regions.ts` are confirmed: `lazio`, `lombardia`, `emilia-romagna`.

### 4.5 `components/Footer.tsx` — Remove dead social labels

Delete the entire `<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--editorial-muted)]">` block containing the `Twitter` / `Instagram` / `LinkedIn` spans. Also remove its parent's `md:flex-row md:items-end md:justify-between` layout helpers since there's now only one column — simplify to a single block.

After change:

```tsx
<footer className="border-t border-[var(--editorial-border)] bg-[var(--editorial-paper)] py-12">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <span className="font-serif text-2xl font-medium tracking-[-0.02em] text-[var(--editorial-ink)]">ItalyPath</span>
    <p className="mt-2 max-w-md text-sm leading-6 text-[var(--editorial-muted)]">
      {language === "tr"
        ? "İtalya'da eğitim planını daha sakin, düzenli ve güvenilir şekilde kurman için."
        : "A calmer, clearer way to plan your study path in Italy."}
    </p>
    <p className="mt-3 text-xs text-[var(--editorial-muted)]">© 2026 ItalyPath</p>
  </div>
</footer>
```

### 4.6 Cross-cutting interaction & a11y rules

- Every new `<Link>` uses `next/link` (already a project convention).
- Hover treatment is uniform: subtle `var(--editorial-band)` tint on rows, `var(--editorial-surface)` tint on stat cells (lighter), or border-color swap to sage on the two large StudyDossier cards. No drop shadows, no scale transforms. Keeps the editorial restraint of the page.
- Focus-visible: `outline-2 outline-offset-2 outline-[var(--editorial-sage)]` on all new Links. For Links inside bordered containers (StudyDossier school rows), use `offset-[-2px]` so the outline sits inside the cell.
- ArrowRight icons that already exist get a `group-hover:translate-x-0.5 transition-transform` to telegraph the link. No new icons added.
- Minimum tap target is ≥ 44px on mobile via existing `py-3`+ padding on rows and `py-4`+ on cells. No layout shift.
- `motion.aside` / `motion.div` containers stay; Links are children. Framer Motion's spring entrance is unaffected.
- Reduced motion: no new perpetual animations introduced. Hover transitions are short (0.15s color) — already covered by global `transition-colors`.

### 4.7 Files touched

- `components/HeroSection.tsx` (StudyDossier internal Links + hero stat grid Links)
- `components/VelocityBridge.tsx` (4 cells → Links)
- `components/ScholarshipsSection.tsx` (3 region rows → Links with query param)
- `components/Footer.tsx` (delete dead social block, simplify layout)

---

## 5. Part C — `AGENT_COMMITS.md` catch-up

Append four new entries after the existing Commit 50. Format mirrors the convention used throughout the file: `### Commit N (Title):` followed by a `| Dosya | Değişiklik |` table with single-line entries per file. Emoji legend in use across the file:

- 🆕 created
- ♻️ refactored / replaced
- ➕ added to existing file
- ❌→✅ before/after
- 🗑️ deleted
- 📝 documentation update

### Entry 1: `### Commit 51 (Mentor 3-Masa Danışma Hub'ı)`

Documents the move from the old single-stream chatbot to the AI / Volunteer / Expert three-desk consultation hub. Files include `app/ai-mentor/page.tsx` rewrite, six new `components/mentor/*` files, `lib/mentor/channels.ts`, and translations additions.

### Entry 2: `### Commit 52 (Communities Atlas Redesign)`

Documents the move from the old filter dashboard to the 5-chapter editorial atlas. Files: `app/communities/page.tsx` orchestrator change, `components/communities/CommunityAtlas.tsx` new leaf, `lib/community-links.ts` chapter field addition, `lib/communities/chapters.ts` new bucketer.

### Entry 3: `### Commit 53 (Hub Editöryel Çalışma Dosyası)`

Documents the full hub redesign covered by `docs/superpowers/specs/2026-05-18-hub-redesign-design.md`. Files: full `app/hub/page.tsx` rewrite, 10 new `components/hub/*` files, 3 new `lib/hub/*` files, `app/globals.css` token + keyframe additions, `lib/translations.ts` namespace overhaul, `app/ai-mentor/page.tsx` forward-compat localStorage write.

### Entry 4: `### Commit 54 (Home Wiring + Auto-Advance Stage)`

The current spec. Files: `lib/hub/useHubStage.ts` helper export, `lib/useFavorites.ts` advance call, `app/documents/page.tsx` advance call, `components/HeroSection.tsx` Link conversions, `components/VelocityBridge.tsx` Link conversions, `components/ScholarshipsSection.tsx` regional Links, `components/Footer.tsx` social removal, `AGENT_COMMITS.md` itself (this entry plus the three above).

**Position:** All four entries are appended to the end of `AGENT_COMMITS.md` in order 51 → 54. The file's existing structure ends after Commit 50; no other content is reordered or deleted.

**Full content of each entry is written verbatim in the implementation plan (writing-plans output) — the tables above in Section C of the brainstorm conversation are the source of truth for what each row says.**

### Files touched

- `AGENT_COMMITS.md` (append 4 new commit entries)

---

## 6. Translations

No new translation keys. All copy already exists:

- StudyDossier school names + metas: hardcoded in HeroSection (already locale-branched). Stays.
- Region names: hardcoded in ScholarshipsSection (already locale-branched). Stays.
- VelocityBridge stat labels: hardcoded (already locale-branched). Stays.
- aria-labels for new Links: small, locale-branched inline ternaries — adding to `lib/translations.ts` would inflate the namespace for 6-7 trivial strings. Keep inline for v1 with a comment noting they could move later if more navigation surfaces share the same labels.

---

## 7. States & error handling

| State | Trigger | Behavior |
|---|---|---|
| First favorite added (any user) | `useFavorites.toggleFavorite` add | Stage advances `discovery → shortlist`. UI on `/hub` updates next time it mounts or via `storage`/custom event. |
| Favorite removed | `useFavorites.toggleFavorite` remove | No stage change. |
| First document uploaded successfully | `app/documents/page.tsx` insert success | Stage advances `* → documents` if still before. |
| Document upload Supabase Storage fails | Existing handler | No advance. Existing error UI fires. |
| Document upload Storage succeeds but DB insert fails | Existing handler (cleans up uploaded object) | No advance. |
| Home page Link clicked while offline | Next.js client navigation | Falls back to full page nav; route either loads or service-worker / browser handles. No special handling needed. |
| University detail page id mismatch (broken slug from StudyDossier) | Implementer-introduced bug | The university detail route would 404. Implementer's grep verification in Section 4.1 is the gate that prevents this from shipping. |
| `/scholarships?region=invalid` (impossible from our wiring but defensive) | URL handler | `ScholarshipsExplorer` already checks via `isRegionSlug` and falls back to `SCHOLARSHIP_DEFAULT_REGION`. Unchanged. |

---

## 8. Implementation order (preview for writing-plans)

The plan will sequence atomic tasks roughly in this order:

1. Add `advanceStageIfBefore` to `lib/hub/useHubStage.ts`
2. Wire `lib/useFavorites.ts` add branch
3. Wire `app/documents/page.tsx` upload success
4. HeroSection StudyDossier Links (header, count, schools, two cards)
5. HeroSection left-column stat grid Links
6. VelocityBridge Links
7. ScholarshipsSection regional Links
8. Footer social cleanup
9. AGENT_COMMITS.md append four entries
10. Verification: `npm run lint && npm run build && npm run check:routes && npm run check:data`

Each step is its own commit. No tests added (project has none for the relevant surfaces; the spec follows the same posture as the hub redesign spec).

---

## 9. Open questions

1. **University slug exact values** — implementer must verify against `app/data.ts` before merging. If any slug differs from `politecnico-di-milano`, `universita-di-bologna`, `sapienza-universita-di-roma`, adjust the array and report the change in the commit message. This is a hard gate, not a soft preference.
2. **Pre-existing AGENT_COMMITS chronology** — the file's commit numbers (1-50) appear to be logical groupings, not 1:1 with git commits. We continue that convention (one logical entry per shipped feature). If the project wants strict 1:1 mapping in the future, that's a separate doc-discipline refactor.

---

## Appendix — Verification commands

After implementation, the following should all be clean:

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run check:routes
npm run check:data
```

Plus a manual visual smoke test on `npm run dev`:
- Click each new Link on the home page; confirm correct navigation.
- Add a favorite from `/universities`; navigate to `/hub`; confirm stage shows `Kısa Liste` (II.) as active.
- Upload a document on `/documents`; navigate to `/hub`; confirm stage shows `Belge` (III.) as active.
- Click on the Politecnico row in StudyDossier on home; confirm it lands on the Politecnico detail page.
- Click `Lazio` in ScholarshipsSection on home; confirm `/scholarships` opens with Lazio pre-selected.
- Verify Footer no longer shows Twitter/Instagram/LinkedIn.
