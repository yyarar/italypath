# Siena Program Details Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dry-run-first Siena programme admission details importer that reads the 19 researched UNISI JSON files and produces a Supabase import plan/report without mutating live data.

**Architecture:** Follow the existing single-file importer pattern used by `scripts/import-ca-foscari-program-details.mjs`: load source JSON, normalize source programmes, fetch Supabase university/departments/details, plan department/detail changes, and write a report. The first execution phase stops at `--dry-run`; `--apply` support can exist in the script but must not be run until the dry-run report is reviewed.

**Tech Stack:** Node.js ESM, `@supabase/supabase-js` v2, existing `.env.local` loader pattern, Supabase tables `universities`, `university_departments`, `program_admission_details`, existing research validator `~/.codex/skills/research/validate_json.py`.

---

## File Structure

- Create: `scripts/import-siena-program-details.mjs`
  - Siena-specific import planner and optional apply runner.
  - Owns source loading, normalization, Supabase fetches, planning, dry-run report writing, and apply rollback support.
- Read only: `university-of-siena-english-program-admission-requirements/results/*.json`
  - Source research data. Do not edit during importer implementation.
- Read only: `university-of-siena-english-program-admission-requirements/fields.yaml`
  - Used only for preflight validation with the existing research validator.
- Read only: `supabase/program_admission_details.sql`
  - Confirms DB column shape. No migration is expected.
- No change in first phase: `scripts/check-program-details.mjs`
  - Siena expected-count guard is intentionally deferred until after dry-run review and before live apply.

---

### Task 1: Preflight Source Validation

**Files:**
- Read: `university-of-siena-english-program-admission-requirements/results/*.json`
- Read: `university-of-siena-english-program-admission-requirements/fields.yaml`

- [ ] **Step 1: Run schema validation for all Siena source JSON files**

Run:

```bash
for f in university-of-siena-english-program-admission-requirements/results/*.json; do
  python3 ~/.codex/skills/research/validate_json.py \
    -f university-of-siena-english-program-admission-requirements/fields.yaml \
    -j "$f"
done
```

Expected: every file reports 100% field coverage and exits successfully.

- [ ] **Step 2: Confirm source count and level distribution**

Run:

```bash
ruby -rjson - <<'RUBY'
base = "university-of-siena-english-program-admission-requirements/results"
files = Dir["#{base}/*.json"].sort
levels = Hash.new(0)
files.each do |path|
  levels[JSON.parse(File.read(path))["level"]] += 1
end
puts "files=#{files.size}"
puts levels.sort.to_h
RUBY
```

Expected:

```text
files=19
{"bachelor"=>2, "master"=>16, "single-cycle"=>1}
```

- [ ] **Step 3: Commit nothing**

This task is read-only. Do not stage or commit.

---

### Task 2: Create the Siena Import Script Skeleton

**Files:**
- Create: `scripts/import-siena-program-details.mjs`
- Reference: `scripts/import-ca-foscari-program-details.mjs`

- [ ] **Step 1: Create the script by copying the established importer**

Run:

```bash
cp scripts/import-ca-foscari-program-details.mjs scripts/import-siena-program-details.mjs
```

Expected: `scripts/import-siena-program-details.mjs` exists and starts as a known-working importer structure.

- [ ] **Step 2: Replace top-level Siena constants**

Edit the top of `scripts/import-siena-program-details.mjs` so the initial constants are exactly:

```js
const SIENA_UNIVERSITY_ID = 16;
const EXPECTED_SOURCE_FILE_COUNT = 19;
const SOURCE_GENERATED_AT = "2026-06-22";
const RESULTS_DIR = resolve(
  process.cwd(),
  "university-of-siena-english-program-admission-requirements/results"
);
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "siena-program-details-import-report.json");
const PAGE_SIZE = 1000;
const VALID_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
const VALID_LANGUAGES = new Set(["en", "it"]);
const ADMISSION_DETAIL_COLUMNS =
  "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file";
```

- [ ] **Step 3: Replace the alias map with an empty Siena map**

Set the alias map to:

```js
const SOURCE_TO_EXISTING_SLUG_ALIASES = new Map([]);
```

If dry-run later shows a bad mismatch, add aliases in a separate task after inspecting the report.

- [ ] **Step 4: Rename university-specific identifiers**

Run these replacements in `scripts/import-siena-program-details.mjs`:

```bash
perl -0pi -e 's/CA_FOSCARI_UNIVERSITY_ID/SIENA_UNIVERSITY_ID/g' scripts/import-siena-program-details.mjs
perl -0pi -e 's/fetchCaFoscariDepartments/fetchSienaDepartments/g' scripts/import-siena-program-details.mjs
perl -0pi -e 's/Ca Foscari/Siena/g' scripts/import-siena-program-details.mjs
perl -0pi -e 's/ca-foscari/Siena/g' scripts/import-siena-program-details.mjs
```

