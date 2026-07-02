import { existsSync, readFileSync } from "node:fs";

const failures = [];
const warnings = [];

function mustExist(path) {
  if (!existsSync(path)) failures.push(`Eksik dosya: ${path}`);
}

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    failures.push(`Okunamadı: ${path}`);
    return "";
  }
}

[
  "app/hosgeldin/page.tsx",
  "components/onboarding/WizardOptionCard.tsx",
  "components/onboarding/WizardProgress.tsx",
  "components/onboarding/WizardFinale.tsx",
  "lib/hub/profile.ts",
  "lib/hub/useUserProfile.ts",
  "lib/hub/recommendations.ts",
  "supabase/user_profiles.sql",
].forEach(mustExist);

[
  "components/hub/StageStrip.tsx",
  "components/hub/DossierHero.tsx",
  "components/hub/BentoGrid.tsx",
  "lib/hub/stages.ts",
  "lib/hub/useHubStage.ts",
].forEach((path) => {
  if (existsSync(path)) failures.push(`Silinmiş olması gereken dosya duruyor: ${path}`);
});

const hubSource = read("app/hub/page.tsx");
if (/from\s+["']@\/app\/data["']/.test(hubSource) && /universitiesData/.test(hubSource)) {
  failures.push("app/hub/page.tsx local seed universitiesData kullanıyor");
}

const translations = read("lib/translations.ts");
["onboarding:", "recoHero:", "recoSections:", "invite:", "profileStrip:"].forEach(
  (key) => {
    const count = translations.split(key).length - 1;
    if (count < 2) failures.push(`Çeviri anahtarı TR+EN eksik: ${key} (bulunan: ${count})`);
  },
);

const proxySource = read("proxy.ts");
if (!proxySource.includes('"/hosgeldin"')) {
  failures.push("proxy.ts PROTECTED_PAGE_ROUTES içinde /hosgeldin yok");
}

const layoutSource = read("app/layout.tsx");
if (!layoutSource.includes('signUpFallbackRedirectUrl="/hosgeldin"')) {
  failures.push('app/layout.tsx signUpFallbackRedirectUrl="/hosgeldin" değil');
}

const API_BASE = process.env.ITALYPATH_API_BASE ?? "https://italypath.app";
const recoSource = read("lib/hub/recommendations.ts");

function extractKeywords(source) {
  const blockMatch = source.match(/FIELD_KEYWORDS[\s\S]*?^};/m);
  if (!blockMatch) return [];
  return [...blockMatch[0].matchAll(/"([^"]+)"/g)]
    .map((match) => match[1].toLowerCase())
    .filter((value) => !value.includes("-"));
}

try {
  const res = await fetch(`${API_BASE}/api/universities`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const universities = await res.json();
  const keywords = extractKeywords(recoSource);
  if (keywords.length === 0) {
    failures.push("recommendations.ts içinden FIELD_KEYWORDS okunamadı");
  } else {
    let total = 0;
    let covered = 0;
    for (const university of universities) {
      for (const department of university.departments ?? []) {
        total++;
        const name = String(department.name ?? "").toLowerCase();
        if (keywords.some((keyword) => name.includes(keyword))) covered++;
      }
    }
    const ratio = total ? covered / total : 0;
    console.log(`Alan kapsaması: ${covered}/${total} (%${Math.round(ratio * 100)})`);
    if (ratio < 0.8) {
      failures.push(
        `FIELD_KEYWORDS kapsaması %80'in altında (%${Math.round(ratio * 100)}) — listeleri genişlet`,
      );
    }

    const liveCities = new Set(
      universities.map((university) => String(university.city ?? "").toLowerCase()),
    );
    const groupBlock = recoSource.match(/CITY_GROUPS[\s\S]*?^};/m)?.[0] ?? "";
    for (const match of groupBlock.matchAll(/"([^"]+)"/g)) {
      const cityName = match[1];
      if (cityName === "any") continue;
      if (cityName.includes("-")) continue;
      if (!liveCities.has(cityName.toLowerCase())) {
        warnings.push(`CITY_GROUPS şehri canlı veride yok: ${cityName}`);
      }
    }
  }
} catch (err) {
  warnings.push(`Canlı kapsama testi atlandı (ağ hatası): ${err.message}`);
}

for (const warning of warnings) console.warn(`UYARI: ${warning}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`HATA: ${failure}`);
  process.exit(1);
}

console.log("check-hub-onboarding: PASS");
