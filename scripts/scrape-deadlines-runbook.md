# Scrape Deadlines — Claude Execution Runbook

**Purpose:** Visit each admission URL in `lib/deadlines/targets.ts` and save its cleaned page content to `tmp/scraped/` as markdown. No LLM extraction here — that happens in a separate manual step driven by Kerem (see `docs/superpowers/specs/extraction-prompt-template.md`).

## Prerequisites

- The Chrome browsing skill (`mcp__plugin_superpowers-chrome_chrome__use_browser`) must be available.
- `lib/deadlines/targets.ts` must be populated with at least one target.
- `tmp/scraped/` will be created automatically; if it already contains files, the runbook resumes (does not re-scrape).
- `scripts/save-scraped.mjs` helper (see Task 7) must exist.

## Procedure

For each `target` in `DEADLINE_TARGETS`, for each `urlEntry` in `target.admissionUrls`:

### 1. Compute output filename

`tmp/scraped/{target.universityId}-{urlEntry.cycle}.md`

Example: `tmp/scraped/1-bachelor.md`

If a target has multiple URL entries for the same cycle (rare), suffix with an index: `1-bachelor-2.md`.

### 2. Skip if file already exists (resume support)

```bash
test -f tmp/scraped/{id}-{cycle}.md && echo "SKIP" || echo "SCRAPE"
```

If SKIP, move to next URL. This makes the runbook safe to re-run after partial failures.

### 3. Open URL in Chrome via MCP

Use the `mcp__plugin_superpowers-chrome_chrome__use_browser` tool. Navigate to `urlEntry.url`. Wait for page load. If a cookie banner appears, dismiss or ignore it (its text should NOT enter the saved content).

### 4. Extract main page content as markdown

Read the main `<main>`, `<article>`, or primary content container. Exclude:
- Cookie banners
- Top nav / global header / breadcrumbs
- Footer
- Side navigation
- Newsletter signups / "share this page" widgets

Convert to markdown. Preserve: headings (H1-H4), lists, tables, paragraphs, bold/italic for emphasis, hyperlink URLs (so deadlines that link out remain auditable for the LLM extraction step).

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

If a URL fails (navigation timeout, 404, page returns no content, etc.), log the error to console and continue. Write a placeholder file `tmp/scraped/{id}-{cycle}.FAILED.txt` containing the error message — this surfaces to Kerem for manual fallback during the extraction step.

## Completion check

After processing all targets, verify:

```bash
ls tmp/scraped/*.md | wc -l
```

Expected count: number of URL entries in `DEADLINE_TARGETS` minus any that failed. List failed entries:

```bash
ls tmp/scraped/*.FAILED.txt 2>/dev/null
```

If failures exist, surface them to Kerem before proceeding to LLM extraction (Task 12 hand-off).

## When to use this runbook

- **Task 11 (pilot scrape):** Run for ONLY universityIds 1 and 7 (Polimi + Bocconi) to validate the procedure end-to-end before doing the rest.
- **Task 12 (full scrape):** Run for all targets in `DEADLINE_TARGETS`.

In both cases, the resume logic (Step 2) means it's safe to invoke as many times as needed.
