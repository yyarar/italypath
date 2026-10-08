// IMAT yazicilarinin cevrimdisi testi (plan 2026-10-08, Gorev 12): paket kurallari (lib/question-patch.mjs),
// insert-only import (import-bank.mjs), compare-and-swap yama ve geri alma (patch-imat-questions.mjs), acma
// paketi (build-release-package.mjs). scripts/sat/test-question-patch.mjs kalibi: Supabase istemcisi sahte,
// girdiler gecici klasorde; veritabanina ve aga baglanmaz. Soru metinleri uydurmadir.
//
//   PATH=/usr/local/bin:$PATH node scripts/imat/test-question-patch.mjs   (npm run test:imat-patch)
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { LIVE_PROJECT_REF } from "../lib/program-details-import.mjs";
import { main as buildRelease } from "./build-release-package.mjs";
import { bankToRows, main as importBank, planInsert } from "./import-bank.mjs";
import {
  GUARD_FIELDS,
  OPTIONAL_WRITABLE_FIELDS,
  WRITABLE_FIELDS,
  changedFields,
  normalizeChoices,
  rowMatchesExpected,
  validatePackage,
  writePayload,
} from "./lib/question-patch.mjs";
import { main as patchQuestions } from "./patch-imat-questions.mjs";

const HERE = import.meta.dirname;
const REPO_ROOT = path.resolve(HERE, "../..");

// --- Paket kurallari -----------------------------------------------------------------
assert.deepEqual(WRITABLE_FIELDS, ["prompt", "choices", "needs_review"]);
assert.deepEqual(OPTIONAL_WRITABLE_FIELDS, []);
assert.deepEqual(GUARD_FIELDS, ["prompt", "choices", "needs_review", "correct_answer"]);

const CHOICES = { A: "one", B: "two", C: "three", D: "four", E: "five" };
const base = { prompt: "old prompt $x$", choices: { ...CHOICES }, needs_review: true, correct_answer: "C" };
const item = (over = {}) => ({
  id: "aaaa0001",
  expected: { ...base, choices: { ...CHOICES } },
  after: { prompt: "new prompt $x$", choices: { ...CHOICES }, needs_review: true },
  ...over,
});
const CREATED = "2026-10-08T12:00:00.000Z";
const pkg = (items, over = {}) => ({ project_ref: LIVE_PROJECT_REF, table: "imat_questions", created_at: CREATED, items, ...over });
const without = (object, key) => Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));

assert.deepEqual([...validatePackage(pkg([item()]), LIVE_PROJECT_REF)], ["aaaa0001"], "gecerli paket gecmeli");
assert.throws(() => validatePackage(pkg([item()]), "baska-proje"), /project_ref/, "yanlis proje reddedilmeli");
assert.throws(() => validatePackage(pkg([item()], { project_ref: "abcdefghijabcdefghij" }), LIVE_PROJECT_REF), /project_ref/, "paketteki yanlis proje reddedilmeli");
assert.throws(() => validatePackage(pkg([item()], { table: "sat_questions" }), LIVE_PROJECT_REF), /table/, "yanlis tablo reddedilmeli");
assert.throws(() => validatePackage(without(pkg([item()]), "created_at"), LIVE_PROJECT_REF), /created_at/, "created_at zorunlu");
assert.throws(() => validatePackage(pkg([item()], { kind: "x" }), LIVE_PROJECT_REF), /alan/, "paket ustunde fazla alan reddedilmeli");
assert.throws(() => validatePackage(pkg([]), LIVE_PROJECT_REF), /bos/, "bos paket reddedilmeli");
assert.throws(() => validatePackage(pkg([item(), item()]), LIVE_PROJECT_REF), /Tekrarli/, "tekrarli id reddedilmeli");
assert.throws(() => validatePackage(pkg([item({ id: "../x" })]), LIVE_PROJECT_REF), /id/, "gecersiz id reddedilmeli");
assert.throws(
  () => validatePackage(pkg([item({ after: { ...item().after, choices: without(CHOICES, "E") } })]), LIVE_PROJECT_REF),
  /E sikki eksik/, "after'da eksik E sikki reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([item({ expected: { ...base, choices: without(CHOICES, "E") } })]), LIVE_PROJECT_REF),
  /expected\.choices: E sikki eksik/, "expected'da eksik E sikki reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([item({ after: { ...item().after, choices: { ...CHOICES, F: "six" } } })]), LIVE_PROJECT_REF),
  /A-E disi sik: F/, "F sikki reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([item({ after: { ...item().after, choices: { ...CHOICES, B: 2 } } })]), LIVE_PROJECT_REF),
  /metin/, "metin olmayan sik reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([item({ after: { ...item().after, choices: { ...CHOICES, A: " one " } } })]), LIVE_PROJECT_REF),
  /kirpilmis/, "kirpilmamis sik yazilmamali"
);
assert.throws(
  () => validatePackage(pkg([item({ after: { ...item().after, correct_answer: "B" } })]), LIVE_PROJECT_REF),
  /tasimali/, "after'a fazla alan (correct_answer) reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([item({ after: without(item().after, "needs_review") })]), LIVE_PROJECT_REF),
  /tasimali/, "after'da eksik alan reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([item({ expected: { ...base, topic: "x" } })]), LIVE_PROJECT_REF),
  /expected/, "expected'a fazla alan reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([item({ expected: without(base, "correct_answer") })]), LIVE_PROJECT_REF),
  /expected/, "expected'da eksik correct_answer reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([item({ expected: { ...base, correct_answer: "F" } })]), LIVE_PROJECT_REF),
  /correct_answer/, "A-E disi cevap reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([item({ after: { ...item().after, needs_review: "false" } })]), LIVE_PROJECT_REF),
  /boolean/, "needs_review boolean olmali"
);
assert.throws(
  () => validatePackage(pkg([item({ after: { ...item().after, prompt: "  " } })]), LIVE_PROJECT_REF),
  /prompt/, "bos soru metni yazilamaz"
);
assert.throws(
  () => validatePackage(pkg([item({ after: { prompt: base.prompt, choices: { ...CHOICES }, needs_review: true } })]), LIVE_PROJECT_REF),
  /ayni/, "no-op kayit reddedilmeli"
);
assert.throws(() => validatePackage(pkg([{ ...item(), note: "x" }]), LIVE_PROJECT_REF), /alan/, "kayitta fazla alan reddedilmeli");

