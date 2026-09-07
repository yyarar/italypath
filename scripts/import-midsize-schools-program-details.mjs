import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Shared importer for the September 2026 "mid-size schools" research wave
// (10 universities). One config block per school instead of ten near-identical
// scripts; usage:  node scripts/import-midsize-schools-program-details.mjs --school <key> [--dry-run|--apply]
const SOURCE_GENERATED_AT = "2026-09-06";
const OUTPUT_DIR = resolve(process.cwd(), "output");

const CONFIGS = {
  uniba: {
    universityId: 51,
    resultsDir: "uniba-english-degree-admissions/results",
    expectedCount: 9,
    officialDomain: "uniba.it",
    excluded: new Map([
      // Research verdict: NOT English-completable (Italian programme, a few
      // English modules in year 3). Kerem decision pending; default exclude.
      ["Management_of_Green_Spaces_Forests_and_Protected_Areas.json", "not English-completable per research"],
    ]),
    fileToDept: new Map([
      ["Earth_System_and_Global_Changes.json", { id: 460, level: "bachelor" }],
      ["Medicine_and_Surgery_Bari_English_Medical_Curriculum_BEMC.json", { id: 461, level: "bachelor", expectedFixedLevel: "single-cycle" }],
      ["Computer_Science.json", { id: 819, level: "master" }],
      ["Innovation_Development_in_Agri-Food_Systems_IDEAS.json", { id: 820, level: "master" }],
      ["Decision_Science.json", { id: 821, level: "master" }],
      ["Physics.json", { id: 822, level: "master" }],
    ]),
    levelFixes: [{ departmentId: 461, from: { level: "bachelor" }, to: { level: "single-cycle", sort_order: 0 } }],
    renames: [],
    newDepartments: new Map([
      ["Materials_Science_and_Technology.json", { name: "Materials Science and Technology", slug: "materials-science-and-technology", languages: ["en"], duration_years: 2, level: "master" }],
      // English only via the ESMI-EGEI Erasmus Mundus curriculum -> en+it.
      ["Economics_and_Strategies_for_International_Markets.json", { name: "Economics and Strategies for International Markets", slug: "economics-and-strategies-for-international-markets", languages: ["en", "it"], duration_years: 2, level: "master" }],
    ]),
  },
  iulm: {
    universityId: 44,
    resultsDir: "iulm-english-programs/results",
    expectedCount: 5,
    officialDomain: "iulm.it",
    extraDomains: ["iulm.com"],
    excluded: new Map(),
    fileToDept: new Map([
      ["ba-corporate-communication-pr.json", { id: 449, level: "bachelor" }],
      ["ma-hospitality-tourism-management.json", { id: 926, level: "master" }],
      ["ma-fashion-communication-luxury-strategies.json", { id: 927, level: "master" }],
      ["ma-marketing-consumer-behaviour-communication.json", { id: 928, level: "master" }],
      ["ma-strategic-communication.json", { id: 929, level: "master" }],
    ]),
    levelFixes: [],
    renames: [],
    newDepartments: new Map(),
  },
  unisr: {
    universityId: 64,
    resultsDir: "unisr-english-programs/results",
    expectedCount: 5,
    officialDomain: "unisr.it",
    excluded: new Map(),
    fileToDept: new Map([
      ["International_Medical_Doctor_Program.json", { id: 480, level: "bachelor", expectedFixedLevel: "single-cycle" }],
      ["Health_Informatics.json", { id: 1025, level: "master" }],
      ["Biotechnology_for_Innovative_Therapeutics.json", { id: 1026, level: "master" }],
      ["Politics_Philosophy_and_Public_Affairs.json", { id: 1027, level: "master" }],
      ["Cognitive_Psychology_in_Health_Communication.json", { id: 1028, level: "master" }],
    ]),
    levelFixes: [{ departmentId: 480, from: { level: "bachelor" }, to: { level: "single-cycle", sort_order: 0 } }],
    renames: [],
    newDepartments: new Map(),
  },
  vanvitelli: {
    universityId: 24,
    resultsDir: "vanvitelli-english-program-admission-requirements/results",
    expectedCount: 5,
    officialDomain: "unicampania.it",
    excluded: new Map(),
    fileToDept: new Map([
      ["Data_Analytics.json", { id: 401, level: "bachelor" }],
      ["Medicine_and_Surgery.json", { id: 403, level: "bachelor", expectedFixedLevel: "single-cycle" }],
      ["Data_Science.json", { id: 978, level: "master" }],
      ["Molecular_Biotechnology.json", { id: 980, level: "master" }],
      ["Physics.json", { id: 981, level: "master" }],
    ]),
    levelFixes: [{ departmentId: 403, from: { level: "bachelor" }, to: { level: "single-cycle", sort_order: 0 } }],
    renames: [],
    newDepartments: new Map(),
    // Research couldn't locate canonical pages; found and verified manually
    // (both pages state fully-English delivery).
    urlOverrides: new Map([
      ["Data_Analytics.json", "https://www.matematicaefisica.unicampania.it/didattica/corsi-di-studio/data-analytics"],
      ["Physics.json", "https://www.matfis.unicampania.it/didattica/corsi-di-studio/corso-di-laurea-magistrale-in-physics"],
    ]),
  },
  unicamillus: {
    universityId: 41,
    resultsDir: "unicamillus-english-program-admission-requirements/results",
    expectedCount: 4,
    officialDomain: "unicamillus.org",
    excluded: new Map([
      // 2026/27 intake switched to Italian (last English year 2025/26); row 438
      // deleted per Kerem's decision — file kept as archive.
      ["Physiotherapy.json", "language changed to Italian for 2026/27 — row deleted"],
    ]),
    fileToDept: new Map([
      ["Medicine_and_Surgery.json", { id: 443, level: "bachelor", expectedFixedLevel: "single-cycle" }],
      ["Nursing.json", { id: 439, level: "bachelor" }],
      ["Radiology_Diagnostic_Imaging_and_Radiotherapy_Techniques.json", { id: 442, level: "bachelor" }],
    ]),
    levelFixes: [{ departmentId: 443, from: { level: "bachelor" }, to: { level: "single-cycle", sort_order: 0 } }],
    renames: [
      { id: 442, to: { name: "Radiology, Diagnostic Imaging and Radiotherapy Techniques", slug: "radiology-diagnostic-imaging-and-radiotherapy-techniques" } },
    ],
    newDepartments: new Map(),
  },
  perugia: {
    universityId: 33,
    resultsDir: "perugia-english-programs/results",
    expectedCount: 13,
    officialDomain: "unipg.it",
    excluded: new Map(),
    fileToDept: new Map([
      ["ba-engineering-management.json", { id: 425, level: "bachelor" }],
      // Verified programme is the English "International Business" curriculum of
      // "Economia e management" — row renamed to the official identity.
      ["ma-economia-management-international-business.json", { id: 1023, level: "master" }],
    ]),
    levelFixes: [],
    renames: [
      { id: 1023, to: { name: "Economia e management - International Business", slug: "economia-e-management-international-business" } },
    ],
    newDepartments: new Map([
      ["ma-engineering-management.json", { name: "Engineering Management", slug: "engineering-management-msc", languages: ["en"], duration_years: 2, level: "master" }],
      ["ma-medical-veterinary-forensic-biotech.json", { name: "Medical, Veterinary and Forensic Biotechnological Sciences", slug: "medical-veterinary-and-forensic-biotechnological-sciences", languages: ["en"], duration_years: 2, level: "master" }],
      ["ma-quantitative-finance-data-science-economics.json", { name: "Quantitative Finance and Data Science for Economics", slug: "quantitative-finance-and-data-science-for-economics", languages: ["en"], duration_years: 2, level: "master" }],
      ["ma-geology-energy-resources.json", { name: "Geology for Energy Resources", slug: "geology-for-energy-resources", languages: ["en"], duration_years: 2, level: "master" }],
      ["ma-agricultural-environmental-biotechnology.json", { name: "Agricultural and Environmental Biotechnology", slug: "agricultural-and-environmental-biotechnology", languages: ["en"], duration_years: 2, level: "master" }],
      ["ma-civil-engineering-structural.json", { name: "Civil Engineering - Structural Engineering", slug: "civil-engineering-structural-engineering", languages: ["en", "it"], duration_years: 2, level: "master" }],
      ["ma-scienze-chimiche-tccm.json", { name: "Scienze chimiche - Theoretical Chemistry and Computational Modelling", slug: "scienze-chimiche-theoretical-chemistry-and-computational-modelling", languages: ["en", "it"], duration_years: 2, level: "master" }],
      ["ma-scienze-chimiche-energy-sustainability.json", { name: "Scienze chimiche - Energy and Sustainability", slug: "scienze-chimiche-energy-and-sustainability", languages: ["en", "it"], duration_years: 2, level: "master" }],
      ["ma-informatica-ai-cybersecurity.json", { name: "Informatica - Artificial Intelligence and Cybersecurity", slug: "informatica-artificial-intelligence-and-cybersecurity", languages: ["en", "it"], duration_years: 2, level: "master" }],
      ["ma-amministrazione-finanza-controllo-accounting-finance.json", { name: "Amministrazione, finanza e controllo - Accounting and Finance", slug: "amministrazione-finanza-e-controllo-accounting-and-finance", languages: ["en", "it"], duration_years: 2, level: "master" }],
      ["ma-geosciences-environmental-sustainability.json", { name: "Geosciences for Environmental Sustainability", slug: "geosciences-for-environmental-sustainability", languages: ["en", "it"], duration_years: 2, level: "master" }],
    ]),
  },
  brescia: {
    universityId: 27,
    resultsDir: "brescia-english-programs/results",
    expectedCount: 9,
    officialDomain: "unibs.it",
    excluded: new Map([
      ["Digital_Enterprise_Technology_Engineering_Masters.json", "teaching language unverified/likely Italian, and phasing out — not imported"],
      ["Mechanical_Engineering_LM.json", "official card says Language: Italian — not an English programme"],
    ]),
    fileToDept: new Map([
      ["Business_and_Economics.json", { id: 411, level: "bachelor" }],
      ["Analytics_and_Data_Science_for_Economics_and_Management_ADSEM.json", { id: 851, level: "master" }],
      ["Civil_and_Environmental_Engineering.json", { id: 848, level: "master" }],
      // CTM is phasing out (no new intake from 2026/27) — details imported, the
      // dossier carries the phase-out notes.
      ["Communication_Technologies_and_Multimedia_CTM.json", { id: 849, level: "master" }],
      ["Management_LM_International_Business_curriculum.json", { id: 850, level: "master" }],
    ]),
    levelFixes: [],
    // Management LM split into its two English curricula (UNIBZ Design/Art precedent).
    renames: [{ id: 850, to: { name: "Management - International Business", slug: "management-international-business" } }],
    newDepartments: new Map([
      ["Management_LM_Green_Economy_and_Sustainability_curriculum.json", { name: "Management - Green Economy and Sustainability", slug: "management-green-economy-and-sustainability", languages: ["en"], duration_years: 2, level: "master" }],
      // Years 1-2 Italian, year 3 English — partial-English bachelor, en+it.
      ["Economics_and_Data_Analysis.json", { name: "Economics and Data Analysis", slug: "economics-and-data-analysis-brescia", languages: ["en", "it"], duration_years: 3, level: "bachelor" }],
    ]),
  },
  udine: {
    universityId: 37,
    resultsDir: "udine-english-programs/results",
    expectedCount: 7,
    officialDomain: "uniud.it",
    excluded: new Map([
      // unibz-administered joint degree; the UNIBZ row already carries the full
      // dossier — importing here would create a duplicate listing.
      ["Food_Sciences_for_Innovation_and_Authenticity.json", "unibz-administered joint degree, already listed under UNIBZ"],
    ]),
    fileToDept: new Map([
      ["Management_Business_Analytics.json", { id: 434, level: "bachelor" }],
      ["Artificial_Intelligence_Cybersecurity.json", { id: 1106, level: "master" }],
      ["Economics_Scienze_Economiche.json", { id: 1107, level: "master" }],
      ["International_Marketing_Management_and_Organization.json", { id: 1108, level: "master" }],
      ["Industrial_Engineering_for_Sustainable_Manufacturing.json", { id: 1109, level: "master" }],
    ]),
    levelFixes: [],
    renames: [],
    newDepartments: new Map([
      // English curriculum of the bilingual LM-31 Ingegneria Gestionale.
      ["Management_Engineering.json", { name: "Management Engineering", slug: "management-engineering-udine", languages: ["en", "it"], duration_years: 2, level: "master" }],
    ]),
    // The file's tuition link is a template placeholder — drop it.
    tuitionOverrides: new Map([["Management_Engineering.json", null]]),
  },
  humanitas: {
    universityId: 61,
    resultsDir: "humanitas-english-program-admission-requirements/results",
    expectedCount: 6,
    officialDomain: "hunimed.eu",
    excluded: new Map([
      ["II_Level_Master_in_Regenerative_Medicine.json", "Master universitario di II livello (professional), Krems-administered — not a degree programme"],
      ["Postgraduate_Master_Program_in_Endoluminal_Therapeutic_Endoscopy.json", "professional master, latest cycle 2025/26 closed — not a degree programme"],
    ]),
    fileToDept: new Map([
      ["Degree_Course_in_Medicine_and_Surgery.json", { id: 477, level: "bachelor", expectedFixedLevel: "single-cycle" }],
      ["Masters_Degree_in_Data_Analytics_and_Artificial_Intelligence_in_Health_Sciences_DAIHS.json", { id: 918, level: "master" }],
    ]),
    levelFixes: [{ departmentId: 477, from: { level: "bachelor" }, to: { level: "single-cycle", sort_order: 0 } }],
    renames: [],
    newDepartments: new Map([
      ["MEDTEC_School_Medicine_and_Surgery_and_Biomedical_Engineering.json", { name: "MEDTEC School - Medicine and Surgery and Biomedical Engineering", slug: "medtec-school", languages: ["en"], duration_years: 6, level: "single-cycle" }],
      // 2026/27 yeni program; sayfada "pending accreditation" notu var (dossier'de).
      ["Masters_Degree_in_Biotechnologies_for_Human_Health.json", { name: "Biotechnologies for Human Health", slug: "biotechnologies-for-human-health", languages: ["en"], duration_years: 2, level: "master" }],
    ]),
  },
  sassari: {
    universityId: 40,
    resultsDir: "sassari-english-programs/results",
    expectedCount: 3,
    officialDomain: "uniss.it",
    excluded: new Map(),
    fileToDept: new Map(),
    levelFixes: [],
    renames: [],
    // Research found a completely different English offer than the DB seed
    // (the 6 legacy rows are deletion candidates handled separately).
    newDepartments: new Map([
      // Dept/manifesto say fully English but the central catalogue registers
      // Italian+English (one Italian-titled module) -> en+it.
      ["Biotechnology_for_Human_and_Animal_Health_BHAH.json", { name: "Biotechnology for Human and Animal Health", slug: "biotechnology-for-human-and-animal-health", languages: ["en", "it"], duration_years: 2, level: "master" }],
      // Campus is OLBIA (not Sassari city) — the dossier records it.
      ["Innovation_Management_for_Sustainable_Tourism_IMAST.json", { name: "Innovation Management for Sustainable Tourism", slug: "innovation-management-for-sustainable-tourism", languages: ["en"], duration_years: 2, level: "master" }],
      ["Wildlife_Management_Conservation_and_Control_WMCC.json", { name: "Wildlife Management, Conservation and Control", slug: "wildlife-management-conservation-and-control", languages: ["en"], duration_years: 2, level: "master" }],
    ]),
  },
};

