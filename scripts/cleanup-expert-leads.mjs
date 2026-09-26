import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { retentionCutoffs } from "./expert-lead-retention.mjs";

// Uzman on gorusme taleplerinin aylik saklama temizligi (Kerem karari 2026-09-26).
// Varsayilan kuru calismadir: yalniz kurala giren talep sayisini gosterir, hicbir satir okumaz
// veya silmez. `--apply` canli veritabanindan siler; her calistirma Kerem onayiyla yapilir.
// Ekrana ad, numara veya talep metni yazilmaz.
//   npm run cleanup:expert-leads
//   npm run cleanup:expert-leads -- --apply

const mode = parseMode(process.argv.slice(2));

function parseMode(args) {
  const allowedArgs = new Set(["--dry-run", "--apply"]);
  const unknownArgs = args.filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(", ")}`);
  }
  if (args.includes("--dry-run") && args.includes("--apply")) {
    throw new Error("Use either --dry-run or --apply, not both.");
  }
  return args.includes("--apply") ? "apply" : "dry-run";
}

function loadDotenvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function createSupabaseClient() {
  loadDotenvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // expert_leads yalniz aktif ekibe acik (RLS); temizlik RLS'i asan sunucu anahtariyla yapilir.
  const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  const supabase = createSupabaseClient();
  const rules = retentionCutoffs(new Date());
  let total = 0;

  console.log(`[INFO] Mode: ${mode}. Retention cleanup for expert_leads.`);

  for (const rule of rules) {
    const cutoff = rule.cutoff.toISOString();
    if (mode === "dry-run") {
      const { count, error } = await supabase
        .from("expert_leads")
        .select("id", { count: "exact", head: true })
        .in("status", rule.statuses)
        .lt("updated_at", cutoff);
      if (error) throw new Error(`Count failed for ${rule.id}: ${error.code ?? error.message}`);
      console.log(`[DRY] ${rule.label} (son işlem < ${cutoff.slice(0, 10)}): ${count ?? 0} talep silinecek.`);
      total += count ?? 0;
    } else {
      const { count, error } = await supabase
        .from("expert_leads")
        .delete({ count: "exact" })
        .in("status", rule.statuses)
        .lt("updated_at", cutoff);
      if (error) throw new Error(`Delete failed for ${rule.id}: ${error.code ?? error.message}`);
      console.log(`[APPLY] ${rule.label} (son işlem < ${cutoff.slice(0, 10)}): ${count ?? 0} talep silindi.`);
      total += count ?? 0;
    }
  }

  if (mode === "dry-run") {
    console.log(`[OK] Dry run complete: ${total} talep silinecek. Silmek için: npm run cleanup:expert-leads -- --apply`);
  } else {
    console.log(`[OK] Cleanup complete: ${total} talep silindi.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
