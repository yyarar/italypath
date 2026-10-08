// IMAT alt konu siniflama dogrulayicisi (plan 2026-10-08 Gorev 11). Salt yerel: ag yok, veritabani yok.
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/validate-topics.mjs
//
// Girdi: classify/package-NN.json (build-classify-packages.mjs) ve classify/result-NN.json
// [{ id, section, topicSlug, confidence: 0..1, reason }]. Kurallar (her ihlal hata):
// - paketteki her id icin tam bir sonuc; sonuc kendi numarali paketinin id'sini tasir (result-03 -> package-03);
// - topicSlug taksonomide ve secilen bolumun konusu; bolum paketteki bolumle ayni (yalniz sectionChoice kaydinda
//   reading-general/logic arasi secim serbest); confidence 0-1 sayi; reason dolu metin.
// confidence < 0.7 -> konu <bolum>-general (dusuk eminlik sayilir). Hicbir pakette olmayan id uyari (eski dalga).
// Cikti: hata yoksa classify/topics.json { "<id>": { section, topicSlug } } (id sirasi; bu paketlerde olmayan eski
// kayitlar korunur); her durumda classify/validate-report.json (bolum/konu sayimi, dusuk eminlik, hatalar).
// Hata varsa topics.json degismez ve cikis 1. Konsol ve rapor soru metni tasimaz.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { findTopic, generalSlug, topicsForSection } from "../../lib/imat/taxonomy.mjs";
import { CLASSIFY_DIR, readJson, writeJson } from "./paths.mjs";

const GK_LR = ["reading-general", "logic"];
const MIN_CONFIDENCE = 0.7;
const TOPICS_PATH = join(CLASSIFY_DIR, "topics.json");
const REPORT_PATH = join(CLASSIFY_DIR, "validate-report.json");

const argv = process.argv.slice(2);
if (argv.length > 0) {
  console.error(`Bilinmeyen arguman: ${argv[0]} (validate-topics.mjs arguman almaz; IMAT_OUT ile calisir)`);
  process.exit(2);
}

const errors = [];
const warnings = [];

function numbered(pattern) {
  if (!existsSync(CLASSIFY_DIR)) return [];
  return readdirSync(CLASSIFY_DIR)
    .map((name) => ({ name, match: name.match(pattern) }))
    .filter((entry) => entry.match)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({ name: entry.name, n: Number(entry.match[1]) }));
}

// ------------------------------------------------------------------ paketler
const packaged = new Map();
const packageFiles = numbered(/^package-(\d+)\.json$/);
if (packageFiles.length === 0) errors.push(`paket yok (${CLASSIFY_DIR}); once build-classify-packages.mjs`);
for (const { name, n } of packageFiles) {
  const data = readJson(join(CLASSIFY_DIR, name));
  for (const q of data?.questions ?? []) {
    if (packaged.has(q.id)) errors.push(`${q.id}: iki pakette (${packaged.get(q.id).file}, ${name})`);
    packaged.set(q.id, { file: name, n, section: q.section, sectionChoice: q.sectionChoice === true });
  }
}