const args = process.argv.slice(2);
const schoolIdx = args.indexOf("--school");
const schoolKey = schoolIdx >= 0 ? args[schoolIdx + 1] : null;
const rest = args.filter((a, i) => i !== schoolIdx && i !== schoolIdx + 1);
const mode = parseMode(rest);
if (!schoolKey || !CONFIGS[schoolKey]) {
  console.error(`Usage: --school <${Object.keys(CONFIGS).join("|")}> [--dry-run|--apply]`);
  process.exit(1);
}
const CFG = CONFIGS[schoolKey];
const RESULTS_DIR = resolve(process.cwd(), CFG.resultsDir);
const REPORT_PATH = resolve(OUTPUT_DIR, `${schoolKey}-program-details-import-report.json`);

function parseMode(a) {
  const allowed = new Set(["--dry-run", "--apply"]);
  const unknown = a.filter((x) => !allowed.has(x));
  if (unknown.length > 0) throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  if (a.includes("--dry-run") && a.includes("--apply")) throw new Error("Use either --dry-run or --apply, not both.");
  return a.includes("--apply") ? "apply" : "dry-run";
}

function loadDotenvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function createSupabaseClient() {
  loadDotenvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    mode === "apply"
      ? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(mode === "apply" ? "URL and service key required for --apply." : "URL and anon key required.");
  }
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function humanizeKey(value) {
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function flattenText(value) {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (Array.isArray(value)) {
    const normalized = value.map(flattenText).filter(Boolean);
    return normalized.length > 0 ? normalized.join("\n") : null;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([key]) => !["source_url", "sources"].includes(key))
      .map(([key, itemValue]) => {
        const normalized = flattenText(itemValue);
        return normalized ? `${humanizeKey(key)}: ${normalized}` : null;
      })
      .filter(Boolean);
    return entries.length > 0 ? entries.join("\n") : null;
  }
  return String(value);
}

