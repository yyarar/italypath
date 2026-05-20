# Home Wiring + Auto-Advance Stage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three small polish items: localStorage `italyPathStage` now auto-advances from favorites/documents user actions, every decorative-but-non-clickable element on the home page becomes a real `<Link>`, and `AGENT_COMMITS.md` catches up with the four major redesigns shipped since Commit 50.

**Spec:** [`docs/superpowers/specs/2026-05-19-home-wiring-auto-advance-design.md`](../specs/2026-05-19-home-wiring-auto-advance-design.md)

**Architecture:** One new export on `lib/hub/useHubStage.ts` (`advanceStageIfBefore`) called from two existing client surfaces (`useFavorites.toggleFavorite` add branch, `documents/page.tsx` upload success). Home-page Link wiring is direct `<div>` → `<Link>` conversion with semantic hrefs and the project's existing editorial hover/focus pattern. `AGENT_COMMITS.md` gets four appended entries in the same table format the file already uses. No new dependencies, no Supabase changes, no new translations.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Clerk, `@supabase/supabase-js`, `lucide-react`, `framer-motion`. All already in `package.json`.

**Testing posture:** Per the spec (which inherits the hub redesign's posture), no unit tests added — none of the affected surfaces have tests today. Verification per task is `npx tsc --noEmit`. Final verification adds `npm run lint && npm run build && npm run check:routes && npm run check:data`.

**Verified data points (already confirmed against the codebase, do NOT re-verify):**
- University ids: Politecnico di Milano = **1**, Sapienza University of Rome = **2**, University of Bologna = **3** (`app/data.ts` lines 113, 136, 163)
- Scholarship region slugs: `lazio`, `lombardia`, `emilia-romagna` (`lib/scholarships/regions.ts`)
- `ScholarshipsExplorer` already reads `?region=` from `useSearchParams` and pre-selects — no changes needed there
- `useFavorites.toggleFavorite` has explicit `alreadyFavorite` branch and calls `setFavorites(newFavorites)` optimistically at line 106 (`lib/useFavorites.ts`)
- `app/documents/page.tsx` sets `documentRowCreated = true` at line 77 after the DB insert succeeds — that's the advance hook point

---

## File Map

```
MODIFIED
  lib/hub/useHubStage.ts                # add advanceStageIfBefore export
  lib/useFavorites.ts                   # call advance in add branch
  app/documents/page.tsx                # call advance after DB insert success
  components/HeroSection.tsx            # StudyDossier internals + hero stat grid → Links
  components/VelocityBridge.tsx         # 4 cells → Links
  components/ScholarshipsSection.tsx    # 3 region rows → Links with ?region=
  components/Footer.tsx                 # remove dead social labels, simplify layout
  AGENT_COMMITS.md                      # append Commit 51-54 entries

NO NEW FILES
```

---

## Task 1: Add `advanceStageIfBefore` helper to `lib/hub/useHubStage.ts`

**Files:**
- Modify: `lib/hub/useHubStage.ts` (append at end of file)

- [ ] **Step 1: Add the helper export**

Open `lib/hub/useHubStage.ts`. After the closing brace of the existing `useHubStage()` function, append:

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

Use of `readStage`, `getStageIndex`, `STORAGE_KEY`, `CHANGE_EVENT` — all already defined in this file. Do NOT re-import or redefine.

Also ensure the import line at the top of the file includes `getStageIndex` if it isn't already imported. Open the file's top imports; the current line is:

```ts
import { DEFAULT_STAGE, isValidStage, type HubStageId } from "./stages";
```

Update it to:

```ts
import { DEFAULT_STAGE, getStageIndex, isValidStage, type HubStageId } from "./stages";
```

(`getStageIndex` is exported from `./stages` — verified.)

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes (zero errors).

- [ ] **Step 3: Commit**

```bash
git add lib/hub/useHubStage.ts
git commit -m "feat(hub): add advanceStageIfBefore helper for auto-stage progression"
```

---

## Task 2: Wire auto-advance in `lib/useFavorites.ts`

**Files:**
- Modify: `lib/useFavorites.ts` (toggleFavorite function, around line 97-146)

- [ ] **Step 1: Add the import**

Open `lib/useFavorites.ts`. At the top of the file (after existing imports), add:

```ts
import { advanceStageIfBefore } from "@/lib/hub/useHubStage";
```

The exact placement doesn't matter; group with other `@/lib/*` imports for tidiness.

- [ ] **Step 2: Call advance in the add branch**

Inside the `toggleFavorite` function, find the line `setFavorites(newFavorites);` (around line 106). Right after that line, add:

```ts
if (!alreadyFavorite) {
  advanceStageIfBefore("shortlist");
}
```

So the relevant block becomes:

```ts
const newFavorites = alreadyFavorite
    ? favorites.filter((id) => id !== universityId)
    : [...favorites, universityId];
setFavorites(newFavorites);

if (!alreadyFavorite) {
    advanceStageIfBefore("shortlist");
}

if (user) {
    // ...existing Supabase logic...
```

This fires on the optimistic add (synchronous with the user's intent), before the Supabase write. Both guests (no `user`) and signed-in users hit this code path. Remove operations are unaffected — stage never walks backward.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add lib/useFavorites.ts
git commit -m "feat(favorites): auto-advance hub stage to shortlist on first add"
```

---

## Task 3: Wire auto-advance in `app/documents/page.tsx`

**Files:**
- Modify: `app/documents/page.tsx` (upload handler, around line 77)

- [ ] **Step 1: Add the import**

Open `app/documents/page.tsx`. Add to the top-of-file imports:

```ts
import { advanceStageIfBefore } from "@/lib/hub/useHubStage";
```

Group with other `@/lib/*` imports.

- [ ] **Step 2: Call advance after DB insert success**

Find the line `documentRowCreated = true;` (around line 77). Right after that line, add:

```ts
advanceStageIfBefore("documents");
```

So the relevant block becomes:

```ts
const { error: dbError } = await supabase.from('user_documents').insert({
  user_id: user.id, file_name: file.name, file_url: filePath, storage_path: filePath
});
if (dbError) throw dbError;
documentRowCreated = true;
advanceStageIfBefore("documents");
await fetchDocs();
```

This places the advance AFTER the DB insert succeeds (truthful — there's now a real document row) and BEFORE `fetchDocs()` (order doesn't matter, fetchDocs is async). If `dbError` is set, `throw dbError` runs first and we never reach the advance — correct.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add app/documents/page.tsx
git commit -m "feat(documents): auto-advance hub stage to documents on upload success"
```

---

## Task 4: Wire all StudyDossier elements in `components/HeroSection.tsx`

This task converts the entire StudyDossier card (right column of HeroSection) into a clickable surface. Five elements become Links: the header, the Kısa Liste count row, the three school rows, the Belge kontrolü card, and the Burs notu card.

**Files:**
- Modify: `components/HeroSection.tsx` (StudyDossier function, lines roughly 27-128)

- [ ] **Step 1: Add Link import + rewrite school data shape**

Open `components/HeroSection.tsx`. The existing import line is:

```ts
import Link from "next/link";
```

Verify it's already there. If not, add it grouped with the other `next/*` imports.

Locate the existing `schools` array inside the `StudyDossier()` function. It currently looks like:

```ts
const schools =
  language === "tr"
    ? [
        ["Politecnico di Milano", "Mühendislik"],
        ["University of Bologna", "Kamu üniversitesi"],
        ["Sapienza Roma", "Tıp ve sosyal bilimler"],
      ]
    : [
        ["Politecnico di Milano", "Engineering"],
        ["University of Bologna", "Public university"],
        ["Sapienza Rome", "Medicine and social sciences"],
      ];
```

Replace it with an object-shape version that includes ids (verified against `app/data.ts`: Politecnico=1, Bologna=3, Sapienza=2):

```ts
const schools: Array<{ id: number; name: string; meta: string }> =
  language === "tr"
    ? [
        { id: 1, name: "Politecnico di Milano", meta: "Mühendislik" },
        { id: 3, name: "University of Bologna", meta: "Kamu üniversitesi" },
        { id: 2, name: "Sapienza Roma", meta: "Tıp ve sosyal bilimler" },
      ]
    : [
        { id: 1, name: "Politecnico di Milano", meta: "Engineering" },
        { id: 3, name: "University of Bologna", meta: "Public university" },
        { id: 2, name: "Sapienza Rome", meta: "Medicine and social sciences" },
      ];
```

- [ ] **Step 2: Wrap the header row in a Link → /hub**

Locate the existing dossier header (around lines 54-66, the `<div className="mb-6 flex items-center justify-between border-b border-[var(--editorial-border)] pb-4">`). Replace the entire block with a Link wrapper:

```tsx
<Link
  href="/hub"
  aria-label={language === "tr" ? "Çalışma dosyasına git" : "Open your study dossier"}
  className="mb-6 -mx-2 -mt-2 flex items-center justify-between border-b border-[var(--editorial-border)] px-2 pb-4 pt-2 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
>
  <div>
    <p className="text-xs font-semibold text-[var(--editorial-muted)]">
      {language === "tr" ? "Çalışma Dosyası" : "Study dossier"}
    </p>
    <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em] text-[var(--editorial-ink)]">
      2026 ItalyPath
    </h2>
  </div>
  <div className="flex h-11 w-11 items-center justify-center border border-[var(--editorial-border)] bg-[#f5f1e8] text-[var(--editorial-sage)]">
    <GraduationCap className="h-5 w-5" />
  </div>
</Link>
```

The `-mx-2 -mt-2 px-2 pt-2` trick gives a slightly larger hit area without shifting the aside's outer layout.

- [ ] **Step 3: Wrap the Kısa Liste header row in a Link → /favorites**

Locate the existing eyebrow + count row (around lines 70-75):

```tsx
<div className="mb-3 flex items-center justify-between">
  <p className="text-xs font-semibold text-[var(--editorial-muted)]">
    {language === "tr" ? "Kısa Liste" : "Shortlist"}
  </p>
  <span className="text-xs text-[var(--editorial-terracotta)]">3/12</span>
</div>
```

Replace with:

```tsx
<Link
  href="/favorites"
  aria-label={language === "tr" ? "Favori listene git" : "Open your favorites"}
  className="-mx-2 mb-3 flex items-center justify-between rounded-none px-2 py-1 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
>
  <p className="text-xs font-semibold text-[var(--editorial-muted)]">
    {language === "tr" ? "Kısa Liste" : "Shortlist"}
  </p>
  <span className="text-xs text-[var(--editorial-terracotta)]">3/12</span>
</Link>
```

- [ ] **Step 4: Convert each school row to a Link → /universities/{id}**

Locate the existing schools map (around lines 76-86):

```tsx
<div className="divide-y divide-[var(--editorial-border)] border-y border-[var(--editorial-border)]">
  {schools.map(([name, meta]) => (
    <div key={name} className="grid grid-cols-[1fr_auto] gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--editorial-ink)]">{name}</p>
        <p className="mt-1 text-xs text-[var(--editorial-muted)]">{meta}</p>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 text-[var(--editorial-muted)]" />
    </div>
  ))}
</div>
```

Replace with:

```tsx
<div className="divide-y divide-[var(--editorial-border)] border-y border-[var(--editorial-border)]">
  {schools.map(({ id, name, meta }) => (
    <Link
      key={id}
      href={`/universities/${id}`}
      className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--editorial-ink)]">{name}</p>
        <p className="mt-1 text-xs text-[var(--editorial-muted)]">{meta}</p>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 text-[var(--editorial-muted)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  ))}
</div>
```

- [ ] **Step 5: Wrap the Belge kontrolü card in a Link → /documents**

Locate the Belge card (around lines 90-111):

```tsx
<div className="border border-[var(--editorial-border)] bg-white p-4">
  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--editorial-ink)]">
    <FileText className="h-4 w-4 text-[var(--editorial-sage)]" />
    {language === "tr" ? "Belge kontrolü" : "Document check"}
  </div>
  <div className="space-y-2">
    {/* existing documents.map(...) */}
  </div>
</div>
```

Wrap the entire outer `<div>` in a `<Link>` (keep all children unchanged):

```tsx
<Link
  href="/documents"
  aria-label={language === "tr" ? "Belge cüzdanına git" : "Open document wallet"}
  className="block border border-[var(--editorial-border)] bg-white p-4 transition-colors hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
>
  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--editorial-ink)]">
    <FileText className="h-4 w-4 text-[var(--editorial-sage)]" />
    {language === "tr" ? "Belge kontrolü" : "Document check"}
  </div>
  <div className="space-y-2">
    {documents.map((documentName, index) => (
      <div key={documentName} className="flex items-center gap-2 text-xs text-[var(--editorial-muted)]">
        <span
          className={`flex h-4 w-4 items-center justify-center border ${
            index < 2
              ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white"
              : "border-[var(--editorial-border)] text-transparent"
          }`}
        >
          <Check className="h-3 w-3" />
        </span>
        {documentName}
      </div>
    ))}
  </div>
