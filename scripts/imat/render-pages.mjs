// IMAT sayfa goruntuleri (plan Gorev 9): pdftoppm 200 dpi PNG -> pages/<yil>/p-NN.png (NN iki haneli, 1 tabanli).
// Her cikarma ve denetim adiminin referansi bu goruntulerdir.
//
//   PATH=/usr/local/bin:$PATH IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank node scripts/imat/render-pages.mjs --years 2023,2024,2025 [--force]
//
// Var olan sayfa atlanir (--force yeniden cizer). Kaynak klasore yazilmaz.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

import { checkInventory } from "./inventory.mjs";
import { PAGES_DIR, PAGE_DPI, argValue, pagePath, parseYears, sourcePdf } from "./paths.mjs";

function renderYear(year, pages, force) {
  const dir = join(PAGES_DIR, String(year));
  mkdirSync(dir, { recursive: true });
  const missing = [];
  for (let page = 1; page <= pages; page += 1) {
    if (force || !existsSync(pagePath(year, page))) missing.push(page);
  }
  if (missing.length === 0) return { rendered: 0, skipped: pages };
  // pdftoppm sayfa numarasini kendi basamagiyla yazar; gecici klasorde cizip p-NN adina tasinir.
  const work = mkdtempSync(join(dir, ".render-"));
  try {
    for (const page of missing) {
      execFileSync("pdftoppm", ["-r", String(PAGE_DPI), "-png", "-f", String(page), "-l", String(page), "-singlefile", sourcePdf(year), join(work, "page")]);
      renameSync(join(work, "page.png"), pagePath(year, page));
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  return { rendered: missing.length, skipped: pages - missing.length };
}

function main() {
  const argv = process.argv.slice(2);
  const years = parseYears(argValue(argv, "--years"));
  const force = argv.includes("--force");
  const inventory = new Map(checkInventory().map((entry) => [entry.year, entry]));
  let total = 0;
  for (const year of years) {
    const { pages } = inventory.get(year);
    const result = renderYear(year, pages, force);
    const files = readdirSync(join(PAGES_DIR, String(year))).filter((name) => /^p-\d{2}\.png$/.test(name)).length;
    if (files !== pages) throw new Error(`${year}: ${files} PNG, beklenen ${pages}`);
    total += files;
    console.log(`${year}: ${pages} sayfa (cizilen ${result.rendered}, atlanan ${result.skipped})`);
  }
  console.log(`Toplam ${total} PNG -> ${PAGES_DIR}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
