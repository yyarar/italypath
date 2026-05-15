# Mentor Consultation Desks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-channel chatbot UI at `/ai-mentor` with a three-desk editorial consultation hub — ItalyPath AI (live), ItalyPath Gönüllü Ekip (coming soon, free/limited), ItalyPath Uzman (coming soon, paid).

**Architecture:** Single client route (`/ai-mentor`) toggles between two views via internal state — a hub roster and a per-channel chat room. Both views share scholarships/communities atlas tokens (paper background, serif headlines, terracotta numerals, border-divided rows). The AI channel reuses the existing `/api/chat` Gemini streaming backend untouched; the two locked channels render an editorial "yakında" state with a `mailto:` notify CTA — zero backend additions in v1. Per-channel message history persists within a browser session; explicit `Sıfırla` clears the active channel only.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, TypeScript strict, Framer Motion (animation), Clerk (existing route protection), `react-markdown` (existing), Lucide icons.

**Spec:** `docs/superpowers/specs/2026-05-15-mentor-consultation-desks-design.md`

---

## File Structure

| Path | Action | Responsibility |
| --- | --- | --- |
| `lib/mentor/channels.ts` | Create | `MentorChannelId` / `MentorChannelStatus` types, `MENTOR_CHANNELS` array (3 records), `getMentorChannel()` helper. Pure data. |
| `app/globals.css` | Modify | Append `@keyframes pulse-cursor` + `.animate-pulse-cursor` utility (with reduced-motion guard). Rewrite `.prose-chat code` styling to use editorial tokens (remove indigo, add subtle surface + border). |
| `lib/translations.ts` | Modify | Replace the `aiMentor` block in both TR and EN trees with the new hub + channels + chatRoom shape. Old keys removed; new keys added. |
| `components/mentor/MentorTopBar.tsx` | Create | Shared top bar; renders different content for `mode: 'hub'` vs `mode: 'chat'`. Back link, identity center, status badge + language toggle. |
| `components/mentor/MentorHub.tsx` | Create | Hub landing view. Renders eyebrow, H1, intro, then 3 channel rows. Receives `onSelectChannel`. |
| `components/mentor/MentorChatRoom.tsx` | Create | Chat shell. Renders top bar + conversation body (active or locked) + input strip. Owns input state and pair-rendering logic. |
| `components/mentor/EntryPair.tsx` | Create | Single Q+A unit. SORU NN label + sans-bold question + hairline + Markdown serif response + streaming cursor. |
| `components/mentor/StarterPrompts.tsx` | Create | Four-chip empty-state prompts for the AI channel. No Sparkles icon, no indigo. |
| `components/mentor/LockedDeskNotice.tsx` | Create | Centered editorial "yakında" card with monogram + headline + body + mailto notify CTA. |
| `app/ai-mentor/page.tsx` | Rewrite | Replace the 332-line monolith with a thin state container: active channel + messagesByChannel + isStreaming + abortRef + error map + the four handlers (`handleSelectChannel`, `handleBackToHub`, `handleReset`, `handleStop`, `handleSend`). Renders `MentorHub` or `MentorChatRoom` via `AnimatePresence`. |

Route, page metadata behavior, and Clerk boundary in `proxy.ts` are untouched.

---

## Task 1: Add the channel data module

**Files:**
- Create: `lib/mentor/channels.ts`

- [ ] **Step 1.1: Create the directory and write the file**

```bash
mkdir -p lib/mentor
```

Then create `lib/mentor/channels.ts` with this exact content:

```ts
export const MENTOR_CHANNEL_IDS = ["ai", "volunteer", "expert"] as const;
export type MentorChannelId = (typeof MENTOR_CHANNEL_IDS)[number];
export type MentorChannelStatus = "active" | "coming-soon";

export interface MentorChannel {
  id: MentorChannelId;
  order: number;        // 1..3, display order
  numberLabel: string;  // "01" / "02" / "03"
  monogram: string;     // "AI" / "GE" / "UZ"
  status: MentorChannelStatus;
}

export const MENTOR_CHANNELS: MentorChannel[] = [
  { id: "ai",        order: 1, numberLabel: "01", monogram: "AI", status: "active" },
  { id: "volunteer", order: 2, numberLabel: "02", monogram: "GE", status: "coming-soon" },
  { id: "expert",    order: 3, numberLabel: "03", monogram: "UZ", status: "coming-soon" },
];

export function getMentorChannel(id: MentorChannelId): MentorChannel {
  const channel = MENTOR_CHANNELS.find((c) => c.id === id);
  if (!channel) {
    throw new Error(`Unknown mentor channel: ${id}`);
  }
  return channel;
}
```

- [ ] **Step 1.2: Type-check**

Run: `npx tsc --noEmit`

Expected: clean (no output, exit 0). This module has no consumers yet — additive change.

- [ ] **Step 1.3: Commit**

