# SAT Soru Metni İyileştirme (Slim) — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Canlı SAT bankasındaki erişilebilirlik-metni bozulması taşıyan ~160-220 soruyu önce kullanıcı görünümünden gizlemek, sonra resmî kaynak görüntülerinden doğrulanmış şekilde düzeltip güvenli (compare-and-swap + yedekli) bir patch akışıyla canlıya işlemek; bu sırada sağlam ~800 soruya kesinlikle dokunmamak.

**Architecture:** Üç katman: (1) deterministik audit + tam canlı yedek, (2) yalnız `prompt/choices/needs_review` alanlarını değiştirebilen, eski-değer-birebir-eşleşme şartlı patch aracı, (3) görüntüden yeniden yazım + kör-çözücü doğrulama + KaTeX/marker kapılarından oluşan içerik hattı. Eski toplu importer insert-only kilitlenir; düzeltmeler yerel shard'lara da senkronlanır.

**Tech Stack:** Node .mjs scriptleri (mevcut `scripts/sat/` desenleri), `@supabase/supabase-js` service-role, `katex` (Node tarafında parse kontrolü), Next.js server katmanı (`lib/sat/questions.server.ts`).

**Spec:** `docs/superpowers/specs/2026-08-28-sat-question-remediation-design.md` — bu plan o spec'in **bilinçli sadeleştirilmiş** uygulamasıdır. Aşağıdaki "Kapsam Dışı" bölümü spec'ten atılan parçaları açıkça listeler; uygulayıcılar bu parçaları "eksik" sanıp eklemesin.

## Global Constraints

- Supabase projesi pinlidir: `EXPECTED_PROJECT_REF = "kskbnxxyviowmrlskwke"`, `EXPECTED_PROJECT_URL = "https://kskbnxxyviowmrlskwke.supabase.co"` (mevcut export: `scripts/sat/lib/authored-explanations-import.mjs` — yeniden tanımlama, import et).
- Canlı `sat_questions` üzerinde yazılabilir alanlar SADECE `prompt`, `choices`, `needs_review`. `correct_answer`, `id`, section/domain/skill metadata, `source_file`, `figure_path`, `explanation_*`, `created_at` bu operasyonda ASLA değişmez.
- Her canlı yazma öncesi: dry-run + `wx` bayraklı (var olanı ezmeyen) yerel yedek. Her yazma sonrası: geri-okuma doğrulaması + non-target hash kontrolü. Uyuşmazlıkta kısmî devam yok.
- SAT soru içeriği (prompt/şık/yedek/paket) Git'e commit edilmez; hepsi `tmp/sat-bank/` altında kalır (gitignore'lu). Commit edilenler yalnız scriptler, tipler ve dokümanlardır.
- MathText veri sözleşmesi: matematik `$...$` içinde KaTeX-uyumlu LaTeX; para işareti `\$` ile kaçışlı; MCQ'da dört dolu şık, SPR'da `choices: null`.
- `.env.local` içindeki `SUPABASE_SERVICE_ROLE_KEY` yalnız script/server tarafında kullanılır; hiçbir `NEXT_PUBLIC_*` değişkenine veya client koduna girmez.
- Node scriptleri mevcut desenleri izler: env yükleme `loadEnvLocal` deseni, sayfalı fetch `PAGE_SIZE=500-1000`, `order("id")`.
- UI metni değişikliği yok; tek runtime değişikliği `needs_review` filtresidir.

## Kapsam Dışı (spec'ten bilinçli atılanlar — EKLEME)

- DB içi audit tabloları, `private` şema, patch RPC'leri, `sat_patch_executor`/`sat_attempt_guard` rolleri, `SECURITY DEFINER` fonksiyonlar → yerine dosya yedeği + script içi compare-and-swap.
- `sat_attempts` trigger'ı, protected attempt route'u, attempt insert yetki değişikliği → attempt akışı olduğu gibi kalır.
- `sat-figures` bucket'ının private yapılması ve figure proxy route'u.
- `contentRevision` tablosu, 60 sn'lik lease, client cache invalidation sistemi → karantina yayılımı için deploy sonrası 3 saatlik memo TTL üst sınırı ve redeploy ile memo sıfırlama yeterli kabul edilir. Açık tarayıcı oturumlarının sayfa yenilenene kadar eski soruyu göstermeye devam etmesi KABUL EDİLEN sınırlamadır.
- 1.019 sorunun tamamının tek tek insan-incelemesi ve `full-review-ledger` → yalnız audit adayları düzeltilir; marker taşımayan ~800 soru "düşük risk" olarak olduğu gibi kalır.
- SHA256SUMS paket seremonisi, Git-dışı kalıcı arşiv zorunluluğu → `tmp/sat-bank/remediation/<run>/` klasörü ve paket içi `package_sha256` yeterlidir.

## Model / Rol Ataması

- Planlama + final denetim: Fable (ana oturum, Kerem ile).
- Task 1-9 uygulaması: Opus 5 agent'ları (Kerem görev görev dağıtır veya subagent-driven).
- Task 7-8'de **yazıcı (writer)** ve **kör çözücü (solver)** AYRI agent bağlamlarıdır. Solver'a asla görüntü, resmî cevap veya eski bozuk metin verilmez; yalnız yeni yazılmış soru metni verilir.

## Dosya Haritası

- Create: `scripts/sat/lib/content-audit.mjs` — marker/KaTeX saf fonksiyonları (audit + gate ortak kullanır)
- Create: `scripts/sat/audit-sat-content.mjs` — canlı yedek + deterministik audit (Task 1)
- Create: `scripts/sat/test-content-audit.mjs` — marker/KaTeX unit testleri (Task 1)
- Create: `scripts/sat/lib/question-patch.mjs` — paket doğrulama/diff saf fonksiyonları (Task 2)
- Create: `scripts/sat/patch-sat-questions.mjs` — dry-run/apply/rollback patch aracı (Task 2)
- Create: `scripts/sat/test-question-patch.mjs` — paket/diff unit testleri (Task 2)
- Modify: `lib/sat/questions.server.ts` — karantina filtresi (Task 3)
- Modify: `scripts/check-sat-bank.mjs` — filtre + kilit guard'ları (Task 3, 5)
- Create: `scripts/sat/build-quarantine-package.mjs` — bayrak paketi üretici (Task 4)
- Modify: `scripts/sat/import-bank.mjs` — insert-only kilit (Task 5)
- Create: `scripts/sat/gate-remediation-drafts.mjs` — taslak kapıları (Task 6)
- Create: `scripts/sat/build-remediation-package.mjs` — düzeltme paketi üretici (Task 6)
- Create: `scripts/sat/apply-patch-to-local.mjs` — shard + bank.json senkronu (Task 7)
- Modify: `package.json` — `sat:audit`, `sat:patch`, `test:sat-patch`, `test:sat-audit` scriptleri

---

### Task 1: Audit + canlı yedek aracı

**Files:**
- Create: `scripts/sat/lib/content-audit.mjs`
- Create: `scripts/sat/audit-sat-content.mjs`
- Create: `scripts/sat/test-content-audit.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `findMarkers(text) -> [{family, match}]`, `katexIssues(text) -> [{tex, message}]`, `mathSegments(text) -> string[]`, `MARKER_FAMILIES` (content-audit.mjs'ten export; Task 6 gate bunları import eder).
- Produces (dosya çıktıları, Task 4/6/8 girdileri):
  - `tmp/sat-bank/remediation/<run>/live-backup.json` → `{ fetched_at, project_ref, rows: [tam kolonlu satırlar] }`
  - `tmp/sat-bank/remediation/<run>/audit-report.json` → sayımlar
  - `tmp/sat-bank/remediation/<run>/candidate-ids.json` → `{ candidates: [{id, section, skill_slug, difficulty, question_type, reasons: [family|katex-parse|unbalanced-dollar]}] }`

- [ ] **Step 1: Ortak saf kütüphaneyi yaz**

`scripts/sat/lib/content-audit.mjs`:

```js
import katex from "katex";

const ESCAPED_DOLLAR = "\u0000";

// components/sat/MathText.tsx ile birebir ayni segmentasyon sozlesmesi.
export function mathSegments(text) {
  return String(text)
    .replaceAll("\\$", ESCAPED_DOLLAR)
    .split(/(\$[^$]+\$)/g)
    .filter((seg) => seg.startsWith("$") && seg.endsWith("$") && seg.length > 2)
    .map((seg) => seg.slice(1, -1).replaceAll(ESCAPED_DOLLAR, "\\$"));
}

