# Link Campus Program Details Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import six researched Link Campus English programme admission-detail JSON files into Supabase using a repeatable dry-run/apply script.

**Architecture:** Add a dedicated Node script that mirrors the existing university import scripts. It reads source JSON, creates a deterministic plan, supports dry-run/apply modes, writes an import report, and verifies Supabase after apply.

**Tech Stack:** Node.js ESM, `@supabase/supabase-js`, existing `.env.local`, existing Supabase tables.

---

### Task 1: Add Link Campus Import Script

**Files:**
- Create: `scripts/import-link-campus-program-details.mjs`

- [x] **Step 1: Create script skeleton**

Create `scripts/import-link-campus-program-details.mjs` with imports, constants, mode parsing, `.env.local` loading, Supabase client creation, and normalization helpers copied in style from `scripts/import-tor-vergata-program-details.mjs`.

- [x] **Step 2: Add source loading**

Read `link-campus-english-program-admission-requirements/results/*.json`, require exactly six files, and validate these fields:

```js
[
  "program_name",
  "level",
  "teaching_language",
  "official_program_url",
  "source_quotes",
  "uncertain",
]
```

Require `source_quotes` to be non-empty and normalize `required_documents`, `source_quotes`, `uncertain`, and `uncertainty_notes` into arrays for database payloads.

- [x] **Step 3: Add Supabase fetch helpers**

Fetch the Link Campus university row by normalized names containing `link campus`, then fetch its `university_departments` rows ordered by `sort_order` and `name`.

- [x] **Step 4: Add plan builder**

Match source programs to departments by normalized canonical name plus level. Insert missing departments with generated slug, language `["en"]`, duration `3` for bachelor and `2` for master. Record warnings for duplicates and source rows without existing departments.

- [x] **Step 5: Add detail payload builder**

Map source JSON fields to `program_admission_details` columns:

```js
{
  department_id,
  university_id,
  raw_program_name,
  raw_level,
  raw_teaching_language,
  campus,
  degree_class,
  admission_type,
  academic_requirements,
  language_requirements,
  application_deadline_eu,
  application_deadline_non_eu,
  required_documents,
  entry_exam_or_test,
  tuition_or_fees_link,
  official_program_url,
  official_call_url,
  source_quotes,
  uncertain,
  uncertainty_notes,
  source_file,
}
```

- [x] **Step 6: Add apply, rollback, and verify**

In `--apply`, insert new departments, resolve department IDs, snapshot existing admission detail rows, upsert details on `department_id`, verify that all expected rows exist with the expected `source_file`, and rollback inserted details/departments on failure.

- [x] **Step 7: Add report output**

Write `output/link-campus-program-details-import-report.json` with mode, university, source count, matched count, new departments, warnings, program plans, and apply result.

### Task 2: Run Dry-Run and Review Plan

**Files:**
- Generated: `output/link-campus-program-details-import-report.json`

- [x] **Step 1: Run dry-run**

```bash
node scripts/import-link-campus-program-details.mjs --dry-run
```

Expected: source count `6/6`, no apply mutation, report path printed.

- [x] **Step 2: Inspect report**

Confirm planned new department count and warnings are acceptable. Refuse apply if the university row is wrong, source count is wrong, or program names/levels map to obviously incorrect existing departments.

### Task 3: Apply and Verify

**Files:**
- Generated: `output/link-campus-program-details-import-report.json`

- [x] **Step 1: Run apply**

```bash
node scripts/import-link-campus-program-details.mjs --apply
```

Expected: six detail upserts and no verification failure.

- [x] **Step 2: Run project checks**

```bash
npm run check:program-details
node scripts/check-universities-server-compose.mjs
```

Expected: both commands pass.

- [x] **Step 3: Summarize imported rows**

Read the report and report the matched/new department count, detail upsert count, warnings, and output path.
