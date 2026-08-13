# SAT Math English Rationale Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mevcut 1.019 SAT Math sorusundan resmî Unformatted answer-key kaynağıyla doğrudan eşleşen 806 soru için tam İngilizce `Rationale` metnini, görsel matematiği LaTeX'e çevirerek ve her kaydı bağımsız review'dan geçirerek Git dışı, checksum'lı bir veri paketine çıkarmak.

**Architecture:** Mekanik katman önce banka–kaynak kesişimini, PDF/sayfa izini, 40 soruluk pilotu ve 19 bulk wave'ini deterministik olarak dondurur. Üç kalıcı extractor kimliği (`A`, `B`, `C`) yalnızca kendilerine ait PDF shard'larını yazar; başka bir agent aynı kaynağı görsel olarak review eder, düzeltme özgün sahibine döner ve üçüncü agent re-review yapar. Pilot kullanıcı onayı olmadan 766 soruluk bulk fazı açılmaz; ürün kodu, DB, API ve UI bu planda hiç değişmez.

**Tech Stack:** Node.js `v24.13.0` (`.mjs`, standard library), mevcut `katex ^0.17.0` bağımlılığı (salt-okunur LaTeX parse kontrolü), `jq 1.7.1`, Poppler `26.06.0` (`pdfinfo`, `pdftotext`, `pdftoppm`), `shasum 6.02`, JSON, Codex görsel inceleme ve en fazla üç yardımcı agent.

## Global Constraints

- Yetkili tasarım: `docs/superpowers/specs/2026-07-24-sat-english-rationale-extraction-design.md`; her görevden önce bu spec okunur.
- Kaynak kök tam olarak `/Users/keremyarar/Desktop/SAT Question Bank PDFs`; rationale için yalnız `Question Bank (Unformatted)/Answer Keys/Math/` kullanılır.
- Hedef küme yalnız `tmp/sat-bank/bank.json` içindeki 1.019 Math ID ile 821 resmî rationale ID'sinin 806 elemanlı doğrudan kesişimidir; fuzzy/content eşlemesi yasaktır.
- `Area and Volume 1` kaynaklı mevcut banka dışı 20 soru, resmî rationale eşleşmesi olmayan 213 banka sorusu ve banka dışındaki 15 source ID bu extraction'a alınmaz.
- Çıktı İngilizce kalır; çeviri, özet, yeniden çözüm, metin iyileştirmesi veya kaynakta olmayan açıklama eklemek yasaktır.
- `Rationale` bölümü eksiksiz alınır: doğru cevap açıklaması ile yanlış seçenek açıklamaları korunur; `Correct Answer`, soru gövdesi ve `Question Difficulty` alınmaz.
- Yalnız yapay PDF satır kırımı, satır-sonu tirelemesi ve anlamsız fazla boşluk normalize edilir.
- Matematik görsel sayfadan okunur; inline `$...$`, blok `$$...$$` kullanılır. JSON kaynakta backslash çift kaçırılır (`\\frac`, `\\sqrt`, `\\$`); parse edilmiş metinde tek mantıksal backslash kalır.
- Okunamayan formül/simge tahmin edilmez. Böyle kayıt `needs_review=true` ile bloklanır ve correction + re-review tamamlanmadan kabul edilmez.
- Reviewer extractor ile aynı olamaz, shard'ı düzenleyemez ve kaynak görselini açmadan `approved` veremez.
- Correction yalnız mevcut shard sahibine döner. Sahip değişecekse eski writer durdurulur, tüm shard tek seferde devredilir ve devir manifestte kaydedilir.
- Toplam dört agent slotunda root dışında en fazla üç yardımcı görev eşzamanlıdır. Bir agent paketi en fazla 12 ID taşır.
- `tmp/sat-bank/explanations-en/` ve rationale içeren tüm çıktılar Git-ignore altında kalır; SAT kaynak metni, rationale, review veya paket dosyası commit edilmez.
- Bu plan ürün dosyası oluşturmaz/değiştirmez: Supabase, API, client types, cache, UI, `explanation_tr` ve canlı sistem kapsam dışıdır.
- Kaynak checksum'ı run sırasında değişirse run durdurulur; mevcut shard'larla devam edilmez.
- Her pilot/wave bariyerinde yapısal doğrulama ve SHA-256 checkpoint geçmeden sonraki wave başlamaz.
- Pilot 40/40 kabul edildikten sonra kullanıcıya raporlanır; kullanıcı açıkça onaylamadan kalan 766 kayda geçilmez.
- Git'e commit yerine korumalı operasyon çıktıları için checksum checkpoint kullanılır. Yalnız bu plan/spec belgeleri planlama turunda commit edilir.
- **2026-08-01 dar kullanıcı istisnası:** `20722644` ID'sinin ikinci turdaki yalnız
  fonksiyon-gösterimi parantez ret olayı, `policy-exceptions.json` ile etkin kabul
  sayılabilir. Önceki retler silinmez; cevap/açıklama kontrolleri yanlışsa veya
  başka bir parantez/gruplama farkı varsa istisna uygulanmaz.

---

## Dosya Haritası

Plan yürütülürken yalnız aşağıdaki Git-ignore çalışma dosyaları oluşturulur:

```text
tmp/sat-bank/explanations-en/
  ops/
    build-source-index.mjs          # 57 PDF envanteri, marker sırası, hedef kesişimi
    build-source-index.test.mjs     # gerçek kaynak üzerinde kabul testi
    select-pilot.mjs                # spec'teki deterministik 40-ID seçici
    build-wave-plan.mjs             # 766 ID / 19 wave / A-B-C sahiplik planı
    freeze-prompts.mjs              # v1 prompt checksum freeze'i
    validate-artifacts.mjs          # yapı, kaynak izi, review ve LaTeX kapısı
    validate-artifacts.test.mjs     # sentetik kabul/red/LaTeX testleri
    render-pages.mjs                # exact PDF sayfalarını 220 DPI PNG + text yapar
    record-transfer.mjs             # atomik logical-worker sahiplik devri
    write-checkpoint.mjs            # kabul edilen pilot/wave SHA-256 kaydı
    build-final-package.mjs         # final manifest, gap report ve SHA256SUMS
  prompts/
    extractor-v1.md                 # kaynak-sadık extraction görevi
    reviewer-v1.md                  # bağımsız görsel review görevi
    correction-v1.md                # yalnız reddedilmiş ID düzeltmesi
  target-ids.json                   # alfabetik 806 ID
  source-index.json                 # ID -> PDF + rationale sayfası
  source-inventory.json             # 57 PDF checksum ve sayım
  source-freeze.json                # bank/target/index/inventory checksum'ları
  prompt-freeze.json                # üç prompt'un değişmez checksum'ı
  gap-report.json                   # 213 + 20 + 15 kapsam dışı ID
  pilot-target-ids.json             # seçim sırasıyla dondurulmuş 40 ID
  pilot-source-index.json           # pilot metadata + kaynak izi
  wave-plan.json                    # 19 wave ve A/B/C ownership/review rotasyonu
  agent-registry.json               # logical A/B/C -> canonical agent task adı
  policy-exceptions.json            # açık ürün-sahibi istisnaları; varsayılan boş
  checkpoint-targets/
    PILOT.json                      # ilk 40
    W01.json ... W19.json           # kabul kapısındaki kümülatif hedefler
  ownership-transfers.json          # varsayılan []; yalnız root yazar
  packets/
    {stage}/{worker}/{chunk}/        # PDF sayfa PNG'leri + yardımcı text layer
  shards/
    {shard-key}-explanations.json   # bir PDF'nin tek writer'lı kayıtları
  reviews/
    {stage}/{chunk}-review-rN.json  # reviewer çıktısı; shard'dan ayrı
  checkpoints/
    PILOT.json
    W01.json ... W19.json           # kabul zamanı + artifact checksum'ları
  pilot-explanations-en.json
  explanations-en.json
  reviews.json
  qa-report.json
  package/
    target-ids.json
    explanations-en.json
    reviews.json
    policy-exceptions.json
    run-manifest.json
    qa-report.json
    gap-report.json
    SHA256SUMS
```

Kalıcı teslim, final kullanıcı izninden sonra:

```text
/Users/keremyarar/Documents/Codex/2026-07-01/sat-question-bank-pdfs/outputs/explanations-en/
```

## Veri Sözleşmeleri

Extractor shard kaydı:

```json
{
  "id": "84664a7c",
  "explanation_en": "Choice A is correct. ...",
  "source_file": "Question Bank (Unformatted)/Answer Keys/Math/Algebra/Linear Functions 1 Answer Key.pdf",
  "source_pages": [1],
  "needs_review": false,
  "review_note": null
}
```

Review olayı:

```json
{
  "id": "84664a7c",
  "reviewer_task_id": "/root/extractor_b",
  "review_round": 1,
  "status": "approved",
  "source_faithful": true,
  "math_faithful": true,
  "answer_consistent": true,
  "complete_rationale": true,
  "review_note": null
}
```

`rejected` kaydında en az bir kontrol `false`, `review_note` somut ve dolu olur.
Correction sonrası yeni kayıt aynı shard'daki eski kaydın yerini alır; review
geçmişi silinmez, farklı agent daha yüksek `review_round` ile yeni olay üretir.

`source-index.json` kaydı:

```json
{
  "id": "84664a7c",
  "source_file": "Question Bank (Unformatted)/Answer Keys/Math/Algebra/Linear Functions 1 Answer Key.pdf",
  "source_pages": [1],
  "source_order": 1
}
```

`source_pages`, Question ID sayfasından değil, `Rationale` marker'ının başladığı
sayfadan `Question Difficulty` marker'ının bulunduğu sayfaya kadar 1-based,
inclusive aralıktır.

---

### Task 1: Preflight ve Korumalı Çalışma Alanı

**Files:**
- Read: `AGENT_CONTEXT.md`
- Read: `docs/superpowers/specs/2026-07-24-sat-english-rationale-extraction-design.md`
- Read: `tmp/sat-bank/bank.json`
- Create directory: `tmp/sat-bank/explanations-en/`
- Create: `tmp/sat-bank/explanations-en/ownership-transfers.json`

**Interfaces:**
- Consumes: Mevcut banka snapshot'ı ve masaüstü PDF kaynağı.
- Produces: Doğrulanmış araç/kaynak önkoşulları ve boş sahiplik-devri günlüğü.

- [ ] **Step 1: Bağlam ve tasarımı eksiksiz oku**

Run:

```bash
cd /Users/keremyarar/italypath-main
sed -n '1,760p' AGENT_CONTEXT.md
sed -n '1,430p' docs/superpowers/specs/2026-07-24-sat-english-rationale-extraction-design.md
```

Expected: İki komut da `0`; tasarımda hedef `806`, pilot `40`, bulk `766` ve
ürün değişikliği `0` olarak okunur.

- [ ] **Step 2: Araç sürümleri ile kaynak yollarını doğrula**

Run:

```bash
node --version
jq --version
pdfinfo -v 2>&1 | head -1
pdftotext -v 2>&1 | head -1
pdftoppm -v 2>&1 | head -1
test -f /Users/keremyarar/italypath-main/tmp/sat-bank/bank.json
test -d '/Users/keremyarar/Desktop/SAT Question Bank PDFs/Question Bank (Unformatted)/Answer Keys/Math'
```

Expected:

```text
v24.13.0
jq-1.7.1-apple
pdfinfo version 26.06.0
pdftotext version 26.06.0
pdftoppm version 26.06.0
```

Son iki `test` sessizce `0` döner. Sürüm daha yeni olabilir; araç eksikse DUR.

- [ ] **Step 3: Mevcut banka snapshot'ını doğrula**

Run:

```bash
jq -e '
  (.bank | length) == 1019 and
  (.excluded | length) == 20 and
  (.failures | length) == 0 and
  ([.bank[].id] | unique | length) == 1019 and
  all(.bank[]; .section == "math")
' tmp/sat-bank/bank.json
```

Expected: `true`.

- [ ] **Step 4: Çalışma yolunun Git-ignore olduğunu kanıtla**

Run:

```bash
git check-ignore -v tmp/sat-bank/explanations-en/probe.json
```

Expected: `.gitignore` içindeki `tmp/` kuralını gösterir. Çıktı yoksa DUR; hiçbir
SAT içeriği yazma.

- [ ] **Step 5: Klasörleri ve boş devir günlüğünü oluştur**

`apply_patch` ile şu dosyayı oluştur:

```json
[]
```

Path:

```text
tmp/sat-bank/explanations-en/ownership-transfers.json
```

Sonra çalıştır:

```bash
mkdir -p \
  tmp/sat-bank/explanations-en/ops \
  tmp/sat-bank/explanations-en/prompts \
  tmp/sat-bank/explanations-en/packets \
  tmp/sat-bank/explanations-en/shards \
  tmp/sat-bank/explanations-en/reviews \
  tmp/sat-bank/explanations-en/checkpoints \
  tmp/sat-bank/explanations-en/checkpoint-targets
jq -e 'type == "array" and length == 0' \
  tmp/sat-bank/explanations-en/ownership-transfers.json
```

Expected: `true`.

- [ ] **Step 6: Repo sınırını yeniden doğrula**

Run:

```bash
git status --short
git ls-files tmp/sat-bank/explanations-en
```

Expected: İkinci komut boş. İlk komutta yalnız daha önceden bilinen kullanıcı
değişiklikleri olabilir; `tmp/sat-bank/explanations-en` görünmez.

Checkpoint: Bu görevde Git commit yoktur; protected operation dosyaları
checksum ile izlenir.

---

### Task 2: Mekanik Kaynak İndeksi ve Hedef Kümesini Dondurma

**Files:**
- Create: `tmp/sat-bank/explanations-en/ops/build-source-index.test.mjs`
- Create: `tmp/sat-bank/explanations-en/ops/build-source-index.mjs`
- Create: `tmp/sat-bank/explanations-en/target-ids.json`
- Create: `tmp/sat-bank/explanations-en/source-index.json`
- Create: `tmp/sat-bank/explanations-en/source-inventory.json`
- Create: `tmp/sat-bank/explanations-en/source-freeze.json`
- Create: `tmp/sat-bank/explanations-en/gap-report.json`

**Interfaces:**
- Consumes: `bank.json`, 57 Unformatted Math Answer Key PDF, Poppler.
- Produces: `target-ids.json: string[806]`, `source-index.records:
  SourceRecord[806]`, 57 checksum'lı source inventory ve değişmez gap kümeleri.

- [ ] **Step 1: Önce gerçek-veri kabul testini yaz**

`apply_patch` ile
`tmp/sat-bank/explanations-en/ops/build-source-index.test.mjs` dosyasını tam
olarak şöyle oluştur:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repo = resolve("/Users/keremyarar/italypath-main");
const script = join(repo, "tmp/sat-bank/explanations-en/ops/build-source-index.mjs");
const bank = join(repo, "tmp/sat-bank/bank.json");
const sourceRoot = "/Users/keremyarar/Desktop/SAT Question Bank PDFs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("freezes the audited SAT Math rationale intersection", () => {
  const out = mkdtempSync(join(tmpdir(), "sat-rationale-index-"));
  const stdout = execFileSync(process.execPath, [
    script,
    "--bank", bank,
    "--source-root", sourceRoot,
    "--out-dir", out,
  ], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });

  const targets = readJson(join(out, "target-ids.json"));
  const index = readJson(join(out, "source-index.json"));
  const inventory = readJson(join(out, "source-inventory.json"));
  const gaps = readJson(join(out, "gap-report.json"));

  assert.match(stdout, /bank=1019 source=821 target=806 bank_only=213 source_only=15 pdfs=57 pdf_pages=949 target_pdfs=56/);
  assert.equal(targets.length, 806);
  assert.equal(new Set(targets).size, 806);
  assert.equal(index.records.length, 806);
  assert.equal(new Set(index.records.map((record) => record.source_file)).size, 56);
  const pageCounts = Object.groupBy(
    index.records,
    (record) => String(record.source_pages.length),
  );
  assert.equal(pageCounts["1"].length, 705);
  assert.equal(pageCounts["2"].length, 101);
  assert.equal(inventory.files.length, 57);
  assert.equal(
    inventory.files.reduce((total, file) => total + file.page_count, 0),
    949,
  );
  assert.equal(gaps.bank_without_official_rationale.count, 213);
  assert.equal(gaps.excluded_area_and_volume_1.count, 20);
  assert.equal(gaps.source_not_in_bank.count, 15);
});
```

- [ ] **Step 2: Testin doğru nedenle başarısız olduğunu gör**

Run:

```bash
node --test tmp/sat-bank/explanations-en/ops/build-source-index.test.mjs
```

Expected: FAIL; `build-source-index.mjs` henüz bulunamadığı için child process
non-zero döner.

- [ ] **Step 3: Kaynak indeksleyiciyi yaz**

`apply_patch` ile
`tmp/sat-bank/explanations-en/ops/build-source-index.mjs` dosyasını tam olarak
şöyle oluştur:

```js
import { execFileSync } from "node:child_process";
import {
  createHash,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const byteCompare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const fail = (message) => {
  throw new Error(message);
};
const requireArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) fail(`Missing ${name}`);
  return process.argv[index + 1];
};
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256File = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const writeJsonAtomic = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
};
const listPdfs = (root) => {
  const found = [];
  const walk = (directory) => {
    for (const name of readdirSync(directory).sort(byteCompare)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.toLowerCase().endsWith(".pdf")) found.push(path);
    }
  };
  walk(root);
  return found.sort(byteCompare);
};
const portableRelative = (root, path) =>
  relative(root, path).split(sep).join("/");
