import { basename, join } from "node:path";
import { ANSWERS_ROOT, FORMATTED_ROOT, HEX_ID, OUT_ROOT, ensureOutDirs, listPdfsRecursive, pdftotext, writeJson } from "./lib.mjs";

const LETTER = /^[A-D]$/;
const NUMERIC = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:\/\d+)?$/;

const answers = {};        // id -> { answer: string[], keyFile: string }
const anomalies = [];      // elle bakılacaklar
const perFileCounts = {};

// id satırından sonra cevabı bul: "Answer" sütun başlığını atla, harf ya da
// virgülle (çok satıra bölünebilen) sayısal liste kabul et.
function parseAnswerAfter(lines, idIndex) {
  let j = idIndex + 1;
  if (lines[j] === "Answer") j++;

  const candidate = lines[j] ?? "";
  if (LETTER.test(candidate)) return [candidate];

  const parts = [];
  let k = j;
  while (k < lines.length) {
    const line = lines[k];
    const endsWithComma = line.endsWith(",");
    const pieces = line.split(",").map((p) => p.trim()).filter(Boolean);
    if (pieces.length === 0 || !pieces.every((p) => NUMERIC.test(p))) break;
    parts.push(...pieces);
    k++;
    if (!endsWithComma) return parts;
  }
  return null;
}

for (const pdfPath of listPdfsRecursive(ANSWERS_ROOT)) {
  const fileName = basename(pdfPath);
  const lines = pdftotext(pdfPath)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!HEX_ID.test(lines[i])) continue;
    const id = lines[i];
    const accepted = parseAnswerAfter(lines, i);

    if (!accepted) {
      anomalies.push({ keyFile: fileName, id, sawLine: lines[i + 1] ?? "" });
      continue;
    }
    if (answers[id]) {
      // Anahtar dosyalar superset olabildiğinden aynı id birden çok dosyada çıkar;
      // cevap aynıysa sorun yok, farklıysa elle bakılmalı.
      if (answers[id].answer.join("|") !== accepted.join("|")) {
        anomalies.push({ keyFile: fileName, id, sawLine: `CONFLICT: ${answers[id].answer.join(",")} vs ${accepted.join(",")}` });
      }
      continue;
    }
    answers[id] = { answer: accepted, keyFile: fileName };
    count++;
  }
  perFileCounts[fileName] = count;
}

// Eksik anahtar dosyası tespiti: Formatted soru PDF'leri ile kıyasla.
// Bazı soru dosyalarının adı "-" ile başlıyor (ör. "-Command of Evidence 1.pdf");
// eşleştirmede baştaki tireleri yok say.
const normalizeName = (name) => name.replace(/^-+/, "").trim();
const questionFiles = listPdfsRecursive(FORMATTED_ROOT)
  .filter((p) => !p.includes("/Answers/"))
  .map((p) => normalizeName(basename(p).replace(/\.pdf$/, "")));
const keyFiles = new Set(Object.keys(perFileCounts).map((f) => normalizeName(f.replace(/~Key\.pdf$/, ""))));
const missingKeys = questionFiles.filter((q) => !keyFiles.has(q));

ensureOutDirs();
writeJson(join(OUT_ROOT, "answers.json"), { answers, anomalies, perFileCounts, missingKeys });
console.log(`Toplam cevap: ${Object.keys(answers).length}`);
console.log(`Anomali: ${anomalies.length}`);
console.log(`Eksik anahtar dosyasi: ${missingKeys.join(", ") || "yok"}`);
