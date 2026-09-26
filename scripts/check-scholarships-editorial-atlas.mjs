import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

import ts from "typescript";

const explorer = readFileSync("components/scholarships/ScholarshipsExplorer.tsx", "utf8");
const page = readFileSync("app/scholarships/page.tsx", "utf8");
const translationSources = {
  tr: readFileSync("lib/translations/tr.ts", "utf8"),
  en: readFileSync("lib/translations/en.ts", "utf8"),
};
const translations = translationSources.tr + "\n" + translationSources.en;

const failures = [];

function loadTypeScriptModule(filename) {
  const transpiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    throw new Error(`Could not transpile ${filename}.`);
  }
  const runtimeModule = { exports: {} };
  const localRequire = (specifier) => {
    throw new Error(`${filename} requested unsupported runtime import ${specifier}.`);
  };
  new Function("require", "module", "exports", `"use strict";\n${transpiled.outputText}`)(
    localRequire,
    runtimeModule,
    runtimeModule.exports,
  );
  return runtimeModule.exports;
}

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

// STATUS #33 (2026-09-26): dogrulama notlari sabit tarih tasimaz. Ana sayfa CTA notu (homeScholarshipsCta.note)
// ve /scholarships giris notu (scholarships.verifiedAsOf) yer tutucularla yazilir; bolge sayilari, en yeni
// lastVerifiedAt tarihleri ve akademik yil lib/scholarships/verification.ts ile SCHOLARSHIP_REGIONS'tan
// turetilir. Bolge verisi ana sayfa istemci paketine girmez: ozet app/page.tsx'te hesaplanip prop gecer.
const VERIFICATION_NOTES = [
  {
    key: "homeScholarshipsCta.note",
    read: (t) => t.homeScholarshipsCta?.note,
    placeholders: ["{fullCount}", "{fullDate}", "{academicYear}", "{registryCount}", "{registryDate}"],
  },
  {
    key: "scholarships.verifiedAsOf",
    read: (t) => t.scholarships?.verifiedAsOf,
    placeholders: ["{fullCount}", "{fullDate}", "{registryCount}", "{registryDate}"],
  },
];
const FIXED_YEAR = /\b20\d{2}\b/;

const regionsRuntime = loadTypeScriptModule("lib/scholarships/regions.ts");
const verificationRuntime = loadTypeScriptModule("lib/scholarships/verification.ts");
const translationRuntime = {
  tr: loadTypeScriptModule("lib/translations/tr.ts").tr,
  en: loadTypeScriptModule("lib/translations/en.ts").en,
};
const regions = regionsRuntime.SCHOLARSHIP_REGIONS ?? [];
const summary = verificationRuntime.summarizeScholarshipVerification(regions);

if (summary.fullCount + summary.registryCount !== regions.length || regions.length === 0) {
  failures.push(
    `verification summary must cover every region (${summary.fullCount} + ${summary.registryCount} != ${regions.length})`,
  );
}
for (const [label, value] of [
  ["fullLatestDate", summary.fullLatestDate],
  ["registryLatestDate", summary.registryLatestDate],
]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) {
    failures.push(`verification summary ${label} must be a YYYY-MM-DD date derived from lastVerifiedAt (got ${value})`);
  }
}
if (!summary.fullAcademicYear) {
  failures.push("verification summary fullAcademicYear must come from a verified-full region's currentAcademicYear");
}

for (const language of ["tr", "en"]) {
  for (const note of VERIFICATION_NOTES) {
    const template = note.read(translationRuntime[language]);
    const label = `${language}.${note.key}`;
    if (typeof template !== "string" || template.trim() === "") {
      failures.push(`${label} is missing`);
      continue;
    }
    if (FIXED_YEAR.test(template)) {
      failures.push(`${label} must not contain a fixed year; derive it from SCHOLARSHIP_REGIONS (got: ${template})`);
    }
    for (const placeholder of note.placeholders) {
      if (!template.includes(placeholder)) {
        failures.push(`${label} is missing placeholder ${placeholder}`);
      }
    }

    const filled = verificationRuntime.fillScholarshipVerificationNote(template, summary, language);
    if (/[{}]/.test(filled)) {
      failures.push(`${label} still contains an unfilled placeholder after filling: ${filled}`);
    }
    if (filled.includes("—")) {
      failures.push(`${label} filled with a missing value (region data lacks a date or academic year): ${filled}`);
    }
    for (const expected of [
      String(summary.fullCount),
      String(summary.registryCount),
      verificationRuntime.formatScholarshipDate(summary.fullLatestDate, language),
      verificationRuntime.formatScholarshipDate(summary.registryLatestDate, language),
    ]) {
      if (!expected || !filled.includes(expected)) {
        failures.push(`${label} filled note must contain ${expected}: ${filled}`);
      }
    }
  }
}

// Tuketici baglantisi: iki not da yardimciyla doldurulur; ham ceviri metni dogrudan basilmaz.
requireToken(explorer, "fillScholarshipVerificationNote(", "ScholarshipsExplorer");
requireToken(explorer, "summarizeScholarshipVerification(SCHOLARSHIP_REGIONS)", "ScholarshipsExplorer");
forbidToken(explorer, "verifiedAsOf={copy.verifiedAsOf}", "ScholarshipsExplorer");
const homeSection = readFileSync("components/ScholarshipsSection.tsx", "utf8");
const homeClient = readFileSync("components/HomePageClient.tsx", "utf8");
const homePage = readFileSync("app/page.tsx", "utf8");
requireToken(homeSection, "fillScholarshipVerificationNote(", "ScholarshipsSection");
forbidToken(homeSection, "{t.homeScholarshipsCta.note}", "ScholarshipsSection");
requireToken(homePage, "summarizeScholarshipVerification(SCHOLARSHIP_REGIONS)", "app/page.tsx");
requireToken(homeClient, "<ScholarshipsSection verification=", "HomePageClient");
for (const [source, label] of [
  [homeSection, "ScholarshipsSection"],
  [homeClient, "HomePageClient"],
]) {
  if (source.includes("@/lib/scholarships/regions")) {
    failures.push(`${label} must not import lib/scholarships/regions (home client bundle); compute the summary in app/page.tsx`);
  }
}
if (readFileSync("lib/scholarships/verification.ts", "utf8").includes("@/lib/scholarships/regions")) {
  failures.push("lib/scholarships/verification.ts must stay free of the regions data import (client components import it)");
}

if (failures.length > 0) {
  console.error("[FAIL] Scholarships editorial atlas check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Scholarships editorial atlas check passed.");
