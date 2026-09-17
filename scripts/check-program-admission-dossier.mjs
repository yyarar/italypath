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
  cleanAdmissionTextPreservingBreaks,
  extractDegreeClassCodes,
  getAdmissionFieldEvidence,
  groupAdmissionEvidenceByUrl,
  latestAdmissionSourceDate,
  localizeAdmissionDates,
  localizeAdmissionType,
  normalizeAdmissionSourceUrl,
  parseAdmissionSourceDate,
  splitAdmissionSegments,
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

// --- Metin bicimlendirme (2026-09-17 program detay turu) ---

// 1. Satir sonu + noktali virgul bolme, etiket ayrilmasi
const roundsText =
  "Intake 1 (reserved to non-EU applicants residing abroad): 2025-11-27 to 2026-01-14 13:00; Intake 2: 2026-01-15 to 2026-02-25 13:00; Intake 3: 2026-02-26 to 2026-04-09 13:00";
const roundSegments = splitAdmissionSegments(roundsText);
assert.equal(roundSegments.length, 3);
assert.equal(roundSegments[0].label, "Intake 1 (reserved to non-EU applicants residing abroad)");
assert.equal(roundSegments[1].label, "Intake 2");
assert.ok(roundSegments[0].text.startsWith("2025-11-27"));

// 2. Karakter kaybi yasak: harf ve rakamlar aynen korunur
const lettersOnly = (value) => value.replace(/[^\p{L}\p{N}]/gu, "");
assert.equal(
  lettersOnly(roundSegments.map((segment) => `${segment.label ?? ""}${segment.text}`).join("")),
  lettersOnly(roundsText),
);

// 3. Az ayirici ya da kisa parca varsa tek paragraf kalir
assert.deepEqual(
  splitAdmissionSegments("First intake closes 2026-05-07 13:00; then nothing."),
  [{ text: "First intake closes 2026-05-07 13:00; then nothing." }],
);

// 3b. Kucuk harfle baslayan parca cumle ortasidir: satir bolunmez
const midSentence =
  "The programme-specific A.Y. 2026-2027 call is not yet published, so the requirements-check date is unknown; in the A.Y. 2025-2026 call the corresponding date was 16 September 2025; the office confirmed this by e-mail.";
assert.deepEqual(splitAdmissionSegments(midSentence), [{ text: midSentence }]);

// 3c. Kisa ama "Etiket: deger" biciminde olan parcalar bolunur
const labelledList = splitAdmissionSegments(
  "Academic Year: 2026/2027; Opening Date: 2026-01-15; Closing Date: 2026-04-06",
);
assert.equal(labelledList.length, 3);
assert.equal(labelledList[0].label, "Academic Year");
assert.equal(labelledList[2].label, "Closing Date");
assert.equal(labelledList[2].text, "2026-04-06");

// 4. Satir sonlari bolunur, bos satirlar atilir
const multilineSegments = splitAdmissionSegments(
  "Rounds: Round Name: Certification-based direct admission\nApplication Window: From October 2026 to 10 February 2027\n\nTest Dates: Not applicable - selection is on submitted certification.",
);
assert.equal(multilineSegments.length, 3);
assert.equal(multilineSegments[1].label, "Application Window");
assert.equal(multilineSegments[2].label, "Test Dates");

// 5. [uncertain] isareti metinden temizlenir (panel ayri bolumde gosteriyor)
assert.equal(
  splitAdmissionSegments("[uncertain] First intake: 2026-02-26 to 2026-04-16.")[0].text,
  "First intake: 2026-02-26 to 2026-04-16.",
);

// 6. Tarih yerelleştirme: YALNIZCA ISO bicimi (2026-01-14), yalnizca TR
assert.equal(
  localizeAdmissionDates("2025-11-27 to 2026-01-14 13:00", "tr"),
  "27 Kasım 2025 to 14 Ocak 2026 13:00",
);
assert.equal(
  localizeAdmissionDates("18 March 2026 to 4 May 2026", "tr"),
  "18 March 2026 to 4 May 2026",
);
assert.equal(
  localizeAdmissionDates("From October 2026 to 10 February 2027", "tr"),
  "From October 2026 to 10 February 2027",
);
assert.equal(localizeAdmissionDates("2026-01-14", "en"), "2026-01-14");
assert.equal(localizeAdmissionDates("2026-13-40", "tr"), "2026-13-40");
assert.equal(
  localizeAdmissionDates("academic year 2026/2027", "tr"),
  "academic year 2026/2027",
);

// 7. Kabul tipi: bilinen kategoriler Turkce, bilinmeyen aynen
assert.equal(localizeAdmissionType("open access", "tr"), "Serbest giriş");
assert.equal(localizeAdmissionType("Selection call", "tr"), "Seçme çağrısı");
assert.equal(localizeAdmissionType("TOLC", "tr"), "TOLC sınavı");
assert.equal(
  localizeAdmissionType("numerus clausus with local exam", "tr"),
  "numerus clausus with local exam",
);
assert.equal(localizeAdmissionType("open access", "en"), "open access");

// 8. Resmi bolum sinifi kodu
assert.deepEqual(extractDegreeClassCodes("LM-32"), ["LM-32"]);
assert.deepEqual(extractDegreeClassCodes("L-8 R / L-9 R"), ["L-8", "L-9"]);
assert.deepEqual(extractDegreeClassCodes("LM-23 R - Civil engineering"), ["LM-23"]);
assert.deepEqual(extractDegreeClassCodes("LMG/01 Giurisprudenza"), ["LMG/01"]);
assert.deepEqual(
  extractDegreeClassCodes("Not found in checked official catalogue [uncertain]."),
  [],
);
assert.deepEqual(extractDegreeClassCodes(undefined), []);

// 9. Satir sonlarini koruyan temizlik
assert.equal(
  cleanAdmissionTextPreservingBreaks("  a  b \n\n c  [uncertain] d  "),
  "a b\nc d",
);

console.log(
  "[OK] Program admission dossier presentation preserves evidence and handles dense/sparse data.",
);