// ------------------------------------------------------------------ sonuclar
const assigned = new Map();
const lowConfidence = [];
const resultFiles = numbered(/^result-(\d+)\.json$/);
let unknown = 0;
for (const { name, n } of resultFiles) {
  const entries = readJson(join(CLASSIFY_DIR, name));
  if (!Array.isArray(entries)) {
    errors.push(`${name}: dizi degil`);
    continue;
  }
  entries.forEach((entry, index) => {
    const at = `${name}[${index}] ${entry?.id}`;
    const pack = packaged.get(entry?.id);
    if (!pack) {
      unknown += 1;
      warnings.push(`${at}: hicbir pakette yok (eski dalga ya da yanlis id); atlandi`);
      return;
    }
    if (pack.n !== n) {
      errors.push(`${at}: id ${pack.file} paketinde, sonuc ${name} dosyasinda (paketler sonuctan sonra yeniden kurulmus olabilir)`);
      return;
    }
    if (assigned.has(entry.id)) {
      errors.push(`${at}: ayni id icin ikinci sonuc`);
      return;
    }
    const problems = [];
    const section = entry.section;
    if (pack.sectionChoice) {
      if (!GK_LR.includes(section)) problems.push(`bolum ${section} (reading-general ya da logic olmali)`);
    } else if (section !== pack.section) {
      problems.push(`bolum ${section}, paket ${pack.section} (bolum degistirilemez)`);
    }
    const topic = findTopic(entry.topicSlug);
    if (!topic) problems.push(`topicSlug ${entry.topicSlug} taksonomide yok`);
    else if (topic.section !== section) problems.push(`topicSlug ${entry.topicSlug} ${topic.section} bolumunde, secilen bolum ${section}`);
    const confidence = entry.confidence;
    if (typeof confidence !== "number" || !(confidence >= 0 && confidence <= 1)) problems.push(`confidence ${JSON.stringify(confidence)} (0-1 sayi)`);
    if (typeof entry.reason !== "string" || !entry.reason.trim()) problems.push("reason bos");
    if (problems.length > 0) {
      errors.push(`${at}: ${problems.join("; ")}`);
      return;
    }
    let slug = entry.topicSlug;
    if (confidence < MIN_CONFIDENCE) {
      slug = generalSlug(section);
      lowConfidence.push({ id: entry.id, section, chosen: entry.topicSlug, confidence });
    }
    assigned.set(entry.id, { section, topicSlug: slug, sectionChanged: section !== pack.section });
  });
}
const missing = [...packaged.keys()].filter((id) => !assigned.has(id)).sort();
if (missing.length > 0) errors.push(`${missing.length} paketli sorunun sonucu yok: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? " ..." : ""}`);

// ------------------------------------------------------------------ cikti
const previous = existsSync(TOPICS_PATH) ? readJson(TOPICS_PATH) : {};
const kept = Object.keys(previous).filter((id) => !packaged.has(id));
const bySection = {};
for (const { section, topicSlug } of assigned.values()) {
  const entry = (bySection[section] ??= { total: 0, topics: Object.fromEntries(topicsForSection(section).map((topic) => [topic.slug, 0])) });
  entry.total += 1;
  entry.topics[topicSlug] += 1;
}
const ok = errors.length === 0;
if (ok) {
  const merged = { ...Object.fromEntries(kept.map((id) => [id, previous[id]])) };
  for (const [id, { section, topicSlug }] of assigned) merged[id] = { section, topicSlug };
  writeJson(TOPICS_PATH, Object.fromEntries(Object.keys(merged).sort().map((id) => [id, merged[id]])));
}
writeJson(REPORT_PATH, {
  ok,
  topicsWritten: ok,
  minConfidence: MIN_CONFIDENCE,
  packageFiles: packageFiles.map((entry) => entry.name),
  resultFiles: resultFiles.map((entry) => entry.name),
  counts: {
    packaged: packaged.size,
    classified: assigned.size,
    lowConfidence: lowConfidence.length,
    sectionChanged: [...assigned.values()].filter((entry) => entry.sectionChanged).length,
    keptFromPrevious: ok ? kept.length : 0,
    unknownIds: unknown,
    errors: errors.length,
    warnings: warnings.length,
  },
  bySection,
  lowConfidence,
  errors,
  warnings,
});

console.log(`Siniflama: ${packaged.size} paketli, ${assigned.size} gecerli sonuc, ${lowConfidence.length} dusuk eminlik (< ${MIN_CONFIDENCE} -> general), ${unknown} paketsiz id`);
for (const [section, entry] of Object.entries(bySection)) {
  const used = Object.entries(entry.topics).filter(([, n]) => n > 0).map(([slug, n]) => `${slug} ${n}`).join(", ");
  console.log(`  ${section} ${entry.total}: ${used}`);
}
for (const message of errors.slice(0, 10)) console.log(`HATA ${message}`);
if (errors.length > 10) console.log(`... ${errors.length - 10} hata daha (${REPORT_PATH})`);
console.log(ok ? `topics.json: ${assigned.size} + ${kept.length} eski kayit -> ${TOPICS_PATH}` : `topics.json degismedi (${errors.length} hata) | rapor ${REPORT_PATH}`);
if (!ok) process.exitCode = 1;
