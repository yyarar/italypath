// SAT aciklama yazicilarinin (import-explanations.mjs, import-authored-explanations.mjs) kabul
// dosyasi yazicilariyla ortak hedef kilidinin cevrimdisi testi (STATUS #92, 2026-09-26). Veritabanina
// baglanmaz ve gercek arastirma paketlerine (tmp/sat-bank/...) bagimli degildir: her iki betik icin
// de kucuk, sentetik ama gecerli bir paket (SHA256SUMS dahil) ve sahte bir Supabase istemcisi
// (bellek-ici tablo) burada uretilir. Uc durum kanitlanir: --apply icin --project-ref zorunlulugu,
// yanlis --project-ref reddi, dogru ref + dogru adres ile yazma.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { LIVE_PROJECT_REF } from "../lib/program-details-import.mjs";
import { main as importExplanations } from "./import-explanations.mjs";
import { main as importAuthoredExplanations } from "./import-authored-explanations.mjs";
import { EXPECTED_AUTHORED_COUNT, EXPECTED_QUESTION_COUNT, sha256 } from "./lib/authored-explanations-import.mjs";

const EXPLANATIONS_COUNT = 806; // import-explanations.mjs'teki sabit hedef sayisi (bkz. readCanonical)
const LIVE_URL = `https://${LIVE_PROJECT_REF}.supabase.co`;
const OTHER_REF = "abcdefghijabcdefghij";
const OTHER_URL = `https://${OTHER_REF}.supabase.co`;
const TEST_KEY = "sb_secret_test_only";

function setEnv(url) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.SUPABASE_SECRET_KEY = TEST_KEY;
}

function writeJsonFile(filePath, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(filePath, content);
  return content;
}

// import-authored-explanations.mjs icin kucuk, gecerli, checksum'li bir 213-kayit paketi uretir
// (gercek arastirma paketine ihtiyac duymadan; lib/authored-explanations-import.mjs'in
// validatePackage/verifyChecksums kurallarini karsilar).
function buildAuthoredPackage(dir, count = EXPECTED_AUTHORED_COUNT) {
  mkdirSync(dir, { recursive: true });
  const records = Array.from({ length: count }, (_, index) => ({
    id: `auth-${String(index).padStart(4, "0")}`,
    explanation_en: `Synthetic authored explanation number ${index} for offline testing purposes only.`,
    needs_review: false,
    review_note: null,
  }));
  const targetIds = records.map((record) => record.id);
  const files = {
    "explanations-en.json": records,
    "target-ids.json": targetIds,
    "qa-report.json": {
      status: "passed",
      record_count: count,
      unique_id_count: count,
      open_review_count: 0,
      computed_answer_mismatch_count: 0,
      checks: { ok: true },
    },
    "run-manifest.json": {
      status: "ready_for_import",
      provenance: "italypath-authored-from-formatted-answer-key",
      target_count: count,
    },
  };
  const sumLines = [];
  for (const [filename, value] of Object.entries(files)) {
    const content = writeJsonFile(path.join(dir, filename), value);
    sumLines.push(`${sha256(content)}  ${filename}`);
  }
  writeFileSync(path.join(dir, "SHA256SUMS"), `${sumLines.join("\n")}\n`);
  return { inputPath: path.join(dir, "explanations-en.json"), targetIds, records };
}

// import-explanations.mjs icin kucuk, gecerli, checksum'li bir 806-kayit paketi uretir (gap-report
// sayilari betikteki sabit 213/20 degerleriyle eslesir; gercek arastirma paketine ihtiyac yoktur).
function buildExplanationsPackage(dir, count = EXPLANATIONS_COUNT) {
  mkdirSync(dir, { recursive: true });
  const records = Array.from({ length: count }, (_, index) => ({
    id: `expl-${String(index).padStart(4, "0")}`,
    explanation_en: `Synthetic explanation number ${index} for offline testing purposes only.`,
    needs_review: false,
    review_note: null,
  }));
  const targetIds = records.map((record) => record.id);
  const files = {
    "explanations-en.json": records,
    "target-ids.json": targetIds,
    "qa-report.json": { status: "passed", failures: [], open_needs_review_count: 0, effective_approved_count: count },
    "gap-report.json": {
      bank_without_official_rationale: { count: 213 },
      excluded_area_and_volume_1: { count: 20 },
    },
  };
  const sumLines = [];
  for (const [filename, value] of Object.entries(files)) {
    const content = writeJsonFile(path.join(dir, filename), value);
    sumLines.push(`${sha256(content)}  ${filename}`);
  }
  writeFileSync(path.join(dir, "SHA256SUMS"), `${sumLines.join("\n")}\n`);
  return { inputPath: path.join(dir, "explanations-en.json"), targetIds, records };
}

