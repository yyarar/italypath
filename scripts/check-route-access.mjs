import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const proxyPath = resolve(process.cwd(), "proxy.ts");
const source = readFileSync(proxyPath, "utf8");

const matcherMatch = source.match(/createRouteMatcher\(\s*\[([\s\S]*?)\]\s*\)/m);
if (!matcherMatch) {
  console.error("[FAIL] createRouteMatcher array could not be parsed from proxy.ts");
  process.exit(1);
}

const publicPatterns = [...matcherMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

function matchesPublicRoute(pathname, pattern) {
  if (pattern.endsWith("(.*)")) {
    const prefix = pattern.slice(0, -4);
    if (pathname === prefix) return true;
    if (!pathname.startsWith(prefix)) return false;
    const nextChar = pathname[prefix.length];
    return nextChar === "/";
  }

  return pathname === pattern;
}

function isPublic(pathname) {
  return publicPatterns.some((pattern) => matchesPublicRoute(pathname, pattern));
}

const publicChecks = [
  "/",
  "/universities",
  "/universities/1",
  "/isee",
  "/api/universities",
  "/sign-in",
  "/sign-up",
  "/sitemap.xml",
  "/robots.txt",
];

const protectedChecks = [
  "/ai-mentor",
  "/ai-mentor/session",
  "/documents",
  "/favorites",
  "/api/chat",
  "/profile",
];

const failures = [];

for (const route of publicChecks) {
  if (!isPublic(route)) {
    failures.push(`Expected public but matched protected: ${route}`);
  }
}

for (const route of protectedChecks) {
  if (isPublic(route)) {
    failures.push(`Expected protected but matched public: ${route}`);
  }
}

if (publicPatterns.includes("/ai-mentor(.*)")) {
  failures.push("Public list still contains /ai-mentor(.*)");
}

if (!publicPatterns.includes("/api/universities(.*)")) {
  failures.push("Public list is missing /api/universities(.*)");
}

if (failures.length > 0) {
  console.error("[FAIL] Route access matrix check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Route access matrix check passed.");
console.log(`[OK] Public route patterns: ${publicPatterns.join(", ")}`);
