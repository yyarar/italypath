import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { EXPECTED_PROJECT_REF, EXPECTED_PROJECT_URL, hashRows, sha256 } from "./lib/authored-explanations-import.mjs";
import {
  GUARD_FIELDS,
  WRITABLE_FIELDS,
  changedFields,
  normalizeChoices,
  rowMatchesExpected,
  validatePackage,
} from "./lib/question-patch.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const BACKUP_ROOT = path.join(REPO_ROOT, "tmp/sat-bank/remediation/backups");
const ALL_COLUMNS =
  "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,explanation_tr,explanation_en,source_file,needs_review,created_at";
const PAGE_SIZE = 500;

// CLI: node scripts/sat/patch-sat-questions.mjs --package <path> [--apply] [--backup <path>]
//      node scripts/sat/patch-sat-questions.mjs --rollback <backupPath> [--apply]
// Varsayilan mod her zaman dry-run'dir; --apply olmadan hicbir yazi olmaz.

function parseArgs(argv) {
  const options = { package: null, apply: false, rollback: null, backup: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--package" && argv[index + 1]) options.package = path.resolve(process.cwd(), argv[++index]);
    else if (arg === "--rollback" && argv[index + 1]) options.rollback = path.resolve(process.cwd(), argv[++index]);
    else if (arg === "--backup" && argv[index + 1]) options.backup = path.resolve(process.cwd(), argv[++index]);
    else throw new Error(`Bilinmeyen veya eksik arguman: ${arg}`);
  }
  if (options.package && options.rollback) throw new Error("--package ile --rollback birlikte kullanilamaz.");
  if (!options.package && !options.rollback) throw new Error("--package <yol> veya --rollback <yedekYolu> zorunlu.");
  if (options.rollback && options.backup) throw new Error("--backup yalniz --package modunda anlamlidir.");
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

function createServiceClient() {
  const env = { ...loadEnvLocal(), ...process.env };
  if (env.NEXT_PUBLIC_SUPABASE_URL !== EXPECTED_PROJECT_URL) {
    throw new Error("Beklenmeyen Supabase projesi; islem reddedildi.");
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY gerekli (yalniz script tarafi).");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchAllRows(client) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("sat_questions")
      .select(ALL_COLUMNS)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`sat_questions fetch hatasi: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

async function fetchRow(client, id) {
  const { data, error } = await client.from("sat_questions").select(ALL_COLUMNS).eq("id", id);
  if (error) throw new Error(`sat_questions okuma hatasi @${id}: ${error.message}`);
  if ((data ?? []).length !== 1) throw new Error(`sat_questions satiri bulunamadi @${id}.`);
  return data[0];
}

function readPackage(packagePath) {
  if (!existsSync(packagePath)) throw new Error(`Paket dosyasi yok: ${packagePath}`);
  return JSON.parse(readFileSync(packagePath, "utf8"));
}

function resolveBackupPath(options, pkg) {
  if (options.backup) return options.backup;
  const slug = pkg.run_label.replace(/[^A-Za-z0-9._-]/g, "-");
  return path.join(BACKUP_ROOT, `${slug}-before-apply.json`);
}

function validateBackup(backup) {
  if (backup?.kind !== "sat-question-patch-backup" || backup.schema_version !== 1) {
    throw new Error("Gecersiz yedek kind/schema_version.");
  }
  if (backup.project_ref !== EXPECTED_PROJECT_REF) throw new Error("Yedek project_ref pinlenen projeyle eslesmiyor.");
  if (!Array.isArray(backup.records) || backup.records.length === 0) throw new Error("Yedek records bos olamaz.");
  const ids = new Set();
  for (const record of backup.records) {
    if (typeof record.id !== "string" || !record.id) throw new Error("Yedek kayit id eksik.");
    if (ids.has(record.id)) throw new Error(`Yedekte tekrarli id: ${record.id}`);
    ids.add(record.id);
    for (const field of GUARD_FIELDS) {
      if (!(field in (record.before ?? {}))) throw new Error(`${record.id}: yedek before.${field} eksik.`);
    }
    const afterKeys = Object.keys(record.after ?? {}).sort();
    if (afterKeys.join(",") !== [...WRITABLE_FIELDS].sort().join(",")) {
      throw new Error(`${record.id}: yedek after tam olarak ${WRITABLE_FIELDS.join("/")} tasimali.`);
    }
  }
  return backup;
}

// Yalniz WRITABLE_FIELDS geri yazar. Canli satir hala `after` ile birebir esit
// degilse (eszamanli baska degisiklik) o id atlanir, asla ezilmez.
async function conditionalRollback(client, backup, ids, { write }) {
  const byId = new Map(backup.records.map((record) => [record.id, record]));
  const restored = [];
  const skipped = [];
  const failed = [];
  for (const id of ids) {
    const record = byId.get(id);
    if (!record) {
      failed.push({ id, reason: "yedekte kayit yok" });
      continue;
    }
    let live;
    try {
      live = await fetchRow(client, id);
    } catch (error) {
      failed.push({ id, reason: error.message ?? String(error) });
      continue;
    }
    if (changedFields(record.after, live).length !== 0) {
      skipped.push({ id, reason: "canli satir artik after ile esit degil; eszamanli degisiklik ezilmedi" });
      continue;
    }
    if (!write) {
      restored.push(id);
      continue;
    }
    const payload = {
      prompt: record.before.prompt,
      choices: normalizeChoices(record.before.choices),
      needs_review: record.before.needs_review,
    };
    const { data, error } = await client.from("sat_questions").update(payload).eq("id", id).select(ALL_COLUMNS);
    const ok =
      !error &&
      data?.length === 1 &&
      changedFields(record.before, data[0]).length === 0 &&
      JSON.stringify(data[0].correct_answer) === JSON.stringify(record.before.correct_answer);
    if (!ok) failed.push({ id, reason: error?.message ?? "geri-okuma before ile eslesmedi" });
    else restored.push(id);
  }
  return { restored, skipped, failed };
}

async function dryRun(client, pkg) {
  const ids = validatePackage(pkg, EXPECTED_PROJECT_REF);
  const allRows = await fetchAllRows(client);
  const byId = new Map(allRows.map((row) => [row.id, row]));
  const mismatches = [];
  for (const record of pkg.records) {
    const live = byId.get(record.id);
    if (!live) {
      mismatches.push({ id: record.id, fields: ["<satir yok>"] });
      continue;
    }
    const bad = rowMatchesExpected(live, record.expected_before);
    if (bad.length) mismatches.push({ id: record.id, fields: bad });
  }
  if (mismatches.length) {
    throw new Error(
      `Dry-run FAIL: ${mismatches.length} hedef beklenen eski degerle eslesmiyor: ${JSON.stringify(mismatches.slice(0, 10))}`
    );
  }
  const nonTargets = allRows.filter((row) => !ids.has(row.id));
  return {
    allRows,
    byId,
    nonTargetHash: hashRows(nonTargets),
    totalCount: allRows.length,
    summary: {
      mode: "dry-run",
      status: "ready",
      project_ref: EXPECTED_PROJECT_REF,
      run_label: pkg.run_label,
      package_sha256: sha256(JSON.stringify(pkg)),
      targets: pkg.records.length,
      non_targets: nonTargets.length,
      total: allRows.length,
      writes: 0,
    },
  };
}

async function apply(client, pkg, backupPath) {
  const pre = await dryRun(client, pkg);
  if (existsSync(backupPath)) throw new Error(`Mevcut yedek ezilmez: ${backupPath}`);
  mkdirSync(path.dirname(backupPath), { recursive: true });
  const backup = {
    schema_version: 1,
    kind: "sat-question-patch-backup",
    project_ref: EXPECTED_PROJECT_REF,
    run_label: pkg.run_label,
    package_sha256: sha256(JSON.stringify(pkg)),
    created_at: new Date().toISOString(),
    non_target_hash: pre.nonTargetHash,
    total_count: pre.totalCount,
    records: pkg.records.map((r) => ({ id: r.id, before: pre.byId.get(r.id), after: r.after })),
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2) + "\n", { encoding: "utf8", flag: "wx", mode: 0o600 });
  const backupHash = sha256(readFileSync(backupPath));

  const applied = [];
  for (const record of pkg.records) {
    const payload = {
      prompt: record.after.prompt,
      choices: normalizeChoices(record.after.choices),
      needs_review: record.after.needs_review,
    };
    const { data, error } = await client.from("sat_questions").update(payload).eq("id", record.id).select(ALL_COLUMNS);
    const ok =
      !error &&
      data?.length === 1 &&
      changedFields(record.after, {
        prompt: data[0].prompt,
        choices: data[0].choices,
        needs_review: data[0].needs_review,
      }).length === 0 &&
      JSON.stringify(data[0].correct_answer) === JSON.stringify(record.expected_before.correct_answer);
    if (!ok) {
      let undo = null;
      let undoError = null;
      try {
        undo = await conditionalRollback(client, backup, applied, { write: true });
      } catch (rollbackError) {
        undoError = rollbackError.message ?? String(rollbackError);
      }
      const undoNote = undo
        ? `onceki ${applied.length} kayittan ${undo.restored.length} geri alindi, ${undo.skipped.length} atlandi, ${undo.failed.length} basarisiz`
        : `geri alma calistirilamadi (${undoError})`;
      throw new Error(
        `Apply FAIL @${record.id}: ${error?.message ?? "geri-okuma after ile eslesmedi"}; ${undoNote}. Yedek: ${backupPath}`
      );
    }
    applied.push(record.id);
  }

  const post = await fetchAllRows(client);
  const postIds = new Set(pkg.records.map((r) => r.id));
  const postNonTargets = post.filter((row) => !postIds.has(row.id));
  if (post.length !== pre.totalCount || hashRows(postNonTargets) !== pre.nonTargetHash) {
    throw new Error(
      `Post-verify FAIL: non-target veya toplam sayim degisti. Yedek: ${backupPath}. ELLE INCELEME GEREKLI, otomatik rollback YAPILMADI.`
    );
  }
  return {
    mode: "apply",
    status: "verified",
    project_ref: EXPECTED_PROJECT_REF,
    run_label: pkg.run_label,
    applied: applied.length,
    non_targets_unchanged: postNonTargets.length,
    total: post.length,
    backup_path: backupPath,
    backup_sha256: backupHash,
  };
}

async function rollback(client, backupPath, shouldApply) {
  if (!existsSync(backupPath)) throw new Error(`Yedek dosyasi yok: ${backupPath}`);
  const backupBytes = readFileSync(backupPath);
  const backup = validateBackup(JSON.parse(backupBytes));
  const ids = backup.records.map((record) => record.id);
  const backupIds = new Set(ids);
  const allRows = await fetchAllRows(client);
  const nonTargetHash = hashRows(allRows.filter((row) => !backupIds.has(row.id)));
  const result = await conditionalRollback(client, backup, ids, { write: shouldApply });
  return {
    mode: shouldApply ? "rollback" : "rollback-dry-run",
    status: result.failed.length ? "failed" : "verified",
    project_ref: EXPECTED_PROJECT_REF,
    run_label: backup.run_label,
    backup_path: backupPath,
    backup_sha256: sha256(backupBytes),
    total: allRows.length,
    total_matches_backup: allRows.length === backup.total_count,
    non_target_hash_matches_backup: nonTargetHash === backup.non_target_hash,
    [shouldApply ? "restored" : "would_restore"]: result.restored.length,
    skipped: result.skipped,
    failed: result.failed,
    writes: shouldApply ? result.restored.length : 0,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const client = createServiceClient();
  if (options.rollback) return rollback(client, options.rollback, options.apply);
  const pkg = readPackage(options.package);
  if (!options.apply) return (await dryRun(client, pkg)).summary;
  return apply(client, pkg, resolveBackupPath(options, pkg));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(`SAT soru patch islemi basarisiz: ${error.message ?? error}`);
      process.exitCode = 1;
    });
}
