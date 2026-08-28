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

// 1) Canli id'leri cek; var olan id'lerde fark varsa YAZISIZ fail (insert-only sozlesme)
const COMPARE_COLUMNS = "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,source_file,needs_review";
const live = [];
for (let from = 0; ; from += 500) {
  const { data, error } = await supabase.from("sat_questions").select(COMPARE_COLUMNS).order("id").range(from, from + 499);
  if (error) { console.error("Canli okuma hatasi:", error.message); process.exit(1); }
  live.push(...(data ?? []));
  if ((data ?? []).length < 500) break;
}
const liveById = new Map(live.map((r) => [r.id, r]));

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

const conflicts = [];
const newRows = [];
for (const row of rows) {
  const existing = liveById.get(row.id);
  if (!existing) { newRows.push(row); continue; }
  const diff = Object.keys(row).filter((k) => JSON.stringify(row[k] ?? null) !== JSON.stringify(existing[k] ?? null));
  if (diff.length > 0) conflicts.push({ id: row.id, diff });
}
if (conflicts.length > 0) {
  console.error(`INSERT-ONLY FAIL: ${conflicts.length} var olan id yerel bankadan farkli. Var olan sorular yalniz`);
  console.error(`scripts/sat/patch-sat-questions.mjs uzerinden guncellenebilir. Ilk 10: ${JSON.stringify(conflicts.slice(0, 10))}`);
  process.exit(1);
}

// 2) Yalniz DB'de hic olmayan id'leri chunk'lar halinde insert et
for (let i = 0; i < newRows.length; i += 500) {
  const { error } = await supabase.from("sat_questions").insert(newRows.slice(i, i + 500));
  if (error) { console.error(`Insert hatasi (chunk ${i}): ${error.message}`); process.exit(1); }
}

// 3) Figurleri yukle: yalniz yeni eklenen sorularinkiler, var olan dosyalari EZMEDEN
const newIds = new Set(newRows.map((r) => r.id));
const figures = bank.filter((q) => q.figure_path && newIds.has(q.id));
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
    .upload(`${q.id}.webp`, file, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) { console.error(`Figur upload hatasi ${q.id}: ${error.message}`); process.exit(1); }
  uploaded++;
}

const { count } = await supabase.from("sat_questions").select("id", { count: "exact", head: true });
console.log(`Import tamam: ${newRows.length} yeni soru insert edildi, ${rows.length - newRows.length} mevcut id degismeden atlandi.`);
console.log(`DB toplam: ${count}, yeni figur: ${uploaded}`);
