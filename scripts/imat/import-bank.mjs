// IMAT soru bankasi importu: INSERT-ONLY (plan 2026-10-08, Gorev 12; scripts/sat/import-bank.mjs kalibi).
// Kabul dosyasi yazicilariyla ayni hedef kilidi (scripts/lib/program-details-import.mjs).
//
// Kullanim:
//   IMAT_OUT=<klasor> node scripts/imat/import-bank.mjs [--years 2023,2024]               # kuru calistirma (varsayilan): yazmaz
//   IMAT_OUT=<klasor> node scripts/imat/import-bank.mjs --apply --project-ref kskbnxxyviowmrlskwke [--years ...]
//
// Sozlesme:
// - Var olan id asla ezilmez: canlidaki satir yerel kayittan herhangi bir kolonda farkliysa INSERT-ONLY FAIL,
//   hicbir satir ve gorsel yazilmaz. Var olan sorular yalniz scripts/imat/patch-imat-questions.mjs ile degisir.
// - Girdi <IMAT_OUT>/bank.json (validate-bank temiz: failures bos); her kayit karantinada (needs_review true).
// - Gorseller yalniz eklenecek (yeni) satirlar icin yuklenir (SAT ile ayni): <IMAT_OUT>/figures/<yil>/<id>.webp ->
//   imat-figures bucket'inda <yil>/<id>.webp; ezme yok (upsert: false), depoda zaten olan dosya atlanir ve raporlanir.
//   Atlanan (canlida zaten olan) satirlarin gorsellerine dokunulmaz, yalniz sayilir. Bucket ve tablo
//   supabase/imat_bank.sql ile kurulur.
// - Kuru calistirma canli id'leri ve depo listesini okur, "N yeni / M atlanan / K gorsel" yazar, yazmaz. Adres
//   kuru calistirmada da canli projeye ait olmali. --apply yalniz --project-ref canli proje kimligiyle ve
//   .env.local'daki NEXT_PUBLIC_SUPABASE_URL o projeye aitse calisir (assertTarget); ayrica IMAT_OUT acikca
//   verilmeli (worktree'nin kendi tmp/ klasorundeki bayat bir kopya yazilmasin).
// Cikti yalniz kimlik ve sayilardir; soru metni yazdirilmaz.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LIVE_PROJECT_REF, createImportClient, parseImportArgs } from "../lib/program-details-import.mjs";
import { FIGURE_BUCKET, TABLE, liveReadError, normalizeChoices } from "./lib/question-patch.mjs";
import { IMAT_OUT, parseYears, readJson } from "./paths.mjs";

const COMPARE_COLUMNS =
  "id,year,number,exam_set,section,topic,topic_slug,prompt,choices,correct_answer,figure_path,source_file,source_page,needs_review";
const PAGE_SIZE = 500;
const FIGURE_MAX_BYTES = 524288;

// bank.json kaydi -> tablo satiri (shuffle ve text_hash tabloya gitmez).
export function bankToRows(bank) {
  return bank.map((q) => {
    const figurePath = q.figure_path ? `${q.year}/${q.id}.webp` : null;
    if (q.figure_path && q.figure_path !== figurePath) {
      throw new Error(`${q.id}: figure_path "${q.figure_path}" beklenen "${figurePath}" degil.`);
    }
    return {
      id: q.id,
      year: q.year,
      number: q.number,
      exam_set: q.exam_set,
      section: q.section,
      topic: q.topic,
      topic_slug: q.topic_slug,
      prompt: q.prompt,
      choices: normalizeChoices(q.choices, `${q.id}: choices`),
      correct_answer: q.correct_answer,
      figure_path: figurePath,
      source_file: q.source_file,
      source_page: q.source_page ?? null,
      needs_review: Boolean(q.needs_review),
    };
  });
}

// Insert-only plan: canlida olmayan id eklenir; var olan id'de herhangi bir kolon farkliysa catisma (yazi yok).
// Yalniz yerel satirin kolonlari karsilastirilir (created_at gibi sunucu kolonlari girmez).
export function planInsert(rows, liveRows) {
  const liveById = new Map(liveRows.map((row) => [row.id, row]));
  const conflicts = [];
  const newRows = [];
  for (const row of rows) {
    const existing = liveById.get(row.id);
    if (!existing) {
      newRows.push(row);
      continue;
    }
    const diff = Object.keys(row).filter((key) => JSON.stringify(row[key] ?? null) !== JSON.stringify(existing[key] ?? null));
    if (diff.length > 0) conflicts.push({ id: row.id, diff });
  }
  return { newRows, conflicts };
}