Then inspect the file for incorrect string replacements:

```bash
rg -n "CA_FOSCARI|Ca Foscari|ca-foscari|fetchCaFoscari|SIENA_UNIVERSITY_ID|fetchSienaDepartments" scripts/import-siena-program-details.mjs
```

Expected: no `CA_FOSCARI`, `Ca Foscari`, `ca-foscari`, or `fetchCaFoscari` remains; `SIENA_UNIVERSITY_ID` and `fetchSienaDepartments` remain.

- [ ] **Step 5: Run syntax check**

Run:

```bash
node --check scripts/import-siena-program-details.mjs
```

Expected: command exits 0 with no syntax errors.

- [ ] **Step 6: Commit**

Run:

```bash
git add scripts/import-siena-program-details.mjs
git commit -m "feat(data): add Siena program details importer skeleton"
```

---

### Task 3: Adapt Source Loading and Validation for Siena JSON

**Files:**
- Modify: `scripts/import-siena-program-details.mjs`

- [ ] **Step 1: Ensure source loader checks expected file count**

In `loadSourcePrograms()`, after reading the sorted JSON filenames, ensure this check exists:

```js
  if (files.length !== EXPECTED_SOURCE_FILE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_SOURCE_FILE_COUNT} Siena source files, found ${files.length}`
    );
  }
```

- [ ] **Step 2: Ensure required source fields are validated**

In `loadSourcePrograms()`, keep this string-field guard:

```js
    for (const field of [
      "program_name",
      "level",
      "teaching_language",
      "official_program_url",
    ]) {
      assertStringRecord(record, field, file);
    }
```

Keep this array-field guard:

```js
    for (const field of ["required_documents", "source_quotes", "uncertain", "uncertainty_notes"]) {
      assertArray(record, field, file);
    }
    assertNonEmptyArray(record, "required_documents", file);
    assertNonEmptyArray(record, "source_quotes", file);
```

- [ ] **Step 3: Confirm source quote normalization supports Siena keys**

Verify `normalizeSourceQuotes()` contains this field reference logic:

```js
    const fieldRefs = Array.isArray(item.field_refs)
      ? item.field_refs
      : Array.isArray(item.supports_fields)
        ? item.supports_fields
        : typeof item.field_supported === "string"
          ? [item.field_supported]
          : [];
```

If it is missing, add it exactly as shown.

- [ ] **Step 4: Confirm object-to-text conversion avoids raw JSON dumps**

Verify `optionalText()` handles arrays and objects with readable key labels:

```js
  if (Array.isArray(value)) {
    const normalized = value.map(optionalText).filter(Boolean);
    return normalized.length > 0 ? normalized.join("; ") : null;
  }

  if (typeof value === "object") {
    if (typeof value.summary === "string") {
      return optionalText(value.summary);
    }

    const entries = Object.entries(value)
      .filter(([key]) => !["sources", "source_url"].includes(key))
      .map(([key, itemValue]) => {
        const normalized = optionalText(itemValue);
        return normalized ? `${humanizeKey(key)}: ${normalized}` : null;
      })
      .filter(Boolean);

    return entries.length > 0 ? entries.join("; ") : null;
  }
```

- [ ] **Step 5: Run syntax check**

Run:

```bash
node --check scripts/import-siena-program-details.mjs
```

Expected: exits 0.

- [ ] **Step 6: Commit**

Run:

```bash
git add scripts/import-siena-program-details.mjs
git commit -m "feat(data): validate Siena program detail sources"
```

---

### Task 4: Adapt Supabase Fetching and Planning

**Files:**
- Modify: `scripts/import-siena-program-details.mjs`

- [ ] **Step 1: Ensure the Siena department fetch filters by Siena university id**

Find `fetchSienaDepartments(supabase)` and verify the query uses:

```js
    .from("university_departments")
    .select("id,university_id,name,slug,languages,duration_years,level,sort_order")
    .eq("university_id", SIENA_UNIVERSITY_ID)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
```

- [ ] **Step 2: Ensure existing admission detail snapshots filter by Siena university id**

In `snapshotAdmissionDetails()`, verify:

```js
    .from("program_admission_details")
    .select(ADMISSION_DETAIL_COLUMNS)
    .eq("university_id", SIENA_UNIVERSITY_ID)
    .in("department_id", departmentIds);
```

- [ ] **Step 3: Ensure rollback deletes only Siena details**

In `rollbackAdmissionDetails()`, verify the delete query includes:

```js
      .from("program_admission_details")
      .delete()
      .eq("university_id", SIENA_UNIVERSITY_ID)
      .in("department_id", newDetailIds);
