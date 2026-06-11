import { readFileSync } from "node:fs";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) continue;
    args[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  return args;
}

const args = parseArgs(process.argv);
const dataPath = args.data || "app/data.ts";
const source = readFileSync(new URL(`../${dataPath}`, import.meta.url), "utf8");

const errors = [];

// 1. Extract universitiesData (id + slugs).
const uniDepts = new Map();
const idRegex = /id:\s*(\d+)/g;
let match;
while ((match = idRegex.exec(source)) !== null) {
  const id = Number(match[1]);
  const blockStart = source.indexOf("departments: [", match.index);
  if (blockStart === -1) continue;
  const blockEnd = source.indexOf("]", blockStart);
  const block = source.slice(blockStart, blockEnd);
  const slugs = [...block.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
  uniDepts.set(id, new Set(slugs));
}

// 2. Extract DEPARTMENT_DEADLINE_OVERRIDES entries.
const mapStart = source.indexOf("DEPARTMENT_DEADLINE_OVERRIDES");
if (mapStart === -1) {
  console.error("[FAIL] DEPARTMENT_DEADLINE_OVERRIDES not found in data");
  process.exit(1);
}
const bodyStart = source.indexOf("{", mapStart);
const bodyEnd = source.indexOf("};", bodyStart);
const body = source.slice(bodyStart, bodyEnd);
const entryRegex = /"(\d+):([^"]+)":\s*\{([^}]+)\}/g;

let entryCount = 0;
while ((match = entryRegex.exec(body)) !== null) {
  entryCount++;
  const uniId = Number(match[1]);
  const slug = match[2];
  const value = match[3];

  // Check uni exists.
  if (!uniDepts.has(uniId)) {
    errors.push(`Unknown university ID: ${uniId} (key: ${uniId}:${slug})`);
    continue;
  }

  // Check slug exists.
  if (!uniDepts.get(uniId).has(slug)) {
    errors.push(`Unknown slug: "${slug}" for university ${uniId}`);
  }

  // Check date format.
  const dateMatch = value.match(/date:\s*"([^"]+)"/);
  if (!dateMatch) {
    errors.push(`Missing date in ${uniId}:${slug}`);
  } else {
    const date = dateMatch[1];
    const isISO = /^\d{4}-\d{2}-\d{2}$/.test(date);
    const isRolling = date === "rolling";
    const isTBA = date === "TBA";
    if (!isISO && !isRolling && !isTBA) {
      errors.push(`Invalid date format in ${uniId}:${slug}: "${date}" (bad date format; expected YYYY-MM-DD, "rolling", or "TBA")`);
    }
  }

  // Check sourceUrl.
  const urlMatch = value.match(/sourceUrl:\s*"([^"]+)"/);
  if (!urlMatch) {
    errors.push(`Missing sourceUrl in ${uniId}:${slug}`);
  } else if (!urlMatch[1].startsWith("https://")) {
    errors.push(`sourceUrl not HTTPS in ${uniId}:${slug}: ${urlMatch[1]} (http:// not allowed)`);
  }
}

if (errors.length > 0) {
  console.error(`[FAIL] ${errors.length} validation error(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

console.log(`[OK] Validated ${entryCount} deadline override(s) in ${dataPath}.`);
