import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function importTsModule(path) {
  const source = readFileSync(resolve(process.cwd(), path), "utf8").replace(
    'import { createClient } from "@supabase/supabase-js";',
    ""
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

const { composeUniversitiesFromSupabaseRows } = await importTsModule("lib/universities.server.ts");

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

console.log("[OK] Universities server compose preserves single-cycle and admission details.");
