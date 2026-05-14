# Communities Editorial Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the filter/badge dashboard at `/communities` with an editorial atlas — five need-based chapters, hybrid editor voice, scholarships-parity tokens.

**Architecture:** Static client component rendered by the existing `/communities` Server Component page. Data extends `lib/community-links.ts` with a `chapter` field; chapter metadata (title/intro/citySummary per language) lives in a new `lib/communities/chapters.ts`. Old `CommunityLinksExplorer` is deleted; new `CommunityAtlas` composes TopBar / Hero / TableOfContents / 5×ChapterBlock / Footer in a single file matching the existing `ScholarshipsExplorer` pattern.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, TypeScript, Framer Motion, Clerk (boundary only — page is public), Lucide icons.

**Spec:** `docs/superpowers/specs/2026-05-14-communities-editorial-atlas-design.md`

---

## File Structure

| Path | Action | Responsibility |
| --- | --- | --- |
| `lib/community-links.ts` | Modify | Adds `CommunityChapter` type + `COMMUNITY_CHAPTERS` const; adds required `chapter` field on `CommunityLink`; assigns `chapter` value to each of the 19 records. |
| `lib/communities/chapters.ts` | Create | Chapter metadata (id, slug, order, titleTr/En, introTr/En, citySummaryTr/En) + `getCommunitiesByChapter()` helper. |
| `lib/translations.ts` | Modify | Replaces `communities` block in TR and EN trees with the new atlas keys. |
| `components/communities/CommunityAtlas.tsx` | Create | New client leaf — atlas composition. All sub-components (`AtlasTopBar`, `AtlasHero`, `AtlasTableOfContents`, `ChapterBlock`, `EntryRow`, `AtlasFooterPrompt`) live as private functions inside this file. |
| `components/communities/CommunityLinksExplorer.tsx` | Delete | Replaced. |
| `app/communities/page.tsx` | Modify | Swap the one-line import target from `CommunityLinksExplorer` to `CommunityAtlas`. Metadata block untouched. |

`app/topluluklar/page.tsx` (the redirect) and `app/sitemap.ts` are untouched.

---

## Task 1: Extend `CommunityLink` with `chapter` field

**Files:**
- Modify: `lib/community-links.ts`

- [ ] **Step 1.1: Add the chapter union, const, and interface field**

At the top of `lib/community-links.ts`, immediately after the existing `CommunityPlatform`, `CommunityCategory`, `CommunitySizeHint` types, insert:

```ts
export const COMMUNITY_CHAPTERS = [
  "preparation",
  "housing",
  "university",
  "city-voice",
  "pan-italy",
] as const;

export type CommunityChapter = (typeof COMMUNITY_CHAPTERS)[number];
```

Then update the `CommunityLink` interface to add a required `chapter` field. The interface currently ends with `lastCheckedAt: string; // YYYY-MM-DD` then `}`. Insert before the closing brace:

```ts
  chapter: CommunityChapter;
```

So the full interface ends with:

```ts
  status: "active" | "limited" | "unverified";
  verificationSource: "user-confirmed" | "editor-reviewed";
  lastCheckedAt: string; // YYYY-MM-DD
  chapter: CommunityChapter;
}
```

- [ ] **Step 1.2: Add `chapter:` to every one of the 19 records**

Apply the following chapter assignments. For each record, add `chapter: "<value>",` as a new last field (right after `lastCheckedAt`):

| record `id` | chapter value |
| --- | --- |
| `padova-community` | `"city-voice"` |
| `firenze-whatsapp` | `"city-voice"` |
| `pre-enrollment-yardimlasma` | `"preparation"` |
| `ergo-yardimlasma` | `"preparation"` |
| `roma-ev-oda` | `"housing"` |
| `bologna-hiking-club` | `"city-voice"` |
| `bologna-erasmus-students` | `"city-voice"` |
| `unibo-general` | `"university"` |
| `househunters-ravenna` | `"housing"` |
| `apartments-bologna` | `"housing"` |
| `spotted-unibo-ravenna` | `"city-voice"` |
| `italyada-yasayan-turkler` | `"pan-italy"` |
| `italya-bilgi` | `"pan-italy"` |
| `sapienza-general` | `"university"` |
| `accomodations-in-rome-2025-2026` | `"housing"` |
| `unito-23-24` | `"university"` |
| `unito-22-23` | `"university"` |
| `sapienza-2026-2027` | `"university"` |
| `ergo-burs-basvuru-sureci` | `"preparation"` |

