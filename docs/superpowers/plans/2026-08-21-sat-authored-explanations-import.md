# SAT Authored Explanations Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the final authored-explanation review item, package all 213 records, and safely populate only the currently-null `public.sat_questions.explanation_en` values in the Path Supabase project.

**Architecture:** Keep the proven 806-record official import flow untouched. Build a separate, checksummed 213-record package and a dedicated server-only importer that performs a zero-write dry-run, writes only `explanation_en` with a null precondition, creates a rollback backup, and verifies the complete post-state. Use Supabase JS rather than raw generated SQL so explanation text is transmitted as parameters rather than interpolated SQL literals.

**Tech Stack:** Node.js 24.19.0 bundled runtime, JavaScript ESM, `@supabase/supabase-js@2.95.3`, Supabase Postgres 17, JSON/SHA-256 artifacts.

**Spec:** `/Users/keremyarar/italypath-main/AGENT_CONTEXT.md`, `/Users/keremyarar/italypath-main/tmp/sat-bank/authored-explanations-en/qa-report-213.json`, and the user-approved `abcd0008` resolution recorded in Task 1.

## Global Constraints

- Target Supabase project ref: `kskbnxxyviowmrlskwke` (`https://kskbnxxyviowmrlskwke.supabase.co`).
- Use `/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` for every package/import command; the shell default is Node 20, while current Supabase JS packages require Node 22 or later.
- Update only `public.sat_questions.explanation_en` for the exact 213 approved IDs.
- Do not update `needs_review`, prompts, choices, correct answers, figures, source metadata, or `sat_attempts`.
- Do not modify `/Users/keremyarar/italypath-main/scripts/sat/import-explanations.mjs`; it remains the frozen 806-record official-rationale importer.
- Refuse any write unless all 213 package IDs exist and all 213 live `explanation_en` values are still null.
- Refuse to overwrite a differing non-null explanation.
- Never print or persist `SUPABASE_SERVICE_ROLE_KEY`.
- No DDL or migration is required.

---

### Task 1: Resolve `abcd0008` and close authored-content QA

**Files:**
- Modify: `tmp/sat-bank/authored-explanations-en/batches/W06.json`
- Modify: `tmp/sat-bank/authored-explanations-en/reviews/W06-review.json`
- Create: `tmp/sat-bank/authored-explanations-en/reviews/W06-abcd0008-human-resolution.json`
- Regenerate: `tmp/sat-bank/authored-explanations-en/explanations-en-213.json`
- Regenerate: `tmp/sat-bank/authored-explanations-en/qa-report-213.json`
- Regenerate: `tmp/sat-bank/authored-explanations-en/run-manifest-213.json`

**Interfaces:**
- Consumes: the existing blocked W06 record and the formatted PDF answer key for `abcd0008`.
- Produces: a reviewed 213-record staging package with zero open reviews.

- [ ] **Step 1: Record the human resolution**

Create `W06-abcd0008-human-resolution.json` with this exact decision:

```json
{
  "schema_version": 1,
  "id": "abcd0008",
  "decision": "approve_intended_nonzero_constant",
  "decided_at": "2026-08-21",
  "rationale": "The keyed answer A is accepted. Because the prompt states that the graph has an x-intercept, the intended domain requires d to be nonzero. The explanation must state this assumption explicitly."
}
```

- [ ] **Step 2: Update the authored and reviewed records**

In `batches/W06.json`, replace the top-level record for `abcd0008`. In
`reviews/W06-review.json`, replace the same fields inside that entry's
`reviewed_record`. Use this exact explanation and final review state in both
locations:

```json
{
  "id": "abcd0008",
  "explanation_en": "Choice A is correct. Since the graph is stated to have an $x$-intercept, $d$ must be nonzero. The equation $y=f(x)+9$ expands to $y=120dx+126d+26$. At the $x$-intercept, $y=0$, so $120dx=-126d-26$. Dividing both sides by $120d$ gives $x=\\frac{-126d-26}{120d}$.",
  "needs_review": false,
  "review_note": null
}
```

