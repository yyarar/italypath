# Bologna Program Admission Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the 97 University of Bologna admission-detail JSON files into Supabase without corrupting the existing program directory, add `single-cycle` support, and show official program/admission details on program pages.

**Architecture:** Keep `public.university_departments` as the canonical program identity table and add `public.program_admission_details` as a one-to-one detail table keyed by `department_id`. Import is gated by a dry-run report before any live writes; app reads details server-side through `lib/universities.server.ts` and attaches them to `Department.admissionDetails`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres/Data API, Clerk-authenticated app shell, plain Node validation/import scripts.

---

## References

- Spec: `docs/superpowers/specs/2026-06-02-bologna-program-admission-details-design.md`
- Source data: `/Users/keremyarar/Desktop/results/*.json`
- Supabase project: `kskbnxxyviowmrlskwke` (`Path`)
- Supabase docs checked on 2026-06-02:
  - RLS must be enabled on exposed-schema tables and policies control row visibility.
  - Data API access depends on explicit grants plus RLS policies; do not rely on implicit exposure defaults.

## File Map

- Create: `supabase/program_admission_details.sql` — reproducible schema/RLS SQL.
- Create: `scripts/import-bologna-program-details.mjs` — dry-run and apply/import script.
- Create: `scripts/check-program-details.mjs` — live data guard for details table and `single-cycle`.
- Create: `components/university-details/ProgramAdmissionDetailsPanel.tsx` — editorial details panel for program pages.
- Modify: `app/data.ts` — widen `ProgramLevel`, add admission-detail types to `Department`.
- Modify: `types/index.ts` — add `id` to Supabase department rows and add admission-detail row type.
- Modify: `lib/universities.server.ts` — fetch and attach detail rows.
- Modify: `lib/mergeUniversityDepartments.ts` — accept `single-cycle` rows.
- Modify: `scripts/validate-supabase-university-data.mjs` — allow `single-cycle`.
- Modify: `scripts/validate-data-integrity.mjs` — allow `single-cycle`.
- Modify: `scripts/check-university-department-merge.mjs` — cover `single-cycle`.
- Modify: `components/university-details/ProgramDirectory.tsx` — add `single-cycle` group.
- Modify: `app/universities/[id]/departments/[deptSlug]/page.tsx` — render level and admission details.
- Modify: `lib/translations.ts` — add labels for `single-cycle` and details panel.
- Modify: `package.json` — add `check:program-details`.

---

### Task 1: Add Reproducible Supabase Schema SQL

**Files:**
- Create: `supabase/program_admission_details.sql`

- [ ] **Step 1: Create the schema SQL file**

Add this exact SQL to `supabase/program_admission_details.sql`:

```sql
begin;

alter table public.university_departments
  drop constraint if exists university_departments_level_check;

alter table public.university_departments
  add constraint university_departments_level_check
  check (level = any (array['bachelor'::text, 'master'::text, 'single-cycle'::text]));

create table if not exists public.program_admission_details (
  department_id bigint primary key references public.university_departments(id) on delete cascade,
  university_id bigint not null references public.universities(id) on delete cascade,
  raw_program_name text not null,
  raw_level text not null,
  raw_teaching_language text not null,
  campus text,
  degree_class text,
  admission_type text,
  academic_requirements text,
  language_requirements text,
  application_deadline_eu text,
  application_deadline_non_eu text,
  required_documents jsonb not null default '[]'::jsonb,
  entry_exam_or_test text,
  tuition_or_fees_link text,
  official_program_url text not null,
  official_call_url text,
  source_quotes jsonb not null default '[]'::jsonb,
  uncertain jsonb not null default '[]'::jsonb,
  uncertainty_notes jsonb not null default '[]'::jsonb,
  source_file text not null,
  imported_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists program_admission_details_university_id_idx
  on public.program_admission_details(university_id);

alter table public.program_admission_details enable row level security;

drop policy if exists program_admission_details_public_read
  on public.program_admission_details;

create policy program_admission_details_public_read
  on public.program_admission_details
  for select
  to anon, authenticated
  using (true);

grant select on table public.program_admission_details to anon, authenticated;
grant select, insert, update, delete on table public.program_admission_details to service_role;

commit;
```

- [ ] **Step 2: Apply schema to Supabase**

Use Supabase MCP `_execute_sql` or the Dashboard SQL Editor with the contents of `supabase/program_admission_details.sql`.

Expected: command completes without an RLS/grant error.

- [ ] **Step 3: Verify schema**

Run this read-only SQL through Supabase MCP:

```sql
select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'program_admission_details'
order by ordinal_position;

select
  policyname,
  roles,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'program_admission_details';
```

Expected:
- `program_admission_details` exists.
- `program_admission_details_public_read` exists for `anon` and `authenticated`.
- `required_documents`, `source_quotes`, `uncertain`, `uncertainty_notes` are `jsonb`.

- [ ] **Step 4: Commit schema file**

```bash
git add supabase/program_admission_details.sql
git commit -m "feat: add program admission details schema"
```

---

### Task 2: Widen Program Types and Existing Validators

**Files:**
- Modify: `app/data.ts`
- Modify: `types/index.ts`
- Modify: `lib/mergeUniversityDepartments.ts`
- Modify: `scripts/validate-supabase-university-data.mjs`
- Modify: `scripts/validate-data-integrity.mjs`
- Modify: `scripts/check-university-department-merge.mjs`

- [ ] **Step 1: Update `ProgramLevel` and add detail types**