assert.deepEqual(normalizeChoices({ E: " e ", D: "d", C: "c", B: "b", A: "a" }), { A: "a", B: "b", C: "c", D: "d", E: "e" }, "A-E sirali ve kirpilmis");
assert.throws(() => normalizeChoices(null), /A-E/, "bos sik nesnesi reddedilmeli");
assert.deepEqual(rowMatchesExpected({ ...base, id: "aaaa0001", topic: "t" }, base), [], "eslesen satir bos donmeli");
assert.deepEqual(rowMatchesExpected({ ...base, correct_answer: "B" }, base), ["correct_answer"], "cevap farki yakalanmali");
assert.deepEqual(rowMatchesExpected({ ...base, prompt: "changed" }, base), ["prompt"], "prompt farki yakalanmali");
assert.deepEqual(rowMatchesExpected({ ...base, choices: { ...CHOICES, E: "five " } }, base), ["choices"], "sik farki birebir yakalanmali");
assert.deepEqual(rowMatchesExpected({ ...base, choices: without(CHOICES, "E") }, base), ["choices"], "bozuk canli sik fark sayilmali (hata degil)");
assert.deepEqual(changedFields(base, { prompt: base.prompt, choices: base.choices, needs_review: false }), ["needs_review"], "yalniz flag farki");
assert.deepEqual(Object.keys(writePayload(item().after)).sort(), ["choices", "needs_review", "prompt"], "yalniz uc alan yazilir");

// --- Sahte Supabase istemcisi -----------------------------------------------------------
const LIVE_URL = `https://${LIVE_PROJECT_REF}.supabase.co`;
const OTHER_REF = "abcdefghijabcdefghij";
const OTHER_URL = `https://${OTHER_REF}.supabase.co`;
const TEST_KEY = "sb_secret_test_only";
const MISSING_TABLE = { code: "PGRST205", message: "Could not find the table 'public.imat_questions' in the schema cache" };

// options.missingTable: tablo canlida yok (sema uygulanmamis). options.objects: depoda zaten olan gorsel yollari;
// options.unlisted: depoda olan ama listede gorunmeyen (yaris) yollar. options.beforeUpdate(table, callIndex):
// eszamanli degisikligi taklit eder (yazidan hemen once).
function fakeSupabase(initialRows, { missingTable = false, objects = [], unlisted = [], bucket = true, beforeUpdate } = {}) {
  const table = new Map(initialRows.map((row) => [row.id, structuredClone(row)]));
  const stored = new Set([...objects, ...unlisted]);
  const calls = { inserts: [], updates: [], uploads: [], lists: [], factory: [], writes: 0 };
  const sorted = () => [...table.values()].sort((left, right) => left.id.localeCompare(right.id)).map((row) => structuredClone(row));
  const matches = (row, filters) => filters.every(([column, value]) => JSON.stringify(row[column]) === JSON.stringify(value));
  const client = {
    from(tableName) {
      assert.equal(tableName, "imat_questions", "yalniz imat_questions tablosuna dokunulur");
      return {
        select(_columns, options) {
          if (missingTable) {
            const failed = { data: null, count: null, error: MISSING_TABLE };
            const query = { order: () => query, eq: () => query, range: () => Promise.resolve(failed), then: (ok, ko) => Promise.resolve(failed).then(ok, ko) };
            return query;
          }
          if (options?.head) return Promise.resolve({ count: table.size, error: null });
          const filters = [];
          const rows = () => sorted().filter((row) => matches(row, filters));
          const query = {
            order: () => query,
            range: (from, to) => Promise.resolve({ data: rows().slice(from, to + 1), error: null }),
            eq: (column, value) => {
              filters.push([column, value]);
              return query;
            },
            then: (resolve, reject) => Promise.resolve({ data: rows(), error: null }).then(resolve, reject),
          };
          return query;
        },
        insert(rows) {
          for (const row of rows) {
            assert.ok(!table.has(row.id), `insert var olan id'ye dokunmamali: ${row.id}`);
            table.set(row.id, structuredClone(row));
          }
          calls.inserts.push(...rows);
          calls.writes += 1;
          return Promise.resolve({ error: null });
        },
        update(payload) {
          const filters = [];
          const chain = {
            eq: (column, value) => {
              filters.push([column, value]);
              return chain;
            },
            select: () => {
              beforeUpdate?.(table, calls.updates.length);
              const hit = [...table.values()].filter((row) => matches(row, filters));
              for (const row of hit) Object.assign(row, structuredClone(payload));
              calls.updates.push({ filters: Object.fromEntries(filters), payload, matched: hit.length });
              calls.writes += 1;
              return Promise.resolve({ data: hit.map((row) => structuredClone(row)), error: null });
            },
          };
          return chain;
        },
        upsert: () => assert.fail("upsert asla cagrilmamali"),
        delete: () => assert.fail("delete asla cagrilmamali"),
      };
    },
    storage: {
      listBuckets: () => Promise.resolve({ data: bucket ? [{ name: "imat-figures" }] : [], error: null }),
      createBucket: () => assert.fail("bucket SQL ile kurulur; createBucket cagrilmamali"),
      from: (bucketName) => {
        assert.equal(bucketName, "imat-figures", "yalniz imat-figures bucket'i");
        return {
          list: (prefix) => {
            calls.lists.push(prefix);
            const names = [...stored]
              .filter((key) => key.startsWith(`${prefix}/`) && !unlisted.includes(key))
              .map((key) => ({ name: key.slice(prefix.length + 1) }));
            return Promise.resolve({ data: names, error: null });
          },
          upload: (objectPath, body, options) => {
            assert.equal(options?.upsert, false, "gorsel upload upsert: false olmali");
            assert.equal(options?.contentType, "image/webp");
            calls.uploads.push(objectPath);
            if (stored.has(objectPath)) {
              return Promise.resolve({ data: null, error: { statusCode: "409", error: "Duplicate", message: "The resource already exists" } });
            }
            stored.add(objectPath);
            calls.writes += 1;
            return Promise.resolve({ data: { path: objectPath }, error: null });
          },
          remove: () => assert.fail("depodan silme asla cagrilmamali"),
        };
      },
    },
  };
  const clientFactory = (url, key, options) => {
    calls.factory.push({ url, key, options });
    return client;
  };
  return { client, calls, clientFactory, table, stored };
}