```bash
git add lib/mentor/channels.ts
git commit -m "$(cat <<'EOF'
feat(mentor): add channel data module

Defines MentorChannelId union (ai, volunteer, expert),
MentorChannelStatus (active, coming-soon), MentorChannel interface,
the canonical MENTOR_CHANNELS array, and a getMentorChannel() helper
that throws on unknown ids. No UI consumers yet.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add the streaming-cursor keyframe and editorial markdown styling

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 2.1: Append the `pulse-cursor` keyframe and utility**

In `app/globals.css`, locate the existing `@keyframes shimmer` block (around line 51). Below the existing `@keyframes pulsating-button` block (around line 182), append the new keyframe inside the same Keyframes section:

```css
@keyframes pulse-cursor {

  0%,
  50% {
    opacity: 1;
  }

  50.01%,
  100% {
    opacity: 0;
  }
}
```

In the Utility Classes section (around line 325, after `.animate-pulsating-button`), append:

```css
.animate-pulse-cursor {
  animation: pulse-cursor 1s steps(2) infinite;
}
```

In the `@media (prefers-reduced-motion: reduce)` block (around line 402), add `.animate-pulse-cursor` to the list of selectors whose animation is cancelled:

```css
@media (prefers-reduced-motion: reduce) {
  .blob,
  .shimmer,
  .animate-fade-in-up,
  .border-beam-wrapper::before,
  .pulse-ring::before,
  .animate-marquee-x,
  .animate-marquee-y,
  .animate-soft-beam,
  .animate-border-beam,
  .animate-soft-fade-up,
  .animate-pulsating-button,
  .animate-pulse-cursor {
    animation: none !important;
  }
}
```

`.animate-pulse-cursor` stays opacity 1 in reduced motion because `animation: none` halts at the initial keyframe (opacity 1 for our `pulse-cursor` definition).

- [ ] **Step 2.2: Rewrite the `.prose-chat code` rule to editorial tokens**

In `app/globals.css`, find the `.prose-chat code` block (around line 437–443). Replace the entire block with:

```css
.prose-chat code {
  background: var(--editorial-surface);
  color: var(--editorial-ink);
  border: 1px solid rgba(216, 222, 217, 0.6);
  padding: 0.125rem 0.375rem;
  font-size: 0.85em;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

Leave the other `.prose-chat` rules (`p`, `ul`, `li`, `strong`) untouched.

- [ ] **Step 2.3: Verify**

Run: `npx tsc --noEmit`

Expected: clean. CSS changes don't affect TypeScript, but a sanity run confirms nothing else regressed.

- [ ] **Step 2.4: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
feat(globals): add pulse-cursor keyframe and editorial code styling

Adds @keyframes pulse-cursor + .animate-pulse-cursor utility for the
editorial-column streaming caret, with a prefers-reduced-motion guard.
Rewrites the .prose-chat code style to drop the indigo background in
favour of editorial-surface + border + ink, preparing the AI Mentor
redesign.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Atomic batch — translations + 6 components + page rewrite

This task replaces the entire AI Mentor surface. It must be committed atomically because the translation rewrite removes keys still used by the current `app/ai-mentor/page.tsx`. Build is broken between the first edit and the last; the single commit at the end is the build-green checkpoint.

**Files:**
- Modify: `lib/translations.ts` (TR `aiMentor` block ~lines 296–312, EN `aiMentor` block ~lines 608–624)
- Create: `components/mentor/MentorTopBar.tsx`
- Create: `components/mentor/MentorHub.tsx`
- Create: `components/mentor/MentorChatRoom.tsx`
- Create: `components/mentor/EntryPair.tsx`
- Create: `components/mentor/StarterPrompts.tsx`
- Create: `components/mentor/LockedDeskNotice.tsx`
- Rewrite: `app/ai-mentor/page.tsx` (full body replacement)

### Step 3.1: Rewrite the TR `aiMentor` block

In `lib/translations.ts`, find the `aiMentor: { … }` sub-object under the `tr:` tree (currently at lines ~296–312). Replace its entire body with this exact content (keep the `aiMentor: {` opening and the closing `},`):

```ts
    aiMentor: {
      backHome: "Ana sayfaya dön",
      backToHub: "Masalar",
      pageIdentity: "Danışma Masaları",
      hubEyebrow: "DANIŞMA · ÜÇ MASA",
      hubTitle: "Hangi masaya yazmak istersin?",
      hubIntro:
        "Üç farklı kanaldan İtalya yolculuğu hakkında danışabilirsin: hızlı bir cevap için yapay zekâ; aynı yoldan geçmiş öğrenciler için gönüllü ekip; derin bir konu için uzman.",
      hubActiveBadge: "AKTİF · ANINDA",
      hubLockedBadgeFree: "YAKINDA · ÜCRETSİZ",
      hubLockedBadgePaid: "YAKINDA · ÜCRETLİ",
      hubOpenCta: "SOHBETE BAŞLA",
      hubLockedCta: "YAKINDA",
      statusReady: "HAZIR",
      statusWriting: "YAZIYOR…",
      statusLocked: "YAKINDA",
      statusError: "HATA",
      inputPlaceholder: "Bir soru daha…",
      inputPlaceholderStreaming: "Mentor yanıt yazıyor…",
      inputPlaceholderLocked: "Bu masada şu an mesaj alınmıyor.",
      questionLabel: "SORU",
      startHereLabel: "BURADAN BAŞLA",
      resetLabel: "SIFIRLA",
      sendAria: "Mesaj gönder",
      stopAria: "Yanıtı durdur",
      error: "Scusa! Bir hata oluştu. Tekrar dener misin?",
      lockedHeadline: "Bu masa yakında açılıyor.",
      notifyCta: "AÇILDIĞINDA HABER ET",
      notifyMailSubject: "Danışma masası açılış bildirimi",
      prompts: {
        prompt1: "İtalya'da en uygun harç ücretli üniversiteler hangileri?",
        prompt2: "Milano'da İngilizce mühendislik bölümleri var mı?",
        prompt3: "ISEE değerim düşükse ne kadar burs alabilirim?",
        prompt4: "Başvuru için hangi belgeler gerekiyor?",
      },
      channels: {
        ai: {
          name: "ItalyPath AI",
          tagline:
            "64 üniversitenin ve 240 bölümün veritabanına bağlı yapay zekâ. İlk eşikte hızlı oryantasyon için.",
          meta: "Anında · 7/24 · Ücretsiz",
          lockedBody: "",
        },
        volunteer: {
          name: "ItalyPath Gönüllü Ekip",
          tagline:
            "Aynı yoldan geçmiş, halen İtalya'da yaşayan öğrenciler. Pratik soruna pratik yanıt — birkaç saatte bir cevap.",
          meta: "Birkaç saat içinde · Hafta içi · Ücretsiz / sınırlı",
          lockedBody:
            "Yakında: aynı yoldan geçmiş öğrencilerden bire-bir, gerçek deneyime dayalı yanıtlar.",
        },
        expert: {
          name: "ItalyPath Uzman",
          tagline:
            "Vize itirazı, ISEE doğrulaması, transkript denkliği gibi konularda derin danışmanlık. Randevulu, ücretli.",
          meta: "Randevulu · Ücretli paket",
          lockedBody:
            "Yakında: vize itirazı, ISEE doğrulaması ve transkript denkliği gibi konularda derin danışmanlık.",
        },
      },
    },
```

### Step 3.2: Rewrite the EN `aiMentor` block

Find the `aiMentor: { … }` sub-object under the `en:` tree (currently at lines ~608–624). Replace its entire body with:

```ts
    aiMentor: {
      backHome: "Back to home",
      backToHub: "Desks",
      pageIdentity: "Consultation Desks",
      hubEyebrow: "CONSULTATION · THREE DESKS",
      hubTitle: "Which desk will you write to?",
      hubIntro:
        "Three channels for your Italy journey: an AI for a fast first answer, a volunteer team of students who've walked the same path, and an expert for deep one-on-one consultations.",
      hubActiveBadge: "ACTIVE · INSTANT",
      hubLockedBadgeFree: "SOON · FREE",
      hubLockedBadgePaid: "SOON · PAID",
      hubOpenCta: "START A CHAT",
      hubLockedCta: "SOON",
      statusReady: "READY",
      statusWriting: "WRITING…",
      statusLocked: "SOON",
      statusError: "ERROR",
      inputPlaceholder: "Another question…",
      inputPlaceholderStreaming: "The mentor is replying…",
      inputPlaceholderLocked: "This desk isn't accepting messages yet.",
      questionLabel: "QUESTION",
      startHereLabel: "START HERE",
      resetLabel: "RESET",
      sendAria: "Send message",
      stopAria: "Stop response",
      error: "Scusa! Something went wrong. Could you try again?",
      lockedHeadline: "This desk is opening soon.",
      notifyCta: "NOTIFY ME WHEN OPEN",
      notifyMailSubject: "Consultation desk opening notification",
      prompts: {
        prompt1: "Which Italian universities have the most affordable tuition?",
        prompt2: "Are there English-taught engineering programs in Milan?",
        prompt3: "How much scholarship can I get with a low ISEE?",
        prompt4: "Which documents do I need for the application?",
      },
      channels: {
        ai: {
          name: "ItalyPath AI",
          tagline:
            "AI connected to a database of 64 universities and 240 programs. For fast orientation on the first step.",
          meta: "Instant · 24/7 · Free",
          lockedBody: "",
        },
        volunteer: {
          name: "ItalyPath Volunteer Team",
          tagline:
            "Students who've walked the same path and live in Italy now. Practical answers to practical questions — usually within a few hours.",
          meta: "Within a few hours · Weekdays · Free / limited",
          lockedBody:
            "Coming soon: one-on-one answers from students with first-hand experience of the same journey.",
        },
        expert: {
          name: "ItalyPath Expert",
          tagline:
            "Deep consulting on visa appeals, ISEE verification, transcript equivalency. By appointment, paid.",
          meta: "By appointment · Paid package",
          lockedBody:
            "Coming soon: deep consulting on visa appeals, ISEE verification, and transcript equivalency.",
        },
      },
    },
```

Do not touch any other top-level block (`navbar`, `bottomNav`, `hub`, `favorites`, `documents`, `scholarships`, `communities`, etc.).

### Step 3.3: Create `components/mentor/MentorTopBar.tsx`

```bash
mkdir -p components/mentor
```

Write the file with this exact content:

```tsx
"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Globe } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorChannel } from "@/lib/mentor/channels";

type MentorTopBarProps =
  | { mode: "hub" }
  | {
      mode: "chat";
      channel: MentorChannel;
      statusLabel: string;
      statusKey: "idle" | "streaming" | "error" | "locked";
      onBackToHub: () => void;
    };

export default function MentorTopBar(props: MentorTopBarProps) {
  const { t, language, toggleLanguage } = useLanguage();

  const languageButton = (
    <button
      onClick={toggleLanguage}
      aria-label={language === "tr" ? "Switch to English" : "Türkçeye geç"}
      className="inline-flex items-center gap-2 rounded-md border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-2 text-xs font-bold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
    >
      <Globe className="h-3.5 w-3.5" />
      {language === "tr" ? "EN" : "TR"}
    </button>
  );

  if (props.mode === "hub") {
    return (
      <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-border)] pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.aiMentor.backHome}
        </Link>

        <div className="hidden text-sm font-semibold text-[var(--editorial-ink)] sm:block">
          {t.aiMentor.pageIdentity}
        </div>

        {languageButton}
      </header>
    );
  }

  const { channel, statusLabel, statusKey, onBackToHub } = props;
  const channelName = t.aiMentor.channels[channel.id].name;
  const statusColor =
    statusKey === "streaming"
      ? "text-[var(--editorial-sage)]"
      : statusKey === "error"
        ? "text-[var(--editorial-terracotta)]"
        : "text-[var(--editorial-muted)]";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-border)] pb-4">
      <button
        onClick={onBackToHub}
        aria-label={t.aiMentor.backToHub}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.aiMentor.backToHub}
      </button>

      <div className="hidden items-baseline gap-2 sm:flex">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
          {channel.numberLabel}
        </span>
        <span className="text-sm font-semibold text-[var(--editorial-ink)]">
          {channelName}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={statusKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`text-[10px] font-bold uppercase tracking-[0.14em] ${statusColor}`}
          >
            {statusLabel}
          </motion.span>
        </AnimatePresence>

        {languageButton}
      </div>
    </header>
  );
}
```

### Step 3.4: Create `components/mentor/MentorHub.tsx`

```tsx
"use client";

import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import {
  MENTOR_CHANNELS,
  type MentorChannelId,
} from "@/lib/mentor/channels";

import MentorTopBar from "./MentorTopBar";

export default function MentorHub({
  onSelectChannel,
}: {
  onSelectChannel: (id: MentorChannelId) => void;
}) {
  const { t } = useLanguage();

  return (
    <main className="min-h-[100dvh] bg-[var(--editorial-paper)]">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6">
        <MentorTopBar mode="hub" />

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 110, damping: 22, delay: 0.05 }}
          className="mt-12"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
            {t.aiMentor.hubEyebrow}
          </p>
          <h1 className="mt-5 font-serif text-4xl font-normal leading-[0.98] tracking-[-0.025em] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl">
            {t.aiMentor.hubTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--editorial-muted)] sm:text-lg">
            {t.aiMentor.hubIntro}
          </p>
        </motion.section>

        <motion.ol
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.08, delayChildren: 0.15 },
            },
          }}
          className="mt-10 list-none border-t border-[var(--editorial-border)]"
        >
          {MENTOR_CHANNELS.map((channel) => {
            const copy = t.aiMentor.channels[channel.id];
            const isActive = channel.status === "active";
            const badgeText = isActive
              ? t.aiMentor.hubActiveBadge
              : channel.id === "volunteer"
                ? t.aiMentor.hubLockedBadgeFree
                : t.aiMentor.hubLockedBadgePaid;
            const badgeColor = isActive
              ? "text-[var(--editorial-sage)]"
              : "text-[var(--editorial-muted)]";

            return (
              <motion.li
                key={channel.id}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { type: "spring", stiffness: 110, damping: 22 },
                  },
                }}
                className="border-b border-[var(--editorial-border)]"
              >
                <button
                  type="button"
                  onClick={() => onSelectChannel(channel.id)}
                  aria-label={`${copy.name}, ${badgeText}`}
                  className="grid w-full grid-cols-[40px_minmax(0,1fr)_auto] gap-x-5 gap-y-2 py-6 text-left transition-colors duration-200 ease-out hover:bg-[#f6f0e7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:scale-[0.995] sm:gap-x-6"
                >
                  <span className="pt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
                    {channel.numberLabel}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h2 className="font-serif text-2xl font-normal tracking-[-0.018em] text-[var(--editorial-ink)] sm:text-3xl">
                        {copy.name}
                      </h2>
                      <span
                        className={`whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] ${badgeColor}`}
                      >
                        {badgeText}
                      </span>
                    </div>
                    <p className="mt-2 max-w-2xl font-serif text-sm italic leading-relaxed text-[var(--editorial-muted)] sm:text-base">
                      {copy.tagline}
                    </p>
                    <p className="mt-2 text-[10px] tracking-wide text-[var(--editorial-muted)]">
                      {copy.meta}
                    </p>
                  </div>

                  <span
                    className={`self-start whitespace-nowrap pt-2 text-[11px] font-bold uppercase tracking-[0.12em] ${
                      isActive
                        ? "text-[var(--editorial-terracotta)]"
                        : "border border-[var(--editorial-border)] px-3 py-1.5 text-[var(--editorial-muted)]"
                    }`}
                  >
                    {isActive
                      ? `${t.aiMentor.hubOpenCta} ↗`
                      : t.aiMentor.hubLockedCta}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </main>
  );
}
```

