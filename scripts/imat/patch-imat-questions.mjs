// Mevcut IMAT sorularina denetimli yama: compare-and-swap, satir yedegi ve geri alma (plan 2026-10-08, Gorev 12;
// scripts/sat/patch-sat-questions.mjs kalibi). Var olan bir soruyu degistirmenin tek yolu budur
// (import-bank.mjs insert-only). Yazilan alanlar yalniz prompt/choices/needs_review; correct_answer yalniz korunur.
// Hedef kilidi kabul dosyasi yazicilariyla ayni (scripts/lib/program-details-import.mjs).
//
// Kullanim:
//   node scripts/imat/patch-imat-questions.mjs --package <yol>                                    # kuru calistirma (varsayilan)
//   node scripts/imat/patch-imat-questions.mjs --package <yol> --apply --project-ref kskbnxxyviowmrlskwke [--backup <yol>]
//   node scripts/imat/patch-imat-questions.mjs --rollback <yedek>                                 # geri alma provasi
//   node scripts/imat/patch-imat-questions.mjs --rollback <yedek> --apply --project-ref kskbnxxyviowmrlskwke
//
// Kurallar:
// - Kuru calistirma her hedefin canli degerini paketteki `expected` ile karsilastirir; biri tutmazsa durur.
// - --apply once ayni kontrolu yapar, sonra yazmadan once tam eski satirlari yedege yazar (varsayilan
//   <IMAT_OUT>/backups/<zaman>-before-apply.json; var olan yedek ezilmez). Her kayit icin yazidan hemen once
//   canli satir yeniden okunur ve `expected` ile karsilastirilir; yazi da id + needs_review + correct_answer
//   kosuluyla gider (compare-and-swap). Bir kayit tutmazsa durur ve o ana kadar yazilanlari geri alir.
// - Sonda hedef disi satirlarin ozeti ve toplam sayim degismemis olmali.
// - --rollback yedekteki `before` degerlerini ayni disiplinle geri yazar: canli satir hala `after` ile
//   birebir degilse (sonradan baska degisiklik) o id atlanir, asla ezilmez.
// - --apply yalniz --project-ref canli proje kimligiyle ve .env.local'daki NEXT_PUBLIC_SUPABASE_URL o projeye
//   aitse calisir (assertTarget); kuru calistirma da canli satirlari okudugu icin adres ayni sekilde denetlenir.
// Cikti yalniz kimlik ve sayilardir; soru metni yazdirilmaz.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LIVE_PROJECT_REF, createImportClient, parseImportArgs } from "../lib/program-details-import.mjs";
import {
  GUARD_FIELDS,
  TABLE,
  assertAfterShape,
  changedFields,
  fileStamp,
  hashRows,
  liveReadError,
  rowMatchesExpected,
  sha256,
  validatePackage,
  writePayload,
} from "./lib/question-patch.mjs";
import { BACKUPS_DIR } from "./paths.mjs";

const ALL_COLUMNS =
  "id,year,number,exam_set,section,topic,topic_slug,prompt,choices,correct_answer,figure_path,source_file,source_page,needs_review,created_at";
const PAGE_SIZE = 500;
const BACKUP_KIND = "imat-question-patch-backup";

function parseArgs(argv) {
  const parsed = parseImportArgs(argv, { valueFlags: ["--package", "--rollback", "--backup"] });
  const resolvePath = (flag) => (parsed.values[flag] ? path.resolve(process.cwd(), parsed.values[flag]) : null);
  const options = {
    mode: parsed.mode,
    projectRef: parsed.projectRef,
    package: resolvePath("--package"),
    rollback: resolvePath("--rollback"),
    backup: resolvePath("--backup"),
  };
  if (options.package && options.rollback) throw new Error("--package ile --rollback birlikte kullanilamaz.");
  if (!options.package && !options.rollback) throw new Error("--package <yol> veya --rollback <yedekYolu> zorunlu.");
  if (options.rollback && options.backup) throw new Error("--backup yalniz --package modunda anlamlidir.");
  return options;
}