</Link>
```

(The internal checkmarks remain decorative — only the outer card is clickable.)

- [ ] **Step 6: Wrap the Burs notu card in a Link → /scholarships**

Locate the Burs card (around lines 113-123):

```tsx
<div className="border border-[var(--editorial-border)] bg-[#f5f1e8] p-4">
  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--editorial-ink)]">
    <Landmark className="h-4 w-4 text-[var(--editorial-terracotta)]" />
    {language === "tr" ? "Burs notu" : "Scholarship note"}
  </div>
  <p className="text-xs leading-5 text-[var(--editorial-muted)]">
    {/* ... */}
  </p>
</div>
```

Wrap in `<Link href="/scholarships">`:

```tsx
<Link
  href="/scholarships"
  aria-label={language === "tr" ? "Burs haritasına git" : "Open scholarship map"}
  className="block border border-[var(--editorial-border)] bg-[#f5f1e8] p-4 transition-colors hover:bg-[#efe9da] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)]"
>
  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--editorial-ink)]">
    <Landmark className="h-4 w-4 text-[var(--editorial-terracotta)]" />
    {language === "tr" ? "Burs notu" : "Scholarship note"}
  </div>
  <p className="text-xs leading-5 text-[var(--editorial-muted)]">
    {language === "tr"
      ? "Bölgesel kurum, ISEE eşiği ve başvuru takvimi birlikte kontrol edilmeli."
      : "Check the regional body, ISEE threshold, and application window together."}
  </p>
