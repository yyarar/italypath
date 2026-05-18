# /hub Editorial Dossier Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current generic SaaS-styled `/hub` page with an editorial "study dossier" page that matches the rest of ItalyPath's visual language and adds a localStorage-backed application stage tracker.

**Spec:** [`docs/superpowers/specs/2026-05-18-hub-redesign-design.md`](../specs/2026-05-18-hub-redesign-design.md)

**Architecture:** Single client component (`app/hub/page.tsx`) orchestrates nine presentational sub-components in `components/hub/`. Two new hooks (`useHubStage`, `useDocumentsCount`) live in `lib/hub/`. State is local (`useState`) or `localStorage` only — no new Supabase tables, no new context. The translations diff is split into add-first / remove-last sub-tasks so the project never enters a broken-TypeScript intermediate state.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (no `tailwind.config.*`), Framer Motion 12, Clerk, `@supabase/supabase-js`, `lucide-react`. All already in `package.json` — no new dependencies.

**Testing posture:** Per the spec, no unit tests are introduced. Hub has no existing tests. Verification per task = `npx tsc --noEmit` (type check). Final verification = `npm run lint && npm run build` + manual QA in `npm run dev`.

**Worktree:** Recommended to execute this plan in an isolated worktree (see `superpowers:using-git-worktrees`). The task graph touches 14 new files + 3 modified files; isolation keeps `main` clean.

---

## File Map

```
NEW
  app/hub/page.tsx                       # ← FULL REWRITE
  components/hub/DossierTopStrip.tsx
  components/hub/DossierHero.tsx
  components/hub/StageStrip.tsx
  components/hub/BentoGrid.tsx
  components/hub/KisaListeCell.tsx
  components/hub/BelgeCell.tsx
  components/hub/BursNotuCell.tsx
  components/hub/ToplulukNotuCell.tsx
  components/hub/PreferencesStrip.tsx
  components/hub/AccountFooter.tsx
  lib/hub/stages.ts
  lib/hub/useHubStage.ts
  lib/hub/useDocumentsCount.ts

MODIFIED
  app/globals.css                        # add @keyframes hub-stage-pulse + animation token
  lib/translations.ts                    # add new t.hub.* keys, then remove obsolete ones
  app/hub/page.tsx                       # (rewrite, listed above too)
```

---

## Task 1: Stage data layer (`lib/hub/stages.ts` + `lib/hub/useHubStage.ts`)

**Files:**
- Create: `lib/hub/stages.ts`
- Create: `lib/hub/useHubStage.ts`

- [ ] **Step 1: Create `lib/hub/stages.ts`**

Write file at `lib/hub/stages.ts`:

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

export type StageState = "done" | "active" | "upcoming";

export function isValidStage(value: unknown): value is HubStageId {
  return (
    typeof value === "string" &&
    (STAGE_IDS as readonly string[]).includes(value)
  );
}

export function getStageIndex(id: HubStageId): number {
  return STAGE_IDS.indexOf(id);
}

export function getStageState(target: HubStageId, current: HubStageId): StageState {
  const t = getStageIndex(target);
  const c = getStageIndex(current);
  if (t < c) return "done";
  if (t === c) return "active";
  return "upcoming";
}
```

- [ ] **Step 2: Create `lib/hub/useHubStage.ts`**

Write file at `lib/hub/useHubStage.ts`:

```ts
"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_STAGE, isValidStage, type HubStageId } from "./stages";

const STORAGE_KEY = "italyPathStage";
const CHANGE_EVENT = "italypath-hub-stage-change";