function extractPrimaryUrl(value, { required = false, field = "", file = "" } = {}) {
  const text = flattenText(value);
  if (!text) {
    if (required) throw new Error(`${file} is missing required URL field: ${field}`);
    return null;
  }
  const urls = (text.match(/https?:\/\/[^\s)"'|,;]+/g) ?? []).map((u) => u.replace(/[.,;:)\]}]+$/, ""));
  const domains = [CFG.officialDomain, ...(CFG.extraDomains ?? [])];
  const official = urls.find((u) => {
    try {
      const host = new URL(u).hostname;
      return domains.some((d) => host.endsWith(d));
    } catch {
      return false;
    }
  });
  const chosen = official ?? urls[0] ?? null;
  if (!chosen && required) throw new Error(`${file} has no extractable URL in ${field}`);
  return chosen;
}

function deriveLevelCategory(value, file) {
  const text = flattenText(value);
  if (!text) throw new Error(`${file} is missing required field: level`);
  const lower = text.toLowerCase();
  if (lower.startsWith("single-cycle") || lower.startsWith("single cycle")) return "single-cycle";
  if (lower.startsWith("master") || lower.startsWith("msc")) return "master";
  if (lower.startsWith("bachelor") || lower.startsWith("bsc")) return "bachelor";
  throw new Error(`${file} has unrecognized level: ${text.slice(0, 80)}`);
}

function normalizeDocumentArray(value, file) {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const flat = flattenText(value);
    if (flat) return [flat];
  }
  if (!Array.isArray(value)) throw new Error(`${file} has invalid required_documents`);
  const items = value.map(flattenText).filter(Boolean);
  // An empty list means the research genuinely found nothing published; keep an
  // honest, clearly-marked placeholder rather than inventing a document list.
  if (items.length === 0) return ["[uncertain] Required documents not published in official sources at research time."];
  return items;
}

function normalizeNotesArray(value, field, file) {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) throw new Error(`${file} has non-array ${field}`);
  return value.map(flattenText).filter(Boolean);
}