// Govde genelinde guvenli (dogal Ingilizceyle karismayan) marker aileleri.
export const MARKER_FAMILIES = [
  { family: "comma", re: /[0-9a-z)\]] ?comma ?[0-9a-z(\[-]/i },
  { family: "close-glued", re: /close ?[()]|\) ?close|[0-9] ?close\b|close ?(squared|cubed|comma)/i },
  { family: "fraction-speech", re: /fraction ?with ?numerator|anddenominator|endfraction|thefraction/i },
  { family: "function-speech", re: /\bfofx\b|\bgofx\b|\bhofx\b|\bpofc\b/i },
  { family: "power-speech", re: /raised ?to ?the|the ?power ?of|endpower|power ?close|(?<!per\s+second\s*)\bsquared\b|\bcubed\b/i },
  { family: "root-speech", re: /square ?root ?of|cube ?root ?of|endroot|startroot/i },
  { family: "subscript-speech", re: /endsubscript|startsubscript/i },
  { family: "xml-residue", re: /<\/?m[a-z]+[^>]*>|xmlns/i },
  { family: "bad-latex", re: /\\times[a-z]|\\pir\b|\\neqb\b|\\leftbracket|\\rightbracket/i },
];

// $...$ icinde LaTeX komutlari ve \text{...} govdesi ayiklandiktan sonra kalan
// 4+ harfli kelime, konusma-metni artigidir (degiskenler 1-2 harf, "and" 3 harf).
export function mathWordResidue(text) {
  const hits = [];
  for (const tex of mathSegments(text)) {
    const stripped = tex
      .replace(/\\(text|textbf|textit|mathrm|operatorname)\s*\{[^}]*\}/g, " ")
      .replace(/\\[a-zA-Z]+/g, " ");
    for (const word of stripped.match(/[a-zA-Z]{4,}/g) ?? []) {
      hits.push({ family: "math-word", match: word });
    }
  }
  return hits;
}

export function findMarkers(text) {
  const value = String(text ?? "");
  const hits = [];
  for (const { family, re } of MARKER_FAMILIES) {
    const match = value.match(re);
    if (match) hits.push({ family, match: match[0] });
  }
  hits.push(...mathWordResidue(value));
  return hits;
}

export function katexIssues(text) {
  const issues = [];
  for (const tex of mathSegments(text)) {
    try {
      katex.renderToString(tex, { throwOnError: true });
    } catch (error) {
      issues.push({ tex, message: String(error?.message ?? error) });
    }
  }
  return issues;
}

export function hasUnbalancedDollar(text) {
  return (((String(text ?? "").replaceAll("\\$", "").match(/\$/g)) ?? []).length % 2) !== 0;
}

export function questionTexts(row) {
  return [row.prompt, ...(row.choices ? Object.values(row.choices) : [])].map((t) => String(t ?? ""));
}

export function auditRow(row) {
  const reasons = new Set();
  for (const text of questionTexts(row)) {
    for (const hit of findMarkers(text)) reasons.add(hit.family);
    if (katexIssues(text).length > 0) reasons.add("katex-parse");
    if (hasUnbalancedDollar(text)) reasons.add("unbalanced-dollar");
  }
  return [...reasons];
}
```

- [ ] **Step 2: Unit testini yaz ve çalıştır**

`scripts/sat/test-content-audit.mjs`:

```js
import assert from "node:assert/strict";
import { auditRow, findMarkers, katexIssues, mathWordResidue } from "./lib/content-audit.mjs";

// Gercek pozitifler (canli bozuk kayitlardan alinan desenler)
assert.ok(findMarkers("$(x + 2 close ( \\times (x + 3 close ($").length > 0, "close-glued yakalanmali");
assert.ok(findMarkers("$2comma3$ and $-2comma3$").length > 0, "comma yakalanmali");
assert.ok(findMarkers("$t = the fraction with numerator v anddenominator 331.3$").length > 0, "fraction yakalanmali");
assert.ok(findMarkers("$y = (x - 1 close ( squared$").length > 0, "squared yakalanmali");
assert.ok(findMarkers("v = 331.3 + 0.606\\timest").some((h) => h.family === "bad-latex"), "\\timest yakalanmali");
assert.ok(mathWordResidue("$1andy=3$").length > 0, "math ici kelime artigi yakalanmali");

// Dogal Ingilizce false-positive olmamali
assert.equal(findMarkers("Which value is closest to the mean?").length, 0, "closest temiz");
assert.equal(findMarkers("The object accelerates at 5 meters per second squared.").length, 0, "per second squared temiz");
assert.equal(findMarkers("How close is the estimate to the actual value?").length, 0, "duz close temiz");
assert.equal(mathWordResidue("$55\\text{centimeters}\\left(\\text{cm}\\right)$").length, 0, "\\text govdesi temiz");
assert.equal(mathWordResidue("$45\\pi$").length, 0, "komutlar temiz");

// KaTeX kontrolu
assert.equal(katexIssues("A cylinder has volume $45\\pi$.").length, 0, "gecerli LaTeX temiz");
assert.ok(katexIssues("Broken $\\frak{$ math").length + findMarkers("Broken $\\frak{$ math").length > 0, "bozuk LaTeX yakalanmali");

// auditRow butunlesik
assert.deepEqual(auditRow({ prompt: "What is $2+2$?", choices: { A: "$4$", B: "$5$", C: "$6$", D: "$7$" } }), [], "temiz soru bos donmeli");

console.log("test-content-audit PASS");
```

Çalıştır: `node scripts/sat/test-content-audit.mjs`
Beklenen: `test-content-audit PASS` (ilk çalıştırmada lib henüz yoksa FAIL — önce Step 1, sonra bu adım; kırmızı-yeşil sırası için testi Step 1'den önce yazıp fail görmek de kabul).

- [ ] **Step 3: Audit ana scriptini yaz**

`scripts/sat/audit-sat-content.mjs`:

```js
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { EXPECTED_PROJECT_REF, EXPECTED_PROJECT_URL } from "./lib/authored-explanations-import.mjs";
import { auditRow } from "./lib/content-audit.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const OUT_ROOT = path.join(REPO_ROOT, "tmp", "sat-bank");
const ALL_COLUMNS =
  "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,explanation_tr,explanation_en,source_file,needs_review,created_at";
const PAGE_SIZE = 500;

function parseArgs(argv) {
  const options = { run: null, local: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run" && argv[i + 1]) options.run = argv[++i];
    else if (argv[i] === "--local") options.local = true;
    else throw new Error(`Bilinmeyen arguman: ${argv[i]}`);
  }
  if (!options.run) throw new Error("--run <etiket> zorunlu (or. --run quarantine-baseline)");
  return options;
}

function loadEnvLocal() {
  const values = {};
  const envFile = path.join(REPO_ROOT, ".env.local");
  if (!existsSync(envFile)) return values;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return values;
}

