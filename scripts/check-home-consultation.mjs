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

// Task 4 — ayrı sayfa
const consultPage = read("app/on-gorusme/page.tsx");
mustNot(consultPage, '"use client"', "Sayfa server wrapper olmalı");
must(consultPage, 'canonical: "/on-gorusme"', "Canonical");
must(read("components/consultation/ConsultationPageClient.tsx"), 'variant="page"', "Sayfa varyantı");
must(read("proxy.ts"), "'/on-gorusme', '/on-gorusme/(.*)'", "Public route");
must(read("app/sitemap.ts"), "/on-gorusme", "Sitemap");
mustNot(read("app/robots.ts"), "/on-gorusme", "Robots disallow olmamalı");
const closing = read("components/HomeClosingCta.tsx");
must(closing, "CONSULT_ANCHOR", "Kapanış CTA ön görüşmeye gider");
mustNot(closing, "primaryCtaSignedIn", "Eski kapanış CTA kalmamalı");

// Task 5 — içerik sayfaları ve menü
const prompt = read("components/consultation/ConsultPrompt.tsx");
must(prompt, "CONSULT_PAGE_PATH", "Kutu ayrı sayfaya gider");
// Program sayfasinda kutu "Sonraki adimlar" blogunun icinde durur: metin anahtari client'ta,
// <ConsultPrompt cagrisi ProgramNextSteps'te.
must(read("components/university-details/ProgramNextSteps.tsx"), "<ConsultPrompt", "Program sayfasi kutusu");
must(
  read("components/university-details/DepartmentDetailClient.tsx"),
  "ProgramNextSteps",
  "Program sayfasi kutuyu Sonraki adimlar blogunda render eder",
);
for (const [file, key, skipBox] of [
  ["components/university-details/DepartmentDetailClient.tsx", "t.consultPrompt.program", "skipBox"],
  ["components/university-details/UniversityDetailClient.tsx", "t.consultPrompt.university"],
  ["components/scholarships/ScholarshipsExplorer.tsx", "t.consultPrompt.scholarships"],
  ["components/isee/IseeParificatoClient.tsx", "t.consultPrompt.isee"],
]) {
  const source = read(file);
  if (skipBox !== "skipBox") must(source, "<ConsultPrompt", `${file} kutu`);
  must(source, key, `${file} metin`);
}
mustNot(read("components/university-details/UniversityDetailClient.tsx"), "aiMentorHref", "Duraklatılmış AI masası linki kalmamalı");
must(read("components/Navbar.tsx"), "CONSULT_PAGE_PATH", "Menü linki");

// Ana sayfa fotoğrafları
const homePhotos = read("lib/homePhotos.ts");
for (const match of homePhotos.matchAll(/src: "([^"]+)"/g)) {
  if (!existsSync(`public${match[1]}`)) failures.push(`Fotoğraf dosyası eksik: public${match[1]}`);
}
if (countOf(translations, "homePhotos: {") < 2) failures.push("TR+EN namespace eksik: homePhotos: {");
for (const file of [
  "components/HeroSection.tsx",
  "components/home/HomeToolsSection.tsx",
  "components/consultation/ConsultationSection.tsx",
  "components/HomeClosingCta.tsx",
]) {
  const source = read(file);
  must(source, "HOME_PHOTOS", `${file} fotoğraf`);
  must(source, 'from "next/image"', `${file} next/image`);
  mustNot(source, "images.unsplash.com", `${file} dış fotoğraf adresi`);
}

if (failures.length > 0) {
  console.error("[FAIL] Home consultation check failed.");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[OK] Home consultation check passed.");