function normalizeSourceQuotes(value, officialProgramUrl, file) {
  const list = Array.isArray(value) ? value : typeof value === "string" && value.trim() ? [value] : null;
  if (!list || list.length === 0) throw new Error(`${file} has empty/invalid source_quotes`);
  const quotes = list.flatMap((item) => {
    if (typeof item === "string") {
      const text = item.trim();
      if (!text) return [];
      const urlMatch = text.match(/https?:\/\/[^\s)"'|]+/);
      const url = urlMatch ? urlMatch[0].replace(/[.,;:)\]}]+$/, "") : officialProgramUrl;
      return [{ url, quote: text, field_refs: [], retrieved_at: SOURCE_GENERATED_AT }];
    }
    if (!item || typeof item !== "object") return [];
    const baseQuote = typeof item.quote === "string" ? item.quote.trim() : "";
    const context = flattenText(item.context ?? item.page_or_section);
    const quote = baseQuote && context ? `${baseQuote} [${context}]` : baseQuote;
    const url =
      typeof item.url === "string" && item.url.trim()
        ? item.url.trim()
        : typeof item.source_url === "string" && item.source_url.trim()
          ? item.source_url.trim()
          : officialProgramUrl;
    const refsRaw = item.fields_supported ?? item.field_refs ?? item.field_supported ?? [];
    const fieldRefs = Array.isArray(refsRaw)
      ? refsRaw
      : typeof refsRaw === "string"
        ? refsRaw.split(",").map((s) => s.trim())
        : [];
    if (!quote) return [];
    return [{ url, quote, field_refs: fieldRefs.filter((r) => typeof r === "string" && r.length > 0), retrieved_at: SOURCE_GENERATED_AT }];
  });
  if (quotes.length === 0) throw new Error(`${file} source_quotes normalized to empty`);
  return quotes;
}

