# University Campus Portrait Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current glossy university and program detail pages with the approved Campus Portrait editorial UI while preserving visible school and program information except for the explicit `fee` UI removal.

**Spec:** [`docs/superpowers/specs/2026-05-22-university-campus-portrait-details-design.md`](../specs/2026-05-22-university-campus-portrait-details-design.md)

**Architecture:** Keep route lookup, back behavior, auth-aware Mentor links, metadata layouts, and `useUniversitiesData` in the existing client pages. Move the large visual surfaces into focused `components/university-details/` components: portrait headers, highlights, shared program directory/transition entries, and the secondary Mentor prompt. Add a source smoke check first so old indigo/glass detail styling and accidental detail-data omissions are caught during the rewrite.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 editorial tokens, Framer Motion, Lucide React, existing `ExpandableScreen`, Clerk-aware Mentor redirects, existing npm script checks.

**Execution note:** This is frontend implementation work. At execution time, use `Build Web Apps:frontend-app-builder` before the first UI edit and `Build Web Apps:frontend-testing-debugging` for local browser verification after the significant frontend changes.

---

## File Map

```text
CREATE
  scripts/check-university-detail-portrait.mjs
  components/university-details/DetailMentorPrompt.tsx
  components/university-details/ProgramTransitionEntry.tsx
  components/university-details/ProgramDirectory.tsx
  components/university-details/UniversityPortraitMasthead.tsx
  components/university-details/UniversityHighlights.tsx
  components/university-details/ProgramMetaStrip.tsx
  components/university-details/ProgramPortraitHeader.tsx

MODIFY
  package.json
  lib/translations.ts
  app/universities/[id]/page.tsx
  app/universities/[id]/departments/[deptSlug]/page.tsx
```

Keep these files untouched unless verification exposes a direct need:

- `app/universities/[id]/layout.tsx` and department `layout.tsx`: metadata stays server-side.
- `components/ui/expandable-screen.tsx`: keep the existing morph primitive contract.
- `lib/universities.server.ts`, Supabase data, and `app/data.ts`: no detail redesign data rewrite.

## Task 1: Add the Detail Redesign Guard

This task establishes the failing test before production UI changes. The current detail pages still contain the old indigo/glass/sparkle surfaces, so the new guard must fail on its first run.

**Files:**
- Create: `scripts/check-university-detail-portrait.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing source smoke check**

Create `scripts/check-university-detail-portrait.mjs`:

```js
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const failures = [];

