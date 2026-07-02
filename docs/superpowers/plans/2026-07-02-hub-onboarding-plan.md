# Hub Remake + Onboarding Sihirbazı — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Codex için not:** Bu plan görev görev uygulanır. Her görev kendi commit'iyle biter ve
> repo her commit'te derlenir halde kalır. Görevleri SIRAYLA uygula. Spec:
> `docs/superpowers/specs/2026-07-02-hub-onboarding-design.md` — çelişki görürsen spec kazanır.
> Önce `AGENT_CONTEXT.md` oku (Agent Kuralları bölümü bağlayıcıdır: middleware.ts yaratma,
> tailwind.config yaratma, `app/data.ts` seed'ine dönme, hidden SEO metni ekleme YASAK).

**Goal:** Kayıt sonrası 4 soruluk atlanabilir onboarding sihirbazı (`/hosgeldin`) ile kullanıcı profili toplamak ve `/hub`'ı bu profile göre kural bazlı program/burs/şehir önerileri gösteren akıllı öneri merkezine dönüştürmek.

**Architecture:** Profil Supabase `user_profiles` tablosunda (favorites RLS kalıbı) tutulur; `lib/hub/useUserProfile.ts` hook'u okur/yazar. Saf fonksiyonlardan oluşan `lib/hub/recommendations.ts`, `useUniversitiesData()` verisini profil ile eşleştirir (AI çağrısı yok). `/hosgeldin` client sihirbazı profili yazar; `/hub` client sayfası önerileri render eder. Eski stage/bento parçaları silinir.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (`--editorial-*` CSS değişkenleri), Clerk, Supabase JS, Framer Motion, `lib/translations.ts` TR/EN.

**Doğrulama modeli:** Bu repoda unit test framework'ü YOK; doğrulama `scripts/check-*.mjs` smoke scriptleri + `npm run build` + `npm run lint` ile yapılır. Her görevin sonundaki doğrulama adımlarını atlamadan çalıştır.

---

## Dosya haritası

| Dosya | Sorumluluk | İşlem |
| --- | --- | --- |
| `supabase/user_profiles.sql` | Tablo + RLS + grant | Yeni |
| `types/index.ts` | `UserProfileRow` interface | Ekleme |
| `lib/hub/profile.ts` | Profil enum/tipleri, guard'lar | Yeni |
| `lib/hub/useUserProfile.ts` | Profil oku/yaz hook'u | Yeni |
| `lib/hub/recommendations.ts` | Kural bazlı öneri motoru | Yeni |
| `lib/translations.ts` | `onboarding.*` + yeni `hub.*` anahtarları | Ekleme/rework |
| `app/hosgeldin/page.tsx` | Sihirbaz sayfası (client) | Yeni |
| `components/onboarding/*` | WizardShell, OptionCard, Finale | Yeni |
| `app/layout.tsx` | `signUpFallbackRedirectUrl="/hosgeldin"` | 1 satır |
| `proxy.ts` | `PROTECTED_PAGE_ROUTES` += `/hosgeldin` | 1 satır |
| `scripts/check-route-access.mjs` | protected matrix += `/hosgeldin` | 1 satır |
| `app/hub/page.tsx` | Yeni öneri merkezi kompozisyonu | Yeniden yazım |
| `components/hub/ProfileStrip.tsx` vb. | Yeni hub blokları | Yeni |
| `components/hub/StageStrip.tsx` vb. | Eski parçalar | Silme |
| `lib/useFavorites.ts` | `advanceStageIfBefore` çağrısı kalkar | Düzenleme |
| `scripts/check-hub-onboarding.mjs` | Yeni smoke check | Yeni |
| `AGENT_CONTEXT.md` | Hub/route/Supabase bölümleri | Güncelleme |

---

### Task 1: Supabase `user_profiles` tablosu

**Files:**
- Create: `supabase/user_profiles.sql`

- [ ] **Step 1: SQL dosyasını yaz**

`supabase/rls_hardening.sql` içinde tanımlı `public.requesting_user_id()` fonksiyonu (Clerk JWT `sub`) yeniden kullanılır.

```sql
-- user_profiles: onboarding sihirbazı cevapları (bkz. specs/2026-07-02-hub-onboarding-design.md §4.4)
-- Uygulama: Supabase Dashboard > SQL Editor'de bu dosyayı çalıştır.

begin;

create table if not exists public.user_profiles (
  user_id text primary key,
  level text check (level in ('bachelor', 'master')),
  fields text[] not null default '{}'::text[],
  budget text check (budget in ('scholarship-required', 'support-helpful', 'flexible')),
  city_pref text check (city_pref in ('big-city', 'student-city', 'any')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
on public.user_profiles
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
on public.user_profiles
for insert
to authenticated
with check (user_id = public.requesting_user_id());

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using (user_id = public.requesting_user_id())
with check (user_id = public.requesting_user_id());

drop policy if exists "user_profiles_delete_own" on public.user_profiles;
create policy "user_profiles_delete_own"
on public.user_profiles
for delete
to authenticated
using (user_id = public.requesting_user_id());

revoke all on public.user_profiles from anon;
grant select, insert, update, delete on public.user_profiles to authenticated;

commit;
```

- [ ] **Step 2: İnsan adımı olarak işaretle**

Bu SQL'i Codex ÇALIŞTIRAMAZ; Kerem Supabase Dashboard > SQL Editor'de çalıştıracak.
Görev çıktısına şu notu ekle: "supabase/user_profiles.sql dosyasını Supabase SQL
Editor'de çalıştırman gerekiyor — çalıştırmadan sihirbaz kayıt yapamaz."

- [ ] **Step 3: Commit**

```bash
git add supabase/user_profiles.sql
git commit -m "feat(hub): user_profiles tablosu icin supabase setup sql"
```

---

### Task 2: Profil domain modülü + row tipi

**Files:**
- Create: `lib/hub/profile.ts`
- Modify: `types/index.ts` (dosya sonuna ekle)

- [ ] **Step 1: `lib/hub/profile.ts` dosyasını yaz**

```ts
export const PROFILE_LEVELS = ["bachelor", "master"] as const;
export type ProfileLevel = (typeof PROFILE_LEVELS)[number];

export const PROFILE_FIELDS = [
  "engineering-tech",
  "medicine-health",
  "business-economics",
  "design-architecture",
  "natural-sciences",
  "social-humanities",
  "arts-fashion",
  "law-politics",
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const PROFILE_BUDGETS = [
  "scholarship-required",
  "support-helpful",
  "flexible",
] as const;
export type ProfileBudget = (typeof PROFILE_BUDGETS)[number];

export const PROFILE_CITY_PREFS = ["big-city", "student-city", "any"] as const;
export type ProfileCityPref = (typeof PROFILE_CITY_PREFS)[number];

export const MAX_PROFILE_FIELDS = 2;

export interface UserProfile {
  level: ProfileLevel | null;
  fields: ProfileField[];
  budget: ProfileBudget | null;
  cityPref: ProfileCityPref | null;
}

export const EMPTY_PROFILE: UserProfile = {
  level: null,
  fields: [],
  budget: null,
  cityPref: null,
};

export function isProfileEmpty(profile: UserProfile): boolean {
  return (
    profile.level === null &&
    profile.fields.length === 0 &&
    profile.budget === null &&
    profile.cityPref === null
  );
}

export function isProfileLevel(value: unknown): value is ProfileLevel {
  return typeof value === "string" && (PROFILE_LEVELS as readonly string[]).includes(value);
}

export function isProfileField(value: unknown): value is ProfileField {
  return typeof value === "string" && (PROFILE_FIELDS as readonly string[]).includes(value);
}

export function isProfileBudget(value: unknown): value is ProfileBudget {
  return typeof value === "string" && (PROFILE_BUDGETS as readonly string[]).includes(value);
}

export function isProfileCityPref(value: unknown): value is ProfileCityPref {
  return typeof value === "string" && (PROFILE_CITY_PREFS as readonly string[]).includes(value);
}

export function sanitizeProfileFields(values: unknown): ProfileField[] {
  if (!Array.isArray(values)) return [];
  return values.filter(isProfileField).slice(0, MAX_PROFILE_FIELDS);
}
```

- [ ] **Step 2: `types/index.ts` sonuna row interface ekle**

Mevcut kural: generated Supabase types yok; yeni tablo için explicit interface eklenir.

```ts
export interface UserProfileRow {
  user_id: string;
  level: string | null;
  fields: string[] | null;
  budget: string | null;
  city_pref: string | null;
  created_at?: string;
  updated_at?: string;
}
```

- [ ] **Step 3: Derleme kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok (mevcutta da temiz olmalı; yeni hata çıkmamalı).

- [ ] **Step 4: Commit**

```bash
git add lib/hub/profile.ts types/index.ts
git commit -m "feat(hub): profil domain modeli ve user_profiles row tipi"
```

---

### Task 3: `useUserProfile` hook'u

**Files:**
- Create: `lib/hub/useUserProfile.ts`

- [ ] **Step 1: Hook'u yaz**

Kalıp: `lib/hub/useDocumentsCount.ts` + `lib/useFavorites.ts` (Clerk `supabase` JWT template + optimistic update + rollback). localStorage fallback YOK — sihirbaz ve hub korumalı.

```ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createClerkSupabaseClient } from "@/lib/supabaseClient";
import type { UserProfileRow } from "@/types";
import {
  EMPTY_PROFILE,
  isProfileBudget,
  isProfileCityPref,
  isProfileLevel,
  sanitizeProfileFields,
  type UserProfile,
} from "@/lib/hub/profile";

function rowToProfile(row: UserProfileRow | null): UserProfile {
  if (!row) return EMPTY_PROFILE;
  return {
    level: isProfileLevel(row.level) ? row.level : null,
    fields: sanitizeProfileFields(row.fields),
    budget: isProfileBudget(row.budget) ? row.budget : null,
    cityPref: isProfileCityPref(row.city_pref) ? row.city_pref : null,
  };
}

export function useUserProfile(): {
  profile: UserProfile;
  loading: boolean;
  unavailable: boolean;
  saveProfile: (next: UserProfile) => Promise<boolean>;
} {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const supabase = useMemo(
    () =>
      createClerkSupabaseClient(async () => {
        try {
          return await getToken({ template: "supabase" });
        } catch {
          return null;
        }
      }),
    [getToken],
  );

  useEffect(() => {
    if (!isLoaded) return;
    let isActive = true;

    async function load() {
      if (!user?.id) {
        if (!isActive) return;
        setProfile(EMPTY_PROFILE);
        setLoading(false);
        setUnavailable(false);
        return;
      }

      setLoading(true);
      setUnavailable(false);

      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, level, fields, budget, city_pref")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isActive) return;

      if (error) {
        console.error("[hub] profil yükleme hatası:", error);
        setProfile(EMPTY_PROFILE);
        setUnavailable(true);
      } else {
        setProfile(rowToProfile((data as UserProfileRow | null) ?? null));
      }
      setLoading(false);
    }

    void load();
    return () => {
      isActive = false;
    };
  }, [supabase, user?.id, isLoaded]);

  const saveProfile = useCallback(
    async (next: UserProfile): Promise<boolean> => {
      if (!user?.id) return false;

      const previous = profile;
      setProfile(next); // optimistic

      const { error } = await supabase.from("user_profiles").upsert(
        {
          user_id: user.id,
          level: next.level,
          fields: next.fields,
          budget: next.budget,
          city_pref: next.cityPref,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        console.error("[hub] profil kaydetme hatası:", error);
        setProfile(previous); // rollback
        return false;
      }
      return true;
    },
    [profile, supabase, user?.id],
  );

  return { profile, loading, unavailable, saveProfile };
}
```

- [ ] **Step 2: Derleme kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok.

- [ ] **Step 3: Commit**

```bash
git add lib/hub/useUserProfile.ts
git commit -m "feat(hub): supabase destekli useUserProfile hook"
```

---

### Task 4: Öneri motoru — `lib/hub/recommendations.ts`

**Files:**
- Create: `lib/hub/recommendations.ts`

- [ ] **Step 1: Motoru yaz**

Kurallar (spec §4.2): seviye sert filtre; alan seçiliyse sert filtre; şehir tercihi
sadece skor bonusu; eşleşme < 3 ise kademeli gevşetme (önce parça-eşleşme, sonra
yalnız seviye). Veri HER ZAMAN `useUniversitiesData()`/`getUniversitiesData()`
çıktısı `University[]` üzerinden gelir — `app/data.ts` seed'i import etme.

```ts
import type { Department, University } from "@/app/data";
import { CURATED_CITIES } from "@/lib/cities/data";
import type { CityDetail } from "@/types/cities";
import {
  SCHOLARSHIP_REGION_MAP,
} from "@/lib/scholarships/regions";
import type { RegionSlug, ScholarshipRegionRecord } from "@/types/scholarships";
import type { ProfileCityPref, ProfileField, UserProfile } from "@/lib/hub/profile";

export interface ProgramMatch {
  university: University;
  department: Department;
  score: number;
}

export type RelaxationLevel = "none" | "field-partial" | "level-only";

export interface RecommendationResult {
  matches: ProgramMatch[];
  relaxed: RelaxationLevel;
}

// Anahtar kelimeler program adlarıyla (department.name) küçük harf karşılaştırılır.
// ÖNEMLİ: Bu listeler başlangıçtır. scripts/check-hub-onboarding.mjs kapsama testini
// (canlı programların >= %80'i en az bir kategoriye düşmeli) geçene kadar canlı
// /api/universities verisindeki program adlarına bakarak listeleri GENİŞLET.
export const FIELD_KEYWORDS: Record<ProfileField, string[]> = {
  "engineering-tech": [
    "engineering", "computer", "software", "informatics", "information technology",
    "mechanical", "electronic", "electrical", "aerospace", "automation", "robotics",
    "mechatronic", "telecommunication", "cybersecurity", "artificial intelligence",
    "data science", "energy", "civil", "materials", "ingegneria", "informatica",
  ],
  "medicine-health": [
    "medicine", "medical", "dentistry", "pharmacy", "nursing", "physiotherapy",
    "biomedical", "biotechnolog", "health", "veterinary", "medicina", "odontoiatria",
    "infermieristica", "farmacia",
  ],
  "business-economics": [
    "business", "economics", "management", "finance", "accounting", "marketing",
    "administration", "banking", "tourism", "economia", "gestione", "amministrazione",
  ],
  "design-architecture": [
    "design", "architecture", "urban planning", "interior", "product design",
    "architettura", "disegno",
  ],
  "natural-sciences": [
    "physics", "chemistry", "biology", "mathematics", "statistics", "geology",
    "astronomy", "environmental science", "natural science", "fisica", "chimica",
    "biologia", "matematica", "scienze",
  ],
  "social-humanities": [
    "psychology", "sociology", "philosophy", "history", "literature", "language",
    "linguistics", "education", "communication", "anthropology", "international relations",
    "media", "cultural", "filosofia", "storia", "lettere", "lingue", "psicologia",
    "scienze politiche",
  ],
  "arts-fashion": [
    "art", "fashion", "music", "cinema", "film", "theatre", "visual", "fine arts",
    "conservation", "heritage", "moda", "arte", "musica", "spettacolo",
  ],
  "law-politics": [
    "law", "legal", "political science", "politics", "international law",
    "giurisprudenza", "diritto", "politiche",
  ],
};

// Şehir adları canlı üniversite verisindeki university.city değerleriyle birebir
// eşleşmeli (küçük harf karşılaştırması yapılır). check-hub-onboarding.mjs canlı
// veride olmayan grup şehirleri için uyarı verir.
export const CITY_GROUPS: Record<Exclude<ProfileCityPref, "any">, string[]> = {
  "big-city": ["Milano", "Roma", "Torino", "Napoli", "Bologna"],
  "student-city": [
    "Bologna", "Padova", "Pavia", "Pisa", "Siena", "Trento", "Parma", "Ferrara", "Ancona",
  ],
};

// Üniversite şehri -> burs bölgesi. Slug'lar types/scholarships.ts RegionSlug
// union'ı ile birebir doğrulanmalı (derleme zaten yakalar).
export const CITY_TO_REGION: Record<string, RegionSlug> = {
  milano: "lombardia",
  pavia: "lombardia",
  roma: "lazio",
  torino: "piemonte",
  napoli: "campania",
  bologna: "emilia-romagna",
  parma: "emilia-romagna",
  ferrara: "emilia-romagna",
  padova: "veneto",
  venezia: "veneto",
  venedik: "veneto",
  verona: "veneto",
  pisa: "toscana",
  siena: "toscana",
  firenze: "toscana",
  floransa: "toscana",
  trento: "trentino-alto-adige",
  trieste: "friuli-venezia-giulia",
  bari: "puglia",
  ancona: "marche",
  genova: "liguria",
  cenova: "liguria",
};

const LEVEL_MAP: Record<string, Department["level"][]> = {
  bachelor: ["bachelor", "single-cycle"],
  master: ["master"],
};

function matchesLevel(department: Department, profile: UserProfile): boolean {
  if (!profile.level) return true;
  return LEVEL_MAP[profile.level].includes(department.level);
}

// Tam kelime eşleşmesi güçlü (skor 3), parça eşleşmesi zayıf (skor 1).
function fieldScore(name: string, fields: ProfileField[], allowPartial: boolean): number {
  const lower = name.toLowerCase();
  let best = 0;
  for (const field of fields) {
    for (const keyword of FIELD_KEYWORDS[field]) {
      const kw = keyword.toLowerCase();
      const wordRegex = new RegExp(`(^|[^a-z])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`);
      if (wordRegex.test(lower)) {
        best = Math.max(best, 3);
      } else if (allowPartial && lower.includes(kw)) {
        best = Math.max(best, 1);
      }
    }
  }
  return best;
}

function cityBonus(university: University, cityPref: UserProfile["cityPref"]): number {
  if (!cityPref || cityPref === "any") return 0;
  const group = CITY_GROUPS[cityPref];
  return group.some((c) => c.toLowerCase() === university.city.toLowerCase()) ? 1 : 0;
}

function collectMatches(
  universities: University[],
  profile: UserProfile,
  mode: RelaxationLevel,
): ProgramMatch[] {
  const matches: ProgramMatch[] = [];

  for (const university of universities) {
    for (const department of university.departments) {
      if (!matchesLevel(department, profile)) continue;

      let score = 0;
      if (profile.fields.length > 0 && mode !== "level-only") {
        const fs = fieldScore(department.name, profile.fields, mode === "field-partial");
        if (fs === 0) continue; // alan sert filtre
        score += fs;
      }

      score += cityBonus(university, profile.cityPref);
      if (department.admissionDetails) score += 0.5;

      matches.push({ university, department, score });
    }
  }

  return matches.sort(
    (a, b) =>
      b.score - a.score ||
      a.university.name.localeCompare(b.university.name) ||
      a.department.name.localeCompare(b.department.name),
  );
}

const MIN_MATCHES = 3;

export function matchPrograms(
  profile: UserProfile,
  universities: University[],
): RecommendationResult {
  let matches = collectMatches(universities, profile, "none");
  if (matches.length >= MIN_MATCHES) return { matches, relaxed: "none" };

  matches = collectMatches(universities, profile, "field-partial");
  if (matches.length >= MIN_MATCHES) return { matches, relaxed: "field-partial" };

  matches = collectMatches(universities, profile, "level-only");
  return { matches, relaxed: "level-only" };
}

export function pickScholarshipRegion(
  matches: ProgramMatch[],
): ScholarshipRegionRecord | null {
  for (const match of matches) {
    const slug = CITY_TO_REGION[match.university.city.toLowerCase().trim()];
    if (slug && SCHOLARSHIP_REGION_MAP[slug]) {
      return SCHOLARSHIP_REGION_MAP[slug];
    }
  }
  return null;
}

export function pickCities(
  matches: ProgramMatch[],
  cityPref: UserProfile["cityPref"],
  limit = 3,
): CityDetail[] {
  const picked: CityDetail[] = [];
  const seen = new Set<string>();

  const tryAdd = (cityName: string) => {
    const detail = CURATED_CITIES.find(
      (c) =>
        c.name.toLowerCase() === cityName.toLowerCase() ||
        c.nameEn.toLowerCase() === cityName.toLowerCase(),
    );
    if (detail && !seen.has(detail.slug)) {
      seen.add(detail.slug);
      picked.push(detail);
    }
  };

  // Önce en iyi eşleşmelerin şehirleri
  for (const match of matches) {
    if (picked.length >= limit) return picked;
    tryAdd(match.university.city);
  }

  // Sonra grup üyeleri
  if (cityPref && cityPref !== "any") {
    for (const cityName of CITY_GROUPS[cityPref]) {
      if (picked.length >= limit) return picked;
      tryAdd(cityName);
    }
  }

  return picked;
}
```

- [ ] **Step 2: Derleme kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok. `RegionSlug` union'ına uymayan `CITY_TO_REGION` değeri varsa
derleme hatası verir — slug'ı `types/scholarships.ts` içindekiyle düzelt
(örn. `trentino-alto-adige` union'da farklı yazılıyorsa union'daki halini kullan).

- [ ] **Step 3: Hızlı duman testi (geçici, commit'lenmez)**

Canlı veri üzerinde motorun boş dönmediğini gör:

```bash
node --input-type=module -e "
const res = await fetch('https://italypath.app/api/universities');
const unis = await res.json();
let count = 0;
for (const u of unis) for (const d of u.departments) {
  if (d.level === 'master' && /engineering|computer/i.test(d.name)) count++;
}
console.log('ornek eslesme sayisi (master + eng/comp):', count);
"
```
Expected: 0'dan büyük bir sayı (canlıda ~743 master program var).

- [ ] **Step 4: Commit**

```bash
git add lib/hub/recommendations.ts
git commit -m "feat(hub): kural bazli oneri motoru"
```

---

### Task 5: Çeviriler — `onboarding.*` + yeni `hub.*` anahtarları

**Files:**
- Modify: `lib/translations.ts` (hem `tr` hem `en` altında; ikisi de eksiksiz)

**DİKKAT:** Bu görevde SADECE anahtar EKLE. Eski `hub.*` anahtarlarını silme —
onlar Task 9'da, kullanan bileşenlerle birlikte kaldırılacak (aksi halde derleme kırılır).

- [ ] **Step 1: `tr` objesine `onboarding` namespace'i ekle**

```ts
onboarding: {
  skip: "Şimdilik geç",
  back: "Geri",
  next: "Devam et",
  finish: "Dosyamı hazırla",
  stepLabel: "Adım {current} / {total}",
  saveError: "Cevapların kaydedilemedi. Tekrar dener misin?",
  retry: "Tekrar dene",
  steps: {
    level: {
      title: "Hangi seviyede okumak istiyorsun?",
      subtitle: "Önerileri bu seviyeye göre süzeceğiz.",
      options: {
        bachelor: "Lisans",
        master: "Yüksek lisans",
      },
    },
    fields: {
      title: "Hangi alan seni çekiyor?",
      subtitle: "En fazla iki alan seçebilirsin.",
      options: {
        "engineering-tech": "Mühendislik ve teknoloji",
        "medicine-health": "Tıp ve sağlık",
        "business-economics": "İşletme ve ekonomi",
        "design-architecture": "Tasarım ve mimarlık",
        "natural-sciences": "Fen bilimleri",
        "social-humanities": "Sosyal ve beşeri bilimler",
        "arts-fashion": "Sanat ve moda",
        "law-politics": "Hukuk ve siyaset",
      },
    },
    budget: {
      title: "Eğitim bütçen için hangisi sana yakın?",
      subtitle: "Burs ve ISEE önerilerini buna göre ayarlayacağız.",
      options: {
        "scholarship-required": "Burssuz okuyamam",
        "support-helpful": "Maddi destek iyi olur",
        flexible: "Esneğim",
      },
    },
    city: {
      title: "Nasıl bir şehirde yaşamak istersin?",
      subtitle: "Şehir ve program önerilerini buna göre sıralayacağız.",
      options: {
        "big-city": "Olabildiğince büyük bir şehir",
        "student-city": "Çok büyük olmasın, öğrenci şehri olsun",
        any: "Farketmez, program önemli",
      },
    },
  },
  finale: {
    eyebrow: "ITALYPATH",
    title: "Dosyan hazırlanıyor",
    subtitle: "Profiline uyan programları seçiyoruz.",
  },
},
```

- [ ] **Step 2: `en` objesine aynı yapıda `onboarding` ekle**

```ts
onboarding: {
  skip: "Skip for now",
  back: "Back",
  next: "Continue",
  finish: "Build my dossier",
  stepLabel: "Step {current} / {total}",
  saveError: "We couldn't save your answers. Try again?",
  retry: "Try again",
  steps: {
    level: {
      title: "What level do you want to study at?",
      subtitle: "We'll filter recommendations by this level.",
      options: {
        bachelor: "Bachelor's",
        master: "Master's",
      },
    },
    fields: {
      title: "Which field draws you in?",
      subtitle: "You can pick up to two fields.",
      options: {
        "engineering-tech": "Engineering & technology",
        "medicine-health": "Medicine & health",
        "business-economics": "Business & economics",
        "design-architecture": "Design & architecture",
        "natural-sciences": "Natural sciences",
        "social-humanities": "Social sciences & humanities",
        "arts-fashion": "Arts & fashion",
        "law-politics": "Law & politics",
      },
    },
    budget: {
      title: "Which best describes your budget?",
      subtitle: "We'll tailor scholarship and ISEE guidance to this.",
      options: {
        "scholarship-required": "I can't study without a scholarship",
        "support-helpful": "Financial support would help",
        flexible: "I'm flexible",
      },
    },
    city: {
      title: "What kind of city do you want to live in?",
      subtitle: "We'll rank city and program suggestions accordingly.",
      options: {
        "big-city": "As big a city as possible",
        "student-city": "Not too big — a student city",
        any: "Doesn't matter, the program comes first",
      },
    },
  },
  finale: {
    eyebrow: "ITALYPATH",
    title: "Preparing your dossier",
    subtitle: "Picking the programs that match your profile.",
  },
},
```

- [ ] **Step 3: `tr.hub` ve `en.hub` içine YENİ anahtarları ekle** (mevcutları silmeden)

TR:

```ts
// --- yeni öneri merkezi anahtarları ---
profileStrip: {
  edit: "Düzenle",
  complete: "Tamamla",
},
recoHero: {
  titleStart: "Profiline uyan",
  titleHighlight: "{count} program",
  titleEnd: "bulduk.",
  relaxedNote: "Alanını biraz genişlettik — birebir eşleşme azdı.",
},
recoSections: {
  programs: "Sana özel programlar",
  seeAll: "Tüm {count} programı gör",
  collapse: "Daha az göster",
  scholarship: "Bursun için",
  cities: "Sana göre şehirler",
},
scholarshipCards: {
  regionTitle: "{region} bölge bursu",
  regionDesc: "Önerilerindeki şehirlerle eşleşen DSU bursu",
  iseeTitle: "ISEE değerini hesapla",
  iseeDesc: "Burs başvurusunun ilk adımı — 5 dakika sürer",
},
compact: {
  shortlist: "Kısa listem",
  shortlistUnit: "{count} okul",
  documents: "Belgelerim",
  documentsUnit: "{count} belge",
},
invite: {
  title: "2 dakikada profilini oluştur",
  desc: "Dört kısa soruyu cevapla; bu sayfa sana uyan program, burs ve şehir önerileriyle dolsun.",
  cta: "Profili oluştur",
  explore: "Ya da keşfetmeye başla:",
  exploreUniversities: "Üniversiteler",
  exploreCities: "Şehirler",
  exploreScholarships: "Burslar",
},
levelShort: {
  bachelor: "L",
  master: "YL",
  "single-cycle": "TD",
},
loadError: "Program verisi şu anda yüklenemiyor. Sayfayı yenilemeyi dene.",
greeting: "Merhaba, {name}",
```

EN (aynı anahtarlar):

```ts
profileStrip: {
  edit: "Edit",
  complete: "Complete",
},
recoHero: {
  titleStart: "We found",
  titleHighlight: "{count} programs",
  titleEnd: "matching your profile.",
  relaxedNote: "We widened your field a little — exact matches were scarce.",
},
recoSections: {
  programs: "Programs picked for you",
  seeAll: "See all {count} programs",
  collapse: "Show fewer",
  scholarship: "For your scholarship",
  cities: "Cities that fit you",
},
scholarshipCards: {
  regionTitle: "{region} regional scholarship",
  regionDesc: "DSU scholarship matching your recommended cities",
  iseeTitle: "Calculate your ISEE",
  iseeDesc: "The first step of a scholarship application — takes 5 minutes",
},
compact: {
  shortlist: "My shortlist",
  shortlistUnit: "{count} schools",
  documents: "My documents",
  documentsUnit: "{count} files",
},
invite: {
  title: "Build your profile in 2 minutes",
  desc: "Answer four short questions and this page fills with programs, scholarships and cities that fit you.",
  cta: "Build profile",
  explore: "Or start exploring:",
  exploreUniversities: "Universities",
  exploreCities: "Cities",
  exploreScholarships: "Scholarships",
},
levelShort: {
  bachelor: "B",
  master: "M",
  "single-cycle": "SC",
},
loadError: "Program data can't be loaded right now. Try refreshing the page.",
greeting: "Hi, {name}",
```

Ayrıca `tr.hub` / `en.hub` içine profil özet etiketi olarak onboarding seçenek
metinleri YENİDEN yazılmaz; ProfileStrip, `t.onboarding.steps.*.options` üzerinden okur.

- [ ] **Step 4: Derleme kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok. TR ve EN yapıları birebir aynı şekle sahip olmalı
(translations dosyasındaki mevcut tip düzeni ne gerektiriyorsa ona uy).

- [ ] **Step 5: Commit**

```bash
git add lib/translations.ts
git commit -m "feat(hub): onboarding ve oneri merkezi tr/en metinleri"
```

---

### Task 6: Onboarding sihirbazı UI — `/hosgeldin`

**Files:**
- Create: `components/onboarding/WizardOptionCard.tsx`
- Create: `components/onboarding/WizardProgress.tsx`
- Create: `components/onboarding/WizardFinale.tsx`
- Create: `app/hosgeldin/page.tsx`

Tasarım dili: editorial (paper zemin, `--editorial-*` değişkenleri, serif başlık,
keskin border, gradient YOK). Mevcut `components/auth/AuthShell.tsx` ve
`components/hub/DossierHero.tsx` sınıf kalıplarına bak, aynı idiomu kullan.
Mobil öncelikli: seçenek kartları tek kolonda başlar, `sm:` ile iki kolon.

- [ ] **Step 1: `WizardOptionCard.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";

interface WizardOptionCardProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  multi?: boolean;
}

export default function WizardOptionCard({
  label,
  selected,
  onToggle,
  multi = false,
}: WizardOptionCardProps) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-3 border px-4 py-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px] ${
        selected
          ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)]"
          : "border-[var(--editorial-border)] bg-[var(--editorial-surface)] hover:bg-[rgba(216,222,217,0.25)]"
      }`}
    >
      <span
        className={`text-sm leading-5 ${
          selected
            ? "font-semibold text-[var(--editorial-ink)]"
            : "text-[var(--editorial-ink)]"
        }`}
      >
        {label}
      </span>
      {selected && (
        <Check
          className="h-4 w-4 shrink-0 text-[var(--editorial-sage)]"
          strokeWidth={2.5}
        />
      )}
    </button>
  );
}
```

- [ ] **Step 2: `WizardProgress.tsx`**

```tsx
"use client";

