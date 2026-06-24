# Siena Program Details Import Design

## Goal

Import the University of Siena English-taught programme admission details into the existing Supabase-backed `program_admission_details` flow, using the same dry-run-first pattern as the previous university imports.

The source research lives in:

- `university-of-siena-english-program-admission-requirements/outline.yaml`
- `university-of-siena-english-program-admission-requirements/fields.yaml`
- `university-of-siena-english-program-admission-requirements/results/*.json`

The source set has 19 JSON files: 2 bachelor, 16 master, and 1 single-cycle programme.

## Scope

Add a Siena-specific import script that:

- Reads the 19 researched JSON result files.
- Validates required source fields before planning an import.
- Fetches existing Supabase `universities`, `university_departments`, and `program_admission_details` rows.
- Matches Siena source programmes to existing Siena departments by normalized `name + level`.
- Plans missing departments when a source programme is not already present.
- Converts rich JSON objects and arrays into the existing text/jsonb database shape.
- Writes a dry-run report by default.

The first implementation phase stops at dry-run. Applying the import to Supabase is a later explicit step after the report is reviewed.

## Non-Goals

- No schema migration is planned.
- No UI changes are planned.
- No broad refactor of the existing import scripts is planned.
- No automatic overwrite of live Supabase data will happen in the first phase.

## Existing Pattern

The implementation should follow the current importer family, especially `scripts/import-ca-foscari-program-details.mjs` and the later import scripts.

Key behaviours to preserve:

- `--dry-run` is the default mode.
- `--apply` is explicit.
- `.env.local` is read locally for Supabase credentials.
- Dry-run uses the anon key.
- Apply uses `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
- Detail rows are upserted on `department_id`.
- If apply mutates departments and later fails, rollback restores previous admission detail rows and department changes.
- A JSON report is written under `output/`.

## Script

Create:

```text
scripts/import-siena-program-details.mjs
```

Core constants:

```text
SIENA_UNIVERSITY_ID = 16
EXPECTED_SOURCE_FILE_COUNT = 19
SOURCE_GENERATED_AT = "2026-06-22"
RESULTS_DIR = "university-of-siena-english-program-admission-requirements/results"
REPORT_PATH = "output/siena-program-details-import-report.json"
```

`SIENA_UNIVERSITY_ID` must be verified from the live/local data before implementation. The local seed currently lists University of Siena at `app/data.ts`, but Supabase is authoritative for import execution.

## Source Validation

Each source JSON must include at least:

- `program_name`
- `level`
- `teaching_language`
- `official_program_url`
- `required_documents`
- `source_quotes`
- `uncertain`
- `uncertainty_notes`

Array fields must be arrays:

- `required_documents`
- `source_quotes`
- `uncertain`
- `uncertainty_notes`

The script should fail fast if:

- The source file count is not 19.
- A source JSON is malformed.
- A required field is missing.
- A required array field is not an array.
- A `level` value is not one of `bachelor`, `master`, or `single-cycle`.
- A teaching language cannot normalize to at least English.

## Normalization

Use the existing importer conventions:

- Normalize names with NFKD diacritic stripping, lowercasing, `&` to `and`, and non-alphanumeric collapse.
- Canonical department names should remove `[uncertain]` markers and trailing bracket notes.
- Slugs should be generated from canonical source names when a new department is needed.
- Duration should be `3` for bachelor, `2` for master, and `6` for single-cycle.
- Languages should include `en`; include `it` only when the teaching language explicitly indicates Italian.

Siena source fields are richer than the database text columns. Reuse the existing `optionalText()` approach so object and array fields become readable semicolon-separated text rather than raw JSON key dumps.

`source_quotes` entries use `supports_fields`; normalize those into the app model's `field_refs` shape.

## Matching and Planning

Fetch Siena departments from Supabase and build:

- `byIdentityKey`: normalized department name + level
- `bySlug`: existing slug lookup, for aliases if needed
- `usedSlugs`: to avoid slug collisions when creating missing departments

The initial design does not require known aliases. If dry-run reveals mismatches, add a small `SOURCE_TO_EXISTING_SLUG_ALIASES` map before applying.

The dry-run report should include:

- `universityId`
- `mode`
- `sourceFiles`
- `existingDepartments`
- `matchedExisting`
- `departmentCorrections`
- `newDepartments`
- `duplicateNameDifferentLevel`
- `sourceWithoutExisting`
- `existingWithoutSource`
- `programPlans`
- `warnings`

This is the same shape used by earlier import scripts so the report is easy to compare.

## Detail Payload Mapping

Map each source JSON into `program_admission_details`:

- `raw_program_name` <- `program_name`
- `raw_level` <- `level`
- `raw_teaching_language` <- `teaching_language`
- `campus` <- `campus`
- `degree_class` <- `degree_class`
- `admission_type` <- `admission_type`
- `academic_requirements` <- readable text from `academic_requirements`
- `language_requirements` <- readable text from `language_requirements`
- `application_deadline_eu` <- readable text from `application_deadline_eu`
- `application_deadline_non_eu` <- readable text from `application_deadline_non_eu`
- `required_documents` <- normalized string array
- `entry_exam_or_test` <- readable text from `entry_exam_or_test`
- `tuition_or_fees_link` <- `tuition_or_fees_link`
- `official_program_url` <- `official_program_url`
- `official_call_url` <- `official_call_url`
- `source_quotes` <- normalized quote objects
- `uncertain` <- normalized string array
- `uncertainty_notes` <- normalized string array
- `source_file` <- source JSON filename

Do not strip uncertainty information globally. Preserve `uncertain` and `uncertainty_notes`; only remove marker syntax when it would corrupt identifiers such as department names.

## Supabase Constraints

No new table is created, so the 2026 Supabase changelog item about new tables not being automatically exposed to the Data API does not require a schema change here. The existing `supabase/program_admission_details.sql` already enables RLS and grants public read access while service-role writes remain explicit.

The apply path must continue using a service role or secret key only in the local Node script. No service-role key may be exposed in browser code or `NEXT_PUBLIC_*` variables.

## Verification

Before dry-run:

```bash
for f in university-of-siena-english-program-admission-requirements/results/*.json; do
  python3 ~/.codex/skills/research/validate_json.py \
    -f university-of-siena-english-program-admission-requirements/fields.yaml \
    -j "$f"
done
```

Dry-run:

```bash
node scripts/import-siena-program-details.mjs --dry-run
```

Review:

- `sourceFiles` must be 19.
- Unexpected aliases or department corrections must be inspected before apply.
- New departments must match the 19 official Siena English-taught programme list.
- High-uncertainty source programmes remain importable because uncertainty is preserved in JSONB fields.

Later apply phase:

```bash
node scripts/import-siena-program-details.mjs --apply
npm run check:program-details
node scripts/check-universities-server-compose.mjs
```

After apply, `scripts/check-program-details.mjs` should include a Siena check with expected detail count `19`.

## Known Data Risks

The source research is structurally valid and official-source only, but some programme fields remain intentionally uncertain:

- Dentistry and Dental Prosthodontics uses a programme-specific restricted-access call. A 2026/2027 call was not found during research, so 2025/2026 details are preserved only as marked fallback data.
- Chemistry uses 2026/2027 central admissions pages, while some programme-specific academic/test rules come from official 2025/2026 teaching regulations.
- Engineering Management has several programme-specific details that are not clearly exposed through public `apply.unisi.it` pages.

These risks should not block dry-run. They should be visible in `uncertain` and `uncertainty_notes` after import.