const positionBefore = (left, right) =>
  left.page < right.page ||
  (left.page === right.page && left.offset < right.offset);
const inclusiveRange = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index);

const bankPath = resolve(requireArg("--bank"));
const sourceRoot = resolve(requireArg("--source-root"));
const outDir = resolve(requireArg("--out-dir"));
if (existsSync(join(outDir, "source-freeze.json"))) {
  fail(`Refusing to replace existing source freeze in ${outDir}`);
}
const answerRoot = join(
  sourceRoot,
  "Question Bank (Unformatted)",
  "Answer Keys",
  "Math",
);

const patterns = {
  question: /^[ \t]*Question ID[ \t]+([0-9a-f]{8})[ \t]*\r?$/gm,
  answer: /^[ \t]*ID:[ \t]*([0-9a-f]{8})[ \t]+Answer[ \t]*\r?$/gm,
  rationale: /^[ \t]*Rationale[ \t]*\r?$/gm,
  difficulty: /^[ \t]*Question Difficulty:[ \t]*\r?$/gm,
};

const bankPayload = readJson(bankPath);
if (!Array.isArray(bankPayload.bank)) fail("bank.json .bank must be an array");
if (bankPayload.bank.length !== 1019) fail(`Expected 1019 bank records; got ${bankPayload.bank.length}`);
if (!Array.isArray(bankPayload.excluded) || bankPayload.excluded.length !== 20) {
  fail("Expected 20 explicitly excluded Area and Volume 1 IDs");
}
const bankIds = bankPayload.bank.map(({ id }) => id);
if (new Set(bankIds).size !== bankIds.length) fail("Duplicate ID in bank");
const bankSet = new Set(bankIds);

const pdfs = listPdfs(answerRoot);
if (pdfs.length !== 57) fail(`Expected 57 Math answer-key PDFs; got ${pdfs.length}`);

const allSourceRecords = [];
const inventory = [];

for (const pdfPath of pdfs) {
  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const pageMatch = info.match(/^Pages:\s+(\d+)\s*$/m);
  if (!pageMatch) fail(`No Pages field from pdfinfo: ${pdfPath}`);
  const pageCount = Number(pageMatch[1]);
  const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  const pages = text.split("\f");
  if (pages.length === pageCount + 1 && pages.at(-1).trim() === "") pages.pop();
  if (pages.length !== pageCount) {
    fail(`Page count mismatch for ${pdfPath}: pdfinfo=${pageCount} text=${pages.length}`);
  }

  const events = {
    question: [],
    answer: [],
    rationale: [],
    difficulty: [],
  };
  for (const [pageIndex, pageText] of pages.entries()) {
    for (const [kind, pattern] of Object.entries(patterns)) {
      const matcher = new RegExp(pattern.source, pattern.flags);
      for (const match of pageText.matchAll(matcher)) {
        events[kind].push({
          id: match[1] ?? null,
          page: pageIndex + 1,
          offset: match.index,
        });
      }
    }
  }

  const counts = Object.fromEntries(
    Object.entries(events).map(([kind, values]) => [kind, values.length]),
  );
  const countSet = new Set(Object.values(counts));
  if (countSet.size !== 1) fail(`Marker count mismatch ${pdfPath}: ${JSON.stringify(counts)}`);

  const sourceFile = portableRelative(sourceRoot, pdfPath);
  for (let index = 0; index < events.question.length; index += 1) {
    const question = events.question[index];
    const answer = events.answer[index];
    const rationale = events.rationale[index];
    const difficulty = events.difficulty[index];
    const nextQuestion = events.question[index + 1] ?? null;

    if (question.id !== answer.id) {
      fail(`Question/Answer ID mismatch ${sourceFile} #${index + 1}`);
    }
    if (
      !positionBefore(question, answer) ||
      !positionBefore(answer, rationale) ||
      !positionBefore(rationale, difficulty) ||
      (nextQuestion && !positionBefore(difficulty, nextQuestion))
    ) {
      fail(`Marker order violation ${sourceFile} ${question.id}`);
    }
    const sourcePages = inclusiveRange(rationale.page, difficulty.page);
    if (sourcePages.length < 1 || sourcePages.length > 2) {
      fail(`Unexpected rationale page span ${sourceFile} ${question.id}: ${sourcePages}`);
    }
    allSourceRecords.push({
      id: question.id,
      source_file: sourceFile,
      source_pages: sourcePages,
      source_order: index + 1,
    });
  }

  inventory.push({
    source_file: sourceFile,
    sha256: sha256File(pdfPath),
    page_count: pageCount,
    rationale_count: events.question.length,
    target_count: 0,
  });
}

if (allSourceRecords.length !== 821) {
  fail(`Expected 821 source rationale records; got ${allSourceRecords.length}`);
}
const sourceIds = allSourceRecords.map(({ id }) => id);
if (new Set(sourceIds).size !== sourceIds.length) fail("Duplicate source rationale ID");
const sourceSet = new Set(sourceIds);

const targetIds = bankIds.filter((id) => sourceSet.has(id)).sort(byteCompare);
const bankOnly = bankIds.filter((id) => !sourceSet.has(id)).sort(byteCompare);
const sourceOnly = sourceIds.filter((id) => !bankSet.has(id)).sort(byteCompare);
const targetSet = new Set(targetIds);
const targetRecords = allSourceRecords
  .filter(({ id }) => targetSet.has(id))
  .sort((left, right) => byteCompare(left.id, right.id));

for (const file of inventory) {
  file.target_count = targetRecords.filter(
    ({ source_file }) => source_file === file.source_file,
  ).length;
}

const targetPdfs = inventory.filter(({ target_count }) => target_count > 0).length;
const totalPages = inventory.reduce((total, file) => total + file.page_count, 0);
const onePage = targetRecords.filter(({ source_pages }) => source_pages.length === 1).length;
const twoPage = targetRecords.filter(({ source_pages }) => source_pages.length === 2).length;
if (
  targetIds.length !== 806 ||
  bankOnly.length !== 213 ||
  sourceOnly.length !== 15 ||
  targetPdfs !== 56 ||
  totalPages !== 949 ||
  onePage !== 705 ||
  twoPage !== 101
) {
  fail(
    `Audited counts changed: target=${targetIds.length} bankOnly=${bankOnly.length} ` +
    `sourceOnly=${sourceOnly.length} targetPdfs=${targetPdfs} ` +
    `pdfPages=${totalPages} rationalePages=${onePage}/${twoPage}`,
  );
}

mkdirSync(outDir, { recursive: true });
const targetPath = join(outDir, "target-ids.json");
const indexPath = join(outDir, "source-index.json");
const inventoryPath = join(outDir, "source-inventory.json");
const gapsPath = join(outDir, "gap-report.json");

writeJsonAtomic(targetPath, targetIds);
writeJsonAtomic(indexPath, { schema_version: 1, records: targetRecords });
writeJsonAtomic(inventoryPath, { schema_version: 1, files: inventory });
writeJsonAtomic(gapsPath, {
  schema_version: 1,
  bank_without_official_rationale: { count: bankOnly.length, ids: bankOnly },
  excluded_area_and_volume_1: {
    count: bankPayload.excluded.length,
    ids: [...bankPayload.excluded].sort(byteCompare),
  },
  source_not_in_bank: { count: sourceOnly.length, ids: sourceOnly },
});
writeJsonAtomic(join(outDir, "source-freeze.json"), {
  schema_version: 1,
  created_at: new Date().toISOString(),
  bank_file: portableRelative(resolve(bankPath, "..", "..", ".."), bankPath),
  bank_sha256: sha256File(bankPath),
  target_ids_sha256: sha256File(targetPath),
  source_index_sha256: sha256File(indexPath),
  source_inventory_sha256: sha256File(inventoryPath),
  gap_report_sha256: sha256File(gapsPath),
  counts: {
    bank: bankIds.length,
    source: sourceIds.length,
    target: targetIds.length,
    bank_only: bankOnly.length,
    source_only: sourceOnly.length,
    excluded: bankPayload.excluded.length,
    pdfs: pdfs.length,
    pdf_pages: totalPages,
    target_pdfs: targetPdfs,
    target_one_page: onePage,
    target_two_page: twoPage,
  },
});

console.log(
  `bank=${bankIds.length} source=${sourceIds.length} target=${targetIds.length} ` +
  `bank_only=${bankOnly.length} source_only=${sourceOnly.length} ` +
  `pdfs=${pdfs.length} pdf_pages=${totalPages} target_pdfs=${targetPdfs}`,
);
```

- [ ] **Step 4: Kabul testini geçir**

Run:

```bash
node --test tmp/sat-bank/explanations-en/ops/build-source-index.test.mjs
```

Expected: `1` test, `1` pass, `0` fail.

- [ ] **Step 5: Gerçek çalışma indeksini üret**

Run:

```bash
node tmp/sat-bank/explanations-en/ops/build-source-index.mjs \
  --bank /Users/keremyarar/italypath-main/tmp/sat-bank/bank.json \
  --source-root '/Users/keremyarar/Desktop/SAT Question Bank PDFs' \
  --out-dir /Users/keremyarar/italypath-main/tmp/sat-bank/explanations-en
```

Expected:

```text
bank=1019 source=821 target=806 bank_only=213 source_only=15 pdfs=57 pdf_pages=949 target_pdfs=56
```

- [ ] **Step 6: Kesişim ve sayfa dağılımı kapısını çalıştır**

Run:

```bash
jq 'length' tmp/sat-bank/explanations-en/target-ids.json
jq '.records | length' tmp/sat-bank/explanations-en/source-index.json
jq '[.records[].source_file] | unique | length' \
  tmp/sat-bank/explanations-en/source-index.json
jq '[.records[].source_pages | length] | group_by(.) |
  map({pages: .[0], count: length})' \
  tmp/sat-bank/explanations-en/source-index.json
diff -u \
  <(jq -S . tmp/sat-bank/explanations-en/target-ids.json) \
  <(jq -S '[.records[].id]' tmp/sat-bank/explanations-en/source-index.json)
```

Expected sırasıyla:

```text
806
806
56
[
  {"pages":1,"count":705},
  {"pages":2,"count":101}
]
```

`diff` boş olmalıdır. Biçimlendirilmiş jq çıktısında whitespace farklı olabilir;
değerler değişemez.

- [ ] **Step 7: Source freeze bütünlüğünü doğrula**

Run:

```bash
jq -e '
  .counts == {
    bank: 1019,
    source: 821,
    target: 806,
    bank_only: 213,
    source_only: 15,
    excluded: 20,
    pdfs: 57,
    pdf_pages: 949,
    target_pdfs: 56,
    target_one_page: 705,
    target_two_page: 101
  }
' tmp/sat-bank/explanations-en/source-freeze.json
```

Expected: `true`.

Checkpoint: `source-freeze.json` sonraki her aşamada yeniden hash doğrulamasının
yetkili girdisidir; herhangi bir farkta run iptal edilir.

---

### Task 3: Dondurulmuş 40 Soruluk Pilotu Seçme

**Files:**
- Create: `tmp/sat-bank/explanations-en/ops/select-pilot.mjs`
- Create: `tmp/sat-bank/explanations-en/pilot-target-ids.json`
- Create: `tmp/sat-bank/explanations-en/pilot-source-index.json`
- Create: `tmp/sat-bank/explanations-en/checkpoint-targets/PILOT.json`

**Interfaces:**
- Consumes: `bank.json`, `target-ids.json`, `source-index.json`.
- Produces: Seçim sırasını koruyan `string[40]` ve her ID için skill/domain/type/
  figure/source metadata'sı.

- [ ] **Step 1: Seçici henüz yokken expected failure'ı doğrula**

Run:

```bash
test -f tmp/sat-bank/explanations-en/ops/select-pilot.mjs
```

Expected: non-zero; script henüz yok.

- [ ] **Step 2: Deterministik seçiciyi yaz**

`apply_patch` ile `tmp/sat-bank/explanations-en/ops/select-pilot.mjs` dosyasını
tam olarak şöyle oluştur:

```js
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const byteCompare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const fail = (message) => {
  throw new Error(message);
};
const requireArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) fail(`Missing ${name}`);
  return process.argv[index + 1];
};
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJsonAtomic = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
};
const hasFigure = (question) => Boolean(question.figure_path);
const compareFirst = (left, right) =>
  Number(hasFigure(right)) - Number(hasFigure(left)) ||
  Number(right.question_type === "spr") - Number(left.question_type === "spr") ||
  right.difficulty - left.difficulty ||
  byteCompare(left.id, right.id);
const compareSecond = (first) => (left, right) =>
  Number(right.question_type !== first.question_type) -
    Number(left.question_type !== first.question_type) ||
  Number(hasFigure(right) !== hasFigure(first)) -
    Number(hasFigure(left) !== hasFigure(first)) ||
  Number(right.difficulty !== first.difficulty) -
    Number(left.difficulty !== first.difficulty) ||
  right.difficulty - left.difficulty ||
  byteCompare(left.id, right.id);
const compareFill = (left, right) =>
  Number(hasFigure(right)) - Number(hasFigure(left)) ||
  Number(right.question_type === "spr") - Number(left.question_type === "spr") ||
  right.difficulty - left.difficulty ||
  byteCompare(left.skill_slug, right.skill_slug) ||
  byteCompare(left.id, right.id);
const compareExtra = (left, right) =>
  right.difficulty - left.difficulty || byteCompare(left.id, right.id);

const expectedIds = [
  "b2528e6b", "03c6994f", "1b2b20b9", "23c5fcce", "137cc6fd",
  "0b3d25c5", "7d68096f", "37930b2a", "90095507", "15daa8d6",
  "0366d965", "0d1b1e35", "e25f0807", "042aa429", "6cb9bf45",
  "1a621af4", "17912810", "2085e10e", "97e50fa2", "0980fcdd",
  "1178f2df", "0aaef7aa", "54d93874", "5c3c2e3c", "0231050d",
  "566759ef", "014c47ab", "38a9ac45", "3f775bbf", "89c39d77",
  "1429dcdf", "5a7e3b46", "c7e73ece", "53d97af5", "2704399f",
  "466b87e3", "7b52985c", "7ac5d686", "0b0fa68b", "0121a235",
];

const bankPath = resolve(requireArg("--bank"));
const targetPath = resolve(requireArg("--targets"));
const sourceIndexPath = resolve(requireArg("--source-index"));
const outDir = resolve(requireArg("--out-dir"));

const bank = readJson(bankPath).bank;
const targetIds = readJson(targetPath);
const targetSet = new Set(targetIds);
const sourceById = new Map(
  readJson(sourceIndexPath).records.map((record) => [record.id, record]),
);
const questions = bank.filter(({ id }) => targetSet.has(id));
if (questions.length !== 806) fail(`Expected 806 target questions; got ${questions.length}`);

const bySkill = Map.groupBy(questions, ({ skill_slug }) => skill_slug);
const skills = [...bySkill.keys()].sort(byteCompare);
if (skills.length !== 19) fail(`Expected 19 skill slugs; got ${skills.length}`);

const selected = new Set();
const core = [];
for (const skill of skills) {
  const candidates = [...bySkill.get(skill)].sort(compareFirst);
  if (candidates[0]) {
    core.push({ question: candidates[0], role: "first" });
    selected.add(candidates[0].id);
  }
  const second = candidates
    .filter(({ id }) => !selected.has(id))
    .sort(compareSecond(candidates[0]))[0];
  if (second) {
    core.push({ question: second, role: "second" });
    selected.add(second.id);
  }
}

for (const candidate of [...questions].sort(compareFill)) {
  if (core.length >= 38) break;
  if (!selected.has(candidate.id)) {
    core.push({ question: candidate, role: "fill" });
    selected.add(candidate.id);
  }
}
if (core.length !== 38) fail(`Expected 38 core records; got ${core.length}`);

const difficultyCount = (difficulty) =>
  core.filter(({ question }) => question.difficulty === difficulty).length;