### Step 3.5: Create `components/mentor/EntryPair.tsx`

```tsx
"use client";

import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

export default function EntryPair({
  questionNumber,
  question,
  responseText,
  isStreamingResponse,
}: {
  questionNumber: number;
  question: string;
  responseText: string;
  isStreamingResponse: boolean;
}) {
  const { t } = useLanguage();
  const numberLabel = String(questionNumber).padStart(2, "0");
  const questionId = `mentor-question-${numberLabel}`;
  const hasContent = responseText.length > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      aria-labelledby={questionId}
      className="mt-10 first:mt-0"
    >
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
          {t.aiMentor.questionLabel} {numberLabel}
        </div>
        <p
          id={questionId}
          className="mt-1 max-w-2xl text-base font-semibold leading-snug tracking-[-0.003em] text-[var(--editorial-ink)] sm:text-lg"
        >
          {question}
        </p>
      </div>

      <div className="mt-4 border-t border-[var(--editorial-border)] pt-4">
        {hasContent ? (
          <div className="prose-chat max-w-2xl font-serif text-base leading-relaxed text-[var(--editorial-ink)] sm:text-lg">
            <ReactMarkdown>{responseText}</ReactMarkdown>
            {isStreamingResponse ? (
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-[1em] w-[7px] animate-pulse-cursor bg-[var(--editorial-ink)] align-text-bottom"
              />
            ) : null}
          </div>
        ) : (
          <span
            aria-hidden="true"
            className="inline-block h-[1em] w-[7px] animate-pulse-cursor bg-[var(--editorial-ink)] align-text-bottom"
          />
        )}
      </div>
    </motion.article>
  );
}
```

