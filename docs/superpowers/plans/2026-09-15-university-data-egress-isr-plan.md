# Üniversite Verisi Egress Diyeti + ISR — Uygulama Planı

> Durum (2026-09-21): **UYGULANDI** — SEO_AUDIT §20 (2026-09-16). Checkbox'lar ilerlemeyi yansıtmaz; bkz. docs/superpowers/INDEX.md.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soğuk Vercel işçisinde 4,6 MB'lık tam Supabase çekimini kaldırıp sayfa başına yalnızca gereken veriyi çekmek ve halka açık veri sayfalarını 3 saatlik ISR ile hazır sunmak.

**Architecture:** `lib/universities.server.ts` iki çalışma zamanı fonksiyonuna ayrılır (`getUniversitiesDirectory` hafif dizin, `getUniversityById` hedefli tam okul); tüm çağıranlar buna geçer; detay client leaf'leri sunucu verisini korur; `/`, üniversite ve program sayfaları `revalidate = 10800` alır; guard scriptleri yeni sözleşmeyi zorlar.

**Tech Stack:** Next.js 16 App Router (ISR `revalidate`), supabase-js 2.95 (PostgREST `eq` filtreleri), TypeScript, Node guard scriptleri (`scripts/*.mjs`).

**Spec:** `docs/superpowers/specs/2026-09-15-university-data-egress-isr-design.md`

## Global Constraints

