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

// Kullanici verisi kancalari (guvenlik denetimi S1#3, O4#5, S5#5; 2026-09-26):
// Clerk'in yerel oturum anahtari (eski "supabase" JWT sablonu yok), mentor
// masasindaki sure siniri, "bos" yerine "yuklenemedi" durumu.
const userDataHooks = [
  "lib/useFavorites.ts",
  "lib/documents/useUserDocuments.ts",
  "lib/hub/useUserProfile.ts",
  "lib/hub/useDocumentsCount.ts",
  "lib/sat/useSatAttempts.ts",
];
for (const path of userDataHooks) {
  const source = read(path);
  if (/template:\s*["']supabase["']/.test(source)) {
    failures.push(`${path} eski Clerk "supabase" JWT sablonunu kullaniyor`);
  }
  if (!source.includes("useUserSupabaseClient()")) {
    failures.push(`${path} ortak useUserSupabaseClient kancasini kullanmiyor`);
  }
  if (source.includes("createClerkSupabaseClient")) {
    failures.push(`${path} kendi Supabase istemcisini kuruyor (ortak kanca kullanilmali)`);
  }
}
const userClientSource = read("lib/useUserSupabaseClient.ts");
if (!userClientSource.includes("withMentorTimeout(getToken())")) {
  failures.push("useUserSupabaseClient.ts: Clerk anahtar beklemesi sure sinirina bagli degil");
}
if (!userClientSource.includes("requestTimeoutMs: USER_DATA_REQUEST_TIMEOUT_MS")) {
  failures.push("useUserSupabaseClient.ts: Supabase istekleri sure sinirina bagli degil");
}
for (const [path, needle] of [
  ["app/favorites/page.tsx", "t.favorites.loadError"],
  ["app/documents/page.tsx", "t.documents.loadError"],
  ["app/hub/page.tsx", "t.hub.profileLoadError"],
  ["app/hosgeldin/page.tsx", "t.onboarding.loadError"],
  ["components/sat/SatBankExplorer.tsx", "t.sat.progressLoadError"],
]) {
  if (!read(path).includes(needle)) failures.push(`${path}: yukleme hatasi durumu (${needle}) gosterilmiyor`);
}
["loadError:", "profileLoadError:", "progressLoadError:"].forEach((key) => {
  const count = translations.split(key).length - 1;
  if (count < 2) failures.push(`Çeviri anahtarı TR+EN eksik: ${key} (bulunan: ${count})`);
});
for (const path of [
  "components/universities/UniversitiesExplorer.tsx",
  "components/hub/PreferencesStrip.tsx",
  "context/LanguageContext.tsx",
  "app/ai-mentor/page.tsx",
  "lib/useFavorites.ts",
]) {
  const source = read(path);
  if (/\blocalStorage\./.test(source) || !source.includes("@/lib/safeStorage")) {
    failures.push(`${path}: tarayici hafizasina yalniz lib/safeStorage.ts ile erisilmeli`);
  }
}

// Canli kapsama adimi yalniz ITALYPATH_API_BASE verilince calisir (canli okuma; guvenlik denetimi S3#8,
// 2026-09-26). Verilmezse betik cevrimdisi kalir ve bunu acikca yazar; verilip adrese ulasilamazsa
// (ag hatasi, Vercel challenge, JSON olmayan yanit) PASS yerine HATA verir.
const API_BASE = process.env.ITALYPATH_API_BASE?.trim().replace(/\/+$/, "") || "";
const recoSource = read("lib/hub/recommendations.ts");

function extractKeywords(source) {
  const blockMatch = source.match(/FIELD_KEYWORDS[\s\S]*?^};/m);
  if (!blockMatch) return [];
  return [...blockMatch[0].matchAll(/"([^"]+)"/g)]
    .map((match) => match[1].toLowerCase())
    .filter((value) => !value.includes("-"));
}

async function checkLiveCoverage() {
  let universities;
  try {
    const res = await fetch(`${API_BASE}/api/universities`, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    universities = await res.json();
    if (!Array.isArray(universities)) throw new Error("yanit universite listesi degil");
  } catch (err) {
    failures.push(`Canlı kapsama testi çalışamadı (${API_BASE}/api/universities): ${err.message}`);
    return;
  }
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
}

if (API_BASE) {
  await checkLiveCoverage();
} else {
  console.log(
    "ATLANDI: canlı alan kapsaması (FIELD_KEYWORDS, CITY_GROUPS) çalışmadı; ITALYPATH_API_BASE verilmedi. " +
      "Canlı okuma için: ITALYPATH_API_BASE=https://italypath.app npm run check:hub-onboarding",
  );
}

for (const warning of warnings) console.warn(`UYARI: ${warning}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`HATA: ${failure}`);
  process.exit(1);
}

console.log(
  API_BASE
    ? `check-hub-onboarding: PASS (çevrimdışı kontroller + canlı kapsama, ${API_BASE})`
    : "check-hub-onboarding: PASS (yalnız çevrimdışı kontroller; canlı kapsama atlandı)",
);
