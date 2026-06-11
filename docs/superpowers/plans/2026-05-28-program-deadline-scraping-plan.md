# Program Deadline Scraping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape non-EU application deadlines for top 10-15 Italian universities and store them in `app/data.ts` via the existing override-map pattern, with scrape and LLM extraction separated into independent stages.

**Architecture:** Three-stage pipeline. Stage 1 (automated): Chrome browsing skill visits each admission URL, saves cleaned markdown to `tmp/scraped/`. Stage 2 (Kerem manual): Kerem feeds all scraped files to an LLM with a provided prompt template, produces `tmp/deadlines-extracted.json`. Stage 3 (automated): Apply script merges that JSON into a new `DEPARTMENT_DEADLINE_OVERRIDES` map in `app/data.ts`. Manual review embedded between stages; verification scripts gate the merge.

**Tech Stack:** Next.js 16 + TypeScript 5, existing override-map pattern in `app/data.ts`, Chrome browsing skill (MCP: `mcp__plugin_superpowers-chrome_chrome__use_browser`), Node.js scripts following project convention (`.mjs` + plain `throw`-on-failure smoke checks, no formal test framework).

**Spec:** [docs/superpowers/specs/2026-05-27-program-deadline-scraping-design.md](../specs/2026-05-27-program-deadline-scraping-design.md)

---

## File Structure

**Created files:**
- `lib/deadlines/targets.ts` — curated 15-uni scrape targets (URL + cycle + uni ID)
- `scripts/scrape-deadlines-runbook.md` — Claude-execution runbook for the scrape stage (uses Chrome MCP)
- `scripts/save-scraped.mjs` — small Node helper used by scrape runbook to write files with proper frontmatter
- `scripts/apply-deadlines.mjs` — merges `tmp/deadlines-extracted.json` → `DEPARTMENT_DEADLINE_OVERRIDES` in `app/data.ts`
- `scripts/check-deadlines.mjs` — validation guard (npm: `check:deadlines`)
- `scripts/__fixtures__/apply-deadlines/input.json` — test fixture for apply script
- `scripts/__fixtures__/apply-deadlines/expected-overrides.txt` — expected output snippet
- `scripts/__fixtures__/check-deadlines/valid.ts` — valid override-map fixture
- `scripts/__fixtures__/check-deadlines/invalid.ts` — broken override-map fixture
- `docs/superpowers/specs/extraction-prompt-template.md` — copy-paste LLM prompt for Kerem

**Modified files:**
- `app/data.ts` — add `ProgramDeadline` interface, `DEPARTMENT_DEADLINE_OVERRIDES` map, `DEPARTMENT_DEADLINES_LAST_CHECKED_AT` constant, `Department.deadline` field, normalizer patch
- `package.json` — add `check:deadlines` npm script
- `.gitignore` — ignore `tmp/`

**Generated at execution time (gitignored):**
- `tmp/scraped/*.md` — one markdown file per uni × cycle (input to LLM extraction)
- `tmp/deadlines-extracted.json` — Kerem's LLM extraction output (input to apply script)

---

## Task 1: Add `ProgramDeadline` type + dataset constant to `app/data.ts`

**Files:**
- Modify: `app/data.ts:1-50` (insert near existing type exports)

- [ ] **Step 1: Add the type and constant immediately after `ProgramLevel` exports (around line 5)**

Open `app/data.ts` and insert the following between `export type DepartmentKey` and the existing `DepartmentSeed` interface (around line 6-7):

```ts
export interface ProgramDeadline {
  date: string;       // ISO "YYYY-MM-DD" | "rolling" | "TBA"
  note?: string;      // free-form, e.g. "Early round 11 Jun; regular 15 May"
  sourceUrl: string;  // page the data was extracted from
}

export const DEPARTMENT_DEADLINES_LAST_CHECKED_AT = "2026-05-28" as const;
```

- [ ] **Step 2: Run TypeScript build to verify nothing broken**

Run: `npm run build`
Expected: Build succeeds with no new errors. (If existing unrelated errors appear, leave them; just confirm no new ones from this change.)

- [ ] **Step 3: Commit**

```bash
git add app/data.ts
git commit -m "feat(data): add ProgramDeadline type and dataset last-checked constant"
```

---

## Task 2: Add empty `DEPARTMENT_DEADLINE_OVERRIDES` + `Department.deadline` field + normalizer patch

**Files:**
- Modify: `app/data.ts` (add override map near other overrides ~line 100; add field to `Department` ~line 16; patch `withDepartmentMetadata` ~line 1317)

- [ ] **Step 1: Add the empty override map**

Locate `DEPARTMENT_LEVEL_OVERRIDES` (around line 103) and add immediately after it:

```ts
export const DEPARTMENT_DEADLINE_OVERRIDES: Partial<Record<DepartmentKey, ProgramDeadline>> = {
  // Populated by scripts/apply-deadlines.mjs after LLM extraction.
};
```

- [ ] **Step 2: Add the optional `deadline` field to the `Department` interface**

Locate the `Department` interface (around line 16-22) and add the field:

```ts
export interface Department {
  name: string;
  slug: string;
  languages: ProgramLanguage[];
  durationYears: ProgramDurationYears;
  level: ProgramLevel;
  deadline?: ProgramDeadline;  // ← add this line
}
```

- [ ] **Step 3: Patch `withDepartmentMetadata` to read from the override map**

Locate `withDepartmentMetadata` (around line 1317) and add the `deadline` lookup to the returned object:

```ts
return {
  ...department,
  languages: [...languages],
  durationYears:
    department.durationYears ??
    DEPARTMENT_DURATION_OVERRIDES[departmentKey] ??
    DEFAULT_DEPARTMENT_DURATION_YEARS,
  level:
    department.level ??
    DEPARTMENT_LEVEL_OVERRIDES[departmentKey] ??
    DEFAULT_DEPARTMENT_LEVEL,
  deadline: DEPARTMENT_DEADLINE_OVERRIDES[departmentKey],  // ← add this line
};
```