async function fetchAllRows(client) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client.from(TABLE).select(ALL_COLUMNS).order("id").range(from, from + PAGE_SIZE - 1);
    if (error) throw liveReadError(error);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

async function fetchRow(client, id) {
  const { data, error } = await client.from(TABLE).select(ALL_COLUMNS).eq("id", id);
  if (error) throw liveReadError(error);
  if ((data ?? []).length !== 1) throw new Error(`${TABLE} satiri bulunamadi @${id}.`);
  return data[0];
}

// Kosullu yazi: id + needs_review + correct_answer canlida beklenen degerdeyse yazar; geri okunan satir
// `target` ile birebir olmali. prompt/choices hemen onceki yeniden okumada karsilastirilir.
async function swapRow(client, id, { guard, target }) {
  const { data, error } = await client
    .from(TABLE)
    .update(writePayload(target))
    .eq("id", id)
    .eq("needs_review", guard.needs_review)
    .eq("correct_answer", guard.correct_answer)
    .select(ALL_COLUMNS);
  if (error) return error.message;
  if (data?.length !== 1) return "kosullu yazi satir bulamadi (canli deger degismis)";
  if (changedFields(target, data[0]).length !== 0 || data[0].correct_answer !== guard.correct_answer) {
    return "geri-okuma hedef degerle eslesmedi";
  }
  return null;
}

function readPackage(packagePath) {
  if (!existsSync(packagePath)) throw new Error(`Paket dosyasi yok: ${packagePath}`);
  return JSON.parse(readFileSync(packagePath, "utf8"));
}

function validateBackup(backup) {
  if (backup?.kind !== BACKUP_KIND || backup.schema_version !== 1) throw new Error("Gecersiz yedek kind/schema_version.");
  if (backup.project_ref !== LIVE_PROJECT_REF) throw new Error("Yedek project_ref pinlenen projeyle eslesmiyor.");
  if (backup.table !== TABLE) throw new Error(`Yedek table "${TABLE}" olmali.`);
  if (!Array.isArray(backup.records) || backup.records.length === 0) throw new Error("Yedek records bos olamaz.");
  const ids = new Set();
  for (const record of backup.records) {
    if (typeof record.id !== "string" || !record.id) throw new Error("Yedek kayit id eksik.");
    if (ids.has(record.id)) throw new Error(`Yedekte tekrarli id: ${record.id}`);
    ids.add(record.id);
    for (const field of GUARD_FIELDS) {
      if (!(field in (record.before ?? {}))) throw new Error(`${record.id}: yedek before.${field} eksik.`);
    }
    assertAfterShape(record.id, record.after, "yedek after");
  }
  return backup;
}

// Yalniz yazilabilir alanlari `before`'a geri yazar. Canli satir hala `after` ile birebir degilse
// (eszamanli baska degisiklik) o id atlanir, asla ezilmez.
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
    if (changedFields(record.after, live).length !== 0 || live.correct_answer !== record.before.correct_answer) {
      skipped.push({ id, reason: "canli satir artik after ile esit degil; eszamanli degisiklik ezilmedi" });
      continue;
    }
    if (!write) {
      restored.push(id);
      continue;
    }
    const problem = await swapRow(client, id, {
      guard: { needs_review: record.after.needs_review, correct_answer: record.before.correct_answer },
      target: record.before,
    });
    if (problem) failed.push({ id, reason: problem });
    else restored.push(id);
  }
  return { restored, skipped, failed };
}