async function fetchAllLive() {
  const env = { ...loadEnvLocal(), ...process.env };
  if (env.NEXT_PUBLIC_SUPABASE_URL !== EXPECTED_PROJECT_URL) {
    throw new Error("Beklenmeyen Supabase projesi; islem reddedildi.");
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY gerekli.");
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("sat_questions").select(ALL_COLUMNS).order("id").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`sat_questions fetch hatasi: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

function loadLocalBank() {
  const { bank } = JSON.parse(readFileSync(path.join(OUT_ROOT, "bank.json"), "utf8"));
  return bank;
}

const options = parseArgs(process.argv.slice(2));
const rows = options.local ? loadLocalBank() : await fetchAllLive();
const runDir = path.join(OUT_ROOT, "remediation", options.run);
mkdirSync(runDir, { recursive: true });

const candidates = [];
const familyCounts = {};
const skillCounts = {};
for (const row of rows) {
  const reasons = auditRow(row);
  if (reasons.length === 0) continue;
  candidates.push({
    id: row.id, section: row.section, skill_slug: row.skill_slug,
    difficulty: row.difficulty, question_type: row.question_type, reasons,
  });
  for (const reason of reasons) familyCounts[reason] = (familyCounts[reason] ?? 0) + 1;
  const key = `${row.section}/${row.skill_slug}`;
  skillCounts[key] = (skillCounts[key] ?? 0) + 1;
}

// Canli modda: tam yedek + yerel bank.json ile fark sayimi
let localDiff = null;
if (!options.local) {
  writeFileSync(
    path.join(runDir, "live-backup.json"),
    JSON.stringify({ fetched_at: new Date().toISOString(), project_ref: EXPECTED_PROJECT_REF, rows }, null, 2) + "\n",
    { flag: "wx", mode: 0o600 }
  );
  if (existsSync(path.join(OUT_ROOT, "bank.json"))) {
    const localById = new Map(loadLocalBank().map((q) => [q.id, q]));
    const compared = ["prompt", "question_type", "needs_review"];
    localDiff = { missing_local: 0, field_diff: 0 };
    for (const row of rows) {
      const local = localById.get(row.id);
      if (!local) { localDiff.missing_local += 1; continue; }
      const choicesEqual = JSON.stringify(local.choices ?? null) === JSON.stringify(row.choices ?? null);
      if (!choicesEqual || compared.some((f) => (local[f] ?? null) !== (row[f] ?? null))) localDiff.field_diff += 1;
    }
  }
}

const report = {
  run: options.run, mode: options.local ? "local" : "live", generated_at: new Date().toISOString(),
  total_rows: rows.length, candidate_count: candidates.length,
  flagged_needs_review: rows.filter((r) => r.needs_review).length,
  family_counts: familyCounts, skill_counts: skillCounts, local_vs_live: localDiff,
};
writeFileSync(path.join(runDir, "audit-report.json"), JSON.stringify(report, null, 2) + "\n");
writeFileSync(path.join(runDir, "candidate-ids.json"), JSON.stringify({ candidates }, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
```

- [ ] **Step 4: package.json scriptlerini ekle**

`package.json` scripts bölümüne (mevcutları bozmadan) ekle:

```json
"sat:audit": "node scripts/sat/audit-sat-content.mjs",
"test:sat-audit": "node scripts/sat/test-content-audit.mjs"
```

- [ ] **Step 5: Yerel modda uçtan uca doğrula**

Çalıştır: `npm run test:sat-audit && npm run sat:audit -- --run smoke-local --local`
Beklenen: test PASS; audit raporunda `total_rows: 1019`, `candidate_count` 150-230 aralığında (mevcut ölçüm ~160; `math-word` ailesi sayıyı bir miktar artırabilir), `family_counts` içinde `comma`, `close-glued`, `fraction-speech` dolu. `candidate_count` 300'ü aşarsa yeni false-positive var demektir: `candidate-ids.json`'dan 10 örnek oku, temiz soru yakalayan aileyi daralt, testi güncelle.

- [ ] **Step 6: Commit**

```bash
git add scripts/sat/lib/content-audit.mjs scripts/sat/audit-sat-content.mjs scripts/sat/test-content-audit.mjs package.json
git commit -m "feat(sat): add content audit tool with live backup"
```

---

### Task 2: Güvenli patch aracı (dry-run / apply / rollback)

**Files:**
- Create: `scripts/sat/lib/question-patch.mjs`
- Create: `scripts/sat/patch-sat-questions.mjs`
- Create: `scripts/sat/test-question-patch.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `EXPECTED_PROJECT_URL/REF`, `sha256`, `hashRows` (`scripts/sat/lib/authored-explanations-import.mjs`'ten import).
- Produces: Paket şeması (Task 4/6 üreticileri bu şemayı yazar):

```json
{
  "kind": "sat-question-patch",
  "schema_version": 1,
  "project_ref": "kskbnxxyviowmrlskwke",
  "run_label": "quarantine-2026-08-28",
  "records": [
    {
      "id": "1a2b3c4d",
      "expected_before": {
        "prompt": "...canli mevcut metin...",
        "choices": { "A": "...", "B": "...", "C": "...", "D": "..." },
        "needs_review": false,
        "correct_answer": ["A"]
      },
      "after": { "prompt": "...", "choices": { "A": "...", "B": "...", "C": "...", "D": "..." }, "needs_review": true }
    }
  ]
}
```

- Produces (fonksiyonlar): `validatePackage(pkg)`, `normalizeChoices(choices)`, `rowMatchesExpected(liveRow, expected)`, `changedFields(expected, after)`.
- Kural: `after` TAM OLARAK `prompt`, `choices`, `needs_review` anahtarlarını taşır; `expected_before` bunlara ek `correct_answer` taşır (yalnız koruma karşılaştırması için, asla yazılmaz). SPR sorularında `choices: null`.

- [ ] **Step 1: Saf yardımcıları yaz**

`scripts/sat/lib/question-patch.mjs`:

```js
export const WRITABLE_FIELDS = ["prompt", "choices", "needs_review"];
export const GUARD_FIELDS = [...WRITABLE_FIELDS, "correct_answer"];

export function normalizeChoices(choices) {
  if (choices === null || choices === undefined) return null;
  return { A: String(choices.A ?? ""), B: String(choices.B ?? ""), C: String(choices.C ?? ""), D: String(choices.D ?? "") };
}

function fieldEqual(field, a, b) {
  if (field === "choices") return JSON.stringify(normalizeChoices(a)) === JSON.stringify(normalizeChoices(b));
  if (field === "correct_answer") return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  return (a ?? null) === (b ?? null);
}

export function rowMatchesExpected(liveRow, expected) {
  return GUARD_FIELDS.filter((field) => !fieldEqual(field, liveRow[field], expected[field]));
}

export function changedFields(expected, after) {
  return WRITABLE_FIELDS.filter((field) => !fieldEqual(field, expected[field], after[field]));
}

export function validatePackage(pkg, expectedProjectRef) {
  if (pkg?.kind !== "sat-question-patch" || pkg.schema_version !== 1) throw new Error("Gecersiz paket kind/schema_version.");
  if (pkg.project_ref !== expectedProjectRef) throw new Error("Paket project_ref pinlenen projeyle eslesmiyor.");
  if (typeof pkg.run_label !== "string" || !pkg.run_label) throw new Error("run_label zorunlu.");
  if (!Array.isArray(pkg.records) || pkg.records.length === 0) throw new Error("records bos olamaz.");
  const ids = new Set();
  for (const record of pkg.records) {
    if (typeof record.id !== "string" || !record.id) throw new Error("Kayit id eksik.");
    if (ids.has(record.id)) throw new Error(`Tekrarli id: ${record.id}`);
    ids.add(record.id);
    for (const field of GUARD_FIELDS) {
      if (!(field in (record.expected_before ?? {}))) throw new Error(`${record.id}: expected_before.${field} eksik.`);
    }
    const afterKeys = Object.keys(record.after ?? {}).sort();
    if (afterKeys.join(",") !== [...WRITABLE_FIELDS].sort().join(",")) {
      throw new Error(`${record.id}: after tam olarak ${WRITABLE_FIELDS.join("/")} tasimali (fazla/eksik alan yasak).`);
    }
    if ("correct_answer" in record.after) throw new Error(`${record.id}: correct_answer yazilamaz.`);
    if (typeof record.after.needs_review !== "boolean") throw new Error(`${record.id}: after.needs_review boolean olmali.`);
    if (changedFields(record.expected_before, record.after).length === 0) {
      throw new Error(`${record.id}: expected_before ile after ayni; anlamsiz kayit.`);
    }
  }
  return ids;
}
```

- [ ] **Step 2: Unit testleri yaz ve çalıştır**

`scripts/sat/test-question-patch.mjs`:

```js
import assert from "node:assert/strict";
import { changedFields, normalizeChoices, rowMatchesExpected, validatePackage } from "./lib/question-patch.mjs";

const base = {
  prompt: "old $x$", choices: { A: "1", B: "2", C: "3", D: "4" },
  needs_review: false, correct_answer: ["A"],
};
const record = (over = {}) => ({
  id: "abc12345",
  expected_before: { ...base },
  after: { prompt: "new $x$", choices: { A: "1", B: "2", C: "3", D: "4" }, needs_review: false },
  ...over,
});
const pkg = (records) => ({ kind: "sat-question-patch", schema_version: 1, project_ref: "kskbnxxyviowmrlskwke", run_label: "t", records });

assert.doesNotThrow(() => validatePackage(pkg([record()]), "kskbnxxyviowmrlskwke"), "gecerli paket gecmeli");
assert.throws(() => validatePackage(pkg([record()]), "baska-proje"), /project_ref/, "yanlis proje reddedilmeli");
assert.throws(() => validatePackage(pkg([record(), record()]), "kskbnxxyviowmrlskwke"), /Tekrarli/, "duplicate id reddedilmeli");
assert.throws(
  () => validatePackage(pkg([record({ after: { prompt: "x", choices: null, needs_review: false, correct_answer: ["B"] } })]), "kskbnxxyviowmrlskwke"),
  /tasimali|yazilamaz/, "after'a fazla alan reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([record({ after: { prompt: base.prompt, choices: base.choices, needs_review: false } })]), "kskbnxxyviowmrlskwke"),
  /ayni/, "no-op kayit reddedilmeli"
);

assert.deepEqual(rowMatchesExpected({ ...base }, base), [], "eslesen satir bos donmeli");
assert.deepEqual(rowMatchesExpected({ ...base, correct_answer: ["B"] }, base), ["correct_answer"], "cevap farki yakalanmali");
assert.deepEqual(rowMatchesExpected({ ...base, prompt: "changed" }, base), ["prompt"], "prompt farki yakalanmali");
assert.deepEqual(changedFields(base, { prompt: base.prompt, choices: base.choices, needs_review: true }), ["needs_review"], "flag-only diff dogru");
assert.equal(normalizeChoices(null), null, "spr choices null kalmali");

console.log("test-question-patch PASS");
```

Çalıştır: `node scripts/sat/test-question-patch.mjs` → `test-question-patch PASS`.

- [ ] **Step 3: Patch ana aracını yaz**

`scripts/sat/patch-sat-questions.mjs` — akış sözleşmesi (kod, authored-explanations importer'ının env/fetch desenini aynen izler; `fetchAll`, `loadEnvLocal`, proje pinleme oradan kopyalanabilir):

```js
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { EXPECTED_PROJECT_REF, EXPECTED_PROJECT_URL, hashRows, sha256 } from "./lib/authored-explanations-import.mjs";
import { GUARD_FIELDS, WRITABLE_FIELDS, changedFields, normalizeChoices, rowMatchesExpected, validatePackage } from "./lib/question-patch.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const ALL_COLUMNS =
  "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,explanation_tr,explanation_en,source_file,needs_review,created_at";
const PAGE_SIZE = 500;

// CLI: node scripts/sat/patch-sat-questions.mjs --package <path> [--apply] [--backup <path>]
//      node scripts/sat/patch-sat-questions.mjs --rollback <backupPath> [--apply]
// Varsayilan mod her zaman dry-run'dir; --apply olmadan hicbir yazi olmaz.

function parseArgs(argv) { /* import-authored-explanations.mjs parseArgs deseni; alanlar: package, apply, rollback, backup */ }
function loadEnvLocal() { /* ayni desen */ }
function createServiceClient() { /* EXPECTED_PROJECT_URL pin + service key zorunlu; ayni desen */ }
async function fetchAllRows(client) { /* ALL_COLUMNS ile sayfali fetch, order("id") */ }

async function dryRun(client, pkg) {
  const ids = validatePackage(pkg, EXPECTED_PROJECT_REF);
  const allRows = await fetchAllRows(client);
  const byId = new Map(allRows.map((row) => [row.id, row]));
  const mismatches = [];
  for (const record of pkg.records) {
    const live = byId.get(record.id);
    if (!live) { mismatches.push({ id: record.id, fields: ["<satir yok>"] }); continue; }
    const bad = rowMatchesExpected(live, record.expected_before);
    if (bad.length) mismatches.push({ id: record.id, fields: bad });
  }
  if (mismatches.length) {
    throw new Error(`Dry-run FAIL: ${mismatches.length} hedef beklenen eski degerle eslesmiyor: ${JSON.stringify(mismatches.slice(0, 10))}`);
  }
  const nonTargets = allRows.filter((row) => !ids.has(row.id));
  return {
    allRows, byId,
    nonTargetHash: hashRows(nonTargets),
    totalCount: allRows.length,
    summary: { mode: "dry-run", status: "ready", targets: pkg.records.length, non_targets: nonTargets.length, total: allRows.length },
  };
}

async function apply(client, pkg, backupPath) {
  const pre = await dryRun(client, pkg);
  if (existsSync(backupPath)) throw new Error(`Mevcut yedek ezilmez: ${backupPath}`);
  mkdirSync(path.dirname(backupPath), { recursive: true });
  const backup = {
    schema_version: 1, kind: "sat-question-patch-backup", project_ref: EXPECTED_PROJECT_REF,
    run_label: pkg.run_label, package_sha256: sha256(JSON.stringify(pkg)),
    created_at: new Date().toISOString(), non_target_hash: pre.nonTargetHash, total_count: pre.totalCount,
    records: pkg.records.map((r) => ({ id: r.id, before: pre.byId.get(r.id), after: r.after })),
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2) + "\n", { flag: "wx", mode: 0o600 });

  const applied = [];
  for (const record of pkg.records) {
    const payload = { prompt: record.after.prompt, choices: normalizeChoices(record.after.choices), needs_review: record.after.needs_review };
    const { data, error } = await client.from("sat_questions").update(payload).eq("id", record.id).select(ALL_COLUMNS);
    const ok = !error && data?.length === 1 &&
      changedFields(record.after, { prompt: data[0].prompt, choices: data[0].choices, needs_review: data[0].needs_review }).length === 0 &&
      JSON.stringify(data[0].correct_answer) === JSON.stringify(record.expected_before.correct_answer);
    if (!ok) {
      await conditionalRollback(client, backup, applied);
      throw new Error(`Apply FAIL @${record.id}: ${error?.message ?? "geri-okuma after ile eslesmedi"}; onceki ${applied.length} kayit geri alindi.`);
    }
    applied.push(record.id);
  }

  const post = await fetchAllRows(client);
  const postIds = new Set(pkg.records.map((r) => r.id));
  const postNonTargets = post.filter((row) => !postIds.has(row.id));
  if (post.length !== pre.totalCount || hashRows(postNonTargets) !== pre.nonTargetHash) {
    throw new Error(`Post-verify FAIL: non-target veya toplam sayim degisti. Yedek: ${backupPath}. ELLE INCELEME GEREKLI, otomatik rollback YAPILMADI.`);
  }
  return { mode: "apply", status: "verified", applied: applied.length, backup_path: backupPath };
}

// conditionalRollback: applied listesindeki her id icin canli satiri oku; yalniz
// hala after ile birebir esitse before'daki WRITABLE_FIELDS degerlerini geri yaz
// ve geri-okumayla dogrula. Esit degilse o id'yi atla ve raporla (eszamanli
// degisiklik ezilmez). rollback modu ayni fonksiyonu backup dosyasindan cagirir;
// once dry-run raporu basar, --apply ile yazar.
```

Tam implementasyon bu sözleşmeyi birebir izler; `conditionalRollback` ve `--rollback` modu dahil hiçbir yazma yolu `WRITABLE_FIELDS` dışına çıkamaz.

- [ ] **Step 4: package.json'a ekle**

```json
"sat:patch": "node scripts/sat/patch-sat-questions.mjs",
"test:sat-patch": "node scripts/sat/test-question-patch.mjs"
```

- [ ] **Step 5: Sahte paketle canlıda dry-run doğrulaması (yazısız)**

Küçük deneme: `tmp/sat-bank/remediation/patch-smoke.json` içine canlıdan BİLİNEN bir satırın gerçek değerleriyle flag-only tek kayıt koy (Task 1 yedeklerinden alınabilir; canlıya yazılmayacak). Çalıştır: `npm run sat:patch -- --package tmp/sat-bank/remediation/patch-smoke.json`
Beklenen: `mode: "dry-run", status: "ready", targets: 1`. Sonra pakette `expected_before.prompt`'u bilerek boz, tekrar çalıştır → `Dry-run FAIL` ve uyuşmayan alan listesi. Smoke dosyasını sil.

- [ ] **Step 6: Commit**

```bash
git add scripts/sat/lib/question-patch.mjs scripts/sat/patch-sat-questions.mjs scripts/sat/test-question-patch.mjs package.json
git commit -m "feat(sat): add guarded compare-and-swap question patch tool"
```

---

### Task 3: Runtime karantina filtresi + guard + deploy

**Files:**
- Modify: `lib/sat/questions.server.ts` (createQuestion başı)
- Modify: `scripts/check-sat-bank.mjs`

**Interfaces:**
- Produces: `needs_review=true` satırlar `getSatBank()` çıktısına hiç girmez → topics/questions/API/UI otomatik olarak bu soruları yok sayar. `types/index.ts` `SatQuestionRow.needs_review: boolean | null` zaten mevcut; tip değişikliği gerekmez.

- [ ] **Step 1: Filtreyi ekle**

`lib/sat/questions.server.ts` içinde `createQuestion` fonksiyonunun ilk satırına (mevcut `if (!row.id || !row.prompt) return null;` satırının HEMEN ÜSTÜNE):

```ts
  if (row.needs_review) return null;
```

- [ ] **Step 2: Guard'ı ekle**

`scripts/check-sat-bank.mjs` içinde bölüm 2'nin ("Server veri katmani politikalari") sonuna:

```js
if (!server.includes("if (row.needs_review) return null")) {
  fail("questions.server.ts: needs_review karantina filtresi eksik (karantinali soru asla sunulmamali)");
}
```

- [ ] **Step 3: Doğrula**

Çalıştır: `npm run check:sat-bank && npm run lint && npm run build`
Beklenen: üçü de temiz geçer. (Şu an canlıda `needs_review=true` satır yok; davranış değişikliği karantina uygulanana kadar sıfırdır.)

- [ ] **Step 4: Commit + deploy**

```bash
git add lib/sat/questions.server.ts scripts/check-sat-bank.mjs
git commit -m "feat(sat): exclude needs_review questions from runtime"
git push
```

Vercel otomatik deploy eder. SIRA KURALI: Bu deploy yayında olmadan Task 4'teki bayrak uygulanmaz (bayrak flip edildiği anda davranışın tanımlı olması için).

---

### Task 4: Karantina operasyonu (canlı bayrak uygulama)

**Files:**
- Create: `scripts/sat/build-quarantine-package.mjs`

**Interfaces:**
- Consumes: Task 1 çıktıları (`live-backup.json`, `candidate-ids.json`), Task 2 paket şeması ve `sat:patch` CLI.
- Produces: `tmp/sat-bank/remediation/<run>/quarantine-package.json` (flag-only patch paketi) ve uygulanmış canlı karantina.

- [ ] **Step 1: Paket üreticiyi yaz**

`scripts/sat/build-quarantine-package.mjs`:

```js
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EXPECTED_PROJECT_REF } from "./lib/authored-explanations-import.mjs";
import { normalizeChoices } from "./lib/question-patch.mjs";