// Yerel girdiyi baglanmadan once dogrular: failures bos, karantina, tekrar yok, gorsel dosyasi WebP ve <= 512 KB.
function loadBank(outRoot, years) {
  const bankPath = join(outRoot, "bank.json");
  if (!existsSync(bankPath)) throw new Error(`bank.json yok: ${bankPath}`);
  const { bank, failures } = readJson(bankPath);
  if (!Array.isArray(failures)) throw new Error("bank.json failures listesi yok; once validate-bank calismali.");
  if (failures.length > 0) throw new Error(`bank.json ${failures.length} hata iceriyor; once validate-bank temiz gecmeli.`);
  if (!Array.isArray(bank)) throw new Error("bank.json bank listesi yok.");
  const selected = years ? bank.filter((q) => years.includes(q.year)) : bank;
  if (selected.length === 0) throw new Error(`bank.json'da secilen yillarda kayit yok (${years?.join(", ") ?? "tum"}).`);

  const ids = new Set();
  const positions = new Set();
  for (const q of selected) {
    if (q.needs_review !== true) throw new Error(`${q.id}: needs_review true degil; yeni satir karantinada eklenir.`);
    if (ids.has(q.id)) throw new Error(`Tekrarli id: ${q.id}`);
    ids.add(q.id);
    const position = `${q.exam_set}:${q.year}:${q.number}`;
    if (positions.has(position)) throw new Error(`Tekrarli kagit konumu: ${position}`);
    positions.add(position);
  }
  const rows = bankToRows(selected);
  for (const row of rows) {
    if (!row.figure_path) continue;
    const file = join(outRoot, "figures", row.figure_path);
    if (!existsSync(file)) throw new Error(`${row.id}: Gorsel dosyasi yok: ${file}`);
    const size = statSync(file).size;
    if (size > FIGURE_MAX_BYTES) throw new Error(`${row.id}: gorsel ${size} bayt; bucket siniri ${FIGURE_MAX_BYTES}.`);
    const head = readFileSync(file).subarray(0, 12);
    if (head.subarray(0, 4).toString("latin1") !== "RIFF" || head.subarray(8, 12).toString("latin1") !== "WEBP") {
      throw new Error(`${row.id}: gorsel WebP degil: ${file}`);
    }
  }
  return rows;
}

async function fetchLiveRows(supabase) {
  const live = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(TABLE).select(COMPARE_COLUMNS).order("id").range(from, from + PAGE_SIZE - 1);
    if (error) throw liveReadError(error);
    live.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return live;
  }
}

// Bucket var mi (yalniz okur; kurulum supabase/imat_bank.sql'de) ve hangi gorseller zaten depoda.
async function existingFigurePaths(supabase, figurePaths) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Depo okuma hatasi: ${error.message}`);
  if (!buckets?.some((bucket) => bucket.name === FIGURE_BUCKET)) {
    throw new Error(`${FIGURE_BUCKET} bucket'i canlida yok; once supabase/imat_bank.sql uygulanmali (Kerem onayiyla).`);
  }
  const existing = new Set();
  const folders = [...new Set(figurePaths.map((figurePath) => figurePath.split("/")[0]))];
  for (const folder of folders) {
    const { data, error: listError } = await supabase.storage.from(FIGURE_BUCKET).list(folder, { limit: 1000 });
    if (listError) throw new Error(`Depo listesi okunamadi (${folder}): ${listError.message}`);
    for (const object of data ?? []) existing.add(`${folder}/${object.name}`);
  }
  return existing;
}

const isDuplicateObject = (error) => String(error?.statusCode) === "409" || /already exists|duplicate/i.test(error?.message ?? "");

