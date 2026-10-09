// IMAT alt konu siniflama paketleri (plan 2026-10-08 Gorev 11). Ajan her soruya aday listesinden tek bir alt konu
// secer (runbook docs/superpowers/specs/assets/imat-classify-prompt.md), sonucu classify/result-NN.json'a yazar;
// validate-topics.mjs dogrulayip classify/topics.json'u kurar (validate-bank.mjs topic/topic_slug kaynagi).
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/build-classify-packages.mjs --years 2023,2024,2025 [--size 30] [--split-gk-lr] [--bank <yol>]
//
// Kayit: { id, section, prompt, choices, figure (WebP mutlak yolu ya da null), candidates: [{ slug, label }] }; aday
// listesi taxonomy.mjs topicsForSection(section) (bolumun general kutusu dahil). Cevap, karistirma izi ve kaynak girmez.
// Bolum secimi (sectionChoice: true): iki bolumun (reading-general, logic) adaylari birlikte verilir ({ slug, label,
// section }); ajan bolumu de secer ve secilen adayin bolumunu yazar. Yalniz deneme yili olmayan soruda:
// - bolumu birlesik "gk-lr" olan soru (2011-2022 cikarimi: kagittaki "General Knowledge and Logical Reasoning"; paths.mjs
//   GK_LR_SECTION): her zaman, bayrak gerekmez (baska turlu siniflanamaz); paket kaydinda section "gk-lr" kalir;
// - --split-gk-lr (varsayilan kapali): bolumu zaten reading-general/logic olan soru da.
// Deneme yillarinda (2023-2025) bolum kagit sirasindan gelir ve hicbir kosulda degismez (gk-lr orada gecersiz bolum).
// Paketler: grup (bolum; birlesik GK/LR tek grup) basina, grup icinde yil/numara sirasi, en cok --size soruluk esit
// dilimler; grup sirasi kagit bolum sirasi. Yeniden calistirma ayni dosyalari yazar; result-*.json'a dokunmaz.
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import { MOCK_YEARS, SECTIONS, topicsForSection } from "../../lib/imat/taxonomy.mjs";
import { CHOICE_KEYS, figureAbsPath, parseCliArgs, positiveInt, readBank } from "./gate-imat.mjs";
import { BANK_PATH, CLASSIFY_DIR, GK_LR_SECTION, GK_LR_SECTIONS as GK_LR, pad2, parseYears, writeJson } from "./paths.mjs";

const GK_LR_GROUP = GK_LR.join("+");

const packageName = (index) => `package-${pad2(index + 1)}.json`;

function candidatesFor(sectionChoice, section) {
  if (sectionChoice) return GK_LR.flatMap((s) => topicsForSection(s).map((topic) => ({ slug: topic.slug, label: topic.label, section: s })));
  return topicsForSection(section).map((topic) => ({ slug: topic.slug, label: topic.label }));
}

function main() {
  const args = parseCliArgs(process.argv.slice(2), { values: ["--years", "--size", "--bank"], booleans: ["--split-gk-lr"] });
  const years = parseYears(args.values["--years"]);
  const size = positiveInt(args.values["--size"] ?? 30, "--size");
  const splitGkLr = args.flags.has("--split-gk-lr");
  const bankPath = path.resolve(args.values["--bank"] ?? BANK_PATH);
  const bank = readBank(bankPath, { allowCombinedSection: true }).filter((record) => years.includes(record.year));
  if (bank.length === 0) throw new Error(`Secilen yillarda soru yok: ${years.join(", ")}`);

  const groups = new Map([[GK_LR_GROUP, []], ...SECTIONS.map((section) => [section, []])]);
  for (const record of [...bank].sort((a, b) => a.year - b.year || a.number - b.number)) {
    const sectionChoice =
      !MOCK_YEARS.includes(record.year) && (record.section === GK_LR_SECTION || (splitGkLr && GK_LR.includes(record.section)));
    groups.get(sectionChoice ? GK_LR_GROUP : record.section).push({
      id: record.id,
      section: record.section,
      ...(sectionChoice ? { sectionChoice: true } : {}),
      prompt: record.prompt,
      choices: Object.fromEntries(CHOICE_KEYS.map((key) => [key, record.choices[key]])),
      figure: figureAbsPath(record),
      candidates: candidatesFor(sectionChoice, record.section),
    });
  }

  const packages = [];
  for (const [group, items] of groups) {
    const count = Math.ceil(items.length / size);
    for (let index = 0, start = 0; index < count; index += 1) {
      const end = start + Math.floor(items.length / count) + (index < items.length % count ? 1 : 0);
      packages.push({ group, items: items.slice(start, end) });
      start = end;
    }
  }

  mkdirSync(CLASSIFY_DIR, { recursive: true });
  const keep = new Set(packages.map((_, index) => packageName(index)));
  for (const name of readdirSync(CLASSIFY_DIR)) {
    if (/^package-\d+\.json$/.test(name) && !keep.has(name)) rmSync(path.join(CLASSIFY_DIR, name));
  }
  packages.forEach(({ group, items }, index) => {
    writeJson(path.join(CLASSIFY_DIR, packageName(index)), { package: index + 1, group, count: items.length, questions: items });
  });
  const manifest = {
    bank: bankPath,
    years,
    bank_count: bank.length,
    size,
    split_gk_lr: splitGkLr,
    result_file_rule: "package-NN.json -> result-NN.json: [{ id, section, topicSlug, confidence: 0..1, reason }]",
    files: packages.map(({ group, items }, index) => ({
      file: packageName(index),
      group,
      count: items.length,
      section_choice: items.filter((item) => item.sectionChoice).length,
      ids: items.map((item) => item.id),
    })),
  };
  writeJson(path.join(CLASSIFY_DIR, "manifest.json"), manifest);

  console.log(`Siniflama paketleri: ${packages.length} paket, ${bank.length} soru (${years.join(", ")}) -> ${CLASSIFY_DIR}`);
  console.log(`Paketler: ${packages.map(({ group, items }) => `${group} ${items.length}`).join(" | ")}`);
  const choice = manifest.files.reduce((sum, file) => sum + file.section_choice, 0);
  if (splitGkLr || choice > 0) console.log(`Bolum secimi istenen (birlesik GK/LR): ${choice} soru`);
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
