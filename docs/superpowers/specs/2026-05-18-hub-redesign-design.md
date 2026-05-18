# /hub Redesign — Editorial Çalışma Dosyası

**Date:** 2026-05-18
**Scope:** Replace the entire `/hub` page with an editorial "study dossier" that matches the home page's visual system. No new Supabase tables, no new env vars, no new dependencies.
**Status:** Brainstorm approved · ready for implementation plan.

---

## 1. Goal & motivation

The current `/hub` page is a generic SaaS dashboard: indigo-to-blue gradient hero with a sparkle "MEMBER" badge, rose/indigo/emerald/sky stat cards, and a 6-cell quick-action grid. It feels nothing like the home page (`bg-[var(--editorial-paper)]`, sage primary, serif headlines) and reads "AI-generated".

The redesign turns `/hub` into a single editorial dossier surface that mirrors the StudyDossier card already shown on the home hero. It becomes a real "your application file": a stage-aware journey indicator + the four key surfaces (favorites, documents, scholarships, communities) composed in a 2×2 bento that respects the same paper / sage / terracotta language used across the rest of the app.

A localStorage-backed application stage tracker (Keşif → Kısa Liste → Belge → Başvuru → Sonuç) anchors the page: users click any stage to mark "şu an buradayım", past stages auto-fill as done.

---

## 2. Visual language anchors

The page uses ONLY the editorial token system already defined in `app/globals.css`. No new tokens, no new fonts.