</Link>
```

- [ ] **Step 7: Type check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add components/HeroSection.tsx
git commit -m "feat(home): make StudyDossier elements navigate to real destinations"
```

---

## Task 5: Wire the hero stat grid in `components/HeroSection.tsx`

**Files:**
- Modify: `components/HeroSection.tsx` (left-column stat grid, around lines 183-197)

- [ ] **Step 1: Convert stat grid array to typed entries with hrefs**

Locate the existing stat grid inside the main `HeroSection` function (around lines 183-197):

```tsx
<motion.div
  variants={itemVariants}
  className="mt-10 grid max-w-xl grid-cols-3 border-y border-[var(--editorial-border)] text-sm"
>
  {[
    [formatStatValue(stats.universitiesCount), language === "tr" ? "üniversite" : "universities"],
    [formatStatValue(stats.programsCount), language === "tr" ? "program" : "programs"],
    ["20", language === "tr" ? "bölge" : "regions"],
  ].map(([value, label]) => (
    <div key={label} className="py-4 pr-4">
      <p className="text-2xl font-semibold tracking-[-0.02em] text-[var(--editorial-ink)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--editorial-muted)]">{label}</p>
    </div>
  ))}
</motion.div>
```

Replace with a typed-entry version that includes hrefs and aria-labels:

```tsx
<motion.div
  variants={itemVariants}
  className="mt-10 grid max-w-xl grid-cols-3 border-y border-[var(--editorial-border)] text-sm"
>
  {(language === "tr"
    ? [
        { value: formatStatValue(stats.universitiesCount), label: "üniversite", href: "/universities", ariaLabel: "Üniversite listesine git" },
        { value: formatStatValue(stats.programsCount), label: "program", href: "/universities", ariaLabel: "Program listesine git" },
        { value: "20", label: "bölge", href: "/scholarships", ariaLabel: "Bölgesel burs haritasına git" },
      ]
    : [
        { value: formatStatValue(stats.universitiesCount), label: "universities", href: "/universities", ariaLabel: "Open university list" },
        { value: formatStatValue(stats.programsCount), label: "programs", href: "/universities", ariaLabel: "Open program list" },
        { value: "20", label: "regions", href: "/scholarships", ariaLabel: "Open regional scholarship map" },
      ]
  ).map(({ value, label, href, ariaLabel }) => (
    <Link
      key={label}
      href={href}
      aria-label={ariaLabel}
      className="group block py-4 pr-4 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)]"
    >
      <p className="text-2xl font-semibold tracking-[-0.02em] text-[var(--editorial-ink)] transition-colors group-hover:text-[var(--editorial-sage)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--editorial-muted)]">{label}</p>
    </Link>
  ))}
</motion.div>
```