Counts to confirm: `preparation: 3`, `housing: 4`, `university: 5`, `city-voice: 5`, `pan-italy: 2`. Total 19.

- [ ] **Step 1.3: Type-check**

Run: `npx tsc --noEmit`

Expected: clean (no errors). The old `CommunityLinksExplorer.tsx` does not reference `chapter`, so adding the field does not break it.

- [ ] **Step 1.4: Data integrity script**

Run: `npm run check:data`

Expected: passes. The script validates university data only (`app/data.ts`), so it is unaffected by community-links changes.

- [ ] **Step 1.5: Commit**

```bash
git add lib/community-links.ts
git commit -m "$(cat <<'EOF'
feat(communities): add chapter field to community-link data

Adds the CommunityChapter union (preparation, housing, university,
city-voice, pan-italy) and assigns chapter values to all 19 existing
community records. Pure data layer change; no consumers updated yet.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create chapter metadata module

**Files:**
- Create: `lib/communities/chapters.ts`

- [ ] **Step 2.1: Create the directory and file**

```bash
mkdir -p lib/communities
```

- [ ] **Step 2.2: Write the full chapter metadata file**

Create `lib/communities/chapters.ts` with this exact content:

```ts
import {
  COMMUNITY_LINKS,
  type CommunityChapter,
  type CommunityLink,
} from "@/lib/community-links";

export interface CommunityChapterMeta {
  id: CommunityChapter;
  slug: string;
  order: number;
  titleTr: string;
  titleEn: string;
  introTr: string;
  introEn: string;
  citySummaryTr: string;
  citySummaryEn: string;
}

export const COMMUNITY_CHAPTER_META: CommunityChapterMeta[] = [
  {
    id: "preparation",
    slug: "chapter-prep",
    order: 1,
    titleTr: "Hazırlık",
    titleEn: "Preparation",
    introTr:
      "İtalya yolu evrak ve başvuru telaşıyla başlar. Pre-enrollment dönemini bilenlerle paylaştığın grup, ilk aylarda en pratik kaynaktır. Burs tarafı Emilia-Romagna ağırlıklı — ER.GO süreç gruplarıdır.",
    introEn:
      "Italy begins with paperwork and timing. The pre-enrollment group is your most practical resource in the first months. Scholarships here lean Emilia-Romagna — ER.GO process groups.",
    citySummaryTr: "Pan-İtalya · Emilia-Romagna",
    citySummaryEn: "Pan-Italy · Emilia-Romagna",
  },
  {
    id: "housing",
    slug: "chapter-housing",
    order: 2,
    titleTr: "Konaklama",
    titleEn: "Housing",
    introTr:
      "Ev arayan öğrencinin ilk dört haftası bu gruplarda geçer. Roma'da arz az ve rotasyon yavaş; Bologna'da ilan günü gününe düşer. İki şehir için iki ayrı kanal öneriyoruz; Ravenna küçük ama düzenli.",
    introEn:
      "The first four weeks of housing hunting live inside these groups. Rome runs scarce and slow; Bologna sees fresh listings daily. Two cities, two separate channels — Ravenna small but steady.",
    citySummaryTr: "Roma · Bologna · Ravenna",
    citySummaryEn: "Rome · Bologna · Ravenna",
  },
  {
    id: "university",
    slug: "chapter-uni",
    order: 3,
    titleTr: "Üniversite Aileleri",
    titleEn: "University Cohorts",
    introTr:
      "Cohort grupları, üniversitede sınıf arkadaşlarını bulduğun yerdir. UNIBO ve Sapienza geniştir; Unito'nun yıllık (22/23, 23/24) grupları daha küçük ama düzenli. Sapienza 2026/27 yeni kayıt yıllarına özel — dolduğunda kapanabiliyor.",
    introEn:
      "Cohort groups are where you find your classmates. UNIBO and Sapienza run large; Unito holds quieter yearly cohorts (22/23, 23/24). Sapienza 2026/27 is fresh-intake-specific and may close once full.",
    citySummaryTr: "Bologna · Roma · Torino",
    citySummaryEn: "Bologna · Rome · Turin",
  },
  {
    id: "city-voice",
    slug: "chapter-city",
    order: 4,
    titleTr: "Şehir Sesi",
    titleEn: "City Life",
    introTr:
      "Bir şehirde yaşamayı, ev arkadaşı bulmayı, hafta sonu yürüyüşüne çıkmayı sağlayan gruplar. Padova ve Firenze'nin genel toplulukları yıllardır ayakta; Bologna iki ayrı sosyal çevreye (Erasmus + hiking) bölünüyor. Ravenna küçük ama hareketli.",
    introEn:
      "These are the groups that make a city feel livable — flatmates, weekend hikes, casual meetups. Padova and Firenze run year after year; Bologna splits into two social circles (Erasmus + hiking). Ravenna runs small but lively.",
    citySummaryTr: "Padova · Firenze · Bologna · Ravenna",
    citySummaryEn: "Padua · Florence · Bologna · Ravenna",
  },
  {
    id: "pan-italy",
    slug: "chapter-pan",
    order: 5,
    titleTr: "Pan-İtalya",
    titleEn: "Pan-Italy",
    introTr:
      "İtalya'da yaşayan Türk diasporasının geniş Facebook grupları. Yavaş ama derinden besleyen, soru-cevap odaklı — şehirden bağımsız genel bilgiler için.",
    introEn:
      "Wide Facebook groups for the Turkish diaspora in Italy. Slow but deep — Q&A oriented, useful for city-agnostic questions.",
    citySummaryTr: "Tüm İtalya",
    citySummaryEn: "All of Italy",
  },
];