```

- [ ] **Step 4: Ensure apply verification filters by Siena university id**

In `verifyApplyResult()`, verify:

```js
    .from("program_admission_details")
    .select("department_id")
    .eq("university_id", SIENA_UNIVERSITY_ID)
    .in("department_id", departmentIds);
```

- [ ] **Step 5: Ensure report labels are Siena-specific**

In `reportForOutput()`, ensure report text or report filename does not mention another university. The returned object should include:

```js
    universityId: plan.universityId,
    mode,
    sourceFiles: plan.sourceFiles,
    existingDepartments: plan.existingDepartments,
    matchedExisting: plan.matchedExisting.length,
```

- [ ] **Step 6: Run syntax check**

Run:

```bash
node --check scripts/import-siena-program-details.mjs
```

Expected: exits 0.

- [ ] **Step 7: Commit**

Run:

```bash
git add scripts/import-siena-program-details.mjs
git commit -m "feat(data): wire Siena Supabase import planning"
```

---

### Task 5: Run Dry-Run and Inspect Report

**Files:**
- Create: `output/siena-program-details-import-report.json`
- Read: `scripts/import-siena-program-details.mjs`

- [ ] **Step 1: Run dry-run**

Run:

```bash
node scripts/import-siena-program-details.mjs --dry-run
```

Expected:

- Command exits 0.
- `output/siena-program-details-import-report.json` is written.
- No live Supabase data is mutated because mode is dry-run.

- [ ] **Step 2: Inspect report summary**

Run:

```bash
node - <<'NODE'
const report = JSON.parse(
  require("node:fs").readFileSync("output/siena-program-details-import-report.json", "utf8")
);
console.log({
  mode: report.mode,
  universityId: report.universityId,
  sourceFiles: report.sourceFiles,
  existingDepartments: report.existingDepartments,
  matchedExisting: report.matchedExisting,
  newDepartments: report.newDepartments.length,
  departmentCorrections: report.departmentCorrections.length,
  duplicateNameDifferentLevel: report.duplicateNameDifferentLevel.length,
  sourceWithoutExisting: report.sourceWithoutExisting.length,
  warnings: report.warnings.length,
});
NODE
```

Expected baseline:

```text
mode: "dry-run"
universityId: 16
sourceFiles: 19
```

`newDepartments` may be greater than 0 because local seed only has a small Siena programme subset. Unexpected `departmentCorrections`, duplicate level conflicts, or warnings must be reviewed before apply.

- [ ] **Step 3: Inspect planned programmes**

Run:

```bash
node - <<'NODE'
const report = JSON.parse(
  require("node:fs").readFileSync("output/siena-program-details-import-report.json", "utf8")
);
for (const plan of report.programPlans) {
  console.log(`${plan.action}\t${plan.level}\t${plan.canonicalDepartmentName}\t${plan.departmentSlug}`);
}
NODE
```

Expected: 19 rows, matching the official Siena English-taught source set. No row should contain another university name.

- [ ] **Step 4: Commit script and dry-run report if the report is useful to keep**

If the report is clean and should be retained for review, run:

```bash
git add scripts/import-siena-program-details.mjs output/siena-program-details-import-report.json
git commit -m "feat(data): add Siena program details dry-run plan"
```

If `output/` is intentionally ignored and the report should stay local, commit only the script:

```bash
git add scripts/import-siena-program-details.mjs
git commit -m "feat(data): add Siena program details dry-run importer"
```

---

### Task 6: Report Dry-Run Findings and Stop Before Apply

**Files:**
- Read: `output/siena-program-details-import-report.json`
- Read: `scripts/import-siena-program-details.mjs`

- [ ] **Step 1: Summarize dry-run findings**

Run:

```bash
node - <<'NODE'
const report = JSON.parse(
  require("node:fs").readFileSync("output/siena-program-details-import-report.json", "utf8")
);
const summary = {
  sourceFiles: report.sourceFiles,
  existingDepartments: report.existingDepartments,
  matchedExisting: report.matchedExisting,
  newDepartments: report.newDepartments.length,
  departmentCorrections: report.departmentCorrections.length,
  duplicateNameDifferentLevel: report.duplicateNameDifferentLevel.length,
  warnings: report.warnings.length,
  reportPath: "output/siena-program-details-import-report.json",
};
console.log(JSON.stringify(summary, null, 2));
NODE
```

Expected: JSON summary prints with `sourceFiles` equal to `19` and `reportPath` equal to `output/siena-program-details-import-report.json`.

- [ ] **Step 2: State apply gate explicitly**

Tell the user:

```text
Dry-run is complete. I have not run --apply. Review the report summary; if it looks right, the next step is a separate apply phase.
```

- [ ] **Step 3: Do not run apply in this phase**

Do not run:

```bash
node scripts/import-siena-program-details.mjs --apply
```

This command belongs to the next user-approved phase.