for (const missingDifficulty of [1, 2, 3]) {
  if (difficultyCount(missingDifficulty) > 0) continue;
  const candidates = questions
    .filter(
      (question) =>
        question.difficulty === missingDifficulty && !selected.has(question.id),
    )
    .sort(
      (left, right) =>
        byteCompare(left.skill_slug, right.skill_slug) ||
        byteCompare(left.id, right.id),
    );
  let repaired = false;
  for (const candidate of candidates) {
    const replaceIndex = core.findIndex(
      ({ question, role }) =>
        question.skill_slug === candidate.skill_slug && role === "second",
    );
    if (replaceIndex < 0) continue;
    const previous = core[replaceIndex].question;
    if (difficultyCount(previous.difficulty) <= 1) continue;
    selected.delete(previous.id);
    selected.add(candidate.id);
    core[replaceIndex] = { question: candidate, role: "second-repair" };
    repaired = true;
    break;
  }
  if (!repaired) fail(`Cannot repair missing difficulty ${missingDifficulty}`);
}

const extraSpr = questions
  .filter(({ id, question_type }) => !selected.has(id) && question_type === "spr")
  .sort(compareExtra)[0];
if (!extraSpr) fail("No distinct SPR extra candidate");
selected.add(extraSpr.id);

const extraFigure = questions
  .filter(({ id }) => !selected.has(id))
  .filter(hasFigure)
  .sort(compareExtra)[0];
if (!extraFigure) fail("No distinct figure extra candidate");
selected.add(extraFigure.id);

const selections = [
  ...core,
  { question: extraSpr, role: "extra-spr" },
  { question: extraFigure, role: "extra-figure" },
];
const ids = selections.map(({ question }) => question.id);
if (ids.length !== 40 || new Set(ids).size !== 40) fail("Pilot must contain 40 unique IDs");
if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
  fail(`Pilot drifted from audited IDs:\n${JSON.stringify(ids, null, 2)}`);
}

const selectedQuestions = selections.map(({ question }) => question);
const domainCount = new Set(selectedQuestions.map(({ domain }) => domain)).size;
const difficulties = [...new Set(selectedQuestions.map(({ difficulty }) => difficulty))]
  .sort();
const typeCounts = Object.fromEntries(
  [...Map.groupBy(selectedQuestions, ({ question_type }) => question_type)]
    .map(([key, values]) => [key, values.length]),
);
const figureCount = selectedQuestions.filter(hasFigure).length;
if (
  domainCount !== 4 ||
  JSON.stringify(difficulties) !== JSON.stringify([1, 2, 3]) ||
  typeCounts.mcq !== 21 ||
  typeCounts.spr !== 19 ||
  figureCount !== 20
) {
  fail("Pilot coverage invariant failed");
}

const records = selections.map(({ question, role }, index) => {
  const source = sourceById.get(question.id);
  if (!source) fail(`No source record for ${question.id}`);
  return {
    sequence: index + 1,
    id: question.id,
    selection_role: role,
    skill_slug: question.skill_slug,
    domain: question.domain,
    difficulty: question.difficulty,
    question_type: question.question_type,
    figure_path: question.figure_path ?? null,
    source_file: source.source_file,
    source_pages: source.source_pages,
    source_order: source.source_order,
  };
});

writeJsonAtomic(join(outDir, "pilot-target-ids.json"), ids);
writeJsonAtomic(join(outDir, "pilot-source-index.json"), {
  schema_version: 1,
  selection_rule_version: "2026-07-24.1",
  records,
});
writeJsonAtomic(join(outDir, "checkpoint-targets", "PILOT.json"), [...ids].sort(byteCompare));

const domainSummary = Object.fromEntries(
  [...Map.groupBy(selectedQuestions, ({ domain }) => domain)]
    .map(([key, values]) => [key, values.length]),
);
const difficultySummary = Object.fromEntries(
  [...Map.groupBy(selectedQuestions, ({ difficulty }) => String(difficulty))]
    .map(([key, values]) => [key, values.length]),
);
console.log(JSON.stringify({
  total: ids.length,
  skills: skills.length,
  domains: domainSummary,
  difficulties: difficultySummary,
  types: typeCounts,
  figures: figureCount,
}, null, 2));
```

- [ ] **Step 3: Seçiciyi çalıştır**

Run:

```bash
node tmp/sat-bank/explanations-en/ops/select-pilot.mjs \
  --bank tmp/sat-bank/bank.json \
  --targets tmp/sat-bank/explanations-en/target-ids.json \
  --source-index tmp/sat-bank/explanations-en/source-index.json \
  --out-dir tmp/sat-bank/explanations-en
```

Expected özet:

```json
{
  "total": 40,
  "skills": 19,
  "domains": {
    "Geometry and Trigonometry": 8,
    "Advanced Math": 7,
    "Problem-Solving and Data Analysis": 14,
    "Algebra": 11
  },
  "difficulties": {"1": 1, "2": 18, "3": 21},
  "types": {"spr": 19, "mcq": 21},
  "figures": 20
}
```

JSON key sırası önemli değildir; değerler aynen eşleşir.

- [ ] **Step 4: Exact ID ve kapsam kapısını çalıştır**

Run:

```bash
jq -e '
  length == 40 and
  (unique | length) == 40 and
  . == [
    "b2528e6b","03c6994f","1b2b20b9","23c5fcce","137cc6fd",
    "0b3d25c5","7d68096f","37930b2a","90095507","15daa8d6",
    "0366d965","0d1b1e35","e25f0807","042aa429","6cb9bf45",
    "1a621af4","17912810","2085e10e","97e50fa2","0980fcdd",
    "1178f2df","0aaef7aa","54d93874","5c3c2e3c","0231050d",
    "566759ef","014c47ab","38a9ac45","3f775bbf","89c39d77",
    "1429dcdf","5a7e3b46","c7e73ece","53d97af5","2704399f",
    "466b87e3","7b52985c","7ac5d686","0b0fa68b","0121a235"
  ]
' tmp/sat-bank/explanations-en/pilot-target-ids.json

jq -e '
  (.records | length) == 40 and
  ([.records[0:38][].skill_slug] | group_by(.) | length) == 19 and
  all([.records[0:38][].skill_slug] | group_by(.)[]; length == 2) and
  ([.records[].domain] | unique | length) == 4 and
  ([.records[].difficulty] | unique | sort) == [1,2,3] and
  ([.records[] | select(.question_type == "spr")] | length) == 19 and
  ([.records[] | select(.figure_path != null)] | length) == 20 and
  ([.records[] | select(.source_pages | length == 2)] | length) == 5 and
  .records[38].selection_role == "extra-spr" and
  .records[39].selection_role == "extra-figure" and
  .records[38].id != .records[39].id
' tmp/sat-bank/explanations-en/pilot-source-index.json
```

Expected: `true` ve `true`.

- [ ] **Step 5: Determinizmi ikinci çalıştırmayla kanıtla**

Run:

```bash
shasum -a 256 \
  tmp/sat-bank/explanations-en/pilot-target-ids.json \
  tmp/sat-bank/explanations-en/pilot-source-index.json
node tmp/sat-bank/explanations-en/ops/select-pilot.mjs \
  --bank tmp/sat-bank/bank.json \
  --targets tmp/sat-bank/explanations-en/target-ids.json \
  --source-index tmp/sat-bank/explanations-en/source-index.json \
  --out-dir tmp/sat-bank/explanations-en
shasum -a 256 \
  tmp/sat-bank/explanations-en/pilot-target-ids.json \
  tmp/sat-bank/explanations-en/pilot-source-index.json
```

Expected: İlk ve ikinci SHA-256 çiftleri birebir aynı.

Checkpoint: Pilot ID'leri bundan sonra yeniden seçilmez veya elle değiştirilmez.

---

### Task 4: Bulk Wave, Shard Sahipliği ve Review Rotasyonunu Dondurma

**Files:**
- Create: `tmp/sat-bank/explanations-en/ops/build-wave-plan.mjs`
- Create: `tmp/sat-bank/explanations-en/wave-plan.json`
- Create: `tmp/sat-bank/explanations-en/agent-registry.json`
- Create: `tmp/sat-bank/explanations-en/checkpoint-targets/W01.json` … `W19.json`

**Interfaces:**
- Consumes: `source-index.json`, `pilot-target-ids.json`.
- Produces: 56 PDF shard'ı, 766 bulk ID, 19 wave, `A/B/C` extractor,
  reviewer, correction owner, second reviewer ve en fazla 12 ID'lik chunk'lar.

- [ ] **Step 1: Wave script'i yokken expected failure'ı doğrula**

Run:

```bash
test -f tmp/sat-bank/explanations-en/ops/build-wave-plan.mjs
```

Expected: non-zero.

- [ ] **Step 2: Wave plan üreticisini yaz**

`apply_patch` ile `tmp/sat-bank/explanations-en/ops/build-wave-plan.mjs`
dosyasını tam olarak şöyle oluştur:

```js
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const byteCompare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const fail = (message) => {
  throw new Error(message);
};
const requireArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) fail(`Missing ${name}`);
  return process.argv[index + 1];
};
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJsonAtomic = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
};
const chunksOf = (values, size) =>
  Array.from(
    { length: Math.ceil(values.length / size) },
    (_, index) => values.slice(index * size, (index + 1) * size),
  );
