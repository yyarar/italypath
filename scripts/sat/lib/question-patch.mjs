export const WRITABLE_FIELDS = ["prompt", "choices", "needs_review"];
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

export function rowMatchesExpected(liveRow, expected) {
  return GUARD_FIELDS.filter((field) => !fieldEqual(field, liveRow[field], expected[field]));
}

export function changedFields(expected, after) {
  return WRITABLE_FIELDS.filter((field) => !fieldEqual(field, expected[field], after[field]));
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
    const afterKeys = Object.keys(record.after ?? {}).sort();
    if (afterKeys.join(",") !== [...WRITABLE_FIELDS].sort().join(",")) {
      throw new Error(`${record.id}: after tam olarak ${WRITABLE_FIELDS.join("/")} tasimali (fazla/eksik alan yasak).`);
    }
    if ("correct_answer" in record.after) throw new Error(`${record.id}: correct_answer yazilamaz.`);
    if (typeof record.after.needs_review !== "boolean") throw new Error(`${record.id}: after.needs_review boolean olmali.`);
    if (changedFields(record.expected_before, record.after).length === 0) {
      throw new Error(`${record.id}: expected_before ile after ayni; anlamsiz kayit.`);
    }
  }
  return ids;
}