- `SERVER_CACHE_TTL_MS = 3 * 60 * 60 * 1000;` satırı bu biçimde kalır (guard regex'i); 1-6 saat dışına çıkılmaz.
- `lib/universities.server.ts` ilk satırı `import { createClient } from "@supabase/supabase-js";` olarak kalır ve `@/types` importları `import type` olur (compose test loader'ı regex ile siler). Bu modül `@/lib/*` import etmez.
- `app/api/universities/route.ts` `force-dynamic` ve `Cache-Control: no-store, max-age=0` korur; `lib/useUniversitiesData.ts` `cache: "no-store"` korur.
- Tarayıcıya giden veride ağır kabul metinleri bulunmaz; kabul paneli yalnızca sunucudan gelen tam veriyle çalışır.
- Görünür UI değişmez; metin/animasyon/tasarım dokunulmaz.
- Her görev sonunda `npm run check:university-data-source && npm run check:seo-vitals && node scripts/check-universities-server-compose.mjs` yeşil olmalı (Task 1'den sonra kırmızıdan yeşile).
- Commit mesajları İngilizce, `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` ile biter. Push yalnızca Kerem'in "gönder" onayıyla.

---

### Task 1: Guard'ları yeni sözleşmeye göre yaz (önce kırmızı)

**Files:**
- Modify: `scripts/check-university-data-source.mjs` (egress guard bölümünün altına)
- Modify: `scripts/check-seo-vitals.mjs` (RouteTransition bloğunun altına)
- Modify: `scripts/check-universities-server-compose.mjs` (mevcut assert'lerin altına)

**Interfaces:**
- Produces: guard'ların beklediği isimler — `getUniversitiesDirectory`, `getUniversityById`, `.select("department_id")`, `.eq("university_id"`, `fetchWhenInitial`, `hasAdmissionDetails`, `export const revalidate = 10800`.

- [ ] **Step 1: check-university-data-source.mjs'e yeni kuralları ekle** (dosyanın `if (failures.length > 0)` bloğundan önce):

```js
// Egress diyeti (2026-09-15): tam veri seti compose'u runtime'dan kaldirildi.
if (/export async function getUniversitiesData\b/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must not export the full-dataset getUniversitiesData (4.6 MB per cold instance)");
}
if (!/export async function getUniversitiesDirectory\b/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must export getUniversitiesDirectory (light directory: no heavy admission text)");
}
if (!/export async function getUniversityById\b/.test(universitiesServerData)) {
  fail("lib/universities.server.ts must export getUniversityById (targeted per-university fetch)");
}
if (!universitiesServerData.includes('.select("department_id")')) {
  fail("lib/universities.server.ts directory must fetch admission presence with select(\"department_id\") only");
}
if (!universitiesServerData.includes('.eq("university_id", ')) {
  fail("lib/universities.server.ts getUniversityById must filter departments/admission rows with eq(\"university_id\", …)");
}

const directorySurfaces = [
  "app/page.tsx",
  "app/universities/page.tsx",
  "app/cities/page.tsx",
  "app/sitemap.ts",
  "app/api/universities/route.ts",
  "app/api/chat/route.ts",
];
for (const path of directorySurfaces) {
  const source = read(path);
  if (!source.includes("getUniversitiesDirectory(")) fail(`${path} must read university data via getUniversitiesDirectory()`);
  if (source.includes("getUniversitiesData(")) fail(`${path} must not call the removed full-dataset getUniversitiesData()`);
}

const targetedSurfaces = [
  "app/universities/[id]/page.tsx",
  "app/universities/[id]/layout.tsx",
  "app/universities/[id]/departments/[deptSlug]/page.tsx",
  "app/universities/[id]/departments/[deptSlug]/layout.tsx",
];
for (const path of targetedSurfaces) {
  const source = read(path);
  if (!source.includes("getUniversityById(")) fail(`${path} must read its university via getUniversityById()`);
  if (source.includes("getUniversitiesDirectory(") || source.includes("getUniversitiesData(")) {
    fail(`${path} must not load the whole directory for one university`);
  }
}

if (!universitiesDataHook.includes("fetchWhenInitial")) {
  fail("lib/useUniversitiesData.ts must support the fetchWhenInitial option (detail pages keep server data)");
}
for (const path of [
  "components/university-details/UniversityDetailClient.tsx",
  "components/university-details/DepartmentDetailClient.tsx",
]) {
  if (!read(path).includes("fetchWhenInitial: false")) {
    fail(`${path} must call useUniversitiesData with { fetchWhenInitial: false } so the light directory never overrides server data`);
  }
}
```

- [ ] **Step 2: check-seo-vitals.mjs'e ISR kurallarını ekle** (`const css = …` satırından önce):

```js
// ISR (2026-09-15): halka acik veri sayfalari Vercel'in paylasimli onbelleginden sunulur.
const isrPages = [
  "app/page.tsx",
  "app/universities/[id]/page.tsx",
  "app/universities/[id]/departments/[deptSlug]/page.tsx",
];
for (const file of isrPages) {
  const source = readFileSync(file, "utf8");
  const match = source.match(/export const revalidate = (\d+);/);
  if (!match) {
    failures.push(`${file}: 'export const revalidate = <saniye>;' eksik (ISR olmadan soguk sunucu gecikmesi geri gelir)`);
  } else if (Number(match[1]) < 3600 || Number(match[1]) > 21600) {
    failures.push(`${file}: revalidate 3600-21600 saniye araliginda olmali`);
  }
  if (source.includes("force-dynamic")) failures.push(`${file}: force-dynamic ISR ile celisir`);
  if (source.includes("searchParams")) failures.push(`${file}: sunucu tarafinda searchParams okumak sayfayi dinamige dusurur (ISR iptal)`);
}
```

- [ ] **Step 3: check-universities-server-compose.mjs'e varlık testlerini ekle** (mevcut assert'lerin sonuna):

```js
// hasAdmissionDetails: detayli compose'da true, yalniz-varlik compose'unda true ama admissionDetails yok,
// hicbiri yoksa false.
assert.equal(universities[0].departments[0].hasAdmissionDetails, true);

const directory = composeUniversitiesFromSupabaseRows(
  [{ id: 1, name: "U", city: "Bologna", type: "Public", fee: "", image: "", description: "d", description_en: null, website: "", features: [], features_en: null, sort_order: 1 }],
  [
    { id: 10, university_id: 1, name: "With dossier", slug: "with-dossier", languages: ["en"], duration_years: 3, level: "bachelor", sort_order: 1 },
    { id: 11, university_id: 1, name: "Without", slug: "without", languages: ["en"], duration_years: 3, level: "bachelor", sort_order: 2 },
  ],
  [],
  new Set([10])
);
assert.equal(directory[0].departments[0].hasAdmissionDetails, true);
assert.equal(directory[0].departments[0].admissionDetails, undefined);
assert.equal(directory[0].departments[1].hasAdmissionDetails, false);
```

- [ ] **Step 4: Kırmızı olduğunu gör**

Run: `npm run check:university-data-source; npm run check:seo-vitals; node scripts/check-universities-server-compose.mjs`
Expected: üçü de FAIL (fonksiyonlar/bayrak/revalidate henüz yok).

- [ ] **Step 5: Commit**

```bash
git add scripts/check-university-data-source.mjs scripts/check-seo-vitals.mjs scripts/check-universities-server-compose.mjs
git commit -m "test(guards): encode egress diet + ISR contract (red)"
```

### Task 2: Tip + varlık yardımcısı

**Files:**
- Modify: `types/universities.ts` (`Department` arayüzü)
- Create: `lib/admissionPresence.ts`
- Modify: `lib/hub/recommendations.ts:345`, `components/university-details/ProgramTransitionEntry.tsx:58,71`

**Interfaces:**
- Produces: `Department.hasAdmissionDetails?: boolean`; `hasAdmissionDossier(department: Pick<Department, "admissionDetails" | "hasAdmissionDetails">): boolean`.

- [ ] **Step 1: Tipi genişlet** — `Department` içine `admissionDetails?: ProgramAdmissionDetails;` satırının altına:

```ts
  /** Dizin (hafif) verisinde admissionDetails tasinmaz; kabul dosyasi var mi bilgisi bu bayrakla gelir. */
  hasAdmissionDetails?: boolean;
```

- [ ] **Step 2: Yardımcıyı yaz** — `lib/admissionPresence.ts`:

```ts
import type { Department } from "@/types/universities";

// Kabul dosyasi varligi: detay sayfasinda tam admissionDetails, dizin verisinde yalnizca bayrak gelir.
export function hasAdmissionDossier(
  department: Pick<Department, "admissionDetails" | "hasAdmissionDetails">
): boolean {
  return Boolean(department.admissionDetails) || department.hasAdmissionDetails === true;
}
```

- [ ] **Step 3: İki kullanım yerini yardımcıya geçir** — `recommendations.ts` içinde `if (department.admissionDetails) {` → `if (hasAdmissionDossier(department)) {` (import ekle); `ProgramTransitionEntry.tsx` içinde `department.admissionDetails ? undefined : …` ve `{department.admissionDetails ? (` → `hasAdmissionDossier(department)` (import ekle).

- [ ] **Step 4: Tip kontrolü** — Run: `npx tsc --noEmit -p tsconfig.json` Expected: hata yok.

- [ ] **Step 5: Commit** — `git commit -m "feat(data): hasAdmissionDetails flag + hasAdmissionDossier helper"`

### Task 3: Sunucu veri katmanı (dizin + hedefli okul)

**Files:**
- Modify: `lib/universities.server.ts` (fetch helper'ları, memo, export'lar)

**Interfaces:**
- Produces: `getUniversitiesDirectory(): Promise<University[]>`, `getUniversityById(id: string | number): Promise<University | undefined>`, `composeUniversitiesFromSupabaseRows(universityRows, departmentRows, admissionDetailRows = [], admissionPresenceDepartmentIds?: Set<number>)`.

- [ ] **Step 1: fetch helper'larına filtre parametresi ekle**

```ts
async function fetchUniversityRows(universityId?: number): Promise<SupabaseUniversityRow[]> {
  // ... mevcut dongu; query zincirine .range'den once:
  //   if (universityId !== undefined) query = query.eq("id", universityId);
}
async function fetchUniversityDepartmentRows(universityId?: number) { /* .eq("university_id", universityId) */ }
async function fetchProgramAdmissionDetailRows(universityId?: number) { /* .eq("university_id", universityId) */ }
async function fetchAdmissionPresenceDepartmentIds(): Promise<Set<number>> {
  // .from("program_admission_details").select("department_id").range(from, to) sayfali; Set doner
}
```

Not: supabase-js zincirinde `let query = supabase.from(...).select(...).order(...)` yazip filtreyi kosullu ekle; `.range(from, to).returns<…>()` en sonda.

- [ ] **Step 2: compose'a varlık parametresi ekle**

```ts
export function composeUniversitiesFromSupabaseRows(
  universityRows, departmentRows, admissionDetailRows = [], admissionPresenceDepartmentIds?: Set<number>
): University[] {
  // detailsByDepartmentId aynen; department olustururken:
  const admissionDetails = typeof row.id === "number" ? detailsByDepartmentId.get(row.id) : undefined;
  const hasAdmissionDetails =
    Boolean(admissionDetails) ||
    (typeof row.id === "number" && admissionPresenceDepartmentIds?.has(row.id) === true);
  const enrichedDepartment: Department = admissionDetails
    ? { ...department, admissionDetails, hasAdmissionDetails }
    : { ...department, hasAdmissionDetails };
}
```

- [ ] **Step 3: Memo yapısını iki memoya ayır ve export'ları değiştir**

```ts
type MemoEntry<T> = { data: T; expiresAt: number };
let directoryCache: MemoEntry<University[]> | null = null;
let directoryInFlight: Promise<University[]> | null = null;
const universityCache = new Map<string, MemoEntry<University | undefined>>();
const universityInFlight = new Map<string, Promise<University | undefined>>();

export async function getUniversitiesDirectory(): Promise<University[]> {
  // memo hit -> data; single-flight refresh: Promise.all([fetchUniversityRows(), fetchUniversityDepartmentRows(), fetchAdmissionPresenceDepartmentIds()])
  // compose(…, [], presence); catch -> directoryCache varsa console.error("University directory fetch failed; serving stale cached data:", error) ve bayat veri; yoksa throw
}

export async function getUniversityById(id: string | number): Promise<University | undefined> {
  const key = String(id); const numericId = Number(key);
  if (!Number.isInteger(numericId)) return undefined;
  // memo hit; single-flight per key: Promise.all([fetchUniversityRows(numericId), fetchUniversityDepartmentRows(numericId), fetchProgramAdmissionDetailRows(numericId)])
  // compose(...)[0]; catch -> universityCache.get(key) varsa console.error("University fetch failed; serving stale cached data:", error) ve bayat; yoksa throw
}
```

`getUniversitiesData` tamamen silinir. Dosya başı yorumuna yeni politika yazılır (dizin ~47 KB, okul 90-180 KB, tam çekim yasak).

- [ ] **Step 4: Testler** — Run: `node scripts/check-universities-server-compose.mjs` Expected: PASS. `npx tsc --noEmit` çağıran dosyalar henüz `getUniversitiesData` kullandığı için hata verir; Task 4'te düzelir.

- [ ] **Step 5: Commit** — `git commit -m "feat(data): directory + targeted university fetch, drop full compose"`

### Task 4: Çağıranları dizine geçir + ISR

**Files:**
- Modify: `app/page.tsx`, `app/universities/page.tsx`, `app/cities/page.tsx`, `app/sitemap.ts`, `app/api/universities/route.ts`, `app/api/chat/route.ts`
- Modify: `app/universities/[id]/page.tsx`, `app/universities/[id]/departments/[deptSlug]/page.tsx`
- Modify: `components/university-details/UniversityDetailClient.tsx` (`cameFromList` client-side)

- [ ] **Step 1: İmport ve çağrıları değiştir** — altı dosyada `getUniversitiesData` → `getUniversitiesDirectory` (import + çağrı; `Awaited<ReturnType<typeof getUniversitiesData>>` tipleri de). `app/page.tsx`'te `export const dynamic = "force-dynamic";` satırını sil, yerine:

```ts
// ISR: ana sayfa 3 saat Vercel onbelleginden sunulur; istatistikler dizinden gelir (SEO_AUDIT.md §20).
export const revalidate = 10800;
```

- [ ] **Step 2: Detay sayfalarına ISR** — iki `page.tsx`'in import bloğu altına `export const revalidate = 10800;` (aynı yorumla). `[id]/page.tsx`'te `searchParams` prop'unu, `SearchParamValue`, `getSingleParam` ve `resolvedSearchParams`'ı kaldır; `cameFromList` prop'unu client'a geçirme.

- [ ] **Step 3: cameFromList'i client'a taşı** — `UniversityDetailClient.tsx`: prop'u kaldır; leaf içinde

```ts
const [cameFromList, setCameFromList] = useState(false);
useEffect(() => {
  setCameFromList(new URLSearchParams(window.location.search).get("from") === "list");
}, []);
```

Mevcut `if (cameFromList && window.history.length > 1)` mantığı aynen kalır.

- [ ] **Step 4: Doğrula** — Run: `npx tsc --noEmit && npm run check:university-data-source && npm run check:seo-vitals` Expected: tsc temiz; data-source guard yalnızca `fetchWhenInitial` maddelerinde FAIL (Task 5); seo-vitals PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(pages): read light directory, ISR on home and detail pages"`

### Task 5: Tarayıcı hook'u ve detay leaf'leri

**Files:**
- Modify: `lib/useUniversitiesData.ts`
- Modify: `components/university-details/UniversityDetailClient.tsx`, `components/university-details/DepartmentDetailClient.tsx`

- [ ] **Step 1: Hook'a seçenek ekle**

```ts
type UseUniversitiesDataOptions = {
  /** false: sunucudan gelen tam veri varken dizin cekilmez ve modul onbellegi (hafif kopya) tam veriyi ezmez. */
  fetchWhenInitial?: boolean;
};

export function useUniversitiesData(
  initialUniversities?: University[],
  { fetchWhenInitial = true }: UseUniversitiesDataOptions = {}
) {
  const hasInitialUniversities = Boolean(initialUniversities?.length);
  const keepInitial = hasInitialUniversities && !fetchWhenInitial;
  const [universities, setUniversities] = useState<University[]>(() =>
    keepInitial ? (initialUniversities as University[]) : universitiesCache ?? initialUniversities ?? []
  );
  const [loading, setLoading] = useState(!keepInitial && !universitiesCache && !hasInitialUniversities);
  // useEffect: if (keepInitial || universitiesCache) return; ... (mevcut fetch)
}
```

- [ ] **Step 2: Leaf'leri güncelle** — iki dosyada `useUniversitiesData(initialUniversity ? [initialUniversity] : undefined)` → `useUniversitiesData(initialUniversity ? [initialUniversity] : undefined, { fetchWhenInitial: false })`; `useMemo` içinde `initialUniversity ?? universities.find(...)` sırası.

- [ ] **Step 3: Doğrula** — Run: `npx tsc --noEmit && npm run check:university-data-source && npm run check:seo-vitals && node scripts/check-universities-server-compose.mjs` Expected: hepsi PASS.

- [ ] **Step 4: Commit** — `git commit -m "feat(client): keep server university data on detail pages"`

### Task 6: Tam doğrulama (guard'lar, lint, build, yerel canlı test)

- [ ] **Step 1:** `npm run lint && npm run check:routes && npm run check:universities-ui && npm run check:university-details-ui && npm run check:admission-dossier && npm run check:hub-onboarding && npm run check:editorial-ui && npm run check:home-consultation` → hepsi PASS.
- [ ] **Step 2:** `npm run build` → rota tablosunda `/`, `/universities/[id]`, `/universities/[id]/departments/[deptSlug]` ISR (3h) işaretli; `/universities`, `/cities` ƒ.
- [ ] **Step 3:** Yerel üretim sunucusu (`italypath-prod` preview) ile `/universities/9/departments/digital-and-public-humanities` ve `/universities` açılır; tarayıcı panelinde kabul dosyası paneli (başvuru takvimi, kabul koşulları) hidrasyon sonrası görünür; Supabase edge loglarında hedefli istekler (`university_id=eq.9`, küçük content-range) ve `select=department_id` görünür.
- [ ] **Step 4:** Commit yoksa yeni commit gerekmez; `git status` temiz (senin dosyaların dışında).

### Task 7: Belgeler

**Files:**
- Modify: `AGENT_CONTEXT.md` (Veri katmanı bölümü, API kuralı, komutlar değişmez), `SEO_AUDIT.md` (§20)

- [ ] **Step 1:** `AGENT_CONTEXT.md` "Canli university/program verisi" ve "API ve cache kurali" bölümlerini yeni fonksiyonlar, memo politikası, ISR ve egress rakamlarıyla güncelle; `getUniversitiesData()` ifadelerini `getUniversitiesDirectory()`/`getUniversityById()` olarak değiştir.
- [ ] **Step 2:** `SEO_AUDIT.md` sonuna "## 20. Egress diyeti ve ISR — 15 Eylül 2026" ekle: teşhis (log sayımı, boyutlar), uygulanan tasarım, yerel doğrulama; deploy sonrası ölçümler için alt başlık (deploy sonrası doldurulur).
- [ ] **Step 3:** Commit — `git commit -m "docs: record egress diet + ISR design and verification"`

### Task 8: Deploy ve deploy sonrası doğrulama (Kerem onayı ile)

- [ ] **Step 1:** Kerem "gönder" dedikten sonra `git push origin main`; deploy canlıya düşene kadar production CSS/HTML izle.
- [ ] **Step 2:** Program sayfasına iki istek: ikincide `x-vercel-cache: HIT`; `/` için aynı.
- [ ] **Step 3:** Devtools throttling ile production `/`, `/universities`, program sayfası: doküman gövdesi bitişi ve FCP/LCP; `SEO_AUDIT.md` §20'ye tablo.
- [ ] **Step 4:** Ertesi gün Supabase log sayımı (istek/gün, content-range) ve Usage ekranı; §20'ye ekle. Kerem'e Free plan kararı için rakam ver.
