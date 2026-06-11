import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
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
  "components/FeaturesSection.tsx",
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

const universitiesServerData = read("lib/universities.server.ts");
if (/60\s*\*\s*60\s*\*\s*1000/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must not keep live university data stale for one hour");
}

if (!universitiesServerData.includes("const SERVER_CACHE_TTL_MS = 0;")) {
  fail("lib/universities.server.ts must disable the in-memory university data cache");
}

if (failures.length > 0) {
  console.error("[FAIL] University data source check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] University data source check passed.");