function loadSourceFiles() {
  const files = readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  if (files.length !== CFG.expectedCount) {
    throw new Error(`Expected ${CFG.expectedCount} ${schoolKey} source files, found ${files.length}`);
  }
  const skipped = [];
  const sources = [];
  for (const file of files) {
    const record = JSON.parse(readFileSync(join(RESULTS_DIR, file), "utf8"));
    if (CFG.excluded.has(file)) {
      skipped.push({ file, reason: CFG.excluded.get(file) });
      continue;
    }
    const name = record.program_name ?? record.programme_name;
    if (typeof name !== "string" || !name.trim()) throw new Error(`${file} is missing program name`);
    record.__name = name.trim();
    if (!record.teaching_language) throw new Error(`${file} is missing teaching_language`);
    if (!Array.isArray(record.uncertain)) record.uncertain = [];
    sources.push({ file, record, level: deriveLevelCategory(record.level, file) });
  }
  return { sources, skipped };
}

async function fetchDepartments(supabase) {
  const { data, error } = await supabase
    .from("university_departments")
    .select("id,name,slug,level,sort_order")
    .eq("university_id", CFG.universityId);
  if (error) throw new Error(`Failed to fetch departments: ${error.message}`);
  return data ?? [];
}

async function fetchExistingAdmissionDetails(supabase, departmentIds) {
  if (departmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("program_admission_details")
    .select("department_id")
    .eq("university_id", CFG.universityId)
    .in("department_id", departmentIds);
  if (error) throw new Error(`Failed to fetch existing admission details: ${error.message}`);
  return data ?? [];
}

function buildPlan(sources, skipped, departments) {
  const warnings = [];
  const departmentById = new Map(departments.map((d) => [d.id, d]));

  const renames = [];
  for (const rename of CFG.renames) {
    const dept = departmentById.get(rename.id);
    if (!dept) {
      warnings.push(`Rename target department id=${rename.id} not found in DB`);
      continue;
    }
    if (dept.name === rename.to.name) continue;
    renames.push({ id: rename.id, from: { name: dept.name, slug: dept.slug }, to: rename.to });
  }

  const levelFixes = CFG.levelFixes.filter((fix) => {
    const dept = departmentById.get(fix.departmentId);
    if (!dept) {
      warnings.push(`Level-fix target department id=${fix.departmentId} not found in DB`);
      return false;
    }
    return dept.level === fix.from.level;
  });

  const maxSortOrderByLevel = {};
  for (const d of departments) {
    maxSortOrderByLevel[d.level] = Math.max(maxSortOrderByLevel[d.level] ?? 0, d.sort_order ?? 0);
  }

  const departmentInserts = [];
  const resolvedRows = [];
  for (const { file, record, level } of sources) {
    const newSpec = CFG.newDepartments.get(file);
    if (newSpec) {
      if (level !== newSpec.level) {
        warnings.push(`${file}: source level "${level}" does not match planned new-department level "${newSpec.level}"`);
      }
      maxSortOrderByLevel[newSpec.level] = (maxSortOrderByLevel[newSpec.level] ?? 0) + 1;
      departmentInserts.push({
        file,
        insert: { university_id: CFG.universityId, ...newSpec, sort_order: maxSortOrderByLevel[newSpec.level] },
      });
      resolvedRows.push({ file, record, departmentRef: `new:${file}` });
      continue;
    }
    const mapping = CFG.fileToDept.get(file);
    if (!mapping) {
      warnings.push(`No department mapping defined for source file: ${file}`);
      continue;
    }
    const department = departmentById.get(mapping.id);
    if (!department) {
      warnings.push(`${file}: expected department id=${mapping.id} not found in DB`);
      continue;
    }
    const expectedLevel = mapping.expectedFixedLevel ?? mapping.level;
    if (level !== expectedLevel) {
      warnings.push(`${file}: source level "${level}" does not match expected level "${expectedLevel}"`);
    }
    resolvedRows.push({ file, record, departmentRef: mapping.id, departmentName: department.name });
  }

  const coveredIds = new Set([...CFG.fileToDept.values()].map((m) => m.id));
  const uncoveredExisting = departments
    .filter((d) => !coveredIds.has(d.id))
    .map((d) => ({ id: d.id, name: d.name, level: d.level }));

  return {
    school: schoolKey,
    universityId: CFG.universityId,
    sourceFileCount: sources.length,
    skippedSourceFiles: skipped,
    existingDepartmentCount: departments.length,
    levelFixes,
    renames,
    departmentInserts,
    resolvedRows,
    uncoveredExisting,
    warnings,
  };
}

function toDetailPayload(record, departmentId, file) {
  const override = CFG.urlOverrides?.get(file);
  const officialProgramUrl =
    override ?? extractPrimaryUrl(record.official_program_url, { required: true, field: "official_program_url", file });
  return {
    department_id: departmentId,
    university_id: CFG.universityId,
    raw_program_name: record.__name,
    raw_level: flattenText(record.level),
    raw_teaching_language: flattenText(record.teaching_language),
    campus: flattenText(record.campus),
    degree_class: flattenText(record.degree_class),
    admission_type: flattenText(record.admission_type),
    academic_requirements: flattenText(record.academic_requirements),
    language_requirements: flattenText(record.language_requirements),
    application_deadline_eu: flattenText(record.application_deadline_eu),
    application_deadline_non_eu: flattenText(record.application_deadline_non_eu),
    required_documents: normalizeDocumentArray(record.required_documents, file),
    entry_exam_or_test: flattenText(record.entry_exam_or_test),
    tuition_or_fees_link: CFG.tuitionOverrides?.has(file)
      ? CFG.tuitionOverrides.get(file)
      : extractPrimaryUrl(record.tuition_or_fees_link),
    official_program_url: officialProgramUrl,
    official_call_url: extractPrimaryUrl(record.official_call_url),
    source_quotes: normalizeSourceQuotes(record.source_quotes, officialProgramUrl, file),
    uncertain: normalizeNotesArray(record.uncertain, "uncertain", file),
    uncertainty_notes: normalizeNotesArray(record.uncertainty_notes, "uncertainty_notes", file),
    source_file: file,
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function buildPreview(plan) {
  return plan.resolvedRows.map(({ file, record, departmentRef, departmentName }) => {
    try {
      const payload = toDetailPayload(record, typeof departmentRef === "number" ? departmentRef : -1, file);
      return {
        file,
        departmentRef,
        departmentName: departmentName ?? "(yeni)",
        raw_program_name: payload.raw_program_name.slice(0, 80),
        official_program_url: payload.official_program_url,
        source_quotes_count: payload.source_quotes.length,
        required_documents_count: payload.required_documents.length,
        uncertain_count: payload.uncertain.length,
      };
    } catch (error) {
      return { file, departmentRef, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

async function applyPlan(supabase, plan) {
  const fixesApplied = [];
  const renamesApplied = [];
  const insertedDepartmentIdByFile = new Map();
  const departmentIdsTouched = [];
  try {
    for (const fix of plan.levelFixes) {
      const { error } = await supabase
        .from("university_departments")
        .update(fix.to)
        .eq("id", fix.departmentId)
        .eq("university_id", CFG.universityId);
      if (error) throw new Error(`Failed level fix ${fix.departmentId}: ${error.message}`);
      fixesApplied.push(fix);
    }
    for (const rename of plan.renames) {
      const { error } = await supabase
        .from("university_departments")
        .update(rename.to)
        .eq("id", rename.id)
        .eq("university_id", CFG.universityId);
      if (error) throw new Error(`Failed rename ${rename.id}: ${error.message}`);
      renamesApplied.push(rename);
    }
    for (const { file, insert } of plan.departmentInserts) {
      const { data: insertedRows, error: insertError } = await supabase
        .from("university_departments")
        .insert([insert])
        .select("id");
      if (insertError) throw new Error(`Failed to insert department for ${file}: ${insertError.message}`);
      insertedDepartmentIdByFile.set(file, insertedRows[0].id);
    }

    const detailPayloads = plan.resolvedRows.map(({ file, record, departmentRef }) => {
      const departmentId =
        typeof departmentRef === "string" && departmentRef.startsWith("new:")
          ? insertedDepartmentIdByFile.get(file)
          : departmentRef;
      return toDetailPayload(record, departmentId, file);
    });
    departmentIdsTouched.push(...detailPayloads.map((d) => d.department_id));

    const existing = await fetchExistingAdmissionDetails(supabase, departmentIdsTouched);
    if (existing.length > 0) throw new Error(`Refusing: ${existing.length} admission rows already exist for ${schoolKey}.`);

    const { error: insertDetailsError } = await supabase.from("program_admission_details").insert(detailPayloads);
    if (insertDetailsError) throw new Error(`Failed to insert admission details: ${insertDetailsError.message}`);

    return {
      detailInserts: detailPayloads.length,
      insertedDepartmentIds: Object.fromEntries(insertedDepartmentIdByFile),
      levelFixes: fixesApplied.map((f) => f.departmentId),
      renames: renamesApplied.map((r) => r.id),
    };
  } catch (error) {
    if (departmentIdsTouched.length > 0) {
      await supabase
        .from("program_admission_details")
        .delete()
        .eq("university_id", CFG.universityId)
        .in("department_id", departmentIdsTouched);
    }
    if (insertedDepartmentIdByFile.size > 0) {
      await supabase.from("university_departments").delete().in("id", [...insertedDepartmentIdByFile.values()]);
    }
    for (const rename of renamesApplied) {
      await supabase.from("university_departments").update(rename.from).eq("id", rename.id);
    }
    for (const fix of fixesApplied) {
      await supabase.from("university_departments").update(fix.from).eq("id", fix.departmentId);
    }
    throw error;
  }
}

function reportForOutput(plan, applyResult = null) {
  return {
    mode,
    school: plan.school,
    universityId: plan.universityId,
    sourceFileCount: plan.sourceFileCount,
    skippedSourceFiles: plan.skippedSourceFiles,
    existingDepartmentCount: plan.existingDepartmentCount,
    levelFixes: plan.levelFixes,
    renames: plan.renames,
    departmentInserts: plan.departmentInserts.map((d) => ({ file: d.file, name: d.insert.name, languages: d.insert.languages, level: d.insert.level })),
    resolvedRowCount: plan.resolvedRows.length,
    uncoveredExistingDepartments: plan.uncoveredExisting,
    warnings: plan.warnings,
    preview: plan.preview,
    applied: applyResult,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const supabase = createSupabaseClient();
  const { sources, skipped } = loadSourceFiles();
  const departments = await fetchDepartments(supabase);
  const plan = buildPlan(sources, skipped, departments);
  plan.preview = buildPreview(plan);
  plan.warnings.push(...plan.preview.filter((p) => p.error).map((p) => `${p.file}: payload build failed — ${p.error}`));
  let report = reportForOutput(plan);

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (mode === "apply") {
    if (plan.warnings.length > 0) {
      throw new Error(`Refusing --apply because the import plan has warnings: ${plan.warnings.join(" | ")}`);
    }
    const applyResult = await applyPlan(supabase, plan);
    report = reportForOutput(plan, applyResult);
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`[OK] Applied ${applyResult.detailInserts} ${schoolKey} program details.`);
  } else {
    console.log(`[OK] Dry run complete. Review ${basename(REPORT_PATH)} before --apply.`);
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