### Step 3.6: Create `components/mentor/StarterPrompts.tsx`

```tsx
"use client";

import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

const PROMPT_KEYS = ["prompt1", "prompt2", "prompt3", "prompt4"] as const;

export default function StarterPrompts({
  onPick,
}: {
  onPick: (text: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
        {t.aiMentor.startHereLabel}
      </p>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.06, delayChildren: 0.1 },
          },
        }}
        className="mt-3 grid gap-2 sm:grid-cols-2"
      >
        {PROMPT_KEYS.map((key) => (
          <motion.button
            key={key}
            type="button"
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: {
                opacity: 1,
                y: 0,
                transition: { type: "spring", stiffness: 120, damping: 22 },
              },
            }}
            onClick={() => onPick(t.aiMentor.prompts[key])}
            className="border border-[var(--editorial-border)] bg-transparent px-3 py-2.5 text-left text-sm text-[var(--editorial-ink)] transition-colors duration-200 ease-out hover:bg-[#f6f0e7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:scale-[0.99]"
          >
            {t.aiMentor.prompts[key]}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
```

### Step 3.7: Create `components/mentor/LockedDeskNotice.tsx`

```tsx
"use client";

import { ExternalLink } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorChannel } from "@/lib/mentor/channels";

const NOTIFY_MAIL = "contact@italypath.com";

export default function LockedDeskNotice({
  channel,
}: {
  channel: MentorChannel;
}) {
  const { t } = useLanguage();
  const copy = t.aiMentor.channels[channel.id];
  const subject = encodeURIComponent(
    `${t.aiMentor.notifyMailSubject}: ${copy.name}`,
  );
  const mailHref = `mailto:${NOTIFY_MAIL}?subject=${subject}`;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
        <span className="font-serif text-3xl italic text-[var(--editorial-terracotta)]">
          {channel.monogram}
        </span>
      </div>

      <h2 className="mt-6 font-serif text-2xl font-normal leading-tight tracking-[-0.022em] text-[var(--editorial-ink)] sm:text-3xl">
        {t.aiMentor.lockedHeadline}
      </h2>

      <p className="mt-4 max-w-sm font-serif text-sm italic leading-relaxed text-[var(--editorial-muted)]">
        {copy.lockedBody}
      </p>

      <a
        href={mailHref}
        className="mt-8 inline-flex items-center gap-2 border border-[var(--editorial-terracotta)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)] transition-colors duration-200 ease-out hover:bg-[var(--editorial-terracotta)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)]"
      >
        {t.aiMentor.notifyCta}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
```

