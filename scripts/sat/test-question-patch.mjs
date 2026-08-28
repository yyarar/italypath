import assert from "node:assert/strict";
import { changedFields, normalizeChoices, rowMatchesExpected, validatePackage } from "./lib/question-patch.mjs";

const base = {
  prompt: "old $x$", choices: { A: "1", B: "2", C: "3", D: "4" },
  needs_review: false, correct_answer: ["A"],
};
const record = (over = {}) => ({
  id: "abc12345",
  expected_before: { ...base },
  after: { prompt: "new $x$", choices: { A: "1", B: "2", C: "3", D: "4" }, needs_review: false },
  ...over,
});
const pkg = (records) => ({ kind: "sat-question-patch", schema_version: 1, project_ref: "kskbnxxyviowmrlskwke", run_label: "t", records });

assert.doesNotThrow(() => validatePackage(pkg([record()]), "kskbnxxyviowmrlskwke"), "gecerli paket gecmeli");
assert.throws(() => validatePackage(pkg([record()]), "baska-proje"), /project_ref/, "yanlis proje reddedilmeli");
assert.throws(() => validatePackage(pkg([record(), record()]), "kskbnxxyviowmrlskwke"), /Tekrarli/, "duplicate id reddedilmeli");
assert.throws(
  () => validatePackage(pkg([record({ after: { prompt: "x", choices: null, needs_review: false, correct_answer: ["B"] } })]), "kskbnxxyviowmrlskwke"),
  /tasimali|yazilamaz/, "after'a fazla alan reddedilmeli"
);
assert.throws(
  () => validatePackage(pkg([record({ after: { prompt: base.prompt, choices: base.choices, needs_review: false } })]), "kskbnxxyviowmrlskwke"),
  /ayni/, "no-op kayit reddedilmeli"
);

assert.deepEqual(rowMatchesExpected({ ...base }, base), [], "eslesen satir bos donmeli");
assert.deepEqual(rowMatchesExpected({ ...base, correct_answer: ["B"] }, base), ["correct_answer"], "cevap farki yakalanmali");
assert.deepEqual(rowMatchesExpected({ ...base, prompt: "changed" }, base), ["prompt"], "prompt farki yakalanmali");
assert.deepEqual(changedFields(base, { prompt: base.prompt, choices: base.choices, needs_review: true }), ["needs_review"], "flag-only diff dogru");
assert.equal(normalizeChoices(null), null, "spr choices null kalmali");

console.log("test-question-patch PASS");