async function dryRun(client, pkg) {
  const ids = validatePackage(pkg, LIVE_PROJECT_REF);
  const allRows = await fetchAllRows(client);
  const byId = new Map(allRows.map((row) => [row.id, row]));
  const mismatches = [];
  for (const entry of pkg.items) {
    const live = byId.get(entry.id);
    if (!live) {
      mismatches.push({ id: entry.id, fields: ["<satir yok>"] });
      continue;
    }
    const bad = rowMatchesExpected(live, entry.expected);
    if (bad.length) mismatches.push({ id: entry.id, fields: bad });
  }
  if (mismatches.length) {
    throw new Error(`Dry-run FAIL: ${mismatches.length} hedef beklenen eski degerle eslesmiyor: ${JSON.stringify(mismatches.slice(0, 10))}`);
  }
  const nonTargets = allRows.filter((row) => !ids.has(row.id));
  return {
    byId,
    nonTargetHash: hashRows(nonTargets),
    totalCount: allRows.length,
    summary: {
      mode: "dry-run",
      status: "ready",
      project_ref: LIVE_PROJECT_REF,
      package_sha256: sha256(JSON.stringify(pkg)),
      targets: pkg.items.length,
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
    kind: BACKUP_KIND,
    project_ref: LIVE_PROJECT_REF,
    table: TABLE,
    package_sha256: sha256(JSON.stringify(pkg)),
    created_at: new Date().toISOString(),
    non_target_hash: pre.nonTargetHash,
    total_count: pre.totalCount,
    records: pkg.items.map((entry) => ({ id: entry.id, before: pre.byId.get(entry.id), after: entry.after })),
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2) + "\n", { encoding: "utf8", flag: "wx", mode: 0o600 });
  const backupHash = sha256(readFileSync(backupPath));

  const applied = [];
  for (const entry of pkg.items) {
    // Kayit basina compare-and-swap: yazidan hemen once yeniden oku, sonra kosullu yaz.
    let problem = null;
    try {
      const bad = rowMatchesExpected(await fetchRow(client, entry.id), entry.expected);
      if (bad.length) problem = `canli deger yazidan once degismis (${bad.join(", ")})`;
    } catch (error) {
      problem = error.message ?? String(error);
    }
    if (!problem) problem = await swapRow(client, entry.id, { guard: entry.expected, target: entry.after });
    if (problem) {
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
      throw new Error(`Apply FAIL @${entry.id}: ${problem}; ${undoNote}. Yedek: ${backupPath}`);
    }
    applied.push(entry.id);
  }

  const post = await fetchAllRows(client);
  const targetIds = new Set(pkg.items.map((entry) => entry.id));
  const postNonTargets = post.filter((row) => !targetIds.has(row.id));
  if (post.length !== pre.totalCount || hashRows(postNonTargets) !== pre.nonTargetHash) {
    throw new Error(`Post-verify FAIL: hedef disi satirlar veya toplam sayim degisti. Yedek: ${backupPath}. ELLE INCELEME GEREKLI, otomatik geri alma YAPILMADI.`);
  }
  return {
    mode: "apply",
    status: "verified",
    project_ref: LIVE_PROJECT_REF,
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
    project_ref: LIVE_PROJECT_REF,
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

// clientFactory, backupsDir ve now yalniz cevrimdisi testler icindir (sahte istemci, gecici klasor).
export async function main(argv = process.argv.slice(2), { clientFactory, backupsDir = BACKUPS_DIR, now = new Date() } = {}) {
  const options = parseArgs(argv);
  // Kuru calistirma da canli satirlari okur: --project-ref verilmese bile adres canli projeye ait olmali.
  const projectRef = options.mode === "apply" ? options.projectRef : (options.projectRef ?? LIVE_PROJECT_REF);
  const client = createImportClient({ mode: options.mode, projectRef, clientFactory });
  const shouldApply = options.mode === "apply";
  if (options.rollback) return rollback(client, options.rollback, shouldApply);
  const pkg = readPackage(options.package);
  if (!shouldApply) return (await dryRun(client, pkg)).summary;
  return apply(client, pkg, options.backup ?? path.join(backupsDir, `${fileStamp(now)}-before-apply.json`));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(`IMAT soru yamasi basarisiz: ${error.message ?? error}`);
      process.exitCode = 1;
    });
}