Set the outer W06 review entry to `approved: true`, `findings: []`, and all
eight rubric flags to `true`. Do not add `approved`, `findings`, or `rubric` to
the batch record or nested `reviewed_record`.

- [ ] **Step 3: Rebuild the final 213-record staging artifacts**

Run:

```bash
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tmp/sat-bank/authored-explanations-en/ops/build-final-213.mjs
```

Expected output contains:

```json
{
  "status": "passed",
  "records": 213,
  "answer_mismatches": 0,
  "open_reviews": 0
}
```

- [ ] **Step 4: Verify the regenerated staging package**

Run:

```bash
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tmp/sat-bank/authored-explanations-en/ops/verify-final-213.mjs
```

Expected: exit code 0, `status: passed`, `records: 213`, `open_reviews: 0`, and `answer_mismatches: 0`.

- [ ] **Step 5: Commit the resolved content package**

```bash
git add tmp/sat-bank/authored-explanations-en
git commit -m "content: approve 213 SAT math explanations"
```

If `tmp/` is intentionally ignored, do not force-add it; record the generated SHA-256 values in the import run log instead.

---

### Task 2: Build a checksummed 213-record import package

**Files:**
- Create: `scripts/sat/build-authored-explanations-package.mjs`
- Create: `tmp/sat-bank/authored-explanations-en/package/explanations-en.json`
- Create: `tmp/sat-bank/authored-explanations-en/package/target-ids.json`
- Create: `tmp/sat-bank/authored-explanations-en/package/qa-report.json`
- Create: `tmp/sat-bank/authored-explanations-en/package/run-manifest.json`
- Create: `tmp/sat-bank/authored-explanations-en/package/SHA256SUMS`

**Interfaces:**
- Consumes: reviewed staging wrapper `{ schema_version, status, provenance, records }` and passed QA report.
- Produces: immutable package files consumed by the importer.

- [ ] **Step 1: Write package-builder assertions**

The builder must reject unless all conditions below are true:

```js
assert(final.status === "reviewed");
assert(final.provenance === "italypath-authored-from-formatted-answer-key");
assert(final.records.length === 213);
assert(new Set(final.records.map((row) => row.id)).size === 213);
assert(final.records.every((row) => row.needs_review === false));
assert(final.records.every((row) => row.review_note === null));
assert(final.records.every((row) => typeof row.explanation_en === "string" && row.explanation_en.trim().length >= 25));
assert(qa.status === "passed" && qa.open_review_count === 0);
```

- [ ] **Step 2: Emit the canonical import payload**

`package/explanations-en.json` must be a sorted JSON array containing only:

```json
{
  "id": "abcd0008",
  "explanation_en": "Choice A is correct. Since the graph is stated to have an $x$-intercept, $d$ must be nonzero. The equation $y=f(x)+9$ expands to $y=120dx+126d+26$. At the $x$-intercept, $y=0$, so $120dx=-126d-26$. Dividing both sides by $120d$ gives $x=\\frac{-126d-26}{120d}$.",
  "needs_review": false,
  "review_note": null
}
```

`target-ids.json` must contain the same 213 IDs, sorted lexicographically.

- [ ] **Step 3: Generate checksums**

Generate one SHA-256 line for each of the four JSON package files. Each line must contain the actual 64-character lowercase digest, two ASCII spaces, and the exact basename. The accepted basenames are `explanations-en.json`, `target-ids.json`, `qa-report.json`, and `run-manifest.json`.

- [ ] **Step 4: Build twice and prove deterministic output**

Run the builder twice and compare SHA-256 output. All four package JSON files
and `SHA256SUMS` must remain byte-identical. Omit build-time timestamps from
the package; where provenance time is required, copy the already-frozen
staging manifest value instead of calling the clock.