function readStage(): HubStageId {
  if (typeof window === "undefined") return DEFAULT_STAGE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return isValidStage(raw) ? raw : DEFAULT_STAGE;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function useHubStage(): {
  stage: HubStageId;
  setStage: (next: HubStageId) => void;
} {
  const stage = useSyncExternalStore(subscribe, readStage, () => DEFAULT_STAGE);

  const setStage = useCallback((next: HubStageId) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { stage, setStage };
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: passes (no new errors introduced; old `/hub` still compiles).

- [ ] **Step 4: Commit**

```bash
git add lib/hub/stages.ts lib/hub/useHubStage.ts
git commit -m "feat(hub): add stage data layer (stages.ts + useHubStage)"
```

---

## Task 2: Documents count hook (`lib/hub/useDocumentsCount.ts`)

Extracts the inline Supabase `user_documents` count query that currently lives in `app/hub/page.tsx`. Same Clerk-token pattern. Error-tolerant.

**Files:**
- Create: `lib/hub/useDocumentsCount.ts`

- [ ] **Step 1: Create the hook file**

Write file at `lib/hub/useDocumentsCount.ts`:

```ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createClerkSupabaseClient } from "@/lib/supabaseClient";

export function useDocumentsCount(): {
  count: number;
  loading: boolean;
  unavailable: boolean;
} {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const supabase = useMemo(
    () =>
      createClerkSupabaseClient(async () => {
        try {
          return await getToken({ template: "supabase" });
        } catch {
          return null;
        }
      }),
    [getToken],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user?.id) {
        if (!active) return;
        setCount(0);
        setLoading(false);
        setUnavailable(false);
        return;
      }

      setLoading(true);
      setUnavailable(false);

      const { count: c, error } = await supabase
        .from("user_documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!active) return;

      if (error) {
        console.error("[hub] document count fetch failed:", error);
        setCount(0);
        setUnavailable(true);
      } else {
        setCount(c ?? 0);
      }

      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [supabase, user?.id]);

  return { count, loading, unavailable };
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add lib/hub/useDocumentsCount.ts
git commit -m "feat(hub): extract document count into useDocumentsCount hook"
```

---

## Task 3: CSS keyframe for stage dot pulse (`app/globals.css`)

Adds a single new keyframe + `@theme inline` token. Project's existing `@media (prefers-reduced-motion: reduce)` block already disables most animations — we extend it.

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add the keyframe**

Open `app/globals.css`. Find the existing `@keyframes pulse-cursor` block (~line 193). Right AFTER its closing brace, insert:

```css
@keyframes hub-stage-pulse {
  0% {
    transform: scale(0.85);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}
```

- [ ] **Step 2: Register animation token**

Find the existing `@theme inline { ... }` block (~line 31). Inside, after the existing `--animate-pulsating-button: ...;` line, add:

```css
  --animate-hub-stage-pulse: hub-stage-pulse 2.4s ease-out infinite;
```

So the block becomes:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --animate-pulsating-button: pulsating-button var(--duration, 1.5s) ease-out infinite;
  --animate-hub-stage-pulse: hub-stage-pulse 2.4s ease-out infinite;
}
```

This makes `animate-hub-stage-pulse` available as a Tailwind utility.

- [ ] **Step 3: Add an explicit utility class (for safety)**

Tailwind v4's animation token mapping is sufficient, but to keep behavior obvious when reading source, also add an explicit utility class. Find the "Animate utilities" comment block (~line 310). After the existing `.animate-pulsating-button { ... }` rule, add:

```css
.animate-hub-stage-pulse {
  animation: var(--animate-hub-stage-pulse);
}
```

- [ ] **Step 4: Extend the reduced-motion guard**

Find the `@media (prefers-reduced-motion: reduce) { ... }` block (~line 419). In the selector list inside, add `.animate-hub-stage-pulse` alongside the others. The final block must include this class in its list (do not add a new media query — extend the existing one).

So the existing `.animate-pulsating-button,` line should be immediately followed by:

```css
  .animate-pulse-cursor,
  .animate-hub-stage-pulse {
    animation: none !important;
  }
```

Replacing the existing terminal `.animate-pulse-cursor` selector (which already exists) — confirm the final list includes both `.animate-pulse-cursor` and `.animate-hub-stage-pulse` before the rule body.

- [ ] **Step 5: Type check + visual sanity**

Run: `npx tsc --noEmit`
Expected: passes (CSS-only change, but TS check catches accidental edits to other files).

Run dev server briefly: `npm run dev`, open any page, hard refresh. Confirm no CSS regressions (existing pulsating button on home page still works). Kill the server.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "feat(globals): add hub-stage-pulse keyframe + reduced-motion guard"
```

---

## Task 4: Translations — ADD new keys (additive, non-breaking)

This task ONLY adds new keys to both `tr.hub` and `en.hub`. Old keys remain. After all components and the new page are in place (Tasks 5–15), Task 16 removes the orphaned old keys.

**Files:**
- Modify: `lib/translations.ts`

- [ ] **Step 1: Locate the TR `hub` block**

Open `lib/translations.ts`. Locate the `tr.hub: { ... }` block (~line 242). Find its closing brace (`}` on the line containing `loading: "Hub yükleniyor..."`).

- [ ] **Step 2: Append new TR keys before the closing brace**

Just BEFORE that closing `}`, insert the following block. Be careful to keep the existing comma after `loading: "Hub yükleniyor..."` and add a comma after the previous last key:

```ts
      ,
      topStripEyebrow: "ITALYPATH · ÇALIŞMA DOSYASI",
      dossierEyebrow: "Senin Başvuru Yolun",
      dossierHeadline: {
        discovery: { lead: "Keşfe", italic: "yeni başladın." },
        shortlist: { lead: "Kısa listeyi", italic: "şekillendiriyorsun." },
        documents: { lead: "Belge toplama", italic: "aşamasındasın." },
        application: { lead: "Başvuruları", italic: "gönderiyorsun." },
        result: { lead: "Sonuçlara", italic: "odaklandın." },
      },
      dossierLede: {
        newUser:
          "Henüz yolun başındasın. İlk üniversiteyi favoriler'e ekle, dossier canlansın.",
        earlyUser:
          "{favorites} favori üniversite kaydettin. Şimdi ilk belgeni cüzdana ekle, momentum yakala.",
        midUser:
          "{favorites} favori · {documents} belge · şu an {stage} aşamasındasın.",
        closingUser:
          "{favorites} favori · belgeler tam. Sırada sonuçlar var.",
      },
      stageStripLabel: "01",
      bentoStripLabel: "02",
      preferencesStripLabel: "03",
      stages: {
        discovery: {
          label: "Keşif",
          number: "I.",
          state: { done: "Tamamlandı", active: "Şu an", upcoming: "Sırada" },
        },
        shortlist: {
          label: "Kısa Liste",
          number: "II.",
          state: { done: "Tamamlandı", active: "Şu an", upcoming: "Sırada" },
        },
        documents: {
          label: "Belge",
          number: "III.",
          state: { done: "Tamamlandı", active: "Şu an", upcoming: "Sırada" },
        },
        application: {
          label: "Başvuru",
          number: "IV.",
          state: { done: "Tamamlandı", active: "Şu an", upcoming: "Sırada" },
        },
        result: {
          label: "Sonuç",
          number: "V.",
          state: { done: "Tamamlandı", active: "Şu an", upcoming: "Sırada" },
        },
      },
      heroStats: {
        favorites: { label: "Favori", sub: "olası okuldan" },
        documents: { label: "Belge", sub: "çekirdek kit" },
      },
      bento: {
        kisaListe: {
          title: "Kısa Liste",
          slashTotal: "/ 12",
          empty: "Henüz favori eklemedin. İlk üniversiteyi seç, dossierin canlansın.",
          emptyCta: "Üniversiteleri keşfet",
          cta: "Tüm favoriler",
        },
        belge: {
          title: "Belge Kontrolü",
          slashTotal: "/ 8",
          items: [
            "Pasaport",
            "Transkript",
            "Dil belgesi",
            "Diploma",
            "Motivasyon",
            "CV",
            "Tavsiye",
            "İSEE",
          ],
          empty: "Cüzdanını oluştur. Pasaportla başla.",
          unavailable: "Belge sayısı şu an alınamadı. Cüzdana git, durumu kontrol et.",
          cta: "Belge cüzdanı",
        },
        burs: {
          title: "Burs Notu",
          quote:
            "Bölgesel kurum, İSEE eşiği ve başvuru takvimi birlikte kontrol edilmeli.",
          cta: "Burs haritası",
        },
        topluluk: {
          title: "Topluluk Notu",
          thisWeek: "Bu hafta",
          body:
            "Bologna housing ve Sapienza yenilenler kanalları aktif. Politecnico hangouts'a yeni üyeler ekleniyor.",
          tags: ["Bologna housing", "Sapienza yenilenler", "Politecnico"],
          cta: "Listeyi gör",
        },
      },
      preferences: {
        language: { label: "Dil", toggleLabel: "EN'e Geç" },
        viewMode: { label: "Liste Görünümü" },
        mentor: { label: "Mentor Masası", defaultValue: "AI · Aktif" },
      },
      accountFooter: {
        label: "HESAP",
        manage: "Hesabımı Yönet",
        signOut: "Çıkış Yap",
      }
```

> Editor tip: the inserted block above starts with `,` to terminate the prior entry. Place the cursor immediately after `loading: "Hub yükleniyor..."` and before its closing `}`. After inserting, ensure proper comma-discipline (no trailing comma errors).

- [ ] **Step 3: Locate the EN `hub` block**

Locate the `en.hub: { ... }` block (~line 598). Find its closing brace (next to `loading: "Loading Hub..."` or equivalent).

- [ ] **Step 4: Append parallel EN keys**

Insert just before the EN `hub` block's closing `}`:

```ts
      ,
      topStripEyebrow: "ITALYPATH · STUDY DOSSIER",
      dossierEyebrow: "Your application journey",
      dossierHeadline: {
        discovery: { lead: "Just starting", italic: "to explore." },
        shortlist: { lead: "Building", italic: "your shortlist." },
        documents: { lead: "Gathering", italic: "your documents." },
        application: { lead: "Submitting", italic: "your applications." },
        result: { lead: "Focused on", italic: "the results." },
      },
      dossierLede: {
        newUser:
          "You're just starting out. Save your first university and the dossier will come alive.",
        earlyUser:
          "{favorites} favorite saved. Upload your first document to keep momentum.",
        midUser:
          "{favorites} favorites · {documents} documents · currently in the {stage} stage.",
        closingUser:
          "{favorites} favorites · all documents in. Now waiting on results.",
      },
      stageStripLabel: "01",
      bentoStripLabel: "02",
      preferencesStripLabel: "03",
      stages: {
        discovery: {
          label: "Discovery",
          number: "I.",
          state: { done: "Completed", active: "Current", upcoming: "Upcoming" },
        },
        shortlist: {
          label: "Shortlist",
          number: "II.",
          state: { done: "Completed", active: "Current", upcoming: "Upcoming" },
        },
        documents: {
          label: "Documents",
          number: "III.",
          state: { done: "Completed", active: "Current", upcoming: "Upcoming" },
        },
        application: {
          label: "Application",
          number: "IV.",
          state: { done: "Completed", active: "Current", upcoming: "Upcoming" },
        },
        result: {
          label: "Result",
          number: "V.",
          state: { done: "Completed", active: "Current", upcoming: "Upcoming" },
        },
      },
      heroStats: {
        favorites: { label: "Favorites", sub: "of 12 candidates" },
        documents: { label: "Documents", sub: "core kit" },
      },
      bento: {
        kisaListe: {
          title: "Shortlist",
          slashTotal: "/ 12",
          empty: "No favorites yet. Pick your first — your dossier will fill out.",
          emptyCta: "Explore universities",
          cta: "All favorites",
        },
        belge: {
          title: "Document check",
          slashTotal: "/ 8",
          items: [
            "Passport",
            "Transcript",
            "Language cert.",
            "Diploma",
            "Motivation letter",
            "CV",
            "Recommendation",
            "ISEE",
          ],
          empty: "Start your wallet — passport first.",
          unavailable: "Document count unavailable. Open the wallet to verify.",
          cta: "Document wallet",
        },
        burs: {
          title: "Scholarship note",
          quote:
            "Regional body, ISEE threshold, and application calendar must be checked together.",
          cta: "Scholarship map",
        },
        topluluk: {
          title: "Community note",
          thisWeek: "This week",
          body:
            "Bologna housing and Sapienza freshers channels are active. Politecnico hangouts is growing.",
          tags: ["Bologna housing", "Sapienza freshers", "Politecnico"],
          cta: "Open the list",
        },
      },
      preferences: {
        language: { label: "Language", toggleLabel: "Switch to TR" },
        viewMode: { label: "List view" },
        mentor: { label: "Mentor desk", defaultValue: "AI · Active" },
      },
      accountFooter: {
        label: "ACCOUNT",
        manage: "Manage account",
        signOut: "Sign out",
      }
```

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: passes. Old `/hub/page.tsx` still references the old keys (which still exist) and the new keys are additive.

- [ ] **Step 6: Commit**

```bash
git add lib/translations.ts
git commit -m "feat(translations): add dossier hub keys (TR + EN)"
```

---

## Task 5: `components/hub/DossierTopStrip.tsx`

Top strip with profile chip on the left and uppercase eyebrow + date on the right. Border-bottom separator.

**Files:**
- Create: `components/hub/DossierTopStrip.tsx`

- [ ] **Step 1: Create the component**

Write file at `components/hub/DossierTopStrip.tsx`:

```tsx
"use client";

import { useUser } from "@clerk/nextjs";

import { useLanguage } from "@/context/LanguageContext";

function getInitials(name: string): string {
  const parts = name.split(" ").map((p) => p.trim()).filter(Boolean).slice(0, 2);
  return parts.length
    ? parts.map((p) => p[0]?.toUpperCase() ?? "").join("")
    : "IP";
}

export default function DossierTopStrip() {
  const { t, language } = useLanguage();
  const { user } = useUser();

  const displayName =
    user?.fullName?.trim() ||
    user?.firstName?.trim() ||
    user?.username?.trim() ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    t.hub.genericName;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = getInitials(displayName);

  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--editorial-border)] pb-4">
      <div className="inline-flex items-center gap-2.5 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] py-1.5 pl-1.5 pr-3.5">
        {user?.imageUrl ? (
          <div
            role="img"
            aria-label={`${displayName} avatar`}
            className="h-7 w-7 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${user.imageUrl})` }}
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--editorial-sage)] text-[11px] font-bold text-white">
            {initials}
          </div>
        )}
        <span className="text-[13px] font-semibold text-[var(--editorial-ink)]">
          {displayName}
        </span>
        {email && (
          <span className="hidden text-[11px] text-[var(--editorial-muted)] sm:inline">
            · {email}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--editorial-muted)]">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--editorial-sage)]"
          aria-hidden
        />
        <span className="hidden sm:inline">{t.hub.topStripEyebrow}</span>
        <span>· {dateLabel}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/hub/DossierTopStrip.tsx
