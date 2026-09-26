import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Her push'tan once calisan toplu cevrimdisi kontrol (guvenlik denetimi O5#4, 2026-09-26; AGENTS.md
// "Dogrulama"). Surec kuralidir, git hook veya CI degildir. Canliya (Supabase, italypath.app) istek atmaz.
// Hepsi sirayla calisir, hata olsa da sonuna kadar gider ve ozet basar; biri kirmiziysa cikis kodu 1.
//
// package.json'a yeni bir check:* veya test:* eklenince asagidaki iki listeden birine yazilir;
// siniflandirilmamis betik bu kontrolu kirmizi yapar (canli okuma yanlislikla her push'ta calismasin).

const OFFLINE = [
  "check:docs",
  "check:routes",
  "check:auth-production",
  "check:auth-ui",
  "check:ai-search",
  "check:seo-vitals",
  "check:university-data-source",
  "check:universities-ui",
  "check:university-details-ui",
  "check:program-metadata",
  "check:admission-dossier",
  "test:program-details-guard",
  "check:local-data",
  "check:cities",
  "check:isee",
  "check:scholarships-ui",
  "check:editorial-ui",
  "check:documents-ui",
  "check:hub-onboarding",
  "check:mentor-desks",
  "check:expert-leads",
  "check:home-consultation",
  "check:sat-bank",
  "test:volunteer-desk",
  "test:mentor-operator",
  "test:expert-leads",
  "test:account-deletion",
  "test:expert-lead-retention",
  "test:sat-audit",
  "test:sat-patch",
  "test:sat-explanations",
  // Gecici yerel PostgreSQL kurar (Homebrew postgresql@16/17 veya POSTGRES_BIN); ag kullanmaz.
  "test:mentor-db",
  "lint",
];

// Canli okuma: Supabase katalogunu SUPABASE_SECRET_KEY ile okur (egress harcar). Burada calismaz.
const LIVE = ["check:data", "check:program-details"];

const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
const problems = [];

for (const name of Object.keys(scripts)) {
  if (/^(check|test):/.test(name) && name !== "check:offline" && !OFFLINE.includes(name) && !LIVE.includes(name)) {
    problems.push(`${name}: siniflandirilmamis; scripts/check-offline.mjs icinde OFFLINE veya LIVE listesine ekle`);
  }
}
const missing = OFFLINE.filter((name) => !scripts[name]);

// check:hub-onboarding bu adres verilirse canliya gider; toplu kontrolde her zaman cevrimdisi kalsin.
const env = { ...process.env };
delete env.ITALYPATH_API_BASE;

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const results = [];
for (const name of OFFLINE) {
  if (!scripts[name]) continue;
  console.log(`\n=== ${name}`);
  const started = Date.now();
  const run = spawnSync(npm, ["run", "-s", name], { stdio: "inherit", env });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  results.push({ name, ok: run.status === 0, seconds });
}

// tsc tum projeyi tip denetler (Vercel build'i de denetler; burada push'tan once yakalanir). Once
// `next typegen` rota tiplerini (.next/types) guncel sayfalardan yeniden uretir (build yok, ag yok);
// tsconfig.offline.json bayat kalabilen .next/dev tiplerini disarida birakir.
console.log("\n=== next typegen + tsc --noEmit");
{
  const started = Date.now();
  const typegen = spawnSync("npx", ["next", "typegen"], { stdio: "inherit", env });
  const run =
    typegen.status === 0
      ? spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.offline.json"], { stdio: "inherit", env })
      : typegen;
  results.push({ name: "tsc --noEmit", ok: run.status === 0, seconds: ((Date.now() - started) / 1000).toFixed(1) });
}

console.log("\n--- check:offline ozeti");
for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name} (${result.seconds} sn)`);
}
console.log(`Calismayan canli okumalar: ${LIVE.join(", ")} (gerekirse elle, seyrek)`);
if (missing.length > 0) console.log(`package.json'da olmadigi icin atlanan: ${missing.join(", ")}`);
for (const problem of problems) console.error(`HATA: ${problem}`);

const failed = results.filter((result) => !result.ok);
if (failed.length > 0 || problems.length > 0) {
  console.error(`check:offline: FAIL (${failed.length} kirmizi, ${problems.length} liste sorunu)`);
  process.exit(1);
}
console.log(`check:offline: PASS (${results.length} adim)`);