```bash
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sat/build-authored-explanations-package.mjs
shasum -a 256 tmp/sat-bank/authored-explanations-en/package/explanations-en.json tmp/sat-bank/authored-explanations-en/package/target-ids.json
```

Expected: both builds produce the same hashes.

- [ ] **Step 5: Commit the package builder**

```bash
git add scripts/sat/build-authored-explanations-package.mjs
git commit -m "build: package authored SAT explanations"
```

---

### Task 3: Implement the dedicated dry-run/import/rollback CLI

**Files:**
- Create: `scripts/sat/lib/authored-explanations-import.mjs`
- Create: `scripts/sat/import-authored-explanations.mjs`
- Create: `scripts/sat/test-authored-explanations-import.mjs`
- Preserve: `scripts/sat/import-explanations.mjs`

**Interfaces:**
- Consumes: the checksummed package, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` on the server.
- Produces: dry-run JSON, a mode-0600 rollback backup, apply verification JSON, or rollback verification JSON.

- [ ] **Step 1: Write failing tests for package and live-state guards**

The tests must cover these exact cases using in-memory fixtures:

```js
const canonicalRecords = Array.from({ length: 213 }, (_, index) => ({
  id: `target-${String(index).padStart(3, "0")}`,
  explanation_en: `Choice A is correct. Fixture explanation ${index}.`,
  needs_review: false,
  review_note: null,
}));
const nonTargetRows = Array.from({ length: 806 }, (_, index) => ({
  id: `official-${String(index).padStart(3, "0")}`,
  explanation_en: `Official fixture explanation ${index}.`,
}));
const targetRows = canonicalRecords.map((row) => ({ id: row.id, explanation_en: null }));
const allRows1019 = [...targetRows, ...nonTargetRows];
const packageWith212Rows = { records: canonicalRecords.slice(1) };
const oneNonNullTarget = allRows1019.map((row) =>
  row.id === canonicalRecords[0].id ? { ...row, explanation_en: "different" } : row
);

assert.throws(
  () => readCanonicalPackage(path.join(tamperedChecksumDir, "explanations-en.json")),
  /Checksum mismatch/
);
assert.throws(() => validatePackage(packageWith212Rows), /213/);
assert.throws(
  () => validateLiveState({ allRows: allRows1019.slice(1), canonicalRecords }),
  /1019/
);
assert.throws(
  () => validateLiveState({ allRows: allRows1019.filter((row) => row.id !== canonicalRecords[0].id), canonicalRecords }),
  /absent/
);
assert.throws(
  () => validateLiveState({ allRows: oneNonNullTarget, canonicalRecords }),
  /non-null/
);
```

Run:

```bash
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sat/test-authored-explanations-import.mjs
```

Expected: FAIL because the import library does not exist yet.

- [ ] **Step 2: Implement pure validation and hashing helpers**

Export these functions from `lib/authored-explanations-import.mjs`:

- `sha256(value)` accepts a string or Buffer and returns a lowercase hexadecimal SHA-256 string.
- `stableJson(value)` returns JSON with object keys sorted recursively.
- `verifyChecksums(packageDir)` validates every line of `SHA256SUMS` and returns the number of verified files.
- `readCanonicalPackage(inputPath)` returns `{ records, targetIds, qa, canonicalHash }` after enforcing all package invariants.
- `validateLiveState({ allRows, canonicalRecords })` returns `{ targetRows, nonTargetRows, equal, toChange }` or throws on count, ID, or non-null-state violations.
- `buildBackup({ currentRows, canonicalHash, protectedHashes })` returns the exact serializable backup object consumed by rollback mode.

`readCanonicalPackage` must enforce 213 records, exact target-ID equality, passed QA, zero open reviews, and exact checksum validation.

- [ ] **Step 3: Implement safe server-side client creation**

Reject the wrong project before any write:

```js
const EXPECTED_PROJECT_URL = "https://kskbnxxyviowmrlskwke.supabase.co";
if (env.NEXT_PUBLIC_SUPABASE_URL !== EXPECTED_PROJECT_URL) {
  throw new Error("Refusing to use an unexpected Supabase project.");
}
```

Create the client with `persistSession: false` and `autoRefreshToken: false`. Never log the service-role value.

- [ ] **Step 4: Implement zero-write dry-run**

Dry-run must fetch all 1,019 `sat_questions` rows and all `sat_attempts` rows
using pagination. Before reporting ready, calculate and retain these canonical
pre-state values: the 213 target explanation snapshot, the 806 non-target
`id/explanation_en/needs_review` hash, the protected non-explanation
`sat_questions` column hash, and the complete `sat_attempts` hash. Report:

```json
{
  "mode": "dry-run",
  "status": "ready",
  "sat_questions": 1019,
  "package_records": 213,
  "target_ids_present": 213,
  "target_rows_null": 213,
  "target_rows_non_null": 0,
  "official_non_targets_unchanged": 806,
  "writes": 0
}
```

- [ ] **Step 5: Implement guarded writes**

Write only `explanation_en`, with both ID and null-state filters:

```js
const { data, error } = await client
  .from("sat_questions")
  .update({ explanation_en: row.explanation_en })
  .eq("id", row.id)
  .is("explanation_en", null)
  .select("id,explanation_en");
