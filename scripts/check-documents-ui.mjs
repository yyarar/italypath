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

if (failures.length) {
  console.error("check:documents-ui FAILED");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log("check:documents-ui passed");