In `app/data.ts`, replace:

```ts
export type ProgramLevel = "bachelor" | "master";
```

with:

```ts
export type ProgramLevel = "bachelor" | "master" | "single-cycle";

export interface ProgramSourceQuote {
  url: string;
  quote: string;
  field_refs: string[];
  retrieved_at: string;
}

export interface ProgramAdmissionDetails {
  officialProgramUrl: string;
  officialCallUrl?: string;
  tuitionOrFeesLink?: string;
  campus?: string;
  degreeClass?: string;
  admissionType?: string;
  academicRequirements?: string;
  languageRequirements?: string;
  applicationDeadlineEu?: string;
  applicationDeadlineNonEu?: string;
  requiredDocuments: string[];
  entryExamOrTest?: string;
  sourceQuotes: ProgramSourceQuote[];
  uncertain: string[];
  uncertaintyNotes: string[];
  rawTeachingLanguage: string;
}
```

Then change `Department` from:

```ts
export interface Department {
  name: string;
  slug: string;
  languages: ProgramLanguage[];
  durationYears: ProgramDurationYears;
  level: ProgramLevel;
}
```

to:

```ts
export interface Department {
  id?: number;
  name: string;
  slug: string;
  languages: ProgramLanguage[];
  durationYears: ProgramDurationYears;
  level: ProgramLevel;
  admissionDetails?: ProgramAdmissionDetails;
}
```

- [ ] **Step 2: Update shared Supabase row types**

In `types/index.ts`, change `SupabaseUniversityDepartmentRow` to include `id`:

```ts
export interface SupabaseUniversityDepartmentRow {
  id?: number;
  university_id: number;
  name: string | null;
  slug: string | null;
  languages: string[] | null;
  duration_years: number | null;
  level: string | null;
  sort_order: number | null;
}
```

Add:

```ts
export interface SupabaseProgramAdmissionDetailsRow {
  department_id: number;
  university_id: number;
  raw_program_name: string | null;
  raw_level: string | null;
  raw_teaching_language: string | null;
  campus: string | null;
  degree_class: string | null;
  admission_type: string | null;
  academic_requirements: string | null;
  language_requirements: string | null;
  application_deadline_eu: string | null;
  application_deadline_non_eu: string | null;
  required_documents: unknown;
  entry_exam_or_test: string | null;
  tuition_or_fees_link: string | null;
  official_program_url: string | null;
  official_call_url: string | null;
  source_quotes: unknown;
  uncertain: unknown;
  uncertainty_notes: unknown;
  source_file: string | null;
}
```

- [ ] **Step 3: Update allowed level sets**

In these files, change level sets from `["bachelor", "master"]` to `["bachelor", "master", "single-cycle"]`:

```text
lib/mergeUniversityDepartments.ts
scripts/validate-supabase-university-data.mjs
scripts/validate-data-integrity.mjs
```

Expected code shape:

```ts
const PROGRAM_LEVELS = new Set<ProgramLevel>(["bachelor", "master", "single-cycle"]);
```

and in `.mjs` files:

```js
const ALLOWED_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
```

- [ ] **Step 4: Preserve department id in merge helpers**

In `lib/mergeUniversityDepartments.ts`, update `createDepartment()` return:

```ts
return {
  id: row.id,
  name,
  slug,
  languages: normalizeLanguages(row.languages),
  durationYears: normalizeDurationYears(row.duration_years),
  level: normalizeLevel(row.level),
};
```

- [ ] **Step 5: Update merge smoke check**

In `scripts/check-university-department-merge.mjs`, add this row to the first `mergeUniversityDepartmentRows` input array:

```js
{
  id: 3,
  university_id: 1,
  name: "Medicine and Surgery",
  slug: "medicine-and-surgery",
  languages: ["en"],
  duration_years: 6,
  level: "single-cycle",
  sort_order: 3,
}
```

Then add this assertion after the existing master assertion:

```js
assert.equal(
  mergedUniversities[0].departments.some(
    (department) =>
      department.slug === "medicine-and-surgery" &&
      department.level === "single-cycle" &&
      department.durationYears === 6
  ),
  true
);
```

- [ ] **Step 6: Run type/data checks**

```bash
npm run check:university-department-merge
npm run check:local-data
```

Expected:
- Merge check passes.
- Local data integrity passes.

- [ ] **Step 7: Commit type changes**

```bash
git add app/data.ts types/index.ts lib/mergeUniversityDepartments.ts scripts/validate-supabase-university-data.mjs scripts/validate-data-integrity.mjs scripts/check-university-department-merge.mjs
git commit -m "feat: support single-cycle program level"
```

---

### Task 3: Fetch Admission Details in the Server Data Layer

**Files:**
- Modify: `lib/universities.server.ts`

- [ ] **Step 1: Add column constants**

In `lib/universities.server.ts`, change:

```ts
const UNIVERSITY_DEPARTMENT_COLUMNS =
  "university_id,name,slug,languages,duration_years,level,sort_order";
```

to:

```ts
const UNIVERSITY_DEPARTMENT_COLUMNS =
  "id,university_id,name,slug,languages,duration_years,level,sort_order";
const PROGRAM_ADMISSION_DETAIL_COLUMNS =
  "department_id,university_id,raw_program_name,raw_level,raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes,source_file";
const PROGRAM_ADMISSION_DETAIL_PAGE_SIZE = 1000;
```

- [ ] **Step 2: Import new row type**

Change the type import to:

```ts
import type {
  SupabaseProgramAdmissionDetailsRow,
  SupabaseUniversityDepartmentRow,
  SupabaseUniversityRow,
} from "@/types";
```

- [ ] **Step 3: Add JSON normalizers**

Add below `normalizeStringList()`:

```ts
function normalizeUnknownStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeSourceQuotes(value: unknown): ProgramSourceQuote[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const quote = item as Record<string, unknown>;
    const url = typeof quote.url === "string" ? quote.url.trim() : "";
    const text = typeof quote.quote === "string" ? quote.quote.trim() : "";
    const retrievedAt =
      typeof quote.retrieved_at === "string" ? quote.retrieved_at.trim() : "";

    if (!url || !text || !retrievedAt) return [];

    return [
      {
        url,
        quote: text,
        field_refs: normalizeUnknownStringList(quote.field_refs),
        retrieved_at: retrievedAt,
      },
    ];
  });
}
```

Also add `ProgramSourceQuote` to the `@/app/data` type import.

- [ ] **Step 4: Add detail row creator**

Add below `createDepartment()`:

```ts
function optionalText(value: string | null): string | undefined {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

function createAdmissionDetails(
  row: SupabaseProgramAdmissionDetailsRow
): ProgramAdmissionDetails | null {
  const officialProgramUrl = normalizeText(row.official_program_url);
  const rawTeachingLanguage = normalizeText(row.raw_teaching_language);

  if (!officialProgramUrl || !rawTeachingLanguage) {
    return null;
  }

  return {
    officialProgramUrl,
    officialCallUrl: optionalText(row.official_call_url),
    tuitionOrFeesLink: optionalText(row.tuition_or_fees_link),
    campus: optionalText(row.campus),
    degreeClass: optionalText(row.degree_class),
    admissionType: optionalText(row.admission_type),
    academicRequirements: optionalText(row.academic_requirements),
    languageRequirements: optionalText(row.language_requirements),
    applicationDeadlineEu: optionalText(row.application_deadline_eu),
    applicationDeadlineNonEu: optionalText(row.application_deadline_non_eu),
    requiredDocuments: normalizeUnknownStringList(row.required_documents),
    entryExamOrTest: optionalText(row.entry_exam_or_test),
    sourceQuotes: normalizeSourceQuotes(row.source_quotes),
    uncertain: normalizeUnknownStringList(row.uncertain),
    uncertaintyNotes: normalizeUnknownStringList(row.uncertainty_notes),
    rawTeachingLanguage,
  };
}
```

Also add `ProgramAdmissionDetails` to the `@/app/data` type import.

- [ ] **Step 5: Attach id and details to departments**

Change `createDepartment()` return to include `id: row.id`.

Change `composeUniversitiesFromSupabaseRows()` signature:

```ts
export function composeUniversitiesFromSupabaseRows(
  universityRows: SupabaseUniversityRow[],
  departmentRows: SupabaseUniversityDepartmentRow[],
  admissionDetailRows: SupabaseProgramAdmissionDetailsRow[] = []
): University[] {
```

At the top of the function, add:

```ts
const detailsByDepartmentId = new Map<number, ProgramAdmissionDetails>();

for (const row of admissionDetailRows) {
  const detail = createAdmissionDetails(row);
  if (detail) {
    detailsByDepartmentId.set(row.department_id, detail);
  }
}
```

When creating each department, attach details:

```ts
const department = createDepartment(row);
if (!department) continue;

const admissionDetails =
  typeof row.id === "number" ? detailsByDepartmentId.get(row.id) : undefined;
const enrichedDepartment = admissionDetails
  ? { ...department, admissionDetails }
  : department;

const departments = departmentsByUniversityId.get(row.university_id) ?? [];
departments.push(enrichedDepartment);
departmentsByUniversityId.set(row.university_id, departments);
```

- [ ] **Step 6: Fetch admission detail rows**

Add:

```ts
async function fetchProgramAdmissionDetailRows(): Promise<SupabaseProgramAdmissionDetailsRow[]> {
  const supabase = createReadOnlySupabaseClient();
  const rows: SupabaseProgramAdmissionDetailsRow[] = [];

  for (let from = 0; ; from += PROGRAM_ADMISSION_DETAIL_PAGE_SIZE) {
    const to = from + PROGRAM_ADMISSION_DETAIL_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("program_admission_details")
      .select(PROGRAM_ADMISSION_DETAIL_COLUMNS)
      .order("university_id", { ascending: true })
      .order("department_id", { ascending: true })
      .range(from, to)
      .returns<SupabaseProgramAdmissionDetailsRow[]>();

    if (error) {
      throw new Error(`Failed to fetch program admission details from Supabase: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PROGRAM_ADMISSION_DETAIL_PAGE_SIZE) {
      return rows;
    }
  }
}
```

Change `getUniversitiesData()` fetch to:

```ts
const [universityRows, departmentRows, admissionDetailRows] = await Promise.all([
  fetchUniversityRows(),
  fetchUniversityDepartmentRows(),
  fetchProgramAdmissionDetailRows(),
]);
const universities = composeUniversitiesFromSupabaseRows(
  universityRows,
  departmentRows,
  admissionDetailRows
);
```

- [ ] **Step 7: Run checks**

```bash
npm run check:university-data-source
npm run lint
```

Expected: both pass. If `lint` fails because the live table has not been created yet, complete Task 1 schema apply first.

- [ ] **Step 8: Commit data loader changes**

```bash
git add lib/universities.server.ts
git commit -m "feat: load program admission details"
```

---

### Task 4: Build Dry-Run and Import Script

**Files:**
- Create: `scripts/import-bologna-program-details.mjs`

- [ ] **Step 1: Create script with explicit mode handling**

Create `scripts/import-bologna-program-details.mjs` with this structure:

```js
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BOLOGNA_UNIVERSITY_ID = 3;
const RESULTS_DIR = "/Users/keremyarar/Desktop/results";
const OUTPUT_DIR = resolve(process.cwd(), "output");
const REPORT_PATH = resolve(OUTPUT_DIR, "bologna-program-details-import-report.json");
const PAGE_SIZE = 1000;
const VALID_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
const VALID_LANGUAGES = new Set(["en", "it"]);

