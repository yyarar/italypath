import { readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { OUT_ROOT, readJson, writeJson } from "./lib.mjs";

const questionsDir = join(OUT_ROOT, "math-questions");
const problems = [];
let cropped = 0;

// Istege bagli argv filtresi: dosya adlari verilirse yalnizca onlari isler.
// Paralel extraction surerken cakismayi onlemek icin kullanilir:
//   node scripts/sat/crop-figures.mjs linear-functions-1.json percentages-3.json
const only = new Set(process.argv.slice(2));

for (const file of readdirSync(questionsDir).filter((f) => f.endsWith(".json"))) {
  if (only.size > 0 && !only.has(file)) continue;
  const questions = readJson(join(questionsDir, file));
  let changed = false;

  for (const q of questions) {
    if (!q.figure || q.figure_path) continue;
    const imagePath = join(OUT_ROOT, "math-images", `${q.id}.png`);
    const [x0, y0, x1, y1] = q.figure.bbox;

    try {
      const meta = await sharp(imagePath).metadata();
      const left = Math.round(x0 * meta.width);
      const top = Math.round(y0 * meta.height);
      const width = Math.round((x1 - x0) * meta.width);
      const height = Math.round((y1 - y0) * meta.height);
      if (width < 20 || height < 20) throw new Error("bbox cok kucuk");

      const outPath = join(OUT_ROOT, "figures", `${q.id}.webp`);
      await sharp(imagePath).extract({ left, top, width, height }).webp({ quality: 82 }).toFile(outPath);
      q.figure_path = `figures/${q.id}.webp`;
      changed = true;
      cropped++;
    } catch (error) {
      problems.push({ id: q.id, file, reason: String(error) });
      q.needs_review = true;
    }
  }

  if (changed) writeJson(join(questionsDir, file), questions);
}

writeJson(join(OUT_ROOT, "figure-crop-report.json"), { cropped, problems });
console.log(`Kirpilan figur: ${cropped}, sorun: ${problems.length}`);
