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

// Task 2 — araç vitrini
const tools = read("components/home/HomeToolsSection.tsx");
for (const href of ['"/universities"', '"/scholarships"', '"/isee"', '"/sat"', '"/cities"', '"/communities"', '"/hub"']) {
  must(tools, href, "Araç kartı linki");
}
must(tools, 'id="araclar"', "Araç bölümü anchor");
mustNot(tools, "CURATED_CITIES", "Şehir verisi client bundle'a girmemeli");
const homePage = read("app/page.tsx");
must(homePage, "CURATED_CITIES.length", "Şehir sayısı server'da");
const homeClient = read("components/HomePageClient.tsx");
must(homeClient, "<HomeToolsSection", "Ana sayfa araç vitrini");

// Task 3 — ön görüşme bölümü
const section = read("components/consultation/ConsultationSection.tsx");
must(section, "ExpertLeadForm", "Gerçek form kullanılmalı");
must(section, "id={CONSULT_ANCHOR}", "Bölüm anchor");
must(section, "aria-live", "Başarı mesajı live region");
mustNot(section, "onSubmitCapture", "Prototip gönderim engeli taşınmamalı");
mustNot(section.toLowerCase(), "service_role", "Client service role içeremez");
must(read("components/consultation/ConsultationFaq.tsx"), "<details", "SSS details");
const bar = read("components/consultation/MobileConsultBar.tsx");
must(bar, "md:hidden", "Sabit buton yalnız mobil");
must(bar, "getElementById(CONSULT_ANCHOR)", "Form görünürken gizlenme");
must(homeClient, "<ConsultationSection", "Ana sayfa ön görüşme bölümü");
must(homeClient, "<ConsultationFaq", "Ana sayfa SSS");
must(homeClient, "<MobileConsultBar", "Ana sayfa sabit buton");
const hero = read("components/HeroSection.tsx");
must(hero, "CONSULT_ANCHOR", "Hero CTA ön görüşmeye gider");

if (failures.length > 0) {
  console.error("[FAIL] Home consultation check failed.");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[OK] Home consultation check passed.");
