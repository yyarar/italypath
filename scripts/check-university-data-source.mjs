import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

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
// Dizin (hafif) + hedefli okul cekisi sozlesmesi; ayrinti docs/superpowers/specs/2026-09-15-university-data-egress-isr-design.md
if (/export async function getUniversitiesData\b/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must not export the full-dataset getUniversitiesData (4.6 MB per cold instance)");
}
if (!/export async function getUniversitiesDirectory\b/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must export getUniversitiesDirectory (light directory: no heavy admission text)");
}
if (!/export async function getUniversityById\b/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must export getUniversityById (targeted per-university fetch)");
}
if (!universitiesServerData.includes('.select("department_id,updated_at")')) {
  fail('lib/universities.server.ts directory must fetch admission presence with select("department_id,updated_at") only (no heavy text)');
}
if (!universitiesServerData.includes('.eq("university_id", ')) {
  fail('lib/universities.server.ts getUniversityById must filter departments/admission rows with eq("university_id", ...)');
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

const targetedSurfaces = [
  "app/universities/[id]/page.tsx",
  "app/universities/[id]/layout.tsx",
  "app/universities/[id]/departments/[deptSlug]/page.tsx",
  "app/universities/[id]/departments/[deptSlug]/layout.tsx",
];
for (const path of targetedSurfaces) {
  const source = read(path);
  if (!source.includes("getUniversityById(")) {
    fail(`${path} must read its university via getUniversityById()`);
  }
  if (source.includes("getUniversitiesData(")) {
    fail(`${path} must not call the removed full-dataset getUniversitiesData()`);
  }
}

if (!universitiesDataHook.includes("fetchWhenInitial")) {
  fail("lib/useUniversitiesData.ts must support the fetchWhenInitial option (detail pages keep server data)");
}
for (const path of [
  "components/university-details/UniversityDetailClient.tsx",
  "components/university-details/DepartmentDetailClient.tsx",
]) {
  if (!read(path).includes("fetchWhenInitial: false")) {
    fail(`${path} must call useUniversitiesData with { fetchWhenInitial: false } so the light directory never overrides server data`);
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