interface WizardProgressProps {
  current: number; // 1-tabanlı
  total: number;
  label: string; // t.onboarding.stepLabel doldurulmuş hali
}

export default function WizardProgress({ current, total, label }: WizardProgressProps) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--editorial-terracotta)]">
        {label}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 ${
              i < current ? "bg-[var(--editorial-sage)]" : "bg-[var(--editorial-border)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `WizardFinale.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";

interface WizardFinaleProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export default function WizardFinale({ eyebrow, title, subtitle }: WizardFinaleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 110, damping: 22 }}
      className="py-16 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--editorial-terracotta)]">
        {eyebrow}
      </p>
      <h1 className="mt-5 font-serif text-4xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)]">
        {title}
      </h1>
      <p className="mt-4 text-sm leading-6 text-[var(--editorial-muted)]">{subtitle}</p>
      <div className="mx-auto mt-8 h-[2px] w-24 overflow-hidden bg-[var(--editorial-border)]">
        <motion.div
          className="h-full w-1/3 bg-[var(--editorial-sage)]"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: `app/hosgeldin/page.tsx`**

Davranış kuralları:
- Adım sırası: `level` → `fields` → `budget` → `city` (toplam 4).
- `level`, `budget`, `city` tek seçim: seçim yapılınca otomatik ilerleme YOK, kullanıcı
  "Devam et" ile ilerler (yanlış tıklamayı düzeltebilsin). Seçimsiz "Devam et" pasif değil —
  cevapsız ilerlemeye izin ver (o boyut boş kalır; spec kısmi profili geçerli sayar).