const mode = process.argv.includes("--apply") ? "apply" : "dry-run";

function loadDotenvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function createSupabaseClient() {
  loadDotenvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    mode === "apply"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      mode === "apply"
        ? "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply."
        : "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function createSlug(value) {
  return normalizeName(value).replace(/\s+/g, "-");
}

function normalizeLevel(value) {
  if (value === "single-cycle") return "single-cycle";
  if (value === "master") return "master";
  if (value === "bachelor") return "bachelor";
  throw new Error(`Invalid level: ${value}`);
}

function normalizeLanguages(rawTeachingLanguage) {
  const text = rawTeachingLanguage.toLowerCase();
  const languages = [];
  if (text.includes("english")) languages.push("en");
  if (text.includes("italian")) languages.push("it");
  return languages.filter((language) => VALID_LANGUAGES.has(language));
}

function durationForLevel(level) {
  if (level === "single-cycle") return 6;
  if (level === "master") return 2;
  return 3;
}
```

- [ ] **Step 2: Add source JSON validation**

Append:

```js
function assertStringRecord(record, field, file) {
  if (typeof record[field] !== "string" || record[field].trim().length === 0) {
    throw new Error(`${file} has missing ${field}`);
  }
}

function assertArray(record, field, file) {
  if (!Array.isArray(record[field])) {
    throw new Error(`${file} has non-array ${field}`);
  }
}

