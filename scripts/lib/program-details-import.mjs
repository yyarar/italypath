// import-*-program-details betiklerinin ve tek seferlik kabul dosyasi yazicilarinin ortak
// guvenlik katmani (2026-09-26, guvenlik denetimi G2#5, G2#6, G3#1, G3#2, G3#4, G3#5).
//
// Her yazici:
// - istemciyi createImportClient() ile kurar: --apply yalnizca --project-ref kskbnxxyviowmrlskwke
//   ile ve .env.local'daki Supabase adresi bu projeye aitse calisir (assertTarget);
// - program_admission_details'e yazmadan once prepareAdmissionWrite() cagirir: link alanlari
//   temizlenir (cumle uncertainty_notes'a tasinir), host'lar lib/officialLinkHosts.mjs izin
//   listesiyle denetlenir, serbest metin taranir, uzunluk sinirlari uygulanir ve kuru calistirmada
//   canli satirla tam metin farki output/ altina yazilir; engelleyici sorun varsa --apply durur;
// - basarili --apply sonrasi recordImportManifest() ile supabase/import-manifests/ altina kucuk,
//   izlenen bir manifest birakir.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import {
  classifyOfficialLink,
  isAllowedOfficialLinkStatus,
  parseHttpUrl,
} from "../../lib/officialLinkHosts.mjs";

export const LIVE_PROJECT_REF = "kskbnxxyviowmrlskwke";
export const URL_FIELDS = ["official_program_url", "official_call_url", "tuition_or_fees_link"];
export const MANIFEST_DIR = "supabase/import-manifests";

const URL_FIELD_NOTE_LABELS = {
  official_program_url: "Programme page link note",
  official_call_url: "Call for applications link note",
  tuition_or_fees_link: "Tuition and fees link note",
};

// Alan basina uzunluk siniri (karakter). 2026-09-26 canli verisindeki en uzun degerlerin
// ustunde secildi (en uzun alinti 24.891, en uzun not 13.728, en uzun kabul sarti 12.675).
export const FIELD_LIMITS = Object.freeze({
  text: {
    raw_program_name: 10000,
    raw_level: 10000,
    raw_teaching_language: 10000,
    campus: 10000,
    degree_class: 10000,
    admission_type: 10000,
    academic_requirements: 20000,
    language_requirements: 20000,
    application_deadline_eu: 10000,
    application_deadline_non_eu: 10000,
    entry_exam_or_test: 10000,
    source_file: 512,
  },
  arrays: {
    required_documents: { items: 100, itemLength: 10000 },
    uncertain: { items: 200, itemLength: 6000 },
    uncertainty_notes: { items: 100, itemLength: 20000 },
  },
  sourceQuotes: { items: 150, quoteLength: 30000 },
});