- [ ] **Step 4: Run TypeScript build**

Run: `npm run build`
Expected: Build succeeds. `deadline?: ProgramDeadline` is optional, so existing consumers don't break.

- [ ] **Step 5: Commit**

```bash
git add app/data.ts
git commit -m "feat(data): wire ProgramDeadline through Department + empty override map"
```

---

## Task 3: Add `tmp/` to `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Append `tmp/` to .gitignore**

Open `.gitignore` and add a new line at the bottom:

```
tmp/
```

- [ ] **Step 2: Verify it works**

Create a test file and confirm git ignores it:
```bash
mkdir -p tmp && touch tmp/.test
git status --short
```
Expected: `tmp/.test` is NOT shown in git status output. Then clean up: `rm tmp/.test && rmdir tmp`.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore(gitignore): ignore tmp/ for scrape artifacts"
```

---

## Task 4: Create `lib/deadlines/targets.ts` with type + 6 confirmed universities

**Files:**
- Create: `lib/deadlines/targets.ts`

- [ ] **Step 1: Create the file with type definition and 6 confirmed unis**

Create `lib/deadlines/targets.ts` with these contents:

```ts
// Curated list of universities to scrape for non-EU application deadlines.
// Each entry maps a university ID (from app/data.ts) to one or more admission
// pages that publish its deadlines. URLs are visited in order; if a page covers
// both bachelor and master, use cycle: "both".

export interface DeadlineTargetUrl {
  cycle: "bachelor" | "master" | "both";
  url: string;
  appliesToSlugs?: string[]; // if URL only covers a subset of programs
}

export interface DeadlineTarget {
  universityId: number;
  universityName: string;     // for the runbook log; not used in apply step
  admissionUrls: DeadlineTargetUrl[];
}

export const DEADLINE_TARGETS: DeadlineTarget[] = [
  {
    universityId: 1,
    universityName: "Politecnico di Milano",
    admissionUrls: [
      {
        cycle: "bachelor",
        url: "https://www.polimi.it/en/prospective-students/how-to-apply/admission-to-laurea-programmes/students-with-a-foreign-degree",
      },
      {
        cycle: "master",
        url: "https://www.polimi.it/en/prospective-students/how-to-apply/admission-to-laurea-magistrale/foreign-qualification/deadlines",
      },
    ],
  },
  {
    universityId: 2,
    universityName: "Sapienza University of Rome",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.uniroma1.it/en/admissions",
      },
    ],
  },
  {
    universityId: 3,
    universityName: "University of Bologna",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.unibo.it/en/study/enrolment-fees-and-other-procedures",
      },
    ],
  },
  {
    universityId: 4,
    universityName: "Politecnico di Torino",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.polito.it/en/education/admission-and-enrolment",
      },
    ],
  },
  {
    universityId: 7,
    universityName: "Bocconi University",
    admissionUrls: [
      {
        cycle: "bachelor",
        url: "https://www.unibocconi.it/en/applying-bocconi/bachelor-and-law-programs/timeline",
      },
    ],
  },
  {
    universityId: 8,
    universityName: "Università Cattolica del Sacro Cuore",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.unicatt.it/ucenrollment-international-enrollment-procedure.html",
      },
    ],
  },
];
```

Note: Polito and Cattolica URLs are best-guess starting points; Task 6 runbook includes a step to verify each URL resolves to a deadline-relevant page before scraping.

- [ ] **Step 2: Run TypeScript build to verify**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/deadlines/targets.ts
git commit -m "feat(deadlines): add curated scrape targets for top 6 confirmed universities"
```

---

## Task 5: Research + add remaining 9 universities to `targets.ts`

**Files:**
- Modify: `lib/deadlines/targets.ts`

**Background:** The spec lists 15 universities total. Task 4 added the 6 with confirmed IDs from `app/data.ts`. The other 9 candidates (La Statale, Padova, Pisa, Firenze, Trento, Pavia, Tor Vergata, UniTorino, Verona) need:
(a) ID lookup in `app/data.ts` (some may not be in the database — flag for Kerem)
(b) Admission deadline URL discovery

- [ ] **Step 1: Look up IDs for the 9 candidates in `app/data.ts`**

Run: `grep -nE "^    name: \"(Università degli Studi di Milano|Università di Padova|Università di Pisa|Università di Firenze|Università di Trento|Università di Pavia|Università degli Studi di Roma Tor Vergata|Università degli Studi di Torino|Università di Verona|University of Padua|University of Pisa|University of Florence|University of Trento|University of Pavia|Tor Vergata|University of Turin|University of Verona)" /Users/keremyarar/italypath-main/app/data.ts`

For each match, record `id` and exact name. For any not found in the database, halt and ask Kerem which alternative to substitute (do not invent IDs).

- [ ] **Step 2: For each found uni, search the web for their admission deadline page**

For each of the 9 unis, use WebSearch with query pattern:
`{University Name} international admission deadline non-EU bachelor master 2026 2027`

From the top results, pick the URL that:
1. Is on the university's official domain (`.it` typically)
2. Has "admission", "deadlines", "international", or similar in the path
3. Is in English (avoid Italian-only pages)

Skip URLs from third-party aggregators (shiksha.com, studyabroad.com, etc.).

- [ ] **Step 3: For each found uni, fetch the candidate URL to confirm it has deadline info**

Use WebFetch with prompt:
`Does this page list application deadlines for international (non-EU) students? Return YES or NO, and the deadline date if visible.`

If NO, search for an alternative URL on the same domain. If still nothing usable, set the URL anyway and mark the target with `// TODO: deadlines may be on a different page` comment; the scrape runbook will surface this for Kerem's review.

- [ ] **Step 4: Append each confirmed uni to `DEADLINE_TARGETS` in `lib/deadlines/targets.ts`**

For each, add an entry following the same shape as Task 4. Use `cycle: "both"` unless you found separate bachelor and master URLs.