git commit -m "feat(hub): add DossierTopStrip component"
```

---

## Task 6: `components/hub/DossierHero.tsx`

Eyebrow + dynamic serif headline + templated lede + 2-cell stat strip. Headline is composed from `t.hub.dossierHeadline[stage]` (lead + italic sage piece).

**Files:**
- Create: `components/hub/DossierHero.tsx`

- [ ] **Step 1: Create the component**

Write file at `components/hub/DossierHero.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import type { HubStageId } from "@/lib/hub/stages";

interface DossierHeroProps {
  stage: HubStageId;
  favoritesCount: number;
  documentsCount: number;
  documentsUnavailable: boolean;
}

export default function DossierHero({
  stage,
  favoritesCount,
  documentsCount,
  documentsUnavailable,
}: DossierHeroProps) {
  const { t } = useLanguage();

  const headlineCopy = t.hub.dossierHeadline[stage];
  const stageLabel = t.hub.stages[stage].label.toLowerCase();

  const lede = (() => {
    if (favoritesCount === 0 && documentsCount === 0) return t.hub.dossierLede.newUser;
    if (favoritesCount > 0 && documentsCount === 0) {
      return t.hub.dossierLede.earlyUser.replace(
        "{favorites}",
        String(favoritesCount),
      );
    }
    if (stage === "result") {
      return t.hub.dossierLede.closingUser.replace(
        "{favorites}",
        String(favoritesCount),
      );
    }
    return t.hub.dossierLede.midUser
      .replace("{favorites}", String(favoritesCount))
      .replace("{documents}", String(documentsCount))
      .replace("{stage}", stageLabel);
  })();

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 110, damping: 22 }}
      aria-labelledby="hub-hero-title"
      className="mt-10"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--editorial-terracotta)]">
        {t.hub.dossierEyebrow}
      </p>
      <h1
        id="hub-hero-title"
        className="mt-5 max-w-3xl font-serif text-5xl font-normal leading-[0.96] tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-6xl"
      >
        {headlineCopy.lead}{" "}
        <span className="italic text-[var(--editorial-sage)]">
          {headlineCopy.italic}
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--editorial-muted)] sm:text-lg">
        {lede}
      </p>

      <div className="mt-10 grid grid-cols-2 border-y border-[var(--editorial-border)]">
        <div className="border-r border-[var(--editorial-border)] px-5 py-4 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.heroStats.favorites.label}
          </p>
          <p className="mt-2 font-serif text-3xl font-normal tracking-[-0.02em] text-[var(--editorial-ink)]">
            {favoritesCount} / 12
          </p>
          <p className="mt-1 text-[11px] text-[var(--editorial-muted)]">
            {t.hub.heroStats.favorites.sub}
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.heroStats.documents.label}
          </p>
          <p className="mt-2 font-serif text-3xl font-normal tracking-[-0.02em] text-[var(--editorial-ink)]">
            {documentsUnavailable ? "—" : `${documentsCount} / 8`}
          </p>
          <p className="mt-1 text-[11px] text-[var(--editorial-muted)]">
            {t.hub.heroStats.documents.sub}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/hub/DossierHero.tsx