- `fields` çoklu seçim, en fazla `MAX_PROFILE_FIELDS` (2); 2 seçiliyken diğerlerine
  tıklamak en eskisini düşürmez, sadece seçilemez durumda kalır (görsel olarak normal,
  tıklanınca hiçbir şey olmaz) — karmaşa yaratma.
- "Şimdilik geç": o ana kadarki cevapları kaydeder (en az bir cevap varsa `saveProfile`),
  sonra `/hub`'a gider.
- Son adımda "Dosyamı hazırla": `saveProfile` çağrılır; başarılıysa finale ekranı
  ~1.4 sn gösterilir, sonra `router.push("/hub")`. Hata dönerse inline `saveError` +
  `retry` butonu.
- Profil zaten doluysa (düzenleme modu): yüklenen profil draft'a önceden doldurulur.
- `useUserProfile().loading` sürerken mevcut hub loading kalıbı gibi shimmer blokları göster.

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useUserProfile } from "@/lib/hub/useUserProfile";
import {
  MAX_PROFILE_FIELDS,
  PROFILE_BUDGETS,
  PROFILE_CITY_PREFS,
  PROFILE_FIELDS,
  PROFILE_LEVELS,
  isProfileEmpty,
  type UserProfile,
} from "@/lib/hub/profile";
import WizardOptionCard from "@/components/onboarding/WizardOptionCard";
import WizardProgress from "@/components/onboarding/WizardProgress";
import WizardFinale from "@/components/onboarding/WizardFinale";

