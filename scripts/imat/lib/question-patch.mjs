// IMAT soru yama paketinin kurallari (plan 2026-10-08, Gorev 12). scripts/sat/lib/question-patch.mjs ile ayni
// API; farklar: siklar A-E (bes sik da zorunlu), dogru cevap tek harf, paket bicimi
// { project_ref, table: "imat_questions", created_at, items: [{ id, expected, after }] }.
// Yazilabilen alanlar yalniz prompt/choices/needs_review; correct_answer yazilmaz, yalniz korunur.
import { createHash } from "node:crypto";

export const TABLE = "imat_questions";
export const FIGURE_BUCKET = "imat-figures";
export const CHOICE_KEYS = Object.freeze(["A", "B", "C", "D", "E"]);
export const WRITABLE_FIELDS = ["prompt", "choices", "needs_review"];
// SAT'taki explanation_en karsiligi yok (IMAT bankasinda aciklama alani yok).
export const OPTIONAL_WRITABLE_FIELDS = [];
export const GUARD_FIELDS = [...WRITABLE_FIELDS, "correct_answer"];

const PACKAGE_KEYS = ["project_ref", "table", "created_at", "items"];
const ITEM_KEYS = ["id", "expected", "after"];
const ID_PATTERN = /^[0-9a-f]{8}$/;

// Tam olarak A-E, hepsi metin; sirali ve kirpilmis kopya doner. Eksik/fazla sik hata.
export function normalizeChoices(choices, label = "choices") {
  if (!choices || typeof choices !== "object" || Array.isArray(choices)) throw new Error(`${label}: A-E siklari nesnesi olmali.`);
  const extra = Object.keys(choices).filter((key) => !CHOICE_KEYS.includes(key));
  if (extra.length) throw new Error(`${label}: A-E disi sik: ${extra.join(", ")}`);
  const normalized = {};
  for (const key of CHOICE_KEYS) {
    if (!(key in choices)) throw new Error(`${label}: ${key} sikki eksik.`);
    if (typeof choices[key] !== "string") throw new Error(`${label}.${key}: sik metin olmali.`);
    normalized[key] = choices[key].trim();
  }
  return normalized;
}

// Karsilastirma birebirdir (kirpma yok): canlidaki deger ile beklenen ayni degilse yazi olmaz.
// Bozuk canli sik nesnesi hata degil, fark sayilir.
function choicesKey(choices) {
  if (!choices || typeof choices !== "object") return JSON.stringify(choices ?? null);
  return JSON.stringify([Object.keys(choices).sort(), ...CHOICE_KEYS.map((key) => choices[key] ?? null)]);
}

