# ItalyPath Editorial UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the ItalyPath homepage and mobile navigation from AI/SaaS visual language into the approved Editorial Guide direction.

**Architecture:** Keep the existing Next.js App Router and component boundaries. Replace homepage visual systems in-place: hero, feature rows, scholarships/ISEE bands, bridge, footer, navbar, and bottom nav. Add a small repo-native smoke check that prevents the most obvious AI aesthetic regressions.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Lucide React, Clerk.

---

## File Structure

- Modify `scripts/check-editorial-ui.mjs`: smoke check for forbidden AI-aesthetic tokens in the redesigned homepage components.
- Modify `package.json`: add `check:editorial-ui`.
- Modify `components/Navbar.tsx`: simpler editorial header.
- Modify `components/HeroSection.tsx`: remove gradient/glow/pulse hero and add the dossier composition.
- Modify `components/FeaturesSection.tsx`: replace animated bento grid with editorial rows.
- Modify `components/ScholarshipsSection.tsx`: calm callout band with map/list motif.
- Modify `components/IseeSection.tsx`: calm calculator callout band.
- Modify `components/VelocityBridge.tsx`: replace scrolling brand marquee with quiet proof divider.
- Modify `components/Footer.tsx`: sober editorial footer.
- Modify `components/BottomNav.tsx`: flatter mobile nav with no glowing center AI button.
- Modify `app/globals.css`: add editorial tokens and remove unused homepage-only decorative pressure where safe.

## Tasks

### Task 1: Editorial UI Smoke Check

**Files:**
- Create: `scripts/check-editorial-ui.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing smoke check**

Create `scripts/check-editorial-ui.mjs`:

```js
import { readFileSync } from "node:fs";

const checks = [
  {
    file: "components/HeroSection.tsx",
    forbidden: [
      "PulsatingButton",
      "gradient-text",
      "blob",
      "t.hero.badge",
      "titleHighlight",
      "titleEnd",
      "animate-ping",
      "Sparkles",
    ],
  },
  {
    file: "components/FeaturesSection.tsx",
    forbidden: ["BentoGrid", "BentoCard", "Marquee", "AnimatedList", "BorderBeam"],
  },
  {
    file: "components/VelocityBridge.tsx",
    forbidden: ["ScrollVelocityContainer", "ScrollVelocityRow", "ItalyPathLine"],
  },
  {
    file: "components/BottomNav.tsx",
    forbidden: ["blur-md", "linear-gradient(135deg", "border-4 border-white"],
  },
  {
    file: "components/IseeSection.tsx",
    forbidden: ["Sparkles", "blur-3xl", "linear-gradient(135deg"],
  },
  {
    file: "components/ScholarshipsSection.tsx",
    forbidden: ["radial-gradient", "rounded-[2.5rem]", "blur-2xl"],
  },
];

const failures = [];

for (const check of checks) {
  const source = readFileSync(check.file, "utf8");
  for (const token of check.forbidden) {
    if (source.includes(token)) {
      failures.push(`${check.file} still contains forbidden token: ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Editorial UI smoke check passed.");
```

Add this script to `package.json`:

```json
"check:editorial-ui": "node scripts/check-editorial-ui.mjs"
```

- [ ] **Step 2: Run check to verify it fails**

Run: `npm run check:editorial-ui`

Expected: FAIL because existing homepage components still contain tokens like `PulsatingButton`, `BentoGrid`, and `ScrollVelocityContainer`.

- [ ] **Step 3: Commit the red check**

Run:

```bash
git add package.json scripts/check-editorial-ui.mjs
git commit -m "test: add editorial UI smoke check"
```

### Task 2: Header, Hero, And Dossier

**Files:**
- Modify: `components/Navbar.tsx`
- Modify: `components/HeroSection.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace the navbar with an editorial header**

Implement a fixed, thin-border, paper/white header. Keep Clerk signed-in/signed-out behavior, language toggle, and nav targets.

- [ ] **Step 2: Replace hero with the approved editorial copy**

Use:

```txt
İtalya’da eğitim kararını netleştir.
Üniversiteleri, bursları, belgeleri ve toplulukları tek bir güvenilir rehber akışında takip et.
```

Build a right-column code-native dossier with shortlist rows, document checklist rows, and a scholarship note. Keep route targets `/universities` and `/scholarships`.

- [ ] **Step 3: Add or align editorial global tokens**

Add CSS custom properties for paper, ink, muted, sage, terracotta, and border tokens in `app/globals.css`.

- [ ] **Step 4: Run the smoke check**

Run: `npm run check:editorial-ui`

Expected: still FAIL until later tasks remove all forbidden tokens, but `components/HeroSection.tsx` should no longer be listed.

### Task 3: Homepage Sections

**Files:**
- Modify: `components/FeaturesSection.tsx`
- Modify: `components/ScholarshipsSection.tsx`
- Modify: `components/IseeSection.tsx`
- Modify: `components/VelocityBridge.tsx`
- Modify: `components/Footer.tsx`

- [ ] **Step 1: Replace feature bento with editorial rows**

Remove animated backgrounds and Magic UI bento usage. Render three horizontal feature rows with concise descriptions and quiet action links.

- [ ] **Step 2: Replace scholarships callout**

Use a calm bordered band with region/list/map cues, no radial backgrounds or large rounded wrapper.

- [ ] **Step 3: Replace ISEE callout**

Use a calm calculator/checklist layout, no large gradient panel and no sparkle note.

- [ ] **Step 4: Replace velocity bridge**

Remove scrolling repeated brand text. Render a quiet proof rail for universities, programs, regions, and documents.

- [ ] **Step 5: Simplify footer**

Use ink wordmark, muted copy, and muted social labels.

- [ ] **Step 6: Run the smoke check**

Run: `npm run check:editorial-ui`

Expected: still FAIL only if bottom nav remains old.

### Task 4: Mobile Navigation

**Files:**
- Modify: `components/BottomNav.tsx`

- [ ] **Step 1: Flatten bottom nav**

Keep the four destinations, remove glowing center button, use quiet sage active state, thin border, and stable safe-area layout.

- [ ] **Step 2: Run the smoke check**

Run: `npm run check:editorial-ui`

Expected: PASS.

### Task 5: Verification And Visual QA

**Files:**
- Modify only if checks reveal issues.

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Run existing project smoke checks**

Run:

```bash
npm run check:routes
npm run check:data
```

Expected: PASS.

- [ ] **Step 4: Start dev server and inspect**

Run: `npm run dev`

Open the homepage in the in-app browser. Verify desktop and mobile:

- no hero badge, gradient headline, sparkle footnote, or fake social proof above the fold;
- dossier text is readable;
- feature rows, scholarships, and ISEE sections keep editorial spacing;
- mobile nav has no glowing center AI button;
- no horizontal overflow.

- [ ] **Step 5: Commit the implementation**

Run:

```bash
git add app/globals.css components/Navbar.tsx components/HeroSection.tsx components/FeaturesSection.tsx components/ScholarshipsSection.tsx components/IseeSection.tsx components/VelocityBridge.tsx components/Footer.tsx components/BottomNav.tsx package.json scripts/check-editorial-ui.mjs
git commit -m "feat: redesign homepage with editorial UI"
```