git commit -m "feat(hub): add DossierHero with stage-aware headline and stat strip"
```

---

## Task 7: `components/hub/StageStrip.tsx`

5-step horizontal rail. Each step is a button. Active step has terracotta top-bar (animated via `layoutId="hub-stage-marker"`), filled terracotta dot with pulsing ring, and `aria-current="step"`. Done steps render in sage. Click = setStage.

**Files:**
- Create: `components/hub/StageStrip.tsx`

- [ ] **Step 1: Create the component**

Write file at `components/hub/StageStrip.tsx`:

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import { STAGE_IDS, getStageState, type HubStageId } from "@/lib/hub/stages";
import { useHubStage } from "@/lib/hub/useHubStage";

export default function StageStrip() {
  const { t } = useLanguage();
  const { stage, setStage } = useHubStage();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 110,
        damping: 22,
        delay: 0.06,
      }}
      aria-labelledby="hub-stage-label"
      className="mt-12 grid grid-cols-[36px_minmax(0,1fr)] gap-7 sm:mt-16"
    >
      <p
        id="hub-stage-label"
        className="pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.stageStripLabel}
      </p>
      <div className="grid grid-cols-5 border-y border-[var(--editorial-border)]">
        {STAGE_IDS.map((id) => {
          const state = getStageState(id, stage);
          const copy = t.hub.stages[id];
          const isActive = state === "active";
          const isDone = state === "done";
          const stateLabel = copy.state[state];

          return (
            <button
              key={id}
              type="button"
              onClick={() => setStage(id as HubStageId)}
              aria-current={isActive ? "step" : undefined}
              aria-label={`${copy.label}, ${stateLabel}`}
              className={`group relative border-r border-[var(--editorial-border)] px-3 py-5 text-left transition-colors duration-200 ease-out last:border-r-0 hover:bg-[rgba(216,222,217,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)] active:scale-[0.995] ${
                isActive ? "bg-[var(--editorial-band)]" : ""
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="hub-stage-marker"
                  className="absolute left-0 right-0 top-0 h-[2px] bg-[var(--editorial-terracotta)]"
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                />
              )}
              <div
                className={`font-serif text-base ${
                  isDone
                    ? "text-[var(--editorial-sage)]"
                    : isActive
                      ? "font-medium text-[var(--editorial-terracotta)]"
                      : "text-[var(--editorial-muted)]"
                }`}
              >
                {copy.number}
              </div>
              <div
                className={`mt-2 font-serif text-base leading-tight ${
                  isDone
                    ? "text-[var(--editorial-sage)]"
                    : "text-[var(--editorial-ink)]"
                }`}
              >
                {copy.label}
              </div>
              <div
                className={`mt-3 hidden items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] sm:flex ${
                  isDone
                    ? "text-[var(--editorial-sage)]"
                    : isActive
                      ? "text-[var(--editorial-terracotta)]"
                      : "text-[var(--editorial-muted)]"
                }`}
              >
                <span
                  className={`relative inline-block h-1.5 w-1.5 rounded-full border ${
                    isDone
                      ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)]"
                      : isActive
                        ? "border-[var(--editorial-terracotta)] bg-[var(--editorial-terracotta)]"
                        : "border-[var(--editorial-border)]"
                  }`}
                >
                  {isActive && !shouldReduceMotion && (
                    <span
                      className="absolute -inset-[6px] rounded-full border border-[var(--editorial-terracotta)] animate-hub-stage-pulse"
                      aria-hidden
                    />
                  )}
                </span>
                {stateLabel}
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/hub/StageStrip.tsx
git commit -m "feat(hub): add interactive StageStrip with pulse + layoutId marker"
```

---

## Task 8: `components/hub/BentoGrid.tsx`

Layout wrapper. Renders eyebrow column ("02") + 2-column bento on `sm+`, 1-column stack on mobile. Children are 4 article cells. Cells draw their own internal borders via Tailwind nth-child rules so the grid never has gaps or doubled lines.

**Files:**
- Create: `components/hub/BentoGrid.tsx`

- [ ] **Step 1: Create the wrapper**

Write file at `components/hub/BentoGrid.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { useLanguage } from "@/context/LanguageContext";