// CLI: node scripts/sat/build-quarantine-package.mjs --run <runAdi>
const runIndex = process.argv.indexOf("--run");
if (runIndex === -1 || !process.argv[runIndex + 1]) throw new Error("--run <etiket> zorunlu");
const run = process.argv[runIndex + 1];
const runDir = path.resolve(import.meta.dirname, "../../tmp/sat-bank/remediation", run);

const { rows } = JSON.parse(readFileSync(path.join(runDir, "live-backup.json"), "utf8"));
const { candidates } = JSON.parse(readFileSync(path.join(runDir, "candidate-ids.json"), "utf8"));
const byId = new Map(rows.map((row) => [row.id, row]));

const records = [];
for (const candidate of candidates) {
  const row = byId.get(candidate.id);
  if (!row) throw new Error(`Aday yedekte yok: ${candidate.id}`);
  if (row.needs_review === true) continue; // zaten karantinada
  records.push({
    id: row.id,
    expected_before: {
      prompt: row.prompt, choices: normalizeChoices(row.choices),
      needs_review: false, correct_answer: row.correct_answer,
    },
    after: { prompt: row.prompt, choices: normalizeChoices(row.choices), needs_review: true },
  });
}

const pkg = { kind: "sat-question-patch", schema_version: 1, project_ref: EXPECTED_PROJECT_REF, run_label: `quarantine-${run}`, records };
writeFileSync(path.join(runDir, "quarantine-package.json"), JSON.stringify(pkg, null, 2) + "\n");
console.log(`quarantine-package.json yazildi: ${records.length} kayit`);
```

- [ ] **Step 2: Taze audit + yedek al**

Önkoşul: Task 3 deploy'unun yayında olduğunu Kerem'den teyit et.
Çalıştır: `npm run sat:audit -- --run q1`
Beklenen: `tmp/sat-bank/remediation/q1/` altında üç dosya; `candidate_count` Task 1 Step 5'teki yerel sayıya yakın (±10); `flagged_needs_review: 0`; `local_vs_live.field_diff: 0`. Fark varsa DURDUR ve raporla — canlı ile yerel beklenmedik şekilde ayrışmış demektir.

- [ ] **Step 3: Paketi üret ve dry-run yap**

```bash
node scripts/sat/build-quarantine-package.mjs --run q1
npm run sat:patch -- --package tmp/sat-bank/remediation/q1/quarantine-package.json
```

Beklenen: `status: "ready"`, `targets` = candidate sayısı.

- [ ] **Step 4: Uygula ve doğrula**

```bash
npm run sat:patch -- --package tmp/sat-bank/remediation/q1/quarantine-package.json --apply --backup tmp/sat-bank/remediation/q1/before-quarantine-backup.json
```

Beklenen: `status: "verified"`, `applied` = hedef sayısı. Ardından `npm run sat:audit -- --run q1-post` → `flagged_needs_review` = hedef sayısı, `local_vs_live.field_diff` = hedef sayısı (yerel senkron Task 7'de yapılacak; bu fark beklenen ve geçicidir).

- [ ] **Step 5: Memo'yu sıfırla ve canlıda gör**

```bash
git commit --allow-empty -m "chore: redeploy to propagate SAT quarantine"
git push
```

Deploy sonrası Kerem `/sat` sayfasında kontrol eder: "Nonlinear Equations and Systems" konu sayısı 33'ten düşmüş olmalı; ekran görüntülerindeki bozuk sorular artık servis edilmemeli. Açık eski sekmeler sayfa yenilenene kadar eskiyi gösterebilir (kabul edilen sınırlama).

- [ ] **Step 6: Commit (yalnız script)**

```bash
git add scripts/sat/build-quarantine-package.mjs
git commit -m "feat(sat): add quarantine package builder"
git push
```

---

### Task 5: Toplu importer kilidi (insert-only)

**Files:**
- Modify: `scripts/sat/import-bank.mjs`
- Modify: `scripts/check-sat-bank.mjs`

**Interfaces:**
- Produces: `import-bank.mjs` var olan bir `id`'nin herhangi bir alanını değiştiremez; yalnız DB'de hiç olmayan id'leri ekleyebilir. Var olan id'de fark görürse yazısız fail eder. Bu, bayat `bank.json` ile yapılacak bir gelecekteki import'un düzeltmeleri ezmesini imkânsız kılar.

- [ ] **Step 1: import-bank.mjs'i insert-only yap**

Mevcut dosyada iki değişiklik:

(a) Figür upload bloğunda `upsert: true` → `upsert: false` yap ve bloğu, YALNIZ yeni eklenecek soruların figürlerini yükleyecek şekilde soru insert'inden SONRAYA taşı.

(b) Upsert bloğunu (satır 50-71 civarı, `// 2) Sorulari chunk'lar halinde upsert et`) şu insert-only akışla DEĞİŞTİR:

```js
// 2) Canli id'leri cek; var olan id'lerde fark varsa YAZISIZ fail (insert-only sozlesme)
const COMPARE_COLUMNS = "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,source_file,needs_review";
const live = [];
for (let from = 0; ; from += 500) {
  const { data, error } = await supabase.from("sat_questions").select(COMPARE_COLUMNS).order("id").range(from, from + 499);
  if (error) { console.error("Canli okuma hatasi:", error.message); process.exit(1); }
  live.push(...(data ?? []));
  if ((data ?? []).length < 500) break;
}
const liveById = new Map(live.map((r) => [r.id, r]));

const rows = bank.map((q) => ({
  id: q.id, section: q.section, domain: q.domain, skill: q.skill, skill_slug: q.skill_slug,
  difficulty: q.difficulty, question_type: q.question_type, prompt: q.prompt,
  choices: q.choices ?? null, correct_answer: q.correct_answer,
  figure_path: q.figure_path ? `${q.id}.webp` : null, source_file: q.source_file,
  needs_review: Boolean(q.needs_review),
}));

const conflicts = [];
const newRows = [];
for (const row of rows) {
  const existing = liveById.get(row.id);
  if (!existing) { newRows.push(row); continue; }
  const diff = Object.keys(row).filter((k) => JSON.stringify(row[k] ?? null) !== JSON.stringify(existing[k] ?? null));
  if (diff.length > 0) conflicts.push({ id: row.id, diff });
}
if (conflicts.length > 0) {
  console.error(`INSERT-ONLY FAIL: ${conflicts.length} var olan id yerel bankadan farkli. Var olan sorular yalniz`);
  console.error(`scripts/sat/patch-sat-questions.mjs uzerinden guncellenebilir. Ilk 10: ${JSON.stringify(conflicts.slice(0, 10))}`);
  process.exit(1);
}
for (let i = 0; i < newRows.length; i += 500) {
  const { error } = await supabase.from("sat_questions").insert(newRows.slice(i, i + 500));
  if (error) { console.error(`Insert hatasi (chunk ${i}): ${error.message}`); process.exit(1); }
}
console.log(`Import tamam: ${newRows.length} yeni soru insert edildi, ${rows.length - newRows.length} mevcut id degismeden atlandi.`);
```