| Token | Use |
|---|---|
| `--editorial-paper` (#f8f7f1) | Page background |
| `--editorial-surface` (#fffefa) | Bento cells, profile chip, account buttons |
| `--editorial-ink` (#15201c) | Headlines, primary text |
| `--editorial-muted` (#59645f) | Lede, labels, captions |
| `--editorial-sage` (#1f4f46) | "Done" stage state, primary CTAs, accent details |
| `--editorial-terracotta` (#b75b38) | Eyebrows, "active" stage state, counts (X/Y) |
| `--editorial-border` (#d8ded9) | All borders and dividers |
| `#f5f1e8` (band) | Tinted background for the Burs Notu bento cell |

**Typography:**
- Headlines: Tailwind `font-serif` (system Georgia/Times — same as home + MentorHub)
- Body and labels: `font-sans` (system) — already the layout default
- Hero h1: serif, 4xl→7xl responsive, `tracking-[-0.03em]`, `leading-[0.96]`
- Eyebrows / step labels: 10–11px, `tracking-[0.22em]`, uppercase, weight 700, color terracotta
- "Aşamasındasın." in hero is italic + sage — the single intentional second-read moment

**Surfaces:**
- Sharp borders only. No `rounded-3xl`, no `rounded-2xl`, no oversized radii. This matches MentorHub and the home StudyDossier.
- Card elevation is achieved with thin 1px borders, not shadows. The desktop comp uses a single soft outer shadow on the page container if needed; cells themselves are flat.

**Banned:**
- Indigo / purple / blue gradients
- Sparkle / "MEMBER" badge
- Rose / sky / emerald accent icons in stat cards
- `rounded-3xl` cards with `shadow-lg shadow-indigo-500/20`
- Inter as an explicit font choice (project uses Tailwind `font-sans` which falls back to system; this stays unchanged)

---

## 3. Information architecture

`/hub` is a single client component orchestrating five horizontal blocks plus a top strip and bottom footer:

```
┌──────────────────────────────────────────────────┐
│  Top strip: profile chip · ITALYPATH · date     │
├──────────────────────────────────────────────────┤
│  HERO                                            │
│   eyebrow · serif h1 · lede                      │
│   right column: 2-cell stat strip (Favori / Belge)│
├──────────────────────────────────────────────────┤
│  STAGE STRIP (01)                                │
│   5 horizontal clickable steps                   │
├──────────────────────────────────────────────────┤
│  BENTO 2×2 (02)                                  │
│   Kısa Liste     │  Belge Kontrolü               │
│   Burs Notu (band) │ Topluluk Notu               │
├──────────────────────────────────────────────────┤
│  TERCİHLER (03)                                  │
│   Dil · Liste görünümü · Mentor masası          │
├──────────────────────────────────────────────────┤
│  ACCOUNT FOOTER                                  │
│   "HESAP · {name}" · [Hesabımı yönet] [Çıkış]   │
└──────────────────────────────────────────────────┘
```

Container width: `max-w-3xl` (~768px) on every viewport, matching MentorHub's intimate page width. Horizontal padding `px-4 sm:px-6`. Vertical block spacing `mt-12 sm:mt-16` between major sections (block-level breathing room is core to the editorial feel).

**Mobile bento order:** 2×2 collapses to a single vertical stack in reading order — Kısa Liste → Belge Kontrolü → Burs Notu → Topluluk Notu. Cell heights are intrinsic on mobile; on desktop they share the row's tallest content height.

Bottom padding `pb-24` (then `pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-24` honoring the root layout's BottomNav reservation).

---

## 4. Component tree

```
app/hub/page.tsx                        # orchestrator + signed-out + loading shell
components/hub/
  DossierTopStrip.tsx                   # profile chip + ITALYPATH/date right-side
  DossierHero.tsx                       # eyebrow + serif headline + lede + 2-cell stat strip
  StageStrip.tsx                        # 5-step rail, interactive, perpetual pulse on active
  BentoGrid.tsx                         # layout wrapper (2×2 desktop, 4-stack mobile)
  KisaListeCell.tsx                     # favorites top-3 + count + CTA
  BelgeCell.tsx                         # doc count + 8-item checklist + CTA
  BursNotuCell.tsx                      # tinted cell, editorial scholarship quote + CTA
  ToplulukNotuCell.tsx                  # editorial community nudge + tags + CTA
  PreferencesStrip.tsx                  # 3-cell strip (Dil · Liste · Mentor)
  AccountFooter.tsx                     # manage + sign-out buttons
lib/hub/
  stages.ts                             # STAGE_IDS, STAGES ordered list, types, helpers
  useHubStage.ts                        # localStorage hook with useSyncExternalStore + cross-tab event
  useDocumentsCount.ts                  # Supabase head+count, error tolerant
```

All cells are presentational and stateless — they receive their data via props from `page.tsx`. Only `StageStrip` keeps internal interaction state through `useHubStage()` because it's the sole consumer.

---

## 5. Data flow

| Data | Source | Hook in scope | Notes |
|---|---|---|---|
| User profile (name, avatar, email) | Clerk | `useUser()` | name fallback chain unchanged from current Hub |
| Favorite count + top 3 names/cities | Supabase + localStorage | `useFavorites()` + `useUniversitiesData()` | resolved client-side from existing hooks |
| Document count | Supabase `user_documents` | new `useDocumentsCount()` | extracted from current inline page logic; error tolerant |
| Application stage | localStorage `italyPathStage` | new `useHubStage()` | `useSyncExternalStore` for SSR safety + storage event + custom event for in-tab sync |
| Language | Context | `useLanguage()` | unchanged |
| List view mode | localStorage `italyPathUniversitiesViewMode` | existing event listener pattern (do not modify) | read-only display in PreferencesStrip |
| Mentor desk activity | localStorage (optional) `italyPathLastMentorDesk` | inline read in PreferencesStrip | optional v1 polish; falls back to "AI · Aktif" static label if not set |
| Date | runtime | `new Date()` formatted via `Intl.DateTimeFormat(locale)` | tr-TR `dd.MM.yyyy`, en-GB `dd MMM yyyy` |

**State sharing:** None. No new context. No global store. Page-level `useState`/hooks only.

**Render gate:** Page-level loading skeleton shows until `userLoaded && !favoritesLoading && !documentsCountLoading`. Cells do not show their own spinners — flicker is unacceptable for a single-viewport surface.

---

## 6. Stage tracker contract (`lib/hub/stages.ts` + `useHubStage`)

### `stages.ts`

```ts
export const STAGE_IDS = [
  "discovery",
  "shortlist",
  "documents",
  "application",
  "result",
] as const;

export type HubStageId = (typeof STAGE_IDS)[number];

export const DEFAULT_STAGE: HubStageId = "discovery";

export function isValidStage(value: unknown): value is HubStageId {
  return typeof value === "string" && (STAGE_IDS as readonly string[]).includes(value);
}

export function getStageIndex(id: HubStageId): number {
  return STAGE_IDS.indexOf(id);
}

export function getStageState(target: HubStageId, current: HubStageId):
  | "done" | "active" | "upcoming" {
  const t = getStageIndex(target);
  const c = getStageIndex(current);
  if (t < c) return "done";
  if (t === c) return "active";
  return "upcoming";
}
```

Stage display labels (Roman numerals + name) live in `lib/translations.ts` under `t.hub.stages.{discovery|shortlist|documents|application|result}.{label,number,state.{done,active,upcoming}}`.

### `useHubStage.ts` contract

```ts
function useHubStage(): {
  stage: HubStageId;
  setStage: (next: HubStageId) => void;
};
```

Implementation requirements:
- Use `useSyncExternalStore` to subscribe to `storage` events (cross-tab) + a custom `italypath-hub-stage-change` window event (in-tab sync, matching `italypath-universities-view-mode-change` precedent).
- `getServerSnapshot` returns `DEFAULT_STAGE`. SSR-safe.
- `setStage` writes to localStorage AND dispatches the custom event so multiple components on the same page stay in sync.
- Invalid stored values (corrupted data, future-renamed IDs) fall back to `DEFAULT_STAGE` silently.

### Interaction model
- Click any step → `setStage(stepId)`. Past stages derived as "done", future as "upcoming".
- No "advance/back" buttons. Clicking is the only verb.
- No confirmation modal. Stage changes are casual and easily reverted.
- Keyboard: each step is a `<button>` with `aria-current="step"` when active, `aria-label="{stage name}, set as current"`.

---

## 7. Bento cells — content contracts

### 7.1 KısaListeCell

**Props:** `favoritesCount: number`, `topFavorites: Array<{ id: string; name: string; city: string }>`, `t: HubTranslations`

**Layout:**
- Header: serif title "Kısa Liste" left, terracotta caps count "N / 12" right (N = favorites count). The "/ 12" is decorative — communicates "aspirational shortlist size", same convention as the home StudyDossier.
- Body: divided list of up to 3 favorites (name + meta), each row separated by border-bottom.
- Footer: sage uppercase CTA "Tüm favoriler →"

**Empty state (`favoritesCount === 0`):** Replace list with a single editorial line — "Henüz favori eklemedin. İlk üniversiteyi seç, dossierin canlansın." CTA becomes "Üniversiteleri keşfet →" linking to `/universities`.

**Link target:** `/favorites`

### 7.2 BelgeCell

**Props:** `documentsCount: number`, `documentsUnavailable: boolean`, `t`

**Layout:**
- Header: serif "Belge Kontrolü" + terracotta count "N / 8" (8 = curated core kit: Pasaport, Transkript, Dil belgesi, Diploma, Motivasyon, CV, Tavsiye, İSEE).
- Body: 2-column 8-item checklist. Items rendered as `done` (sage filled square with check) or `pending` (outlined square). The mapping `count → which items are done` is sequential by the curated kit order (count of 4 → first 4 done).
- Footer: sage CTA "Belge cüzdanı →"

> **Editorial conceit (acknowledged):** the project does not store document TYPE — only files. The sequential per-item check is decorative, mirroring the same conceit already used in the home `StudyDossier` card. Users uploading random files will see ticks in core-kit order regardless of actual file content. This is consistent with the rest of the app; if it ever needs to be honest, we'd add a `document_kind` column to `user_documents`, which is out of scope here.

**Empty state (`documentsCount === 0`):** All 8 items rendered as pending. Editorial line above checklist: "Cüzdanını oluştur. Pasaportla başla."

**Error state (`documentsUnavailable === true`):** Skip the checklist visualization, show a single muted line "Belge sayısı şu an alınamadı. Cüzdana git, durumu kontrol et." with the same CTA.

**Link target:** `/documents`

### 7.3 BursNotuCell

**Background:** Tinted with `#f5f1e8` (`--editorial-band`). This single tint differentiates it from the other three white bento cells and acts as the editorial accent.

**Props:** `t`

**Layout:**
- Header: serif "Burs Notu" — no count, no metadata.
- Body: Static editorial pull-quote in `font-serif italic`, framed with terracotta `「」` brackets:
  > "Bölgesel kurum, İSEE eşiği ve başvuru takvimi birlikte kontrol edilmeli."
- Footer: sage CTA "Burs haritası →"

**Link target:** `/scholarships`

**No data dependency.** This cell is pure editorial nudge.

### 7.4 ToplulukNotuCell

**Props:** `t`

**Layout:**
- Header: serif "Topluluk Notu" + small terracotta caps "Bu hafta" hint right.
- Body: One sentence editorial line — "Bologna housing ve Sapienza yenilenler kanalları aktif. Politecnico hangouts'a yeni üyeler ekleniyor." (Copy in translations — can be revised any time without code change.)
- Tag row: three small `font-sans` pills (Bologna housing · Sapienza yenilenler · Politecnico) — paper background, thin border. Decorative only — they do not link individually.
- Footer: sage CTA "Listeyi gör →"

**Link target:** `/communities`

**No data dependency.**

---

## 8. Top strip, hero, preferences, footer

### 8.1 DossierTopStrip
- Left: profile chip — `<div>` with avatar (Clerk image or sage-filled initials) + name + muted "· email". Border 1px, surface bg, sharp corners. NOT clickable in v1.
- Right: uppercase caps strip "ITALYPATH · ÇALIŞMA DOSYASI · {date}" preceded by a 5px sage dot.

### 8.2 DossierHero
- Single-column stack on every viewport, matching the editorial book-page feel: eyebrow → serif headline → lede → 2-cell stat strip beneath.
- Eyebrow: terracotta uppercase "Senin Başvuru Yolun".
- Headline: dynamic 1–3 lines based on current stage. Format:
  - `{stageHeadline}` (italic sage) `aşamasındasın.`
  - e.g., "Belge toplama *aşamasındasın*."
  - Stage 0 ("discovery"): "Keşfe *yeni başladın*."
  - Stage 4 ("result"): "Sonuçlara *odaklandın*."
- Lede: sentence templated with counts. Examples in `t.hub.dossierLede.{key}` — see Section 9.
- 2-cell stat strip: full-width row with `border-y`, two cells separated by `border-r`. Each cell shows label + serif numeric value + tiny sub-line. Cells: Favori (N / 12 sub: "olası okuldan"), Belge (N / 8 sub: "çekirdek kit"). On mobile the two cells sit side-by-side at narrower padding.

### 8.3 PreferencesStrip
- 3-cell horizontal strip, border-y, divided.
- Cell 1: Dil — label + current language + small sage outlined toggle button (calls `toggleLanguage()`).
- Cell 2: Liste Görünümü — label + read-only display "Grid" or "Kompakt".
- Cell 3: Mentor Masası — label + read-only display "AI · Aktif" (or future desks once unlocked).
- Mobile: stacks vertically.

### 8.4 AccountFooter
- Border-top strip at the bottom.
- Left: "HESAP · {displayName}" caps muted label.
- Right: two surface-bg `<button>`s side-by-side: "Hesabımı Yönet" (calls `openUserProfile()`) and "Çıkış Yap" (Clerk `SignOutButton` with `redirectUrl="/"`). Both buttons have tactile `:active { translate-y: 1px }`. Çıkış hover swaps border + text to terracotta.

---

## 9. i18n changes (`lib/translations.ts`)

### Removed from both `tr.hub` and `en.hub`

```
title, subtitle, profileBadge, statusGettingStarted, statusFavoritesOnly,
statusDocumentsOnly, statusAllSet, summaryTitle, favoritesTitle,
favoritesHintZero, favoritesHintSome, documentsTitle, documentsHintZero,
documentsHintSome, languageHint, viewModeTitle, viewModeHint,
quickActionsTitle, actionFavorites, actionDocuments, actionUniversities,
actionCommunities, actionScholarships, actionAiMentor, preferencesTitle,
accountTitle
```

### Kept (with possible string refinements)
```
genericName, signedOutTitle, signedOutDesc, signInCta,
manageAccount, signOut, loading,
viewModeGrid, viewModeCompact, docsUnavailable,
languageTitle, languageToggle
```

### Added
```
topStrip: { eyebrow }              // "ITALYPATH · ÇALIŞMA DOSYASI"
dossierEyebrow                     // "Senin Başvuru Yolun"
dossierHeadline: {
  discovery, shortlist, documents, application, result
}                                  // each is "{lead} {italic verb}." pair, parsed in component
dossierLede: {
  newUser,                         // 0 fav, 0 docs
  earlyUser,                       // some fav, 0 docs
  midUser,                         // both > 0, stage < result
  closingUser                      // stage === result
}                                  // each accepts {favorites}, {documents}, {stage} placeholders
stages: {
  discovery: { label, number, state: { done, active, upcoming } },
  shortlist: { ... },
  documents: { ... },
  application: { ... },
  result: { ... }
}
stageStripLabel                    // "01"
bentoStripLabel                    // "02"
preferencesStripLabel              // "03"
bento: {
  kisaListe: { title, slashTotal, empty, emptyCta, cta },
  belge:    { title, slashTotal, items: [8 entries], empty, unavailable, cta },
  burs:     { title, quote, cta },
  topluluk: { title, thisWeek, body, tags: [3 entries], cta }
}
preferences: {
  language: { label, toggleLabel },
  viewMode: { label },
  mentor:   { label, defaultValue }   // "AI · Aktif" / "AI · Active"
}
accountFooter: {
  label, manage, signOut
}
heroStats: {
  favorites: { label, sub },
  documents: { label, sub }
}
```

All copy is provided in both TR and EN. EN values listed in design doc appendix — implementation plan will translate verbatim from this spec.

---

## 10. States

| State | Trigger | Render |
|---|---|---|
| **Signed out** | `userLoaded && !isSignedIn` | Compact card on paper background: serif headline, muted lede, single sage button "Giriş Yap ve Devam Et" linking to `/sign-in?redirect_url=%2Fhub`. Keeps current Hub's signed-out copy but restyled to editorial. |
| **Loading** | `!userLoaded \|\| favoritesLoading \|\| documentsCountLoading` | Editorial skeleton: top strip placeholder + 5 horizontal shimmer bars matching block heights (hero, stage, bento, preferences, footer). Uses existing `.shimmer` utility class. No spinners. |
| **Empty (new user)** | favoritesCount === 0 && documentsCount === 0 && stage === "discovery" | Hero copy uses `dossierLede.newUser`. Bento cells use their empty states. Stage strip still interactive. |
| **Documents fetch error** | Supabase returns error | `documentsUnavailable: true` flag passed to BelgeCell, hero stat shows "—" for Belge. No page-level error banner; the cell handles it inline. |
| **Stage corruption** | localStorage has invalid value | Silent fallback to `DEFAULT_STAGE`. No warning UI. |
| **Locale switch** | User toggles language mid-session | Whole page re-renders via LanguageContext; date format also re-evaluates. |

---

## 11. Motion

Anchored to project's existing motion vocabulary (`framer-motion` with spring 110 / damping 22) and the editorial restraint of MentorHub. The active stage dot has the only perpetual animation on the page.

| Element | Motion |
|---|---|
| Page mount | `<motion.section>` per block with `initial={{ opacity: 0, y: 18 }}`, `animate={{ opacity: 1, y: 0 }}`, staggered `delay: index * 0.06`, spring 110 / 22. |
| Stage step click | `framer-motion layout` + `layoutId="active-stage-marker"` on the 2px terracotta top-bar — slides smoothly between steps when stage changes. |
| Active stage dot | CSS `@keyframes pulse` (2.4s) on a `::after` ring — already drafted in mockup. Wrapped in `prefers-reduced-motion` query — disables ring expansion but keeps dot visible. |
| Cell hover | CTA arrow gap widens via Tailwind `transition-[gap]` on `group-hover`. No card lift, no shadow change — editorial restraint. |
| Account buttons | `:active { translate-y-[1px] }` tactile feedback. |
| Reduced motion | All `motion.section` entrances become instant; stage pulse stops; route transitions already respect this globally. |

No magnetic buttons, no parallax, no scrolltelling. Hub is a destination page, not a marketing surface.

---

## 12. Accessibility

- All interactive elements are `<button>` or `<Link>`, never `<div onClick>`.
- Stage strip: `<button>` per step, `aria-current="step"` on active, focus ring uses sage outline (project convention).
- Profile chip is not interactive in v1 (no spurious click target).
- Hero headline is `<h1>`; section headings are `<h2>`. Each block uses `<section aria-labelledby>`.
- Color contrast: ink-on-paper > 12:1, muted-on-paper > 4.6:1, sage-on-paper > 5:1, terracotta-on-paper > 4.7:1 (all WCAG AA pass).
- Stage step active state is communicated via three channels (terracotta top-bar + filled dot + "Şu an" text label) — not color alone.

---

## 13. Routing & security

- Route: `/hub` (unchanged).
- Protection: continues to be `auth.protect()` via `proxy.ts` (already configured). No middleware change.
- Robots: `/hub` stays in `robots.txt` disallow list.
- Navbar/BottomNav: existing entries unchanged.

---

## 14. Implementation order (preview for writing-plans)

The implementation plan will sequence this work but the natural order is:

1. `lib/hub/stages.ts` + `lib/hub/useHubStage.ts` — pure data layer, no UI
2. `lib/hub/useDocumentsCount.ts` — extract current inline Supabase query
3. `lib/translations.ts` — add new keys, remove old keys (TR + EN)
4. Create `components/hub/` cells one at a time, all stateless
5. Assemble `app/hub/page.tsx` shell with skeleton + signed-out + final render
6. Wire motion + reduced-motion guards
7. Manual QA on desktop (lg+) and mobile (sm)
8. `npm run lint` + `npm run build` clean

No tests planned for v1 — Hub has no tests today and this redesign doesn't introduce testable logic beyond the stage hook (which is straightforward localStorage). Stage hook unit tests can be added in a follow-up if the project starts testing other hooks.

---

## 15. Non-goals (explicit)

- No new Supabase tables, columns, RLS policies, or storage buckets.
- No new env vars.
- No new dependencies. `framer-motion`, `lucide-react`, Clerk, Supabase client all already present.
- No PWA work — AGENT_CONTEXT notes "tasarım aşamasında, dokunma".
- No mentor desk activity persistence (Supabase). The "Mentor Masası" preferences cell shows a static placeholder unless localStorage's optional `italyPathLastMentorDesk` is present.
- No 6-action quick-grid — explicitly removed. Bento cells inline their own links.
- No tests written in this PR.

---

## 16. Open questions

1. **EN copy translations** — TR strings are defined in this doc. EN equivalents are listed in the appendix but a native re-read by the user before merge is worth one round.
2. **Mentor desk read** — implementing `italyPathLastMentorDesk` write at the mentor page is out of scope for this PR. Should the PreferencesStrip cell read it anyway (forward-compat) or hardcode "AI · Aktif"? Recommendation: read with hardcode fallback (zero cost).
3. **Hero stat denominators** — "/ 12" and "/ 8" are decorative aspirational caps. If the user wants real maxima (e.g., favorite cap from `useFavorites`), this can be wired later without spec change.

---

## Appendix A — EN translation strings (proposed)

```
topStrip.eyebrow:                  "ITALYPATH · STUDY DOSSIER"
dossierEyebrow:                    "Your application journey"
dossierHeadline.discovery:         "Just starting · *to explore*."
dossierHeadline.shortlist:         "Building · *your shortlist*."
dossierHeadline.documents:         "Gathering · *your documents*."
dossierHeadline.application:       "Submitting · *your applications*."
dossierHeadline.result:            "Focused · *on the results*."
dossierLede.newUser:               "Save your first university and the dossier comes alive."
dossierLede.earlyUser:             "{favorites} favorite saved. Upload your first document to keep momentum."
dossierLede.midUser:               "{favorites} favorites · {documents} documents · currently in the {stage} stage."
dossierLede.closingUser:           "{favorites} favorites · all documents in. Now waiting on results."
stageStripLabel:                   "01"
bentoStripLabel:                   "02"
preferencesStripLabel:             "03"
stages.discovery:                  { label: "Discovery", number: "I.", state: { done: "Completed", active: "Current", upcoming: "Upcoming" } }
stages.shortlist:                  { label: "Shortlist", number: "II.", ... }
stages.documents:                  { label: "Documents", number: "III.", ... }
stages.application:                { label: "Application", number: "IV.", ... }
stages.result:                     { label: "Result", number: "V.", ... }
bento.kisaListe.title:             "Shortlist"
bento.kisaListe.empty:             "No favorites yet. Pick your first one — dossier will fill out."
bento.kisaListe.emptyCta:          "Explore universities"
bento.kisaListe.cta:               "All favorites"
bento.belge.title:                 "Document check"
bento.belge.items:                 ["Passport", "Transcript", "Language cert.", "Diploma", "Motivation letter", "CV", "Recommendation", "ISEE"]
bento.belge.empty:                 "Start your wallet — passport first."
bento.belge.unavailable:           "Document count unavailable. Open the wallet to verify."
bento.belge.cta:                   "Document wallet"
bento.burs.title:                  "Scholarship note"
bento.burs.quote:                  "Regional body, ISEE threshold, and application calendar must be checked together."
bento.burs.cta:                    "Scholarship map"
bento.topluluk.title:              "Community note"
bento.topluluk.thisWeek:           "This week"
bento.topluluk.body:               "Bologna housing and Sapienza freshers channels are active. Politecnico hangouts is growing."
bento.topluluk.tags:               ["Bologna housing", "Sapienza freshers", "Politecnico"]
bento.topluluk.cta:                "Open the list"
preferences.language.label:        "Language"
preferences.language.toggleLabel:  "Switch to TR"
preferences.viewMode.label:        "List view"
preferences.mentor.label:          "Mentor desk"
preferences.mentor.defaultValue:   "AI · Active"
accountFooter.label:               "ACCOUNT"
accountFooter.manage:              "Manage account"
accountFooter.signOut:             "Sign out"
heroStats.favorites.label:         "Favorites"
heroStats.favorites.sub:           "of 12 candidates"
heroStats.documents.label:         "Documents"
heroStats.documents.sub:           "core kit"
```

---

## Appendix B — Visual reference

The interactive desktop + mobile mockup lives in `.superpowers/brainstorm/78292-1779111277/content/final-mockup.html` (project-scoped, gitignored). It captures the editorial palette, typography hierarchy, stage strip motion, bento layout, and account footer in concrete form. Any pixel-level question during implementation defers to this comp.