// clientFactory ve outRoot yalniz cevrimdisi testler icindir (sahte istemci, gecici bank.json).
export async function main(argv = process.argv.slice(2), { clientFactory, outRoot = IMAT_OUT } = {}) {
  const { mode, projectRef, values } = parseImportArgs(argv, { valueFlags: ["--years"] });
  const years = values["--years"] ? parseYears(values["--years"]) : null;
  if (mode === "apply" && !process.env.IMAT_OUT) {
    throw new Error(
      "--apply icin IMAT_OUT zorunlu: ana depodaki bankayi acikca ver (IMAT_OUT=<ana depo>/tmp/imat-bank); " +
        "worktree'nin kendi tmp/ klasoru kullanilmaz. Hicbir sey yazilmadi."
    );
  }
  const rows = loadBank(outRoot, years);
  const localFigures = rows.filter((row) => row.figure_path).length;
  console.log(`Yerel banka temiz: ${rows.length} kayit, ${localFigures} gorsel (WebP, <= 512 KB); hepsi karantinada.`);
  const supabase = createImportClient({
    mode,
    projectRef: mode === "apply" ? projectRef : (projectRef ?? LIVE_PROJECT_REF),
    clientFactory,
  });

  // 1) Canli satirlari oku; var olan id'de fark varsa YAZISIZ fail (insert-only sozlesme)
  const { newRows, conflicts } = planInsert(rows, await fetchLiveRows(supabase));
  if (conflicts.length > 0) {
    const onlyReleased = conflicts.every((conflict) => conflict.diff.length === 1 && conflict.diff[0] === "needs_review");
    throw new Error(
      `INSERT-ONLY FAIL: ${conflicts.length} var olan id yerel bankadan farkli; hicbir sey yazilmadi. Var olan sorular yalniz ` +
        `scripts/imat/patch-imat-questions.mjs ile guncellenir.` +
        (onlyReleased ? " Fark yalniz needs_review: bu satirlar acilmis; --years ile bu yillari disarida birak." : "") +
        ` Ilk 10: ${JSON.stringify(conflicts.slice(0, 10))}`
    );
  }

  // 2) Gorsel plani: yalniz eklenecek satirlarin gorselleri; depoda olan atlanir (ezilmez). Atlanan satirlarin
  // gorselleri yuklenmez, yalniz sayilir.
  const figurePaths = newRows.filter((row) => row.figure_path).map((row) => row.figure_path);
  const figuresSkippedRows = rows.filter((row) => row.figure_path).length - figurePaths.length;
  const existingFigures = await existingFigurePaths(supabase, figurePaths);
  const toUpload = figurePaths.filter((figurePath) => !existingFigures.has(figurePath));
  const skipped = rows.length - newRows.length;

  if (mode !== "apply") {
    const figuresExisting = figurePaths.length - toUpload.length;
    console.log(
      `Kuru calistirma: ${newRows.length} yeni / ${skipped} atlanan / ${toUpload.length} gorsel ` +
        `(${figuresExisting} yeni satir gorseli depoda zaten var, atlanir; atlanan satirlarin ${figuresSkippedRows} gorseline dokunulmaz). ` +
        `Yazi yok. Yazmak icin: IMAT_OUT=<klasor> ... --apply --project-ref ${LIVE_PROJECT_REF}`
    );
    return { mode, wouldInsert: newRows.length, skipped, wouldUpload: toUpload.length, figuresExisting, figuresSkippedRows, writes: 0 };
  }

  // 3) Gorseller once: satir hic gorselsiz gorunmez; var olan dosya EZILMEZ (upsert: false, cakisma atlanir)
  let uploaded = 0;
  let figuresExisting = figurePaths.length - toUpload.length;
  for (const figurePath of toUpload) {
    const file = readFileSync(join(outRoot, "figures", figurePath));
    const { error } = await supabase.storage
      .from(FIGURE_BUCKET)
      .upload(figurePath, file, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error && isDuplicateObject(error)) {
      figuresExisting += 1;
      continue;
    }
    if (error) throw new Error(`Gorsel upload hatasi ${figurePath}: ${error.message}`);
    uploaded += 1;
  }

  // 4) Yalniz canlida hic olmayan id'leri parca parca insert et (insert; var olan satira yazi yok)
  for (let index = 0; index < newRows.length; index += PAGE_SIZE) {
    const { error } = await supabase.from(TABLE).insert(newRows.slice(index, index + PAGE_SIZE));
    if (error) throw new Error(`Insert hatasi (parca ${index}): ${error.message}`);
  }

  // 5) Dogrulama: secilen her kayit canlida birebir
  const after = planInsert(rows, await fetchLiveRows(supabase));
  if (after.newRows.length > 0 || after.conflicts.length > 0) {
    throw new Error(`Post-verify FAIL: ${after.newRows.length} eksik, ${after.conflicts.length} farkli satir. ELLE INCELEME GEREKLI.`);
  }
  const { count, error: countError } = await supabase.from(TABLE).select("id", { count: "exact", head: true });
  if (countError) throw liveReadError(countError);
  console.log(
    `Import tamam: ${newRows.length} yeni / ${skipped} atlanan / ${uploaded} gorsel (${figuresExisting} gorsel zaten vardi; ` +
      `atlanan satirlarin ${figuresSkippedRows} gorseline dokunulmadi). DB toplam: ${count}`
  );
  return { mode, inserted: newRows.length, skipped, uploaded, figuresExisting, figuresSkippedRows, total: count };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`IMAT bank importu basarisiz: ${error.message ?? error}`);
    process.exitCode = 1;
  });
}
