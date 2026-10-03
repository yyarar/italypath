// SAT yazicilarinin cevrimdisi testi: paket kurallari (lib/question-patch.mjs) ve iki yazicinin
// (import-bank.mjs, patch-sat-questions.mjs) kabul dosyasi yazicilariyla ortak hedef kilidi
// (STATUS #65, 2026-09-26). Veritabanina baglanmaz: Supabase istemcisi sahte, girdiler gecici klasorde.
// Okuma ve Yazma (plan 2026-10-03): import-bank aciklamayi yalniz yeni satira yazar; RW acma paketi
// (rw/build-rw-release-package.mjs) salt okur ve yalniz needs_review degistirir.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { LIVE_PROJECT_REF } from "../lib/program-details-import.mjs";
import { bankToRows, main as importBank, planInsert } from "./import-bank.mjs";
import { changedFields, normalizeChoices, rowMatchesExpected, validatePackage, writePayload } from "./lib/question-patch.mjs";
import { main as patchQuestions } from "./patch-sat-questions.mjs";
import { main as buildRwRelease } from "./rw/build-rw-release-package.mjs";

// --- Paket kurallari -----------------------------------------------------------------
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
const pkg = (records) => ({ kind: "sat-question-patch", schema_version: 1, project_ref: LIVE_PROJECT_REF, run_label: "t", records });

assert.doesNotThrow(() => validatePackage(pkg([record()]), LIVE_PROJECT_REF), "gecerli paket gecmeli");
assert.throws(() => validatePackage(pkg([record()]), "baska-proje"), /project_ref/, "yanlis proje reddedilmeli");
assert.throws(() => validatePackage(pkg([record(), record()]), LIVE_PROJECT_REF), /Tekrarli/, "duplicate id reddedilmeli");
assert.throws(
  () => validatePackage(pkg([record({ after: { prompt: "x", choices: null, needs_review: false, correct_answer: ["B"] } })]), LIVE_PROJECT_REF),
  /tasimali|yazilamaz/, "after'a fazla alan reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([record({ after: { prompt: base.prompt, choices: base.choices, needs_review: false } })]), LIVE_PROJECT_REF),
  /ayni/, "no-op kayit reddedilmeli"
);

assert.deepEqual(rowMatchesExpected({ ...base }, base), [], "eslesen satir bos donmeli");
assert.deepEqual(rowMatchesExpected({ ...base, correct_answer: ["B"] }, base), ["correct_answer"], "cevap farki yakalanmali");
assert.deepEqual(rowMatchesExpected({ ...base, prompt: "changed" }, base), ["prompt"], "prompt farki yakalanmali");
assert.deepEqual(changedFields(base, { prompt: base.prompt, choices: base.choices, needs_review: true }), ["needs_review"], "flag-only diff dogru");
assert.equal(normalizeChoices(null), null, "spr choices null kalmali");

