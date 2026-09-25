import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function collectSourceFiles(directory) {
  return readdirSync(resolve(process.cwd(), directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return collectSourceFiles(path);
      return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    }
  );
}

for (const path of ["app", "components", "lib"].flatMap(collectSourceFiles)) {
  if (path === "app/data.ts") continue;

  const source = read(path);
  if (/from\s+["'][^"']*app\/data["']/.test(source)) {
    fail(`${path} must not import the legacy local seed in app/data.ts`);
  }
}

const liveDataSurfaces = [
  "app/api/universities/route.ts",
  "app/api/chat/route.ts",
  "app/sitemap.ts",
  "app/universities/[id]/layout.tsx",
  "app/universities/[id]/departments/[deptSlug]/layout.tsx",
];

for (const path of liveDataSurfaces) {
  if (!existsSync(resolve(process.cwd(), path))) {
    fail(`${path} is missing`);
    continue;
  }

  const source = read(path);
  if (source.includes("universitiesData")) {
    fail(`${path} must not read live university data from app/data.ts`);
  }
}

const marketingSurfaces = [
  "components/HeroSection.tsx",
  "components/home/HomeToolsSection.tsx",
  "components/VelocityBridge.tsx",
];

for (const path of marketingSurfaces) {
  if (!existsSync(resolve(process.cwd(), path))) {
    fail(`${path} is missing`);
    continue;
  }

  const source = read(path);
  if (/["'`]240["'`]/.test(source) || /240 program/i.test(source)) {
    fail(`${path} must not hard-code the old 240 program count`);
  }
}

const universitiesDataHook = read("lib/useUniversitiesData.ts");
if (universitiesDataHook.includes('cache: "force-cache"')) {
  fail("lib/useUniversitiesData.ts must not force-cache /api/universities in the browser");
}

if (!universitiesDataHook.includes('cache: "no-store"')) {
  fail("lib/useUniversitiesData.ts must request fresh /api/universities data from the browser");
}

const universitiesApiRoute = read("app/api/universities/route.ts");
if (/s-maxage|stale-while-revalidate/.test(universitiesApiRoute)) {
  fail("app/api/universities/route.ts must not return stale cache headers for admission data");
}

if (!universitiesApiRoute.includes("no-store")) {
  fail("app/api/universities/route.ts must mark university API responses as no-store");
}

// Egress guard (2026-07-02 Supabase kota asimi): server-side memo ZORUNLU.
// TTL 1-6 saat araliginda tutulur; kapatmak (0) veya asiri uzatmak fail'dir.
const universitiesServerData = read("lib/universities.server.ts");
const ttlMatch = universitiesServerData.match(
  /const SERVER_CACHE_TTL_MS = (\d+) \* 60 \* 60 \* 1000;/
);
if (!ttlMatch) {
  fail(
    "lib/universities.server.ts must define SERVER_CACHE_TTL_MS as `N * 60 * 60 * 1000` (in-memory egress guard)"
  );
} else {
  const ttlHours = Number(ttlMatch[1]);
  if (ttlHours < 1 || ttlHours > 6) {
    fail("lib/universities.server.ts SERVER_CACHE_TTL_MS must stay between 1 and 6 hours");
  }
}

if (!universitiesServerData.includes("serving stale cached data")) {
  fail(
    "lib/universities.server.ts must serve stale cached data when the Supabase fetch fails"
  );
}

// Egress diyeti (2026-09-15): tam veri seti compose'u runtime'dan kaldirildi.
// Dizin (hafif) + program basina hedefli kabul satiri (2026-09-25); ilk tasarim
// docs/superpowers/specs/2026-09-15-university-data-egress-isr-design.md
if (/export async function getUniversitiesData\b/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must not export the full-dataset getUniversitiesData (4.6 MB per cold instance)");
}
if (!/export async function getUniversitiesDirectory\b/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must export getUniversitiesDirectory (light directory: no heavy admission text)");
}
if (!/export async function getUniversityById\b/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must export getUniversityById (school entry from the directory)");
}
// 2026-09-17: dizin, "ayni alanda diger universiteler" icin resmi bolum sinifi kodunu ayri ve
// hafif bir sorguyla ceker: uzun degree_class metni degil, program_degree_class_codes gorunumunun
// kisa kod kolonu (egress: ~4 KB gz). Kabul metinleri (sartlar, belgeler, alintilar) dizine GIRMEZ.
if (!universitiesServerData.includes('.from("program_degree_class_codes")')) {
  fail('lib/universities.server.ts directory must read degree class codes from the program_degree_class_codes view');
}
if (!universitiesServerData.includes('.select("department_id,degree_class_codes")')) {
  fail('lib/universities.server.ts directory must select only department_id,degree_class_codes from the codes view');
}
if (universitiesServerData.includes('.select("department_id,degree_class")')) {
  fail("lib/universities.server.ts must not download the long degree_class text for the directory (use the codes view)");
}
if (!universitiesServerData.includes("extractDegreeClassCodes")) {
  fail("lib/universities.server.ts must normalize degree class values with extractDegreeClassCodes");
}

if (!universitiesServerData.includes('.select("department_id,updated_at")')) {
  fail('lib/universities.server.ts directory must fetch admission presence with select("department_id,updated_at") only (no heavy text)');
}
// 2026-09-25 guvenlik denetimi (O1#1, S9#3): okul sayfasi ve layout'lar dizinden beslenir; program
// sayfasi yalnizca kendi kabul satirini hedefli sorguyla ceker. Okul basina tam kabul dosyasi cekimi yok.
const programAdmissionFetch = universitiesServerData.match(
  /async function fetchProgramAdmissionDetails\([\s\S]*?\n\}/
)?.[0];
if (!programAdmissionFetch) {
  fail("lib/universities.server.ts must fetch one program's dossier in fetchProgramAdmissionDetails()");
} else {
  for (const token of ['.eq("university_id", universityId)', '.eq("department_id", departmentId)', ".maybeSingle"]) {
    if (!programAdmissionFetch.includes(token)) {
      fail(`fetchProgramAdmissionDetails must use ${token} (one row per program page)`);
    }
  }
}
if (/fetchProgramAdmissionDetailRows|fetchUniversityRows\(\s*\w/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must not fetch a whole school's admission dossiers (per-school full fetch removed)");
}
const dossierColumns = universitiesServerData.match(/const PROGRAM_ADMISSION_DOSSIER_COLUMNS =\s*"([^"]+)"/)?.[1];
if (!dossierColumns) {
  fail("lib/universities.server.ts must define PROGRAM_ADMISSION_DOSSIER_COLUMNS");
} else {
  for (const unused of ["raw_program_name", "raw_level", "source_file"]) {
    if (dossierColumns.split(",").includes(unused)) {
      fail(`PROGRAM_ADMISSION_DOSSIER_COLUMNS must not select the unused ${unused} column`);
    }
  }
}
const getUniversityByIdBody = universitiesServerData.match(
  /export async function getUniversityById\([\s\S]*?\n\}/
)?.[0];
if (!getUniversityByIdBody?.includes("getUniversitiesDirectory()") || !getUniversityByIdBody.includes("parseCanonicalUniversityId(")) {
  fail("getUniversityById must resolve a canonical id from the memoized directory (no separate school fetch)");
}
for (const exported of ["getProgramPageData", "pruneUniversityForProgram"]) {
  if (!new RegExp(`export (async )?function ${exported}\\b`).test(universitiesServerData)) {
    fail(`lib/universities.server.ts must export ${exported}`);
  }
}
const admissionMemoMax = Number(
  universitiesServerData.match(/const ADMISSION_MEMO_MAX_ENTRIES = (\d+);/)?.[1] ?? 0
);
if (admissionMemoMax <= 941) {
  fail("ADMISSION_MEMO_MAX_ENTRIES must stay above the live program count (941 on 2026-09-21)");
}
if (!universitiesServerData.includes("STALE_RETRY_MS")) {
  fail("lib/universities.server.ts must keep a stale entry for STALE_RETRY_MS after a failed refresh");
}

// 2026-09-25 (S9#1, O4#4, G4#2): katalog okumalari server-only gizli anahtarla ve sure sinirli.
if (!/^import "server-only";/.test(universitiesServerData)) {
  fail('lib/universities.server.ts must start with import "server-only"');
}
if (universitiesServerData.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
  fail("lib/universities.server.ts must not read catalog tables with the public anon key");
}
if (!universitiesServerData.includes("process.env.SUPABASE_SECRET_KEY") || !universitiesServerData.includes('startsWith("sb_secret_")')) {
  fail("lib/universities.server.ts must read with SUPABASE_SECRET_KEY and reject keys that are not sb_secret_ secret keys");
}
const timeoutMs = Number(
  universitiesServerData.match(/const SUPABASE_REQUEST_TIMEOUT_MS = (\d+);/)?.[1] ?? 0
);
if (timeoutMs < 1000 || timeoutMs > 15000 || !universitiesServerData.includes("db: { timeout: SUPABASE_REQUEST_TIMEOUT_MS }")) {
  fail("lib/universities.server.ts Supabase client must set db.timeout via SUPABASE_REQUEST_TIMEOUT_MS (1-15 s)");
}
const catalogScripts = [
  "scripts/check-program-details.mjs",
  "scripts/validate-supabase-university-data.mjs",
  ...readdirSync(resolve(process.cwd(), "scripts"))
    .filter((name) => /^import-.*\.mjs$/.test(name))
    .map((name) => `scripts/${name}`),
];
for (const path of catalogScripts) {
  if (read(path).includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    fail(`${path} must read catalog tables with SUPABASE_SECRET_KEY, not the public anon key`);
  }
}

const directorySurfaces = [
  "app/page.tsx",
  "app/universities/page.tsx",
  "app/cities/page.tsx",
  "app/sitemap.ts",
  "app/api/universities/route.ts",
  "app/api/chat/route.ts",
];
for (const path of directorySurfaces) {
  const source = read(path);
  if (!source.includes("getUniversitiesDirectory(")) {
    fail(`${path} must read university data via getUniversitiesDirectory()`);
  }
  if (source.includes("getUniversitiesData(")) {
    fail(`${path} must not call the removed full-dataset getUniversitiesData()`);
  }
}

const schoolSurfaces = [
  "app/universities/[id]/page.tsx",
  "app/universities/[id]/layout.tsx",
];
for (const path of schoolSurfaces) {
  const source = read(path);
  if (!source.includes("getUniversityById(")) {
    fail(`${path} must read its university via getUniversityById() (directory entry)`);
  }
  if (source.includes("getProgramPageData(") || source.includes("getUniversitiesData(")) {
    fail(`${path} must not load admission dossiers`);
  }
}

const programSurfaces = [
  "app/universities/[id]/departments/[deptSlug]/page.tsx",
  "app/universities/[id]/departments/[deptSlug]/layout.tsx",
];
for (const path of programSurfaces) {
  const source = read(path);
  if (!source.includes("getProgramPageData(")) {
    fail(`${path} must read the program via getProgramPageData() (shared with the metadata layout)`);
  }
  if (source.includes("getUniversitiesData(")) {
    fail(`${path} must not call the removed full-dataset getUniversitiesData()`);
  }
}
if (!read("app/universities/[id]/departments/[deptSlug]/page.tsx").includes("pruneUniversityForProgram(")) {
  fail("program page must send the client only its own dossier via pruneUniversityForProgram()");
}

// Detay istemcileri yalnizca sunucu verisini gosterir; hafif dizini ayrica cekmez.
for (const path of [
  "components/university-details/UniversityDetailClient.tsx",
  "components/university-details/DepartmentDetailClient.tsx",
]) {
  if (read(path).includes("useUniversitiesData")) {
    fail(`${path} must render server data only (no /api/universities fetch)`);
  }
}

// ISR sayfalari veri hatasini yakalamaz (son saglam sayfa kalsin); kok hata sayfasi markali.
if (!existsSync(resolve(process.cwd(), "app/global-error.tsx"))) {
  fail("app/global-error.tsx is missing (branded root error page)");
}

// Kanonik okul adresi (S9#2): proxy onbellekten once cozer; kural lib/universityPath.ts'te.
const proxySource = read("proxy.ts");
const universityPathCall = proxySource.indexOf("handleUniversityPath(request)");
const publicRouteCall = proxySource.indexOf("if (isPublicRoute(request))");
if (!proxySource.includes("resolveUniversityPath(") || universityPathCall === -1 || universityPathCall > publicRouteCall) {
  fail("proxy.ts must resolve non-canonical /universities/<id> paths before the public route branch");
}
{
  const transpiled = ts.transpileModule(read("lib/universityPath.ts"), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const { resolveUniversityPath, parseCanonicalUniversityId } = await import(
    `data:text/javascript;base64,${Buffer.from(transpiled, "utf8").toString("base64")}`
  );
  const expectations = [
    ["/universities/3", { kind: "pass" }],
    ["/universities/3/departments/computer-science", { kind: "pass" }],
    ["/universities", { kind: "pass" }],
    ["/cities/3", { kind: "pass" }],
    ["/universities/003", { kind: "redirect", pathname: "/universities/3" }],
    ["/universities/%33", { kind: "redirect", pathname: "/universities/3" }],
    ["/universities/0003/departments/x", { kind: "redirect", pathname: "/universities/3/departments/x" }],
    ["/universities/0", { kind: "notFound" }],
    ["/universities/abc", { kind: "notFound" }],
    ["/universities/1e3", { kind: "notFound" }],
    ["/universities/%E0%A4%A", { kind: "notFound" }],
    ["/universities/1234567890", { kind: "notFound" }],
  ];
  for (const [pathname, expected] of expectations) {
    const actual = resolveUniversityPath(pathname);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail(`resolveUniversityPath(${pathname}) returned ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    }
  }
  if (parseCanonicalUniversityId("3") !== 3 || parseCanonicalUniversityId("03") !== null) {
    fail("parseCanonicalUniversityId must accept only canonical ids");
  }
}

// Catalog grants (security audit card 4, 2026-09-26): the catalog is read
// only on the server with the secret key, so the SQL artifacts must keep the
// client roles closed. A grant or public read policy here would reopen it.
{
  const privilegesSql = read("supabase/data_api_privileges.sql");
  for (const relation of [
    "universities",
    "university_departments",
    "program_admission_details",
    "program_degree_class_codes",
  ]) {
    if (!privilegesSql.includes(`revoke all on table public.${relation} from public, anon, authenticated;`)) {
      fail(`supabase/data_api_privileges.sql must revoke all on public.${relation} from anon and authenticated`);
    }
  }
  if (!privilegesSql.includes("revoke all on sequence public.university_departments_id_seq from public, anon, authenticated;")) {
    fail("supabase/data_api_privileges.sql must revoke the university_departments id sequence from anon and authenticated");
  }
  for (const policy of [
    "universities_public_read",
    "university_departments_public_read",
    "program_admission_details_public_read",
  ]) {
    if (!privilegesSql.includes(`drop policy if exists ${policy}`)) {
      fail(`supabase/data_api_privileges.sql must drop the ${policy} policy`);
    }
  }
  for (const statement of [
    "alter default privileges for role postgres in schema public\n  revoke all on tables from anon, authenticated;",
    "alter default privileges for role postgres in schema public\n  revoke all on sequences from anon, authenticated;",
  ]) {
    if (!privilegesSql.includes(statement)) {
      fail(`supabase/data_api_privileges.sql must keep new public tables closed: ${statement.split("\n")[1].trim()}`);
    }
  }
  for (const path of [
    "supabase/program_admission_details.sql",
    "supabase/program_degree_class_codes.sql",
    "supabase/data_api_privileges.sql",
  ]) {
    const sql = read(path);
    if (/grant\s+[^;]*\bto\s+[^;]*\b(anon|authenticated)\b/i.test(sql)) {
      fail(`${path} must not grant catalog access to anon or authenticated`);
    }
    if (/create\s+policy[^;]*\bto\s+[^;]*\b(anon|authenticated)\b/i.test(sql)) {
      fail(`${path} must not create a client read policy on the catalog`);
    }
  }
}

if (failures.length > 0) {
  console.error("[FAIL] University data source check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] University data source check passed.");
