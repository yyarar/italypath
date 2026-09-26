import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve, sep } from "node:path";
import { runInNewContext } from "node:vm";

// Route erisim matrisi guard'i. Public/protected karari proxy.ts'deki listelerden okunur ve
// Clerk'in calisma zamaninda kullandigi yol eslestiricisiyle (@clerk/shared/pathMatcher)
// denenir; boylece '/yol(.*)' gibi bir kalibin gercekte neyi actigi burada da ayni gorunur.

const root = process.cwd();
const proxyPath = resolve(root, "proxy.ts");
const source = readFileSync(proxyPath, "utf8");
const scholarshipsExplorerPath = resolve(root, "components/scholarships/ScholarshipsExplorer.tsx");
const scholarshipsExplorerSource = readFileSync(scholarshipsExplorerPath, "utf8");
const trustedOriginsSource = readFileSync(resolve(root, "lib/auth/trustedOrigins.ts"), "utf8");

const failures = [];

// Clerk eslestiricisi, @clerk/nextjs'in kendi bagimliligindan cozulur (ayni surum).
const require = createRequire(import.meta.url);
const clerkRequire = createRequire(require.resolve("@clerk/nextjs"));
const { createPathMatcher } = clerkRequire("@clerk/shared/pathMatcher");
const { pathToRegexp } = clerkRequire("@clerk/shared/pathToRegexp");

// Kaynak metindeki bir dizi literalini (yorumlar dahil) guvenli bir baglamda degerlendirir.
function evaluateArrayLiteral(pattern, label) {
  const match = source.match(pattern);
  if (!match) {
    console.error(`[FAIL] ${label} could not be parsed from proxy.ts`);
    process.exit(1);
  }
  return runInNewContext(`[${match[1]}]`, {});
}

const publicPatterns = evaluateArrayLiteral(
  /const isPublicRoute = createRouteMatcher\(\s*\[([\s\S]*?)\]\s*\);/m,
  "isPublicRoute createRouteMatcher array",
);
const protectedPageRoutes = evaluateArrayLiteral(
  /const PROTECTED_PAGE_ROUTES = \[([\s\S]*?)\];/m,
  "PROTECTED_PAGE_ROUTES",
);
const apiRoutePatterns = evaluateArrayLiteral(
  /const isApiRoute = createRouteMatcher\(\s*\[([\s\S]*?)\]\s*\);/m,
  "isApiRoute createRouteMatcher array",
);
const proxyMatchers = evaluateArrayLiteral(
  /export const config = \{\s*matcher: \[([\s\S]*?)\],\s*\};/m,
  "config.matcher",
);

const isPublicPath = createPathMatcher(publicPatterns);
const isApiPath = createPathMatcher(apiRoutePatterns);
const proxyMatcherRegexes = proxyMatchers.map((matcher) => pathToRegexp(matcher));

