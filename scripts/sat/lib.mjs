import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const SOURCE_ROOT =
  process.env.SAT_BANK_SRC ?? join(homedir(), "Desktop", "SAT Question Bank PDFs");
export const FORMATTED_ROOT = join(SOURCE_ROOT, "Question Bank (Formatted)");
export const UNFORMATTED_ROOT = join(SOURCE_ROOT, "Question Bank (Unformatted)");
export const ANSWERS_ROOT = join(FORMATTED_ROOT, "Answers");
export const OUT_ROOT = resolve(process.cwd(), "tmp", "sat-bank");

export function ensureOutDirs() {
  for (const dir of [OUT_ROOT, join(OUT_ROOT, "math-images"), join(OUT_ROOT, "math-questions"), join(OUT_ROOT, "figures")]) {
    mkdirSync(dir, { recursive: true });
  }
}

export function pdftotext(pdfPath, extraArgs = []) {
  return execFileSync("pdftotext", [...extraArgs, pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function listPdfsRecursive(root) {
  const results = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (statSync(full).isDirectory()) results.push(...listPdfsRecursive(full));
    else if (entry.endsWith(".pdf")) results.push(full);
  }
  return results.sort();
}

export function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "Linear Functions 1.pdf" -> { topic: "Linear Functions", difficulty: 1 }
export function parseFileName(fileName) {
  const match = fileName.replace(/\.pdf$/, "").replace(/~Key$/, "").match(/^(.*)\s(\d)$/);
  if (!match) throw new Error(`Beklenmeyen dosya adi: ${fileName}`);
  return { topic: match[1], difficulty: Number(match[2]) };
}

export const HEX_ID = /^[0-9a-f]{8}$/;
