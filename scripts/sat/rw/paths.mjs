// Reading and Writing boru hattinin ortak yollari (plan: docs/superpowers/plans/2026-10-03-sat-reading-writing-import-plan.md).
// Cikti koku: SAT_BANK_OUT verilmisse o, yoksa cwd'ye gore tmp/sat-bank/rw. Worktree'den calisirken
// ana klasordeki tmp/sat-bank/rw mutlak yoluyla verilir (worktree silinince ciktilar kaybolmasin).
import { join, resolve } from "node:path";

import { FORMATTED_ROOT, UNFORMATTED_ROOT } from "../lib.mjs";

export const RW_OUT = process.env.SAT_BANK_OUT
  ? resolve(process.env.SAT_BANK_OUT)
  : resolve(process.cwd(), "tmp", "sat-bank", "rw");

// Formatsiz surum: gercek metin katmani. Anahtar dosyalari soru + dogru cevap + Rationale + zorluk tasir.
export const RW_KEYS_ROOT = join(UNFORMATTED_ROOT, "Answer Keys", "Reading and Writing");
export const RW_QUESTIONS_ROOT = join(UNFORMATTED_ROOT, "Reading and Writing");
// Formatli surum: soru govdesi resim; yalniz ikinci goz ve ikinci cevap anahtari olarak kullanilir.
export const RW_FORMATTED_QUESTIONS_ROOT = join(FORMATTED_ROOT, "Reading and Writing");
export const RW_FORMATTED_KEYS_ROOT = join(FORMATTED_ROOT, "Answers", "Reading and Writing");
