import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (file) => {
  if (!existsSync(file)) {
    failures.push(`Eksik dosya: ${file}`);
    return "";
  }
  return readFileSync(file, "utf8");
};
const must = (source, needle, label) => {
  if (!source.includes(needle)) failures.push(`${label}: ${needle}`);
};
const mustNot = (source, needle, label) => {
  if (source.includes(needle)) failures.push(`${label}: ${needle}`);
};
const countOf = (source, needle) => source.split(needle).length - 1;

// Task 1 — sabitler ve metinler
const constants = read("lib/consultation.ts");
must(constants, 'export const CONSULT_ANCHOR = "on-gorusme"', "Anchor sabiti");
must(constants, 'export const CONSULT_PAGE_PATH = "/on-gorusme"', "Sayfa yolu sabiti");

const translations = read("lib/translations.ts");
for (const ns of ["homeTools: {", "consultation: {", "homeFaq: {", "consultPrompt: {"]) {
  if (countOf(translations, ns) < 2) failures.push(`TR+EN namespace eksik: ${ns}`);
}
mustNot(translations, "card1Title", "Eski FeaturesSection metni kalmamalı");
must(translations, 'secondaryCta: "Ücretsiz ön görüşme al"', "Hero TR CTA");
must(translations, 'secondaryCta: "Book a free consultation"', "Hero EN CTA");

const pkg = read("package.json");
must(pkg, '"check:home-consultation": "node scripts/check-home-consultation.mjs"', "npm script");

if (failures.length > 0) {
  console.error("[FAIL] Home consultation check failed.");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[OK] Home consultation check passed.");
