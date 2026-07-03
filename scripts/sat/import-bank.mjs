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

// 1) Figurleri yukle
const figures = bank.filter((q) => q.figure_path);
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
    .upload(`${q.id}.webp`, file, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
  if (error) { console.error(`Figur upload hatasi ${q.id}: ${error.message}`); process.exit(1); }
  uploaded++;
}

// 2) Sorulari chunk'lar halinde upsert et
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

for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500);
  const { error } = await supabase.from("sat_questions").upsert(chunk, { onConflict: "id" });
  if (error) { console.error(`Upsert hatasi (chunk ${i}): ${error.message}`); process.exit(1); }
}

const { count } = await supabase.from("sat_questions").select("id", { count: "exact", head: true });
console.log(`Import tamam: ${rows.length} soru upsert edildi, DB toplam: ${count}, figur: ${uploaded}`);
