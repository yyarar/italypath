import { readFileSync } from "node:fs";

const explorer = readFileSync("components/scholarships/ScholarshipsExplorer.tsx", "utf8");
const page = readFileSync("app/scholarships/page.tsx", "utf8");
const translations = readFileSync("lib/translations.ts", "utf8");

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

if (failures.length > 0) {
  console.error("[FAIL] Scholarships editorial atlas check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Scholarships editorial atlas check passed.");