function fieldEqual(field, a, b) {
  if (field === "choices") return choicesKey(a) === choicesKey(b);
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function rowMatchesExpected(liveRow, expected) {
  return GUARD_FIELDS.filter((field) => !fieldEqual(field, liveRow?.[field], expected?.[field]));
}

export function changedFields(expected, after) {
  return WRITABLE_FIELDS.filter((field) => !fieldEqual(field, expected?.[field], after?.[field]));
}

// Veritabanina gidecek alanlar; degerler `source`'tan (yazarken `after`, geri alirken yedekteki `before`).
// SAT'taki ikinci parametre (istege bagli alanlar) burada gereksiz; verilirse yok sayilir.
export function writePayload(source) {
  return {
    prompt: source.prompt,
    choices: normalizeChoices(source.choices),
    needs_review: source.needs_review,
  };
}

export function assertAfterShape(id, after, label = "after") {
  const keys = Object.keys(after ?? {});
  const missing = WRITABLE_FIELDS.filter((field) => !keys.includes(field));
  const extra = keys.filter((field) => !WRITABLE_FIELDS.includes(field));
  if (missing.length || extra.length) {
    throw new Error(`${id}: ${label} tam olarak ${WRITABLE_FIELDS.join("/")} tasimali (fazla/eksik alan yasak).`);
  }
}

function assertExactKeys(object, keys, label) {
  const actual = Object.keys(object ?? {});
  const missing = keys.filter((key) => !actual.includes(key));
  const extra = actual.filter((key) => !keys.includes(key));
  if (missing.length || extra.length) {
    throw new Error(`${label} tam olarak ${keys.join("/")} alanlarini tasimali (eksik: ${missing.join(",") || "-"}; fazla: ${extra.join(",") || "-"}).`);
  }
}

export function validatePackage(pkg, expectedProjectRef) {
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) throw new Error("Paket bir nesne olmali.");
  if (pkg.project_ref !== expectedProjectRef) throw new Error("Paket project_ref pinlenen projeyle eslesmiyor.");
  if (pkg.table !== TABLE) throw new Error(`Paket table "${TABLE}" olmali.`);
  if (typeof pkg.created_at !== "string" || Number.isNaN(Date.parse(pkg.created_at))) throw new Error("Paket created_at ISO tarih olmali.");
  assertExactKeys(pkg, PACKAGE_KEYS, "Paket");
  if (!Array.isArray(pkg.items) || pkg.items.length === 0) throw new Error("Paket items bos olamaz.");
  const ids = new Set();
  for (const entry of pkg.items) {
    if (typeof entry?.id !== "string" || !ID_PATTERN.test(entry.id)) throw new Error(`Gecersiz id: ${JSON.stringify(entry?.id)}`);
    if (ids.has(entry.id)) throw new Error(`Tekrarli id: ${entry.id}`);
    ids.add(entry.id);
    assertExactKeys(entry, ITEM_KEYS, `${entry.id}: kayit`);
    assertExactKeys(entry.expected, GUARD_FIELDS, `${entry.id}: expected`);
    normalizeChoices(entry.expected.choices, `${entry.id}: expected.choices`);
    if (!CHOICE_KEYS.includes(entry.expected.correct_answer)) throw new Error(`${entry.id}: expected.correct_answer A-E tek harf olmali.`);
    if (typeof entry.expected.needs_review !== "boolean") throw new Error(`${entry.id}: expected.needs_review boolean olmali.`);
    assertAfterShape(entry.id, entry.after);
    if (typeof entry.after.prompt !== "string" || !entry.after.prompt.trim()) throw new Error(`${entry.id}: after.prompt bos olmayan metin olmali.`);
    const normalized = normalizeChoices(entry.after.choices, `${entry.id}: after.choices`);
    if (choicesKey(normalized) !== choicesKey(entry.after.choices)) {
      throw new Error(`${entry.id}: after.choices kirpilmis metin olmali (bas/son bosluk yazilmaz).`);
    }
    if (typeof entry.after.needs_review !== "boolean") throw new Error(`${entry.id}: after.needs_review boolean olmali.`);
    if (changedFields(entry.expected, entry.after).length === 0) throw new Error(`${entry.id}: expected ile after ayni; anlamsiz kayit.`);
  }
  return ids;
}

// Canli okuma hatasini acik mesaja cevirir: tablo yoksa (sema uygulanmamis) ne yapilacagi yazilir.
export function liveReadError(error, table = TABLE) {
  const message = error?.message ?? String(error);
  if (error?.code === "42P01" || error?.code === "PGRST205" || /does not exist|schema cache/i.test(message)) {
    return new Error(`${table}: tablo canlida yok; once supabase/imat_bank.sql uygulanmali (Kerem onayiyla). Canli hata: ${message}`);
  }
  return new Error(`${table} okuma hatasi: ${message}`);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

// Hedef disi satirlarin degismedigini kanitlamak icin sirali ozet.
export function hashRows(rows) {
  return sha256(stableJson([...rows].sort((left, right) => String(left.id).localeCompare(String(right.id)))));
}

// Dosya adi icin zaman damgasi: 2026-10-08T12:34:56.789Z -> 20261008T123456Z.
export function fileStamp(now) {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}