- [ ] **Step 5: TypeScript build verification**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add lib/deadlines/targets.ts
git commit -m "feat(deadlines): add scrape targets for 9 additional universities"
```

---

## Task 6: Create scrape orchestration runbook

**Files:**
- Create: `scripts/scrape-deadlines-runbook.md`

**Note:** The "scrape" is performed by Claude during execution using the Chrome MCP, NOT by a Node script. This runbook documents the exact procedure.

- [ ] **Step 1: Create the runbook with full Claude-execution instructions**

Create `scripts/scrape-deadlines-runbook.md` with the following content:

````markdown
# Scrape Deadlines — Claude Execution Runbook

**Purpose:** Visit each admission URL in `lib/deadlines/targets.ts` and save its cleaned page content to `tmp/scraped/` as markdown. No LLM extraction here — that happens in a separate manual step.

## Prerequisites

- The Chrome browsing skill (`mcp__plugin_superpowers-chrome_chrome__use_browser`) must be available.
- `lib/deadlines/targets.ts` must be populated with at least one target.
- `tmp/scraped/` will be created automatically; if it already contains files, the runbook resumes (does not re-scrape).

## Procedure

For each `target` in `DEADLINE_TARGETS`, for each `urlEntry` in `target.admissionUrls`:

### 1. Compute output filename

`tmp/scraped/{target.universityId}-{urlEntry.cycle}.md`

Example: `tmp/scraped/1-bachelor.md`

### 2. Skip if file already exists (resume support)

```bash
test -f tmp/scraped/{id}-{cycle}.md && echo "SKIP" || echo "SCRAPE"
```

If SKIP, move to next URL.

### 3. Open URL in Chrome via MCP

Use the `mcp__plugin_superpowers-chrome_chrome__use_browser` tool. Navigate to `urlEntry.url`. Wait for page load (cookie banner OK).

### 4. Extract main page content as markdown

Read the main `<main>`, `<article>`, or primary content container. Exclude:
- Cookie banners
- Top nav / global header
- Footer
- Side navigation

Convert to markdown. Preserve: headings (H1-H4), lists, tables, paragraphs, bold/italic for emphasis, hyperlink URLs (so deadlines that link out remain auditable).

### 5. Save to file with frontmatter

Pipe the content to `scripts/save-scraped.mjs`:

```bash
node scripts/save-scraped.mjs \
  --universityId={target.universityId} \
  --universityName="{target.universityName}" \
  --cycle={urlEntry.cycle} \
  --sourceUrl="{urlEntry.url}" \
  --outputDir=tmp/scraped/ \
  < markdown-content-from-step-4
```

The helper writes a file with this exact frontmatter format:

```markdown
---
universityId: 1
universityName: Politecnico di Milano
cycle: bachelor
sourceUrl: https://www.polimi.it/en/.../deadlines
scrapedAt: 2026-05-28T14:32:15Z
---

# {Page Title}

