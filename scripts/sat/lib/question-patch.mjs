export const WRITABLE_FIELDS = ["prompt", "choices", "needs_review"];
// Istege bagli yazilabilir alan (STATUS #99, 2026-10-02): yalniz paketin `after`'inda varsa yazilir ve
// o zaman `expected_before`'da da bulunmasi sarttir. Uc alanli eski paketler ve yedekler gecerli kalir
// ve bu alana dokunmaz.
export const OPTIONAL_WRITABLE_FIELDS = ["explanation_en"];
export const GUARD_FIELDS = [...WRITABLE_FIELDS, "correct_answer"];

export function normalizeChoices(choices) {
  if (choices === null || choices === undefined) return null;
  return { A: String(choices.A ?? ""), B: String(choices.B ?? ""), C: String(choices.C ?? ""), D: String(choices.D ?? "") };
}

function fieldEqual(field, a, b) {
  if (field === "choices") return JSON.stringify(normalizeChoices(a)) === JSON.stringify(normalizeChoices(b));
  if (field === "correct_answer") return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  return (a ?? null) === (b ?? null);
}

const carries = (object, field) => field in (object ?? {});

// Beklenen eski degerde istege bagli alan varsa o da korunur (canli satir degismisse yazilmaz).
export function rowMatchesExpected(liveRow, expected) {
  const fields = [...GUARD_FIELDS, ...OPTIONAL_WRITABLE_FIELDS.filter((field) => carries(expected, field))];
  return fields.filter((field) => !fieldEqual(field, liveRow[field], expected[field]));
}

// Istege bagli alan yalniz iki tarafta da varsa karsilastirilir.
export function changedFields(expected, after) {
  const fields = [
    ...WRITABLE_FIELDS,
    ...OPTIONAL_WRITABLE_FIELDS.filter((field) => carries(expected, field) && carries(after, field)),
  ];
  return fields.filter((field) => !fieldEqual(field, expected[field], after[field]));
}

// Veritabanina gidecek alanlar: uc temel alan + paketin `after`'inda bulunan istege bagli alanlar.
// Degerler `source`'tan gelir (yazarken `after`, geri alirken yedekteki `before`).
export function writePayload(source, after) {
  const payload = {
    prompt: source.prompt,
    choices: normalizeChoices(source.choices),
    needs_review: source.needs_review,
  };
  for (const field of OPTIONAL_WRITABLE_FIELDS) {
    if (carries(after, field)) payload[field] = source[field] ?? null;
  }
  return payload;
}

export function assertAfterShape(id, after, label = "after") {
  const keys = Object.keys(after ?? {});
  const allowed = new Set([...WRITABLE_FIELDS, ...OPTIONAL_WRITABLE_FIELDS]);
  const missing = WRITABLE_FIELDS.filter((field) => !keys.includes(field));
  const extra = keys.filter((field) => !allowed.has(field));
  if (missing.length || extra.length) {
    throw new Error(
      `${id}: ${label} tam olarak ${WRITABLE_FIELDS.join("/")} tasimali (istege bagli: ${OPTIONAL_WRITABLE_FIELDS.join("/")}; fazla/eksik alan yasak).`
    );
  }
}

export function validatePackage(pkg, expectedProjectRef) {
  if (pkg?.kind !== "sat-question-patch" || pkg.schema_version !== 1) throw new Error("Gecersiz paket kind/schema_version.");
  if (pkg.project_ref !== expectedProjectRef) throw new Error("Paket project_ref pinlenen projeyle eslesmiyor.");
  if (typeof pkg.run_label !== "string" || !pkg.run_label) throw new Error("run_label zorunlu.");
  if (!Array.isArray(pkg.records) || pkg.records.length === 0) throw new Error("records bos olamaz.");
  const ids = new Set();
  for (const record of pkg.records) {
    if (typeof record.id !== "string" || !record.id) throw new Error("Kayit id eksik.");
    if (ids.has(record.id)) throw new Error(`Tekrarli id: ${record.id}`);
    ids.add(record.id);
    for (const field of GUARD_FIELDS) {
      if (!(field in (record.expected_before ?? {}))) throw new Error(`${record.id}: expected_before.${field} eksik.`);
    }
    assertAfterShape(record.id, record.after);
    if ("correct_answer" in record.after) throw new Error(`${record.id}: correct_answer yazilamaz.`);
    if (typeof record.after.needs_review !== "boolean") throw new Error(`${record.id}: after.needs_review boolean olmali.`);
    for (const field of OPTIONAL_WRITABLE_FIELDS) {
      if (!carries(record.after, field)) continue;
      if (!carries(record.expected_before, field)) {
        throw new Error(`${record.id}: after.${field} yaziliyorsa expected_before.${field} zorunlu.`);
      }
      if (typeof record.after[field] !== "string" || !record.after[field].trim()) {
        throw new Error(`${record.id}: after.${field} bos olmayan metin olmali.`);
      }
    }
    if (changedFields(record.expected_before, record.after).length === 0) {
      throw new Error(`${record.id}: expected_before ile after ayni; anlamsiz kayit.`);
    }
  }
  return ids;
}