function read(path) {
  const absolutePath = resolve(process.cwd(), path);
  if (!existsSync(absolutePath)) {
    failures.push(`${path} is missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requireTokens(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(`${label} must include ${token}`);
    }
  }
}

function forbidTokens(label, source, tokens) {
  for (const token of tokens) {
    if (source.includes(token)) {
      failures.push(`${label} still contains forbidden detail token ${token}`);
    }
  }
}

const universityPage = read("app/universities/[id]/page.tsx");
const programPage = read("app/universities/[id]/departments/[deptSlug]/page.tsx");

const portraitFiles = [
  "components/university-details/DetailMentorPrompt.tsx",
  "components/university-details/ProgramTransitionEntry.tsx",
  "components/university-details/ProgramDirectory.tsx",
  "components/university-details/UniversityPortraitMasthead.tsx",
  "components/university-details/UniversityHighlights.tsx",
  "components/university-details/ProgramMetaStrip.tsx",
  "components/university-details/ProgramPortraitHeader.tsx",
];

const portraitSource = portraitFiles.map(read).join("\n");
const allDetailSource = [universityPage, programPage, portraitSource].join("\n");

requireTokens("university detail", universityPage, [
  "UniversityPortraitMasthead",
  "UniversityHighlights",
  "ProgramDirectory",
  "DetailMentorPrompt",
  "description",
  "features",
  "isFavorite",
  "toggleFavorite",
]);

requireTokens("program detail", programPage, [
  "ProgramPortraitHeader",
  "ProgramDirectory",
  "DetailMentorPrompt",
  "safeLanguages",
  "safeDurationYears",
  "safeLevel",
  "otherDepts",
  "description",
  "department.durationYears",
  "department.languages",
]);

requireTokens("portrait components", portraitSource, [
  "university.website",
  "university.departments",
  "bachelorPrograms",
  "masterPrograms",
]);

forbidTokens("detail redesign", allDetailSource, [
  "university.fee",
  "t.detail.fee",
  "t.department.fee",
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

if (failures.length > 0) {
  console.error("[FAIL] University detail portrait check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] University detail portrait check passed.");
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add the detail guard near the existing university checks:

```json
"check:university-details-ui": "node scripts/check-university-detail-portrait.mjs",
```

The nearby scripts block should include:

```json
"check:universities-ui": "node --no-warnings scripts/check-universities-field-guide.mjs",
"check:university-details-ui": "node scripts/check-university-detail-portrait.mjs",
"check:scholarships-ui": "node scripts/check-scholarships-editorial-atlas.mjs",
```

- [ ] **Step 3: Run the guard and verify RED**

Run:

```bash
npm run check:university-details-ui
```

Expected: FAIL. It should report missing `components/university-details/*` files and current detail-page forbidden tokens such as `Sparkles`, `glass-dark`, or indigo styling.

- [ ] **Step 4: Commit the guard**

```bash
git add package.json scripts/check-university-detail-portrait.mjs
git commit -m "test: guard campus portrait detail surfaces"
```

## Task 2: Add Editorial Detail Copy

Add only the TR/EN strings the new visual hierarchy needs. Leave existing `fee` translation keys in place because this task removes fee from two UIs, not from the translation/data model.

**Files:**
- Modify: `lib/translations.ts`

- [ ] **Step 1: Extend the TR university detail copy**

Inside the Turkish `detail` block, keep existing keys and add:

```ts
      portraitEyebrow: "Okul Portresi",
      programDirectory: "Program Dizini",
      programCount: "program",
      officialSource: "Resmi Kaynak",
      highlights: "Öne Çıkanlar",
      mentorEyebrow: "Danışma Masası",
      mentorTitle: "Bu okulu mentor masasına taşı",
      mentorBody: "Bölüm seçimi, belgeler veya başvuru akışı için sorunu masaya bırak.",
      openingProgram: "Program açılıyor...",
```

The Turkish `detail` block should remain parallel with current existing labels:

```ts
    detail: {
      back: "Geri Dön",
      about: "Üniversite Hakkında",
      why: "Neden Bu Okul?",
      departments: "İngilizce Bölümler",
      bachelorPrograms: "Lisans",
      masterPrograms: "Yüksek Lisans",
      summary: "Özet Bilgiler",
      fee: "Yıllık Ücret",
      feeNote: "*Gelire göre değişir",
      website: "Web Sitesi",
      visitSite: "Resmi Siteyi Ziyaret Et",
      askAi: "Bu Okulu AI'ya Sor",
      aiNote: "Merak ettiğin her şeyi danışmanına sorabilirsin.",
      notFound: "Okul Bulunamadı 😕",
      backToList: "Listeye Geri Dön",
      portraitEyebrow: "Okul Portresi",
      programDirectory: "Program Dizini",
      programCount: "program",
      officialSource: "Resmi Kaynak",
      highlights: "Öne Çıkanlar",
      mentorEyebrow: "Danışma Masası",
      mentorTitle: "Bu okulu mentor masasına taşı",
      mentorBody: "Bölüm seçimi, belgeler veya başvuru akışı için sorunu masaya bırak.",
      openingProgram: "Program açılıyor...",
    },
```

- [ ] **Step 2: Extend the TR program detail copy**

Inside the Turkish `department` block, add:

```ts
      portraitEyebrow: "Program Portresi",
      schoolContext: "Okul Bağlamı",
      programFacts: "Program Bilgisi",
      level: "Seviye",
      duration: "Süre",
      language: "Dil",
      bachelor: "Lisans",
      master: "Yüksek Lisans",
      mentorEyebrow: "Danışma Masası",
      mentorTitle: "Bu programı mentor masasına taşı",
      mentorBody: "Program uyumu, belgeler veya başvuru adımlarını birlikte netleştir.",
```

The block should look like:

```ts
    department: {
      backToUni: "Üniversiteye Dön",
      otherDepts: "Diğer Bölümler",
      askAi: "Bu Bölümü AI'ya Sor",
      university: "Üniversite",
      city: "Şehir",
      fee: "Yıllık Ücret",
      overview: "Bölüm Hakkında",
      portraitEyebrow: "Program Portresi",
      schoolContext: "Okul Bağlamı",
      programFacts: "Program Bilgisi",
      level: "Seviye",
      duration: "Süre",
      language: "Dil",
      bachelor: "Lisans",
      master: "Yüksek Lisans",
      mentorEyebrow: "Danışma Masası",
      mentorTitle: "Bu programı mentor masasına taşı",
      mentorBody: "Program uyumu, belgeler veya başvuru adımlarını birlikte netleştir.",
    },
```

- [ ] **Step 3: Mirror the keys in EN**

Add the English `detail` keys:

```ts
      portraitEyebrow: "School Portrait",
      programDirectory: "Program Directory",
      programCount: "programs",
      officialSource: "Official Source",
      highlights: "Highlights",
      mentorEyebrow: "Consultation Desk",
      mentorTitle: "Take this school to a mentor desk",
      mentorBody: "Bring your program choice, documents, or application flow to the desk.",
      openingProgram: "Opening program...",
```

Add the English `department` keys:

```ts
      portraitEyebrow: "Program Portrait",
      schoolContext: "School Context",
      programFacts: "Program Facts",
      level: "Level",
      duration: "Duration",
      language: "Language",
      bachelor: "Bachelor",
      master: "Master",
      mentorEyebrow: "Consultation Desk",
      mentorTitle: "Take this program to a mentor desk",
      mentorBody: "Clarify fit, documents, and application steps around this program.",
```

- [ ] **Step 4: Type check the translation additions**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS. Existing pages still use old detail layout, but the translation tree remains valid.

- [ ] **Step 5: Commit**

```bash
git add lib/translations.ts
git commit -m "feat: add campus portrait detail copy"
```

## Task 3: Build the Shared Program Directory And Mentor Prompt

Create the reusable pieces used on both pages before rewriting route pages. The guard remains red until the page rewrites are complete, but type checks should stay green.

**Files:**
- Create: `components/university-details/DetailMentorPrompt.tsx`
- Create: `components/university-details/ProgramTransitionEntry.tsx`
- Create: `components/university-details/ProgramDirectory.tsx`

- [ ] **Step 1: Create the secondary Mentor prompt**

Create `components/university-details/DetailMentorPrompt.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight, MessageSquareText } from "lucide-react";

interface DetailMentorPromptProps {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}

export function DetailMentorPrompt({
  href,
  eyebrow,
  title,
  body,
  cta,
}: DetailMentorPromptProps) {
  return (
    <aside className="border-y border-[var(--editorial-border)] bg-[var(--editorial-band)] px-4 py-6 sm:px-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-[var(--editorial-ink)]">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">
            {body}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          <MessageSquareText className="h-4 w-4" />
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create the shared program transition entry**

Create `components/university-details/ProgramTransitionEntry.tsx`:

```tsx
"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { DEFAULT_IMAGE, type Department, type University } from "@/app/data";
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
} from "@/components/ui/expandable-screen";

interface ProgramTransitionEntryProps {
  university: University;
  department: Department;
  openingLabel: string;
  expanding: boolean;
  onSelect: (slug: string) => void;
}

export function ProgramTransitionEntry({
  university,
  department,
  openingLabel,
  expanding,
  onSelect,
}: ProgramTransitionEntryProps) {
  const cardLayoutId = `dept-card-${university.id}-${department.slug}`;
  const titleLayoutId = `dept-title-${university.id}-${department.slug}`;

  return (
    <ExpandableScreen
      layoutId={cardLayoutId}
      triggerRadius="0px"
      contentRadius="8px"
      animationDuration={0.26}
      defaultExpanded={expanding}
    >
      <ExpandableScreenTrigger className="group border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] transition hover:bg-[var(--editorial-paper)]">
        <button
          type="button"
          onClick={() => onSelect(department.slug)}
          disabled={expanding}
          className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"
        >
          <motion.span
            layoutId={titleLayoutId}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="min-w-0 font-semibold text-[var(--editorial-ink)] transition group-hover:text-[var(--editorial-sage)]"
          >
            {department.name}
          </motion.span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--editorial-terracotta)]" />
        </button>
      </ExpandableScreenTrigger>

      <ExpandableScreenContent
        showCloseButton={false}
        className="fixed inset-2 z-[90] overflow-hidden border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shadow-[0_24px_90px_rgba(21,32,28,0.22)] sm:inset-4"
      >
        <div className="grid h-full grid-rows-[minmax(180px,42vh)_1fr] bg-[var(--editorial-paper)]">
          <div className="relative min-h-0">
            <Image
              src={university.image || DEFAULT_IMAGE}
              alt={`${department.name} - ${university.name}`}
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/15" />
          </div>
          <div className="flex min-h-0 items-center justify-center px-6 text-center">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
                {university.name}
              </p>
              <motion.h3
                layoutId={titleLayoutId}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="mt-3 font-serif text-3xl font-semibold leading-tight text-[var(--editorial-ink)] sm:text-5xl"
              >
                {department.name}
              </motion.h3>
              <p className="mt-4 text-sm font-semibold text-[var(--editorial-muted)]">
                {openingLabel}
              </p>
            </div>
          </div>
        </div>
      </ExpandableScreenContent>
    </ExpandableScreen>
  );
}
```

- [ ] **Step 3: Create the grouped program directory**

Create `components/university-details/ProgramDirectory.tsx`:

```tsx
"use client";

import type { Department, University } from "@/app/data";
import { ProgramTransitionEntry } from "./ProgramTransitionEntry";

interface ProgramDirectoryProps {
  university: University;
  departments: Department[];
  title: string;
  programCountLabel: string;
  bachelorPrograms: string;
  masterPrograms: string;
  openingLabel: string;
  expandingSlug: string | null;
  onSelect: (slug: string) => void;
}

function ProgramGroup({
  university,
  departments,
  label,
  openingLabel,
  expandingSlug,
  onSelect,
}: {
  university: University;
  departments: Department[];
  label: string;
  openingLabel: string;
  expandingSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  if (departments.length === 0) return null;

  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 py-3 sm:px-5">
        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
          {label}
        </h3>
        <span className="font-serif text-xl font-semibold text-[var(--editorial-terracotta)]">
          {departments.length}
        </span>
      </header>
      <div>
        {departments.map((department) => (
          <ProgramTransitionEntry
            key={department.slug}
            university={university}
            department={department}
            openingLabel={openingLabel}
            expanding={expandingSlug === department.slug}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export function ProgramDirectory({
  university,
  departments,
  title,
  programCountLabel,
  bachelorPrograms,
  masterPrograms,
  openingLabel,
  expandingSlug,
  onSelect,
}: ProgramDirectoryProps) {
  const bachelorDepartments = departments.filter(
    (department) => department.level === "bachelor",
  );
  const masterDepartments = departments.filter(
    (department) => department.level === "master",
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--editorial-border)] pb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {programCountLabel}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold leading-none text-[var(--editorial-ink)] sm:text-4xl">
            {title}
          </h2>
        </div>
        <p className="text-sm font-bold text-[var(--editorial-muted)]">
          <span className="font-serif text-3xl text-[var(--editorial-ink)]">
            {departments.length}
          </span>{" "}
          {programCountLabel}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProgramGroup
          university={university}
          departments={bachelorDepartments}
          label={bachelorPrograms}
          openingLabel={openingLabel}
          expandingSlug={expandingSlug}
          onSelect={onSelect}
        />
        <ProgramGroup
          university={university}
          departments={masterDepartments}
          label={masterPrograms}
          openingLabel={openingLabel}
          expandingSlug={expandingSlug}
          onSelect={onSelect}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS. The new components compile even before the pages import them.

- [ ] **Step 5: Commit**

```bash
git add components/university-details/DetailMentorPrompt.tsx \
  components/university-details/ProgramTransitionEntry.tsx \
  components/university-details/ProgramDirectory.tsx
git commit -m "feat: add shared portrait detail components"
```

## Task 4: Build The University Portrait Components

Create the image-led university masthead and the non-SaaS highlights section before wiring the route page.

**Files:**
- Create: `components/university-details/UniversityPortraitMasthead.tsx`
- Create: `components/university-details/UniversityHighlights.tsx`

- [ ] **Step 1: Create the university masthead**

Create `components/university-details/UniversityPortraitMasthead.tsx`:

```tsx
"use client";

import Image from "next/image";
import { ArrowLeft, ExternalLink, Heart, MapPin } from "lucide-react";

import { DEFAULT_IMAGE, type University } from "@/app/data";

interface UniversityPortraitMastheadProps {
  university: University;
  eyebrow: string;
  backLabel: string;
  websiteLabel: string;
  officialSourceLabel: string;
  programCountLabel: string;
  favoriteLabel: string;
  favorite: boolean;
  favoriteLoading: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
}

export function UniversityPortraitMasthead({
  university,
  eyebrow,
  backLabel,
  websiteLabel,
  officialSourceLabel,
  programCountLabel,
  favoriteLabel,
  favorite,
  favoriteLoading,
  onBack,
  onToggleFavorite,
}: UniversityPortraitMastheadProps) {
  return (
    <header className="border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            disabled={favoriteLoading}
            aria-label={favoriteLabel}
            aria-pressed={favorite}
            className={`inline-flex h-11 w-11 items-center justify-center border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
              favorite
                ? "border-[var(--editorial-terracotta)] bg-[#fbf0eb] text-[var(--editorial-terracotta)]"
                : "border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-muted)] hover:border-[var(--editorial-terracotta)] hover:text-[var(--editorial-terracotta)]"
            } disabled:opacity-50`}
          >
            <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(360px,1.02fr)_minmax(0,0.98fr)] lg:items-stretch">
          <div className="relative aspect-[16/11] min-h-64 overflow-hidden border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
            <Image
              src={university.image || DEFAULT_IMAGE}
              alt={university.name}
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-between border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 sm:p-7">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
                {eyebrow}
              </p>
              <h1 className="mt-4 break-words font-serif text-4xl font-semibold leading-[0.98] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl">
                {university.name}
              </h1>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold text-[var(--editorial-muted)]">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0 text-[var(--editorial-terracotta)]" />
                  <span className="truncate">{university.city}</span>
                </span>
                <span>{university.type}</span>
              </div>
            </div>

            <dl className="mt-8 grid gap-3 border-t border-[var(--editorial-border)] pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
                  {programCountLabel}
                </dt>
                <dd className="mt-1 font-serif text-3xl font-semibold text-[var(--editorial-ink)]">
                  {university.departments.length}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
                  {officialSourceLabel}
                </dt>
                <dd className="mt-2">
                  <a
                    href={university.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
                  >
                    {websiteLabel}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create the highlights rows**

Create `components/university-details/UniversityHighlights.tsx`:

```tsx
interface UniversityHighlightsProps {
  title: string;
  features: string[];
}

export function UniversityHighlights({
  title,
  features,
}: UniversityHighlightsProps) {
  if (features.length === 0) return null;

  return (
    <section>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
        {title}
      </p>
      <div className="mt-4 grid border border-[var(--editorial-border)] bg-[var(--editorial-surface)] sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <p
            key={feature}
            className={`min-h-20 px-4 py-5 font-serif text-xl leading-tight text-[var(--editorial-ink)] ${
              index > 0 ? "border-t border-[var(--editorial-border)] sm:border-t-0" : ""
            } ${index % 2 === 1 ? "sm:border-l sm:border-[var(--editorial-border)]" : ""} ${
              index > 1 ? "lg:border-l lg:border-[var(--editorial-border)]" : ""
            }`}
          >
            {feature}
          </p>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/university-details/UniversityPortraitMasthead.tsx \
  components/university-details/UniversityHighlights.tsx
git commit -m "feat: add university portrait detail sections"
```

## Task 5: Rewrite The University Detail Page

Compose the existing client route logic with the new university portrait components. Do not change the server metadata layout.

**Files:**
- Modify: `app/universities/[id]/page.tsx`

- [ ] **Step 1: Replace the page imports and keep route logic**

Rewrite `app/universities/[id]/page.tsx` to keep:

- `useParams`, `useRouter`, `useSearchParams`.
- `handleBack` with `?from=list`.
- `useFavorites`.
- `useUniversitiesData`.
- `expandingDeptSlug` timer and route push.
- localized `description` and `features`.

Use this full page body:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import ScrollProgress from "@/components/ScrollProgress";
import { DetailMentorPrompt } from "@/components/university-details/DetailMentorPrompt";
import { ProgramDirectory } from "@/components/university-details/ProgramDirectory";
import { UniversityHighlights } from "@/components/university-details/UniversityHighlights";
import { UniversityPortraitMasthead } from "@/components/university-details/UniversityPortraitMasthead";
import { useLanguage } from "@/context/LanguageContext";
import { useFavorites } from "@/lib/useFavorites";
import { useUniversitiesData } from "@/lib/useUniversitiesData";

export default function UniversityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { isFavorite, toggleFavorite, loading, isLoggedIn } = useFavorites();
  const { universities, loading: universitiesLoading, error: universitiesError } =
    useUniversitiesData();
  const [expandingDeptSlug, setExpandingDeptSlug] = useState<string | null>(null);

  const aiMentorHref = isLoggedIn
    ? "/ai-mentor"
    : "/sign-in?redirect_url=%2Fai-mentor";
  const idFromUrl = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const university = useMemo(
    () => universities.find((entry) => String(entry.id) === String(idFromUrl)),
    [idFromUrl, universities],
  );

  useEffect(() => {
    if (!expandingDeptSlug || !idFromUrl) return;
    const timer = window.setTimeout(() => {
      router.push(`/universities/${idFromUrl}/departments/${expandingDeptSlug}`);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [expandingDeptSlug, idFromUrl, router]);

  const handleBack = () => {
    const cameFromList = searchParams.get("from") === "list";
    if (cameFromList && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/universities");
  };

  if (universitiesLoading) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center text-sm font-semibold text-[var(--editorial-muted)]">
        {language === "tr" ? "Okul dosyası yükleniyor..." : "Loading school portrait..."}
      </div>
    );
  }

  if (universitiesError) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center text-sm font-semibold text-[var(--editorial-muted)]">
        {language === "tr"
          ? "Üniversite verisi yüklenemedi."
          : "University data could not be loaded."}
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold text-[var(--editorial-ink)]">
          {t.detail.notFound}
        </h1>
        <Link
          href="/universities"
          className="mt-5 inline-flex border border-[var(--editorial-sage)] px-4 py-3 text-sm font-bold text-[var(--editorial-sage)]"
        >
          {t.detail.backToList}
        </Link>
      </div>
    );
  }

  const favorite = isFavorite(university.id);
  const description =
    language === "en" && university.description_en
      ? university.description_en
      : university.description;
  const features =
    language === "en" && university.features_en
      ? university.features_en
      : university.features;
  const favoriteLabel =
    language === "tr"
      ? `${university.name} ${favorite ? "favorilerden çıkar" : "favorilere ekle"}`
      : `${favorite ? "Remove" : "Add"} ${university.name} ${
          favorite ? "from" : "to"
        } favorites`;

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-28 text-[var(--editorial-ink)]">
      <ScrollProgress />
      <UniversityPortraitMasthead
        university={university}
        eyebrow={t.detail.portraitEyebrow}
        backLabel={t.detail.back}
        websiteLabel={t.detail.visitSite}
        officialSourceLabel={t.detail.officialSource}
        programCountLabel={t.detail.programCount}
        favoriteLabel={favoriteLabel}
        favorite={favorite}
        favoriteLoading={loading}
        onBack={handleBack}
        onToggleFavorite={() => toggleFavorite(university.id)}
      />

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {t.detail.about}
          </p>
          <p className="max-w-4xl font-serif text-xl leading-8 text-[var(--editorial-ink)] sm:text-2xl sm:leading-9">
            {description}
          </p>
        </section>

        <UniversityHighlights title={t.detail.highlights} features={features} />

        <ProgramDirectory
          university={university}
          departments={university.departments}
          title={t.detail.programDirectory}
          programCountLabel={t.detail.programCount}
          bachelorPrograms={t.detail.bachelorPrograms}
          masterPrograms={t.detail.masterPrograms}
          openingLabel={t.detail.openingProgram}
          expandingSlug={expandingDeptSlug}
          onSelect={(slug) => {
            if (!expandingDeptSlug) setExpandingDeptSlug(slug);
          }}
        />

        <DetailMentorPrompt
          href={aiMentorHref}
          eyebrow={t.detail.mentorEyebrow}
          title={t.detail.mentorTitle}
          body={t.detail.mentorBody}
          cta={t.detail.askAi}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Run focused type and page checks**

Run:

```bash
npx tsc --noEmit
npm run check:university-details-ui
```

Expected:

- Type check passes.
- Detail guard still FAILS because the program detail page remains old and `ProgramPortraitHeader`/`ProgramMetaStrip` do not exist yet.
- The university page should no longer be reported for old detail tokens or missing university portrait composition tokens.

- [ ] **Step 3: Commit**

```bash
git add 'app/universities/[id]/page.tsx'
git commit -m "feat: redesign university detail as portrait"
```

## Task 6: Build Program Portrait Header And Metadata

Create the program-specific identity pieces before rewriting its route page.

**Files:**
- Create: `components/university-details/ProgramMetaStrip.tsx`
- Create: `components/university-details/ProgramPortraitHeader.tsx`

- [ ] **Step 1: Create the metadata strip**

Create `components/university-details/ProgramMetaStrip.tsx`:

```tsx
import type { Department } from "@/app/data";

interface ProgramMetaStripProps {
  department: Department;
  factsLabel: string;
  levelLabel: string;
  durationLabel: string;
  languageLabel: string;
  levelValue: string;
  durationValue: string;
  languageValue: string;
}

export function ProgramMetaStrip({
  department,
  factsLabel,
  levelLabel,
  durationLabel,
  languageLabel,
  levelValue,
  durationValue,
  languageValue,
}: ProgramMetaStripProps) {
  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
      <p className="border-b border-[var(--editorial-border)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)] sm:px-5">
        {factsLabel}
      </p>
      <dl className="grid sm:grid-cols-3">
        {[
          { label: levelLabel, value: levelValue },
          { label: durationLabel, value: durationValue },
          { label: languageLabel, value: languageValue },
        ].map((fact, index) => (
          <div
            key={`${department.slug}-${fact.label}`}
            className={`px-4 py-5 sm:px-5 ${
              index > 0
                ? "border-t border-[var(--editorial-border)] sm:border-l sm:border-t-0"
                : ""
            }`}
          >
            <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
              {fact.label}
            </dt>
            <dd className="mt-2 font-serif text-2xl font-semibold text-[var(--editorial-ink)]">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 2: Create the program portrait header**

Create `components/university-details/ProgramPortraitHeader.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { motion } from "framer-motion";

import { DEFAULT_IMAGE, type Department, type University } from "@/app/data";

interface ProgramPortraitHeaderProps {
  university: University;
  department: Department;
  eyebrow: string;
  backLabel: string;
  websiteLabel: string;
}

export function ProgramPortraitHeader({
  university,
  department,
  eyebrow,
  backLabel,
  websiteLabel,
}: ProgramPortraitHeaderProps) {
  return (
    <header className="border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/universities/${university.id}`}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
          <div className="relative aspect-[16/11] min-h-64 overflow-hidden border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
            <Image
              src={university.image || DEFAULT_IMAGE}
              alt={`${department.name} - ${university.name}`}
              fill
              priority
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="object-cover"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-between border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 sm:p-7">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
                {eyebrow}
              </p>
              <motion.h1
                layoutId={`dept-title-${university.id}-${department.slug}`}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="mt-4 break-words font-serif text-4xl font-semibold leading-[0.98] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl"
              >
                {department.name}
              </motion.h1>
              <Link
                href={`/universities/${university.id}`}
                className="mt-5 inline-flex font-serif text-2xl font-semibold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-ink)]"
              >
                {university.name}
              </Link>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--editorial-muted)]">
                <MapPin className="h-4 w-4 text-[var(--editorial-terracotta)]" />
                {university.city}
              </p>
            </div>

            <a
              href={university.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex w-fit items-center gap-2 border-t border-[var(--editorial-border)] pt-4 text-sm font-bold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
            >
              {websiteLabel}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/university-details/ProgramMetaStrip.tsx \
  components/university-details/ProgramPortraitHeader.tsx
git commit -m "feat: add program portrait header sections"
```

## Task 7: Rewrite The Program Detail Page

Compose the program portrait page using the same shared directory and Mentor prompt. Keep runtime metadata fallbacks and sibling-program routing.

**Files:**
- Modify: `app/universities/[id]/departments/[deptSlug]/page.tsx`

- [ ] **Step 1: Replace the old dark program page**

Rewrite `app/universities/[id]/departments/[deptSlug]/page.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import ScrollProgress from "@/components/ScrollProgress";
import { DetailMentorPrompt } from "@/components/university-details/DetailMentorPrompt";
import { ProgramDirectory } from "@/components/university-details/ProgramDirectory";
import { ProgramMetaStrip } from "@/components/university-details/ProgramMetaStrip";
import { ProgramPortraitHeader } from "@/components/university-details/ProgramPortraitHeader";
import { useLanguage } from "@/context/LanguageContext";
import { useUniversitiesData } from "@/lib/useUniversitiesData";

export default function DepartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { t, language } = useLanguage();
  const { universities, loading: universitiesLoading, error: universitiesError } =
    useUniversitiesData();
  const [expandingDeptSlug, setExpandingDeptSlug] = useState<string | null>(null);

  const aiMentorHref = isSignedIn
    ? "/ai-mentor"
    : "/sign-in?redirect_url=%2Fai-mentor";
  const idFromUrl = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const deptSlugFromUrl = Array.isArray(params?.deptSlug)
    ? params.deptSlug[0]
    : params?.deptSlug;

  const university = useMemo(
    () => universities.find((entry) => String(entry.id) === String(idFromUrl)),
    [idFromUrl, universities],
  );
  const department = useMemo(
    () => university?.departments.find((entry) => entry.slug === deptSlugFromUrl),
    [deptSlugFromUrl, university],
  );
  const otherDepts = useMemo(
    () => university?.departments.filter((entry) => entry.slug !== deptSlugFromUrl) ?? [],
    [deptSlugFromUrl, university],
  );

  useEffect(() => {
    if (!expandingDeptSlug || !university?.id) return;
    const timer = window.setTimeout(() => {
      router.push(`/universities/${university.id}/departments/${expandingDeptSlug}`);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [expandingDeptSlug, router, university?.id]);

  if (universitiesLoading) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center text-sm font-semibold text-[var(--editorial-muted)]">
        {language === "tr" ? "Program dosyası yükleniyor..." : "Loading program portrait..."}
      </div>
    );
  }

  if (universitiesError) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center text-sm font-semibold text-[var(--editorial-muted)]">
        {language === "tr"
          ? "Üniversite verisi yüklenemedi."
          : "University data could not be loaded."}
      </div>
    );
  }

  if (!university || !department) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold text-[var(--editorial-ink)]">
          {language === "tr" ? "Bölüm Bulunamadı" : "Program Not Found"}
        </h1>
        <Link
          href="/universities"
          className="mt-5 inline-flex border border-[var(--editorial-sage)] px-4 py-3 text-sm font-bold text-[var(--editorial-sage)]"
        >
          {language === "tr" ? "Üniversitelere Dön" : "Back to Universities"}
        </Link>
      </div>
    );
  }

  const description =
    language === "en" && university.description_en
      ? university.description_en
      : university.description;
  const safeLanguages =
    Array.isArray(department.languages) && department.languages.length > 0
      ? department.languages
      : ["en"];
  const safeDurationYears =
    typeof department.durationYears === "number" ? department.durationYears : 3;
  const safeLevel = department.level === "master" ? "master" : "bachelor";
  const levelValue =
    safeLevel === "master" ? t.department.master : t.department.bachelor;
  const durationValue =
    language === "tr"
      ? `${safeDurationYears} yıl`
      : `${safeDurationYears} year${safeDurationYears === 1 ? "" : "s"}`;
  const languageValue = safeLanguages
    .map((entry) => {
      if (entry === "it") return language === "tr" ? "İtalyanca" : "Italian";
      return language === "tr" ? "İngilizce" : "English";
    })
    .join(" / ");

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-28 text-[var(--editorial-ink)]">
      <ScrollProgress />
      <ProgramPortraitHeader
        university={university}
        department={department}
        eyebrow={t.department.portraitEyebrow}
        backLabel={t.department.backToUni}
        websiteLabel={t.detail.visitSite}
      />

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <ProgramMetaStrip
          department={department}
          factsLabel={t.department.programFacts}
          levelLabel={t.department.level}
          durationLabel={t.department.duration}
          languageLabel={t.department.language}
          levelValue={levelValue}
          durationValue={durationValue}
          languageValue={languageValue}
        />

        <section className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {t.department.schoolContext}
          </p>
          <p className="max-w-4xl font-serif text-xl leading-8 text-[var(--editorial-ink)] sm:text-2xl sm:leading-9">
            {description}
          </p>
        </section>

        <ProgramDirectory
          university={university}
          departments={otherDepts}
          title={t.department.otherDepts}
          programCountLabel={t.detail.programCount}
          bachelorPrograms={t.detail.bachelorPrograms}
          masterPrograms={t.detail.masterPrograms}
          openingLabel={t.detail.openingProgram}
          expandingSlug={expandingDeptSlug}
          onSelect={(slug) => {
            if (!expandingDeptSlug) setExpandingDeptSlug(slug);
          }}
        />

        <DetailMentorPrompt
          href={aiMentorHref}
          eyebrow={t.department.mentorEyebrow}
          title={t.department.mentorTitle}
          body={t.department.mentorBody}
          cta={t.department.askAi}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Run the guard and verify GREEN**

Run:

```bash
npx tsc --noEmit
npm run check:university-details-ui
```

Expected: both PASS. The new page no longer imports `Banknote`, `Sparkles`, glass surfaces, or fee render paths.

- [ ] **Step 3: Commit**

```bash
git add 'app/universities/[id]/departments/[deptSlug]/page.tsx'
git commit -m "feat: redesign program detail as portrait"
```

## Task 8: Run Project Verification And Browser QA

This task proves the redesigned pages work in context before completion claims.

**Files:**
- No planned source edits. If verification reveals a bug, fix the smallest affected file and rerun the failing command before committing.

- [ ] **Step 1: Run automated verification**

Run:

```bash
npm run lint
npm run check:universities-ui
npm run check:university-details-ui
npm run check:university-data-source
npm run check:university-department-merge
npm run build
```

Expected: all commands PASS. If `npm run build` fails because required environment variables or sandbox network restrictions are missing, record the actual blocker and keep the passing local checks in the final report.

- [ ] **Step 2: Start the local app**

Run:

```bash
npm run dev
```

Expected: Next dev server starts and prints a local URL. If port `3000` is already taken, use the URL printed by Next.

- [ ] **Step 3: Verify desktop university detail**

Using the Browser plugin, open a real detail route such as:

```text
http://localhost:3000/universities/1?from=list
```

Check:

- Campus portrait image, school name, city, type, program count, official site, and favorite control show.
- No fee appears.
- Full localized description and all features render.
- Bachelor and master groups render when present.
- AI Mentor is present as the secondary prompt.
- Back behavior returns to the list when entered with `?from=list`.

- [ ] **Step 4: Verify desktop program detail and transitions**

Open a program detail route from a program row and verify:

- The morph transition opens the editorial program portrait state.
- Program page shows program name, owning university link, city, level, duration, language, official site, context note, other programs, and secondary Mentor prompt.
- No fee appears.
- A sibling program row transitions to another program route.

- [ ] **Step 5: Verify mobile and reduced motion**

Use Browser viewport controls for a phone-sized viewport and check:

- Both portrait mastheads keep the next section hinted below the first viewport.
- Long school/program names wrap without overlapping controls.
- Program rows remain tappable and readable.
- Bottom navigation clearance is comfortable.

Enable reduced motion in the browser or OS emulation if available and verify program navigation remains coherent without depending on showy motion.

- [ ] **Step 6: Commit any verification fixes**

If Task 8 required code edits:

```bash
git add app components lib scripts package.json
git commit -m "fix: polish campus portrait detail flows"
```

If no edits were required, do not create an empty commit.