{markdown content here}
```

### 6. Rate limit

After each URL, wait 1500ms before the next one to be polite to the source server.

### 7. Skip-on-failure

If a URL fails (navigation timeout, 404, etc.), log the error to console and continue. Add a placeholder file `tmp/scraped/{id}-{cycle}.FAILED.txt` containing the error message — this surfaces to Kerem for manual fallback.

## Completion check

After processing all targets, verify:

```bash
ls tmp/scraped/*.md | wc -l
```

Expected count: number of URL entries in `DEADLINE_TARGETS` minus any that failed. List failed entries:

```bash
ls tmp/scraped/*.FAILED.txt 2>/dev/null
```

If failures exist, surface them to Kerem before proceeding to LLM extraction.
````

- [ ] **Step 2: Commit**

```bash
git add scripts/scrape-deadlines-runbook.md
git commit -m "docs(deadlines): add scrape orchestration runbook for Claude execution"
```

---

## Task 7: Create `scripts/save-scraped.mjs` helper with smoke check

**Files:**
- Create: `scripts/save-scraped.mjs`

**Behavior:** Reads markdown content from stdin, takes args for metadata, writes a properly-frontmattered file to the output directory.

- [ ] **Step 1: Write the failing smoke check first**

Create temporary file `scripts/__smoke__/save-scraped-test.mjs`:

```js
import { execSync } from "node:child_process";
import { readFileSync, rmSync, mkdirSync } from "node:fs";

const TMP = "tmp/__smoke_save_scraped__";
mkdirSync(TMP, { recursive: true });

// Pipe a fixture body to the script
const body = "# Test Page\n\nDeadline: 15 May 2027.\n";
const cmd = `echo ${JSON.stringify(body)} | node scripts/save-scraped.mjs --universityId=99 --universityName="Test U" --cycle=bachelor --sourceUrl="https://example.com/admissions" --outputDir=${TMP}/`;
execSync(cmd, { stdio: "inherit" });

// Verify output file exists with expected frontmatter
const out = readFileSync(`${TMP}/99-bachelor.md`, "utf8");
if (!out.includes("universityId: 99")) throw new Error("Missing universityId in frontmatter");
if (!out.includes("universityName: Test U")) throw new Error("Missing universityName");
if (!out.includes("cycle: bachelor")) throw new Error("Missing cycle");
if (!out.includes("sourceUrl: https://example.com/admissions")) throw new Error("Missing sourceUrl");
if (!out.includes("scrapedAt:")) throw new Error("Missing scrapedAt timestamp");
if (!out.includes("# Test Page")) throw new Error("Body content not preserved");

rmSync(TMP, { recursive: true });
console.log("[OK] save-scraped.mjs smoke check passed.");
```

- [ ] **Step 2: Run the smoke check — verify it fails (script doesn't exist yet)**

Run: `node scripts/__smoke__/save-scraped-test.mjs`
Expected: Failure with "Cannot find module" or similar error since `scripts/save-scraped.mjs` doesn't exist.

- [ ] **Step 3: Create the helper script**

Create `scripts/save-scraped.mjs`:

```js
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) continue;
    const key = arg.slice(2, eq);
    const value = arg.slice(eq + 1);
    args[key] = value;
  }
  return args;
}

const args = parseArgs(process.argv);
const required = ["universityId", "universityName", "cycle", "sourceUrl", "outputDir"];
for (const k of required) {
  if (!args[k]) {
    console.error(`Missing required arg: --${k}`);
    process.exit(2);
  }
}

// Read body from stdin
let body = "";
for await (const chunk of process.stdin) body += chunk;
body = body.trim();

const scrapedAt = new Date().toISOString();
const frontmatter = [
  "---",
  `universityId: ${args.universityId}`,
  `universityName: ${args.universityName}`,
  `cycle: ${args.cycle}`,
  `sourceUrl: ${args.sourceUrl}`,
  `scrapedAt: ${scrapedAt}`,
  "---",
  "",
  body,
  "",
].join("\n");

mkdirSync(args.outputDir, { recursive: true });
const outPath = join(args.outputDir, `${args.universityId}-${args.cycle}.md`);
writeFileSync(outPath, frontmatter, "utf8");
console.log(`[OK] Saved: ${outPath}`);
```

- [ ] **Step 4: Run the smoke check — verify it passes**

Run: `node scripts/__smoke__/save-scraped-test.mjs`
Expected: `[OK] save-scraped.mjs smoke check passed.`

- [ ] **Step 5: Delete the smoke test file (it served its purpose)**

Run: `rm -rf scripts/__smoke__/`

- [ ] **Step 6: Commit**

```bash
git add scripts/save-scraped.mjs
git commit -m "feat(deadlines): add save-scraped.mjs helper for scrape runbook"
```

---

## Task 8: Create extraction prompt template for Kerem's manual LLM step

**Files:**
- Create: `docs/superpowers/specs/extraction-prompt-template.md`

- [ ] **Step 1: Create the template doc**

Create `docs/superpowers/specs/extraction-prompt-template.md` with this content:

````markdown
# Deadline Extraction — Manual LLM Prompt Template

**Use this:** After `scripts/scrape-deadlines-runbook.md` has populated `tmp/scraped/` with markdown files, copy the prompt below into any LLM (Gemini, Claude, ChatGPT, etc.) along with the contents of every file in `tmp/scraped/`. Save the LLM's JSON output to `tmp/deadlines-extracted.json`.

You can iterate on this prompt freely — re-running with a better prompt does NOT require re-scraping.

---

## Prompt (copy-paste this part)

```
You are extracting application deadlines from a collection of Italian university admission pages. Each file in my input is a markdown document with frontmatter showing the universityId, universityName, cycle (bachelor/master/both), and the sourceUrl.

For EACH input file, produce one or more JSON entries describing the **non-EU application deadline(s)** found on that page. Output a single JSON array of all entries combined.

Each entry must have this exact shape:

{
  "universityId": <number from frontmatter>,
  "departmentSlug": "<string or null>",
  "cycle": "bachelor" | "master" | "both",
  "date": "YYYY-MM-DD" | "rolling" | "TBA",
  "note": "<short free-form context, e.g. 'Early round; regular ends Oct'>",
  "sourceUrl": "<copy from frontmatter>",
  "confidence": "high" | "medium" | "low"
}

Rules:
1. PRIORITIZE non-EU applicant deadlines over EU. If only EU is published, use confidence: "low" and note the limitation.
2. PRIORITIZE English-taught program deadlines over Italian-taught ones.
3. PRIORITIZE the FINAL (latest) round if multiple rounds exist. Mention earlier rounds in "note".
4. If the page covers ALL programs at the university (uniform deadline), set departmentSlug: null. The apply script will broadcast it to all departments of that uni.
5. If the page lists per-program deadlines, produce one entry PER program with departmentSlug filled (use the slug from the program URL or page text — verify against the canonical list of slugs at the end of this prompt).
6. If the deadline date is unclear, use "TBA" with confidence: "low" and explain in note.
7. If the page text is for a past academic year and there's no info on the next year, use the past year's date anyway — better than nothing. Mark confidence: "medium" and note "from past cycle".

Output ONLY the JSON array. No markdown, no commentary, no code fences.
```

---

## Canonical Department Slug Reference

(Copy this into the prompt context too, so the LLM can validate slugs.)

Department slugs are formed as `{universityId}:{slug}` where slug is from `app/data.ts`. The apply script will validate every entry against the real list. If the LLM cannot match a program to a slug, leave departmentSlug as null and the apply script will surface it for manual fix.

Get the canonical slug list by running:

```bash
node -e "import('./app/data.ts').then(m => console.log(JSON.stringify(m.universitiesData.map(u => ({ id: u.id, name: u.name, slugs: u.departments.map(d => d.slug) })), null, 2)))"
```

Or just consult `app/data.ts` directly.

---

## Example input file

```markdown
---
universityId: 1
universityName: Politecnico di Milano
cycle: bachelor
sourceUrl: https://www.polimi.it/en/.../deadlines
scrapedAt: 2026-05-28T14:32:15Z
---

# Politecnico di Milano — Bachelor Deadlines 2027/2028

Application opens 1 October 2026. Early admission round closes 11 June 2027.
Regular round closes 15 May 2027.
Non-EU applicants residing abroad: deadline 15 May 2027.
```

## Example output entry

```json
{
  "universityId": 1,
  "departmentSlug": null,
  "cycle": "bachelor",
  "date": "2027-05-15",
  "note": "Non-EU final deadline; early round ended 11 Jun 2027",
  "sourceUrl": "https://www.polimi.it/en/.../deadlines",
  "confidence": "high"
}
```

---

## Tips for iterating

- If the LLM hallucinates dates: add "Do NOT invent dates. If unclear, use 'TBA'." to the prompt.
- If departmentSlug is wrong: paste the canonical slug list into the prompt context explicitly.
- If confidence labels are too generous: define them explicitly — "high: date appears verbatim in text. medium: requires light interpretation. low: ambiguous or inferred."
````

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/extraction-prompt-template.md
git commit -m "docs(deadlines): add LLM extraction prompt template for manual step"
```

---

## Task 9: Create `scripts/apply-deadlines.mjs` with smoke check

**Files:**
- Create: `scripts/apply-deadlines.mjs`
- Create: `scripts/__fixtures__/apply-deadlines/input.json`
- Create: `scripts/__fixtures__/apply-deadlines/expected-overrides.txt`

**Behavior:** Reads `tmp/deadlines-extracted.json`, generates `DEPARTMENT_DEADLINE_OVERRIDES` map entries, idempotently merges into `app/data.ts`. If `departmentSlug` is `null`, broadcasts the entry to ALL departments of that university.

- [ ] **Step 1: Create test fixtures**

Create `scripts/__fixtures__/apply-deadlines/input.json`:

```json
[
  {
    "universityId": 1,
    "departmentSlug": "civil-engineering",
    "cycle": "bachelor",
    "date": "2027-05-15",
    "note": "Non-EU final deadline",
    "sourceUrl": "https://www.polimi.it/en/example",
    "confidence": "high"
  },
  {
    "universityId": 7,
    "departmentSlug": null,
    "cycle": "bachelor",
    "date": "2027-01-26",
    "note": "International candidates session",
    "sourceUrl": "https://www.unibocconi.it/example",
    "confidence": "high"
  }
]
```

Create `scripts/__fixtures__/apply-deadlines/expected-overrides.txt`:

```
"1:civil-engineering":
"7:business-world-bachelor-in-business":
"7:economics-and-management-for-arts-culture-and-communication":
```

(This file lists keys that MUST appear in the generated map after applying the fixture. The smoke check will assert each.)

- [ ] **Step 2: Write the failing smoke check**

Create `scripts/__smoke__/apply-deadlines-test.mjs`:

```js
import { execSync } from "node:child_process";
import { readFileSync, copyFileSync, rmSync, mkdirSync, existsSync } from "node:fs";

const FIXTURE_INPUT = "scripts/__fixtures__/apply-deadlines/input.json";
const EXPECTED_KEYS = "scripts/__fixtures__/apply-deadlines/expected-overrides.txt";
const TMP_INPUT = "tmp/deadlines-extracted.json";
const DATA_BACKUP = "app/data.ts.smoke-backup";

mkdirSync("tmp", { recursive: true });
copyFileSync(FIXTURE_INPUT, TMP_INPUT);
copyFileSync("app/data.ts", DATA_BACKUP);

try {
  execSync("node scripts/apply-deadlines.mjs", { stdio: "inherit" });
  const data = readFileSync("app/data.ts", "utf8");
  const expectedKeys = readFileSync(EXPECTED_KEYS, "utf8").trim().split("\n");
  for (const key of expectedKeys) {
    if (!data.includes(key)) throw new Error(`Missing key in data.ts: ${key}`);
  }
  if (!data.includes('DEPARTMENT_DEADLINES_LAST_CHECKED_AT = "2026-05-28"')) {
    throw new Error("LAST_CHECKED_AT was not updated to 2026-05-28");
  }
  console.log("[OK] apply-deadlines.mjs smoke check passed.");
} finally {
  copyFileSync(DATA_BACKUP, "app/data.ts");
  rmSync(DATA_BACKUP);
  rmSync(TMP_INPUT);
}
```

- [ ] **Step 3: Run the smoke check — verify it fails (script not implemented)**

Run: `node scripts/__smoke__/apply-deadlines-test.mjs`
Expected: Failure ("Cannot find module 'scripts/apply-deadlines.mjs'").

- [ ] **Step 4: Implement the apply script**

Create `scripts/apply-deadlines.mjs`:

```js
import { readFileSync, writeFileSync } from "node:fs";

const DATA_PATH = new URL("../app/data.ts", import.meta.url);
const EXTRACTED_PATH = new URL("../tmp/deadlines-extracted.json", import.meta.url);

const extracted = JSON.parse(readFileSync(EXTRACTED_PATH, "utf8"));
const source = readFileSync(DATA_PATH, "utf8");

// Parse universities from data.ts to look up department slugs for null-departmentSlug entries.
// We rely on the existing convention: each university entry has `id: N` followed by `departments: [`
// with `slug: "..."` entries inside.

function extractUniversityDepartments(src) {
  const map = new Map(); // id -> string[] of slugs
  const idRegex = /id:\s*(\d+)/g;
  let match;
  while ((match = idRegex.exec(src)) !== null) {
    const id = Number(match[1]);
    const blockStart = src.indexOf("departments: [", match.index);
    if (blockStart === -1) continue;
    const blockEnd = src.indexOf("]", blockStart);
    const block = src.slice(blockStart, blockEnd);
    const slugs = [...block.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
    map.set(id, slugs);
  }
  return map;
}

const uniDepts = extractUniversityDepartments(source);

// Expand null-slug entries to all departments of the uni.
const expanded = [];
for (const entry of extracted) {
  if (entry.departmentSlug) {
    expanded.push(entry);
  } else {
    const slugs = uniDepts.get(entry.universityId);
    if (!slugs) {
      console.warn(`[WARN] No departments found for uni ${entry.universityId}; skipping`);
      continue;
    }
    for (const slug of slugs) {
      expanded.push({ ...entry, departmentSlug: slug });
    }
  }
}

// Build override map entries.
const entries = expanded
  .map((e) => {
    const key = `"${e.universityId}:${e.departmentSlug}"`;
    const note = e.note ? `, note: ${JSON.stringify(e.note)}` : "";
    const value = `{ date: ${JSON.stringify(e.date)}${note}, sourceUrl: ${JSON.stringify(e.sourceUrl)} }`;
    return `  ${key}: ${value},`;
  })
  .sort();

const newMapBody = entries.join("\n");

// Replace the existing DEPARTMENT_DEADLINE_OVERRIDES body.
const mapStart = source.indexOf("export const DEPARTMENT_DEADLINE_OVERRIDES");
if (mapStart === -1) {
  throw new Error("DEPARTMENT_DEADLINE_OVERRIDES not found in app/data.ts — run Task 2 first.");
}
const bodyStart = source.indexOf("{", mapStart);
const bodyEnd = source.indexOf("};", bodyStart);
const before = source.slice(0, bodyStart + 1);
const after = source.slice(bodyEnd);

const newSource = `${before}\n${newMapBody}\n${after}`;

// Update LAST_CHECKED_AT to today.
const today = new Date().toISOString().slice(0, 10);
const updated = newSource.replace(
  /DEPARTMENT_DEADLINES_LAST_CHECKED_AT = "[^"]+"/,
  `DEPARTMENT_DEADLINES_LAST_CHECKED_AT = "${today}"`
);

writeFileSync(DATA_PATH, updated, "utf8");
console.log(`[OK] Applied ${expanded.length} deadline entries to app/data.ts.`);
console.log(`[OK] DEPARTMENT_DEADLINES_LAST_CHECKED_AT set to ${today}.`);
```

- [ ] **Step 5: Run the smoke check — verify it passes**

Run: `node scripts/__smoke__/apply-deadlines-test.mjs`
Expected: `[OK] apply-deadlines.mjs smoke check passed.`

- [ ] **Step 6: Run TS build to confirm data.ts is still valid after the script touched it**

The smoke test restores data.ts after running. Just sanity-check:
Run: `npm run build`
Expected: Build succeeds (no actual changes since smoke test restored).

- [ ] **Step 7: Delete the smoke test file**

Run: `rm -rf scripts/__smoke__/`

- [ ] **Step 8: Commit**

```bash
git add scripts/apply-deadlines.mjs scripts/__fixtures__/apply-deadlines/
git commit -m "feat(deadlines): add apply-deadlines.mjs to merge extracted JSON into data.ts"
```

---

## Task 10: Create `scripts/check-deadlines.mjs` validation guard + wire to package.json

**Files:**
- Create: `scripts/check-deadlines.mjs`
- Create: `scripts/__fixtures__/check-deadlines/valid.ts`
- Create: `scripts/__fixtures__/check-deadlines/invalid.ts`
- Modify: `package.json`

**Behavior:** Validates `DEPARTMENT_DEADLINE_OVERRIDES` against the real university+department data. Catches: invalid IDs, unknown slugs, malformed dates, non-HTTPS URLs.

- [ ] **Step 1: Create test fixtures**

Create `scripts/__fixtures__/check-deadlines/valid.ts`:

```ts
// Minimal mock of app/data.ts shape for testing the check script.
export const universitiesData = [
  { id: 1, departments: [{ slug: "civil-engineering" }, { slug: "interaction-design" }] },
  { id: 7, departments: [{ slug: "global-law" }] },
];

export const DEPARTMENT_DEADLINE_OVERRIDES = {
  "1:civil-engineering": { date: "2027-05-15", note: "ok", sourceUrl: "https://example.com" },
  "7:global-law": { date: "rolling", sourceUrl: "https://example.com" },
};
```

Create `scripts/__fixtures__/check-deadlines/invalid.ts`:

```ts
// Each commented line below is a defect this fixture exercises.
export const universitiesData = [
  { id: 1, departments: [{ slug: "civil-engineering" }] },
];

export const DEPARTMENT_DEADLINE_OVERRIDES = {
  "1:civil-engineering": { date: "May 15", sourceUrl: "http://example.com" }, // bad date format + non-HTTPS
  "99:unknown-program": { date: "2027-05-15", sourceUrl: "https://example.com" }, // unknown uni
  "1:nonexistent-slug": { date: "2027-05-15", sourceUrl: "https://example.com" }, // unknown slug
};
```

- [ ] **Step 2: Write the failing smoke check**

Create `scripts/__smoke__/check-deadlines-test.mjs`:

```js
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync("scripts/check-deadlines.mjs")) {
  console.error("Script not yet created — expected failure mode.");
  process.exit(1);
}

// Valid fixture: should pass.
const validResult = execSync(
  "node scripts/check-deadlines.mjs --data=scripts/__fixtures__/check-deadlines/valid.ts",
  { encoding: "utf8", stdio: "pipe" }
);
if (!validResult.includes("[OK]")) {
  throw new Error("Valid fixture should have passed but didn't");
}

// Invalid fixture: should fail with at least 3 errors.
let invalidFailed = false;
let invalidOutput = "";
try {
  execSync(
    "node scripts/check-deadlines.mjs --data=scripts/__fixtures__/check-deadlines/invalid.ts",
    { encoding: "utf8", stdio: "pipe" }
  );
} catch (err) {
  invalidFailed = true;
  invalidOutput = err.stdout + err.stderr;
}
if (!invalidFailed) throw new Error("Invalid fixture should have failed but passed");
if (!invalidOutput.includes("bad date format") && !invalidOutput.includes("Invalid date")) {
  throw new Error("Did not catch invalid date format");
}
if (!invalidOutput.includes("Unknown university") && !invalidOutput.includes("99")) {
  throw new Error("Did not catch unknown university ID");
}
if (!invalidOutput.includes("Unknown slug") && !invalidOutput.includes("nonexistent")) {
  throw new Error("Did not catch unknown department slug");
}
if (!invalidOutput.includes("not HTTPS") && !invalidOutput.includes("http://")) {
  throw new Error("Did not catch non-HTTPS URL");
}

console.log("[OK] check-deadlines.mjs smoke check passed.");
```

- [ ] **Step 3: Run the smoke check — verify it exits with code 1 (script not implemented)**

Run: `node scripts/__smoke__/check-deadlines-test.mjs; echo "exit=$?"`
Expected: `exit=1` (the smoke check itself exits early because the script doesn't exist yet).

- [ ] **Step 4: Implement the check script**

Create `scripts/check-deadlines.mjs`:

```js
import { readFileSync } from "node:fs";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) continue;
    args[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  return args;
}

const args = parseArgs(process.argv);
const dataPath = args.data || "app/data.ts";
const source = readFileSync(new URL(`../${dataPath}`, import.meta.url), "utf8");

const errors = [];

// 1. Extract universitiesData (id + slugs).
const uniDepts = new Map();
const idRegex = /id:\s*(\d+)/g;
let match;
while ((match = idRegex.exec(source)) !== null) {
  const id = Number(match[1]);
  const blockStart = source.indexOf("departments: [", match.index);
  if (blockStart === -1) continue;
  const blockEnd = source.indexOf("]", blockStart);
  const block = source.slice(blockStart, blockEnd);
  const slugs = [...block.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
  uniDepts.set(id, new Set(slugs));
}

// 2. Extract DEPARTMENT_DEADLINE_OVERRIDES entries.
const mapStart = source.indexOf("DEPARTMENT_DEADLINE_OVERRIDES");
if (mapStart === -1) {
  console.error("[FAIL] DEPARTMENT_DEADLINE_OVERRIDES not found in data");
  process.exit(1);
}
const bodyStart = source.indexOf("{", mapStart);
const bodyEnd = source.indexOf("};", bodyStart);
const body = source.slice(bodyStart, bodyEnd);
const entryRegex = /"(\d+):([^"]+)":\s*\{([^}]+)\}/g;

let entryCount = 0;
while ((match = entryRegex.exec(body)) !== null) {
  entryCount++;
  const uniId = Number(match[1]);
  const slug = match[2];
  const value = match[3];

  // Check uni exists.
  if (!uniDepts.has(uniId)) {
    errors.push(`Unknown university ID: ${uniId} (key: ${uniId}:${slug})`);
    continue;
  }

  // Check slug exists.
  if (!uniDepts.get(uniId).has(slug)) {
    errors.push(`Unknown slug: "${slug}" for university ${uniId}`);
  }

  // Check date format.
  const dateMatch = value.match(/date:\s*"([^"]+)"/);
  if (!dateMatch) {
    errors.push(`Missing date in ${uniId}:${slug}`);
  } else {
    const date = dateMatch[1];
    const isISO = /^\d{4}-\d{2}-\d{2}$/.test(date);
    const isRolling = date === "rolling";
    const isTBA = date === "TBA";
    if (!isISO && !isRolling && !isTBA) {
      errors.push(`Invalid date format in ${uniId}:${slug}: "${date}" (bad date format; expected YYYY-MM-DD, "rolling", or "TBA")`);
    }
  }

  // Check sourceUrl.
  const urlMatch = value.match(/sourceUrl:\s*"([^"]+)"/);
  if (!urlMatch) {
    errors.push(`Missing sourceUrl in ${uniId}:${slug}`);
  } else if (!urlMatch[1].startsWith("https://")) {
    errors.push(`sourceUrl not HTTPS in ${uniId}:${slug}: ${urlMatch[1]} (http:// not allowed)`);
  }
}

if (errors.length > 0) {
  console.error(`[FAIL] ${errors.length} validation error(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

console.log(`[OK] Validated ${entryCount} deadline override(s) in ${dataPath}.`);
```

- [ ] **Step 5: Run the smoke check — verify it passes**

Run: `node scripts/__smoke__/check-deadlines-test.mjs`
Expected: `[OK] check-deadlines.mjs smoke check passed.`

- [ ] **Step 6: Add `check:deadlines` to package.json scripts**

Open `package.json` and add to the `"scripts"` block, alphabetically between `check:data` and `check:editorial-ui`:

```json
"check:deadlines": "node scripts/check-deadlines.mjs",
```

- [ ] **Step 7: Run the npm script against the real (empty-map) data.ts**

Run: `npm run check:deadlines`
Expected: `[OK] Validated 0 deadline override(s) in app/data.ts.` (empty map is valid.)

- [ ] **Step 8: Delete the smoke test file**

Run: `rm -rf scripts/__smoke__/`

- [ ] **Step 9: Commit**

```bash
git add scripts/check-deadlines.mjs scripts/__fixtures__/check-deadlines/ package.json
git commit -m "feat(deadlines): add check-deadlines validation guard + npm script"
```

---

## Task 11 (Execution): Run pilot scrape on first 2 universities

**Files:**
- Read: `lib/deadlines/targets.ts`
- Read: `scripts/scrape-deadlines-runbook.md`
- Write: `tmp/scraped/*.md`

**Purpose:** Validate the scrape runbook works end-to-end on 2 universities before doing all 15. Catch problems early (cookie banners, wrong URL, content extraction issues).

- [ ] **Step 1: Follow `scripts/scrape-deadlines-runbook.md` for ONLY university IDs 1 and 7 (Polimi + Bocconi)**

Skip steps for all other universities. Use the Chrome browsing MCP to visit each URL listed for IDs 1 and 7.

- [ ] **Step 2: Verify output files exist and have correct frontmatter**

Run: `ls -la tmp/scraped/ && head -10 tmp/scraped/1-bachelor.md`
Expected: Files present. Frontmatter has `universityId: 1`, `cycle: bachelor`, `sourceUrl: https://...`, `scrapedAt: 2026-05-...`.

- [ ] **Step 3: Inspect one file end-to-end — is the deadline information present?**

Open one of the scraped files. Read through the markdown body. Confirm:
- A deadline date is visible somewhere in the content (or the page genuinely doesn't have one)
- No raw HTML leaks (`<div>`, `<span>`, etc. should not appear in body)
- Cookie banner text is NOT in the body
- Links to deeper deadline pages are preserved as markdown links

If the scrape quality is poor, debug the Chrome content extraction in the runbook before proceeding. **Do not run the full scrape on bad output.**

- [ ] **Step 4 (Kerem check-in): Show the 2 scraped files to Kerem and ask "Bunlar yeterli mi?"**

Surface the file paths and short previews. Wait for Kerem's confirmation before continuing to Task 12.

---

## Task 12 (Execution): Run full scrape on all 15 universities

**Files:**
- Write: `tmp/scraped/*.md`

- [ ] **Step 1: Follow `scripts/scrape-deadlines-runbook.md` for ALL targets in `lib/deadlines/targets.ts`**

For each `target` × `urlEntry` not already in `tmp/scraped/`, follow the runbook procedure.

- [ ] **Step 2: Verify completion**

Run: `ls tmp/scraped/*.md | wc -l`
Expected count: equal to total URL entries in `DEADLINE_TARGETS` minus failures.

Run: `ls tmp/scraped/*.FAILED.txt 2>/dev/null || echo "no failures"`
If failures exist, list them for Kerem and ask whether to retry or skip.

- [ ] **Step 3 (Kerem handoff): Inform Kerem the scrape is complete**

Message: "Scrape tamamlandı. `tmp/scraped/` klasöründe N dosya var. Şimdi LLM extraction senin elinde — `docs/superpowers/specs/extraction-prompt-template.md` dosyasını oku, prompt'u istediğin LLM'e at, `tmp/scraped/` içindeki dosyalarla beraber yedir, çıkan JSON'ı `tmp/deadlines-extracted.json` olarak kaydet. Geri döndüğünde Task 13'e geçeriz."

---

## Task 13 (Execution, after Kerem's LLM step): Apply extracted JSON to data.ts

**Prerequisites:** `tmp/deadlines-extracted.json` exists.

- [ ] **Step 1: Verify the JSON exists and is valid**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('tmp/deadlines-extracted.json','utf8')).length + ' entries')"`
Expected: A number > 0.

- [ ] **Step 2: Run the apply script**

Run: `node scripts/apply-deadlines.mjs`
Expected: `[OK] Applied N deadline entries to app/data.ts.`

- [ ] **Step 3: Verify TypeScript still builds**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Run the validation guard**

Run: `npm run check:deadlines`
Expected: `[OK] Validated N deadline override(s) in app/data.ts.`

- [ ] **Step 5: If check fails, inspect errors and fix in data.ts manually**

Common fixes: typo in a slug (slug must match `app/data.ts` exactly), date in wrong format, non-HTTPS sourceUrl. Each error message includes the key — go to that entry and fix.

Re-run `npm run check:deadlines` until it passes.

- [ ] **Step 6: Commit**

```bash
git add app/data.ts
git commit -m "data(deadlines): apply scraped non-EU application deadlines for 15 universities"
```

---

## Task 14: Open PR + Kerem final review

- [ ] **Step 1: Verify git status is clean except for the deadline-related changes**

Run: `git status`
Expected files in the commit history:
- `app/data.ts` (modified)
- `lib/deadlines/targets.ts` (new)
- `scripts/scrape-deadlines-runbook.md` (new)
- `scripts/save-scraped.mjs` (new)
- `scripts/apply-deadlines.mjs` (new)
- `scripts/check-deadlines.mjs` (new)
- `scripts/__fixtures__/...` (new)
- `docs/superpowers/specs/extraction-prompt-template.md` (new)
- `package.json` (modified)
- `.gitignore` (modified)

No `tmp/` should appear (it's gitignored).

- [ ] **Step 2: Push the branch**

Run: `git push -u origin HEAD`
Expected: Push succeeds.

- [ ] **Step 3: Open PR with gh CLI**

Run:
```bash
gh pr create --title "feat(deadlines): scrape and store non-EU application deadlines for top 15 universities" --body "$(cat <<'EOF'
## Summary

- Adds `ProgramDeadline` type + `DEPARTMENT_DEADLINE_OVERRIDES` map to `app/data.ts` (same pattern as existing language/duration/level overrides)
- Three-stage pipeline:
  1. Automated scrape via Chrome browsing skill → `tmp/scraped/*.md`
  2. Manual LLM extraction by Kerem → `tmp/deadlines-extracted.json`
  3. Automated apply script → `DEPARTMENT_DEADLINE_OVERRIDES` in data.ts
- Validation guard: `npm run check:deadlines`
- Scope: top 15 popular Italian universities for non-EU students

## Test plan

- [x] `npm run build` passes
- [x] `npm run check:deadlines` passes
- [ ] Kerem manually spot-checks 5 random deadline entries against the source URLs
- [ ] Review `app/data.ts` diff for entries that look obviously wrong

## Out of scope

- UI rendering (separate spec/plan)
- EU/Italian-citizen deadlines
- Auto-refresh (one-shot for now; future spec can add cron)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL is returned. Surface it to Kerem.

- [ ] **Step 4 (Kerem action): Final review and merge**

Kerem opens the PR, spot-checks 5 deadline entries by clicking through to the `sourceUrl`, and merges if satisfied.

---

## Self-Review Notes

The plan covers every section of the spec:
- ✅ Data model (Tasks 1, 2)
- ✅ Curated targets (Tasks 4, 5)
- ✅ Scrape pipeline (Tasks 6, 7, 11, 12)
- ✅ LLM extraction (Task 8 — template; Task 12 step 3 — Kerem hands off)
- ✅ Apply pipeline (Tasks 9, 13)
- ✅ Verification (Task 10, Task 13 step 4)
- ✅ Out of scope: UI rendering explicitly not in any task
- ✅ Acceptance criteria from spec mapped to tasks 11–14

No placeholders. All code blocks include actual content. Method signatures consistent across tasks (`extractUniversityDepartments` used in both Task 9 and Task 10 with same shape).

Known open items (deliberately so, surfaced for Kerem in Task 11 step 4 and Task 12 step 2):
- 9 of 15 URLs are best-guess in Task 5 — runbook flags these for verification
- LLM choice and prompt iteration are Kerem's call — Task 8 provides a starting template

---

(End of plan)