type StepId = "level" | "fields" | "budget" | "city";
const STEPS: StepId[] = ["level", "fields", "budget", "city"];

export default function HosgeldinPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { profile, loading, saveProfile } = useUserProfile();

  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [finished, setFinished] = useState(false);

  // Yüklenen profili draft'a bir kez doldur (düzenleme modu)
  useEffect(() => {
    if (!loading && !hydrated) {
      setDraft(profile);
      setHydrated(true);
    }
  }, [loading, hydrated, profile]);

  const step = STEPS[stepIndex];
  const stepCopy = t.onboarding.steps[step];
  const stepLabel = t.onboarding.stepLabel
    .replace("{current}", String(stepIndex + 1))
    .replace("{total}", String(STEPS.length));

  const persist = async (next: UserProfile): Promise<boolean> => {
    if (isProfileEmpty(next)) return true; // boş profil için satır yazma
    setSaving(true);
    setSaveFailed(false);
    const ok = await saveProfile(next);
    setSaving(false);
    if (!ok) setSaveFailed(true);
    return ok;
  };

  const handleSkip = async () => {
    await persist(draft); // hata olsa da kullanıcıyı rehin tutma
    router.push("/hub");
  };

  const handleFinish = async () => {
    const ok = await persist(draft);
    if (!ok) return;
    setFinished(true);
    window.setTimeout(() => router.push("/hub"), 1400);
  };

  const toggleField = (field: (typeof PROFILE_FIELDS)[number]) => {
    setDraft((d) => {
      if (d.fields.includes(field)) {
        return { ...d, fields: d.fields.filter((f) => f !== field) };
      }
      if (d.fields.length >= MAX_PROFILE_FIELDS) return d;
      return { ...d, fields: [...d.fields, field] };
    });
  };

  // useMemo bilinçli olarak kullanılmıyor: toggleField her render'da yeniden
  // yaratıldığı için exhaustive-deps ile çatışır; hesap zaten ucuz.
  const options = (() => {
    if (step === "level") {
      return PROFILE_LEVELS.map((value) => ({
        value,
        label: t.onboarding.steps.level.options[value],
        selected: draft.level === value,
        onToggle: () =>
          setDraft((d) => ({ ...d, level: d.level === value ? null : value })),
        multi: false,
      }));
    }
    if (step === "fields") {
      return PROFILE_FIELDS.map((value) => ({
        value,
        label: t.onboarding.steps.fields.options[value],
        selected: draft.fields.includes(value),
        onToggle: () => toggleField(value),
        multi: true,
      }));
    }
    if (step === "budget") {
      return PROFILE_BUDGETS.map((value) => ({
        value,
        label: t.onboarding.steps.budget.options[value],
        selected: draft.budget === value,
        onToggle: () =>
          setDraft((d) => ({ ...d, budget: d.budget === value ? null : value })),
        multi: false,
      }));
    }
    return PROFILE_CITY_PREFS.map((value) => ({
      value,
      label: t.onboarding.steps.city.options[value],
      selected: draft.cityPref === value,
      onToggle: () =>
        setDraft((d) => ({ ...d, cityPref: d.cityPref === value ? null : value })),
      multi: false,
    }));
  })();

  if (loading || !hydrated) {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="h-8 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-40 bg-[var(--editorial-surface)] shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-8 sm:px-6 sm:py-12">
      <main className="mx-auto max-w-xl">
        {finished ? (
          <WizardFinale
            eyebrow={t.onboarding.finale.eyebrow}
            title={t.onboarding.finale.title}
            subtitle={t.onboarding.finale.subtitle}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-ink)]"
              >
                ITALYPATH
              </Link>
              <button
                type="button"
                onClick={handleSkip}
                className="inline-flex items-center gap-1 border-b border-[var(--editorial-border)] pb-px text-xs text-[var(--editorial-muted)] transition-colors hover:text-[var(--editorial-ink)]"
              >
                {t.onboarding.skip}
                <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>

            <div className="mt-8">
              <WizardProgress
                current={stepIndex + 1}
                total={STEPS.length}
                label={stepLabel}
              />
            </div>

            <h1 className="mt-6 font-serif text-3xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)] sm:text-4xl">
              {stepCopy.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--editorial-muted)]">
              {stepCopy.subtitle}
            </p>

            <div
              role={step === "fields" ? "group" : "radiogroup"}
              aria-label={stepCopy.title}
              className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {options.map((option) => (
                <WizardOptionCard
                  key={option.value}
                  label={option.label}
                  selected={option.selected}
                  onToggle={option.onToggle}
                  multi={option.multi}
                />
              ))}
            </div>

            {saveFailed && (
              <div className="mt-4 border border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-4 py-3">
                <p className="text-sm text-[var(--editorial-ink)]">
                  {t.onboarding.saveError}
                </p>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={stepIndex === 0}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--editorial-muted)] transition-colors hover:text-[var(--editorial-ink)] disabled:invisible"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                {t.onboarding.back}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  stepIndex === STEPS.length - 1
                    ? void handleFinish()
                    : setStepIndex((i) => i + 1)
                }
                className="inline-flex items-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px] disabled:opacity-60"
              >
                {saveFailed
                  ? t.onboarding.retry
                  : stepIndex === STEPS.length - 1
                    ? t.onboarding.finish
                    : t.onboarding.next}
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Derleme + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: hata yok.