// Genel amacli bellek-ici Supabase sahtesi: from(table).select/update/eq/is/order/range zincirini
// destekler ve `await`lenebilir (thenable) doner. Her iki yazici da bu zincirle calisir.
function createFakeDb({ questions, attempts = [] }) {
  const tables = { sat_questions: questions, sat_attempts: attempts };
  const calls = { updates: [], factory: [] };

  function makeQuery(table) {
    const state = { table, columns: "*", filters: [], from: 0, to: Number.MAX_SAFE_INTEGER, mode: "select", payload: null };
    const query = {
      select(columns) {
        state.columns = columns;
        return query;
      },
      update(payload) {
        state.mode = "update";
        state.payload = payload;
        return query;
      },
      eq(column, value) {
        state.filters.push((row) => row[column] === value);
        return query;
      },
      is(column, value) {
        state.filters.push((row) => row[column] === value);
        return query;
      },
      order() {
        return query;
      },
      range(from, to) {
        state.from = from;
        state.to = to;
        return query;
      },
      then(resolve) {
        let rows = tables[state.table].filter((row) => state.filters.every((filter) => filter(row)));
        if (state.mode === "update") {
          calls.updates.push({ table: state.table, payload: { ...state.payload }, matched: rows.map((row) => row.id) });
          for (const row of rows) Object.assign(row, state.payload);
        }
        rows = rows
          .sort((left, right) => String(left.id).localeCompare(String(right.id)))
          .slice(state.from, state.to + 1)
          .map((row) => {
            const columns = state.columns.split(",").map((column) => column.trim());
            return Object.fromEntries(columns.map((column) => [column, row[column] ?? null]));
          });
        resolve({ data: rows, error: null });
      },
    };
    return query;
  }

  const client = { from: (table) => makeQuery(table) };
  // createImportClient'in cagirdigi fabrika: gercek @supabase/supabase-js yerine bu sahte istemci.
  const clientFactory = (url, key, options) => {
    calls.factory.push({ url, key, options });
    return client;
  };
  return { client, calls, clientFactory, tables };
}

// targetIds null explanation_en ile, geri kalani (idPrefix ile) dolu ve needs_review:false ile
// doldurulmus toplam totalCount satirlik canli sat_questions fikstürü.
function makeQuestionsFixture(targetIds, totalCount, idPrefix) {
  const targets = targetIds.map((id) => ({ id, explanation_en: null, needs_review: false }));
  const fillerCount = totalCount - targetIds.length;
  const fillers = Array.from({ length: fillerCount }, (_, index) => ({
    id: `${idPrefix}${String(index).padStart(4, "0")}`,
    explanation_en: `Existing explanation ${index}.`,
    needs_review: false,
  }));
  return [...targets, ...fillers];
}

async function rejectsBeforeConnecting(promise, pattern, calls, label) {
  await assert.rejects(promise, pattern, label);
  assert.equal(calls.factory.length, 0, `${label}: istemci hic kurulmamali`);
}

const dir = mkdtempSync(path.join(tmpdir(), "sat-explanations-writer-lock-"));

// --- import-authored-explanations.mjs (213 kayit, sentetik paket) -------------------------------
{
  const { inputPath, targetIds } = buildAuthoredPackage(path.join(dir, "authored-package"));
  const questions = makeQuestionsFixture(targetIds, EXPECTED_QUESTION_COUNT, "official-");
  const authoredArgs = (...extra) => ["--input", inputPath, ...extra];

  {
    const { calls, clientFactory } = createFakeDb({ questions: structuredClone(questions), attempts: [] });
    setEnv(LIVE_URL);
    await rejectsBeforeConnecting(
      importAuthoredExplanations(authoredArgs("--apply"), { clientFactory }),
      /requires --project-ref/,
      calls,
      "authored: --apply, --project-ref yok"
    );
    await rejectsBeforeConnecting(
      importAuthoredExplanations(authoredArgs("--apply", "--project-ref", OTHER_REF), { clientFactory }),
      /is not the live project/,
      calls,
      "authored: yanlis ref"
    );
    setEnv(OTHER_URL);
    await rejectsBeforeConnecting(
      importAuthoredExplanations(authoredArgs("--apply", "--project-ref", LIVE_PROJECT_REF), { clientFactory }),
      /points to project/,
      calls,
      "authored: dogru ref, yanlis adres"
    );
    await rejectsBeforeConnecting(
      importAuthoredExplanations(authoredArgs(), { clientFactory }),
      /points to project/,
      calls,
      "authored: kuru calistirma da yanlis adrese gitmez"
    );
  }
  {
    const liveQuestions = structuredClone(questions);
    const { calls, clientFactory } = createFakeDb({ questions: liveQuestions, attempts: [] });
    setEnv(LIVE_URL);
    const backupPath = path.join(dir, "authored-backup.json");
    const result = await importAuthoredExplanations(
      authoredArgs("--apply", "--project-ref", LIVE_PROJECT_REF, "--backup", backupPath),
      { clientFactory }
    );
    assert.equal(result.mode, "apply", "authored: dogru ref + dogru adres gecer");
    assert.equal(result.status, "verified");
    assert.equal(result.changed, targetIds.length);
    assert.equal(result.exact_matches, targetIds.length);
    assert.equal(result.official_non_targets_unchanged, EXPECTED_QUESTION_COUNT - targetIds.length);
    assert.equal(calls.updates.length, targetIds.length, "authored: her hedef icin tek update");
    assert.equal(calls.factory.length, 1);
    assert.deepEqual([calls.factory[0].url, calls.factory[0].key], [LIVE_URL, TEST_KEY]);
    assert.ok(existsSync(backupPath), "authored: yazmadan once yedek dosyasi olusur");
    assert.equal(liveQuestions.find((row) => row.id === targetIds[0]).explanation_en !== null, true, "authored: hedef satir artik dolu");
    assert.equal(
      liveQuestions.filter((row) => row.id.startsWith("official-") && row.explanation_en === null).length,
      0,
      "authored: hedef disi satirlar dokunulmadan kalir"
    );
  }
}