function setEnv(url) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.SUPABASE_SECRET_KEY = TEST_KEY;
}

async function rejectsBeforeConnecting(promise, pattern, calls, label) {
  await assert.rejects(promise, pattern, label);
  assert.equal(calls.factory.length, 0, `${label}: istemci hic kurulmamali`);
}

const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 "), Buffer.alloc(16)]);

// Uydurma banka kaydi (bank.json alanlari; shuffle ve text_hash tabloya gitmez).
const bankRecord = (id, year, number, over = {}) => ({
  id, year, number, exam_set: "mock", section: "biology", topic: "Cell biology", topic_slug: "cell-biology",
  prompt: `Synthetic prompt ${id}.`, choices: { ...CHOICES }, correct_answer: "B", figure_path: null,
  source_file: `paper-${year}.pdf`, source_page: 3, needs_review: true,
  shuffle: { original: "A", shuffled: "B", order: ["B", "A", "C", "D", "E"] }, text_hash: "0123456789ab", ...over,
});

const dir = mkdtempSync(path.join(tmpdir(), "imat-writer-lock-"));
try {
  // --- import-bank.mjs ------------------------------------------------------------------
  const existing = bankRecord("bbbb0001", 2023, 1);
  const fresh = bankRecord("bbbb0002", 2023, 2, { figure_path: "2023/bbbb0002.webp" });
  const freshNoFig = bankRecord("bbbb0003", 2024, 1);
  const otherYear = bankRecord("bbbb0004", 2025, 1, { figure_path: "2025/bbbb0004.webp" });
  const liveExisting = bankToRows([existing])[0];

  assert.deepEqual(Object.keys(liveExisting), [
    "id", "year", "number", "exam_set", "section", "topic", "topic_slug", "prompt", "choices",
    "correct_answer", "figure_path", "source_file", "source_page", "needs_review",
  ], "bankToRows tablo kolonlarini birebir uretir (shuffle/text_hash yok)");
  assert.equal(bankToRows([fresh])[0].figure_path, "2023/bbbb0002.webp", "figure_path <yil>/<id>.webp");
  assert.throws(() => bankToRows([{ ...fresh, figure_path: "figures/bbbb0002.webp" }]), /figure_path/, "beklenmeyen gorsel yolu reddedilir");
  assert.throws(() => bankToRows([{ ...fresh, choices: without(CHOICES, "E") }]), /E sikki eksik/, "eksik sik reddedilir");

  assert.deepEqual(
    planInsert(bankToRows([existing, fresh]), [liveExisting]),
    { newRows: bankToRows([fresh]), conflicts: [] },
    "planInsert: yalniz canlida olmayan id eklenir"
  );
  assert.deepEqual(
    planInsert(bankToRows([{ ...existing, prompt: "changed" }]), [liveExisting]).conflicts,
    [{ id: "bbbb0001", diff: ["prompt"] }],
    "planInsert: var olan id'de fark catisma sayilir"
  );
  assert.deepEqual(
    planInsert(bankToRows([existing]), [{ ...liveExisting, created_at: "2026-10-08T00:00:00Z" }]).conflicts, [],
    "planInsert: created_at karsilastirilmaz"
  );

  const outRoot = path.join(dir, "imat-bank");
  const writeBank = (bank, { failures = [] } = {}) => {
    rmSync(outRoot, { recursive: true, force: true });
    mkdirSync(path.join(outRoot, "figures", "2023"), { recursive: true });
    mkdirSync(path.join(outRoot, "figures", "2025"), { recursive: true });
    writeFileSync(path.join(outRoot, "bank.json"), JSON.stringify({ bank, failures, warnings: [], excluded: [] }));
    writeFileSync(path.join(outRoot, "figures", "2023", "bbbb0002.webp"), WEBP);
    writeFileSync(path.join(outRoot, "figures", "2025", "bbbb0004.webp"), WEBP);
  };
  const importOptions = (clientFactory) => ({ clientFactory, outRoot });
  const applyFlags = ["--apply", "--project-ref", LIVE_PROJECT_REF];

  writeBank([existing, fresh, freshNoFig, otherYear]);
  {
    const { calls, clientFactory } = fakeSupabase([liveExisting]);
    setEnv(LIVE_URL);
    await rejectsBeforeConnecting(importBank(["--apply"], importOptions(clientFactory)), /requires --project-ref/, calls, "import: --apply, --project-ref yok");
    await rejectsBeforeConnecting(importBank(["--apply", `--project-ref=${OTHER_REF}`], importOptions(clientFactory)), /is not the live project/, calls, "import: yanlis ref");
    await rejectsBeforeConnecting(importBank(["--force"], importOptions(clientFactory)), /Unknown argument/, calls, "import: bilinmeyen bayrak");
    await rejectsBeforeConnecting(importBank(["--years", "1999"], importOptions(clientFactory)), /Gecersiz yil/, calls, "import: gecersiz yil");
    setEnv(OTHER_URL);
    await rejectsBeforeConnecting(importBank(applyFlags, importOptions(clientFactory)), /points to project/, calls, "import: dogru ref, yanlis adres");
    await rejectsBeforeConnecting(importBank([], importOptions(clientFactory)), /points to project/, calls, "import: kuru calistirma da yanlis adrese gitmez");
  }
  {
    // failures dolu banka ve karantinasiz kayit: istemci kurulmadan reddedilir
    const { calls, clientFactory } = fakeSupabase([]);
    setEnv(LIVE_URL);
    writeBank([fresh], { failures: [{ id: "bbbb0002", gate: "x" }] });
    await rejectsBeforeConnecting(importBank([], importOptions(clientFactory)), /1 hata/, calls, "import: failures dolu banka");
    writeBank([{ ...fresh, needs_review: false }]);
    await rejectsBeforeConnecting(importBank([], importOptions(clientFactory)), /needs_review/, calls, "import: karantinasiz kayit");
    writeBank([fresh, { ...freshNoFig, id: "bbbb0002" }]);
    await rejectsBeforeConnecting(importBank([], importOptions(clientFactory)), /Tekrarli/, calls, "import: tekrarli id");
    writeBank([fresh]);
    rmSync(path.join(outRoot, "figures", "2023", "bbbb0002.webp"));
    await rejectsBeforeConnecting(importBank([], importOptions(clientFactory)), /Gorsel dosyasi yok/, calls, "import: yerel gorsel eksik");
    writeBank([fresh]);
    writeFileSync(path.join(outRoot, "figures", "2023", "bbbb0002.webp"), Buffer.from("not a webp file at all"));
    await rejectsBeforeConnecting(importBank([], importOptions(clientFactory)), /WebP/, calls, "import: WebP olmayan gorsel");
  }

  writeBank([existing, fresh, freshNoFig, otherYear]);
  {
    // Kuru calistirma: canliyi okur, hicbir sey yazmaz; depoda zaten olan gorsel atlanir ve raporlanir.
    const { calls, clientFactory } = fakeSupabase([liveExisting], { objects: ["2025/bbbb0004.webp"] });
    setEnv(LIVE_URL);
    const result = await importBank([], importOptions(clientFactory));
    assert.deepEqual(result, { mode: "dry-run", wouldInsert: 3, skipped: 1, wouldUpload: 1, figuresExisting: 1, writes: 0 }, "import: kuru calistirma sayimlari");
    assert.equal(calls.writes + calls.inserts.length + calls.uploads.length + calls.updates.length, 0, "import: kuru calistirma yazmaz");
    assert.deepEqual([calls.factory[0].url, calls.factory[0].key], [LIVE_URL, TEST_KEY], "import: istemci ortamdaki adres ve gizli anahtarla kurulur");
    assert.equal(calls.factory[0].options.auth.persistSession, false);
  }
  {
    // --years filtresi
    const { calls, clientFactory } = fakeSupabase([liveExisting]);
    setEnv(LIVE_URL);
    const result = await importBank(["--years", "2024"], importOptions(clientFactory));
    assert.deepEqual([result.wouldInsert, result.skipped, result.wouldUpload], [1, 0, 0], "import --years 2024: yalniz o yil");
    assert.equal(calls.writes, 0);
    await assert.rejects(importBank(["--years", "2011"], importOptions(clientFactory)), /secilen yillarda kayit yok/, "import: bos secim reddedilir");
  }
  {
    // Tablo canlida yoksa acik mesaj (sema uygulanmamis); yazi yok.
    const { calls, clientFactory } = fakeSupabase([], { missingTable: true });
    setEnv(LIVE_URL);
    await assert.rejects(importBank([], importOptions(clientFactory)), /tablo canlida yok; once supabase\/imat_bank\.sql/, "import: tablo yok mesaji");
    assert.equal(calls.writes, 0);
    const { clientFactory: noBucket } = fakeSupabase([], { bucket: false });
    await assert.rejects(importBank([], importOptions(noBucket)), /imat-figures bucket'i canlida yok/, "import: bucket yok mesaji");
  }
  {
    // Uygulama: yalniz yeni id'ler eklenir; depoda olan gorsel ezilmez (atlanir).
    const { calls, clientFactory, table, stored } = fakeSupabase([liveExisting], { objects: ["2025/bbbb0004.webp"] });
    setEnv(LIVE_URL);
    const result = await importBank(applyFlags, importOptions(clientFactory));
    assert.deepEqual(result, { mode: "apply", inserted: 3, skipped: 1, uploaded: 1, figuresExisting: 1, total: 4 }, "import: dogru ref + dogru adres gecer");
    assert.deepEqual(calls.inserts.map((row) => row.id), ["bbbb0002", "bbbb0003", "bbbb0004"]);
    assert.deepEqual(calls.inserts, bankToRows([fresh, freshNoFig, otherYear]), "import: eklenen satirlar bankToRows ile ayni");
    assert.deepEqual(calls.uploads, ["2023/bbbb0002.webp"], "import: var olan gorsel yuklenmez");
    assert.ok(stored.has("2023/bbbb0002.webp"));
    assert.equal(calls.updates.length, 0, "import: var olan satira yazi yok");
    assert.deepEqual(table.get("bbbb0001"), liveExisting, "import: var olan satir degismez");
    assert.ok([...table.values()].every((row) => row.needs_review === true), "import: her satir karantinada");

    // Ikinci kuru calistirma: 0 yeni, hepsi degismeden atlanir.
    const again = await importBank([], importOptions(clientFactory));
    assert.deepEqual([again.wouldInsert, again.skipped, again.wouldUpload, again.figuresExisting], [0, 4, 0, 2], "import: tekrar kosunca bos");
  }
  {
    // Depo listesinde gorunmeyen ama upload'da "zaten var" donen gorsel de ezilmez, atlanir.
    const { calls, clientFactory } = fakeSupabase([liveExisting], { unlisted: ["2023/bbbb0002.webp"] });
    setEnv(LIVE_URL);
    const result = await importBank(applyFlags, importOptions(clientFactory));
    assert.deepEqual([result.uploaded, result.figuresExisting], [1, 1], "import: upload'da zaten var donen gorsel atlanir");
    assert.deepEqual(calls.uploads, ["2023/bbbb0002.webp", "2025/bbbb0004.webp"]);
  }
  writeBank([{ ...existing, prompt: "changed locally" }, fresh]);
  {
    const { calls, clientFactory } = fakeSupabase([liveExisting]);
    setEnv(LIVE_URL);
    await assert.rejects(importBank(applyFlags, importOptions(clientFactory)), /INSERT-ONLY FAIL/, "import: var olan id farkliysa yazi yok");
    assert.equal(calls.writes + calls.inserts.length + calls.uploads.length, 0, "import: catismada ne satir ne gorsel yazilir");
    await assert.rejects(importBank([], importOptions(clientFactory)), /INSERT-ONLY FAIL/, "import: kuru calistirma da catismayi bildirir");
  }
  writeBank([existing]);
  {
    // Acilmis (needs_review false) satir: catisma, ipucu --years
    const { calls, clientFactory } = fakeSupabase([{ ...liveExisting, needs_review: false }]);
    setEnv(LIVE_URL);
    await assert.rejects(importBank([], importOptions(clientFactory)), /INSERT-ONLY FAIL.*--years/s, "import: acilmis satirda ipucu");
    assert.equal(calls.writes, 0);
  }

  // --- patch-imat-questions.mjs ---------------------------------------------------------
  const liveRow = (id, over = {}) => ({
    ...bankToRows([bankRecord(id, 2025, Number.parseInt(id.slice(-2), 16))])[0],
    prompt: base.prompt, choices: { ...CHOICES }, correct_answer: "C", needs_review: true, created_at: "2026-10-08T00:00:00+00:00", ...over,
  });
  const target = liveRow("aaaa0001");
  const second = liveRow("aaaa0002");
  const other = liveRow("aaaa0003", { prompt: "untouched" });
  const packagePath = path.join(dir, "package.json");
  writeFileSync(packagePath, JSON.stringify(pkg([item()])));
  const backupsDir = path.join(dir, "backups");
  const backupPath = path.join(dir, "backup.json");
  const patchArgs = (...extra) => ["--package", packagePath, ...extra];
  const NOW = new Date("2026-10-08T12:34:56.789Z");
  const patchOptions = (clientFactory) => ({ clientFactory, backupsDir, now: NOW });

  {
    const { calls, clientFactory } = fakeSupabase([target, other]);
    setEnv(LIVE_URL);
    await rejectsBeforeConnecting(patchQuestions(patchArgs("--apply"), patchOptions(clientFactory)), /requires --project-ref/, calls, "patch: --apply, --project-ref yok");
    await rejectsBeforeConnecting(patchQuestions(patchArgs("--apply", "--project-ref", OTHER_REF), patchOptions(clientFactory)), /is not the live project/, calls, "patch: yanlis ref");
    await rejectsBeforeConnecting(patchQuestions(patchArgs("--force"), patchOptions(clientFactory)), /Unknown argument/, calls, "patch: bilinmeyen bayrak");
    await rejectsBeforeConnecting(patchQuestions(patchArgs("--apply", "--dry-run"), patchOptions(clientFactory)), /either/, calls, "patch: iki mod birden");
    await rejectsBeforeConnecting(patchQuestions([], patchOptions(clientFactory)), /zorunlu/, calls, "patch: paket yok");
    await rejectsBeforeConnecting(patchQuestions(["--rollback", backupPath, "--backup", backupPath], patchOptions(clientFactory)), /yalniz --package/, calls, "patch: --backup rollback ile");
    await rejectsBeforeConnecting(patchQuestions(["--package", packagePath, "--rollback", backupPath], patchOptions(clientFactory)), /birlikte/, calls, "patch: iki is birden");
    setEnv(OTHER_URL);
    await rejectsBeforeConnecting(patchQuestions(patchArgs(...applyFlags), patchOptions(clientFactory)), /points to project/, calls, "patch: dogru ref, yanlis adres");
    await rejectsBeforeConnecting(patchQuestions(patchArgs(), patchOptions(clientFactory)), /points to project/, calls, "patch: kuru calistirma da yanlis adrese gitmez");
  }
  {
    const { calls, clientFactory } = fakeSupabase([target, other]);
    setEnv(LIVE_URL);
    const summary = await patchQuestions(patchArgs(), patchOptions(clientFactory));
    assert.deepEqual([summary.mode, summary.status, summary.targets, summary.non_targets, summary.writes], ["dry-run", "ready", 1, 1, 0], "patch: bayraksiz calisma kuru calistirmadir");
    assert.equal(calls.writes + calls.updates.length, 0, "patch: kuru calistirma yazmaz");
    assert.ok(!existsSync(backupsDir), "patch: kuru calistirma yedek yazmaz");
  }
  {
    // Compare-and-swap: canli satir beklenenden farkliysa yazi da yedek de yok.
    const { calls, clientFactory } = fakeSupabase([{ ...target, prompt: "someone else edited" }, other]);
    setEnv(LIVE_URL);
    await assert.rejects(patchQuestions(patchArgs(...applyFlags, "--backup", path.join(dir, "never.json")), patchOptions(clientFactory)), /Dry-run FAIL.*prompt/, "patch: CAS on kontrolu");
    assert.equal(calls.writes, 0);
    assert.ok(!existsSync(path.join(dir, "never.json")), "patch: basarisiz on kontrolde yedek olusmaz");
    const { clientFactory: missingFactory } = fakeSupabase([], { missingTable: true });
    await assert.rejects(patchQuestions(patchArgs(), patchOptions(missingFactory)), /tablo canlida yok/, "patch: tablo yok mesaji");
  }
  {
    const { calls, clientFactory, table } = fakeSupabase([target, other]);
    setEnv(LIVE_URL);
    const result = await patchQuestions(patchArgs(...applyFlags, "--backup", backupPath), patchOptions(clientFactory));
    assert.deepEqual([result.mode, result.status, result.applied, result.non_targets_unchanged], ["apply", "verified", 1, 1], "patch: dogru ref + dogru adres gecer");
    assert.equal(calls.updates.length, 1);
    assert.deepEqual(calls.updates[0].filters, { id: "aaaa0001", needs_review: true, correct_answer: "C" }, "patch: yazi beklenen eski degere kosullu");
    assert.deepEqual(Object.keys(calls.updates[0].payload).sort(), ["choices", "needs_review", "prompt"]);
    assert.equal(table.get("aaaa0001").prompt, "new prompt $x$");
    assert.equal(table.get("aaaa0001").correct_answer, "C", "patch: dogru cevap degismez");
    assert.deepEqual(table.get("aaaa0003"), other, "patch: hedef disi satir degismez");
    const backup = JSON.parse(readFileSync(backupPath, "utf8"));
    assert.deepEqual([backup.kind, backup.project_ref, backup.table], ["imat-question-patch-backup", LIVE_PROJECT_REF, "imat_questions"]);
    assert.deepEqual(backup.records[0].before, target, "patch: yedek tam eski satiri tasir");
    assert.throws(() => writeFileSync(backupPath, "x", { flag: "wx" }), /EEXIST/);
    await assert.rejects(patchQuestions(patchArgs(...applyFlags, "--backup", backupPath), patchOptions(clientFactory)), /Dry-run FAIL/, "patch: ayni paket ikinci kez uygulanmaz (canli artik farkli)");

    // Geri alma provasi yazmaz; gercek geri alma eski satiri geri getirir.
    const rehearsal = await patchQuestions(["--rollback", backupPath], patchOptions(clientFactory));
    assert.deepEqual([rehearsal.mode, rehearsal.would_restore, rehearsal.writes], ["rollback-dry-run", 1, 0], "patch: geri alma provasi");
    assert.equal(calls.updates.length, 1, "patch: prova yazmaz");
    await rejectsBeforeConnecting(
      patchQuestions(["--rollback", backupPath, "--apply"], { clientFactory: () => assert.fail("kurulmamali"), backupsDir }),
      /requires --project-ref/, { factory: [] }, "patch: geri alma da --project-ref ister"
    );
    const restored = await patchQuestions(["--rollback", backupPath, ...applyFlags], patchOptions(clientFactory));
    assert.deepEqual([restored.mode, restored.status, restored.restored], ["rollback", "verified", 1]);
    assert.deepEqual(table.get("aaaa0001"), target, "patch: geri alma eski satiri birebir geri yazar");
    assert.deepEqual(calls.updates[1].filters, { id: "aaaa0001", needs_review: true, correct_answer: "C" }, "patch: geri alma da kosullu");
    const twice = await patchQuestions(["--rollback", backupPath, ...applyFlags], patchOptions(clientFactory));
    assert.deepEqual([twice.restored, twice.skipped.length], [0, 1], "patch: ikinci geri alma ezmez, atlar");
  }
  {
    // Varsayilan yedek yolu: <backupsDir>/<zaman>-before-apply.json; eszamanli degisiklik geri almada ezilmez.
    const { clientFactory, table } = fakeSupabase([target, other]);
    setEnv(LIVE_URL);
    const result = await patchQuestions(patchArgs(...applyFlags), patchOptions(clientFactory));
    assert.equal(result.backup_path, path.join(backupsDir, "20261008T123456Z-before-apply.json"), "patch: varsayilan yedek yolu");
    await assert.rejects(patchQuestions(patchArgs(...applyFlags), patchOptions(clientFactory)), /Dry-run FAIL/);
    table.get("aaaa0001").prompt = "edited after apply";
    const rollback = await patchQuestions(["--rollback", result.backup_path, ...applyFlags], patchOptions(clientFactory));
    assert.deepEqual([rollback.restored, rollback.skipped.length], [0, 1], "patch: sonradan degisen satir geri almada ezilmez");
    assert.equal(table.get("aaaa0001").prompt, "edited after apply");
  }
  {
    // Ikinci kayda yazmadan hemen once canli satir degisirse: dur, ilk kaydi geri al.
    const twoPath = path.join(dir, "two.json");
    writeFileSync(twoPath, JSON.stringify(pkg([item(), item({ id: "aaaa0002" })])));
    const { calls, clientFactory, table } = fakeSupabase([target, second, other], {
      beforeUpdate: (rows, index) => {
        if (index === 0) rows.get("aaaa0002").prompt = "concurrent edit";
      },
    });
    setEnv(LIVE_URL);
    await assert.rejects(
      patchQuestions(["--package", twoPath, ...applyFlags, "--backup", path.join(dir, "two-backup.json")], patchOptions(clientFactory)),
      /Apply FAIL @aaaa0002.*1 kayittan 1 geri alindi/s, "patch: kayit basi CAS eszamanli degisikligi yakalar"
    );
    assert.deepEqual(table.get("aaaa0001"), target, "patch: basarisiz uygulamada onceki kayit geri alinir");
    assert.equal(table.get("aaaa0002").prompt, "concurrent edit", "patch: eszamanli degisiklik ezilmez");
    assert.ok(calls.updates.every((update) => update.filters.id !== "aaaa0002"), "patch: degisen satira yazi gitmez");
  }

  // --- build-release-package.mjs: salt okuma, yalniz needs_review ---------------------------
  const releaseRows = [
    liveRow("cccc0001", { year: 2025, section: "biology" }),
    liveRow("cccc0002", { year: 2025, section: "chemistry" }),
    liveRow("cccc0003", { year: 2024, section: "biology" }),
    liveRow("cccc0004", { year: 2024, section: "biology", needs_review: false }), // zaten acik: pakete girmez
    liveRow("cccc0005", { year: 2023, section: "logic" }),
  ];
  const releaseDir = path.join(dir, "release");
  const releaseOptions = (clientFactory, now = new Date("2026-10-08T13:00:00.000Z")) => ({ clientFactory, outDir: releaseDir, now });
  {
    const { calls, clientFactory } = fakeSupabase(releaseRows);
    setEnv(LIVE_URL);
    await rejectsBeforeConnecting(buildRelease(["--all", "--apply", "--project-ref", LIVE_PROJECT_REF], releaseOptions(clientFactory)), /Unknown argument: --apply/, calls, "release: --apply kabul edilmez");
    await rejectsBeforeConnecting(buildRelease([], releaseOptions(clientFactory)), /zorunlu/, calls, "release: secim yok");
    await rejectsBeforeConnecting(buildRelease(["--all", "--years", "2025"], releaseOptions(clientFactory)), /zorunlu/, calls, "release: iki secim birden");
    await rejectsBeforeConnecting(buildRelease(["--years", "1999"], releaseOptions(clientFactory)), /Gecersiz yil/, calls, "release: gecersiz yil");
    await rejectsBeforeConnecting(buildRelease(["--all", "--section", "astrology"], releaseOptions(clientFactory)), /bolum/, calls, "release: gecersiz bolum");
    setEnv(OTHER_URL);
    await rejectsBeforeConnecting(buildRelease(["--all"], releaseOptions(clientFactory)), /points to project/, calls, "release: yanlis adrese gitmez");
  }
  {
    const { clientFactory } = fakeSupabase(releaseRows);
    setEnv(LIVE_URL);
    await assert.rejects(buildRelease(["--years", "2022"], releaseOptions(clientFactory)), /karantinada satiri olmayan yil: 2022/i, "release: karantinasiz yil");
    await assert.rejects(buildRelease(["--years", "2025", "--section", "physics-math"], releaseOptions(clientFactory)), /bos paket yazilmaz/, "release: bos secim");
    assert.ok(!existsSync(releaseDir), "release: reddedilen secimde paket dosyasi olusmaz");
    const { clientFactory: missingFactory } = fakeSupabase([], { missingTable: true });
    await assert.rejects(buildRelease(["--all"], releaseOptions(missingFactory)), /tablo canlida yok/, "release: tablo yok mesaji");
  }
  {
    const { calls, clientFactory } = fakeSupabase(releaseRows);
    setEnv(LIVE_URL);
    const all = await buildRelease(["--all"], releaseOptions(clientFactory));
    assert.deepEqual([all.quarantined, all.packed, all.per_year], [4, 4, { 2023: 1, 2024: 1, 2025: 2 }], "release --all: yalniz karantinadaki satirlar");
    assert.equal(path.basename(all.package_path), "imat-release-all-20261008T130000Z.json");
    const bio = await buildRelease(["--years", "2024,2025", "--section", "biology"], releaseOptions(clientFactory, new Date("2026-10-08T13:01:00.000Z")));
    assert.deepEqual([bio.packed, bio.per_year], [2, { 2024: 1, 2025: 1 }], "release --years --section");
    assert.equal(path.basename(bio.package_path), "imat-release-2024_2025-biology-20261008T130100Z.json");
    assert.equal(calls.writes + calls.updates.length + calls.inserts.length + calls.uploads.length, 0, "release: veritabanina yazmaz");
    await assert.rejects(buildRelease(["--all"], releaseOptions(clientFactory)), /ezilmez/, "release: ayni paket ezilmez");
  }
  {
    const { calls, clientFactory, table } = fakeSupabase(releaseRows);
    setEnv(LIVE_URL);
    const result = await buildRelease(["--years", "2025"], releaseOptions(clientFactory, new Date("2026-10-08T14:00:00.000Z")));
    const releasePkg = JSON.parse(readFileSync(result.package_path, "utf8"));
    assert.doesNotThrow(() => validatePackage(releasePkg, LIVE_PROJECT_REF), "release: paket gecerli");
    assert.deepEqual(Object.keys(releasePkg).sort(), ["created_at", "items", "project_ref", "table"]);
    assert.equal(releasePkg.created_at, "2026-10-08T14:00:00.000Z");
    assert.deepEqual(releasePkg.items.map((entry) => entry.id), ["cccc0001", "cccc0002"]);
    for (const entry of releasePkg.items) {
      const live = table.get(entry.id);
      assert.deepEqual(changedFields(entry.expected, entry.after), ["needs_review"], `release ${entry.id}: yalniz needs_review`);
      assert.deepEqual(entry.after, { prompt: live.prompt, choices: live.choices, needs_review: false });
      assert.deepEqual(entry.expected, { prompt: live.prompt, choices: live.choices, needs_review: true, correct_answer: live.correct_answer });
      assert.deepEqual(rowMatchesExpected(live, entry.expected), [], `release ${entry.id}: beklenen eski deger canliyla ayni`);
    }

    const applied = await patchQuestions(
      ["--package", result.package_path, ...applyFlags, "--backup", path.join(dir, "release-backup.json")],
      patchOptions(clientFactory)
    );
    assert.deepEqual([applied.status, applied.applied, applied.non_targets_unchanged], ["verified", 2, 3], "release: yama araci paketi uygular");
    for (const entry of releasePkg.items) {
      assert.deepEqual(table.get(entry.id), { ...releaseRows.find((row) => row.id === entry.id), needs_review: false }, `release ${entry.id}: yalniz needs_review degisti`);
    }
    assert.ok(calls.updates.every((update) => Object.keys(update.payload).sort().join() === "choices,needs_review,prompt"));
    await assert.rejects(buildRelease(["--years", "2025"], releaseOptions(clientFactory, new Date("2026-10-08T15:00:00.000Z"))), /karantinada satiri olmayan yil: 2025/i, "release: acilanlar yeniden paketlenmez");
    assert.equal(readdirSync(releaseDir).length, 3, "release: yalniz basarili secimler dosya birakir");
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// --- Kaynak taramasi: ortak hedef kilidi, upsert yok, acma paketi yazmaz -------------------------
const source = (name) => readFileSync(path.join(REPO_ROOT, name), "utf8");
for (const name of ["scripts/imat/import-bank.mjs", "scripts/imat/patch-imat-questions.mjs", "scripts/imat/build-release-package.mjs"]) {
  const text = source(name);
  assert.ok(text.includes("createImportClient("), `${name}: istemciyi ortak katmandan kurmali`);
  assert.ok(!/\bcreateClient\s*\(/.test(text), `${name}: kendi Supabase istemcisini kurmamali`);
  assert.ok(!/\benv(?:\.|\[)\s*["']?SUPABASE_/.test(text) && !/readFileSync\([^)]*\.env\.local/.test(text), `${name}: anahtari ve .env.local'i dogrudan okumamali`);
  assert.ok(!text.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), `${name}: anon anahtar kullanmamali`);
  assert.ok(!/\.upsert\s*\(|upsert\s*:\s*true/.test(text), `${name}: upsert yok`);
  assert.ok(!/\.delete\s*\(|\.remove\s*\(|createBucket/.test(text), `${name}: silme ve bucket kurma yok`);
}
assert.ok(source("scripts/imat/import-bank.mjs").includes("INSERT-ONLY"), "import-bank: INSERT-ONLY sozlesme notu");
{
  const release = source("scripts/imat/build-release-package.mjs");
  assert.ok(!/\.(insert|update|upload)\s*\(/.test(release), "build-release-package: veritabanina yazmaz");
  assert.ok(!/["'`]--apply["'`]/.test(release) && !/mode\s*===?\s*["']apply["']/.test(release), "build-release-package: --apply islemez");
}

console.log("test-question-patch (IMAT) PASS (paket kurallari, insert-only import, CAS yama + geri alma, acma paketi; sahte istemciyle)");