const STATUS_ORDER: Record<CommunityLink["status"], number> = {
  active: 0,
  limited: 1,
  unverified: 2,
};

export function getCommunitiesByChapter(): Record<CommunityChapter, CommunityLink[]> {
  const grouped: Record<CommunityChapter, CommunityLink[]> = {
    preparation: [],
    housing: [],
    university: [],
    "city-voice": [],
    "pan-italy": [],
  };

  for (const community of COMMUNITY_LINKS) {
    grouped[community.chapter].push(community);
  }

  for (const chapterId of Object.keys(grouped) as CommunityChapter[]) {
    grouped[chapterId].sort((a, b) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });
  }

  return grouped;
}
```

- [ ] **Step 2.3: Type-check**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 2.4: Commit**

```bash
git add lib/communities/chapters.ts
git commit -m "$(cat <<'EOF'
feat(communities): add chapter metadata module

Defines CommunityChapterMeta with TR/EN titles, intros, and city
summaries for all five chapters. Exports getCommunitiesByChapter()
which buckets the 19 records and sorts each bucket by status then
name. Pure data; no UI consumers yet.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Replace the `communities` translations block

**Files:**
- Modify: `lib/translations.ts` (TR block at lines 173–228, EN block at lines 510–565)

This task removes the obsolete keys AND adds the new atlas keys in a single atomic edit. This is safe because zero other consumers reference `t.communities.*` outside `CommunityLinksExplorer.tsx`, which gets deleted in Task 5. Between Task 3 and Task 5 the old explorer will fail to compile — that is acceptable because Task 5 lands immediately after Task 4 and is the same conceptual change.

- [ ] **Step 3.1: Replace the TR communities block**

In `lib/translations.ts`, find the existing `communities: { ... }` block under the `tr:` tree (currently at lines 173–228) and replace the entire block with:

```ts
    communities: {
      backHome: "Ana sayfaya dön",
      pageIdentity: "Öğrenci Toplulukları · Atlas",
      issueLabel: "SAYI 01 — 2026 KAYIT YILI",
      heroTitleLines: ["Öğrenci", "topluluklarının", "atlası."],
      heroIntro:
        "İtalya'da yıllardır ayakta kalan, doğrulanmış WhatsApp, Telegram ve Facebook topluluklarının seçilmiş bir rehberi. Resmi değil, sahte üye sayısı yok — sadece tek tek bakılıp kayda alınmış satırlar.",
      curationNoteLeading: "Son toplu kontrol:",
      curationNoteBody:
        "Her topluluk üye tarafından onaylanmıştır; ItalyPath yönetimi yoktur.",
      tocLabel: "İçindekiler",
      communityCountSuffix: "topluluk",
      platformMonograms: {
        whatsapp: "WA",
        telegram: "TG",
        facebook: "FB",
      },
      platformLongNames: {
        whatsapp: "WhatsApp",
        telegram: "Telegram",
        facebook: "Facebook",
      },
      openAction: "AÇ",
      openAriaSuffix: "yeni sekmede açılır",
      regionUnknown: "Bölge belirtilmemiş",
      footerTitle: "Bilmediğimiz bir topluluk var mı?",
      footerBody:
        "Yaşayan, üyelerinin tanıdığı bir grup biliyorsan: linkini at, biz inceleyip atlasa alıyoruz.",
      footerCta: "TOPLULUK ÖNER",
      footerMailSubject: "Yeni topluluk önerisi",
    },
```

- [ ] **Step 3.2: Replace the EN communities block**

Find the existing `communities: { ... }` block under the `en:` tree (currently at lines 510–565) and replace the entire block with:

```ts
    communities: {
      backHome: "Back to home",
      pageIdentity: "Student Communities · Atlas",
      issueLabel: "ISSUE 01 — 2026 INTAKE YEAR",
      heroTitleLines: ["An atlas of", "student", "communities."],
      heroIntro:
        "A curated guide to long-standing, verified WhatsApp, Telegram, and Facebook student groups in Italy. No official affiliation, no fake member counts — only rows we've checked one by one.",
      curationNoteLeading: "Last collection-wide check:",
      curationNoteBody:
        "Each community is member-confirmed; ItalyPath does not administer them.",
      tocLabel: "Contents",
      communityCountSuffix: "communities",
      platformMonograms: {
        whatsapp: "WA",
        telegram: "TG",
        facebook: "FB",
      },
      platformLongNames: {
        whatsapp: "WhatsApp",
        telegram: "Telegram",
        facebook: "Facebook",
      },
      openAction: "OPEN",
      openAriaSuffix: "opens in a new tab",
      regionUnknown: "Region not specified",
      footerTitle: "Know a community we missed?",
      footerBody:
        "If you know a live group whose members vouch for it, send us the link — we'll review and add it to the atlas.",
      footerCta: "SUGGEST A COMMUNITY",
      footerMailSubject: "New community suggestion",
    },
```

- [ ] **Step 3.3: Skip TypeScript check temporarily**

`npx tsc --noEmit` will FAIL at this point because the still-existing `CommunityLinksExplorer.tsx` references the obsolete keys. This is expected and resolved by Tasks 4–5.

Do NOT commit yet — combine with Tasks 4 and 5 below for a build-clean checkpoint, or commit a known-broken state. **Recommended:** continue to Task 4 before committing this change. Update the commit message in Task 5 to cover Tasks 3, 4, and 5 if you prefer one atomic commit.

For a strict TDD-style sequence with green builds at every commit, stash this change (`git stash`) and apply it inside Task 5. The plan below assumes the simpler "commit at the end of Task 5" path; either is acceptable.

---

## Task 4: Build the `CommunityAtlas` component

**Files:**
- Create: `components/communities/CommunityAtlas.tsx`

- [ ] **Step 4.1: Write the full component file**

Create `components/communities/CommunityAtlas.tsx` with this exact content:

```tsx
"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowLeft, ExternalLink, Globe } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import {
  COMMUNITY_LINKS,
  type CommunityChapter,
  type CommunityLink,
  type CommunityPlatform,
} from "@/lib/community-links";
import {
  COMMUNITY_CHAPTER_META,
  getCommunitiesByChapter,
  type CommunityChapterMeta,
} from "@/lib/communities/chapters";
import type { Language } from "@/types";

const SUGGESTION_MAIL = "contact@italypath.com";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 110, damping: 22 },
  },
};

function formatDate(value: string, language: Language) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function platformMonogramColor(platform: CommunityPlatform) {
  if (platform === "whatsapp") return "text-[var(--editorial-sage)]";
  if (platform === "telegram") return "text-[var(--editorial-terracotta)]";
  return "text-[var(--editorial-ink)]";
}

function pickChapterCopy(
  meta: CommunityChapterMeta,
  language: Language,
): { title: string; intro: string; citySummary: string } {
  return language === "tr"
    ? { title: meta.titleTr, intro: meta.introTr, citySummary: meta.citySummaryTr }
    : { title: meta.titleEn, intro: meta.introEn, citySummary: meta.citySummaryEn };
}

function AtlasTopBar() {
  const { t, language, toggleLanguage } = useLanguage();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-border)] pb-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.communities.backHome}
      </Link>

      <div className="hidden text-sm font-semibold text-[var(--editorial-ink)] sm:block">
        {t.communities.pageIdentity}
      </div>

      <button
        onClick={toggleLanguage}
        aria-label={language === "tr" ? "Switch to English" : "Türkçeye geç"}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-2 text-xs font-bold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
      >
        <Globe className="h-3.5 w-3.5" />
        {language === "tr" ? "EN" : "TR"}
      </button>
    </header>
  );
}

function AtlasHero({ totalLastChecked }: { totalLastChecked: string }) {
  const { t, language } = useLanguage();

  return (
    <motion.section
      variants={itemVariants}
      className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(240px,0.35fr)] lg:items-end"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
          {t.communities.issueLabel}
        </p>
        <h1 className="mt-5 font-serif text-5xl font-normal leading-[0.95] tracking-[-0.025em] text-[var(--editorial-ink)] sm:text-6xl lg:text-7xl">
          {t.communities.heroTitleLines.map((line, index) => (
            <span key={index} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--editorial-muted)] sm:text-lg">
          {t.communities.heroIntro}
        </p>
      </div>

      <div className="border-l-2 border-[var(--editorial-terracotta)] pl-4 text-sm leading-6 text-[var(--editorial-muted)]">
        <p className="font-serif italic">
          {t.communities.curationNoteLeading}{" "}
          <strong className="font-sans font-semibold not-italic text-[var(--editorial-ink)]">
            {formatDate(totalLastChecked, language)}
          </strong>
          . {t.communities.curationNoteBody}
        </p>
      </div>
    </motion.section>
  );
}

function AtlasTableOfContents({
  chapters,
  counts,
}: {
  chapters: CommunityChapterMeta[];
  counts: Record<CommunityChapter, number>;
}) {
  const { t, language } = useLanguage();

  return (
    <motion.nav
      variants={itemVariants}
      aria-label={t.communities.tocLabel}
      className="mt-10 border-y border-[var(--editorial-border)] py-6"
    >
      <p className="mb-4 font-serif text-base italic text-[var(--editorial-muted)]">
        {t.communities.tocLabel}
      </p>

      <ul className="mask-fade-horizontal -mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:gap-0 lg:overflow-visible">
        {chapters.map((chapter, index) => {
          const { title } = pickChapterCopy(chapter, language);
          const count = counts[chapter.id];
          return (
            <li
              key={chapter.id}
              className="min-w-[160px] shrink-0 snap-start border-l border-[var(--editorial-border)] last:border-r lg:min-w-0 lg:shrink"
            >
              <a
                href={`#${chapter.slug}`}
                className="block px-4 py-2 transition hover:bg-[#f6f0e7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-1 text-sm font-semibold leading-tight text-[var(--editorial-ink)]">
                  {title}
                </div>
                <div className="mt-1 text-[11px] text-[var(--editorial-muted)]">
                  {count} {t.communities.communityCountSuffix}
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}