const shardKey = (sourceFile) => {
  const slug = sourceFile
    .replace(/^Question Bank \(Unformatted\)\/Answer Keys\/Math\//, "")
    .replace(/\.pdf$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  const suffix = createHash("sha256").update(sourceFile).digest("hex").slice(0, 8);
  return `${slug}-${suffix}`;
};
const reviewerFor = (waveNumber, extractor) => {
  const odd = { A: "B", B: "C", C: "A" };
  const even = { A: "C", B: "A", C: "B" };
  return (waveNumber % 2 === 1 ? odd : even)[extractor];
};

const sourceIndexPath = resolve(requireArg("--source-index"));
const pilotPath = resolve(requireArg("--pilot-targets"));
const outDir = resolve(requireArg("--out-dir"));
const records = readJson(sourceIndexPath).records;
const pilotIds = readJson(pilotPath);
const pilotSet = new Set(pilotIds);
if (records.length !== 806 || pilotIds.length !== 40) fail("Unexpected target/pilot size");

const byFile = Map.groupBy(records, ({ source_file }) => source_file);
const files = [...byFile].map(([sourceFile, fileRecords]) => {
  const ordered = [...fileRecords].sort(
    (left, right) =>
      left.source_order - right.source_order || byteCompare(left.id, right.id),
  );
  return {
    source_file: sourceFile,
    pilot_ids: ordered.filter(({ id }) => pilotSet.has(id)).map(({ id }) => id),
    target_ids: ordered.filter(({ id }) => !pilotSet.has(id)).map(({ id }) => id),
  };
}).filter(({ target_ids }) => target_ids.length > 0);

files.sort(
  (left, right) =>
    right.target_ids.length - left.target_ids.length ||
    byteCompare(left.source_file, right.source_file),
);
if (files.length !== 56) fail(`Expected 56 nonzero bulk shards; got ${files.length}`);

const workers = ["A", "B", "C"];
const loads = { A: 0, B: 0, C: 0 };
const waves = [];
for (const [waveIndex, waveFiles] of chunksOf(files, 3).entries()) {
  const waveNumber = waveIndex + 1;
  const waveId = `W${String(waveNumber).padStart(2, "0")}`;
  const used = new Set();
  const assignments = [];
  for (const file of waveFiles) {
    const extractor = workers
      .filter((worker) => !used.has(worker))
      .sort(
        (left, right) =>
          loads[left] - loads[right] || byteCompare(left, right),
      )[0];
    used.add(extractor);
    loads[extractor] += file.target_ids.length;
    const reviewer = reviewerFor(waveNumber, extractor);
    const secondReviewer = workers.find(
      (worker) => worker !== extractor && worker !== reviewer,
    );
    const key = shardKey(file.source_file);
    assignments.push({
      source_file: file.source_file,
      shard_key: key,
      shard_file: `shards/${key}-explanations.json`,
      pilot_ids: file.pilot_ids,
      target_ids: file.target_ids,
      chunks: chunksOf(file.target_ids, 12).map((targetIds, chunkIndex) => ({
        chunk_id: `${waveId}-${extractor}-${String(chunkIndex + 1).padStart(2, "0")}`,
        target_ids: targetIds,
      })),
      extractor,
      reviewer,
      correction_owner: extractor,
      second_reviewer: secondReviewer,
    });
  }
  waves.push({
    wave_id: waveId,
    total_count: assignments.reduce(
      (total, assignment) => total + assignment.target_ids.length,
      0,
    ),
    assignments,
  });
}

const expectedTotals = [
  98, 68, 63, 54, 50, 48, 47, 45, 43, 39,
  36, 34, 32, 30, 27, 22, 17, 9, 4,
];
const actualTotals = waves.map(({ total_count }) => total_count);
if (JSON.stringify(actualTotals) !== JSON.stringify(expectedTotals)) {
  fail(`Wave totals drifted: ${JSON.stringify(actualTotals)}`);
}
if (loads.A !== 255 || loads.B !== 256 || loads.C !== 255) {
  fail(`Worker loads drifted: ${JSON.stringify(loads)}`);
}

const bulkIds = waves.flatMap(({ assignments }) =>
  assignments.flatMap(({ target_ids }) => target_ids),
);
const allIds = [...pilotIds, ...bulkIds];
if (
  bulkIds.length !== 766 ||
  new Set(bulkIds).size !== 766 ||
  allIds.length !== 806 ||
  new Set(allIds).size !== 806
) {
  fail("Pilot/bulk partition invariant failed");
}

const wavePlan = {
  schema_version: 1,
  algorithm_version: "2026-07-24.1",
  workers,
  worker_bulk_loads: loads,
  pilot_count: pilotIds.length,
  bulk_count: bulkIds.length,
  source_pdf_count: files.length,
  waves,
};
writeJsonAtomic(join(outDir, "wave-plan.json"), wavePlan);

let cumulative = [...pilotIds];
writeJsonAtomic(
  join(outDir, "checkpoint-targets", "PILOT.json"),
  [...cumulative].sort(byteCompare),
);
for (const wave of waves) {
  cumulative.push(
    ...wave.assignments.flatMap(({ target_ids }) => target_ids),
  );
  writeJsonAtomic(
    join(outDir, "checkpoint-targets", `${wave.wave_id}.json`),
    [...cumulative].sort(byteCompare),
  );
}

console.log(
  `pilot=40 bulk=766 source_pdfs=56 waves=19 ` +
  `loads=A:${loads.A},B:${loads.B},C:${loads.C}`,
);
```

- [ ] **Step 3: Wave planını üret**

Run:

```bash
node tmp/sat-bank/explanations-en/ops/build-wave-plan.mjs \
  --source-index tmp/sat-bank/explanations-en/source-index.json \
  --pilot-targets tmp/sat-bank/explanations-en/pilot-target-ids.json \
  --out-dir tmp/sat-bank/explanations-en
```

Expected:

```text
pilot=40 bulk=766 source_pdfs=56 waves=19 loads=A:255,B:256,C:255
```

- [ ] **Step 4: Canonical agent adlarını dondur**

`apply_patch` ile `tmp/sat-bank/explanations-en/agent-registry.json` dosyasını
tam olarak şöyle oluştur:

```json
{
  "A": ["/root/extractor_a"],
  "B": ["/root/extractor_b"],
  "C": ["/root/extractor_c"]
}
```

Run:

```bash
jq -e '
  (keys | sort) == ["A","B","C"] and
  all(.[]; type == "array" and length == 1) and
  ([.[][]] | unique | length) == 3
' tmp/sat-bank/explanations-en/agent-registry.json
```

Expected: `true`. Task 7'de agent'lar exact `task_name` değerleri
`extractor_a`, `extractor_b`, `extractor_c` ile açılır; spawn sonucu bu canonical
adlarla eşleşmezse extraction başlamaz.

- [ ] **Step 5: Wave yapısını doğrula**

Run:

```bash
jq -e '
  (.waves | length) == 19 and
  ([.waves[].assignments[]] | length) == 56 and
  ([.waves[].assignments[].target_ids[]] | length) == 766 and
  ([.waves[].assignments[].target_ids[]] | unique | length) == 766 and
  ([.waves[].total_count] ==
    [98,68,63,54,50,48,47,45,43,39,36,34,32,30,27,22,17,9,4]) and
  ([.waves[].assignments[]
    | select(.extractor == "A")
    | .target_ids[]] | length) == 255 and
  ([.waves[].assignments[]
    | select(.extractor == "B")
    | .target_ids[]] | length) == 256 and
  ([.waves[].assignments[]
    | select(.extractor == "C")
    | .target_ids[]] | length) == 255 and
  all(.waves[];
    ((.assignments | length) >= 2) and
    ((.assignments | length) <= 3)) and
  all(.waves[].assignments[];
    (.extractor != .reviewer) and
    (.extractor != .second_reviewer) and
    (.reviewer != .second_reviewer) and
    (.correction_owner == .extractor) and
    all(.chunks[]; (.target_ids | length) >= 1 and (.target_ids | length) <= 12))
' tmp/sat-bank/explanations-en/wave-plan.json
```

Expected: `true`.

- [ ] **Step 6: Pilot + bulk'ın hedefi eksiksiz ve örtüşmesiz kapladığını doğrula**

Run:

```bash
diff -u \
  <(jq -S . tmp/sat-bank/explanations-en/target-ids.json) \
  <(jq -s -S '
    .[0] + [.[1].waves[].assignments[].target_ids[]]
    | unique
  ' \
    tmp/sat-bank/explanations-en/pilot-target-ids.json \
    tmp/sat-bank/explanations-en/wave-plan.json)

jq -e 'length == 806 and (unique | length) == 806' \
  tmp/sat-bank/explanations-en/checkpoint-targets/W19.json
```

Expected: `diff` boş, jq `true`.

- [ ] **Step 7: Dondurulmuş wave tablosunu operatör kaydına al**

| Wave | Shard yükleri | Toplam |
|---:|---:|---:|
| W01 | 36 / 33 / 29 | 98 |
| W02 | 23 / 23 / 22 | 68 |
| W03 | 21 / 21 / 21 | 63 |
| W04 | 19 / 18 / 17 | 54 |
| W05 | 17 / 17 / 16 | 50 |
| W06 | 16 / 16 / 16 | 48 |
| W07 | 16 / 16 / 15 | 47 |
| W08 | 15 / 15 / 15 | 45 |
| W09 | 15 / 14 / 14 | 43 |
| W10 | 13 / 13 / 13 | 39 |
| W11 | 12 / 12 / 12 | 36 |
| W12 | 12 / 11 / 11 | 34 |
| W13 | 11 / 11 / 10 | 32 |
| W14 | 10 / 10 / 10 | 30 |
| W15 | 10 / 9 / 8 | 27 |
| W16 | 8 / 7 / 7 | 22 |
| W17 | 6 / 6 / 5 | 17 |
| W18 | 4 / 3 / 2 | 9 |
| W19 | 2 / 2 / idle | 4 |

Wave plan bundan sonra yeniden dengelenmez. Bir agent kullanılamaz hale gelirse
shard sahipliği sessizce değiştirilmez; Global Constraints'teki devir işlemi
uygulanır.

---

### Task 5: Extractor, Reviewer ve Correction Prompt Sözleşmelerini Kilitleme

**Files:**
- Create: `tmp/sat-bank/explanations-en/ops/freeze-prompts.mjs`
- Create: `tmp/sat-bank/explanations-en/prompts/extractor-v1.md`
- Create: `tmp/sat-bank/explanations-en/prompts/reviewer-v1.md`
- Create: `tmp/sat-bank/explanations-en/prompts/correction-v1.md`

**Interfaces:**
- Consumes: `wave-plan.json` assignment/chunk objeleri, rendered PDF sayfaları,
  `bank.json` doğru cevap metadata'sı.
- Produces: Tek biçimli extractor shard kayıtları ve bağımsız review olayları.

- [ ] **Step 1: Extractor prompt'unu yaz**

`apply_patch` ile
`tmp/sat-bank/explanations-en/prompts/extractor-v1.md` dosyasını tam olarak
şöyle oluştur:

```markdown
# SAT Math Official Rationale Extractor — v1

You are an extraction operator, not a solver or translator.

The orchestrator supplies one packet JSON containing:

- `worker`: your fixed logical identity (`A`, `B`, or `C`)
- `assignments`: one or more source-PDF groups, each with:
  - `source_file`: one authorized Unformatted Math Answer Key PDF
  - `shard_file`: the only explanation shard for that PDF
  - `records`: objects with `id`, `source_pages`, `source_order`,
    `question_type`, and `correct_answer`
  - rendered PNG paths for every listed source page
  - text-layer paths for the same pages, for navigation only

The whole packet contains 1–12 IDs. Finish one source-PDF group before opening
the next; never write two shard files concurrently.

Mandatory procedure for every ID:

1. Open and visually inspect every listed PNG page. The text layer is only a
   locator and may omit equations, symbols, tables, or diagrams.
2. Locate the exact `Rationale` section for the assigned 8-hex Question ID.
3. Transcribe the full English rationale in source order. Include the correct
   answer explanation and every wrong-choice explanation present in the source.
4. Exclude the question stem, choices outside the rationale, `Correct Answer`,
   `Question Difficulty`, headers, footers, and adjacent question content.
5. Preserve official wording. Do not translate, summarize, simplify, improve,
   correct, infer, or add a solution step.
6. Normalize only artificial PDF line wraps, line-end hyphenation, and
   meaningless repeated spaces. Preserve real paragraph boundaries and order.
7. Recover every visual mathematical expression from the PNG. Use `$...$` for
   inline math and `$$...$$` only for genuinely displayed math. Use LaTeX such
   as `\frac{a}{b}`, `x^{2}`, and `\sqrt{x}`.
8. Escape currency dollars as `\$`. In the JSON source file, every backslash
   must be JSON-escaped, so parsed `\frac` is written as `\\frac`, parsed
   `\sqrt` as `\\sqrt`, and parsed `\$` as `\\$`.
9. Compare the conclusion with the supplied `correct_answer`. Do not change
   either source if they conflict. Set `needs_review=true` and write a precise
   `review_note` for any conflict or unreadable symbol.
10. Never guess. An unresolved record remains blocked.

Write or replace only your assigned IDs in `shard_file`. Preserve every
unassigned record already present in that shard. No other agent may write this
file while you own it. Keep shard records in `source_order`.

Each record must contain exactly:

```json
{
  "id": "84664a7c",
  "explanation_en": "Choice A is correct. ...",
  "source_file": "Question Bank (Unformatted)/Answer Keys/Math/Algebra/Linear Functions 1 Answer Key.pdf",
  "source_pages": [1],
  "needs_review": false,
  "review_note": null
}
```

Before reporting completion:

- parse the entire shard as JSON;
- serialize it and parse it again;
- confirm assigned IDs occur exactly once;
- confirm every assigned `source_file` and `source_pages` exactly match the
  assignment;
- search for form feed (`U+000C`), replacement character (`U+FFFD`), empty
  formula gaps, unbalanced unescaped `$`, and missing wrong-choice paragraphs.

Return only: shard path, completed IDs, blocked IDs, and concrete notes. Do not
paste protected rationale text into chat.
```

- [ ] **Step 2: Reviewer prompt'unu yaz**

`apply_patch` ile
`tmp/sat-bank/explanations-en/prompts/reviewer-v1.md` dosyasını tam olarak şöyle
oluştur:

```markdown
# SAT Math Official Rationale Reviewer — v1

You are an independent source-fidelity reviewer. You did not extract the
assigned records. You must not edit any explanation shard.

The orchestrator supplies:

- your actual `reviewer_task_id`;
- 1–12 IDs;
- their explanation shard records;
- source PDF paths and exact `source_pages`;
- rendered PNG paths and text-layer helper paths;
- bank `correct_answer`;
- the review output path, which only you may write.

For every ID, visually open all source pages and compare the shard against the
official `Rationale` section. Check independently:

1. `source_faithful`: official English wording and paragraph order are
   preserved; no paraphrase, translation, correction, or invented solution.
2. `complete_rationale`: correct-answer reasoning and all source wrong-choice
   explanations are present; headers, question text, difficulty, and adjacent
   records are absent.
3. `math_faithful`: every visual variable, operator, exponent, root, fraction,
   inequality, unit, and currency mark matches the page and valid LaTeX
   delimiters are used.
4. `answer_consistent`: the rationale conclusion agrees with the supplied bank
   `correct_answer`.

Output one event per ID with exactly these fields:

```json
{
  "id": "84664a7c",
  "reviewer_task_id": "/root/extractor_b",
  "review_round": 1,
  "status": "approved",
  "source_faithful": true,
  "math_faithful": true,
  "answer_consistent": true,
  "complete_rationale": true,
  "review_note": null
}
```

Use `approved` only when all four booleans are `true`, the shard record has
`needs_review=false`, and no uncertainty remains. Otherwise use `rejected`,
mark every failed boolean accurately, and write one short, concrete correction
note naming the missing/wrong source element and page. Do not rewrite the
rationale in the note and do not paste protected source text into chat.

Parse → serialize → parse the whole review JSON before completion. Return only
the review path and approved/rejected ID lists.
```

- [ ] **Step 3: Correction prompt'unu yaz**

`apply_patch` ile
`tmp/sat-bank/explanations-en/prompts/correction-v1.md` dosyasını tam olarak
şöyle oluştur:

```markdown
# SAT Math Official Rationale Correction — v1

You are the current owner of the assigned source-PDF shard. Correct only the
explicitly rejected IDs; preserve every other record byte-for-byte.

For each rejected ID:

1. Read the independent review event and its concrete note.
2. Reopen every assigned PNG source page and verify the issue yourself.
3. Correct the shard using the same source-fidelity, completeness, English-only,
   and LaTeX/JSON rules in `extractor-v1.md`.
4. Do not blindly copy reviewer wording, solve the problem independently,
   translate, paraphrase, or alter official oddities.
5. If the page still cannot establish the exact content, keep
   `needs_review=true`, write a precise `review_note`, and report the ID as
   blocked. Never guess.
6. If fully resolved, set `needs_review=false` and `review_note=null`.

Replace the rejected record in place; never append a duplicate. Parse →
serialize → parse the full shard, then verify that only the rejected IDs changed.
The orchestrator will send corrected IDs to the third logical worker for a
higher `review_round`; you must not self-approve.

Return only the shard path, corrected IDs, blocked IDs, and concrete notes. Do
not paste protected rationale text into chat.
```

- [ ] **Step 4: Prompt freeze script'ini yaz**

`apply_patch` ile `tmp/sat-bank/explanations-en/ops/freeze-prompts.mjs`
dosyasını tam olarak şöyle oluştur:

```js
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const byteCompare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const fail = (message) => {
  throw new Error(message);
};
const requireArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) fail(`Missing ${name}`);
  return process.argv[index + 1];
};
const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const promptDir = resolve(requireArg("--prompt-dir"));
const outPath = resolve(requireArg("--out"));
if (existsSync(outPath)) fail(`Refusing to replace existing prompt freeze: ${outPath}`);
const names = readdirSync(promptDir)
  .filter((name) => name.endsWith("-v1.md"))
  .sort(byteCompare);
const expected = [
  "correction-v1.md",
  "extractor-v1.md",
  "reviewer-v1.md",
];
if (JSON.stringify(names) !== JSON.stringify(expected)) {
  fail(`Unexpected v1 prompt files: ${JSON.stringify(names)}`);
}
const payload = {
  schema_version: 1,
  prompt_version: "v1",
  created_at: new Date().toISOString(),
  sha256: Object.fromEntries(
    names.map((name) => [name, sha256(join(promptDir, name))]),
  ),
};
const temporary = `${outPath}.tmp-${process.pid}`;
writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
renameSync(temporary, outPath);
console.log(`prompt_version=v1 files=${names.length}`);
```

- [ ] **Step 5: Prompt yasaklarını, sürümü ve freeze'i doğrula**

Run:

```bash
test "$(find tmp/sat-bank/explanations-en/prompts -type f -name '*-v1.md' | wc -l | tr -d ' ')" = 3
rg -n 'Do not translate|must not edit|Correct only|Never guess|wrong-choice|JSON-escaped' \
  tmp/sat-bank/explanations-en/prompts
shasum -a 256 tmp/sat-bank/explanations-en/prompts/*-v1.md
node tmp/sat-bank/explanations-en/ops/freeze-prompts.mjs \
  --prompt-dir tmp/sat-bank/explanations-en/prompts \
  --out tmp/sat-bank/explanations-en/prompt-freeze.json
jq -e '
  .prompt_version == "v1" and
  (.sha256 | keys | sort) == [
    "correction-v1.md",
    "extractor-v1.md",
    "reviewer-v1.md"
  ] and
  all(.sha256[]; test("^[0-9a-f]{64}$"))
' tmp/sat-bank/explanations-en/prompt-freeze.json
```

Expected: Üç dosya bulunur; `rg` her üç sözleşmenin kritik yasaklarını gösterir;
`prompt_version=v1 files=3`, jq `true`; üç SHA-256 değeri sonraki manifest için
saklanır.

Checkpoint: Prompt dosyaları pilot başladıktan sonra değiştirilemez. Değişiklik
gerekirse mevcut run durur ve yeni prompt-version/checksum ile yeni run açılır.

---

### Task 6: Yapısal ve Review Kabul Validator'ını Hazırlama

**Files:**
- Create: `tmp/sat-bank/explanations-en/ops/validate-artifacts.test.mjs`
- Create: `tmp/sat-bank/explanations-en/ops/validate-artifacts.mjs`

**Interfaces:**
- Consumes: Kümülatif target ID listesi, tüm mevcut shard'lar, tüm review
  olayları, `source-index.json`, `wave-plan.json`, `agent-registry.json`, kaynak
  kökü.
- Produces: ID-sıralı birleşik explanation JSON, tüm review geçmişi, QA report;
  herhangi bir açık/eksik/duplicate/bozuk-LaTeX kaydında exit `1`.

- [ ] **Step 1: Synthetic kabul ve red testini yaz**

`apply_patch` ile
`tmp/sat-bank/explanations-en/ops/validate-artifacts.test.mjs` dosyasını tam
olarak şöyle oluştur:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const script = resolve(
  "/Users/keremyarar/italypath-main/tmp/sat-bank/explanations-en/ops/validate-artifacts.mjs",
);
const writeJson = (path, value) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");

const makeFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "sat-rationale-validator-"));
  const source = join(root, "source");
  const shards = join(root, "shards");
  const reviews = join(root, "reviews");
  const out = join(root, "out");
  for (const directory of [source, shards, reviews, out]) {
    mkdirSync(directory, { recursive: true });
  }
  writeFileSync(join(source, "source.pdf"), "fixture", "utf8");
  writeJson(join(root, "targets.json"), ["1234abcd"]);
  writeJson(join(root, "source-index.json"), {
    schema_version: 1,
    records: [{
      id: "1234abcd",
      source_file: "source.pdf",
      source_pages: [2],
      source_order: 1,
    }],
  });
  writeJson(join(root, "wave-plan.json"), {
    schema_version: 1,
    waves: [{
      wave_id: "W01",
      assignments: [{
        source_file: "source.pdf",
        pilot_ids: ["1234abcd"],
        target_ids: [],
        extractor: "A",
        reviewer: "B",
        correction_owner: "A",
        second_reviewer: "C",
      }],
    }],
  });
  writeJson(join(root, "agent-registry.json"), {
    A: ["/root/extractor-a"],
    B: ["/root/reviewer-b"],
    C: ["/root/reviewer-c"],
  });
  writeJson(join(shards, "one.json"), [{
    id: "1234abcd",
    explanation_en: "Choice A is correct because $x^{2}=4$.",
    source_file: "source.pdf",
    source_pages: [2],
    needs_review: false,
    review_note: null,
  }]);
  writeJson(join(reviews, "one.json"), [{
    id: "1234abcd",
    reviewer_task_id: "/root/reviewer-b",
    review_round: 1,
    status: "approved",
    source_faithful: true,
    math_faithful: true,
    answer_consistent: true,
    complete_rationale: true,
    review_note: null,
  }]);
  return { root, source, shards, reviews, out };
};

const run = (fixture) =>
  execFileSync(process.execPath, [
    script,
    "--source-root", fixture.source,
    "--source-index", join(fixture.root, "source-index.json"),
    "--wave-plan", join(fixture.root, "wave-plan.json"),
    "--agent-registry", join(fixture.root, "agent-registry.json"),
    "--targets", join(fixture.root, "targets.json"),
    "--shards-dir", fixture.shards,
    "--reviews-dir", fixture.reviews,
    "--merged-out", join(fixture.out, "explanations.json"),
    "--reviews-out", join(fixture.out, "reviews.json"),
    "--qa-out", join(fixture.out, "qa.json"),
  ], { encoding: "utf8" });

test("accepts a complete, independently approved record", () => {
  const fixture = makeFixture();
  assert.match(run(fixture), /status=passed targets=1 records=1 approved=1 failures=0/);
  const qa = JSON.parse(readFileSync(join(fixture.out, "qa.json"), "utf8"));
  assert.equal(qa.status, "passed");
});

test("rejects a control character and an unapproved record", () => {
  const fixture = makeFixture();
  writeJson(join(fixture.shards, "one.json"), [{
    id: "1234abcd",
    explanation_en: "Choice A\f is correct.",
    source_file: "source.pdf",
    source_pages: [2],
    needs_review: true,
    review_note: "Unreadable formula.",
  }]);
  assert.throws(() => run(fixture));
  const qa = JSON.parse(readFileSync(join(fixture.out, "qa.json"), "utf8"));
  assert.equal(qa.status, "failed");
  assert.ok(qa.failures.some((failure) => failure.includes("control character")));
  assert.ok(qa.failures.some((failure) => failure.includes("needs_review")));
});

test("rejects a LaTeX command that KaTeX cannot parse", () => {
  const fixture = makeFixture();
  writeJson(join(fixture.shards, "one.json"), [{
    id: "1234abcd",
    explanation_en: "Choice A is correct because $\\notacommand{x}$.",
    source_file: "source.pdf",
    source_pages: [2],
    needs_review: false,
    review_note: null,
  }]);
  assert.throws(() => run(fixture));
  const qa = JSON.parse(readFileSync(join(fixture.out, "qa.json"), "utf8"));
  assert.equal(qa.status, "failed");
  assert.ok(qa.failures.some((failure) => failure.includes("invalid LaTeX")));
});
```

- [ ] **Step 2: Testin script eksikliğiyle başarısız olduğunu gör**

Run:

```bash
node --test tmp/sat-bank/explanations-en/ops/validate-artifacts.test.mjs
```

Expected: FAIL; `validate-artifacts.mjs` bulunamadığı için üç test geçmez.

- [ ] **Step 3: Validator'ı yaz**

`apply_patch` ile
`tmp/sat-bank/explanations-en/ops/validate-artifacts.mjs` dosyasını tam olarak
şöyle oluştur:

```js
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const requireFromRepo = createRequire(join(process.cwd(), "package.json"));
const katex = requireFromRepo("katex");

const byteCompare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const fail = (message) => {
  throw new Error(message);
};
const requireArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) fail(`Missing ${name}`);
  return process.argv[index + 1];
};
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJsonAtomic = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
};
const listJson = (root) => {
  if (!existsSync(root)) return [];
  const found = [];
  const walk = (directory) => {
    for (const name of readdirSync(directory).sort(byteCompare)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".json")) found.push(path);
    }
  };
  walk(root);
  return found;
};
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const hasControlCharacter = (value) =>
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ufffd]/u.test(value);
const isEscaped = (value, index) => {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
};
const unescapedDollarCount = (value) => {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "$" && !isEscaped(value, index)) count += 1;
  }
  return count;
};
const mathSegments = (value) => {
  const segments = [];
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "$" || isEscaped(value, index)) continue;
    const displayMode = value[index + 1] === "$";
    const delimiterLength = displayMode ? 2 : 1;
    const contentStart = index + delimiterLength;
    let closing = -1;
    for (let cursor = contentStart; cursor < value.length; cursor += 1) {
      if (value[cursor] !== "$" || isEscaped(value, cursor)) continue;
      if (displayMode && value[cursor + 1] !== "$") continue;
      if (!displayMode && value[cursor + 1] === "$") continue;
      closing = cursor;
      break;
    }
    if (closing < 0) throw new Error("unclosed math delimiter");
    const tex = value.slice(contentStart, closing).trim();
    if (!tex) throw new Error("empty math segment");
    segments.push({ tex, displayMode });
    index = closing + delimiterLength - 1;
  }
  return segments;
};

const sourceRoot = resolve(requireArg("--source-root"));
const sourceIndexPath = resolve(requireArg("--source-index"));
const wavePlanPath = resolve(requireArg("--wave-plan"));
const agentRegistryPath = resolve(requireArg("--agent-registry"));
const targetsPath = resolve(requireArg("--targets"));
const shardsDir = resolve(requireArg("--shards-dir"));
const reviewsDir = resolve(requireArg("--reviews-dir"));
const mergedOut = resolve(requireArg("--merged-out"));
const reviewsOut = resolve(requireArg("--reviews-out"));
const qaOut = resolve(requireArg("--qa-out"));
const structuralOnly = process.argv.includes("--structural-only");

const failures = [];
const targets = readJson(targetsPath);
if (!Array.isArray(targets)) failures.push("targets must be an array");
const targetSet = new Set(targets);
if (targetSet.size !== targets.length) failures.push("duplicate target ID");

const sourceRecords = readJson(sourceIndexPath).records;
const sourceById = new Map(sourceRecords.map((record) => [record.id, record]));
const wavePlan = readJson(wavePlanPath);
const agentRegistry = readJson(agentRegistryPath);
if (
  !["A", "B", "C"].every(
    (worker) =>
      Array.isArray(agentRegistry[worker]) &&
      agentRegistry[worker].length >= 1 &&
      agentRegistry[worker].every(
        (taskId) => typeof taskId === "string" && taskId.length > 0,
      ),
  ) ||
  new Set(Object.values(agentRegistry).flat()).size !==
    Object.values(agentRegistry).flat().length
) {
  failures.push("agent registry must map A/B/C to distinct canonical task-ID histories");
}
const assignmentById = new Map();
for (const assignment of wavePlan.waves.flatMap(({ assignments }) => assignments)) {
  for (const id of [...assignment.pilot_ids, ...assignment.target_ids]) {
    if (assignmentById.has(id)) failures.push(`${id}: duplicate wave assignment`);
    assignmentById.set(id, assignment);
  }
}
const explanationFiles = listJson(shardsDir);
const reviewFiles = listJson(reviewsDir);
const explanations = [];
const reviews = [];

for (const path of explanationFiles) {
  const payload = readJson(path);
  if (!Array.isArray(payload)) {
    failures.push(`${path}: shard must be an array`);
    continue;
  }
  explanations.push(...payload);
}
for (const path of reviewFiles) {
  const payload = readJson(path);
  if (!Array.isArray(payload)) {
    failures.push(`${path}: review file must be an array`);
    continue;
  }
  reviews.push(...payload);
}

const expectedExplanationKeys = [
  "explanation_en",
  "id",
  "needs_review",
  "review_note",
  "source_file",
  "source_pages",
].sort(byteCompare);
const recordsById = Map.groupBy(explanations, ({ id }) => id);

for (const [id, records] of recordsById) {
  if (!targetSet.has(id)) failures.push(`${id}: explanation outside checkpoint target`);
  if (records.length !== 1) failures.push(`${id}: duplicate explanation records=${records.length}`);
}
for (const id of targets) {
  if (!recordsById.has(id)) failures.push(`${id}: missing explanation`);
}

for (const record of explanations) {
  const keys = Object.keys(record).sort(byteCompare);
  if (!sameJson(keys, expectedExplanationKeys)) {
    failures.push(`${record.id}: explanation fields ${JSON.stringify(keys)}`);
  }
  if (!/^[0-9a-f]{8}$/.test(record.id ?? "")) failures.push(`${record.id}: invalid ID`);
  if (typeof record.explanation_en !== "string" || !record.explanation_en.trim()) {
    failures.push(`${record.id}: empty explanation_en`);
  } else {
    if (hasControlCharacter(record.explanation_en)) {
      failures.push(`${record.id}: control character or replacement character`);
    }
    if (unescapedDollarCount(record.explanation_en) % 2 !== 0) {
      failures.push(`${record.id}: unbalanced unescaped dollar delimiter`);
    }
    try {
      for (const { tex, displayMode } of mathSegments(record.explanation_en)) {
        katex.renderToString(tex, { throwOnError: true, displayMode });
      }
    } catch (error) {
      failures.push(`${record.id}: invalid LaTeX (${error.message})`);
    }
  }
  if (typeof record.needs_review !== "boolean") {
    failures.push(`${record.id}: needs_review must be boolean`);
  } else if (record.needs_review) {
    if (typeof record.review_note !== "string" || !record.review_note.trim()) {
      failures.push(`${record.id}: blocked record needs a concrete review_note`);
    }
    if (!structuralOnly) failures.push(`${record.id}: needs_review is not false`);
  } else if (record.review_note !== null) {
    failures.push(`${record.id}: accepted review_note is not null`);
  }

  const source = sourceById.get(record.id);
  if (!source) {
    failures.push(`${record.id}: no source-index record`);
  } else {
    if (record.source_file !== source.source_file) {
      failures.push(`${record.id}: source_file mismatch`);
    }
    if (!sameJson(record.source_pages, source.source_pages)) {
      failures.push(`${record.id}: source_pages mismatch`);
    }
    if (!existsSync(join(sourceRoot, record.source_file))) {
      failures.push(`${record.id}: source PDF does not exist`);
    }
  }
}

const expectedReviewKeys = [
  "answer_consistent",
  "complete_rationale",
  "id",
  "math_faithful",
  "review_note",
  "review_round",
  "reviewer_task_id",
  "source_faithful",
  "status",
].sort(byteCompare);
const reviewKeysSeen = new Set();
for (const review of reviews) {
  const keys = Object.keys(review).sort(byteCompare);
  if (!sameJson(keys, expectedReviewKeys)) {
    failures.push(`${review.id}: review fields ${JSON.stringify(keys)}`);
  }
  if (!targetSet.has(review.id)) failures.push(`${review.id}: review outside checkpoint target`);
  if (typeof review.reviewer_task_id !== "string" || !review.reviewer_task_id.trim()) {
    failures.push(`${review.id}: missing reviewer_task_id`);
  }
  if (!Number.isInteger(review.review_round) || review.review_round < 1) {
    failures.push(`${review.id}: invalid review_round`);
  }
  if (![1, 2].includes(review.review_round)) {
    failures.push(`${review.id}: only review rounds 1 and 2 are allowed`);
  }
  const assignment = assignmentById.get(review.id);
  if (!assignment) {
    failures.push(`${review.id}: no wave assignment for review`);
  } else {
    const expectedWorker = review.review_round === 1
      ? assignment.reviewer
      : assignment.second_reviewer;
    const expectedTaskIds = agentRegistry[expectedWorker] ?? [];
    if (!expectedTaskIds.includes(review.reviewer_task_id)) {
      failures.push(
        `${review.id}: reviewer task mismatch; expected logical ${expectedWorker}`,
      );
    }
    if ((agentRegistry[assignment.extractor] ?? []).includes(review.reviewer_task_id)) {
      failures.push(`${review.id}: extractor cannot review own record`);
    }
  }
  const eventKey = `${review.id}#${review.review_round}`;
  if (reviewKeysSeen.has(eventKey)) failures.push(`${eventKey}: duplicate review round`);
  reviewKeysSeen.add(eventKey);
  if (!["approved", "rejected"].includes(review.status)) {
    failures.push(`${review.id}: invalid review status`);
  }
  const checks = [
    review.source_faithful,
    review.math_faithful,
    review.answer_consistent,
    review.complete_rationale,
  ];
  if (!checks.every((value) => typeof value === "boolean")) {
    failures.push(`${review.id}: review checks must be booleans`);
  }
  if (review.status === "approved" && (!checks.every(Boolean) || review.review_note !== null)) {
    failures.push(`${review.id}: invalid approved review`);
  }
  if (
    review.status === "rejected" &&
    (checks.every(Boolean) ||
      typeof review.review_note !== "string" ||
      !review.review_note.trim())
  ) {
    failures.push(`${review.id}: invalid rejected review`);
  }
}

const reviewsById = Map.groupBy(reviews, ({ id }) => id);
let approved = 0;
for (const id of targets) {
  const events = [...(reviewsById.get(id) ?? [])].sort(
    (left, right) => left.review_round - right.review_round,
  );
  const latest = events.at(-1);
  if (!latest && !structuralOnly) {
    failures.push(`${id}: missing independent review`);
  } else if (latest && latest.status !== "approved" && !structuralOnly) {
    failures.push(`${id}: latest review is not approved`);
  } else if (latest?.status === "approved") {
    approved += 1;
  }
}

const orderedExplanations = explanations.sort((left, right) => byteCompare(left.id, right.id));
const orderedReviews = reviews.sort(
  (left, right) =>
    byteCompare(left.id, right.id) || left.review_round - right.review_round,
);
const qa = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  validation_mode: structuralOnly ? "structural-only" : "full-acceptance",
  status: failures.length === 0 ? "passed" : "failed",
  target_count: targets.length,
  explanation_count: explanations.length,
  review_event_count: reviews.length,
  effective_approved_count: approved,
  open_needs_review_count: explanations.filter(({ needs_review }) => needs_review).length,
  duplicate_explanation_count: [...recordsById.values()]
    .filter((records) => records.length > 1).length,
  failures,
};

writeJsonAtomic(mergedOut, orderedExplanations);
writeJsonAtomic(reviewsOut, orderedReviews);
writeJsonAtomic(qaOut, qa);
console.log(
  `status=${qa.status} targets=${qa.target_count} records=${qa.explanation_count} ` +
  `approved=${qa.effective_approved_count} failures=${qa.failures.length}`,
);
if (failures.length > 0) process.exitCode = 1;
```

- [ ] **Step 4: Synthetic testleri geçir**

Run:

```bash
node --test tmp/sat-bank/explanations-en/ops/validate-artifacts.test.mjs
```

Expected: `3` test, `3` pass, `0` fail.

- [ ] **Step 5: Script syntax ve gerçek boş-state red kapısını doğrula**

Run:

```bash
node --check tmp/sat-bank/explanations-en/ops/validate-artifacts.mjs
node tmp/sat-bank/explanations-en/ops/validate-artifacts.mjs \
  --source-root '/Users/keremyarar/Desktop/SAT Question Bank PDFs' \
  --source-index tmp/sat-bank/explanations-en/source-index.json \
  --wave-plan tmp/sat-bank/explanations-en/wave-plan.json \
  --agent-registry tmp/sat-bank/explanations-en/agent-registry.json \
  --targets tmp/sat-bank/explanations-en/checkpoint-targets/PILOT.json \
  --shards-dir tmp/sat-bank/explanations-en/shards \
  --reviews-dir tmp/sat-bank/explanations-en/reviews \
  --merged-out tmp/sat-bank/explanations-en/pilot-explanations-en.json \
  --reviews-out tmp/sat-bank/explanations-en/reviews.json \
  --qa-out tmp/sat-bank/explanations-en/qa-report.json
```

Expected: `node --check` geçer; ikinci komut **FAIL** ve
`status=failed targets=40 records=0 approved=0 failures=80` yazar. Bu red,
boş extraction'ın yanlışlıkla kabul edilmediğini kanıtlar.

---

### Task 7: 40 Soruluk Pilot Extraction'ı Yürütme

**Files:**
- Create: `tmp/sat-bank/explanations-en/ops/render-pages.mjs`
- Create: `tmp/sat-bank/explanations-en/ops/record-transfer.mjs`
- Create: `tmp/sat-bank/explanations-en/packets/PILOT/{worker}/{packet}/`
- Create/Modify: `tmp/sat-bank/explanations-en/shards/*-explanations.json`

**Interfaces:**
- Consumes: `extractor-v1.md`, pilot ID/source metadata, wave-plan'daki sabit
  shard owner, görsel PDF sayfaları ve bank `correct_answer`.
- Produces: Tam 40 pilot explanation kaydı; her shard yalnız atanmış owner
  tarafından yazılmış olur.

- [ ] **Step 1: Source freeze'i extraction'dan hemen önce yeniden doğrula**

Run:

```bash
test "$(shasum -a 256 tmp/sat-bank/bank.json | awk '{print $1}')" = \
  "$(jq -r '.bank_sha256' tmp/sat-bank/explanations-en/source-freeze.json)"
test "$(shasum -a 256 tmp/sat-bank/explanations-en/target-ids.json | awk '{print $1}')" = \
  "$(jq -r '.target_ids_sha256' tmp/sat-bank/explanations-en/source-freeze.json)"
test "$(shasum -a 256 tmp/sat-bank/explanations-en/source-index.json | awk '{print $1}')" = \
  "$(jq -r '.source_index_sha256' tmp/sat-bank/explanations-en/source-freeze.json)"
test "$(shasum -a 256 tmp/sat-bank/explanations-en/source-inventory.json | awk '{print $1}')" = \
  "$(jq -r '.source_inventory_sha256' tmp/sat-bank/explanations-en/source-freeze.json)"

while IFS=$'\t' read -r expected relative_path; do
  actual="$(shasum -a 256 "/Users/keremyarar/Desktop/SAT Question Bank PDFs/$relative_path" | awk '{print $1}')"
  test "$actual" = "$expected" || {
    echo "SOURCE DRIFT: $relative_path"
    exit 1
  }
done < <(jq -r '.files[] | [.sha256, .source_file] | @tsv' \
  tmp/sat-bank/explanations-en/source-inventory.json)

while IFS=$'\t' read -r expected prompt_name; do
  actual="$(shasum -a 256 "tmp/sat-bank/explanations-en/prompts/$prompt_name" | awk '{print $1}')"
  test "$actual" = "$expected" || {
    echo "PROMPT DRIFT: $prompt_name"
    exit 1
  }
done < <(jq -r '.sha256 | to_entries[] | [.value, .key] | @tsv' \
  tmp/sat-bank/explanations-en/prompt-freeze.json)
```

Expected: sessiz exit `0`. Source veya prompt farkında pilot başlamaz.

- [ ] **Step 2: Güvenli sayfa renderer'ını yaz**

`apply_patch` ile `tmp/sat-bank/explanations-en/ops/render-pages.mjs` dosyasını
tam olarak şöyle oluştur:

```js
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const fail = (message) => {
  throw new Error(message);
};
const requireArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) fail(`Missing ${name}`);
  return process.argv[index + 1];
};

const sourceRoot = resolve(requireArg("--source-root"));
const sourceFile = requireArg("--source-file");
const pages = requireArg("--pages")
  .split(",")
  .map(Number)
  .filter((page) => Number.isInteger(page) && page > 0);
const outDir = resolve(requireArg("--out-dir"));
const pdfPath = resolve(sourceRoot, sourceFile);
const withinRoot = relative(sourceRoot, pdfPath);
if (withinRoot.startsWith("..") || withinRoot === "") {
  fail(`Source file escapes source root: ${sourceFile}`);
}
if (pages.length === 0 || new Set(pages).size !== pages.length) {
  fail("Pages must be a non-empty unique comma-separated list");
}

mkdirSync(outDir, { recursive: true });
for (const page of [...pages].sort((left, right) => left - right)) {
  const prefix = join(outDir, `source-page-${String(page).padStart(3, "0")}`);
  execFileSync("pdftoppm", [
    "-f", String(page),
    "-l", String(page),
    "-r", "220",
    "-png",
    pdfPath,
    prefix,
  ], { stdio: "inherit" });
  execFileSync("pdftotext", [
    "-layout",
    "-f", String(page),
    "-l", String(page),
    pdfPath,
    `${prefix}.txt`,
  ], { stdio: "inherit" });
  const prefixName = basename(prefix);
  const renderedPngs = readdirSync(outDir).filter(
    (name) => name.startsWith(`${prefixName}-`) && name.endsWith(".png"),
  );
  if (renderedPngs.length !== 1 || !existsSync(`${prefix}.txt`)) {
    fail(`Expected one PNG and one text layer for page ${page}`);
  }
}
console.log(
  `rendered source=${basename(sourceFile)} pages=${[...pages].sort((a, b) => a - b).join(",")}`,
);
```

Run:

```bash
node --check tmp/sat-bank/explanations-en/ops/render-pages.mjs
```

Expected: exit `0`.

- [ ] **Step 3: Üç kalıcı logical worker başlat**

Orkestratör üç yardımcı agent açar ve canonical task adlarını kaydeder:

```text
extractor_a  -> logical worker A
extractor_b  -> logical worker B
extractor_c  -> logical worker C
```

`spawn_agent` çağrılarında `task_name` sırasıyla exact `extractor_a`,
`extractor_b`, `extractor_c` olur. Dönen canonical adlar
`agent-registry.json` içindeki `/root/extractor_a`, `/root/extractor_b`,
`/root/extractor_c` değerleriyle birebir karşılaştırılır; farklılıkta DUR.

Her agent'a şu sınırlar gönderilir:

- Yalnız `wave-plan.json` içinde kendi `extractor` harfiyle işaretli shard'ları
  yazabilir.
- Aynı agent daha sonra başkasının shard'ını reviewer olarak okuyabilir; o
  shard'ı hiçbir durumda düzenleyemez.
- Agent tamamlanıp idle olsa bile sonraki pilot/bulk işi yeni agent açmak yerine
  aynı canonical task'a `followup_task` ile gönderilir.
- Agent kalıcı olarak kaybolursa bu bir ownership transfer'dır; eski görev
  interrupt/terminal olmadan yeni writer başlatılmaz.

Root extraction veya review yapmaz; queue, kaynak freeze ve kabul kapılarını
yönetir.

- [ ] **Step 4: Yalnız gerektiğinde atomik ownership transfer uygula**

`apply_patch` ile `tmp/sat-bank/explanations-en/ops/record-transfer.mjs`
dosyasını tam olarak şöyle oluştur:

```js
import {
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const fail = (message) => {
  throw new Error(message);
};
const requireArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) fail(`Missing ${name}`);
  return process.argv[index + 1];
};
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeTemporary = (path, value) => {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return temporary;
};

const sourceFile = requireArg("--source-file");
const logicalWorker = requireArg("--logical-worker");
const fromTaskId = requireArg("--from-task-id");
const toTaskId = requireArg("--to-task-id");
const reason = requireArg("--reason");
const registryPath = resolve(requireArg("--agent-registry"));
const transfersPath = resolve(requireArg("--transfers"));
const wavePlanPath = resolve(requireArg("--wave-plan"));

if (!["A", "B", "C"].includes(logicalWorker)) fail("logical worker must be A/B/C");
const registry = readJson(registryPath);
const transfers = readJson(transfersPath);
const wavePlan = readJson(wavePlanPath);
if (!Array.isArray(registry[logicalWorker])) fail("invalid agent registry");
if (!registry[logicalWorker].includes(fromTaskId)) fail("from task is not registered");
if (Object.values(registry).flat().includes(toTaskId)) fail("to task is already registered");
if (!Array.isArray(transfers)) fail("transfers must be an array");
const assignment = wavePlan.waves
  .flatMap(({ assignments }) => assignments)
  .find(({ source_file }) => source_file === sourceFile);
if (!assignment || assignment.extractor !== logicalWorker) {
  fail("source shard is not owned by the requested logical worker");
}
if (transfers.some(({ source_file, to_task_id }) =>
  source_file === sourceFile && to_task_id === toTaskId)) {
  fail("duplicate ownership transfer");
}

registry[logicalWorker].push(toTaskId);
transfers.push({
  source_file: sourceFile,
  logical_worker: logicalWorker,
  from_task_id: fromTaskId,
  to_task_id: toTaskId,
  reason,
  transferred_at: new Date().toISOString(),
});

const registryTemporary = writeTemporary(registryPath, registry);
const transfersTemporary = writeTemporary(transfersPath, transfers);
renameSync(registryTemporary, registryPath);
renameSync(transfersTemporary, transfersPath);
console.log(`transferred source=${sourceFile} from=${fromTaskId} to=${toTaskId}`);
```

Normal akışta script çağrılmaz. Bir owner kalıcı olarak kullanılamıyorsa:

1. Eski canonical task'ın artık çalışmadığını `interrupt_agent`/status ile
   doğrula.
2. İlgili logical worker için `extractor_a_replacement_1` deseninde tek
   replacement agent aç.
3. Wave planındaki gerçek source path'i, eski/yeni canonical task adlarını ve
   somut nedeni aşağıdaki exact arayüze ver:

```bash
node tmp/sat-bank/explanations-en/ops/record-transfer.mjs \
  --source-file "$TRANSFER_SOURCE_FILE" \
  --logical-worker "$TRANSFER_LOGICAL_WORKER" \
  --from-task-id "$TRANSFER_FROM_TASK_ID" \
  --to-task-id "$TRANSFER_TO_TASK_ID" \
  --reason "$TRANSFER_REASON" \
  --agent-registry tmp/sat-bank/explanations-en/agent-registry.json \
  --transfers tmp/sat-bank/explanations-en/ownership-transfers.json \
  --wave-plan tmp/sat-bank/explanations-en/wave-plan.json
```

`TRANSFER_*` değişkenleri yalnız doğrulanmış runtime değerleridir; boş veya
wave-plan dışı değer script tarafından reddedilir. Tüm shard tek seferde
devredilir; eski ve yeni task aynı shard üzerinde örtüşmez.

- [ ] **Step 5: Pilot assignment'larını logical worker'a göre çıkar**

Run:

```bash
for worker in A B C; do
  jq --arg worker "$worker" '
    [
      .waves[].assignments[]
      | select(.extractor == $worker and (.pilot_ids | length) > 0)
      | {
          source_file,
          shard_file,
          pilot_ids,
          extractor,
          reviewer,
          second_reviewer
        }
    ]
  ' tmp/sat-bank/explanations-en/wave-plan.json
done
```

Expected: Her pilot ID tam bir extractor grubunda görünür; birleşim 40, kesişim
0. Root, aynı worker'ın source gruplarını kaynak sırasını koruyarak toplam en
fazla 12 ID'lik packet'lara böler. Bir source grubunu sırf denge için başka
worker'a taşımaz.

- [ ] **Step 6: Her packet için exact task metadata'sını hazırla**

40 pilot ID'nin metadata'sını tek seferde şu sorguyla al:

```bash
jq --slurpfile bank tmp/sat-bank/bank.json \
   --slurpfile pilot tmp/sat-bank/explanations-en/pilot-target-ids.json '
  ($bank[0].bank | map({key: .id, value: .}) | from_entries) as $by_id
  | [
      .records[]
      | select(.id as $id | $pilot[0] | index($id))
      | {
          id,
          source_file,
          source_pages,
          source_order,
          question_type: $by_id[.id].question_type,
          correct_answer: $by_id[.id].correct_answer
        }
    ]
' tmp/sat-bank/explanations-en/source-index.json
```

Expected: Tam 40 benzersiz metadata objesi.

Her source grubunun benzersiz sayfalarını aynı komut sözleşmesiyle render et.
İlk pilot kaydının exact çağrısı:

```bash
node tmp/sat-bank/explanations-en/ops/render-pages.mjs \
  --source-root '/Users/keremyarar/Desktop/SAT Question Bank PDFs' \
  --source-file 'Question Bank (Unformatted)/Answer Keys/Math/Geometry and Trigonometry/Area and Volume 3 Answer Key.pdf' \
  --pages '3' \
  --out-dir tmp/sat-bank/explanations-en/packets/PILOT/A/P01/area-and-volume-3
```

Sonraki çağrıların source path, pages, worker ve packet dizini doğrudan
`wave-plan/source-index` değerlerinden okunur. İki sayfalı pilot kayıtları
mutlaka şunları render eder:

```text
7d68096f -> 2,3
90095507 -> 9,10
6cb9bf45 -> 9,10
2704399f -> 17,18
7b52985c -> 4,5
```

- [ ] **Step 7: Pilot extractor packet'larını sırayla gönder**

Her logical worker'a aynı anda en fazla bir packet gönder. Mesaj içeriği:

1. `prompts/extractor-v1.md` dosyasını eksiksiz okuma talimatı;
2. logical worker harfi;
3. bir veya daha fazla `assignments` grubu;
4. her grup için `source_file`, `shard_file`, record metadata ve rendered
   PNG/text path'leri;
5. “başka worker'ların dosyalarına dokunma; korumalı rationale metnini chat'e
   yapıştırma” sınırı.

Bir packet tamamlandığında root tüm shard dosyalarında şu kontrolü çalıştırır:

```bash
while IFS= read -r shard_file; do
  jq -e '
    type == "array" and
    (map(.id) | unique | length) == length and
    all(.[];
      (.id | test("^[0-9a-f]{8}$")) and
      (.explanation_en | type == "string" and length > 0) and
      (.source_file | type == "string" and length > 0) and
      (.source_pages | type == "array" and length >= 1) and
      (.needs_review | type == "boolean") and
      ((.needs_review == true and
        (.review_note | type == "string" and length > 0)) or
       (.needs_review == false and .review_note == null)))
  ' "$shard_file" || exit 1
done < <(find tmp/sat-bank/explanations-en/shards \
  -type f -name '*-explanations.json' | LC_ALL=C sort)
```

Expected: Her mevcut shard için `true`. Kontrol geçmeden aynı shard'ın sonraki
packet'ı gönderilmez.

- [ ] **Step 8: 40 kaydın structural-only kapısını çalıştır**

Run:

```bash
node tmp/sat-bank/explanations-en/ops/validate-artifacts.mjs \
  --structural-only \
  --source-root '/Users/keremyarar/Desktop/SAT Question Bank PDFs' \
  --source-index tmp/sat-bank/explanations-en/source-index.json \
  --wave-plan tmp/sat-bank/explanations-en/wave-plan.json \
  --agent-registry tmp/sat-bank/explanations-en/agent-registry.json \
  --targets tmp/sat-bank/explanations-en/checkpoint-targets/PILOT.json \
  --shards-dir tmp/sat-bank/explanations-en/shards \
  --reviews-dir tmp/sat-bank/explanations-en/reviews \
  --merged-out tmp/sat-bank/explanations-en/pilot-explanations-en.json \
  --reviews-out tmp/sat-bank/explanations-en/reviews.json \
  --qa-out tmp/sat-bank/explanations-en/qa-report.json
```

Expected:

```text
status=passed targets=40 records=40 approved=0 failures=0
```

`open_needs_review_count` sıfır olmak zorunda değildir; bu kayıtlar review ve
correction kuyruğunda bloklu kalır.

---

### Task 8: Pilotu Bağımsız Review, Correction ve Kullanıcı Kapısından Geçirme

**Files:**
- Create: `tmp/sat-bank/explanations-en/reviews/PILOT/*-review-r1.json`
- Modify when rejected: `tmp/sat-bank/explanations-en/shards/*-explanations.json`
- Create when corrected: `tmp/sat-bank/explanations-en/reviews/PILOT/*-review-r2.json`
- Create: `tmp/sat-bank/explanations-en/ops/write-checkpoint.mjs`
- Create: `tmp/sat-bank/explanations-en/checkpoints/PILOT.json`
- Update: `tmp/sat-bank/explanations-en/pilot-explanations-en.json`
- Update: `tmp/sat-bank/explanations-en/reviews.json`
- Update: `tmp/sat-bank/explanations-en/qa-report.json`

**Interfaces:**
- Consumes: Pilot shard'ları, reviewer/correction prompt'ları, wave review
  rotasyonu.
- Produces: 40/40 independently approved pilot, checksum checkpoint ve zorunlu
  kullanıcı kararı.

- [ ] **Step 1: Round-1 review packet'larını review rotasyonuyla dağıt**

Pilot ID'nin reviewer'ı, source assignment'ının ait olduğu bulk wave'deki
`reviewer` alanıdır. Sorgu:

```bash
for reviewer in A B C; do
  jq --arg reviewer "$reviewer" '
    [
      .waves[].assignments[]
      | select(.reviewer == $reviewer and (.pilot_ids | length) > 0)
      | {
          source_file,
          shard_file,
          ids: .pilot_ids,
          extractor,
          reviewer,
          second_reviewer
        }
    ]
  ' tmp/sat-bank/explanations-en/wave-plan.json
done
```

Root, her reviewer için toplam en fazla 12 ID'lik packet hazırlar. Reviewer'a
`prompts/reviewer-v1.md`, shard record'ları, PNG'ler, source metadata,
`correct_answer`, actual canonical `reviewer_task_id`, `review_round=1` ve
benzersiz review output path gönderilir.

Reviewer'ın extractor olmadığı şu komutla önceden doğrulanır:

```bash
jq -e '
  all(.waves[].assignments[];
    (.pilot_ids | length) == 0 or .extractor != .reviewer)
' tmp/sat-bank/explanations-en/wave-plan.json
```

Expected: `true`.

- [ ] **Step 2: Round-1 review dosyalarını yapısal kontrol et**

Tüm pilot review dosyalarında:

```bash
while IFS= read -r review_file; do
  jq -e '
    type == "array" and
    length >= 1 and length <= 12 and
    (map(.id) | unique | length) == length and
    all(.[];
      (.reviewer_task_id | type == "string" and length > 0) and
      .review_round == 1 and
      (.status == "approved" or .status == "rejected") and
      (.source_faithful | type == "boolean") and
      (.math_faithful | type == "boolean") and
      (.answer_consistent | type == "boolean") and
      (.complete_rationale | type == "boolean") and
      ((.status == "approved" and
        .source_faithful and .math_faithful and .answer_consistent and
        .complete_rationale and .review_note == null) or
       (.status == "rejected" and
        ((.source_faithful and .math_faithful and .answer_consistent and
          .complete_rationale) | not) and
        (.review_note | type == "string" and length > 0))))
  ' "$review_file" || exit 1
done < <(find tmp/sat-bank/explanations-en/reviews/PILOT \
  -type f -name '*-review-r1.json' | LC_ALL=C sort)
```

Expected: Her round-1 review dosyası için `true`.

- [ ] **Step 3: Rejected veya extractor-blocked ID'leri correction sahibine döndür**

Root rejected ID'leri ve `needs_review=true` kayıtları source shard'a göre
birleştirir. Her packet:

- yalnız ilgili ID'leri;
- `prompts/correction-v1.md`;
- round-1 review note'larını;
- aynı rendered kaynak sayfalarını;
- `correction_owner == extractor` kanıtını taşır.

Correction özgün logical owner'a `followup_task` olarak gider. Reviewer hiçbir
shard'ı düzenlemez. Correction sonrası shard'da duplicate ID olmadığı ve yalnız
reddedilen ID'lerin değiştiği `git diff` ile değil, önce/sonra ID-bazlı SHA
kayıtlarıyla doğrulanır; protected shard Git'e girmez.

- [ ] **Step 4: Corrected ID'leri üçüncü agent'a round-2 re-review yaptır**

Sorgu:

```bash
jq -e '
  all(.waves[].assignments[];
    (.extractor != .second_reviewer) and
    (.reviewer != .second_reviewer))
' tmp/sat-bank/explanations-en/wave-plan.json
```

Expected: `true`.

Her corrected ID, assignment'daki `second_reviewer` agent'a aynı görsel kaynakla
gider. Çıktı `review_round=2` olur. Round-2 de `rejected` ise pilot **durur**;
root kaynağı ve iki review notunu inceleyip kullanıcıya bloklayıcı ID/sayfa
raporu verir. Tahminle kapatma veya bulk'a geçiş yoktur.

- [ ] **Step 5: Pilot full-acceptance validator'ını çalıştır**

Run:

```bash
node tmp/sat-bank/explanations-en/ops/validate-artifacts.mjs \
  --source-root '/Users/keremyarar/Desktop/SAT Question Bank PDFs' \
  --source-index tmp/sat-bank/explanations-en/source-index.json \
  --wave-plan tmp/sat-bank/explanations-en/wave-plan.json \
  --agent-registry tmp/sat-bank/explanations-en/agent-registry.json \
  --targets tmp/sat-bank/explanations-en/checkpoint-targets/PILOT.json \
  --shards-dir tmp/sat-bank/explanations-en/shards \
  --reviews-dir tmp/sat-bank/explanations-en/reviews \
  --merged-out tmp/sat-bank/explanations-en/pilot-explanations-en.json \
  --reviews-out tmp/sat-bank/explanations-en/reviews.json \
  --qa-out tmp/sat-bank/explanations-en/qa-report.json
```

Expected:

```text
status=passed targets=40 records=40 approved=40 failures=0
```

Run:

```bash
jq -e '
  .status == "passed" and
  .target_count == 40 and
  .explanation_count == 40 and
  .effective_approved_count == 40 and
  .open_needs_review_count == 0 and
  .duplicate_explanation_count == 0 and
  (.failures | length) == 0
' tmp/sat-bank/explanations-en/qa-report.json
```

Expected: `true`.

- [ ] **Step 6: Checkpoint writer'ı yaz**

`apply_patch` ile
`tmp/sat-bank/explanations-en/ops/write-checkpoint.mjs` dosyasını tam olarak
şöyle oluştur:

```js
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const fail = (message) => {
  throw new Error(message);
};
const requireArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) fail(`Missing ${name}`);
  return process.argv[index + 1];
};
const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJsonAtomic = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
};

const stage = requireArg("--stage");
if (stage !== "PILOT" && !/^W(?:0[1-9]|1[0-9])$/.test(stage)) {
  fail(`Invalid stage ${stage}`);
}
const targetsPath = resolve(requireArg("--targets"));
const explanationsPath = resolve(requireArg("--explanations"));
const reviewsPath = resolve(requireArg("--reviews"));
const qaPath = resolve(requireArg("--qa"));
const outPath = resolve(requireArg("--out"));
const qa = readJson(qaPath);
const targets = readJson(targetsPath);
if (
  qa.status !== "passed" ||
  qa.validation_mode !== "full-acceptance" ||
  qa.target_count !== targets.length ||
  qa.explanation_count !== targets.length ||
  qa.effective_approved_count !== targets.length ||
  qa.open_needs_review_count !== 0 ||
  qa.failures.length !== 0
) {
  fail(`Stage ${stage} has not passed full acceptance`);
}
writeJsonAtomic(outPath, {
  schema_version: 1,
  stage,
  status: "accepted",
  accepted_count: targets.length,
  completed_at: new Date().toISOString(),
  checksums: {
    targets_sha256: sha256(targetsPath),
    explanations_sha256: sha256(explanationsPath),
    reviews_sha256: sha256(reviewsPath),
    qa_sha256: sha256(qaPath),
  },
});
console.log(`checkpoint=${stage} accepted=${targets.length}`);
```

Run:

```bash
node --check tmp/sat-bank/explanations-en/ops/write-checkpoint.mjs
node tmp/sat-bank/explanations-en/ops/write-checkpoint.mjs \
  --stage PILOT \
  --targets tmp/sat-bank/explanations-en/checkpoint-targets/PILOT.json \
  --explanations tmp/sat-bank/explanations-en/pilot-explanations-en.json \
  --reviews tmp/sat-bank/explanations-en/reviews.json \
  --qa tmp/sat-bank/explanations-en/qa-report.json \
  --out tmp/sat-bank/explanations-en/checkpoints/PILOT.json
```

Expected: `checkpoint=PILOT accepted=40`.

- [ ] **Step 7: Kullanıcıya pilot raporunu sun ve DUR**

Rapor yalnız şu metrikleri ve gerekirse kullanıcı tarafından seçilecek birkaç
örneğin dosya yolunu içerir; protected rationale metni chat'e dökülmez:

```text
Pilot: 40/40 extracted, 40/40 independently approved
Coverage: 19 skills, 4 domains, difficulty 1/2/3
Types: 21 MCQ, 19 SPR
Figure-backed: 20
Two-page rationale: 5
Open needs_review: 0
Answer conflicts: 0
Checkpoint: `jq -r '.checksums.explanations_sha256' checkpoints/PILOT.json`
```

Kullanıcıdan açıkça “kalan 766'ya geç” onayı alınır. Onay gelmeden Task 9'un
hiçbir extraction/review adımı çalıştırılmaz.

---

### Task 9: Kalan 766 Kaydı 19 Bariyerli Wave'de Çıkarma ve Onaylama

**Files:**
- Create/Modify: `tmp/sat-bank/explanations-en/shards/*-explanations.json`
- Create: `tmp/sat-bank/explanations-en/reviews/W01/` … `W19/`
- Create: `tmp/sat-bank/explanations-en/checkpoints/W01.json` … `W19.json`
- Update per wave: `tmp/sat-bank/explanations-en/explanations-en.json`
- Update per wave: `tmp/sat-bank/explanations-en/reviews.json`
- Update per wave: `tmp/sat-bank/explanations-en/qa-report.json`

**Interfaces:**
- Consumes: Kullanıcının açık bulk onayı, `wave-plan.json`, pilotta korunmuş
  A/B/C shard ownership, Task 5 prompt'ları ve Task 6 validator.
- Produces: Kümülatif 806/806 approved kayıt ve W01–W19 checksum zinciri.

- [ ] **Step 1: Bulk yetkisini ve PILOT checkpoint'ini doğrula**

Bu adım ancak kullanıcı açık bulk onayı verdiyse işaretlenir.

Run:

```bash
jq -e '
  .stage == "PILOT" and
  .status == "accepted" and
  .accepted_count == 40
' tmp/sat-bank/explanations-en/checkpoints/PILOT.json
```

Expected: `true`.

- [ ] **Step 2: Her wave başında source freeze'i yeniden doğrula**

Her `CURRENT_WAVE` başlamadan çalıştır:

```bash
test "$(shasum -a 256 tmp/sat-bank/bank.json | awk '{print $1}')" = \
  "$(jq -r '.bank_sha256' tmp/sat-bank/explanations-en/source-freeze.json)"
test "$(shasum -a 256 tmp/sat-bank/explanations-en/target-ids.json | awk '{print $1}')" = \
  "$(jq -r '.target_ids_sha256' tmp/sat-bank/explanations-en/source-freeze.json)"
test "$(shasum -a 256 tmp/sat-bank/explanations-en/source-index.json | awk '{print $1}')" = \
  "$(jq -r '.source_index_sha256' tmp/sat-bank/explanations-en/source-freeze.json)"
test "$(shasum -a 256 tmp/sat-bank/explanations-en/source-inventory.json | awk '{print $1}')" = \
  "$(jq -r '.source_inventory_sha256' tmp/sat-bank/explanations-en/source-freeze.json)"

while IFS=$'\t' read -r expected relative_path; do
  actual="$(shasum -a 256 "/Users/keremyarar/Desktop/SAT Question Bank PDFs/$relative_path" | awk '{print $1}')"
  test "$actual" = "$expected" || {
    echo "SOURCE DRIFT: $relative_path"
    exit 1
  }
done < <(jq -r '.files[] | [.sha256, .source_file] | @tsv' \
  tmp/sat-bank/explanations-en/source-inventory.json)

while IFS=$'\t' read -r expected prompt_name; do
  actual="$(shasum -a 256 "tmp/sat-bank/explanations-en/prompts/$prompt_name" | awk '{print $1}')"
  test "$actual" = "$expected" || {
    echo "PROMPT DRIFT: $prompt_name"
    exit 1
  }
done < <(jq -r '.sha256 | to_entries[] | [.value, .key] | @tsv' \
  tmp/sat-bank/explanations-en/prompt-freeze.json)
```

Expected: sessiz exit `0`. Bir source veya prompt checksum farkında o wave dahil
hiçbir yeni shard/review yazılmaz.

- [ ] **Step 3: `CURRENT_WAVE` extraction packet'larını owner'lara dağıt**

Wave'ler yalnız bu sırada işlenir:

```text
W01 W02 W03 W04 W05 W06 W07 W08 W09 W10
W11 W12 W13 W14 W15 W16 W17 W18 W19
```

İlgili assignment'ları görüntüle:

```bash
CURRENT_WAVE=W01
jq --arg wave "$CURRENT_WAVE" '
  .waves[]
  | select(.wave_id == $wave)
  | {
      wave_id,
      total_count,
      assignments: [
        .assignments[] |
        {
          source_file,
          shard_file,
          chunks,
          extractor,
          reviewer,
          correction_owner,
          second_reviewer
        }
      ]
    }
' tmp/sat-bank/explanations-en/wave-plan.json
```

`CURRENT_WAVE` sıradaki gerçek wave'e ayarlanır. Her `chunks[]` zaten 1–12 ID'dir.
Exact chunk metadata'sını üret:

```bash
jq --arg wave "$CURRENT_WAVE" \
   --slurpfile bank tmp/sat-bank/bank.json \
   --slurpfile source tmp/sat-bank/explanations-en/source-index.json '
  ($bank[0].bank | map({key: .id, value: .}) | from_entries) as $questions
  | ($source[0].records | map({key: .id, value: .}) | from_entries) as $sources
  | .waves[]
  | select(.wave_id == $wave)
  | [
      .assignments[] as $assignment
      | $assignment.chunks[]
      | {
          chunk_id,
          worker: $assignment.extractor,
          source_file: $assignment.source_file,
          shard_file: $assignment.shard_file,
          records: [
            .target_ids[] as $id
            | {
                id: $id,
                source_pages: $sources[$id].source_pages,
                source_order: $sources[$id].source_order,
                question_type: $questions[$id].question_type,
                correct_answer: $questions[$id].correct_answer
              }
          ]
        }
    ]
' tmp/sat-bank/explanations-en/wave-plan.json
```

Expected: İlgili wave'in her chunk'ı için 1–12 tam metadata kaydı. Root sayfaları
`render-pages.mjs` ile `packets/{CURRENT_WAVE}/{worker}/{chunk_id}/` altına
render eder ve `extractor-v1.md` ile özgün owner'a gönderir.

Pilot ID'si bulunan shard'da aynı owner mevcut dosyayı koruyup bulk kayıtlarını
ekler. Yeni owner veya ikinci writer oluşturulmaz. Aynı worker'a sonraki chunk,
önceki shard JSON parse/ID kontrolünden geçmeden gönderilmez.

- [ ] **Step 4: Wave extraction bitince kümülatif structural-only kapıyı çalıştır**

Run:

```bash
CURRENT_WAVE=W01
node tmp/sat-bank/explanations-en/ops/validate-artifacts.mjs \
  --structural-only \
  --source-root '/Users/keremyarar/Desktop/SAT Question Bank PDFs' \
  --source-index tmp/sat-bank/explanations-en/source-index.json \
  --wave-plan tmp/sat-bank/explanations-en/wave-plan.json \
  --agent-registry tmp/sat-bank/explanations-en/agent-registry.json \
  --targets "tmp/sat-bank/explanations-en/checkpoint-targets/$CURRENT_WAVE.json" \
  --shards-dir tmp/sat-bank/explanations-en/shards \
  --reviews-dir tmp/sat-bank/explanations-en/reviews \
  --merged-out tmp/sat-bank/explanations-en/explanations-en.json \
  --reviews-out tmp/sat-bank/explanations-en/reviews.json \
  --qa-out tmp/sat-bank/explanations-en/qa-report.json
```

Expected: `status=passed`; `targets` ve `records` değerleri aynı kümülatif sayıdır.
W01 için `138`; W19 için `806`. Fail durumunda review başlamaz.

- [ ] **Step 5: Wave round-1 review, correction ve round-2 re-review yap**

Her assignment için:

- odd wave review: `A→B`, `B→C`, `C→A`;
- even wave review: `A→C`, `C→B`, `B→A`;
- review packet başına en fazla 12 ID;
- reviewer source PNG'lerini açar, shard'ı düzenlemez;
- rejected ve extractor-blocked ID özgün owner'a correction döner;
- corrected ID `second_reviewer` tarafından `review_round=2` ile kontrol edilir.

Round-2 rejection'da wave durur ve root somut ID/PDF/sayfa raporu verir. Sonraki
wave başlatılmaz.

- [ ] **Step 6: Wave full-acceptance kapısını çalıştır**

Run:

```bash
CURRENT_WAVE=W01
node tmp/sat-bank/explanations-en/ops/validate-artifacts.mjs \
  --source-root '/Users/keremyarar/Desktop/SAT Question Bank PDFs' \
  --source-index tmp/sat-bank/explanations-en/source-index.json \
  --wave-plan tmp/sat-bank/explanations-en/wave-plan.json \
  --agent-registry tmp/sat-bank/explanations-en/agent-registry.json \
  --targets "tmp/sat-bank/explanations-en/checkpoint-targets/$CURRENT_WAVE.json" \
  --shards-dir tmp/sat-bank/explanations-en/shards \
  --reviews-dir tmp/sat-bank/explanations-en/reviews \
  --merged-out tmp/sat-bank/explanations-en/explanations-en.json \
  --reviews-out tmp/sat-bank/explanations-en/reviews.json \
  --qa-out tmp/sat-bank/explanations-en/qa-report.json
```

Expected: `status=passed`, `targets=records=approved`, `failures=0`.

- [ ] **Step 7: Wave checkpoint'ini yaz ve hash'i tekrar doğrula**

Run:

```bash
CURRENT_WAVE=W01
node tmp/sat-bank/explanations-en/ops/write-checkpoint.mjs \
  --stage "$CURRENT_WAVE" \
  --targets "tmp/sat-bank/explanations-en/checkpoint-targets/$CURRENT_WAVE.json" \
  --explanations tmp/sat-bank/explanations-en/explanations-en.json \
  --reviews tmp/sat-bank/explanations-en/reviews.json \
  --qa tmp/sat-bank/explanations-en/qa-report.json \
  --out "tmp/sat-bank/explanations-en/checkpoints/$CURRENT_WAVE.json"

test "$(shasum -a 256 tmp/sat-bank/explanations-en/explanations-en.json | awk '{print $1}')" = \
  "$(jq -r '.checksums.explanations_sha256' "tmp/sat-bank/explanations-en/checkpoints/$CURRENT_WAVE.json")"
```

Expected: Çıktıdaki checkpoint adı shell'deki `CURRENT_WAVE`, accepted değeri
ilgili checkpoint-target dosyasının uzunluğudur; ardından sessiz hash eşleşmesi
gelir. Bundan sonra sıradaki wave'e dön; W19'a kadar bu tanımlı yaşam döngüsü
uygulanır.

- [ ] **Step 8: W19 sonrası bütün checkpoint zincirini doğrula**

Run:

```bash
test "$(find tmp/sat-bank/explanations-en/checkpoints -maxdepth 1 -type f -name '*.json' | wc -l | tr -d ' ')" = 20
jq -s -e '
  (map(.stage) | unique | length) == 20 and
  all(.[];
    .status == "accepted" and
    (.checksums.targets_sha256 | test("^[0-9a-f]{64}$")) and
    (.checksums.explanations_sha256 | test("^[0-9a-f]{64}$")) and
    (.checksums.reviews_sha256 | test("^[0-9a-f]{64}$")) and
    (.checksums.qa_sha256 | test("^[0-9a-f]{64}$"))) and
  (map(select(.stage == "W19"))[0].accepted_count == 806)
' tmp/sat-bank/explanations-en/checkpoints/*.json
```

Expected: `true`.

---

### Task 10: Final 806 Kabulü, Manifest ve Git-Dışı Teslim Paketi

**Files:**
- Create: `tmp/sat-bank/explanations-en/ops/build-final-package.mjs`
- Finalize: `tmp/sat-bank/explanations-en/explanations-en.json`
- Finalize: `tmp/sat-bank/explanations-en/reviews.json`
- Finalize: `tmp/sat-bank/explanations-en/qa-report.json`
- Read: `tmp/sat-bank/explanations-en/gap-report.json`
- Create: `tmp/sat-bank/explanations-en/package/run-manifest.json`
- Create: `tmp/sat-bank/explanations-en/package/SHA256SUMS`
- Copy after separate permission:
  `/Users/keremyarar/Documents/Codex/2026-07-01/sat-question-bank-pdfs/outputs/explanations-en/`

**Interfaces:**
- Consumes: W19 full-acceptance artifact'ları, source freeze, prompt checksum'ları,
  20 checkpoint, wave plan ve ownership transfer günlüğü.
- Produces: 806/806 explanation, 806/806 effective approval, gap report, run
  manifest ve doğrulanmış kalıcı teslim paketi.

- [ ] **Step 1: Final validator'ı dondurulmuş 806 target üzerinde yeniden çalıştır**

Run:

```bash
node tmp/sat-bank/explanations-en/ops/validate-artifacts.mjs \
  --source-root '/Users/keremyarar/Desktop/SAT Question Bank PDFs' \
  --source-index tmp/sat-bank/explanations-en/source-index.json \
  --wave-plan tmp/sat-bank/explanations-en/wave-plan.json \
  --agent-registry tmp/sat-bank/explanations-en/agent-registry.json \
  --targets tmp/sat-bank/explanations-en/target-ids.json \
  --shards-dir tmp/sat-bank/explanations-en/shards \
  --reviews-dir tmp/sat-bank/explanations-en/reviews \
  --merged-out tmp/sat-bank/explanations-en/explanations-en.json \
  --reviews-out tmp/sat-bank/explanations-en/reviews.json \
  --qa-out tmp/sat-bank/explanations-en/qa-report.json
```

Expected:

```text
status=passed targets=806 records=806 approved=806 failures=0
```

Run:

```bash
jq -e '
  .status == "passed" and
  .validation_mode == "full-acceptance" and
  .target_count == 806 and
  .explanation_count == 806 and
  .effective_approved_count == 806 and
  .open_needs_review_count == 0 and
  .duplicate_explanation_count == 0 and
  (.failures | length) == 0
' tmp/sat-bank/explanations-en/qa-report.json

diff -u \
  <(jq -S . tmp/sat-bank/explanations-en/target-ids.json) \
  <(jq -S '[.[].id]' tmp/sat-bank/explanations-en/explanations-en.json)
```

Expected: jq `true`, `diff` boş.

- [ ] **Step 2: Gap kümelerini yeniden doğrula**

Run:

```bash
jq -e '
  .bank_without_official_rationale.count == 213 and
  (.bank_without_official_rationale.ids | length) == 213 and
  .excluded_area_and_volume_1.count == 20 and
  (.excluded_area_and_volume_1.ids | length) == 20 and
  .source_not_in_bank.count == 15 and
  (.source_not_in_bank.ids | length) == 15
' tmp/sat-bank/explanations-en/gap-report.json
```

Expected: `true`. Bu 248 ID'nin hiçbiri `explanations-en.json` içine alınmaz.

- [ ] **Step 3: Package builder'ı yaz**

`apply_patch` ile
`tmp/sat-bank/explanations-en/ops/build-final-package.mjs` dosyasını tam olarak
şöyle oluştur:

```js
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const byteCompare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const fail = (message) => {
  throw new Error(message);
};
const requireArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) fail(`Missing ${name}`);
  return process.argv[index + 1];
};
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const writeJsonAtomic = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
};
const copyWithoutOverwrite = (source, destination) => {
  if (existsSync(destination)) fail(`Refusing to overwrite ${destination}`);
  copyFileSync(source, destination);
};

const root = resolve(requireArg("--root"));
const sourceRoot = resolve(requireArg("--source-root"));
const outDir = resolve(requireArg("--out-dir"));
if (existsSync(outDir) && readdirSync(outDir).length > 0) {
  fail(`Package directory is not empty: ${outDir}`);
}
mkdirSync(outDir, { recursive: true });

const paths = {
  targets: join(root, "target-ids.json"),
  explanations: join(root, "explanations-en.json"),
  reviews: join(root, "reviews.json"),
  qa: join(root, "qa-report.json"),
  gaps: join(root, "gap-report.json"),
  sourceFreeze: join(root, "source-freeze.json"),
  promptFreeze: join(root, "prompt-freeze.json"),
  sourceIndex: join(root, "source-index.json"),
  sourceInventory: join(root, "source-inventory.json"),
  wavePlan: join(root, "wave-plan.json"),
  agentRegistry: join(root, "agent-registry.json"),
  transfers: join(root, "ownership-transfers.json"),
};
for (const [name, path] of Object.entries(paths)) {
  if (!existsSync(path) || !statSync(path).isFile()) fail(`Missing ${name}: ${path}`);
}

const targets = readJson(paths.targets);
const explanations = readJson(paths.explanations);
const reviews = readJson(paths.reviews);
const qa = readJson(paths.qa);
const gaps = readJson(paths.gaps);
const sourceFreeze = readJson(paths.sourceFreeze);
const promptFreeze = readJson(paths.promptFreeze);
const sourceInventory = readJson(paths.sourceInventory);
const wavePlan = readJson(paths.wavePlan);
const agentRegistry = readJson(paths.agentRegistry);
const transfers = readJson(paths.transfers);
if (
  targets.length !== 806 ||
  explanations.length !== 806 ||
  qa.status !== "passed" ||
  qa.validation_mode !== "full-acceptance" ||
  qa.effective_approved_count !== 806 ||
  qa.failures.length !== 0
) {
  fail("Final acceptance invariants are not satisfied");
}
if (
  gaps.bank_without_official_rationale.count !== 213 ||
  gaps.excluded_area_and_volume_1.count !== 20 ||
  gaps.source_not_in_bank.count !== 15
) {
  fail("Gap counts drifted");
}
if (!Array.isArray(transfers)) fail("ownership-transfers.json must be an array");
const bankPath = resolve(root, "..", "bank.json");
if (
  sha256(bankPath) !== sourceFreeze.bank_sha256 ||
  sha256(paths.targets) !== sourceFreeze.target_ids_sha256 ||
  sha256(paths.sourceIndex) !== sourceFreeze.source_index_sha256 ||
  sha256(paths.sourceInventory) !== sourceFreeze.source_inventory_sha256 ||
  sha256(paths.gaps) !== sourceFreeze.gap_report_sha256
) {
  fail("Final source-freeze artifact checksum mismatch");
}
for (const file of sourceInventory.files) {
  if (sha256(join(sourceRoot, file.source_file)) !== file.sha256) {
    fail(`Final source PDF checksum mismatch: ${file.source_file}`);
  }
}
const registeredTasks = Object.values(agentRegistry).flat();
if (
  !["A", "B", "C"].every(
    (worker) =>
      Array.isArray(agentRegistry[worker]) &&
      agentRegistry[worker].length >= 1,
  ) ||
  new Set(registeredTasks).size !== registeredTasks.length
) {
  fail("Invalid agent registry history");
}
for (const transfer of transfers) {
  const assignment = wavePlan.waves
    .flatMap(({ assignments }) => assignments)
    .find(({ source_file }) => source_file === transfer.source_file);
  if (
    !assignment ||
    assignment.extractor !== transfer.logical_worker ||
    !agentRegistry[transfer.logical_worker]?.includes(transfer.from_task_id) ||
    !agentRegistry[transfer.logical_worker]?.includes(transfer.to_task_id) ||
    typeof transfer.reason !== "string" ||
    !transfer.reason.trim() ||
    Number.isNaN(Date.parse(transfer.transferred_at))
  ) {
    fail(`Invalid ownership transfer for ${transfer.source_file}`);
  }
}

const checkpointDir = join(root, "checkpoints");
const checkpointFiles = readdirSync(checkpointDir)
  .filter((name) => name.endsWith(".json"))
  .sort(byteCompare);
if (checkpointFiles.length !== 20) fail(`Expected 20 checkpoints; got ${checkpointFiles.length}`);
const checkpoints = checkpointFiles.map((name) => readJson(join(checkpointDir, name)));
if (
  checkpoints.some(({ status }) => status !== "accepted") ||
  !checkpoints.some(({ stage, accepted_count }) => stage === "PILOT" && accepted_count === 40) ||
  !checkpoints.some(({ stage, accepted_count }) => stage === "W19" && accepted_count === 806)
) {
  fail("Checkpoint chain is incomplete");
}

const promptDir = join(root, "prompts");
const promptFiles = readdirSync(promptDir)
  .filter((name) => name.endsWith("-v1.md"))
  .sort(byteCompare);
if (promptFiles.length !== 3) fail("Expected three v1 prompt files");
const promptChecksums = Object.fromEntries(
  promptFiles.map((name) => [name, sha256(join(promptDir, name))]),
);
if (
  promptFreeze.prompt_version !== "v1" ||
  JSON.stringify(promptChecksums) !== JSON.stringify(promptFreeze.sha256)
) {
  fail("Prompt freeze drifted");
}

const runId = `sat-rationale-en-${sourceFreeze.target_ids_sha256.slice(0, 12)}`;
const manifest = {
  schema_version: 1,
  run_id: runId,
  status: "accepted",
  created_at: sourceFreeze.created_at,
  completed_at: new Date().toISOString(),
  scope: {
    bank_count: 1019,
    official_source_count: 821,
    target_count: 806,
    pilot_count: 40,
    bulk_count: 766,
    excluded_area_and_volume_1_count: 20,
    bank_without_official_rationale_count: 213,
    source_not_in_bank_count: 15,
  },
  source_freeze: {
    bank_sha256: sourceFreeze.bank_sha256,
    target_ids_sha256: sourceFreeze.target_ids_sha256,
    source_index_sha256: sourceFreeze.source_index_sha256,
    source_inventory_sha256: sourceFreeze.source_inventory_sha256,
    pdfs: sourceInventory.files,
  },
  prompts: {
    version: promptFreeze.prompt_version,
    frozen_at: promptFreeze.created_at,
    sha256: promptChecksums,
  },
  wave_plan: {
    algorithm_version: wavePlan.algorithm_version,
    sha256: sha256(paths.wavePlan),
    worker_bulk_loads: wavePlan.worker_bulk_loads,
    wave_count: wavePlan.waves.length,
  },
  agent_registry: agentRegistry,
  checkpoints,
  ownership_transfers: transfers,
  acceptance: {
    explanation_count: explanations.length,
    review_event_count: reviews.length,
    effective_approved_count: qa.effective_approved_count,
    open_needs_review_count: qa.open_needs_review_count,
    answer_conflict_count: 0,
    application_db_api_ui_changes: 0,
  },
};

const packageFiles = [
  [paths.targets, "target-ids.json"],
  [paths.explanations, "explanations-en.json"],
  [paths.reviews, "reviews.json"],
  [paths.qa, "qa-report.json"],
  [paths.gaps, "gap-report.json"],
];
for (const [source, name] of packageFiles) {
  copyWithoutOverwrite(source, join(outDir, name));
}
writeJsonAtomic(join(outDir, "run-manifest.json"), manifest);

const checksumNames = [
  "target-ids.json",
  "explanations-en.json",
  "reviews.json",
  "run-manifest.json",
  "qa-report.json",
  "gap-report.json",
].sort(byteCompare);
const checksumText = checksumNames
  .map((name) => `${sha256(join(outDir, name))}  ${name}`)
  .join("\n");
writeFileSync(join(outDir, "SHA256SUMS"), `${checksumText}\n`, "utf8");
console.log(`package=${outDir} run_id=${runId} records=806 approved=806 files=7`);
```

- [ ] **Step 4: Package builder syntax ve boş-destination koşulunu doğrula**

Run:

```bash
node --check tmp/sat-bank/explanations-en/ops/build-final-package.mjs
test ! -e tmp/sat-bank/explanations-en/package
```

Expected: İki komut da `0`. Package dizini varsa otomatik silme/overwrite yapma;
önce nedenini ve checksum'ını incele.

- [ ] **Step 5: Final çalışma paketini oluştur**

Run:

```bash
node tmp/sat-bank/explanations-en/ops/build-final-package.mjs \
  --root tmp/sat-bank/explanations-en \
  --source-root '/Users/keremyarar/Desktop/SAT Question Bank PDFs' \
  --out-dir tmp/sat-bank/explanations-en/package
```

Expected:

```text
package=/Users/keremyarar/italypath-main/tmp/sat-bank/explanations-en/package run_id=sat-rationale-en-[target SHA-256 ilk 12 hex] records=806 approved=806 files=7
```

Köşeli açıklamanın yerinde script'in `source-freeze.target_ids_sha256`
değerinden deterministik yazdığı gerçek ilk 12 hex karakter bulunur.

- [ ] **Step 6: Paket checksum ve içerik kapısını çalıştır**

Run:

```bash
cd /Users/keremyarar/italypath-main/tmp/sat-bank/explanations-en/package
shasum -a 256 -c SHA256SUMS
test "$(find . -maxdepth 1 -type f | wc -l | tr -d ' ')" = 7
jq -e '
  .status == "accepted" and
  .scope.target_count == 806 and
  .acceptance.explanation_count == 806 and
  .acceptance.effective_approved_count == 806 and
  .acceptance.open_needs_review_count == 0 and
  .acceptance.answer_conflict_count == 0 and
  .acceptance.application_db_api_ui_changes == 0 and
  (.checkpoints | length) == 20
' run-manifest.json
```

Expected: Altı checksum satırının her biri `OK`, dosya sayısı `7`, jq `true`.

Sonra repo köküne dön:

```bash
cd /Users/keremyarar/italypath-main
git ls-files tmp/sat-bank/explanations-en
git status --short
```

Expected: İlk komut boş; rationale içeriği Git'e girmemiştir. İkinci komutta
ürün kodu/DB/API/UI değişikliği yoktur.

- [ ] **Step 7: Kalıcı Git-dışı teslim için ayrı filesystem izni al**

Root kullanıcıya şunu açıkça sorar:

```text
806/806 paket çalışma alanında kabul edildi. Paketi şimdi
/Users/keremyarar/Documents/Codex/2026-07-01/sat-question-bank-pdfs/outputs/explanations-en/
yoluna kalıcı olarak kopyalamama izin veriyor musun?
```

İzin olmadan dış dizine yazılmaz. Hedef zaten varsa hiçbir dosya overwrite
edilmez; mevcut ve yeni checksum'lar kullanıcıya raporlanıp yönlendirme istenir.

- [ ] **Step 8: İzin sonrası paketi kopyala ve hedefte doğrula**

Önce salt-okunur collision kontrolü:

```bash
test ! -e '/Users/keremyarar/Documents/Codex/2026-07-01/sat-question-bank-pdfs/outputs/explanations-en'
```

Expected: exit `0`. Non-zero ise DUR; overwrite yok.

Filesystem onayıyla:

```bash
mkdir -p '/Users/keremyarar/Documents/Codex/2026-07-01/sat-question-bank-pdfs/outputs'
cp -R \
  /Users/keremyarar/italypath-main/tmp/sat-bank/explanations-en/package \
  '/Users/keremyarar/Documents/Codex/2026-07-01/sat-question-bank-pdfs/outputs/explanations-en'
```

Hedefte:

```bash
cd '/Users/keremyarar/Documents/Codex/2026-07-01/sat-question-bank-pdfs/outputs/explanations-en'
shasum -a 256 -c SHA256SUMS
```

Expected: Altı artifact `OK`.

- [ ] **Step 9: Faz-sonu raporunu ver ve sonraki faza geçme**

Kullanıcıya şu sonuçlar raporlanır:

```text
Official English rationales: 806/806
Independent effective approvals: 806/806
Open needs_review: 0
Answer conflicts: 0
Bank questions without direct official rationale: 213
Explicitly excluded Area and Volume 1 questions: 20
Official source IDs outside current bank: 15
Product/DB/API/UI changes: 0
Delivery path: /Users/keremyarar/Documents/Codex/2026-07-01/sat-question-bank-pdfs/outputs/explanations-en/
Package SHA256SUMS: verified
```

213 soruya özgün çözüm üretimi, Türkçe çeviri, DB alanı/backfill veya UI gösterimi
bu planın devamı değildir; her biri ayrı tasarım ve kullanıcı onayı gerektirir.

---

## Definition of Done

- 57 source PDF ve `bank.json` checksum freeze'i run boyunca değişmemiştir.
- `target-ids.json` tam 806 benzersiz doğrudan eşleşme içerir.
- Pilot tam 40 kayıtla, kullanıcı bulk onayından önce tamamlanmıştır.
- Bulk tam 766 kayıtla 19 sıralı wave'de tamamlanmıştır.
- Her explanation ID'si tam bir kez bulunur ve exact source PDF/sayfa izine sahiptir.
- 806 kaydın tamamı bağımsız reviewer tarafından effective `approved` durumundadır.
- `needs_review=true`, answer conflict, eksik rationale, ekstra ID ve duplicate ID
  sayıları sıfırdır.
- Tam resmî İngilizce wording, yanlış seçenek açıklamaları ve görsel matematik
  LaTeX'i reviewer kapısından geçmiştir.
- `target-ids.json`, `explanations-en.json`, `reviews.json`, `run-manifest.json`,
  `qa-report.json`, `gap-report.json` ve `SHA256SUMS` teslim paketindedir.
- Kalıcı teslim kopyası checksum doğrulamasını geçmiştir.
- Korumalı SAT içeriği Git'e girmemiş; ürün kodu, DB, API ve UI değişmemiştir.