interface BentoGridProps {
  children: ReactNode;
}

export default function BentoGrid({ children }: BentoGridProps) {
  const { t } = useLanguage();
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 110,
        damping: 22,
        delay: 0.12,
      }}
      aria-labelledby="hub-bento-label"
      className="mt-12 grid grid-cols-[36px_minmax(0,1fr)] gap-7 sm:mt-16"
    >
      <p
        id="hub-bento-label"
        className="pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.bentoStripLabel}
      </p>
      <div className="grid grid-cols-1 border border-[var(--editorial-border)] sm:grid-cols-2">
        {children}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/hub/BentoGrid.tsx
git commit -m "feat(hub): add BentoGrid layout wrapper"
```

---

## Task 9: `components/hub/KisaListeCell.tsx`

Top-3 favorites preview. Resolves favorite IDs to university names/cities via `useUniversitiesData`. Empty state when 0 favorites.

**Files:**
- Create: `components/hub/KisaListeCell.tsx`

- [ ] **Step 1: Create the cell**

Write file at `components/hub/KisaListeCell.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { University } from "@/app/data";

interface KisaListeCellProps {
  favorites: readonly string[];
  universities: readonly University[];
}

export default function KisaListeCell({ favorites, universities }: KisaListeCellProps) {
  const { t } = useLanguage();

  const topThree = favorites
    .slice(0, 3)
    .map((id) => universities.find((u) => u.id === id))
    .filter((u): u is University => Boolean(u));

  const isEmpty = favorites.length === 0;

  return (
    <article className="flex min-h-[240px] flex-col border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-6 py-7 last:border-b-0 sm:[&:nth-child(n+3)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-[var(--editorial-border)]">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-serif text-xl font-normal tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-2xl">
          {t.hub.bento.kisaListe.title}
        </h3>
        {!isEmpty && (
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
            {favorites.length} {t.hub.bento.kisaListe.slashTotal}
          </span>
        )}
      </div>

      <div className="flex-1 text-[13px] leading-relaxed text-[var(--editorial-muted)]">
        {isEmpty ? (
          <p>{t.hub.bento.kisaListe.empty}</p>
        ) : (
          <div className="border-t border-[var(--editorial-border)]">
            {topThree.map((uni) => (
              <div
                key={uni.id}
                className="flex items-baseline justify-between gap-3 border-b border-[var(--editorial-border)] py-3 last:border-b-0"
              >
                <span className="truncate text-[13px] font-semibold text-[var(--editorial-ink)]">
                  {uni.name}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--editorial-muted)]">
                  {uni.city}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href={isEmpty ? "/universities" : "/favorites"}
        className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-all hover:gap-3"
      >
        {isEmpty ? t.hub.bento.kisaListe.emptyCta : t.hub.bento.kisaListe.cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </article>
  );
}
```

> Note: the import `import type { University } from "@/app/data";` assumes the existing `app/data.ts` exports a `University` type. Verify by `grep -n "export.*University" /Users/keremyarar/italypath-main/app/data.ts`. If the export name differs, adjust the import accordingly. If only an interface or normalised type exists, import that one and rename the local `University` binding to match.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes. If a TypeScript error references `University`, fix by adjusting the import to the actual exported type name in `app/data.ts`.

- [ ] **Step 3: Commit**

```bash
git add components/hub/KisaListeCell.tsx
git commit -m "feat(hub): add KısaListeCell (favorites top-3 preview)"
```

---

## Task 10: `components/hub/BelgeCell.tsx`

8-item editorial checklist with sequential done mapping. Error state when `documentsUnavailable`.

**Files:**
- Create: `components/hub/BelgeCell.tsx`

- [ ] **Step 1: Create the cell**

Write file at `components/hub/BelgeCell.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

interface BelgeCellProps {
  documentsCount: number;
  documentsUnavailable: boolean;
}

export default function BelgeCell({
  documentsCount,
  documentsUnavailable,
}: BelgeCellProps) {
  const { t } = useLanguage();
  const items = t.hub.bento.belge.items;
  const isEmpty = documentsCount === 0 && !documentsUnavailable;
  const cappedCount = Math.min(documentsCount, items.length);

  return (
    <article className="flex min-h-[240px] flex-col border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-6 py-7 last:border-b-0 sm:[&:nth-child(n+3)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-[var(--editorial-border)]">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-serif text-xl font-normal tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-2xl">
          {t.hub.bento.belge.title}
        </h3>
        {!documentsUnavailable && (
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
            {documentsCount} {t.hub.bento.belge.slashTotal}
          </span>
        )}
      </div>

      <div className="flex-1 text-[12px] leading-relaxed text-[var(--editorial-muted)]">
        {documentsUnavailable ? (
          <p>{t.hub.bento.belge.unavailable}</p>
        ) : isEmpty ? (
          <>
            <p className="mb-3">{t.hub.bento.belge.empty}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {items.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px]">
                  <span className="h-3 w-3 shrink-0 border border-[var(--editorial-border)]" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {items.map((item, index) => {
              const done = index < cappedCount;
              return (
                <div
                  key={item}
                  className={`flex items-center gap-2 text-[12px] ${
                    done ? "font-medium text-[var(--editorial-ink)]" : "text-[var(--editorial-muted)]"
                  }`}
                >
                  <span
                    className={`flex h-3 w-3 shrink-0 items-center justify-center border text-[8px] ${
                      done
                        ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white"
                        : "border-[var(--editorial-border)] text-transparent"
                    }`}
                    aria-hidden
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {item}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link
        href="/documents"
        className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-all hover:gap-3"
      >
        {t.hub.bento.belge.cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </article>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/hub/BelgeCell.tsx
git commit -m "feat(hub): add BelgeCell (8-item core kit checklist)"
```

---

## Task 11: `components/hub/BursNotuCell.tsx`

Tinted cell (`--editorial-band`). Single serif italic pull-quote with terracotta brackets.

**Files:**
- Create: `components/hub/BursNotuCell.tsx`

- [ ] **Step 1: Create the cell**

Write file at `components/hub/BursNotuCell.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

export default function BursNotuCell() {
  const { t } = useLanguage();
  return (
    <article className="flex min-h-[240px] flex-col border-b border-[var(--editorial-border)] bg-[#f5f1e8] px-6 py-7 last:border-b-0 sm:[&:nth-child(n+3)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-[var(--editorial-border)]">
      <h3 className="mb-4 font-serif text-xl font-normal tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-2xl">
        {t.hub.bento.burs.title}
      </h3>
      <div className="flex-1">
        <p className="font-serif text-[17px] italic leading-snug tracking-[-0.005em] text-[var(--editorial-ink)]">
          <span className="text-[var(--editorial-terracotta)]">「</span>
          {t.hub.bento.burs.quote}
          <span className="text-[var(--editorial-terracotta)]">」</span>
        </p>
      </div>
      <Link
        href="/scholarships"
        className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-all hover:gap-3"
      >
        {t.hub.bento.burs.cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </article>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/hub/BursNotuCell.tsx
git commit -m "feat(hub): add BursNotuCell (tinted editorial pull-quote)"
```

---

## Task 12: `components/hub/ToplulukNotuCell.tsx`

Header with "Bu hafta" hint + 1-sentence editorial nudge + 3 decorative tag pills.

**Files:**
- Create: `components/hub/ToplulukNotuCell.tsx`

- [ ] **Step 1: Create the cell**

Write file at `components/hub/ToplulukNotuCell.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

export default function ToplulukNotuCell() {
  const { t } = useLanguage();
  return (
    <article className="flex min-h-[240px] flex-col border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-6 py-7 last:border-b-0 sm:[&:nth-child(n+3)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-[var(--editorial-border)]">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-serif text-xl font-normal tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-2xl">
          {t.hub.bento.topluluk.title}
        </h3>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
          {t.hub.bento.topluluk.thisWeek}
        </span>
      </div>
      <p className="flex-1 text-[13px] leading-relaxed text-[var(--editorial-muted)]">
        {t.hub.bento.topluluk.body}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {t.hub.bento.topluluk.tags.map((tag) => (
          <span
            key={tag}
            className="border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-2.5 py-1 text-[11px] tracking-[0.02em] text-[var(--editorial-ink)]"
          >
            {tag}
          </span>
        ))}
      </div>
      <Link
        href="/communities"
        className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-all hover:gap-3"
      >
        {t.hub.bento.topluluk.cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </article>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/hub/ToplulukNotuCell.tsx
git commit -m "feat(hub): add ToplulukNotuCell (editorial community nudge)"
```

---

## Task 13: `components/hub/PreferencesStrip.tsx`

3-cell horizontal strip. Language has inline toggle; view mode + mentor desk are read-only displays. View mode comes from existing `italyPathUniversitiesViewMode` localStorage convention (read-only, no event listener needed since strip re-reads on mount).

**Files:**
- Create: `components/hub/PreferencesStrip.tsx`

- [ ] **Step 1: Create the strip**

Write file at `components/hub/PreferencesStrip.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";

type UniversityViewMode = "grid" | "compact";

const VIEW_MODE_KEY = "italyPathUniversitiesViewMode";
const VIEW_MODE_EVENT = "italypath-universities-view-mode-change";
const MENTOR_DESK_KEY = "italyPathLastMentorDesk";

function readViewMode(): UniversityViewMode {
  if (typeof window === "undefined") return "grid";
  const stored = window.localStorage.getItem(VIEW_MODE_KEY);
  return stored === "compact" ? "compact" : "grid";
}

function readMentorDesk(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MENTOR_DESK_KEY);
}

export default function PreferencesStrip() {
  const { t, language, toggleLanguage } = useLanguage();
  const [viewMode, setViewMode] = useState<UniversityViewMode>("grid");
  const [mentorDesk, setMentorDesk] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setViewMode(readViewMode());
      setMentorDesk(readMentorDesk());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(VIEW_MODE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(VIEW_MODE_EVENT, sync);
    };
  }, []);

  const viewModeLabel =
    viewMode === "compact" ? t.hub.viewModeCompact : t.hub.viewModeGrid;
  const mentorLabel = mentorDesk ?? t.hub.preferences.mentor.defaultValue;
  const languageLabel = language === "tr" ? "Türkçe" : "English";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 110,
        damping: 22,
        delay: 0.18,
      }}
      aria-labelledby="hub-prefs-label"
      className="mt-12 grid grid-cols-[36px_minmax(0,1fr)] gap-7 sm:mt-16"
    >
      <p
        id="hub-prefs-label"
        className="pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.preferencesStripLabel}
      </p>
      <div className="grid grid-cols-1 border-y border-[var(--editorial-border)] sm:grid-cols-3">
        <div className="border-b border-[var(--editorial-border)] px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.preferences.language.label}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-base font-medium text-[var(--editorial-ink)]">
              {languageLabel}
            </span>
            <button
              type="button"
              onClick={toggleLanguage}
              className="border border-[var(--editorial-sage)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
            >
              {t.hub.preferences.language.toggleLabel}
            </button>
          </div>
        </div>
        <div className="border-b border-[var(--editorial-border)] px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.preferences.viewMode.label}
          </p>
          <p className="mt-2 text-base font-medium text-[var(--editorial-ink)]">
            {viewModeLabel}
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.preferences.mentor.label}
          </p>
          <p className="mt-2 text-base font-medium text-[var(--editorial-ink)]">
            {mentorLabel}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/hub/PreferencesStrip.tsx
git commit -m "feat(hub): add PreferencesStrip (language toggle + view mode + mentor)"
```

---

## Task 14: `components/hub/AccountFooter.tsx`

Bottom border-top strip. Left: "HESAP · {name}" caps label. Right: two surface-bg buttons — "Hesabımı Yönet" (opens Clerk profile) + "Çıkış Yap" (`SignOutButton` with `redirectUrl="/"`).

**Files:**
- Create: `components/hub/AccountFooter.tsx`

- [ ] **Step 1: Create the footer**

Write file at `components/hub/AccountFooter.tsx`:

```tsx
"use client";

import { SignOutButton, useClerk, useUser } from "@clerk/nextjs";

import { useLanguage } from "@/context/LanguageContext";

export default function AccountFooter() {
  const { t } = useLanguage();
  const { openUserProfile } = useClerk();
  const { user } = useUser();

  const displayName =
    user?.fullName?.trim() ||
    user?.firstName?.trim() ||
    user?.username?.trim() ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    t.hub.genericName;

  return (
    <div className="mt-14 flex flex-col items-stretch gap-4 border-t border-[var(--editorial-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
        {t.hub.accountFooter.label} · {displayName}
      </span>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2.5">
        <button
          type="button"
          onClick={() => openUserProfile()}
          className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] transition-colors hover:bg-[var(--editorial-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
        >
          {t.hub.accountFooter.manage}
        </button>
        <SignOutButton redirectUrl="/">
          <button
            type="button"
            className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-ink)] transition-colors hover:border-[var(--editorial-terracotta)] hover:bg-[#fbeee7] hover:text-[var(--editorial-terracotta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)] active:translate-y-[1px]"
          >
            {t.hub.accountFooter.signOut}
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/hub/AccountFooter.tsx
git commit -m "feat(hub): add AccountFooter (manage profile + sign out)"
```

---

## Task 15: Replace `app/hub/page.tsx`

Full rewrite. Orchestrates all components. Handles signed-out state and loading skeleton. Removes ALL existing content of this file.

**Files:**
- Modify (full rewrite): `app/hub/page.tsx`

- [ ] **Step 1: Replace the file contents entirely**

Open `app/hub/page.tsx`. Select all + replace with:

```tsx
"use client";

import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useFavorites } from "@/lib/useFavorites";
import { useUniversitiesData } from "@/lib/useUniversitiesData";
import { useHubStage } from "@/lib/hub/useHubStage";
import { useDocumentsCount } from "@/lib/hub/useDocumentsCount";

import DossierTopStrip from "@/components/hub/DossierTopStrip";
import DossierHero from "@/components/hub/DossierHero";
import StageStrip from "@/components/hub/StageStrip";
import BentoGrid from "@/components/hub/BentoGrid";
import KisaListeCell from "@/components/hub/KisaListeCell";
import BelgeCell from "@/components/hub/BelgeCell";
import BursNotuCell from "@/components/hub/BursNotuCell";
import ToplulukNotuCell from "@/components/hub/ToplulukNotuCell";
import PreferencesStrip from "@/components/hub/PreferencesStrip";
import AccountFooter from "@/components/hub/AccountFooter";

export default function HubPage() {
  const { t } = useLanguage();
  const { isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const { count: documentsCount, loading: documentsCountLoading, unavailable: documentsUnavailable } = useDocumentsCount();
  const { stage } = useHubStage();
  const { universities } = useUniversitiesData();

  const loading = !userLoaded || favoritesLoading || documentsCountLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="h-10 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-24 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-32 bg-[var(--editorial-surface)] shimmer" />
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            <div className="h-60 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shimmer" />
            <div className="h-60 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shimmer" />
            <div className="h-60 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shimmer" />
            <div className="h-60 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shimmer" />
          </div>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.loading}
          </p>
        </div>
      </div>
    );
  }

  if (userLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-md border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
            ITALYPATH
          </p>
          <h1 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)]">
            {t.hub.signedOutTitle}
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--editorial-muted)]">
            {t.hub.signedOutDesc}
          </p>
          <Link
            href="/sign-in?redirect_url=%2Fhub"
            className="mt-6 inline-flex items-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
          >
            {t.hub.signInCta}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <DossierTopStrip />
        <DossierHero
          stage={stage}
          favoritesCount={favorites.length}
          documentsCount={documentsCount}
          documentsUnavailable={documentsUnavailable}
        />
        <StageStrip />
        <BentoGrid>
          <KisaListeCell favorites={favorites} universities={universities} />
          <BelgeCell
            documentsCount={documentsCount}
            documentsUnavailable={documentsUnavailable}
          />
          <BursNotuCell />
          <ToplulukNotuCell />
        </BentoGrid>
        <PreferencesStrip />
        <AccountFooter />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: passes. (At this point old t.hub keys still exist but are unused — that's fine for TS; Task 16 cleans them up.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean. Fix any warnings related to the new files (no `any`, unused imports, etc.).

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev` and visit `http://localhost:3000/hub` (sign in first if needed).

Check by eye:
- Page renders without errors
- TopStrip shows your avatar/name + date on the right
- Hero shows serif headline with italic sage second part
- StageStrip: click a different step — terracotta marker slides, pulse moves, localStorage persists across reload
- Bento 4 cells render with correct content + tinted Burs cell
- PreferencesStrip language toggle flips TR↔EN, page re-renders with EN copy
- AccountFooter buttons visible; "Manage Account" opens Clerk modal; "Sign Out" returns to `/`
- Mobile viewport: page stacks correctly, bento becomes 1-col, stat strip stays 2-col, account buttons stack

Kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add app/hub/page.tsx
git commit -m "feat(hub): assemble new dossier page (replace generic SaaS layout)"
```

---

## Task 16: Translations — REMOVE obsolete keys

Now that the new page no longer references the old `t.hub.*` keys, remove them. Search the codebase to confirm nothing else uses them before deleting.

**Files:**
- Modify: `lib/translations.ts`

- [ ] **Step 1: Confirm obsolete keys are unreferenced**

Run from project root:

```bash
grep -rn --include='*.ts' --include='*.tsx' \
  -E "t\.hub\.(title|subtitle|profileBadge|statusGettingStarted|statusFavoritesOnly|statusDocumentsOnly|statusAllSet|summaryTitle|favoritesTitle|favoritesHintZero|favoritesHintSome|documentsTitle|documentsHintZero|documentsHintSome|languageHint|viewModeTitle|viewModeHint|quickActionsTitle|actionFavorites|actionDocuments|actionUniversities|actionCommunities|actionScholarships|actionAiMentor|preferencesTitle|accountTitle)\b" \
  /Users/keremyarar/italypath-main/app /Users/keremyarar/italypath-main/components /Users/keremyarar/italypath-main/lib
```

Expected: NO matches. (Only `lib/translations.ts` itself would match — that's the file we're about to clean.)

If any other file references one of these keys, STOP and update that file first (you missed a reference). Then re-run.

- [ ] **Step 2: Remove the obsolete keys from `tr.hub`**

Open `lib/translations.ts`. In the `tr.hub: { ... }` block, delete each of these keys (and their trailing commas):

```
title, subtitle, profileBadge,
statusGettingStarted, statusFavoritesOnly, statusDocumentsOnly, statusAllSet,
summaryTitle, favoritesTitle, favoritesHintZero, favoritesHintSome,
documentsTitle, documentsHintZero, documentsHintSome,
languageHint, viewModeTitle, viewModeHint,
quickActionsTitle, actionFavorites, actionDocuments, actionUniversities,
actionCommunities, actionScholarships, actionAiMentor,
preferencesTitle, accountTitle
```

Keep these:
```
genericName, signedOutTitle, signedOutDesc, signInCta,
manageAccount, signOut, loading,
viewModeGrid, viewModeCompact, docsUnavailable,
languageTitle, languageToggle
```

Plus all the NEW keys added in Task 4.

- [ ] **Step 3: Repeat for `en.hub`**

Same deletions in the `en.hub: { ... }` block.

- [ ] **Step 4: Type check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 5: Build (final type + lint via Next)**

Run: `npm run build`
Expected: success. (If it complains about a removed key being referenced somewhere, the grep in Step 1 missed it — fix and rebuild.)

- [ ] **Step 6: Commit**

```bash
git add lib/translations.ts
git commit -m "chore(translations): drop obsolete hub keys after dossier rewrite"
```

---

## Task 17: Final verification

Project-level smoke check + visual QA across realistic scenarios.

- [ ] **Step 1: Project scripts**

Run from project root:

```bash
npm run lint && npm run build && npm run check:routes && npm run check:data
```

Expected: all four pass clean.

- [ ] **Step 2: Manual QA matrix**

Start the dev server: `npm run dev`

Walk through these scenarios in a browser at `http://localhost:3000`:

| # | Scenario | Expected |
|---|---|---|
| 1 | Sign out, visit `/hub` | Editorial signed-out card; `Giriş Yap ve Devam Et` redirects to `/sign-in?redirect_url=%2Fhub` |
| 2 | Sign in, visit `/hub` cold | Skeleton flashes briefly, then full dossier. No layout jump. |
| 3 | New account (no favorites, no docs) | Hero lede = `newUser`; Kısa Liste empty CTA → `/universities`; Belge cell shows empty checklist + empty copy; stage strip starts on Keşif |
| 4 | Click stage `Belge` | terracotta top-bar slides, pulse moves, lede updates, reload preserves stage |
| 5 | Add a favorite, return to `/hub` | Kısa Liste shows that favorite, stat strip increments |
| 6 | Upload a document, return | Belge stat shows N / 8; checklist first N items render done |
| 7 | Trigger Supabase error (e.g., disable network) | Belge cell shows `unavailable` copy; hero Belge stat shows `—`; no white screen |
| 8 | Toggle language to EN | All copy switches to EN; date format becomes `dd/MM/yyyy`-style for `en-GB` |
| 9 | Resize to mobile (375px) | Bento collapses to 4-stack; stage strip stays 5-col (smaller text); account buttons stack |
| 10 | Enable `prefers-reduced-motion` (DevTools → Rendering) | Stage pulse stops, entrance motion still happens via Framer but is reduced; layout stable |
| 11 | Open `/hub` in second tab, change stage in first | Second tab's stage updates within the next animation frame (storage event) |
| 12 | Visit `/hub` while route transition is mid-flight | No flicker; matches MentorHub's transition behavior |

For any failure, document the bug, fix in a focused commit, and re-run the matrix.

- [ ] **Step 3: Confirm robots/sitemap still correct**

Quick check that `/hub` is still excluded from `robots.txt` and `sitemap.ts` (it should be — this redesign doesn't change routing):

```bash
grep -n "/hub" app/robots.ts app/sitemap.ts
```

Expected: `app/robots.ts` lists `/hub` in disallow; `app/sitemap.ts` does NOT include `/hub` in the public routes array.

- [ ] **Step 4: Final commit (if any QA fixes needed)**

If steps 1–3 surfaced no issues, this task ends with no new commits. If they did, commit each fix focused:

```bash
git add <files>
git commit -m "fix(hub): <specific bug>"
```

---

## Self-review (run BEFORE handoff)

The author of this plan checks the following before signaling completion:

1. **Spec coverage:** every section of the spec maps to at least one task.
   - §2 Visual language → Tasks 5–14 (tokens used throughout JSX)
   - §3 Information architecture → Task 15 (page composition)
   - §4 Component tree → Tasks 5–14 + Task 15
   - §5 Data flow → Tasks 1, 2, 15
   - §6 Stage tracker contract → Task 1
   - §7 Bento cells contracts → Tasks 9–12
   - §8 Top strip / hero / preferences / footer → Tasks 5, 6, 13, 14
   - §9 i18n changes → Tasks 4, 16
   - §10 States → Task 15 (signed-out, loading, empty, error all in page.tsx)
   - §11 Motion → Tasks 3 (CSS keyframe), 6/7 (Framer Motion entrances), 7 (layoutId + pulse)
   - §12 Accessibility → Tasks 5–14 (aria, focus-visible, button semantics throughout)
   - §13 Routing & security → Unchanged; Task 17 verifies robots + sitemap untouched
   - §14 Implementation order → THIS PLAN
   - §15 Non-goals → No tests, no Supabase, no deps — confirmed by file map
   - §16 Open questions → EN copy in Task 4 (one round of native re-read recommended after Task 17), mentor read in Task 13 (forward-compat already wired), hero denominators in Task 6 (hardcoded `/ 12` and `/ 8` per spec)

2. **Placeholder scan:** searched plan for "TBD", "TODO", "implement later", "similar to" — none found.

3. **Type consistency:** `HubStageId`, `STAGE_IDS`, `getStageState`, `useHubStage`, `useDocumentsCount`, `t.hub.dossierHeadline[stage]`, `t.hub.stages[id].state[state]`, cell-grid border-r/border-b nth-child selectors — all match across tasks where referenced. The `University` type from `app/data.ts` has an explicit verification step in Task 9.

If any of the above fails when the engineer reads it cold, fix the plan inline — do not push the problem onto the implementer.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-18-hub-redesign-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