function EntryRow({ community }: { community: CommunityLink }) {
  const { t, language } = useLanguage();
  const platformLongName = t.communities.platformLongNames[community.platform];
  const monogram = t.communities.platformMonograms[community.platform];
  const regionLabel = community.region ?? community.city ?? t.communities.regionUnknown;
  const ariaLabel = `${community.name} — ${platformLongName} — ${t.communities.openAriaSuffix}`;

  return (
    <a
      href={community.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-4 border-b border-[var(--editorial-border)]/60 px-1 py-5 transition-colors duration-200 ease-out last:border-b-0 hover:bg-[#f6f0e7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:scale-[0.995] sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:gap-5"
    >
      <span
        className={`mt-[3px] text-[11px] font-bold uppercase tracking-[0.08em] ${platformMonogramColor(community.platform)}`}
        aria-hidden="true"
      >
        {monogram}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-base font-semibold tracking-[-0.005em] text-[var(--editorial-ink)] sm:text-lg">
            {community.name}
          </span>
          <span className="whitespace-nowrap text-[10px] tracking-wide text-[var(--editorial-muted)]">
            {regionLabel} · {formatDate(community.lastCheckedAt, language)}
          </span>
        </div>
        {community.editorialNote ? (
          <p className="mt-1.5 max-w-2xl font-serif text-sm italic leading-relaxed text-[var(--editorial-muted)]">
            {community.editorialNote}
          </p>
        ) : null}
      </div>

      <span className="inline-flex items-center gap-1 self-start whitespace-nowrap pt-[3px] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)]">
        {t.communities.openAction}
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </span>
    </a>
  );
}

function ChapterBlock({
  chapter,
  communities,
  numberLabel,
}: {
  chapter: CommunityChapterMeta;
  communities: CommunityLink[];
  numberLabel: string;
}) {
  const { t, language } = useLanguage();
  const { title, intro, citySummary } = pickChapterCopy(chapter, language);
  const titleId = `${chapter.slug}-title`;

  return (
    <motion.section
      id={chapter.slug}
      aria-labelledby={titleId}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mt-16 first:mt-12 scroll-mt-24"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-3 sm:gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {numberLabel}
          </span>
          <h2
            id={titleId}
            className="font-serif text-3xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)] sm:text-4xl"
          >
            {title}
          </h2>
        </div>
        <span className="text-[11px] tracking-wide text-[var(--editorial-muted)]">
          {communities.length} {t.communities.communityCountSuffix} · {citySummary}
        </span>
      </div>

      <p className="mt-5 max-w-2xl font-serif text-base italic leading-relaxed text-[var(--editorial-muted)] sm:text-lg">
        {intro}
      </p>

      <div className="mt-8 border-t border-[var(--editorial-border)]">
        {communities.map((community) => (
          <EntryRow key={community.id} community={community} />
        ))}
      </div>
    </motion.section>
  );
}

function AtlasFooterPrompt() {
  const { t } = useLanguage();
  const mailHref = `mailto:${SUGGESTION_MAIL}?subject=${encodeURIComponent(
    t.communities.footerMailSubject,
  )}`;

  return (
    <motion.aside
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mt-20 grid items-center gap-6 border-t border-[var(--editorial-border)] pb-16 pt-10 sm:grid-cols-[1fr_auto]"
    >
      <div>
        <h3 className="font-serif text-xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-2xl">
          {t.communities.footerTitle}
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--editorial-muted)]">
          {t.communities.footerBody}
        </p>
      </div>

      <a
        href={mailHref}
        className="inline-flex items-center gap-2 self-start whitespace-nowrap border border-[var(--editorial-terracotta)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)] transition hover:bg-[var(--editorial-terracotta)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)] sm:self-center"
      >
        {t.communities.footerCta}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </motion.aside>
  );
}

function pickGlobalLastChecked(): string {
  return COMMUNITY_LINKS.reduce<string>((latest, community) => {
    return community.lastCheckedAt > latest ? community.lastCheckedAt : latest;
  }, "");
}