- [ ] **Step 6: Commit**

```bash
git add components/onboarding app/hosgeldin
git commit -m "feat(onboarding): /hosgeldin dort adimli sihirbaz"
```

---

### Task 7: Yönlendirme + route guard

**Files:**
- Modify: `app/layout.tsx` (ClerkProvider prop'u)
- Modify: `proxy.ts` (`PROTECTED_PAGE_ROUTES`)
- Modify: `scripts/check-route-access.mjs` (`protectedChecks`)

- [ ] **Step 1: `app/layout.tsx` — kayıt sonrası hedefi değiştir**

`signUpFallbackRedirectUrl="/hub"` satırını bul, şu yap:

```tsx
signUpFallbackRedirectUrl="/hosgeldin"
```

`signInFallbackRedirectUrl="/hub"` DEĞİŞMEZ.

- [ ] **Step 2: `proxy.ts` — korumalı sayfa listesine ekle**

```ts
const PROTECTED_PAGE_ROUTES = [
  "/ai-mentor",
  "/documents",
  "/favorites",
  "/hosgeldin",
  "/hub",
  "/profile",
];
```

- [ ] **Step 3: `scripts/check-route-access.mjs` — protected matrix'e ekle**

`protectedChecks` dizisine `"/hosgeldin"` satırı ekle (mevcut `"/hub"` satırının yanına).

- [ ] **Step 4: Doğrula**

Run: `npm run check:routes`
Expected: PASS (tüm public/protected beklentileri geçer).

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx proxy.ts scripts/check-route-access.mjs
git commit -m "feat(onboarding): kayit sonrasi /hosgeldin yonlendirmesi ve route guard"
```

---

### Task 8: Yeni Hub — öneri merkezi

**Files:**
- Create: `components/hub/ProfileStrip.tsx`
- Create: `components/hub/RecommendationHero.tsx`
- Create: `components/hub/ProgramMatchList.tsx`
- Create: `components/hub/ScholarshipBlock.tsx`
- Create: `components/hub/CityPicksBlock.tsx`
- Create: `components/hub/CompactStatCard.tsx`
- Create: `components/hub/ProfileInviteCard.tsx`
- Modify: `app/hub/page.tsx` (tam yeniden yazım)

Korunanlar: `DossierTopStrip`, `PreferencesStrip`, `AccountFooter`, `useDocumentsCount`.
Bu görevde ESKİ bileşenler silinmez (Task 9'da) — sadece page.tsx artık onları import etmez.

- [ ] **Step 1: `ProfileStrip.tsx`**

```tsx
"use client";

import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import type { UserProfile } from "@/lib/hub/profile";

export default function ProfileStrip({ profile }: { profile: UserProfile }) {
  const { t } = useLanguage();

  const parts: string[] = [];
  if (profile.level) parts.push(t.onboarding.steps.level.options[profile.level]);
  for (const field of profile.fields) {
    parts.push(t.onboarding.steps.fields.options[field]);
  }
  if (profile.budget) parts.push(t.onboarding.steps.budget.options[profile.budget]);
  if (profile.cityPref) parts.push(t.onboarding.steps.city.options[profile.cityPref]);

  const incomplete =
    !profile.level ||
    profile.fields.length === 0 ||
    !profile.budget ||
    !profile.cityPref;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 border border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)] px-4 py-2.5">
      {parts.map((part, i) => (
        <span key={part} className="text-[12px] text-[var(--editorial-ink)]">
          {i > 0 && <span className="mr-2 text-[var(--editorial-muted)]">·</span>}
          {part}
        </span>
      ))}
      <Link
        href="/hosgeldin"
        className="ml-auto border-b border-[var(--editorial-sage)] pb-px text-[11px] font-semibold text-[var(--editorial-sage)]"
      >
        {incomplete ? t.hub.profileStrip.complete : t.hub.profileStrip.edit}
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: `RecommendationHero.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

interface RecommendationHeroProps {
  count: number;
  lede: string; // sayfada profil parçalarından kurulur
  relaxed: boolean;
}

export default function RecommendationHero({ count, lede, relaxed }: RecommendationHeroProps) {
  const { t } = useLanguage();

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 110, damping: 22 }}
      aria-labelledby="hub-hero-title"
      className="mt-8"
    >
      <h1
        id="hub-hero-title"
        className="max-w-3xl font-serif text-4xl font-normal leading-[1.02] tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-5xl"
      >
        {t.hub.recoHero.titleStart}{" "}
        <span className="italic text-[var(--editorial-sage)]">
          {t.hub.recoHero.titleHighlight.replace("{count}", String(count))}
        </span>{" "}
        {t.hub.recoHero.titleEnd}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)] sm:text-base">
        {lede}
        {relaxed && (
          <span className="mt-1 block text-[12px] text-[var(--editorial-terracotta)]">
            {t.hub.recoHero.relaxedNote}
          </span>
        )}
      </p>
    </motion.section>
  );
}
```

