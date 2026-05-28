import { readFileSync, writeFileSync } from "node:fs";

const DATA_PATH = new URL("../app/data.ts", import.meta.url);
const EXTRACTED_PATH = new URL("../tmp/deadlines-extracted.json", import.meta.url);

const extracted = JSON.parse(readFileSync(EXTRACTED_PATH, "utf8"));
const source = readFileSync(DATA_PATH, "utf8");

function extractUniversityDepartments(src) {
  const map = new Map(); // id -> string[] of slugs
  const idRegex = /id:\s*(\d+)/g;
  let match;
  while ((match = idRegex.exec(src)) !== null) {
    const id = Number(match[1]);
    const blockStart = src.indexOf("departments: [", match.index);
    if (blockStart === -1) continue;
    // NOTE: This assumes department seeds do not contain inline `[]` arrays
    // (e.g. inline `languages: ["en"]`). Today, those metadata fields live in
    // DEPARTMENT_*_OVERRIDES in app/data.ts — not in the seed. If that ever
    // changes, this single-bracket scan will silently truncate the block.
    // Replace with a depth-counted matcher in that case.
    const blockEnd = src.indexOf("]", blockStart);
    const block = src.slice(blockStart, blockEnd);
    const slugs = [...block.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
    map.set(id, slugs);
  }
  return map;
}

const uniDepts = extractUniversityDepartments(source);

const expanded = [];
for (const entry of extracted) {
  if (entry.departmentSlug) {
    expanded.push(entry);
  } else {
    const slugs = uniDepts.get(entry.universityId);
    if (!slugs) {
      console.warn(`[WARN] No departments found for uni ${entry.universityId}; skipping`);
      continue;
    }
    for (const slug of slugs) {
      expanded.push({ ...entry, departmentSlug: slug });
    }
  }
}

const entries = expanded
  .map((e) => {
    const key = `"${e.universityId}:${e.departmentSlug}"`;
    const note = e.note ? `, note: ${JSON.stringify(e.note)}` : "";
    const value = `{ date: ${JSON.stringify(e.date)}${note}, sourceUrl: ${JSON.stringify(e.sourceUrl)} }`;
    return `  ${key}: ${value},`;
  })
  .sort();

const newMapBody = entries.join("\n");

const mapStart = source.indexOf("export const DEPARTMENT_DEADLINE_OVERRIDES");
if (mapStart === -1) {
  throw new Error("DEPARTMENT_DEADLINE_OVERRIDES not found in app/data.ts — run Task 2 first.");
}
const bodyStart = source.indexOf("{", mapStart);
const bodyEnd = source.indexOf("};", bodyStart);
const before = source.slice(0, bodyStart + 1);
const after = source.slice(bodyEnd);

const newSource = `${before}\n${newMapBody}\n${after}`;

const today = new Date().toISOString().slice(0, 10);
const updated = newSource.replace(
  /DEPARTMENT_DEADLINES_LAST_CHECKED_AT = "[^"]+"/,
  `DEPARTMENT_DEADLINES_LAST_CHECKED_AT = "${today}"`
);

writeFileSync(DATA_PATH, updated, "utf8");
console.log(`[OK] Applied ${expanded.length} deadline entries to app/data.ts.`);
console.log(`[OK] DEPARTMENT_DEADLINES_LAST_CHECKED_AT set to ${today}.`);
