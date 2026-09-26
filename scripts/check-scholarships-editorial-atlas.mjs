import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const explorer = readFileSync("components/scholarships/ScholarshipsExplorer.tsx", "utf8");
const page = readFileSync("app/scholarships/page.tsx", "utf8");
const translations =
  readFileSync("lib/translations/tr.ts", "utf8") + "\n" + readFileSync("lib/translations/en.ts", "utf8");

const failures = [];

function requireToken(source, token, label) {
  if (!source.includes(token)) {
    failures.push(`${label} is missing required token: ${token}`);
  }
}

function forbidToken(source, token, label) {
  if (source.includes(token)) {
    failures.push(`${label} contains forbidden old UI token: ${token}`);
  }
}

for (const token of [
  "ScholarshipsTopBar",
  "ScholarshipsIntro",
  "ScholarshipMap",
  "RegionFilePanel",
  "RegionQuickFacts",
  "RegionRail",
  "institutionFileTitle",
  "officialSources",
  "managingBodies",
]) {
  requireToken(explorer, token, "ScholarshipsExplorer");
}

for (const token of [
  "institutionFileTitle",
  "sourceChecklistTitle",
  "regionRailTitle",
  "selectedRegionLabel",
]) {
  requireToken(translations, token, "translations");
}

for (const token of [
  "bg-[#e9eaec]",
  "bg-rose-600",
  "bg-blue-600",
  "rounded-2xl",
  "rounded-3xl",
  "statusVerified",
]) {
  forbidToken(explorer, token, "ScholarshipsExplorer");
}

forbidToken(page, "bg-[#e9eaec]", "scholarships page fallback");

// Denetim O3#1 (2026-09-26): harita dosyasi sinirlari koruyan aracla sadelestirildi (2,9 MB -> ~100 KB,
// gzip ~27 KB). Dosya tarayici onbellegine girer; degisirse ?v= surumu artirilmali ki eski kopya kalmasin.
// Dosyayi degistiren kisi REGIONS_GEOJSON_VERSION'i ve asagidaki iki degeri birlikte gunceller.
const GEOJSON_EXPECTED = {
  version: "2026-09-26",
  sha256: "630e5a411d037ece52cd4ad1947cec751bb5d09c845f161b8ced71d888713f06",
};
const GEOJSON_MAX_GZIP_BYTES = 50 * 1024;
const geojson = readFileSync("public/data/italy-regions.geojson");
const geojsonHash = createHash("sha256").update(geojson).digest("hex");
if (geojsonHash !== GEOJSON_EXPECTED.sha256) {
  failures.push(
    "public/data/italy-regions.geojson changed: bump REGIONS_GEOJSON_VERSION and update GEOJSON_EXPECTED in this guard",
  );
}
requireToken(explorer, `const REGIONS_GEOJSON_VERSION = '${GEOJSON_EXPECTED.version}';`, "ScholarshipsExplorer");
if (gzipSync(geojson, { level: 9 }).length > GEOJSON_MAX_GZIP_BYTES) {
  failures.push("public/data/italy-regions.geojson must stay under 50 KB gzip");
}
const geojsonFeatures = JSON.parse(geojson.toString("utf8")).features ?? [];
if (geojsonFeatures.length !== 20) {
  failures.push(`public/data/italy-regions.geojson must keep 20 regions (found ${geojsonFeatures.length})`);
}
for (const token of ["cache: 'no-store'", 'cache: "no-store"', "router.replace"]) {
  if (explorer.includes(token)) {
    failures.push(`ScholarshipsExplorer contains forbidden token: ${token}`);
  }
}
requireToken(explorer, "window.history.replaceState", "ScholarshipsExplorer");

if (failures.length > 0) {
  console.error("[FAIL] Scholarships editorial atlas check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Scholarships editorial atlas check passed.");