- [ ] **Step 3: `ProgramMatchList.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { ProgramMatch } from "@/lib/hub/recommendations";

const PREVIEW_COUNT = 5;

export default function ProgramMatchList({ matches }: { matches: ProgramMatch[] }) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? matches : matches.slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="hub-programs-label" className="mt-10">
      <p
        id="hub-programs-label"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.recoSections.programs}
      </p>
      <div className="mt-2 border-t border-[var(--editorial-border)]">
        {visible.map(({ university, department }) => {
          const levelShort = t.hub.levelShort[department.level];
          const langs = department.languages.map((l) => l.toUpperCase()).join("/");
          return (
            <Link
              key={`${university.id}-${department.slug}`}
              href={`/universities/${university.id}/departments/${department.slug}`}
              className="group flex items-center justify-between gap-3 border-b border-[var(--editorial-border)] px-1 py-3 transition-colors hover:bg-[rgba(216,222,217,0.25)]"
            >
              <div className="min-w-0">
                <p className="truncate font-serif text-[15px] text-[var(--editorial-ink)]">
                  {department.name}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-[var(--editorial-muted)]">
                  {university.name} · {university.city}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="border border-[var(--editorial-sage)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--editorial-sage)]">
                  {levelShort} · {langs}
                </span>
                <ArrowRight
                  className="h-4 w-4 text-[var(--editorial-terracotta)] transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </div>
            </Link>
          );
        })}
      </div>
      {matches.length > PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 border-b border-[var(--editorial-sage)] pb-px text-[12px] font-semibold text-[var(--editorial-sage)]"
        >
          {showAll
            ? t.hub.recoSections.collapse
            : t.hub.recoSections.seeAll.replace("{count}", String(matches.length))}
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 4: `ScholarshipBlock.tsx`**

```tsx
"use client";

import Link from "next/link";
import { Calculator, MapPin } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { ProfileBudget } from "@/lib/hub/profile";
import type { ScholarshipRegionRecord } from "@/types/scholarships";

interface ScholarshipBlockProps {
  region: ScholarshipRegionRecord | null;
  budget: ProfileBudget | null;
}

export default function ScholarshipBlock({ region, budget }: ScholarshipBlockProps) {
  const { t } = useLanguage();

  // "flexible" → kompakt tek satır; diğerleri (null dahil) → standart iki kart
  if (budget === "flexible") {
    return (
      <section aria-labelledby="hub-scholarship-label" className="mt-10">
        <p
          id="hub-scholarship-label"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
        >
          {t.hub.recoSections.scholarship}
        </p>
        <Link
          href="/isee"
          className="mt-2 flex items-center justify-between border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-3 transition-colors hover:bg-[rgba(216,222,217,0.25)]"
        >
          <span className="text-[13px] text-[var(--editorial-ink)]">
            {t.hub.scholarshipCards.iseeTitle}
          </span>
          <Calculator className="h-4 w-4 text-[var(--editorial-sage)]" strokeWidth={2} />
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="hub-scholarship-label" className="mt-10">
      <p
        id="hub-scholarship-label"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.recoSections.scholarship}
      </p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {region && (
          <Link
            href="/scholarships"
            className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 transition-colors hover:bg-[rgba(216,222,217,0.25)]"
          >
            <MapPin className="h-[17px] w-[17px] text-[var(--editorial-sage)]" strokeWidth={2} />
            <p className="mt-2 text-[13px] font-semibold text-[var(--editorial-ink)]">
              {t.hub.scholarshipCards.regionTitle.replace("{region}", region.regionName)}
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-[var(--editorial-muted)]">
              {t.hub.scholarshipCards.regionDesc}
            </p>
          </Link>
        )}
        <Link
          href="/isee"
          className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 transition-colors hover:bg-[rgba(216,222,217,0.25)]"
        >
          <Calculator className="h-[17px] w-[17px] text-[var(--editorial-sage)]" strokeWidth={2} />
          <p className="mt-2 text-[13px] font-semibold text-[var(--editorial-ink)]">
            {t.hub.scholarshipCards.iseeTitle}
          </p>
          <p className="mt-0.5 text-[11px] leading-5 text-[var(--editorial-muted)]">
            {t.hub.scholarshipCards.iseeDesc}
          </p>
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: `CityPicksBlock.tsx`**

```tsx
"use client";

import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import type { CityDetail } from "@/types/cities";

export default function CityPicksBlock({ cities }: { cities: CityDetail[] }) {
  const { t, language } = useLanguage();

  if (cities.length === 0) return null;

  return (
    <section aria-labelledby="hub-cities-label" className="mt-10">
      <p
        id="hub-cities-label"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.recoSections.cities}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cities.map((city) => (
          <Link
            key={city.slug}
            href="/cities"
            className="border border-[var(--editorial-border)] bg-[var(--editorial-band)] p-3 transition-colors hover:bg-[rgba(216,222,217,0.4)]"
          >
            <p className="font-serif text-[15px] text-[var(--editorial-ink)]">
              {language === "tr" ? city.name : city.nameEn}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--editorial-muted)]">
              {language === "tr" ? city.nameEn : city.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

Not: `/cities` sayfası şehir bazlı anchor/param destekliyorsa
(`components/cities/CityGuidesExplorer.tsx` içine bak; ör. `#milano` ya da `?city=`),
`href`'i o mekanizmayla şehre derin-link yap. Yoksa `/cities` yeterli.

- [ ] **Step 6: `CompactStatCard.tsx`**

```tsx
"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface CompactStatCardProps {
  href: string;
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
}

export default function CompactStatCard({
  href,
  label,
  value,
  icon: Icon,
  iconClassName,
}: CompactStatCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 transition-colors hover:bg-[rgba(216,222,217,0.25)]"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
          {label}
        </p>
        <p className="mt-1 font-serif text-xl text-[var(--editorial-ink)]">{value}</p>
      </div>
      <Icon className={`h-[18px] w-[18px] ${iconClassName}`} strokeWidth={2} />
    </Link>
  );
}
```

- [ ] **Step 7: `ProfileInviteCard.tsx`**

```tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

export default function ProfileInviteCard() {
  const { t } = useLanguage();

  const exploreLinks = [
    { href: "/universities", label: t.hub.invite.exploreUniversities },
    { href: "/cities", label: t.hub.invite.exploreCities },
    { href: "/scholarships", label: t.hub.invite.exploreScholarships },
  ];

  return (
    <section className="mt-8 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6 sm:p-8">
      <h1 className="font-serif text-3xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)] sm:text-4xl">
        {t.hub.invite.title}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--editorial-muted)]">
        {t.hub.invite.desc}
      </p>
      <Link
        href="/hosgeldin"
        className="mt-5 inline-flex items-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:translate-y-[1px]"
      >
        {t.hub.invite.cta}
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--editorial-border)] pt-4">
        <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
          {t.hub.invite.explore}
        </span>
        {exploreLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="border-b border-[var(--editorial-sage)] pb-px text-[12px] font-semibold text-[var(--editorial-sage)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 8: `app/hub/page.tsx` yeniden yazımı**

Mevcut dosyadaki `loading` shimmer bloğu ve `signed-out` kartı AYNEN korunur
(sadece bento grid shimmer'ı yerine 3 adet `h-32` blok kullan). Yeni kompozisyon:

```tsx
"use client";

import { useEffect, useMemo } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, FolderOpen, Heart } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useFavorites } from "@/lib/useFavorites";
import { useUniversitiesData } from "@/lib/useUniversitiesData";
import { useUserProfile } from "@/lib/hub/useUserProfile";
import { useDocumentsCount } from "@/lib/hub/useDocumentsCount";
import { isProfileEmpty } from "@/lib/hub/profile";
import {
  matchPrograms,
  pickCities,
  pickScholarshipRegion,
} from "@/lib/hub/recommendations";

