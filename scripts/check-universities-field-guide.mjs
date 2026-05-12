import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

async function importTsModule(path) {
  const source = read(path);
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

const helperPath = resolve(process.cwd(), "lib/universitiesFilters.ts");
if (!existsSync(helperPath)) {
  fail("lib/universitiesFilters.ts is missing");
} else {
  const helperModule = await importTsModule("lib/universitiesFilters.ts");
  const { filterUniversities, getCitiesWithCounts, getTotalDepartments } = helperModule;

  const sampleUniversities = [
    {
      id: 1,
      name: "Sapienza University of Rome",
      city: "Roma",
      type: "Devlet",
      fee: "150€ - 2.924€",
      image: "",
      description: "Roma merkezli okul.",
      description_en: "A Rome-based university.",
      website: "https://example.com",
      features: [],
      departments: [{ name: "Nursing", slug: "nursing", languages: ["en"], durationYears: 3, level: "bachelor" }],
    },
    {
      id: 2,
      name: "Politecnico di Milano",
      city: "Milano",
      type: "Devlet",
      fee: "150€ - 3.898€",
      image: "",
      description: "Teknik okul.",
      description_en: "Technical university.",
      website: "https://example.com",
      features: [],
      departments: [{ name: "Civil Engineering", slug: "civil-engineering", languages: ["en"], durationYears: 3, level: "bachelor" }],
    },
  ];

  const favoriteIds = new Set([2]);
  const isFavorite = (id) => favoriteIds.has(id);

  const nursingResults = filterUniversities(sampleUniversities, {
    searchTerm: "nursing",
    selectedCity: "",
    selectedType: "",
    showFavoritesOnly: false,
    isFavorite,
  });
  if (nursingResults.length !== 1 || nursingResults[0].id !== 1) {
    fail("plain text department search should match only direct department names");
  }

  const categoryResults = filterUniversities(sampleUniversities, {
    searchTerm: "healthcare",
    selectedCity: "",
    selectedType: "",
    showFavoritesOnly: false,
    isFavorite,
  });
  if (categoryResults.length !== 0) {
    fail("search must not infer missing department categories such as healthcare");
  }

  const favoriteResults = filterUniversities(sampleUniversities, {
    searchTerm: "",
    selectedCity: "",
    selectedType: "",
    showFavoritesOnly: true,
    isFavorite,
  });
  if (favoriteResults.length !== 1 || favoriteResults[0].id !== 2) {
    fail("favorites-only filter should use the supplied favorite predicate");
  }

  const cityCounts = getCitiesWithCounts(sampleUniversities);
  if (cityCounts.length !== 2 || cityCounts[0][0] !== "Milano" || cityCounts[1][0] !== "Roma") {
    fail("city counts should be sorted by city name");
  }

  if (getTotalDepartments(sampleUniversities) !== 2) {
    fail("total department count should sum all university departments");
  }
}

const translationsModule = await importTsModule("lib/translations.ts");
const { translations } = translationsModule;

for (const language of ["tr", "en"]) {
  const placeholder = translations[language].list.searchPlaceholder;
  if (/Nursing|Psychology/i.test(placeholder)) {
    fail(`${language} search placeholder should not use hard-coded department examples`);
  }
}

const sourceFiles = [
  "app/universities/page.tsx",
  "components/universities/UniversitiesHero.tsx",
  "components/universities/UniversitiesFilterBar.tsx",
  "components/universities/UniversityRows.tsx",
  "components/universities/UniversitiesStates.tsx",
].filter((path) => existsSync(resolve(process.cwd(), path)));

const forbiddenTokens = [
  "glass",
  "rounded-3xl",
  "bg-[#f8fafc]",
  "bg-indigo",
  "text-indigo",
  "border-indigo",
  "shadow-indigo",
  "bg-purple",
  "category",
  "Kategori",
  "Nursing, Psychology",
];

for (const file of sourceFiles) {
  const source = read(file);
  for (const token of forbiddenTokens) {
    if (source.includes(token)) {
      fail(`${file} contains forbidden redesign token: ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error("[FAIL] Universities field-guide check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Universities field-guide check passed.");
