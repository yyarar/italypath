// Reading and Writing kaynak envanteri (plan Gorev 2): 60 formatsiz PDF'in goreli yolu, boyutu, sha256'si ve
// sayfa sayisi. extract_rw.py baslarken bu dosyayi dogrular; kaynak degismisse durur.
//
//   PATH=/usr/local/bin:$PATH SAT_BANK_OUT=/Users/keremyarar/italypath-main/tmp/sat-bank/rw node scripts/sat/rw/inventory-rw.mjs
//   ... node scripts/sat/rw/inventory-rw.mjs --check   (kayitli envanterle karsilastirir; fark varsa cikis 1)
//
// Kaynak klasore yazilmaz. Sayfa sayisi poppler `pdfinfo` ile okunur.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { listPdfsRecursive, SOURCE_ROOT, writeJson } from "../lib.mjs";
import { RW_KEYS_ROOT, RW_OUT, RW_QUESTIONS_ROOT } from "./paths.mjs";

const INVENTORY = join(RW_OUT, "source-inventory.json");
const EXPECTED_PER_SET = 30;
const check = process.argv.includes("--check");

function pageCount(path) {
  const info = execFileSync("pdfinfo", [path], { encoding: "utf8" });
  const match = info.match(/^Pages:\s+(\d+)$/m);
  if (!match) throw new Error(`pdfinfo sayfa sayisi vermedi: ${path}`);
  return Number(match[1]);
}

function describe(path) {
  const bytes = readFileSync(path);
  return {
    // Yol ayiraci her zaman "/" (envanter makineler arasi karsilastirilabilsin).
    path: relative(SOURCE_ROOT, path).split(sep).join("/"),
    bytes: statSync(path).size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    pages: pageCount(path),
  };
}

function buildInventory() {
  const keys = listPdfsRecursive(RW_KEYS_ROOT);
  const questions = listPdfsRecursive(RW_QUESTIONS_ROOT);
  if (keys.length !== EXPECTED_PER_SET || questions.length !== EXPECTED_PER_SET) {
    throw new Error(`Beklenen 30 + 30 PDF, bulunan ${keys.length} + ${questions.length}`);
  }
  const files = [...keys, ...questions].map(describe).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { files };
}

const current = buildInventory();

if (check) {
  if (!existsSync(INVENTORY)) {
    console.error(`Envanter yok: ${INVENTORY}`);
    process.exit(1);
  }
  const saved = JSON.parse(readFileSync(INVENTORY, "utf8"));
  const savedByPath = new Map(saved.files.map((f) => [f.path, f]));
  const currentByPath = new Map(current.files.map((f) => [f.path, f]));
  const problems = [];
  for (const [path, f] of currentByPath) {
    const s = savedByPath.get(path);
    if (!s) {
      problems.push(`yeni dosya: ${path}`);
      continue;
    }
    for (const key of ["bytes", "sha256", "pages"]) {
      if (s[key] !== f[key]) problems.push(`${path}: ${key} ${s[key]} -> ${f[key]}`);
    }
  }
  for (const path of savedByPath.keys()) {
    if (!currentByPath.has(path)) problems.push(`eksik dosya: ${path}`);
  }
  if (problems.length > 0) {
    console.error(`Envanter uyusmuyor (${problems.length}):\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`Envanter tutuyor: ${current.files.length} dosya (${INVENTORY})`);
} else {
  mkdirSync(RW_OUT, { recursive: true });
  writeJson(INVENTORY, current);
  const pages = current.files.reduce((sum, f) => sum + f.pages, 0);
  console.log(`Yazildi: ${INVENTORY} (${current.files.length} dosya, ${pages} sayfa)`);
}