import DossierTopStrip from "@/components/hub/DossierTopStrip";
import ProfileStrip from "@/components/hub/ProfileStrip";
import RecommendationHero from "@/components/hub/RecommendationHero";
import ProgramMatchList from "@/components/hub/ProgramMatchList";
import ScholarshipBlock from "@/components/hub/ScholarshipBlock";
import CityPicksBlock from "@/components/hub/CityPicksBlock";
import CompactStatCard from "@/components/hub/CompactStatCard";
import ProfileInviteCard from "@/components/hub/ProfileInviteCard";
import PreferencesStrip from "@/components/hub/PreferencesStrip";
import AccountFooter from "@/components/hub/AccountFooter";

export default function HubPage() {
  const { t } = useLanguage();
  const { isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const { count: documentsCount, loading: documentsCountLoading, unavailable: documentsUnavailable } = useDocumentsCount();
  const { profile, loading: profileLoading, unavailable: profileUnavailable } = useUserProfile();
  const { universities, loading: universitiesLoading } = useUniversitiesData();

  // Hook'un dönüş imzasına bağımlı olmadan hata tespiti: yükleme bitti ama veri boş
  const universitiesError = !universitiesLoading && universities.length === 0;

  // Eski stage anahtarı artık kullanılmıyor; sessizce temizle
  useEffect(() => {
    try {
      window.localStorage.removeItem("italyPathStage");
    } catch {
      /* yoksay */
    }
  }, []);

  const hasProfile = !profileUnavailable && !isProfileEmpty(profile);

  const recommendation = useMemo(
    () => (hasProfile ? matchPrograms(profile, universities) : null),
    [hasProfile, profile, universities],
  );
  const scholarshipRegion = useMemo(
    () => (recommendation ? pickScholarshipRegion(recommendation.matches) : null),
    [recommendation],
  );
  const cityPicks = useMemo(
    () => (recommendation ? pickCities(recommendation.matches, profile.cityPref) : []),
    [recommendation, profile.cityPref],
  );

  const lede = useMemo(() => {
    if (!hasProfile) return "";
    const parts: string[] = [];
    for (const field of profile.fields) parts.push(t.onboarding.steps.fields.options[field]);
    if (profile.level) parts.push(t.onboarding.steps.level.options[profile.level]);
    if (profile.cityPref && profile.cityPref !== "any") {
      parts.push(t.onboarding.steps.city.options[profile.cityPref]);
    }
    return parts.join(" · ");
  }, [hasProfile, profile, t]);

  const loading =
    !userLoaded || favoritesLoading || documentsCountLoading || profileLoading || universitiesLoading;

  if (loading) {
    return (
      /* MEVCUT shimmer bloğu — eski page.tsx'ten kopyala, bento grid'i 3 adet
         h-32 shimmer bloğuyla değiştir */
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="h-10 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-24 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-32 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-32 bg-[var(--editorial-surface)] shimmer" />
          <div className="h-32 bg-[var(--editorial-surface)] shimmer" />
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
            {t.hub.loading}
          </p>
        </div>
      </div>
    );
  }

  if (userLoaded && !isSignedIn) {
    /* MEVCUT signed-out kartı — eski page.tsx'ten AYNEN kopyala */
  }

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <DossierTopStrip />

        {hasProfile && recommendation ? (
          <>
            <ProfileStrip profile={profile} />
            {universitiesError ? (
              /* Route-level editorial hata bloğu kalıbı: kısa mesaj + yeniden dene.
                 Mevcut örnek için components/universities/UniversitiesExplorer.tsx
                 hata durumuna bak ve aynı biçimi kullan. */
              <div className="mt-8 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-6">
                <p className="text-sm text-[var(--editorial-muted)]">{t.hub.loadError}</p>
              </div>
            ) : (
              <>
                <RecommendationHero
                  count={recommendation.matches.length}
                  lede={lede}
                  relaxed={recommendation.relaxed !== "none"}
                />
                <ProgramMatchList matches={recommendation.matches} />
                <ScholarshipBlock region={scholarshipRegion} budget={profile.budget} />
                <CityPicksBlock cities={cityPicks} />
              </>
            )}
          </>
        ) : (
          <ProfileInviteCard />
        )}

        <div className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CompactStatCard
            href="/favorites"
            label={t.hub.compact.shortlist}
            value={t.hub.compact.shortlistUnit.replace("{count}", String(favorites.length))}
            icon={Heart}
            iconClassName="text-[var(--editorial-terracotta)]"
          />
          <CompactStatCard
            href="/documents"
            label={t.hub.compact.documents}
            value={
              documentsUnavailable
                ? "—"
                : t.hub.compact.documentsUnit.replace("{count}", String(documentsCount))
            }
            icon={FolderOpen}
            iconClassName="text-[var(--editorial-sage)]"
          />
        </div>

        <PreferencesStrip />
        <AccountFooter />
      </main>
    </div>
  );
}
```

Notlar:
- `useUniversitiesData` bir `error` alanı sunuyorsa (hook'un dönüş imzasına bak),
  `universitiesError` türetimini onunla birleştirebilirsin (`error || boş liste`);
  sunmuyorsa yukarıdaki türetim yeterli. `t.hub.loadError` anahtarı Task 5'te eklendi.
- Kullanılmayan importları temizle (`Link`, `ArrowRight` yalnızca signed-out kartında
  gerekiyorsa kalır).

- [ ] **Step 9: Derleme + lint + manuel kontrol**

Run: `npx tsc --noEmit && npm run lint && npm run dev`
Manuel: `/hub` — profilsiz durumda davet kartı; `/hosgeldin`'de profil doldur →
`/hub`'da öneriler; profil şeridi "Düzenle" → sihirbaz önceden dolu.
Expected: konsolda hata yok, tüm bloklar render oluyor.

- [ ] **Step 10: Commit**

```bash
git add app/hub/page.tsx components/hub
git commit -m "feat(hub): profil bazli oneri merkezi kompozisyonu"
```

---

### Task 9: Eski parçaların temizliği

**Files:**
- Delete: `components/hub/StageStrip.tsx`, `components/hub/DossierHero.tsx`,
  `components/hub/BentoGrid.tsx`, `components/hub/KisaListeCell.tsx`,
  `components/hub/BelgeCell.tsx`, `components/hub/BursNotuCell.tsx`,
  `components/hub/ToplulukNotuCell.tsx`
- Delete: `lib/hub/stages.ts`, `lib/hub/useHubStage.ts`
- Modify: `lib/useFavorites.ts` (stage bağımlılığı kalkar)
- Modify: `lib/translations.ts` (ölü hub anahtarları kalkar)

- [ ] **Step 1: `lib/useFavorites.ts` içindeki stage çağrısını kaldır**

Şu iki parçayı sil:

```ts
import { advanceStageIfBefore } from "@/lib/hub/useHubStage";
```

ve `toggleFavorite` içindeki:

```ts
if (!alreadyFavorite) {
    advanceStageIfBefore("shortlist");
}
```

- [ ] **Step 2: Bileşen ve lib dosyalarını sil**

```bash
git rm components/hub/StageStrip.tsx components/hub/DossierHero.tsx \
  components/hub/BentoGrid.tsx components/hub/KisaListeCell.tsx \
  components/hub/BelgeCell.tsx components/hub/BursNotuCell.tsx \
  components/hub/ToplulukNotuCell.tsx lib/hub/stages.ts lib/hub/useHubStage.ts
