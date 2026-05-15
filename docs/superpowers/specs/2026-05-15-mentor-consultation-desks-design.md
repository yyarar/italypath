# AI Mentor → Consultation Desks Redesign

Date: 2026-05-15
Status: Awaiting user review

## Goal

Redesign `/ai-mentor` from a generic ChatGPT-clone into a **three-desk editorial consultation hub**. The page is reframed: it is no longer "AI Mentor" the chatbot — it is "Danışma Masaları" / "Consultation Desks", where the visitor picks one of three channels and writes to that desk.

The current implementation is a single-screen chat with an indigo/blue/rose SaaS palette, Italian-flag gradient avatar, ✨ sparkle chips, gradient bubble messages, and an "Online" status pulse — every AI-cliché stacked on a slate background that conflicts with the project's editorial brand. This redesign:

- Replaces the bot-persona chat with an editorial Q&A column (no avatars, no bubbles, no sparkles).
- Adds a hub view that presents three channels: **ItalyPath AI** (live), **ItalyPath Gönüllü Ekip** (coming soon, free with limits), **ItalyPath Uzman** (coming soon, paid).
- Routes all three channels through the same chat shell — AI streams real Gemini responses; locked channels show an editorial "yakında" state with a `mailto:` notify CTA. No backend changes required for the locked channels in v1.
- Maintains atlas-parity tokens (paper background, sage/terracotta accents, serif headlines, border-divided rows) consistent with `/scholarships` and `/communities`.

## Visual Direction

Reuse the project's editorial language:

- `bg-[var(--editorial-paper)]` (#f8f7f1) background.
- `font-serif` (Iowan Old Style fallback chain) for hero title, channel names, chapter intros, and AI response paragraphs.
- Ink `--editorial-ink`, muted `--editorial-muted`, sage `--editorial-sage` for accents, terracotta `--editorial-terracotta` for desk numerals and external/notify actions.
- Square / `rounded-md` radii at most; **no `rounded-2xl` chat bubbles anywhere**.
- Single column, `max-w-3xl` (narrower than atlas pages — Q&A reading width), `mx-auto`.
- All grouping via `border-t` / `border-b` and uppercase letter-spaced labels.

## Information Architecture

### Route

Stays at `/ai-mentor` (protected, signed-in only). Do not introduce new routes or query parameters. Internal state toggles between **hub** and **chat-room-for-channel-X** views.

### Top bar (both views)

Identical structure to scholarships and communities:

- `←` Back link (to home from hub, to hub from chat room).
- Page identity center: `Danışma Masaları` / `Consultation Desks` in hub; `[NN] [Channel Name]` in chat room (e.g. `01 ItalyPath AI`).
- Right: language toggle pill (TR ⇄ EN). On the chat-room view, immediately left of the language pill is the channel-state badge (`HAZIR` / `YAZIYOR…` / `YAKINDA` — see Status Vocabulary).

### View A — Hub

Top to bottom:

1. **Top bar** (see above; identity reads "Danışma Masaları").
2. **Hero block** — smaller than atlas heroes (this is a transactional page, not a landing):
   - Eyebrow `DANIŞMA · ÜÇ MASA` / `CONSULTATION · THREE DESKS` (uppercase 11px tracking-[0.16em] muted).
   - H1 `font-serif text-4xl sm:text-5xl lg:text-6xl` reading `Hangi masaya yazmak istersin?` / `Which desk will you write to?`. Single-line on `lg`, wraps cleanly below.
   - Intro paragraph (`text-base sm:text-lg text-muted max-w-prose`) explaining the three options in one sentence.
3. **Channel list** — three rows, separated by `border-t border-editorial-border`. Each row is an interactive surface (button or link, see Actions below):
   - **Grid:** `grid-cols-[48px_minmax(0,1fr)_auto] gap-x-6 gap-y-2 py-6`.
   - Column 1: Two-digit terracotta numeral (`text-[11px] font-bold uppercase tracking-[0.18em] text-editorial-terracotta`) — `01`, `02`, `03`.
   - Column 2 (content):
     - Top row: channel `name` (`font-serif text-2xl sm:text-3xl font-normal tracking-[-0.018em]`) on the left, status badge on the right (sage `AKTİF · ANINDA` for active; muted `YAKINDA · ÜCRETSİZ` / `YAKINDA · ÜCRETLİ` for locked).
     - Tagline paragraph: `font-serif italic text-sm sm:text-base text-muted max-w-prose` (1–2 sentences).
     - Meta line: small sans `text-[10px] tracking-wide text-muted` listing response time / cost / availability (e.g. `Anında · 7/24 · Ücretsiz`).
   - Column 3 (CTA):
     - Active row: action label `SOHBETE BAŞLA ↗` in terracotta (`text-[11px] font-bold uppercase tracking-[0.12em]`).
     - Locked row: outlined `YAKINDA` pill (`border border-editorial-border px-3 py-1.5 text-[11px] tracking-[0.12em] text-muted`).
4. **No footer prompt block** (unlike communities). The hub closes after the third row.

### View B — Chat room

Per-channel scoped chat experience. The component renders the same shell for all three channels and reads `status` from the active channel to decide whether to enable input.

Top to bottom:

1. **Top bar** — `← Masalar` / `← Desks` on the left; center reads `[NN] [Channel Name]` with the two-digit numeral in terracotta (consistent with hub); right reads the channel-state badge (`HAZIR` muted, `YAZIYOR…` sage, `YAKINDA` muted) followed by the language toggle.
2. **Conversation body** — flexible-height scroll region. Contents depend on state:
   - **Empty state (active channel, no messages yet):** four "starter question" chips below a small muted label `Buradan başla` / `Start here` (`text-[11px] tracking-[0.16em] uppercase text-muted`). Chips are plain editorial pills (`border border-editorial-border bg-transparent px-3 py-2 text-sm text-ink hover:bg-editorial-surface`) — **no Sparkles icon, no Indigo gradient**. Clicking a chip fills the input and immediately submits.
   - **In-conversation state (active channel, one or more user messages exchanged):** the editorial Q&A flow described in EntryPair anatomy below.
   - **Locked state (Gönüllü Ekip / Uzman):** centered editorial card replacing the conversation entirely. Anatomy:
     - Editorial monogram in an outlined square (64×64, `border border-editorial-border bg-editorial-surface`): channel monogram in `font-serif italic text-2xl text-editorial-terracotta` (`GE` for Gönüllü, `UZ` for Uzman).
     - Headline `font-serif text-2xl sm:text-3xl` reading `Bu masa yakında açılıyor.` / `This desk is opening soon.`
     - Italic serif paragraph (`font-serif italic text-sm leading-relaxed text-muted max-w-prose`) describing what the desk will offer once live — one sentence sourced from the channel meta.
     - `mailto:` notify CTA — outlined terracotta button `AÇILDIĞINDA HABER ET ↗` / `NOTIFY ME WHEN OPEN ↗` linking to `mailto:contact@italypath.com?subject=...` with subject `Danışma masası açılış bildirimi: [channel name]`. Identical pattern to the communities footer CTA.
3. **Input area** — sticky bottom strip (`border-t border-editorial-border bg-editorial-surface`):
   - Active channel, idle: italic-serif placeholder (`Bir soru daha…` / `Another question…`), full-width transparent input (no border on the field itself — the strip's top border carries the boundary), send button at right.
   - Active channel, streaming: input is disabled, placeholder switches to `Mentor yanıt yazıyor…` / `Mentor is writing…`, send button morphs to stop button (same position, same size, ink fill — see Send/Stop Anatomy).
   - Locked channel: input is disabled with placeholder `Bu masada şu an mesaj alınmıyor.` / `This desk isn't accepting messages yet.`, send button is muted/disabled.

### EntryPair anatomy (the Q&A unit)

Each user-question + assistant-response pair renders as a single `EntryPair`:

- **Question (top):**
  - Micro-label `SORU NN` / `QUESTION NN` in terracotta uppercase letter-spaced (`text-[10px] tracking-[0.16em] font-bold`). `NN` is the 1-indexed position of this user message in the session (zero-padded: `01`, `02`, …).
  - The question text below: `font-sans font-semibold text-base sm:text-lg text-ink leading-snug tracking-[-0.003em] max-w-prose`.
- **Hairline separator:** `border-t border-editorial-border mt-4 pt-4` between question and response.
- **Response (bottom):**
  - Serif paragraph flow: `font-serif text-base sm:text-lg leading-relaxed text-ink max-w-prose`.
  - Markdown rendering preserved: bold renders as `<strong class="font-semibold">`, paragraphs separate, lists indent — but all using the editorial type stack. Inline code uses `font-mono text-[0.85em] bg-[var(--editorial-surface)] px-1.5 py-0.5 border border-editorial-border/40`.
  - **Streaming indicator:** when this is the in-progress response, an inline ink-cursor block (`<span class="inline-block w-[7px] h-[1em] align-text-bottom bg-editorial-ink ml-0.5 animate-pulse-cursor">`) renders at the end of the current text. Animation: a 1-second steps(2) blink (CSS keyframe `pulse-cursor` to be added to `globals.css`). When `prefers-reduced-motion: reduce`, the cursor stays static (no blink).
  - **Empty response placeholder:** if the assistant message exists but `content === ""` (first chunk pending), render only the cursor.

EntryPairs stack vertically with `mt-10` between pairs.

### Status vocabulary

Channel state strings shown in the chat-room top bar:

| Internal state | TR label | EN label | Color |
| --- | --- | --- | --- |
| `idle` (active channel, no streaming) | `HAZIR` | `READY` | `text-editorial-muted` |
| `streaming` (active channel, response in progress) | `YAZIYOR…` | `WRITING…` | `text-editorial-sage` |
| `locked` (Gönüllü Ekip or Uzman) | `YAKINDA` | `SOON` | `text-editorial-muted` |
| `error` (last assistant message failed) | `HATA` | `ERROR` | `text-editorial-terracotta` |

### Send / Stop anatomy

A single 36×36 square button anchors the right end of the input strip:

- **Send (idle, has input text):** `bg-editorial-ink text-editorial-paper`, lucide `ArrowDown` (or send arrow) at 14px. Disabled (50% opacity, no background) when input is empty.
- **Stop (streaming):** `bg-editorial-terracotta text-editorial-paper`, lucide `Square` at 13px. Replaces the send button while `isStreaming === true`. Aborts the current stream via `AbortController` (existing pattern).
- Both are `transition-colors duration-200 ease-out`, `active:scale-[0.97]`. No rose-pink (`rose-500`), no `rounded-2xl`.

### Reset / new conversation

A small text-link `Sıfırla` / `Reset` sits at the right end of the conversation body's top margin (above the first EntryPair, after the empty state ends) — visible only once at least one user message exists. Clicking it:

- Aborts any in-flight stream.
- Clears the message history for the active channel.
- Resets the question counter to 1.
- Stays in the chat-room view (does not bounce back to hub).

`text-[11px] tracking-[0.12em] uppercase font-bold text-muted hover:text-ink`. No icon — text only.

## Channel Data Model

New file: `lib/mentor/channels.ts`.

```ts
export const MENTOR_CHANNEL_IDS = ["ai", "volunteer", "expert"] as const;
export type MentorChannelId = (typeof MENTOR_CHANNEL_IDS)[number];
export type MentorChannelStatus = "active" | "coming-soon";

export interface MentorChannel {
  id: MentorChannelId;
  order: number;          // 1..3
  numberLabel: string;    // "01", "02", "03"
  monogram: string;       // "AI", "GE", "UZ"
  status: MentorChannelStatus;
  // Copy lives in t.aiMentor.channels — this file only holds structure.
}

export const MENTOR_CHANNELS: MentorChannel[] = [
  { id: "ai",        order: 1, numberLabel: "01", monogram: "AI", status: "active" },
  { id: "volunteer", order: 2, numberLabel: "02", monogram: "GE", status: "coming-soon" },
  { id: "expert",    order: 3, numberLabel: "03", monogram: "UZ", status: "coming-soon" },
];

export function getMentorChannel(id: MentorChannelId): MentorChannel {
  const channel = MENTOR_CHANNELS.find((c) => c.id === id);
  if (!channel) throw new Error(`Unknown mentor channel: ${id}`);
  return channel;
}
```

Channel copy (name, tagline, meta, locked-state body) lives in `t.aiMentor.channels.{ai|volunteer|expert}` so it follows the language toggle automatically.

## Component Architecture

Routing remains untouched:

- `app/ai-mentor/page.tsx` stays a Client Component (it already is). Replace its body entirely.
- `/ai-mentor` route stays protected via `proxy.ts` — no boundary change.

Replace the current monolithic 332-line file with a focused composition:

- `app/ai-mentor/page.tsx` — thin client component, top-level state container (`view: 'hub' | 'chat'`, `activeChannel: MentorChannelId | null`, per-channel message history). Renders either `<MentorHub />` or `<MentorChatRoom channelId={activeChannel} />`. Imports new sub-components from `components/mentor/`.

New files in `components/mentor/`:

- `components/mentor/MentorHub.tsx` — landing view with the three-channel roster. Stateless. Receives `onSelectChannel: (id: MentorChannelId) => void`.
- `components/mentor/MentorChatRoom.tsx` — chat shell. Receives `channel: MentorChannel`, `messages: ChatMessage[]`, `isStreaming: boolean`, `onSend(text)`, `onStop()`, `onReset()`, `onBackToHub()`. Internally renders the top bar, conversation body, input strip. Branches on `channel.status` for active vs locked rendering.
- `components/mentor/EntryPair.tsx` — single Q+A unit. Receives `questionNumber`, `question`, `responseText`, `isStreamingResponse`. Renders the SORU label + bold question + hairline + serif response (Markdown rendered).
- `components/mentor/LockedDeskNotice.tsx` — centered editorial "yakında" card for locked channels. Receives `channel: MentorChannel`. Renders monogram + headline + paragraph + mailto CTA.
- `components/mentor/StarterPrompts.tsx` — four-chip starter row for AI's empty state. Receives `onPick(text)`. Renders the editorial prompt pills (no Sparkles, no Indigo).
- `components/mentor/MentorTopBar.tsx` — shared top bar used by both Hub and ChatRoom; receives `mode: 'hub' | 'chat'`, optional `channel`, optional `statusLabel`. Mirrors the scholarships top-bar pattern.

Old file deletions:

- The current `app/ai-mentor/page.tsx` is entirely rewritten — no separate file deletion, just a full body replacement.

This decomposition keeps each file <200 lines and gives each piece one clear responsibility. The choice to split into separate files (unlike the scholarships and communities single-file pattern) is deliberate: the AI Mentor has more interactive state and a dual-view (hub + chat) shell, so component boundaries help isolation and reduce client-bundle re-render scope.

## Streaming Behavior (Preserved)

Existing `/api/chat` route is unchanged. The new `MentorChatRoom` keeps the existing fetch + `ReadableStream` + `TextDecoder` pattern:

- POST messages to `/api/chat`.
- Stream chunks into the in-progress assistant message via `setMessages`.
- `AbortController` powers the stop button (unchanged).
- Reset aborts the current stream and clears the history (unchanged).
- Error: caught error message replaces the assistant content (unchanged).
- Per-channel message state lives in the page-level state container as a `Record<MentorChannelId, ChatMessage[]>` (keyed by channel id). Switching from AI to Volunteer and back to AI **preserves** the AI history within the same browser session. Only the explicit `Sıfırla` action clears history — and only for the active channel. Cross-session persistence (page reload) is out of scope; each fresh visit starts empty.

When the user enters a locked channel, no fetch is made. The chat room renders `<LockedDeskNotice />` instead of the conversation body.

## Translations

Rewrite the `aiMentor` block under both `tr:` and `en:` trees in `lib/translations.ts`. Target shape (TR shown; EN must mirror keys exactly):

```ts
aiMentor: {
  // Top bar
  backHome: "Ana sayfaya dön",
  backToHub: "Masalar",
  pageIdentity: "Danışma Masaları",

  // Hub
  hubEyebrow: "DANIŞMA · ÜÇ MASA",
  hubTitle: "Hangi masaya yazmak istersin?",
  hubIntro: "Üç farklı kanaldan İtalya yolculuğu hakkında danışabilirsin: hızlı bir cevap için yapay zekâ; aynı yoldan geçmiş öğrenciler için gönüllü ekip; derin bir konu için uzman.",
  hubActiveBadge: "AKTİF · ANINDA",
  hubLockedBadgeFree: "YAKINDA · ÜCRETSİZ",
  hubLockedBadgePaid: "YAKINDA · ÜCRETLİ",
  hubOpenCta: "SOHBETE BAŞLA",
  hubLockedCta: "YAKINDA",

  // Chat room shared
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

  // Locked state
  lockedHeadline: "Bu masa yakında açılıyor.",
  notifyCta: "AÇILDIĞINDA HABER ET",
  notifyMailSubject: "Danışma masası açılış bildirimi",

  // Starter prompts (AI channel empty state)
  prompts: {
    prompt1: "İtalya'da en uygun harç ücretli üniversiteler hangileri?",
    prompt2: "Milano'da İngilizce mühendislik bölümleri var mı?",
    prompt3: "ISEE değerim düşükse ne kadar burs alabilirim?",
    prompt4: "Başvuru için hangi belgeler gerekiyor?",
  },

  // Channel data
  channels: {
    ai: {
      name: "ItalyPath AI",
      tagline: "64 üniversitenin ve 240 bölümün veritabanına bağlı yapay zekâ. İlk eşikte hızlı oryantasyon için.",
      meta: "Anında · 7/24 · Ücretsiz",
      lockedBody: "", // unused for active channel
    },
    volunteer: {
      name: "ItalyPath Gönüllü Ekip",
      tagline: "Aynı yoldan geçmiş, halen İtalya'da yaşayan öğrenciler. Pratik soruna pratik yanıt — birkaç saatte bir cevap.",
      meta: "Birkaç saat içinde · Hafta içi · Ücretsiz / sınırlı",
      lockedBody: "Yakında: aynı yoldan geçmiş öğrencilerden bire-bir, gerçek deneyime dayalı yanıtlar.",
    },
    expert: {
      name: "ItalyPath Uzman",
      tagline: "Vize itirazı, ISEE doğrulaması, transkript denkliği gibi konularda derin danışmanlık. Randevulu, ücretli.",
      meta: "Randevulu · Ücretli paket",
      lockedBody: "Yakında: vize itirazı, ISEE doğrulaması ve transkript denkliği gibi konularda derin danışmanlık.",
    },
  },
},
```

EN translation table follows identical key shape. Channel tagline / meta / lockedBody in English.

Obsolete keys to remove from the old `aiMentor` block: `title` (replaced by per-channel `name`), `welcome` (welcome message dropped — empty AI state shows starter prompts only, no fake AI welcome paragraph), `thinking` (replaced by `statusWriting`), `reset` (replaced by `resetLabel`), `inputPlaceholder` (renamed/repurposed), `inputPlaceholderStreaming` (kept under new name), `stop` (renamed to `stopAria`), `send` (renamed to `sendAria`), `promptsTitle` (replaced by `startHereLabel`), `prompt1`-`prompt4` (now nested under `prompts.*`).

`t.navbar.mentor` stays as `"Mentor"` (TR) / `"AI Mentor"` (EN) — minimal disruption to other surfaces. Acceptable mismatch: nav says "Mentor" but the page title says "Danışma Masaları"; the consultation framing is the on-page identity. If desired in a future content pass, navbar can switch to `"Danışma"` / `"Consultation"` but this is **out of scope** for v1.

## Tokens & Typography

Reuse existing CSS variables; no new theme tokens.

- Background: `--editorial-paper`.
- Surface: `--editorial-surface` (`#fffefa`) for the input strip background and locked-state monogram square.
- Hover row (hub channel row): `#f6f0e7` (literal; scholarships/communities parity).
- Ink, muted, sage, terracotta, border — as established.
- Type scale:
  - Hub H1: `font-serif text-4xl sm:text-5xl lg:text-6xl font-normal leading-[0.98] tracking-[-0.025em]`.
  - Channel name (hub row): `font-serif text-2xl sm:text-3xl font-normal tracking-[-0.018em]`.
  - Channel tagline: `font-serif italic text-sm sm:text-base text-muted`.
  - Hub eyebrow / question label / status label: `text-[11px] uppercase tracking-[0.16em]–[0.18em] font-bold`.
  - Question text (chat): `font-sans font-semibold text-base sm:text-lg text-ink tracking-[-0.003em]`.
  - Response paragraph: `font-serif text-base sm:text-lg leading-relaxed text-ink`.
  - Locked headline: `font-serif text-2xl sm:text-3xl font-normal tracking-[-0.022em]`.
  - Input placeholder: `font-serif italic text-base text-muted`.

No new font imports. The streaming cursor uses a new tiny CSS keyframe (`pulse-cursor`) added to `app/globals.css`:

```css
@keyframes pulse-cursor {
  0%, 50%   { opacity: 1; }
  50.01%,
  100%      { opacity: 0; }
}

.animate-pulse-cursor {
  animation: pulse-cursor 1s steps(2) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-pulse-cursor { animation: none; opacity: 1; }
}
```

## Motion & Accessibility

The page is text-heavy and interactive — motion stays restrained, Emil-style.

- **Hub view entry:** soft `opacity 0 → 1` + `y: 14 → 0` stagger on hero and channel rows (`staggerChildren: 0.08`). Spring `stiffness: 110, damping: 22` (same vocabulary as communities and the existing HeroSection).
- **Channel selection:** when a channel is picked, the hub view exits with `opacity 1 → 0` over 220ms and the chat-room view enters with `opacity 0 → 1` over 280ms with a slight `y: 6 → 0`. Both use `cubic-bezier(0.32, 0.72, 0, 1)`. Uses Framer Motion's `AnimatePresence` with `mode="wait"`. No shared-layout / morph attempted — the views are structurally different enough that a simple fade is cleaner.
- **EntryPair entry:** each new user question fades in with `opacity 0 → 1` + `y: 8 → 0` (160ms ease-out). The hairline + response container slides into existence after the question is committed.
- **Streaming cursor:** CSS `animate-pulse-cursor` keyframe (above). Honors `prefers-reduced-motion`.
- **Send → Stop morph:** `AnimatePresence` swap on the input button. The button position stays put; only the icon + background fill cross-fades with a 160ms spring.
- **Status label cross-fade in top bar:** `AnimatePresence mode="wait"` between `HAZIR` / `YAZIYOR…` / `HATA`, 200ms opacity fade.
- All motion respects `useReducedMotion()` from framer-motion; when true, no enter/exit animations, no cursor blink. The conversation simply reflows instantly.

Accessibility:

- Hub channel row: `<button>` element (not `<a>`) with `aria-label="${channel.name}, ${statusLabel}"` and an explicit `onClick={() => onSelectChannel(channel.id)}`. The whole row is the click target.
- Chat-room top bar: `<button onClick={onBackToHub}>` with `aria-label="Masalara dön"` / `"Back to desks"`.
- Conversation area is `<section aria-live="polite" aria-atomic="false">` so streaming text is announced to screen readers (existing pattern is to update the assistant message in place; aria-live polite reads incremental updates without interrupting).
- Each EntryPair wraps question + response in an `<article>` with `aria-labelledby` pointing to the question text id.
- Reset button: `<button>` with `aria-label="Sohbeti sıfırla"` / `"Reset conversation"`.
- Input: `<form onSubmit>` with `<input>` carrying a visible italic placeholder and an `aria-label="Soru gir"` / `"Type a question"`. The send/stop button has its own `aria-label` per state.
- Focus rings: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]`.
- Color contrast: all text/background pairs meet WCAG AA against the paper background.

## Responsive Behavior

| Element | Mobile (<640px) | Tablet (640–1023px) | Desktop (≥1024px) |
| --- | --- | --- | --- |
| Top bar | Identity center collapses to channel monogram + numeral only; "Masalar" label hidden behind icon. | Identity center shows numeral + abbreviated name. | Full identity + status badge. |
| Hub hero | Single column. H1 wraps to 2 lines. | Same. | Single column, wider H1. |
| Hub channel row | Numeral above name on a separate line; CTA wraps below tagline. Tap target stays ≥48px. | Three-column grid as on desktop. | Three-column grid `48px | 1fr | auto`. |
| Chat room body | Full-width with `px-4`; `max-w-3xl` clamps on larger viewports. | Same. | Centered column, `max-w-3xl`. |
| Input strip | Sticky bottom (`pb-safe`), wraps gracefully on iOS Safari (`100dvh`). | Same. | Same. |
| Starter prompts | Two-column grid (2×2). | Two-column grid. | Single row of four chips. |
| Locked notice | Centered, stacks naturally. | Same. | Same. |

The page uses `min-h-[100dvh]` (never `h-screen`). The chat-room body uses `flex-1 overflow-y-auto` between the top bar and input strip so the conversation scrolls independently while the input stays pinned.

## Out of Scope

- Persisting per-channel conversation across sessions / page reloads. Each fresh page visit starts with empty history; within a single browser session, per-channel state is preserved across channel switches (see Streaming Behavior).
- Real subscription / notify backend. Locked-state CTA is a `mailto:` link to a placeholder address.
- Volunteer / Expert real chat backend (intentionally deferred per user direction).
- Markdown extensions beyond what `react-markdown` already renders (no plugins added).
- Routing changes — `/ai-mentor` stays. No `/ai-mentor/[channel]` deep-linking.
- Navbar / BottomNav / Hub action label changes. (`t.navbar.mentor`, `t.bottomNav.ai`, `t.hub.actionAiMentor` all unchanged.)
- Mobile BottomNav icon change. The `Bot` icon stays for the AI mentor slot — relabeling is a separate content pass.
- Sitemap update — `/ai-mentor` is protected (not in `sitemap.ts`); no change.

## Smoke Verification (Implementation Exit Criteria)

- `npm run lint` clean.
- `npm run check:routes` passes (no Clerk boundary change — `/ai-mentor` stays protected).
- `npm run check:data` passes (script validates university data only).
- `npm run build` succeeds; `/ai-mentor` listed as `ƒ` (dynamic, signed-in only) or `○` per existing convention.
- Manual dev-server pass at `/ai-mentor`:
  - Hub view renders with three channel rows; counts and badges correct.
  - Clicking `01 ItalyPath AI` transitions to chat room; top bar shows `01 ItalyPath AI · HAZIR`.
  - Starter prompts render; clicking one submits the question and the AI streams a response with a blinking cursor.
  - Send / Stop morphs correctly mid-stream. Reset clears history and increments back to `SORU 01`.
  - Clicking `02 Gönüllü Ekip` or `03 Uzman` transitions to chat room; centered "Yakında" card renders with monogram + headline + notify CTA. Input is disabled.
  - Clicking `Masalar` back-arrow returns to hub.
  - Language toggle flips all chrome and channel copy.
  - Mobile 375px: hub row stacks gracefully; chat room input stays pinned at bottom; tap targets ≥48px.
  - Reduced motion: cursor stops blinking; view transitions skip animations.

## Implementation Phases

1. **Data layer:** create `lib/mentor/channels.ts` with the `MentorChannel` type, `MENTOR_CHANNELS` array, and `getMentorChannel` helper. No UI consumers yet.
2. **Translations:** rewrite the `aiMentor` block under both `tr:` and `en:` trees with the new shape. Existing imports continue to work but old key references break — fixed in step 4 when the page is rewritten.
3. **Globals:** add the `pulse-cursor` keyframe + `.animate-pulse-cursor` utility (with reduced-motion guard) to `app/globals.css`.
4. **Components:** create `components/mentor/MentorTopBar.tsx`, `MentorHub.tsx`, `MentorChatRoom.tsx`, `EntryPair.tsx`, `LockedDeskNotice.tsx`, `StarterPrompts.tsx`. Each receives typed props; no internal fetching except in `MentorChatRoom` which owns the streaming lifecycle.
5. **Page rewrite:** rewrite `app/ai-mentor/page.tsx` to compose `MentorHub` and `MentorChatRoom` with the view-state container. The old single-file 332-line implementation is fully replaced.
6. **Polish & smoke:** dev-server walkthrough of all states (idle / streaming / error / reset / locked / language toggle / reduced motion), mobile breakpoint check, lint / build / check:routes.

## Open Questions (Confirm During Review)

- `contact@italypath.com` — same placeholder as the communities footer. Provide the canonical notify address or accept the placeholder.
- Starter prompt content — current prompts (about tuition, Milano English engineering, ISEE, documents) are kept verbatim. Acceptable, or polish content during review?
- The `welcome` AI greeting is **removed**. New AI conversations open with starter prompts only — no fake "Ciao! ItalyPath Mentor hazır." line. Confirm or restore.
- Reset button visibility: spec'd as a tiny text link "SIFIRLA" that appears once the user has sent at least one message. Alternative would be a persistent header button (closer to current UX). Spec sticks with the editorial-discreet placement.
- Notify-CTA for locked channels: currently `mailto:`. If a real notify backend is planned soon, the UI can be swapped to a controlled input + submit without disturbing the surrounding layout.
