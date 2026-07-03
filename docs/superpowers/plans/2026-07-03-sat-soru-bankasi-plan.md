# SAT Soru Bankası Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Masaüstündeki 1410 resmi SAT sorusunu (821 Math + 589 Reading and Writing) yapılandırılmış veriye çevirip, giriş yapmış kullanıcılara `/sat` altında konu bazlı interaktif soru çözme deneyimi sunmak.

**Architecture:** Üç bölüm: (A) PDF → JSON boru hattı (mekanik script'ler + ayrı LLM extract adımı, pilot kapılı), (B) Supabase şeması + import (sorular service-role-only, denemeler kullanıcı-RLS'li), (C) Next.js app yüzeyi (protected API route + memo, client hook'lar, KaTeX'li soru kartı UI).

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Tailwind v4, Clerk, Supabase JS, KaTeX, poppler (pdftotext/pdftoppm), sharp (yalnızca script'lerde).

**Spec:** `docs/superpowers/specs/2026-07-03-sat-soru-bankasi-design.md` — görev yaparken önce spec'i oku.

---

## Yürütme Kuralları (her görevden önce oku)

1. **Görevler sırayla yürütülür** (bağımlılık notu olanlar hariç). Her görev bağımsız bir agent'a verilebilir; görev metni kendi bağlamını taşır.
2. **Kerem onay kapıları:** Görev 6 sonu (pilot kalitesi), Görev 10 (prod migration). Bu kapılardan onay almadan sonraki göreve GEÇME.
3. Repo kuralları: `middleware.ts` oluşturma (route güvenliği `proxy.ts`); `tailwind.config.*` oluşturma; UI metinleri `lib/translations.ts`'te TR/EN paralel; Supabase row tipleri `types/index.ts`'e explicit interface; live university yüzeylerine dokunma.
4. Kaynak PDF'ler: `~/Desktop/SAT Question Bank PDFs/` (makine-yerel; repo'ya kopyalanmaz). Ara çıktılar `tmp/sat-bank/` (gitignore'da `tmp/` zaten var; commit edilmez).
5. Testler: repoda test framework yok; doğrulama = script'i gerçek veriyle çalıştırıp beklenen sayıları görmek + `npm run` check'leri. Her görev kendi doğrulama komutlarını içerir.
6. Her görev sonunda commit (mesajlar görevlerde verildi; repo dili ASCII Türkçe, `feat(sat):` / `chore(sat):` önekleri).
7. Node v20 (script'ler `.mjs`); `pdftotext`/`pdftoppm` Homebrew poppler'dan gelir (`/opt/homebrew/bin/`), Görev 1 varlığını doğrular.

## Dosya Haritası

```text
scripts/sat/
  lib.mjs                 # ortak yardımcılar (yol sabitleri, pdftotext sarmalayıcı, JSON IO, slugify)
  extract-answers.mjs     # cevap anahtarı PDF'leri -> tmp/sat-bank/answers.json (+ eksik anahtar raporu)
  extract-rw.mjs          # Unformatted RW PDF'leri -> tmp/sat-bank/rw-questions.json (589 soru)
  slice-math.mjs          # Formatted Math PDF'leri -> soru başına PNG + math-manifest.json (821)
  crop-figures.mjs        # figure bbox'lu sorular -> tmp/sat-bank/figures/<id>.webp
  validate-bank.mjs       # birleştir + doğrula -> tmp/sat-bank/bank.json + rapor
  import-bank.mjs         # bank.json -> Supabase (service role) + figür upload
docs/superpowers/specs/
  sat-math-extraction-prompt.md   # LLM extract prompt şablonu + runbook (Görev 5)
supabase/sat_bank.sql     # sat_questions + sat_attempts + RLS + grants
types/index.ts            # SatQuestionRow, SatAttemptRow eklenir
lib/sat/
  types.ts                # app-facing SatQuestion/SatTopic tipleri + normalize
  answers.ts              # SPR cevap normalize/eşleştirme saf fonksiyonları
  questions.server.ts     # service-role fetch + 3 saat memo + single-flight + stale-on-error
  useSatBank.ts           # client: topics + soru fetch (in-memory cache + dedupe)
  useSatAttempts.ts       # client: deneme yaz/oku (Clerk JWT + optimistic)
app/api/sat/questions/route.ts   # protected API (proxy varsayılan koruması), no-store
app/sat/page.tsx          # protected sayfa (client leaf'i render eder)
components/sat/
  SatBankExplorer.tsx     # bölüm/konu listesi + oturum yönetimi (ana client leaf)
  MathText.tsx            # $...$ KaTeX render bileşeni
  QuestionCard.tsx        # soru kartı (mcq şıkları / spr girişi + geri bildirim)
  TopicRow.tsx            # konu satırı (ilerleme rozetli)
  SessionSummary.tsx      # konu sonu özeti
scripts/check-sat-bank.mjs       # guard script (npm run check:sat-bank)
```

Veri sözleşmesi (boru hattı JSON'u ve DB satırı aynı alan adlarını kullanır):

```json
{
  "id": "06fc1726",
  "section": "math",
  "domain": "Algebra",
  "skill": "Linear Functions",
  "skill_slug": "linear-functions",
  "difficulty": 1,
  "question_type": "mcq",
  "prompt": "If $f$ is the function defined by $f(x)=\\frac{2x-1}{3}$, what is the value of $f(5)$?",
  "choices": { "A": "$\\frac{4}{3}$", "B": "$\\frac{7}{3}$", "C": "3", "D": "9" },
  "correct_answer": ["C"],
  "figure_path": null,
  "source_file": "Linear Functions 1.pdf",
  "needs_review": false
}
```

- `question_type`: `"mcq" | "spr"`. SPR'de `choices` null, `correct_answer` kabul edilen yazımlar dizisi (ör. `["3/4", "0.75"]`).
- `difficulty`: dosya adı sonundaki 1/2/3 (College Board Easy/Medium/Hard).
- `domain`/`skill`: klasör adlarından (dosya içi parse değil — daha güvenilir).

---

## Bölüm A — Veri Boru Hattı

### Task 1: Ortak script altyapısı (`scripts/sat/lib.mjs`)

**Files:**
- Create: `scripts/sat/lib.mjs`

- [ ] **Step 1: Araçları doğrula**

Run: `pdftotext -v 2>&1 | head -1 && pdftoppm -v 2>&1 | head -1`
Expected: her ikisi de poppler sürüm satırı basar. Yoksa DUR ve Kerem'e "brew install poppler" gerektiğini bildir.

- [ ] **Step 2: `scripts/sat/lib.mjs` dosyasını yaz**

```js
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const SOURCE_ROOT =
  process.env.SAT_BANK_SRC ?? join(homedir(), "Desktop", "SAT Question Bank PDFs");
export const FORMATTED_ROOT = join(SOURCE_ROOT, "Question Bank (Formatted)");
export const UNFORMATTED_ROOT = join(SOURCE_ROOT, "Question Bank (Unformatted)");
export const ANSWERS_ROOT = join(FORMATTED_ROOT, "Answers");
export const OUT_ROOT = resolve(process.cwd(), "tmp", "sat-bank");

export function ensureOutDirs() {
  for (const dir of [OUT_ROOT, join(OUT_ROOT, "math-images"), join(OUT_ROOT, "math-questions"), join(OUT_ROOT, "figures")]) {
    mkdirSync(dir, { recursive: true });
  }
}

export function pdftotext(pdfPath, extraArgs = []) {
  return execFileSync("pdftotext", [...extraArgs, pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function listPdfsRecursive(root) {
  const results = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (statSync(full).isDirectory()) results.push(...listPdfsRecursive(full));
    else if (entry.endsWith(".pdf")) results.push(full);
  }
  return results.sort();
}

export function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "Linear Functions 1.pdf" -> { topic: "Linear Functions", difficulty: 1 }
export function parseFileName(fileName) {
  const match = fileName.replace(/\.pdf$/, "").replace(/~Key$/, "").match(/^(.*)\s(\d)$/);
  if (!match) throw new Error(`Beklenmeyen dosya adi: ${fileName}`);
  return { topic: match[1], difficulty: Number(match[2]) };
}

export const HEX_ID = /^[0-9a-f]{8}$/;
```

- [ ] **Step 3: Duman testi**

Run: `node -e "import('./scripts/sat/lib.mjs').then(m => { m.ensureOutDirs(); console.log(m.listPdfsRecursive(m.UNFORMATTED_ROOT).length); })"`
Expected: `87`

- [ ] **Step 4: Commit**

```bash
git add scripts/sat/lib.mjs
git commit -m "chore(sat): pipeline ortak yardimcilari"
```

---

### Task 2: Cevap anahtarı çıkarma (`scripts/sat/extract-answers.mjs`)

**Files:**
- Create: `scripts/sat/extract-answers.mjs`

Anahtar PDF metin katmanı deseni (pdftotext sırası): başlık satırları, sonra tekrar eden `soru-no (1.1)` → `8-hex id` → `cevap` üçlüleri. Cevap ya tek harf (A-D) ya sayısal/kesirli değer (SPR). Bazı anahtarlar birden çok kabul edilen yazımı virgülle listeler.

- [ ] **Step 1: Script'i yaz**

```js
import { basename, join } from "node:path";
import { ANSWERS_ROOT, FORMATTED_ROOT, HEX_ID, OUT_ROOT, ensureOutDirs, listPdfsRecursive, pdftotext, writeJson } from "./lib.mjs";

const LETTER = /^[A-D]$/;
const NUMERIC = /^-?\d+(?:\.\d+)?(?:\/\d+)?$/;
const QNUM = /^\d+\.\d+$/;

const answers = {};        // id -> { answer: string[], keyFile: string }
const anomalies = [];      // elle bakılacaklar
const perFileCounts = {};

for (const pdfPath of listPdfsRecursive(ANSWERS_ROOT)) {
  const fileName = basename(pdfPath);
  const lines = pdftotext(pdfPath)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!HEX_ID.test(lines[i])) continue;
    const id = lines[i];
    const next = lines[i + 1] ?? "";
    let accepted = null;

    if (LETTER.test(next)) {
      accepted = [next];
    } else {
      // SPR: virgülle ayrılmış kabul edilen yazımlar olabilir ("8/3, 2.66, 2.67")
      const parts = next.split(",").map((p) => p.trim());
      if (parts.length > 0 && parts.every((p) => NUMERIC.test(p))) {
        // soru numarası ile karışmasın: bir SONRAKİ satır yeni soru no + hex id ise
        // ve next kendisi de d.d formatındaysa bile cevap kabul edilir; çünkü sıra
        // her zaman id -> cevap -> sonraki soru no şeklindedir.
        accepted = parts;
      }
    }

    if (!accepted) {
      anomalies.push({ keyFile: fileName, id, sawLine: next });
      continue;
    }
    if (answers[id]) {
      anomalies.push({ keyFile: fileName, id, sawLine: "DUPLICATE_ID" });
      continue;
    }
    answers[id] = { answer: accepted, keyFile: fileName };
    count++;
  }
  perFileCounts[fileName] = count;
}

// Eksik anahtar dosyası tespiti: Formatted soru PDF'leri ile kıyasla
const questionFiles = listPdfsRecursive(FORMATTED_ROOT)
  .filter((p) => !p.includes("/Answers/"))
  .map((p) => basename(p).replace(/\.pdf$/, ""));
const keyFiles = new Set(Object.keys(perFileCounts).map((f) => f.replace(/~Key\.pdf$/, "")));
const missingKeys = questionFiles.filter((q) => !keyFiles.has(q));

ensureOutDirs();
writeJson(join(OUT_ROOT, "answers.json"), { answers, anomalies, perFileCounts, missingKeys });
console.log(`Toplam cevap: ${Object.keys(answers).length}`);
console.log(`Anomali: ${anomalies.length}`);
console.log(`Eksik anahtar dosyasi: ${missingKeys.join(", ") || "yok"}`);
```

- [ ] **Step 2: Çalıştır ve çıktıyı doğrula**

Run: `node scripts/sat/extract-answers.mjs`
Expected: Toplam cevap ~1380-1400 arası (eksik 1 anahtar dosyanın soruları hariç); eksik anahtar dosyası adı basılır (tam olarak 1 adet bekleniyor); anomali sayısı düşük (<20). Anomaliler `tmp/sat-bank/answers.json` içinde — 5 tanesini aç, `sawLine` değerlerine bak; sistematik bir parse hatası görürsen (ör. hepsi aynı desende) script'i düzelt, tek tük tuhaflıksa bırak (validate aşaması yakalar).

- [ ] **Step 3: Eksik anahtarı raporla**

`tmp/sat-bank/answers.json` içindeki `missingKeys` değerini görev raporuna yaz — Kerem bu konunun cevap anahtarını ayrıca temin edecek; o dosyanın soruları import'ta otomatik dışarıda kalacak (Task 8 bunu yapar).

- [ ] **Step 4: Commit**

```bash
git add scripts/sat/extract-answers.mjs
git commit -m "feat(sat): cevap anahtari cikarma scripti"
```

---

### Task 3: Reading-Writing soru çıkarma (`scripts/sat/extract-rw.mjs`)

**Files:**
- Create: `scripts/sat/extract-rw.mjs`

Unformatted RW PDF blok deseni: `Question ID <hex>` başlığı; `Assessment/Test/Domain/Skill` etiket satırları ve değerleri; `ID: <hex>` satırı; ardından soru gövdesi; `A.`-`D.` şıkları; blok `Difficulty` ile biter. Domain/skill klasör adından alınır (dosya içi parse edilmez). RW'nin tamamı MCQ'dur.

- [ ] **Step 1: Script'i yaz**

```js
import { basename, dirname, join } from "node:path";
import { HEX_ID, OUT_ROOT, UNFORMATTED_ROOT, ensureOutDirs, listPdfsRecursive, parseFileName, pdftotext, slugify, writeJson } from "./lib.mjs";

const RW_ROOT = join(UNFORMATTED_ROOT, "Reading and Writing");
const questions = [];
const problems = [];

for (const pdfPath of listPdfsRecursive(RW_ROOT)) {
  const fileName = basename(pdfPath);
  const skill = basename(dirname(pdfPath));
  const domain = basename(dirname(dirname(pdfPath)));
  const { difficulty } = parseFileName(fileName);

  const text = pdftotext(pdfPath);
  // \f (sayfa sonu) karakterlerini temizle, bloklara böl
  const blocks = text.replace(/\f/g, "\n").split(/(?=Question ID [0-9a-f]{8})/);

  for (const block of blocks) {
    const idMatch = block.match(/^Question ID ([0-9a-f]{8})/);
    if (!idMatch) continue;
    const id = idMatch[1];

    // Gövde "ID: <hex>" satırından sonra başlar
    const bodyStart = block.indexOf(`ID: ${id}`);
    if (bodyStart === -1) { problems.push({ id, fileName, reason: "ID satiri yok" }); continue; }
    let body = block.slice(bodyStart + `ID: ${id}`.length);

    // "Difficulty" kuyruğunu at
    body = body.replace(/\n\s*Difficulty[\s\S]*$/, "");

    // Şıkları ayır: satır başında "A. ", "B. " ...
    const choiceMatch = body.match(/\nA\.\s([\s\S]*?)\nB\.\s([\s\S]*?)\nC\.\s([\s\S]*?)\nD\.\s([\s\S]*?)$/);
    if (!choiceMatch) { problems.push({ id, fileName, reason: "4 sik bulunamadi" }); continue; }

    const prompt = body.slice(0, choiceMatch.index).replace(/\s+\n/g, "\n").trim();
    const clean = (s) => s.replace(/\s+/g, " ").trim();
    const choices = { A: clean(choiceMatch[1]), B: clean(choiceMatch[2]), C: clean(choiceMatch[3]), D: clean(choiceMatch[4]) };

    if (!prompt) { problems.push({ id, fileName, reason: "bos govde" }); continue; }

    questions.push({
      id,
      section: "reading-writing",
      domain,
      skill,
      skill_slug: slugify(skill),
      difficulty,
      question_type: "mcq",
      prompt,
      choices,
      figure_path: null,
      source_file: fileName,
      // Grafik/tablo referansı taşıyan RW soruları görsel kaybetmiş olabilir; elle bakılacak
      needs_review: /\b(graph|table|figure|chart)\b/i.test(prompt),
    });
  }
}

ensureOutDirs();
writeJson(join(OUT_ROOT, "rw-questions.json"), { questions, problems });
console.log(`RW soru: ${questions.length}, sorunlu blok: ${problems.length}, needs_review: ${questions.filter((q) => q.needs_review).length}`);
```

- [ ] **Step 2: Çalıştır ve doğrula**

Run: `node scripts/sat/extract-rw.mjs`
Expected: `RW soru: 589` (±sorunlu blok sayısı; `589 - problems = questions` toplamı tutmalı). Sorunlu blok >10 ise desen kaymış demektir — `tmp/sat-bank/rw-questions.json` içindeki `problems` kayıtlarına bak, regex'i düzelt, tekrar çalıştır.

- [ ] **Step 3: Örneklem kontrolü**

`tmp/sat-bank/rw-questions.json`'dan rastgele 5 soru aç; prompt'un pasajı tam içerdiğini, şıkların karışmadığını gözle doğrula. `needs_review: true` sayısını görev raporuna yaz (bunlar Command of Evidence tarzı grafikli sorular olabilir; pilot incelemesinde Kerem'le birlikte örneklenecek).

- [ ] **Step 4: Commit**

```bash
git add scripts/sat/extract-rw.mjs
git commit -m "feat(sat): reading-writing soru cikarma scripti"
```

---

### Task 4: Math soru görüntüsü kesme (`scripts/sat/slice-math.mjs`)

**Files:**
- Create: `scripts/sat/slice-math.mjs`
- Modify: `package.json` (devDependency: `sharp`)

Formatted Math PDF'lerinde metin katmanı soru numarası (`1.1`) ve 8-hex id kelimelerini koordinatlarıyla verir (`pdftotext -bbox`). Sayfa `pdftoppm` ile 150 DPI PNG'ye çevrilir; her soru, kendi numarasının y-koordinatından bir sonraki numaranın y-koordinatına kadar kesilir.

- [ ] **Step 1: sharp'ı kur**

Run: `npm install -D sharp`
Expected: package.json devDependencies'e sharp eklenir.

- [ ] **Step 2: Script'i yaz**

```js
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import sharp from "sharp";
import { FORMATTED_ROOT, HEX_ID, OUT_ROOT, ensureOutDirs, listPdfsRecursive, parseFileName, slugify, writeJson } from "./lib.mjs";

const MATH_ROOT = join(FORMATTED_ROOT, "Math");
const DPI = 150;
const SCALE = DPI / 72; // bbox koordinatları 72dpi point cinsinden
const PAD_TOP = 14;     // soru numarasının hafif üstünden başla (point)

ensureOutDirs();
const manifest = [];
const problems = [];

for (const pdfPath of listPdfsRecursive(MATH_ROOT)) {
  const fileName = basename(pdfPath);
  const skill = basename(dirname(pdfPath));
  const domain = basename(dirname(dirname(pdfPath)));
  const { difficulty } = parseFileName(fileName);

  // 1) bbox XML'inden kelime koordinatları
  const bboxOut = join(OUT_ROOT, "_bbox.xml");
  execFileSync("pdftotext", ["-bbox", pdfPath, bboxOut]);
  const xml = readFileSync(bboxOut, "utf8");

  const pages = [...xml.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)];

  // 2) sayfaları PNG'ye çevir (tek seferde)
  const ppmPrefix = join(OUT_ROOT, "_page");
  execFileSync("pdftoppm", ["-png", "-r", String(DPI), pdfPath, ppmPrefix]);

  for (let p = 0; p < pages.length; p++) {
    const [, wStr, hStr, pageXml] = pages[p];
    const pageH = Number(hStr);
    const words = [...pageXml.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]+)<\/word>/g)]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]), text: m[5] }));

    const numbers = words.filter((w) => /^\d+\.\d+$/.test(w.text)).sort((a, b) => a.y - b.y);
    if (numbers.length === 0) continue;

    // pdftoppm dosya adı: _page-1.png, _page-01.png vs. — ikisini de dene
    const pageNum = p + 1;
    const candidates = [
      `${ppmPrefix}-${pageNum}.png`,
      `${ppmPrefix}-${String(pageNum).padStart(2, "0")}.png`,
      `${ppmPrefix}-${String(pageNum).padStart(3, "0")}.png`,
    ];
    const pagePng = candidates.find((c) => { try { readFileSync(c); return true; } catch { return false; } });
    if (!pagePng) { problems.push({ fileName, page: pageNum, reason: "png yok" }); continue; }

    const img = sharp(pagePng);
    const meta = await img.metadata();

    for (let i = 0; i < numbers.length; i++) {
      const num = numbers[i];
      // aynı satırdaki (y toleransı 6pt) hex id kelimesi
      const idWord = words.find((w) => HEX_ID.test(w.text) && Math.abs(w.y - num.y) < 6);
      if (!idWord) { problems.push({ fileName, page: pageNum, number: num.text, reason: "id eslesmedi" }); continue; }

      const top = Math.max(0, Math.round((num.y - PAD_TOP) * SCALE));
      const nextY = i + 1 < numbers.length ? numbers[i + 1].y - PAD_TOP : pageH;
      const bottom = Math.min(meta.height, Math.round(nextY * SCALE));
      if (bottom - top < 40) { problems.push({ fileName, page: pageNum, number: num.text, reason: "bolge cok kucuk" }); continue; }

      const outPath = join(OUT_ROOT, "math-images", `${idWord.text}.png`);
      await sharp(pagePng)
        .extract({ left: 0, top, width: meta.width, height: bottom - top })
        .toFile(outPath);

      manifest.push({
        id: idWord.text,
        section: "math",
        domain,
        skill,
        skill_slug: slugify(skill),
        difficulty,
        source_file: fileName,
        image: `math-images/${idWord.text}.png`,
      });
    }
  }

  // sayfa PNG'lerini temizle
  for (let n = 1; n <= pages.length + 1; n++) {
    for (const c of [`${ppmPrefix}-${n}.png`, `${ppmPrefix}-${String(n).padStart(2, "0")}.png`, `${ppmPrefix}-${String(n).padStart(3, "0")}.png`]) {
      try { rmSync(c); } catch {}
    }
  }
}

writeJson(join(OUT_ROOT, "math-manifest.json"), { manifest, problems });
console.log(`Math soru gorseli: ${manifest.length}, sorun: ${problems.length}`);
```

Not: dosya top-level `await` kullanır; `.mjs` olduğu için Node 20'de çalışır.

- [ ] **Step 3: Tek dosyayla dene, sonra tamamını çalıştır**

Önce `MATH_ROOT`'u geçici olarak tek konuya daraltmadan komple çalıştırmak yerine hızlı görsel kontrol yap: script'i çalıştır, `tmp/sat-bank/math-images/` içinden 3-4 PNG aç (ör. `06fc1726.png`) — her görüntü TEK soru içermeli (üstte kırpılmış başka sorunun kuyruğu, altta bir sonrakinin başı olmamalı). Kesim bozuksa `PAD_TOP` değerini ayarla.

Run: `node scripts/sat/slice-math.mjs`
Expected: `Math soru gorseli: 821` (±sorun sayısı). Sorun >15 ise problems kayıtlarını incele, düzelt, tekrar çalıştır (script idempotent; üzerine yazar).

- [ ] **Step 4: Commit**

```bash
git add scripts/sat/slice-math.mjs package.json package-lock.json
git commit -m "feat(sat): math soru gorseli kesme scripti"
```

---

### Task 5: Math LLM extract prompt şablonu ve runbook

**Files:**
- Create: `docs/superpowers/specs/sat-math-extraction-prompt.md`

Bağımlılık: Task 4 tamamlanmış olmalı (görüntüler ve manifest hazır).

- [ ] **Step 1: Dosyayı yaz** (içerik aynen aşağıdaki gibi)

````markdown
# SAT Math Soru Çıkarma — Prompt Şablonu ve Runbook

Bu runbook `tmp/sat-bank/math-images/` altındaki soru görüntülerini yapılandırılmış
JSON'a çevirir. Kural: pilot (Task 6) Kerem onayından geçmeden toplu çalıştırma (Task 9) yapılmaz.

## Süreç

1. `tmp/sat-bank/math-manifest.json`'dan hedef sorular seçilir (skill bazında).
2. Her soru görüntüsü Read tool ile açılır ve aşağıdaki şablona göre JSON üretilir.
3. Çıktı `tmp/sat-bank/math-questions/<skill_slug>-<difficulty>.json` dosyasına
   dizi olarak yazılır (manifest'teki id/section/domain/skill/skill_slug/difficulty/
   source_file alanları kopyalanır, aşağıdaki alanlar eklenir).
4. Aynı anda en fazla 5-10 paralel alt görev (oturum limiti kuralı).

## Soru başına üretilecek alanlar

- `question_type`: Görüntüde A./B./C./D. şıkları varsa "mcq", yoksa "spr".
- `prompt`: Soru metni. Matematik ifadeleri $...$ içinde LaTeX olarak yaz
  (kesir: \frac{a}{b}, üs: x^{2}, kök: \sqrt{x}, eşitsizlik: \leq \geq).
  Metindeki değişkenler de $x$ gibi sarılır. Satır sonu gerekiyorsa \n kullan.
- `choices`: mcq ise {"A": "...", "B": "...", "C": "...", "D": "..."} — şık
  içerikleri de LaTeX kuralına uyar. spr ise null.
- `figure`: Görüntüde grafik, geometri çizimi veya tablo varsa
  {"bbox": [x0, y0, x1, y1], "kind": "graph" | "geometry" | "table"} —
  bbox, SORU GÖRÜNTÜSÜNE göre 0-1 aralığında normalize koordinatlar
  (sol-üst köşe x0,y0; sağ-alt x1,y1; şekli tam saracak şekilde, soru metnini
  içermeden). Şekil yoksa null. Tablolar da figure sayılır (metne çevirme).
- `needs_review`: Görüntü bulanık, ifade belirsiz veya LaTeX'e çevrilemeyen
  bir öğe varsa true + `review_note` alanına tek cümle neden.

## Yasaklar

- CEVAP ÜRETME. Doğru cevap anahtardan gelir; senin işin yalnızca soruyu
  yazıya dökmek. Görüntüde işaretli cevap yok zaten.
- Soruyu yorumlama, sadeleştirme, çevirme. Birebir aktar (İngilizce kalır).
- Emin olmadığın karakteri tahmin etme; needs_review işaretle.

## Çıktı doğrulama

Her dosya yazıldıktan sonra: `node scripts/sat/validate-bank.mjs` çalıştırılabilir
(kısmi veriyle de çalışır) — JSON şema hataları ve cevap eşleşmezlikleri raporlanır.

## Pilot kapsamı (Task 6)

- `linear-functions` (3 zorluk dosyası, ~57 soru): kesir/formül yoğun
- `percentages` difficulty 3 (~17 soru, 9'u SPR): sayı girişli tip
Pilot çıktısı Kerem'e örneklemle sunulur; onay gelmeden Task 9'a geçilmez.
````

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/sat-math-extraction-prompt.md
git commit -m "docs(sat): math extract prompt sablonu ve runbook"
```

---

### Task 6: PİLOT extraction (agent görevi) — KEREM ONAY KAPISI

**Files:**
- Create: `tmp/sat-bank/math-questions/linear-functions-1.json` (+ -2, -3)
- Create: `tmp/sat-bank/math-questions/percentages-3.json`

Bağımlılık: Task 4 + Task 5. Bu görev kod yazmaz; runbook'u uygular.

- [ ] **Step 1:** `docs/superpowers/specs/sat-math-extraction-prompt.md`'yi oku ve pilot kapsamındaki soruları (linear-functions 1/2/3 + percentages 3) görüntülerden JSON'a çevir. Paralel alt görev sınırı 5-10.
- [ ] **Step 2:** Üretilen JSON'ların soru sayısını manifest ile karşılaştır (linear-functions toplam + percentages-3 toplamı manifest'teki aynı skill/difficulty sayılarıyla birebir eşit olmalı).
- [ ] **Step 3:** Kerem'e sunum hazırla: 6 örnek soru (2 kesirli mcq, 2 spr, 1 figure'lı, 1 needs_review varsa o) — prompt/choices metinlerini olduğu gibi göster, LaTeX'in doğru olup olmadığına birlikte bakın. **Onay gelmeden sonraki göreve geçme. Kerem "beğenmedim ama X kalabilir" derse bunu onay sayma; neyin değişmesi gerektiğini sor** (bkz. memory: feedback-deadline-scrape-cancelled).

---

### Task 7: Figür kırpma (`scripts/sat/crop-figures.mjs`)

**Files:**
- Create: `scripts/sat/crop-figures.mjs`

Bağımlılık: Task 6 (bbox'lu extraction çıktısı olmalı).

- [ ] **Step 1: Script'i yaz**

```js
import { readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { OUT_ROOT, readJson, writeJson } from "./lib.mjs";

const questionsDir = join(OUT_ROOT, "math-questions");
const problems = [];
let cropped = 0;

// Istege bagli argv filtresi: dosya adlari verilirse yalnizca onlari isler.
// Paralel extraction surerken cakismayi onlemek icin kullanilir:
//   node scripts/sat/crop-figures.mjs linear-functions-1.json percentages-3.json
const only = new Set(process.argv.slice(2));

for (const file of readdirSync(questionsDir).filter((f) => f.endsWith(".json"))) {
  if (only.size > 0 && !only.has(file)) continue;
  const questions = readJson(join(questionsDir, file));
  let changed = false;

  for (const q of questions) {
    if (!q.figure || q.figure_path) continue;
    const imagePath = join(OUT_ROOT, "math-images", `${q.id}.png`);
    const [x0, y0, x1, y1] = q.figure.bbox;

    try {
      const meta = await sharp(imagePath).metadata();
      const left = Math.round(x0 * meta.width);
      const top = Math.round(y0 * meta.height);
      const width = Math.round((x1 - x0) * meta.width);
      const height = Math.round((y1 - y0) * meta.height);
      if (width < 20 || height < 20) throw new Error("bbox cok kucuk");

      const outPath = join(OUT_ROOT, "figures", `${q.id}.webp`);
      await sharp(imagePath).extract({ left, top, width, height }).webp({ quality: 82 }).toFile(outPath);
      q.figure_path = `figures/${q.id}.webp`;
      changed = true;
      cropped++;
    } catch (error) {
      problems.push({ id: q.id, file, reason: String(error) });
      q.needs_review = true;
    }
  }

  if (changed) writeJson(join(questionsDir, file), questions);
}

writeJson(join(OUT_ROOT, "figure-crop-report.json"), { cropped, problems });
console.log(`Kirpilan figur: ${cropped}, sorun: ${problems.length}`);
```

- [ ] **Step 2: Pilot verisiyle çalıştır ve gözle doğrula**

Run: `node scripts/sat/crop-figures.mjs`
Expected: pilot setindeki figure'lı soru sayısı kadar `tmp/sat-bank/figures/*.webp`. 3 tanesini aç: kırpım şekli tam sarmalı, soru metni içermemeli. Bozuksa ilgili soruların bbox'ları extraction'da düzeltilir (Task 6 çıktısı), script tekrar koşulur.

- [ ] **Step 3: Commit**

```bash
git add scripts/sat/crop-figures.mjs
git commit -m "feat(sat): figur kirpma scripti"
```

---

### Task 8: Birleştirme + doğrulama (`scripts/sat/validate-bank.mjs`)

**Files:**
- Create: `scripts/sat/validate-bank.mjs`

Bağımlılık: Task 2, 3 (tam), 6+ (math kısmi olabilir — script kısmi veriyle de rapor verir).

- [ ] **Step 1: Script'i yaz**

```js
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { OUT_ROOT, readJson, writeJson } from "./lib.mjs";

const LETTER = /^[A-D]$/;
const NUMERIC = /^-?\d+(?:\.\d+)?(?:\/\d+)?$/;
const failures = [];
const warnings = [];

const { answers, missingKeys } = readJson(join(OUT_ROOT, "answers.json"));
// RW cikarma ertelendi (Kerem 2026-07-03); dosya yoksa bos kabul et
const rwPath = join(OUT_ROOT, "rw-questions.json");
const rw = existsSync(rwPath) ? readJson(rwPath).questions : [];
const mathManifest = readJson(join(OUT_ROOT, "math-manifest.json")).manifest;

const mathDir = join(OUT_ROOT, "math-questions");
const math = existsSync(mathDir)
  ? readdirSync(mathDir).filter((f) => f.endsWith(".json")).flatMap((f) => readJson(join(mathDir, f)))
  : [];

const all = [...rw, ...math];
const seen = new Set();
const excluded = [];
const bank = [];

// Eksik anahtar dosyasının soruları hangi source_file'a denk geliyor?
const missingKeySources = new Set(missingKeys.map((k) => `${k}.pdf`));

for (const q of all) {
  if (seen.has(q.id)) { failures.push(`Tekrarli id: ${q.id}`); continue; }
  seen.add(q.id);

  for (const field of ["id", "section", "domain", "skill", "skill_slug", "difficulty", "question_type", "prompt", "source_file"]) {
    if (q[field] === undefined || q[field] === null || q[field] === "") failures.push(`${q.id}: ${field} eksik`);
  }

  if (q.question_type === "mcq") {
    const keys = Object.keys(q.choices ?? {});
    if (keys.sort().join("") !== "ABCD") failures.push(`${q.id}: mcq ama 4 sik yok`);
    else if (Object.values(q.choices).some((c) => !String(c).trim())) failures.push(`${q.id}: bos sik metni`);
  } else if (q.question_type === "spr") {
    if (q.choices) failures.push(`${q.id}: spr ama choices dolu`);
  } else {
    failures.push(`${q.id}: gecersiz question_type ${q.question_type}`);
  }

  const key = answers[q.id];
  if (!key) {
    if (missingKeySources.has(q.source_file)) { excluded.push(q.id); continue; }
    failures.push(`${q.id}: cevap anahtari yok (${q.source_file})`);
    continue;
  }
  if (q.question_type === "mcq" && !(key.answer.length === 1 && LETTER.test(key.answer[0]))) {
    failures.push(`${q.id}: mcq ama anahtar harf degil (${key.answer.join(",")})`);
    continue;
  }
  if (q.question_type === "spr" && !key.answer.every((a) => NUMERIC.test(a))) {
    failures.push(`${q.id}: spr ama anahtar sayisal degil (${key.answer.join(",")})`);
    continue;
  }
  // Para isaretleri \$ ile kacisli olmali; kacissiz $ sayisi cift degilse LaTeX bozuk demektir
  const texts = [q.prompt, ...(q.choices ? Object.values(q.choices) : [])];
  for (const t of texts) {
    if (((String(t).replaceAll("\\$", "").match(/\$/g) ?? []).length % 2) !== 0) {
      failures.push(`${q.id}: dengesiz $ (para icin \\$ kullanilmali)`);
    }
  }

  if (q.figure && !q.figure_path) warnings.push(`${q.id}: figure var ama kirpilmamis (once crop-figures calistir)`);
  if (q.figure_path && !existsSync(join(OUT_ROOT, q.figure_path))) failures.push(`${q.id}: figure_path dosyasi yok`);

  bank.push({ ...q, correct_answer: key.answer, figure: undefined });
}

// Sayı mutabakatı
const expectedMath = mathManifest.length;
const gotMathIds = new Set(math.map((q) => q.id));
const missingMath = mathManifest.filter((m) => !gotMathIds.has(m.id)).length;
console.log(`RW: ${rw.length} | Math extract: ${math.length}/${expectedMath} (eksik ${missingMath})`);
console.log(`Bank: ${bank.length} soru | Import disi (eksik anahtar): ${excluded.length}`);
console.log(`needs_review: ${bank.filter((q) => q.needs_review).length}`);
console.log(`HATA: ${failures.length} | UYARI: ${warnings.length}`);
for (const f of failures.slice(0, 30)) console.log(`  FAIL ${f}`);
for (const w of warnings.slice(0, 10)) console.log(`  WARN ${w}`);

writeJson(join(OUT_ROOT, "bank.json"), { bank, excluded, failures, warnings });
process.exitCode = failures.length > 0 ? 1 : 0;
```

- [ ] **Step 2: Mevcut veriyle çalıştır**

Run: `node scripts/sat/validate-bank.mjs`
Expected: RW 589 tam; math pilot kadar; HATA 0 hedef (varsa kaynağına göre Task 2/3/6 çıktıları düzeltilir). `bank.json` üretilir.

- [ ] **Step 3: Commit**

```bash
git add scripts/sat/validate-bank.mjs
git commit -m "feat(sat): banka birlestirme ve dogrulama scripti"
```

---

### Task 9: Toplu math extraction (dalga dalga) — pilot onayı ŞART

Bağımlılık: Task 6'da Kerem onayı alınmış olmalı.

- [ ] **Step 1:** Kalan tüm math skill'leri için runbook'u uygula (Task 6 ile aynı yöntem). Dalga başına en fazla 5-10 paralel alt görev; her dalga sonunda `node scripts/sat/validate-bank.mjs` koş.
- [ ] **Step 2:** Tamamlanınca: `node scripts/sat/crop-figures.mjs && node scripts/sat/validate-bank.mjs`
Expected: `Math extract: 821/821`, HATA 0. `needs_review` sorularının listesini Kerem raporuna ekle (Kerem örneklem inceleyecek; düzeltmeler ilgili JSON dosyasında yapılır ve validate tekrar koşulur).

---

## Bölüm B — Veritabanı

### Task 10: Supabase şeması (`supabase/sat_bank.sql`) — KEREM ONAY KAPISI

**Files:**
- Create: `supabase/sat_bank.sql`

- [ ] **Step 1: SQL dosyasını yaz**

```sql
-- sat_bank: SAT soru bankasi tablolari (bkz. specs/2026-07-03-sat-soru-bankasi-design.md)
-- Uygulama: Kerem onayi sonrasi Supabase Dashboard > SQL Editor'de calistir.

begin;

create table if not exists public.sat_questions (
  id text primary key,
  section text not null check (section in ('math', 'reading-writing')),
  domain text not null,
  skill text not null,
  skill_slug text not null,
  difficulty int not null check (difficulty in (1, 2, 3)),
  question_type text not null check (question_type in ('mcq', 'spr')),
  prompt text not null,
  choices jsonb,
  correct_answer jsonb not null,
  figure_path text,
  explanation_tr text,
  source_file text not null,
  needs_review boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sat_questions_skill_idx on public.sat_questions (section, skill_slug, difficulty);

alter table public.sat_questions enable row level security;
-- Bilincli olarak HICBIR select policy yok: korumali icerik yalnizca service role
-- (server API route) uzerinden okunur. Anon/authenticated dogrudan okuyamaz.
revoke all on public.sat_questions from anon;
revoke all on public.sat_questions from authenticated;

create table if not exists public.sat_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  question_id text not null references public.sat_questions (id),
  selected_answer text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default timezone('utc', now())
);

create index if not exists sat_attempts_user_idx on public.sat_attempts (user_id, question_id);

alter table public.sat_attempts enable row level security;

drop policy if exists "sat_attempts_select_own" on public.sat_attempts;
create policy "sat_attempts_select_own"
on public.sat_attempts
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "sat_attempts_insert_own" on public.sat_attempts;
create policy "sat_attempts_insert_own"
on public.sat_attempts
for insert
to authenticated
with check (user_id = public.requesting_user_id());

revoke all on public.sat_attempts from anon;
grant select, insert on public.sat_attempts to authenticated;

commit;
```

- [ ] **Step 2: Kerem'den prod onayı al ve uygula**

Kerem'e "sat_bank.sql prod'a uygulanacak" diye onay sor. Onay sonrası Supabase MCP `apply_migration` ile veya Dashboard SQL Editor'de çalıştır. Storage'da `sat-figures` bucket'ı da bu adımda oluşturulur (public read; import script'i yoksa kendisi de oluşturur).

- [ ] **Step 3: Commit**

```bash
git add supabase/sat_bank.sql
git commit -m "feat(sat): sat_questions ve sat_attempts semasi"
```

---

### Task 11: Import script'i (`scripts/sat/import-bank.mjs`)

**Files:**
- Create: `scripts/sat/import-bank.mjs`

Bağımlılık: Task 8 (bank.json), Task 10 (tablolar). Env: `.env.local` içinde `SUPABASE_SERVICE_ROLE_KEY` (Kerem Supabase Dashboard > Settings > API'den alır; Vercel'e de server-only env olarak eklenir).

- [ ] **Step 1: Script'i yaz**

```js
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OUT_ROOT, readJson } from "./lib.mjs";

// .env.local'dan oku (dotenv bagimliligi eklemeden)
function loadEnvLocal() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {}
  return env;
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { bank, failures } = readJson(join(OUT_ROOT, "bank.json"));
if (failures.length > 0) {
  console.error(`bank.json ${failures.length} hata iceriyor; once validate-bank temiz gecmeli.`);
  process.exit(1);
}

// 1) Figurleri yukle
const figures = bank.filter((q) => q.figure_path);
const { data: buckets } = await supabase.storage.listBuckets();
if (!buckets?.some((b) => b.name === "sat-figures")) {
  const { error } = await supabase.storage.createBucket("sat-figures", { public: true });
  if (error) { console.error("Bucket olusturulamadi:", error.message); process.exit(1); }
}
let uploaded = 0;
for (const q of figures) {
  const file = readFileSync(join(OUT_ROOT, q.figure_path));
  const { error } = await supabase.storage
    .from("sat-figures")
    .upload(`${q.id}.webp`, file, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
  if (error) { console.error(`Figur upload hatasi ${q.id}: ${error.message}`); process.exit(1); }
  uploaded++;
}

// 2) Sorulari chunk'lar halinde upsert et
const rows = bank.map((q) => ({
  id: q.id,
  section: q.section,
  domain: q.domain,
  skill: q.skill,
  skill_slug: q.skill_slug,
  difficulty: q.difficulty,
  question_type: q.question_type,
  prompt: q.prompt,
  choices: q.choices ?? null,
  correct_answer: q.correct_answer,
  figure_path: q.figure_path ? `${q.id}.webp` : null,
  source_file: q.source_file,
  needs_review: Boolean(q.needs_review),
}));

for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500);
  const { error } = await supabase.from("sat_questions").upsert(chunk, { onConflict: "id" });
  if (error) { console.error(`Upsert hatasi (chunk ${i}): ${error.message}`); process.exit(1); }
}

const { count } = await supabase.from("sat_questions").select("id", { count: "exact", head: true });
console.log(`Import tamam: ${rows.length} soru upsert edildi, DB toplam: ${count}, figur: ${uploaded}`);
```

- [ ] **Step 2: Çalıştır ve doğrula**

Run: `node scripts/sat/import-bank.mjs`
Expected: `Import tamam: <bank sayısı> soru ... DB toplam: <aynı sayı>`. Pilot aşamasında kısmi sayıyla da çalıştırılabilir (idempotent upsert); tam veri Task 9 sonrası tekrar koşulur.

- [ ] **Step 3: Commit**

```bash
git add scripts/sat/import-bank.mjs
git commit -m "feat(sat): supabase import scripti"
```

---

## Bölüm C — Uygulama Yüzeyi

Bölüm C görevleri (12-18) Bölüm A'nın tamamlanmasını BEKLEMEZ; Task 10 (şema) sonrası başlanabilir. Task 20 uçtan uca test için import edilmiş pilot verisi yeterlidir.

### Task 12: Tipler ve SPR cevap eşleştirme (`types/index.ts`, `lib/sat/types.ts`, `lib/sat/answers.ts`)

**Files:**
- Modify: `types/index.ts` (dosya sonuna ekle)
- Create: `lib/sat/types.ts`
- Create: `lib/sat/answers.ts`

- [ ] **Step 1: `types/index.ts` sonuna Supabase row interface'leri ekle**

```ts
export interface SatQuestionRow {
  id: string;
  section: string;
  domain: string;
  skill: string;
  skill_slug: string;
  difficulty: number;
  question_type: string;
  prompt: string;
  choices: Record<string, string> | null;
  correct_answer: string[] | null;
  figure_path: string | null;
  explanation_tr: string | null;
  needs_review: boolean | null;
}

export interface SatAttemptRow {
  id?: string;
  user_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  answered_at?: string;
}
```

- [ ] **Step 2: `lib/sat/types.ts` yaz**

```ts
export type SatSection = "math" | "reading-writing";
export type SatQuestionType = "mcq" | "spr";
export type SatDifficulty = 1 | 2 | 3;
export type SatChoiceKey = "A" | "B" | "C" | "D";

export interface SatQuestion {
  id: string;
  section: SatSection;
  domain: string;
  skill: string;
  skillSlug: string;
  difficulty: SatDifficulty;
  questionType: SatQuestionType;
  prompt: string;
  choices: Record<SatChoiceKey, string> | null;
  correctAnswer: string[];
  figureUrl: string | null;
}

export interface SatTopic {
  section: SatSection;
  domain: string;
  skill: string;
  skillSlug: string;
  questionCount: number;
  difficultyCounts: Record<SatDifficulty, number>;
  // Konu satirinda kullanici ilerlemesini (attempts ile kesisim) hesaplamak icin.
  // Id listesi kucuktur (~8 bayt/soru); egress acisindan kabul edilebilir.
  questionIds: string[];
}
```

- [ ] **Step 3: `lib/sat/answers.ts` yaz (saf fonksiyonlar; UI ve olası gelecekteki server doğrulaması ortak kullanır)**

```ts
// SPR (sayi girisli) cevap normalizasyonu ve eslestirme.
// Kabul edilen yazimlar: tam sayi (-12), ondalik (0.75 / .75), kesir (3/4).
export function parseNumeric(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;

  const fractionMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return null;
    return Number(fractionMatch[1]) / denominator;
  }

  const numberMatch = trimmed.match(/^-?(?:\d+\.?\d*|\.\d+)$/);
  if (!numberMatch) return null;
  return Number(trimmed);
}

const TOLERANCE = 1e-4;

export function isSprAnswerCorrect(input: string, accepted: string[]): boolean {
  const inputValue = parseNumeric(input);
  if (inputValue === null) return false;

  return accepted.some((candidate) => {
    const candidateValue = parseNumeric(candidate);
    return candidateValue !== null && Math.abs(candidateValue - inputValue) <= TOLERANCE;
  });
}

export function isMcqAnswerCorrect(selected: string, accepted: string[]): boolean {
  return accepted.includes(selected);
}
```

- [ ] **Step 4: Derleme kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok (mevcut hatalar varsa yalnızca yeni dosyalardan hata gelmediğini doğrula).

- [ ] **Step 5: Commit**

```bash
git add types/index.ts lib/sat/types.ts lib/sat/answers.ts
git commit -m "feat(sat): tipler ve spr cevap eslestirme"
```

---

### Task 13: Server veri katmanı + API route

**Files:**
- Create: `lib/sat/questions.server.ts`
- Create: `app/api/sat/questions/route.ts`

Desen kaynağı: `lib/universities.server.ts` (memo + single-flight + stale-on-error) — görevden önce oku.

- [ ] **Step 1: `lib/sat/questions.server.ts` yaz**

```ts
import { createClient } from "@supabase/supabase-js";

import type { SatDifficulty, SatQuestion, SatSection, SatTopic } from "@/lib/sat/types";
import type { SatQuestionRow } from "@/types";

const SAT_QUESTION_COLUMNS =
  "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,explanation_tr,needs_review";
const PAGE_SIZE = 1000;
// Egress guard: soru seti yalnizca manuel importla degisir; universities.server.ts
// ile ayni politika (3 saat memo + stale-on-error + single-flight).
const SERVER_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

let cachedBank: { data: SatQuestion[]; expiresAt: number } | null = null;
let inFlightRefresh: Promise<SatQuestion[]> | null = null;

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase URL veya service role key eksik.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function figurePublicUrl(figurePath: string | null): string | null {
  if (!figurePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/sat-figures/${figurePath}`;
}

function createQuestion(row: SatQuestionRow): SatQuestion | null {
  if (!row.id || !row.prompt) return null;
  if (row.section !== "math" && row.section !== "reading-writing") return null;
  if (row.question_type !== "mcq" && row.question_type !== "spr") return null;
  if (![1, 2, 3].includes(row.difficulty)) return null;
  if (!Array.isArray(row.correct_answer) || row.correct_answer.length === 0) return null;

  const choices =
    row.question_type === "mcq" && row.choices
      ? {
          A: String(row.choices.A ?? ""),
          B: String(row.choices.B ?? ""),
          C: String(row.choices.C ?? ""),
          D: String(row.choices.D ?? ""),
        }
      : null;
  if (row.question_type === "mcq" && (!choices || Object.values(choices).some((c) => !c))) return null;

  return {
    id: row.id,
    section: row.section as SatSection,
    domain: row.domain,
    skill: row.skill,
    skillSlug: row.skill_slug,
    difficulty: row.difficulty as SatDifficulty,
    questionType: row.question_type,
    prompt: row.prompt,
    choices,
    correctAnswer: row.correct_answer.map(String),
    figureUrl: figurePublicUrl(row.figure_path),
  };
}

async function fetchAllRows(): Promise<SatQuestionRow[]> {
  const supabase = createServiceRoleClient();
  const rows: SatQuestionRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sat_questions")
      .select(SAT_QUESTION_COLUMNS)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<SatQuestionRow[]>();

    if (error) throw new Error(`sat_questions fetch hatasi: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function getSatBank(): Promise<SatQuestion[]> {
  if (cachedBank && cachedBank.expiresAt > Date.now()) {
    return cachedBank.data;
  }

  if (!inFlightRefresh) {
    const refresh = (async () => {
      const rows = await fetchAllRows();
      const questions = rows
        .map(createQuestion)
        .filter((q): q is SatQuestion => q !== null);
      cachedBank = { data: questions, expiresAt: Date.now() + SERVER_CACHE_TTL_MS };
      return questions;
    })();

    inFlightRefresh = refresh;
    refresh
      .catch(() => {})
      .finally(() => {
        if (inFlightRefresh === refresh) inFlightRefresh = null;
      });
  }

  try {
    return await inFlightRefresh;
  } catch (error) {
    if (cachedBank) {
      console.error("sat_questions fetch basarisiz; bayat memo sunuluyor:", error);
      return cachedBank.data;
    }
    throw error;
  }
}

export async function getSatTopics(): Promise<SatTopic[]> {
  const bank = await getSatBank();
  const topics = new Map<string, SatTopic>();

  for (const q of bank) {
    const key = `${q.section}/${q.skillSlug}`;
    const topic = topics.get(key) ?? {
      section: q.section,
      domain: q.domain,
      skill: q.skill,
      skillSlug: q.skillSlug,
      questionCount: 0,
      difficultyCounts: { 1: 0, 2: 0, 3: 0 },
      questionIds: [],
    };
    topic.questionCount++;
    topic.difficultyCounts[q.difficulty]++;
    topic.questionIds.push(q.id);
    topics.set(key, topic);
  }

  return [...topics.values()].sort((a, b) =>
    a.section === b.section ? a.skill.localeCompare(b.skill) : a.section.localeCompare(b.section)
  );
}

export async function getSatQuestions(section: SatSection, skillSlug: string): Promise<SatQuestion[]> {
  const bank = await getSatBank();
  return bank
    .filter((q) => q.section === section && q.skillSlug === skillSlug)
    .sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
}
```

- [ ] **Step 2: `app/api/sat/questions/route.ts` yaz**

```ts
import { getSatQuestions, getSatTopics } from "@/lib/sat/questions.server";

// Bu route proxy.ts public listesinde DEGIL -> Clerk middleware korur.
// Icerik korumali (College Board sorulari): public listeye asla ekleme.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const section = url.searchParams.get("section");
    const skill = url.searchParams.get("skill");

    if (!section && !skill) {
      const topics = await getSatTopics();
      return new Response(JSON.stringify({ topics }), { headers: NO_STORE_HEADERS });
    }

    if ((section !== "math" && section !== "reading-writing") || !skill) {
      return new Response(JSON.stringify({ error: "Gecersiz parametre." }), {
        status: 400,
        headers: NO_STORE_HEADERS,
      });
    }

    const questions = await getSatQuestions(section, skill);
    if (questions.length === 0) {
      return new Response(JSON.stringify({ error: "Konu bulunamadi." }), {
        status: 404,
        headers: NO_STORE_HEADERS,
      });
    }

    return new Response(JSON.stringify({ questions }), { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("SAT questions API hatasi:", error);
    return new Response(JSON.stringify({ error: "Soru bankasi su anda kullanilamiyor." }), {
      status: 503,
      headers: NO_STORE_HEADERS,
    });
  }
}
```

- [ ] **Step 3: Derleme + canlı doğrulama**

Run: `npx tsc --noEmit`
Expected: hata yok.
`.env.local`'da `SUPABASE_SERVICE_ROLE_KEY` varsa ve pilot import yapıldıysa: dev server aç, giriş yaptıktan sonra tarayıcıda `/api/sat/questions` → topics JSON dönmeli. Giriş yapmadan → `/giris`'e yönlenmeli (middleware).

- [ ] **Step 4: Commit**

```bash
git add lib/sat/questions.server.ts app/api/sat/questions/route.ts
git commit -m "feat(sat): server veri katmani ve protected soru API'si"
```

---

### Task 14: KaTeX + `components/sat/MathText.tsx`

**Files:**
- Create: `components/sat/MathText.tsx`
- Modify: `package.json` (dependency: `katex`)

- [ ] **Step 1: katex kur**

Run: `npm install katex`

- [ ] **Step 2: Bileşeni yaz**

```tsx
"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

// prompt/choices metinlerindeki $...$ bolumlerini KaTeX ile render eder.
// Veri sozlesmesi: para tutarlari `\$` ile kacislidir (or. \$2.00); kacisli
// dolar metin olarak basilir, ciplak $ ciftleri matematik sinirlayicidir.
// Metin pipeline'imizdan gelir (guvenilir kaynak); yine de metin kisimlari
// React text node olarak basilir, yalnizca KaTeX HTML'i dangerouslySetInnerHTML alir.
const ESCAPED_DOLLAR = " ";

export default function MathText({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(
    () => text.replaceAll("\\$", ESCAPED_DOLLAR).split(/(\$[^$]+\$)/g),
    [text]
  );

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.startsWith("$") && segment.endsWith("$") && segment.length > 2) {
          const tex = segment.slice(1, -1).replaceAll(ESCAPED_DOLLAR, "\\$");
          let html: string;
          try {
            html = katex.renderToString(tex, { throwOnError: true });
          } catch {
            return <span key={index}>{tex}</span>;
          }
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <span key={index}>{segment.replaceAll(ESCAPED_DOLLAR, "$")}</span>;
      })}
    </span>
  );
}
```

- [ ] **Step 3: Derleme kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok. (katex kendi TS tiplerini taşır; `@types/katex` GEREKMEZ.)

- [ ] **Step 4: Commit**

```bash
git add components/sat/MathText.tsx package.json package-lock.json
git commit -m "feat(sat): katex tabanli MathText bileseni"
```

---

### Task 15: Client hook'ları (`lib/sat/useSatBank.ts`, `lib/sat/useSatAttempts.ts`)

**Files:**
- Create: `lib/sat/useSatBank.ts`
- Create: `lib/sat/useSatAttempts.ts`

Desen kaynakları: `lib/useUniversitiesData.ts` (fetch + module cache + dedupe), `lib/useFavorites.ts` (Clerk JWT'li Supabase + optimistic) — görevden önce ikisini de oku.

- [ ] **Step 1: `lib/sat/useSatBank.ts` yaz**

```ts
"use client";

import { useEffect, useState } from "react";

import type { SatQuestion, SatSection, SatTopic } from "@/lib/sat/types";

let topicsCache: SatTopic[] | null = null;
let topicsRequest: Promise<SatTopic[]> | null = null;
const questionsCache = new Map<string, SatQuestion[]>();

async function fetchTopics(): Promise<SatTopic[]> {
  if (topicsCache) return topicsCache;
  if (!topicsRequest) {
    topicsRequest = fetch("/api/sat/questions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("SAT topics fetch failed");
        const payload = (await response.json()) as { topics: SatTopic[] };
        topicsCache = payload.topics;
        return payload.topics;
      })
      .finally(() => {
        topicsRequest = null;
      });
  }
  return topicsRequest;
}

export function useSatTopics() {
  const [topics, setTopics] = useState<SatTopic[]>(() => topicsCache ?? []);
  const [loading, setLoading] = useState(!topicsCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTopics()
      .then((data) => {
        if (!active) return;
        setTopics(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Beklenmeyen hata");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { topics, loading, error };
}

export async function fetchSatQuestions(section: SatSection, skillSlug: string): Promise<SatQuestion[]> {
  const key = `${section}/${skillSlug}`;
  const cached = questionsCache.get(key);
  if (cached) return cached;

  const response = await fetch(
    `/api/sat/questions?section=${encodeURIComponent(section)}&skill=${encodeURIComponent(skillSlug)}`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error("SAT questions fetch failed");
  const payload = (await response.json()) as { questions: SatQuestion[] };
  questionsCache.set(key, payload.questions);
  return payload.questions;
}
```

- [ ] **Step 2: `lib/sat/useSatAttempts.ts` yaz**

```ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

import { createClerkSupabaseClient } from "@/lib/supabaseClient";
import type { SatAttemptRow } from "@/types";

export interface SatAttemptState {
  selectedAnswer: string;
  isCorrect: boolean;
}

// question_id -> son deneme
export function useSatAttempts() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [attempts, setAttempts] = useState<Map<string, SatAttemptState>>(new Map());
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(
    () =>
      createClerkSupabaseClient(async () => {
        try {
          return await getToken({ template: "supabase" });
        } catch {
          return null;
        }
      }),
    [getToken]
  );

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        if (!user) {
          if (active) setAttempts(new Map());
          return;
        }
        const { data, error } = await supabase
          .from("sat_attempts")
          .select("question_id,selected_answer,is_correct,answered_at")
          .eq("user_id", user.id)
          .order("answered_at", { ascending: true })
          .returns<SatAttemptRow[]>();
        if (error) throw error;

        if (active) {
          const map = new Map<string, SatAttemptState>();
          for (const row of data ?? []) {
            map.set(row.question_id, { selectedAnswer: row.selected_answer, isCorrect: row.is_correct });
          }
          setAttempts(map);
        }
      } catch (err) {
        console.error("SAT attempts yukleme hatasi:", err);
        if (active) setAttempts(new Map());
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, isLoaded, supabase]);

  const recordAttempt = useCallback(
    async (questionId: string, selectedAnswer: string, isCorrect: boolean) => {
      if (!user) return;
      const previous = attempts;

      const next = new Map(previous);
      next.set(questionId, { selectedAnswer, isCorrect });
      setAttempts(next);

      const { error } = await supabase.from("sat_attempts").insert([
        { user_id: user.id, question_id: questionId, selected_answer: selectedAnswer, is_correct: isCorrect },
      ]);
      if (error) {
        console.error("SAT attempt kayit hatasi:", error);
        setAttempts(previous);
      }
    },
    [attempts, user, supabase]
  );

  return { attempts, recordAttempt, loading };
}
```

- [ ] **Step 3: Derleme kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok.

- [ ] **Step 4: Commit**

```bash
git add lib/sat/useSatBank.ts lib/sat/useSatAttempts.ts
git commit -m "feat(sat): client soru ve deneme hook'lari"
```

---

### Task 16: Çeviriler (`lib/translations.ts`)

**Files:**
- Modify: `lib/translations.ts`

- [ ] **Step 1:** `tr` objesine `sat` namespace'i ekle (mevcut `hub` benzeri namespace'lerin yanına):

```ts
sat: {
  title: "SAT Soru Bankası",
  subtitle: "1400+ resmi soruyla konu konu pratik yap; ilerlemen kaydedilsin.",
  mathSection: "Matematik",
  rwSection: "Okuma ve Yazma",
  questionsLabel: "soru",
  solvedLabel: "çözüldü",
  correctLabel: "doğru",
  difficultyEasy: "Kolay",
  difficultyMedium: "Orta",
  difficultyHard: "Zor",
  startTopic: "Çözmeye Başla",
  continueTopic: "Devam Et",
  checkAnswer: "Cevabı Kontrol Et",
  nextQuestion: "Sonraki Soru",
  finishTopic: "Konuyu Bitir",
  correctFeedback: "Doğru!",
  wrongFeedback: "Yanlış — doğru cevap:",
  sprPlaceholder: "Cevabını yaz (ör. 12 veya 3/4)",
  sprHint: "Sayı veya kesir girebilirsin.",
  summaryTitle: "Konu Özeti",
  summaryBody: "sorudan",
  summaryCorrect: "doğru",
  backToTopics: "Konulara Dön",
  retryTopic: "Tekrar Çöz",
  loadError: "Sorular yüklenemedi. Lütfen tekrar dene.",
  figureAlt: "Soru görseli",
  emptyBank: "Soru bankası hazırlanıyor; çok yakında burada.",
},
```

- [ ] **Step 2:** `en` objesine aynı anahtarların İngilizce karşılıklarını ekle:

```ts
sat: {
  title: "SAT Question Bank",
  subtitle: "Practice topic by topic with 1400+ official questions; your progress is saved.",
  mathSection: "Math",
  rwSection: "Reading and Writing",
  questionsLabel: "questions",
  solvedLabel: "solved",
  correctLabel: "correct",
  difficultyEasy: "Easy",
  difficultyMedium: "Medium",
  difficultyHard: "Hard",
  startTopic: "Start Practicing",
  continueTopic: "Continue",
  checkAnswer: "Check Answer",
  nextQuestion: "Next Question",
  finishTopic: "Finish Topic",
  correctFeedback: "Correct!",
  wrongFeedback: "Incorrect — correct answer:",
  sprPlaceholder: "Type your answer (e.g. 12 or 3/4)",
  sprHint: "You can enter a number or a fraction.",
  summaryTitle: "Topic Summary",
  summaryBody: "questions,",
  summaryCorrect: "correct",
  backToTopics: "Back to Topics",
  retryTopic: "Practice Again",
  loadError: "Questions could not be loaded. Please try again.",
  figureAlt: "Question figure",
  emptyBank: "The question bank is being prepared; coming very soon.",
},
```

- [ ] **Step 3:** `navbar` altına her iki dilde `sat` anahtarı ekle: TR `sat: "SAT Bankası"`, EN `sat: "SAT Bank"`. (Not: `navbar.exams` anahtarı translations'ta var ama hiçbir bileşende kullanılmıyor; dokunma.)

- [ ] **Step 4:** Run: `npx tsc --noEmit` — Expected: hata yok (translations tipi her iki dilde aynı anahtarları zorunlu kılar; eksik anahtar burada patlar).

- [ ] **Step 5: Commit**

```bash
git add lib/translations.ts
git commit -m "feat(sat): sat ceviri namespace'i (tr/en)"
```

---### Task 17: `/sat` sayfası ve UI bileşenleri

**Files:**
- Create: `app/sat/page.tsx`
- Create: `components/sat/SatBankExplorer.tsx`
- Create: `components/sat/TopicRow.tsx`
- Create: `components/sat/QuestionCard.tsx`
- Create: `components/sat/SessionSummary.tsx`

Bağımlılık: Task 12, 14, 15, 16. **Editorial stil uyumu:** koda başlamadan `components/hub/ProfileStrip.tsx`, `components/hub/CompactStatCard.tsx` ve `app/hub/page.tsx` dosyalarını aç; oradaki renk token'larını, border ve tipografi sınıflarını AYNEN kullan (paper/sage/terracotta paleti, serif başlık, keskin border). Aşağıdaki kodlarda `className` değerleri iskelettir; hub bileşenlerindeki gerçek token'larla hizala. Gradient/sparkle ekleme.

- [ ] **Step 1: `app/sat/page.tsx` yaz** (`app/hub/page.tsx` deseninde protected client sayfa; Navbar + içerik + Footer kompozisyonunu hub sayfasının yaptığı gibi kur)

```tsx
"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SatBankExplorer from "@/components/sat/SatBankExplorer";

export default function SatPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <SatBankExplorer />
      </main>
      <Footer />
    </>
  );
}
```

(Not: hub sayfası Navbar/Footer'ı farklı kuruyorsa aynı kompozisyonu birebir uygula.)

- [ ] **Step 2: `components/sat/TopicRow.tsx` yaz**

```tsx
"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { SatTopic } from "@/lib/sat/types";

interface TopicRowProps {
  topic: SatTopic;
  solvedCount: number;
  correctCount: number;
  onSelect: () => void;
}

export default function TopicRow({ topic, solvedCount, correctCount, onSelect }: TopicRowProps) {
  const { t } = useLanguage();
  const started = solvedCount > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-4 border-b px-4 py-4 text-left transition-colors hover:bg-black/[0.03]"
    >
      <div>
        <p className="font-medium">{topic.skill}</p>
        <p className="text-sm opacity-70">
          {topic.questionCount} {t.sat.questionsLabel}
          {started ? ` · ${solvedCount} ${t.sat.solvedLabel} · ${correctCount} ${t.sat.correctLabel}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-sm underline underline-offset-4">
        {started ? t.sat.continueTopic : t.sat.startTopic}
      </span>
    </button>
  );
}
```

- [ ] **Step 3: `components/sat/QuestionCard.tsx` yaz**

```tsx
"use client";

import { useState } from "react";

import MathText from "@/components/sat/MathText";
import { useLanguage } from "@/context/LanguageContext";
import { isMcqAnswerCorrect, isSprAnswerCorrect } from "@/lib/sat/answers";
import type { SatChoiceKey, SatQuestion } from "@/lib/sat/types";

const CHOICE_KEYS: SatChoiceKey[] = ["A", "B", "C", "D"];
const DIFFICULTY_LABEL_KEYS = { 1: "difficultyEasy", 2: "difficultyMedium", 3: "difficultyHard" } as const;

interface QuestionCardProps {
  question: SatQuestion;
  onAnswered: (selectedAnswer: string, isCorrect: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}

export default function QuestionCard({ question, onAnswered, onNext, isLast }: QuestionCardProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const [sprInput, setSprInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  const answered = result !== null;

  function submit(answer: string) {
    if (answered || !answer.trim()) return;
    const correct =
      question.questionType === "mcq"
        ? isMcqAnswerCorrect(answer, question.correctAnswer)
        : isSprAnswerCorrect(answer, question.correctAnswer);
    setSelected(answer);
    setResult(correct ? "correct" : "wrong");
    onAnswered(answer, correct);
  }

  return (
    <article className="border p-5">
      <header className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="border px-2 py-1">{question.domain} · {question.skill}</span>
        <span className="border px-2 py-1">{t.sat[DIFFICULTY_LABEL_KEYS[question.difficulty]]}</span>
      </header>

      <div className="mb-4 whitespace-pre-line leading-relaxed">
        <MathText text={question.prompt} />
      </div>

      {question.figureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={question.figureUrl} alt={t.sat.figureAlt} className="mb-4 max-w-full border" loading="lazy" />
      ) : null}

      {question.questionType === "mcq" && question.choices ? (
        <div className="grid gap-2">
          {CHOICE_KEYS.map((key) => {
            const isSelected = selected === key;
            const isCorrectChoice = answered && question.correctAnswer.includes(key);
            return (
              <button
                key={key}
                type="button"
                disabled={answered}
                onClick={() => submit(key)}
                className={`flex items-start gap-3 border px-4 py-3 text-left transition-colors ${
                  isCorrectChoice ? "border-green-700" : isSelected && result === "wrong" ? "border-red-700" : ""
                }`}
              >
                <span className="font-medium">{key}</span>
                <MathText text={question.choices?.[key] ?? ""} />
              </button>
            );
          })}
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(sprInput);
          }}
          className="flex flex-wrap items-center gap-3"
        >
          <input
            type="text"
            inputMode="decimal"
            value={sprInput}
            disabled={answered}
            onChange={(event) => setSprInput(event.target.value)}
            placeholder={t.sat.sprPlaceholder}
            className="border px-4 py-3"
            aria-label={t.sat.sprPlaceholder}
          />
          {!answered ? (
            <button type="submit" className="border px-4 py-3">{t.sat.checkAnswer}</button>
          ) : null}
          <p className="w-full text-xs opacity-70">{t.sat.sprHint}</p>
        </form>
      )}

      {answered ? (
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className={result === "correct" ? "text-green-800" : "text-red-800"}>
            {result === "correct" ? (
              t.sat.correctFeedback
            ) : (
              <>
                {t.sat.wrongFeedback} <MathText text={question.correctAnswer.join(", ")} />
              </>
            )}
          </p>
          <button type="button" onClick={onNext} className="border px-4 py-2">
            {isLast ? t.sat.finishTopic : t.sat.nextQuestion}
          </button>
        </footer>
      ) : null}
    </article>
  );
}
```

- [ ] **Step 4: `components/sat/SessionSummary.tsx` yaz**

```tsx
"use client";

import { useLanguage } from "@/context/LanguageContext";

interface SessionSummaryProps {
  total: number;
  correct: number;
  onBack: () => void;
  onRetry: () => void;
}

export default function SessionSummary({ total, correct, onBack, onRetry }: SessionSummaryProps) {
  const { t } = useLanguage();

  return (
    <section className="border p-6 text-center">
      <h2 className="mb-2 font-serif text-2xl">{t.sat.summaryTitle}</h2>
      <p className="mb-6">
        {total} {t.sat.summaryBody} {correct} {t.sat.summaryCorrect}
      </p>
      <div className="flex justify-center gap-3">
        <button type="button" onClick={onRetry} className="border px-4 py-2">{t.sat.retryTopic}</button>
        <button type="button" onClick={onBack} className="border px-4 py-2">{t.sat.backToTopics}</button>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: `components/sat/SatBankExplorer.tsx` yaz** (durum makinesi: konu listesi → soru oturumu → özet)

```tsx
"use client";

import { useState } from "react";

import QuestionCard from "@/components/sat/QuestionCard";
import SessionSummary from "@/components/sat/SessionSummary";
import TopicRow from "@/components/sat/TopicRow";
import { useLanguage } from "@/context/LanguageContext";
import { fetchSatQuestions, useSatTopics } from "@/lib/sat/useSatBank";
import { useSatAttempts } from "@/lib/sat/useSatAttempts";
import type { SatQuestion, SatSection, SatTopic } from "@/lib/sat/types";

type View =
  | { mode: "topics" }
  | { mode: "session"; topic: SatTopic; questions: SatQuestion[]; index: number; correctInSession: number }
  | { mode: "summary"; topic: SatTopic; total: number; correct: number };

export default function SatBankExplorer() {
  const { t } = useLanguage();
  const { topics, loading, error } = useSatTopics();
  const { attempts, recordAttempt } = useSatAttempts();
  const [view, setView] = useState<View>({ mode: "topics" });
  const [sessionError, setSessionError] = useState<string | null>(null);

  const sections: { key: SatSection; label: string }[] = [
    { key: "math", label: t.sat.mathSection },
    { key: "reading-writing", label: t.sat.rwSection },
  ];

  async function openTopic(topic: SatTopic) {
    setSessionError(null);
    try {
      const questions = await fetchSatQuestions(topic.section, topic.skillSlug);
      setView({ mode: "session", topic, questions, index: 0, correctInSession: 0 });
    } catch {
      setSessionError(t.sat.loadError);
    }
  }

  if (view.mode === "session") {
    const question = view.questions[view.index];
    const isLast = view.index === view.questions.length - 1;
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="mb-4 text-sm opacity-70">
          {view.topic.skill} · {view.index + 1}/{view.questions.length}
        </p>
        <QuestionCard
          key={question.id}
          question={question}
          isLast={isLast}
          onAnswered={(selectedAnswer, isCorrect) => {
            void recordAttempt(question.id, selectedAnswer, isCorrect);
            if (isCorrect) setView({ ...view, correctInSession: view.correctInSession + 1 });
          }}
          onNext={() => {
            if (isLast) {
              setView({ mode: "summary", topic: view.topic, total: view.questions.length, correct: view.correctInSession });
            } else {
              setView({ ...view, index: view.index + 1 });
            }
          }}
        />
      </div>
    );
  }

  if (view.mode === "summary") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <SessionSummary
          total={view.total}
          correct={view.correct}
          onBack={() => setView({ mode: "topics" })}
          onRetry={() => void openTopic(view.topic)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl">{t.sat.title}</h1>
        <p className="mt-2 opacity-80">{t.sat.subtitle}</p>
      </header>

      {error ? <p className="border p-4">{t.sat.emptyBank}</p> : null}
      {sessionError ? <p className="border p-4 text-red-800">{sessionError}</p> : null}
      {loading ? <p className="p-4 opacity-70">…</p> : null}

      {sections.map((section) => {
        const sectionTopics = topics.filter((topic) => topic.section === section.key);
        if (sectionTopics.length === 0) return null;
        return (
          <section key={section.key} className="mb-10">
            <h2 className="mb-3 font-serif text-xl">{section.label}</h2>
            <div className="border">
              {sectionTopics.map((topic) => {
                const solved = topic.questionIds.filter((id) => attempts.has(id)).length;
                const correct = topic.questionIds.filter((id) => attempts.get(id)?.isCorrect).length;
                return (
                  <TopicRow
                    key={`${topic.section}-${topic.skillSlug}`}
                    topic={topic}
                    solvedCount={solved}
                    correctCount={correct}
                    onSelect={() => void openTopic(topic)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Derleme + görsel doğrulama**

Run: `npx tsc --noEmit && npm run lint`
Expected: hata yok. Dev server ile `/sat` aç (giriş yaparak): konu listesi gelmeli (pilot import edildiyse), bir konu aç, 1 mcq + 1 spr soru çöz, doğru/yanlış geri bildirimini ve özet ekranını gör. Mobil genişlikte (375px) şıkların tam genişlik ve dokunulabilir olduğunu kontrol et.

- [ ] **Step 7: Commit**

```bash
git add app/sat/page.tsx components/sat/
git commit -m "feat(sat): /sat soru cozme deneyimi"
```

---

### Task 18: Navigasyon + robots

**Files:**
- Modify: `components/Navbar.tsx`
- Modify: `app/robots.ts`
- Modify: `app/hub/page.tsx`

- [ ] **Step 1:** `components/Navbar.tsx` — signed-in link dizisine (mevcut `/hub` satırının yanına) ekle:

```ts
...(isSignedIn ? [{ href: "/sat", label: t.navbar.sat }] : []),
```

Dosyada `/hub` linkinin geçtiği İKİ yer var (desktop + mobil); ikisine de aynı biçimde ekle.

- [ ] **Step 2:** `app/robots.ts` — `disallow` dizisine `'/sat'` ekle:

```ts
disallow: ['/api/', '/ai-mentor', '/documents', '/favorites', '/giris', '/hub', '/sat', '/sign-in', '/sign-up'],
```

- [ ] **Step 3:** `app/hub/page.tsx` — kompakt favori/belge kartlarının olduğu bölüme SAT kartı ekle. Mevcut `CompactStatCard` bileşenini incele ve aynı desenle `/sat`'a giden bir kart ekle (başlık `t.sat.title`, alt metin `t.sat.subtitle`). Hub'ın mevcut düzenini bozma; kart mevcut kompakt kart grid'ine girer.

- [ ] **Step 4:** `proxy.ts`'e DOKUNMADIĞINI doğrula — `/sat` public listede olmamalı (varsayılan korumalı). `PROTECTED_PAGE_ROUTES` dizisine `"/sat"` ekle ki giriş yapmamış kullanıcı `/giris?redirect_url=/sat`'a yönlensin (aksi halde jenerik korumaya düşer):

```ts
const PROTECTED_PAGE_ROUTES = [
  "/ai-mentor",
  "/documents",
  "/favorites",
  "/hosgeldin",
  "/hub",
  "/profile",
  "/sat",
];
```

- [ ] **Step 5: Doğrula**

Run: `npm run check:routes`
Expected: PASS. Dev server'da çıkış yapmış halde `/sat` → `/giris?redirect_url=/sat`'a yönlenmeli.

- [ ] **Step 6: Commit**

```bash
git add components/Navbar.tsx app/robots.ts app/hub/page.tsx proxy.ts
git commit -m "feat(sat): navigasyon, hub karti ve robots disallow"
```

---

### Task 19: Guard script + dokümantasyon

**Files:**
- Create: `scripts/check-sat-bank.mjs`
- Modify: `package.json`
- Modify: `AGENT_CONTEXT.md`
- Modify: `AGENT_COMMITS.md`

- [ ] **Step 1: `scripts/check-sat-bank.mjs` yaz** (mevcut `scripts/check-university-data-source.mjs` deseninde metin tabanlı guard)

```js
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const failures = [];
function fail(message) { failures.push(message); }
function read(path) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

// 1) Route güvenliği
const proxy = read("proxy.ts");
if (/isPublicRoute[\s\S]*?\/sat/.test(proxy.split("PROTECTED_PAGE_ROUTES")[0])) {
  fail("proxy.ts: /sat public route listesinde olmamali");
}
if (!proxy.includes('"/sat"')) {
  fail("proxy.ts: /sat PROTECTED_PAGE_ROUTES icinde olmali");
}
const robots = read("app/robots.ts");
if (!robots.includes("'/sat'")) fail("app/robots.ts: /sat disallow listesinde olmali");

// 2) Server veri katmanı politikaları
const server = read("lib/sat/questions.server.ts");
if (!server.includes("SUPABASE_SERVICE_ROLE_KEY")) fail("questions.server.ts: service role key kullanmali");
if (server.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) fail("questions.server.ts: anon key KULLANMAMALI (korumali icerik)");
const ttlMatch = server.match(/SERVER_CACHE_TTL_MS = (\d+) \* 60 \* 60 \* 1000/);
if (!ttlMatch || Number(ttlMatch[1]) < 1 || Number(ttlMatch[1]) > 6) {
  fail("questions.server.ts: memo TTL 1-6 saat araliginda olmali");
}
if (!server.includes("bayat memo") && !server.includes("cachedBank.data")) {
  fail("questions.server.ts: stale-on-error davranisi olmali");
}

// 3) API route
const route = read("app/api/sat/questions/route.ts");
if (!route.includes("no-store")) fail("api/sat/questions: no-store header olmali");
if (!route.includes("force-dynamic")) fail("api/sat/questions: force-dynamic olmali");

// 4) Çeviri bütünlüğü
const translations = read("lib/translations.ts");
const satKeyCount = (translations.match(/\bsat:\s*{/g) ?? []).length;
if (satKeyCount < 2) fail("translations.ts: sat namespace hem tr hem en icinde olmali");

// 5) SQL sözleşmesi
const sql = read("supabase/sat_bank.sql");
for (const needle of [
  "revoke all on public.sat_questions from anon",
  "revoke all on public.sat_questions from authenticated",
  "sat_attempts_select_own",
  "sat_attempts_insert_own",
  "requesting_user_id()",
]) {
  if (!sql.includes(needle)) fail(`sat_bank.sql: "${needle}" eksik`);
}

// 6) UI dosyaları mevcut
for (const path of [
  "app/sat/page.tsx",
  "components/sat/SatBankExplorer.tsx",
  "components/sat/QuestionCard.tsx",
  "components/sat/MathText.tsx",
  "lib/sat/answers.ts",
]) {
  if (!existsSync(resolve(process.cwd(), path))) fail(`${path} eksik`);
}

if (failures.length > 0) {
  console.error("check:sat-bank FAIL");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("check:sat-bank PASS");
```

- [ ] **Step 2:** `package.json` scripts'e ekle: `"check:sat-bank": "node scripts/check-sat-bank.mjs"`

- [ ] **Step 3:** Run: `npm run check:sat-bank` — Expected: `check:sat-bank PASS`

- [ ] **Step 4:** `AGENT_CONTEXT.md` güncelle: (a) proje yapısı ağacına `app/sat/`, `components/sat/`, `lib/sat/`, `scripts/sat/`, `supabase/sat_bank.sql` satırları; (b) "Ozellik Mimarileri" altına kısa "SAT Soru Bankası" bölümü (protected /sat, service-role-only sorular, memo politikası, pipeline özeti, `npm run check:sat-bank`); (c) route matrix'e `/sat` protected örneği; (d) env tablosuna `SUPABASE_SERVICE_ROLE_KEY` satırı; (e) Komutlar listesine `check:sat-bank`. `AGENT_COMMITS.md`'ye tek satır özet ekle.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-sat-bank.mjs package.json AGENT_CONTEXT.md AGENT_COMMITS.md
git commit -m "chore(sat): guard scripti ve dokumantasyon"
```

---

### Task 20: Uçtan uca doğrulama

Bağımlılık: tüm önceki görevler (tam veri importu dahil — Task 9 + 11 bitmişse tam, değilse pilot veriyle).

- [ ] **Step 1:** Tüm check'leri koş:

Run: `npm run lint && npm run check:routes && npm run check:sat-bank && npm run check:university-data-source && npm run check:hub-onboarding && npm run build`
Expected: hepsi PASS; build temiz.

- [ ] **Step 2:** Dev server ile senaryo testi: (a) çıkış yapmış → `/sat` yönlendirmesi; (b) giriş → konu listesi ve sayılar; (c) mcq çöz: doğru/yanlış renkleri + doğru cevap gösterimi; (d) spr çöz: `3/4` ve `0.75` ikisi de doğru sayılmalı (aynı soruda); (e) kesirli LaTeX'in düzgün render olduğu bir soru; (f) figürlü bir soru (görsel yüklenmeli); (g) konu bitir → özet → "Tekrar Çöz"; (h) sayfayı yenile → çözülen konunun satırında ilerleme sayısı görünmeli (attempts DB'den geliyor); (i) mobil görünüm (375px).

- [ ] **Step 3:** Sonuç raporu: soru sayıları (DB toplam / import dışı), needs_review sayısı, eksik anahtar dosyası durumu, bilinen pürüzler. Kerem'e sun.

---

## Plan Öz-Denetim Notları

- Spec kapsama: veri modeli (T10, T12), pipeline 4 adım (T1-T9), egress/memo (T13), telif/route güvenliği (T13, T18, T19), SPR (T2, T12, T17), figürler (T4, T7, T11, T17), TR/EN (T16), hata durumları (T13, T17), doğrulama (T8, T19, T20), eksik anahtar (T2, T8), `explanation_tr` alanı boş rezerve (T10).
- Bilinçli v1 kabulleri (spec ile uyumlu): doğru cevap istemciye iner; RW grafikli sorular `needs_review` ile işaretlenip pilot incelemesinde ele alınır; deneme geçmişi append-only.