function loadSourcePrograms() {
  const files = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  return files.map((file) => {
    const absolutePath = join(RESULTS_DIR, file);
    const record = JSON.parse(readFileSync(absolutePath, "utf8"));

    for (const field of ["program_name", "level", "teaching_language", "official_program_url"]) {
      assertStringRecord(record, field, file);
    }

    for (const field of ["required_documents", "source_quotes", "uncertain", "uncertainty_notes"]) {
      assertArray(record, field, file);
    }

    const level = normalizeLevel(record.level);

    return {
      file,
      programName: record.program_name.trim(),
      normalizedName: normalizeName(record.program_name),
      level,
      teachingLanguage: record.teaching_language.trim(),
      languages: normalizeLanguages(record.teaching_language),
      durationYears: durationForLevel(level),
      raw: record,
    };
  });
}
```

- [ ] **Step 3: Add Supabase read helpers**

Append:

```js
async function fetchAllRows(supabase, tableName, columns, buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from(tableName).select(columns);
    query = buildQuery ? buildQuery(query) : query;
    const { data, error } = await query.range(from, to);
    if (error) throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function fetchBolognaDepartments(supabase) {
  return fetchAllRows(
    supabase,
    "university_departments",
    "id,university_id,name,slug,languages,duration_years,level,sort_order",
    (query) =>
      query
        .eq("university_id", BOLOGNA_UNIVERSITY_ID)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
  );
}
```

- [ ] **Step 4: Add match planner**

Append:

```js
function nextSlug(baseSlug, usedSlugs, level) {
  if (!usedSlugs.has(baseSlug)) return baseSlug;
  const levelSlug = `${baseSlug}-${level}`;
  if (!usedSlugs.has(levelSlug)) return levelSlug;

  for (let index = 2; ; index += 1) {
    const candidate = `${levelSlug}-${index}`;
    if (!usedSlugs.has(candidate)) return candidate;
  }
}

function createPlan(sourcePrograms, dbDepartments) {
  const byName = new Map();
  const usedSlugs = new Set(dbDepartments.map((department) => department.slug));

  for (const department of dbDepartments) {
    const key = normalizeName(department.name);
    const list = byName.get(key) ?? [];
    list.push(department);
    byName.set(key, list);
  }

  const matchedExisting = [];
  const levelCorrections = [];
  const newDepartments = [];
  const detailRows = [];
  const duplicateNameDifferentLevel = [];

  for (const source of sourcePrograms) {
    const candidates = byName.get(source.normalizedName) ?? [];
    const exactLevel = candidates.find((candidate) => candidate.level === source.level);
    const singleCycleCorrection =
      !exactLevel &&
      source.level === "single-cycle" &&
      candidates.length === 1 &&
      candidates[0].level === "bachelor";

    let department = exactLevel;
    if (singleCycleCorrection) {
      department = candidates[0];
      levelCorrections.push({
        id: department.id,
        name: department.name,
        slug: department.slug,
        from: department.level,
        to: source.level,
      });
    }

    if (department) {
      matchedExisting.push({
        id: department.id,
        name: department.name,
        slug: department.slug,
        level: source.level,
        sourceFile: source.file,
      });
    } else {
      const baseSlug = createSlug(source.programName);
      const slug = nextSlug(baseSlug, usedSlugs, source.level);
      usedSlugs.add(slug);

      const sortOrder = dbDepartments.length + newDepartments.length + 1;
      department = {
        id: null,
        university_id: BOLOGNA_UNIVERSITY_ID,
        name: source.programName,
        slug,
        languages: source.languages.length > 0 ? source.languages : ["en"],
        duration_years: source.durationYears,
        level: source.level,
        sort_order: sortOrder,
      };
      newDepartments.push({ ...department, sourceFile: source.file });
    }

    if (candidates.length > 0 && !candidates.some((candidate) => candidate.level === source.level)) {
      duplicateNameDifferentLevel.push({
        name: source.programName,
        sourceLevel: source.level,
        existingLevels: candidates.map((candidate) => candidate.level),
      });
    }

    detailRows.push({
      source,
      department,
    });
  }

  return {
    universityId: BOLOGNA_UNIVERSITY_ID,
    sourceFiles: sourcePrograms.length,
    existingDepartments: dbDepartments.length,
    matchedExisting,
    levelCorrections,
    newDepartments,
    duplicateNameDifferentLevel,
    detailRows,
    warnings: [],
  };
}
```

- [ ] **Step 5: Add write helpers and main function**

Append:

```js
function toDetailPayload(source, departmentId) {
  return {
    department_id: departmentId,
    university_id: BOLOGNA_UNIVERSITY_ID,
    raw_program_name: source.raw.program_name,
    raw_level: source.raw.level,
    raw_teaching_language: source.raw.teaching_language,
    campus: source.raw.campus ?? null,
    degree_class: source.raw.degree_class ?? null,
    admission_type: source.raw.admission_type ?? null,
    academic_requirements: source.raw.academic_requirements ?? null,
    language_requirements: source.raw.language_requirements ?? null,
    application_deadline_eu: source.raw.application_deadline_eu ?? null,
    application_deadline_non_eu: source.raw.application_deadline_non_eu ?? null,
    required_documents: source.raw.required_documents,
    entry_exam_or_test: source.raw.entry_exam_or_test ?? null,
    tuition_or_fees_link: source.raw.tuition_or_fees_link ?? null,
    official_program_url: source.raw.official_program_url,
    official_call_url: source.raw.official_call_url ?? null,
    source_quotes: source.raw.source_quotes,
    uncertain: source.raw.uncertain,
    uncertainty_notes: source.raw.uncertainty_notes,
    source_file: source.file,
  };
}

async function applyPlan(supabase, plan) {
  if (plan.newDepartments.length > 0) {
    const { error } = await supabase.from("university_departments").insert(
      plan.newDepartments.map(({ sourceFile, id, ...department }) => department)
    );
    if (error) throw new Error(`Failed to insert departments: ${error.message}`);
  }

  for (const correction of plan.levelCorrections) {
    const { error } = await supabase
      .from("university_departments")
      .update({ level: correction.to })
      .eq("id", correction.id);
    if (error) throw new Error(`Failed to update ${correction.slug}: ${error.message}`);
  }

  const refreshedDepartments = await fetchBolognaDepartments(supabase);
  const departmentByKey = new Map(
    refreshedDepartments.map((department) => [
      `${normalizeName(department.name)}::${department.level}`,
      department,
    ])
  );

  const detailPayloads = plan.detailRows.map(({ source }) => {
    const department = departmentByKey.get(`${source.normalizedName}::${source.level}`);
    if (!department?.id) {
      throw new Error(`Cannot resolve department id for ${source.programName} (${source.level})`);
    }
    return toDetailPayload(source, department.id);
  });

  const { error } = await supabase
    .from("program_admission_details")
    .upsert(detailPayloads, { onConflict: "department_id" });
  if (error) throw new Error(`Failed to upsert admission details: ${error.message}`);
}

function reportForOutput(plan) {
  return {
    universityId: plan.universityId,
    sourceFiles: plan.sourceFiles,
    existingDepartments: plan.existingDepartments,
    matchedExisting: plan.matchedExisting.length,
    levelCorrections: plan.levelCorrections,
    newDepartments: plan.newDepartments.map(({ sourceFile, ...department }) => ({
      ...department,
      sourceFile,
    })),
    duplicateNameDifferentLevel: plan.duplicateNameDifferentLevel,
    warnings: plan.warnings,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const supabase = createSupabaseClient();
  const sourcePrograms = loadSourcePrograms();
  const dbDepartments = await fetchBolognaDepartments(supabase);
  const plan = createPlan(sourcePrograms, dbDepartments);
  const report = reportForOutput(plan);

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (mode === "apply") {
    await applyPlan(supabase, plan);
    console.log(`[OK] Applied ${sourcePrograms.length} Bologna program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
```

- [ ] **Step 6: Run dry-run**

```bash
node scripts/import-bologna-program-details.mjs --dry-run
```

Expected:
- `output/bologna-program-details-import-report.json` is written.
- Report shows `sourceFiles: 97`.
- Report contains `single-cycle` corrections for Medicine and Surgery, Pharmacy, Veterinary Medicine unless the DB was already corrected.
- Report contains both `Statistical Sciences` levels as separate records.
- Report treats `Archaeology` as a new department when only the longer archaeology program exists.

- [ ] **Step 7: Review report before apply**

Open `output/bologna-program-details-import-report.json`.

Expected:
- No unexpected warning.
- New department names are real program names from `/Users/keremyarar/Desktop/results`.
- No user-owned tables are mentioned.

- [ ] **Step 8: Commit import script**

```bash
git add scripts/import-bologna-program-details.mjs output/bologna-program-details-import-report.json
git commit -m "feat: add bologna program detail import dry run"
```

---

### Task 5: Apply Bologna Detail Data After Report Approval

**Files:**
- Data write only through Supabase
- Generated report: `output/bologna-program-details-import-report.json`

- [ ] **Step 1: Confirm report with Kerem**

Ask:

```text
Dry-run report is ready at output/bologna-program-details-import-report.json. Please confirm before I run --apply against Supabase.
```

Expected: Kerem explicitly approves.

- [ ] **Step 2: Run apply**

Use one of these apply paths.

Preferred if service role env exists:

```bash
npm_config_yes=true node scripts/import-bologna-program-details.mjs --apply
```

If `SUPABASE_SERVICE_ROLE_KEY` is not available, stop at this step and ask Kerem to choose one explicit write path before continuing: add a temporary local `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`, or revise this plan with a SQL-artifact apply task that is executed through Supabase MCP. Do not paste ad hoc hand-written JSON inserts into the SQL editor.

Expected:
- 97 detail payloads upserted.
- New Bologna departments inserted.
- `single-cycle` corrections applied.

- [ ] **Step 3: Verify live counts**

Run through Supabase MCP:

```sql
select count(*)::int as bologna_detail_count
from public.program_admission_details
where university_id = 3;

select name, slug, level, duration_years
from public.university_departments
where university_id = 3
  and name in ('Medicine and Surgery', 'Pharmacy', 'Veterinary Medicine', 'Statistical Sciences', 'Archaeology', 'Archaeology and Cultures of the Ancient World')
order by name, level;
```

Expected:
- `bologna_detail_count` is `97`.
- Medicine and Surgery, Pharmacy, Veterinary Medicine are `single-cycle`.
- `Statistical Sciences` has both bachelor and master rows.
- `Archaeology` and `Archaeology and Cultures of the Ancient World` both exist.

- [ ] **Step 4: Do not commit live DB state**

No git commit is needed for live DB data. Commit only script/report/source-code changes.

---

### Task 6: Add Live Program Detail Guard

**Files:**
- Create: `scripts/check-program-details.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create guard script**

Create `scripts/check-program-details.mjs`:

```js
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BOLOGNA_UNIVERSITY_ID = 3;
const EXPECTED_BOLOGNA_DETAIL_COUNT = 97;
const ALLOWED_LEVELS = new Set(["bachelor", "master", "single-cycle"]);
const failures = [];

function fail(message) {
  failures.push(message);
}

function loadDotenvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function createSupabaseClient() {
  loadDotenvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    fail("NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isArray(value) {
  return Array.isArray(value);
}

const supabase = createSupabaseClient();

if (supabase) {
  const { data: details, error: detailsError } = await supabase
    .from("program_admission_details")
    .select("department_id,university_id,official_program_url,required_documents,source_quotes,uncertain,uncertainty_notes")
    .eq("university_id", BOLOGNA_UNIVERSITY_ID);

  if (detailsError) {
    fail(`Failed to fetch program_admission_details: ${detailsError.message}`);
  } else {
    if ((details ?? []).length !== EXPECTED_BOLOGNA_DETAIL_COUNT) {
      fail(`Expected ${EXPECTED_BOLOGNA_DETAIL_COUNT} Bologna details, got ${(details ?? []).length}`);
    }

    for (const detail of details ?? []) {
      if (typeof detail.official_program_url !== "string" || !detail.official_program_url.startsWith("https://")) {
        fail(`detail ${detail.department_id} has invalid official_program_url`);
      }
      for (const field of ["required_documents", "source_quotes", "uncertain", "uncertainty_notes"]) {
        if (!isArray(detail[field])) {
          fail(`detail ${detail.department_id} has non-array ${field}`);
        }
      }
    }
  }

  const { data: departments, error: departmentsError } = await supabase
    .from("university_departments")
    .select("name,slug,level,duration_years")
    .eq("university_id", BOLOGNA_UNIVERSITY_ID);

  if (departmentsError) {
    fail(`Failed to fetch university_departments: ${departmentsError.message}`);
  } else {
    const slugs = new Set();
    for (const department of departments ?? []) {
      if (slugs.has(department.slug)) {
        fail(`duplicate Bologna slug: ${department.slug}`);
      }
      slugs.add(department.slug);
      if (!ALLOWED_LEVELS.has(department.level)) {
        fail(`${department.slug} has invalid level ${department.level}`);
      }
    }

    const requiredPrograms = [
      ["Medicine and Surgery", "single-cycle"],
      ["Pharmacy", "single-cycle"],
      ["Veterinary Medicine", "single-cycle"],
      ["Archaeology", "master"],
      ["Archaeology and Cultures of the Ancient World", "master"],
    ];

    for (const [name, level] of requiredPrograms) {
      if (!(departments ?? []).some((department) => department.name === name && department.level === level)) {
        fail(`Missing expected Bologna program: ${name} (${level})`);
      }
    }

    const statisticalSciences = (departments ?? []).filter(
      (department) => department.name === "Statistical Sciences"
    );
    if (!statisticalSciences.some((department) => department.level === "bachelor")) {
      fail("Missing Statistical Sciences bachelor row");
    }
    if (!statisticalSciences.some((department) => department.level === "master")) {
      fail("Missing Statistical Sciences master row");
    }
  }
}

if (failures.length > 0) {
  console.error("[FAIL] Program details check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Program details check passed.");
```

- [ ] **Step 2: Add package script**

In `package.json`, add:

```json
"check:program-details": "node scripts/check-program-details.mjs"
```

Place it near the existing `check:*` scripts.

- [ ] **Step 3: Run guard**

```bash
npm run check:program-details
```

Expected:
- Before Task 5 apply, this may fail because detail count is not 97.
- After Task 5 apply, it must pass.

- [ ] **Step 4: Commit guard**

```bash
git add scripts/check-program-details.mjs package.json
git commit -m "test: add program details data guard"
```

---

### Task 7: Render `single-cycle` and Admission Details in UI

**Files:**
- Create: `components/university-details/ProgramAdmissionDetailsPanel.tsx`
- Modify: `components/university-details/ProgramDirectory.tsx`
- Modify: `app/universities/[id]/departments/[deptSlug]/page.tsx`
- Modify: `lib/translations.ts`

- [ ] **Step 1: Add translations**

In both `tr.detail` and `en.detail`, add:

```ts
singleCyclePrograms: "Tek Devre",
```

for Turkish and:

```ts
singleCyclePrograms: "Single-cycle",
```

for English.

In both `tr.department` and `en.department`, add keys:

```ts
singleCycle: "Tek Devre",
admissionDetails: "Başvuru Detayları",
officialProgramPage: "Resmi Program Sayfası",
officialCall: "Resmi Çağrı",
tuitionFees: "Ücretler",
campus: "Kampüs",
degreeClass: "Derece Sınıfı",
admissionType: "Kabul Tipi",
euDeadline: "EU Deadline",
nonEuDeadline: "Non-EU Deadline",
academicRequirements: "Akademik Koşullar",
languageRequirements: "Dil Koşulları",
requiredDocuments: "Gerekli Belgeler",
entryExamOrTest: "Sınav / Test",
uncertaintyNote: "Bazı alanlar resmi kaynakta belirsiz veya önceki yıl çağrısıyla desteklenmiş olabilir.",
```

English values:

```ts
singleCycle: "Single-cycle",
admissionDetails: "Admission Details",
officialProgramPage: "Official Program Page",
officialCall: "Official Call",
tuitionFees: "Tuition / Fees",
campus: "Campus",
degreeClass: "Degree Class",
admissionType: "Admission Type",
euDeadline: "EU Deadline",
nonEuDeadline: "Non-EU Deadline",
academicRequirements: "Academic Requirements",
languageRequirements: "Language Requirements",
requiredDocuments: "Required Documents",
entryExamOrTest: "Entry Exam / Test",
uncertaintyNote: "Some fields may be uncertain in the official source or supported by a previous-year call.",
```

- [ ] **Step 2: Create admission details panel**

Create `components/university-details/ProgramAdmissionDetailsPanel.tsx`:

```tsx
import { ExternalLink } from "lucide-react";

import type { ProgramAdmissionDetails } from "@/app/data";

interface ProgramAdmissionDetailsLabels {
  title: string;
  officialProgramPage: string;
  officialCall: string;
  tuitionFees: string;
  campus: string;
  degreeClass: string;
  admissionType: string;
  euDeadline: string;
  nonEuDeadline: string;
  academicRequirements: string;
  languageRequirements: string;
  requiredDocuments: string;
  entryExamOrTest: string;
  uncertaintyNote: string;
}

interface ProgramAdmissionDetailsPanelProps {
  details?: ProgramAdmissionDetails;
  labels: ProgramAdmissionDetailsLabels;
}

function ExternalSourceLink({ href, label }: { href?: string; label: string }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-10 items-center gap-2 border border-[var(--editorial-border)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--editorial-sage)] transition hover:border-[var(--editorial-sage)] hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="grid gap-2 border-t border-[var(--editorial-border)] py-4 md:grid-cols-[210px_minmax(0,1fr)]">
      <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
        {label}
      </dt>
      <dd className="font-serif text-lg leading-7 text-[var(--editorial-ink)]">
        {value}
      </dd>
    </div>
  );
}

export function ProgramAdmissionDetailsPanel({
  details,
  labels,
}: ProgramAdmissionDetailsPanelProps) {
  if (!details) return null;

  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--editorial-border)] px-4 py-4 sm:px-5">
        <h2 className="font-serif text-3xl font-semibold text-[var(--editorial-ink)]">
          {labels.title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <ExternalSourceLink href={details.officialProgramUrl} label={labels.officialProgramPage} />
          <ExternalSourceLink href={details.officialCallUrl} label={labels.officialCall} />
          <ExternalSourceLink href={details.tuitionOrFeesLink} label={labels.tuitionFees} />
        </div>
      </header>

      <dl className="px-4 sm:px-5">
        <DetailRow label={labels.campus} value={details.campus} />
        <DetailRow label={labels.degreeClass} value={details.degreeClass} />
        <DetailRow label={labels.admissionType} value={details.admissionType} />
        <DetailRow label={labels.euDeadline} value={details.applicationDeadlineEu} />
        <DetailRow label={labels.nonEuDeadline} value={details.applicationDeadlineNonEu} />
        <DetailRow label={labels.academicRequirements} value={details.academicRequirements} />
        <DetailRow label={labels.languageRequirements} value={details.languageRequirements} />
        <DetailRow label={labels.entryExamOrTest} value={details.entryExamOrTest} />
      </dl>

      {details.requiredDocuments.length > 0 && (
        <div className="border-t border-[var(--editorial-border)] px-4 py-5 sm:px-5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
            {labels.requiredDocuments}
          </h3>
          <ul className="mt-4 space-y-3">
            {details.requiredDocuments.map((document) => (
              <li
                key={document}
                className="border-l-2 border-[var(--editorial-sage)] pl-3 font-serif text-lg leading-7 text-[var(--editorial-ink)]"
              >
                {document}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(details.uncertain.length > 0 || details.uncertaintyNotes.length > 0) && (
        <div className="border-t border-[var(--editorial-border)] bg-[var(--editorial-band)] px-4 py-4 text-sm font-bold leading-6 text-[var(--editorial-muted)] sm:px-5">
          {labels.uncertaintyNote}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Add single-cycle group to directory**

In `components/university-details/ProgramDirectory.tsx`, add prop:

```ts
singleCyclePrograms: string;
```

Destructure it in `ProgramDirectory()`.

Add:

```ts
const singleCycleDepartments = departments.filter(
  (department) => department.level === "single-cycle",
);
```

Change the grid class from:

```tsx
<div className="grid gap-4 lg:grid-cols-2">
```

to:

```tsx
<div className="grid gap-4 lg:grid-cols-3">
```

Add a third `ProgramGroup`:

```tsx
<ProgramGroup
  university={university}
  departments={singleCycleDepartments}
  label={singleCyclePrograms}
  openingLabel={openingLabel}
  expandingSlug={expandingSlug}
  onSelect={onSelect}
/>
```

- [ ] **Step 4: Render details on department page**

In `app/universities/[id]/departments/[deptSlug]/page.tsx`, import:

```ts
import { ProgramAdmissionDetailsPanel } from "@/components/university-details/ProgramAdmissionDetailsPanel";
```

Replace:

```ts
const safeLevel = department.level === "master" ? "master" : "bachelor";
const levelValue =
  safeLevel === "master" ? t.department.master : t.department.bachelor;
```

with:

```ts
const safeLevel =
  department.level === "master" || department.level === "single-cycle"
    ? department.level
    : "bachelor";
const levelValue =
  safeLevel === "single-cycle"
    ? t.department.singleCycle
    : safeLevel === "master"
      ? t.department.master
      : t.department.bachelor;
```

After the school context section, render:

```tsx
<ProgramAdmissionDetailsPanel
  details={department.admissionDetails}
  labels={{
    title: t.department.admissionDetails,
    officialProgramPage: t.department.officialProgramPage,
    officialCall: t.department.officialCall,
    tuitionFees: t.department.tuitionFees,
    campus: t.department.campus,
    degreeClass: t.department.degreeClass,
    admissionType: t.department.admissionType,
    euDeadline: t.department.euDeadline,
    nonEuDeadline: t.department.nonEuDeadline,
    academicRequirements: t.department.academicRequirements,
    languageRequirements: t.department.languageRequirements,
    requiredDocuments: t.department.requiredDocuments,
    entryExamOrTest: t.department.entryExamOrTest,
    uncertaintyNote: t.department.uncertaintyNote,
  }}
/>
```

Update both `ProgramDirectory` calls in:

```text
app/universities/[id]/page.tsx
app/universities/[id]/departments/[deptSlug]/page.tsx
```

by adding:

```tsx
singleCyclePrograms={t.detail.singleCyclePrograms}
```

- [ ] **Step 5: Run UI checks**

```bash
npm run lint
npm run check:university-details-ui
```

Expected:
- Lint passes.
- Existing detail portrait check passes or is updated to expect `singleCyclePrograms`.

- [ ] **Step 6: Commit UI changes**

```bash
git add components/university-details/ProgramAdmissionDetailsPanel.tsx components/university-details/ProgramDirectory.tsx app/universities/[id]/page.tsx app/universities/[id]/departments/[deptSlug]/page.tsx lib/translations.ts
git commit -m "feat: show program admission details"
```

---

### Task 8: Final Verification

**Files:**
- No new files

- [ ] **Step 1: Run data checks**

```bash
npm run check:data
npm run check:program-details
npm run check:university-data-source
npm run check:university-department-merge
```

Expected:
- All pass.
- `check:data` reports `single-cycle` in level distribution after live apply.

- [ ] **Step 2: Run app checks**

```bash
npm run lint
npm run build
```

Expected:
- `lint` passes.
- `build` passes.

- [ ] **Step 3: Manual browser verification**

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/universities/3/departments/medicine-and-surgery
http://localhost:3000/universities/3/departments/statistical-sciences
```

Expected:
- Medicine and Surgery displays `single-cycle`.
- Program details panel appears with official program link.
- Statistical Sciences bachelor page still works.
- The master Statistical Sciences route appears in the "Other Programs" directory under the `Master` grouping.

- [ ] **Step 4: Commit final check updates when files changed**

If any guard script needed a small expectation update:

```bash
git add scripts/check-university-detail-portrait.mjs scripts/check-university-department-merge.mjs package.json
git commit -m "test: update program detail verification"
```

If no files changed, skip this commit.

---

## Execution Notes

- Do not touch unrelated dirty files already in the worktree.
- Do not run live `--apply` until the dry-run report is reviewed and approved.
- Do not use `NEXT_PUBLIC_` service credentials. `SUPABASE_SERVICE_ROLE_KEY` must never be added to client code or committed.
- If Supabase Data API returns permission errors for the new table, verify both `grant select` and the public read RLS policy.
- If the script cannot write with service role env, stop and use Supabase MCP/SQL Editor with an audited SQL artifact rather than hand-editing production rows.