### Step 3.8: Create `components/mentor/MentorChatRoom.tsx`

```tsx
"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Square } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { MentorChannel } from "@/lib/mentor/channels";

import EntryPair from "./EntryPair";
import LockedDeskNotice from "./LockedDeskNotice";
import MentorTopBar from "./MentorTopBar";
import StarterPrompts from "./StarterPrompts";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface EntryPairData {
  questionNumber: number;
  question: string;
  response: string;
  isStreamingResponse: boolean;
}

function buildEntryPairs(messages: ChatMessage[], isStreaming: boolean): EntryPairData[] {
  const pairs: EntryPairData[] = [];
  let questionCounter = 0;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role !== "user") continue;
    questionCounter += 1;
    const next = messages[i + 1];
    const hasAssistant = Boolean(next && next.role === "assistant");
    const response = hasAssistant ? next.content : "";
    const isLastAssistant = hasAssistant && i + 1 === messages.length - 1;
    pairs.push({
      questionNumber: questionCounter,
      question: message.content,
      response,
      isStreamingResponse: isLastAssistant && isStreaming,
    });
  }
  return pairs;
}

export default function MentorChatRoom({
  channel,
  messages,
  isStreaming,
  hasError,
  onSend,
  onStop,
  onReset,
  onBackToHub,
}: {
  channel: MentorChannel;
  messages: ChatMessage[];
  isStreaming: boolean;
  hasError: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  onBackToHub: () => void;
}) {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const isLocked = channel.status === "coming-soon";

  useEffect(() => {
    if (isLocked) return;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    const isNewBubble = lastMessageIdRef.current !== lastMessage.id;
    lastMessageIdRef.current = lastMessage.id;
    scrollRef.current?.scrollIntoView({
      behavior: isStreaming || !isNewBubble ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isStreaming, isLocked]);

  const statusKey: "idle" | "streaming" | "error" | "locked" = isLocked
    ? "locked"
    : isStreaming
      ? "streaming"
      : hasError
        ? "error"
        : "idle";
  const statusLabel =
    statusKey === "locked"
      ? t.aiMentor.statusLocked
      : statusKey === "streaming"
        ? t.aiMentor.statusWriting
        : statusKey === "error"
          ? t.aiMentor.statusError
          : t.aiMentor.statusReady;

  const pairs = useMemo(
    () => (isLocked ? [] : buildEntryPairs(messages, isStreaming)),
    [messages, isStreaming, isLocked],
  );

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const showStarterPrompts =
    !isLocked && messages.length === 0 && !isStreaming;
  const showReset = !isLocked && userMessageCount > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming || isLocked) return;
    onSend(trimmed);
    setInput("");
  };

  const handlePickPrompt = (text: string) => {
    if (isStreaming || isLocked) return;
    onSend(text);
  };

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[var(--editorial-paper)]">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
        <MentorTopBar
          mode="chat"
          channel={channel}
          statusKey={statusKey}
          statusLabel={statusLabel}
          onBackToHub={onBackToHub}
        />
      </div>

      <section
        aria-live="polite"
        aria-atomic="false"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-6"
      >
        {isLocked ? (
          <LockedDeskNotice channel={channel} />
        ) : (
          <>
            {showReset ? (
              <div className="mb-6 flex justify-end">
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)] transition-colors duration-200 ease-out hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
                >
                  {t.aiMentor.resetLabel}
                </button>
              </div>
            ) : null}

            {pairs.map((pair) => (
              <EntryPair
                key={`pair-${pair.questionNumber}`}
                questionNumber={pair.questionNumber}
                question={pair.question}
                responseText={pair.response}
                isStreamingResponse={pair.isStreamingResponse}
              />
            ))}

            <AnimatePresence>
              {showStarterPrompts ? (
                <motion.div
                  key="starter"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.25, type: "spring", stiffness: 100, damping: 20 }}
                >
                  <StarterPrompts onPick={handlePickPrompt} />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div ref={scrollRef} className="h-2 shrink-0" />
          </>
        )}
      </section>

      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming || isLocked}
            placeholder={
              isLocked
                ? t.aiMentor.inputPlaceholderLocked
                : isStreaming
                  ? t.aiMentor.inputPlaceholderStreaming
                  : t.aiMentor.inputPlaceholder
            }
            aria-label={t.aiMentor.inputPlaceholder}
            autoComplete="off"
            className="flex-1 bg-transparent font-serif text-base italic text-[var(--editorial-ink)] placeholder:font-serif placeholder:italic placeholder:text-[var(--editorial-muted)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />

          <AnimatePresence mode="wait" initial={false}>
            {isStreaming ? (
              <motion.button
                key="stop"
                type="button"
                onClick={onStop}
                aria-label={t.aiMentor.stopAria}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="grid h-9 w-9 place-items-center bg-[var(--editorial-terracotta)] text-white transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                <Square className="h-3 w-3" />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                type="submit"
                disabled={!input.trim() || isLocked}
                aria-label={t.aiMentor.sendAria}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="grid h-9 w-9 place-items-center bg-[var(--editorial-ink)] text-[var(--editorial-paper)] transition-transform duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </form>
    </main>
  );
}
```

