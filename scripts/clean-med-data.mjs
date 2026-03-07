import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MED_PATH = resolve(process.cwd(), "med");
const OUTPUT_DIR = resolve(process.cwd(), "output");

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()"]/g, " ")
    .replace(/['’`.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (value) => {
  const slug = String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return slug || "department";
};

function parseProgramCode(title) {
  const match = title.match(/\b(LM-\d+)\b/i);
  return match ? match[1].toUpperCase() : null;
}

function cleanDepartmentName(title) {
  return title
    .replace(/\s*-\s*LM-\d+\s*R$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapLanguage(rawLanguage) {
  const normalized = normalize(rawLanguage);
  if (normalized === "en") return ["en"];
  if (normalized === "it") return ["it"];
  return [];
}

function parseDurationYears(rawDuration) {
  const match = String(rawDuration ?? "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function parseMedRows(medText) {
  const lines = medText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const visitIndex = lines.indexOf("Visit Course", cursor);
    if (visitIndex === -1) break;

    const block = lines.slice(cursor, visitIndex + 1);
    if (block.length >= 7) {
      const [title, sourceUniversityName, cycleLabel, note, rawDuration, rawLanguage] = block;
      rows.push({
        title,
        sourceUniversityName,
        cycleLabel,
        note,
        rawDuration,
        rawLanguage,
      });
    }

    cursor = visitIndex + 1;
  }

  return rows;
}

const dataModuleUrl = pathToFileURL(resolve(process.cwd(), "app/data.ts")).href;
const dataModule = await import(dataModuleUrl);
const universitiesData = dataModule.universitiesData;

const universityByNormalizedName = new Map(
  universitiesData.map((university) => [normalize(university.name), university])
);

// med dosyasindaki kurum adlari ile mevcut data.ts adlari arasindaki alias eslesmeleri
const aliasByNormalizedSourceName = {
  "unicamillus saint camillus international university of health sciences": 41,
  "universita campus bio medico di roma": 47,
  "universita cattolica del sacro cuore": 8,
  "universita degli studi della campania luigi vanvitelli": 24,
  "universita degli studi di cagliari": 53,
  "universita degli studi di messina": 17,
  "universita degli studi di milano bicocca": 29,
  "universita degli studi di padova": 4,
  "universita degli studi di pavia": 15,
  "universita degli studi di roma la sapienza": 2,
  "universita degli studi di roma tor vergata": 13,
  "universita degli studi di siena": 16,
  "universita degli studi di torino": 11,
};

const universityById = new Map(universitiesData.map((university) => [university.id, university]));

const medText = readFileSync(MED_PATH, "utf8");
const parsedRows = parseMedRows(medText);

const seenKeys = new Set();
const uniqueRows = [];
for (const row of parsedRows) {
  const dedupeKey = `${normalize(row.sourceUniversityName)}|||${normalize(row.title)}`;
  if (seenKeys.has(dedupeKey)) continue;
  seenKeys.add(dedupeKey);
  uniqueRows.push(row);
}

const cleanedMatched = [];
const cleanedUnmatched = [];

for (const row of uniqueRows) {
  const normalizedSourceName = normalize(row.sourceUniversityName);

  let matchedUniversity = universityByNormalizedName.get(normalizedSourceName);
  if (!matchedUniversity) {
    const aliasId = aliasByNormalizedSourceName[normalizedSourceName];
    if (aliasId) {
      matchedUniversity = universityById.get(aliasId);
    }
  }

  const departmentName = cleanDepartmentName(row.title);
  const departmentSlug = slugify(departmentName);
  const programCode = parseProgramCode(row.title);
  const durationYears = parseDurationYears(row.rawDuration);
  const languages = mapLanguage(row.rawLanguage);

  const baseRecord = {
    sourceUniversityName: row.sourceUniversityName,
    sourceTitle: row.title,
    programCode,
    departmentName,
    departmentSlug,
    languages,
    durationYears,
    level: "bachelor",
    cycleLabel: row.cycleLabel,
  };

  if (!matchedUniversity) {
    cleanedUnmatched.push(baseRecord);
    continue;
  }

  cleanedMatched.push({
    ...baseRecord,
    universityId: matchedUniversity.id,
    universityName: matchedUniversity.name,
  });
}

const durationOverrides = {};
const languageOverrides = {};
const levelOverrides = {};

for (const row of cleanedMatched) {
  const key = `${row.universityId}:${row.departmentSlug}`;

  if (row.durationYears && row.durationYears !== 3) {
    durationOverrides[key] = row.durationYears;
  }

  if (row.languages.length > 0 && !(row.languages.length === 1 && row.languages[0] === "en")) {
    languageOverrides[key] = row.languages;
  }

  if (row.level !== "bachelor") {
    levelOverrides[key] = row.level;
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true });

writeFileSync(
  resolve(OUTPUT_DIR, "med.cleaned.matched.json"),
  JSON.stringify(cleanedMatched, null, 2),
  "utf8"
);
writeFileSync(
  resolve(OUTPUT_DIR, "med.cleaned.unmatched.json"),
  JSON.stringify(cleanedUnmatched, null, 2),
  "utf8"
);
writeFileSync(
  resolve(OUTPUT_DIR, "med.cleaned.overrides.json"),
  JSON.stringify(
    {
      durationOverrides,
      languageOverrides,
      levelOverrides,
    },
    null,
    2
  ),
  "utf8"
);

console.log(`[OK] Raw parsed rows: ${parsedRows.length}`);
console.log(`[OK] Unique rows (university + title): ${uniqueRows.length}`);
console.log(`[OK] Matched rows: ${cleanedMatched.length}`);
console.log(`[OK] Unmatched rows: ${cleanedUnmatched.length}`);
console.log(
  `[OK] Output files: output/med.cleaned.matched.json, output/med.cleaned.unmatched.json, output/med.cleaned.overrides.json`
);