function isExplicitlyProtectedPage(pathname) {
  return protectedPageRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function runsThroughProxy(pathname) {
  return proxyMatcherRegexes.some((regex) => regex.test(pathname));
}

// proxy.ts'deki dal sirasinin aynisi. "static": proxy hic calismaz (statik dosya veya proxy'siz sayfa;
// 2026-09-26'dan beri matcher yalniz korumali sayfalari, API'leri ve kanonik olmayan okul adreslerini alir).
function classify(pathname) {
  if (!runsThroughProxy(pathname)) return "static";
  if (isPublicPath(pathname)) return "public";
  if (isExplicitlyProtectedPage(pathname)) return "protected-page";
  if (isApiPath(pathname)) return "protected-api";
  return "protected-unlisted";
}

// 1) Kalip bicimi: '/yol(.*)' ayni onekle baslayan kardes yollari da acar ('/data(.*)' -> '/database').
for (const pattern of publicPatterns) {
  if (typeof pattern !== "string") {
    failures.push(`Public pattern must be a string: ${String(pattern)}`);
    continue;
  }
  if (/[^/]\(\.\*\)$/.test(pattern)) {
    failures.push(
      `Public pattern "${pattern}" also opens sibling prefixes; use "${pattern.slice(0, -4)}" + "${pattern.slice(0, -4)}/(.*)" or an exact path`,
    );
  }
}

// 2) Davranis denemeleri (Clerk eslestiricisiyle).
const publicChecks = [
  "/",
  "/universities",
  "/universities/1",
  "/universities/1/departments/computer-science",
  "/cities",
  "/cities/milano",
  "/isee",
  "/scholarships",
  "/communities",
  "/topluluklar",
  "/yasal/gizlilik",
  "/ai-mentor",
  "/ai-mentor/session",
  "/api/universities",
  "/api/expert-leads",
  "/api/webhooks/clerk",
  "/data/italy-regions.geojson",
  "/sign-in",
  "/sign-up",
  "/giris",
  "/giris/sso-callback",
  "/on-gorusme",
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
];

const protectedChecks = [
  "/documents",
  "/ekip/mentor",
  "/ekip/uzman",
  "/favorites",
  "/hosgeldin",
  "/hub",
  "/profile",
  "/sat",
  "/api/sat/questions",
  // Public API kaliplarinin kardes onekleri ve alt yollari public olmamali.
  "/api/expert-leads/export",
  "/api/expert-leads-x",
  "/api/universities/export",
  "/api/webhooks",
  "/api/webhooks/clerk/replay",
  "/api/webhooks/clerkx",
  // Korumali sayfalarin alt yollari da proxy'den gecer.
  "/hub/ayarlar",
  "/ekip",
  "/sat/konu/1",
];

for (const route of publicChecks) {
  // Yol public listede olmali (proxy'ye girerse gecsin) ve proxy onu korumamali.
  if (!isPublicPath(route) || !["public", "static"].includes(classify(route))) {
    failures.push(`Expected public but got ${classify(route)}: ${route}`);
  }
}

for (const route of protectedChecks) {
  const result = classify(route);
  if (result === "public" || result === "static") {
    failures.push(`Expected protected but got ${result}: ${route}`);
  }
}

for (const route of ["/api/sat/questions"]) {
  if (classify(route) !== "protected-api") {
    failures.push(`Expected ${route} to keep Clerk's API response (no HTML redirect), got ${classify(route)}`);
  }
}

if (classify("/ekip/mentor") !== "protected-page") {
  failures.push("Expected /ekip/mentor to use the explicit signed-out page redirect policy");
}

// Proxy kapsami (denetim S9#6): korumali sayfalarin tamami ve alt yollari proxy'den gecer; herkese acik
// sayfalar ve kanonik okul/program adresleri gecmez; kanonik olmayan okul adresi 308/404 icin gecer.
for (const route of protectedPageRoutes) {
  for (const path of [route, `${route}/ornek`]) {
    if (!runsThroughProxy(path)) {
      failures.push(`Protected page ${path} must run through the proxy (config.matcher)`);
    }
  }
}
for (const path of ["/", "/universities", "/universities/7", "/universities/7.rsc", "/universities/7.json", "/universities/7.segments/x.segment.rsc", "/universities/7/departments/computer-science", "/cities", "/scholarships", "/isee", "/communities", "/on-gorusme", "/giris", "/giris/sso-callback", "/ai-mentor", "/yasal/gizlilik", "/data/italy-regions.geojson", "/llms.txt", "/sitemap.xml", "/robots.txt", "/hubx", "/satx"]) {
  if (runsThroughProxy(path)) {
    failures.push(`${path} should not run through the proxy (public page or asset; S9#6)`);
  }
}
for (const path of ["/universities/007", "/universities/003/departments/x", "/universities/%37", "/universities/abc", "/universities/1234567890", "/universities/0", "/universities/7x", "/universities/7.junk", "/universities/007.rsc"]) {
  if (!runsThroughProxy(path)) {
    failures.push(`${path} must run through the proxy (non-canonical school address -> 308/404)`);
  }
}

// 3) Envanter: her sayfa, API ve public dosya ya public ya da acikca korumali olmali.
// Yeni bir sayfa listeye eklenmezse oturumsuz ziyaretci giris duvarina duser; bu adim onu yakalar.
const protectedApiRoutes = ["/api/sat/questions"];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function appFileToPath(file) {
  const segments = relative(resolve(root, "app"), file).split(sep).slice(0, -1);
  if (segments.some((segment) => segment.startsWith("_"))) return null; // Next private klasoru
  const urlSegments = segments
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")) && !segment.startsWith("@"))
    .flatMap((segment) => {
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) return [];
      if (/^\[\.\.\..+\]$/.test(segment)) return ["ornek", "yol"];
      if (/^\[.+\]$/.test(segment)) return ["ornek"];
      return [segment];
    });
  return `/${urlSegments.join("/")}`;
}

const appFiles = walk(resolve(root, "app"));
const inventory = [];

for (const file of appFiles) {
  if (/[/\\]page\.(tsx?|jsx?|mdx)$/.test(file)) {
    const path = appFileToPath(file);
    if (path) inventory.push({ kind: "page", path, file });
  } else if (/[/\\]route\.(tsx?|jsx?)$/.test(file)) {
    const path = appFileToPath(file);
    if (path) inventory.push({ kind: path.startsWith("/api/") ? "api" : "route", path, file });
  }
}

for (const [file, path] of [
  ["app/robots.ts", "/robots.txt"],
  ["app/sitemap.ts", "/sitemap.xml"],
]) {
  if (existsSync(resolve(root, file))) inventory.push({ kind: "metadata", path, file: resolve(root, file) });
}

for (const file of walk(resolve(root, "public"))) {
  if (file.endsWith(".DS_Store")) continue;
  const path = `/${relative(resolve(root, "public"), file).split(sep).join("/")}`;
  inventory.push({ kind: "public-file", path, file });
}