```

- [ ] **Step 3: Kalan referans var mı tara**

Run: `grep -rn "StageStrip\|useHubStage\|advanceStageIfBefore\|DossierHero\|BentoGrid\|KisaListeCell\|BelgeCell\|BursNotuCell\|ToplulukNotuCell\|italyPathStage" app components lib --include="*.ts" --include="*.tsx"`
Expected: sadece `app/hub/page.tsx` içindeki `localStorage.removeItem("italyPathStage")`
satırı çıkar; başka sonuç çıkmamalı.

- [ ] **Step 4: Ölü çeviri anahtarlarını kaldır**

`tr.hub` ve `en.hub` içinden yalnızca silinen bileşenlerin kullandığı anahtarları sil:
`dossierHeadline`, `dossierLede`, `dossierEyebrow`, `heroStats`, `stages`,
`stageStripLabel` (+ varsa sadece silinen cell'lere ait `bursNotu`/`toplulukNotu`
benzeri anahtarlar). SİLMEDEN önce her anahtar için
`grep -rn "<anahtar>" app components` çalıştır; hâlâ kullanan varsa DOKUNMA.
`loading`, `signedOutTitle`, `signedOutDesc`, `signInCta`, `genericName`,
`topStripEyebrow` ve `PreferencesStrip`/`AccountFooter` anahtarları KALIR.

- [ ] **Step 5: Derleme + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: hata yok.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(hub): stage/bento donemini kaldir"
```

---

### Task 10: Doğrulama scripti + dokümantasyon + final kontrol

**Files:**
- Create: `scripts/check-hub-onboarding.mjs`
- Modify: `package.json` (`scripts`)
- Modify: `AGENT_CONTEXT.md`

- [ ] **Step 1: `scripts/check-hub-onboarding.mjs` yaz**

Mevcut scriptlerin idiomu: dosya içeriğini okuyup regex/string kontrolü yapan,
hata listesini yazdırıp `process.exit(1)` ile çıkan Node scriptleri
(örnek: `scripts/check-auth-ui.mjs`).

```js
import { readFileSync, existsSync } from "node:fs";

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

// 1) Dosya varlığı
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

// 2) Silinen modüller geri gelmesin
[
  "components/hub/StageStrip.tsx",
  "components/hub/DossierHero.tsx",
  "components/hub/BentoGrid.tsx",
  "lib/hub/stages.ts",
  "lib/hub/useHubStage.ts",
].forEach((p) => {
  if (existsSync(p)) failures.push(`Silinmiş olması gereken dosya duruyor: ${p}`);
});

// 3) Hub, seed veriye dönmesin
const hubSource = read("app/hub/page.tsx");
if (/from\s+["']@\/app\/data["']/.test(hubSource) && /universitiesData/.test(hubSource)) {
  failures.push("app/hub/page.tsx local seed universitiesData kullanıyor");
}

// 4) Çeviri anahtarları TR+EN
const translations = read("lib/translations.ts");
["onboarding:", "recoHero:", "recoSections:", "invite:", "profileStrip:"].forEach((key) => {
  const count = translations.split(key).length - 1;
  if (count < 2) failures.push(`Çeviri anahtarı TR+EN eksik: ${key} (bulunan: ${count})`);
});

// 5) Route guard
const proxySource = read("proxy.ts");
if (!proxySource.includes('"/hosgeldin"')) {
  failures.push("proxy.ts PROTECTED_PAGE_ROUTES içinde /hosgeldin yok");
}

// 6) Kayıt sonrası yönlendirme
const layoutSource = read("app/layout.tsx");
if (!layoutSource.includes('signUpFallbackRedirectUrl="/hosgeldin"')) {
  failures.push('app/layout.tsx signUpFallbackRedirectUrl="/hosgeldin" değil');
}

// 7) Alan anahtar kelime kapsaması (canlı veri; ağ yoksa uyarı verip geç)
const API_BASE = process.env.ITALYPATH_API_BASE ?? "https://italypath.app";
const recoSource = read("lib/hub/recommendations.ts");

function extractKeywords(source) {
  // FIELD_KEYWORDS bloğundaki tüm string literalleri topla
  const blockMatch = source.match(/FIELD_KEYWORDS[\s\S]*?^};/m);
  if (!blockMatch) return [];
  return [...blockMatch[0].matchAll(/"([^"]+)"/g)]
    .map((m) => m[1].toLowerCase())
    .filter((s) => !s.includes("-")); // kategori id'lerini ele
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
    for (const u of universities) {
      for (const d of u.departments ?? []) {
        total++;
        const name = String(d.name ?? "").toLowerCase();
        if (keywords.some((k) => name.includes(k))) covered++;
      }
    }
    const ratio = total ? covered / total : 0;
    console.log(
      `Alan kapsaması: ${covered}/${total} (%${Math.round(ratio * 100)})`,
    );
    if (ratio < 0.8) {
      failures.push(
        `FIELD_KEYWORDS kapsaması %80'in altında (%${Math.round(ratio * 100)}) — listeleri genişlet`,
      );
    }
    // Şehir gruplarındaki adlar canlı veride var mı?
    const liveCities = new Set(
      universities.map((u) => String(u.city ?? "").toLowerCase()),
    );
    const groupBlock = recoSource.match(/CITY_GROUPS[\s\S]*?^};/m)?.[0] ?? "";
    for (const m of groupBlock.matchAll(/"([^"]+)"/g)) {
      const cityName = m[1];
      if (cityName.includes("-")) continue; // grup id'leri
      if (!liveCities.has(cityName.toLowerCase())) {
        warnings.push(`CITY_GROUPS şehri canlı veride yok: ${cityName}`);
      }
    }
  }
} catch (err) {
  warnings.push(`Canlı kapsama testi atlandı (ağ hatası): ${err.message}`);
}

for (const w of warnings) console.warn(`UYARI: ${w}`);
if (failures.length > 0) {
  for (const f of failures) console.error(`HATA: ${f}`);
  process.exit(1);
}
console.log("check-hub-onboarding: PASS");
```

- [ ] **Step 2: `package.json` scripts'e ekle**

`"check:auth-ui"` satırının yanına:

```json
"check:hub-onboarding": "node scripts/check-hub-onboarding.mjs",
```

- [ ] **Step 3: Scripti çalıştır ve kapsamayı geçir**

Run: `npm run check:hub-onboarding`
Expected: `check-hub-onboarding: PASS` ve kapsama >= %80. Kapsama düşükse
`FIELD_KEYWORDS` listelerini canlı program adlarına bakarak genişlet
(kategori mantığını bozmadan) ve tekrar çalıştır.

- [ ] **Step 4: `AGENT_CONTEXT.md` güncelle**

- "Hub" bölümünü yeni mimariyle yeniden yaz: öneri merkezi, `user_profiles`,
  `/hosgeldin`, kural bazlı motor (`lib/hub/recommendations.ts`), kaldırılan
  stage/bento parçaları, `italyPathStage` localStorage anahtarının emekli olduğu.
- "Auth ve Route Matrix" bölümüne `/hosgeldin` (protected) ekle;
  `signUpFallbackRedirectUrl="/hosgeldin"` notunu düş.
- "Supabase Yuzeyleri" listesine `user_profiles` ekle; SQL dosyaları listesine
  `supabase/user_profiles.sql` ekle.
- "Komutlar" bölümüne `npm run check:hub-onboarding` ekle.
- Kritik proje yapısı ağacına `app/hosgeldin/` ve `components/onboarding/` ekle.

- [ ] **Step 5: Final doğrulama zinciri**

```bash
npm run build && npm run lint && npm run check:routes && npm run check:auth-ui && npm run check:hub-onboarding && npm run check:university-data-source
```
Expected: hepsi PASS. Build'de `/hosgeldin` ve `/hub` derlenir; public SEO
sayfalarında değişiklik olmadığı için bailout riski yok.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-hub-onboarding.mjs package.json AGENT_CONTEXT.md
git commit -m "chore(hub): hub-onboarding smoke check ve dokumantasyon"
```

---

## Manuel kabul senaryoları (uygulama bitince Kerem ile)

1. Yeni hesap kaydı → `/hosgeldin` açılır → 4 soru → "Dosyamı hazırla" → finale →
   `/hub` önerilerle dolu.
2. Sihirbazda 2. adımda "Şimdilik geç" → `/hub`'da kısmi profil şeridi + öneriler
   (seviye+alan bazlı) + "Tamamla" linki.
3. Hiç cevap vermeden geç → `/hub`'da davet kartı.
4. Profil şeridi "Düzenle" → sihirbaz önceden dolu → alan değiştir → `/hub` önerileri değişir.
5. "Burssuz okuyamam" profili → burs bloğu bölge kartı + ISEE ile tam boy;
   "Esneğim" → tek satır kompakt ISEE linki.
6. Nadir kombinasyon (örn. lisans + sanat ve moda) → liste yine >= 1 program gösterir,
   gerekirse "Alanını biraz genişlettik" notu görünür.
7. Giriş yapmadan `/hosgeldin` → `/giris?redirect_url=%2Fhosgeldin`.