// Serbest metin uyarilari: engellemez, kuru calistirma raporunda gosterilir.
const FREE_TEXT_PATTERNS = [
  { kind: "phone", pattern: /(?<![\w+])\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,5}){2,5}\b|\btel[:.]?\s*\+?\d[\d\s.\/-]{6,}\d/i },
  { kind: "messaging", pattern: /whats\s?app|\bwa\.me\b|telegram|\bt\.me\//i },
  { kind: "html", pattern: /<\s*\/?\s*(?:script|iframe|object|embed|style|img|svg|form|input|meta|link|a)\b|\bon[a-z]+\s*=\s*["']|javascript:/i },
  {
    kind: "instruction",
    pattern:
      /ignore (?:all |any )?(?:the )?(?:previous|prior|above|earlier) (?:instructions?|prompts?|rules?)|disregard (?:all |the )?(?:previous|prior|above)|system prompt|you are (?:now )?(?:an? |the )?(?:ai|assistant|language model|chatbot)|as an ai\b|do not (?:tell|inform) the (?:user|student)|<\|im_start\|>|\[\/?INST\]/i,
  },
];

// ---------------------------------------------------------------------------
// Arguman, hedef ve istemci

/**
 * --dry-run | --apply, --project-ref <ref> ve betige ozel bayraklari ayristirir.
 * valueFlags: deger alan ek bayraklar (ornegin ["--school"]).
 */
export function parseImportArgs(argv, { valueFlags = [], booleanFlags = [] } = {}) {
  const values = {};
  const flags = new Set();
  let projectRef = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [name, inlineValue] = arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    if (name === "--dry-run" || name === "--apply" || booleanFlags.includes(name)) {
      if (inlineValue !== undefined) throw new Error(`${name} does not take a value`);
      flags.add(name);
      continue;
    }
    if (name === "--project-ref" || valueFlags.includes(name)) {
      const value = inlineValue ?? argv[index + 1];
      if (inlineValue === undefined) index += 1;
      if (!value || value.startsWith("--")) throw new Error(`${name} needs a value`);
      if (name === "--project-ref") projectRef = value;
      else values[name] = value;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (flags.has("--dry-run") && flags.has("--apply")) throw new Error("Use either --dry-run or --apply, not both.");
  return { mode: flags.has("--apply") ? "apply" : "dry-run", projectRef, values, flags };
}

/** Supabase adresinin proje kimligi (https://<ref>.supabase.co). */
export function projectRefFromSupabaseUrl(supabaseUrl) {
  let host;
  try {
    host = new URL(supabaseUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(host);
  return match ? match[1] : null;
}

/**
 * Canli yazma yalnizca bilincli hedefe: --apply icin --project-ref zorunlu ve hem beklenen canli
 * proje kimligine hem de .env.local'daki Supabase adresine esit olmalidir. Kuru calistirmada
 * --project-ref verilmisse o da ayni sekilde denetlenir.
 */
export function assertTarget({ mode, projectRef, supabaseUrl, expectedProjectRef = LIVE_PROJECT_REF }) {
  const urlRef = projectRefFromSupabaseUrl(supabaseUrl);
  if (mode === "apply" && !projectRef) {
    throw new Error(`--apply requires --project-ref ${expectedProjectRef} (the write target must be named explicitly).`);
  }
  if (projectRef == null) return;
  if (projectRef !== expectedProjectRef) {
    throw new Error(`--project-ref ${projectRef} is not the live project ${expectedProjectRef}; refusing to continue.`);
  }
  if (urlRef !== projectRef) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL points to project "${urlRef ?? "unknown"}", not ${projectRef}; refusing to continue.`);
  }
}

export function loadDotenvLocal(cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

/**
 * Katalog okumalari server-only SUPABASE_SECRET_KEY ile (anon anahtara donulmez); --apply'da
 * yazma icin once SUPABASE_SECRET_KEY, yoksa SUPABASE_SERVICE_ROLE_KEY. Hedef assertTarget ile
 * denetlenir. clientFactory yalniz cevrimdisi testler icindir (sahte istemci; hedef denetimi yine
 * burada calisir); yazicilar bu parametreyi vermez.
 */
export function createImportClient({ mode, projectRef, clientFactory = createClient }) {
  loadDotenvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    mode === "apply"
      ? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      mode === "apply"
        ? "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required for --apply."
        : "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required (catalog reads use the server-only secret key)."
    );
  }
  assertTarget({ mode, projectRef, supabaseUrl });
  return clientFactory(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ---------------------------------------------------------------------------
// Link alanlari

function trimUrlCandidate(candidate) {
  let value = candidate;
  for (;;) {
    const last = value.at(-1);
    if (!last) return value;
    if (".,;:!?'\"»”’>]}".includes(last)) {
      value = value.slice(0, -1);
      continue;
    }
    if (last === ")") {
      const opens = (value.match(/\(/g) ?? []).length;
      const closes = (value.match(/\)/g) ?? []).length;
      if (closes > opens) {
        value = value.slice(0, -1);
        continue;
      }
    }
    return value;
  }
}

/** Serbest metindeki http(s) adaylari, yazildigi sirayla (gecersizler atlanir). */
export function extractHttpUrls(text) {
  if (typeof text !== "string") return [];
  const matches = text.match(/https?:\/\/[^\s<>"'`|]+/gi) ?? [];
  return matches.map(trimUrlCandidate).filter((candidate) => parseHttpUrl(candidate));
}

function isBlockedUrl(value) {
  return classifyOfficialLink(value).status === "blocked";
}

function hasMeaningfulProse(text, removedUrl) {
  const rest = (removedUrl ? text.split(removedUrl).join(" ") : text)
    .replace(/\[\s*uncertain\s*\]/gi, " ")
    .replace(/\b(?:not specified|not found|not available|n\/a|none|unknown)\b/gi, " ")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
  return /\p{L}/u.test(rest);
}

/**
 * Tek bir link alani: gecerli http(s) ise aynen kalir; icinde cumle varsa ilk kullanilabilir URL
 * (kisaltici/arsiv degil) alinir ve metnin tamami not olarak doner; URL yoksa deger null olur.
 */
export function sanitizeLinkValue(value, field) {
  if (value == null) return { value: null, note: null, markUncertain: false, changed: false };
  const original = String(value);
  const trimmed = original.trim();
  if (!trimmed) return { value: null, note: null, markUncertain: false, changed: original !== "" };
  if (parseHttpUrl(trimmed) && !isBlockedUrl(trimmed)) {
    return { value: trimmed, note: null, markUncertain: false, changed: trimmed !== original };
  }
  const chosen = extractHttpUrls(trimmed).find((candidate) => !isBlockedUrl(candidate)) ?? null;
  const note = hasMeaningfulProse(trimmed, chosen) || (!chosen && extractHttpUrls(trimmed).length > 0)
    ? `${URL_FIELD_NOTE_LABELS[field] ?? "Source link note"}: ${trimmed}`
    : null;
  return {
    value: chosen,
    note,
    markUncertain: !chosen || /\[\s*uncertain\s*\]/i.test(trimmed),
    changed: true,
  };
}

function pushUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

/** Resmi kaynak olarak gosterilmeyen alinti linki icin not basligi (asil kaynak acikca yazilir). */
export function describeUnofficialSource(rawUrl) {
  const value = String(rawUrl ?? "").trim();
  if (!value) return "Source excerpt without a source link; not shown as an official source";
  const archived = archivedOriginalUrl(value);
  if (archived || /^https?:\/\/(?:[\w-]+\.)*archive\.(?:org|ph|today|is|li)\//i.test(value)) {
    return `Source excerpt read from an archived copy (${value})${archived ? ` of ${archived}` : ""}, not from the live official page; not shown as an official source`;
  }
  if (/^https?:\/\/(?:forms\.gle|docs\.google\.com\/forms)\//i.test(value)) {
    return `Source excerpt read from a Google Form (${value}); not shown as an official source`;
  }
  if (parseHttpUrl(value) && isBlockedUrl(value)) {
    return `Source excerpt read from a short link (${value}); not shown as an official source`;
  }
  return `Source excerpt without a usable source link (${value}); not shown as an official source`;
}

/** web.archive.org/web/<zaman>/<asil adres> -> asil adres (kullanilabilirse). */
export function archivedOriginalUrl(value) {
  const match = /^https?:\/\/(?:web\.)?archive\.org\/web\/[^/]+\/(https?:\/\/\S+)$/i.exec(String(value ?? "").trim());
  if (!match) return null;
  const original = trimUrlCandidate(match[1]);
  return parseHttpUrl(original) && !isBlockedUrl(original) ? original : null;
}

/**
 * Bir kabul dosyasi satirindaki dort link turunu temizler (3 URL alani + source_quotes[].url).
 * Doner: { payload, changes } — payload yeni nesnedir, girdi degismez.
 */
export function sanitizeDetailLinks(input) {
  const payload = structuredClone(input);
  const changes = [];
  const notes = Array.isArray(payload.uncertainty_notes) ? [...payload.uncertainty_notes] : [];
  const uncertain = Array.isArray(payload.uncertain) ? [...payload.uncertain] : [];
  const originalFieldTexts = new Set(
    URL_FIELDS.map((field) => (typeof input[field] === "string" ? input[field].trim() : null)).filter(Boolean)
  );

  for (const field of URL_FIELDS) {
    if (!(field in payload)) continue;
    const result = sanitizeLinkValue(payload[field], field);
    if (!result.changed) continue;
    changes.push({ field, before: payload[field], after: result.value, note: result.note });
    payload[field] = result.value;
    pushUnique(notes, result.note);
    if (result.markUncertain) pushUnique(uncertain, field);
  }

  if (Array.isArray(payload.source_quotes)) {
    const kept = [];
    payload.source_quotes.forEach((quote, index) => {
      const rawUrl = typeof quote?.url === "string" ? quote.url.trim() : "";
      const field = `source_quotes[${index}].url`;
      if (parseHttpUrl(rawUrl) && !isBlockedUrl(rawUrl)) {
        kept.push(rawUrl === quote.url ? quote : { ...quote, url: rawUrl });
        return;
      }
      const chosen = extractHttpUrls(rawUrl).find((candidate) => !isBlockedUrl(candidate)) ?? null;
      if (chosen && !parseHttpUrl(rawUrl)) {
        kept.push({ ...quote, url: chosen });
        const linkNote = hasMeaningfulProse(rawUrl, chosen) && !originalFieldTexts.has(rawUrl) ? `Source link note: ${rawUrl}` : null;
        pushUnique(notes, linkNote);
        changes.push({ field, before: quote.url, after: chosen, note: linkNote });
        return;
      }
      // Kisaltici/arsiv linki veya kullanilabilir linki olmayan alinti resmi bir sayfaya baglanmaz
      // (Kerem karari, 2026-09-26: alinti resmi sayfada dogrulanamiyorsa baglama). Alinti
      // kaybolmadan nota tasinir; notta asil kaynagin ne oldugu acikca yazar.
      const excerptNote = `${describeUnofficialSource(rawUrl)}: ${typeof quote?.quote === "string" ? quote.quote : ""}`.trim();
      pushUnique(notes, excerptNote);
      changes.push({ field: `source_quotes[${index}]`, before: quote, after: null, note: excerptNote });
    });
    payload.source_quotes = kept;
  }

  if ("uncertainty_notes" in payload || notes.length > 0) payload.uncertainty_notes = notes;
  if ("uncertain" in payload || uncertain.length > 0) payload.uncertain = uncertain;
  return { payload, changes };
}

/** Satirdaki tum linklerin izin listesi sonucu. */
export function collectLinkChecks(payload) {
  const context = { universityId: payload.university_id, departmentId: payload.department_id ?? null };
  const checks = [];
  for (const field of URL_FIELDS) {
    if (payload[field] == null) continue;
    checks.push({ field, value: payload[field], ...classifyOfficialLink(payload[field], context) });
  }
  (Array.isArray(payload.source_quotes) ? payload.source_quotes : []).forEach((quote, index) => {
    checks.push({ field: `source_quotes[${index}].url`, value: quote?.url, ...classifyOfficialLink(quote?.url, context) });
  });
  return checks;
}

// ---------------------------------------------------------------------------
// Serbest metin ve uzunluk

function textEntries(payload) {
  const entries = [];
  for (const field of Object.keys(FIELD_LIMITS.text)) {
    if (typeof payload[field] === "string") entries.push([field, payload[field]]);
  }
  for (const field of Object.keys(FIELD_LIMITS.arrays)) {
    (Array.isArray(payload[field]) ? payload[field] : []).forEach((item, index) => {
      if (typeof item === "string") entries.push([`${field}[${index}]`, item]);
    });
  }
  (Array.isArray(payload.source_quotes) ? payload.source_quotes : []).forEach((quote, index) => {
    if (typeof quote?.quote === "string") entries.push([`source_quotes[${index}].quote`, quote.quote]);
  });
  return entries;
}

export function scanFreeText(payload) {
  const warnings = [];
  for (const [field, text] of textEntries(payload)) {
    for (const { kind, pattern } of FREE_TEXT_PATTERNS) {
      const match = pattern.exec(text);
      if (match) warnings.push({ field, kind, excerpt: text.slice(Math.max(0, match.index - 40), match.index + match[0].length + 40) });
    }
  }
  return warnings;
}

export function checkFieldLengths(payload) {
  const problems = [];
  for (const [field, limit] of Object.entries(FIELD_LIMITS.text)) {
    if (typeof payload[field] === "string" && payload[field].length > limit) problems.push(`${field} is ${payload[field].length} chars (limit ${limit})`);
  }
  for (const [field, limit] of Object.entries(FIELD_LIMITS.arrays)) {
    const list = payload[field];
    if (list == null) continue;
    if (!Array.isArray(list)) {
      problems.push(`${field} must be an array`);
      continue;
    }
    if (list.length > limit.items) problems.push(`${field} has ${list.length} items (limit ${limit.items})`);
    list.forEach((item, index) => {
      if (typeof item !== "string") problems.push(`${field}[${index}] must be a string`);
      else if (item.length > limit.itemLength) problems.push(`${field}[${index}] is ${item.length} chars (limit ${limit.itemLength})`);
    });
  }
  const quotes = payload.source_quotes;
  if (quotes != null) {
    if (!Array.isArray(quotes)) problems.push("source_quotes must be an array");
    else {
      if (quotes.length > FIELD_LIMITS.sourceQuotes.items) problems.push(`source_quotes has ${quotes.length} items (limit ${FIELD_LIMITS.sourceQuotes.items})`);
      quotes.forEach((quote, index) => {
        const length = typeof quote?.quote === "string" ? quote.quote.length : 0;
        if (length > FIELD_LIMITS.sourceQuotes.quoteLength) problems.push(`source_quotes[${index}].quote is ${length} chars (limit ${FIELD_LIMITS.sourceQuotes.quoteLength})`);
      });
    }
  }
  return problems;
}

/** Tek satir icin tam denetim: temizlenmis satir, engelleyici sorunlar ve uyarilar. */
export function guardDetailPayload(input) {
  const { payload, changes } = sanitizeDetailLinks(input);
  const label = `dept ${payload.department_id ?? "(new)"} (university ${payload.university_id})`;
  const blocking = [];
  if (!Number.isInteger(payload.university_id)) blocking.push(`${label}: university_id is missing`);
  if (!parseHttpUrl(payload.official_program_url)) blocking.push(`${label}: official_program_url has no usable http(s) link`);
  for (const check of collectLinkChecks(payload)) {
    if (!isAllowedOfficialLinkStatus(check.status)) {
      blocking.push(`${label}: ${check.field} host "${check.host ?? check.value}" is ${check.status} (not on the lib/officialLinkHosts.mjs allowlist)`);
    }
  }
  for (const problem of checkFieldLengths(payload)) blocking.push(`${label}: ${problem}`);
  const warnings = scanFreeText(payload).map((warning) => `${label}: ${warning.kind} pattern in ${warning.field}: …${warning.excerpt}…`);
  return { payload, changes, blocking, warnings };
}

// ---------------------------------------------------------------------------
// Kaynak dosyasi ve manifest

export function sha256File(absolutePath) {
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

/** source_file degeri: depo kokune gore klasor + dosya adi + icerik ozeti. */
export function sourceFileRef(absolutePath, repoRoot = process.cwd()) {
  const path = relative(repoRoot, resolve(absolutePath)).split("\\").join("/");
  return `${path}#sha256=${sha256File(absolutePath).slice(0, 16)}`;
}

function hostsOf(payload) {
  return [...new Set(collectLinkChecks(payload).map((check) => check.host).filter(Boolean))].sort();
}

export function buildManifest(scriptName, payloads, { projectRef = LIVE_PROJECT_REF, mode } = {}) {
  return {
    script: scriptName,
    mode,
    project_ref: projectRef,
    generated_at: new Date().toISOString(),
    rows: payloads
      .map((payload) => ({
        department_id: payload.department_id ?? null,
        university_id: payload.university_id,
        official_program_url: payload.official_program_url ?? null,
        official_call_url: payload.official_call_url ?? null,
        tuition_or_fees_link: payload.tuition_or_fees_link ?? null,
        hosts: hostsOf(payload),
        source_file: payload.source_file ?? null,
      }))
      .sort((a, b) => (a.department_id ?? 0) - (b.department_id ?? 0)),
  };
}

/** Basarili --apply sonrasi izlenen manifest (supabase/import-manifests/<tarih>-<betik>.json). */
export function recordImportManifest(scriptName, payloads, { projectRef } = {}) {
  const dir = resolve(process.cwd(), MANIFEST_DIR);
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${new Date().toISOString().slice(0, 10)}-${scriptName}.json`);
  writeFileSync(path, `${JSON.stringify(buildManifest(scriptName, payloads, { projectRef, mode: "apply" }), null, 2)}\n`);
  return relative(process.cwd(), path);
}

// ---------------------------------------------------------------------------
// Tam metin farki

const DIFF_FIELDS = [
  "university_id",
  "raw_program_name",
  "raw_level",
  "raw_teaching_language",
  "campus",
  "degree_class",
  "admission_type",
  "academic_requirements",
  "language_requirements",
  "application_deadline_eu",
  "application_deadline_non_eu",
  "required_documents",
  "entry_exam_or_test",
  "tuition_or_fees_link",
  "official_program_url",
  "official_call_url",
  "source_quotes",
  "uncertain",
  "uncertainty_notes",
  "source_file",
];

function toLines(value) {
  if (value == null) return [];
  if (typeof value === "string") return value.split("\n");
  return JSON.stringify(value, null, 2).split("\n");
}

/** Satir bazli LCS farki; her satir tam metniyle yazilir (kisaltma yok). */
export function diffLines(beforeLines, afterLines) {
  const n = beforeLines.length;
  const m = afterLines.length;
  const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i][j] = beforeLines[i] === afterLines[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (beforeLines[i] === afterLines[j]) {
      out.push(`  ${beforeLines[i]}`);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push(`- ${beforeLines[i]}`);
      i += 1;
    } else {
      out.push(`+ ${afterLines[j]}`);
      j += 1;
    }
  }
  while (i < n) out.push(`- ${beforeLines[i++]}`);
  while (j < m) out.push(`+ ${afterLines[j++]}`);
  return out;
}

export function formatDetailDiff(before, after) {
  const header = `### dept ${after.department_id ?? "(new department)"} · university ${after.university_id}${before ? "" : " · NEW ROW"}`;
  const sections = [];
  for (const field of DIFF_FIELDS) {
    if (!(field in after) && !(before && field in before)) continue;
    const beforeValue = before ? before[field] ?? null : null;
    const afterValue = field in after ? after[field] ?? null : beforeValue;
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) continue;
    sections.push(`#### ${field}\n${diffLines(toLines(beforeValue), toLines(afterValue)).join("\n")}`);
  }
  return sections.length > 0 ? `${header}\n${sections.join("\n")}` : `${header}\n(no change)`;
}

async function fetchExistingRows(supabase, departmentIds) {
  const ids = departmentIds.filter((id) => Number.isInteger(id));
  const rows = [];
  for (let start = 0; start < ids.length; start += 200) {
    const { data, error } = await supabase
      .from("program_admission_details")
      .select(DIFF_FIELDS.concat("department_id").join(","))
      .in("department_id", ids.slice(start, start + 200));
    if (error) throw new Error(`Failed to read existing admission rows for the diff: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return new Map(rows.map((row) => [row.department_id, row]));
}

/**
 * Yazma aninda son kontrol (dosya yazmaz): kesin department_id'lerle satirlari yeniden temizler
 * ve denetler; engelleyici sorun varsa hata firlatir. applyPlan icinde insert/upsert'ten hemen
 * once cagrilir; donen satirlar yazilir.
 */
export function finalizeAdmissionPayloads(payloads) {
  const guarded = payloads.map((payload) => guardDetailPayload(payload));
  const blocking = guarded.flatMap((result) => result.blocking);
  if (blocking.length > 0) {
    throw new Error(`Refusing to write admission details: ${blocking.slice(0, 10).join(" | ")}${blocking.length > 10 ? ` | … ${blocking.length - 10} more` : ""}`);
  }
  return guarded.map((result) => result.payload);
}

/**
 * Yazmadan once (ve kuru calistirmada) tum kabul dosyasi satirlarini denetler.
 * - Her zaman: output/<betik>-program-details-dry-run-diff.txt (tam metin farki) ve
 *   output/<betik>-program-details-dry-run-manifest.json yazilir; ozet konsola basilir.
 * - mode "apply" iken engelleyici sorun varsa hata firlatilir (yazma yapilmaz).
 * Doner: temizlenmis satirlar (yazmada bunlar kullanilmali).
 */
export async function prepareAdmissionWrite(supabase, payloads, { mode, scriptName, compareWithLive = true }) {
  const guarded = payloads.map((payload) => guardDetailPayload(payload));
  const blocking = guarded.flatMap((result) => result.blocking);
  const warnings = guarded.flatMap((result) => result.warnings);
  const linkChanges = guarded.reduce((total, result) => total + result.changes.length, 0);
  const cleaned = guarded.map((result) => result.payload);

  const outputDir = resolve(process.cwd(), "output");
  mkdirSync(outputDir, { recursive: true });
  const existing = compareWithLive ? await fetchExistingRows(supabase, cleaned.map((payload) => payload.department_id)) : new Map();
  const diffText = [
    `# ${scriptName} · ${mode} · ${new Date().toISOString()}`,
    `rows: ${cleaned.length} · link fixes: ${linkChanges} · blocking: ${blocking.length} · warnings: ${warnings.length}`,
    ...(blocking.length ? ["", "## BLOCKING", ...blocking.map((line) => `- ${line}`)] : []),
    ...(warnings.length ? ["", "## WARNINGS", ...warnings.map((line) => `- ${line}`)] : []),
    "",
    "## DIFF (live row -> row to write)",
    ...cleaned.map((payload) => formatDetailDiff(existing.get(payload.department_id) ?? null, payload)),
  ].join("\n");
  const diffPath = resolve(outputDir, `${scriptName}-program-details-dry-run-diff.txt`);
  writeFileSync(diffPath, `${diffText}\n`);
  const manifestPath = resolve(outputDir, `${scriptName}-program-details-dry-run-manifest.json`);
  writeFileSync(manifestPath, `${JSON.stringify(buildManifest(scriptName, cleaned, { mode }), null, 2)}\n`);

  console.log(
    `[guard] ${scriptName}: ${cleaned.length} rows, ${linkChanges} link fixes, ${blocking.length} blocking, ${warnings.length} warnings. Full diff: ${relative(process.cwd(), diffPath)}`
  );
  for (const line of blocking) console.log(`[guard][BLOCKING] ${line}`);
  for (const line of warnings.slice(0, 20)) console.log(`[guard][warning] ${line}`);
  if (warnings.length > 20) console.log(`[guard][warning] … ${warnings.length - 20} more in the diff file`);

  if (mode === "apply" && blocking.length > 0) {
    throw new Error(`Refusing --apply: ${blocking.length} blocking problem(s); see ${relative(process.cwd(), diffPath)}.`);
  }
  return cleaned;
}