for (const entry of inventory) {
  const result = classify(entry.path);
  const where = relative(root, entry.file);
  // Sayfa ve rotalar acikca listelenir: proxy'siz kalmak tek basina "public" karari degildir.
  if (entry.kind === "page" || entry.kind === "route" || entry.kind === "metadata") {
    if (isPublicPath(entry.path)) continue;
    if (entry.kind === "page" && isExplicitlyProtectedPage(entry.path) && result === "protected-page") continue;
    failures.push(
      `${where} (${entry.path}) is neither in the proxy.ts public allowlist nor in PROTECTED_PAGE_ROUTES + config.matcher (${result})`,
    );
    continue;
  }
  if (result === "public" || result === "static") continue;
  if (entry.kind === "api" && protectedApiRoutes.includes(entry.path)) continue;
  failures.push(
    `${where} (${entry.path}) is neither in the proxy.ts public allowlist nor in an explicit protected list (${result})`,
  );
}

for (const route of protectedApiRoutes) {
  if (!inventory.some((entry) => entry.kind === "api" && entry.path === route)) {
    // Kaldirilan API listede kalmasin.
    failures.push(`Protected API list names ${route} but no app route file exists`);
  }
}

// Korumali API handler'i proxy'ye tek basina guvenmez: kendi auth() kontrolunu yapar.
for (const entry of inventory) {
  if (entry.kind !== "api" || !protectedApiRoutes.includes(entry.path)) continue;
  const handlerSource = readFileSync(entry.file, "utf8");
  if (!handlerSource.includes("await auth()")) {
    failures.push(`${relative(root, entry.file)} must check the session itself with auth() (401 without userId)`);
  }
}

// Herkese acik webhook adresi oturum tasimaz; tek koruma imza dogrulamasidir. Handler baska
// hicbir isten once Clerk imzasini dogrulamali ve yalniz POST sunmali.
for (const entry of inventory) {
  if (entry.kind !== "api" || !entry.path.startsWith("/api/webhooks/")) continue;
  const where = relative(root, entry.file);
  if (classify(entry.path) !== "public") continue;
  const handlerSource = readFileSync(entry.file, "utf8");
  if (!handlerSource.includes('from "@clerk/nextjs/webhooks"')) {
    failures.push(`${where} must verify the request with verifyWebhook from @clerk/nextjs/webhooks`);
    continue;
  }
  const verifyIndex = handlerSource.indexOf("await verifyWebhook(request)");
  const firstSideEffect = handlerSource.search(/await (?!verifyWebhook\()/);
  if (verifyIndex < 0 || (firstSideEffect >= 0 && firstSideEffect < verifyIndex)) {
    failures.push(`${where} must await verifyWebhook(request) before any other awaited work`);
  }
  if (/export (?:async )?function (?:GET|PUT|PATCH|DELETE)\b/.test(handlerSource)) {
    failures.push(`${where} must only export POST`);
  }
}

// 4) Oturumsuz yonlendirme: sayfalar /giris'e, API'ler Clerk varsayilanina.
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

if (
  !/if \(isApiRoute\(request\)\) \{\s*await auth\.protect\(\);\s*return;\s*\}[\s\S]{0,400}await auth\.protect\(\{\s*unauthenticatedUrl: buildSignInRedirectUrl\(request\),\s*\}\);\s*\},/m.test(
    source,
  )
) {
  failures.push("Default branch must keep APIs on auth.protect() and send unlisted pages to /giris");
}

// 5) authorizedParties: uretimde yalniz canli alan adi.
if (!/authorizedParties: getTrustedOrigins\(\)/.test(source)) {
  failures.push("clerkMiddleware must pass authorizedParties: getTrustedOrigins()");
}
if (!trustedOriginsSource.includes('export const PRODUCTION_ORIGIN = "https://italypath.app";')) {
  failures.push("lib/auth/trustedOrigins.ts: PRODUCTION_ORIGIN must be https://italypath.app");
}
if (
  !/if \(vercelEnv === "production"\) \{\s*return \[PRODUCTION_ORIGIN\];\s*\}/m.test(trustedOriginsSource)
) {
  failures.push("lib/auth/trustedOrigins.ts: Vercel production must trust only PRODUCTION_ORIGIN");
}

// 6) Burs haritasi GeoJSON fetch kurallari.
if (scholarshipsExplorerSource.includes("cache: 'force-cache'")) {
  failures.push("Scholarship map GeoJSON fetch must not use force-cache");
}

if (!scholarshipsExplorerSource.includes("REGIONS_GEOJSON_VERSION")) {
  failures.push("Scholarship map GeoJSON fetch is missing an explicit cache-busting version");
}

// /llms.txt statik dosya sayilmaz: proxy matcher yalnizca belirli uzantilari (css/js/png...) haric tutar,
// .txt bunlarin arasinda degildir. Allowlist disinda kalirsa Clerk oturumsuz istegi 404'e dusurur
// (21 Eylul 2026 canli bulgu: x-clerk-auth-reason: protect-rewrite).
if (!publicPatterns.includes("/llms.txt")) {
  failures.push("Public list is missing /llms.txt (AI assistant discovery file)");
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
console.log(`[OK] Inventory: ${inventory.length} pages/routes/public files classified.`);
