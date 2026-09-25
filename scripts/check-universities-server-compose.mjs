import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function importTsModule(path) {
  const source = readFileSync(resolve(process.cwd(), path), "utf8")
    // server-only ve Supabase istemcisi yalnizca fetch katmaninda kullanilir; saf compose testi icin silinir.
    .replace('import "server-only";', "")
    .replace('import { createClient, type SupabaseClient } from "@supabase/supabase-js";', "")
    .replace('import { parseCanonicalUniversityId } from "@/lib/universityPath";', "")
    .replace(/import type\s*\{[\s\S]*?\}\s*from\s*"@\/types(?:\/universities)?";/g, "")
    // compose saf olmalidir: sunum modulune bagimli olamaz. Bu import yalnizca fetch
    // katmaninda (degree_class kodu cikarimi) kullanilir, o yuzden burada silinebilir.
    .replace(
      'import { extractDegreeClassCodes } from "@/components/university-details/programAdmissionPresentation";',
      "",
    );
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      verbatimModuleSyntax: true,
    },
  });
  const encoded = Buffer.from(transpiled.outputText, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

const { composeUniversitiesFromSupabaseRows, pruneUniversityForProgram } = await importTsModule(
  "lib/universities.server.ts",
);

const universities = composeUniversitiesFromSupabaseRows(
  [
    {
      id: 1,
      name: "University of Bologna",
      city: "Bologna",
      type: "Public",
      fee: "150 EUR - 2,500 EUR",
      image: "https://example.com/bologna.jpg",
      description: "Test university",
      description_en: "Test university",
      website: "https://www.unibo.it",
      features: ["Historic"],
      features_en: ["Historic"],
      sort_order: 1,
    },
  ],
  [
    {
      id: 10,
      university_id: 1,
      name: "Medicine and Surgery",
      slug: "medicine-and-surgery",
      languages: ["en"],
      duration_years: 6,
      level: "single-cycle",
      sort_order: 1,
    },
  ],
  [
    {
      department_id: 10,
      university_id: 1,
      raw_program_name: "Medicine and Surgery",
      raw_level: "single-cycle",
      raw_teaching_language: " English ",
      campus: "Bologna",
      degree_class: "LM-41",
      admission_type: "Restricted access",
      academic_requirements: "Secondary school diploma",
      language_requirements: "English language proficiency",
      application_deadline_eu: "2026-07-31",
      application_deadline_non_eu: "2026-04-30",
      required_documents: [" Passport ", "", "Diploma"],
      entry_exam_or_test: "IMAT",
      tuition_or_fees_link: "https://example.com/fees",
      official_program_url: " https://example.com/program ",
      official_call_url: "https://example.com/call",
      source_quotes: [
        {
          url: " https://example.com/source ",
          quote: " Official programme page ",
          field_refs: ["official_program_url", "", " raw_teaching_language "],
          retrieved_at: " 2026-06-01 ",
        },
      ],
      uncertain: ["application_deadline_eu"],
      uncertainty_notes: ["Deadline may change"],
      source_file: "bologna.json",
    },
  ]
);

assert.equal(universities.length, 1);
assert.equal(universities[0].departments.length, 1);

const department = universities[0].departments[0];

assert.equal(department.level, "single-cycle");
assert.notEqual(department.level, "bachelor");
assert.equal(department.id, 10);
assert.equal(department.admissionDetails?.officialProgramUrl, "https://example.com/program");
assert.deepEqual(department.admissionDetails?.sourceQuotes, [
  {
    url: "https://example.com/source",
    quote: "Official programme page",
    field_refs: ["official_program_url", "raw_teaching_language"],
    retrieved_at: "2026-06-01",
  },
]);

// hasAdmissionDetails (2026-09-15): detayli compose'da true; yalniz-varlik (dizin) compose'unda true ama
// admissionDetails yok; hicbiri yoksa false.
assert.equal(universities[0].departments[0].hasAdmissionDetails, true);

const directory = composeUniversitiesFromSupabaseRows(
  [
    {
      id: 1,
      name: "U",
      city: "Bologna",
      type: "Public",
      fee: "",
      image: "",
      description: "d",
      description_en: null,
      website: "",
      features: [],
      features_en: null,
      sort_order: 1,
    },
  ],
  [
    { id: 10, university_id: 1, name: "With dossier", slug: "with-dossier", languages: ["en"], duration_years: 3, level: "bachelor", sort_order: 1 },
    { id: 11, university_id: 1, name: "Without", slug: "without", languages: ["en"], duration_years: 3, level: "bachelor", sort_order: 2 },
  ],
  [],
  new Map([[10, "2026-06-02T12:46:31.193Z"]])
);
assert.equal(directory[0].departments[0].hasAdmissionDetails, true);
assert.equal(directory[0].departments[0].admissionDetails, undefined);
assert.equal(directory[0].departments[1].hasAdmissionDetails, false);
// updatedAt: kabul dosyasi zaman damgasi program satirina tasinir (sitemap lastmod)
assert.equal(directory[0].departments[0].updatedAt, "2026-06-02T12:46:31.193Z");
assert.equal(directory[0].departments[1].updatedAt, undefined);

// degreeClassCodes (2026-09-17): dizin, "ayni alanda diger universiteler" icin resmi bolum sinifi
// kodunu tasir. Kod 5. parametre ile gelir; admissionDetails dizinde ASLA olusmaz.
const directoryWithCodes = composeUniversitiesFromSupabaseRows(
  [
    {
      id: 1,
      name: "U",
      city: "Bologna",
      type: "Public",
      fee: "",
      image: "",
      description: "d",
      description_en: null,
      website: "",
      features: [],
      features_en: null,
      sort_order: 1,
    },
  ],
  [
    { id: 10, university_id: 1, name: "With dossier", slug: "with-dossier", languages: ["en"], duration_years: 3, level: "bachelor", sort_order: 1 },
    { id: 11, university_id: 1, name: "Without", slug: "without", languages: ["en"], duration_years: 3, level: "bachelor", sort_order: 2 },
  ],
  [],
  new Map([[10, "2026-06-02T12:46:31.193Z"]]),
  new Map([[10, ["LM-41"]]])
);
assert.deepEqual(directoryWithCodes[0].departments[0].degreeClassCodes, ["LM-41"]);
assert.equal(directoryWithCodes[0].departments[1].degreeClassCodes, undefined);
assert.equal(directoryWithCodes[0].departments[0].admissionDetails, undefined);
assert.equal(directoryWithCodes[0].departments[0].hasAdmissionDetails, true);
assert.equal(directoryWithCodes[0].departments[0].updatedAt, "2026-06-02T12:46:31.193Z");

// compose kendi basina kod cikarmaz: harita verilmezse degreeClassCodes olusmaz. Kodu uretme
// isi cagiran katmanda (dizin cekisi) extractDegreeClassCodes ile yapilir.
assert.equal(universities[0].departments[0].degreeClassCodes, undefined);

// pruneUniversityForProgram (2026-09-25): program sayfasi dizin kaydina yalnizca acilan programin kabul
// dosyasini ekler. Paylasilan dizin nesneleri DEGISMEZ; yeni okul nesnesi ve yeni program listesi doner.
const sharedUniversity = directory[0];
const sharedDepartmentsBefore = JSON.stringify(sharedUniversity);
const openedDepartment = {
  ...sharedUniversity.departments[0],
  admissionDetails: department.admissionDetails,
  hasAdmissionDetails: true,
};
const pruned = pruneUniversityForProgram(sharedUniversity, openedDepartment);
assert.notEqual(pruned, sharedUniversity);
assert.notEqual(pruned.departments, sharedUniversity.departments);
assert.equal(pruned.departments[0], openedDepartment);
assert.equal(pruned.departments[0].admissionDetails?.officialProgramUrl, "https://example.com/program");
assert.equal(pruned.departments[1], sharedUniversity.departments[1]);
assert.equal(pruned.departments[1].admissionDetails, undefined);
assert.equal(JSON.stringify(sharedUniversity), sharedDepartmentsBefore);
assert.equal(sharedUniversity.departments[0].admissionDetails, undefined);

console.log("[OK] Universities server compose preserves single-cycle and admission details.");
