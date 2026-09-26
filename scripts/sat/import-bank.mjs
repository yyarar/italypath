// SAT soru bankasi importu (insert-only). Kabul dosyasi yazicilariyla ayni hedef kilidini kullanir
// (scripts/lib/program-details-import.mjs; guvenlik denetimi G2#6 / STATUS #65, 2026-09-26).
//
// Kullanim:
//   node scripts/sat/import-bank.mjs                                          # kuru calistirma (varsayilan): yazmaz
//   node scripts/sat/import-bank.mjs --apply --project-ref kskbnxxyviowmrlskwke  # canliya yazar
//
// --apply yalniz --project-ref canli proje kimligiyle ve .env.local'daki NEXT_PUBLIC_SUPABASE_URL o projeye
// aitse calisir (assertTarget). Okuma ve yazma server-only SUPABASE_SECRET_KEY ile (yazmada yoksa
// SUPABASE_SERVICE_ROLE_KEY). Kuru calistirma canli id'leri okur; eklenecek soru ve figur sayisini yazar.
// Sozlesme: var olan id'ler asla ezilmez (fark varsa INSERT-ONLY FAIL, yazi yok); mevcut sorular yalniz
// scripts/sat/patch-sat-questions.mjs ile guncellenir. Girdi: tmp/sat-bank/bank.json (validate-bank temiz).
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LIVE_PROJECT_REF, createImportClient, parseImportArgs } from "../lib/program-details-import.mjs";
import { OUT_ROOT, readJson } from "./lib.mjs";

const COMPARE_COLUMNS = "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,source_file,needs_review";
const PAGE_SIZE = 500;

export function bankToRows(bank) {
  return bank.map((q) => ({
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
}

// Insert-only plan: canlida olmayan id'ler eklenir; var olan id'lerde fark varsa yazi olmaz.
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

async function fetchLiveRows(supabase) {
  const live = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("sat_questions").select(COMPARE_COLUMNS).order("id").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Canli okuma hatasi: ${error.message}`);
    live.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return live;
  }
}

async function ensureFigureBucket(supabase) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((bucket) => bucket.name === "sat-figures")) return;
  // Ayni ayar supabase/sat_bank.sql icinde: 512 KB, yalniz WebP.
  const { error } = await supabase.storage.createBucket("sat-figures", {
    public: true,
    fileSizeLimit: 524288,
    allowedMimeTypes: ["image/webp"],
  });
  if (error) throw new Error(`Bucket olusturulamadi: ${error.message}`);
}

// clientFactory ve outRoot yalniz cevrimdisi testler icindir (sahte istemci, gecici bank.json).
export async function main(argv = process.argv.slice(2), { clientFactory, outRoot = OUT_ROOT } = {}) {
  const { mode, projectRef } = parseImportArgs(argv);
  const supabase = createImportClient({ mode, projectRef, clientFactory });

  const { bank, failures } = readJson(join(outRoot, "bank.json"));
  if (failures.length > 0) throw new Error(`bank.json ${failures.length} hata iceriyor; once validate-bank temiz gecmeli.`);

  // 1) Canli id'leri cek; var olan id'lerde fark varsa YAZISIZ fail (insert-only sozlesme)
  const rows = bankToRows(bank);
  const { newRows, conflicts } = planInsert(rows, await fetchLiveRows(supabase));
  if (conflicts.length > 0) {
    throw new Error(
      `INSERT-ONLY FAIL: ${conflicts.length} var olan id yerel bankadan farkli. Var olan sorular yalniz ` +
        `scripts/sat/patch-sat-questions.mjs uzerinden guncellenebilir. Ilk 10: ${JSON.stringify(conflicts.slice(0, 10))}`
    );
  }
  const newIds = new Set(newRows.map((row) => row.id));
  const figures = bank.filter((q) => q.figure_path && newIds.has(q.id));
  const skipped = rows.length - newRows.length;

  if (mode !== "apply") {
    console.log(
      `Kuru calistirma: ${newRows.length} yeni soru eklenecek, ${skipped} mevcut id degismeden atlanacak, ` +
        `${figures.length} yeni figur yuklenecek. Yazmak icin: --apply --project-ref ${LIVE_PROJECT_REF}`
    );
    return { mode, wouldInsert: newRows.length, skipped, wouldUpload: figures.length, writes: 0 };
  }

  // 2) Yalniz DB'de hic olmayan id'leri chunk'lar halinde insert et
  for (let index = 0; index < newRows.length; index += PAGE_SIZE) {
    const { error } = await supabase.from("sat_questions").insert(newRows.slice(index, index + PAGE_SIZE));
    if (error) throw new Error(`Insert hatasi (chunk ${index}): ${error.message}`);
  }

  // 3) Figurleri yukle: yalniz yeni eklenen sorularinkiler, var olan dosyalari EZMEDEN
  await ensureFigureBucket(supabase);
  let uploaded = 0;
  for (const q of figures) {
    const file = readFileSync(join(outRoot, q.figure_path));
    const { error } = await supabase.storage
      .from("sat-figures")
      .upload(`${q.id}.webp`, file, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error) throw new Error(`Figur upload hatasi ${q.id}: ${error.message}`);
    uploaded += 1;
  }

  const { count } = await supabase.from("sat_questions").select("id", { count: "exact", head: true });
  console.log(`Import tamam: ${newRows.length} yeni soru insert edildi, ${skipped} mevcut id degismeden atlandi.`);
  console.log(`DB toplam: ${count}, yeni figur: ${uploaded}`);
  return { mode, inserted: newRows.length, skipped, uploaded, total: count };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`SAT bank importu basarisiz: ${error.message ?? error}`);
    process.exitCode = 1;
  });
}
