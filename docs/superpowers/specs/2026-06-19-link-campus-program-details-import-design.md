# Link Campus Program Details Import Design

## Goal

Import the six researched Link Campus University English bachelor/master admission requirement JSON files into Supabase, populating `program_admission_details` and adding or correcting `university_departments` rows only when the current database lacks an exact program match.

## Scope

This is a data import task, not a schema change. It uses the existing Supabase tables:

- `universities`
- `university_departments`
- `program_admission_details`

The source files are under `link-campus-english-program-admission-requirements/results/*.json`. The expected source count is six.

## Architecture

Create a dedicated Node script at `scripts/import-link-campus-program-details.mjs`, following the existing `scripts/import-*-program-details.mjs` pattern.

The script supports two modes:

- `--dry-run`: read source JSON, fetch Supabase rows, build an import plan, and write a report without mutating Supabase.
- `--apply`: execute the same plan, upsert admission details, verify database state, and write the same report with apply results.

The script loads `.env.local`, uses `NEXT_PUBLIC_SUPABASE_URL`, uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` for dry-run reads, and uses `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` for apply writes.

## Data Flow

1. Load and validate the six source JSON files.
2. Find the Link Campus University row in `universities` by normalized name candidates.
3. Fetch all `university_departments` for that university.
4. Normalize source program name, level, teaching language, and degree class.
5. Match each source program to an existing department by canonical name and level.
6. Plan new department inserts when no match exists.
7. Build one `program_admission_details` payload per source file.
8. In apply mode, insert missing departments, resolve department IDs, snapshot existing details, upsert details, and verify all six rows.
9. If any apply step fails after mutation, restore snapshotted admission detail rows and delete newly inserted departments.

## Matching Rules

The source program names are the canonical import names unless a small override is needed to match existing DB naming. The first implementation should include explicit overrides only for known Link Campus naming differences discovered in the source files.

Levels must be one of `bachelor`, `master`, or `single-cycle`. Languages are normalized to `["en"]` when `teaching_language` contains English.

## Error Handling

The script refuses to apply when:

- The source count is not six.
- The Link Campus university row cannot be found.
- A source JSON is missing required fields.
- A level or language cannot be normalized.
- Duplicate source identity keys are detected.
- Apply verification cannot find all expected `program_admission_details` rows.

## Verification

Run:

```bash
node scripts/import-link-campus-program-details.mjs --dry-run
node scripts/import-link-campus-program-details.mjs --apply
npm run check:program-details
node scripts/check-universities-server-compose.mjs
```

The import report is written to `output/link-campus-program-details-import-report.json`.

## Notes

This task does not create tables, policies, functions, views, or storage rules. Existing RLS and grants for `program_admission_details` remain unchanged.
