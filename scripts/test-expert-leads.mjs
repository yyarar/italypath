import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const expertLeadsPath = path.join(root, "lib", "mentor", "expertLeads.ts");
const validationPath = path.join(
  root,
  "lib",
  "mentor",
  "expertLeadValidation.ts",
);

async function importHelpers() {
  const tempDir = await mkdtemp(path.join(tmpdir(), "expert-leads-"));

  try {
    const [expertLeadsSource, validationSource] = await Promise.all([
      readFile(expertLeadsPath, "utf8"),
      readFile(validationPath, "utf8"),
    ]);
    const compilerOptions = {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
    };
    const compiledExpertLeads = ts.transpileModule(expertLeadsSource, {
      compilerOptions,
    }).outputText;
    const compiledValidation = ts
      .transpileModule(validationSource, { compilerOptions })
      .outputText.replace(
        'from "@/lib/mentor/expertLeads"',
        'from "./expertLeads.mjs"',
      );

    await Promise.all([
      writeFile(
        path.join(tempDir, "expertLeads.mjs"),
        compiledExpertLeads,
        "utf8",
      ),
      writeFile(
        path.join(tempDir, "expertLeadValidation.mjs"),
        compiledValidation,
        "utf8",
      ),
    ]);

    const [expertLeads, validation] = await Promise.all([
      import(`file://${tempDir}/expertLeads.mjs`),
      import(`file://${tempDir}/expertLeadValidation.mjs`),
    ]);
    return { ...expertLeads, ...validation };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

const {
  EXPERT_FIELDS,
  EXPERT_LEAD_STATUSES,
  EXPERT_STUDY_LEVELS,
  buildTargetIntakeOptions,
  buildWhatsAppHref,
  normalizeWhatsAppPhone,
  validateExpertLeadPayload,
} = await importHelpers();

assert.deepEqual(EXPERT_LEAD_STATUSES, ["new", "contacted", "completed"]);
assert.deepEqual(EXPERT_STUDY_LEVELS, ["bachelor", "master", "undecided"]);
assert.equal(EXPERT_FIELDS.at(-1), "undecided");
assert.deepEqual(buildTargetIntakeOptions(new Date("2026-08-10T12:00:00Z")), [
  "2026-2027",
  "2027-2028",
  "2028-2029",
  "undecided",
]);
assert.equal(normalizeWhatsAppPhone("+90 (532) 123-45-67"), "+905321234567");
assert.equal(normalizeWhatsAppPhone("0532 123 45 67"), null);
assert.equal(
  buildWhatsAppHref("+905321234567"),
  "https://wa.me/905321234567",
);

const clock = new Date("2026-08-10T12:00:00Z");
const validPayload = {
  submissionId: "10000000-0000-4000-8000-000000000001",
  fullName: "  Ada Öğrenci  ",
  whatsappPhone: "+90 532 123 45 67",
  studyLevel: "bachelor",
  fieldOfInterest: "engineering-tech",
  targetIntake: "2027-2028",
  helpRequest: "  Politecnico başvuru yol haritamı netleştirmek istiyorum.  ",
  website: "",
};

const valid = validateExpertLeadPayload(validPayload, clock);
assert.equal(valid.kind, "valid");
if (valid.kind !== "valid") {
  assert.fail("valid expert lead payload was rejected");
}
assert.equal(valid.value.fullName, "Ada Öğrenci");
assert.equal(valid.value.whatsappPhone, "+905321234567");
assert.equal(
  valid.value.helpRequest,
  "Politecnico başvuru yol haritamı netleştirmek istiyorum.",
);

assert.equal(
  validateExpertLeadPayload(
    { ...validPayload, website: "https://spam.example" },
    clock,
  ).kind,
  "honeypot",
);

const invalidCases = [
  ["submissionId", { submissionId: "not-a-uuid" }],
  ["fullName", { fullName: "A" }],
  ["whatsappPhone", { whatsappPhone: "0532 123 45 67" }],
  ["studyLevel", { studyLevel: "doctorate" }],
  ["fieldOfInterest", { fieldOfInterest: "other" }],
  ["targetIntake", { targetIntake: "2027-2029" }],
  ["targetIntake", { targetIntake: "2031-2032" }],
  ["helpRequest", { helpRequest: "too short" }],
  ["helpRequest", { helpRequest: "a".repeat(3001) }],
];

for (const [field, changes] of invalidCases) {
  const result = validateExpertLeadPayload({ ...validPayload, ...changes }, clock);
  assert.equal(result.kind, "invalid", `${field} must be rejected`);
  if (result.kind !== "invalid") {
    assert.fail(`${field} did not return field errors`);
  }
  assert.ok(field in result.errors, `${field} error key is missing`);
}

console.log("Expert lead domain validation tests passed.");