- [ ] **Step 2: Guard ekle**

`scripts/check-sat-bank.mjs` sonuna (bölüm 7'den önce):

```js
// 8) Insert-only import sozlesmesi
const importBank = read("scripts/sat/import-bank.mjs");
if (importBank.includes(".upsert(")) fail("import-bank.mjs: sat_questions upsert YASAK (insert-only sozlesme)");
if (importBank.includes("upsert: true")) fail("import-bank.mjs: storage upsert YASAK");
if (!importBank.includes("INSERT-ONLY FAIL")) fail("import-bank.mjs: var olan id fark kontrolu eksik");
for (const toolPath of ["scripts/sat/patch-sat-questions.mjs", "scripts/sat/audit-sat-content.mjs"]) {
  if (!existsSync(resolve(process.cwd(), toolPath))) fail(`${toolPath} eksik`);
}
```

- [ ] **Step 3: Doğrula**

Çalıştır: `npm run check:sat-bank`
Beklenen: PASS. Ek kuru doğrulama: `node scripts/sat/import-bank.mjs` ŞU AN ÇALIŞTIRILMAZ (yerel bank henüz senkronlanmadığı için karantina bayrağı farkı görüp fail eder — bu beklenen davranıştır ve kilidin çalıştığının kanıtıdır; istenirse Task 7 sonrası "0 yeni, 1019 atlandı" görülerek doğrulanır).

- [ ] **Step 4: Commit**

```bash
git add scripts/sat/import-bank.mjs scripts/check-sat-bank.mjs
git commit -m "fix(sat): lock bulk importer to insert-only"
git push
```

---### Task 6: Taslak kapıları + düzeltme paketi üreticisi

**Files:**
- Create: `scripts/sat/gate-remediation-drafts.mjs`
- Create: `scripts/sat/build-remediation-package.mjs`

**Interfaces:**
- Consumes: `findMarkers`, `katexIssues`, `hasUnbalancedDollar`, `questionTexts` (`content-audit.mjs`), `normalizeChoices` (`question-patch.mjs`), `tmp/sat-bank/answers.json`, güncel `live-backup.json`.
- Consumes (girdi dosyası — Task 8'deki yazıcı/çözücü süreci üretir): `tmp/sat-bank/remediation/<run>/drafts.json`:

```json
{ "drafts": [ { "id": "1a2b3c4d", "prompt": "...", "choices": { "A": "...", "B": "...", "C": "...", "D": "..." }, "solver_answer": "A" } ] }
```

(SPR sorusunda `choices: null`, `solver_answer` sayı/kesir string'i, ör. `"3/4"`.)
- Produces: `gate-report.json` (id başına pass/fail + nedenler; herhangi bir fail'de exit 1) ve gate'i geçenlerden `remediation-package.json` (Task 2 şeması; `after.needs_review: false`).

- [ ] **Step 1: Gate scriptini yaz**

`scripts/sat/gate-remediation-drafts.mjs`:

```js
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findMarkers, hasUnbalancedDollar, katexIssues, questionTexts } from "./lib/content-audit.mjs";
import { normalizeChoices } from "./lib/question-patch.mjs";

// CLI: node scripts/sat/gate-remediation-drafts.mjs --run <runAdi>
// Girdi: <runDir>/drafts.json + <runDir>/live-backup.json + tmp/sat-bank/answers.json
const runIndex = process.argv.indexOf("--run");
if (runIndex === -1 || !process.argv[runIndex + 1]) throw new Error("--run <etiket> zorunlu");
const run = process.argv[runIndex + 1];
const OUT_ROOT = path.resolve(import.meta.dirname, "../../tmp/sat-bank");
const runDir = path.join(OUT_ROOT, "remediation", run);

// lib/sat/answers.ts parseNumeric aynasi (SPR karsilastirmasi icin)
function parseNumeric(value) {
  const trimmed = String(value).trim().replace(",", ".");
  if (!trimmed) return null;
  const fraction = trimmed.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  return /^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed) ? Number(trimmed) : null;
}
const TOLERANCE = 1e-4;

const { drafts } = JSON.parse(readFileSync(path.join(runDir, "drafts.json"), "utf8"));
const { rows } = JSON.parse(readFileSync(path.join(runDir, "live-backup.json"), "utf8"));
const { answers } = JSON.parse(readFileSync(path.join(OUT_ROOT, "answers.json"), "utf8"));
const liveById = new Map(rows.map((row) => [row.id, row]));

const results = [];
for (const draft of drafts) {
  const failures = [];
  const live = liveById.get(draft.id);
  const official = answers[draft.id]?.answer;
  if (!live) failures.push("canli yedekte yok");
  if (!official) failures.push("resmi cevap anahtari yok");
  if (live && live.needs_review !== true) failures.push("karantinada degil (once karantina, sonra duzeltme)");

  if (live && official) {
    // 1) Yapisal sozlesme
    if (live.question_type === "mcq") {
      const choices = normalizeChoices(draft.choices);
      if (!choices || Object.values(choices).some((c) => !c.trim())) failures.push("mcq: 4 dolu sik yok");
    } else if (draft.choices !== null) {
      failures.push("spr: choices null olmali");
    }
    // 2) Marker + KaTeX + $ dengesi
    for (const text of questionTexts(draft)) {
      for (const hit of findMarkers(text)) failures.push(`marker: ${hit.family} (${hit.match})`);
      for (const issue of katexIssues(text)) failures.push(`katex: ${issue.message.slice(0, 80)}`);
      if (hasUnbalancedDollar(text)) failures.push("dengesiz $");
    }
    // 3) Kor cozucu resmi anahtari tutturmali
    if (live.question_type === "mcq") {
      if (String(draft.solver_answer).trim().toUpperCase() !== String(official[0]).toUpperCase()) {
        failures.push(`cozucu ${draft.solver_answer} dedi, resmi anahtar ${official[0]}`);
      }
    } else {
      const solved = parseNumeric(draft.solver_answer);
      const matches = official.some((a) => {
        const numeric = parseNumeric(a);
        return solved !== null && numeric !== null && Math.abs(numeric - solved) <= TOLERANCE;
      });
      if (!matches) failures.push(`cozucu ${draft.solver_answer} dedi, resmi anahtar ${official.join("|")}`);
    }
    // 4) Bozuk kayitla tamamen ayni kalmamali (yalniz sik bozuksa prompt ayni kalabilir)
    const sameChoices = JSON.stringify(normalizeChoices(draft.choices)) === JSON.stringify(normalizeChoices(live.choices));
    if (draft.prompt === live.prompt && sameChoices) failures.push("taslak canli bozuk kayitla birebir ayni; duzeltme yok");
  }
  results.push({ id: draft.id, status: failures.length ? "fail" : "pass", failures });
}

const passed = results.filter((r) => r.status === "pass").length;
writeFileSync(path.join(runDir, "gate-report.json"), JSON.stringify({ run, passed, failed: results.length - passed, results }, null, 2) + "\n");
console.log(`Gate: ${passed}/${results.length} PASS`);
if (passed !== results.length) {
  for (const r of results.filter((x) => x.status === "fail")) console.error(` FAIL ${r.id}: ${r.failures.join("; ")}`);
  process.exit(1);
}
```

- [ ] **Step 2: Paket üreticiyi yaz**

`scripts/sat/build-remediation-package.mjs`:

```js
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EXPECTED_PROJECT_REF } from "./lib/authored-explanations-import.mjs";
import { normalizeChoices } from "./lib/question-patch.mjs";

// CLI: node scripts/sat/build-remediation-package.mjs --run <runAdi>
// Yalniz gate-report'ta "pass" olan taslaklar paketlenir; expected_before guncel yedekten gelir.
const runIndex = process.argv.indexOf("--run");
if (runIndex === -1 || !process.argv[runIndex + 1]) throw new Error("--run <etiket> zorunlu");
const run = process.argv[runIndex + 1];
const runDir = path.resolve(import.meta.dirname, "../../tmp/sat-bank/remediation", run);

const { drafts } = JSON.parse(readFileSync(path.join(runDir, "drafts.json"), "utf8"));
const { results } = JSON.parse(readFileSync(path.join(runDir, "gate-report.json"), "utf8"));
const { rows } = JSON.parse(readFileSync(path.join(runDir, "live-backup.json"), "utf8"));
const passIds = new Set(results.filter((r) => r.status === "pass").map((r) => r.id));
const liveById = new Map(rows.map((row) => [row.id, row]));

const records = drafts.filter((d) => passIds.has(d.id)).map((draft) => {
  const live = liveById.get(draft.id);
  return {
    id: draft.id,
    expected_before: {
      prompt: live.prompt, choices: normalizeChoices(live.choices),
      needs_review: live.needs_review, correct_answer: live.correct_answer,
    },
    after: { prompt: draft.prompt, choices: normalizeChoices(draft.choices), needs_review: false },
  };
});
if (records.length === 0) throw new Error("Paketlenecek pass kaydi yok.");
const pkg = { kind: "sat-question-patch", schema_version: 1, project_ref: EXPECTED_PROJECT_REF, run_label: `remediation-${run}`, records };
writeFileSync(path.join(runDir, "remediation-package.json"), JSON.stringify(pkg, null, 2) + "\n");
console.log(`remediation-package.json yazildi: ${records.length} kayit`);
```

- [ ] **Step 3: Sahte taslakla doğrula**

`tmp/sat-bank/remediation/gate-smoke/` altına elle küçük `drafts.json` + `live-backup.json` kur (2 kayıt: biri temiz+doğru çözümlü → pass; biri `2comma3` içeren → fail). Çalıştır: `node scripts/sat/gate-remediation-drafts.mjs --run gate-smoke`
Beklenen: `Gate: 1/2 PASS`, exit 1, fail nedeninde `marker: comma`. Smoke klasörünü sil.

- [ ] **Step 4: Commit**

```bash
git add scripts/sat/gate-remediation-drafts.mjs scripts/sat/build-remediation-package.mjs
git commit -m "feat(sat): add remediation draft gates and package builder"
git push
```

---

### Task 7: Yerel kaynak senkron aracı

**Files:**
- Create: `scripts/sat/apply-patch-to-local.mjs`

**Interfaces:**
- Consumes: uygulanmış herhangi bir patch paketi (karantina veya düzeltme), `tmp/sat-bank/math-questions/*.json` shard'ları (her biri soru objesi array'i; alanlar: `id, section, ..., prompt, choices, figure, needs_review`), `scripts/sat/validate-bank.mjs` (bank.json'u shard'lardan yeniden üretir).
- Produces: shard dosyaları ve yeniden üretilmiş `bank.json` canlıyla eşit hale gelir. Bu araç HER canlı apply'dan sonra çalıştırılır (karantina dahil).

- [ ] **Step 1: Aracı yaz**

`scripts/sat/apply-patch-to-local.mjs`:

```js
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { normalizeChoices, validatePackage } from "./lib/question-patch.mjs";
import { EXPECTED_PROJECT_REF } from "./lib/authored-explanations-import.mjs";

// CLI: node scripts/sat/apply-patch-to-local.mjs --package <path>
const pkgIndex = process.argv.indexOf("--package");
if (pkgIndex === -1 || !process.argv[pkgIndex + 1]) throw new Error("--package <path> zorunlu");
const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const OUT_ROOT = path.join(REPO_ROOT, "tmp", "sat-bank");
const shardDir = path.join(OUT_ROOT, "math-questions");

const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), process.argv[pkgIndex + 1]), "utf8"));
validatePackage(pkg, EXPECTED_PROJECT_REF);
const byId = new Map(pkg.records.map((r) => [r.id, r]));
const applied = new Set();

for (const file of readdirSync(shardDir).filter((f) => f.endsWith(".json"))) {
  const shardPath = path.join(shardDir, file);
  const shard = JSON.parse(readFileSync(shardPath, "utf8"));
  let changed = false;
  for (const question of shard) {
    const record = byId.get(question.id);
    if (!record) continue;
    question.prompt = record.after.prompt;
    question.choices = record.after.choices === null ? null : normalizeChoices(record.after.choices);
    question.needs_review = record.after.needs_review;
    applied.add(question.id);
    changed = true;
  }
  if (changed) writeFileSync(shardPath, JSON.stringify(shard, null, 2) + "\n");
}

const missing = pkg.records.filter((r) => !applied.has(r.id));
if (missing.length > 0) throw new Error(`Shard'da bulunamayan id'ler: ${missing.map((r) => r.id).join(", ")}`);

// bank.json'u yeniden uret ve hedeflerin after ile esitligini dogrula
execFileSync("node", [path.join(REPO_ROOT, "scripts/sat/validate-bank.mjs")], { stdio: "inherit", cwd: REPO_ROOT });
const { bank } = JSON.parse(readFileSync(path.join(OUT_ROOT, "bank.json"), "utf8"));
const bankById = new Map(bank.map((q) => [q.id, q]));
for (const record of pkg.records) {
  const q = bankById.get(record.id);
  if (!q) throw new Error(`bank.json'da yok: ${record.id}`);
  const ok = q.prompt === record.after.prompt &&
    JSON.stringify(normalizeChoices(q.choices)) === JSON.stringify(record.after.choices === null ? null : normalizeChoices(record.after.choices)) &&
    Boolean(q.needs_review) === record.after.needs_review;
  if (!ok) throw new Error(`bank.json after ile eslesmiyor: ${record.id}`);
}
console.log(`Yerel senkron tamam: ${applied.size} kayit shard + bank.json guncellendi.`);
```

Not: `validate-bank.mjs`, `SAT_BANK_SRC`/kaynak PDF klasörüne değil yalnız `tmp/sat-bank/` içindekilere bakar; ek kurulum gerekmez. `bank.json` üretimi `excluded/failures` alanlarını da yeniden yazar — beklenen davranıştır.

- [ ] **Step 2: Karantina paketiyle çalıştır (ilk gerçek kullanım + doğrulama)**

```bash
node scripts/sat/apply-patch-to-local.mjs --package tmp/sat-bank/remediation/q1/quarantine-package.json
npm run sat:audit -- --run q1-localsync
```

Beklenen: senkron mesajı hedef sayısıyla; audit raporunda `local_vs_live.field_diff: 0` ve `flagged_needs_review` = karantina sayısı. Ek kanıt: `node scripts/sat/import-bank.mjs` artık `0 yeni soru insert edildi, 1019 mevcut id degismeden atlandi` der (kilit + senkron birlikte doğrulanmış olur).

- [ ] **Step 3: Commit**

```bash
git add scripts/sat/apply-patch-to-local.mjs
git commit -m "feat(sat): sync applied patches into local shards and bank"
git push
```

---

### Task 8: Pilot 12 (içerik düzeltme operasyonu)

**Files:** yeni kod yok; Task 1-7 araçları + agent süreci. Çıktılar `tmp/sat-bank/remediation/pilot/` altında.

**Interfaces:**
- Consumes: `candidate-ids.json` (q1 run'ından), `tmp/sat-bank/math-images/<id>.png`, güncel `live-backup.json`, Task 6 gate/builder, Task 2 patch aracı, Task 7 senkron.
- Produces: 12 sorunun düzeltilip canlıda `needs_review: false` ile geri açılması; süreç şablonunun Task 9 dalgaları için kanıtlanması.

- [ ] **Step 1: Taze yedek al ve pilot id'lerini seç**

```bash
npm run sat:audit -- --run pilot
```

Pilot seçimi deterministik: `candidate-ids.json` içinden her marker ailesinin (`comma`, `close-glued`, `fraction-speech`, `function-speech`, `power-speech`, `math-word`, `bad-latex`, `katex-parse`) id-sıralı İLK adayı alınır; 12'ye kalan boşluk, id-sıralı ilk SPR adayı + kalanı en yüksek zorluklu adaylarla doldurulur. Seçim listesi `tmp/sat-bank/remediation/pilot/pilot-ids.json` olarak kaydedilir.

- [ ] **Step 2: Yazıcı (writer) agent'larıyla taslakları üret**

Her pilot id'si için writer'a (Opus 5) TAM OLARAK şu girdiler verilir: `tmp/sat-bank/math-images/<id>.png` görüntüsü + canlı yedekteki mevcut (bozuk) kayıt + şu prompt:

```text
You are transcribing an official SAT question from an image for the ItalyPath question bank.

The attached image is the AUTHORITATIVE source. The current stored record is
provided only as convenience for the English prose; its math notation is broken
accessibility text ("comma", "close", "squared", "the fraction with numerator")
- do NOT copy any math from it.

Output a single JSON object and nothing else:
{"id": "<id>", "prompt": "...", "choices": {"A": "...", "B": "...", "C": "...", "D": "..."}}
For a student-produced-response question (no answer options in the image), use "choices": null.

Rules:
- Reproduce the question EXACTLY as in the image: same wording, order, numbers,
  variables. Do not simplify, translate, solve, or add anything.
- Math goes inside $...$ as KaTeX-compatible LaTeX (\frac, \sqrt, ^{ }, \left( \right) etc.).
- Currency dollar signs are escaped as \$ (e.g. \$2.00); only math delimiters use bare $.
- MCQ: exactly four non-empty choices A-D as printed. Do not reorder choices.
- Never output the answer, an explanation, or commentary.
```

- [ ] **Step 3: Kör çözücü (solver) agent'larıyla cevapları üret**

Her taslak için AYRI bir agent bağlamına (görüntüsüz, resmî cevapsız, eski metinsiz) yalnız taslağın prompt+choices metni ve şu prompt verilir:

```text
Solve this SAT math question. Reason carefully, then output EXACTLY one final line:
ANSWER: <letter A-D>        (for multiple choice)
ANSWER: <number or fraction> (for a numeric-response question, e.g. 12 or 3/4 or -0.5)
```

Writer çıktıları + solver cevapları `tmp/sat-bank/remediation/pilot/drafts.json` dosyasında birleştirilir (Task 6 şeması).

- [ ] **Step 4: Kapılardan geçir**

```bash
node scripts/sat/gate-remediation-drafts.mjs --run pilot
```

Beklenen: `Gate: 12/12 PASS`. Fail olan taslak, gate raporundaki somut nedenle Step 2'ye döner (writer'a fail nedeni iletilir, yeniden yazılır, solver YENİDEN kör çözer). Çözücü-anahtar çelişkisi iki denemede de sürerse o id `pilot-blocked.json`'a alınır ve pakete GİRMEZ (karantinada kalır; Kerem'e raporlanır — muhtemel resmî anahtar sorunu, ayrı karar gerektirir).

- [ ] **Step 5: Paketle, dry-run yap, uygula, senkronla**

```bash
node scripts/sat/build-remediation-package.mjs --run pilot
npm run sat:patch -- --package tmp/sat-bank/remediation/pilot/remediation-package.json
npm run sat:patch -- --package tmp/sat-bank/remediation/pilot/remediation-package.json --apply --backup tmp/sat-bank/remediation/pilot/before-pilot-backup.json
node scripts/sat/apply-patch-to-local.mjs --package tmp/sat-bank/remediation/pilot/remediation-package.json
git commit --allow-empty -m "chore: redeploy to propagate SAT pilot fixes" && git push
```

Beklenen: apply `status: "verified"`; senkron sonrası `npm run sat:audit -- --run pilot-post` raporunda `flagged_needs_review` pilot kadar azalmış, `local_vs_live.field_diff: 0`.

- [ ] **Step 6: Görsel kabul (Kerem + Fable)**

Kerem `/sat` üzerinde pilot sorularının bulunduğu konuları açar; düzeltilen sorular kaynak görüntüleriyle yan yana karşılaştırılır (Fable ana oturumda `math-images/<id>.png` ile canlı ekran görüntüsünü karşılaştırır). 12/12 görsel onay olmadan Task 9 BAŞLAMAZ.

---

### Task 9: Kalan adayları dalga dalga düzelt

**Files:** yeni kod yok; Task 8 süreci tekrar eder.

**Figürlü soru kuralları (pilot bulgusu, 2026-08-28 — Fable denetim kararı):**

1. Yazıcı, basılı soru metninde OLMAYAN hiçbir şeyi prompt'a eklemez — figür
   üstündeki etiketler/degerler dahil. Figür bilgisi figürde kalır; uygulama
   `figure_path` görselini zaten ayrı gösterir. (Pilot'ta `1429dcdf` bu kurala
   aykırı uygulandı; dalga 1 öncesi Fable tarafından kaynağa sadık metne revize
   edilir.)
2. Bankada `figure_path` taşıyan sorularda kör çözücüye taslak metinle birlikte
   `tmp/sat-bank/<figure_path>` görseli de verilir (öğrencinin gördüğü asset).
   Tam soru görüntüsü (`math-images/<id>.png`), resmî cevap ve eski bozuk metin
   çözücüye yine ASLA verilmez. Böylece figür sorularında da çözücü-anahtar
   kapısı gerçek doğrulama yapar.
3. Pilot'ta bloke edilen `02c67921`, dalga 1'de bu kuralla yeniden denenir.

**Interfaces:**
- Consumes/Produces: Task 8 ile aynı; her dalga kendi `<run>` klasörünü kullanır (`wave-1`, `wave-2`, ...).

- [ ] **Step 1: Dalgaları planla**

Kalan karantinalı adaylar `skill_slug`'a göre gruplanır ve ~25'lik dalgalara bölünür (aynı konu aynı dalgada kalır; bir dalgada aynı shard için tek writer). Dalga listesi `tmp/sat-bank/remediation/waves-plan.json` olarak yazılır.

- [ ] **Step 2: Her dalga için Task 8 Step 1-5 döngüsünü çalıştır**

Zorunlu sıra her dalgada aynıdır: taze `sat:audit --run wave-N` (yedek + güncel expected_before) → writer → solver → gate → package → dry-run → apply → local sync → redeploy. Bir dalganın apply'ı bitmeden diğer dalganın apply'ı başlamaz (tek yazıcı kuralı). Çözücü-anahtar çelişkileri `wave-N-blocked.json`'da birikir ve karantinada kalır.

- [ ] **Step 3: Dalga sonu sağlık kontrolü**

Her dalga sonrası: `npm run sat:audit -- --run wave-N-post` → `flagged_needs_review` beklenen kadar azaldı, `local_vs_live.field_diff: 0`, `candidate_count` içindeki düzeltilen id'ler artık listede yok. Sayılar tutmuyorsa SONRAKI DALGA BAŞLAMAZ; Kerem'e raporlanır.

---

### Task 10: Final doğrulama + denetim

**Files:** yeni kod yok.

- [ ] **Step 1: Final audit**

```bash
npm run sat:audit -- --run final
npm run check:sat-bank && npm run test:sat-audit && npm run test:sat-patch
node scripts/sat/import-bank.mjs
```

Beklenen: audit'te `needs_review=false` satırlar arasında marker/katex-parse/unbalanced-dollar adayı 0; `flagged_needs_review` yalnız blocked listesindeki id sayısı (hedef 0; değilse her biri nedeniyle listelenir); `local_vs_live.field_diff: 0`; check/testler PASS; importer `0 yeni, 1019 atlandi`.

- [ ] **Step 2: Fable denetimi**

Ana oturumda (Fable) rastgele 20 düzeltilmiş id seçilir; her biri `tmp/sat-bank/math-images/<id>.png` kaynağıyla ve canlı `/sat` görünümüyle karşılaştırılır. Uyuşmazlık bulunursa ilgili id yeni bir mini dalga olarak Task 8 sürecine döner.

- [ ] **Step 3: Kapanış raporu**

Kerem'e sade Türkçe kapanış raporu: düzeltilen soru sayısı, karantinada kalan (varsa) id'ler ve nedenleri, yedeklerin yerleri, geri dönüş komutu (`npm run sat:patch -- --rollback <backup> --apply`). `AGENT_CONTEXT.md`'nin SAT bölümüne karantina filtresi + insert-only importer + patch aracı üç cümleyle işlenir ve commit edilir.

---

## Riskler ve Kabul Edilen Sınırlamalar

- Açık tarayıcı sekmeleri deploy + sayfa yenilemeye kadar eski içeriği gösterebilir (revision sistemi bilinçli atıldı; üst sınır ~3 saatlik memo + kullanıcının sayfa ömrü).
- Karantina penceresinde bir öğrenci karantinalı soruya açık oturumdan cevap gönderebilir; `sat_attempts` satırı yazılır ve korunur (attempt guard bilinçli atıldı).
- Patch aracının compare-and-swap'ı gerçek DB transaction'ı değildir; dry-run ile apply arasında başka bir yazıcı olursa geri-okuma/non-target hash kontrolleri yakalar. Operasyon boyunca tek yazıcı kuralı geçerlidir (aynı anda tek apply, başka SAT import/patch çalışmaz).
- Marker taşımayan ~800 soru bu planda tek tek incelenmez; sessiz semantik hata riski düşük ama sıfır değildir. Spec'teki tam banka incelemesi istenirse ayrı bir faz olarak sonra açılır.
