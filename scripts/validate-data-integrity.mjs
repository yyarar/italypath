import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ALLOWED_LANGUAGES = new Set(["en", "it"]);
const ALLOWED_DURATIONS = new Set([1, 2, 3, 4, 5, 6]);
const ALLOWED_LEVELS = new Set(["bachelor", "master"]);

const dataModuleUrl = pathToFileURL(resolve(process.cwd(), "app/data.ts")).href;
const dataModule = await import(dataModuleUrl);

const {
  universitiesBaseData,
  universitiesData,
  DEPARTMENT_LANGUAGE_OVERRIDES,
  DEPARTMENT_DURATION_OVERRIDES,
  DEPARTMENT_LEVEL_OVERRIDES,
} = dataModule;

const failures = [];

function fail(message) {
  failures.push(message);
}

function parseDepartmentKey(key) {
  const match = key.match(/^(\d+):(.+)$/);
  if (!match) return null;
  return {
    universityId: Number(match[1]),
    departmentSlug: match[2],
  };
}

function validateOverrideKeys(overrideMap, label, baseUniversityById) {
  for (const key of Object.keys(overrideMap)) {
    const parsed = parseDepartmentKey(key);
    if (!parsed) {
      fail(`${label} invalid key format: "${key}" (expected "universityId:departmentSlug")`);
      continue;
    }

    const university = baseUniversityById.get(parsed.universityId);
    if (!university) {
      fail(`${label} unknown university id in key: "${key}"`);
      continue;
    }

    const hasSlug = university.departments.some((dept) => dept.slug === parsed.departmentSlug);
    if (!hasSlug) {
      fail(
        `${label} unknown department slug in key: "${key}" for university "${university.name}"`
      );
    }
  }
}

if (!Array.isArray(universitiesBaseData) || !Array.isArray(universitiesData)) {
  fail("universitiesBaseData or universitiesData is not an array");
} else {
  const baseUniversityById = new Map(universitiesBaseData.map((u) => [u.id, u]));

  validateOverrideKeys(DEPARTMENT_LANGUAGE_OVERRIDES, "DEPARTMENT_LANGUAGE_OVERRIDES", baseUniversityById);
  validateOverrideKeys(DEPARTMENT_DURATION_OVERRIDES, "DEPARTMENT_DURATION_OVERRIDES", baseUniversityById);
  validateOverrideKeys(DEPARTMENT_LEVEL_OVERRIDES, "DEPARTMENT_LEVEL_OVERRIDES", baseUniversityById);

  for (const [key, value] of Object.entries(DEPARTMENT_LANGUAGE_OVERRIDES)) {
    if (!Array.isArray(value) || value.length === 0) {
      fail(`DEPARTMENT_LANGUAGE_OVERRIDES "${key}" must be a non-empty array`);
      continue;
    }

    const unique = new Set(value);
    if (unique.size !== value.length) {
      fail(`DEPARTMENT_LANGUAGE_OVERRIDES "${key}" contains duplicate language values`);
    }

    for (const language of value) {
      if (!ALLOWED_LANGUAGES.has(language)) {
        fail(`DEPARTMENT_LANGUAGE_OVERRIDES "${key}" has invalid language "${language}"`);
      }
    }
  }

  for (const [key, value] of Object.entries(DEPARTMENT_DURATION_OVERRIDES)) {
    if (!ALLOWED_DURATIONS.has(value)) {
      fail(`DEPARTMENT_DURATION_OVERRIDES "${key}" has invalid duration "${value}"`);
    }
  }

  for (const [key, value] of Object.entries(DEPARTMENT_LEVEL_OVERRIDES)) {
    if (!ALLOWED_LEVELS.has(value)) {
      fail(`DEPARTMENT_LEVEL_OVERRIDES "${key}" has invalid level "${value}"`);
    }
  }

  const idSet = new Set();
  const nameSet = new Set();
  const statsByLanguage = new Map();
  const statsByDuration = new Map();
  const statsByLevel = new Map();
  let totalDepartments = 0;

  for (const university of universitiesData) {
    if (idSet.has(university.id)) {
      fail(`duplicate university id: ${university.id}`);
    }
    idSet.add(university.id);

    const normalizedName = university.name.trim().toLowerCase();
    if (nameSet.has(normalizedName)) {
      fail(`duplicate university name: ${university.name}`);
    }
    nameSet.add(normalizedName);

    const slugSet = new Set();
    for (const department of university.departments) {
      totalDepartments += 1;

      if (!department.name || !department.name.trim()) {
        fail(`empty department name in university ${university.id}`);
      }
      if (!department.slug || !department.slug.trim()) {
        fail(`empty department slug in university ${university.id}`);
      }

      if (slugSet.has(department.slug)) {
        fail(
          `duplicate department slug in university ${university.id}: "${department.slug}"`
        );
      }
      slugSet.add(department.slug);

      if (!Array.isArray(department.languages) || department.languages.length === 0) {
        fail(
          `department ${university.id}:${department.slug} has missing or empty languages array`
        );
      } else {
        const uniqueLanguages = new Set(department.languages);
        if (uniqueLanguages.size !== department.languages.length) {
          fail(`department ${university.id}:${department.slug} has duplicate languages`);
        }

        for (const language of department.languages) {
          if (!ALLOWED_LANGUAGES.has(language)) {
            fail(`department ${university.id}:${department.slug} has invalid language "${language}"`);
          }
        }

        const languageKey = [...uniqueLanguages].sort().join("+");
        statsByLanguage.set(languageKey, (statsByLanguage.get(languageKey) ?? 0) + 1);
      }

      if (!ALLOWED_DURATIONS.has(department.durationYears)) {
        fail(
          `department ${university.id}:${department.slug} has invalid duration "${department.durationYears}"`
        );
      } else {
        statsByDuration.set(
          String(department.durationYears),
          (statsByDuration.get(String(department.durationYears)) ?? 0) + 1
        );
      }

      if (!ALLOWED_LEVELS.has(department.level)) {
        fail(`department ${university.id}:${department.slug} has invalid level "${department.level}"`);
      } else {
        statsByLevel.set(department.level, (statsByLevel.get(department.level) ?? 0) + 1);
      }
    }
  }

  console.log(`[OK] Universities: ${universitiesData.length}`);
  console.log(`[OK] Departments: ${totalDepartments}`);
  console.log(`[OK] Language distribution: ${JSON.stringify(Object.fromEntries(statsByLanguage))}`);
  console.log(`[OK] Duration distribution: ${JSON.stringify(Object.fromEntries(statsByDuration))}`);
  console.log(`[OK] Level distribution: ${JSON.stringify(Object.fromEntries(statsByLevel))}`);
}

if (failures.length > 0) {
  console.error("[FAIL] Data integrity check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] Data integrity check passed.");