// --- import-explanations.mjs (806 kayit, sentetik paket) ----------------------------------------
{
  const { inputPath, targetIds } = buildExplanationsPackage(path.join(dir, "explanations-package"));
  const questions = makeQuestionsFixture(targetIds, EXPECTED_QUESTION_COUNT, "filler-");
  const backupDir = path.join(dir, "explanations-backups");
  const explanationsArgs = (...extra) => ["--input", inputPath, "--backup-dir", backupDir, ...extra];

  {
    const { calls, clientFactory } = createFakeDb({ questions: structuredClone(questions), attempts: [] });
    setEnv(LIVE_URL);
    await rejectsBeforeConnecting(
      importExplanations(explanationsArgs("--apply"), { clientFactory }),
      /requires --project-ref/,
      calls,
      "explanations: --apply, --project-ref yok"
    );
    await rejectsBeforeConnecting(
      importExplanations(explanationsArgs("--apply", "--project-ref", OTHER_REF), { clientFactory }),
      /is not the live project/,
      calls,
      "explanations: yanlis ref"
    );
    setEnv(OTHER_URL);
    await rejectsBeforeConnecting(
      importExplanations(explanationsArgs("--apply", "--project-ref", LIVE_PROJECT_REF), { clientFactory }),
      /points to project/,
      calls,
      "explanations: dogru ref, yanlis adres"
    );
    await rejectsBeforeConnecting(
      importExplanations(explanationsArgs(), { clientFactory }),
      /points to project/,
      calls,
      "explanations: kuru calistirma da yanlis adrese gitmez"
    );
  }
  {
    const liveQuestions = structuredClone(questions);
    const { calls, clientFactory } = createFakeDb({ questions: liveQuestions, attempts: [] });
    setEnv(LIVE_URL);
    const result = await importExplanations(explanationsArgs("--apply", "--project-ref", LIVE_PROJECT_REF), { clientFactory });
    assert.equal(result.mode, "apply", "explanations: dogru ref + dogru adres gecer");
    assert.equal(result.status, "verified");
    assert.equal(result.changed, targetIds.length);
    assert.equal(result.exact_matches, targetIds.length);
    assert.equal(calls.updates.length, targetIds.length, "explanations: her hedef icin tek update");
    assert.equal(calls.factory.length, 1);
    assert.deepEqual([calls.factory[0].url, calls.factory[0].key], [LIVE_URL, TEST_KEY]);
    assert.ok(existsSync(result.backup_path), "explanations: yazmadan once yedek dosyasi olusur");
    assert.equal(
      liveQuestions.filter((row) => row.id.startsWith("filler-") && row.explanation_en === null).length,
      0,
      "explanations: hedef disi satirlar dokunulmadan kalir"
    );
  }
}

// --- Her iki yazici da ortak katmani kullanir (kaynak taramasi) ---------------------------------
for (const name of ["scripts/sat/import-explanations.mjs", "scripts/sat/import-authored-explanations.mjs"]) {
  const source = readFileSync(path.resolve(process.cwd(), name), "utf8");
  assert.ok(source.includes("createImportClient("), `${name}: istemciyi ortak katmandan kurmali`);
  assert.ok(source.includes("parseImportArgs("), `${name}: argumanlari ortak katmanla ayristirmali`);
  assert.ok(!/\bcreateClient\s*\(/.test(source), `${name}: kendi Supabase istemcisini kurmamali`);
  assert.ok(
    !/\benv(?:\.|\[)\s*["']?SUPABASE_/.test(source) && !/readFileSync\([^)]*\.env\.local/.test(source),
    `${name}: anahtari ve .env.local'i dogrudan okumamali`
  );
  assert.ok(!source.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), `${name}: anon anahtar kullanmamali`);
}

console.log("test-explanations-writer-lock PASS (iki SAT aciklama yazicisinin hedef kilidi, sentetik paket + sahte istemciyle)");