- [ ] **Step 2: Type check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add components/HeroSection.tsx
git commit -m "feat(home): make hero stat grid cells navigate to universities/scholarships"
```

---

## Task 6: Wire `components/VelocityBridge.tsx`

**Files:**
- Modify: `components/VelocityBridge.tsx` (entire file body, ~42 lines)

- [ ] **Step 1: Rewrite items array with hrefs and use Link**

Replace the entire `VelocityBridge` function body. The new full file becomes:

```tsx
"use client";

import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import { formatStatValue, type UniversityStats } from "@/lib/universityStats";

interface VelocityBridgeProps {
  stats: UniversityStats;
}

export default function VelocityBridge({ stats }: VelocityBridgeProps) {
  const { language } = useLanguage();
  const items: Array<{ value: string; label: string; href: string; ariaLabel: string }> =
    language === "tr"
      ? [
          { value: formatStatValue(stats.universitiesCount), label: "üniversite", href: "/universities", ariaLabel: "Üniversite listesine git" },
          { value: formatStatValue(stats.programsCount), label: "program", href: "/universities", ariaLabel: "Program listesine git" },
          { value: "20", label: "bölgesel burs kaydı", href: "/scholarships", ariaLabel: "Bölgesel burs haritasına git" },
          { value: "1", label: "kişisel merkez", href: "/hub", ariaLabel: "Çalışma dosyana git" },
        ]
      : [
          { value: formatStatValue(stats.universitiesCount), label: "universities", href: "/universities", ariaLabel: "Open university list" },
          { value: formatStatValue(stats.programsCount), label: "programs", href: "/universities", ariaLabel: "Open program list" },
          { value: "20", label: "regional scholarship records", href: "/scholarships", ariaLabel: "Open regional scholarship map" },
          { value: "1", label: "personal hub", href: "/hub", ariaLabel: "Open your study dossier" },
        ];

  return (
    <section className="bg-[var(--editorial-paper)] py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid border-y border-[var(--editorial-border)] sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ value, label, href, ariaLabel }) => (
            <Link
              key={label}
              href={href}
              aria-label={ariaLabel}
              className="group block border-b border-[var(--editorial-border)] py-5 transition-colors hover:bg-[var(--editorial-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)] sm:border-r sm:pr-6 lg:border-b-0"
            >
              <p className="px-4 text-3xl font-semibold tracking-[-0.025em] text-[var(--editorial-ink)] transition-colors group-hover:text-[var(--editorial-sage)] sm:px-0">{value}</p>
              <p className="mt-1 px-4 text-sm text-[var(--editorial-muted)] sm:px-0">{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

The `px-4 sm:px-0` shift on the inner `<p>` elements gives mobile cells comfortable horizontal padding without disturbing the `sm:pr-6` rhythm. (The original `<div>` had no inner padding; the wrapping `<Link>` now provides the same vertical spacing via `py-5`.)

- [ ] **Step 2: Type check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add components/VelocityBridge.tsx
git commit -m "feat(home): make VelocityBridge stats navigate to relevant routes"
```

---

## Task 7: Wire `components/ScholarshipsSection.tsx` regional rows

**Files:**
- Modify: `components/ScholarshipsSection.tsx` (regions array + render block, around lines 11-62)

- [ ] **Step 1: Replace regions array with typed slugged entries**

Locate the existing `regions` array near the top of the component function (around line 11):

```ts
const regions = language === "tr" ? ["Lazio", "Lombardia", "Emilia-Romagna"] : ["Lazio", "Lombardy", "Emilia-Romagna"];
```

Replace with a typed-entry version that maps to verified slugs:

```ts
const regions: Array<{ slug: "lazio" | "lombardia" | "emilia-romagna"; name: string }> =
  language === "tr"
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

- [ ] **Step 2: Convert each row to a Link with `?region=` query**

Locate the regions map block (around lines 49-62):

```tsx
{regions.map((region, index) => (
  <div key={region} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4">
    <span className="text-sm font-semibold text-[var(--editorial-terracotta)]">
      {String(index + 1).padStart(2, "0")}
    </span>
    <div>
      <p className="text-sm font-semibold text-[var(--editorial-ink)]">{region}</p>
      <p className="mt-1 text-xs text-[var(--editorial-muted)]">
        {language === "tr" ? "ISEE, yurt ve yemek desteği" : "ISEE, housing, and meal support"}
      </p>
    </div>
    <ArrowRight className="h-4 w-4 text-[var(--editorial-muted)]" />
  </div>
))}
```

Replace with:

```tsx
{regions.map(({ slug, name }, index) => (
  <Link
    key={slug}
    href={`/scholarships?region=${slug}`}
    className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4 transition-colors hover:bg-[var(--editorial-band)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)]"
  >
    <span className="text-sm font-semibold text-[var(--editorial-terracotta)]">
      {String(index + 1).padStart(2, "0")}
    </span>
    <div>
      <p className="text-sm font-semibold text-[var(--editorial-ink)]">{name}</p>
      <p className="mt-1 text-xs text-[var(--editorial-muted)]">
        {language === "tr" ? "ISEE, yurt ve yemek desteği" : "ISEE, housing, and meal support"}
      </p>
    </div>
    <ArrowRight className="h-4 w-4 text-[var(--editorial-muted)] transition-transform group-hover:translate-x-0.5" />
  </Link>
))}
```

- [ ] **Step 3: Type check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add components/ScholarshipsSection.tsx
git commit -m "feat(home): make scholarship region rows open the region in /scholarships"
```

---

## Task 8: Clean up `components/Footer.tsx`

Remove the dead social media labels and simplify the now-single-column footer layout.

**Files:**
- Modify: `components/Footer.tsx` (entire file body)

- [ ] **Step 1: Replace the file contents**

Replace the entire file with:

```tsx
"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { language } = useLanguage();

  return (
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
  );
}
```

The dead `Twitter` / `Instagram` / `LinkedIn` block and its parent flex layout are gone. The footer is now a single column on every viewport.

- [ ] **Step 2: Type check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add components/Footer.tsx
git commit -m "chore(footer): remove dead social labels, simplify to single column"
```

---

## Task 9: Append Commit 51-54 entries to `AGENT_COMMITS.md`

**Files:**
- Modify: `AGENT_COMMITS.md` (append at end)

- [ ] **Step 1: Append the four entries**

Open `AGENT_COMMITS.md`. Locate the very last line of the file (the end of Commit 50's table). After the last table row, append a blank line, then this content:

```markdown

### Commit 51 (Mentor 3-Masa Danışma Hub'ı):
| Dosya | Değişiklik |
|-------|------------|
| `app/ai-mentor/page.tsx` | ♻️ Eski: tek-stream chatbot UI → ✅ Yeni: AI / Volunteer / Expert üç-masa orkestrasyonu (kanal-bazlı mesaj geçmişi, abort isolation, view transition) |
| `components/mentor/MentorHub.tsx` | 🆕 Oluşturuldu: 3-masa editöryel roster (numaralı satırlar, italic tagline, status badge) |
| `components/mentor/MentorChatRoom.tsx` | 🆕 Oluşturuldu: editöryel sütun chat shell — 3 masa için aynı UI, locked branch'li |
| `components/mentor/MentorTopBar.tsx` | 🆕 Oluşturuldu: Hub + chat ortak header (back link, identity, dil toggle) |
| `components/mentor/EntryPair.tsx` | 🆕 Oluşturuldu: SORU NN + sans-bold soru + hairline + serif Markdown cevap + ink cursor |
| `components/mentor/StarterPrompts.tsx` | 🆕 Oluşturuldu: AI boş-ekran 4 prompt chip (sparkle/indigo yok) |
| `components/mentor/LockedDeskNotice.tsx` | 🆕 Oluşturuldu: Yakında masaları için merkezi editöryel kart + mailto notify CTA |
| `lib/mentor/channels.ts` | 🆕 Oluşturuldu: 3 danışma masası tanımı + MentorChannel tipleri + getMentorChannel() helper |
| `lib/translations.ts` | ➕ `aiMentor.channels`, locked badge'ler, status etiketleri eklendi |

### Commit 52 (Communities Atlas Redesign):
| Dosya | Değişiklik |
|-------|------------|
| `app/communities/page.tsx` | ♻️ Eski: filter dashboard → ✅ Yeni: 5 ihtiyaç-bölümü editöryel atlas yönlendiricisi |
| `components/communities/CommunityAtlas.tsx` | 🆕 Oluşturuldu: editöryel atlas leaf, hybrid editor voice, badge/filter yok |
| `lib/community-links.ts` | ➕ Yeni `CommunityChapter` alanı (her kayıt bir ihtiyaç-bölümüne atanır, zorunlu) |
| `lib/communities/chapters.ts` | 🆕 Oluşturuldu: 5 ihtiyaç-bölümü metadata (TR/EN title/intro/citySummary) + getCommunitiesByChapter() bucketer |

### Commit 53 (Hub Editöryel Çalışma Dosyası):
| Dosya | Değişiklik |
|-------|------------|
| `app/hub/page.tsx` | ♻️ Eski: generic SaaS dashboard (indigo gradient + sparkle + 6-cell action grid) → ✅ Yeni: editöryel çalışma dosyası orkestratörü + skeleton + signed-out |
| `components/hub/DossierTopStrip.tsx` | 🆕 Oluşturuldu: profil chip + sağ üst ITALYPATH·tarih |
| `components/hub/DossierHero.tsx` | 🆕 Oluşturuldu: eyebrow + stage-aware serif h1 + dinamik lede + 2-cell stat strip |
| `components/hub/StageStrip.tsx` | 🆕 Oluşturuldu: 5 aşama yatay rail, tıklanabilir, layoutId marker, pulse ring, reduced-motion guard |
| `components/hub/BentoGrid.tsx` | 🆕 Oluşturuldu: 2×2 grid wrapper (mobile 4-stack) |
| `components/hub/KisaListeCell.tsx` | 🆕 Oluşturuldu: favoriler top-3 önizleme + empty state |
| `components/hub/BelgeCell.tsx` | 🆕 Oluşturuldu: 8-item core kit checklist (sequential mapping) + empty/unavailable states |
| `components/hub/BursNotuCell.tsx` | 🆕 Oluşturuldu: tinted krem cell, serif italic pull-quote terracotta 「」 brackets |
| `components/hub/ToplulukNotuCell.tsx` | 🆕 Oluşturuldu: editöryel nudge + 3 dekoratif tag pill |
| `components/hub/PreferencesStrip.tsx` | 🆕 Oluşturuldu: dil toggle + liste görünümü + mentor masası (`italyPathLastMentorDesk` lookup) |
| `components/hub/AccountFooter.tsx` | 🆕 Oluşturuldu: sessiz hesap aksiyonları (manage + sign-out) |
| `lib/hub/stages.ts` | 🆕 Oluşturuldu: STAGE_IDS + tipler + getStageState() |
| `lib/hub/useHubStage.ts` | 🆕 Oluşturuldu: `italyPathStage` localStorage hook (useSyncExternalStore + cross-tab event) |
| `lib/hub/useDocumentsCount.ts` | 🆕 Oluşturuldu: Supabase user_documents count (Clerk JWT, error-tolerant) |
| `app/globals.css` | ➕ `--editorial-band: #f5f1e8`, `@keyframes hub-stage-pulse`, reduced-motion guard genişletildi |
| `lib/translations.ts` | ♻️ Eski hub key'leri (25 adet) kaldırıldı, dossier namespace eklendi (TR + EN) |
| `app/ai-mentor/page.tsx` | ➕ Channel select → `italyPathLastMentorDesk` localStorage write (forward-compat hub için) |

### Commit 54 (Home Wiring + Auto-Advance Stage):
| Dosya | Değişiklik |
|-------|------------|
| `lib/hub/useHubStage.ts` | ➕ `advanceStageIfBefore(target)` helper |
| `lib/useFavorites.ts` | ➕ `toggleFavorite` add branch'inde stage `shortlist`'e auto-advance |
| `app/documents/page.tsx` | ➕ Upload success'te stage `documents`'e auto-advance |
| `components/HeroSection.tsx` | ♻️ StudyDossier elemanları (header, count, 3 üni satırı, 2 kart) + hero stat grid → Link'ler |
| `components/VelocityBridge.tsx` | ♻️ 4 stat hücresi → Link'lere döndü |
| `components/ScholarshipsSection.tsx` | ♻️ 3 bölge satırı → `/scholarships?region=...` query param Link |
| `components/Footer.tsx` | ♻️ Twitter/Instagram/LinkedIn ölü etiketler kaldırıldı, footer tek kolona düştü |
| `AGENT_COMMITS.md` | 📝 Commit 51-54 entry'leri eklendi |
```

- [ ] **Step 2: Lint (markdown isn't TS-checked but lint should still pass since no .ts/.tsx changed)**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add AGENT_COMMITS.md
git commit -m "docs(commits): catch up with Commit 51-54 (mentor hub, atlas, dossier, wiring)"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run full project checks**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm run check:routes && npm run check:data
```

Expected: all clean. If `npm run build` fails, the error message tells you which file. Fix and re-run before moving on.

- [ ] **Step 2: Manual smoke test in dev**

Start: `npm run dev`

Walk through this matrix in `http://localhost:3000`:

| Action | Expected |
|---|---|
| Click `Çalışma Dosyası / 2026 ItalyPath` header in StudyDossier | Navigates to `/hub` (signed-out → redirect to Clerk sign-in) |
| Click `Kısa Liste · 3/12` row | Navigates to `/favorites` |
| Click Politecnico di Milano row | Navigates to `/universities/1` |
| Click University of Bologna row | Navigates to `/universities/3` |
| Click Sapienza Roma row | Navigates to `/universities/2` |
| Click Belge kontrolü card | Navigates to `/documents` |
| Click Burs notu card | Navigates to `/scholarships` |
| Click each cell of the hero stat grid (üniversite/program/bölge) | Navigates to `/universities`, `/universities`, `/scholarships` respectively |
| Click each of the 4 VelocityBridge stats | Navigates per the array (`/universities`, `/universities`, `/scholarships`, `/hub`) |
| Click `Lazio` in ScholarshipsSection priority list | Opens `/scholarships?region=lazio`, Lazio pre-selected on the map |
| Click `Lombardia` (or `Lombardy`) | Opens `/scholarships?region=lombardia`, Lombardia pre-selected |
| Click `Emilia-Romagna` | Opens `/scholarships?region=emilia-romagna`, region pre-selected |
| Footer | No Twitter/Instagram/LinkedIn labels — only logo + tagline + © |
| Sign in → favorite a university from `/universities` | localStorage `italyPathStage` becomes `"shortlist"` (verify in DevTools → Application → Local Storage) |
| Visit `/hub` after that | StageStrip shows `Kısa Liste` (II.) as active |
| Upload a document on `/documents` | localStorage `italyPathStage` becomes `"documents"` after upload completes |
| Visit `/hub` after that | StageStrip shows `Belge` (III.) as active |
| Stage in StageStrip never walks backward when removing favorites | Manually verify by removing a favorite — stage stays where it was |

If any step fails, document the bug and fix in a focused commit.

- [ ] **Step 3: Branch summary**

```bash
git log --oneline main..HEAD
```

Should show ~9 commits (one per task). If you're on `main` directly, replace `main` with whatever you branched from.

- [ ] **Step 4: Final commit (only if QA surfaces fixes)**

Skip this step if Steps 1 and 2 pass clean. Otherwise commit each fix focused:

```bash
git add <files>
git commit -m "fix(home,hub): <specific bug>"
```

---

## Self-review

**1. Spec coverage:** Every section maps to a task.
- §3 Part A auto-advance → Tasks 1, 2, 3
- §4 Part B home wiring → Tasks 4 (StudyDossier), 5 (hero stat grid), 6 (VelocityBridge), 7 (ScholarshipsSection), 8 (Footer)
- §5 Part C AGENT_COMMITS → Task 9
- §6 translations note (no changes) → no task needed (explicit non-goal)
- §7 states & error handling → covered by the conditional placement in Tasks 2 and 3 + the existing behavior in unchanged code paths
- §8 implementation order → matches plan order
- §9 open questions → addressed: university ids verified inline in plan (1/2/3), ScholarshipsExplorer verified to read `?region=` already
- Appendix verification commands → Task 10 Step 1

**2. Placeholder scan:** No "TBD", "TODO", "fill in details", "similar to Task N", or "add appropriate error handling" anywhere. Every step has the actual code or command.

**3. Type consistency:**
- `advanceStageIfBefore(target: HubStageId)` — same signature in Tasks 1, 2, 3 (consistent)
- `HubStageId` literal values: `"shortlist"` in Task 2, `"documents"` in Task 3 — both valid per `lib/hub/stages.ts` STAGE_IDS
- `schools` array shape: `{ id: number; name: string; meta: string }` — defined in Task 4 Step 1, consumed in Task 4 Step 4 (same shape)
- `regions` array shape: `{ slug: ...; name: string }` — defined in Task 7 Step 1, consumed in Task 7 Step 2 (same shape)
- `items` array shape in VelocityBridge: `{ value; label; href; ariaLabel }` — defined and consumed within Task 6's single replacement (consistent)
- University ids 1/2/3 in Task 4 — verified up front in plan header (Verified Data Points)
- Region slugs `lazio`/`lombardia`/`emilia-romagna` in Task 7 — verified up front

No issues to fix.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-19-home-wiring-auto-advance-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