```

Process sequential chunks of 25. Require exactly one returned row for every update. A zero-row update is a race/precondition failure, not success.

- [ ] **Step 6: Create the backup before the first write**

Store all 213 pre-write values plus canonical hash and target IDs at `tmp/sat-bank/authored-explanations-backups/sat-authored-explanations-before-apply.json` with file mode `0600`. Refuse to overwrite an existing file at that path. The expected first-run backup contains 213 null explanations.

The backup must also contain the dry-run-approved package hash, project ref,
806-row non-target hash, protected non-explanation column hash, and
`sat_attempts` hash. These values are the post-write comparison baseline; do
not claim protected data is unchanged without matching them.

- [ ] **Step 7: Implement failure rollback**

On partial failure, restore only rows changed by this run. Apply both ID and expected-imported-text filters before restoring the backed-up null value so a concurrent external edit is never overwritten.

- [ ] **Step 8: Implement explicit rollback mode**

Support:

```bash
node scripts/sat/import-authored-explanations.mjs --rollback tmp/sat-bank/authored-explanations-backups/sat-authored-explanations-before-apply.json
node scripts/sat/import-authored-explanations.mjs --rollback tmp/sat-bank/authored-explanations-backups/sat-authored-explanations-before-apply.json --apply
```

Rollback dry-run reports the number of rows that would be restored. Rollback apply must finish with exactly the backed-up values for all 213 target IDs.

- [ ] **Step 9: Make the importer tests pass**

```bash
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sat/test-authored-explanations-import.mjs
```

Expected: exit code 0 with all guard, dry-run, partial-failure, and rollback tests passing.

- [ ] **Step 10: Commit the importer**

```bash
git add scripts/sat/lib/authored-explanations-import.mjs scripts/sat/import-authored-explanations.mjs scripts/sat/test-authored-explanations-import.mjs
git commit -m "feat: add guarded authored explanation import"
```

---

### Task 4: Run local verification and live zero-write preflight

**Files:**
- Read: `tmp/sat-bank/authored-explanations-en/package/*`
- Read: `.env.local`
- Create: `tmp/sat-bank/authored-explanations-en/import-dry-run.json`

**Interfaces:**
- Consumes: tested importer and live read access.
- Produces: evidence that the exact 213 rows are ready without performing writes.

- [ ] **Step 1: Run all local authored-package checks**

```bash
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tmp/sat-bank/authored-explanations-en/ops/verify-final-213.mjs
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sat/test-authored-explanations-import.mjs
```

Expected: both exit 0.

- [ ] **Step 2: Run the live dry-run**

```bash
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sat/import-authored-explanations.mjs --input tmp/sat-bank/authored-explanations-en/package/explanations-en.json
```

Expected: `status: ready`, `target_rows_null: 213`, `target_rows_non_null: 0`, `writes: 0`.

Capture the CLI's exact JSON output in
`tmp/sat-bank/authored-explanations-en/import-dry-run.json` without modifying
the JSON body (for example with `tee`).

- [ ] **Step 3: Re-run the Supabase read-only set comparison**

Verify these exact live facts immediately before approval:

```text
package_ids = 213
ids_present = 213
target_rows_still_null = 213
target_rows_already_filled = 0
package_ids_absent = []
live_missing_not_in_package = []
```

- [ ] **Step 4: Stop for explicit apply approval**

Present the dry-run JSON, package SHA-256, project ref, and backup destination. Do not use `--apply` until the user explicitly approves the external database write.

---

### Task 5: Apply the import and verify the complete live post-state

**Files:**
- Create: `tmp/sat-bank/authored-explanations-backups/sat-authored-explanations-before-apply.json`
- Create: `tmp/sat-bank/authored-explanations-en/import-result.json`

**Interfaces:**
- Consumes: explicit user approval and the exact dry-run-approved package hash.
- Produces: 1,019 explained SAT rows, verified target equality, and a rollback artifact.

- [ ] **Step 1: Confirm the package hash has not changed since dry-run**

```bash
shasum -a 256 tmp/sat-bank/authored-explanations-en/package/explanations-en.json
```

Expected: identical to the dry-run hash.

- [ ] **Step 2: Execute the guarded import once**

```bash
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sat/import-authored-explanations.mjs --input tmp/sat-bank/authored-explanations-en/package/explanations-en.json --apply
```

Do not retry automatically if the process reports an error; inspect its post-state and backup first.

- [ ] **Step 3: Verify exact target text equality**

The importer must fetch all target rows after writing and require all 213 live `explanation_en` values to equal the package text byte-for-byte.

- [ ] **Step 4: Verify global live counts**

Run a read-only Supabase query and require:

```text
total_questions = 1019
explanations_present = 1019
explanations_missing = 0
needs_review_count = 0
```

- [ ] **Step 5: Verify protected data**

Require:

```text
authored target exact matches = 213
official non-target explanations unchanged = 806
non-explanation sat_questions columns unchanged = true
target IDs missing = 0
unexpected non-target writes = 0
```

- [ ] **Step 6: Run application-level checks**

```bash
npm run check:sat-bank
npm run build
```

Expected: both exit 0. If unrelated existing failures occur, report them separately and do not mislabel the import verification as passed.

- [ ] **Step 7: Record the import result**

Persist the importer's exact JSON result at
`tmp/sat-bank/authored-explanations-en/import-result.json`. It must include
project ref, package hash, backup path/hash, changed count, exact-match count,
the three protected pre/post hash comparisons, and post-state counts. Do not
include credentials.

---

### Task 6: Roll back only if post-state verification fails

**Files:**
- Read: the exact backup produced in Task 5
- Update: the same 213 `explanation_en` fields only when rollback is explicitly invoked

**Interfaces:**
- Consumes: verified backup and failed post-state evidence.
- Produces: restoration of the 213 pre-import values without touching the 806 official explanations.

- [ ] **Step 1: Run rollback dry-run**

```bash
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sat/import-authored-explanations.mjs --rollback tmp/sat-bank/authored-explanations-backups/sat-authored-explanations-before-apply.json
```

Expected: `would_restore: 213`, `writes: 0`.

- [ ] **Step 2: Obtain explicit rollback approval**

Show the backup SHA-256 and exact target count before applying rollback.

- [ ] **Step 3: Apply rollback once**

```bash
/Users/keremyarar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sat/import-authored-explanations.mjs --rollback tmp/sat-bank/authored-explanations-backups/sat-authored-explanations-before-apply.json --apply
```

- [ ] **Step 4: Verify restoration**

Expected first-run restoration:

```text
target rows restored to null = 213
official explanations still present = 806
total questions = 1019
```
