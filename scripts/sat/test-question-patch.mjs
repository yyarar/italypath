// SAT yazicilarinin cevrimdisi testi: paket kurallari (lib/question-patch.mjs) ve iki yazicinin
// (import-bank.mjs, patch-sat-questions.mjs) kabul dosyasi yazicilariyla ortak hedef kilidi
// (STATUS #65, 2026-09-26). Veritabanina baglanmaz: Supabase istemcisi sahte, girdiler gecici klasorde.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { LIVE_PROJECT_REF } from "../lib/program-details-import.mjs";
import { bankToRows, main as importBank, planInsert } from "./import-bank.mjs";
import { changedFields, normalizeChoices, rowMatchesExpected, validatePackage } from "./lib/question-patch.mjs";
import { main as patchQuestions } from "./patch-sat-questions.mjs";

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
          const query = {
            order: () => query,
            range: (from, to) => Promise.resolve({ data: sorted().slice(from, to + 1), error: null }),
            eq: (column, value) => Promise.resolve({ data: sorted().filter((row) => row[column] === value), error: null }),
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
  }
  writeBank([{ ...existingQuestion, prompt: "changed" }, newQuestion]);
  {
    const { calls, clientFactory } = fakeSupabase([liveBankRow]);
    setEnv(LIVE_URL);
    await assert.rejects(importBank(["--apply", "--project-ref", LIVE_PROJECT_REF], { clientFactory, outRoot }), /INSERT-ONLY FAIL/, "import-bank: var olan id farkliysa yazi yok");
    assert.equal(calls.inserts.length, 0);
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
