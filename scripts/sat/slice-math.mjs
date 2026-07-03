import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import sharp from "sharp";
import { FORMATTED_ROOT, HEX_ID, OUT_ROOT, ensureOutDirs, listPdfsRecursive, parseFileName, slugify, writeJson } from "./lib.mjs";

const MATH_ROOT = join(FORMATTED_ROOT, "Math");
const DPI = 150;
const SCALE = DPI / 72; // bbox koordinatları 72dpi point cinsinden
const PAD_TOP = 14;     // soru numarasının hafif üstünden başla (point)

ensureOutDirs();
const manifest = [];
const problems = [];

for (const pdfPath of listPdfsRecursive(MATH_ROOT)) {
  const fileName = basename(pdfPath);
  const skill = basename(dirname(pdfPath));
  const domain = basename(dirname(dirname(pdfPath)));
  const { difficulty } = parseFileName(fileName);

  // 1) bbox XML'inden kelime koordinatları
  const bboxOut = join(OUT_ROOT, "_bbox.xml");
  execFileSync("pdftotext", ["-bbox", pdfPath, bboxOut]);
  const xml = readFileSync(bboxOut, "utf8");

  const pages = [...xml.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)];

  // 2) sayfaları PNG'ye çevir (tek seferde)
  const ppmPrefix = join(OUT_ROOT, "_page");
  execFileSync("pdftoppm", ["-png", "-r", String(DPI), pdfPath, ppmPrefix]);

  for (let p = 0; p < pages.length; p++) {
    const [, , hStr, pageXml] = pages[p];
    const pageH = Number(hStr);
    const words = [...pageXml.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]+)<\/word>/g)]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]), text: m[5] }));

    const numbers = words.filter((w) => /^\d+\.\d+$/.test(w.text)).sort((a, b) => a.y - b.y);
    if (numbers.length === 0) continue;

    // pdftoppm dosya adı sayfa sayısına göre sıfır dolgulu olabilir
    const pageNum = p + 1;
    const candidates = [
      `${ppmPrefix}-${pageNum}.png`,
      `${ppmPrefix}-${String(pageNum).padStart(2, "0")}.png`,
      `${ppmPrefix}-${String(pageNum).padStart(3, "0")}.png`,
    ];
    const pagePng = candidates.find((c) => existsSync(c));
    if (!pagePng) { problems.push({ fileName, page: pageNum, reason: "png yok" }); continue; }

    const meta = await sharp(pagePng).metadata();

    for (let i = 0; i < numbers.length; i++) {
      const num = numbers[i];
      // aynı satırdaki (y toleransı 6pt) hex id kelimesi
      const idWord = words.find((w) => HEX_ID.test(w.text) && Math.abs(w.y - num.y) < 6);
      if (!idWord) { problems.push({ fileName, page: pageNum, number: num.text, reason: "id eslesmedi" }); continue; }

      const top = Math.max(0, Math.round((num.y - PAD_TOP) * SCALE));
      const nextY = i + 1 < numbers.length ? numbers[i + 1].y - PAD_TOP : pageH;
      const bottom = Math.min(meta.height, Math.round(nextY * SCALE));
      if (bottom - top < 40) { problems.push({ fileName, page: pageNum, number: num.text, reason: "bolge cok kucuk" }); continue; }

      const outPath = join(OUT_ROOT, "math-images", `${idWord.text}.png`);
      await sharp(pagePng)
        .extract({ left: 0, top, width: meta.width, height: bottom - top })
        .toFile(outPath);

      manifest.push({
        id: idWord.text,
        section: "math",
        domain,
        skill,
        skill_slug: slugify(skill),
        difficulty,
        source_file: fileName,
        image: `math-images/${idWord.text}.png`,
      });
    }
  }

  // sayfa PNG'lerini temizle
  for (let n = 1; n <= pages.length + 1; n++) {
    for (const c of [`${ppmPrefix}-${n}.png`, `${ppmPrefix}-${String(n).padStart(2, "0")}.png`, `${ppmPrefix}-${String(n).padStart(3, "0")}.png`]) {
      try { rmSync(c); } catch {}
    }
  }
}

writeJson(join(OUT_ROOT, "math-manifest.json"), { manifest, problems });
console.log(`Math soru gorseli: ${manifest.length}, sorun: ${problems.length}`);
if (problems.length > 0) {
  for (const problem of problems.slice(0, 15)) console.log("  SORUN", JSON.stringify(problem));
}
