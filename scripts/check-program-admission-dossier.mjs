import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

async function importTsModule(path) {
  const source = readFileSync(resolve(process.cwd(), path), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  });
  const encoded = Buffer.from(transpiled.outputText, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

const {
  admissionFieldIsUncertain,
  buildAdmissionEvidence,
  canonicalizeAdmissionFieldRefs,
  cleanAdmissionDisplayValue,
  getAdmissionFieldEvidence,
  groupAdmissionEvidenceByUrl,
  latestAdmissionSourceDate,
  normalizeAdmissionSourceUrl,
  parseAdmissionSourceDate,
} = await importTsModule(
  "components/university-details/programAdmissionPresentation.ts",
);

assert.deepEqual(
  canonicalizeAdmissionFieldRefs([
    "application_deadline_eu, application_deadline_non_eu",
    "requirements.language_requirements.minimum_scores",
    "academic_requirements (CGPA)",
    "unknown_field",
  ]),
  [
    "applicationDeadlineEu",
    "applicationDeadlineNonEu",
    "languageRequirements",
    "academicRequirements",
  ],
);
assert.equal(
  cleanAdmissionDisplayValue(
    " [uncertain] Deadline not published [uncertain] ",
  ),
  "Deadline not published",
);

const sharedUrl = "https://example.com/call/";
const denseQuotes = Array.from({ length: 32 }, (_, index) => ({
  url: index < 3 ? sharedUrl : `https://example.com/source-${index}`,
  quote:
    index === 0
      ? "A".repeat(1000)
      : `Evidence excerpt ${index + 1}`,
  field_refs:
    index === 0
      ? ["application_deadline_eu, application_deadline_non_eu"]
      : index === 1
        ? ["requirements.language_requirements.minimum_scores"]
        : index === 2
          ? ["academic_requirements (CGPA)"]
          : [],
  retrieved_at:
    index === 0
      ? "2026-05-28"
      : index === 1
        ? "2026-07-05"
        : "2026-06-15",
}));

const denseEvidence = buildAdmissionEvidence(denseQuotes);
assert.equal(denseEvidence.length, 32);
assert.equal(new Set(denseEvidence.map((item) => item.id)).size, 32);
assert.equal(denseEvidence[0].quote.length, 1000);
assert.equal(
  getAdmissionFieldEvidence(denseEvidence, "applicationDeadlineEu").length,
  1,
);
assert.equal(
  getAdmissionFieldEvidence(denseEvidence, "applicationDeadlineNonEu").length,
  1,
);
assert.equal(
  getAdmissionFieldEvidence(denseEvidence, "languageRequirements").length,
  1,
);

const groupedEvidence = groupAdmissionEvidenceByUrl(denseEvidence);
const sharedSource = groupedEvidence.find(
  (group) =>
    normalizeAdmissionSourceUrl(group.url) ===
    normalizeAdmissionSourceUrl(sharedUrl),
);
assert.ok(sharedSource);
assert.equal(sharedSource.evidence.length, 3);
assert.equal(sharedSource.latestRetrievedAt, "2026-07-05");

assert.equal(
  latestAdmissionSourceDate(["invalid", "2026-06-01", "2026-07-05"]),
  "2026-07-05",
);
assert.equal(parseAdmissionSourceDate("2026-02-30"), null);
assert.equal(parseAdmissionSourceDate("2026-07-05")?.toISOString(), "2026-07-05T00:00:00.000Z");

const sparseDetails = {
  officialProgramUrl: "https://example.com/program",
  rawTeachingLanguage: "English",
  requiredDocuments: [],
  sourceQuotes: [],
  uncertain: [],
  uncertaintyNotes: [],
};

assert.deepEqual(buildAdmissionEvidence(sparseDetails.sourceQuotes), []);
assert.equal(
  admissionFieldIsUncertain(sparseDetails, "applicationDeadlineEu"),
  false,
);

const uncertainDetails = {
  ...sparseDetails,
  uncertain: [
    "application_deadline_eu, application_deadline_non_eu",
    "academic_requirements (CGPA)",
  ],
};
assert.equal(
  admissionFieldIsUncertain(uncertainDetails, "applicationDeadlineEu"),
  true,
);
assert.equal(
  admissionFieldIsUncertain(uncertainDetails, "applicationDeadlineNonEu"),
  true,
);
assert.equal(
  admissionFieldIsUncertain(uncertainDetails, "academicRequirements"),
  true,
);

console.log(
  "[OK] Program admission dossier presentation preserves evidence and handles dense/sparse data.",
);