export default function CommunityAtlas() {
  const shouldReduceMotion = useReducedMotion();
  const grouped = getCommunitiesByChapter();
  const counts: Record<CommunityChapter, number> = {
    preparation: grouped.preparation.length,
    housing: grouped.housing.length,
    university: grouped.university.length,
    "city-voice": grouped["city-voice"].length,
    "pan-italy": grouped["pan-italy"].length,
  };
  const totalLastChecked = pickGlobalLastChecked();

  const heroAnimation = shouldReduceMotion ? undefined : "show";

  return (
    <main className="min-h-[100dvh] bg-[var(--editorial-paper)]">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <AtlasTopBar />

        <motion.div
          variants={containerVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          animate={heroAnimation}
        >
          <AtlasHero totalLastChecked={totalLastChecked} />
          <AtlasTableOfContents chapters={COMMUNITY_CHAPTER_META} counts={counts} />
        </motion.div>

        {COMMUNITY_CHAPTER_META.map((chapter, index) => (
          <ChapterBlock
            key={chapter.id}
            chapter={chapter}
            communities={grouped[chapter.id]}
            numberLabel={String(index + 1).padStart(2, "0")}
          />
        ))}

        <AtlasFooterPrompt />
      </div>
    </main>
  );
}
```

- [ ] **Step 4.2: Skip TypeScript check temporarily**

`npx tsc --noEmit` will still FAIL because `CommunityLinksExplorer.tsx` references obsolete translation keys (deleted in Task 3). This resolves in Task 5.

Continue to Task 5 without committing yet.

---

## Task 5: Wire `app/communities/page.tsx` and delete the old explorer

**Files:**
- Modify: `app/communities/page.tsx`
- Delete: `components/communities/CommunityLinksExplorer.tsx`

- [ ] **Step 5.1: Swap the page's import**

In `app/communities/page.tsx`, change line 3:

From:
```ts
import CommunityLinksExplorer from "@/components/communities/CommunityLinksExplorer";
```

To:
```ts
import CommunityAtlas from "@/components/communities/CommunityAtlas";
```

Then change the JSX in the default export from:
```tsx
return <CommunityLinksExplorer />;
```
to:
```tsx
return <CommunityAtlas />;
```

Leave the `metadata` export and every other line untouched.

- [ ] **Step 5.2: Delete the old explorer**

```bash
rm components/communities/CommunityLinksExplorer.tsx
```

- [ ] **Step 5.3: Type-check**

Run: `npx tsc --noEmit`

Expected: clean. Tasks 3 + 4 + 5 together leave the build green.

- [ ] **Step 5.4: Production build smoke**

Run: `npm run build`

Expected: build completes without errors. `/communities` should appear in the prerendered routes list with the new component.

- [ ] **Step 5.5: Commit Tasks 3, 4, and 5 together**

```bash
git add lib/translations.ts components/communities/CommunityAtlas.tsx components/communities/CommunityLinksExplorer.tsx app/communities/page.tsx
git commit -m "$(cat <<'EOF'
feat(communities): replace dashboard with editorial atlas

Drops the filter/badge dashboard and ships a five-chapter editorial
atlas at /communities. Each chapter has its own intro paragraph;
entries render a hybrid voice (per-entry italic blurb only when an
editorialNote already exists). Scholarships-parity tokens: paper
background, serif headlines, terracotta accents, border-divided rows,
two-letter platform monograms (WA / TG / FB), and a mailto-based
suggestion CTA. Old explorer and obsolete translation keys are removed.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Manual visual verification (dev server)

**Files:** none

- [ ] **Step 6.1: Start the dev server**

Run: `npm run dev`

Wait for `Ready in ...` log line.

- [ ] **Step 6.2: Walk the page in Turkish**

Open `http://localhost:3000/communities` in a browser. Verify:

- Hero issue label reads `SAYI 01 — 2026 KAYIT YILI`.
- H1 reads `Öğrenci / topluluklarının / atlası.` on three lines (the line breaks come from the `heroTitleLines` array).
- Curation note (right column on `lg+`, stacked below intro on smaller widths) has a terracotta left border and includes the latest `lastCheckedAt` formatted in Turkish locale.
- Table of contents shows five columns (`01..05`) with chapter titles and counts (3, 4, 5, 5, 2).
- Each TOC entry is a hash anchor — clicking it jumps the page to the corresponding `#chapter-...` section.
- Chapter `02 Konaklama` shows four entries; `Roma Ev/Oda` has its italic editorial note (`9 gruptan oluşan...`), `Apartments Bologna` and `Accomodations in Rome 2025/2026` are sparse rows without a blurb.
- Platform monograms are: `WA` (sage), `TG` (terracotta), `FB` (ink). No icons.
- Each row's right action reads `AÇ ↗` in terracotta letter-spaced uppercase.
- Footer block reads `Bilmediğimiz bir topluluk var mı?` with the `TOPLULUK ÖNER ↗` outlined button. Clicking it opens the system mail composer with subject `Yeni topluluk önerisi`.

- [ ] **Step 6.3: Toggle language and re-walk**

Click the `EN` pill in the top bar. Verify:

- All chrome flips to English: `Back to home`, `Student Communities · Atlas`, `ISSUE 01 — 2026 INTAKE YEAR`, `Contents`, `OPEN ↗`, `SUGGEST A COMMUNITY ↗`, etc.
- All five chapter titles and intros render in English.
- City summaries (e.g. `Rome · Bologna · Ravenna`) update.
- Date format flips to `en-US` locale.

- [ ] **Step 6.4: Mobile breakpoint walkthrough**

In DevTools, switch to a 375px-wide viewport.

- Hero stacks: H1 first, intro paragraph below, curation note below the intro.
- Table of contents collapses to a horizontal `overflow-x-auto snap-x` strip with fade-mask on both edges (the `.mask-fade-horizontal` utility).
- Each entry row stacks: name + meta on one line (meta may wrap below name if name is long), italic blurb (where present), then the `AÇ ↗` action.
- Footer CTA stretches to align with content; no horizontal scroll on any chapter.

- [ ] **Step 6.5: Click an external link**

Click one entry (e.g. `Padova Community`). Verify it opens the WhatsApp URL in a new tab.

- [ ] **Step 6.6: Confirm the Turkish shortcut still redirects**

Visit `http://localhost:3000/topluluklar`. Verify the browser lands on `/communities` (existing redirect, no change in this plan).

- [ ] **Step 6.7: Reduced motion check**

In macOS System Settings → Accessibility → Display, toggle `Reduce motion` on. Reload `/communities`. Verify the hero and chapter blocks appear without entry transitions (no fade-up). Toggle back when done.

- [ ] **Step 6.8: Stop the dev server**

`Ctrl-C` in the terminal that runs `npm run dev`.

---

## Task 7: Final smoke + commit hygiene

**Files:** none (validation only)

- [ ] **Step 7.1: Lint**

Run: `npm run lint`

Expected: zero errors. If `next/no-img-element`, `react/jsx-key`, or `react-hooks/exhaustive-deps` complains, fix in `CommunityAtlas.tsx` before continuing.

- [ ] **Step 7.2: Route matrix smoke**

Run: `npm run check:routes`

Expected: passes. Public/protected matrix is unchanged.

- [ ] **Step 7.3: Data integrity smoke**

Run: `npm run check:data`

Expected: passes (script validates university data only).

- [ ] **Step 7.4: Final build**

Run: `npm run build`

Expected: completes; `/communities` listed as a static (prerendered) route.

- [ ] **Step 7.5: Confirm git status is clean**

Run: `git status --short`

Expected: empty (everything committed in Task 5). If there are uncommitted polish changes from Tasks 6/7, commit them now:

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(communities): post-visual-walkthrough polish

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

(Skip this step if there are no changes.)

---

## Self-Review Summary

- **Spec coverage:** every section of the spec maps to at least one task — data model (T1+T2), translations (T3), component architecture (T4), wiring (T5), motion / a11y / responsive (built into T4 + verified in T6), smoke (T7). Out-of-scope items (sticky rail, search, per-entry voice debt) are explicitly absent from the plan.
- **No placeholders:** the `contact@italypath.com` mailto target is hardcoded; flagged in the spec's Open Questions. Chapter intros are landed verbatim from the spec drafts.
- **Type consistency:** `CommunityChapter` defined in T1 is imported and re-used in T2, T4. `CommunityChapterMeta` defined in T2 is imported in T4. Translation keys defined in T3 are referenced under their exact paths in T4.
- **Build greenness:** the only intermediate broken-build window is between Tasks 3 → 5; the commit lands at T5.5 covering all three changes atomically, so no commit on `main` is build-broken.