### Step 3.9: Rewrite `app/ai-mentor/page.tsx`

Open `app/ai-mentor/page.tsx`. Replace the **entire file** with:

```tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import {
  getMentorChannel,
  type MentorChannelId,
} from "@/lib/mentor/channels";

import MentorChatRoom, {
  type ChatMessage,
} from "@/components/mentor/MentorChatRoom";
import MentorHub from "@/components/mentor/MentorHub";

type MessagesByChannel = Record<MentorChannelId, ChatMessage[]>;
type ErrorByChannel = Record<MentorChannelId, boolean>;

const EMPTY_MESSAGES: MessagesByChannel = {
  ai: [],
  volunteer: [],
  expert: [],
};

const EMPTY_ERRORS: ErrorByChannel = {
  ai: false,
  volunteer: false,
  expert: false,
};

const VIEW_TRANSITION = {
  duration: 0.22,
  ease: [0.32, 0.72, 0, 1] as const,
};

export default function AIMentorPage() {
  const { t } = useLanguage();
  const [activeChannelId, setActiveChannelId] = useState<MentorChannelId | null>(
    null,
  );
  const [messagesByChannel, setMessagesByChannel] =
    useState<MessagesByChannel>(EMPTY_MESSAGES);
  const [errorByChannel, setErrorByChannel] =
    useState<ErrorByChannel>(EMPTY_ERRORS);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abortInflightStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const handleSelectChannel = useCallback(
    (id: MentorChannelId) => {
      abortInflightStream();
      setIsStreaming(false);
      setActiveChannelId(id);
    },
    [abortInflightStream],
  );

  const handleBackToHub = useCallback(() => {
    abortInflightStream();
    setIsStreaming(false);
    setActiveChannelId(null);
  }, [abortInflightStream]);

  const handleStop = useCallback(() => {
    abortInflightStream();
  }, [abortInflightStream]);

  const handleReset = useCallback(() => {
    if (!activeChannelId) return;
    abortInflightStream();
    setIsStreaming(false);
    setMessagesByChannel((prev) => ({ ...prev, [activeChannelId]: [] }));
    setErrorByChannel((prev) => ({ ...prev, [activeChannelId]: false }));
  }, [abortInflightStream, activeChannelId]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!activeChannelId || activeChannelId !== "ai") return;
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const channelId: MentorChannelId = activeChannelId;
      const userMessage: ChatMessage = {
        id: `${Date.now()}-u`,
        role: "user",
        content: trimmed,
      };
      const assistantId = `${Date.now()}-a`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      const priorMessages = messagesByChannel[channelId];

      setMessagesByChannel((prev) => ({
        ...prev,
        [channelId]: [...prev[channelId], userMessage, assistantPlaceholder],
      }));
      setErrorByChannel((prev) => ({ ...prev, [channelId]: false }));
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const requestMessages = [
        ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: userMessage.role, content: userMessage.content },
      ];

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: requestMessages }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errorMessage = t.aiMentor.error;
          try {
            const data = (await res.json()) as { error?: string };
            if (data.error) errorMessage = data.error;
          } catch {
            /* ignore */
          }
          throw new Error(errorMessage);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error(t.aiMentor.error);
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessagesByChannel((prev) => ({
            ...prev,
            [channelId]: prev[channelId].map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          }));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // user-initiated abort — keep partial content
        } else {
          const message = err instanceof Error ? err.message : t.aiMentor.error;
          setMessagesByChannel((prev) => ({
            ...prev,
            [channelId]: prev[channelId].map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || message }
                : m,
            ),
          }));
          setErrorByChannel((prev) => ({ ...prev, [channelId]: true }));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activeChannelId, isStreaming, messagesByChannel, t.aiMentor.error],
  );

  const activeChannel = activeChannelId
    ? getMentorChannel(activeChannelId)
    : null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {activeChannel ? (
        <motion.div
          key={`chat-${activeChannel.id}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={VIEW_TRANSITION}
        >
          <MentorChatRoom
            channel={activeChannel}
            messages={messagesByChannel[activeChannel.id]}
            isStreaming={isStreaming}
            hasError={errorByChannel[activeChannel.id]}
            onSend={handleSend}
            onStop={handleStop}
            onReset={handleReset}
            onBackToHub={handleBackToHub}
          />
        </motion.div>
      ) : (
        <motion.div
          key="hub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={VIEW_TRANSITION}
        >
          <MentorHub onSelectChannel={handleSelectChannel} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Step 3.10: Type-check

Run: `npx tsc --noEmit`

Expected: clean (exit 0, no output).

If errors appear:
- A "Property does not exist on type" error on `t.aiMentor.*` usually means a translation key was misspelled. Cross-check against the TR/EN blocks from Steps 3.1 and 3.2.
- A "Type 'MentorChannelId' is not assignable to ..." error on the `messagesByChannel` indexing means a key in `EMPTY_MESSAGES` is missing — confirm all three channel ids are present.

### Step 3.11: Production build

Run: `npm run build`

Expected: build succeeds. `/ai-mentor` should appear in the route table (it remains client-only and protected; depending on Next 16's handling of protected client routes it will show as `ƒ` or `○` — both are acceptable).

### Step 3.12: Atomic commit

```bash
git add lib/translations.ts \
        components/mentor/MentorTopBar.tsx \
        components/mentor/MentorHub.tsx \
        components/mentor/MentorChatRoom.tsx \
        components/mentor/EntryPair.tsx \
        components/mentor/StarterPrompts.tsx \
        components/mentor/LockedDeskNotice.tsx \
        app/ai-mentor/page.tsx
git commit -m "$(cat <<'EOF'
feat(mentor): replace chatbot UI with three-desk consultation hub

Drops the indigo/blue SaaS chat clone at /ai-mentor in favor of an
editorial consultation hub:
  - Hub view rosters three desks: ItalyPath AI (live), ItalyPath
    Volunteer Team (coming soon, free), ItalyPath Expert (coming soon,
    paid).
  - Chat room renders an editorial-column flow — terracotta "SORU NN"
    micro-labels, sans-bold questions, hairline ayraç, serif Markdown
    responses with an ink streaming cursor. No bubbles, no avatars,
    no sparkles.
  - Locked desks reuse the same shell with a centered "yakında" notice
    (editorial monogram + serif headline + mailto notify CTA).
  - Per-channel message history persists within a session; Sıfırla
    clears only the active desk.
  - Existing /api/chat Gemini streaming + AbortController behaviour
    preserved without changes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Smoke verification

**Files:** none (validation only).

- [ ] **Step 4.1: Lint**

Run: `npm run lint`

Expected: exit 0, no errors. If a `react-hooks/exhaustive-deps` warning appears on `handleSend` (it captures `messagesByChannel`), confirm that the dependency array does include `messagesByChannel`. If a `next/no-img-element` or similar non-applicable rule fires, do NOT silence it — re-check the diff.

- [ ] **Step 4.2: Route matrix smoke**

Run: `npm run check:routes`

Expected: pass. `/ai-mentor` stays protected (no addition to the public-routes list in `proxy.ts`). No public/protected re-classification occurred.

- [ ] **Step 4.3: Data integrity smoke**

Run: `npm run check:data`

Expected: pass. The script validates the university dataset only.

- [ ] **Step 4.4: Production build**

Run: `npm run build`

Expected: completes with no errors. `/ai-mentor` route present.

- [ ] **Step 4.5: Confirm git state**

Run: `git status --short`

Expected: empty. All changes committed in Tasks 1, 2, and 3.

If anything is uncommitted (e.g. a stray formatter touch), commit it now:

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(mentor): post-smoke polish

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

(Skip if there are no changes.)

---

## Task 5: Manual dev-server visual verification (user)

**Files:** none.

This task is intentionally human-driven. A subagent can run `npm run dev` and curl the page, but it cannot eyeball typography or feel the motion. Hand this off to the user once Task 4 passes.

- [ ] **Step 5.1: Start the dev server**

Run: `npm run dev`. Wait for the `Ready in …` line. Open `http://localhost:3000/ai-mentor` while signed in (or sign in and let the redirect deliver you).

- [ ] **Step 5.2: Hub view walkthrough (TR)**

- The page title reads `Danışma Masaları` in the center of the top bar.
- Hero shows the eyebrow `DANIŞMA · ÜÇ MASA`, the H1 `Hangi masaya yazmak istersin?`, and the intro paragraph.
- Three rows render in order: `01 ItalyPath AI` (sage `AKTİF · ANINDA`), `02 ItalyPath Gönüllü Ekip` (muted `YAKINDA · ÜCRETSİZ`, outlined `YAKINDA` pill), `03 ItalyPath Uzman` (muted `YAKINDA · ÜCRETLİ`, outlined `YAKINDA` pill).
- Hover on any row tints the background `#f6f0e7`. Focus ring is sage.

- [ ] **Step 5.3: AI channel walkthrough**

- Click `01 ItalyPath AI`. View transitions smoothly into the chat room. Top bar shows `← Masalar · 01 ItalyPath AI · HAZIR`.
- The empty state shows `BURADAN BAŞLA` label + four starter prompt chips (two columns on `sm+`).
- Click one chip. It immediately becomes `SORU 01`, the hairline appears, and the serif response streams in with a blinking ink cursor at the end. Status badge flips to `YAZIYOR…`.
- During streaming, the send button is replaced by a terracotta stop button (Square icon). Click it — stream aborts mid-stream and the cursor disappears.
- Type another question and press Enter. `SORU 02` renders.
- A `SIFIRLA` text link appears in the top-right of the conversation area. Click it. History clears, counter resets to 1, starter prompts return.

- [ ] **Step 5.4: Language toggle**

- Click the `EN` pill in the top bar. All chrome flips: `Back to home` / `Desks` / `Consultation Desks` / `WRITING…` / `START HERE` / `OPEN ↗` / `SUGGEST A COMMUNITY → NOTIFY ME WHEN OPEN`, etc.
- Channel taglines and meta lines are English.

- [ ] **Step 5.5: Locked channel walkthrough**

- Return to hub via `← Masalar`. Click `02 ItalyPath Gönüllü Ekip` (or `03 ItalyPath Uzman`).
- Chat room renders with status `YAKINDA`. The conversation area shows the centered editorial monogram (`GE` / `UZ` in terracotta italic serif), the `Bu masa yakında açılıyor.` headline, the italic serif body, and the outlined `AÇILDIĞINDA HABER ET ↗` button.
- Click the notify CTA. The OS mail composer opens with subject `Danışma masası açılış bildirimi: ItalyPath Gönüllü Ekip` (or `… Uzman`).
- The input strip at the bottom is visible but disabled; placeholder reads `Bu masada şu an mesaj alınmıyor.`

- [ ] **Step 5.6: Per-channel persistence**

- Back to hub. Click `01 ItalyPath AI`. Ask one question and let it complete.
- Without resetting, back to hub. Click `02 Gönüllü Ekip` (loads locked notice).
- Back to hub. Click `01 ItalyPath AI` again — the prior `SORU 01` + response is still visible. Switching desks did not clear AI history.

- [ ] **Step 5.7: Mobile breakpoint**

- DevTools: switch to a 375px-wide viewport.
- Hub rows: numeral, name, status, tagline, meta, and CTA stack legibly. Tap target ≥48px tall.
- Chat room: top bar identity hides on `<sm` (only back arrow + status + language toggle render). Conversation body uses `px-4`. Input strip sticky at bottom. Send/Stop button stays accessible.
- Starter prompts collapse to a single column.

- [ ] **Step 5.8: Reduced motion**

- System Settings → Accessibility → Display → enable `Reduce motion`.
- Reload `/ai-mentor`. The hero entrance + row stagger should be effectively instant. The streaming cursor should not blink (stays a solid block).
- Disable Reduce motion when done.

- [ ] **Step 5.9: Stop the dev server**

`Ctrl-C` in the dev-server terminal.

---

## Self-Review Summary

- **Spec coverage:** every section of the spec maps to a task or step.
  - Goal / Visual Direction → Tasks 2 + 3 implement the editorial tokens and the editorial-column structure.
  - Information Architecture (hub view + chat view + state vocabulary) → Steps 3.3 (`MentorTopBar`), 3.4 (`MentorHub`), 3.8 (`MentorChatRoom`).
  - Channel Data Model → Task 1.
  - Component Architecture → Steps 3.3–3.8 (the six new files).
  - Streaming Behavior (Preserved) → Step 3.9 (`page.tsx`) reuses the existing `/api/chat` route + `AbortController` pattern; per-channel persistence implemented via `messagesByChannel` map.
  - Translations → Steps 3.1 and 3.2.
  - Tokens & Typography → Step 2 (pulse-cursor keyframe + prose-chat editorial styling) plus inline classes throughout Steps 3.3–3.9.
  - Motion & Accessibility → Steps 3.3–3.9; aria-live, aria-labelledby, focus rings, reduced-motion handling all present.
  - Responsive Behavior → Inline at every component with `sm:` / `lg:` breakpoints.
  - Smoke Verification → Task 4.
  - Manual Visual Verification → Task 5.
- **No placeholders:** all code blocks contain full, runnable code. Open spec questions (mailto address, prompt content polish, welcome-message removal, reset-button placement, notify-CTA backend) are flagged in the spec, not the plan.
- **Type consistency:** `MentorChannel`, `MentorChannelId`, `MentorChannelStatus` defined in Task 1 are imported consistently in Tasks 3.3–3.9. `ChatMessage` is defined in Step 3.8 (`MentorChatRoom.tsx`) and re-exported by name; Step 3.9 imports it from there. Translation key paths (`t.aiMentor.channels.<id>.name` etc.) match across Steps 3.1, 3.2, 3.3, 3.4, 3.7.
- **Atomic commit safety:** Tasks 1 and 2 leave the build green on their own. Task 3 is the only destructive window — between the first edit and Step 3.12 the build is broken, but no intermediate commit lands on `main`. The Step 3.10 + 3.11 verification gates ensure the atomic commit at Step 3.12 is build-green.
