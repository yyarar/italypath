import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const proxyPath = resolve(process.cwd(), "proxy.ts");
const source = readFileSync(proxyPath, "utf8");
const scholarshipsExplorerPath = resolve(
  process.cwd(),
  "components/scholarships/ScholarshipsExplorer.tsx"
);
const scholarshipsExplorerSource = readFileSync(scholarshipsExplorerPath, "utf8");

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
  "/cities",
  "/cities/milano",
  "/isee",
  "/scholarships",
  "/communities",
  "/topluluklar",
  "/api/universities",
  "/data/italy-regions.geojson",
  "/sign-in",
  "/sign-up",
  "/giris",
  "/sitemap.xml",
  "/robots.txt",
];

const protectedChecks = [
  "/ai-mentor",
  "/ai-mentor/session",
  "/documents",
  "/ekip/mentor",
  "/favorites",
  "/hosgeldin",
  "/hub",
  "/api/chat",
  "/profile",
];

const protectedRoutesMatch = source.match(
  /const PROTECTED_PAGE_ROUTES = \[([\s\S]*?)\];/m,
);
if (!protectedRoutesMatch) {
  console.error("[FAIL] PROTECTED_PAGE_ROUTES could not be parsed from proxy.ts");
  process.exit(1);
}
const protectedPageRoutes = [
  ...protectedRoutesMatch[1].matchAll(/["']([^"']+)["']/g),
].map((match) => match[1]);

function isExplicitlyProtectedPage(pathname) {
  return protectedPageRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

const redirectBuilderMatch = source.match(
  /function buildSignInRedirectUrl\(request: NextRequest\) \{([\s\S]*?)\n\}/m,
);
let buildSignInRedirectUrl = null;
if (redirectBuilderMatch) {
  try {
    buildSignInRedirectUrl = new Function("request", redirectBuilderMatch[1]);
  } catch {
    buildSignInRedirectUrl = null;
  }
}

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

if (!isExplicitlyProtectedPage("/ekip/mentor")) {
  failures.push("Expected /ekip/mentor to use the explicit signed-out page redirect policy");
}

if (!buildSignInRedirectUrl) {
  failures.push("Could not execute the signed-out redirect builder from proxy.ts");
} else {
  const redirect = buildSignInRedirectUrl({
    url: "https://italypath.app/ekip/mentor?queue=closed",
    nextUrl: { pathname: "/ekip/mentor", search: "?queue=closed" },
  });
  const expectedRedirect =
    "https://italypath.app/giris?redirect_url=%2Fekip%2Fmentor%3Fqueue%3Dclosed";
  if (redirect !== expectedRedirect) {
    failures.push(`Unexpected /ekip/mentor signed-out redirect: ${redirect}`);
  }
}

if (
  !/if \(isProtectedPageRoute\(request\.nextUrl\.pathname\)\)[\s\S]{0,240}unauthenticatedUrl: buildSignInRedirectUrl\(request\)/m.test(
    source,
  )
) {
  failures.push("Protected page middleware branch no longer uses the custom /giris redirect");
}

if (publicPatterns.includes("/ai-mentor(.*)")) {
  failures.push("Public list still contains /ai-mentor(.*)");
}

if (!publicPatterns.includes("/api/universities(.*)")) {
  failures.push("Public list is missing /api/universities(.*)");
}

if (!publicPatterns.includes("/data(.*)")) {
  failures.push("Public list is missing /data(.*)");
}

if (scholarshipsExplorerSource.includes("cache: 'force-cache'")) {
  failures.push("Scholarship map GeoJSON fetch must not use force-cache");
}

if (!scholarshipsExplorerSource.includes("REGIONS_GEOJSON_VERSION")) {
  failures.push("Scholarship map GeoJSON fetch is missing an explicit cache-busting version");
}

if (!publicPatterns.includes("/scholarships(.*)")) {
  failures.push("Public list is missing /scholarships(.*)");
}

if (!publicPatterns.includes("/communities(.*)")) {
  failures.push("Public list is missing /communities(.*)");
}

if (!publicPatterns.includes("/topluluklar(.*)")) {
  failures.push("Public list is missing /topluluklar(.*)");
}

if (!publicPatterns.includes("/cities(.*)")) {
  failures.push("Public list is missing /cities(.*)");
}

if (!publicPatterns.includes("/giris(.*)")) {
  failures.push("Public list is missing /giris(.*)");
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
