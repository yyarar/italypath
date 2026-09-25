// Belge Cüzdanı editorial guard — mirrors scripts/check-editorial-ui.mjs.
// Fails if /documents still uses generic tokens, if a component is missing,
// or if the category registry lost a key.
import { readFileSync, existsSync } from "node:fs";

const FORBIDDEN = [
  "#4f46e5",
  "linear-gradient(135deg",
  "shadow-indigo",
  "rounded-3xl",
  "bg-[#f8fafc]",
  "font-black",
  "bg-amber-50",
  "blur-xl",
  "indigo-",
];

const COMPONENT_FILES = [
  "app/documents/page.tsx",
  "components/documents/DocumentsHeader.tsx",
  "components/documents/UploadDock.tsx",
  "components/documents/CategoryPickerSheet.tsx",
  "components/documents/CategoryGroup.tsx",
  "components/documents/DocumentRow.tsx",
  "components/documents/DocumentsEmptyState.tsx",
];

const failures = [];

for (const file of COMPONENT_FILES) {
  if (!existsSync(file)) {
    failures.push(`missing file: ${file}`);
    continue;
  }
  const src = readFileSync(file, "utf8");
  for (const token of FORBIDDEN) {
    if (src.includes(token)) failures.push(`${file} contains forbidden token: ${token}`);
  }
  if (!src.includes("var(--editorial-")) {
    failures.push(`${file} does not use editorial tokens (var(--editorial-…))`);
  }
}

const catFile = "lib/documents/categories.ts";
if (!existsSync(catFile)) {
  failures.push(`missing file: ${catFile}`);
} else {
  const src = readFileSync(catFile, "utf8");
  for (const key of ["identity", "academic", "language", "letters", "financial", "other"]) {
    if (!src.includes(`"${key}"`)) failures.push(`categories.ts missing key: ${key}`);
  }
}

// Upload limits (security audit card 4, 2026-09-26): the app's rules in
// lib/documents/limits.ts must match the documents bucket and user_documents
// rules in supabase/rls_hardening.sql, or uploads fail with a generic error.
const limitsFile = "lib/documents/limits.ts";
const hardeningFile = "supabase/rls_hardening.sql";
if (!existsSync(limitsFile) || !existsSync(hardeningFile)) {
  failures.push(`missing file: ${limitsFile} or ${hardeningFile}`);
} else {
  const limits = readFileSync(limitsFile, "utf8");
  const hardening = readFileSync(hardeningFile, "utf8");
  if (!limits.includes("MAX_DOCUMENT_BYTES = 5 * 1024 * 1024")) {
    failures.push("limits.ts: MAX_DOCUMENT_BYTES must be 5 MB");
  }
  if (!hardening.includes("5242880,")) {
    failures.push("rls_hardening.sql: documents bucket file_size_limit must be 5242880 (5 MB)");
  }
  const appMimes = [...limits.matchAll(/\["([a-z]+\/[a-z-]+)", "[a-z]+"\]/g)].map((m) => m[1]);
  const bucketMimes = hardening.match(/array\[('application\/pdf'[^\]]*)\]/);
  const sqlMimes = bucketMimes ? [...bucketMimes[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  if (appMimes.length === 0 || appMimes.join(",") !== sqlMimes.join(",")) {
    failures.push(`MIME list differs: limits.ts [${appMimes}] vs rls_hardening.sql [${sqlMimes}]`);
  }
  if (!limits.includes("MAX_DOCUMENT_FILE_NAME_LENGTH = 255") || !hardening.includes("char_length(file_name) between 1 and 255")) {
    failures.push("file name limit must be 255 in limits.ts and rls_hardening.sql");
  }
  if (!hardening.includes("if v_count >= 30 then") || !hardening.includes(") < 30")) {
    failures.push("rls_hardening.sql: 30-document cap missing from the table trigger or the storage insert policy");
  }
  const page = readFileSync("app/documents/page.tsx", "utf8");
  if (!page.includes("MAX_DOCUMENT_BYTES") || !page.includes("documentExtensionFor(file.type)")) {
    failures.push("app/documents/page.tsx must check size and type with lib/documents/limits.ts");
  }
  const hook = readFileSync("lib/documents/useUserDocuments.ts", "utf8");
  if (hook.includes("file.name.split") || !hook.includes("documentExtensionFor(file.type)")) {
    failures.push("useUserDocuments.ts must take the extension from the MIME allowlist, not the file name");
  }
  if (!hook.includes("documentRecordName(file.name)")) {
    failures.push("useUserDocuments.ts must bound file_name with documentRecordName");
  }
}

if (failures.length) {
  console.error("check:documents-ui FAILED");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log("check:documents-ui passed");