// --- Istege bagli alan: explanation_en (STATUS #99, 2026-10-02) ----------------------------------
const explanationBase = { ...base, explanation_en: "Old line.\\nChoice A is wrong." };
const explanationRecord = (over = {}) => ({
  id: "abc12345",
  expected_before: { ...explanationBase },
  after: { prompt: base.prompt, choices: base.choices, needs_review: false, explanation_en: "Old line.\nChoice A is wrong." },
  ...over,
});
assert.doesNotThrow(() => validatePackage(pkg([explanationRecord()]), LIVE_PROJECT_REF), "yalniz aciklamayi degistiren paket gecmeli");
assert.throws(
  () => validatePackage(pkg([explanationRecord({ expected_before: { ...base } })]), LIVE_PROJECT_REF),
  /expected_before\.explanation_en zorunlu/, "aciklama yaziliyorsa beklenen eski aciklama sart"
);
assert.throws(
  () => validatePackage(pkg([explanationRecord({ after: { ...explanationRecord().after, explanation_en: "  " } })]), LIVE_PROJECT_REF),
  /bos olmayan metin/, "bos aciklama yazilamaz"
);
assert.throws(
  () => validatePackage(pkg([explanationRecord({ after: { ...explanationRecord().after, explanation_tr: "x" } })]), LIVE_PROJECT_REF),
  /tasimali/, "izinli olmayan alan reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([explanationRecord({ after: { ...explanationRecord().after, explanation_en: explanationBase.explanation_en } })]), LIVE_PROJECT_REF),
  /ayni/, "aciklama da ayniysa no-op reddedilmeli"
);
assert.deepEqual(
  rowMatchesExpected({ ...explanationBase, explanation_en: "drifted" }, explanationBase), ["explanation_en"],
  "canlidaki aciklama beklenenle ayni degilse yakalanmali"
);
assert.deepEqual(rowMatchesExpected({ ...base, explanation_en: "anything" }, base), [], "uc alanli eski pakette aciklama korunmaz, karsilastirilmaz");
assert.deepEqual(changedFields(explanationBase, explanationRecord().after), ["explanation_en"], "yalniz aciklama farki dogru");
assert.deepEqual(changedFields(base, { ...base, explanation_en: "x" }), [], "bir tarafta yoksa aciklama karsilastirilmaz");
assert.deepEqual(Object.keys(writePayload(record().after, record().after)).sort(), ["choices", "needs_review", "prompt"], "eski paket aciklama alanini hic yazmaz");
assert.equal(writePayload(explanationRecord().after, explanationRecord().after).explanation_en, "Old line.\nChoice A is wrong.", "yeni paket aciklamayi yazar");
assert.equal(writePayload(explanationBase, explanationRecord().after).explanation_en, explanationBase.explanation_en, "geri alma yedekteki eski aciklamayi yazar");

// --- Sahte Supabase istemcisi -----------------------------------------------------------
const LIVE_URL = `https://${LIVE_PROJECT_REF}.supabase.co`;
const OTHER_REF = "abcdefghijabcdefghij";
const OTHER_URL = `https://${OTHER_REF}.supabase.co`;
const TEST_KEY = "sb_secret_test_only";

function fakeSupabase(initialRows) {
  const table = new Map(initialRows.map((row) => [row.id, structuredClone(row)]));
  const calls = { inserts: [], updates: [], uploads: [], factory: [] };
  const sorted = () => [...table.values()].sort((left, right) => left.id.localeCompare(right.id)).map((row) => structuredClone(row));
  const client = {
    from(tableName) {
      assert.equal(tableName, "sat_questions", "yalniz sat_questions tablosuna dokunulur");
      return {
        select(_columns, options) {
          if (options?.head) return Promise.resolve({ count: table.size, error: null });
          // eq zincirlenir (RW acma paketi iki filtre kullanir); sorgu dogrudan beklenirse de sonuc doner.
          const filters = [];
          const rows = () => sorted().filter((row) => filters.every(([column, value]) => row[column] === value));
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
          for (const row of rows) table.set(row.id, structuredClone(row));
          calls.inserts.push(...rows);
          return Promise.resolve({ error: null });
        },
        update(payload) {
          return {
            eq: (column, value) => ({
              select: () => {
                const row = [...table.values()].find((candidate) => candidate[column] === value);
                Object.assign(row, structuredClone(payload));
                calls.updates.push({ id: value, payload });
                return Promise.resolve({ data: [structuredClone(row)], error: null });
              },
            }),
          };
        },
      };
    },
    storage: {
      listBuckets: () => Promise.resolve({ data: [{ name: "sat-figures" }], error: null }),
      createBucket: () => assert.fail("bucket zaten var; createBucket cagrilmamali"),
      from: () => ({
        upload: (objectPath) => {
          calls.uploads.push(objectPath);
          return Promise.resolve({ error: null });
        },
      }),
    },
  };
  // createImportClient'in cagirdigi fabrika: gercek @supabase/supabase-js yerine bu sahte istemci.
  const clientFactory = (url, key, options) => {
    calls.factory.push({ url, key, options });
    return client;
  };
  return { client, calls, clientFactory, table };
}

