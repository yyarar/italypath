import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function importTsModule(path) {
  const source = readFileSync(resolve(process.cwd(), path), "utf8");
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

const { mergeUniversityDepartmentRows } = await importTsModule("lib/mergeUniversityDepartments.ts");

const baseUniversities = [
  {
    id: 1,
    name: "Politecnico di Milano",
    city: "Milano",
    type: "Devlet",
    departments: [
      {
        name: "Civil Engineering",
        slug: "civil-engineering",
        languages: ["en"],
        durationYears: 3,
        level: "bachelor",
      },
    ],
    fee: "150€ - 3.898€",
    image: "https://example.com/polimi.jpg",
    description: "Test university",
    website: "https://example.com",
    features: [],
  },
];

const mergedUniversities = mergeUniversityDepartmentRows(baseUniversities, [
  {
    university_id: 1,
    name: "Architecture - Built Environment - Interiors",
    slug: "architecture-built-environment-interiors",
    languages: ["en"],
    duration_years: 2,
    level: "master",
    sort_order: 2,
  },
]);

assert.equal(mergedUniversities.length, 1);
assert.equal(mergedUniversities[0].departments.length, 2);
assert.equal(
  mergedUniversities[0].departments.some(
    (department) =>
      department.slug === "architecture-built-environment-interiors" &&
      department.level === "master" &&
      department.durationYears === 2
  ),
  true
);

const overwrittenUniversities = mergeUniversityDepartmentRows(baseUniversities, [
  {
    university_id: 1,
    name: "Civil Engineering",
    slug: "civil-engineering",
    languages: ["it", "en"],
    duration_years: 2,
    level: "master",
    sort_order: 1,
  },
]);

assert.deepEqual(overwrittenUniversities[0].departments, [
  {
    name: "Civil Engineering",
    slug: "civil-engineering",
    languages: ["it", "en"],
    durationYears: 2,
    level: "master",
  },
]);

assert.equal(mergeUniversityDepartmentRows(baseUniversities, []), baseUniversities);

console.log("[OK] University department merge keeps Supabase master rows visible.");
