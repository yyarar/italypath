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

Get the canonical slug list by running this from the project root:

```bash
node --input-type=module -e "import('./app/data.ts').then(m => console.log(JSON.stringify(m.universitiesData.map(u => ({ id: u.id, name: u.name, slugs: u.departments.map(d => d.slug) })), null, 2)))"
```

Or just consult `app/data.ts` directly — it's the authoritative source.

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
- If you get a wall of code fences instead of clean JSON: prepend "Reminder: output ONLY JSON, no code fences, no `​`​`​`json wrapper."

## Workflow recap

1. Scrape script populates `tmp/scraped/*.md` (Task 11/12)
2. You take that folder and run this prompt with your LLM of choice
3. Save the JSON output to `tmp/deadlines-extracted.json`
4. Run `node scripts/apply-deadlines.mjs` (Task 13) to merge into `app/data.ts`