function setEnv(url) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.SUPABASE_SECRET_KEY = TEST_KEY;
}

async function rejectsBeforeConnecting(promise, pattern, calls, label) {
  await assert.rejects(promise, pattern, label);
  assert.equal(calls.factory.length, 0, `${label}: istemci hic kurulmamali`);
}

const dir = mkdtempSync(path.join(tmpdir(), "sat-writer-lock-"));
try {
  // --- patch-sat-questions.mjs ---------------------------------------------------------
  const liveTarget = { id: "abc12345", section: "math", skill_slug: "linear", ...base, figure_path: null, explanation_en: null };
  const liveOther = { id: "def67890", section: "math", skill_slug: "linear", ...base, prompt: "other", figure_path: null, explanation_en: null };
  const packagePath = path.join(dir, "package.json");
  writeFileSync(packagePath, JSON.stringify(pkg([record()])));
  const backupPath = path.join(dir, "backup.json");
  const patchArgs = (...extra) => ["--package", packagePath, ...extra];

  {
    const { calls, clientFactory } = fakeSupabase([liveTarget, liveOther]);
    setEnv(LIVE_URL);
    await rejectsBeforeConnecting(patchQuestions(patchArgs("--apply"), { clientFactory }), /requires --project-ref/, calls, "patch: --apply, --project-ref yok");
    await rejectsBeforeConnecting(patchQuestions(patchArgs("--apply", "--project-ref", OTHER_REF), { clientFactory }), /is not the live project/, calls, "patch: yanlis ref");
    await rejectsBeforeConnecting(patchQuestions(patchArgs("--force"), { clientFactory }), /Unknown argument/, calls, "patch: bilinmeyen bayrak");
    await rejectsBeforeConnecting(patchQuestions(patchArgs("--apply", "--dry-run"), { clientFactory }), /either/, calls, "patch: iki mod birden");
    await rejectsBeforeConnecting(patchQuestions(["--rollback", backupPath, "--backup", backupPath], { clientFactory }), /yalniz --package/, calls, "patch: --backup rollback ile");

    setEnv(OTHER_URL);
    await rejectsBeforeConnecting(patchQuestions(patchArgs("--apply", "--project-ref", LIVE_PROJECT_REF), { clientFactory }), /points to project/, calls, "patch: dogru ref, yanlis adres");
    await rejectsBeforeConnecting(patchQuestions(patchArgs(), { clientFactory }), /points to project/, calls, "patch: kuru calistirma da yanlis adrese gitmez");
  }
  {
    const { calls, clientFactory } = fakeSupabase([liveTarget, liveOther]);
    setEnv(LIVE_URL);
    const summary = await patchQuestions(patchArgs(), { clientFactory });
    assert.equal(summary.mode, "dry-run", "patch: bayraksiz calisma kuru calistirmadir");
    assert.equal(summary.writes, 0);
    assert.equal(summary.targets, 1);
    assert.equal(calls.updates.length, 0, "patch: kuru calistirma yazmaz");
    assert.equal(calls.factory.length, 1);
    assert.deepEqual([calls.factory[0].url, calls.factory[0].key], [LIVE_URL, TEST_KEY], "patch: istemci ortamdaki adres ve gizli anahtarla kurulur");
    assert.equal(calls.factory[0].options.auth.persistSession, false);
  }
  {
    const { calls, clientFactory, table } = fakeSupabase([liveTarget, liveOther]);
    setEnv(LIVE_URL);
    const result = await patchQuestions(patchArgs("--apply", "--project-ref", LIVE_PROJECT_REF, "--backup", backupPath), { clientFactory });
    assert.equal(result.mode, "apply", "patch: dogru ref + dogru adres gecer");
    assert.equal(result.status, "verified");
    assert.equal(result.applied, 1);
    assert.equal(result.non_targets_unchanged, 1);
    assert.equal(calls.updates.length, 1);
    assert.equal(calls.updates[0].id, "abc12345");
    assert.equal(table.get("abc12345").prompt, "new $x$");
    assert.equal(table.get("def67890").prompt, "other", "hedef disi satir degismez");
    assert.ok(existsSync(backupPath), "patch: yazmadan once yedek dosyasi olusur");
    const backup = JSON.parse(readFileSync(backupPath, "utf8"));
    assert.equal(backup.project_ref, LIVE_PROJECT_REF);
    assert.equal(backup.records[0].before.prompt, "old $x$");
    assert.deepEqual(Object.keys(calls.updates[0].payload).sort(), ["choices", "needs_review", "prompt"], "patch: uc alanli paket aciklamaya dokunmaz");
  }

  // Yalniz aciklamayi degistiren paket: yazma, yedek, beklenen eski deger korumasi ve geri alma.
  {
    const liveExplained = { ...liveTarget, ...explanationBase };
    const explanationPackagePath = path.join(dir, "explanation-package.json");
    writeFileSync(explanationPackagePath, JSON.stringify(pkg([explanationRecord()])));
    const explanationBackupPath = path.join(dir, "explanation-backup.json");
    const explanationArgs = (...extra) => ["--package", explanationPackagePath, ...extra];
    const applyFlags = ["--apply", "--project-ref", LIVE_PROJECT_REF];

    {
      const { calls, clientFactory } = fakeSupabase([{ ...liveExplained, explanation_en: "someone else edited" }, liveOther]);
      setEnv(LIVE_URL);
      await assert.rejects(
        patchQuestions(explanationArgs(...applyFlags, "--backup", path.join(dir, "never.json")), { clientFactory }),
        /Dry-run FAIL.*explanation_en/, "patch: canli aciklama beklenenden farkliysa yazi yok"
      );
      assert.equal(calls.updates.length, 0);
      assert.ok(!existsSync(path.join(dir, "never.json")), "patch: basarisiz on kontrolde yedek dosyasi olusmaz");
    }

    const { calls, clientFactory, table } = fakeSupabase([liveExplained, liveOther]);
    setEnv(LIVE_URL);
    const dry = await patchQuestions(explanationArgs(), { clientFactory });
    assert.equal(dry.status, "ready");
    assert.equal(calls.updates.length, 0, "patch: aciklama paketi kuru calistirmada yazmaz");

    const applied = await patchQuestions(explanationArgs(...applyFlags, "--backup", explanationBackupPath), { clientFactory });
    assert.equal(applied.status, "verified");
    assert.equal(calls.updates.length, 1);
    assert.equal(table.get("abc12345").explanation_en, "Old line.\nChoice A is wrong.", "patch: aciklama yazildi");
    assert.equal(table.get("abc12345").prompt, base.prompt, "patch: soru metni degismedi");
    assert.deepEqual(table.get("abc12345").correct_answer, base.correct_answer, "patch: dogru cevap degismedi");
    assert.equal(table.get("def67890").explanation_en, null, "patch: hedef disi satirin aciklamasi degismedi");
    const explanationBackup = JSON.parse(readFileSync(explanationBackupPath, "utf8"));
    assert.equal(explanationBackup.records[0].before.explanation_en, explanationBase.explanation_en, "patch: yedek eski aciklamayi tasir");

    const rehearsal = await patchQuestions(["--rollback", explanationBackupPath], { clientFactory });
    assert.equal(rehearsal.would_restore, 1, "patch: geri alma provasi yazmadan sayar");
    assert.equal(calls.updates.length, 1);
    const restored = await patchQuestions(["--rollback", explanationBackupPath, ...applyFlags], { clientFactory });
    assert.equal(restored.restored, 1);
    assert.equal(table.get("abc12345").explanation_en, explanationBase.explanation_en, "patch: geri alma eski aciklamayi geri yazar");
  }

  // --- import-bank.mjs ------------------------------------------------------------------
  const existingQuestion = {
    id: "11111111", section: "math", domain: "Algebra", skill: "Linear", skill_slug: "linear", difficulty: 1,
    question_type: "mcq", prompt: "p1", choices: { A: "1", B: "2", C: "3", D: "4" }, correct_answer: ["A"],
    figure_path: null, source_file: "Linear 1.pdf", needs_review: false,
  };
  const newQuestion = { ...existingQuestion, id: "22222222", prompt: "p2", figure_path: "figures/22222222.webp" };
  const liveBankRow = bankToRows([existingQuestion])[0];
  // Gecici tmp/sat-bank kopyasi: bank.json + yeni sorunun figuru (OUT_ROOT yerine outRoot ile verilir).
  const outRoot = path.join(dir, "sat-bank");
  const writeBank = (bank) => {
    mkdirSync(path.join(outRoot, "figures"), { recursive: true });
    writeFileSync(path.join(outRoot, "bank.json"), JSON.stringify({ bank, failures: [] }));
    writeFileSync(path.join(outRoot, "figures", "22222222.webp"), Buffer.from("RIFF"));
  };

  assert.deepEqual(planInsert(bankToRows([existingQuestion, newQuestion]), [liveBankRow]), {
    newRows: [bankToRows([newQuestion])[0]],
    conflicts: [],
  }, "planInsert: yalniz canlida olmayan id eklenir");
  assert.equal(planInsert(bankToRows([{ ...existingQuestion, prompt: "changed" }]), [liveBankRow]).conflicts.length, 1, "planInsert: var olan id'de fark catisma sayilir");

  writeBank([existingQuestion, newQuestion]);
  {
    const { calls, clientFactory } = fakeSupabase([liveBankRow]);
    setEnv(LIVE_URL);
    await rejectsBeforeConnecting(importBank(["--apply"], { clientFactory, outRoot }), /requires --project-ref/, calls, "import-bank: --apply, --project-ref yok");
    await rejectsBeforeConnecting(importBank(["--apply", `--project-ref=${OTHER_REF}`], { clientFactory, outRoot }), /is not the live project/, calls, "import-bank: yanlis ref");
    await rejectsBeforeConnecting(importBank(["--force"], { clientFactory, outRoot }), /Unknown argument/, calls, "import-bank: bilinmeyen bayrak");
    setEnv(OTHER_URL);
    await rejectsBeforeConnecting(importBank(["--apply", "--project-ref", LIVE_PROJECT_REF], { clientFactory, outRoot }), /points to project/, calls, "import-bank: dogru ref, yanlis adres");
  }
  {
    const { calls, clientFactory } = fakeSupabase([liveBankRow]);
    setEnv(LIVE_URL);
    const result = await importBank([], { clientFactory, outRoot });
    assert.deepEqual(result, { mode: "dry-run", wouldInsert: 1, skipped: 1, wouldUpload: 1, writes: 0 }, "import-bank: bayraksiz calisma kuru calistirmadir");
    assert.equal(calls.inserts.length + calls.uploads.length, 0, "import-bank: kuru calistirma yazmaz");
    assert.equal(calls.factory.length, 1);
    assert.deepEqual([calls.factory[0].url, calls.factory[0].key], [LIVE_URL, TEST_KEY]);
  }
  {
    const { calls, clientFactory, table } = fakeSupabase([liveBankRow]);
    setEnv(LIVE_URL);
    const result = await importBank(["--apply", "--project-ref", LIVE_PROJECT_REF], { clientFactory, outRoot });
    assert.deepEqual(result, { mode: "apply", inserted: 1, skipped: 1, uploaded: 1, total: 2 }, "import-bank: dogru ref + dogru adres gecer");
    assert.deepEqual(calls.inserts.map((row) => row.id), ["22222222"]);
    assert.deepEqual(calls.uploads, ["22222222.webp"]);
    assert.equal(table.get("11111111").prompt, "p1", "var olan satir degismez");
    assert.deepEqual(calls.inserts[0], bankToRows([newQuestion])[0], "import-bank: aciklamasiz (matematik) kayit eskisi gibi eklenir");
  }
  writeBank([{ ...existingQuestion, prompt: "changed" }, newQuestion]);
  {
    const { calls, clientFactory } = fakeSupabase([liveBankRow]);
    setEnv(LIVE_URL);
    await assert.rejects(importBank(["--apply", "--project-ref", LIVE_PROJECT_REF], { clientFactory, outRoot }), /INSERT-ONLY FAIL/, "import-bank: var olan id farkliysa yazi yok");
    assert.equal(calls.inserts.length, 0);
  }

  // --- Okuma ve Yazma bankasi (plan 2026-10-03): aciklama yalniz yeni satira, karsilastirmaya girmez ---------
  // SAT_BANK_OUT=<klasor> ile ayni yol: <klasor>/bank.json, figur <klasor>/figures/<id>.webp -> depo nesnesi <id>.webp.
  const rwExplanation = "Choice B is the best answer because the text says so.\n\nChoice A is incorrect.";
  const rwNew = {
    id: "33333333", section: "reading-writing", domain: "Craft and Structure", skill: "Words in Context",
    skill_slug: "words-in-context", difficulty: 2, question_type: "mcq", prompt: "A <u>marked</u> text with ______.",
    choices: { A: "a", B: "b", C: "c", D: "d" }, correct_answer: ["B"], figure_path: "figures/33333333.webp",
    explanation_en: rwExplanation, source_file: "Words in Context 2 Answer Key.pdf", needs_review: true,
  };
  const rwExisting = { ...rwNew, id: "44444444", figure_path: null, explanation_en: "Bank explanation, newer than live." };
  const liveRwExisting = { ...bankToRows([rwExisting])[0], explanation_en: "Live explanation." };
  const rwRoot = path.join(dir, "rw");
  mkdirSync(path.join(rwRoot, "figures"), { recursive: true });
  writeFileSync(path.join(rwRoot, "bank.json"), JSON.stringify({ bank: [rwNew, rwExisting], failures: [] }));
  writeFileSync(path.join(rwRoot, "figures", "33333333.webp"), Buffer.from("RIFF"));

  assert.deepEqual(planInsert(bankToRows([rwExisting]), [liveRwExisting]).conflicts, [], "planInsert: aciklama farki catisma sayilmaz");
  {
    const { calls, clientFactory } = fakeSupabase([liveRwExisting]);
    setEnv(LIVE_URL);
    const result = await importBank([], { clientFactory, outRoot: rwRoot });
    assert.deepEqual(result, { mode: "dry-run", wouldInsert: 1, skipped: 1, wouldUpload: 1, writes: 0 }, "import-bank RW: kuru calistirma");
    assert.equal(calls.inserts.length + calls.updates.length + calls.uploads.length, 0);
  }
  {
    const { calls, clientFactory, table } = fakeSupabase([liveRwExisting]);
    setEnv(LIVE_URL);
    const result = await importBank(["--apply", "--project-ref", LIVE_PROJECT_REF], { clientFactory, outRoot: rwRoot });
    assert.deepEqual(result, { mode: "apply", inserted: 1, skipped: 1, uploaded: 1, total: 2 }, "import-bank RW: var olan id catisma degil");
    assert.deepEqual(calls.inserts.map((row) => row.id), ["33333333"], "import-bank RW: yalniz yeni id eklenir");
    assert.equal(calls.updates.length, 0, "import-bank RW: var olan id'ye yazi yok");
    assert.deepEqual(calls.inserts[0], { ...bankToRows([rwNew])[0], explanation_en: rwExplanation }, "import-bank RW: yeni satir aciklamasiyla eklenir");
    assert.equal(calls.inserts[0].figure_path, "33333333.webp");
    assert.deepEqual(calls.uploads, ["33333333.webp"], "import-bank RW: figures/<id>.webp -> <id>.webp");
    assert.equal(table.get("33333333").needs_review, true, "import-bank RW: karantinada eklenir");
    assert.equal(table.get("44444444").explanation_en, "Live explanation.", "import-bank RW: var olan aciklama degismez");
  }

  // --- RW acma paketi (scripts/sat/rw/build-rw-release-package.mjs): salt okuma, yalniz needs_review ---------
  const rwRow = (id, skillSlug, over = {}) => ({
    id, section: "reading-writing", domain: "Craft and Structure", skill: skillSlug, skill_slug: skillSlug, difficulty: 1,
    question_type: "mcq", prompt: `Passage ${id} with <i>a title</i>.`, choices: { A: "a", B: "b", C: "c", D: "d" },
    correct_answer: ["C"], figure_path: null, explanation_en: `Why ${id}.`, source_file: "x.pdf", needs_review: true, ...over,
  });
  const releaseRows = [
    rwRow("a0000001", "words-in-context"),
    rwRow("a0000002", "words-in-context"),
    rwRow("a0000003", "transitions"),
    rwRow("a0000004", "transitions", { needs_review: false }), // zaten acik: pakete girmez
    { ...liveTarget, id: "a0000005", needs_review: true }, // karantinadaki matematik satiri: pakete girmez
  ];
  const releaseDir = path.join(dir, "release");
  const releaseOptions = (clientFactory, now = new Date("2026-10-03T12:00:00.000Z")) => ({ clientFactory, outDir: releaseDir, now });
  {
    const { calls, clientFactory } = fakeSupabase(releaseRows);
    setEnv(LIVE_URL);
    await rejectsBeforeConnecting(buildRwRelease(["--all", "--apply", "--project-ref", LIVE_PROJECT_REF], releaseOptions(clientFactory)), /yazmaz/, calls, "release: --apply reddedilir");
    await rejectsBeforeConnecting(buildRwRelease([], releaseOptions(clientFactory)), /zorunlu/, calls, "release: secim yok");
    await rejectsBeforeConnecting(buildRwRelease(["--all", "--skills", "transitions"], releaseOptions(clientFactory)), /zorunlu/, calls, "release: iki secim birden");
    setEnv(OTHER_URL);
    await rejectsBeforeConnecting(buildRwRelease(["--all"], releaseOptions(clientFactory)), /points to project/, calls, "release: yanlis adrese gitmez");
  }
  {
    // (d) bos secim reddedilir, dosya yazilmaz
    const { clientFactory } = fakeSupabase(releaseRows);
    setEnv(LIVE_URL);
    await assert.rejects(buildRwRelease(["--skills", "no-such-skill"], releaseOptions(clientFactory)), /satiri olmayan beceri: no-such-skill/, "release: karantinasiz beceri");
    await assert.rejects(buildRwRelease(["--skills", "transitions,no-such-skill"], releaseOptions(clientFactory)), /no-such-skill/, "release: bir beceri bossa paket yok");
    assert.ok(!existsSync(releaseDir), "release: reddedilen secimde paket dosyasi olusmaz");
    const { clientFactory: emptyFactory } = fakeSupabase([rwRow("a0000004", "transitions", { needs_review: false }), liveTarget]);
    await assert.rejects(buildRwRelease(["--all"], releaseOptions(emptyFactory)), /bos paket yazilmaz/, "release: karantinada RW yoksa --all reddedilir");
    assert.ok(!existsSync(releaseDir));
  }
  {
    const { clientFactory } = fakeSupabase(releaseRows);
    setEnv(LIVE_URL);
    const all = await buildRwRelease(["--all"], releaseOptions(clientFactory));
    assert.deepEqual([all.packed, all.per_skill], [3, { transitions: 1, "words-in-context": 2 }], "release --all: yalniz karantinadaki RW satirlari");
  }
  {
    // (c) paket yalniz needs_review degistirir, validatePackage ve patch araci kabul eder
    const { calls, clientFactory, table } = fakeSupabase(releaseRows);
    setEnv(LIVE_URL);
    const result = await buildRwRelease(["--skills", "transitions,words-in-context"], releaseOptions(clientFactory));
    assert.deepEqual([result.quarantined_rw, result.packed, result.per_skill], [3, 3, { transitions: 1, "words-in-context": 2 }]);
    assert.equal(calls.inserts.length + calls.updates.length + calls.uploads.length, 0, "release: veritabanina yazmaz");
    const releasePkg = JSON.parse(readFileSync(result.package_path, "utf8"));
    assert.doesNotThrow(() => validatePackage(releasePkg, LIVE_PROJECT_REF), "release: paket gecerli");
    assert.deepEqual(releasePkg.records.map((item) => item.id), ["a0000001", "a0000002", "a0000003"]);
    for (const item of releasePkg.records) {
      const live = table.get(item.id);
      assert.deepEqual(changedFields(item.expected_before, item.after), ["needs_review"], `release ${item.id}: yalniz needs_review`);
      assert.deepEqual(item.after, { prompt: live.prompt, choices: live.choices, needs_review: false });
      assert.deepEqual(rowMatchesExpected(live, item.expected_before), [], `release ${item.id}: beklenen eski deger canliyla ayni`);
    }
    await assert.rejects(buildRwRelease(["--skills", "transitions,words-in-context"], releaseOptions(clientFactory)), /ezilmez/, "release: ayni paket ezilmez");

    const applied = await patchQuestions(
      ["--package", result.package_path, "--apply", "--project-ref", LIVE_PROJECT_REF, "--backup", path.join(dir, "release-backup.json")],
      { clientFactory }
    );
    assert.deepEqual([applied.status, applied.applied, applied.non_targets_unchanged], ["verified", 3, 2], "release: patch araci paketi uygular");
    for (const item of releasePkg.records) {
      assert.deepEqual(table.get(item.id), { ...releaseRows.find((row) => row.id === item.id), needs_review: false }, `release ${item.id}: yalniz needs_review degisti`);
    }
    assert.ok(calls.updates.every((update) => Object.keys(update.payload).sort().join() === "choices,needs_review,prompt"), "release: aciklamaya dokunulmaz");
    await assert.rejects(buildRwRelease(["--all"], releaseOptions(clientFactory, new Date("2026-10-03T13:00:00.000Z"))), /bos paket yazilmaz/, "release: acilanlar yeniden paketlenmez");
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// --- Her iki yazici ortak katmani kullanir (kaynak taramasi) ------------------------------
for (const name of ["scripts/sat/import-bank.mjs", "scripts/sat/patch-sat-questions.mjs"]) {
  const source = readFileSync(path.resolve(process.cwd(), name), "utf8");
  assert.ok(source.includes("createImportClient("), `${name}: istemciyi ortak katmandan kurmali`);
  assert.ok(source.includes("parseImportArgs("), `${name}: argumanlari ortak katmanla ayristirmali`);
  assert.ok(!/\bcreateClient\s*\(/.test(source), `${name}: kendi Supabase istemcisini kurmamali`);
  assert.ok(!/\benv(?:\.|\[)\s*["']?SUPABASE_/.test(source) && !/readFileSync\([^)]*\.env\.local/.test(source), `${name}: anahtari ve .env.local'i dogrudan okumamali`);
  assert.ok(!source.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), `${name}: anon anahtar kullanmamali`);
}

console.log("test-question-patch PASS (paket kurallari + iki SAT yazicisinin hedef kilidi, sahte istemciyle)");
